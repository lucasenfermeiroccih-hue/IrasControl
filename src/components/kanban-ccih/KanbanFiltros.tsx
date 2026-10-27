import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { STATUS_LABELS } from "@/lib/kanbanAgenda";
import {
  FILTROS_INICIAIS, RECURRENCE_LABELS, SETORES, SETOR_GERAL, TIPOS, type Filtros, type Pessoa,
} from "./types";

interface Props {
  filtros: Filtros;
  onChange: (f: Filtros) => void;
  pessoas: Pessoa[];
  /** Mostra o filtro de funcionário (administração) */
  mostrarPessoa: boolean;
  /** Setores presentes nas tarefas (além da lista padrão) */
  setoresExtras?: string[];
}

export function KanbanFiltros({ filtros, onChange, pessoas, mostrarPessoa, setoresExtras = [] }: Props) {
  const set = <K extends keyof Filtros>(k: K, v: Filtros[K]) => onChange({ ...filtros, [k]: v });
  const setores = [...SETORES, ...setoresExtras.filter((s) => !SETORES.includes(s)).sort()];
  const ativos = (Object.keys(FILTROS_INICIAIS) as (keyof Filtros)[])
    .filter((k) => filtros[k] !== FILTROS_INICIAIS[k]).length;

  return (
    <Card>
      <CardContent className="p-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 items-end">
        {mostrarPessoa && (
          <div className="space-y-1">
            <Label className="text-xs">Funcionário</Label>
            <Select value={filtros.pessoa} onValueChange={(v) => set("pessoa", v)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda a equipe</SelectItem>
                {pessoas.map((p) => <SelectItem key={p.user_id} value={p.user_id}>{p.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-1">
          <Label className="text-xs">Setor</Label>
          <Select value={filtros.setor} onValueChange={(v) => set("setor", v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os setores</SelectItem>
              {setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              <SelectItem value={SETOR_GERAL}>Gestão / transversais (sem setor)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Tipo de tarefa</Label>
          <Select value={filtros.tipo} onValueChange={(v) => set("tipo", v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {TIPOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Recorrência</Label>
          <Select value={filtros.recorrencia} onValueChange={(v) => set("recorrencia", v)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Situação</Label>
          <Select value={filtros.status} onValueChange={(v) => set("status", v as Filtros["status"])}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 col-span-2 md:col-span-1">
          <Label className="text-xs">Tarefa</Label>
          <div className="flex gap-1">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 pl-8"
                placeholder="Buscar tarefa..."
                value={filtros.busca}
                onChange={(e) => set("busca", e.target.value)}
              />
            </div>
            {ativos > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                title="Limpar filtros"
                onClick={() => onChange({ ...FILTROS_INICIAIS, pessoa: mostrarPessoa ? "all" : filtros.pessoa })}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
