import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Stethoscope, Search, Users, AlertTriangle, Activity, Thermometer,
  Plus, Pencil, LogOut, Clock, Save, Eye, FileText, ShieldAlert, Syringe,
  ClipboardList, ChevronLeft, ChevronRight, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

// ─── Mock Data ────────────────────────────────────────────────
const mockPatients = [
  {
    id: "mock-1", nome: "Maria Silva Santos", unidade: "UTI 1 Adulto", leito: "201-A",
    prontuario: "PRO-2025-0042", dataInternacaoHospitalar: "2026-03-15", origem: "Pronto Socorro",
    dataInternacaoCTI: "2026-03-17", dataAlta: "", doencasBase: "HAS, DM tipo 2, IRC",
    motivoInternacao: "Sepse de foco pulmonar", dataNascimento: "1958-07-22", sexo: "F",
    dataAdmissao: "2026-03-15", especialidade: "Clínica médica",
    diagnostico: "Pneumonia associada à ventilação mecânica", status: "active" as const,
  },
  {
    id: "mock-2", nome: "João Pedro Almeida", unidade: "UTI 2 Adulto", leito: "305-B",
    prontuario: "PRO-2025-0098", dataInternacaoHospitalar: "2026-04-01", origem: "Enfermaria Cirúrgica",
    dataInternacaoCTI: "2026-04-03", dataAlta: "", doencasBase: "Obesidade grau III, DPOC",
    motivoInternacao: "Pós-operatório cirurgia bariátrica complicada", dataNascimento: "1975-11-30",
    sexo: "M", dataAdmissao: "2026-04-01", especialidade: "Cirurgia Geral",
    diagnostico: "Infecção de sítio cirúrgico profunda", status: "active" as const,
  },
  {
    id: "mock-3", nome: "Ana Beatriz Ferreira", unidade: "Clínica Médica", leito: "112-C",
    prontuario: "PRO-2025-0156", dataInternacaoHospitalar: "2026-03-28", origem: "Ambulatório",
    dataInternacaoCTI: "", dataAlta: "2026-04-08", doencasBase: "LES, Nefrite lúpica",
    motivoInternacao: "ITU complicada", dataNascimento: "1990-02-14", sexo: "F",
    dataAdmissao: "2026-03-28", especialidade: "Clínica médica",
    diagnostico: "Infecção do trato urinário associada a cateter", status: "discharged" as const,
  },
];

type PatientStatus = "active" | "discharged" | "transferred" | "deceased";

interface MockPatient {
  id: string; nome: string; unidade: string; leito: string; prontuario: string;
  dataInternacaoHospitalar: string; origem: string; dataInternacaoCTI: string;
  dataAlta: string; doencasBase: string; motivoInternacao: string; dataNascimento: string;
  sexo: string; dataAdmissao: string; especialidade: string; diagnostico: string;
  status: PatientStatus;
}

const especialidades = [
  "Clínica médica", "Cirurgia Geral", "Cirurgia Vascular", "Cirurgia Cardíaca",
  "Cirurgia Oftalmológica", "Neurocirurgia", "Cirurgia Ortopédica",
];

const tiposAlta = ["Óbito", "Alta", "Transferência"];

const criteriosDiagnosticos = [
  "Febre > 38°C por mais de 24h", "Leucocitose > 12.000/mm³", "Hemocultura positiva",
  "Urocultura positiva (≥ 100.000 UFC/mL)", "Cultura de secreção traqueal positiva",
  "Sinais flogísticos em sítio cirúrgico", "Secreção purulenta",
  "Infiltrado pulmonar novo ou progressivo", "Piora do padrão ventilatório",
  "Instabilidade hemodinâmica sem outra causa", "Uso de antimicrobiano terapêutico ≥ 72h",
  "PCR ou Procalcitonina elevada",
];

const initialLabPanel = [
  { exame: "Hemocultura", data: "05/04/2026", microrganismo: "Staphylococcus aureus", sensibilidade: "MRSA", mdr: true },
  { exame: "Urocultura", data: "03/04/2026", microrganismo: "Klebsiella pneumoniae", sensibilidade: "KPC+", mdr: true },
  { exame: "Cultura sec. traqueal", data: "06/04/2026", microrganismo: "Pseudomonas aeruginosa", sensibilidade: "Sensível a Meropenem", mdr: false },
  { exame: "Cultura ferida op.", data: "04/04/2026", microrganismo: "Escherichia coli", sensibilidade: "ESBL", mdr: true },
];

