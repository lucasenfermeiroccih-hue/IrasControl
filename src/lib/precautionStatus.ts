/**
 * Precaução e MDR (bactéria multirresistente) de cada paciente.
 *
 * Usado pelo Monitoramento de Pacientes (selo ao lado do nome) e pelo
 * Mapeamento de Precaução (pacientes ativos do monitoramento entram no mapa
 * automaticamente). Funções puras, sem acesso ao banco.
 *
 * Fontes:
 *  - precauções ativas do paciente (tabela precautions);
 *  - painel laboratorial do monitoramento (clinical_data.labPanel, marcação MDR);
 *  - registro do mesmo paciente no Mapeamento de Precaução (mesmo prontuário).
 */

export type TipoPrecaucao = "Contato" | "Gotículas" | "Aerossóis";

export const TIPOS_PRECAUCAO: TipoPrecaucao[] = ["Aerossóis", "Gotículas", "Contato"];

/** Cores e ícones de cada precaução (mesmas do Mapeamento de Precaução). */
export const PRECAUCAO_META: Record<TipoPrecaucao, {
  icon: string; label: string; cor: string; fundo: string; texto: string; chip: string; borda: string;
}> = {
  Contato: {
    icon: "🧤", label: "Contato", cor: "#B45309", fundo: "#FFFBEB", texto: "#92400E",
    chip: "bg-amber-50 text-amber-800 border-amber-300", borda: "!border-l-amber-500",
  },
  Gotículas: {
    icon: "💧", label: "Gotículas", cor: "#1D4ED8", fundo: "#EFF6FF", texto: "#1E40AF",
    chip: "bg-blue-50 text-blue-800 border-blue-300", borda: "!border-l-blue-600",
  },
  Aerossóis: {
    icon: "🌬️", label: "Aerossóis", cor: "#B91C1C", fundo: "#FEF2F2", texto: "#991B1B",
    chip: "bg-red-50 text-red-800 border-red-300", borda: "!border-l-red-600",
  },
};

/** Cor do selo MDR (mais forte que as precauções, para chamar atenção). */
export const MDR_META = {
  label: "MDR",
  chip: "bg-fuchsia-700 text-white border-fuchsia-800",
  borda: "!border-l-fuchsia-700",
  linha: "bg-fuchsia-50/60 dark:bg-fuchsia-950/20",
  cor: "#A21CAF",
};

