/**
 * Fórmulas logísticas oficiais do módulo CCIH — Higiene, Limpeza, Estoque e Logística.
 * Cobertura operacional padrão: 20 dias | Segurança: 5 dias | Alvo: 25 dias | Lead time: 7 dias
 */

export const DEFAULT_PARAMS = {
  coberturaOperacional: 20,
  diasSeguranca: 5,
  estoqueAlvoDias: 25,
  leadTimePadrao: 7,
  janelaAlertaDias: 10,
  abcLimiteA: 80,
  abcLimiteB: 95,
};

export type LogisticsParams = typeof DEFAULT_PARAMS;

export type OperationalStatus =
  | "PEDIR_AGORA"
  | "PEDIR_EM_X_DIAS"
  | "ESTOQUE_ADEQUADO"
  | "EXCESSO"
  | "SEM_CONSUMO_HISTORICO"
  | "VALIDAR_NECESSIDADE_PONTUAL"
  | "RISCO_DE_RUPTURA"
  | "BLOQUEAR_COMPRA";

export const STATUS_META: Record<
  OperationalStatus,
  { label: string; className: string; dot: string }
> = {
  PEDIR_AGORA: { label: "Pedir Agora", className: "bg-destructive/15 text-destructive border-destructive/30", dot: "🔴" },
  RISCO_DE_RUPTURA: { label: "Risco de Ruptura", className: "bg-orange-500/15 text-orange-600 border-orange-500/30", dot: "🟠" },
  PEDIR_EM_X_DIAS: { label: "Pedir em breve", className: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30", dot: "🟡" },
  ESTOQUE_ADEQUADO: { label: "Estoque Adequado", className: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30", dot: "🟢" },
  EXCESSO: { label: "Excesso", className: "bg-blue-500/15 text-blue-600 border-blue-500/30", dot: "🔵" },
  SEM_CONSUMO_HISTORICO: { label: "Sem Consumo", className: "bg-muted text-muted-foreground border-border", dot: "⚪" },
  VALIDAR_NECESSIDADE_PONTUAL: { label: "Validar Necessidade", className: "bg-muted text-muted-foreground border-border", dot: "⚪" },
  BLOQUEAR_COMPRA: { label: "Bloquear Compra", className: "bg-zinc-500/15 text-zinc-600 border-zinc-500/30", dot: "⛔" },
};

export interface ProductLike {
  codigo: string;
  nome: string;
  categoria: string;
  estoqueVigente: number;
  cmm: number;
  custoUnitario: number;
  leadTime?: number;
  diasSeguranca?: number;
  estoqueAlvoDias?: number;
  curvaABC?: "A" | "B" | "C";
  criticidade?: "Alta" | "Média" | "Baixa";
  status?: "Ativo" | "Inativo" | "Bloqueado" | "Fora da grade";
  pedidoMes?: number;
}

export interface LogisticsMetrics {
  cmm: number;
  cmd: number;
  coberturaAtual: number;
  estoque20: number;
  estoqueSeguranca5: number;
  estoqueAlvo25: number;
  pontoPedidoQtd: number;
  pontoPedidoDias: number;
  diasAtePedir: number;
  compraTecnica: number;
  valorConsumoMensal: number;
  valorCompraSugerida: number;
  diferencaPedidoTecnico: number;
  status: OperationalStatus;
}

const round = (n: number, d = 2) => (Number.isFinite(n) ? Number(n.toFixed(d)) : 0);

/** CMM = média do consumo mensal histórico (últimos 6 meses quando disponível) */
export function calcCMM(historico: number[] = []): number {
  const serie = historico.slice(-6).filter((v) => Number.isFinite(v));
  if (!serie.length) return 0;
  return round(serie.reduce((a, b) => a + b, 0) / serie.length);
}

export function computeMetrics(p: ProductLike, params: LogisticsParams = DEFAULT_PARAMS): LogisticsMetrics {
  const leadTime = p.leadTime ?? params.leadTimePadrao;
  const diasSeg = p.diasSeguranca ?? params.diasSeguranca;
  const alvoDias = p.estoqueAlvoDias ?? params.estoqueAlvoDias;

  const cmm = p.cmm ?? 0;
  const cmd = round(cmm / 30, 3);
  const coberturaAtual = cmd > 0 ? round(p.estoqueVigente / cmd, 1) : 0;
  const estoque20 = round(cmd * params.coberturaOperacional);
  const estoqueSeguranca5 = round(cmd * diasSeg);
  const estoqueAlvo25 = round(cmd * alvoDias);
  const pontoPedidoQtd = round(cmd * (leadTime + diasSeg));
  const pontoPedidoDias = leadTime + diasSeg;
  const diasAtePedir = round(coberturaAtual - pontoPedidoDias, 1);
  const compraTecnica = round(Math.max(0, estoqueAlvo25 - p.estoqueVigente));
  const valorConsumoMensal = round(cmm * p.custoUnitario);
  const valorCompraSugerida = round(compraTecnica * p.custoUnitario);
  const diferencaPedidoTecnico = round((p.pedidoMes ?? 0) - compraTecnica);

  let status: OperationalStatus;
  if (p.status === "Fora da grade" || p.status === "Bloqueado") {
    status = "BLOQUEAR_COMPRA";
  } else if (cmd === 0) {
    status = (p.pedidoMes ?? 0) > 0 ? "VALIDAR_NECESSIDADE_PONTUAL" : "SEM_CONSUMO_HISTORICO";
  } else if ((p.curvaABC === "A" || p.criticidade === "Alta") && coberturaAtual < leadTime) {
    status = "RISCO_DE_RUPTURA";
  } else if (coberturaAtual <= pontoPedidoDias) {
    status = "PEDIR_AGORA";
  } else if (coberturaAtual <= pontoPedidoDias + params.janelaAlertaDias) {
    status = "PEDIR_EM_X_DIAS";
  } else if (coberturaAtual > alvoDias) {
    status = "EXCESSO";
  } else {
    status = "ESTOQUE_ADEQUADO";
  }

  return {
    cmm, cmd, coberturaAtual, estoque20, estoqueSeguranca5, estoqueAlvo25,
    pontoPedidoQtd, pontoPedidoDias, diasAtePedir, compraTecnica,
    valorConsumoMensal, valorCompraSugerida, diferencaPedidoTecnico, status,
  };
}

/** Classifica a curva ABC pelo valor de consumo mensal (Pareto acumulado). */
export function buildAbcCurve<T extends ProductLike>(
  products: T[],
  params: LogisticsParams = DEFAULT_PARAMS,
) {
  const rows = products
    .map((p) => ({ product: p, valor: round(p.cmm * p.custoUnitario) }))
    .sort((a, b) => b.valor - a.valor);
  const total = rows.reduce((s, r) => s + r.valor, 0) || 1;
  let acc = 0;
  return rows.map((r, i) => {
    const pct = round((r.valor / total) * 100);
    acc = round(acc + pct);
    const classe: "A" | "B" | "C" =
      acc <= params.abcLimiteA ? "A" : acc <= params.abcLimiteB ? "B" : "C";
    return {
      ranking: i + 1,
      product: r.product,
      valor: r.valor,
      percentual: pct,
      acumulado: acc,
      classe,
      recomendacao: RECOMENDACAO_ABC[classe],
    };
  });
}

export const RECOMENDACAO_ABC: Record<"A" | "B" | "C", string> = {
  A: "Controle rigoroso: contagem semanal, ponto de pedido monitorado diariamente.",
  B: "Controle intermediário: contagem quinzenal e revisão mensal do pedido.",
  C: "Controle simplificado: contagem mensal e compra por lote maior.",
};

/** Projeção "dente de serra": 30 dias passados + 30 dias projetados. */
export function buildSawtooth(p: ProductLike, params: LogisticsParams = DEFAULT_PARAMS) {
  const m = computeMetrics(p, params);
  const leadTime = p.leadTime ?? params.leadTimePadrao;
  const hoje = new Date();
  const pontos: {
    dia: number; label: string; saldo: number; pontoPedido: number; seguranca: number;
    ciclo: number | null; proximoCiclo: number | null;
  }[] = [];

  const diasAteRuptura = m.cmd > 0 ? Math.floor(p.estoqueVigente / m.cmd) : 999;
  const diaPedido = Math.max(0, Math.round(m.diasAtePedir));
  const diaChegada = diaPedido + leadTime;

  for (let d = -30; d <= 30; d++) {
    const data = new Date(hoje);
    data.setDate(hoje.getDate() + d);
    let saldo: number;
    if (d <= 0) {
      saldo = round(p.estoqueVigente + Math.abs(d) * m.cmd);
    } else {
      saldo = round(Math.max(0, p.estoqueVigente - d * m.cmd));
      if (d >= diaChegada) saldo = round(Math.max(0, m.estoqueAlvo25 - (d - diaChegada) * m.cmd));
    }
    pontos.push({
      dia: d,
      label: data.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      saldo,
      pontoPedido: m.pontoPedidoQtd,
      seguranca: m.estoqueSeguranca5,
      ciclo: d >= 0 && d <= diaChegada ? saldo : null,
      proximoCiclo: d >= diaChegada ? saldo : null,
    });
  }

  const addDays = (n: number) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + n);
    return d;
  };

  return {
    metrics: m,
    pontos,
    diasAteRuptura,
    dataPedido: addDays(diaPedido),
    dataChegada: addDays(diaChegada),
    estoqueNaChegada: round(Math.max(0, p.estoqueVigente - diaChegada * m.cmd)),
    riscoRuptura: diasAteRuptura < diaChegada,
    diaPedido,
    diaChegada,
  };
}

export const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const FORMULA_TIPS: Record<string, string> = {
  cmm: "CMM = média do consumo mensal dos últimos 6 meses registrados.",
  cmd: "CMD = CMM ÷ 30 (consumo médio diário).",
  cobertura: "Cobertura (dias) = estoque vigente ÷ CMD.",
  pontoPedido: "Ponto de pedido (qtd) = CMD × (lead time + dias de segurança).",
  pontoPedidoDias: "Ponto de pedido (dias) = lead time + dias de segurança.",
  estoqueAlvo: "Estoque alvo = CMD × 25 dias (20 operacionais + 5 de segurança).",
  compraTecnica: "Compra técnica = máx(0; estoque alvo 25 dias − estoque vigente).",
  diasAtePedir: "Dias até pedir = cobertura atual − ponto de pedido (dias).",
  valorConsumo: "Valor consumo mensal = CMM × custo unitário.",
};
