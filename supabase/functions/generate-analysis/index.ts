import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * generate-analysis
 * Generates structured analysis (SWOT, risk matrix, PDCA) for a CCIH dashboard.
 * Body: { context: string, pageTitle: string, kind: "swot" | "risk" | "pdca" | "all" }
 * Returns: { swot?, risks?, pdca? }
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { context, pageTitle, kind = "all" } = await req.json();
    if (!context || !pageTitle) {
      return new Response(JSON.stringify({ error: "Missing context or pageTitle" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof context !== "string" || context.length > 50000) {
      return new Response(JSON.stringify({ error: "Invalid context" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

    const wants = {
      swot: kind === "all" || kind === "swot",
      risk: kind === "all" || kind === "risk",
      pdca: kind === "all" || kind === "pdca",
      ishikawa: kind === "all" || kind === "ishikawa",
      pareto: kind === "all" || kind === "pareto",
    };

    const sections: string[] = [];
    if (wants.swot) sections.push(`"swot": { "strengths": string[3-5], "weaknesses": string[3-5], "opportunities": string[3-5], "threats": string[3-5] }`);
    if (wants.risk) sections.push(`"risks": Array<{ "name": string (curto, 2-5 palavras), "probability": 1-5, "impact": 1-5, "category": string }> (5 a 7 itens, cobrindo riscos críticos, altos e médios)`);
    if (wants.pdca) sections.push(`"pdca": { "plan": string[3-5], "do": string[3-5], "check": string[3-5], "act": string[3-5] }`);
    if (wants.ishikawa) sections.push(`"ishikawa": Array<{ "label": "Método"|"Máquina"|"Material"|"Mão de obra"|"Medida"|"Meio Ambiente", "causes": string[3-5] (causas raízes específicas e concretas) }> (exatamente 6 itens, um por M)`);
    if (wants.pareto) sections.push(`"pareto": Array<{ "question": string (NC curta), "fullQuestion": string (descrição completa), "count": number (ocorrências realistas, decrescente) }> (6 a 10 itens, ordenados do maior para o menor)`);

    const systemPrompt = `Você é um especialista em controle de infecções hospitalares (CCIH/SCIH) e gestão da qualidade no Brasil.
Gere uma análise estratégica baseada nos dados reais do dashboard.

Regras:
- Use os números, percentuais, setores e indicadores fornecidos no contexto
- Seja específico e acionável (cite valores quando possível)
- Linguagem profissional em português brasileiro
- Itens curtos e diretos (1 frase cada)
- Alinhe sugestões com diretrizes ANVISA/OMS quando aplicável
- Responda APENAS com JSON válido, sem markdown, sem cercas de código`;

    const userPrompt = `Página: ${pageTitle}

Dados do dashboard:
${context}

Retorne um JSON com EXATAMENTE este formato:
{
  ${sections.join(",\n  ")}
}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", response.status, await response.text());
      return new Response(JSON.stringify({ error: "Erro no gateway de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    // Sanitize risks
    if (parsed.risks && Array.isArray(parsed.risks)) {
      parsed.risks = parsed.risks
        .filter((r: any) => r && typeof r === "object")
        .slice(0, 8)
        .map((r: any) => ({
          name: String(r.name ?? "Risco").slice(0, 80),
          probability: Math.max(1, Math.min(5, Number(r.probability) || 3)),
          impact: Math.max(1, Math.min(5, Number(r.impact) || 3)),
          category: String(r.category ?? "Geral").slice(0, 40),
        }));
    }

    // Sanitize ishikawa
    if (parsed.ishikawa && Array.isArray(parsed.ishikawa)) {
      parsed.ishikawa = parsed.ishikawa
        .filter((c: any) => c && typeof c === "object")
        .slice(0, 6)
        .map((c: any) => ({
          label: String(c.label ?? "Categoria").slice(0, 30),
          causes: Array.isArray(c.causes)
            ? c.causes.filter((x: any) => typeof x === "string").slice(0, 6).map((x: string) => x.slice(0, 140))
            : [],
        }));
    }

    // Sanitize pareto + compute acumulado
    if (parsed.pareto && Array.isArray(parsed.pareto)) {
      const items = parsed.pareto
        .filter((p: any) => p && typeof p === "object")
        .slice(0, 10)
        .map((p: any) => ({
          question: String(p.question ?? p.fullQuestion ?? "Não conformidade").slice(0, 80),
          fullQuestion: String(p.fullQuestion ?? p.question ?? "Não conformidade").slice(0, 200),
          count: Math.max(0, Math.round(Number(p.count) || 0)),
        }))
        .sort((a: any, b: any) => b.count - a.count);
      const total = items.reduce((s: number, p: any) => s + p.count, 0);
      let running = 0;
      parsed.pareto = items.map((p: any) => {
        running += p.count;
        return { ...p, acumulado: total > 0 ? Number(((running / total) * 100).toFixed(1)) : 0 };
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-analysis error:", e);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
