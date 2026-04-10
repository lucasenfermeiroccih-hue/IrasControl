import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
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
import { Plus, Search, AlertTriangle, CheckCircle, Clock, Eye, Pencil, Loader2, Download, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

type CaseStatus = "open" | "investigating" | "confirmed" | "discarded" | "closed";

interface InfectionCase {
  id: string;
  case_number: string | null;
  infection_type: string | null;
  infection_site: string | null;
  device_related: boolean;
  device_type: string | null;
  status: CaseStatus;
  detection_date: string;
  confirmation_date: string | null;
  notes: string | null;
  // joined from patients
  patient?: { full_name: string; medical_record: string | null; sector: string | null } | null;
}

const statusConfig: Record<CaseStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  open: { label: "Aberto", variant: "destructive" },
  investigating: { label: "Em Investigação", variant: "default" },
  confirmed: { label: "Confirmado", variant: "secondary" },
  discarded: { label: "Descartado", variant: "outline" },
  closed: { label: "Encerrado", variant: "outline" },
};

const setores = [
  "UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica",
  "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica", "Contêiner",
  "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto",
];
const eventos = ["IPCS-CVC", "ITU-SVD", "PAV", "ISC", "Surto", "Óbito relacionado a IRAS", "Colonização MR"];
const classificacoes = ["IRAS confirmada", "IRAS provável", "Colonização", "Contaminação", "Em investigação"];