type LabEntry = typeof initialLabPanel[0];

const exameOptions = ["Hemocultura", "Urocultura", "Cultura de secreção traqueal", "Cultura de ferida operatória", "Cultura de ponta de cateter", "Líquor", "Outro"];

const mockFatoresRisco = [
  "Idade > 65 anos", "Diabetes mellitus", "Imunossupressão",
  "Tempo de internação > 7 dias", "Uso prévio de antibióticos",
  "Ventilação mecânica prolongada", "Cateter venoso central > 5 dias",
];

const STEPS = [
  { key: "identificacao", label: "Identificação", icon: FileText },
  { key: "exames", label: "Exames", icon: Syringe },
  { key: "dispositivos", label: "Dispositivos", icon: ShieldAlert },
  { key: "evolucao", label: "Evolução", icon: ClipboardList },
  { key: "monitoramento", label: "Monitoramento Diário", icon: Thermometer },
  { key: "iras", label: "IRAS", icon: ShieldAlert },
  { key: "conclusao", label: "Conclusão", icon: CheckCircle2 },
] as const;

function daysFromDate(dateStr: string) {
  if (!dateStr) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000));
}

function calcAge(birth: string) {
  if (!birth) return "—";
  return Math.floor((Date.now() - new Date(birth).getTime()) / (365.25 * 86400000)) + " anos";
}

