/**
 * Lista dos históricos (auditorias, antibiograma, consumo): classes da lista com
 * uma única barra de rolagem, paginação e seleção múltipla.
 * Componentes visuais em src/components/history/HistoryListControls.tsx.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { LIST_PAGE_SIZE } from "@/lib/pagination";

/** DialogContent do histórico: só a lista rola; o resto fica fixo. */
export const HISTORY_DIALOG_CLASS = "max-w-4xl max-h-[90vh] flex flex-col overflow-hidden";
/** Corpo do diálogo (abaixo do título). */
export const HISTORY_BODY_CLASS = "flex flex-col gap-3 min-h-0 flex-1";
/** Área rolável da lista, com barra de rolagem fina. */
export const HISTORY_SCROLL_LIST_CLASS =
  "flex-1 min-h-0 space-y-3 overflow-y-auto pr-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border";

/** Paginação da lista filtrada; volta à página 1 quando `resetKey` muda. */
export function useHistoryPagination<T>(items: T[], resetKey: unknown, pageSize = LIST_PAGE_SIZE) {
  const [page, setPage] = useState(1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = useMemo(
    () => items.slice((pageSafe - 1) * pageSize, pageSafe * pageSize),
    [items, pageSafe, pageSize],
  );
  useEffect(() => { setPage(1); }, [resetKey]);
  const goTo = (p: number) => {
    setPage(p);
    listRef.current?.scrollTo({ top: 0 });
  };
  return { page: pageSafe, totalPages, pageItems, goTo, listRef, pageSize, total: items.length };
}

export function toggleInSet(set: Set<string>, id: string, checked: boolean) {
  const next = new Set(set);
  if (checked) next.add(id); else next.delete(id);
  return next;
}

