import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line, ReferenceLine, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";
import {
  ShieldCheck, AlertTriangle, TrendingUp, ClipboardCheck, Loader2, Download,
  Target, Activity, ArrowRight, GitBranch, CheckCircle2, XCircle,
  AlertCircle, Brain, ClipboardList, Flame, Layers, Info, RefreshCw,
} from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";
import ChartActions from "@/components/ChartActions";
import { useAuditDashboard } from "@/hooks/useAuditDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";
import { toast } from "sonner";

// ─── Ishikawa Diagram ─────────────────────────────────────────────────────────

const ISHIKAWA_CATEGORIES = [
  {
    id: "mao_obra",
    label: "Mão de Obra",
    color: "#3b82f6",
    isTop: true,
    tip: [95, 72] as [number, number],
    junction: [220, 200] as [number, number],
    causes: ["Capacitação insuficiente", "Falta de treinamento", "Não adesão ao protocolo"],
  },
  {
    id: "metodo",
    label: "Método",
    color: "#8b5cf6",
    isTop: true,
    tip: [338, 72] as [number, number],
    junction: [450, 200] as [number, number],
    causes: ["Protocolo desatualizado", "Técnica asséptica incorreta", "Sem padronização"],
  },
  {
    id: "maquinas",
    label: "Máquinas/EPI",
    color: "#f59e0b",
    isTop: true,
    tip: [575, 72] as [number, number],
    junction: [680, 200] as [number, number],
    causes: ["EPI insuficiente", "Manutenção inadequada", "Equipamentos contaminados"],
  },
  {
    id: "material",
    label: "Material",
    color: "#10b981",
    isTop: false,
    tip: [150, 328] as [number, number],
    junction: [270, 200] as [number, number],
    causes: ["Antisséptico incorreto", "Curativo inadequado", "Solução contaminada"],
  },
  {
    id: "medicao",
    label: "Medição",
    color: "#ec4899",
    isTop: false,
    tip: [385, 328] as [number, number],
    junction: [500, 200] as [number, number],
    causes: ["Subnotificação de casos", "Vigilância passiva", "Indicadores sem meta"],
  },
  {
    id: "meio_ambiente",
    label: "Meio Ambiente",
    color: "#14b8a6",
    isTop: false,
    tip: [620, 328] as [number, number],
    junction: [715, 200] as [number, number],
    causes: ["Superlotação", "Ventilação deficiente", "Fluxo de pacientes incorreto"],
  },
];

// Pre-computed positions for cause text labels (3 per category)
const CAUSE_TEXT_POSITIONS: Record<string, [number, number][]> = {
  mao_obra:     [[18, 95], [18, 112], [18, 129]],
  metodo:       [[258, 95], [258, 112], [258, 129]],
  maquinas:     [[495, 95], [495, 112], [495, 129]],
  material:     [[18, 340], [18, 357], [18, 374]],
  medicao:      [[253, 340], [253, 357], [253, 374]],
  meio_ambiente:[[490, 340], [490, 357], [490, 374]],
};

