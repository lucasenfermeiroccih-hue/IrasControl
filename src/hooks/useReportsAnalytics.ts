import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "./useHospitalContext";

export function useReportsAnalytics(periodo: string) {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [loading, setLoading] = useState(true);
  const [infectionCases, setInfectionCases] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [antibiogramResults, setAntibiogramResults] = useState<any[]>([]);
  const [precautions, setPrecautions] = useState<any[]>([]);

  const monthsBack = periodo === "mes" ? 1 : periodo === "trimestre" ? 3 : periodo === "semestre" ? 6 : 12;

  useEffect(() => {
    if (!hospitalId) return;
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsBack);
    const cutoffStr = cutoff.toISOString().slice(0, 10);

    const fetchAll = async () => {
      setLoading(true);
      const [casesRes, auditsRes, labRes, precRes] = await Promise.all([
        supabase.from("infection_cases").select("*").eq("hospital_id", hospitalId).gte("detection_date", cutoffStr).order("detection_date"),
        supabase.from("audits").select("*").eq("hospital_id", hospitalId).gte("audit_date", cutoffStr).order("audit_date"),
        supabase.from("lab_results").select("id, organism, collection_date, sample_type").eq("hospital_id", hospitalId).gte("collection_date", cutoffStr),
        supabase.from("precautions").select("*").gte("start_date", cutoffStr),
      ]);

      setInfectionCases(casesRes.data || []);
      setAudits(auditsRes.data || []);
      setLabResults(labRes.data || []);
      setPrecautions(precRes.data || []);

      // Fetch antibiogram results for lab results
      const labIds = (labRes.data || []).map((l: any) => l.id);
      if (labIds.length > 0) {
        const { data: abRes } = await supabase.from("antibiogram_results").select("*").in("lab_result_id", labIds);
        setAntibiogramResults(abRes || []);
      }

      setLoading(false);
    };
    fetchAll();
  }, [hospitalId, monthsBack]);

  // Compute analytics
  const analytics = useMemo(() => {
    // Monthly IRAS trend
    const monthMap: Record<string, { cases: number; month: string }> = {};
    for (const c of infectionCases) {
      const m = c.detection_date?.slice(0, 7);
      if (m) {
        if (!monthMap[m]) monthMap[m] = { cases: 0, month: m };
        monthMap[m].cases++;
      }
    }
    const monthlyTrend = Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)).map(m => ({
      mes: new Date(m.month + "-01").toLocaleString("pt-BR", { month: "short" }).replace(".", ""),
      iras: m.cases,
      meta: 10,
    }));

    // Infection by sector (using infection_site as proxy)
    const sectorMap: Record<string, number> = {};
    for (const c of infectionCases) {
      const s = c.infection_site || "Não informado";
      sectorMap[s] = (sectorMap[s] || 0) + 1;
    }
    const infectionBySector = Object.entries(sectorMap).map(([setor, casos]) => ({ setor, casos })).sort((a, b) => b.casos - a.casos).slice(0, 6);

    // Audit compliance radar
    const auditTypeMap: Record<string, { total: number; rate: number; count: number }> = {};
    for (const a of audits) {
      const t = a.audit_type || "outros";
      if (!auditTypeMap[t]) auditTypeMap[t] = { total: 0, rate: 0, count: 0 };
      auditTypeMap[t].total += a.compliance_rate || 0;
      auditTypeMap[t].count++;
    }
    const auditTypeLabels: Record<string, string> = {
      hand_hygiene: "Higiene Mãos", bundles: "Bundles", infection_control: "Precauções",
      dispenser: "Dispensers", cti_infrastructure: "Estrutura CTI", antibiogram: "Exames/Culturas",
    };
    const complianceRadar = Object.entries(auditTypeMap).map(([type, v]) => ({
      area: auditTypeLabels[type] || type,
      valor: v.count > 0 ? Math.round(v.total / v.count) : 0,
      meta: 90,
    }));

    // Resistance profile from antibiogram
    const orgResistance: Record<string, number> = {};
    for (const ab of antibiogramResults) {
      if (ab.sensitivity === "R") {
        // Find lab result organism
        const lab = labResults.find((l: any) => l.id === ab.lab_result_id);
        const org = lab?.organism || "Desconhecido";
        orgResistance[org] = (orgResistance[org] || 0) + 1;
      }
    }
    const resistanceProfile = Object.entries(orgResistance).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([organismo, count]) => ({
      organismo, count,
    }));

    // Device distribution from infection cases
    const deviceMap: Record<string, number> = {};
    for (const c of infectionCases) {
      if (c.device_type) {
        const label = c.device_type === "cvc" ? "CVC" : c.device_type === "svu" ? "SVD" : c.device_type === "vm" ? "VM" : "Outros";
        deviceMap[label] = (deviceMap[label] || 0) + 1;
      }
    }
    const deviceDistribution = Object.entries(deviceMap).map(([name, value]) => ({ name, value }));

    // KPIs
    const totalCases = infectionCases.length;
    const confirmedCases = infectionCases.filter((c: any) => c.status === "confirmed").length;
    const avgCompliance = audits.length > 0 ? Math.round(audits.reduce((s: number, a: any) => s + (a.compliance_rate || 0), 0) / audits.length) : 0;
    const criticalAlerts = infectionCases.filter((c: any) => c.status === "open").length;

    return {
      monthlyTrend,
      infectionBySector,
      complianceRadar,
      resistanceProfile,
      deviceDistribution,
      kpis: {
        totalCases,
        confirmedCases,
        avgCompliance,
        criticalAlerts,
      },
    };
  }, [infectionCases, audits, labResults, antibiogramResults, precautions]);

  return { analytics, loading: loading || ctxLoading, hospitalId };
}
