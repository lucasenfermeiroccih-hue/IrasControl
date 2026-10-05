/**
 * PDFs de seleção múltipla dos históricos de Antibiograma (exames/culturas) e de
 * Consumo de Higiene das Mãos. Construídos com o PdfReportWriter.
 */
import type jsPDF from "jspdf";
import type { PdfLogo } from "@/lib/pdfLogoUtils";
import { PDF_COLOR, PdfReportWriter, formatDateBR, generatedAtText, type TableRow } from "@/lib/pdfReportKit";

interface CommonOptions {
  hospitalName?: string | null;
  logos?: { hospitalLogo: PdfLogo | null; scihLogos: PdfLogo[] };
  generatedAt?: Date;
}

// ---------------------------------------------------------------------------
// Antibiograma
// ---------------------------------------------------------------------------

export interface AntibiogramReportRecord {
  collection_date: string;
  organism: string | null;
  sample_category: string | null;
  sample_material: string | null;
  sample_location_detail: string | null;
  esbl: string | null;
  carbapenemase: string | null;
  carbapenemase_type: string | null;
  notes: string | null;
  results: Array<{
    antibiotic: string;
    sensitivity: string;
    sir_category: string | null;
    mic_value: number | null;
    notes: string | null;
  }>;
}

export function sirOf(r: { sir_category: string | null; sensitivity: string }) {
  return (r.sir_category || r.sensitivity || "NT").toUpperCase();
}

const SIR_COLOR: Record<string, readonly [number, number, number]> = {
  S: PDF_COLOR.ok, I: PDF_COLOR.warn, R: PDF_COLOR.bad,
};

const yesNo = (v: string | null) => (v === "sim" ? "Sim" : v === "nao" || v === "não" ? "Não" : v || "—");

export function buildAntibiogramBatchPdf(doc: jsPDF, records: AntibiogramReportRecord[], opts: CommonOptions = {}) {
  const w = new PdfReportWriter(doc, { runningTitle: "Exames/Culturas — Antibiograma", hospitalName: opts.hospitalName, logos: opts.logos });
  const dates = records.map(r => r.collection_date).filter(Boolean).sort();
  const periodo = dates.length ? `${formatDateBR(dates[0])} a ${formatDateBR(dates[dates.length - 1])}` : "—";

  w.title("Relatório de Exames/Culturas — Antibiograma");
  w.paragraph(`${records.length} exame(s) selecionado(s) · Período: ${periodo} · ${generatedAtText(opts.generatedAt ?? new Date())}`, 9, "normal", PDF_COLOR.muted);
  w.space(3);
  const esbl = records.filter(r => r.esbl === "sim").length;
  const carba = records.filter(r => r.carbapenemase === "sim").length;
  w.keyValues([["ESBL", String(esbl)], ["Carbapenemase", String(carba)], ["Exames", String(records.length)]]);
  w.space(2);
  w.table(
    [
      { title: "#", weight: 4 }, { title: "Coleta", weight: 11 }, { title: "Microrganismo", weight: 28 },
      { title: "Material", weight: 20 }, { title: "ESBL", weight: 8, align: "center" },
      { title: "Carbapenemase", weight: 16 }, { title: "R / testados", weight: 13, align: "center" },
    ],
    records.map((r, i): TableRow => {
      const resist = r.results.filter(x => sirOf(x) === "R").length;
      return {
        cells: [
          String(i + 1), formatDateBR(r.collection_date), r.organism || "—", r.sample_material || "—",
          { text: yesNo(r.esbl), bold: r.esbl === "sim", color: r.esbl === "sim" ? PDF_COLOR.warn : undefined },
          { text: r.carbapenemase === "sim" ? r.carbapenemase_type || "Sim" : yesNo(r.carbapenemase), bold: r.carbapenemase === "sim", color: r.carbapenemase === "sim" ? PDF_COLOR.bad : undefined },
          `${resist} / ${r.results.length}`,
        ],
      };
    }),
  );
  w.space(3);
  w.paragraph("S = sensível · I = intermediário · R = resistente · NT = não testado. Cada exame é detalhado nas páginas seguintes.", 7, "italic", PDF_COLOR.muted);

  records.forEach((r, idx) => {
    w.newPage();
    w.title(`Exame ${idx + 1} de ${records.length}`, 13);
    w.keyValues([
      ["Coleta", formatDateBR(r.collection_date)],
      ["Microrganismo", r.organism || "—"],
      ["Material", r.sample_material || "—"],
      ["Categoria", r.sample_category || "—"],
      ["Local", r.sample_location_detail || "—"],
      ["ESBL", yesNo(r.esbl)],
      ["Carbapenemase", r.carbapenemase === "sim" ? r.carbapenemase_type || "Sim" : yesNo(r.carbapenemase)],
    ]);
    if (r.notes?.trim()) {
      w.space(1);
      w.paragraph("Observações", 9.5, "bold");
      w.paragraph(r.notes.trim(), 9);
    }
    w.space(3);
    if (r.results.length === 0) {
      w.paragraph("Sem antimicrobianos registrados.", 9, "italic", PDF_COLOR.muted);
      return;
    }
    const order: Record<string, number> = { R: 0, I: 1, S: 2 };
    const results = [...r.results].sort((a, b) =>
      (order[sirOf(a)] ?? 3) - (order[sirOf(b)] ?? 3) || a.antibiotic.localeCompare(b.antibiotic, "pt-BR"));
    w.table(
      [
        { title: "Antimicrobiano", weight: 40 }, { title: "Resultado", weight: 14, align: "center" },
        { title: "MIC", weight: 12, align: "center" }, { title: "Observação", weight: 34 },
      ],
      results.map((x): TableRow => {
        const sir = sirOf(x);
        return {
          fill: sir === "R" ? PDF_COLOR.badFill : undefined,
          cells: [
            { text: x.antibiotic, bold: sir === "R" },
            { text: sir, bold: true, color: SIR_COLOR[sir] ?? PDF_COLOR.muted },
            x.mic_value != null ? String(x.mic_value) : "—",
            x.notes || "",
          ],
        };
      }),
    );
  });
  return w.finish();
}

