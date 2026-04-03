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
  TrendingUp, Award, AlertTriangle, Beaker, Microscope,
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
                <Tooltip />
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

      <Separator />

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exames Detalhados</CardTitle>
          <CardDescription>{filtered.length} registros encontrados</CardDescription>
        </CardHeader>
        <CardContent>
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
                {filtered.slice(0, 50).map(d => {
                  const s = d.results.filter(r => r.sir === "S").length;
                  const i = d.results.filter(r => r.sir === "I").length;
                  const r = d.results.filter(r => r.sir === "R").length;
                  return (
                    <TableRow key={d.id}>
                      <TableCell className="text-xs whitespace-nowrap">{d.collectionDate}</TableCell>
                      <TableCell className="text-xs">{d.sampleId}</TableCell>
                      <TableCell className="text-xs">{d.sector}</TableCell>
                      <TableCell className="text-xs">{d.site}</TableCell>
                      <TableCell className="text-xs font-medium">{d.organism}</TableCell>
                      <TableCell className="text-center text-xs">{d.results.length}</TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs border-success text-success">{s}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs border-warning text-warning">{i}</Badge></TableCell>
                      <TableCell className="text-center"><Badge variant="outline" className="text-xs border-destructive text-destructive">{r}</Badge></TableCell>
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
    </div>
  );
}
