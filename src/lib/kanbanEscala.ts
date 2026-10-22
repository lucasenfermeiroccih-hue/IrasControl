/**
 * Escala da equipe do Kanban CCIH: dias fixos da semana de cada funcionário.
 *
 * Dias no padrão do JavaScript (Date.getDay()): 0 = domingo … 6 = sábado.
 * Quem não tem escala cadastrada trabalha todos os dias.
 * Só as tarefas DIÁRIAS dependem da escala; semanais, mensais e únicas não.
 */

/** user_id → dias da semana em que trabalha */
export type Escala = Record<string, number[]>;

/** Ordem de exibição (segunda a domingo). */
export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Seg" },
  { value: 2, label: "Ter" },
  { value: 3, label: "Qua" },
  { value: 4, label: "Qui" },
  { value: 5, label: "Sex" },
  { value: 6, label: "Sáb" },
  { value: 0, label: "Dom" },
];

export function worksOn(escala: Escala, userId: string, day: number): boolean {
  const dias = escala[userId];
  return !dias || dias.includes(day);
}

interface TarefaEscala {
  recurrence: string;
  assigned_to_ids: string[];
}

/**
 * Tarefa diária fora da escala no dia `day`.
 * - Com `viewerId` (quadro de quem executa): fora se essa pessoa não trabalha no dia.
 * - Sem `viewerId` (visão do administrador): fora se nenhum responsável trabalha no dia.
 */
export function isOffDay(tarefa: TarefaEscala, escala: Escala, day: number, viewerId?: string | null): boolean {
  if (tarefa.recurrence !== "daily") return false;
  if (viewerId) return !worksOn(escala, viewerId, day);
  const ids = tarefa.assigned_to_ids || [];
  if (ids.length === 0) return false;
  return ids.every((id) => !worksOn(escala, id, day));
}

/** Texto curto dos dias, ex.: "Seg, Qua, Sex" ou "Todos os dias". */
export function describeDays(dias: number[] | undefined): string {
  if (!dias || dias.length === 7) return "Todos os dias";
  if (dias.length === 0) return "Nenhum dia";
  return WEEKDAYS.filter((w) => dias.includes(w.value)).map((w) => w.label).join(", ");
}
