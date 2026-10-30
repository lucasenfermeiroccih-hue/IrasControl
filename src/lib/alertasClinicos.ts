/**
 * Alertas clínicos do Monitoramento de Pacientes e do Mapa de Precaução.
 *
 * Regras simples, só para pacientes internados, a partir do que já está
 * registrado (painel laboratorial, precauções, dispositivos invasivos,
 * antimicrobianos e datas). Funções puras, sem acesso ao banco.
 */
import { listOpenDevices } from "@/lib/deviceClosure";
import { dataISO, examesMdr, type SituacaoIsolamento } from "@/lib/precautionStatus";

export type Gravidade = "alta" | "media" | "info";

export type TipoAlerta =
  | "mdr_sem_precaucao" | "mdr_recente" | "aerossois" | "goticulas"
  | "dispositivo" | "antimicrobiano" | "internacao" | "saida_pendente" | "precaucao_longa" | "sem_leito";

export const TIPOS_ALERTA: Record<TipoAlerta, { rotulo: string; icone: string }> = {
  mdr_sem_precaucao: { rotulo: "MDR sem precaução", icone: "🦠" },
  mdr_recente: { rotulo: "Exame MDR novo", icone: "🧫" },
  aerossois: { rotulo: "Aerossóis", icone: "🌬️" },
  goticulas: { rotulo: "Gotículas", icone: "💧" },
  dispositivo: { rotulo: "Dispositivo prolongado", icone: "🩺" },
  antimicrobiano: { rotulo: "Antimicrobiano 7+ dias", icone: "💊" },
  internacao: { rotulo: "Internação prolongada", icone: "🛏️" },
  saida_pendente: { rotulo: "Saída a registrar", icone: "🚪" },
  precaucao_longa: { rotulo: "Precaução 30+ dias", icone: "⏳" },
  sem_leito: { rotulo: "Sem leito informado", icone: "❓" },
};

export interface AlertaClinico {
  id: string;
  tipo: TipoAlerta;
  gravidade: Gravidade;
  pacienteId: string;
  paciente: string;
  local: string;
  titulo: string;
  detalhe: string;
}

/** Prazos (dias) a partir dos quais o alerta aparece; o dobro vira gravidade alta. */
export const LIMITES = {
  dispositivo: { cvc: 7, picc: 7, cva: 7, hemo: 7, svu: 5, vm: 5, tqt: 30, cvp: 4, cuv: 7 } as Record<string, number>,
  antimicrobiano: 7,
  internacao: 30,
  mdrRecente: 3,
  precaucaoLonga: 30,
};

const ORDEM: Record<Gravidade, number> = { alta: 0, media: 1, info: 2 };

/** Dias inteiros entre a data (aaaa-mm-dd ou dd/mm/aaaa) e hoje; null se inválida. */
export function diasDesde(data: string | null | undefined, hoje = new Date()): number | null {
  const iso = dataISO(data || "");
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  const h = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.floor((h.getTime() - d.getTime()) / 86400000);
}

export function ordenarAlertas(a: AlertaClinico[]): AlertaClinico[] {
  return [...a].sort((x, y) => ORDEM[x.gravidade] - ORDEM[y.gravidade] || x.paciente.localeCompare(y.paciente, "pt-BR"));
}

export interface PacienteMonitorado {
  id: string;
  nome: string;
  setor: string;
  leito: string;
  internado: boolean;
  dataInternacao?: string;
  clinical?: { labPanel?: unknown; dispInvasivos?: unknown; antibioticos?: { nome?: string; dataInicio?: string; dataFim?: string }[] } | null;
  isolamento: SituacaoIsolamento;
  /** Precauções registradas de fato (do paciente e do mesmo paciente no Mapa) */
  precaucoesRegistradas: number;
}

