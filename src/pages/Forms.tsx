import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Copy, Trash2, Edit, Eye, FolderOpen, FileText, ClipboardCheck, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

interface FormTemplate {
  id: string;
  nome: string;
  categoria: string;
  campos: number;
  status: string;
  updated_at: string;
  preenchimentos: number;
  obrigatorio: boolean;
}

const categorias = ["Auditoria", "Vigilância", "Bundle", "Precaução", "Infraestrutura", "Laboratório", "Relatório", "Educação"];

export default function Forms() {
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newForm, setNewForm] = useState({ nome: "", categoria: "", campos: "", obrigatorio: false, descricao: "" });

  const fetchTemplates = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("form_templates")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTemplates(data.map((t: any) => ({
        id: t.id,
        nome: t.nome,
        categoria: t.categoria,
        campos: t.campos,
        status: t.status,
        updated_at: t.updated_at?.slice(0, 10) || "",
        preenchimentos: t.preenchimentos,
        obrigatorio: t.obrigatorio,
      })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (hospitalId && !ctxLoading) fetchTemplates();
    else if (!ctxLoading) setLoading(false);
  }, [hospitalId, ctxLoading]);

  const filtered = templates.filter((t) => {
    const matchSearch = t.nome.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || t.categoria === catFilter;
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchCat && matchStatus;
  });

  const stats = {
    total: templates.length,
    ativos: templates.filter((t) => t.status === "ativo").length,
    rascunhos: templates.filter((t) => t.status === "rascunho").length,
    preenchimentos: templates.reduce((s, t) => s + t.preenchimentos, 0),
  };

  const handleCreate = async () => {
    if (!newForm.nome || !newForm.categoria) { toast.error("Preencha nome e categoria."); return; }
    if (!hospitalId) return;

    const { error } = await supabase.from("form_templates").insert({
      hospital_id: hospitalId,
      nome: newForm.nome,
      categoria: newForm.categoria,
      campos: parseInt(newForm.campos) || 0,
      status: "rascunho",
      obrigatorio: newForm.obrigatorio,
      descricao: newForm.descricao,
      created_by: userId,
    } as any);

    if (error) { toast.error("Erro ao criar: " + error.message); return; }
    setNewForm({ nome: "", categoria: "", campos: "", obrigatorio: false, descricao: "" });
    setDialogOpen(false);
    toast.success("Formulário criado como rascunho!");
    fetchTemplates();
  };

  const handleDuplicate = async (t: FormTemplate) => {
    if (!hospitalId) return;
    const { error } = await supabase.from("form_templates").insert({
      hospital_id: hospitalId,
      nome: `${t.nome} (Cópia)`,
      categoria: t.categoria,
      campos: t.campos,
      status: "rascunho",
      obrigatorio: t.obrigatorio,
      created_by: userId,
    } as any);

    if (error) { toast.error("Erro ao duplicar: " + error.message); return; }
    toast.success("Formulário duplicado!");
    fetchTemplates();
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from("form_templates").update({ status: newStatus } as any).eq("id", id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(newStatus === "arquivado" ? "Formulário arquivado." : "Formulário ativado!");
    fetchTemplates();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("form_templates").delete().eq("id", id);
    if (error) { toast.error("Erro ao excluir: " + error.message); return; }
    toast.success("Formulário excluído.");
    fetchTemplates();
  };

  const statusBadge = (s: string) => {
    if (s === "ativo") return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Ativo</Badge>;
    if (s === "rascunho") return <Badge variant="secondary">Rascunho</Badge>;
    return <Badge variant="outline" className="text-muted-foreground">Arquivado</Badge>;
  };

  if (loading || ctxLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Formulários</h1>
          <p className="text-muted-foreground">Gerencie templates de formulários de auditoria e vigilância</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Formulário</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Criar Formulário</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Nome do Formulário *</Label>
                <Input value={newForm.nome} onChange={(e) => setNewForm({ ...newForm, nome: e.target.value })} placeholder="Ex: Checklist de Precauções" />
              </div>
              <div>
                <Label>Categoria *</Label>
                <Select value={newForm.categoria} onValueChange={(v) => setNewForm({ ...newForm, categoria: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número de Campos</Label>
                <Input type="number" value={newForm.campos} onChange={(e) => setNewForm({ ...newForm, campos: e.target.value })} placeholder="Ex: 12" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={newForm.descricao} onChange={(e) => setNewForm({ ...newForm, descricao: e.target.value })} placeholder="Descrição do formulário..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newForm.obrigatorio} onCheckedChange={(v) => setNewForm({ ...newForm, obrigatorio: v })} />
                <Label>Preenchimento obrigatório</Label>
              </div>
              <Button className="w-full" onClick={handleCreate}>Criar Formulário</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 text-center">
          <FolderOpen className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          <p className="text-xs text-muted-foreground">Total Formulários</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <CheckCircle2 className="h-5 w-5 mx-auto text-emerald-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.ativos}</p>
          <p className="text-xs text-muted-foreground">Ativos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <Edit className="h-5 w-5 mx-auto text-amber-500 mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.rascunhos}</p>
          <p className="text-xs text-muted-foreground">Rascunhos</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <ClipboardCheck className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold text-foreground">{stats.preenchimentos.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground">Preenchimentos</p>
        </CardContent></Card>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={catFilter} onValueChange={setCatFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categorias.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="rascunho">Rascunho</SelectItem>
            <SelectItem value="arquivado">Arquivado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Empty state */}
      {templates.length === 0 && !loading && (
        <Card>
          <CardContent className="py-16 text-center">
            <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum formulário cadastrado</h3>
            <p className="text-sm text-muted-foreground">Clique em "Novo Formulário" para criar seu primeiro template.</p>
          </CardContent>
        </Card>
      )}

      {/* Tabela */}
      {templates.length > 0 && (
        <Tabs defaultValue="todos">
          <TabsList>
            <TabsTrigger value="todos">Todos ({filtered.length})</TabsTrigger>
            <TabsTrigger value="obrigatorios">Obrigatórios ({filtered.filter(f => f.obrigatorio).length})</TabsTrigger>
          </TabsList>
          <TabsContent value="todos">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-center">Campos</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Preench.</TableHead>
                      <TableHead>Última Edição</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium text-sm">{t.nome}</span>
                            {t.obrigatorio && <Badge variant="outline" className="text-xs">Obrigatório</Badge>}
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{t.categoria}</Badge></TableCell>
                        <TableCell className="text-center">{t.campos}</TableCell>
                        <TableCell>{statusBadge(t.status)}</TableCell>
                        <TableCell className="text-center">{t.preenchimentos}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.updated_at}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="icon" variant="ghost" title="Duplicar" onClick={() => handleDuplicate(t)}><Copy className="h-4 w-4" /></Button>
                            {t.status !== "arquivado" ? (
                              <Button size="icon" variant="ghost" title="Arquivar" onClick={() => handleUpdateStatus(t.id, "arquivado")}><Trash2 className="h-4 w-4" /></Button>
                            ) : (
                              <Button size="icon" variant="ghost" title="Ativar" onClick={() => handleUpdateStatus(t.id, "ativo")}><CheckCircle2 className="h-4 w-4" /></Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="obrigatorios">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-center">Preench.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.filter(f => f.obrigatorio).map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium text-sm">{t.nome}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{t.categoria}</Badge></TableCell>
                        <TableCell>{statusBadge(t.status)}</TableCell>
                        <TableCell className="text-center">{t.preenchimentos}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
