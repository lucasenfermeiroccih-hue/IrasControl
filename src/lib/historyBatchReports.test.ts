import { describe, expect, it } from "vitest";
import jsPDF from "jspdf";
import {
  adherenceOf, buildAntibiogramBatchPdf, buildHygieneConsumptionBatchPdf, mlPerPatientDay, sirOf,
  sortConsumptionRecords, type AntibiogramReportRecord, type HygieneConsumptionReportRecord,
} from "./historyBatchReports";

const newDoc = () => new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: false });

function exam(o: Partial<AntibiogramReportRecord>): AntibiogramReportRecord {
  return {
    collection_date: "2026-09-10", organism: "Klebsiella pneumoniae", sample_category: "Sangue",
    sample_material: "Hemocultura", sample_location_detail: "UTI 1", esbl: "sim", carbapenemase: "sim",
    carbapenemase_type: "KPC", notes: null,
    results: [
      { antibiotic: "Meropenem", sensitivity: "R", sir_category: "R", mic_value: 16, notes: null },
      { antibiotic: "Amicacina", sensitivity: "S", sir_category: "S", mic_value: null, notes: null },
      { antibiotic: "Polimixina B", sensitivity: "", sir_category: null, mic_value: null, notes: "aguardando" },
    ],
    ...o,
  };
}

function consumo(o: Partial<HygieneConsumptionReportRecord>): HygieneConsumptionReportRecord {
  return {
    setor: "UTI 1", mes: "Setembro", ano: "2026", responsavel: "Enf. Ana", total_formularios: 10,
    instancias_com_higienizacao: 30, instancias_sem_higienizacao: 10, consumo_alcool_ml: 2000,
    consumo_sabonete_ml: 1000, paciente_dia: 300, ...o,
  };
}

describe("PDF de exames/culturas (antibiograma)", () => {
  it("resumo + uma página por exame, com resistentes listados primeiro", () => {
    const doc = buildAntibiogramBatchPdf(newDoc(), [
      exam({ collection_date: "2026-09-02" }),
      exam({ collection_date: "2026-09-20", organism: "Escherichia coli", esbl: "nao", carbapenemase: "nao", notes: "Coleta de controle" }),
    ], { hospitalName: "Hospital Teste" });
    expect(doc.getNumberOfPages()).toBe(3);
    const out = doc.output();
    expect(out).toContain("Exame 1 de 2");
    expect(out).toContain("Exame 2 de 2");
    expect(out).toContain("Escherichia coli");
    expect(out).toContain("KPC");
    expect(out).toContain("Coleta de controle");
    expect(out).toContain("1 / 3"); // 1 resistente de 3 testados
    expect(out.indexOf("Meropenem")).toBeLessThan(out.indexOf("Amicacina"));
  });

  it("classifica resultado sem categoria como NT", () => {
    expect(sirOf({ sir_category: null, sensitivity: "" })).toBe("NT");
    expect(sirOf({ sir_category: "r", sensitivity: "" })).toBe("R");
  });
});

describe("PDF de consumo de higiene das mãos", () => {
  it("tabela com todos os registros e totais", () => {
    const rows = Array.from({ length: 45 }, (_, i) => consumo({ setor: `Setor ${i + 1}` }));
    const doc = buildHygieneConsumptionBatchPdf(newDoc(), rows, { hospitalName: "Hospital Teste" });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1); // tabela quebra de página
    const out = doc.output();
    expect(out).toContain("Setor 45");
    expect(out).toContain("75,0%"); // adesão geral 30/(30+10)
    expect(out).toContain("90.000 mL"); // álcool: 45 x 2.000 mL
    expect(out).toContain("13.500"); // paciente-dia: 45 x 300
  });

  it("calcula adesão, mL/PD e ordena por ano/mês/setor", () => {
    expect(adherenceOf(consumo({}))).toBe(75);
    expect(adherenceOf(consumo({ instancias_com_higienizacao: 0, instancias_sem_higienizacao: 0 }))).toBeNull();
    expect(mlPerPatientDay(consumo({}))).toBe(10);
    expect(mlPerPatientDay(consumo({ paciente_dia: 0 }))).toBeNull();
    const sorted = sortConsumptionRecords([
      { ano: "2026", mes: "Setembro", setor: "UTI 2" },
      { ano: "2026", mes: "Agosto", setor: "UTI 1" },
      { ano: "2025", mes: "Dezembro", setor: "UPO" },
      { ano: "2026", mes: "Setembro", setor: "UTI 1" },
    ]);
    expect(sorted.map(r => `${r.ano} ${r.mes} ${r.setor}`)).toEqual([
      "2025 Dezembro UPO", "2026 Agosto UTI 1", "2026 Setembro UTI 1", "2026 Setembro UTI 2",
    ]);
  });
});