function IshikawaDiagram({
  selectedId,
  onSelect,
  topFailures,
}: {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  topFailures: { item: string; count: number; category: string }[];
}) {
  return (
    <svg viewBox="0 0 900 400" className="w-full" style={{ minHeight: 340, maxHeight: 520 }}>
      {/* Background */}
      <rect width="900" height="400" fill="transparent" />

      {/* Main spine */}
      <line x1="40" y1="200" x2="790" y2="200" stroke="#94a3b8" strokeWidth="2.5" />
      {/* Arrowhead */}
      <polygon points="790,193 805,200 790,207" fill="#94a3b8" />

      {/* Effect box */}
      <rect x="806" y="165" width="88" height="70" rx="6" fill="hsl(var(--destructive))" opacity="0.9" />
      <text x="850" y="188" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">FALHAS NO</text>
      <text x="850" y="201" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">CONTROLE</text>
      <text x="850" y="214" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">DE INFECÇÃO</text>
      <text x="850" y="227" textAnchor="middle" fontSize="8" fill="white" opacity="0.85">EFEITO</text>

      {/* Fish tail */}
      <line x1="40" y1="200" x2="10" y2="175" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="40" y1="200" x2="10" y2="225" stroke="#94a3b8" strokeWidth="1.5" />

      {ISHIKAWA_CATEGORIES.map((cat) => {
        const isSelected = selectedId === cat.id;
        const opacity = selectedId && !isSelected ? 0.3 : 1;
        const strokeWidth = isSelected ? 2.5 : 1.8;

        return (
          <g
            key={cat.id}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(isSelected ? null : cat.id)}
            opacity={opacity}
          >
            {/* Main bone */}
            <line
              x1={cat.tip[0]} y1={cat.tip[1]}
              x2={cat.junction[0]} y2={cat.junction[1]}
              stroke={cat.color}
              strokeWidth={strokeWidth}
            />

            {/* Category label circle + text */}
            <circle cx={cat.tip[0]} cy={cat.tip[1]} r="26" fill={cat.color} opacity={isSelected ? 1 : 0.85} />
            <text
              x={cat.tip[0]} y={cat.isTop ? cat.tip[1] - 6 : cat.tip[1] - 6}
              textAnchor="middle"
              fontSize="7.5"
              fontWeight="700"
              fill="white"
            >
              {cat.label.split("/")[0]}
            </text>
            {cat.label.includes("/") && (
              <text x={cat.tip[0]} y={cat.tip[1] + 5} textAnchor="middle" fontSize="7" fontWeight="600" fill="white">
                {cat.label.split("/")[1]}
              </text>
            )}

            {/* Cause text labels */}
            {CAUSE_TEXT_POSITIONS[cat.id].map((pos, i) => (
              <text
                key={i}
                x={pos[0]}
                y={pos[1]}
                fontSize="8.5"
                fill={isSelected ? cat.color : "#64748b"}
                fontWeight={isSelected ? "600" : "400"}
              >
                • {cat.causes[i]}
              </text>
            ))}

            {/* Junction dot */}
            <circle cx={cat.junction[0]} cy={cat.junction[1]} r="4" fill={cat.color} />
          </g>
        );
      })}

      {/* Top label */}
      <text x="450" y="22" textAnchor="middle" fontSize="11" fontWeight="700" fill="#1e293b" opacity="0.8">
        DIAGRAMA DE ISHIKAWA — ANÁLISE DE CAUSA RAIZ
      </text>

      {/* "Click to explore" hint */}
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
  const statusColor = {
    on_track: "text-emerald-600",
    at_risk: "text-amber-600",
    off_track: "text-red-600",
  };
  const statusBar = {
    on_track: "bg-emerald-500",
    at_risk: "bg-amber-500",
    off_track: "bg-red-500",
  };
  const statusIcon = {
    on_track: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />,
    at_risk: <AlertCircle className="h-3.5 w-3.5 text-amber-500" />,
    off_track: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  };

  const avgProgress = Math.round(keyResults.reduce((s, k) => s + k.progress, 0) / keyResults.length);

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold leading-snug">{objective}</CardTitle>
          <span className="text-xs font-bold text-muted-foreground shrink-0">{avgProgress}%</span>
        </div>
        <Progress value={avgProgress} className="h-1.5 mt-1" />
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
      <p className="font-semibold text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <strong>{typeof p.value === "number" ? `${p.value}%` : p.value}</strong></p>
      ))}
    </div>
  );
};

// ─── Sector Compliance Color ──────────────────────────────────────────────────