// ---------------------------------------------------------------------------
// Consumo de higiene das mãos
// ---------------------------------------------------------------------------

export interface HygieneConsumptionReportRecord {
  setor: string;
  mes: string;
  ano: string;
  responsavel: string | null;
  total_formularios: number;
  instancias_com_higienizacao: number;
  instancias_sem_higienizacao: number;
  consumo_alcool_ml: number;
  consumo_sabonete_ml: number;
  paciente_dia: number;
}

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

/** Ordena por ano, mês e setor. */
export function sortConsumptionRecords<T extends { ano: string; mes: string; setor: string }>(records: T[]): T[] {
  return [...records].sort((a, b) =>
    a.ano.localeCompare(b.ano) || MESES.indexOf(a.mes) - MESES.indexOf(b.mes) || a.setor.localeCompare(b.setor, "pt-BR"));
}

export function adherenceOf(r: HygieneConsumptionReportRecord) {
  const total = r.instancias_com_higienizacao + r.instancias_sem_higienizacao;
  return total > 0 ? (r.instancias_com_higienizacao / total) * 100 : null;
}

export function mlPerPatientDay(r: HygieneConsumptionReportRecord) {
  return r.paciente_dia > 0 ? (r.consumo_alcool_ml + r.consumo_sabonete_ml) / r.paciente_dia : null;
}

const fmtNum = (n: number, dec = 0) => n.toLocaleString("pt-BR", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const rateColor = (v: number | null) => (v == null ? PDF_COLOR.muted : v >= 80 ? PDF_COLOR.ok : v >= 50 ? PDF_COLOR.warn : PDF_COLOR.bad);

export function buildHygieneConsumptionBatchPdf(doc: jsPDF, records: HygieneConsumptionReportRecord[], opts: CommonOptions = {}) {
  const w = new PdfReportWriter(doc, { runningTitle: "Consumo de Higiene das Mãos", hospitalName: opts.hospitalName, logos: opts.logos });
  w.title("Relatório de Consumo — Higiene das Mãos");
  w.paragraph(`${records.length} registro(s) selecionado(s) · ${generatedAtText(opts.generatedAt ?? new Date())}`, 9, "normal", PDF_COLOR.muted);
  w.space(3);

  const sum = (k: keyof HygieneConsumptionReportRecord) => records.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const comH = sum("instancias_com_higienizacao");
  const semH = sum("instancias_sem_higienizacao");
  const alcool = sum("consumo_alcool_ml");
  const sabonete = sum("consumo_sabonete_ml");
  const pd = sum("paciente_dia");
  const adesaoTotal = comH + semH > 0 ? (comH / (comH + semH)) * 100 : null;
  w.keyValues([
    ["Adesão geral", adesaoTotal != null ? `${fmtNum(adesaoTotal, 1)}%` : "—"],
    ["Álcool", `${fmtNum(alcool)} mL`],
    ["Sabonete", `${fmtNum(sabonete)} mL`],
    ["Paciente-dia", fmtNum(pd)],
    ["mL por paciente-dia", pd > 0 ? fmtNum((alcool + sabonete) / pd, 2) : "—"],
    ["Formulários", fmtNum(sum("total_formularios"))],
  ]);
  w.space(3);

  w.table(
    [
      { title: "Mês/Ano", weight: 15 }, { title: "Setor", weight: 18 }, { title: "Form.", weight: 8, align: "center" },
      { title: "Adesão", weight: 9, align: "center" }, { title: "Álcool (mL)", weight: 11, align: "right" },
      { title: "Sabonete (mL)", weight: 13, align: "right" }, { title: "Pac-dia", weight: 8, align: "right" },
      { title: "mL/PD", weight: 9, align: "right" }, { title: "Responsável", weight: 18 },
    ],
    records.map((r): TableRow => {
      const ad = adherenceOf(r);
      const ml = mlPerPatientDay(r);
      return {
        fill: ad != null && ad < 50 ? PDF_COLOR.badFill : undefined,
        cells: [
          `${r.mes}/${r.ano}`, r.setor || "—", fmtNum(r.total_formularios),
          { text: ad != null ? `${fmtNum(ad, 1)}%` : "—", bold: true, color: rateColor(ad) },
          fmtNum(r.consumo_alcool_ml), fmtNum(r.consumo_sabonete_ml), fmtNum(r.paciente_dia),
          ml != null ? fmtNum(ml, 2) : "—", r.responsavel || "—",
        ],
      };
    }),
  );
  w.space(3);
  w.paragraph("Adesão = oportunidades com higienização ÷ total de oportunidades observadas. mL/PD = (álcool + sabonete) ÷ paciente-dia. Linhas em vermelho: adesão abaixo de 50%.", 7, "italic", PDF_COLOR.muted);
  return w.finish();
}
