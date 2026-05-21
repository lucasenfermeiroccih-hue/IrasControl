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
import { toast } from "sonner";
import { ClipboardList, Plus, Loader2, Trash2, Clock, CheckCircle2, Calendar, MapPin, User, Tag } from "lucide-react";
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
  "UTI Adulto",
  "UTI Neonatal",
  "UTI Pediátrica",
  "Centro Cirúrgico",
  "Enfermaria",
  "Pronto Socorro",
  "Hemodiálise",
  "Maternidade",
] as const;

const INFECTION_TYPES = [
  "ICSC-CVC",
  "PAV",
  "ITU-CA",
  "ISC",
  "Outros",
] as const;

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

const NEXT_STATUS: Record<ActionStatus, ActionStatus | null> = {
  planejado: "em_andamento",
  em_andamento: "concluido",
  concluido: null,
};

const PREV_STATUS: Record<ActionStatus, ActionStatus | null> = {
  planejado: null,
  em_andamento: "planejado",
  concluido: "em_andamento",
};

// ─── Empty form ───────────────────────────────────────────────────────────────

const emptyForm = {
  what: "",
  why: "",
  where: "",
  who: "",
  when: "",
  how: "",
  howMuch: "",
  infectionType: "",
};

// ─── Action Card ──────────────────────────────────────────────────────────────

