import { useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import MultiSelectFilter from "@/components/MultiSelectFilter";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList,
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
import { supabase } from "@/integrations/supabase/client";
import ChartActions from "@/components/ChartActions";
import DashboardAnalysisTabs, { AnalysisConfig } from "@/components/DashboardAnalysisTabs";
import InfectologistInsightsPanel from "@/components/InfectologistInsightsPanel";
import { ReferenceLine } from "recharts";
import { FileSpreadsheet } from "lucide-react";

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

const PIE_COLORS = [
  "#22c55e", "#eab308", "#ef4444", "#3b82f6", "#a855f7",
  "#f97316", "#14b8a6", "#ec4899", "#0ea5e9", "#84cc16",
  "#f43f5e", "#6366f1",
];

const ISC_SITE_LABELS = ["ISC superficial", "ISC profunda", "ISC de cavidade/órgão"];

const normalizeIscSite = (value: string) => {
  const trimmed = value.trim();
  const normalized = trimmed
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized.includes("profund")) return "ISC profunda";
  if (normalized.includes("cavidade") || normalized.includes("orgao") || normalized.includes("órgão") || normalized.includes("espaco") || normalized.includes("espaço")) {
    return "ISC de cavidade/órgão";
  }
  if (normalized.includes("superfic")) return "ISC superficial";

  return trimmed;
};

const splitIscSites = (sitio?: string | null) => {
  if (!sitio) return [];

  return Array.from(
    new Set(
      sitio
        .split(/[,;\n]+/)
        .map(normalizeIscSite)
        .filter(Boolean)
    )
  );
};

