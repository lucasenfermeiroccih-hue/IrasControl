import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { hospitalId, question } = await req.json();
    if (!hospitalId || !question) {
      return jsonResp({ error: 'hospitalId e question são obrigatórios.' }, 400);
    }

    const authHeader = req.headers.get('Authorization') || '';

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) return jsonResp({ error: 'Não autenticado.' }, 401);

    const { data: allowed, error: permErr } = await userClient.rpc('user_has_hospital', {
      p_hospital_id: hospitalId,
    });
    if (permErr) throw permErr;
    if (!allowed) return jsonResp({ error: 'Sem acesso a este hospital.' }, 403);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const questionEmbedding = await createEmbedding(question);

    const { data: matches, error: matchError } = await admin.rpc('match_protocol_chunks', {
      query_embedding: questionEmbedding,
      match_hospital_id: hospitalId,
      match_count: 8,
      match_threshold: 0.15,
    });
    if (matchError) throw matchError;

    const sources = matches || [];
    let answer: string;

    if (sources.length === 0) {
      answer = 'Não encontrei essa informação nos protocolos anexados.';
    } else {
      const context = sources
        .map(
          (m: any, i: number) =>
            `Fonte ${i + 1}: ${m.title}${m.page_number ? `, página ${m.page_number}` : ''}\nTrecho: ${m.content}`,
        )
        .join('\n\n');
      answer = await askLLM(question, context);
    }

    await admin.from('protocol_ai_questions').insert({
      hospital_id: hospitalId,
      user_id: userData.user.id,
      question,
      answer,
      source_protocol_ids: Array.from(new Set(sources.map((m: any) => m.protocol_id))),
    });

    return jsonResp({ answer, sources });
  } catch (error) {
    console.error(error);
    return jsonResp({ error: String((error as any)?.message || error) }, 500);
  }
});

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function createEmbedding(text: string): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: text }),
  });
  if (!response.ok) throw new Error(await response.text());
  const json = await response.json();
  return json.data[0].embedding;
}

async function askLLM(question: string, context: string): Promise<string> {
  const system = `Você é a IA de apoio técnico do IRAS Control.
Responda SOMENTE com base nos protocolos fornecidos no contexto.
Se a resposta não estiver nos protocolos, responda exatamente: "Não encontrei essa informação nos protocolos anexados".
Nunca invente condutas. Use linguagem técnica, clara e objetiva.
Sempre cite as fontes usadas pelo nome do protocolo e, quando houver, a página.`;

  const user = `Pergunta:\n${question}\n\nProtocolos encontrados:\n${context}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.1,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!response.ok) throw new Error(await response.text());
  const json = await response.json();
  return json.choices[0].message.content;
}
