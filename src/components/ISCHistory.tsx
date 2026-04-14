import { useState, useMemo, useCallback } from "react";
import { History, Pencil, Trash2, FileDown, Filter, FilterX } from "lucide-react";
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
import { toast } from "sonner";
import { getISCRegistros, deleteISCRegistro, type ISCRegistro } from "@/lib/isc-storage";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const hospitalOptions = ["Hospital Geral", "Maternidade", "Hospital Pediátrico", "Hospital de médio porte", "Hospital dos olhos"];

interface Props {
  onEdit: (registro: ISCRegistro) => void;
}

export default function ISCHistory({ onEdit }: Props) {
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<ISCRegistro[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [filterMes, setFilterMes] = useState("");
  const [filterAno, setFilterAno] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = filterMes || filterAno;

  const clearFilters = () => {
    setFilterMes("");
    setFilterAno("");
  };

  const loadRecords = useCallback(() => {
    setRecords(getISCRegistros());
  }, []);

  const handleOpen = () => {
    loadRecords();
    setOpen(true);
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterMes && r.mes !== filterMes) return false;
      if (filterAno && r.ano !== filterAno) return false;
      return true;
    });
  }, [records, filterMes, filterAno]);

  const handleDelete = () => {
    if (!deleteId) return;
    deleteISCRegistro(deleteId);
    toast.success("Registro excluído com sucesso.");
    loadRecords();
    setDeleteId(null);
  };

  const handleEdit = (reg: ISCRegistro) => {
    onEdit(reg);
    setOpen(false);
    toast.info("Registro carregado para edição.");
  };

  const handleExportPdf = (reg: ISCRegistro) => {
    const mesNome = reg.mes ? meses[Number(reg.mes) - 1] || reg.mes : "—";

    const lines: string[] = [
      `Profissional: ${reg.nomeProfissional}`,
      `Data Vigilância: ${reg.dataVigilancia || "—"}`,
      `Período: ${mesNome}/${reg.ano}`,
      "",
    ];

    const clinicas = Object.keys(reg.indicadores);
    for (const clinica of clinicas) {
      const d = reg.indicadores[clinica];
      lines.push(`--- ${clinica} ---`);
      lines.push(`  Total Cirurgias: ${d.totalCirurgias}`);
      lines.push(`  Contatos Atendidos: ${d.contatosAtendidos}`);
      lines.push(`  Taxa Resposta: ${d.totalCirurgias > 0 ? ((d.contatosAtendidos / d.totalCirurgias) * 100).toFixed(1) : "0.0"}%`);
      lines.push(`  Reinternações: ${d.reinternacoes}`);
      lines.push(`  ISC Confirmada: ${d.iscConfirmada}`);
      lines.push(`  Sítio: ${d.sitio || "—"}`);
      lines.push(`  Taxa ISC: ${d.totalCirurgias > 0 ? ((d.iscConfirmada / d.totalCirurgias) * 100).toFixed(1) : "0.0"}%`);
      lines.push("");
    }

    // Simple text-based PDF using a printable window
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>ISC - ${reg.nomeProfissional} - ${mesNome}/${reg.ano}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; font-size: 13px; color: #333; }
              h1 { font-size: 18px; color: #0d9488; margin-bottom: 4px; }
              h2 { font-size: 14px; color: #666; margin-bottom: 20px; font-weight: normal; }
              .section { margin-bottom: 16px; }
              .section-title { font-weight: bold; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px; }
              .row { display: flex; justify-content: space-between; padding: 2px 0; }
              .label { color: #666; }
              .value { font-weight: 600; }
              .taxa { color: #0d9488; }
            </style>
          </head>
          <body>
            <h1>Indicadores ISC</h1>
            <h2>${reg.nomeProfissional} — ${mesNome}/${reg.ano}</h2>
            <div class="row"><span class="label">Data da Vigilância:</span><span class="value">${reg.dataVigilancia || "—"}</span></div>
            <br/>
            ${clinicas.map(clinica => {
              const d = reg.indicadores[clinica];
              const taxaResp = d.totalCirurgias > 0 ? ((d.contatosAtendidos / d.totalCirurgias) * 100).toFixed(1) : "0.0";
              const taxaISC = d.totalCirurgias > 0 ? ((d.iscConfirmada / d.totalCirurgias) * 100).toFixed(1) : "0.0";
              return `
                <div class="section">
                  <div class="section-title">${clinica}</div>
                  <div class="row"><span class="label">Total Cirurgias</span><span class="value">${d.totalCirurgias}</span></div>
                  <div class="row"><span class="label">Contatos Atendidos</span><span class="value">${d.contatosAtendidos}</span></div>
                  <div class="row"><span class="label">Taxa de Resposta</span><span class="value taxa">${taxaResp}%</span></div>
                  <div class="row"><span class="label">Reinternações</span><span class="value">${d.reinternacoes}</span></div>
                  <div class="row"><span class="label">ISC Confirmada</span><span class="value">${d.iscConfirmada}</span></div>
                  <div class="row"><span class="label">Sítio</span><span class="value">${d.sitio || "—"}</span></div>
                  <div class="row"><span class="label">Taxa de ISC</span><span class="value taxa">${taxaISC}%</span></div>
                </div>
              `;
            }).join("")}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={handleOpen}>
              <History className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Histórico de registros ISC</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg">Histórico de Indicadores ISC</DialogTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant={showFilters ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="gap-1.5"
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                </Button>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-destructive">
                    <FilterX className="h-4 w-4" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {/* Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="space-y-1">
                <Label className="text-xs">Mês</Label>
                <Select value={filterMes} onValueChange={setFilterMes}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os meses" />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <Input
                  type="number"
                  placeholder="Ex: 2025"
                  className="h-8 text-xs"
                  value={filterAno}
                  onChange={(e) => setFilterAno(e.target.value)}
                  min={2020}
                  max={2030}
                />
              </div>
            </div>
          )}

          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              {filterMes && <Badge variant="secondary" className="text-xs">{meses[Number(filterMes) - 1]}</Badge>}
              {filterAno && <Badge variant="secondary" className="text-xs">Ano: {filterAno}</Badge>}
              <span className="text-xs text-muted-foreground">— {filteredRecords.length} registro(s)</span>
            </div>
          )}

          <ScrollArea className="max-h-[55vh]">
            {filteredRecords.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                {records.length === 0 ? "Nenhum registro salvo ainda." : "Nenhum registro encontrado com os filtros aplicados."}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Profissional</TableHead>
                    <TableHead className="text-xs">Mês/Ano</TableHead>
                    <TableHead className="text-xs">Data Vigilância</TableHead>
                    <TableHead className="text-xs text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((reg) => {
                    const mesNome = reg.mes ? meses[Number(reg.mes) - 1] || reg.mes : "—";
                    return (
                      <TableRow key={reg.id}>
                        <TableCell className="text-sm font-medium">{reg.nomeProfissional}</TableCell>
                        <TableCell className="text-sm">{mesNome}/{reg.ano}</TableCell>
                        <TableCell className="text-sm">{reg.dataVigilancia || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(reg)}>
                                    <Pencil className="h-4 w-4 text-primary" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExportPdf(reg)}>
                                    <FileDown className="h-4 w-4 text-emerald-600" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Exportar PDF</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(reg.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
