import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Stethoscope, Search, Users, AlertTriangle, ShieldCheck, Activity, Thermometer, Pill, FileText, Plus, Pencil, LogOut, Sparkles, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

type PatientStatus = "active" | "discharged" | "transferred" | "deceased";
type RiskLevel = "crítico" | "alto" | "moderado" | "baixo";

interface PatientRow {
  id: string;
  full_name: string;
  medical_record: string | null;
  sector: string | null;
  bed: string | null;
  admission_date: string;
  status: PatientStatus;
  notes: string | null;
  gender: string | null;
  birth_date: string | null;
}

const statusLabels: Record<PatientStatus, string> = {
  active: "Internado",
  discharged: "Alta",
  transferred: "Transferido",
  deceased: "Óbito",
};

const statusColors: Record<PatientStatus, string> = {
  active: "bg-blue-100 text-blue-800 border-blue-200",
  discharged: "bg-green-100 text-green-800 border-green-200",
  transferred: "bg-yellow-100 text-yellow-800 border-yellow-200",
  deceased: "bg-gray-100 text-gray-800 border-gray-200",
};

const riskConfig: Record<RiskLevel, { label: string; color: string; value: number }> = {
  crítico: { label: "Crítico", color: "bg-destructive text-destructive-foreground", value: 100 },
  alto: { label: "Alto", color: "bg-orange-500 text-white", value: 75 },
  moderado: { label: "Moderado", color: "bg-yellow-500 text-white", value: 50 },
  baixo: { label: "Baixo", color: "bg-emerald-500 text-white", value: 25 },
};

const sectors = ["Todos", "UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica Contêiner", "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto"];
const sectorOptions = sectors.filter(s => s !== "Todos");

const emptyForm = {
  full_name: "", medical_record: "", sector: "", bed: "", admission_date: "",
  status: "active" as PatientStatus, notes: "", gender: "", birth_date: "",
};

function daysFromDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PatientsMonitoring() {
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [selectedPatient, setSelectedPatient] = useState<PatientRow | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<PatientRow | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [devices, setDevices] = useState<Record<string, string[]>>({});
  const [prescriptions, setPrescriptions] = useState<Record<string, string[]>>({});

  const fetchPatients = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false });
    if (!error && data) setPatients(data as PatientRow[]);
    setLoading(false);
  }, [hospitalId]);

  const fetchDevicesAndPrescriptions = useCallback(async () => {
    if (!hospitalId) return;
    const { data: devData } = await supabase
      .from("patient_devices")
      .select("patient_id, device_type, device_name")
      .in("patient_id", patients.map(p => p.id));
    if (devData) {
      const map: Record<string, string[]> = {};
      devData.forEach((d: any) => {
        if (!map[d.patient_id]) map[d.patient_id] = [];
        map[d.patient_id].push(d.device_name || d.device_type);
      });
      setDevices(map);
    }
    const { data: rxData } = await supabase
      .from("antimicrobial_prescriptions")
      .select("patient_id, drug_name")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true);
    if (rxData) {
      const map: Record<string, string[]> = {};
      rxData.forEach((r: any) => {
        if (!map[r.patient_id]) map[r.patient_id] = [];
        map[r.patient_id].push(r.drug_name);
      });
      setPrescriptions(map);
    }
  }, [hospitalId, patients]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  useEffect(() => { if (patients.length > 0) fetchDevicesAndPrescriptions(); }, [patients.length, fetchDevicesAndPrescriptions]);

  const filtered = patients.filter((p) => {
    const matchSearch = !search || (p.full_name?.toLowerCase().includes(search.toLowerCase())) || (p.medical_record?.toLowerCase().includes(search.toLowerCase()));
    const matchSector = sectorFilter === "Todos" || p.sector === sectorFilter;
    const matchStatus = statusFilter === "Todos" || p.status === statusFilter;
    return matchSearch && matchSector && matchStatus;
  });

  const activePatients = patients.filter(p => p.status === "active");
  const withDevices = patients.filter(p => (devices[p.id] || []).length > 0 && p.status === "active");
  const withRx = patients.filter(p => (prescriptions[p.id] || []).length > 0 && p.status === "active");

  const openNewForm = () => {
    setEditingPatient(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (patient: PatientRow) => {
    setEditingPatient(patient);
    setForm({
      full_name: patient.full_name,
      medical_record: patient.medical_record || "",
      sector: patient.sector || "",
      bed: patient.bed || "",
      admission_date: patient.admission_date,
      status: patient.status,
      notes: patient.notes || "",
      gender: patient.gender || "",
      birth_date: patient.birth_date || "",
    });
    setSelectedPatient(null);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.full_name.trim() || !hospitalId) {
      toast.error("Nome é obrigatório.");
      return;
    }
    const payload = {
      full_name: form.full_name,
      medical_record: form.medical_record || null,
      sector: form.sector || null,
      bed: form.bed || null,
      admission_date: form.admission_date || new Date().toISOString().slice(0, 10),
      status: form.status as any,
      notes: form.notes || null,
      gender: form.gender || null,
      birth_date: form.birth_date || null,
      hospital_id: hospitalId,
    };

    if (editingPatient) {
      const { error } = await supabase.from("patients").update(payload).eq("id", editingPatient.id);
      if (error) { toast.error("Erro ao atualizar: " + error.message); return; }
      toast.success("Paciente atualizado!");
    } else {
      const { error } = await supabase.from("patients").insert({ ...payload, created_by: userId });
      if (error) { toast.error("Erro ao cadastrar: " + error.message); return; }
      toast.success("Paciente cadastrado!");
    }
    setFormOpen(false);
    fetchPatients();
  };

  const dischargePatient = async (patient: PatientRow) => {
    const { error } = await supabase
      .from("patients")
      .update({ status: "discharged" as any, discharge_date: new Date().toISOString().slice(0, 10) })
      .eq("id", patient.id);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success(`Paciente ${patient.full_name} recebeu alta!`);
    setSelectedPatient(null);
    fetchPatients();
  };

  if (ctxLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Monitoramento de Pacientes</h1>
            <p className="text-sm text-muted-foreground">Vigilância epidemiológica e acompanhamento</p>
          </div>
        </div>
        <Button onClick={openNewForm} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Cadastrar Paciente</span>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Pacientes Ativos</p><p className="text-2xl font-bold">{activePatients.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">Total Cadastrados</p><p className="text-2xl font-bold">{patients.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10"><ShieldCheck className="h-5 w-5 text-orange-500" /></div>
          <div><p className="text-xs text-muted-foreground">Com Dispositivos</p><p className="text-2xl font-bold">{withDevices.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-yellow-500/10"><Activity className="h-5 w-5 text-yellow-500" /></div>
          <div><p className="text-xs text-muted-foreground">Com Antimicrobianos</p><p className="text-2xl font-bold">{withRx.length}</p></div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card><CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar paciente ou prontuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>{sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos Status</SelectItem>
              {(["active", "discharged", "transferred", "deceased"] as PatientStatus[]).map(s =>
                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Lista de Pacientes ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead className="hidden md:table-cell">Setor / Leito</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Dispositivos</TableHead>
                <TableHead className="hidden lg:table-cell">Dias Int.</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(p => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPatient(p)}>
                  <TableCell>
                    <p className="font-medium text-sm">{p.full_name}</p>
                    <p className="text-xs text-muted-foreground">{p.medical_record || "—"}</p>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p className="text-sm">{p.sector || "—"}</p>
                    <p className="text-xs text-muted-foreground">{p.bed || ""}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[p.status]}>{statusLabels[p.status]}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{(devices[p.id] || []).length || "—"}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className={`text-sm font-medium ${daysFromDate(p.admission_date) > 14 ? "text-destructive" : ""}`}>
                      {daysFromDate(p.admission_date)}d
                    </span>
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); openEditForm(p); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {p.status === "active" && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:text-success hover:bg-success/10" onClick={(e) => { e.stopPropagation(); dischargePatient(p); }}>
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum paciente encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPatient && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  {selectedPatient.full_name}
                </DialogTitle>
                <DialogDescription>Prontuário: {selectedPatient.medical_record || "—"} | Admissão: {selectedPatient.admission_date}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-xs text-muted-foreground">Setor / Leito</p><p className="text-sm font-medium">{selectedPatient.sector || "—"} — {selectedPatient.bed || "—"}</p></div>
                  <div><p className="text-xs text-muted-foreground">Dias de Internação</p><p className="text-sm font-medium">{daysFromDate(selectedPatient.admission_date)} dias</p></div>
                  <div><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className={statusColors[selectedPatient.status]}>{statusLabels[selectedPatient.status]}</Badge></div>
                  <div><p className="text-xs text-muted-foreground">Gênero</p><p className="text-sm">{selectedPatient.gender || "—"}</p></div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Dispositivos</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(devices[selectedPatient.id] || []).length > 0
                      ? (devices[selectedPatient.id] || []).map(d => <Badge key={d} variant="outline" className="border-primary/30">{d}</Badge>)
                      : <span className="text-sm text-muted-foreground">Nenhum</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Antimicrobianos em Uso</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(prescriptions[selectedPatient.id] || []).length > 0
                      ? (prescriptions[selectedPatient.id] || []).map(a => <Badge key={a} variant="secondary">{a}</Badge>)
                      : <span className="text-sm text-muted-foreground">Nenhum</span>}
                  </div>
                </div>
                {selectedPatient.notes && (
                  <div><p className="text-xs text-muted-foreground">Observações</p><p className="text-sm bg-muted/50 p-3 rounded-md">{selectedPatient.notes}</p></div>
                )}
              </div>
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => openEditForm(selectedPatient)}>Editar</Button>
                {selectedPatient.status === "active" && (
                  <Button variant="destructive" onClick={() => dischargePatient(selectedPatient)}>Dar Alta</Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPatient ? "Editar Paciente" : "Cadastrar Paciente"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome Completo *</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Prontuário</Label><Input value={form.medical_record} onChange={e => setForm(f => ({ ...f, medical_record: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Data Admissão</Label><Input type="date" value={form.admission_date} onChange={e => setForm(f => ({ ...f, admission_date: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={form.sector} onValueChange={v => setForm(f => ({ ...f, sector: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{sectorOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Leito</Label><Input value={form.bed} onChange={e => setForm(f => ({ ...f, bed: e.target.value }))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as PatientStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(["active", "discharged", "transferred", "deceased"] as PatientStatus[]).map(s =>
                      <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Gênero</Label>
                <Select value={form.gender} onValueChange={v => setForm(f => ({ ...f, gender: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Masculino</SelectItem>
                    <SelectItem value="F">Feminino</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Data Nascimento</Label><Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingPatient ? "Salvar" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
