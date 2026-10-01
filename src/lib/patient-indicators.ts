/**
 * Cálculo dos Indicadores Operacionais de Pacientes (/patients/dashboard-indicators).
 *
 * Regras gerais:
 * - Todo indicador é restrito aos meses/anos filtrados. Eventos (admissão, alta,
 *   óbito, início de antibiótico, extubação, exame) contam no mês em que ocorreram.
 * - Contagens por dia (paciente-dia e dispositivo-dia) contam apenas os dias que
 *   caem dentro do mês filtrado, incluindo o dia da entrada e o dia da alta.
 * - Início da internação = data de admissão hospitalar (ou a data de UTI, quando
 *   esta for anterior por erro de digitação). Usado em todos os indicadores.
 */

interface DeviceSwap { insercao?: string | null; retirada?: string | null }

/** Campos de patients.clinical_data usados aqui (preenchidos em /patients/monitoring). */
export interface ClinicalData {
  dispInvasivos?: Record<string, string | DeviceSwap[] | null | undefined>;
  antibioticos?: Array<{ id?: string; nome?: string; antibiotico?: string; droga?: string; dataInicio?: string; dataFim?: string }>;
  labPanel?: Array<{ data?: string; microrganismo?: string }>;
}

export interface IndicatorPatient {
  id: string;
  full_name: string;
  sector: string | null;
  specialty: string | null;
  admission_date: string;
  icu_admission_date: string | null;
  discharge_date: string | null;
  status: string;
  discharge_type: string | null;
  clinical_data: ClinicalData | null;
}

export interface IndicatorDevice {
  patient_id: string;
  device_type: string;
  insertion_date: string | null;
  removal_date: string | null;
}

export interface IndicatorPrescription {
  id: string;
  patient_id: string;
  drug_name: string | null;
  start_date: string | null;
}

export interface IndicatorLabResult {
  id: string;
  patient_id: string | null;
  organism: string | null;
  collection_date: string | null;
  result_date: string | null;
}

export interface Period {
  start: Date;
  end: Date;
}

export interface PatientBreakdownRow {
  id: string;
  name: string;
  days: number;
}

export const OTHER_SPECIALTY = "Outras especialidades";
export const NO_SPECIALTY = "Especialidade não informada";

/** Datas com ano anterior a este são tratadas como erro de digitação. */
const MIN_VALID_YEAR = 2000;

/** Aceita "YYYY-MM-DD", ISO com hora e "DD/MM/YYYY"; sempre como data LOCAL. */
export function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const str = String(s).trim();
  if (!str) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(str);
  if (iso) return validDate(Number(iso[1]), Number(iso[2]), Number(iso[3]));
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  if (br) return validDate(Number(br[3]), Number(br[2]), Number(br[1]));
  return null;
}

