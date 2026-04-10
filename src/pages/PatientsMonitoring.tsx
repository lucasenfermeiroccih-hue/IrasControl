import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import {
  Stethoscope, Search, Users, AlertTriangle, Activity, Thermometer,
  Plus, Pencil, LogOut, Clock, Save, Eye, FileText, ShieldAlert, Syringe, ClipboardList
} from "lucide-react";
import { toast } from "sonner";

// ─── Mock Data ────────────────────────────────────────────────
const mockPatients = [
  {
    id: "mock-1",
    nome: "Maria Silva Santos",
    unidade: "UTI 1 Adulto",
    leito: "201-A",
    prontuario: "PRO-2025-0042",
    dataInternacaoHospitalar: "2026-03-15",
    origem: "Pronto Socorro",
    dataInternacaoCTI: "2026-03-17",
    dataAlta: "",
    doencasBase: "HAS, DM tipo 2, IRC",
    motivoInternacao: "Sepse de foco pulmonar",
    dataNascimento: "1958-07-22",
    sexo: "F",
    dataAdmissao: "2026-03-15",
    especialidade: "Clínica médica",
    diagnostico: "Pneumonia associada à ventilação mecânica",
    status: "active" as const,
  },
  {
    id: "mock-2",
    nome: "João Pedro Almeida",
    unidade: "UTI 2 Adulto",
    leito: "305-B",
    prontuario: "PRO-2025-0098",
    dataInternacaoHospitalar: "2026-04-01",
    origem: "Enfermaria Cirúrgica",
    dataInternacaoCTI: "2026-04-03",
    dataAlta: "",
    doencasBase: "Obesidade grau III, DPOC",
    motivoInternacao: "Pós-operatório cirurgia bariátrica complicada",
    dataNascimento: "1975-11-30",
    sexo: "M",
    dataAdmissao: "2026-04-01",
    especialidade: "Cirurgia Geral",
    diagnostico: "Infecção de sítio cirúrgico profunda",
    status: "active" as const,
  },
  {
    id: "mock-3",
    nome: "Ana Beatriz Ferreira",
    unidade: "Clínica Médica",
    leito: "112-C",
    prontuario: "PRO-2025-0156",
    dataInternacaoHospitalar: "2026-03-28",
    origem: "Ambulatório",
    dataInternacaoCTI: "",
    dataAlta: "2026-04-08",
    doencasBase: "LES, Nefrite lúpica",
    motivoInternacao: "ITU complicada",
    dataNascimento: "1990-02-14",
    sexo: "F",
    dataAdmissao: "2026-03-28",
    especialidade: "Clínica médica",
    diagnostico: "Infecção do trato urinário associada a cateter",
    status: "discharged" as const,
  },
];

type PatientStatus = "active" | "discharged" | "transferred" | "deceased";

interface MockPatient {
  id: string;
  nome: string;
  unidade: string;
  leito: string;
  prontuario: string;
  dataInternacaoHospitalar: string;
  origem: string;
  dataInternacaoCTI: string;
  dataAlta: string;
  doencasBase: string;
  motivoInternacao: string;
  dataNascimento: string;
  sexo: string;
  dataAdmissao: string;
  especialidade: string;
  diagnostico: string;
  status: PatientStatus;
}

const especialidades = [
  "Clínica médica", "Cirurgia Geral", "Cirurgia Vascular", "Cirurgia Cardíaca",
  "Cirurgia Oftalmológica", "Neurocirurgia", "Cirurgia Ortopédica",
];

const tiposAlta = ["Óbito", "Alta", "Transferência"];

const criteriosDiagnosticos = [
  "Febre > 38°C por mais de 24h",
  "Leucocitose > 12.000/mm³",
  "Hemocultura positiva",
  "Urocultura positiva (≥ 100.000 UFC/mL)",
  "Cultura de secreção traqueal positiva",
  "Sinais flogísticos em sítio cirúrgico",
  "Secreção purulenta",
  "Infiltrado pulmonar novo ou progressivo",
  "Piora do padrão ventilatório",
  "Instabilidade hemodinâmica sem outra causa",
  "Uso de antimicrobiano terapêutico ≥ 72h",
  "PCR ou Procalcitonina elevada",
];