/** Converte um texto livre de precaução para o tipo padronizado. */
export function tipoPrecaucao(raw?: string | null): TipoPrecaucao | null {
  const s = (raw || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (!s) return null;
  if (s.includes("aeross")) return "Aerossóis";
  if (s.includes("gotic")) return "Gotículas";
  if (s.includes("contat")) return "Contato";
  return null;
}

/** Precaução mais restritiva da lista: Aerossóis > Gotículas > Contato. */
export function maisRestritiva(tipos: (TipoPrecaucao | null | undefined)[]): TipoPrecaucao | null {
  for (const t of TIPOS_PRECAUCAO) if (tipos.includes(t)) return t;
  return null;
}

/** Ordena e remove repetidos (mais restritiva primeiro). */
export function ordenaTipos(tipos: (TipoPrecaucao | null | undefined)[]): TipoPrecaucao[] {
  return TIPOS_PRECAUCAO.filter((t) => tipos.includes(t));
}

/** Precaução indicada pelo microrganismo (mesma regra do Mapeamento). */
export function precaucaoDoOrganismo(organismo?: string | null): TipoPrecaucao {
  const m = (organismo || "").toLowerCase();
  if (m.includes("tubercul") || m.includes("sars") || m.includes("covid") || m.includes("sarampo") || m.includes("varicela")) return "Aerossóis";
  if (m.includes("influenza") || m.includes("h1n1") || m.includes("meningoc") || m.includes("coqueluche")) return "Gotículas";
  return "Contato";
}

const MDR_PADRAO = /\b(mrsa|vre|erv|esbl|kpc|ndm|oxa|crab|crpa|cre|erc|mdr|xdr|pdr)\b|multirresist|multi-resist|resist[eê]nte a carbapen|resistente a vancomicina|resistente [àa] meticilina/i;

/** O texto do microrganismo/perfil indica bactéria multirresistente? */
export function textoIndicaMdr(texto?: string | null): boolean {
  return MDR_PADRAO.test(texto || "");
}

/**
 * Código do Mapeamento de Precaução para o microrganismo do monitoramento
 * (ex.: "ERC / KPC (...)" → "ERC"). Sem correspondência segura, devolve o texto.
 */
export function codigoOrganismo(texto?: string | null): string {
  const t = (texto || "").trim();
  const s = t.toLowerCase();
  if (!t) return "";
  if (/\bmrsa\b/.test(s)) return "MRSA";
  if (/\bvre\b|\berv\b/.test(s)) return "VRE";
  if (/\bndm\b/.test(s)) return "NDM";
  if (/\bkpc\b/.test(s) && /klebsiella/.test(s) && !/\berc\b/.test(s)) return "KPC-KP";
  if (/\berc\b|\bcre\b|\bkpc\b/.test(s)) return "ERC";
  if (/\besbl\b/.test(s)) {
    if (/coli/.test(s)) return "ESBL-EC";
    if (/klebsiella/.test(s)) return "ESBL-KP";
    return "ESBL";
  }
  if (/\bcrab\b/.test(s)) return "CRAB";
  if (/\bcrpa\b/.test(s)) return "CRPA";
  if (/difficile/.test(s)) return "CDIFF";
  return t;
}

export interface LabPanelEntry {
  exame?: string;
  data?: string;
  microrganismo?: string;
  sensibilidade?: string;
  mdr?: boolean;
}

/** Exames do painel laboratorial marcados como MDR. */
export function examesMdr(labPanel: unknown): LabPanelEntry[] {
  if (!Array.isArray(labPanel)) return [];
  return (labPanel as LabPanelEntry[]).filter((l) => l && l.mdr === true);
}

/** "dd/mm/aaaa" ou "aaaa-mm-dd" → "aaaa-mm-dd" (vazio se inválida). */
export function dataISO(raw?: string | null): string {
  const s = (raw || "").trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const iso = s.match(/^(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : "";
}

/** Prontuário para comparação (só dígitos e letras, sem zeros à esquerda). */
export function chaveProntuario(raw?: string | null): string {
  return (raw || "").replace(/[^0-9a-z]/gi, "").replace(/^0+/, "").toUpperCase();
}

/** Nome para comparação (sem acento, espaços e caixa). */
export function chaveNome(raw?: string | null): string {
  return (raw || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toUpperCase();
}

export interface PrecaucaoAtiva {
  patient_id: string;
  precaution_type: string;
  reason?: string | null;
  start_date?: string | null;
}

export interface SituacaoIsolamento {
  /** Precauções em vigor (mais restritiva primeiro) */
  precaucoes: TipoPrecaucao[];
  /** Bactéria multirresistente identificada */
  mdr: boolean;
  /** Microrganismos que justificam (MDR ou motivo da precaução) */
  organismos: string[];
  /** Desde quando (data mais antiga entre precaução e exame) */
  desde: string | null;
  /** O paciente também está cadastrado no Mapeamento de Precaução */
  noMapa: boolean;
}

export const SEM_ISOLAMENTO: SituacaoIsolamento = { precaucoes: [], mdr: false, organismos: [], desde: null, noMapa: false };

const separa = (s?: string | null) => (s || "").split("|").map((x) => x.trim().replace(/^Outros:\s*/i, "")).filter(Boolean);

/**
 * Situação de isolamento de um paciente do monitoramento.
 * `ativo` = paciente internado: só então as precauções contam como em vigor;
 * o selo MDR vale também para o histórico (alta, óbito, transferência).
 */
export function situacaoIsolamento(args: {
  ativo: boolean;
  labPanel?: unknown;
  precaucoes?: PrecaucaoAtiva[];
  /** Precauções ativas do registro do mesmo paciente no Mapeamento */
  precaucoesMapa?: PrecaucaoAtiva[];
}): SituacaoIsolamento {
  const mdrLabs = examesMdr(args.labPanel);
  const proprias = args.ativo ? args.precaucoes ?? [] : [];
  const doMapa = args.ativo ? args.precaucoesMapa ?? [] : [];
  const todas = [...proprias, ...doMapa];

  const organismosMapa = doMapa.flatMap((p) => separa(p.reason));
  const mdr = mdrLabs.length > 0 || organismosMapa.some(textoIndicaMdr);
  const tipos = todas.map((p) => tipoPrecaucao(p.precaution_type));
  // MDR em paciente internado sem precaução registrada: contato (padrão para MDR)
  if (args.ativo && mdrLabs.length > 0 && tipos.every((t) => !t)) tipos.push("Contato");

  const organismos = [...new Set([
    ...mdrLabs.map((l) => (l.microrganismo || "").trim()).filter(Boolean),
    ...proprias.flatMap((p) => separa(p.reason)),
    ...organismosMapa,
  ])];

  const datas = [
    ...todas.map((p) => p.start_date || ""),
    ...mdrLabs.map((l) => dataISO(l.data)),
  ].filter(Boolean).sort();

  return {
    precaucoes: ordenaTipos(tipos),
    mdr,
    organismos,
    desde: datas[0] ?? null,
    noMapa: doMapa.length > 0,
  };
}

/**
 * Classes da borda esquerda da linha do paciente internado: MDR (magenta) ou a
 * precaução mais restritiva. Com "!" para valer também na última linha da tabela.
 */
export function bordaIsolamento(s: SituacaoIsolamento, internado = true): string {
  if (internado && s.mdr) return `!border-l-4 ${MDR_META.borda}`;
  if (internado && s.precaucoes.length) return `!border-l-4 ${PRECAUCAO_META[s.precaucoes[0]].borda}`;
  return "!border-l-4 !border-l-transparent";
}
