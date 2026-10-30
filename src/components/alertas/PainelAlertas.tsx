import { useMemo, useState } from "react";
import { BellRing, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  TIPOS_ALERTA, contarPorGravidade, ordenarAlertas, type AlertaClinico, type Gravidade, type TipoAlerta,
} from "@/lib/alertasClinicos";

const ESTILO: Record<Gravidade, { borda: string; fundo: string; ponto: string; rotulo: string; chip: string }> = {
  alta: {
    borda: "border-l-red-500", fundo: "bg-red-50/70 dark:bg-red-500/10", ponto: "bg-red-500",
    rotulo: "Crítico", chip: "bg-red-600 text-white",
  },
  media: {
    borda: "border-l-amber-500", fundo: "bg-amber-50/70 dark:bg-amber-500/10", ponto: "bg-amber-500",
    rotulo: "Atenção", chip: "bg-amber-500 text-amber-950",
  },
  info: {
    borda: "border-l-sky-500", fundo: "bg-sky-50/70 dark:bg-sky-500/10", ponto: "bg-sky-500",
    rotulo: "Informativo", chip: "bg-sky-600 text-white",
  },
};

const CHAVE_ABERTO = "irascontrol-alertas-abertos";
const lerAberto = (contexto: string) => {
  try { return localStorage.getItem(`${CHAVE_ABERTO}:${contexto}`) !== "0"; } catch { return true; }
};

/**
 * Central de alertas clínicos (Monitoramento, Mapa de Precaução, Dashboard):
 * contagem por gravidade, filtro por tipo e cartões que abrem o paciente.
 */
export function PainelAlertas({ alertas, onAbrir, contexto, titulo = "Central de alertas", limite = 6 }: {
  alertas: AlertaClinico[];
  onAbrir?: (pacienteId: string) => void;
  /** Nome curto para lembrar se o painel fica aberto (ex.: "monitoramento") */
  contexto: string;
  titulo?: string;
  limite?: number;
}) {
  const [aberto, setAberto] = useState(() => lerAberto(contexto));
  const [tipo, setTipo] = useState<TipoAlerta | "todos">("todos");
  const [verTodos, setVerTodos] = useState(false);

  const ordenados = useMemo(() => ordenarAlertas(alertas), [alertas]);
  const contagem = contarPorGravidade(alertas);
  const porTipo = useMemo(() => {
    const m = new Map<TipoAlerta, number>();
    for (const a of alertas) m.set(a.tipo, (m.get(a.tipo) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [alertas]);
  const filtrados = tipo === "todos" ? ordenados : ordenados.filter((a) => a.tipo === tipo);
  const visiveis = verTodos ? filtrados : filtrados.slice(0, limite);

  const alternar = () => {
    setAberto((v) => {
      try { localStorage.setItem(`${CHAVE_ABERTO}:${contexto}`, v ? "0" : "1"); } catch { /* sem armazenamento */ }
      return !v;
    });
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-soft" aria-label={titulo}>
      <button type="button" data-plano="1" onClick={alternar}
        className="flex w-full flex-wrap items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/40">
        <span className={`relative grid h-9 w-9 place-items-center rounded-xl text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_3px_0_rgb(0_0_0/0.2)] ${contagem.alta ? "bg-red-600" : contagem.media ? "bg-amber-500" : "bg-emerald-600"}`}>
          <BellRing className="h-4 w-4" />
          {contagem.alta > 0 && <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-red-400" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-display text-base font-semibold">{titulo}</span>
          <span className="block text-xs text-muted-foreground">
            {alertas.length === 0 ? "Nenhum alerta no momento" : `${alertas.length} alerta(s) nos pacientes internados`}
          </span>
        </span>
        <span className="flex items-center gap-1.5">
          {(["alta", "media", "info"] as Gravidade[]).map((g) => contagem[g] > 0 && (
            <span key={g} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ESTILO[g].chip}`}>
              {contagem[g]} {ESTILO[g].rotulo.toLowerCase()}
            </span>
          ))}
          {aberto ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        </span>
      </button>

      {aberto && alertas.length > 0 && (
        <div className="space-y-3 border-t px-4 pb-4 pt-3">
          <div className="flex flex-wrap gap-1.5">
            {([["todos", alertas.length]] as [TipoAlerta | "todos", number][]).concat(porTipo).map(([t, n]) => (
              <button key={t} type="button" data-plano="1" onClick={() => { setTipo(t); setVerTodos(false); }}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${tipo === t
                  ? "border-primary bg-primary text-primary-foreground shadow-[0_2px_0_rgb(0_0_0/0.2)]"
                  : "border-border bg-background hover:border-primary/40"}`}>
                {t === "todos" ? "Todos" : `${TIPOS_ALERTA[t].icone} ${TIPOS_ALERTA[t].rotulo}`} <span className="opacity-70">{n}</span>
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visiveis.map((a) => {
              const e = ESTILO[a.gravidade];
              return (
                <article key={a.id} className={`group relative rounded-xl border border-l-4 ${e.borda} ${e.fundo} p-3 transition-all hover:-translate-y-0.5 hover:shadow-md`}>
                  <div className="flex items-start gap-2">
                    <span className="text-lg leading-none" aria-hidden>{TIPOS_ALERTA[a.tipo].icone}</span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
                        <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${e.ponto} ${a.gravidade === "alta" ? "animate-pulse" : ""}`} />
                        {a.titulo}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-medium text-foreground/80">{a.paciente}{a.local && ` · ${a.local}`}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{a.detalhe}</p>
                    </div>
                  </div>
                  {onAbrir && (
                    <Button size="sm" variant="outline" className="mt-2 h-7 w-full gap-1 text-xs" onClick={() => onAbrir(a.pacienteId)}>
                      Abrir paciente <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </article>
              );
            })}
          </div>

          {filtrados.length > limite && (
            <div className="text-center">
              <Button variant="ghost" size="sm" onClick={() => setVerTodos((v) => !v)}>
                {verTodos ? "Mostrar menos" : `Ver todos os ${filtrados.length} alertas`}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
