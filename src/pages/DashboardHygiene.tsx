import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList, ReferenceLine
} from "recharts";
import { HandMetal, CheckCircle, AlertTriangle, Users, Loader2, Download, ClipboardCheck, XCircle } from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";
import { useAuditDashboard } from "@/hooks/useAuditDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";
import { useState, useMemo, useRef } from "react";
import ChartActions from "@/components/ChartActions";
import YearComparisonChart from "@/components/YearComparisonChart";

const COLORS = ["hsl(168, 66%, 34%)", "hsl(199, 89%, 48%)", "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)", "hsl(0, 72%, 51%)"];
const PIE_COLORS = ["hsl(168, 66%, 34%)", "hsl(0, 72%, 51%)"];

export default function DashboardHygiene() {
  const { hospitalId } = useHospitalContext();
  const { stats, items, audits, loading } = useAuditDashboard("hand_hygiene");
  const [dia, setDia] = useState<string[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [ano, setAno] = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);

  // Metas por gráfico
  const [metaPie, setMetaPie] = useState<number | undefined>();
  const [metaResumo, setMetaResumo] = useState<number | undefined>();
  const [metaProf, setMetaProf] = useState<number | undefined>(90);
  const [metaSetor, setMetaSetor] = useState<number | undefined>(90);
  const [metaAno, setMetaAno] = useState<number | undefined>(90);

  // Refs por gráfico
  const refPie = useRef<HTMLDivElement>(null);
  const refResumo = useRef<HTMLDivElement>(null);
  const refProf = useRef<HTMLDivElement>(null);
  const refSetor = useRef<HTMLDivElement>(null);

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

  // Comparativo por profissional (parseado de observations: "Profissional: X")
  const professionalData = useMemo(() => {
    const map: Record<string, { sum: number; count: number }> = {};
    audits.forEach(a => {
      const m = a.observations?.match(/Profissional:\s*([^|]+)/i);
      const prof = (m?.[1] || "Não informado").trim();
      if (!map[prof]) map[prof] = { sum: 0, count: 0 };
      map[prof].sum += a.compliance_rate || 0;
      map[prof].count++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, compliance: Math.round((v.sum / v.count) * 10) / 10, audits: v.count }))
      .sort((a, b) => b.compliance - a.compliance);
  }, [audits]);

  // Anos disponíveis e dataset de comparativo anual (média de adesão por mês x ano)
  const yearComparisonYears = useMemo(() => {
    const set = new Set<string>();
    audits.forEach(a => { if (a.audit_date) set.add(a.audit_date.substring(0, 4)); });
    return Array.from(set).sort();
  }, [audits]);

  const yearComparisonData = useMemo(() => {
    const monthLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const acc: Record<number, Record<string, { sum: number; count: number }>> = {};
    audits.forEach(a => {
      if (!a.audit_date) return;
      const y = a.audit_date.substring(0, 4);
      const mi = parseInt(a.audit_date.substring(5, 7), 10) - 1;
      if (!acc[mi]) acc[mi] = {};
      if (!acc[mi][y]) acc[mi][y] = { sum: 0, count: 0 };
      acc[mi][y].sum += a.compliance_rate || 0;
      acc[mi][y].count++;
    });
    return monthLabels.map((mes, i) => {
      const row: Record<string, any> = { mes };
      const monthData = acc[i] || {};
      yearComparisonYears.forEach(y => {
        if (monthData[y]) row[y] = Math.round((monthData[y].sum / monthData[y].count) * 10) / 10;
      });
      return row;
    });
  }, [audits, yearComparisonYears]);

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard — Higienização das Mãos</h1>
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
                <p className="text-xl md:text-2xl font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Hygiene Sim/Não charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card ref={refPie}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Higienizou? (Sim / Não)</CardTitle>
            <ChartActions chartRef={refPie} chartTitle="Higienizou (Sim/Não)" metaValue={metaPie} onMetaChange={setMetaPie} metaUnit="%" />
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} dataKey="value" paddingAngle={4} label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => v} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
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

        <Card ref={refResumo}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Resumo de Higienização</CardTitle>
            <ChartActions chartRef={refResumo} chartTitle="Resumo de Higienização" metaValue={metaResumo} onMetaChange={setMetaResumo} />
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[
                { name: "Formulários", value: stats.totalAudits },
                { name: "Com Higienização", value: hygieneStats.sim },
                { name: "Sem Higienização", value: hygieneStats.nao },
              ]} margin={{ top: 20, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="value" name="Quantidade" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="value" position="top" style={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                  <Cell fill="hsl(199, 89%, 48%)" />
                  <Cell fill="hsl(168, 66%, 34%)" />
                  <Cell fill="hsl(0, 72%, 51%)" />
                </Bar>
                {metaResumo !== undefined && (
                  <ReferenceLine y={metaResumo} stroke="hsl(168 66% 34%)" strokeDasharray="6 3" strokeWidth={2}
                    label={{ value: `Meta: ${metaResumo}`, position: "right", fontSize: 10, fill: "hsl(168 66% 34%)" }} />
                )}
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card ref={refProf}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Comparativo por Profissional (%)</CardTitle>
            <ChartActions chartRef={refProf} chartTitle="Comparativo por Profissional" metaValue={metaProf} onMetaChange={setMetaProf} metaUnit="%" />
          </CardHeader>
          <CardContent>
            {professionalData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Sem dados de profissional informados.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={professionalData} margin={{ top: 24, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number, n: string) => n === "compliance" ? `${v}%` : v} />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={() => "Adesão (%)"} />
                  <Bar dataKey="compliance" name="Adesão (%)" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]}>
                    <LabelList dataKey="compliance" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                  </Bar>
                  {metaProf !== undefined && (
                    <ReferenceLine y={metaProf} stroke="hsl(168 66% 34%)" strokeDasharray="6 3" strokeWidth={2}
                      label={{ value: `Meta: ${metaProf}%`, position: "right", fontSize: 10, fill: "hsl(168 66% 34%)" }} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card ref={refSetor}>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-base">Conformidade por Setor (%)</CardTitle>
            <ChartActions chartRef={refSetor} chartTitle="Conformidade por Setor" metaValue={metaSetor} onMetaChange={setMetaSetor} metaUnit="%" />
          </CardHeader>
          <CardContent>
            {stats.sectorData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Sem dados de setor.</div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={stats.sectorData} margin={{ top: 24, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} interval={0} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} formatter={() => "Conformidade (%)"} />
                  <Bar dataKey="compliance" name="Conformidade (%)" radius={[4, 4, 0, 0]}>
                    {stats.sectorData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    <LabelList dataKey="compliance" position="top" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: "hsl(var(--foreground))" }} />
                  </Bar>
                  {metaSetor !== undefined && (
                    <ReferenceLine y={metaSetor} stroke="hsl(168 66% 34%)" strokeDasharray="6 3" strokeWidth={2}
                      label={{ value: `Meta: ${metaSetor}%`, position: "right", fontSize: 10, fill: "hsl(168 66% 34%)" }} />
                  )}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {yearComparisonYears.length > 0 && (
        <YearComparisonChart
          title="Adesão à Higienização das Mãos"
          unit="%"
          years={yearComparisonYears}
          data={yearComparisonData}
          metaValue={metaAno}
          onMetaChange={setMetaAno}
        />
      )}

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