// ─── Component ────────────────────────────────────────────────
export default function PatientsMonitoring() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<MockPatient[]>(mockPatients as MockPatient[]);
  const [selectedId, setSelectedId] = useState<string>(mockPatients[0].id);
  const [search, setSearch] = useState("");
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeType, setDischargeType] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "view">("edit");
  const [currentStep, setCurrentStep] = useState(0);
  const [editIdOpen, setEditIdOpen] = useState(false);
  const [editIdForm, setEditIdForm] = useState<Omit<MockPatient, "id" | "status">>({
    nome: "", unidade: "", leito: "", prontuario: "", dataInternacaoHospitalar: "",
    origem: "", dataInternacaoCTI: "", dataAlta: "", doencasBase: "", motivoInternacao: "",
    dataNascimento: "", sexo: "", dataAdmissao: "", especialidade: "", diagnostico: "",
  });

  const [newForm, setNewForm] = useState({ nome: "", prontuario: "", unidade: "", leito: "", sexo: "", dataNascimento: "" });

  const selected = patients.find(p => p.id === selectedId) || patients[0];
  const diasInternacao = daysFromDate(selected.dataInternacaoHospitalar);

  // Section states
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
  const [labPanel, setLabPanel] = useState<LabEntry[]>(initialLabPanel);
  const [newLabOpen, setNewLabOpen] = useState(false);
  const [newLab, setNewLab] = useState({ exame: "", data: "", microrganismo: "", sensibilidade: "", mdr: false });
  const [responsavel, setResponsavel] = useState("");

  const tempFloat = parseFloat(sinaisVitais.temperatura);
  const tempAlta = !isNaN(tempFloat) && tempFloat > 38;
  const readOnly = viewMode === "view";

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
    setPatients(prev => prev.map(p => p.id === selectedId ? { ...p, status: "discharged" as const, dataAlta: new Date().toISOString().slice(0, 10) } : p));
    setDischargeOpen(false);
    toast.success(`Paciente ${selected.nome} — ${dischargeType} registrada`);
  };

  const openEditId = () => {
    const { id, status, ...rest } = selected;
    setEditIdForm(rest);
    setEditIdOpen(true);
  };

  const saveEditId = () => {
    if (!editIdForm.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    setPatients(prev => prev.map(p => p.id === selectedId ? { ...p, ...editIdForm } : p));
    setEditIdOpen(false);
    toast.success("Dados de identificação atualizados!");
  };

  const handleSave = () => {
    if (!conclusao.classificacao || !conclusao.conclusaoEpidemiologica || !conclusao.condutas || !conclusao.desfecho || !conclusao.vinculoSurto) {
      toast.error("Preencha todos os campos obrigatórios na seção Conclusão");
      setCurrentStep(6);
      return;
    }
    if (!justificativa.trim()) {
      toast.error("Preencha a justificativa clínica nos Critérios Diagnósticos");
      setCurrentStep(6);
      return;
    }
    toast.success("Dados salvos com sucesso!");
  };

  const cvcDays = dispInvasivos.cvcInsercao ? daysFromDate(dispInvasivos.cvcInsercao) : null;
  const svuDays = dispInvasivos.svuInsercao ? daysFromDate(dispInvasivos.svuInsercao) : null;
  const vmDays = dispInvasivos.vmInsercao ? daysFromDate(dispInvasivos.vmInsercao) : null;

  const progressPercent = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="pb-24">
      {/* ─── Page Header ──────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
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
          <Button size="sm" onClick={() => setNewPatientOpen(true)}><Plus className="h-4 w-4 mr-1" />Novo Paciente</Button>
        </div>
      </div>

      {/* ─── KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
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
          <div><p className="text-xs text-muted-foreground">Dias Int.</p><p className="text-2xl font-bold">{diasInternacao}d</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent"><Activity className="h-5 w-5 text-primary" /></div>
          <div><p className="text-xs text-muted-foreground">MDR</p><p className="text-2xl font-bold text-destructive">{labPanel.filter(l => l.mdr).length}</p></div>
        </CardContent></Card>
      </div>

      {/* ─── Patient selector ─────────────────────────────── */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar paciente ou prontuário..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger className="w-full md:w-[300px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {filtered.map(p => <SelectItem key={p.id} value={p.id}>{p.nome} — {p.prontuario}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ─── STICKY PATIENT HEADER ────────────────────────── */}
      <div className="sticky top-0 z-30 -mx-1 px-1 mb-4">
        <Card className="border-primary/20 shadow-md bg-card/95 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                <span className="font-bold text-foreground">{selected.nome}</span>
              </div>
              <Badge variant={selected.status === "active" ? "default" : "secondary"}>
                {selected.status === "active" ? "Internado" : selected.status === "discharged" ? "Alta" : selected.status}
              </Badge>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Pront: <strong className="text-foreground">{selected.prontuario}</strong></span>
                <span>{selected.unidade} — Leito {selected.leito}</span>
                <span className={`font-semibold ${diasInternacao > 14 ? "text-destructive" : "text-foreground"}`}>
                  {diasInternacao}d internação
                </span>
              </div>
              {tempAlta && (
                <Badge variant="destructive" className="animate-pulse">⚠ Febre {sinaisVitais.temperatura}°C</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── STEPPER ──────────────────────────────────────── */}
      <Card className="mb-4">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Etapa {currentStep + 1} de {STEPS.length} — {STEPS[currentStep].label}</p>
            <p className="text-xs text-muted-foreground">{Math.round(progressPercent)}% concluído</p>
          </div>
          <Progress value={progressPercent} className="h-2" />
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              const isActive = i === currentStep;
              const isPast = i < currentStep;
              return (
                <button
                  key={step.key}
                  onClick={() => setCurrentStep(i)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors
                    ${isActive ? "bg-primary text-primary-foreground shadow-sm" : ""}
                    ${isPast ? "bg-primary/10 text-primary" : ""}
                    ${!isActive && !isPast ? "text-muted-foreground hover:bg-muted" : ""}
                  `}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{step.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ─── STEP CONTENT ─────────────────────────────────── */}
      <div className="space-y-4">
        {/* 1) Identificação */}
        {currentStep === 0 && (
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Identificação do Paciente</CardTitle>
              <Button variant="outline" size="sm" onClick={openEditId} className="gap-1.5">
                <Pencil className="h-4 w-4" />Editar Identificação
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                <Field label="Nome" value={selected.nome} className="lg:col-span-2" />
                <Field label="Prontuário" value={selected.prontuario} />
                <Field label="Sexo" value={selected.sexo === "M" ? "Masculino" : selected.sexo === "F" ? "Feminino" : "—"} />
                <Field label="Data Nascimento / Idade" value={`${selected.dataNascimento} (${calcAge(selected.dataNascimento)})`} />
                <Field label="Unidade" value={selected.unidade} />
                <Field label="Leito" value={selected.leito} />
                <Field label="Origem" value={selected.origem} />
              </div>
              <Separator className="my-5" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                <Field label="Data Int. Hospitalar" value={selected.dataInternacaoHospitalar} />
                <Field label="Data Int. CTI" value={selected.dataInternacaoCTI || "—"} />
                <Field label="Data de admissão" value={selected.dataAdmissao} />
                <Field label="Data da Alta" value={selected.dataAlta || "—"} />
                <Field label="Especialidade Clínica" value={selected.especialidade} />
                <Field label="Diagnóstico" value={selected.diagnostico} className="lg:col-span-2" />
                <Field label="Doenças de base" value={selected.doencasBase} className="lg:col-span-2" />
                <Field label="Motivo da internação" value={selected.motivoInternacao} className="lg:col-span-2" />
              </div>
              <div className="mt-5 flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 w-fit">
                <Clock className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Tempo de Internação</p>
                  <p className={`text-xl font-bold ${diasInternacao > 14 ? "text-destructive" : "text-foreground"}`}>{diasInternacao} dias</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 2) Exames */}
        {currentStep === 1 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Syringe className="h-4 w-4 text-primary" />Exames</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              {([
                ["hemocultura", "Hemocultura", "hemoculturaObs"],
                ["urocultura", "Urocultura", "uroculturaObs"],
                ["culturaTraqueal", "Cultura de secreção traqueal", "culturaTraquealObs"],
                ["culturaFerida", "Cultura de ferida operatória", "culturaFeridaObs"],
              ] as const).map(([key, label, obsKey]) => (
                <div key={key} className="p-4 rounded-lg border bg-muted/30">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div className="space-y-2">
                      <Label className="font-medium">{label}</Label>
                      <Select disabled={readOnly} value={(exames as any)[key]} onValueChange={v => setExames(prev => ({ ...prev, [key]: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Observação</Label>
                      <Input disabled={readOnly} value={(exames as any)[obsKey]} onChange={e => setExames(prev => ({ ...prev, [obsKey]: e.target.value }))} placeholder="Detalhes do resultado..." />
                    </div>
                  </div>
                </div>
              ))}

              {/* Lab Panel inline */}
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Syringe className="h-4 w-4 text-primary" />Painel Laboratorial
                  </h4>
                  <Button variant="outline" size="sm" onClick={() => { setNewLab({ exame: "", data: new Date().toISOString().slice(0, 10).split("-").reverse().join("/"), microrganismo: "", sensibilidade: "", mdr: false }); setNewLabOpen(true); }} className="gap-1.5">
                    <Plus className="h-4 w-4" />Cadastrar Exame
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium text-muted-foreground">Exame</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Data</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Microrganismo</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">Sensibilidade</th>
                        <th className="text-left p-3 font-medium text-muted-foreground">MDR</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labPanel.map((lab, i) => (
                        <tr key={i} className={`border-t ${lab.mdr ? "bg-destructive/5" : ""}`}>
                          <td className="p-3">{lab.exame}</td>
                          <td className="p-3">{lab.data}</td>
                          <td className="p-3 font-medium">{lab.microrganismo}</td>
                          <td className="p-3">{lab.sensibilidade}</td>
                          <td className="p-3">
                            {lab.mdr
                              ? <Badge variant="destructive" className="text-xs">MDR</Badge>
                              : <Badge variant="outline" className="text-xs">Sensível</Badge>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3) Dispositivos */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" />Dispositivos — Controle Diário</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-5">
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

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Dispositivos Invasivos — Permanência</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {([
                    ["CVC", dispInvasivos.cvcInsercao, dispInvasivos.cvcRetirada, cvcDays, "cvcInsercao", "cvcRetirada"],
                    ["SVU", dispInvasivos.svuInsercao, dispInvasivos.svuRetirada, svuDays, "svuInsercao", "svuRetirada"],
                    ["VM", dispInvasivos.vmInsercao, dispInvasivos.vmRetirada, vmDays, "vmInsercao", "vmRetirada"],
                  ] as const).map(([label, insVal, retVal, days, insKey, retKey]) => (
                    <div key={label} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end p-3 rounded-lg border bg-muted/30">
                      <div className="space-y-2"><Label className="font-medium">{label} — Inserção</Label><Input disabled={readOnly} type="date" value={insVal} onChange={e => setDispInvasivos(p => ({ ...p, [insKey]: e.target.value }))} /></div>
                      <div className="space-y-2"><Label>{label} — Retirada</Label><Input disabled={readOnly} type="date" value={retVal} onChange={e => setDispInvasivos(p => ({ ...p, [retKey]: e.target.value }))} /></div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Permanência: <strong className="text-foreground">{days != null ? `${days} dias` : "—"}</strong></span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Fatores de Risco</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mockFatoresRisco.map(f => (
                    <div key={f} className="flex items-center gap-2 p-2.5 rounded-md bg-destructive/5 border border-destructive/10">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      <span className="text-sm">{f}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 4) Evolução */}
        {currentStep === 3 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />Evolução — Controle Diário</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
                <div key={key} className="space-y-2">
                  <Label className="font-medium">{label}</Label>
                  <Textarea disabled={readOnly} value={(evolucao as any)[key]} onChange={e => setEvolucao(prev => ({ ...prev, [key]: e.target.value }))} rows={3} className="resize-y" />
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* 5) Monitoramento Diário (sinais + ocorrência + responsável) */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Thermometer className="h-4 w-4 text-primary" />Sinais Vitais — Preenchimento Diário</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 font-medium">
                    Temperatura (°C)
                    {tempAlta && <Badge variant="destructive" className="text-xs animate-pulse">⚠ FEBRE</Badge>}
                  </Label>
                  <Input
                    disabled={readOnly} type="number" step="0.1"
                    value={sinaisVitais.temperatura}
                    onChange={e => setSinaisVitais(p => ({ ...p, temperatura: e.target.value }))}
                    className={tempAlta ? "border-destructive text-destructive font-bold bg-destructive/5 ring-1 ring-destructive/30" : ""}
                    placeholder="36.5"
                  />
                  {tempAlta && (
                    <p className="text-xs text-destructive font-medium flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Temperatura acima de 38°C — Investigar foco infeccioso
                    </p>
                  )}
                </div>
                <div className="space-y-2"><Label className="font-medium">Leucócitos</Label><Input disabled={readOnly} value={sinaisVitais.leucocitos} onChange={e => setSinaisVitais(p => ({ ...p, leucocitos: e.target.value }))} placeholder="ex: 12.500" /></div>
                <div className="space-y-2"><Label className="font-medium">Pressão Arterial</Label><Input disabled={readOnly} value={sinaisVitais.pressaoArterial} onChange={e => setSinaisVitais(p => ({ ...p, pressaoArterial: e.target.value }))} placeholder="ex: 120/80" /></div>
                <div className="space-y-2"><Label className="font-medium">FIO2 / PEEP</Label><Input disabled={readOnly} value={sinaisVitais.fio2Peep} onChange={e => setSinaisVitais(p => ({ ...p, fio2Peep: e.target.value }))} placeholder="ex: 40% / 8" /></div>
                <div className="space-y-2"><Label className="font-medium">Hematúria</Label><Input disabled={readOnly} value={sinaisVitais.hematuria} onChange={e => setSinaisVitais(p => ({ ...p, hematuria: e.target.value }))} placeholder="Sim / Não / Observação" /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Dados da Ocorrência</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-2"><Label className="font-medium">Unidade/Setor</Label><Input disabled={readOnly} value={ocorrencia.unidadeSetor} onChange={e => setOcorrencia(p => ({ ...p, unidadeSetor: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="font-medium">Leito</Label><Input disabled={readOnly} value={ocorrencia.leito} onChange={e => setOcorrencia(p => ({ ...p, leito: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="font-medium">Data dos sintomas</Label><Input disabled={readOnly} type="date" value={ocorrencia.dataSintomas} onChange={e => setOcorrencia(p => ({ ...p, dataSintomas: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="font-medium">Data da suspeita</Label><Input disabled={readOnly} type="date" value={ocorrencia.dataSuspeita} onChange={e => setOcorrencia(p => ({ ...p, dataSuspeita: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="font-medium">Data da notificação</Label><Input disabled={readOnly} type="date" value={ocorrencia.dataNotificacao} onChange={e => setOcorrencia(p => ({ ...p, dataNotificacao: e.target.value }))} /></div>
                <div className="space-y-2"><Label className="font-medium">Origem da notificação</Label><Input disabled={readOnly} value={ocorrencia.origemNotificacao} onChange={e => setOcorrencia(p => ({ ...p, origemNotificacao: e.target.value }))} /></div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Atribuição de Responsável</CardTitle></CardHeader>
              <CardContent>
                <div className="max-w-md space-y-2">
                  <Label className="font-medium">Profissional Responsável</Label>
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
          </div>
        )}

        {/* 6) IRAS */}
        {currentStep === 5 && (
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />Seção IRAS</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label className="font-medium">IRAS</Label>
                <RadioGroup disabled={readOnly} value={iras.temIras} onValueChange={v => setIras(p => ({ ...p, temIras: v }))} className="flex gap-6">
                  <div className="flex items-center gap-2"><RadioGroupItem value="Sim" id="iras-sim" /><Label htmlFor="iras-sim">Sim</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="Não" id="iras-nao" /><Label htmlFor="iras-nao">Não</Label></div>
                </RadioGroup>
              </div>
              {iras.temIras === "Sim" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 p-4 rounded-lg border bg-muted/30">
                  <div className="space-y-2"><Label className="font-medium">Número de IRAS</Label><Input disabled={readOnly} value={iras.numeroIras} onChange={e => setIras(p => ({ ...p, numeroIras: e.target.value }))} /></div>
                  <div className="sm:col-span-2 space-y-2"><Label className="font-medium">Quais foram as IRAS</Label><Input disabled={readOnly} value={iras.quaisIras} onChange={e => setIras(p => ({ ...p, quaisIras: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className="font-medium">Data de fechamento</Label><Input disabled={readOnly} type="date" value={iras.dataFechamento} onChange={e => setIras(p => ({ ...p, dataFechamento: e.target.value }))} /></div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 7) Conclusão (+ Critérios Diagnósticos) */}
        {currentStep === 6 && (
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Conclusão</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <RequiredField label="Classificação final" disabled={readOnly} value={conclusao.classificacao} onChange={v => setConclusao(p => ({ ...p, classificacao: v }))} />
                <RequiredField label="Conclusão epidemiológica" disabled={readOnly} value={conclusao.conclusaoEpidemiologica} onChange={v => setConclusao(p => ({ ...p, conclusaoEpidemiologica: v }))} />
                <div className="space-y-2">
                  <Label className="font-medium">Condutas <span className="text-destructive">*</span></Label>
                  <Textarea disabled={readOnly} value={conclusao.condutas} onChange={e => setConclusao(p => ({ ...p, condutas: e.target.value }))} className={!conclusao.condutas ? "border-destructive/40" : ""} />
                </div>
                <RequiredField label="Desfecho" disabled={readOnly} value={conclusao.desfecho} onChange={v => setConclusao(p => ({ ...p, desfecho: v }))} />
                <RequiredField label="Vínculo com surto" disabled={readOnly} value={conclusao.vinculoSurto} onChange={v => setConclusao(p => ({ ...p, vinculoSurto: v }))} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Critérios Diagnósticos</CardTitle></CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {criteriosDiagnosticos.map(c => (
                    <label key={c} className="flex items-start gap-2.5 cursor-pointer p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <Checkbox
                        disabled={readOnly}
                        checked={criteriosSelecionados.includes(c)}
                        onCheckedChange={checked => setCriteriosSelecionados(prev => checked ? [...prev, c] : prev.filter(x => x !== c))}
                      />
                      <span className="text-sm leading-tight">{c}</span>
                    </label>
                  ))}
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label className="font-medium">Justificativa clínica <span className="text-destructive">*</span></Label>
                  <Textarea
                    disabled={readOnly} value={justificativa} onChange={e => setJustificativa(e.target.value)}
                    rows={4} placeholder="Descreva a justificativa clínica..."
                    className={!justificativa.trim() ? "border-destructive/40" : ""}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* ─── FIXED FOOTER ─────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex gap-2">
            <Button
              variant="outline" size="sm" disabled={currentStep === 0}
              onClick={() => setCurrentStep(s => Math.max(0, s - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />Anterior
            </Button>
            <Button
              variant="outline" size="sm" disabled={currentStep === STEPS.length - 1}
              onClick={() => setCurrentStep(s => Math.min(STEPS.length - 1, s + 1))}
            >
              Próxima<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
          <p className="hidden sm:block text-xs text-muted-foreground">
            Etapa {currentStep + 1}/{STEPS.length} — {STEPS[currentStep].label}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => toast.success("Rascunho salvo!")} className="gap-1.5">
              <Save className="h-4 w-4" />Rascunho
            </Button>
            <Button size="sm" onClick={handleSave} className="gap-1.5">
              <Save className="h-4 w-4" />Salvar
            </Button>
            {selected.status === "active" && (
              <Button variant="destructive" size="sm" onClick={() => setDischargeOpen(true)} className="gap-1.5">
                <LogOut className="h-4 w-4" />Alta
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => {
                const investigationData = {
                  paciente: selected.nome,
                  prontuario: selected.prontuario,
                  setor: selected.unidade,
                  leito: selected.leito,
                  sexo: selected.sexo,
                  dataNascimento: selected.dataNascimento,
                  dataInternacao: selected.dataInternacaoHospitalar,
                  diagnostico: selected.diagnostico,
                  doencasBase: selected.doencasBase,
                  motivoInternacao: selected.motivoInternacao,
                  especialidade: selected.especialidade,
                  dispositivos,
                  dispInvasivos,
                  labPanel,
                  evolucao,
                  sinaisVitais,
                  iras,
                  criteriosSelecionados,
                };
                navigate("/notificacao-investigacao-ccih", { state: { fromMonitoring: true, data: investigationData } });
                toast.success("Dados do paciente transferidos para investigação CCIH");
              }}
            >
              <ShieldAlert className="h-4 w-4" />Iniciar Investigação CCIH
            </Button>
          </div>
        </div>
      </div>

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
          <div className="space-y-4">
            <div className="space-y-2"><Label className="font-medium">Nome Completo *</Label><Input value={newForm.nome} onChange={e => setNewForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Prontuário</Label><Input value={newForm.prontuario} onChange={e => setNewForm(p => ({ ...p, prontuario: e.target.value }))} placeholder="Auto" /></div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={newForm.sexo} onValueChange={v => setNewForm(p => ({ ...p, sexo: v }))}>
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Unidade</Label><Input value={newForm.unidade} onChange={e => setNewForm(p => ({ ...p, unidade: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Leito</Label><Input value={newForm.leito} onChange={e => setNewForm(p => ({ ...p, leito: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Data Nascimento</Label><Input type="date" value={newForm.dataNascimento} onChange={e => setNewForm(p => ({ ...p, dataNascimento: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPatientOpen(false)}>Cancelar</Button>
            <Button onClick={handleNewPatient}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── EDIT IDENTIFICATION MODAL ────────────────────── */}
      <Dialog open={editIdOpen} onOpenChange={setEditIdOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Editar Identificação do Paciente</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-2"><Label className="font-medium">Nome Completo *</Label><Input value={editIdForm.nome} onChange={e => setEditIdForm(p => ({ ...p, nome: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Prontuário</Label><Input value={editIdForm.prontuario} onChange={e => setEditIdForm(p => ({ ...p, prontuario: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Sexo</Label>
              <Select value={editIdForm.sexo} onValueChange={v => setEditIdForm(p => ({ ...p, sexo: v }))}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent><SelectItem value="M">Masculino</SelectItem><SelectItem value="F">Feminino</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Data Nascimento</Label><Input type="date" value={editIdForm.dataNascimento} onChange={e => setEditIdForm(p => ({ ...p, dataNascimento: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Unidade</Label><Input value={editIdForm.unidade} onChange={e => setEditIdForm(p => ({ ...p, unidade: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Leito</Label><Input value={editIdForm.leito} onChange={e => setEditIdForm(p => ({ ...p, leito: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Origem</Label><Input value={editIdForm.origem} onChange={e => setEditIdForm(p => ({ ...p, origem: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Data Int. Hospitalar</Label><Input type="date" value={editIdForm.dataInternacaoHospitalar} onChange={e => setEditIdForm(p => ({ ...p, dataInternacaoHospitalar: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Data Int. CTI</Label><Input type="date" value={editIdForm.dataInternacaoCTI} onChange={e => setEditIdForm(p => ({ ...p, dataInternacaoCTI: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Data de Admissão</Label><Input type="date" value={editIdForm.dataAdmissao} onChange={e => setEditIdForm(p => ({ ...p, dataAdmissao: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Data da Alta</Label><Input type="date" value={editIdForm.dataAlta} onChange={e => setEditIdForm(p => ({ ...p, dataAlta: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Especialidade Clínica</Label>
              <Select value={editIdForm.especialidade} onValueChange={v => setEditIdForm(p => ({ ...p, especialidade: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{especialidades.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2 space-y-2"><Label>Diagnóstico</Label><Input value={editIdForm.diagnostico} onChange={e => setEditIdForm(p => ({ ...p, diagnostico: e.target.value }))} /></div>
            <div className="sm:col-span-2 space-y-2"><Label>Doenças de base</Label><Input value={editIdForm.doencasBase} onChange={e => setEditIdForm(p => ({ ...p, doencasBase: e.target.value }))} /></div>
            <div className="sm:col-span-2 space-y-2"><Label>Motivo da internação</Label><Input value={editIdForm.motivoInternacao} onChange={e => setEditIdForm(p => ({ ...p, motivoInternacao: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditIdOpen(false)}>Cancelar</Button>
            <Button onClick={saveEditId}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── NEW LAB EXAM MODAL ──────────────────────────── */}
      <Dialog open={newLabOpen} onOpenChange={setNewLabOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Cadastrar Exame Laboratorial</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="font-medium">Tipo de Exame *</Label>
              <Select value={newLab.exame} onValueChange={v => setNewLab(p => ({ ...p, exame: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o exame" /></SelectTrigger>
                <SelectContent>{exameOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label className="font-medium">Data</Label><Input value={newLab.data} onChange={e => setNewLab(p => ({ ...p, data: e.target.value }))} placeholder="dd/mm/aaaa" /></div>
            <div className="space-y-2"><Label className="font-medium">Microrganismo</Label><Input value={newLab.microrganismo} onChange={e => setNewLab(p => ({ ...p, microrganismo: e.target.value }))} placeholder="Ex: Staphylococcus aureus" /></div>
            <div className="space-y-2"><Label className="font-medium">Perfil de Sensibilidade</Label><Input value={newLab.sensibilidade} onChange={e => setNewLab(p => ({ ...p, sensibilidade: e.target.value }))} placeholder="Ex: MRSA, ESBL, Sensível..." /></div>
            <div className="flex items-center gap-2">
              <Checkbox checked={newLab.mdr} onCheckedChange={checked => setNewLab(p => ({ ...p, mdr: !!checked }))} id="mdr-check" />
              <Label htmlFor="mdr-check" className="font-medium cursor-pointer">Multirresistente (MDR)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewLabOpen(false)}>Cancelar</Button>
            <Button onClick={() => {
              if (!newLab.exame) { toast.error("Selecione o tipo de exame"); return; }
              if (!newLab.microrganismo.trim()) { toast.error("Informe o microrganismo"); return; }
              setLabPanel(prev => [...prev, { ...newLab }]);
              setNewLabOpen(false);
              toast.success("Exame cadastrado no painel laboratorial!");
            }}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function Field({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium text-foreground">{value || "—"}</p>
    </div>
  );
}

function DeviceSelect({ label, value, onChange, options, disabled }: { label: string; value: string; onChange: (v: string) => void; options: string[]; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <Label className="font-medium">{label}</Label>
      <Select disabled={disabled} value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
        <SelectContent>{options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function RequiredField({ label, value, onChange, disabled }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="space-y-2">
      <Label className="font-medium">{label} <span className="text-destructive">*</span></Label>
      <Input disabled={disabled} value={value} onChange={e => onChange(e.target.value)} className={!value ? "border-destructive/40" : ""} />
    </div>
  );
}
