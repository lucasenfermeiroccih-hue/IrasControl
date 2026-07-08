import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Baby, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2,
  BarChart3, Activity, ClipboardList, BookOpen,
  TrendingUp, Phone, MessageCircle, FileSearch, Stethoscope,
  Download,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from "recharts";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { loadHospitalLogos, renderPdfLogos } from "@/lib/pdfLogoUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Parto {
  id: string; hospital_id: string; mes: string; ano: string;
  nome_profissional: string; data_registro: string;
  total_partos: number; partos_normais: number; cesarianas: number;
  observacoes: string; created_at: string;
}

interface Caso {
  id: string; hospital_id: string;
  tipo: "puerperal" | "isc_cesariana";
  mes: string; ano: string;
  nome_paciente: string; prontuario: string;
  data_parto: string | null; data_reintranacao: string | null;
  medico_prestador: string;
  status_caso: "confirmado" | "suspeito";
  classificacao_isc: string;
  comorbidades: string;
  pre_eclampsia: boolean;
  observacoes: string; created_at: string;
}

interface BuscaAtiva {
  id: string; hospital_id: string; mes: string; ano: string;
  total_cesarianas_periodo: number;
  contatos_ligacoes: number; contatos_whatsapp: number; contatos_revisao_prontuario: number;
  retornos_confirmados: number; casos_confirmados: number;
  observacoes: string; created_at: string;
}

interface Educacao {
  id: string; hospital_id: string;
  data_atividade: string; tema: string; descricao: string;
  facilitador: string; participantes: number; observacoes: string; created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const ANOS = ["2024","2025","2026","2027"];
const COMORBIDADES_OPT = ["Diabetes Mellitus","Hipertensão Arterial","Obesidade","Anemia","HIV/AIDS","Cardiopatia","Imunossupressão","Tabagismo","Outras"];
const CLASSIF_ISC = [
  { value: "superficial", label: "Superficial" },
  { value: "profunda", label: "Profunda" },
  { value: "cavidade", label: "Cavidade / Órgão" },
  { value: "nao_infeccao", label: "Não infecção" },
];

const anoAtual = new Date().getFullYear().toString();
const mesAtual = MESES[new Date().getMonth()];

const emptyParto = { mes: mesAtual, ano: anoAtual, nome_profissional: "", data_registro: new Date().toISOString().slice(0,10), total_partos: "", partos_normais: "", cesarianas: "", observacoes: "" };
const emptyCaso = { mes: mesAtual, ano: anoAtual, nome_paciente: "", prontuario: "", data_parto: "", data_reintranacao: "", medico_prestador: "", status_caso: "suspeito" as const, classificacao_isc: "", comorbidades: [] as string[], pre_eclampsia: false, observacoes: "" };
const emptyBusca = { mes: mesAtual, ano: anoAtual, total_cesarianas_periodo: "", contatos_ligacoes: "", contatos_whatsapp: "", contatos_revisao_prontuario: "", retornos_confirmados: "", casos_confirmados: "", observacoes: "" };
const emptyEducacao = { data_atividade: new Date().toISOString().slice(0,10), tema: "", descricao: "", facilitador: "", participantes: "", observacoes: "" };

const db = () => supabase as any;
const n = (v: any) => Number(v) || 0;
const fmt = (v: number, d = 1) => isNaN(v) || !isFinite(v) ? "—" : v.toFixed(d);
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

// ─── Component ────────────────────────────────────────────────────────────────

export default function Maternidade() {
  const { hospitalId, hospitalName, loading: ctxLoading } = useHospitalContext();

  const [partos, setPartos] = useState<Parto[]>([]);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [buscas, setBuscas] = useState<BuscaAtiva[]>([]);
  const [educacoes, setEducacoes] = useState<Educacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbMissing, setDbMissing] = useState(false);

  const [partoForm, setPartoForm] = useState({ ...emptyParto });
  const [showPartoDialog, setShowPartoDialog] = useState(false);
  const [savingParto, setSavingParto] = useState(false);

  const [casoForm, setCasoForm] = useState({ ...emptyCaso });
  const [showCasoDialog, setShowCasoDialog] = useState<"puerperal" | "isc_cesariana" | null>(null);
  const [savingCaso, setSavingCaso] = useState(false);

  const [buscaForm, setBuscaForm] = useState({ ...emptyBusca });
  const [showBuscaDialog, setShowBuscaDialog] = useState(false);
  const [savingBusca, setSavingBusca] = useState(false);

