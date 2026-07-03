/**
 * Normalizes sector names to a single canonical form.
 * "UTI 1", "UTI 2", "UTI 3" (without "Adulto") are aliases of
 * "UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto" respectively.
 * All variants are collapsed so dashboards and filters show only one entry.
 */
export function normalizeSector(s: string | null | undefined): string {
  if (!s) return "Sem setor";
  // "UTI 1" → "UTI 1 Adulto", "UTI 2" → "UTI 2 Adulto", etc.
  const m = s.trim().match(/^UTI\s+(\d+)\s*$/i);
  if (m) return `UTI ${m[1]} Adulto`;
  return s.trim();
}

/** Builds a deduplicated, sorted sector list from an array of raw audit rows. */
export function buildSectorOptions(audits: Array<{ sector: string | null }>): string[] {
  return Array.from(new Set(audits.map(a => normalizeSector(a.sector)))).sort();
}
