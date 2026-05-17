import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  KanbanSquare, Plus, CheckCircle2, Clock, RotateCcw, Trash2,
  Pencil, Loader2, Calendar, CalendarDays, CalendarRange,
  ListTodo, Users, ChevronRight, AlertCircle, User,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Tarefa {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_by: string | null;
  recurrence: "daily" | "weekly" | "monthly";
  status: "in_progress" | "completed";
  priority: "low" | "normal" | "high";
  last_completed_at: string | null;
  created_at: string;
  assigned_to_name?: string;
}

interface HospitalUser {
  user_id: string;
  full_name: string;
  email: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RECURRENCE_LABELS = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
};

const RECURRENCE_ICONS = {
  daily: <Calendar className="h-3 w-3" />,
  weekly: <CalendarDays className="h-3 w-3" />,
  monthly: <CalendarRange className="h-3 w-3" />,
};

const RECURRENCE_COLORS = {
  daily: "bg-blue-100 text-blue-700 border-blue-200",
  weekly: "bg-purple-100 text-purple-700 border-purple-200",
  monthly: "bg-amber-100 text-amber-700 border-amber-200",
};

const PRIORITY_COLORS = {
  low: "border-l-slate-300",
  normal: "border-l-blue-400",
  high: "border-l-red-500",
};

const PRIORITY_LABELS = {
  low: "Baixa",
  normal: "Normal",
  high: "Alta",
};

function shouldReset(tarefa: Tarefa): boolean {
  if (!tarefa.last_completed_at) return false;
  if (tarefa.status === "in_progress") return false;

  const last = new Date(tarefa.last_completed_at);
  const now = new Date();

  if (tarefa.recurrence === "daily") {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    return lastDay < today;
  }
  if (tarefa.recurrence === "weekly") {
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    return last < startOfWeek;
  }
  if (tarefa.recurrence === "monthly") {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return last < startOfMonth;
  }
  return false;
}

// ─── Card Component ───────────────────────────────────────────────────────────

