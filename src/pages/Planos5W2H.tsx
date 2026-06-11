import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ClipboardList, Plus, Loader2, Trash2, Clock, CheckCircle2,
  Calendar, MapPin, User, Tag, Activity, AlertTriangle,
  BarChart3, FileText, Download, ListChecks, Flame,
} from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { jsPDF } from "jspdf";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionStatus = "planejado" | "em_andamento" | "concluido";

interface Action {
  id: string;
  user_id: string;
  hospital_id: string;
  what: string;
  why: string;
  where_sector: string;
  who: string;
  when_date: string;
  how: string;
  how_much: string | null;
  status: ActionStatus;
  infection_type: string;
  created_at: string;
  updated_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SETORES = [
  "UTI Adulto", "UTI Neonatal", "UTI Pediátrica", "Centro Cirúrgico",
  "Enfermaria", "Pronto Socorro", "Hemodiálise", "Maternidade",
] as const;

const INFECTION_TYPES = ["ICSC-CVC", "PAV", "ITU-CA", "ISC", "Outros"] as const;

const STATUS_LABEL: Record<ActionStatus, string> = {
  planejado: "Planejado",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
};

const STATUS_CONFIG: Record<ActionStatus, { label: string; color: string; border: string; badge: string; icon: React.ReactNode }> = {
  planejado: {
    label: "Planejado",
    color: "bg-blue-50/50 border-blue-200",
    border: "border-l-blue-500",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    icon: <Clock className="h-4 w-4 text-blue-600" />,
  },
  em_andamento: {
    label: "Em Andamento",
    color: "bg-amber-50/50 border-amber-200",
    border: "border-l-amber-500",
    badge: "bg-amber-100 text-amber-700 border-amber-200",
    icon: <Clock className="h-4 w-4 text-amber-600" />,
  },
  concluido: {
    label: "Concluído",
    color: "bg-green-50/50 border-green-200",
    border: "border-l-green-500",
    badge: "bg-green-100 text-green-700 border-green-200",
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  },
};

const COLUMNS: ActionStatus[] = ["planejado", "em_andamento", "concluido"];
const NEXT_STATUS: Record<ActionStatus, ActionStatus | null> = { planejado: "em_andamento", em_andamento: "concluido", concluido: null };
const PREV_STATUS: Record<ActionStatus, ActionStatus | null> = { planejado: null, em_andamento: "planejado", concluido: "em_andamento" };
const CHART_COLORS = ["#1D4ED8", "#D97706", "#059669", "#7C3AED", "#DC2626", "#0891B2"];
const ALL = "__all__";
const emptyForm = { what: "", why: "", where: "", who: "", when: "", how: "", howMuch: "", infectionType: "" };

const fmt = (d: string) => {
  if (!d) return "—";
  const [y, m, dd] = d.split("-");
  return `${dd}/${m}/${y}`;
};

// ─── Action Card ──────────────────────────────────────────────────────────────

function ActionCard({ action, onDelete, onMoveNext, onMovePrev }: {
  action: Action;
  onDelete: (id: string) => void;
  onMoveNext: (id: string, s: ActionStatus) => void;
  onMovePrev: (id: string, s: ActionStatus) => void;
}) {
  const cfg = STATUS_CONFIG[action.status];
  const next = NEXT_STATUS[action.status];
  const prev = PREV_STATUS[action.status];
  const today = new Date().toISOString().slice(0, 10);
  const overdue = action.status !== "concluido" && action.when_date && action.when_date < today;

  return (
    <div className={`bg-white rounded-lg border border-l-4 shadow-sm p-3 space-y-2 ${cfg.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {overdue && (
            <Badge className="text-[10px] py-0 px-1.5 bg-red-100 text-red-700 border border-red-200 mb-1">
              Vencida
            </Badge>
          )}
          <p className="text-sm font-semibold leading-snug text-foreground">{action.what}</p>
        </div>
        <button onClick={() => onDelete(action.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" /><span>{action.where_sector}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" /><span>{action.who}</span>
        </div>
        {action.when_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3 shrink-0" /><span>{fmt(action.when_date)}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Tag className="h-3 w-3 shrink-0" /><span>{action.infection_type}</span>
        </div>
      </div>
      <div className="flex items-center justify-between gap-1 pt-0.5">
        <Badge className={`text-[10px] py-0 px-1.5 border ${cfg.badge}`}>{cfg.label}</Badge>
        <div className="flex gap-1">
          {prev && (
            <Button size="sm" variant="outline" className="h-6 text-[10px] px-1.5" onClick={() => onMovePrev(action.id, prev)}>
              ← {STATUS_CONFIG[prev].label}
            </Button>
          )}
          {next && (
            <Button size="sm" className="h-6 text-[10px] px-1.5 bg-primary/90 hover:bg-primary" onClick={() => onMoveNext(action.id, next)}>
              {STATUS_CONFIG[next].label} →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ status, actions, onDelete, onMoveNext, onMovePrev }: {
  status: ActionStatus;
  actions: Action[];
  onDelete: (id: string) => void;
  onMoveNext: (id: string, s: ActionStatus) => void;
  onMovePrev: (id: string, s: ActionStatus) => void;
}) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className={`rounded-xl border-2 ${cfg.color} p-3 space-y-3 min-h-[300px]`}>
      <div className="flex items-center gap-2">
        {cfg.icon}
        <h3 className="font-semibold text-sm">{cfg.label}</h3>
        <span className="ml-auto text-xs font-medium bg-white border rounded-full px-2 py-0.5">{actions.length}</span>
      </div>
      <div className="space-y-2">
        {actions.length === 0
          ? <p className="text-xs text-muted-foreground text-center py-8">Nenhuma ação nesta coluna.</p>
          : actions.map((a) => (
            <ActionCard key={a.id} action={a} onDelete={onDelete} onMoveNext={onMoveNext} onMovePrev={onMovePrev} />
          ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Planos5W2H() {
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();
  const location = useLocation();
  const prefillApplied = useRef(false);
  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Report filters
  const [rptSetor, setRptSetor] = useState(ALL);
  const [rptType, setRptType] = useState(ALL);
  const [rptStatus, setRptStatus] = useState(ALL);

  // ── Pre-fill from Dashboard navigation state ──────────────────────────────
  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (!prefill || prefillApplied.current) return;
    prefillApplied.current = true;
    setForm({
      what: prefill.what || "",
      why: prefill.why || "",
      where: prefill.where || prefill.sector || "",
      who: prefill.who || "",
      when: prefill.when || "",
      how: prefill.how || "",
      howMuch: prefill.howMuch || "",
      infectionType: prefill.infectionType || "",
    });
    setShowDialog(true);
    toast.info(prefill.title ? `Importado: ${prefill.title}` : "Dados importados do Dashboard");
    // Clear location state so prefill doesn't reapply on refresh
    window.history.replaceState({}, document.title);
  }, [location.state]);

  // ── Load ──────────────────────────────────────────────────────────────────

  const loadActions = useCallback(async () => {
    if (!hospitalId) return;
    const { data, error } = await (supabase.from("actions" as any).select("*").eq("hospital_id", hospitalId).order("created_at", { ascending: false }) as any);
    if (error) { toast.error("Erro ao carregar ações."); return; }
    setActions((data ?? []) as Action[]);
  }, [hospitalId]);

  useEffect(() => {
    if (ctxLoading || !hospitalId) return;
    const init = async () => { setLoading(true); await loadActions(); setLoading(false); };
    init();
  }, [ctxLoading, hospitalId, loadActions]);

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.what.trim()) { toast.error("Preencha 'O quê?'."); return; }
    if (!form.where) { toast.error("Selecione o setor."); return; }
    if (!form.who.trim()) { toast.error("Preencha 'Quem?'."); return; }
    if (!form.infectionType) { toast.error("Selecione o tipo de infecção."); return; }
    setSaving(true);
    const { error } = await (supabase.from("actions" as any).insert({
      user_id: userId, hospital_id: hospitalId,
      what: form.what.trim(), why: form.why.trim(), where_sector: form.where,
      who: form.who.trim(), when_date: form.when, how: form.how.trim(),
      how_much: form.howMuch.trim() || null, status: "planejado", infection_type: form.infectionType,
    }) as any);
    setSaving(false);
    if (error) { toast.error("Erro ao criar ação."); return; }
    toast.success("Ação criada!");
    setShowDialog(false);
    setForm(emptyForm);
    await loadActions();
  };

  const handleUpdateStatus = async (id: string, status: ActionStatus) => {
    const { error } = await (supabase.from("actions" as any).update({ status }).eq("id", id) as any);
    if (error) { toast.error("Erro ao atualizar status."); return; }
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success(`Movido para "${STATUS_LABEL[status]}".`);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase.from("actions" as any).delete().eq("id", deleteId) as any);
    if (error) { toast.error("Erro ao excluir."); setDeleteId(null); return; }
    setActions((prev) => prev.filter((a) => a.id !== deleteId));
    setDeleteId(null);
    toast.success("Ação excluída.");
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const today = new Date().toISOString().slice(0, 10);

  const stats = useMemo(() => {
    const total = actions.length;
    const planejado = actions.filter((a) => a.status === "planejado").length;
    const em_andamento = actions.filter((a) => a.status === "em_andamento").length;
    const concluido = actions.filter((a) => a.status === "concluido").length;
    const vencidas = actions.filter((a) => a.status !== "concluido" && a.when_date && a.when_date < today).length;
    const adesao = total ? Math.round((concluido / total) * 100) : 0;
    return { total, planejado, em_andamento, concluido, vencidas, adesao };
  }, [actions, today]);

  const barData = useMemo(() => {
    const byType: Record<string, { Planejado: number; "Em Andamento": number; Concluído: number }> = {};
    actions.forEach((a) => {
      if (!byType[a.infection_type]) byType[a.infection_type] = { Planejado: 0, "Em Andamento": 0, Concluído: 0 };
      if (a.status === "planejado") byType[a.infection_type].Planejado++;
      if (a.status === "em_andamento") byType[a.infection_type]["Em Andamento"]++;
      if (a.status === "concluido") byType[a.infection_type].Concluído++;
    });
    return Object.entries(byType).map(([tipo, v]) => ({ tipo, ...v }));
  }, [actions]);

  const pieData = useMemo(() => [
    { name: "Planejado", value: stats.planejado, color: "#3B82F6" },
    { name: "Em Andamento", value: stats.em_andamento, color: "#F59E0B" },
    { name: "Concluído", value: stats.concluido, color: "#10B981" },
  ].filter((d) => d.value > 0), [stats]);

  const sectorBarData = useMemo(() => {
    const bySetor: Record<string, number> = {};
    actions.forEach((a) => { bySetor[a.where_sector] = (bySetor[a.where_sector] || 0) + 1; });
    return Object.entries(bySetor).map(([setor, total]) => ({ setor, total })).sort((a, b) => b.total - a.total);
  }, [actions]);

  const filtered = sectorFilter === "all" ? actions : actions.filter((a) => a.where_sector === sectorFilter);
  const byStatus = (s: ActionStatus) => filtered.filter((a) => a.status === s);

  const reportFiltered = useMemo(() => actions.filter((a) =>
    (rptSetor === ALL || a.where_sector === rptSetor) &&
    (rptType === ALL || a.infection_type === rptType) &&
    (rptStatus === ALL || a.status === rptStatus)
  ), [actions, rptSetor, rptType, rptStatus]);

  // ── Export ────────────────────────────────────────────────────────────────

  const exportCsv = () => {
    const header = ["O quê?", "Por quê?", "Setor", "Responsável", "Prazo", "Como?", "Custo", "Tipo Infecção", "Status"];
    const rows = reportFiltered.map((a) => [
      a.what, a.why, a.where_sector, a.who, fmt(a.when_date), a.how, a.how_much ?? "", a.infection_type, STATUS_LABEL[a.status],
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `acoes_5w2h_${today}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("CCIH — Relatório de Ações 5W2H", 14, 16);
    doc.setFontSize(10);
    doc.text(`Emitido em: ${new Date().toLocaleString("pt-BR")}   |   Total: ${reportFiltered.length} ações`, 14, 23);
    let y = 32;
    const cols = [10, 55, 80, 105, 125, 155, 180, 210, 240];
    const headers = ["O quê?", "Por quê?", "Setor", "Responsável", "Prazo", "Como?", "Custo", "Infecção", "Status"];
    doc.setFillColor(30, 90, 140);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.rect(14, y - 5, 265, 7, "F");
    headers.forEach((h, i) => doc.text(h, cols[i], y));
    y += 5;
    doc.setTextColor(0, 0, 0);
    reportFiltered.forEach((a) => {
      if (y > 185) { doc.addPage(); y = 20; }
      const row = [
        a.what.substring(0, 25), a.why.substring(0, 20), a.where_sector, a.who.substring(0, 15),
        fmt(a.when_date), a.how.substring(0, 20), a.how_much ?? "—", a.infection_type, STATUS_LABEL[a.status],
      ];
      row.forEach((v, i) => doc.text(String(v), cols[i], y));
      y += 6;
    });
    doc.save(`acoes_5w2h_${today}.pdf`);
    toast.success("PDF gerado!");
  };

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading || ctxLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Planos 5W2H — CCIH</h1>
            <p className="text-sm text-muted-foreground">Gerenciamento de ações de controle de infecção hospitalar</p>
          </div>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova Ação
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard">
        <TabsList className="mb-2">
          <TabsTrigger value="dashboard" className="gap-1.5">
            <Activity className="h-4 w-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="planos" className="gap-1.5">
            <ListChecks className="h-4 w-4" /> Planos 5W2H
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="gap-1.5">
            <BarChart3 className="h-4 w-4" /> Relatórios
          </TabsTrigger>
        </TabsList>

        {/* ── Dashboard ──────────────────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-5">
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: "Total de Ações", value: stats.total, icon: <ListChecks className="h-5 w-5 text-primary" />, bg: "bg-primary/10" },
              { label: "Planejado", value: stats.planejado, icon: <Clock className="h-5 w-5 text-blue-600" />, bg: "bg-blue-50" },
              { label: "Em Andamento", value: stats.em_andamento, icon: <Clock className="h-5 w-5 text-amber-600" />, bg: "bg-amber-50" },
              { label: "Concluído", value: stats.concluido, icon: <CheckCircle2 className="h-5 w-5 text-green-600" />, bg: "bg-green-50" },
              { label: "Vencidas", value: stats.vencidas, icon: <Flame className="h-5 w-5 text-red-600" />, bg: "bg-red-50" },
              { label: "Taxa Conclusão", value: `${stats.adesao}%`, icon: <Activity className="h-5 w-5 text-violet-600" />, bg: "bg-violet-50" },
            ].map((kpi) => (
              <Card key={kpi.label} className="p-4">
                <div className={`inline-flex p-2 rounded-lg ${kpi.bg} mb-2`}>{kpi.icon}</div>
                <p className="text-2xl font-bold">{kpi.value}</p>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
              </Card>
            ))}
          </div>

          {actions.length === 0 ? (
            <Card className="p-12 text-center">
              <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma ação cadastrada ainda.</p>
              <Button className="mt-4" onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-1" /> Criar primeira ação
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Pie by status */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Distribuição por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Bar by infection type */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Ações por Tipo de Infecção</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="tipo" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Planejado" fill="#3B82F6" />
                      <Bar dataKey="Em Andamento" fill="#F59E0B" />
                      <Bar dataKey="Concluído" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Bar by sector */}
              {sectorBarData.length > 0 && (
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Ações por Setor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={sectorBarData} margin={{ top: 0, right: 10, bottom: 30, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="setor" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="total" name="Total" fill="#1D4ED8">
                          {sectorBarData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Planos (Kanban) ─────────────────────────────────────────────── */}
        <TabsContent value="planos" className="space-y-4">
          {/* Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <Label className="text-sm shrink-0">Filtrar por setor:</Label>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-52 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            {sectorFilter !== "all" && (
              <Button variant="ghost" size="sm" onClick={() => setSectorFilter("all")} className="h-9 text-xs">
                Limpar filtro
              </Button>
            )}
            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} ações</span>
          </div>

          {/* Board */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUMNS.map((status) => (
              <KanbanColumn key={status} status={status} actions={byStatus(status)}
                onDelete={(id) => setDeleteId(id)}
                onMoveNext={handleUpdateStatus}
                onMovePrev={handleUpdateStatus}
              />
            ))}
          </div>
        </TabsContent>

        {/* ── Relatórios ──────────────────────────────────────────────────── */}
        <TabsContent value="relatorios" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" /> Exportação e Evidências
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
                    <Download className="h-4 w-4" /> CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportPdf} className="gap-1.5">
                    <FileText className="h-4 w-4" /> PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Setor</Label>
                  <Select value={rptSetor} onValueChange={setRptSetor}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todos</SelectItem>
                      {SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de Infecção</Label>
                  <Select value={rptType} onValueChange={setRptType}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todos</SelectItem>
                      {INFECTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Status</Label>
                  <Select value={rptStatus} onValueChange={setRptStatus}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ALL}>Todos</SelectItem>
                      <SelectItem value="planejado">Planejado</SelectItem>
                      <SelectItem value="em_andamento">Em Andamento</SelectItem>
                      <SelectItem value="concluido">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">{reportFiltered.length} ação(ões) encontrada(s)</p>

              {/* Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">O quê?</TableHead>
                      <TableHead className="min-w-[100px]">Setor</TableHead>
                      <TableHead className="min-w-[100px]">Responsável</TableHead>
                      <TableHead className="min-w-[90px]">Prazo</TableHead>
                      <TableHead className="min-w-[90px]">Infecção</TableHead>
                      <TableHead className="min-w-[100px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportFiltered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          Nenhuma ação encontrada com os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      reportFiltered.map((a) => {
                        const overdue = a.status !== "concluido" && a.when_date && a.when_date < today;
                        return (
                          <TableRow key={a.id}>
                            <TableCell className="font-medium">{a.what}</TableCell>
                            <TableCell className="text-sm">{a.where_sector}</TableCell>
                            <TableCell className="text-sm">{a.who}</TableCell>
                            <TableCell className="text-sm">
                              <span className={overdue ? "text-red-600 font-medium" : ""}>{fmt(a.when_date)}</span>
                            </TableCell>
                            <TableCell className="text-sm">{a.infection_type}</TableCell>
                            <TableCell>
                              <Badge className={`text-[10px] border ${STATUS_CONFIG[a.status].badge}`}>
                                {STATUS_LABEL[a.status]}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Create Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ação 5W2H</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>O quê? (What) *</Label>
              <Input placeholder="Descreva a ação a ser realizada" value={form.what} onChange={(e) => setForm((f) => ({ ...f, what: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Por quê? (Why)</Label>
              <Textarea placeholder="Justificativa — protocolos ANVISA, indicadores..." value={form.why} onChange={(e) => setForm((f) => ({ ...f, why: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Onde? (Where) *</Label>
                <Select value={form.where} onValueChange={(v) => setForm((f) => ({ ...f, where: v }))}>
                  <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
                  <SelectContent>{SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Quem? (Who) *</Label>
                <Input placeholder="Responsável" value={form.who} onChange={(e) => setForm((f) => ({ ...f, who: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Quando? (When)</Label>
                <Input type="date" value={form.when} onChange={(e) => setForm((f) => ({ ...f, when: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Quanto custa?</Label>
                <Input placeholder="Ex: R$ 500,00" value={form.howMuch} onChange={(e) => setForm((f) => ({ ...f, howMuch: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Como? (How)</Label>
              <Textarea placeholder="Plano de execução..." value={form.how} onChange={(e) => setForm((f) => ({ ...f, how: e.target.value }))} rows={2} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de Infecção *</Label>
              <Select value={form.infectionType} onValueChange={(v) => setForm((f) => ({ ...f, infectionType: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{INFECTION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setForm(emptyForm); }}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Criar Ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ação?</AlertDialogTitle>
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
