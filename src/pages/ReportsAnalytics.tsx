import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart
} from "recharts";
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Target, Brain, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const COLORS = ["hsl(168,66%,34%)", "hsl(210,80%,55%)", "hsl(45,93%,47%)", "hsl(0,84%,60%)", "hsl(280,60%,55%)", "hsl(150,60%,40%)"];

const monthlyTrend = [
  { mes: "Jul", iras: 12, meta: 10, taxa: 3.2, higieneAdesao: 72 },
  { mes: "Ago", iras: 14, meta: 10, taxa: 3.8, higieneAdesao: 68 },
  { mes: "Set", iras: 9, meta: 10, taxa: 2.4, higieneAdesao: 75 },
  { mes: "Out", iras: 11, meta: 10, taxa: 2.9, higieneAdesao: 78 },
  { mes: "Nov", iras: 8, meta: 10, taxa: 2.1, higieneAdesao: 82 },
  { mes: "Dez", iras: 7, meta: 10, taxa: 1.9, higieneAdesao: 85 },
  { mes: "Jan", iras: 10, meta: 10, taxa: 2.7, higieneAdesao: 80 },
  { mes: "Fev", iras: 6, meta: 10, taxa: 1.6, higieneAdesao: 88 },
  { mes: "Mar", iras: 5, meta: 10, taxa: 1.3, higieneAdesao: 91 },
];

const infectionBySector = [
  { setor: "UTI Adulto", casos: 18, taxa: 4.2 },
  { setor: "UTI Neonatal", casos: 8, taxa: 3.1 },
  { setor: "Clínica Médica", casos: 12, taxa: 1.8 },
  { setor: "Cirúrgica", casos: 9, taxa: 2.0 },
  { setor: "Emergência", casos: 6, taxa: 1.2 },
  { setor: "Pediatria", casos: 4, taxa: 0.9 },
];

const resistanceProfile = [
  { organismo: "KPC", jan: 45, fev: 42, mar: 38 },
  { organismo: "MRSA", jan: 22, fev: 25, mar: 20 },
  { organismo: "ESBL", jan: 35, fev: 30, mar: 28 },
  { organismo: "VRE", jan: 12, fev: 15, mar: 10 },
  { organismo: "Acinetobacter", jan: 28, fev: 32, mar: 25 },
];

const complianceRadar = [
  { area: "Higiene Mãos", valor: 88, meta: 90 },
  { area: "Bundles CVC", valor: 92, meta: 95 },
  { area: "Bundles SVD", valor: 85, meta: 90 },
  { area: "Precauções", valor: 78, meta: 85 },
  { area: "Dispensers", valor: 95, meta: 90 },
  { area: "Estrutura CTI", valor: 82, meta: 85 },
];

const deviceDistribution = [
  { name: "CVC", value: 35 },
  { name: "SVD", value: 28 },
  { name: "VM", value: 20 },
  { name: "Outros", value: 17 },
];

const predictiveData = [
  { mes: "Abr", real: null, previsto: 4, inferior: 2, superior: 6 },
  { mes: "Mai", real: null, previsto: 5, inferior: 3, superior: 8 },
  { mes: "Jun", real: null, previsto: 3, inferior: 1, superior: 6 },
];

const aiInsights = [
  { tipo: "alerta", texto: "Tendência de aumento de KPC na UTI Adulto — considere revisão de protocolo de higienização.", score: 92 },
  { tipo: "tendência", texto: "Adesão à higiene das mãos em tendência positiva — manter treinamentos mensais.", score: 85 },
  { tipo: "predição", texto: "Modelo prevê redução de 15% nas IRAS no próximo trimestre se metas de bundles forem mantidas.", score: 78 },
  { tipo: "sugestão", texto: "Setor Cirúrgico apresenta taxa acima da meta — auditoria focada recomendada.", score: 88 },
  { tipo: "benchmark", texto: "Taxa global de IRAS (1.3%) está abaixo da média nacional (2.1%) — excelente desempenho.", score: 95 },
];

