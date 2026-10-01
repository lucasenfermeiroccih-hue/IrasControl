import { describe, expect, it } from "vitest";
import {
  computePatientIndicators,
  parseDate,
  NO_SPECIALTY,
  OTHER_SPECIALTY,
  type IndicatorPatient,
} from "./patient-indicators";

const TODAY = new Date(2026, 9, 1); // 01/10/2026
const MARCH = 2;
const SPECIALTIES = ["Clínica médica", "Cirurgia Geral"];

let seq = 0;
function patient(overrides: Partial<IndicatorPatient>): IndicatorPatient {
  seq++;
  return {
    id: `p${seq}`,
    full_name: `Paciente ${seq}`,
    sector: "UTI",
    specialty: "Clínica médica",
    admission_date: "2026-03-10",
    icu_admission_date: null,
    discharge_date: null,
    status: "active",
    discharge_type: null,
    clinical_data: {},
    ...overrides,
  };
}

function run(patients: IndicatorPatient[], extra: Partial<Parameters<typeof computePatientIndicators>[0]> = {}) {
  return computePatientIndicators({
    patients,
    devices: [],
    prescriptions: [],
    labResults: [],
    months: [MARCH],
    years: [2026],
    specialties: SPECIALTIES,
    today: TODAY,
    ...extra,
  });
}

describe("parseDate", () => {
  it("aceita ISO, ISO com hora e DD/MM/AAAA como data local", () => {
    expect(parseDate("2026-03-05")).toEqual(new Date(2026, 2, 5));
    expect(parseDate("2026-03-05T10:00:00Z")).toEqual(new Date(2026, 2, 5));
    expect(parseDate("05/03/2026")).toEqual(new Date(2026, 2, 5));
    expect(parseDate("31/02/2026")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("filtro por mês", () => {
  it("internações contam só quem foi admitido no mês; arrastados entram só no paciente-dia", () => {
    const fromFebruary = patient({ admission_date: "2026-02-20", discharge_date: "2026-03-05", status: "discharged", discharge_type: "Alta" });
    const inMarch = patient({ admission_date: "2026-03-30", discharge_date: "2026-04-03", status: "discharged", discharge_type: "Alta" });
    const r = run([fromFebruary, inMarch]);

    expect(r.totalAdmitted).toBe(1);
    expect(r.newAdmissions).toBe(1);
    expect(r.carriedOver).toBe(1);
    // fevereiro: 01..05/03 = 5 dias (inclui o dia da alta); inMarch: 30 e 31/03 = 2 dias
    expect(r.totalPatientDays).toBe(7);
    // alta do inMarch foi em abril: não conta em março
    expect(r.discharges).toBe(1);
  });

  it("paciente com UTI em mês diferente da admissão conta uma única vez, no mês da admissão", () => {
    const p = patient({ admission_date: "2026-02-25", icu_admission_date: "2026-03-02" });
    expect(run([p]).totalAdmitted).toBe(0);
    expect(run([p], { months: [1] }).totalAdmitted).toBe(1);
    expect(run([p], { months: [1, MARCH] }).totalAdmitted).toBe(1);
  });

  it("paciente-dia inclui o dia da admissão e o dia da alta", () => {
    const p = patient({ admission_date: "2026-03-01", discharge_date: "2026-03-03", status: "discharged" });
    expect(run([p]).totalPatientDays).toBe(3);
  });
});

describe("especialidades", () => {
  it("inclui outras e não informadas, fechando o total", () => {
    const r = run([
      patient({ specialty: "Clínica médica" }),
      patient({ specialty: "Cardiologia" }),
      patient({ specialty: null }),
    ]);
    const sum = r.specialtyData.reduce((s, x) => s + x.internacoes, 0);
    expect(sum).toBe(r.totalAdmitted);
    expect(r.specialtyData.find(s => s.fullName === OTHER_SPECIALTY)?.internacoes).toBe(1);
    expect(r.specialtyData.find(s => s.fullName === NO_SPECIALTY)?.internacoes).toBe(1);
  });
});

describe("dispositivo-dia", () => {
  it("novo dispositivo sem retirada inserido após a última retirada continua contando", () => {
    const p = patient({
      admission_date: "2026-02-01",
      clinical_data: {
        dispInvasivos: {
          cvcInsercao: "2026-02-01", cvcRetirada: "2026-02-20",
          cvcTrocas: [{ insercao: "2026-03-25", retirada: "" }],
        },
      },
    });
    // 25..31/03 = 7 dias
    expect(run([p]).cvcDays).toBe(7);
  });

  it("registro aberto desatualizado (anterior à retirada) é descartado", () => {
    const p = patient({
      admission_date: "2026-03-01",
      clinical_data: { dispInvasivos: { cvcInsercao: "2026-03-01", cvcRetirada: "2026-03-05" } },
    });
    const r = run([p], {
      devices: [{ patient_id: p.id, device_type: "cvc", insertion_date: "2026-03-01", removal_date: null }],
    });
    expect(r.cvcDays).toBe(5);
  });

  it("conta apenas os dias do mês filtrado", () => {
    const p = patient({
      admission_date: "2026-02-25",
      clinical_data: { dispInvasivos: { vmInsercao: "2026-02-25", vmRetirada: "2026-03-02" } },
    });
    expect(run([p]).vmDays).toBe(2);
  });
});

describe("antibióticos", () => {
  it("não duplica o antibiótico sincronizado entre cadastro e tabela", () => {
    const p = patient({
      clinical_data: { antibioticos: [{ id: "atb1", nome: "Meropenem", dataInicio: "2026-03-11", dataFim: "" }] },
    });
    const r = run([p], {
      prescriptions: [{ id: "atb1", patient_id: p.id, drug_name: "Meropenem", start_date: "2026-03-11" }],
    });
    expect(r.abCount).toBe(1);
    expect(r.topAntibiotics).toEqual([{ name: "Meropenem", value: 1 }]);
  });

  it("antibiótico iniciado no mês anterior não conta", () => {
    const p = patient({
      clinical_data: { antibioticos: [{ id: "a", nome: "Cefepime", dataInicio: "2026-02-27", dataFim: "" }] },
    });
    expect(run([p]).abCount).toBe(0);
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
    const r = run([alive, dead], {
      devices: [{ patient_id: alive.id, device_type: "vm", insertion_date: "2026-03-10", removal_date: "2026-03-12" }],
    });
    expect(r.extubations).toBe(2);
    expect(r.deaths).toBe(1);
  });
});

describe("desfechos", () => {
  it("'internados' considera o fim do período filtrado, não hoje", () => {
    const leftInApril = patient({ admission_date: "2026-03-10", discharge_date: "2026-04-02", status: "discharged" });
    const leftInMarch = patient({ admission_date: "2026-03-10", discharge_date: "2026-03-15", status: "transferred", discharge_type: "Transferência" });
    const r = run([leftInApril, leftInMarch]);
    expect(r.stillAdmitted).toBe(1);
    expect(r.transfers).toBe(1);
    expect(r.discharges).toBe(0);
  });
});
