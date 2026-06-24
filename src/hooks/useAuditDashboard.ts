import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "./useHospitalContext";
import type { Database } from "@/integrations/supabase/types";

type AuditType = Database["public"]["Enums"]["audit_type"];

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

const MES_NOMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

export interface AuditDashboardFilters {
  dia?: string[];
  mes?: string[];
  ano?: string[];
  setor?: string[];
}

export function useAuditDashboard(auditType: AuditType, filters?: AuditDashboardFilters) {
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
        // Batch the IN query and paginate to avoid Supabase's 1000-row default cap
        const chunkSize = 200;
        const all: AuditItemRow[] = [];
        for (let i = 0; i < ids.length; i += chunkSize) {
          const chunk = ids.slice(i, i + chunkSize);
          let from = 0;
          const pageSize = 1000;
          while (true) {
            const { data: itemData, error } = await supabase
              .from("audit_items")
              .select("id, audit_id, question, status, category, observation")
              .in("audit_id", chunk)
              .range(from, from + pageSize - 1);
            if (error || !itemData || itemData.length === 0) break;
            all.push(...itemData);
            if (itemData.length < pageSize) break;
            from += pageSize;
          }
        }
        setItems(all);
      }
      setLoading(false);
    };
    load();
  }, [hospitalId, ctxLoading, auditType]);

  const { filteredAudits, filteredItems } = useMemo(() => {
    const f = filters || {};
    const mesSet = new Set((f.mes || []).map(m => String(MES_NOMES.indexOf(m) + 1).padStart(2, "0")).filter(m => m !== "00"));
    const anoSet = new Set(f.ano || []);
    const setorSet = new Set(f.setor || []);
    const diaSet = new Set((f.dia || []).map(d => d.padStart(2, "0")));

    const fa = audits.filter(a => {
      if (!a.audit_date) return false;
      const [y, m, d] = a.audit_date.split("-");
      if (anoSet.size && !anoSet.has(y)) return false;
      if (mesSet.size && !mesSet.has(m)) return false;
      if (diaSet.size && !diaSet.has((d || "").substring(0, 2))) return false;
      if (setorSet.size && !setorSet.has(a.sector || "Sem setor")) return false;
      return true;
    });
    const idSet = new Set(fa.map(a => a.id));
    const fi = items.filter(i => idSet.has(i.audit_id));
    return { filteredAudits: fa, filteredItems: fi };
  }, [audits, items, filters?.dia?.join(","), filters?.mes?.join(","), filters?.ano?.join(","), filters?.setor?.join(",")]);

  const stats = useMemo(() => {
    const audits = filteredAudits;
    const items = filteredItems;
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
  }, [filteredAudits, filteredItems]);

  return { audits: filteredAudits, items: filteredItems, allAudits: audits, allItems: items, stats, loading, hospitalId };
}
