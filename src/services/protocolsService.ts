import { supabase } from '@/integrations/supabase/client';
import type {
  ProtocolDocument,
  ProtocolCategory,
  ProtocolUploadInput,
  ProtocolAIAnswer,
  ProtocolDashboardData,
} from '@/types/protocols';

const BUCKET = 'protocol-documents';
const MAX_FILE_BYTES = 25 * 1024 * 1024;
const ACCEPTED = ['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg', '.txt'];

export async function listProtocols(
  hospitalId: string,
  filters?: { search?: string; sector?: string; categoryId?: string; status?: string },
) {
  let query = supabase
    .from('protocol_documents')
    .select('*, protocol_categories(*)')
    .eq('hospital_id', hospitalId)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.sector) query = query.eq('sector', filters.sector);
  if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters?.search) {
    const s = filters.search.replace(/[%,]/g, ' ').trim();
    query = query.or(`title.ilike.%${s}%,description.ilike.%${s}%,sector.ilike.%${s}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as ProtocolDocument[];
}

export async function listCategories(hospitalId: string) {
  const { data, error } = await supabase
    .from('protocol_categories')
    .select('*')
    .eq('hospital_id', hospitalId)
    .order('name');
  if (error) throw error;
  return data as ProtocolCategory[];
}

export async function createCategory(hospitalId: string, name: string, color?: string) {
  const { data, error } = await supabase
    .from('protocol_categories')
    .insert({ hospital_id: hospitalId, name, color: color || '#2563eb' })
    .select('*')
    .single();
  if (error) throw error;
  return data as ProtocolCategory;
}

export async function uploadProtocol(input: ProtocolUploadInput) {
  const lower = input.file.name.toLowerCase();
  if (!ACCEPTED.some((ext) => lower.endsWith(ext))) {
    throw new Error('Formato de arquivo não permitido. Use PDF, DOCX, DOC, TXT ou imagem.');
  }
  if (input.file.size > MAX_FILE_BYTES) {
    throw new Error('Arquivo excede o limite de 25 MB.');
  }

  const safeName = input.file.name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9_.-]/g, '_');

  const filePath = `${input.hospitalId}/${crypto.randomUUID()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, input.file, {
      cacheControl: '3600',
      upsert: false,
      contentType: input.file.type || 'application/octet-stream',
    });
  if (uploadError) throw uploadError;

  const { data: userData } = await supabase.auth.getUser();

  const { data, error } = await supabase
    .from('protocol_documents')
    .insert({
      hospital_id: input.hospitalId,
      category_id: input.categoryId || null,
      title: input.title,
      description: input.description || null,
      sector: input.sector || null,
      protocol_type: input.protocolType || null,
      document_code: input.documentCode || null,
      version: input.version || '1.0',
      responsible_name: input.responsibleName || null,
      responsible_role: input.responsibleRole || null,
      issue_date: input.issueDate || null,
      review_date: input.reviewDate || null,
      expiration_date: input.expirationDate || null,
      tags: input.tags || [],
      file_name: input.file.name,
      file_path: filePath,
      file_mime_type: input.file.type,
      file_size: input.file.size,
      ai_enabled: input.aiEnabled ?? true,
      uploaded_by: userData.user?.id || null,
      extraction_status: 'pending',
      status: 'active',
    })
    .select('*')
    .single();

  if (error) {
    await supabase.storage.from(BUCKET).remove([filePath]).catch(() => {});
    throw error;
  }

  // Falha na IA não derruba o upload — o documento fica 'pending' e pode ser reprocessado
  if (data.ai_enabled) {
    supabase.functions
      .invoke('process-protocol-document', { body: { protocolId: data.id } })
      .catch((e) => console.warn('Falha ao disparar extração; reprocesse manualmente.', e));
  }

  return data as ProtocolDocument;
}

export async function reprocessProtocol(protocolId: string) {
  await supabase
    .from('protocol_documents')
    .update({ extraction_status: 'pending', extraction_error: null })
    .eq('id', protocolId);

  const { error } = await supabase.functions.invoke('process-protocol-document', {
    body: { protocolId },
  });
  if (error) throw error;
}

export async function updateProtocolStatus(protocolId: string, status: string) {
  const { error } = await supabase
    .from('protocol_documents')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', protocolId);
  if (error) throw error;
}

export async function getProtocolSignedUrl(filePath: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function downloadProtocol(protocol: ProtocolDocument) {
  const { data, error } = await supabase.storage.from(BUCKET).download(protocol.file_path);
  if (error) throw error;

  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = protocol.file_name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function deleteProtocol(protocol: ProtocolDocument) {
  await supabase.storage.from(BUCKET).remove([protocol.file_path]).catch((e) => {
    console.warn('Arquivo já ausente no storage; seguindo com delete do registro.', e);
  });
  const { error } = await supabase.from('protocol_documents').delete().eq('id', protocol.id);
  if (error) throw error;
}

export async function askProtocolAI(hospitalId: string, question: string): Promise<ProtocolAIAnswer> {
  const { data, error } = await supabase.functions.invoke('ask-protocols-ai', {
    body: { hospitalId, question },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as ProtocolAIAnswer;
}

export async function getProtocolDashboard(hospitalId: string): Promise<ProtocolDashboardData> {
  const { data, error } = await supabase
    .from('protocol_documents')
    .select('id, status, sector, expiration_date, extraction_status')
    .eq('hospital_id', hospitalId);
  if (error) throw error;

  const today = new Date();
  const next30 = new Date();
  next30.setDate(today.getDate() + 30);

  const rows = data || [];
  const total = rows.length;
  const active = rows.filter((p) => p.status === 'active').length;
  const expired = rows.filter(
    (p) => p.expiration_date && new Date(p.expiration_date) < today,
  ).length;
  const expiringSoon = rows.filter((p) => {
    if (!p.expiration_date) return false;
    const d = new Date(p.expiration_date);
    return d >= today && d <= next30;
  }).length;
  const aiReady = rows.filter((p) => p.extraction_status === 'completed').length;
  const failed = rows.filter((p) => p.extraction_status === 'failed').length;
  const bySector = rows.reduce<Record<string, number>>((acc, p) => {
    const sector = p.sector || 'Sem setor';
    acc[sector] = (acc[sector] || 0) + 1;
    return acc;
  }, {});

  return { total, active, expired, expiringSoon, aiReady, failed, bySector };
}
