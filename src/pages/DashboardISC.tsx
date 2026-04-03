import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Stethoscope, Phone, AlertTriangle, Activity, Award, Brain,
  TrendingDown, TrendingUp, Sparkles, FileText, Inbox,
} from "lucide-react";
import { getISCRegistros, type ISCRegistro } from "@/lib/isc-storage";
import { generateSmartInsights, generateStructuredReport, type SmartInsight } from "@/lib/isc-report-engine";

const mesesNomes = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const mesesFiltro = [
  "Todos", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface FlatRecord {
  profissional: string;
  mes: number;
  ano: number;
  clinica: string;
  totalCirurgias: number;
  contatosAtendidos: number;
  reinternacoes: number;
  iscConfirmada: number;
  sitio: string;
}

function flattenRegistros(registros: ISCRegistro[]): FlatRecord[] {
  const records: FlatRecord[] = [];
  for (const reg of registros) {
    for (const [clinica, dados] of Object.entries(reg.indicadores)) {
      records.push({
        profissional: reg.nomeProfissional,
        mes: Number(reg.mes) || 0,
        ano: Number(reg.ano) || 0,
        clinica,
        totalCirurgias: dados.totalCirurgias || 0,
        contatosAtendidos: dados.contatosAtendidos || 0,
        reinternacoes: dados.reinternacoes || 0,
        iscConfirmada: dados.iscConfirmada || 0,
        sitio: dados.sitio || "",
      });
    }
  }
  return records;
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const PIE_COLORS = ["#22c55e", "#eab308", "#ef4444"];

const statusColor = (rate: number) =>
  rate <= 2 ? "text-green-600 bg-green-50 border-green-200"
    : rate <= 5 ? "text-yellow-600 bg-yellow-50 border-yellow-200"
    : "text-red-600 bg-red-50 border-red-200";

const insightIconMap: Record<string, React.ReactNode> = {
  award: <Award className="h-5 w-5" />,
  alert: <AlertTriangle className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5" />,
  phone: <Phone className="h-5 w-5" />,
  stethoscope: <Stethoscope className="h-5 w-5" />,
  "trending-down": <TrendingDown className="h-5 w-5" />,
  "trending-up": <TrendingUp className="h-5 w-5" />,
};

const statusIcon = (rate: number) =>
  rate <= 2 ? <TrendingDown className="h-4 w-4" /> : rate <= 5 ? <AlertTriangle className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />;

export default function DashboardISC() {
  const [mesFiltro, setMesFiltro] = useState("Todos");
  const [anoFiltro, setAnoFiltro] = useState("Todos");
  const [profFiltro, setProfFiltro] = useState("Todos");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiReport, setAiReport] = useState("");

  const allRecords = useMemo(() => flattenRegistros(getISCRegistros()), []);

  const anos = useMemo(() => [...new Set(allRecords.map((r) => String(r.ano)))].sort(), [allRecords]);
  const profissionais = useMemo(() => [...new Set(allRecords.map((r) => r.profissional))].sort(), [allRecords]);

  const filtered = useMemo(() => {
    return allRecords.filter((r) => {
      if (anoFiltro !== "Todos" && String(r.ano) !== anoFiltro) return false;
      if (mesFiltro !== "Todos" && r.mes !== mesesFiltro.indexOf(mesFiltro)) return false;
      if (profFiltro !== "Todos" && r.profissional !== profFiltro) return false;
      return true;
    });
  }, [allRecords, mesFiltro, anoFiltro, profFiltro]);

  const hasData = allRecords.length > 0;

  const kpis = useMemo(() => {
    const totalCirurgias = filtered.reduce((s, r) => s + r.totalCirurgias, 0);
    const totalContatos = filtered.reduce((s, r) => s + r.contatosAtendidos, 0);
    const totalReinternacoes = filtered.reduce((s, r) => s + r.reinternacoes, 0);
    const totalISC = filtered.reduce((s, r) => s + r.iscConfirmada, 0);
    const taxaResposta = totalCirurgias > 0 ? (totalContatos / totalCirurgias) * 100 : 0;
    const taxaISC = totalCirurgias > 0 ? (totalISC / totalCirurgias) * 100 : 0;
    return { totalCirurgias, totalContatos, taxaResposta, totalReinternacoes, totalISC, taxaISC };
  }, [filtered]);

  const barClinicaData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => { map[r.clinica] = (map[r.clinica] || 0) + r.totalCirurgias; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const lineData = useMemo(() => {
    const map: Record<string, { cirurgias: number; isc: number }> = {};
    filtered.forEach((r) => {
      const key = `${r.mes}/${r.ano}`;
      if (!map[key]) map[key] = { cirurgias: 0, isc: 0 };
      map[key].cirurgias += r.totalCirurgias;
      map[key].isc += r.iscConfirmada;
    });
    return Object.entries(map)
      .sort(([a], [b]) => {
        const [mA, yA] = a.split("/").map(Number);
        const [mB, yB] = b.split("/").map(Number);
        return yA * 100 + mA - (yB * 100 + mB);
      })
      .map(([key, v]) => ({
        name: key,
        taxa: v.cirurgias > 0 ? Number(((v.isc / v.cirurgias) * 100).toFixed(1)) : 0,
      }));
  }, [filtered]);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      if (r.iscConfirmada > 0 && r.sitio) map[r.sitio] = (map[r.sitio] || 0) + r.iscConfirmada;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const barReintData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => { map[r.clinica] = (map[r.clinica] || 0) + r.reinternacoes; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const clinicaStats = useMemo(() => {
    const map: Record<string, { cirurgias: number; isc: number; reinternacoes: number; contatos: number }> = {};
    filtered.forEach((r) => {
      if (!map[r.clinica]) map[r.clinica] = { cirurgias: 0, isc: 0, reinternacoes: 0, contatos: 0 };
      map[r.clinica].cirurgias += r.totalCirurgias;
      map[r.clinica].isc += r.iscConfirmada;
      map[r.clinica].reinternacoes += r.reinternacoes;
      map[r.clinica].contatos += r.contatosAtendidos;
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      ...v,
      taxaISC: v.cirurgias > 0 ? (v.isc / v.cirurgias) * 100 : 0,
      taxaResposta: v.cirurgias > 0 ? (v.contatos / v.cirurgias) * 100 : 0,
    }));
  }, [filtered]);

  const reportInput = useMemo(() => ({
    ...kpis,
    clinicas: clinicaStats,
    tendencia: lineData.map((d) => ({ periodo: d.name, taxa: d.taxa })),
  }), [kpis, clinicaStats, lineData]);

  const insights = useMemo(() => {
    if (!hasData || filtered.length === 0) return [] as SmartInsight[];
    return generateSmartInsights(reportInput);
  }, [hasData, filtered, reportInput]);

  const generateReport = () => {
    if (!hasData) return;
    setAiReport(generateStructuredReport({ ...reportInput, promptExtra: aiPrompt || undefined }));
  };

  const insightBg = (type: string) =>
    type === "success" ? "bg-green-50 border-green-200 text-green-800"
      : type === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-800"
      : "bg-red-50 border-red-200 text-red-800";

  const EmptyState = () => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Inbox className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold text-foreground">Nenhum dado encontrado</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {allRecords.length === 0
            ? "Ainda não há registros salvos. Preencha o formulário em Indicadores ISC para começar a visualizar os dados aqui."
            : "Nenhum registro corresponde aos filtros selecionados. Tente ajustar os filtros."}
        </p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard ISC</h1>
        <p className="text-muted-foreground">Infecção de Sítio Cirúrgico — Visão analítica</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Mês</Label>
              <Select value={mesFiltro} onValueChange={setMesFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mesesFiltro.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ano</Label>
              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {anos.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <Select value={profFiltro} onValueChange={setProfFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {profissionais.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {!hasData || filtered.length === 0 ? <EmptyState /> : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
            {[
              { label: "Total Cirurgias", value: kpis.totalCirurgias, icon: <Stethoscope className="h-5 w-5 text-primary" /> },
              { label: "Contatos Atendidos", value: kpis.totalContatos, icon: <Phone className="h-5 w-5 text-primary" /> },
              { label: "Taxa Resposta", value: `${kpis.taxaResposta.toFixed(1)}%`, icon: <Activity className="h-5 w-5 text-primary" /> },
              { label: "Reinternações", value: kpis.totalReinternacoes, icon: <AlertTriangle className="h-5 w-5 text-primary" /> },
              { label: "ISC Confirmadas", value: kpis.totalISC, icon: <AlertTriangle className="h-5 w-5 text-primary" /> },
              { label: "Taxa ISC", value: `${kpis.taxaISC.toFixed(1)}%`, icon: statusIcon(kpis.taxaISC), badge: true },
            ].map((kpi) => (
              <Card key={kpi.label} className={kpi.badge ? `border ${statusColor(kpis.taxaISC)}` : ""}>
                <CardContent className="pt-4 pb-4 flex flex-col items-center text-center gap-1">
                  {kpi.icon}
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold">{kpi.value}</p>
                  {kpi.badge && kpis.taxaISC <= 2 && (
                    <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]">
                      <Award className="h-3 w-3 mr-1" /> Meta atingida
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Cirurgias por Clínica</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barClinicaData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Cirurgias" radius={[4, 4, 0, 0]}>
                      {barClinicaData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Evolução Mensal — Taxa de ISC (%)</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Line type="monotone" dataKey="taxa" name="Taxa ISC" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição por Tipo de ISC</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Reinternações por Clínica</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barReintData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Reinternações" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Insights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Insights Inteligentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 ${insightBg(ins.type)}`}>
                  {insightIconMap[ins.icon] || <Activity className="h-5 w-5" />}
                  <p className="text-sm">{ins.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Agent */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" /> Agente de IA — Gerador de Relatório
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Ex: Analisar taxa de ISC em Neurocirurgia no último trimestre..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={generateReport} className="gap-2">
                  <FileText className="h-4 w-4" /> Gerar Relatório
                </Button>
              </div>
              {aiReport && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">{aiReport}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
