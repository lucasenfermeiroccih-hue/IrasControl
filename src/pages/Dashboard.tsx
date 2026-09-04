import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import {
  Users, AlertTriangle, ShieldAlert, CheckCircle, Activity,
  TrendingUp, TrendingDown, Bot, ArrowRight, Loader2, Download,
  ShieldCheck, ExternalLink
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { toast } from "sonner";
import { openGuardiaoWithSSO } from "@/lib/guardiaoSSO";

const AUDIT_TYPE_LABELS: Record<string, string> = {
  bundles: "Bundles",
  hand_hygiene: "Higiene das Mãos",
  infection_control: "Controle de Infecção",
  dispenser: "Dispenser",
  cti_infrastructure: "Infraestrutura CTI",
  antibiogram: "Antibiograma",
  construction_renovation: "Obras/Reformas",
};
const prettyAuditType = (t?: string | null) =>
  (t && AUDIT_TYPE_LABELS[t]) ||
  (t ? t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Outros");

const NC_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#eab308", "#dc2626", "#ea580c"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [mes, setMes] = useState<string[]>([]);
  const [ano, setAno] = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);
  // Filtros avançados (alinhados ao Mapeamento de Precaução)
  const [fLeito, setFLeito] = useState("");
  const [fDataColeta, setFDataColeta] = useState("");
  const [fStatus, setFStatus] = useState("Todos");
  const [fOrganismo, setFOrganismo] = useState("Todos");
  const [fMaterial, setFMaterial] = useState("Todos");
  const [fPrecaucao, setFPrecaucao] = useState("Todos");

  // Real data states
  const [patients, setPatients] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [auditItems, setAuditItems] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [precautions, setPrecautions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId) return;
    const fetchAll = async () => {
      setLoading(true);
      const [pRes, cRes, aRes, alRes, lRes] = await Promise.all([
        supabase.from("patients").select("*").eq("hospital_id", hospitalId).neq("source", "precaution_map"),
        supabase.from("infection_cases").select("*").eq("hospital_id", hospitalId),
        supabase.from("audits").select("*").eq("hospital_id", hospitalId),
        supabase.from("alerts").select("*").eq("hospital_id", hospitalId).eq("status", "active"),
        supabase.from("lab_results").select("*, antibiogram_results(*)").eq("hospital_id", hospitalId),
      ]);
      setPatients(pRes.data || []);
      setCases(cRes.data || []);
      setAudits(aRes.data || []);
      setAlerts(alRes.data || []);
      setLabResults(lRes.data || []);

      // Itens de auditoria (para inconformidade por tipo de item auditado)
      const auditIds = (aRes.data || []).map((a: any) => a.id);
      if (auditIds.length > 0) {
        const chunkSize = 200, pageSize = 1000;
        const allItems: any[] = [];
        for (let i = 0; i < auditIds.length; i += chunkSize) {
          const chunk = auditIds.slice(i, i + chunkSize);
          let from = 0;
          while (true) {
            const { data: itemData, error } = await supabase
              .from("audit_items")
              .select("audit_id, status, category")
              .in("audit_id", chunk)
              .range(from, from + pageSize - 1);
            if (error || !itemData || itemData.length === 0) break;
            allItems.push(...itemData);
            if (itemData.length < pageSize) break;
            from += pageSize;
          }
        }
        setAuditItems(allItems);
      } else {
        setAuditItems([]);
      }

      const pIds = (pRes.data || []).map((p: any) => p.id);
      if (pIds.length > 0) {
        const { data: precData } = await supabase.from("precautions").select("*").in("patient_id", pIds);
        setPrecautions(precData || []);
      } else {
        setPrecautions([]);
      }
      setLoading(false);
    };
    fetchAll();
  }, [hospitalId]);

  // Map paciente -> sector para casos/labs que não têm sector próprio
  const patientSectorMap = useMemo(() => {
    const m: Record<string, string> = {};
    patients.forEach(p => { if (p.id) m[p.id] = p.sector || ""; });
    return m;
  }, [patients]);
  const patientBedMap = useMemo(() => {
    const m: Record<string, string> = {};
    patients.forEach(p => { if (p.id) m[p.id] = p.bed || ""; });
    return m;
  }, [patients]);
  const patientPrecaucaoMap = useMemo(() => {
    const m: Record<string, string[]> = {};
    precautions.filter(pr => pr.is_active).forEach(pr => {
      if (!m[pr.patient_id]) m[pr.patient_id] = [];
      m[pr.patient_id].push(pr.precaution_type);
    });
    return m;
  }, [precautions]);

  // Listas únicas para selects
  const organismOptions = useMemo(
    () => Array.from(new Set(labResults.map(r => r.organism).filter(Boolean))).sort(),
    [labResults]
  );
  const materialOptions = useMemo(
    () => Array.from(new Set(labResults.map(r => r.sample_material).filter(Boolean))).sort(),
    [labResults]
  );
  const precaucaoOptions = useMemo(
    () => Array.from(new Set(precautions.map(p => p.precaution_type).filter(Boolean))).sort(),
    [precautions]
  );

  // Setores e anos derivados dos dados reais (evita lista hardcoded que não casa com os dados)
  const sectorOptions = useMemo(
    () => Array.from(new Set([
      ...patients.map(p => p.sector),
      ...audits.map(a => a.sector),
    ].filter(Boolean) as string[])).sort(),
    [patients, audits]
  );
  const yearOptions = useMemo(() => {
    const ys = new Set<string>();
    const add = (d?: string | null) => {
      if (!d) return;
      const y = new Date(d).getFullYear();
      if (!isNaN(y)) ys.add(String(y));
    };
    patients.forEach(p => add(p.admission_date));
    audits.forEach(a => add(a.audit_date));
    cases.forEach(c => add(c.detection_date));
    labResults.forEach(r => add(r.collection_date));
    return Array.from(ys).sort().reverse();
  }, [patients, audits, cases, labResults]);

  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const matchDate = (dateStr?: string | null) => {
    if (mes.length === 0 && ano.length === 0) return true;
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    if (mes.length > 0 && !mes.includes(meses[d.getMonth()])) return false;
    if (ano.length > 0 && !ano.includes(String(d.getFullYear()))) return false;
    return true;
  };
  const matchSector = (s?: string | null) => {
    if (setor.length === 0) return true;
    return !!s && setor.includes(s);
  };
  const matchLeito = (b?: string | null) => {
    if (!fLeito) return true;
    return !!b && b.toLowerCase().includes(fLeito.toLowerCase());
  };
  const matchStatus = (s?: string | null) => fStatus === "Todos" || s === fStatus;
  const matchPrecaucao = (patientId?: string | null) => {
    if (fPrecaucao === "Todos") return true;
    if (!patientId) return false;
    return (patientPrecaucaoMap[patientId] || []).includes(fPrecaucao);
  };
  const patientPassesLabFilters = (patientId?: string | null) => {
    if (fOrganismo === "Todos" && fMaterial === "Todos" && !fDataColeta) return true;
    if (!patientId) return false;
    return labResults.some(r =>
      r.patient_id === patientId &&
      (fOrganismo === "Todos" || r.organism === fOrganismo) &&
      (fMaterial === "Todos" || r.sample_material === fMaterial) &&
      (!fDataColeta || r.collection_date === fDataColeta)
    );
  };

  // Filtered datasets
  const fPatients = useMemo(() =>
    patients.filter(p =>
      matchDate(p.admission_date) &&
      matchSector(p.sector) &&
      matchLeito(p.bed) &&
      matchStatus(p.status) &&
      matchPrecaucao(p.id) &&
      patientPassesLabFilters(p.id)
    ),
    [patients, mes, ano, setor, fLeito, fStatus, fPrecaucao, fOrganismo, fMaterial, fDataColeta, patientPrecaucaoMap, labResults]);
  const fCases = useMemo(() =>
    cases.filter(c =>
      matchDate(c.detection_date) &&
      matchSector(c.patient_id ? patientSectorMap[c.patient_id] : c.infection_site) &&
      matchLeito(c.patient_id ? patientBedMap[c.patient_id] : null) &&
      matchPrecaucao(c.patient_id) &&
      patientPassesLabFilters(c.patient_id)
    ),
    [cases, mes, ano, setor, fLeito, fPrecaucao, fOrganismo, fMaterial, fDataColeta, patientSectorMap, patientBedMap, patientPrecaucaoMap, labResults]);
  const fAudits = useMemo(() =>
    audits.filter(a => matchDate(a.audit_date) && matchSector(a.sector)),
    [audits, mes, ano, setor]);
  const fAlerts = useMemo(() =>
    alerts.filter(a => matchDate(a.created_at)),
    [alerts, mes, ano]);
  const fLabResults = useMemo(() =>
    labResults.filter(r =>
      matchDate(r.collection_date) &&
      matchSector(r.patient_id ? patientSectorMap[r.patient_id] : null) &&
      matchLeito(r.patient_id ? patientBedMap[r.patient_id] : null) &&
      (fOrganismo === "Todos" || r.organism === fOrganismo) &&
      (fMaterial === "Todos" || r.sample_material === fMaterial) &&
      (!fDataColeta || r.collection_date === fDataColeta) &&
      matchPrecaucao(r.patient_id)
    ),
    [labResults, mes, ano, setor, fLeito, fOrganismo, fMaterial, fDataColeta, fPrecaucao, patientSectorMap, patientBedMap, patientPrecaucaoMap]);

  // Computed KPIs
  const activePatients = fPatients.filter(p => p.status === "active");
  const suspectCases = fCases.filter(c => ["open", "investigating"].includes(c.status));
  const confirmedCases = fCases.filter(c => c.status === "confirmed");
  const complianceRate = useMemo(() => {
    if (fAudits.length === 0) return 0;
    const totalCompliant = fAudits.reduce((sum, a) => sum + (a.compliant_items || 0), 0);
    const totalItems = fAudits.reduce((sum, a) => sum + (a.total_items || 0), 0);
    return totalItems > 0 ? ((totalCompliant / totalItems) * 100).toFixed(1) : "0";
  }, [fAudits]);

  // IRAS by sector
  const irasBySector = useMemo(() => {
    const map: Record<string, { total: number; confirmed: number }> = {};
    fCases.forEach(c => {
      const sector = (c.patient_id && patientSectorMap[c.patient_id]) || c.infection_site || "Outros";
      if (!map[sector]) map[sector] = { total: 0, confirmed: 0 };
      map[sector].total++;
      if (c.status === "confirmed") map[sector].confirmed++;
    });
    return Object.entries(map).map(([setor, d]) => ({
      setor,
      taxa: d.total > 0 ? Number(((d.confirmed / Math.max(activePatients.length, 1)) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.taxa - a.taxa).slice(0, 6);
  }, [fCases, activePatients, patientSectorMap]);

  // Top organisms from lab
  const topMicro = useMemo(() => {
    const map: Record<string, number> = {};
    fLabResults.forEach(r => {
      if (r.organism) {
        map[r.organism] = (map[r.organism] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [fLabResults]);

  const maxMicro = topMicro.length > 0 ? topMicro[0].count : 1;

  // Compliance pie
  const pieData = useMemo(() => {
    const rate = Number(complianceRate);
    const nonConforme = Math.round((100 - rate) * 10) / 10;
    return [
      { name: "Conforme", value: rate, color: "hsl(142, 71%, 35%)" },
      { name: "Não Conforme", value: nonConforme, color: "hsl(0, 72%, 51%)" },
    ];
  }, [complianceRate]);

  // Inconformidade por tipo de auditoria ("tipo de prevenção")
  const nonComplianceByType = useMemo(() => {
    const map: Record<string, { nc: number; total: number; count: number }> = {};
    fAudits.forEach(a => {
      const total = a.total_items || 0;
      const compliant = a.compliant_items || 0;
      if (total <= 0) return;
      const label = prettyAuditType(a.audit_type);
      if (!map[label]) map[label] = { nc: 0, total: 0, count: 0 };
      map[label].nc += Math.max(0, total - compliant);
      map[label].total += total;
      map[label].count++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, taxa: v.total > 0 ? Number(((v.nc / v.total) * 100).toFixed(1)) : 0, audits: v.count }))
      .sort((a, b) => b.taxa - a.taxa);
  }, [fAudits]);

  // Inconformidade por tipo de item auditado (categoria dos itens)
  const nonComplianceByCategory = useMemo(() => {
    const idSet = new Set(fAudits.map(a => a.id));
    const map: Record<string, { nc: number; applicable: number }> = {};
    auditItems.forEach(it => {
      if (!idSet.has(it.audit_id)) return;
      if (it.status === "not_applicable" || it.status === "not_evaluated") return;
      const cat = it.category || "Geral";
      if (!map[cat]) map[cat] = { nc: 0, applicable: 0 };
      map[cat].applicable++;
      if (it.status === "non_compliant") map[cat].nc++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, taxa: v.applicable > 0 ? Number(((v.nc / v.applicable) * 100).toFixed(1)) : 0, total: v.applicable }))
      .sort((a, b) => b.taxa - a.taxa)
      .slice(0, 10);
  }, [auditItems, fAudits]);

  const handleExportPDF = async () => {
    toast.info("Gerando PDF do dashboard...");
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: {
          type: "dashboard",
          hospitalId,
          data: {
            totalPatients: activePatients.length,
            suspectCases: suspectCases.length,
            confirmedCases: confirmedCases.length,
            complianceRate,
            irasBySector,
            topMicro,
            activeAlerts: fAlerts.length,
          },
        },
      });
      if (error) throw error;
      if (data?.pdf) {
        const byteArray = Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0));
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dashboard-${new Date().toISOString().split("T")[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF exportado com sucesso!");
      }
    } catch {
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  };

  if (ctxLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis = [
    { label: "Pacientes Monitorados", value: String(activePatients.length), icon: Users, trend: "", color: "text-info", bg: "bg-info/10" },
    { label: "Casos Suspeitos", value: String(suspectCases.length), icon: AlertTriangle, trend: "", color: "text-warning", bg: "bg-warning/10" },
    { label: "IRAS Confirmadas", value: String(confirmedCases.length), icon: ShieldAlert, trend: "", color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Taxa de Conformidade", value: `${complianceRate}%`, icon: CheckCircle, trend: "", color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard Principal</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Visão consolidada da situação epidemiológica</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          <DashboardAIInsights generateInsights={() => {
            const insights: string[] = [];
            insights.push(`📊 ${activePatients.length} pacientes monitorados com ${confirmedCases.length} IRAS confirmadas.`);
            if (fAlerts.length > 0) insights.push(`⚠️ ${fAlerts.length} alerta(s) ativo(s) requerem atenção.`);
            insights.push(`✅ Taxa de conformidade geral em ${complianceRate}%.`);
            if (topMicro.length > 0) insights.push(`🦠 Principal patógeno: ${topMicro[0].name} (${topMicro[0].count} isolados).`);
            return insights;
          }} />
        </div>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <DashboardFilters mes={mes} setMes={setMes} ano={ano} setAno={setAno} setor={setor} setSetor={setSetor} sectors={sectorOptions.length ? sectorOptions : undefined} years={yearOptions.length ? yearOptions : undefined} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end pt-2 border-t">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Leito</label>
              <input
                value={fLeito}
                onChange={(e) => setFLeito(e.target.value)}
                placeholder="Leito"
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Data de Coleta</label>
              <input
                type="date"
                value={fDataColeta}
                onChange={(e) => setFDataColeta(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <select
                value={fStatus}
                onChange={(e) => setFStatus(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="Todos">Todos</option>
                <option value="active">Ativo</option>
                <option value="discharged">Alta</option>
                <option value="deceased">Óbito</option>
                <option value="transferred">Transferido</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Microrganismo</label>
              <select
                value={fOrganismo}
                onChange={(e) => setFOrganismo(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="Todos">Todos</option>
                {organismOptions.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Material</label>
              <select
                value={fMaterial}
                onChange={(e) => setFMaterial(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="Todos">Todos</option>
                {materialOptions.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Precaução</label>
              <select
                value={fPrecaucao}
                onChange={(e) => setFPrecaucao(e.target.value)}
                className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              >
                <option value="Todos">Todas</option>
                {precaucaoOptions.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guardião Hospitalar — acesso rápido */}
      <Card className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 dark:border-emerald-800">
        <CardContent className="flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900 shrink-0">
              <ShieldCheck className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-300">Guardião Hospitalar</p>
              <p className="text-xs text-emerald-700/70 dark:text-emerald-400/70 truncate">Gestão integrada de qualidade e segurança do paciente</p>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shrink-0"
            onClick={() => openGuardiaoWithSSO(hospitalId)}
          >
            Acessar <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-3 sm:gap-4 pt-4 sm:pt-6">
              <div className={`flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg ${kpi.bg} shrink-0`}>
                <kpi.icon className={`h-5 w-5 sm:h-6 sm:w-6 ${kpi.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] sm:text-sm text-muted-foreground truncate">{kpi.label}</p>
                <p className="text-lg sm:text-2xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Card — Relatório do Gestor */}
      <div
        onClick={() => navigate("/tools/scih-audits?openRelatorio=1")}
        className="cursor-pointer rounded-xl border p-4 sm:p-5 flex items-center justify-between gap-4 transition-opacity hover:opacity-90"
        style={{ background: "linear-gradient(135deg, #0f4c75 0%, #1a9e75 100%)", borderColor: "#1a9e75" }}
      >
        <div className="flex items-center gap-4 min-w-0">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 text-3xl">
            📋
          </div>
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-bold text-white">Gerar Relatório do Gestor</p>
            <p className="text-xs text-white/75 mt-0.5 truncate">Selecione setor e período · exporte em PDF ou envie por e-mail</p>
          </div>
        </div>
        <div className="shrink-0 rounded-lg border border-white/30 bg-white/15 px-4 py-2 text-sm font-semibold text-white">
          Criar relatório →
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* IRAS por Setor */}
        <Card>
          <CardHeader><CardTitle className="text-base">Taxa de IRAS por Setor (%)</CardTitle></CardHeader>
          <CardContent>
            {irasBySector.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={irasBySector}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="setor" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="taxa" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhum dado disponível. Cadastre casos para visualizar.</p>
            )}
          </CardContent>
        </Card>

        {/* Conformidade */}
        <Card>
          <CardHeader><CardTitle className="text-base">Conformidade Geral</CardTitle></CardHeader>
          <CardContent>
            {fAudits.length > 0 ? (
              <div className="relative">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      dataKey="value"
                      stroke="hsl(var(--background))"
                      strokeWidth={2}
                      startAngle={90}
                      endAngle={-270}
                    >
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v}%`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-foreground">{complianceRate}%</span>
                  <span className="text-xs text-muted-foreground">Conforme</span>
                </div>
                <div className="flex items-center justify-center gap-6 mt-2">
                  {pieData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: entry.color }} />
                      <span className="text-xs text-muted-foreground">{entry.name}</span>
                      <span className="text-xs font-semibold text-foreground">{entry.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhuma auditoria registrada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Inconformidade por tipo de prevenção (auditoria) e por item auditado */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inconformidade por Tipo de Prevenção</CardTitle>
            <p className="text-xs text-muted-foreground">% de itens não conformes por tipo de auditoria</p>
          </CardHeader>
          <CardContent>
            {nonComplianceByType.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={nonComplianceByType} margin={{ top: 8, right: 16, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" height={55} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="taxa" name="Inconformidade" radius={[4, 4, 0, 0]}>
                    {nonComplianceByType.map((_, i) => <Cell key={i} fill={NC_COLORS[i % NC_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhuma auditoria com itens registrados no período.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inconformidade por Tipo de Item Auditado</CardTitle>
            <p className="text-xs text-muted-foreground">% de não conformidade por categoria de item</p>
          </CardHeader>
          <CardContent>
            {nonComplianceByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(280, nonComplianceByCategory.length * 34)}>
                <BarChart data={nonComplianceByCategory} layout="vertical" margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="taxa" name="Inconformidade" radius={[0, 4, 4, 0]}>
                    {nonComplianceByCategory.map((_, i) => <Cell key={i} fill={NC_COLORS[i % NC_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhum item de auditoria registrado no período.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alertas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Alertas Ativos ({fAlerts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {fAlerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta ativo</p>}
            {fAlerts.slice(0, 5).map((a) => (
              <div key={a.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <Badge variant="destructive" className="text-xs">{a.severity}</Badge>
                </div>
                <p className="mt-1.5 text-sm">{a.title}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Microrganismos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Microrganismos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topMicro.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum resultado laboratorial</p>}
            {topMicro.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(m.count / maxMicro) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-bold">{m.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Resumo Auditorias */}
        <Card>
          <CardHeader><CardTitle className="text-base">Resumo de Auditorias</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {fAudits.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma auditoria registrada</p>}
            {fAudits.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium capitalize">{a.audit_type?.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{a.sector || "Geral"} · {a.audit_date}</p>
                </div>
                <Badge variant={Number(a.compliance_rate) >= 80 ? "secondary" : "destructive"}>
                  {a.compliance_rate ? `${a.compliance_rate}%` : "N/A"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
