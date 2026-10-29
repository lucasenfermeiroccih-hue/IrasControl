export const EVENTO_XP = "irascontrol-xp";

/** Mostra o "+XP" flutuante no selo de nível do cabeçalho. */
export function celebrarXp(xp: number) {
  window.dispatchEvent(new CustomEvent(EVENTO_XP, { detail: xp }));
}
