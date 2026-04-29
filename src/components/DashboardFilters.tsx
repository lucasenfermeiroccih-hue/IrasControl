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
  width = "w-[160px]",
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
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={`h-9 ${width} justify-between text-sm font-normal`}
          >
            <span className="truncate">{displayLabel}</span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
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
          <ScrollArea className="max-h-[260px]">
            <div className="p-2 space-y-0.5">
              {options.map((opt) => (
                <label
                  key={opt}
                  className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm cursor-pointer hover:bg-accent transition-colors"
                >
                  <Checkbox
                    checked={selected.includes(opt)}
                    onCheckedChange={() => toggle(opt)}
                    className="h-4 w-4"
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
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
      {setDia && dia !== undefined && (
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Dia</label>
          <MultiSelect label="Dia" selected={dia} onChange={setDia} options={defaultDays} width="w-full" hideLabel />
        </div>
      )}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Mês</label>
        <MultiSelect label="Mês" selected={mes} onChange={setMes} options={meses} width="w-full" hideLabel />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Ano</label>
        <MultiSelect label="Ano" selected={ano} onChange={setAno} options={years} width="w-full" hideLabel />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Setor</label>
        <MultiSelect label="Setor" selected={setor} onChange={setSetor} options={sectors} width="w-full" hideLabel />
      </div>
      {totalActive > 0 && (
        <div className="col-span-2 sm:col-span-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <Badge variant="secondary" className="text-xs px-2">
            {totalActive} {totalActive === 1 ? "filtro ativo" : "filtros ativos"}
          </Badge>
        </div>
      )}
    </div>
  );
}
