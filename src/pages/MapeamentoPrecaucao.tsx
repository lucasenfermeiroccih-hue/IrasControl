import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { sendToAgent } from "@/lib/agent-service";
import ChartActions from "@/components/ChartActions";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";

const ORGANISMOS = [
  { value: "MRSA",        label: "MRSA – S. aureus resist. meticilina",              precaucao: "Contato"   },
  { value: "VRE",         label: "VRE – Enterococcus resist. vancomicina",           precaucao: "Contato"   },
  { value: "ESBL",        label: "ESBL – Beta-lactamase de espectro estendido",      precaucao: "Contato"   },
  { value: "ESBL-EC",     label: "ESBL – Escherichia coli",                          precaucao: "Contato"   },
  { value: "ESBL-KP",     label: "ESBL – Klebsiella pneumoniae",                    precaucao: "Contato"   },
  { value: "KPC-KP",      label: "KPC – Klebsiella pneumoniae",                     precaucao: "Contato"   },
  { value: "CRAB",        label: "CRAB – Acinetobacter baumannii CR",               precaucao: "Contato"   },
  { value: "CRPA",        label: "CRPA – Pseudomonas aeruginosa CR",                precaucao: "Contato"   },
  { value: "ERC",         label: "ERC – Enterobactérias Resist. Carbapenêmicos",    precaucao: "Contato"   },
  { value: "PROTEUS",     label: "Proteus",                                          precaucao: "Contato"   },
  { value: "PROVIDENCIA", label: "Providência Stuarti",                             precaucao: "Contato"   },
  { value: "PSEUDOMONAS", label: "Pseudomonas",                                     precaucao: "Contato"   },
  { value: "NDM",         label: "NDM – New Delhi metalo-β-lactamase",              precaucao: "Contato"   },
  { value: "CDIFF",       label: "Clostridioides difficile",                        precaucao: "Contato"   },
  { value: "NOROVIRUS",   label: "Norovírus",                                       precaucao: "Contato"   },
  { value: "INFLUENZA",   label: "Influenza A / B",                                 precaucao: "Gotículas" },
  { value: "TUBERCULOSE", label: "Mycobacterium tuberculosis (TB)",                 precaucao: "Aerossóis" },
  { value: "COVID19",     label: "SARS-CoV-2 (COVID-19)",                           precaucao: "Aerossóis" },
  { value: "OUTROS",      label: "Outros",                                           precaucao: "Contato"   },
];

// Precaução mais restritiva entre vários organismos selecionados
function getMostRestrictivePrecaucao(values: string[]): string {
  const priority = ["Aerossóis", "Gotículas", "Contato"];
  for (const p of priority) {
    if (values.some(v => ORGANISMOS.find(o => o.value === v)?.precaucao === p)) return p;
  }
  return "Contato";
}

const SETORES = [
  "UTI 1 Adulto","UTI 2 Adulto","UTI 3 Adulto",
  "UTI Neonatal","UTI Pediátrica","UPO",
  "Trauma Clínico","Trauma Clínico Fora",
  "Clínica Médica","Clínica Cirúrgica","Contêiner",
  "Pediatria","Pediatria (Enfermaria)","Alojamento Conjunto",
];

