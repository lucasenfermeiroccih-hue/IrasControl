import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, FileText, Search, AlertTriangle, CheckCircle, Clock, Eye } from "lucide-react";

type CaseStatus = "aberto" | "em_investigacao" | "concluido" | "pendente";

interface InvestigationCase {
  id: string;
  paciente: string;
  prontuario: string;
  setor: string;
  evento: string;
  classificacao: string;
  dispositivos: string[];
  status: CaseStatus;
  dataNotificacao: string;
  dataEncerramento?: string;
  checklist: { item: string; checked: boolean }[];
  observacoes: string;
}

const statusConfig: Record<CaseStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  aberto: { label: "Aberto", variant: "destructive" },
  em_investigacao: { label: "Em Investigação", variant: "default" },
  concluido: { label: "Concluído", variant: "secondary" },
  pendente: { label: "Pendente", variant: "outline" },
};

const setores = ["UTI Adulto", "UTI Neonatal", "UTI Pediátrica", "CC", "CME", "Enfermaria A", "Enfermaria B", "Pronto Socorro"];
const eventos = ["IPCS-CVC", "ITU-SVD", "PAV", "ISC", "Surto", "Óbito relacionado a IRAS", "Colonização MR"];
const classificacoes = ["IRAS confirmada", "IRAS provável", "Colonização", "Contaminação", "Em investigação"];
const dispositivosList = ["CVC", "SVD", "VM", "DVE", "PICC", "PAI", "TOT", "Dreno"];

const defaultChecklist = [
  "Coleta de culturas realizada",
  "Precauções de contato instaladas",
  "Notificação ANVISA realizada",
  "Discussão com equipe assistencial",
  "Medidas de bloqueio epidemiológico",
  "Busca ativa de contactantes",
  "Revisão de procedimentos invasivos",
  "Relatório final elaborado",
];

const initialCases: InvestigationCase[] = [
  { id: "INV-001", paciente: "Maria S. Lima", prontuario: "P-10234", setor: "UTI Adulto", evento: "IPCS-CVC", classificacao: "IRAS confirmada", dispositivos: ["CVC"], status: "concluido", dataNotificacao: "2026-03-10", dataEncerramento: "2026-03-18", checklist: defaultChecklist.map((item, i) => ({ item, checked: true })), observacoes: "KPC isolada em hemocultura." },
  { id: "INV-002", paciente: "João P. Santos", prontuario: "P-10890", setor: "UTI Neonatal", evento: "PAV", classificacao: "IRAS provável", dispositivos: ["VM", "TOT"], status: "em_investigacao", dataNotificacao: "2026-03-20", checklist: defaultChecklist.map((item, i) => ({ item, checked: i < 4 })), observacoes: "Aguardando resultado de cultura traqueal." },
  { id: "INV-003", paciente: "Ana C. Ferreira", prontuario: "P-11023", setor: "CC", evento: "ISC", classificacao: "Em investigação", dispositivos: ["Dreno"], status: "aberto", dataNotificacao: "2026-03-25", checklist: defaultChecklist.map((item) => ({ item, checked: false })), observacoes: "" },
  { id: "INV-004", paciente: "Carlos R. Oliveira", prontuario: "P-09876", setor: "Enfermaria A", evento: "ITU-SVD", classificacao: "IRAS confirmada", dispositivos: ["SVD"], status: "concluido", dataNotificacao: "2026-03-05", dataEncerramento: "2026-03-12", checklist: defaultChecklist.map((item) => ({ item, checked: true })), observacoes: "ESBL em urocultura. Cateter removido." },
  { id: "INV-005", paciente: "Fernanda M. Costa", prontuario: "P-11200", setor: "UTI Adulto", evento: "Surto", classificacao: "IRAS confirmada", dispositivos: ["CVC", "SVD"], status: "em_investigacao", dataNotificacao: "2026-03-22", checklist: defaultChecklist.map((item, i) => ({ item, checked: i < 5 })), observacoes: "Possível surto Acinetobacter no leito 5-8." },
  { id: "INV-006", paciente: "Ricardo A. Mendes", prontuario: "P-10567", setor: "UTI Pediátrica", evento: "IPCS-CVC", classificacao: "Colonização", dispositivos: ["PICC"], status: "pendente", dataNotificacao: "2026-03-15", checklist: defaultChecklist.map((item, i) => ({ item, checked: i < 2 })), observacoes: "Aguardando parecer infectologia." },
  { id: "INV-007", paciente: "Lucia B. Alves", prontuario: "P-11345", setor: "Pronto Socorro", evento: "Colonização MR", classificacao: "Colonização", dispositivos: [], status: "aberto", dataNotificacao: "2026-03-26", checklist: defaultChecklist.map((item) => ({ item, checked: false })), observacoes: "MRSA em swab nasal admissional." },
  { id: "INV-008", paciente: "Pedro H. Rocha", prontuario: "P-10999", setor: "CME", evento: "Óbito relacionado a IRAS", classificacao: "IRAS confirmada", dispositivos: ["CVC", "VM"], status: "em_investigacao", dataNotificacao: "2026-03-19", checklist: defaultChecklist.map((item, i) => ({ item, checked: i < 6 })), observacoes: "Óbito em investigação. Comissão de óbito acionada." },
  { id: "INV-009", paciente: "Mariana F. Dias", prontuario: "P-11100", setor: "UTI Adulto", evento: "PAV", classificacao: "Em investigação", dispositivos: ["VM", "TOT"], status: "pendente", dataNotificacao: "2026-03-24", checklist: defaultChecklist.map((item, i) => ({ item, checked: i < 1 })), observacoes: "" },
  { id: "INV-010", paciente: "Roberto G. Nunes", prontuario: "P-10450", setor: "Enfermaria B", evento: "ITU-SVD", classificacao: "Contaminação", dispositivos: ["SVD"], status: "concluido", dataNotificacao: "2026-03-08", dataEncerramento: "2026-03-10", checklist: defaultChecklist.map((item) => ({ item, checked: true })), observacoes: "Contaminação confirmada. Sem tratamento necessário." },
];

