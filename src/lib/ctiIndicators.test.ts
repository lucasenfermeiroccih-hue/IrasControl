import { describe, it, expect } from "vitest";
import {
  computeCtiIndicators,
  normalizeDeviceEpisodes,
  type CtiPatientRow,
  type CtiFilter,
} from "./ctiIndicators";

// ---------------------------------------------------------------------------
// Helpers de construção de pacientes
// ---------------------------------------------------------------------------

let seq = 0;
function mkPatient(o: Partial<CtiPatientRow> = {}): CtiPatientRow {
  seq += 1;
  return {
    id: o.id ?? `p${seq}`,
    full_name: o.full_name ?? `Paciente ${seq}`,
    sector: o.sector ?? "UTI 1",
    specialty: o.specialty ?? "Clínica Médica",
    admission_date: o.admission_date ?? o.icu_admission_date ?? "2026-09-01",
    icu_admission_date: o.icu_admission_date ?? null,
    discharge_date: o.discharge_date ?? null,
    status: o.status ?? "active",
    discharge_type: o.discharge_type ?? null,
    clinical_data: o.clinical_data ?? { dispInvasivos: {} },
    updated_at: o.updated_at ?? null,
  };
}

/** clinical_data com dispositivos. Ex.: disp({ cvcInsercao: "...", cvcRetirada: "..." }) */
function disp(d: Record<string, any>) {
  return { dispInvasivos: d };
}

const SEP = [8]; // setembro (0-based)
const AUG = [7];
const Y = [2026];
function filter(o: Partial<CtiFilter> = {}): CtiFilter {
  return {
    months: o.months ?? SEP,
    years: o.years ?? Y,
    sectors: o.sectors ?? ["UTI 1"],
    today: o.today ?? new Date(2026, 9, 1), // 2026-10-01
  };
}

// ---------------------------------------------------------------------------
// 10 casos obrigatórios
// ---------------------------------------------------------------------------

