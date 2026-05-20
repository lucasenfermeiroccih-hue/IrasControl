import { useState, useMemo, useEffect, useCallback } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { sendToAgent } from "@/lib/agent-service";

const ORGANISMOS = [
  { value: "MRSA",        label: "MRSA – S. aureus resist. meticilina",   precaucao: "Contato"   },
  { value: "VRE",         label: "VRE – Enterococcus resist. vancomicina", precaucao: "Contato"   },
  { value: "ESBL-EC",     label: "ESBL – Escherichia coli",                precaucao: "Contato"   },
  { value: "ESBL-KP",     label: "ESBL – Klebsiella pneumoniae",           precaucao: "Contato"   },
  { value: "KPC-KP",      label: "KPC – Klebsiella pneumoniae",            precaucao: "Contato"   },
  { value: "KPC-EC",      label: "KPC – Escherichia coli",                 precaucao: "Contato"   },
  { value: "CRAB",        label: "CRAB – Acinetobacter baumannii CR",      precaucao: "Contato"   },
  { value: "CRPA",        label: "CRPA – Pseudomonas aeruginosa CR",       precaucao: "Contato"   },
  { value: "NDM",         label: "NDM – New Delhi metalo-β-lactamase",     precaucao: "Contato"   },
  { value: "CDIFF",       label: "Clostridioides difficile",               precaucao: "Contato"   },
  { value: "NOROVIRUS",   label: "Norovírus",                              precaucao: "Contato"   },
  { value: "VISA",        label: "S. aureus VISA / VRSA",                  precaucao: "Contato"   },
  { value: "INFLUENZA",   label: "Influenza A / B",                        precaucao: "Gotículas" },
  { value: "TUBERCULOSE", label: "Mycobacterium tuberculosis (TB)",        precaucao: "Aerossóis" },
  { value: "COVID19",     label: "SARS-CoV-2 (COVID-19)",                  precaucao: "Aerossóis" },
];

const SETORES = [
  "UTI Adulto","UTI Pediátrica","UTI Neonatal","Enfermaria A","Enfermaria B",
  "Enfermaria C","Pediatria","Maternidade","Cirurgia","Ortopedia",
  "Oncologia","Pronto-Socorro","Hemodinâmica","Nefrologia",
];

const MATERIAIS = [
  "Sangue","Hemocultura","Urina","Secreção Traqueal","Escarro","LCR",
  "Swab Nasal","Swab Retal","Swab de Lesão","Fezes",
  "Ponta de Cateter","Lavado Broncoalveolar","Outros",
];

const PMETA: Record<string, { color: string; bg: string; text: string; icon: string }> = {
  Contato:    { color:"#B45309", bg:"#FFFBEB", text:"#92400E", icon:"🧤" },
  Gotículas:  { color:"#1D4ED8", bg:"#EFF6FF", text:"#1E40AF", icon:"💧" },
  Aerossóis:  { color:"#B91C1C", bg:"#FEF2F2", text:"#991B1B", icon:"🌬️" },
};

const SMETA: Record<string, { color: string; bg: string }> = {
  Internado:     { color:"#065F46", bg:"#ECFDF5" },
  Alta:          { color:"#374151", bg:"#F3F4F6" },
  "Óbito":       { color:"#7F1D1D", bg:"#FEF2F2" },
  Transferência: { color:"#1E3A5F", bg:"#EFF6FF" },
};

const EVT_META: Record<string, { icon: string; color: string; bg: string }> = {
  Cadastro:      { icon:"＋", color:"#0F4C75", bg:"#EFF6FF" },
  Alta:          { icon:"✓",  color:"#065F46", bg:"#ECFDF5" },
  "Óbito":       { icon:"†",  color:"#7F1D1D", bg:"#FEF2F2" },
  Transferência: { icon:"→",  color:"#1E3A5F", bg:"#EFF6FF" },
};

const NIVEL_META: Record<string, { label: string; color: string; bg: string; border: string }> = {
  surto:   { label:"🚨 Surto",   color:"#B91C1C", bg:"#FEF2F2", border:"#FCA5A5" },
  atencao: { label:"⚠️ Atenção", color:"#92400E", bg:"#FFFBEB", border:"#FCD34D" },
};

const CHART_COLORS = ["#1D4ED8","#B45309","#B91C1C","#0D9488","#7C3AED","#059669","#D97706"];
const PIE_COLORS: Record<string, string> = { Contato:"#B45309", Gotículas:"#1D4ED8", Aerossóis:"#B91C1C" };

const fmt = (d: string) => { if (!d) return "—"; const [y,m,dd] = d.split("-"); return `${dd}/${m}/${y}`; };
const fmtTS = (ts: number) =>
  new Date(ts).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });

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

interface Event {
  id: number;
  type: string;
  timestamp: number;
  patientId: string;
  patientNome: string;
  setor: string;
  leito: string;
  detail: string;
}


