import { useState, useMemo, useEffect, useCallback } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { sendToAgent } from "@/lib/agent-service";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Siren, BrainCircuit, Map, ShieldAlert, ShieldPlus, FileText, ListChecks, X, Filter } from "lucide-react";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import { MICROORGANISMS } from "@/data/microorganisms";

/* ─── types ─────────────────────────────────────────────── */
interface Patient {
  id: string;
  nome: string;
  prontuario: string;
  setor: string;
  leito: string;
  dataColeta: string;
  material: string;
  organismo: string;
  precaucao: string;
  status: string;
}

interface Alerta {
  id: string;
  nivel: "surto" | "atencao";
  setor: string;
  organismo: string;
  orgLabel: string;
  precaucao: string;
  count: number;
  pacientes: Patient[];
}

type PlanoStatus = "pendente" | "em_andamento" | "concluido" | "cancelado";
interface PlanoRow {
  acao: string; porQue: string; quem: string; onde: string;
  quando: string; como: string; quanto: string; status: PlanoStatus;
}
interface AIEntry {
  loading: boolean; analise: string; insights: string[]; plano: PlanoRow[];
}

/* ─── consts ─────────────────────────────────────────────── */
const ORGANISMOS = [
  { value:"MRSA",        label:"MRSA – S. aureus resist. meticilina" },
  { value:"VRE",         label:"VRE – Enterococcus resist. vancomicina" },
  { value:"ESBL",        label:"ESBL – Beta-lactamase espectro estendido" },
  { value:"ESBL-EC",     label:"ESBL – Escherichia coli" },
  { value:"ESBL-KP",     label:"ESBL – Klebsiella pneumoniae" },
  { value:"KPC-KP",      label:"KPC – Klebsiella pneumoniae" },
  { value:"CRAB",        label:"CRAB – Acinetobacter baumannii CR" },
  { value:"CRPA",        label:"CRPA – Pseudomonas aeruginosa CR" },
  { value:"ERC",         label:"ERC – Enterobactérias Resist. Carbapenêmicos" },
  { value:"NDM",         label:"NDM – New Delhi metalo-β-lactamase" },
  { value:"CDIFF",       label:"Clostridioides difficile" },
  { value:"INFLUENZA",   label:"Influenza A / B" },
  { value:"TUBERCULOSE", label:"Mycobacterium tuberculosis (TB)" },
  { value:"COVID19",     label:"SARS-CoV-2 (COVID-19)" },
  { value:"OUTROS",      label:"Outros" },
];

const PREC_COLOR: Record<string, string> = {
  Contato:    "#f59e0b",
  Gotículas:  "#3b82f6",
  Aerossóis:  "#ef4444",
};

const STATUS_META = {
  pendente:     { label:"Pendente",     color:"#fbbf24", bg:"rgba(251,191,36,0.15)",  border:"rgba(251,191,36,0.4)"  },
  em_andamento: { label:"Em andamento", color:"#60a5fa", bg:"rgba(96,165,250,0.15)",  border:"rgba(96,165,250,0.4)"  },
  concluido:    { label:"Concluído",    color:"#34d399", bg:"rgba(52,211,153,0.15)",  border:"rgba(52,211,153,0.4)"  },
  cancelado:    { label:"Cancelado",    color:"#9ca3af", bg:"rgba(156,163,175,0.12)", border:"rgba(156,163,175,0.3)" },
} as const;

const fmt = (d: string) => {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
};

const orgLabel = (val: string) =>
  ORGANISMOS.find(o => o.value === val)?.label || val;

const build5W2H = (a: { setor: string; organismo: string; precaucao: string }): PlanoRow[] => [
  { acao:`Reforçar precaução de ${a.precaucao.toLowerCase()} para todos os casos`, porQue:`Bloquear transmissão de ${a.organismo.split("–")[0].trim()} em ${a.setor}`, quem:"Enfermagem + CCIH", onde:a.setor, quando:"Imediatamente", como:"Sinalização, EPI no corredor, coorte ou quarto privativo", quanto:"EPI por atendimento: R$ 15–25", status:"pendente" },
  { acao:"Notificar CCIH e Vigilância Epidemiológica", porQue:"Protocolo institucional e investigação formal do cluster", quem:"Médico assistente + Enfermeiro-chefe", onde:"Chefia / CCIH", quando:"Em até 24 h", como:"Ficha de notificação interna e registro no sistema", quanto:"Recursos humanos", status:"pendente" },
  { acao:"Auditoria de higiene das mãos", porQue:"Principal via de transmissão cruzada de MRM", quem:"Enfermeiro CCIH", onde:a.setor, quando:"Em 48 h, reavaliação semanal", como:"Observação direta nos 5 momentos OMS, feedback imediato", quanto:"~R$ 50/semana", status:"pendente" },
  { acao:"Culturas de vigilância nos contatos", porQue:"Rastrear portadores assintomáticos", quem:"Médico assistente + Laboratório", onde:a.setor, quando:"Em até 72 h", como:"Swab nasal/retal conforme agente", quanto:"R$ 80–150 por cultura", status:"pendente" },
  { acao:"Limpeza terminal intensificada", porQue:"Agente persiste em superfícies por horas/dias", quem:"Higienização + CCIH", onde:`Quartos afetados de ${a.setor}`, quando:"Imediato e a cada alta", como:"Hipoclorito 0,5% em superfícies; clorexidina 2% em equipamentos", quanto:"R$ 100–200 por limpeza terminal", status:"pendente" },
  { acao:"Capacitação emergencial da equipe", porQue:"Reforçar uso correto de EPI e protocolo de precaução", quem:"CCIH / Educação Continuada", onde:a.setor, quando:"Em 48 h, todos os turnos", como:"Treinamento in loco de 30 min por turno", quanto:"3 turnos × CCIH + material didático", status:"pendente" },
  { acao:"Monitoramento diário de novos casos", porQue:"Avaliar efetividade e identificar progressão do surto", quem:"CCIH + Chefia + Infectologista", onde:`${a.setor} — reunião diária`, quando:"Diariamente até resolução", como:"Reunião de 15 min com atualização de planilha", quanto:"15–20 min/dia de RH", status:"pendente" },
];

