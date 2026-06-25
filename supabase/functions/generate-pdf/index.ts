import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Minimal raw-PDF builder with multi-page, tables, colours & images ───

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 40;
const USABLE_W = PAGE_W - 2 * MARGIN;
const LINE_H = 14;
const FONT_SIZE = 9;
const HEADER_FONT = 11;
const TITLE_FONT = 16;

type RGB = [number, number, number];
const BLACK: RGB = [0, 0, 0];
const WHITE: RGB = [1, 1, 1];
const TEAL: RGB = [0.086, 0.627, 0.522];
const LIGHT_GRAY: RGB = [0.95, 0.95, 0.95];
const GRAY: RGB = [0.4, 0.4, 0.4];
const RED: RGB = [0.84, 0.18, 0.18];
const ORANGE: RGB = [0.9, 0.6, 0.1];

function sanitize(s: string): string {
  return (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, (c) => {
      const map: Record<string, string> = {};
      const pairs = "á:a,à:a,â:a,ã:a,é:e,ê:e,í:i,ó:o,ô:o,õ:o,ú:u,ü:u,ç:c,Á:A,À:A,Â:A,Ã:A,É:E,Ê:E,Í:I,Ó:O,Ô:O,Õ:O,Ú:U,Ü:U,Ç:C";
      pairs.split(",").forEach(p => { const [k, v] = p.split(":"); map[k] = v; });
      ["–", "—"].forEach(c => map[c] = "-");
      ["‘", "’"].forEach(c => map[c] = "'");
      ["“", "”"].forEach(c => map[c] = '"');
      return map[c] || "?";
    });
}

// Parse JPEG dimensions from SOF marker
function getJpegDimensions(data: Uint8Array): { w: number; h: number } | null {
  let i = 2; // skip SOI 0xFF 0xD8
  while (i < data.length - 8) {
    if (data[i] !== 0xFF) break;
    const marker = data[i + 1];
    i += 2;
    if (marker === 0xD9 || marker === 0xDA) break;
    const segLen = (data[i] << 8) | data[i + 1];
    if (
      (marker >= 0xC0 && marker <= 0xC3) ||
      (marker >= 0xC5 && marker <= 0xC7) ||
      (marker >= 0xC9 && marker <= 0xCB) ||
      (marker >= 0xCD && marker <= 0xCF)
    ) {
      const h = (data[i + 3] << 8) | data[i + 4];
      const w = (data[i + 5] << 8) | data[i + 6];
      return { w, h };
    }
    i += segLen;
  }
  return null;
}

interface LogoImage {
  data: Uint8Array;
  w: number;
  h: number;
  isJpeg: boolean;
}

class PdfBuilder {
  private objects: string[] = [];
  private objectBytes: Map<number, Uint8Array> = new Map();
  private pages: { contentObjIdx: number; imageRefs: string }[] = [];
  private currentStream = "";
  private curY = PAGE_H - MARGIN;
  private fontObjNum = 0;
  private fontBoldObjNum = 0;
  private imageObjects: { objNum: number; name: string; w: number; h: number }[] = [];
  private date: string;
  private hospitalName: string;
  private reportTitle: string;
  private headerH = 28;
  private hospitalLogo?: LogoImage;
  private scihLogos: LogoImage[] = [];

  constructor(hospitalName: string, reportTitle: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []) {
    this.hospitalName = sanitize(hospitalName);
    this.reportTitle = sanitize(reportTitle);
    this.date = new Date().toLocaleDateString("pt-BR");
    this.hospitalLogo = hospitalLogo;
    this.scihLogos = scihLogos;
    // Taller header when we have logos
    if (hospitalLogo || scihLogos.length > 0) this.headerH = 52;
    this.startPage();
  }

  private addObj(content: string, rawBytes?: Uint8Array): number {
    this.objects.push(content);
    const idx = this.objects.length;
    if (rawBytes) this.objectBytes.set(idx, rawBytes);
    return idx;
  }

