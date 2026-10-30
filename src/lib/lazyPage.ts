import { lazy, type ComponentType } from "react";

const CHAVE_RECARGA = "irascontrol-recarregou-chunk";

/** Todas as telas sob demanda, para pré-carregar quando o navegador estiver ocioso. */
const importadores: (() => Promise<unknown>)[] = [];

/**
 * Carrega a tela sob demanda (cada tela vira um arquivo separado no build).
 * Se o arquivo não existir mais (nova versão publicada com a aba aberta),
 * recarrega a página uma vez para buscar a versão atual.
 */
export function lazyPage<T extends ComponentType<unknown>>(importar: () => Promise<{ default: T }>) {
  importadores.push(importar);
  return lazy(async () => {
    try {
      const mod = await importar();
      sessionStorage.removeItem(CHAVE_RECARGA);
      return mod;
    } catch (erro) {
      if (!sessionStorage.getItem(CHAVE_RECARGA)) {
        sessionStorage.setItem(CHAVE_RECARGA, "1");
        window.location.reload();
        return new Promise<{ default: T }>(() => {});
      }
      throw erro;
    }
  });
}

let iniciado = false;

/**
 * Baixa as demais telas em segundo plano, uma de cada vez e só com o navegador
 * ocioso: depois de alguns segundos, trocar de tela fica instantâneo. Não roda
 * em conexão lenta ou com economia de dados ligada.
 */
export function precarregarPaginas(atrasoMs = 2500) {
  if (iniciado || typeof window === "undefined") return;
  iniciado = true;
  const conexao = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
  if (conexao?.saveData || /(^|-)2g$/.test(conexao?.effectiveType || "")) return;

  const ocioso = (fn: () => void) =>
    "requestIdleCallback" in window
      ? (window as Window & { requestIdleCallback: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback(fn, { timeout: 3000 })
      : setTimeout(fn, 200);

  const fila = [...importadores];
  const proximo = () => {
    const importar = fila.shift();
    if (!importar) return;
    importar().catch(() => { /* tenta de novo quando a tela for aberta */ }).finally(() => ocioso(proximo));
  };
  setTimeout(() => ocioso(proximo), atrasoMs);
}
