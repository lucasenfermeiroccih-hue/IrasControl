import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { CheckCircle, AlertTriangle, TrendingUp, Activity, Loader2, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";
import { useAuditDashboard } from "@/hooks/useAuditDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";
import { useState } from "react";

function getStatusBadge(status: string) {
  if (status === "Crítico") return <Badge variant="destructive">{status}</Badge>;
  if (status === "Atenção") return <Badge className="bg-warning/20 text-warning border-warning/30">{status}</Badge>;
  return <Badge className="bg-success/20 text-success border-success/30">{status}</Badge>;
}

export default function DashboardBundles() {
  const { hospitalId } = useHospitalContext();
  const { stats, loading } = useAuditDashboard("bundles");
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
        audits: stats.sectorData.map(s => ({ type: "Bundles", sector: s.name, date: "", compliance: s.compliance, compliant: s.audits - s.nonCompliant, total: s.audits })),
      },
      filenamePrefix: "bundles",
    });
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Conformidade Geral", value: `${stats.avgCompliance}%`, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { label: "Auditorias Realizadas", value: String(stats.totalAudits), icon: Activity, color: "text-info", bg: "bg-info/10" },
    { label: "Não Conformidades", value: String(stats.nonCompliantItems), icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Melhoria Período", value: `${stats.improvement >= 0 ? "+" : ""}${stats.improvement}%`, icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
  ];

  const conformeCount = Math.round(stats.avgCompliance);
  const donutData = [
    { name: "Conforme", value: conformeCount, color: "hsl(var(--success))" },
    { name: "Não Conforme", value: 100 - conformeCount, color: "hsl(var(--destructive))" },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard — Bundles CVC/SVD</h1>
          <p className="text-sm text-muted-foreground">Indicadores de conformidade de dispositivos invasivos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
          <DashboardAIInsights generateInsights={() => {
          const ins: string[] = [];
          ins.push(`📊 Conformidade geral de ${stats.avgCompliance}% com ${stats.totalAudits} auditorias.`);
          if (stats.nonCompliantItems > 0) ins.push(`⚠️ ${stats.nonCompliantItems} itens não conformes identificados.`);
          if (stats.topFailures.length > 0) ins.push(`🔻 Principal falha: "${stats.topFailures[0].item}" (${stats.topFailures[0].count}x).`);
          const bestSector = stats.sectorData.sort((a, b) => b.compliance - a.compliance)[0];
          if (bestSector) ins.push(`✅ Melhor setor: ${bestSector.name} com ${bestSector.compliance}%.`);
          ins.push("💡 Recomendação: reforçar checklist de bundles nos setores com menor conformidade.");
          return ins;
        }} />
        </div>
      </div>

      <DashboardFilters dia={dia} setDia={setDia} mes={mes} setMes={setMes} ano={ano} setAno={setAno} setor={setor} setSetor={setSetor} />

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
          <CardHeader><CardTitle className="text-base">Conformidade Geral</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Evolução Mensal (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="compliance" name="Conformidade %" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {stats.sectorData.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Detalhamento por Setor</CardTitle></CardHeader>
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
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Nenhuma auditoria de bundles registrada. Crie uma nova auditoria para ver os dados aqui.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
