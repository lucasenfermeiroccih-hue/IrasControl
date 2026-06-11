import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, ReferenceLine, PieChart, Pie, Cell, Legend,
  AreaChart, Area, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import {
  FlaskConical, CheckCircle2, AlertTriangle, MapPin, Loader2, Download,
  XCircle, AlertCircle, Target, TrendingUp, ArrowRight, Brain, ClipboardList,
  GitBranch, Droplets, Activity, Info, Flame, ShieldCheck, PackageX,
  PackageCheck, Wrench, RefreshCw,
} from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";
import ChartActions from "@/components/ChartActions";
import { useAuditDashboard } from "@/hooks/useAuditDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";
import { toast } from "@/hooks/use-toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const META = 90;

const DISPENSER_TYPES = [
  { id: "alcool",   label: "Álcool Gel (FMCA)", color: "#3b82f6",  icon: "🧴", keywords: ["álcool", "alcool", "fmca", "abhr", "gel"] },
  { id: "sabonete", label: "Sabonete Líquido",   color: "#8b5cf6",  icon: "🫧", keywords: ["sabonete", "liquid", "lavagem"] },
  { id: "papel",    label: "Papel Toalha",        color: "#f59e0b",  icon: "🧻", keywords: ["papel", "toalha", "secagem"] },
  { id: "luvas",    label: "Luvas / EPI",          color: "#10b981", icon: "🧤", keywords: ["luva", "epi", "proteção"] },
  { id: "geral",    label: "Condições Gerais",     color: "#ec4899", icon: "🔧", keywords: ["condi", "geral", "manutenção", "posição"] },
];

// ─── Ishikawa (adaptado para Dispensers) ─────────────────────────────────────

