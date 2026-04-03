import { useState } from "react";
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
import { Stethoscope, Search, Users, AlertTriangle, ShieldCheck, Clock, Activity, Thermometer, Pill, FileText, Plus, Pencil, LogOut } from "lucide-react";
import { toast } from "sonner";

type PatientStatus = "internado" | "isolamento" | "alta" | "óbito" | "transferido";
type RiskLevel = "crítico" | "alto" | "moderado" | "baixo";

interface Patient {
  id: string;
  name: string;
  record: string;
  sector: string;
  bed: string;
  admissionDate: string;
  status: PatientStatus;
  risk: RiskLevel;
  infection: string | null;
  devices: string[];
  antibiotics: string[];
  daysHospitalized: number;
  temperature: number;
  notes: string;
}

const initialPatients: Patient[] = [
  { id: "1", name: "Maria Silva", record: "PRO-2026-001", sector: "UTI Adulto", bed: "L-01", admissionDate: "2026-03-15", status: "internado", risk: "crítico", infection: "IPCS-CVC", devices: ["CVC", "SVD", "VM"], antibiotics: ["Meropenem", "Vancomicina"], daysHospitalized: 14, temperature: 38.5, notes: "Hemocultura positiva para KPC. Isolamento de contato." },
  { id: "2", name: "João Santos", record: "PRO-2026-002", sector: "UTI Adulto", bed: "L-03", admissionDate: "2026-03-20", status: "internado", risk: "alto", infection: "PAV", devices: ["TOT", "CVC", "SVD"], antibiotics: ["Piperacilina/Tazobactam"], daysHospitalized: 9, temperature: 37.8, notes: "Em desmame ventilatório. Cultura de aspirado traqueal pendente." },
  { id: "3", name: "Ana Oliveira", record: "PRO-2026-003", sector: "UTI Neonatal", bed: "INC-05", admissionDate: "2026-03-22", status: "internado", risk: "alto", infection: "IPCS-CVC", devices: ["PICC", "CPAP"], antibiotics: ["Oxacilina", "Amicacina"], daysHospitalized: 7, temperature: 37.2, notes: "RNPT 32 semanas. PICC em MSE." },
  { id: "4", name: "Carlos Pereira", record: "PRO-2026-004", sector: "Clínica Médica", bed: "CM-12", admissionDate: "2026-03-10", status: "isolamento", risk: "crítico", infection: "ITU-SVD", devices: ["SVD"], antibiotics: ["Ertapenem"], daysHospitalized: 19, temperature: 38.9, notes: "Isolamento de contato por Acinetobacter MDR. Urocultura >100.000 UFC." },
  { id: "5", name: "Fernanda Costa", record: "PRO-2026-005", sector: "Cirúrgica", bed: "CIR-08", admissionDate: "2026-03-25", status: "internado", risk: "moderado", infection: "ISC", devices: [], antibiotics: ["Cefazolina"], daysHospitalized: 4, temperature: 37.0, notes: "Pós-operatório de colecistectomia. Sinais flogísticos na ferida operatória." },
  { id: "6", name: "Roberto Lima", record: "PRO-2026-006", sector: "UTI Adulto", bed: "L-07", admissionDate: "2026-03-18", status: "internado", risk: "crítico", infection: "IPCS-CVC", devices: ["CVC jugular", "SVD", "VM", "PAI"], antibiotics: ["Polimixina B", "Meropenem"], daysHospitalized: 11, temperature: 39.1, notes: "Choque séptico. KPC em hemocultura. Noradrenalina 0.3mcg/kg/min." },
  { id: "7", name: "Lucia Mendes", record: "PRO-2026-007", sector: "Clínica Médica", bed: "CM-04", admissionDate: "2026-03-12", status: "internado", risk: "moderado", infection: null, devices: ["AVP"], antibiotics: [], daysHospitalized: 17, temperature: 36.8, notes: "Sem sinais de infecção. Vigilância por tempo prolongado de internação." },
  { id: "8", name: "Pedro Almeida", record: "PRO-2026-008", sector: "UTI Adulto", bed: "L-10", admissionDate: "2026-03-01", status: "alta", risk: "baixo", infection: "PAV", devices: [], antibiotics: [], daysHospitalized: 28, temperature: 36.5, notes: "Alta da UTI. Tratou PAV por 10 dias com boa evolução." },
  { id: "9", name: "Beatriz Souza", record: "PRO-2026-009", sector: "Emergência", bed: "EM-02", admissionDate: "2026-03-28", status: "internado", risk: "baixo", infection: null, devices: ["AVP"], antibiotics: [], daysHospitalized: 1, temperature: 36.7, notes: "Admissão recente. Sem fatores de risco para IRAS identificados." },
  { id: "10", name: "Marcos Ribeiro", record: "PRO-2026-010", sector: "UTI Adulto", bed: "L-05", admissionDate: "2026-03-08", status: "isolamento", risk: "crítico", infection: "IPCS-CVC", devices: ["CVC subclávia", "SVD", "VM"], antibiotics: ["Daptomicina", "Meropenem", "Anidulafungina"], daysHospitalized: 21, temperature: 38.3, notes: "VRE em hemocultura. Candidemia associada. Isolamento de contato." },
  { id: "11", name: "Sandra Martins", record: "PRO-2026-011", sector: "Cirúrgica", bed: "CIR-15", admissionDate: "2026-03-26", status: "internado", risk: "moderado", infection: null, devices: ["AVP", "Dreno JP"], antibiotics: ["Cefazolina"], daysHospitalized: 3, temperature: 36.9, notes: "Pós-operatório de herniorrafia. Profilaxia antimicrobiana em curso." },
  { id: "12", name: "Ricardo Ferreira", record: "PRO-2026-012", sector: "UTI Neonatal", bed: "INC-02", admissionDate: "2026-03-19", status: "internado", risk: "alto", infection: "Sepse tardia", devices: ["PICC", "VM"], antibiotics: ["Vancomicina", "Meropenem"], daysHospitalized: 10, temperature: 37.6, notes: "RNPT 28 semanas. Sepse tardia confirmada por hemocultura (CONS)." },
];

