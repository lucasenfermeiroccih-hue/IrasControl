import { useMemo, useState } from "react";

/**
 * Limita uma lista às N maiores entradas (assumindo que já vem ordenada),
 * com um estado de "expandir" para exibir todos os itens quando desejado.
 *
 * Uso típico em gráficos/tabelas grandes:
 *   const material = useTopN(culturasPorMaterial, 20);
 *   <BarChart data={material.items} ... />
 *   <ExpandToggle {...material} />
 */
export function useTopN<T>(data: T[], limit = 20) {
  const [expanded, setExpanded] = useState(false);
  const items = useMemo(
    () => (expanded ? data : data.slice(0, limit)),
    [data, expanded, limit]
  );
  const hiddenCount = Math.max(0, data.length - limit);
  return {
    items,
    expanded,
    toggle: () => setExpanded(e => !e),
    setExpanded,
    hiddenCount,
    total: data.length,
    limit,
  };
}

export type UseTopNResult<T> = ReturnType<typeof useTopN<T>>;
