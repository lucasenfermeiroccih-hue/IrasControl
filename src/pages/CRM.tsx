import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Search, Building2, Phone, Mail, Plus, Star, TrendingUp, MessageSquare, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

const stageConfig: Record<string, { label: string; color: string }> = {
  lead: { label: "Lead", color: "bg-blue-100 text-blue-800 border-blue-200" },
  prospect: { label: "Prospect", color: "bg-purple-100 text-purple-800 border-purple-200" },
  negociação: { label: "Negociação", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  cliente: { label: "Cliente", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  inativo: { label: "Inativo", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function CRM() {
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("Todos");
  const [showNewContact, setShowNewContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [form, setForm] = useState({ name: "", company: "", role: "", email: "", phone: "", stage: "lead", value: "", notes: "" });

  const loadContacts = async () => {
    if (!hospitalId) return;
    const { data } = await (supabase.from("crm_contacts" as any).select("*") as any)
      .eq("hospital_id", hospitalId).order("created_at", { ascending: false });
    setContacts(data || []);
  };

  useEffect(() => {
    if (ctxLoading || !hospitalId) { setLoading(false); return; }
    loadContacts().then(() => setLoading(false));
  }, [hospitalId, ctxLoading]);

  const filtered = contacts.filter((c: any) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company?.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "Todos" || c.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Nome é obrigatório"); return; }
    await (supabase.from("crm_contacts" as any).insert as any)({
      hospital_id: hospitalId, name: form.name, company: form.company,
      role: form.role, email: form.email, phone: form.phone,
      stage: form.stage, value: form.value, notes: form.notes, created_by: userId,
    });
    toast.success("Contato cadastrado!");
    setShowNewContact(false);
    setForm({ name: "", company: "", role: "", email: "", phone: "", stage: "lead", value: "", notes: "" });
    await loadContacts();
  };

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const clienteCount = contacts.filter((c: any) => c.stage === "cliente").length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div><h1 className="text-xl md:text-2xl font-bold text-foreground">CRM</h1><p className="text-sm text-muted-foreground">Gestão de relacionamento com instituições</p></div>
        </div>
        <Button onClick={() => setShowNewContact(true)}><Plus className="h-4 w-4 mr-1" />Novo Contato</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Total Contatos</p><p className="text-xl md:text-2xl font-bold">{contacts.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><Star className="h-5 w-5 text-emerald-500" /></div><div><p className="text-xs text-muted-foreground">Clientes Ativos</p><p className="text-xl md:text-2xl font-bold">{clienteCount}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-yellow-500/10"><TrendingUp className="h-5 w-5 text-yellow-500" /></div><div><p className="text-xs text-muted-foreground">Em Negociação</p><p className="text-xl md:text-2xl font-bold">{contacts.filter((c: any) => c.stage === "negociação").length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Leads</p><p className="text-xl md:text-2xl font-bold">{contacts.filter((c: any) => c.stage === "lead").length}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar contato..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos os Estágios</SelectItem>
                {Object.entries(stageConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instituição</TableHead>
                  <TableHead className="hidden md:table-cell">Contato</TableHead>
                  <TableHead>Estágio</TableHead>
                  <TableHead className="hidden md:table-cell">Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c: any) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedContact(c)}>
                    <TableCell><p className="font-medium text-sm">{c.name}</p><p className="text-xs text-muted-foreground">{c.company}</p></TableCell>
                    <TableCell className="hidden md:table-cell"><p className="text-sm">{c.role}</p><p className="text-xs text-muted-foreground">{c.email}</p></TableCell>
                    <TableCell><Badge variant="outline" className={stageConfig[c.stage]?.color || ""}>{stageConfig[c.stage]?.label || c.stage}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm font-medium">{c.value || "—"}</TableCell>
                    <TableCell className="text-right"><Button size="sm" variant="ghost">Detalhes</Button></TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum contato encontrado</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedContact} onOpenChange={(o) => !o && setSelectedContact(null)}>
        <DialogContent className="max-w-lg">
          {selectedContact && (
            <>
              <DialogHeader><DialogTitle>{selectedContact.name}</DialogTitle><DialogDescription>{selectedContact.company} — {selectedContact.role}</DialogDescription></DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{selectedContact.email || "—"}</div>
                <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{selectedContact.phone || "—"}</div>
                <div className="flex items-center gap-2"><Badge variant="outline" className={stageConfig[selectedContact.stage]?.color}>{stageConfig[selectedContact.stage]?.label}</Badge><span className="text-sm font-medium">{selectedContact.value}</span></div>
                {selectedContact.notes && <p className="text-sm text-muted-foreground">{selectedContact.notes}</p>}
              </div>
              <DialogFooter><Button variant="outline" onClick={() => setSelectedContact(null)}>Fechar</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showNewContact} onOpenChange={setShowNewContact}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Contato</DialogTitle><DialogDescription>Cadastrar nova instituição no CRM</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome da Instituição *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Hospital / Clínica" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div className="space-y-2"><Label>Cargo</Label><Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Estágio</Label>
                <Select value={form.stage} onValueChange={(v) => setForm({ ...form, stage: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(stageConfig).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Valor</Label><Input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="R$ 100.000/ano" /></div>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewContact(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
