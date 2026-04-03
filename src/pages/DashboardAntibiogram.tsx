import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  ArrowLeft, FileText, FileSpreadsheet, Activity, Bug, ShieldAlert,
  TrendingUp, TrendingDown, Award, AlertTriangle, Beaker, Microscope, Clock,
} from "lucide-react";
import { getAntibiogramasParaDashboard, type AntibiogramRecord } from "@/lib/antibiogram-storage";

// ── Colors ──
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

  // ── Filters ──
  const [filtroSetor, setFiltroSetor] = useState("all");
  const [filtroSite, setFiltroSite] = useState("all");
  const [filtroOrg, setFiltroOrg] = useState("all");

  const setores = useMemo(() => [...new Set(allData.map(d => d.sector))].sort(), [allData]);
  const sites = useMemo(() => [...new Set(allData.map(d => d.site))].sort(), [allData]);
  const organismos = useMemo(() => [...new Set(allData.map(d => d.organism))].sort(), [allData]);

  const filtered = useMemo(() => allData.filter(d =>
    (filtroSetor === "all" || d.sector === filtroSetor) &&
    (filtroSite === "all" || d.site === filtroSite) &&
    (filtroOrg === "all" || d.organism === filtroOrg)
  ), [allData, filtroSetor, filtroSite, filtroOrg]);

  // ── KPIs ──
  const totalExams = filtered.length;
  const allResults = filtered.flatMap(d => d.results);
  const totalTests = allResults.length;
  const resistantCount = allResults.filter(r => r.sir === "R").length;
  const sensitiveCount = allResults.filter(r => r.sir === "S").length;
  const resistanceRate = totalTests > 0 ? Math.round((resistantCount / totalTests) * 1000) / 10 : 0;
  const sensitivityRate = totalTests > 0 ? Math.round((sensitiveCount / totalTests) * 1000) / 10 : 0;

  const phenotypeCount = filtered.filter(d => d.detectedPhenotypes.length > 0).length;
  const phenotypeRate = totalExams > 0 ? Math.round((phenotypeCount / totalExams) * 1000) / 10 : 0;

  // ── Top organisms ──
  const orgCounts = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => { map[d.organism] = (map[d.organism] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ── Distribution by sector ──
  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => { map[d.sector] = (map[d.sector] || 0) + 1; });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ── SIR by antibiotic ──
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

  // ── Monthly trend ──
  const monthlyTrend = useMemo(() => {
    const map: Record<string, { total: number; R: number }> = {};
    filtered.forEach(d => {
      const month = d.collectionDate.slice(0, 7);
      if (!map[month]) map[month] = { total: 0, R: 0 };
      d.results.forEach(r => {
        map[month].total++;
        if (r.sir === "R") map[month].R++;
      });
    });
    return Object.entries(map).sort().map(([month, v]) => ({
      month, taxaResistencia: Math.round((v.R / v.total) * 100), exames: v.total,
    }));
  }, [filtered]);

  // ── Phenotype distribution ──
  const phenotypeDist = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(d => d.detectedPhenotypes.forEach(p => { map[p] = (map[p] || 0) + 1; }));
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ── Gamification: risk level ──
  const riskLevel = resistanceRate > 40 ? "critical" : resistanceRate > 25 ? "high" : resistanceRate > 15 ? "moderate" : "low";
  const riskConfig: Record<string, { label: string; color: string; icon: typeof ShieldAlert }> = {
    critical: { label: "Crítico", color: "bg-destructive text-destructive-foreground", icon: ShieldAlert },
    high: { label: "Alto", color: "bg-warning text-warning-foreground", icon: AlertTriangle },
    moderate: { label: "Moderado", color: "bg-info text-info-foreground", icon: Activity },
    low: { label: "Baixo", color: "bg-success text-success-foreground", icon: Award },
  };
  const risk = riskConfig[riskLevel];
  const RiskIcon = risk.icon;

  // ── Badges ──
  const badges = useMemo(() => {
    const b: { label: string; variant: "destructive" | "default" | "secondary" | "outline" }[] = [];
    if (phenotypeCount > 5) b.push({ label: "⚠️ Surto potencial", variant: "destructive" });
    if (resistanceRate > 35) b.push({ label: "🔴 Resistência elevada", variant: "destructive" });
    if (sensitivityRate > 70) b.push({ label: "✅ Boa sensibilidade", variant: "default" });
    if (totalExams > 50) b.push({ label: "📊 Volume alto de exames", variant: "secondary" });
    if (phenotypeDist.some(p => p.name === "KPC" && p.value > 3)) b.push({ label: "🧬 Alerta KPC", variant: "destructive" });
    if (phenotypeDist.some(p => p.name === "MRSA" && p.value > 3)) b.push({ label: "🦠 Alerta MRSA", variant: "destructive" });
    return b;
  }, [phenotypeCount, resistanceRate, sensitivityRate, totalExams, phenotypeDist]);

  // ── Insights ──
  const insights = useMemo(() => {
    const ins: string[] = [];
    if (orgCounts.length > 0) ins.push(`O microrganismo mais frequente é ${orgCounts[0].name} com ${orgCounts[0].value} isolados.`);
    if (resistanceRate > 30) ins.push(`Taxa de resistência de ${resistanceRate}% está acima do limiar de 30%. Revisão de protocolos recomendada.`);
    if (phenotypeCount > 0) ins.push(`${phenotypeCount} exames (${phenotypeRate}%) apresentam fenótipos de resistência crítica.`);
    const topResist = sirByAntibiotic.filter(a => a.resistRate > 50);
    if (topResist.length > 0) ins.push(`Antibióticos com >50% de resistência: ${topResist.map(a => a.name).join(", ")}.`);
    if (sectorData.length > 0) ins.push(`Setor com maior volume: ${sectorData[0].name} (${sectorData[0].value} exames).`);
    if (ins.length === 0) ins.push("Dados insuficientes para gerar insights significativos.");
    return ins;
  }, [orgCounts, resistanceRate, phenotypeCount, phenotypeRate, sirByAntibiotic, sectorData]);

  // ── Export stubs ──
  const handleExportPDF = () => toast({ title: "Exportar PDF", description: "Funcionalidade será implementada com integração backend." });
  const handleExportExcel = () => toast({ title: "Exportar Excel", description: "Funcionalidade será implementada com integração backend." });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold font-heading">Dashboard Antibiograma</h1>
            <p className="text-sm text-muted-foreground">Perfil de sensibilidade microbiana — visão consolidada</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF} className="gap-1.5">
            <FileText className="h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5">
            <FileSpreadsheet className="h-4 w-4" /> Excel
          </Button>
        </div>
      </div>

      {/* Risk & Badges */}
      <div className="flex flex-wrap items-center gap-3">
        <Badge className={`${risk.color} gap-1.5 text-sm py-1 px-3`}>
          <RiskIcon className="h-4 w-4" /> Risco: {risk.label}
        </Badge>
        {badges.map((b, i) => (
          <Badge key={i} variant={b.variant} className="text-xs">{b.label}</Badge>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Setor</label>
              <Select value={filtroSetor} onValueChange={setFiltroSetor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Material Biológico</label>
              <Select value={filtroSite} onValueChange={setFiltroSite}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {sites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Microrganismo</label>
              <Select value={filtroOrg} onValueChange={setFiltroOrg}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Beaker className="h-4 w-4" /><span className="text-xs">Total de Exames</span>
            </div>
            <p className="text-2xl font-bold">{totalExams}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Microscope className="h-4 w-4" /><span className="text-xs">Testes Realizados</span>
            </div>
            <p className="text-2xl font-bold">{totalTests}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1" style={{ color: "hsl(0,72%,51%)" }}>
              <Bug className="h-4 w-4" /><span className="text-xs">Taxa de Resistência</span>
            </div>
            <p className="text-2xl font-bold">{resistanceRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-1" style={{ color: "hsl(38,92%,50%)" }}>
              <ShieldAlert className="h-4 w-4" /><span className="text-xs">Fenótipos Críticos</span>
            </div>
            <p className="text-2xl font-bold">{phenotypeCount}</p>
            <p className="text-xs text-muted-foreground">{phenotypeRate}% dos exames</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Sector + Organisms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição por Setor</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={sectorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(168,66%,34%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Microrganismos Mais Frequentes</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={orgCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name.split(" ")[0]} ${(percent * 100).toFixed(0)}%`}>
                  {orgCounts.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value: number, _name: string, props: any) => [`${value} isolados`, props.payload.name]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Chart Row 2: SIR by antibiotic */}
      <Card>
        <CardHeader><CardTitle className="text-base">Perfil de Sensibilidade por Antibiótico</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={sirByAntibiotic}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={70} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="S" name="Sensível" stackId="a" fill={SIR_COLORS.S} />
              <Bar dataKey="I" name="Intermediário" stackId="a" fill={SIR_COLORS.I} />
              <Bar dataKey="R" name="Resistente" stackId="a" fill={SIR_COLORS.R} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Chart Row 3: Monthly trend + Phenotypes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Tendência Mensal de Resistência</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis unit="%" />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Line type="monotone" dataKey="taxaResistencia" name="Taxa de Resistência" stroke="hsl(0,72%,51%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Fenótipos de Resistência</CardTitle></CardHeader>
          <CardContent>
            {phenotypeDist.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">Nenhum fenótipo detectado</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={phenotypeDist}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
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
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Insights Automáticos
          </CardTitle>
          <CardDescription>Análise baseada nos dados filtrados</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {insights.map((ins, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-primary mt-0.5">•</span>
                <span>{ins}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ── Análise Temporal ── */}
      <TemporalAnalysis filtered={filtered} />

      <Separator />

      {/* Detailed Table with own filters */}
      <DetailedTable data={filtered} />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Temporal Analysis Section
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

  // Monthly organism counts for line chart
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

  // Outbreak detection: compare last 2 months per organism+sector
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

  // Sector heatmap: sector × month
  const sectorHeatmap = useMemo(() => {
    const months = [...new Set(filtered.map(d => d.collectionDate.slice(0, 7)))].sort().slice(-6);
    return topSectors.map(sector => {
      const row: Record<string, string | number> = { sector };
      months.forEach(m => {
        row[m] = filtered.filter(d => d.collectionDate.startsWith(m) && d.sector === sector).length;
      });
      return { sector, months, data: row };
    });
  }, [filtered, topSectors]);

  const heatmapMonths = useMemo(() => [...new Set(filtered.map(d => d.collectionDate.slice(0, 7)))].sort().slice(-6), [filtered]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" /> Análise Temporal
        </CardTitle>
        <CardDescription>Comportamento dos microrganismos por setor ao longo do semestre</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Organism trend chart */}
        <div>
          <p className="text-sm font-medium mb-3">Evolução dos Top 5 Microrganismos</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={orgMonthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {topOrganisms.map((org, i) => (
                <Line key={org} type="monotone" dataKey={org} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Sector heatmap */}
        <div>
          <p className="text-sm font-medium mb-3">Heatmap: Setor × Mês (isolados)</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[130px]">Setor</TableHead>
                  {heatmapMonths.map(m => <TableHead key={m} className="text-center text-xs">{m}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorHeatmap.map(row => (
                  <TableRow key={row.sector}>
                    <TableCell className="text-xs font-medium">{row.sector}</TableCell>
                    {heatmapMonths.map(m => {
                      const val = (row.data[m] as number) || 0;
                      const bg = val >= 8 ? "bg-destructive/20 text-destructive" : val >= 4 ? "bg-warning/20 text-warning" : val > 0 ? "bg-success/10" : "";
                      return <TableCell key={m} className={`text-center text-xs font-medium ${bg}`}>{val || "—"}</TableCell>;
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Outbreak alerts */}
        {outbreakAlerts.length > 0 && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
            <p className="font-semibold text-destructive flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4" /> Possíveis Surtos Detectados
            </p>
            {outbreakAlerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <TrendingUp className="h-4 w-4 text-destructive" />
                <span>
                  <strong>{a.organism}</strong> em <strong>{a.sector}</strong>: {a.prev} → {a.curr} isolados
                  <Badge variant="destructive" className="ml-2 text-[10px]">+{a.change}%</Badge>
                </span>
              </div>
            ))}
          </div>
        )}
        {outbreakAlerts.length === 0 && (
          <div className="rounded-lg border border-success/30 bg-success/5 p-4">
            <p className="text-sm text-success flex items-center gap-2">
              <TrendingDown className="h-4 w-4" /> Nenhum padrão de surto detectado no período analisado.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════
// Detailed Table with independent filters
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
      <CardHeader>
        <CardTitle className="text-base">Exames Detalhados</CardTitle>
        <CardDescription>{tableData.length} registros encontrados</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Table filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Setor</label>
            <Select value={tSetor} onValueChange={setTSetor}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Material</label>
            <Select value={tSite} onValueChange={setTSite}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {sites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Microrganismo</label>
            <Select value={tOrg} onValueChange={setTOrg}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {organismos.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Perfil SIR</label>
            <Select value={tSir} onValueChange={setTSir}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="S">Sensível (S)</SelectItem>
                <SelectItem value="I">Intermediário (I)</SelectItem>
                <SelectItem value="R">Resistente (R)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Amostra</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Material</TableHead>
                <TableHead>Microrganismo</TableHead>
                <TableHead className="text-center">Testes</TableHead>
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
                    <TableCell className="text-xs whitespace-nowrap">{d.collectionDate}</TableCell>
                    <TableCell className="text-xs">{d.sampleId}</TableCell>
                    <TableCell className="text-xs">{d.sector}</TableCell>
                    <TableCell className="text-xs">{d.site}</TableCell>
                    <TableCell className="text-xs font-medium">{d.organism}</TableCell>
                    <TableCell className="text-center text-xs">{d.results.length}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-xs border-success text-success">{s}</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-xs border-warning text-warning">{ii}</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="text-xs border-destructive text-destructive">{rr}</Badge></TableCell>
                    <TableCell>
                      {d.detectedPhenotypes.length > 0
                        ? d.detectedPhenotypes.map(p => <Badge key={p} variant="destructive" className="text-[10px] mr-1">{p}</Badge>)
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
