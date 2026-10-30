import { useState } from "react";
import { ChevronLeft, ChevronRight, Crown, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useRanking } from "@/hooks/useGamificacao";
import { AvisoErroGamificacao } from "@/components/gamificacao/AvisoErroGamificacao";
import type { LinhaRanking } from "@/lib/gamificacao";

const fmt = (n: number) => n.toLocaleString("pt-BR");
const iniciais = (nome: string) => nome.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
const nomeMes = (d: Date) => {
  const s = d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const MEDALHAS = {
  1: { anel: "from-amber-300 via-yellow-400 to-amber-600", pedestal: "from-amber-300 to-amber-600", altura: "h-28", texto: "text-[#451a03]", rotulo: "1º" },
  2: { anel: "from-slate-200 via-slate-300 to-slate-500", pedestal: "from-slate-200 to-slate-400", altura: "h-20", texto: "text-[#1e293b]", rotulo: "2º" },
  3: { anel: "from-orange-300 via-orange-400 to-orange-700", pedestal: "from-orange-300 to-orange-600", altura: "h-14", texto: "text-[#431407]", rotulo: "3º" },
} as const;

const CORES = { tarefas: "bg-emerald-500", auditorias: "bg-sky-500", preenchimentos: "bg-violet-500", alertas: "bg-rose-500" };

function Avatar({ nome, tamanho = "h-10 w-10 text-sm", anel }: { nome: string; tamanho?: string; anel?: string }) {
  return (
    <div className={`rounded-full p-[3px] ${anel ? `bg-gradient-to-br ${anel} shadow-lg` : "bg-border"}`}>
      <div className={`grid ${tamanho} place-items-center rounded-full bg-card font-display font-semibold text-foreground`}>
        {iniciais(nome)}
      </div>
    </div>
  );
}

function Podio({ linhas, eu }: { linhas: LinhaRanking[]; eu?: string }) {
  // Ordem visual: 2º, 1º, 3º
  const ordem = [linhas[1], linhas[0], linhas[2]].filter(Boolean) as LinhaRanking[];
  return (
    <div className="flex items-end justify-center gap-3 sm:gap-6">
      {ordem.map((l) => {
        const lugar = (Math.min(l.posicao, 3) as 1 | 2 | 3);
        const m = MEDALHAS[lugar];
        return (
          <div key={l.id} className="flex w-24 flex-col items-center sm:w-32" style={{ animationDelay: `${lugar * 80}ms` }}>
            {lugar === 1 && <Crown className="mb-1 h-7 w-7 animate-float text-amber-500 drop-shadow" />}
            <Avatar nome={l.nome} anel={m.anel} tamanho={lugar === 1 ? "h-16 w-16 text-lg" : "h-12 w-12 text-sm"} />
            <p className={`mt-2 line-clamp-2 text-center text-sm font-medium leading-tight ${l.id === eu ? "text-primary" : ""}`}>
              {l.nome}{l.id === eu ? " (você)" : ""}
            </p>
            <p className="num-display text-xl">{fmt(l.pontos)}<span className="ml-1 text-xs text-muted-foreground">pts</span></p>
            <div className={`mt-2 w-full rounded-t-xl bg-gradient-to-b ${m.pedestal} ${m.altura} relative flex items-start justify-center pt-2 shadow-[inset_0_2px_0_rgba(255,255,255,.5),inset_0_-6px_12px_rgba(0,0,0,.18),0_10px_24px_-12px_rgba(0,0,0,.45)]`}>
              <span className={`font-display text-2xl font-bold ${m.texto} drop-shadow-[0_1px_0_rgba(255,255,255,.5)]`}>{m.rotulo}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function RankingMensal() {
  const { user } = useAuthReady();
  const hoje = new Date();
  const [escopo, setEscopo] = useState<"mes" | "ano">("mes");
  const [mes, setMes] = useState(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const { data, isLoading, error } = useRanking(mes, true, escopo);
  const anual = escopo === "ano";
  const periodoAtual = anual
    ? mes.getFullYear() === hoje.getFullYear()
    : mes.getFullYear() === hoje.getFullYear() && mes.getMonth() === hoje.getMonth();
  const muda = (delta: number) => setMes((m) => anual
    ? new Date(m.getFullYear() + delta, 0, 1)
    : new Date(m.getFullYear(), m.getMonth() + delta, 1));
  const irParaAtual = () => setMes(new Date(hoje.getFullYear(), hoje.getMonth(), 1));
  const titulo = anual ? `Ano de ${mes.getFullYear()}` : nomeMes(mes);
  const periodoTexto = anual ? "neste ano" : "neste mês";
  const lider = data?.[0]?.pontos || 1;
  const minha = data?.find((l) => l.id === user?.id);
  // Quem está logo acima (menor pontuação maior que a sua)
  const acima = minha ? [...(data ?? [])].reverse().find((l) => l.pontos > minha.pontos) : undefined;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="label-mono text-muted-foreground">Ranking da equipe · {anual ? "anual" : "mensal"}</span>
          <h2 className="font-display text-2xl font-semibold">{titulo}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-border/60 bg-muted/70 p-1" role="group" aria-label="Período do ranking">
            {([["mes", "Mensal"], ["ano", "Anual"]] as const).map(([v, rotulo]) => (
              <button key={v} type="button" aria-pressed={escopo === v} onClick={() => { setEscopo(v); irParaAtual(); }}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${escopo === v ? "bg-card text-foreground shadow-soft" : "text-muted-foreground hover:text-foreground"}`}>
                {rotulo}
              </button>
            ))}
          </div>
          <Button variant="outline" size="icon" onClick={() => muda(-1)} aria-label={anual ? "Ano anterior" : "Mês anterior"}><ChevronLeft /></Button>
          <Button variant="outline" size="sm" onClick={irParaAtual} disabled={periodoAtual}>{anual ? "Ano atual" : "Mês atual"}</Button>
          <Button variant="outline" size="icon" onClick={() => muda(1)} disabled={periodoAtual} aria-label={anual ? "Próximo ano" : "Próximo mês"}><ChevronRight /></Button>
        </div>
      </div>

      {error ? (
        <AvisoErroGamificacao erro={error} />
      ) : isLoading || !data ? (
        <Skeleton className="h-72 rounded-2xl" />
      ) : data.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
          <Trophy className="h-10 w-10 opacity-40" />
          Ninguém pontuou {periodoTexto} ainda. Conclua tarefas, registre auditorias e preencha o monitoramento para abrir o placar!
        </CardContent></Card>
      ) : (
        <>
          <Card className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,hsl(var(--glow)/0.22),transparent_70%)]" />
            <CardContent className="relative px-4 pb-0 pt-8">
              <Podio linhas={data.slice(0, 3)} eu={user?.id} />
            </CardContent>
          </Card>

          {minha && minha.posicao > 3 && (
            <div className="flex flex-col gap-1 rounded-2xl border border-primary/30 bg-primary/[0.06] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <span>Sua posição: <strong className="font-display text-lg">{minha.posicao}º</strong> de {data.length}</span>
              <span>{fmt(minha.pontos)} pts · {acima ? <>faltam <strong>{fmt(acima.pontos - minha.pontos)}</strong> para subir</> : null}</span>
            </div>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="flex flex-wrap gap-4 border-b px-4 py-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${CORES.tarefas}`} /> Tarefas</span>
                <span className="flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${CORES.auditorias}`} /> Auditorias</span>
                <span className="flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${CORES.preenchimentos}`} /> Preenchimentos</span>
                <span className="flex items-center gap-1.5"><i className={`h-2.5 w-2.5 rounded-full ${CORES.alertas}`} /> Alertas resolvidos</span>
              </div>
              <ol>
                {data.map((l) => {
                  const total = Math.max(1, l.tarefas + l.auditorias + l.preenchimentos + l.alertas);
                  return (
                    <li key={l.id} className={`flex items-center gap-3 border-b px-4 py-3 last:border-0 ${l.id === user?.id ? "bg-primary/[0.06]" : ""}`}>
                      <span className={`w-8 text-center font-display text-lg font-semibold ${l.posicao <= 3 ? "text-amber-500" : "text-muted-foreground"}`}>{l.posicao}º</span>
                      <Avatar nome={l.nome} tamanho="h-9 w-9 text-xs" anel={l.posicao <= 3 ? MEDALHAS[l.posicao as 1 | 2 | 3].anel : undefined} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{l.nome}{l.id === user?.id && <span className="ml-1.5 text-xs text-primary">(você)</span>}</p>
                        <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-muted" style={{ width: `${Math.max(8, (l.pontos / lider) * 100)}%` }}
                          title={`Tarefas ${fmt(l.tarefas)} · Auditorias ${fmt(l.auditorias)} · Preenchimentos ${fmt(l.preenchimentos)} · Alertas ${fmt(l.alertas)}`}>
                          <span className={CORES.tarefas} style={{ width: `${(l.tarefas / total) * 100}%` }} />
                          <span className={CORES.auditorias} style={{ width: `${(l.auditorias / total) * 100}%` }} />
                          <span className={CORES.preenchimentos} style={{ width: `${(l.preenchimentos / total) * 100}%` }} />
                          <span className={CORES.alertas} style={{ width: `${(l.alertas / total) * 100}%` }} />
                        </div>
                      </div>
                      <span className="num-display w-20 text-right text-xl">{fmt(l.pontos)}</span>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            Pontos de tarefas, auditorias, preenchimentos e alertas clínicos resolvidos {anual ? "no ano" : "no mês"}, com as regras definidas pela coordenação (inclui o bônus de constância).
          </p>
        </>
      )}
    </div>
  );
}
