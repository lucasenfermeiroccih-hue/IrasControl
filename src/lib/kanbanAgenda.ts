/**
 * Kanban SCIH — agenda das tarefas (V7.2).
 *
 * Decide em que dias cada tarefa aparece no quadro e qual é a "ocorrência"
 * cujo status (a fazer / em andamento / concluída) é registrado:
 *  - diária   → uma ocorrência por dia em que a tarefa acontece;
 *  - semanal  → uma por semana (chave: segunda-feira);
 *  - mensal   → uma por mês (chave: dia 1);
 *  - única    → uma só (chave fixa).
 *
 * Quando a tarefa acontece:
 *  - a pessoa precisa estar trabalhando no dia: escala de dias fixos
 *    (0 = domingo … 6 = sábado) ou datas de plantão;
 *  - `no_plantao`: só nas datas de plantão do responsável;
 *  - `dias_semana`: só nesses dias da semana;
 *  - `dias_mes`: diária → só nesses dias do mês (caindo no fim de semana,
 *    passa para a segunda); mensal → janela do mês (ex.: 1ª semana).
 *
 * Datas são strings "AAAA-MM-DD" no horário local.
 */

export type Recorrencia = "daily" | "weekly" | "monthly" | "once";
export type StatusExecucao = "todo" | "doing" | "done";

export interface EscalaPessoa {
  /** Dias da semana de trabalho (regime fixo). Nulo = todos os dias. */
  dias: number[] | null;
  regime: "fixo" | "plantao";
  /** Datas dos plantões ("AAAA-MM-DD"). */
  plantoes: string[];
}

/** user_id → escala. Quem não tem escala trabalha todos os dias. */
export type EscalaMap = Record<string, EscalaPessoa>;

export interface TarefaAgenda {
  recurrence: Recorrencia;
  assigned_to_ids: string[];
  dias_semana?: number[] | null;
  dias_mes?: number[] | null;
  no_plantao?: boolean;
  ativo?: boolean;
}

/** Chave da ocorrência de tarefa "única vez". */
export const PERIODO_UNICO = "2000-01-01";

export const STATUS_LABELS: Record<StatusExecucao, string> = {
  todo: "A fazer",
  doing: "Em andamento",
  done: "Concluída",
};

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

// ── Datas ────────────────────────────────────────────────────────────────

