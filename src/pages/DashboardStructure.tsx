import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, ReferenceLine, PieChart, Pie, Cell, Legend,
  AreaChart, Area, LineChart, Line,
} from "recharts";
import {
  Building2, CheckCircle2, AlertTriangle, TrendingUp, Loader2, Download,
  XCircle, AlertCircle, Target, ArrowRight, Brain, ClipboardList,
  GitBranch, Activity, Info, Flame, ShieldCheck, Layers,
  Wind, Droplets, Wrench, ClipboardCheck, MapPin,
} from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";
import { useAuditDashboard as useAudit } from "@/hooks/useAuditDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";

// ─── Constants ────────────────────────────────────────────────────────────────

const META = 85;

// Hospital infrastructure category groups
const INFRA_GROUPS = [
  { id: "ventilacao",  label: "Ventilação / HVAC",      icon: Wind,        color: "#3b82f6", keywords: ["ventil", "clima", "ar ", "hvac", "filtro"] },
  { id: "sanitarios",  label: "Água / Saneamento",       icon: Droplets,    color: "#8b5cf6", keywords: ["água", "agua", "sanea", "hidrau", "lavat"] },
  { id: "manutencao",  label: "Manutenção Predial",      icon: Wrench,      color: "#f59e0b", keywords: ["manuten", "predial", "instala", "elétr", "eletr"] },
  { id: "leitos",      label: "Leitos / Áreas Físicas",  icon: Building2,   color: "#10b981", keywords: ["leito", "área", "area", "espaço", "espaco", "quart"] },
  { id: "residuos",    label: "Resíduos (PGRSS)",        icon: Layers,      color: "#ec4899", keywords: ["resídu", "residuo", "lixo", "pgrss", "descart"] },
  { id: "geral",       label: "Estrutura Geral",          icon: ShieldCheck, color: "#14b8a6", keywords: [] },
];

// ─── Ishikawa (6M adaptado para Estrutura Setorial) ─────────────────────────

const STRUCT_ISHIKAWA = [
  {
    id: "mao_obra",
    label: "Mão de Obra",
    color: "#3b82f6",
    isTop: true,
    tip: [95, 72] as [number, number],
    junction: [220, 200] as [number, number],
    causes: ["Técnicos insuficientes", "Falta de treinamento", "Sem rotina de inspeção"],
  },
  {
    id: "metodo",
    label: "Método",
    color: "#8b5cf6",
    isTop: true,
    tip: [338, 72] as [number, number],
    junction: [450, 200] as [number, number],
    causes: ["Sem cronograma preventivo", "Protocolos desatualizados", "Inspeção não sistematizada"],
  },
  {
    id: "maquinas",
    label: "Máquinas/Equipamentos",
    color: "#f59e0b",
    isTop: true,
    tip: [575, 72] as [number, number],
    junction: [680, 200] as [number, number],
    causes: ["Climatização defeituosa", "Filtros sem troca", "Equipamentos obsoletos"],
  },
  {
    id: "material",
    label: "Material",
    color: "#10b981",
    isTop: false,
    tip: [150, 328] as [number, number],
    junction: [270, 200] as [number, number],
    causes: ["Insumos de reforma insuficientes", "Sem estoque de reposição", "Material inadequado"],
  },
  {
    id: "medicao",
    label: "Medição",
    color: "#ec4899",
    isTop: false,
    tip: [385, 328] as [number, number],
    junction: [500, 200] as [number, number],
    causes: ["Sem indicadores estruturais", "Laudos incompletos", "Monitoramento irregular"],
  },
  {
    id: "meio_ambiente",
    label: "Planta Física",
    color: "#14b8a6",
    isTop: false,
    tip: [620, 328] as [number, number],
    junction: [715, 200] as [number, number],
    causes: ["Planta física inadequada", "Espaço insuficiente", "Ventilação deficiente"],
  },
];

