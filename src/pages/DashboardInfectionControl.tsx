import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { ShieldCheck, AlertTriangle, TrendingUp, ClipboardCheck, Loader2, Download } from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";
import { useAuditDashboard } from "@/hooks/useAuditDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";
import { useState } from "react";

export default function DashboardInfectionControl() {
  const { hospitalId } = useHospitalContext();
  const { stats, loading } = useAuditDashboard("infection_control");
  const [dia, setDia] = useState<string[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [ano, setAno] = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);

  const handleExportPdf = () => {
    if (!hospitalId) return;
    exportPdf({
      type: "audits", hospitalId,
      data: {
        kpis: { avgCompliance: stats.avgCompliance, totalAudits: stats.totalAudits, nonCompliant: stats.nonCompliantItems },
        audits: stats.sectorData.map(s => ({ type: "Vigilancia Processos", sector: s.name, date: "", compliance: s.compliance, compliant: s.audits - s.nonCompliant, total: s.audits })),
      },
      filenamePrefix: "vigilancia-processos",
    });
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Conformidade Geral", value: `${stats.avgCompliance}%`, icon: ShieldCheck, color: "text-success", bg: "bg-success/10" },
    { label: "Auditorias Mês", value: String(stats.totalAudits), icon: ClipboardCheck, color: "text-primary", bg: "bg-primary/10" },
    { label: "Itens Críticos", value: String(stats.nonCompliantItems), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Melhoria Período", value: `${stats.improvement >= 0 ? "+" : ""}${stats.improvement}%`, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
  ];

  const radarData = stats.categoryData.map(c => ({ subject: c.name, A: c.compliance }));

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard — Vigilância de Processos</h1>
          <p className="text-sm text-muted-foreground">Índice de conformidade por protocolo e ranking de falhas</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
          <DashboardAIInsights generateInsights={() => {
          const ins: string[] = [];
          ins.push(`📊 Conformidade geral de ${stats.avgCompliance}% com ${stats.totalAudits} auditorias.`);
          if (stats.nonCompliantItems > 0) ins.push(`⚠️ ${stats.nonCompliantItems} itens críticos identificados.`);
          if (stats.topFailures.length > 0) ins.push(`🔻 Principal falha: "${stats.topFailures[0].item}" (${stats.topFailures[0].count}x).`);
          ins.push("💡 Recomendação: focar ações corretivas nos protocolos com menor conformidade.");
          return ins;
        }} />
        </div>
      </div>

      <DashboardFilters dia={dia} setDia={setDia} mes={mes} setMes={setMes} ano={ano} setAno={setAno} setor={setor} setSetor={setSetor} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${k.bg}`}><k.icon className={`h-6 w-6 ${k.color}`} /></div>
              <div><p className="text-sm text-muted-foreground">{k.label}</p><p className="text-2xl font-bold">{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Conformidade por Categoria</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" width={150} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="compliance" fill="hsl(168, 66%, 34%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {radarData.length > 2 && (
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
        )}
      </div>

      {stats.topFailures.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Top Não Conformidades</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {stats.topFailures.map((f, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive">{i + 1}</span>
                    <span className="text-sm font-medium">{f.item}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {f.category && <Badge variant="outline" className="text-xs">{f.category}</Badge>}
                    <span className="text-sm font-bold text-destructive">{f.count}x</span>
                  </div>
                </div>
                <Progress value={stats.topFailures[0] ? (f.count / stats.topFailures[0].count) * 100 : 0} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {stats.totalAudits === 0 && (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><p className="text-sm">Nenhuma auditoria de controle de infecção registrada.</p></CardContent></Card>
      )}
    </div>
  );
}
