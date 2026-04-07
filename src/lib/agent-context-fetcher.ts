import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches relevant Supabase data based on the agent type and user input keywords.
 * Extracts keywords from user input to filter queries for more relevant context.
 * Only fetches data the authenticated user has access to (RLS enforced).
 */

interface AgentContext {
  hospital?: Record<string, unknown>;
  patients?: Record<string, unknown>[];
  infection_cases?: Record<string, unknown>[];
  lab_results?: Record<string, unknown>[];
  audits?: Record<string, unknown>[];
  alerts?: Record<string, unknown>[];
  prescriptions?: Record<string, unknown>[];
  precautions?: Record<string, unknown>[];
  sectors?: Record<string, unknown>[];
  query_info?: {
    keywords: string[];
    date_filter?: string;
    sector_filter?: string;
  };
}

// Portuguese stopwords to remove from keyword extraction
const STOPWORDS = new Set([
  "a", "o", "e", "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas",
  "um", "uma", "uns", "umas", "com", "para", "por", "que", "se", "ao", "aos",
  "à", "às", "ou", "é", "são", "foi", "ser", "ter", "como", "mais", "mas",
  "já", "seu", "sua", "seus", "suas", "ele", "ela", "eles", "elas", "isso",
  "este", "esta", "esse", "essa", "aquele", "aquela", "qual", "quais",
  "quando", "onde", "quem", "quanto", "muito", "muita", "muitos", "muitas",
  "todo", "toda", "todos", "todas", "outro", "outra", "outros", "outras",
  "sobre", "entre", "até", "após", "antes", "durante", "desde",
  "me", "te", "lhe", "nos", "vos", "lhes", "meu", "minha", "teu", "tua",
  "nosso", "nossa", "vosso", "vossa", "não", "sim", "pode", "quero",
  "preciso", "gostaria", "favor", "obrigado", "obrigada", "olá", "oi",
  "tem", "tinha", "teve", "será", "seria", "poderia", "deve", "deveria",
  "está", "estão", "estava", "estavam", "foram", "sido", "sendo",
  "há", "houve", "havia", "haverá", "haveria",
  "fazer", "fez", "feito", "fazer", "gerar", "mostrar", "listar",
  "quero", "preciso", "me", "mostre", "diga", "explique", "analise",
]);

// Sector name aliases for matching
const SECTOR_ALIASES: Record<string, string[]> = {
  "UTI": ["uti", "terapia intensiva", "cti"],
  "UTI Adulto": ["uti adulto", "uti adulta"],
  "UTI Neonatal": ["uti neonatal", "uti neo", "neonatal", "neonato"],
  "UTI Pediátrica": ["uti pediátrica", "uti pediatrica", "uti ped"],
  "Emergência": ["emergência", "emergencia", "pronto socorro", "ps"],
  "Clínica Médica": ["clínica médica", "clinica medica"],
  "Clínica Cirúrgica": ["clínica cirúrgica", "clinica cirurgica", "cirurgia"],
  "Centro Cirúrgico": ["centro cirúrgico", "centro cirurgico", "cc"],
};

// Date-related keywords
const DATE_KEYWORDS: Record<string, () => string> = {
  "hoje": () => new Date().toISOString().split("T")[0],
  "ontem": () => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  },
  "semana": () => {
    const d = new Date(); d.setDate(d.getDate() - 7);
    return d.toISOString().split("T")[0];
  },
  "mês": () => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  },
  "mes": () => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  },
  "trimestre": () => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  },
  "semestre": () => {
    const d = new Date(); d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  },
  "ano": () => {
    const d = new Date(); d.setFullYear(d.getFullYear() - 1);
    return d.toISOString().split("T")[0];
  },
  "último mês": () => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  },
  "ultimo mes": () => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  },
  "último trimestre": () => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  },
  "ultimo trimestre": () => {
    const d = new Date(); d.setMonth(d.getMonth() - 3);
    return d.toISOString().split("T")[0];
  },
};

/**
 * Extracts meaningful keywords from user input, removing stopwords.
 */
function extractKeywords(input: string): string[] {
  const normalized = input.toLowerCase().replace(/[?!.,;:()]/g, " ");
  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  return words.filter(w => !STOPWORDS.has(w));
}

/**
 * Detects date range from input text. Returns ISO date string for "since" filter.
 */
function extractDateFilter(input: string): string | undefined {
  const lower = input.toLowerCase();
  // Check multi-word patterns first
  for (const [pattern, resolver] of Object.entries(DATE_KEYWORDS)) {
    if (lower.includes(pattern)) {
      return resolver();
    }
  }
  return undefined;
}

/**
 * Detects sector name from input text.
 */
