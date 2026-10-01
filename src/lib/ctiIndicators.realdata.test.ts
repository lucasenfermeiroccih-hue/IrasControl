/**
 * Validação com DADOS REAIS (amostra): 6 pacientes da UTI 1 com episódios de
 * troca/reinserção, exportados do banco (Supabase) em Ago/2026. Os valores
 * esperados (exp_*) foram calculados por um censo diário SQL independente
 * (generate_series por dia), com política "episódio com retirada é autoritativo".
 * Este teste garante que o módulo TS reproduz exatamente o censo do banco.
 */
import { describe, it, expect } from "vitest";
import { computeCtiIndicators, type CtiPatientRow, type CtiFilter } from "./ctiIndicators";

const ROWS: Array<{ id: string; icu: string; disc: string | null; status: string; dt: string | null; di: any;
  exp_pac_dia: number; exp_cvc: number; exp_svu: number; exp_vm: number }> = [
  { id: "1796b623", icu: "2026-06-18", disc: "2026-08-12", status: "deceased", dt: "Óbito",
    di: { cvcInsercao: "2026-06-18", cvcRetirada: "2026-06-26", cvcTrocas: [{ insercao: "2026-06-26", retirada: "2026-07-05" }, { insercao: "2026-07-05", retirada: "2026-07-21" }, { insercao: "2026-07-21", retirada: "2026-08-12" }],
      svuInsercao: "2026-06-18", svuRetirada: "2026-07-03", svuTrocas: [{ insercao: "2026-07-13", retirada: "2026-08-02" }, { insercao: "2026-08-02", retirada: "2026-08-12" }],
      vmInsercao: "2026-06-18", vmRetirada: "2026-07-09", vmTrocas: [] },
    exp_pac_dia: 12, exp_cvc: 12, exp_svu: 12, exp_vm: 0 },
  { id: "26570821", icu: "2026-08-14", disc: "2026-08-26", status: "discharged", dt: "Alta",
    di: { cvcInsercao: "2026-08-14", cvcRetirada: "2026-08-22", cvcTrocas: [{ insercao: "2026-08-22", retirada: "2026-08-26" }],
      svuInsercao: "2026-08-13", svuRetirada: "2026-08-26", svuTrocas: [],
      vmInsercao: "2026-08-14", vmRetirada: "2026-08-22", vmTrocas: [] },
    exp_pac_dia: 13, exp_cvc: 13, exp_svu: 13, exp_vm: 9 },
  { id: "527c34d3", icu: "2026-08-05", disc: "2026-08-31", status: "discharged", dt: "Alta",
    di: { cvcInsercao: "2026-08-05", cvcRetirada: "2026-08-13", cvcTrocas: [{ insercao: "2026-08-13", retirada: "2026-08-31" }],
      svuInsercao: "2026-08-05", svuRetirada: "2026-08-11", svuTrocas: [{ insercao: "2026-08-11", retirada: "2026-08-20" }],
      vmInsercao: "2026-08-05", vmRetirada: "2026-08-17", vmTrocas: [] },
    exp_pac_dia: 27, exp_cvc: 27, exp_svu: 16, exp_vm: 13 },
  { id: "53209bcf", icu: "2026-08-19", disc: "2026-09-07", status: "discharged", dt: "Alta",
    di: { cvcInsercao: "2026-08-19", cvcRetirada: "", cvcTrocas: [{ insercao: "2026-08-30", retirada: "" }],
      svuInsercao: "2026-08-19", svuRetirada: "", svuTrocas: [],
      vmInsercao: "2026-08-19", vmRetirada: "", vmTrocas: [] },
    exp_pac_dia: 13, exp_cvc: 13, exp_svu: 13, exp_vm: 13 },
  { id: "5411c9be", icu: "2026-08-19", disc: "2026-09-14", status: "deceased", dt: "Óbito",
    di: { cvcInsercao: "2026-08-19", cvcRetirada: "2026-09-04", cvcTrocas: [{ insercao: "2026-09-04", retirada: "2026-09-14" }],
      svuInsercao: "2026-08-19", svuRetirada: "2026-09-04", svuTrocas: [],
      vmInsercao: "2026-08-19", vmRetirada: "2026-09-07", vmTrocas: [] },
    exp_pac_dia: 13, exp_cvc: 13, exp_svu: 13, exp_vm: 13 },
  { id: "6810e521", icu: "2026-07-02", disc: "2026-08-07", status: "deceased", dt: "Óbito",
    di: { cvcInsercao: "2026-07-02", cvcRetirada: "2026-07-16", cvcTrocas: [{ insercao: "2026-07-17", retirada: "2026-08-07" }],
      svuInsercao: "2026-07-02", svuRetirada: "2026-08-03", svuTrocas: [],
      vmInsercao: "2026-07-02", vmRetirada: "2026-07-15", vmTrocas: [{ insercao: "2026-07-17", retirada: "2026-08-07" }] },
    exp_pac_dia: 7, exp_cvc: 7, exp_svu: 3, exp_vm: 7 },
];

function toRow(r: typeof ROWS[number]): CtiPatientRow {
  return {
    id: r.id, full_name: r.id, sector: "UTI 1", specialty: null,
    admission_date: r.icu, icu_admission_date: r.icu, discharge_date: r.disc,
    status: r.status, discharge_type: r.dt, clinical_data: { dispInvasivos: r.di },
  };
}

const FILTER: CtiFilter = { months: [7], years: [2026], sectors: ["UTI 1"], today: new Date(2026, 9, 1) };

describe("CTI indicators — validação com dados reais (UTI 1, Ago/2026)", () => {
  const result = computeCtiIndicators(ROWS.map(toRow), FILTER);
  const byId = new Map(result.perPatient.map((b) => [b.id, b]));

  ROWS.forEach((r) => {
    it(`paciente ${r.id} bate com o censo SQL`, () => {
      const b = byId.get(r.id)!;
      expect(b.ctiPatientDays).toBe(r.exp_pac_dia);
      expect(b.deviceDays.cvc).toBe(r.exp_cvc);
      expect(b.deviceDays.svu).toBe(r.exp_svu);
      expect(b.deviceDays.vm).toBe(r.exp_vm);
    });
  });

  it("totais da amostra conferem com a soma do censo SQL", () => {
    const sum = (k: "exp_pac_dia" | "exp_cvc" | "exp_svu" | "exp_vm") => ROWS.reduce((a, r) => a + r[k], 0);
    expect(result.totals.ctiPatientDays).toBe(sum("exp_pac_dia"));
    expect(result.totals.deviceDays.cvc).toBe(sum("exp_cvc"));
    expect(result.totals.deviceDays.svu).toBe(sum("exp_svu"));
    expect(result.totals.deviceDays.vm).toBe(sum("exp_vm"));
  });
});
