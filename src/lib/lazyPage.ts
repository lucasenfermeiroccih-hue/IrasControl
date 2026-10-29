import { lazy, type ComponentType } from "react";

const CHAVE_RECARGA = "irascontrol-recarregou-chunk";

/**
 * Carrega a tela sob demanda (cada tela vira um arquivo separado no build).
 * Se o arquivo não existir mais (nova versão publicada com a aba aberta),
 * recarrega a página uma vez para buscar a versão atual.
 */
export function lazyPage<T extends ComponentType<unknown>>(importar: () => Promise<{ default: T }>) {
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