function extractSectorFilter(input: string): string | undefined {
  const lower = input.toLowerCase();
  for (const [sectorName, aliases] of Object.entries(SECTOR_ALIASES)) {
    for (const alias of aliases) {
      if (lower.includes(alias)) {
        return sectorName;
      }
    }
  }
  return undefined;
}

// Define which tables each agent needs
const AGENT_DATA_NEEDS: Record<string, string[]> = {
  "trend-analyst": ["infection_cases", "lab_results", "patients", "sectors"],
  "risk-detector": ["patients", "infection_cases", "prescriptions", "precautions"],
  "report-generator": ["infection_cases", "patients", "audits", "lab_results", "alerts", "sectors"],
  "outbreak-alert": ["infection_cases", "lab_results", "alerts", "sectors"],
  "intervention-suggester": ["infection_cases", "audits", "prescriptions", "patients"],
  "dashboard-interpreter": ["infection_cases", "patients", "audits", "lab_results", "alerts"],
  "form-validator": ["patients", "sectors", "lab_results"],
  "anvisa-report": ["infection_cases", "patients", "audits", "lab_results", "sectors"],
  "micro-report": ["lab_results", "prescriptions", "sectors"],
  "quick-decision": ["infection_cases", "patients", "alerts", "prescriptions", "precautions"],
};

// === Filtered fetchers that accept keywords, date and sector filters ===

interface FetchFilters {
  keywords: string[];
  dateFrom?: string;
  sector?: string;
}

async function fetchHospitalInfo(): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("hospitals")
    .select("id, name, type, bed_count, city, state, status")
    .limit(1)
    .maybeSingle();
  return data;
}

async function fetchPatients(filters: FetchFilters): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from("patients")
    .select("id, full_name, gender, birth_date, admission_date, discharge_date, sector, bed, status, medical_record")
    .order("admission_date", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("admission_date", filters.dateFrom);
  }
  if (filters.sector) {
    query = query.ilike("sector", `%${filters.sector}%`);
  }

  const { data } = await query.limit(50);
  return data || [];
}

async function fetchInfectionCases(filters: FetchFilters): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from("infection_cases")
    .select("id, case_number, infection_type, infection_site, detection_date, confirmation_date, status, device_related, device_type, notes, patient_id")
    .order("detection_date", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("detection_date", filters.dateFrom);
  }

  // Filter by keywords in infection_type, infection_site, or notes
  if (filters.keywords.length > 0) {
    const orClauses = filters.keywords.flatMap(kw => [
      `infection_type.ilike.%${kw}%`,
      `infection_site.ilike.%${kw}%`,
      `notes.ilike.%${kw}%`,
    ]);
    query = query.or(orClauses.join(","));
  }

  const { data } = await query.limit(10);

  // If keyword filter returned too few results, fetch recent as fallback
  if ((!data || data.length < 3) && filters.keywords.length > 0) {
    const { data: fallback } = await supabase
      .from("infection_cases")
      .select("id, case_number, infection_type, infection_site, detection_date, confirmation_date, status, device_related, device_type, notes, patient_id")
      .order("detection_date", { ascending: false })
      .limit(10);
    return fallback || [];
  }

  return data || [];
}

async function fetchLabResults(filters: FetchFilters): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from("lab_results")
    .select("id, sample_type, collection_date, result_date, organism, status, notes, patient_id")
    .order("collection_date", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("collection_date", filters.dateFrom);
  }

  if (filters.keywords.length > 0) {
    const orClauses = filters.keywords.flatMap(kw => [
      `organism.ilike.%${kw}%`,
      `sample_type.ilike.%${kw}%`,
      `notes.ilike.%${kw}%`,
    ]);
    query = query.or(orClauses.join(","));
  }

  const { data } = await query.limit(10);

  if ((!data || data.length < 3) && filters.keywords.length > 0) {
    const { data: fallback } = await supabase
      .from("lab_results")
      .select("id, sample_type, collection_date, result_date, organism, status, notes, patient_id")
      .order("collection_date", { ascending: false })
      .limit(10);
    return fallback || [];
  }

  return data || [];
}

async function fetchAudits(filters: FetchFilters): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from("audits")
    .select("id, audit_type, sector, audit_date, total_items, compliant_items, compliance_rate, observations")
    .order("audit_date", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("audit_date", filters.dateFrom);
  }
  if (filters.sector) {
    query = query.ilike("sector", `%${filters.sector}%`);
  }

  if (filters.keywords.length > 0) {
    const orClauses = filters.keywords.flatMap(kw => [
      `observations.ilike.%${kw}%`,
      `sector.ilike.%${kw}%`,
    ]);
    query = query.or(orClauses.join(","));
  }

  const { data } = await query.limit(10);

  if ((!data || data.length < 3) && filters.keywords.length > 0) {
    const { data: fallback } = await supabase
      .from("audits")
      .select("id, audit_type, sector, audit_date, total_items, compliant_items, compliance_rate, observations")
      .order("audit_date", { ascending: false })
      .limit(10);
    return fallback || [];
  }

  return data || [];
}