function ActionCard({
  action,
  onDelete,
  onMoveNext,
  onMovePrev,
}: {
  action: Action;
  onDelete: (id: string) => void;
  onMoveNext: (id: string, nextStatus: ActionStatus) => void;
  onMovePrev: (id: string, prevStatus: ActionStatus) => void;
}) {
  const cfg = STATUS_CONFIG[action.status];
  const next = NEXT_STATUS[action.status];
  const prev = PREV_STATUS[action.status];

  return (
    <div className={`bg-white rounded-lg border border-l-4 shadow-sm p-3 space-y-2 ${cfg.border}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold leading-snug text-foreground flex-1">{action.what}</p>
        <button
          onClick={() => onDelete(action.id)}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          title="Excluir ação"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Meta */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span>{action.where_sector}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span>{action.who}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0" />
          <span>{action.when_date || "—"}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Tag className="h-3 w-3 shrink-0" />
          <span>{action.infection_type}</span>
        </div>
      </div>

      {/* Badge + Move buttons */}
      <div className="flex items-center justify-between gap-1 pt-0.5">
        <Badge className={`text-[10px] py-0 px-1.5 border ${cfg.badge}`}>
          {cfg.label}
        </Badge>
        <div className="flex gap-1">
          {prev && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] px-1.5"
              onClick={() => onMovePrev(action.id, prev)}
            >
              ← {STATUS_CONFIG[prev].label}
            </Button>
          )}
          {next && (
            <Button
              size="sm"
              className="h-6 text-[10px] px-1.5 bg-primary/90 hover:bg-primary"
              onClick={() => onMoveNext(action.id, next)}
            >
              {STATUS_CONFIG[next].label} →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  status,
  actions,
  onDelete,
  onMoveNext,
  onMovePrev,
}: {
  status: ActionStatus;
  actions: Action[];
  onDelete: (id: string) => void;
  onMoveNext: (id: string, nextStatus: ActionStatus) => void;
  onMovePrev: (id: string, prevStatus: ActionStatus) => void;
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
        {actions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhuma ação nesta coluna.</p>
        ) : (
          actions.map((a) => (
            <ActionCard
              key={a.id}
              action={a}
              onDelete={onDelete}
              onMoveNext={onMoveNext}
              onMovePrev={onMovePrev}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Planos5W2H() {
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();

  const [actions, setActions] = useState<Action[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectorFilter, setSectorFilter] = useState<string>("all");
  const [showDialog, setShowDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // ── Load actions ──────────────────────────────────────────────────────────

  const loadActions = useCallback(async () => {
    if (!hospitalId) return;
    const { data, error } = await (supabase
      .from("actions" as any)
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false }) as any);
    if (error) {
      toast.error("Erro ao carregar ações.");
      return;
    }
    setActions((data ?? []) as Action[]);
  }, [hospitalId]);

  useEffect(() => {
    if (ctxLoading || !hospitalId) return;
    const init = async () => {
      setLoading(true);
      await loadActions();
      setLoading(false);
    };
    init();
  }, [ctxLoading, hospitalId]);

  // ── Create action ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.what.trim()) { toast.error("Preencha o campo 'O quê?'."); return; }
    if (!form.where) { toast.error("Selecione o setor."); return; }
    if (!form.who.trim()) { toast.error("Preencha o campo 'Quem?'."); return; }
    if (!form.infectionType) { toast.error("Selecione o tipo de infecção."); return; }

    setSaving(true);
    const { error } = await (supabase.from("actions" as any).insert({
      user_id: userId,
      hospital_id: hospitalId,
      what: form.what.trim(),
      why: form.why.trim(),
      where_sector: form.where,
      who: form.who.trim(),
      when_date: form.when,
      how: form.how.trim(),
      how_much: form.howMuch.trim() || null,
      status: "planejado",
      infection_type: form.infectionType,
    }) as any);

    setSaving(false);
    if (error) {
      toast.error("Erro ao criar ação.");
      return;
    }
    toast.success("Ação criada com sucesso!");
    setShowDialog(false);
    setForm(emptyForm);
    await loadActions();
  };

  // ── Update status ─────────────────────────────────────────────────────────

  const handleUpdateStatus = async (id: string, status: ActionStatus) => {
    const { error } = await (supabase
      .from("actions" as any)
      .update({ status })
      .eq("id", id) as any);
    if (error) {
      toast.error("Erro ao atualizar status.");
      return;
    }
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    toast.success(`Status atualizado para "${STATUS_CONFIG[status].label}".`);
  };

  // ── Delete action ─────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await (supabase
      .from("actions" as any)
      .delete()
      .eq("id", deleteId) as any);
    if (error) {
      toast.error("Erro ao excluir ação.");
      setDeleteId(null);
      return;
    }
    setActions((prev) => prev.filter((a) => a.id !== deleteId));
    setDeleteId(null);
    toast.success("Ação excluída.");
  };

  // ── Derived data ──────────────────────────────────────────────────────────

  const filtered = sectorFilter === "all"
    ? actions
    : actions.filter((a) => a.where_sector === sectorFilter);

  const byStatus = (status: ActionStatus) => filtered.filter((a) => a.status === status);

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading || ctxLoading) {
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
            <ClipboardList className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Planos 5W2H</h1>
            <p className="text-sm text-muted-foreground">
              Gerenciamento de ações de controle de infecção
            </p>
          </div>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nova Ação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map((status) => {
          const cfg = STATUS_CONFIG[status];
          const count = filtered.filter((a) => a.status === status).length;
          return (
            <Card key={status} className="p-3">
              <div className="flex items-center gap-2">
                {cfg.icon}
                <div>
                  <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  <p className="text-lg font-bold leading-none">{count}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <Label className="text-sm shrink-0">Filtrar por setor:</Label>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-52 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os setores</SelectItem>
            {SETORES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {sectorFilter !== "all" && (
          <Button variant="ghost" size="sm" onClick={() => setSectorFilter("all")} className="h-9 text-xs">
            Limpar filtro
          </Button>
        )}
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            actions={byStatus(status)}
            onDelete={(id) => setDeleteId(id)}
            onMoveNext={handleUpdateStatus}
            onMovePrev={handleUpdateStatus}
          />
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog
        open={showDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDialog(false);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ação 5W2H</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* What */}
            <div className="space-y-1.5">
              <Label>O quê? (What) *</Label>
              <Input
                placeholder="Descreva a ação a ser realizada"
                value={form.what}
                onChange={(e) => setForm((f) => ({ ...f, what: e.target.value }))}
              />
            </div>
            {/* Why */}
            <div className="space-y-1.5">
              <Label>Por quê? (Why)</Label>
              <Textarea
                placeholder="Justificativa para a ação"
                value={form.why}
                onChange={(e) => setForm((f) => ({ ...f, why: e.target.value }))}
                rows={2}
              />
            </div>
            {/* Where */}
            <div className="space-y-1.5">
              <Label>Onde? (Where) *</Label>
              <Select value={form.where} onValueChange={(v) => setForm((f) => ({ ...f, where: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o setor" />
                </SelectTrigger>
                <SelectContent>
                  {SETORES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Who */}
            <div className="space-y-1.5">
              <Label>Quem? (Who) *</Label>
              <Input
                placeholder="Responsável pela ação"
                value={form.who}
                onChange={(e) => setForm((f) => ({ ...f, who: e.target.value }))}
              />
            </div>
            {/* When */}
            <div className="space-y-1.5">
              <Label>Quando? (When)</Label>
              <Input
                type="date"
                value={form.when}
                onChange={(e) => setForm((f) => ({ ...f, when: e.target.value }))}
              />
            </div>
            {/* How */}
            <div className="space-y-1.5">
              <Label>Como? (How)</Label>
              <Textarea
                placeholder="Como será executada a ação"
                value={form.how}
                onChange={(e) => setForm((f) => ({ ...f, how: e.target.value }))}
                rows={2}
              />
            </div>
            {/* How Much */}
            <div className="space-y-1.5">
              <Label>Quanto custa? (How Much) — opcional</Label>
              <Input
                placeholder="Ex: R$ 500,00"
                value={form.howMuch}
                onChange={(e) => setForm((f) => ({ ...f, howMuch: e.target.value }))}
              />
            </div>
            {/* Infection Type */}
            <div className="space-y-1.5">
              <Label>Tipo de Infecção *</Label>
              <Select value={form.infectionType} onValueChange={(v) => setForm((f) => ({ ...f, infectionType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo de infecção" />
                </SelectTrigger>
                <SelectContent>
                  {INFECTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDialog(false);
                setForm(emptyForm);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Criar Ação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ação?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa ação não pode ser desfeita. O registro será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
