import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  History, Search, Edit2, FileText, Loader2, Bell, ArrowLeft,
  Eye, Trash2, Clock, CheckCircle2, Paperclip, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import NotificationAttachmentsDialog from "@/components/NotificationAttachmentsDialog";
import jsPDF from "jspdf";

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

interface Notification {
  id: string;
  numero: string | null;
  type_id: string;
  hospital_id: string;
  mes_vigilancia: string | null;
  ano_vigilancia: number;
  setor: string | null;
  paciente_nome: string | null;
  microrganismo: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
  inputs: Record<string, any> | null;
  calculated: Record<string, any>;
  notification_types: { nome: string; fonte: string; prefixo: string; paradigma: string; schema?: any } | null;
}

interface HistoryEntry {
  id: string;
  action: string;
  changed_by: string;
  observacao: string | null;
  created_at: string;
}

// ─── PDF helpers ─────────────────────────────────────────────────────────────

function fmtVal(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (Array.isArray(v)) return v.join(", ") || "—";
  return String(v);
}

function labelFromKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function buildLabelMap(schema: any): Record<string, string> {
  const map: Record<string, string> = {};
  if (!schema?.blocos) return map;
  for (const bloco of schema.blocos) {
    for (const campo of bloco.campos || []) {
      if (campo.key && campo.label) map[campo.key] = campo.label;
    }
    if (bloco.seletor?.key) map[bloco.seletor.key] = bloco.seletor.label || bloco.seletor.key;
    if (bloco.bloco_repetivel?.campos) {
      for (const campo of bloco.bloco_repetivel.campos) {
        if (campo.key && campo.label) map[campo.key] = campo.label;
      }
    }
  }
  return map;
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}

