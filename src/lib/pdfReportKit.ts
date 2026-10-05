/**
 * Kit para relatórios PDF em texto (jsPDF) dos históricos: cabeçalho com logos,
 * título, tabelas com quebra de página, seções e rodapé paginado.
 * Usado pelos PDFs de seleção múltipla do Antibiograma e do Consumo de Higiene.
 */
import type jsPDF from "jspdf";
import { renderPdfLogos, type PdfLogo } from "@/lib/pdfLogoUtils";

export type Rgb = readonly [number, number, number];

export const PDF_COLOR = {
  text: [33, 37, 41] as Rgb,
  muted: [110, 117, 125] as Rgb,
  primary: [31, 111, 92] as Rgb,
  ok: [25, 135, 84] as Rgb,
  warn: [214, 140, 0] as Rgb,
  bad: [200, 35, 51] as Rgb,
  line: [210, 214, 218] as Rgb,
  badFill: [253, 236, 238] as Rgb,
  headFill: [232, 242, 238] as Rgb,
};

export interface ReportHeaderOptions {
  /** Texto curto repetido no topo de todas as páginas. */
  runningTitle: string;
  hospitalName?: string | null;
  logos?: { hospitalLogo: PdfLogo | null; scihLogos: PdfLogo[] };
}

export interface TableColumn {
  title: string;
  /** Largura relativa (as colunas são escaladas para a largura útil). */
  weight: number;
  align?: "left" | "right" | "center";
}

export interface TableCell {
  text: string;
  bold?: boolean;
  color?: Rgb;
}

export interface TableRow {
  cells: Array<string | TableCell>;
  fill?: Rgb;
}

const MARGIN = 14;
const LOGO_H = 14;

export class PdfReportWriter {
  readonly doc: jsPDF;
  readonly pageW: number;
  readonly pageH: number;
  readonly usableW: number;
  y = MARGIN;
  private readonly bottom: number;
  private readonly opts: ReportHeaderOptions;

  constructor(doc: jsPDF, opts: ReportHeaderOptions) {
    this.doc = doc;
    this.opts = opts;
    this.pageW = doc.internal.pageSize.getWidth();
    this.pageH = doc.internal.pageSize.getHeight();
    this.usableW = this.pageW - MARGIN * 2;
    this.bottom = this.pageH - MARGIN - 6;
    this.pageHeader();
  }

  get margin() { return MARGIN; }

  font(size: number, style: "normal" | "bold" | "italic" = "normal", color: Rgb = PDF_COLOR.text) {
    this.doc.setFont("helvetica", style);
    this.doc.setFontSize(size);
    this.doc.setTextColor(color[0], color[1], color[2]);
  }

  lineH(size: number) { return size * 0.42; }

  private pageHeader() {
    this.y = MARGIN;
    const logos = this.opts.logos ?? { hospitalLogo: null, scihLogos: [] };
    if (logos.hospitalLogo || logos.scihLogos.length > 0) {
      renderPdfLogos(this.doc, logos, { x: MARGIN, y: this.y, h: LOGO_H, pageW: this.pageW });
      this.y += LOGO_H + 3;
    }
    this.font(8, "normal", PDF_COLOR.muted);
    this.doc.text(
      `${this.opts.runningTitle}${this.opts.hospitalName ? ` · ${this.opts.hospitalName}` : ""}`,
      MARGIN, this.y + 3,
    );
    this.doc.setDrawColor(...PDF_COLOR.line);
    this.doc.line(MARGIN, this.y + 5, this.pageW - MARGIN, this.y + 5);
    this.y += 10;
  }

  newPage() {
    this.doc.addPage();
    this.pageHeader();
  }

  /** Quebra a página se não houver `h` mm livres. */
  ensure(h: number) {
    if (this.y + h > this.bottom) this.newPage();
  }

  title(text: string, size = 16) {
    this.font(size, "bold");
    this.ensure(this.lineH(size) + 4);
    this.doc.text(text, MARGIN, this.y + this.lineH(size) + 1);
    this.y += this.lineH(size) + 4;
  }

  paragraph(text: string, size = 9, style: "normal" | "bold" | "italic" = "normal", color: Rgb = PDF_COLOR.text) {
    this.font(size, style, color);
    const lines: string[] = this.doc.splitTextToSize(text, this.usableW);
    for (const ln of lines) {
      this.ensure(this.lineH(size) + 0.6);
      this.doc.text(ln, MARGIN, this.y + this.lineH(size));
      this.y += this.lineH(size) + 0.6;
    }
  }

