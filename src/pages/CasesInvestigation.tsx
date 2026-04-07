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
import { Plus, Search, AlertTriangle, CheckCircle, Clock, Eye, Pencil } from "lucide-react";

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
  { id: "INV-001", paciente: "Maria S. Lima", prontuario: "P-10234", setor: "UTI Adulto", evento: "IPCS-CVC", classificacao: "IRAS confirmada", dispositivos: ["CVC"], status: "concluido", dataNotificacao: "2026-03-10", dataEncerramento: "2026-03-18", checklist: defaultChecklist.map((item) => ({ item, checked: true })), observacoes: "KPC isolada em hemocultura." },
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
  const [editingCase, setEditingCase] = useState<InvestigationCase | null>(null);

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

  const openNew = () => {
    setEditingCase(null);
    setForm({ paciente: "", prontuario: "", setor: "", evento: "", classificacao: "", dispositivos: [], observacoes: "" });
    setDialogOpen(true);
  };

  const openEditForm = (c: InvestigationCase) => {
    setEditingCase(c);
    setForm({ paciente: c.paciente, prontuario: c.prontuario, setor: c.setor, evento: c.evento, classificacao: c.classificacao, dispositivos: [...c.dispositivos], observacoes: c.observacoes });
    setDetailCase(null);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.paciente || !form.setor || !form.evento) { toast.error("Preencha paciente, setor e evento."); return; }
    if (editingCase) {
      setCases(cases.map((c) => c.id === editingCase.id ? { ...c, ...form } : c));
      toast.success("Caso atualizado!");
    } else {
      const newCase: InvestigationCase = {
        id: `INV-${String(cases.length + 1).padStart(3, "0")}`, ...form,
        status: "aberto", dataNotificacao: new Date().toISOString().split("T")[0],
        checklist: defaultChecklist.map((item) => ({ item, checked: false })),
      };
      setCases([newCase, ...cases]);
      toast.success("Caso registrado!");
    }
    setForm({ paciente: "", prontuario: "", setor: "", evento: "", classificacao: "", dispositivos: [], observacoes: "" });
    setEditingCase(null);
    setDialogOpen(false);
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
    toast.success(`Status: ${statusConfig[newStatus].label}`);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-foreground">Notificação e Investigação CCIH</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gerenciamento de casos de infecção hospitalar</p>
        </div>
        <Button onClick={openNew} size="sm" className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo Caso</span><span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: AlertTriangle, color: "text-destructive", value: kpis.abertos, label: "Abertos" },
          { icon: Search, color: "text-primary", value: kpis.emInvestigacao, label: "Em Investigação" },
          { icon: CheckCircle, color: "text-success", value: kpis.concluidos, label: "Concluídos" },
          { icon: Clock, color: "text-warning", value: kpis.pendentes, label: "Pendentes" },
        ].map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-3 p-3 md:pt-5 md:p-5">
              <k.icon className={`h-6 w-6 md:h-8 md:w-8 ${k.color} shrink-0`} />
              <div>
                <p className="text-lg md:text-2xl font-bold">{k.value}</p>
                <p className="text-[10px] md:text-sm text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente ou prontuário..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="aberto">Aberto</SelectItem>
            <SelectItem value="em_investigacao">Em Investigação</SelectItem>
            <SelectItem value="concluido">Concluído</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-2">
          <CardTitle className="text-sm md:text-lg">Casos de Investigação ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="hidden md:block overflow-x-auto">
            <Table className="text-sm">
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
                    <TableCell>
                      <div className="font-medium">{c.paciente}</div>
                      <div className="text-xs text-muted-foreground">{c.prontuario}</div>
                    </TableCell>
                    <TableCell>{c.setor}</TableCell>
                    <TableCell>{c.evento}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{c.classificacao}</Badge></TableCell>
                    <TableCell><Badge variant={statusConfig[c.status].variant} className="text-xs">{statusConfig[c.status].label}</Badge></TableCell>
                    <TableCell className="text-xs">{c.dataNotificacao}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditForm(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailCase(c)}><Eye className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-2 p-3">
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhum caso encontrado</p>}
            {filtered.map((c) => (
              <div key={c.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{c.paciente}</p>
                    <p className="text-[10px] text-muted-foreground">{c.id} · {c.prontuario}</p>
                  </div>
                  <Badge variant={statusConfig[c.status].variant} className="text-[10px] shrink-0">
                    {statusConfig[c.status].label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{c.setor}</Badge>
                  <Badge variant="outline" className="text-[10px]">{c.evento}</Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">{c.dataNotificacao}</span>
                </div>
                {c.dispositivos.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {c.dispositivos.map(d => (
                      <span key={d} className="text-[9px] bg-muted px-1.5 py-0.5 rounded">{d}</span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2 pt-1 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => openEditForm(c)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => setDetailCase(c)}>
                    <Eye className="h-3 w-3" /> Detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* New/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-4">
          <DialogHeader><DialogTitle className="text-base">{editingCase ? `Editar ${editingCase.id}` : "Novo Caso"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1"><Label className="text-xs">Paciente *</Label><Input value={form.paciente} onChange={(e) => setForm({ ...form, paciente: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-xs">Prontuário</Label><Input value={form.prontuario} onChange={(e) => setForm({ ...form, prontuario: e.target.value })} /></div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Setor *</Label>
              <Select value={form.setor} onValueChange={(v) => setForm({ ...form, setor: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Evento *</Label>
              <Select value={form.evento} onValueChange={(v) => setForm({ ...form, evento: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{eventos.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Classificação</Label>
              <Select value={form.classificacao} onValueChange={(v) => setForm({ ...form, classificacao: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{classificacoes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Dispositivos</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {dispositivosList.map((d) => (
                  <label key={d} className="flex items-center gap-1.5 text-xs">
                    <Checkbox checked={form.dispositivos.includes(d)} onCheckedChange={(checked) => setForm({ ...form, dispositivos: checked ? [...form.dispositivos, d] : form.dispositivos.filter((x) => x !== d) })} />
                    {d}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1"><Label className="text-xs">Observações</Label><Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={3} /></div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingCase(null); }}>Cancelar</Button>
            <Button onClick={handleSave}>{editingCase ? "Salvar" : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailCase} onOpenChange={() => setDetailCase(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-4">
          {detailCase && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center justify-between gap-2">
                  <span className="truncate">{detailCase.id} — {detailCase.paciente}</span>
                  <Button size="sm" variant="outline" className="gap-1 text-xs shrink-0" onClick={() => openEditForm(detailCase)}>
                    <Pencil className="h-3 w-3" /> Editar
                  </Button>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Prontuário:</span> {detailCase.prontuario}</div>
                  <div><span className="text-muted-foreground">Setor:</span> {detailCase.setor}</div>
                  <div><span className="text-muted-foreground">Evento:</span> {detailCase.evento}</div>
                  <div><span className="text-muted-foreground">Classificação:</span> {detailCase.classificacao}</div>
                  <div><span className="text-muted-foreground">Dispositivos:</span> {detailCase.dispositivos.join(", ") || "—"}</div>
                  <div><span className="text-muted-foreground">Notificação:</span> {detailCase.dataNotificacao}</div>
                </div>
                {detailCase.observacoes && <div className="text-xs bg-muted/50 p-3 rounded-md">{detailCase.observacoes}</div>}

                <div>
                  <h4 className="font-semibold text-sm mb-2">Checklist de Investigação</h4>
                  <div className="space-y-2">
                    {detailCase.checklist.map((item, idx) => (
                      <label key={idx} className="flex items-center gap-2 text-xs">
                        <Checkbox checked={item.checked} onCheckedChange={() => toggleChecklist(detailCase.id, idx)} />
                        <span className={item.checked ? "line-through text-muted-foreground" : ""}>{item.item}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {detailCase.checklist.filter((c) => c.checked).length}/{detailCase.checklist.length} itens concluídos
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {detailCase.status !== "em_investigacao" && (
                    <Button size="sm" className="text-xs" onClick={() => { handleStatusChange(detailCase.id, "em_investigacao"); setDetailCase(null); }}>Iniciar Investigação</Button>
                  )}
                  {detailCase.status !== "concluido" && (
                    <Button size="sm" variant="secondary" className="text-xs" onClick={() => { handleStatusChange(detailCase.id, "concluido"); setDetailCase(null); }}>Concluir</Button>
                  )}
                  {detailCase.status !== "pendente" && (
                    <Button size="sm" variant="outline" className="text-xs" onClick={() => { handleStatusChange(detailCase.id, "pendente"); setDetailCase(null); }}>Pendente</Button>
                  )}
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