/** Alertas de um paciente do Monitoramento. */
export function alertasDoPaciente(p: PacienteMonitorado, hoje = new Date()): AlertaClinico[] {
  if (!p.internado) return [];
  const local = [p.setor, p.leito && `Leito ${p.leito}`].filter(Boolean).join(" · ");
  const base = { pacienteId: p.id, paciente: p.nome, local };
  const out: AlertaClinico[] = [];
  const add = (tipo: TipoAlerta, gravidade: Gravidade, titulo: string, detalhe: string, chave = "") =>
    out.push({ id: `${p.id}:${tipo}${chave}`, tipo, gravidade, titulo, detalhe, ...base });

  const mdr = examesMdr(p.clinical?.labPanel);
  if (p.isolamento.mdr && p.precaucoesRegistradas === 0) {
    add("mdr_sem_precaucao", "alta", "MDR sem precaução registrada",
      `${p.isolamento.organismos.join(", ") || "Microrganismo multirresistente"} — registrar precaução de contato.`);
  }
  const recente = mdr
    .map((l) => ({ l, dias: diasDesde(l.data, hoje) }))
    .filter((x) => x.dias !== null && x.dias >= 0 && x.dias <= LIMITES.mdrRecente)
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0))[0];
  if (recente) {
    add("mdr_recente", "alta", "Exame MDR novo",
      `${recente.l.microrganismo || "MDR"} (${recente.l.exame || "exame"}) ${recente.dias === 0 ? "hoje" : `há ${recente.dias} dia(s)`} — conferir isolamento e notificar.`);
  }
  if (p.isolamento.precaucoes.includes("Aerossóis")) {
    add("aerossois", "alta", "Precaução por aerossóis", "Quarto privativo (pressão negativa se disponível), máscara N95/PFF2 para a equipe.");
  } else if (p.isolamento.precaucoes.includes("Gotículas")) {
    add("goticulas", "media", "Precaução por gotículas", "Quarto privativo ou coorte; máscara cirúrgica a menos de 1 metro.");
  }

  for (const d of listOpenDevices(p.clinical?.dispInvasivos)) {
    const limite = LIMITES.dispositivo[d.type] ?? 10;
    const dias = diasDesde(d.insercao, hoje);
    if (dias !== null && dias >= limite) {
      add("dispositivo", dias >= limite * 2 ? "alta" : "media", `${d.label} há ${dias} dias`,
        "Avaliar diariamente a necessidade de manter o dispositivo (bundle de prevenção).", `:${d.slot}`);
    }
  }
  (p.clinical?.antibioticos || []).forEach((a, i) => {
    if (a?.dataFim) return;
    const dias = diasDesde(a?.dataInicio, hoje);
    if (dias !== null && dias >= LIMITES.antimicrobiano) {
      add("antimicrobiano", dias >= LIMITES.antimicrobiano * 2 ? "alta" : "media", `${a.nome || "Antimicrobiano"} há ${dias} dias`,
        "Sem data de término — reavaliar indicação, culturas e duração (stewardship).", `:${i}`);
    }
  });
  const dInt = diasDesde(p.dataInternacao, hoje);
  if (dInt !== null && dInt >= LIMITES.internacao) {
    add("internacao", "info", `Internado há ${dInt} dias`, "Internação prolongada aumenta o risco de IRAS e de colonização por MDR.");
  }
  return out;
}

export interface PacienteMapa {
  id: string;
  nome: string;
  setor: string;
  leito: string;
  internado: boolean;
  precaucao: string;
  organismo: string;
  dataColeta?: string;
  /** Saída já registrada no Monitoramento e ainda internado no mapa */
  saidaMonitoramento?: { status: string; data: string };
}

/** Alertas de um paciente do Mapa de Precaução. */
export function alertasDoMapa(p: PacienteMapa, hoje = new Date()): AlertaClinico[] {
  if (!p.internado) return [];
  const local = [p.setor, p.leito && `Leito ${p.leito}`].filter(Boolean).join(" · ");
  const base = { pacienteId: p.id, paciente: p.nome, local };
  const out: AlertaClinico[] = [];
  const add = (tipo: TipoAlerta, gravidade: Gravidade, titulo: string, detalhe: string) =>
    out.push({ id: `${p.id}:${tipo}`, tipo, gravidade, titulo, detalhe, ...base });

  if (p.saidaMonitoramento) {
    add("saida_pendente", "alta", `${p.saidaMonitoramento.status} no Monitoramento`,
      `Saída em ${dataISO(p.saidaMonitoramento.data).split("-").reverse().join("/")} — registrar também no mapa e encerrar a precaução.`);
  }
  if (p.precaucao === "Aerossóis") {
    add("aerossois", "alta", "Precaução por aerossóis", `${p.organismo || "Agente"} — quarto privativo e N95/PFF2.`);
  } else if (p.precaucao === "Gotículas") {
    add("goticulas", "media", "Precaução por gotículas", `${p.organismo || "Agente"} — quarto privativo ou coorte.`);
  }
  if (!p.leito?.trim()) add("sem_leito", "media", "Leito não informado", "Informe o leito para o mapa e a sinalização na porta.");
  const dias = diasDesde(p.dataColeta, hoje);
  if (dias !== null && dias >= LIMITES.precaucaoLonga) {
    add("precaucao_longa", "info", `Em precaução há ${dias} dias`, "Reavaliar critérios de manutenção ou suspensão da precaução.");
  }
  return out;
}

