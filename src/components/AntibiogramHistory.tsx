import { useState, useEffect, useMemo, useCallback } from "react";
import { History, Pencil, Trash2, X, Loader2, ChevronDown, ChevronUp, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

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
  const { hospitalId } = useHospitalContext();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<AntibiogramRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [mesFiltro, setMesFiltro] = useState("Todos");
  const [anoFiltro, setAnoFiltro] = useState("Todos");
  const [organismoFiltro, setOrganismoFiltro] = useState("Todos");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchRecords = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("lab_results")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("collection_date", { ascending: false });
    if (!error && data) {
      setRecords(data as AntibiogramRecord[]);
    }
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
      if (anoFiltro !== "Todos" && !r.collection_date?.startsWith(anoFiltro)) return false;
      if (mesFiltro !== "Todos") {
        const monthIdx = meses.indexOf(mesFiltro);
        const recMonth = r.collection_date ? new Date(r.collection_date + "T00:00:00").getMonth() : -1;
        if (monthIdx !== recMonth) return false;
      }
      if (organismoFiltro !== "Todos" && r.organism !== organismoFiltro) return false;
      return true;
    });
  }, [records, mesFiltro, anoFiltro, organismoFiltro]);

  const clearFilters = () => {
    setMesFiltro("Todos");
    setAnoFiltro("Todos");
    setOrganismoFiltro("Todos");
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <History className="h-4 w-4" />
        Histórico
      </Button>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Histórico de Antibiogramas
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mês</label>
              <Select value={mesFiltro} onValueChange={setMesFiltro}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ano</label>
              <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Microrganismo</label>
              <Select value={organismoFiltro} onValueChange={setOrganismoFiltro}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {organismosDisponiveis.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
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
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {filtered.map(record => (
                <div key={record.id} className="border rounded-lg p-3 space-y-2 bg-background">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
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
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir antibiograma</AlertDialogTitle>
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
