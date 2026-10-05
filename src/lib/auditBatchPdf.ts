/**
 * PDF único com várias auditorias (seleção múltipla no Histórico de Auditorias).
 *
 * Gera o documento em texto (jsPDF), sem captura de tela: cada auditoria começa em
 * uma página nova, com cabeçalho, itens agrupados por categoria (não conformidades
 * em destaque), observações e fotos. A primeira página traz o resumo da seleção.
 */
import type jsPDF from "jspdf";
import { renderPdfLogos, type PdfLogo } from "@/lib/pdfLogoUtils";

export interface BatchAuditItem {
  question: string;
  status: string;
  category: string | null;
  observation: string | null;
  item_order: number;
}

export interface BatchAuditPhoto {
  dataUrl: string;
  caption?: string | null;
}

export interface BatchAudit {
  audit_date: string;
  sector: string | null;
  compliance_rate: number | null;
  compliant_items: number;
  total_items: number;
  observations: string | null;
  items: BatchAuditItem[];
  photos: BatchAuditPhoto[];
}

export interface BatchPdfOptions {
  typeLabel: string;
  hospitalName?: string | null;
  logos?: { hospitalLogo: PdfLogo | null; scihLogos: PdfLogo[] };
  generatedAt?: Date;
}

const STATUS_LABEL: Record<string, string> = {
  compliant: "C",
  non_compliant: "NC",
  not_applicable: "NA",
  not_evaluated: "N/Av",
};

const COLOR = {
  text: [33, 37, 41] as const,
  muted: [110, 117, 125] as const,
  primary: [31, 111, 92] as const,
  ok: [25, 135, 84] as const,
  warn: [214, 140, 0] as const,
  bad: [200, 35, 51] as const,
  line: [210, 214, 218] as const,
  ncFill: [253, 236, 238] as const,
  headFill: [232, 242, 238] as const,
};

const MARGIN = 14;
const LOGO_H = 14;

export function formatDateBR(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || "—";
}

export function rateColor(rate: number | null) {
  const r = rate ?? 0;
  return r >= 80 ? COLOR.ok : r >= 50 ? COLOR.warn : COLOR.bad;
}

function countStatus(items: BatchAuditItem[], status: string) {
  return items.filter(i => i.status === status).length;
}

/** Ordena as auditorias em ordem cronológica (e por setor no mesmo dia). */
export function sortAuditsForReport<T extends { audit_date: string; sector: string | null }>(audits: T[]): T[] {
  return [...audits].sort((a, b) =>
    a.audit_date.localeCompare(b.audit_date) || (a.sector || "").localeCompare(b.sector || "", "pt-BR"));
}