describe("CTI indicators — casos obrigatórios", () => {
  it("1. admitido no mês anterior, presente o mês inteiro", () => {
    const p = mkPatient({ icu_admission_date: "2026-08-20" }); // ativo, sem alta
    const r = computeCtiIndicators([p], filter({ today: new Date(2026, 9, 5) }));
    expect(r.totals.ctiPatientDays).toBe(30); // setembro inteiro
    expect(r.totals.newAdmissions).toBe(0);   // entrou em agosto
    expect(r.totals.presentInMonth).toBe(1);
  });

  it("2. admissão e alta no mesmo mês", () => {
    const p = mkPatient({
      icu_admission_date: "2026-09-05", discharge_date: "2026-09-10",
      status: "discharged", discharge_type: "Alta",
    });
    const r = computeCtiIndicators([p], filter());
    expect(r.totals.ctiPatientDays).toBe(5); // 5..9 (dia da alta não conta)
    expect(r.totals.newAdmissions).toBe(1);
    expect(r.totals.discharges).toBe(1);
    expect(r.totals.deaths).toBe(0);
  });

  it("3. admissão em agosto, óbito em setembro", () => {
    const p = mkPatient({
      icu_admission_date: "2026-08-25", discharge_date: "2026-09-03",
      status: "deceased", discharge_type: "Óbito",
    });
    const aug = computeCtiIndicators([p], filter({ months: AUG }));
    expect(aug.totals.newAdmissions).toBe(1);
    expect(aug.totals.deaths).toBe(0);
    expect(aug.totals.ctiPatientDays).toBe(7); // 25..31 ago

    const sep = computeCtiIndicators([p], filter({ months: SEP }));
    expect(sep.totals.newAdmissions).toBe(0);
    expect(sep.totals.deaths).toBe(1);
    expect(sep.totals.ctiPatientDays).toBe(2); // 1..2 set (dia do óbito não conta)
  });

  it("4. internação em andamento — limita a hoje, sem dias futuros", () => {
    const p = mkPatient({ icu_admission_date: "2026-09-10", status: "active" });
    const r = computeCtiIndicators([p], filter({ today: new Date(2026, 8, 20) })); // 2026-09-20
    expect(r.totals.ctiPatientDays).toBe(11); // 10..20
    expect(r.totals.activeInCti).toBe(1);
    expect(r.totals.newAdmissions).toBe(1);
  });

  it("5. VM/SVD/CVC cruzando a virada de mês — só a parte do mês filtrado", () => {
    const d = { insercao: "2026-08-28", retirada: "2026-09-03" };
    const p = mkPatient({
      icu_admission_date: "2026-08-20",
      clinical_data: disp({
        vmInsercao: d.insercao, vmRetirada: d.retirada,
        svuInsercao: d.insercao, svuRetirada: d.retirada,
        cvcInsercao: d.insercao, cvcRetirada: d.retirada,
      }),
    });
    const r = computeCtiIndicators([p], filter());
    expect(r.totals.deviceDays.vm).toBe(2);  // 1,2 set (dia da retirada não conta)
    expect(r.totals.deviceDays.svu).toBe(2);
    expect(r.totals.deviceDays.cvc).toBe(2);
  });

  it("6. retirada + reinstalação com intervalo sem uso", () => {
    const p = mkPatient({
      icu_admission_date: "2026-09-01",
      clinical_data: disp({
        cvcInsercao: "2026-09-01", cvcRetirada: "2026-09-05",      // 1..4 = 4
        cvcTrocas: [{ insercao: "2026-09-10", retirada: "2026-09-12" }], // 10..11 = 2
      }),
    });
    const r = computeCtiIndicators([p], filter());
    expect(r.totals.deviceDays.cvc).toBe(6); // 4 + 2, gap 5..9 fora
  });

  it("7. dois CVC sobrepostos na mesma data contam 1 CVC-dia", () => {
    const p = mkPatient({
      icu_admission_date: "2026-09-01",
      clinical_data: disp({
        cvcInsercao: "2026-09-05", cvcRetirada: "2026-09-08",      // 5..7
        cvcTrocas: [{ insercao: "2026-09-07", retirada: "2026-09-10" }], // 7..9 (sobrepõe)
      }),
    });
    const r = computeCtiIndicators([p], filter());
    expect(r.totals.deviceDays.cvc).toBe(5); // união 5..9, dia 7 contado 1x
  });

  it("8. transferência entre CTIs — atribuído ao setor atual (limitação)", () => {
    const p = mkPatient({ sector: "UTI 2", icu_admission_date: "2026-09-02" });
    const r = computeCtiIndicators([p], filter({ sectors: ["UTI 1"] }));
    expect(r.perPatient.length).toBe(0); // não reconstrói permanência na UTI 1
    expect(r.totals.ctiPatientDays).toBe(0);

    // Transferência é distinta de alta
    const t = mkPatient({
      sector: "UTI 1", icu_admission_date: "2026-09-01", discharge_date: "2026-09-10",
      status: "transferred", discharge_type: "Transferência",
    });
    const rt = computeCtiIndicators([t], filter());
    expect(rt.totals.transfers).toBe(1);
    expect(rt.totals.discharges).toBe(0);
    expect(rt.totals.deaths).toBe(0);
  });

  it("9. readmissão no mesmo mês conta 2 episódios; duplicado exato conta 1", () => {
    const a = mkPatient({ full_name: "João", icu_admission_date: "2026-09-02", discharge_date: "2026-09-05", status: "discharged", discharge_type: "Alta" });
    const b = mkPatient({ full_name: "João", icu_admission_date: "2026-09-20", status: "active" });
    const readm = computeCtiIndicators([a, b], filter());
    expect(readm.totals.newAdmissions).toBe(2);

    const dup1 = mkPatient({ full_name: "Maria", icu_admission_date: "2026-09-03" });
    const dup2 = mkPatient({ full_name: "Maria", icu_admission_date: "2026-09-03" });
    const dup = computeCtiIndicators([dup1, dup2], filter());
    expect(dup.totals.newAdmissions).toBe(1);
    expect(dup.dataQualitySummary.DUPLICATE_EPISODE).toBe(1);
  });

  it("10. fevereiro bissexto (29 dias) e virada dez→jan", () => {
    const feb = mkPatient({ icu_admission_date: "2024-02-01", status: "active" });
    const rFeb = computeCtiIndicators([feb], filter({ months: [1], years: [2024], today: new Date(2024, 2, 10) }));
    expect(rFeb.totals.ctiPatientDays).toBe(29);

    const cross = mkPatient({ icu_admission_date: "2025-12-28", discharge_date: "2026-01-03", status: "discharged", discharge_type: "Alta" });
    const rCross = computeCtiIndicators([cross], filter({ months: [11, 0], years: [2025, 2026], today: new Date(2026, 1, 1) }));
    expect(rCross.totals.ctiPatientDays).toBe(6); // 28..31 dez + 1..2 jan
  });
});

// ---------------------------------------------------------------------------
// Qualidade de dado
// ---------------------------------------------------------------------------

