import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { Shield, CheckCircle, AlertTriangle, Eye } from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";

const kpis = [
  { label: "Conformidade Geral", value: "84.7%", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  { label: "Pacientes Isolados", value: "18", icon: Shield, color: "text-primary", bg: "bg-primary/10" },
  { label: "Falhas Sinalização", value: "6", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  { label: "Inspeções Mês", value: "52", icon: Eye, color: "text-info", bg: "bg-info/10" },
];

const typeDonut = [
  { name: "Contato", value: 42, color: "hsl(168, 66%, 34%)" },
  { name: "Gotículas", value: 28, color: "hsl(199, 89%, 48%)" },
  { name: "Aerossóis", value: 18, color: "hsl(38, 92%, 50%)" },
  { name: "Protetor", value: 12, color: "hsl(280, 65%, 60%)" },
];

const checklistItems = [
  { item: "Placa de identificação na porta", conformity: 92 },
  { item: "EPI disponível na entrada", conformity: 88 },
  { item: "Lixeira exclusiva no quarto", conformity: 85 },
  { item: "Higienização das mãos na saída", conformity: 78 },
  { item: "Coorte adequado (quando aplicável)", conformity: 72 },
  { item: "Transporte com precauções", conformity: 68 },
];

const sectorData = [
  { setor: "UTI Adulto", conformity: 90 },
  { setor: "UTI Neo", conformity: 86 },
  { setor: "Clínica Médica", conformity: 82 },
  { setor: "Emergência", conformity: 75 },
  { setor: "Centro Cirúrgico", conformity: 88 },
];

export default function DashboardPrecautions() {
  const [mes, setMes] = useState("all");
  const [ano, setAno] = useState("all");
  const [setor, setSetor] = useState("all");
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard — Precaução e Isolamento</h1>
          <p className="text-sm text-muted-foreground">Monitoramento de medidas de precaução e isolamento</p>
        </div>
        <DashboardAIInsights generateInsights={() => [
          "📊 Conformidade geral de 84.7% com 18 pacientes em isolamento e 52 inspeções.",
          "⚠️ 6 falhas de sinalização — transporte com precauções (68%) e coorte (72%) são os pontos mais frágeis.",
          "🔻 Emergência com menor conformidade (75%) — priorizar orientação de equipe.",
          "✅ UTI Adulto com 90% — modelo de referência para as demais unidades.",
          "💡 Recomendação: checklist de transporte e coorte com validação dupla.",
        ]} />
      </div>

      <DashboardFilters mes={mes} setMes={setMes} ano={ano} setAno={setAno} setor={setor} setSetor={setSetor} />

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
          <CardHeader><CardTitle className="text-base">Tipos de Precaução Ativa</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width={280} height={280}>
              <PieChart>
                <Pie data={typeDonut} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${value}%`}>
                  {typeDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Conformidade por Setor</CardTitle></CardHeader>
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
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Checklist de Conformidade</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {checklistItems.map((c, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{c.item}</span>
                <Badge className={c.conformity >= 85 ? "bg-success/20 text-success border-success/30" : c.conformity >= 75 ? "bg-warning/20 text-warning border-warning/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                  {c.conformity}%
                </Badge>
              </div>
              <Progress value={c.conformity} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
