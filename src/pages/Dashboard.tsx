import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users, AlertTriangle, ShieldAlert, CheckCircle, Activity,
  TrendingUp, TrendingDown, Bot, ArrowRight
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

const kpis = [
  { label: "Pacientes Monitorados", value: "284", icon: Users, trend: "+12", color: "text-info", bg: "bg-info/10" },
  { label: "Casos Suspeitos", value: "12", icon: AlertTriangle, trend: "-3", color: "text-warning", bg: "bg-warning/10" },
  { label: "IRAS Confirmadas", value: "3", icon: ShieldAlert, trend: "+1", color: "text-destructive", bg: "bg-destructive/10" },
  { label: "Taxa de Conformidade", value: "94.2%", icon: CheckCircle, trend: "+2.1%", color: "text-success", bg: "bg-success/10" },
];

const irasData = [
  { setor: "UTI Adulto", taxa: 8.2 },
  { setor: "UTI Neo", taxa: 5.1 },
  { setor: "Clínica Médica", taxa: 2.4 },
  { setor: "Cirúrgica", taxa: 3.8 },
  { setor: "Emergência", taxa: 1.9 },
];

const deviceData = [
  { month: "Jan", cvc: 45, svd: 32, vm: 28 },
  { month: "Fev", cvc: 42, svd: 35, vm: 25 },
  { month: "Mar", cvc: 48, svd: 30, vm: 31 },
  { month: "Abr", cvc: 40, svd: 28, vm: 22 },
  { month: "Mai", cvc: 52, svd: 38, vm: 29 },
  { month: "Jun", cvc: 46, svd: 33, vm: 27 },
];

const riskMap = [
  { setor: "UTI Adulto", risco: "Alto", casos: 5, cor: "destructive" },
  { setor: "UTI Neonatal", risco: "Médio", casos: 2, cor: "warning" },
  { setor: "Clínica Médica", risco: "Baixo", casos: 1, cor: "success" },
  { setor: "Centro Cirúrgico", risco: "Médio", casos: 3, cor: "warning" },
  { setor: "Emergência", risco: "Baixo", casos: 0, cor: "success" },
];

const topMicro = [
  { name: "S. aureus (MRSA)", count: 8 },
  { name: "K. pneumoniae (KPC)", count: 6 },
  { name: "E. coli (ESBL)", count: 5 },
  { name: "P. aeruginosa", count: 4 },
  { name: "A. baumannii", count: 3 },
];

const pieData = [
  { name: "Conforme", value: 85, color: "hsl(142, 71%, 35%)" },
  { name: "Não Conforme", value: 15, color: "hsl(0, 72%, 51%)" },
];

const alerts = [
  { type: "Surto", msg: "Cluster de KPC na UTI Adulto — 3 casos em 7 dias", severity: "destructive" as const },
  { type: "Dispositivo", msg: "CVC paciente leito 12B — tempo > 14 dias", severity: "warning" as const },
  { type: "Cultura", msg: "Hemocultura positiva leito 8A — MRSA", severity: "destructive" as const },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Principal</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada da situação epidemiológica</p>
        </div>
        <Button className="gap-2"><Bot className="h-4 w-4" /> Assistente IA</Button>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{kpi.value}</p>
                  <span className={`text-xs font-medium ${kpi.trend.startsWith("+") && kpi.label !== "IRAS Confirmadas" ? "text-success" : kpi.trend.startsWith("-") ? "text-success" : "text-destructive"}`}>
                    {kpi.trend}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* IRAS por Setor */}
        <Card>
          <CardHeader><CardTitle className="text-base">Taxa de IRAS por Setor (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={irasData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="setor" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="taxa" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Dispositivos Invasivos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Uso de Dispositivos Invasivos</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={deviceData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="cvc" stroke="hsl(168, 66%, 34%)" name="CVC" strokeWidth={2} />
                <Line type="monotone" dataKey="svd" stroke="hsl(199, 89%, 48%)" name="SVD" strokeWidth={2} />
                <Line type="monotone" dataKey="vm" stroke="hsl(38, 92%, 50%)" name="VM" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Mapa de Risco */}
        <Card>
          <CardHeader><CardTitle className="text-base">Mapa de Risco por Setor</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {riskMap.map((s) => (
              <div key={s.setor} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{s.setor}</p>
                  <p className="text-xs text-muted-foreground">{s.casos} caso(s) ativo(s)</p>
                </div>
                <Badge variant={s.cor === "destructive" ? "destructive" : s.cor === "warning" ? "secondary" : "outline"}>
                  {s.risco}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Alertas Ativos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {alerts.map((a, i) => (
              <div key={i} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <Badge variant="destructive" className="text-xs">{a.type}</Badge>
                </div>
                <p className="mt-1.5 text-sm">{a.msg}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Microrganismos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Microrganismos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topMicro.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(m.count / 8) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-bold">{m.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
