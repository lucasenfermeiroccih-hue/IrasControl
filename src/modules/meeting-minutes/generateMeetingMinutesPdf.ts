import { jsPDF } from 'jspdf';
import type { Meeting, MeetingParticipant, MeetingActionItem } from './types';
import { supabase } from '@/integrations/supabase/client';

interface PdfParams {
  meeting: Meeting;
  participants: MeetingParticipant[];
  actionItems: MeetingActionItem[];
  hospitalName: string;
  hospitalId?: string;
  pendingItems?: string;
}

const PAGE_W = 210;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;
const PAGE_H = 297;
const BOTTOM = PAGE_H - 14;

function checkPage(doc: jsPDF, y: number, needed = 10): number {
  if (y + needed > BOTTOM) {
    doc.addPage();
    return 20;
  }
  return y;
}

function sectionTitle(doc: jsPDF, y: number, text: string): number {
  y = checkPage(doc, y, 14);
  doc.setFillColor(240, 240, 240);
  doc.rect(MARGIN, y - 5, CONTENT_W, 8, 'F');
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text(text, MARGIN + 2, y);
  doc.setFont('helvetica', 'normal');
  return y + 8;
}

function drawHLine(doc: jsPDF, y: number): void {
  doc.setDrawColor(180, 180, 180);
  doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
}

function tableRow(
  doc: jsPDF,
  y: number,
  cols: string[],
  widths: number[],
  bold = false,
  fillColor?: [number, number, number]
): number {
  const rowH = 7;
  y = checkPage(doc, y, rowH + 2);
  let x = MARGIN;
  if (fillColor) {
    doc.setFillColor(...fillColor);
    doc.rect(x, y - 5, CONTENT_W, rowH, 'F');
  }
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(8);
  doc.setTextColor(20, 20, 20);
  cols.forEach((text, i) => {
    const w = widths[i];
    const lines = doc.splitTextToSize(text || '', w - 2);
    doc.text(lines[0] ?? '', x + 1, y);
    x += w;
  });
  drawHLine(doc, y + 2);
  return y + rowH;
}

function keyValueTable(doc: jsPDF, y: number, rows: [string, string][]): number {
  const labelW = 55;
  const valueW = CONTENT_W - labelW;
  y = checkPage(doc, y, 6);
  doc.setDrawColor(180, 180, 180);
  doc.rect(MARGIN, y - 5, CONTENT_W, rows.length * 7 + 2);
  for (const [label, value] of rows) {
    y = checkPage(doc, y, 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    doc.text(label, MARGIN + 2, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(20, 20, 20);
    doc.text(value || '', MARGIN + labelW + 2, y);
    drawHLine(doc, y + 2);
    y += 7;
  }
  return y + 2;
}

function wrapText(doc: jsPDF, y: number, text: string, lineH = 5): number {
  const lines = doc.splitTextToSize(text || '', CONTENT_W - 4);
  for (const line of lines) {
    y = checkPage(doc, y, lineH);
    doc.text(line, MARGIN + 2, y);
    y += lineH;
  }
  return y;
}

function emptyLines(doc: jsPDF, y: number, count: number): number {
  for (let i = 0; i < count; i++) {
    y = checkPage(doc, y, 5);
    drawHLine(doc, y);
    y += 5;
  }
  return y;
}

function fmt(date?: string | null): string {
  if (!date) return '';
  try {
    const [y, m, d] = date.split('-');
    return `${d}/${m}/${y}`;
  } catch {
    return date;
  }
}

async function loadHospitalLogosForPdf(hospitalId?: string): Promise<{
  hospitalLogo: { dataUrl: string; w: number; h: number } | null;
  scihLogos: Array<{ dataUrl: string; w: number; h: number }>;
}> {
  if (!hospitalId) return { hospitalLogo: null, scihLogos: [] };
  try {
    const { data: logos } = await supabase
      .from('hospital_logos' as never)
      .select('logo_type, storage_path, display_order')
      .eq('hospital_id', hospitalId)
      .order('display_order');
    if (!(logos as any[])?.length) return { hospitalLogo: null, scihLogos: [] };
    const getUrl = (path: string) =>
      supabase.storage.from('hospital-logos').getPublicUrl(path).data.publicUrl;
    const loadImg = async (url: string) => {
      try {
        const res = await fetch(url);
        if (!res.ok) return null;
        const blob = await res.blob();
        const dataUrl: string = await new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result as string);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        });
        const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
          img.onerror = reject;
          img.src = dataUrl;
        });
        return { dataUrl, w: dims.w, h: dims.h };
      } catch { return null; }
    };
    const ls = logos as any[];
    const hospitalRec = ls.find((l: any) => l.logo_type === 'hospital');
    const scihRecs = ls.filter((l: any) => l.logo_type === 'scih');
    const [hospitalLogo, ...scihResults] = await Promise.all([
      hospitalRec ? loadImg(getUrl(hospitalRec.storage_path)) : Promise.resolve(null),
      ...scihRecs.map((r: any) => loadImg(getUrl(r.storage_path))),
    ]);
    return {
      hospitalLogo,
      scihLogos: (scihResults as any[]).filter((l): l is { dataUrl: string; w: number; h: number } => l !== null),
    };
  } catch { return { hospitalLogo: null, scihLogos: [] }; }
}