export default function MapeamentoPrecaucao() {
  const [page,       setPage]      = useState("mapeamento");
  const [patients,   setPatients]  = useState<Patient[]>([]);
  const [events,     setEvents]    = useState<Event[]>([]);
  const [loading,    setLoading]   = useState(false);
  const [showForm,   setShowForm]  = useState(false);
  const [editingId,  setEditingId] = useState<string | null>(null);
  const [form,       setForm]      = useState({ nome:"", prontuario:"", setor:"", leito:"", dataColeta:"", material:"", organismo:"" });
  const [fStatus,    setFStatus]   = useState("Internado");
  const [search,     setSearch]    = useState("");
  const [stModal,    setStModal]   = useState<string | null>(null);
  const [aiModal,    setAiModal]   = useState(false);
  const [aiText,     setAiText]    = useState("");
  const [aiLoading,  setAiLoading] = useState(false);
  const [sortKey,    setSortKey]   = useState("setor");
  const [sortDir,    setSortDir]   = useState<"asc"|"desc">("asc");
  const [evtFilter,  setEvtFilter] = useState("Todos");
  const [orgDetail,  setOrgDetail] = useState<null | (typeof orgManagement)[0]>(null);

  const { hospitalId } = useHospitalContext();

  const fetchData = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data: pData } = await supabase
      .from("patients")
      .select("*")
      .eq("hospital_id", hospitalId);

    if (!pData || pData.length === 0) { setPatients([]); setLoading(false); return; }

    const pIds = pData.map(p => p.id);
    const [precsRes, labsRes] = await Promise.all([
      supabase.from("precautions").select("*").in("patient_id", pIds),
      supabase.from("lab_results").select("*").eq("hospital_id", hospitalId).order("collection_date", { ascending: false }),
    ]);

    const precs = precsRes.data || [];
    const labs  = labsRes.data || [];

    const mapped: Patient[] = [];
    pData.forEach(p => {
      const patPrecs = precs.filter(pr => pr.patient_id === p.id);
      if (patPrecs.length === 0) return;
      const active = patPrecs.find(pr => pr.is_active)
        ?? [...patPrecs].sort((a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime())[0];
      const lab = labs.find(lr => lr.patient_id === p.id);
      let status = "Internado";
      if (!active.is_active) {
        if (p.status === "deceased")    status = "Óbito";
        else if (p.status === "transferred") status = "Transferência";
        else status = "Alta";
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

  const internados   = patients.filter(p => p.status === "Internado");
  const cntTotal     = internados.length;
  const cntContato   = internados.filter(p => p.precaucao === "Contato").length;
  const cntGoticulas = internados.filter(p => p.precaucao === "Gotículas").length;
  const cntAerossol  = internados.filter(p => p.precaucao === "Aerossóis").length;

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const applySort = (list: Patient[]) =>
    [...list].sort((a, b) => {
      let va: string = (a as unknown as Record<string,string>)[sortKey] || "";
      let vb: string = (b as unknown as Record<string,string>)[sortKey] || "";
      if (sortKey === "leito")      { va = va.padStart(6,"0"); vb = vb.padStart(6,"0"); }
      if (sortKey === "dataColeta") { va = va || "0000-00-00"; vb = vb || "0000-00-00"; }
      const cmp = va.localeCompare(vb, "pt-BR", { numeric: sortKey === "leito" });
      return sortDir === "asc" ? cmp : -cmp;
    });

  const displayed = applySort(patients.filter(p =>
    p.status === fStatus &&
    (search === "" ||
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.prontuario.includes(search) ||
      p.setor.toLowerCase().includes(search.toLowerCase()))
  ));

  const internadosSorted = applySort(internados);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const resetForm = () => {
    setForm({ nome:"", prontuario:"", setor:"", leito:"", dataColeta:"", material:"", organismo:"" });
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (p: Patient) => {
    setForm({
      nome: p.nome, prontuario: p.prontuario, setor: p.setor, leito: p.leito,
      dataColeta: p.dataColeta || "", material: p.material || "", organismo: p.organismo || "",
    });
    setEditingId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome || !form.prontuario || !form.setor || !form.leito || !form.organismo || !hospitalId) return;
    const org = ORGANISMOS.find(o => o.value === form.organismo);

    if (editingId) {
      const pat = patients.find(p => p.id === editingId);
      await supabase.from("patients").update({
        full_name: form.nome,
        medical_record: form.prontuario,
        sector: form.setor,
        bed: form.leito,
      }).eq("id", editingId);

      if (pat?.precaucaoId) {
        await supabase.from("precautions").update({
          precaution_type: org?.precaucao || "Contato",
          reason: form.organismo,
        }).eq("id", pat.precaucaoId);
      }

      await (supabase as any).from("lab_results").update({
        organism: form.organismo || null,
        sample_material: form.material || null,
        collection_date: form.dataColeta || new Date().toISOString().split("T")[0],
      }).eq("patient_id", editingId);

      await fetchData();
      resetForm();
      return;
    }

    const { data: newPatient, error: pErr } = await supabase
      .from("patients")
      .insert({
        full_name: form.nome,
        medical_record: form.prontuario,
        sector: form.setor,
        bed: form.leito,
        hospital_id: hospitalId,
        status: "active" as const,
        admission_date: new Date().toISOString().split("T")[0],
      })
      .select()
      .single();

    if (pErr || !newPatient) return;

    await Promise.all([
      supabase.from("precautions").insert({
        patient_id: newPatient.id,
        precaution_type: org?.precaucao || "Contato",
        is_active: true,
        start_date: new Date().toISOString().split("T")[0],
        reason: form.organismo,
      }),
      ...(form.organismo || form.material ? [supabase.from("lab_results").insert({
        patient_id: newPatient.id,
        hospital_id: hospitalId,
        organism: form.organismo || null,
        sample_material: form.material || null,
        collection_date: form.dataColeta || new Date().toISOString().split("T")[0],
        status: "completed" as const,
      })] : []),
    ]);

    setEvents(prev => [{
      id: Date.now(),
      type: "Cadastro",
      timestamp: Date.now(),
      patientId: newPatient.id,
      patientNome: form.nome,
      setor: form.setor,
      leito: form.leito,
      detail: `${org?.label || form.organismo} · ${form.material || "—"}`,
    }, ...prev]);

    await fetchData();
    resetForm();
  };


  const changeStatus = async (id: string, s: string) => {
    const pat = patients.find(p => p.id === id);
    const dbStatus = s === "Óbito" ? "deceased" : s === "Transferência" ? "transferred" : "discharged";

    await Promise.all([
      supabase.from("patients").update({
        status: dbStatus as "active" | "discharged" | "transferred" | "deceased",
        discharge_date: new Date().toISOString().split("T")[0],
        discharge_type: s.toLowerCase(),
      }).eq("id", id),
      ...(pat?.precaucaoId ? [supabase.from("precautions").update({
        is_active: false,
        end_date: new Date().toISOString().split("T")[0],
      }).eq("id", pat.precaucaoId)] : []),
    ]);

    setPatients(prev => prev.map(p => p.id === id ? { ...p, status: s } : p));
    setEvents(prev => [{
      id: Date.now(),
      type: s,
      timestamp: Date.now(),
      patientId: id,
      patientNome: pat?.nome || "",
      setor: pat?.setor || "",
      leito: pat?.leito || "",
      detail: `Status alterado para ${s} · ${pat?.setor} Leito ${pat?.leito}`,
    }, ...prev]);
    setStModal(null);
  };

  const runAI = async () => {
    setAiLoading(true); setAiText(""); setAiModal(true);
    const lines = internados.map(p => {
      const org = ORGANISMOS.find(o => o.value === p.organismo);
      return `- ${p.nome} | ${p.setor} leito ${p.leito} | ${org?.label || p.organismo} | Precaução: ${p.precaucao} | ${fmt(p.dataColeta)} | ${p.material}`;
    }).join("\n");
    try {
      const result = await sendToAgent(
        "detector-de-riscos",
        `session-precaucao-${Date.now()}`,
        `Você é especialista em controle de infecção hospitalar (CCIH). Analise este mapeamento de precauções e forneça análise epidemiológica em português:\n\n${lines}\n\nEstrutura: 1) Panorama atual 2) Setores e microrganismos de maior risco 3) Alertas de surto 4) Recomendações prioritárias. Seja objetivo e clínico.`
      );
      setAiText(result);
    } catch (err: unknown) {
      setAiText(err instanceof Error ? err.message : "Erro ao conectar com a IA.");
    }
    setAiLoading(false);
  };

  /* ── chart data ── */
  const orgData = useMemo(() => {
    const c: Record<string,number> = {};
    internados.forEach(p => {
      const k = (ORGANISMOS.find(o => o.value === p.organismo)?.label || p.organismo).split("–")[0].trim();
      c[k] = (c[k] || 0) + 1;
    });
    return Object.entries(c).map(([name,value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [patients]);

  const precData = useMemo(() => {
    const c: Record<string,number> = { Contato:0, Gotículas:0, Aerossóis:0 };
    internados.forEach(p => { if (p.precaucao in c) c[p.precaucao]++; });
    return Object.entries(c).filter(([,v]) => v > 0).map(([name,value]) => ({ name, value }));
  }, [patients]);

  const setorData = useMemo(() => {
    const c: Record<string,number> = {};
    internados.forEach(p => { c[p.setor] = (c[p.setor] || 0) + 1; });
    return Object.entries(c).map(([setor,total]) => ({ setor, total })).sort((a,b) => b.total - a.total);
  }, [patients]);

  const matData = useMemo(() => {
    const c: Record<string,number> = {};
    internados.forEach(p => { if (p.material) c[p.material] = (c[p.material] || 0) + 1; });
    return Object.entries(c).map(([name,value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [patients]);

  /* ── alerts ── */
  const alertas = useMemo(() => {
    const clusterMap: Record<string, Patient[]> = {};
    internados.forEach(p => {
      const key = `${p.setor}||${p.organismo}`;
      if (!clusterMap[key]) clusterMap[key] = [];
      clusterMap[key].push(p);
    });
    return Object.entries(clusterMap)
      .filter(([, pats]) => pats.length >= 2)
      .map(([key, pats]) => {
        const [setor, organismo] = key.split("||");
        const org = ORGANISMOS.find(o => o.value === organismo);
        const pre = PMETA[pats[0].precaucao] || PMETA.Contato;
        return {
          id: key,
          nivel: pats.length >= 3 ? "surto" : "atencao",
          setor,
          organismo: org?.label || organismo,
          precaucao: pats[0].precaucao,
          pre,
          count: pats.length,
          pacientes: pats,
        };
      })
      .sort((a, b) => b.count - a.count);
  }, [patients]);

  /* ── organism management ── */
  const orgManagement = useMemo(() =>
    ORGANISMOS
      .map(org => {
        const allPats  = patients.filter(p => p.organismo === org.value);
        const activePats = internados.filter(p => p.organismo === org.value);
        const setores  = [...new Set(allPats.map(p => p.setor))];
        const mats     = [...new Set(allPats.map(p => p.material).filter(Boolean))];
        return { ...org, total: allPats.length, active: activePats.length, setores, mats, pacientes: allPats };
      })
      .filter(o => o.total > 0)
      .sort((a, b) => b.active - a.active || b.total - a.total),
  [patients]);

  /* ── report ── */
  const reportData = useMemo(() => ({
    total: patients.length,
    active: internados.length,
    alta:   patients.filter(p => p.status === "Alta").length,
    obito:  patients.filter(p => p.status === "Óbito").length,
    transf: patients.filter(p => p.status === "Transferência").length,
    byOrg:  orgManagement.map(o => ({
      organismo: o.label.split("–")[0].trim(),
      fullLabel: o.label,
      ativos: o.active,
      total: o.total,
      precaucao: o.precaucao,
    })),
    bySetor: setorData,
  }), [patients]);

  const exportCSV = () => {
    const header = ["Nome","Prontuário","Setor","Leito","Data Coleta","Material","Microrganismo","Precaução","Status"];
    const rows = patients.map(p => {
      const org = ORGANISMOS.find(o => o.value === p.organismo);
      return [p.nome, p.prontuario, p.setor, p.leito, fmt(p.dataColeta), p.material || "—", org?.label || p.organismo, p.precaucao, p.status];
    });
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `iras_precaucao_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  /* ── filtered events ── */
  const filteredEvents = evtFilter === "Todos" ? events : events.filter(e => e.type === evtFilter);

  /* ── styles ── */
  const btnFilter = (active: boolean, color = "#0F4C75") => ({
    padding:"5px 14px", border: active ? `1.5px solid ${color}44` : "0.5px solid var(--color-border-tertiary)",
    borderRadius:20, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"inherit",
    background: active ? `${color}18` : "var(--color-background-primary)",
    color: active ? color : "var(--color-text-secondary)",
  });

  const card: React.CSSProperties = {
    background:"var(--color-background-primary)", borderRadius:12,
    border:"0.5px solid var(--color-border-tertiary)", padding:20,
  };

  const inpStyle: React.CSSProperties = {
    width:"100%", padding:"7px 10px", borderRadius:6,
    border:"0.5px solid var(--color-border-secondary)", fontSize:12,
    background:"var(--color-background-secondary)", color:"var(--color-text-primary)",
    fontFamily:"inherit",
  };

  const TABS: [string, string][] = [
    ["mapeamento",     "Mapeamento"],
    ["dashboard",      "Dashboard"],
    ["historico",      "Histórico"],
    ["alertas",        alertas.length > 0 ? `Alertas (${alertas.length})` : "Alertas"],
    ["relatorio",      "Relatório"],
    ["microorganismos","Microrganismos"],
  ];

  return (
    <div style={{ fontFamily:"'DM Sans',system-ui,sans-serif", background:"var(--color-background-tertiary)", minHeight:"100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      <style>{`
        @media print {
          .np { display:none !important; }
          .po { display:block !important; }
          .ptbl { width:100%; border-collapse:collapse; font-size:11px; }
          .ptbl th { background:#0F4C75; color:#fff; padding:6px 8px; text-align:left; }
          .ptbl td { padding:5px 8px; border-bottom:1px solid #E5E7EB; }
          .ptbl tr:nth-child(even) td { background:#F9FAFB; }
        }
        @media screen { .po { display:none; } }
        * { box-sizing:border-box; }
        input,select { font-family:inherit; }
      `}</style>

      {/* ── HEADER ── */}
      <header className="np" style={{ background:"#0F4C75" }}>
        <div style={{ height:52, display:"flex", alignItems:"center", padding:"0 20px" }}>
          <span style={{ color:"white", fontWeight:600, fontSize:20, letterSpacing:"-0.5px" }}>IRAS</span>
          <span style={{ color:"rgba(255,255,255,.5)", fontSize:13, fontWeight:300, marginLeft:4 }}>Control</span>
          <span style={{ width:1, height:18, background:"rgba(255,255,255,.2)", margin:"0 12px" }}/>
          <span style={{ color:"rgba(255,255,255,.7)", fontSize:12 }}>Mapeamento de Precaução</span>
        </div>
        <nav style={{ display:"flex", gap:2, padding:"0 14px", borderTop:"1px solid rgba(255,255,255,.1)" }}>
          {TABS.map(([id, lbl]) => (
            <button key={id} onClick={() => setPage(id)} style={{
              padding:"8px 14px", border:"none", borderRadius:0, cursor:"pointer", fontFamily:"inherit",
              fontSize:12, fontWeight:500, background:"transparent",
              color: page === id ? "white" : "rgba(255,255,255,.55)",
              borderBottom: page === id ? "2px solid white" : "2px solid transparent",
            }}>{lbl}</button>
          ))}
        </nav>
      </header>

      {/* ════════════════════════════════
          PAGE — MAPEAMENTO
      ════════════════════════════════ */}
      {page === "mapeamento" && (
        <main style={{ padding:"20px 20px 40px" }}>
          <div className="np" style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <h1 style={{ margin:0, fontSize:19, fontWeight:600, color:"var(--color-text-primary)" }}>Mapeamento de Precaução</h1>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>Registro e monitoramento de pacientes em isolamento · ANVISA</p>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={runAI} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"#4F46E5", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"inherit" }}>
                ✦ Insights IA
              </button>
              <button onClick={() => window.print()} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"var(--color-background-primary)", color:"var(--color-text-primary)", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"inherit" }}>
                ⎙ PDF
              </button>
              <button onClick={() => setShowForm(!showForm)} style={{ padding:"7px 16px", background:"#0F4C75", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"inherit" }}>
                + Cadastrar Paciente
              </button>
            </div>
          </div>

          {loading && (
            <div style={{ textAlign:"center", padding:"32px 0", color:"var(--color-text-secondary)", fontSize:13 }}>
              Carregando dados do Supabase…
            </div>
          )}

          {/* KPI cards */}
          <div className="np" style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:16 }}>
            {[
              { lbl:"Em Isolamento",       val:cntTotal,     c:"#0F4C75", bg:"#EFF6FF" },
              { lbl:"Precaução Contato",   val:cntContato,   c:"#92400E", bg:"#FFFBEB" },
              { lbl:"Precaução Gotículas", val:cntGoticulas, c:"#1E40AF", bg:"#EFF6FF" },
              { lbl:"Precaução Aerossóis", val:cntAerossol,  c:"#991B1B", bg:"#FEF2F2" },
            ].map(k => (
              <div key={k.lbl} style={{ background:k.bg, borderRadius:10, padding:"12px 16px", border:`1px solid ${k.c}22` }}>
                <div style={{ fontSize:10, color:k.c, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{k.lbl}</div>
                <div style={{ fontSize:28, fontWeight:600, color:k.c, lineHeight:1 }}>{k.val}</div>
              </div>
            ))}
          </div>

          {/* form */}
          {showForm && (
            <div className="np" style={{ ...card, marginBottom:16 }}>
              <h3 style={{ margin:"0 0 14px", fontSize:14, fontWeight:500, color:"var(--color-text-primary)" }}>{editingId ? "Editar Paciente em Isolamento" : "Cadastrar Paciente em Isolamento"}</h3>
              <form onSubmit={onSubmit}>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:10 }}>
                  {[
                    { n:"nome",       lbl:"Nome do Paciente *", ph:"Nome completo" },
                    { n:"prontuario", lbl:"Prontuário *",       ph:"Nº prontuário" },
                  ].map(f => (
                    <div key={f.n}>
                      <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:3, fontWeight:500 }}>{f.lbl}</label>
                      <input name={f.n} value={(form as Record<string,string>)[f.n]} onChange={onChange} placeholder={f.ph} required style={inpStyle} />
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr 1fr", gap:10, marginBottom:10 }}>
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:3, fontWeight:500 }}>Setor *</label>
                    <select name="setor" value={form.setor} onChange={onChange} required style={inpStyle}>
                      <option value="">Selecionar setor</option>
                      {SETORES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:3, fontWeight:500 }}>Leito *</label>
                    <input name="leito" value={form.leito} onChange={onChange} placeholder="Leito" required style={inpStyle} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:3, fontWeight:500 }}>Data da Coleta</label>
                    <input type="date" name="dataColeta" value={form.dataColeta} onChange={onChange} style={inpStyle} />
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:3, fontWeight:500 }}>Material</label>
                    <select name="material" value={form.material} onChange={onChange} style={inpStyle}>
                      <option value="">Selecionar</option>
                      {MATERIAIS.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:14 }}>
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:3, fontWeight:500 }}>Microrganismo Multirresistente *</label>
                    <select name="organismo" value={form.organismo} onChange={onChange} required style={inpStyle}>
                      <option value="">Selecionar microrganismo</option>
                      {ORGANISMOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:3, fontWeight:500 }}>Tipo de Precaução</label>
                    <div style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid var(--color-border-tertiary)", fontSize:12, background:"var(--color-background-tertiary)", color:"var(--color-text-secondary)", height:34, display:"flex", alignItems:"center" }}>
                      {form.organismo ? (() => {
                        const prec = ORGANISMOS.find(o => o.value === form.organismo)?.precaucao || "";
                        const m = PMETA[prec];
                        return m ? <span style={{ color:m.color, fontWeight:500 }}>{m.icon} {prec}</span> : "—";
                      })() : <span style={{ color:"var(--color-text-tertiary)" }}>Auto-preenchido</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button type="submit" style={{ padding:"7px 20px", background:"#0F4C75", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"inherit" }}>{editingId ? "Salvar alterações" : "Cadastrar"}</button>
                  <button type="button" onClick={resetForm} style={{ padding:"7px 14px", background:"transparent", color:"var(--color-text-secondary)", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Cancelar</button>
                </div>
              </form>
            </div>
          )}

          {/* filter + search */}
          <div className="np" style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
            <div style={{ display:"flex", gap:4 }}>
              {Object.entries(SMETA).map(([s, m]) => (
                <button key={s} onClick={() => setFStatus(s)} style={btnFilter(fStatus === s, m.color)}>
                  {s} ({patients.filter(p => p.status === s).length})
                </button>
              ))}
            </div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, prontuário ou setor…"
              style={{ flex:1, padding:"6px 12px", borderRadius:8, border:"0.5px solid var(--color-border-secondary)", fontSize:12, background:"var(--color-background-primary)", color:"var(--color-text-primary)" }} />
          </div>

          {/* sort chips */}
          <div className="np" style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
            <span style={{ fontSize:11, color:"var(--color-text-tertiary)", fontWeight:500, marginRight:2 }}>Ordenar por:</span>
            {([["setor","Setor"],["leito","Leito"],["dataColeta","Data Coleta"]] as [string,string][]).map(([key, label]) => {
              const active = sortKey === key;
              return (
                <button key={key} onClick={() => toggleSort(key)} style={{
                  padding:"4px 12px", border:"none", borderRadius:20, cursor:"pointer",
                  fontSize:11, fontWeight:500, fontFamily:"inherit",
                  background: active ? "#0F4C75" : "var(--color-background-secondary)",
                  color:      active ? "white"   : "var(--color-text-secondary)",
                }}>
                  {label}{active ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                </button>
              );
            })}
            <span style={{ fontSize:11, color:"var(--color-text-tertiary)", marginLeft:4 }}>
              — {displayed.length} registro{displayed.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* table */}
          <div style={{ background:"var(--color-background-primary)", borderRadius:12, border:"0.5px solid var(--color-border-tertiary)", overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr style={{ background:"#0F4C75" }}>
                  {["Paciente / Prontuário","Material","Microrganismo","Precaução","Status","Ações"].map(h => (
                    <th key={h} style={{ padding:"10px 14px", color:"white", fontWeight:500, fontSize:11, textAlign:"left", whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                  {([["setor","Setor"],["leito","Leito"],["dataColeta","Data Coleta"]] as [string,string][]).map(([key, label]) => (
                    <th key={key} onClick={() => toggleSort(key)} style={{ padding:"10px 14px", color:"white", fontWeight:500, fontSize:11, textAlign:"left", whiteSpace:"nowrap", cursor:"pointer", userSelect:"none", background: sortKey===key ? "rgba(255,255,255,.12)" : "transparent" }}>
                      {label} <span style={{ fontSize:10, opacity: sortKey===key ? 1 : 0.4 }}>{sortKey===key ? (sortDir==="asc" ? "↑" : "↓") : "↕"}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding:28, textAlign:"center", color:"var(--color-text-tertiary)" }}>Nenhum paciente encontrado</td></tr>
                ) : displayed.map((p, i) => {
                  const org = ORGANISMOS.find(o => o.value === p.organismo);
                  const pre = PMETA[p.precaucao] || PMETA.Contato;
                  const sta = SMETA[p.status]    || SMETA.Internado;
                  return (
                    <tr key={p.id} style={{ borderTop:"0.5px solid var(--color-border-tertiary)", background: i%2===0?"transparent":"var(--color-background-secondary)" }}>
                      <td style={{ padding:"9px 14px" }}>
                        <div style={{ fontWeight:500, color:"var(--color-text-primary)" }}>{p.nome}</div>
                        <div style={{ fontSize:10, color:"var(--color-text-tertiary)", fontFamily:"'DM Mono',monospace" }}>#{p.prontuario}</div>
                      </td>
                      <td style={{ padding:"9px 14px", color:"var(--color-text-secondary)" }}>{p.material || "—"}</td>
                      <td style={{ padding:"9px 14px", maxWidth:160 }}>
                        <div style={{ fontSize:11, color:"var(--color-text-primary)", lineHeight:1.3 }}>{org?.label || p.organismo}</div>
                      </td>
                      <td style={{ padding:"9px 14px" }}>
                        <span style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"2px 10px", borderRadius:20, background:pre.bg, color:pre.text, fontSize:11, fontWeight:500 }}>
                          {pre.icon} {p.precaucao}
                        </span>
                      </td>
                      <td style={{ padding:"9px 14px" }}>
                        <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:20, background:sta.bg, color:sta.color, fontSize:11, fontWeight:500 }}>{p.status}</span>
                      </td>
                      <td className="np" style={{ padding:"9px 14px" }}>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          <button onClick={() => startEdit(p)} title="Editar paciente" style={{ width:28, height:28, display:"inline-flex", alignItems:"center", justifyContent:"center", border:"0.5px solid var(--color-border-secondary)", borderRadius:6, background:"transparent", color:"#0F4C75", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
                            ✎
                          </button>
                          {p.status === "Internado" && (
                            <button onClick={() => setStModal(p.id)} style={{ padding:"3px 10px", border:"0.5px solid var(--color-border-secondary)", borderRadius:6, background:"transparent", color:"var(--color-text-secondary)", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
                              Alterar
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding:"9px 14px", color:"var(--color-text-secondary)" }}>{p.setor}</td>
                      <td style={{ padding:"9px 14px" }}>
                        <span style={{ background:"#EFF6FF", color:"#1E40AF", padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:500 }}>{p.leito}</span>
                      </td>
                      <td style={{ padding:"9px 14px", color:"var(--color-text-secondary)", fontFamily:"'DM Mono',monospace", fontSize:11 }}>{fmt(p.dataColeta)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* print view */}
          <div className="po" style={{ padding:20 }}>
            <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"2px solid #0F4C75", paddingBottom:10, marginBottom:14 }}>
              <div><div style={{ fontSize:17, fontWeight:600, color:"#0F4C75" }}>IRAS Control</div><div style={{ fontSize:11, color:"#6B7280" }}>Relatório de Mapeamento de Precauções e Isolamento — ANVISA</div></div>
              <div style={{ textAlign:"right", fontSize:10, color:"#6B7280" }}>
                <div>Data: {new Date().toLocaleDateString("pt-BR")}</div>
                <div>Total em isolamento: {cntTotal}</div>
              </div>
            </div>
            <table className="ptbl">
              <thead><tr><th>Paciente</th><th>Prontuário</th><th>Setor</th><th>Leito</th><th>Data Coleta</th><th>Material</th><th>Microrganismo</th><th>Precaução</th></tr></thead>
              <tbody>
                {internadosSorted.map(p => {
                  const org = ORGANISMOS.find(o => o.value === p.organismo);
                  return (<tr key={p.id}><td>{p.nome}</td><td>{p.prontuario}</td><td>{p.setor}</td><td>{p.leito}</td><td>{fmt(p.dataColeta)}</td><td>{p.material || "—"}</td><td>{org?.label || p.organismo}</td><td>{p.precaucao}</td></tr>);
                })}
              </tbody>
            </table>
            <div style={{ marginTop:16, fontSize:9, color:"#9CA3AF", borderTop:"1px solid #E5E7EB", paddingTop:8 }}>
              IRAS Control · Controle de Infecção Hospitalar · {new Date().toLocaleString("pt-BR")}
            </div>
          </div>
        </main>
      )}

      {/* ════════════════════════════════
          PAGE — DASHBOARD
      ════════════════════════════════ */}
      {page === "dashboard" && (
        <main style={{ padding:"20px 20px 40px" }}>
          <div style={{ marginBottom:16 }}>
            <h1 style={{ margin:0, fontSize:19, fontWeight:600, color:"var(--color-text-primary)" }}>Dashboard — Mapeamento de Precaução</h1>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>Análise epidemiológica interativa dos isolamentos ativos</p>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:20 }}>
            {[
              { lbl:"Em Isolamento", val:cntTotal,     c:"#0F4C75", bg:"#EFF6FF" },
              { lbl:"Contato",       val:cntContato,   c:"#92400E", bg:"#FFFBEB" },
              { lbl:"Gotículas",     val:cntGoticulas, c:"#1E40AF", bg:"#EFF6FF" },
              { lbl:"Aerossóis",     val:cntAerossol,  c:"#991B1B", bg:"#FEF2F2" },
            ].map(k => (
              <div key={k.lbl} style={{ background:k.bg, borderRadius:10, padding:"14px 16px", border:`1px solid ${k.c}22` }}>
                <div style={{ fontSize:10, color:k.c, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{k.lbl}</div>
                <div style={{ fontSize:30, fontWeight:600, color:k.c, lineHeight:1 }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:14, marginBottom:14 }}>
            <div style={{ ...card }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:2 }}>Distribuição por microrganismo</div>
              <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:14 }}>Pacientes ativos por agente etiológico</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={orgData} layout="vertical" margin={{ left:10, right:28 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize:10, fill:"#9CA3AF" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:"#4B5563" }} width={70} />
                  <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                  <Bar dataKey="value" name="Pacientes" radius={[0,4,4,0]}>
                    {orgData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    <LabelList dataKey="value" position="right" style={{ fontSize:11, fill:"#6B7280", fontWeight:500 }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ ...card }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:2 }}>Tipo de precaução</div>
              <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:14 }}>Proporção por categoria</div>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={precData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={65} innerRadius={35} paddingAngle={3}>
                    {precData.map((d, i) => <Cell key={i} fill={PIE_COLORS[d.name] || CHART_COLORS[i]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexDirection:"column", gap:6, marginTop:4 }}>
                {precData.map(d => {
                  const tot = precData.reduce((a, b) => a + b.value, 0);
                  const pct = tot > 0 ? Math.round(d.value / tot * 100) : 0;
                  return (
                    <div key={d.name} style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <span style={{ width:10, height:10, borderRadius:2, background:PIE_COLORS[d.name], flexShrink:0 }}/>
                      <span style={{ fontSize:11, color:"var(--color-text-secondary)", flex:1 }}>{d.name}</span>
                      <span style={{ fontSize:11, fontWeight:500, color:"var(--color-text-primary)" }}>{d.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            <div style={{ ...card }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:2 }}>Pacientes por setor</div>
              <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:14 }}>Concentração de isolamentos por unidade</div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={setorData} margin={{ bottom:30 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="setor" tick={{ fontSize:9, fill:"#6B7280" }} interval={0} angle={-30} textAnchor="end" height={52} />
                  <YAxis tick={{ fontSize:10, fill:"#9CA3AF" }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                  <Bar dataKey="total" name="Pacientes" fill="#0F4C75" radius={[4,4,0,0]}>
                    <LabelList dataKey="total" position="top" style={{ fontSize:10, fill:"#6B7280" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ ...card }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:2 }}>Material coletado</div>
              <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:14 }}>Frequência por tipo de espécime</div>
              <ResponsiveContainer width="100%" height={190}>
                <BarChart data={matData} layout="vertical" margin={{ left:0, right:24 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" tick={{ fontSize:10, fill:"#9CA3AF" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:"#4B5563" }} width={120} />
                  <Tooltip contentStyle={{ fontSize:11, borderRadius:8 }} />
                  <Bar dataKey="value" name="Coletas" fill="#0D9488" radius={[0,4,4,0]}>
                    <LabelList dataKey="value" position="right" style={{ fontSize:11, fill:"#6B7280" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ ...card }}>
            <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:12 }}>Resumo por desfecho</div>
            <div style={{ display:"flex", gap:10 }}>
              {Object.entries(SMETA).map(([s, m]) => {
                const cnt = patients.filter(p => p.status === s).length;
                return (
                  <div key={s} style={{ flex:1, background:m.bg, borderRadius:8, padding:"12px 14px", textAlign:"center" }}>
                    <div style={{ fontSize:22, fontWeight:600, color:m.color }}>{cnt}</div>
                    <div style={{ fontSize:11, color:m.color, fontWeight:500, marginTop:2 }}>{s}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}

      {/* ════════════════════════════════
          PAGE — HISTÓRICO
      ════════════════════════════════ */}
      {page === "historico" && (
        <main style={{ padding:"20px 20px 40px" }}>
          <div style={{ marginBottom:16 }}>
            <h1 style={{ margin:0, fontSize:19, fontWeight:600, color:"var(--color-text-primary)" }}>Histórico de Eventos</h1>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>
              Registro cronológico de cadastros e alterações de status · {events.length} evento{events.length !== 1 ? "s" : ""}
            </p>
          </div>

          {/* filter chips */}
          <div style={{ display:"flex", gap:6, marginBottom:20 }}>
            {["Todos", "Cadastro", "Alta", "Óbito", "Transferência"].map(f => {
              const m = EVT_META[f] || { color:"#0F4C75" };
              const cnt = f === "Todos" ? events.length : events.filter(e => e.type === f).length;
              return (
                <button key={f} onClick={() => setEvtFilter(f)} style={btnFilter(evtFilter === f, m.color)}>
                  {f} ({cnt})
                </button>
              );
            })}
          </div>

          {filteredEvents.length === 0 ? (
            <div style={{ ...card, textAlign:"center", padding:40, color:"var(--color-text-tertiary)" }}>Nenhum evento encontrado</div>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {filteredEvents.map(evt => {
                const m = EVT_META[evt.type] || { icon:"·", color:"#6B7280", bg:"#F3F4F6" };
                return (
                  <div key={evt.id} style={{ display:"flex", gap:14, alignItems:"flex-start" }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", background:m.bg, color:m.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, flexShrink:0, border:`1px solid ${m.color}22`, marginTop:2 }}>
                      {m.icon}
                    </div>
                    <div style={{ ...card, flex:1, padding:"11px 16px" }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:4 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <span style={{ fontSize:11, fontWeight:600, color:m.color, background:m.bg, padding:"2px 8px", borderRadius:20 }}>{evt.type}</span>
                          <span style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)" }}>{evt.patientNome}</span>
                        </div>
                        <span style={{ fontSize:11, color:"var(--color-text-tertiary)", fontFamily:"'DM Mono',monospace" }}>{fmtTS(evt.timestamp)}</span>
                      </div>
                      <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>
                        {evt.setor}{evt.leito ? ` · Leito ${evt.leito}` : ""}
                        <span style={{ color:"var(--color-text-tertiary)" }}> · {evt.detail}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      )}

      {/* ════════════════════════════════
          PAGE — ALERTAS
      ════════════════════════════════ */}
      {page === "alertas" && (
        <main style={{ padding:"20px 20px 40px" }}>
          <div style={{ marginBottom:16 }}>
            <h1 style={{ margin:0, fontSize:19, fontWeight:600, color:"var(--color-text-primary)" }}>Alertas de Surto</h1>
            <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>Detecção automática de clusters · 2 casos = Atenção · 3+ casos = Surto</p>
          </div>

          {alertas.length === 0 ? (
            <div style={{ ...card, textAlign:"center", padding:"48px 20px" }}>
              <div style={{ fontSize:36, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:15, fontWeight:500, color:"var(--color-text-primary)", marginBottom:4 }}>Sem alertas de surto detectados</div>
              <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>Nenhum cluster de 2 ou mais casos do mesmo microrganismo no mesmo setor</div>
            </div>
          ) : (
            <>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
                {[
                  { lbl:"Total de Alertas",  val:alertas.length,                                c:"#B91C1C", bg:"#FEF2F2" },
                  { lbl:"Surtos Ativos",      val:alertas.filter(a => a.nivel==="surto").length,  c:"#7F1D1D", bg:"#FEF2F2" },
                  { lbl:"Em Atenção",         val:alertas.filter(a => a.nivel==="atencao").length, c:"#92400E", bg:"#FFFBEB" },
                ].map(k => (
                  <div key={k.lbl} style={{ background:k.bg, borderRadius:10, padding:"12px 16px", border:`1px solid ${k.c}22` }}>
                    <div style={{ fontSize:10, color:k.c, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{k.lbl}</div>
                    <div style={{ fontSize:28, fontWeight:600, color:k.c, lineHeight:1 }}>{k.val}</div>
                  </div>
                ))}
              </div>

              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                {alertas.map(alerta => {
                  const nm = NIVEL_META[alerta.nivel];
                  return (
                    <div key={alerta.id} style={{ background:"var(--color-background-primary)", borderRadius:12, border:`1.5px solid ${nm.border}`, padding:20 }}>
                      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:12 }}>
                        <div>
                          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
                            <span style={{ fontSize:12, fontWeight:600, color:nm.color, background:nm.bg, padding:"3px 10px", borderRadius:20, border:`1px solid ${nm.border}` }}>
                              {nm.label}
                            </span>
                            <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:500, color:alerta.pre.text, background:alerta.pre.bg, padding:"2px 10px", borderRadius:20 }}>
                              {alerta.pre.icon} {alerta.precaucao}
                            </span>
                          </div>
                          <h3 style={{ margin:0, fontSize:15, fontWeight:600, color:"var(--color-text-primary)" }}>{alerta.setor}</h3>
                          <p style={{ margin:"4px 0 0", fontSize:13, color:"var(--color-text-secondary)" }}>{alerta.organismo}</p>
                        </div>
                        <div style={{ textAlign:"right" }}>
                          <div style={{ fontSize:34, fontWeight:700, color:nm.color, lineHeight:1 }}>{alerta.count}</div>
                          <div style={{ fontSize:11, color:"var(--color-text-tertiary)" }}>caso{alerta.count !== 1 ? "s" : ""}</div>
                        </div>
                      </div>

                      <div style={{ background:"var(--color-background-tertiary)", borderRadius:8, padding:"10px 14px", marginBottom:12 }}>
                        <div style={{ fontSize:11, fontWeight:500, color:"var(--color-text-tertiary)", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>Pacientes envolvidos</div>
                        {alerta.pacientes.map(p => (
                          <div key={p.id} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", fontSize:12, marginBottom:4 }}>
                            <span style={{ fontWeight:500, color:"var(--color-text-primary)" }}>{p.nome}</span>
                            <div style={{ display:"flex", gap:10, color:"var(--color-text-secondary)" }}>
                              <span>Leito {p.leito}</span>
                              <span style={{ fontFamily:"'DM Mono',monospace", fontSize:11 }}>{fmt(p.dataColeta)}</span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ padding:"8px 12px", background:`${nm.color}08`, borderRadius:8, borderLeft:`3px solid ${nm.color}` }}>
                        <div style={{ fontSize:11, fontWeight:600, color:nm.color, marginBottom:2 }}>Recomendação</div>
                        <div style={{ fontSize:12, color:"var(--color-text-secondary)" }}>
                          {alerta.nivel === "surto"
                            ? `Acionar CCIH imediatamente. Revisar medidas de ${alerta.precaucao.toLowerCase()} em ${alerta.setor}. Considerar coorte de pacientes e equipe dedicada.`
                            : `Reforçar medidas de ${alerta.precaucao.toLowerCase()} em ${alerta.setor}. Monitorar novos casos e avaliar necessidade de investigação epidemiológica.`}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </main>
      )}

      {/* ════════════════════════════════
          PAGE — RELATÓRIO
      ════════════════════════════════ */}
      {page === "relatorio" && (
        <main style={{ padding:"20px 20px 40px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <h1 style={{ margin:0, fontSize:19, fontWeight:600, color:"var(--color-text-primary)" }}>Relatório Consolidado</h1>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>Métricas gerais · Gerado em {new Date().toLocaleDateString("pt-BR")}</p>
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={exportCSV} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"#059669", color:"white", border:"none", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"inherit" }}>
                ↓ Exportar CSV
              </button>
              <button onClick={() => window.print()} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"var(--color-background-primary)", color:"var(--color-text-primary)", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"inherit" }}>
                ⎙ PDF
              </button>
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:10, marginBottom:20 }}>
            {[
              { lbl:"Total Registros", val:reportData.total, c:"#0F4C75", bg:"#EFF6FF" },
              { lbl:"Em Isolamento",   val:reportData.active, c:"#065F46", bg:"#ECFDF5" },
              { lbl:"Altas",           val:reportData.alta,   c:"#374151", bg:"#F3F4F6" },
              { lbl:"Óbitos",          val:reportData.obito,  c:"#7F1D1D", bg:"#FEF2F2" },
              { lbl:"Transferências",  val:reportData.transf, c:"#1E3A5F", bg:"#EFF6FF" },
            ].map(k => (
              <div key={k.lbl} style={{ background:k.bg, borderRadius:10, padding:"12px 16px", border:`1px solid ${k.c}22` }}>
                <div style={{ fontSize:10, color:k.c, fontWeight:500, textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{k.lbl}</div>
                <div style={{ fontSize:28, fontWeight:600, color:k.c, lineHeight:1 }}>{k.val}</div>
              </div>
            ))}
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div style={{ ...card }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:12 }}>Por microrganismo</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid var(--color-border-tertiary)" }}>
                    {["Microrganismo","Ativos","Total","Precaução"].map(h => (
                      <th key={h} style={{ padding:"6px 8px", textAlign: h === "Ativos" || h === "Total" ? "center" : "left", fontSize:11, color:"var(--color-text-tertiary)", fontWeight:500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.byOrg.map((o, i) => {
                    const pre = PMETA[o.precaucao] || PMETA.Contato;
                    return (
                      <tr key={i} style={{ borderBottom:"0.5px solid var(--color-border-tertiary)", background: i%2===0?"transparent":"var(--color-background-secondary)" }}>
                        <td style={{ padding:"7px 8px", color:"var(--color-text-primary)" }}>{o.organismo}</td>
                        <td style={{ padding:"7px 8px", textAlign:"center", fontWeight:600, color:"#0F4C75" }}>{o.ativos}</td>
                        <td style={{ padding:"7px 8px", textAlign:"center", color:"var(--color-text-secondary)" }}>{o.total}</td>
                        <td style={{ padding:"7px 8px" }}>
                          <span style={{ fontSize:11, color:pre.text, background:pre.bg, padding:"1px 8px", borderRadius:20 }}>{pre.icon} {o.precaucao}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ ...card }}>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)", marginBottom:12 }}>Por setor (ativos)</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:"1px solid var(--color-border-tertiary)" }}>
                    {["Setor","Pacientes",""].map(h => (
                      <th key={h} style={{ padding:"6px 8px", textAlign: h === "Pacientes" ? "center" : "left", fontSize:11, color:"var(--color-text-tertiary)", fontWeight:500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reportData.bySetor.map((s, i) => (
                    <tr key={i} style={{ borderBottom:"0.5px solid var(--color-border-tertiary)", background: i%2===0?"transparent":"var(--color-background-secondary)" }}>
                      <td style={{ padding:"7px 8px", color:"var(--color-text-primary)" }}>{s.setor}</td>
                      <td style={{ padding:"7px 8px", textAlign:"center", fontWeight:600, color:"#0F4C75" }}>{s.total}</td>
                      <td style={{ padding:"7px 8px", width:120 }}>
                        <div style={{ background:"#E5E7EB", borderRadius:4, height:8 }}>
                          <div style={{ background:"#0F4C75", borderRadius:4, height:8, width:`${cntTotal > 0 ? Math.round(s.total / cntTotal * 100) : 0}%` }}/>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* ════════════════════════════════
          PAGE — MICRORGANISMOS
      ════════════════════════════════ */}
      {page === "microorganismos" && (
        <main style={{ padding:"20px 20px 40px" }}>
          {orgDetail ? (
            <>
              <button onClick={() => setOrgDetail(null)} style={{ display:"flex", alignItems:"center", gap:6, padding:"6px 12px", background:"transparent", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, cursor:"pointer", fontSize:12, color:"var(--color-text-secondary)", fontFamily:"inherit", marginBottom:16 }}>
                ← Voltar
              </button>
              <div style={{ marginBottom:16 }}>
                <h1 style={{ margin:0, fontSize:19, fontWeight:600, color:"var(--color-text-primary)" }}>{orgDetail.label.split("–")[0].trim()}</h1>
                <p style={{ margin:"4px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>
                  {(() => { const pre = PMETA[orgDetail.precaucao]; return pre ? `${pre.icon} Precaução ${orgDetail.precaucao}  ·  ` : ""; })()}
                  {orgDetail.active} ativo{orgDetail.active !== 1 ? "s" : ""} · {orgDetail.total} total
                </p>
              </div>
              <div style={{ background:"var(--color-background-primary)", borderRadius:12, border:"0.5px solid var(--color-border-tertiary)", overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"#0F4C75" }}>
                      {["Paciente","Prontuário","Setor","Leito","Data Coleta","Material","Status"].map(h => (
                        <th key={h} style={{ padding:"10px 14px", color:"white", fontWeight:500, fontSize:11, textAlign:"left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orgDetail.pacientes.map((p, i) => {
                      const sta = SMETA[p.status] || SMETA.Internado;
                      return (
                        <tr key={p.id} style={{ borderTop:"0.5px solid var(--color-border-tertiary)", background: i%2===0?"transparent":"var(--color-background-secondary)" }}>
                          <td style={{ padding:"9px 14px", fontWeight:500, color:"var(--color-text-primary)" }}>{p.nome}</td>
                          <td style={{ padding:"9px 14px", fontFamily:"'DM Mono',monospace", fontSize:11, color:"var(--color-text-tertiary)" }}>#{p.prontuario}</td>
                          <td style={{ padding:"9px 14px", color:"var(--color-text-secondary)" }}>{p.setor}</td>
                          <td style={{ padding:"9px 14px" }}>
                            <span style={{ background:"#EFF6FF", color:"#1E40AF", padding:"2px 8px", borderRadius:4, fontSize:11, fontWeight:500 }}>{p.leito}</span>
                          </td>
                          <td style={{ padding:"9px 14px", fontFamily:"'DM Mono',monospace", fontSize:11, color:"var(--color-text-secondary)" }}>{fmt(p.dataColeta)}</td>
                          <td style={{ padding:"9px 14px", color:"var(--color-text-secondary)" }}>{p.material || "—"}</td>
                          <td style={{ padding:"9px 14px" }}>
                            <span style={{ padding:"2px 10px", borderRadius:20, background:sta.bg, color:sta.color, fontSize:11, fontWeight:500 }}>{p.status}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom:16 }}>
                <h1 style={{ margin:0, fontSize:19, fontWeight:600, color:"var(--color-text-primary)" }}>Gestão de Microrganismos</h1>
                <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>
                  Visão por agente etiológico · {orgManagement.length} identificado{orgManagement.length !== 1 ? "s" : ""}
                </p>
              </div>
              <div style={{ background:"var(--color-background-primary)", borderRadius:12, border:"0.5px solid var(--color-border-tertiary)", overflow:"hidden" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                  <thead>
                    <tr style={{ background:"#0F4C75" }}>
                      {["Microrganismo","Precaução","Ativos","Total","Setores","Materiais",""].map(h => (
                        <th key={h} style={{ padding:"10px 14px", color:"white", fontWeight:500, fontSize:11, textAlign:"left" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {orgManagement.map((org, i) => {
                      const pre = PMETA[org.precaucao] || PMETA.Contato;
                      return (
                        <tr key={org.value} style={{ borderTop:"0.5px solid var(--color-border-tertiary)", background: i%2===0?"transparent":"var(--color-background-secondary)" }}>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ fontWeight:500, color:"var(--color-text-primary)" }}>{org.label.split("–")[0].trim()}</div>
                            <div style={{ fontSize:10, color:"var(--color-text-tertiary)" }}>{org.label.split("–").slice(1).join("–").trim()}</div>
                          </td>
                          <td style={{ padding:"10px 14px" }}>
                            <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:500, color:pre.text, background:pre.bg, padding:"2px 10px", borderRadius:20 }}>
                              {pre.icon} {org.precaucao}
                            </span>
                          </td>
                          <td style={{ padding:"10px 14px" }}>
                            <span style={{ fontSize:18, fontWeight:700, color: org.active > 0 ? "#0F4C75" : "var(--color-text-tertiary)" }}>{org.active}</span>
                          </td>
                          <td style={{ padding:"10px 14px", color:"var(--color-text-secondary)" }}>{org.total}</td>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                              {org.setores.map(s => (
                                <span key={s} style={{ fontSize:10, background:"var(--color-background-tertiary)", color:"var(--color-text-secondary)", padding:"2px 7px", borderRadius:4 }}>{s}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding:"10px 14px" }}>
                            <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                              {org.mats.map(m => (
                                <span key={m} style={{ fontSize:10, background:"var(--color-background-tertiary)", color:"var(--color-text-secondary)", padding:"2px 7px", borderRadius:4 }}>{m}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding:"10px 14px" }}>
                            <button onClick={() => setOrgDetail(org)} style={{ padding:"4px 12px", border:"0.5px solid var(--color-border-secondary)", borderRadius:6, background:"transparent", color:"var(--color-text-secondary)", cursor:"pointer", fontSize:11, fontFamily:"inherit" }}>
                              Ver detalhes
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      )}

      {/* ── STATUS MODAL ── */}
      {stModal !== null && (() => {
        const pat = patients.find(p => p.id === stModal);
        return (
          <div className="np" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
            <div style={{ background:"var(--color-background-primary)", borderRadius:14, padding:22, width:320 }}>
              <h3 style={{ margin:"0 0 4px", fontSize:15, fontWeight:500, color:"var(--color-text-primary)" }}>Alterar status</h3>
              <p style={{ margin:"0 0 14px", fontSize:12, color:"var(--color-text-secondary)" }}>{pat?.nome}</p>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {["Alta","Óbito","Transferência"].map(s => {
                  const m = SMETA[s];
                  return (
                    <button key={s} onClick={() => changeStatus(stModal, s)} style={{ padding:"9px 14px", border:`1.5px solid ${m.color}33`, borderRadius:8, background:m.bg, color:m.color, cursor:"pointer", fontSize:13, fontWeight:500, fontFamily:"inherit", textAlign:"left" }}>
                      {s === "Alta" ? "✓" : s === "Óbito" ? "†" : "→"} Registrar {s}
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setStModal(null)} style={{ marginTop:10, width:"100%", padding:"7px", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, background:"transparent", color:"var(--color-text-secondary)", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}>Cancelar</button>
            </div>
          </div>
        );
      })()}

      {/* ── AI MODAL ── */}
      {aiModal && (
        <div className="np" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"var(--color-background-primary)", borderRadius:14, padding:24, width:560, maxHeight:"78vh", overflow:"auto" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:16, color:"#4F46E5" }}>✦</span>
                <h3 style={{ margin:0, fontSize:15, fontWeight:500, color:"var(--color-text-primary)" }}>Insights de IA — Análise Epidemiológica</h3>
              </div>
              <button onClick={() => setAiModal(false)} style={{ border:"none", background:"transparent", cursor:"pointer", fontSize:18, color:"var(--color-text-tertiary)", lineHeight:1 }}>×</button>
            </div>
            {aiLoading ? (
              <div style={{ textAlign:"center", padding:"28px 0", color:"var(--color-text-secondary)", fontSize:13 }}>
                <div style={{ fontSize:22, marginBottom:8 }}>⟳</div>
                Analisando dados epidemiológicos...
              </div>
            ) : (
              <div style={{ fontSize:13, color:"var(--color-text-primary)", lineHeight:1.75, whiteSpace:"pre-wrap" }}>{aiText}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
