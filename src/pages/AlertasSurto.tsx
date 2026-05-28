import { useState, useMemo, useEffect, useCallback } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { sendToAgent } from "@/lib/agent-service";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, RefreshCw, Siren, BrainCircuit, Map, ShieldAlert } from "lucide-react";

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

  /* ── fetch ── */
  const fetchData = useCallback(async () => {
    if (!hospitalId) return;
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

  /* ── derivados ── */
  const internados = useMemo(() => patients.filter(p => p.status === "Internado"), [patients]);

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

  /* ── status do plano ── */
  const setPlanoStatus = (alertId: string, idx: number, status: PlanoStatus) => {
    setAlertAI(prev => {
      const e = prev[alertId];
      if (!e) return prev;
      return { ...prev, [alertId]: { ...e, plano: e.plano.map((r, i) => i === idx ? { ...r, status } : r) } };
    });
  };

  /* ─────────────────────────────────── RENDER ─── */
  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background:"linear-gradient(135deg, #060b15 0%, #0d1a2e 60%, #080f1e 100%)", minHeight:"100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`
        * { box-sizing: border-box; }
        .gl  { background:rgba(255,255,255,0.05); backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,0.09); border-radius:16px; }
        .gl2 { background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.07); border-radius:12px; }
        @keyframes surto-pulse { 0%,100%{opacity:1} 50%{opacity:.55} }
        @keyframes spin-ai { to{transform:rotate(360deg)} }
        .surto-anim { animation: surto-pulse 2s ease-in-out infinite; }
        .bed-card { transition: transform .15s, box-shadow .15s; cursor: default; }
        .bed-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,0.4); }
        select option { background: #0d1a2e; color: #fff; }
      `}</style>

      {/* ══ HEADER ══ */}
      <header style={{ background:"rgba(0,0,0,0.35)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(255,255,255,0.07)", position:"sticky", top:0, zIndex:40 }}>
        <div style={{ padding:"0 24px", height:56, display:"flex", alignItems:"center", gap:14 }}>
          <button onClick={() => navigate("/precautions/mapping")}
            style={{ background:"transparent", border:"none", cursor:"pointer", color:"rgba(255,255,255,0.5)", display:"flex", alignItems:"center", gap:6, fontSize:12, fontFamily:"inherit", padding:0 }}>
            <ArrowLeft size={16} /> Mapa de Precaução
          </button>
          <span style={{ color:"rgba(255,255,255,0.2)" }}>|</span>
          <Siren size={16} style={{ color:"#ef4444" }} />
          <span style={{ color:"#fff", fontWeight:700, fontSize:15 }}>Controle Inteligente de Surtos</span>
          <span style={{ marginLeft:"auto", fontSize:11, color:"rgba(255,255,255,0.35)" }}>
            {hospitalName && <><span style={{ color:"rgba(255,255,255,0.6)", fontWeight:500 }}>{hospitalName}</span> · </>}
            {new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"short", year:"numeric" })}
          </span>
          <button onClick={fetchData}
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.12)", borderRadius:8, padding:"5px 10px", cursor:"pointer", color:"rgba(255,255,255,0.6)", display:"flex", alignItems:"center", gap:5, fontSize:11, fontFamily:"inherit" }}>
            <RefreshCw size={12} /> Atualizar
          </button>
        </div>

        {/* Status bar */}
        <div style={{ padding:"6px 24px 10px", display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontWeight:600, textTransform:"uppercase", letterSpacing:"1px" }}>Setores em alerta:</span>
          {loading
            ? <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>Carregando…</span>
            : alertas.length === 0
              ? <span style={{ fontSize:11, color:"rgba(52,211,153,0.7)" }}>✓ Nenhum cluster ativo</span>
              : alertas.map(a => (
                  <span key={a.id} className={a.nivel === "surto" ? "surto-anim" : ""}
                    style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px 3px 7px", borderRadius:20, fontSize:11, fontWeight:600,
                      background: a.nivel === "surto" ? "rgba(185,28,28,0.3)" : "rgba(180,83,9,0.25)",
                      border: a.nivel === "surto" ? "1px solid rgba(248,113,113,0.5)" : "1px solid rgba(251,191,36,0.4)",
                      color: a.nivel === "surto" ? "#fca5a5" : "#fde68a" }}>
                    <span style={{ width:5, height:5, borderRadius:"50%", background: a.nivel === "surto" ? "#ef4444" : "#f59e0b" }} />
                    {a.setor} · {a.orgLabel.split("–")[0].trim()}
                  </span>
                ))
          }
        </div>
      </header>

      {loading ? (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"60vh", flexDirection:"column", gap:16 }}>
          <div style={{ width:36, height:36, border:"3px solid rgba(255,255,255,0.1)", borderTop:"3px solid #ef4444", borderRadius:"50%", animation:"spin-ai 0.8s linear infinite" }} />
          <span style={{ color:"rgba(255,255,255,0.4)", fontSize:13 }}>Carregando dados do mapeamento…</span>
        </div>
      ) : (
        <main style={{ padding:"24px 24px 60px" }}>

          {/* ══ KPI CARDS ══ */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))", gap:12, marginBottom:24 }}>
            {[
              { lbl:"Internados",         val:internados.length,                                          c:"rgba(255,255,255,0.75)", cls:"gl" },
              { lbl:"Total Alertas",      val:alertas.length,                                             c:"#fca5a5",  cls:"gl", bg:"rgba(185,28,28,0.12)", border:"rgba(248,113,113,0.2)" },
              { lbl:"Surtos Ativos",      val:alertas.filter(a => a.nivel==="surto").length,              c:"#f87171",  cls:"gl", bg:"rgba(185,28,28,0.18)", border:"rgba(248,113,113,0.3)" },
              { lbl:"Em Atenção",         val:alertas.filter(a => a.nivel==="atencao").length,            c:"#fde68a",  cls:"gl", bg:"rgba(180,83,9,0.15)",  border:"rgba(251,191,36,0.3)"  },
              { lbl:"Pacientes em Risco", val:alertas.reduce((s,a) => s+a.count, 0),                     c:"#93c5fd",  cls:"gl", bg:"rgba(29,78,216,0.12)", border:"rgba(96,165,250,0.25)" },
              { lbl:"Setores Afetados",   val:[...new Set(alertas.map(a=>a.setor))].length,              c:"#fde68a",  cls:"gl", bg:"rgba(180,83,9,0.12)",  border:"rgba(251,191,36,0.25)" },
              { lbl:"Precaução Contato",  val:internados.filter(p=>p.precaucao==="Contato").length,       c:"#fbbf24",  cls:"gl" },
              { lbl:"Precaução Gotíc.",   val:internados.filter(p=>p.precaucao==="Gotículas").length,     c:"#60a5fa",  cls:"gl" },
            ].map(k => (
              <div key={k.lbl} style={{ background: (k as any).bg || "rgba(255,255,255,0.05)", backdropFilter:"blur(14px)", border:`1px solid ${(k as any).border || "rgba(255,255,255,0.09)"}`, borderRadius:16, padding:"14px 16px" }}>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.7px", marginBottom:7 }}>{k.lbl}</div>
                <div style={{ fontSize:32, fontWeight:700, color:k.c, lineHeight:1 }}>{k.val}</div>
              </div>
            ))}
          </div>

          {alertas.length === 0 ? (
            <div className="gl" style={{ textAlign:"center", padding:"64px 24px" }}>
              <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
              <div style={{ fontSize:18, fontWeight:700, color:"#fff", marginBottom:8 }}>Nenhum cluster ativo detectado</div>
              <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)", maxWidth:400, margin:"0 auto", lineHeight:1.6 }}>
                O sistema monitora automaticamente 2+ casos do mesmo microrganismo no mesmo setor.<br />
                Os dados são sincronizados com o Mapeamento de Precaução.
              </div>
              <button onClick={() => navigate("/precautions/mapping")}
                style={{ marginTop:20, display:"inline-flex", alignItems:"center", gap:8, padding:"10px 20px", background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:10, color:"rgba(255,255,255,0.7)", fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
                <Map size={15} /> Ir para Mapeamento de Precaução
              </button>
            </div>
          ) : (
            <>
              {/* ══ ROW: Alert List + Global AI ══ */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>

                {/* Alert list */}
                <div className="gl" style={{ padding:20 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                    <ShieldAlert size={16} style={{ color:"#ef4444" }} />
                    <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Clusters Detectados</span>
                    <span style={{ marginLeft:"auto", fontSize:11, color:"rgba(255,255,255,0.35)" }}>{alertas.length} ativo{alertas.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {alertas.map(a => {
                      const isSurto = a.nivel === "surto";
                      return (
                        <div key={a.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", borderRadius:12,
                          background: isSurto ? "rgba(185,28,28,0.12)" : "rgba(180,83,9,0.1)",
                          border: isSurto ? "1px solid rgba(248,113,113,0.3)" : "1px solid rgba(251,191,36,0.25)" }}>
                          <span className={isSurto ? "surto-anim" : ""} style={{ width:8, height:8, borderRadius:"50%", background: isSurto ? "#ef4444" : "#f59e0b", flexShrink:0 }} />
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:12, fontWeight:700, color:"#fff", marginBottom:1, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.setor}</div>
                            <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{a.orgLabel}</div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontSize:20, fontWeight:800, color: isSurto ? "#f87171" : "#fbbf24", lineHeight:1 }}>{a.count}</div>
                            <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", fontWeight:600, textTransform:"uppercase" }}>casos</div>
                          </div>
                          <span style={{ fontSize:10, fontWeight:700, color: isSurto ? "#fca5a5" : "#fde68a",
                            background: isSurto ? "rgba(185,28,28,0.3)" : "rgba(180,83,9,0.25)",
                            border: isSurto ? "1px solid rgba(248,113,113,0.4)" : "1px solid rgba(251,191,36,0.35)",
                            padding:"2px 8px", borderRadius:20, flexShrink:0, letterSpacing:"0.5px" }}>
                            {isSurto ? "SURTO" : "ATENÇÃO"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Global AI Insights */}
                <div className="gl" style={{ padding:20, display:"flex", flexDirection:"column" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:14 }}>
                    <BrainCircuit size={16} style={{ color:"#a78bfa" }} />
                    <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Insights da IA Especialista</span>
                    {!aiInsight.text && !aiInsight.loading && (
                      <button onClick={runGlobalAI}
                        style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, padding:"5px 12px", background:"rgba(167,139,250,0.15)", border:"1px solid rgba(167,139,250,0.35)", borderRadius:20, color:"#a78bfa", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>
                        ✦ Analisar cenário
                      </button>
                    )}
                  </div>
                  {aiInsight.loading && (
                    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"16px", background:"rgba(167,139,250,0.08)", borderRadius:10, border:"1px solid rgba(167,139,250,0.2)" }}>
                      <div style={{ width:14, height:14, border:"2px solid rgba(167,139,250,0.3)", borderTop:"2px solid #a78bfa", borderRadius:"50%", animation:"spin-ai 0.8s linear infinite", flexShrink:0 }} />
                      <span style={{ fontSize:12, color:"#a78bfa", fontWeight:500 }}>Analisando cenário epidemiológico…</span>
                    </div>
                  )}
                  {aiInsight.text && (
                    <div style={{ flex:1, background:"rgba(0,0,0,0.2)", borderRadius:10, padding:"14px", fontSize:13, color:"rgba(255,255,255,0.75)", lineHeight:1.7, whiteSpace:"pre-wrap", overflowY:"auto", border:"1px solid rgba(167,139,250,0.15)" }}>
                      {aiInsight.text}
                      <button onClick={() => setAiInsight({ loading:false, text:"" })}
                        style={{ display:"block", marginTop:10, fontSize:10, color:"rgba(255,255,255,0.3)", background:"transparent", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>↺ Regenerar</button>
                    </div>
                  )}
                  {!aiInsight.text && !aiInsight.loading && (
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                      {[
                        { title:"Alto risco de disseminação", body:"Múltiplos clusters ativos indicam falhas na barreira de precaução. Revisão de EPI e coorte prioritária.", c:"#f87171" },
                        { title:"Vigilância de contatos",     body:"Culturas de rastreamento nos pacientes adjacentes devem ser iniciadas em até 72 h.", c:"#fbbf24" },
                        { title:"Higiene das mãos",           body:"Audite a adesão nos 5 momentos OMS em todos os setores afetados.", c:"#60a5fa" },
                        { title:"Notificação CCIH",           body:"Todos os clusters devem ser formalizados com ficha de notificação interna.", c:"#34d399" },
                      ].map(item => (
                        <div key={item.title} style={{ padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:10, borderLeft:`3px solid ${item.c}` }}>
                          <div style={{ fontSize:11, fontWeight:700, color:item.c, marginBottom:3 }}>{item.title}</div>
                          <div style={{ fontSize:12, color:"rgba(255,255,255,0.55)", lineHeight:1.5 }}>{item.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ══ CHARTS ══ */}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:24 }}>

                {/* Epidemiological curve */}
                <div className="gl" style={{ padding:20 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:2 }}>Curva Epidemiológica Temporal</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:14 }}>Novos casos e acumulado — últimos 14 dias com coleta</div>
                  <ResponsiveContainer width="100%" height={180}>
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
                      <XAxis dataKey="date" tick={{ fontSize:9, fill:"rgba(255,255,255,0.35)" }} />
                      <YAxis tick={{ fontSize:9, fill:"rgba(255,255,255,0.35)" }} allowDecimals={false} width={24} />
                      <Tooltip contentStyle={{ background:"#0d1a2e", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, fontSize:11, color:"#fff" }} />
                      <Area type="monotone" dataKey="novos" name="Novos casos" stroke="#ef4444" strokeWidth={2} fill="url(#gradNovos)" dot={{ r:3, fill:"#ef4444", strokeWidth:0 }} />
                      <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke="#60a5fa" strokeWidth={2} fill="url(#gradAcum)" dot={{ r:3, fill:"#60a5fa", strokeWidth:0 }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Organism distribution */}
                <div className="gl" style={{ padding:20 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:2 }}>Distribuição por Microrganismo</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:14 }}>Internados por agente etiológico</div>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={orgData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={3}>
                          {orgData.map((_, i) => (
                            <Cell key={i} fill={["#ef4444","#f59e0b","#3b82f6","#10b981","#8b5cf6","#06b6d4","#f97316","#84cc16"][i % 8]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background:"#0d1a2e", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, fontSize:11, color:"#fff" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:5, overflow:"hidden" }}>
                      {orgData.slice(0, 6).map((d, i) => (
                        <div key={d.name} style={{ display:"flex", alignItems:"center", gap:7 }}>
                          <span style={{ width:8, height:8, borderRadius:"50%", background:["#ef4444","#f59e0b","#3b82f6","#10b981","#8b5cf6","#06b6d4"][i % 6], flexShrink:0 }} />
                          <span style={{ fontSize:11, color:"rgba(255,255,255,0.6)", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{d.name}</span>
                          <span style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.8)", flexShrink:0 }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Cases by sector */}
                <div className="gl" style={{ padding:20 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:2 }}>Casos Ativos por Setor</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:14 }}>Internados em precaução por setor</div>
                  <ResponsiveContainer width="100%" height={Math.max(120, setorData.length * 32)}>
                    <BarChart data={setorData} layout="vertical" margin={{ left:4, right:44, top:4, bottom:4 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.06)" />
                      <XAxis type="number" tick={{ fontSize:9, fill:"rgba(255,255,255,0.35)" }} allowDecimals={false} />
                      <YAxis type="category" dataKey="setor" width={130}
                        tick={(props: any) => (
                          <g transform={`translate(${props.x},${props.y})`}>
                            <text x={-6} y={0} dy="0.355em" textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.55)">{props.payload.value}</text>
                          </g>
                        )} />
                      <Tooltip contentStyle={{ background:"#0d1a2e", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, fontSize:11, color:"#fff" }} />
                      <Bar dataKey="total" radius={[0,6,6,0]} barSize={20}>
                        {setorData.map((d, i) => <Cell key={i} fill={d.surto ? "#ef4444" : "#3b82f6"} />)}
                        <LabelList dataKey="total" position="right" style={{ fontSize:11, fill:"rgba(255,255,255,0.55)", fontWeight:700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Precaution types */}
                <div className="gl" style={{ padding:20 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:2 }}>Tipos de Precaução Ativas</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:14 }}>Distribuição entre internados</div>
                  <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={precData} cx="50%" cy="50%" innerRadius={45} outerRadius={72} dataKey="value" paddingAngle={4}>
                          {precData.map((d) => <Cell key={d.name} fill={PREC_COLOR[d.name] || "#6b7280"} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background:"#0d1a2e", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, fontSize:11, color:"#fff" }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex:1, display:"flex", flexDirection:"column", gap:10 }}>
                      {precData.map(d => (
                        <div key={d.name}>
                          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                            <span style={{ fontSize:12, color:"rgba(255,255,255,0.65)", fontWeight:500 }}>{d.name}</span>
                            <span style={{ fontSize:12, fontWeight:700, color: PREC_COLOR[d.name] }}>{d.value}</span>
                          </div>
                          <div style={{ height:5, background:"rgba(255,255,255,0.08)", borderRadius:3, overflow:"hidden" }}>
                            <div style={{ height:"100%", borderRadius:3, background: PREC_COLOR[d.name],
                              width:`${internados.length ? (d.value/internados.length)*100 : 0}%`, transition:"width .6s" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ══ BED MAP ══ */}
              <div className="gl" style={{ padding:20, marginBottom:24 }}>
                <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
                  <Map size={16} style={{ color:"rgba(255,255,255,0.5)" }} />
                  <span style={{ fontSize:13, fontWeight:700, color:"#fff" }}>Mapa Interativo de Precauções</span>
                  <div style={{ display:"flex", gap:6, marginLeft:"auto", flexWrap:"wrap" }}>
                    <button onClick={() => setActiveSetor(null)}
                      style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                        background: activeSetor===null ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                        border: activeSetor===null ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.1)",
                        color: activeSetor===null ? "#fff" : "rgba(255,255,255,0.45)" }}>
                      Todos
                    </button>
                    {setores.map(s => (
                      <button key={s} onClick={() => setActiveSetor(s === activeSetor ? null : s)}
                        style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit",
                          background: activeSetor===s ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)",
                          border: activeSetor===s ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)",
                          color: activeSetor===s ? "#fff" : "rgba(255,255,255,0.4)" }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div style={{ display:"flex", gap:14, marginBottom:14, flexWrap:"wrap" }}>
                  {Object.entries(PREC_COLOR).map(([name, color]) => (
                    <span key={name} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"rgba(255,255,255,0.5)" }}>
                      <span style={{ width:10, height:10, borderRadius:3, background:color, flexShrink:0 }} />{name}
                    </span>
                  ))}
                  <span style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:"rgba(255,255,255,0.5)" }}>
                    <span style={{ width:10, height:10, borderRadius:3, background:"rgba(185,28,28,0.5)", border:"1px solid #ef4444", flexShrink:0 }} />Surto no setor
                  </span>
                </div>

                {Object.entries(bedMap).map(([setor, pats]) => {
                  const hasAlert = alertas.some(a => a.setor === setor);
                  return (
                    <div key={setor} style={{ marginBottom:16 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color: hasAlert ? "#fca5a5" : "rgba(255,255,255,0.7)" }}>{setor}</span>
                        {hasAlert && <span className="surto-anim" style={{ fontSize:10, fontWeight:700, color:"#ef4444", background:"rgba(185,28,28,0.2)", border:"1px solid rgba(248,113,113,0.4)", padding:"1px 8px", borderRadius:20 }}>🚨 ALERTA</span>}
                        <span style={{ fontSize:11, color:"rgba(255,255,255,0.3)" }}>{pats.length} leito{pats.length !== 1 ? "s" : ""} em precaução</span>
                      </div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                        {pats.map(p => {
                          const c = PREC_COLOR[p.precaucao] || "#6b7280";
                          return (
                            <div key={p.id} className="bed-card" style={{ width:82, padding:"8px 10px", borderRadius:10, background:`${c}18`, border:`1.5px solid ${c}55` }}>
                              <div style={{ fontSize:10, fontWeight:700, color:c, marginBottom:3 }}>Leito {p.leito}</div>
                              <div style={{ fontSize:9, color:"rgba(255,255,255,0.6)", lineHeight:1.4, marginBottom:3, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.nome.split(" ")[0]}</div>
                              <div style={{ fontSize:8, color:"rgba(255,255,255,0.4)", lineHeight:1.3 }}>{p.organismo ? orgLabel(p.organismo).split("–")[0].trim() : p.precaucao}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ══ ALERT CARDS with AI + 5W2H ══ */}
              <div style={{ marginBottom:8 }}>
                <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:14 }}>
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
                      <div key={alerta.id} style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(16px)", borderRadius:20, border:`1.5px solid ${abr}`, overflow:"hidden", boxShadow:glow }}>

                        {/* Header */}
                        <div style={{ padding:"18px 22px 14px", borderBottom:`1px solid ${abr}`, background:ab }}>
                          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
                            <div>
                              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9, flexWrap:"wrap" }}>
                                <span className={isSurto ? "surto-anim" : ""} style={{ fontSize:11, fontWeight:700, color:ac, background:ab, padding:"3px 12px", borderRadius:20, border:`1px solid ${abr}` }}>
                                  {isSurto ? "🚨 SURTO" : "⚠️ ATENÇÃO"}
                                </span>
                                <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)", background:"rgba(255,255,255,0.06)", padding:"3px 10px", borderRadius:20 }}>
                                  {alerta.precaucao}
                                </span>
                              </div>
                              <h3 style={{ margin:0, fontSize:17, fontWeight:700, color:"#fff" }}>{alerta.setor}</h3>
                              <p style={{ margin:"4px 0 0", fontSize:13, color:"rgba(255,255,255,0.5)" }}>{alerta.orgLabel}</p>
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
                            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Pacientes envolvidos</div>
                            <div className="gl2" style={{ overflow:"hidden" }}>
                              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                                <thead>
                                  <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
                                    {["Paciente","Prontuário","Leito","Material","Data Coleta"].map(h => (
                                      <th key={h} style={{ padding:"7px 12px", textAlign:"left", fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {alerta.pacientes.map((p, i) => (
                                    <tr key={p.id} style={{ borderBottom: i < alerta.pacientes.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none", background: i%2===0?"transparent":"rgba(255,255,255,0.02)" }}>
                                      <td style={{ padding:"7px 12px", fontWeight:600, color:"rgba(255,255,255,0.82)" }}>{p.nome}</td>
                                      <td style={{ padding:"7px 12px", color:"rgba(255,255,255,0.42)", fontFamily:"monospace", fontSize:11 }}>{p.prontuario||"—"}</td>
                                      <td style={{ padding:"7px 12px", color:"rgba(255,255,255,0.48)" }}>Leito {p.leito}</td>
                                      <td style={{ padding:"7px 12px", color:"rgba(255,255,255,0.48)" }}>{p.material||"—"}</td>
                                      <td style={{ padding:"7px 12px", color:"rgba(255,255,255,0.42)", fontFamily:"monospace", fontSize:11 }}>{fmt(p.dataColeta)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Timeline */}
                          {tl.length >= 2 && (
                            <div style={{ marginBottom:14 }}>
                              <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Evolução temporal do cluster</div>
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
                                    <XAxis dataKey="date" tick={{ fontSize:9, fill:"rgba(255,255,255,0.35)" }} />
                                    <YAxis tick={{ fontSize:9, fill:"rgba(255,255,255,0.35)" }} allowDecimals={false} width={22} />
                                    <Tooltip contentStyle={{ background:"#0d1a2e", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, fontSize:10, color:"#fff" }} formatter={(v,_,p2) => [`${v} casos — ${p2.payload.nome}`,""]} />
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
                                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Análise Clínico-Epidemiológica</div>
                                  <div className="gl2" style={{ padding:"12px 14px", fontSize:13, color:"rgba(255,255,255,0.75)", lineHeight:1.7, whiteSpace:"pre-wrap", borderLeft:`3px solid ${ac}` }}>
                                    {ai.analise}
                                  </div>
                                </div>
                              )}
                              {ai.insights.length > 0 && (
                                <div style={{ marginBottom:14 }}>
                                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Insights Prioritários</div>
                                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                    {ai.insights.map((ins, i) => (
                                      <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"9px 12px", background:"rgba(255,255,255,0.04)", borderRadius:10, borderLeft:`3px solid ${ac}` }}>
                                        <span style={{ fontSize:11, fontWeight:700, color:ac, flexShrink:0, marginTop:1 }}>{i+1}.</span>
                                        <span style={{ fontSize:12, color:"rgba(255,255,255,0.7)", lineHeight:1.55 }}>{ins}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* 5W2H with editable status */}
                              {ai.plano.length > 0 && (
                                <div>
                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8, flexWrap:"wrap", gap:8 }}>
                                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.3)", textTransform:"uppercase", letterSpacing:"1px" }}>Plano de Ação 5W2H</div>
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
                                            <th key={col.k} style={{ padding:"9px 12px", textAlign:"left", borderBottom:`2px solid ${abr}`, borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top" }}>
                                              <div style={{ fontSize:11, fontWeight:700, color:ac }}>{col.k}</div>
                                              <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", fontWeight:400 }}>{col.s}</div>
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
                                            <tr key={i} style={{ background: i%2===0?"rgba(255,255,255,0.02)":"rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.05)", opacity: cancel ? 0.5 : 1 }}>
                                              <td style={{ padding:"9px 12px", fontWeight:600, color: done?"rgba(52,211,153,0.85)":"rgba(255,255,255,0.82)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45, textDecoration: cancel?"line-through":"none" }}>{row.acao}</td>
                                              <td style={{ padding:"9px 12px", color:"rgba(255,255,255,0.52)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45 }}>{row.porQue}</td>
                                              <td style={{ padding:"9px 12px", color:"rgba(255,255,255,0.52)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45, whiteSpace:"nowrap" }}>{row.quem}</td>
                                              <td style={{ padding:"9px 12px", color:"rgba(255,255,255,0.52)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45 }}>{row.onde}</td>
                                              <td style={{ padding:"9px 12px", color:"rgba(255,255,255,0.52)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45, whiteSpace:"nowrap" }}>{row.quando}</td>
                                              <td style={{ padding:"9px 12px", color:"rgba(255,255,255,0.52)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45 }}>{row.como}</td>
                                              <td style={{ padding:"9px 12px", color:"rgba(255,255,255,0.52)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45 }}>{row.quanto}</td>
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
                                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.22)" }}>Gerado por IA — validar com equipe CCIH antes de implementar</span>
                                  </div>
                                </div>
                              )}
                              <button onClick={() => setAlertAI(prev => { const n={...prev}; delete n[alerta.id]; return n; })}
                                style={{ marginTop:12, fontSize:11, color:"rgba(255,255,255,0.28)", background:"transparent", border:"none", cursor:"pointer", padding:0, fontFamily:"inherit" }}>
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
            </>
          )}
        </main>
      )}
    </div>
  );
}