const createIscSiteMap = () =>
  Object.fromEntries(ISC_SITE_LABELS.map((label) => [label, 0])) as Record<string, number>;

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
  const navigate = useNavigate();
  const { hospitalId } = useHospitalContext();
  const { records: allRecords, loading: dataLoading } = useISCDashboard();
  const [mesFiltro, setMesFiltro] = useState<string[]>([]);
  const [anoFiltro, setAnoFiltro] = useState<string[]>([]);
  const [profFiltro, setProfFiltro] = useState<string[]>([]);
  const [setorFiltro, setSetorFiltro] = useState<string[]>([]);
  // Filtro de período (mês inicial/final). Formato YYYY-MM (compatível com <input type="month">)
  const [periodoInicio, setPeriodoInicio] = useState("");
  const [periodoFim, setPeriodoFim] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiReport, setAiReport] = useState("");
  const [exportingPdf, setExportingPdf] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  // Refs e metas para cada gráfico
  const refContatos = useRef<HTMLDivElement>(null);
  const refClinica = useRef<HTMLDivElement>(null);
  const refEvolucao = useRef<HTMLDivElement>(null);
  const refTipoISC = useRef<HTMLDivElement>(null);
  const refReintClinica = useRef<HTMLDivElement>(null);
  const refReintMes = useRef<HTMLDivElement>(null);
  const refIscMes = useRef<HTMLDivElement>(null);
  const refSitio = useRef<HTMLDivElement>(null);
  const refTaxaIscMes = useRef<HTMLDivElement>(null);
  const refEspecialidade = useRef<HTMLDivElement>(null);

  const [metas, setMetas] = useState<Record<string, number | undefined>>({});
  const setMeta = (k: string) => (v: number | undefined) =>
    setMetas((prev) => ({ ...prev, [k]: v }));

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
      if (anoFiltro.length > 0 && !anoFiltro.includes(String(r.ano))) return false;
      if (mesFiltro.length > 0 && !mesFiltro.some(m => r.mes === mesesFiltro.indexOf(m))) return false;
      if (profFiltro.length > 0 && !profFiltro.includes(r.profissional)) return false;
      if (setorFiltro.length > 0 && !setorFiltro.includes(r.clinica)) return false;
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
    // Inclui TODOS os tipos de ISC (superficial, profunda, cavidade/órgão) presentes nos registros
    // filtrados. Cada registro pode ter múltiplos sítios separados por vírgula.
    const map = createIscSiteMap();
    filtered.forEach((r) => {
      const sitios = splitIscSites(r.sitio);
      sitios.forEach((s) => {
        if (!(s in map)) map[s] = 0;
        map[s] += r.iscConfirmada || 0;
      });
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
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

  // Médias anuais — taxa de ISC média mensal (geral e por sítio cirúrgico)
  // Para cada mês com dados, calcula taxa = (ISC / cirurgias) × 100, e tira a média dos meses.
  const mediaAnualISC = useMemo(() => {
    // Geral por mês
    const porMes: Record<string, { cirurgias: number; isc: number }> = {};
    filtered.forEach((r) => {
      const k = `${r.mes}/${r.ano}`;
      if (!porMes[k]) porMes[k] = { cirurgias: 0, isc: 0 };
      porMes[k].cirurgias += r.totalCirurgias;
      porMes[k].isc += r.iscConfirmada;
    });
    const taxasMensais = Object.values(porMes)
      .filter((v) => v.cirurgias > 0)
      .map((v) => (v.isc / v.cirurgias) * 100);
    const taxaMediaGeral = taxasMensais.length
      ? taxasMensais.reduce((a, b) => a + b, 0) / taxasMensais.length
      : 0;

    // Por sítio cirúrgico
    const porSitioMes: Record<string, Record<string, { cirurgias: number; isc: number }>> = {};
    filtered.forEach((r) => {
      const k = `${r.mes}/${r.ano}`;
      const sitios = splitIscSites(r.sitio);
      sitios.forEach((s) => {
        if (!porSitioMes[s]) porSitioMes[s] = {};
        if (!porSitioMes[s][k]) porSitioMes[s][k] = { cirurgias: 0, isc: 0 };
        porSitioMes[s][k].cirurgias += r.totalCirurgias;
        porSitioMes[s][k].isc += r.iscConfirmada;
      });
    });
    const porSitio = Object.entries(porSitioMes).map(([sitio, mapMes]) => {
      const taxas = Object.values(mapMes)
        .filter((v) => v.cirurgias > 0)
        .map((v) => (v.isc / v.cirurgias) * 100);
      const media = taxas.length ? taxas.reduce((a, b) => a + b, 0) / taxas.length : 0;
      const totalCirurgias = Object.values(mapMes).reduce((s, v) => s + v.cirurgias, 0);
      const totalISC = Object.values(mapMes).reduce((s, v) => s + v.isc, 0);
      return { sitio, media, mesesComDados: taxas.length, totalCirurgias, totalISC };
    }).sort((a, b) => b.media - a.media);

    return {
      taxaMediaGeral,
      mesesComDados: taxasMensais.length,
      porSitio,
    };
  }, [filtered]);

  // Sítio cirúrgico (distribuição por sítio entre as cirurgias com sítio informado)
  const sitioData = useMemo(() => {
    const map = createIscSiteMap();
    filtered.forEach((r) => {
      const sitios = splitIscSites(r.sitio);
      sitios.forEach((s) => { map[s] = (map[s] || 0) + r.totalCirurgias; });
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
        let total = 0;
        especialidades.forEach(e => {
          const v = vals[e] || 0;
          row[e] = v;
          total += v;
        });
        row.total = total;
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

  const [reportLoading, setReportLoading] = useState(false);

  const generateReport = useCallback(async () => {
    if (!hasData) return;
    setReportLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("agent-chat", {
        body: {
          agent_id: "isc-analyst",
          input: aiPrompt
            ? `Gere um relatório estruturado de ISC. Observação adicional do usuário: "${aiPrompt}"`
            : "Gere um relatório estruturado e completo de ISC para este período.",
          context: {
            isc_summary: {
              total_cirurgias: reportInput.totalCirurgias,
              total_contatos: reportInput.totalContatos,
              taxa_resposta: reportInput.taxaResposta,
              total_reinternacoes: reportInput.totalReinternacoes,
              total_isc: reportInput.totalISC,
              taxa_isc: reportInput.taxaISC,
              clinicas: reportInput.clinicas,
              tendencia: reportInput.tendencia,
            },
          },
        },
      });

      if (error) throw error;
      if (data?.output) {
        setAiReport(data.output);
        setReportLoading(false);
        return;
      }
    } catch (err) {
      console.warn("Edge function falhou, usando relatório local:", err);
      toast.warning("Usando relatório local — IA indisponível no momento.");
    }

    // Fallback: template local
    setAiReport(generateStructuredReport({ ...reportInput, promptExtra: aiPrompt || undefined }));
    setReportLoading(false);
  }, [hasData, reportInput, aiPrompt]);

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

  // Exporta KPIs + séries usadas nos gráficos em CSV (com filtros aplicados)
  const exportCsv = () => {
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? "" : String(v);
      return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows: string[][] = [];

    rows.push(["Dashboard ISC — Exportação CSV"]);
    rows.push(["Gerado em", new Date().toLocaleString("pt-BR")]);
    rows.push(["Filtros aplicados"]);
    const fmtArr = (a: string[]) => a.length === 0 ? "Todos" : a.join(", ");
    rows.push(["Mês", fmtArr(mesFiltro)]);
    rows.push(["Ano", fmtArr(anoFiltro)]);
    rows.push(["Setor/Clínica", fmtArr(setorFiltro)]);
    rows.push(["Profissional", fmtArr(profFiltro)]);
    rows.push(["Período inicial", periodoInicio || "—"]);
    rows.push(["Período final", periodoFim || "—"]);
    rows.push([]);

    rows.push(["KPIs"]);
    rows.push(["Indicador", "Valor"]);
    rows.push(["Total Cirurgias", String(kpis.totalCirurgias)]);
    rows.push(["Contatos Telefônicos", String(kpis.totalContatos)]);
    rows.push(["Retorno Ambulatório", String(kpis.totalRetAmb)]);
    rows.push(["Retorno WhatsApp", String(kpis.totalRetWpp)]);
    rows.push(["Total Respostas", String(kpis.totalRespostas)]);
    rows.push(["Taxa de Resposta (%)", kpis.taxaResposta.toFixed(2)]);
    rows.push(["Reinternações", String(kpis.totalReinternacoes)]);
    rows.push(["ISC Confirmadas", String(kpis.totalISC)]);
    rows.push(["Taxa de ISC (%)", kpis.taxaISC.toFixed(2)]);
    rows.push([]);

    rows.push(["Contatos por Mês — Números Absolutos"]);
    rows.push(["Mês/Ano", "Telefônico", "Ambulatório", "WhatsApp"]);
    contatosMensais.forEach((d) => rows.push([d.name, String(d.telefonico), String(d.ambulatorio), String(d.whatsapp)]));
    rows.push([]);

    rows.push(["Cirurgias por Clínica"]);
    rows.push(["Clínica", "Cirurgias"]);
    barClinicaData.forEach((d) => rows.push([d.name, String(d.value)]));
    rows.push([]);

    rows.push(["Evolução Mensal — Taxa de ISC (%)"]);
    rows.push(["Mês/Ano", "Taxa ISC (%)"]);
    lineData.forEach((d) => rows.push([d.name, String(d.taxa)]));
    rows.push([]);

    rows.push(["Distribuição por Tipo de ISC"]);
    rows.push(["Tipo", "Quantidade"]);
    pieData.forEach((d) => rows.push([d.name, String(d.value)]));
    rows.push([]);

    rows.push(["Reinternações por Clínica"]);
    rows.push(["Clínica", "Reinternações"]);
    barReintData.forEach((d) => rows.push([d.name, String(d.value)]));
    rows.push([]);

    rows.push(["Reinternações por Mês"]);
    rows.push(["Mês/Ano", "Reinternações"]);
    reinternacoesMensais.forEach((d) => rows.push([d.name, String(d.value)]));
    rows.push([]);

    rows.push(["ISC Confirmadas por Mês"]);
    rows.push(["Mês/Ano", "ISC Confirmadas"]);
    iscMensais.forEach((d) => rows.push([d.name, String(d.value)]));
    rows.push([]);

    rows.push(["Sítio de Cirurgia"]);
    rows.push(["Sítio", "Cirurgias"]);
    sitioData.forEach((d) => rows.push([d.name, String(d.value)]));
    rows.push([]);

    rows.push(["Total de Cirurgias por Mês — por Especialidade"]);
    rows.push(["Mês/Ano", ...cirurgiasEspecialidadeMes.especialidades]);
    cirurgiasEspecialidadeMes.rows.forEach((row) => {
      rows.push([row.name, ...cirurgiasEspecialidadeMes.especialidades.map((e) => String(row[e] ?? 0))]);
    });

    const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dashboard-isc-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso!");
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
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Dashboard ISC</h1>
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
            variant="default"
            size="sm"
            onClick={() => navigate("/quality/5w2h", { state: { prefill: {
              what: `Taxa de ISC: ${kpis.taxaISC.toFixed(1)}% — ${kpis.totalISC} infecções em ${kpis.totalCirurgias} cirurgias`,
              why: `ISC eleva mortalidade, reinternações (${kpis.totalReinternacoes}) e custos hospitalares. Identificação de falhas no processo cirúrgico é crítica.`,
              where: setorFiltro.length > 0 ? setorFiltro.join(", ") : "Todos os setores cirúrgicos",
              when: anoFiltro.length > 0 ? anoFiltro.join(", ") : "Período atual",
              who: "CCIH / Cirurgia / Centro Cirúrgico / Enfermagem",
              how: "Implementar bundle de prevenção de ISC, auditar técnica cirúrgica, reforçar antissepsia e profilaxia antibiótica perioperatória",
              howMuch: "Investimento em treinamentos, kits de bundle ISC e monitoramento pós-alta conforme orçamento CCIH",
            }}})}
            className="gap-1.5"
          >
            <FileText className="h-4 w-4 mr-1" /> Gerar Plano 5W2H
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!hasData}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1" />Exportar CSV
          </Button>
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
              <MultiSelectFilter
                label="Mês"
                selected={mesFiltro}
                onChange={setMesFiltro}
                options={mesesFiltro.filter(m => m !== "Todos").map(m => ({ value: m, label: m }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ano</Label>
              <MultiSelectFilter
                label="Ano"
                selected={anoFiltro}
                onChange={setAnoFiltro}
                options={anos.map(a => ({ value: a, label: a }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Setor / Clínica</Label>
              <MultiSelectFilter
                label="Setor / Clínica"
                selected={setorFiltro}
                onChange={setSetorFiltro}
                options={clinicas.map(c => ({ value: c, label: c }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Profissional</Label>
              <MultiSelectFilter
                label="Profissional"
                selected={profFiltro}
                onChange={setProfFiltro}
                options={profissionais.map(p => ({ value: p, label: p }))}
              />
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
              { label: "Taxa ISC (agregada)", value: `${kpis.taxaISC.toFixed(1)}%`, icon: statusIcon(kpis.taxaISC), badge: true, hint: `${kpis.totalISC} ISC / ${kpis.totalCirurgias} cirurgias` },
            ].map((kpi) => (
              <Card key={kpi.label} className={kpi.badge ? `border ${statusColor(kpis.taxaISC)}` : ""}>
                <CardContent className="pt-4 pb-4 flex flex-col items-center text-center gap-1">
                  {kpi.icon}
                  <p className="text-xs text-muted-foreground">{kpi.label}</p>
                  <p className="text-xl font-bold">{kpi.value}</p>
                  {(kpi as any).hint && (
                    <p className="text-[10px] text-muted-foreground leading-tight">{(kpi as any).hint}</p>
                  )}
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
          <Card ref={refContatos as any}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Contatos por Mês — Números Absolutos</CardTitle>
              <div data-html2canvas-ignore="true">
                <ChartActions
                  chartRef={refContatos}
                  chartTitle="Contatos por Mês"
                  metaFields={[
                    { key: "telefonico", label: "Meta Telefônico", value: metas.contatos_tel, onChange: setMeta("contatos_tel") },
                    { key: "ambulatorio", label: "Meta Ambulatório", value: metas.contatos_amb, onChange: setMeta("contatos_amb") },
                    { key: "whatsapp", label: "Meta WhatsApp", value: metas.contatos_wpp, onChange: setMeta("contatos_wpp") },
                  ]}
                />
              </div>
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
                      <Bar dataKey="telefonico" name="Contatos Telefônicos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="telefonico" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                    </Bar>
                      {metas.contatos_tel !== undefined && (
                        <ReferenceLine y={metas.contatos_tel} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `Meta: ${metas.contatos_tel}`, position: "right", fontSize: 11 }} />
                      )}
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
                      <Bar dataKey="ambulatorio" name="Retorno Ambulatório" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="ambulatorio" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                    </Bar>
                      {metas.contatos_amb !== undefined && (
                        <ReferenceLine y={metas.contatos_amb} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `Meta: ${metas.contatos_amb}`, position: "right", fontSize: 11 }} />
                      )}
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
                      <Bar dataKey="whatsapp" name="Retorno WhatsApp" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="whatsapp" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                    </Bar>
                      {metas.contatos_wpp !== undefined && (
                        <ReferenceLine y={metas.contatos_wpp} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `Meta: ${metas.contatos_wpp}`, position: "right", fontSize: 11 }} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card ref={refClinica as any}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Cirurgias por Clínica</CardTitle>
                <div data-html2canvas-ignore="true">
                  <ChartActions chartRef={refClinica} chartTitle="Cirurgias por Clínica" metaValue={metas.clinica} onMetaChange={setMeta("clinica")} />
                </div>
              </CardHeader>
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
                      <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                    </Bar>
                    {metas.clinica !== undefined && (
                      <ReferenceLine y={metas.clinica} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `Meta: ${metas.clinica}`, position: "right", fontSize: 11 }} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card ref={refEvolucao as any}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Evolução Mensal — Taxa de ISC (%)</CardTitle>
                <div data-html2canvas-ignore="true">
                  <ChartActions chartRef={refEvolucao} chartTitle="Evolução Taxa ISC" metaUnit="%" metaValue={metas.evolucao} onMetaChange={setMeta("evolucao")} />
                </div>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Line type="monotone" dataKey="taxa" name="Taxa ISC" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }}  label={{ position: "top", fontSize: 10, fill: "hsl(var(--foreground))" }} />
                    {metas.evolucao !== undefined && (
                      <ReferenceLine y={metas.evolucao} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `Meta: ${metas.evolucao}%`, position: "right", fontSize: 11 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card ref={refTipoISC as any}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Distribuição por Tipo de ISC</CardTitle>
                <div data-html2canvas-ignore="true">
                  <ChartActions chartRef={refTipoISC} chartTitle="Distribuição por Tipo de ISC" metaValue={metas.tipoIsc} onMetaChange={setMeta("tipoIsc")} />
                </div>
              </CardHeader>
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

            <Card ref={refReintClinica as any}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Reinternações por Clínica</CardTitle>
                <div data-html2canvas-ignore="true">
                  <ChartActions chartRef={refReintClinica} chartTitle="Reinternações por Clínica" metaValue={metas.reintClinica} onMetaChange={setMeta("reintClinica")} />
                </div>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barReintData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Reinternações" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                    </Bar>
                    {metas.reintClinica !== undefined && (
                      <ReferenceLine y={metas.reintClinica} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `Meta: ${metas.reintClinica}`, position: "right", fontSize: 11 }} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Novos gráficos mensais e cirúrgicos */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card ref={refReintMes as any}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Reinternações por Mês</CardTitle>
                <div data-html2canvas-ignore="true">
                  <ChartActions chartRef={refReintMes} chartTitle="Reinternações por Mês" metaValue={metas.reintMes} onMetaChange={setMeta("reintMes")} />
                </div>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={reinternacoesMensais}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Reinternações" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                    </Bar>
                    {metas.reintMes !== undefined && (
                      <ReferenceLine y={metas.reintMes} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `Meta: ${metas.reintMes}`, position: "right", fontSize: 11 }} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card ref={refIscMes as any}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">ISC Confirmadas por Mês</CardTitle>
                <div data-html2canvas-ignore="true">
                  <ChartActions chartRef={refIscMes} chartTitle="ISC Confirmadas por Mês" metaValue={metas.iscMes} onMetaChange={setMeta("iscMes")} />
                </div>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={iscMensais}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" name="Infecções de Sítio Cirúrgico" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} />
                    </Bar>
                    {metas.iscMes !== undefined && (
                      <ReferenceLine y={metas.iscMes} stroke="hsl(var(--primary))" strokeDasharray="4 4" label={{ value: `Meta: ${metas.iscMes}`, position: "right", fontSize: 11 }} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card ref={refSitio as any}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Sítio de Cirurgia</CardTitle>
                <div data-html2canvas-ignore="true">
                  <ChartActions chartRef={refSitio} chartTitle="Sítio de Cirurgia" metaValue={metas.sitio} onMetaChange={setMeta("sitio")} />
                </div>
              </CardHeader>
              <CardContent className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 10, right: 70, bottom: 10, left: 70 }}>
                    <Pie
                      data={sitioData} cx="50%" cy="50%" outerRadius={80}
                      dataKey="value" nameKey="name"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={{ stroke: "hsl(var(--muted-foreground))" }}
                    >
                      {sitioData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card ref={refTaxaIscMes as any}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Taxa de ISC por Mês (%)</CardTitle>
                <div data-html2canvas-ignore="true">
                  <ChartActions chartRef={refTaxaIscMes} chartTitle="Taxa de ISC por Mês" metaUnit="%" metaValue={metas.taxaIscMes} onMetaChange={setMeta("taxaIscMes")} />
                </div>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis unit="%" />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Line type="monotone" dataKey="taxa" name="Taxa ISC" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }}  label={{ position: "top", fontSize: 10, fill: "hsl(var(--foreground))" }} />
                    {metas.taxaIscMes !== undefined && (
                      <ReferenceLine y={metas.taxaIscMes} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `Meta: ${metas.taxaIscMes}%`, position: "right", fontSize: 11 }} />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card ref={refEspecialidade as any}>
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Total de Cirurgias por Mês — por Especialidade</CardTitle>
              <div data-html2canvas-ignore="true">
                <ChartActions chartRef={refEspecialidade} chartTitle="Cirurgias por Especialidade" metaValue={metas.especialidade} onMetaChange={setMeta("especialidade")} />
              </div>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cirurgiasEspecialidadeMes.rows}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  {cirurgiasEspecialidadeMes.especialidades.map((esp, i) => {
                    const isLast = i === cirurgiasEspecialidadeMes.especialidades.length - 1;
                    return (
                      <Bar
                        key={esp}
                        dataKey={esp}
                        stackId="esp"
                        fill={COLORS[i % COLORS.length]}
                        radius={isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      >
                        {isLast && (
                          <LabelList
                            dataKey="total"
                            position="top"
                            style={{ fontSize: 11, fill: "hsl(var(--foreground))", fontWeight: 600 }}
                          />
                        )}
                      </Bar>
                    );
                  })}
                  {metas.especialidade !== undefined && (
                    <ReferenceLine y={metas.especialidade} stroke="hsl(var(--destructive))" strokeDasharray="4 4" label={{ value: `Meta: ${metas.especialidade}`, position: "right", fontSize: 11 }} />
                  )}
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

          {/* Médias Anuais das Taxas de ISC */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Médias Anuais das Taxas de ISC
                  <Badge variant="outline" className="text-[10px] ml-1">
                    {anoFiltro.length === 0 ? "Todos os anos" : anoFiltro.join(", ")}
                  </Badge>
                </CardTitle>
                <span className="text-[11px] text-muted-foreground">
                  Média das taxas mensais (ISC ÷ cirurgias × 100) sobre {mediaAnualISC.mesesComDados} {mediaAnualISC.mesesComDados === 1 ? "mês" : "meses"} com dados
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {mediaAnualISC.mesesComDados === 0 ? (
                <p className="text-sm text-muted-foreground py-4">Sem dados suficientes para calcular médias.</p>
              ) : (
                <>
                  {/* Card geral */}
                  <Card className={`border ${statusColor(mediaAnualISC.taxaMediaGeral)}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-background/60 flex items-center justify-center shrink-0">
                        <Activity className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide opacity-80">
                          Média Anual da Taxa de ISC — Geral
                        </p>
                        <p className="text-3xl font-bold mt-0.5">
                          {mediaAnualISC.taxaMediaGeral.toFixed(2)}
                          <span className="text-base font-normal opacity-70 ml-1">%</span>
                        </p>
                      </div>
                      {mediaAnualISC.taxaMediaGeral <= 2 && (
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                          <Award className="h-3 w-3 mr-1" /> Meta atingida
                        </Badge>
                      )}
                    </CardContent>
                  </Card>

                  {/* Por sítio cirúrgico */}
                  {mediaAnualISC.porSitio.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-foreground mb-2">
                        Média Anual por Sítio Cirúrgico
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {mediaAnualISC.porSitio.map((s) => (
                          <Card key={s.sitio} className={`border ${statusColor(s.media)}`}>
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium leading-snug break-words">
                                    {s.sitio}
                                  </p>
                                  <p className="text-2xl font-bold mt-1">
                                    {s.media.toFixed(2)}
                                    <span className="text-xs font-normal opacity-70 ml-1">%</span>
                                  </p>
                                </div>
                                {statusIcon(s.media)}
                              </div>
                              <p className="text-[10px] opacity-75 mt-2">
                                {s.totalISC} ISC / {s.totalCirurgias} cirurgias · {s.mesesComDados} {s.mesesComDados === 1 ? "mês" : "meses"}
                              </p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Infectologist AI Insights */}
      {hasData && filtered.length > 0 && (
        <InfectologistInsightsPanel
          domain="ISC"
          buildContext={() => [
            `Total cirurgias: ${kpis.totalCirurgias} | ISC confirmadas: ${kpis.totalISC}`,
            `Taxa de ISC: ${kpis.taxaISC.toFixed(2)}% (meta: ≤2%)`,
            `Taxa de resposta pós-alta: ${kpis.taxaResposta.toFixed(1)}%`,
            `Reinternações: ${kpis.totalReinternacoes}`,
            `Contatos: telefônico ${kpis.totalContatos}, ambulatório ${kpis.totalRetAmb}, WhatsApp ${kpis.totalRetWpp}`,
            clinicaStats.length > 0
              ? `Clínicas (taxa ISC): ${[...clinicaStats].sort((a,b) => b.taxaISC - a.taxaISC).slice(0,4).map(c => `${c.name} ${c.taxaISC.toFixed(1)}%`).join(", ")}`
              : "",
            lineData.length > 0
              ? `Evolução mensal (últimos períodos): ${lineData.slice(-4).map(d => `${d.name}: ${d.taxa}%`).join(", ")}`
              : "",
            `Filtros aplicados: mês ${mesFiltro.length > 0 ? mesFiltro.join(",") : "todos"}, setor ${setorFiltro.length > 0 ? setorFiltro.join(",") : "todos"}`,
          ].filter(Boolean).join("\n")}
          contextKey={`${filtered.length}|${kpis.taxaISC.toFixed(2)}|${kpis.totalISC}`}
        />
      )}

      {/* Analysis Tabs */}
      {hasData && filtered.length > 0 && (
        <DashboardAnalysisTabs config={{
          domain: "Infecção de Sítio Cirúrgico",
          effectLabel: "Elevada Taxa de ISC",
          ishikawaCategories: [
            { name: "Método", items: ["Bundle ISC não implementado", "Profilaxia antibiótica inadequada", "Técnica cirúrgica sem padronização", "Tricotomia incorreta ou ausente"] },
            { name: "Máquina", items: ["Esterilização insuficiente de instrumentais", "Climatização inadequada do CC", "Falhas em equipamentos de limpeza", "Autoclaves sem manutenção preventiva"] },
            { name: "Material", items: ["Insumos para antissepsia insuficientes", "Drenos e curativos inadequados", "Campos cirúrgicos de baixa barreira", "Fios cirúrgicos de qualidade inadequada"] },
            { name: "Mão de Obra", items: ["Lavagem das mãos deficiente", "Alta rotatividade da equipe cirúrgica", "Falta de treinamento em paramentação", "Supervisão insuficiente em cirurgias complexas"] },
            { name: "Medida", items: ["Monitoramento pós-alta insuficiente", "Ausência de registro de ISC", "Metas não comunicadas à equipe", "Indicadores sem feedback regular"] },
            { name: "Meio Ambiente", items: ["Fluxo inadequado no centro cirúrgico", "Visitas desnecessárias no CC", "Temperatura/umidade fora do padrão", "Ventilação inadequada no bloco cirúrgico"] },
          ],
          paretoData: [
            { name: "Profilaxia inadequada", value: 35 },
            { name: "Tricotomia incorreta", value: 28 },
            { name: "Antissepsia insuficiente", value: 22 },
            { name: "Bundle não seguido", value: 18 },
            { name: "Esterilização falha", value: 14 },
            { name: "Monit. pós-alta ausente", value: 10 },
            { name: "Outros", value: 7 },
          ],
          swotData: {
            strengths: ["Equipe cirúrgica especializada", "Centro cirúrgico estruturado", "Registro sistemático de ISC", "CCIH com participação ativa"],
            weaknesses: ["Bundle ISC parcialmente implementado", "Monitoramento pós-alta deficiente", "Alta rotatividade de equipe", "Profilaxia antibiótica não padronizada"],
            opportunities: ["Implementação completa do bundle ISC", "Treinamentos em higiene e técnica cirúrgica", "Telemonitoramento pós-alta", "Benchmarking com hospitais referência"],
            threats: ["Pressão por volume cirúrgico elevado", "Limitações de estrutura no CC", "Resistência à mudança de protocolo", "Restrições orçamentárias"],
          },
          risks: [
            { id: "r1", description: "Surto de ISC por cepa resistente no CC", probability: 3, impact: 5 },
            { id: "r2", description: "Aumento de reinternações por deiscência ou infecção", probability: 4, impact: 4 },
            { id: "r3", description: "Notificação compulsória de surto à ANVISA", probability: 2, impact: 5 },
            { id: "r4", description: "Alta mortalidade por ISC profunda ou de órgão/espaço", probability: 3, impact: 5 },
            { id: "r5", description: "Penalidades contratuais por taxas acima do benchmark", probability: 2, impact: 4 },
          ],
          pdcaData: {
            plan: ["Implementar bundle completo de prevenção de ISC", "Padronizar profilaxia antibiótica perioperatória", "Criar protocolo de monitoramento pós-alta 30 dias", "Definir metas de taxa ISC por especialidade"],
            do: ["Treinar equipes em paramentação e antissepsia", "Auditar adesão ao bundle semanalmente", "Reforçar contato telefônico pós-alta", "Otimizar fluxo de limpeza no CC"],
            check: ["Monitorar taxa de ISC mensalmente por clínica", "Avaliar aderência ao bundle nas cirurgias", "Acompanhar reinternações relacionadas à ISC", "Revisar todos os casos de ISC confirmada"],
            act: ["Ampliar bundle para todas as especialidades", "Ajustar profilaxia baseada em antibiograma local", "Implementar comissão de revisão de ISC mensal", "Escalar ações nos setores com maior taxa"],
          },
          stats: {
            value: `${kpis.taxaISC.toFixed(1)}%`,
            label: "Taxa de ISC",
            issues: kpis.totalISC,
            topIssue: "ISC Confirmada",
            sector: clinicaStats.length > 0 ? [...clinicaStats].sort((a, b) => b.taxaISC - a.taxaISC)[0]?.name || "—" : "—",
          },
        } as AnalysisConfig} />
      )}
    </div>
  );
}
