import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Baby, Loader2, Plus, Trash2, AlertTriangle, CheckCircle2,
  BarChart3, FileText, Download, Activity, ClipboardList, History,
  TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MatRecord {
  id: string;
  hospital_id: string;
  user_id: string;
  mes: string;
  ano: string;
  nome_profissional: string;
  data_registro: string;
  total_partos: number;
  partos_normais: number;
  cesarianas: number;
  infeccao_puerperal_confirmada: number;
  infeccao_puerperal_suspeita: number;
  isc_pos_cesariana: number;
  busca_ativa_contatos: number;
  busca_ativa_retornos: number;
  investigacoes_epidemio: number;
  leitos_obstetricos: number;
  leitos_ocupados: number;
  paciente_dias: number;
  dias_permanencia_total: number;
  educacoes_realizadas: number;
  profissionais_capacitados: number;
  observacoes: string;
  created_at: string;
}

interface ActionPlan {
  id: string;
  hospital_id: string;
  indicador: string;
  what: string;
  why: string;
  who: string;
  when_date: string;
  how: string;
  status: "planejado" | "em_andamento" | "concluido";
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const ANOS = ["2024","2025","2026","2027"];

const THRESHOLDS = {
  infeccao_puerperal: 1.0,
  isc_cesariana: 2.0,
  ocupacao_min: 60,
  ocupacao_max: 95,
  tmp_max: 4,
  cobertura_busca_min: 70,
};

const emptyForm = {
  mes: "", ano: new Date().getFullYear().toString(), nome_profissional: "",
  data_registro: new Date().toISOString().slice(0,10),
  total_partos: "", partos_normais: "", cesarianas: "",
  infeccao_puerperal_confirmada: "", infeccao_puerperal_suspeita: "",
  isc_pos_cesariana: "",
  busca_ativa_contatos: "", busca_ativa_retornos: "",
  investigacoes_epidemio: "",
  leitos_obstetricos: "", leitos_ocupados: "", paciente_dias: "",
  dias_permanencia_total: "",
  educacoes_realizadas: "", profissionais_capacitados: "",
  observacoes: "",
};

const emptyAction = { indicador: "", what: "", why: "", who: "", when_date: "", how: "" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const n = (v: number | string) => Number(v) || 0;

function calcIndicators(r: MatRecord) {
  const txPuerperal = r.total_partos > 0 ? (r.infeccao_puerperal_confirmada / r.total_partos) * 100 : 0;
  const txISC = r.cesarianas > 0 ? (r.isc_pos_cesariana / r.cesarianas) * 100 : 0;
  const txOcupacao = r.leitos_obstetricos > 0 ? (r.leitos_ocupados / r.leitos_obstetricos) * 100 : 0;
  const tmp = r.total_partos > 0 ? r.dias_permanencia_total / r.total_partos : 0;
  const cobertura = r.cesarianas > 0 ? (r.busca_ativa_retornos / r.cesarianas) * 100 : 0;
  return { txPuerperal, txISC, txOcupacao, tmp, cobertura };
}

function getAlerts(r: MatRecord) {
  const { txPuerperal, txISC, txOcupacao, tmp, cobertura } = calcIndicators(r);
  const alerts: { label: string; value: string; severity: "critical" | "warning" }[] = [];
  if (txPuerperal > THRESHOLDS.infeccao_puerperal)
    alerts.push({ label: "Infecção puerperal acima do limite", value: `${txPuerperal.toFixed(2)}%`, severity: "critical" });
  if (txISC > THRESHOLDS.isc_cesariana)
    alerts.push({ label: "ISC pós-cesariana acima do limite", value: `${txISC.toFixed(2)}%`, severity: "critical" });
  if (txOcupacao < THRESHOLDS.ocupacao_min)
    alerts.push({ label: "Ocupação obstétrica baixa", value: `${txOcupacao.toFixed(1)}%`, severity: "warning" });
  if (txOcupacao > THRESHOLDS.ocupacao_max)
    alerts.push({ label: "Superlotação obstétrica", value: `${txOcupacao.toFixed(1)}%`, severity: "critical" });
  if (tmp > THRESHOLDS.tmp_max)
    alerts.push({ label: "Tempo médio de permanência elevado", value: `${tmp.toFixed(1)} dias`, severity: "warning" });
  if (r.cesarianas > 0 && cobertura < THRESHOLDS.cobertura_busca_min)
    alerts.push({ label: "Cobertura de busca ativa insuficiente", value: `${cobertura.toFixed(1)}%`, severity: "warning" });
  return alerts;
}

function fmt(v: number, dec = 2) { return v.toFixed(dec); }

// ─── Component ────────────────────────────────────────────────────────────────

export default function Maternidade() {
  const { hospitalId, hospitalName, loading: ctxLoading } = useHospitalContext();

  const [records, setRecords] = useState<MatRecord[]>([]);
  const [actions, setActions] = useState<ActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dbMissing, setDbMissing] = useState(false);

  const [form, setForm] = useState({ ...emptyForm });
  const [showDialog, setShowDialog] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [actionForm, setActionForm] = useState({ ...emptyAction });
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [savingAction, setSavingAction] = useState(false);

  const db = (supabase as any);

  // ── Load data ──────────────────────────────────────────────────────────────

  const load = async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const { data, error } = await db
        .from("maternidade_records")
        .select("*")
        .eq("hospital_id", hospitalId)
        .order("ano", { ascending: false })
        .order("mes", { ascending: false });

      if (error) {
        if (error.code === "42P01") { setDbMissing(true); setLoading(false); return; }
        throw error;
      }
      setRecords(data || []);

      const { data: acts } = await db
        .from("maternidade_action_plans")
        .select("*")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false });
      setActions(acts || []);
    } catch {
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!ctxLoading && hospitalId) load(); }, [hospitalId, ctxLoading]);

  // ── Save record ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.mes || !form.ano || !form.nome_profissional) {
      toast.error("Preencha mês, ano e nome do profissional.");
      return;
    }
    if (!hospitalId) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        hospital_id: hospitalId,
        user_id: user!.id,
        mes: form.mes,
        ano: form.ano,
        nome_profissional: form.nome_profissional,
        data_registro: form.data_registro,
        total_partos: n(form.total_partos),
        partos_normais: n(form.partos_normais),
        cesarianas: n(form.cesarianas),
        infeccao_puerperal_confirmada: n(form.infeccao_puerperal_confirmada),
        infeccao_puerperal_suspeita: n(form.infeccao_puerperal_suspeita),
        isc_pos_cesariana: n(form.isc_pos_cesariana),
        busca_ativa_contatos: n(form.busca_ativa_contatos),
        busca_ativa_retornos: n(form.busca_ativa_retornos),
        investigacoes_epidemio: n(form.investigacoes_epidemio),
        leitos_obstetricos: n(form.leitos_obstetricos),
        leitos_ocupados: n(form.leitos_ocupados),
        paciente_dias: n(form.paciente_dias),
        dias_permanencia_total: n(form.dias_permanencia_total),
        educacoes_realizadas: n(form.educacoes_realizadas),
        profissionais_capacitados: n(form.profissionais_capacitados),
        observacoes: form.observacoes,
      };
      const { error } = await db.from("maternidade_records").insert(payload);
      if (error) throw error;
      toast.success("Lançamento salvo!");
      setShowDialog(false);
      setForm({ ...emptyForm });
      await load();
    } catch {
      toast.error("Erro ao salvar lançamento.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await db.from("maternidade_records").delete().eq("id", deleteId);
    if (error) { toast.error("Erro ao excluir."); }
    else { toast.success("Registro excluído."); await load(); }
    setDeleteId(null);
  };

  // ── Save action plan ───────────────────────────────────────────────────────

  const handleSaveAction = async () => {
    if (!actionForm.what || !actionForm.who || !actionForm.when_date) {
      toast.error("Preencha O quê, Responsável e Prazo.");
      return;
    }
    if (!hospitalId) return;
    setSavingAction(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await db.from("maternidade_action_plans").insert({
        hospital_id: hospitalId,
        user_id: user!.id,
        ...actionForm,
        status: "planejado",
      });
      if (error) throw error;
      toast.success("Plano de ação criado!");
      setShowActionDialog(false);
      setActionForm({ ...emptyAction });
      await load();
    } catch {
      toast.error("Erro ao salvar plano de ação.");
    } finally {
      setSavingAction(false);
    }
  };

  const handleDeleteAction = async (id: string) => {
    await db.from("maternidade_action_plans").delete().eq("id", id);
    await load();
  };

  const handleUpdateActionStatus = async (id: string, status: string) => {
    await db.from("maternidade_action_plans").update({ status }).eq("id", id);
    await load();
  };

  // ── Derived data ───────────────────────────────────────────────────────────

  const latest = records[0] ?? null;
  const latestAlerts = latest ? getAlerts(latest) : [];

  const chartData = useMemo(() => {
    return [...records].reverse().slice(-12).map(r => {
      const { txPuerperal, txISC, txOcupacao, tmp } = calcIndicators(r);
      return {
        name: `${r.mes.slice(0,3)}/${r.ano.slice(2)}`,
        "Inf. Puerperal %": +fmt(txPuerperal),
        "ISC Cesariana %": +fmt(txISC),
        "Ocupação %": +fmt(txOcupacao),
        "TMP (dias)": +fmt(tmp, 1),
        "Partos": r.total_partos,
      };
    });
  }, [records]);

  // ── PDF export ─────────────────────────────────────────────────────────────

  const exportPdf = () => {
    if (!records.length) { toast.error("Sem dados para exportar."); return; }
    const doc = new jsPDF({ orientation: "landscape" });
    const today = new Date().toLocaleDateString("pt-BR");

    doc.setFillColor(30, 80, 140);
    doc.rect(0, 0, 297, 18, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text("MÓDULO MATERNIDADE — IRASControl", 14, 12);
    doc.setFontSize(9);
    doc.text(`${hospitalName}   |   Emitido em: ${today}`, 200, 12, { align: "right" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text("Resumo de Indicadores Obstétricos", 14, 26);

    let y = 34;
    const cols = [14, 42, 65, 88, 110, 132, 156, 180, 204, 228];
    const headers = ["Mês/Ano","Partos","Ces.","Inf. Puerp.","ISC Ces.","Tx Inf.%","Tx ISC%","Ocupação%","TMP dias","Busca%"];

    doc.setFillColor(30, 80, 140);
    doc.setTextColor(255,255,255);
    doc.setFontSize(8);
    doc.rect(14, y-5, 269, 7, "F");
    headers.forEach((h,i) => doc.text(h, cols[i], y));
    y += 5; doc.setTextColor(0,0,0);

    records.forEach((r, idx) => {
      if (y > 185) { doc.addPage(); y = 20; }
      const { txPuerperal, txISC, txOcupacao, tmp, cobertura } = calcIndicators(r);
      if (idx % 2 === 0) { doc.setFillColor(245,247,250); doc.rect(14, y-4, 269, 6, "F"); }
      const row = [
        `${r.mes.slice(0,3)}/${r.ano}`, String(r.total_partos), String(r.cesarianas),
        String(r.infeccao_puerperal_confirmada), String(r.isc_pos_cesariana),
        fmt(txPuerperal), fmt(txISC), fmt(txOcupacao,1), fmt(tmp,1), fmt(cobertura,1),
      ];
      row.forEach((v, i) => doc.text(v, cols[i], y));
      y += 6;
    });

    if (latestAlerts.length) {
      y += 6;
      doc.setFontSize(10);
      doc.text("Alertas ativos (último período):", 14, y); y += 6;
      doc.setFontSize(8);
      latestAlerts.forEach(a => {
        doc.setTextColor(a.severity === "critical" ? 180 : 150, a.severity === "critical" ? 20 : 100, 0);
        doc.text(`• ${a.label}: ${a.value}`, 18, y); y += 5;
      });
      doc.setTextColor(0,0,0);
    }

    doc.save(`maternidade_${hospitalName.replace(/\s/g,"_")}_${today.replace(/\//g,"-")}.pdf`);
    toast.success("PDF gerado!");
  };

  // ── Field helper ───────────────────────────────────────────────────────────

  const F = (key: keyof typeof form, label: string, type = "number") => (
    <div className="space-y-1">
      <Label htmlFor={key} className="text-xs">{label}</Label>
      <Input
        id={key} type={type} value={(form as any)[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className="h-8 text-sm"
      />
    </div>
  );

  // ── Loading / missing DB ───────────────────────────────────────────────────

  if (loading || ctxLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (dbMissing) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-16 text-center space-y-4">
        <Baby className="h-12 w-12 text-primary mx-auto" />
        <h2 className="text-xl font-bold">Módulo Maternidade</h2>
        <p className="text-muted-foreground">
          A tabela <code>maternidade_records</code> ainda não foi criada no banco de dados.
          Execute a migration <code>supabase/migrations/20260630000001_modulo_maternidade.sql</code>
          no painel do Supabase para ativar este módulo.
        </p>
        <Button onClick={load} variant="outline">Tentar novamente</Button>
      </div>
    );
  }

  // ── KPI card ───────────────────────────────────────────────────────────────

  const KpiCard = ({ title, value, unit, alert, trend }: {
    title: string; value: string; unit: string;
    alert?: boolean; trend?: "up" | "down" | "neutral";
  }) => (
    <Card className={alert ? "border-red-400 bg-red-50/40" : ""}>
      <CardContent className="pt-4 pb-3 px-4">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{title}</p>
        <div className="flex items-end gap-1 mt-1">
          <span className={`text-2xl font-bold ${alert ? "text-red-600" : "text-foreground"}`}>{value}</span>
          <span className="text-xs text-muted-foreground mb-1">{unit}</span>
          {trend === "up" && <TrendingUp className="h-4 w-4 text-red-500 mb-1" />}
          {trend === "down" && <TrendingDown className="h-4 w-4 text-green-500 mb-1" />}
          {trend === "neutral" && <Minus className="h-4 w-4 text-muted-foreground mb-1" />}
        </div>
        {alert && <p className="text-xs text-red-600 mt-0.5">Acima do limite</p>}
      </CardContent>
    </Card>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Baby className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Módulo Maternidade</h1>
            <p className="text-sm text-muted-foreground">Monitoramento obstétrico e controle de infecção puerperal</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportPdf} className="gap-1.5">
            <Download className="h-4 w-4" /> Relatório PDF
          </Button>
          <Button size="sm" onClick={() => setShowDialog(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Novo Lançamento
          </Button>
        </div>
      </div>

      {/* Alertas ativos */}
      {latestAlerts.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-1.5">
          <p className="text-sm font-semibold text-amber-800 flex items-center gap-1.5">
            <AlertTriangle className="h-4 w-4" /> Alertas do último período ({latest?.mes}/{latest?.ano})
          </p>
          <div className="flex flex-wrap gap-2">
            {latestAlerts.map((a, i) => (
              <Badge key={i} className={a.severity === "critical"
                ? "bg-red-100 text-red-700 border border-red-300"
                : "bg-amber-100 text-amber-700 border border-amber-300"}>
                {a.label}: {a.value}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <Tabs defaultValue="dashboard">
        <TabsList className="mb-2">
          <TabsTrigger value="dashboard" className="gap-1.5"><Activity className="h-4 w-4" /> Dashboard</TabsTrigger>
          <TabsTrigger value="historico" className="gap-1.5"><History className="h-4 w-4" /> Histórico</TabsTrigger>
          <TabsTrigger value="plano" className="gap-1.5"><ClipboardList className="h-4 w-4" /> Plano de Ação</TabsTrigger>
        </TabsList>

        {/* ── Dashboard ── */}
        <TabsContent value="dashboard" className="space-y-4">
          {!latest ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
              <Baby className="h-10 w-10 opacity-30" />
              <p>Nenhum dado lançado. Clique em "Novo Lançamento" para começar.</p>
            </div>
          ) : (() => {
            const { txPuerperal, txISC, txOcupacao, tmp, cobertura } = calcIndicators(latest);
            return (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">Último período: <strong>{latest.mes}/{latest.ano}</strong> — {latest.total_partos} partos</p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  <KpiCard title="Infecção Puerperal" value={fmt(txPuerperal)} unit="%" alert={txPuerperal > THRESHOLDS.infeccao_puerperal} />
                  <KpiCard title="ISC pós-Cesariana" value={fmt(txISC)} unit="%" alert={txISC > THRESHOLDS.isc_cesariana} />
                  <KpiCard title="Taxa de Ocupação" value={fmt(txOcupacao, 1)} unit="%" alert={txOcupacao > THRESHOLDS.ocupacao_max || txOcupacao < THRESHOLDS.ocupacao_min} />
                  <KpiCard title="Tempo Médio Perm." value={fmt(tmp, 1)} unit="dias" alert={tmp > THRESHOLDS.tmp_max} />
                  <KpiCard title="Cobertura Busca Ativa" value={fmt(cobertura, 1)} unit="%" alert={latest.cesarianas > 0 && cobertura < THRESHOLDS.cobertura_busca_min} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                        <TrendingUp className="h-4 w-4 text-primary" /> Infecção Puerperal e ISC (%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pb-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <ReferenceLine y={THRESHOLDS.infeccao_puerperal} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Limite 1%", fontSize: 9, fill: "#ef4444" }} />
                          <ReferenceLine y={THRESHOLDS.isc_cesariana} stroke="#f97316" strokeDasharray="4 4" label={{ value: "Limite ISC 2%", fontSize: 9, fill: "#f97316" }} />
                          <Line type="monotone" dataKey="Inf. Puerperal %" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="ISC Cesariana %" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                      <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                        <BarChart3 className="h-4 w-4 text-primary" /> Volume de Partos por Período
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 pb-4">
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Partos" fill="#3b82f6" radius={[3,3,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-primary" /> Taxa de Ocupação e TMP
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-4">
                    <ResponsiveContainer width="100%" height={180}>
                      <LineChart data={chartData} margin={{ top: 4, right: 16, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <ReferenceLine y={THRESHOLDS.ocupacao_max} stroke="#f97316" strokeDasharray="4 4" />
                        <ReferenceLine y={THRESHOLDS.ocupacao_min} stroke="#3b82f6" strokeDasharray="4 4" />
                        <Line type="monotone" dataKey="Ocupação %" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="TMP (dias)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </TabsContent>

        {/* ── Histórico ── */}
        <TabsContent value="historico">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Período</TableHead>
                      <TableHead>Partos</TableHead>
                      <TableHead>Ces.</TableHead>
                      <TableHead>Inf. Puerp.</TableHead>
                      <TableHead>ISC</TableHead>
                      <TableHead>Tx Inf.%</TableHead>
                      <TableHead>Tx ISC%</TableHead>
                      <TableHead>Ocupação%</TableHead>
                      <TableHead>TMP</TableHead>
                      <TableHead>Busca%</TableHead>
                      <TableHead>Alertas</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                          Nenhum registro encontrado.
                        </TableCell>
                      </TableRow>
                    )}
                    {records.map(r => {
                      const { txPuerperal, txISC, txOcupacao, tmp, cobertura } = calcIndicators(r);
                      const alerts = getAlerts(r);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.mes.slice(0,3)}/{r.ano}</TableCell>
                          <TableCell>{r.total_partos}</TableCell>
                          <TableCell>{r.cesarianas}</TableCell>
                          <TableCell>{r.infeccao_puerperal_confirmada}</TableCell>
                          <TableCell>{r.isc_pos_cesariana}</TableCell>
                          <TableCell>
                            <span className={txPuerperal > THRESHOLDS.infeccao_puerperal ? "text-red-600 font-semibold" : ""}>
                              {fmt(txPuerperal)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={txISC > THRESHOLDS.isc_cesariana ? "text-red-600 font-semibold" : ""}>
                              {fmt(txISC)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={txOcupacao > THRESHOLDS.ocupacao_max || txOcupacao < THRESHOLDS.ocupacao_min ? "text-amber-600 font-semibold" : ""}>
                              {fmt(txOcupacao,1)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={tmp > THRESHOLDS.tmp_max ? "text-amber-600 font-semibold" : ""}>
                              {fmt(tmp,1)}d
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={r.cesarianas > 0 && cobertura < THRESHOLDS.cobertura_busca_min ? "text-amber-600 font-semibold" : ""}>
                              {fmt(cobertura,1)}%
                            </span>
                          </TableCell>
                          <TableCell>
                            {alerts.length === 0
                              ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                              : <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">{alerts.length} alerta{alerts.length > 1 ? "s" : ""}</Badge>
                            }
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => setDeleteId(r.id)} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Plano de Ação ── */}
        <TabsContent value="plano" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">Planos de ação para indicadores críticos da maternidade</p>
            <Button size="sm" onClick={() => setShowActionDialog(true)} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova Ação
            </Button>
          </div>

          {actions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <ClipboardList className="h-8 w-8 opacity-30" />
              <p>Nenhum plano de ação cadastrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {actions.map(a => (
                <Card key={a.id} className="border-l-4" style={{ borderLeftColor: a.status === "concluido" ? "#22c55e" : a.status === "em_andamento" ? "#f59e0b" : "#3b82f6" }}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{a.what}</span>
                          <Badge className="text-xs">{a.indicador}</Badge>
                          <Badge className={`text-xs ${a.status === "concluido" ? "bg-green-100 text-green-700" : a.status === "em_andamento" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                            {a.status === "concluido" ? "Concluído" : a.status === "em_andamento" ? "Em andamento" : "Planejado"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Por quê: {a.why}</p>
                        <p className="text-xs text-muted-foreground">Responsável: {a.who} | Prazo: {a.when_date ? new Date(a.when_date).toLocaleDateString("pt-BR") : "—"}</p>
                        <p className="text-xs text-muted-foreground">Como: {a.how}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {a.status !== "concluido" && (
                          <Button variant="outline" size="sm" className="h-7 text-xs px-2"
                            onClick={() => handleUpdateActionStatus(a.id, a.status === "planejado" ? "em_andamento" : "concluido")}>
                            {a.status === "planejado" ? "Iniciar" : "Concluir"}
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteAction(a.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog: Novo Lançamento ── */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Baby className="h-5 w-5 text-primary" /> Novo Lançamento Mensal
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mês *</Label>
                <Select value={form.mes} onValueChange={v => setForm(f => ({ ...f, mes: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ano *</Label>
                <Select value={form.ano} onValueChange={v => setForm(f => ({ ...f, ano: v }))}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{ANOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data do registro</Label>
                <Input type="date" value={form.data_registro} onChange={e => setForm(f => ({ ...f, data_registro: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Profissional responsável *</Label>
              <Input value={form.nome_profissional} onChange={e => setForm(f => ({ ...f, nome_profissional: e.target.value }))} className="h-8 text-sm" placeholder="Nome completo" />
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Partos</p>
            <div className="grid grid-cols-3 gap-3">
              {F("total_partos","Total de partos")}
              {F("partos_normais","Partos normais")}
              {F("cesarianas","Cesarianas")}
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Infecção Puerperal</p>
            <div className="grid grid-cols-2 gap-3">
              {F("infeccao_puerperal_confirmada","Casos confirmados")}
              {F("infeccao_puerperal_suspeita","Casos suspeitos")}
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">ISC pós-Cesariana</p>
            <div className="grid grid-cols-2 gap-3">
              {F("isc_pos_cesariana","ISC confirmada")}
              {F("investigacoes_epidemio","Investigações epidemio.")}
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Busca Ativa pós-Alta</p>
            <div className="grid grid-cols-2 gap-3">
              {F("busca_ativa_contatos","Contatos realizados")}
              {F("busca_ativa_retornos","Retornos confirmados")}
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Ocupação Obstétrica</p>
            <div className="grid grid-cols-3 gap-3">
              {F("leitos_obstetricos","Leitos disponíveis")}
              {F("leitos_ocupados","Leitos ocupados")}
              {F("paciente_dias","Paciente-dias")}
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Permanência</p>
            <div className="grid grid-cols-2 gap-3">
              {F("dias_permanencia_total","Total de dias de internação")}
            </div>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">Educação Permanente</p>
            <div className="grid grid-cols-2 gap-3">
              {F("educacoes_realizadas","Atividades realizadas")}
              {F("profissionais_capacitados","Profissionais capacitados")}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} className="text-sm h-20" placeholder="Observações gerais, ocorrências relevantes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Plano de Ação ── */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Novo Plano de Ação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Indicador relacionado</Label>
              <Select value={actionForm.indicador} onValueChange={v => setActionForm(f => ({ ...f, indicador: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Infecção Puerperal">Infecção Puerperal</SelectItem>
                  <SelectItem value="ISC pós-Cesariana">ISC pós-Cesariana</SelectItem>
                  <SelectItem value="Taxa de Ocupação">Taxa de Ocupação</SelectItem>
                  <SelectItem value="Tempo Médio de Permanência">Tempo Médio de Permanência</SelectItem>
                  <SelectItem value="Busca Ativa pós-Alta">Busca Ativa pós-Alta</SelectItem>
                  <SelectItem value="Educação Permanente">Educação Permanente</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">O quê? *</Label>
              <Input value={actionForm.what} onChange={e => setActionForm(f => ({ ...f, what: e.target.value }))} className="h-8 text-sm" placeholder="Ação a ser realizada" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Por quê?</Label>
              <Input value={actionForm.why} onChange={e => setActionForm(f => ({ ...f, why: e.target.value }))} className="h-8 text-sm" placeholder="Justificativa" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Responsável *</Label>
                <Input value={actionForm.who} onChange={e => setActionForm(f => ({ ...f, who: e.target.value }))} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Prazo *</Label>
                <Input type="date" value={actionForm.when_date} onChange={e => setActionForm(f => ({ ...f, when_date: e.target.value }))} className="h-8 text-sm" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Como?</Label>
              <Input value={actionForm.how} onChange={e => setActionForm(f => ({ ...f, how: e.target.value }))} className="h-8 text-sm" placeholder="Método / estratégia" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveAction} disabled={savingAction} className="gap-1.5">
              {savingAction && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Confirm delete ── */}
      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
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
