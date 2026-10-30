/**
 * Gamificação do IRASControl: pontos, nível, sequência, conquistas e ranking
 * mensal, calculados a partir do trabalho registrado no sistema (tarefas do
 * Kanban, auditorias, preenchimentos e alertas clínicos resolvidos) e das regras ajustáveis do hospital
 * (tabela gamificacao_config).
 *
 * As contagens vêm da função gamificacao_eventos do banco (por pessoa, dia e
 * tipo de ação); os pontos são calculados aqui, para que um ajuste nas regras
 * valha na hora. Funções puras, sem acesso ao banco.
 */

// ── Ações que valem pontos ─────────────────────────────────────────────────

export type ChavePonto =
  | "tarefa_low" | "tarefa_normal" | "tarefa_high"
  | "auditoria"
  | "paciente_cadastro" | "paciente_atualizacao" | "precaucao" | "exame" | "caso_iras" | "indicador"
  | "alerta_alta" | "alerta_media" | "alerta_info"
  | "dia_ativo";

export type Grupo = "tarefas" | "auditorias" | "preenchimentos" | "alertas";

export const ACOES: { chave: ChavePonto; rotulo: string; grupo: Grupo | "bonus"; ajuda: string }[] = [
  { chave: "tarefa_low", rotulo: "Tarefa do Kanban — prioridade baixa", grupo: "tarefas", ajuda: "Por tarefa concluída" },
  { chave: "tarefa_normal", rotulo: "Tarefa do Kanban — prioridade normal", grupo: "tarefas", ajuda: "Por tarefa concluída" },
  { chave: "tarefa_high", rotulo: "Tarefa do Kanban — prioridade alta", grupo: "tarefas", ajuda: "Por tarefa concluída" },
  { chave: "auditoria", rotulo: "Auditoria registrada (qualquer tipo, inclusive Auditoria por setor e Módulo SCIH)", grupo: "auditorias", ajuda: "Por auditoria, até o teto diário" },
  { chave: "paciente_cadastro", rotulo: "Paciente cadastrado no monitoramento", grupo: "preenchimentos", ajuda: "Por paciente novo" },
  { chave: "paciente_atualizacao", rotulo: "Paciente atualizado no monitoramento", grupo: "preenchimentos", ajuda: "1 vez por paciente por dia" },
  { chave: "precaucao", rotulo: "Precaução registrada", grupo: "preenchimentos", ajuda: "Por precaução" },
  { chave: "exame", rotulo: "Exame / cultura registrado", grupo: "preenchimentos", ajuda: "Por exame" },
  { chave: "caso_iras", rotulo: "Caso de IRAS registrado", grupo: "preenchimentos", ajuda: "Por caso" },
  { chave: "indicador", rotulo: "Indicador preenchido (geral, ISC, DDD, consumo)", grupo: "preenchimentos", ajuda: "Por registro" },
  { chave: "alerta_alta", rotulo: "Alerta crítico resolvido", grupo: "alertas", ajuda: "1 vez por alerta por dia" },
  { chave: "alerta_media", rotulo: "Alerta de atenção resolvido", grupo: "alertas", ajuda: "1 vez por alerta por dia" },
  { chave: "alerta_info", rotulo: "Alerta informativo resolvido", grupo: "alertas", ajuda: "1 vez por alerta por dia" },
  { chave: "dia_ativo", rotulo: "Bônus de constância", grupo: "bonus", ajuda: "Por dia com algum registro" },
];

export type ConfigPontos = Record<ChavePonto, number> & { teto_auditorias_dia: number };

export const PONTOS_PADRAO: ConfigPontos = {
  tarefa_low: 15, tarefa_normal: 25, tarefa_high: 40,
  auditoria: 2,
  paciente_cadastro: 10, paciente_atualizacao: 3, precaucao: 8, exame: 5, caso_iras: 15, indicador: 20,
  alerta_alta: 15, alerta_media: 8, alerta_info: 3,
  dia_ativo: 10,
  teto_auditorias_dia: 30,
};

// ── Conquistas (insígnias) ajustáveis ──────────────────────────────────────