  private setColor(rgb: RGB) {
    this.currentStream += `${rgb[0]} ${rgb[1]} ${rgb[2]} rg\n`;
  }
  private setStrokeColor(rgb: RGB) {
    this.currentStream += `${rgb[0]} ${rgb[1]} ${rgb[2]} RG\n`;
  }

  private drawRect(x: number, y: number, w: number, h: number, fill: RGB | null, stroke: RGB | null) {
    if (fill) {
      this.setColor(fill);
      this.currentStream += `${x} ${y} ${w} ${h} re f\n`;
    }
    if (stroke) {
      this.setStrokeColor(stroke);
      this.currentStream += `0.5 w\n${x} ${y} ${w} ${h} re S\n`;
    }
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number, color: RGB = TEAL) {
    this.setStrokeColor(color);
    this.currentStream += `1 w\n${x1} ${y1} m ${x2} ${y2} l S\n`;
  }

  private drawText(text: string, x: number, y: number, size: number, color: RGB = BLACK, bold = false) {
    const fontRef = bold ? "/F2" : "/F1";
    this.setColor(color);
    this.currentStream += `BT\n${fontRef} ${size} Tf\n${x} ${y} Td\n(${sanitize(text)}) Tj\nET\n`;
  }

  private drawImage(imgName: string, x: number, y: number, w: number, h: number) {
    this.currentStream += `q\n${w} 0 0 ${h} ${x} ${y} cm\n/${imgName} Do\nQ\n`;
  }

  private checkPageBreak(needed: number) {
    if (this.curY - needed < MARGIN + 30) {
      this.finishPage();
      this.startPage();
    }
  }

  private addImageObject(imgData: Uint8Array, isJpeg: boolean, w: number, h: number): { objNum: number; name: string } {
    const name = `Img${this.imageObjects.length + 1}`;
    const colorSpace = "/DeviceRGB";
    const filter = isJpeg ? "/DCTDecode" : "/FlateDecode";
    // For simplicity, only support JPEG inline; PNG we skip
    const header = `<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace ${colorSpace} /BitsPerComponent 8 /Filter ${filter} /Length ${imgData.length} >>`;
    const objNum = this.addObj(header, imgData);
    this.imageObjects.push({ objNum, name, w, h });
    return { objNum, name };
  }

  private startPage() {
    this.currentStream = "";
    this.curY = PAGE_H - MARGIN;
    this.drawHeader();
  }

  private drawHeader() {
    const barH = this.headerH;
    // Teal bar
    this.drawRect(0, PAGE_H - barH, PAGE_W, barH, TEAL, null);

    if (this.hospitalLogo || this.scihLogos.length > 0) {
      // Logo area: hospital logo left, SCIH logos right, in a white sub-band
      const logoBandH = barH - 8;
      const logoBandY = PAGE_H - barH + 4;

      // Draw hospital logo
      if (this.hospitalLogo) {
        const maxLogoH = logoBandH - 4;
        const maxLogoW = 120;
        const ratio = this.hospitalLogo.w / this.hospitalLogo.h;
        const logoH = Math.min(maxLogoH, maxLogoW / ratio);
        const logoW = logoH * ratio;
        const logoX = MARGIN;
        const logoY = logoBandY + (logoBandH - logoH) / 2;
        const { name } = this.addImageObject(this.hospitalLogo.data, this.hospitalLogo.isJpeg, this.hospitalLogo.w, this.hospitalLogo.h);
        this.drawImage(name, logoX, logoY, logoW, logoH);
      } else {
        this.drawText("IRASControl", MARGIN, PAGE_H - 20, 12, WHITE, true);
      }

      // Draw SCIH logos (right side)
      let scihX = PAGE_W - MARGIN;
      for (const logo of this.scihLogos.slice(0, 3).reverse()) {
        const maxLogoH = logoBandH - 4;
        const maxLogoW = 70;
        const ratio = logo.w / logo.h;
        const logoH = Math.min(maxLogoH, maxLogoW / ratio);
        const logoW = logoH * ratio;
        scihX -= logoW + 4;
        const logoY = PAGE_H - barH + 4 + (logoBandH - logoH) / 2;
        const { name } = this.addImageObject(logo.data, logo.isJpeg, logo.w, logo.h);
        this.drawImage(name, scihX, logoY, logoW, logoH);
      }
    } else {
      this.drawText("IRASControl", MARGIN, PAGE_H - 20, 12, WHITE, true);
      this.drawText(this.hospitalName, PAGE_W - MARGIN - this.hospitalName.length * 5, PAGE_H - 20, 9, WHITE);
    }

    // Report title
    this.curY = PAGE_H - this.headerH - 27;
    this.drawText(this.reportTitle, MARGIN, this.curY, TITLE_FONT, TEAL, true);
    this.curY -= 16;
    this.drawText("Gerado em " + this.date, MARGIN, this.curY, 8, GRAY);
    this.drawLine(MARGIN, this.curY - 6, PAGE_W - MARGIN, this.curY - 6, TEAL);
    this.curY -= 22;
  }

