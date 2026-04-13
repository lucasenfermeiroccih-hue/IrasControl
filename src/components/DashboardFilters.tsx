import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Filter, ChevronDown, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const defaultSectors = [
  "UTI Adulto", "UTI Neonatal", "UTI Pediátrica", "Clínica Médica",
  "Centro Cirúrgico", "Emergência", "Ambulatório",
];

const currentYear = new Date().getFullYear();
const defaultYears = [String(currentYear), String(currentYear - 1), String(currentYear - 2)];
const defaultDays = Array.from({ length: 31 }, (_, i) => String(i + 1));

interface DashboardFiltersProps {
  dia?: string[];
  setDia?: (v: string[]) => void;
  mes: string[];
  setMes: (v: string[]) => void;
  ano: string[];
  setAno: (v: string[]) => void;
  setor: string[];
  setSetor: (v: string[]) => void;
  sectors?: string[];
  years?: string[];
}

function MultiSelect({
  label,
  selected,
  onChange,
  options,
  width = "w-[140px]",
}: {
  label: string;
  selected: string[];
  onChange: (v: string[]) => void;
  options: string[];
  width?: string;
}) {
  const allSelected = selected.length === 0;

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const displayLabel = allSelected
    ? "Todos"
    : selected.length === 1
      ? selected[0]
      : `${selected.length} selecionados`;

  return (
    <div className="space-y-1">
      <Label className="text-[10px] text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 ${width} justify-between text-xs font-normal`}
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0" align="start">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium">{label}</span>
            {selected.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => onChange([])}
              >
                Limpar
                <X className="ml-1 h-3 w-3" />
              </Button>
            )}
          </div>
          <ScrollArea className="max-h-[220px]">
            <div className="p-2 space-y-1">
              {options.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-xs cursor-pointer hover:bg-accent"
                >
                  <Checkbox
                    checked={selected.includes(opt)}
                    onCheckedChange={() => toggle(opt)}
                    className="h-3.5 w-3.5"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default function DashboardFilters({
  dia, setDia,
  mes, setMes, ano, setAno, setor, setSetor,
  sectors = defaultSectors,
  years = defaultYears,
}: DashboardFiltersProps) {
  const totalActive = (dia?.length || 0) + mes.length + ano.length + setor.length;

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-xs font-medium hidden sm:inline">Filtros:</span>
        {totalActive > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5 px-1.5">
            {totalActive}
          </Badge>
        )}
      </div>
      {setDia && dia !== undefined && (
        <MultiSelect label="Dia" selected={dia} onChange={setDia} options={defaultDays} width="w-[100px]" />
      )}
      <MultiSelect label="Mês" selected={mes} onChange={setMes} options={meses} width="w-[140px]" />
      <MultiSelect label="Ano" selected={ano} onChange={setAno} options={years} width="w-[110px]" />
      <MultiSelect label="Setor" selected={setor} onChange={setSetor} options={sectors} width="w-[160px]" />
    </div>
  );
}
