/**
 * ctiIndicators — cálculo centralizado dos indicadores mensais do CTI (UTI).
 *
 * Fonte de dados: linhas da tabela `patients` (mesma origem do Monitoramento de
 * Pacientes). Este módulo é PURO (sem I/O) e determinístico — a "data de hoje"
 * é injetável via `filter.today` para testes.
 *
 * CONVENÇÕES (confirmadas com a instituição):
 *  - Censo diário (padrão ANVISA): conta o dia de entrada no CTI e NÃO conta o dia
 *    de saída/alta/óbito/transferência. Entrada 01/09 e saída 03/09 = 2 dias;
 *    entra e sai no mesmo dia = 1 dia. Mesma regra para dispositivos: conta o dia
 *    da inserção e não conta o dia da retirada (inserção e retirada no mesmo dia = 1).
 *  - Internações em andamento são limitadas a `today` (sem dias futuros).
 *  - Mês = intervalo semiaberto [1º dia 00:00, 1º dia do mês seguinte), expresso
 *    aqui como iteração de dias civis do dia 1 até o último dia (inclusive).
 *  - Datas são comparadas como DATAS CIVIS ("YYYY-MM-DD"), sem conversão para UTC.
 *  - Máximo de 1 paciente-dia por data e 1 dispositivo-dia por tipo por data
 *    (garantido por Set de chaves de dia).
 *
 * ESCOPO CTI:
 *  - O período no CTI é [icu_admission_date, discharge_date || today], atribuído
 *    ao `sector` ATUAL do paciente. (Limitação: não há histórico de permanência
 *    por setor; transferências entre CTIs não são reconstruíveis.)
 *  - Pacientes em setor de CTI SEM `icu_admission_date` contribuem 0 paciente-dia
 *    e recebem a flag MISSING_ICU_ADMISSION (não são zerados em silêncio).
 *  - Pacientes "ativos" sem atualização há mais de 30 dias continuam contando, mas
 *    recebem a flag STALE_ACTIVE (provável alta não lançada no Monitoramento).
 */

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface CtiPatientRow {
  id: string;
  full_name: string;
  sector: string | null;
  specialty: string | null;
  admission_date: string;            // admissão hospitalar "YYYY-MM-DD"
  icu_admission_date: string | null; // entrada no CTI
  discharge_date: string | null;
  status: string;                    // 'active' | 'discharged' | 'deceased' | 'transferred'
  discharge_type: string | null;     // 'Alta' | 'Óbito' | 'Transferência' | ...
  clinical_data: any;                // dispInvasivos, antibioticos, labPanel
  updated_at?: string | null;        // última atualização do cadastro
}

export interface CtiFilter {
  months: number[];    // 0-11
  years: number[];     // ano completo (ex.: 2026)
  sectors: string[];   // CTIs selecionados; [] => todos os setores presentes nos dados
  today?: Date;        // "hoje" injetável (default: new Date())
}

/** Dispositivos cobertos pelo dashboard. Extensível a cvp/tqt/hemo/picc/cuv/cva. */
export type DeviceType = "vm" | "svu" | "cvc";
export const DEVICE_TYPES: DeviceType[] = ["vm", "svu", "cvc"];

export type DataQualityCode =
  | "MISSING_ICU_ADMISSION"          // em setor de CTI mas sem data de entrada no CTI
  | "DISCHARGE_BEFORE_ADMISSION"     // alta/saída anterior à entrada no CTI
  | "DEVICE_REMOVAL_BEFORE_INSERTION"// retirada anterior à inserção
  | "DEVICE_OUTSIDE_CTI_STAY"        // uso de dispositivo fora da permanência no CTI
  | "DUPLICATE_EPISODE"              // registro duplicado do mesmo episódio
  | "INVALID_DATE"                   // data ausente/ano<2000/não-parseável
  | "MISSING_DISCHARGE_FOR_CLOSED_STATUS" // status fechado sem data de saída
  | "STALE_ACTIVE";                  // ativo sem atualização há mais de 30 dias

