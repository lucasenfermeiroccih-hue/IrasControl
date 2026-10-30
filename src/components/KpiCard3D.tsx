import type { ElementType, ReactNode } from "react";
import { Icone3D } from "@/components/Icone3D";

/**
 * Cartão de indicador com volume: ícone em bloco 3D, número grande e, quando
 * clicável, efeito de botão (levanta no hover, afunda ao clicar) e destaque
 * do filtro ativo.
 */
export function KpiCard3D({ icon, matiz, rotulo, valor, extra, ativo = false, onClick, titulo, alerta = false }: {
  icon: ElementType;
  /** Tom (0–360) do ícone */
  matiz: number;
  rotulo: string;
  valor: ReactNode;
  extra?: ReactNode;
  ativo?: boolean;
  onClick?: () => void;
  titulo?: string;
  /** Destaca o cartão em vermelho pulsante (ex.: há casos críticos) */
  alerta?: boolean;
}) {
  const conteudo = (
    <>
      <Icone3D icon={icon} matiz={matiz} ativo={ativo} className="!h-9 !w-9 !rounded-xl [&>svg]:!h-[18px] [&>svg]:!w-[18px]" />
      <span className="min-w-0 text-left">
        <span className="block truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</span>
        <span className="num-display block text-2xl leading-tight sm:text-[28px]">{valor}</span>
        {extra && <span className="block text-[11px] text-muted-foreground">{extra}</span>}
      </span>
      {alerta && <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 shadow-[0_0_8px_rgb(239_68_68/0.8)]" />}
    </>
  );
  const base = `relative flex w-full items-center gap-3 rounded-2xl border bg-card p-3 sm:p-4 transition-all duration-200
    shadow-[inset_0_1px_0_rgb(255_255_255/0.6),0_3px_0_hsl(var(--border)),0_10px_22px_-14px_rgb(0_0_0/0.35)]
    dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.05),0_3px_0_rgb(0_0_0/0.45),0_10px_22px_-14px_rgb(0_0_0/0.7)]
    ${ativo ? "border-primary ring-2 ring-primary/30" : "border-border/80"}`;

  if (!onClick) return <div className={base} title={titulo}>{conteudo}</div>;
  return (
    <button type="button" data-plano="1" onClick={onClick} title={titulo} aria-pressed={ativo}
      className={`${base} cursor-pointer hover:-translate-y-0.5 hover:border-primary/40 active:translate-y-0.5 active:shadow-[inset_0_2px_4px_rgb(0_0_0/0.12),0_1px_0_hsl(var(--border))]`}>
      {conteudo}
    </button>
  );
}