export type Metrica =
  | "pontos" | "tarefas" | "tarefas_alta" | "auditorias" | "auditorias_higiene" | "tipos_auditoria"
  | "preenchimentos" | "pacientes" | "alertas" | "alertas_criticos" | "sequencia" | "dias_mes";

export const METRICAS: { valor: Metrica; rotulo: string }[] = [
  { valor: "pontos", rotulo: "Pontos acumulados" },
  { valor: "tarefas", rotulo: "Tarefas do Kanban concluídas" },
  { valor: "tarefas_alta", rotulo: "Tarefas de prioridade alta" },
  { valor: "auditorias", rotulo: "Auditorias registradas" },
  { valor: "auditorias_higiene", rotulo: "Auditorias de higiene das mãos" },
  { valor: "tipos_auditoria", rotulo: "Tipos diferentes de auditoria" },
  { valor: "preenchimentos", rotulo: "Preenchimentos (pacientes, precauções, exames, indicadores)" },
  { valor: "pacientes", rotulo: "Pacientes cadastrados no monitoramento" },
  { valor: "alertas", rotulo: "Alertas clínicos resolvidos" },
  { valor: "alertas_criticos", rotulo: "Alertas críticos resolvidos" },
  { valor: "sequencia", rotulo: "Dias úteis seguidos com registro" },
  { valor: "dias_mes", rotulo: "Dias com registro num mesmo mês" },
];

export interface ConquistaDef {
  id: string;
  icone: string;
  nome: string;
  descricao: string;
  metrica: Metrica;
  meta: number;
  ativa: boolean;
}

export const CONQUISTAS_PADRAO: ConquistaDef[] = [
  { id: "primeira-tarefa", icone: "🎯", nome: "Primeiro passo", descricao: "Concluir a primeira tarefa do Kanban", metrica: "tarefas", meta: 1, ativa: true },
  { id: "tarefas-25", icone: "📋", nome: "Rotina em dia", descricao: "Concluir 25 tarefas do Kanban", metrica: "tarefas", meta: 25, ativa: true },
  { id: "alta-10", icone: "🚨", nome: "Linha de frente", descricao: "Concluir 10 tarefas de prioridade alta", metrica: "tarefas_alta", meta: 10, ativa: true },
  { id: "auditor-50", icone: "🔎", nome: "Olhar de campo", descricao: "Registrar 50 auditorias", metrica: "auditorias", meta: 50, ativa: true },
  { id: "auditor-500", icone: "🏅", nome: "Auditor sênior", descricao: "Registrar 500 auditorias", metrica: "auditorias", meta: 500, ativa: true },
  { id: "maos-100", icone: "🧼", nome: "Mãos que salvam", descricao: "100 auditorias de higiene das mãos", metrica: "auditorias_higiene", meta: 100, ativa: true },
  { id: "multitipos", icone: "🧭", nome: "Visão completa", descricao: "Auditar 4 tipos diferentes", metrica: "tipos_auditoria", meta: 4, ativa: true },
  { id: "preench-100", icone: "📝", nome: "Prontuário em dia", descricao: "100 preenchimentos (pacientes, precauções, exames, indicadores)", metrica: "preenchimentos", meta: 100, ativa: true },
  { id: "alertas-25", icone: "🛎️", nome: "Sentinela dos alertas", descricao: "Resolver 25 alertas clínicos", metrica: "alertas", meta: 25, ativa: true },
  { id: "criticos-10", icone: "🚑", nome: "Resposta rápida", descricao: "Resolver 10 alertas críticos", metrica: "alertas_criticos", meta: 10, ativa: true },
  { id: "sequencia-5", icone: "🔥", nome: "Em chamas", descricao: "5 dias úteis seguidos com registro", metrica: "sequencia", meta: 5, ativa: true },
  { id: "sequencia-20", icone: "⚡", nome: "Imparável", descricao: "20 dias úteis seguidos com registro", metrica: "sequencia", meta: 20, ativa: true },
  { id: "mes-15", icone: "📆", nome: "Mês de presença", descricao: "Registro em 15 dias de um mesmo mês", metrica: "dias_mes", meta: 15, ativa: true },
  { id: "pontos-5000", icone: "💎", nome: "Elite da prevenção", descricao: "Acumular 5.000 pontos", metrica: "pontos", meta: 5000, ativa: true },
];