/** Dias sem atualização a partir dos quais um paciente ativo é sinalizado. */
export const STALE_ACTIVE_DAYS = 30;

export interface DataQualityFlag {
  code: DataQualityCode;
  patientId: string;
  patientName: string;
  detail?: string;
}

export interface CtiPatientBreakdown {
  id: string;
  name: string;
  sector: string | null;
  specialty: string | null;
  icuAdmission: string | null;
  discharge: string | null;
  ctiPatientDays: number;
  isNewAdmission: boolean;
  isDischarge: boolean;   // Alta no mês
  isDeath: boolean;       // Óbito no mês
  isTransfer: boolean;    // Transferência no mês
  isActive: boolean;      // status ativo e presente no mês
  presentAtPeriodEnd: boolean; // no CTI no último dia do período (ou hoje, se não terminou)
  deviceDays: Record<DeviceType, number>;
  flags: DataQualityCode[];
}

export interface CtiIndicators {
  totals: {
    newAdmissions: number;
    presentInMonth: number;          // pacientes com >=1 paciente-dia no CTI no mês (censo)
    carriedOver: number;             // presentes no mês, mas com entrada no CTI antes do período
    ctiPatientDays: number;
    discharges: number;              // só Alta
    deaths: number;                  // Óbito
    transfers: number;               // distinto de alta
    activeInCti: number;             // status ativo presente no mês
    stillAdmittedAtEnd: number;      // no CTI no último dia do período
    deviceDays: Record<DeviceType, number>;
  };
  perPatient: CtiPatientBreakdown[];
  dataQuality: DataQualityFlag[];
  dataQualitySummary: Record<DataQualityCode, number>;
  meta: { months: number[]; years: number[]; sectors: string[]; today: string };
}

// ---------------------------------------------------------------------------
// Helpers de data civil (sem UTC)
// ---------------------------------------------------------------------------