function TarefaCard({
  tarefa,
  isAdmin,
  onComplete,
  onReopen,
  onEdit,
  onDelete,
}: {
  tarefa: Tarefa;
  isAdmin: boolean;
  onComplete: (id: string) => void;
  onReopen: (id: string) => void;
  onEdit: (t: Tarefa) => void;
  onDelete: (id: string) => void;
}) {
  const done = tarefa.status === "completed";

  return (
    <div
      className={`bg-white rounded-lg border border-l-4 shadow-sm p-3 space-y-2 transition-opacity ${
        done ? "opacity-60" : ""
      } ${PRIORITY_COLORS[tarefa.priority]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-sm font-medium leading-snug ${done ? "line-through text-muted-foreground" : ""}`}>
          {tarefa.title}
        </p>
        <div className="flex gap-1 shrink-0">
          {isAdmin && (
            <>
              <button
                onClick={() => onEdit(tarefa)}
                className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => onDelete(tarefa.id)}
                className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {tarefa.description && (
        <p className="text-xs text-muted-foreground leading-snug">{tarefa.description}</p>
      )}

      {isAdmin && tarefa.assigned_to_name && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          <span>{tarefa.assigned_to_name}</span>
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Badge variant="outline" className={`text-xs py-0 px-1.5 gap-1 ${RECURRENCE_COLORS[tarefa.recurrence]}`}>
            {RECURRENCE_ICONS[tarefa.recurrence]}
            {RECURRENCE_LABELS[tarefa.recurrence]}
          </Badge>
        </div>
        {done ? (
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs gap-1"
            onClick={() => onReopen(tarefa.id)}
          >
            <RotateCcw className="h-3 w-3" />
            Reabrir
          </Button>
        ) : (
          <Button
            size="sm"
            className="h-6 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700"
            onClick={() => onComplete(tarefa.id)}
          >
            <CheckCircle2 className="h-3 w-3" />
            Concluir
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KanbanCCIH() {
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();
  const { isAdmin, loading: adminLoading } = useIsAdmin();

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [hospitalUsers, setHospitalUsers] = useState<HospitalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"kanban" | "manage">("kanban");
  const [recurrenceFilter, setRecurrenceFilter] = useState<"all" | "daily" | "weekly" | "monthly">("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const emptyForm = {
    title: "",
    description: "",
    assigned_to: "",
    recurrence: "daily" as "daily" | "weekly" | "monthly",
    priority: "normal" as "low" | "normal" | "high",
  };
  const [form, setForm] = useState(emptyForm);

  // ── Load hospital users (for admin) ──────────────────────────────────────

  const loadHospitalUsers = useCallback(async () => {
    if (!hospitalId) return;
    const { data } = await (supabase
      .from("hospital_users" as any)
      .select("user_id, profiles(full_name, email)")
      .eq("hospital_id", hospitalId) as any);
    if (data) {
      setHospitalUsers(
        data
          .filter((u: any) => !!u.user_id)
          .map((u: any) => ({
            user_id: u.user_id,
            full_name: u.profiles?.full_name || "Sem nome",
            email: u.profiles?.email || "",
          }))
      );
    }
  }, [hospitalId]);

  // ── Load tasks ────────────────────────────────────────────────────────────

  const loadTarefas = useCallback(async () => {
    if (!hospitalId || !userId) return;

    let query = (supabase.from("kanban_ccih_tarefas" as any).select("*") as any)
      .eq("hospital_id", hospitalId);

    if (!isAdmin) {
      query = query.eq("assigned_to", userId);
    }

    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) { toast.error("Erro ao carregar tarefas"); return; }

    // Auto-reset tasks that passed their recurrence period
    const toReset = (data as Tarefa[]).filter(shouldReset).map((t) => t.id);
    if (toReset.length > 0) {
      await (supabase
        .from("kanban_ccih_tarefas" as any)
        .update({ status: "in_progress" })
        .in("id", toReset) as any);
    }

    // Enrich with user names
    const enriched = (data as Tarefa[]).map((t) => {
      const user = hospitalUsers.find((u) => u.user_id === t.assigned_to);
      return {
        ...t,
        status: toReset.includes(t.id) ? "in_progress" : t.status,
        assigned_to_name: user?.full_name || "",
      };
    });

    setTarefas(enriched as Tarefa[]);
  }, [hospitalId, userId, isAdmin, hospitalUsers]);

  useEffect(() => {
    if (ctxLoading || adminLoading || !hospitalId || !userId) return;
    const init = async () => {
      setLoading(true);
      if (isAdmin) await loadHospitalUsers();
      await loadTarefas();
      setLoading(false);
    };
    init();
  }, [ctxLoading, adminLoading, hospitalId, userId, isAdmin]);

  useEffect(() => {
    if (hospitalUsers.length > 0) loadTarefas();
  }, [hospitalUsers]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleComplete = async (id: string) => {
    await (supabase
      .from("kanban_ccih_tarefas" as any)
      .update({ status: "completed", last_completed_at: new Date().toISOString() })
      .eq("id", id) as any);
    setTarefas((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status: "completed", last_completed_at: new Date().toISOString() } : t
      )
    );
    toast.success("Tarefa concluída!");
  };

  const handleReopen = async (id: string) => {
    await (supabase
      .from("kanban_ccih_tarefas" as any)
      .update({ status: "in_progress" })
      .eq("id", id) as any);
    setTarefas((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "in_progress" } : t))
    );
    toast.success("Tarefa reaberta.");
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error("Informe o título da tarefa."); return; }
    if (!form.assigned_to) { toast.error("Selecione um usuário."); return; }

    setSaving(true);
    if (editingTarefa) {
      const { error } = await (supabase
        .from("kanban_ccih_tarefas" as any)
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          assigned_to: form.assigned_to,
          recurrence: form.recurrence,
          priority: form.priority,
        })
        .eq("id", editingTarefa.id) as any);
      if (error) { toast.error("Erro ao salvar."); setSaving(false); return; }
      toast.success("Tarefa atualizada!");
    } else {
      const { error } = await (supabase.from("kanban_ccih_tarefas" as any).insert({
        hospital_id: hospitalId,
        title: form.title.trim(),
        description: form.description.trim() || null,
        assigned_to: form.assigned_to,
        assigned_by: userId,
        recurrence: form.recurrence,
        priority: form.priority,
        status: "in_progress",
      }) as any);
      if (error) { toast.error("Erro ao criar tarefa."); setSaving(false); return; }
      toast.success("Tarefa criada e enviada para o usuário!");
    }

    setSaving(false);
    setShowDialog(false);
    setEditingTarefa(null);
    setForm(emptyForm);
    await loadTarefas();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await (supabase.from("kanban_ccih_tarefas" as any).delete().eq("id", deleteId) as any);
    setTarefas((prev) => prev.filter((t) => t.id !== deleteId));
    setDeleteId(null);
    toast.success("Tarefa removida.");
  };

  const openEdit = (tarefa: Tarefa) => {
    setEditingTarefa(tarefa);
    setForm({
      title: tarefa.title,
      description: tarefa.description || "",
      assigned_to: tarefa.assigned_to,
      recurrence: tarefa.recurrence,
      priority: tarefa.priority,
    });
    setShowDialog(true);
  };

  const openNew = () => {
    setEditingTarefa(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const myTarefas = isAdmin ? tarefas : tarefas.filter((t) => t.assigned_to === userId);

  const filtered = myTarefas.filter(
    (t) => recurrenceFilter === "all" || t.recurrence === recurrenceFilter
  );

  const inProgress = filtered.filter((t) => t.status === "in_progress");
  const completed = filtered.filter((t) => t.status === "completed");

  const stats = {
    daily: myTarefas.filter((t) => t.recurrence === "daily").length,
    weekly: myTarefas.filter((t) => t.recurrence === "weekly").length,
    monthly: myTarefas.filter((t) => t.recurrence === "monthly").length,
    done: myTarefas.filter((t) => t.status === "completed").length,
    total: myTarefas.length,
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading || ctxLoading || adminLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <KanbanSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Kanban CCIH</h1>
            <p className="text-sm text-muted-foreground">
              Tarefas diárias, semanais e mensais da equipe
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <Button
                variant={tab === "kanban" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("kanban")}
                className="gap-1.5"
              >
                <KanbanSquare className="h-4 w-4" />
                Meu Quadro
              </Button>
              <Button
                variant={tab === "manage" ? "default" : "outline"}
                size="sm"
                onClick={() => setTab("manage")}
                className="gap-1.5"
              >
                <Users className="h-4 w-4" />
                Gerenciar
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Calendar className="h-4 w-4 text-blue-600" />} label="Diárias" value={stats.daily} color="text-blue-600" />
        <StatCard icon={<CalendarDays className="h-4 w-4 text-purple-600" />} label="Semanais" value={stats.weekly} color="text-purple-600" />
        <StatCard icon={<CalendarRange className="h-4 w-4 text-amber-600" />} label="Mensais" value={stats.monthly} color="text-amber-600" />
        <StatCard
          icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          label="Concluídas"
          value={`${stats.done}/${stats.total}`}
          color="text-emerald-600"
        />
      </div>

      {/* Kanban Tab */}
      {tab === "kanban" && (
        <div className="space-y-4">
          {/* Filter */}
          <Tabs value={recurrenceFilter} onValueChange={(v) => setRecurrenceFilter(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3">Todas</TabsTrigger>
              <TabsTrigger value="daily" className="text-xs px-3 gap-1">
                <Calendar className="h-3 w-3" /> Diárias
              </TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs px-3 gap-1">
                <CalendarDays className="h-3 w-3" /> Semanais
              </TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs px-3 gap-1">
                <CalendarRange className="h-3 w-3" /> Mensais
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Board */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Em Andamento */}
            <KanbanColumn
              title="Em Andamento"
              count={inProgress.length}
              icon={<Clock className="h-4 w-4 text-blue-600" />}
              colorClass="border-blue-200 bg-blue-50/50"
              headerClass="text-blue-700"
              empty="Nenhuma tarefa em andamento."
            >
              {inProgress.map((t) => (
                <TarefaCard
                  key={t.id}
                  tarefa={t}
                  isAdmin={isAdmin}
                  onComplete={handleComplete}
                  onReopen={handleReopen}
                  onEdit={openEdit}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </KanbanColumn>

            {/* Concluído */}
            <KanbanColumn
              title="Concluído"
              count={completed.length}
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              colorClass="border-emerald-200 bg-emerald-50/50"
              headerClass="text-emerald-700"
              empty="Nenhuma tarefa concluída ainda."
            >
              {completed.map((t) => (
                <TarefaCard
                  key={t.id}
                  tarefa={t}
                  isAdmin={isAdmin}
                  onComplete={handleComplete}
                  onReopen={handleReopen}
                  onEdit={openEdit}
                  onDelete={(id) => setDeleteId(id)}
                />
              ))}
            </KanbanColumn>
          </div>
        </div>
      )}

      {/* Manage Tab (admin only) */}
      {tab === "manage" && isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {tarefas.length} tarefa(s) atribuídas no hospital
            </p>
            <Button size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Recorrência</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tarefas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        Nenhuma tarefa cadastrada. Clique em "Nova Tarefa" para começar.
                      </TableCell>
                    </TableRow>
                  )}
                  {tarefas.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{t.title}</p>
                        {t.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{t.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{t.assigned_to_name || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs gap-1 ${RECURRENCE_COLORS[t.recurrence]}`}>
                          {RECURRENCE_ICONS[t.recurrence]}
                          {RECURRENCE_LABELS[t.recurrence]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">{PRIORITY_LABELS[t.priority]}</span>
                      </TableCell>
                      <TableCell>
                        {t.status === "completed" ? (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Concluído</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">Em Andamento</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteId(t.id)}
                            className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={(open) => { if (!open) { setShowDialog(false); setEditingTarefa(null); setForm(emptyForm); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTarefa ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Higienização das mãos nas UTIs"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Detalhes opcionais da tarefa..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Atribuir para *</Label>
              <Select value={form.assigned_to} onValueChange={(v) => setForm((f) => ({ ...f, assigned_to: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuário..." />
                </SelectTrigger>
                <SelectContent>
                  {hospitalUsers.filter((u) => !!u.user_id).map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.full_name} — {u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Recorrência</Label>
                <Select value={form.recurrence} onValueChange={(v) => setForm((f) => ({ ...f, recurrence: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diária</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="monthly">Mensal</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.recurrence && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  {form.recurrence === "daily" && "Essa tarefa voltará para 'Em Andamento' automaticamente todo dia."}
                  {form.recurrence === "weekly" && "Essa tarefa voltará para 'Em Andamento' toda segunda-feira."}
                  {form.recurrence === "monthly" && "Essa tarefa voltará para 'Em Andamento' no primeiro dia de cada mês."}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowDialog(false); setEditingTarefa(null); setForm(emptyForm); }}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingTarefa ? "Salvar" : "Criar Tarefa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. A tarefa será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
        </div>
      </div>
    </Card>
  );
}

function KanbanColumn({
  title, count, icon, colorClass, headerClass, empty, children,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  colorClass: string;
  headerClass: string;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border-2 ${colorClass} p-3 space-y-3 min-h-[300px]`}>
      <div className="flex items-center gap-2">
        {icon}
        <h3 className={`font-semibold text-sm ${headerClass}`}>{title}</h3>
        <span className="ml-auto text-xs font-medium bg-white border rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="space-y-2">
        {count === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">{empty}</p>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
