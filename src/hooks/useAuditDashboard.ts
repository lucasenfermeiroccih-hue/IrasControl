import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "./useHospitalContext";

export interface AuditRow {
  id: string;
  audit_date: string;
  sector: string | null;
  compliance_rate: number | null;
  compliant_items: number;
  total_items: number;
  observations: string | null;
}

export interface AuditItemRow {
  id: string;
  audit_id: string;
  question: string;
  status: string;
  category: string | null;
  observation: string | null;
}

export function useAuditDashboard(auditType: string) {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [audits, setAudits] = useState<AuditRow[]>([]);
  const [items, setItems] = useState<AuditItemRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ctxLoading || !hospitalId) { setLoading(false); return; }
    const load = async () => {
      const { data: auditData } = await supabase
        .from("audits")
        .select("id, audit_date, sector, compliance_rate, compliant_items, total_items, observations")
        .eq("hospital_id", hospitalId)
        .eq("audit_type", auditType)
        .order("audit_date", { ascending: false });

      const rows = auditData || [];
      setAudits(rows);

      if (rows.length > 0) {
        const ids = rows.map(a => a.id);
        const { data: itemData } = await supabase
          .from("audit_items")
          .select("id, audit_id, question, status, category, observation")
          .in("audit_id", ids);
        setItems(itemData || []);
      }
      setLoading(false);
    };
    load();
  }, [hospitalId, ctxLoading, auditType]);

  const stats = useMemo(() => {
    const totalAudits = audits.length;
    const avgCompliance = totalAudits > 0
      ? Math.round((audits.reduce((s, a) => s + (a.compliance_rate || 0), 0) / totalAudits) * 10) / 10
      : 0;
    const nonCompliantItems = items.filter(i => i.status === "non_compliant").length;
    
    // Monthly trend
    const byMonth: Record<string, { sum: number; count: number }> = {};
    audits.forEach(a => {
      const month = a.audit_date.substring(0, 7);
      if (!byMonth[month]) byMonth[month] = { sum: 0, count: 0 };
      byMonth[month].sum += a.compliance_rate || 0;
      byMonth[month].count++;
    });
    const monthlyTrend = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        month,
        compliance: Math.round((v.sum / v.count) * 10) / 10,
        audits: v.count,
      }));

    // By sector
    const bySector: Record<string, { sum: number; count: number; nonCompliant: number }> = {};
    audits.forEach(a => {
      const sector = a.sector || "Sem setor";
      if (!bySector[sector]) bySector[sector] = { sum: 0, count: 0, nonCompliant: 0 };
      bySector[sector].sum += a.compliance_rate || 0;
      bySector[sector].count++;
    });
    items.forEach(i => {
      const audit = audits.find(a => a.id === i.audit_id);
      const sector = audit?.sector || "Sem setor";
      if (i.status === "non_compliant" && bySector[sector]) {
        bySector[sector].nonCompliant++;
      }
    });
    const sectorData = Object.entries(bySector).map(([name, v]) => ({
      name,
      compliance: Math.round((v.sum / v.count) * 10) / 10,
      audits: v.count,
      nonCompliant: v.nonCompliant,
      status: v.sum / v.count >= 85 ? "Adequado" : v.sum / v.count >= 75 ? "Atenção" : "Crítico",
    }));

    // Top non-compliant items
    const failCounts: Record<string, { count: number; category: string }> = {};
    items.filter(i => i.status === "non_compliant").forEach(i => {
      const key = i.question;
      if (!failCounts[key]) failCounts[key] = { count: 0, category: i.category || "" };
      failCounts[key].count++;
    });
    const topFailures = Object.entries(failCounts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([item, v]) => ({ item, count: v.count, category: v.category }));

    // By category
    const byCategory: Record<string, { compliant: number; total: number }> = {};
    items.forEach(i => {
      const cat = i.category || "Geral";
      if (!byCategory[cat]) byCategory[cat] = { compliant: 0, total: 0 };
      if (i.status !== "not_applicable" && i.status !== "not_evaluated") {
        byCategory[cat].total++;
        if (i.status === "compliant") byCategory[cat].compliant++;
      }
    });
    const categoryData = Object.entries(byCategory).map(([name, v]) => ({
      name,
      compliance: v.total > 0 ? Math.round((v.compliant / v.total) * 100) : 0,
    }));

    // Previous period comparison
    const sorted = [...audits].sort((a, b) => a.audit_date.localeCompare(b.audit_date));
    const mid = Math.floor(sorted.length / 2);
    const recentAvg = sorted.length > 1
      ? sorted.slice(mid).reduce((s, a) => s + (a.compliance_rate || 0), 0) / (sorted.length - mid)
      : avgCompliance;
    const olderAvg = sorted.length > 1
      ? sorted.slice(0, mid).reduce((s, a) => s + (a.compliance_rate || 0), 0) / mid
      : avgCompliance;
    const improvement = olderAvg > 0 ? Math.round((recentAvg - olderAvg) * 10) / 10 : 0;

    return {
      totalAudits,
      avgCompliance,
      nonCompliantItems,
      improvement,
      monthlyTrend,
      sectorData,
      topFailures,
      categoryData,
    };
  }, [audits, items]);

  return { audits, items, stats, loading, hospitalId };
}
