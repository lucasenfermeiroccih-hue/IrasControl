import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExpandToggleProps {
  expanded: boolean;
  toggle: () => void;
  hiddenCount: number;
  /** Rótulo do limite quando recolhido, ex.: "top 20". */
  limitLabel?: string;
  className?: string;
}

/**
 * Botão de expandir/recolher para gráficos e tabelas que exibem apenas
 * os N primeiros itens. Some quando não há itens ocultos e a lista não
 * está expandida (nada a alternar).
 */
export function ExpandToggle({ expanded, toggle, hiddenCount, limitLabel = "top 20", className }: ExpandToggleProps) {
  if (hiddenCount <= 0 && !expanded) return null;
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggle}
      className={`h-7 gap-1 text-xs shrink-0 ${className ?? ""}`}
      title={expanded ? "Mostrar apenas os principais" : "Expandir e ver todos os dados"}
    >
      {expanded ? (
        <><Minimize2 className="h-3.5 w-3.5" /> Ver {limitLabel}</>
      ) : (
        <><Maximize2 className="h-3.5 w-3.5" /> Ver todos (+{hiddenCount})</>
      )}
    </Button>
  );
}
