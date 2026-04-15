import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  History, Pencil, Trash2, FileDown, Filter, X, Loader2, ChevronDown, ChevronUp,
} from "lucide-react";
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
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface AuditRecord {
  id: string;
  audit_date: string;
  audit_type: string;
  sector: string | null;
  compliance_rate: number | null;
  compliant_items: number;
  total_items: number;
  observations: string | null;
  created_at: string;
  items?: AuditItem[];
}

interface AuditItem {
  id: string;
  question: string;
  status: string;
  category: string | null;
  observation: string | null;
  item_order: number;
}

interface AuditHistoryProps {
  auditType: string;
  onEdit?: (record: AuditRecord) => void;
}

export default function AuditHistory({ auditType, onEdit }: AuditHistoryProps) {
  const { hospitalId } = useHospitalContext();
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [mesFiltro, setMesFiltro] = useState("Todos");
  const [anoFiltro, setAnoFiltro] = useState("Todos");
  const [setorFiltro, setSetorFiltro] = useState("Todos");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const fetchRecords = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("audits")
      .select("*")
      .eq("hospital_id", hospitalId)
      .eq("audit_type", auditType as any)
      .order("audit_date", { ascending: false });
    if (!error && data) {
      setRecords(data as AuditRecord[]);
    }
    setLoading(false);
  }, [hospitalId, auditType]);

  useEffect(() => {
    if (open) fetchRecords();
  }, [open, fetchRecords]);

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    // Fetch items for this audit
    const rec = records.find(r => r.id === id);
    if (rec && !rec.items) {
      const { data } = await supabase
        .from("audit_items")
        .select("*")
        .eq("audit_id", id)
        .order("item_order");
      if (data) {
        setRecords(prev => prev.map(r => r.id === id ? { ...r, items: data as AuditItem[] } : r));
      }
    }
    setExpandedId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    // Delete items first, then audit
    await supabase.from("audit_items").delete().eq("audit_id", deleteId);
    const { error } = await supabase.from("audits").delete().eq("id", deleteId);
    if (error) {
      toast.error("Erro ao excluir: " + error.message);
    } else {
      toast.success("Registro excluído com sucesso.");
      setRecords(prev => prev.filter(r => r.id !== deleteId));
    }
    setDeleting(false);
    setDeleteId(null);
  };

  const handleExportPdf = async (record: AuditRecord) => {
    const el = cardRefs.current[record.id];
    if (!el) return;
    setExportingId(record.id);
    try {
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const ratio = canvas.height / canvas.width;
      const imgH = usableW * ratio;

      pdf.setFontSize(12);
      pdf.text(`Auditoria - ${auditType}`, margin, margin + 5);
      pdf.setFontSize(9);
      pdf.text(`Data: ${record.audit_date} | Setor: ${record.sector || "—"}`, margin, margin + 11);
      pdf.addImage(imgData, "PNG", margin, margin + 16, usableW, Math.min(imgH, 260));
      pdf.save(`auditoria-${auditType}-${record.audit_date}.pdf`);
      toast.success("PDF exportado!");
    } catch {
      toast.error("Erro ao exportar PDF.");
    } finally {
      setExportingId(null);
    }
  };

  // Filters
  const anosDisponiveis = useMemo(() => {
    const s = new Set(records.map(r => r.audit_date?.substring(0, 4)).filter(Boolean));
    return ["Todos", ...Array.from(s).sort().reverse()];
  }, [records]);

  const setoresDisponiveis = useMemo(() => {
    const s = new Set(records.map(r => r.sector).filter(Boolean) as string[]);
    return ["Todos", ...Array.from(s).sort()];
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (anoFiltro !== "Todos" && !r.audit_date?.startsWith(anoFiltro)) return false;
      if (mesFiltro !== "Todos") {
        const monthIdx = meses.indexOf(mesFiltro);
        const recMonth = r.audit_date ? new Date(r.audit_date + "T00:00:00").getMonth() : -1;
        if (monthIdx !== recMonth) return false;
      }
      if (setorFiltro !== "Todos" && r.sector !== setorFiltro) return false;
      return true;
    });
  }, [records, mesFiltro, anoFiltro, setorFiltro]);

  const clearFilters = () => {
    setMesFiltro("Todos");
    setAnoFiltro("Todos");
    setSetorFiltro("Todos");
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
              Histórico de Auditorias
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
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
              <label className="text-xs font-medium text-muted-foreground">Setor</label>
              <Select value={setorFiltro} onValueChange={setSetorFiltro}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {setoresDisponiveis.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
                <div
                  key={record.id}
                  ref={el => { cardRefs.current[record.id] = el; }}
                  className="border rounded-lg p-3 space-y-2 bg-background"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">
                        {new Date(record.audit_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </span>
                      {record.sector && (
                        <Badge variant="outline" className="text-[10px]">{record.sector}</Badge>
                      )}
                      <Badge
                        className={`text-[10px] ${
                          (record.compliance_rate ?? 0) >= 80
                            ? "bg-success text-success-foreground"
                            : (record.compliance_rate ?? 0) >= 50
                            ? "bg-warning text-warning-foreground"
                            : "bg-destructive text-destructive-foreground"
                        }`}
                      >
                        {record.compliance_rate?.toFixed(1) ?? "—"}%
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      {onEdit && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => onEdit(record)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7" title="Exportar PDF"
                        disabled={exportingId === record.id}
                        onClick={() => handleExportPdf(record)}
                      >
                        {exportingId === record.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
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

                  {/* Observations summary */}
                  {record.observations && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{record.observations}</p>
                  )}

                  {/* Expanded items */}
                  {expandedId === record.id && record.items && (
                    <div className="border-t pt-2 mt-2 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Itens ({record.compliant_items}/{record.total_items} conformes)
                      </p>
                      {record.items.map(item => (
                        <div key={item.id} className="flex items-start gap-2 text-xs">
                          <Badge
                            variant="outline"
                            className={`shrink-0 text-[9px] ${
                              item.status === "compliant"
                                ? "border-success text-success"
                                : item.status === "non_compliant"
                                ? "border-destructive text-destructive"
                                : "border-muted text-muted-foreground"
                            }`}
                          >
                            {item.status === "compliant" ? "C" : item.status === "non_compliant" ? "NC" : "NA"}
                          </Badge>
                          <span>{item.question}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.
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
