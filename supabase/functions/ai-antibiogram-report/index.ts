// Edge function: ai-antibiogram-report
// Lê o banco com base no período/hospital e gera relatório de Sensibilidade Antimicrobiana via Lovable AI.
// Suporta chamada manual (com JWT do usuário) e chamada agendada (com SUPABASE_SERVICE_ROLE_KEY + hospital_id).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

const PERIOD_DAYS: Record<string, number> = {
  "ultimo-mes": 30,
  "ultimos-3-meses": 90,
  "ultimos-6-meses": 180,
  "ultimo-ano": 365,
};
const PERIOD_LABELS: Record<string, string> = {
  "ultimo-mes": "Último mês",
  "ultimos-3-meses": "Últimos 3 meses",
  "ultimos-6-meses": "Últimos 6 meses",
  "ultimo-ano": "Último ano",
};

interface ReqBody {
  period?: string;
  hospital_id?: string;       // usado em modo scheduled
  scheduled?: boolean;        // chamada via cron
  filters?: Record<string, string[]>;
  save?: boolean;             // salvar em antibiogram_reports
}

function detectPhenotypes(organism: string, abResults: Array<{ antibiotic: string; sensitivity: string }>): string[] {
  const phenotypes: string[] = [];
  const r = abResults.filter(x => x.sensitivity === "R").map(x => (x.antibiotic || "").toLowerCase());
  const org = (organism || "").toLowerCase();
  if (org.includes("staphylococcus") && r.some(a => a.includes("oxacilina"))) phenotypes.push("MRSA");
  if (org.includes("enterococcus") && r.some(a => a.includes("vancomicina"))) phenotypes.push("VRE");
  if (org.includes("klebsiella") && r.some(a => a.includes("meropenem") || a.includes("imipenem"))) phenotypes.push("KPC");
  if (r.some(a => a.includes("ceftriaxona") || a.includes("cefepima")) &&
      !r.some(a => a.includes("meropenem"))) phenotypes.push("ESBL");
  return phenotypes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) {
      return new Response(JSON.stringify({ error: "OPENAI_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: ReqBody = await req.json().catch(() => ({}));
    const period = body.period || "ultimos-3-meses";
    const days = PERIOD_DAYS[period] ?? 90;
    const periodLabel = PERIOD_LABELS[period] || period;

    // Cliente: scheduled = service role; manual = anon + JWT do usuário
    let supabase;
    let userId: string | null = null;
    let hospitalId = body.hospital_id || null;

    if (body.scheduled) {
      if (!hospitalId) {
        return new Response(JSON.stringify({ error: "hospital_id required for scheduled run" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    } else {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = userData.user.id;
      if (!hospitalId) {
        const { data: hu } = await supabase.from("hospital_users").select("hospital_id").eq("user_id", userId).limit(1).maybeSingle();
        hospitalId = hu?.hospital_id || null;
      }
    }

    if (!hospitalId) {
      return new Response(JSON.stringify({ error: "Hospital não encontrado para o usuário" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Buscar nome do hospital
    const { data: hospData } = await supabase.from("hospitals").select("name").eq("id", hospitalId).maybeSingle();
    const hospitalName: string = (hospData as any)?.name || "Hospital";

    // Período
    const periodEnd = new Date();
    const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const isoStart = periodStart.toISOString().slice(0, 10);
    const isoEnd = periodEnd.toISOString().slice(0, 10);

    // 1) lab_results no hospital + período + com organismo
    const { data: labResults, error: labErr } = await supabase
      .from("lab_results")
      .select("id, collection_date, sample_type, organism, patient_id, status, notes")
      .eq("hospital_id", hospitalId)
      .gte("collection_date", isoStart)
      .lte("collection_date", isoEnd)
      .not("organism", "is", null);

    if (labErr) throw labErr;

    const exams = labResults || [];
    const ids = exams.map(e => e.id);
    let abResults: Array<{ lab_result_id: string; antibiotic: string; sensitivity: string }> = [];
    if (ids.length > 0) {
      const { data: abs } = await supabase
        .from("antibiogram_results")
        .select("lab_result_id, antibiotic, sensitivity")
        .in("lab_result_id", ids);
      abResults = (abs || []) as any;
    }

    // patient sectors
    const patientIds = [...new Set(exams.map(e => e.patient_id).filter(Boolean))];
    const sectorMap: Record<string, string> = {};
    if (patientIds.length > 0) {
      const { data: pts } = await supabase
        .from("patients")
        .select("id, sector")
        .in("id", patientIds as string[]);
      (pts || []).forEach((p: any) => { sectorMap[p.id] = p.sector || "Não informado"; });
    }

    // Agregações
    const totalExams = exams.length;
    const totalTests = abResults.length;
    const resistantCount = abResults.filter(r => r.sensitivity === "R").length;
    const sensitiveCount = abResults.filter(r => r.sensitivity === "S").length;
    const resistanceRate = totalTests > 0 ? Math.round((resistantCount / totalTests) * 1000) / 10 : 0;
    const sensitivityRate = totalTests > 0 ? Math.round((sensitiveCount / totalTests) * 1000) / 10 : 0;

    const orgCounts: Record<string, number> = {};
    const sectorCounts: Record<string, number> = {};
    const sirByAb: Record<string, { S: number; I: number; R: number }> = {};
    const phenoCounts: Record<string, number> = {};
    let phenotypeExams = 0;
    const monthly: Record<string, { total: number; R: number }> = {};

    for (const ex of exams) {
      const org = ex.organism || "Desconhecido";
      orgCounts[org] = (orgCounts[org] || 0) + 1;
      const notes = ex.notes || "";
      const m = notes.match(/Setor:\s*([^|]+)/);
      const sector = (m ? m[1].trim() : "") || (ex.patient_id ? sectorMap[ex.patient_id] : "") || "Não informado";
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
      const month = (ex.collection_date || "").slice(0, 7);
      if (month) {
        if (!monthly[month]) monthly[month] = { total: 0, R: 0 };
      }
      const myAbs = abResults.filter(r => r.lab_result_id === ex.id);
      myAbs.forEach(r => {
        if (!sirByAb[r.antibiotic]) sirByAb[r.antibiotic] = { S: 0, I: 0, R: 0 };
        if (r.sensitivity === "S" || r.sensitivity === "I" || r.sensitivity === "R") {
          sirByAb[r.antibiotic][r.sensitivity as "S" | "I" | "R"]++;
        }
        if (month) {
          monthly[month].total++;
          if (r.sensitivity === "R") monthly[month].R++;
        }
      });
      const phenos = detectPhenotypes(org, myAbs);
      if (phenos.length > 0) phenotypeExams++;
      phenos.forEach(p => { phenoCounts[p] = (phenoCounts[p] || 0) + 1; });
    }

    const topOrganismos = Object.entries(orgCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name, value }));
    const setoresArr = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    const perfilSIR = Object.entries(sirByAb).map(([name, v]) => {
      const total = v.S + v.I + v.R;
      return { name, S: v.S, I: v.I, R: v.R, resistRate: total > 0 ? Math.round((v.R / total) * 100) : 0 };
    }).sort((a, b) => (b.S + b.I + b.R) - (a.S + a.I + a.R)).slice(0, 15);
    const tendenciaMensal = Object.entries(monthly).sort().map(([month, v]) => ({
      month, exames: v.total, taxaResistencia: v.total > 0 ? Math.round((v.R / v.total) * 100) : 0,
    }));
    const fenotiposDetectados = Object.entries(phenoCounts).sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    const summary = {
      periodo: periodLabel,
      periodStart: isoStart,
      periodEnd: isoEnd,
      totalExames: totalExams,
      totalTestes: totalTests,
      taxaResistencia: resistanceRate,
      taxaSensibilidade: sensitivityRate,
      examesComFenotipo: phenotypeExams,
      topOrganismos,
      setores: setoresArr,
      perfilSIR,
      tendenciaMensal,
      fenotiposDetectados,
    };

    // Chamar Lovable AI
    const systemPrompt = `Você é um médico infectologista sênior e especialista em vigilância epidemiológica de IRAS (Infecções Relacionadas à Assistência à Saúde) em hospitais brasileiros. Seu papel é elaborar relatórios mensais completos de Perfil de Sensibilidade Antimicrobiana com rigor técnico, seguindo os padrões ANVISA, CDC e OMS. Use markdown com cabeçalhos ## para seções principais e ### para subseções. Seja objetivo, técnico e acionável. Produza SEMPRE todas as seções solicitadas, mesmo que os dados sejam escassos — nesse caso, escreva "Dados insuficientes para análise conclusiva neste período."`;

    const userPrompt = `Gere o RELATÓRIO MENSAL COMPLETO de Perfil de Sensibilidade Antimicrobiana Hospitalar para o período ${periodLabel} (${isoStart} a ${isoEnd}).

INSTRUÇÃO CRÍTICA: Use EXATAMENTE estes cabeçalhos de seção (## NOME DA SEÇÃO) para que o sistema possa parsear corretamente:

## RESUMO EXECUTIVO
Escreva 2-3 parágrafos narrativos sobre o período. Contextualize os achados, destaque os principais riscos e o panorama geral da resistência antimicrobiana. Mencione os microrganismos e setores de maior preocupação.

## ANÁLISE MICROBIOLÓGICA
Analise os microrganismos predominantes e suas implicações clínicas. Discuta o significado clínico de cada patógeno, contextualize com a literatura e com padrões epidemiológicos brasileiros. Explique o risco para os pacientes.

## PERFIL DE RESISTÊNCIA
Analise os antibióticos com maior taxa de resistência (>30% R). Discuta mecanismos de resistência prováveis (ESBL, KPC, MBL, MRSA, VRE), implicações terapêuticas e riscos para falha de tratamento empírico.

## TENDÊNCIAS TEMPORAIS
Comente a evolução mensal dos dados. Identifique tendências de aumento ou queda. Avalie se há padrão de surto, sazonalidade ou estabilização. Sugira o que pode estar impulsionando as mudanças.

## ANÁLISE POR SETOR
Aponte os setores com maior pressão antimicrobiana. Identifique focos de transmissão cruzada potencial. Relacione o perfil de resistência com as características de cada setor (UTI, PS, enfermarias).

## ALERTAS EPIDEMIOLÓGICOS
Liste de 3 a 5 alertas IMEDIATOS em formato bullet point. Seja específico: cite o microrganismo, o setor, o antimicrobiano e o nível de risco. Use linguagem acionável.

## RECOMENDAÇÕES CLÍNICAS
Liste de 5 a 8 recomendações concretas baseadas nos dados. Inclua: stewardship antimicrobiano, precauções de isolamento, vigilância ativa, educação permanente, revisão de protocolos e medidas de controle de infecção.

## PLANO DE AÇÃO CCIH
Apresente uma tabela markdown com as colunas: Problema | Impacto (Alto/Médio/Baixo) | Ação Proposta | Responsável | Prazo. Liste de 4 a 6 ações prioritárias baseadas nos achados.

## CONCLUSÃO
Escreva 1 parágrafo de fechamento sintetizando os achados mais críticos, o nível de risco geral do período e as prioridades para o próximo ciclo de monitoramento.

---
DADOS ESTRUTURADOS DO PERÍODO (use estes dados como base factual para toda a análise):
\`\`\`json
${JSON.stringify(summary, null, 2)}
\`\`\``;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit excedido. Tente em alguns minutos." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("OpenAI error", aiResp.status, t);
      return new Response(JSON.stringify({ error: "Falha ao gerar relatório com IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const aiContent: string = aiJson.choices?.[0]?.message?.content || "";

    // Salvar histórico (sempre que possível)
    if (body.save !== false) {
      try {
        const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await adminClient.from("antibiogram_reports").insert({
          hospital_id: hospitalId,
          created_by: userId,
          report_type: body.scheduled ? "ai_scheduled" : "ai",
          period_label: periodLabel,
          period_start: isoStart,
          period_end: isoEnd,
          filters: body.filters || {},
          summary,
          ai_content: aiContent,
          total_exams: totalExams,
          resistance_rate: resistanceRate,
        });
      } catch (e) {
        console.error("Falha salvando histórico:", e);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      period: periodLabel,
      hospital_name: hospitalName,
      summary,
      ai_content: aiContent,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-antibiogram-report error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
