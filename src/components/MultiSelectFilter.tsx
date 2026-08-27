import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronLeft, ChevronRight, X, CheckCheck } from "lucide-react";

interface MultiSelectFilterProps {
  label: string;
  selected: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
  /** Mostra barra de navegação ◀ ▶ para navegar item-a-item (útil para meses). */
  showNav?: boolean;
}

export default function MultiSelectFilter({
  label, selected, onChange, options, placeholder = "Todos", className, showNav,
}: MultiSelectFilterProps) {
  const toggle = (val: string) => {
    const next = selected.includes(val)
      ? selected.filter((s) => s !== val)
      : [...selected, val];
    onChange(next.length === options.length ? [] : next);
  };

  const allSelected = options.length > 0 && selected.length === options.length;
  const toggleAll = () => {
    if (allSelected) onChange([]);
    else onChange(options.map((o) => o.value));
  };

  // Navegação entre itens (substitui a seleção pelo item anterior/próximo)
  const currentIndex = selected.length === 1
    ? options.findIndex((o) => o.value === selected[0])
    : -1;

  const goPrev = () => {
    if (options.length === 0) return;
    const idx = currentIndex < 0 ? 0 : (currentIndex - 1 + options.length) % options.length;
    onChange([options[idx].value]);
  };
  const goNext = () => {
    if (options.length === 0) return;
    const idx = currentIndex < 0 ? 0 : (currentIndex + 1) % options.length;
    onChange([options[idx].value]);
  };

  const display =
    selected.length === 0
      ? placeholder
      : allSelected
        ? "Todos"
        : selected.length === 1
          ? options.find((o) => o.value === selected[0])?.label || selected[0]
          : `${selected.length} selecionados`;

  return (
    <div className={`flex items-center gap-1 ${className || ""}`}>
      {showNav && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-7 shrink-0"
          onClick={goPrev}
          aria-label={`${label} anterior`}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </Button>
      )}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 flex-1 justify-between text-sm font-normal min-w-0"
          >
            <span className="truncate">{display}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0 bg-popover z-50" align="start">
          <div className="flex items-center justify-between border-b px-3 py-2.5 gap-2">
            <span className="text-sm font-medium">{label}</span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={toggleAll}
                title={allSelected ? "Desmarcar todos" : "Selecionar todos"}
              >
                <CheckCheck className="mr-1 h-3.5 w-3.5" />
                {allSelected ? "Desmarcar" : "Todos"}
              </Button>
              {selected.length > 0 && !allSelected && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => onChange([])}
                >
                  Limpar
                  <X className="ml-1 h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          <ScrollArea className="h-[280px]">
            <div className="p-2 space-y-0.5">
              {options.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground text-center">
                  Sem opções
                </div>
              )}
              {options.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm cursor-pointer hover:bg-accent transition-colors"
                >
                  <Checkbox
                    checked={selected.includes(opt.value)}
                    onCheckedChange={() => toggle(opt.value)}
                    className="h-4 w-4"
                  />
                  <span className="truncate">{opt.label}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
      {showNav && (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-9 w-7 shrink-0"
          onClick={goNext}
          aria-label={`${label} próximo`}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
