/**
 * Gamificação do IRASControl: XP, nível, sequência e conquistas calculados a
 * partir do trabalho já registrado (auditorias e tarefas do Kanban concluídas).
 *
 * Princípios (literatura de gamificação em controle de infecção):
 *  - premia entrega com evidência registrada, não velocidade;
 *  - teto diário de auditorias, para não incentivar volume sem qualidade;
 *  - sem ranking público: cada pessoa vê o próprio progresso e a meta da equipe;
 *  - fins de semana sem registro não quebram a sequência.
 * Funções puras, sem acesso ao banco.
 */

export type Prioridade = "low" | "normal" | "high";

export interface EventoAuditoria { data: string; tipo?: string | null }
export interface EventoTarefa { data: string; prioridade?: Prioridade | string | null }

export const XP = {
  auditoria: 2,
  tetoAuditoriasDia: 30,
  tarefa: { low: 15, normal: 25, high: 40 } as Record<Prioridade, number>,
  diaAtivo: 10,
};

/** Data local "aaaa-mm-dd" de um timestamp ou data. */
export function diaLocal(raw: string | Date): string {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = typeof raw === "string" ? new Date(raw) : raw;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const xpTarefa = (p?: string | null) => XP.tarefa[(p as Prioridade) in XP.tarefa ? (p as Prioridade) : "normal"];

/** XP de cada dia com atividade. */
export function xpPorDia(auditorias: EventoAuditoria[], tarefas: EventoTarefa[]): Map<string, number> {
  const aud = new Map<string, number>();
  for (const a of auditorias) {
    const d = diaLocal(a.data);
    aud.set(d, (aud.get(d) ?? 0) + 1);
  }
  const dias = new Map<string, number>();
  for (const [d, n] of aud) dias.set(d, Math.min(n, XP.tetoAuditoriasDia) * XP.auditoria);
  for (const t of tarefas) {
    const d = diaLocal(t.data);
    dias.set(d, (dias.get(d) ?? 0) + xpTarefa(t.prioridade));
  }
  for (const [d, xp] of dias) dias.set(d, xp + XP.diaAtivo);
  return dias;
}

export const TITULOS = [
  "Observador", "Vigilante", "Sentinela", "Guardião", "Protetor", "Estrategista",
  "Especialista", "Referência", "Mentor", "Mestre CCIH", "Lenda da Prevenção",
];

/** XP total necessário para alcançar o nível n (nível 1 = 0 XP). */
export const xpDoNivel = (n: number) => 100 * (n - 1) * (n - 1);

export interface Nivel { nivel: number; titulo: string; xpNoNivel: number; xpParaProximo: number; progresso: number }

export function nivelDe(xp: number): Nivel {
  let nivel = 1;
  while (xp >= xpDoNivel(nivel + 1)) nivel++;
  const base = xpDoNivel(nivel);
  const prox = xpDoNivel(nivel + 1);
  return {
    nivel,
    titulo: TITULOS[Math.min(nivel - 1, TITULOS.length - 1)],
    xpNoNivel: xp - base,
    xpParaProximo: prox - xp,
    progresso: (xp - base) / (prox - base),
  };
}

const isoDe = (d: Date) => diaLocal(d);
const fimDeSemana = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/**
 * Dias úteis seguidos com atividade, terminando hoje (ou no último dia útil, se
 * hoje ainda não houve registro). Sábado e domingo contam se houve atividade e
 * são pulados se não houve.
 */
export function sequenciaAtual(diasAtivos: Set<string>, hoje = new Date()): number {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let seq = 0;
  // Hoje ainda em aberto: sem registro hoje, a sequência continua de ontem
  if (!diasAtivos.has(isoDe(d))) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    if (diasAtivos.has(isoDe(d))) seq++;
    else if (!fimDeSemana(d)) break;
    d.setDate(d.getDate() - 1);
  }
  return seq;
}

/** Maior sequência no período (mesma regra de fins de semana). */
export function maiorSequencia(diasAtivos: Set<string>): number {
  const dias = [...diasAtivos].sort();
  if (!dias.length) return 0;
  let melhor = 0;
  let atual = 0;
  const d = new Date(`${dias[0]}T12:00:00`);
  const fim = new Date(`${dias[dias.length - 1]}T12:00:00`);
  while (d <= fim) {
    if (diasAtivos.has(isoDe(d))) melhor = Math.max(melhor, ++atual);
    else if (!fimDeSemana(d)) atual = 0;
    d.setDate(d.getDate() + 1);
  }
  return melhor;
}

export interface Conquista {
  id: string;
  icone: string;
  nome: string;
  descricao: string;
  atual: number;
  meta: number;
  obtida: boolean;
}

export interface Estatisticas {
  auditorias: number;
  auditoriasHigiene: number;
  tiposAuditoria: number;
  tarefas: number;
  tarefasAlta: number;
  maiorSequencia: number;
  melhorMesDias: number;
}

