import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { Building2, CheckCircle, AlertTriangle, TrendingUp, Loader2, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import { useAuditDashboard } from "@/hooks/useAuditDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";

function getStatusBadge(status: string) {
  if (status === "Crítico") return <Badge variant="destructive">{status}</Badge>;
  if (status === "Atenção") return <Badge className="bg-warning/20 text-warning border-warning/30">{status}</Badge>;
  return <Badge className="bg-success/20 text-success border-success/30">{status}</Badge>;
}

export default function DashboardStructure() {
  const { hospitalId } = useHospitalContext();
  const { stats, loading } = useAuditDashboard("cti_infrastructure");

  const handleExportPdf = () => {
    if (!hospitalId) return;
    exportPdf({
      type: "audits", hospitalId,
      data: {
        kpis: { avgCompliance: stats.avgCompliance, totalAudits: stats.totalAudits, nonCompliant: stats.nonCompliantItems },
        audits: stats.sectorData.map(s => ({ type: "Estrutura CTI", sector: s.name, date: "", compliance: s.compliance, compliant: s.audits - s.nonCompliant, total: s.audits })),
      },
      filenamePrefix: "estrutura-cti",
    });
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Conformidade Geral", value: `${stats.avgCompliance}%`, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { label: "Auditorias CTI", value: String(stats.totalAudits), icon: Building2, color: "text-primary", bg: "bg-primary/10" },
    { label: "Itens Críticos", value: String(stats.nonCompliantItems), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Melhoria Período", value: `${stats.improvement >= 0 ? "+" : ""}${stats.improvement}%`, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
  ];

  const radarData = stats.categoryData.map(c => ({ subject: c.name, A: c.compliance }));

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard — Vigilância de Estrutura (CTI)</h1>
          <p className="text-sm text-muted-foreground">Conformidade de infraestrutura e recursos dos CTIs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
          <DashboardAIInsights generateInsights={() => {
          const ins: string[] = [];
          ins.push(`📊 Conformidade geral de ${stats.avgCompliance}% com ${stats.totalAudits} auditorias de CTI.`);
          if (stats.nonCompliantItems > 0) ins.push(`⚠️ ${stats.nonCompliantItems} itens não conformes.`);
          ins.push("💡 Recomendação: plano de ação para os setores com menor conformidade.");
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
          <CardHeader><CardTitle className="text-base">Conformidade por Categoria</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.categoryData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="compliance" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {radarData.length > 2 && (
          <Card>
            <CardHeader><CardTitle className="text-base">Radar de Infraestrutura</CardTitle></CardHeader>
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

      {stats.sectorData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Detalhamento por CTI</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Setor</TableHead>
                  <TableHead className="text-center">Conformidade (%)</TableHead>
                  <TableHead className="text-center">Auditorias</TableHead>
                  <TableHead className="text-center">Não Conformes</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.sectorData.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-center">{r.compliance}%</TableCell>
                    <TableCell className="text-center">{r.audits}</TableCell>
                    <TableCell className="text-center">{r.nonCompliant}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(r.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {stats.totalAudits === 0 && (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><p className="text-sm">Nenhuma auditoria de estrutura CTI registrada.</p></CardContent></Card>
      )}
    </div>
  );
}
