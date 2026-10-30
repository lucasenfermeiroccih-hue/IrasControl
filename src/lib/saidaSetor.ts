/**
 * Saída do paciente do setor monitorado (ex.: alta do CTI) sem sair do hospital.
 *
 * No Monitoramento, "Alta" é saída do hospital. "Alta para outro setor" conta
 * como saída da unidade (indicadores iguais aos da alta), mas o paciente
 * continua internado: a precaução (ou o exame MDR ainda sem precaução) passa
 * para o Mapa de Precaução no setor de destino, em vez de simplesmente acabar.
 * Funções puras, sem acesso ao banco.
 */
import { codigoOrganismo, dataISO, examesMdr } from "@/lib/precautionStatus";

export const ALTA_OUTRO_SETOR = "Alta para outro setor";

/** Tipos de saída do Monitoramento (o valor é o gravado em discharge_type). */
export const TIPOS_SAIDA: { valor: string; rotulo: string; ajuda: string }[] = [
  { valor: "Alta", rotulo: "Alta hospitalar", ajuda: "O paciente saiu do hospital." },
  { valor: ALTA_OUTRO_SETOR, rotulo: "Alta para outro setor", ajuda: "Saiu da unidade (ex.: CTI → enfermaria) e continua internado. A precaução passa para o Mapa no setor de destino." },
  { valor: "Transferência", rotulo: "Transferência para outro hospital", ajuda: "O paciente foi transferido para outra instituição." },
  { valor: "Óbito", rotulo: "Óbito", ajuda: "" },
];

export const rotuloSaida = (valor?: string | null) => TIPOS_SAIDA.find((t) => t.valor === valor)?.rotulo ?? valor ?? "";

/** discharge_type de quem saiu do setor mas continua no hospital. */
export const ehAltaOutroSetor = (tipo?: string | null) => /outro setor|transfer[eê]ncia interna/i.test(tipo || "");

export interface PrecaucaoOrigem {
  precaution_type: string;
  reason: string | null;
  start_date: string | null;
  is_active: boolean;
}

export interface PrecaucaoNova { precaution_type: string; reason: string | null; start_date: string }

/**
 * Precauções que o paciente leva para o Mapa ao sair para outro setor: as que
 * estão em vigor ou, sem nenhuma precaução avaliada, uma de Contato pelos
 * exames MDR (a mesma regra que o lista no Mapa enquanto está na unidade).
 */
export function precaucoesParaMapa(precaucoes: PrecaucaoOrigem[], labPanel: unknown, hoje: string): PrecaucaoNova[] {
  const ativas = precaucoes.filter((p) => p.is_active);
  if (ativas.length) {
    return ativas.map((p) => ({ precaution_type: p.precaution_type || "Contato", reason: p.reason, start_date: (p.start_date || hoje).slice(0, 10) }));
  }
  if (precaucoes.length) return [];
  const mdr = examesMdr(labPanel);
  if (!mdr.length) return [];
  const organismos = [...new Set(mdr.map((l) => codigoOrganismo(l.microrganismo)).filter(Boolean))];
  const datas = mdr.map((l) => dataISO(l.data)).filter(Boolean).sort();
  return [{ precaution_type: "Contato", reason: organismos.join(" | ") || null, start_date: datas[0] || hoje }];
}
