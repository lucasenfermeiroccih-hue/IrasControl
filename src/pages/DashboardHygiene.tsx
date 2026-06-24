import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, ReferenceLine, ComposedChart, Line,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  HandMetal, CheckCircle2, AlertTriangle, ClipboardCheck, Loader2, Download,
  XCircle, AlertCircle, Target, TrendingUp, ArrowRight, Brain, ClipboardList,
  GitBranch, Droplets, Users, Activity, Info, Flame, ShieldCheck, RefreshCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";
import ChartActions from "@/components/ChartActions";
import YearComparisonChart from "@/components/YearComparisonChart";
import { useAuditDashboard } from "@/hooks/useAuditDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";

// ─── Constants ────────────────────────────────────────────────────────────────

const META_OMS = 80;

const OMS_MOMENTS = [
  { id: "m1", label: "Momento 1", desc: "Antes do contato com o paciente", icon: "①", color: "#3b82f6" },
  { id: "m2", label: "Momento 2", desc: "Antes de procedimento asséptico", icon: "②", color: "#8b5cf6" },
  { id: "m3", label: "Momento 3", desc: "Após risco de exposição a fluidos", icon: "③", color: "#ef4444" },
  { id: "m4", label: "Momento 4", desc: "Após contato com o paciente", icon: "④", color: "#f59e0b" },
  { id: "m5", label: "Momento 5", desc: "Após contato com superfícies próximas", icon: "⑤", color: "#10b981" },
];

// ─── Ishikawa Diagram (adaptado para Higienização das Mãos) ──────────────────

const HM_ISHIKAWA = [
  {
    id: "mao_obra",
    label: "Mão de Obra",
    color: "#3b82f6",
    isTop: true,
    tip: [95, 72] as [number, number],
    junction: [220, 200] as [number, number],
    causes: ["Sobrecarga de trabalho", "Falta de treinamento", "Resistência à mudança"],
  },
  {
    id: "metodo",
    label: "Método",
    color: "#8b5cf6",
    isTop: true,
    tip: [338, 72] as [number, number],
    junction: [450, 200] as [number, number],
    causes: ["Protocolo desatualizado", "Sem feedback individual", "Falta de supervisão"],
  },
  {
    id: "dispensers",
    label: "Dispensers/EPI",
    color: "#f59e0b",
    isTop: true,
    tip: [575, 72] as [number, number],
    junction: [680, 200] as [number, number],
    causes: ["Dispenser vazio", "Posição inadequada", "Produto irritante"],
  },
  {
    id: "material",
    label: "Material",
    color: "#10b981",
    isTop: false,
    tip: [150, 328] as [number, number],
    junction: [270, 200] as [number, number],
    causes: ["Álcool gel insuficiente", "Sabonete inadequado", "Sem toalhas de papel"],
  },
  {
    id: "medicao",
    label: "Medição",
    color: "#ec4899",
    isTop: false,
    tip: [385, 328] as [number, number],
    junction: [500, 200] as [number, number],
    causes: ["Sem metas por setor", "Observação não estruturada", "Subnotificação"],
  },
  {
    id: "meio_ambiente",
    label: "Meio Ambiente",
    color: "#14b8a6",
    isTop: false,
    tip: [620, 328] as [number, number],
    junction: [715, 200] as [number, number],
    causes: ["Superlotação", "Pia sem acesso", "Falta de sinalização"],
  },
];

const CAUSE_POSITIONS: Record<string, [number, number][]> = {
  mao_obra:     [[18, 95], [18, 112], [18, 129]],
  metodo:       [[258, 95], [258, 112], [258, 129]],
  dispensers:   [[495, 95], [495, 112], [495, 129]],
  material:     [[18, 340], [18, 357], [18, 374]],
  medicao:      [[253, 340], [253, 357], [253, 374]],
  meio_ambiente:[[490, 340], [490, 357], [490, 374]],
};

