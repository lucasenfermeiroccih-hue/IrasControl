// Antibiogram storage layer — localStorage now, Supabase later

export interface AntibiogramRecord {
  id: string;
  collectionDate: string;
  sampleId: string;
  sector: string;
  patientId: string;
  organism: string;
  site: string;
  results: {
    antibiotic: string;
    method: string;
    value: string;
    sir: "S" | "I" | "R";
  }[];
  detectedPhenotypes: string[];
  createdAt: string;
}

const STORAGE_KEY = "antibiogram-registros";

export function salvarAntibiograma(record: AntibiogramRecord): void {
  const existing = listarAntibiogramas();
  existing.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function listarAntibiogramas(): AntibiogramRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function limparAntibiogramas(): void {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Mock data for dashboard development ──

export function getMockAntibiogramas(): AntibiogramRecord[] {
  const sectors = ["UTI Adulto", "UTI Neonatal", "Clínica Médica", "Clínica Cirúrgica", "Pronto Socorro", "Emergência"];
  const organisms = [
    "Staphylococcus aureus", "Klebsiella pneumoniae", "Escherichia coli",
    "Pseudomonas aeruginosa", "Acinetobacter baumannii", "Enterococcus faecalis",
    "Enterococcus faecium", "Serratia marcescens", "Proteus mirabilis",
    "Candida albicans",
  ];
  const sites = ["Sangue (Hemocultura)", "Urina (Urocultura)", "Secreção traqueal", "Ponta de cateter", "Líquor", "Ferida operatória"];
  const antibiotics = [
    "Amicacina", "Ampicilina", "Cefepima", "Ceftriaxona", "Ciprofloxacino",
    "Gentamicina", "Imipenem", "Meropenem", "Oxacilina", "Piperacilina/Tazobactam",
    "Vancomicina", "Colistina", "Linezolida", "Daptomicina", "Tigeciclina",
  ];
  const phenotypes = ["MRSA", "VRE", "KPC", "ESBL", ""];

  const records: AntibiogramRecord[] = [];
  const now = new Date();

  for (let i = 0; i < 85; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const org = organisms[Math.floor(Math.random() * organisms.length)];
    const numResults = 4 + Math.floor(Math.random() * 6);
    const usedAbs = new Set<string>();
    const results: AntibiogramRecord["results"] = [];

    for (let j = 0; j < numResults; j++) {
      let ab: string;
      do { ab = antibiotics[Math.floor(Math.random() * antibiotics.length)]; } while (usedAbs.has(ab));
      usedAbs.add(ab);
      const sirOptions: ("S" | "I" | "R")[] = ["S", "S", "S", "I", "R", "R"];
      results.push({
        antibiotic: ab,
        method: Math.random() > 0.5 ? "Disco-difusão (Kirby-Bauer)" : "CIM (Concentração Inibitória Mínima)",
        value: String(Math.round(Math.random() * 30 + 2)),
        sir: sirOptions[Math.floor(Math.random() * sirOptions.length)],
      });
    }

    const dp = phenotypes[Math.floor(Math.random() * phenotypes.length)];

    records.push({
      id: `mock-${i}`,
      collectionDate: date.toISOString().slice(0, 10),
      sampleId: `LAB-${date.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
      sector: sectors[Math.floor(Math.random() * sectors.length)],
      patientId: `PAC-${String(Math.floor(Math.random() * 500) + 1).padStart(3, "0")}`,
      organism: org,
      site: sites[Math.floor(Math.random() * sites.length)],
      results,
      detectedPhenotypes: dp ? [dp] : [],
      createdAt: date.toISOString(),
    });
  }

  return records;
}

export function getAntibiogramasParaDashboard(): AntibiogramRecord[] {
  const saved = listarAntibiogramas();
  return saved.length > 0 ? saved : getMockAntibiogramas();
}
