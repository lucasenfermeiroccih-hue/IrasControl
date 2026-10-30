import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCw } from "lucide-react";

/** De quanto em quanto tempo a aba aberta confere se saiu versão nova. */
const INTERVALO_MS = 5 * 60 * 1000;
/** Intervalo mínimo entre conferências disparadas por foco ou troca de tela. */
const MINIMO_MS = 60 * 1000;

async function versaoPublicada(): Promise<string | null> {
  try {
    const r = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!r.ok) return null;
    const j = (await r.json()) as { versao?: string };
    return j.versao || null;
  } catch {
    return null;
  }
}

/**
 * O sistema é uma página única: a aba aberta continua com a versão que baixou.
 * Aqui ela confere /version.json (a cada 5 min, ao voltar para a aba e ao
 * trocar de tela). Havendo versão nova, mostra o aviso para atualizar e, na
 * próxima troca de tela, recarrega sozinha — nesse momento a tela anterior já
 * foi fechada, então nada que estava sendo digitado se perde.
 */
export function AvisoNovaVersao() {
  const { pathname } = useLocation();
  const [nova, setNova] = useState(false);
  const ultima = useRef(0);
  const caminho = useRef(pathname);

  const conferir = async (forcar = false) => {
    if (__APP_VERSION__ === "dev" || nova) return;
    if (!forcar && Date.now() - ultima.current < MINIMO_MS) return;
    ultima.current = Date.now();
    const publicada = await versaoPublicada();
    if (publicada && publicada !== __APP_VERSION__) setNova(true);
  };

  useEffect(() => {
    const id = window.setInterval(() => conferir(true), INTERVALO_MS);
    const aoVoltar = () => { if (document.visibilityState === "visible") conferir(); };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    // Página restaurada do cache do navegador (botão voltar): confere já
    const aoMostrar = (e: PageTransitionEvent) => { if (e.persisted) conferir(true); };
    window.addEventListener("pageshow", aoMostrar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
      window.removeEventListener("pageshow", aoMostrar);
    };
  }, [nova]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (caminho.current === pathname) return;
    caminho.current = pathname;
    // Versão nova já detectada: a troca de tela vira um carregamento completo
    if (nova) { window.location.reload(); return; }
    conferir();
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!nova) return null;
  return (
    <div role="status" aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-primary/40 bg-card px-4 py-3 text-sm shadow-[0_10px_30px_-10px_rgb(0_0_0/0.35)] sm:inset-x-auto sm:right-4">
      <RefreshCw className="h-5 w-5 shrink-0 text-primary" />
      <span className="min-w-0 flex-1">
        <strong className="block">Nova versão do IRASControl</strong>
        <span className="text-xs text-muted-foreground">Salve o que estiver fazendo e atualize.</span>
      </span>
      <button type="button" onClick={() => window.location.reload()}
        className="btn-3d btn-3d-brilho shrink-0 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground">
        Atualizar
      </button>
    </div>
  );
}
