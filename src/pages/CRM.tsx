import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Users, Search, Building2, Phone, Mail, Plus, Star, Clock, TrendingUp, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone: string;
  stage: "lead" | "prospect" | "negociação" | "cliente" | "inativo";
  value: string;
  lastContact: string;
  score: number;
}

const mockContacts: Contact[] = [
  { id: "1", name: "Hospital Santa Maria", company: "Rede Saúde Plus", role: "Diretoria Clínica", email: "diretoria@santamaria.com", phone: "(11) 3456-7890", stage: "negociação", value: "R$ 180.000/ano", lastContact: "28/03/2026", score: 85 },
  { id: "2", name: "Hospital Municipal Norte", company: "Prefeitura SP", role: "CCIH", email: "ccih@hmnorte.gov.br", phone: "(11) 2345-6789", stage: "prospect", value: "R$ 95.000/ano", lastContact: "27/03/2026", score: 60 },
  { id: "3", name: "Clínica São José", company: "Grupo São José", role: "Administração", email: "admin@clinicasj.com", phone: "(21) 3456-7890", stage: "lead", value: "R$ 45.000/ano", lastContact: "25/03/2026", score: 35 },
  { id: "4", name: "Hospital Regional Sul", company: "SES-MG", role: "SCIH", email: "scih@hrsul.mg.gov.br", phone: "(31) 4567-8901", stage: "cliente", value: "R$ 150.000/ano", lastContact: "29/03/2026", score: 95 },
  { id: "5", name: "Hospital Universitário UFPR", company: "EBSERH", role: "CCIH", email: "ccih@hu-ufpr.edu.br", phone: "(41) 3567-8901", stage: "cliente", value: "R$ 210.000/ano", lastContact: "29/03/2026", score: 92 },
  { id: "6", name: "Hospital Infantil Darcy Vargas", company: "SES-SP", role: "Infectologia", email: "infecto@hidv.sp.gov.br", phone: "(11) 5678-9012", stage: "negociação", value: "R$ 120.000/ano", lastContact: "26/03/2026", score: 72 },
  { id: "7", name: "Maternidade Carmela Dutra", company: "SES-SC", role: "CCIH", email: "ccih@mcd.sc.gov.br", phone: "(48) 3678-9012", stage: "prospect", value: "R$ 65.000/ano", lastContact: "20/03/2026", score: 45 },
  { id: "8", name: "Hospital das Clínicas UFMG", company: "EBSERH", role: "Epidemiologia", email: "epidemio@hc.ufmg.br", phone: "(31) 5789-0123", stage: "lead", value: "R$ 250.000/ano", lastContact: "22/03/2026", score: 40 },
];

const stageConfig: Record<string, { label: string; color: string }> = {
  lead: { label: "Lead", color: "bg-blue-100 text-blue-800 border-blue-200" },
  prospect: { label: "Prospect", color: "bg-purple-100 text-purple-800 border-purple-200" },
  negociação: { label: "Negociação", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  cliente: { label: "Cliente", color: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  inativo: { label: "Inativo", color: "bg-gray-100 text-gray-800 border-gray-200" },
};

export default function CRM() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("Todos");
  const [showNewContact, setShowNewContact] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

  const filtered = mockContacts.filter((c) => {
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.company.toLowerCase().includes(search.toLowerCase());
    const matchStage = stageFilter === "Todos" || c.stage === stageFilter;
    return matchSearch && matchStage;
  });

  const totalValue = mockContacts.filter((c) => c.stage === "cliente").reduce((sum, c) => sum + parseInt(c.value.replace(/\D/g, "")), 0);
  const pipelineValue = mockContacts.filter((c) => c.stage === "negociação").reduce((sum, c) => sum + parseInt(c.value.replace(/\D/g, "")), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">CRM</h1>
            <p className="text-sm text-muted-foreground">Gestão de relacionamento com instituições</p>
          </div>
        </div>
        <Button onClick={() => setShowNewContact(true)}><Plus className="h-4 w-4 mr-1" />Novo Contato</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><Building2 className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Total Contatos</p><p className="text-2xl font-bold">{mockContacts.length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-500/10"><Star className="h-5 w-5 text-emerald-500" /></div><div><p className="text-xs text-muted-foreground">Clientes Ativos</p><p className="text-2xl font-bold">{mockContacts.filter((c) => c.stage === "cliente").length}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-yellow-500/10"><TrendingUp className="h-5 w-5 text-yellow-500" /></div><div><p className="text-xs text-muted-foreground">Pipeline</p><p className="text-lg font-bold">R$ {(pipelineValue / 100).toLocaleString("pt-BR")}</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div><div><p className="text-xs text-muted-foreground">Receita Ativa</p><p className="text-lg font-bold">R$ {(totalValue / 100).toLocaleString("pt-BR")}</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar contato ou instituição..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instituição</TableHead>
                <TableHead className="hidden md:table-cell">Contato</TableHead>
                <TableHead>Estágio</TableHead>
                <TableHead className="hidden md:table-cell">Valor</TableHead>
                <TableHead className="hidden lg:table-cell">Score</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedContact(c)}>
                  <TableCell>
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.company}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p className="text-sm">{c.role}</p>
                    <p className="text-xs text-muted-foreground">{c.email}</p>
                  </TableCell>
                  <TableCell><Badge variant="outline" className={stageConfig[c.stage].color}>{stageConfig[c.stage].label}</Badge></TableCell>
                  <TableCell className="hidden md:table-cell text-sm font-medium">{c.value}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${c.score}%` }} /></div>
                      <span className="text-xs">{c.score}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost">Detalhes</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Contact Detail Dialog */}
      <Dialog open={!!selectedContact} onOpenChange={(o) => !o && setSelectedContact(null)}>
        <DialogContent className="max-w-lg">
          {selectedContact && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedContact.name}</DialogTitle>
                <DialogDescription>{selectedContact.company} — {selectedContact.role}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{selectedContact.email}</div>
                <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{selectedContact.phone}</div>
                <div className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" />Último contato: {selectedContact.lastContact}</div>
                <div className="flex items-center gap-2"><Badge variant="outline" className={stageConfig[selectedContact.stage].color}>{stageConfig[selectedContact.stage].label}</Badge><span className="text-sm font-medium">{selectedContact.value}</span></div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => toast.info("Abrindo histórico...")}><MessageSquare className="h-4 w-4 mr-1" />Histórico</Button>
                <Button onClick={() => { setSelectedContact(null); toast.success("Interação registrada"); }}>Registrar Contato</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Contact Dialog */}
      <Dialog open={showNewContact} onOpenChange={setShowNewContact}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Contato</DialogTitle>
            <DialogDescription>Cadastrar nova instituição no CRM</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome da Instituição</Label><Input placeholder="Hospital / Clínica" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>E-mail</Label><Input type="email" placeholder="contato@inst.com" /></div>
              <div className="space-y-2"><Label>Telefone</Label><Input placeholder="(00) 0000-0000" /></div>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea placeholder="Notas sobre o contato..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewContact(false)}>Cancelar</Button>
            <Button onClick={() => { setShowNewContact(false); toast.success("Contato cadastrado"); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
