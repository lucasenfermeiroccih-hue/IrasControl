import { useState, useEffect, useMemo } from "react";
import {
  Activity, TrendingUp, TrendingDown, Minus, Brain, FileText, Filter, Download,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { mesesOptions, setorOptions } from "@/data/indicadores-config";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";
import { Loader2 } from "lucide-react";

function safeDiv(n: number, d: number, mult: number) {
  return d === 0 ? 0 : Math.round((n / d) * mult * 100) / 100;
}

function calcKpis(records: any[]) {
  let infeccoes = 0, pacDia = 0, saidas = 0, obitosInf = 0, pacInf = 0;
  records.forEach((r) => {
    const v = r.inputs || {};
    infeccoes += v.numInfeccoes || 0;
    pacDia += v.numPacienteDiaTotal || 0;
    saidas += v.numSaidas || 0;
    obitosInf += v.numObitosInfeccao || 0;
    pacInf += v.numPacientesInfeccaoHospitalar || 0;
  });
  return {
    taxaInfeccao: safeDiv(infeccoes, pacDia, 1000),
    taxaSaidas: safeDiv(infeccoes, saidas, 100),
    taxaLetalidade: safeDiv(obitosInf, pacInf, 100),
  };
}

const mesesAbrev = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function IndicadoresDashboard() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState("Todos");
  const [anoFiltro, setAnoFiltro] = useState(String(new Date().getFullYear()));
  const [setorFiltro, setSetorFiltro] = useState("Todos");

  useEffect(() => {
    if (ctxLoading || !hospitalId) { setLoading(false); return; }
    const load = async () => {
      const { data } = await (supabase.from("indicadores_records" as any).select("*") as any)
        .eq("hospital_id", hospitalId)
        .order("data_vigilancia", { ascending: false });
      setRecords(data || []);
      setLoading(false);
    };
    load();
  }, [hospitalId, ctxLoading]);

  const anosDisponiveis = useMemo(() => {
    const s = new Set(records.map((r: any) => String(r.ano_vigilancia)));
    return ["Todos", ...Array.from(s).sort()];
  }, [records]);

  const filtered = useMemo(() => records.filter((r: any) => {
    if (mesFiltro !== "Todos" && r.mes_vigilancia !== mesFiltro) return false;
    if (anoFiltro !== "Todos" && String(r.ano_vigilancia) !== anoFiltro) return false;
    if (setorFiltro !== "Todos" && r.setor !== setorFiltro) return false;
    return true;
  }), [records, mesFiltro, anoFiltro, setorFiltro]);

  const kpis = useMemo(() => calcKpis(filtered), [filtered]);

  const lineData = useMemo(() => mesesOptions.map((mes, idx) => {
    const recs = filtered.filter((r: any) => r.mes_vigilancia === mes);
    if (!recs.length) return null;
    const k = calcKpis(recs);
    return { mes: mesesAbrev[idx], taxaInfeccao: k.taxaInfeccao, taxaLetalidade: k.taxaLetalidade };
  }).filter(Boolean), [filtered]);

  const tableData = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    filtered.forEach((r: any) => {
      const key = `${r.mes_vigilancia}-${r.ano_vigilancia}-${r.setor}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    });
    return Object.entries(grouped).map(([, recs]) => {
      const k = calcKpis(recs);
      return { mes: recs[0].mes_vigilancia, ano: recs[0].ano_vigilancia, setor: recs[0].setor, ...k };
    });
  }, [filtered]);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const kpiCards = [
    { label: "Taxa de Infecção", value: kpis.taxaInfeccao, unit: "‰" },
    { label: "Taxa de Saída", value: kpis.taxaSaidas, unit: "%" },
    { label: "Taxa de Letalidade", value: kpis.taxaLetalidade, unit: "%" },
  ];

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 md:h-10 md:w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Activity className="h-4 w-4 md:h-5 md:w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground font-heading">Dashboard de Indicadores</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Análise dos indicadores epidemiológicos</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          if (!hospitalId) return;
          exportPdf({
            type: "analytics", hospitalId,
            data: {
              kpis: { totalCases: filtered.length, confirmedCases: 0, avgCompliance: 0, criticalAlerts: 0 },
              monthlyTrend: lineData?.map((d: any) => ({ mes: d.mes, iras: d.taxaInfeccao, meta: 0 })) || [],
              infectionBySector: tableData?.map((d: any) => ({ setor: d.setor, casos: d.taxaInfeccao })) || [],
              resistanceProfile: [],
            },
            filenamePrefix: "indicadores",
          });
        }}><Download className="h-4 w-4 mr-1" />PDF</Button>
      </div>

      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mês</label>
              <Select value={mesFiltro} onValueChange={setMesFiltro}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {mesesOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ano</label>
              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{anosDisponiveis.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Setor</label>
              <Select value={setorFiltro} onValueChange={setSetorFiltro}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {setorOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => { setMesFiltro("Todos"); setAnoFiltro(String(new Date().getFullYear())); setSetorFiltro("Todos"); }}>
              <Filter className="h-3.5 w-3.5" /> Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-3 md:pt-4 md:pb-4 space-y-0.5">
              <p className="text-xs font-medium text-muted-foreground">{kpi.label}</p>
              <p className="text-lg md:text-2xl font-bold text-foreground">
                {kpi.value.toFixed(2)}<span className="text-sm font-normal text-muted-foreground ml-0.5">{kpi.unit}</span>
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {lineData.length > 0 && (
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
      )}

      <Separator />

      {tableData.length > 0 ? (
        <Card>
          <CardHeader className="p-3 md:p-6 pb-2"><CardTitle className="text-sm md:text-base">Tabela Resumo</CardTitle></CardHeader>
          <CardContent className="p-0 md:p-6 md:pt-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead><TableHead>Ano</TableHead><TableHead>Setor</TableHead>
                    <TableHead className="text-right">Taxa Infecção (‰)</TableHead>
                    <TableHead className="text-right">Taxa Letalidade (%)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell>{r.mes}</TableCell><TableCell>{r.ano}</TableCell><TableCell>{r.setor}</TableCell>
                      <TableCell className="text-right font-mono">{r.taxaInfeccao.toFixed(2)}</TableCell>
                      <TableCell className="text-right font-mono">{r.taxaLetalidade.toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><p className="text-sm">Nenhum registro de indicadores encontrado. Crie um novo registro para ver os dados.</p></CardContent></Card>
      )}
    </div>
  );
}
