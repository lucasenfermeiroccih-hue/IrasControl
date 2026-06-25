import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  History, Pencil, Trash2, FileDown, Filter, X, Loader2, ChevronDown, ChevronUp, Mail,
  Image as ImageIcon, ChevronLeft, ChevronRight,
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
  construction_renovation: "Verificação de Obras/Reformas",
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
  photo_urls?: string[] | null;
  photo_captions?: string[] | null;
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
  const [signedPhotos, setSignedPhotos] = useState<Record<string, string[]>>({});
  const [lightbox, setLightbox] = useState<string | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Email-to-manager state
  const [emailRecord, setEmailRecord] = useState<AuditRecord | null>(null);
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerCc, setManagerCc] = useState("");
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
    setManagerCc("");
    const items = await ensureItems(record.id);
    setEmailRecord({ ...record, items });
  };

  const handleSendEmail = async () => {
    if (!emailRecord) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email = managerEmail.trim();
    if (!emailRegex.test(email)) {
      toast.error("Informe um e-mail válido para o gestor do setor.");
      return;
    }
    const ccEmails = managerCc.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    const invalidCc = ccEmails.filter(e => !emailRegex.test(e));
    if (invalidCc.length > 0) {
      toast.error("E-mail(s) de cópia inválido(s): " + invalidCc.join(", "));
      return;
    }
    setSending(true);
    try {
      const items = emailRecord.items ?? (await ensureItems(emailRecord.id));
      const { data, error } = await supabase.functions.invoke("send-audit-email", {
        body: {
          to: email,
          cc: ccEmails,
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
          photoPaths: emailRecord.photo_urls ?? [],
          photoCaptions: emailRecord.photo_captions ?? [],
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

  const ensurePhotos = async (rec: AuditRecord): Promise<string[]> => {
    if (!rec.photo_urls || rec.photo_urls.length === 0) return [];
    if (signedPhotos[rec.id]) return signedPhotos[rec.id];
    const { data } = await supabase.storage
      .from("audit-photos")
      .createSignedUrls(rec.photo_urls, 3600);
    const urls = (data || []).map(d => d.signedUrl).filter(Boolean) as string[];
    setSignedPhotos(prev => ({ ...prev, [rec.id]: urls }));
    return urls;
  };

  // Photo editor (reordenar / legendar / remover em auditorias salvas)
  const [editRec, setEditRec] = useState<AuditRecord | null>(null);
  const [editItems, setEditItems] = useState<{ path: string; caption: string; url: string }[]>([]);
  const [savingPhotos, setSavingPhotos] = useState(false);

  const openPhotoEditor = async (record: AuditRecord) => {
    const urls = await ensurePhotos(record);
    const paths = record.photo_urls || [];
    const caps = record.photo_captions || [];
    setEditItems(paths.map((path, i) => ({ path, caption: caps[i] || "", url: urls[i] || "" })));
    setEditRec(record);
  };

  const editMove = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= editItems.length) return;
    const n = [...editItems];
    [n[i], n[j]] = [n[j], n[i]];
    setEditItems(n);
  };
  const editCaption = (i: number, caption: string) =>
    setEditItems(items => items.map((it, idx) => (idx === i ? { ...it, caption } : it)));
  const editRemove = (i: number) =>
    setEditItems(items => items.filter((_, idx) => idx !== i));

  const savePhotoEdits = async () => {
    if (!editRec) return;
    setSavingPhotos(true);
    const newPaths = editItems.map(it => it.path);
    const newCaps = editItems.map(it => it.caption || "");
    const removed = (editRec.photo_urls || []).filter(p => !newPaths.includes(p));
    const { error } = await supabase
      .from("audits")
      .update({ photo_urls: newPaths, photo_captions: newCaps })
      .eq("id", editRec.id);
    if (error) {
      toast.error("Erro ao salvar fotos: " + error.message);
      setSavingPhotos(false);
      return;
    }
    if (removed.length > 0) await supabase.storage.from("audit-photos").remove(removed);
    setRecords(prev => prev.map(r => r.id === editRec.id
      ? { ...r, photo_urls: newPaths, photo_captions: newCaps }
      : r));
    setSignedPhotos(prev => ({ ...prev, [editRec.id]: editItems.map(it => it.url) }));
    toast.success("Fotos atualizadas.");
    setSavingPhotos(false);
    setEditRec(null);
  };

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
    if (rec) ensurePhotos(rec);
    setExpandedId(id);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    // Remove photos from storage, then items, then audit
    const recToDelete = records.find(r => r.id === deleteId);
    if (recToDelete?.photo_urls && recToDelete.photo_urls.length > 0) {
      await supabase.storage.from("audit-photos").remove(recToDelete.photo_urls);
    }
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

      // Anexar fotos da auditoria (baixadas via storage para evitar CORS no canvas)
      if (record.photo_urls && record.photo_urls.length > 0) {
        const pageH = pdf.internal.pageSize.getHeight();
        const maxImgH = 110; // mm por foto
        pdf.addPage();
        let y = margin;
        pdf.setFontSize(12);
        pdf.text("Fotos da auditoria", margin, y);
        y += 8;
        for (let i = 0; i < record.photo_urls.length; i++) {
          try {
            const { data: blob } = await supabase.storage.from("audit-photos").download(record.photo_urls[i]);
            if (!blob) continue;
            const dataUrl: string = await new Promise((res, rej) => {
              const fr = new FileReader();
              fr.onload = () => res(fr.result as string);
              fr.onerror = rej;
              fr.readAsDataURL(blob);
            });
            const props = pdf.getImageProperties(dataUrl);
            const fmt = (props.fileType || "JPEG").toUpperCase();
            let w = usableW;
            let h = w * (props.height / props.width);
            if (h > maxImgH) { h = maxImgH; w = h * (props.width / props.height); }
            if (y + h > pageH - margin) { pdf.addPage(); y = margin; }
            pdf.addImage(dataUrl, fmt, margin, y, w, h);
            pdf.setFontSize(8);
            const caption = record.photo_captions?.[i]?.trim();
            pdf.text(caption ? `Foto ${i + 1} — ${caption}` : `Foto ${i + 1}`, margin, y + h + 3);
            y += h + 8;
          } catch {
            // pula foto que não pôde ser carregada/convertida
          }
        }
      }

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
                      {record.photo_urls && record.photo_urls.length > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <ImageIcon className="h-3 w-3" />{record.photo_urls.length}
                        </Badge>
                      )}
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

                      {record.photo_urls && record.photo_urls.length > 0 && (
                        <div className="pt-2" data-html2canvas-ignore="true">
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                              <ImageIcon className="h-3.5 w-3.5" /> Fotos ({record.photo_urls.length})
                            </p>
                            <Button variant="ghost" size="sm" className="h-6 gap-1 text-xs" onClick={() => openPhotoEditor(record)}>
                              <Pencil className="h-3 w-3" /> Gerenciar
                            </Button>
                          </div>
                          {signedPhotos[record.id] ? (
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                              {signedPhotos[record.id].map((url, i) => (
                                <div key={url} className="space-y-1">
                                  <button
                                    type="button"
                                    onClick={() => setLightbox(url)}
                                    className="block aspect-square w-full rounded-md overflow-hidden border bg-muted hover:opacity-80 transition-opacity"
                                  >
                                    <img src={url} alt={record.photo_captions?.[i] || `Foto ${i + 1}`} className="h-full w-full object-cover" loading="lazy" />
                                  </button>
                                  {record.photo_captions?.[i] && (
                                    <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{record.photo_captions[i]}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          )}
                        </div>
                      )}
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
            <div className="space-y-1.5">
              <Label htmlFor="manager-cc" className="text-xs">Com cópia (CC) — opcional</Label>
              <Input
                id="manager-cc"
                placeholder="email1@hospital.com, email2@hospital.com"
                value={managerCc}
                onChange={(e) => setManagerCc(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">Separe vários e-mails por vírgula, ponto e vírgula ou espaço.</p>
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

      {/* Photo lightbox */}
      <Dialog open={!!lightbox} onOpenChange={(o) => { if (!o) setLightbox(null); }}>
        <DialogContent className="max-w-3xl p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>Foto da auditoria</DialogTitle>
          </DialogHeader>
          {lightbox && (
            <img src={lightbox} alt="Foto da auditoria" className="w-full max-h-[80vh] object-contain rounded" />
          )}
        </DialogContent>
      </Dialog>

      {/* Photo editor (reordenar / legendar / remover) */}
      <Dialog open={!!editRec} onOpenChange={(o) => { if (!o && !savingPhotos) setEditRec(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-primary" /> Gerenciar fotos
            </DialogTitle>
            <DialogDescription>Reordene (◀ ▶), edite as legendas ou remova fotos desta auditoria.</DialogDescription>
          </DialogHeader>
          {editItems.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              Nenhuma foto. Ao salvar, todas as fotos desta auditoria serão removidas.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {editItems.map((it, i) => (
                <div key={it.path} className="rounded-md border bg-muted/30 overflow-hidden">
                  <div className="relative aspect-square bg-muted">
                    <img src={it.url} alt={it.caption || `Foto ${i + 1}`} className="h-full w-full object-cover" />
                    <span className="absolute top-1 left-1 rounded bg-black/60 text-white text-[10px] px-1.5 py-0.5">{i + 1}</span>
                    <button type="button" onClick={() => editRemove(i)} disabled={savingPhotos}
                      aria-label={`Remover foto ${i + 1}`}
                      className="absolute top-1 right-1 rounded-full bg-black/60 text-white p-1 hover:bg-black/80 disabled:opacity-50">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="p-1.5 space-y-1.5">
                    <Input value={it.caption} onChange={(e) => editCaption(i, e.target.value)}
                      placeholder="Legenda (opcional)" disabled={savingPhotos} className="h-7 text-xs" />
                    <div className="flex items-center justify-between">
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                        disabled={savingPhotos || i === 0} onClick={() => editMove(i, -1)} aria-label="Mover para trás">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6"
                        disabled={savingPhotos || i === editItems.length - 1} onClick={() => editMove(i, 1)} aria-label="Mover para frente">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRec(null)} disabled={savingPhotos}>Cancelar</Button>
            <Button onClick={savePhotoEdits} disabled={savingPhotos} className="gap-2">
              {savingPhotos ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Salvar alterações
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
