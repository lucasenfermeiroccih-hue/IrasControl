import { useState, useMemo, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Stethoscope, Phone, AlertTriangle, Activity, Award, Brain,
  TrendingDown, TrendingUp, Sparkles, FileText, Inbox, Loader2, Download,
  MessageCircle, CalendarDays,
} from "lucide-react";
import { useISCDashboard } from "@/hooks/useISCDashboard";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";
import { generateSmartInsights, generateStructuredReport, type SmartInsight } from "@/lib/isc-report-engine";

const mesesNomes = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const mesesFiltro = [
  "Todos", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];


const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
];

const PIE_COLORS = ["#22c55e", "#eab308", "#ef4444"];

const statusColor = (rate: number) =>
  rate <= 2 ? "text-green-600 bg-green-50 border-green-200"
    : rate <= 5 ? "text-yellow-600 bg-yellow-50 border-yellow-200"
    : "text-red-600 bg-red-50 border-red-200";

const insightIconMap: Record<string, React.ReactNode> = {
  award: <Award className="h-5 w-5" />,
  alert: <AlertTriangle className="h-5 w-5" />,
  activity: <Activity className="h-5 w-5" />,
  phone: <Phone className="h-5 w-5" />,
  stethoscope: <Stethoscope className="h-5 w-5" />,
  "trending-down": <TrendingDown className="h-5 w-5" />,
  "trending-up": <TrendingUp className="h-5 w-5" />,
};

const statusIcon = (rate: number) =>
  rate <= 2 ? <TrendingDown className="h-4 w-4" /> : rate <= 5 ? <AlertTriangle className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />;

