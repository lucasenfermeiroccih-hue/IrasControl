/**
 * Encerramento de dispositivos invasivos na saída do paciente.
 *
 * Fonte: `clinical_data.dispInvasivos` do Monitoramento, com, por tipo:
 *   {tipo}Insercao / {tipo}Retirada          → 1º dispositivo
 *   {tipo}NovaInsercao / {tipo}NovaRetirada  → legado
 *   {tipo}Trocas[] = { insercao, retirada }  → trocas
 *
 * Cada dispositivo aberto (com inserção e sem retirada) é identificado por um
 * "slot" estável, usado pela tela para coletar a data real de retirada.
 */

export const DEVICE_LABELS: Record<string, string> = {
  cvc: "CVC", cvp: "CVP", svu: "SVD", vm: "VM", tqt: "TQT",
  hemo: "Hemodiálise", picc: "PICC", cuv: "CUV", cva: "CVA",
};
export const DEVICE_KEYS = Object.keys(DEVICE_LABELS);

export interface OpenDevice {
  slot: string;      // "vm" | "vmNova" | "vmTrocas.0"
  type: string;      // "vm"
  label: string;     // "VM" / "VM (troca 1)"
  insercao: string;  // "YYYY-MM-DD"
}

/** Dispositivos do Monitoramento (`clinical_data.dispInvasivos`). */
type DispInvasivos = Record<string, unknown>;
interface Troca { insercao?: string; retirada?: string }

const day = (s: unknown): string => (s ? String(s).slice(0, 10) : "");
const asDisp = (v: unknown): DispInvasivos => (v && typeof v === "object" ? (v as DispInvasivos) : {});
const trocasOf = (di: DispInvasivos, type: string): Troca[] =>
  Array.isArray(di[`${type}Trocas`]) ? (di[`${type}Trocas`] as Troca[]) : [];

/** Dispositivos ainda abertos (com inserção e sem retirada). */
export function listOpenDevices(dispInvasivos: unknown): OpenDevice[] {
  const di = asDisp(dispInvasivos);
  const out: OpenDevice[] = [];
  for (const type of DEVICE_KEYS) {
    const label = DEVICE_LABELS[type];
    if (di[`${type}Insercao`] && !di[`${type}Retirada`]) {
      out.push({ slot: type, type, label, insercao: day(di[`${type}Insercao`]) });
    }
    if (di[`${type}NovaInsercao`] && !di[`${type}NovaRetirada`]) {
      out.push({ slot: `${type}Nova`, type, label: `${label} (nova inserção)`, insercao: day(di[`${type}NovaInsercao`]) });
    }
    trocasOf(di, type).forEach((t, i) => {
      if (t?.insercao && !t?.retirada) {
        out.push({ slot: `${type}Trocas.${i}`, type, label: `${label} (troca ${i + 1})`, insercao: day(t.insercao) });
      }
    });
  }
  return out;
}

/** Data padrão de retirada: a da saída, sem nunca ficar antes da inserção. */
export function defaultRemoval(insercao: string, dischargeDate: string): string {
  return insercao && insercao > dischargeDate ? insercao : dischargeDate;
}

/**
 * Valida as datas de retirada informadas: obrigatórias, não antes da inserção
 * e não depois da saída do paciente. Retorna a mensagem do 1º erro ou null.
 */
export function validateRemovals(
  open: OpenDevice[],
  removals: Record<string, string>,
  dischargeDate: string,
): string | null {
  const br = (s: string) => s.split("-").reverse().join("/");
  for (const d of open) {
    const r = removals[d.slot];
    if (!r) return `Informe a data de retirada do ${d.label} (inserido em ${br(d.insercao)})`;
    if (d.insercao && r < d.insercao) return `A retirada do ${d.label} não pode ser antes da inserção (${br(d.insercao)})`;
    const limite = defaultRemoval(d.insercao, dischargeDate);
    if (r > limite) return `A retirada do ${d.label} não pode ser depois da saída do paciente (${br(dischargeDate)})`;
  }
  return null;
}

/**
 * Devolve uma cópia de `dispInvasivos` com todos os dispositivos abertos
 * encerrados: na data informada em `removals[slot]` ou, sem ela, na data da saída.
 */
export function closeOpenDevices(
  dispInvasivos: unknown,
  dischargeDate: string,
  removals: Record<string, string> = {},
): DispInvasivos {
  const di: DispInvasivos = { ...asDisp(dispInvasivos) };
  for (const d of listOpenDevices(di)) {
    const when = removals[d.slot] || defaultRemoval(d.insercao, dischargeDate);
    if (d.slot === d.type) {
      di[`${d.type}Retirada`] = when;
    } else if (d.slot === `${d.type}Nova`) {
      di[`${d.type}NovaRetirada`] = when;
    } else {
      const i = Number(d.slot.split(".")[1]);
      di[`${d.type}Trocas`] = trocasOf(di, d.type).map((t, j) => (j === i ? { ...t, retirada: when } : t));
    }
  }
  return di;
}