describe("CTI indicators — qualidade de dado", () => {
  it("retirada anterior à inserção → em andamento + flag", () => {
    const p = mkPatient({
      icu_admission_date: "2026-09-01", status: "active",
      clinical_data: disp({ vmInsercao: "2026-09-10", vmRetirada: "2026-09-05" }),
    });
    const r = computeCtiIndicators([p], filter({ today: new Date(2026, 8, 15) }));
    expect(r.dataQualitySummary.DEVICE_REMOVAL_BEFORE_INSERTION).toBe(1);
    expect(r.totals.deviceDays.vm).toBe(6); // 10..15 (em andamento, cap hoje)
  });

  it("alta anterior à entrada no CTI → clampa + flag", () => {
    const p = mkPatient({ icu_admission_date: "2026-09-10", discharge_date: "2026-09-05", status: "discharged", discharge_type: "Alta" });
    const r = computeCtiIndicators([p], filter());
    expect(r.dataQualitySummary.DISCHARGE_BEFORE_ADMISSION).toBe(1);
    expect(r.totals.ctiPatientDays).toBe(1);
  });

  it("sem icu_admission_date → 0 paciente-dia + flag (não zera em silêncio)", () => {
    const p = mkPatient({ icu_admission_date: null, status: "active" });
    const r = computeCtiIndicators([p], filter());
    expect(r.totals.ctiPatientDays).toBe(0);
    expect(r.dataQualitySummary.MISSING_ICU_ADMISSION).toBe(1);
  });

  it("inserção com ano<2000 → clampa na entrada do CTI + flag", () => {
    const p = mkPatient({
      icu_admission_date: "2026-09-01", status: "active",
      clinical_data: disp({ cvcInsercao: "0206-03-19", cvcRetirada: "" }),
    });
    const r = computeCtiIndicators([p], filter({ today: new Date(2026, 8, 10) }));
    expect(r.dataQualitySummary.INVALID_DATE).toBe(1);
    expect(r.totals.deviceDays.cvc).toBe(10); // 1..10 set
  });

  it("dispositivo usado fora da permanência no CTI → conta só interseção + flag", () => {
    const p = mkPatient({
      icu_admission_date: "2026-09-01", status: "active",
      clinical_data: disp({
        cvcInsercao: "2026-09-01", cvcRetirada: "2026-09-10",
        cvcTrocas: [{ insercao: "2026-08-25", retirada: "2026-08-28" }], // antes do CTI
      }),
    });
    const r = computeCtiIndicators([p], filter({ months: [7, 8], today: new Date(2026, 9, 1) }));
    expect(r.totals.deviceDays.cvc).toBe(9); // só 1..9 set (ago fora da permanência)
    expect(r.dataQualitySummary.DEVICE_OUTSIDE_CTI_STAY).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Normalização de episódios (unidade)
// ---------------------------------------------------------------------------

describe("CTI indicators — censo (dia da saída não conta)", () => {
  it("entrada e saída no mesmo dia contam 1 dia; troca no mesmo dia não perde dia", () => {
    const same = mkPatient({ icu_admission_date: "2026-09-10", discharge_date: "2026-09-10", status: "discharged", discharge_type: "Alta" });
    expect(computeCtiIndicators([same], filter()).totals.ctiPatientDays).toBe(1);

    const swap = mkPatient({
      icu_admission_date: "2026-09-01", discharge_date: "2026-09-11", status: "discharged", discharge_type: "Alta",
      clinical_data: disp({ cvcInsercao: "2026-09-01", cvcRetirada: "2026-09-05", cvcTrocas: [{ insercao: "2026-09-05", retirada: "2026-09-11" }] }),
    });
    const r = computeCtiIndicators([swap], filter());
    expect(r.totals.ctiPatientDays).toBe(10); // 1..10
    expect(r.totals.deviceDays.cvc).toBe(10); // 1..4 + 5..10
  });

  it("ativo sem atualização há mais de 30 dias continua contando, mas é sinalizado", () => {
    const stale = mkPatient({ icu_admission_date: "2026-06-10", status: "active", updated_at: "2026-06-30T12:00:00Z" });
    const fresh = mkPatient({ icu_admission_date: "2026-06-10", status: "active", updated_at: "2026-09-29T12:00:00Z" });
    const r = computeCtiIndicators([stale, fresh], filter());
    expect(r.totals.ctiPatientDays).toBe(60);
    expect(r.dataQualitySummary.STALE_ACTIVE).toBe(1);
  });
});

describe("normalizeDeviceEpisodes", () => {
  it("une episódio base + trocas sobrepostos", () => {
    const eps = normalizeDeviceEpisodes(
      disp({ cvcInsercao: "2026-09-05", cvcRetirada: "2026-09-08", cvcTrocas: [{ insercao: "2026-09-07", retirada: "2026-09-10" }] }),
      "cvc", new Date(2026, 8, 1),
    );
    expect(eps.length).toBe(1);
    expect(eps[0].end?.getDate()).toBe(10);
  });

  it("episódio com retirada é autoritativo (descarta em-andamento conflitante)", () => {
    const eps = normalizeDeviceEpisodes(
      disp({ cvcInsercao: "2026-09-01", cvcRetirada: "2026-09-05", cvcNovaInsercao: "2026-09-01", cvcNovaRetirada: "" }),
      "cvc", new Date(2026, 8, 1),
    );
    // o em-andamento iniciado antes da última retirada é cópia do mesmo dispositivo
    expect(eps).toHaveLength(1);
    expect(eps.every((e) => e.closed)).toBe(true);
  });

  it("novo dispositivo em uso, inserido após a última retirada, continua contando", () => {
    const eps = normalizeDeviceEpisodes(
      disp({ cvcInsercao: "2026-09-01", cvcRetirada: "2026-09-05", cvcTrocas: [{ insercao: "2026-09-20", retirada: "" }] }),
      "cvc", new Date(2026, 8, 1),
    );
    expect(eps).toHaveLength(2);
    expect(eps[1]).toMatchObject({ start: new Date(2026, 8, 20), end: null, closed: false });
  });
});
