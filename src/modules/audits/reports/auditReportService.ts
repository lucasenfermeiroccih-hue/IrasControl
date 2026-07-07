import { supabase } from "@/integrations/supabase/client";
import type { AuditRecord, AuditItemRecord, AuditReportFilters, HospitalLogos } from "./auditReportTypes";

export interface AuditReportData {
  audits: AuditRecord[];
  items: AuditItemRecord[];
  previousAudits?: AuditRecord[];
  previousItems?: AuditItemRecord[];
}

async function fetchAuditItems(auditIds: string[]): Promise<AuditItemRecord[]> {
  if (!auditIds.length) return [];
  const all: AuditItemRecord[] = [];
  const chunkSize = 200;
  for (let i = 0; i < auditIds.length; i += chunkSize) {
    const chunk = auditIds.slice(i, i + chunkSize);
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("audit_items")
        .select("id, audit_id, question, status, category, observation")
        .in("audit_id", chunk)
        .range(from, from + 999);
      if (error || !data?.length) break;
      all.push(...(data as AuditItemRecord[]));
      if (data.length < 1000) break;
      from += 1000;
    }
  }
  return all;
}

export async function fetchAuditReportData(filters: AuditReportFilters): Promise<AuditReportData> {
  const { hospitalId, sectorName, periodStart, periodEnd, auditType, includePreviousPeriod, mode } = filters;

  let query = supabase
    .from("audits")
    .select("id, audit_date, audit_type, sector, compliance_rate, compliant_items, total_items, observations, hospital_id")
    .eq("hospital_id", hospitalId)
    .gte("audit_date", periodStart)
    .lte("audit_date", periodEnd)
    .order("audit_date", { ascending: false });

  // In compiled mode, do NOT filter by auditType
  if (mode !== "monthly_sector_compiled" && auditType) {
    query = query.eq("audit_type", auditType);
  }
  if (sectorName.trim()) query = (query as any).ilike("sector", `%${sectorName.trim()}%`);

  const { data: auditsData } = await query;
  const audits = (auditsData || []) as AuditRecord[];
  const items = await fetchAuditItems(audits.map((a) => a.id));

  let previousAudits: AuditRecord[] | undefined;
  let previousItems: AuditItemRecord[] | undefined;

  if (includePreviousPeriod) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    const duration = end.getTime() - start.getTime();
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd.getTime() - duration);

    let prevQuery = supabase
      .from("audits")
      .select("id, audit_date, audit_type, sector, compliance_rate, compliant_items, total_items, observations, hospital_id")
      .eq("hospital_id", hospitalId)
      .gte("audit_date", prevStart.toISOString().slice(0, 10))
      .lte("audit_date", prevEnd.toISOString().slice(0, 10))
      .order("audit_date", { ascending: false });

    if (mode !== "monthly_sector_compiled" && auditType) prevQuery = prevQuery.eq("audit_type", auditType);
    if (sectorName.trim()) prevQuery = (prevQuery as any).ilike("sector", `%${sectorName.trim()}%`);

    const { data: prevData } = await prevQuery;
    previousAudits = (prevData || []) as AuditRecord[];
    previousItems = await fetchAuditItems(previousAudits.map((a) => a.id));
  }

  return { audits, items, previousAudits, previousItems };
}

export async function fetchHospitalLogos(hospitalId: string): Promise<HospitalLogos> {
  try {
    const { data: logos } = await supabase
      .from("hospital_logos" as never)
      .select("logo_type, storage_path, display_order")
      .eq("hospital_id", hospitalId)
      .order("display_order");

    if (!(logos as any[])?.length) return { hospitalLogoUrl: null, scihLogoUrls: [] };

    const getUrl = (path: string) =>
      supabase.storage.from("hospital-logos").getPublicUrl(path).data.publicUrl;

    const ls = logos as any[];
    const hospitalRec = ls.find((l) => l.logo_type === "hospital");
    const scihRecs = ls.filter((l) => l.logo_type === "scih");

    return {
      hospitalLogoUrl: hospitalRec ? getUrl(hospitalRec.storage_path) : null,
      scihLogoUrls: scihRecs.map((r: any) => getUrl(r.storage_path)),
    };
  } catch {
    return { hospitalLogoUrl: null, scihLogoUrls: [] };
  }
}
