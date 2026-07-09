import { useState, useMemo, useRef, useEffect } from "react";
import { AuditManagerReportButton } from "@/modules/audits/reports/AuditManagerReportButton";
import ChartActions from "@/components/ChartActions";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine, LabelList,
} from "recharts";
import {
  ArrowLeft, FileText, FileSpreadsheet, Activity, Bug, ShieldAlert,
  TrendingUp, TrendingDown, Award, AlertTriangle, Beaker, Microscope, Clock,
  Sparkles, Bot, Loader2, Download, RefreshCw, CalendarIcon, X,
} from "lucide-react";
import { useAntibiogramDashboard, type AntibiogramDashRecord } from "@/hooks/useAntibiogramDashboard";
import { supabase } from "@/integrations/supabase/client";
import MicrobiologicalReport, { type ReportSummary } from "@/components/MicrobiologicalReport";
import DashboardAnalysisTabs, { AnalysisConfig } from "@/components/DashboardAnalysisTabs";
import InfectologistInsightsPanel from "@/components/InfectologistInsightsPanel";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const CHART_COLORS = [
  "hsl(168,66%,34%)", "hsl(199,89%,48%)", "hsl(38,92%,50%)",
  "hsl(0,72%,51%)", "hsl(142,71%,35%)", "hsl(270,60%,50%)",
  "hsl(330,60%,50%)", "hsl(200,40%,55%)", "hsl(50,80%,50%)",
  "hsl(15,80%,55%)",
];
const SIR_COLORS: Record<string, string> = { S: "hsl(142,71%,35%)", I: "hsl(38,92%,50%)", R: "hsl(0,72%,51%)" };

