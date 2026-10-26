/**
 * Ata de Reuniões — leiaute do formulário institucional (modelo FOR-HGNI-001).
 *
 * Construtor puro: recebe os dados e as logos já carregadas e devolve o jsPDF.
 * Não acessa rede nem banco, o que permite testar o leiaute fora do navegador.
 *
 * Estrutura (na ordem do formulário):
 *  1. Cabeçalho repetido em todas as páginas: logo do hospital | nome + "Formulário - Ata de Reuniões" | logo IRASControl
 *  2. Quadro de identificação: Relator, Data, Setor / Tema, Caráter, Início-Término / Entrada / Pendências
 *  3. Quadro de ações: O Quê | Quem | Quando | Situação | Local de Arquivamento da Evidência
 *  4. Relato da Reunião (rótulo vertical à esquerda, texto justificado)
 *  5. Pendências – (Resoluções / Comunicação de alterações e etc.): O Quê | Quem | Quando + Próxima Reunião
 *  6. Participantes / Assinaturas
 *  Rodapé: logos do SCIH + código do formulário | unidade, emissão e paginação
 */
import { jsPDF } from 'jspdf';
import type {
  Meeting, MeetingParticipant, MeetingActionItem, FollowupAction, MeetingEntryType, PreviousPendingStatus,
} from './types';

export interface PdfImage { dataUrl: string; w: number; h: number }

export interface AtaPdfData {
  meeting: Meeting;
  participants: MeetingParticipant[];
  actionItems: MeetingActionItem[];
  hospitalName: string;
  /** Linha da unidade no rodapé, ex.: "UNIDADE DE NOVA IGUAÇU – RJ | HGNI" */
  unitLine?: string;
  /** Linha complementar do rodapé (endereço, CNES etc.) */
  unitDetail?: string;
}

export interface AtaPdfAssets {
  hospitalLogo?: PdfImage | null;
  /** Logo da marca IRASControl (cabeçalho, à direita) */
  irasLogo?: PdfImage | null;
  /** Logos do SCIH/CCIH cadastradas no IRASControl (rodapé, à esquerda) */
  footerLogos?: PdfImage[];
}

// ─── Geometria (mm, A4 retrato) ─────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MX = 15;
const CW = PAGE_W - MX * 2; // 180
const HEADER_TOP = 10;
const HEADER_H = 24;
const BODY_TOP = HEADER_TOP + HEADER_H + 5;
const FOOTER_TOP = PAGE_H - 18;
const BODY_BOTTOM = FOOTER_TOP - 4;
const PAD = 1.6;
const LINE = 0.352778; // 1 pt em mm

const BORDER: [number, number, number] = [0, 0, 0];
const TEXT: [number, number, number] = [0, 0, 0];

type Align = 'left' | 'center' | 'justify';
interface CellSpec {
  text: string;
  bold?: boolean;
  italic?: boolean;
  align?: Align;
  size?: number;
  font?: 'helvetica' | 'times';
}

/** Caracteres fora do WinAnsi trocados por equivalentes que as fontes-padrão do PDF exibem. */
export function pdfSafe(s?: string | null): string {
  return (s ?? '')
    .replace(/\r/g, '')
    .replace(/[≥]/g, '>=').replace(/[≤]/g, '<=')
    .replace(/[→⇒]/g, '->').replace(/[←]/g, '<-')
    .replace(/[•▪◦]/g, '-')
    .replace(/[✓✔]/g, 'x')
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2010\u2011]/g, '-')
    .replace(/[^\x00-\xff\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]/g, '');
}

export interface UnitRecord {
  name?: string | null; short_name?: string | null; city?: string | null; state?: string | null;
  address?: string | null; neighborhood?: string | null; zip_code?: string | null;
}

/**
 * Linhas do rodapé no padrão do formulário:
 *  "UNIDADE DE NOVA IGUAÇU – RJ | HGNI"
 *  "Av. Henrique Duque Estrada Meyer, Posse, Nova Iguaçu, RJ. CEP 26030-380"
 */