export interface GamConfig {
  pontos: ConfigPontos;
  conquistas: ConquistaDef[];
  rankingAtivo: boolean;
}

export const CONFIG_PADRAO: GamConfig = { pontos: PONTOS_PADRAO, conquistas: CONQUISTAS_PADRAO, rankingAtivo: true };

const numero = (v: unknown, padrao: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : padrao;
};

/** Linha da tabela gamificacao_config → configuração completa (com padrões). */
export function normalizaConfig(row?: { pontos?: unknown; conquistas?: unknown; ranking_ativo?: boolean | null } | null): GamConfig {
  const p = (row?.pontos && typeof row.pontos === "object" ? row.pontos : {}) as Record<string, unknown>;
  const pontos = Object.fromEntries(
    (Object.keys(PONTOS_PADRAO) as (keyof ConfigPontos)[]).map((k) => [k, numero(p[k], PONTOS_PADRAO[k])]),
  ) as ConfigPontos;
  const metricas = new Set(METRICAS.map((m) => m.valor));
  const conquistas = Array.isArray(row?.conquistas)
    ? (row!.conquistas as Partial<ConquistaDef>[])
        .filter((c) => c && c.id && c.nome && metricas.has(c.metrica as Metrica))
        .map((c) => ({
          id: String(c.id), icone: c.icone || "🏆", nome: String(c.nome), descricao: c.descricao || "",
          metrica: c.metrica as Metrica, meta: Math.max(1, numero(c.meta, 1)), ativa: c.ativa !== false,
        }))
    : CONQUISTAS_PADRAO;
  return { pontos, conquistas, rankingAtivo: row?.ranking_ativo !== false };
}

// ── Eventos e pontos ───────────────────────────────────────────────────────

/** Contagem de uma ação: pessoa, dia (aaaa-mm-dd), tipo e quantidade. */
export interface Evento { u: string; d: string; t: string; q: number }

export function grupoDoTipo(t: string): Grupo {
  if (t.startsWith("tarefa_")) return "tarefas";
  if (t.startsWith("auditoria")) return "auditorias";
  if (t.startsWith("alerta_")) return "alertas";
  return "preenchimentos";
}

const chaveDoTipo = (t: string): ChavePonto => {
  if (t.startsWith("auditoria")) return "auditoria";
  if (t.startsWith("tarefa_")) return (["tarefa_low", "tarefa_normal", "tarefa_high"].includes(t) ? t : "tarefa_normal") as ChavePonto;
  return (t in PONTOS_PADRAO ? t : "indicador") as ChavePonto;
};

export interface Dia { dia: string; pontos: number; tarefas: number; auditorias: number; preenchimentos: number; alertas: number }

/** Pontos por dia de UMA pessoa (teto diário de auditorias e bônus de constância). */
export function pontosPorDia(eventos: Evento[], pontos: ConfigPontos): Map<string, Dia> {
  const dias = new Map<string, Dia & { audQtd: number }>();
  for (const e of eventos) {
    const d = dias.get(e.d) ?? { dia: e.d, pontos: 0, tarefas: 0, auditorias: 0, preenchimentos: 0, alertas: 0, audQtd: 0 };
    const g = grupoDoTipo(e.t);
    if (g === "auditorias") d.audQtd += e.q;
    else d[g] += e.q * pontos[chaveDoTipo(e.t)];
    dias.set(e.d, d);
  }
  const out = new Map<string, Dia>();
  for (const [k, d] of dias) {
    d.auditorias = Math.min(d.audQtd, pontos.teto_auditorias_dia) * pontos.auditoria;
    const base = d.tarefas + d.auditorias + d.preenchimentos + d.alertas;
    const { audQtd: _q, ...dia } = d;
    out.set(k, { ...dia, pontos: base + (base > 0 ? pontos.dia_ativo : 0) });
  }
  return out;
}

export interface LinhaRanking {
  id: string;
  nome: string;
  pontos: number;
  tarefas: number;
  auditorias: number;
  preenchimentos: number;
  alertas: number;
  posicao: number;
}