export default function DashboardAntibiogram() {
  const navigate = useNavigate();
  const { data: allData, loading: dataLoading, refresh } = useAntibiogramDashboard();

  const [filtroSetor, setFiltroSetor] = useState<string[]>([]);
  const [filtroSite, setFiltroSite] = useState<string[]>([]);
  const [filtroOrg, setFiltroOrg] = useState<string[]>([]);
  const [filtroMes, setFiltroMes] = useState<string[]>([]);
  const [filtroAno, setFiltroAno] = useState<string[]>([]);
  const [filtroAntibiotico, setFiltroAntibiotico] = useState<string[]>([]);

  // Chart refs + metas
  const chartRefs = {
    setor: useRef<HTMLDivElement>(null),
    organismos: useRef<HTMLDivElement>(null),
    sirAntibiotico: useRef<HTMLDivElement>(null),
    tendenciaMensal: useRef<HTMLDivElement>(null),
    fenotipos: useRef<HTMLDivElement>(null),
    mdrCarbapenemicos: useRef<HTMLDivElement>(null),
    mdrCefalosporinas: useRef<HTMLDivElement>(null),
    mdrPolimixina: useRef<HTMLDivElement>(null),
    mdrAmicacina: useRef<HTMLDivElement>(null),
    mdrResumo: useRef<HTMLDivElement>(null),
  };
  const [metas, setMetas] = useState<Record<string, number | undefined>>({});
  const setMeta = (k: string, v: number | undefined) => setMetas(prev => ({ ...prev, [k]: v }));

  const setores = useMemo(() => [...new Set(allData.map(d => d.sector))].sort(), [allData]);
  const sites = useMemo(() => [...new Set(allData.map(d => d.site))].sort(), [allData]);
  const organismos = useMemo(() => [...new Set(allData.map(d => d.organism))].sort(), [allData]);

  const filtered = useMemo(() => allData.filter(d =>
    (filtroSetor.length === 0 || filtroSetor.includes(d.sector)) &&
    (filtroSite.length === 0 || filtroSite.includes(d.site)) &&
    (filtroOrg.length === 0 || filtroOrg.includes(d.organism)) &&
    (filtroMes.length === 0 || filtroMes.includes(d.collectionDate?.substring(5, 7) || "")) &&
    (filtroAno.length === 0 || filtroAno.includes(d.collectionDate?.substring(0, 4) || ""))
  ), [allData, filtroSetor, filtroSite, filtroOrg, filtroMes, filtroAno]);

  const anosDisp = useMemo(() => [...new Set(allData.map(d => d.collectionDate?.substring(0, 4)).filter((v): v is string => !!v))].sort(), [allData]);

  const antibioticosDisp = useMemo(() => {
    const s = new Set<string>();
    allData.forEach(d => d.results.forEach(r => r.antibiotic && s.add(r.antibiotic)));
    return [...s].sort();
  }, [allData]);

  const matchAntibiotico = (ab: string) =>
    filtroAntibiotico.length === 0 || filtroAntibiotico.includes(ab);

  const totalExams = filtered.length;
  const allResults = filtered.flatMap(d => d.results).filter(r => matchAntibiotico(r.antibiotic));
  const totalTests = allResults.length;
  const resistantCount = allResults.filter(r => r.sir === "R").length;
  const sensitiveCount = allResults.filter(r => r.sir === "S").length;
  const resistanceRate = totalTests > 0 ? Math.round((resistantCount / totalTests) * 1000) / 10 : 0;
  const sensitivityRate = totalTests > 0 ? Math.round((sensitiveCount / totalTests) * 1000) / 10 : 0;
  const phenotypeCount = filtered.filter(d => d.detectedPhenotypes.length > 0).length;
  const phenotypeRate = totalExams > 0 ? Math.round((phenotypeCount / totalExams) * 1000) / 10 : 0;

  // ═══ MDR (Multirresistente) analysis ═══
  const mdrRecords = useMemo(() => filtered.filter(d => d.mdr), [filtered]);
  const totalMdr = mdrRecords.length;

  // Grupos de antibióticos clinicamente relevantes para MDR
  const ABX_GROUPS: Record<string, RegExp> = {
    Carbapenêmicos: /meropen|imipen|ertapen|doripen/i,
    Cefalosporinas: /cefep|ceftri|ceftaz|cefot|cefur|cefaz|cefox|ceftarol/i,
    "Polimixina B": /polimixina|polymyx|colist/i,
    Amicacina: /amicac|amikac/i,
  };

  // % S por grupo, dentro dos isolados MDR
  const mdrGroupProfile = useMemo(() => {
    return Object.entries(ABX_GROUPS).map(([group, regex]) => {
      let S = 0, I = 0, R = 0;
      mdrRecords.forEach(d => d.results.forEach(r => {
        if (regex.test(r.antibiotic)) {
          if (r.sir === "S") S++;
          else if (r.sir === "I") I++;
          else if (r.sir === "R") R++;
        }
      }));
      const total = S + I + R;
      return {
        name: group,
        Sensivel: total ? Math.round((S / total) * 1000) / 10 : 0,
        Intermediario: total ? Math.round((I / total) * 1000) / 10 : 0,
        Resistente: total ? Math.round((R / total) * 1000) / 10 : 0,
        total,
      };
    });
  }, [mdrRecords]);

  // Para cada grupo, % sensível por microrganismo MDR (top 8)
  const mdrByOrgForGroup = (regex: RegExp) => {
    const map: Record<string, { S: number; total: number }> = {};
    mdrRecords.forEach(d => {
      d.results.forEach(r => {
        if (!regex.test(r.antibiotic)) return;
        if (!map[d.organism]) map[d.organism] = { S: 0, total: 0 };
        map[d.organism].total++;
        if (r.sir === "S") map[d.organism].S++;
      });
    });
    return Object.entries(map)
      .map(([name, v]) => ({
        name,
        Sensibilidade: v.total ? Math.round((v.S / v.total) * 1000) / 10 : 0,
        Resistencia: v.total ? Math.round(((v.total - v.S) / v.total) * 1000) / 10 : 0,
        total: v.total,
      }))
      .filter(o => o.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  };

  const mdrCarbapenemicos = useMemo(() => mdrByOrgForGroup(ABX_GROUPS.Carbapenêmicos), [mdrRecords]);
  const mdrCefalosporinas = useMemo(() => mdrByOrgForGroup(ABX_GROUPS.Cefalosporinas), [mdrRecords]);
  const mdrPolimixina = useMemo(() => mdrByOrgForGroup(ABX_GROUPS["Polimixina B"]), [mdrRecords]);
  const mdrAmicacina = useMemo(() => mdrByOrgForGroup(ABX_GROUPS.Amicacina), [mdrRecords]);


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

  // Summary calculado a partir dos dados filtrados no cliente (para PDF Visual sem IA)
  const filteredSummary = useMemo((): ReportSummary => {
    const dates = filtered.map(d => d.collectionDate).filter(Boolean).sort();
    const periodStart = dates[0] || new Date().toISOString().slice(0, 10);
    const periodEnd = dates[dates.length - 1] || new Date().toISOString().slice(0, 10);
    const parts: string[] = [];
    if (filtroAno.length) parts.push(filtroAno.join(", "));
    if (filtroMes.length) parts.push(`Meses: ${filtroMes.join(", ")}`);
    if (filtroSetor.length) parts.push(filtroSetor.length > 2 ? `${filtroSetor.length} setores` : filtroSetor.join(", "));
    if (filtroOrg.length) parts.push(filtroOrg.length > 2 ? `${filtroOrg.length} organismos` : filtroOrg.join(", "));
    if (filtroSite.length) parts.push(filtroSite.join(", "));
    return {
      periodo: parts.length ? parts.join(" · ") : "Período Completo",
      periodStart,
      periodEnd,
      totalExames: totalExams,
      totalTestes: totalTests,
      taxaResistencia: resistanceRate,
      taxaSensibilidade: sensitivityRate,
      examesComFenotipo: phenotypeCount,
      topOrganismos: orgCounts,
      setores: sectorData,
      perfilSIR: sirByAntibiotic,
      tendenciaMensal: monthlyTrend,
      fenotiposDetectados: phenotypeDist,
    };
  }, [filtered, filtroSetor, filtroSite, filtroOrg, filtroMes, filtroAno,
      totalExams, totalTests, resistanceRate, sensitivityRate, phenotypeCount,
      orgCounts, sectorData, sirByAntibiotic, monthlyTrend, phenotypeDist]);

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
  const [reportSummary, setReportSummary] = useState<ReportSummary | null>(null);
  const [reportHospitalName, setReportHospitalName] = useState("Hospital");

  const dashboardRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const directExportRef = useRef<HTMLDivElement>(null);

  // Estado para exportação direta sem dialog
  const [directExportData, setDirectExportData] = useState<{
    summary: ReportSummary;
    aiContent: string;
    hospitalName: string;
    filename: string;
  } | null>(null);
  const [pdfVisualLoading, setPdfVisualLoading] = useState(false);

  const exportDirectPDF = async (el: HTMLDivElement, filename: string) => {
    const canvas = await html2canvas(el, {
      scale: 2, useCORS: true, backgroundColor: "#ffffff", width: 794, windowWidth: 794, scrollY: 0,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfW = pdf.internal.pageSize.getWidth();
    const pdfH = pdf.internal.pageSize.getHeight();
    const imgH = (canvas.height * pdfW) / canvas.width;
    let heightLeft = imgH;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, pdfW, imgH);
    heightLeft -= pdfH;
    while (heightLeft > 0) {
      position = heightLeft - imgH;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, pdfW, imgH);
      heightLeft -= pdfH;
    }
    pdf.save(filename);
    toast({ title: "PDF exportado", description: "Download iniciado." });
  };

  // Dispara exportação assim que o MicrobiologicalReport oculto for renderizado
  useEffect(() => {
    if (!directExportData) return;
    const el = directExportRef.current;
    if (!el) return;

    const run = async () => {
      await new Promise(r => setTimeout(r, 350)); // aguarda render completo
      try {
        await exportDirectPDF(el, directExportData.filename);
      } catch (e: any) {
        toast({ title: "Erro ao exportar PDF", description: e.message, variant: "destructive" });
      } finally {
        setDirectExportData(null);
        setPdfVisualLoading(false);
        setPdfStructuredLoading(false);
      }
    };
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directExportData]);

  const handleExportExcel = () => toast({ title: "Exportar Excel", description: "Em breve." });

  // PDF Visual — captura MicrobiologicalReport com dados filtrados (sem IA)
  const handleExportPDFVisual = () => {
    setPdfVisualLoading(true);
    setDirectExportData({
      summary: filteredSummary,
      aiContent: "",
      hospitalName: reportHospitalName,
      filename: `relatorio-visual-antibiograma-${new Date().toISOString().slice(0, 10)}.pdf`,
    });
  };

  // PDF Relatório — chama IA com filtros atuais e exporta direto sem dialog
  const [pdfStructuredLoading, setPdfStructuredLoading] = useState(false);
  const handlePDFRelatorio = async () => {
    setPdfStructuredLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Faça login.");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-antibiogram-report`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          period: reportPeriod,
          filters: { setor: filtroSetor, site: filtroSite, organismo: filtroOrg, mes: filtroMes, ano: filtroAno },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao gerar relatório");
      if (data.hospital_name) setReportHospitalName(data.hospital_name);
      setDirectExportData({
        summary: data.summary || filteredSummary,
        aiContent: data.ai_content || "",
        hospitalName: data.hospital_name || reportHospitalName,
        filename: `relatorio-antimicrobiano-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
    } catch (e: any) {
      setPdfStructuredLoading(false);
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const handleExportPDFStructured = () => {
    toast({ title: "Gere o relatório primeiro", description: "Clique em 'Gerar Relatório' para visualizá-lo antes de exportar." });
  };

  // Insights via edge function (período curto, sem salvar como relatório completo)
  const handleAIInsights = async () => {
    setAiInsightsLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Faça login.");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-antibiogram-report`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ period: "ultimo-mes", save: false }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao gerar insights");
      setAiInsights(data.ai_content);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao gerar insights.", variant: "destructive" });
    } finally {
      setAiInsightsLoading(false);
    }
  };

  // Relatório IA completo (período escolhido pelo usuário)
  const handleGenerateReport = async () => {
    setReportLoading(true);
    setReportResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Faça login.");
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-antibiogram-report`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          period: reportPeriod,
          filters: { setor: filtroSetor, site: filtroSite, organismo: filtroOrg, mes: filtroMes, ano: filtroAno },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao gerar relatório");
      setReportResult(data.ai_content);
      if (data.summary) setReportSummary(data.summary);
      if (data.hospital_name) setReportHospitalName(data.hospital_name);
      toast({ title: "Relatório gerado", description: "Salvo no histórico." });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Falha ao gerar relatório.", variant: "destructive" });
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportReportPDF = async () => {
    if (!reportRef.current || !reportResult || !reportSummary) {
      toast({ title: "Relatório não disponível", description: "Gere o relatório primeiro.", variant: "destructive" });
      return;
    }
    setPdfStructuredLoading(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        width: 794,
        windowWidth: 794,
        scrollY: 0,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const imgW = pdfW;
      const imgH = (canvas.height * pdfW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
      heightLeft -= pdfH;
      while (heightLeft > 0) {
        position = heightLeft - imgH;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgW, imgH);
        heightLeft -= pdfH;
      }
      pdf.save(`relatorio-sensibilidade-antimicrobiana-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "PDF exportado", description: "Download iniciado." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Falha ao gerar PDF.", variant: "destructive" });
    } finally {
      setPdfStructuredLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg md:text-2xl font-bold font-heading">Dashboard Exames/Culturas</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Perfil de sensibilidade microbiana</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={dataLoading}
            className="gap-1.5 text-xs"
            title="Recarregar dados do banco"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${dataLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
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
          <Button
            variant="outline" size="sm"
            onClick={handleExportPDFVisual}
            disabled={pdfVisualLoading || pdfStructuredLoading}
            className="gap-1.5 text-xs"
            title="Exporta relatório visual com gráficos dos dados filtrados (sem IA)"
          >
            {pdfVisualLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
            PDF Visual
          </Button>
          <AuditManagerReportButton defaultAuditType="antibiogram" />
          <AuditManagerReportButton defaultMode="monthly_sector_compiled" />
          <Button
            variant="outline" size="sm"
            onClick={handlePDFRelatorio}
            disabled={pdfStructuredLoading || pdfVisualLoading}
            className="gap-1.5 text-xs border-primary/40 hover:bg-primary/10"
            title="Gera relatório completo com IA e exporta PDF com os dados filtrados"
          >
            {pdfStructuredLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5 text-primary" />}
            PDF Relatório
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-1.5 text-xs">
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate("/quality/5w2h", { state: { prefill: {
              what: `Taxa de resistência antimicrobiana: ${resistanceRate}% (Sensibilidade: ${sensitivityRate}%)`,
              why: `Perfil de resistência elevado compromete a eficácia terapêutica. ${phenotypeCount} fenótipos críticos detectados (${phenotypeRate}% dos exames).`,
              where: filtroSetor.length > 0 ? filtroSetor.join(", ") : "Todos os setores",
              when: "Período atual monitorado",
              who: "CCIH / Microbiologia / Farmácia Clínica / Infectologia",
              how: "Revisão do protocolo antimicrobiano, implementação de antibiograma periódico, stewardship antimicrobiano, treinamento das equipes",
              howMuch: "Investimento em cultura microbiológica, treinamentos e consultoria em infectologia conforme orçamento hospitalar",
            }}})}
            className="gap-1.5 text-xs"
          >
            <FileText className="h-3.5 w-3.5" /> Gerar Plano 5W2H
          </Button>
        </div>
      </div>

      <div ref={dashboardRef} className="space-y-4 md:space-y-6 bg-background">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Mês</label>
              <MultiSelectFilter
                label="Mês"
                selected={filtroMes}
                onChange={setFiltroMes}
                options={["01","02","03","04","05","06","07","08","09","10","11","12"].map((m, i) => ({
                  value: m,
                  label: ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"][i],
                }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Ano</label>
              <MultiSelectFilter
                label="Ano"
                selected={filtroAno}
                onChange={setFiltroAno}
                options={anosDisp.map(a => ({ value: a, label: a }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Setor</label>
              <MultiSelectFilter
                label="Setor"
                selected={filtroSetor}
                onChange={setFiltroSetor}
                options={setores.map(s => ({ value: s, label: s }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Material Biológico</label>
              <MultiSelectFilter
                label="Material Biológico"
                selected={filtroSite}
                onChange={setFiltroSite}
                options={sites.map(s => ({ value: s, label: s }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Microrganismo</label>
              <MultiSelectFilter
                label="Microrganismo"
                selected={filtroOrg}
                onChange={setFiltroOrg}
                options={organismos.map(o => ({ value: o, label: o }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Antibiótico</label>
              <MultiSelectFilter
                label="Antibiótico"
                selected={filtroAntibiotico}
                onChange={setFiltroAntibiotico}
                options={antibioticosDisp.map(a => ({ value: a, label: a }))}
              />
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

      {/* OKR Section */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <Award className="h-4 w-4" /> OKRs — Objetivos e Resultados-Chave
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4" style={{ borderLeftColor: resistanceRate <= 25 ? "#22c55e" : resistanceRate <= 35 ? "#eab308" : "#ef4444" }}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {resistanceRate <= 25 ? <Activity className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  <span className="text-sm font-semibold">Resistência ≤ 25%</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${resistanceRate <= 25 ? "bg-green-100 text-green-800 border-green-200" : resistanceRate <= 35 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-red-100 text-red-800 border-red-200"}`}>{resistanceRate <= 25 ? "No Alvo" : resistanceRate <= 35 ? "Em Risco" : "Fora da Meta"}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Manter taxa de resistência antimicrobiana geral abaixo de 25%</p>
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Atual</span><span className="font-bold">{resistanceRate}%</span></div>
              <div className="w-full bg-muted rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${Math.min(resistanceRate, 100)}%`, backgroundColor: resistanceRate <= 25 ? "#22c55e" : resistanceRate <= 35 ? "#eab308" : "#ef4444" }} /></div>
              <p className="text-xs text-muted-foreground mt-1">Meta: ≤ 25%</p>
            </CardContent>
          </Card>
          <Card className="border-l-4" style={{ borderLeftColor: sensitivityRate >= 70 ? "#22c55e" : sensitivityRate >= 55 ? "#eab308" : "#ef4444" }}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {sensitivityRate >= 70 ? <Activity className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  <span className="text-sm font-semibold">Sensibilidade ≥ 70%</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${sensitivityRate >= 70 ? "bg-green-100 text-green-800 border-green-200" : sensitivityRate >= 55 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-red-100 text-red-800 border-red-200"}`}>{sensitivityRate >= 70 ? "No Alvo" : sensitivityRate >= 55 ? "Em Risco" : "Fora da Meta"}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Garantir taxa de sensibilidade aos antimicrobianos acima de 70%</p>
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Atual</span><span className="font-bold">{sensitivityRate}%</span></div>
              <div className="w-full bg-muted rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${Math.min(sensitivityRate, 100)}%`, backgroundColor: sensitivityRate >= 70 ? "#22c55e" : sensitivityRate >= 55 ? "#eab308" : "#ef4444" }} /></div>
              <p className="text-xs text-muted-foreground mt-1">Meta: ≥ 70%</p>
            </CardContent>
          </Card>
          <Card className="border-l-4" style={{ borderLeftColor: phenotypeCount <= 5 ? "#22c55e" : phenotypeCount <= 10 ? "#eab308" : "#ef4444" }}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {phenotypeCount <= 5 ? <Activity className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                  <span className="text-sm font-semibold">Fenótipos Críticos ≤ 5</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${phenotypeCount <= 5 ? "bg-green-100 text-green-800 border-green-200" : phenotypeCount <= 10 ? "bg-yellow-100 text-yellow-800 border-yellow-200" : "bg-red-100 text-red-800 border-red-200"}`}>{phenotypeCount <= 5 ? "No Alvo" : phenotypeCount <= 10 ? "Em Risco" : "Fora da Meta"}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Limitar detecção de fenótipos de resistência crítica (KPC, MRSA, ESBL, VRE)</p>
              <div className="flex justify-between text-xs mb-1"><span className="text-muted-foreground">Detectados</span><span className="font-bold">{phenotypeCount} ({phenotypeRate}%)</span></div>
              <div className="w-full bg-muted rounded-full h-2"><div className="h-2 rounded-full" style={{ width: `${Math.min((phenotypeCount / Math.max(totalExams, 1)) * 100, 100)}%`, backgroundColor: phenotypeCount <= 5 ? "#22c55e" : phenotypeCount <= 10 ? "#eab308" : "#ef4444" }} /></div>
              <p className="text-xs text-muted-foreground mt-1">Meta: ≤ 5 fenótipos críticos</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm md:text-base">Distribuição por Setor</CardTitle>
            <ChartActions chartRef={chartRefs.setor} chartTitle="Distribuição por Setor" metaValue={metas.setor} onMetaChange={(v) => setMeta("setor", v)} metaUnit="exames" />
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-2" ref={chartRefs.setor}>
            {sectorData.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">Sem dados de setor</p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(240, sectorData.length * 36 + 40)}>
                <BarChart data={sectorData} layout="vertical" margin={{ top: 8, right: 32, left: 8, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={Math.min(220, Math.max(110, sectorData.reduce((m, s) => Math.max(m, String(s.name).length), 0) * 7))}
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <Tooltip formatter={(v: number) => [`${v} exames`, "Exames"]} />
                  {metas.setor !== undefined && <ReferenceLine x={metas.setor} stroke="hsl(0,72%,51%)" strokeDasharray="4 4" label={{ value: `Meta: ${metas.setor}`, fontSize: 10, fill: "hsl(0,72%,51%)" }} />}
                  <Bar dataKey="value" name="Exames" fill="hsl(168,66%,34%)" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm md:text-base">Microrganismos Mais Frequentes</CardTitle>
            <ChartActions chartRef={chartRefs.organismos} chartTitle="Microrganismos Mais Frequentes" />
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-2" ref={chartRefs.organismos}>
            <div className="flex flex-col items-center gap-3">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={orgCounts} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={65} outerRadius={120} paddingAngle={2}>
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
        <CardHeader className="p-3 md:p-6 pb-0 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm md:text-base">Perfil de Sensibilidade por Antibiótico</CardTitle>
          <ChartActions chartRef={chartRefs.sirAntibiotico} chartTitle="Perfil de Sensibilidade por Antibiótico" metaValue={metas.sirAntibiotico} onMetaChange={(v) => setMeta("sirAntibiotico", v)} metaUnit="testes" />
        </CardHeader>
        <CardContent className="p-2 md:p-6 pt-2" ref={chartRefs.sirAntibiotico}>
          <ResponsiveContainer width="100%" height={Math.max(320, sirByAntibiotic.length * 28)}>
            <BarChart data={sirByAntibiotic} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={130} interval={0} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {metas.sirAntibiotico !== undefined && <ReferenceLine x={metas.sirAntibiotico} stroke="hsl(0,72%,51%)" strokeDasharray="4 4" label={{ value: `Meta: ${metas.sirAntibiotico}`, fontSize: 10, fill: "hsl(0,72%,51%)" }} />}
              <Bar dataKey="S" name="Sensível" stackId="a" fill={SIR_COLORS.S} />
              <Bar dataKey="I" name="Intermediário" stackId="a" fill={SIR_COLORS.I} />
              <Bar dataKey="R" name="Resistente" stackId="a" fill={SIR_COLORS.R} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ═══ MDR (Multirresistente) — Perfil de Resistência & Sensibilidade ═══ */}
      <Card className="border-destructive/30">
        <CardHeader className="p-3 md:p-6 pb-2">
          <CardTitle className="text-sm md:text-base flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Perfil MDR (Multirresistentes) — {totalMdr} isolado{totalMdr === 1 ? "" : "s"}
          </CardTitle>
          <CardDescription className="text-xs">
            Sensibilidade aos carbapenêmicos, cefalosporinas, polimixina B e amicacina nos microrganismos MDR
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 md:p-6 pt-2 space-y-4">
          {totalMdr === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">Nenhum isolado MDR no período/filtro selecionado.</p>
          ) : (
            <>
              {/* Resumo por classe de antibiótico */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs md:text-sm font-medium">Resumo: % S / I / R por classe (isolados MDR)</p>
                  <ChartActions
                    chartRef={chartRefs.mdrResumo}
                    chartTitle="MDR — Resumo por classe"
                    metaValue={metas.mdrResumo}
                    onMetaChange={(v) => setMeta("mdrResumo", v)}
                    metaUnit="%"
                  />
                </div>
                <div ref={chartRefs.mdrResumo}>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={mdrGroupProfile} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis unit="%" tick={{ fontSize: 10 }} width={40} domain={[0, 100]} />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      {metas.mdrResumo !== undefined && <ReferenceLine y={metas.mdrResumo} stroke="hsl(0,72%,51%)" strokeDasharray="4 4" label={{ value: `Meta: ${metas.mdrResumo}%`, fontSize: 10, fill: "hsl(0,72%,51%)" }} />}
                      <Bar dataKey="Sensivel" stackId="a" name="Sensível" fill={SIR_COLORS.S} />
                      <Bar dataKey="Intermediario" stackId="a" name="Intermediário" fill={SIR_COLORS.I} />
                      <Bar dataKey="Resistente" stackId="a" name="Resistente" fill={SIR_COLORS.R} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grid 4 classes — sensibilidade por microrganismo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {([
                  { key: "mdrCarbapenemicos", title: "Carbapenêmicos — Sensibilidade por microrganismo MDR", data: mdrCarbapenemicos, color: "hsl(199,89%,48%)" },
                  { key: "mdrCefalosporinas", title: "Cefalosporinas — Sensibilidade por microrganismo MDR", data: mdrCefalosporinas, color: "hsl(270,60%,50%)" },
                  { key: "mdrPolimixina", title: "Polimixina B — Sensibilidade por microrganismo MDR", data: mdrPolimixina, color: "hsl(168,66%,34%)" },
                  { key: "mdrAmicacina", title: "Amicacina — Sensibilidade por microrganismo MDR", data: mdrAmicacina, color: "hsl(38,92%,50%)" },
                ] as const).map(({ key, title, data, color }) => (
                  <Card key={key} className="border-muted">
                    <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-xs md:text-sm">{title}</CardTitle>
                      <ChartActions
                        chartRef={chartRefs[key]}
                        chartTitle={title}
                        metaValue={metas[key]}
                        onMetaChange={(v) => setMeta(key, v)}
                        metaUnit="%"
                      />
                    </CardHeader>
                    <CardContent className="p-2 pt-2" ref={chartRefs[key]}>
                      {data.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8 text-xs">Sem testes para esta classe nos isolados MDR.</p>
                      ) : (
                        <ResponsiveContainer width="100%" height={Math.max(220, data.length * 32 + 40)}>
                          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                            <XAxis type="number" domain={[0, 100]} unit="%" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={150} interval={0} />
                            <Tooltip formatter={(v: number, n: string) => [`${v}%`, n]} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            {metas[key] !== undefined && <ReferenceLine x={metas[key]} stroke="hsl(0,72%,51%)" strokeDasharray="4 4" label={{ value: `Meta: ${metas[key]}%`, fontSize: 10, fill: "hsl(0,72%,51%)" }} />}
                            <Bar dataKey="Sensibilidade" name="Sensível" fill={SIR_COLORS.S} radius={[0, 4, 4, 0]} barSize={14} />
                            <Bar dataKey="Resistencia" name="Resistente" fill={SIR_COLORS.R} radius={[0, 4, 4, 0]} barSize={14} />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>



      {/* Sensibilidade por Microrganismo */}
      <SensibilidadePorOrganismo data={filtered} />

      {/* Monthly trend + Phenotypes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm md:text-base">Tendência Mensal de Resistência</CardTitle>
            <ChartActions chartRef={chartRefs.tendenciaMensal} chartTitle="Tendência Mensal de Resistência" metaValue={metas.tendenciaMensal} onMetaChange={(v) => setMeta("tendenciaMensal", v)} metaUnit="%" />
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-2" ref={chartRefs.tendenciaMensal}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={monthlyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis unit="%" tick={{ fontSize: 10 }} width={42} domain={[0, 100]} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Resistência"]} />
                {metas.tendenciaMensal !== undefined && <ReferenceLine y={metas.tendenciaMensal} stroke="hsl(0,72%,51%)" strokeDasharray="4 4" label={{ value: `Meta: ${metas.tendenciaMensal}%`, fontSize: 10, fill: "hsl(0,72%,51%)" }} />}
                <Line type="monotone" dataKey="taxaResistencia" name="Resistência" stroke="hsl(0,72%,51%)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm md:text-base">Fenótipos de Resistência</CardTitle>
            <ChartActions chartRef={chartRefs.fenotipos} chartTitle="Fenótipos de Resistência" metaValue={metas.fenotipos} onMetaChange={(v) => setMeta("fenotipos", v)} metaUnit="casos" />
          </CardHeader>
          <CardContent className="p-2 md:p-6 pt-2" ref={chartRefs.fenotipos}>
            {phenotypeDist.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">Nenhum fenótipo detectado</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={phenotypeDist} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis tick={{ fontSize: 10 }} width={32} allowDecimals={false} />
                  <Tooltip formatter={(v: number) => [`${v} casos`, "Casos"]} />
                  {metas.fenotipos !== undefined && <ReferenceLine y={metas.fenotipos} stroke="hsl(0,72%,51%)" strokeDasharray="4 4" label={{ value: `Meta: ${metas.fenotipos}`, fontSize: 10, fill: "hsl(0,72%,51%)" }} />}
                  <Bar dataKey="value" name="Casos" fill="hsl(0,72%,51%)" radius={[4, 4, 0, 0]} barSize={32} />
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

      </div>
      {/* /dashboardRef */}

      {/* AI Generated Insights Dialog */}
      <Dialog open={!!aiInsights} onOpenChange={(o) => !o && setAiInsights(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              Insights de IA — Exames/Culturas
            </DialogTitle>
            <DialogDescription>Análise inteligente do perfil de sensibilidade microbiana</DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <div className="text-sm whitespace-pre-wrap leading-relaxed p-3 rounded-lg border bg-muted/30">{aiInsights}</div>
          </div>
        </DialogContent>
      </Dialog>

      <TemporalAnalysis filtered={filtered} />

      <Separator />

      <DetailedTable data={filtered} />

      {/* Report Dialog */}
      <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
        <DialogContent className="max-w-[900px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Agente de Relatórios Microbiológicos
            </DialogTitle>
            <DialogDescription>
              Gere relatórios completos de exames/culturas e perfil de sensibilidade com IA
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

            {reportResult && reportSummary && (
              <div className="space-y-3">
                <Separator />
                <div className="overflow-x-auto rounded-lg border bg-white">
                  <MicrobiologicalReport
                    ref={reportRef}
                    summary={reportSummary}
                    aiContent={reportResult}
                    hospitalName={reportHospitalName}
                  />
                </div>
                <Button
                  onClick={handleExportReportPDF}
                  disabled={pdfStructuredLoading}
                  className="w-full gap-2"
                >
                  {pdfStructuredLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Exportar Relatório Completo em PDF
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Container oculto off-screen — renderiza MicrobiologicalReport para exportação direta em PDF */}
      {directExportData && (
        <div style={{
          position: "fixed",
          top: 0,
          left: "-9999px",
          width: "794px",
          zIndex: -1,
          pointerEvents: "none",
        }}>
          <MicrobiologicalReport
            ref={directExportRef}
            summary={directExportData.summary}
            aiContent={directExportData.aiContent}
            hospitalName={directExportData.hospitalName}
          />
        </div>
      )}

      {/* Infectologist AI Insights */}
      {filtered.length > 0 && (
        <InfectologistInsightsPanel
          domain="Resistência Antimicrobiana"
          buildContext={() => [
            `Total de exames/culturas: ${totalExams} | Total de testes SIR: ${totalTests}`,
            `Taxa de resistência: ${resistanceRate}% (meta: ≤25%)`,
            `Taxa de sensibilidade: ${sensitivityRate}% (meta: ≥70%)`,
            `Fenótipos críticos detectados: ${phenotypeCount} (${phenotypeRate}% dos exames) — meta: ≤5`,
            `Microrganismos mais frequentes: ${orgCounts.slice(0,4).map(o => `${o.name} (${o.value})`).join(", ")}`,
            sectorData.length > 0
              ? `Setores com mais isolados: ${sectorData.slice(0,3).map(s => `${s.name} (${s.value})`).join(", ")}`
              : "",
            `Filtros: setor ${filtroSetor.length > 0 ? filtroSetor.join(",") : "todos"}, organismo ${filtroOrg.length > 0 ? filtroOrg.join(",") : "todos"}, ano ${filtroAno.length > 0 ? filtroAno.join(",") : "todos"}`,
          ].filter(Boolean).join("\n")}
          contextKey={`${filtered.length}|${resistanceRate}|${phenotypeCount}`}
        />
      )}

      {/* Analysis Tabs */}
      <DashboardAnalysisTabs config={{
        domain: "Resistência Antimicrobiana",
        effectLabel: "Alta Taxa de Resistência Antimicrobiana",
        ishikawaCategories: [
          { name: "Método", items: ["Uso empírico sem antibiograma", "Esquema antibiótico prolongado", "Dose/duração inadequada", "Sem protocolo de stewardship"] },
          { name: "Máquina", items: ["Laboratório sem capacidade para CIM", "Ausência de PCR de resistência", "Demora no resultado microbiológico", "Equipamentos desatualizados"] },
          { name: "Material", items: ["Antibióticos de amplo espectro sem restrição", "Falta de meios de cultura seletivos", "Acesso limitado a antibióticos de reserva", "Insumos laboratoriais insuficientes"] },
          { name: "Mão de Obra", items: ["Prescrição sem consulta à infectologia", "Falta de farmacêutico clínico", "Subestimação da gravidade da resistência", "Alta rotatividade médica"] },
          { name: "Medida", items: ["Sem monitoramento contínuo de CIM", "Antibiograma cumulativo não divulgado", "Ausência de indicadores de stewardship", "Feedback tardio para prescritores"] },
          { name: "Meio Ambiente", items: ["Pressão seletiva por antibióticos", "Transmissão cruzada entre setores", "Estrutura de isolamento inadequada", "Ambiente propício à disseminação clonal"] },
        ],
        paretoData: [
          { name: "Uso empírico sem guia", value: 38 },
          { name: "Espectro amplo desnecessário", value: 29 },
          { name: "Duração excessiva", value: 22 },
          { name: "Sem deescalada", value: 18 },
          { name: "Transmissão cruzada", value: 14 },
          { name: "Sem isolamento", value: 10 },
          { name: "Outros", value: 7 },
        ],
        swotData: {
          strengths: ["Laboratório de microbiologia ativo", "Antibiogramas registrados sistematicamente", "Equipe médica com acesso a dados", "Programa CCIH estruturado"],
          weaknesses: ["Ausência de farmacêutico clínico dedicado", "Stewardship antimicrobiano informal", "Demora na liberação de resultados", "Prescrição empírica frequente"],
          opportunities: ["Implementação de programa formal de stewardship", "Treinamentos em infectologia para prescritores", "Divulgação de antibiograma cumulativo", "Parceria com laboratório de referência"],
          threats: ["Disseminação de cepas multirresistentes (KPC, MRSA)", "Pressão por tratamento imediato na emergência", "Resistência ao protocolo por prescritores sêniors", "Limitações orçamentárias"],
        },
        risks: [
          { id: "r1", description: "Surto por cepa KPC ou MRSA multirresistente", probability: 4, impact: 5 },
          { id: "r2", description: "Falha terapêutica por resistência não detectada", probability: 3, impact: 5 },
          { id: "r3", description: "Disseminação clonal entre setores de UTI", probability: 3, impact: 4 },
          { id: "r4", description: "Auditoria desfavorável por ausência de stewardship", probability: 2, impact: 4 },
          { id: "r5", description: "Alta mortalidade por infecção resistente sem opções terapêuticas", probability: 3, impact: 5 },
        ],
        pdcaData: {
          plan: ["Elaborar programa formal de stewardship antimicrobiano", "Definir lista de antibióticos restritos com critérios", "Criar protocolo de deescalada baseado em antibiograma", "Estabelecer metas mensais de resistência por setor"],
          do: ["Implementar auditoria semanal de prescrições", "Divulgar antibiograma cumulativo mensal", "Realizar rounds de infectologia em UTIs", "Implantar isolamento de contato para cepas MDR"],
          check: ["Monitorar taxa de resistência mensalmente", "Avaliar tempo de adequação do antibiótico", "Rastrear fenótipos críticos (KPC, MRSA, ESBL, VRE)", "Medir impacto do stewardship na redução de consumo"],
          act: ["Restringir antibióticos com resistência > 30%", "Escalar isolamento em setores com surto", "Atualizar protocolo empírico baseado nos dados", "Capacitar prescritores sobre resistência crítica"],
        },
        stats: {
          value: `${resistanceRate}%`,
          label: "Taxa de Resistência",
          issues: phenotypeCount,
          topIssue: "Fenótipos Críticos",
          sector: sectorData.length > 0 ? sectorData[0].name : "—",
        },
      } as AnalysisConfig} />
    </div>
  );
}

// ═══════════════════════════════════════════════════
// Sensibilidade por Microrganismo
// ═══════════════════════════════════════════════════
function SensibilidadePorOrganismo({ data }: { data: AntibiogramDashRecord[] }) {
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [selectedAntibiotics, setSelectedAntibiotics] = useState<string[]>([]);
  const [selectedSIR, setSelectedSIR] = useState<string[]>([]);
  const [selectedSetores, setSelectedSetores] = useState<string[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedAnos, setSelectedAnos] = useState<string[]>([]);
  const [selectedMeses, setSelectedMeses] = useState<string[]>([]);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const allOrganisms = useMemo(() => [...new Set(data.map(d => d.organism))].sort(), [data]);
  const allAntibiotics = useMemo(() => [...new Set(data.flatMap(d => d.results.map(r => r.antibiotic)))].filter(Boolean).sort(), [data]);
  const allSetores = useMemo(() => [...new Set(data.map(d => d.sector))].filter(Boolean).sort(), [data]);
  const allSites = useMemo(() => [...new Set(data.map(d => d.site))].filter(Boolean).sort(), [data]);
  const allAnos = useMemo(() => [...new Set(data.map(d => d.collectionDate?.substring(0, 4)).filter(Boolean))].sort().reverse() as string[], [data]);
  const mesOptions = [
    { value: "01", label: "Janeiro" }, { value: "02", label: "Fevereiro" },
    { value: "03", label: "Março" },   { value: "04", label: "Abril" },
    { value: "05", label: "Maio" },    { value: "06", label: "Junho" },
    { value: "07", label: "Julho" },   { value: "08", label: "Agosto" },
    { value: "09", label: "Setembro" },{ value: "10", label: "Outubro" },
    { value: "11", label: "Novembro" },{ value: "12", label: "Dezembro" },
  ];

  const sirOptions = [
    { value: "S", label: "Sensível (S)" },
    { value: "I", label: "Intermediário (I)" },
    { value: "R", label: "Resistente (R)" },
  ];

  // Base filtrada por todos os filtros de contexto
  const dataFiltered = useMemo(() =>
    data.filter(d => {
      if (selectedSetores.length > 0 && !selectedSetores.includes(d.sector)) return false;
      if (selectedSites.length > 0 && !selectedSites.includes(d.site)) return false;
      if (selectedAnos.length > 0 && !selectedAnos.includes(d.collectionDate?.substring(0, 4) ?? "")) return false;
      if (selectedMeses.length > 0 && !selectedMeses.includes(d.collectionDate?.substring(5, 7) ?? "")) return false;
      if (dateFrom || dateTo) {
        const date = d.collectionDate ? parseISO(d.collectionDate) : null;
        if (!date) return false;
        if (dateFrom && date < dateFrom) return false;
        if (dateTo) {
          const end = new Date(dateTo); end.setHours(23, 59, 59, 999);
          if (date > end) return false;
        }
      }
      return true;
    }),
  [data, selectedSetores, selectedSites, selectedAnos, selectedMeses, dateFrom, dateTo]);

  // Gráfico A: Isolados por microrganismo (com breakdown S/I/R)
  const orgChartData = useMemo(() => {
    const orgsToShow = selectedOrgs.length > 0 ? selectedOrgs : [...new Set(dataFiltered.map(d => d.organism))].sort();
    return orgsToShow.map(org => {
      const orgRec = dataFiltered.filter(d => d.organism === org);
      const results = orgRec.flatMap(d =>
        selectedAntibiotics.length > 0
          ? d.results.filter(r => selectedAntibiotics.includes(r.antibiotic))
          : d.results
      );
      const S = results.filter(r => r.sir === "S" && (selectedSIR.length === 0 || selectedSIR.includes("S"))).length;
      const I = results.filter(r => r.sir === "I" && (selectedSIR.length === 0 || selectedSIR.includes("I"))).length;
      const R = results.filter(r => r.sir === "R" && (selectedSIR.length === 0 || selectedSIR.includes("R"))).length;
      return { name: org, isolados: orgRec.length, S, I, R, total: S + I + R };
    }).filter(d => d.isolados > 0).sort((a, b) => b.isolados - a.isolados).slice(0, 15);
  }, [dataFiltered, selectedOrgs, selectedAntibiotics, selectedSIR]);

  // Gráfico B: Sensibilidade por antimicrobiano (filtrado por organismos e setor)
  const antibioticChartData = useMemo(() => {
    const base = selectedOrgs.length > 0
      ? dataFiltered.filter(d => selectedOrgs.includes(d.organism))
      : dataFiltered;

    const map: Record<string, { S: number; I: number; R: number }> = {};
    base.forEach(d => {
      const results = selectedAntibiotics.length > 0
        ? d.results.filter(r => selectedAntibiotics.includes(r.antibiotic))
        : d.results;
      results.forEach(r => {
        if (r.sir !== "S" && r.sir !== "I" && r.sir !== "R") return;
        if (selectedSIR.length > 0 && !selectedSIR.includes(r.sir)) return;
        if (!map[r.antibiotic]) map[r.antibiotic] = { S: 0, I: 0, R: 0 };
        map[r.antibiotic][r.sir]++;
      });
    });

    return Object.entries(map)
      .map(([name, v]) => ({ name, ...v, total: v.S + v.I + v.R }))
      .filter(d => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20);
  }, [dataFiltered, selectedOrgs, selectedAntibiotics, selectedSIR]);

  // KPIs
  const totalIsolados = useMemo(() => {
    const orgs = selectedOrgs.length > 0 ? selectedOrgs : allOrganisms;
    return dataFiltered.filter(d => orgs.includes(d.organism)).length;
  }, [dataFiltered, selectedOrgs, allOrganisms]);

  const totalTestes = antibioticChartData.reduce((sum, d) => sum + d.total, 0);
  const totalS = antibioticChartData.reduce((sum, d) => sum + d.S, 0);
  const totalR = antibioticChartData.reduce((sum, d) => sum + d.R, 0);

  const showS = selectedSIR.length === 0 || selectedSIR.includes("S");
  const showI = selectedSIR.length === 0 || selectedSIR.includes("I");
  const showR = selectedSIR.length === 0 || selectedSIR.includes("R");

  const yWidthOrg = Math.min(220, Math.max(100, orgChartData.reduce((m, d) => Math.max(m, d.name.length), 0) * 7));
  const orgChartH = Math.max(260, orgChartData.length * 55 + 60);
  const yWidthAntibiotic = Math.min(180, Math.max(120, antibioticChartData.reduce((m, d) => Math.max(m, d.name.length), 0) * 7));
  const antibioticChartH = Math.max(260, antibioticChartData.length * 40 + 60);

  return (
    <Card>
      <CardHeader className="p-3 md:p-6 pb-0">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-sm md:text-base flex items-center gap-2">
              <Microscope className="h-4 w-4 text-primary" />
              Sensibilidade por Microrganismo
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Casos absolutos de S / I / R por microrganismo e perfil de sensibilidade dos antimicrobianos
            </CardDescription>
          </div>
          {(selectedAnos.length > 0 || selectedMeses.length > 0 || selectedSetores.length > 0 || selectedSites.length > 0 || selectedOrgs.length > 0 || selectedAntibiotics.length > 0 || selectedSIR.length > 0 || dateFrom || dateTo) && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 shrink-0"
              onClick={() => {
                setSelectedAnos([]);
                setSelectedMeses([]);
                setSelectedSetores([]);
                setSelectedSites([]);
                setSelectedOrgs([]);
                setSelectedAntibiotics([]);
                setSelectedSIR([]);
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
            >
              <X className="h-3.5 w-3.5" /> Limpar todos os filtros
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 md:p-6 pt-4 space-y-6">

        {/* Filtro de período */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Data início</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 w-[150px] justify-start text-left font-normal text-xs", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Data fim</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-9 w-[150px] justify-start text-left font-normal text-xs", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy", { locale: ptBR }) : "Selecionar"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus locale={ptBR} className="p-3 pointer-events-auto" disabled={dateFrom ? { before: dateFrom } : undefined} />
              </PopoverContent>
            </Popover>
          </div>
          {(dateFrom || dateTo) && (
            <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground gap-1" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
              <X className="h-3.5 w-3.5" /> Limpar período
            </Button>
          )}
        </div>

        {/* Filtros multi-select */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Ano</label>
            <MultiSelectFilter
              label="Ano"
              selected={selectedAnos}
              onChange={setSelectedAnos}
              options={allAnos.map(a => ({ value: a, label: a }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Mês</label>
            <MultiSelectFilter
              label="Mês"
              selected={selectedMeses}
              onChange={setSelectedMeses}
              options={mesOptions}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Setor</label>
            <MultiSelectFilter
              label="Setor"
              selected={selectedSetores}
              onChange={setSelectedSetores}
              options={allSetores.map(s => ({ value: s, label: s }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Material Biológico</label>
            <MultiSelectFilter
              label="Material Biológico"
              selected={selectedSites}
              onChange={setSelectedSites}
              options={allSites.map(s => ({ value: s, label: s }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Microrganismo</label>
            <MultiSelectFilter
              label="Microrganismo"
              selected={selectedOrgs}
              onChange={setSelectedOrgs}
              options={allOrganisms.map(o => ({ value: o, label: o }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Antimicrobiano</label>
            <MultiSelectFilter
              label="Antimicrobiano"
              selected={selectedAntibiotics}
              onChange={setSelectedAntibiotics}
              options={allAntibiotics.map(a => ({ value: a, label: a }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] md:text-xs font-medium text-muted-foreground">Perfil SIR</label>
            <MultiSelectFilter
              label="Perfil SIR"
              selected={selectedSIR}
              onChange={setSelectedSIR}
              options={sirOptions}
            />
          </div>
        </div>

        {/* Mini KPIs */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-muted/30 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Total Isolados</p>
            <p className="text-xl md:text-2xl font-bold">{totalIsolados}</p>
          </div>
          <div className="rounded-lg border bg-success/10 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Testes Sensíveis (S)</p>
            <p className="text-xl md:text-2xl font-bold text-success">{totalS}</p>
            <p className="text-[10px] text-muted-foreground">
              {totalTestes > 0 ? Math.round((totalS / totalTestes) * 100) : 0}% dos testes
            </p>
          </div>
          <div className="rounded-lg border bg-destructive/10 p-3 text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5">Testes Resistentes (R)</p>
            <p className="text-xl md:text-2xl font-bold text-destructive">{totalR}</p>
            <p className="text-[10px] text-muted-foreground">
              {totalTestes > 0 ? Math.round((totalR / totalTestes) * 100) : 0}% dos testes
            </p>
          </div>
        </div>

        {data.length === 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">Sem dados disponíveis</p>
        )}

        {/* ── Gráfico A: Isolados por Microrganismo ── */}
        {orgChartData.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs md:text-sm font-semibold">Isolados por Microrganismo</h3>
              {selectedOrgs.length > 0 && (
                <Badge variant="secondary" className="text-[10px]">
                  {selectedOrgs.length} selecionado{selectedOrgs.length > 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              {selectedAntibiotics.length > 0
                ? `Resultados S/I/R para ${selectedAntibiotics.length} antimicrobiano${selectedAntibiotics.length > 1 ? "s" : ""} selecionado${selectedAntibiotics.length > 1 ? "s" : ""}`
                : "Todos os antimicrobianos — cada barra mostra o número absoluto de testes"}
            </p>
            <ResponsiveContainer width="100%" height={orgChartH}>
              <BarChart data={orgChartData} layout="vertical" margin={{ top: 8, right: 48, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={yWidthOrg} tick={{ fontSize: 10 }} interval={0} />
                <Tooltip
                  formatter={(v: number, n: string) => {
                    const labels: Record<string, string> = { S: "Sensível", I: "Intermediário", R: "Resistente", isolados: "Isolados" };
                    return [`${v} casos`, labels[n] || n];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v) => ({ S: "Sensível (S)", I: "Intermediário (I)", R: "Resistente (R)" }[v] || v)}
                />
                {showS && (
                  <Bar dataKey="S" name="S" fill={SIR_COLORS.S} barSize={13} radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="S" position="right" style={{ fontSize: 9, fill: SIR_COLORS.S, fontWeight: 600 }} formatter={(v: number) => (v > 0 ? v : "")} />
                  </Bar>
                )}
                {showI && (
                  <Bar dataKey="I" name="I" fill={SIR_COLORS.I} barSize={13} radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="I" position="right" style={{ fontSize: 9, fill: SIR_COLORS.I, fontWeight: 600 }} formatter={(v: number) => (v > 0 ? v : "")} />
                  </Bar>
                )}
                {showR && (
                  <Bar dataKey="R" name="R" fill={SIR_COLORS.R} barSize={13} radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="R" position="right" style={{ fontSize: 9, fill: SIR_COLORS.R, fontWeight: 600 }} formatter={(v: number) => (v > 0 ? v : "")} />
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <Separator />

        {/* ── Gráfico B: Sensibilidade por Antimicrobiano ── */}
        {antibioticChartData.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs md:text-sm font-semibold">
              Perfil de Sensibilidade por Antimicrobiano
            </h3>
            <p className="text-[10px] text-muted-foreground">
              {selectedOrgs.length > 0
                ? `Dados para: ${selectedOrgs.length === 1 ? selectedOrgs[0] : `${selectedOrgs.length} microrganismos selecionados`} — número absoluto de testes S / I / R`
                : "Todos os microrganismos — selecione um ou mais acima para filtrar por organismo"}
            </p>
            <ResponsiveContainer width="100%" height={antibioticChartH}>
              <BarChart data={antibioticChartData} layout="vertical" margin={{ top: 8, right: 48, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis dataKey="name" type="category" width={yWidthAntibiotic} tick={{ fontSize: 10 }} interval={0} />
                <Tooltip
                  formatter={(v: number, n: string) => {
                    const labels: Record<string, string> = { S: "Sensível", I: "Intermediário", R: "Resistente" };
                    return [`${v} casos`, labels[n] || n];
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(v) => ({ S: "Sensível (S)", I: "Intermediário (I)", R: "Resistente (R)" }[v] || v)}
                />
                {showS && (
                  <Bar dataKey="S" name="S" fill={SIR_COLORS.S} barSize={13} radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="S" position="right" style={{ fontSize: 9, fill: SIR_COLORS.S, fontWeight: 600 }} formatter={(v: number) => (v > 0 ? v : "")} />
                  </Bar>
                )}
                {showI && (
                  <Bar dataKey="I" name="I" fill={SIR_COLORS.I} barSize={13} radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="I" position="right" style={{ fontSize: 9, fill: SIR_COLORS.I, fontWeight: 600 }} formatter={(v: number) => (v > 0 ? v : "")} />
                  </Bar>
                )}
                {showR && (
                  <Bar dataKey="R" name="R" fill={SIR_COLORS.R} barSize={13} radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="R" position="right" style={{ fontSize: 9, fill: SIR_COLORS.R, fontWeight: 600 }} formatter={(v: number) => (v > 0 ? v : "")} />
                  </Bar>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* ── Tabela Resumo ── */}
        {antibioticChartData.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow>
                  <TableHead>Antimicrobiano</TableHead>
                  {showS && <TableHead className="text-center" style={{ color: SIR_COLORS.S }}>Sensível (S)</TableHead>}
                  {showI && <TableHead className="text-center" style={{ color: SIR_COLORS.I }}>Intermediário (I)</TableHead>}
                  {showR && <TableHead className="text-center" style={{ color: SIR_COLORS.R }}>Resistente (R)</TableHead>}
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">% Sensível</TableHead>
                  <TableHead className="text-center">% Resistente</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {antibioticChartData.map(d => {
                  const pctS = d.total > 0 ? Math.round((d.S / d.total) * 100) : 0;
                  const pctR = d.total > 0 ? Math.round((d.R / d.total) * 100) : 0;
                  return (
                    <TableRow key={d.name}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      {showS && (
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] border-success text-success font-bold">{d.S}</Badge>
                        </TableCell>
                      )}
                      {showI && (
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] border-warning text-warning font-bold">{d.I}</Badge>
                        </TableCell>
                      )}
                      {showR && (
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-[10px] border-destructive text-destructive font-bold">{d.R}</Badge>
                        </TableCell>
                      )}
                      <TableCell className="text-center font-bold">{d.total}</TableCell>
                      <TableCell className="text-center">
                        <span className={pctS >= 70 ? "text-success font-semibold" : pctS >= 50 ? "text-warning font-semibold" : "text-destructive font-semibold"}>
                          {pctS}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={pctR <= 25 ? "text-success font-semibold" : pctR <= 40 ? "text-warning font-semibold" : "text-destructive font-semibold"}>
                          {pctR}%
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {orgChartData.length === 0 && data.length > 0 && (
          <p className="text-center text-muted-foreground py-8 text-sm">Nenhum dado para os filtros selecionados</p>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════
// Temporal Analysis
// ═══════════════════════════════════════════════════
function TemporalAnalysis({ filtered }: { filtered: AntibiogramDashRecord[] }) {
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
function DetailedTable({ data }: { data: AntibiogramDashRecord[] }) {
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
        const max = Object.entries(dominant).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];
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
