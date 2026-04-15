import { useState, useEffect, useCallback, useMemo } from "react";
import { History, Pencil, Trash2, FileDown, Filter, FilterX, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
interface ISCRegistro {
  id: string;
  nomeProfissional: string;
  dataVigilancia: string;
  mes: string;
  ano: string;
  indicadores: Record<string, {
    totalCirurgias: number;
    contatosAtendidos: number;
    reinternacoes: number;
    iscConfirmada: number;
    sitio: string;
  }>;
  criadoEm: string;
  atualizadoEm: string;
}


const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Props {
  onEdit: (registro: ISCRegistro) => void;
}

export default function ISCHistory({ onEdit }: Props) {
  const { hospitalId } = useHospitalContext();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [filterMes, setFilterMes] = useState("");
  const [filterAno, setFilterAno] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = filterMes || filterAno;
  const clearFilters = () => { setFilterMes(""); setFilterAno(""); };

  const fetchRecords = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("isc_records")
      .select("*, isc_record_indicators(*)")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false })
      .limit(100);
    setLoading(false);
    if (error) { toast.error("Erro ao carregar histórico ISC"); return; }
    setRecords(data || []);
  }, [hospitalId]);

  useEffect(() => {
    if (open) fetchRecords();
  }, [open, fetchRecords]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (filterMes && r.mes !== filterMes) return false;
      if (filterAno && r.ano !== filterAno) return false;
      return true;
    });
  }, [records, filterMes, filterAno]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    // Delete indicators first, then record
    await supabase.from("isc_record_indicators").delete().eq("isc_record_id", deleteId);
    const { error } = await supabase.from("isc_records").delete().eq("id", deleteId);
    setDeleting(false);
    setDeleteId(null);
    if (error) { toast.error("Erro ao excluir registro"); return; }
    toast.success("Registro excluído com sucesso.");
    setRecords(prev => prev.filter(r => r.id !== deleteId));
  };

  const dbToISCRegistro = (rec: any): ISCRegistro => {
    const indicadores: Record<string, any> = {};
    for (const ind of (rec.isc_record_indicators || [])) {
      indicadores[ind.procedimento] = {
        totalCirurgias: ind.total_cirurgias,
        contatosAtendidos: ind.contatos_atendidos,
        reinternacoes: ind.reinternacoes,
        iscConfirmada: ind.isc_confirmada,
        sitio: ind.sitio || "",
      };
    }
    return {
      id: rec.id,
      nomeProfissional: rec.nome_profissional,
      dataVigilancia: rec.data_vigilancia,
      mes: rec.mes,
      ano: rec.ano,
      indicadores,
      criadoEm: rec.created_at,
      atualizadoEm: rec.updated_at,
    };
  };

  const handleEdit = (rec: any) => {
    onEdit(dbToISCRegistro(rec));
    setOpen(false);
    toast.info("Registro carregado para edição.");
  };

  const handleExportPdf = (rec: any) => {
    const reg = dbToISCRegistro(rec);
    const mesNome = reg.mes ? meses[Number(reg.mes) - 1] || reg.mes : "—";
    const clinicas = Object.keys(reg.indicadores);
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(`<html><head><title>ISC - ${reg.nomeProfissional} - ${mesNome}/${reg.ano}</title>
        <style>body{font-family:Arial,sans-serif;padding:40px;font-size:13px;color:#333}h1{font-size:18px;color:#0d9488;margin-bottom:4px}h2{font-size:14px;color:#666;margin-bottom:20px;font-weight:normal}.section{margin-bottom:16px}.section-title{font-weight:bold;font-size:14px;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:8px}.row{display:flex;justify-content:space-between;padding:2px 0}.label{color:#666}.value{font-weight:600}.taxa{color:#0d9488}</style></head><body>
        <h1>Indicadores ISC</h1><h2>${reg.nomeProfissional} — ${mesNome}/${reg.ano}</h2>
        ${clinicas.map(clinica => {
          const d = reg.indicadores[clinica];
          const taxaResp = d.totalCirurgias > 0 ? ((d.contatosAtendidos / d.totalCirurgias) * 100).toFixed(1) : "0.0";
          const taxaISC = d.totalCirurgias > 0 ? ((d.iscConfirmada / d.totalCirurgias) * 100).toFixed(1) : "0.0";
          return `<div class="section"><div class="section-title">${clinica}</div>
            <div class="row"><span class="label">Total Cirurgias</span><span class="value">${d.totalCirurgias}</span></div>
            <div class="row"><span class="label">Contatos Atendidos</span><span class="value">${d.contatosAtendidos}</span></div>
            <div class="row"><span class="label">Taxa de Resposta</span><span class="value taxa">${taxaResp}%</span></div>
            <div class="row"><span class="label">ISC Confirmada</span><span class="value">${d.iscConfirmada}</span></div>
            <div class="row"><span class="label">Taxa de ISC</span><span class="value taxa">${taxaISC}%</span></div></div>`;
        }).join("")}</body></html>`);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={() => setOpen(true)}>
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
                <Button variant={showFilters ? "default" : "outline"} size="sm" onClick={() => setShowFilters(!showFilters)} className="gap-1.5">
                  <Filter className="h-4 w-4" />Filtros
                </Button>
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1.5 text-destructive">
                    <FilterX className="h-4 w-4" />Limpar
                  </Button>
                )}
              </div>
            </div>
          </DialogHeader>

          {showFilters && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="space-y-1">
                <Label className="text-xs">Mês</Label>
                <Select value={filterMes} onValueChange={setFilterMes}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Todos os meses" /></SelectTrigger>
                  <SelectContent>{meses.map((m, i) => <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <Input type="number" placeholder="Ex: 2025" className="h-8 text-xs" value={filterAno} onChange={(e) => setFilterAno(e.target.value)} min={2020} max={2030} />
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap">
              {filterMes && <Badge variant="secondary" className="text-xs">{meses[Number(filterMes) - 1]}</Badge>}
              {filterAno && <Badge variant="secondary" className="text-xs">Ano: {filterAno}</Badge>}
              <span className="text-xs text-muted-foreground">— {filteredRecords.length} registro(s)</span>
            </div>
          )}

          <ScrollArea className="max-h-[55vh]">
            {loading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filteredRecords.length === 0 ? (
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
                  {filteredRecords.map((rec) => {
                    const mesNome = rec.mes ? meses[Number(rec.mes) - 1] || rec.mes : "—";
                    return (
                      <TableRow key={rec.id}>
                        <TableCell className="text-sm font-medium">{rec.nome_profissional}</TableCell>
                        <TableCell className="text-sm">{mesNome}/{rec.ano}</TableCell>
                        <TableCell className="text-sm">{rec.data_vigilancia || "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(rec)}><Pencil className="h-4 w-4 text-primary" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleExportPdf(rec)}><FileDown className="h-4 w-4 text-emerald-600" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteId(rec.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este registro? Esta ação não pode ser desfeita.</AlertDialogDescription>
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
