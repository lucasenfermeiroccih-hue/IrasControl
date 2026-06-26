import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Eye, Trash2, Clock, CheckCircle2,
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
  const [selectedNotif, setSelectedNotif] = useState<Notification | null>(null);
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [histLoading, setHistLoading] = useState(false);

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
    </div>
  );
}
