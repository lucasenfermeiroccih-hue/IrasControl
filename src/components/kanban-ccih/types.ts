import type { EscalaPessoa, Recorrencia, StatusExecucao } from "@/lib/kanbanAgenda";

export type Prioridade = "low" | "normal" | "high";

export interface Tarefa {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string;
  assigned_to_ids: string[];
  assigned_by: string | null;
  recurrence: Recorrencia;
  priority: Prioridade;
  created_at: string;
  source: "ccih" | "guardiao";
  setores: string[];
  tipo: string | null;
  dias_semana: number[] | null;
  dias_mes: number[] | null;
  no_plantao: boolean;
  quando: string | null;
  horario: string | null;
  tempo_alvo: string | null;
  validador: string | null;
  backup: string | null;
  alteracao: string | null;
  versao: string | null;
  ordem: number | null;
  ativo: boolean;
  /** Nomes dos responsáveis (montado na tela) */
  assigned_to_names?: string[];
}

export interface Execucao {
  id?: string;
  tarefa_id: string;
  periodo: string;
  status: StatusExecucao;
  observacao?: string | null;
  iniciado_em?: string | null;
  concluido_em?: string | null;
  concluido_por?: string | null;
  updated_at?: string;
}

export interface Pessoa {
  user_id: string;
  full_name: string;
  email: string;
}

export interface EscalaRegistro extends EscalaPessoa {
  user_id: string;
  funcao: string | null;
  atribuicoes: string | null;
  /** false = ainda sem linha na escala (trabalha todos os dias) */
  cadastrada: boolean;
}

/** Item do quadro: tarefa + ocorrência do dia. */
export interface ItemQuadro {
  tarefa: Tarefa;
  periodo: string;
  status: StatusExecucao;
  execucao?: Execucao;
}

/** Setores das carteiras da V7.2, na ordem do quadro. */
export const SETORES = [
  "CTI 1", "CTI 2", "CTI 3", "UPO", "Trauma Clínico", "Trauma Clínico Externo", "Trauma Cirúrgico",
  "Nova Emergência", "PCR", "Emergência Pediátrica", "Clínica Médica", "Enfermaria Pediátrica",
  "Clínica Cirúrgica 1", "Clínica Cirúrgica 2", "Centro Cirúrgico",
];

/** Filtro de setor para tarefas sem setor (gestão, transversais). */
export const SETOR_GERAL = "__geral";

export const TIPOS = [
  "Carteira", "Cobertura", "Transversal", "Auditoria", "Validação", "Precaução", "Microbiologia",
  "ISC", "Limpeza", "Ambiental", "Dados", "Treinamento", "Governança",
];

export const RECURRENCE_LABELS: Record<Recorrencia, string> = {
  daily: "Diária",
  weekly: "Semanal",
  monthly: "Mensal",
  once: "Única vez",
};

export const PRIORITY_LABELS: Record<Prioridade, string> = { low: "Baixa", normal: "Média", high: "Alta" };

export const PRIORITY_BORDER: Record<Prioridade, string> = {
  low: "border-l-slate-300",
  normal: "border-l-blue-400",
  high: "border-l-red-500",
};

export interface Filtros {
  pessoa: string;
  setor: string;
  tipo: string;
  recorrencia: string;
  status: "all" | StatusExecucao;
  busca: string;
}

export const FILTROS_INICIAIS: Filtros = {
  pessoa: "all", setor: "all", tipo: "all", recorrencia: "all", status: "all", busca: "",
};

/** Aplica os filtros de pessoa, setor, tipo, recorrência e texto (o status é por ocorrência). */
export function filtraTarefa(t: Tarefa, f: Filtros): boolean {
  if (f.pessoa !== "all" && !t.assigned_to_ids.includes(f.pessoa)) return false;
  if (f.setor === SETOR_GERAL ? t.setores.length > 0 : f.setor !== "all" && !t.setores.includes(f.setor)) return false;
  if (f.tipo !== "all" && t.tipo !== f.tipo) return false;
  if (f.recorrencia !== "all" && t.recurrence !== f.recorrencia) return false;
  const q = f.busca.trim().toLowerCase();
  if (q && !`${t.title} ${t.description ?? ""}`.toLowerCase().includes(q)) return false;
  return true;
}
