import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  Activity, Download, Filter, X, Loader2, Heart, Skull, Bug, Timer,
  Syringe, TrendingUp, ShieldAlert, Thermometer, FileDown, Maximize2,
  Baby, BarChart2, Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import SmartInsightsPanel from "@/components/SmartInsightsPanel";
import ChartActions from "@/components/ChartActions";
import YearComparisonChart from "@/components/YearComparisonChart";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadialBarChart, RadialBar, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { mesesOptions, setorOptions } from "@/data/indicadores-config";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";


const neonatalWeightCategories = [
  { id: "pesoMenor750",      label: "< 750g",        color: "hsl(262,83%,58%)" },
  { id: "peso750a999",       label: "750–999g",       color: "hsl(0,72%,51%)" },
  { id: "peso1000a1499",     label: "1.000–1.499g",   color: "hsl(38,92%,50%)" },
  { id: "peso1500a2499",     label: "1.500–2.499g",   color: "hsl(217,91%,60%)" },
  { id: "pesoMaiorIgual2500",label: "≥ 2.500g",       color: "hsl(168,66%,34%)" },
];

const COLORS = [
  "hsl(168 66% 34%)", "hsl(217 91% 60%)", "hsl(0 72% 51%)",
  "hsl(38 92% 50%)", "hsl(262 83% 58%)", "hsl(330 81% 60%)",
];

const mesesAbrev = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function safeDiv(n: number, d: number, mult: number) {
  return d === 0 ? 0 : Math.round((n / d) * mult * 100) / 100;
}