function sectorColor(compliance: number) {
  if (compliance >= 85) return "bg-emerald-100 text-emerald-800";
  if (compliance >= 75) return "bg-amber-100 text-amber-800";
  return "bg-red-100 text-red-800";
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardInfectionControl() {
  const { hospitalId } = useHospitalContext();
  const { stats, loading, audits, items } = useAuditDashboard("infection_control");
  const navigate = useNavigate();

  const [dia, setDia] = useState<string[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [ano, setAno] = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);
  const [selectedIshikawa, setSelectedIshikawa] = useState<string | null>(null);
  const [ishikawaKey, setIshikawaKey] = useState(0);

  const [metas, setMetas] = useState<Record<string, number | undefined>>({
    evolucao: 85, categoria: 85, setor: 85, pareto: 80, radar: 85,
  });
  const setMeta = (k: string, v: number | undefined) => setMetas(p => ({ ...p, [k]: v }));

  const refs = {
    evolucao: useRef<HTMLDivElement>(null),
    categoria: useRef<HTMLDivElement>(null),
    setor: useRef<HTMLDivElement>(null),
    pareto: useRef<HTMLDivElement>(null),
    radar: useRef<HTMLDivElement>(null),
    ishikawa: useRef<HTMLDivElement>(null),
  };

  const handleRefreshIshikawa = () => {
    setSelectedIshikawa(null);
    setIshikawaKey(k => k + 1);
    toast.success("Análise de causa raiz atualizada");
  };

  // ── Derived metrics ──
  const derived = useMemo(() => {
    const criticalSectors = stats.sectorData.filter((s) => s.compliance < 75).length;
    const warningSectors = stats.sectorData.filter((s) => s.compliance >= 75 && s.compliance < 85).length;
    const goodSectors = stats.sectorData.filter((s) => s.compliance >= 85).length;

    const worstSector = [...stats.sectorData].sort((a, b) => a.compliance - b.compliance)[0];
    const bestSector = [...stats.sectorData].sort((a, b) => b.compliance - a.compliance)[0];

    // Category pie data
    const pieData = stats.categoryData.map((c) => ({
      name: c.name,
      value: c.compliance,
      fill: c.compliance >= 85 ? "#10b981" : c.compliance >= 75 ? "#f59e0b" : "#ef4444",
    }));

    // Monthly trend with target line
    const trendData = stats.monthlyTrend.map((m) => ({
      ...m,
      meta: 85,
      label: m.month.substring(5) + "/" + m.month.substring(2, 4),
    }));

    // Sector bar data with color
    const sectorBarData = stats.sectorData.map((s) => ({
      name: s.name.length > 14 ? s.name.substring(0, 13) + "…" : s.name,
      fullName: s.name,
      conformidade: s.compliance,
      meta: 85,
      auditorias: s.audits,
    }));

    // Pareto data for failures (with demo fallback when there are no audits yet)
    const DEMO_TOP_FAILURES_IC = [
      { item: "Higienização das mãos antes do paciente",       count: 10, category: "Bundle Higiene" },
      { item: "Bundle CVC — clorexidina 2% antes do acesso",   count: 7,  category: "Bundle CVC" },
      { item: "Bundle PAV — cabeceira elevada ≥30°",           count: 6,  category: "Bundle PAV" },
      { item: "Bundle ITU — retirada precoce de SVD",          count: 5,  category: "Bundle ITU" },
      { item: "Higienização do estetoscópio entre pacientes",  count: 4,  category: "Equipamentos" },
      { item: "Descarte adequado de perfurocortantes",         count: 3,  category: "Biossegurança" },
    ];
    const effectiveTopFailures = stats.topFailures.length > 0 ? stats.topFailures : DEMO_TOP_FAILURES_IC;
    const total = effectiveTopFailures.reduce((s, f) => s + f.count, 0);
    let acc = 0;
    const paretoData = effectiveTopFailures.map((f) => {
      acc += f.count;
      return { name: f.item.length > 28 ? f.item.substring(0, 27) + "…" : f.item, count: f.count, acumulado: total > 0 ? Math.round((acc / total) * 100) : 0, categoria: f.category };
    });


    // OKR Key Results
    const kr1Progress = Math.min(100, Math.round((stats.avgCompliance / 90) * 100));
    const kr2Progress = Math.min(100, stats.totalAudits > 0 ? Math.round(Math.min(stats.totalAudits / 4, 1) * 100) : 0);
    const kr3Progress = Math.min(100, stats.nonCompliantItems === 0 ? 100 : Math.max(0, Math.round((1 - stats.nonCompliantItems / Math.max(1, items.length)) * 100)));

    const bundleCat = stats.categoryData.find((c) => /bundle|cvc|pav|itu/i.test(c.name));
    const kr4Progress = bundleCat ? Math.min(100, Math.round((bundleCat.compliance / 80) * 100)) : kr1Progress;
    const kr5Progress = Math.min(100, goodSectors > 0 ? Math.round((goodSectors / Math.max(1, stats.sectorData.length)) * 100) : 0);

    return { criticalSectors, warningSectors, goodSectors, worstSector, bestSector, pieData, trendData, sectorBarData, paretoData, effectiveTopFailures, kr1Progress, kr2Progress, kr3Progress, kr4Progress, kr5Progress };
  }, [stats, items]);

  // ── Export PDF ──
  const handleExportPdf = () => {
    if (!hospitalId) return;
    exportPdf({
      type: "audits",
      hospitalId,
      data: {
        kpis: { avgCompliance: stats.avgCompliance, totalAudits: stats.totalAudits, nonCompliant: stats.nonCompliantItems },
        audits: stats.sectorData.map((s) => ({ type: "Controle de Infecção", sector: s.name, date: "", compliance: s.compliance, compliant: s.audits - s.nonCompliant, total: s.audits })),
      },
      filenamePrefix: "controle-infeccao",
    });
  };

  // ── Navigate to 5W2H with pre-filled context ──
  const handleGerarPlano = () => {
    const topFailure = stats.topFailures[0];
    const worstSector = derived.worstSector;
    navigate("/quality/5w2h", {
      state: {
        prefill: {
          what: topFailure ? `Corrigir não conformidade: ${topFailure.item}` : "Implementar melhorias no controle de infecção",
          why: `Conformidade atual em ${stats.avgCompliance}% (meta: 85%). ${stats.nonCompliantItems} itens críticos identificados.${worstSector ? ` Setor ${worstSector.name} com ${worstSector.compliance}% de conformidade.` : ""}`,
          sector: worstSector?.name || "",
          infectionType: topFailure?.category?.match(/cvc|icsc/i) ? "ICSC-CVC" : topFailure?.category?.match(/pav/i) ? "PAV" : topFailure?.category?.match(/itu/i) ? "ITU-CA" : topFailure?.category?.match(/isc/i) ? "ISC" : "Outros",
        },
      },
    });
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const META = 85;
  const complianceStatus = stats.avgCompliance >= META ? "Adequado" : stats.avgCompliance >= 75 ? "Atenção" : "Crítico";
  const complianceBadgeColor = stats.avgCompliance >= META ? "bg-emerald-100 text-emerald-800" : stats.avgCompliance >= 75 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";

  const kpis = [
    { label: "Conformidade Geral", value: `${stats.avgCompliance}%`, sub: `Meta: ${META}%`, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", status: complianceStatus, statusColor: complianceBadgeColor },
    { label: "Auditorias no Período", value: String(stats.totalAudits), sub: "registros analisados", icon: ClipboardCheck, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", status: null, statusColor: "" },
    { label: "Itens Não Conformes", value: String(stats.nonCompliantItems), sub: "requerem ação", icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", status: stats.nonCompliantItems === 0 ? "Zero" : "Crítico", statusColor: stats.nonCompliantItems === 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800" },
    { label: "Tendência do Período", value: `${stats.improvement >= 0 ? "+" : ""}${stats.improvement}%`, sub: "vs período anterior", icon: TrendingUp, color: stats.improvement >= 0 ? "text-emerald-600" : "text-red-600", bg: stats.improvement >= 0 ? "bg-emerald-50" : "bg-red-50", border: stats.improvement >= 0 ? "border-emerald-200" : "border-red-200", status: null, statusColor: "" },
    { label: "Setores Adequados", value: String(derived.goodSectors), sub: `de ${stats.sectorData.length} setores`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", status: null, statusColor: "" },
    { label: "Setores em Atenção", value: String(derived.warningSectors), sub: "75–84% conformidade", icon: AlertCircle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", status: null, statusColor: "" },
    { label: "Setores Críticos", value: String(derived.criticalSectors), sub: "< 75% conformidade", icon: Flame, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", status: derived.criticalSectors === 0 ? "OK" : "Alerta", statusColor: derived.criticalSectors === 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800" },
    { label: "Categorias Avaliadas", value: String(stats.categoryData.length), sub: `${stats.categoryData.filter((c) => c.compliance >= META).length} dentro da meta`, icon: Layers, color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-200", status: null, statusColor: "" },
  ];

  const PIE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#ef4444"];

  return (
    <div className="space-y-5 md:space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard — Controle de Infecção</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vigilância de processos · KPIs, OKRs e indicadores para tomada de decisão · Meta ANVISA: ≥85%
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4 mr-1" />PDF
          </Button>
          <DashboardAIInsights
            generateInsights={() => {
              const ins: string[] = [];
              ins.push(`📊 Conformidade geral de ${stats.avgCompliance}% com ${stats.totalAudits} auditorias no período.`);
              ins.push(`🏥 ${derived.goodSectors} setores adequados, ${derived.criticalSectors} críticos, ${derived.warningSectors} em atenção.`);
              if (stats.nonCompliantItems > 0) ins.push(`⚠️ ${stats.nonCompliantItems} itens críticos identificados — ação imediata recomendada.`);
              if (stats.topFailures.length > 0) ins.push(`🔻 Principal falha: "${stats.topFailures[0].item}" (${stats.topFailures[0].count}x).`);
              ins.push("💡 Utilize o Diagrama de Ishikawa para análise de causa raiz e gere um Plano 5W2H.");
              return ins;
            }}
          />
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 gap-1.5"
            onClick={handleGerarPlano}
          >
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
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${k.statusColor}`}>{k.status}</span>
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
          <h2 className="text-sm font-semibold">OKRs — Objetivos e Resultados-Chave</h2>
          <Badge variant="outline" className="text-xs">Trimestre atual</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <OkrCard
            objective="O1 · Atingir conformidade ≥90% em todos os protocolos de controle de infecção"
            keyResults={[
              { label: "KR1: Conformidade geral ≥90%", progress: derived.kr1Progress, status: derived.kr1Progress >= 85 ? "on_track" : derived.kr1Progress >= 70 ? "at_risk" : "off_track" },
              { label: "KR2: ≥4 auditorias/mês por setor", progress: derived.kr2Progress, status: derived.kr2Progress >= 75 ? "on_track" : derived.kr2Progress >= 50 ? "at_risk" : "off_track" },
              { label: "KR3: 0 itens críticos recorrentes", progress: derived.kr3Progress, status: derived.kr3Progress >= 80 ? "on_track" : derived.kr3Progress >= 60 ? "at_risk" : "off_track" },
            ]}
          />
          <OkrCard
            objective="O2 · Reduzir IRAS para ≤5/1000 dias-dispositivo nas unidades críticas"
            keyResults={[
              { label: "KR1: Bundle CVC ≥85% conformidade", progress: derived.kr4Progress, status: derived.kr4Progress >= 85 ? "on_track" : derived.kr4Progress >= 70 ? "at_risk" : "off_track" },
              { label: "KR2: Bundle PAV ≥80% conformidade", progress: Math.round(derived.kr4Progress * 0.9), status: derived.kr4Progress * 0.9 >= 80 ? "on_track" : derived.kr4Progress * 0.9 >= 65 ? "at_risk" : "off_track" },
              { label: "KR3: Higiene das mãos ≥90%", progress: derived.kr1Progress, status: derived.kr1Progress >= 90 ? "on_track" : derived.kr1Progress >= 75 ? "at_risk" : "off_track" },
            ]}
          />
          <OkrCard
            objective="O3 · Zero infecção cirúrgica evitável e excelência em setores críticos"
            keyResults={[
              { label: "KR1: Todos setores UTI ≥85%", progress: derived.kr5Progress, status: derived.kr5Progress >= 80 ? "on_track" : derived.kr5Progress >= 60 ? "at_risk" : "off_track" },
              { label: "KR2: ISC < 1% cirurgias limpas", progress: Math.round(derived.kr3Progress * 0.85), status: derived.kr3Progress * 0.85 >= 75 ? "on_track" : "at_risk" },
              { label: "KR3: Profilaxia antibiótica ≥95%", progress: Math.round(derived.kr1Progress * 1.05) > 100 ? 100 : Math.round(derived.kr1Progress * 1.05), status: derived.kr1Progress >= 85 ? "on_track" : "at_risk" },
            ]}
          />
        </div>
      </div>

      {/* ── Charts Row 1: Trend + Category Donut ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" ref={refs.evolucao}>
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
            <div className="min-w-0">
              <CardTitle className="text-sm">Evolução Mensal da Conformidade</CardTitle>
              <CardDescription className="text-xs">Tendência vs meta · linha tracejada = referência ANVISA</CardDescription>
            </div>
            <ChartActions chartRef={refs.evolucao} chartTitle="Evolução Mensal da Conformidade" metaValue={metas.evolucao} onMetaChange={v => setMeta("evolucao", v)} metaUnit="%" />
          </CardHeader>
          <CardContent>
            {derived.trendData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados de tendência disponíveis</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={derived.trendData} margin={{ left: -10, right: 10 }}>
                  <defs>
                    <linearGradient id="gradCompliance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(168,66%,34%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(168,66%,34%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                  <Tooltip content={<CustomTooltip />} />
                  {metas.evolucao !== undefined && <ReferenceLine y={metas.evolucao} stroke="#ef4444" strokeDasharray="5 3" strokeWidth={1.5} label={{ value: `Meta ${metas.evolucao}%`, position: "insideTopRight", fontSize: 10, fill: "#ef4444" }} />}
                  <Area dataKey="compliance" name="Conformidade" stroke="hsl(168,66%,34%)" fill="url(#gradCompliance)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card ref={refs.categoria}>
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
            <div className="min-w-0">
              <CardTitle className="text-sm">Distribuição por Categoria</CardTitle>
              <CardDescription className="text-xs">% conformidade por protocolo auditado</CardDescription>
            </div>
            <ChartActions chartRef={refs.categoria} chartTitle="Distribuição por Categoria" metaValue={metas.categoria} onMetaChange={v => setMeta("categoria", v)} metaUnit="%" />
          </CardHeader>
          <CardContent>
            {derived.pieData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem categorias</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={derived.pieData}
                    cx="50%"
                    cy="48%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {derived.pieData.map((entry, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Charts Row 2: Sector Bar + Radar ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" ref={refs.setor}>
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
            <div className="min-w-0">
              <CardTitle className="text-sm">Conformidade por Setor</CardTitle>
              <CardDescription className="text-xs">Cores por faixa · linha vermelha = meta</CardDescription>
            </div>
            <ChartActions chartRef={refs.setor} chartTitle="Conformidade por Setor" metaValue={metas.setor} onMetaChange={v => setMeta("setor", v)} metaUnit="%" />
          </CardHeader>
          <CardContent>
            {derived.sectorBarData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados por setor</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(280, derived.sectorBarData.length * 32)}>
                <ComposedChart data={derived.sectorBarData} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {metas.setor !== undefined && <ReferenceLine x={metas.setor} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} label={{ value: `${metas.setor}%`, position: "top", fontSize: 10, fill: "#ef4444" }} />}
                  <Bar dataKey="conformidade" name="Conformidade" radius={[0, 3, 3, 0]}>
                    {derived.sectorBarData.map((entry, index) => (
                      <Cell key={index} fill={entry.conformidade >= (metas.setor ?? META) ? "#10b981" : entry.conformidade >= 75 ? "#f59e0b" : "#ef4444"} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2" ref={refs.radar}>
          <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
            <div className="min-w-0">
              <CardTitle className="text-sm">Radar de Conformidade</CardTitle>
              <CardDescription className="text-xs">Visão multidimensional por categoria · meta tracejada</CardDescription>
            </div>
            <ChartActions chartRef={refs.radar} chartTitle="Radar de Conformidade" metaValue={metas.radar} onMetaChange={v => setMeta("radar", v)} metaUnit="%" />
          </CardHeader>
          <CardContent className="flex justify-center">
            {stats.categoryData.length < 3 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Mínimo 3 categorias</div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart data={stats.categoryData.map((c) => ({ subject: c.name.length > 16 ? c.name.substring(0, 15) + "…" : c.name, A: c.compliance, meta: metas.radar ?? META }))} margin={{ top: 12, right: 36, bottom: 12, left: 36 }}>
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <Radar dataKey="A" name="Conformidade" stroke="hsl(168,66%,34%)" fill="hsl(168,66%,34%)" fillOpacity={0.35} />
                  {metas.radar !== undefined && <Radar dataKey="meta" name={`Meta ${metas.radar}%`} stroke="#ef4444" fill="transparent" strokeDasharray="4 2" />}
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Sector Risk Classification Table ── */}
      {stats.sectorData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">Classificação de Risco por Setor</CardTitle>
                <CardDescription className="text-xs">Verde ≥85% · Amarelo 75–84% · Vermelho &lt;75%</CardDescription>
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
              {stats.sectorData.map((s) => (
                <div key={s.name} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.audits} auditoria{s.audits !== 1 ? "s" : ""}</p>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-sm font-bold ${sectorColor(s.compliance)}`}>
                      {s.compliance}%
                    </span>
                    {s.nonCompliant > 0 && (
                      <p className="text-xs text-red-600 mt-0.5">{s.nonCompliant} NC</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Top Non-conformities + Pareto ── */}
      {derived.effectiveTopFailures.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Não Conformidades</CardTitle>
              <CardDescription className="text-xs">Itens com maior frequência de falha no período</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {derived.effectiveTopFailures.map((f, i) => (
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
                  <Progress value={derived.effectiveTopFailures[0] ? (f.count / derived.effectiveTopFailures[0].count) * 100 : 0} className="h-1.5" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card ref={refs.pareto}>
            <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2 space-y-0">
              <div className="min-w-0">
                <CardTitle className="text-sm">Análise de Pareto — Não Conformidades</CardTitle>
                <CardDescription className="text-xs">Frequência absoluta · linha = % acumulado · meta {metas.pareto ?? 80}%</CardDescription>
              </div>
              <ChartActions chartRef={refs.pareto} chartTitle="Análise de Pareto" metaValue={metas.pareto} onMetaChange={v => setMeta("pareto", v)} metaUnit="%" />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={derived.paretoData} margin={{ left: 0, right: 16, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis yAxisId="left" tick={{ fontSize: 10 }} width={30} />
                  <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" width={36} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Bar yAxisId="left" dataKey="count" name="Ocorrências" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" dataKey="acumulado" name="% Acumulado" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  {metas.pareto !== undefined && <ReferenceLine yAxisId="right" y={metas.pareto} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: `${metas.pareto}%`, position: "right", fontSize: 10, fill: "#f59e0b" }} />}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Causa Raiz + Ishikawa ── */}
      <Card ref={refs.ishikawa}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Brain className="h-4 w-4 text-primary shrink-0" />
              <div className="min-w-0">
                <CardTitle className="text-sm">Análise de Causa Raiz — Diagrama de Ishikawa (6M)</CardTitle>
                <CardDescription className="text-xs">Clique em uma categoria para focar · identifica causas raiz das não conformidades</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {selectedIshikawa && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedIshikawa(null)}>
                  <XCircle className="h-3.5 w-3.5 mr-1" /> Limpar
                </Button>
              )}
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleRefreshIshikawa} title="Atualizar análise">
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
              <ChartActions chartRef={refs.ishikawa} chartTitle="Análise de Causa Raiz - Ishikawa" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div key={ishikawaKey} className="w-full overflow-x-auto">
            <div className="min-w-[760px]">
              <IshikawaDiagram
                selectedId={selectedIshikawa}
                onSelect={setSelectedIshikawa}
                topFailures={derived.effectiveTopFailures}
              />
            </div>
          </div>

          {/* Selected category detail panel */}
          {selectedIshikawa && (() => {
            const cat = ISHIKAWA_CATEGORIES.find((c) => c.id === selectedIshikawa);
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
                  {cat.causes.map((cause, i) => {
                    const relatedFailure = derived.effectiveTopFailures.find((f) =>
                      f.item.toLowerCase().includes(cause.split(" ")[0].toLowerCase())
                    );
                    return (
                      <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-background border">
                        <span className="mt-0.5 text-base" style={{ color: cat.color }}>•</span>
                        <div>
                          <p className="text-sm font-medium">{cause}</p>
                          {relatedFailure && (
                            <p className="text-xs text-muted-foreground mt-0.5">↑ Detectado: {relatedFailure.count}× no período</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 p-2.5 rounded-md bg-background border flex items-start gap-2">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground">
                    <strong>Ação recomendada:</strong> Gere um Plano 5W2H focado nas causas de <strong>{cat.label}</strong> para rastrear responsáveis, prazos e recursos necessários.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Summary of detected failures mapped to categories */}
          {derived.effectiveTopFailures.length > 0 && (
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {derived.effectiveTopFailures.slice(0, 6).map((f, i) => (
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

      {/* ── Call to Action — Gerar Plano 5W2H ── */}
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
              {derived.effectiveTopFailures[0] && (
                <p className="text-xs text-primary font-medium mt-1">
                  Principal falha identificada: "{derived.effectiveTopFailures[0].item}" ({derived.effectiveTopFailures[0].count}×)
                </p>
              )}
            </div>
          </div>
          <Button
            size="default"
            className="shrink-0 gap-2"
            onClick={handleGerarPlano}
          >
            <ClipboardList className="h-4 w-4" />
            Gerar Plano 5W2H
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {stats.totalAudits === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma auditoria de controle de infecção registrada.</p>
            <p className="text-xs text-muted-foreground mt-1">Registre auditorias para visualizar KPIs, OKRs e análises completas.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
