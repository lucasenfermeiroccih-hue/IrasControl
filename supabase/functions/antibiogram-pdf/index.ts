// Edge function: antibiogram-pdf
// Gera PDF estruturado server-side com KPIs, tabelas e (opcional) o relatório IA embutido.
// PDF mínimo construído manualmente (mesma técnica de generate-pdf existente).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// === PDF builder (subset adaptado de generate-pdf) ===

const PAGE_W = 595, PAGE_H = 842, MARGIN = 40;
type RGB = [number, number, number];
const BLACK: RGB = [0, 0, 0];
const TEAL: RGB = [0.086, 0.627, 0.522];
const LIGHT: RGB = [0.95, 0.97, 0.95];
const GRAY: RGB = [0.4, 0.4, 0.4];
const RED: RGB = [0.84, 0.18, 0.18];
const ORANGE: RGB = [0.9, 0.6, 0.1];
const GREEN: RGB = [0.2, 0.66, 0.32];

interface LogoImage { data: Uint8Array; w: number; h: number; }

function getJpegDimensions(data: Uint8Array): { w: number; h: number } | null {
  let i = 2;
  while (i < data.length - 8) {
    if (data[i] !== 0xFF) break;
    const marker = data[i + 1]; i += 2;
    if (marker === 0xD9 || marker === 0xDA) break;
    const segLen = (data[i] << 8) | data[i + 1];
    if ((marker >= 0xC0 && marker <= 0xC3) || (marker >= 0xC5 && marker <= 0xC7)) {
      return { h: (data[i + 3] << 8) | data[i + 4], w: (data[i + 5] << 8) | data[i + 6] };
    }
    i += segLen;
  }
  return null;
}

async function fetchHospitalLogos(hospitalId: string): Promise<{ hospitalLogo?: LogoImage; scihLogos: LogoImage[] }> {
  try {
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.45.0");
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: logoRecords } = await adminClient
      .from("hospital_logos")
      .select("logo_type, storage_path, display_order")
      .eq("hospital_id", hospitalId)
      .order("display_order");
    if (!logoRecords?.length) return { scihLogos: [] };

    const bucketBase = `${SUPABASE_URL}/storage/v1/object/public/hospital-logos/`;
    const loadImg = async (path: string): Promise<LogoImage | null> => {
      try {
        const res = await fetch(bucketBase + path, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) return null;
        const data = new Uint8Array(await res.arrayBuffer());
        if (data[0] !== 0xFF || data[1] !== 0xD8) return null; // JPEG only
        const dims = getJpegDimensions(data);
        return dims ? { data, ...dims } : null;
      } catch { return null; }
    };

    const hospitalRec = logoRecords.find((r: any) => r.logo_type === "hospital");
    const scihRecs = logoRecords.filter((r: any) => r.logo_type === "scih");
    const [hosp, ...scih] = await Promise.all([
      hospitalRec ? loadImg(hospitalRec.storage_path) : Promise.resolve(null),
      ...scihRecs.map((r: any) => loadImg(r.storage_path)),
    ]);
    return { hospitalLogo: hosp ?? undefined, scihLogos: scih.filter((l): l is LogoImage => l !== null) };
  } catch { return { scihLogos: [] }; }
}

function sanitize(s: string): string {
  return (s || "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, (c) => {
      const map: Record<string, string> = {};
      "á:a,à:a,â:a,ã:a,é:e,ê:e,í:i,ó:o,ô:o,õ:o,ú:u,ü:u,ç:c,Á:A,À:A,Â:A,Ã:A,É:E,Ê:E,Í:I,Ó:O,Ô:O,Õ:O,Ú:U,Ü:U,Ç:C"
        .split(",").forEach(p => { const [k, v] = p.split(":"); map[k] = v; });
      ["\u2013","\u2014"].forEach(x => map[x] = "-");
      ["\u2018","\u2019"].forEach(x => map[x] = "'");
      ["\u201C","\u201D"].forEach(x => map[x] = '"');
      return map[c] || "?";
    });
}

class Pdf {
  objs: string[] = [];
  objBytes: Map<number, Uint8Array> = new Map();
  pageStreams: { stream: string; imgRefs: string }[] = [];
  cur = "";
  y = PAGE_H - MARGIN;
  hospital: string;
  title: string;
  date: string;
  headerH: number;
  hospitalLogo?: LogoImage;
  scihLogos: LogoImage[];
  imgObjs: { objNum: number; name: string; w: number; h: number }[] = [];

