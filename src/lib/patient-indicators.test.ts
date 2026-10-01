import { describe, expect, it } from "vitest";
import { computeCtiIndicators, type CtiPatientRow } from "./ctiIndicators";
import {
  buildSpecialtyData,
  computeTreatmentIndicators,
  NO_SPECIALTY,
  OTHER_SPECIALTY,
} from "./patient-indicators";

const TODAY = new Date(2026, 9, 1); // 01/10/2026
const MARCH = 2;

let seq = 0;
function patient(overrides: Partial<CtiPatientRow>): CtiPatientRow {
  seq++;
  return {
    id: `p${seq}`,
    full_name: `Paciente ${seq}`,
    sector: "UTI",
    specialty: "Clínica médica",
    admission_date: "2026-03-10",
    icu_admission_date: "2026-03-10",
    discharge_date: null,
    status: "active",
    discharge_type: null,
    clinical_data: {},
    ...overrides,
  };
}

const cti = (patients: CtiPatientRow[]) =>
  computeCtiIndicators(patients, { months: [MARCH], years: [2026], sectors: [], today: TODAY });

function treatment(patients: CtiPatientRow[], extra: Partial<Parameters<typeof computeTreatmentIndicators>[0]> = {}) {
  return computeTreatmentIndicators({
    patients, devices: [], prescriptions: [], labResults: [], months: [MARCH], years: [2026], ...extra,
  });
}

describe("recorte do mês (CTI)", () => {
  it("quem entrou no CTI no mês anterior não é nova internação, mas os dias no mês contam", () => {
    const fromFebruary = patient({ icu_admission_date: "2026-02-20", discharge_date: "2026-03-05", status: "discharged", discharge_type: "Alta" });
    const inMarch = patient({ icu_admission_date: "2026-03-30", discharge_date: "2026-04-03", status: "discharged", discharge_type: "Alta" });
    const r = cti([fromFebruary, inMarch]);
    expect(r.totals.newAdmissions).toBe(1);
    expect(r.totals.carriedOver).toBe(1);
    // 01..04/03 (dia da alta não conta) + 30 e 31/03
    expect(r.totals.ctiPatientDays).toBe(6);
  });

  it("'internados' considera o último dia do período filtrado, não hoje", () => {
    const leftInApril = patient({ icu_admission_date: "2026-03-10", discharge_date: "2026-04-02", status: "discharged", discharge_type: "Alta" });
    const leftOnLastDay = patient({ icu_admission_date: "2026-03-10", discharge_date: "2026-03-31", status: "discharged", discharge_type: "Alta" });
    const r = cti([leftInApril, leftOnLastDay]);
    expect(r.totals.stillAdmittedAtEnd).toBe(1);
    expect(r.totals.discharges).toBe(1);
  });
});

describe("especialidades", () => {
  it("inclui outras e não informadas, fechando o total", () => {
    const data = buildSpecialtyData(["Clínica médica", "Cardiologia", null, " "], ["Clínica médica", "Cirurgia Geral"]);
    expect(data.reduce((s, x) => s + x.internacoes, 0)).toBe(4);
    expect(data.find(s => s.fullName === OTHER_SPECIALTY)?.internacoes).toBe(1);
    expect(data.find(s => s.fullName === NO_SPECIALTY)?.internacoes).toBe(2);
  });

  it("não cria linhas extras quando não há outras/não informadas", () => {
    expect(buildSpecialtyData(["Cirurgia Geral"], ["Clínica médica", "Cirurgia Geral"])).toHaveLength(2);
  });
});

describe("antibióticos", () => {
  it("não duplica o antibiótico sincronizado entre cadastro e tabela", () => {
    const p = patient({
      clinical_data: { antibioticos: [{ id: "atb1", nome: "Meropenem", dataInicio: "2026-03-11", dataFim: "" }] },
    });
    const r = treatment([p], {
      prescriptions: [{ id: "atb1", patient_id: p.id, drug_name: "Meropenem", start_date: "2026-03-11" }],
    });
    expect(r.abCount).toBe(1);
    expect(r.topAntibiotics).toEqual([{ name: "Meropenem", value: 1 }]);
  });

  it("antibiótico iniciado no mês anterior não conta", () => {
    const p = patient({
      clinical_data: { antibioticos: [{ id: "a", nome: "Cefepime", dataInicio: "2026-02-27", dataFim: "" }] },
    });
    expect(treatment([p]).abCount).toBe(0);
  });
});

describe("extubações", () => {
  it("não duplica tabela × cadastro, inclui trocas e ignora retirada no dia do óbito", () => {
    const alive = patient({
      clinical_data: {
        dispInvasivos: {
          vmInsercao: "2026-03-10", vmRetirada: "2026-03-12",
          vmTrocas: [{ insercao: "2026-03-14", retirada: "2026-03-16" }],
        },
      },
    });
    const dead = patient({
      status: "deceased", discharge_type: "Óbito", discharge_date: "2026-03-20",
      clinical_data: { dispInvasivos: { vmInsercao: "2026-03-10", vmRetirada: "2026-03-20" } },
    });
    const r = treatment([alive, dead], {
      devices: [{ patient_id: alive.id, device_type: "vm", insertion_date: "2026-03-10", removal_date: "2026-03-12" }],
    });
    expect(r.extubations).toBe(2);
  });

  it("extubação de outro mês não conta", () => {
    const p = patient({ clinical_data: { dispInvasivos: { vmInsercao: "2026-02-10", vmRetirada: "2026-02-28" } } });
    expect(treatment([p]).extubations).toBe(0);
  });
});