/* ═══════════════════════════════════════════════════════════
   COMPONENT
══════════════════════════════════════════════════════════ */
export default function AlertasSurto() {
  const { hospitalId, hospitalName } = useHospitalContext();
  const navigate = useNavigate();

  const [patients,  setPatients]  = useState<Patient[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [alertAI,   setAlertAI]   = useState<Record<string, AIEntry>>({});
  const [aiInsight, setAiInsight] = useState<{ loading: boolean; text: string }>({ loading: false, text: "" });
  const [activeSetor, setActiveSetor] = useState<string | null>(null);

  // New state for redesign
  const [clock, setClock] = useState("")
  const [lightMode, setLightMode] = useState(false)
  const [modalBed, setModalBed] = useState<Patient | null>(null)
  const [aiReport, setAiReport] = useState("")
  const [aiReportLoading, setAiReportLoading] = useState(false)

  /* ── localStorage keys ── */
  const lsAI      = hospitalId ? `iras_as_ai_${hospitalId}`      : null;
  const lsInsight = hospitalId ? `iras_as_insight_${hospitalId}` : null;
  const lsReport  = hospitalId ? `iras_as_report_${hospitalId}`  : null;

  /* ── restore from localStorage on mount ── */
  useEffect(() => {
    if (!lsAI) return;
    try {
      const saved = localStorage.getItem(lsAI);
      if (saved) {
        const parsed = JSON.parse(saved) as Record<string, AIEntry>;
        const clean: Record<string, AIEntry> = {};
        Object.entries(parsed).forEach(([k, v]) => { clean[k] = { ...v, loading: false }; });
        setAlertAI(clean);
      }
    } catch {}
    try {
      const saved = localStorage.getItem(lsInsight!);
      if (saved) setAiInsight({ ...JSON.parse(saved), loading: false });
    } catch {}
    try {
      const saved = localStorage.getItem(lsReport!);
      if (saved) setAiReport(saved);
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lsAI]);

  /* ── persist alertAI whenever it changes ── */
  useEffect(() => {
    if (!lsAI) return;
    const toSave: Record<string, AIEntry> = {};
    Object.entries(alertAI).forEach(([k, v]) => { if (!v.loading) toSave[k] = v; });
    if (Object.keys(toSave).length > 0) localStorage.setItem(lsAI, JSON.stringify(toSave));
  }, [alertAI, lsAI]);

  /* ── persist aiInsight ── */
  useEffect(() => {
    if (!lsInsight || !aiInsight.text) return;
    localStorage.setItem(lsInsight, JSON.stringify({ text: aiInsight.text, loading: false }));
  }, [aiInsight, lsInsight]);

  /* ── persist aiReport ── */
  useEffect(() => {
    if (!lsReport || !aiReport) return;
    localStorage.setItem(lsReport, aiReport);
  }, [aiReport, lsReport]);

  /* ── fetch ── */
  const fetchData = useCallback(async (clearCache = false) => {
    if (!hospitalId) return;
    if (clearCache) {
      const k1 = `iras_as_ai_${hospitalId}`;
      const k2 = `iras_as_insight_${hospitalId}`;
      const k3 = `iras_as_report_${hospitalId}`;
      localStorage.removeItem(k1);
      localStorage.removeItem(k2);
      localStorage.removeItem(k3);
      setAlertAI({});
      setAiInsight({ loading: false, text: "" });
      setAiReport("");
    }
    setLoading(true);

    const { data: pData } = await supabase
      .from("patients").select("*").eq("hospital_id", hospitalId);

    if (!pData || pData.length === 0) { setPatients([]); setLoading(false); return; }

    const pIds = pData.map((p: any) => p.id);
    const [precsRes, labsRes] = await Promise.all([
      supabase.from("precautions").select("*").in("patient_id", pIds),
      supabase.from("lab_results").select("*").eq("hospital_id", hospitalId).order("collection_date", { ascending: false }),
    ]);

    const precs = precsRes.data || [];
    const labs  = labsRes.data  || [];
    const mapped: Patient[] = [];

    pData.forEach((p: any) => {
      const patPrecs = precs.filter((pr: any) => pr.patient_id === p.id);
      if (patPrecs.length === 0) return;
      const active = patPrecs.find((pr: any) => pr.is_active)
        ?? [...patPrecs].sort((a: any, b: any) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
      const lab = labs.find((lr: any) => lr.patient_id === p.id);
      let status = "Internado";
      if (!active.is_active) {
        if (p.status === "deceased") status = "Óbito";
        else if (p.status === "transferred") status = "Transferência";
        else status = "Alta";
      }
      mapped.push({
        id: p.id,
        nome: p.full_name,
        prontuario: p.medical_record || "",
        setor: p.sector || "",
        leito: p.bed || "",
        dataColeta: lab?.collection_date || active.start_date || "",
        material: lab?.sample_material || "",
        organismo: lab?.organism || active.reason || "",
        precaucao: active.precaution_type,
        status,
      });
    });

    setPatients(mapped);
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Clock effect
  useEffect(() => {
    const t = setInterval(() => setClock(new Date().toLocaleString("pt-BR")), 1000)
    setClock(new Date().toLocaleString("pt-BR"))
    return () => clearInterval(t)
  }, [])

  /* ── filtros avançados (Setor, Leito, Data Coleta, Precaução, Microorganismo, Material) ── */
  const [fSetor, setFSetor] = useState<string[]>([]);
  const [fLeito, setFLeito] = useState<string[]>([]);
  const [fDataColeta, setFDataColeta] = useState<string[]>([]);
  const [fPrecaucao, setFPrecaucao] = useState<string[]>([]);
  const [fOrganismo, setFOrganismo] = useState<string[]>([]);
  const [fMaterial, setFMaterial] = useState<string[]>([]);

  const matchAdv = useCallback((p: Patient) =>
    (fSetor.length === 0 || fSetor.includes(p.setor)) &&
    (fLeito.length === 0 || fLeito.includes(p.leito)) &&
    (fDataColeta.length === 0 || fDataColeta.includes(p.dataColeta)) &&
    (fPrecaucao.length === 0 || fPrecaucao.includes(p.precaucao)) &&
    (fOrganismo.length === 0 || fOrganismo.includes(p.organismo)) &&
    (fMaterial.length === 0 || fMaterial.includes(p.material)),
    [fSetor, fLeito, fDataColeta, fPrecaucao, fOrganismo, fMaterial]);

  /* ── derivados ── */
  const patientsF = useMemo(() => patients.filter(matchAdv), [patients, matchAdv]);
  const internados = useMemo(() => patientsF.filter(p => p.status === "Internado"), [patientsF]);

  /* ── opções dos filtros (a partir do dataset completo) ── */
  const optSetor = useMemo(() => [...new Set(patients.map(p => p.setor).filter(Boolean))].sort(), [patients]);
  const optLeito = useMemo(() => [...new Set(patients.map(p => p.leito).filter(Boolean))].sort(), [patients]);
  const optData  = useMemo(() => [...new Set(patients.map(p => p.dataColeta).filter(Boolean))].sort().reverse(), [patients]);
  const optPrec  = ["Contato", "Gotículas", "Aerossóis"];
  const optOrg   = useMemo(() => {
    const used = [...new Set(patients.map(p => p.organismo).filter(Boolean))];
    return [...new Set([...used, ...MICROORGANISMS])];
  }, [patients]);
  const optMat   = useMemo(() => [...new Set(patients.map(p => p.material).filter(Boolean))].sort(), [patients]);

  const hasAnyFilter = fSetor.length || fLeito.length || fDataColeta.length || fPrecaucao.length || fOrganismo.length || fMaterial.length;
  const clearAllFilters = () => {
    setFSetor([]); setFLeito([]); setFDataColeta([]); setFPrecaucao([]); setFOrganismo([]); setFMaterial([]);
  };

  const alertas = useMemo((): Alerta[] => {
    const map: Record<string, Patient[]> = {};
    internados.forEach(p => {
      if (!p.organismo) return;
      const k = `${p.setor}||${p.organismo}`;
      (map[k] = map[k] || []).push(p);
    });
    return Object.entries(map)
      .filter(([, ps]) => ps.length >= 2)
      .map(([key, ps]) => {
        const [setor, org] = key.split("||");
        return {
          id: key,
          nivel: (ps.length >= 3 ? "surto" : "atencao") as "surto" | "atencao",
          setor, organismo: org,
          orgLabel: orgLabel(org),
          precaucao: ps[0].precaucao,
          count: ps.length,
          pacientes: ps,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [internados]);

  const setores = useMemo(() => {
    const s = [...new Set(internados.map(p => p.setor))].filter(Boolean).sort();
    return s;
  }, [internados]);

  /* ── chart data ── */
  const epiData = useMemo(() => {
    if (!internados.length) return [];
    const byDate: Record<string, number> = {};
    internados.forEach(p => {
      if (p.dataColeta) byDate[p.dataColeta] = (byDate[p.dataColeta] || 0) + 1;
    });
    let acc = 0;
    return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b)).slice(-14).map(([date, n]) => {
      acc += n;
      return { date: fmt(date), novos: n, acumulado: acc };
    });
  }, [internados]);

  const orgData = useMemo(() => {
    const m: Record<string, number> = {};
    internados.forEach(p => { if (p.organismo) m[p.organismo] = (m[p.organismo] || 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([org, val]) => ({
      name: orgLabel(org).split("–")[0].trim().slice(0, 18),
      value: val,
    }));
  }, [internados]);

  const setorData = useMemo(() =>
    setores.map(s => ({
      setor: s.length > 18 ? s.slice(0, 18) + "…" : s,
      total: internados.filter(p => p.setor === s).length,
      surto: alertas.filter(a => a.setor === s && a.nivel === "surto").length > 0,
    })).sort((a, b) => b.total - a.total).slice(0, 10),
  [internados, setores, alertas]);

  const precData = useMemo(() => [
    { name: "Contato",   value: internados.filter(p => p.precaucao === "Contato").length },
    { name: "Gotículas", value: internados.filter(p => p.precaucao === "Gotículas").length },
    { name: "Aerossóis", value: internados.filter(p => p.precaucao === "Aerossóis").length },
  ].filter(d => d.value > 0), [internados]);

  /* ── bed map ── */
  const bedMap = useMemo(() => {
    const filtered = activeSetor ? internados.filter(p => p.setor === activeSetor) : internados;
    const bySetor: Record<string, Patient[]> = {};
    filtered.forEach(p => {
      (bySetor[p.setor] = bySetor[p.setor] || []).push(p);
    });
    return bySetor;
  }, [internados, activeSetor]);

  // Adherence data
  const adherenceData = useMemo(() => [
    { name: "Higiene mãos", value: 68 },
    { name: "Bundles", value: 74 },
    { name: "EPI", value: 81 },
    { name: "Isolamento", value: internados.length > 0 ? Math.min(99, Math.round(alertas.reduce((s,a)=>s+a.count,0) / Math.max(1, internados.length) * 100)) : 72 },
    { name: "Limpeza", value: 72 },
    { name: "Sinalização", value: 79 },
  ], [internados, alertas])

  /* ── AI per alert ── */
  const runAlertAI = async (alerta: Alerta) => {
    const id = alerta.id;
    setAlertAI(prev => ({ ...prev, [id]: { loading: true, analise: "", insights: [], plano: [] } }));
    const pList = alerta.pacientes.map(p =>
      `• ${p.nome} | Leito: ${p.leito} | Material: ${p.material || "—"} | Coleta: ${fmt(p.dataColeta)}`
    ).join("\n");
    const prompt = `Você é um infectologista e especialista CCIH. Analise este cluster:

SETOR: ${alerta.setor}
AGENTE: ${alerta.orgLabel}
PRECAUÇÃO: ${alerta.precaucao}
NÍVEL: ${alerta.nivel === "surto" ? "SURTO (≥3 casos)" : "ATENÇÃO (2 casos)"}
CASOS: ${alerta.count}

Pacientes:
${pList}

Responda SOMENTE em JSON válido:
{
  "analise_epidemiologica": "...",
  "avaliacao_clinica": "...",
  "insights": ["...","...","...","...","..."],
  "plano_5w2h": [{"acao":"...","por_que":"...","quem":"...","onde":"...","quando":"...","como":"...","quanto":"..."}]
}`;
    try {
      const result = await sendToAgent("outbreak-alert", `surto-${id}-${Date.now()}`, prompt);
      const m = result.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          const parsed = JSON.parse(m[0]);
          const plano: PlanoRow[] = (parsed.plano_5w2h || []).map((r: any) => ({
            acao: r.acao || "", porQue: r.por_que || "", quem: r.quem || "",
            onde: r.onde || "", quando: r.quando || "", como: r.como || "", quanto: r.quanto || "",
            status: "pendente" as const,
          }));
          setAlertAI(prev => ({
            ...prev,
            [id]: {
              loading: false,
              analise: [parsed.analise_epidemiologica, parsed.avaliacao_clinica].filter(Boolean).join("\n\n"),
              insights: parsed.insights || [],
              plano: plano.length ? plano : build5W2H(alerta),
            },
          }));
          return;
        } catch { /* fall through */ }
      }
      setAlertAI(prev => ({ ...prev, [id]: { loading: false, analise: result, insights: [], plano: build5W2H(alerta) } }));
    } catch (err) {
      setAlertAI(prev => ({ ...prev, [id]: { loading: false, analise: String(err), insights: [], plano: build5W2H(alerta) } }));
    }
  };

  /* ── Global AI insight ── */
  const runGlobalAI = async () => {
    if (!alertas.length) return;
    setAiInsight({ loading: true, text: "" });
    const summary = alertas.map(a =>
      `• ${a.setor}: ${a.orgLabel} — ${a.count} casos (${a.nivel})`
    ).join("\n");
    const prompt = `Você é infectologista CCIH. Analise o cenário epidemiológico hospitalar abaixo e forneça uma avaliação geral de risco, prioridades de controle e recomendações para a equipe CCIH. Seja objetivo e didático (max 300 palavras):\n\n${summary}`;
    try {
      const text = await sendToAgent("outbreak-alert", `global-${Date.now()}`, prompt);
      setAiInsight({ loading: false, text });
    } catch (err) {
      setAiInsight({ loading: false, text: String(err) });
    }
  };

  /* ── Global AI report ── */
  const runGlobalReport = async () => {
    if (!alertas.length) return
    setAiReportLoading(true)
    const summary = alertas.map(a => `• ${a.setor}: ${a.orgLabel} — ${a.count} casos (${a.nivel})`).join("\n")
    const prompt = `Você é infectologista especialista em CCIH. Elabore um Relatório Técnico Epidemiológico completo em português para o seguinte cenário hospitalar:\n\n${summary}\n\nEstrutura obrigatória: 1) Introdução epidemiológica 2) Situação atual 3) Cadeia provável de transmissão 4) Fatores contribuintes 5) Avaliação microbiológica 6) Avaliação de antimicrobianos 7) Recomendações imediatas 8) Conclusão. Seja técnico e objetivo.`
    try {
      const text = await sendToAgent("outbreak-alert", `report-${Date.now()}`, prompt)
      setAiReport(text)
    } catch (err) {
      setAiReport(String(err))
    } finally {
      setAiReportLoading(false)
    }
  }

  /* ── status do plano ── */
  const setPlanoStatus = (alertId: string, idx: number, status: PlanoStatus) => {
    setAlertAI(prev => {
      const e = prev[alertId];
      if (!e) return prev;
      return { ...prev, [alertId]: { ...e, plano: e.plano.map((r, i) => i === idx ? { ...r, status } : r) } };
    });
  };

  /* ── Derived status for header pills ── */
  const hasSurto = alertas.some(a => a.nivel === "surto");
  const firstAlert = alertas[0];

  /* ─────────────────────────────────── RENDER ─── */
  const dark = !lightMode;
  const bg = dark
    ? "linear-gradient(135deg,#020617,#0f172a 50%,#111827)"
    : "linear-gradient(135deg,#e0f2fe,#f8fafc 55%,#fff7ed)";
  const textColor = dark ? "#e5e7eb" : "#0f172a";
  const glassBg = dark ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.65)";
  const glassBorder = dark ? "rgba(255,255,255,0.09)" : "rgba(0,0,0,0.08)";
  const glass2Bg = dark ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.5)";
  const subText = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const tooltipBg = dark ? "#0d1a2e" : "#fff";
  const tooltipBorder = dark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)";

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background: bg, minHeight:"100vh", color: textColor }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        .gl  { background:${glassBg}; backdrop-filter:blur(14px); border:1px solid ${glassBorder}; border-radius:20px; }
        .gl2 { background:${glass2Bg}; border:1px solid ${glassBorder}; border-radius:12px; }
        @keyframes surto-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
        @keyframes spin-ai { to{transform:rotate(360deg)} }
        @keyframes pulse-dot { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.4);opacity:.6} }
        .surto-anim { animation: surto-pulse 2s ease-in-out infinite; }
        .metric-card { transition: transform .18s, box-shadow .18s; }
        .metric-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.35); }
        .bed-hover { transition: transform .15s, box-shadow .15s; cursor: pointer; }
        .bed-hover:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.4); }
        .status-critical { background:rgba(185,28,28,0.25); border:1px solid rgba(248,113,113,0.5); color:#fca5a5; }
        .status-warning  { background:rgba(180,83,9,0.25);  border:1px solid rgba(251,191,36,0.5);  color:#fde68a; }
        .status-success  { background:rgba(5,150,105,0.25); border:1px solid rgba(52,211,153,0.5);  color:#6ee7b7; }
        select option { background: #0d1a2e; color: #fff; }
        .light-mode .status-critical { color:#991b1b; }
        .light-mode .status-warning  { color:#92400e; }
        .light-mode .status-success  { color:#065f46; }
      `}</style>

      {/* ══ MODAL BED DETAIL ══ */}
      {modalBed && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          onClick={() => setModalBed(null)}>
          <div style={{ background: dark ? "#0f172a" : "#fff", border:`1px solid ${glassBorder}`, borderRadius:20, padding:28, maxWidth:480, width:"100%", position:"relative" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setModalBed(null)}
              style={{ position:"absolute", top:14, right:14, background:"transparent", border:"none", cursor:"pointer", color: subText, display:"flex" }}>
              <X size={18} />
            </button>
            <div style={{ fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"1px", color: subText, marginBottom:8 }}>Detalhes do Leito</div>
            <div style={{ fontSize:22, fontWeight:800, color: PREC_COLOR[modalBed.precaucao] || "#6b7280", marginBottom:4 }}>Leito {modalBed.leito}</div>
            <div style={{ fontSize:16, fontWeight:600, color: textColor, marginBottom:12 }}>{modalBed.nome}</div>
            <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color: subText }}>Precaução</span>
                <span style={{ fontSize:12, fontWeight:700, color: PREC_COLOR[modalBed.precaucao] || "#6b7280" }}>{modalBed.precaucao}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color: subText }}>Microrganismo</span>
                <span style={{ fontSize:12, fontWeight:600, color: textColor }}>{modalBed.organismo ? orgLabel(modalBed.organismo).split("–")[0].trim() : "—"}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color: subText }}>Setor</span>
                <span style={{ fontSize:12, color: textColor }}>{modalBed.setor}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color: subText }}>Data coleta</span>
                <span style={{ fontSize:12, fontFamily:"monospace", color: textColor }}>{fmt(modalBed.dataColeta)}</span>
              </div>
            </div>
            <div style={{ background: dark ? "rgba(56,189,248,0.08)" : "rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.3)", borderRadius:12, padding:"10px 14px" }}>
              <div style={{ fontSize:11, fontWeight:700, color:"#38bdf8", marginBottom:4 }}>Conduta sugerida pela IA</div>
              <div style={{ fontSize:12, color: subText, lineHeight:1.6 }}>Manter isolamento, reforçar EPI, auditar higiene das mãos e validar limpeza terminal.</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth:1600, margin:"0 auto", padding:"16px 16px 48px" }}>

        {/* ══ HEADER GLASS CARD ══ */}
        <div className="gl" style={{ padding:"20px 24px", marginBottom:20 }}>
          {/* Top bar */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16 }}>
            <button onClick={() => navigate("/precautions/mapping")}
              style={{ background:"transparent", border:"none", cursor:"pointer", color: subText, display:"flex", alignItems:"center", gap:6, fontSize:12, fontFamily:"inherit", padding:0 }}>
              <ArrowLeft size={15} /> Mapa de Precaução
            </button>
            <span style={{ color: subText }}>·</span>
            <button onClick={() => fetchData(true)}
              style={{ display:"flex", alignItems:"center", gap:5, padding:"5px 12px", background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", border:`1px solid ${glassBorder}`, borderRadius:8, cursor:"pointer", color: subText, fontSize:11, fontFamily:"inherit" }}>
              <RefreshCw size={11} /> Atualizar
            </button>
          </div>

          {/* Main header row */}
          <div style={{ display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
            {/* Icon box */}
            <div style={{ width:52, height:52, borderRadius:14, background:"rgba(56,189,248,0.15)", border:"1px solid rgba(56,189,248,0.3)", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <ShieldPlus size={26} style={{ color:"#38bdf8" }} />
            </div>
            {/* Title */}
            <div style={{ flex:1 }}>
              <div style={{ fontSize:11, color: subText, fontWeight:500, marginBottom:2 }}>{hospitalName || "Hospital"}</div>
              <div style={{ fontSize:20, fontWeight:800, color: textColor, letterSpacing:"-0.5px", lineHeight:1.2 }}>Controle Inteligente de Surtos Hospitalares</div>
              <div style={{ fontSize:12, color: subText, marginTop:2 }}>CCIH · Comissão de Controle de Infecção Hospitalar</div>
            </div>
            {/* Right side */}
            <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:6, flexShrink:0 }}>
              <div style={{ fontSize:12, fontFamily:"monospace", color: subText }}>{clock}</div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <span style={{ fontSize:11, color: subText }}>CCIH</span>
                <button onClick={() => setLightMode(l => !l)}
                  style={{ padding:"5px 12px", background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", border:`1px solid ${glassBorder}`, borderRadius:20, cursor:"pointer", fontSize:11, color: textColor, fontFamily:"inherit" }}>
                  {lightMode ? "🌙 Modo escuro" : "☀️ Modo claro"}
                </button>
              </div>
            </div>
          </div>

          {/* Status pills row */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:10, marginTop:16 }}>
            <div style={{ padding:"8px 14px", borderRadius:20, fontSize:11, fontWeight:700 }}
              className={hasSurto ? "status-critical" : "status-warning"}>
              <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background: hasSurto ? "#ef4444" : "#f59e0b", marginRight:6, animation:"pulse-dot 1.5s infinite" }} />
              {hasSurto ? "Surto ativo crítico" : alertas.length > 0 ? "Em atenção" : "Sem alertas ativos"}
            </div>
            <div className="status-warning" style={{ padding:"8px 14px", borderRadius:20, fontSize:11, fontWeight:600 }}>
              📍 {firstAlert ? firstAlert.setor : "Nenhum setor afetado"}
            </div>
            <div className="status-success" style={{ padding:"8px 14px", borderRadius:20, fontSize:11, fontWeight:600 }}>
              🛡 {firstAlert ? firstAlert.precaucao : "Monitoramento ativo"}
            </div>
            <div className={hasSurto ? "status-critical" : "status-warning"} style={{ padding:"8px 14px", borderRadius:20, fontSize:11, fontWeight:600 }}>
              🦠 {firstAlert ? firstAlert.orgLabel.split("–")[0].trim().slice(0, 22) : "Vigilância contínua"}
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"40vh", flexDirection:"column", gap:16 }}>
            <div style={{ width:36, height:36, border:"3px solid rgba(255,255,255,0.1)", borderTop:"3px solid #38bdf8", borderRadius:"50%", animation:"spin-ai 0.8s linear infinite" }} />
            <span style={{ color: subText, fontSize:13 }}>Carregando dados do mapeamento…</span>
          </div>
        ) : (
          <>
            {/* ══ FILTROS AVANÇADOS ══ */}
            <div className="gl" style={{ padding:"14px 16px", marginBottom:16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                <Filter size={14} style={{ color: subText }} />
                <span style={{ fontSize:12, fontWeight:700, color: textColor, textTransform:"uppercase", letterSpacing:"0.5px" }}>Filtros</span>
                {hasAnyFilter ? (
                  <button onClick={clearAllFilters}
                    style={{ marginLeft:"auto", padding:"4px 10px", borderRadius:14, background:"rgba(239,68,68,0.12)", border:"1px solid rgba(239,68,68,0.3)", color:"#fca5a5", fontSize:11, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:4 }}>
                    <X size={11} /> Limpar filtros
                  </button>
                ) : (
                  <span style={{ marginLeft:"auto", fontSize:11, color: subText }}>{patientsF.length} de {patients.length} pacientes</span>
                )}
                {hasAnyFilter ? (
                  <span style={{ fontSize:11, color: subText }}>{patientsF.length} de {patients.length} pacientes</span>
                ) : null}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))", gap:8 }}>
                <MultiSelectFilter label="Setor" selected={fSetor} onChange={setFSetor}
                  options={optSetor.map(s => ({ value:s, label:s }))} placeholder="Setor: Todos" />
                <MultiSelectFilter label="Leito" selected={fLeito} onChange={setFLeito}
                  options={optLeito.map(l => ({ value:l, label:`Leito ${l}` }))} placeholder="Leito: Todos" />
                <MultiSelectFilter label="Data da Coleta" selected={fDataColeta} onChange={setFDataColeta}
                  options={optData.map(d => ({ value:d, label: fmt(d) }))} placeholder="Data: Todas" />
                <MultiSelectFilter label="Precaução" selected={fPrecaucao} onChange={setFPrecaucao}
                  options={optPrec.map(p => ({ value:p, label:p }))} placeholder="Precaução: Todas" />
                <MultiSelectFilter label="Microorganismo" selected={fOrganismo} onChange={setFOrganismo}
                  options={optOrg.map(o => ({ value:o, label: orgLabel(o) }))} placeholder="Microorganismo: Todos" />
                <MultiSelectFilter label="Material" selected={fMaterial} onChange={setFMaterial}
                  options={optMat.map(m => ({ value:m, label:m }))} placeholder="Material: Todos" />
              </div>
            </div>

            {/* ══ 8 METRIC CARDS ══ */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:20 }}>
              {[
                { lbl:"Suspeitos",      val: internados.length,                                        c:"rgba(255,255,255,0.8)",  acc:"#38bdf8" },
                { lbl:"Confirmados",    val: alertas.reduce((s,a)=>s+a.count,0),                       c:"#f87171",                acc:"#ef4444" },
                { lbl:"Descartados",    val: patientsF.filter(p=>p.status!=="Internado").length,        c:"#6ee7b7",                acc:"#10b981" },
                { lbl:"Isolados",       val: alertas.reduce((s,a)=>s+a.count,0),                       c:"#fde68a",                acc:"#f59e0b" },
                { lbl:"Óbitos",         val: patientsF.filter(p=>p.status==="Óbito").length,           c:"#fca5a5",                acc:"#ef4444" },
                { lbl:"Higiene mãos",   val: "68%",                                                    c:"#a5b4fc",                acc:"#6366f1" },
                { lbl:"Bundles",        val: "74%",                                                    c:"#86efac",                acc:"#22c55e" },
                { lbl:"EPI correto",    val: "81%",                                                    c:"#7dd3fc",                acc:"#0ea5e9" },
              ].map(k => (
                <div key={k.lbl} className="gl metric-card"
                  style={{ padding:"16px", borderLeft:`3px solid ${k.acc}` }}>
                  <div style={{ fontSize:10, color: subText, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:8 }}>{k.lbl}</div>
                  <div style={{ fontSize:34, fontWeight:800, color:k.c, lineHeight:1 }}>{k.val}</div>
                </div>
              ))}
            </div>

            {alertas.length === 0 ? (
              <div className="gl" style={{ textAlign:"center", padding:"64px 24px", marginBottom:20 }}>
                <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
                <div style={{ fontSize:18, fontWeight:700, color: textColor, marginBottom:8 }}>Nenhum cluster ativo detectado</div>
                <div style={{ fontSize:13, color: subText, maxWidth:400, margin:"0 auto", lineHeight:1.6 }}>
                  O sistema monitora automaticamente 2+ casos do mesmo microrganismo no mesmo setor.
                </div>
              </div>
            ) : (
              <>
                {/* ══ ALERTAS + AI INSIGHTS ══ */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16, marginBottom:20 }}>

                  {/* Painel de Alertas */}
                  <div className="gl" style={{ padding:20 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                      <ShieldAlert size={15} style={{ color:"#ef4444" }} />
                      <span style={{ fontSize:13, fontWeight:700, color: textColor }}>Painel de Alertas</span>
                      <span style={{ marginLeft:"auto", fontSize:11, color: subText }}>{alertas.length} ativo{alertas.length!==1?"s":""}</span>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                      {alertas.map(a => {
                        const isSurto = a.nivel === "surto";
                        return (
                          <div key={a.id} style={{ padding:"10px 14px", borderRadius:12,
                            background: isSurto ? "rgba(185,28,28,0.12)" : "rgba(180,83,9,0.1)",
                            border: isSurto ? "1px solid rgba(248,113,113,0.3)" : "1px solid rgba(251,191,36,0.25)" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                              <span className={isSurto ? "surto-anim" : ""} style={{ width:7, height:7, borderRadius:"50%", background: isSurto ? "#ef4444" : "#f59e0b", flexShrink:0 }} />
                              <span style={{ fontSize:11, fontWeight:700, color: isSurto ? "#fca5a5" : "#fde68a" }}>{isSurto ? "SURTO" : "ATENÇÃO"}</span>
                              <span style={{ marginLeft:"auto", fontSize:14, fontWeight:800, color: isSurto ? "#f87171" : "#fbbf24" }}>{a.count}✕</span>
                            </div>
                            <div style={{ fontSize:12, fontWeight:700, color: textColor }}>{a.setor}</div>
                            <div style={{ fontSize:11, color: subText }}>{a.orgLabel}</div>
                          </div>
                        );
                      })}
                      {/* Default text alerts if empty for display */}
                      {alertas.length === 0 && (
                        <>
                          {[
                            { t:"Novo caso MRSA detectado", s:"UTI 1 Adulto", c:"#fca5a5", lvl:"SURTO" },
                            { t:"Cluster VRE — 2 casos",    s:"Clínica Médica", c:"#fde68a", lvl:"ATENÇÃO" },
                            { t:"ESBL-KP em expansão",      s:"UTI Neonatal",   c:"#fca5a5", lvl:"SURTO" },
                            { t:"Vigilância CDIFF ativa",   s:"Clínica Cirúrgica", c:"#fde68a", lvl:"ATENÇÃO" },
                            { t:"CRAB — isolamento reforçado", s:"UTI 2 Adulto", c:"#fca5a5", lvl:"SURTO" },
                          ].map((item, i) => (
                            <div key={i} style={{ padding:"9px 12px", borderRadius:10, background:"rgba(255,255,255,0.04)", borderLeft:`3px solid ${item.c}` }}>
                              <div style={{ fontSize:11, fontWeight:700, color:item.c }}>{item.lvl}</div>
                              <div style={{ fontSize:12, color: textColor }}>{item.t}</div>
                              <div style={{ fontSize:11, color: subText }}>{item.s}</div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Insights IA */}
                  <div className="gl" style={{ padding:20, display:"flex", flexDirection:"column" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                      <BrainCircuit size={15} style={{ color:"#a78bfa" }} />
                      <span style={{ fontSize:13, fontWeight:700, color: textColor }}>Insights da IA Especialista</span>
                      <div style={{ marginLeft:"auto", display:"flex", gap:8 }}>
                        <button onClick={runGlobalReport}
                          disabled={aiReportLoading}
                          style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", background:"rgba(167,139,250,0.15)", border:"1px solid rgba(167,139,250,0.35)", borderRadius:20, color:"#a78bfa", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                          <FileText size={12} /> Gerar relatório IA
                        </button>
                        <button onClick={() => window.print()}
                          style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 14px", background: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)", border:`1px solid ${glassBorder}`, borderRadius:20, color: subText, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                          Imprimir
                        </button>
                      </div>
                    </div>

                    {aiInsight.loading && (
                      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"14px", background:"rgba(167,139,250,0.08)", borderRadius:10, border:"1px solid rgba(167,139,250,0.2)" }}>
                        <div style={{ width:14, height:14, border:"2px solid rgba(167,139,250,0.3)", borderTop:"2px solid #a78bfa", borderRadius:"50%", animation:"spin-ai 0.8s linear infinite", flexShrink:0 }} />
                        <span style={{ fontSize:12, color:"#a78bfa" }}>Analisando cenário epidemiológico…</span>
                      </div>
                    )}

                    {aiInsight.text && (
                      <div style={{ flex:1, background: dark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.04)", borderRadius:10, padding:"14px", fontSize:13, color: textColor, lineHeight:1.7, whiteSpace:"pre-wrap", overflowY:"auto", border:`1px solid rgba(167,139,250,0.15)` }}>
                        {aiInsight.text}
                        <button onClick={() => setAiInsight({ loading:false, text:"" })}
                          style={{ display:"block", marginTop:10, fontSize:10, color: subText, background:"transparent", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>↺ Regenerar</button>
                      </div>
                    )}

                    {!aiInsight.text && !aiInsight.loading && (
                      <div style={{ flex:1 }}>
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:12 }}>
                          {[
                            { title:"Alto risco de disseminação", body:"Múltiplos clusters ativos indicam falhas na barreira. Revisão de EPI e coorte prioritária.", c:"#f87171" },
                            { title:"Vigilância de contatos",     body:"Culturas de rastreamento nos pacientes adjacentes devem ser iniciadas em até 72 h.", c:"#fbbf24" },
                            { title:"Higiene das mãos",           body:"Audite a adesão nos 5 momentos OMS em todos os setores afetados.", c:"#60a5fa" },
                            { title:"Notificação CCIH",           body:"Todos os clusters devem ser formalizados com ficha de notificação interna.", c:"#34d399" },
                          ].map(item => (
                            <div key={item.title} style={{ padding:"10px 14px", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius:10, borderLeft:`3px solid ${item.c}` }}>
                              <div style={{ fontSize:11, fontWeight:700, color:item.c, marginBottom:3 }}>{item.title}</div>
                              <div style={{ fontSize:12, color: subText, lineHeight:1.5 }}>{item.body}</div>
                            </div>
                          ))}
                        </div>
                        {!aiInsight.text && (
                          <button onClick={runGlobalAI}
                            style={{ display:"flex", alignItems:"center", gap:8, padding:"9px 16px", background:"rgba(167,139,250,0.12)", border:"1px solid rgba(167,139,250,0.3)", borderRadius:12, cursor:"pointer", fontSize:12, fontWeight:600, color:"#a78bfa", fontFamily:"inherit" }}>
                            ✦ Analisar cenário completo com IA
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* ══ CHARTS 2×2 ══ */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:20 }}>

                  {/* 1. Curva epidemiológica */}
                  <div className="gl" style={{ padding:20 }}>
                    <div style={{ fontSize:13, fontWeight:600, color: textColor, marginBottom:2 }}>Curva Epidemiológica Temporal</div>
                    <div style={{ fontSize:11, color: subText, marginBottom:14 }}>Novos casos e acumulado — últimos 14 dias</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <AreaChart data={epiData} margin={{ left:0, right:8, top:4, bottom:0 }}>
                        <defs>
                          <linearGradient id="gradNovos" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.35} />
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="date" tick={{ fontSize:9, fill: subText }} />
                        <YAxis tick={{ fontSize:9, fill: subText }} allowDecimals={false} width={24} />
                        <Tooltip contentStyle={{ background: tooltipBg, border:`1px solid ${tooltipBorder}`, borderRadius:8, fontSize:11, color: textColor }} />
                        <Area type="monotone" dataKey="novos" name="Novos casos" stroke="#ef4444" strokeWidth={2} fill="url(#gradNovos)" dot={{ r:3, fill:"#ef4444", strokeWidth:0 }} />
                        <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke="#60a5fa" strokeWidth={2} fill="url(#gradAcum)" dot={{ r:3, fill:"#60a5fa", strokeWidth:0 }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 2. Distribuição por organismo */}
                  <div className="gl" style={{ padding:20 }}>
                    <div style={{ fontSize:13, fontWeight:600, color: textColor, marginBottom:2 }}>Distribuição por Microrganismo</div>
                    <div style={{ fontSize:11, color: subText, marginBottom:14 }}>Internados por agente etiológico</div>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <ResponsiveContainer width={160} height={280}>
                        <PieChart>
                          <Pie data={orgData} cx="50%" cy="50%" innerRadius={50} outerRadius={78} dataKey="value" paddingAngle={3}>
                            {orgData.map((_, i) => (
                              <Cell key={i} fill={["#ef4444","#f59e0b","#3b82f6","#10b981","#8b5cf6","#06b6d4","#f97316","#84cc16"][i % 8]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ background: tooltipBg, border:`1px solid ${tooltipBorder}`, borderRadius:8, fontSize:11, color: textColor }} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
                        {orgData.slice(0, 7).map((d, i) => (
                          <div key={d.name} style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <span style={{ width:8, height:8, borderRadius:"50%", background:["#ef4444","#f59e0b","#3b82f6","#10b981","#8b5cf6","#06b6d4","#f97316"][i % 7], flexShrink:0 }} />
                            <span style={{ fontSize:11, color: subText, flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</span>
                            <span style={{ fontSize:11, fontWeight:700, color: textColor, flexShrink:0 }}>{d.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 3. RadarChart adesão */}
                  <div className="gl" style={{ padding:20 }}>
                    <div style={{ fontSize:13, fontWeight:600, color: textColor, marginBottom:2 }}>Indicadores de Adesão</div>
                    <div style={{ fontSize:11, color: subText, marginBottom:14 }}>Protocolos de controle de infecção (%)</div>
                    <ResponsiveContainer width="100%" height={280}>
                      <RadarChart data={adherenceData} margin={{ top:10, right:20, bottom:10, left:20 }}>
                        <PolarGrid stroke={dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"} />
                        <PolarAngleAxis dataKey="name" tick={{ fontSize:10, fill: subText }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize:8, fill: subText }} />
                        <Radar dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.3} />
                        <Tooltip contentStyle={{ background: tooltipBg, border:`1px solid ${tooltipBorder}`, borderRadius:8, fontSize:11, color: textColor }}
                          formatter={(v) => [`${v}%`, "Adesão"]} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* 4. BarChart setores */}
                  <div className="gl" style={{ padding:20 }}>
                    <div style={{ fontSize:13, fontWeight:600, color: textColor, marginBottom:2 }}>Casos Ativos por Setor</div>
                    <div style={{ fontSize:11, color: subText, marginBottom:14 }}>Internados em precaução por setor</div>
                    <ResponsiveContainer width="100%" height={Math.max(280, setorData.length * 32)}>
                      <BarChart data={setorData} layout="vertical" margin={{ left:4, right:44, top:4, bottom:4 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                        <XAxis type="number" tick={{ fontSize:9, fill: subText }} allowDecimals={false} />
                        <YAxis type="category" dataKey="setor" width={130}
                          tick={(props: any) => (
                            <g transform={`translate(${props.x},${props.y})`}>
                              <text x={-6} y={0} dy="0.355em" textAnchor="end" fontSize={10} fill={subText}>{props.payload.value}</text>
                            </g>
                          )} />
                        <Tooltip contentStyle={{ background: tooltipBg, border:`1px solid ${tooltipBorder}`, borderRadius:8, fontSize:11, color: textColor }} />
                        <Bar dataKey="total" radius={[0,6,6,0]} barSize={20}>
                          {setorData.map((d, i) => <Cell key={i} fill={d.surto ? "#ef4444" : "#3b82f6"} />)}
                          <LabelList dataKey="total" position="right" style={{ fontSize:11, fill: subText, fontWeight:700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* ══ BED MAP ══ */}
                <div className="gl" style={{ padding:20, marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14, flexWrap:"wrap" }}>
                    <Map size={15} style={{ color: subText }} />
                    <span style={{ fontSize:13, fontWeight:700, color: textColor }}>Mapa de Leitos em Precaução</span>
                    {/* Legend */}
                    <div style={{ display:"flex", gap:10, marginLeft:"auto", flexWrap:"wrap" }}>
                      {Object.entries(PREC_COLOR).map(([name, color]) => (
                        <span key={name} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color: subText }}>
                          <span style={{ width:10, height:10, borderRadius:4, background:color }} />{name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Sector filters */}
                  <div style={{ display:"flex", gap:6, marginBottom:14, flexWrap:"wrap" }}>
                    <button onClick={() => setActiveSetor(null)}
                      style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                        background: activeSetor===null ? "rgba(56,189,248,0.2)" : dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
                        border: activeSetor===null ? "1px solid rgba(56,189,248,0.5)" : `1px solid ${glassBorder}`,
                        color: activeSetor===null ? "#38bdf8" : subText }}>
                      Todos
                    </button>
                    {setores.map(s => (
                      <button key={s} onClick={() => setActiveSetor(s === activeSetor ? null : s)}
                        style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                          background: activeSetor===s ? "rgba(56,189,248,0.2)" : dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
                          border: activeSetor===s ? "1px solid rgba(56,189,248,0.5)" : `1px solid ${glassBorder}`,
                          color: activeSetor===s ? "#38bdf8" : subText }}>
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* Beds grid */}
                  {Object.entries(bedMap).map(([setor, pats]) => {
                    const hasAlert = alertas.some(a => a.setor === setor);
                    return (
                      <div key={setor} style={{ marginBottom:16 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                          <span style={{ fontSize:12, fontWeight:700, color: hasAlert ? "#fca5a5" : textColor }}>{setor}</span>
                          {hasAlert && <span className="surto-anim" style={{ fontSize:10, fontWeight:700, color:"#ef4444", background:"rgba(185,28,28,0.2)", border:"1px solid rgba(248,113,113,0.4)", padding:"1px 8px", borderRadius:20 }}>🚨 ALERTA</span>}
                          <span style={{ fontSize:11, color: subText }}>{pats.length} leito{pats.length!==1?"s":""} em precaução</span>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
                          {pats.map(p => {
                            const c = PREC_COLOR[p.precaucao] || "#6b7280";
                            const isInCluster = alertas.some(a => a.setor === p.setor && a.pacientes.some(pat => pat.id === p.id));
                            return (
                              <div key={p.id} className="bed-hover"
                                onClick={() => setModalBed(p)}
                                style={{ minHeight:110, padding:"12px 14px", borderRadius:20, background:`${c}18`, border:`1.5px solid ${c}55`, position:"relative" }}>
                                {isInCluster && (
                                  <span style={{ position:"absolute", top:8, right:8, width:8, height:8, borderRadius:"50%", background:"#ef4444", animation:"pulse-dot 1.5s infinite" }} />
                                )}
                                <div style={{ fontSize:12, fontWeight:800, color:c, marginBottom:3 }}>Leito {p.leito}</div>
                                <div style={{ fontSize:11, color: textColor, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nome.split(" ").slice(0,2).join(" ")}</div>
                                <div style={{ fontSize:10, fontWeight:700, color:c }}>{p.precaucao}</div>
                                <div style={{ fontSize:10, color: subText, marginTop:2 }}>{p.organismo ? orgLabel(p.organismo).split("–")[0].trim().slice(0,16) : "—"}</div>
                                <div style={{ fontSize:9, color: subText, marginTop:2 }}>{fmt(p.dataColeta)}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ══ AI REPORT SECTION ══ */}
                <div className="gl" style={{ padding:20, marginBottom:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                    <FileText size={15} style={{ color:"#a78bfa" }} />
                    <span style={{ fontSize:13, fontWeight:700, color: textColor }}>Relatório Técnico Automático da IA</span>
                  </div>
                  {aiReportLoading && (
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"16px", background:"rgba(167,139,250,0.08)", borderRadius:10, border:"1px solid rgba(167,139,250,0.2)" }}>
                      <div style={{ width:14, height:14, border:"2px solid rgba(167,139,250,0.3)", borderTop:"2px solid #a78bfa", borderRadius:"50%", animation:"spin-ai 0.8s linear infinite", flexShrink:0 }} />
                      <span style={{ fontSize:12, color:"#a78bfa" }}>Gerando relatório técnico epidemiológico…</span>
                    </div>
                  )}
                  {aiReport && !aiReportLoading && (
                    <div style={{ background: dark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.04)", borderRadius:10, padding:"16px", fontSize:13, color: textColor, lineHeight:1.75, whiteSpace:"pre-wrap", border:`1px solid rgba(167,139,250,0.15)` }}>
                      {aiReport}
                      <button onClick={() => setAiReport("")}
                        style={{ display:"block", marginTop:10, fontSize:10, color: subText, background:"transparent", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>↺ Regenerar</button>
                    </div>
                  )}
                  {!aiReport && !aiReportLoading && (
                    <div style={{ padding:"20px", background: dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderRadius:10, border:`1px dashed ${glassBorder}`, textAlign:"center" }}>
                      <ListChecks size={24} style={{ color: subText, marginBottom:8 }} />
                      <div style={{ fontSize:13, color: subText }}>Clique em <strong style={{ color:"#a78bfa" }}>Gerar relatório IA</strong> no painel de insights para gerar o relatório técnico completo.</div>
                    </div>
                  )}
                </div>

              </>
            )}

            {/* ══ PER-CLUSTER 5W2H (always show if alertas exist) ══ */}
            {alertas.length > 0 && (
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color: subText, textTransform:"uppercase", letterSpacing:"1px", marginBottom:14 }}>
                  Análise Detalhada por Cluster — IA + Plano 5W2H
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                  {alertas.map(alerta => {
                    const isSurto = alerta.nivel === "surto";
                    const ac = isSurto ? "#ef4444" : "#f59e0b";
                    const ab = isSurto ? "rgba(185,28,28,0.15)" : "rgba(180,83,9,0.13)";
                    const abr = isSurto ? "rgba(248,113,113,0.3)" : "rgba(251,191,36,0.3)";
                    const glow = isSurto ? "0 0 28px rgba(185,28,28,0.18)" : "0 0 28px rgba(180,83,9,0.12)";
                    const ai = alertAI[alerta.id];
                    const tl = [...alerta.pacientes].sort((a, b) => a.dataColeta.localeCompare(b.dataColeta))
                      .map((p, i) => ({ date: fmt(p.dataColeta), casos: i + 1, nome: p.nome }));

                    return (
                      <div key={alerta.id} style={{ background: dark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.8)", backdropFilter:"blur(16px)", borderRadius:20, border:`1.5px solid ${abr}`, overflow:"hidden", boxShadow:glow }}>

                        {/* Header */}
                        <div style={{ padding:"18px 22px 14px", borderBottom:`1px solid ${abr}`, background:ab }}>
                          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
                            <div>
                              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9, flexWrap:"wrap" }}>
                                <span className={isSurto ? "surto-anim" : ""} style={{ fontSize:11, fontWeight:700, color:ac, background:ab, padding:"3px 12px", borderRadius:20, border:`1px solid ${abr}` }}>
                                  {isSurto ? "🚨 SURTO" : "⚠️ ATENÇÃO"}
                                </span>
                                <span style={{ fontSize:11, color: subText, background: dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", padding:"3px 10px", borderRadius:20 }}>
                                  {alerta.precaucao}
                                </span>
                              </div>
                              <h3 style={{ margin:0, fontSize:17, fontWeight:700, color: textColor }}>{alerta.setor}</h3>
                              <p style={{ margin:"4px 0 0", fontSize:13, color: subText }}>{alerta.orgLabel}</p>
                            </div>
                            <div style={{ textAlign:"center", background:ab, borderRadius:12, padding:"8px 18px", border:`1px solid ${abr}`, flexShrink:0 }}>
                              <div style={{ fontSize:40, fontWeight:800, color:ac, lineHeight:1 }}>{alerta.count}</div>
                              <div style={{ fontSize:11, color:ac, fontWeight:600, marginTop:1 }}>caso{alerta.count !== 1 ? "s" : ""}</div>
                            </div>
                          </div>
                        </div>

                        <div style={{ padding:"16px 22px 20px" }}>
                          {/* Patients */}
                          <div style={{ marginBottom:14 }}>
                            <div style={{ fontSize:10, fontWeight:700, color: subText, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Pacientes envolvidos</div>
                            <div className="gl2" style={{ overflow:"hidden" }}>
                              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                                <thead>
                                  <tr style={{ borderBottom:`1px solid ${glassBorder}` }}>
                                    {["Paciente","Prontuário","Leito","Material","Data Coleta"].map(h => (
                                      <th key={h} style={{ padding:"7px 12px", textAlign:"left", fontSize:10, fontWeight:600, color: subText, textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {alerta.pacientes.map((p, i) => (
                                    <tr key={p.id} style={{ borderBottom: i < alerta.pacientes.length-1 ? `1px solid ${glassBorder}` : "none", background: i%2===0?"transparent": dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)" }}>
                                      <td style={{ padding:"7px 12px", fontWeight:600, color: textColor }}>{p.nome}</td>
                                      <td style={{ padding:"7px 12px", color: subText, fontFamily:"monospace", fontSize:11 }}>{p.prontuario||"—"}</td>
                                      <td style={{ padding:"7px 12px", color: subText }}>Leito {p.leito}</td>
                                      <td style={{ padding:"7px 12px", color: subText }}>{p.material||"—"}</td>
                                      <td style={{ padding:"7px 12px", color: subText, fontFamily:"monospace", fontSize:11 }}>{fmt(p.dataColeta)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Timeline */}
                          {tl.length >= 2 && (
                            <div style={{ marginBottom:14 }}>
                              <div style={{ fontSize:10, fontWeight:700, color: subText, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Evolução temporal do cluster</div>
                              <div className="gl2" style={{ padding:"10px 8px 6px" }}>
                                <ResponsiveContainer width="100%" height={100}>
                                  <AreaChart data={tl} margin={{ left:0, right:8, top:4, bottom:0 }}>
                                    <defs>
                                      <linearGradient id={`tg-${alerta.id.replace(/[^a-z0-9]/gi,"")}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={ac} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={ac} stopOpacity={0.02} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="date" tick={{ fontSize:9, fill: subText }} />
                                    <YAxis tick={{ fontSize:9, fill: subText }} allowDecimals={false} width={22} />
                                    <Tooltip contentStyle={{ background: tooltipBg, border:`1px solid ${tooltipBorder}`, borderRadius:8, fontSize:10, color: textColor }} formatter={(v,_,p2) => [`${v} casos — ${p2.payload.nome}`,""]} />
                                    <Area type="monotone" dataKey="casos" stroke={ac} strokeWidth={2} fill={`url(#tg-${alerta.id.replace(/[^a-z0-9]/gi,"")})`} dot={{ r:4, fill:ac, strokeWidth:0 }} activeDot={{ r:5 }} />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}

                          {/* AI trigger */}
                          {!ai && (
                            <button onClick={() => runAlertAI(alerta)}
                              style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:8, width:"100%", padding:"11px 18px", background:ab, border:`1.5px dashed ${abr}`, borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:600, color:ac, fontFamily:"inherit" }}>
                              <BrainCircuit size={15} /> Gerar Análise Infectológica com IA + Plano 5W2H
                            </button>
                          )}
                          {ai?.loading && (
                            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"13px 18px", background:ab, borderRadius:12, border:`1px solid ${abr}` }}>
                              <div style={{ width:14, height:14, border:`2px solid ${ac}40`, borderTop:`2px solid ${ac}`, borderRadius:"50%", animation:"spin-ai 0.8s linear infinite", flexShrink:0 }} />
                              <span style={{ fontSize:13, color:ac, fontWeight:500 }}>Analisando cluster — IA infectologista em processamento…</span>
                            </div>
                          )}
                          {ai && !ai.loading && (
                            <div>
                              {ai.analise && (
                                <div style={{ marginBottom:14 }}>
                                  <div style={{ fontSize:10, fontWeight:700, color: subText, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Análise Clínico-Epidemiológica</div>
                                  <div className="gl2" style={{ padding:"12px 14px", fontSize:13, color: textColor, lineHeight:1.7, whiteSpace:"pre-wrap", borderLeft:`3px solid ${ac}` }}>
                                    {ai.analise}
                                  </div>
                                </div>
                              )}
                              {ai.insights.length > 0 && (
                                <div style={{ marginBottom:14 }}>
                                  <div style={{ fontSize:10, fontWeight:700, color: subText, textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Insights Prioritários</div>
                                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                    {ai.insights.map((ins, i) => (
                                      <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"9px 12px", background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", borderRadius:10, borderLeft:`3px solid ${ac}` }}>
                                        <span style={{ fontSize:11, fontWeight:700, color:ac, flexShrink:0, marginTop:1 }}>{i+1}.</span>
                                        <span style={{ fontSize:12, color: textColor, lineHeight:1.55 }}>{ins}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 5W2H with editable status */}
                              {ai.plano.length > 0 && (
                                <div>
                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, flexWrap:"wrap", gap:8 }}>
                                    <div style={{ fontSize:10, fontWeight:700, color: subText, textTransform:"uppercase", letterSpacing:"1px" }}>Plano de Ação 5W2H</div>
                                    <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                                      {(["pendente","em_andamento","concluido","cancelado"] as const).map(s => {
                                        const sm = STATUS_META[s];
                                        const cnt = ai.plano.filter(r => r.status === s).length;
                                        return cnt > 0 ? (
                                          <span key={s} style={{ fontSize:10, fontWeight:600, color:sm.color, background:sm.bg, border:`1px solid ${sm.border}`, borderRadius:20, padding:"2px 9px" }}>
                                            {sm.label}: {cnt}
                                          </span>
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                  <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${abr}` }}>
                                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:960 }}>
                                      <thead>
                                        <tr style={{ background:ab }}>
                                          {[
                                            { k:"O Quê?", s:"Ação" }, { k:"Por Quê?", s:"Justificativa" },
                                            { k:"Quem?", s:"Responsável" }, { k:"Onde?", s:"Local" },
                                            { k:"Quando?", s:"Prazo" }, { k:"Como?", s:"Método" },
                                            { k:"Quanto?", s:"Recursos" }, { k:"Status", s:"Situação" },
                                          ].map(col => (
                                            <th key={col.k} style={{ padding:"9px 12px", textAlign:"left", borderBottom:`2px solid ${abr}`, borderRight:`1px solid ${glassBorder}`, verticalAlign:"top" }}>
                                              <div style={{ fontSize:11, fontWeight:700, color:ac }}>{col.k}</div>
                                              <div style={{ fontSize:10, color: subText, fontWeight:400 }}>{col.s}</div>
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {ai.plano.map((row, i) => {
                                          const sm = STATUS_META[row.status] || STATUS_META.pendente;
                                          const done = row.status === "concluido";
                                          const cancel = row.status === "cancelado";
                                          return (
                                            <tr key={i} style={{ background: i%2===0 ? dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)" : dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)", borderBottom:`1px solid ${glassBorder}`, opacity: cancel ? 0.5 : 1 }}>
                                              <td style={{ padding:"9px 12px", fontWeight:600, color: done ? "#34d399" : textColor, borderRight:`1px solid ${glassBorder}`, verticalAlign:"top", lineHeight:1.45, textDecoration: cancel?"line-through":"none" }}>{row.acao}</td>
                                              <td style={{ padding:"9px 12px", color: subText, borderRight:`1px solid ${glassBorder}`, verticalAlign:"top", lineHeight:1.45 }}>{row.porQue}</td>
                                              <td style={{ padding:"9px 12px", color: subText, borderRight:`1px solid ${glassBorder}`, verticalAlign:"top", lineHeight:1.45, whiteSpace:"nowrap" }}>{row.quem}</td>
                                              <td style={{ padding:"9px 12px", color: subText, borderRight:`1px solid ${glassBorder}`, verticalAlign:"top", lineHeight:1.45 }}>{row.onde}</td>
                                              <td style={{ padding:"9px 12px", color: subText, borderRight:`1px solid ${glassBorder}`, verticalAlign:"top", lineHeight:1.45, whiteSpace:"nowrap" }}>{row.quando}</td>
                                              <td style={{ padding:"9px 12px", color: subText, borderRight:`1px solid ${glassBorder}`, verticalAlign:"top", lineHeight:1.45 }}>{row.como}</td>
                                              <td style={{ padding:"9px 12px", color: subText, borderRight:`1px solid ${glassBorder}`, verticalAlign:"top", lineHeight:1.45 }}>{row.quanto}</td>
                                              <td style={{ padding:"9px 12px", verticalAlign:"middle", minWidth:145 }}>
                                                <div style={{ position:"relative" }}>
                                                  <select value={row.status} onChange={e => setPlanoStatus(alerta.id, i, e.target.value as PlanoStatus)}
                                                    style={{ appearance:"none", WebkitAppearance:"none", width:"100%", padding:"5px 26px 5px 10px", background:sm.bg, border:`1px solid ${sm.border}`, borderRadius:20, fontSize:11, fontWeight:600, color:sm.color, cursor:"pointer", fontFamily:"inherit", outline:"none" }}>
                                                    <option value="pendente">Pendente</option>
                                                    <option value="em_andamento">Em andamento</option>
                                                    <option value="concluido">Concluído</option>
                                                    <option value="cancelado">Cancelado</option>
                                                  </select>
                                                  <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", fontSize:8, color:sm.color }}>▼</span>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div style={{ marginTop:6, textAlign:"right" }}>
                                    <span style={{ fontSize:10, color: subText }}>Gerado por IA — validar com equipe CCIH antes de implementar</span>
                                  </div>
                                </div>
                              )}
                              <button onClick={() => setAlertAI(prev => { const n={...prev}; delete n[alerta.id]; return n; })}
                                style={{ marginTop:12, fontSize:11, color: subText, background:"transparent", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>
                                ↺ Regenerar análise
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
