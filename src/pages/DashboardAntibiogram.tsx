import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ArrowLeft, FileText, FileSpreadsheet, Activity, Bug, ShieldAlert,
  TrendingUp, TrendingDown, Award, AlertTriangle, Beaker, Microscope, Clock,
  Sparkles, Bot, Loader2, Download,
} from "lucide-react";
import { getAntibiogramasParaDashboard, type AntibiogramRecord } from "@/lib/antibiogram-storage";
import { sendToAgent } from "@/lib/agent-service";

const CHART_COLORS = [
  "hsl(168,66%,34%)", "hsl(199,89%,48%)", "hsl(38,92%,50%)",
  "hsl(0,72%,51%)", "hsl(142,71%,35%)", "hsl(270,60%,50%)",
  "hsl(330,60%,50%)", "hsl(200,40%,55%)", "hsl(50,80%,50%)",
  "hsl(15,80%,55%)",
];
const SIR_COLORS: Record<string, string> = { S: "hsl(142,71%,35%)", I: "hsl(38,92%,50%)", R: "hsl(0,72%,51%)" };

export default function DashboardAntibiogram() {
  const navigate = useNavigate();
  const allData = useMemo(() => getAntibiogramasParaDashboard(), []);

  const [filtroSetor, setFiltroSetor] = useState("all");
  const [filtroSite, setFiltroSite] = useState("all");
  const [filtroOrg, setFiltroOrg] = useState("all");
  const [filtroMes, setFiltroMes] = useState("all");
  const [filtroAno, setFiltroAno] = useState("all");

  const setores = useMemo(() => [...new Set(allData.map(d => d.sector))].sort(), [allData]);
  const sites = useMemo(() => [...new Set(allData.map(d => d.site))].sort(), [allData]);
  const organismos = useMemo(() => [...new Set(allData.map(d => d.organism))].sort(), [allData]);

  const filtered = useMemo(() => allData.filter(d =>
    (filtroSetor === "all" || d.sector === filtroSetor) &&
    (filtroSite === "all" || d.site === filtroSite) &&
    (filtroOrg === "all" || d.organism === filtroOrg) &&
    (filtroMes === "all" || d.collectionDate?.substring(5, 7) === filtroMes) &&
    (filtroAno === "all" || d.collectionDate?.substring(0, 4) === filtroAno)
  ), [allData, filtroSetor, filtroSite, filtroOrg, filtroMes, filtroAno]);

  const anosDisp = useMemo(() => [...new Set(allData.map(d => d.collectionDate?.substring(0, 4)).filter(Boolean))].sort(), [allData]);

  const totalExams = filtered.length;
  const allResults = filtered.flatMap(d => d.results);
  const totalTests = allResults.length;
  const resistantCount = allResults.filter(r => r.sir === "R").length;
  const sensitiveCount = allResults.filter(r => r.sir === "S").length;
  const resistanceRate = totalTests > 0 ? Math.round((resistantCount / totalTests) * 1000) / 10 : 0;
  const sensitivityRate = totalTests > 0 ? Math.round((sensitiveCount / totalTests) * 1000) / 10 : 0;
  const phenotypeCount = filtered.filter(d => d.detectedPhenotypes.length > 0).length;
  const phenotypeRate = totalExams > 0 ? Math.round((phenotypeCount / totalExams) * 1000) / 10 : 0;

  const orgCounts = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => { map[d.organism] = (map[d.organism] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => { map[d.sector] = (map[d.sector] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const sirByAntibiotic = useMemo(() => {
    const map: Record<string, { S: number; I: number; R: number }> = {};
    allResults.forEach(r => {
      if (!map[r.antibiotic]) map[r.antibiotic] = { S: 0, I: 0, R: 0 };
      if (r.sir === "S" || r.sir === "I" || r.sir === "R") map[r.antibiotic][r.sir]++;
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, total: v.S + v.I + v.R, resistRate: Math.round((v.R / (v.S + v.I + v.R)) * 100) }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [allResults]);

  const monthlyTrend = useMemo(() => {
    const map: Record<string, { total: number; R: number }> = {};
    filtered.forEach(d => {
      const month = d.collectionDate.slice(0, 7);
      if (!map[month]) map[month] = { total: 0, R: 0 };
      d.results.forEach(r => { map[month].total++; if (r.sir === "R") map[month].R++; });
    });
    return Object.entries(map).sort().map(([month, v]) => ({
      month, taxaResistencia: Math.round((v.R / v.total) * 100), exames: v.total,
    }));
  }, [filtered]);

  const phenotypeDist = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => d.detectedPhenotypes.forEach(p => { map[p] = (map[p] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const riskLevel = resistanceRate > 40 ? "critical" : resistanceRate > 25 ? "high" : resistanceRate > 15 ? "moderate" : "low";
  const riskConfig: Record<string, { label: string; color: string; icon: typeof ShieldAlert }> = {
    critical: { label: "Crítico", color: "bg-destructive text-destructive-foreground", icon: ShieldAlert },
    high: { label: "Alto", color: "bg-warning text-warning-foreground", icon: AlertTriangle },
    moderate: { label: "Moderado", color: "bg-info text-info-foreground", icon: Activity },
    low: { label: "Baixo", color: "bg-success text-success-foreground", icon: Award },
  };
  const risk = riskConfig[riskLevel];
  const RiskIcon = risk.icon;

  const badges = useMemo(() => {
    const b: { label: string; variant: "destructive" | "default" | "secondary" | "outline" }[] = [];
    if (phenotypeCount > 5) b.push({ label: "⚠️ Surto potencial", variant: "destructive" });
    if (resistanceRate > 35) b.push({ label: "🔴 Resistência elevada", variant: "destructive" });
    if (sensitivityRate > 70) b.push({ label: "✅ Boa sensibilidade", variant: "default" });
    if (totalExams > 50) b.push({ label: "📊 Volume alto", variant: "secondary" });
    if (phenotypeDist.some(p => p.name === "KPC" && p.value > 3)) b.push({ label: "🧬 Alerta KPC", variant: "destructive" });
    if (phenotypeDist.some(p => p.name === "MRSA" && p.value > 3)) b.push({ label: "🦠 Alerta MRSA", variant: "destructive" });
    return b;
  }, [phenotypeCount, resistanceRate, sensitivityRate, totalExams, phenotypeDist]);

  const insights = useMemo(() => {
    const ins: string[] = [];
    if (orgCounts.length > 0) ins.push(`O microrganismo mais frequente é ${orgCounts[0].name} com ${orgCounts[0].value} isolados.`);
    if (resistanceRate > 30) ins.push(`Taxa de resistência de ${resistanceRate}% está acima do limiar de 30%.`);
    if (phenotypeCount > 0) ins.push(`${phenotypeCount} exames (${phenotypeRate}%) apresentam fenótipos de resistência crítica.`);
    const topResist = sirByAntibiotic.filter(a => a.resistRate > 50);
    if (topResist.length > 0) ins.push(`Antibióticos com >50% de resistência: ${topResist.map(a => a.name).join(", ")}.`);
    if (sectorData.length > 0) ins.push(`Setor com maior volume: ${sectorData[0].name} (${sectorData[0].value} exames).`);
    if (ins.length === 0) ins.push("Dados insuficientes para gerar insights significativos.");
    return ins;
  }, [orgCounts, resistanceRate, phenotypeCount, phenotypeRate, sirByAntibiotic, sectorData]);

  // AI state
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [aiInsightsLoading, setAiInsightsLoading] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("ultimo-mes");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);

  const handleExportPDF = () => toast({ title: "Exportar PDF", description: "Funcionalidade será implementada com integração backend." });
  const handleExportExcel = () => toast({ title: "Exportar Excel", description: "Funcionalidade será implementada com integração backend." });

  const handleAIInsights = async () => {
    setAiInsightsLoading(true);
    try {
      const summaryData = {
        totalExames: totalExams,
        totalTestes: totalTests,
        taxaResistencia: resistanceRate,
        taxaSensibilidade: sensitivityRate,
        fenotipos: phenotypeCount,
        topOrganismos: orgCounts.slice(0, 5).map(o => `${o.name}: ${o.value}`),
        antibioticosComMaiorResistencia: sirByAntibiotic.filter(a => a.resistRate > 30).map(a => `${a.name}: ${a.resistRate}%`),
        setores: sectorData.map(s => `${s.name}: ${s.value}`),
      };
      const prompt = `Analise os dados de antibiograma e perfil de sensibilidade microbiana do hospital e gere insights clínicos detalhados com recomendações:\n\n${JSON.stringify(summaryData, null, 2)}`;
      const result = await sendToAgent("micro-report", "dashboard-insights", prompt);
      setAiInsights(result);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao gerar insights de IA.", variant: "destructive" });
    } finally {
      setAiInsightsLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    setReportLoading(true);
    setReportResult(null);
    try {
      const periodLabels: Record<string, string> = {
        "ultimo-mes": "último mês",
        "ultimos-3-meses": "últimos 3 meses",
        "ultimos-6-meses": "últimos 6 meses",
        "ultimo-ano": "último ano",
      };
      const summaryData = {
        periodo: periodLabels[reportPeriod] || reportPeriod,
        totalExames: totalExams,
        totalTestes: totalTests,
        taxaResistencia: resistanceRate,
        taxaSensibilidade: sensitivityRate,
        fenotipos: phenotypeCount,
        taxaFenotipo: phenotypeRate,
        topOrganismos: orgCounts.map(o => `${o.name}: ${o.value} isolados`),
        perfilSIR: sirByAntibiotic.map(a => `${a.name}: S=${a.S} I=${a.I} R=${a.R} (${a.resistRate}% resistência)`),
        setores: sectorData.map(s => `${s.name}: ${s.value} exames`),
        tendenciaMensal: monthlyTrend.map(t => `${t.month}: ${t.taxaResistencia}% resistência (${t.exames} testes)`),
        fenotiposDetectados: phenotypeDist.map(p => `${p.name}: ${p.value}`),
        filtros: { setor: filtroSetor, site: filtroSite, organismo: filtroOrg, mes: filtroMes, ano: filtroAno },
      };
      const prompt = `Gere um relatório completo de antibiograma e perfil de sensibilidade microbiológica para o período: ${periodLabels[reportPeriod]}. Inclua: resumo executivo, análise de resistência por antibiótico, distribuição de microrganismos, fenótipos de resistência detectados, tendências temporais, alertas de surto, e recomendações clínicas. Dados:\n\n${JSON.stringify(summaryData, null, 2)}`;
      const result = await sendToAgent("micro-report", "dashboard-report", prompt);
      setReportResult(result);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao gerar relatório.", variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportReportPDF = () => {
    if (!reportResult) return;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html><head><title>Relatório Microbiológico</title>
        <style>body{font-family:Arial,sans-serif;padding:40px;line-height:1.6;max-width:800px;margin:0 auto}
        h1,h2,h3{color:#1a5c4c}table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f0fdf4}
        @media print{body{padding:20px}}</style></head>
        <body>${reportResult.replace(/\n/g, "<br/>").replace(/#{3}\s(.+)/g, "<h3>$1</h3>").replace(/#{2}\s(.+)/g, "<h2>$1</h2>").replace(/#{1}\s(.+)/g, "<h1>$1</h1>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")}</body></html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg md:text-2xl font-bold font-heading">Dashboard Antibiograma</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Perfil de sensibilidade microbiana</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIInsights}
            disabled={aiInsightsLoading}
            className="gap-1.5 text-xs border-primary/30 hover:bg-primary/10"
          >
            {aiInsightsLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-primary" />}
            Insights IA
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setReportDialogOpen(true)}
            className="gap-1.5 text-xs border-primary/30 hover:bg-primary/10"
          >
            <Bot className="h-3.5 w-3.5 text-primary" /> Relatório IA
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
        </div>
      </div>

      {/* Risk & Badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge className={`${risk.color} gap-1 text-xs py-0.5 px-2`}>
          <RiskIcon className="h-3 w-3" /> Risco: {risk.label}
        </Badge>
        {badges.map((b, i) => (
          <Badge key={i} variant={b.variant} className="text-[10px]">{b.label}</Badge>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Mês</label>
              <Select value={filtroMes} onValueChange={setFiltroMes}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m, i) => (
                    <SelectItem key={m} value={m}>{["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][i]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Ano</label>
              <Select value={filtroAno} onValueChange={setFiltroAno}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {anosDisp.map(a => <SelectItem key={a} value={a!}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Setor</label>
              <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Material Biológico</label>
              <Select value={filtroSite} onValueChange={setFiltroSite}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {sites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Microrganismo</label>
              <Select value={filtroOrg} onValueChange={setFiltroOrg}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {organismos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 md:pt-4 md:pb-4">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Beaker className="h-3.5 w-3.5" /><span className="text-[10px] md:text-xs">Total Exames</span>
            </div>
            <p className="text-lg md:text-2xl font-bold">{totalExams}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:pt-4 md:pb-4">
            <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
              <Microscope className="h-3.5 w-3.5" /><span className="text-[10px] md:text-xs">Testes</span>
            </div>
            <p className="text-lg md:text-2xl font-bold">{totalTests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:pt-4 md:pb-4">
            <div className="flex items-center gap-1.5 mb-1" style={{ color: "hsl(0,72%,51%)" }}>
              <Bug className="h-3.5 w-3.5" /><span className="text-[10px] md:text-xs">Resistência</span>
            </div>
            <p className="text-lg md:text-2xl font-bold">{resistanceRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 md:pt-4 md:pb-4">
            <div className="flex items-center gap-1.5 mb-1" style={{ color: "hsl(38,92%,50%)" }}>
              <ShieldAlert className="h-3.5 w-3.5" /><span className="text-[10px] md:text-xs">Fenótipos</span>
            </div>
            <p className="text-lg md:text-2xl font-bold">{phenotypeCount}</p>
            <p className="text-[10px] text-muted-foreground">{phenotypeRate}% dos exames</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Distribuição por Setor</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={sectorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(168,66%,34%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Microrganismos Mais Frequentes</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            <div className="flex flex-col items-center gap-3">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={orgCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2}>
                    {orgCounts.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number, _name: string, props: any) => [`${value} isolados`, props.payload.name]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] md:text-xs w-full">
                {orgCounts.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5 min-w-0">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-muted-foreground truncate">{d.name}</span>
                    <span className="font-semibold ml-auto shrink-0">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SIR by antibiotic */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Perfil de Sensibilidade por Antibiótico</CardTitle></CardHeader>
        <CardContent className="p-2 md:p-6 pt-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sirByAntibiotic}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" tick={{ fontSize: 8 }} angle={-35} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} width={30} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="S" name="Sensível" stackId="a" fill={SIR_COLORS.S} />
              <Bar dataKey="I" name="Intermediário" stackId="a" fill={SIR_COLORS.I} />
              <Bar dataKey="R" name="Resistente" stackId="a" fill={SIR_COLORS.R} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Monthly trend + Phenotypes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Tendência Mensal de Resistência</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis unit="%" tick={{ fontSize: 10 }} width={35} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line type="monotone" dataKey="taxaResistencia" name="Resistência" stroke="hsl(0,72%,51%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Fenótipos de Resistência</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            {phenotypeDist.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">Nenhum fenótipo detectado</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={phenotypeDist}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} width={25} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="p-3 md:p-6 pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Insights Automáticos
          </CardTitle>
        </CardHeader>
        <CardContent className="p-3 md:p-6 pt-0">
          <ul className="space-y-1.5">
            {insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs md:text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>{ins}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* AI Generated Insights */}
      {aiInsights && (
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="p-3 md:p-6 pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" /> Insights de IA
              </CardTitle>
              <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setAiInsights(null)}>✕</Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6 pt-0">
            <div className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{aiInsights}</div>
          </CardContent>
        </Card>
      )}

      <TemporalAnalysis filtered={filtered} />

      <Separator />

      <DetailedTable data={filtered} />

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Agente de Relatórios Microbiológicos
            </DialogTitle>
            <DialogDescription>
              Gere relatórios completos de antibiograma e perfil de sensibilidade com IA
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período do Relatório</label>
              <Select value={reportPeriod} onValueChange={setReportPeriod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ultimo-mes">Último mês</SelectItem>
                  <SelectItem value="ultimos-3-meses">Últimos 3 meses</SelectItem>
                  <SelectItem value="ultimos-6-meses">Últimos 6 meses</SelectItem>
                  <SelectItem value="ultimo-ano">Último ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleGenerateReport} disabled={reportLoading} className="w-full gap-2">
              {reportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {reportLoading ? "Gerando relatório..." : "Gerar Relatório"}
            </Button>

            {reportResult && (
              <div className="space-y-3">
                <Separator />
                <div className="rounded-lg border bg-card p-4">
                  <div className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed">{reportResult}</div>
                </div>
                <Button variant="outline" onClick={handleExportReportPDF} className="w-full gap-2">
                  <Download className="h-4 w-4" /> Exportar Relatório em PDF
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Temporal Analysis
// ═══════════════════════════════════════════════════
function TemporalAnalysis({ filtered }: { filtered: AntibiogramRecord[] }) {
  const topOrganisms = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => { map[d.organism] = (map[d.organism] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name]) => name);
  }, [filtered]);

  const topSectors = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => { map[d.sector] = (map[d.sector] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name]) => name);
  }, [filtered]);

  const orgMonthlyData = useMemo(() => {
    const months = [...new Set(filtered.map(d => d.collectionDate.slice(0, 7)))].sort().slice(-6);
    return months.map(month => {
      const row: Record<string, string | number> = { month };
      topOrganisms.forEach(org => {
        row[org] = filtered.filter(d => d.collectionDate.startsWith(month) && d.organism === org).length;
      });
      return row;
    });
  }, [filtered, topOrganisms]);

  const outbreakAlerts = useMemo(() => {
    const months = [...new Set(filtered.map(d => d.collectionDate.slice(0, 7)))].sort();
    if (months.length < 2) return [];
    const last = months[months.length - 1];
    const prev = months[months.length - 2];
    const alerts: { organism: string; sector: string; prev: number; curr: number; change: number }[] = [];
    topOrganisms.forEach(org => {
      topSectors.forEach(sector => {
        const prevCount = filtered.filter(d => d.collectionDate.startsWith(prev) && d.organism === org && d.sector === sector).length;
        const currCount = filtered.filter(d => d.collectionDate.startsWith(last) && d.organism === org && d.sector === sector).length;
        if (currCount >= 3 && prevCount > 0 && currCount / prevCount >= 1.5) {
          alerts.push({ organism: org, sector, prev: prevCount, curr: currCount, change: Math.round(((currCount - prevCount) / prevCount) * 100) });
        } else if (currCount >= 4 && prevCount === 0) {
          alerts.push({ organism: org, sector, prev: 0, curr: currCount, change: 100 });
        }
      });
    });
    return alerts.sort((a, b) => b.change - a.change);
  }, [filtered, topOrganisms, topSectors]);

  const heatmapMonths = useMemo(() => [...new Set(filtered.map(d => d.collectionDate.slice(0, 7)))].sort().slice(-6), [filtered]);

  const sectorHeatmap = useMemo(() => {
    return topSectors.map(sector => {
      const data: Record<string, string | number> = { sector };
      heatmapMonths.forEach(m => {
        data[m] = filtered.filter(d => d.collectionDate.startsWith(m) && d.sector === sector).length;
      });
      return { sector, data };
    });
  }, [filtered, topSectors, heatmapMonths]);

  const heatCellColor = (val: number) =>
    val >= 8 ? "bg-destructive/20 text-destructive font-bold" : val >= 4 ? "bg-warning/20 text-warning font-bold" : val > 0 ? "bg-success/10" : "";

  return (
    <Card>
      <CardHeader className="p-3 md:p-6 pb-2">
        <CardTitle className="text-sm md:text-base flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" /> Análise Temporal
        </CardTitle>
        <CardDescription className="text-xs">Comportamento dos microrganismos por setor ao longo do semestre</CardDescription>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0 space-y-5">
        {/* Organism trend */}
        <div>
          <p className="text-xs md:text-sm font-medium mb-2">Evolução dos Top 5 Microrganismos</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={orgMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} width={25} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              {topOrganisms.map((org, i) => (
                <Line key={org} type="monotone" dataKey={org} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sector heatmap — Desktop */}
        <div>
          <p className="text-xs md:text-sm font-medium mb-2">Heatmap: Setor × Mês</p>
          <div className="hidden md:block overflow-x-auto">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[100px]">Setor</TableHead>
                  {heatmapMonths.map(m => <TableHead key={m} className="text-center">{m}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorHeatmap.map(row => (
                  <TableRow key={row.sector}>
                    <TableCell className="font-medium">{row.sector}</TableCell>
                    {heatmapMonths.map(m => {
                      const val = (row.data[m] as number) || 0;
                      return <TableCell key={m} className={`text-center ${heatCellColor(val)}`}>{val || "—"}</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Heatmap — Mobile cards */}
          <div className="md:hidden space-y-2">
            {sectorHeatmap.map(row => (
              <div key={row.sector} className="border border-border rounded-lg p-2.5">
                <p className="font-semibold text-xs mb-1.5">{row.sector}</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {heatmapMonths.map(m => {
                    const val = (row.data[m] as number) || 0;
                    return (
                      <div key={m} className={`rounded px-1.5 py-1 text-center ${heatCellColor(val)}`}>
                        <p className="text-[9px] text-muted-foreground">{m.slice(5)}</p>
                        <p className="text-xs font-mono font-bold">{val || "—"}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Outbreak alerts */}
        {outbreakAlerts.length > 0 ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 space-y-1.5">
            <p className="font-semibold text-destructive flex items-center gap-1.5 text-xs md:text-sm">
              <AlertTriangle className="h-3.5 w-3.5" /> Possíveis Surtos Detectados
            </p>
            {outbreakAlerts.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <TrendingUp className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                <span>
                  <strong>{a.organism}</strong> em <strong>{a.sector}</strong>: {a.prev}→{a.curr}
                  <Badge variant="destructive" className="ml-1 text-[9px]">+{a.change}%</Badge>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-success/30 bg-success/5 p-3">
            <p className="text-xs text-success flex items-center gap-1.5">
              <TrendingDown className="h-3.5 w-3.5" /> Nenhum padrão de surto detectado.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════
// Detailed Table
// ═══════════════════════════════════════════════════
function DetailedTable({ data }: { data: AntibiogramRecord[] }) {
  const [tSetor, setTSetor] = useState("all");
  const [tSite, setTSite] = useState("all");
  const [tOrg, setTOrg] = useState("all");
  const [tSir, setTSir] = useState("all");

  const setores = useMemo(() => [...new Set(data.map(d => d.sector))].sort(), [data]);
  const sites = useMemo(() => [...new Set(data.map(d => d.site))].sort(), [data]);
  const organismos = useMemo(() => [...new Set(data.map(d => d.organism))].sort(), [data]);

  const tableData = useMemo(() => {
    return data.filter(d => {
      if (tSetor !== "all" && d.sector !== tSetor) return false;
      if (tSite !== "all" && d.site !== tSite) return false;
      if (tOrg !== "all" && d.organism !== tOrg) return false;
      if (tSir !== "all") {
        const dominant = d.results.reduce((acc, r) => { acc[r.sir] = (acc[r.sir] || 0) + 1; return acc; }, {} as Record<string, number>);
        const max = Object.entries(dominant).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (max !== tSir) return false;
      }
      return true;
    });
  }, [data, tSetor, tSite, tOrg, tSir]);

  return (
    <Card>
      <CardHeader className="p-3 md:p-6 pb-2">
        <CardTitle className="text-sm md:text-base">Exames Detalhados</CardTitle>
        <CardDescription className="text-xs">{tableData.length} registros encontrados</CardDescription>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-0 space-y-3">
        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Setor</label>
            <Select value={tSetor} onValueChange={setTSetor}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Material</label>
            <Select value={tSite} onValueChange={setTSite}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {sites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Microrganismo</label>
            <Select value={tOrg} onValueChange={setTOrg}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {organismos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Perfil SIR</label>
            <Select value={tSir} onValueChange={setTSir}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="S">Sensível</SelectItem>
                <SelectItem value="I">Intermediário</SelectItem>
                <SelectItem value="R">Resistente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <Table className="text-xs">
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Amostra</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Microrganismo</TableHead>
                <TableHead className="text-center">S</TableHead>
                <TableHead className="text-center">I</TableHead>
                <TableHead className="text-center">R</TableHead>
                <TableHead>Fenótipos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.slice(0, 50).map(d => {
                const s = d.results.filter(r => r.sir === "S").length;
                const ii = d.results.filter(r => r.sir === "I").length;
                const rr = d.results.filter(r => r.sir === "R").length;
                return (
                  <TableRow key={d.id}>
                    <TableCell className="whitespace-nowrap">{d.collectionDate}</TableCell>
                    <TableCell>{d.sampleId}</TableCell>
                    <TableCell>{d.sector}</TableCell>
                    <TableCell>{d.site}</TableCell>
                    <TableCell className="font-medium">{d.organism}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-[10px] border-success text-success">{s}</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-[10px] border-warning text-warning">{ii}</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-[10px] border-destructive text-destructive">{rr}</Badge></TableCell>
                    <TableCell>
                      {d.detectedPhenotypes.length > 0
                        ? d.detectedPhenotypes.map(p => <Badge key={p} variant="destructive" className="text-[9px] mr-0.5">{p}</Badge>)
                        : <span className="text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden space-y-2">
          {tableData.slice(0, 30).map(d => {
            const s = d.results.filter(r => r.sir === "S").length;
            const ii = d.results.filter(r => r.sir === "I").length;
            const rr = d.results.filter(r => r.sir === "R").length;
            return (
              <div key={d.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-xs">{d.organism}</p>
                    <p className="text-[10px] text-muted-foreground">{d.sector} · {d.site}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">{d.collectionDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-success text-success">S:{s}</Badge>
                  <Badge variant="outline" className="text-[10px] border-warning text-warning">I:{ii}</Badge>
                  <Badge variant="outline" className="text-[10px] border-destructive text-destructive">R:{rr}</Badge>
                  {d.detectedPhenotypes.map(p => (
                    <Badge key={p} variant="destructive" className="text-[9px]">{p}</Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