export function estatisticas(auditorias: EventoAuditoria[], tarefas: EventoTarefa[], diasAtivos: Set<string>): Estatisticas {
  const porMes = new Map<string, number>();
  for (const d of diasAtivos) porMes.set(d.slice(0, 7), (porMes.get(d.slice(0, 7)) ?? 0) + 1);
  return {
    auditorias: auditorias.length,
    auditoriasHigiene: auditorias.filter((a) => a.tipo === "hand_hygiene").length,
    tiposAuditoria: new Set(auditorias.map((a) => a.tipo).filter(Boolean)).size,
    tarefas: tarefas.length,
    tarefasAlta: tarefas.filter((t) => t.prioridade === "high").length,
    maiorSequencia: maiorSequencia(diasAtivos),
    melhorMesDias: Math.max(0, ...porMes.values()),
  };
}

const DEF_CONQUISTAS: { id: string; icone: string; nome: string; descricao: string; meta: number; valor: (e: Estatisticas) => number }[] = [
  { id: "primeira-tarefa", icone: "🎯", nome: "Primeiro passo", descricao: "Concluir a primeira tarefa do Kanban", meta: 1, valor: (e) => e.tarefas },
  { id: "tarefas-25", icone: "📋", nome: "Rotina em dia", descricao: "Concluir 25 tarefas do Kanban", meta: 25, valor: (e) => e.tarefas },
  { id: "alta-10", icone: "🚨", nome: "Linha de frente", descricao: "Concluir 10 tarefas de prioridade alta", meta: 10, valor: (e) => e.tarefasAlta },
  { id: "auditor-50", icone: "🔎", nome: "Olhar de campo", descricao: "Registrar 50 auditorias", meta: 50, valor: (e) => e.auditorias },
  { id: "auditor-500", icone: "🏅", nome: "Auditor sênior", descricao: "Registrar 500 auditorias", meta: 500, valor: (e) => e.auditorias },
  { id: "maos-100", icone: "🧼", nome: "Mãos que salvam", descricao: "100 auditorias de higiene das mãos", meta: 100, valor: (e) => e.auditoriasHigiene },
  { id: "multitipos", icone: "🧭", nome: "Visão completa", descricao: "Auditar 4 tipos diferentes (bundles, precaução, higiene…)", meta: 4, valor: (e) => e.tiposAuditoria },
  { id: "sequencia-5", icone: "🔥", nome: "Em chamas", descricao: "5 dias úteis seguidos com registro", meta: 5, valor: (e) => e.maiorSequencia },
  { id: "sequencia-20", icone: "⚡", nome: "Imparável", descricao: "20 dias úteis seguidos com registro", meta: 20, valor: (e) => e.maiorSequencia },
  { id: "mes-15", icone: "📆", nome: "Mês de presença", descricao: "Registro em 15 dias de um mesmo mês", meta: 15, valor: (e) => e.melhorMesDias },
];

export function conquistas(e: Estatisticas): Conquista[] {
  return DEF_CONQUISTAS.map(({ valor, ...c }) => {
    const atual = valor(e);
    return { ...c, atual: Math.min(atual, c.meta), obtida: atual >= c.meta };
  });
}

export interface ResumoGamificacao {
  xpTotal: number;
  xpMes: number;
  xpHoje: number;
  nivel: Nivel;
  sequencia: number;
  conquistas: Conquista[];
  estatisticas: Estatisticas;
  /** Últimos 84 dias (12 semanas), do mais antigo ao mais recente */
  mapaCalor: { dia: string; xp: number }[];
}

export function resumoGamificacao(auditorias: EventoAuditoria[], tarefas: EventoTarefa[], hoje = new Date()): ResumoGamificacao {
  const dias = xpPorDia(auditorias, tarefas);
  const ativos = new Set(dias.keys());
  const hojeIso = diaLocal(hoje);
  const mes = hojeIso.slice(0, 7);
  let xpTotal = 0;
  let xpMes = 0;
  for (const [d, xp] of dias) {
    xpTotal += xp;
    if (d.startsWith(mes)) xpMes += xp;
  }
  const mapaCalor: { dia: string; xp: number }[] = [];
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 83);
  for (let i = 0; i < 84; i++) {
    const iso = diaLocal(d);
    mapaCalor.push({ dia: iso, xp: dias.get(iso) ?? 0 });
    d.setDate(d.getDate() + 1);
  }
  const est = estatisticas(auditorias, tarefas, ativos);
  return {
    xpTotal,
    xpMes,
    xpHoje: dias.get(hojeIso) ?? 0,
    nivel: nivelDe(xpTotal),
    sequencia: sequenciaAtual(ativos, hoje),
    conquistas: conquistas(est),
    estatisticas: est,
    mapaCalor,
  };
}

/** Preferência local: a pessoa pode ocultar a gamificação. */
const CHAVE_PREF = "irascontrol-gamificacao";
export function gamificacaoAtiva(): boolean {
  try { return localStorage.getItem(CHAVE_PREF) !== "off"; } catch { return true; }
}
export function definirGamificacao(ativa: boolean) {
  try { localStorage.setItem(CHAVE_PREF, ativa ? "on" : "off"); } catch { /* sem armazenamento */ }
  window.dispatchEvent(new Event("irascontrol-gamificacao"));
}
