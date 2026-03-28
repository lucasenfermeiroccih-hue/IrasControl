import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { FlaskConical, CheckCircle, AlertTriangle, MapPin } from "lucide-react";

const kpis = [
  { label: "Conformidade Geral", value: "82.1%", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  { label: "Dispensers Auditados", value: "96", icon: FlaskConical, color: "text-primary", bg: "bg-primary/10" },
  { label: "Não Conformidades", value: "17", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  { label: "Setores Cobertos", value: "12", icon: MapPin, color: "text-info", bg: "bg-info/10" },
];

const sectorData = [
  { setor: "UTI Adulto", conformity: 90 },
  { setor: "UTI Neo", conformity: 85 },
  { setor: "Clínica Médica", conformity: 78 },
  { setor: "Emergência", conformity: 72 },
  { setor: "Centro Cirúrgico", conformity: 88 },
  { setor: "Ambulatório", conformity: 82 },
];

const itemData = [
  { name: "Álcool Gel", value: 45, color: "hsl(168, 66%, 34%)" },
  { name: "Sabonete Líquido", value: 30, color: "hsl(199, 89%, 48%)" },
  { name: "Papel Toalha", value: 15, color: "hsl(38, 92%, 50%)" },
  { name: "Clorexidina", value: 10, color: "hsl(280, 65%, 60%)" },
];

const issues = [
  { item: "Dispenser vazio/abaixo 20%", count: 8, pct: 100 },
  { item: "Validade vencida", count: 5, pct: 62 },
  { item: "Dispenser com defeito", count: 4, pct: 50 },
  { item: "Sem identificação visível", count: 3, pct: 37 },
  { item: "Posição inadequada", count: 2, pct: 25 },
];

export default function DashboardDispenser() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard — Vigilância de Dispensers</h1>
        <p className="text-sm text-muted-foreground">Monitoramento de insumos e conformidade de dispensadores</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${k.bg}`}>
                <k.icon className={`h-6 w-6 ${k.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Conformidade por Setor (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sectorData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="setor" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="conformity" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tipo de Preparação</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width={280} height={280}>
              <PieChart>
                <Pie data={itemData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                  {itemData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Principais Não Conformidades</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {issues.map((f, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive">{i + 1}</span>
                  <span className="text-sm font-medium">{f.item}</span>
                </div>
                <span className="text-sm font-bold text-destructive">{f.count}x</span>
              </div>
              <Progress value={f.pct} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