function KpiCard({ label, value, unit, icon: Icon, color, description, expandable = false }: {
  label: string; value: number; unit: string; icon: any; color: string;
  description?: string; expandable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card className="relative overflow-hidden group">
        {expandable && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute top-1.5 right-1.5 h-7 w-7 rounded-md flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-muted transition"
            aria-label={`Ampliar ${label}`}
          >
            <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        )}
        <CardContent className="p-4 flex items-start gap-3">
          <div className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
            <Icon className="h-5 w-5" style={{ color }} />
          </div>
          <div className="min-w-0 flex-1 pr-6">
            <p className="text-xs font-medium text-muted-foreground leading-snug break-words">{label}</p>
            <p className="text-xl font-bold text-foreground mt-0.5">
              {value.toFixed(2)}<span className="text-xs font-normal text-muted-foreground ml-0.5">{unit}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      {expandable && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}20` }}>
                  <Icon className="h-5 w-5" style={{ color }} />
                </div>
                <span className="text-base">{label}</span>
              </DialogTitle>
              {description && <DialogDescription className="text-sm pt-1">{description}</DialogDescription>}
            </DialogHeader>
            <div className="py-6 text-center">
              <p className="text-5xl font-bold" style={{ color }}>
                {value.toFixed(2)}
                <span className="text-xl font-normal text-muted-foreground ml-1">{unit}</span>
              </p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

function GaugeChart({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const data = [{ name: label, value: pct, fill: color }];
  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={140} height={100}>
        <RadialBarChart cx="50%" cy="100%" innerRadius="60%" outerRadius="100%" startAngle={180} endAngle={0} data={data}>
          <RadialBar dataKey="value" cornerRadius={6} background={{ fill: "hsl(var(--muted))" }} />
        </RadialBarChart>
      </ResponsiveContainer>
      <p className="text-lg font-bold mt-[-10px]" style={{ color }}>{value.toFixed(2)}</p>
      <p className="text-[10px] text-muted-foreground text-center leading-tight mt-0.5">{label}</p>
    </div>
  );
}

export default function IndicadoresDashboard() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesFiltro, setMesFiltro] = useState<string[]>([]);
  const [anoFiltro, setAnoFiltro] = useState<string[]>([String(new Date().getFullYear())]);
  const [setorFiltro, setSetorFiltro] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("infeccao");
  const [exporting, setExporting] = useState(false);

  const tabRefs = {
    infeccao: useRef<HTMLDivElement>(null),
    dispositivos: useRef<HTMLDivElement>(null),
    taxas: useRef<HTMLDivElement>(null),
    permanencia: useRef<HTMLDivElement>(null),
    quantitativo: useRef<HTMLDivElement>(null),
  };

  // Individual chart refs
  const chartRefs = {
    taxaInfeccaoMes: useRef<HTMLDivElement>(null),
    obitosInfeccoesMes: useRef<HTMLDivElement>(null),
    taxaLetalidadeMes: useRef<HTMLDivElement>(null),
    infeccaoDispositivo: useRef<HTMLDivElement>(null),
    taxaInfDispositivo: useRef<HTMLDivElement>(null),
    taxasPavCvcSvd: useRef<HTMLDivElement>(null),
    importadasHospitalares: useRef<HTMLDivElement>(null),
    tempoPermanencia: useRef<HTMLDivElement>(null),
    taxaUsoAtb: useRef<HTMLDivElement>(null),
  };

  // Meta goals state
  const [metas, setMetas] = useState<Record<string, number | undefined>>({});
  const setMeta = (key: string, val: number | undefined) => setMetas(prev => ({ ...prev, [key]: val }));

  const tabNames: Record<string, string> = {
    infeccao: "Infecção",
    dispositivos: "Dispositivos",
    taxas: "Taxas Específicas",
    permanencia: "Permanência / ATB",
    quantitativo: "Quantitativo",
  };

  const exportTabPdf = useCallback(async () => {
    const ref = tabRefs[activeTab as keyof typeof tabRefs]?.current;
    if (!ref) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(ref, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? "l" : "p", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const ratio = canvas.height / canvas.width;
      const imgW = usableW;
      const imgH = imgW * ratio;

      // Title
      pdf.setFontSize(14);
      pdf.text(`Indicadores - ${tabNames[activeTab]}`, margin, margin + 5);
      pdf.setFontSize(9);
      const fmt = (arr: string[]) => arr.length === 0 ? "Todos" : arr.join(", ");
      pdf.text(`Filtros: Mês=${fmt(mesFiltro)} | Ano=${fmt(anoFiltro)} | Setor=${fmt(setorFiltro)}`, margin, margin + 11);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, margin, margin + 16);

      const startY = margin + 20;
      if (imgH + startY <= pageH - margin) {
        pdf.addImage(imgData, "PNG", margin, startY, imgW, imgH);
      } else {
        // Scale to fit page
        const fitH = pageH - startY - margin;
        const fitW = fitH / ratio;
        pdf.addImage(imgData, "PNG", margin, startY, Math.min(fitW, usableW), Math.min(fitH, imgH));
      }

      pdf.save(`indicadores-${activeTab}-${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("Erro ao exportar PDF:", err);
    } finally {
      setExporting(false);
    }
  }, [activeTab, mesFiltro, anoFiltro, setorFiltro]);

  useEffect(() => {
    if (ctxLoading) return;
    if (!hospitalId) { setLoading(false); return; }
    (async () => {
      const { data, error } = await (supabase.from("indicadores_records" as any).select("*") as any)
        .eq("hospital_id", hospitalId).order("data_vigilancia", { ascending: false });
      if (error) console.error("Erro ao buscar indicadores:", error);
      const rows = data || [];
      setRecords(rows);
      const setoresDisponiveis = Array.from(
        new Set(rows.map((r: any) => r.setor).filter(Boolean))
      ) as string[];
      setSetorFiltro((prev) => {
        if (prev.length > 0) {
          const validos = prev.filter((s) => setoresDisponiveis.includes(s));
          return validos.length > 0 ? validos : setoresDisponiveis;
        }
        return setoresDisponiveis;
      });
      const anosDisp = Array.from(
        new Set(rows.map((r: any) => String(r.ano_vigilancia)).filter(Boolean))
      ) as string[];
      setAnoFiltro((prev) => {
        const validos = prev.filter((a) => anosDisp.includes(a));
        return validos.length > 0 ? validos : anosDisp;
      });
      setLoading(false);
    })();
  }, [hospitalId, ctxLoading]);

  const anosDisponiveis = useMemo(() => {
    const s = new Set(records.map((r: any) => String(r.ano_vigilancia)));
    return Array.from(s).sort();
  }, [records]);

  const filtered = useMemo(() => records.filter((r: any) => {
    if (mesFiltro.length > 0 && !mesFiltro.includes(r.mes_vigilancia)) return false;
    if (anoFiltro.length > 0 && !anoFiltro.includes(String(r.ano_vigilancia))) return false;
    if (setorFiltro.length > 0 && !setorFiltro.includes(r.setor)) return false;
    return true;
  }), [records, mesFiltro, anoFiltro, setorFiltro]);

  // Aggregated inputs
  const agg = useMemo(() => {
    const a = {
      numInfeccoes: 0, numPacienteDiaTotal: 0, numSaidas: 0, numObitosInfeccao: 0,
      numPacientesInfeccaoHospitalar: 0, numObitosTotal: 0,
      utilizacaoCVC: 0, infeccaoCVC: 0, utilizacaoVM: 0, infeccaoVM: 0,
      utilizacaoSVD: 0, infeccaoSVD: 0,
      infeccaoTratoUrinario: 0, infeccaoSitioCirurgico: 0, infeccaoTratoRespiratorio: 0,
      infeccaoPele: 0, infeccaoCorrenteSanguinea: 0, outrasInfeccoes: 0,
      numAntibioticosUtilizados: 0, numInfeccoesImportadas: 0,
      numAdmissoes: 0, numPacientesUtiInicio: 0, numDiasUtiInicio: 0,
      numDiasUtiSubsequente: 0,
    };
    filtered.forEach((r: any) => {
      const v = r.inputs || {};
      Object.keys(a).forEach(k => { (a as any)[k] += (v[k] || 0); });
    });
    return a;
  }, [filtered]);

  // Monthly data for line charts
  const monthlyData = useMemo(() => {
    return mesesOptions.map((mes, idx) => {
      const recs = filtered.filter((r: any) => r.mes_vigilancia === mes);
      if (!recs.length) return null;
      const m: any = { numInfeccoes: 0, numPacienteDiaTotal: 0, numObitosInfeccao: 0, numPacientesInfeccaoHospitalar: 0,
        utilizacaoCVC: 0, infeccaoCVC: 0, utilizacaoVM: 0, infeccaoVM: 0, utilizacaoSVD: 0, infeccaoSVD: 0,
        numAntibioticosUtilizados: 0, numAdmissoes: 0, numPacientesUtiInicio: 0, numInfeccoesImportadas: 0,
        numDiasUtiInicio: 0, numDiasUtiSubsequente: 0 };
      recs.forEach((r: any) => { const v = r.inputs || {}; Object.keys(m).forEach(k => { m[k] += (v[k] || 0); }); });
      const pacExp = m.numAdmissoes + m.numPacientesUtiInicio;
      return {
        mes: mesesAbrev[idx],
        taxaInfeccao: safeDiv(m.numInfeccoes, m.numPacienteDiaTotal, 1000),
        taxaLetalidade: safeDiv(m.numObitosInfeccao, m.numPacientesInfeccaoHospitalar, 100),
        numInfeccoes: m.numInfeccoes,
        numObitosInfeccao: m.numObitosInfeccao,
        utilizacaoCVC: m.utilizacaoCVC, utilizacaoVM: m.utilizacaoVM, utilizacaoSVD: m.utilizacaoSVD,
        infeccaoCVC: m.infeccaoCVC, infeccaoVM: m.infeccaoVM, infeccaoSVD: m.infeccaoSVD,
        taxaUtilCVC: safeDiv(m.utilizacaoCVC, m.numPacienteDiaTotal, 100),
        taxaUtilVM: safeDiv(m.utilizacaoVM, m.numPacienteDiaTotal, 100),
        taxaUtilSVD: safeDiv(m.utilizacaoSVD, m.numPacienteDiaTotal, 100),
        taxaInfCVC: safeDiv(m.infeccaoCVC, m.utilizacaoCVC, 1000),
        taxaInfVM: safeDiv(m.infeccaoVM, m.utilizacaoVM, 1000),
        taxaInfSVD: safeDiv(m.infeccaoSVD, m.utilizacaoSVD, 1000),
        numInfeccoesImportadas: m.numInfeccoesImportadas,
        tempoPermanencia: safeDiv(
          m.numPacientesUtiInicio + m.numPacienteDiaTotal + m.numDiasUtiSubsequente,
          m.numDiasUtiInicio + m.numAdmissoes, 1
        ),
        taxaUsoAtb: safeDiv(m.numAntibioticosUtilizados, pacExp, 100),
      };
    }).filter(Boolean) as any[];
  }, [filtered]);

  // Calculated KPIs
  const pacienteExposto = agg.numAdmissoes + agg.numPacientesUtiInicio;
  const taxaInfeccao = safeDiv(agg.numInfeccoes, agg.numPacienteDiaTotal, 1000);
  const taxaLetalidade = safeDiv(agg.numObitosInfeccao, agg.numPacientesInfeccaoHospitalar, 100);
  const taxaInfCVC = safeDiv(agg.infeccaoCVC, agg.utilizacaoCVC, 1000);
  const taxaInfVM = safeDiv(agg.infeccaoVM, agg.utilizacaoVM, 1000);
  const taxaInfSVD = safeDiv(agg.infeccaoSVD, agg.utilizacaoSVD, 1000);
  const taxaUtilCVC = safeDiv(agg.utilizacaoCVC, agg.numPacienteDiaTotal, 100);
  const taxaUtilVM = safeDiv(agg.utilizacaoVM, agg.numPacienteDiaTotal, 100);
  const taxaUtilSVD = safeDiv(agg.utilizacaoSVD, agg.numPacienteDiaTotal, 100);
  const tempoPermanencia = safeDiv(
    agg.numPacientesUtiInicio + agg.numPacienteDiaTotal + agg.numDiasUtiSubsequente,
    agg.numDiasUtiInicio + agg.numAdmissoes, 1
  );
  const taxaUsoAtb = safeDiv(agg.numAntibioticosUtilizados, pacienteExposto, 100);

  // ====== Médias anuais ======
  // Agrupa registros do ano selecionado (ignorando filtro de mês) por mês para calcular médias mensais
  const yearlyMonthly = useMemo(() => {
    const baseRecords = records.filter((r: any) => {
      if (anoFiltro.length > 0 && !anoFiltro.includes(String(r.ano_vigilancia))) return false;
      if (setorFiltro.length > 0 && !setorFiltro.includes(r.setor)) return false;
      return true;
    });
    return mesesOptions.map((mes) => {
      const recs = baseRecords.filter((r: any) => r.mes_vigilancia === mes);
      if (!recs.length) return null;
      const m: any = {
        numInfeccoes: 0, numPacienteDiaTotal: 0, numObitosInfeccao: 0, numPacientesInfeccaoHospitalar: 0,
        utilizacaoCVC: 0, infeccaoCVC: 0, utilizacaoVM: 0, infeccaoVM: 0, utilizacaoSVD: 0, infeccaoSVD: 0,
        numAdmissoes: 0, numPacientesUtiInicio: 0, numDiasUtiInicio: 0, numDiasUtiSubsequente: 0,
      };
      recs.forEach((r: any) => { const v = r.inputs || {}; Object.keys(m).forEach(k => { m[k] += (v[k] || 0); }); });
      return {
        taxaInfeccao: safeDiv(m.numInfeccoes, m.numPacienteDiaTotal, 1000),
        taxaLetalidade: safeDiv(m.numObitosInfeccao, m.numPacientesInfeccaoHospitalar, 100),
        taxaInfCVC: safeDiv(m.infeccaoCVC, m.utilizacaoCVC, 1000),
        taxaInfVM: safeDiv(m.infeccaoVM, m.utilizacaoVM, 1000),
        taxaInfSVD: safeDiv(m.infeccaoSVD, m.utilizacaoSVD, 1000),
        taxaInfDispositivo: safeDiv(
          m.infeccaoCVC + m.infeccaoVM + m.infeccaoSVD,
          m.utilizacaoCVC + m.utilizacaoVM + m.utilizacaoSVD,
          1000,
        ),
        infeccoesDispositivo: m.infeccaoCVC + m.infeccaoVM + m.infeccaoSVD,
        numInfeccoes: m.numInfeccoes,
        numObitos: m.numObitosInfeccao,
        tempoPermanencia: safeDiv(
          m.numPacientesUtiInicio + m.numPacienteDiaTotal + m.numDiasUtiSubsequente,
          m.numDiasUtiInicio + m.numAdmissoes, 1
        ),
      };
    }).filter(Boolean) as any[];
  }, [records, anoFiltro, setorFiltro]);

  const mean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

  const mediaAnual = useMemo(() => {
    const m = yearlyMonthly;
    return {
      taxaInfeccao: mean(m.map(x => x.taxaInfeccao)),
      taxaLetalidade: mean(m.map(x => x.taxaLetalidade)),
      taxaInfDispositivo: mean(m.map(x => x.taxaInfDispositivo)),
      taxaInfPAV: mean(m.map(x => x.taxaInfVM)),
      taxaInfSVD: mean(m.map(x => x.taxaInfSVD)),
      taxaInfCVC: mean(m.map(x => x.taxaInfCVC)),
      tempoPermanencia: mean(m.map(x => x.tempoPermanencia)),
      infeccoesDispositivoMes: mean(m.map(x => x.infeccoesDispositivo)),
      obitosMes: mean(m.map(x => x.numObitos)),
      infeccoesMes: mean(m.map(x => x.numInfeccoes)),
      mesesComDados: m.length,
    };
  }, [yearlyMonthly]);

  // ====== Quantitativo mensal (números absolutos) ======
  const quantitativoMonthly = useMemo(() => {
    return mesesOptions.map((mes, idx) => {
      const recs = filtered.filter((r: any) => r.mes_vigilancia === mes);
      if (!recs.length) return null;
      const m: any = {
        numPacienteDiaTotal: 0, numAdmissoes: 0, numSaidas: 0, numAltas: 0,
        numObitosTotal: 0, numObitosInfeccao: 0, numInfeccoes: 0,
        utilizacaoCVC: 0, infeccaoCVC: 0,
        utilizacaoVM: 0, infeccaoVM: 0,
        utilizacaoSVD: 0, infeccaoSVD: 0,
        numAntibioticosUtilizados: 0,
      };
      recs.forEach((r: any) => {
        const v = r.inputs || {};
        Object.keys(m).forEach(k => { m[k] += (v[k] || 0); });
      });
      return { mes: mesesAbrev[idx], ...m };
    }).filter(Boolean) as any[];
  }, [filtered]);

  const quantitativoTotals = useMemo(() => {
    const t: any = {
      numPacienteDiaTotal: 0, numAdmissoes: 0, numSaidas: 0, numAltas: 0,
      numObitosTotal: 0, numObitosInfeccao: 0, numInfeccoes: 0,
      utilizacaoCVC: 0, infeccaoCVC: 0,
      utilizacaoVM: 0, infeccaoVM: 0,
      utilizacaoSVD: 0, infeccaoSVD: 0,
      numAntibioticosUtilizados: 0,
    };
    quantitativoMonthly.forEach((m: any) => {
      Object.keys(t).forEach(k => { t[k] += (m[k] || 0); });
    });
    return t;
  }, [quantitativoMonthly]);

  // ====== Dados por peso do RN (UTI Neonatal) ======
  const neonatalWeightMonthly = useMemo(() => {
    const neonatalRecs = filtered.filter((r: any) => r.setor === "UTI Neonatal");
    if (!neonatalRecs.length) return null;
    const monthly = mesesOptions.map((mes, idx) => {
      const recs = neonatalRecs.filter((r: any) => r.mes_vigilancia === mes);
      if (!recs.length) return null;
      const w: any = { mes: mesesAbrev[idx] };
      neonatalWeightCategories.forEach(cat => { w[cat.id] = 0; });
      recs.forEach((r: any) => {
        const pd = (r.inputs || {}).neonatalPacienteDiaPorPeso || {};
        neonatalWeightCategories.forEach(cat => { w[cat.id] += (pd[cat.id] || 0); });
      });
      w.total = neonatalWeightCategories.reduce((s, cat) => s + w[cat.id], 0);
      return w;
    }).filter(Boolean) as any[];
    const totals: any = { total: 0 };
    neonatalWeightCategories.forEach(cat => { totals[cat.id] = 0; });
    monthly.forEach((m: any) => {
      neonatalWeightCategories.forEach(cat => { totals[cat.id] += m[cat.id]; });
      totals.total += m.total;
    });
    return { monthly, totals };
  }, [filtered]);

  // ====== Comparativo anual (Ano vs Ano) ======
  // Ignora filtro de ano e mês — agrega por ano+mês para todos os anos disponíveis
  const yearsCompare = useMemo(() => {
    const baseRecords = records.filter((r: any) => {
      if (setorFiltro.length > 0 && !setorFiltro.includes(r.setor)) return false;
      return true;
    });
    const years = Array.from(new Set(baseRecords.map((r: any) => String(r.ano_vigilancia)))).sort();
    const byYearMonth: Record<string, Record<string, any>> = {};
    years.forEach((y) => {
      byYearMonth[y] = {};
      mesesOptions.forEach((mes) => {
        const recs = baseRecords.filter((r: any) => String(r.ano_vigilancia) === y && r.mes_vigilancia === mes);
        const m: any = {
          numInfeccoes: 0, numPacienteDiaTotal: 0, numObitosInfeccao: 0, numPacientesInfeccaoHospitalar: 0,
          utilizacaoCVC: 0, infeccaoCVC: 0, utilizacaoVM: 0, infeccaoVM: 0, utilizacaoSVD: 0, infeccaoSVD: 0,
          numAntibioticosUtilizados: 0, numAdmissoes: 0, numPacientesUtiInicio: 0,
          numDiasUtiInicio: 0, numDiasUtiSubsequente: 0,
        };
        recs.forEach((r: any) => { const v = r.inputs || {}; Object.keys(m).forEach((k) => { m[k] += (v[k] || 0); }); });
        const pacExp = m.numAdmissoes + m.numPacientesUtiInicio;
        byYearMonth[y][mes] = {
          taxaInfeccao: safeDiv(m.numInfeccoes, m.numPacienteDiaTotal, 1000),
          taxaLetalidade: safeDiv(m.numObitosInfeccao, m.numPacientesInfeccaoHospitalar, 100),
          numInfeccoes: m.numInfeccoes,
          taxaInfCVC: safeDiv(m.infeccaoCVC, m.utilizacaoCVC, 1000),
          taxaInfVM: safeDiv(m.infeccaoVM, m.utilizacaoVM, 1000),
          taxaInfSVD: safeDiv(m.infeccaoSVD, m.utilizacaoSVD, 1000),
          taxaUtilCVC: safeDiv(m.utilizacaoCVC, m.numPacienteDiaTotal, 100),
          taxaUtilVM: safeDiv(m.utilizacaoVM, m.numPacienteDiaTotal, 100),
          taxaUtilSVD: safeDiv(m.utilizacaoSVD, m.numPacienteDiaTotal, 100),
          infeccoesDispositivo: m.infeccaoCVC + m.infeccaoVM + m.infeccaoSVD,
          tempoPermanencia: safeDiv(
            m.numPacientesUtiInicio + m.numPacienteDiaTotal + m.numDiasUtiSubsequente,
            m.numDiasUtiInicio + m.numAdmissoes, 1,
          ),
          taxaUsoAtb: safeDiv(m.numAntibioticosUtilizados, pacExp, 100),
        };
      });
    });
    const buildSeries = (metric: string) => mesesOptions.map((mes, idx) => {
      const row: any = { mes: mesesAbrev[idx] };
      years.forEach((y) => { row[y] = byYearMonth[y][mes][metric]; });
      return row;
    });
    return { years, buildSeries };
  }, [records, setorFiltro]);

  const renderYearComparisonChart = (title: string, metric: string, unit: string, metaKey?: string) => {
    if (yearsCompare.years.length < 1) return null;
    const data = yearsCompare.buildSeries(metric);
    const key = metaKey || `cmp_${metric}`;
    return (
      <YearComparisonChart
        title={title}
        unit={unit}
        years={yearsCompare.years}
        data={data}
        metaValue={metas[key]}
        onMetaChange={(v) => setMeta(key, v)}
      />
    );
  };


  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (records.length === 0) return (
    <div className="flex items-center justify-center min-h-[400px] p-6">
      <div className="text-center space-y-4">
        <div className="p-4 rounded-full bg-primary/10 mx-auto w-fit">
          <Activity className="h-10 w-10 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Nenhum indicador registrado</h3>
        <p className="text-sm text-muted-foreground max-w-md">Cadastre indicadores na página de entrada de dados para visualizar o dashboard.</p>
      </div>
    </div>
  );

  const clearFilters = () => { setMesFiltro([]); setAnoFiltro([String(new Date().getFullYear())]); setSetorFiltro([]); };

  const buildInsights = (): string[] => {
    const ins: string[] = [];
    ins.push(`📊 Taxa de infecção hospitalar: ${taxaInfeccao.toFixed(2)}‰ (${agg.numInfeccoes} infecções / ${agg.numPacienteDiaTotal} pac-dia).`);
    ins.push(`💀 Taxa de letalidade: ${taxaLetalidade.toFixed(2)}% (${agg.numObitosInfeccao} óbitos por infecção em ${agg.numPacientesInfeccaoHospitalar} pacientes infectados).`);
    ins.push(`💉 CVC: taxa de uso ${taxaUtilCVC.toFixed(2)}%, taxa de infecção ${taxaInfCVC.toFixed(2)}‰.`);
    ins.push(`🔧 SVD: taxa de uso ${taxaUtilSVD.toFixed(2)}%, taxa de infecção ${taxaInfSVD.toFixed(2)}‰.`);
    ins.push(`🌬️ VM: taxa de uso ${taxaUtilVM.toFixed(2)}%, taxa de infecção ${taxaInfVM.toFixed(2)}‰.`);
    ins.push(`⏱️ Tempo médio de permanência: ${tempoPermanencia.toFixed(2)} dias.`);
    ins.push(`💊 Taxa de uso de ATB: ${taxaUsoAtb.toFixed(2)}% (${agg.numAntibioticosUtilizados}/${pacienteExposto}).`);
    if (taxaInfeccao > 10) ins.push(`🚨 Taxa de infecção acima de 10‰ — ações corretivas urgentes recomendadas.`);
    if (taxaLetalidade > 20) ins.push(`🚨 Letalidade elevada (>20%) — revisar protocolos assistenciais.`);
    if (taxaInfCVC > 5) ins.push(`🚨 Infecção em CVC acima de 5‰ — revisar bundle de prevenção.`);
    if (taxaUsoAtb > 60) ins.push(`💡 Uso elevado de antibióticos — avaliar programa de stewardship.`);
    return ins;
  };

  const insightsKey = `${mesFiltro}|${anoFiltro}|${setorFiltro}|${filtered.length}`;

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg md:text-2xl font-bold text-foreground font-heading">Dashboard de Indicadores</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Análise gamificada dos indicadores epidemiológicos</p>
          </div>
        </div>
        <div className="flex gap-2">
          <DashboardAIInsights generateInsights={buildInsights} />
          <Button variant="outline" size="sm" onClick={exportTabPdf} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileDown className="h-4 w-4 mr-1" />}
            Exportar Aba PDF
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mês</label>
              <MultiSelectFilter
                label="Mês"
                selected={mesFiltro}
                onChange={setMesFiltro}
                options={mesesOptions.map(m => ({ value: m, label: m }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ano</label>
              <MultiSelectFilter
                label="Ano"
                selected={anoFiltro}
                onChange={setAnoFiltro}
                options={anosDisponiveis.map(a => ({ value: a, label: a }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Setor</label>
              <MultiSelectFilter
                label="Setor"
                selected={setorFiltro}
                onChange={setSetorFiltro}
                options={setorOptions.map(s => ({ value: s, label: s }))}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 justify-end">
            <Button variant="outline" size="sm" className="h-9 gap-1.5">
              <Filter className="h-3.5 w-3.5" />Filtrar
            </Button>
            <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="w-full flex flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="infeccao" className="flex-1 min-w-[120px] text-xs gap-1.5"><Bug className="h-3.5 w-3.5" />Infecção</TabsTrigger>
          <TabsTrigger value="dispositivos" className="flex-1 min-w-[120px] text-xs gap-1.5"><Syringe className="h-3.5 w-3.5" />Dispositivos</TabsTrigger>
          <TabsTrigger value="taxas" className="flex-1 min-w-[120px] text-xs gap-1.5"><ShieldAlert className="h-3.5 w-3.5" />Taxas Específicas</TabsTrigger>
          <TabsTrigger value="permanencia" className="flex-1 min-w-[120px] text-xs gap-1.5"><Timer className="h-3.5 w-3.5" />Permanência / ATB</TabsTrigger>
          <TabsTrigger value="quantitativo" className="flex-1 min-w-[120px] text-xs gap-1.5"><BarChart2 className="h-3.5 w-3.5" />Quantitativo</TabsTrigger>
        </TabsList>

        {/* ====== TAB 1: Infecção ====== */}
        <TabsContent value="infeccao" className="space-y-4">
          <div ref={tabRefs.infeccao} className="space-y-4 bg-background p-1">
            {/* Dados base — sempre visíveis mesmo com infecções zeradas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Total Paciente-Dia" value={agg.numPacienteDiaTotal} unit="" icon={Activity} color="hsl(168,66%,34%)" />
              <KpiCard label="Total Admissões" value={agg.numAdmissoes} unit="" icon={Users} color="hsl(217,91%,60%)" />
              <KpiCard label="Total Saídas" value={agg.numSaidas} unit="" icon={TrendingUp} color="hsl(38,92%,50%)" />
              <KpiCard label="Antibióticos Utilizados" value={agg.numAntibioticosUtilizados} unit="" icon={Syringe} color="hsl(262,83%,58%)" />
            </div>
            {/* KPIs de infecção */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Taxa de Infecção Hospitalar" value={taxaInfeccao} unit="‰" icon={Bug} color="hsl(0,72%,51%)" />
              <KpiCard label="Nº Óbitos c/ Infecção" value={agg.numObitosInfeccao} unit="" icon={Skull} color="hsl(262,83%,58%)" />
              <KpiCard label="Nº de Infecções" value={agg.numInfeccoes} unit="" icon={Thermometer} color="hsl(38,92%,50%)" />
              <KpiCard label="Taxa de Letalidade" value={taxaLetalidade} unit="%" icon={Heart} color="hsl(330,81%,60%)" />
            </div>

            {monthlyData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card ref={chartRefs.taxaInfeccaoMes}>
                  <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Taxa de Infecção Hospitalar por Mês (‰)</CardTitle>
                    <ChartActions chartRef={chartRefs.taxaInfeccaoMes} chartTitle="Taxa Infecção Hospitalar" metaValue={metas.taxaInfeccao} onMetaChange={v => setMeta("taxaInfeccao", v)} metaUnit="‰" />
                  </CardHeader>
                  <CardContent className="p-3 pt-2">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} width={35} />
                        <Tooltip />
                        <Bar dataKey="taxaInfeccao" name="Taxa Infecção" fill="hsl(0 72% 51%)" radius={[4,4,0,0]} ><LabelList dataKey="taxaInfeccao" position="top" style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} /></Bar>
                        {metas.taxaInfeccao !== undefined && <ReferenceLine y={metas.taxaInfeccao} stroke="hsl(168 66% 34%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta: ${metas.taxaInfeccao}`, position: "right", fontSize: 10, fill: "hsl(168 66% 34%)" }} />}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card ref={chartRefs.obitosInfeccoesMes}>
                  <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Óbitos e Infecções por Mês</CardTitle>
                    <ChartActions chartRef={chartRefs.obitosInfeccoesMes} chartTitle="Óbitos e Infecções" metaValue={metas.obitosInfeccoes} onMetaChange={v => setMeta("obitosInfeccoes", v)} />
                  </CardHeader>
                  <CardContent className="p-3 pt-2">
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} width={35} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        <Line type="monotone" dataKey="numInfeccoes" name="Infecções" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ r: 3 }}  label={{ position: "top", fontSize: 9, fill: "hsl(var(--foreground))" }} />
                        <Line type="monotone" dataKey="numObitosInfeccao" name="Óbitos" stroke="hsl(262 83% 58%)" strokeWidth={2} dot={{ r: 3 }}  label={{ position: "top", fontSize: 9, fill: "hsl(var(--foreground))" }} />
                        {metas.obitosInfeccoes !== undefined && <ReferenceLine y={metas.obitosInfeccoes} stroke="hsl(168 66% 34%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta: ${metas.obitosInfeccoes}`, position: "right", fontSize: 10, fill: "hsl(168 66% 34%)" }} />}
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card ref={chartRefs.taxaLetalidadeMes} className="lg:col-span-2">
                  <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm">Taxa de Letalidade por Mês (%)</CardTitle>
                    <ChartActions chartRef={chartRefs.taxaLetalidadeMes} chartTitle="Taxa Letalidade" metaValue={metas.taxaLetalidade} onMetaChange={v => setMeta("taxaLetalidade", v)} metaUnit="%" />
                  </CardHeader>
                  <CardContent className="p-3 pt-2">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} width={35} />
                        <Tooltip />
                        <Bar dataKey="taxaLetalidade" name="Letalidade %" fill="hsl(330 81% 60%)" radius={[4,4,0,0]} ><LabelList dataKey="taxaLetalidade" position="top" style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} /></Bar>
                        {metas.taxaLetalidade !== undefined && <ReferenceLine y={metas.taxaLetalidade} stroke="hsl(168 66% 34%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta: ${metas.taxaLetalidade}`, position: "right", fontSize: 10, fill: "hsl(168 66% 34%)" }} />}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
              </Card>
            </div>
          )}
          {renderYearComparisonChart("Taxa de Infecção Hospitalar", "taxaInfeccao", "‰")}
          {renderYearComparisonChart("Taxa de Letalidade", "taxaLetalidade", "%")}
          </div>
        </TabsContent>

        {/* ====== TAB 2: Dispositivos ====== */}
        <TabsContent value="dispositivos" className="space-y-4">
          <div ref={tabRefs.dispositivos} className="space-y-4 bg-background p-1">
          {/* Gauge cards */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <Card><CardContent className="p-4 flex flex-col items-center"><GaugeChart value={taxaUtilCVC} max={100} label="Taxa Util. CVC (%)" color="hsl(217,91%,60%)" /></CardContent></Card>
            <Card><CardContent className="p-4 flex flex-col items-center"><GaugeChart value={taxaUtilSVD} max={100} label="Taxa Util. SVD (%)" color="hsl(168,66%,34%)" /></CardContent></Card>
            <Card><CardContent className="p-4 flex flex-col items-center"><GaugeChart value={taxaUtilVM} max={100} label="Taxa Util. VM (%)" color="hsl(38,92%,50%)" /></CardContent></Card>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <KpiCard label="Utilização CVC" value={agg.utilizacaoCVC} unit="" icon={Syringe} color="hsl(217,91%,60%)" />
            <KpiCard label="Utilização SVD" value={agg.utilizacaoSVD} unit="" icon={Syringe} color="hsl(168,66%,34%)" />
            <KpiCard label="Utilização VM" value={agg.utilizacaoVM} unit="" icon={Syringe} color="hsl(38,92%,50%)" />
            <KpiCard label="Infecção CVC" value={agg.infeccaoCVC} unit="" icon={Bug} color="hsl(0,72%,51%)" />
            <KpiCard label="Infecção SVD" value={agg.infeccaoSVD} unit="" icon={Bug} color="hsl(330,81%,60%)" />
            <KpiCard label="Infecção VM" value={agg.infeccaoVM} unit="" icon={Bug} color="hsl(262,83%,58%)" />
          </div>

          {monthlyData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card ref={chartRefs.infeccaoDispositivo}>
                <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Nº Infecção por Dispositivo / Mês</CardTitle>
                  <ChartActions chartRef={chartRefs.infeccaoDispositivo} chartTitle="Infecção por Dispositivo" metaFields={[
                    { key: "infCVC", label: "Meta CVC", value: metas.infCVC, onChange: v => setMeta("infCVC", v) },
                    { key: "infSVD", label: "Meta SVD", value: metas.infSVD, onChange: v => setMeta("infSVD", v) },
                    { key: "infVM",  label: "Meta VM",  value: metas.infVM,  onChange: v => setMeta("infVM", v) },
                  ]} />
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="infeccaoCVC" name="CVC" fill="hsl(217 91% 60%)" radius={[4,4,0,0]} ><LabelList dataKey="infeccaoCVC" position="top" style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} /></Bar>
                      <Bar dataKey="infeccaoSVD" name="SVD" fill="hsl(168 66% 34%)" radius={[4,4,0,0]} ><LabelList dataKey="infeccaoSVD" position="top" style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} /></Bar>
                      <Bar dataKey="infeccaoVM" name="VM" fill="hsl(38 92% 50%)" radius={[4,4,0,0]} ><LabelList dataKey="infeccaoVM" position="top" style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} /></Bar>
                      {metas.infCVC !== undefined && <ReferenceLine y={metas.infCVC} stroke="hsl(217 91% 60%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta CVC: ${metas.infCVC}`, position: "right", fontSize: 10, fill: "hsl(217 91% 60%)" }} />}
                      {metas.infSVD !== undefined && <ReferenceLine y={metas.infSVD} stroke="hsl(168 66% 34%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta SVD: ${metas.infSVD}`, position: "right", fontSize: 10, fill: "hsl(168 66% 34%)" }} />}
                      {metas.infVM !== undefined && <ReferenceLine y={metas.infVM} stroke="hsl(38 92% 50%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta VM: ${metas.infVM}`, position: "right", fontSize: 10, fill: "hsl(38 92% 50%)" }} />}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card ref={chartRefs.taxaInfDispositivo}>
                <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Taxa de Infecção por Dispositivo (‰)</CardTitle>
                  <ChartActions chartRef={chartRefs.taxaInfDispositivo} chartTitle="Taxa Inf Dispositivo" metaUnit="‰" metaFields={[
                    { key: "taxaInfCVC", label: "Meta CVC", value: metas.taxaInfCVC, onChange: v => setMeta("taxaInfCVC", v) },
                    { key: "taxaInfSVD", label: "Meta SVD", value: metas.taxaInfSVD, onChange: v => setMeta("taxaInfSVD", v) },
                    { key: "taxaInfVM",  label: "Meta VM",  value: metas.taxaInfVM,  onChange: v => setMeta("taxaInfVM", v) },
                  ]} />
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="taxaInfCVC" name="CVC ‰" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 3 }}  label={{ position: "top", fontSize: 9, fill: "hsl(var(--foreground))" }} />
                      <Line type="monotone" dataKey="taxaInfSVD" name="SVD ‰" stroke="hsl(168 66% 34%)" strokeWidth={2} dot={{ r: 3 }}  label={{ position: "top", fontSize: 9, fill: "hsl(var(--foreground))" }} />
                      <Line type="monotone" dataKey="taxaInfVM" name="VM ‰" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={{ r: 3 }}  label={{ position: "top", fontSize: 9, fill: "hsl(var(--foreground))" }} />
                      {metas.taxaInfCVC !== undefined && <ReferenceLine y={metas.taxaInfCVC} stroke="hsl(217 91% 60%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta CVC: ${metas.taxaInfCVC}‰`, position: "right", fontSize: 10, fill: "hsl(217 91% 60%)" }} />}
                      {metas.taxaInfSVD !== undefined && <ReferenceLine y={metas.taxaInfSVD} stroke="hsl(168 66% 34%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta SVD: ${metas.taxaInfSVD}‰`, position: "right", fontSize: 10, fill: "hsl(168 66% 34%)" }} />}
                      {metas.taxaInfVM !== undefined && <ReferenceLine y={metas.taxaInfVM} stroke="hsl(38 92% 50%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta VM: ${metas.taxaInfVM}‰`, position: "right", fontSize: 10, fill: "hsl(38 92% 50%)" }} />}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
          {renderYearComparisonChart("Infecções por Dispositivo (CVC+SVD+VM)", "infeccoesDispositivo", "")}

          {/* Comparativo Anual - Taxa de Utilização dos Dispositivos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {renderYearComparisonChart("Taxa de Utilização CVC", "taxaUtilCVC", "%", "cmpTaxaUtilCVC")}
            {renderYearComparisonChart("Taxa de Utilização SVD", "taxaUtilSVD", "%", "cmpTaxaUtilSVD")}
            {renderYearComparisonChart("Taxa de Utilização VM", "taxaUtilVM", "%", "cmpTaxaUtilVM")}
            {renderYearComparisonChart("Taxa de Infecção CVC", "taxaInfCVC", "‰", "cmpTaxaInfCVC")}
            {renderYearComparisonChart("Taxa de Infecção SVD", "taxaInfSVD", "‰", "cmpTaxaInfSVD")}
            {renderYearComparisonChart("Taxa de Infecção VM", "taxaInfVM", "‰", "cmpTaxaInfVM")}
          </div>
          </div>
        </TabsContent>

        {/* ====== TAB 3: Taxas Específicas ====== */}
        <TabsContent value="taxas" className="space-y-4">
          <div ref={tabRefs.taxas} className="space-y-4 bg-background p-1">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <KpiCard label="Taxa Inf. PAV (VM)" value={taxaInfVM} unit="‰" icon={ShieldAlert} color="hsl(38,92%,50%)" />
            <KpiCard label="Taxa Inf. CVC" value={taxaInfCVC} unit="‰" icon={ShieldAlert} color="hsl(217,91%,60%)" />
            <KpiCard label="Taxa Inf. SVD" value={taxaInfSVD} unit="‰" icon={ShieldAlert} color="hsl(168,66%,34%)" />
            <KpiCard label="Infecções Importadas" value={agg.numInfeccoesImportadas} unit="" icon={TrendingUp} color="hsl(262,83%,58%)" />
            <KpiCard label="Infecção Hospitalar" value={agg.numPacientesInfeccaoHospitalar} unit="" icon={Bug} color="hsl(0,72%,51%)" />
          </div>

          {monthlyData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card ref={chartRefs.taxasPavCvcSvd}>
                <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Taxas de Infecção PAV / CVC / SVD por Mês (‰)</CardTitle>
                  <ChartActions chartRef={chartRefs.taxasPavCvcSvd} chartTitle="Taxas PAV CVC SVD" metaValue={metas.taxasPav} onMetaChange={v => setMeta("taxasPav", v)} metaUnit="‰" />
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="taxaInfVM" name="PAV (VM)" fill="hsl(38 92% 50%)" radius={[4,4,0,0]} ><LabelList dataKey="taxaInfVM" position="top" style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} /></Bar>
                      <Bar dataKey="taxaInfCVC" name="CVC" fill="hsl(217 91% 60%)" radius={[4,4,0,0]} ><LabelList dataKey="taxaInfCVC" position="top" style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} /></Bar>
                      <Bar dataKey="taxaInfSVD" name="SVD" fill="hsl(168 66% 34%)" radius={[4,4,0,0]} ><LabelList dataKey="taxaInfSVD" position="top" style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} /></Bar>
                      {metas.taxasPav !== undefined && <ReferenceLine y={metas.taxasPav} stroke="hsl(0 72% 51%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta: ${metas.taxasPav}`, position: "right", fontSize: 10, fill: "hsl(0 72% 51%)" }} />}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card ref={chartRefs.importadasHospitalares}>
                <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Infecções Importadas vs Hospitalares</CardTitle>
                  <ChartActions chartRef={chartRefs.importadasHospitalares} chartTitle="Importadas vs Hospitalares" metaValue={metas.importadas} onMetaChange={v => setMeta("importadas", v)} />
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={35} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Bar dataKey="numInfeccoesImportadas" name="Importadas" fill="hsl(262 83% 58%)" radius={[4,4,0,0]} ><LabelList dataKey="numInfeccoesImportadas" position="top" style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} /></Bar>
                      <Bar dataKey="numInfeccoes" name="Hospitalares" fill="hsl(0 72% 51%)" radius={[4,4,0,0]} ><LabelList dataKey="numInfeccoes" position="top" style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} /></Bar>
                      {metas.importadas !== undefined && <ReferenceLine y={metas.importadas} stroke="hsl(168 66% 34%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta: ${metas.importadas}`, position: "right", fontSize: 10, fill: "hsl(168 66% 34%)" }} />}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
          {renderYearComparisonChart("Taxa de Infecção CVC", "taxaInfCVC", "‰")}
          {renderYearComparisonChart("Taxa de Infecção PAV (VM)", "taxaInfVM", "‰")}
          {renderYearComparisonChart("Taxa de Infecção SVD", "taxaInfSVD", "‰")}
          </div>
        </TabsContent>

        {/* ====== TAB 4: Permanência / ATB ====== */}
        <TabsContent value="permanencia" className="space-y-4">
          <div ref={tabRefs.permanencia} className="space-y-4 bg-background p-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <KpiCard label="Tempo Médio de Permanência" value={tempoPermanencia} unit="dias" icon={Timer} color="hsl(168,66%,34%)" />
            <KpiCard label="Taxa Uso Antibióticos" value={taxaUsoAtb} unit="%" icon={Syringe} color="hsl(217,91%,60%)" />
          </div>

          {monthlyData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card ref={chartRefs.tempoPermanencia}>
                <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Tempo Médio de Permanência por Mês (dias)</CardTitle>
                  <ChartActions chartRef={chartRefs.tempoPermanencia} chartTitle="Tempo Permanência" metaValue={metas.permanencia} onMetaChange={v => setMeta("permanencia", v)} metaUnit="dias" />
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={40} />
                      <Tooltip />
                      <Bar dataKey="tempoPermanencia" name="Permanência" fill="hsl(168 66% 34%)" radius={[4,4,0,0]} ><LabelList dataKey="tempoPermanencia" position="top" style={{ fontSize: 9, fill: "hsl(var(--foreground))" }} /></Bar>
                      {metas.permanencia !== undefined && <ReferenceLine y={metas.permanencia} stroke="hsl(0 72% 51%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta: ${metas.permanencia}`, position: "right", fontSize: 10, fill: "hsl(0 72% 51%)" }} />}
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card ref={chartRefs.taxaUsoAtb}>
                <CardHeader className="p-4 pb-0 flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">Taxa de Uso de Antibióticos por Mês (%)</CardTitle>
                  <ChartActions chartRef={chartRefs.taxaUsoAtb} chartTitle="Taxa Uso ATB" metaValue={metas.usoAtb} onMetaChange={v => setMeta("usoAtb", v)} metaUnit="%" />
                </CardHeader>
                <CardContent className="p-3 pt-2">
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} width={40} />
                      <Tooltip />
                      <Line type="monotone" dataKey="taxaUsoAtb" name="Uso ATB %" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={{ r: 4 }}  label={{ position: "top", fontSize: 9, fill: "hsl(var(--foreground))" }} />
                      {metas.usoAtb !== undefined && <ReferenceLine y={metas.usoAtb} stroke="hsl(0 72% 51%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta: ${metas.usoAtb}`, position: "right", fontSize: 10, fill: "hsl(0 72% 51%)" }} />}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
          {renderYearComparisonChart("Tempo de Permanência", "tempoPermanencia", "dias")}
          {renderYearComparisonChart("Taxa de Uso de Antibióticos", "taxaUsoAtb", "%")}
          </div>
        </TabsContent>
        {/* ====== TAB 5: Quantitativo ====== */}
        <TabsContent value="quantitativo" className="space-y-4">
          <div ref={tabRefs.quantitativo} className="space-y-4 bg-background p-1">

            {/* KPIs de resumo */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard label="Total Paciente-Dia" value={agg.numPacienteDiaTotal} unit="" icon={Activity} color="hsl(168,66%,34%)" />
              <KpiCard label="Total Admissões" value={agg.numAdmissoes} unit="" icon={Users} color="hsl(217,91%,60%)" />
              <KpiCard label="Total Saídas" value={agg.numSaidas} unit="" icon={TrendingUp} color="hsl(38,92%,50%)" />
              <KpiCard label="Antibióticos Utilizados" value={agg.numAntibioticosUtilizados} unit="" icon={Syringe} color="hsl(262,83%,58%)" />
            </div>

            {/* Tabela mensal com números absolutos */}
            {quantitativoMonthly.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-primary" />
                    Dados Quantitativos Mensais
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 pb-2">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs min-w-[900px]">
                      <thead>
                        <tr className="border-b bg-muted/60">
                          <th className="text-left p-3 font-semibold">Mês</th>
                          <th className="text-right p-3 font-semibold">Pac-Dia</th>
                          <th className="text-right p-3 font-semibold">Admissões</th>
                          <th className="text-right p-3 font-semibold">Saídas</th>
                          <th className="text-right p-3 font-semibold">Altas</th>
                          <th className="text-right p-3 font-semibold">Infecções</th>
                          <th className="text-right p-3 font-semibold">Óbitos c/ Inf.</th>
                          <th className="text-right p-3 font-semibold">Óbitos Total</th>
                          <th className="text-right p-3 font-semibold">CVC-Dias</th>
                          <th className="text-right p-3 font-semibold">Inf. CVC</th>
                          <th className="text-right p-3 font-semibold">VM-Dias</th>
                          <th className="text-right p-3 font-semibold">Inf. VM</th>
                          <th className="text-right p-3 font-semibold">SVD-Dias</th>
                          <th className="text-right p-3 font-semibold">Inf. SVD</th>
                          <th className="text-right p-3 font-semibold">Antibióticos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quantitativoMonthly.map((m: any) => (
                          <tr key={m.mes} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-medium">{m.mes}</td>
                            <td className="text-right p-3">{m.numPacienteDiaTotal}</td>
                            <td className="text-right p-3">{m.numAdmissoes}</td>
                            <td className="text-right p-3">{m.numSaidas}</td>
                            <td className="text-right p-3">{m.numAltas}</td>
                            <td className="text-right p-3 font-semibold text-destructive">{m.numInfeccoes}</td>
                            <td className="text-right p-3">{m.numObitosInfeccao}</td>
                            <td className="text-right p-3">{m.numObitosTotal}</td>
                            <td className="text-right p-3">{m.utilizacaoCVC}</td>
                            <td className="text-right p-3">{m.infeccaoCVC}</td>
                            <td className="text-right p-3">{m.utilizacaoVM}</td>
                            <td className="text-right p-3">{m.infeccaoVM}</td>
                            <td className="text-right p-3">{m.utilizacaoSVD}</td>
                            <td className="text-right p-3">{m.infeccaoSVD}</td>
                            <td className="text-right p-3">{m.numAntibioticosUtilizados}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/60 font-bold text-sm border-t-2">
                          <td className="p-3">Total</td>
                          <td className="text-right p-3">{quantitativoTotals.numPacienteDiaTotal}</td>
                          <td className="text-right p-3">{quantitativoTotals.numAdmissoes}</td>
                          <td className="text-right p-3">{quantitativoTotals.numSaidas}</td>
                          <td className="text-right p-3">{quantitativoTotals.numAltas}</td>
                          <td className="text-right p-3 text-destructive">{quantitativoTotals.numInfeccoes}</td>
                          <td className="text-right p-3">{quantitativoTotals.numObitosInfeccao}</td>
                          <td className="text-right p-3">{quantitativoTotals.numObitosTotal}</td>
                          <td className="text-right p-3">{quantitativoTotals.utilizacaoCVC}</td>
                          <td className="text-right p-3">{quantitativoTotals.infeccaoCVC}</td>
                          <td className="text-right p-3">{quantitativoTotals.utilizacaoVM}</td>
                          <td className="text-right p-3">{quantitativoTotals.infeccaoVM}</td>
                          <td className="text-right p-3">{quantitativoTotals.utilizacaoSVD}</td>
                          <td className="text-right p-3">{quantitativoTotals.infeccaoSVD}</td>
                          <td className="text-right p-3">{quantitativoTotals.numAntibioticosUtilizados}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Seção UTI Neonatal — Paciente-Dia por Peso */}
            {neonatalWeightMonthly && (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Baby className="h-4 w-4 text-primary" />
                    Paciente-Dia por Peso — UTI Neonatal
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Cards de total por faixa de peso */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {neonatalWeightCategories.map(cat => (
                      <div key={cat.id} className="text-center p-3 rounded-lg bg-muted/50 border">
                        <p className="text-[10px] text-muted-foreground leading-tight mb-1">{cat.label}</p>
                        <p className="text-xl font-bold" style={{ color: cat.color }}>{neonatalWeightMonthly.totals[cat.id]}</p>
                        <p className="text-[10px] text-muted-foreground">pac-dia</p>
                      </div>
                    ))}
                    <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/20">
                      <p className="text-[10px] text-primary font-medium leading-tight mb-1">Total</p>
                      <p className="text-xl font-bold text-primary">{neonatalWeightMonthly.totals.total}</p>
                      <p className="text-[10px] text-primary/70">pac-dia</p>
                    </div>
                  </div>

                  {/* Gráfico mensal por faixa de peso */}
                  {neonatalWeightMonthly.monthly.length > 0 && (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={neonatalWeightMonthly.monthly}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} width={35} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 10 }} />
                        {neonatalWeightCategories.map((cat, idx) => (
                          <Bar
                            key={cat.id}
                            dataKey={cat.id}
                            name={cat.label}
                            fill={cat.color}
                            stackId="peso"
                            radius={idx === neonatalWeightCategories.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  )}

                  {/* Tabela mensal por peso */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b bg-muted/60">
                          <th className="text-left p-2 font-semibold">Mês</th>
                          {neonatalWeightCategories.map(cat => (
                            <th key={cat.id} className="text-right p-2 font-semibold">{cat.label}</th>
                          ))}
                          <th className="text-right p-2 font-semibold">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {neonatalWeightMonthly.monthly.map((m: any) => (
                          <tr key={m.mes} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-2 font-medium">{m.mes}</td>
                            {neonatalWeightCategories.map(cat => (
                              <td key={cat.id} className="text-right p-2">{m[cat.id]}</td>
                            ))}
                            <td className="text-right p-2 font-semibold">{m.total}</td>
                          </tr>
                        ))}
                        <tr className="bg-muted/60 font-bold border-t-2">
                          <td className="p-2">Total</td>
                          {neonatalWeightCategories.map(cat => (
                            <td key={cat.id} className="text-right p-2">{neonatalWeightMonthly.totals[cat.id]}</td>
                          ))}
                          <td className="text-right p-2">{neonatalWeightMonthly.totals.total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

      </Tabs>

      {/* Médias Anuais — abaixo dos gráficos */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Médias Anuais
              <Badge variant="outline" className="text-[10px] ml-1">
                {anoFiltro.length === 0 ? "Todos os anos" : anoFiltro.join(", ")}
              </Badge>
            </CardTitle>
            <span className="text-[11px] text-muted-foreground">
              Calculado sobre {mediaAnual.mesesComDados} {mediaAnual.mesesComDados === 1 ? "mês" : "meses"} com dados
            </span>
          </div>
        </CardHeader>
        <CardContent>
          {mediaAnual.mesesComDados === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Sem dados para o período selecionado.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <KpiCard expandable label="Média Anual da Taxa de Infecção Hospitalar" value={mediaAnual.taxaInfeccao} unit="‰" icon={Bug} color="hsl(0,72%,51%)"
                description="Média mensal da taxa de infecção hospitalar (infecções por 1.000 pacientes-dia) ao longo do ano selecionado." />
              <KpiCard expandable label="Média Anual da Taxa de Letalidade" value={mediaAnual.taxaLetalidade} unit="%" icon={Heart} color="hsl(330,81%,60%)"
                description="Média mensal do percentual de óbitos entre pacientes com infecção hospitalar." />
              <KpiCard expandable label="Média Anual da Taxa de Infecção por Dispositivo" value={mediaAnual.taxaInfDispositivo} unit="‰" icon={Syringe} color="hsl(217,91%,60%)"
                description="Média mensal da taxa consolidada de infecções relacionadas a dispositivos invasivos (CVC + VM + SVD) por 1.000 dias de uso." />
              <KpiCard expandable label="Média Anual da Taxa de PAV (Pneumonia Associada à Ventilação)" value={mediaAnual.taxaInfPAV} unit="‰" icon={ShieldAlert} color="hsl(38,92%,50%)"
                description="Média mensal da taxa de pneumonia associada à ventilação mecânica (PAV) por 1.000 dias de VM." />
              <KpiCard expandable label="Média Anual da Taxa de Infecção por SVD (Sonda Vesical de Demora)" value={mediaAnual.taxaInfSVD} unit="‰" icon={ShieldAlert} color="hsl(262,83%,58%)"
                description="Média mensal da taxa de infecção urinária associada à sonda vesical de demora por 1.000 dias de SVD." />
              <KpiCard expandable label="Média Anual da Taxa de Infecção por CVC (Cateter Venoso Central)" value={mediaAnual.taxaInfCVC} unit="‰" icon={ShieldAlert} color="hsl(168,66%,34%)"
                description="Média mensal da taxa de infecção primária de corrente sanguínea associada a CVC por 1.000 dias de cateter." />
              <KpiCard expandable label="Média Anual do Tempo de Permanência" value={mediaAnual.tempoPermanencia} unit=" dias" icon={Timer} color="hsl(217,91%,60%)"
                description="Média mensal do tempo médio de permanência dos pacientes (em dias)." />
              <KpiCard expandable label="Média Mensal de Infecções por Dispositivo" value={mediaAnual.infeccoesDispositivoMes} unit="" icon={Syringe} color="hsl(0,72%,51%)"
                description="Número médio mensal de infecções relacionadas a dispositivos invasivos (CVC + VM + SVD)." />
              <KpiCard expandable label="Média Mensal de Óbitos por Infecção" value={mediaAnual.obitosMes} unit="" icon={Skull} color="hsl(262,83%,58%)"
                description="Número médio mensal de óbitos associados a infecção hospitalar." />
              <KpiCard expandable label="Média Mensal de Infecções Hospitalares" value={mediaAnual.infeccoesMes} unit="" icon={Thermometer} color="hsl(38,92%,50%)"
                description="Número médio mensal de infecções hospitalares notificadas." />
            </div>
          )}
        </CardContent>
      </Card>

      {filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Nenhum registro encontrado. Crie indicadores em <strong>/indicadores/new</strong> para visualizar os dados.</p>
          </CardContent>
        </Card>
      )}

      {/* Smart Insights Panel — final da página */}
      <SmartInsightsPanel
        generateInsights={buildInsights}
        pageTitle="Dashboard de Indicadores Epidemiológicos"
        contextKey={insightsKey}
      />
    </div>
  );
}