/** Ranking do período: quem fez pontos, do maior para o menor (empates dividem a posição). */
export function ranking(eventos: Evento[], pessoas: { id: string; nome: string }[], pontos: ConfigPontos): LinhaRanking[] {
  const porPessoa = new Map<string, Evento[]>();
  for (const e of eventos) porPessoa.set(e.u, [...(porPessoa.get(e.u) ?? []), e]);
  const nomes = new Map(pessoas.map((p) => [p.id, p.nome]));
  const linhas = [...porPessoa].map(([id, evs]) => {
    const tot = { pontos: 0, tarefas: 0, auditorias: 0, preenchimentos: 0, alertas: 0 };
    for (const d of pontosPorDia(evs, pontos).values()) {
      tot.pontos += d.pontos; tot.tarefas += d.tarefas; tot.auditorias += d.auditorias; tot.preenchimentos += d.preenchimentos; tot.alertas += d.alertas;
    }
    return { id, nome: nomes.get(id) || "Usuário removido", ...tot, posicao: 0 };
  }).filter((l) => l.pontos > 0)
    .sort((a, b) => b.pontos - a.pontos || a.nome.localeCompare(b.nome, "pt-BR"));
  linhas.forEach((l, i) => { l.posicao = i > 0 && linhas[i - 1].pontos === l.pontos ? linhas[i - 1].posicao : i + 1; });
  return linhas;
}

// ── Nível ──────────────────────────────────────────────────────────────────

export const TITULOS = [
  "Observador", "Vigilante", "Sentinela", "Guardião", "Protetor", "Estrategista",
  "Especialista", "Referência", "Mentor", "Mestre CCIH", "Lenda da Prevenção",
];

/** Pontos totais necessários para alcançar o nível n (nível 1 = 0). */
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

// ── Sequência ──────────────────────────────────────────────────────────────

