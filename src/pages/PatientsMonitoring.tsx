import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Stethoscope, Search, Users, AlertTriangle, ShieldCheck, Clock, Activity, Thermometer, Pill, FileText } from "lucide-react";

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

const mockPatients: Patient[] = [
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

const sectors = ["Todos", "UTI Adulto", "UTI Neonatal", "Clínica Médica", "Cirúrgica", "Emergência"];
const statuses: PatientStatus[] = ["internado", "isolamento", "alta", "óbito", "transferido"];

export default function PatientsMonitoring() {
  const [search, setSearch] = useState("");
  const [sectorFilter, setSectorFilter] = useState("Todos");
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [riskFilter, setRiskFilter] = useState("Todos");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const filtered = mockPatients.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.record.toLowerCase().includes(search.toLowerCase());
    const matchSector = sectorFilter === "Todos" || p.sector === sectorFilter;
    const matchStatus = statusFilter === "Todos" || p.status === statusFilter;
    const matchRisk = riskFilter === "Todos" || p.risk === riskFilter;
    return matchSearch && matchSector && matchStatus && matchRisk;
  });

  const activePatients = mockPatients.filter((p) => p.status === "internado" || p.status === "isolamento");
  const criticalCount = mockPatients.filter((p) => p.risk === "crítico" && p.status !== "alta").length;
  const isolationCount = mockPatients.filter((p) => p.status === "isolamento").length;
  const withInfection = mockPatients.filter((p) => p.infection && p.status !== "alta").length;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Stethoscope className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Monitoramento de Pacientes</h1>
          <p className="text-sm text-muted-foreground">Vigilância epidemiológica e acompanhamento de pacientes</p>
        </div>
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
                {(["crítico", "alto", "moderado", "baixo"] as RiskLevel[]).map((r) => <SelectItem key={r} value={r}>{riskConfig[r].label}</SelectItem>)}
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
                  <TableCell className="text-right">
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
                    <p className="text-xs text-muted-foreground">Dispositivos Invasivos</p>
                    {selectedPatient.devices.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {selectedPatient.devices.map((d) => <Badge key={d} variant="outline" className="border-primary/30 text-primary">{d}</Badge>)}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhum dispositivo invasivo</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Pill className="h-3 w-3" /> Antimicrobianos em Uso</p>
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
                  <div className="space-y-3">
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
    </div>
  );
}