const mockLabPanel = [
  { exame: "Hemocultura", data: "05/04/2026", microrganismo: "Staphylococcus aureus", sensibilidade: "MRSA", mdr: true },
  { exame: "Urocultura", data: "03/04/2026", microrganismo: "Klebsiella pneumoniae", sensibilidade: "KPC+", mdr: true },
  { exame: "Cultura sec. traqueal", data: "06/04/2026", microrganismo: "Pseudomonas aeruginosa", sensibilidade: "Sensível a Meropenem", mdr: false },
  { exame: "Cultura ferida op.", data: "04/04/2026", microrganismo: "Escherichia coli", sensibilidade: "ESBL", mdr: true },
];

const mockFatoresRisco = [
  "Idade > 65 anos",
  "Diabetes mellitus",
  "Imunossupressão",
  "Tempo de internação > 7 dias",
  "Uso prévio de antibióticos",
  "Ventilação mecânica prolongada",
  "Cateter venoso central > 5 dias",
];

function daysFromDate(dateStr: string) {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

function calcAge(birth: string) {
  if (!birth) return "—";
  const diff = Date.now() - new Date(birth).getTime();
  return Math.floor(diff / (365.25 * 86400000)) + " anos";
}

// ─── Component ────────────────────────────────────────────────
export default function PatientsMonitoring() {
  const [patients, setPatients] = useState<MockPatient[]>(mockPatients as MockPatient[]);
  const [selectedId, setSelectedId] = useState<string>(mockPatients[0].id);
  const [search, setSearch] = useState("");
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeType, setDischargeType] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "view">("edit");

  // Form state for new patient modal
  const [newForm, setNewForm] = useState({ nome: "", prontuario: "", unidade: "", leito: "", sexo: "", dataNascimento: "" });

  const selected = patients.find(p => p.id === selectedId) || patients[0];
  const diasInternacao = daysFromDate(selected.dataInternacaoHospitalar);

  // Section states (all mock/local)
  const [exames, setExames] = useState({ hemocultura: "Não", urocultura: "Não", culturaTraqueal: "Não", culturaFerida: "Não", hemoculturaObs: "", uroculturaObs: "", culturaTraquealObs: "", culturaFeridaObs: "" });
  const [dispositivos, setDispositivos] = useState({ cvc: "", cateterArterial: "Não", cateterHemodialise: "", ventilacao: "Não", cateterVesical: "Não", sonda: "Não", drenos: "Não", feridaOp: "Não" });
  const [evolucao, setEvolucao] = useState({ evolucaoInternacao: "", colonizacoes: "", antibioticoPrevio: "", culturasPreviaCTI: "", resultadoCulturasCTI: "", antibioticosCTI: "", dispositivosInvasivos: "", examesImagem: "", condutasDiarias: "" });
  const [sinaisVitais, setSinaisVitais] = useState({ temperatura: "", leucocitos: "", pressaoArterial: "", fio2Peep: "", hematuria: "" });
  const [iras, setIras] = useState({ temIras: "", numeroIras: "", quaisIras: "", dataFechamento: "" });
  const [conclusao, setConclusao] = useState({ classificacao: "", conclusaoEpidemiologica: "", condutas: "", desfecho: "", vinculoSurto: "" });
  const [criteriosSelecionados, setCriteriosSelecionados] = useState<string[]>([]);
  const [justificativa, setJustificativa] = useState("");
  const [ocorrencia, setOcorrencia] = useState({ unidadeSetor: "", leito: "", dataSintomas: "", dataSuspeita: "", dataNotificacao: "", origemNotificacao: "" });
  const [dispInvasivos, setDispInvasivos] = useState({ cvcInsercao: "", cvcRetirada: "", svuInsercao: "", svuRetirada: "", vmInsercao: "", vmRetirada: "" });
  const [responsavel, setResponsavel] = useState("");

  const tempFloat = parseFloat(sinaisVitais.temperatura);
  const tempAlta = !isNaN(tempFloat) && tempFloat > 38;

  const filtered = patients.filter(p =>
    !search || p.nome.toLowerCase().includes(search.toLowerCase()) || p.prontuario.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = patients.filter(p => p.status === "active").length;

  const handleNewPatient = () => {
    if (!newForm.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    const id = "mock-" + Date.now();
    setPatients(prev => [{
      id, nome: newForm.nome, unidade: newForm.unidade || "UTI 1 Adulto", leito: newForm.leito || "—",
      prontuario: newForm.prontuario || `PRO-${Date.now().toString().slice(-6)}`,
      dataInternacaoHospitalar: new Date().toISOString().slice(0, 10),
      origem: "", dataInternacaoCTI: "", dataAlta: "", doencasBase: "", motivoInternacao: "",
      dataNascimento: newForm.dataNascimento, sexo: newForm.sexo, dataAdmissao: new Date().toISOString().slice(0, 10),
      especialidade: "", diagnostico: "", status: "active" as const,
    }, ...prev]);
    setNewPatientOpen(false);
    setNewForm({ nome: "", prontuario: "", unidade: "", leito: "", sexo: "", dataNascimento: "" });
    toast.success("Paciente cadastrado com ID: " + id);
  };

  const handleDischarge = () => {
    if (!dischargeType) { toast.error("Selecione o tipo de alta"); return; }
    const statusMap: Record<string, MockPatient["status"]> = { "Óbito": "discharged", "Alta": "discharged", "Transferência": "discharged" };
    setPatients(prev => prev.map(p => p.id === selectedId ? { ...p, status: statusMap[dischargeType] || "discharged", dataAlta: new Date().toISOString().slice(0, 10) } : p));
    setDischargeOpen(false);
    toast.success(`Paciente ${selected.nome} — ${dischargeType} registrada`);
  };

  const cvcDays = dispInvasivos.cvcInsercao ? daysFromDate(dispInvasivos.cvcInsercao) : null;
  const svuDays = dispInvasivos.svuInsercao ? daysFromDate(dispInvasivos.svuInsercao) : null;
  const vmDays = dispInvasivos.vmInsercao ? daysFromDate(dispInvasivos.vmInsercao) : null;

  const readOnly = viewMode === "view";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Monitoramento de Pacientes</h1>
            <p className="text-sm text-muted-foreground">Investigação de infecções — Controle diário</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant={viewMode === "edit" ? "default" : "outline"} size="sm" onClick={() => setViewMode("edit")}><Pencil className="h-4 w-4 mr-1" />Editar</Button>
          <Button variant={viewMode === "view" ? "default" : "outline"} size="sm" onClick={() => setViewMode("view")}><Eye className="h-4 w-4 mr-1" />Visualizar</Button>
          <Button size="sm" onClick={() => setNewPatientOpen(true)}><Plus className="h-4 w-4 mr-1" />Cadastrar Novo Paciente</Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Ativos</p><p className="text-2xl font-bold">{activeCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-destructive/10"><AlertTriangle className="h-5 w-5 text-destructive" /></div>
          <div><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{patients.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent"><Clock className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">Dias Int. (atual)</p><p className="text-2xl font-bold">{diasInternacao}d</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent"><Activity className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">MDR Detectados</p><p className="text-2xl font-bold text-destructive">{mockLabPanel.filter(l => l.mdr).length}</p></div>
        </CardContent></Card>
      </div>

      {/* Patient selector */}
      <Card><CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar paciente ou prontuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="w-full md:w-[300px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {filtered.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} — {p.prontuario}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      {/* ─── TABBED SECTIONS ──────────────────────────────── */}
      <Tabs defaultValue="identificacao" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="identificacao" className="text-xs">Identificação</TabsTrigger>
          <TabsTrigger value="exames" className="text-xs">Exames</TabsTrigger>
          <TabsTrigger value="dispositivos" className="text-xs">Dispositivos</TabsTrigger>
          <TabsTrigger value="evolucao" className="text-xs">Evolução</TabsTrigger>
          <TabsTrigger value="sinais" className="text-xs">Sinais Vitais</TabsTrigger>
          <TabsTrigger value="iras" className="text-xs">IRAS</TabsTrigger>
          <TabsTrigger value="conclusao" className="text-xs">Conclusão</TabsTrigger>
          <TabsTrigger value="criterios" className="text-xs">Critérios Diag.</TabsTrigger>
          <TabsTrigger value="laboratorial" className="text-xs">Lab</TabsTrigger>
          <TabsTrigger value="ocorrencia" className="text-xs">Ocorrência</TabsTrigger>
          <TabsTrigger value="fatores" className="text-xs">Fatores Risco</TabsTrigger>
          <TabsTrigger value="responsavel" className="text-xs">Responsável</TabsTrigger>
        </TabsList>

        {/* 1) Identificação */}
        <TabsContent value="identificacao">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Identificação do Paciente</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <Field label="Nome" value={selected.nome} />
              <Field label="Unidade" value={selected.unidade} />
              <Field label="Leito" value={selected.leito} />
              <Field label="Prontuário" value={selected.prontuario} />
              <Field label="Data Int. Hospitalar" value={selected.dataInternacaoHospitalar} />
              <Field label="Origem" value={selected.origem} />
              <Field label="Data Int. CTI" value={selected.dataInternacaoCTI || "—"} />
              <Field label="Data da Alta" value={selected.dataAlta || "—"} />
              <Field label="Doenças de base" value={selected.doencasBase} className="md:col-span-2" />
              <Field label="Motivo da internação" value={selected.motivoInternacao} className="md:col-span-2" />
              <Field label="Data Nascimento / Idade" value={`${selected.dataNascimento} (${calcAge(selected.dataNascimento)})`} />
              <Field label="Sexo" value={selected.sexo === "M" ? "Masculino" : selected.sexo === "F" ? "Feminino" : "—"} />
              <Field label="Data de admissão" value={selected.dataAdmissao} />
              <Field label="Especialidade Clínica" value={selected.especialidade} />
              <Field label="Diagnóstico" value={selected.diagnostico} className="md:col-span-2" />
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Dias de Internação</p>
                  <p className={`text-xl font-bold ${diasInternacao > 14 ? "text-destructive" : "text-foreground"}`}>{diasInternacao} dias</p>
                </div>
              </div>
              <div>
                <Badge variant={selected.status === "active" ? "default" : "secondary"} className="text-sm">
                  {selected.status === "active" ? "Internado" : selected.status === "discharged" ? "Alta" : selected.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2) Exames */}
        <TabsContent value="exames">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Syringe className="h-4 w-4 text-primary" />Exames</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {([
                ["hemocultura", "Hemocultura", "hemoculturaObs"],
                ["urocultura", "Urocultura", "uroculturaObs"],
                ["culturaTraqueal", "Cultura de secreção traqueal", "culturaTraquealObs"],
                ["culturaFerida", "Cultura de ferida operatória", "culturaFeridaObs"],
              ] as const).map(([key, label, obsKey]) => (
                <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                  <div className="space-y-1">
                    <Label>{label}</Label>
                    <Select disabled={readOnly} value={(exames as any)[key]} onValueChange={v => setExames(prev => ({ ...prev, [key]: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <Label>Observação</Label>
                    <Input disabled={readOnly} value={(exames as any)[obsKey]} onChange={e => setExames(prev => ({ ...prev, [obsKey]: e.target.value }))} placeholder="Detalhes..." />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3) Dispositivos */}
        <TabsContent value="dispositivos">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" />Dispositivos — Controle Diário</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DeviceSelect label="Cateter Venoso Central" disabled={readOnly} value={dispositivos.cvc} onChange={v => setDispositivos(p => ({ ...p, cvc: v }))} options={["Jugular", "Subclávia", "Femoral"]} />
              <DeviceSelect label="Cateter Arterial Periférico" disabled={readOnly} value={dispositivos.cateterArterial} onChange={v => setDispositivos(p => ({ ...p, cateterArterial: v }))} options={["Sim", "Não"]} />
              <DeviceSelect label="Cateter de Hemodiálise" disabled={readOnly} value={dispositivos.cateterHemodialise} onChange={v => setDispositivos(p => ({ ...p, cateterHemodialise: v }))} options={["Jugular", "Subclávia", "Femoral"]} />
              <DeviceSelect label="Ventilação Mecânica" disabled={readOnly} value={dispositivos.ventilacao} onChange={v => setDispositivos(p => ({ ...p, ventilacao: v }))} options={["Sim", "Não"]} />
              <DeviceSelect label="Cateter Vesical de Demora" disabled={readOnly} value={dispositivos.cateterVesical} onChange={v => setDispositivos(p => ({ ...p, cateterVesical: v }))} options={["Sim", "Não"]} />
              <DeviceSelect label="Sonda Nasogástrica/Nasoenteral" disabled={readOnly} value={dispositivos.sonda} onChange={v => setDispositivos(p => ({ ...p, sonda: v }))} options={["Sim", "Não"]} />
              <DeviceSelect label="Drenos" disabled={readOnly} value={dispositivos.drenos} onChange={v => setDispositivos(p => ({ ...p, drenos: v }))} options={["Sim", "Não"]} />
              <DeviceSelect label="Ferida Operatória" disabled={readOnly} value={dispositivos.feridaOp} onChange={v => setDispositivos(p => ({ ...p, feridaOp: v }))} options={["Sim", "Não"]} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4) Evolução */}
        <TabsContent value="evolucao">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />Evolução — Controle Diário</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {([
                ["evolucaoInternacao", "Evolução durante internação"],
                ["colonizacoes", "Colonizações"],
                ["antibioticoPrevio", "Antibióticos usados previamente"],
                ["culturasPreviaCTI", "Culturas prévias ao CTI"],
                ["resultadoCulturasCTI", "Resultado de culturas no CTI"],
                ["antibioticosCTI", "Antibióticos no CTI"],
                ["dispositivosInvasivos", "Dispositivos invasivos"],
                ["examesImagem", "Exames de imagem"],
                ["condutasDiarias", "Condutas diárias"],
              ] as const).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label>{label}</Label>
                  <Textarea disabled={readOnly} value={(evolucao as any)[key]} onChange={e => setEvolucao(prev => ({ ...prev, [key]: e.target.value }))} rows={3} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5) Sinais Vitais */}
        <TabsContent value="sinais">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Thermometer className="h-4 w-4 text-primary" />Preenchimento Diário</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="flex items-center gap-2">
                  Temperatura (°C)
                  {tempAlta && <Badge variant="destructive" className="text-xs animate-pulse">⚠ ALERTA: Febre</Badge>}
                </Label>
                <Input
                  disabled={readOnly}
                  type="number"
                  step="0.1"
                  value={sinaisVitais.temperatura}
                  onChange={e => setSinaisVitais(p => ({ ...p, temperatura: e.target.value }))}
                  className={tempAlta ? "border-destructive text-destructive font-bold bg-destructive/5" : ""}
                  placeholder="36.5"
                />
              </div>
              <div className="space-y-1"><Label>Leucócitos</Label><Input disabled={readOnly} value={sinaisVitais.leucocitos} onChange={e => setSinaisVitais(p => ({ ...p, leucocitos: e.target.value }))} placeholder="ex: 12.500" /></div>
              <div className="space-y-1"><Label>Pressão Arterial</Label><Input disabled={readOnly} value={sinaisVitais.pressaoArterial} onChange={e => setSinaisVitais(p => ({ ...p, pressaoArterial: e.target.value }))} placeholder="ex: 120/80" /></div>
              <div className="space-y-1"><Label>FIO2 / PEEP</Label><Input disabled={readOnly} value={sinaisVitais.fio2Peep} onChange={e => setSinaisVitais(p => ({ ...p, fio2Peep: e.target.value }))} placeholder="ex: 40% / 8" /></div>
              <div className="space-y-1"><Label>Hematúria</Label><Input disabled={readOnly} value={sinaisVitais.hematuria} onChange={e => setSinaisVitais(p => ({ ...p, hematuria: e.target.value }))} placeholder="Sim / Não / Observação" /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 6) IRAS */}
        <TabsContent value="iras">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />Seção IRAS</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>IRAS</Label>
                <RadioGroup disabled={readOnly} value={iras.temIras} onValueChange={v => setIras(p => ({ ...p, temIras: v }))} className="flex gap-4">
                  <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="iras-sim" /><Label htmlFor="iras-sim">Sim</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="iras-nao" /><Label htmlFor="iras-nao">Não</Label></div>
                </RadioGroup>
              </div>
              {iras.temIras === "Sim" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1"><Label>Número de IRAS</Label><Input disabled={readOnly} value={iras.numeroIras} onChange={e => setIras(p => ({ ...p, numeroIras: e.target.value }))} /></div>
                  <div className="md:col-span-2 space-y-1"><Label>Quais foram as IRAS</Label><Input disabled={readOnly} value={iras.quaisIras} onChange={e => setIras(p => ({ ...p, quaisIras: e.target.value }))} /></div>
                  <div className="space-y-1"><Label>Data de fechamento</Label><Input disabled={readOnly} type="date" value={iras.dataFechamento} onChange={e => setIras(p => ({ ...p, dataFechamento: e.target.value }))} /></div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 7) Conclusão */}
        <TabsContent value="conclusao">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Conclusão</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><Label>Classificação final *</Label><Input disabled={readOnly} value={conclusao.classificacao} onChange={e => setConclusao(p => ({ ...p, classificacao: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Conclusão epidemiológica *</Label><Input disabled={readOnly} value={conclusao.conclusaoEpidemiologica} onChange={e => setConclusao(p => ({ ...p, conclusaoEpidemiologica: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Condutas *</Label><Textarea disabled={readOnly} value={conclusao.condutas} onChange={e => setConclusao(p => ({ ...p, condutas: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Desfecho *</Label><Input disabled={readOnly} value={conclusao.desfecho} onChange={e => setConclusao(p => ({ ...p, desfecho: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Vínculo com surto *</Label><Input disabled={readOnly} value={conclusao.vinculoSurto} onChange={e => setConclusao(p => ({ ...p, vinculoSurto: e.target.value }))} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 8) Critérios Diagnósticos */}
        <TabsContent value="criterios">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Critérios Diagnósticos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {criteriosDiagnosticos.map(c => (
                  <label key={c} className="flex items-start gap-2 cursor-pointer">
                    <Checkbox
                      disabled={readOnly}
                      checked={criteriosSelecionados.includes(c)}
                      onCheckedChange={checked => {
                        setCriteriosSelecionados(prev => checked ? [...prev, c] : prev.filter(x => x !== c));
                      }}
                    />
                    <span className="text-sm">{c}</span>
                  </label>
                ))}
              </div>
              <Separator />
              <div className="space-y-1">
                <Label>Justificativa clínica *</Label>
                <Textarea disabled={readOnly} value={justificativa} onChange={e => setJustificativa(e.target.value)} rows={3} placeholder="Descreva a justificativa clínica..." />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 9) Painel Laboratorial */}
        <TabsContent value="laboratorial">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Syringe className="h-4 w-4 text-primary" />Painel Laboratorial</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2 font-medium text-muted-foreground">Exame</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Data</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Microrganismo</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">Sensibilidade</th>
                      <th className="text-left p-2 font-medium text-muted-foreground">MDR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockLabPanel.map((lab, i) => (
                      <tr key={i} className={`border-b ${lab.mdr ? "bg-destructive/5" : ""}`}>
                        <td className="p-2">{lab.exame}</td>
                        <td className="p-2">{lab.data}</td>
                        <td className="p-2 font-medium">{lab.microrganismo}</td>
                        <td className="p-2">{lab.sensibilidade}</td>
                        <td className="p-2">
                          {lab.mdr
                            ? <Badge variant="destructive" className="text-xs">MDR</Badge>
                            : <Badge variant="outline" className="text-xs">Sensível</Badge>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 10) Dados da Ocorrência */}
        <TabsContent value="ocorrencia">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Dados da Ocorrência</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1"><Label>Unidade/Setor</Label><Input disabled={readOnly} value={ocorrencia.unidadeSetor} onChange={e => setOcorrencia(p => ({ ...p, unidadeSetor: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Leito</Label><Input disabled={readOnly} value={ocorrencia.leito} onChange={e => setOcorrencia(p => ({ ...p, leito: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Data dos sintomas</Label><Input disabled={readOnly} type="date" value={ocorrencia.dataSintomas} onChange={e => setOcorrencia(p => ({ ...p, dataSintomas: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Data da suspeita</Label><Input disabled={readOnly} type="date" value={ocorrencia.dataSuspeita} onChange={e => setOcorrencia(p => ({ ...p, dataSuspeita: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Data da notificação</Label><Input disabled={readOnly} type="date" value={ocorrencia.dataNotificacao} onChange={e => setOcorrencia(p => ({ ...p, dataNotificacao: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Origem da notificação</Label><Input disabled={readOnly} value={ocorrencia.origemNotificacao} onChange={e => setOcorrencia(p => ({ ...p, origemNotificacao: e.target.value }))} /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 11) Fatores de Risco e Dispositivos Invasivos */}
        <TabsContent value="fatores">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Dispositivos Invasivos — Datas</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1"><Label>CVC — Inserção</Label><Input disabled={readOnly} type="date" value={dispInvasivos.cvcInsercao} onChange={e => setDispInvasivos(p => ({ ...p, cvcInsercao: e.target.value }))} /></div>
                <div className="space-y-1"><Label>CVC — Retirada</Label><Input disabled={readOnly} type="date" value={dispInvasivos.cvcRetirada} onChange={e => setDispInvasivos(p => ({ ...p, cvcRetirada: e.target.value }))} /></div>
                <div className="flex items-end pb-2"><p className="text-sm">Permanência: <span className="font-bold">{cvcDays != null ? `${cvcDays} dias` : "—"}</span></p></div>
                <div className="space-y-1"><Label>SVU — Inserção</Label><Input disabled={readOnly} type="date" value={dispInvasivos.svuInsercao} onChange={e => setDispInvasivos(p => ({ ...p, svuInsercao: e.target.value }))} /></div>
                <div className="space-y-1"><Label>SVU — Retirada</Label><Input disabled={readOnly} type="date" value={dispInvasivos.svuRetirada} onChange={e => setDispInvasivos(p => ({ ...p, svuRetirada: e.target.value }))} /></div>
                <div className="flex items-end pb-2"><p className="text-sm">Permanência: <span className="font-bold">{svuDays != null ? `${svuDays} dias` : "—"}</span></p></div>
                <div className="space-y-1"><Label>VM — Inserção</Label><Input disabled={readOnly} type="date" value={dispInvasivos.vmInsercao} onChange={e => setDispInvasivos(p => ({ ...p, vmInsercao: e.target.value }))} /></div>
                <div className="space-y-1"><Label>VM — Retirada</Label><Input disabled={readOnly} type="date" value={dispInvasivos.vmRetirada} onChange={e => setDispInvasivos(p => ({ ...p, vmRetirada: e.target.value }))} /></div>
                <div className="flex items-end pb-2"><p className="text-sm">Permanência: <span className="font-bold">{vmDays != null ? `${vmDays} dias` : "—"}</span></p></div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Fatores de Risco</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {mockFatoresRisco.map(f => (
                    <div key={f} className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                      <span className="text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 12) Responsável */}
        <TabsContent value="responsavel">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Atribuição de Responsável</CardTitle></CardHeader>
            <CardContent>
              <div className="max-w-md space-y-1">
                <Label>Profissional Responsável</Label>
                <Select disabled={readOnly} value={responsavel} onValueChange={setResponsavel}>
                  <SelectTrigger><SelectValue placeholder="Selecione o responsável" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dr-silva">Dr. Carlos Silva — Infectologista</SelectItem>
                    <SelectItem value="enf-ana">Enf. Ana Beatriz — CCIH</SelectItem>
                    <SelectItem value="dra-maria">Dra. Maria Lopes — Intensivista</SelectItem>
                    <SelectItem value="bio-pedro">Biol. Pedro Mendes — Microbiologia</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ─── ACTION BUTTONS ───────────────────────────────── */}
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => toast.success("Rascunho salvo!")} className="gap-2">
            <Save className="h-4 w-4" />Salvar Rascunho
          </Button>
          <Button onClick={() => {
            if (!conclusao.classificacao || !conclusao.conclusaoEpidemiologica || !conclusao.condutas || !conclusao.desfecho || !conclusao.vinculoSurto) {
              toast.error("Preencha todos os campos obrigatórios na seção Conclusão");
              return;
            }
            if (!justificativa.trim()) {
              toast.error("Preencha a justificativa clínica nos Critérios Diagnósticos");
              return;
            }
            toast.success("Dados salvos com sucesso!");
          }} className="gap-2">
            <Save className="h-4 w-4" />Salvar e Continuar
          </Button>
          {selected.status === "active" && (
            <Button variant="destructive" onClick={() => setDischargeOpen(true)} className="gap-2">
              <LogOut className="h-4 w-4" />Dar Alta
            </Button>
          )}
        </CardContent>
      </Card>

      {/* ─── DISCHARGE MODAL ──────────────────────────────── */}
      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tipo de Alta</DialogTitle></DialogHeader>
          <Select value={dischargeType} onValueChange={setDischargeType}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{tiposAlta.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDischargeOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDischarge}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── NEW PATIENT MODAL ────────────────────────────── */}
      <Dialog open={newPatientOpen} onOpenChange={setNewPatientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cadastrar Novo Paciente</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Nome Completo *</Label><Input value={newForm.nome} onChange={e => setNewForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Prontuário</Label><Input value={newForm.prontuario} onChange={e => setNewForm(p => ({ ...p, prontuario: e.target.value }))} placeholder="Auto" /></div>
              <div className="space-y-1">
                <Label>Sexo</Label>
                <Select value={newForm.sexo} onValueChange={v => setNewForm(p => ({ ...p, sexo: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Unidade</Label><Input value={newForm.unidade} onChange={e => setNewForm(p => ({ ...p, unidade: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Leito</Label><Input value={newForm.leito} onChange={e => setNewForm(p => ({ ...p, leito: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Data Nascimento</Label><Input type="date" value={newForm.dataNascimento} onChange={e => setNewForm(p => ({ ...p, dataNascimento: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPatientOpen(false)}>Cancelar</Button>
            <Button onClick={handleNewPatient}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Helper Components ────────────────────────────────────────
function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function DeviceSelect({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Select disabled={disabled} value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
