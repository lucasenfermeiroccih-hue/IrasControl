/**
 * Normalizes sector names to a single canonical form.
 * "UTI 1", "UTI 2", "UTI 3" (without "Adulto") are aliases of
 * "UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto" respectively.
 * All variants are collapsed so dashboards and filters show only one entry.
 */
export function normalizeSector(s: string | null | undefined): string {
  if (!s) return "Sem setor";
  const t = s.trim();
  // "UTI 1 Adulto" → "UTI 1",  "UTI 2 Adulto" → "UTI 2", etc.
  const numbered = t.match(/^UTI\s+(\d+)\s+Adulto\s*$/i);
  if (numbered) return `UTI ${numbered[1]}`;
  // "UTI Adulto" (sem número) → "UTI"
  if (/^UTI\s+Adulto\s*$/i.test(t)) return "UTI";
  return t;
}

/** Builds a deduplicated, sorted sector list from an array of raw audit rows. */
export function buildSectorOptions(audits: Array<{ sector: string | null }>): string[] {
  return Array.from(new Set(audits.map(a => normalizeSector(a.sector)))).sort();
}
