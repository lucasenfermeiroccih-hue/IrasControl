import { supabase } from "@/integrations/supabase/client";

/**
 * Fetches relevant Supabase data based on the agent type.
 * Returns a structured JSON context to be sent alongside the user input to n8n.
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

async function fetchHospitalInfo(): Promise<Record<string, unknown> | null> {
  const { data } = await supabase
    .from("hospitals")
    .select("id, name, type, bed_count, city, state, status")
    .limit(1)
    .maybeSingle();
  return data;
}

async function fetchPatients(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from("patients")
    .select("id, full_name, gender, birth_date, admission_date, discharge_date, sector, bed, status, medical_record")
    .order("admission_date", { ascending: false })
    .limit(100);
  return data || [];
}

async function fetchInfectionCases(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from("infection_cases")
    .select("id, case_number, infection_type, infection_site, detection_date, confirmation_date, status, device_related, device_type, patient_id")
    .order("detection_date", { ascending: false })
    .limit(200);
  return data || [];
}

async function fetchLabResults(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from("lab_results")
    .select("id, sample_type, collection_date, result_date, organism, status, patient_id")
    .order("collection_date", { ascending: false })
    .limit(200);
  return data || [];
}

async function fetchAudits(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from("audits")
    .select("id, audit_type, sector, audit_date, total_items, compliant_items, compliance_rate, observations")
    .order("audit_date", { ascending: false })
    .limit(100);
  return data || [];
}

async function fetchAlerts(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from("alerts")
    .select("id, title, description, severity, status, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  return data || [];
}

async function fetchPrescriptions(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from("antimicrobial_prescriptions")
    .select("id, drug_name, dose, route, frequency, start_date, end_date, indication, is_active, patient_id")
    .order("start_date", { ascending: false })
    .limit(200);
  return data || [];
}

async function fetchPrecautions(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from("precautions")
    .select("id, precaution_type, reason, start_date, end_date, is_active, patient_id")
    .order("start_date", { ascending: false })
    .limit(100);
  return data || [];
}

async function fetchSectors(): Promise<Record<string, unknown>[]> {
  const { data } = await supabase
    .from("sectors")
    .select("id, name, type, bed_count, is_active")
    .eq("is_active", true);
  return data || [];
}

const FETCHERS: Record<string, () => Promise<unknown>> = {
  patients: fetchPatients,
  infection_cases: fetchInfectionCases,
  lab_results: fetchLabResults,
  audits: fetchAudits,
  alerts: fetchAlerts,
  prescriptions: fetchPrescriptions,
  precautions: fetchPrecautions,
  sectors: fetchSectors,
};

/**
 * Fetches context data from Supabase relevant to a specific agent.
 * Returns null if no data needs are defined for the agent.
 */
export async function fetchAgentContext(agentId: string): Promise<AgentContext | null> {
  const needs = AGENT_DATA_NEEDS[agentId];
  if (!needs || needs.length === 0) return null;

  const context: AgentContext = {};

  // Always fetch hospital info
  const hospital = await fetchHospitalInfo();
  if (hospital) context.hospital = hospital;

  // Fetch all needed data in parallel
  const results = await Promise.allSettled(
    needs.map(async (table) => {
      const fetcher = FETCHERS[table];
      if (!fetcher) return { table, data: [] };
      const data = await fetcher();
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
