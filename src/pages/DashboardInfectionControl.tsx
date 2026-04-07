import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { ShieldCheck, AlertTriangle, TrendingUp, ClipboardCheck } from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";

const kpis = [
  { label: "Conformidade Geral", value: "86.4%", icon: ShieldCheck, color: "text-success", bg: "bg-success/10" },
  { label: "Auditorias Mês", value: "67", icon: ClipboardCheck, color: "text-primary", bg: "bg-primary/10" },
  { label: "Itens Críticos", value: "9", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  { label: "Melhoria vs Mês Ant.", value: "+3.2%", icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
];

const protocolData = [
  { protocol: "Ventilação Mecânica", conformity: 89 },
  { protocol: "Cateter Vesical", conformity: 91 },
  { protocol: "Cateter Venoso Central", conformity: 84 },
  { protocol: "Precaução/Isolamento", conformity: 82 },
];

const radarData = [
  { subject: "Ventilação", A: 89 },
  { subject: "Cateter Vesical", A: 91 },
  { subject: "CVC", A: 84 },
  { subject: "Precaução", A: 82 },
  { subject: "Higiene Mãos", A: 94 },
  { subject: "Descarte Resíduos", A: 88 },
];

const topFailures = [
  { item: "Cabeceira elevada 30-45°", count: 14, protocol: "Ventilação Mecânica" },
  { item: "Higienização do hub", count: 12, protocol: "CVC" },
  { item: "Troca de curativo com data", count: 11, protocol: "CVC" },
  { item: "Fixação adequada do cateter", count: 9, protocol: "Cateter Vesical" },
  { item: "Sinalização de isolamento", count: 8, protocol: "Precaução" },
];

export default function DashboardInfectionControl() {
  const [mes, setMes] = useState("all");
  const [ano, setAno] = useState("all");
  const [setor, setSetor] = useState("all");
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard — Vigilância de Processos</h1>
          <p className="text-sm text-muted-foreground">Índice de conformidade por protocolo e ranking de falhas</p>
        </div>
        <DashboardAIInsights generateInsights={() => [
          "📊 Conformidade geral de 86.4% com 67 auditorias no mês.",
          "⚠️ 9 itens críticos identificados — cabeceira elevada e higienização do hub são os mais recorrentes.",
          "🔻 Protocolo de CVC com menor conformidade (84%) — priorizar treinamento.",
          "✅ Cateter Vesical com 91% de conformidade — destaque positivo.",
          "💡 Recomendação: focar ações corretivas em CVC e Precaução/Isolamento.",
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
          <CardHeader><CardTitle className="text-base">Conformidade por Protocolo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={protocolData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="protocol" type="category" width={150} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="conformity" fill="hsl(168, 66%, 34%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Radar de Conformidade</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid className="stroke-border" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar dataKey="A" stroke="hsl(168, 66%, 34%)" fill="hsl(168, 66%, 34%)" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top 5 Não Conformidades</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {topFailures.map((f, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive">{i + 1}</span>
                  <span className="text-sm font-medium">{f.item}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">{f.protocol}</Badge>
                  <span className="text-sm font-bold text-destructive">{f.count}x</span>
                </div>
              </div>
              <Progress value={(f.count / 14) * 100} className="h-2" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
