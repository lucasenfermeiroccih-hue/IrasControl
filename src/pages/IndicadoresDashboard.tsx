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

  function Variation({ current, previous }: { current: number; previous?: number }) {
    if (previous === undefined || previous === 0) return <span className="text-[10px] text-muted-foreground">—</span>;
    const diff = Math.round((current - previous) * 100) / 100;
    const pct = Math.round(((current - previous) / previous) * 100);
    if (diff === 0) return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus className="h-3 w-3" />0%</span>;
    const isUp = diff > 0;
    return (
      <span className={`text-[10px] flex items-center gap-0.5 ${isUp ? "text-destructive" : "text-success"}`}>
        {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {isUp ? "+" : ""}{pct}%
      </span>
    );
  }

  const kpiCards = [
    { label: "Taxa de Infecção", value: kpis.taxaInfeccao, prev: prevKpis?.taxaInfeccao, unit: "‰" },
    { label: "Taxa de Saída", value: kpis.taxaSaidas, prev: prevKpis?.taxaSaidas, unit: "%" },
    { label: "Taxa de Letalidade", value: kpis.taxaLetalidade, prev: prevKpis?.taxaLetalidade, unit: "%" },
    { label: "Tempo Permanência", value: kpis.tempoPermanencia, prev: prevKpis?.tempoPermanencia, unit: " dias" },
    { label: "Paciente em Risco", value: kpis.pacienteEmRisco, prev: prevKpis?.pacienteEmRisco, unit: "%" },
  ];

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Activity className="h-4 w-4 md:h-5 md:w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-foreground font-heading">Dashboard de Indicadores</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Análise comparativa dos indicadores epidemiológicos</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Mês</label>
              <Select value={mesFiltro} onValueChange={setMesFiltro}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {mesesOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Ano</label>
              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Setor</label>
              <Select value={setorFiltro} onValueChange={setSetorFiltro}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {setorOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => { setMesFiltro("Todos"); setAnoFiltro("2026"); setSetorFiltro("Todos"); }}>
              <Filter className="h-3.5 w-3.5" /> Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3 md:pt-4 md:pb-4 space-y-0.5">
              <p className="text-[10px] md:text-xs font-medium text-muted-foreground truncate">{kpi.label}</p>
              <p className="text-lg md:text-2xl font-bold text-foreground">
                {kpi.value.toFixed(2)}
                <span className="text-[10px] md:text-sm font-normal text-muted-foreground ml-0.5">{kpi.unit}</span>
              </p>
              <Variation current={kpi.value} previous={kpi.prev} />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Line charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Taxa de Infecção por Mês (‰)</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={35} />
                <Tooltip />
                <Line type="monotone" dataKey="taxaInfeccao" name="Taxa Infecção" stroke="hsl(168 66% 34%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Taxa de Letalidade por Mês (%)</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={35} />
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
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Infecções por Tipo</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={infectionBarData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 9 }} />
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
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Dispositivos: Utilização vs Infecção</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={deviceBarData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
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
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Distribuição dos Tipos de Infecção</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            <div className="flex flex-col items-center gap-3">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1.5 text-xs w-full">
                {pieData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{d.name}</span>
                    <span className="font-semibold ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardHeader className="p-3 md:p-6 pb-2">
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Brain className="h-4 w-4 md:h-5 md:w-5 text-primary" />
              Insights Inteligentes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0 space-y-3">
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
              A taxa de infecção apresentou aumento de 12% em relação ao mês anterior, com maior impacto em infecções respiratórias. Recomenda-se atenção especial ao protocolo de higienização de mãos no setor de UTI Adulto e revisão dos bundles de prevenção de PAV.
            </p>
            <Badge variant="outline" className="text-[10px]">Gerado por IA (mock)</Badge>
            <div className="pt-1">
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <FileText className="h-3.5 w-3.5" /> Gerar Relatório com IA
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Summary table — Desktop */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-2"><CardTitle className="text-sm md:text-base">Tabela Resumo</CardTitle></CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
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
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro encontrado</TableCell></TableRow>
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
          {/* Mobile */}
          <div className="md:hidden space-y-2 p-3">
            {tableData.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-6">Nenhum registro encontrado</p>
            )}
            {tableData.slice(0, 20).map((row, i) => (
              <div key={i} className="border border-border rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{row.setor}</span>
                  <Badge variant="secondary" className="text-[10px]">{row.mes}/{row.ano}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Infecção</p>
                    <p className="text-sm font-bold font-mono">{row.taxaInfeccao.toFixed(2)}‰</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Letalidade</p>
                    <p className="text-sm font-bold font-mono">{row.taxaLetalidade.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Permanência</p>
                    <p className="text-sm font-bold font-mono">{row.tempoPermanencia.toFixed(2)}d</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
