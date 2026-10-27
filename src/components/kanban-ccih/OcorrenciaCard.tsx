import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, Clock, MapPin, Pencil, Play, RotateCcw, Undo2, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { describeAgenda, type StatusExecucao } from "@/lib/kanbanAgenda";
import { PRIORITY_BORDER, PRIORITY_LABELS, type ItemQuadro } from "./types";

interface Props {
  item: ItemQuadro;
  mostrarResponsavel: boolean;
  podeEditar: boolean;
  onStatus: (item: ItemQuadro, status: StatusExecucao) => void;
  onEdit: (item: ItemQuadro) => void;
  /** Dia da semana mostrado ("Seg", "Ter"…): filtra os horários de referência */
  diaSemana?: string;
}

/** Horários de referência só do dia da semana mostrado (ex.: "Seg 08:40–12:00"). */
function horariosDoDia(horario: string | null, diaSemana?: string): string | null {
  if (!horario || horario === "Sem bloco fixo") return null;
  if (!diaSemana) return horario;
  const doDia = horario.split(";").map((h) => h.trim()).filter((h) => h.startsWith(diaSemana));
  return doDia.length ? doDia.map((h) => h.slice(diaSemana.length).trim()).join(" · ") : horario.startsWith("Plantão") ? horario : null;
}

export function OcorrenciaCard({ item, mostrarResponsavel, podeEditar, onStatus, onEdit, diaSemana }: Props) {
  const { tarefa: t, status } = item;
  const [aberto, setAberto] = useState(false);
  const done = status === "done";

  return (
    <div className={`bg-card text-card-foreground rounded-lg border border-l-4 shadow-sm p-3 space-y-2 ${PRIORITY_BORDER[t.priority]} ${done ? "opacity-70" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {t.source === "guardiao" && (
              <Badge className="text-[10px] py-0 px-1.5 bg-indigo-100 text-indigo-700 border border-indigo-200">Guardião</Badge>
            )}
            <p className={`text-sm font-medium leading-snug ${done ? "line-through text-muted-foreground" : ""}`}>{t.title}</p>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {describeAgenda(t)}
            {t.priority === "high" && <span className="text-red-600 font-medium"> · Prioridade alta</span>}
          </p>
        </div>
        {podeEditar && (
          <button
            onClick={() => onEdit(item)}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
            title="Editar tarefa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {t.tipo && <Badge variant="outline" className="text-[10px] py-0 px-1.5">{t.tipo}</Badge>}
        {t.setores.map((s) => (
          <Badge key={s} variant="secondary" className="text-[10px] py-0 px-1.5 gap-0.5 font-normal">
            <MapPin className="h-2.5 w-2.5" />{s}
          </Badge>
        ))}
      </div>

      {mostrarResponsavel && t.assigned_to_names && t.assigned_to_names.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{t.assigned_to_names.join(", ")}</span>
        </div>
      )}

      {horarioLinha(t.horario, diaSemana)}

      {aberto && (
        <div className="text-xs space-y-1.5 border-t pt-2">
          {t.description && <p className="text-muted-foreground whitespace-pre-line">{t.description}</p>}
          {t.quando && <p><span className="font-medium">Quando:</span> {t.quando}</p>}
          {t.tempo_alvo && <p><span className="font-medium">Tempo-alvo:</span> {t.tempo_alvo}</p>}
          {t.validador && <p><span className="font-medium">Valida:</span> {t.validador}</p>}
          {t.backup && <p><span className="font-medium">Backup:</span> {t.backup}</p>}
          <p><span className="font-medium">Prioridade:</span> {PRIORITY_LABELS[t.priority]}</p>
          {t.alteracao && <p className="text-muted-foreground italic">{t.alteracao}</p>}
          {item.execucao?.concluido_em && (
            <p className="text-emerald-700">Concluída em {new Date(item.execucao.concluido_em).toLocaleString("pt-BR")}</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 pt-0.5">
        <button
          onClick={() => setAberto((v) => !v)}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5"
        >
          {aberto ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {aberto ? "Menos" : "Detalhes"}
        </button>
        <div className="flex gap-1">
          {status === "todo" && (
            <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => onStatus(item, "doing")}>
              <Play className="h-3 w-3" /> Iniciar
            </Button>
          )}
          {status === "doing" && (
            <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={() => onStatus(item, "todo")} title="Voltar para A fazer">
              <Undo2 className="h-3 w-3" />
            </Button>
          )}
          {status !== "done" ? (
            <Button size="sm" className="h-6 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => onStatus(item, "done")}>
              <CheckCircle2 className="h-3 w-3" /> Concluir
            </Button>
          ) : (
            <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={() => onStatus(item, "doing")}>
              <RotateCcw className="h-3 w-3" /> Reabrir
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function horarioLinha(horario: string | null, diaSemana?: string) {
  const h = horariosDoDia(horario, diaSemana);
  if (!h) return null;
  return (
    <div className="flex items-start gap-1 text-[11px] text-muted-foreground">
      <Clock className="h-3 w-3 mt-0.5 shrink-0" />
      <span>{h}</span>
    </div>
  );
}
