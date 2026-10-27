import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Pencil, Repeat } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  addDays, addMonths, cicloPlantao, daysOfMonth, describeDays, nomeMes, parseCivil, WEEKDAYS,
} from "@/lib/kanbanAgenda";
import type { EscalaRegistro, Pessoa } from "./types";

export interface EscalaPatch {
  funcao?: string | null;
  atribuicoes?: string | null;
  regime?: "fixo" | "plantao";
  dias?: number[];
  plantoes?: string[];
}

interface Props {
  pessoas: Pessoa[];
  escala: Record<string, EscalaRegistro>;
  tarefasPorPessoa: Record<string, number>;
  /** Mês mostrado no resumo dos plantões ("AAAA-MM") */
  mes: string;
  podeEditar: boolean;
  onSave: (userId: string, patch: EscalaPatch) => Promise<boolean>;
}

function plantoesNoMes(plantoes: string[], mes: string): string[] {
  return plantoes.filter((p) => p.startsWith(mes)).sort();
}

export function EquipeEscala({ pessoas, escala, tarefasPorPessoa, mes, podeEditar, onSave }: Props) {
  const [editando, setEditando] = useState<Pessoa | null>(null);

  // Equipe: quem tem escala/função cadastrada ou tarefas ativas
  const equipe = pessoas
    .filter((p) => escala[p.user_id]?.cadastrada || tarefasPorPessoa[p.user_id])
    .sort((a, b) => (tarefasPorPessoa[b.user_id] ?? 0) - (tarefasPorPessoa[a.user_id] ?? 0) || a.full_name.localeCompare(b.full_name));
  const semEquipe = pessoas.filter((p) => !equipe.includes(p));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Função, dias de trabalho e plantões de cada pessoa. As tarefas aparecem no quadro só nos dias em que a pessoa trabalha;
        as de plantão (Camila e Cristiane), nas datas de plantão cadastradas.
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {equipe.map((p) => {
          const e = escala[p.user_id];
          const plantao = e?.regime === "plantao";
          const doMes = plantao ? plantoesNoMes(e.plantoes, mes) : [];
          return (
            <Card key={p.user_id}>
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold">{p.full_name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{e?.funcao || "Função não cadastrada"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{tarefasPorPessoa[p.user_id] ?? 0} tarefa(s)</Badge>
                    {podeEditar && (
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar função e escala" onClick={() => setEditando(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs">
                  {plantao ? <Repeat className="h-3.5 w-3.5 text-primary" /> : <CalendarDays className="h-3.5 w-3.5 text-primary" />}
                  {plantao ? (
                    <span>
                      Plantão · {nomeMes(mes)}:{" "}
                      {doMes.length
                        ? doMes.map((d) => parseCivil(d).getDate()).join(", ")
                        : <span className="text-amber-600 font-medium">nenhum plantão cadastrado</span>}
                    </span>
                  ) : (
                    <span>{describeDays(e?.dias)}</span>
                  )}
                </div>
                {e?.atribuicoes && <p className="text-xs text-muted-foreground leading-snug">{e.atribuicoes}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>
      {podeEditar && semEquipe.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Sem tarefas nem escala: {semEquipe.map((p) => (
            <button key={p.user_id} className="underline hover:text-foreground mr-2" onClick={() => setEditando(p)}>{p.full_name}</button>
          ))}
        </p>
      )}

      {editando && (
        <EditarEscalaDialog
          pessoa={editando}
          registro={escala[editando.user_id]}
          mesInicial={mes}
          onClose={() => setEditando(null)}
          onSave={async (patch) => {
            const ok = await onSave(editando.user_id, patch);
            if (ok) setEditando(null);
          }}
        />
      )}
    </div>
  );
}

function EditarEscalaDialog({
  pessoa, registro, mesInicial, onClose, onSave,
}: {
  pessoa: Pessoa;
  registro?: EscalaRegistro;
  mesInicial: string;
  onClose: () => void;
  onSave: (patch: EscalaPatch) => Promise<void>;
}) {
  const [funcao, setFuncao] = useState(registro?.funcao ?? "");
  const [atribuicoes, setAtribuicoes] = useState(registro?.atribuicoes ?? "");
  const [regime, setRegime] = useState<"fixo" | "plantao">(registro?.regime ?? "fixo");
  const [dias, setDias] = useState<number[]>(registro?.dias ?? [1, 2, 3, 4, 5]);
  const [plantoes, setPlantoes] = useState<string[]>(registro?.plantoes ?? []);
  const [mes, setMes] = useState(mesInicial);
  const [inicioCiclo, setInicioCiclo] = useState("");
  const [saving, setSaving] = useState(false);

  const toggleDia = (d: number) => setDias((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d].sort()));
  const togglePlantao = (d: string) => setPlantoes((v) => (v.includes(d) ? v.filter((x) => x !== d) : [...v, d].sort()));

  // Calendário do mês (segunda a domingo)
  const diasDoMes = daysOfMonth(mes);
  const offset = (parseCivil(diasDoMes[0]).getDay() + 6) % 7;
  const celulas: (string | null)[] = [...Array(offset).fill(null), ...diasDoMes];

  const gerarCiclo = () => {
    if (!inicioCiclo) return;
    const ate = addDays(`${addMonths(inicioCiclo.slice(0, 7), 3)}-01`, -1); // até o fim do 3º mês
    const novos = cicloPlantao(inicioCiclo, ate);
    setPlantoes((v) => [...v.filter((d) => d < inicioCiclo), ...novos]);
    setMes(inicioCiclo.slice(0, 7));
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Função e escala — {pessoa.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Função</Label>
            <Input value={funcao} onChange={(e) => setFuncao(e.target.value)} placeholder="Ex.: Técnica de enfermagem – CTI 1, 2 e 3" />
          </div>
          <div className="space-y-1.5">
            <Label>Atribuições</Label>
            <Textarea rows={3} value={atribuicoes} onChange={(e) => setAtribuicoes(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Regime de trabalho</Label>
            <Select value={regime} onValueChange={(v) => setRegime(v as "fixo" | "plantao")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixo">Dias fixos da semana</SelectItem>
                <SelectItem value="plantao">Plantão (datas da escala)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {regime === "fixo" ? (
            <div className="space-y-1.5">
              <Label>Dias de trabalho</Label>
              <div className="flex gap-1 flex-wrap">
                {WEEKDAYS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    onClick={() => toggleDia(w.value)}
                    aria-pressed={dias.includes(w.value)}
                    className={`h-8 w-11 rounded text-xs font-medium border transition-colors ${
                      dias.includes(w.value) ? "bg-primary text-primary-foreground border-primary" : "bg-background text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Plantões</Label>
              <div className="flex items-end gap-2 flex-wrap rounded-md border p-2 bg-muted/30">
                <div className="space-y-1">
                  <span className="text-[11px] text-muted-foreground">Ciclo 12x60 (a cada 3 dias) a partir do plantão de</span>
                  <Input type="date" className="h-8 w-40" value={inicioCiclo} onChange={(e) => setInicioCiclo(e.target.value)} />
                </div>
                <Button type="button" size="sm" variant="outline" className="h-8" disabled={!inicioCiclo} onClick={gerarCiclo}>
                  Gerar 3 meses
                </Button>
              </div>
              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMes(addMonths(mes, -1))}><ChevronLeft className="h-4 w-4" /></Button>
                <span className="text-sm font-medium">{nomeMes(mes)}</span>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMes(addMonths(mes, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((d) => (
                  <span key={d} className="text-[10px] text-muted-foreground">{d}</span>
                ))}
                {celulas.map((d, i) => d === null ? <span key={`v${i}`} /> : (
                  <button
                    key={d}
                    type="button"
                    onClick={() => togglePlantao(d)}
                    aria-pressed={plantoes.includes(d)}
                    className={`h-8 rounded text-xs border transition-colors ${
                      plantoes.includes(d) ? "bg-primary text-primary-foreground border-primary font-semibold" : "bg-background hover:bg-muted"
                    }`}
                  >
                    {parseCivil(d).getDate()}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Clique no dia para marcar ou desmarcar o plantão. {plantoesNoMes(plantoes, mes).length} plantão(ões) neste mês.
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              await onSave({ funcao: funcao.trim() || null, atribuicoes: atribuicoes.trim() || null, regime, dias, plantoes });
              setSaving(false);
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