  private drawFooter() {
    const pageNum = this.pages.length + 1;
    this.drawText(`Pagina ${pageNum}`, PAGE_W / 2 - 20, 20, 8, GRAY);
    this.drawLine(MARGIN, 35, PAGE_W - MARGIN, 35, LIGHT_GRAY as RGB);
  }

  private finishPage() {
    this.drawFooter();
    const pageStream = this.currentStream;
    const streamBytes = new TextEncoder().encode(pageStream);
    const streamObjNum = this.addObj(
      `<< /Length ${streamBytes.length} >>\nstream\n${pageStream}\nendstream`
    );

    // Collect image refs for this page (all images registered so far)
    const imgRefs = this.imageObjects
      .map(img => `/${img.name} ${img.objNum} 0 R`)
      .join(" ");

    this.pages.push({ contentObjIdx: streamObjNum, imageRefs: imgRefs });
  }

  // ─── Public API ───

  addTitle(text: string) {
    this.checkPageBreak(30);
    this.curY -= 8;
    this.drawText(text, MARGIN, this.curY, 13, TEAL, true);
    this.curY -= 20;
  }

  addSubtitle(text: string) {
    this.checkPageBreak(24);
    this.curY -= 4;
    this.drawText(text, MARGIN, this.curY, HEADER_FONT, BLACK, true);
    this.curY -= 16;
  }

  addText(text: string, color: RGB = BLACK) {
    this.checkPageBreak(LINE_H);
    this.drawText(text, MARGIN, this.curY, FONT_SIZE, color);
    this.curY -= LINE_H;
  }

  addSpacer(h = 10) {
    this.curY -= h;
  }

  addKPIRow(kpis: { label: string; value: string }[]) {
    this.checkPageBreak(50);
    const boxW = USABLE_W / kpis.length;
    const boxH = 40;
    const y = this.curY - boxH;

    kpis.forEach((kpi, i) => {
      const x = MARGIN + i * boxW;
      this.drawRect(x + 2, y, boxW - 4, boxH, LIGHT_GRAY, null);
      this.drawText(kpi.value, x + 8, y + 22, 14, TEAL, true);
      this.drawText(kpi.label, x + 8, y + 8, 7, GRAY);
    });

    this.curY = y - 8;
  }

  addTable(headers: string[], rows: string[][], colWidths?: number[]) {
    const cols = headers.length;
    const widths = colWidths || headers.map(() => USABLE_W / cols);
    const rowH = 16;

    this.checkPageBreak(rowH * 2);
    let x = MARGIN;
    this.drawRect(MARGIN, this.curY - rowH, USABLE_W, rowH, TEAL, null);
    headers.forEach((h, i) => {
      this.drawText(h, x + 4, this.curY - rowH + 4, 8, WHITE, true);
      x += widths[i];
    });
    this.curY -= rowH;

    rows.forEach((row, ri) => {
      this.checkPageBreak(rowH);
      const bg = ri % 2 === 0 ? null : LIGHT_GRAY;
      if (bg) this.drawRect(MARGIN, this.curY - rowH, USABLE_W, rowH, bg, null);

      this.setStrokeColor([0.85, 0.85, 0.85]);
      this.currentStream += `0.3 w\n${MARGIN} ${this.curY - rowH} m ${MARGIN + USABLE_W} ${this.curY - rowH} l S\n`;

      x = MARGIN;
      row.forEach((cell, ci) => {
        const maxChars = Math.floor(widths[ci] / 4.5);
        const truncated = cell.length > maxChars ? cell.substring(0, maxChars - 2) + ".." : cell;
        this.drawText(truncated, x + 4, this.curY - rowH + 4, 8, BLACK);
        x += widths[ci];
      });
      this.curY -= rowH;
    });

    this.curY -= 6;
  }

