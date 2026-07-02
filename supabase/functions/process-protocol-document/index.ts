import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { extractText, getDocumentProxy } from 'https://esm.sh/unpdf@0.12.1';
import mammoth from 'https://esm.sh/mammoth@1.8.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  let protocolId: string | undefined;

  try {
    ({ protocolId } = await req.json());
    if (!protocolId) throw new Error('protocolId é obrigatório.');

    const { data: protocol, error: protocolError } = await supabase
      .from('protocol_documents')
      .select('*')
      .eq('id', protocolId)
      .single();
    if (protocolError) throw protocolError;

    await supabase
      .from('protocol_documents')
      .update({ extraction_status: 'processing', extraction_error: null })
      .eq('id', protocolId);

    const { data: fileData, error: fileError } = await supabase.storage
      .from('protocol-documents')
      .download(protocol.file_path);
    if (fileError) throw fileError;

    const arrayBuffer = await fileData.arrayBuffer();
    const pages = await extractPages(arrayBuffer, protocol.file_mime_type, protocol.file_name);
    const totalText = pages.map((p) => p.text).join('\n').trim();

    if (!totalText) {
      throw new Error(
        'Não foi possível extrair texto (documento vazio ou digitalizado sem OCR).',
      );
    }

    const chunks: { content: string; page: number | null }[] = [];
    for (const p of pages) {
      for (const piece of splitTextIntoChunks(p.text, 1200)) {
        chunks.push({ content: piece, page: p.page });
      }
    }

    await supabase
      .from('protocol_documents')
      .update({
        extracted_text: totalText.slice(0, 500_000),
        page_count: pages.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', protocolId);

    await supabase.from('protocol_document_chunks').delete().eq('protocol_id', protocolId);

    const BATCH = 96;
    let inserted = 0;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const slice = chunks.slice(i, i + BATCH);
      const embeddings = await createEmbeddings(slice.map((c) => c.content));

      const rows = slice.map((c, j) => ({
        protocol_id: protocol.id,
        hospital_id: protocol.hospital_id,
        chunk_index: i + j,
        page_number: c.page,
        content: c.content,
        token_count: Math.ceil(c.content.length / 4),
        embedding: embeddings[j],
      }));

      const { error: insErr } = await supabase.from('protocol_document_chunks').insert(rows);
      if (insErr) throw insErr;
      inserted += rows.length;
    }

    await supabase
      .from('protocol_documents')
      .update({ extraction_status: 'completed' })
      .eq('id', protocolId);

    return new Response(
      JSON.stringify({ ok: true, pages: pages.length, chunks: inserted }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error(error);
    if (protocolId) {
      await supabase
        .from('protocol_documents')
        .update({
          extraction_status: 'failed',
          extraction_error: String((error as any)?.message || error),
        })
        .eq('id', protocolId)
        .catch(() => {});
    }
    return new Response(
      JSON.stringify({ error: String((error as any)?.message || error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});

async function extractPages(
  buf: ArrayBuffer,
  mime: string | null,
  fileName: string,
): Promise<{ page: number | null; text: string }[]> {
  const name = fileName.toLowerCase();

  if (mime?.includes('pdf') || name.endsWith('.pdf')) {
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: false });
    const arr = Array.isArray(text) ? text : [text];
    return arr
      .map((t, i) => ({ page: i + 1, text: (t || '').trim() }))
      .filter((p) => p.text.length > 0);
  }

  if (mime?.includes('word') || name.endsWith('.docx')) {
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return [{ page: null, text: (value || '').trim() }];
  }

  if (mime?.includes('text') || name.endsWith('.txt')) {
    return [{ page: null, text: new TextDecoder().decode(buf).trim() }];
  }

  throw new Error(
    'Formato sem extração de texto suportada (imagem/.doc). Requer OCR externo.',
  );
}

function splitTextIntoChunks(text: string, maxChars = 1200): string[] {
  const clean = (text || '').replace(/\s+/g, ' ').trim();
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += maxChars) chunks.push(clean.slice(i, i + maxChars));
  return chunks.filter(Boolean);
}

async function createEmbeddings(texts: string[]): Promise<number[][]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: 'text-embedding-3-small', input: texts }),
  });
  if (!response.ok) throw new Error(await response.text());
  const json = await response.json();
  return json.data.map((d: any) => d.embedding);
}