const statusConfig: Record<PatientStatus, { label: string; color: string }> = {
  internado: { label: "Internado", color: "bg-blue-100 text-blue-800 border-blue-200" },
  isolamento: { label: "Isolamento", color: "bg-red-100 text-red-800 border-red-200" },
  alta: { label: "Alta", color: "bg-green-100 text-green-800 border-green-200" },
  óbito: { label: "Óbito", color: "bg-gray-100 text-gray-800 border-gray-200" },
  transferido: { label: "Transferido", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
};

const riskConfig: Record<RiskLevel, { label: string; color: string; value: number }> = {
  crítico: { label: "Crítico", color: "bg-destructive text-destructive-foreground", value: 100 },
  alto: { label: "Alto", color: "bg-orange-500 text-white", value: 75 },
  moderado: { label: "Moderado", color: "bg-yellow-500 text-white", value: 50 },
  baixo: { label: "Baixo", color: "bg-emerald-500 text-white", value: 25 },
};

const sectors = ["Todos", "UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica Contêiner", "Pediatria", "Pediatria (Enfermaria)"];
const sectorOptions = ["UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica Contêiner", "Pediatria", "Pediatria (Enfermaria)"];
const statuses: PatientStatus[] = ["internado", "isolamento", "alta", "óbito", "transferido"];
const riskLevels: RiskLevel[] = ["crítico", "alto", "moderado", "baixo"];

const emptyForm = {
  name: "", record: "", sector: "UTI Adulto", bed: "", admissionDate: "",
  status: "internado" as PatientStatus, risk: "baixo" as RiskLevel,
  infection: "", devices: "", antibiotics: "", temperature: "36.5", notes: "",
};

export default function PatientsMonitoring() {
  const [patients, setPatients] = useState<Patient[]>(initialPatients);
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [riskFilter, setRiskFilter] = useState("Todos");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState(emptyForm);

  // Evolution state
  const [showEvolucaoForm, setShowEvolucaoForm] = useState(false);
  const [evolucaoText, setEvolucaoText] = useState("");
  const [evolucoes, setEvolucoes] = useState<Record<string, { date: string; text: string }[]>>({});
  const [addDeviceOpen, setAddDeviceOpen] = useState(false);
  const [newDevice, setNewDevice] = useState("");
  const [addAntibioticOpen, setAddAntibioticOpen] = useState(false);
  const [newAntibiotic, setNewAntibiotic] = useState("");

  const filtered = patients.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.record.toLowerCase().includes(search.toLowerCase());
    const matchSector = sectorFilter === "Todos" || p.sector === sectorFilter;
    const matchStatus = statusFilter === "Todos" || p.status === statusFilter;
    const matchRisk = riskFilter === "Todos" || p.risk === riskFilter;
    return matchSearch && matchSector && matchStatus && matchRisk;
  });

  const activePatients = patients.filter((p) => p.status === "internado" || p.status === "isolamento");
  const criticalCount = patients.filter((p) => p.risk === "crítico" && p.status !== "alta").length;
  const isolationCount = patients.filter((p) => p.status === "isolamento").length;
  const withInfection = patients.filter((p) => p.infection && p.status !== "alta").length;

  const dischargePatient = (patient: Patient) => {
    setPatients((prev) =>
      prev.map((p) =>
        p.id === patient.id ? { ...p, status: "alta" as PatientStatus, risk: "baixo" as RiskLevel } : p
      )
    );
    setSelectedPatient(null);
    toast.success(`Paciente ${patient.name} recebeu alta com sucesso!`);
  };

  const openNewForm = () => {
    setEditingPatient(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (patient: Patient) => {
    setEditingPatient(patient);
    setForm({
      name: patient.name,
      record: patient.record,
      sector: patient.sector,
      bed: patient.bed,
      admissionDate: patient.admissionDate,
      status: patient.status,
      risk: patient.risk,
      infection: patient.infection || "",
      devices: patient.devices.join(", "),
      antibiotics: patient.antibiotics.join(", "),
      temperature: String(patient.temperature),
      notes: patient.notes,
    });
    setSelectedPatient(null);
    setFormOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.record.trim()) {
      toast.error("Nome e prontuário são obrigatórios.");
      return;
    }

    const devicesArr = form.devices ? form.devices.split(",").map((d) => d.trim()).filter(Boolean) : [];
    const antibioticsArr = form.antibiotics ? form.antibiotics.split(",").map((a) => a.trim()).filter(Boolean) : [];
    const temp = parseFloat(form.temperature) || 36.5;

    if (editingPatient) {
      setPatients((prev) =>
        prev.map((p) =>
          p.id === editingPatient.id
            ? { ...p, name: form.name, record: form.record, sector: form.sector, bed: form.bed, admissionDate: form.admissionDate, status: form.status, risk: form.risk, infection: form.infection || null, devices: devicesArr, antibiotics: antibioticsArr, temperature: temp, notes: form.notes }
            : p
        )
      );
      toast.success("Paciente atualizado com sucesso!");
    } else {
      const newPatient: Patient = {
        id: String(Date.now()),
        name: form.name,
        record: form.record,
        sector: form.sector,
        bed: form.bed,
        admissionDate: form.admissionDate || new Date().toISOString().slice(0, 10),
        status: form.status,
        risk: form.risk,
        infection: form.infection || null,
        devices: devicesArr,
        antibiotics: antibioticsArr,
        daysHospitalized: 0,
        temperature: temp,
        notes: form.notes,
      };
      setPatients((prev) => [newPatient, ...prev]);
      toast.success("Paciente cadastrado com sucesso!");
    }
    setFormOpen(false);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Monitoramento de Pacientes</h1>
            <p className="text-sm text-muted-foreground">Vigilância epidemiológica e acompanhamento de pacientes</p>
          </div>
        </div>
        <Button onClick={openNewForm} className="gap-2">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Cadastrar Paciente</span>
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Pacientes Ativos</p>
              <p className="text-2xl font-bold">{activePatients.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Risco Crítico</p>
              <p className="text-2xl font-bold">{criticalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-500/10"><ShieldCheck className="h-5 w-5 text-orange-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Em Isolamento</p>
              <p className="text-2xl font-bold">{isolationCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10"><Activity className="h-5 w-5 text-yellow-500" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Com Infecção Ativa</p>
              <p className="text-2xl font-bold">{withInfection}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar paciente ou prontuário..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos Status</SelectItem>
                {statuses.map((s) => <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-full md:w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Todos">Todos Riscos</SelectItem>
                {riskLevels.map((r) => <SelectItem key={r} value={r}>{riskConfig[r].label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Patient Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lista de Pacientes ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead className="hidden md:table-cell">Setor / Leito</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Risco</TableHead>
                <TableHead className="hidden md:table-cell">Infecção</TableHead>
                <TableHead className="hidden lg:table-cell">Dias Int.</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedPatient(p)}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.record}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <p className="text-sm">{p.sector}</p>
                    <p className="text-xs text-muted-foreground">{p.bed}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusConfig[p.status].color}>{statusConfig[p.status].label}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={riskConfig[p.risk].color}>{riskConfig[p.risk].label}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm">{p.infection || "—"}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className={`text-sm font-medium ${p.daysHospitalized > 14 ? "text-destructive" : ""}`}>{p.daysHospitalized}d</span>
                  </TableCell>
                  <TableCell className="text-right flex items-center justify-end gap-1">
                    {(p.status === "internado" || p.status === "isolamento") && (
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-success hover:text-success hover:bg-success/10" title="Dar Alta" onClick={(e) => { e.stopPropagation(); dischargePatient(p); }}>
                        <LogOut className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); setSelectedPatient(p); }}>Detalhes</Button>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum paciente encontrado</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Patient Detail Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={(open) => !open && setSelectedPatient(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedPatient && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  {selectedPatient.name}
                </DialogTitle>
                <DialogDescription>Prontuário: {selectedPatient.record} | Admissão: {selectedPatient.admissionDate}</DialogDescription>
              </DialogHeader>

              <div className="flex justify-end -mt-2">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => openEditForm(selectedPatient)}>
                  <Pencil className="h-3.5 w-3.5" />
                  Editar Paciente
                </Button>
              </div>

              <Tabs defaultValue="geral" className="mt-2">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="geral">Geral</TabsTrigger>
                  <TabsTrigger value="dispositivos">Dispositivos</TabsTrigger>
                  <TabsTrigger value="evolucao">Evolução</TabsTrigger>
                </TabsList>

                <TabsContent value="geral" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Setor / Leito</p>
                      <p className="text-sm font-medium">{selectedPatient.sector} — {selectedPatient.bed}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Dias de Internação</p>
                      <p className="text-sm font-medium">{selectedPatient.daysHospitalized} dias</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant="outline" className={statusConfig[selectedPatient.status].color}>{statusConfig[selectedPatient.status].label}</Badge>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Nível de Risco</p>
                      <div className="flex items-center gap-2">
                        <Badge className={riskConfig[selectedPatient.risk].color}>{riskConfig[selectedPatient.risk].label}</Badge>
                        <Progress value={riskConfig[selectedPatient.risk].value} className="flex-1 h-2" />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Thermometer className="h-3 w-3" /> Temperatura</p>
                    <p className={`text-sm font-medium ${selectedPatient.temperature >= 38 ? "text-destructive" : ""}`}>{selectedPatient.temperature}°C</p>
                  </div>

                  {selectedPatient.infection && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Infecção Ativa</p>
                      <Badge variant="destructive">{selectedPatient.infection}</Badge>
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><FileText className="h-3 w-3" /> Observações Clínicas</p>
                    <p className="text-sm bg-muted/50 p-3 rounded-md">{selectedPatient.notes}</p>
                  </div>
                </TabsContent>

                <TabsContent value="dispositivos" className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">Dispositivos Invasivos</p>
                      {!addDeviceOpen ? (
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setAddDeviceOpen(true)}>
                          <Plus className="h-3 w-3" /> Adicionar
                        </Button>
                      ) : null}
                    </div>
                    {addDeviceOpen && (
                      <div className="flex gap-2 items-end rounded-lg border p-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Dispositivo</Label>
                          <Input placeholder="Ex: CVC subclávia, SVD, PICC..." value={newDevice} onChange={(e) => setNewDevice(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <Button size="sm" className="h-8" onClick={() => {
                          if (!newDevice.trim() || !selectedPatient) return;
                          setPatients(prev => prev.map(p => p.id === selectedPatient.id ? { ...p, devices: [...p.devices, newDevice.trim()] } : p));
                          setSelectedPatient(prev => prev ? { ...prev, devices: [...prev.devices, newDevice.trim()] } : prev);
                          setNewDevice("");
                          setAddDeviceOpen(false);
                          toast.success("Dispositivo adicionado!");
                        }}>Salvar</Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddDeviceOpen(false); setNewDevice(""); }}>Cancelar</Button>
                      </div>
                    )}
                    {selectedPatient.devices.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedPatient.devices.map((d) => <Badge key={d} variant="outline" className="border-primary/30 text-primary">{d}</Badge>)}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum dispositivo invasivo</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Pill className="h-3 w-3" /> Antimicrobianos em Uso</p>
                      {!addAntibioticOpen ? (
                        <Button size="sm" variant="outline" className="gap-1 h-7 text-xs" onClick={() => setAddAntibioticOpen(true)}>
                          <Plus className="h-3 w-3" /> Adicionar
                        </Button>
                      ) : null}
                    </div>
                    {addAntibioticOpen && (
                      <div className="flex gap-2 items-end rounded-lg border p-3">
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Antimicrobiano</Label>
                          <Input placeholder="Ex: Meropenem, Vancomicina..." value={newAntibiotic} onChange={(e) => setNewAntibiotic(e.target.value)} className="h-8 text-sm" />
                        </div>
                        <Button size="sm" className="h-8" onClick={() => {
                          if (!newAntibiotic.trim() || !selectedPatient) return;
                          setPatients(prev => prev.map(p => p.id === selectedPatient.id ? { ...p, antibiotics: [...p.antibiotics, newAntibiotic.trim()] } : p));
                          setSelectedPatient(prev => prev ? { ...prev, antibiotics: [...prev.antibiotics, newAntibiotic.trim()] } : prev);
                          setNewAntibiotic("");
                          setAddAntibioticOpen(false);
                          toast.success("Antimicrobiano adicionado!");
                        }}>Salvar</Button>
                        <Button size="sm" variant="ghost" className="h-8" onClick={() => { setAddAntibioticOpen(false); setNewAntibiotic(""); }}>Cancelar</Button>
                      </div>
                    )}
                    {selectedPatient.antibiotics.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedPatient.antibiotics.map((a) => <Badge key={a} variant="secondary">{a}</Badge>)}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Sem antimicrobianos</p>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="evolucao" className="space-y-4 mt-4">
                  {!showEvolucaoForm ? (
                    <Button size="sm" className="gap-2" onClick={() => setShowEvolucaoForm(true)}>
                      <Plus className="h-4 w-4" /> Nova Evolução
                    </Button>
                  ) : (
                    <div className="space-y-3 rounded-lg border p-3">
                      <Label>Registrar Evolução</Label>
                      <Textarea
                        value={evolucaoText}
                        onChange={(e) => setEvolucaoText(e.target.value)}
                        placeholder="Descreva a evolução do paciente..."
                        rows={4}
                      />
                      <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" onClick={() => { setShowEvolucaoForm(false); setEvolucaoText(""); }}>Cancelar</Button>
                        <Button size="sm" onClick={() => {
                          if (!evolucaoText.trim() || !selectedPatient) return;
                          const now = new Date();
                          const dateStr = `${now.toLocaleDateString("pt-BR")} — ${now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
                          setEvolucoes((prev) => ({
                            ...prev,
                            [selectedPatient.id]: [
                              { date: dateStr, text: evolucaoText.trim() },
                              ...(prev[selectedPatient.id] || []),
                            ],
                          }));
                          setEvolucaoText("");
                          setShowEvolucaoForm(false);
                          toast.success("Evolução registrada com sucesso!");
                        }}>Salvar Evolução</Button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(evolucoes[selectedPatient.id] || []).map((ev, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                        <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">{ev.date}</p>
                          <p className="text-sm">{ev.text}</p>
                        </div>
                      </div>
                    ))}
                    {/* Mock entries */}
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">29/03/2026 — 08:00</p>
                        <p className="text-sm">Paciente estável. Mantido esquema antimicrobiano. Sem novos sinais de infecção.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">28/03/2026 — 14:30</p>
                        <p className="text-sm">Resultado de cultura liberado. Ajuste de antimicrobiano conforme antibiograma.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                      <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <p className="text-xs text-muted-foreground">27/03/2026 — 10:00</p>
                        <p className="text-sm">Coleta de hemoculturas (2 pares). Pico febril 38.8°C.</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit Patient Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingPatient ? <Pencil className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
              {editingPatient ? "Editar Paciente" : "Cadastrar Paciente"}
            </DialogTitle>
            <DialogDescription>
              {editingPatient ? "Altere os dados do paciente abaixo." : "Preencha os dados para cadastrar um novo paciente."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pat-name">Nome *</Label>
                <Input id="pat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pat-record">Prontuário *</Label>
                <Input id="pat-record" value={form.record} onChange={(e) => setForm({ ...form, record: e.target.value })} placeholder="PRO-2026-XXX" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{sectorOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="pat-bed">Leito</Label>
                <Input id="pat-bed" value={form.bed} onChange={(e) => setForm({ ...form, bed: e.target.value })} placeholder="L-01" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as PatientStatus })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((s) => <SelectItem key={s} value={s}>{statusConfig[s].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Risco</Label>
                <Select value={form.risk} onValueChange={(v) => setForm({ ...form, risk: v as RiskLevel })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{riskLevels.map((r) => <SelectItem key={r} value={r}>{riskConfig[r].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pat-date">Data de Admissão</Label>
                <Input id="pat-date" type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pat-temp">Temperatura (°C)</Label>
                <Input id="pat-temp" type="number" step="0.1" value={form.temperature} onChange={(e) => setForm({ ...form, temperature: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pat-infection">Infecção</Label>
              <Input id="pat-infection" value={form.infection} onChange={(e) => setForm({ ...form, infection: e.target.value })} placeholder="Ex: IPCS-CVC, PAV, ITU-SVD" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pat-devices">Dispositivos (separados por vírgula)</Label>
              <Input id="pat-devices" value={form.devices} onChange={(e) => setForm({ ...form, devices: e.target.value })} placeholder="CVC, SVD, VM" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pat-antibiotics">Antimicrobianos (separados por vírgula)</Label>
              <Input id="pat-antibiotics" value={form.antibiotics} onChange={(e) => setForm({ ...form, antibiotics: e.target.value })} placeholder="Meropenem, Vancomicina" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pat-notes">Observações</Label>
              <Textarea id="pat-notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Observações clínicas..." rows={3} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingPatient ? "Salvar Alterações" : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
