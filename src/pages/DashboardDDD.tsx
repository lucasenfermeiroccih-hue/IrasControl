import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid } from "recharts";
import { TrendingUp, Pill, Building2, BarChart3, AlertCircle } from "lucide-react";
import { DDDRegistroMensal } from "@/data/antimicrobianos-ddd";
import { listarRegistrosDDD, registrosSalvosParaDashboard } from "@/lib/ddd-storage";
import AIAssistenteDDD from "@/components/AIAssistenteDDD";

const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const COLORS = ["hsl(var(--primary))","hsl(var(--destructive))","#f59e0b","#8b5cf6","#06b6d4","#ec4899","#10b981","#f97316"];

export default function DashboardDDD() {
  const registros = useMemo(() => listarRegistrosDDD(), []);
  const allData: DDDRegistroMensal[] = useMemo(() => registrosSalvosParaDashboard(registros), [registros]);
  const isEmpty = allData.length === 0;

  const [filtroMes, setFiltroMes] = useState("all");
  const [filtroAno, setFiltroAno] = useState("all");
  const [filtroUnidade, setFiltroUnidade] = useState("all");
  const [filtroAtm, setFiltroAtm] = useState("all");


  const anos = useMemo(() => [...new Set(allData.map(d => d.ano))].sort(), [allData]);
  const unidades = useMemo(() => [...new Set(allData.map(d => d.unidade))].sort(), [allData]);
  const antimicrobianos = useMemo(() => [...new Set(allData.map(d => d.antimicrobiano))].sort(), [allData]);

  const filtered = useMemo(() => {
    return allData.filter(d =>
      (filtroMes === "all" || d.mes === filtroMes) &&
      (filtroAno === "all" || d.ano === parseInt(filtroAno)) &&
      (filtroUnidade === "all" || d.unidade === filtroUnidade) &&
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard DDD</h1>
        <p className="text-sm text-muted-foreground">
          Visualização do consumo de antimicrobianos — {registros.length} registro(s) salvo(s)
        </p>
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
          <Card>
            <CardContent className="flex flex-wrap gap-3 pt-4">
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger className="w-[150px]"><SelectValue placeholder="Mês" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroAno} onValueChange={setFiltroAno}>
                <SelectTrigger className="w-[120px]"><SelectValue placeholder="Ano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Unidade" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroAtm} onValueChange={setFiltroAtm}>
                <SelectTrigger className="w-[200px]"><SelectValue placeholder="Antimicrobiano" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {antimicrobianos.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
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
              <CardHeader><CardTitle className="text-base">Evolução do Consumo</CardTitle></CardHeader>
              <CardContent>
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
              <CardHeader><CardTitle className="text-base">Consumo por Unidade</CardTitle></CardHeader>
              <CardContent>
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
              <CardHeader><CardTitle className="text-base">Distribuição por Antimicrobiano</CardTitle></CardHeader>
              <CardContent>
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
              <CardHeader><CardTitle className="text-base">Heatmap: Unidade × Mês</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
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
            filtroMes={filtroMes}
            filtroAno={filtroAno}
          />
        </>
      )}
    </div>
  );
}
