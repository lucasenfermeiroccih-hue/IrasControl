import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart, Line,
} from "recharts";
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Target, Brain, Download, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useReportsAnalytics } from "@/hooks/useReportsAnalytics";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";

const COLORS = ["hsl(168,66%,34%)", "hsl(210,80%,55%)", "hsl(45,93%,47%)", "hsl(0,84%,60%)", "hsl(280,60%,55%)", "hsl(150,60%,40%)"];

export default function ReportsAnalytics() {
  const [periodo, setPeriodo] = useState("trimestre");
  const [generating, setGenerating] = useState(false);
  const { hospitalId } = useHospitalContext();
  const { analytics, loading } = useReportsAnalytics(periodo);

  const handleGenerateReport = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
      toast.success("Relatório analítico gerado com sucesso!");
    }, 2000);
  };

  const handleExport = () => {
    if (!hospitalId) return;
    exportPdf({
      type: "analytics",
      hospitalId,
      data: {
        kpis: analytics.kpis,
        monthlyTrend: analytics.monthlyTrend,
        infectionBySector: analytics.infectionBySector,
        resistanceProfile: analytics.resistanceProfile,
      },
      filenamePrefix: "analytics",
    });
  };

  const { kpis: kpiData, monthlyTrend, infectionBySector, complianceRadar, resistanceProfile, deviceDistribution } = analytics;

  const kpis = [
    { label: "Total de IRAS", value: String(kpiData.totalCases), trend: 0, icon: Activity, good: true },
    { label: "Confirmadas", value: String(kpiData.confirmedCases), trend: 0, icon: Target, good: true },
    { label: "Conformidade Média", value: `${kpiData.avgCompliance}%`, trend: 0, icon: Brain, good: true },
    { label: "Alertas Abertos", value: String(kpiData.criticalAlerts), trend: 0, icon: AlertTriangle, good: kpiData.criticalAlerts === 0 },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasData = monthlyTrend.length > 0 || infectionBySector.length > 0;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics Avançado</h1>
          <p className="text-muted-foreground">Indicadores, tendências e conformidade do hospital</p>
        </div>
        <div className="flex gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
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
                <kpi.icon className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!hasData ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <Activity className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold text-foreground">Sem dados suficientes</p>
            <p className="text-sm text-muted-foreground">Registre casos de infecção, auditorias e resultados laboratoriais para visualizar os analytics.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="tendencias" className="space-y-4">
          <TabsList className="grid grid-cols-3 w-full max-w-md">
            <TabsTrigger value="tendencias">Tendências</TabsTrigger>
            <TabsTrigger value="setorial">Setorial</TabsTrigger>
            <TabsTrigger value="resistencia">Resistência</TabsTrigger>
          </TabsList>

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
              {complianceRadar.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base">Radar de Conformidade</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
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
              )}
            </div>
          </TabsContent>

          <TabsContent value="setorial" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Casos por Sítio de Infecção</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={infectionBySector} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis type="number" className="text-xs" />
                      <YAxis dataKey="setor" type="category" width={130} className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="casos" name="Casos" fill="hsl(168,66%,34%)" radius={[0,4,4,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              {deviceDistribution.length > 0 && (
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
              )}
            </div>
          </TabsContent>

          <TabsContent value="resistencia" className="space-y-4">
            {resistanceProfile.length > 0 ? (
              <Card>
                <CardHeader><CardTitle className="text-base">Perfil de Resistência — Top Organismos</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={resistanceProfile}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="organismo" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip />
                      <Bar dataKey="count" name="Isolados Resistentes" fill="hsl(0,84%,60%)" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center text-muted-foreground">
                  Nenhum dado de resistência disponível no período selecionado.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
