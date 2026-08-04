import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, Search, RefreshCw, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  patient_id: string;
  hospital_id: string;
  changed_by: string | null;
  changed_at: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  old_data: Record<string, any> | null;
  new_data: Record<string, any> | null;
  diff_fields: string[] | null;
  patient_name?: string;
  user_email?: string;
}

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  INSERT: { label: "Cadastro", variant: "default" },
  UPDATE: { label: "Edição", variant: "secondary" },
  DELETE: { label: "Exclusão", variant: "destructive" },
};

const PAGE_SIZE = 20;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DiffViewer({ entry }: { entry: AuditEntry }) {
  const fields = entry.diff_fields || [];
  const isDelete = entry.action === "DELETE";
  const isInsert = entry.action === "INSERT";

  if (isInsert) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-muted-foreground">Paciente cadastrado com os seguintes dados:</p>
        <pre className="bg-muted rounded p-3 text-xs overflow-auto max-h-96 whitespace-pre-wrap">
          {JSON.stringify(entry.new_data, null, 2)}
        </pre>
      </div>
    );
  }

  if (isDelete) {
    return (
      <div className="space-y-2 text-sm">
        <p className="text-destructive font-medium">Paciente excluído. Dados anteriores:</p>
        <pre className="bg-destructive/10 rounded p-3 text-xs overflow-auto max-h-96 whitespace-pre-wrap">
          {JSON.stringify(entry.old_data, null, 2)}
        </pre>
      </div>
    );
  }

  // UPDATE — mostrar apenas campos alterados
  const relevantFields = fields.filter(f => f !== "*" && f !== "updated_at");
  if (relevantFields.length === 0) {
    return <p className="text-sm text-muted-foreground">Apenas metadados atualizados (updated_at).</p>;
  }

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted-foreground">Campos alterados: <strong>{relevantFields.join(", ")}</strong></p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="font-medium text-destructive mb-1">Antes</p>
          <pre className="bg-destructive/10 rounded p-3 text-xs overflow-auto max-h-80 whitespace-pre-wrap">
            {JSON.stringify(
              relevantFields.reduce((acc, f) => ({ ...acc, [f]: entry.old_data?.[f] }), {}),
              null, 2
            )}
          </pre>
        </div>
        <div>
          <p className="font-medium text-emerald-600 mb-1">Depois</p>
          <pre className="bg-emerald-50 dark:bg-emerald-950/20 rounded p-3 text-xs overflow-auto max-h-80 whitespace-pre-wrap">
            {JSON.stringify(
              relevantFields.reduce((acc, f) => ({ ...acc, [f]: entry.new_data?.[f] }), {}),
              null, 2
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default function PatientAuditLog() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);

  const fetchLogs = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);

    let query = supabase
      .from("patient_audit_log" as any)
      .select(`
        id, patient_id, hospital_id, changed_by, changed_at,
        action, old_data, new_data, diff_fields
      `, { count: "exact" })
      .eq("hospital_id", hospitalId)
      .order("changed_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (filterAction !== "all") query = query.eq("action", filterAction);

    const { data, error, count } = await query;

    if (error) {
      toast.error("Erro ao carregar auditoria: " + error.message);
      setLoading(false);
      return;
    }

    // Enriquecer com nome do paciente e email do usuário
    const rows: AuditEntry[] = (data || []) as any;

    const patientIds = [...new Set(rows.map(r => r.patient_id).filter(Boolean))];
    const userIds = [...new Set(rows.map(r => r.changed_by).filter(Boolean))];

    const [patientsRes, usersRes] = await Promise.all([
      patientIds.length
        ? supabase.from("patients").select("id, full_name").in("id", patientIds)
        : Promise.resolve({ data: [] }),
      userIds.length
        ? supabase.from("profiles" as any).select("id, email").in("id", userIds)
        : Promise.resolve({ data: [] }),
    ]);

    const patientMap: Record<string, string> = {};
    (patientsRes.data || []).forEach((p: any) => { patientMap[p.id] = p.full_name; });

    const userMap: Record<string, string> = {};
    (usersRes.data || []).forEach((u: any) => { userMap[u.id] = u.email; });

    const enriched = rows.map(r => ({
      ...r,
      patient_name: patientMap[r.patient_id] || r.old_data?.full_name || r.new_data?.full_name || r.patient_id,
      user_email: r.changed_by ? (userMap[r.changed_by] || r.changed_by) : "Sistema",
    }));

    // Filtro por nome do paciente (client-side após enriquecimento)
    const filtered = search
      ? enriched.filter(r =>
          (r.patient_name || "").toLowerCase().includes(search.toLowerCase()) ||
          (r.user_email || "").toLowerCase().includes(search.toLowerCase())
        )
      : enriched;

    setEntries(filtered);
    setTotal(count || 0);
    setLoading(false);
  }, [hospitalId, page, filterAction, search]);

  useEffect(() => {
    if (!ctxLoading && hospitalId) fetchLogs();
    if (!ctxLoading && !hospitalId) setLoading(false);
  }, [ctxLoading, hospitalId, fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-4 p-1">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold">Auditoria de Pacientes</h1>
          <p className="text-sm text-muted-foreground">Histórico completo de alterações em prontuários</p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar paciente ou usuário..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0); }}
                className="pl-9"
              />
            </div>
            <Select value={filterAction} onValueChange={v => { setFilterAction(v); setPage(0); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Tipo de ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                <SelectItem value="INSERT">Cadastro</SelectItem>
                <SelectItem value="UPDATE">Edição</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {total} registro{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data / Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Campos alterados</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : entries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  entries.map(entry => {
                    const actionCfg = ACTION_LABELS[entry.action] || { label: entry.action, variant: "outline" as const };
                    const relevantFields = (entry.diff_fields || []).filter(f => f !== "*" && f !== "updated_at");
                    return (
                      <TableRow key={entry.id} className="hover:bg-muted/30">
                        <TableCell className="text-sm whitespace-nowrap">{formatDate(entry.changed_at)}</TableCell>
                        <TableCell>
                          <Badge variant={actionCfg.variant} className="text-xs">{actionCfg.label}</Badge>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{entry.patient_name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{entry.user_email}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                          {entry.action === "INSERT" || entry.action === "DELETE"
                            ? "—"
                            : relevantFields.length > 0
                              ? relevantFields.join(", ")
                              : "metadados"}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setSelectedEntry(entry)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de detalhe */}
      <Dialog open={!!selectedEntry} onOpenChange={open => !open && setSelectedEntry(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Detalhe da Alteração
            </DialogTitle>
          </DialogHeader>
          {selectedEntry && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Data</p>
                  <p className="font-medium">{formatDate(selectedEntry.changed_at)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Ação</p>
                  <Badge variant={ACTION_LABELS[selectedEntry.action]?.variant || "outline"} className="text-xs">
                    {ACTION_LABELS[selectedEntry.action]?.label || selectedEntry.action}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Paciente</p>
                  <p className="font-medium">{selectedEntry.patient_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Usuário</p>
                  <p className="font-medium">{selectedEntry.user_email}</p>
                </div>
              </div>
              <ScrollArea className="max-h-[60vh]">
                <DiffViewer entry={selectedEntry} />
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
