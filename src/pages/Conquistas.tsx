import { Flame, Lock, Target, Trophy, Users, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useGamificacao, useGamificacaoAtiva, useMetaEquipe } from "@/hooks/useGamificacao";
import { XP, definirGamificacao, xpDoNivel } from "@/lib/gamificacao";

const fmt = (n: number) => n.toLocaleString("pt-BR");

function AnelNivel({ nivel, progresso }: { nivel: number; progresso: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="anel-xp" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(var(--glow-2))" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="9" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke="url(#anel-xp)" strokeWidth="9" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - progresso)}
          className="transition-[stroke-dashoffset] duration-1000 ease-auralis"
          style={{ filter: "drop-shadow(0 0 6px hsl(var(--glow) / 0.55))" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="label-mono text-muted-foreground">Nível</span>
        <span className="num-display text-5xl leading-none">{nivel}</span>
      </div>
    </div>
  );
}

function MapaCalor({ dias }: { dias: { dia: string; xp: number }[] }) {
  const max = Math.max(1, ...dias.map((d) => d.xp));
  // Colunas por semana (domingo no topo), como um calendário de contribuições
  const primeiro = new Date(`${dias[0].dia}T12:00:00`).getDay();
  const celulas: ({ dia: string; xp: number } | null)[] = [...Array(primeiro).fill(null), ...dias];
  const semanas: (typeof celulas)[] = [];
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7));
  const nivel = (xp: number) => (xp === 0 ? 0 : Math.min(4, Math.ceil((xp / max) * 4)));
  const cores = ["bg-muted", "bg-primary/25", "bg-primary/45", "bg-primary/70", "bg-primary shadow-[0_0_8px_hsl(var(--glow)/0.6)]"];
  return (
    <div className="min-w-0">
      <div className="flex gap-1 overflow-x-auto pb-1">
      {semanas.map((s, i) => (
        <div key={i} className="flex flex-col gap-1">
          {s.map((d, j) => d ? (
            <div
              key={d.dia}
              title={`${d.dia.split("-").reverse().join("/")}: ${d.xp} XP`}
              className={`h-4 w-4 rounded-[5px] transition-transform hover:scale-125 sm:h-5 sm:w-5 ${cores[nivel(d.xp)]}`}
            />
          ) : <div key={`v${j}`} className="h-4 w-4 sm:h-5 sm:w-5" />)}
        </div>
      ))}
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <span className="label-mono text-[9px]">Menos</span>
        {cores.map((c) => <span key={c} className={`h-3 w-3 rounded-[3px] ${c}`} />)}
        <span className="label-mono text-[9px]">Mais</span>
      </div>
    </div>
  );
}

function MetaEquipeCard() {
  const { data, isLoading } = useMetaEquipe();
  if (isLoading || !data) return <Skeleton className="h-48 rounded-2xl" />;
  const alvo = Math.max(1, data.auditoriasMesAnterior);
  const pct = Math.min(1, data.auditoriasMes / alvo);
  const noRitmo = data.auditoriasMes >= alvo * data.ritmo;
  return (
    <Card className="card-lift overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="label-mono text-muted-foreground">Meta da equipe · mês atual</span>
          <Users className="h-4 w-4 text-primary" />
        </div>
        <CardTitle className="text-lg">Superar as auditorias do mês passado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <p><span className="num-display text-4xl">{fmt(data.auditoriasMes)}</span>
            <span className="text-sm text-muted-foreground"> / {fmt(data.auditoriasMesAnterior)} auditorias</span></p>
          <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${noRitmo ? "bg-primary/10 text-primary" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>
            {pct >= 1 ? "Meta batida! 🎉" : noRitmo ? "No ritmo" : "Abaixo do ritmo"}
          </span>
        </div>
        <div className="relative">
          <div className="xp-bar h-3"><span style={{ width: `${pct * 100}%` }} /></div>
          <div
            className="absolute -top-1 h-5 w-0.5 rounded bg-foreground/50"
            style={{ left: `${data.ritmo * 100}%` }}
            title="Ritmo esperado para hoje"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          O traço marca o ritmo esperado para hoje. Tarefas do Kanban concluídas pela equipe no mês: <strong className="text-foreground">{fmt(data.tarefasMes)}</strong>.
        </p>
      </CardContent>
    </Card>
  );
}

export default function Conquistas() {
  const { data, isLoading } = useGamificacao();
  const ativa = useGamificacaoAtiva();

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="animate-rise-in">
        <span className="label-mono text-muted-foreground">Progresso pessoal // últimos 12 meses</span>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">
          Suas <span className="text-aurora">conquistas</span>
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Seu XP vem do trabalho já registrado no sistema: auditorias e tarefas do Kanban concluídas.
          Ninguém vê o seu progresso além de você; a equipe compartilha uma meta coletiva.
        </p>
      </div>

      {isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-48 rounded-2xl md:col-span-2" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-5">
            <Card className="relative overflow-hidden lg:col-span-3">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-[radial-gradient(circle,hsl(var(--glow)/0.25),transparent_65%)]" />
              <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row">
                <AnelNivel nivel={data.nivel.nivel} progresso={data.nivel.progresso} />
                <div className="w-full flex-1 space-y-3">
                  <div>
                    <p className="font-display text-2xl font-semibold">{data.nivel.titulo}</p>
                    <p className="text-sm text-muted-foreground">
                      {fmt(data.xpTotal)} XP · faltam {fmt(data.nivel.xpParaProximo)} para o nível {data.nivel.nivel + 1}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { icone: Zap, valor: fmt(data.xpHoje), rotulo: "XP hoje" },
                      { icone: Target, valor: fmt(data.xpMes), rotulo: "XP no mês" },
                      { icone: Flame, valor: `${data.sequencia}`, rotulo: "Dias seguidos" },
                    ].map(({ icone: Icone, valor, rotulo }) => (
                      <div key={rotulo} className="rounded-xl border border-border/60 bg-background/60 p-3">
                        <Icone className="mb-1 h-4 w-4 text-primary" />
                        <p className="num-display text-2xl leading-none">{valor}</p>
                        <p className="label-mono mt-1 text-[9px] text-muted-foreground">{rotulo}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Próximo título aos {fmt(xpDoNivel(data.nivel.nivel + 1))} XP. Fins de semana sem registro não quebram a sequência.
                  </p>
                </div>
              </CardContent>
            </Card>
            <div className="lg:col-span-2"><MetaEquipeCard /></div>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <span className="label-mono text-muted-foreground">Atividade // 12 semanas</span>
              <CardTitle className="text-lg">Constância</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 md:flex-row md:items-start">
              <MapaCalor dias={data.mapaCalor} />
              <div className="grid flex-1 grid-cols-2 gap-3">
                {[
                  { valor: data.mapaCalor.filter((d) => d.xp > 0).length, rotulo: "Dias com registro (12 sem.)" },
                  { valor: data.estatisticas.maiorSequencia, rotulo: "Maior sequência" },
                  { valor: data.estatisticas.auditorias, rotulo: "Auditorias (12 meses)" },
                  { valor: data.estatisticas.tarefas, rotulo: "Tarefas do Kanban (12 meses)" },
                ].map((k) => (
                  <div key={k.rotulo} className="rounded-xl border border-border/60 bg-background/60 p-3">
                    <p className="num-display text-3xl leading-none">{fmt(k.valor)}</p>
                    <p className="label-mono mt-1.5 text-[9px] text-muted-foreground">{k.rotulo}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-semibold">Insígnias</h2>
              <span className="label-mono text-muted-foreground">
                {data.conquistas.filter((c) => c.obtida).length}/{data.conquistas.length}
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {data.conquistas.map((c, i) => (
                <div
                  key={c.id}
                  style={{ animationDelay: `${i * 40}ms` }}
                  className={`card-lift animate-rise-in relative rounded-2xl border p-4 ${c.obtida
                    ? "border-primary/30 bg-gradient-to-br from-primary/[0.08] to-transparent"
                    : "border-border/70 bg-card"}`}
                >
                  <div className={`mb-2 grid h-11 w-11 place-items-center rounded-xl text-2xl ${c.obtida ? "bg-primary/10 shadow-[0_0_18px_hsl(var(--glow)/0.35)]" : "bg-muted grayscale"}`}>
                    {c.obtida ? c.icone : <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <p className="font-medium leading-tight">{c.nome}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{c.descricao}</p>
                  {!c.obtida && (
                    <div className="mt-3">
                      <div className="xp-bar h-1.5"><span style={{ width: `${(c.atual / c.meta) * 100}%` }} /></div>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">{fmt(c.atual)}/{fmt(c.meta)}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <span className="label-mono text-muted-foreground">Regras transparentes</span>
            <CardTitle className="text-lg">Como ganhar XP</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>✅ Tarefa do Kanban concluída: <strong>{XP.tarefa.low}</strong> (baixa), <strong>{XP.tarefa.normal}</strong> (normal), <strong>{XP.tarefa.high}</strong> XP (alta)</p>
            <p>🔎 Auditoria registrada: <strong>{XP.auditoria}</strong> XP (até {XP.tetoAuditoriasDia} por dia, para valorizar qualidade, não volume)</p>
            <p>📆 Dia com registro: <strong>+{XP.diaAtivo}</strong> XP de constância</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="label-mono text-muted-foreground">Preferência</span>
            <CardTitle className="text-lg">Exibir gamificação</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <Label htmlFor="gamificacao" className="text-sm font-normal text-muted-foreground">
              Mostrar o selo de nível e o "+XP" no topo da tela. Seus dados continuam iguais.
            </Label>
            <Switch id="gamificacao" checked={ativa} onCheckedChange={definirGamificacao} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
