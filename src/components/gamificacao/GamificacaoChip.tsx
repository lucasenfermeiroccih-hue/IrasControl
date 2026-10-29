import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Flame, Sparkles, Trophy } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useGamificacao, useGamificacaoAtiva } from "@/hooks/useGamificacao";
import { EVENTO_XP } from "@/lib/celebrarXp";

/** Selo de nível no cabeçalho, com XP, sequência e atalho para Conquistas. */
export function GamificacaoChip() {
  const ativa = useGamificacaoAtiva();
  const { data } = useGamificacao();
  const [ganhos, setGanhos] = useState<{ id: number; xp: number }[]>([]);

  useEffect(() => {
    const onXp = (e: Event) => {
      const xp = (e as CustomEvent<number>).detail;
      const id = Date.now() + Math.random();
      setGanhos((g) => [...g, { id, xp }]);
      setTimeout(() => setGanhos((g) => g.filter((x) => x.id !== id)), 1500);
    };
    window.addEventListener(EVENTO_XP, onXp);
    return () => window.removeEventListener(EVENTO_XP, onXp);
  }, []);

  if (!ativa || !data) return null;
  const { nivel, sequencia, xpMes, conquistas } = data;
  const obtidas = conquistas.filter((c) => c.obtida).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group relative flex items-center gap-2 rounded-full border border-primary/20 bg-primary/[0.06] py-1 pl-1 pr-3 text-xs transition-all duration-300 ease-spectra hover:border-primary/40 hover:bg-primary/10 hover:shadow-glow"
          aria-label={`Nível ${nivel.nivel}, ${nivel.titulo}. Ver progresso`}
        >
          <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-primary to-[hsl(var(--glow-2))] font-mono text-[11px] font-semibold text-primary-foreground shadow-[0_0_12px_hsl(var(--glow)/0.5)]">
            {nivel.nivel}
          </span>
          <span className="hidden flex-col items-start leading-none md:flex">
            <span className="font-medium text-foreground">{nivel.titulo}</span>
            <span className="xp-bar mt-1 h-1 w-20"><span style={{ width: `${Math.round(nivel.progresso * 100)}%` }} /></span>
          </span>
          {sequencia > 0 && (
            <span className="flex items-center gap-0.5 font-mono text-[11px] text-orange-600 dark:text-orange-400" title={`${sequencia} dias seguidos`}>
              <Flame className="h-3.5 w-3.5" />{sequencia}
            </span>
          )}
          {ganhos.map((g) => (
            <span key={g.id} className="pointer-events-none absolute left-1/2 top-0 z-50 animate-xp-float whitespace-nowrap rounded-full bg-primary px-2 py-0.5 font-mono text-[11px] font-semibold text-primary-foreground shadow-glow">
              +{g.xp} XP
            </span>
          ))}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 rounded-2xl p-0">
        <div className="space-y-3 p-4">
          <div className="flex items-center justify-between">
            <span className="label-mono text-muted-foreground">Seu progresso</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-display text-lg font-semibold">Nível {nivel.nivel} · {nivel.titulo}</p>
            <div className="xp-bar mt-2 h-2"><span style={{ width: `${Math.round(nivel.progresso * 100)}%` }} /></div>
            <p className="mt-1 text-xs text-muted-foreground">Faltam {nivel.xpParaProximo.toLocaleString("pt-BR")} XP para o próximo nível</p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-muted/60 p-2">
              <p className="num-display text-xl">{xpMes.toLocaleString("pt-BR")}</p>
              <p className="label-mono text-[9px] text-muted-foreground">XP no mês</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-2">
              <p className="num-display text-xl">{sequencia}</p>
              <p className="label-mono text-[9px] text-muted-foreground">Sequência</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-2">
              <p className="num-display text-xl">{obtidas}/{conquistas.length}</p>
              <p className="label-mono text-[9px] text-muted-foreground">Conquistas</p>
            </div>
          </div>
        </div>
        <div className="hairline-spectrum" />
        <Link to="/conquistas" className="flex items-center justify-center gap-2 p-3 text-sm font-medium text-primary hover:bg-primary/5">
          <Trophy className="h-4 w-4" /> Ver conquistas e meta da equipe
        </Link>
      </PopoverContent>
    </Popover>
  );
}