/** Data local "aaaa-mm-dd". */
export function diaLocal(raw: string | Date): string {
  if (typeof raw === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = typeof raw === "string" ? new Date(raw) : raw;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const fimDeSemana = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

/**
 * Dias úteis seguidos com atividade, terminando hoje (ou no último dia útil, se
 * hoje ainda não houve registro). Fim de semana conta se houve registro e é
 * pulado se não houve.
 */
export function sequenciaAtual(diasAtivos: Set<string>, hoje = new Date()): number {
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  let seq = 0;
  if (!diasAtivos.has(diaLocal(d))) d.setDate(d.getDate() - 1);
  for (let i = 0; i < 400; i++) {
    if (diasAtivos.has(diaLocal(d))) seq++;
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
    if (diasAtivos.has(diaLocal(d))) melhor = Math.max(melhor, ++atual);
    else if (!fimDeSemana(d)) atual = 0;
    d.setDate(d.getDate() + 1);
  }
  return melhor;
}

// ── Estatísticas e conquistas de uma pessoa ────────────────────────────────

export type Estatisticas = Record<Metrica, number>;

export function estatisticas(eventos: Evento[], dias: Map<string, Dia>): Estatisticas {
  const soma = (f: (t: string) => boolean) => eventos.filter((e) => f(e.t)).reduce((s, e) => s + e.q, 0);
  const ativos = new Set([...dias.values()].filter((d) => d.pontos > 0).map((d) => d.dia));
  const porMes = new Map<string, number>();
  for (const d of ativos) porMes.set(d.slice(0, 7), (porMes.get(d.slice(0, 7)) ?? 0) + 1);
  return {
    pontos: [...dias.values()].reduce((s, d) => s + d.pontos, 0),
    tarefas: soma((t) => t.startsWith("tarefa_")),
    tarefas_alta: soma((t) => t === "tarefa_high"),
    auditorias: soma((t) => t.startsWith("auditoria")),
    auditorias_higiene: soma((t) => t === "auditoria:hand_hygiene"),
    tipos_auditoria: new Set(eventos.filter((e) => e.t.startsWith("auditoria:")).map((e) => e.t)).size,
    preenchimentos: soma((t) => grupoDoTipo(t) === "preenchimentos"),
    pacientes: soma((t) => t === "paciente_cadastro"),
    alertas: soma((t) => t.startsWith("alerta_")),
    alertas_criticos: soma((t) => t === "alerta_alta"),
    sequencia: maiorSequencia(ativos),
    dias_mes: Math.max(0, ...porMes.values()),
  };
}

export interface Conquista extends ConquistaDef { atual: number; obtida: boolean }

export function conquistas(defs: ConquistaDef[], e: Estatisticas): Conquista[] {
  return defs.filter((c) => c.ativa).map((c) => {
    const atual = e[c.metrica] ?? 0;
    return { ...c, atual: Math.min(atual, c.meta), obtida: atual >= c.meta };
  });
}

export interface ResumoGamificacao {
  xpTotal: number;
  xpMes: number;
  xpHoje: number;
  mesPorGrupo: Record<Grupo, number>;
  nivel: Nivel;
  sequencia: number;
  conquistas: Conquista[];
  estatisticas: Estatisticas;
  /** Últimos 84 dias (12 semanas), do mais antigo ao mais recente */
  mapaCalor: { dia: string; xp: number }[];
}

/** Resumo pessoal a partir dos eventos de UMA pessoa (ex.: últimos 12 meses). */
export function resumoGamificacao(eventos: Evento[], cfg: GamConfig, hoje = new Date()): ResumoGamificacao {
  const dias = pontosPorDia(eventos, cfg.pontos);
  const hojeIso = diaLocal(hoje);
  const mes = hojeIso.slice(0, 7);
  let xpTotal = 0;
  let xpMes = 0;
  const mesPorGrupo: Record<Grupo, number> = { tarefas: 0, auditorias: 0, preenchimentos: 0, alertas: 0 };
  for (const d of dias.values()) {
    xpTotal += d.pontos;
    if (d.dia.startsWith(mes)) {
      xpMes += d.pontos;
      mesPorGrupo.tarefas += d.tarefas; mesPorGrupo.auditorias += d.auditorias; mesPorGrupo.preenchimentos += d.preenchimentos; mesPorGrupo.alertas += d.alertas;
    }
  }
  const mapaCalor: { dia: string; xp: number }[] = [];
  const d = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 83);
  for (let i = 0; i < 84; i++) {
    const iso = diaLocal(d);
    mapaCalor.push({ dia: iso, xp: dias.get(iso)?.pontos ?? 0 });
    d.setDate(d.getDate() + 1);
  }
  const est = estatisticas(eventos, dias);
  const ativos = new Set([...dias.values()].filter((x) => x.pontos > 0).map((x) => x.dia));
  return {
    xpTotal,
    xpMes,
    xpHoje: dias.get(hojeIso)?.pontos ?? 0,
    mesPorGrupo,
    nivel: nivelDe(xpTotal),
    sequencia: sequenciaAtual(ativos, hoje),
    conquistas: conquistas(cfg.conquistas, est),
    estatisticas: est,
    mapaCalor,
  };
}

/** Pontos de uma tarefa concluída, pela prioridade. */
export function pontosDaTarefa(prioridade: string | null | undefined, pontos: ConfigPontos): number {
  return pontos[chaveDoTipo(`tarefa_${prioridade || "normal"}`)];
}

// ── Preferência local ──────────────────────────────────────────────────────

const CHAVE_PREF = "irascontrol-gamificacao";
export function gamificacaoAtiva(): boolean {
  try { return localStorage.getItem(CHAVE_PREF) !== "off"; } catch { return true; }
}
export function definirGamificacao(ativa: boolean) {
  try { localStorage.setItem(CHAVE_PREF, ativa ? "on" : "off"); } catch { /* sem armazenamento */ }
  window.dispatchEvent(new Event("irascontrol-gamificacao"));
}

// ── Painel do gestor ───────────────────────────────────────────────────────

export interface LinhaEquipe {
  id: string;
  nome: string;
  resumo: ResumoGamificacao;
  /** Pontos no mês anterior (para a variação) */
  mesAnterior: number;
  /** Dias com registro no mês atual */
  diasAtivosMes: number;
  /** Último dia com registro (aaaa-mm-dd) ou null */
  ultimaAtividade: string | null;
  /** Dias desde o último registro (null = nunca) */
  diasSemRegistro: number | null;
}

export interface PainelEquipe {
  pessoas: LinhaEquipe[];
  /** Pontos da equipe por mês (12 meses, do mais antigo ao atual) */
  meses: { mes: string; tarefas: number; auditorias: number; preenchimentos: number; alertas: number; total: number; ativos: number }[];
  totalMes: number;
  totalMesAnterior: number;
  ativosMes: number;
  conquistasObtidas: number;
}

const mesDe = (d: Date) => diaLocal(d).slice(0, 7);

/**
 * Visão da equipe para o gestor: resumo de cada pessoa (nível, pontos do mês,
 * conquistas, constância) e a evolução mensal da equipe. `eventos` = 12 meses
 * de toda a equipe; `pessoas` = membros do hospital (inclui quem não pontuou).
 */
export function painelEquipe(eventos: Evento[], pessoas: { id: string; nome: string }[], cfg: GamConfig, hoje = new Date()): PainelEquipe {
  const porPessoa = new Map<string, Evento[]>();
  for (const e of eventos) porPessoa.set(e.u, [...(porPessoa.get(e.u) ?? []), e]);
  const nomes = new Map(pessoas.map((p) => [p.id, p.nome]));
  const ids = new Set([...pessoas.map((p) => p.id), ...porPessoa.keys()]);

  const mesAtual = mesDe(hoje);
  const mesAnt = mesDe(new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1));
  const ultimos12 = Array.from({ length: 12 }, (_, i) => mesDe(new Date(hoje.getFullYear(), hoje.getMonth() - 11 + i, 1)));
  const meses = new Map(ultimos12.map((m) => [m, { mes: m, tarefas: 0, auditorias: 0, preenchimentos: 0, alertas: 0, total: 0, ativos: new Set<string>() }]));
  const hojeMeia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

  const linhas: LinhaEquipe[] = [...ids].map((id) => {
    const evs = porPessoa.get(id) ?? [];
    const dias = pontosPorDia(evs, cfg.pontos);
    let mesAnterior = 0;
    let diasAtivosMes = 0;
    let ultimaAtividade: string | null = null;
    for (const d of dias.values()) {
      if (d.pontos <= 0) continue;
      const m = d.dia.slice(0, 7);
      if (m === mesAnt) mesAnterior += d.pontos;
      if (m === mesAtual) diasAtivosMes++;
      if (!ultimaAtividade || d.dia > ultimaAtividade) ultimaAtividade = d.dia;
      const agg = meses.get(m);
      if (agg) {
        agg.tarefas += d.tarefas; agg.auditorias += d.auditorias; agg.preenchimentos += d.preenchimentos; agg.alertas += d.alertas;
        agg.total += d.pontos; agg.ativos.add(id);
      }
    }
    const diasSemRegistro = ultimaAtividade
      ? Math.round((hojeMeia.getTime() - new Date(`${ultimaAtividade}T00:00:00`).getTime()) / 86400000)
      : null;
    return {
      id, nome: nomes.get(id) || "Usuário removido",
      resumo: resumoGamificacao(evs, cfg, hoje),
      mesAnterior, diasAtivosMes, ultimaAtividade, diasSemRegistro,
    };
  }).sort((a, b) => b.resumo.xpMes - a.resumo.xpMes || a.nome.localeCompare(b.nome, "pt-BR"));

  const serie = ultimos12.map((m) => {
    const a = meses.get(m)!;
    return { mes: m, tarefas: a.tarefas, auditorias: a.auditorias, preenchimentos: a.preenchimentos, alertas: a.alertas, total: a.total, ativos: a.ativos.size };
  });
  return {
    pessoas: linhas,
    meses: serie,
    totalMes: serie[11].total,
    totalMesAnterior: serie[10].total,
    ativosMes: serie[11].ativos,
    conquistasObtidas: linhas.reduce((s, l) => s + l.resumo.conquistas.filter((c) => c.obtida).length, 0),
  };
}