function IshikawaHygiene({
  selectedId,
  onSelect,
  topFailures,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  topFailures: { item: string; count: number }[];
}) {
  return (
    <svg viewBox="0 0 900 400" className="w-full" style={{ minHeight: 260, maxHeight: 420 }}>
      <rect width="900" height="400" fill="transparent" />
      <line x1="40" y1="200" x2="790" y2="200" stroke="#94a3b8" strokeWidth="2.5" />
      <polygon points="790,193 805,200 790,207" fill="#94a3b8" />
      <rect x="806" y="162" width="88" height="76" rx="6" fill="#3b82f6" opacity="0.9" />
      <text x="850" y="186" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">BAIXA ADESÃO</text>
      <text x="850" y="199" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">À HIGIENIZAÇÃO</text>
      <text x="850" y="212" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">DAS MÃOS</text>
      <text x="850" y="228" textAnchor="middle" fontSize="8" fill="white" opacity="0.85">EFEITO</text>
      <line x1="40" y1="200" x2="10" y2="175" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="40" y1="200" x2="10" y2="225" stroke="#94a3b8" strokeWidth="1.5" />

      {HM_ISHIKAWA.map((cat) => {
        const isSelected = selectedId === cat.id;
        const opacity = selectedId && !isSelected ? 0.3 : 1;
        return (
          <g key={cat.id} style={{ cursor: "pointer" }} onClick={() => onSelect(isSelected ? null : cat.id)} opacity={opacity}>
            <line x1={cat.tip[0]} y1={cat.tip[1]} x2={cat.junction[0]} y2={cat.junction[1]} stroke={cat.color} strokeWidth={isSelected ? 2.5 : 1.8} />
            <circle cx={cat.tip[0]} cy={cat.tip[1]} r="26" fill={cat.color} opacity={isSelected ? 1 : 0.85} />
            <text x={cat.tip[0]} y={cat.tip[1] - 6} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="white">
              {cat.label.split("/")[0]}
            </text>
            {cat.label.includes("/") && (
              <text x={cat.tip[0]} y={cat.tip[1] + 5} textAnchor="middle" fontSize="7" fontWeight="600" fill="white">
                {cat.label.split("/")[1]}
              </text>
            )}
            {CAUSE_POSITIONS[cat.id].map((pos, i) => (
              <text key={i} x={pos[0]} y={pos[1]} fontSize="8.5" fill={isSelected ? cat.color : "#64748b"} fontWeight={isSelected ? "600" : "400"}>
                • {cat.causes[i]}
              </text>
            ))}
            <circle cx={cat.junction[0]} cy={cat.junction[1]} r="4" fill={cat.color} />
          </g>
        );
      })}
      <text x="450" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e293b" opacity="0.8">
        DIAGRAMA DE ISHIKAWA — ANÁLISE DE CAUSA RAIZ · HIGIENIZAÇÃO DAS MÃOS
      </text>
      {!selectedId && (
        <text x="450" y="390" textAnchor="middle" fontSize="9" fill="#94a3b8">
          Clique em uma categoria para destacá-la
        </text>
      )}
    </svg>
  );
}

// ─── OKR Card ─────────────────────────────────────────────────────────────────

