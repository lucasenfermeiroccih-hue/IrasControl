import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { History, Pencil, Trash2, FileDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";
import { toast } from "sonner";
import { inputFields, calculatedFields } from "@/data/indicadores-config";

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
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<IndicadorRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await (supabase
      .from("indicadores_records" as any)
      .select("*") as any)
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false })
      .limit(50);
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar histórico");
      return;
    }
    setRecords((data as IndicadorRecord[]) || []);
  }, [hospitalId]);

  useEffect(() => {
    if (open) fetchRecords();
  }, [open, fetchRecords]);

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
    setRecords((prev) => prev.filter((r) => r.id !== deleteId));
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
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Histórico de Indicadores
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhum registro encontrado
            </div>
          ) : (
            <ScrollArea className="h-[60vh]">
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