export function contarPorGravidade(alertas: AlertaClinico[]): Record<Gravidade, number> {
  const c: Record<Gravidade, number> = { alta: 0, media: 0, info: 0 };
  for (const a of alertas) c[a.gravidade]++;
  return c;
}

// ── Histórico (visto / resolvido) ──────────────────────────────────────────

export type StatusTratativa = "visto" | "resolvido";
export type OrigemAlerta = "monitoramento" | "mapa" | "dashboard";

/** Linha da tabela alertas_tratativas. */
export interface Tratativa {
  id: string;
  hospital_id: string;
  paciente_id: string | null;
  alerta_chave: string;
  origem: OrigemAlerta;
  tipo: TipoAlerta;
  gravidade: Gravidade;
  titulo: string;
  local: string | null;
  status: StatusTratativa;
  observacao: string | null;
  user_id: string | null;
  user_nome: string | null;
  created_at: string;
}

/**
 * Por quantos dias (contando hoje) um alerta resolvido some da lista. Os que
 * pedem reavaliação diária (dispositivo, antimicrobiano) voltam no dia seguinte
 * se a condição continuar.
 */
export const DIAS_OCULTO: Record<TipoAlerta, number> = {
  mdr_sem_precaucao: 1, mdr_recente: 3, aerossois: 7, goticulas: 7, dispositivo: 1,
  antimicrobiano: 1, internacao: 7, saida_pendente: 1, precaucao_longa: 7, sem_leito: 1,
};

/** Sugestões rápidas de conduta ao resolver, por tipo de alerta. */
export const CONDUTAS: Record<TipoAlerta, string[]> = {
  mdr_sem_precaucao: ["Precaução de contato instituída", "Equipe orientada", "Placa de sinalização na porta"],
  mdr_recente: ["Isolamento conferido", "Notificação realizada", "Equipe assistencial comunicada"],
  aerossois: ["Quarto privativo confirmado", "N95/PFF2 disponível", "Equipe orientada"],
  goticulas: ["Quarto privativo/coorte confirmado", "Máscara cirúrgica disponível", "Equipe orientada"],
  dispositivo: ["Dispositivo retirado", "Mantido — indicação justificada", "Bundle conferido"],
  antimicrobiano: ["Data de término definida", "Discutido com o prescritor", "Escalonamento/descalonamento"],
  internacao: ["Caso discutido com a equipe", "Plano de alta revisado"],
  saida_pendente: ["Saída registrada no mapa", "Precaução encerrada"],
  precaucao_longa: ["Precaução mantida — critério presente", "Precaução suspensa"],
  sem_leito: ["Leito informado"],
};

const diaLocalIso = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/**
 * Separa os alertas ainda pendentes dos já resolvidos (dentro do prazo de
 * DIAS_OCULTO) e devolve o último "visto" de cada alerta pendente.
 */
export function situacaoDosAlertas(alertas: AlertaClinico[], tratativas: Tratativa[], hoje = new Date()) {
  const ultimoResolvido = new Map<string, Tratativa>();
  const ultimoVisto = new Map<string, Tratativa>();
  for (const t of tratativas) {
    const m = t.status === "resolvido" ? ultimoResolvido : ultimoVisto;
    const atual = m.get(t.alerta_chave);
    if (!atual || t.created_at > atual.created_at) m.set(t.alerta_chave, t);
  }
  const pendentes: AlertaClinico[] = [];
  const resolvidos: AlertaClinico[] = [];
  for (const a of alertas) {
    const r = ultimoResolvido.get(a.id);
    const dias = r ? diasDesde(diaLocalIso(r.created_at), hoje) : null;
    if (r && dias !== null && dias < DIAS_OCULTO[a.tipo]) resolvidos.push(a);
    else pendentes.push(a);
  }
  const vistos = new Map<string, Tratativa>();
  for (const a of pendentes) {
    const v = ultimoVisto.get(a.id);
    const r = ultimoResolvido.get(a.id);
    // "Visto" vale para o dia em que foi dado e só se for posterior à última resolução
    if (v && diasDesde(diaLocalIso(v.created_at), hoje) === 0 && (!r || v.created_at > r.created_at)) vistos.set(a.id, v);
  }
  return { pendentes, resolvidos, vistos };
}