const DISP_ISHIKAWA = [
  {
    id: "mao_obra",
    label: "Mão de Obra",
    color: "#3b82f6",
    isTop: true,
    tip: [95, 72] as [number, number],
    junction: [220, 200] as [number, number],
    causes: ["Falha na reposição", "Sem responsável definido", "Falta de treinamento"],
  },
  {
    id: "metodo",
    label: "Método",
    color: "#8b5cf6",
    isTop: true,
    tip: [338, 72] as [number, number],
    junction: [450, 200] as [number, number],
    causes: ["Sem rotina de reposição", "Cronograma inadequado", "Processo não padronizado"],
  },
  {
    id: "maquinas",
    label: "Máquinas",
    color: "#f59e0b",
    isTop: true,
    tip: [575, 72] as [number, number],
    junction: [680, 200] as [number, number],
    causes: ["Dispenser defeituoso", "Bomba/trava quebrada", "Modelo inadequado"],
  },
  {
    id: "material",
    label: "Material",
    color: "#10b981",
    isTop: false,
    tip: [150, 328] as [number, number],
    junction: [270, 200] as [number, number],
    causes: ["Álcool gel em falta", "Fornecimento irregular", "Estoque insuficiente"],
  },
  {
    id: "medicao",
    label: "Medição",
    color: "#ec4899",
    isTop: false,
    tip: [385, 328] as [number, number],
    junction: [500, 200] as [number, number],
    causes: ["Sem monitoramento", "Checklist não realizado", "Dados incompletos"],
  },
  {
    id: "meio_ambiente",
    label: "Meio Ambiente",
    color: "#14b8a6",
    isTop: false,
    tip: [620, 328] as [number, number],
    junction: [715, 200] as [number, number],
    causes: ["Localização inadequada", "Acesso dificultado", "Vandalismo/remoção"],
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

function IshikawaDispenser({
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
      <rect x="806" y="162" width="88" height="76" rx="6" fill="#f59e0b" opacity="0.9" />
      <text x="850" y="185" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">DISPENSERS</text>
      <text x="850" y="198" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">NÃO</text>
      <text x="850" y="211" textAnchor="middle" fontSize="9" fontWeight="700" fill="white">CONFORMES</text>
      <text x="850" y="228" textAnchor="middle" fontSize="8" fill="white" opacity="0.85">EFEITO</text>
      <line x1="40" y1="200" x2="10" y2="175" stroke="#94a3b8" strokeWidth="1.5" />
      <line x1="40" y1="200" x2="10" y2="225" stroke="#94a3b8" strokeWidth="1.5" />

      {DISP_ISHIKAWA.map((cat) => {
        const isSelected = selectedId === cat.id;
        const opacity = selectedId && !isSelected ? 0.3 : 1;
        return (
          <g key={cat.id} style={{ cursor: "pointer" }} onClick={() => onSelect(isSelected ? null : cat.id)} opacity={opacity}>
            <line x1={cat.tip[0]} y1={cat.tip[1]} x2={cat.junction[0]} y2={cat.junction[1]}
              stroke={cat.color} strokeWidth={isSelected ? 2.5 : 1.8} />
            <circle cx={cat.tip[0]} cy={cat.tip[1]} r="26" fill={cat.color} opacity={isSelected ? 1 : 0.85} />
            <text x={cat.tip[0]} y={cat.tip[1] - 6} textAnchor="middle" fontSize="7.5" fontWeight="700" fill="white">
              {cat.label}
            </text>
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
        DIAGRAMA DE ISHIKAWA — ANÁLISE DE CAUSA RAIZ · DISPENSERS
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

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function DashboardDispenser() {
  const { hospitalId } = useHospitalContext();
  const { stats, items, audits, loading } = useAuditDashboard("dispenser");
  const navigate = useNavigate();

  const [dia, setDia]   = useState<string[]>([]);
  const [mes, setMes]   = useState<string[]>([]);
  const [ano, setAno]   = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);
  const [selectedIshikawa, setSelectedIshikawa] = useState<string | null>(null);
  const [ishikawaKey, setIshikawaKey] = useState(0);

  const [metaEvolucao, setMetaEvolucao] = useState<number | undefined>(META);
  const [metaSetor, setMetaSetor] = useState<number | undefined>(META);
  const [metaCategoria, setMetaCategoria] = useState<number | undefined>(META);
  const [metaRadar, setMetaRadar] = useState<number | undefined>(META);
  const [metaPareto, setMetaPareto] = useState<number | undefined>(80);

  const refEvolucao = useRef<HTMLDivElement>(null);
  const refPie = useRef<HTMLDivElement>(null);
  const refSetor = useRef<HTMLDivElement>(null);
  const refCategoria = useRef<HTMLDivElement>(null);
  const refRadar = useRef<HTMLDivElement>(null);
  const refPareto = useRef<HTMLDivElement>(null);
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
    const totalAudits   = filteredAudits.length;
    const avgCompliance = totalAudits > 0
      ? Math.round((filteredAudits.reduce((s, a) => s + (a.compliance_rate || 0), 0) / totalAudits) * 10) / 10
      : 0;
    const nonCompliant  = filteredItems.filter(i => i.status === "non_compliant").length;
    const compliant     = filteredItems.filter(i => i.status === "compliant").length;
    const totalItems    = filteredItems.filter(i => i.status !== "not_applicable" && i.status !== "not_evaluated").length;
    const naItems       = filteredItems.filter(i => i.status === "not_applicable").length;

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
    })).sort((a, b) => a.compliance - b.compliance);

    const criticalSectors = sectorData.filter(s => s.compliance < 75).length;
    const warningSectors  = sectorData.filter(s => s.compliance >= 75 && s.compliance < META).length;
    const goodSectors     = sectorData.filter(s => s.compliance >= META).length;
    const worstSector     = sectorData[0];

    // Top failures
    const failCounts: Record<string, { count: number; category: string }> = {};
    filteredItems.filter(i => i.status === "non_compliant").forEach(i => {
      if (!failCounts[i.question]) failCounts[i.question] = { count: 0, category: i.category || "" };
      failCounts[i.question].count++;
    });
    const DEMO_TOP_FAILURES_DISP = [
      { item: "Reservatório vazio no momento da auditoria",   count: 9, category: "Abastecimento" },
      { item: "Dispenser sem identificação do produto",        count: 6, category: "Identificação" },
      { item: "Localização inadequada (longe do leito)",       count: 5, category: "Instalação" },
      { item: "Acionamento difícil ou quebrado",               count: 4, category: "Manutenção" },
      { item: "Sem manutenção registrada nos últimos 30 dias", count: 3, category: "Manutenção" },
      { item: "Sabonete comum em vez de antisséptico em UTI",  count: 2, category: "Produto" },
    ];
    const realTopDisp = Object.entries(failCounts)
      .sort(([, a], [, b]) => b.count - a.count).slice(0, 6)
      .map(([item, v]) => ({ item, count: v.count, category: v.category }));
    const topFailures = realTopDisp.length > 0 ? realTopDisp : DEMO_TOP_FAILURES_DISP;


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
      .map(([name, v]) => ({ name, compliance: v.total > 0 ? Math.round((v.compliant / v.total) * 100) : 0, total: v.total }))
      .sort((a, b) => a.compliance - b.compliance);

    // Dispenser type mapping
    const dispenserTypes = DISPENSER_TYPES.map(dt => {
      const matched = categoryData.filter(c =>
        dt.keywords.some(kw => c.name.toLowerCase().includes(kw))
      );
      const avg = matched.length > 0
        ? Math.round(matched.reduce((s, c) => s + c.compliance, 0) / matched.length)
        : 0;
      return { ...dt, compliance: avg, hasData: matched.length > 0 };
    });

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
      { name: "Conformes",       value: compliant,           fill: "#10b981" },
      { name: "Não Conformes",   value: nonCompliant,        fill: "#ef4444" },
      { name: "N/A",             value: naItems,             fill: "#94a3b8" },
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
      totalAudits, avgCompliance, nonCompliant, compliant, totalItems, naItems,
      sectorData, criticalSectors, warningSectors, goodSectors, worstSector,
      topFailures, categoryData, dispenserTypes, monthlyTrend, improvement, pieData, paretoData,
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
        audits: fStats.sectorData.map(s => ({ type: "Dispensers", sector: s.name, date: "", compliance: s.compliance, compliant: s.audits - s.nc, total: s.audits })),
      },
      filenamePrefix: "dispensers",
    });
  };

  // ── Navigate to 5W2H ──
  const handleGerarPlano = () => {
    const top = fStats.topFailures[0];
    navigate("/quality/5w2h", {
      state: {
        prefill: {
          what: top
            ? `Corrigir não conformidade em dispenser: ${top.item}`
            : "Implementar plano de manutenção e reposição de dispensers",
          why: `Conformidade de dispensers em ${fStats.avgCompliance}% (meta: ${META}%). ${fStats.nonCompliant} itens não conformes.${fStats.worstSector ? ` Pior setor: ${fStats.worstSector.name} com ${fStats.worstSector.compliance}%.` : ""}`,
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

  const complianceStatus    = fStats.avgCompliance >= META ? "Adequado" : fStats.avgCompliance >= 75 ? "Atenção" : "Crítico";
  const complianceBadgeCol  = fStats.avgCompliance >= META ? "bg-emerald-100 text-emerald-800" : fStats.avgCompliance >= 75 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";

  const kpis = [
    { label: "Conformidade Geral",   value: `${fStats.avgCompliance}%`,  sub: `Meta: ${META}%`,          icon: ShieldCheck,  color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", status: complianceStatus, statusColor: complianceBadgeCol },
    { label: "Dispensers Auditados", value: String(fStats.totalAudits),  sub: "registros no período",    icon: FlaskConical, color: "text-blue-600",    bg: "bg-blue-50",    border: "border-blue-200",    status: null, statusColor: "" },
    { label: "Itens Conformes",      value: String(fStats.compliant),    sub: `de ${fStats.totalItems} avaliados`, icon: PackageCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", status: null, statusColor: "" },
    { label: "Não Conformidades",    value: String(fStats.nonCompliant), sub: "requerem ação imediata",  icon: PackageX,     color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",     status: fStats.nonCompliant === 0 ? "Zero" : "Crítico", statusColor: fStats.nonCompliant === 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800" },
    { label: "Setores Adequados",    value: String(fStats.goodSectors),  sub: `de ${fStats.sectorData.length} setores`, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", status: null, statusColor: "" },
    { label: "Setores em Atenção",   value: String(fStats.warningSectors), sub: "75–89% conformidade", icon: AlertCircle,  color: "text-amber-600",   bg: "bg-amber-50",   border: "border-amber-200",   status: null, statusColor: "" },
    { label: "Setores Críticos",     value: String(fStats.criticalSectors), sub: "< 75% conformidade", icon: Flame,        color: "text-red-600",     bg: "bg-red-50",     border: "border-red-200",     status: fStats.criticalSectors === 0 ? "OK" : "Alerta", statusColor: fStats.criticalSectors === 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800" },
    { label: "Tendência do Período", value: `${fStats.improvement >= 0 ? "+" : ""}${fStats.improvement}%`, sub: "vs período anterior", icon: TrendingUp, color: fStats.improvement >= 0 ? "text-emerald-600" : "text-red-600", bg: fStats.improvement >= 0 ? "bg-emerald-50" : "bg-red-50", border: fStats.improvement >= 0 ? "border-emerald-200" : "border-red-200", status: null, statusColor: "" },
  ];

  return (
    <div className="space-y-5 md:space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard — Vigilância de Dispensers</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoramento de insumos · álcool gel, sabonete, papel toalha · Meta: ≥{META}%
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPdf}>
            <Download className="h-4 w-4 mr-1" />PDF
          </Button>
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            ins.push(`📊 Conformidade geral de ${fStats.avgCompliance}% com ${fStats.totalAudits} dispensers auditados.`);
            ins.push(`✅ ${fStats.compliant} itens conformes · ❌ ${fStats.nonCompliant} não conformes.`);
            ins.push(`🏥 ${fStats.criticalSectors} setor(es) crítico(s) abaixo de 75%.`);
            if (fStats.topFailures[0]) ins.push(`🔻 Principal falha: "${fStats.topFailures[0].item}" (${fStats.topFailures[0].count}×).`);
            ins.push("💡 Recomendação: implementar rotina diária de inspeção e reposição por setor responsável.");
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
          <h2 className="text-sm font-semibold">OKRs — Objetivos e Resultados-Chave · Dispensers</h2>
          <Badge variant="outline" className="text-xs">Trimestre atual</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <OkrCard
            objective="O1 · 100% dispensers abastecidos e funcionais nos pontos de assistência"
            keyResults={[
              { label: "KR1: Conformidade geral ≥90%", progress: kr1, status: kr1 >= 90 ? "on_track" : kr1 >= 70 ? "at_risk" : "off_track" },
              { label: "KR2: ≥4 inspeções/setor/mês",  progress: kr2, status: kr2 >= 75 ? "on_track" : kr2 >= 50 ? "at_risk" : "off_track" },
              { label: "KR3: 0 dispensers vazios em UTI", progress: fStats.criticalSectors === 0 ? 100 : Math.max(0, kr3), status: fStats.criticalSectors === 0 ? "on_track" : "off_track" },
            ]}
          />
          <OkrCard
            objective="O2 · Eliminar setores críticos — zero unidades com conformidade <75%"
            keyResults={[
              { label: "KR1: Setores críticos = 0",     progress: kr3, status: kr3 >= 85 ? "on_track" : kr3 >= 60 ? "at_risk" : "off_track" },
              { label: "KR2: 100% setores ≥90%",        progress: kr4, status: kr4 >= 80 ? "on_track" : kr4 >= 60 ? "at_risk" : "off_track" },
              { label: "KR3: Melhoria ≥5pp no período", progress: Math.min(100, Math.max(0, 50 + fStats.improvement * 10)), status: fStats.improvement >= 5 ? "on_track" : fStats.improvement >= 0 ? "at_risk" : "off_track" },
            ]}
          />
          <OkrCard
            objective="O3 · Reduzir não conformidades e garantir rastreabilidade de insumos"
            keyResults={[
              { label: "KR1: NC itens = 0",                 progress: kr5, status: kr5 >= 90 ? "on_track" : kr5 >= 70 ? "at_risk" : "off_track" },
              { label: "KR2: Álcool gel ≥90% disponível", progress: Math.round(kr1 * 1.02) > 100 ? 100 : Math.round(kr1 * 1.02), status: kr1 >= 87 ? "on_track" : "at_risk" },
              { label: "KR3: Checklist diário por setor",    progress: kr2, status: kr2 >= 75 ? "on_track" : "at_risk" },
            ]}
          />
        </div>
      </div>

      {/* ── Dispenser Types Status ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Droplets className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Status por Tipo de Insumo / Dispenser</h2>
          <Badge variant="outline" className="text-xs">Por categoria auditada</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {fStats.dispenserTypes.map((dt) => {
            const pct = dt.hasData ? dt.compliance : fStats.avgCompliance;
            const statusCol = pct >= META ? "text-emerald-600" : pct >= 75 ? "text-amber-600" : "text-red-600";
            const bgCol     = pct >= META ? "bg-emerald-50 border-emerald-200" : pct >= 75 ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200";
            const tag       = pct >= META ? "OK" : pct >= 75 ? "Atenção" : "Crítico";
            const tagCol    = pct >= META ? "bg-emerald-100 text-emerald-800" : pct >= 75 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
            return (
              <Card key={dt.id} className={`border ${bgCol}`}>
                <CardContent className="pt-4 pb-3 text-center">
                  <div className="text-2xl mb-1">{dt.icon}</div>
                  <p className="text-xs font-semibold mb-1 leading-tight" style={{ color: dt.color }}>{dt.label}</p>
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
        <Card ref={refEvolucao} className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-sm">Evolução Mensal da Conformidade</CardTitle>
              <CardDescription className="text-xs">Tendência vs meta de {metaEvolucao ?? META}% · linha vermelha = referência</CardDescription>
            </div>
            <ChartActions chartRef={refEvolucao} chartTitle="Evolução Mensal da Conformidade" metaValue={metaEvolucao} onMetaChange={setMetaEvolucao} metaUnit="%" />
          </CardHeader>
          <CardContent>
            {fStats.monthlyTrend.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados de tendência</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={fStats.monthlyTrend} margin={{ left: -10, right: 10 }}>
                  <defs>
                    <linearGradient id="gradDisp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
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
                  <Area dataKey="compliance" name="Conformidade" stroke="#f59e0b" fill="url(#gradDisp)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card ref={refPie}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-sm">Status Geral dos Itens</CardTitle>
              <CardDescription className="text-xs">Distribuição de conformidade dos itens auditados</CardDescription>
            </div>
            <ChartActions chartRef={refPie} chartTitle="Status Geral dos Itens" />
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
        <Card ref={refSetor}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-sm">Conformidade por Setor</CardTitle>
              <CardDescription className="text-xs">Verde ≥{metaSetor ?? META}% · Amarelo intermediário · Vermelho abaixo · linha = meta</CardDescription>
            </div>
            <ChartActions chartRef={refSetor} chartTitle="Conformidade por Setor" metaValue={metaSetor} onMetaChange={setMetaSetor} metaUnit="%" />
          </CardHeader>
          <CardContent>
            {fStats.sectorData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados por setor</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, fStats.sectorData.length * 32)}>
                <ComposedChart data={fStats.sectorData} layout="vertical" margin={{ left: 0, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                  <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                  {metaSetor !== undefined && (
                    <ReferenceLine x={metaSetor} stroke="#ef4444" strokeDasharray="4 2" strokeWidth={1.5} />
                  )}
                  <Bar dataKey="compliance" name="Conformidade" radius={[0, 3, 3, 0]}>
                    {fStats.sectorData.map((entry, i) => {
                      const goal = metaSetor ?? META;
                      return (
                        <Cell key={i} fill={entry.compliance >= goal ? "#10b981" : entry.compliance >= goal * 0.83 ? "#f59e0b" : "#ef4444"} />
                      );
                    })}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card ref={refCategoria}>
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
            <div>
              <CardTitle className="text-sm">Conformidade por Categoria de Item</CardTitle>
              <CardDescription className="text-xs">Itens ordenados do pior para o melhor desempenho</CardDescription>
            </div>
            <ChartActions chartRef={refCategoria} chartTitle="Conformidade por Categoria" metaValue={metaCategoria} onMetaChange={setMetaCategoria} metaUnit="%" />
          </CardHeader>
          <CardContent>
            {fStats.categoryData.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">Sem dados por categoria</div>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, fStats.categoryData.length * 32)}>
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
                      const goal = metaCategoria ?? META;
                      return (
                        <Cell key={i} fill={entry.compliance >= goal ? "#10b981" : entry.compliance >= goal * 0.83 ? "#f59e0b" : "#ef4444"} />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Radar + Sector Risk Table ── */}
      <div className="grid gap-4 lg:grid-cols-5">
        {fStats.categoryData.length >= 3 && (
          <Card ref={refRadar} className="lg:col-span-2">
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-sm">Radar — Conformidade Multidimensional</CardTitle>
                <CardDescription className="text-xs">Visão 360° por categoria · linha vermelha = meta</CardDescription>
              </div>
              <ChartActions chartRef={refRadar} chartTitle="Radar — Conformidade" metaValue={metaRadar} onMetaChange={setMetaRadar} metaUnit="%" />
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <RadarChart
                  data={fStats.categoryData.map(c => ({
                    subject: c.name.length > 14 ? c.name.substring(0, 13) + "…" : c.name,
                    A: c.compliance,
                    meta: metaRadar ?? META,
                  }))}
                  margin={{ top: 16, right: 24, bottom: 16, left: 24 }}
                >
                  <PolarGrid className="stroke-border" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 8 }} />
                  <Radar dataKey="A" name="Conformidade" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.3} />
                  <Radar dataKey="meta" name="Meta" stroke="#ef4444" fill="transparent" strokeDasharray="4 2" />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <Card className={fStats.categoryData.length < 3 ? "lg:col-span-5" : "lg:col-span-3"}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-sm">Classificação de Risco por Setor</CardTitle>
                <CardDescription className="text-xs">Verde ≥90% · Amarelo 75–89% · Vermelho &lt;75%</CardDescription>
              </div>
              <div className="flex gap-1.5 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">Adequado</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium">Atenção</span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">Crítico</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {fStats.sectorData.map((s) => {
                const col = s.compliance >= META ? "bg-emerald-100 text-emerald-800" : s.compliance >= 75 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800";
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
      </div>

      {/* ── Top Failures + Pareto ── */}
      {fStats.topFailures.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Top Não Conformidades de Dispensers</CardTitle>
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

          <Card ref={refPareto}>
            <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
              <div>
                <CardTitle className="text-sm">Análise de Pareto — Não Conformidades</CardTitle>
                <CardDescription className="text-xs">80% dos problemas concentrados em poucas causas (regra 80/20)</CardDescription>
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
                  <Bar yAxisId="left" dataKey="count" name="Ocorrências" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="right" dataKey="acumulado" name="% Acumulado" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  {metaPareto !== undefined && (
                    <ReferenceLine yAxisId="right" y={metaPareto} stroke="#3b82f6" strokeDasharray="4 2"
                      label={{ value: `Meta ${metaPareto}%`, position: "insideTopRight", fontSize: 10, fill: "#3b82f6" }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Ishikawa Causa Raiz ── */}
      <Card ref={refIshikawa}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-sm">Análise de Causa Raiz — Diagrama de Ishikawa (6M)</CardTitle>
                <CardDescription className="text-xs">Causas das não conformidades de dispensers · Clique em uma categoria para detalhar</CardDescription>
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
              <ChartActions chartRef={refIshikawa} chartTitle="Ishikawa — Dispensers" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <div className="min-w-[760px]" style={{ minHeight: 340 }}>
              <IshikawaDispenser
                key={ishikawaKey}
                selectedId={selectedIshikawa}
                onSelect={setSelectedIshikawa}
                topFailures={fStats.topFailures}
              />
            </div>
          </div>


          {selectedIshikawa && (() => {
            const cat = DISP_ISHIKAWA.find(c => c.id === selectedIshikawa);
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
                    <strong>Ação recomendada:</strong> Gere um Plano 5W2H focado em <strong>{cat.label}</strong> para definir responsáveis, cronograma de inspeção e recursos necessários.
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
            <p className="text-sm text-muted-foreground">Nenhuma auditoria de dispensers registrada.</p>
            <p className="text-xs text-muted-foreground mt-1">Registre auditorias para visualizar KPIs, OKRs e análises completas.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