export default function ReportsAnalytics() {
  const [periodo, setPeriodo] = useState("trimestre");
  const [generating, setGenerating] = useState(false);

  const handleGenerateReport = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      toast.success("Relatório analítico gerado com sucesso!");
    }, 2000);
  };

  const handleExport = () => {
    toast.success("Exportação iniciada — relatório será gerado em PDF.");
  };

  const kpis = [
    { label: "Taxa IRAS Atual", value: "1.3%", trend: -18, icon: Activity, good: true },
    { label: "Adesão Higiene", value: "91%", trend: 6, icon: Target, good: true },
    { label: "Alertas Críticos", value: "3", trend: -40, icon: AlertTriangle, good: true },
    { label: "Score Preditivo", value: "78/100", trend: 5, icon: Brain, good: true },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Avançado</h1>
          <p className="text-muted-foreground">Indicadores preditivos, tendências e inteligência artificial</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Último Mês</SelectItem>
              <SelectItem value="trimestre">Último Trimestre</SelectItem>
              <SelectItem value="semestre">Último Semestre</SelectItem>
              <SelectItem value="ano">Último Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}><Download className="h-4 w-4 mr-2" />Exportar</Button>
          <Button onClick={handleGenerateReport} disabled={generating}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Gerando..." : "Gerar Relatório"}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <kpi.icon className="h-5 w-5 text-primary" />
                  <Badge variant={kpi.trend < 0 && kpi.good ? "default" : kpi.trend > 0 && kpi.good ? "default" : "destructive"} className="text-xs">
                    {kpi.trend > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {Math.abs(kpi.trend)}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="tendencias" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-xl">
          <TabsTrigger value="tendencias">Tendências</TabsTrigger>
          <TabsTrigger value="setorial">Setorial</TabsTrigger>
          <TabsTrigger value="resistencia">Resistência</TabsTrigger>
          <TabsTrigger value="preditivo">Preditivo IA</TabsTrigger>
        </TabsList>

        {/* Tendências */}
        <TabsContent value="tendencias" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Evolução de IRAS vs Meta</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="iras" name="Casos IRAS" fill="hsl(168,66%,34%)" radius={[4,4,0,0]} />
                    <Line dataKey="meta" name="Meta" stroke="hsl(0,84%,60%)" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Adesão à Higiene das Mãos (%)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis domain={[60, 100]} className="text-xs" />
                    <Tooltip />
                    <Area type="monotone" dataKey="higieneAdesao" name="Adesão %" stroke="hsl(210,80%,55%)" fill="hsl(210,80%,55%)" fillOpacity={0.2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Taxa de Infecção por 1000 pacientes-dia</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Line type="monotone" dataKey="taxa" name="Taxa" stroke="hsl(168,66%,34%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Setorial */}
        <TabsContent value="setorial" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Casos por Setor</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={infectionBySector} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis dataKey="setor" type="category" width={110} className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="casos" name="Casos" fill="hsl(168,66%,34%)" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Distribuição por Dispositivo</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={deviceDistribution} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                      {deviceDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">Radar de Conformidade</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <RadarChart data={complianceRadar}>
                  <PolarGrid />
                  <PolarAngleAxis dataKey="area" className="text-xs" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="Atual" dataKey="valor" stroke="hsl(168,66%,34%)" fill="hsl(168,66%,34%)" fillOpacity={0.3} />
                  <Radar name="Meta" dataKey="meta" stroke="hsl(0,84%,60%)" fill="hsl(0,84%,60%)" fillOpacity={0.1} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resistência */}
        <TabsContent value="resistencia" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Perfil de Resistência — Últimos 3 Meses (%)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={resistanceProfile}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="organismo" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="jan" name="Janeiro" fill="hsl(210,80%,55%)" radius={[4,4,0,0]} />
                  <Bar dataKey="fev" name="Fevereiro" fill="hsl(168,66%,34%)" radius={[4,4,0,0]} />
                  <Bar dataKey="mar" name="Março" fill="hsl(45,93%,47%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preditivo IA */}
        <TabsContent value="preditivo" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Previsão de IRAS — Próximo Trimestre</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={[...monthlyTrend.slice(-3).map(d => ({ mes: d.mes, real: d.iras, previsto: null, inferior: null, superior: null })), ...predictiveData]}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="mes" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="real" name="Real" stroke="hsl(168,66%,34%)" fill="hsl(168,66%,34%)" fillOpacity={0.3} />
                    <Area type="monotone" dataKey="previsto" name="Previsto" stroke="hsl(280,60%,55%)" fill="hsl(280,60%,55%)" fillOpacity={0.2} strokeDasharray="5 5" />
                    <Area type="monotone" dataKey="superior" name="Intervalo Sup." stroke="hsl(0,84%,60%)" fill="hsl(0,84%,60%)" fillOpacity={0.05} />
                    <Area type="monotone" dataKey="inferior" name="Intervalo Inf." stroke="hsl(150,60%,40%)" fill="hsl(150,60%,40%)" fillOpacity={0.05} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Insights da IA</CardTitle></CardHeader>
              <CardContent className="space-y-3 max-h-[340px] overflow-y-auto">
                {aiInsights.map((insight, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-1">
                    <div className="flex items-center justify-between">
                      <Badge variant={insight.tipo === "alerta" ? "destructive" : insight.tipo === "predição" ? "secondary" : "default"} className="text-xs">
                        {insight.tipo}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Confiança: {insight.score}%</span>
                    </div>
                    <p className="text-sm text-foreground">{insight.texto}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
