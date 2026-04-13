import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Filter } from "lucide-react";

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
  dia?: string;
  setDia?: (v: string) => void;
  mes: string;
  setMes: (v: string) => void;
  ano: string;
  setAno: (v: string) => void;
  setor: string;
  setSetor: (v: string) => void;
  sectors?: string[];
  years?: string[];
}

export default function DashboardFilters({
  dia, setDia,
  mes, setMes, ano, setAno, setor, setSetor,
  sectors = defaultSectors,
  years = defaultYears,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Filter className="h-4 w-4" />
        <span className="text-xs font-medium hidden sm:inline">Filtros:</span>
      </div>
      {setDia && (
        <div className="space-y-1">
          <Label className="text-[10px] text-muted-foreground">Dia</Label>
          <Select value={dia || "all"} onValueChange={setDia}>
            <SelectTrigger className="h-8 w-[80px] text-xs">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {defaultDays.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Mês</Label>
        <Select value={mes} onValueChange={setMes}>
          <SelectTrigger className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {meses.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Ano</Label>
        <Select value={ano} onValueChange={setAno}>
          <SelectTrigger className="h-8 w-[90px] text-xs">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-[10px] text-muted-foreground">Setor</Label>
        <Select value={setor} onValueChange={setSetor}>
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
