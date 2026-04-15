import { useState, useEffect, useMemo } from "react";
import {
  Activity, Download, Filter, X, Loader2, Heart, Skull, Bug, Timer,
  Syringe, TrendingUp, ShieldAlert, Thermometer,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { mesesOptions, setorOptions } from "@/data/indicadores-config";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";

const COLORS = [
  "hsl(168 66% 34%)", "hsl(217 91% 60%)", "hsl(0 72% 51%)",
  "hsl(38 92% 50%)", "hsl(262 83% 58%)", "hsl(330 81% 60%)",
];

const mesesAbrev = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function safeDiv(n: number, d: number, mult: number) {
  return d === 0 ? 0 : Math.round((n / d) * mult * 100) / 100;
}

function KpiCard({ label, value, unit, icon: Icon, color }: {
  label: string; value: number; unit: string; icon: any; color: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0`} style={{ backgroundColor: `${color}20` }}>
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground truncate">{label}</p>
          <p className="text-xl font-bold text-foreground">
            {value.toFixed(2)}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function GaugeChart({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const data = [{ name: label, value: pct, fill: color }];
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={140} height={100}>
        <RadialBarChart cx="50%" cy="100%" innerRadius="60%" outerRadius="100%" startAngle={180} endAngle={0} data={data}>
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "hsl(var(--muted))" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <p className="text-lg font-bold mt-[-10px]" style={{ color }}>{value.toFixed(2)}</p>
      <p className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5">{label}</p>
    </div>
  );
}

export default function IndicadoresDashboard() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState("Todos");
  const [anoFiltro, setAnoFiltro] = useState(String(new Date().getFullYear()));
  const [setorFiltro, setSetorFiltro] = useState("Todos");

  useEffect(() => {
    if (ctxLoading || !hospitalId) { setLoading(false); return; }
    (async () => {
      const { data } = await (supabase.from("indicadores_records" as any).select("*") as any)
        .eq("hospital_id", hospitalId).order("data_vigilancia", { ascending: false });
      setRecords(data || []);
      setLoading(false);
    })();
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

  // Aggregated inputs
  const agg = useMemo(() => {
    const a = {
      numInfeccoes: 0, numPacienteDiaTotal: 0, numSaidas: 0, numObitosInfeccao: 0,
      numPacientesInfeccaoHospitalar: 0, numObitosTotal: 0,
      utilizacaoCVC: 0, infeccaoCVC: 0, utilizacaoVM: 0, infeccaoVM: 0,
      utilizacaoSVD: 0, infeccaoSVD: 0,
      infeccaoTratoUrinario: 0, infeccaoSitioCirurgico: 0, infeccaoTratoRespiratorio: 0,
      infeccaoPele: 0, infeccaoCorrenteSanguinea: 0, outrasInfeccoes: 0,
      numAntibioticosUtilizados: 0, numInfeccoesImportadas: 0,
      numAdmissoes: 0, numPacientesUtiInicio: 0, numDiasUtiInicio: 0,
      numDiasUtiSubsequente: 0,
    };
    filtered.forEach((r: any) => {
      const v = r.inputs || {};
      Object.keys(a).forEach(k => { (a as any)[k] += (v[k] || 0); });
    });
    return a;
  }, [filtered]);

  // Monthly data for line charts
  const monthlyData = useMemo(() => {
    return mesesOptions.map((mes, idx) => {
      const recs = filtered.filter((r: any) => r.mes_vigilancia === mes);
      if (!recs.length) return null;
      const m: any = { numInfeccoes: 0, numPacienteDiaTotal: 0, numObitosInfeccao: 0, numPacientesInfeccaoHospitalar: 0,
        utilizacaoCVC: 0, infeccaoCVC: 0, utilizacaoVM: 0, infeccaoVM: 0, utilizacaoSVD: 0, infeccaoSVD: 0,
        numAntibioticosUtilizados: 0, numAdmissoes: 0, numPacientesUtiInicio: 0, numInfeccoesImportadas: 0,
        numDiasUtiInicio: 0, numDiasUtiSubsequente: 0 };
      recs.forEach((r: any) => { const v = r.inputs || {}; Object.keys(m).forEach(k => { m[k] += (v[k] || 0); }); });
      const pacExp = m.numAdmissoes + m.numPacientesUtiInicio;
      return {
        mes: mesesAbrev[idx],
        taxaInfeccao: safeDiv(m.numInfeccoes, m.numPacienteDiaTotal, 1000),
        taxaLetalidade: safeDiv(m.numObitosInfeccao, m.numPacientesInfeccaoHospitalar, 100),
        numInfeccoes: m.numInfeccoes,
        numObitosInfeccao: m.numObitosInfeccao,
        utilizacaoCVC: m.utilizacaoCVC, utilizacaoVM: m.utilizacaoVM, utilizacaoSVD: m.utilizacaoSVD,
        infeccaoCVC: m.infeccaoCVC, infeccaoVM: m.infeccaoVM, infeccaoSVD: m.infeccaoSVD,
        taxaUtilCVC: safeDiv(m.utilizacaoCVC, m.numPacienteDiaTotal, 100),
        taxaUtilVM: safeDiv(m.utilizacaoVM, m.numPacienteDiaTotal, 100),
        taxaUtilSVD: safeDiv(m.utilizacaoSVD, m.numPacienteDiaTotal, 100),
        taxaInfCVC: safeDiv(m.infeccaoCVC, m.utilizacaoCVC, 1000),
        taxaInfVM: safeDiv(m.infeccaoVM, m.utilizacaoVM, 1000),
        taxaInfSVD: safeDiv(m.infeccaoSVD, m.utilizacaoSVD, 1000),
        numInfeccoesImportadas: m.numInfeccoesImportadas,
        tempoPermanencia: safeDiv(
          m.numPacientesUtiInicio + m.numPacienteDiaTotal + m.numDiasUtiSubsequente,
          m.numDiasUtiInicio + m.numAdmissoes, 1
        ),
        taxaUsoAtb: safeDiv(m.numAntibioticosUtilizados, pacExp, 100),
      };
    }).filter(Boolean) as any[];
  }, [filtered]);

  // Calculated KPIs
  const pacienteExposto = agg.numAdmissoes + agg.numPacientesUtiInicio;
  const taxaInfeccao = safeDiv(agg.numInfeccoes, agg.numPacienteDiaTotal, 1000);
  const taxaLetalidade = safeDiv(agg.numObitosInfeccao, agg.numPacientesInfeccaoHospitalar, 100);
  const taxaInfCVC = safeDiv(agg.infeccaoCVC, agg.utilizacaoCVC, 1000);
  const taxaInfVM = safeDiv(agg.infeccaoVM, agg.utilizacaoVM, 1000);
  const taxaInfSVD = safeDiv(agg.infeccaoSVD, agg.utilizacaoSVD, 1000);
  const taxaUtilCVC = safeDiv(agg.utilizacaoCVC, agg.numPacienteDiaTotal, 100);
  const taxaUtilVM = safeDiv(agg.utilizacaoVM, agg.numPacienteDiaTotal, 100);
  const taxaUtilSVD = safeDiv(agg.utilizacaoSVD, agg.numPacienteDiaTotal, 100);
  const tempoPermanencia = safeDiv(
    agg.numPacientesUtiInicio + agg.numPacienteDiaTotal + agg.numDiasUtiSubsequente,
    agg.numDiasUtiInicio + agg.numAdmissoes, 1
  );
  const taxaUsoAtb = safeDiv(agg.numAntibioticosUtilizados, pacienteExposto, 100);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const clearFilters = () => { setMesFiltro("Todos"); setAnoFiltro(String(new Date().getFullYear())); setSetorFiltro("Todos"); };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground font-heading">Dashboard de Indicadores</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Análise gamificada dos indicadores epidemiológicos</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          if (!hospitalId) return;
          exportPdf({ type: "analytics", hospitalId, data: { kpis: { totalCases: filtered.length, confirmedCases: 0, avgCompliance: 0, criticalAlerts: 0 }, monthlyTrend: [], infectionBySector: [], resistanceProfile: [] }, filenamePrefix: "indicadores" });
        }}><Download className="h-4 w-4 mr-1" />PDF</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mês</label>
              <Select value={mesFiltro} onValueChange={setMesFiltro}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {mesesOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ano</label>
              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{anosDisponiveis.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Setor</label>
              <Select value={setorFiltro} onValueChange={setSetorFiltro}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {setorOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Filter className="h-3.5 w-3.5" />Filtrar
            </Button>
            <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="infeccao" className="space-y-4">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="infeccao" className="flex-1 min-w-[120px] text-xs gap-1.5"><Bug className="h-3.5 w-3.5" />Infecção</TabsTrigger>
          <TabsTrigger value="dispositivos" className="flex-1 min-w-[120px] text-xs gap-1.5"><Syringe className="h-3.5 w-3.5" />Dispositivos</TabsTrigger>
          <TabsTrigger value="taxas" className="flex-1 min-w-[120px] text-xs gap-1.5"><ShieldAlert className="h-3.5 w-3.5" />Taxas Específicas</TabsTrigger>
          <TabsTrigger value="permanencia" className="flex-1 min-w-[120px] text-xs gap-1.5"><Timer className="h-3.5 w-3.5" />Permanência / ATB</TabsTrigger>
        </TabsList>

        {/* ====== TAB 1: Infecção ====== */}
        <TabsContent value="infeccao" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="Taxa de Infecção Hospitalar" value={taxaInfeccao} unit="‰" icon={Bug} color="hsl(0,72%,51%)" />
            <KpiCard label="Nº Óbitos c/ Infecção" value={agg.numObitosInfeccao} unit="" icon={Skull} color="hsl(262,83%,58%)" />
            <KpiCard label="Nº de Infecções" value={agg.numInfeccoes} unit="" icon={Thermometer} color="hsl(38,92%,50%)" />
            <KpiCard label="Taxa de Letalidade" value={taxaLetalidade} unit="%" icon={Heart} color="hsl(330,81%,60%)" />
          </div>

          {monthlyData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="p-4 pb-0"><CardTitle className="text-sm">Taxa de Infecção Hospitalar por Mês (‰)</CardTitle></CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Bar dataKey="taxaInfeccao" name="Taxa Infecção" fill="hsl(0 72% 51%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-0"><CardTitle className="text-sm">Óbitos e Infecções por Mês</CardTitle></CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="numInfeccoes" name="Infecções" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="numObitosInfeccao" name="Óbitos" stroke="hsl(262 83% 58%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader className="p-4 pb-0"><CardTitle className="text-sm">Taxa de Letalidade por Mês (%)</CardTitle></CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Bar dataKey="taxaLetalidade" name="Letalidade %" fill="hsl(330 81% 60%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ====== TAB 2: Dispositivos ====== */}
        <TabsContent value="dispositivos" className="space-y-4">
          {/* Gauge cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card><CardContent className="p-4 flex flex-col items-center"><GaugeChart value={taxaUtilCVC} max={100} label="Taxa Util. CVC (%)" color="hsl(217,91%,60%)" /></CardContent></Card>
            <Card><CardContent className="p-4 flex flex-col items-center"><GaugeChart value={taxaUtilSVD} max={100} label="Taxa Util. SVD (%)" color="hsl(168,66%,34%)" /></CardContent></Card>
            <Card><CardContent className="p-4 flex flex-col items-center"><GaugeChart value={taxaUtilVM} max={100} label="Taxa Util. VM (%)" color="hsl(38,92%,50%)" /></CardContent></Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard label="Utilização CVC" value={agg.utilizacaoCVC} unit="" icon={Syringe} color="hsl(217,91%,60%)" />
            <KpiCard label="Utilização SVD" value={agg.utilizacaoSVD} unit="" icon={Syringe} color="hsl(168,66%,34%)" />
            <KpiCard label="Utilização VM" value={agg.utilizacaoVM} unit="" icon={Syringe} color="hsl(38,92%,50%)" />
            <KpiCard label="Infecção CVC" value={agg.infeccaoCVC} unit="" icon={Bug} color="hsl(0,72%,51%)" />
            <KpiCard label="Infecção SVD" value={agg.infeccaoSVD} unit="" icon={Bug} color="hsl(330,81%,60%)" />
            <KpiCard label="Infecção VM" value={agg.infeccaoVM} unit="" icon={Bug} color="hsl(262,83%,58%)" />
          </div>

          {monthlyData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="p-4 pb-0"><CardTitle className="text-sm">Nº Infecção por Dispositivo / Mês</CardTitle></CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="infeccaoCVC" name="CVC" fill="hsl(217 91% 60%)" radius={[4,4,0,0]} />
                      <Bar dataKey="infeccaoSVD" name="SVD" fill="hsl(168 66% 34%)" radius={[4,4,0,0]} />
                      <Bar dataKey="infeccaoVM" name="VM" fill="hsl(38 92% 50%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-0"><CardTitle className="text-sm">Taxa de Infecção por Dispositivo (‰)</CardTitle></CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="taxaInfCVC" name="CVC ‰" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="taxaInfSVD" name="SVD ‰" stroke="hsl(168 66% 34%)" strokeWidth={2} dot={{ r: 3 }} />
                      <Line type="monotone" dataKey="taxaInfVM" name="VM ‰" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ====== TAB 3: Taxas Específicas ====== */}
        <TabsContent value="taxas" className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard label="Taxa Inf. PAV (VM)" value={taxaInfVM} unit="‰" icon={ShieldAlert} color="hsl(38,92%,50%)" />
            <KpiCard label="Taxa Inf. CVC" value={taxaInfCVC} unit="‰" icon={ShieldAlert} color="hsl(217,91%,60%)" />
            <KpiCard label="Taxa Inf. SVD" value={taxaInfSVD} unit="‰" icon={ShieldAlert} color="hsl(168,66%,34%)" />
            <KpiCard label="Infecções Importadas" value={agg.numInfeccoesImportadas} unit="" icon={TrendingUp} color="hsl(262,83%,58%)" />
            <KpiCard label="Infecção Hospitalar" value={agg.numPacientesInfeccaoHospitalar} unit="" icon={Bug} color="hsl(0,72%,51%)" />
          </div>

          {monthlyData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="p-4 pb-0"><CardTitle className="text-sm">Taxas de Infecção PAV / CVC / SVD por Mês (‰)</CardTitle></CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="taxaInfVM" name="PAV (VM)" fill="hsl(38 92% 50%)" radius={[4,4,0,0]} />
                      <Bar dataKey="taxaInfCVC" name="CVC" fill="hsl(217 91% 60%)" radius={[4,4,0,0]} />
                      <Bar dataKey="taxaInfSVD" name="SVD" fill="hsl(168 66% 34%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-0"><CardTitle className="text-sm">Infecções Importadas vs Hospitalares</CardTitle></CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="numInfeccoesImportadas" name="Importadas" fill="hsl(262 83% 58%)" radius={[4,4,0,0]} />
                      <Bar dataKey="numInfeccoes" name="Hospitalares" fill="hsl(0 72% 51%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ====== TAB 4: Permanência / ATB ====== */}
        <TabsContent value="permanencia" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <KpiCard label="Tempo Médio de Permanência" value={tempoPermanencia} unit="dias" icon={Timer} color="hsl(168,66%,34%)" />
            <KpiCard label="Taxa Uso Antibióticos" value={taxaUsoAtb} unit="%" icon={Syringe} color="hsl(217,91%,60%)" />
          </div>

          {monthlyData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="p-4 pb-0"><CardTitle className="text-sm">Tempo Médio de Permanência por Mês (dias)</CardTitle></CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={40} />
                      <Tooltip />
                      <Bar dataKey="tempoPermanencia" name="Permanência" fill="hsl(168 66% 34%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="p-4 pb-0"><CardTitle className="text-sm">Taxa de Uso de Antibióticos por Mês (%)</CardTitle></CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={40} />
                      <Tooltip />
                      <Line type="monotone" dataKey="taxaUsoAtb" name="Uso ATB %" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Nenhum registro encontrado. Crie indicadores em <strong>/indicadores/new</strong> para visualizar os dados.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
