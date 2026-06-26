import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version",
};

const AGENT_PROMPTS: Record<string, string> = {
  "detector-de-riscos": `Você é o Agente Detector de Riscos do IRASControl, sistema de controle de infecções hospitalares (CCIH).
Especialidade: identificar clusters, surtos potenciais, padrões de resistência antimicrobiana e alertas precoces.
Responda sempre em português brasileiro, de forma clínica e objetiva. Use os dados fornecidos para análise epidemiológica prática.`,

  "analisador-de-tendencias": `Você é o Agente Analisador de Tendências do IRASControl.
Especialidade: análise epidemiológica de séries temporais, taxas de IRAS (ITU-AC, PAV, ISC, ICS-CVC), DDD de antimicrobianos.
Responda sempre em português brasileiro. Forneça análises quantitativas claras e recomendações baseadas em evidências.`,

  "gerador-de-relatorios": `Você é o Agente Gerador de Relatórios do IRASControl.
Especialidade: criar relatórios epidemiológicos estruturados para ANVISA, direção hospitalar e CCIH.
Responda sempre em português brasileiro. Formate as respostas de forma clara, com seções bem definidas.`,

  "alerta-surtos": `Você é o Agente de Alerta de Surtos do IRASControl.
Especialidade: identificar e comunicar surtos hospitalares, critérios ANVISA para investigação, medidas imediatas de controle.
Responda sempre em português brasileiro com senso de urgência quando necessário. Priorize ações de contenção.`,

  "sugestor-intervencoes": `Você é o Agente Sugestor de Intervenções do IRASControl.
Especialidade: recomendar bundles de prevenção (CVC, SVD, VM), protocolos ANVISA/CDC/OMS, stewardship antimicrobiano.
Responda sempre em português brasileiro. Forneça recomendações práticas e baseadas em diretrizes vigentes.`,

  "mapeamento-precaucao": `Você é especialista em controle de infecção hospitalar (CCIH) e mapeamento de precauções.
Especialidade: análise de pacientes em isolamento, precauções de contato/gotículas/aerossóis, microrganismos multirresistentes.
Responda sempre em português brasileiro. Seja objetivo e clínico, focando em riscos, clusters e recomendações práticas.`,

  default: `Você é o Agente Orquestrador do IRASControl, sistema de controle de infecções relacionadas à assistência à saúde (IRAS).
Você possui expertise em epidemiologia hospitalar, ANVISA, CDC, OMS, CCIH e controle de infecções.
Responda sempre em português brasileiro, de forma clara, clínica e acionável.`,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await callerClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida. Faça login novamente." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { agent_id, input, context } = await req.json();

    if (!input || typeof input !== "string" || input.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Mensagem não pode ser vazia" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = AGENT_PROMPTS[agent_id] ?? AGENT_PROMPTS.default;

    let userMessage = input.trim();
    if (context && typeof context === "object") {
      userMessage = `[Contexto do sistema:\n${JSON.stringify(context, null, 2)}]\n\n${userMessage}`;
    }

    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY não configurada nas secrets do Supabase." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        max_tokens: 1500,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenAI error:", response.status, err);
      return new Response(
        JSON.stringify({ error: `Erro na API de IA (${response.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const output = data.choices?.[0]?.message?.content ?? "Sem resposta.";

    return new Response(JSON.stringify({ output, agent_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("agent-chat error:", e);
    return new Response(JSON.stringify({ error: "Erro interno do servidor" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
