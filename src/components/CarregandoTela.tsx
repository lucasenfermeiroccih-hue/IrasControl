/** Carregamento de tela: anel com glow e rótulo técnico (sem bloquear a casca do app). */
export function CarregandoTela({ rotulo = "Carregando" }: { rotulo?: string }) {
  return (
    <div className="flex min-h-[50vh] w-full items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-2 border-primary/15" />
          <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-primary [animation-duration:900ms]" />
          <div className="absolute inset-[38%] rounded-full bg-primary shadow-glow-strong" />
        </div>
        <span className="label-mono text-muted-foreground">{rotulo}…</span>
      </div>
    </div>
  );
}
