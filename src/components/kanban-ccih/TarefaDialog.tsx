import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { describeAgenda, parseDiasMes, WEEKDAYS, type Recorrencia } from "@/lib/kanbanAgenda";
import { PRIORITY_LABELS, RECURRENCE_LABELS, SETORES, TIPOS, type Pessoa, type Prioridade, type Tarefa } from "./types";

export type TarefaForm = Pick<Tarefa,
  "title" | "description" | "assigned_to_ids" | "recurrence" | "priority" | "tipo" | "setores" | "dias_semana" |
  "dias_mes" | "no_plantao" | "quando" | "horario" | "tempo_alvo" | "validador" | "backup" | "ativo">;

const FORM_VAZIO: TarefaForm = {
  title: "", description: "", assigned_to_ids: [], recurrence: "daily", priority: "normal", tipo: null, setores: [],
  dias_semana: null, dias_mes: null, no_plantao: false, quando: "", horario: "", tempo_alvo: "", validador: "",
  backup: "", ativo: true,
};

interface Props {
  open: boolean;
  tarefa: Tarefa | null;
  pessoas: Pessoa[];
  onClose: () => void;
  onSave: (form: TarefaForm) => Promise<boolean>;
  onDelete?: (t: Tarefa) => void;
}

export function TarefaDialog({ open, tarefa, pessoas, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<TarefaForm>(FORM_VAZIO);
  const [diasMesTxt, setDiasMesTxt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const f = tarefa ? { ...FORM_VAZIO, ...tarefa } : FORM_VAZIO;
    setForm(f);
    setDiasMesTxt(f.dias_mes?.join(", ") ?? "");
  }, [open, tarefa]);

  const set = <K extends keyof TarefaForm>(k: K, v: TarefaForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const diasSemana = form.dias_semana ?? [];

  const salvar = async () => {
    setSaving(true);
    const ok = await onSave({ ...form, dias_mes: parseDiasMes(diasMesTxt), dias_semana: diasSemana.length ? diasSemana : null });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tarefa ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Começar com verbo ou processo e terminar com o setor. Ex.: Busca ativa e IRASControl – CTI 1"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Responsável(is) *</Label>
            <div className="rounded-md border divide-y max-h-40 overflow-y-auto">
              {pessoas.map((p) => (
                <label key={p.user_id} className="flex items-center gap-3 px-3 py-1.5 hover:bg-accent cursor-pointer select-none">
                  <Checkbox
                    checked={form.assigned_to_ids.includes(p.user_id)}
                    onCheckedChange={() => set("assigned_to_ids", toggle(form.assigned_to_ids, p.user_id))}
                  />
                  <span className="text-sm">{p.full_name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Recorrência</Label>
              <Select value={form.recurrence} onValueChange={(v) => set("recurrence", v as Recorrencia)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v as Prioridade)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.tipo ?? "none"} onValueChange={(v) => set("tipo", v === "none" ? null : v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Dias da semana</Label>
            <div className="flex gap-1 flex-wrap">
              {WEEKDAYS.map((w) => (
                <button
                  key={w.value}
                  type="button"
                  onClick={() => set("dias_semana", toggle(diasSemana, w.value).sort())}
                  aria-pressed={diasSemana.includes(w.value)}
                  className={`h-8 w-11 rounded text-xs font-medium border transition-colors ${
                    diasSemana.includes(w.value) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Nenhum marcado = todos os dias de trabalho do responsável.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Dias do mês</Label>
              <Input value={diasMesTxt} onChange={(e) => setDiasMesTxt(e.target.value)} placeholder="Ex.: 10, 25" />
              <p className="text-[11px] text-muted-foreground">Diária: só nesses dias. Mensal: janela (ex.: 1-7 = 1ª semana).</p>
            </div>
            <label className="flex items-start gap-2 pt-6 cursor-pointer select-none">
              <Checkbox checked={form.no_plantao} onCheckedChange={(v) => set("no_plantao", v === true)} />
              <span className="text-sm leading-tight">
                Acontece nos plantões
                <span className="block text-[11px] text-muted-foreground">Aparece nas datas de plantão do responsável.</span>
              </span>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label>Setores</Label>
            <div className="flex gap-1 flex-wrap">
              {[...SETORES, ...form.setores.filter((s) => !SETORES.includes(s))].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("setores", toggle(form.setores, s))}
                  aria-pressed={form.setores.includes(s)}
                  className={`h-7 px-2 rounded-full text-xs border transition-colors ${
                    form.setores.includes(s) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Sem setor = tarefa de gestão ou transversal.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Quando (texto da planilha)</Label>
              <Input value={form.quando ?? ""} onChange={(e) => set("quando", e.target.value)} placeholder="Ex.: Segunda, quinta e sexta" />
            </div>
            <div className="space-y-1.5">
              <Label>Tempo-alvo</Label>
              <Input value={form.tempo_alvo ?? ""} onChange={(e) => set("tempo_alvo", e.target.value)} placeholder="Ex.: 2 h/semana" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Horário de referência</Label>
              <Input value={form.horario ?? ""} onChange={(e) => set("horario", e.target.value)} placeholder="Ex.: Seg 08:40–12:00; Qui 08:00–11:30" />
            </div>
            <div className="space-y-1.5">
              <Label>Valida</Label>
              <Input value={form.validador ?? ""} onChange={(e) => set("validador", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Backup</Label>
              <Input value={form.backup ?? ""} onChange={(e) => set("backup", e.target.value)} />
            </div>
          </div>

          {tarefa && (
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <Checkbox checked={form.ativo} onCheckedChange={(v) => set("ativo", v === true)} />
              <span className="text-sm">Tarefa ativa (desmarque para arquivar)</span>
            </label>
          )}

          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>
              {describeAgenda({ ...form, dias_mes: parseDiasMes(diasMesTxt) })}.{" "}
              {form.recurrence === "daily" && "Cada dia tem a sua situação (a fazer, em andamento, concluída)."}
              {form.recurrence === "weekly" && "Uma situação por semana: fica no quadro até ser concluída na semana."}
              {form.recurrence === "monthly" && "Uma situação por mês: fica no quadro até ser concluída no mês."}
              {form.recurrence === "once" && "Uma única situação: concluída, não volta."}
            </span>
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <div>
            {tarefa && onDelete && (
              <Button variant="ghost" className="text-destructive hover:text-destructive gap-1" onClick={() => onDelete(tarefa)}>
                <Trash2 className="h-4 w-4" /> Excluir
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={salvar} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {tarefa ? "Salvar" : "Criar tarefa"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