export default function DashboardISC() {
  const { hospitalId } = useHospitalContext();
  const { records: allRecords, loading: dataLoading } = useISCDashboard();
  const [mesFiltro, setMesFiltro] = useState("Todos");
  const [anoFiltro, setAnoFiltro] = useState("Todos");
  const [profFiltro, setProfFiltro] = useState("Todos");
  const [setorFiltro, setSetorFiltro] = useState("Todos");
  // Filtro de período (mês inicial/final). Formato YYYY-MM (compatível com <input type="month">)
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiReport, setAiReport] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const anos = useMemo(() => [...new Set(allRecords.map((r) => String(r.ano)))].sort(), [allRecords]);
  const profissionais = useMemo(() => [...new Set(allRecords.map((r) => r.profissional))].sort(), [allRecords]);
  const clinicas = useMemo(() => [...new Set(allRecords.map((r) => r.clinica))].sort(), [allRecords]);

  // Converte ano+mês em valor numérico comparável (YYYYMM)
  const toYearMonth = (ano: number, mes: number) => ano * 100 + mes;
  const parseYM = (s: string) => {
    if (!s) return null;
    const [y, m] = s.split("-").map(Number);
    if (!y || !m) return null;
    return y * 100 + m;
  };

  const filtered = useMemo(() => {
    const ymIni = parseYM(periodoInicio);
    const ymFim = parseYM(periodoFim);
    return allRecords.filter((r) => {
      if (anoFiltro !== "Todos" && String(r.ano) !== anoFiltro) return false;
      if (mesFiltro !== "Todos" && r.mes !== mesesFiltro.indexOf(mesFiltro)) return false;
      if (profFiltro !== "Todos" && r.profissional !== profFiltro) return false;
      if (setorFiltro !== "Todos" && r.clinica !== setorFiltro) return false;
      const ym = toYearMonth(r.ano, r.mes);
      if (ymIni !== null && ym < ymIni) return false;
      if (ymFim !== null && ym > ymFim) return false;
      return true;
    });
  }, [allRecords, mesFiltro, anoFiltro, profFiltro, setorFiltro, periodoInicio, periodoFim]);

  const hasData = allRecords.length > 0;

  const kpis = useMemo(() => {
    const totalCirurgias = filtered.reduce((s, r) => s + r.totalCirurgias, 0);
    const totalContatos = filtered.reduce((s, r) => s + r.contatosAtendidos, 0);
    const totalRetAmb = filtered.reduce((s, r) => s + (r.retornoAmbulatorio || 0), 0);
    const totalRetWpp = filtered.reduce((s, r) => s + (r.retornoWhatsapp || 0), 0);
    const totalReinternacoes = filtered.reduce((s, r) => s + r.reinternacoes, 0);
    const totalISC = filtered.reduce((s, r) => s + r.iscConfirmada, 0);
    const totalRespostas = totalContatos + totalRetAmb + totalRetWpp;
    const taxaResposta = totalCirurgias > 0 ? (totalRespostas / totalCirurgias) * 100 : 0;
    const taxaISC = totalCirurgias > 0 ? (totalISC / totalCirurgias) * 100 : 0;
    return { totalCirurgias, totalContatos, totalRetAmb, totalRetWpp, totalRespostas, taxaResposta, totalReinternacoes, totalISC, taxaISC };
  }, [filtered]);

  const barClinicaData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => { map[r.clinica] = (map[r.clinica] || 0) + r.totalCirurgias; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const lineData = useMemo(() => {
    const map: Record<string, { cirurgias: number; isc: number }> = {};
    filtered.forEach((r) => {
      const key = `${r.mes}/${r.ano}`;
      if (!map[key]) map[key] = { cirurgias: 0, isc: 0 };
      map[key].cirurgias += r.totalCirurgias;
      map[key].isc += r.iscConfirmada;
    });
    return Object.entries(map)
      .sort(([a], [b]) => {
        const [mA, yA] = a.split("/").map(Number);
        const [mB, yB] = b.split("/").map(Number);
        return yA * 100 + mA - (yB * 100 + mB);
      })
      .map(([key, v]) => ({
        name: key,
        taxa: v.cirurgias > 0 ? Number(((v.isc / v.cirurgias) * 100).toFixed(1)) : 0,
      }));
  }, [filtered]);

  const pieData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      if (r.iscConfirmada > 0 && r.sitio) map[r.sitio] = (map[r.sitio] || 0) + r.iscConfirmada;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  const barReintData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => { map[r.clinica] = (map[r.clinica] || 0) + r.reinternacoes; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Helper para chave mês/ano ordenada
  const sortMesAno = ([a]: [string, any], [b]: [string, any]) => {
    const [mA, yA] = a.split("/").map(Number);
    const [mB, yB] = b.split("/").map(Number);
    return yA * 100 + mA - (yB * 100 + mB);
  };

  // Contatos absolutos por mês (telefônicos, ambulatório, whatsapp)
  const contatosMensais = useMemo(() => {
    const map: Record<string, { telefonico: number; ambulatorio: number; whatsapp: number }> = {};
    filtered.forEach((r) => {
      const key = `${r.mes}/${r.ano}`;
      if (!map[key]) map[key] = { telefonico: 0, ambulatorio: 0, whatsapp: 0 };
      map[key].telefonico += r.contatosAtendidos;
      map[key].ambulatorio += r.retornoAmbulatorio || 0;
      map[key].whatsapp += r.retornoWhatsapp || 0;
    });
    return Object.entries(map).sort(sortMesAno).map(([name, v]) => ({ name, ...v }));
  }, [filtered]);

  // Reinternações por mês
  const reinternacoesMensais = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      const key = `${r.mes}/${r.ano}`;
      map[key] = (map[key] || 0) + r.reinternacoes;
    });
    return Object.entries(map).sort(sortMesAno).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ISC absolutas por mês
  const iscMensais = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      const key = `${r.mes}/${r.ano}`;
      map[key] = (map[key] || 0) + r.iscConfirmada;
    });
    return Object.entries(map).sort(sortMesAno).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Sítio cirúrgico (distribuição por sítio entre as cirurgias com sítio informado)
  const sitioData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      if (r.sitio) map[r.sitio] = (map[r.sitio] || 0) + r.totalCirurgias;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Cirurgias por especialidade (clinica) por mês — empilhado
  const cirurgiasEspecialidadeMes = useMemo(() => {
    const especialidades = [...new Set(filtered.map(r => r.clinica))];
    const mapMes: Record<string, Record<string, number>> = {};
    filtered.forEach((r) => {
      const key = `${r.mes}/${r.ano}`;
      if (!mapMes[key]) mapMes[key] = {};
      mapMes[key][r.clinica] = (mapMes[key][r.clinica] || 0) + r.totalCirurgias;
    });
    const rows = Object.entries(mapMes)
      .sort(sortMesAno)
      .map(([name, vals]) => {
        const row: Record<string, any> = { name };
        especialidades.forEach(e => { row[e] = vals[e] || 0; });
        return row;
      });
    return { rows, especialidades };
  }, [filtered]);

  const clinicaStats = useMemo(() => {
    const map: Record<string, { cirurgias: number; isc: number; reinternacoes: number; contatos: number }> = {};
    filtered.forEach((r) => {
      if (!map[r.clinica]) map[r.clinica] = { cirurgias: 0, isc: 0, reinternacoes: 0, contatos: 0 };
      map[r.clinica].cirurgias += r.totalCirurgias;
      map[r.clinica].isc += r.iscConfirmada;
      map[r.clinica].reinternacoes += r.reinternacoes;
      map[r.clinica].contatos += r.contatosAtendidos;
    });
    return Object.entries(map).map(([name, v]) => ({
      name,
      ...v,
      taxaISC: v.cirurgias > 0 ? (v.isc / v.cirurgias) * 100 : 0,
      taxaResposta: v.cirurgias > 0 ? (v.contatos / v.cirurgias) * 100 : 0,
    }));
  }, [filtered]);

  const reportInput = useMemo(() => ({
    ...kpis,
    clinicas: clinicaStats,
    tendencia: lineData.map((d) => ({ periodo: d.name, taxa: d.taxa })),
  }), [kpis, clinicaStats, lineData]);

  const insights = useMemo(() => {
    if (!hasData || filtered.length === 0) return [] as SmartInsight[];
    return generateSmartInsights(reportInput);
  }, [hasData, filtered, reportInput]);

  const generateReport = () => {
    if (!hasData) return;
    setAiReport(generateStructuredReport({ ...reportInput, promptExtra: aiPrompt || undefined }));
  };

  const insightBg = (type: string) =>
    type === "success" ? "bg-green-50 border-green-200 text-green-800"
      : type === "warning" ? "bg-yellow-50 border-yellow-200 text-yellow-800"
      : "bg-red-50 border-red-200 text-red-800";

  const EmptyState = () => (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <Inbox className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="text-lg font-semibold text-foreground">Nenhum dado encontrado</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {allRecords.length === 0
            ? "Ainda não há registros salvos. Preencha o formulário em Indicadores ISC para começar a visualizar os dados aqui."
            : "Nenhum registro corresponde aos filtros selecionados. Tente ajustar os filtros."}
        </p>
      </CardContent>
    </Card>
  );

  const exportDashboardPdf = async () => {
    if (!dashboardRef.current) return;
    setExportingPdf(true);
    toast.info("Gerando PDF do dashboard...");
    try {
      // Aguarda um tick para o badge de "exportando" não aparecer no canvas
      await new Promise((r) => setTimeout(r, 100));
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        windowWidth: dashboardRef.current.scrollWidth,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const usableW = pageW - margin * 2;
      const ratio = canvas.height / canvas.width;
      const fullH = usableW * ratio;

      // Cabeçalho
      pdf.setFontSize(14);
      pdf.text("Dashboard ISC — Infecção de Sítio Cirúrgico", margin, margin + 5);
      pdf.setFontSize(9);
      const periodoLabel = periodoInicio || periodoFim
        ? `Período: ${periodoInicio || "início"} até ${periodoFim || "atual"}`
        : "Período: todos";
      pdf.text(`${periodoLabel}  •  Gerado em ${new Date().toLocaleDateString("pt-BR")}`, margin, margin + 11);

      const headerOffset = margin + 16;
      const availableH = pageH - headerOffset - margin;

      if (fullH <= availableH) {
        pdf.addImage(imgData, "PNG", margin, headerOffset, usableW, fullH);
      } else {
        // Quebra em múltiplas páginas usando recortes do canvas
        const pxPerMm = canvas.width / usableW;
        const sliceHpx = availableH * pxPerMm;
        let yPx = 0;
        let firstPage = true;
        while (yPx < canvas.height) {
          const hPx = Math.min(sliceHpx, canvas.height - yPx);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = hPx;
          const ctx = sliceCanvas.getContext("2d");
          if (ctx) {
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(canvas, 0, yPx, canvas.width, hPx, 0, 0, canvas.width, hPx);
          }
          const sliceImg = sliceCanvas.toDataURL("image/png");
          if (!firstPage) {
            pdf.addPage();
            pdf.setFontSize(9);
            pdf.text(`Dashboard ISC — continuação`, margin, margin + 5);
          }
          pdf.addImage(sliceImg, "PNG", margin, firstPage ? headerOffset : margin + 8, usableW, hPx / pxPerMm);
          yPx += hPx;
          firstPage = false;
        }
      }

      pdf.save(`dashboard-isc-${new Date().toISOString().split("T")[0]}.pdf`);
      toast.success("PDF gerado com sucesso!");
    } catch (e) {
      console.error("Erro ao exportar PDF:", e);
      toast.error("Erro ao gerar PDF.");
    } finally {
      setExportingPdf(false);
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
    <div className="space-y-6 p-4 md:p-6" ref={dashboardRef}>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard ISC</h1>
          <p className="text-muted-foreground">Infecção de Sítio Cirúrgico — Visão analítica</p>
        </div>
        <div className="flex gap-2 flex-wrap" data-html2canvas-ignore="true">
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            ins.push(`📊 ${kpis.totalCirurgias} cirurgias com ${kpis.totalISC} ISC confirmadas (Taxa: ${kpis.taxaISC.toFixed(1)}%).`);
            ins.push(`📞 Taxa de resposta de contato: ${kpis.taxaResposta.toFixed(1)}%.`);
            ins.push(`🔄 ${kpis.totalReinternacoes} reinternações registradas.`);
            if (kpis.taxaISC <= 2) ins.push(`✅ Taxa de ISC dentro do benchmark esperado (≤2%).`);
            else if (kpis.taxaISC <= 5) ins.push(`⚠️ Taxa de ISC moderada — monitorar de perto.`);
            else ins.push(`🚨 Taxa de ISC acima de 5% — investigação e ações corretivas recomendadas.`);
            if (clinicaStats.length > 0) { const worst = clinicaStats.sort((a, b) => b.taxaISC - a.taxaISC)[0]; ins.push(`🏥 Clínica com maior taxa: ${worst.name} (${worst.taxaISC.toFixed(1)}%).`); }
            return ins;
          }} />
          <Button
            variant="outline"
            size="sm"
            onClick={exportDashboardPdf}
            disabled={exportingPdf || !hasData}
          >
            {exportingPdf
              ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Gerando...</>
              : <><Download className="h-4 w-4 mr-1" />Exportar PDF</>}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label>Mês</Label>
              <Select value={mesFiltro} onValueChange={setMesFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {mesesFiltro.map((m) => (<SelectItem key={m} value={m}>{m}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ano</Label>
              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {anos.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Setor / Clínica</Label>
              <Select value={setorFiltro} onValueChange={setSetorFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {clinicas.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <Select value={profFiltro} onValueChange={setProfFiltro}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {profissionais.map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Período (mês inicial / final) */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Período — Mês inicial</Label>
              <Input
                type="month"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                max={periodoFim || undefined}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Período — Mês final</Label>
              <Input
                type="month"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
                min={periodoInicio || undefined}
              />
            </div>
            <div className="space-y-1.5 flex flex-col justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setPeriodoInicio(""); setPeriodoFim(""); }}
                disabled={!periodoInicio && !periodoFim}
              >
                Limpar período
              </Button>
            </div>
          </div>
          {(periodoInicio || periodoFim) && (
            <p className="mt-2 text-xs text-muted-foreground">
              Exibindo dados de <strong>{periodoInicio || "início"}</strong> até <strong>{periodoFim || "atual"}</strong>.
            </p>
          )}
        </CardContent>
      </Card>

      {!hasData || filtered.length === 0 ? <EmptyState /> : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
            {[
              { label: "Total Cirurgias", value: kpis.totalCirurgias, icon: <Stethoscope className="h-5 w-5 text-primary" /> },
              { label: "Contatos Telefônicos", value: kpis.totalContatos, icon: <Phone className="h-5 w-5 text-primary" /> },
              { label: "Retorno Ambulatório", value: kpis.totalRetAmb, icon: <CalendarDays className="h-5 w-5 text-primary" /> },
              { label: "Retorno WhatsApp", value: kpis.totalRetWpp, icon: <MessageCircle className="h-5 w-5 text-primary" /> },
              { label: "Taxa Resposta", value: `${kpis.taxaResposta.toFixed(1)}%`, icon: <Activity className="h-5 w-5 text-primary" /> },
              { label: "Reinternações", value: kpis.totalReinternacoes, icon: <AlertTriangle className="h-5 w-5 text-primary" /> },
              { label: "ISC Confirmadas", value: kpis.totalISC, icon: <AlertTriangle className="h-5 w-5 text-primary" /> },
              { label: "Taxa ISC", value: `${kpis.taxaISC.toFixed(1)}%`, icon: statusIcon(kpis.taxaISC), badge: true },
            ].map((kpi) => (
              <Card key={kpi.label} className={kpi.badge ? `border ${statusColor(kpis.taxaISC)}` : ""}>
                <CardContent className="pt-4 pb-4 flex flex-col items-center text-center gap-1">
                  {kpi.icon}
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold">{kpi.value}</p>
                  {kpi.badge && kpis.taxaISC <= 2 && (
                    <Badge variant="outline" className="text-green-600 border-green-300 text-[10px]">
                      <Award className="h-3 w-3 mr-1" /> Meta atingida
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs — Contatos absolutos por mês */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Contatos por Mês — Números Absolutos</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="telefonico" className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-xl">
                  <TabsTrigger value="telefonico">Telefônico</TabsTrigger>
                  <TabsTrigger value="ambulatorio">Ambulatório</TabsTrigger>
                  <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
                </TabsList>
                <TabsContent value="telefonico" className="h-[320px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contatosMensais}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="telefonico" name="Contatos Telefônicos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="ambulatorio" className="h-[320px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contatosMensais}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="ambulatorio" name="Retorno Ambulatório" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
                <TabsContent value="whatsapp" className="h-[320px] mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={contatosMensais}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="whatsapp" name="Retorno WhatsApp" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Cirurgias por Clínica</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barClinicaData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Cirurgias" radius={[4, 4, 0, 0]}>
                      {barClinicaData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Evolução Mensal — Taxa de ISC (%)</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Line type="monotone" dataKey="taxa" name="Taxa ISC" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Distribuição por Tipo de ISC</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine>
                      {pieData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Reinternações por Clínica</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barReintData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Reinternações" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Novos gráficos mensais e cirúrgicos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Reinternações por Mês</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reinternacoesMensais}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Reinternações" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">ISC Confirmadas por Mês</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={iscMensais}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Infecções de Sítio Cirúrgico" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Sítio de Cirurgia</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sitioData} cx="50%" cy="50%" outerRadius={100}
                      dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine
                    >
                      {sitioData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Taxa de ISC por Mês (%)</CardTitle></CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Line type="monotone" dataKey="taxa" name="Taxa ISC" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Total de Cirurgias por Mês — por Especialidade</CardTitle></CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cirurgiasEspecialidadeMes.rows}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {cirurgiasEspecialidadeMes.especialidades.map((esp, i) => (
                    <Bar
                      key={esp}
                      dataKey={esp}
                      stackId="esp"
                      fill={COLORS[i % COLORS.length]}
                      radius={i === cirurgiasEspecialidadeMes.especialidades.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Insights */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Insights Inteligentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.map((ins, i) => (
                <div key={i} className={`flex items-start gap-3 rounded-lg border p-3 ${insightBg(ins.type)}`}>
                  {insightIconMap[ins.icon] || <Activity className="h-5 w-5" />}
                  <p className="text-sm">{ins.text}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* AI Agent */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" /> Agente de IA — Gerador de Relatório
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  placeholder="Ex: Analisar taxa de ISC em Neurocirurgia no último trimestre..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={generateReport} className="gap-2">
                  <FileText className="h-4 w-4" /> Gerar Relatório
                </Button>
              </div>
              {aiReport && (
                <div className="rounded-lg border bg-muted/30 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-foreground font-mono">{aiReport}</pre>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