function validDate(y: number, m: number, d: number): Date | null {
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return date;
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isPlausible(d: Date | null): d is Date {
  return !!d && d.getFullYear() >= MIN_VALID_YEAR;
}

const asText = (v: unknown) => (typeof v === "string" ? v : null);
const asSwaps = (v: unknown): DeviceSwap[] => (Array.isArray(v) ? v : []);

const normalizeName = (s: string) => s.trim().replace(/\s+/g, " ");
const lower = (s: string | null | undefined) => (s || "").trim().toLowerCase();

export function isDeath(p: IndicatorPatient) {
  return p.status === "deceased" || lower(p.discharge_type) === "óbito";
}

export function isTransfer(p: IndicatorPatient) {
  return !isDeath(p) && (p.status === "transferred" || lower(p.discharge_type) === "transferência");
}

export function isDischarge(p: IndicatorPatient) {
  return !isDeath(p) && !isTransfer(p) && (p.status === "discharged" || lower(p.discharge_type) === "alta");
}

/** Início da internação: admissão hospitalar, ou a data de UTI se esta for anterior. */
export function getPatientStart(p: IndicatorPatient): Date | null {
  const adm = parseDate(p.admission_date);
  const icu = parseDate(p.icu_admission_date);
  if (adm && icu) return icu < adm ? icu : adm;
  return adm || icu;
}

/** Fim da internação: data de alta; sem alta, o paciente segue internado até hoje. */
export function getPatientEnd(p: IndicatorPatient, today: Date): Date | null {
  const start = getPatientStart(p);
  if (!start) return null;
  const discharge = parseDate(p.discharge_date);
  if (!discharge) return startOfDay(today);
  // Alta anterior à admissão é erro de digitação: considera apenas o dia da admissão.
  return discharge < start ? start : discharge;
}

/** Um intervalo [início, fim] por combinação de mês × ano filtrada. */
export function buildPeriods(months: number[], years: number[]): Period[] {
  const periods: Period[] = [];
  [...years].sort((a, b) => a - b).forEach(y => {
    [...months].sort((a, b) => a - b).forEach(m => {
      periods.push({ start: new Date(y, m, 1), end: new Date(y, m + 1, 0) });
    });
  });
  return periods;
}

function inPeriods(d: Date | null, periods: Period[]) {
  if (!d) return false;
  const day = startOfDay(d);
  return periods.some(p => day >= p.start && day <= p.end);
}

/** Todos os dias civis dos períodos que já aconteceram (até hoje). */
function periodDays(periods: Period[], today: Date): Date[] {
  const limit = startOfDay(today);
  const days: Date[] = [];
  periods.forEach(({ start, end }) => {
    const cursor = new Date(start);
    while (cursor <= end && cursor <= limit) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  });
  return days;
}

interface DeviceRange { s: Date; e: Date; closed: boolean }

/**
 * Intervalos de uso de um tipo de dispositivo, juntando a tabela patient_devices
 * e o clinical_data.dispInvasivos (campos legados NovaInsercao/NovaRetirada e Trocas[]).
 */
function deviceRanges(
  p: IndicatorPatient,
  devices: IndicatorDevice[],
  type: string,
  patStart: Date,
  today: Date,
): DeviceRange[] {
  const ranges: DeviceRange[] = [];
  const add = (ins?: string | null, rem?: string | null) => {
    const rawS = parseDate(ins);
    if (!rawS) return;
    // Inserção com ano inválido → usa o início da internação
    const s = isPlausible(rawS) ? rawS : patStart;
    const rawE = parseDate(rem);
    // Retirada ausente, com ano inválido ou anterior à inserção → dispositivo ativo
    if (isPlausible(rawE) && rawE >= s) ranges.push({ s, e: rawE, closed: true });
    else ranges.push({ s, e: startOfDay(today), closed: false });
  };

  devices
    .filter(d => d.patient_id === p.id && d.device_type === type)
    .forEach(d => add(d.insertion_date, d.removal_date));

  const di = p.clinical_data?.dispInvasivos;
  if (di) {
    add(asText(di[`${type}Insercao`]), asText(di[`${type}Retirada`]));
    add(asText(di[`${type}NovaInsercao`]), asText(di[`${type}NovaRetirada`]));
    asSwaps(di[`${type}Trocas`]).forEach(t => add(t?.insercao, t?.retirada));
  }

  // Registros sem retirada que começaram antes da última retirada registrada são
  // cópias desatualizadas do mesmo dispositivo (ex.: tabela nova sem retirada ×
  // cadastro com retirada) e são descartados. Um dispositivo sem retirada inserido
  // DEPOIS da última retirada é um novo dispositivo e continua contando.
  const closed = ranges.filter(r => r.closed);
  if (closed.length === 0) return ranges;
  const lastRemoval = closed.reduce((max, r) => (r.e > max ? r.e : max), closed[0].e);
  return [...closed, ...ranges.filter(r => !r.closed && r.s > lastRemoval)];
}

function countDeviceDays(
  patients: IndicatorPatient[],
  devices: IndicatorDevice[],
  type: string,
  days: Date[],
  today: Date,
) {
  let total = 0;
  const perPatient: PatientBreakdownRow[] = [];
  patients.forEach(p => {
    const patStart = getPatientStart(p);
    const patEnd = getPatientEnd(p, today);
    if (!patStart || !patEnd) return;
    const ranges = deviceRanges(p, devices, type, patStart, today);
    if (ranges.length === 0) return;
    let pDays = 0;
    days.forEach(day => {
      if (day < patStart || day > patEnd) return;
      if (ranges.some(r => day >= r.s && day <= r.e)) pDays++;
    });
    if (pDays > 0) {
      total += pDays;
      perPatient.push({ id: p.id, name: p.full_name, days: pDays });
    }
  });
  return { total, perPatient };
}

/** Antibióticos da tabela + clinical_data, sem duplicar os que o monitoramento sincroniza. */
function collectAntibiotics(patients: IndicatorPatient[], prescriptions: IndicatorPrescription[]) {
  const items: Array<{ name: string; start: Date | null }> = [];
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const push = (id: string | undefined, patientId: string, rawName: unknown, rawStart: string | null | undefined) => {
    if (id && seenIds.has(id)) return;
    const name = rawName ? normalizeName(String(rawName)) : "";
    const start = parseDate(rawStart);
    const key = `${patientId}|${name.toLowerCase()}|${start ? start.getTime() : ""}`;
    if (seenKeys.has(key)) return;
    if (id) seenIds.add(id);
    seenKeys.add(key);
    items.push({ name, start });
  };

  prescriptions.forEach(rx => push(rx.id, rx.patient_id, rx.drug_name, rx.start_date));
  patients.forEach(p => {
    const atbs = p.clinical_data?.antibioticos;
    if (!Array.isArray(atbs)) return;
    atbs.forEach(a => push(a?.id, p.id, a?.nome || a?.antibiotico || a?.droga, a?.dataInicio));
  });
  return items;
}

/** Retiradas de VM (extubações), uma por paciente/dia, sem contar retirada por óbito. */
function countExtubations(patients: IndicatorPatient[], devices: IndicatorDevice[], periods: Period[]) {
  const byId = new Map(patients.map(p => [p.id, p]));
  const seen = new Set<string>();
  const add = (patientId: string, rem: string | null | undefined) => {
    const p = byId.get(patientId);
    const d = parseDate(rem);
    if (!p || !isPlausible(d) || !inPeriods(d, periods)) return;
    if (isDeath(p)) {
      const deathDate = parseDate(p.discharge_date);
      if (deathDate && deathDate.getTime() === d.getTime()) return;
    }
    seen.add(`${patientId}|${d.getTime()}`);
  };

  devices.filter(d => d.device_type === "vm").forEach(d => add(d.patient_id, d.removal_date));
  patients.forEach(p => {
    const di = p.clinical_data?.dispInvasivos;
    if (!di) return;
    add(p.id, asText(di.vmRetirada));
    add(p.id, asText(di.vmNovaRetirada));
    asSwaps(di.vmTrocas).forEach(t => add(p.id, t?.retirada));
  });
  return seen.size;
}

function topN(counter: Record<string, number>, n: number) {
  return Object.entries(counter)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

export function computePatientIndicators(input: {
  patients: IndicatorPatient[];
  devices: IndicatorDevice[];
  prescriptions: IndicatorPrescription[];
  labResults: IndicatorLabResult[];
  months: number[];
  years: number[];
  specialties: string[];
  today?: Date;
}) {
  const { patients, specialties } = input;
  const today = input.today ?? new Date();
  const periods = buildPeriods(input.months, input.years);
  const days = periodDays(periods, today);
  const patientIds = new Set(patients.map(p => p.id));
  const devices = input.devices.filter(d => patientIds.has(d.patient_id));
  const prescriptions = input.prescriptions.filter(rx => patientIds.has(rx.patient_id));
  const labResults = input.labResults.filter(l => !!l.patient_id && patientIds.has(l.patient_id));

  // Internações = pacientes cuja internação COMEÇOU no período filtrado.
  const admitted = patients.filter(p => inPeriods(getPatientStart(p), periods));

  // Pacientes que já estavam internados ao início do período (vindos de meses
  // anteriores). Não somam nas internações, mas seus dias no mês contam no paciente-dia.
  const firstPeriodStart = periods.length ? periods[0].start : null;
  const carriedOver = firstPeriodStart
    ? patients.filter(p => {
        const s = getPatientStart(p);
        const e = getPatientEnd(p, today);
        return !!s && !!e && s < firstPeriodStart && e >= firstPeriodStart && !inPeriods(s, periods);
      }).length
    : 0;

  const bySpecialty: Record<string, number> = {};
  specialties.forEach(s => { bySpecialty[s] = 0; });
  let otherSpecialty = 0;
  let noSpecialty = 0;
  admitted.forEach(p => {
    const spec = p.specialty?.trim();
    if (!spec) noSpecialty++;
    else if (bySpecialty[spec] !== undefined) bySpecialty[spec]++;
    else otherSpecialty++;
  });
  const specialtyNames = [
    ...specialties,
    ...(otherSpecialty > 0 ? [OTHER_SPECIALTY] : []),
    ...(noSpecialty > 0 ? [NO_SPECIALTY] : []),
  ];
  const specialtyCount = (s: string) =>
    s === OTHER_SPECIALTY ? otherSpecialty : s === NO_SPECIALTY ? noSpecialty : bySpecialty[s] || 0;
  const specialtyData = specialtyNames.map(s => ({
    name: s.length > 15 ? s.replace("Cirurgia ", "C. ") : s,
    fullName: s,
    internacoes: specialtyCount(s),
  }));

  const endedInPeriod = (p: IndicatorPatient) => inPeriods(parseDate(p.discharge_date), periods);
  const deaths = patients.filter(p => isDeath(p) && endedInPeriod(p)).length;
  const discharges = patients.filter(p => isDischarge(p) && endedInPeriod(p)).length;
  const transfers = patients.filter(p => isTransfer(p) && endedInPeriod(p)).length;

  // Ainda internados no último dia do período (ou hoje, se o período não terminou).
  const lastDay = days.length ? days[days.length - 1] : null;
  const stillAdmitted = lastDay
    ? patients.filter(p => {
        const s = getPatientStart(p);
        if (!s || s > lastDay) return false;
        const discharge = parseDate(p.discharge_date);
        return !discharge || discharge > lastDay;
      }).length
    : 0;

  // Paciente-dia: cada dia do período em que o paciente esteve internado,
  // incluindo o dia da entrada e o dia da alta.
  let totalPatientDays = 0;
  patients.forEach(p => {
    const s = getPatientStart(p);
    const e = getPatientEnd(p, today);
    if (!s || !e) return;
    days.forEach(day => { if (day >= s && day <= e) totalPatientDays++; });
  });

  const cvc = countDeviceDays(patients, devices, "cvc", days, today);
  const svu = countDeviceDays(patients, devices, "svu", days, today);
  const vm = countDeviceDays(patients, devices, "vm", days, today);

  const antibioticsInPeriod = collectAntibiotics(patients, prescriptions).filter(a => inPeriods(a.start, periods));
  const abCounter: Record<string, number> = {};
  antibioticsInPeriod.forEach(a => { if (a.name) abCounter[a.name] = (abCounter[a.name] || 0) + 1; });

  const orgCounter: Record<string, number> = {};
  const countOrganism = (org: unknown) => {
    const name = org ? normalizeName(String(org)) : "";
    if (name) orgCounter[name] = (orgCounter[name] || 0) + 1;
  };
  labResults.forEach(l => {
    const ref = parseDate(l.result_date) || parseDate(l.collection_date);
    if (inPeriods(ref, periods)) countOrganism(l.organism);
  });
  patients.forEach(p => {
    const labs = p.clinical_data?.labPanel;
    if (!Array.isArray(labs)) return;
    labs.forEach(lab => {
      // Exame sem data: usa o início da internação como referência
      const ref = parseDate(lab?.data) || getPatientStart(p);
      if (inPeriods(ref, periods)) countOrganism(lab?.microrganismo);
    });
  });

  const outcomeData = [
    { name: "Altas", value: discharges, color: "hsl(168, 66%, 34%)" },
    { name: "Óbitos", value: deaths, color: "hsl(0, 70%, 50%)" },
    { name: "Transferências", value: transfers, color: "hsl(45, 80%, 50%)" },
    { name: "Internados ao fim do período", value: stillAdmitted, color: "hsl(210, 60%, 50%)" },
  ].filter(d => d.value > 0);

  return {
    specialtyData,
    totalAdmitted: admitted.length,
    newAdmissions: admitted.length,
    carriedOver,
    deaths,
    discharges,
    transfers,
    stillAdmitted,
    totalPatientDays,
    cvcDays: cvc.total,
    svuDays: svu.total,
    vmDays: vm.total,
    cvcBreakdown: cvc.perPatient,
    svuBreakdown: svu.perPatient,
    vmBreakdown: vm.perPatient,
    abCount: antibioticsInPeriod.length,
    extubations: countExtubations(patients, devices, periods),
    outcomeData,
    topAntibiotics: topN(abCounter, 15),
    topOrganisms: topN(orgCounter, 15),
  };
}

export type PatientIndicators = ReturnType<typeof computePatientIndicators>;
