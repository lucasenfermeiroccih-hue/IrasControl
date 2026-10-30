/** Preferência local dos gráficos com volume 3D (filtros em components/Graficos3D). */
const CHAVE = "irascontrol-graficos-3d";

/** Gráficos em 3D ligados? (padrão: sim; cada pessoa pode desligar no menu do tema) */
export function graficos3dAtivos(): boolean {
  try { return localStorage.getItem(CHAVE) !== "off"; } catch { return true; }
}

export function definirGraficos3d(ativo: boolean) {
  try { localStorage.setItem(CHAVE, ativo ? "on" : "off"); } catch { /* sem armazenamento */ }
  document.documentElement.classList.toggle("graficos-3d", ativo);
  window.dispatchEvent(new Event(CHAVE));
}

export const EVENTO_GRAFICOS_3D = CHAVE;