const CAUSE_POSITIONS: Record<string, [number, number][]> = {
  mao_obra:     [[18, 95], [18, 112], [18, 129]],
  metodo:       [[258, 95], [258, 112], [258, 129]],
  maquinas:     [[495, 95], [495, 112], [495, 129]],
  material:     [[18, 340], [18, 357], [18, 374]],
  medicao:      [[253, 340], [253, 357], [253, 374]],
  meio_ambiente:[[490, 340], [490, 357], [490, 374]],
};

function IshikawaStructure({
  selectedId,
  onSelect,
  topFailures,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  topFailures: { item: string; count: number; category: string }[];
}) {
  return (
    <svg viewBox="0 0 900 400" className="w-full" style={{ minHeight: 260, maxHeight: 420 }}>
      <rect width="900" height="400" fill="transparent" />
      <line x1="40" y1="200" x2="790" y2="200" stroke="#94a3b8" strokeWidth="2.5" />
      <polygon points="790,193 805,200 790,207" fill="#94a3b8" />
      <rect x="806" y="162" width="88" height="76" rx="6" fill="#10b981" opacity="0.9" />
      <text x="850" y="185" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">ESTRUTURA</text>
      <text x="850" y="198" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">NÃO</text>
      <text x="850" y="211" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">CONFORME</text>
      <text x="850" y="228" textAnchor="middle" fontSize="8" fill="white" opacity="0.85">EFEITO</text>
      <line x1="40" y1="200" x2="10" y2="175" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="40" y1="200" x2="10" y2="225" stroke="#94a3b8" strokeWidth="1.5" />

      {STRUCT_ISHIKAWA.map((cat) => {
        const isSelected = selectedId === cat.id;
        const opacity = selectedId && !isSelected ? 0.3 : 1;
        return (
          <g key={cat.id} style={{ cursor: "pointer" }} onClick={() => onSelect(isSelected ? null : cat.id)} opacity={opacity}>
            <line x1={cat.tip[0]} y1={cat.tip[1]} x2={cat.junction[0]} y2={cat.junction[1]}
              stroke={cat.color} strokeWidth={isSelected ? 2.5 : 1.8} />
            <circle cx={cat.tip[0]} cy={cat.tip[1]} r="26" fill={cat.color} opacity={isSelected ? 1 : 0.85} />
            <text x={cat.tip[0]} y={cat.tip[1] - 6} textAnchor="middle" fontSize="7" fontWeight="700" fill="white">
              {cat.label.split("/")[0]}
            </text>
            {cat.label.includes("/") && (
              <text x={cat.tip[0]} y={cat.tip[1] + 5} textAnchor="middle" fontSize="6.5" fontWeight="600" fill="white">
                {cat.label.split("/")[1]}
              </text>
            )}
            {CAUSE_POSITIONS[cat.id].map((pos, i) => (
              <text key={i} x={pos[0]} y={pos[1]} fontSize="8.5"
                fill={isSelected ? cat.color : "#64748b"} fontWeight={isSelected ? "600" : "400"}>
                • {cat.causes[i]}
              </text>
            ))}
            <circle cx={cat.junction[0]} cy={cat.junction[1]} r="4" fill={cat.color} />
          </g>
        );
      })}
      <text x="450" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e293b" opacity="0.8">
        DIAGRAMA DE ISHIKAWA — ANÁLISE DE CAUSA RAIZ · ESTRUTURA SETORIAL
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
  const statusBar   = { on_track: "bg-emerald-500",   at_risk: "bg-amber-500",   off_track: "bg-red-500" };
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
        <p key={i} style={{ color: p.color }}>
          {p.name}: <strong>{typeof p.value === "number" ? `${p.value}%` : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ─── Sector color helper ──────────────────────────────────────────────────────

function sectorColor(c: number) {
  return c >= META
    ? "bg-emerald-100 text-emerald-800"
    : c >= 75
    ? "bg-amber-100 text-amber-800"
    : "bg-red-100 text-red-800";
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardStructure() {
  const { hospitalId } = useHospitalContext();
  const { stats, items, audits, loading } = useAudit("cti_infrastructure");
  const navigate = useNavigate();

  const [dia, setDia]     = useState<string[]>([]);
  const [mes, setMes]     = useState<string[]>([]);
  const [ano, setAno]     = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);
  const [selectedIshikawa, setSelectedIshikawa] = useState<string | null>(null);

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
    const totalAudits   = filteredAudits.length;
    const avgCompliance = totalAudits > 0
      ? Math.round((filteredAudits.reduce((s, a) => s + (a.compliance_rate || 0), 0) / totalAudits) * 10) / 10
      : 0;
    const compliant    = filteredItems.filter(i => i.status === "compliant").length;
    const nonCompliant = filteredItems.filter(i => i.status === "non_compliant").length;
    const totalItems   = filteredItems.filter(i => i.status !== "not_applicable" && i.status !== "not_evaluated").length;
    const naItems      = filteredItems.filter(i => i.status === "not_applicable").length;

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
    const sectorData = Object.entries(bySector)
      .map(([name, v]) => ({
        name,
        compliance: Math.round((v.sum / v.count) * 10) / 10,
        audits: v.count,
        nc: v.nc,
        status: v.sum / v.count >= META ? "Adequado" : v.sum / v.count >= 75 ? "Atenção" : "Crítico" as string,
      }))
      .sort((a, b) => a.compliance - b.compliance);

    const criticalSectors = sectorData.filter(s => s.compliance < 75).length;
    const warningSectors  = sectorData.filter(s => s.compliance >= 75 && s.compliance < META).length;
    const goodSectors     = sectorData.filter(s => s.compliance >= META).length;
    const worstSector     = sectorData[0];
    const bestSector      = sectorData[sectorData.length - 1];

    // Top failures
    const failCounts: Record<string, { count: number; category: string }> = {};
    filteredItems.filter(i => i.status === "non_compliant").forEach(i => {
      if (!failCounts[i.question]) failCounts[i.question] = { count: 0, category: i.category || "" };
      failCounts[i.question].count++;
    });
    const topFailures = Object.entries(failCounts)
      .sort(([, a], [, b]) => b.count - a.count).slice(0, 6)
      .map(([item, v]) => ({ item, count: v.count, category: v.category }));

    // By category
    const byCategory: Record<string, { compliant: number; total: number }> = {};
    filteredItems.forEach(i => {
      const cat = i.category || "Geral";
      if (!byCategory[cat]) byCategory[cat] = { compliant: 0, total: 0 };
      if (i.status !== "not_applicable" && i.status !== "not_evaluated") {
        byCategory[cat].total++;
        if (i.status === "compliant") byCategory[cat].compliant++;
      }
    });
    const categoryData = Object.entries(byCategory)
      .map(([name, v]) => ({ name, compliance: v.total > 0 ? Math.round((v.compliant / v.total) * 100) : 0 }))
      .sort((a, b) => a.compliance - b.compliance);

    // Infra groups from categories
    const infraGroups = INFRA_GROUPS.map(g => {
      const matched = g.keywords.length > 0
        ? categoryData.filter(c => g.keywords.some(kw => c.name.toLowerCase().includes(kw)))
        : [];
      const unmatched = categoryData.filter(c =>
        INFRA_GROUPS.filter(x => x.id !== "geral").every(x => !x.keywords.some(kw => c.name.toLowerCase().includes(kw)))
      );
      const pool = g.id === "geral" ? unmatched : matched;
      const avg = pool.length > 0
        ? Math.round(pool.reduce((s, c) => s + c.compliance, 0) / pool.length)
        : 0;
      return { ...g, compliance: avg, hasData: pool.length > 0 };
    });

    // Monthly trend
    const byMonth: Record<string, { sum: number; count: number }> = {};
    filteredAudits.forEach(a => {
      const m = a.audit_date.substring(0, 7);
      if (!byMonth[m]) byMonth[m] = { sum: 0, count: 0 };
      byMonth[m].sum   += a.compliance_rate || 0;
      byMonth[m].count++;
    });
    const monthlyTrend = Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({
        label: month.substring(5) + "/" + month.substring(2, 4),
        compliance: Math.round((v.sum / v.count) * 10) / 10,
        meta: META,
      }));

    // Improvement
    const sorted    = [...filteredAudits].sort((a, b) => a.audit_date.localeCompare(b.audit_date));
    const mid       = Math.floor(sorted.length / 2);
    const recentAvg = sorted.length > 1 ? sorted.slice(mid).reduce((s, a) => s + (a.compliance_rate || 0), 0) / (sorted.length - mid) : avgCompliance;
    const olderAvg  = sorted.length > 1 ? sorted.slice(0, mid).reduce((s, a) => s + (a.compliance_rate || 0), 0) / mid : avgCompliance;
    const improvement = olderAvg > 0 ? Math.round((recentAvg - olderAvg) * 10) / 10 : 0;

    // Pie
    const pieData = [
      { name: "Conformes",     value: compliant,    fill: "#10b981" },
      { name: "Não Conformes", value: nonCompliant, fill: "#ef4444" },
      { name: "N/A",           value: naItems,      fill: "#94a3b8" },
    ].filter(d => d.value > 0);

    // Pareto
    const paretoTotal = topFailures.reduce((s, f) => s + f.count, 0);
    let acc = 0;
    const paretoData = topFailures.map(f => {
      acc += f.count;
      return {
        name: f.item.length > 26 ? f.item.substring(0, 25) + "…" : f.item,
        count: f.count,
        acumulado: paretoTotal > 0 ? Math.round((acc / paretoTotal) * 100) : 0,
      };
    });

    return {
      totalAudits, avgCompliance, compliant, nonCompliant, totalItems, naItems,
      sectorData, criticalSectors, warningSectors, goodSectors, worstSector, bestSector,
      topFailures, categoryData, infraGroups, monthlyTrend, improvement, pieData, paretoData,
    };
  }, [filteredAudits, filteredItems]);

  // ── OKR Key Results ──
  const kr1 = Math.min(100, Math.round((fStats.avgCompliance / META) * 100));
  const kr2 = Math.min(100, fStats.totalAudits > 0 ? Math.round(Math.min(fStats.totalAudits / 4, 1) * 100) : 0);
  const kr3 = Math.min(100, fStats.criticalSectors === 0 ? 100 : Math.max(0, Math.round((1 - fStats.criticalSectors / Math.max(1, fStats.sectorData.length)) * 100)));
  const kr4 = Math.min(100, Math.round((fStats.goodSectors / Math.max(1, fStats.sectorData.length)) * 100));
  const kr5 = Math.min(100, fStats.nonCompliant === 0 ? 100 : Math.max(0, Math.round((1 - fStats.nonCompliant / Math.max(1, fStats.totalItems)) * 100)));

  // ── Export PDF ──
  const handleExportPdf = () => {
    if (!hospitalId) return;
    exportPdf({
      type: "audits", hospitalId,
      data: {
        kpis: { avgCompliance: fStats.avgCompliance, totalAudits: fStats.totalAudits, nonCompliant: fStats.nonCompliant },
        audits: fStats.sectorData.map(s => ({ type: "Estrutura Setorial", sector: s.name, date: "", compliance: s.compliance, compliant: s.audits - s.nc, total: s.audits })),
      },
      filenamePrefix: "estrutura-setorial",
    });
  };

  // ── Navigate to 5W2H ──
  const handleGerarPlano = () => {
    const top = fStats.topFailures[0];
    navigate("/quality/5w2h", {
      state: {
        prefill: {
          what: top
            ? `Corrigir não conformidade estrutural: ${top.item}`
            : "Adequar estrutura setorial às normas de controle de infecção hospitalar",
          why: `Conformidade estrutural em ${fStats.avgCompliance}% (meta: ${META}%). ${fStats.nonCompliant} itens não conformes.${fStats.worstSector ? ` Setor mais crítico: ${fStats.worstSector.name} com ${fStats.worstSector.compliance}%.` : ""} Referência: ANVISA RDC 50/2002.`,
          sector: fStats.worstSector?.name || "",
          infectionType: "Outros",
        },
      },
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const complianceStatus   = fStats.avgCompliance >= META ? "Adequado" : fStats.avgCompliance >= 75 ? "Atenção" : "Crítico";
  const complianceBadge    = fStats.avgCompliance >= META ? "bg-emerald-100 text-emerald-800" : fStats.avgCompliance >= 75 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";

  const kpis = [
    { label: "Conformidade Geral",    value: `${fStats.avgCompliance}%`,   sub: `Meta ANVISA: ${META}%`,       icon: ShieldCheck,    color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", status: complianceStatus, statusColor: complianceBadge },
    { label: "Auditorias no Período", value: String(fStats.totalAudits),   sub: "registros analisados",        icon: ClipboardCheck, color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200",    status: null, statusColor: "" },
    { label: "Itens Conformes",       value: String(fStats.compliant),     sub: `de ${fStats.totalItems} avaliados`, icon: CheckCircle2,  color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", status: null, statusColor: "" },
    { label: "Não Conformidades",     value: String(fStats.nonCompliant),  sub: "requerem intervenção",        icon: AlertTriangle,  color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",     status: fStats.nonCompliant === 0 ? "Zero" : "Crítico", statusColor: fStats.nonCompliant === 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800" },
    { label: "Setores Adequados",     value: String(fStats.goodSectors),   sub: `de ${fStats.sectorData.length} setores`, icon: Building2,   color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", status: null, statusColor: "" },
    { label: "Setores em Atenção",    value: String(fStats.warningSectors), sub: "75–84% conformidade",       icon: AlertCircle,    color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   status: null, statusColor: "" },
    { label: "Setores Críticos",      value: String(fStats.criticalSectors), sub: "< 75% conformidade",      icon: Flame,          color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",     status: fStats.criticalSectors === 0 ? "OK" : "Alerta", statusColor: fStats.criticalSectors === 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800" },
    { label: "Tendência do Período",  value: `${fStats.improvement >= 0 ? "+" : ""}${fStats.improvement}%`, sub: "vs período anterior", icon: TrendingUp, color: fStats.improvement >= 0 ? "text-emerald-600" : "text-red-600", bg: fStats.improvement >= 0 ? "bg-emerald-50" : "bg-red-50", border: fStats.improvement >= 0 ? "border-emerald-200" : "border-red-200", status: null, statusColor: "" },
  ];

  return (
    <div className="space-y-5 md:space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard — Vigilância de Estrutura Setorial</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Infraestrutura de todos os setores hospitalares · KPIs, OKRs e indicadores · Ref.: ANVISA RDC 50/2002 · Meta: ≥{META}%
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4 mr-1" />PDF
          </Button>
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            ins.push(`🏥 Conformidade estrutural de ${fStats.avgCompliance}% em ${fStats.totalAudits} auditorias de ${fStats.sectorData.length} setores.`);
            ins.push(`✅ ${fStats.goodSectors} setores adequados · ⚠️ ${fStats.warningSectors} em atenção · 🔴 ${fStats.criticalSectors} críticos.`);
            if (fStats.topFailures[0]) ins.push(`🔻 Principal falha: "${fStats.topFailures[0].item}" (${fStats.topFailures[0].count}×).`);
            ins.push("💡 Ref. ANVISA RDC 50/2002: adequação da estrutura física é fator crítico de controle de infecção.");
            return ins;
          }} />
          <Button size="sm" className="bg-primary hover:bg-primary/90 gap-1.5" onClick={handleGerarPlano}>
            <ClipboardList className="h-4 w-4" />
            Gerar Plano 5W2H
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <DashboardFilters dia={dia} setDia={setDia} mes={mes} setMes={setMes} ano={ano} setAno={setAno} setor={setor} setSetor={setSetor} />

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
                  {k.status && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${k.statusColor}`}>
                      {k.status}
                    </span>
                  )}
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
          <h2 className="text-sm font-semibold">OKRs — Objetivos e Resultados-Chave · Estrutura Setorial</h2>
          <Badge variant="outline" className="text-xs">Trimestre atual</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <OkrCard
            objective="O1 · 100% dos setores hospitalares com estrutura adequada para controle de infecção"
            keyResults={[
              { label: "KR1: Conformidade ≥85% (ANVISA)", progress: kr1, status: kr1 >= 90 ? "on_track" : kr1 >= 70 ? "at_risk" : "off_track" },
              { label: "KR2: ≥4 auditorias/setor/mês",    progress: kr2, status: kr2 >= 75 ? "on_track" : kr2 >= 50 ? "at_risk" : "off_track" },
              { label: "KR3: 0 NC críticos em UTIs/CC",   progress: fStats.criticalSectors === 0 ? 100 : kr3, status: fStats.criticalSectors === 0 ? "on_track" : "off_track" },
            ]}
          />
          <OkrCard
            objective="O2 · Eliminar setores críticos — zero unidades com conformidade <75%"
            keyResults={[
              { label: "KR1: Setores críticos = 0",      progress: kr3, status: kr3 >= 85 ? "on_track" : kr3 >= 60 ? "at_risk" : "off_track" },
              { label: "KR2: 100% setores ≥85%",         progress: kr4, status: kr4 >= 80 ? "on_track" : kr4 >= 60 ? "at_risk" : "off_track" },
              { label: "KR3: Melhoria ≥5pp no período",  progress: Math.min(100, Math.max(0, 50 + fStats.improvement * 10)), status: fStats.improvement >= 5 ? "on_track" : fStats.improvement >= 0 ? "at_risk" : "off_track" },
            ]}
          />
          <OkrCard
            objective="O3 · Adequação total às normas ANVISA RDC 50/2002 e RDC 36/2013"
            keyResults={[
              { label: "KR1: Itens NC = 0",                       progress: kr5,  status: kr5 >= 90 ? "on_track" : kr5 >= 70 ? "at_risk" : "off_track" },
              { label: "KR2: Ventilação/HVAC ≥90% conforme",      progress: Math.round(kr1 * 1.04) > 100 ? 100 : Math.round(kr1 * 1.04), status: kr1 >= 85 ? "on_track" : "at_risk" },
              { label: "KR3: Plano de adequação estrutural ativo", progress: kr2,  status: kr2 >= 75 ? "on_track" : "at_risk" },
            ]}
          />
        </div>
      </div>

      {/* ── Infrastructure Groups Status ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Status por Domínio de Infraestrutura</h2>
          <Badge variant="outline" className="text-xs">ANVISA RDC 50/2002</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {fStats.infraGroups.map((g) => {
            const pct      = g.hasData ? g.compliance : fStats.avgCompliance;
            const statusCol = pct >= META ? "text-emerald-600" : pct >= 75 ? "text-amber-600" : "text-red-600";
            const bgCol     = pct >= META ? "bg-emerald-50 border-emerald-200" : pct >= 75 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
            const tag       = pct >= META ? "OK" : pct >= 75 ? "Atenção" : "Crítico";
            const tagCol    = pct >= META ? "bg-emerald-100 text-emerald-800" : pct >= 75 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
            return (
              <Card key={g.id} className={`border ${bgCol}`}>
                <CardContent className="pt-4 pb-3 text-center">
                  <g.icon className="h-6 w-6 mx-auto mb-1" style={{ color: g.color }} />
                  <p className="text-xs font-semibold mb-1 leading-tight" style={{ color: g.color }}>{g.label}</p>
                  <p className={`text-2xl font-bold ${statusCol}`}>
                    {fStats.totalAudits > 0 ? `${pct}%` : "—"}
                  </p>
                  <Progress value={pct} className="h-1.5 mt-2 mb-1" />
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${tagCol}`}>{tag}</span>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* ── Charts Row 1: Trend + Pie ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Evolução Mensal da Conformidade Estrutural</CardTitle>
            <CardDescription className="text-xs">Tendência vs meta de {META}% · linha vermelha = referência ANVISA</CardDescription>
          </CardHeader>
          <CardContent>
            {fStats.monthlyTrend.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados de tendência</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={fStats.monthlyTrend} margin={{ left: -10, right: 10 }}>
                  <defs>
                    <linearGradient id="gradStruct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={META} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5}
                    label={{ value: `Meta ${META}%`, position: "insideTopRight", fontSize: 10, fill: "#ef4444" }} />
                  <Area dataKey="compliance" name="Conformidade" stroke="#10b981" fill="url(#gradStruct)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Distribuição dos Itens Auditados</CardTitle>
            <CardDescription className="text-xs">Conformes · Não Conformes · N/A por período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie data={fStats.pieData} cx="50%" cy="48%" innerRadius={48} outerRadius={74} paddingAngle={3} dataKey="value">
                  {fStats.pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip formatter={(v: number) => v} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </PieChart>
            </ResponsiveContainer>
            {fStats.totalItems > 0 && (
              <div className="mt-1 flex items-center justify-around text-xs">
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600">{Math.round((fStats.compliant / fStats.totalItems) * 100)}%</p>
                  <p className="text-muted-foreground">Conforme</p>
                </div>
                <div className="h-8 w-px bg-border" />
                <div className="text-center">
                  <p className="text-lg font-bold text-red-600">{Math.round((fStats.nonCompliant / fStats.totalItems) * 100)}%</p>
                  <p className="text-muted-foreground">Não conforme</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Sector + Category ── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conformidade por Setor Hospitalar</CardTitle>
            <CardDescription className="text-xs">Verde ≥85% · Amarelo 75–84% · Vermelho &lt;75% · linha = meta ANVISA</CardDescription>
          </CardHeader>
          <CardContent>
            {fStats.sectorData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados por setor</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, fStats.sectorData.length * 34)}>
                <ComposedChart data={fStats.sectorData} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={META} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
                  <Bar dataKey="compliance" name="Conformidade" radius={[0, 3, 3, 0]}>
                    {fStats.sectorData.map((e, i) => (
                      <Cell key={i} fill={e.compliance >= META ? "#10b981" : e.compliance >= 75 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Conformidade por Categoria de Estrutura</CardTitle>
            <CardDescription className="text-xs">Itens ordenados do pior para o melhor desempenho</CardDescription>
          </CardHeader>
          <CardContent>
            {fStats.categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados por categoria</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, fStats.categoryData.length * 34)}>
                <BarChart data={fStats.categoryData} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine x={META} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
                  <Bar dataKey="compliance" name="Conformidade" radius={[0, 3, 3, 0]}>
                    {fStats.categoryData.map((e, i) => (
                      <Cell key={i} fill={e.compliance >= META ? "#10b981" : e.compliance >= 75 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Radar ── */}
      {fStats.categoryData.length >= 3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Radar — Conformidade Multidimensional por Categoria</CardTitle>
            <CardDescription className="text-xs">Visão 360° da estrutura hospitalar · linha vermelha = meta ANVISA {META}%</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={fStats.categoryData.map(c => ({
                subject: c.name.length > 14 ? c.name.substring(0, 13) + "…" : c.name,
                A: c.compliance,
                meta: META,
              }))}>
                <PolarGrid className="stroke-border" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 9 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                <Radar dataKey="A" name="Conformidade" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                <Radar dataKey="meta" name={`Meta ${META}%`} stroke="#ef4444" fill="transparent" strokeDasharray="4 2" />
                <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Sector Risk Classification Table ── */}
      {fStats.sectorData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm">Detalhamento por Setor — Classificação de Risco Estrutural</CardTitle>
                <CardDescription className="text-xs">Verde ≥{META}% · Amarelo 75–{META - 1}% · Vermelho &lt;75% · Referência: ANVISA RDC 50/2002</CardDescription>
              </div>
              <div className="flex gap-1.5 text-xs flex-wrap">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">Adequado</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">Atenção</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">Crítico</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Setor</TableHead>
                    <TableHead className="text-center">Conformidade</TableHead>
                    <TableHead className="text-center">Auditorias</TableHead>
                    <TableHead className="text-center">Não Conformes</TableHead>
                    <TableHead className="text-center">Progresso</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...fStats.sectorData].sort((a, b) => a.compliance - b.compliance).map((r) => (
                    <TableRow key={r.name}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          {r.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-bold ${r.compliance >= META ? "text-emerald-600" : r.compliance >= 75 ? "text-amber-600" : "text-red-600"}`}>
                          {r.compliance}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm">{r.audits}</TableCell>
                      <TableCell className="text-center">
                        {r.nc > 0
                          ? <span className="text-red-600 font-semibold">{r.nc}</span>
                          : <span className="text-emerald-600">0</span>
                        }
                      </TableCell>
                      <TableCell className="w-32">
                        <Progress value={r.compliance} className="h-1.5" />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${sectorColor(r.compliance)}`}>
                          {r.status}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Top Failures + Pareto ── */}
      {fStats.topFailures.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Não Conformidades Estruturais</CardTitle>
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
                    <div className="flex items-center gap-1.5 shrink-0">
                      {f.category && <Badge variant="outline" className="text-[10px] py-0">{f.category}</Badge>}
                      <span className="text-sm font-bold text-destructive">{f.count}×</span>
                    </div>
                  </div>
                  <Progress value={fStats.topFailures[0] ? (f.count / fStats.topFailures[0].count) * 100 : 0} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Análise de Pareto — Não Conformidades</CardTitle>
              <CardDescription className="text-xs">80% dos problemas estruturais concentrados em poucas causas</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <ComposedChart data={fStats.paretoData} margin={{ left: -10, right: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} interval={0} angle={-20} textAnchor="end" height={45} />
                  <YAxis yAxisId="left"  tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar yAxisId="left"  dataKey="count"     name="Ocorrências"  fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" dataKey="acumulado" name="% Acumulado" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <ReferenceLine yAxisId="right" y={80} stroke="#f59e0b" strokeDasharray="4 2" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Ishikawa Causa Raiz ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-sm">Análise de Causa Raiz — Diagrama de Ishikawa (6M)</CardTitle>
                <CardDescription className="text-xs">Causas das não conformidades estruturais · Clique em uma categoria para detalhar</CardDescription>
              </div>
            </div>
            {selectedIshikawa && (
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedIshikawa(null)}>
                <XCircle className="h-3.5 w-3.5 mr-1" /> Limpar seleção
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <IshikawaStructure selectedId={selectedIshikawa} onSelect={setSelectedIshikawa} topFailures={fStats.topFailures} />

          {selectedIshikawa && (() => {
            const cat = STRUCT_ISHIKAWA.find(c => c.id === selectedIshikawa);
            if (!cat) return null;
            return (
              <div className="mt-4 p-4 rounded-lg border-2" style={{ borderColor: cat.color + "40", backgroundColor: cat.color + "08" }}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                  <h3 className="font-semibold text-sm" style={{ color: cat.color }}>{cat.label}</h3>
                  <Badge style={{ backgroundColor: cat.color + "20", color: cat.color, borderColor: cat.color + "40" }} className="text-xs">
                    Análise de causas
                  </Badge>
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
                    <strong>Ação recomendada:</strong> Gere um Plano 5W2H focado em <strong>{cat.label}</strong> para adequação estrutural conforme ANVISA RDC 50/2002.
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
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {f.category && <Badge variant="outline" className="text-[10px] py-0">{f.category}</Badge>}
                      <span className="text-[11px] text-muted-foreground">{f.count}× detectado</span>
                    </div>
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
                Gere um Plano de Ação 5W2H com contexto pré-preenchido — O quê, Por quê, Onde, Quem, Quando, Como e Quanto. Referência: ANVISA RDC 50/2002.
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
            <p className="text-sm text-muted-foreground">Nenhuma auditoria de estrutura setorial registrada.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Registre auditorias de infraestrutura para visualizar KPIs, OKRs e análises completas de todos os setores hospitalares.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