/** Parse "YYYY-MM-DD" (ou ISO) como data LOCAL/civil, evitando deslocamento de fuso. */
export function parseCivilDate(s?: string | null): Date | null {
  if (!s) return null;
  const datePart = String(s).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : startOfCivilDay(d);
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Parse flexível: dd/mm/yyyy, yyyy-mm-dd, ISO. */
export function parseFlexibleDate(s?: string | null): Date | null {
  if (!s) return null;
  const str = String(s).trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  return parseCivilDate(str);
}

export function startOfCivilDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

export function dayKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isValidCivilDate(d: Date | null): d is Date {
  return !!d && !isNaN(d.getTime()) && d.getFullYear() >= 2000;
}

function maxDate(a: Date, b: Date): Date { return a > b ? a : b; }
function minDate(a: Date, b: Date): Date { return a < b ? a : b; }

/** Um mês selecionado como intervalo de dias civis inclusivos [1º dia, último dia]. */
export interface MonthInterval { start: Date; endIncl: Date; }

/** Produto cartesiano ano × mês → intervalos de dias civis. */
export function selectedMonthIntervals(months: number[], years: number[]): MonthInterval[] {
  const out: MonthInterval[] = [];
  years.forEach((y) => {
    months.forEach((m) => {
      out.push({
        start: new Date(y, m, 1, 0, 0, 0, 0),
        endIncl: new Date(y, m + 1, 0, 0, 0, 0, 0), // dia 0 do mês seguinte = último dia deste mês
      });
    });
  });
  return out;
}

/** Pertence a algum mês/ano selecionado (comparação civil). */
export function isInSelectedMonths(d: Date | null | undefined, months: number[], years: number[]): boolean {
  if (!d || isNaN(d.getTime())) return false;
  return months.includes(d.getMonth()) && years.includes(d.getFullYear());
}

/**
 * Conjunto de dias civis em ([start, end] ∩ intervalos de mês ∩ [,today]).
 * `end` nulo = em andamento (limita a `today`). Inclusivo nas duas pontas.
 */
function daysInIntervals(start: Date | null, end: Date | null, intervals: MonthInterval[], today: Date): Set<string> {
  const set = new Set<string>();
  if (!start) return set;
  let realEnd = end ?? today;
  if (realEnd > today) realEnd = today; // sem dias futuros
  const s = startOfCivilDay(start);
  const e = startOfCivilDay(realEnd);
  if (s > e) return set;
  for (const iv of intervals) {
    const from = maxDate(s, iv.start);
    const to = minDate(e, iv.endIncl);
    if (from > to) continue;
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    while (cursor <= to) {
      set.add(dayKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return set;
}

/**
 * Último dia que entra no censo de uma permanência/uso que começa em `start` e
 * termina em `exit`: o dia da saída não conta (exit − 1), exceto quando entrada e
 * saída são no mesmo dia (conta 1). `exit` nulo = em andamento (null).
 */
export function lastCensusDay(start: Date, exit: Date | null): Date | null {
  if (!exit) return null;
  if (exit <= start) return start;
  return new Date(exit.getFullYear(), exit.getMonth(), exit.getDate() - 1);
}

// ---------------------------------------------------------------------------
// Episódios de dispositivo
// ---------------------------------------------------------------------------

export interface DeviceEpisode {
  start: Date;
  end: Date | null;   // null = em uso (em andamento)
  closed: boolean;    // true = retirada válida registrada
}

/**
 * Normaliza os episódios de um dispositivo a partir de `clinical_data.dispInvasivos`:
 *   {tipo}Insercao/{tipo}Retirada (1º episódio) + {tipo}Trocas[] + legado {tipo}Nova*.
 * - retirada "" / ausente → em andamento (closed=false).
 * - inserção com ano<2000 → clampa início em `patientStart` (flag INVALID_DATE).
 * - retirada inválida / anterior à inserção → trata como em andamento (flag).
 * - política "episódio com retirada é autoritativo": episódios em andamento que
 *   começaram antes da última retirada registrada são cópias desatualizadas e
 *   são descartados (evita inflar quando há conflito de fontes). Um episódio em
 *   andamento inserido DEPOIS da última retirada é um novo dispositivo e conta.
 * - une intervalos sobrepostos/encostados (dedupe de dispositivos simultâneos).
 */
export function normalizeDeviceEpisodes(
  clinicalData: any,
  type: DeviceType,
  patientStart: Date | null,
  onFlag?: (code: DataQualityCode, detail?: string) => void,
): DeviceEpisode[] {
  const di = clinicalData?.dispInvasivos;
  if (!di) return [];

  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const insKey = `${type}Insercao`;
  const remKey = `${type}Retirada`;
  const novaInsKey = `${type}NovaInsercao`;
  const novaRemKey = `${type}NovaRetirada`;
  const trocasKey = `${type}Trocas`;

  const raw: Array<{ ins?: string | null; rem?: string | null }> = [
    { ins: di[insKey], rem: di[remKey] },
    { ins: di[novaInsKey], rem: di[novaRemKey] },
  ];
  const trocas = Array.isArray(di[trocasKey]) ? di[trocasKey] : [];
  trocas.forEach((t: any) => raw.push({ ins: t?.insercao, rem: t?.retirada }));

  const episodes: DeviceEpisode[] = [];
  for (const { ins, rem } of raw) {
    if (!ins) continue;
    const rawStart = parseCivilDate(ins);
    if (!rawStart) { onFlag?.("INVALID_DATE", `${cap(type)} inserção inválida: "${ins}"`); continue; }
    let start = rawStart;
    if (!isValidCivilDate(rawStart)) {
      if (!patientStart) { onFlag?.("INVALID_DATE", `${cap(type)} inserção ano<2000 sem base: "${ins}"`); continue; }
      start = patientStart;
      onFlag?.("INVALID_DATE", `${cap(type)} inserção ano<2000 "${ins}" → usa entrada no CTI`);
    }

    let end: Date | null = null;
    let closed = false;
    if (rem && String(rem) !== "") {
      const rawEnd = parseCivilDate(rem);
      if (!isValidCivilDate(rawEnd) || (rawEnd as Date) < start) {
        onFlag?.("DEVICE_REMOVAL_BEFORE_INSERTION", `${cap(type)} retirada "${rem}" < inserção "${ins}"`);
        end = null; closed = false;
      } else {
        end = rawEnd; closed = true;
      }
    }
    episodes.push({ start, end, closed });
  }

  if (episodes.length === 0) return [];

  // Política: em-andamento iniciado até a última retirada é descartado; o inserido
  // depois dela (novo dispositivo ainda em uso) é mantido.
  const closedOnes = episodes.filter((e) => e.closed);
  const lastRemoval = closedOnes.reduce<Date | null>(
    (max, e) => (e.end && (!max || e.end > max) ? e.end : max), null);
  const effective = lastRemoval
    ? [...closedOnes, ...episodes.filter((e) => !e.closed && e.start > lastRemoval)]
    : episodes;

  // Une intervalos sobrepostos/encostados (dedupe diário entre episódios).
  return mergeEpisodes(effective);
}

function mergeEpisodes(episodes: DeviceEpisode[]): DeviceEpisode[] {
  const sorted = [...episodes].sort((a, b) => a.start.getTime() - b.start.getTime());
  const merged: DeviceEpisode[] = [];
  for (const ep of sorted) {
    const last = merged[merged.length - 1];
    if (!last) { merged.push({ ...ep }); continue; }
    const lastEnd = last.end; // null = aberto (vai até o futuro)
    // sobrepõe/encosta se o próximo é inserido até o dia da retirada do anterior
    // (o dia da retirada não conta; reinserção no mesmo dia mantém a continuidade)
    const touches = lastEnd === null || ep.start.getTime() <= lastEnd.getTime();
    if (touches) {
      if (lastEnd === null || ep.end === null) {
        last.end = null; last.closed = last.closed && ep.closed && false;
      } else if (ep.end > lastEnd) {
        last.end = ep.end; last.closed = ep.closed;
      }
    } else {
      merged.push({ ...ep });
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Cálculo principal
// ---------------------------------------------------------------------------

function episodeKey(p: CtiPatientRow): string {
  return `${(p.full_name || "").trim().toLowerCase()}|${p.icu_admission_date || ""}|${p.sector || ""}`;
}

function allSectors(patients: CtiPatientRow[]): string[] {
  const set = new Set<string>();
  patients.forEach((p) => { if (p.sector) set.add(p.sector); });
  return Array.from(set);
}

/** Pacientes elegíveis (no CTI selecionado) com >=1 paciente-dia no mês filtrado. */
export function selectEligibleInMonth(patients: CtiPatientRow[], filter: CtiFilter): CtiPatientRow[] {
  const result = computeCtiIndicators(patients, filter);
  const presentIds = new Set(result.perPatient.filter((b) => b.ctiPatientDays > 0).map((b) => b.id));
  return patients.filter((p) => presentIds.has(p.id));
}

export function computeCtiIndicators(patients: CtiPatientRow[], filter: CtiFilter): CtiIndicators {
  const months = filter.months.length ? Array.from(new Set(filter.months)).sort((a, b) => a - b) : [];
  const years = filter.years.length ? Array.from(new Set(filter.years)).sort((a, b) => a - b) : [];
  const sectors = filter.sectors.length ? filter.sectors : allSectors(patients);
  const today = startOfCivilDay(filter.today ?? new Date());
  const intervals = selectedMonthIntervals(months, years);
  // Último dia já ocorrido do período filtrado (para "internados ao fim do período").
  const lastIntervalEnd = intervals.reduce<Date | null>((max, iv) => (!max || iv.endIncl > max ? iv.endIncl : max), null);
  const periodEndKey = lastIntervalEnd ? dayKey(minDate(lastIntervalEnd, today)) : null;

  const dataQuality: DataQualityFlag[] = [];
  const addFlag = (p: CtiPatientRow, code: DataQualityCode, detail?: string) =>
    dataQuality.push({ code, patientId: p.id, patientName: p.full_name, detail });

  // Elegíveis = no CTI selecionado (setor atual). Dedupe de episódios duplicados.
  const sectorSet = new Set(sectors);
  const seen = new Set<string>();
  const eligible: CtiPatientRow[] = [];
  for (const p of patients) {
    if (!p.sector || !sectorSet.has(p.sector)) continue;
    const key = episodeKey(p);
    if (seen.has(key)) {
      addFlag(p, "DUPLICATE_EPISODE", `Episódio duplicado (${key})`);
      continue;
    }
    seen.add(key);
    eligible.push(p);
  }

  const perPatient: CtiPatientBreakdown[] = [];
  const totals = {
    newAdmissions: 0, presentInMonth: 0, carriedOver: 0, ctiPatientDays: 0,
    discharges: 0, deaths: 0, transfers: 0, activeInCti: 0, stillAdmittedAtEnd: 0,
    deviceDays: { vm: 0, svu: 0, cvc: 0 } as Record<DeviceType, number>,
  };

  for (const p of eligible) {
    const patientFlags: DataQualityCode[] = [];
    const flag = (code: DataQualityCode, detail?: string) => { patientFlags.push(code); addFlag(p, code, detail); };

    const icuStart = parseCivilDate(p.icu_admission_date);
    let ctiDays = new Set<string>();

    if (!icuStart) {
      flag("MISSING_ICU_ADMISSION", "Sem data de entrada no CTI (icu_admission_date)");
    } else {
      let stayEnd = p.discharge_date ? parseCivilDate(p.discharge_date) : null;
      if (stayEnd && stayEnd < icuStart) {
        flag("DISCHARGE_BEFORE_ADMISSION", `Saída "${p.discharge_date}" < entrada CTI "${p.icu_admission_date}"`);
        stayEnd = icuStart; // clampa: episódio de 1 dia
      }
      ctiDays = daysInIntervals(icuStart, lastCensusDay(icuStart, stayEnd), intervals, today);
    }

    // Desfechos — pela data efetiva (discharge_date) dentro do mês.
    const dischargeDate = parseCivilDate(p.discharge_date);
    const isClosedStatus = p.status === "discharged" || p.status === "deceased" || p.status === "transferred"
      || p.discharge_type === "Alta" || p.discharge_type === "Óbito" || p.discharge_type === "Transferência";
    if (isClosedStatus && !dischargeDate) {
      flag("MISSING_DISCHARGE_FOR_CLOSED_STATUS", "Status fechado sem data de saída");
    }
    const lastUpdate = parseCivilDate(p.updated_at);
    if (p.status === "active" && !dischargeDate && lastUpdate
      && today.getTime() - lastUpdate.getTime() > STALE_ACTIVE_DAYS * 86400000) {
      flag("STALE_ACTIVE", `Ativo sem atualização desde ${dayKey(lastUpdate)}`);
    }
    const dischargeInMonth = isInSelectedMonths(dischargeDate, months, years);
    const isDeath = dischargeInMonth && (p.status === "deceased" || p.discharge_type === "Óbito");
    const isTransfer = dischargeInMonth && !isDeath && (p.status === "transferred" || p.discharge_type === "Transferência");
    const isDischarge = dischargeInMonth && !isDeath && !isTransfer && (p.status === "discharged" || p.discharge_type === "Alta");

    const isNewAdmission = isInSelectedMonths(icuStart, months, years);
    const isActive = p.status === "active" && ctiDays.size > 0;
    const presentAtPeriodEnd = !!periodEndKey && ctiDays.has(periodEndKey)
      && !(dischargeDate && dayKey(dischargeDate) === periodEndKey); // saiu nesse dia = já é desfecho

    // Dispositivos: (episódios ∩ permanência no CTI ∩ mês ∩ [,today]).
    const deviceDays: Record<DeviceType, number> = { vm: 0, svu: 0, cvc: 0 };
    if (icuStart) {
      for (const type of DEVICE_TYPES) {
        const episodes = normalizeDeviceEpisodes(p.clinical_data, type, icuStart, flag);
        const epDays = new Set<string>();
        for (const ep of episodes) {
          for (const d of daysInIntervals(ep.start, lastCensusDay(ep.start, ep.end), intervals, today)) epDays.add(d);
        }
        // interseção com a permanência no CTI
        let count = 0;
        let outside = 0;
        for (const d of epDays) {
          if (ctiDays.has(d)) count++;
          else outside++;
        }
        if (outside > 0) flag("DEVICE_OUTSIDE_CTI_STAY", `${type.toUpperCase()}: ${outside} dia(s) fora da permanência no CTI`);
        deviceDays[type] = count;
      }
    }

    perPatient.push({
      id: p.id, name: p.full_name, sector: p.sector, specialty: p.specialty,
      icuAdmission: p.icu_admission_date, discharge: p.discharge_date,
      ctiPatientDays: ctiDays.size, isNewAdmission, isDischarge, isDeath, isTransfer, isActive, presentAtPeriodEnd,
      deviceDays, flags: patientFlags,
    });

    totals.ctiPatientDays += ctiDays.size;
    if (ctiDays.size > 0) totals.presentInMonth++;
    if (ctiDays.size > 0 && !isNewAdmission) totals.carriedOver++;
    if (presentAtPeriodEnd) totals.stillAdmittedAtEnd++;
    if (isNewAdmission) totals.newAdmissions++;
    if (isDischarge) totals.discharges++;
    if (isDeath) totals.deaths++;
    if (isTransfer) totals.transfers++;
    if (isActive) totals.activeInCti++;
    totals.deviceDays.vm += deviceDays.vm;
    totals.deviceDays.svu += deviceDays.svu;
    totals.deviceDays.cvc += deviceDays.cvc;
  }

  const dataQualitySummary = dataQuality.reduce((acc, f) => {
    acc[f.code] = (acc[f.code] || 0) + 1;
    return acc;
  }, {} as Record<DataQualityCode, number>);

  return {
    totals,
    perPatient,
    dataQuality,
    dataQualitySummary,
    meta: { months, years, sectors, today: dayKey(today) },
  };
}

// ---------------------------------------------------------------------------
// Adaptadores para o relatório PDF (fonte única com os cards)
// ---------------------------------------------------------------------------

export interface ReportKpi { label: string; value: string; sub?: string }
export interface ReportTable { title: string; headers: string[]; rows: string[][] }

export function toReportKpis(ind: CtiIndicators): ReportKpi[] {
  const t = ind.totals;
  return [
    { label: "Total de Internações", value: String(t.newAdmissions), sub: "entrada no CTI no mês" },
    { label: "Paciente-Dia", value: String(t.ctiPatientDays) },
    { label: "Altas", value: String(t.discharges) },
    { label: "Óbitos", value: String(t.deaths) },
    { label: "VM Pac-Dia", value: String(t.deviceDays.vm) },
    { label: "CVC Pac-Dia", value: String(t.deviceDays.cvc) },
    { label: "SVD Pac-Dia", value: String(t.deviceDays.svu) },
  ];
}

/** Conferência por paciente (admissão, alta, óbito, paciente-dia, VM/SVD/CVC-dia). */
export function toConferenceTable(ind: CtiIndicators): ReportTable {
  return {
    title: "Conferência por Paciente",
    headers: ["Paciente", "Setor", "Entrada CTI", "Saída", "Pac-Dia", "Nova Adm.", "Alta", "Óbito", "VM", "SVD", "CVC"],
    rows: ind.perPatient
      .filter((b) => b.ctiPatientDays > 0 || b.isNewAdmission || b.isDischarge || b.isDeath || b.isTransfer)
      .map((b) => [
        b.name, b.sector || "—", b.icuAdmission || "—", b.discharge || "—",
        String(b.ctiPatientDays), b.isNewAdmission ? "Sim" : "", b.isDischarge ? "Sim" : "",
        b.isDeath ? "Sim" : "", String(b.deviceDays.vm), String(b.deviceDays.svu), String(b.deviceDays.cvc),
      ]),
  };
}
