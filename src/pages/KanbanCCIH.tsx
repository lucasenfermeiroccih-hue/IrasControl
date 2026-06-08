import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  ArrowUp, ArrowDown, ArrowUpDown,
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
  assigned_to_ids: string[];
  assigned_by: string | null;
  recurrence: "daily" | "weekly" | "monthly" | "once";
  status: "in_progress" | "completed";
  priority: "low" | "normal" | "high";
  last_completed_at: string | null;
  created_at: string;
  assigned_to_names?: string[];
  source: "ccih" | "guardiao";
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
  once: "Única vez",
};

const RECURRENCE_ICONS = {
  daily: <Calendar className="h-3 w-3" />,
  weekly: <CalendarDays className="h-3 w-3" />,
  monthly: <CalendarRange className="h-3 w-3" />,
  once: <ChevronRight className="h-3 w-3" />,
};

const RECURRENCE_COLORS = {
  daily: "bg-blue-100 text-blue-700 border-blue-200",
  weekly: "bg-purple-100 text-purple-700 border-purple-200",
  monthly: "bg-amber-100 text-amber-700 border-amber-200",
  once: "bg-green-100 text-green-700 border-green-200",
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

function isWeekend(date = new Date()): boolean {
  const d = date.getDay();
  return d === 0 || d === 6; // 0=Dom, 6=Sáb
}

// Último dia útil anterior a uma data (para comparar com last_completed_at)
function lastWeekday(from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  do { d.setDate(d.getDate() - 1); } while (isWeekend(d));
  return d;
}

function shouldReset(tarefa: Tarefa): boolean {
  if (!tarefa.last_completed_at) return false;
  if (tarefa.status === "in_progress") return false;
  if (tarefa.recurrence === "once") return false;

  const last = new Date(tarefa.last_completed_at);
  const now = new Date();

  if (tarefa.recurrence === "daily") {
    // Tarefas diárias não resetam no fim de semana
    if (isWeekend(now)) return false;
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
    return lastDay < today;
  }
  if (tarefa.recurrence === "weekly") {
    // Reseta toda segunda-feira
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1));
    startOfWeek.setHours(0, 0, 0, 0);
    return last < startOfWeek;
  }
  if (tarefa.recurrence === "monthly") {
    // Reseta no primeiro dia do mês
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
            {tarefa.source === "guardiao" && (
              <Badge className="text-[10px] py-0 px-1.5 bg-indigo-100 text-indigo-700 border border-indigo-200 font-semibold">
                Guardião
              </Badge>
            )}
            <p className={`text-sm font-medium leading-snug ${done ? "line-through text-muted-foreground" : ""}`}>
              {tarefa.title}
            </p>
          </div>
        </div>
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

      {isAdmin && tarefa.assigned_to_names && tarefa.assigned_to_names.length > 0 && (
        <div className="flex items-start gap-1 text-xs text-muted-foreground flex-wrap">
          <User className="h-3 w-3 mt-0.5 shrink-0" />
          <span>{tarefa.assigned_to_names.join(", ")}</span>
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
  const { isAdmin: isAdminHook, loading: adminLoading } = useIsAdmin();

  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [hospitalUsers, setHospitalUsers] = useState<HospitalUser[]>([]);
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);
  const isAdmin = isAdminHook || isPrimaryAdmin;
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"kanban" | "manage">("kanban");
  const [recurrenceFilter, setRecurrenceFilter] = useState<"all" | "daily" | "weekly" | "monthly" | "once">("all");
  const [showDialog, setShowDialog] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Manage tab filters & sort
  const [manageMes, setManageMes] = useState<string>("all");
  const [manageAno, setManageAno] = useState<string>("all");
  const [manageUser, setManageUser] = useState<string>("all");
  const [manageStatus, setManageStatus] = useState<string>("all");
  type SortKey = "source" | "recurrence" | "priority" | "status";
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const toggleSort = (k: SortKey) => {
    if (sortKey !== k) { setSortKey(k); setSortDir("asc"); }
    else if (sortDir === "asc") setSortDir("desc");
    else { setSortKey(null); setSortDir("asc"); }
  };
  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <ArrowUpDown className="h-3 w-3 opacity-50" />
      : sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;

  const emptyForm = {
    title: "",
    description: "",
    assigned_to_ids: [] as string[],
    recurrence: "daily" as "daily" | "weekly" | "monthly" | "once",
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

    // Robust admin check (independent of hook timing): role-based OR primary admin of this hospital
    const [{ data: isSuper }, { data: isHospAdmin }, { data: primary }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "hospital_admin" }),
      (supabase.from("hospital_users" as any)
        .select("is_primary_admin")
        .eq("user_id", userId)
        .eq("hospital_id", hospitalId)
        .maybeSingle() as any),
    ]);
    const adminNow = Boolean(isSuper) || Boolean(isHospAdmin) || Boolean((primary as any)?.is_primary_admin);
    setIsPrimaryAdmin(adminNow);

    let query = (supabase.from("kanban_ccih_tarefas" as any).select("*") as any)
      .eq("hospital_id", hospitalId);
    if (!adminNow) query = query.contains("assigned_to_ids", [userId]);
    const { data, error } = await query.order("created_at", { ascending: true });
    if (error) { toast.error("Erro ao carregar tarefas"); return; }

    const toReset = (data as Tarefa[]).filter(shouldReset).map((t) => t.id);
    if (toReset.length > 0) {
      await (supabase.from("kanban_ccih_tarefas" as any).update({ status: "in_progress" }).in("id", toReset) as any);
    }

    // Build a name map: prefer hospitalUsers, fall back to a one-off profiles lookup for assignees outside the list
    const knownIds = new Set(hospitalUsers.map((u) => u.user_id));
    const missingIds = Array.from(new Set(
      (data as any[]).flatMap((t) => {
        const ids: string[] = Array.isArray(t.assigned_to_ids) && t.assigned_to_ids.length > 0
          ? t.assigned_to_ids
          : t.assigned_to ? [t.assigned_to] : [];
        return ids;
      }).filter((id) => id && !knownIds.has(id))
    ));
    const extraNames: Record<string, string> = {};
    if (missingIds.length > 0) {
      const { data: profs } = await (supabase.from("profiles" as any)
        .select("user_id, full_name")
        .in("user_id", missingIds) as any);
      (profs as any[] | null)?.forEach((p) => { extraNames[p.user_id] = p.full_name || ""; });
    }

    const enriched: Tarefa[] = (data as any[]).map((t) => {
      const ids: string[] = Array.isArray(t.assigned_to_ids) && t.assigned_to_ids.length > 0
        ? t.assigned_to_ids
        : t.assigned_to ? [t.assigned_to] : [];
      return {
        ...t,
        assigned_to_ids: ids,
        status: toReset.includes(t.id) ? "in_progress" : t.status,
        assigned_to_names: ids
          .map((id) => hospitalUsers.find((u) => u.user_id === id)?.full_name || extraNames[id])
          .filter(Boolean) as string[],
        source: (t.source ?? "ccih") as "ccih" | "guardiao",
      };
    });

    setTarefas(enriched);
  }, [hospitalId, userId, hospitalUsers]);

  useEffect(() => {
    if (ctxLoading || adminLoading || !hospitalId || !userId) return;
    const init = async () => {
      setLoading(true);
      // Always load hospital users so admin names show up; cheap query.
      await loadHospitalUsers();
      await loadTarefas();
      setLoading(false);
    };
    init();
  }, [ctxLoading, adminLoading, hospitalId, userId]);

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
    if (form.assigned_to_ids.length === 0) { toast.error("Selecione ao menos um usuário."); return; }

    setSaving(true);
    const firstAssignee = form.assigned_to_ids[0];
    if (editingTarefa) {
      const { error } = await (supabase
        .from("kanban_ccih_tarefas" as any)
        .update({
          title: form.title.trim(),
          description: form.description.trim() || null,
          assigned_to: firstAssignee,
          assigned_to_ids: form.assigned_to_ids,
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
        assigned_to: firstAssignee,
        assigned_to_ids: form.assigned_to_ids,
        assigned_by: userId,
        recurrence: form.recurrence,
        priority: form.priority,
        status: "in_progress",
      }) as any);
      if (error) { toast.error("Erro ao criar tarefa."); setSaving(false); return; }
      toast.success("Tarefa criada e enviada para o(s) usuário(s)!");
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
    const ids = tarefa.assigned_to_ids?.length > 0
      ? tarefa.assigned_to_ids
      : tarefa.assigned_to ? [tarefa.assigned_to] : [];
    setForm({
      title: tarefa.title,
      description: tarefa.description || "",
      assigned_to_ids: ids,
      recurrence: tarefa.recurrence as "daily" | "weekly" | "monthly" | "once",
      priority: tarefa.priority,
    });
    setShowDialog(true);
  };

  const openNew = () => {
    setEditingTarefa(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  // Manage tab: filter + sort
  const manageAnos = Array.from(new Set(tarefas.map((t) => new Date(t.created_at).getFullYear()))).sort((a, b) => b - a);
  const manageTarefas = (() => {
    let list = tarefas.filter((t) => {
      const d = new Date(t.created_at);
      if (manageMes !== "all" && d.getMonth() + 1 !== Number(manageMes)) return false;
      if (manageAno !== "all" && d.getFullYear() !== Number(manageAno)) return false;
      if (manageUser !== "all" && !(t.assigned_to_ids?.includes(manageUser) || t.assigned_to === manageUser)) return false;
      if (manageStatus !== "all" && t.status !== manageStatus) return false;
      return true;
    });
    if (sortKey) {
      const order: Record<SortKey, (t: Tarefa) => string | number> = {
        source: (t) => t.source ?? "",
        recurrence: (t) => ["daily", "weekly", "monthly", "once", "none"].indexOf(t.recurrence),
        priority: (t) => ["low", "normal", "high"].indexOf(t.priority),
        status: (t) => t.status,
      };
      const fn = order[sortKey];
      list = [...list].sort((a, b) => {
        const va = fn(a); const vb = fn(b);
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }
    return list;
  })();

  // ── Derived data ──────────────────────────────────────────────────────────

  const myTarefas = isAdmin
    ? tarefas
    : tarefas.filter((t) =>
        t.assigned_to_ids?.includes(userId!) || t.assigned_to === userId
      );

  const todayIsWeekend = isWeekend();

  const filtered = myTarefas.filter((t) => {
    // Tarefas diárias não aparecem no fim de semana (sábado/domingo)
    if (t.recurrence === "daily" && todayIsWeekend) return false;
    // Aplica filtro de recorrência selecionado
    return recurrenceFilter === "all" || t.recurrence === recurrenceFilter;
  });

  const inProgress = filtered.filter((t) => t.status === "in_progress");
  const completed = filtered.filter((t) => t.status === "completed");

  const stats = {
    daily: myTarefas.filter((t) => t.recurrence === "daily").length,
    weekly: myTarefas.filter((t) => t.recurrence === "weekly").length,
    monthly: myTarefas.filter((t) => t.recurrence === "monthly").length,
    once: myTarefas.filter((t) => t.recurrence === "once").length,
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={<Calendar className="h-4 w-4 text-blue-600" />} label="Diárias" value={stats.daily} color="text-blue-600" />
        <StatCard icon={<CalendarDays className="h-4 w-4 text-purple-600" />} label="Semanais" value={stats.weekly} color="text-purple-600" />
        <StatCard icon={<CalendarRange className="h-4 w-4 text-amber-600" />} label="Mensais" value={stats.monthly} color="text-amber-600" />
        <StatCard icon={<ChevronRight className="h-4 w-4 text-green-600" />} label="Única vez" value={stats.once} color="text-green-600" />
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
              <TabsTrigger value="once" className="text-xs px-3 gap-1">
                <ChevronRight className="h-3 w-3" /> Única vez
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Checklist */}
          <Card className="border border-violet-200 bg-violet-50/40">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListTodo className="h-4 w-4 text-violet-600" />
                  <CardTitle className="text-sm font-semibold text-violet-700">
                    Checklist de Tarefas
                  </CardTitle>
                  <span className="text-xs text-violet-500 font-normal">
                    {filtered.filter((t) => t.status === "completed").length}/{filtered.length} concluídas
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-1 max-w-xs ml-4">
                  <div className="w-full bg-violet-200 rounded-full h-1.5">
                    <div
                      className="bg-violet-600 h-1.5 rounded-full transition-all"
                      style={{ width: filtered.length ? `${Math.round((filtered.filter((t) => t.status === "completed").length / filtered.length) * 100)}%` : "0%" }}
                    />
                  </div>
                  <span className="text-xs text-violet-600 font-medium shrink-0">
                    {filtered.length ? Math.round((filtered.filter((t) => t.status === "completed").length / filtered.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-3">Nenhuma tarefa encontrada.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {filtered.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => t.status === "completed" ? handleReopen(t.id) : handleComplete(t.id)}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-left transition-all hover:shadow-sm
                        ${t.status === "completed"
                          ? "bg-emerald-50 border-emerald-200 opacity-70"
                          : "bg-white border-gray-200 hover:border-violet-300"}`}
                    >
                      <div className={`mt-0.5 shrink-0 h-4 w-4 rounded border-2 flex items-center justify-center transition-colors
                        ${t.status === "completed"
                          ? "bg-emerald-500 border-emerald-500"
                          : "border-gray-300 hover:border-violet-500"}`}
                      >
                        {t.status === "completed" && (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-snug ${t.status === "completed" ? "line-through text-muted-foreground" : "text-gray-800"}`}>
                          {t.title}
                        </p>
                        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                          {t.source === "guardiao" && (
                            <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 px-1 rounded">Guardião</span>
                          )}
                          {isAdmin && t.assigned_to_names && t.assigned_to_names.length > 0 && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{t.assigned_to_names.join(", ")}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

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
              {manageTarefas.length} de {tarefas.length} tarefa(s)
            </p>
            <Button size="sm" onClick={openNew} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          </div>

          {/* Filtros */}
          <Card>
            <CardContent className="p-3 grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Mês</Label>
                <Select value={manageMes} onValueChange={setManageMes}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"].map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <Select value={manageAno} onValueChange={setManageAno}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {manageAnos.map((a) => (
                      <SelectItem key={a} value={String(a)}>{a}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Funcionário</Label>
                <Select value={manageUser} onValueChange={setManageUser}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {hospitalUsers.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select value={manageStatus} onValueChange={setManageStatus}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort("source")} className="inline-flex items-center gap-1 hover:text-foreground">
                        Origem <SortIcon k="source" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort("recurrence")} className="inline-flex items-center gap-1 hover:text-foreground">
                        Recorrência <SortIcon k="recurrence" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort("priority")} className="inline-flex items-center gap-1 hover:text-foreground">
                        Prioridade <SortIcon k="priority" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button onClick={() => toggleSort("status")} className="inline-flex items-center gap-1 hover:text-foreground">
                        Status <SortIcon k="status" />
                      </button>
                    </TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {manageTarefas.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        Nenhuma tarefa encontrada com os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  )}
                  {manageTarefas.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{t.title}</p>
                        {t.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">{t.description}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm">
                            {t.assigned_to_names && t.assigned_to_names.length > 0
                              ? t.assigned_to_names.join(", ")
                              : "—"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {t.source === "guardiao" ? (
                          <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200">Guardião</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-gray-600">IrasControl</Badge>
                        )}
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
              <MultiUserSelect
                users={hospitalUsers}
                selected={form.assigned_to_ids}
                onChange={(ids) => setForm((f) => ({ ...f, assigned_to_ids: ids }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Recorrência</Label>
                <Select value={form.recurrence} onValueChange={(v) => setForm((f) => ({ ...f, recurrence: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Única vez</SelectItem>
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
                  {form.recurrence === "once" && "Essa tarefa ocorre uma única vez e não será reiniciada automaticamente após concluída."}
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

function MultiUserSelect({
  users,
  selected,
  onChange,
}: {
  users: HospitalUser[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const toggle = (userId: string) => {
    onChange(
      selected.includes(userId)
        ? selected.filter((id) => id !== userId)
        : [...selected, userId],
    );
  };

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground px-1 py-2">Nenhum usuário disponível</p>;
  }

  return (
    <div className="rounded-md border bg-background divide-y max-h-44 overflow-y-auto">
      {users.filter((u) => !!u.user_id).map((u) => (
        <label
          key={u.user_id}
          className="flex items-center gap-3 px-3 py-2 hover:bg-accent cursor-pointer transition-colors select-none"
        >
          <Checkbox
            checked={selected.includes(u.user_id)}
            onCheckedChange={() => toggle(u.user_id)}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{u.full_name}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
        </label>
      ))}
    </div>
  );
}

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
