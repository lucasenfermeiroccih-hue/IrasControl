import { useMemo, useState } from "react";
import {
  BellRing, CheckCircle2, ChevronDown, ChevronRight, Download, Eye, ExternalLink, History, Settings2, Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ConfigAlertas } from "@/components/alertas/ConfigAlertas";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRegrasAlertas } from "@/hooks/useRegrasAlertas";
import { useGamConfig, useGamificacaoAtiva } from "@/hooks/useGamificacao";
import {
  DIAS_HISTORICO, useAlertasTratativas, useDesfazerTratativa, useRegistrarTratativa,
} from "@/hooks/useAlertasTratativas";
import {
  CONDUTAS, TIPOS_ALERTA, contarPorGravidade, ordenarAlertas, situacaoDosAlertas,
  type AlertaClinico, type Gravidade, type OrigemAlerta, type TipoAlerta, type Tratativa,
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

const hora = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const dataHora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const ehHoje = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
const primeiroNome = (n: string | null) => (n || "Alguém").split(" ")[0];

/**
 * Central de alertas clínicos (Monitoramento, Mapa de Precaução, Dashboard):
 * contagem por gravidade, filtro por tipo e cartões que abrem o paciente.
 * Com `hospitalId`, cada alerta pode ser marcado como visto ou resolvido
 * (vale pontos na gamificação) e a aba Histórico mostra quem tratou o quê.
 */
export function PainelAlertas({
  alertas, onAbrir, contexto, titulo = "Central de alertas", limite = 6, hospitalId, origem = "monitoramento", nomes,
}: {
  alertas: AlertaClinico[];
  /** Abre o paciente (recebe o alerta clicado, quando vem de um cartão) */
  onAbrir?: (pacienteId: string, alerta?: AlertaClinico) => void;
  /** Nome curto para lembrar se o painel fica aberto (ex.: "monitoramento") */
  contexto: string;
  titulo?: string;
  limite?: number;
  /** Liga o histórico (visto/resolvido) e os pontos */
  hospitalId?: string | null;
  origem?: OrigemAlerta;
  /** Nome dos pacientes por id, para o histórico (inclui quem já saiu) */
  nomes?: Map<string, string>;
}) {
  const [aberto, setAberto] = useState(() => lerAberto(contexto));
  const [aba, setAba] = useState<"pendentes" | "historico">("pendentes");
  const [tipo, setTipo] = useState<TipoAlerta | "todos">("todos");
  const [verTodos, setVerTodos] = useState(false);
  const [resolvendo, setResolvendo] = useState<AlertaClinico | null>(null);
  const [observacao, setObservacao] = useState("");
  const [configurando, setConfigurando] = useState(false);

  const { user } = useAuthReady();
  const { data: hist } = useAlertasTratativas(hospitalId);
  const registrar = useRegistrarTratativa(hospitalId, origem);
  const { data: cfg } = useGamConfig();
  const gamAtiva = useGamificacaoAtiva();
  const { isAdmin } = useIsAdmin();
  const { regras } = useRegrasAlertas(hospitalId);
  const comHistorico = !!hospitalId && hist?.disponivel !== false;
  const tratativas = useMemo(() => hist?.tratativas ?? [], [hist]);

  const { pendentes, resolvidos, vistos } = useMemo(
    () => (comHistorico ? situacaoDosAlertas(alertas, tratativas, new Date(), regras.ocultar) : { pendentes: alertas, resolvidos: [], vistos: new Map<string, Tratativa>() }),
    [alertas, tratativas, comHistorico, regras],
  );
  const resolvidosHoje = tratativas.filter((t) => t.status === "resolvido" && ehHoje(t.created_at)).length;

  const ordenados = useMemo(() => ordenarAlertas(pendentes), [pendentes]);
  const contagem = contarPorGravidade(pendentes);
  const porTipo = useMemo(() => {
    const m = new Map<TipoAlerta, number>();
    for (const a of pendentes) m.set(a.tipo, (m.get(a.tipo) ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [pendentes]);
  const filtrados = tipo === "todos" ? ordenados : ordenados.filter((a) => a.tipo === tipo);
  const visiveis = verTodos ? filtrados : filtrados.slice(0, limite);
  const pontosDe = (g: Gravidade) => (gamAtiva && cfg ? cfg.pontos[`alerta_${g}`] : 0);

  const alternar = () => {
    setAberto((v) => {
      try { localStorage.setItem(`${CHAVE_ABERTO}:${contexto}`, v ? "0" : "1"); } catch { /* sem armazenamento */ }
      return !v;
    });
  };

  const marcarVisto = (a: AlertaClinico) => registrar.mutate({ alerta: a, status: "visto" }, {
    onSuccess: () => toast.success("Alerta marcado como visto"),
    onError: (e) => toast.error("Não foi possível registrar", { description: (e as Error).message }),
  });

  const confirmarResolucao = () => {
    if (!resolvendo) return;
    const a = resolvendo;
    registrar.mutate({ alerta: a, status: "resolvido", observacao }, {
      onSuccess: () => {
        const pts = pontosDe(a.gravidade);
        toast.success(pts ? `Alerta resolvido! +${pts} pontos` : "Alerta resolvido", { description: `${a.titulo} · ${a.paciente}` });
        setResolvendo(null); setObservacao("");
      },
      onError: (e) => toast.error("Não foi possível registrar", { description: (e as Error).message }),
    });
  };

  const alternarConduta = (c: string) => setObservacao((o) => {
    const partes = o.split(";").map((x) => x.trim()).filter(Boolean);
    return (partes.includes(c) ? partes.filter((x) => x !== c) : [...partes, c]).join("; ");
  });

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
            {pendentes.length === 0 ? "Nenhum alerta pendente" : `${pendentes.length} alerta(s) pendente(s) nos pacientes internados`}
            {comHistorico && resolvidosHoje > 0 && <> · <span className="font-medium text-emerald-600 dark:text-emerald-400">{resolvidosHoje} resolvido(s) hoje</span></>}
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

      {aberto && (comHistorico || pendentes.length > 0 || (hospitalId && isAdmin)) && (
        <div className="space-y-3 border-t px-4 pb-4 pt-3">
          {(comHistorico || (hospitalId && isAdmin)) && (
          <div className="flex flex-wrap items-center gap-2">
          {comHistorico && (
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1 text-sm sm:w-fit" role="tablist">
              {([["pendentes", `Pendentes (${pendentes.length})`, BellRing], ["historico", `Histórico (${tratativas.length})`, History]] as const).map(([v, r, I]) => (
                <button key={v} type="button" role="tab" data-plano="1" aria-selected={aba === v} onClick={() => setAba(v)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-medium transition-all ${aba === v ? "bg-card text-foreground shadow-[0_1px_0_hsl(var(--border)),0_2px_6px_-2px_rgb(0_0_0/0.2)]" : "text-muted-foreground hover:text-foreground"}`}>
                  <I className="h-3.5 w-3.5" /> {r}
                </button>
              ))}
              {resolvidos.length > 0 && aba === "pendentes" && (
                <span className="px-2 text-xs text-muted-foreground">{resolvidos.length} resolvido(s) ocultos até a próxima reavaliação</span>
              )}
            </div>
          )}
          {hospitalId && isAdmin && (
            <Button size="sm" variant="outline" className="ml-auto h-8 gap-1.5 text-xs" onClick={() => setConfigurando(true)}>
              <Settings2 className="h-3.5 w-3.5" /> Prazos dos alertas
            </Button>
          )}
          </div>
          )}

          {aba === "pendentes" && pendentes.length === 0 && (
            <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
              Tudo em dia: nenhum alerta pendente. 🎉
            </p>
          )}

          {aba === "pendentes" && pendentes.length > 0 && (
            <>
              <div className="flex flex-wrap gap-1.5">
                {([["todos", pendentes.length]] as [TipoAlerta | "todos", number][]).concat(porTipo).map(([t, n]) => (
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
                  const visto = vistos.get(a.id);
                  const pts = pontosDe(a.gravidade);
                  return (
                    <article key={a.id} className={`group relative flex flex-col rounded-xl border border-l-4 ${e.borda} ${e.fundo} p-3 transition-all hover:-translate-y-0.5 hover:shadow-md`}>
                      <div className="flex flex-1 items-start gap-2">
                        <span className="text-lg leading-none" aria-hidden>{TIPOS_ALERTA[a.tipo].icone}</span>
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
                            <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${e.ponto} ${a.gravidade === "alta" && !visto ? "animate-pulse" : ""}`} />
                            {a.titulo}
                          </p>
                          <p className="mt-0.5 truncate text-xs font-medium text-foreground/80">{a.paciente}{a.local && ` · ${a.local}`}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{a.detalhe}</p>
                          {visto && (
                            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                              <Eye className="h-3 w-3" /> Visto por {primeiroNome(visto.user_nome)} às {hora(visto.created_at)}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        {onAbrir && (
                          <Button size="sm" variant="outline" className="h-7 flex-1 gap-1 px-2 text-xs" onClick={() => onAbrir(a.pacienteId, a)}>
                            {a.tipo === "saida_pendente" ? "Verificar" : "Abrir"} <ExternalLink className="h-3 w-3" />
                          </Button>
                        )}
                        {comHistorico && (
                          <>
                            {!visto && (
                              <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-xs" disabled={registrar.isPending}
                                onClick={() => marcarVisto(a)} title="Marcar como visto (sem pontos)">
                                <Eye className="h-3 w-3" /> Visto
                              </Button>
                            )}
                            <Button size="sm" className="h-7 flex-1 gap-1 px-2 text-xs" onClick={() => { setResolvendo(a); setObservacao(""); }}>
                              <CheckCircle2 className="h-3 w-3" /> Resolver{pts ? <span className="opacity-80">+{pts}</span> : null}
                            </Button>
                          </>
                        )}
                      </div>
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
            </>
          )}

          {aba === "historico" && comHistorico && (
            <Historico tratativas={tratativas} nomes={nomes} alertas={alertas} hospitalId={hospitalId} userId={user?.id} onAbrir={onAbrir} />
          )}
        </div>
      )}

      <Dialog open={!!resolvendo} onOpenChange={(o) => { if (!o) setResolvendo(null); }}>
        <DialogContent className="sm:max-w-lg">
          {resolvendo && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span aria-hidden>{TIPOS_ALERTA[resolvendo.tipo].icone}</span> Resolver alerta
                </DialogTitle>
                <DialogDescription>
                  <strong className="text-foreground">{resolvendo.titulo}</strong> · {resolvendo.paciente}{resolvendo.local && ` · ${resolvendo.local}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">Conduta (toque para incluir)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CONDUTAS[resolvendo.tipo].map((c) => {
                      const ativo = observacao.split(";").map((x) => x.trim()).includes(c);
                      return (
                        <button key={c} type="button" data-plano="1" onClick={() => alternarConduta(c)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${ativo ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40"}`}>
                          {c}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value.slice(0, 1000))} rows={3}
                  placeholder="Observação (opcional): o que foi feito, com quem foi discutido…" />
                <p className="text-xs text-muted-foreground">
                  O alerta sai da lista {regras.ocultar[resolvendo.tipo] <= 1 ? "até amanhã (volta se a situação continuar)" : `por ${regras.ocultar[resolvendo.tipo]} dias`} e fica no histórico com o seu nome.
                </p>
              </div>
              <DialogFooter className="items-center gap-2 sm:justify-between">
                {pontosDe(resolvendo.gravidade) > 0
                  ? <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">Vale +{pontosDe(resolvendo.gravidade)} pontos</span>
                  : <span />}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setResolvendo(null)}>Cancelar</Button>
                  <Button onClick={confirmarResolucao} disabled={registrar.isPending} className="gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Confirmar
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      {hospitalId && isAdmin && (
        <Dialog open={configurando} onOpenChange={setConfigurando}>
          <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Prazos dos alertas</DialogTitle>
              <DialogDescription>Regras da Central de alertas deste hospital, conforme o protocolo da CCIH. Valem para toda a equipe.</DialogDescription>
            </DialogHeader>
            {configurando && <ConfigAlertas hospitalId={hospitalId} onSalvo={() => setConfigurando(false)} />}
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}

function Historico({ tratativas, nomes, alertas, hospitalId, userId, onAbrir }: {
  tratativas: Tratativa[];
  nomes?: Map<string, string>;
  alertas: AlertaClinico[];
  hospitalId?: string | null;
  userId?: string;
  onAbrir?: (pacienteId: string) => void;
}) {
  const [filtro, setFiltro] = useState<"todos" | "resolvido" | "visto">("todos");
  const [soMeus, setSoMeus] = useState(false);
  const [mostrar, setMostrar] = useState(20);
  const desfazer = useDesfazerTratativa(hospitalId);

  const nomeDe = useMemo(() => {
    const m = new Map(nomes);
    for (const a of alertas) if (!m.has(a.pacienteId)) m.set(a.pacienteId, a.paciente);
    return (id: string | null) => (id && m.get(id)) || "Paciente";
  }, [nomes, alertas]);

  const lista = tratativas.filter((t) => (filtro === "todos" || t.status === filtro) && (!soMeus || t.user_id === userId));
  const resolvidos = tratativas.filter((t) => t.status === "resolvido");
  const porPessoa = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of resolvidos) m.set(t.user_nome || "Sem nome", (m.get(t.user_nome || "Sem nome") ?? 0) + 1);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [resolvidos]);

  const exportar = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const cab = ["Data", "Situação", "Gravidade", "Alerta", "Tipo", "Paciente", "Local", "Responsável", "Observação"];
    const linhas = lista.map((t) => [
      dataHora(t.created_at), t.status === "resolvido" ? "Resolvido" : "Visto", ESTILO[t.gravidade].rotulo, t.titulo,
      TIPOS_ALERTA[t.tipo]?.rotulo ?? t.tipo, nomeDe(t.paciente_id), t.local || "", t.user_nome || "", t.observacao || "",
    ].map(esc).join(";"));
    const blob = new Blob(["﻿" + [cab.map(esc).join(";"), ...linhas].join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `historico-alertas-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!tratativas.length) {
    return (
      <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
        Nenhum alerta visto ou resolvido nos últimos {DIAS_HISTORICO} dias. Use os botões <strong>Visto</strong> e <strong>Resolver</strong> nos cartões.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border bg-background/60 p-3">
          <p className="num-display text-2xl leading-none">{resolvidos.length}</p>
          <p className="label-mono mt-1 text-[9px] text-muted-foreground">Resolvidos em {DIAS_HISTORICO} dias</p>
        </div>
        <div className="rounded-xl border bg-background/60 p-3">
          <p className="num-display text-2xl leading-none">{resolvidos.filter((t) => t.gravidade === "alta").length}</p>
          <p className="label-mono mt-1 text-[9px] text-muted-foreground">Críticos resolvidos</p>
        </div>
        <div className="rounded-xl border bg-background/60 p-3">
          <p className="label-mono mb-1 text-[9px] text-muted-foreground">Quem mais resolveu</p>
          {porPessoa.length ? porPessoa.map(([n, q], i) => (
            <p key={n} className="flex justify-between text-xs"><span className="truncate">{["🥇", "🥈", "🥉"][i]} {n}</span><strong>{q}</strong></p>
          )) : <p className="text-xs text-muted-foreground">—</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {([["todos", "Todos"], ["resolvido", "Resolvidos"], ["visto", "Vistos"]] as const).map(([v, r]) => (
          <button key={v} type="button" data-plano="1" onClick={() => setFiltro(v)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${filtro === v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40"}`}>
            {r}
          </button>
        ))}
        <button type="button" data-plano="1" onClick={() => setSoMeus((v) => !v)} aria-pressed={soMeus}
          className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${soMeus ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary/40"}`}>
          Só os meus
        </button>
        <Button size="sm" variant="outline" className="ml-auto h-7 gap-1 text-xs" onClick={exportar}>
          <Download className="h-3 w-3" /> Exportar CSV
        </Button>
      </div>

      <ol className="divide-y rounded-xl border">
        {lista.slice(0, mostrar).map((t) => {
          const podeDesfazer = t.user_id === userId && Date.now() - new Date(t.created_at).getTime() < 24 * 3600 * 1000;
          return (
            <li key={t.id} className="flex flex-wrap items-start gap-3 px-3 py-2.5 text-sm">
              <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.3),0_2px_0_rgb(0_0_0/0.15)] ${t.status === "resolvido" ? "bg-emerald-600" : "bg-slate-500"}`}>
                {t.status === "resolvido" ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 font-medium leading-tight">
                  <span className={`inline-block h-2 w-2 rounded-full ${ESTILO[t.gravidade].ponto}`} title={ESTILO[t.gravidade].rotulo} />
                  {TIPOS_ALERTA[t.tipo]?.icone} {t.titulo}
                  <span className="text-xs font-normal text-muted-foreground">· {t.status === "resolvido" ? "resolvido" : "visto"}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t.paciente_id && onAbrir
                    ? <button type="button" data-plano="1" className="font-medium text-foreground/80 underline-offset-2 hover:underline" onClick={() => onAbrir(t.paciente_id!)}>{nomeDe(t.paciente_id)}</button>
                    : <span className="font-medium text-foreground/80">{nomeDe(t.paciente_id)}</span>}
                  {t.local && ` · ${t.local}`} · {t.user_nome || "Sem nome"} · {dataHora(t.created_at)}
                </p>
                {t.observacao && <p className="mt-1 rounded-lg bg-muted/50 px-2 py-1 text-xs">{t.observacao}</p>}
              </div>
              {podeDesfazer && (
                <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-muted-foreground" disabled={desfazer.isPending}
                  onClick={() => desfazer.mutate(t, {
                    onSuccess: () => toast.success("Registro desfeito"),
                    onError: (e) => toast.error("Não foi possível desfazer", { description: (e as Error).message }),
                  })}>
                  <Undo2 className="h-3 w-3" /> Desfazer
                </Button>
              )}
            </li>
          );
        })}
        {!lista.length && <li className="px-3 py-4 text-center text-sm text-muted-foreground">Nada com esse filtro.</li>}
      </ol>
      {lista.length > mostrar && (
        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={() => setMostrar((n) => n + 30)}>Mostrar mais ({lista.length - mostrar})</Button>
        </div>
      )}
    </div>
  );
}