export function unitFooterLines(u: UnitRecord, fallbackName = ''): { unitLine: string; unitDetail: string } {
  const name = u.name || fallbackName;
  const place = [u.city, u.state].filter(Boolean).join(' – ');
  const sigla = u.short_name?.trim() || '';
  const unitLine = place ? `Unidade de ${place}${sigla ? ` | ${sigla}` : ''}` : [name, sigla].filter(Boolean).join(' | ');
  const street = [u.address, u.neighborhood, u.city, u.state].map(v => v?.trim()).filter(Boolean).join(', ');
  const cep = u.zip_code?.trim() ? `CEP ${u.zip_code.trim()}` : '';
  const unitDetail = street ? `${street}.${cep ? ` ${cep}` : ''}` : cep;
  return { unitLine, unitDetail };
}

function fmtDate(d?: string | null): string {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  return day && m && y ? `${day}/${m}/${y}` : d;
}

const ENTRY_LABELS: [MeetingEntryType, string][] = [
  ['indicator', 'Indicador'], ['planning', 'Planejamento'], ['improvement', 'Melhoria'], ['other', 'Outro'],
];
const PENDING_LABELS: [PreviousPendingStatus, string][] = [
  ['previous', 'Pendências Anteriores'], ['first', 'Primeira  Reunião'], ['none', 'Não houve pendências da reunião anterior'],
];
const ACTION_STATUS_PT: Record<string, string> = {
  open: 'Em aberto', in_progress: 'Em andamento', done: 'Concluído', cancelled: 'Cancelado', overdue: 'Vencido',
};