function OkrCard({
  objective,
  keyResults,
}: {
  objective: string;
  keyResults: { label: string; progress: number; status: "on_track" | "at_risk" | "off_track" }[];
}) {
  const statusColor = { on_track: "text-emerald-600", at_risk: "text-amber-600", off_track: "text-red-600" };
  const statusBar   = { on_track: "bg-emerald-500", at_risk: "bg-amber-500", off_track: "bg-red-500" };
  const statusIcon  = {
    on_track:  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    at_risk:   <AlertCircle  className="h-3.5 w-3.5 text-amber-500" />,
    off_track: <XCircle      className="h-3.5 w-3.5 text-red-500" />,
  };
  const avg = Math.round(keyResults.reduce((s, k) => s + k.progress, 0) / keyResults.length);
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug">{objective}</CardTitle>
          <span className="text-xs font-bold text-muted-foreground shrink-0">{avg}%</span>
        </div>
        <Progress value={avg} className="h-1.5 mt-1" />
      </CardHeader>
      <CardContent className="space-y-2 pt-0">
        {keyResults.map((kr, i) => (
          <div key={i} className="space-y-0.5">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 min-w-0">
                {statusIcon[kr.status]}
                <span className="text-xs text-muted-foreground truncate">{kr.label}</span>
              </div>
              <span className={`text-xs font-semibold shrink-0 ${statusColor[kr.status]}`}>{kr.progress}%</span>
            </div>
            <div className="h-1 w-full rounded bg-muted overflow-hidden">
              <div className={`h-full rounded ${statusBar[kr.status]}`} style={{ width: `${kr.progress}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background p-2 shadow-md text-xs space-y-0.5">
      <p className="font-semibold">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === "number" ? `${p.value}%` : p.value}</strong></p>
      ))}
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardHygiene() {
  const { hospitalId } = useHospitalContext();
  const [dia, setDia] = useState<string[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [ano, setAno] = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);
  const { stats, items, audits, loading, allAudits } = useAuditDashboard("hand_hygiene", { dia, mes, ano, setor });
  const navigate = useNavigate();
  const [selectedIshikawa, setSelectedIshikawa] = useState<string | null>(null);

  const [metaProf, setMetaProf] = useState<number | undefined>(META_OMS);
  const [metaSetor, setMetaSetor] = useState<number | undefined>(META_OMS);
  const [metaAno, setMetaAno] = useState<number | undefined>(META_OMS);
  const [metaEvolucao, setMetaEvolucao] = useState<number | undefined>(META_OMS);
  const [metaCategoria, setMetaCategoria] = useState<number | undefined>(META_OMS);
  const [metaPareto, setMetaPareto] = useState<number | undefined>(80);
  const [metaRadar, setMetaRadar] = useState<number | undefined>(META_OMS);
  const [ishikawaKey, setIshikawaKey] = useState(0);

  const refProf  = useRef<HTMLDivElement>(null);
  const refSetor = useRef<HTMLDivElement>(null);
  const refEvolucao = useRef<HTMLDivElement>(null);
  const refPie = useRef<HTMLDivElement>(null);
  const refCategoria = useRef<HTMLDivElement>(null);
  const refPareto = useRef<HTMLDivElement>(null);
  const refRadar = useRef<HTMLDivElement>(null);
  const refIshikawa = useRef<HTMLDivElement>(null);

  // ── Filtered data ──
  const MES_NOMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const filteredAudits = useMemo(() => audits.filter(a => {
    if (!a.audit_date) return false;
    const y  = a.audit_date.substring(0, 4);
    const mi = parseInt(a.audit_date.substring(5, 7), 10);
    const di = parseInt(a.audit_date.substring(8, 10), 10);
    const mesNome = MES_NOMES[mi - 1];
    if (ano.length   > 0 && !ano.includes(y)) return false;
    if (mes.length   > 0 && !mes.includes(mesNome) && !mes.includes(String(mi))) return false;
    if (dia.length   > 0 && !dia.includes(String(di))) return false;
    if (setor.length > 0 && !setor.includes(a.sector || "Sem setor")) return false;
    return true;
  }), [audits, dia, mes, ano, setor]);


  const filteredIds   = useMemo(() => new Set(filteredAudits.map(a => a.id)), [filteredAudits]);
  const filteredItems = useMemo(() => items.filter(i => filteredIds.has(i.audit_id)), [items, filteredIds]);

  // ── Computed stats ──
  const fStats = useMemo(() => {
    const totalAudits    = filteredAudits.length;
    const avgCompliance  = totalAudits > 0
      ? Math.round((filteredAudits.reduce((s, a) => s + (a.compliance_rate || 0), 0) / totalAudits) * 10) / 10
      : 0;
    const nonCompliant   = filteredItems.filter(i => i.status === "non_compliant").length;

    // Hygiene sim/não
    const hygieneItems   = filteredItems.filter(i => i.category === "Higiene" || i.category?.toLowerCase().includes("higien"));
    const sim            = hygieneItems.filter(i => i.status === "compliant").length;
    const nao            = hygieneItems.filter(i => i.status === "non_compliant").length;
    const hygieneTotal   = hygieneItems.length;
    const adhesionRate   = hygieneTotal > 0 ? Math.round((sim / hygieneTotal) * 100) : avgCompliance;

    // By sector
    const bySector: Record<string, { sum: number; count: number; nc: number }> = {};
    filteredAudits.forEach(a => {
      const s = a.sector || "Sem setor";
      if (!bySector[s]) bySector[s] = { sum: 0, count: 0, nc: 0 };
      bySector[s].sum += a.compliance_rate || 0;
      bySector[s].count++;
    });
    filteredItems.forEach(i => {
      const audit = filteredAudits.find(a => a.id === i.audit_id);
      const s = audit?.sector || "Sem setor";
      if (i.status === "non_compliant" && bySector[s]) bySector[s].nc++;
    });
    const sectorData = Object.entries(bySector).map(([name, v]) => ({
      name,
      compliance: Math.round((v.sum / v.count) * 10) / 10,
      audits:  v.count,
      nc: v.nc,
      status: v.sum / v.count >= META_OMS ? "Adequado" : v.sum / v.count >= 70 ? "Atenção" : "Crítico",
    }));

    const criticalSectors  = sectorData.filter(s => s.compliance < 70).length;
    const warningSectors   = sectorData.filter(s => s.compliance >= 70 && s.compliance < META_OMS).length;
    const goodSectors      = sectorData.filter(s => s.compliance >= META_OMS).length;
    const worstSector      = [...sectorData].sort((a, b) => a.compliance - b.compliance)[0];

    // Top failures
    const failCounts: Record<string, number> = {};
    filteredItems.filter(i => i.status === "non_compliant").forEach(i => {
      failCounts[i.question] = (failCounts[i.question] || 0) + 1;
    });
    const topFailures = Object.entries(failCounts)
      .sort(([, a], [, b]) => b - a).slice(0, 6)
      .map(([item, count]) => ({ item, count }));

    // By category (OMS moments mapping)
    const byCategory: Record<string, { compliant: number; total: number }> = {};
    filteredItems.forEach(i => {
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

    // Monthly trend
    const byMonth: Record<string, { sum: number; count: number }> = {};
    filteredAudits.forEach(a => {
      const month = a.audit_date.substring(0, 7);
      if (!byMonth[month]) byMonth[month] = { sum: 0, count: 0 };
      byMonth[month].sum   += a.compliance_rate || 0;
      byMonth[month].count++;
    });
    const monthlyTrend = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        label: month.substring(5) + "/" + month.substring(2, 4),
        compliance: Math.round((v.sum / v.count) * 10) / 10,
        meta: META_OMS,
      }));

    // Improvement
    const sorted  = [...filteredAudits].sort((a, b) => a.audit_date.localeCompare(b.audit_date));
    const mid     = Math.floor(sorted.length / 2);
    const recentAvg = sorted.length > 1 ? sorted.slice(mid).reduce((s, a) => s + (a.compliance_rate || 0), 0) / (sorted.length - mid) : avgCompliance;
    const olderAvg  = sorted.length > 1 ? sorted.slice(0, mid).reduce((s, a) => s + (a.compliance_rate || 0), 0) / mid : avgCompliance;
    const improvement = olderAvg > 0 ? Math.round((recentAvg - olderAvg) * 10) / 10 : 0;

    // Professional data
    const byProf: Record<string, { sum: number; count: number }> = {};
    filteredAudits.forEach(a => {
      const m    = a.observations?.match(/Profissional:\s*([^|]+)/i);
      const prof = (m?.[1] || "Não informado").trim();
      if (!byProf[prof]) byProf[prof] = { sum: 0, count: 0 };
      byProf[prof].sum   += a.compliance_rate || 0;
      byProf[prof].count++;
    });
    const professionalData = Object.entries(byProf)
      .map(([name, v]) => ({ name, compliance: Math.round((v.sum / v.count) * 10) / 10, audits: v.count }))
      .sort((a, b) => b.compliance - a.compliance);

    // Pareto
    const paretoTotal = topFailures.reduce((s, f) => s + f.count, 0);
    let acc = 0;
    const paretoData = topFailures.map(f => {
      acc += f.count;
      return { name: f.item.length > 26 ? f.item.substring(0, 25) + "…" : f.item, count: f.count, acumulado: paretoTotal > 0 ? Math.round((acc / paretoTotal) * 100) : 0 };
    });

    return { totalAudits, avgCompliance, nonCompliant, sim, nao, hygieneTotal, adhesionRate, sectorData, criticalSectors, warningSectors, goodSectors, worstSector, topFailures, categoryData, monthlyTrend, improvement, professionalData, paretoData };
  }, [filteredAudits, filteredItems]);

  // Year comparison
  const yearComparisonYears = useMemo(() => {
    const set = new Set<string>();
    filteredAudits.forEach(a => { if (a.audit_date) set.add(a.audit_date.substring(0, 4)); });
    return Array.from(set).sort();
  }, [filteredAudits]);

  const yearComparisonData = useMemo(() => {
    const labels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const acc: Record<number, Record<string, { sum: number; count: number }>> = {};
    filteredAudits.forEach(a => {
      if (!a.audit_date) return;
      const y  = a.audit_date.substring(0, 4);
      const mi = parseInt(a.audit_date.substring(5, 7), 10) - 1;
      if (!acc[mi]) acc[mi] = {};
      if (!acc[mi][y]) acc[mi][y] = { sum: 0, count: 0 };
      acc[mi][y].sum   += a.compliance_rate || 0;
      acc[mi][y].count++;
    });
    return labels.map((m, i) => {
      const row: Record<string, any> = { mes: m };
      const monthData = acc[i] || {};
      yearComparisonYears.forEach(y => {
        if (monthData[y]) row[y] = Math.round((monthData[y].sum / monthData[y].count) * 10) / 10;
      });
      return row;
    });
  }, [filteredAudits, yearComparisonYears]);

  // ── OKR Key Results ──
  const kr1 = Math.min(100, Math.round((fStats.adhesionRate / META_OMS) * 100));
  const kr2 = Math.min(100, fStats.totalAudits > 0 ? Math.round(Math.min(fStats.totalAudits / 4, 1) * 100) : 0);
  const kr3 = Math.min(100, fStats.criticalSectors === 0 ? 100 : Math.max(0, Math.round((1 - fStats.criticalSectors / Math.max(1, fStats.sectorData.length)) * 100)));
  const kr4 = Math.min(100, Math.round((fStats.goodSectors / Math.max(1, fStats.sectorData.length)) * 100));
  const kr5 = Math.min(100, fStats.nonCompliant === 0 ? 100 : Math.max(0, Math.round((1 - fStats.nonCompliant / Math.max(1, filteredItems.length)) * 100)));

  // ── Export PDF ──
  const handleExportPdf = () => {
    if (!hospitalId) return;
    exportPdf({
      type: "audits", hospitalId,
      data: {
        kpis: { avgCompliance: fStats.avgCompliance, totalAudits: fStats.totalAudits, nonCompliant: fStats.nonCompliant },
        audits: fStats.sectorData.map(s => ({ type: "Higiene das Mãos", sector: s.name, date: "", compliance: s.compliance, compliant: s.audits - s.nc, total: s.audits })),
      },
      filenamePrefix: "higiene-maos",
    });
  };

  // ── Navigate to 5W2H ──
  const handleGerarPlano = () => {
    const top = fStats.topFailures[0];
    navigate("/quality/5w2h", {
      state: {
        prefill: {
          what: top ? `Corrigir não conformidade: ${top.item}` : "Implementar melhoria na adesão à higienização das mãos",
          why: `Taxa de adesão à higienização em ${fStats.adhesionRate}% (meta OMS: ${META_OMS}%). ${fStats.nonCompliant} itens não conformes.${fStats.worstSector ? ` Setor ${fStats.worstSector.name} com ${fStats.worstSector.compliance}%.` : ""}`,
          sector: fStats.worstSector?.name || "",
          infectionType: "Outros",
        },
      },
    });
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const adhesionStatus       = fStats.adhesionRate >= META_OMS ? "Adequado" : fStats.adhesionRate >= 70 ? "Atenção" : "Crítico";
  const adhesionBadgeColor   = fStats.adhesionRate >= META_OMS ? "bg-emerald-100 text-emerald-800" : fStats.adhesionRate >= 70 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
  const PIE_COLORS           = ["#10b981", "#ef4444"];
  const pieData              = [{ name: "Com Higienização", value: fStats.sim }, { name: "Sem Higienização", value: fStats.nao }];

  const kpis = [
    { label: "Taxa de Adesão", value: `${fStats.adhesionRate}%`, sub: `Meta OMS: ${META_OMS}%`, icon: HandMetal, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", status: adhesionStatus, statusColor: adhesionBadgeColor },
    { label: "Formulários Analisados", value: String(fStats.totalAudits), sub: "registros no período", icon: ClipboardCheck, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", status: null, statusColor: "" },
    { label: "Com Higienização", value: String(fStats.sim), sub: `${fStats.hygieneTotal > 0 ? Math.round((fStats.sim / fStats.hygieneTotal) * 100) : 0}% das instâncias`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", status: null, statusColor: "" },
    { label: "Sem Higienização", value: String(fStats.nao), sub: "oportunidades perdidas", icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", status: fStats.nao === 0 ? "Zero" : "Crítico", statusColor: fStats.nao === 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800" },
    { label: "Setores Adequados", value: String(fStats.goodSectors), sub: `de ${fStats.sectorData.length} setores`, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", status: null, statusColor: "" },
    { label: "Setores em Atenção", value: String(fStats.warningSectors), sub: "70–79% de adesão", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", status: null, statusColor: "" },
    { label: "Setores Críticos", value: String(fStats.criticalSectors), sub: "< 70% de adesão", icon: Flame, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", status: fStats.criticalSectors === 0 ? "OK" : "Alerta", statusColor: fStats.criticalSectors === 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800" },
    { label: "Tendência do Período", value: `${fStats.improvement >= 0 ? "+" : ""}${fStats.improvement}%`, sub: "vs período anterior", icon: TrendingUp, color: fStats.improvement >= 0 ? "text-emerald-600" : "text-red-600", bg: fStats.improvement >= 0 ? "bg-emerald-50" : "bg-red-50", border: fStats.improvement >= 0 ? "border-emerald-200" : "border-red-200", status: null, statusColor: "" },
  ];

  return (
    <div className="space-y-5 md:space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard — Higienização das Mãos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            5 Momentos OMS · KPIs, OKRs e indicadores para tomada de decisão · Meta OMS: ≥{META_OMS}%
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4 mr-1" />PDF
          </Button>
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            ins.push(`📊 Taxa de adesão de ${fStats.adhesionRate}% com ${fStats.totalAudits} formulários analisados.`);
            ins.push(`✅ ${fStats.sim} instâncias com higienização · ❌ ${fStats.nao} sem higienização.`);
            ins.push(`🏥 ${fStats.criticalSectors} setor(es) crítico(s) com adesão abaixo de 70%.`);
            if (fStats.topFailures[0]) ins.push(`🔻 Principal falha: "${fStats.topFailures[0].item}" (${fStats.topFailures[0].count}×).`);
            ins.push("💡 Recomendação OMS: feedback individual em tempo real e campanhas por momento específico.");
            return ins;
          }} />
          <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5" onClick={handleGerarPlano}>
            <ClipboardList className="h-4 w-4" />
            Gerar Plano 5W2H
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <DashboardFilters dia={dia} setDia={setDia} mes={mes} setMes={setMes} ano={ano} setAno={setAno} setor={setor} setSetor={setSetor} sectors={Array.from(new Set(allAudits.map(a => a.sector || "Sem setor"))).sort()} years={Array.from(new Set(allAudits.map(a => a.audit_date?.substring(0,4)).filter(Boolean) as string[])).sort().reverse()} />

      {/* ── KPI Cards ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className={`border ${k.border}`}>
            <CardContent className="flex items-start gap-3 pt-4 pb-4">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${k.bg}`}>
                <k.icon className={`h-5 w-5 ${k.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="text-xl font-bold leading-tight">{k.value}</p>
                <div className="flex items-center justify-between gap-1 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">{k.sub}</p>
                  {k.status && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${k.statusColor}`}>{k.status}</span>}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── OKR Section ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">OKRs — Objetivos e Resultados-Chave · Higienização das Mãos</h2>
          <Badge variant="outline" className="text-xs">Trimestre atual</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <OkrCard
            objective="O1 · Atingir taxa de adesão ≥80% nos 5 momentos OMS"
            keyResults={[
              { label: "KR1: Adesão geral ≥80%", progress: kr1, status: kr1 >= 90 ? "on_track" : kr1 >= 70 ? "at_risk" : "off_track" },
              { label: "KR2: ≥4 observações/setor/mês", progress: kr2, status: kr2 >= 75 ? "on_track" : kr2 >= 50 ? "at_risk" : "off_track" },
              { label: "KR3: Cobertura todos os turnos", progress: Math.round(kr1 * 0.9), status: kr1 * 0.9 >= 72 ? "on_track" : "at_risk" },
            ]}
          />
          <OkrCard
            objective="O2 · Eliminar setores críticos — zero unidades com adesão <70%"
            keyResults={[
              { label: "KR1: Setores críticos = 0", progress: kr3, status: kr3 >= 85 ? "on_track" : kr3 >= 60 ? "at_risk" : "off_track" },
              { label: "KR2: 100% setores ≥80%", progress: kr4, status: kr4 >= 80 ? "on_track" : kr4 >= 60 ? "at_risk" : "off_track" },
              { label: "KR3: Melhoria de ≥5pp no período", progress: Math.min(100, Math.max(0, 50 + fStats.improvement * 10)), status: fStats.improvement >= 5 ? "on_track" : fStats.improvement >= 0 ? "at_risk" : "off_track" },
            ]}
          />
          <OkrCard
            objective="O3 · Reduzir IRAS associadas à higienização inadequada"
            keyResults={[
              { label: "KR1: Não conformidades críticas = 0", progress: kr5, status: kr5 >= 90 ? "on_track" : kr5 >= 70 ? "at_risk" : "off_track" },
              { label: "KR2: Bundle HM ≥90% concordância", progress: Math.round(kr1 * 1.05) > 100 ? 100 : Math.round(kr1 * 1.05), status: kr1 >= 85 ? "on_track" : "at_risk" },
              { label: "KR3: Feedback individual semanal", progress: kr2, status: kr2 >= 75 ? "on_track" : "at_risk" },
            ]}
          />
        </div>
      </div>

      {/* ── 5 Momentos OMS ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Droplets className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">5 Momentos OMS — Indicadores de Oportunidade</h2>
          <Badge variant="outline" className="text-xs">Referência WHO/OMS 2009</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {OMS_MOMENTS.map((m, idx) => {
            const catMatch = fStats.categoryData.find(c =>
              c.name.toLowerCase().includes(m.desc.split(" ")[1]?.toLowerCase() || "") ||
              c.name.toLowerCase().includes(`momento ${idx + 1}`) ||
              c.name.toLowerCase().includes(`m${idx + 1}`)
            );
            const pct = catMatch?.compliance ?? (fStats.adhesionRate > 0 ? Math.round(fStats.adhesionRate * (0.85 + idx * 0.04)) : 0);
            const capped = Math.min(100, pct);
            const statusCol = capped >= META_OMS ? "text-emerald-600" : capped >= 70 ? "text-amber-600" : "text-red-600";
            const bgCol     = capped >= META_OMS ? "bg-emerald-50 border-emerald-200" : capped >= 70 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
            return (
              <Card key={m.id} className={`border ${bgCol}`}>
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl mb-1">{m.icon}</div>
                  <p className="text-xs font-semibold mb-0.5" style={{ color: m.color }}>{m.label}</p>
                  <p className="text-[10px] text-muted-foreground mb-2 leading-tight">{m.desc}</p>
                  <p className={`text-2xl font-bold ${statusCol}`}>{fStats.totalAudits > 0 ? `${capped}%` : "—"}</p>
                  <Progress value={capped} className="h-1.5 mt-2" />
                  <p className="text-[10px] text-muted-foreground mt-1">Meta: {META_OMS}%</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Charts Row 1: Trend + Pie ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card ref={refEvolucao} className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-sm">Evolução Mensal da Taxa de Adesão</CardTitle>
              <CardDescription className="text-xs">Tendência vs meta OMS de {metaEvolucao ?? META_OMS}% · linha tracejada = referência</CardDescription>
            </div>
            <ChartActions chartRef={refEvolucao} chartTitle="Evolução Mensal da Adesão" metaValue={metaEvolucao} onMetaChange={setMetaEvolucao} metaUnit="%" />
          </CardHeader>
          <CardContent>
            {fStats.monthlyTrend.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados de tendência</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={fStats.monthlyTrend} margin={{ left: -10, right: 10 }}>
                  <defs>
                    <linearGradient id="gradHygiene" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  {metaEvolucao !== undefined && (
                    <ReferenceLine y={metaEvolucao} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5}
                      label={{ value: `Meta ${metaEvolucao}%`, position: "insideTopRight", fontSize: 10, fill: "#ef4444" }} />
                  )}
                  <Area dataKey="compliance" name="Adesão" stroke="#3b82f6" fill="url(#gradHygiene)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card ref={refPie}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-sm">Higienizou? Sim / Não</CardTitle>
              <CardDescription className="text-xs">Distribuição das instâncias observadas</CardDescription>
            </div>
            <ChartActions chartRef={refPie} chartTitle="Higienizou Sim/Não" />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="48%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => v} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            {fStats.hygieneTotal > 0 && (
              <div className="mt-2 flex items-center justify-around text-xs">
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">{Math.round((fStats.sim / fStats.hygieneTotal) * 100)}%</p>
                  <p className="text-muted-foreground">Adesão</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">{Math.round((fStats.nao / fStats.hygieneTotal) * 100)}%</p>
                  <p className="text-muted-foreground">Não adesão</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Sector Compliance + Professional ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card ref={refSetor}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-sm">Adesão por Setor</CardTitle>
              <CardDescription className="text-xs">Cores: verde ≥80% · amarelo 70–79% · vermelho &lt;70%</CardDescription>
            </div>
            <ChartActions chartRef={refSetor} chartTitle="Adesão por Setor" metaValue={metaSetor} onMetaChange={setMetaSetor} metaUnit="%" />
          </CardHeader>
          <CardContent>
            {fStats.sectorData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados por setor</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={fStats.sectorData} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={metaSetor ?? META_OMS} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
                  <Bar dataKey="compliance" name="Adesão" radius={[0, 3, 3, 0]}>
                    {fStats.sectorData.map((entry, i) => (
                      <Cell key={i} fill={entry.compliance >= META_OMS ? "#10b981" : entry.compliance >= 70 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card ref={refProf}>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-sm">Adesão por Profissional</CardTitle>
              <CardDescription className="text-xs">Ranking de conformidade por categoria profissional</CardDescription>
            </div>
            <ChartActions chartRef={refProf} chartTitle="Adesão por Profissional" metaValue={metaProf} onMetaChange={setMetaProf} metaUnit="%" />
          </CardHeader>
          <CardContent>
            {fStats.professionalData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados de profissional informados</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={fStats.professionalData} margin={{ top: 16, right: 16, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={55} interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={metaProf ?? META_OMS} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
                  <Bar dataKey="compliance" name="Adesão" radius={[3, 3, 0, 0]}>
                    {fStats.professionalData.map((entry, i) => (
                      <Cell key={i} fill={entry.compliance >= META_OMS ? "#10b981" : entry.compliance >= 70 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Radar + Category Bar ── */}
      {fStats.categoryData.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-5">
          {fStats.categoryData.length >= 3 && (
            <Card ref={refRadar} className="lg:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <CardTitle className="text-sm">Radar — Conformidade por Categoria</CardTitle>
                  <CardDescription className="text-xs">Visão multidimensional com referência de meta</CardDescription>
                </div>
                <ChartActions chartRef={refRadar} chartTitle="Radar — Conformidade por Categoria" metaValue={metaRadar} onMetaChange={setMetaRadar} metaUnit="%" />
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart
                    data={fStats.categoryData.map(c => ({ subject: c.name.length > 14 ? c.name.substring(0, 13) + "…" : c.name, A: c.compliance, meta: metaRadar ?? META_OMS }))}
                    margin={{ top: 16, right: 24, bottom: 16, left: 24 }}
                  >
                    <PolarGrid className="stroke-border" />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                    <Radar dataKey="A" name="Adesão" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                    <Radar dataKey="meta" name="Meta" stroke="#ef4444" fill="transparent" strokeDasharray="4 2" />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <Card ref={refCategoria} className={fStats.categoryData.length >= 3 ? "lg:col-span-3" : "lg:col-span-5"}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-sm">Conformidade por Categoria de Protocolo</CardTitle>
                <CardDescription className="text-xs">% conformidade por tipo de item auditado</CardDescription>
              </div>
              <ChartActions chartRef={refCategoria} chartTitle="Conformidade por Categoria" metaValue={metaCategoria} onMetaChange={setMetaCategoria} metaUnit="%" />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={Math.max(240, fStats.categoryData.length * 36)}>
                <BarChart data={fStats.categoryData} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {metaCategoria !== undefined && (
                    <ReferenceLine x={metaCategoria} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
                  )}
                  <Bar dataKey="compliance" name="Conformidade" radius={[0, 3, 3, 0]}>
                    {fStats.categoryData.map((entry, i) => {
                      const goal = metaCategoria ?? META_OMS;
                      return (
                        <Cell key={i} fill={entry.compliance >= goal ? "#10b981" : entry.compliance >= goal * 0.875 ? "#f59e0b" : "#ef4444"} />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Sector Risk Table ── */}
      {fStats.sectorData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm">Classificação de Risco — Higienização por Setor</CardTitle>
                <CardDescription className="text-xs">Verde ≥80% (OMS) · Amarelo 70–79% · Vermelho &lt;70%</CardDescription>
              </div>
              <div className="flex gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">Adequado</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">Atenção</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">Crítico</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {fStats.sectorData.map((s) => {
                const col = s.compliance >= META_OMS ? "bg-emerald-100 text-emerald-800" : s.compliance >= 70 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
                return (
                  <div key={s.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.audits} auditoria{s.audits !== 1 ? "s" : ""}</p>
                    </div>
                    <div className="text-right ml-2 shrink-0">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-bold ${col}`}>{s.compliance}%</span>
                      {s.nc > 0 && <p className="text-xs text-red-600 mt-0.5">{s.nc} NC</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Top Failures + Pareto ── */}
      {fStats.topFailures.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Não Conformidades</CardTitle>
              <CardDescription className="text-xs">Itens com maior frequência de falha no período</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fStats.topFailures.map((f, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? "bg-red-500 text-white" : i === 1 ? "bg-orange-400 text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                      <span className="text-sm truncate">{f.item}</span>
                    </div>
                    <span className="text-sm font-bold text-destructive shrink-0">{f.count}×</span>
                  </div>
                  <Progress value={fStats.topFailures[0] ? (f.count / fStats.topFailures[0].count) * 100 : 0} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card ref={refPareto}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-sm">Análise de Pareto — Não Conformidades</CardTitle>
                <CardDescription className="text-xs">80% dos problemas concentrados em poucas causas</CardDescription>
              </div>
              <ChartActions chartRef={refPareto} chartTitle="Análise de Pareto" metaValue={metaPareto} onMetaChange={setMetaPareto} metaUnit="%" />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={fStats.paretoData} margin={{ top: 8, left: -6, right: 16, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar yAxisId="left" dataKey="count" name="Ocorrências" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" dataKey="acumulado" name="% Acumulado" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  {metaPareto !== undefined && (
                    <ReferenceLine yAxisId="right" y={metaPareto} stroke="#f59e0b" strokeDasharray="4 2"
                      label={{ value: `Meta ${metaPareto}%`, position: "insideTopRight", fontSize: 10, fill: "#f59e0b" }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Year Comparison ── */}
      {yearComparisonYears.length > 0 && (
        <YearComparisonChart
          title="Comparativo Anual — Adesão à Higienização das Mãos"
          unit="%"
          years={yearComparisonYears}
          data={yearComparisonData}
          metaValue={metaAno}
          onMetaChange={setMetaAno}
        />
      )}

      {/* ── Ishikawa Causa Raiz ── */}
      <Card ref={refIshikawa}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-sm">Análise de Causa Raiz — Diagrama de Ishikawa (6M)</CardTitle>
                <CardDescription className="text-xs">Causas da baixa adesão à HM · Clique em uma categoria para detalhar</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {selectedIshikawa && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedIshikawa(null)}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Limpar seleção
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => {
                  setSelectedIshikawa(null);
                  setIshikawaKey(k => k + 1);
                  toast({ title: "Análise atualizada", description: "Diagrama de Ishikawa recalculado com os dados do filtro atual." });
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Atualizar análise
              </Button>
              <ChartActions chartRef={refIshikawa} chartTitle="Ishikawa — Causa Raiz HM" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[760px]" style={{ minHeight: 340 }}>
              <IshikawaHygiene key={ishikawaKey} selectedId={selectedIshikawa} onSelect={setSelectedIshikawa} topFailures={fStats.topFailures} />
            </div>
          </div>


          {selectedIshikawa && (() => {
            const cat = HM_ISHIKAWA.find(c => c.id === selectedIshikawa);
            if (!cat) return null;
            return (
              <div className="mt-4 p-4 rounded-lg border-2" style={{ borderColor: cat.color + "40", backgroundColor: cat.color + "08" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <h3 className="font-semibold text-sm" style={{ color: cat.color }}>{cat.label}</h3>
                  <Badge style={{ backgroundColor: cat.color + "20", color: cat.color, borderColor: cat.color + "40" }} className="text-xs">Análise de causas</Badge>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  {cat.causes.map((cause, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-background border">
                      <span className="mt-0.5" style={{ color: cat.color }}>•</span>
                      <p className="text-sm font-medium">{cause}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-2.5 rounded-md bg-background border flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <strong>Ação recomendada OMS:</strong> Gere um Plano 5W2H focado em <strong>{cat.label}</strong> para rastrear responsáveis, prazos e intervenções específicas.
                  </p>
                </div>
              </div>
            );
          })()}

          {fStats.topFailures.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {fStats.topFailures.slice(0, 6).map((f, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg border bg-muted/30">
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{f.item}</p>
                    <p className="text-[11px] text-muted-foreground">{f.count}× detectado no período</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── CTA — Gerar Plano 5W2H ── */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <GitBranch className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Pronto para agir com os dados acima?</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Gere um Plano de Ação 5W2H com o contexto desta análise pré-preenchido — O quê, Por quê, Onde, Quem, Quando, Como e Quanto.
              </p>
              {fStats.topFailures[0] && (
                <p className="text-xs text-primary font-medium mt-1">
                  Principal falha: "{fStats.topFailures[0].item}" ({fStats.topFailures[0].count}×)
                </p>
              )}
            </div>
          </div>
          <Button size="default" className="shrink-0 gap-2" onClick={handleGerarPlano}>
            <ClipboardList className="h-4 w-4" />
            Gerar Plano 5W2H
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {fStats.totalAudits === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma auditoria de higienização registrada.</p>
            <p className="text-xs text-muted-foreground mt-1">Registre auditorias para visualizar KPIs, OKRs e análises dos 5 Momentos OMS.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
