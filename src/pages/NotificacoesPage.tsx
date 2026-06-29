import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Bell, Search, Plus, Activity, AlertTriangle, Droplets, Scissors,
  Baby, ShieldAlert, FileText, BarChart3, History, Loader2, Eye, Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import NotificationAttachmentsDialog from "@/components/NotificationAttachmentsDialog";
import NotificacaoDocumentosCard from "@/components/NotificacaoDocumentosCard";

const ICON_MAP: Record<string, React.ElementType> = {
  Bell, Activity, AlertTriangle, Droplets, Scissors, Baby, ShieldAlert, FileText,
};

const STATUS_COLORS: Record<string, string> = {
  rascunho: "bg-yellow-100 text-yellow-800",
  finalizada: "bg-green-100 text-green-800",
  retificada: "bg-blue-100 text-blue-800",
  cancelada: "bg-red-100 text-red-800",
};

interface NotifType {
  id: string;
  nome: string;
  descricao: string;
  fonte: string;
  anvisa_id: string | null;
  paradigma: string;
  prefixo: string;
  icon_name: string;
  visivel_para: { hospital_types: string[] };
}

interface RecentNotif {
  id: string;
  numero: string | null;
  mes_vigilancia: string | null;
  ano_vigilancia: number;
  status: string;
  created_at: string;
  type_id: string;
  notification_types: { nome: string; fonte: string } | null;
}

export default function NotificacoesPage() {
  const navigate = useNavigate();
  const { hospitalId } = useHospitalContext();

  const [types, setTypes] = useState<NotifType[]>([]);
  const [recent, setRecent] = useState<RecentNotif[]>([]);
  const [allNotifs, setAllNotifs] = useState<RecentNotif[]>([]);
  const [hospitalType, setHospitalType] = useState("geral");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [attachItem, setAttachItem] = useState<RecentNotif | null>(null);

  useEffect(() => {
    if (!hospitalId) return;
    loadData();
  }, [hospitalId]);

  async function loadData() {
    setLoading(true);
    try {
      const [{ data: hosp }, { data: typesData }, { data: recentData }, { data: allNotifsData }] = await Promise.all([
        (supabase.from("hospitals" as any).select("type").eq("id", hospitalId).single() as any),
        (supabase.from("notification_types" as any).select("*").eq("ativo", true).order("ordem") as any),
        (supabase.from("notifications" as any)
          .select("id, numero, mes_vigilancia, ano_vigilancia, status, created_at, type_id, notification_types(nome, fonte)")
          .eq("hospital_id", hospitalId)
          .order("created_at", { ascending: false })
          .limit(10) as any),
        (supabase.from("notifications" as any)
          .select("id, numero, mes_vigilancia, ano_vigilancia, status, created_at, type_id, notification_types(nome, fonte)")
          .eq("hospital_id", hospitalId)
          .order("created_at", { ascending: false }) as any),
      ]);

      if (hosp?.type) setHospitalType(hosp.type);
      if (typesData) setTypes(typesData as NotifType[]);
      if (recentData) setRecent(recentData as RecentNotif[]);
      if (allNotifsData) setAllNotifs(allNotifsData as RecentNotif[]);
    } catch (e: any) {
      toast.error("Erro ao carregar notificações: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  function isVisible(t: NotifType): boolean {
    const types = t.visivel_para?.hospital_types || ["all"];
    return types.includes("all") || types.includes(hospitalType);
  }

  const filtered = types
    .filter(isVisible)
    .filter(t => !search || t.nome.toLowerCase().includes(search.toLowerCase()) || t.fonte.toLowerCase().includes(search.toLowerCase()));

  const fonteGroups: Record<string, NotifType[]> = {};
  for (const t of filtered) {
    if (!fonteGroups[t.fonte]) fonteGroups[t.fonte] = [];
    fonteGroups[t.fonte].push(t);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Notificações ANVISA/PLACON</h1>
            <p className="text-sm text-muted-foreground">Notificações epidemiológicas compulsórias</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/notificacoes/historico")}>
            <History className="h-4 w-4 mr-2" />Histórico
          </Button>
          <Button variant="outline" onClick={() => navigate("/notificacoes/dashboard")}>
            <BarChart3 className="h-4 w-4 mr-2" />Dashboard
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Modelos disponíveis", value: filtered.length, icon: Bell, color: "text-primary bg-primary/10" },
          { label: "Notificações do mês", value: recent.filter(r => r.ano_vigilancia === new Date().getFullYear()).length, icon: FileText, color: "text-blue-600 bg-blue-50" },
          { label: "Finalizadas", value: recent.filter(r => r.status === "finalizada").length, icon: Activity, color: "text-green-600 bg-green-50" },
          { label: "Rascunhos", value: recent.filter(r => r.status === "rascunho").length, icon: AlertTriangle, color: "text-yellow-600 bg-yellow-50" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2 rounded-lg ${s.color.split(" ")[1]}`}>
                <s.icon className={`h-5 w-5 ${s.color.split(" ")[0]}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-xl font-bold">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Documentos ANVISA — sempre visível */}
      {hospitalId && (
        <NotificacaoDocumentosCard
          hospitalId={hospitalId}
          notifications={allNotifs as any}
        />
      )}

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar modelo de notificação..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Type cards grouped by fonte */}
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />Carregando modelos…
        </div>
      ) : (
        Object.entries(fonteGroups).map(([fonte, groupTypes]) => (
          <div key={fonte}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{fonte}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupTypes.map(t => {
                const Icon = ICON_MAP[t.icon_name] ?? Bell;
                return (
                  <Card key={t.id} className="flex flex-col hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex gap-1">
                          <Badge variant={t.paradigma === "caso" ? "destructive" : "secondary"} className="text-xs">
                            {t.paradigma}
                          </Badge>
                          {t.anvisa_id && (
                            <Badge variant="outline" className="text-xs">#{t.anvisa_id}</Badge>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-sm mt-2 leading-tight">{t.nome}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {t.descricao}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 pb-2">
                      <Badge variant="outline" className="text-xs">{t.prefixo}</Badge>
                    </CardContent>
                    <CardFooter className="pt-2 border-t">
                      <Button
                        className="w-full"
                        size="sm"
                        onClick={() => navigate(`/notificacoes/nova/${t.id}`)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Nova notificação
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          </div>
        ))
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Bell className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum modelo disponível para este tipo de hospital.</p>
        </div>
      )}

      {/* Recent notifications */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-3">Notificações Recentes</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.numero || "—"}</TableCell>
                      <TableCell className="text-xs">{(r.notification_types as any)?.nome || r.type_id}</TableCell>
                      <TableCell className="text-xs">{r.mes_vigilancia} {r.ano_vigilancia}</TableCell>
                      <TableCell>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status] || ""}`}>
                          {r.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(new Date(r.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" title="Ver/Editar" onClick={() => navigate(`/notificacoes/${r.id}/editar`)}>
                            <Eye className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Anexos ANVISA"
                            className="text-blue-600 hover:text-blue-700"
                            onClick={() => setAttachItem(r)}
                          >
                            <Paperclip className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <div className="mt-2 flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => navigate("/notificacoes/historico")}>
              Ver todas
            </Button>
          </div>
        </div>
      )}

      {/* Attachments dialog (from recent table) */}
      {attachItem && hospitalId && (
        <NotificationAttachmentsDialog
          open={!!attachItem}
          onClose={() => setAttachItem(null)}
          notificationId={attachItem.id}
          notificationLabel={(attachItem.notification_types as any)?.nome || "Notificação"}
          hospitalId={hospitalId}
        />
      )}
    </div>
  );
}