  build(): Uint8Array {
    this.finishPage();

    this.fontObjNum = this.addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    this.fontBoldObjNum = this.addObj("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    const pageObjNums: number[] = [];
    for (const _ of this.pages) {
      const pageObjNum = this.addObj("PAGE_PLACEHOLDER");
      pageObjNums.push(pageObjNum);
    }

    const pagesObjNum = this.addObj(
      `<< /Type /Pages /Kids [${pageObjNums.map((n) => `${n} 0 R`).join(" ")}] /Count ${this.pages.length} >>`
    );

    this.pages.forEach((page, i) => {
      const imgDict = page.imageRefs ? ` /XObject << ${page.imageRefs} >>` : "";
      this.objects[pageObjNums[i] - 1] =
        `<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Contents ${page.contentObjIdx} 0 R ` +
        `/Resources << /Font << /F1 ${this.fontObjNum} 0 R /F2 ${this.fontBoldObjNum} 0 R >>${imgDict} >> >>`;
    });

    const catalogObjNum = this.addObj(`<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>`);

    // Assemble PDF with binary image objects
    const encoder = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [0];

    const push = (s: string) => {
      const b = encoder.encode(s);
      chunks.push(b);
    };

    let byteOffset = 0;
    const addChunk = (b: Uint8Array) => { chunks.push(b); byteOffset += b.length; };
    const addStr = (s: string) => { const b = encoder.encode(s); addChunk(b); };

    addStr("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    for (let i = 0; i < this.objects.length; i++) {
      const objNum = i + 1;
      offsets.push(byteOffset);

      const rawBytes = this.objectBytes.get(objNum);
      if (rawBytes) {
        // Binary stream object (image)
        const header = encoder.encode(`${objNum} 0 obj\n${this.objects[i]}\nstream\n`);
        const footer = encoder.encode(`\nendstream\nendobj\n`);
        addChunk(header);
        addChunk(rawBytes);
        addChunk(footer);
      } else {
        addStr(`${objNum} 0 obj\n${this.objects[i]}\nendobj\n`);
      }
    }

    const xrefOffset = byteOffset;
    const totalObjs = this.objects.length + 1;
    let xref = "xref\n";
    xref += `0 ${totalObjs}\n`;
    xref += "0000000000 65535 f \n";
    for (let i = 1; i < totalObjs; i++) {
      xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    }
    xref += "trailer\n";
    xref += `<< /Size ${totalObjs} /Root ${catalogObjNum} 0 R >>\n`;
    xref += "startxref\n";
    xref += `${xrefOffset}\n`;
    xref += "%%EOF";
    addStr(xref);

    // Combine all chunks
    const total = chunks.reduce((s, c) => s + c.length, 0);
    const result = new Uint8Array(total);
    let pos = 0;
    for (const chunk of chunks) { result.set(chunk, pos); pos += chunk.length; }
    return result;
  }

  toBase64(): string {
    const bytes = this.build();
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

// ─── Logo fetching ───

async function fetchLogos(adminClient: ReturnType<typeof createClient>, hospitalId: string): Promise<{
  hospitalLogo?: LogoImage;
  scihLogos: LogoImage[];
}> {
  const { data: logoRecords } = await adminClient
    .from("hospital_logos")
    .select("logo_type, storage_path, display_order")
    .eq("hospital_id", hospitalId)
    .order("display_order");

  if (!logoRecords || logoRecords.length === 0) return { scihLogos: [] };

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const bucketBase = `${supabaseUrl}/storage/v1/object/public/hospital-logos/`;

  const loadImage = async (path: string): Promise<LogoImage | null> => {
    try {
      const res = await fetch(bucketBase + path, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const buf = await res.arrayBuffer();
      const data = new Uint8Array(buf);
      // Detect JPEG by magic bytes
      const isJpeg = data[0] === 0xFF && data[1] === 0xD8;
      if (!isJpeg) return null; // only embed JPEG in raw PDF
      const dims = getJpegDimensions(data);
      if (!dims) return null;
      return { data, w: dims.w, h: dims.h, isJpeg: true };
    } catch {
      return null;
    }
  };

  const hospitalRecord = logoRecords.find((r: any) => r.logo_type === "hospital");
  const scihRecords = logoRecords.filter((r: any) => r.logo_type === "scih");

  const [hospitalLogo, ...scihLogoResults] = await Promise.all([
    hospitalRecord ? loadImage(hospitalRecord.storage_path) : Promise.resolve(null),
    ...scihRecords.map((r: any) => loadImage(r.storage_path)),
  ]);

  return {
    hospitalLogo: hospitalLogo ?? undefined,
    scihLogos: scihLogoResults.filter((l): l is LogoImage => l !== null),
  };
}

// ─── Report generators ───

function buildDashboardPdf(data: any, hospital: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []): string {
  const pdf = new PdfBuilder(hospital, "Relatorio do Dashboard", hospitalLogo, scihLogos);

  pdf.addKPIRow([
    { label: "Pacientes Monitorados", value: String(data.totalPatients || 0) },
    { label: "Casos Suspeitos", value: String(data.suspectCases || 0) },
    { label: "IRAS Confirmadas", value: String(data.confirmedCases || 0) },
    { label: "Conformidade", value: `${data.complianceRate || 0}%` },
  ]);

  if (data.activeAlerts) {
    pdf.addText(`Alertas Ativos: ${data.activeAlerts}`);
    pdf.addSpacer();
  }

  if (data.irasBySector?.length > 0) {
    pdf.addSubtitle("IRAS por Setor");
    pdf.addTable(
      ["Setor", "Taxa (%)"],
      data.irasBySector.map((s: any) => [s.setor || "", String(s.taxa || 0)]),
      [USABLE_W * 0.65, USABLE_W * 0.35]
    );
  }

  if (data.topMicro?.length > 0) {
    pdf.addSubtitle("Top Microrganismos");
    pdf.addTable(
      ["Organismo", "Isolados"],
      data.topMicro.map((m: any) => [m.name || "", String(m.count || 0)]),
      [USABLE_W * 0.7, USABLE_W * 0.3]
    );
  }

  return pdf.toBase64();
}

function buildCasesPdf(data: any, hospital: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []): string {
  const pdf = new PdfBuilder(hospital, "Relatorio de Casos de Investigacao", hospitalLogo, scihLogos);

  pdf.addKPIRow([
    { label: "Abertos", value: String(data.kpis?.abertos || 0) },
    { label: "Em Investigacao", value: String(data.kpis?.emInvestigacao || 0) },
    { label: "Confirmados", value: String(data.kpis?.confirmados || 0) },
    { label: "Encerrados", value: String(data.kpis?.encerrados || 0) },
  ]);

  if (data.cases?.length > 0) {
    pdf.addSubtitle("Lista de Casos");
    pdf.addTable(
      ["Numero", "Paciente", "Setor", "Evento", "Status", "Data"],
      data.cases.map((c: any) => [c.id || "", c.paciente || "", c.setor || "", c.evento || "", c.status || "", c.data || ""]),
      [70, 100, 80, 80, 70, 60]
    );
  }

  return pdf.toBase64();
}

function buildAlertsPdf(data: any, hospital: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []): string {
  const pdf = new PdfBuilder(hospital, "Relatorio de Alertas", hospitalLogo, scihLogos);

  if (data.alerts?.length > 0) {
    pdf.addTable(
      ["Titulo", "Severidade", "Status", "Data"],
      data.alerts.map((a: any) => [a.title || "", a.severity || "", a.status || "", a.date || ""]),
      [USABLE_W * 0.4, USABLE_W * 0.2, USABLE_W * 0.2, USABLE_W * 0.2]
    );
  } else {
    pdf.addText("Nenhum alerta encontrado no periodo.");
  }

  return pdf.toBase64();
}

function buildPatientsPdf(data: any, hospital: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []): string {
  const pdf = new PdfBuilder(hospital, "Relatorio de Pacientes", hospitalLogo, scihLogos);
  pdf.addText(`Total de pacientes: ${data.total || 0}`);
  pdf.addSpacer();

  if (data.patients?.length > 0) {
    pdf.addTable(
      ["Paciente", "Prontuario", "Setor", "Leito", "Status", "Admissao"],
      data.patients.map((p: any) => [p.name || "", p.record || "", p.sector || "", p.bed || "", p.status || "", p.admission || ""]),
      [100, 70, 70, 50, 70, 70]
    );
  }

  return pdf.toBase64();
}

function buildAuditsPdf(data: any, hospital: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []): string {
  const pdf = new PdfBuilder(hospital, "Relatorio de Auditorias", hospitalLogo, scihLogos);

  if (data.kpis) {
    pdf.addKPIRow([
      { label: "Conformidade Media", value: `${data.kpis.avgCompliance || 0}%` },
      { label: "Total Auditorias", value: String(data.kpis.totalAudits || 0) },
      { label: "Nao Conformidades", value: String(data.kpis.nonCompliant || 0) },
    ]);
  }

  if (data.audits?.length > 0) {
    pdf.addSubtitle("Detalhamento");
    pdf.addTable(
      ["Tipo", "Setor", "Data", "Conformidade", "Itens"],
      data.audits.map((a: any) => [
        a.type || "", a.sector || "", a.date || "",
        `${a.compliance || 0}%`, `${a.compliant || 0}/${a.total || 0}`,
      ]),
      [90, 100, 80, 80, 65]
    );
  }

  return pdf.toBase64();
}

function buildMicroorganismsPdf(data: any, hospital: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []): string {
  const pdf = new PdfBuilder(hospital, "Relatorio de Microorganismos", hospitalLogo, scihLogos);
  pdf.addText(`Total de registros: ${data.total || 0}`);
  pdf.addSpacer();

  if (data.distribution?.length > 0) {
    pdf.addSubtitle("Distribuicao");
    pdf.addTable(
      ["Organismo", "Total"],
      data.distribution.map((d: any) => [d.name || "", String(d.total || 0)]),
      [USABLE_W * 0.7, USABLE_W * 0.3]
    );
  }

  if (data.records?.length > 0) {
    pdf.addSubtitle("Registros");
    pdf.addTable(
      ["Data", "Prontuario", "Setor", "Tipo", "Microorganismo"],
      data.records.slice(0, 100).map((r: any) => [r.data || "", r.prontuario || "", r.setor || "", r.tipo || "", r.microorganismo || ""]),
      [70, 80, 80, 80, 110]
    );
  }

  return pdf.toBase64();
}

function buildAnalyticsPdf(data: any, hospital: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []): string {
  const pdf = new PdfBuilder(hospital, "Relatorio Analitico Avancado", hospitalLogo, scihLogos);

  if (data.kpis) {
    pdf.addKPIRow([
      { label: "Total IRAS", value: String(data.kpis.totalCases || 0) },
      { label: "Confirmadas", value: String(data.kpis.confirmedCases || 0) },
      { label: "Conformidade Media", value: `${data.kpis.avgCompliance || 0}%` },
      { label: "Alertas Abertos", value: String(data.kpis.criticalAlerts || 0) },
    ]);
  }

  if (data.monthlyTrend?.length > 0) {
    pdf.addSubtitle("Evolucao Mensal");
    pdf.addTable(
      ["Mes", "Casos IRAS", "Meta"],
      data.monthlyTrend.map((m: any) => [m.mes || "", String(m.iras || 0), String(m.meta || 0)]),
      [USABLE_W * 0.4, USABLE_W * 0.3, USABLE_W * 0.3]
    );
  }

  if (data.infectionBySector?.length > 0) {
    pdf.addSubtitle("Casos por Sitio de Infeccao");
    pdf.addTable(
      ["Setor / Sitio", "Casos"],
      data.infectionBySector.map((s: any) => [s.setor || "", String(s.casos || 0)]),
      [USABLE_W * 0.7, USABLE_W * 0.3]
    );
  }

  if (data.resistanceProfile?.length > 0) {
    pdf.addSubtitle("Perfil de Resistencia");
    pdf.addTable(
      ["Organismo", "Isolados Resistentes"],
      data.resistanceProfile.map((r: any) => [r.organismo || "", String(r.count || 0)]),
      [USABLE_W * 0.65, USABLE_W * 0.35]
    );
  }

  return pdf.toBase64();
}

function buildDDDPdf(data: any, hospital: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []): string {
  const pdf = new PdfBuilder(hospital, "Relatorio de Consumo de Antimicrobianos (DDD)", hospitalLogo, scihLogos);

  if (data.header) {
    pdf.addText(`Profissional: ${data.header.profissional || "-"}`);
    pdf.addText(`Periodo: ${data.header.periodo || "-"}`);
    pdf.addText(`Data Vigilancia: ${data.header.dataVigilancia || "-"}`);
    pdf.addText(`Compilado UTIs (paciente-dia): ${data.header.compiladoUtis ?? "-"}`);
    pdf.addSpacer();
  }

  if (data.kpis) {
    pdf.addKPIRow([
      { label: "Total DDD", value: String(data.kpis.totalDDD || 0) },
      { label: "Registros", value: String(data.kpis.totalRecords || 0) },
      { label: "Antimicrobianos", value: String(data.kpis.uniqueDrugs || 0) },
    ]);
  }

  if (data.lines?.length > 0) {
    pdf.addSubtitle("Detalhamento por Antimicrobiano");
    const fmt = (n: any, d = 2) => {
      const v = Number(n);
      return isFinite(v) ? v.toFixed(d) : "0";
    };
    pdf.addTable(
      ["Antimicrobiano", "Apresentacao", "mg/unid", "Qtd Un.", "Total (mg)", "Total (g)", "DDD (g)", "A/B", "Indicador"],
      data.lines.map((l: any) => [
        l.nome || "",
        l.apresentacao || "",
        fmt(l.mg_por_unidade, 2),
        String(l.quantidade ?? 0),
        fmt(l.total_mg, 2),
        fmt(l.total_g, 3),
        fmt(l.ddd_padrao, 3),
        fmt(l.valor_ab, 3),
        fmt(l.indicador, 2),
      ]),
      [110, 75, 45, 40, 55, 50, 45, 40, 55]
    );
  }

  return pdf.toBase64();
}

function buildISCPdf(data: any, hospital: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []): string {
  const pdf = new PdfBuilder(hospital, "Relatorio de Infeccao de Sitio Cirurgico (ISC)", hospitalLogo, scihLogos);

  if (data.kpis) {
    pdf.addKPIRow([
      { label: "Total Cirurgias", value: String(data.kpis.totalSurgeries || 0) },
      { label: "ISC Confirmadas", value: String(data.kpis.totalISC || 0) },
      { label: "Taxa ISC", value: `${data.kpis.iscRate || 0}%` },
    ]);
  }

  if (data.indicators?.length > 0) {
    pdf.addSubtitle("Indicadores por Procedimento");
    pdf.addTable(
      ["Procedimento", "Cirurgias", "ISC", "Taxa (%)"],
      data.indicators.map((ind: any) => [
        ind.procedimento || "", String(ind.total_cirurgias || 0),
        String(ind.isc_confirmada || 0),
        ind.total_cirurgias > 0 ? ((ind.isc_confirmada / ind.total_cirurgias) * 100).toFixed(1) : "0",
      ]),
      [USABLE_W * 0.4, USABLE_W * 0.2, USABLE_W * 0.2, USABLE_W * 0.2]
    );
  }

  return pdf.toBase64();
}

function buildIndicadoresPdf(data: any, hospital: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []): string {
  const pdf = new PdfBuilder(hospital, "Relatorio de Indicadores", hospitalLogo, scihLogos);

  pdf.addText(`Profissional: ${data.profissional || "-"}`);
  pdf.addText(`Periodo: ${data.mes || "-"} / ${data.ano || "-"}`);
  pdf.addText(`Setor: ${data.setor || "-"}`);
  pdf.addText(`Data da Vigilancia: ${data.dataVigilancia || "-"}`);
  pdf.addSpacer();

  const inputs = data.inputs || {};
  const inputLabels = data.inputLabels || {};
  const inputKeys = Object.keys(inputs).filter(k => k !== "neonatalPacienteDiaPorPeso");

  if (inputKeys.length > 0) {
    pdf.addSubtitle("Dados Informados");
    pdf.addTable(
      ["Campo", "Valor"],
      inputKeys.map((k: string) => [inputLabels[k] || k, String(inputs[k] ?? 0)]),
      [USABLE_W * 0.65, USABLE_W * 0.35]
    );
  }

  if (inputs.neonatalPacienteDiaPorPeso) {
    pdf.addSubtitle("Paciente-Dia por Peso (Neonatal)");
    const weightLabels: Record<string, string> = {
      pesoMenor750: "Menor que 750g",
      peso750a999: "750g a 999g",
      peso1000a1499: "1.000g a 1.499g",
      peso1500a2499: "1.500g a 2.499g",
      pesoMaiorIgual2500: ">= 2.500g",
    };
    const w = inputs.neonatalPacienteDiaPorPeso;
    pdf.addTable(
      ["Faixa de Peso", "Paciente-Dia"],
      Object.keys(w).map((k: string) => [weightLabels[k] || k, String(w[k] ?? 0)]),
      [USABLE_W * 0.65, USABLE_W * 0.35]
    );
  }

  const calculated = data.calculated || {};
  const calcLabels = data.calcLabels || {};
  const calcKeys = Object.keys(calculated);

  if (calcKeys.length > 0) {
    pdf.addSubtitle("Campos Calculados");
    pdf.addTable(
      ["Indicador", "Valor"],
      calcKeys.map((k: string) => [
        calcLabels[k] || k,
        calculated[k] !== null && calculated[k] !== undefined ? Number(calculated[k]).toFixed(2) : "-",
      ]),
      [USABLE_W * 0.65, USABLE_W * 0.35]
    );
  }

  return pdf.toBase64();
}

// ─── Main handler ───

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const { type, hospitalId, data } = await req.json();

    if (!type || !data) {
      return json({ error: "type e data sao obrigatorios" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    let hospitalName = "Hospital";
    let hospitalLogo: LogoImage | undefined;
    let scihLogos: LogoImage[] = [];

    if (hospitalId) {
      const [{ data: hospital }, logoData] = await Promise.all([
        adminClient.from("hospitals").select("name").eq("id", hospitalId).single(),
        fetchLogos(adminClient, hospitalId),
      ]);
      if (hospital) hospitalName = hospital.name;
      hospitalLogo = logoData.hospitalLogo;
      scihLogos = logoData.scihLogos;
    }

    const generators: Record<string, (d: any, h: string, hl?: LogoImage, sl?: LogoImage[]) => string> = {
      dashboard: buildDashboardPdf,
      cases: buildCasesPdf,
      alerts: buildAlertsPdf,
      patients: buildPatientsPdf,
      audits: buildAuditsPdf,
      microorganisms: buildMicroorganismsPdf,
      analytics: buildAnalyticsPdf,
      ddd: buildDDDPdf,
      isc: buildISCPdf,
      indicadores: buildIndicadoresPdf,
    };

    const generator = generators[type];
    if (!generator) {
      return json({ error: `Tipo de relatorio nao suportado: ${type}` }, 400);
    }

    const pdfBase64 = generator(data, hospitalName, hospitalLogo, scihLogos);
    return json({ pdf: pdfBase64 });
  } catch (err: any) {
    return json({ error: err.message }, 500);
  }
});
