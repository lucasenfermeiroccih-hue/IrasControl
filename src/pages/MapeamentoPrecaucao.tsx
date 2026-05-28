import { useState, useMemo, useEffect, useCallback } from "react";
import {
  AreaChart, Area,
  PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { sendToAgent } from "@/lib/agent-service";
import { useToast } from "@/hooks/use-toast";
import {
  ShieldPlus, Siren, BrainCircuit, Map, FileText, ListChecks,
  X, Plus, RefreshCw,
} from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────

const ORGANISMOS = [
  { value: "MRSA",        label: "MRSA",                    precaucao: "Contato"   },
  { value: "VRE",         label: "VRE",                     precaucao: "Contato"   },
  { value: "ESBL",        label: "ESBL",                    precaucao: "Contato"   },
  { value: "KPC-KP",      label: "KPC",                     precaucao: "Contato"   },
  { value: "CRAB",        label: "Acinetobacter MDR",       precaucao: "Contato"   },
  { value: "CRPA",        label: "Pseudomonas CR",          precaucao: "Contato"   },
  { value: "NDM",         label: "NDM",                     precaucao: "Contato"   },
  { value: "CDIFF",       label: "C. difficile",            precaucao: "Contato"   },
  { value: "CANDIDA",     label: "Candida auris",           precaucao: "Contato"   },
  { value: "NOROVIRUS",   label: "Norovírus",               precaucao: "Contato"   },
  { value: "INFLUENZA",   label: "Influenza A/B",           precaucao: "Gotículas" },
  { value: "COVID19",     label: "COVID-19",                precaucao: "Aerossóis" },
  { value: "TUBERCULOSE", label: "Tuberculose",             precaucao: "Aerossóis" },
  { value: "OUTROS",      label: "Outros",                  precaucao: "Contato"   },
];

const MATERIAIS = [
  "Sangue","Hemocultura","Urina","Secreção Traqueal","Escarro","LCR",
  "Swab Nasal","Swab Retal","Swab de Lesão","Fezes","Ponta de Cateter",
  "Lavado Broncoalveolar","Abcesso","Líquidos","Outros",
];

const SETORES_POR_TIPO: Record<string, string[]> = {
  geral: [
    "UTI Adulto","UTI Pediátrica","UTI Neonatal",
    "Clínica Médica","Clínica Cirúrgica","Centro Cirúrgico",
    "Emergência","Pronto-Socorro","Pediatria",
    "Berçário","Alojamento Conjunto","Obstetrícia",
    "Oncologia","Cardiologia","Neurologia","Ortopedia",
  ],
  maternidade: [
    "UTI Neonatal","UTI Pediátrica","Obstetrícia",
    "Alojamento Conjunto","Centro Obstétrico","Berçário Normal",
    "Berçário de Risco","Ginecologia","Pré-Parto",
    "Pós-Parto","Ambulatório de Alto Risco",
  ],
  universitario: [
    "UTI Adulto","UTI Pediátrica","UTI Neonatal",
    "Clínica Médica","Clínica Cirúrgica","Centro Cirúrgico",
    "Emergência","Hematologia","Oncologia",
    "Transplante","Neurologia","Cardiologia",
    "Nefrologia","Infectologia","Reumatologia",
  ],
  especializado: [
    "UTI Especializada","Enfermaria Especializada",
    "Centro Cirúrgico","Ambulatório",
    "Diagnóstico por Imagem","Reabilitação",
  ],
  upa: [
    "Observação Adulto","Observação Pediátrica",
    "Sala de Emergência","Sala de Estabilização",
    "Triagem","Reanimação",
  ],
};

const PIE_COLORS = ["#38bdf8","#ef4444","#f59e0b","#22c55e","#a78bfa","#fb923c","#34d399","#f472b6"];

function getRisk(organismo: string): "Crítico" | "Alto" | "Moderado" {
  const critical = ["KPC-KP","CRAB","NDM","CANDIDA","TUBERCULOSE","COVID19"];
  const high = ["MRSA","VRE","CRPA","INFLUENZA"];
  if (!organismo || organismo === "OUTROS") return "Moderado";
  if (critical.includes(organismo)) return "Crítico";
  if (high.includes(organismo)) return "Alto";
  return "Moderado";
}

const fmt = (d: string) => {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
};

function daysSince(dateStr: string): number {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

function getMostRestrictive(values: string[]): string {
  for (const p of ["Aerossóis", "Gotículas", "Contato"]) {
    if (values.some(v => ORGANISMOS.find(o => o.value === v)?.precaucao === p)) return p;
  }
  return "Contato";
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  precaucaoId?: string;
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

interface HospitalInfo {
  name: string;
  type: string;
  setores: string[];
}

// ── Component ──────────────────────────────────────────────────────────────

export default function MapeamentoPrecaucao() {
  const [darkMode, setDarkMode]     = useState(true);
  const [clock, setClock]           = useState("");
  const [patients, setPatients]     = useState<Patient[]>([]);
  const [loading, setLoading]       = useState(false);
  const [hospitalInfo, setHospitalInfo] = useState<HospitalInfo>({
    name: "Carregando...", type: "geral", setores: SETORES_POR_TIPO.geral,
  });
  const [aiReport, setAiReport]     = useState("");
  const [aiLoading, setAiLoading]   = useState(false);
  const [selectedBed, setSelectedBed] = useState<Patient | null>(null);
  const [showForm, setShowForm]     = useState(false);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [form, setForm]             = useState({
    nome: "", prontuario: "", setor: "", leito: "",
    dataColeta: "", material: "", organismos: [] as string[],
  });

  const { hospitalId, hospitalName } = useHospitalContext();
  const { toast } = useToast();

  // Clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleString("pt-BR"));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch hospital type + sectors
  useEffect(() => {
    if (!hospitalId) return;
    (async () => {
      const [{ data: hosp }, { data: sects }] = await Promise.all([
        supabase.from("hospitals").select("name,type").eq("id", hospitalId).single(),
        supabase.from("sectors").select("name")
          .eq("hospital_id", hospitalId).eq("is_active", true).order("name"),
      ]);

      let type = (hosp?.type as string) || "geral";
      const nameLower = (hosp?.name || "").toLowerCase();
      if (nameLower.includes("maternidade") || nameLower.includes("matern")) type = "maternidade";

      const dbSetores = (sects || []).map((s: { name: string }) => s.name);
      const setoresFinal = dbSetores.length > 0
        ? dbSetores
        : SETORES_POR_TIPO[type] || SETORES_POR_TIPO.geral;

      setHospitalInfo({
        name: hosp?.name || hospitalName || "Hospital",
        type,
        setores: setoresFinal,
      });
    })();
  }, [hospitalId, hospitalName]);

  // Fetch patient / precaution data
  const fetchData = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);

    const { data: pData } = await supabase
      .from("patients").select("*").eq("hospital_id", hospitalId);

    if (!pData || pData.length === 0) { setPatients([]); setLoading(false); return; }

    const pIds = pData.map(p => p.id);
    const [precsRes, labsRes] = await Promise.all([
      supabase.from("precautions").select("*").in("patient_id", pIds),
      supabase.from("lab_results").select("*")
        .eq("hospital_id", hospitalId).order("collection_date", { ascending: false }),
    ]);

    const precs = precsRes.data || [];
    const labs  = labsRes.data  || [];
    const mapped: Patient[] = [];

    pData.forEach(p => {
      const patPrecs = precs.filter(pr => pr.patient_id === p.id);
      if (patPrecs.length === 0) return;
      const active = patPrecs.find(pr => pr.is_active)
        ?? [...patPrecs].sort((a, b) =>
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        )[0];
      const lab = labs.find(lr => lr.patient_id === p.id);
      let status = "Internado";
      if (!active.is_active) {
        if      (p.status === "deceased")    status = "Óbito";
        else if (p.status === "transferred") status = "Transferência";
        else                                 status = "Alta";
      }
      mapped.push({
        id: p.id,
        precaucaoId: active.id,
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

  // ── Derived data ─────────────────────────────────────────────────────────

  const internados   = useMemo(() => patients.filter(p => p.status === "Internado"), [patients]);
  const confirmados  = useMemo(() => internados.filter(p => p.organismo && p.organismo !== "OUTROS").length, [internados]);
  const suspeitos    = useMemo(() => internados.filter(p => !p.organismo || p.organismo === "OUTROS").length, [internados]);
  const descartados  = useMemo(() => patients.filter(p => p.status === "Alta").length, [patients]);
  const obitos       = useMemo(() => patients.filter(p => p.status === "Óbito").length, [patients]);

  const alertas = useMemo(() => {
    const map: Record<string, Patient[]> = {};
    internados.forEach(p => {
      (p.organismo || "").split(" | ").filter(Boolean).forEach(org => {
        const k = `${p.setor}||${org}`;
        if (!map[k]) map[k] = [];
        if (!map[k].find(x => x.id === p.id)) map[k].push(p);
      });
    });
    return Object.entries(map)
      .filter(([, ps]) => ps.length >= 2)
      .map(([key, ps]) => {
        const [setor, organismo] = key.split("||");
        return {
          id: key,
          nivel: ps.length >= 3 ? "surto" : "atencao" as "surto" | "atencao",
          setor,
          organismo: ORGANISMOS.find(o => o.value === organismo)?.label || organismo,
          count: ps.length,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [internados]);

  const epidemioData = useMemo(() => {
    const dateMap: Record<string, number> = {};
    internados.forEach(p => {
      if (p.dataColeta) dateMap[p.dataColeta] = (dateMap[p.dataColeta] || 0) + 1;
    });
    let acc = 0;
    return Object.entries(dateMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-10)
      .map(([d, n]) => { acc += n; return { date: fmt(d), novos: n, acumulado: acc }; });
  }, [internados]);

  const microData = useMemo(() => {
    const c: Record<string, number> = {};
    internados.forEach(p => {
      (p.organismo || "").split(" | ").filter(Boolean).forEach(org => {
        const label = ORGANISMOS.find(o => o.value === org)?.label || org;
        c[label] = (c[label] || 0) + 1;
      });
    });
    return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [internados]);

  const setorData = useMemo(() => {
    const c: Record<string, number> = {};
    internados.forEach(p => { c[p.setor] = (c[p.setor] || 0) + 1; });
    return Object.entries(c).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [internados]);

  const radarData = useMemo(() => {
    const total = internados.length || 1;
    return [
      { indicator: "Isolamentos",    value: Math.round((internados.filter(p => p.precaucao).length / total) * 100) },
      { indicator: "Identificação",  value: Math.round((confirmados / total) * 100) },
      { indicator: "Rastreio",       value: 74 },
      { indicator: "Bundles",        value: 74 },
      { indicator: "EPI",            value: 81 },
      { indicator: "Higiene mãos",   value: 68 },
    ];
  }, [internados, confirmados]);

  const planRows = useMemo(() => {
    const rows: string[][] = [
      ["Crítica","Reforçar precaução de contato","Reduzir transmissão cruzada","Setores afetados","Imediato","Enfermagem + CCIH","Revisar EPIs, fluxos e paramentação","Custo operacional","Em andamento"],
      ["Crítica","Auditar higiene das mãos","Adesão abaixo da meta","Todos os setores","Hoje","CCIH","Observação direta por turno e feedback imediato","Sem custo adicional","Pendente"],
      ["Alta","Revisar limpeza terminal","Suspeita de falha ambiental","Leitos críticos","24h","Higiene + CCIH","Checklist supervisionado e validação da desinfecção","Saneantes institucionais","Em andamento"],
      ["Alta","Coletar culturas de vigilância","Identificar colonizados e cadeia","Todos os expostos","24h","Enfermagem + Laboratório","Swabs conforme protocolo institucional","Custo laboratorial","Pendente"],
      ["Alta","Revisar antimicrobianos","Reduzir pressão seletiva MDR",alertas[0]?.setor || "UTI","48h","Infectologia","Auditoria de carbapenêmicos e ajuste terapêutico","Conforme prescrição","Pendente"],
      ["Moderada","Treinar equipe assistencial","Corrigir falhas de precaução","Setores afetados","72h","Educação Permanente","Treinamento prático beira-leito","Baixo custo","Planejado"],
      ["Crítica","Busca ativa diária","Detectar novos casos precocemente",alertas[0]?.setor || "Setores afetados","Diário","CCIH","Monitorar febre, culturas, transferências","Sem custo adicional","Ativo"],
    ];
    if (alertas.length > 0) {
      rows.splice(2, 0, [
        "Crítica",
        `Conter surto em ${alertas[0].setor}`,
        `${alertas[0].count} casos de ${alertas[0].organismo}`,
        alertas[0].setor,
        "Imediato",
        "CCIH + Gestão",
        "Isolamento em coorte e interdição de leitos",
        "Custo operacional",
        "Em andamento",
      ]);
    }
    return rows;
  }, [alertas]);

  const epiStatus = useMemo(() => {
    if (alertas.some(a => a.nivel === "surto"))    return { label: "Surto ativo crítico",       cls: "status-critical" };
    if (alertas.some(a => a.nivel === "atencao"))  return { label: "Atenção epidemiológica",     cls: "status-warning"  };
    return                                                 { label: "Monitoramento contínuo",     cls: "status-success"  };
  }, [alertas]);

  const mainSetor = alertas[0]?.setor || "Sem alertas ativos";
  const mainMicro = microData[0]?.name || "Sem registro";

  // ── AI Report ────────────────────────────────────────────────────────────

  const generateReport = async () => {
    setAiLoading(true);
    try {
      const prompt = `
Você é especialista em CCIH. Analise os dados e escreva um relatório técnico epidemiológico em português com os seguintes tópicos:
Introdução epidemiológica, Situação atual, Cadeia provável de transmissão, Fatores contribuintes,
Avaliação microbiológica, Avaliação de antimicrobianos, Recomendações imediatas, Conclusão.

Hospital: ${hospitalInfo.name} (tipo: ${hospitalInfo.type})
Pacientes em isolamento ativo: ${internados.length}
Suspeitos: ${suspeitos} | Confirmados: ${confirmados} | Óbitos: ${obitos} | Descartados: ${descartados}
Alertas epidemiológicos: ${alertas.length} (${alertas.filter(a=>a.nivel==="surto").length} surtos, ${alertas.filter(a=>a.nivel==="atencao").length} atenções)
Setores afetados: ${[...new Set(alertas.map(a=>a.setor))].join(", ") || "Nenhum"}
Microrganismos: ${microData.map(m=>`${m.name}(${m.value})`).join(", ") || "Sem dados"}
Setor com mais casos: ${setorData[0]?.name || "N/A"} (${setorData[0]?.value || 0} casos)
      `.trim();
      const result = await sendToAgent("ccih-specialist", `outbreak-${Date.now()}`, prompt);
      setAiReport(result);
    } catch {
      toast({ title: "Erro ao gerar relatório", variant: "destructive" });
    }
    setAiLoading(false);
  };

  // ── Patient CRUD ──────────────────────────────────────────────────────────

  const resetForm = () => {
    setForm({ nome:"", prontuario:"", setor:"", leito:"", dataColeta:"", material:"", organismos:[] });
    setEditingId(null);
    setShowForm(false);
  };

  const toggleOrganismo = (v: string) =>
    setForm(f => ({
      ...f,
      organismos: f.organismos.includes(v) ? f.organismos.filter(x => x !== v) : [...f.organismos, v],
    }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalId || !form.nome || !form.prontuario || !form.setor || !form.leito || form.organismos.length === 0) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const precaucao = getMostRestrictive(form.organismos);
    const orgValue  = form.organismos.join(" | ");
    try {
      if (editingId) {
        await supabase.from("patients")
          .update({ full_name: form.nome, medical_record: form.prontuario, sector: form.setor, bed: form.leito })
          .eq("id", editingId);
        const pat = patients.find(p => p.id === editingId);
        if (pat?.precaucaoId) {
          await supabase.from("precautions")
            .update({ precaution_type: precaucao, reason: orgValue })
            .eq("id", pat.precaucaoId);
        }
      } else {
        const { data: np } = await supabase.from("patients").insert({
          hospital_id: hospitalId, full_name: form.nome, medical_record: form.prontuario,
          sector: form.setor, bed: form.leito, status: "active", source: "precaution_map",
        }).select().single();
        if (np) {
          await supabase.from("precautions").insert({
            patient_id: np.id, hospital_id: hospitalId, precaution_type: precaucao,
            reason: orgValue,
            start_date: form.dataColeta || new Date().toISOString().slice(0, 10),
            is_active: true,
          });
          if (form.material) {
            await (supabase as any).from("lab_results").insert({
              patient_id: np.id, hospital_id: hospitalId,
              sample_material: form.material, organism: orgValue,
              collection_date: form.dataColeta || new Date().toISOString().slice(0, 10),
            });
          }
        }
      }
      toast({ title: editingId ? "Paciente atualizado" : "Paciente registrado com sucesso" });
      resetForm();
      fetchData();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    }
  };

  const deletePatient = async (id: string) => {
    if (!confirm("Excluir este registro de precaução?")) return;
    await Promise.all([
      supabase.from("precautions").delete().eq("patient_id", id),
      supabase.from("lab_results").delete().eq("patient_id", id),
    ]);
    await supabase.from("patients").delete().eq("id", id);
    toast({ title: "Registro excluído" });
    fetchData();
  };

  const startEdit = (p: Patient) => {
    const orgs = (p.organismo || "").split(" | ").filter(v => ORGANISMOS.some(o => o.value === v));
    setForm({ nome: p.nome, prontuario: p.prontuario, setor: p.setor, leito: p.leito, dataColeta: p.dataColeta || "", material: p.material || "", organismos: orgs });
    setEditingId(p.id);
    setShowForm(true);
  };

  // ── Styles ────────────────────────────────────────────────────────────────

  const dark = darkMode;
  const bg = dark ? "rgba(15,23,42,0.86)" : "rgba(255,255,255,0.86)";
  const bd = dark ? "rgba(148,163,184,0.18)" : "rgba(15,23,42,0.12)";
  const tx = dark ? "#e5e7eb" : "#0f172a";
  const mt = dark ? "#94a3b8" : "#475569";

  const glass: React.CSSProperties = {
    background: bg,
    border: `1px solid ${bd}`,
    backdropFilter: "blur(18px)",
    boxShadow: "0 20px 50px rgba(0,0,0,0.28)",
  };

  const inp: React.CSSProperties = {
    padding: "8px 10px", borderRadius: 8,
    border: `1px solid ${bd}`,
    background: dark ? "rgba(15,23,42,.6)" : "rgba(248,250,252,.9)",
    color: tx, fontSize: 13, width: "100%", fontFamily: "inherit",
  };

  const precColor: Record<string, string> = {
    Contato: "#f97316", Gotículas: "#60a5fa", Aerossóis: "#ef4444", Reversa: "#22d3ee",
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{
      minHeight: "100vh",
      background: dark
        ? "radial-gradient(circle at top left,rgba(56,189,248,.18),transparent 34%),radial-gradient(circle at top right,rgba(239,68,68,.14),transparent 30%),linear-gradient(135deg,#020617,#0f172a 50%,#111827)"
        : "linear-gradient(135deg,#e0f2fe,#f8fafc 55%,#fff7ed)",
      color: tx,
      fontFamily: "Inter,ui-sans-serif,system-ui,-apple-system,sans-serif",
    }}>
      <style>{`
        .metric-card { transition: all .25s ease; }
        .metric-card:hover { transform: translateY(-4px); border-color: rgba(56,189,248,.45) !important; }
        .bed-card { min-height: 110px; border-radius: 20px; border: 1px solid rgba(148,163,184,.22); background: rgba(15,23,42,.72); cursor: pointer; transition: .25s ease; padding: 14px; }
        .bed-card:hover { transform: scale(1.03); border-color: rgba(56,189,248,.55); }
        .pulse-dot { width:11px; height:11px; border-radius:999px; background:#ef4444; box-shadow:0 0 0 rgba(239,68,68,.7); animation:pulse-anim 1.5s infinite; flex-shrink:0; }
        @keyframes pulse-anim { 0%{box-shadow:0 0 0 0 rgba(239,68,68,.7)} 70%{box-shadow:0 0 0 14px rgba(239,68,68,0)} 100%{box-shadow:0 0 0 0 rgba(239,68,68,0)} }
        .scrollbar::-webkit-scrollbar{width:6px} .scrollbar::-webkit-scrollbar-thumb{background:rgba(148,163,184,.3);border-radius:999px} .scrollbar::-webkit-scrollbar-track{background:transparent}
        @media print { .no-print { display:none !important; } }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ maxWidth: 1600, margin: "0 auto", padding: "16px 16px 48px" }}>

        {/* ── HEADER ── */}
        <header style={{ ...glass, borderRadius: 24, padding: "20px 24px", marginBottom: 20 }}>
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"space-between", alignItems:"flex-start", gap:16 }}>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <div style={{ width:56, height:56, borderRadius:16, background:"rgba(56,189,248,.2)", border:"1px solid rgba(56,189,248,.3)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                <ShieldPlus size={28} color="#7dd3fc" />
              </div>
              <div>
                <p style={{ margin:0, fontSize:13, color:mt }}>{hospitalInfo.name}</p>
                <h1 style={{ margin:"2px 0 0", fontSize:26, fontWeight:900, letterSpacing:"-0.5px", lineHeight:1.2 }}>
                  Controle Inteligente de Surtos Hospitalares
                </h1>
                <p style={{ margin:"4px 0 0", fontSize:12, color:mt }}>
                  CCIH · Infectologia · NSP · Vigilância Epidemiológica
                </p>
              </div>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:8, alignItems:"center" }} className="no-print">
              <div style={{ padding:"10px 14px", borderRadius:14, background: dark ? "rgba(15,23,42,.45)" : "rgba(248,250,252,.8)", border:`1px solid ${bd}` }}>
                <p style={{ margin:0, fontSize:11, color:mt }}>Data e hora</p>
                <p style={{ margin:0, fontWeight:700, fontSize:13 }}>{clock}</p>
              </div>
              <button onClick={() => setShowForm(true)} style={{ padding:"10px 16px", borderRadius:14, background:"#22c55e", color:"#052e16", border:"none", cursor:"pointer", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
                <Plus size={15} /> Novo Paciente
              </button>
              <button onClick={fetchData} disabled={loading} style={{ padding:"10px 16px", borderRadius:14, background:"transparent", border:`1px solid rgba(56,189,248,.4)`, color:"#38bdf8", cursor:"pointer", fontWeight:700, fontSize:13, display:"flex", alignItems:"center", gap:6 }}>
                <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Atualizar
              </button>
              <button onClick={() => setDarkMode(d => !d)} style={{ padding:"10px 16px", borderRadius:14, background:"#38bdf8", color:"#020617", border:"none", cursor:"pointer", fontWeight:700, fontSize:13 }}>
                {dark ? "Modo Claro" : "Modo Escuro"}
              </button>
            </div>
          </div>

          {/* Status bar */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:10, marginTop:20 }}>
            {[
              { cls: epiStatus.cls, label:"Status epidemiológico", value: epiStatus.label, pulse: true },
              { cls: "status-warning",  label:"Setor mais afetado",  value: mainSetor,            pulse: false },
              { cls: "status-success",  label:"Protocolo base",      value: "Precaução de contato", pulse: false },
              { cls: "status-critical", label:"Microrganismo sentinela", value: mainMicro,         pulse: false },
            ].map((s, i) => (
              <div key={i} style={{
                borderRadius:14, padding:"12px 16px",
                background: s.cls==="status-critical" ? "linear-gradient(135deg,rgba(239,68,68,.22),rgba(251,146,60,.12))" :
                             s.cls==="status-warning"  ? "linear-gradient(135deg,rgba(245,158,11,.22),rgba(251,146,60,.10))" :
                                                         "linear-gradient(135deg,rgba(34,197,94,.20),rgba(20,184,166,.10))",
                border: `1px solid ${s.cls==="status-critical" ? "rgba(239,68,68,.35)" : s.cls==="status-warning" ? "rgba(245,158,11,.35)" : "rgba(34,197,94,.35)"}`,
                color: s.cls==="status-critical" ? "#fecaca" : s.cls==="status-warning" ? "#fde68a" : "#bbf7d0",
              }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {s.pulse && <span className="pulse-dot" />}
                  <div>
                    <p style={{ margin:0, fontSize:11, opacity:0.8 }}>{s.label}</p>
                    <p style={{ margin:0, fontWeight:900, fontSize:16, lineHeight:1.2 }}>{s.value}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </header>

        {/* ── METRICS ── */}
        <section style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))", gap:12, marginBottom:20 }}>
          {[
            { label:"Suspeitos",     value:suspeitos,        sub:"+casos em investigação",    subColor:"#fca5a5" },
            { label:"Confirmados",   value:confirmados,      sub:"Cluster ativo",              subColor:"#fca5a5" },
            { label:"Descartados",   value:descartados,      sub:"Com alta (liberados)",       subColor:mt },
            { label:"Isolados",      value:internados.length,sub:"Em precaução ativa",         subColor:"#67e8f9" },
            { label:"Óbitos",        value:obitos,           sub:"Sob investigação",           subColor:"#fed7aa" },
            { label:"Alertas",       value:alertas.length,   sub:`${alertas.filter(a=>a.nivel==="surto").length} surtos ativos`, subColor:"#fca5a5" },
            { label:"Microrganismos",value:microData.length, sub:"Tipos identificados",        subColor:"#fde68a" },
            { label:"Setores",       value:setorData.length, sub:"Com casos ativos",           subColor:"#fde68a" },
          ].map((m, i) => (
            <div key={i} className="metric-card" style={{ ...glass, borderRadius:24, padding:16 }}>
              <p style={{ margin:0, fontSize:11, color:mt }}>{m.label}</p>
              <h2 style={{ margin:"4px 0 2px", fontSize:32, fontWeight:900, lineHeight:1 }}>
                {loading ? "…" : m.value}
              </h2>
              <p style={{ margin:0, fontSize:11, color:m.subColor }}>{m.sub}</p>
            </div>
          ))}
        </section>

        {/* ── ALERTS + AI INSIGHTS ── */}
        <section style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:20, marginBottom:20 }}>
          {/* Alert panel */}
          <div style={{ ...glass, borderRadius:24, padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:900, display:"flex", alignItems:"center", gap:8 }}>
                <Siren size={17} color="#fca5a5" /> Painel de Alertas
              </h2>
              <span style={{ padding:"4px 12px", borderRadius:999, background:"rgba(239,68,68,.2)", color:"#fecaca", fontSize:12, fontWeight:700 }}>
                {alertas.length} alertas
              </span>
            </div>
            <div style={{ maxHeight:360, overflowY:"auto" }} className="scrollbar">
              {alertas.length === 0 ? (
                <div style={{ textAlign:"center", color:mt, padding:"32px 0" }}>
                  <p style={{ margin:0, fontSize:14 }}>Nenhum alerta ativo no momento.</p>
                  <p style={{ margin:"8px 0 0", fontSize:12 }}>Monitoramento contínuo em andamento.</p>
                </div>
              ) : alertas.map((a, i) => (
                <div key={i} style={{ padding:14, borderRadius:14, marginBottom:10, background: a.nivel==="surto" ? "rgba(239,68,68,.15)" : "rgba(245,158,11,.15)", border:`1px solid ${a.nivel==="surto" ? "rgba(239,68,68,.35)" : "rgba(245,158,11,.35)"}` }}>
                  <b style={{ fontSize:13 }}>{a.nivel==="surto" ? "🚨" : "⚠️"} {a.setor} — {a.organismo}</b>
                  <p style={{ margin:"4px 0 0", fontSize:12, color:mt }}>
                    {a.count} caso(s) identificados — {a.nivel==="surto" ? "Surto ativo" : "Atenção"}
                  </p>
                </div>
              ))}
              {internados.length > 0 && (
                <div style={{ padding:14, borderRadius:14, background:"rgba(56,189,248,.1)", border:"1px solid rgba(56,189,248,.2)" }}>
                  <b style={{ fontSize:13 }}>ℹ️ {internados.length} paciente(s) em isolamento ativo</b>
                  <p style={{ margin:"4px 0 0", fontSize:12, color:mt }}>
                    {setorData.map(s => `${s.name} (${s.value})`).join(", ") || "Sem setores registrados"}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* AI Insights */}
          <div style={{ ...glass, borderRadius:24, padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:900, display:"flex", alignItems:"center", gap:8 }}>
                <BrainCircuit size={17} color="#7dd3fc" /> Insights da IA Especialista
              </h2>
              <div style={{ display:"flex", gap:8 }} className="no-print">
                <button onClick={generateReport} disabled={aiLoading} style={{ padding:"8px 16px", borderRadius:12, background:"#38bdf8", color:"#020617", border:"none", cursor: aiLoading ? "wait" : "pointer", fontWeight:700, fontSize:12 }}>
                  {aiLoading ? "Gerando…" : "Gerar relatório IA"}
                </button>
                <button onClick={() => window.print()} style={{ padding:"8px 16px", borderRadius:12, background: dark ? "rgba(100,116,139,.3)" : "rgba(226,232,240,.8)", color:tx, border:"none", cursor:"pointer", fontWeight:700, fontSize:12 }}>
                  Imprimir
                </button>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[
                { risk:"RISCO ALTO",     color:"#7dd3fc", bg:"rgba(56,189,248,.1)",  bd2:"rgba(56,189,248,.25)",  title: alertas.length>0 ? "Transmissão cruzada provável" : "Monitoramento ativo",       desc: alertas.length>0 ? `${alertas[0].count} casos em ${alertas[0].setor} — ${alertas[0].organismo}` : "Nenhum cluster detectado no momento." },
                { risk:"AÇÃO IMEDIATA", color:"#fca5a5", bg:"rgba(239,68,68,.1)",   bd2:"rgba(239,68,68,.25)",   title:"Reforçar precauções",           desc:"Auditar EPIs, higiene das mãos e limpeza terminal nos setores afetados." },
                { risk:"FATOR CONTRIB.", color:"#fde68a", bg:"rgba(245,158,11,.1)", bd2:"rgba(245,158,11,.25)",  title:"Higiene das mãos",              desc:"Indicador frequentemente abaixo da meta. Reforçar auditoria por turno." },
                { risk:"INFECTOLOGIA",  color:"#c4b5fd", bg:"rgba(124,58,237,.1)",  bd2:"rgba(124,58,237,.25)",  title:"Revisão antimicrobiana",        desc:"Avaliar pressão seletiva e necessidade de stewardship antimicrobiano." },
              ].map((c, i) => (
                <div key={i} style={{ padding:14, borderRadius:14, background:c.bg, border:`1px solid ${c.bd2}` }}>
                  <p style={{ margin:"0 0 4px", fontSize:11, color:c.color, fontWeight:700 }}>{c.risk}</p>
                  <h3 style={{ margin:"0 0 6px", fontSize:13, fontWeight:900 }}>{c.title}</h3>
                  <p style={{ margin:0, fontSize:12, color:mt }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CHARTS ── */}
        <section style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
          <div style={{ ...glass, borderRadius:24, padding:20 }}>
            <h2 style={{ margin:"0 0 16px", fontSize:17, fontWeight:900 }}>Curva Epidemiológica Temporal</h2>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={epidemioData}>
                <defs>
                  <linearGradient id="gEpi" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#38bdf8" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(148,163,184,.18)" />
                <XAxis dataKey="date" tick={{ fill:mt, fontSize:11 }} />
                <YAxis tick={{ fill:mt, fontSize:11 }} />
                <Tooltip contentStyle={{ background:"rgba(15,23,42,.95)", border:"1px solid rgba(148,163,184,.2)", color:"#e5e7eb", borderRadius:8 }} />
                <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke="#38bdf8" strokeWidth={3} fill="url(#gEpi)" />
                <Area type="monotone" dataKey="novos"     name="Novos"     stroke="#ef4444" strokeWidth={2} fill="none"       />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div style={{ ...glass, borderRadius:24, padding:20 }}>
            <h2 style={{ margin:"0 0 16px", fontSize:17, fontWeight:900 }}>Distribuição por Microrganismo</h2>
            {microData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={microData} cx="50%" cy="50%" innerRadius={55} outerRadius={100} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                    {microData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background:"rgba(15,23,42,.95)", border:"1px solid rgba(148,163,184,.2)", color:"#e5e7eb", borderRadius:8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:260, display:"flex", alignItems:"center", justifyContent:"center", color:mt, fontSize:14 }}>
                Sem microrganismos registrados
              </div>
            )}
          </div>

          <div style={{ ...glass, borderRadius:24, padding:20 }}>
            <h2 style={{ margin:"0 0 16px", fontSize:17, fontWeight:900 }}>Indicadores de Conformidade (%)</h2>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="rgba(148,163,184,.2)" />
                <PolarAngleAxis dataKey="indicator" tick={{ fill:mt, fontSize:11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill:mt, fontSize:9 }} />
                <Radar name="Adesão" dataKey="value" stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.25} />
                <Tooltip contentStyle={{ background:"rgba(15,23,42,.95)", border:"1px solid rgba(148,163,184,.2)", color:"#e5e7eb", borderRadius:8 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div style={{ ...glass, borderRadius:24, padding:20 }}>
            <h2 style={{ margin:"0 0 16px", fontSize:17, fontWeight:900 }}>Casos Ativos por Setor</h2>
            {setorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={setorData} layout="vertical">
                  <CartesianGrid stroke="rgba(148,163,184,.18)" horizontal={false} />
                  <XAxis type="number" tick={{ fill:mt, fontSize:11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fill:mt, fontSize:10 }} width={130} />
                  <Tooltip contentStyle={{ background:"rgba(15,23,42,.95)", border:"1px solid rgba(148,163,184,.2)", color:"#e5e7eb", borderRadius:8 }} />
                  <Bar dataKey="value" name="Casos" radius={[0,6,6,0]}>
                    {setorData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height:260, display:"flex", alignItems:"center", justifyContent:"center", color:mt, fontSize:14 }}>
                Nenhum paciente ativo em isolamento
              </div>
            )}
          </div>
        </section>

        {/* ── BED MAP ── */}
        <section style={{ ...glass, borderRadius:24, padding:20, marginBottom:20 }}>
          <div style={{ display:"flex", flexWrap:"wrap", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:20 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:900, display:"flex", alignItems:"center", gap:8 }}>
              <Map size={17} color="#7dd3fc" /> Mapa Interativo de Precauções
            </h2>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {Object.entries(precColor).map(([lbl, c]) => (
                <span key={lbl} style={{ padding:"4px 12px", borderRadius:999, background:`${c}22`, color:c, fontSize:12, fontWeight:600, border:`1px solid ${c}44` }}>{lbl}</span>
              ))}
            </div>
          </div>

          {internados.length === 0 ? (
            <div style={{ textAlign:"center", color:mt, padding:"40px 0" }}>
              <p style={{ margin:0, fontSize:16 }}>Nenhum paciente em isolamento ativo.</p>
              <p style={{ margin:"8px 0 0", fontSize:13 }}>Clique em "+ Novo Paciente" para registrar.</p>
            </div>
          ) : (
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(165px,1fr))", gap:12 }}>
              {internados.map(p => {
                const c = precColor[p.precaucao] || "#94a3b8";
                const risk = getRisk(p.organismo);
                const days = daysSince(p.dataColeta);
                const label = ORGANISMOS.find(o => o.value === p.organismo)?.label || p.organismo || "—";
                const initials = p.nome
                  ? p.nome.split(" ").map((n, i, arr) => i === 0 || i === arr.length - 1 ? n : n[0] + ".").join(" ")
                  : "—";
                return (
                  <div key={p.id} className="bed-card" onClick={() => setSelectedBed(p)}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <b style={{ fontSize:13 }}>{p.leito || "Leito —"}</b>
                      <span style={{ width:10, height:10, borderRadius:"50%", background:c, flexShrink:0 }} />
                    </div>
                    <p style={{ margin:"6px 0 0", fontSize:11, color:mt }}>{p.setor}</p>
                    <p style={{ margin:"3px 0 0", fontSize:12 }}>{initials}</p>
                    <p style={{ margin:"6px 0 0", fontSize:12, fontWeight:700, color:c }}>{p.precaucao}</p>
                    <p style={{ margin:"2px 0 0", fontSize:11, color:mt }}>{label.length>24 ? label.slice(0,23)+"…" : label}</p>
                    <div style={{ marginTop:8, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:11, color:mt }}>{days}d</span>
                      <span style={{ padding:"2px 8px", borderRadius:999, background:"rgba(100,116,139,.3)", fontSize:10, color: risk==="Crítico" ? "#fca5a5" : risk==="Alto" ? "#fed7aa" : "#fde68a" }}>
                        {risk}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── AI REPORT ── */}
        <section style={{ ...glass, borderRadius:24, padding:20, marginBottom:20 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <h2 style={{ margin:0, fontSize:17, fontWeight:900, display:"flex", alignItems:"center", gap:8 }}>
              <FileText size={17} color="#7dd3fc" /> Relatório Técnico Automático da IA
            </h2>
            <span style={{ fontSize:12, color:mt }}>Parecer epidemiológico CCIH</span>
          </div>
          {aiReport ? (
            <div style={{ color:"#cbd5e1", lineHeight:1.8, fontSize:14 }}
              dangerouslySetInnerHTML={{ __html: aiReport.replace(/\n\n/g,"<br/><br/>").replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<b>$1</b>") }}
            />
          ) : (
            <p style={{ color:mt }}>
              Clique em <b style={{ color:"#38bdf8" }}>"Gerar relatório IA"</b> para preencher automaticamente a análise técnica do surto com interpretação epidemiológica, cadeia de transmissão, fatores contribuintes e recomendações.
            </p>
          )}
        </section>

        {/* ── 5W2H PLAN ── */}
        <section style={{ ...glass, borderRadius:24, padding:20, overflowX:"auto" }}>
          <h2 style={{ margin:"0 0 16px", fontSize:17, fontWeight:900, display:"flex", alignItems:"center", gap:8 }}>
            <ListChecks size={17} color="#7dd3fc" /> Plano de Ação 5W2H — Gerado pela IA
          </h2>
          <table style={{ width:"100%", minWidth:1000, borderCollapse:"collapse", fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:`1px solid ${bd}` }}>
                {["Prioridade","O quê (What)","Por quê (Why)","Onde (Where)","Quando (When)","Quem (Who)","Como (How)","Quanto (How Much)","Status"].map(h => (
                  <th key={h} style={{ padding:"8px 10px", textAlign:"left", color:mt, fontWeight:600, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {planRows.map((row, i) => (
                <tr key={i}
                  style={{ borderBottom:`1px solid ${bd}`, transition:".15s" }}
                  onMouseEnter={e => (e.currentTarget.style.background = dark ? "rgba(100,116,139,.1)" : "rgba(15,23,42,.04)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <td style={{ padding:"8px 10px" }}>
                    <span style={{ padding:"3px 10px", borderRadius:999, fontSize:11, fontWeight:700,
                      background: row[0]==="Crítica" ? "rgba(239,68,68,.2)" : row[0]==="Alta" ? "rgba(249,115,22,.2)" : "rgba(245,158,11,.2)",
                      color:      row[0]==="Crítica" ? "#fca5a5"            : row[0]==="Alta" ? "#fed7aa"             : "#fde68a",
                    }}>{row[0]}</span>
                  </td>
                  {row.slice(1).map((col, ci) => (
                    <td key={ci} style={{ padding:"8px 10px", color: dark ? "#cbd5e1" : "#374151" }}>{col}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      {/* ── BED DETAIL MODAL ── */}
      {selectedBed && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"center", justifyContent:"center", padding:16, zIndex:50 }} onClick={() => setSelectedBed(null)}>
          <div style={{ ...glass, borderRadius:24, padding:24, maxWidth:480, width:"100%", position:"relative" }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setSelectedBed(null)} style={{ position:"absolute", top:14, right:14, background: dark ? "rgba(100,116,139,.3)" : "rgba(226,232,240,.8)", border:"none", borderRadius:10, padding:"6px 8px", cursor:"pointer", color:tx }} className="no-print">
              <X size={15} />
            </button>
            <h2 style={{ margin:"0 0 2px", fontSize:20, fontWeight:900 }}>
              Leito: {selectedBed.leito || "—"}
            </h2>
            <p style={{ margin:"0 0 20px", fontSize:13, color:mt }}>{selectedBed.setor}</p>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {[
                ["Paciente",            selectedBed.nome || "—"],
                ["Prontuário",          selectedBed.prontuario || "—"],
                ["Precaução ativa",     selectedBed.precaucao],
                ["Microrganismo",       ORGANISMOS.find(o=>o.value===selectedBed.organismo)?.label || selectedBed.organismo || "—"],
                ["Material coletado",   selectedBed.material || "—"],
                ["Data da coleta",      fmt(selectedBed.dataColeta)],
                ["Dias em isolamento",  `${daysSince(selectedBed.dataColeta)} dia(s)`],
                ["Nível de risco",      getRisk(selectedBed.organismo)],
              ].map(([k, v]) => (
                <div key={k} style={{ display:"flex", gap:8 }}>
                  <span style={{ minWidth:160, fontSize:13, color:mt, fontWeight:600 }}>{k}:</span>
                  <span style={{ fontSize:13 }}>{v}</span>
                </div>
              ))}
            </div>
            <p style={{ margin:"16px 0 4px", fontSize:12, color:mt }}>
              Conduta sugerida: manter isolamento, reforçar EPI, auditar higiene das mãos e validar limpeza terminal.
            </p>
            <div style={{ display:"flex", gap:8, marginTop:16 }} className="no-print">
              <button onClick={() => { startEdit(selectedBed); setSelectedBed(null); }}
                style={{ flex:1, padding:"9px", borderRadius:10, background:"#38bdf8", color:"#020617", border:"none", cursor:"pointer", fontWeight:700, fontSize:13 }}>
                Editar
              </button>
              <button onClick={() => { deletePatient(selectedBed.id); setSelectedBed(null); }}
                style={{ flex:1, padding:"9px", borderRadius:10, background:"rgba(239,68,68,.2)", color:"#fca5a5", border:"1px solid rgba(239,68,68,.3)", cursor:"pointer", fontWeight:700, fontSize:13 }}>
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PATIENT FORM MODAL ── */}
      {showForm && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", display:"flex", alignItems:"flex-start", justifyContent:"center", padding:"24px 16px", zIndex:50, overflowY:"auto" }}>
          <div style={{ ...glass, borderRadius:24, padding:24, maxWidth:560, width:"100%", position:"relative" }}>
            <button onClick={resetForm} style={{ position:"absolute", top:14, right:14, background: dark ? "rgba(100,116,139,.3)" : "rgba(226,232,240,.8)", border:"none", borderRadius:10, padding:"6px 8px", cursor:"pointer", color:tx }}>
              <X size={15} />
            </button>
            <h2 style={{ margin:"0 0 20px", fontSize:18, fontWeight:900 }}>
              {editingId ? "Editar Paciente" : "Novo Paciente em Precaução"}
            </h2>
            <form onSubmit={onSubmit}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                {[
                  { name:"nome",       label:"Nome do Paciente *", type:"text" },
                  { name:"prontuario", label:"Prontuário *",        type:"text" },
                  { name:"leito",      label:"Leito *",             type:"text" },
                  { name:"dataColeta", label:"Data da Coleta",      type:"date" },
                ].map(f => (
                  <div key={f.name} style={{ display:"flex", flexDirection:"column", gap:4 }}>
                    <label style={{ fontSize:12, color:mt, fontWeight:600 }}>{f.label}</label>
                    <input
                      type={f.type}
                      value={(form as Record<string, string>)[f.name] ?? ""}
                      onChange={e => setForm(prev => ({ ...prev, [f.name]: e.target.value }))}
                      style={inp}
                    />
                  </div>
                ))}
              </div>

              <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:12, color:mt, fontWeight:600 }}>Setor *</label>
                <select value={form.setor} onChange={e => setForm(prev => ({ ...prev, setor: e.target.value }))} style={inp}>
                  <option value="">Selecione o setor</option>
                  {hospitalInfo.setores.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div style={{ marginTop:12, display:"flex", flexDirection:"column", gap:4 }}>
                <label style={{ fontSize:12, color:mt, fontWeight:600 }}>Material coletado</label>
                <select value={form.material} onChange={e => setForm(prev => ({ ...prev, material: e.target.value }))} style={inp}>
                  <option value="">Selecione o material</option>
                  {MATERIAIS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              <div style={{ marginTop:12 }}>
                <label style={{ fontSize:12, color:mt, fontWeight:600, display:"block", marginBottom:8 }}>Microrganismo(s) *</label>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                  {ORGANISMOS.map(o => (
                    <button key={o.value} type="button" onClick={() => toggleOrganismo(o.value)} style={{
                      padding:"5px 12px", borderRadius:999, fontSize:12, cursor:"pointer", fontWeight:600, transition:".15s",
                      background: form.organismos.includes(o.value) ? "#38bdf8" : dark ? "rgba(100,116,139,.3)" : "rgba(226,232,240,.8)",
                      color:      form.organismos.includes(o.value) ? "#020617" : tx,
                      border:     form.organismos.includes(o.value) ? "1px solid #38bdf8" : `1px solid ${bd}`,
                    }}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display:"flex", gap:8, marginTop:20 }}>
                <button type="submit" style={{ flex:1, padding:"10px", borderRadius:10, background:"#38bdf8", color:"#020617", border:"none", cursor:"pointer", fontWeight:700, fontSize:14 }}>
                  {editingId ? "Salvar Alterações" : "Registrar Paciente"}
                </button>
                <button type="button" onClick={resetForm} style={{ flex:1, padding:"10px", borderRadius:10, background:"transparent", color:mt, border:`1px solid ${bd}`, cursor:"pointer", fontWeight:700, fontSize:14 }}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
