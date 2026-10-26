import { supabase } from '@/integrations/supabase/client';
import type { Meeting, MeetingParticipant, MeetingActionItem } from './types';
import { buildAtaPdf, unitFooterLines, type PdfImage } from './ataFormPdf';

interface PdfParams {
  meeting: Meeting;
  participants: MeetingParticipant[];
  actionItems: MeetingActionItem[];
  hospitalName: string;
  hospitalId?: string;
  /** Mantido por compatibilidade: o quadro de ações usa meeting.followup_actions e, na falta, este texto */
  pendingItems?: string;
}

/**
 * Carrega uma imagem e a converte em PNG por canvas. Isso garante que logos em
 * WEBP, SVG ou GIF cadastradas no sistema funcionem no jsPDF.
 */
async function loadAsPng(url: string): Promise<PdfImage | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = reject;
        el.src = objectUrl;
      });
      const w = img.naturalWidth || 300;
      const h = img.naturalHeight || 150;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return null;
      ctx.drawImage(img, 0, 0, w, h);
      return { dataUrl: canvas.toDataURL('image/png'), w, h };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return null;
  }
}

/**
 * Logos cadastradas no IRASControl (Configurações > Logos). A marca IRASControl do
 * cabeçalho é desenhada em vetor pelo construtor do PDF (ataFormPdf.ts).
 */
async function loadAssets(hospitalId?: string) {
  const irasLogo: PdfImage | null = null;
  if (!hospitalId) return { hospitalLogo: null, irasLogo, footerLogos: [] as PdfImage[] };
  try {
    const { data } = await supabase
      .from('hospital_logos')
      .select('logo_type, storage_path, display_order')
      .eq('hospital_id', hospitalId)
      .order('display_order');
    const logos = data ?? [];
    const url = (path: string) => supabase.storage.from('hospital-logos').getPublicUrl(path).data.publicUrl;
    const hospitalRec = logos.find(l => l.logo_type === 'hospital');
    const scihRecs = logos.filter(l => l.logo_type === 'scih');
    const [hospitalLogo, ...scih] = await Promise.all([
      hospitalRec ? loadAsPng(url(hospitalRec.storage_path)) : Promise.resolve(null),
      ...scihRecs.map(r => loadAsPng(url(r.storage_path))),
    ]);
    // rodapé: logo da unidade cadastrada; sem ela, as logos do SCIH
    const footerLogos = (hospitalLogo ? [hospitalLogo] : scih).filter((l): l is PdfImage => !!l);
    return { hospitalLogo, irasLogo, footerLogos };
  } catch {
    return { hospitalLogo: null, irasLogo, footerLogos: [] as PdfImage[] };
  }
}

/** Rodapé com os dados da unidade cadastrados em Configurações > Instituição. */
async function loadUnit(hospitalId: string | undefined, hospitalName: string) {
  if (!hospitalId) return { unitLine: hospitalName, unitDetail: '' };
  try {
    const { data } = await supabase
      .from('hospitals')
      .select('name, short_name, city, state, address, neighborhood, zip_code')
      .eq('id', hospitalId)
      .single();
    return unitFooterLines(data ?? {}, hospitalName);
  } catch {
    return { unitLine: hospitalName, unitDetail: '' };
  }
}

export async function generateMeetingMinutesPdf(params: PdfParams): Promise<void> {
  const { meeting, participants, actionItems, hospitalName, hospitalId } = params;
  const [assets, unit] = await Promise.all([loadAssets(hospitalId), loadUnit(hospitalId, hospitalName)]);
  const doc = buildAtaPdf({ meeting, participants, actionItems, hospitalName, ...unit }, assets);
  const dateSlug = meeting.scheduled_date?.replace(/-/g, '') ?? 'sem_data';
  doc.save(`ata_reuniao_${dateSlug}.pdf`);
}
