import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  History, Search, Edit2, FileText, Loader2, Bell, ArrowLeft,
  Eye, Trash2, Clock, CheckCircle2, Paperclip, Upload, Download,
  Printer, X, File, Image, FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MES_OPTIONS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-yellow-100 text-yellow-800 border-yellow-200",
  finalizada: "bg-green-100 text-green-800 border-green-200",
  retificada: "bg-blue-100 text-blue-800 border-blue-200",
  cancelada: "bg-red-100 text-red-800 border-red-200",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  rascunho: Clock,
  finalizada: CheckCircle2,
  retificada: Edit2,
  cancelada: Trash2,
};

const ACCEPTED_TYPES = "application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword";

interface Notification {
  id: string;
  numero: string | null;
  type_id: string;
  mes_vigilancia: string | null;
  ano_vigilancia: number;
  setor: string | null;
  paciente_nome: string | null;
  microrganismo: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  calculated: Record<string, any>;
  notification_types: { nome: string; fonte: string; prefixo: string; paradigma: string } | null;
}

interface HistoryEntry {
  id: string;
  action: string;
  changed_by: string;
  observacao: string | null;
  created_at: string;
}

interface Attachment {
  id: string;
  notification_id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  file_type: string | null;
  description: string | null;
  uploaded_at: string;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string | null) {
  if (!type) return File;
  if (type === "application/pdf") return FileText;
  if (type.startsWith("image/")) return Image;
  return FileCheck;
}