  constructor(hospital: string, title: string, hospitalLogo?: LogoImage, scihLogos: LogoImage[] = []) {
    this.hospital = sanitize(hospital);
    this.title = sanitize(title);
    this.date = new Date().toLocaleDateString("pt-BR");
    this.hospitalLogo = hospitalLogo;
    this.scihLogos = scihLogos;
    this.headerH = (hospitalLogo || scihLogos.length > 0) ? 52 : 45;
    this.startPage();
  }
  setFill(c: RGB) { this.cur += `${c[0]} ${c[1]} ${c[2]} rg\n`; }
  setStroke(c: RGB) { this.cur += `${c[0]} ${c[1]} ${c[2]} RG\n`; }
  rect(x: number, y: number, w: number, h: number, fill: RGB | null, stroke: RGB | null) {
    if (fill) { this.setFill(fill); this.cur += `${x} ${y} ${w} ${h} re f\n`; }
    if (stroke) { this.setStroke(stroke); this.cur += `0.5 w\n${x} ${y} ${w} ${h} re S\n`; }
  }
  text(t: string, x: number, y: number, size: number, color: RGB = BLACK, bold = false) {
    const f = bold ? "/F2" : "/F1";
    this.setFill(color);
    this.cur += `BT\n${f} ${size} Tf\n${x} ${y} Td\n(${sanitize(t)}) Tj\nET\n`;
  }
  addImgObj(img: LogoImage): string {
    const name = `Img${this.imgObjs.length + 1}`;
    const header = `<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${img.data.length} >>`;
    this.objs.push(header);
    const objNum = this.objs.length;
    this.objBytes.set(objNum, img.data);
    this.imgObjs.push({ objNum, name, w: img.w, h: img.h });
    return name;
  }
  drawImg(name: string, x: number, y: number, w: number, h: number) {
    this.cur += `q\n${w} 0 0 ${h} ${x} ${y} cm\n/${name} Do\nQ\n`;
  }
  startPage() {
    this.cur = "";
    this.y = PAGE_H - MARGIN;
    const barH = this.headerH;
    this.rect(0, PAGE_H - barH, PAGE_W, barH, TEAL, null);

    if (this.hospitalLogo || this.scihLogos.length > 0) {
      const bandH = barH - 8;
      if (this.hospitalLogo) {
        const ratio = this.hospitalLogo.w / this.hospitalLogo.h;
        const logoH = Math.min(bandH - 4, 120 / ratio);
        const logoW = logoH * ratio;
        const name = this.addImgObj(this.hospitalLogo);
        this.drawImg(name, MARGIN, PAGE_H - barH + 4 + (bandH - logoH) / 2, logoW, logoH);
      } else {
        this.text(this.hospital, MARGIN, PAGE_H - 22, 11, [1, 1, 1], true);
      }
      let sx = PAGE_W - MARGIN;
      for (const logo of this.scihLogos.slice(0, 3).reverse()) {
        const ratio = logo.w / logo.h;
        const logoH = Math.min(bandH - 4, 70 / ratio);
        const logoW = logoH * ratio;
        sx -= logoW + 4;
        const name = this.addImgObj(logo);
        this.drawImg(name, sx, PAGE_H - barH + 4 + (bandH - logoH) / 2, logoW, logoH);
      }
    } else {
      this.text(this.hospital, MARGIN, PAGE_H - 22, 11, [1, 1, 1], true);
      this.text(this.title, MARGIN, PAGE_H - 36, 9, [1, 1, 1]);
      this.text(this.date, PAGE_W - MARGIN - 70, PAGE_H - 28, 9, [1, 1, 1]);
    }
    this.y = PAGE_H - barH - 25;
  }
  endPage() {
    this.text(`Pagina ${this.pageStreams.length + 1}`, PAGE_W / 2 - 20, 20, 8, GRAY);
    const imgRefs = this.imgObjs.map(img => `/${img.name} ${img.objNum} 0 R`).join(" ");
    this.pageStreams.push({ stream: this.cur, imgRefs });
  }
  ensure(needed: number) {
    if (this.y - needed < MARGIN + 20) {
      this.endPage();
      this.startPage();
    }
  }
  h1(t: string) {
    this.ensure(30);
    this.text(t, MARGIN, this.y, 14, TEAL, true);
    this.rect(MARGIN, this.y - 4, PAGE_W - 2 * MARGIN, 0.8, TEAL, null);
    this.y -= 22;
  }
  h2(t: string) {
    this.ensure(20);
    this.text(t, MARGIN, this.y, 11, TEAL, true);
    this.y -= 16;
  }
  para(t: string, size = 9) {
    const maxChars = 95;
    const words = (t || "").split(/\s+/);
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > maxChars) {
        this.ensure(14);
        this.text(line, MARGIN, this.y, size);
        this.y -= 12;
        line = w;
      } else {
        line = line ? `${line} ${w}` : w;
      }
    }
    if (line) {
      this.ensure(14);
      this.text(line, MARGIN, this.y, size);
      this.y -= 12;
    }
    this.y -= 4;
  }
  kpiRow(items: { label: string; value: string; color?: RGB }[]) {
    this.ensure(50);
    const w = (PAGE_W - 2 * MARGIN) / items.length;
    items.forEach((it, i) => {
      const x = MARGIN + i * w;
      this.rect(x + 3, this.y - 38, w - 6, 38, LIGHT, GRAY);
      this.text(it.label, x + 8, this.y - 12, 8, GRAY);
      this.text(it.value, x + 8, this.y - 28, 14, it.color || TEAL, true);
    });
    this.y -= 48;
  }
  table(headers: string[], rows: string[][], colWidths?: number[]) {
    const cols = colWidths || headers.map(() => (PAGE_W - 2 * MARGIN) / headers.length);
    // header
    this.ensure(20);
    this.rect(MARGIN, this.y - 14, PAGE_W - 2 * MARGIN, 16, TEAL, null);
    let cx = MARGIN;
    headers.forEach((h, i) => {
      this.text(h, cx + 4, this.y - 10, 8.5, [1, 1, 1], true);
      cx += cols[i];
    });
    this.y -= 18;
    // rows
    rows.forEach((row, idx) => {
      this.ensure(15);
      if (idx % 2 === 0) this.rect(MARGIN, this.y - 12, PAGE_W - 2 * MARGIN, 14, LIGHT, null);
      cx = MARGIN;
      row.forEach((cell, i) => {
        const truncated = String(cell).slice(0, Math.floor(cols[i] / 5));
        this.text(truncated, cx + 4, this.y - 8, 8);
        cx += cols[i];
      });
      this.y -= 14;
    });
    this.y -= 6;
  }

  build(): Uint8Array {
    this.endPage();
    const enc = new TextEncoder();
    const chunks: Uint8Array[] = [];
    const offsets: number[] = [];
    let bytePos = 0;

    const addStr = (s: string) => { const b = enc.encode(s); chunks.push(b); bytePos += b.length; };
    const addBytes = (b: Uint8Array) => { chunks.push(b); bytePos += b.length; };

    addStr("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

    // Pre-allocated image objects come first (already in this.objs from addImgObj calls)
    // We need to assign final obj numbers sequentially:
    // Fixed: 1=Catalog, 2=Pages, 3=F1, 4=F2
    // Then image objects (this.imgObjs), then page objs + content streams
    const IMG_OBJ_START = 5;
    const imgCount = this.imgObjs.length;
    const pageObjStart = IMG_OBJ_START + imgCount;
    const totalPages = this.pageStreams.length;

    // obj 1: Catalog
    offsets.push(bytePos);
    addStr(`1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`);

    // obj 2: Pages
    const pageRefs = Array.from({ length: totalPages }, (_, i) => `${pageObjStart + i * 2} 0 R`).join(" ");
    offsets.push(bytePos);
    addStr(`2 0 obj\n<< /Type /Pages /Count ${totalPages} /Kids [${pageRefs}] >>\nendobj\n`);

    // obj 3: F1
    offsets.push(bytePos);
    addStr(`3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`);

    // obj 4: F2
    offsets.push(bytePos);
    addStr(`4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n`);

    // Image objects (5..5+imgCount-1)
    for (let i = 0; i < this.imgObjs.length; i++) {
      const img = this.imgObjs[i];
      // Use the raw bytes stored in objBytes map (keyed by old objNum from addImgObj)
      const rawBytes = this.objBytes.get(img.objNum)!;
      const header = `<< /Type /XObject /Subtype /Image /Width ${img.w} /Height ${img.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${rawBytes.length} >>`;
      offsets.push(bytePos);
      addStr(`${IMG_OBJ_START + i} 0 obj\n${header}\nstream\n`);
      addBytes(rawBytes);
      addStr(`\nendstream\nendobj\n`);
    }

    // Build image XObject dict for pages
    const imgXDict = this.imgObjs.length > 0
      ? ` /XObject << ${this.imgObjs.map((img, i) => `/${img.name} ${IMG_OBJ_START + i} 0 R`).join(" ")} >>`
      : "";

    // Pages + content streams
    for (let i = 0; i < totalPages; i++) {
      const pageObjNum = pageObjStart + i * 2;
      const contentObjNum = pageObjNum + 1;
      const pageData = this.pageStreams[i];
      offsets.push(bytePos);
      addStr(`${pageObjNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >>${imgXDict} >> /Contents ${contentObjNum} 0 R >>\nendobj\n`);
      const streamBytes = enc.encode(pageData.stream);
      offsets.push(bytePos);
      addStr(`${contentObjNum} 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`);
      addBytes(streamBytes);
      addStr(`\nendstream\nendobj\n`);
    }

    const totalObjs = offsets.length + 1; // +1 for obj 0
    const xrefOffset = bytePos;
    addStr(`xref\n0 ${totalObjs}\n0000000000 65535 f \n`);
    offsets.forEach(off => addStr(`${String(off).padStart(10, "0")} 00000 n \n`));
    addStr(`trailer\n<< /Size ${totalObjs} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    const total = chunks.reduce((s, c) => s + c.length, 0);
    const result = new Uint8Array(total);
    let pos = 0;
    for (const chunk of chunks) { result.set(chunk, pos); pos += chunk.length; }
    return result;
  }
}

// === Data fetch (mesma lógica do dashboard) ===

const PERIOD_DAYS: Record<string, number> = {
  "ultimo-mes": 30,
  "ultimos-3-meses": 90,
  "ultimos-6-meses": 180,
  "ultimo-ano": 365,
};
const PERIOD_LABELS: Record<string, string> = {
  "ultimo-mes": "Ultimo mes",
  "ultimos-3-meses": "Ultimos 3 meses",
  "ultimos-6-meses": "Ultimos 6 meses",
  "ultimo-ano": "Ultimo ano",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const period = body.period || "ultimos-3-meses";
    const days = PERIOD_DAYS[period] ?? 90;
    const periodLabel = PERIOD_LABELS[period] || period;
    const aiContent: string | undefined = body.ai_content;
    const includeAi: boolean = !!body.include_ai && !!aiContent;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const { data: hu } = await supabase.from("hospital_users").select("hospital_id").eq("user_id", userId).limit(1).maybeSingle();
    const hospitalId = hu?.hospital_id;
    if (!hospitalId) {
      return new Response(JSON.stringify({ error: "Hospital nao encontrado" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: hosp } = await supabase.from("hospitals").select("name").eq("id", hospitalId).maybeSingle();
    const hospitalName = hosp?.name || "Hospital";

    const { hospitalLogo, scihLogos } = await fetchHospitalLogos(hospitalId);

    const periodEnd = new Date();
    const periodStart = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const isoStart = periodStart.toISOString().slice(0, 10);
    const isoEnd = periodEnd.toISOString().slice(0, 10);

    const { data: labResults } = await supabase
      .from("lab_results")
      .select("id, collection_date, sample_type, organism, patient_id, notes")
      .eq("hospital_id", hospitalId)
      .gte("collection_date", isoStart)
      .lte("collection_date", isoEnd)
      .not("organism", "is", null);

    const exams = labResults || [];
    const ids = exams.map((e: any) => e.id);
    let abResults: any[] = [];
    if (ids.length > 0) {
      const { data: abs } = await supabase
        .from("antibiogram_results")
        .select("lab_result_id, antibiotic, sensitivity")
        .in("lab_result_id", ids);
      abResults = abs || [];
    }

    const totalExams = exams.length;
    const totalTests = abResults.length;
    const R = abResults.filter(r => r.sensitivity === "R").length;
    const S = abResults.filter(r => r.sensitivity === "S").length;
    const resistanceRate = totalTests > 0 ? Math.round((R / totalTests) * 1000) / 10 : 0;
    const sensitivityRate = totalTests > 0 ? Math.round((S / totalTests) * 1000) / 10 : 0;

    const orgCounts: Record<string, number> = {};
    const sectorCounts: Record<string, number> = {};
    const sirByAb: Record<string, { S: number; I: number; R: number }> = {};

    exams.forEach((e: any) => {
      orgCounts[e.organism] = (orgCounts[e.organism] || 0) + 1;
      const m = (e.notes || "").match(/Setor:\s*([^|]+)/);
      const sec = m ? m[1].trim() : "Nao informado";
      sectorCounts[sec] = (sectorCounts[sec] || 0) + 1;
    });
    abResults.forEach(r => {
      if (!sirByAb[r.antibiotic]) sirByAb[r.antibiotic] = { S: 0, I: 0, R: 0 };
      if (r.sensitivity in sirByAb[r.antibiotic]) sirByAb[r.antibiotic][r.sensitivity as "S"|"I"|"R"]++;
    });

    const topOrgs = Object.entries(orgCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const sectors = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const sirRows = Object.entries(sirByAb).map(([ab, v]) => {
      const tot = v.S + v.I + v.R;
      const rate = tot > 0 ? Math.round((v.R / tot) * 100) : 0;
      return [ab, String(v.S), String(v.I), String(v.R), `${rate}%`];
    }).sort((a, b) => Number(b[3]) - Number(a[3])).slice(0, 15);

    // Build PDF
    const pdf = new Pdf(hospitalName, `Relatorio Sensibilidade Antimicrobiana - ${periodLabel}`, hospitalLogo, scihLogos);
    pdf.h1("Resumo Executivo");
    pdf.para(`Periodo analisado: ${isoStart} a ${isoEnd} (${periodLabel}). Foram processados ${totalExams} exames com isolado microbiologico, totalizando ${totalTests} testes de sensibilidade.`);

    pdf.h2("Indicadores-chave");
    pdf.kpiRow([
      { label: "Total Exames", value: String(totalExams) },
      { label: "Testes SIR", value: String(totalTests) },
      { label: "Resistencia", value: `${resistanceRate}%`, color: resistanceRate > 30 ? RED : ORANGE },
      { label: "Sensibilidade", value: `${sensitivityRate}%`, color: GREEN },
    ]);

    pdf.h2("Microrganismos mais frequentes");
    pdf.table(["Microrganismo", "Isolados", "% do total"],
      topOrgs.map(([n, v]) => [n, String(v), `${totalExams > 0 ? ((v / totalExams) * 100).toFixed(1) : 0}%`]),
      [340, 75, 100]);

    pdf.h2("Distribuicao por setor");
    pdf.table(["Setor", "Exames"],
      sectors.map(([n, v]) => [n, String(v)]),
      [380, 135]);

    pdf.h2("Perfil SIR por antibiotico (Top 15 por volume)");
    pdf.table(["Antibiotico", "S", "I", "R", "% Resist."],
      sirRows,
      [240, 60, 60, 60, 95]);

    if (includeAi) {
      pdf.h1("Analise Inteligente (IA)");
      // Strip markdown headers/symbols, paragraph by paragraph
      const cleaned = aiContent!
        .replace(/^#{1,6}\s+/gm, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/\*(.+?)\*/g, "$1")
        .replace(/`(.+?)`/g, "$1");
      cleaned.split(/\n\n+/).forEach(p => {
        const trimmed = p.trim();
        if (!trimmed) return;
        if (trimmed.length < 60 && /^[A-ZÁÉÍÓÚ]/.test(trimmed)) pdf.h2(trimmed);
        else pdf.para(trimmed);
      });
    }

    pdf.h2("Notas");
    pdf.para("Relatorio gerado automaticamente pelo sistema IRAS Control. Os dados refletem o periodo selecionado e dependem da completude dos registros de exames microbiologicos. Recomenda-se validacao clinica e epidemiologica.", 8);

    const bytes = pdf.build();

    // Salvar histórico
    try {
      const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await adminClient.from("antibiogram_reports").insert({
        hospital_id: hospitalId,
        created_by: userId,
        report_type: "pdf_structured",
        period_label: periodLabel,
        period_start: isoStart,
        period_end: isoEnd,
        filters: {},
        summary: { totalExams, totalTests, resistanceRate, sensitivityRate, topOrgs, sectors },
        ai_content: includeAi ? aiContent : null,
        total_exams: totalExams,
        resistance_rate: resistanceRate,
      });
    } catch (e) {
      console.error("Falha ao salvar historico:", e);
    }

    return new Response(bytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="relatorio-antibiograma-${isoEnd}.pdf"`,
      },
    });
  } catch (e) {
    console.error("antibiogram-pdf error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
