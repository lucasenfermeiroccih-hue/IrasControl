import { useState, useMemo } from "react";
import {
  Activity, TrendingUp, TrendingDown, Minus, Brain, FileText, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { mesesOptions, setorOptions } from "@/data/indicadores-config";
import { mockIndicadores, type IndicadorRegistro } from "@/data/indicadores-historico";

// ---------- helpers ----------
function safeDiv(n: number, d: number, mult: number) {
  return d === 0 ? 0 : Math.round((n / d) * mult * 100) / 100;
}

function calcKpis(records: IndicadorRegistro[]) {
  let infeccoes = 0, pacDia = 0, saidas = 0, obitosInf = 0, pacInf = 0;
  let pUtiIni = 0, dUtiIni = 0, dUtiSub = 0, admissoes = 0;
  records.forEach(({ inputs: v }) => {
    infeccoes += v.numInfeccoes;
    pacDia += v.numPacienteDiaTotal;
    saidas += v.numSaidas;
    obitosInf += v.numObitosInfeccao;
    pacInf += v.numPacientesInfeccaoHospitalar;
    pUtiIni += v.numPacientesUtiInicio;
    dUtiIni += v.numDiasUtiInicio;
    dUtiSub += v.numDiasUtiSubsequente;
    admissoes += v.numAdmissoes;
  });
  const exposto = admissoes + pUtiIni;
  return {
    taxaInfeccao: safeDiv(infeccoes, pacDia, 1000),
    taxaSaidas: safeDiv(infeccoes, saidas, 100),
    taxaLetalidade: safeDiv(obitosInf, pacInf, 100),
    tempoPermanencia: safeDiv(pUtiIni + pacDia + dUtiSub, dUtiIni + admissoes, 1),
    pacienteEmRisco: safeDiv(infeccoes, exposto, 100),
  };
}

const INFECTION_COLORS: Record<string, string> = {
  "Trato Urinário": "hsl(199 89% 48%)",
  "Sítio Cirúrgico": "hsl(38 92% 50%)",
  "Trato Respiratório": "hsl(0 72% 51%)",
  "Pele": "hsl(142 71% 35%)",
  "Corrente Sanguínea": "hsl(262 60% 55%)",
  "Outras": "hsl(210 10% 46%)",
};

const PIE_COLORS = Object.values(INFECTION_COLORS);

// ---------- component ----------
export default function IndicadoresDashboard() {
  const [mesFiltro, setMesFiltro] = useState("Todos");
  const [anoFiltro, setAnoFiltro] = useState("2026");
  const [setorFiltro, setSetorFiltro] = useState("Todos");

  const anosDisponiveis = useMemo(() => {
    const s = new Set(mockIndicadores.map((r) => String(r.ano)));
    return ["Todos", ...Array.from(s).sort()];
  }, []);

  const filtered = useMemo(() => {
    return mockIndicadores.filter((r) => {
      if (mesFiltro !== "Todos" && r.mes !== mesFiltro) return false;
      if (anoFiltro !== "Todos" && String(r.ano) !== anoFiltro) return false;
      if (setorFiltro !== "Todos" && r.setor !== setorFiltro) return false;
      return true;
    });
  }, [mesFiltro, anoFiltro, setorFiltro]);

  const kpis = useMemo(() => calcKpis(filtered), [filtered]);

  // previous period for comparison (simple: previous year or all if "Todos")
  const prevFiltered = useMemo(() => {
    if (anoFiltro === "Todos") return [];
    const prevAno = String(Number(anoFiltro) - 1);
    return mockIndicadores.filter((r) => {
      if (mesFiltro !== "Todos" && r.mes !== mesFiltro) return false;
      if (String(r.ano) !== prevAno) return false;
      if (setorFiltro !== "Todos" && r.setor !== setorFiltro) return false;
      return true;
    });
  }, [mesFiltro, anoFiltro, setorFiltro]);

  const prevKpis = useMemo(() => (prevFiltered.length ? calcKpis(prevFiltered) : null), [prevFiltered]);

  // ------- chart data -------
  const mesesAbrev = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const lineData = useMemo(() => {
    return mesesOptions.map((mes, idx) => {
      const recs = filtered.filter((r) => r.mes === mes);
      if (!recs.length) return null;
      const k = calcKpis(recs);
      return { mes: mesesAbrev[idx], taxaInfeccao: k.taxaInfeccao, taxaLetalidade: k.taxaLetalidade };
    }).filter(Boolean);
  }, [filtered]);

  const infectionBarData = useMemo(() => {
    let itu = 0, isc = 0, itr = 0, pele = 0, ics = 0, outras = 0;
    filtered.forEach(({ inputs: v }) => {
      itu += v.infeccaoTratoUrinario;
      isc += v.infeccaoSitioCirurgico;
      itr += v.infeccaoTratoRespiratorio;
      pele += v.infeccaoPele;
      ics += v.infeccaoCorrenteSanguinea;
      outras += v.outrasInfeccoes;
    });
    return [
      { name: "Trato Urinário", value: itu },
      { name: "Sítio Cirúrgico", value: isc },
      { name: "Trato Respiratório", value: itr },
      { name: "Pele", value: pele },
      { name: "Corrente Sanguínea", value: ics },
      { name: "Outras", value: outras },
    ];
  }, [filtered]);

  const deviceBarData = useMemo(() => {
    let cvcUso = 0, cvcInf = 0, vmUso = 0, vmInf = 0, svdUso = 0, svdInf = 0;
    filtered.forEach(({ inputs: v }) => {
      cvcUso += v.utilizacaoCVC; cvcInf += v.infeccaoCVC;
      vmUso += v.utilizacaoVM; vmInf += v.infeccaoVM;
      svdUso += v.utilizacaoSVD; svdInf += v.infeccaoSVD;
    });
    return [
      { name: "CVC", utilização: cvcUso, infecção: cvcInf },
      { name: "VM", utilização: vmUso, infecção: vmInf },
      { name: "SVD", utilização: svdUso, infecção: svdInf },
    ];
  }, [filtered]);

  const pieData = useMemo(() => infectionBarData.filter((d) => d.value > 0), [infectionBarData]);

  // ------- table data -------
  const tableData = useMemo(() => {
    const grouped: Record<string, IndicadorRegistro[]> = {};
    filtered.forEach((r) => {
      const key = `${r.mes}-${r.ano}-${r.setor}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });
    return Object.entries(grouped).map(([, recs]) => {
      const k = calcKpis(recs);
      return { mes: recs[0].mes, ano: recs[0].ano, setor: recs[0].setor, ...k };
    });
  }, [filtered]);

  // ------- render helpers -------
  function Variation({ current, previous, suffix = "" }: { current: number; previous?: number; suffix?: string }) {
    if (previous === undefined || previous === 0) return <span className="text-xs text-muted-foreground">—</span>;
    const diff = Math.round((current - previous) * 100) / 100;
    const pct = Math.round(((current - previous) / previous) * 100);
    if (diff === 0) return <span className="text-xs text-muted-foreground flex items-center gap-1"><Minus className="h-3 w-3" />0%</span>;
    const isUp = diff > 0;
    return (
      <span className={`text-xs flex items-center gap-1 ${isUp ? "text-destructive" : "text-green-600"}`}>
        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isUp ? "+" : ""}{pct}%{suffix}
      </span>
    );
  }

  const kpiCards = [
    { label: "Taxa de Infecção", value: kpis.taxaInfeccao, prev: prevKpis?.taxaInfeccao, unit: "‰" },
    { label: "Taxa de Saída", value: kpis.taxaSaidas, prev: prevKpis?.taxaSaidas, unit: "%" },
    { label: "Taxa de Letalidade", value: kpis.taxaLetalidade, prev: prevKpis?.taxaLetalidade, unit: "%" },
    { label: "Tempo de Permanência", value: kpis.tempoPermanencia, prev: prevKpis?.tempoPermanencia, unit: " dias" },
    { label: "Paciente em Risco", value: kpis.pacienteEmRisco, prev: prevKpis?.pacienteEmRisco, unit: "%" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Dashboard de Indicadores</h1>
          <p className="text-sm text-muted-foreground">Análise comparativa dos indicadores epidemiológicos</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5 min-w-[140px]">
              <label className="text-xs font-medium text-muted-foreground">Mês</label>
              <Select value={mesFiltro} onValueChange={setMesFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {mesesOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[100px]">
              <label className="text-xs font-medium text-muted-foreground">Ano</label>
              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[160px]">
              <label className="text-xs font-medium text-muted-foreground">Setor</label>
              <Select value={setorFiltro} onValueChange={setSetorFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {setorOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { setMesFiltro("Todos"); setAnoFiltro("2026"); setSetorFiltro("Todos"); }}>
              <Filter className="h-3.5 w-3.5" /> Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-4 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
              <p className="text-2xl font-bold text-foreground">{kpi.value.toFixed(2)}<span className="text-sm font-normal text-muted-foreground ml-1">{kpi.unit}</span></p>
              <Variation current={kpi.value} previous={kpi.prev} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Taxa de Infecção por Mês (‰)</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="taxaInfeccao" name="Taxa Infecção" stroke="hsl(168 66% 34%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Taxa de Letalidade por Mês (%)</CardTitle></CardHeader>
          <CardContent className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="taxaLetalidade" name="Taxa Letalidade" stroke="hsl(0 72% 51%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bar charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Infecções por Tipo</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={infectionBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="name" type="category" width={130} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Infecções" radius={[0, 4, 4, 0]}>
                  {infectionBarData.map((entry) => (
                    <Cell key={entry.name} fill={INFECTION_COLORS[entry.name] || "hsl(210 10% 46%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Dispositivos: Utilização vs Infecção</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deviceBarData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="utilização" name="Utilização" fill="hsl(199 89% 48%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="infecção" name="Infecção" fill="hsl(0 72% 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Pie + AI insight */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição dos Tipos de Infecção</CardTitle></CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* AI placeholder */}
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Insights Inteligentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              A taxa de infecção apresentou aumento de 12% em relação ao mês anterior, com maior impacto em infecções respiratórias. Recomenda-se atenção especial ao protocolo de higienização de mãos no setor de UTI Adulto e revisão dos bundles de prevenção de PAV.
            </p>
            <Badge variant="outline" className="text-xs">Gerado por IA (mock)</Badge>
            <div className="pt-2">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" /> Gerar Relatório com IA
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Summary table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Tabela Resumo</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead className="text-right">Taxa Infecção (‰)</TableHead>
                  <TableHead className="text-right">Taxa Letalidade (%)</TableHead>
                  <TableHead className="text-right">Permanência (dias)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tableData.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro encontrado para os filtros selecionados</TableCell></TableRow>
                )}
                {tableData.slice(0, 20).map((row, i) => (
                  <TableRow key={i}>
                    <TableCell>{row.mes}</TableCell>
                    <TableCell>{row.ano}</TableCell>
                    <TableCell>{row.setor}</TableCell>
                    <TableCell className="text-right font-medium">{row.taxaInfeccao.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{row.taxaLetalidade.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-medium">{row.tempoPermanencia.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