export function civil(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseCivil(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseCivil(s);
  d.setDate(d.getDate() + n);
  return civil(d);
}

/** Segunda-feira da semana da data. */
export function mondayOf(s: string): string {
  const dow = parseCivil(s).getDay();
  return addDays(s, dow === 0 ? -6 : 1 - dow);
}

/** Datas da semana (segunda a domingo) que contém a data. */
export function weekOf(s: string): string[] {
  const mon = mondayOf(s);
  return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
}

/** Todas as datas de um mês ("AAAA-MM"). */
export function daysOfMonth(mes: string): string[] {
  const [y, m] = mes.split("-").map(Number);
  const n = new Date(y, m, 0).getDate();
  return Array.from({ length: n }, (_, i) => civil(new Date(y, m - 1, i + 1)));
}

/** Mês ("AAAA-MM") deslocado de n meses. */
export function addMonths(mes: string, n: number): string {
  const [y, m] = mes.split("-").map(Number);
  return civil(new Date(y, m - 1 + n, 1)).slice(0, 7);
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-11" → "novembro de 2026". */
export function nomeMes(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  return `${MESES[m - 1]} de ${y}`;
}

/** "10, 25" → [10, 25]; vazio → null. */
export function parseDiasMes(txt: string): number[] | null {
  const nums = txt.split(/[^0-9]+/).filter(Boolean).map(Number).filter((n) => n >= 1 && n <= 31);
  return nums.length ? [...new Set(nums)].sort((a, b) => a - b) : null;
}

// ── Escala ───────────────────────────────────────────────────────────────

export function pessoaTrabalha(esc: EscalaPessoa | undefined, data: string): boolean {
  if (!esc) return true;
  if (esc.regime === "plantao") return esc.plantoes.includes(data);
  return !esc.dias || esc.dias.includes(parseCivil(data).getDay());
}

/** Dia do mês em `dias` (dia útil); no fim de semana, vale na segunda seguinte. */
function diaDoMesUtil(data: string, dias: number[]): boolean {
  const d = parseCivil(data);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  if (dias.includes(d.getDate())) return true;
  if (dow === 1) {
    const sab = d.getDate() - 2;
    const dom = d.getDate() - 1;
    return (sab >= 1 && dias.includes(sab)) || (dom >= 1 && dias.includes(dom));
  }
  return false;
}

/**
 * A tarefa aparece no quadro nesta data?
 * Com `viewerId`, considera só essa pessoa (quadro de quem executa); sem ele,
 * basta um dos responsáveis estar trabalhando.
 */
export function tarefaNoDia(t: TarefaAgenda, data: string, escala: EscalaMap, viewerId?: string | null): boolean {
  if (t.ativo === false) return false;
  const ids = viewerId ? t.assigned_to_ids.filter((id) => id === viewerId) : t.assigned_to_ids;
  if (viewerId && ids.length === 0) return false;

  const presente = (id: string) =>
    t.no_plantao ? (escala[id]?.plantoes ?? []).includes(data) : pessoaTrabalha(escala[id], data);
  if (ids.length > 0 && !ids.some(presente)) return false;

  const dow = parseCivil(data).getDay();
  const diaMes = parseCivil(data).getDate();
  if (t.dias_semana && t.dias_semana.length > 0 && !t.dias_semana.includes(dow)) return false;

  if (t.dias_mes && t.dias_mes.length > 0) {
    if (t.recurrence === "monthly") return t.dias_mes.includes(diaMes);
    if (t.recurrence === "daily") return t.no_plantao ? t.dias_mes.includes(diaMes) : diaDoMesUtil(data, t.dias_mes);
  }
  return true;
}

/** Chave da ocorrência (período) da tarefa nesta data. */
export function periodoDe(t: Pick<TarefaAgenda, "recurrence">, data: string): string {
  switch (t.recurrence) {
    case "daily": return data;
    case "weekly": return mondayOf(data);
    case "monthly": return `${data.slice(0, 7)}-01`;
    default: return PERIODO_UNICO;
  }
}

export interface Ocorrencia {
  periodo: string;
  /** Datas do mês em que a ocorrência aparece no quadro. */
  datas: string[];
}

/** Ocorrências da tarefa num mês ("AAAA-MM"), em ordem. */
export function ocorrenciasNoMes(t: TarefaAgenda, mes: string, escala: EscalaMap, viewerId?: string | null): Ocorrencia[] {
  const map = new Map<string, string[]>();
  for (const data of daysOfMonth(mes)) {
    if (!tarefaNoDia(t, data, escala, viewerId)) continue;
    const p = periodoDe(t, data);
    if (!map.has(p)) map.set(p, []);
    map.get(p)!.push(data);
  }
  return [...map.entries()].map(([periodo, datas]) => ({ periodo, datas }));
}

/**
 * Plantões do ciclo 12x60 (12 h de trabalho, 60 h de folga = um plantão a cada
 * 3 dias) a partir do primeiro plantão, até a data final (inclusive).
 */
export function cicloPlantao(inicio: string, ate: string, intervaloDias = 3): string[] {
  const out: string[] = [];
  for (let d = inicio; d <= ate; d = addDays(d, intervaloDias)) out.push(d);
  return out;
}

/** Texto curto dos dias, ex.: "Seg, Qua, Sex" ou "Todos os dias". */
export function describeDays(dias: number[] | null | undefined): string {
  if (!dias || dias.length === 7) return "Todos os dias";
  if (dias.length === 0) return "Nenhum dia";
  if (dias.length === 5 && [1, 2, 3, 4, 5].every((d) => dias.includes(d))) return "Seg a Sex";
  return WEEKDAYS.filter((w) => dias.includes(w.value)).map((w) => w.label).join(", ");
}

/** Resumo de quando a tarefa acontece, para o cartão. */
export function describeAgenda(t: TarefaAgenda): string {
  const base = { daily: "Diária", weekly: "Semanal", monthly: "Mensal", once: "Única vez" }[t.recurrence];
  const partes = [base];
  if (t.no_plantao) partes.push("nos plantões");
  if (t.dias_semana && t.dias_semana.length > 0 && t.dias_semana.length < 7) partes.push(describeDays(t.dias_semana));
  if (t.dias_mes && t.dias_mes.length > 0) {
    const d = [...t.dias_mes].sort((a, b) => a - b);
    const seq = d.every((v, i) => i === 0 || v === d[i - 1] + 1);
    partes.push(seq && d.length > 2 ? `dias ${d[0]} a ${d[d.length - 1]}` : `dias ${d.join(" e ")}`);
  }
  return partes.join(" · ");
}