  /** Pares "rótulo: valor" em linhas de até `perRow` itens. */
  keyValues(pairs: Array<[string, string]>, perRow = 3) {
    const colW = this.usableW / perRow;
    for (let i = 0; i < pairs.length; i += perRow) {
      this.ensure(6);
      pairs.slice(i, i + perRow).forEach(([k, v], j) => {
        const x = MARGIN + j * colW;
        this.font(9, "bold");
        const label = `${k}:`;
        this.doc.text(label, x, this.y + 4);
        // largura medida na fonte em negrito, antes de trocar para a normal
        const labelW = this.doc.getTextWidth(label) + 1.5;
        this.font(9);
        const value = this.doc.splitTextToSize(v || "—", colW - labelW - 2)[0] ?? "";
        this.doc.text(value, x + labelW, this.y + 4);
      });
      this.y += 5.5;
    }
  }

  space(mm: number) { this.y += mm; }

  /** Tabela com cabeçalho repetido a cada página e linhas com quebra de texto. */
  table(columns: TableColumn[], rows: TableRow[], size = 8) {
    const total = columns.reduce((s, c) => s + c.weight, 0);
    const widths = columns.map(c => (c.weight / total) * this.usableW);
    const pad = 1.5;
    const head = () => {
      // Títulos podem quebrar em mais de uma linha (ex.: "Sabonete (mL)")
      this.font(size, "bold");
      const titles = columns.map((c, i) => this.doc.splitTextToSize(c.title, widths[i] - pad * 2) as string[]);
      const nLines = Math.max(1, ...titles.map(t => t.length));
      const h = nLines * (this.lineH(size) + 0.6) + 3;
      this.doc.setFillColor(...PDF_COLOR.headFill);
      this.doc.rect(MARGIN, this.y, this.usableW, h, "F");
      let x = MARGIN;
      columns.forEach((c, i) => {
        titles[i].forEach((ln, k) => {
          this.textAligned(ln, x, widths[i], this.y + 1.5 + this.lineH(size) + k * (this.lineH(size) + 0.6), c.align);
        });
        x += widths[i];
      });
      this.y += h;
    };
    this.ensure(14);
    head();
    for (const row of rows) {
      const cells = row.cells.map(c => (typeof c === "string" ? { text: c } : c));
      const wrapped = cells.map((c, i) => {
        this.font(size, c.bold ? "bold" : "normal");
        return this.doc.splitTextToSize(c.text || "—", widths[i] - pad * 2) as string[];
      });
      const lines = Math.max(1, ...wrapped.map(w => w.length));
      const h = lines * (this.lineH(size) + 0.6) + 2.4;
      if (this.y + h > this.bottom) { this.newPage(); head(); }
      if (row.fill) {
        this.doc.setFillColor(...row.fill);
        this.doc.rect(MARGIN, this.y, this.usableW, h, "F");
      }
      let x = MARGIN;
      cells.forEach((c, i) => {
        this.font(size, c.bold ? "bold" : "normal", c.color ?? PDF_COLOR.text);
        wrapped[i].forEach((ln, k) => {
          this.textAligned(ln, x, widths[i], this.y + 1.2 + this.lineH(size) + k * (this.lineH(size) + 0.6), columns[i].align);
        });
        x += widths[i];
      });
      this.doc.setDrawColor(...PDF_COLOR.line);
      this.doc.line(MARGIN, this.y + h, this.pageW - MARGIN, this.y + h);
      this.y += h;
    }
  }

  private textAligned(text: string, x: number, w: number, y: number, align: TableColumn["align"] = "left") {
    if (align === "right") this.doc.text(text, x + w - 1.5, y, { align: "right" });
    else if (align === "center") this.doc.text(text, x + w / 2, y, { align: "center" });
    else this.doc.text(text, x + 1.5, y);
  }

  /** Rodapé "Página X de Y" em todas as páginas. Chamar ao final. */
  finish() {
    const total = this.doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);
      this.font(7, "normal", PDF_COLOR.muted);
      this.doc.text(`Página ${p} de ${total}`, this.pageW - MARGIN, this.pageH - 7, { align: "right" });
      this.doc.text("IRASControl", MARGIN, this.pageH - 7);
    }
    return this.doc;
  }
}

export function formatDateBR(iso: string | null | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || "");
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso || "—";
}

export function generatedAtText(d: Date) {
  return `Gerado em ${d.toLocaleDateString("pt-BR")} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

export function todayStamp(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
