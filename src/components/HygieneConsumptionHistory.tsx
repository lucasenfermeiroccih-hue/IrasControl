import { useState, useEffect, useMemo, useCallback } from "react";
import { History, Trash2, Loader2, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import jsPDF from "jspdf";
import { loadHospitalLogos } from "@/lib/pdfLogoUtils";
import { todayStamp } from "@/lib/pdfReportKit";
import { buildHygieneConsumptionBatchPdf, sortConsumptionRecords } from "@/lib/historyBatchReports";
import { HistoryPagination, HistoryRowCheckbox, HistorySelectionBar } from "@/components/history/HistoryListControls";
import {
  HISTORY_BODY_CLASS, HISTORY_DIALOG_CLASS, HISTORY_SCROLL_LIST_CLASS, toggleInSet, useHistoryPagination,
} from "@/hooks/useHistoryList";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Record {
  id: string;
  setor: string;
  mes: string;
  ano: string;
  responsavel: string;
  total_formularios: number;
  instancias_com_higienizacao: number;
  instancias_sem_higienizacao: number;
  consumo_alcool_ml: number;
  consumo_sabonete_ml: number;
  paciente_dia: number;
  created_at: string;
}

export default function HygieneConsumptionHistory() {
  const { hospitalId, hospitalName } = useHospitalContext();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(false);
  const [mesFiltro, setMesFiltro] = useState<string[]>([]);
  const [anoFiltro, setAnoFiltro] = useState<string[]>([]);
  const [setorFiltro, setSetorFiltro] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  // Seleção múltipla para exportar vários registros em um único PDF
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const fetchRecords = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("hygiene_consumption_records")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false });
    if (!error && data) setRecords(data as any);
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => { if (open) fetchRecords(); }, [open, fetchRecords]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    const { error } = await supabase.from("hygiene_consumption_records").delete().eq("id", deleteId);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else {
      toast.success("Registro excluído.");
      setRecords(prev => prev.filter(r => r.id !== deleteId));
      setSelectedIds(prev => toggleInSet(prev, deleteId, false));
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const anosDisponiveis = useMemo(
    () => Array.from(new Set(records.map(r => r.ano).filter(Boolean))).sort().reverse(),
    [records]
  );
  const setoresDisponiveis = useMemo(
    () => Array.from(new Set(records.map(r => r.setor).filter(Boolean))).sort(),
    [records]
  );

  const filtered = useMemo(() => records.filter(r => {
    if (anoFiltro.length > 0 && !anoFiltro.includes(r.ano)) return false;
    if (mesFiltro.length > 0 && !mesFiltro.includes(r.mes)) return false;
    if (setorFiltro.length > 0 && !setorFiltro.includes(r.setor)) return false;
    return true;
  }), [records, mesFiltro, anoFiltro, setorFiltro]);

  const pager = useHistoryPagination(filtered, `${mesFiltro}|${anoFiltro}|${setorFiltro}`);

  /** Gera um único PDF com todos os registros selecionados. */
  const handleExportSelectedPdf = async () => {
    const selected = sortConsumptionRecords(records.filter(r => selectedIds.has(r.id)));
    if (selected.length === 0) return;
    setExporting(true);
    try {
      const logos = hospitalId ? await loadHospitalLogos(hospitalId) : { hospitalLogo: null, scihLogos: [] };
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      buildHygieneConsumptionBatchPdf(pdf, selected, { hospitalName, logos });
      pdf.save(`consumo-higiene-maos-${selected.length}-selecionados-${todayStamp()}.pdf`);
      toast.success(`PDF com ${selected.length} registro(s) exportado!`);
    } catch (e) {
      toast.error("Erro ao gerar o PDF dos registros selecionados: " + ((e as Error)?.message || "tente novamente."));
    } finally {
      setExporting(false);
    }
  };

  const clear = () => { setMesFiltro([]); setAnoFiltro([]); setSetorFiltro([]); };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <History className="h-4 w-4" /> Histórico
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o && exporting) return; setOpen(o); if (!o) setSelectedIds(new Set()); }}>
        <DialogContent className={HISTORY_DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Histórico — Consumo de Higiene das Mãos
            </DialogTitle>
          </DialogHeader>

          <div className={HISTORY_BODY_CLASS}>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Mês</label>
                <MultiSelectFilter label="Mês" selected={mesFiltro} onChange={setMesFiltro}
                  options={meses.map(m => ({ value: m, label: m }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Ano</label>
                <MultiSelectFilter label="Ano" selected={anoFiltro} onChange={setAnoFiltro}
                  options={anosDisponiveis.map(a => ({ value: a, label: a }))} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Setor</label>
                <MultiSelectFilter label="Setor" selected={setorFiltro} onChange={setSetorFiltro}
                  options={setoresDisponiveis.map(s => ({ value: s, label: s }))} />
              </div>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
                <Filter className="h-3 w-3" />Filtrar
              </Button>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clear}>
                <X className="h-3 w-3" />Limpar
              </Button>
            </div>

            {loading ? (
              <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro encontrado.</p>
            ) : (
              <>
              <HistorySelectionBar
                visibleIds={filtered.map(r => r.id)}
                selectedIds={selectedIds}
                onChange={setSelectedIds}
                onExport={handleExportSelectedPdf}
                progress={exporting ? { done: 0, total: selectedIds.size } : null}
              />
              <div ref={pager.listRef} className={HISTORY_SCROLL_LIST_CLASS}>
                {pager.pageItems.map(r => {
                  const total = r.instancias_com_higienizacao + r.instancias_sem_higienizacao;
                  const adesao = total > 0 ? (r.instancias_com_higienizacao / total) * 100 : null;
                  const consumoPD = r.paciente_dia > 0 ? (r.consumo_alcool_ml + r.consumo_sabonete_ml) / r.paciente_dia : null;
                  return (
                    <div key={r.id} className="border rounded-lg p-3 space-y-2 bg-background">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <HistoryRowCheckbox
                            checked={selectedIds.has(r.id)}
                            onChange={(c) => setSelectedIds(prev => toggleInSet(prev, r.id, c))}
                            disabled={exporting}
                            label="Selecionar registro para o PDF"
                          />
                          <span className="text-sm font-medium">{r.mes}/{r.ano}</span>
                          <Badge variant="outline" className="text-[10px]">{r.setor}</Badge>
                          {adesao !== null && (
                            <Badge className={`text-[10px] ${
                              adesao >= 80 ? "bg-success text-success-foreground" :
                              adesao >= 50 ? "bg-warning text-warning-foreground" :
                              "bg-destructive text-destructive-foreground"
                            }`}>
                              Adesão: {adesao.toFixed(1)}%
                            </Badge>
                          )}
                          {consumoPD !== null && (
                            <Badge variant="outline" className="text-[10px]">
                              {consumoPD.toFixed(2)} ML/PD
                            </Badge>
                          )}
                        </div>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                          onClick={() => setDeleteId(r.id)} title="Excluir">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div>Formulários: <span className="text-foreground font-medium">{r.total_formularios}</span></div>
                        <div>Álcool: <span className="text-foreground font-medium">{r.consumo_alcool_ml.toLocaleString("pt-BR")} ml</span></div>
                        <div>Sabonete: <span className="text-foreground font-medium">{r.consumo_sabonete_ml.toLocaleString("pt-BR")} ml</span></div>
                        <div>Paciente-Dia: <span className="text-foreground font-medium">{r.paciente_dia}</span></div>
                      </div>
                      {r.responsavel && (
                        <p className="text-[11px] text-muted-foreground">Responsável: {r.responsavel}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              <HistoryPagination
                page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize}
                onPage={pager.goTo}
              />
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de consumo? Esta ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
