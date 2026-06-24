import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  History, Pencil, Trash2, FileDown, Filter, X, Loader2, ChevronDown, ChevronUp, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const AUDIT_TYPE_LABEL: Record<string, string> = {
  infection_control: "Controle de Infecção",
  hand_hygiene: "Higiene das Mãos",
  dispenser: "Dispensadores",
  cti_infrastructure: "Infraestrutura CTI",
  bundles: "Bundles CVC/SVD",
};

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
  const [mesFiltro, setMesFiltro] = useState<string[]>([]);
  const [anoFiltro, setAnoFiltro] = useState<string[]>([]);
  const [setorFiltro, setSetorFiltro] = useState<string[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Email-to-manager state
  const [emailRecord, setEmailRecord] = useState<AuditRecord | null>(null);
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [sending, setSending] = useState(false);

  const ensureItems = async (id: string): Promise<AuditItem[]> => {
    const rec = records.find(r => r.id === id);
    if (rec?.items) return rec.items;
    const { data } = await supabase
      .from("audit_items")
      .select("*")
      .eq("audit_id", id)
      .order("item_order");
    const items = (data as AuditItem[]) || [];
    setRecords(prev => prev.map(r => r.id === id ? { ...r, items } : r));
    return items;
  };

  const openEmail = async (record: AuditRecord) => {
    setManagerName("");
    setManagerEmail("");
    const items = await ensureItems(record.id);
    setEmailRecord({ ...record, items });
  };

  const handleSendEmail = async () => {
    if (!emailRecord) return;
    const email = managerEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error("Informe um e-mail válido para o gestor do setor.");
      return;
    }
    setSending(true);
    try {
      const items = emailRecord.items ?? (await ensureItems(emailRecord.id));
      const { data, error } = await supabase.functions.invoke("send-audit-email", {
        body: {
          to: email,
          managerName: managerName.trim(),
          audit: {
            typeLabel: AUDIT_TYPE_LABEL[auditType] || auditType,
            date: emailRecord.audit_date,
            sector: emailRecord.sector,
            complianceRate: emailRecord.compliance_rate,
            compliantItems: emailRecord.compliant_items,
            totalItems: emailRecord.total_items,
            observations: emailRecord.observations,
            items: items.map(it => ({
              question: it.question,
              status: it.status,
              observation: it.observation,
            })),
          },
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Auditoria enviada para ${email}.`);
      setEmailRecord(null);
    } catch (e: any) {
      toast.error("Não foi possível enviar o e-mail: " + (e?.message || "erro desconhecido."));
    } finally {
      setSending(false);
    }
  };

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
      if (anoFiltro.length > 0 && !anoFiltro.some(a => r.audit_date?.startsWith(a))) return false;
      if (mesFiltro.length > 0) {
        const recMonth = r.audit_date ? new Date(r.audit_date + "T00:00:00").getMonth() : -1;
        const allowed = mesFiltro.map(m => meses.indexOf(m));
        if (!allowed.includes(recMonth)) return false;
      }
      if (setorFiltro.length > 0 && !setorFiltro.includes(r.sector || "")) return false;
      return true;
    });
  }, [records, mesFiltro, anoFiltro, setorFiltro]);

  const clearFilters = () => {
    setMesFiltro([]);
    setAnoFiltro([]);
    setSetorFiltro([]);
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-2">
        <History className="h-4 w-4" />
        Histórico
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              Histórico de Auditorias
            </DialogTitle>
          </DialogHeader>
        <div className="space-y-4">
          {/* Filters */}
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
              <label className="text-xs font-medium text-muted-foreground">Setor</label>
              <MultiSelectFilter
                label="Setor"
                selected={setorFiltro}
                onChange={setSetorFiltro}
                options={setoresDisponiveis.filter(s => s !== "Todos").map(s => ({ value: s, label: s }))}
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
                        variant="ghost" size="icon" className="h-7 w-7 text-primary" title="Enviar por e-mail ao gestor do setor"
                        onClick={() => openEmail(record)}
                      >
                        <Mail className="h-3.5 w-3.5" />
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Send audit by email */}
      <Dialog open={!!emailRecord} onOpenChange={(o) => { if (!o && !sending) setEmailRecord(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Enviar auditoria ao gestor do setor
            </DialogTitle>
            <DialogDescription>
              {emailRecord && (
                <>Auditoria de <strong>{AUDIT_TYPE_LABEL[auditType] || auditType}</strong>
                {emailRecord.sector ? <> — setor <strong>{emailRecord.sector}</strong></> : null}
                {" "}({new Date(emailRecord.audit_date + "T00:00:00").toLocaleDateString("pt-BR")}).</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="manager-name" className="text-xs">Nome do gestor do setor</Label>
              <Input
                id="manager-name"
                placeholder="Ex.: Maria Silva"
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manager-email" className="text-xs">E-mail do gestor *</Label>
              <Input
                id="manager-email"
                type="email"
                placeholder="gestor@hospital.com.br"
                value={managerEmail}
                onChange={(e) => setManagerEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !sending) handleSendEmail(); }}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              O e-mail incluirá o corpo padrão do SCIH e a auditoria completa (itens, conformidade e não conformidades).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailRecord(null)} disabled={sending}>Cancelar</Button>
            <Button onClick={handleSendEmail} disabled={sending} className="gap-2">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
