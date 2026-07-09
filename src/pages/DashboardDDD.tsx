import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardFilters from "@/components/DashboardFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, Pill, Building2, BarChart3, AlertCircle, Loader2, Download, Filter, X, Target, FileText, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import ChartActions from "@/components/ChartActions";
import DashboardAnalysisTabs, { AnalysisConfig } from "@/components/DashboardAnalysisTabs";
import InfectologistInsightsPanel from "@/components/InfectologistInsightsPanel";
import { useDDDDashboard } from "@/hooks/useDDDDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";
import AIAssistenteDDD from "@/components/AIAssistenteDDD";
import { DashboardPdfReport, type DashboardReportData } from "@/components/DashboardPdfReport";

const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const COLORS = ["hsl(var(--primary))","hsl(var(--destructive))","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#10b981","#f97316"];

export default function DashboardDDD() {
  const navigate = useNavigate();
  const { hospitalId } = useHospitalContext();
  const { data: allData, loading: dataLoading } = useDDDDashboard();
  const isEmpty = allData.length === 0;

  const [filtroMes, setFiltroMes] = useState<string[]>([]);
  const [filtroAno, setFiltroAno] = useState<string[]>([]);
  const [filtroUnidade, setFiltroUnidade] = useState<string[]>([]);
  const [filtroAtm, setFiltroAtm] = useState("all");

  const refConsumo = useRef<HTMLDivElement>(null);
  const refUnidade = useRef<HTMLDivElement>(null);
  const refPie = useRef<HTMLDivElement>(null);
  const refHeatmap = useRef<HTMLDivElement>(null);
  const [metaConsumo, setMetaConsumo] = useState<number | undefined>(undefined);


  const anos = useMemo(() => [...new Set(allData.map(d => d.ano))].sort(), [allData]);
  const unidades = useMemo(() => [...new Set(allData.map(d => d.unidade))].sort(), [allData]);
  const antimicrobianos = useMemo(() => [...new Set(allData.map(d => d.antimicrobiano))].sort(), [allData]);

  const filtered = useMemo(() => {
    return allData.filter(d =>
      (filtroMes.length === 0 || filtroMes.includes(d.mes)) &&
      (filtroAno.length === 0 || filtroAno.includes(String(d.ano))) &&
      (filtroUnidade.length === 0 || filtroUnidade.includes(d.unidade)) &&
      (filtroAtm === "all" || d.antimicrobiano === filtroAtm)
    );
  }, [allData, filtroMes, filtroAno, filtroUnidade, filtroAtm]);

  const totalConsumo = useMemo(() => Math.round(filtered.reduce((s, d) => s + d.indicadorConsumo, 0) * 100) / 100, [filtered]);
  const avgConsumo = useMemo(() => filtered.length ? Math.round((totalConsumo / filtered.length) * 100) / 100 : 0, [totalConsumo, filtered]);

  const atmMaisUsado = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => { map[d.antimicrobiano] = (map[d.antimicrobiano] || 0) + d.totalG; });
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [filtered]);

  const unidadeMaiorConsumo = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => { map[d.unidade] = (map[d.unidade] || 0) + d.indicadorConsumo; });
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [filtered]);

  const lineData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => {
      const key = `${d.mes.slice(0, 3)}/${d.ano}`;
      map[key] = (map[key] || 0) + d.indicadorConsumo;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [filtered]);

  const barData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => { map[d.unidade] = (map[d.unidade] || 0) + d.indicadorConsumo; });
    return Object.entries(map).map(([name, value]) => ({ name: name.replace("UTI ", ""), value: Math.round(value) }));
  }, [filtered]);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => { map[d.antimicrobiano] = (map[d.antimicrobiano] || 0) + d.totalG; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [filtered]);

  const heatmapData = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filtered.forEach(d => {
      if (!map[d.unidade]) map[d.unidade] = {};
      const key = d.mes.slice(0, 3);
      map[d.unidade][key] = (map[d.unidade][key] || 0) + d.indicadorConsumo;
    });
    return map;
  }, [filtered]);
  const heatmapMonths = useMemo(() => [...new Set(filtered.map(d => d.mes.slice(0, 3)))], [filtered]);

  const ranking = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => { map[d.antimicrobiano] = (map[d.antimicrobiano] || 0) + d.indicadorConsumo; });
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const max = sorted[0]?.[1] || 1;
    return sorted.slice(0, 5).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100, pct: Math.round((value / max) * 100) }));
  }, [filtered]);

  const chartConfig = {
    value: { label: "Consumo", color: "hsl(var(--primary))" },
  };

  const getHeatColor = (val: number) => {
    if (val > 200) return "bg-destructive/80 text-destructive-foreground";
    if (val > 100) return "bg-yellow-500/70 text-foreground";
    if (val > 0) return "bg-emerald-500/50 text-foreground";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
    {dataLoading ? (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    ) : (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard DDD</h1>
          <p className="text-sm text-muted-foreground">
            Visualização do consumo de antimicrobianos — {allData.length} registro(s)
          </p>
        </div>
        <div className="flex gap-2">
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            ins.push(`📊 Consumo total DDD: ${totalConsumo} com média de ${avgConsumo} por registro.`);
            ins.push(`💊 Antimicrobiano mais utilizado: ${atmMaisUsado}.`);
            ins.push(`🏥 ${unidades.length} unidades monitoradas com ${antimicrobianos.length} antimicrobianos distintos.`);
            ins.push(`📈 ${filtered.length} registros no período filtrado de ${allData.length} totais.`);
            const topUnit = unidadeMaiorConsumo;
            ins.push(`🔝 Unidade com maior consumo: ${topUnit}.`);
            return ins;
          }} />
          <DashboardPdfReport data={{
            title: "Dashboard DDD — Consumo de Antimicrobianos",
            subtitle: "Dose Diária Definida (DDD) por antimicrobiano e unidade hospitalar",
            hospitalName: hospitalId || "Hospital",
            referenceNorm: "OMS ATC/DDD Index · PNSP · Programa de Stewardship",
            context:
              "Este relatório apresenta o consumo de antimicrobianos expresso em Dose Diária Definida (DDD), métrica padronizada pela OMS para comparação do uso de antibióticos entre unidades hospitalares e ao longo do tempo. O monitoramento do consumo de antimicrobianos é componente central do Programa de Stewardship Antimicrobiano, visando o uso racional, redução da pressão seletiva e prevenção de resistência antimicrobiana.",
            methodology:
              "Dados coletados do sistema de dispensação farmacêutica. O indicador DDD é calculado pela razão entre a quantidade total dispensada (em gramas) e a dose diária definida pela OMS para cada antimicrobiano, normalizada por 100 pacientes-dia.",
            kpis: [
              { label: "Consumo Total DDD", value: String(totalConsumo), sub: "no período filtrado" },
              { label: "Média por Registro", value: String(avgConsumo), sub: "DDD médio" },
              { label: "Mais Utilizado", value: atmMaisUsado, sub: "antimicrobiano" },
              { label: "Maior Consumo (Unidade)", value: unidadeMaiorConsumo, sub: "unidade hospitalar" },
              { label: "Registros Analisados", value: String(filtered.length), sub: `de ${allData.length} total` },
              { label: "Antimicrobianos Distintos", value: String(antimicrobianos.length), sub: "classes monitoradas" },
            ],
            extraTables: [
              {
                title: "Ranking de Consumo por Antimicrobiano (Top 5)",
                headers: ["#", "Antimicrobiano", "Consumo DDD", "% do Total"],
                rows: ranking.map((r, i) => [
                  String(i + 1),
                  r.name,
                  String(r.value),
                  `${r.pct}%`,
                ]),
              },
              ...(barData.length > 0 ? [{
                title: "Consumo por Unidade Hospitalar",
                headers: ["Unidade", "Consumo DDD"],
                rows: barData.slice(0, 10).map(b => [b.name, String(b.value)]),
              }] : []),
            ],
            discussion: [
              `O consumo total de antimicrobianos no período é de ${totalConsumo} DDD, com média de ${avgConsumo} por registro. O antimicrobiano mais utilizado é "${atmMaisUsado}" e a unidade com maior consumo é "${unidadeMaiorConsumo}". Foram analisados ${filtered.length} de ${allData.length} registros disponíveis.`,
              `São monitorados ${antimicrobianos.length} antimicrobiano(s) distinto(s) em ${unidades.length} unidade(s) hospitalar(es). ${ranking.length > 0 ? "O top 5 de maior consumo representa a principal alvo de intervenção de stewardship antimicrobiano." : ""}`,
              `A análise por unidade permite identificar setores com consumo elevado que podem se beneficiar de revisão prospectiva de prescrições e intervenções do programa de stewardship. Consumo acima de 50 DDD por registro deve ser investigado individualmente.`,
              `O monitoramento contínuo do DDD é essencial para detectar tendências de aumento de consumo, correlacionar com perfis de resistência e avaliar a efetividade das intervenções de uso racional de antimicrobianos.`,
            ].join("\n"),
            recommendations: [
              `Implementar ou fortalecer o Programa de Stewardship Antimicrobiano com revisão prospectiva de prescrições de "${atmMaisUsado}".`,
              `Priorizar intervenções educativas na unidade "${unidadeMaiorConsumo}" — maior consumo de antimicrobianos.`,
              "Realizar reuniões mensais do comitê de stewardship para revisão dos indicadores DDD e casos de uso empírico.",
              "Integrar os dados de DDD com o antibiograma local para guiar a terapia empírica com base no perfil de sensibilidade.",
              "Implementar alertas no sistema de prescrição para antimicrobianos de alto consumo ou reserva.",
              "Monitorar correlação entre consumo de DDD e taxas de infecção por microrganismos multirresistentes.",
            ],
            filenamePrefix: "ddd-antimicrobianos",
          }} />
          <Button size="sm" className="gap-1 bg-amber-600 hover:bg-amber-700 text-white"
            onClick={() => navigate("/quality/5w2h", { state: { prefill: {
              title: "Plano de Ação — Consumo de Antimicrobianos (DDD)",
              what: `Reduzir consumo de ${atmMaisUsado} — indicador atual: ${totalConsumo} DDD`,
              why: `Consumo acima da meta. Unidade crítica: ${unidadeMaiorConsumo}. ${antimicrobianos.length} antimicrobianos monitorados.`,
              where: unidadeMaiorConsumo, who: "Farmacêutico Clínico / CCIH",
              when: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
              how: "Implementar stewardship antimicrobiano, revisar prescrições, adequar à cultura microbiológica",
              howMuch: "A definir conforme orçamento farmacêutico",
            }}})}>
            <FileText className="h-4 w-4" /> Gerar 5W2H
          </Button>
        </div>
      </div>

      {isEmpty && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-semibold text-foreground">Nenhum dado disponível</p>
              <p className="text-sm text-muted-foreground">
                Cadastre indicadores na página <a href="/indicadores-ddd" className="text-primary underline">/indicadores-ddd</a> e salve para visualizar os dados aqui.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {!isEmpty && (
        <>
          {/* Filtros */}
          <Card className="border-dashed">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-end gap-4">
                <DashboardFilters
                  mes={filtroMes} setMes={setFiltroMes}
                  ano={filtroAno} setAno={setFiltroAno}
                  setor={filtroUnidade} setSetor={setFiltroUnidade}
                  sectors={unidades.map(String)}
                  years={anos.map(String)}
                />
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">Antimicrobiano</label>
                  <select
                    className="h-9 w-[220px] rounded-md border border-input bg-background px-3 text-sm"
                    value={filtroAtm}
                    onChange={(e) => setFiltroAtm(e.target.value)}
                  >
                    <option value="all">Todos</option>
                    {antimicrobianos.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-2 self-end"
                  onClick={() => {
                    setFiltroMes([]);
                    setFiltroAno([]);
                    setFiltroUnidade([]);
                    setFiltroAtm("all");
                  }}
                >
                  <X className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 pt-4">
                <div className="rounded-lg bg-primary/10 p-2"><TrendingUp className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Consumo Total</p>
                  <p className="text-xl font-bold text-foreground">{totalConsumo}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-4">
                <div className="rounded-lg bg-destructive/10 p-2"><Pill className="h-5 w-5 text-destructive" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Mais Utilizado</p>
                  <p className="text-sm font-bold text-foreground">{atmMaisUsado}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-4">
                <div className="rounded-lg bg-yellow-500/10 p-2"><Building2 className="h-5 w-5 text-yellow-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Maior Consumo</p>
                  <p className="text-sm font-bold text-foreground">{unidadeMaiorConsumo}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 pt-4">
                <div className="rounded-lg bg-emerald-500/10 p-2"><BarChart3 className="h-5 w-5 text-emerald-600" /></div>
                <div>
                  <p className="text-xs text-muted-foreground">Média Mensal</p>
                  <p className="text-xl font-bold text-foreground">{avgConsumo}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* OKRs */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
              <Target className="h-4 w-4" /> Objetivos e Resultados-Chave (OKR)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { title: "Indicador Médio DDD", desc: "Consumo médio por registro dentro da meta", current: avgConsumo, target: 10, unit: " DDD" },
                { title: "Antimicrobianos Monitorados", desc: "Diversidade de antimicrobianos com dados de consumo", current: antimicrobianos.length, target: 15, unit: "" },
                { title: "Cobertura de Unidades", desc: "Unidades com dados de consumo registrados", current: unidades.length, target: 10, unit: "" },
              ].map(okr => {
                const pct = Math.min(100, okr.target > 0 ? Math.round((okr.current / okr.target) * 100) : 0);
                const status = pct >= 90 ? "on_track" : pct >= 75 ? "at_risk" : "off_track";
                const bar = status === "on_track" ? "bg-emerald-500" : status === "at_risk" ? "bg-amber-500" : "bg-red-500";
                const badge = status === "on_track" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : status === "at_risk" ? "text-amber-700 bg-amber-50 border-amber-200" : "text-red-700 bg-red-50 border-red-200";
                const label = status === "on_track" ? "No Prazo" : status === "at_risk" ? "Em Risco" : "Fora da Meta";
                return (
                  <Card key={okr.title} className="p-4 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div><p className="font-semibold text-sm">{okr.title}</p><p className="text-xs text-muted-foreground mt-0.5">{okr.desc}</p></div>
                      <Badge variant="outline" className={`text-xs shrink-0 ${badge}`}>{label}</Badge>
                    </div>
                    <p className="text-2xl font-bold">{typeof okr.current === "number" ? okr.current.toFixed(okr.unit === " DDD" ? 2 : 0) : okr.current}{okr.unit}</p>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${bar}`} style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-xs text-muted-foreground text-right">{pct}% da meta ({okr.target}{okr.unit})</p>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Ranking */}
          <Card>
            <CardHeader><CardTitle className="text-lg">🏆 Ranking de Consumo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {ranking.map((r, i) => (
                <div key={r.name} className="flex items-center gap-3">
                  <Badge variant={i === 0 ? "destructive" : "secondary"} className="w-6 justify-center">{i + 1}</Badge>
                  <span className="w-48 truncate text-sm font-medium">{r.name}</span>
                  <Progress value={r.pct} className="flex-1" />
                  <span className="w-16 text-right font-mono text-sm">{r.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Evolução do Consumo</CardTitle>
                <ChartActions chartRef={refConsumo} chartTitle="Evolução do Consumo DDD" metaValue={metaConsumo} onMetaChange={setMetaConsumo} metaUnit="DDD" />
              </CardHeader>
              <CardContent ref={refConsumo}>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Consumo por Unidade</CardTitle>
                <ChartActions chartRef={refUnidade} chartTitle="Consumo DDD por Unidade" />
              </CardHeader>
              <CardContent ref={refUnidade}>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Distribuição por Antimicrobiano</CardTitle>
                <ChartActions chartRef={refPie} chartTitle="Distribuição DDD por Antimicrobiano" />
              </CardHeader>
              <CardContent ref={refPie}>
                <ChartContainer config={chartConfig} className="h-[250px] w-full">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name }) => name.split(" ")[0]}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">Heatmap: Unidade × Mês</CardTitle>
                <ChartActions chartRef={refHeatmap} chartTitle="Heatmap DDD Unidade × Mês" />
              </CardHeader>
              <CardContent className="overflow-x-auto" ref={refHeatmap}>
                <table className="w-full text-xs">
                  <thead>
                    <tr>
                      <th className="p-1 text-left">Unidade</th>
                      {heatmapMonths.map(m => <th key={m} className="p-1 text-center">{m}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(heatmapData).map(([unidade, mesesData]) => (
                      <tr key={unidade}>
                        <td className="p-1 font-medium">{unidade.replace("UTI ", "")}</td>
                        {heatmapMonths.map(m => {
                          const v = Math.round(mesesData[m] || 0);
                          return <td key={m} className={`p-1 text-center rounded ${getHeatColor(v)}`}>{v}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>

          {/* Tabela consolidada */}
          <Card>
            <CardHeader><CardTitle className="text-lg">Tabela Consolidada</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Antimicrobiano</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Total (g)</TableHead>
                    <TableHead className="text-right">A/B</TableHead>
                    <TableHead className="text-right">Indicador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 50).map((d, i) => (
                    <TableRow key={i}>
                      <TableCell>{d.mes.slice(0, 3)}/{d.ano}</TableCell>
                      <TableCell>{d.unidade}</TableCell>
                      <TableCell>{d.antimicrobiano}</TableCell>
                      <TableCell className="text-right font-mono">{d.quantidadeUnidades}</TableCell>
                      <TableCell className="text-right font-mono">{d.totalG.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{d.valorAB.toFixed(2)}</TableCell>
                      <TableCell className={`text-right font-mono font-bold ${d.indicadorConsumo > 50 ? "text-destructive" : d.indicadorConsumo > 20 ? "text-yellow-600" : "text-emerald-600"}`}>
                        {d.indicadorConsumo.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 50 && <p className="mt-2 text-xs text-muted-foreground">Exibindo 50 de {filtered.length} registros</p>}
            </CardContent>
          </Card>

          {/* Agente IA */}
          <AIAssistenteDDD
            filtered={filtered}
            all={allData}
            filtroMes={filtroMes.length > 0 ? filtroMes.join(", ") : "Todos"}
            filtroAno={filtroAno.length > 0 ? filtroAno.join(", ") : "Todos"}
          />

          {/* Infectologist AI Insights */}
          <InfectologistInsightsPanel
            domain="DDD"
            buildContext={() => [
              `Consumo total de antimicrobianos (DDD): ${totalConsumo}`,
              `Média por registro: ${avgConsumo} DDD`,
              `Antimicrobiano mais utilizado: ${atmMaisUsado}`,
              `Unidade com maior consumo: ${unidadeMaiorConsumo}`,
              `Total de antimicrobianos distintos monitorados: ${antimicrobianos.length}`,
              `Total de unidades com dados: ${unidades.length}`,
              `Registros no período filtrado: ${filtered.length} de ${allData.length} total`,
              ranking.length > 0
                ? `Top 5 por consumo: ${ranking.map(r => `${r.name} (${r.value})`).join(", ")}`
                : "",
              `Filtros: mês ${filtroMes.length > 0 ? filtroMes.join(",") : "todos"}, ano ${filtroAno.length > 0 ? filtroAno.join(",") : "todos"}, unidade ${filtroUnidade.length > 0 ? filtroUnidade.join(",") : "todas"}`,
            ].filter(Boolean).join("\n")}
            contextKey={`${filtered.length}|${totalConsumo}|${atmMaisUsado}`}
          />

          {/* Análise Avançada */}
          <DashboardAnalysisTabs config={{
            domain: "Dashboard DDD — Consumo de Antimicrobianos",
            effectLabel: "Alto Consumo de Antimicrobianos",
            ishikawaCategories: [
              { id: "metodo", label: "Método", color: "#6366f1", causes: ["Prescrição sem base em antibiograma", "Falta de protocolo de stewardship", "Uso empírico de largo espectro"] },
              { id: "mao_obra", label: "Mão de Obra", color: "#f59e0b", causes: ["Médicos sem treinamento em uso racional", "Alta rotatividade de prescritores", "Falta de farmacêutico clínico"] },
              { id: "maquina", label: "Infraestrutura", color: "#ef4444", causes: ["Sem alertas de prescrição no sistema", "Cultura microbiológica demorada", "Sem revisão prospectiva automatizada"] },
              { id: "material", label: "Material", color: "#10b981", causes: ["Antimicrobianos de reserva sem controle", "Estoques excessivos por setor", "Ausência de antimicrobianos alternativos"] },
              { id: "meio_ambiente", label: "Meio Ambiente", color: "#0ea5e9", causes: ["Alta prevalência de MDR no hospital", "Pressão de seleção por uso prévio", "Transmissão cruzada de cepas resistentes"] },
              { id: "medicao", label: "Medição", color: "#8b5cf6", causes: ["DDD não monitorado por unidade/mês", "Atraso nos relatórios de consumo", "Sem benchmark nacional disponível"] },
            ],
            swotData: {
              strengths: ["Dados de consumo disponíveis por unidade", "Sistema de registro automatizado", "CCIH com acesso aos dados de dispensação"],
              weaknesses: ["Ausência de programa de stewardship", "Carbapenêmicos usados como primeira linha", "Sem revisão prospectiva de prescrição"],
              opportunities: ["Implementar stewardship antimicrobiano multidisciplinar", "Integração com dados de antibiograma", "Educação médica continuada em uso racional"],
              threats: ["Resistência antimicrobiana crescente", "Seleção de cepas MDR", "Custo elevado de antimicrobianos de última linha"],
            },
            risks: [
              { name: "Resistência a carbapenêmicos", probability: 4, impact: 5 },
              { name: "Surto por microrganismo MDR", probability: 3, impact: 5 },
              { name: "Falha terapêutica por resistência", probability: 4, impact: 4 },
              { name: "Alto custo sem resultado clínico", probability: 5, impact: 3 },
              { name: "Toxicidade por uso prolongado", probability: 3, impact: 3 },
            ],
            pdcaData: {
              plan: ["Mapear antimicrobianos de maior consumo", "Definir metas DDD por classe", "Formar comitê de stewardship"],
              do: ["Implementar protocolo de uso racional", "Realizar auditoria prospectiva", "Treinar equipe médica"],
              check: ["Monitorar DDD mensal por unidade", "Avaliar taxa de culturas realizadas", "Verificar adesão ao protocolo"],
              act: ["Padronizar protocolo de stewardship", "Restringir antimicrobianos de reserva", "Publicar relatório mensal"],
            },
            stats: { value: totalConsumo, label: "DDD Total", issues: filtered.filter(d => d.indicadorConsumo > 50).length, topIssue: atmMaisUsado, sector: unidadeMaiorConsumo },
          }} />
        </>
      )}
    </>
    )}
    </div>
  );
}