const CasesInvestigation = () => {
  const [cases, setCases] = useState<InvestigationCase[]>(initialCases);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailCase, setDetailCase] = useState<InvestigationCase | null>(null);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    paciente: "", prontuario: "", setor: "", evento: "", classificacao: "", dispositivos: [] as string[], observacoes: "",
  });

  const filtered = cases.filter((c) => {
    if (filterStatus !== "todos" && c.status !== filterStatus) return false;
    if (search && !c.paciente.toLowerCase().includes(search.toLowerCase()) && !c.prontuario.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const kpis = {
    abertos: cases.filter((c) => c.status === "aberto").length,
    emInvestigacao: cases.filter((c) => c.status === "em_investigacao").length,
    concluidos: cases.filter((c) => c.status === "concluido").length,
    pendentes: cases.filter((c) => c.status === "pendente").length,
  };

  const handleSave = () => {
    if (!form.paciente || !form.setor || !form.evento) {
      toast.error("Preencha paciente, setor e evento.");
      return;
    }
    const newCase: InvestigationCase = {
      id: `INV-${String(cases.length + 1).padStart(3, "0")}`,
      ...form,
      status: "aberto",
      dataNotificacao: new Date().toISOString().split("T")[0],
      checklist: defaultChecklist.map((item) => ({ item, checked: false })),
    };
    setCases([newCase, ...cases]);
    setForm({ paciente: "", prontuario: "", setor: "", evento: "", classificacao: "", dispositivos: [], observacoes: "" });
    setDialogOpen(false);
    toast.success("Caso registrado com sucesso!");
  };

  const toggleChecklist = (caseId: string, idx: number) => {
    setCases(cases.map((c) => {
      if (c.id !== caseId) return c;
      const updated = [...c.checklist];
      updated[idx] = { ...updated[idx], checked: !updated[idx].checked };
      return { ...c, checklist: updated };
    }));
  };

  const handleStatusChange = (caseId: string, newStatus: CaseStatus) => {
    setCases(cases.map((c) => c.id === caseId ? {
      ...c, status: newStatus, dataEncerramento: newStatus === "concluido" ? new Date().toISOString().split("T")[0] : c.dataEncerramento,
    } : c));
    toast.success(`Status atualizado para ${statusConfig[newStatus].label}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notificação e Investigação CCIH</h1>
          <p className="text-muted-foreground">Gerenciamento de casos de infecção hospitalar</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />Novo Caso</Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" /><p className="text-2xl font-bold">{kpis.abertos}</p><p className="text-sm text-muted-foreground">Abertos</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Search className="mx-auto h-8 w-8 text-primary mb-2" /><p className="text-2xl font-bold">{kpis.emInvestigacao}</p><p className="text-sm text-muted-foreground">Em Investigação</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" /><p className="text-2xl font-bold">{kpis.concluidos}</p><p className="text-sm text-muted-foreground">Concluídos</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Clock className="mx-auto h-8 w-8 text-yellow-600 mb-2" /><p className="text-2xl font-bold">{kpis.pendentes}</p><p className="text-sm text-muted-foreground">Pendentes</p></CardContent></Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente ou prontuário..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_investigacao">Em Investigação</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Casos de Investigação ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Paciente</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell><div className="font-medium">{c.paciente}</div><div className="text-xs text-muted-foreground">{c.prontuario}</div></TableCell>
                  <TableCell>{c.setor}</TableCell>
                  <TableCell>{c.evento}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{c.classificacao}</Badge></TableCell>
                  <TableCell><Badge variant={statusConfig[c.status].variant}>{statusConfig[c.status].label}</Badge></TableCell>
                  <TableCell className="text-sm">{c.dataNotificacao}</TableCell>
                  <TableCell><Button variant="ghost" size="sm" onClick={() => setDetailCase(c)}><Eye className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* New Case Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Novo Caso de Investigação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Paciente *</Label><Input value={form.paciente} onChange={(e) => setForm({ ...form, paciente: e.target.value })} /></div>
              <div><Label>Prontuário</Label><Input value={form.prontuario} onChange={(e) => setForm({ ...form, prontuario: e.target.value })} /></div>
            </div>
            <div><Label>Setor *</Label>
              <Select value={form.setor} onValueChange={(v) => setForm({ ...form, setor: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Evento *</Label>
              <Select value={form.evento} onValueChange={(v) => setForm({ ...form, evento: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{eventos.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Classificação</Label>
              <Select value={form.classificacao} onValueChange={(v) => setForm({ ...form, classificacao: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{classificacoes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Dispositivos</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {dispositivosList.map((d) => (
                  <label key={d} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={form.dispositivos.includes(d)} onCheckedChange={(checked) => setForm({ ...form, dispositivos: checked ? [...form.dispositivos, d] : form.dispositivos.filter((x) => x !== d) })} />
                    {d}
                  </label>
                ))}
              </div>
            </div>
            <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Registrar Caso</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailCase} onOpenChange={() => setDetailCase(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detailCase && (
            <>
              <DialogHeader><DialogTitle>{detailCase.id} — {detailCase.paciente}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Prontuário:</span> {detailCase.prontuario}</div>
                  <div><span className="text-muted-foreground">Setor:</span> {detailCase.setor}</div>
                  <div><span className="text-muted-foreground">Evento:</span> {detailCase.evento}</div>
                  <div><span className="text-muted-foreground">Classificação:</span> {detailCase.classificacao}</div>
                  <div><span className="text-muted-foreground">Dispositivos:</span> {detailCase.dispositivos.join(", ") || "—"}</div>
                  <div><span className="text-muted-foreground">Notificação:</span> {detailCase.dataNotificacao}</div>
                </div>
                {detailCase.observacoes && <div className="text-sm bg-muted/50 p-3 rounded-md">{detailCase.observacoes}</div>}

                <div>
                  <h4 className="font-semibold mb-2">Checklist de Investigação</h4>
                  <div className="space-y-2">
                    {detailCase.checklist.map((item, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-sm">
                        <Checkbox checked={item.checked} onCheckedChange={() => toggleChecklist(detailCase.id, idx)} />
                        <span className={item.checked ? "line-through text-muted-foreground" : ""}>{item.item}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">{detailCase.checklist.filter((c) => c.checked).length}/{detailCase.checklist.length} itens concluídos</p>
                </div>

                <div className="flex gap-2">
                  {detailCase.status !== "em_investigacao" && <Button size="sm" onClick={() => { handleStatusChange(detailCase.id, "em_investigacao"); setDetailCase(null); }}>Iniciar Investigação</Button>}
                  {detailCase.status !== "concluido" && <Button size="sm" variant="secondary" onClick={() => { handleStatusChange(detailCase.id, "concluido"); setDetailCase(null); }}>Concluir</Button>}
                  {detailCase.status !== "pendente" && <Button size="sm" variant="outline" onClick={() => { handleStatusChange(detailCase.id, "pendente"); setDetailCase(null); }}>Marcar Pendente</Button>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CasesInvestigation;
