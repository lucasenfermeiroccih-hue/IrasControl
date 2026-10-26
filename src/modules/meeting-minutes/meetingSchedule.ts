/**
 * Reuniões: local (lista), sala online (Google Meet), gravação (Google Drive),
 * próximas reuniões (alerta) e agrupamento por dia (calendário).
 */
import type { Meeting } from "./types";

/** Valor gravado em `location` quando a reunião é online (sala no Google Meet). */
export const ONLINE_LOCATION = "Online (Google Meet)";
/** Local gravado que não está na lista (ex.: lista alterada depois); exibido como texto livre. */
export const OTHER_LOCATION = "Outro";

/** Locais do hospital (lista suspensa). Local gravado fora da lista é tratado como "Outro". */
export const LOCATION_OPTIONS = [
  "Sala da CCIH",
  "Auditório",
  "NEP",
  ONLINE_LOCATION,
];

/** Opção da lista correspondente a um local salvo (local livre → "Outro"). */
export function locationOption(location?: string | null): string {
  if (!location) return "";
  return LOCATION_OPTIONS.includes(location) ? location : OTHER_LOCATION;
}

export function isOnlineMeeting(m: Pick<Meeting, "location" | "online_link">): boolean {
  return m.location === ONLINE_LOCATION || !!m.online_link;
}

/** Acrescenta https:// quando o link foi colado sem protocolo. */
export function normalizeUrl(raw?: string | null): string {
  const s = (raw || "").trim();
  if (!s) return "";
  return /^https?:\/\//i.test(s) ? s : `https://${s}`;
}

function hostOf(url: string): string | null {
  try { return new URL(url).hostname.toLowerCase(); } catch { return null; }
}

/** Link de sala do Google Meet (meet.google.com/xxx-xxxx-xxx ou outro caminho do Meet). */
export function isMeetLink(raw?: string | null): boolean {
  const url = normalizeUrl(raw);
  if (!url) return false;
  const host = hostOf(url);
  if (host !== "meet.google.com") return false;
  return new URL(url).pathname.length > 1;
}

/** Link de arquivo/pasta do Google Drive (drive.google.com ou docs.google.com). */
export function isDriveLink(raw?: string | null): boolean {
  const url = normalizeUrl(raw);
  if (!url) return false;
  const host = hostOf(url);
  return host === "drive.google.com" || host === "docs.google.com";
}

const NOT_UPCOMING = new Set(["cancelled", "completed", "minutes_generated", "under_review", "approved"]);

function civil(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Reuniões agendadas de hoje até `days` dias à frente (inclusive), em ordem de
 * data e horário. Ignora canceladas e as já realizadas (ata gerada/aprovada).
 */
export function upcomingMeetings<T extends Pick<Meeting, "scheduled_date" | "start_time" | "status">>(
  meetings: T[],
  today: Date,
  days = 7,
): T[] {
  const from = civil(today);
  const limit = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days);
  const to = civil(limit);
  return meetings
    .filter((m) => m.scheduled_date && m.scheduled_date >= from && m.scheduled_date <= to && !NOT_UPCOMING.has(m.status))
    .sort((a, b) =>
      (a.scheduled_date! + (a.start_time || "99:99")).localeCompare(b.scheduled_date! + (b.start_time || "99:99")));
}

/** Reuniões agrupadas por dia ("YYYY-MM-DD"), sem as canceladas. */
export function meetingsByDay<T extends Pick<Meeting, "scheduled_date" | "start_time" | "status">>(meetings: T[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const m of meetings) {
    if (!m.scheduled_date || m.status === "cancelled") continue;
    (out[m.scheduled_date] ??= []).push(m);
  }
  Object.values(out).forEach((list) => list.sort((a, b) => (a.start_time || "").localeCompare(b.start_time || "")));
  return out;
}

/** Semanas do mês para o calendário (domingo a sábado); null = dia fora do mês. */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(civil(new Date(year, month, d)));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export { civil as civilDate };
