import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectFilterProps {
  label: string;
  selected: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
}

export default function MultiSelectFilter({
  label, selected, onChange, options, placeholder = "Todos", className,
}: MultiSelectFilterProps) {
  const toggle = (val: string) => {
    if (selected.includes(val)) onChange(selected.filter((s) => s !== val));
    else onChange([...selected, val]);
  };

  const display =
    selected.length === 0
      ? placeholder
      : selected.length === 1
        ? options.find((o) => o.value === selected[0])?.label || selected[0]
        : `${selected.length} selecionados`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 w-full justify-between text-sm font-normal ${className || ""}`}
        >
          <span className="truncate">{display}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 bg-popover z-50" align="start">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-medium">{label}</span>
          {selected.length > 0 && (
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
        <ScrollArea className="max-h-[280px]">
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
  );
}
