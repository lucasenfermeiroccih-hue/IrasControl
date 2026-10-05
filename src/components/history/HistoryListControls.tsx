/**
 * Peças compartilhadas pelos históricos (auditorias, antibiograma, consumo):
 * lista com uma única barra de rolagem, paginação e barra de seleção múltipla
 * para gerar um PDF único das seleções.
 */
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Files, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

export function HistoryPagination({ page, totalPages, total, pageSize, onPage }: {
  page: number; totalPages: number; total: number; pageSize: number; onPage: (p: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between gap-2 border-t pt-2">
      <span className="text-xs text-muted-foreground">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <span className="text-xs text-muted-foreground px-1">Página {page} de {totalPages}</span>
        <Button variant="outline" size="sm" className="h-8" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Próxima <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/** Seleção de um registro, sem aparecer em capturas de tela (html2canvas). */
export function HistoryRowCheckbox({ checked, onChange, disabled, label = "Selecionar para o PDF" }: {
  checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; label?: string;
}) {
  return (
    <Checkbox
      data-html2canvas-ignore="true"
      checked={checked}
      onCheckedChange={(c) => onChange(c === true)}
      disabled={disabled}
      aria-label={label}
    />
  );
}

/** Barra "Selecionar todas · N selecionadas · Baixar PDF das selecionadas". */
export function HistorySelectionBar({ visibleIds, selectedIds, onChange, onExport, progress, children }: {
  /** Ids da lista filtrada (todas as páginas). */
  visibleIds: string[];
  selectedIds: Set<string>;
  onChange: (next: Set<string>) => void;
  onExport: () => void;
  progress: { done: number; total: number } | null;
  /** Opções extras (ex.: "Incluir fotos"). */
  children?: ReactNode;
}) {
  const visibleSelected = visibleIds.filter(id => selectedIds.has(id)).length;
  const allVisible = visibleIds.length > 0 && visibleSelected === visibleIds.length;
  const hiddenSelected = selectedIds.size - visibleSelected;
  const busy = !!progress;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border bg-muted/40 px-3 py-2">
      <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
        <Checkbox
          checked={allVisible ? true : visibleSelected > 0 ? "indeterminate" : false}
          onCheckedChange={(c) => {
            const next = new Set(selectedIds);
            visibleIds.forEach(id => (c === true ? next.add(id) : next.delete(id)));
            onChange(next);
          }}
          disabled={busy}
          aria-label="Selecionar todos os registros listados"
        />
        Selecionar todas ({visibleIds.length})
      </label>
      <span className="text-xs text-muted-foreground">
        {selectedIds.size} selecionada(s)
        {hiddenSelected > 0 ? ` · ${hiddenSelected} fora do filtro atual` : ""}
      </span>
      {children}
      <div className="ml-auto flex items-center gap-2">
        {selectedIds.size > 0 && !busy && (
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => onChange(new Set())}>
            Limpar seleção
          </Button>
        )}
        <Button size="sm" className="h-8 gap-1.5 text-xs" disabled={selectedIds.size === 0 || busy} onClick={onExport}>
          {progress
            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando PDF… {progress.done}/{progress.total}</>
            : <><Files className="h-3.5 w-3.5" /> Baixar PDF das selecionadas ({selectedIds.size})</>}
        </Button>
      </div>
    </div>
  );
}