const MATERIAIS = [
  "Sangue","Hemocultura","Urina","Secreção Traqueal","Escarro","LCR",
  "Swab Nasal","Swab Retal","Swab de Lesão","Fezes",
  "Ponta de Cateter","Lavado Broncoalveolar","Abcesso","Líquidos","Outros",
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
const hexToRgb = (hex: string) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 0, g: 0, b: 0 };
};
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
  const [showForm,         setShowForm]         = useState(false);
  const [editingId,        setEditingId]        = useState<string | null>(null);
  const [form,             setForm]             = useState({ nome:"", prontuario:"", setor:"", leito:"", dataColeta:"", material:"", organismo:"", organismos:[] as string[], materiais:[] as string[], outroMaterial:"", outroOrganismo:"" });
  const [patientQuery,     setPatientQuery]     = useState("");
  const [patientResults,   setPatientResults]   = useState<{id:string;full_name:string;medical_record:string;sector:string;bed:string}[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [fStatus,    setFStatus]   = useState("Internado");
  const [search,     setSearch]    = useState("");
  const [stModal,    setStModal]   = useState<string | null>(null);
  const [aiModal,    setAiModal]   = useState(false);
  const [aiText,     setAiText]    = useState("");
  const [aiLoading,  setAiLoading] = useState(false);
  const [alertAI,    setAlertAI]   = useState<Record<string, {
    loading: boolean; analise: string; insights: string[];
    plano: { acao: string; porQue: string; quem: string; onde: string; quando: string; como: string; quanto: string; status: "pendente"|"em_andamento"|"concluido"|"cancelado" }[];
  }>>({});
  const [sortKey,    setSortKey]   = useState("setor");
  const [sortDir,    setSortDir]   = useState<"asc"|"desc">("asc");
  const [evtFilter,  setEvtFilter] = useState("Todos");
  const [orgDetail,  setOrgDetail] = useState<null | (typeof orgManagement)[0]>(null);
  const [fSetor,     setFSetor]    = useState("Todos");
  const [fLeito,     setFLeito]    = useState("");
  const [fDataColeta,setFDataColeta]= useState("");
  const [fOrganismo, setFOrganismo]= useState("Todos");
  const [fPrecaucao, setFPrecaucao]= useState("Todos");
  const [fMaterial,  setFMaterial] = useState("Todos");
  const [pdfModal,     setPdfModal]    = useState(false);
  const [pdfStatus,    setPdfStatus]   = useState("Todos");
  const [pdfSetor,     setPdfSetor]    = useState("Todos");
  const [pdfOrganismo, setPdfOrganismo]= useState("Todos");
  const [pdfPrecaucao, setPdfPrecaucao]= useState("Todos");
  const [pdfDataDe,    setPdfDataDe]   = useState("");
  const [pdfDataAte,   setPdfDataAte]  = useState("");

  const { hospitalId } = useHospitalContext();
  const { toast } = useToast();

  // Chart refs and metas for ChartActions
  const chartRefs = {
    org:   useRef<HTMLDivElement>(null),
    prec:  useRef<HTMLDivElement>(null),
    setor: useRef<HTMLDivElement>(null),
    mat:   useRef<HTMLDivElement>(null),
  };
  const [metas, setMetas] = useState<Record<string, number | undefined>>({});
  const setMeta = (key: string, value: number | undefined) =>
    setMetas(prev => ({ ...prev, [key]: value }));

  const exportComprehensivePDF = (pats: Patient[]) => {
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const PW = pdf.internal.pageSize.getWidth();
    const PH = pdf.internal.pageSize.getHeight();
    const MG = 14;
    const CW = PW - MG * 2;
    const now = new Date();
    const dateStr = now.toLocaleDateString("pt-BR");
    const timeStr = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    type RGB = [number, number, number];
    const NAVY:   RGB = [15,  76,  117];
    const AMBER:  RGB = [180, 83,  9  ];
    const RED:    RGB = [185, 28,  28 ];
    const TEAL:   RGB = [13,  148, 136];
    const PURPLE: RGB = [124, 58,  237];
    const GREEN:  RGB = [5,   150, 105];
    const ORANGE: RGB = [217, 119, 6  ];
    const SLATE:  RGB = [55,  65,  81 ];
    const BLUE:   RGB = [29,  78,  216];

    const CHART_C: RGB[] = [NAVY, AMBER, RED, TEAL, PURPLE, GREEN, ORANGE, SLATE];
    const PREC_C: Record<string, RGB> = { Contato: AMBER, Gotículas: BLUE, Aerossóis: RED };

    const sf = (c: RGB) => pdf.setFillColor(c[0], c[1], c[2]);
    const st = (c: RGB) => pdf.setTextColor(c[0], c[1], c[2]);
    const sd = (c: RGB) => pdf.setDrawColor(c[0], c[1], c[2]);
    const light = (c: RGB, a = 0.9): RGB => [
      Math.round(c[0] + (255 - c[0]) * a),
      Math.round(c[1] + (255 - c[1]) * a),
      Math.round(c[2] + (255 - c[2]) * a),
    ];
    const gg = (v: number) => pdf.setTextColor(v, v, v);
    const gf = (v: number) => pdf.setFillColor(v, v, v);
    const gd = (v: number) => pdf.setDrawColor(v, v, v);

    const activeP  = pats.filter(p => p.status === "Internado");
    const altaP    = pats.filter(p => p.status === "Alta");
    const obitoP   = pats.filter(p => p.status === "Óbito");
    const transfP  = pats.filter(p => p.status === "Transferência");
    const cntC     = activeP.filter(p => p.precaucao === "Contato").length;
    const cntG     = activeP.filter(p => p.precaucao === "Gotículas").length;
    const cntA     = activeP.filter(p => p.precaucao === "Aerossóis").length;

    const countMap = (arr: Patient[], keyFn: (p: Patient) => string): [string, number][] => {
      const m: Record<string, number> = {};
      arr.forEach(p => { const k = keyFn(p); if (k) m[k] = (m[k] || 0) + 1; });
      return Object.entries(m).sort((a, b) => b[1] - a[1]);
    };
    const orgEntries   = countMap(pats, p => (ORGANISMOS.find(o => o.value === p.organismo)?.label || p.organismo || "").split("–")[0].trim()).slice(0, 8);
    const setorEntries = countMap(activeP, p => p.setor).slice(0, 10);
    const matEntries   = countMap(pats, p => p.material || "").filter(([k]) => k !== "").slice(0, 8);
    const precEntries  = countMap(activeP, p => p.precaucao);

    const clusterMap: Record<string, Patient[]> = {};
    activeP.forEach(p => {
      const k = `${p.setor}||${p.organismo}`;
      (clusterMap[k] = clusterMap[k] || []).push(p);
    });
    const pdfAlerts = Object.entries(clusterMap)
      .filter(([, ps]) => ps.length >= 2)
      .map(([key, ps]) => {
        const [setor, organismo] = key.split("||");
        const org = ORGANISMOS.find(o => o.value === organismo);
        return { setor, organismo: org?.label || organismo, count: ps.length, pacientes: ps, nivel: ps.length >= 3 ? "surto" : "atencao" };
      }).sort((a, b) => b.count - a.count);

    const sectors  = [...new Set(activeP.map(p => p.setor))].sort();
    const totalPgs = 2 + sectors.length + (pdfAlerts.length > 0 ? 1 : 0);

    const pFooter = (pg: number, label = "") => {
      gf(247); pdf.rect(0, PH - 9, PW, 9, "F");
      pdf.setFontSize(6.5); gg(130); pdf.setFont("helvetica", "normal");
      pdf.text(`IRAS Control · Controle de Infecção Hospitalar · ${dateStr} ${timeStr}`, MG, PH - 2.5);
      pdf.text(`${label ? label + " · " : ""}Pág. ${pg} de ${totalPgs}`, PW - MG, PH - 2.5, { align: "right" });
    };

    const hBar = (
      entries: [string, number][], x: number, startY: number,
      maxW: number, lblW: number, bH: number, gap: number, colors: RGB[]
    ) => {
      const maxV = Math.max(...entries.map(([, v]) => v), 1);
      entries.forEach(([name, val], i) => {
        const oy = startY + i * (bH + gap);
        const bW = Math.max((val / maxV) * (maxW - lblW - 10), 1);
        const c = colors[i % colors.length];
        gf(238); pdf.rect(x + lblW, oy, maxW - lblW - 10, bH, "F");
        sf(c); pdf.rect(x + lblW, oy, bW, bH, "F");
        pdf.setFontSize(7); pdf.setFont("helvetica", "normal"); gg(45);
        const lbl = name.length > Math.floor(lblW / 2.5) ? name.slice(0, Math.floor(lblW / 2.5) - 1) + "…" : name;
        pdf.text(lbl, x, oy + bH - 1.2);
        pdf.setFont("helvetica", "bold"); st(c);
        pdf.text(String(val), x + lblW + bW + 2, oy + bH - 1.2);
      });
      return startY + entries.length * (bH + gap);
    };

    const kpiRow = (items: { lbl: string; val: number; c: RGB }[], x: number, y: number, totalW: number, h: number) => {
      const gap = 3, cardW = (totalW - gap * (items.length - 1)) / items.length;
      items.forEach((k, i) => {
        const cx = x + i * (cardW + gap);
        sf(light(k.c, 0.9)); pdf.rect(cx, y, cardW, h, "F");
        sf(k.c); pdf.rect(cx, y, 3.5, h, "F");
        pdf.setFontSize(20); pdf.setFont("helvetica", "bold"); st(k.c);
        pdf.text(String(k.val), cx + 8, y + h - 6);
        pdf.setFontSize(7); pdf.setFont("helvetica", "normal"); gg(80);
        pdf.text(k.lbl, cx + 8, y + h - 1);
      });
      return y + h + 4;
    };

    const secTitle = (t: string, x: number, y: number, w: number) => {
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(9.5); st(NAVY);
      pdf.text(t, x, y);
      sd(NAVY); pdf.setLineWidth(0.4);
      pdf.line(x, y + 2, x + w, y + 2);
      return y + 7;
    };

    function drawMiniCharts(sectorPats: Patient[], startY: number) {
      if (startY + 32 > PH - 11) return;
      const halfW = (CW - 8) / 2;
      const orgC: Record<string, number> = {};
      sectorPats.forEach(p => {
        const k = (ORGANISMOS.find(o => o.value === p.organismo)?.label || p.organismo || "").split("–")[0].trim();
        orgC[k] = (orgC[k] || 0) + 1;
      });
      const orgE = Object.entries(orgC).sort((a, b) => b[1] - a[1]).slice(0, 5);
      const precC: Record<string, number> = {};
      sectorPats.forEach(p => { precC[p.precaucao] = (precC[p.precaucao] || 0) + 1; });
      const precE = Object.entries(precC);

      gd(225); pdf.setLineWidth(0.3); pdf.line(MG, startY, PW - MG, startY);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); st(NAVY);
      pdf.text("Distribuição por Microrganismo", MG, startY + 7);
      pdf.text("Tipo de Precaução", MG + halfW + 8, startY + 7);

      const bodyY = startY + 10, MH = 5, MG2 = 1;
      const orgMaxW = halfW - 36 - 8;
      const maxOV = Math.max(...orgE.map(([, v]) => v), 1);
      orgE.forEach(([name, val], i) => {
        const oy = bodyY + i * (MH + MG2);
        const bW = Math.max((val / maxOV) * orgMaxW, 1);
        const c = CHART_C[i % CHART_C.length];
        gf(240); pdf.rect(MG + 36, oy, orgMaxW, MH, "F");
        sf(c); pdf.rect(MG + 36, oy, bW, MH, "F");
        pdf.setFontSize(6.5); pdf.setFont("helvetica", "normal"); gg(50);
        pdf.text(name.length > 18 ? name.slice(0, 17) + "…" : name, MG, oy + MH - 1);
        pdf.setFont("helvetica", "bold"); st(c);
        pdf.text(String(val), MG + 36 + bW + 2, oy + MH - 1);
      });

      const precX = MG + halfW + 8, precMaxW = halfW - 24 - 6;
      const totP = precE.reduce((s, [, v]) => s + v, 0);
      const maxPV = Math.max(...precE.map(([, v]) => v), 1);
      precE.forEach(([name, val], i) => {
        const py = bodyY + i * (MH + MG2 + 2);
        const c = (PREC_C[name] || NAVY) as RGB;
        const pct = totP > 0 ? Math.round(val / totP * 100) : 0;
        const bW = Math.max((val / maxPV) * precMaxW, 1);
        sf(light(c, 0.85)); pdf.rect(precX + 24, py, precMaxW, MH, "F");
        sf(c); pdf.rect(precX + 24, py, bW, MH, "F");
        pdf.setFontSize(6.5); pdf.setFont("helvetica", "bold"); st(c);
        pdf.text(name, precX, py + MH - 1);
        pdf.setFont("helvetica", "normal"); gg(80);
        pdf.text(`${val} (${pct}%)`, precX + 24 + bW + 2, py + MH - 1);
      });
    }

    // ══ PAGE 1 — COVER ══
    sf(NAVY); pdf.rect(0, 0, PW, 62, "F");
    sf(TEAL);  pdf.rect(0, 0, PW, 2.5, "F");
    sf(TEAL);  pdf.rect(0, 62, PW, 3, "F");

    pdf.setFont("helvetica", "bold");   pdf.setFontSize(28); pdf.setTextColor(255, 255, 255);
    pdf.text("IRAS", MG, 26);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(18); pdf.setTextColor(140, 190, 225);
    pdf.text("Control", MG + 43, 26);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(160, 205, 235);
    pdf.text("Sistema de Controle de Infecção Hospitalar", MG, 34);
    pdf.setFont("helvetica", "bold");   pdf.setFontSize(17); pdf.setTextColor(255, 255, 255);
    pdf.text("Mapeamento de Precaução e Isolamento", MG, 47);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(10.5); pdf.setTextColor(160, 205, 235);
    pdf.text("Controle de Infecção Hospitalar · ANVISA", MG, 55);
    pdf.setFontSize(9); pdf.setTextColor(160, 205, 235);
    pdf.text(`Gerado em ${dateStr} às ${timeStr}`, PW - MG, 33, { align: "right" });

    let y = 74;
    y = kpiRow([
      { lbl: "Em Isolamento",       val: activeP.length, c: NAVY  },
      { lbl: "Precaução Contato",   val: cntC,           c: AMBER },
      { lbl: "Precaução Gotículas", val: cntG,           c: BLUE  },
      { lbl: "Precaução Aerossóis", val: cntA,           c: RED   },
    ], MG, y, CW, 28);

    y += 6;
    y = secTitle("Filtros Aplicados Neste Relatório", MG, y, CW);
    const filterItems = [
      { lbl: "Status",      val: pdfStatus },
      { lbl: "Setor",       val: pdfSetor },
      { lbl: "Organismo",   val: pdfOrganismo },
      { lbl: "Precaução",   val: pdfPrecaucao },
      { lbl: "Data Coleta", val: (pdfDataDe || pdfDataAte) ? `${pdfDataDe ? fmt(pdfDataDe) : "início"} → ${pdfDataAte ? fmt(pdfDataAte) : "hoje"}` : "Todos" },
    ];
    const chipW = (CW - 8) / 3;
    filterItems.forEach((f, i) => {
      const fx = MG + (i % 3) * (chipW + 4);
      const fy = y + Math.floor(i / 3) * 16;
      gf(246); pdf.rect(fx, fy - 4, chipW, 13, "F");
      sd(NAVY); pdf.setLineWidth(0.2); pdf.rect(fx, fy - 4, chipW, 13, "S");
      pdf.setFontSize(7); pdf.setFont("helvetica", "bold"); st(NAVY);
      pdf.text(f.lbl, fx + 4, fy + 1);
      pdf.setFont("helvetica", "normal"); gg(40);
      pdf.text(f.val, fx + 4, fy + 7);
    });
    y += Math.ceil(filterItems.length / 3) * 16 + 8;

    gf(245); pdf.rect(MG, y, CW, 36, "F");
    sf(TEAL); pdf.rect(MG, y, 3, 36, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); st(TEAL);
    pdf.text("Resumo Geral", MG + 8, y + 8);
    const sumItems = [
      `Total registros: ${pats.length}`, `Em isolamento: ${activeP.length}`,
      `Altas: ${altaP.length}`, `Óbitos: ${obitoP.length}`,
      `Transferências: ${transfP.length}`, `Setores ativos: ${sectors.length}`,
      `Alertas detectados: ${pdfAlerts.length}`,
    ];
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); gg(40);
    const sumCols = 4, sumW = (CW - 16) / sumCols;
    sumItems.forEach((s, i) => {
      pdf.text("• " + s, MG + 8 + (i % sumCols) * sumW, y + 20 + Math.floor(i / sumCols) * 10);
    });

    sf(NAVY); pdf.rect(0, PH - 12, PW, 12, "F");
    pdf.setFontSize(7.5); pdf.setFont("helvetica", "normal"); pdf.setTextColor(160, 205, 235);
    pdf.text("IRAS Control · Sistema de Controle de Infecção Hospitalar", MG, PH - 4);
    pdf.text(`Página 1 de ${totalPgs}`, PW - MG, PH - 4, { align: "right" });

    // ══ PAGE 2 — ANÁLISE EPIDEMIOLÓGICA ══
    pdf.addPage();
    sf(NAVY); pdf.rect(0, 0, PW, 18, "F");
    sf(TEAL);  pdf.rect(0, 18, PW, 2, "F");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(255, 255, 255);
    pdf.text("Análise Epidemiológica — Mapeamento de Precaução", MG, 12);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(160, 205, 235);
    pdf.text(dateStr, PW - MG, 12, { align: "right" });
    y = 25;

    const COL_L = CW * 0.56, COL_RX = MG + COL_L + 6, COL_RW = CW - COL_L - 6;

    const r1Y = y;
    y = secTitle("Distribuição por Microrganismo", MG, y, COL_L);
    hBar(orgEntries, MG, y, COL_L, 52, 6, 1.5, CHART_C);
    const r1EndL = y + orgEntries.length * 7.5;

    let ry = r1Y;
    ry = secTitle("Tipo de Precaução", COL_RX, ry, COL_RW);
    const totPrec = precEntries.reduce((s, [, v]) => s + v, 0);
    const maxPrec = Math.max(...precEntries.map(([, v]) => v), 1);
    precEntries.forEach(([name, val], i) => {
      const py = ry + i * 15;
      const c = (PREC_C[name] || NAVY) as RGB;
      const pct = totPrec > 0 ? Math.round(val / totPrec * 100) : 0;
      const bW = Math.max((val / maxPrec) * (COL_RW - 4), 2);
      sf(light(c, 0.88)); pdf.rect(COL_RX, py, COL_RW - 4, 12, "F");
      sf(c); pdf.rect(COL_RX, py, bW, 12, "F");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.setTextColor(255, 255, 255);
      pdf.text(name, COL_RX + 4, py + 9);
      pdf.setFontSize(7.5); st(c);
      pdf.text(`${val} (${pct}%)`, COL_RX + COL_RW - 8, py + 9, { align: "right" });
    });
    const r1EndR = ry + precEntries.length * 15;

    y = Math.max(r1EndL, r1EndR) + 8;
    gd(225); pdf.setLineWidth(0.3); pdf.line(MG, y, PW - MG, y); y += 8;

    const r2Y = y;
    y = secTitle("Pacientes por Setor", MG, y, COL_L);
    hBar(setorEntries, MG, y, COL_L, 52, 6, 1.5, CHART_C);
    const r2EndL = y + setorEntries.length * 7.5;

    let ry2 = r2Y;
    ry2 = secTitle("Material Coletado", COL_RX, ry2, COL_RW);
    hBar(matEntries, COL_RX, ry2, COL_RW, 40, 6, 1.5, [TEAL, GREEN, PURPLE, ORANGE, NAVY, AMBER, RED, SLATE]);
    const r2EndR = ry2 + matEntries.length * 7.5;

    y = Math.max(r2EndL, r2EndR) + 8;
    gd(225); pdf.setLineWidth(0.3); pdf.line(MG, y, PW - MG, y); y += 8;

    y = secTitle("Resumo por Desfecho", MG, y, CW);
    kpiRow([
      { lbl: "Em Isolamento", val: activeP.length, c: NAVY              },
      { lbl: "Alta",          val: altaP.length,   c: SLATE             },
      { lbl: "Óbito",         val: obitoP.length,  c: RED               },
      { lbl: "Transferência", val: transfP.length, c: [30, 58, 95] as RGB },
    ], MG, y, CW, 24);

    pFooter(2, "Análise Epidemiológica");

    // ══ PAGES 3+ — BY SECTOR ══
    const COL_WS = [46, 22, 13, 50, 28, 23];
    const COL_LBL = ["Paciente", "Prontuário", "Leito", "Microrganismo", "Precaução", "Data Coleta"];
    const ROW_H = 7.5, TABLE_MAX = PH - 50;

    sectors.forEach((setor, sIdx) => {
      pdf.addPage();
      const sectorPats = activeP.filter(p => p.setor === setor)
        .sort((a, b) => a.leito.localeCompare(b.leito, "pt-BR", { numeric: true }));
      const pg = sIdx + 3;
      const sAlert = pdfAlerts.find(a => a.setor === setor);

      sf(NAVY); pdf.rect(0, 0, PW, 18, "F");
      sf(TEAL);  pdf.rect(0, 18, PW, 2, "F");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(255, 255, 255);
      pdf.text("IRAS Control — Mapeamento de Precaução", MG, 12);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(160, 205, 235);
      pdf.text(dateStr, PW - MG, 12, { align: "right" });

      gf(237); pdf.rect(0, 20, PW, 18, "F");
      sf(NAVY); pdf.rect(0, 20, 5, 18, "F");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); st(NAVY);
      pdf.text(setor, MG + 4, 31);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); gg(80);
      pdf.text(`${sectorPats.length} paciente${sectorPats.length !== 1 ? "s" : ""} em isolamento ativo`, MG + 4, 35);

      if (sAlert) {
        const bc = sAlert.nivel === "surto" ? RED : AMBER;
        sf(bc); pdf.rect(PW - MG - 58, 21, 58, 16, "F");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.setTextColor(255, 255, 255);
        pdf.text(sAlert.nivel === "surto" ? "SURTO" : "ATENCAO", PW - MG - 4, 27.5, { align: "right" });
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(7);
        pdf.text(`${sAlert.count} casos · ${(sAlert.organismo || "").split("–")[0].trim().slice(0, 20)}`, PW - MG - 4, 34, { align: "right" });
      }

      let tableY = 42;
      sf(NAVY); pdf.rect(MG, tableY, CW, ROW_H, "F");
      pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
      let hx = MG + 2;
      COL_LBL.forEach((lbl, ci) => { pdf.text(lbl, hx, tableY + 5); hx += COL_WS[ci]; });
      tableY += ROW_H;

      sectorPats.forEach((p, ri) => {
        if (tableY + ROW_H > TABLE_MAX) {
          drawMiniCharts(sectorPats, tableY + 4);
          pFooter(pg, setor);
          pdf.addPage();
          sf(NAVY); pdf.rect(0, 0, PW, 18, "F");
          sf(TEAL);  pdf.rect(0, 18, PW, 2, "F");
          pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.setTextColor(255, 255, 255);
          pdf.text("IRAS Control — Mapeamento (cont.)", MG, 12);
          gf(237); pdf.rect(0, 20, PW, 14, "F");
          sf(NAVY); pdf.rect(0, 20, 5, 14, "F");
          pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); st(NAVY);
          pdf.text(setor + " (cont.)", MG + 4, 30);
          tableY = 38;
          sf(NAVY); pdf.rect(MG, tableY, CW, ROW_H, "F");
          pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5);
          hx = MG + 2;
          COL_LBL.forEach((lbl, ci) => { pdf.text(lbl, hx, tableY + 5); hx += COL_WS[ci]; });
          tableY += ROW_H;
        }

        if (ri % 2 === 1) { gf(249); pdf.rect(MG, tableY, CW, ROW_H, "F"); }
        const precRgb = (PREC_C[p.precaucao] || NAVY) as RGB;
        sf(precRgb); pdf.rect(MG, tableY, 3, ROW_H, "F");
        const org = ORGANISMOS.find(o => o.value === p.organismo);
        const orgLbl = (org?.label || p.organismo || "—").split("–")[0].trim().slice(0, 28);
        const cells = [p.nome.slice(0, 24), p.prontuario || "—", p.leito || "—", orgLbl, p.precaucao, fmt(p.dataColeta)];
        let cx = MG + 4;
        cells.forEach((cell, ci) => {
          pdf.setFontSize(7.5);
          if (ci === 4) { pdf.setFont("helvetica", "bold"); st(precRgb); }
          else { pdf.setFont("helvetica", "normal"); gg(25); }
          pdf.text(String(cell), cx, tableY + 5);
          cx += COL_WS[ci];
        });
        gd(235); pdf.setLineWidth(0.2); pdf.line(MG, tableY + ROW_H, MG + CW, tableY + ROW_H);
        tableY += ROW_H;
      });

      drawMiniCharts(sectorPats, tableY + 4);
      pFooter(pg, setor);
    });

    // ══ ALERTS PAGE ══
    if (pdfAlerts.length > 0) {
      pdf.addPage();
      const aPg = 2 + sectors.length + 1;
      sf(RED); pdf.rect(0, 0, PW, 18, "F");
      pdf.setFillColor(239, 68, 68); pdf.rect(0, 18, PW, 2, "F");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(11); pdf.setTextColor(255, 255, 255);
      pdf.text("Alertas de Surto Epidemiológico", MG, 12);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.setTextColor(255, 200, 200);
      pdf.text(`${pdfAlerts.length} cluster${pdfAlerts.length !== 1 ? "s" : ""} · ${dateStr}`, PW - MG, 12, { align: "right" });

      let alertY = 26;
      pdfAlerts.forEach(alerta => {
        if (alertY + 44 > PH - 14) { pdf.addPage(); alertY = 20; }
        const isSurto = alerta.nivel === "surto";
        const bc = isSurto ? RED : AMBER;
        sf(light(bc, 0.92)); pdf.rect(MG, alertY, CW, 40, "F");
        sf(bc); pdf.rect(MG, alertY, 4, 40, "F");
        gd(220); pdf.setLineWidth(0.3); pdf.rect(MG, alertY, CW, 40, "S");
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); st(bc);
        pdf.text(isSurto ? "SURTO" : "ATENCAO", MG + 8, alertY + 9);
        pdf.setFontSize(22); st(bc);
        pdf.text(String(alerta.count), PW - MG - 4, alertY + 22, { align: "right" });
        pdf.setFontSize(7); gg(100); pdf.setFont("helvetica", "normal");
        pdf.text("caso" + (alerta.count !== 1 ? "s" : ""), PW - MG - 4, alertY + 28, { align: "right" });
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); gg(25);
        pdf.text(alerta.setor, MG + 8, alertY + 19);
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); gg(70);
        pdf.text((alerta.organismo || "").split("–")[0].trim().slice(0, 50), MG + 8, alertY + 27);
        pdf.setFontSize(7.5); gg(100);
        const names = alerta.pacientes.map(p => `${p.nome} (Leito ${p.leito})`).join("  ·  ");
        pdf.text("Pacientes: " + names, MG + 8, alertY + 35, { maxWidth: CW - 30 });
        alertY += 46;
      });
      pFooter(aPg, "Alertas de Surto");
    }

    pdf.save(`iras_precaucao_${now.toISOString().slice(0, 10)}.pdf`);
  };

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
    (fSetor === "Todos" || p.setor === fSetor) &&
    (fLeito === "" || p.leito.toLowerCase().includes(fLeito.toLowerCase())) &&
    (fDataColeta === "" || p.dataColeta === fDataColeta) &&
    (fOrganismo === "Todos" || (p.organismo || "").split(" | ").includes(fOrganismo)) &&
    (fPrecaucao === "Todos" || p.precaucao === fPrecaucao) &&
    (fMaterial === "Todos" || (p.material || "").split(" | ").includes(fMaterial)) &&
    (search === "" ||
      p.nome.toLowerCase().includes(search.toLowerCase()) ||
      p.prontuario.includes(search) ||
      p.setor.toLowerCase().includes(search.toLowerCase()))
  ));

  const internadosSorted = applySort(internados);

  const pdfFilteredPatients = useMemo(() =>
    patients.filter(p =>
      (pdfStatus === "Todos" || p.status === pdfStatus) &&
      (pdfSetor === "Todos" || p.setor === pdfSetor) &&
      (pdfOrganismo === "Todos" || (p.organismo || "").split(" | ").some(v => v === pdfOrganismo)) &&
      (pdfPrecaucao === "Todos" || p.precaucao === pdfPrecaucao) &&
      (pdfDataDe === "" || p.dataColeta >= pdfDataDe) &&
      (pdfDataAte === "" || p.dataColeta <= pdfDataAte)
    ), [patients, pdfStatus, pdfSetor, pdfOrganismo, pdfPrecaucao, pdfDataDe, pdfDataAte]
  );

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  const resetForm = () => {
    setForm({ nome:"", prontuario:"", setor:"", leito:"", dataColeta:"", material:"", organismo:"", organismos:[], materiais:[], outroMaterial:"", outroOrganismo:"" });
    setEditingId(null);
    setPatientQuery("");
    setPatientResults([]);
    setShowForm(false);
  };

  const searchExistingPatients = async (q: string) => {
    setPatientQuery(q);
    if (!hospitalId || q.length < 2) { setPatientResults([]); return; }
    setPatientSearching(true);
    const { data } = await supabase
      .from("patients")
      .select("id, full_name, medical_record, sector, bed")
      .eq("hospital_id", hospitalId)
      .eq("status", "active")
      .neq("source", "precaution_map")
      .or(`full_name.ilike.%${q}%,medical_record.ilike.%${q}%`)
      .limit(8);
    setPatientResults(data || []);
    setPatientSearching(false);
  };

  const selectExistingPatient = (p: typeof patientResults[0]) => {
    // Only pre-fills the form — always creates a separate precaution_map record
    setForm(f => ({ ...f, nome: p.full_name, prontuario: p.medical_record || "", setor: p.sector || "", leito: p.bed || "" }));
    setPatientQuery(p.full_name);
    setPatientResults([]);
  };

  const toggleOrganismo = (value: string) => {
    setForm(f => {
      const list = f.organismos.includes(value)
        ? f.organismos.filter(v => v !== value)
        : [...f.organismos, value];
      return { ...f, organismos: list, organismo: list.join(" | ") };
    });
  };

  const toggleMaterial = (value: string) => {
    setForm(f => {
      const list = f.materiais.includes(value)
        ? f.materiais.filter(v => v !== value)
        : [...f.materiais, value];
      return { ...f, materiais: list, material: list.join(" | ") };
    });
  };

  const startEdit = (p: Patient) => {
    const stored = p.organismo || "";
    const orgParts = stored ? stored.split(" | ") : [];
    const organismos = orgParts.map(v => v.startsWith("Outros: ") ? "OUTROS" : v).filter(v => ORGANISMOS.some(o => o.value === v));
    const outroOrganismo = orgParts.find(v => v.startsWith("Outros: "))?.replace("Outros: ", "") || "";
    const matStored = p.material || "";
    const matParts = matStored ? matStored.split(" | ") : [];
    const materiais = matParts.map(v => v.startsWith("Outros: ") ? "Outros" : v).filter(v => MATERIAIS.includes(v));
    const outroMaterial = matParts.find(v => v.startsWith("Outros: "))?.replace("Outros: ", "") || "";
    setForm({
      nome: p.nome, prontuario: p.prontuario, setor: p.setor, leito: p.leito,
      dataColeta: p.dataColeta || "", material: matStored,
      organismo: stored, organismos, materiais, outroMaterial, outroOrganismo,
    });
    setEditingId(p.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hospitalId) {
      toast({ title: "Erro", description: "Hospital não identificado. Recarregue a página.", variant: "destructive" });
      return;
    }
    if (!form.nome || !form.prontuario) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome e prontuário do paciente.", variant: "destructive" });
      return;
    }
    if (!form.setor || !form.leito) {
      toast({ title: "Campos obrigatórios", description: "Preencha setor e leito do paciente.", variant: "destructive" });
      return;
    }
    if (form.organismos.length === 0) {
      toast({ title: "Selecione ao menos um microrganismo", description: "Clique nos chips de microrganismos para selecionar.", variant: "destructive" });
      return;
    }

    const precaucao = getMostRestrictivePrecaucao(form.organismos);
    const orgValue = form.organismos.map(v => v === "OUTROS" && form.outroOrganismo ? `Outros: ${form.outroOrganismo}` : v).join(" | ");
    const materialValue = form.materiais.map(m => m === "Outros" && form.outroMaterial ? `Outros: ${form.outroMaterial}` : m).join(" | ");

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
          precaution_type: precaucao,
          reason: orgValue,
        }).eq("id", pat.precaucaoId);
      } else {
        // Patient exists but lost precaution — recreate it
        await supabase.from("precautions").insert({
          patient_id: editingId,
          precaution_type: precaucao,
          is_active: true,
          start_date: new Date().toISOString().split("T")[0],
          reason: orgValue,
        });
      }

      await (supabase as any).from("lab_results").update({
        organism: orgValue || null,
        sample_material: materialValue || null,
        collection_date: form.dataColeta || new Date().toISOString().split("T")[0],
      }).eq("patient_id", editingId);

      await fetchData();
      resetForm();
      toast({ title: "Paciente atualizado", description: `${form.nome} foi atualizado com sucesso.` });
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
        source: "precaution_map",
      })
      .select()
      .single();

    if (pErr || !newPatient) {
      toast({ title: "Erro ao cadastrar paciente", description: pErr?.message || "Tente novamente.", variant: "destructive" });
      return;
    }
    const finalPatientId = newPatient.id;

    const [precRes] = await Promise.all([
      supabase.from("precautions").insert({
        patient_id: finalPatientId,
        precaution_type: precaucao,
        is_active: true,
        start_date: new Date().toISOString().split("T")[0],
        reason: orgValue,
      }),
      ...(orgValue || materialValue ? [supabase.from("lab_results").insert({
        patient_id: finalPatientId,
        hospital_id: hospitalId,
        organism: orgValue || null,
        sample_material: materialValue || null,
        collection_date: form.dataColeta || new Date().toISOString().split("T")[0],
        status: "completed" as const,
      })] : []),
    ]);

    if (precRes.error) {
      toast({ title: "Erro ao salvar precaução", description: precRes.error.message, variant: "destructive" });
      return;
    }

    setEvents(prev => [{
      id: Date.now(),
      type: "Cadastro",
      timestamp: Date.now(),
      patientId: finalPatientId,
      patientNome: form.nome,
      setor: form.setor,
      leito: form.leito,
      detail: `${orgValue} · ${form.material || "—"}`,
    }, ...prev]);

    await fetchData();
    resetForm();
    toast({ title: "Paciente cadastrado", description: `${form.nome} adicionado ao mapeamento com precaução ${precaucao}.` });
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

  const deletePatient = async (id: string) => {
    const pat = patients.find(p => p.id === id);
    if (!pat) return;
    if (!window.confirm(`Excluir paciente "${pat.nome}"? Esta ação não pode ser desfeita.`)) return;
    await Promise.all([
      supabase.from("precautions").delete().eq("patient_id", id),
      supabase.from("lab_results").delete().eq("patient_id", id),
    ]);
    await supabase.from("patients").delete().eq("id", id);
    setPatients(prev => prev.filter(p => p.id !== id));
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

  const build5W2HTemplate = (alerta: { setor: string; organismo: string; precaucao: string; count: number }) => [
    { acao: `Implementar/reforçar precaução de ${alerta.precaucao.toLowerCase()} para todos os casos`, porQue: `Bloquear a cadeia de transmissão de ${alerta.organismo.split("–")[0].trim()} em ${alerta.setor}`, quem: "Enfermagem + CCIH", onde: alerta.setor, quando: "Imediatamente", como: "Sinalização de precaução, EPI adequado no corredor, coorte ou quarto privativo se disponível", quanto: "EPI por atendimento: R$ 15–25", status: "pendente" as const },
    { acao: "Notificar CCIH e Vigilância Epidemiológica Hospitalar", porQue: "Cumprimento de protocolo institucional e investigação epidemiológica formal do cluster", quem: "Médico assistente + Enfermeiro-chefe do setor", onde: "Chefia de setor / CCIH", quando: "Em até 24 horas da identificação do cluster", como: "Preenchimento de ficha de notificação interna e registro no sistema de vigilância", quanto: "Recursos humanos disponíveis", status: "pendente" as const },
    { acao: "Auditoria de adesão à higiene das mãos", porQue: "Principal via de transmissão cruzada de microrganismos multirresistentes entre pacientes", quem: "Enfermeiro de Controle de Infecção / CCIH", onde: alerta.setor, quando: "Em 48 h, com reavaliação semanal durante o surto", como: "Observação direta nos 5 momentos OMS, feedback imediato aos profissionais", quanto: "Álcool gel 70% adicional: ~R$ 50/semana", status: "pendente" as const },
    { acao: "Culturas de vigilância nos pacientes contato", porQue: "Rastrear portadores assintomáticos e identificar extensão real do cluster", quem: "Médico assistente + Laboratório de Microbiologia", onde: alerta.setor, quando: "Em até 72 h após identificação do cluster", como: "Swab nasal/retal (conforme agente) em todos os pacientes do setor; resultado esperado em 48–72 h", quanto: "Custo por cultura: R$ 80–150", status: "pendente" as const },
    { acao: "Limpeza e desinfecção terminal intensificada", porQue: `${alerta.organismo.split("–")[0].trim()} pode persistir em superfícies por horas a dias, mantendo reservatório ambiental`, quem: "Equipe de higienização + supervisão da CCIH", onde: `Quartos dos pacientes afetados e áreas comuns de ${alerta.setor}`, quando: "Imediato e a cada alta ou transferência de paciente afetado", como: "Hipoclorito de sódio 0,5% em superfícies; clorexidina 2% em equipamentos conforme protocolo institucional", quanto: "Insumos: R$ 100–200 por limpeza terminal", status: "pendente" as const },
    { acao: "Capacitação emergencial da equipe multiprofissional", porQue: "Reforçar conhecimento sobre o agente, via de transmissão e uso correto de EPI específico para a precaução indicada", quem: "CCIH / Educação Continuada", onde: alerta.setor, quando: "Em até 48 h, abrangendo todos os turnos (manhã, tarde, noite)", como: "Treinamento in loco de 30 min por turno com demonstração prática de paramentação/desparamentação", quanto: "1 hora de CCIH × 3 turnos + material didático", status: "pendente" as const },
    { acao: "Monitoramento diário de novos casos e indicadores do surto", porQue: "Avaliar efetividade das medidas implantadas e identificar precocemente progressão ou resolução do surto", quem: "CCIH + Chefia de Enfermagem + Médico Infectologista", onde: `${alerta.setor} — reunião diária de ponto de situação`, quando: "Diariamente enquanto houver casos ativos", como: "Reunião rápida (15 min) com atualização de planilha de casos, coleta de dados e reavaliação das medidas", quanto: "Recursos humanos; tempo estimado 15–20 min/dia", status: "pendente" as const },
  ];

  const runAlertAI = async (alerta: { id: string; setor: string; organismo: string; precaucao: string; nivel: string; count: number; pacientes: Patient[] }) => {
    const id = alerta.id;
    setAlertAI(prev => ({ ...prev, [id]: { loading: true, analise: "", insights: [], plano: [] } }));
    const pList = alerta.pacientes.map(p =>
      `• ${p.nome} | Leito: ${p.leito} | Prontuário: ${p.prontuario || "—"} | Material: ${p.material || "—"} | Coleta: ${fmt(p.dataColeta)}`
    ).join("\n");
    const prompt = `Você é um infectologista e especialista em Controle de Infecção Hospitalar (CCIH) com experiência sólida em investigação e controle de surtos. Analise o seguinte cluster epidemiológico hospitalar e forneça uma análise completa.

DADOS DO CLUSTER:
- Setor: ${alerta.setor}
- Agente etiológico: ${alerta.organismo}
- Tipo de precaução indicada: ${alerta.precaucao}
- Nível: ${alerta.nivel === "surto" ? "SURTO (≥3 casos)" : "ATENÇÃO (2 casos)"}
- Total de casos: ${alerta.count}

Pacientes envolvidos:
${pList}

Responda SOMENTE com JSON válido, sem texto antes ou depois, no seguinte formato exato:
{
  "analise_epidemiologica": "Análise epidemiológica detalhada do cluster, incluindo características do agente, risco de disseminação e contexto hospitalar.",
  "avaliacao_clinica": "Avaliação clínica do agente etiológico, perfil de resistência esperado, implicações terapêuticas e risco para os pacientes.",
  "insights": [
    "Insight prioritário 1 para controle imediato",
    "Insight 2",
    "Insight 3",
    "Insight 4",
    "Insight 5"
  ],
  "plano_5w2h": [
    {
      "acao": "Nome objetivo da ação",
      "por_que": "Justificativa clínica/epidemiológica",
      "quem": "Profissional responsável",
      "onde": "Local de execução",
      "quando": "Prazo concreto",
      "como": "Descrição técnica de execução",
      "quanto": "Recursos e custos estimados"
    }
  ]
}`;
    try {
      const result = await sendToAgent("outbreak-alert", `surto-${id}-${Date.now()}`, prompt);
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const p = JSON.parse(jsonMatch[0]);
          const plano = (p.plano_5w2h || []).map((r: any) => ({
            acao: r.acao || "", porQue: r.por_que || "", quem: r.quem || "",
            onde: r.onde || "", quando: r.quando || "", como: r.como || "", quanto: r.quanto || "",
            status: "pendente" as const,
          }));
          setAlertAI(prev => ({
            ...prev,
            [id]: { loading: false, analise: [p.analise_epidemiologica, p.avaliacao_clinica].filter(Boolean).join("\n\n"), insights: p.insights || [], plano: plano.length ? plano : build5W2HTemplate(alerta) },
          }));
          return;
        } catch { /* fall through */ }
      }
      // Fallback: show text + template plan
      setAlertAI(prev => ({ ...prev, [id]: { loading: false, analise: result, insights: [], plano: build5W2HTemplate(alerta) } }));
    } catch (err) {
      setAlertAI(prev => ({ ...prev, [id]: { loading: false, analise: err instanceof Error ? err.message : "Erro ao conectar.", insights: [], plano: build5W2HTemplate(alerta) } }));
    }
  };

  const PLANO_STATUS_META = {
    pendente:     { label: "Pendente",      color: "#fbbf24", bg: "rgba(251,191,36,0.15)",  border: "rgba(251,191,36,0.4)"  },
    em_andamento: { label: "Em andamento",  color: "#60a5fa", bg: "rgba(96,165,250,0.15)",  border: "rgba(96,165,250,0.4)"  },
    concluido:    { label: "Concluído",     color: "#34d399", bg: "rgba(52,211,153,0.15)",  border: "rgba(52,211,153,0.4)"  },
    cancelado:    { label: "Cancelado",     color: "#9ca3af", bg: "rgba(156,163,175,0.12)", border: "rgba(156,163,175,0.3)" },
  } as const;

  const setPlanoStatus = (alertId: string, rowIdx: number, status: "pendente"|"em_andamento"|"concluido"|"cancelado") => {
    setAlertAI(prev => {
      const entry = prev[alertId];
      if (!entry) return prev;
      const plano = entry.plano.map((r, i) => i === rowIdx ? { ...r, status } : r);
      return { ...prev, [alertId]: { ...entry, plano } };
    });
  };

  /* ── chart data ── */
  const orgData = useMemo(() => {
    const c: Record<string,number> = {};
    internados.forEach(p => {
      const parts = (p.organismo || "").split(" | ").map(s => s.trim()).filter(Boolean);
      parts.forEach(org => {
        const found = ORGANISMOS.find(o => o.value === org);
        const label = found ? found.label.split("–")[0].trim() : org;
        if (label) c[label] = (c[label] || 0) + 1;
      });
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
    internados.forEach(p => {
      const parts = (p.material || "").split(" | ").map(s => s.trim()).filter(Boolean);
      parts.forEach(mat => { c[mat] = (c[mat] || 0) + 1; });
    });
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
          .page-break { page-break-before: always; break-before: page; }
          .page-break-after { page-break-after: always; break-after: page; }
          .avoid-break { page-break-inside: avoid; }
          .setor-page { page-break-after: always; break-after: page; page-break-inside: auto; }
          .setor-page:last-of-type { page-break-after: auto; break-after: auto; }
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
              <button onClick={() => setPdfModal(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"var(--color-background-primary)", color:"var(--color-text-primary)", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"inherit" }}>
                ⎙ Exportar PDF
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
                {!editingId && (
                  <div style={{ marginBottom:12, padding:"10px 12px", background:"#EFF6FF", borderRadius:8, border:"1px solid #BFDBFE" }}>
                    <label style={{ display:"block", fontSize:11, color:"#1E40AF", marginBottom:4, fontWeight:500 }}>
                      Buscar paciente pelo nome ou prontuário para preencher automaticamente
                    </label>
                    <div style={{ position:"relative" }}>
                      <input
                        value={patientQuery}
                        onChange={e => searchExistingPatients(e.target.value)}
                        placeholder="Digite nome ou prontuário para buscar…"
                        style={{ ...inpStyle, paddingRight: patientQuery ? 80 : 10 }}
                      />
                      {patientQuery && (
                        <button type="button" onClick={() => { setPatientQuery(""); setPatientResults([]); setForm(f => ({ ...f, nome:"", prontuario:"", setor:"", leito:"" })); }}
                          style={{ position:"absolute", right:6, top:"50%", transform:"translateY(-50%)", fontSize:11, color:"#B91C1C", background:"transparent", border:"none", cursor:"pointer", fontFamily:"inherit" }}>
                          ✕ limpar
                        </button>
                      )}
                    </div>
                    {patientSearching && <div style={{ fontSize:11, color:"#6B7280", marginTop:4 }}>Buscando…</div>}
                    {patientResults.length > 0 && (
                      <div style={{ marginTop:4, border:"1px solid #BFDBFE", borderRadius:6, overflow:"hidden", background:"white" }}>
                        {patientResults.map(p => (
                          <button key={p.id} type="button" onClick={() => selectExistingPatient(p)}
                            style={{ display:"block", width:"100%", textAlign:"left", padding:"7px 10px", border:"none", borderBottom:"1px solid #EFF6FF", background:"white", cursor:"pointer", fontSize:12, fontFamily:"inherit" }}
                            onMouseEnter={e => (e.currentTarget.style.background = "#EFF6FF")}
                            onMouseLeave={e => (e.currentTarget.style.background = "white")}>
                            <span style={{ fontWeight:500, color:"#1E40AF" }}>{p.full_name}</span>
                            {p.medical_record && <span style={{ color:"#6B7280", marginLeft:6 }}>#{p.medical_record}</span>}
                            {p.sector && <span style={{ color:"#9CA3AF", marginLeft:6, fontSize:11 }}>{p.sector}{p.bed ? ` · leito ${p.bed}` : ""}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop:4, fontSize:11, color:"#6B7280" }}>
                      A busca preenche o formulário automaticamente. O paciente será cadastrado exclusivamente no mapa de precaução.
                    </div>
                  </div>
                )}
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10, marginBottom:10 }}>
                  {[
                    { n:"nome",       lbl:"Nome do Paciente *", ph:"Nome completo" },
                    { n:"prontuario", lbl:"Prontuário *",       ph:"Nº prontuário" },
                  ].map(f => (
                    <div key={f.n}>
                      <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:3, fontWeight:500 }}>{f.lbl}</label>
                      <input name={f.n} value={(form as unknown as Record<string,string>)[f.n]} onChange={onChange} placeholder={f.ph} required style={inpStyle} />
                    </div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr 1fr", gap:10, marginBottom:10 }}>
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
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:14, alignItems:"start" }}>
                  {/* Material */}
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:5, fontWeight:500 }}>
                      Material <span style={{ fontWeight:400, color:"var(--color-text-tertiary)" }}>(um ou mais)</span>
                    </label>
                    <div style={{ maxHeight:190, overflowY:"auto", border:"0.5px solid var(--color-border-secondary)", borderRadius:6, padding:"6px 8px", background:"var(--color-background-primary)" }}>
                      {MATERIAIS.map(m => (
                        <label key={m} style={{ display:"flex", alignItems:"center", gap:7, padding:"3px 2px", cursor:"pointer", fontSize:12, color:"var(--color-text-primary)", borderRadius:4, background: form.materiais.includes(m) ? "rgba(15,76,117,.08)" : "transparent" }}>
                          <input type="checkbox" checked={form.materiais.includes(m)} onChange={() => toggleMaterial(m)}
                            style={{ accentColor:"#0F4C75", width:13, height:13, cursor:"pointer" }} />
                          <span>{m}</span>
                        </label>
                      ))}
                    </div>
                    {form.materiais.length > 0 && (
                      <div style={{ fontSize:10, color:"var(--color-text-tertiary)", marginTop:3 }}>{form.materiais.length} selecionado(s)</div>
                    )}
                    {form.materiais.includes("Outros") && (
                      <input
                        value={form.outroMaterial}
                        onChange={e => setForm(f => ({ ...f, outroMaterial: e.target.value }))}
                        placeholder="Descreva o material…"
                        style={{ ...inpStyle, marginTop:6 }}
                      />
                    )}
                  </div>
                  {/* Microrganismo + Precaução */}
                  <div>
                    <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:5, fontWeight:500 }}>
                      Microrganismo Multirresistente * <span style={{ fontWeight:400, color:"var(--color-text-tertiary)" }}>(um ou mais)</span>
                    </label>
                    <div style={{ display:"grid", gridTemplateColumns:"1fr auto", gap:10, alignItems:"start" }}>
                      <div style={{ maxHeight:190, overflowY:"auto", border:"0.5px solid var(--color-border-secondary)", borderRadius:6, padding:"6px 8px", background:"var(--color-background-primary)" }}>
                        {ORGANISMOS.map(o => (
                          <label key={o.value} style={{ display:"flex", alignItems:"center", gap:7, padding:"3px 2px", cursor:"pointer", fontSize:12, color:"var(--color-text-primary)", borderRadius:4, background: form.organismos.includes(o.value) ? "rgba(15,76,117,.08)" : "transparent" }}>
                            <input
                              type="checkbox"
                              checked={form.organismos.includes(o.value)}
                              onChange={() => toggleOrganismo(o.value)}
                              style={{ accentColor:"#0F4C75", width:13, height:13, cursor:"pointer" }}
                            />
                            <span>{o.label}</span>
                            {form.organismos.includes(o.value) && (
                              <span style={{ marginLeft:"auto", fontSize:10, color: PMETA[o.precaucao]?.color, fontWeight:600 }}>{o.precaucao}</span>
                            )}
                          </label>
                        ))}
                      </div>
                      <div style={{ minWidth:110 }}>
                        <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:4, fontWeight:500 }}>Tipo de Precaução</div>
                        <div style={{ padding:"7px 10px", borderRadius:6, border:"0.5px solid var(--color-border-tertiary)", fontSize:12, background:"var(--color-background-tertiary)", color:"var(--color-text-secondary)", minHeight:34, display:"flex", alignItems:"center" }}>
                          {form.organismos.length > 0 ? (() => {
                            const prec = getMostRestrictivePrecaucao(form.organismos);
                            const m = PMETA[prec];
                            return m ? <span style={{ color:m.color, fontWeight:500 }}>{m.icon} {prec}</span> : "—";
                          })() : <span style={{ color:"var(--color-text-tertiary)" }}>Auto-preenchido</span>}
                        </div>
                        {form.organismos.length > 0 && (
                          <div style={{ marginTop:6, fontSize:10, color:"var(--color-text-tertiary)" }}>
                            {form.organismos.length} selecionado(s)
                          </div>
                        )}
                      </div>
                    </div>
                    {form.organismos.includes("OUTROS") && (
                      <input
                        value={form.outroOrganismo}
                        onChange={e => setForm(f => ({ ...f, outroOrganismo: e.target.value }))}
                        placeholder="Descreva o microrganismo…"
                        style={{ ...inpStyle, marginTop:6 }}
                      />
                    )}
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

          {/* filtros avançados */}
          <div className="np" style={{ display:"grid", gridTemplateColumns:"repeat(7, minmax(0,1fr)) auto", gap:8, marginBottom:14 }}>
            <select value={fSetor} onChange={e => setFSetor(e.target.value)} style={inpStyle}>
              <option value="Todos">Setor: Todos</option>
              {SETORES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <input value={fLeito} onChange={e => setFLeito(e.target.value)} placeholder="Leito" style={inpStyle} />
            <input type="date" value={fDataColeta} onChange={e => setFDataColeta(e.target.value)} style={inpStyle} title="Data da Coleta" />
            <select value={fStatus} onChange={e => setFStatus(e.target.value)} style={inpStyle}>
              {Object.keys(SMETA).map(s => <option key={s} value={s}>Status: {s}</option>)}
            </select>
            <select value={fOrganismo} onChange={e => setFOrganismo(e.target.value)} style={inpStyle}>
              <option value="Todos">Microrganismo: Todos</option>
              {ORGANISMOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={fPrecaucao} onChange={e => setFPrecaucao(e.target.value)} style={inpStyle}>
              <option value="Todos">Precaução: Todas</option>
              {Object.keys(PMETA).map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={fMaterial} onChange={e => setFMaterial(e.target.value)} style={inpStyle}>
              <option value="Todos">Material: Todos</option>
              {MATERIAIS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button
              type="button"
              onClick={() => { setFSetor("Todos"); setFLeito(""); setFDataColeta(""); setFOrganismo("Todos"); setFPrecaucao("Todos"); setFMaterial("Todos"); setSearch(""); }}
              style={{ padding:"7px 12px", border:"0.5px solid var(--color-border-secondary)", borderRadius:6, background:"var(--color-background-primary)", color:"var(--color-text-secondary)", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}
            >
              Limpar
            </button>
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
                          <button onClick={() => deletePatient(p.id)} title="Excluir paciente" style={{ width:28, height:28, display:"inline-flex", alignItems:"center", justifyContent:"center", border:"0.5px solid #FCA5A5", borderRadius:6, background:"transparent", color:"#B91C1C", cursor:"pointer", fontSize:14, fontFamily:"inherit" }}>
                            🗑
                          </button>

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
            {(() => {
              const grupos = internadosSorted.reduce<Record<string, Patient[]>>((acc, p) => {
                const k = p.setor || "Sem setor";
                (acc[k] = acc[k] || []).push(p);
                return acc;
              }, {});
              const setoresOrd = Object.keys(grupos).sort((a,b) => a.localeCompare(b, "pt-BR"));
              const renderTable = (rows: Patient[]) => (
                <table className="ptbl">
                  <thead><tr><th>Paciente</th><th>Prontuário</th><th>Setor</th><th>Leito</th><th>Data Coleta</th><th>Material</th><th>Microrganismo</th><th>Precaução</th></tr></thead>
                  <tbody>
                    {rows.map(p => {
                      const org = ORGANISMOS.find(o => o.value === p.organismo);
                      return (<tr key={p.id}><td>{p.nome}</td><td>{p.prontuario}</td><td>{p.setor}</td><td>{p.leito}</td><td>{fmt(p.dataColeta)}</td><td>{p.material || "—"}</td><td>{org?.label || p.organismo}</td><td>{p.precaucao}</td></tr>);
                    })}
                  </tbody>
                </table>
              );
              return (
                <>
                  {setoresOrd.map((setor) => (
                    <section key={setor} className="setor-page">
                      <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"2px solid #0F4C75", paddingBottom:10, marginBottom:14 }}>
                        <div>
                          <div style={{ fontSize:17, fontWeight:600, color:"#0F4C75" }}>IRAS Control</div>
                          <div style={{ fontSize:11, color:"#6B7280" }}>Mapeamento de Precauções — Setor: <b>{setor}</b></div>
                        </div>
                        <div style={{ textAlign:"right", fontSize:10, color:"#6B7280" }}>
                          <div>Data: {new Date().toLocaleDateString("pt-BR")}</div>
                          <div>Pacientes no setor: {grupos[setor].length}</div>
                        </div>
                      </div>
                      {renderTable(grupos[setor])}
                    </section>
                  ))}

                  {/* Consolidado final */}
                  <section className={setoresOrd.length > 0 ? "page-break" : ""}>
                    <div style={{ display:"flex", justifyContent:"space-between", borderBottom:"2px solid #0F4C75", paddingBottom:10, marginBottom:14 }}>
                      <div>
                        <div style={{ fontSize:17, fontWeight:600, color:"#0F4C75" }}>IRAS Control</div>
                        <div style={{ fontSize:11, color:"#6B7280" }}>Consolidado Geral — Todos os Setores · ANVISA</div>
                      </div>
                      <div style={{ textAlign:"right", fontSize:10, color:"#6B7280" }}>
                        <div>Data: {new Date().toLocaleDateString("pt-BR")}</div>
                        <div>Total em isolamento: {cntTotal}</div>
                      </div>
                    </div>
                    {renderTable(internadosSorted)}
                    <div style={{ marginTop:16, fontSize:9, color:"#9CA3AF", borderTop:"1px solid #E5E7EB", paddingTop:8 }}>
                      IRAS Control · Controle de Infecção Hospitalar · {new Date().toLocaleString("pt-BR")}
                    </div>
                  </section>
                </>
              );
            })()}
          </div>

        </main>
      )}

      {/* ════════════════════════════════
          PAGE — DASHBOARD
      ════════════════════════════════ */}
      {page === "dashboard" && (
        <main style={{ padding:"20px 20px 40px" }}>
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:16 }}>
            <div>
              <h1 style={{ margin:0, fontSize:19, fontWeight:600, color:"var(--color-text-primary)" }}>Dashboard — Mapeamento de Precaução</h1>
              <p style={{ margin:"2px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>Análise epidemiológica interativa dos isolamentos ativos</p>
            </div>
            <button onClick={() => setPdfModal(true)} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"var(--color-background-primary)", color:"var(--color-text-primary)", border:"0.5px solid var(--color-border-secondary)", borderRadius:8, cursor:"pointer", fontSize:12, fontWeight:500, fontFamily:"inherit" }}>
              ⎙ Exportar PDF
            </button>
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
            <div ref={chartRefs.org} style={{ ...card }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:2 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)" }}>Distribuição por microrganismo</div>
                <ChartActions chartRef={chartRefs.org} chartTitle="Distribuição por Microrganismo" metaValue={metas.org} onMetaChange={v => setMeta("org", v)} metaUnit="casos" />
              </div>
              <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:14 }}>Pacientes ativos por agente etiológico</div>
              {orgData.length === 0 ? (
                <div style={{ textAlign:"center", color:"#9CA3AF", fontSize:12, padding:"20px 0" }}>Sem pacientes em isolamento com microrganismo registrado</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {(() => {
                    const max = Math.max(...orgData.map(d => d.value), 1);
                    return orgData.map((d, i) => (
                      <div key={d.name} style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:160, fontSize:11, color:"var(--color-text-secondary,#4B5563)", textAlign:"right", flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={d.name}>{d.name}</div>
                        <div style={{ flex:1, background:"#F3F4F6", borderRadius:4, height:20, overflow:"hidden" }}>
                          <div style={{ width:`${(d.value / max) * 100}%`, height:"100%", background:CHART_COLORS[i % CHART_COLORS.length], borderRadius:4, minWidth:4 }} />
                        </div>
                        <div style={{ width:28, fontSize:11, fontWeight:600, color:"#6B7280", flexShrink:0, textAlign:"left" }}>{d.value}</div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </div>

            <div ref={chartRefs.prec} style={{ ...card }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:2 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)" }}>Tipo de precaução</div>
                <ChartActions chartRef={chartRefs.prec} chartTitle="Tipo de Precaução" metaValue={metas.prec} onMetaChange={v => setMeta("prec", v)} metaUnit="casos" />
              </div>
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
            <div ref={chartRefs.setor} style={{ ...card }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:2 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)" }}>Pacientes por setor</div>
                <ChartActions chartRef={chartRefs.setor} chartTitle="Pacientes por Setor" metaValue={metas.setor} onMetaChange={v => setMeta("setor", v)} metaUnit="casos" />
              </div>
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

            <div ref={chartRefs.mat} style={{ ...card }}>
              <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:2 }}>
                <div style={{ fontSize:13, fontWeight:500, color:"var(--color-text-primary)" }}>Material coletado</div>
                <ChartActions chartRef={chartRefs.mat} chartTitle="Material Coletado" metaValue={metas.mat} onMetaChange={v => setMeta("mat", v)} metaUnit="coletas" />
              </div>
              <div style={{ fontSize:11, color:"var(--color-text-secondary)", marginBottom:14 }}>Frequência por tipo de espécime</div>
              {matData.length === 0 ? (
                <div style={{ textAlign:"center", color:"#9CA3AF", fontSize:12, padding:"20px 0" }}>Sem material coletado registrado para pacientes em isolamento</div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {(() => {
                    const max = Math.max(...matData.map(d => d.value), 1);
                    return matData.map((d) => (
                      <div key={d.name} style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:160, fontSize:11, color:"var(--color-text-secondary,#4B5563)", textAlign:"right", flexShrink:0, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title={d.name}>{d.name}</div>
                        <div style={{ flex:1, background:"#F3F4F6", borderRadius:4, height:20, overflow:"hidden" }}>
                          <div style={{ width:`${(d.value / max) * 100}%`, height:"100%", background:"#0D9488", borderRadius:4, minWidth:4 }} />
                        </div>
                        <div style={{ width:28, fontSize:11, fontWeight:600, color:"#6B7280", flexShrink:0, textAlign:"left" }}>{d.value}</div>
                      </div>
                    ));
                  })()}
                </div>
              )}
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
        <main style={{ padding:"0", minHeight:"calc(100vh - 100px)", background:"linear-gradient(135deg, #060b15 0%, #0d1a2e 50%, #080f1e 100%)" }}>
          <style>{`
            .gl { background:rgba(255,255,255,0.05); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.08); border-radius:16px; }
            .gl-red { background:rgba(185,28,28,0.15); border:1px solid rgba(248,113,113,0.3); border-radius:16px; }
            .gl-amber { background:rgba(180,83,9,0.15); border:1px solid rgba(251,191,36,0.3); border-radius:16px; }
            .gl-blue { background:rgba(29,78,216,0.15); border:1px solid rgba(96,165,250,0.3); border-radius:16px; }
            .gl-green { background:rgba(5,150,105,0.15); border:1px solid rgba(52,211,153,0.3); border-radius:16px; }
            @keyframes surto-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.6;transform:scale(1.08)} }
            @keyframes spin-loader { to{transform:rotate(360deg)} }
            .surto-badge { animation: surto-pulse 2s ease-in-out infinite; }
          `}</style>

          {/* ── Status bar ── */}
          <div style={{ padding:"12px 24px", borderBottom:"1px solid rgba(255,255,255,0.06)", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", fontWeight:500, textTransform:"uppercase", letterSpacing:"1px" }}>Setores em alerta</span>
            {alertas.length === 0
              ? <span style={{ fontSize:12, color:"rgba(255,255,255,0.35)" }}>Nenhum cluster ativo no momento</span>
              : alertas.map(a => (
                  <span key={a.id} className={a.nivel === "surto" ? "surto-badge" : ""}
                    style={{ display:"inline-flex", alignItems:"center", gap:5, padding:"3px 10px 3px 6px", borderRadius:20, fontSize:11, fontWeight:600,
                      background: a.nivel === "surto" ? "rgba(185,28,28,0.3)" : "rgba(180,83,9,0.3)",
                      border: a.nivel === "surto" ? "1px solid rgba(248,113,113,0.5)" : "1px solid rgba(251,191,36,0.5)",
                      color: a.nivel === "surto" ? "#fca5a5" : "#fde68a" }}>
                    <span style={{ width:6, height:6, borderRadius:"50%", background: a.nivel === "surto" ? "#ef4444" : "#f59e0b", flexShrink:0 }} />
                    {a.setor} · {a.organismo.split("–")[0].trim()}
                  </span>
                ))
            }
            <span style={{ marginLeft:"auto", fontSize:11, color:"rgba(255,255,255,0.3)" }}>
              {new Date().toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"})}
            </span>
          </div>

          <div style={{ padding:"20px 24px 48px" }}>

            {/* ── Header ── */}
            <div style={{ marginBottom:20 }}>
              <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:"#fff", letterSpacing:"-0.5px" }}>Alertas de Surto Epidemiológico</h1>
              <p style={{ margin:"4px 0 0", fontSize:12, color:"rgba(255,255,255,0.45)" }}>Detecção automática de clusters · 2 casos = Atenção · 3+ = Surto · IA infectologista integrada</p>
            </div>

            {/* ── KPI cards ── */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
              {[
                { lbl:"Total Alertas",     val:alertas.length,                                       cls:"gl-red",   c:"#fca5a5" },
                { lbl:"Surtos Ativos",     val:alertas.filter(a => a.nivel==="surto").length,         cls:"gl-red",   c:"#f87171" },
                { lbl:"Em Atenção",        val:alertas.filter(a => a.nivel==="atencao").length,       cls:"gl-amber", c:"#fde68a" },
                { lbl:"Pacientes em Risco",val:alertas.reduce((s,a) => s+a.count, 0),                cls:"gl-blue",  c:"#93c5fd" },
                { lbl:"Internados",        val:internados.length,                                     cls:"gl",       c:"rgba(255,255,255,0.7)" },
                { lbl:"Setores Afetados",  val:[...new Set(alertas.map(a=>a.setor))].length,          cls:"gl-amber", c:"#fde68a" },
              ].map(k => (
                <div key={k.lbl} className={k.cls} style={{ padding:"14px 16px" }}>
                  <div style={{ fontSize:10, color:"rgba(255,255,255,0.45)", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:6 }}>{k.lbl}</div>
                  <div style={{ fontSize:30, fontWeight:700, color:k.c, lineHeight:1 }}>{k.val}</div>
                </div>
              ))}
            </div>

            {alertas.length === 0 ? (
              <div className="gl" style={{ textAlign:"center", padding:"60px 20px" }}>
                <div style={{ fontSize:42, marginBottom:14 }}>✅</div>
                <div style={{ fontSize:16, fontWeight:600, color:"#fff", marginBottom:6 }}>Sem alertas de surto detectados</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)" }}>Nenhum cluster de 2 ou mais casos do mesmo microrganismo no mesmo setor</div>
              </div>
            ) : (
              <>
                {/* ── Overview chart ── */}
                <div className="gl" style={{ padding:20, marginBottom:20 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:"#fff", marginBottom:2 }}>Visão geral dos clusters ativos</div>
                  <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginBottom:14 }}>Casos por setor e agente etiológico</div>
                  <ResponsiveContainer width="100%" height={Math.max(100, alertas.length * 42)}>
                    <BarChart
                      data={alertas.map(a => ({
                        label: `${a.setor.length > 16 ? a.setor.slice(0,16)+"…" : a.setor} · ${a.organismo.split("–")[0].trim().slice(0,12)}`,
                        casos: a.count,
                      }))}
                      layout="vertical"
                      margin={{ left:4, right:48, top:4, bottom:4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.07)" />
                      <XAxis type="number" tick={{ fontSize:10, fill:"rgba(255,255,255,0.35)" }} allowDecimals={false} />
                      <YAxis type="category" dataKey="label" width={185}
                        tick={(props: any) => {
                          const { x, y, payload } = props;
                          return (
                            <g transform={`translate(${x},${y})`}>
                              <text x={-6} y={0} dy="0.355em" textAnchor="end" fontSize={10} fill="rgba(255,255,255,0.6)">{payload.value}</text>
                            </g>
                          );
                        }}
                      />
                      <Tooltip
                        contentStyle={{ background:"#0d1a2e", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, fontSize:11, color:"#fff" }}
                        formatter={(v) => [`${v} casos`, "Casos"]}
                      />
                      <Bar dataKey="casos" radius={[0,6,6,0]} barSize={24}>
                        {alertas.map((a, i) => <Cell key={i} fill={a.nivel === "surto" ? "#ef4444" : "#f59e0b"} />)}
                        <LabelList dataKey="casos" position="right" style={{ fontSize:11, fill:"rgba(255,255,255,0.6)", fontWeight:700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* ── Alert cards ── */}
                <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
                  {alertas.map(alerta => {
                    const isSurto = alerta.nivel === "surto";
                    const accentColor = isSurto ? "#ef4444" : "#f59e0b";
                    const accentBorder = isSurto ? "rgba(248,113,113,0.35)" : "rgba(251,191,36,0.35)";
                    const accentBg = isSurto ? "rgba(185,28,28,0.12)" : "rgba(180,83,9,0.12)";
                    const glowShadow = isSurto ? "0 0 30px rgba(185,28,28,0.2)" : "0 0 30px rgba(180,83,9,0.15)";
                    const nm = NIVEL_META[alerta.nivel];
                    const ai = alertAI[alerta.id];
                    const timelineData = [...alerta.pacientes]
                      .sort((a, b) => a.dataColeta.localeCompare(b.dataColeta))
                      .map((p, i) => ({ date: fmt(p.dataColeta), casos: i + 1, nome: p.nome }));

                    return (
                      <div key={alerta.id} style={{ background:"rgba(255,255,255,0.04)", backdropFilter:"blur(16px)", borderRadius:20, border:`1.5px solid ${accentBorder}`, overflow:"hidden", boxShadow:glowShadow }}>

                        {/* Card header */}
                        <div style={{ padding:"20px 24px 16px", borderBottom:`1px solid ${accentBorder}`, background:`${accentBg}` }}>
                          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:16 }}>
                            <div style={{ flex:1 }}>
                              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10, flexWrap:"wrap" }}>
                                <span className={isSurto ? "surto-badge" : ""} style={{ fontSize:11, fontWeight:700, color:accentColor, background:`${accentBg}`, padding:"4px 14px", borderRadius:20, border:`1px solid ${accentBorder}`, letterSpacing:"0.5px" }}>
                                  {isSurto ? "🚨 SURTO" : "⚠️ ATENÇÃO"}
                                </span>
                                <span style={{ display:"inline-flex", alignItems:"center", gap:4, fontSize:11, fontWeight:500, color:alerta.pre.text, background:alerta.pre.bg, padding:"3px 10px", borderRadius:20 }}>
                                  {alerta.pre.icon} {alerta.precaucao}
                                </span>
                              </div>
                              <h3 style={{ margin:0, fontSize:18, fontWeight:700, color:"#fff" }}>{alerta.setor}</h3>
                              <p style={{ margin:"5px 0 0", fontSize:13, color:"rgba(255,255,255,0.55)" }}>{alerta.organismo}</p>
                            </div>
                            <div style={{ textAlign:"center", background:`${accentBg}`, borderRadius:14, padding:"10px 20px", border:`1px solid ${accentBorder}`, flexShrink:0 }}>
                              <div style={{ fontSize:42, fontWeight:800, color:accentColor, lineHeight:1 }}>{alerta.count}</div>
                              <div style={{ fontSize:11, color:accentColor, fontWeight:600, marginTop:2 }}>caso{alerta.count !== 1 ? "s" : ""}</div>
                            </div>
                          </div>
                        </div>

                        <div style={{ padding:"18px 24px 22px" }}>
                          {/* Patients table */}
                          <div style={{ marginBottom:16 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>Pacientes envolvidos</div>
                            <div style={{ background:"rgba(0,0,0,0.25)", borderRadius:10, overflow:"hidden", border:"1px solid rgba(255,255,255,0.06)" }}>
                              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                                <thead>
                                  <tr style={{ borderBottom:"1px solid rgba(255,255,255,0.08)" }}>
                                    {["Paciente","Prontuário","Leito","Material","Data Coleta"].map(h => (
                                      <th key={h} style={{ padding:"8px 12px", textAlign:"left", fontSize:10, fontWeight:600, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.5px" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {alerta.pacientes.map((p, i) => (
                                    <tr key={p.id} style={{ borderBottom: i < alerta.pacientes.length-1 ? "1px solid rgba(255,255,255,0.05)" : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                                      <td style={{ padding:"8px 12px", fontWeight:600, color:"rgba(255,255,255,0.85)" }}>{p.nome}</td>
                                      <td style={{ padding:"8px 12px", color:"rgba(255,255,255,0.45)", fontFamily:"monospace", fontSize:11 }}>{p.prontuario || "—"}</td>
                                      <td style={{ padding:"8px 12px", color:"rgba(255,255,255,0.5)" }}>Leito {p.leito}</td>
                                      <td style={{ padding:"8px 12px", color:"rgba(255,255,255,0.5)" }}>{p.material || "—"}</td>
                                      <td style={{ padding:"8px 12px", color:"rgba(255,255,255,0.45)", fontFamily:"monospace", fontSize:11 }}>{fmt(p.dataColeta)}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Timeline chart */}
                          {timelineData.length >= 2 && (
                            <div style={{ marginBottom:16 }}>
                              <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>Evolução temporal do cluster</div>
                              <div style={{ background:"rgba(0,0,0,0.2)", borderRadius:10, padding:"12px 8px 8px", border:"1px solid rgba(255,255,255,0.05)" }}>
                                <ResponsiveContainer width="100%" height={110}>
                                  <AreaChart data={timelineData} margin={{ left:0, right:8, top:4, bottom:0 }}>
                                    <defs>
                                      <linearGradient id={`dg-${alerta.id.replace(/[^a-z0-9]/gi,"")}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={accentColor} stopOpacity={0.4} />
                                        <stop offset="95%" stopColor={accentColor} stopOpacity={0.02} />
                                      </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                                    <XAxis dataKey="date" tick={{ fontSize:9, fill:"rgba(255,255,255,0.35)" }} />
                                    <YAxis tick={{ fontSize:9, fill:"rgba(255,255,255,0.35)" }} allowDecimals={false} width={24} />
                                    <Tooltip contentStyle={{ background:"#0d1a2e", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8, fontSize:10, color:"#fff" }} formatter={(v, _, p2) => [`${v} casos acumulados — ${p2.payload.nome}`, ""]} />
                                    <Area type="monotone" dataKey="casos" stroke={accentColor} strokeWidth={2}
                                      fill={`url(#dg-${alerta.id.replace(/[^a-z0-9]/gi,"")})`}
                                      dot={{ r:4, fill:accentColor, strokeWidth:0 }}
                                      activeDot={{ r:5 }}
                                    />
                                  </AreaChart>
                                </ResponsiveContainer>
                              </div>
                            </div>
                          )}

                          {/* AI trigger */}
                          {!ai && (
                            <button
                              onClick={() => runAlertAI(alerta)}
                              style={{ display:"flex", alignItems:"center", gap:8, width:"100%", padding:"12px 18px", background:`${accentBg}`, border:`1.5px dashed ${accentBorder}`, borderRadius:12, cursor:"pointer", fontSize:13, fontWeight:600, color:accentColor, fontFamily:"inherit", justifyContent:"center", transition:"all 0.2s" }}
                            >
                              ✦ Gerar Análise Infectológica com IA + Plano 5W2H
                            </button>
                          )}

                          {ai?.loading && (
                            <div style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 18px", background:`${accentBg}`, borderRadius:12, border:`1px solid ${accentBorder}` }}>
                              <div style={{ width:16, height:16, border:`2px solid ${accentColor}40`, borderTop:`2px solid ${accentColor}`, borderRadius:"50%", animation:"spin-loader 0.8s linear infinite", flexShrink:0 }} />
                              <span style={{ fontSize:13, color:accentColor, fontWeight:500 }}>Analisando cluster — IA infectologista em processamento…</span>
                            </div>
                          )}

                          {ai && !ai.loading && (
                            <div style={{ marginTop:6 }}>
                              {ai.analise && (
                                <div style={{ marginBottom:16 }}>
                                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>Análise Clínico-Epidemiológica</div>
                                  <div style={{ background:"rgba(0,0,0,0.25)", border:`1px solid ${accentBorder}`, borderRadius:12, padding:"14px 16px", fontSize:13, color:"rgba(255,255,255,0.8)", lineHeight:1.7, whiteSpace:"pre-wrap" }}>
                                    {ai.analise}
                                  </div>
                                </div>
                              )}

                              {ai.insights.length > 0 && (
                                <div style={{ marginBottom:16 }}>
                                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"1px", marginBottom:10 }}>Insights Prioritários para Controle</div>
                                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                                    {ai.insights.map((ins, i) => (
                                      <div key={i} style={{ display:"flex", gap:10, alignItems:"flex-start", padding:"10px 14px", background:"rgba(255,255,255,0.04)", borderRadius:10, borderLeft:`3px solid ${accentColor}` }}>
                                        <span style={{ fontSize:12, fontWeight:700, color:accentColor, flexShrink:0, marginTop:1 }}>{i+1}.</span>
                                        <span style={{ fontSize:13, color:"rgba(255,255,255,0.75)", lineHeight:1.55 }}>{ins}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {ai.plano.length > 0 && (
                                <div>
                                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                                    <div style={{ fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"1px" }}>Plano de Ação 5W2H — Controle do Surto</div>
                                    <div style={{ display:"flex", gap:6 }}>
                                      {(["pendente","em_andamento","concluido","cancelado"] as const).map(s => {
                                        const sm = PLANO_STATUS_META[s];
                                        const cnt = ai.plano.filter(r => r.status === s).length;
                                        return cnt > 0 ? (
                                          <span key={s} style={{ fontSize:10, fontWeight:600, color:sm.color, background:sm.bg, border:`1px solid ${sm.border}`, borderRadius:20, padding:"2px 10px" }}>
                                            {sm.label}: {cnt}
                                          </span>
                                        ) : null;
                                      })}
                                    </div>
                                  </div>
                                  <div style={{ overflowX:"auto", borderRadius:12, border:`1px solid ${accentBorder}` }}>
                                    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12, minWidth:900 }}>
                                      <thead>
                                        <tr style={{ background:`${accentBg}` }}>
                                          {[
                                            { key:"O Quê?", sub:"Ação" },
                                            { key:"Por Quê?", sub:"Justificativa" },
                                            { key:"Quem?", sub:"Responsável" },
                                            { key:"Onde?", sub:"Local" },
                                            { key:"Quando?", sub:"Prazo" },
                                            { key:"Como?", sub:"Método" },
                                            { key:"Quanto?", sub:"Recursos" },
                                            { key:"Status", sub:"Situação" },
                                          ].map(col => (
                                            <th key={col.key} style={{ padding:"10px 12px", textAlign:"left", borderBottom:`2px solid ${accentBorder}`, borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top" }}>
                                              <div style={{ fontSize:11, fontWeight:700, color:accentColor }}>{col.key}</div>
                                              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontWeight:400 }}>{col.sub}</div>
                                            </th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {ai.plano.map((row, i) => {
                                          const sm = PLANO_STATUS_META[row.status] || PLANO_STATUS_META.pendente;
                                          const rowDone = row.status === "concluido";
                                          const rowCancel = row.status === "cancelado";
                                          return (
                                            <tr key={i} style={{ background: i % 2 === 0 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.04)", borderBottom:"1px solid rgba(255,255,255,0.05)", opacity: rowCancel ? 0.5 : 1 }}>
                                              <td style={{ padding:"10px 12px", fontWeight:600, color: rowDone ? "rgba(52,211,153,0.8)" : "rgba(255,255,255,0.85)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45, textDecoration: rowCancel ? "line-through" : "none" }}>{row.acao}</td>
                                              <td style={{ padding:"10px 12px", color:"rgba(255,255,255,0.55)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45 }}>{row.porQue}</td>
                                              <td style={{ padding:"10px 12px", color:"rgba(255,255,255,0.55)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45, whiteSpace:"nowrap" }}>{row.quem}</td>
                                              <td style={{ padding:"10px 12px", color:"rgba(255,255,255,0.55)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45 }}>{row.onde}</td>
                                              <td style={{ padding:"10px 12px", color:"rgba(255,255,255,0.55)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45, whiteSpace:"nowrap" }}>{row.quando}</td>
                                              <td style={{ padding:"10px 12px", color:"rgba(255,255,255,0.55)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45 }}>{row.como}</td>
                                              <td style={{ padding:"10px 12px", color:"rgba(255,255,255,0.55)", borderRight:"1px solid rgba(255,255,255,0.06)", verticalAlign:"top", lineHeight:1.45 }}>{row.quanto}</td>
                                              <td style={{ padding:"10px 12px", verticalAlign:"middle", minWidth:140 }}>
                                                <div style={{ position:"relative" }}>
                                                  <select
                                                    value={row.status}
                                                    onChange={e => setPlanoStatus(alerta.id, i, e.target.value as any)}
                                                    style={{
                                                      appearance:"none", WebkitAppearance:"none",
                                                      width:"100%", padding:"5px 28px 5px 10px",
                                                      background: sm.bg, border:`1px solid ${sm.border}`,
                                                      borderRadius:20, fontSize:11, fontWeight:600,
                                                      color: sm.color, cursor:"pointer",
                                                      fontFamily:"inherit", outline:"none",
                                                    }}
                                                  >
                                                    <option value="pendente">Pendente</option>
                                                    <option value="em_andamento">Em andamento</option>
                                                    <option value="concluido">Concluído</option>
                                                    <option value="cancelado">Cancelado</option>
                                                  </select>
                                                  <span style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", fontSize:9, color:sm.color }}>▼</span>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                  <div style={{ marginTop:8, textAlign:"right" }}>
                                    <span style={{ fontSize:10, color:"rgba(255,255,255,0.25)" }}>Gerado por IA — validar com equipe CCIH antes de implementar</span>
                                  </div>
                                </div>
                              )}

                              <button
                                onClick={() => setAlertAI(prev => { const n = {...prev}; delete n[alerta.id]; return n; })}
                                style={{ marginTop:14, fontSize:11, color:"rgba(255,255,255,0.3)", background:"transparent", border:"none", cursor:"pointer", fontFamily:"inherit", padding:0 }}
                              >
                                ↺ Regenerar análise
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
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

      {/* ── PDF FILTER MODAL ── */}
      {pdfModal && (
        <div className="np" style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:300 }}>
          <div style={{ background:"var(--color-background-primary)", borderRadius:16, padding:28, width:520, maxHeight:"90vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div>
                <h3 style={{ margin:0, fontSize:16, fontWeight:600, color:"var(--color-text-primary)" }}>Exportar PDF — Configurar Relatório</h3>
                <p style={{ margin:"3px 0 0", fontSize:12, color:"var(--color-text-secondary)" }}>Selecione os filtros e gere um PDF completo com gráficos e tabelas</p>
              </div>
              <button onClick={() => setPdfModal(false)} style={{ border:"none", background:"transparent", cursor:"pointer", fontSize:22, color:"var(--color-text-tertiary)", lineHeight:1, padding:4 }}>×</button>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#0F4C75", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Status dos Pacientes</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {["Todos","Internado","Alta","Óbito","Transferência"].map(s => (
                  <button key={s} onClick={() => setPdfStatus(s)}
                    style={{ padding:"5px 14px", borderRadius:20, border: pdfStatus===s?"1.5px solid #0F4C75":"1px solid var(--color-border-secondary)", background: pdfStatus===s?"#EFF6FF":"transparent", color: pdfStatus===s?"#0F4C75":"var(--color-text-secondary)", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#0F4C75", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Setor</label>
              <select value={pdfSetor} onChange={e => setPdfSetor(e.target.value)}
                style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid var(--color-border-secondary)", fontSize:12, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontFamily:"inherit" }}>
                <option value="Todos">Todos os setores</option>
                {[...new Set(patients.map(p => p.setor))].filter(Boolean).sort().map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#0F4C75", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Tipo de Precaução</label>
              <div style={{ display:"flex", gap:6 }}>
                {["Todos","Contato","Gotículas","Aerossóis"].map(pr => (
                  <button key={pr} onClick={() => setPdfPrecaucao(pr)}
                    style={{ padding:"5px 14px", borderRadius:20, border: pdfPrecaucao===pr?"1.5px solid #0F4C75":"1px solid var(--color-border-secondary)", background: pdfPrecaucao===pr?"#EFF6FF":"transparent", color: pdfPrecaucao===pr?"#0F4C75":"var(--color-text-secondary)", fontSize:12, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
                    {pr}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#0F4C75", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Microrganismo</label>
              <select value={pdfOrganismo} onChange={e => setPdfOrganismo(e.target.value)}
                style={{ width:"100%", padding:"8px 10px", borderRadius:8, border:"1px solid var(--color-border-secondary)", fontSize:12, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontFamily:"inherit" }}>
                <option value="Todos">Todos os microrganismos</option>
                {ORGANISMOS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>

            <div style={{ marginBottom:20 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#0F4C75", marginBottom:8, textTransform:"uppercase", letterSpacing:"0.5px" }}>Período — Data de Coleta</label>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div>
                  <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:4 }}>De</label>
                  <input type="date" value={pdfDataDe} onChange={e => setPdfDataDe(e.target.value)}
                    style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid var(--color-border-secondary)", fontSize:12, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontFamily:"inherit" }} />
                </div>
                <div>
                  <label style={{ display:"block", fontSize:11, color:"var(--color-text-secondary)", marginBottom:4 }}>Até</label>
                  <input type="date" value={pdfDataAte} onChange={e => setPdfDataAte(e.target.value)}
                    style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:"1px solid var(--color-border-secondary)", fontSize:12, background:"var(--color-background-secondary)", color:"var(--color-text-primary)", fontFamily:"inherit" }} />
                </div>
              </div>
            </div>

            <div style={{ padding:"10px 14px", background:"#EFF6FF", borderRadius:8, marginBottom:18, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <span style={{ fontSize:13, color:"#0F4C75", fontWeight:500 }}>
                {pdfFilteredPatients.length} paciente{pdfFilteredPatients.length !== 1 ? "s" : ""} selecionado{pdfFilteredPatients.length !== 1 ? "s" : ""}
              </span>
              <span style={{ fontSize:11, color:"#1E40AF" }}>
                {pdfFilteredPatients.filter(p => p.status === "Internado").length} em isolamento ativo
              </span>
            </div>

            <div style={{ display:"flex", gap:10 }}>
              <button onClick={() => setPdfModal(false)}
                style={{ flex:1, padding:"9px", border:"1px solid var(--color-border-secondary)", borderRadius:8, background:"transparent", color:"var(--color-text-secondary)", cursor:"pointer", fontSize:13, fontFamily:"inherit" }}>
                Cancelar
              </button>
              <button
                disabled={pdfFilteredPatients.length === 0}
                onClick={() => { exportComprehensivePDF(pdfFilteredPatients); setPdfModal(false); }}
                style={{ flex:2, padding:"9px", border:"none", borderRadius:8, background: pdfFilteredPatients.length === 0 ? "#9CA3AF" : "#0F4C75", color:"white", cursor: pdfFilteredPatients.length === 0 ? "not-allowed" : "pointer", fontSize:13, fontWeight:600, fontFamily:"inherit" }}>
                ⎙ Exportar PDF ({pdfFilteredPatients.length} paciente{pdfFilteredPatients.length !== 1 ? "s" : ""})
              </button>
            </div>
          </div>
        </div>
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
