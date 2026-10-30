/** Calendário de constância (12 semanas), como um mapa de contribuições. */
export function MapaCalor({ dias }: { dias: { dia: string; xp: number }[] }) {
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
              title={`${d.dia.split("-").reverse().join("/")}: ${d.xp} pontos`}
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
