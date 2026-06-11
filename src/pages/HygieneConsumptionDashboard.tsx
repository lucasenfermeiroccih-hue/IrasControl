import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HandMetal, FileText, TrendingUp, Droplets, Activity, Loader2, Target, CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ComposedChart, Line } from "recharts";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import ChartActions from "@/components/ChartActions";
import DashboardAnalysisTabs, { AnalysisConfig } from "@/components/DashboardAnalysisTabs";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface HygieneRecord {
  setor: string;
  mes: string;
  ano: string;
  total_formularios: number;
  instancias_com_higienizacao: number;
  instancias_sem_higienizacao: number;
  consumo_alcool_ml: number;
  consumo_sabonete_ml: number;
  paciente_dia: number;
}

const OKR_TAXA_META = 80;
const OKR_CONSUMO_META = 20;
const OKR_FORMS_META = 100;

function OKRStatusIcon({ status }: { status: "on_track" | "at_risk" | "off_track" }) {
  if (status === "on_track") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (status === "at_risk") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function OKRStatusBadge({ status }: { status: "on_track" | "at_risk" | "off_track" }) {
  const map = { on_track: { label: "No Alvo", cls: "bg-green-100 text-green-800 border-green-200" }, at_risk: { label: "Em Risco", cls: "bg-yellow-100 text-yellow-800 border-yellow-200" }, off_track: { label: "Fora da Meta", cls: "bg-red-100 text-red-800 border-red-200" } };
  const { label, cls } = map[status];
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>;
}

export default function HygieneConsumptionDashboard() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const navigate = useNavigate();
  const [records, setRecords] = useState<HygieneRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("Todos");
  const [setor, setSetor] = useState("Todos");
  const [metaConsumo, setMetaConsumo] = useState<number | null>(null);
  const [metaAdesao, setMetaAdesao] = useState<number | null>(null);

  const refConsumo = useRef<HTMLDivElement>(null);
  const refComparativo = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hospitalId || ctxLoading) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("hygiene_consumption_records")
        .select("setor, mes, ano, total_formularios, instancias_com_higienizacao, instancias_sem_higienizacao, consumo_alcool_ml, consumo_sabonete_ml, paciente_dia")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setRecords(data.map(d => ({
          setor: d.setor,
          mes: d.mes,
          ano: d.ano,
          total_formularios: d.total_formularios,
          instancias_com_higienizacao: d.instancias_com_higienizacao,
          instancias_sem_higienizacao: d.instancias_sem_higienizacao,
          consumo_alcool_ml: Number(d.consumo_alcool_ml),
          consumo_sabonete_ml: Number(d.consumo_sabonete_ml),
          paciente_dia: d.paciente_dia,
        })));
      }
      setLoading(false);
    })();
  }, [hospitalId, ctxLoading]);

  const setores = useMemo(() => {
    const s = new Set(records.map(r => r.setor));
    return ["Todos", ...Array.from(s)];
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter(d => {
      if (setor !== "Todos" && d.setor !== setor) return false;
      if (periodo !== "Todos" && d.mes !== periodo) return false;
      return true;
    });
  }, [records, periodo, setor]);

  const totalFormularios = filtered.reduce((s, d) => s + d.total_formularios, 0);
  const totalCom = filtered.reduce((s, d) => s + d.instancias_com_higienizacao, 0);
  const totalSem = filtered.reduce((s, d) => s + d.instancias_sem_higienizacao, 0);
  const taxaGeral = totalCom + totalSem > 0 ? ((totalCom / (totalCom + totalSem)) * 100).toFixed(1) : "—";
  const totalAlcool = filtered.reduce((s, d) => s + d.consumo_alcool_ml, 0);
  const totalSabonete = filtered.reduce((s, d) => s + d.consumo_sabonete_ml, 0);
  const totalPD = filtered.reduce((s, d) => s + d.paciente_dia, 0);
  const consumoPD = totalPD > 0 ? ((totalAlcool + totalSabonete) / totalPD).toFixed(2) : "—";

  const chartData = useMemo(() => {
    const bySetor: Record<string, { setor: string; alcool: number; sabonete: number }> = {};
    filtered.forEach(d => {
      if (!bySetor[d.setor]) bySetor[d.setor] = { setor: d.setor, alcool: 0, sabonete: 0 };
      bySetor[d.setor].alcool += d.consumo_alcool_ml;
      bySetor[d.setor].sabonete += d.consumo_sabonete_ml;
    });
    return Object.values(bySetor);
  }, [filtered]);

  const tableData = useMemo(() => {
    const bySetor: Record<string, { setor: string; pd: number; alcool: number; sabonete: number; com: number; sem: number }> = {};
    filtered.forEach(d => {
      if (!bySetor[d.setor]) bySetor[d.setor] = { setor: d.setor, pd: 0, alcool: 0, sabonete: 0, com: 0, sem: 0 };
      bySetor[d.setor].pd += d.paciente_dia;
      bySetor[d.setor].alcool += d.consumo_alcool_ml;
      bySetor[d.setor].sabonete += d.consumo_sabonete_ml;
      bySetor[d.setor].com += d.instancias_com_higienizacao;
      bySetor[d.setor].sem += d.instancias_sem_higienizacao;
    });
    return Object.values(bySetor);
  }, [filtered]);

  const comparativoSetores = useMemo(() => {
    return tableData.map(r => ({
      setor: r.setor,
      adesao: r.com + r.sem > 0 ? Number(((r.com / (r.com + r.sem)) * 100).toFixed(1)) : 0,
      consumoPD: r.pd > 0 ? Number(((r.alcool + r.sabonete) / r.pd).toFixed(2)) : 0,
      alcoolPD: r.pd > 0 ? Number((r.alcool / r.pd).toFixed(2)) : 0,
      sabonetePD: r.pd > 0 ? Number((r.sabonete / r.pd).toFixed(2)) : 0,
    }));
  }, [tableData]);

  const taxaNum = taxaGeral !== "—" ? parseFloat(taxaGeral) : 0;
  const consumoPDNum = consumoPD !== "—" ? parseFloat(consumoPD) : 0;

  const okrTaxaStatus: "on_track" | "at_risk" | "off_track" = taxaNum >= OKR_TAXA_META ? "on_track" : taxaNum >= OKR_TAXA_META * 0.85 ? "at_risk" : "off_track";
  const okrConsumoStatus: "on_track" | "at_risk" | "off_track" = consumoPDNum > 0 && consumoPDNum <= OKR_CONSUMO_META ? "on_track" : consumoPDNum <= OKR_CONSUMO_META * 1.15 ? "at_risk" : "off_track";
  const okrFormsStatus: "on_track" | "at_risk" | "off_track" = totalFormularios >= OKR_FORMS_META ? "on_track" : totalFormularios >= OKR_FORMS_META * 0.7 ? "at_risk" : "off_track";

  const piorSetor = comparativoSetores.length > 0 ? comparativoSetores.reduce((p, c) => c.adesao < p.adesao ? c : p).setor : "—";

  const analysisConfig: AnalysisConfig = {
    domain: "Higiene das Mãos",
    effectLabel: "Baixa Adesão à Higiene das Mãos",
    ishikawaCategories: [
      { name: "Método", items: ["Protocolo desatualizado", "Treinamento insuficiente", "Procedimentos não padronizados", "Falta de checklist"] },
      { name: "Máquina", items: ["Dispensadores danificados", "Dispensadores vazios", "Pontos de higiene insuficientes", "Equipamentos mal posicionados"] },
      { name: "Material", items: ["Falta de álcool gel", "Falta de sabonete líquido", "Qualidade inadequada do produto", "Reposição irregular"] },
      { name: "Mão de Obra", items: ["Sobrecarga de trabalho", "Resistência cultural", "Alta rotatividade", "Falta de supervisão"] },
      { name: "Medida", items: ["Monitoramento irregular", "Metas não comunicadas", "Indicadores não visualizados", "Feedback insuficiente"] },
      { name: "Meio Ambiente", items: ["Layout inadequado da UTI", "Estrutura sem pias próximas", "Ambiente de alta pressão", "Falta de sinalização visual"] },
    ],
    paretoData: [
      { name: "Dispensadores vazios", value: 34 },
      { name: "Falta de insumos", value: 28 },
      { name: "Sobrecarga de trabalho", value: 22 },
      { name: "Protocolo desatualizado", value: 17 },
      { name: "Falta de treinamento", value: 14 },
      { name: "Sinalização insuficiente", value: 9 },
      { name: "Outros", value: 6 },
    ],
    swotData: {
      strengths: ["Protocolos assistenciais bem definidos", "Equipe sensibilizada para IRAS", "Campanha Mãos Limpas implementada", "Apoio da direção hospitalar"],
      weaknesses: ["Adesão abaixo da meta de 80%", "Dispensadores com manutenção deficiente", "Monitoramento inconsistente por turno", "Alta rotatividade de profissionais"],
      opportunities: ["Treinamentos periódicos multidisciplinares", "Tecnologia de dispensadores inteligentes", "Campanhas de conscientização regulares", "Benchmarking com hospitais referência"],
      threats: ["Resistência cultural dos profissionais", "Restrições orçamentárias para insumos", "Sobrecarga assistencial persistente", "Turnos noturnos com menor supervisão"],
    },
    risks: [
      { id: "r1", description: "Surto de IRAS por baixa adesão à HM", probability: 4, impact: 5 },
      { id: "r2", description: "Falta de insumos por falha no estoque", probability: 3, impact: 4 },
      { id: "r3", description: "Dispensadores inoperantes em área crítica", probability: 3, impact: 4 },
      { id: "r4", description: "Não conformidade em auditoria da ANVISA", probability: 2, impact: 5 },
      { id: "r5", description: "Alta rotatividade comprometendo a cultura", probability: 3, impact: 3 },
    ],
    pdcaData: {
      plan: ["Definir meta de 80% de adesão por setor", "Mapear pontos críticos de dispensadores", "Elaborar cronograma de treinamentos mensais", "Revisar protocolo de higiene das mãos"],
      do: ["Instalar novos dispensadores nos corredores", "Realizar treinamentos presenciais por turno", "Reforçar sinalização visual nos setores", "Implementar auditoria semanal de adesão"],
      check: ["Monitorar taxa de adesão mensalmente", "Avaliar consumo de insumos por setor", "Acompanhar IRAS associadas à HM", "Verificar funcionamento dos dispensadores"],
      act: ["Escalar ações para setores com menor adesão", "Reforçar treinamento em turnos problemáticos", "Ajustar posicionamento de dispensadores", "Celebrar setores que atingem a meta"],
    },
    stats: {
      value: taxaGeral !== "—" ? `${taxaGeral}%` : "—",
      label: "Taxa de Adesão",
      issues: totalSem,
      topIssue: "Baixa Adesão à HM",
      sector: piorSetor,
    },
  };

  const handle5W2H = () => {
    navigate("/quality/5w2h", {
      state: {
        prefill: {
          what: `Taxa de adesão à higiene das mãos: ${taxaGeral}% (meta: ≥${OKR_TAXA_META}%)`,
          why: `Adesão abaixo da meta impacta diretamente nas taxas de IRAS. Consumo atual: ${consumoPD} ML/PD. Setor crítico: ${piorSetor}.`,
          where: setor !== "Todos" ? setor : "Todos os setores monitorados",
          when: periodo !== "Todos" ? periodo : "Período atual de monitoramento",
          who: "CCIH / Enfermagem / Gestão Hospitalar",
          how: "Reforço de treinamentos, revisão de dispensadores, auditorias semanais, campanhas de conscientização e metas por setor",
          howMuch: "Investimento em insumos, treinamentos e manutenção de dispensadores conforme orçamento da CCIH",
        },
      },
    });
  };

  if (loading || ctxLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <HandMetal className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dashboard — Consumo de Higiene das Mãos</h1>
            <p className="text-sm text-muted-foreground">Portaria nº 1.377 · Monitoramento de indicadores</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handle5W2H} className="gap-2">
            <FileText className="h-4 w-4" />
            Gerar Plano 5W2H
          </Button>
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            if (filtered.length === 0) {
              ins.push("📋 Nenhum registro encontrado. Cadastre dados de consumo de higiene primeiro.");
              return ins;
            }
            ins.push(`📊 ${totalFormularios} formulários avaliados com taxa de adesão de ${taxaGeral}%.`);
            ins.push(`🧴 Consumo total: ${totalAlcool.toLocaleString()}ml álcool + ${totalSabonete.toLocaleString()}ml sabonete.`);
            ins.push(`📈 Consumo por paciente-dia: ${consumoPD} ml.`);
            ins.push(`✅ ${totalCom} observações com higienização vs ${totalSem} sem higienização.`);
            if (Number(taxaGeral) >= 80) ins.push(`🎯 Adesão acima de 80% — dentro da meta recomendada!`);
            else ins.push(`⚠️ Adesão abaixo de 80% — ações de melhoria são recomendadas.`);
            return ins;
          }} />
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Período</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os meses</SelectItem>
                  {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Setor</label>
              <Select value={setor} onValueChange={setSetor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <HandMetal className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum registro de consumo</h3>
            <p className="text-sm text-muted-foreground">Cadastre registros de consumo de higiene das mãos para visualizar os indicadores.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Formulários Analisados</p>
                    <p className="text-xl md:text-2xl font-bold">{totalFormularios}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa de Adesão (HM)</p>
                    <p className="text-xl md:text-2xl font-bold">{taxaGeral}%</p>
                    <Badge variant={taxaGeral !== "—" && parseFloat(taxaGeral) >= 80 ? "default" : "destructive"} className="mt-1 text-xs">
                      {taxaGeral !== "—" && parseFloat(taxaGeral) >= 80 ? "Conforme" : "Atenção"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <Droplets className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Consumo Total (ML)</p>
                    <p className="text-xl md:text-2xl font-bold">{(totalAlcool + totalSabonete).toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Álcool: {totalAlcool.toLocaleString("pt-BR")} · Sabonete: {totalSabonete.toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Consumo / Paciente-Dia</p>
                    <p className="text-xl md:text-2xl font-bold">{consumoPD} <span className="text-sm font-normal text-muted-foreground">ML/PD</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* OKR Section */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" /> OKRs — Objetivos e Resultados-Chave
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* OKR 1 — Taxa de Adesão */}
              <Card className="border-l-4" style={{ borderLeftColor: okrTaxaStatus === "on_track" ? "#22c55e" : okrTaxaStatus === "at_risk" ? "#eab308" : "#ef4444" }}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <OKRStatusIcon status={okrTaxaStatus} />
                      <span className="text-sm font-semibold">Adesão à HM ≥ {OKR_TAXA_META}%</span>
                    </div>
                    <OKRStatusBadge status={okrTaxaStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Garantir que ≥80% das oportunidades de higiene sejam realizadas em todos os setores</p>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Atual</span>
                    <span className="font-bold">{taxaGeral !== "—" ? `${taxaGeral}%` : "Sem dados"}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(taxaNum, 100)}%`, backgroundColor: okrTaxaStatus === "on_track" ? "#22c55e" : okrTaxaStatus === "at_risk" ? "#eab308" : "#ef4444" }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Meta: {OKR_TAXA_META}%</p>
                </CardContent>
              </Card>

              {/* OKR 2 — Consumo / PD */}
              <Card className="border-l-4" style={{ borderLeftColor: okrConsumoStatus === "on_track" ? "#22c55e" : okrConsumoStatus === "at_risk" ? "#eab308" : "#ef4444" }}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <OKRStatusIcon status={okrConsumoStatus} />
                      <span className="text-sm font-semibold">Consumo ≤ {OKR_CONSUMO_META} ML/PD</span>
                    </div>
                    <OKRStatusBadge status={okrConsumoStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Manter consumo de insumos dentro do padrão recomendado pela OMS por paciente-dia</p>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Atual</span>
                    <span className="font-bold">{consumoPD} ML/PD</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${consumoPDNum > 0 ? Math.min((OKR_CONSUMO_META / Math.max(consumoPDNum, 1)) * 100, 100) : 0}%`, backgroundColor: okrConsumoStatus === "on_track" ? "#22c55e" : okrConsumoStatus === "at_risk" ? "#eab308" : "#ef4444" }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Meta: ≤ {OKR_CONSUMO_META} ML/PD</p>
                </CardContent>
              </Card>

              {/* OKR 3 — Cobertura de Formulários */}
              <Card className="border-l-4" style={{ borderLeftColor: okrFormsStatus === "on_track" ? "#22c55e" : okrFormsStatus === "at_risk" ? "#eab308" : "#ef4444" }}>
                <CardContent className="pt-5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <OKRStatusIcon status={okrFormsStatus} />
                      <span className="text-sm font-semibold">Cobertura ≥ {OKR_FORMS_META} Obs.</span>
                    </div>
                    <OKRStatusBadge status={okrFormsStatus} />
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Garantir volume mínimo de observações para análise estatisticamente representativa</p>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Atual</span>
                    <span className="font-bold">{totalFormularios} formulários</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min((totalFormularios / OKR_FORMS_META) * 100, 100)}%`, backgroundColor: okrFormsStatus === "on_track" ? "#22c55e" : okrFormsStatus === "at_risk" ? "#eab308" : "#ef4444" }} />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Meta: ≥ {OKR_FORMS_META} observações</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Chart: Consumo por Setor */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Consumo por Setor (ML)</CardTitle>
                  <ChartActions
                    chartRef={refConsumo}
                    chartTitle="Consumo por Setor"
                    metaValue={metaConsumo}
                    onMetaChange={(v) => setMetaConsumo(v as number)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]" ref={refConsumo}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="setor" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => `${v.toLocaleString("pt-BR")} ML`} />
                      <Legend />
                      <Bar dataKey="alcool" name="Prep. Alcoólica" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="alcool" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} formatter={(v: number) => v.toLocaleString("pt-BR")} />
                      </Bar>
                      <Bar dataKey="sabonete" name="Sabonete Líquido" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="sabonete" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} formatter={(v: number) => v.toLocaleString("pt-BR")} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Chart: Comparativo Setores */}
          {comparativoSetores.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Comparativo entre Setores — Adesão (%) vs Consumo / Paciente-Dia (ML)</CardTitle>
                  <ChartActions
                    chartRef={refComparativo}
                    chartTitle="Comparativo Setores"
                    metaValue={metaAdesao}
                    onMetaChange={(v) => setMetaAdesao(v as number)}
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[360px]" ref={refComparativo}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={comparativoSetores} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="setor" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: "Adesão (%)", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: "ML/PD", angle: 90, position: "insideRight", style: { fontSize: 11 } }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="adesao" name="Taxa de Adesão (%)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="adesao" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} formatter={(v: number) => `${v}%`} />
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="consumoPD" name="Consumo / PD (ML)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} label={{ position: "top", fontSize: 10, fill: "hsl(var(--foreground))" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Indicadores por Unidade / Setor</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Paciente-Dia</TableHead>
                      <TableHead className="text-right">Álcool (ML)</TableHead>
                      <TableHead className="text-right">Sabonete (ML)</TableHead>
                      <TableHead className="text-right">Consumo/PD</TableHead>
                      <TableHead className="text-right">Taxa Adesão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map(row => {
                      const cpd = row.pd > 0 ? ((row.alcool + row.sabonete) / row.pd).toFixed(2) : "—";
                      const taxa = row.com + row.sem > 0 ? ((row.com / (row.com + row.sem)) * 100).toFixed(1) : "—";
                      return (
                        <TableRow key={row.setor}>
                          <TableCell className="font-medium">{row.setor}</TableCell>
                          <TableCell className="text-right">{row.pd.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{row.alcool.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{row.sabonete.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{cpd} ML/PD</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={taxa !== "—" && parseFloat(taxa) >= 80 ? "default" : "destructive"}>
                              {taxa}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {tableData.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum dado encontrado para os filtros selecionados.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Analysis Tabs */}
          <DashboardAnalysisTabs config={analysisConfig} />
        </>
      )}
    </div>
  );
}
