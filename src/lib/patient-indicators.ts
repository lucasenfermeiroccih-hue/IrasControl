/**
 * Indicadores complementares do Dashboard de Indicadores Operacionais
 * (/patients/dashboard-indicators): antimicrobianos, extubações, microrganismos e
 * internações por especialidade. Censo, paciente-dia, dispositivo-dia e desfechos
 * ficam em ctiIndicators.ts.
 *
 * Todo evento conta no mês/ano em que ocorreu (início do antibiótico, retirada da VM,
 * data do exame) — eventos de outros meses não entram na conta.
 */
import { isInSelectedMonths, parseFlexibleDate } from "./ctiIndicators";

interface DeviceSwap { insercao?: string | null; retirada?: string | null }

/** Campos de patients.clinical_data usados aqui (preenchidos em /patients/monitoring). */
export interface ClinicalData {
  dispInvasivos?: Record<string, string | DeviceSwap[] | null | undefined>;
  antibioticos?: Array<{ id?: string; nome?: string; antibiotico?: string; droga?: string; dataInicio?: string; dataFim?: string }>;
  labPanel?: Array<{ data?: string; microrganismo?: string }>;
}

export interface IndicatorPatient {
  id: string;
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

export const OTHER_SPECIALTY = "Outras especialidades";
export const NO_SPECIALTY = "Especialidade não informada";

const asText = (v: unknown) => (typeof v === "string" ? v : null);
const asSwaps = (v: unknown): DeviceSwap[] => (Array.isArray(v) ? v : []);
const normalizeName = (s: string) => s.trim().replace(/\s+/g, " ");

function isDeath(p: IndicatorPatient) {
  return p.status === "deceased" || (p.discharge_type || "").trim().toLowerCase() === "óbito";
}

function topN(counter: Record<string, number>, n: number) {
  return Object.entries(counter)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, n);
}

/**
 * Internações por especialidade. Especialidades fora da lista e não informadas
 * ganham linhas próprias, para que a soma feche com o total.
 */
export function buildSpecialtyData(admittedSpecialties: Array<string | null>, specialties: string[]) {
  const counts: Record<string, number> = {};
  specialties.forEach(s => { counts[s] = 0; });
  let other = 0;
  let missing = 0;
  admittedSpecialties.forEach(raw => {
    const spec = raw?.trim();
    if (!spec) missing++;
    else if (counts[spec] !== undefined) counts[spec]++;
    else other++;
  });
  if (other > 0) counts[OTHER_SPECIALTY] = other;
  if (missing > 0) counts[NO_SPECIALTY] = missing;
  return Object.entries(counts).map(([s, internacoes]) => ({
    name: s.length > 15 ? s.replace("Cirurgia ", "C. ") : s,
    fullName: s,
    internacoes,
  }));
}

/** Antibióticos da tabela + cadastro, sem duplicar os que o Monitoramento sincroniza. */
function collectAntibiotics(patients: IndicatorPatient[], prescriptions: IndicatorPrescription[]) {
  const items: Array<{ name: string; start: Date | null }> = [];
  const seenIds = new Set<string>();
  const seenKeys = new Set<string>();
  const push = (id: string | undefined, patientId: string, rawName: unknown, rawStart: string | null | undefined) => {
    if (id && seenIds.has(id)) return;
    const name = rawName ? normalizeName(String(rawName)) : "";
    const start = parseFlexibleDate(rawStart);
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

export function computeTreatmentIndicators(input: {
  patients: IndicatorPatient[];
  devices: IndicatorDevice[];
  prescriptions: IndicatorPrescription[];
  labResults: IndicatorLabResult[];
  months: number[];
  years: number[];
}) {
  const { patients, months, years } = input;
  const inPeriod = (d: Date | null) => isInSelectedMonths(d, months, years);
  const byId = new Map(patients.map(p => [p.id, p]));
  const devices = input.devices.filter(d => byId.has(d.patient_id));
  const prescriptions = input.prescriptions.filter(rx => byId.has(rx.patient_id));
  const labResults = input.labResults.filter(l => !!l.patient_id && byId.has(l.patient_id));

  // Antimicrobianos: um registro por prescrição, pela data de início.
  const antibiotics = collectAntibiotics(patients, prescriptions).filter(a => inPeriod(a.start));
  const abCounter: Record<string, number> = {};
  antibiotics.forEach(a => { if (a.name) abCounter[a.name] = (abCounter[a.name] || 0) + 1; });

  // Extubações: retiradas de VM (tabela + cadastro + trocas), uma por paciente/dia.
  // Retirada no dia do óbito não é extubação.
  const extubations = new Set<string>();
  const addExtubation = (patientId: string, rem: string | null | undefined) => {
    const p = byId.get(patientId);
    const d = parseFlexibleDate(rem);
    if (!p || !d || d.getFullYear() < 2000 || !inPeriod(d)) return;
    if (isDeath(p)) {
      const deathDate = parseFlexibleDate(p.discharge_date);
      if (deathDate && deathDate.getTime() === d.getTime()) return;
    }
    extubations.add(`${patientId}|${d.getTime()}`);
  };
  devices.filter(d => d.device_type === "vm").forEach(d => addExtubation(d.patient_id, d.removal_date));
  patients.forEach(p => {
    const di = p.clinical_data?.dispInvasivos;
    if (!di) return;
    addExtubation(p.id, asText(di.vmRetirada));
    addExtubation(p.id, asText(di.vmNovaRetirada));
    asSwaps(di.vmTrocas).forEach(t => addExtubation(p.id, t?.retirada));
  });

  // Microrganismos: tabela lab_results + painel laboratorial do cadastro.
  const orgCounter: Record<string, number> = {};
  const countOrganism = (org: unknown) => {
    const name = org ? normalizeName(String(org)) : "";
    if (name) orgCounter[name] = (orgCounter[name] || 0) + 1;
  };
  labResults.forEach(l => {
    const ref = parseFlexibleDate(l.result_date) || parseFlexibleDate(l.collection_date);
    if (inPeriod(ref)) countOrganism(l.organism);
  });
  patients.forEach(p => {
    const labs = p.clinical_data?.labPanel;
    if (!Array.isArray(labs)) return;
    labs.forEach(lab => {
      // Exame sem data: usa a entrada no CTI (ou a admissão) como referência
      const ref = parseFlexibleDate(lab?.data) || parseFlexibleDate(p.icu_admission_date || p.admission_date);
      if (inPeriod(ref)) countOrganism(lab?.microrganismo);
    });
  });

  return {
    abCount: antibiotics.length,
    topAntibiotics: topN(abCounter, 15),
    extubations: extubations.size,
    topOrganisms: topN(orgCounter, 15),
  };
}
