import { useState, useEffect, useCallback } from "react";
import { LIST_PAGE_SIZE } from "@/lib/pagination";
import { format } from "date-fns";
import { History, Pencil, Trash2, FileDown, Loader2, Filter, FilterX, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";
import { toast } from "sonner";
import { inputFields, calculatedFields, mesesOptions } from "@/data/indicadores-config";
import { useSectors } from "@/hooks/useSectors";

interface IndicadorRecord {
  id: string;
  profissional: string;
  data_vigilancia: string;
  mes_vigilancia: string;
  ano_vigilancia: number;
  setor: string;
  inputs: Record<string, any>;
  calculated: Record<string, any>;
  created_at: string;
}

interface Props {
  onEdit: (record: IndicadorRecord) => void;
}

export default function IndicadoresHistory({ onEdit }: Props) {
  const { hospitalId } = useHospitalContext();
  const { sectors: dbSectors } = useSectors();
  const setorOptions = [...dbSectors, "Compilado as UTIs"];
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<IndicadorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filters
  const [filterMes, setFilterMes] = useState("");
  const [filterAno, setFilterAno] = useState("");
  const [filterSetor, setFilterSetor] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = filterMes || filterAno || filterSetor;

  const clearFilters = () => {
    setFilterMes("");
    setFilterAno("");
    setFilterSetor("");
  };

  // Paginação server-side: filtros e fatia vão para a query (a tabela pode
  // passar de 100 registros por hospital, então não dá para trazer tudo).
  const PAGE_SIZE = LIST_PAGE_SIZE;
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);

  const fetchRecords = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    let query = (supabase
      .from("indicadores_records" as any)
      .select("*", { count: "exact" }) as any)
      .eq("hospital_id", hospitalId);
    if (filterMes) query = query.eq("mes_vigilancia", filterMes);
    if (filterAno) query = query.eq("ano_vigilancia", Number(filterAno));
    if (filterSetor) query = query.eq("setor", filterSetor);
    const from = (page - 1) * PAGE_SIZE;
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar histórico");
      return;
    }
    setRecords((data as IndicadorRecord[]) || []);
    setTotalCount(count || 0);
  }, [hospitalId, filterMes, filterAno, filterSetor, page, PAGE_SIZE]);

  useEffect(() => {
    if (open) fetchRecords();
  }, [open, fetchRecords]);

  // Volta para a 1ª página quando os filtros mudam
  useEffect(() => { setPage(1); }, [filterMes, filterAno, filterSetor]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await (supabase
      .from("indicadores_records" as any)
      .delete() as any)
      .eq("id", deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (error) {
      toast.error("Erro ao excluir registro");
      return;
    }
    toast.success("Registro excluído com sucesso");
    // Recarrega a página atual; se era o último item de uma página > 1, recua uma
    if (records.length === 1 && page > 1) setPage((p) => p - 1);
    else fetchRecords();
  };

  const handleExportPdf = async (record: IndicadorRecord) => {
    const inputLabels: Record<string, string> = {};
    inputFields.forEach((f) => { inputLabels[f.id] = f.label; });

    const calcLabels: Record<string, string> = {};
    calculatedFields.forEach((f) => { calcLabels[f.id] = f.label; });

    await exportPdf({
      type: "indicadores",
      hospitalId: hospitalId || "",
      data: {
        profissional: record.profissional,
        mes: record.mes_vigilancia,
        ano: record.ano_vigilancia,
        setor: record.setor,
        dataVigilancia: record.data_vigilancia,
        inputs: record.inputs,
        calculated: record.calculated,
        inputLabels,
        calcLabels,
      },
      filenamePrefix: `indicadores-${record.setor}-${record.mes_vigilancia}`,
    });
  };

  const handleEdit = (record: IndicadorRecord) => {
    onEdit(record);
    setOpen(false);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
              <History className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Histórico de registros</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between w-full">
              <DialogTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Histórico de Indicadores
              </DialogTitle>
              <div className="flex items-center gap-1">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={showFilters ? "default" : "outline"}
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setShowFilters(!showFilters)}
                      >
                        <Filter className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Filtrar</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                {hasActiveFilters && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={clearFilters}>
                          <FilterX className="h-4 w-4 text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Limpar filtros</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </div>
          </DialogHeader>

          {showFilters && (
            <div className="grid grid-cols-3 gap-3 pb-2">
              <div className="space-y-1">
                <Label className="text-xs">Mês</Label>
                <Select value={filterMes} onValueChange={setFilterMes}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {mesesOptions.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <Input
                  type="number"
                  placeholder="Todos"
                  className="h-8 text-xs"
                  value={filterAno}
                  onChange={(e) => setFilterAno(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Setor</Label>
                <Select value={filterSetor} onValueChange={setFilterSetor}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    {setorOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Filtros ativos:</span>
              {filterMes && <Badge variant="outline" className="text-xs">{filterMes}</Badge>}
              {filterAno && <Badge variant="outline" className="text-xs">{filterAno}</Badge>}
              {filterSetor && <Badge variant="outline" className="text-xs">{filterSetor}</Badge>}
              <span>— {totalCount} registro(s)</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum registro encontrado
            </div>
          ) : (
            <>
              <ScrollArea className="h-[55vh]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{format(new Date(r.data_vigilancia), "dd/MM/yyyy")}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{r.mes_vigilancia}/{r.ano_vigilancia}</Badge>
                        </TableCell>
                        <TableCell>{r.setor}</TableCell>
                        <TableCell>{r.profissional || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(r)}>
                                    <Pencil className="h-4 w-4 text-primary" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExportPdf(r)}>
                                    <FileDown className="h-4 w-4 text-accent-foreground" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Exportar PDF</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(r.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              {totalCount > PAGE_SIZE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-3 border-t mt-2">
                  <p className="text-xs text-muted-foreground">Mostrando {(pageSafe - 1) * PAGE_SIZE + 1}–{Math.min(pageSafe * PAGE_SIZE, totalCount)} de {totalCount}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8" disabled={pageSafe <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
                    <span className="text-xs text-muted-foreground px-1">Página {pageSafe} de {totalPages}</span>
                    <Button variant="outline" size="sm" className="h-8" disabled={pageSafe >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Próxima <ChevronLeft className="h-4 w-4 rotate-180" /></Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