const CasesInvestigation = () => {
  const location = useLocation();
  const navState = location.state as { fromMonitoring?: boolean; data?: any } | null;
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();
  const [cases, setCases] = useState<InfectionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailCase, setDetailCase] = useState<InfectionCase | null>(null);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const [editingCase, setEditingCase] = useState<InfectionCase | null>(null);
  const [saving, setSaving] = useState(false);
  const [prefilledBanner, setPrefilledBanner] = useState(false);

  const [form, setForm] = useState({
    paciente: "", prontuario: "", setor: "", evento: "", classificacao: "",
    dispositivos: [] as string[], observacoes: "",
  });

  // Detect prefilled data from patient monitoring
  useEffect(() => {
    if (navState?.fromMonitoring && navState.data) {
      const d = navState.data;
      const obsLines: string[] = [];
      if (d.diagnostico) obsLines.push(`Diagnóstico: ${d.diagnostico}`);
      if (d.doencasBase) obsLines.push(`Doenças de base: ${d.doencasBase}`);
      if (d.motivoInternacao) obsLines.push(`Motivo internação: ${d.motivoInternacao}`);
      if (d.especialidade) obsLines.push(`Especialidade: ${d.especialidade}`);

      // Dispositivos
      if (d.dispositivos) {
        const dispParts = Object.entries(d.dispositivos as Record<string, string>)
          .filter(([, v]) => v && v !== "Não")
          .map(([k, v]) => `${k}: ${v}`);
        if (dispParts.length) obsLines.push(`\nDispositivos: ${dispParts.join(", ")}`);
      }
      if (d.dispInvasivos) {
        const invParts = Object.entries(d.dispInvasivos as Record<string, string>)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`);
        if (invParts.length) obsLines.push(`Dispositivos invasivos: ${invParts.join(", ")}`);
      }

      // Exames
      if (d.labPanel && d.labPanel.length > 0) {
        const labLines = d.labPanel.map((e: any) =>
          `${e.exame} (${e.data}) — ${e.microrganismo} | ${e.sensibilidade}${e.mdr ? " [MDR]" : ""}`
        );
        obsLines.push(`\nExames:\n${labLines.join("\n")}`);
      }

      // Evolução
      if (d.evolucao) {
        const evParts = Object.entries(d.evolucao as Record<string, string>)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`);
        if (evParts.length) obsLines.push(`\nEvolução:\n${evParts.join("\n")}`);
      }

      // Sinais vitais
      if (d.sinaisVitais) {
        const svParts = Object.entries(d.sinaisVitais as Record<string, string>)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`);
        if (svParts.length) obsLines.push(`Sinais vitais: ${svParts.join(", ")}`);
      }

      // Device type detection
      const deviceTypes: string[] = [];
      if (d.dispositivos?.cvc && d.dispositivos.cvc !== "Não") deviceTypes.push("cvc");
      if (d.dispositivos?.cateterVesical === "Sim") deviceTypes.push("svu");
      if (d.dispositivos?.ventilacao === "Sim") deviceTypes.push("vm");

      setForm({
        paciente: d.paciente || "",
        prontuario: d.prontuario || "",
        setor: d.setor || "",
        evento: "",
        classificacao: "Em investigação",
        dispositivos: deviceTypes,
        observacoes: obsLines.join("\n"),
      });
      setEditingCase(null);
      setDialogOpen(true);
      setPrefilledBanner(true);

      // Clear navigation state to avoid re-triggering
      window.history.replaceState({}, document.title);
    }
  }, [navState]);

  const fetchCases = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("infection_cases")
      .select("*, patient:patients(full_name, medical_record, sector)")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setCases(data.map(d => ({ ...d, patient: d.patient as any })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (hospitalId) fetchCases();
  }, [hospitalId]);

  const filtered = cases.filter((c) => {
    if (filterStatus !== "todos" && c.status !== filterStatus) return false;
    const name = c.patient?.full_name || "";
    const record = c.patient?.medical_record || "";
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !record.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const kpis = {
    abertos: cases.filter(c => c.status === "open").length,
    emInvestigacao: cases.filter(c => c.status === "investigating").length,
    confirmados: cases.filter(c => c.status === "confirmed").length,
    encerrados: cases.filter(c => c.status === "closed" || c.status === "discarded").length,
  };

  const openNew = () => {
    setEditingCase(null);
    setForm({ paciente: "", prontuario: "", setor: "", evento: "", classificacao: "", dispositivos: [], observacoes: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: InfectionCase) => {
    setEditingCase(c);
    setForm({
      paciente: c.patient?.full_name || "",
      prontuario: c.patient?.medical_record || "",
      setor: c.patient?.sector || "",
      evento: c.infection_type || "",
      classificacao: c.infection_site || "",
      dispositivos: c.device_type ? [c.device_type] : [],
      observacoes: c.notes || "",
    });
    setDetailCase(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.paciente || !form.setor || !form.evento) {
      toast.error("Preencha paciente, setor e evento.");
      return;
    }
    if (!hospitalId || !userId) return;
    setSaving(true);

    if (editingCase) {
      const { error } = await supabase
        .from("infection_cases")
        .update({
          infection_type: form.evento,
          infection_site: form.classificacao,
          device_related: form.dispositivos.length > 0,
          device_type: form.dispositivos[0] as any || null,
          notes: form.observacoes,
        })
        .eq("id", editingCase.id);

      if (error) {
        toast.error("Erro ao atualizar caso");
      } else {
        toast.success("Caso atualizado!");
        fetchCases();
      }
    } else {
      // First create patient if needed
      const { data: patient, error: patientError } = await supabase
        .from("patients")
        .insert({
          full_name: form.paciente,
          medical_record: form.prontuario || null,
          sector: form.setor,
          hospital_id: hospitalId,
          created_by: userId,
        })
        .select()
        .single();

      if (patientError) {
        toast.error("Erro ao criar paciente: " + patientError.message);
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from("infection_cases")
        .insert({
          hospital_id: hospitalId,
          patient_id: patient.id,
          infection_type: form.evento,
          infection_site: form.classificacao,
          device_related: form.dispositivos.length > 0,
          device_type: form.dispositivos[0] as any || null,
          notes: form.observacoes,
          created_by: userId,
          status: "open" as const,
        });

      if (error) {
        toast.error("Erro ao criar caso: " + error.message);
      } else {
        toast.success("Caso registrado!");
        fetchCases();
      }
    }

    setSaving(false);
    setDialogOpen(false);
  };

  const handleStatusChange = async (caseId: string, newStatus: CaseStatus) => {
    const updates: any = { status: newStatus };
    if (newStatus === "confirmed") updates.confirmation_date = new Date().toISOString().split("T")[0];

    const { error } = await supabase
      .from("infection_cases")
      .update(updates)
      .eq("id", caseId);

    if (error) {
      toast.error("Erro ao atualizar status");
    } else {
      toast.success(`Status: ${statusConfig[newStatus].label}`);
      fetchCases();
      if (detailCase?.id === caseId) {
        setDetailCase(prev => prev ? { ...prev, status: newStatus } : null);
      }
    }
  };

  const handleExportPDF = async () => {
    toast.info("Gerando PDF...");
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: {
          type: "cases",
          hospitalId,
          data: {
            cases: cases.map(c => ({
              id: c.case_number || c.id.slice(0, 8),
              paciente: c.patient?.full_name || "—",
              setor: c.patient?.sector || "—",
              evento: c.infection_type || "—",
              status: statusConfig[c.status]?.label || c.status,
              data: c.detection_date,
            })),
            kpis,
          },
        },
      });
      if (error) throw error;
      if (data?.pdf) {
        const byteArray = Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0));
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `casos-investigacao-${new Date().toISOString().split("T")[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF exportado!");
      }
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  if (ctxLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-foreground">Notificação e Investigação CCIH</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gerenciamento de casos de infecção hospitalar</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button onClick={openNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo Caso</span><span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: AlertTriangle, color: "text-destructive", value: kpis.abertos, label: "Abertos" },
          { icon: Search, color: "text-primary", value: kpis.emInvestigacao, label: "Em Investigação" },
          { icon: CheckCircle, color: "text-success", value: kpis.confirmados, label: "Confirmados" },
          { icon: Clock, color: "text-warning", value: kpis.encerrados, label: "Encerrados" },
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
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="investigating">Em Investigação</SelectItem>
            <SelectItem value="confirmed">Confirmado</SelectItem>
            <SelectItem value="discarded">Descartado</SelectItem>
            <SelectItem value="closed">Encerrado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-2">
          <CardTitle className="text-sm md:text-lg">Casos de Investigação ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum caso encontrado. Clique em "Novo Caso" para começar.</TableCell></TableRow>
                )}
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.case_number || c.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.patient?.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{c.patient?.medical_record || ""}</div>
                    </TableCell>
                    <TableCell>{c.patient?.sector || "—"}</TableCell>
                    <TableCell>{c.infection_type || "—"}</TableCell>
                    <TableCell><Badge variant={statusConfig[c.status]?.variant || "outline"} className="text-xs">{statusConfig[c.status]?.label || c.status}</Badge></TableCell>
                    <TableCell className="text-xs">{c.detection_date}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailCase(c)}><Eye className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-2 p-3">
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhum caso. Clique em "Novo" para começar.</p>}
            {filtered.map((c) => (
              <div key={c.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{c.patient?.full_name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{c.case_number || c.id.slice(0, 8)}</p>
                  </div>
                  <Badge variant={statusConfig[c.status]?.variant || "outline"} className="text-[10px] shrink-0">
                    {statusConfig[c.status]?.label || c.status}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline" className="text-[10px]">{c.patient?.sector || "—"}</Badge>
                  <Badge variant="outline" className="text-[10px]">{c.infection_type || "—"}</Badge>
                  <span className="text-[10px] text-muted-foreground ml-auto">{c.detection_date}</span>
                </div>
                <div className="flex gap-2 pt-1 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => openEdit(c)}>
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
          <DialogHeader><DialogTitle className="text-base">{editingCase ? "Editar Caso" : prefilledBanner ? "Nova Investigação — Dados Pré-preenchidos" : "Novo Caso"}</DialogTitle></DialogHeader>
          {prefilledBanner && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
              <Info className="h-4 w-4 text-primary shrink-0" />
              <p className="text-xs text-primary font-medium">Dados importados do Monitoramento de Pacientes. Revise e complemente.</p>
            </div>
          )}
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
            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={prefilledBanner ? 8 : 3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {editingCase ? "Salvar" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailCase} onOpenChange={(open) => !open && setDetailCase(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-4">
          {detailCase && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">
                  {detailCase.case_number || detailCase.id.slice(0, 8)}
                  <Badge variant={statusConfig[detailCase.status]?.variant || "outline"}>
                    {statusConfig[detailCase.status]?.label || detailCase.status}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Paciente:</span><p className="font-medium">{detailCase.patient?.full_name || "—"}</p></div>
                  <div><span className="text-muted-foreground">Prontuário:</span><p className="font-medium">{detailCase.patient?.medical_record || "—"}</p></div>
                  <div><span className="text-muted-foreground">Setor:</span><p className="font-medium">{detailCase.patient?.sector || "—"}</p></div>
                  <div><span className="text-muted-foreground">Evento:</span><p className="font-medium">{detailCase.infection_type || "—"}</p></div>
                </div>
                {detailCase.notes && (
                  <div>
                    <span className="text-muted-foreground">Observações:</span>
                    <p className="mt-1 bg-muted/50 rounded p-2 text-xs">{detailCase.notes}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Alterar Status</Label>
                  <Select value={detailCase.status} onValueChange={(v) => handleStatusChange(detailCase.id, v as CaseStatus)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="investigating">Em Investigação</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="discarded">Descartado</SelectItem>
                      <SelectItem value="closed">Encerrado</SelectItem>
                    </SelectContent>
                  </Select>
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