export default function NotificacoesHistory() {
  const navigate = useNavigate();
  const { hospitalId } = useHospitalContext();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [types, setTypes] = useState<Array<{ id: string; nome: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMes, setFilterMes] = useState("all");
  const [filterAno, setFilterAno] = useState<string>(String(new Date().getFullYear()));

  // History dialog
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  // Attachment dialog
  const [attachNotif, setAttachNotif] = useState<Notification | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [attachLoading, setAttachLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDescription, setNewDescription] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hospitalId) return;
    loadAll();
  }, [hospitalId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [{ data: nots }, { data: typesData }] = await Promise.all([
        (supabase.from("notifications" as any)
          .select("*, notification_types(nome, fonte, prefixo, paradigma)")
          .eq("hospital_id", hospitalId)
          .order("created_at", { ascending: false }) as any),
        (supabase.from("notification_types" as any)
          .select("id, nome")
          .eq("ativo", true)
          .order("nome") as any),
      ]);
      if (nots) setNotifications(nots as Notification[]);
      if (typesData) setTypes(typesData as Array<{ id: string; nome: string }>);
    } catch (e: any) {
      toast.error("Erro ao carregar histórico: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadHistory(notifId: string) {
    setHistLoading(true);
    const { data } = await (supabase.from("notification_history" as any)
      .select("*")
      .eq("notification_id", notifId)
      .order("created_at", { ascending: false }) as any);
    if (data) setHistoryEntries(data as HistoryEntry[]);
    setHistLoading(false);
  }

  async function handleOpenHistory(n: Notification) {
    setSelectedNotif(n);
    await loadHistory(n.id);
  }

  async function loadAttachments(notifId: string) {
    setAttachLoading(true);
    const { data, error } = await (supabase.from("notification_attachments" as any)
      .select("*")
      .eq("notification_id", notifId)
      .order("uploaded_at", { ascending: false }) as any);
    if (error) toast.error("Erro ao carregar anexos: " + error.message);
    else setAttachments((data || []) as Attachment[]);
    setAttachLoading(false);
  }

  async function handleOpenAttachments(n: Notification) {
    setAttachNotif(n);
    setPendingFile(null);
    setNewDescription("");
    await loadAttachments(n.id);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 52 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo: 50 MB.");
      return;
    }
    setPendingFile(file);
  }

  async function handleUpload() {
    if (!pendingFile || !attachNotif || !hospitalId) return;
    setUploading(true);
    try {
      const ext = pendingFile.name.split(".").pop() || "";
      const safeName = pendingFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const filePath = `${hospitalId}/${attachNotif.id}/${Date.now()}_${safeName}`;

      const { error: storageError } = await supabase.storage
        .from("notification-attachments")
        .upload(filePath, pendingFile, { contentType: pendingFile.type, upsert: false });

      if (storageError) throw storageError;

      const { error: dbError } = await (supabase.from("notification_attachments" as any).insert({
        notification_id: attachNotif.id,
        hospital_id: hospitalId,
        file_name: pendingFile.name,
        file_path: filePath,
        file_size: pendingFile.size,
        file_type: pendingFile.type,
        description: newDescription.trim() || null,
      }) as any);

      if (dbError) {
        await supabase.storage.from("notification-attachments").remove([filePath]);
        throw dbError;
      }

      toast.success("Arquivo anexado com sucesso!");
      setPendingFile(null);
      setNewDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadAttachments(attachNotif.id);
    } catch (e: any) {
      toast.error("Erro ao anexar arquivo: " + e.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleView(attachment: Attachment) {
    const { data, error } = await supabase.storage
      .from("notification-attachments")
      .createSignedUrl(attachment.file_path, 300);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao abrir arquivo.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function handlePrint(attachment: Attachment) {
    const { data, error } = await supabase.storage
      .from("notification-attachments")
      .createSignedUrl(attachment.file_path, 300);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao preparar impressão.");
      return;
    }
    // PDFs and images: open in new window and trigger print
    const win = window.open(data.signedUrl, "_blank");
    if (win) {
      win.addEventListener("load", () => {
        try { win.print(); } catch { /* browser may block — user can print from the tab */ }
      });
    }
  }

  async function handleDownload(attachment: Attachment) {
    const { data, error } = await supabase.storage
      .from("notification-attachments")
      .createSignedUrl(attachment.file_path, 300);
    if (error || !data?.signedUrl) {
      toast.error("Erro ao baixar arquivo.");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = attachment.file_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleDeleteAttachment(attachment: Attachment) {
    if (!confirm(`Excluir o arquivo "${attachment.file_name}"?`)) return;
    const { error: storageErr } = await supabase.storage
      .from("notification-attachments")
      .remove([attachment.file_path]);
    if (storageErr) { toast.error("Erro ao excluir do storage: " + storageErr.message); return; }

    const { error: dbErr } = await (supabase.from("notification_attachments" as any)
      .delete()
      .eq("id", attachment.id) as any);
    if (dbErr) { toast.error("Erro ao excluir registro: " + dbErr.message); return; }

    toast.success("Arquivo excluído.");
    setAttachments(prev => prev.filter(a => a.id !== attachment.id));
  }

  async function handleGeneratePdf(n: Notification) {
    try {
      toast.loading("Gerando relatório PDF...", { id: "pdf-toast" });
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/notification-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ notification_id: n.id }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro na geração do PDF");
      toast.success("PDF gerado!", { id: "pdf-toast" });
      window.open(result.signedUrl, "_blank");
      loadAll();
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + e.message, { id: "pdf-toast" });
    }
  }

  async function handleCancel(n: Notification) {
    if (!confirm("Cancelar esta notificação?")) return;
    const { error } = await (supabase.from("notifications" as any)
      .update({ status: "cancelada" })
      .eq("id", n.id) as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Notificação cancelada.");
    loadAll();
  }

  const currentYear = new Date().getFullYear();
  const anoOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  const filtered = notifications.filter(n => {
    if (filterType !== "all" && n.type_id !== filterType) return false;
    if (filterStatus !== "all" && n.status !== filterStatus) return false;
    if (filterMes !== "all" && n.mes_vigilancia !== filterMes) return false;
    if (filterAno && n.ano_vigilancia !== Number(filterAno)) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        (n.numero || "").toLowerCase().includes(s) ||
        (n.notification_types?.nome || "").toLowerCase().includes(s) ||
        (n.paciente_nome || "").toLowerCase().includes(s) ||
        (n.microrganismo || "").toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/notificacoes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <History className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Histórico de Notificações</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} registro(s)</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Modelo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os modelos</SelectItem>
            {types.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="finalizada">Finalizada</SelectItem>
            <SelectItem value="retificada">Retificada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterMes} onValueChange={setFilterMes}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Mês" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os meses</SelectItem>
            {MES_OPTIONS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAno} onValueChange={setFilterAno}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {anoOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />Carregando…
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p>Nenhuma notificação encontrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Setor / Paciente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(n => {
                  const StatusIcon = STATUS_ICONS[n.status] ?? Bell;
                  const nt = n.notification_types;
                  return (
                    <TableRow key={n.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        {n.numero || <span className="text-muted-foreground italic">pendente</span>}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{nt?.nome || n.type_id}</div>
                        <div className="text-xs text-muted-foreground">{nt?.fonte}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {n.mes_vigilancia} {n.ano_vigilancia}
                      </TableCell>
                      <TableCell className="text-xs">
                        {n.setor || n.paciente_nome || "—"}
                        {n.microrganismo && (
                          <div className="text-muted-foreground">{n.microrganismo}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[n.status] || ""}`}>
                          <StatusIcon className="h-3 w-3" />
                          {n.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(n.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Ver/Editar"
                            onClick={() => navigate(`/notificacoes/${n.id}/editar`)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Histórico de ações"
                            onClick={() => handleOpenHistory(n)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Anexos enviados à ANVISA"
                            onClick={() => handleOpenAttachments(n)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </Button>
                          {n.status === "finalizada" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Gerar PDF"
                              onClick={() => handleGeneratePdf(n)}
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {n.status !== "cancelada" && n.status !== "finalizada" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Cancelar"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleCancel(n)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* History dialog */}
      <Dialog open={!!selectedNotif} onOpenChange={o => !o && setSelectedNotif(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Histórico — {selectedNotif?.numero || "Rascunho"}
            </DialogTitle>
          </DialogHeader>
          {histLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {historyEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sem histórico registrado.</p>
              ) : (
                historyEntries.map(h => (
                  <div key={h.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="p-1.5 rounded bg-primary/10">
                      <Clock className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs capitalize">{h.action}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(h.created_at), "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      {h.observacao && (
                        <p className="text-xs text-muted-foreground mt-1">{h.observacao}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Attachments dialog */}
      <Dialog open={!!attachNotif} onOpenChange={o => { if (!o) { setAttachNotif(null); setPendingFile(null); setNewDescription(""); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-blue-600" />
              Anexos — {attachNotif?.notification_types?.nome || "Notificação"}{attachNotif?.numero ? ` #${attachNotif.numero}` : ""}
            </DialogTitle>
          </DialogHeader>

          {/* Upload area */}
          <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
            <p className="text-sm font-medium">Anexar arquivo enviado à ANVISA</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_TYPES}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="notif-file-input"
                />
                <label
                  htmlFor="notif-file-input"
                  className="flex items-center justify-center gap-2 border-2 border-dashed border-muted-foreground/30 rounded-lg p-4 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                >
                  {pendingFile ? (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="h-4 w-4 text-primary" />
                      <span className="font-medium truncate max-w-xs">{pendingFile.name}</span>
                      <span className="text-muted-foreground shrink-0">({formatBytes(pendingFile.size)})</span>
                      <button
                        type="button"
                        onClick={e => { e.preventDefault(); setPendingFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">
                      <Upload className="h-5 w-5 mx-auto mb-1" />
                      Clique para selecionar um arquivo
                      <p className="text-xs mt-0.5">PDF, imagem ou Word — máx. 50 MB</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Descrição (opcional)</Label>
              <Textarea
                placeholder="Ex: Notificação IRAS enviada via SIVEP-Gripe em 29/06/2026"
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                rows={2}
                className="resize-none text-sm"
              />
            </div>
            <Button
              onClick={handleUpload}
              disabled={!pendingFile || uploading}
              className="w-full gap-2"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Enviando..." : "Salvar Anexo"}
            </Button>
          </div>

          {/* Existing attachments */}
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-green-600" />
              Arquivos salvos
              {attachments.length > 0 && (
                <Badge variant="secondary" className="text-xs">{attachments.length}</Badge>
              )}
            </p>

            {attachLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />Carregando anexos…
              </div>
            ) : attachments.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground border rounded-lg">
                <Paperclip className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Nenhum arquivo anexado ainda.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {attachments.map(att => {
                  const Icon = fileIcon(att.file_type);
                  return (
                    <div key={att.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/40 transition-colors">
                      <div className="p-1.5 rounded bg-primary/10 shrink-0 mt-0.5">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.file_name}</p>
                        {att.description && (
                          <p className="text-xs text-muted-foreground mt-0.5">{att.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatBytes(att.file_size)} · {format(new Date(att.uploaded_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Visualizar"
                          onClick={() => handleView(att)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Imprimir"
                          onClick={() => handlePrint(att)}
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Baixar"
                          onClick={() => handleDownload(att)}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Excluir"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteAttachment(att)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setAttachNotif(null); setPendingFile(null); setNewDescription(""); }}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