/** Remove a marcação Markdown para uso da ata gerada pela IA como relato. */
export function markdownToPlain(md: string): string {
  return md
    .split('\n')
    .filter(l => !/^\s*\|?\s*-{3,}/.test(l))
    .map(l => {
      const t = l.trim();
      const row = t.startsWith('|') ? t.replace(/^\|/, '').replace(/\|$/, '').split('|').map(c => c.trim()).filter(Boolean).join(' — ') : l;
      return row.replace(/^#{1,6}\s*/, '').replace(/^\s*>\s?/, '').replace(/\*\*|__|`/g, '').replace(/^\s*[-*]\s+/, '- ').trimEnd();
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Itens do quadro de ações: os registrados na reunião ou, na ausência, as pendências anteriores em texto. */
export function followupRows(meeting: Meeting): FollowupAction[] {
  const list = Array.isArray(meeting.followup_actions) ? meeting.followup_actions : [];
  const filled = list.filter(r => [r.what, r.who, r.when, r.status, r.evidence_location].some(v => (v ?? '').trim()));
  if (filled.length) return filled;
  const lines = (meeting.previous_pending_items || '').split('\n').map(l => l.replace(/^\s*[-*•]\s*/, '').trim()).filter(Boolean);
  return lines.map(what => ({ what, who: '', when: '', status: '', evidence_location: '' }));
}

function actionWhen(a: MeetingActionItem): string {
  const parts = [a.when_text?.trim(), a.due_date ? fmtDate(a.due_date) : ''].filter(Boolean);
  return parts.join(' — ');
}

class AtaPdf {
  doc: jsPDF;
  y = BODY_TOP;
  private data: AtaPdfData;
  private assets: AtaPdfAssets;

  constructor(data: AtaPdfData, assets: AtaPdfAssets) {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    this.data = data;
    this.assets = assets;
    this.doc.setLineWidth(0.25);
    this.doc.setDrawColor(...BORDER);
    this.doc.setTextColor(...TEXT);
  }

  // ── Texto ────────────────────────────────────────────────────────────────
  private setFont(spec: { bold?: boolean; italic?: boolean; size?: number; font?: 'helvetica' | 'times' }) {
    const style = spec.bold && spec.italic ? 'bolditalic' : spec.bold ? 'bold' : spec.italic ? 'italic' : 'normal';
    this.doc.setFont(spec.font ?? 'helvetica', style);
    this.doc.setFontSize(spec.size ?? 8.5);
  }

  private lineH(size: number) { return size * LINE * 1.22; }

  private wrap(text: string, width: number, spec: CellSpec): string[] {
    this.setFont(spec);
    const out: string[] = [];
    for (const para of pdfSafe(text).split('\n')) {
      if (!para.trim()) { out.push(''); continue; }
      out.push(...(this.doc.splitTextToSize(para, width) as string[]));
    }
    return out.length ? out : [''];
  }

  private cellHeight(spec: CellSpec, width: number): number {
    const size = spec.size ?? 8.5;
    return this.wrap(spec.text, width - PAD * 2, spec).length * this.lineH(size) + PAD * 2;
  }

  /** Escreve linhas numa caixa; "justify" justifica todas as linhas de um parágrafo, menos a última. */
  private drawLines(lines: string[], x: number, yTop: number, width: number, spec: CellSpec, boxH?: number, continues = false) {
    const size = spec.size ?? 8.5;
    const lh = this.lineH(size);
    this.setFont(spec);
    const blockH = lines.length * lh;
    let yy = yTop + PAD + size * LINE * 0.82;
    if (boxH !== undefined) yy = yTop + Math.max(PAD, (boxH - blockH) / 2) + size * LINE * 0.82;
    const innerW = width - PAD * 2;
    lines.forEach((ln, i) => {
      const next = lines[i + 1];
      const lastOfPara = next === undefined ? !continues : next === '';
      if (spec.align === 'center') {
        this.doc.text(ln, x + width / 2, yy, { align: 'center' });
      } else if (spec.align === 'justify' && !lastOfPara && ln.trim()) {
        this.doc.text(ln, x + PAD, yy, { align: 'justify', maxWidth: innerW });
      } else {
        this.doc.text(ln, x + PAD, yy);
      }
      yy += lh;
    });
  }

  // ── Página ───────────────────────────────────────────────────────────────
  private image(img: PdfImage, x: number, y: number, maxW: number, maxH: number) {
    const ratio = img.w / img.h;
    let w = maxW, h = maxW / ratio;
    if (h > maxH) { h = maxH; w = maxH * ratio; }
    const fmt = img.dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG';
    this.doc.addImage(img.dataUrl, fmt, x + (maxW - w) / 2, y + (maxH - h) / 2, w, h);
  }

  private drawHeader() {
    const d = this.doc;
    const leftW = 40, rightW = 40, midW = CW - leftW - rightW;
    d.setDrawColor(...BORDER);
    d.rect(MX, HEADER_TOP, CW, HEADER_H);
    d.line(MX + leftW, HEADER_TOP, MX + leftW, HEADER_TOP + HEADER_H);
    d.line(MX + leftW + midW, HEADER_TOP, MX + leftW + midW, HEADER_TOP + HEADER_H);
    if (this.assets.hospitalLogo) this.image(this.assets.hospitalLogo, MX + 2, HEADER_TOP + 2, leftW - 4, HEADER_H - 4);
    if (this.assets.irasLogo) this.image(this.assets.irasLogo, MX + leftW + midW + 2, HEADER_TOP + 2, rightW - 4, HEADER_H - 4);
    else this.wordmark(MX + leftW + midW + rightW / 2, HEADER_TOP + HEADER_H / 2);
    this.setFont({ bold: true, size: 11 });
    const name = d.splitTextToSize(pdfSafe(this.data.hospitalName || 'Hospital'), midW - 6) as string[];
    const cx = MX + leftW + midW / 2;
    let ty = HEADER_TOP + HEADER_H / 2 - (name.length - 1) * 2.2 - 0.8;
    name.forEach(l => { d.text(l, cx, ty, { align: 'center' }); ty += 4.4; });
    this.setFont({ bold: true, size: 9.5 });
    d.text('Formulário - Ata de Reuniões', cx, ty + 0.6, { align: 'center' });
  }

  /** Marca IRASControl desenhada em vetor: "IRAS" em azul-petróleo e "CONTROL" em turquesa. */
  private wordmark(cx: number, cy: number) {
    const d = this.doc;
    d.setFont('helvetica', 'bold');
    d.setFontSize(17);
    d.setTextColor(18, 52, 59);
    d.text('IRAS', cx, cy + 0.6, { align: 'center' });
    d.setFontSize(7.5);
    d.setTextColor(14, 165, 160);
    const word = 'CONTROL';
    const cs = 1.1;
    const w = d.getTextWidth(word) + cs * (word.length - 1);
    d.text(word, cx - w / 2, cy + 4.8, { charSpace: cs });
    d.setDrawColor(14, 165, 160);
    d.setLineWidth(0.4);
    d.line(cx - w / 2, cy + 6.3, cx + w / 2, cy + 6.3);
    d.setLineWidth(0.25);
    d.setDrawColor(...BORDER);
    d.setTextColor(...TEXT);
  }

  private newPage() {
    this.doc.addPage();
    this.drawHeader();
    this.y = BODY_TOP;
  }

  private ensure(h: number) {
    if (this.y + h > BODY_BOTTOM) this.newPage();
  }

  // ── Tabelas ──────────────────────────────────────────────────────────────
  /** Linha de tabela com células de largura fixa; a altura acompanha a célula mais alta. */
  private row(widths: number[], cells: CellSpec[], opts: { minH?: number; vCenter?: boolean } = {}): number {
    const h = Math.max(opts.minH ?? 0, ...cells.map((c, i) => this.cellHeight(c, widths[i])));
    let x = MX;
    cells.forEach((c, i) => {
      this.doc.rect(x, this.y, widths[i], h);
      const lines = this.wrap(c.text, widths[i] - PAD * 2, c);
      this.drawLines(lines, x, this.y, widths[i], c, opts.vCenter === false ? undefined : h);
      x += widths[i];
    });
    this.y += h;
    return h;
  }

  private table(widths: number[], header: CellSpec[], rows: CellSpec[][], minRowH = 6) {
    const drawHead = () => this.row(widths, header, { minH: 7 });
    const headH = Math.max(7, ...header.map((c, i) => this.cellHeight(c, widths[i])));
    this.ensure(headH + minRowH);
    drawHead();
    for (const r of rows) {
      const h = Math.max(minRowH, ...r.map((c, i) => this.cellHeight(c, widths[i])));
      if (this.y + h > BODY_BOTTOM) { this.newPage(); drawHead(); }
      this.row(widths, r, { minH: minRowH });
    }
  }

  // ── Seções ───────────────────────────────────────────────────────────────
  private identification() {
    const m = this.data.meeting;
    const x = (on: boolean) => (on ? '( x )' : '(   )');
    const W1 = [90, 45, 45];
    this.row(W1, [
      { text: `Relator da Ata: ${m.reporter_name || ''}`, bold: true, size: 9 },
      { text: `Data: ${fmtDate(m.scheduled_date)}`, bold: true, size: 9 },
      { text: `Setor: ${m.committee || m.department || ''}`, bold: true, size: 9 },
    ], { minH: 9 });
    const extra = m.meeting_character === 'extraordinary';
    this.row([90, 58, 32], [
      { text: `Tema: ${m.theme || m.title || ''}`, bold: true, size: 9, align: 'justify' },
      { text: `Caráter da Reunião:\n${x(!extra)} Ordinária    ${x(extra)} Extraordinária`, size: 9 },
      { text: `Início: ${m.start_time || ''}\nTérmino: ${m.end_time || ''}`, bold: true, size: 9 },
    ], { minH: 11 });
    const entry = ENTRY_LABELS.map(([k, label]) =>
      `${x(m.entry_type === k)} ${label}${k === 'other' ? `: ${m.entry_type === 'other' ? (m.entry_other || '') : ''}` : ''}`).join('      ');
    this.row([CW], [{ text: `Entrada:  ${entry}`, size: 9 }], { minH: 7 });
    const pend = PENDING_LABELS.map(([k, label]) => `${x(m.previous_pending_status === k)} ${label}`).join('    ');
    this.row([CW], [{ text: pend, bold: true, size: 9 }], { minH: 7 });
    this.y += 4;
  }

  private followupTable() {
    const rows = followupRows(this.data.meeting);
    const W = [86, 22, 22, 23, 27];
    const head: CellSpec[] = [
      { text: 'O Quê', bold: true, align: 'center', size: 8.5 },
      { text: 'Quem', bold: true, align: 'center', size: 8.5 },
      { text: 'Quando', bold: true, align: 'center', size: 8.5 },
      { text: 'Situação', bold: true, align: 'center', size: 8.5 },
      { text: 'Local de Arquivamento da Evidência', bold: true, align: 'center', size: 7 },
    ];
    const body: CellSpec[][] = (rows.length ? rows : [{ what: '', who: '', when: '', status: '', evidence_location: '' }, { what: '', who: '', when: '', status: '', evidence_location: '' }, { what: '', who: '', when: '', status: '', evidence_location: '' }])
      .map(r => [
        { text: r.what || '', size: 8, align: 'justify' },
        { text: r.who || '', size: 8, align: 'center' },
        { text: r.when || '', size: 8, align: 'center' },
        { text: r.status || '', size: 8, align: 'center', italic: true },
        { text: r.evidence_location || '', size: 8, align: 'center', italic: true },
      ]);
    this.table(W, head, body, 7);
    this.y += 4;
  }

  private report() {
    const m = this.data.meeting;
    const text = (m.minutes_report || '').trim() || markdownToPlain(m.generated_minutes_md || '');
    const LABEL_W = 16;
    const TXT_W = CW - LABEL_W;
    const spec: CellSpec = { text, font: 'times', size: 10.5, align: 'justify' };
    const lines = text ? this.wrap(text, TXT_W - PAD * 2 - 1, spec) : Array(12).fill('');
    const lh = this.lineH(10.5);
    const labelSegment = (top: number, h: number) => {
      this.doc.rect(MX, top, LABEL_W, h);
      this.doc.rect(MX + LABEL_W, top, TXT_W, h);
      this.setFont({ bold: true, size: 9 });
      const label = 'Relato da Reunião';
      const tw = this.doc.getTextWidth(label);
      if (h > tw + 4) this.doc.text(label, MX + LABEL_W / 2 + 1.2, top + h / 2 + tw / 2, { angle: 90 });
    };
    let i = 0;
    this.ensure(lh * 4 + PAD * 2);
    while (i < lines.length) {
      const avail = BODY_BOTTOM - this.y - PAD * 2;
      let n = Math.max(1, Math.floor(avail / lh));
      if (i + n < lines.length && n < 3) { this.newPage(); continue; }
      n = Math.min(n, lines.length - i);
      const chunk = lines.slice(i, i + n);
      // a última linha de um bloco que continua na página seguinte também é justificada
      const contNext = i + n < lines.length && lines[i + n] !== '';
      const h = chunk.length * lh + PAD * 2;
      labelSegment(this.y, h);
      this.drawLines(chunk, MX + LABEL_W + 0.5, this.y, TXT_W - 1, spec, undefined, contNext);
      this.y += h;
      i += n;
      if (i < lines.length) this.newPage();
    }
    this.y += 3;
  }

  private pendencies() {
    const m = this.data.meeting;
    const W = [118, 36, 26];
    this.ensure(6 + 7 + 7);
    this.setFont({ bold: true, size: 9 });
    this.doc.text('Pendências – (Resoluções / Comunicação de alterações e etc.)', MX + 1, this.y + 3.6);
    this.y += 5;
    const head: CellSpec[] = [
      { text: 'O Quê', bold: true, italic: true, align: 'center', size: 9 },
      { text: 'Quem', bold: true, italic: true, align: 'center', size: 9 },
      { text: 'Quando', bold: true, italic: true, align: 'center', size: 9 },
    ];
    const items = this.data.actionItems.filter(a => a.status !== 'cancelled');
    const body: CellSpec[][] = (items.length ? items : [null, null, null]).map(a => a ? [
      { text: a.title || '', size: 8, align: 'justify' },
      { text: a.responsible_name || '', size: 8 },
      { text: actionWhen(a), size: 8 },
    ] : [{ text: '' }, { text: '' }, { text: '' }]);
    this.table(W, head, body, 7);
    const next = [fmtDate(m.next_meeting_date), m.next_meeting_time, m.next_meeting_location].filter(Boolean).join(' — ');
    const agenda = m.next_meeting_agenda ? `\nPauta prevista: ${m.next_meeting_agenda}` : '';
    const nh = Math.max(7, this.cellHeight({ text: next + agenda, size: 8.5 }, CW - 32));
    this.ensure(nh);
    this.row([32, CW - 32], [{ text: 'Próxima Reunião', bold: true, size: 9 }, { text: next + agenda, size: 8.5 }], { minH: 7 });
    this.y += 5;
  }

  private signatures() {
    const all = this.data.participants.filter(p => (p.name || '').trim());
    const present = all.filter(p => p.present);
    const list = present.length ? present : all;
    const blanks = Math.max(2, 10 - list.length);
    this.ensure(5 + 8 + 8 * Math.min(list.length + blanks, 4));
    this.setFont({ size: 9 });
    const a = 'Assinar o nome completo – NÃO RUBRICAR: ';
    this.doc.text(a, MX - 1, this.y + 3.5);
    const aw = this.doc.getTextWidth(a);
    this.setFont({ bold: true, size: 7 });
    this.doc.text('Se maior que 07 participantes, utilizar a Lista de Presença e anexar', MX - 1 + aw, this.y + 3.5);
    this.y += 6;
    const W = [CW / 2, CW / 2];
    const head: CellSpec[] = [{ text: 'PARTICIPANTES', align: 'center', size: 9 }, { text: 'ASSINATURAS', align: 'center', size: 9 }];
    const body: CellSpec[][] = [
      ...list.map(p => [{ text: p.name, size: 10 }, { text: '' }] as CellSpec[]),
      ...Array.from({ length: blanks }, () => [{ text: '' }, { text: '' }] as CellSpec[]),
    ];
    this.table(W, head, body, 8);
  }

  private footers() {
    const d = this.doc;
    const total = d.getNumberOfPages();
    const issued = new Date().toLocaleDateString('pt-BR');
    const formCode = this.data.meeting.form_code || 'Formulário - Ata de Reuniões';
    for (let p = 1; p <= total; p++) {
      d.setPage(p);
      // esquerda: logo da unidade cadastrada e, abaixo, o código do formulário
      let lx = MX;
      for (const logo of (this.assets.footerLogos ?? []).slice(0, 3)) {
        const h = 6.5, w = Math.min(18, (logo.w / logo.h) * h);
        d.addImage(logo.dataUrl, logo.dataUrl.startsWith('data:image/jpeg') ? 'JPEG' : 'PNG', lx, FOOTER_TOP + 1.5, w, h);
        lx += w + 2;
      }
      d.setTextColor(...TEXT);
      this.setFont({ size: 6.5 });
      d.text(pdfSafe(formCode), MX, FOOTER_TOP + 11.5);
      // direita: unidade e endereço cadastrados
      const rx = PAGE_W - MX;
      d.text(pdfSafe(this.data.unitLine || this.data.hospitalName).toUpperCase(), rx, FOOTER_TOP + 8, { align: 'right' });
      if (this.data.unitDetail) d.text(pdfSafe(this.data.unitDetail), rx, FOOTER_TOP + 11.5, { align: 'right' });
      // emissão e paginação, discretas
      this.setFont({ size: 5.5 });
      d.setTextColor(110, 110, 110);
      d.text(`Gerado no IRASControl em ${issued}  ·  Página ${p} de ${total}`, PAGE_W / 2, FOOTER_TOP + 14.8, { align: 'center' });
      d.setTextColor(...TEXT);
    }
  }

  build(): jsPDF {
    this.drawHeader();
    this.identification();
    this.followupTable();
    this.report();
    this.pendencies();
    this.signatures();
    this.footers();
    return this.doc;
  }
}

export function buildAtaPdf(data: AtaPdfData, assets: AtaPdfAssets = {}): jsPDF {
  return new AtaPdf(data, assets).build();
}
