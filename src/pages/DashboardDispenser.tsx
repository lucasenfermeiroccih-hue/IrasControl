import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { FlaskConical, CheckCircle, AlertTriangle, MapPin, Loader2, Download } from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import { useAuditDashboard } from "@/hooks/useAuditDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";

export default function DashboardDispenser() {
  const { hospitalId } = useHospitalContext();
  const { stats, loading } = useAuditDashboard("dispenser");

  const handleExportPdf = () => {
    if (!hospitalId) return;
    exportPdf({
      type: "audits", hospitalId,
      data: {
        kpis: { avgCompliance: stats.avgCompliance, totalAudits: stats.totalAudits, nonCompliant: stats.nonCompliantItems },
        audits: stats.sectorData.map(s => ({ type: "Dispensers", sector: s.name, date: "", compliance: s.compliance, compliant: s.audits - s.nonCompliant, total: s.audits })),
      },
      filenamePrefix: "dispensers",
    });
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Conformidade Geral", value: `${stats.avgCompliance}%`, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { label: "Dispensers Auditados", value: String(stats.totalAudits), icon: FlaskConical, color: "text-primary", bg: "bg-primary/10" },
    { label: "Não Conformidades", value: String(stats.nonCompliantItems), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Setores Cobertos", value: String(stats.sectorData.length), icon: MapPin, color: "text-info", bg: "bg-info/10" },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard — Vigilância de Dispensers</h1>
          <p className="text-sm text-muted-foreground">Monitoramento de insumos e conformidade de dispensadores</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
          <DashboardAIInsights generateInsights={() => {
          const ins: string[] = [];
          ins.push(`📊 Conformidade geral de ${stats.avgCompliance}% com ${stats.totalAudits} dispensers auditados.`);
          if (stats.topFailures.length > 0) ins.push(`⚠️ Principal problema: "${stats.topFailures[0].item}" (${stats.topFailures[0].count}x).`);
          ins.push("💡 Recomendação: implementar rotina de reposição periódica.");
          return ins;
        }} />
        </div>
      </div>

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
          <CardHeader><CardTitle className="text-base">Conformidade por Setor (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.sectorData.map(s => ({ setor: s.name, conformity: s.compliance }))}>
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
          <CardHeader><CardTitle className="text-base">Evolução Mensal (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="compliance" name="Conformidade %" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {stats.topFailures.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Principais Não Conformidades</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {stats.topFailures.map((f, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive">{i + 1}</span>
                    <span className="text-sm font-medium">{f.item}</span>
                  </div>
                  <span className="text-sm font-bold text-destructive">{f.count}x</span>
                </div>
                <Progress value={stats.topFailures[0] ? (f.count / stats.topFailures[0].count) * 100 : 0} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {stats.totalAudits === 0 && (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><p className="text-sm">Nenhuma auditoria de dispensers registrada.</p></CardContent></Card>
      )}
    </div>
  );
}