export async function generateMeetingMinutesPdf(params: PdfParams): Promise<void> {
  const { meeting, participants, actionItems, hospitalName, pendingItems, hospitalId } = params;
  const { hospitalLogo, scihLogos } = await loadHospitalLogosForPdf(hospitalId);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // ─── Cabeçalho ──────────────────────────────────────────
  doc.setFillColor(245, 245, 245);
  doc.rect(MARGIN, 8, CONTENT_W, 22, 'F');
  doc.setDrawColor(180, 180, 180);
  doc.rect(MARGIN, 8, CONTENT_W, 22);

  // Logos do banco (admin/settings)
  const LOGO_H = 18;
  if (hospitalLogo) {
    const lw = Math.min(40, (hospitalLogo.w / hospitalLogo.h) * LOGO_H);
    doc.addImage(hospitalLogo.dataUrl, 'PNG', MARGIN + 2, 10, lw, LOGO_H);
  }
  if (scihLogos.length > 0) {
    let logoX = MARGIN + CONTENT_W - 2;
    for (const logo of [...scihLogos].reverse().slice(0, 3)) {
      const lw = Math.min(30, (logo.w / logo.h) * LOGO_H);
      logoX -= lw;
      doc.addImage(logo.dataUrl, 'PNG', logoX, 10, lw, LOGO_H);
      logoX -= 3;
    }
  }

  // Nome hospital
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(20, 20, 20);
  const hospLines = doc.splitTextToSize(hospitalName || 'Hospital', CONTENT_W - 50);
  doc.text(hospLines, PAGE_W / 2, 16, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  doc.text('Formulário — Ata de Reuniões', PAGE_W / 2, 24, { align: 'center' });

  let y = 38;
  drawHLine(doc, y - 2);

  // ─── 1. Identificação da Ata ────────────────────────────
  y = sectionTitle(doc, y, '1. Identificação da Ata');
  y = keyValueTable(doc, y, [
    ['Relator da Ata:', meeting.reporter_name || ''],
    ['Data:', fmt(meeting.scheduled_date)],
    ['Setor / Comissão:', meeting.committee || meeting.department || ''],
    ['Tema:', meeting.theme || meeting.title || ''],
    ['Caráter da Reunião:', meeting.meeting_character === 'extraordinary' ? '( ) Ordinária   (✓) Extraordinária' : '(✓) Ordinária   ( ) Extraordinária'],
    ['Início:', meeting.start_time || ''],
    ['Término:', meeting.end_time || ''],
  ]);
  y += 4;

  // ─── 2. Entrada da Reunião ──────────────────────────────
  y = sectionTitle(doc, y, '2. Entrada da Reunião');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);
  const entradas = ['( ) Indicador', '( ) Planejamento', '( ) Melhoria', '( ) Outro: _______________'];
  for (const item of entradas) {
    y = checkPage(doc, y, 6);
    doc.text(item, MARGIN + 4, y);
    y += 5;
  }
  y += 4;

  // ─── 3. Situação das Pendências Anteriores ──────────────
  y = sectionTitle(doc, y, '3. Situação das Pendências Anteriores');
  const situacoes = [
    '( ) Pendências Anteriores',
    '( ) Primeira Reunião',
    '( ) Não houve pendências da reunião anterior',
  ];
  for (const item of situacoes) {
    y = checkPage(doc, y, 6);
    doc.text(item, MARGIN + 4, y);
    y += 5;
  }
  y += 4;

  // ─── 4. Pendências Anteriores / Acompanhamento ──────────
  y = sectionTitle(doc, y, '4. Pendências Anteriores / Acompanhamento');
  const pendCols = ['O quê', 'Quem', 'Quando', 'Situação', 'Local de Arquivamento da Evidência'];
  const pendWidths = [40, 30, 25, 25, 62];
  y = tableRow(doc, y, pendCols, pendWidths, true, [230, 230, 230]);

  if (pendingItems && pendingItems.trim()) {
    const lines = pendingItems.split('\n').filter(l => l.trim());
    for (const line of lines.slice(0, 5)) {
      y = tableRow(doc, y, [line, '', '', '', ''], pendWidths);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      y = tableRow(doc, y, ['', '', '', '', ''], pendWidths);
    }
  }
  y += 4;

  // ─── 5. Relato da Reunião ────────────────────────────────
  y = sectionTitle(doc, y, '5. Relato da Reunião');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text('Descrever os principais pontos discutidos, decisões tomadas e encaminhamentos.', MARGIN + 2, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(20, 20, 20);

  const minutesMd = (meeting.generated_minutes_md || '').replace(/[#*_`|>]/g, '').trim();
  if (minutesMd) {
    y = wrapText(doc, y, minutesMd, 5);
  } else {
    y = emptyLines(doc, y, 10);
  }
  y += 4;

  // ─── 6. Pendências — Resoluções ─────────────────────────
  y = sectionTitle(doc, y, '6. Pendências — Resoluções / Comunicação de Alterações');
  const resCols = ['O quê', 'Quem', 'Quando'];
  const resWidths = [80, 60, 42];
  y = tableRow(doc, y, resCols, resWidths, true, [230, 230, 230]);

  if (actionItems.length) {
    for (const item of actionItems.slice(0, 6)) {
      y = tableRow(doc, y, [item.title, item.responsible_name, fmt(item.due_date)], resWidths);
    }
  } else {
    for (let i = 0; i < 3; i++) {
      y = tableRow(doc, y, ['', '', ''], resWidths);
    }
  }
  y += 4;

  // ─── 7. Próxima Reunião ──────────────────────────────────
  y = sectionTitle(doc, y, '7. Próxima Reunião');
  y = keyValueTable(doc, y, [
    ['Data da próxima reunião:', fmt(meeting.next_meeting_date)],
    ['Horário:', meeting.next_meeting_time || ''],
    ['Local:', meeting.next_meeting_location || ''],
    ['Pauta prevista:', meeting.next_meeting_agenda || ''],
  ]);
  y += 4;

  // ─── 8. Participantes e Assinaturas ─────────────────────
  y = sectionTitle(doc, y, '8. Participantes e Assinaturas');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text('Orientação: Assinar o nome completo — não rubricar.', MARGIN + 2, y);
  y += 4;

  const partCols = ['Participantes', 'Cargo/Função', 'Assinatura'];
  const partWidths = [60, 50, 72];
  y = tableRow(doc, y, partCols, partWidths, true, [230, 230, 230]);

  const allParticipants = participants.length ? participants : Array(14).fill({ name: '', role: '', present: false });
  for (const p of allParticipants.slice(0, 14)) {
    y = tableRow(doc, y, [(p as MeetingParticipant).name || '', (p as MeetingParticipant).role || '', ''], partWidths);
  }

  // Fill to 14 rows minimum
  if (participants.length < 14) {
    for (let i = participants.length; i < 14; i++) {
      y = tableRow(doc, y, ['', '', ''], partWidths);
    }
  }
  y += 4;

  // ─── 9. Página de Continuação ────────────────────────────
  doc.addPage();
  y = 20;
  y = sectionTitle(doc, y, '9. Página de Continuação');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(80, 80, 80);
  doc.text('Utilizar este espaço para complementação do relato, anexos, observações e registros adicionais.', MARGIN + 2, y);
  y += 6;
  y = emptyLines(doc, y, 18);

  // ─── Rodapé ──────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`IRASControl — Ata de Reunião | ${hospitalName}`, MARGIN, PAGE_H - 6);
    doc.text(`Página ${i} de ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 6, { align: 'right' });
    const dateStr = new Date().toLocaleDateString('pt-BR');
    doc.text(`Emitido em: ${dateStr}`, PAGE_W / 2, PAGE_H - 6, { align: 'center' });
  }

  const dateSlug = meeting.scheduled_date?.replace(/-/g, '') ?? 'sem_data';
  doc.save(`ata_reuniao_${dateSlug}.pdf`);
}
