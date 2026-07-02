import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  BookOpen, Loader2, Plus, Trash2, RefreshCw, Download,
  Eye, Search, Bot, Send, FileText, AlertTriangle,
  CheckCircle2, Clock, XCircle, BarChart3, Sparkles,
  FolderOpen, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import {
  listProtocols, listCategories, uploadProtocol, deleteProtocol,
  reprocessProtocol, getProtocolSignedUrl, downloadProtocol,
  askProtocolAI, getProtocolDashboard, createCategory,
} from "@/services/protocolsService";
import type {
  ProtocolDocument, ProtocolCategory, ProtocolDashboardData,
  ProtocolAIAnswer, ProtocolAISource,
} from "@/types/protocols";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ExtractionBadge({ status }: { status: ProtocolDocument["extraction_status"] }) {
  const map = {
    pending:    { label: "IA: na fila",      cls: "bg-slate-100 text-slate-700",   icon: Clock },
    processing: { label: "IA: processando",  cls: "bg-blue-100 text-blue-700",     icon: Loader2 },
    completed:  { label: "IA: disponível",   cls: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
    failed:     { label: "IA: falhou",       cls: "bg-red-100 text-red-700",       icon: XCircle },
  };
  const it = map[status] ?? map.pending;
  const Icon = it.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded ${it.cls}`}>
      <Icon className="h-3 w-3" />
      {it.label}
    </span>
  );
}

function formatBytes(bytes?: number | null) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function DashboardCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

// ─── Upload Dialog ─────────────────────────────────────────────────────────────

interface UploadDialogProps {
  open: boolean;
  onClose: () => void;
  hospitalId: string;
  categories: ProtocolCategory[];
  onUploaded: () => void;
}

function UploadDialog({ open, onClose, hospitalId, categories, onUploaded }: UploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "", description: "", sector: "", protocolType: "",
    documentCode: "", version: "1.0", responsibleName: "", responsibleRole: "",
    issueDate: "", reviewDate: "", expirationDate: "", categoryId: "",
    aiEnabled: true,
  });
  const [loading, setLoading] = useState(false);

  function reset() {
    setFile(null);
    setForm({
      title: "", description: "", sector: "", protocolType: "",
      documentCode: "", version: "1.0", responsibleName: "", responsibleRole: "",
      issueDate: "", reviewDate: "", expirationDate: "", categoryId: "",
      aiEnabled: true,
    });
  }

  async function handleSubmit() {
    if (!file) { toast.error("Selecione um arquivo."); return; }
    if (!form.title.trim()) { toast.error("Informe o título."); return; }
    setLoading(true);
    try {
      await uploadProtocol({
        hospitalId,
        file,
        title: form.title,
        description: form.description || undefined,
        sector: form.sector || undefined,
        protocolType: form.protocolType || undefined,
        documentCode: form.documentCode || undefined,
        version: form.version || "1.0",
        responsibleName: form.responsibleName || undefined,
        responsibleRole: form.responsibleRole || undefined,
        issueDate: form.issueDate || undefined,
        reviewDate: form.reviewDate || undefined,
        expirationDate: form.expirationDate || undefined,
        categoryId: form.categoryId || null,
        aiEnabled: form.aiEnabled,
      });
      toast.success("Protocolo enviado! A extração de IA ocorrerá em instantes.");
      reset();
      onUploaded();
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Erro ao enviar protocolo.");
    } finally {
      setLoading(false);
    }
  }

  const f = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Protocolo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Arquivo (PDF, DOCX, TXT, imagem — máx. 25 MB)</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
              className="mt-1"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file && <p className="text-xs text-muted-foreground mt-1">{file.name} · {formatBytes(file.size)}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Título *</Label>
              <Input className="mt-1" value={form.title} onChange={(e) => f("title", e.target.value)} />
            </div>
            <div className="col-span-2">
              <Label>Descrição</Label>
              <Textarea className="mt-1" rows={2} value={form.description} onChange={(e) => f("description", e.target.value)} />
            </div>
            <div>
              <Label>Setor</Label>
              <Input className="mt-1" value={form.sector} onChange={(e) => f("sector", e.target.value)} placeholder="UTI, Centro Cirúrgico..." />
            </div>
            <div>
              <Label>Tipo de Protocolo</Label>
              <Input className="mt-1" value={form.protocolType} onChange={(e) => f("protocolType", e.target.value)} placeholder="POP, PCDT..." />
            </div>
            <div>
              <Label>Código</Label>
              <Input className="mt-1" value={form.documentCode} onChange={(e) => f("documentCode", e.target.value)} />
            </div>
            <div>
              <Label>Versão</Label>
              <Input className="mt-1" value={form.version} onChange={(e) => f("version", e.target.value)} />
            </div>
            <div>
              <Label>Responsável</Label>
              <Input className="mt-1" value={form.responsibleName} onChange={(e) => f("responsibleName", e.target.value)} />
            </div>
            <div>
              <Label>Cargo</Label>
              <Input className="mt-1" value={form.responsibleRole} onChange={(e) => f("responsibleRole", e.target.value)} />
            </div>
            <div>
              <Label>Emissão</Label>
              <Input type="date" className="mt-1" value={form.issueDate} onChange={(e) => f("issueDate", e.target.value)} />
            </div>
            <div>
              <Label>Vencimento</Label>
              <Input type="date" className="mt-1" value={form.expirationDate} onChange={(e) => f("expirationDate", e.target.value)} />
            </div>
            {categories.length > 0 && (
              <div>
                <Label>Categoria</Label>
                <Select value={form.categoryId} onValueChange={(v) => f("categoryId", v)}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Sem categoria" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem categoria</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="aiEnabled"
                checked={form.aiEnabled}
                onChange={(e) => f("aiEnabled", e.target.checked)}
                className="h-4 w-4"
              />
              <Label htmlFor="aiEnabled" className="cursor-pointer">Habilitar busca por IA</Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Enviando...</> : "Enviar Protocolo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Protocol Card ─────────────────────────────────────────────────────────────

interface ProtocolCardProps {
  protocol: ProtocolDocument;
  onView: (p: ProtocolDocument) => void;
  onDelete: (p: ProtocolDocument) => void;
  onReprocess: (p: ProtocolDocument) => void;
}

function ProtocolCard({ protocol: p, onView, onDelete, onReprocess }: ProtocolCardProps) {
  const isExpired = p.expiration_date && new Date(p.expiration_date) < new Date();

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm leading-tight truncate">{p.title}</p>
            {p.document_code && (
              <p className="text-xs text-muted-foreground">{p.document_code} · v{p.version}</p>
            )}
          </div>
          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        </div>

        <div className="flex flex-wrap gap-1">
          {p.sector && <Badge variant="secondary" className="text-xs">{p.sector}</Badge>}
          {isExpired && <Badge variant="destructive" className="text-xs">Vencido</Badge>}
          <ExtractionBadge status={p.extraction_status} />
        </div>

        {p.extraction_error && (
          <p className="text-xs text-red-600 line-clamp-2">{p.extraction_error}</p>
        )}

        <div className="flex gap-1 pt-1 flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => onView(p)}>
            <Eye className="h-3 w-3 mr-1" />Ver
          </Button>
          {p.extraction_status === "failed" && (
            <Button size="sm" variant="outline" className="h-7 text-xs text-blue-600 border-blue-200" onClick={() => onReprocess(p)}>
              <RefreshCw className="h-3 w-3 mr-1" />Reprocessar IA
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => onDelete(p)}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Viewer Dialog ─────────────────────────────────────────────────────────────

function ViewerDialog({ protocol, url, onClose }: { protocol: ProtocolDocument | null; url: string; onClose: () => void }) {
  if (!protocol) return null;

  const isInlineViewable =
    protocol.file_mime_type?.includes("pdf") ||
    protocol.file_mime_type?.includes("image") ||
    protocol.file_mime_type?.includes("text");

  return (
    <Dialog open={!!protocol} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate pr-8">{protocol.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {url ? (
            isInlineViewable ? (
              <iframe src={url} title={protocol.title} className="w-full h-full rounded-md border" />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-4">
                <FileText className="h-12 w-12" />
                <p>Este formato (DOCX/DOC) não pode ser exibido no navegador.</p>
                <Button onClick={() => downloadProtocol(protocol)}>
                  <Download className="h-4 w-4 mr-2" />Baixar para visualizar
                </Button>
              </div>
            )
          ) : (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => downloadProtocol(protocol)}>
            <Download className="h-4 w-4 mr-2" />Baixar
          </Button>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── AI Chat ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: "user" | "ai";
  text: string;
  sources?: ProtocolAISource[];
}

function AIChat({ hospitalId }: { hospitalId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setLoading(true);
    try {
      const res: ProtocolAIAnswer = await askProtocolAI(hospitalId, question);
      setMessages((m) => [...m, { role: "ai", text: res.answer, sources: res.sources }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "ai", text: `Erro: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        A IA responde <strong>apenas</strong> com base nos protocolos cadastrados neste hospital.
      </div>

      <ScrollArea className="flex-1 border rounded-lg p-4 bg-muted/20">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
            <Bot className="h-10 w-10" />
            <p className="text-sm">Faça uma pergunta sobre os protocolos da unidade.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col gap-1 ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg p-3 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card border shadow-sm"
                  }`}
                >
                  {m.text}
                </div>
                {m.sources && m.sources.length > 0 && (
                  <div className="max-w-[85%] text-xs text-muted-foreground space-y-0.5">
                    <p className="font-medium">Fontes consultadas:</p>
                    {m.sources.map((s, j) => (
                      <p key={j}>
                        <ChevronRight className="h-3 w-3 inline" />
                        {s.title}{s.page_number ? ` (p. ${s.page_number})` : ""}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="bg-card border rounded-lg p-3 shadow-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <div className="flex gap-2">
        <Input
          placeholder="Pergunta sobre protocolos..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          disabled={loading}
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ProtocolosIA() {
  const { hospitalId, loading: hospitalLoading } = useHospitalContext();

  const [protocols, setProtocols] = useState<ProtocolDocument[]>([]);
  const [categories, setCategories] = useState<ProtocolCategory[]>([]);
  const [dashboard, setDashboard] = useState<ProtocolDashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [showUpload, setShowUpload] = useState(false);
  const [toDelete, setToDelete] = useState<ProtocolDocument | null>(null);
  const [viewer, setViewer] = useState<{ protocol: ProtocolDocument; url: string } | null>(null);
  const [viewerLoading, setViewerLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const [prots, cats, dash] = await Promise.all([
        listProtocols(hospitalId, {
          search: search || undefined,
          sector: filterSector || undefined,
          categoryId: filterCategory || undefined,
        }),
        listCategories(hospitalId),
        getProtocolDashboard(hospitalId),
      ]);
      setProtocols(prots);
      setCategories(cats);
      setDashboard(dash);
    } catch (e: any) {
      toast.error("Erro ao carregar protocolos: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [hospitalId, search, filterSector, filterCategory]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleView(p: ProtocolDocument) {
    setViewerLoading(true);
    setViewer({ protocol: p, url: "" });
    try {
      const url = await getProtocolSignedUrl(p.file_path);
      setViewer({ protocol: p, url });
    } catch (e: any) {
      toast.error("Erro ao obter URL: " + e.message);
      setViewer(null);
    } finally {
      setViewerLoading(false);
    }
  }

  async function handleDelete() {
    if (!toDelete) return;
    try {
      await deleteProtocol(toDelete);
      toast.success("Protocolo excluído.");
      setToDelete(null);
      fetchAll();
    } catch (e: any) {
      toast.error("Erro ao excluir: " + e.message);
    }
  }

  async function handleReprocess(p: ProtocolDocument) {
    try {
      await reprocessProtocol(p.id);
      toast.success("Reprocessamento iniciado.");
      fetchAll();
    } catch (e: any) {
      toast.error("Erro ao reprocessar: " + e.message);
    }
  }

  const sectors = Array.from(new Set(protocols.map((p) => p.sector).filter(Boolean))) as string[];

  if (hospitalLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!hospitalId) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        Nenhum hospital selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Protocolos da Unidade</h1>
            <p className="text-sm text-muted-foreground">Biblioteca com busca inteligente por IA</p>
          </div>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="h-4 w-4 mr-2" />Novo Protocolo
        </Button>
      </div>

      <Tabs defaultValue="biblioteca" className="space-y-4">
        <TabsList>
          <TabsTrigger value="biblioteca">
            <FolderOpen className="h-4 w-4 mr-1.5" />Biblioteca
          </TabsTrigger>
          <TabsTrigger value="ia">
            <Bot className="h-4 w-4 mr-1.5" />Perguntar à IA
          </TabsTrigger>
          <TabsTrigger value="dashboard">
            <BarChart3 className="h-4 w-4 mr-1.5" />Dashboard
          </TabsTrigger>
        </TabsList>

        {/* ── BIBLIOTECA ── */}
        <TabsContent value="biblioteca" className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar protocolos..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {sectors.length > 0 && (
              <Select value={filterSector} onValueChange={setFilterSector}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Todos os setores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os setores</SelectItem>
                  {sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
            {categories.length > 0 && (
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as categorias</SelectItem>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          ) : protocols.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
              <BookOpen className="h-10 w-10" />
              <p className="text-sm">Nenhum protocolo encontrado.</p>
              <Button variant="outline" size="sm" onClick={() => setShowUpload(true)}>
                <Plus className="h-4 w-4 mr-1" />Adicionar protocolo
              </Button>
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {protocols.map((p) => (
                <ProtocolCard
                  key={p.id}
                  protocol={p}
                  onView={handleView}
                  onDelete={setToDelete}
                  onReprocess={handleReprocess}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── IA ── */}
        <TabsContent value="ia" className="h-[60vh]">
          <AIChat hospitalId={hospitalId} />
        </TabsContent>

        {/* ── DASHBOARD ── */}
        <TabsContent value="dashboard" className="space-y-4">
          {dashboard ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <DashboardCard label="Total" value={dashboard.total} color="text-foreground" />
                <DashboardCard label="Ativos" value={dashboard.active} color="text-emerald-600" />
                <DashboardCard label="Vencidos" value={dashboard.expired} color="text-red-600" />
                <DashboardCard label="Vencem em 30d" value={dashboard.expiringSoon} color="text-amber-600" />
                <DashboardCard label="IA Disponível" value={dashboard.aiReady} color="text-blue-600" />
                <DashboardCard label="IA com Falha" value={dashboard.failed} color="text-red-500" />
              </div>
              {Object.keys(dashboard.bySector).length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-sm">Por Setor</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(dashboard.bySector)
                        .sort((a, b) => b[1] - a[1])
                        .map(([sector, count]) => (
                          <div key={sector} className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground w-40 truncate">{sector}</span>
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div
                                className="bg-primary h-2 rounded-full"
                                style={{ width: `${(count / dashboard.total) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium w-6 text-right">{count}</span>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <UploadDialog
        open={showUpload}
        onClose={() => setShowUpload(false)}
        hospitalId={hospitalId}
        categories={categories}
        onUploaded={fetchAll}
      />

      <ViewerDialog
        protocol={viewer?.protocol ?? null}
        url={viewer?.url ?? ""}
        onClose={() => setViewer(null)}
      />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => { if (!o) setToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir protocolo?</AlertDialogTitle>
            <AlertDialogDescription>
              O arquivo, os chunks de IA e o histórico serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={handleDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
