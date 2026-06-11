/**
 * DashboardAnalysisTabs — Reusable analysis section for all CCIH dashboards.
 * Tabs: Causa Raiz (Ishikawa + Pareto) | SWOT | Matriz de Risco | PDCA
 * Each tab includes a "Gerar Plano 5W2H" button that pre-fills the form.
 */
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Cell, LabelList,
} from "recharts";
import ChartActions from "@/components/ChartActions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import {
  RefreshCw, FileText, AlertTriangle, CheckCircle2, Target,
  TrendingUp, Lightbulb, Eye, Plus, Trash2, RotateCcw,
  Shield, Zap, GitMerge, Sparkles, Loader2,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
export interface IshikawaCategory {
  id?: string;
  label?: string;
  color?: string;
  causes?: string[];
  [key: string]: any;
}

export interface ParetoItem {
  question?: string;
  fullQuestion?: string;
  count?: number;
  acumulado?: number;
  [key: string]: any;
}

export interface SWOTData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface RiskItem {
  name?: string;
  probability: number; // 1-5
  impact: number;      // 1-5
  category?: string;
  [key: string]: any;
}

export interface PDCAData {
  plan: string[];
  do: string[];
  check: string[];
  act: string[];
}

export interface AnalysisConfig {
  domain: string;       // e.g. "Dashboard DDD — Antimicrobianos"
  effectLabel: string;  // text in Ishikawa effect box
  ishikawaCategories: IshikawaCategory[];
  paretoData?: ParetoItem[];
  swotData: SWOTData;
  risks: RiskItem[];
  pdcaData: PDCAData;
  stats?: {
    value?: string | number;
    label?: string;
    issues?: number;
    topIssue?: string;
    sector?: string;
  };
}

// ─── SVG Bone geometry ────────────────────────────────────────
const BONES = [
  { id: 0, tip: [120, 65]  as [number, number], junc: [220, 200] as [number, number] },
  { id: 1, tip: [330, 65]  as [number, number], junc: [430, 200] as [number, number] },
  { id: 2, tip: [545, 65]  as [number, number], junc: [620, 200] as [number, number] },
  { id: 3, tip: [165, 335] as [number, number], junc: [270, 200] as [number, number] },
  { id: 4, tip: [375, 335] as [number, number], junc: [480, 200] as [number, number] },
  { id: 5, tip: [580, 335] as [number, number], junc: [665, 200] as [number, number] },
];
const LABEL_ANCHORS: { x: number; y: number; anchor: string }[] = [
  { x: 120, y: 50, anchor: "middle" },
  { x: 330, y: 50, anchor: "middle" },
  { x: 545, y: 50, anchor: "middle" },
  { x: 165, y: 352, anchor: "middle" },
  { x: 375, y: 352, anchor: "middle" },
  { x: 580, y: 352, anchor: "middle" },
];

// ─── Risk matrix helpers ──────────────────────────────────────
const PROB_LABELS = ["Raro", "Improvável", "Possível", "Provável", "Quase Certo"];
const IMPACT_LABELS = ["Insignif.", "Menor", "Moderado", "Maior", "Catastrófico"];
function riskColor(p: number, i: number) {
  const score = p * i;
  if (score >= 15) return { bg: "bg-red-500/80", text: "text-white", label: "Crítico" };
  if (score >= 9)  return { bg: "bg-orange-400/80", text: "text-white", label: "Alto" };
  if (score >= 4)  return { bg: "bg-yellow-400/80", text: "text-foreground", label: "Médio" };
  return { bg: "bg-emerald-400/60", text: "text-foreground", label: "Baixo" };
}