async function fetchAlerts(filters: FetchFilters): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from("alerts")
    .select("id, title, description, severity, status, created_at")
    .order("created_at", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("created_at", filters.dateFrom);
  }

  if (filters.keywords.length > 0) {
    const orClauses = filters.keywords.flatMap(kw => [
      `title.ilike.%${kw}%`,
      `description.ilike.%${kw}%`,
    ]);
    query = query.or(orClauses.join(","));
  }

  const { data } = await query.limit(10);

  if ((!data || data.length < 3) && filters.keywords.length > 0) {
    const { data: fallback } = await supabase
      .from("alerts")
      .select("id, title, description, severity, status, created_at")
      .order("created_at", { ascending: false })
      .limit(10);
    return fallback || [];
  }

  return data || [];
}

async function fetchPrescriptions(filters: FetchFilters): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from("antimicrobial_prescriptions")
    .select("id, drug_name, dose, route, frequency, start_date, end_date, indication, is_active, patient_id")
    .order("start_date", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("start_date", filters.dateFrom);
  }

  if (filters.keywords.length > 0) {
    const orClauses = filters.keywords.flatMap(kw => [
      `drug_name.ilike.%${kw}%`,
      `indication.ilike.%${kw}%`,
    ]);
    query = query.or(orClauses.join(","));
  }

  const { data } = await query.limit(10);

  if ((!data || data.length < 3) && filters.keywords.length > 0) {
    const { data: fallback } = await supabase
      .from("antimicrobial_prescriptions")
      .select("id, drug_name, dose, route, frequency, start_date, end_date, indication, is_active, patient_id")
      .order("start_date", { ascending: false })
      .limit(10);
    return fallback || [];
  }

  return data || [];
}

async function fetchPrecautions(filters: FetchFilters): Promise<Record<string, unknown>[]> {
  let query = supabase
    .from("precautions")
    .select("id, precaution_type, reason, start_date, end_date, is_active, patient_id")
    .order("start_date", { ascending: false });

  if (filters.dateFrom) {
    query = query.gte("start_date", filters.dateFrom);
  }

  if (filters.keywords.length > 0) {
    const orClauses = filters.keywords.flatMap(kw => [
      `precaution_type.ilike.%${kw}%`,
      `reason.ilike.%${kw}%`,
    ]);
    query = query.or(orClauses.join(","));
  }

  const { data } = await query.limit(10);
  return data || [];
}

async function fetchSectors(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from("sectors")
    .select("id, name, type, bed_count, is_active")
    .eq("is_active", true);
  return data || [];
}

const FETCHERS: Record<string, (filters: FetchFilters) => Promise<unknown>> = {
  patients: fetchPatients,
  infection_cases: fetchInfectionCases,
  lab_results: fetchLabResults,
  audits: fetchAudits,
  alerts: fetchAlerts,
  prescriptions: fetchPrescriptions,
  precautions: fetchPrecautions,
  sectors: (_f: FetchFilters) => fetchSectors(),
};

/**
 * Fetches context data from Supabase relevant to a specific agent,
 * filtered by keywords extracted from the user's input.
 */
export async function fetchAgentContext(agentId: string, userInput?: string): Promise<AgentContext | null> {
  const needs = AGENT_DATA_NEEDS[agentId];
  if (!needs || needs.length === 0) return null;

  // Extract filters from user input
  const keywords = userInput ? extractKeywords(userInput) : [];
  const dateFrom = userInput ? extractDateFilter(userInput) : undefined;
  const sector = userInput ? extractSectorFilter(userInput) : undefined;

  const filters: FetchFilters = { keywords, dateFrom, sector };

  const context: AgentContext = {
    query_info: {
      keywords,
      date_filter: dateFrom,
      sector_filter: sector,
    },
  };

  // Always fetch hospital info
  const hospital = await fetchHospitalInfo();
  if (hospital) context.hospital = hospital;

  // Fetch all needed data in parallel with filters
  const results = await Promise.allSettled(
    needs.map(async (table) => {
      const fetcher = FETCHERS[table];
      if (!fetcher) return { table, data: [] };
      const data = await fetcher(filters);
      return { table, data };
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      const { table, data } = result.value;
      (context as Record<string, unknown>)[table] = data;
    }
  }

  return context;
}