export function buildAuditsBatchPdf(doc: jsPDF, audits: BatchAudit[], opts: BatchPdfOptions): jsPDF {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const usableW = pageW - MARGIN * 2;
  const bottom = pageH - MARGIN - 6; // reserva espaço para o rodapé
  const logos = opts.logos ?? { hospitalLogo: null, scihLogos: [] };
  const hasLogos = !!logos.hospitalLogo || logos.scihLogos.length > 0;
  const generatedAt = opts.generatedAt ?? new Date();
  let y = MARGIN;

  const setColor = (c: readonly number[]) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (size: number, style: "normal" | "bold" | "italic" = "normal", color: readonly number[] = COLOR.text) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    setColor(color);
  };
  const lineH = (size: number) => size * 0.42;

  /** Cabeçalho de página: logos + título do documento. */
  const pageHeader = () => {
    y = MARGIN;
    if (hasLogos) {
      renderPdfLogos(doc, logos, { x: MARGIN, y, h: LOGO_H, pageW });
      y += LOGO_H + 3;
    }
    font(8, "normal", COLOR.muted);
    doc.text(`Auditorias — ${opts.typeLabel}${opts.hospitalName ? ` · ${opts.hospitalName}` : ""}`, MARGIN, y + 3);
    doc.setDrawColor(COLOR.line[0], COLOR.line[1], COLOR.line[2]);
    doc.line(MARGIN, y + 5, pageW - MARGIN, y + 5);
    y += 10;
  };

  const newPage = () => {
    doc.addPage();
    pageHeader();
  };

  /** Garante espaço vertical; quebra a página se necessário. */
  const ensure = (h: number) => {
    if (y + h > bottom) newPage();
  };

  /** Texto com quebra automática de linha e de página. */
  const paragraph = (text: string, x: number, width: number, size: number, style: "normal" | "bold" | "italic" = "normal", color: readonly number[] = COLOR.text) => {
    font(size, style, color);
    const lines: string[] = doc.splitTextToSize(text, width);
    for (const ln of lines) {
      ensure(lineH(size) + 0.6);
      doc.text(ln, x, y + lineH(size));
      y += lineH(size) + 0.6;
    }
  };

  // ---------------- Página 1: resumo da seleção ----------------
  pageHeader();
  font(16, "bold");
  doc.text(`Relatório de Auditorias — ${opts.typeLabel}`, MARGIN, y + 6);
  y += 11;
  const dates = audits.map(a => a.audit_date).filter(Boolean).sort();
  font(9, "normal", COLOR.muted);
  const periodo = dates.length ? `${formatDateBR(dates[0])} a ${formatDateBR(dates[dates.length - 1])}` : "—";
  doc.text(
    `${audits.length} auditoria(s) selecionada(s) · Período: ${periodo} · Gerado em ${generatedAt.toLocaleDateString("pt-BR")} às ${generatedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
    MARGIN, y + 3,
  );
  y += 9;

  const totalC = audits.reduce((s, a) => s + countStatus(a.items, "compliant"), 0);
  const totalNC = audits.reduce((s, a) => s + countStatus(a.items, "non_compliant"), 0);
  const avg = audits.length ? audits.reduce((s, a) => s + (a.compliance_rate ?? 0), 0) / audits.length : 0;
  font(10, "bold");
  doc.text(`Conformidade média: `, MARGIN, y + 4);
  font(10, "bold", rateColor(avg));
  doc.text(`${avg.toFixed(1)}%`, MARGIN + doc.getTextWidth("Conformidade média: ") + 1, y + 4);
  font(10, "normal");
  doc.text(`Itens conformes: ${totalC} · Não conformes: ${totalNC}`, MARGIN + 75, y + 4);
  y += 10;

  // Tabela-resumo
  const cols = [
    { title: "#", w: 8 },
    { title: "Data", w: 22 },
    { title: "Setor", w: 70 },
    { title: "Conformidade", w: 26 },
    { title: "C", w: 14 },
    { title: "NC", w: 14 },
    { title: "NA", w: usableW - 8 - 22 - 70 - 26 - 14 - 14 },
  ];
  const rowH = 6;
  const tableHeader = () => {
    doc.setFillColor(COLOR.headFill[0], COLOR.headFill[1], COLOR.headFill[2]);
    doc.rect(MARGIN, y, usableW, rowH, "F");
    font(8, "bold");
    let x = MARGIN;
    for (const c of cols) { doc.text(c.title, x + 1.5, y + 4.2); x += c.w; }
    y += rowH;
  };
  tableHeader();
  audits.forEach((a, i) => {
    if (y + rowH > bottom) { newPage(); tableHeader(); }
    const cells = [
      String(i + 1),
      formatDateBR(a.audit_date),
      a.sector || "—",
      a.compliance_rate != null ? `${a.compliance_rate.toFixed(1)}%` : "—",
      String(countStatus(a.items, "compliant")),
      String(countStatus(a.items, "non_compliant")),
      String(countStatus(a.items, "not_applicable")),
    ];
    let x = MARGIN;
    cells.forEach((v, ci) => {
      font(8, ci === 3 ? "bold" : "normal", ci === 3 ? rateColor(a.compliance_rate) : COLOR.text);
      const txt = doc.splitTextToSize(v, cols[ci].w - 3)[0] ?? "";
      doc.text(txt, x + 1.5, y + 4.2);
      x += cols[ci].w;
    });
    doc.setDrawColor(COLOR.line[0], COLOR.line[1], COLOR.line[2]);
    doc.line(MARGIN, y + rowH, pageW - MARGIN, y + rowH);
    y += rowH;
  });
  y += 4;
  font(7, "italic", COLOR.muted);
  doc.text("C = conforme · NC = não conforme · NA = não se aplica. Cada auditoria é detalhada nas páginas seguintes.", MARGIN, y + 3);

  // ---------------- Uma seção por auditoria ----------------
  audits.forEach((a, idx) => {
    newPage();
    font(13, "bold");
    doc.text(`Auditoria ${idx + 1} de ${audits.length}`, MARGIN, y + 5);
    y += 8;
    font(10, "normal");
    doc.text(`Data: ${formatDateBR(a.audit_date)}`, MARGIN, y + 4);
    doc.text(`Setor: ${a.sector || "—"}`, MARGIN + 45, y + 4);
    y += 6;
    font(10, "bold");
    doc.text("Conformidade: ", MARGIN, y + 4);
    font(10, "bold", rateColor(a.compliance_rate));
    doc.text(a.compliance_rate != null ? `${a.compliance_rate.toFixed(1)}%` : "—", MARGIN + doc.getTextWidth("Conformidade: ") + 1, y + 4);
    font(10, "normal");
    doc.text(
      `(${a.compliant_items}/${a.total_items} itens conformes · ${countStatus(a.items, "non_compliant")} não conforme(s))`,
      MARGIN + 45, y + 4,
    );
    y += 9;

    if (a.observations?.trim()) {
      paragraph("Observações gerais", MARGIN, usableW, 10, "bold");
      paragraph(a.observations.trim(), MARGIN, usableW, 9);
      y += 3;
    }

    // Itens agrupados por categoria, na ordem original
    const items = [...a.items].sort((p, q) => p.item_order - q.item_order);
    let lastCat: string | null | undefined;
    const statusW = 10;
    for (const it of items) {
      const cat = it.category?.trim() || null;
      if (cat !== lastCat && cat) {
        ensure(9);
        y += 2;
        font(9.5, "bold", COLOR.primary);
        doc.text(cat, MARGIN, y + 4);
        y += 6;
      }
      lastCat = cat;

      const qLines: string[] = (() => { font(8.5); return doc.splitTextToSize(it.question, usableW - statusW - 2); })();
      const obsLines: string[] = it.observation?.trim()
        ? (() => { font(7.5, "italic"); return doc.splitTextToSize(`Obs.: ${it.observation.trim()}`, usableW - statusW - 2); })()
        : [];
      const h = qLines.length * (lineH(8.5) + 0.6) + obsLines.length * (lineH(7.5) + 0.6) + 2;
      ensure(h);
      const isNC = it.status === "non_compliant";
      if (isNC) {
        doc.setFillColor(COLOR.ncFill[0], COLOR.ncFill[1], COLOR.ncFill[2]);
        doc.rect(MARGIN - 1, y, usableW + 2, h, "F");
      }
      const st = STATUS_LABEL[it.status] ?? it.status;
      const stColor = it.status === "compliant" ? COLOR.ok : isNC ? COLOR.bad : COLOR.muted;
      font(8, "bold", stColor);
      doc.text(st, MARGIN, y + lineH(8.5) + 0.5);
      let ty = y + 0.5;
      font(8.5, isNC ? "bold" : "normal");
      for (const ln of qLines) { doc.text(ln, MARGIN + statusW, ty + lineH(8.5)); ty += lineH(8.5) + 0.6; }
      font(7.5, "italic", COLOR.muted);
      for (const ln of obsLines) { doc.text(ln, MARGIN + statusW, ty + lineH(7.5)); ty += lineH(7.5) + 0.6; }
      y += h;
    }

    // Fotos
    if (a.photos.length > 0) {
      ensure(20);
      y += 4;
      font(10, "bold");
      doc.text(`Fotos (${a.photos.length})`, MARGIN, y + 4);
      y += 7;
      const maxImgH = 95;
      a.photos.forEach((ph, i) => {
        try {
          const props = doc.getImageProperties(ph.dataUrl);
          let w = usableW;
          let h = w * (props.height / props.width);
          if (h > maxImgH) { h = maxImgH; w = h * (props.width / props.height); }
          ensure(h + 7);
          doc.addImage(ph.dataUrl, (props.fileType || "JPEG").toUpperCase(), MARGIN, y, w, h);
          font(8, "normal", COLOR.muted);
          const cap = ph.caption?.trim();
          doc.text(cap ? `Foto ${i + 1} — ${cap}` : `Foto ${i + 1}`, MARGIN, y + h + 4);
          y += h + 8;
        } catch {
          // foto que não pôde ser lida é ignorada
        }
      });
    }
  });

  // Rodapé com paginação
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    font(7, "normal", COLOR.muted);
    doc.text(`Página ${p} de ${total}`, pageW - MARGIN, pageH - 7, { align: "right" });
    doc.text("IRASControl", MARGIN, pageH - 7);
  }
  return doc;
}
