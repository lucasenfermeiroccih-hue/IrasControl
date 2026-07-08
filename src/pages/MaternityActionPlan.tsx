import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Baby, Plus, Loader2, Pencil, Trash2, CheckCircle2, Clock } from "lucide-react";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { listMaternityActionPlans, upsertMaternityActionPlan, deleteMaternityActionPlan } from "@/lib/maternity-service";
import { generateSuggestedActionPlan } from "@/lib/maternity-indicators";
import type { MaternityActionPlan, MaternityActionPlanStatus, MaternityActionPlanPriority } from "@/lib/maternity-types";
import { MATERNITY_INDICATOR_LABELS } from "@/lib/maternity-types";

const STATUS_LABELS: Record<MaternityActionPlanStatus, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  done: "Concluído",
  cancelled: "Cancelado",
};
const STATUS_COLORS: Record<MaternityActionPlanStatus, string> = {
  open: "bg-blue-100 text-blue-700 border-blue-200",
  in_progress: "bg-yellow-100 text-yellow-700 border-yellow-200",
  done: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-gray-100 text-gray-500 border-gray-200",
};
const PRIORITY_LABELS: Record<MaternityActionPlanPriority, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};
const PRIORITY_COLORS: Record<MaternityActionPlanPriority, string> = {
  low: "bg-gray-100 text-gray-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const INDICATOR_OPTIONS = Object.entries(MATERNITY_INDICATOR_LABELS).map(([k, v]) => ({ value: k, label: v }));

function emptyPlan(hospitalId: string): MaternityActionPlan {
  return {
    hospital_id: hospitalId,
    indicator_key: "",
    problem: "",
    root_cause: "",
    action: "",
    responsible: "",
    due_date: "",
    evidence: "",
    status: "open",
    priority: "medium",
  };
}

export default function MaternityActionPlan() {
  const { hospitalId, userId } = useHospitalContext();
  const [plans, setPlans] = useState<MaternityActionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MaternityActionPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  async function load() {
    if (!hospitalId) return;
    setLoading(true);
    try {
      setPlans(await listMaternityActionPlans(hospitalId));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [hospitalId]);

  function openNew() {
    setEditing(emptyPlan(hospitalId!));
    setOpen(true);
  }

  function openEdit(plan: MaternityActionPlan) {
    setEditing({ ...plan });
    setOpen(true);
  }

  function fillSuggested(indicatorKey: string) {
    if (!indicatorKey || !editing) return;
    const suggestion = generateSuggestedActionPlan(indicatorKey);
    setEditing(prev => prev ? ({ ...prev, ...(suggestion as any), indicator_key: indicatorKey } as any) : prev);
  }

  async function handleSave() {
    if (!editing) return;
    if (!editing.indicator_key || !editing.problem || !editing.action || !editing.responsible) {
      toast.error("Preencha indicador, problema, ação e responsável.");
      return;
    }
    setSaving(true);
    try {
      await upsertMaternityActionPlan({ ...editing, created_by: userId ?? undefined });
      toast.success("Plano de ação salvo.");
      setOpen(false);
      load();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err?.message || "Tente novamente."));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este plano de ação?")) return;
    try {
      await deleteMaternityActionPlan(id);
      toast.success("Plano removido.");
      load();
    } catch {
      toast.error("Erro ao remover.");
    }
  }

  const filtered = plans.filter(p => statusFilter === "all" || p.status === statusFilter);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Baby className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Planos de Ação — Maternidade</h1>
          <p className="text-sm text-muted-foreground">Gestão de ações corretivas por indicador</p>
        </div>
        <Button className="ml-auto" onClick={openNew} disabled={!hospitalId}>
          <Plus className="h-4 w-4 mr-2" /> Novo plano
        </Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["all", "open", "in_progress", "done", "cancelled"] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full px-3 py-1 text-sm border transition-colors ${
              statusFilter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-accent"
            }`}
          >
            {s === "all" ? "Todos" : STATUS_LABELS[s as MaternityActionPlanStatus]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Carregando planos...
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
            Nenhum plano de ação encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(plan => (
            <Card key={plan.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">{MATERNITY_INDICATOR_LABELS[plan.indicator_key] || plan.indicator_key}</span>
                      <Badge className={`text-xs border ${STATUS_COLORS[plan.status]}`}>{STATUS_LABELS[plan.status]}</Badge>
                      <Badge className={`text-xs ${PRIORITY_COLORS[plan.priority]}`}>{PRIORITY_LABELS[plan.priority]}</Badge>
                    </div>
                    <p className="font-medium text-sm">{plan.problem}</p>
                    {plan.action && <p className="text-xs text-muted-foreground mt-1">Ação: {plan.action}</p>}
                    <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                      {plan.responsible && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {plan.responsible}</span>}
                      {plan.due_date && <span>Prazo: {plan.due_date}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(plan)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(plan.id!)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={o => !saving && setOpen(o)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar plano de ação" : "Novo plano de ação"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Indicador</Label>
                  <Select
                    value={editing.indicator_key}
                    onValueChange={v => {
                      setEditing(prev => prev ? { ...prev, indicator_key: v } : prev);
                      if (!editing.id) fillSuggested(v);
                    }}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                    <SelectContent>
                      {INDICATOR_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={editing.status} onValueChange={v => setEditing(prev => prev ? { ...prev, status: v as MaternityActionPlanStatus } : prev)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Prioridade</Label>
                  <Select value={editing.priority} onValueChange={v => setEditing(prev => prev ? { ...prev, priority: v as MaternityActionPlanPriority } : prev)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Prazo</Label>
                  <Input type="date" value={editing.due_date || ""} onChange={e => setEditing(prev => prev ? { ...prev, due_date: e.target.value } : prev)} />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Problema identificado</Label>
                <Textarea value={editing.problem} onChange={e => setEditing(prev => prev ? { ...prev, problem: e.target.value } : prev)} className="min-h-[70px]" />
              </div>
              <div className="space-y-1">
                <Label>Causa raiz</Label>
                <Textarea value={editing.root_cause || ""} onChange={e => setEditing(prev => prev ? { ...prev, root_cause: e.target.value } : prev)} className="min-h-[60px]" />
              </div>
              <div className="space-y-1">
                <Label>Ação proposta</Label>
                <Textarea value={editing.action} onChange={e => setEditing(prev => prev ? { ...prev, action: e.target.value } : prev)} className="min-h-[70px]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Responsável</Label>
                  <Input value={editing.responsible} onChange={e => setEditing(prev => prev ? { ...prev, responsible: e.target.value } : prev)} />
                </div>
                <div className="space-y-1">
                  <Label>Evidências</Label>
                  <Input value={editing.evidence || ""} onChange={e => setEditing(prev => prev ? { ...prev, evidence: e.target.value } : prev)} />
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
