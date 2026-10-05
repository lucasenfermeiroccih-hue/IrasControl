import { useState, useEffect, useMemo, useCallback } from "react";
import { History, Pencil, Trash2, X, Loader2, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import { Badge } from "@/components/ui/badge";
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
import { buildAntibiogramBatchPdf } from "@/lib/historyBatchReports";
import { HistoryPagination, HistoryRowCheckbox, HistorySelectionBar } from "@/components/history/HistoryListControls";
import {
  HISTORY_BODY_CLASS, HISTORY_DIALOG_CLASS, HISTORY_SCROLL_LIST_CLASS, toggleInSet, useHistoryPagination,
} from "@/hooks/useHistoryList";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export interface AntibiogramRecord {
  id: string;
  collection_date: string;
  organism: string | null;
  sample_category: string | null;
  sample_material: string | null;
  sample_location_enabled: string | null;
  sample_location_detail: string | null;
  esbl: string | null;
  carbapenemase: string | null;
  carbapenemase_type: string | null;
  notes: string | null;
  created_at: string;
  results?: AntibiogramResultRow[];
}

export interface AntibiogramResultRow {
  id: string;
  antibiotic: string;
  sensitivity: string;
  sir_category: string | null;
  mic_value: number | null;
  notes: string | null;
}

interface Props {
  onEdit?: (record: AntibiogramRecord) => void;
  refreshKey?: number;
}

export default function AntibiogramHistory({ onEdit, refreshKey }: Props) {
  const { hospitalId, hospitalName } = useHospitalContext();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<AntibiogramRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [mesFiltro, setMesFiltro] = useState<string[]>([]);
  const [anoFiltro, setAnoFiltro] = useState<string[]>([]);
  const [organismoFiltro, setOrganismoFiltro] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Seleção múltipla para exportar vários exames em um único PDF
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    // Paginado: o Supabase devolve no máximo 1.000 linhas por consulta
    const all: AntibiogramRecord[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from("lab_results")
        .select("*")
        .eq("hospital_id", hospitalId)
        .order("collection_date", { ascending: false })
        .order("id")
        .range(from, from + 999);
      if (error || !data || data.length === 0) break;
      all.push(...(data as AntibiogramRecord[]));
      from += data.length;
    }
    setRecords(all);
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    if (open) fetchRecords();
  }, [open, fetchRecords, refreshKey]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    const rec = records.find(r => r.id === id);
    if (rec && !rec.results) {
      const { data } = await supabase
        .from("antibiogram_results")
        .select("*")
        .eq("lab_result_id", id);
      if (data) {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, results: data as AntibiogramResultRow[] } : r));
      }
    }
    setExpandedId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    await supabase.from("antibiogram_results").delete().eq("lab_result_id", deleteId);
    const { error } = await supabase.from("lab_results").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Registro excluído.");
      setRecords(prev => prev.filter(r => r.id !== deleteId));
      setSelectedIds(prev => toggleInSet(prev, deleteId, false));
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const handleEdit = async (record: AntibiogramRecord) => {
    if (!onEdit) return;
    // Ensure results loaded before editing
    let full = record;
    if (!record.results) {
      const { data } = await supabase
        .from("antibiogram_results")
        .select("*")
        .eq("lab_result_id", record.id);
      full = { ...record, results: (data || []) as AntibiogramResultRow[] };
    }
    onEdit(full);
    setOpen(false);
  };

  const anosDisponiveis = useMemo(() => {
    const s = new Set(records.map(r => r.collection_date?.substring(0, 4)).filter(Boolean));
    return ["Todos", ...Array.from(s).sort().reverse()];
  }, [records]);

  const organismosDisponiveis = useMemo(() => {
    const s = new Set(records.map(r => r.organism).filter(Boolean) as string[]);
    return ["Todos", ...Array.from(s).sort()];
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (anoFiltro.length > 0 && !anoFiltro.some(a => r.collection_date?.startsWith(a))) return false;
      if (mesFiltro.length > 0) {
        const recMonth = r.collection_date ? new Date(r.collection_date + "T00:00:00").getMonth() : -1;
        const allowed = mesFiltro.map(m => meses.indexOf(m));
        if (!allowed.includes(recMonth)) return false;
      }
      if (organismoFiltro.length > 0 && !organismoFiltro.includes(r.organism || "")) return false;
      return true;
    });
  }, [records, mesFiltro, anoFiltro, organismoFiltro]);

  const pager = useHistoryPagination(filtered, `${mesFiltro}|${anoFiltro}|${organismoFiltro}`);

  /** Gera um único PDF com todos os exames selecionados. */
  const handleExportSelectedPdf = async () => {
    const selected = records
      .filter(r => selectedIds.has(r.id))
      .sort((a, b) => a.collection_date.localeCompare(b.collection_date));
    if (selected.length === 0) return;
    setBatchProgress({ done: 0, total: selected.length });
    try {
      const resultsByExam: Record<string, AntibiogramResultRow[]> = {};
      const ids = selected.map(r => r.id);
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50);
        let from = 0;
        while (true) {
          const { data, error } = await supabase
            .from("antibiogram_results")
            .select("*")
            .in("lab_result_id", chunk)
            .order("id")
            .range(from, from + 999);
          if (error) throw error;
          if (!data || data.length === 0) break;
          for (const row of data as (AntibiogramResultRow & { lab_result_id: string })[]) {
            (resultsByExam[row.lab_result_id] ||= []).push(row);
          }
          from += data.length;
        }
        setBatchProgress({ done: Math.min(i + chunk.length, ids.length), total: ids.length });
      }
      const logos = hospitalId ? await loadHospitalLogos(hospitalId) : { hospitalLogo: null, scihLogos: [] };
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      buildAntibiogramBatchPdf(
        pdf,
        selected.map(r => ({ ...r, results: resultsByExam[r.id] || [] })),
        { hospitalName, logos },
      );
      pdf.save(`exames-culturas-${selected.length}-selecionados-${todayStamp()}.pdf`);
      toast.success(`PDF com ${selected.length} exame(s) exportado!`);
    } catch (e) {
      toast.error("Erro ao gerar o PDF dos exames selecionados: " + ((e as Error)?.message || "tente novamente."));
    } finally {
      setBatchProgress(null);
    }
  };

  const clearFilters = () => {
    setMesFiltro([]);
    setAnoFiltro([]);
    setOrganismoFiltro([]);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <History className="h-4 w-4" />
        Histórico
      </Button>

      <Dialog open={open} onOpenChange={(o) => { if (!o && batchProgress) return; setOpen(o); if (!o) setSelectedIds(new Set()); }}>
        <DialogContent className={HISTORY_DIALOG_CLASS}>
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Histórico de Exames/Culturas
            </DialogTitle>
          </DialogHeader>
          <div className={HISTORY_BODY_CLASS}>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mês</label>
              <MultiSelectFilter
                label="Mês"
                selected={mesFiltro}
                onChange={setMesFiltro}
                options={meses.map(m => ({ value: m, label: m }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ano</label>
              <MultiSelectFilter
                label="Ano"
                selected={anoFiltro}
                onChange={setAnoFiltro}
                options={anosDisponiveis.filter(a => a !== "Todos").map(a => ({ value: a, label: a }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Microrganismo</label>
              <MultiSelectFilter
                label="Microrganismo"
                selected={organismoFiltro}
                onChange={setOrganismoFiltro}
                options={organismosDisponiveis.filter(o => o !== "Todos").map(o => ({ value: o, label: o }))}
              />
            </div>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs">
              <Filter className="h-3 w-3" />Filtrar
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={clearFilters}>
              <X className="h-3 w-3" />Limpar
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum registro encontrado.</p>
          ) : (
            <>
            <HistorySelectionBar
              visibleIds={filtered.map(r => r.id)}
              selectedIds={selectedIds}
              onChange={setSelectedIds}
              onExport={handleExportSelectedPdf}
              progress={batchProgress}
            />
            <div ref={pager.listRef} className={HISTORY_SCROLL_LIST_CLASS}>
              {pager.pageItems.map(record => (
                <div key={record.id} className="border rounded-lg p-3 space-y-2 bg-background">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <HistoryRowCheckbox
                        checked={selectedIds.has(record.id)}
                        onChange={(c) => setSelectedIds(prev => toggleInSet(prev, record.id, c))}
                        disabled={!!batchProgress}
                        label="Selecionar exame para o PDF"
                      />
                      <span className="text-sm font-medium">
                        {new Date(record.collection_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                      {record.organism && (
                        <Badge variant="outline" className="text-[10px] italic">{record.organism}</Badge>
                      )}
                      {record.sample_material && (
                        <Badge variant="secondary" className="text-[10px]">{record.sample_material}</Badge>
                      )}
                      {record.esbl === "sim" && (
                        <Badge className="text-[10px] bg-warning text-warning-foreground">ESBL</Badge>
                      )}
                      {record.carbapenemase === "sim" && (
                        <Badge className="text-[10px] bg-destructive text-destructive-foreground">
                          {record.carbapenemase_type || "Carbapenemase"}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7" title="Editar"
                        onClick={() => handleEdit(record)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Excluir"
                        onClick={() => setDeleteId(record.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleExpand(record.id)}>
                        {expandedId === record.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  {record.notes && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{record.notes}</p>
                  )}

                  {expandedId === record.id && record.results && (
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Antimicrobianos testados ({record.results.length})
                      </p>
                      {record.results.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic">Sem resultados</p>
                      ) : (
                        record.results.map(item => {
                          const sir = item.sir_category || item.sensitivity || "NT";
                          const cls =
                            sir === "S" ? "bg-success text-success-foreground"
                            : sir === "I" ? "bg-warning text-warning-foreground"
                            : sir === "R" ? "bg-destructive text-destructive-foreground"
                            : "bg-muted text-muted-foreground";
                          return (
                            <div key={item.id} className="flex items-center gap-2 text-xs">
                              <Badge className={`shrink-0 text-[9px] ${cls}`}>{sir}</Badge>
                              <span className="font-medium">{item.antibiotic}</span>
                              {item.mic_value != null && (
                                <span className="text-muted-foreground">MIC: {item.mic_value}</span>
                              )}
                              {item.notes && (
                                <span className="text-muted-foreground italic">· {item.notes}</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <HistoryPagination
              page={pager.page} totalPages={pager.totalPages} total={pager.total} pageSize={pager.pageSize}
              onPage={(p) => { setExpandedId(null); pager.goTo(p); }}
            />
            </>
          )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir exame/cultura</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro e todos os antimicrobianos associados? Esta ação não poderá ser desfeita.
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
