import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { HandMetal, CheckCircle, AlertTriangle, Users, Loader2, Download, ClipboardCheck, XCircle } from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";
import { useAuditDashboard } from "@/hooks/useAuditDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";
import { useState, useMemo } from "react";

const COLORS = ["hsl(168, 66%, 34%)", "hsl(199, 89%, 48%)", "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)", "hsl(0, 72%, 51%)"];
const PIE_COLORS = ["hsl(168, 66%, 34%)", "hsl(0, 72%, 51%)"];

export default function DashboardHygiene() {
  const { hospitalId } = useHospitalContext();
  const { stats, items, loading } = useAuditDashboard("hand_hygiene");
  const [dia, setDia] = useState<string[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [ano, setAno] = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);

  // Compute hygiene-specific stats from audit items
  const hygieneStats = useMemo(() => {
    const hygieneItems = items.filter(i => i.category === "Higiene");
    const sim = hygieneItems.filter(i => i.status === "compliant").length;
    const nao = hygieneItems.filter(i => i.status === "non_compliant").length;
    const total = hygieneItems.length;
    return { sim, nao, total };
  }, [items]);

  const pieData = useMemo(() => [
    { name: "Sim", value: hygieneStats.sim },
    { name: "Não", value: hygieneStats.nao },
  ], [hygieneStats]);

  const handleExportPdf = () => {
    if (!hospitalId) return;
    exportPdf({
      type: "audits", hospitalId,
      data: {
        kpis: { avgCompliance: stats.avgCompliance, totalAudits: stats.totalAudits, nonCompliant: stats.nonCompliantItems },
        audits: stats.sectorData.map(s => ({ type: "Higiene", sector: s.name, date: "", compliance: s.compliance, compliant: s.audits - s.nonCompliant, total: s.audits })),
      },
      filenamePrefix: "higiene-maos",
    });
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Taxa de Adesão", value: `${stats.avgCompliance}%`, icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { label: "Formulários Analisados", value: String(stats.totalAudits), icon: ClipboardCheck, color: "text-primary", bg: "bg-primary/10" },
    { label: "Com Higienização", value: String(hygieneStats.sim), icon: HandMetal, color: "text-success", bg: "bg-success/10" },
    { label: "Sem Higienização", value: String(hygieneStats.nao), icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard — Higienização das Mãos</h1>
          <p className="text-sm text-muted-foreground">Indicadores de adesão aos 5 momentos da OMS</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPdf}><Download className="h-4 w-4 mr-1" />PDF</Button>
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            ins.push(`📊 Taxa de adesão geral de ${stats.avgCompliance}% com ${stats.totalAudits} formulários.`);
            ins.push(`✅ ${hygieneStats.sim} instâncias com higienização realizada.`);
            ins.push(`❌ ${hygieneStats.nao} instâncias sem higienização.`);
            if (stats.topFailures.length > 0) ins.push(`🔻 Item mais crítico: "${stats.topFailures[0].item}".`);
            ins.push("💡 Recomendação: feedback em tempo real e campanhas focadas nos momentos mais frágeis.");
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

      {/* Hygiene Sim/Não charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Higienizou? (Sim / Não)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => v} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              {hygieneStats.total > 0 && (
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[0] }} />
                    <span className="text-muted-foreground">Sim:</span>
                    <span className="font-bold">{hygieneStats.sim} ({Math.round((hygieneStats.sim / hygieneStats.total) * 100)}%)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: PIE_COLORS[1] }} />
                    <span className="text-muted-foreground">Não:</span>
                    <span className="font-bold">{hygieneStats.nao} ({Math.round((hygieneStats.nao / hygieneStats.total) * 100)}%)</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Resumo de Higienização</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={[
                { name: "Formulários", value: stats.totalAudits },
                { name: "Com Higienização", value: hygieneStats.sim },
                { name: "Sem Higienização", value: hygieneStats.nao },
              ]}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Quantidade" radius={[4, 4, 0, 0]}>
                  <Cell fill="hsl(199, 89%, 48%)" />
                  <Cell fill="hsl(168, 66%, 34%)" />
                  <Cell fill="hsl(0, 72%, 51%)" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Conformidade por Categoria (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.categoryData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="compliance" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Conformidade por Setor</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={stats.sectorData.map(s => ({ name: s.name, value: s.compliance }))} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={3}>
                    {stats.sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => `${v}%`} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {stats.sectorData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-semibold ml-auto">{d.compliance}%</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {stats.topFailures.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Principais Não Conformidades</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {stats.topFailures.map((f, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-xs font-bold text-destructive">{i + 1}</span>
                  <span className="text-sm font-medium">{f.item}</span>
                </div>
                <span className="text-sm font-bold text-destructive">{f.count}x</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {stats.totalAudits === 0 && (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><p className="text-sm">Nenhuma auditoria de higienização registrada.</p></CardContent></Card>
      )}
    </div>
  );
}
