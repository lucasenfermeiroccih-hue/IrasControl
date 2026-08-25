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
      .select("id, collection_date, sample_type, sample_material, organism, patient_id, status, notes, sector")
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

    // Per-sector aggregation for CCIH structured report
    type SpData = {
      culturasPorMaterial: Record<string, number>;
      organismos: Record<string, number>;
      materialOrg: Record<string, Record<string, number>>;
      bacteriaSensitivity: Record<string, Record<string, { S: number; I: number; R: number }>>;
      mrsa: number; vre: number; kpc: number; esbl: number;
    };
    const sectorProfileMap: Record<string, SpData> = {};

    for (const ex of exams) {
      const org = ex.organism || "Desconhecido";
      orgCounts[org] = (orgCounts[org] || 0) + 1;
      const notes = ex.notes || "";
      const m = notes.match(/Setor:\s*([^|]+)/);
      const sector: string = (ex as any).sector || (m ? m[1].trim() : "") || (ex.patient_id ? sectorMap[ex.patient_id] : "") || "Não informado";
      sectorCounts[sector] = (sectorCounts[sector] || 0) + 1;
      // Per-sector detail
      if (!sectorProfileMap[sector]) sectorProfileMap[sector] = {
        culturasPorMaterial: {}, organismos: {}, materialOrg: {}, bacteriaSensitivity: {},
        mrsa: 0, vre: 0, kpc: 0, esbl: 0,
      };
      const sp = sectorProfileMap[sector];
      const material: string = (ex as any).sample_material || ex.sample_type || "Não informado";
      sp.culturasPorMaterial[material] = (sp.culturasPorMaterial[material] || 0) + 1;
      sp.organismos[org] = (sp.organismos[org] || 0) + 1;
      if (!sp.materialOrg[material]) sp.materialOrg[material] = {};
      sp.materialOrg[material][org] = (sp.materialOrg[material][org] || 0) + 1;
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
      // Per-sector phenotypes
      if (phenos.includes("MRSA")) sp.mrsa++;
      if (phenos.includes("VRE")) sp.vre++;
      if (phenos.includes("KPC")) sp.kpc++;
      if (phenos.includes("ESBL")) sp.esbl++;
      // Per-sector bacteria sensitivity
      for (const ab of myAbs) {
        if (!sp.bacteriaSensitivity[org]) sp.bacteriaSensitivity[org] = {};
        if (!sp.bacteriaSensitivity[org][ab.antibiotic]) sp.bacteriaSensitivity[org][ab.antibiotic] = { S: 0, I: 0, R: 0 };
        if (ab.sensitivity === "S" || ab.sensitivity === "I" || ab.sensitivity === "R") {
          (sp.bacteriaSensitivity[org][ab.antibiotic] as Record<string, number>)[ab.sensitivity]++;
        }
      }
    }

    // Build setoresPerfil summary
    const setoresPerfil = Object.entries(sectorProfileMap).sort((a, b) => {
      const ta = Object.values(a[1].culturasPorMaterial).reduce((s, v) => s + v, 0);
      const tb = Object.values(b[1].culturasPorMaterial).reduce((s, v) => s + v, 0);
      return tb - ta;
    }).map(([setor, sp]) => {
      const totalCulturas = Object.values(sp.culturasPorMaterial).reduce((s, v) => s + v, 0);
      const prevalenciaPorMaterial: { material: string; organismo: string; count: number }[] = [];
      for (const [mat, orgMap] of Object.entries(sp.materialOrg)) {
        for (const [o, cnt] of Object.entries(orgMap).sort((a, b) => b[1] - a[1]).slice(0, 3)) {
          prevalenciaPorMaterial.push({ material: mat, organismo: o, count: cnt });
        }
      }
      return {
        setor, totalCulturas,
        culturasPorMaterial: Object.entries(sp.culturasPorMaterial).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })),
        prevalenciaOrganismos: Object.entries(sp.organismos).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value })),
        prevalenciaPorMaterial,
        mrsa: sp.mrsa, vre: sp.vre, kpc: sp.kpc, esbl: sp.esbl,
      };
    });

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
      setoresPerfil,
    };

    // Chamar OpenAI com prompt CCIH estruturado
    const systemPrompt = `Você é um enfermeiro especialista em Controle de Infecção Hospitalar (CCIH/SCIH/NSP) redigindo o relatório microbiológico anual de uma instituição hospitalar brasileira.
Tom: objetivo, normativo, técnico-científico, orientado à ação antimicrobiana e vigilância epidemiológica.
Referências: ANVISA, CDC, BrCAST/EUCAST, CLSI, OMS.
Regras:
- Use markdown com ## para seções e ### para subseções.
- Grafia científica em itálico com asteriscos: *Klebsiella pneumoniae*, *S. aureus*, etc.
- Sempre cite N (total de isolados) e percentuais.
- Nomeie MRSA, VRE, KPC, ESBL como MDR críticos.
- Se dados insuficientes (N<3), declare limitação em vez de inventar.
- Produza TODAS as seções solicitadas sem omitir nenhuma.`;

    const sectorNames = setoresPerfil.map(sp => sp.setor);
    const sectorDiscussionBlocks = sectorNames.map(setor => {
      const sId = setor.toUpperCase().replace(/[^A-Z0-9]/g, "_");
      const sp = setoresPerfil.find(s => s.setor === setor)!;
      return `
## SETOR: ${setor}
Texto introdutório geral do setor (1-2 parágrafos): perfil epidemiológico, N total de culturas (${sp.totalCulturas}), principais achados, MRSA=${sp.mrsa}, VRE=${sp.vre}, KPC=${sp.kpc}, ESBL=${sp.esbl}.

### CULTURAS_${sId}
Discussão do Gráfico 1 — culturas positivas por material biológico para ${setor}. Indique N total, material predominante (${sp.culturasPorMaterial[0]?.name || "—"}, n=${sp.culturasPorMaterial[0]?.value || 0}), segundo material, e possíveis limitações de coleta.

### ORGANISMOS_${sId}
Discussão do Gráfico 2 — prevalência de microrganismos em ${setor}. Identifique agente predominante (${sp.prevalenciaOrganismos[0]?.name || "—"}, n=${sp.prevalenciaOrganismos[0]?.value || 0}), os seguintes; sinalize S. coagulase-negativo como possível contaminação; destaque MDR.

### MATERIAL_${sId}
Discussão do Gráfico 3 — prevalência por espécime em ${setor}. Correlacione agente principal a cada material/foco infeccioso; comente coerência clínica e implicações terapêuticas.

### SENSIBILIDADE_${sId}
Discussão do Gráfico 4 — sensibilidade antimicrobiana em ${setor}. Destaque taxa de MRSA/oxacilina-resistência, presença/ausência de VRE, perfil de carbapenêmicos frente a gram-negativos MDR. Feche com orientação de uso racional de antimicrobianos.`;
    }).join("\n");

    const userPrompt = `Gere o RELATÓRIO MICROBIOLÓGICO COMPLETO CCIH para o período ${periodLabel} (${isoStart} a ${isoEnd}).

INSTRUÇÃO CRÍTICA: Use EXATAMENTE os cabeçalhos abaixo para que o sistema possa parsear e exibir cada discussão ao lado do gráfico correspondente.

## RESUMO EXECUTIVO
2-3 parágrafos narrativos: panorama geral da resistência, N total de culturas (${totalExams}), taxa de resistência global (${resistanceRate}%), microrganismos e setores mais preocupantes, fenótipos MDR detectados.

## ANÁLISE MICROBIOLÓGICA
Analise os microrganismos predominantes (dados globais). Discuta significado clínico de cada patógeno, risco para pacientes e contexto epidemiológico brasileiro.

## PERFIL DE RESISTÊNCIA
Analise antibióticos com >30% de resistência. Discuta mecanismos prováveis (ESBL, KPC, MBL, MRSA, VRE), implicações terapêuticas e risco de falha empírica.

## TENDÊNCIAS TEMPORAIS
Comente evolução mensal. Identifique tendências de alta/queda, padrão de surto ou sazonalidade.

## ALERTAS EPIDEMIOLÓGICOS
3-5 alertas IMEDIATOS em bullets: cite microrganismo, setor, antimicrobiano e nível de risco. Linguagem acionável.

## RECOMENDAÇÕES CLÍNICAS
5-8 recomendações concretas: stewardship, isolamento, vigilância ativa, educação, revisão de protocolos.

## PLANO DE AÇÃO CCIH
Tabela markdown: | Problema | Impacto | Ação Proposta | Responsável | Prazo |
4-6 ações prioritárias.

## CONCLUSÃO
1 parágrafo: achados críticos, nível de risco geral do período, prioridades para próximo ciclo.

---
SEÇÕES POR SETOR (gere exatamente estes cabeçalhos para cada setor):
${sectorDiscussionBlocks}

---
DADOS ESTRUTURADOS (use como base factual — não invente valores):
\`\`\`json
${JSON.stringify({ globalSummary: { totalExams, totalTests, resistanceRate, sensitivityRate, phenotypeExams, topOrganismos, fenotiposDetectados }, setoresPerfil }, null, 2).slice(0, 12000)}
\`\`\``;

    const aiResp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 8000,
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