async function generateCombinedPdf(notifIds: string[]) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const margin = 14;
  const pageW = 210;
  const contentW = pageW - 2 * margin;
  let y = margin;
  let firstPage = true;

  function newSection() {
    if (!firstPage) pdf.addPage();
    firstPage = false;
    y = margin;
  }

  function checkY(needed = 8) {
    if (y + needed > 283) { pdf.addPage(); y = margin; }
  }

  function addLine(text: string, size = 10, bold = false, color: [number,number,number] = [30,30,30]) {
    checkY(size * 0.5 + 3);
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, contentW) as string[];
    pdf.text(lines, margin, y);
    y += lines.length * (size * 0.4) + 2;
  }

  function addKV(label: string, value: string) {
    checkY(7);
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(80, 80, 80);
    pdf.text(`${label}:`, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(30, 30, 30);
    const val = pdf.splitTextToSize(value, contentW - 40) as string[];
    pdf.text(val, margin + 40, y);
    y += Math.max(val.length * 4, 5) + 1;
  }

  function addHRule(color: [number,number,number] = [200,200,200]) {
    checkY(4);
    pdf.setDrawColor(...color);
    pdf.line(margin, y, margin + contentW, y);
    y += 3;
  }

  for (let ni = 0; ni < notifIds.length; ni++) {
    newSection();

    // Fetch full notification
    const { data: notif, error: nErr } = await (supabase
      .from("notifications" as any)
      .select("*, notification_types(*)")
      .eq("id", notifIds[ni])
      .single() as any);
    if (nErr || !notif) { addLine(`Erro ao carregar notificação ${notifIds[ni]}`, 10); continue; }

    // Fetch hospital
    const { data: hosp } = await (supabase
      .from("hospitals" as any)
      .select("name, state, city, cnpj, cnes")
      .eq("id", notif.hospital_id)
      .single() as any);

    // Fetch attachments
    const { data: atts } = await (supabase
      .from("notification_attachments" as any)
      .select("*")
      .eq("notification_id", notifIds[ni])
      .order("uploaded_at") as any);

    const nt = notif.notification_types;
    const labelMap = buildLabelMap(nt?.schema);
    const inputs = notif.inputs || {};
    const topInputs = inputs._top || (typeof inputs === "object" && !inputs._top ? inputs : {});
    const blockInputs: Record<string, Record<string, Record<string, any>>> = inputs._blocks || {};

    // ── Header
    addLine(`NOTIFICAÇÃO ${nt?.fonte || "ANVISA"} / ${nt?.nome || ""}`, 13, true, [15, 60, 120]);
    y += 2;
    addHRule([15, 60, 120]);

    // Hospital info
    if (hosp) {
      addKV("Instituição", hosp.name || "—");
      addKV("CNPJ", hosp.cnpj || "—");
      addKV("CNES", hosp.cnes || "—");
      addKV("Estado", hosp.state || "—");
      if (hosp.city) addKV("Município", hosp.city);
    }
    addHRule();

    // Notification meta
    addKV("Número", notif.numero || "Pendente");
    addKV("Período", `${notif.mes_vigilancia || ""} / ${notif.ano_vigilancia}`);
    addKV("Status", notif.status);
    if (notif.finalized_at) addKV("Finalizada em", format(new Date(notif.finalized_at), "dd/MM/yyyy HH:mm", { locale: ptBR }));
    addKV("Criada em", format(new Date(notif.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR }));
    addHRule();

    // Form fields
    if (Object.keys(topInputs).length > 0) {
      addLine("Dados do Formulário", 10, true, [50, 50, 50]);
      y += 1;
      for (const [key, val] of Object.entries(topInputs)) {
        if (key.startsWith("_") || val === null || val === undefined || val === "") continue;
        const label = labelMap[key] || labelFromKey(key);
        addKV(label, fmtVal(val));
      }
      addHRule();
    }

    // Block data
    for (const [blocoId, instances] of Object.entries(blockInputs)) {
      const blocoSchema = nt?.schema?.blocos?.find((b: any) => b.id === blocoId);
      const blocoTitle = blocoSchema?.titulo || labelFromKey(blocoId);
      addLine(blocoTitle, 10, true, [50, 50, 50]);
      y += 1;
      for (const [instanceKey, fields] of Object.entries(instances)) {
        addLine(`▸ ${instanceKey}`, 9, true, [80, 80, 80]);
        for (const [key, val] of Object.entries(fields as Record<string, any>)) {
          if (val === null || val === undefined || val === "") continue;
          const label = labelMap[key] || labelFromKey(key);
          addKV(`  ${label}`, fmtVal(val));
        }
      }
      addHRule();
    }

    // Attachments section
    if (atts && atts.length > 0) {
      addLine("Documentos Anexados à ANVISA", 10, true, [15, 60, 120]);
      y += 1;
      for (const att of atts) {
        checkY(6);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(50, 50, 50);
        const size = att.file_size ? ` (${(att.file_size / 1024).toFixed(0)} KB)` : "";
        pdf.text(`• ${att.file_name}${size}`, margin + 2, y);
        y += 5;
        if (att.description) {
          pdf.setFontSize(8);
          pdf.setTextColor(100, 100, 100);
          pdf.text(`  ${att.description}`, margin + 4, y);
          y += 4;
        }
      }
      addHRule();

      // Embed images
      for (const att of atts) {
        if (!att.file_type?.startsWith("image/")) continue;
        try {
          const { data: signed } = await supabase.storage
            .from("notification-attachments")
            .createSignedUrl(att.file_path, 120);
          if (!signed?.signedUrl) continue;

          const resp = await fetch(signed.signedUrl);
          if (!resp.ok) continue;
          const blob = await resp.blob();
          const b64 = await blobToBase64(blob);

          pdf.addPage();
          y = margin;
          addLine(`Anexo: ${att.file_name}`, 10, true, [15, 60, 120]);
          y += 2;

          const imgProps = (pdf as any).getImageProperties(b64);
          const ratio = imgProps.height / imgProps.width;
          const imgW = contentW;
          const imgH = Math.min(imgW * ratio, 240);
          pdf.addImage(b64, att.file_type.includes("png") ? "PNG" : "JPEG", margin, y, imgW, imgH);
          y += imgH + 5;

          if (att.description) {
            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text(att.description, margin, y);
            y += 5;
          }
        } catch {
          // skip image if download fails
        }
      }
    }

    // Page numbers
    const totalPages = (pdf as any).getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      pdf.setPage(p);
      pdf.setFontSize(7);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Página ${p} de ${totalPages} — IRASControl`, margin, 292);
    }
  }

  const filename = notifIds.length === 1
    ? `notificacao-${Date.now()}.pdf`
    : `notificacoes-${notifIds.length}-${Date.now()}.pdf`;
  pdf.save(filename);
}

// ─── Component ────────────────────────────────────────────────────────────────

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

  // Multi-select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // History dialog
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  // Attachments dialog
  const [attachNotif, setAttachNotif] = useState<Notification | null>(null);

  useEffect(() => {
    if (!hospitalId) return;
    loadAll();
  }, [hospitalId]);

  async function loadAll() {
    setLoading(true);
    try {
      const [{ data: nots }, { data: typesData }] = await Promise.all([
        (supabase.from("notifications" as any)
          .select("*, notification_types(nome, fonte, prefixo, paradigma, schema)")
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

  async function handleDelete(n: Notification) {
    if (!confirm(`Excluir permanentemente a notificação "${n.numero || "rascunho"}"?\n\nEsta ação remove todos os dados e anexos e não pode ser desfeita.`)) return;
    try {
      // Remove attachments from storage
      const { data: atts } = await (supabase.from("notification_attachments" as any)
        .select("file_path").eq("notification_id", n.id) as any);
      if (atts?.length) {
        await supabase.storage.from("notification-attachments").remove(atts.map((a: any) => a.file_path));
        await (supabase.from("notification_attachments" as any).delete().eq("notification_id", n.id) as any);
      }
      // Remove history
      await (supabase.from("notification_history" as any).delete().eq("notification_id", n.id) as any);
      // Remove notification
      const { error } = await (supabase.from("notifications" as any).delete().eq("id", n.id) as any);
      if (error) throw error;
      toast.success("Notificação excluída.");
      setNotifications(prev => prev.filter(x => x.id !== n.id));
      setSelectedIds(prev => { const next = new Set(prev); next.delete(n.id); return next; });
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    }
  }

  async function handlePrintSelected() {
    if (selectedIds.size === 0) return;
    setGeneratingPdf(true);
    const toastId = "pdf-gen";
    toast.loading(`Gerando PDF com ${selectedIds.size} notificação(ões)…`, { id: toastId });
    try {
      await generateCombinedPdf([...selectedIds]);
      toast.success("PDF gerado com sucesso!", { id: toastId });
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + e.message, { id: toastId });
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function handleGeneratePdf(n: Notification) {
    setGeneratingPdf(true);
    const toastId = "pdf-single";
    toast.loading("Gerando relatório PDF…", { id: toastId });
    try {
      await generateCombinedPdf([n.id]);
      toast.success("PDF gerado!", { id: toastId });
    } catch (e: any) {
      toast.error("Erro ao gerar PDF: " + e.message, { id: toastId });
    } finally {
      setGeneratingPdf(false);
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

  function attachLabel(n: Notification) {
    const nome = n.notification_types?.nome || "Notificação";
    return n.numero ? `${nome} #${n.numero}` : nome;
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
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

  const allFilteredSelected = filtered.length > 0 && filtered.every(n => selectedIds.has(n.id));

  function toggleAll() {
    if (allFilteredSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(n => next.delete(n.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        filtered.forEach(n => next.add(n.id));
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => navigate("/notificacoes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <History className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Histórico de Notificações</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} registro(s)</p>
        </div>
        {selectedIds.size > 0 && (
          <Button
            onClick={handlePrintSelected}
            disabled={generatingPdf}
            className="gap-2"
          >
            {generatingPdf
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Printer className="h-4 w-4" />}
            Gerar PDF ({selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""})
          </Button>
        )}
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
                  <TableHead className="w-10">
                    <Checkbox
                      checked={allFilteredSelected}
                      onCheckedChange={toggleAll}
                      aria-label="Selecionar todas"
                    />
                  </TableHead>
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
                  const isSelected = selectedIds.has(n.id);
                  return (
                    <TableRow key={n.id} className={isSelected ? "bg-primary/5" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(n.id)}
                          aria-label={`Selecionar notificação ${n.numero || "rascunho"}`}
                        />
                      </TableCell>
                      <TableCell className="font-mono text-xs font-medium">
                        {n.numero || <span className="text-muted-foreground italic">pendente</span>}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium">{nt?.nome || n.type_id}</div>
                        <div className="text-xs text-muted-foreground">{nt?.fonte}</div>
                      </TableCell>
                      <TableCell className="text-xs">{n.mes_vigilancia} {n.ano_vigilancia}</TableCell>
                      <TableCell className="text-xs">
                        {n.setor || n.paciente_nome || "—"}
                        {n.microrganismo && <div className="text-muted-foreground">{n.microrganismo}</div>}
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
                          <Button size="sm" variant="ghost" title="Ver/Editar" onClick={() => navigate(`/notificacoes/${n.id}/editar`)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" title="Histórico de ações" onClick={() => handleOpenHistory(n)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Anexos ANVISA"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => setAttachNotif(n)}
                          >
                            <Paperclip className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Gerar PDF"
                            disabled={generatingPdf}
                            onClick={() => handleGeneratePdf(n)}
                          >
                            {generatingPdf
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <FileText className="h-3.5 w-3.5" />}
                          </Button>
                          {n.status !== "cancelada" && n.status !== "finalizada" && (
                            <Button size="sm" variant="ghost" title="Cancelar" className="text-amber-600 hover:text-amber-700" onClick={() => handleCancel(n)}>
                              <Clock className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Excluir permanentemente"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(n)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
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
                      {h.observacao && <p className="text-xs text-muted-foreground mt-1">{h.observacao}</p>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Attachments dialog */}
      {attachNotif && hospitalId && (
        <NotificationAttachmentsDialog
          open={!!attachNotif}
          onClose={() => setAttachNotif(null)}
          notificationId={attachNotif.id}
          notificationLabel={attachLabel(attachNotif)}
          hospitalId={hospitalId}
        />
      )}
    </div>
  );
}