// ─── SWOT quadrant config ─────────────────────────────────────
const SWOT_CONFIG = [
  { key: "strengths",    label: "Forças (S)",         icon: Shield,      color: "border-emerald-400 bg-emerald-50 dark:bg-emerald-950/30",    textColor: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800" },
  { key: "weaknesses",   label: "Fraquezas (W)",       icon: AlertTriangle, color: "border-red-400 bg-red-50 dark:bg-red-950/30",             textColor: "text-red-700",     badge: "bg-red-100 text-red-800" },
  { key: "opportunities",label: "Oportunidades (O)",   icon: Lightbulb,   color: "border-blue-400 bg-blue-50 dark:bg-blue-950/30",             textColor: "text-blue-700",    badge: "bg-blue-100 text-blue-800" },
  { key: "threats",      label: "Ameaças (T)",         icon: Zap,         color: "border-amber-400 bg-amber-50 dark:bg-amber-950/30",          textColor: "text-amber-700",   badge: "bg-amber-100 text-amber-800" },
] as const;

// ─── PDCA config ──────────────────────────────────────────────
const PDCA_CONFIG = [
  { key: "plan",  label: "PLAN — Planejar", icon: Target,       color: "border-blue-400",   bg: "bg-blue-50 dark:bg-blue-950/30",   text: "text-blue-700" },
  { key: "do",    label: "DO — Executar",   icon: Zap,          color: "border-green-400",  bg: "bg-green-50 dark:bg-green-950/30", text: "text-green-700" },
  { key: "check", label: "CHECK — Verificar",icon: Eye,         color: "border-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700" },
  { key: "act",   label: "ACT — Agir",      icon: RotateCcw,    color: "border-purple-400", bg: "bg-purple-50 dark:bg-purple-950/30",text: "text-purple-700" },
] as const;

// ─── Main Component ───────────────────────────────────────────
export default function DashboardAnalysisTabs({ config }: { config: AnalysisConfig }) {
  const navigate = useNavigate();
  const refPareto = useRef<HTMLDivElement>(null);

  // Ishikawa state
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [ishikawaKey, setIshikawaKey] = useState(0);

  // SWOT editable state
  const [swot, setSwot] = useState<SWOTData>({ ...config.swotData });
  const [swotInputs, setSwotInputs] = useState<Record<string, string>>({ strengths: "", weaknesses: "", opportunities: "", threats: "" });

  const addSwotItem = (key: keyof SWOTData) => {
    const val = swotInputs[key]?.trim();
    if (!val) return;
    setSwot(prev => ({ ...prev, [key]: [...prev[key], val] }));
    setSwotInputs(prev => ({ ...prev, [key]: "" }));
  };
  const removeSwotItem = (key: keyof SWOTData, idx: number) => {
    setSwot(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  };

  // Risk editable state
  const [risks, setRisks] = useState<RiskItem[]>(config.risks);

  // PDCA editable state
  const [pdca, setPdca] = useState<PDCAData>({ ...config.pdcaData });
  const [pdcaInputs, setPdcaInputs] = useState<Record<string, string>>({ plan: "", do: "", check: "", act: "" });

  const addPdcaItem = (key: keyof PDCAData) => {
    const val = pdcaInputs[key]?.trim();
    if (!val) return;
    setPdca(prev => ({ ...prev, [key]: [...prev[key], val] }));
    setPdcaInputs(prev => ({ ...prev, [key]: "" }));
  };
  const removePdcaItem = (key: keyof PDCAData, idx: number) => {
    setPdca(prev => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));
  };

  // 5W2H navigation
  const go5W2H = (source: "ishikawa" | "swot" | "risk" | "pdca") => {
    const topIssue = config.stats?.topIssue || config.ishikawaCategories[0]?.causes[0] || "Problema identificado";
    const sector = config.stats?.sector || "Unidades do hospital";
    const metric = config.stats?.value !== undefined ? `${config.stats.value} (${config.stats.label || ""})` : "—";

    let what = "", why = "", how = "";

    if (source === "ishikawa") {
      const topCat = selectedCat !== null ? config.ishikawaCategories[selectedCat] : config.ishikawaCategories[0];
      what = `Corrigir causa raiz: ${topCat?.causes[0] || topIssue} — Categoria: ${topCat?.label || "Não definido"}`;
      why = `Indicador principal: ${metric}. ${config.stats?.issues ? `${config.stats.issues} ocorrências identificadas.` : ""}`;
      how = topCat?.causes.slice(1).join("; ") || "Ações corretivas a definir";
    } else if (source === "swot") {
      const topWeakness = swot.weaknesses[0] || "Fraqueza principal identificada";
      const topOpportunity = swot.opportunities[0] || "Oportunidade de melhoria";
      what = `Mitigar fraqueza: ${topWeakness}`;
      why = `Análise SWOT — ${config.domain}. Indicador: ${metric}.`;
      how = `Aproveitar oportunidade: ${topOpportunity}`;
    } else if (source === "risk") {
      const criticalRisk = [...risks].sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact))[0];
      what = `Mitigar risco crítico: ${criticalRisk?.name || "Risco identificado"}`;
      why = `Risco com probabilidade ${criticalRisk?.probability}/5 e impacto ${criticalRisk?.impact}/5. Score: ${(criticalRisk?.probability || 0) * (criticalRisk?.impact || 0)}.`;
      how = "Implementar controles preventivos e monitoramento contínuo";
    } else {
      const topAction = pdca.plan[0] || "Ação planejada";
      what = `Executar plano PDCA: ${topAction}`;
      why = `Ciclo PDCA — ${config.domain}. Indicador: ${metric}.`;
      how = pdca.do.join("; ") || "Ações de execução do PDCA";
    }

    navigate("/quality/5w2h", {
      state: {
        prefill: {
          title: `Plano de Ação — ${config.domain}`,
          what,
          why,
          where: sector,
          who: "Equipe CCIH / Enfermeira de Controle de Infecção",
          when: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          how,
          howMuch: "A definir conforme orçamento do hospital",
        },
      },
    });
  };

  const cats = config.ishikawaCategories;

  return (
    <Card className="mt-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <GitMerge className="h-4 w-4 text-primary" />
          Análise Avançada — {config.domain}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0">
        <Tabs defaultValue="causa-raiz">
          <TabsList className="flex flex-wrap h-auto gap-1 mb-4">
            <TabsTrigger value="causa-raiz" className="text-xs">Causa Raiz</TabsTrigger>
            <TabsTrigger value="swot" className="text-xs">Matriz SWOT</TabsTrigger>
            <TabsTrigger value="risco" className="text-xs">Matriz de Risco</TabsTrigger>
            <TabsTrigger value="pdca" className="text-xs">PDCA</TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Causa Raiz ─────────────────────────── */}
          <TabsContent value="causa-raiz" className="space-y-4">
            {/* Ishikawa */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-semibold text-sm">Diagrama de Ishikawa (6M)</p>
                <p className="text-xs text-muted-foreground">{config.effectLabel}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Atualizar"
                  onClick={() => { setIshikawaKey(k => k + 1); setSelectedCat(null); }}>
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button size="sm" className="gap-1 text-xs h-7 bg-amber-600 hover:bg-amber-700 text-white"
                  onClick={() => go5W2H("ishikawa")}>
                  <FileText className="h-3.5 w-3.5" /> Gerar 5W2H
                </Button>
              </div>
            </div>

            {/* Desktop / tablet: SVG fishbone */}
            <div className="hidden sm:block overflow-x-auto rounded-lg border bg-gradient-to-br from-muted/20 to-background p-2" key={ishikawaKey}>
              <svg viewBox="0 0 940 420" className="w-full min-w-[560px]" style={{ fontFamily: "inherit" }} role="img" aria-label="Diagrama de Ishikawa 6M">
                {/* Spine */}
                <defs>
                  <linearGradient id="ishikawa-spine" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.35} />
                    <stop offset="60%" stopColor="hsl(var(--foreground))" stopOpacity={0.85} />
                    <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0.9} />
                  </linearGradient>
                </defs>
                <line x1="50" y1="210" x2="790" y2="210" stroke="url(#ishikawa-spine)" strokeWidth={3} strokeLinecap="round" />
                {/* Arrowhead into effect box */}
                <polygon points="790,200 810,210 790,220" fill="hsl(var(--destructive))" opacity={0.9} />

                {/* Effect box (right) */}
                <rect x="810" y="168" width="120" height="84" rx="10"
                  fill="hsl(var(--destructive))" fillOpacity={0.12}
                  stroke="hsl(var(--destructive))" strokeWidth={1.5} />
                <foreignObject x="814" y="172" width="112" height="76">
                  <div
                    style={{
                      width: "100%", height: "100%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      textAlign: "center", padding: "2px",
                      fontSize: 10, fontWeight: 700, lineHeight: 1.15,
                      color: "hsl(var(--destructive))",
                    }}
                  >
                    {config.effectLabel ?? "Efeito"}
                  </div>
                </foreignObject>


                {/* Bones */}
                {BONES.slice(0, Math.min(6, cats.length)).map((b, i) => {
                  const cat = cats[i];
                  if (!cat) return null;
                  const isSel = selectedCat === i;
                  const isOther = selectedCat !== null && !isSel;
                  const lp = LABEL_ANCHORS[i];
                  const preview = (cat.causes ?? []).slice(0, 2);
                  const isTop = b.tip[1] < 200;
                  return (
                    <g key={cat.id ?? i}
                      style={{ cursor: "pointer", opacity: isOther ? 0.3 : 1, transition: "opacity 0.2s" }}
                      onClick={() => setSelectedCat(p => p === i ? null : i)}>
                      <line x1={b.tip[0]} y1={b.tip[1]} x2={b.junc[0]} y2={b.junc[1]}
                        stroke={cat.color} strokeWidth={isSel ? 3 : 2} strokeLinecap="round" />
                      {/* Hit area */}
                      <circle cx={b.tip[0]} cy={b.tip[1]} r={14} fill="transparent" />
                      <circle cx={b.tip[0]} cy={b.tip[1]} r={isSel ? 8 : 6} fill={cat.color}
                        stroke="hsl(var(--background))" strokeWidth={2} />
                      {/* Category label */}
                      <text x={lp.x} y={lp.y} textAnchor={lp.anchor as any}
                        fontSize={12} fontWeight={isSel ? 800 : 700} fill={cat.color}>
                        {cat.label}
                      </text>
                      {/* Cause previews along the bone */}
                      {preview.map((c, idx) => {
                        const t = 0.35 + idx * 0.25;
                        const x = b.tip[0] + (b.junc[0] - b.tip[0]) * t;
                        const y = b.tip[1] + (b.junc[1] - b.tip[1]) * t;
                        const dy = isTop ? -4 : 12;
                        return (
                          <text key={idx} x={x + 8} y={y + dy}
                            fontSize={9} fill="hsl(var(--muted-foreground))" opacity={isSel ? 1 : 0.75}>
                            {c.length > 28 ? c.slice(0, 26) + "…" : c}
                          </text>
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Mobile: compact chips list */}
            <div className="sm:hidden space-y-2" key={`m-${ishikawaKey}`}>
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-2 text-center">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Efeito</p>
                <p className="text-xs font-bold text-destructive leading-tight">{config.effectLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {cats.slice(0, 6).map((cat, i) => {
                  const isSel = selectedCat === i;
                  return (
                    <button key={cat.id ?? i}
                      onClick={() => setSelectedCat(p => p === i ? null : i)}
                      className={`text-left rounded-lg border-2 p-2 transition ${isSel ? "ring-2 ring-offset-1" : "opacity-90"}`}
                      style={{ borderColor: cat.color, ...(isSel ? { boxShadow: `0 0 0 2px ${cat.color}33` } : {}) }}>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                        <span className="text-xs font-semibold" style={{ color: cat.color }}>{cat.label}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">
                        {(cat.causes ?? []).slice(0, 2).join(" • ") || "—"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedCat !== null && cats[selectedCat] && (
              <div className="p-3 rounded-lg border-l-4 bg-muted/30"
                style={{ borderLeftColor: cats[selectedCat].color }}>
                <p className="font-semibold text-sm mb-2" style={{ color: cats[selectedCat].color }}>
                  {cats[selectedCat].label} — Causas Identificadas
                </p>
                <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-1.5">
                  {(cats[selectedCat].causes ?? []).map((cause, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: cats[selectedCat].color }} />
                      <span className="flex-1">{cause}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selectedCat === null && (
              <p className="text-xs text-muted-foreground text-center">
                Clique em uma categoria para ver as causas identificadas
              </p>
            )}

            {/* Pareto */}
            {config.paretoData && config.paretoData.length > 0 && (() => {
              const data = config.paretoData!.map((d, i) => ({
                ...d,
                shortLabel: `#${i + 1}`,
              }));
              const total = data.reduce((s, d) => s + (d.count ?? 0), 0);
              const top80Index = data.findIndex(d => (d.acumulado ?? 0) >= 80);
              const vital = top80Index === -1 ? data.length : top80Index + 1;
              return (
                <div className="mt-4">
                  <Card>
                    <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-sm">Análise de Pareto — Não Conformidades</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          <span className="font-semibold text-foreground">{vital}</span> de {data.length} causas concentram
                          {" "}<span className="font-semibold text-destructive">≥80%</span> das {total} ocorrências (regra 80/20)
                        </p>
                      </div>
                      <ChartActions chartRef={refPareto} chartTitle="Pareto — Não Conformidades" />
                    </CardHeader>
                    <CardContent ref={refPareto} className="px-2 sm:px-4">
                      <ResponsiveContainer width="100%" height={260}>
                        <ComposedChart data={data} margin={{ top: 16, right: 16, left: -8, bottom: 8 }}>
                          <defs>
                            <linearGradient id="pareto-bar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.95} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.55} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                          <XAxis dataKey="shortLabel" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                          <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                          <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} unit="%" />
                          <RechartsTooltip
                            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const d: any = payload[0]?.payload;
                              return (
                                <div className="bg-background border rounded-lg p-2.5 text-xs max-w-[240px] shadow-lg">
                                  <p className="font-semibold mb-1.5 leading-tight">{d?.fullQuestion || d?.question}</p>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Ocorrências</span>
                                    <span className="font-mono font-bold text-primary">{d?.count}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-muted-foreground">Acumulado</span>
                                    <span className="font-mono font-bold text-destructive">{d?.acumulado}%</span>
                                  </div>
                                </div>
                              );
                            }}
                          />
                          <ReferenceLine yAxisId="right" y={80} stroke="hsl(var(--destructive))" strokeDasharray="4 4" strokeWidth={1.5}
                            label={{ value: "80%", position: "right", fill: "hsl(var(--destructive))", fontSize: 10, fontWeight: 600 }} />
                          <Bar yAxisId="left" dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={42}>
                            {data.map((_, i) => (
                              <Cell key={i} fill={i < vital ? "url(#pareto-bar)" : "hsl(var(--muted-foreground) / 0.45)"} />
                            ))}
                            <LabelList dataKey="count" position="top" fontSize={10} fill="hsl(var(--foreground))" />
                          </Bar>
                          <Line yAxisId="right" type="monotone" dataKey="acumulado"
                            stroke="hsl(var(--destructive))" strokeWidth={2.25}
                            dot={{ r: 3, fill: "hsl(var(--destructive))", strokeWidth: 0 }}
                            activeDot={{ r: 5 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                      <div className="mt-3 space-y-1.5">
                        {data.slice(0, 5).map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <span className={`shrink-0 inline-flex items-center justify-center h-5 w-6 rounded font-mono text-[10px] font-bold ${i < vital ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                              #{i + 1}
                            </span>
                            <span className="flex-1 truncate" title={d.fullQuestion || d.question}>{d.fullQuestion || d.question}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">{d.acumulado}%</span>
                            <Badge variant={i < vital ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 shrink-0 tabular-nums">{d.count}×</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })()}
          </TabsContent>


          {/* ── Tab 2: SWOT ───────────────────────────────── */}
          <TabsContent value="swot" className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Análise estratégica — identifique forças, fraquezas, oportunidades e ameaças</p>
              <Button size="sm" className="gap-1 text-xs h-7 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => go5W2H("swot")}>
                <FileText className="h-3.5 w-3.5" /> Gerar 5W2H
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SWOT_CONFIG.map(cfg => {
                const key = cfg.key as keyof SWOTData;
                const Icon = cfg.icon;
                return (
                  <div key={key} className={`rounded-xl border-2 p-3 ${cfg.color}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${cfg.textColor}`} />
                      <span className={`font-semibold text-sm ${cfg.textColor}`}>{cfg.label}</span>
                      <Badge className={`ml-auto text-xs ${cfg.badge} border-0`}>{swot[key].length}</Badge>
                    </div>
                    <ul className="space-y-1 mb-2 min-h-[60px]">
                      {swot[key].map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs group">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full shrink-0 bg-current opacity-60" style={{ color: cfg.textColor.replace("text-", "") }} />
                          <span className="flex-1">{item}</span>
                          <button onClick={() => removeSwotItem(key, i)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-1 mt-1">
                      <Textarea
                        value={swotInputs[key] || ""}
                        onChange={e => setSwotInputs(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Adicionar item..."
                        rows={1}
                        className="text-xs min-h-[30px] resize-none py-1 px-2"
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addSwotItem(key); } }}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 self-start mt-0.5"
                        onClick={() => addSwotItem(key)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Tab 3: Matriz de Risco ────────────────────── */}
          <TabsContent value="risco" className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Avaliação de riscos por probabilidade × impacto</p>
              <Button size="sm" className="gap-1 text-xs h-7 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => go5W2H("risk")}>
                <FileText className="h-3.5 w-3.5" /> Gerar 5W2H
              </Button>
            </div>

            {/* 5×5 grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[480px]">
                <div className="text-xs text-center text-muted-foreground mb-1 font-medium">Probabilidade →</div>
                <div className="flex">
                  <div className="w-20 shrink-0" />
                  {PROB_LABELS.map((p, i) => (
                    <div key={i} className="flex-1 text-center text-[10px] text-muted-foreground pb-1 px-0.5">{p}</div>
                  ))}
                </div>
                {[5, 4, 3, 2, 1].map(imp => (
                  <div key={imp} className="flex items-stretch gap-0.5 mb-0.5">
                    <div className="w-20 shrink-0 flex items-center justify-end pr-2 text-[10px] text-muted-foreground">
                      {IMPACT_LABELS[imp - 1]}
                    </div>
                    {[1, 2, 3, 4, 5].map(prob => {
                      const { bg, text } = riskColor(prob, imp);
                      const risksHere = risks.filter(r => r.probability === prob && r.impact === imp);
                      return (
                        <div key={prob}
                          className={`flex-1 min-h-[48px] rounded flex flex-col items-center justify-center gap-0.5 ${bg} ${text} relative`}>
                          <span className="text-[9px] font-mono opacity-60">{prob * imp}</span>
                          {risksHere.map((r, i) => (
                            <div key={i} className="text-[8px] font-medium text-center leading-tight px-0.5 max-w-full truncate">
                              {(r.name ?? "Risco").split(" ")[0]}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ))}
                <div className="flex items-center gap-3 mt-2 justify-end flex-wrap">
                  <div className="text-[10px] text-muted-foreground font-medium">← Impacto</div>
                  {[
                    { label: "Crítico ≥15", bg: "bg-red-500/80" },
                    { label: "Alto ≥9",     bg: "bg-orange-400/80" },
                    { label: "Médio ≥4",    bg: "bg-yellow-400/80" },
                    { label: "Baixo <4",    bg: "bg-emerald-400/60" },
                  ].map(l => (
                    <div key={l.label} className="flex items-center gap-1">
                      <div className={`h-3 w-3 rounded ${l.bg}`} />
                      <span className="text-[10px] text-muted-foreground">{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Risk list */}
            <div className="space-y-1.5 mt-2">
              <p className="text-xs font-medium text-muted-foreground">Riscos identificados ({risks.length})</p>
              {risks.map((r, i) => {
                const { bg, label } = riskColor(r.probability, r.impact);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border bg-muted/20">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${bg}`} />
                    <span className="flex-1">{r.name}</span>
                    <span className="text-muted-foreground shrink-0">P:{r.probability} × I:{r.impact}</span>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${bg.replace("bg-", "border-").replace("/80", "/50").replace("/60", "/50")}`}>
                      {label}
                    </Badge>
                    <button onClick={() => setRisks(prev => prev.filter((_, j) => j !== i))}
                      className="text-muted-foreground hover:text-destructive shrink-0">
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          {/* ── Tab 4: PDCA ───────────────────────────────── */}
          <TabsContent value="pdca" className="space-y-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm text-muted-foreground">Ciclo PDCA de melhoria contínua — Plan, Do, Check, Act</p>
              <Button size="sm" className="gap-1 text-xs h-7 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => go5W2H("pdca")}>
                <FileText className="h-3.5 w-3.5" /> Gerar 5W2H
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PDCA_CONFIG.map(cfg => {
                const key = cfg.key as keyof PDCAData;
                const Icon = cfg.icon;
                return (
                  <div key={key} className={`rounded-xl border-2 p-3 ${cfg.color} ${cfg.bg}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={`h-4 w-4 ${cfg.text}`} />
                      <span className={`font-semibold text-sm ${cfg.text}`}>{cfg.label}</span>
                      <Badge variant="outline" className={`ml-auto text-[10px] ${cfg.text} border-current`}>{pdca[key].length} ações</Badge>
                    </div>
                    <ul className="space-y-1 mb-2 min-h-[60px]">
                      {pdca[key].map((item, i) => (
                        <li key={i} className="flex items-start gap-1.5 text-xs group">
                          <CheckCircle2 className={`h-3 w-3 mt-0.5 shrink-0 ${cfg.text} opacity-70`} />
                          <span className="flex-1">{item}</span>
                          <button onClick={() => removePdcaItem(key, i)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-1 mt-1">
                      <Textarea
                        value={pdcaInputs[key] || ""}
                        onChange={e => setPdcaInputs(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="Adicionar ação..."
                        rows={1}
                        className="text-xs min-h-[30px] resize-none py-1 px-2"
                        onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addPdcaItem(key); } }}
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0 self-start mt-0.5"
                        onClick={() => addPdcaItem(key)}>
                        <Plus className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* PDCA cycle visual */}
            <div className="flex items-center justify-center gap-2 mt-2">
              {PDCA_CONFIG.map((cfg, i) => {
                const Icon = cfg.icon;
                return (
                  <div key={cfg.key} className="flex items-center gap-2">
                    <div className={`rounded-full p-2.5 ${cfg.bg} border-2 ${cfg.color}`}>
                      <Icon className={`h-4 w-4 ${cfg.text}`} />
                    </div>
                    {i < 3 && <TrendingUp className="h-3 w-3 text-muted-foreground rotate-0" />}
                  </div>
                );
              })}
              <RotateCcw className="h-3 w-3 text-muted-foreground ml-1" />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
