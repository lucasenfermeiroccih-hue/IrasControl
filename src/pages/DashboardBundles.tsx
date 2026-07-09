import { buildSectorOptions } from "@/lib/sectorUtils";
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
import { DashboardPdfReport, type DashboardReportData } from "@/components/DashboardPdfReport";
import { useState } from "react";
import { AuditManagerReportButton } from "@/modules/audits/reports/AuditManagerReportButton";

function getStatusBadge(status: string) {
  if (status === "Crítico") return <Badge variant="destructive">{status}</Badge>;
  if (status === "Atenção") return <Badge className="bg-warning/20 text-warning border-warning/30">{status}</Badge>;
  return <Badge className="bg-success/20 text-success border-success/30">{status}</Badge>;
}

export default function DashboardBundles() {
  const { hospitalId, hospitalName } = useHospitalContext();
  const [dia, setDia] = useState<string[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [ano, setAno] = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);
  const { stats, loading, allAudits } = useAuditDashboard("bundles", { dia, mes, ano, setor });

  const reportData: DashboardReportData = {
    title: "Dashboard — Bundles CVC/SVD",
    subtitle: "Indicadores de conformidade de dispositivos invasivos · CVC e SVD",
    hospitalName,
    goal: "Meta: ≥85%",
    referenceNorm: "ANVISA RDC 07/2010 · Protocolos PROQUALIS",
    context:
      "Este relatório apresenta os indicadores de conformidade dos bundles de inserção e manutenção de dispositivos vasculares (CVC — Cateter Venoso Central) e vesicais (SVD — Sonda Vesical de Demora). Os bundles são pacotes de intervenções com evidência científica que, aplicados em conjunto, reduzem significativamente a incidência de infecções associadas a dispositivos (ICSC-CVC e ITU-CA). A adesão completa a todos os elementos do bundle é obrigatória para máxima efetividade.",
    methodology:
      "Auditoria de conformidade com checklist de bundle validado para cada dispositivo. Avaliação dos elementos: higiene das mãos antes do procedimento, uso de barreira máxima, antissepsia da pele, escolha do sítio de inserção, checagem diária de necessidade e cuidados de manutenção. Registros por setor e período.",
    kpis: [
      { label: "Conformidade Geral", value: `${stats.avgCompliance}%`, sub: "Meta: 85%", status: stats.avgCompliance >= 85 ? "ok" : stats.avgCompliance >= 70 ? "warning" : "critical" },
      { label: "Auditorias Realizadas", value: String(stats.totalAudits), sub: "registros no período" },
      { label: "Não Conformidades", value: String(stats.nonCompliantItems), sub: "itens não conformes", status: stats.nonCompliantItems === 0 ? "ok" : "critical" },
      { label: "Melhoria Período", value: `${stats.improvement >= 0 ? "+" : ""}${stats.improvement}%`, sub: "vs período anterior", status: stats.improvement >= 0 ? "ok" : "warning" },
    ],
    sectorData: stats.sectorData.map(s => ({ name: s.name, compliance: s.compliance, audits: s.audits, nc: s.nonCompliant })),
    monthlyTrend: (stats.monthlyTrend ?? []).map(m => ({ month: m.month, value: m.compliance })),
    topIssues: stats.topFailures.map(f => ({ item: f.item, count: f.count })),
    discussion: [
      `A conformidade com os bundles CVC/SVD no período é de ${stats.avgCompliance}%, ${stats.avgCompliance >= 85 ? "dentro da meta de 85%, demonstrando boa adesão da equipe aos protocolos de prevenção de IRAS" : "abaixo da meta de 85%, aumentando o risco de infecções associadas a dispositivos (ICSC-CVC e ITU-CA)"}. Foram realizadas ${stats.totalAudits} auditoria(s), com ${stats.nonCompliantItems} não conformidade(s) identificada(s).`,
      stats.sectorData.length > 0
        ? `A análise setorial revela variabilidade de desempenho entre os setores: ${stats.sectorData.filter(s => s.compliance >= 85).length} setor(es) adequado(s) e ${stats.sectorData.filter(s => s.compliance < 85).length} setor(es) aquém da meta.`
        : "Não há dados suficientes para análise setorial no período.",
      stats.topFailures[0]
        ? `Elemento de bundle com maior não conformidade: "${stats.topFailures[0].item}" (${stats.topFailures[0].count} ocorrências). A não adesão a qualquer elemento do bundle compromete a efetividade do conjunto e aumenta o risco de infecção.`
        : "Todos os elementos dos bundles foram aplicados adequadamente no período avaliado.",
      `Tendência: ${stats.improvement >= 0 ? "melhora de +" + stats.improvement + "%" : "queda de " + Math.abs(stats.improvement) + "%"} em relação ao período anterior. ${stats.improvement < 0 ? "Investigar mudanças de equipe, materiais ou protocolos que possam explicar a redução." : "Consolidar as práticas de sucesso e expandir para setores com menor desempenho."}`,
    ].join("\n"),
    recommendations: [
      `${stats.avgCompliance < 85 ? "Realizar treinamento de reciclagem sobre bundles CVC/SVD com toda a equipe assistencial." : "Manter a educação continuada sobre bundles como parte da cultura de segurança hospitalar."}`,
      stats.topFailures[0]
        ? `Focar no elemento "${stats.topFailures[0].item}" — item mais frequentemente negligenciado no bundle.`
        : "Garantir que todos os elementos do bundle sejam verificados em cada inserção e manutenção de dispositivo.",
      "Implementar checagem diária documentada da necessidade de manutenção do dispositivo invasivo.",
      "Realizar bundle review com a equipe médica e de enfermagem mensalmente para revisão de casos com não conformidade.",
      "Monitorar correlação entre conformidade de bundles e taxas de ICSC-CVC e ITU-CA no setor de epidemiologia.",
      "Elaborar Plano de Ação 5W2H para não conformidades identificadas, com responsável e prazo máximo de 15 dias.",
    ],
    filenamePrefix: "bundles",
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard — Bundles CVC/SVD</h1>
          <p className="text-sm text-muted-foreground">Indicadores de conformidade de dispositivos invasivos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DashboardPdfReport data={reportData} />
          <AuditManagerReportButton hospitalId={hospitalId || ""} hospitalName={hospitalName} availableSectors={buildSectorOptions(allAudits)} defaultAuditType="bundles" />
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

      <DashboardFilters dia={dia} setDia={setDia} mes={mes} setMes={setMes} ano={ano} setAno={setAno} setor={setor} setSetor={setSetor} sectors={buildSectorOptions(allAudits)} years={Array.from(new Set(allAudits.map(a => a.audit_date?.substring(0, 4)).filter(Boolean) as string[])).sort().reverse()} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${k.bg}`}>
                <k.icon className={`h-6 w-6 ${k.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="text-xl md:text-2xl font-bold">{k.value}</p>
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
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
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
            </div>
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