  const [educacaoForm, setEducacaoForm] = useState({ ...emptyEducacao });
  const [showEducacaoDialog, setShowEducacaoDialog] = useState(false);
  const [savingEdu, setSavingEdu] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ table: string; id: string } | null>(null);

  // ── Load ────────────────────────────────────────────────────────────────────

  const load = async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const [p, c, b, e] = await Promise.all([
        db().from("maternidade_partos").select("*").eq("hospital_id", hospitalId).order("ano", { ascending: false }).order("created_at", { ascending: false }),
        db().from("maternidade_casos").select("*").eq("hospital_id", hospitalId).order("ano", { ascending: false }).order("created_at", { ascending: false }),
        db().from("maternidade_busca_ativa").select("*").eq("hospital_id", hospitalId).order("ano", { ascending: false }).order("created_at", { ascending: false }),
        db().from("maternidade_educacao").select("*").eq("hospital_id", hospitalId).order("data_atividade", { ascending: false }),
      ]);
      if (p.error?.code === "42P01") { setDbMissing(true); setLoading(false); return; }
      setPartos(p.data || []);
      setCasos(c.data || []);
      setBuscas(b.data || []);
      setEducacoes(e.data || []);
    } catch { toast.error("Erro ao carregar dados"); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (!ctxLoading && hospitalId) load(); }, [hospitalId, ctxLoading]);

  // ── Save Parto ──────────────────────────────────────────────────────────────

  const saveParto = async () => {
    if (!partoForm.mes || !partoForm.ano) { toast.error("Informe mês e ano."); return; }
    setSavingParto(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await db().from("maternidade_partos").insert({
        hospital_id: hospitalId, user_id: user!.id,
        mes: partoForm.mes, ano: partoForm.ano,
        nome_profissional: partoForm.nome_profissional,
        data_registro: partoForm.data_registro,
        total_partos: n(partoForm.total_partos), partos_normais: n(partoForm.partos_normais), cesarianas: n(partoForm.cesarianas),
        observacoes: partoForm.observacoes,
      });
      if (error) throw error;
      toast.success("Dados de partos salvos!"); setShowPartoDialog(false); setPartoForm({ ...emptyParto }); await load();
    } catch { toast.error("Erro ao salvar."); } finally { setSavingParto(false); }
  };

  // ── Save Caso ───────────────────────────────────────────────────────────────

  const saveCaso = async () => {
    if (!casoForm.nome_paciente || !casoForm.mes) { toast.error("Informe nome do paciente e mês."); return; }
    setSavingCaso(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await db().from("maternidade_casos").insert({
        hospital_id: hospitalId, user_id: user!.id,
        tipo: showCasoDialog, mes: casoForm.mes, ano: casoForm.ano,
        nome_paciente: casoForm.nome_paciente, prontuario: casoForm.prontuario,
        data_parto: casoForm.data_parto || null, data_reintranacao: casoForm.data_reintranacao || null,
        medico_prestador: casoForm.medico_prestador,
        status_caso: casoForm.status_caso, classificacao_isc: casoForm.classificacao_isc,
        comorbidades: casoForm.comorbidades.join(", "),
        pre_eclampsia: casoForm.pre_eclampsia, observacoes: casoForm.observacoes,
      });
      if (error) throw error;
      toast.success("Caso registrado!"); setShowCasoDialog(null); setCasoForm({ ...emptyCaso }); await load();
    } catch { toast.error("Erro ao salvar caso."); } finally { setSavingCaso(false); }
  };

  // ── Save Busca Ativa ────────────────────────────────────────────────────────

  const saveBusca = async () => {
    if (!buscaForm.mes || !buscaForm.ano) { toast.error("Informe mês e ano."); return; }
    setSavingBusca(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await db().from("maternidade_busca_ativa").insert({
        hospital_id: hospitalId, user_id: user!.id,
        mes: buscaForm.mes, ano: buscaForm.ano,
        total_cesarianas_periodo: n(buscaForm.total_cesarianas_periodo),
        contatos_ligacoes: n(buscaForm.contatos_ligacoes), contatos_whatsapp: n(buscaForm.contatos_whatsapp),
        contatos_revisao_prontuario: n(buscaForm.contatos_revisao_prontuario),
        retornos_confirmados: n(buscaForm.retornos_confirmados), casos_confirmados: n(buscaForm.casos_confirmados),
        observacoes: buscaForm.observacoes,
      });
      if (error) throw error;
      toast.success("Busca ativa salva!"); setShowBuscaDialog(false); setBuscaForm({ ...emptyBusca }); await load();
    } catch { toast.error("Erro ao salvar."); } finally { setSavingBusca(false); }
  };

  // ── Save Educação ───────────────────────────────────────────────────────────

  const saveEducacao = async () => {
    if (!educacaoForm.tema || !educacaoForm.data_atividade) { toast.error("Informe tema e data."); return; }
    setSavingEdu(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await db().from("maternidade_educacao").insert({
        hospital_id: hospitalId, user_id: user!.id,
        data_atividade: educacaoForm.data_atividade, tema: educacaoForm.tema,
        descricao: educacaoForm.descricao, facilitador: educacaoForm.facilitador,
        participantes: n(educacaoForm.participantes), observacoes: educacaoForm.observacoes,
      });
      if (error) throw error;
      toast.success("Atividade registrada!"); setShowEducacaoDialog(false); setEducacaoForm({ ...emptyEducacao }); await load();
    } catch { toast.error("Erro ao salvar."); } finally { setSavingEdu(false); }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await db().from(deleteTarget.table).delete().eq("id", deleteTarget.id);
    toast.success("Excluído."); setDeleteTarget(null); await load();
  };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const casosP = casos.filter(c => c.tipo === "puerperal");
  const casosI = casos.filter(c => c.tipo === "isc_cesariana");

  const dashData = useMemo(() => {
    const recentPartos = [...partos].reverse().slice(-8);
    return recentPartos.map(p => {
      const confirmP = casosP.filter(c => c.mes === p.mes && c.ano === p.ano && c.status_caso === "confirmado").length;
      const confirmI = casosI.filter(c => c.mes === p.mes && c.ano === p.ano && c.status_caso === "confirmado").length;
      const txP = p.total_partos > 0 ? (confirmP / p.total_partos) * 100 : 0;
      const txI = p.cesarianas > 0 ? (confirmI / p.cesarianas) * 100 : 0;
      return {
        name: `${p.mes.slice(0,3)}/${p.ano.slice(2)}`,
        "Partos normais": p.partos_normais,
        "Cesarianas": p.cesarianas,
        "Tx Inf. Puerp. %": +txP.toFixed(2),
        "Tx ISC Ces. %": +txI.toFixed(2),
      };
    });
  }, [partos, casosP, casosI]);

  const ultimaBusca = buscas[0] ?? null;
  const totalContatos = ultimaBusca
    ? ultimaBusca.contatos_ligacoes + ultimaBusca.contatos_whatsapp + ultimaBusca.contatos_revisao_prontuario
    : 0;
  const taxaRetorno = ultimaBusca && ultimaBusca.total_cesarianas_periodo > 0
    ? (ultimaBusca.retornos_confirmados / ultimaBusca.total_cesarianas_periodo) * 100 : 0;

  // ── PDF ─────────────────────────────────────────────────────────────────────

  const exportPdf = async () => {
    const logos = hospitalId ? await loadHospitalLogos(hospitalId) : { hospitalLogo: null, scihLogos: [] };
    const doc = new jsPDF({ orientation: "landscape" });
    const PW = doc.internal.pageSize.getWidth();
    const today = new Date().toLocaleDateString("pt-BR");
    doc.setFillColor(30, 80, 140); doc.rect(0, 0, PW, 22, "F");
    renderPdfLogos(doc, logos, { x: 14, y: 3, h: 16, pageW: PW });
    doc.setTextColor(255,255,255); doc.setFontSize(13); doc.setFont("helvetica", "bold");
    doc.text("MÓDULO MATERNIDADE — IRASControl", PW / 2, 11, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`${hospitalName}   |   ${today}`, PW / 2, 18, { align: "center" });
    doc.setTextColor(0,0,0); let y = 30;

    // Partos
    doc.setFontSize(11); doc.text("Partos por Período", 14, y); y += 7;
    doc.setFontSize(8);
    const hPartos = ["Período","Total","Normais","Cesarianas"];
    const cPartos = [14,60,90,120];
    doc.setFillColor(30,80,140); doc.setTextColor(255,255,255); doc.rect(14, y-5, 120, 6, "F");
    hPartos.forEach((h,i) => doc.text(h, cPartos[i], y)); y += 5; doc.setTextColor(0,0,0);
    partos.slice(0,10).forEach((p,idx) => {
      if (y > 190) { doc.addPage(); y = 20; }
      if (idx%2===0) { doc.setFillColor(245,247,250); doc.rect(14, y-4, 120, 6, "F"); }
      [p.mes+"/"+p.ano, String(p.total_partos), String(p.partos_normais), String(p.cesarianas)].forEach((v,i) => doc.text(v, cPartos[i], y));
      y += 6;
    });

    y += 6; doc.setFontSize(11); doc.text("Casos de Infecção Puerperal", 14, y); y += 7;
    doc.setFontSize(8);
    const hCasos = ["Paciente","Prontuário","Data Parto","Médico","Status","Classif. ISC"];
    const cCasos = [14,65,95,125,160,185];
    doc.setFillColor(30,80,140); doc.setTextColor(255,255,255); doc.rect(14, y-5, 210, 6, "F");
    hCasos.forEach((h,i) => doc.text(h, cCasos[i], y)); y += 5; doc.setTextColor(0,0,0);
    casosP.slice(0,15).forEach((c,idx) => {
      if (y > 190) { doc.addPage(); y = 20; }
      if (idx%2===0) { doc.setFillColor(245,247,250); doc.rect(14, y-4, 210, 6, "F"); }
      [c.nome_paciente.substring(0,20), c.prontuario, fmtDate(c.data_parto), c.medico_prestador.substring(0,20), c.status_caso, CLASSIF_ISC.find(x=>x.value===c.classificacao_isc)?.label||"—"].forEach((v,i) => doc.text(String(v), cCasos[i], y));
      y += 6;
    });

    if (ultimaBusca) {
      y += 6; doc.setFontSize(11); doc.text(`Busca Ativa — ${ultimaBusca.mes}/${ultimaBusca.ano}`, 14, y); y += 7;
      doc.setFontSize(8);
      const linhas = [
        ["Total cesarianas período", String(ultimaBusca.total_cesarianas_periodo)],
        ["Contatos por ligação", String(ultimaBusca.contatos_ligacoes)],
        ["Contatos por WhatsApp", String(ultimaBusca.contatos_whatsapp)],
        ["Revisão de prontuários", String(ultimaBusca.contatos_revisao_prontuario)],
        ["Retornos confirmados", String(ultimaBusca.retornos_confirmados)],
        ["Taxa de retorno", fmt(taxaRetorno)+"%"],
      ];
      linhas.forEach(([k,v]) => { doc.text(`${k}: ${v}`, 18, y); y += 5; });
    }

    doc.save(`maternidade_${today.replace(/\//g,"-")}.pdf`);
    toast.success("PDF gerado!");
  };

  // ── Status badge ────────────────────────────────────────────────────────────

  const StatusBadge = ({ s }: { s: string }) => (
    <Badge className={s === "confirmado" ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-100 text-amber-700 border-amber-200"}>
      {s === "confirmado" ? "Confirmado" : "Suspeito"}
    </Badge>
  );

  // ── Loading / DB missing ─────────────────────────────────────────────────────

  if (loading || ctxLoading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  if (dbMissing) return (
    <div className="p-6 max-w-xl mx-auto mt-16 text-center space-y-4">
      <Baby className="h-12 w-12 text-primary mx-auto" />
      <h2 className="text-xl font-bold">Módulo Maternidade</h2>
      <p className="text-muted-foreground">As tabelas do módulo ainda não foram criadas. Execute a migration <code>20260630000002_maternidade_v2.sql</code> no banco de dados.</p>
      <Button onClick={load} variant="outline">Tentar novamente</Button>
    </div>
  );

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-100">
            <Baby className="h-6 w-6 text-pink-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Módulo Maternidade</h1>
            <p className="text-sm text-muted-foreground">Controle de infecção puerperal, ISC, busca ativa e educação permanente</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={exportPdf} className="gap-1.5">
          <Download className="h-4 w-4" /> Relatório PDF
        </Button>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList className="flex flex-wrap h-auto gap-1 mb-2">
          <TabsTrigger value="dashboard" className="gap-1.5"><Activity className="h-3.5 w-3.5" /> Dashboard</TabsTrigger>
          <TabsTrigger value="partos" className="gap-1.5"><Baby className="h-3.5 w-3.5" /> Partos</TabsTrigger>
          <TabsTrigger value="puerperal" className="gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Inf. Puerperal</TabsTrigger>
          <TabsTrigger value="isc" className="gap-1.5"><AlertTriangle className="h-3.5 w-3.5" /> ISC Cesariana</TabsTrigger>
          <TabsTrigger value="busca" className="gap-1.5"><Phone className="h-3.5 w-3.5" /> Busca Ativa</TabsTrigger>
          <TabsTrigger value="educacao" className="gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Educação</TabsTrigger>
        </TabsList>

        {/* ──────── DASHBOARD ──────── */}
        <TabsContent value="dashboard" className="space-y-4">
          {partos.length === 0 ? (
            <div className="flex flex-col items-center h-48 justify-center text-muted-foreground gap-2">
              <Baby className="h-10 w-10 opacity-20" />
              <p>Nenhum dado lançado ainda. Comece pelos <strong>Partos</strong>.</p>
            </div>
          ) : (
            <>
              {/* KPI row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Partos (último período)", value: partos[0]?.total_partos ?? 0, unit: "partos", color: "blue" },
                  { label: "Casos puerperais (ano)", value: casosP.filter(c => c.ano === anoAtual).length, unit: "casos", color: "red" },
                  { label: "Casos ISC Cesariana (ano)", value: casosI.filter(c => c.ano === anoAtual).length, unit: "casos", color: "orange" },
                  { label: "Taxa Retorno Busca Ativa", value: ultimaBusca ? taxaRetorno : null, unit: "%", color: "green" },
                ].map((k, i) => (
                  <Card key={i}>
                    <CardContent className="pt-4 pb-3 px-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{k.label}</p>
                      <p className="text-2xl font-bold mt-1">{k.value === null ? "—" : k.unit === "%" ? fmt(k.value as number) + "%" : k.value}</p>
                      {k.unit !== "%" && <p className="text-xs text-muted-foreground">{k.unit}</p>}
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-1.5"><BarChart3 className="h-4 w-4 text-primary" /> Partos por Período</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dashData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Partos normais" fill="#3b82f6" stackId="a" radius={[0,0,0,0]} />
                        <Bar dataKey="Cesarianas" fill="#8b5cf6" stackId="a" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-1.5"><TrendingUp className="h-4 w-4 text-primary" /> Taxas de Infecção (%)</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={dashData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="Tx Inf. Puerp. %" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="Tx ISC Ces. %" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {ultimaBusca && (
                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-1.5"><Phone className="h-4 w-4 text-primary" /> Busca Ativa pós-Alta — {ultimaBusca.mes}/{ultimaBusca.ano}</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={[
                        { name: "Ligações", value: ultimaBusca.contatos_ligacoes, fill: "#3b82f6" },
                        { name: "WhatsApp", value: ultimaBusca.contatos_whatsapp, fill: "#22c55e" },
                        { name: "Prontuário", value: ultimaBusca.contatos_revisao_prontuario, fill: "#8b5cf6" },
                        { name: "Retornos", value: ultimaBusca.retornos_confirmados, fill: "#ef4444" },
                      ]} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Bar dataKey="value" name="Contatos" radius={[3,3,0,0]}>
                          {[0,1,2,3].map(i => <Cell key={i} fill={["#3b82f6","#22c55e","#8b5cf6","#ef4444"][i]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <p className="text-center text-sm font-semibold mt-2">
                      Indicador de Busca Ativa: <span className={taxaRetorno < 70 ? "text-red-600" : "text-green-600"}>{fmt(taxaRetorno)}%</span>
                      <span className="text-xs text-muted-foreground ml-2">(retornos / total cesarianas)</span>
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* ──────── PARTOS ──────── */}
        <TabsContent value="partos" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Lançamento mensal de dados obstétricos</p>
            <Button size="sm" onClick={() => setShowPartoDialog(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo Lançamento
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Total Partos</TableHead>
                      <TableHead>Normais</TableHead>
                      <TableHead>Cesarianas</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Observações</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partos.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum lançamento.</TableCell></TableRow>}
                    {partos.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.mes}/{p.ano}</TableCell>
                        <TableCell>{p.total_partos}</TableCell>
                        <TableCell>{p.partos_normais}</TableCell>
                        <TableCell>{p.cesarianas}</TableCell>
                        <TableCell className="text-sm">{p.nome_profissional || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{p.observacoes || "—"}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget({ table: "maternidade_partos", id: p.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── INFECÇÃO PUERPERAL ──────── */}
        <TabsContent value="puerperal" className="space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex gap-2 text-sm">
              <Badge className="bg-red-100 text-red-700 border-red-200">{casosP.filter(c=>c.status_caso==="confirmado").length} confirmados</Badge>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">{casosP.filter(c=>c.status_caso==="suspeito").length} suspeitos</Badge>
            </div>
            <Button size="sm" onClick={() => { setCasoForm({ ...emptyCaso }); setShowCasoDialog("puerperal"); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> Registrar Caso
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Prontuário</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Data Parto</TableHead>
                      <TableHead>Reinternação</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Classif. ISC</TableHead>
                      <TableHead>Comorbidades</TableHead>
                      <TableHead>Pré-ecl.</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {casosP.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhum caso registrado.</TableCell></TableRow>}
                    {casosP.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.nome_paciente}</TableCell>
                        <TableCell className="text-sm">{c.prontuario || "—"}</TableCell>
                        <TableCell className="text-sm">{c.mes}/{c.ano}</TableCell>
                        <TableCell className="text-sm">{fmtDate(c.data_parto)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(c.data_reintranacao)}</TableCell>
                        <TableCell className="text-sm">{c.medico_prestador || "—"}</TableCell>
                        <TableCell><StatusBadge s={c.status_caso} /></TableCell>
                        <TableCell className="text-sm">{CLASSIF_ISC.find(x=>x.value===c.classificacao_isc)?.label || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{c.comorbidades || "—"}</TableCell>
                        <TableCell>{c.pre_eclampsia ? <CheckCircle2 className="h-4 w-4 text-orange-500" /> : <span className="text-muted-foreground text-xs">Não</span>}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget({ table: "maternidade_casos", id: c.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── ISC PÓS-CESARIANA ──────── */}
        <TabsContent value="isc" className="space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <div className="flex gap-2 text-sm">
              <Badge className="bg-red-100 text-red-700 border-red-200">{casosI.filter(c=>c.status_caso==="confirmado").length} confirmados</Badge>
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">{casosI.filter(c=>c.status_caso==="suspeito").length} suspeitos</Badge>
            </div>
            <Button size="sm" onClick={() => { setCasoForm({ ...emptyCaso }); setShowCasoDialog("isc_cesariana"); }} className="gap-1.5">
              <Plus className="h-4 w-4" /> Registrar Caso
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Paciente</TableHead>
                      <TableHead>Prontuário</TableHead>
                      <TableHead>Período</TableHead>
                      <TableHead>Data Parto</TableHead>
                      <TableHead>Reinternação</TableHead>
                      <TableHead>Médico</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invest. Epidemio.</TableHead>
                      <TableHead>Comorbidades</TableHead>
                      <TableHead>Pré-ecl.</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {casosI.length === 0 && <TableRow><TableCell colSpan={11} className="text-center text-muted-foreground py-8">Nenhum caso registrado.</TableCell></TableRow>}
                    {casosI.map(c => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium text-sm">{c.nome_paciente}</TableCell>
                        <TableCell className="text-sm">{c.prontuario || "—"}</TableCell>
                        <TableCell className="text-sm">{c.mes}/{c.ano}</TableCell>
                        <TableCell className="text-sm">{fmtDate(c.data_parto)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(c.data_reintranacao)}</TableCell>
                        <TableCell className="text-sm">{c.medico_prestador || "—"}</TableCell>
                        <TableCell><StatusBadge s={c.status_caso} /></TableCell>
                        <TableCell className="text-sm">{CLASSIF_ISC.find(x=>x.value===c.classificacao_isc)?.label || "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">{c.comorbidades || "—"}</TableCell>
                        <TableCell>{c.pre_eclampsia ? <CheckCircle2 className="h-4 w-4 text-orange-500" /> : <span className="text-muted-foreground text-xs">Não</span>}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget({ table: "maternidade_casos", id: c.id })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ──────── BUSCA ATIVA ──────── */}
        <TabsContent value="busca" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Busca ativa pós-alta por método de contato</p>
            <Button size="sm" onClick={() => setShowBuscaDialog(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Novo Lançamento
            </Button>
          </div>
          {buscas.map(b => {
            const total = b.contatos_ligacoes + b.contatos_whatsapp + b.contatos_revisao_prontuario;
            const taxa = b.total_cesarianas_periodo > 0 ? (b.retornos_confirmados / b.total_cesarianas_periodo) * 100 : 0;
            const alerta = b.total_cesarianas_periodo > 0 && taxa < 70;
            return (
              <Card key={b.id} className={alerta ? "border-amber-300" : ""}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{b.mes}/{b.ano}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge className={taxa >= 70 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        Indicador: {fmt(taxa)}%
                      </Badge>
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteTarget({ table: "maternidade_busca_ativa", id: b.id })}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total cesarianas</p>
                      <p className="font-semibold text-lg">{b.total_cesarianas_periodo}</p>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Phone className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Ligações</p>
                        <p className="font-semibold">{b.contatos_ligacoes}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <MessageCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">WhatsApp</p>
                        <p className="font-semibold">{b.contatos_whatsapp}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <FileSearch className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Rev. Prontuário</p>
                        <p className="font-semibold">{b.contatos_revisao_prontuario}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 pt-3 border-t text-sm">
                    <div><span className="text-muted-foreground">Total contatos: </span><strong>{total}</strong></div>
                    <div><span className="text-muted-foreground">Casos confirmados: </span><strong>{b.casos_confirmados}</strong></div>
                    <div><span className="text-muted-foreground">Retornos confirmados: </span><strong>{b.retornos_confirmados}</strong></div>
                    <div><span className="text-muted-foreground">Taxa de retorno: </span><strong className={alerta ? "text-red-600" : "text-green-600"}>{fmt(taxa)}%</strong></div>
                  </div>
                  {b.observacoes && <p className="text-xs text-muted-foreground mt-2">{b.observacoes}</p>}
                </CardContent>
              </Card>
            );
          })}
          {buscas.length === 0 && (
            <div className="flex flex-col items-center h-40 justify-center text-muted-foreground gap-2">
              <Phone className="h-8 w-8 opacity-20" />
              <p>Nenhum registro de busca ativa.</p>
            </div>
          )}
        </TabsContent>

        {/* ──────── EDUCAÇÃO PERMANENTE ──────── */}
        <TabsContent value="educacao" className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Atividades de educação permanente da equipe</p>
            <Button size="sm" onClick={() => setShowEducacaoDialog(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova Atividade
            </Button>
          </div>
          {educacoes.map(e => (
            <Card key={e.id}>
              <CardContent className="py-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <BookOpen className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-semibold text-sm">{e.tema}</span>
                      <Badge variant="outline" className="text-xs">{fmtDate(e.data_atividade)}</Badge>
                      {e.participantes > 0 && <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">{e.participantes} participantes</Badge>}
                    </div>
                    {e.facilitador && <p className="text-xs text-muted-foreground">Facilitador: {e.facilitador}</p>}
                    {e.descricao && <p className="text-sm text-muted-foreground">{e.descricao}</p>}
                    {e.observacoes && <p className="text-xs text-muted-foreground italic">{e.observacoes}</p>}
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive shrink-0" onClick={() => setDeleteTarget({ table: "maternidade_educacao", id: e.id })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {educacoes.length === 0 && (
            <div className="flex flex-col items-center h-40 justify-center text-muted-foreground gap-2">
              <BookOpen className="h-8 w-8 opacity-20" />
              <p>Nenhuma atividade registrada.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Partos ── */}
      <Dialog open={showPartoDialog} onOpenChange={setShowPartoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Baby className="h-5 w-5 text-pink-500" /> Lançamento de Partos</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Mês *</Label>
                <Select value={partoForm.mes} onValueChange={v => setPartoForm(f=>({...f,mes:v}))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{MESES.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Ano *</Label>
                <Select value={partoForm.ano} onValueChange={v => setPartoForm(f=>({...f,ano:v}))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{ANOS.map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Profissional responsável</Label>
              <Input value={partoForm.nome_profissional} onChange={e=>setPartoForm(f=>({...f,nome_profissional:e.target.value}))} className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {(["total_partos","partos_normais","cesarianas"] as const).map(k => (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{k==="total_partos"?"Total partos":k==="partos_normais"?"Normais":"Cesarianas"}</Label>
                  <Input type="number" value={(partoForm as any)[k]} onChange={e=>setPartoForm(f=>({...f,[k]:e.target.value}))} className="h-8 text-sm" />
                </div>
              ))}
            </div>
            <div className="space-y-1"><Label className="text-xs">Observações</Label>
              <Textarea value={partoForm.observacoes} onChange={e=>setPartoForm(f=>({...f,observacoes:e.target.value}))} className="text-sm h-16" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowPartoDialog(false)}>Cancelar</Button>
            <Button onClick={saveParto} disabled={savingParto} className="gap-1.5">{savingParto&&<Loader2 className="h-4 w-4 animate-spin"/>} Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Caso (Puerperal ou ISC) ── */}
      <Dialog open={!!showCasoDialog} onOpenChange={o=>{if(!o)setShowCasoDialog(null);}}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {showCasoDialog === "puerperal"
                ? <><Stethoscope className="h-5 w-5 text-red-500" /> Caso de Infecção Puerperal</>
                : <><AlertTriangle className="h-5 w-5 text-orange-500" /> Caso ISC pós-Cesariana</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Mês *</Label>
                <Select value={casoForm.mes} onValueChange={v=>setCasoForm(f=>({...f,mes:v}))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{MESES.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Ano *</Label>
                <Select value={casoForm.ano} onValueChange={v=>setCasoForm(f=>({...f,ano:v}))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{ANOS.map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Dados do Paciente</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Nome do paciente *</Label>
                <Input value={casoForm.nome_paciente} onChange={e=>setCasoForm(f=>({...f,nome_paciente:e.target.value}))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1"><Label className="text-xs">Prontuário</Label>
                <Input value={casoForm.prontuario} onChange={e=>setCasoForm(f=>({...f,prontuario:e.target.value}))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Data do parto</Label>
                <Input type="date" value={casoForm.data_parto} onChange={e=>setCasoForm(f=>({...f,data_parto:e.target.value}))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1"><Label className="text-xs">Data da reinternação</Label>
                <Input type="date" value={casoForm.data_reintranacao} onChange={e=>setCasoForm(f=>({...f,data_reintranacao:e.target.value}))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Médico prestador</Label>
              <Input value={casoForm.medico_prestador} onChange={e=>setCasoForm(f=>({...f,medico_prestador:e.target.value}))} className="h-8 text-sm" />
            </div>

            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide pt-1">Classificação / Investigação Epidemiológica</p>
            <div className="space-y-1"><Label className="text-xs">Status do caso</Label>
              <Select value={casoForm.status_caso} onValueChange={v=>setCasoForm(f=>({...f,status_caso:v as any}))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="suspeito">Suspeito</SelectItem>
                  <SelectItem value="confirmado">Confirmado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Classificação da ISC</Label>
              <Select value={casoForm.classificacao_isc} onValueChange={v=>setCasoForm(f=>({...f,classificacao_isc:v}))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{CLASSIF_ISC.map(c=><SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide pt-1">Comorbidades</p>
            <div className="grid grid-cols-2 gap-2">
              {COMORBIDADES_OPT.map(com => (
                <div key={com} className="flex items-center gap-2">
                  <Checkbox id={com} checked={casoForm.comorbidades.includes(com)}
                    onCheckedChange={checked => setCasoForm(f => ({
                      ...f,
                      comorbidades: checked ? [...f.comorbidades, com] : f.comorbidades.filter(x => x !== com),
                    }))} />
                  <Label htmlFor={com} className="text-sm font-normal cursor-pointer">{com}</Label>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Checkbox id="pre_eclampsia" checked={casoForm.pre_eclampsia} onCheckedChange={v=>setCasoForm(f=>({...f,pre_eclampsia:!!v}))} />
              <Label htmlFor="pre_eclampsia" className="text-sm font-normal cursor-pointer text-orange-700 font-semibold">Pré-eclâmpsia</Label>
            </div>

            <div className="space-y-1"><Label className="text-xs">Observações</Label>
              <Textarea value={casoForm.observacoes} onChange={e=>setCasoForm(f=>({...f,observacoes:e.target.value}))} className="text-sm h-16" placeholder="Evolução clínica, condutas, desfecho..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowCasoDialog(null)}>Cancelar</Button>
            <Button onClick={saveCaso} disabled={savingCaso} className="gap-1.5">{savingCaso&&<Loader2 className="h-4 w-4 animate-spin"/>} Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Busca Ativa ── */}
      <Dialog open={showBuscaDialog} onOpenChange={setShowBuscaDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Phone className="h-5 w-5 text-primary" /> Busca Ativa pós-Alta</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Mês *</Label>
                <Select value={buscaForm.mes} onValueChange={v=>setBuscaForm(f=>({...f,mes:v}))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{MESES.map(m=><SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Ano *</Label>
                <Select value={buscaForm.ano} onValueChange={v=>setBuscaForm(f=>({...f,ano:v}))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{ANOS.map(a=><SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Total de cesarianas no período</Label>
              <Input type="number" value={buscaForm.total_cesarianas_periodo} onChange={e=>setBuscaForm(f=>({...f,total_cesarianas_periodo:e.target.value}))} className="h-8 text-sm" />
            </div>
            <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wide">Contatos realizados por método</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3 text-blue-500" /> Ligações</Label>
                <Input type="number" value={buscaForm.contatos_ligacoes} onChange={e=>setBuscaForm(f=>({...f,contatos_ligacoes:e.target.value}))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1"><Label className="text-xs flex items-center gap-1"><MessageCircle className="h-3 w-3 text-green-500" /> WhatsApp</Label>
                <Input type="number" value={buscaForm.contatos_whatsapp} onChange={e=>setBuscaForm(f=>({...f,contatos_whatsapp:e.target.value}))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1"><Label className="text-xs flex items-center gap-1"><FileSearch className="h-3 w-3 text-purple-500" /> Rev. Prontuário</Label>
                <Input type="number" value={buscaForm.contatos_revisao_prontuario} onChange={e=>setBuscaForm(f=>({...f,contatos_revisao_prontuario:e.target.value}))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Casos confirmados</Label>
                <Input type="number" value={buscaForm.casos_confirmados} onChange={e=>setBuscaForm(f=>({...f,casos_confirmados:e.target.value}))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1"><Label className="text-xs">Retornos confirmados</Label>
                <Input type="number" value={buscaForm.retornos_confirmados} onChange={e=>setBuscaForm(f=>({...f,retornos_confirmados:e.target.value}))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Observações</Label>
              <Textarea value={buscaForm.observacoes} onChange={e=>setBuscaForm(f=>({...f,observacoes:e.target.value}))} className="text-sm h-16" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowBuscaDialog(false)}>Cancelar</Button>
            <Button onClick={saveBusca} disabled={savingBusca} className="gap-1.5">{savingBusca&&<Loader2 className="h-4 w-4 animate-spin"/>} Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Educação ── */}
      <Dialog open={showEducacaoDialog} onOpenChange={setShowEducacaoDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Nova Atividade de Educação Permanente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label className="text-xs">Tema *</Label>
              <Input value={educacaoForm.tema} onChange={e=>setEducacaoForm(f=>({...f,tema:e.target.value}))} className="h-8 text-sm" placeholder="Ex: Prevenção de infecção puerperal" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Data da atividade *</Label>
                <Input type="date" value={educacaoForm.data_atividade} onChange={e=>setEducacaoForm(f=>({...f,data_atividade:e.target.value}))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1"><Label className="text-xs">Participantes</Label>
                <Input type="number" value={educacaoForm.participantes} onChange={e=>setEducacaoForm(f=>({...f,participantes:e.target.value}))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Facilitador / Instrutor</Label>
              <Input value={educacaoForm.facilitador} onChange={e=>setEducacaoForm(f=>({...f,facilitador:e.target.value}))} className="h-8 text-sm" />
            </div>
            <div className="space-y-1"><Label className="text-xs">Descrição</Label>
              <Textarea value={educacaoForm.descricao} onChange={e=>setEducacaoForm(f=>({...f,descricao:e.target.value}))} className="text-sm h-16" placeholder="Conteúdo abordado, metodologia..." />
            </div>
            <div className="space-y-1"><Label className="text-xs">Observações</Label>
              <Textarea value={educacaoForm.observacoes} onChange={e=>setEducacaoForm(f=>({...f,observacoes:e.target.value}))} className="text-sm h-12" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setShowEducacaoDialog(false)}>Cancelar</Button>
            <Button onClick={saveEducacao} disabled={savingEdu} className="gap-1.5">{savingEdu&&<Loader2 className="h-4 w-4 animate-spin"/>} Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o=>{if(!o)setDeleteTarget(null);}}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
