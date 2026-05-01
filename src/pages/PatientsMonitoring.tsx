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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import DashboardFilters from "@/components/DashboardFilters";
import {
  Stethoscope, Search, Users, AlertTriangle, Activity, Thermometer,
  Plus, Pencil, LogOut, Clock, Save, Eye, FileText, ShieldAlert, Syringe,
  ClipboardList, ChevronLeft, CheckCircle2, Trash2, LogIn, Skull, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { usePatientMonitoring, PatientRecord } from "@/hooks/usePatientMonitoring";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { ComboboxSearch } from "@/components/ComboboxSearch";
import { MICROORGANISMS } from "@/data/microorganisms";

type PatientStatus = "active" | "discharged" | "transferred" | "deceased";

// Per-patient extra data (devices/antibiotics still in component state for now)
interface PatientExtraData {
  dispInvasivos?: { cvcInsercao: string; cvcRetirada: string; svuInsercao: string; svuRetirada: string; vmInsercao: string; vmRetirada: string; tqtInsercao: string; tqtRetirada: string };
  antibioticos?: { id: string; nome: string; dataInicio: string; dataFim: string }[];
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

interface LabEntry {
  exame: string;
  data: string;
  microrganismo: string;
  sensibilidade: string;
  mdr: boolean;
}

interface AntibioticEntry {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
}

const exameOptions = ["Hemocultura", "Urocultura", "Cultura de secreção traqueal", "Cultura de ferida operatória", "Cultura de ponta de cateter", "Líquor", "Líquido", "Swab retal", "Swab nasal", "Outro"];

const fatoresRiscoOptions = [
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

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const dmy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    let [, d, m, y] = dmy;
    let yearNum = parseInt(y);
    if (yearNum < 100) yearNum += 2000;
    const dayNum = parseInt(d);
    const monthNum = parseInt(m);
    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) return null;
    const result = new Date(Date.UTC(yearNum, monthNum - 1, dayNum));
    if (result.getUTCDate() !== dayNum || result.getUTCMonth() !== monthNum - 1) return null;
    return result;
  }
  const iso = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const result = new Date(Date.UTC(+iso[1], +iso[2] - 1, +iso[3]));
    if (result.getUTCDate() !== +iso[3] || result.getUTCMonth() !== +iso[2] - 1) return null;
    return result;
  }
  return null;
}

function daysFromDate(dateStr: string) {
  const d = parseDate(dateStr);
  if (!d) return 0;
  const now = new Date();
  const todayUTC = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.floor((todayUTC - d.getTime()) / 86400000));
}

function calcAge(birth: string) {
  if (!birth) return "—";
  return Math.floor((Date.now() - new Date(birth).getTime()) / (365.25 * 86400000)) + " anos";
}

// ─── Component ────────────────────────────────────────────────
export default function PatientsMonitoring() {
  const navigate = useNavigate();
  const { patients, loading: patientsLoading, createPatient, updatePatient, dischargePatient: dischargePatientFn, deletePatient, changePatientStatus } = usePatientMonitoring();
  const { isAdmin } = useIsAdmin();
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [statusChangeId, setStatusChangeId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<PatientRecord["status"]>("active");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterMes, setFilterMes] = useState<string[]>([]);
  const [filterAno, setFilterAno] = useState<string[]>([]);
  const [filterSetor, setFilterSetor] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [newPatientOpen, setNewPatientOpen] = useState(false);
  const [dischargeOpen, setDischargeOpen] = useState(false);
  const [dischargeConfirmOpen, setDischargeConfirmOpen] = useState(false);
  const [dischargePatientId, setDischargePatientId] = useState<string | null>(null);
  const [dischargeType, setDischargeType] = useState("");
  const [viewMode, setViewMode] = useState<"edit" | "view">("edit");
  const [currentStep, setCurrentStep] = useState(0);
  const [editIdOpen, setEditIdOpen] = useState(false);
  const [editIdForm, setEditIdForm] = useState<Omit<PatientRecord, "id" | "status">>({
    nome: "", unidade: "", leito: "", prontuario: "", dataInternacaoHospitalar: "",
    origem: "", dataInternacaoCTI: "", dataAlta: "", doencasBase: "", motivoInternacao: "",
    dataNascimento: "", sexo: "", dataAdmissao: "", especialidade: "", diagnostico: "",
  });

  // View-only dialog
  const [viewPatientOpen, setViewPatientOpen] = useState(false);
  const [viewPatientId, setViewPatientId] = useState<string | null>(null);

  const [newForm, setNewForm] = useState({ nome: "", prontuario: "", unidade: "", leito: "", sexo: "", dataNascimento: "", infeccaoMaterna: "", irasTransplacentaria: "", pesoRN: "", diagnosticoRN: "", tipoParto: "", bolsaRotaH: "", bolsaRotaDias: "", apgar: "", idadeGestacional: "", dataInternacaoRN: "" });

  const selected = selectedId ? patients.find(p => p.id === selectedId) || null : null;
  const viewPatient = viewPatientId ? patients.find(p => p.id === viewPatientId) || null : null;

  // Section states
  const [exames, setExames] = useState({ hemocultura: "Não", urocultura: "Não", culturaTraqueal: "Não", culturaFerida: "Não", swabRetal: "Não", swabNasal: "Não", hemoculturaObs: "", uroculturaObs: "", culturaTraquealObs: "", culturaFeridaObs: "", swabRetalObs: "", swabNasalObs: "" });
  const [dispositivos, setDispositivos] = useState({ cvc: "", cvp: "Não", cateterArterial: "Não", cateterHemodialise: "", ventilacao: "Não", cateterVesical: "Não", sonda: "Não", drenos: "Não", feridaOp: "Não", tqt: "Não", vni: "Não" });
  const [evolucao, setEvolucao] = useState({ evolucaoInternacao: "", colonizacoes: "", antibioticoPrevio: "", culturasPreviaCTI: "", resultadoCulturasCTI: "", antibioticosCTI: "", dispositivosInvasivos: "", examesImagem: "", condutasDiarias: "" });
  const [sinaisVitais, setSinaisVitais] = useState({ temperatura: "", leucocitos: "", pressaoArterial: "", fio2Peep: "", hematuria: "", spo2: "" });
  type SinaisVitaisEntry = typeof sinaisVitais & { data: string; hora: string };
  const [sinaisVitaisHistorico, setSinaisVitaisHistorico] = useState<SinaisVitaisEntry[]>([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [iras, setIras] = useState({ temIras: "", numeroIras: "", quaisIras: "", dataFechamento: "" });
  const [infeccaoMaternaDetail, setInfeccaoMaternaDetail] = useState("");
  const [irasTransplacentariaDetail, setIrasTransplacentariaDetail] = useState("");
  const [neonatalDetail, setNeonatalDetail] = useState({ pesoRN: "", diagnosticoRN: "", tipoParto: "", bolsaRotaH: "", bolsaRotaDias: "", apgar: "", idadeGestacional: "", dataInternacaoRN: "" });
  const [vdrl, setVdrl] = useState({ vdrlMae: "", vdrlRN: "", vdrlLiquor: "" });
  const [conclusao, setConclusao] = useState({ classificacao: "", conclusaoEpidemiologica: "", condutas: "", desfecho: "", vinculoSurto: "" });
  const [criteriosSelecionados, setCriteriosSelecionados] = useState<string[]>([]);
  const [justificativa, setJustificativa] = useState("");
  const [ocorrencia, setOcorrencia] = useState({ unidadeSetor: "", leito: "", dataSintomas: "", dataSuspeita: "", dataNotificacao: "", origemNotificacao: "" });
  const [dispInvasivos, setDispInvasivos] = useState<any>({
    cvcInsercao: "", cvcRetirada: "", cvcTrocas: [] as Array<{ insercao: string; retirada: string }>,
    cvpInsercao: "", cvpRetirada: "", cvpTrocas: [] as Array<{ insercao: string; retirada: string }>,
    svuInsercao: "", svuRetirada: "", svuTrocas: [] as Array<{ insercao: string; retirada: string }>,
    vmInsercao: "", vmRetirada: "", vmTrocas: [] as Array<{ insercao: string; retirada: string }>,
    tqtInsercao: "", tqtRetirada: "", tqtTrocas: [] as Array<{ insercao: string; retirada: string }>,
    hemoInsercao: "", hemoRetirada: "", hemoTrocas: [] as Array<{ insercao: string; retirada: string }>,
  });
  const [labPanel, setLabPanel] = useState<LabEntry[]>([]);
  const [newLabOpen, setNewLabOpen] = useState(false);
  const [editingLabIndex, setEditingLabIndex] = useState<number | null>(null);
  const [newLab, setNewLab] = useState({ exame: "", data: "", microrganismo: "", sensibilidade: "", mdr: false });
  const [responsavel, setResponsavel] = useState("");
  const [antibioticos, setAntibioticos] = useState<AntibioticEntry[]>([]);
  const [newAtbOpen, setNewAtbOpen] = useState(false);
  const [newAtb, setNewAtb] = useState({ nome: "", nomeOutros: "", dataInicio: "", dataFim: "" });
  const [editingAtbId, setEditingAtbId] = useState<string | null>(null);

  const tempFloat = parseFloat(sinaisVitais.temperatura);
  const tempAlta = !isNaN(tempFloat) && tempFloat > 38;
  const readOnly = viewMode === "view";

  const calcDiasUso = (inicio: string, fim: string) => {
    const d1 = parseDate(inicio);
    if (!d1) return 0;
    const d2 = parseDate(fim);
    let end: number;
    if (d2) {
      end = d2.getTime();
    } else {
      const now = new Date();
      end = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    }
    return Math.max(0, Math.ceil((end - d1.getTime()) / 86400000));
  };

  const resolveAtbNome = () => {
    if (newAtb.nome === "Outros") return newAtb.nomeOutros.trim();
    return newAtb.nome;
  };

  const handleAddAtb = () => {
    const nomeFinal = resolveAtbNome();
    if (!nomeFinal || !newAtb.dataInicio) {
      toast.error("Informe o nome e a data de início do antibiótico");
      return;
    }
    setAntibioticos(prev => [...prev, { id: crypto.randomUUID(), nome: nomeFinal, dataInicio: newAtb.dataInicio, dataFim: newAtb.dataFim }]);
    setNewAtb({ nome: "", nomeOutros: "", dataInicio: "", dataFim: "" });
    setEditingAtbId(null);
    setNewAtbOpen(false);
    toast.success("Antibiótico adicionado");
  };

  const handleEditAtb = (atb: AntibioticEntry) => {
    setEditingAtbId(atb.id);
    setNewAtb({ nome: atb.nome, nomeOutros: "", dataInicio: atb.dataInicio, dataFim: atb.dataFim });
    setNewAtbOpen(true);
  };

  const handleSaveEditAtb = () => {
    const nomeFinal = resolveAtbNome();
    if (!nomeFinal || !newAtb.dataInicio) {
      toast.error("Informe o nome e a data de início do antibiótico");
      return;
    }
    setAntibioticos(prev => prev.map(a => a.id === editingAtbId ? { ...a, nome: nomeFinal, dataInicio: newAtb.dataInicio, dataFim: newAtb.dataFim } : a));
    setNewAtb({ nome: "", nomeOutros: "", dataInicio: "", dataFim: "" });
    setEditingAtbId(null);
    setNewAtbOpen(false);
    toast.success("Antibiótico atualizado");
  };

  const handleRemoveAtb = (id: string) => {
    setAntibioticos(prev => prev.filter(a => a.id !== id));
  };

  const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const statusLabels: Record<string, string> = { active: "Internado", discharged: "Alta", transferred: "Transferido", deceased: "Óbito" };
  const statusOptions = ["active", "discharged", "transferred", "deceased"];

  const allSectors = Array.from(new Set(patients.map(p => p.unidade).filter(Boolean)));

  // Base filter: aplica mês/ano/setor/busca (sem status) — usado para os KPIs
  const filteredForKpis = patients.filter(p => {
    if (search && !p.nome.toLowerCase().includes(search.toLowerCase()) && !p.prontuario.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterSetor.length > 0 && !filterSetor.includes(p.unidade)) return false;
    const admDate = p.dataAdmissao || p.dataInternacaoHospitalar;
    if (admDate) {
      const d = new Date(admDate);
      if (filterMes.length > 0 && !filterMes.includes(meses[d.getMonth()])) return false;
      if (filterAno.length > 0 && !filterAno.includes(String(d.getFullYear()))) return false;
    } else {
      if (filterMes.length > 0 || filterAno.length > 0) return false;
    }
    return true;
  });
  const filtered = filteredForKpis.filter(p => {
    if (filterStatus.length > 0 && !filterStatus.includes(p.status)) return false;
    return true;
  });
  const activeCount = filteredForKpis.filter(p => p.status === "active").length;
  const totalCount = filteredForKpis.length;
  const deceasedCount = filteredForKpis.filter(p => p.status === "deceased").length;
  const transferredCount = filteredForKpis.filter(p => p.status === "transferred").length;
  const dischargedCount = filteredForKpis.filter(p => p.status === "discharged").length;

  const handleNewPatient = async () => {
    if (!newForm.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    await createPatient({
      nome: newForm.nome,
      unidade: newForm.unidade || "UTI 1 Adulto",
      leito: newForm.leito || "—",
      prontuario: newForm.prontuario || `PRO-${Date.now().toString().slice(-6)}`,
      dataInternacaoHospitalar: new Date().toISOString().slice(0, 10),
      origem: "", dataInternacaoCTI: "", dataAlta: "", doencasBase: "", motivoInternacao: "",
      dataNascimento: newForm.dataNascimento, sexo: newForm.sexo,
      dataAdmissao: new Date().toISOString().slice(0, 10),
      especialidade: "", diagnostico: "", status: "active",
      infeccaoMaterna: newForm.infeccaoMaterna, irasTransplacentaria: newForm.irasTransplacentaria,
      pesoRN: newForm.pesoRN, diagnosticoRN: newForm.diagnosticoRN, tipoParto: newForm.tipoParto,
      bolsaRotaH: newForm.bolsaRotaH, bolsaRotaDias: newForm.bolsaRotaDias, apgar: newForm.apgar,
      idadeGestacional: newForm.idadeGestacional, dataInternacaoRN: newForm.dataInternacaoRN,
    });
    setNewPatientOpen(false);
    setNewForm({ nome: "", prontuario: "", unidade: "", leito: "", sexo: "", dataNascimento: "", infeccaoMaterna: "", irasTransplacentaria: "", pesoRN: "", diagnosticoRN: "", tipoParto: "", bolsaRotaH: "", bolsaRotaDias: "", apgar: "", idadeGestacional: "", dataInternacaoRN: "" });
  };

  const handleDischarge = async () => {
    if (!dischargeType) { toast.error("Selecione o tipo de alta"); return; }
    const dpId = dischargePatientId;
    if (!dpId) return;
    const pat = patients.find(p => p.id === dpId);
    const ok = await dischargePatientFn(dpId, dischargeType);
    if (ok) {
      setDischargeOpen(false);
      setDischargePatientId(null);
      toast.success(`Paciente ${pat?.nome || ""} — ${dischargeType} registrada`);
    }
  };

  const openDischargeConfirm = (patientId: string) => {
    setDischargePatientId(patientId);
    setDischargeConfirmOpen(true);
  };

  const openEditId = (patientId: string) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient) return;
    const { id, status, ...rest } = patient;
    setEditIdForm(rest);
    setSelectedId(patientId);
    setEditIdOpen(true);
  };

  const saveEditId = async () => {
    if (!editIdForm.nome.trim()) { toast.error("Nome é obrigatório"); return; }
    if (!selectedId) return;
    const ok = await updatePatient(selectedId, editIdForm);
    if (ok) {
      setEditIdOpen(false);
      toast.success("Dados de identificação atualizados!");
    }
  };

  const enterPatient = (patientId: string) => {
    const pat = patients.find(p => p.id === patientId);
    if (pat) {
      setNeonatalDetail({
        pesoRN: pat.pesoRN || "", diagnosticoRN: pat.diagnosticoRN || "",
        tipoParto: pat.tipoParto || "", bolsaRotaH: pat.bolsaRotaH || "",
        bolsaRotaDias: pat.bolsaRotaDias || "", apgar: pat.apgar || "",
        idadeGestacional: pat.idadeGestacional || "", dataInternacaoRN: pat.dataInternacaoRN || "",
      });
      setInfeccaoMaternaDetail(pat.infeccaoMaterna || "");
      setIrasTransplacentariaDetail(pat.irasTransplacentaria || "");

      // Restore persisted tab data from clinical_data
      const cd = (pat as any)._clinicalData || {};
      setDispositivos(cd.dispositivos || { cvc: "", cvp: "Não", cateterArterial: "Não", cateterHemodialise: "", ventilacao: "Não", cateterVesical: "Não", sonda: "Não", drenos: "Não", feridaOp: "Não", tqt: "Não", vni: "Não" });
      // Migrate legacy single-swap shape into trocas[] for backward compatibility
      const rawDi = cd.dispInvasivos || {};
      const migrateKey = (k: string) => {
        const trocas = Array.isArray(rawDi[`${k}Trocas`]) ? rawDi[`${k}Trocas`] : [];
        if (trocas.length === 0 && (rawDi[`${k}NovaInsercao`] || rawDi[`${k}NovaRetirada`])) {
          trocas.push({ insercao: rawDi[`${k}NovaInsercao`] || "", retirada: rawDi[`${k}NovaRetirada`] || "" });
        }
        return trocas;
      };
      setDispInvasivos({
        cvcInsercao: rawDi.cvcInsercao || "", cvcRetirada: rawDi.cvcRetirada || "", cvcTrocas: migrateKey("cvc"),
        cvpInsercao: rawDi.cvpInsercao || "", cvpRetirada: rawDi.cvpRetirada || "", cvpTrocas: migrateKey("cvp"),
        svuInsercao: rawDi.svuInsercao || "", svuRetirada: rawDi.svuRetirada || "", svuTrocas: migrateKey("svu"),
        vmInsercao: rawDi.vmInsercao || "", vmRetirada: rawDi.vmRetirada || "", vmTrocas: migrateKey("vm"),
        tqtInsercao: rawDi.tqtInsercao || "", tqtRetirada: rawDi.tqtRetirada || "", tqtTrocas: migrateKey("tqt"),
        hemoInsercao: rawDi.hemoInsercao || "", hemoRetirada: rawDi.hemoRetirada || "", hemoTrocas: migrateKey("hemo"),
      });
      setAntibioticos(cd.antibioticos || []);
      setEvolucao(cd.evolucao || { evolucaoInternacao: "", colonizacoes: "", antibioticoPrevio: "", culturasPreviaCTI: "", resultadoCulturasCTI: "", antibioticosCTI: "", dispositivosInvasivos: "", examesImagem: "", condutasDiarias: "" });
      setSinaisVitais(cd.sinaisVitais || { temperatura: "", leucocitos: "", pressaoArterial: "", fio2Peep: "", hematuria: "", spo2: "" });
      setSinaisVitaisHistorico(cd.sinaisVitaisHistorico || []);
      setIras(cd.iras || { temIras: "", numeroIras: "", quaisIras: "", dataFechamento: "" });
      setConclusao(cd.conclusao || { classificacao: "", conclusaoEpidemiologica: "", condutas: "", desfecho: "", vinculoSurto: "" });
      setCriteriosSelecionados(cd.criteriosSelecionados || []);
      setJustificativa(cd.justificativa || "");
      setOcorrencia(cd.ocorrencia || { unidadeSetor: "", leito: "", dataSintomas: "", dataSuspeita: "", dataNotificacao: "", origemNotificacao: "" });
      setLabPanel(cd.labPanel || []);
      setExames(cd.exames || { hemocultura: "Não", urocultura: "Não", culturaTraqueal: "Não", culturaFerida: "Não", swabRetal: "Não", swabNasal: "Não", hemoculturaObs: "", uroculturaObs: "", culturaTraquealObs: "", culturaFeridaObs: "", swabRetalObs: "", swabNasalObs: "" });
      setVdrl(cd.vdrl || { vdrlMae: "", vdrlRN: "", vdrlLiquor: "" });
      setResponsavel(cd.responsavel || "");
    }
    setSelectedId(patientId);
    setCurrentStep(0);
    setViewMode("edit");
  };

  const openViewPatient = (patientId: string) => {
    setViewPatientId(patientId);
    setViewPatientOpen(true);
  };

  const handleSave = async () => {
    if (!selected || !selectedId) return;
    const ok = await updatePatient(selectedId, {
      ...selected,
      // Store all tab data inside clinical_data via a special key
      _tabData: {
        dispositivos, dispInvasivos, antibioticos, evolucao,
        sinaisVitais, sinaisVitaisHistorico, iras, conclusao,
        criteriosSelecionados, justificativa, ocorrencia,
        labPanel, exames, vdrl, responsavel,
      },
    } as any);
    if (ok) toast.success("Dados salvos com sucesso!");
  };

  const calcTotalDays = (ins: string, ret: string, trocas: Array<{ insercao: string; retirada: string }>) => {
    if (!ins) return null;
    let total = calcDiasUso(ins, ret);
    (trocas || []).forEach(t => {
      if (t.insercao) total += calcDiasUso(t.insercao, t.retirada);
    });
    return total;
  };
  const cvcDays = calcTotalDays(dispInvasivos.cvcInsercao, dispInvasivos.cvcRetirada, dispInvasivos.cvcTrocas);
  const cvpDays = calcTotalDays(dispInvasivos.cvpInsercao, dispInvasivos.cvpRetirada, dispInvasivos.cvpTrocas);
  const svuDays = calcTotalDays(dispInvasivos.svuInsercao, dispInvasivos.svuRetirada, dispInvasivos.svuTrocas);
  const vmDays = calcTotalDays(dispInvasivos.vmInsercao, dispInvasivos.vmRetirada, dispInvasivos.vmTrocas);
  const tqtDays = calcTotalDays(dispInvasivos.tqtInsercao, dispInvasivos.tqtRetirada, dispInvasivos.tqtTrocas);
  const hemoDays = calcTotalDays(dispInvasivos.hemoInsercao, dispInvasivos.hemoRetirada, dispInvasivos.hemoTrocas);

  // ─── PATIENT DETAIL VIEW (full page with tabs) ─────────────
  if (selected) {
    const diasInternacao = daysFromDate(selected.dataInternacaoHospitalar);
    const diasCTI = selected.dataInternacaoCTI ? daysFromDate(selected.dataInternacaoCTI) : null;
    return (
      <div className="pb-24">
        {/* ─── Sticky Patient Header ─────────────────────── */}
        <div className="sticky top-0 z-30 bg-background border-b p-3 sm:p-4 -mx-1 px-1">
          <div className="flex items-start sm:items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setSelectedId(null)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Stethoscope className="h-5 w-5 text-primary shrink-0" />
              <span className="font-bold text-foreground text-sm sm:text-lg truncate">{selected.nome}</span>
              <Badge variant={selected.status === "active" ? "default" : "secondary"} className="shrink-0 text-[10px] sm:text-xs">
                {selected.status === "active" ? "Internado" : selected.status === "discharged" ? "Alta" : selected.status}
              </Badge>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant={viewMode === "edit" ? "default" : "outline"} size="sm" onClick={() => setViewMode("edit")} className="h-8 px-2 sm:px-3"><Pencil className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Editar</span></Button>
              <Button variant={viewMode === "view" ? "default" : "outline"} size="sm" onClick={() => setViewMode("view")} className="h-8 px-2 sm:px-3"><Eye className="h-4 w-4 sm:mr-1" /><span className="hidden sm:inline">Visualizar</span></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-3 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs sm:ml-10">
            <div><span className="text-muted-foreground">Pront:</span> <span className="font-medium">{selected.prontuario}</span></div>
            <div><span className="text-muted-foreground">Unidade:</span> <span className="font-medium">{selected.unidade}</span></div>
            <div><span className="text-muted-foreground">Leito:</span> <span className="font-medium">{selected.leito}</span></div>
            <div><span className="text-muted-foreground">Nasc.:</span> <span className="font-medium">{selected.dataNascimento} ({calcAge(selected.dataNascimento)})</span></div>
            <div><span className="text-muted-foreground">Sexo:</span> <span className="font-medium">{selected.sexo === "M" ? "Masculino" : selected.sexo === "F" ? "Feminino" : "—"}</span></div>
            <div><span className="text-muted-foreground">Admissão:</span> <span className="font-medium">{selected.dataAdmissao}</span></div>
            <div>
              <span className="text-muted-foreground">Internação:</span>{" "}
              <span className={`font-semibold ${diasInternacao > 14 ? "text-destructive" : "text-foreground"}`}>{diasInternacao}d</span>
            </div>
            <div>
              <span className="text-muted-foreground">CTI:</span>{" "}
              <span className={`font-semibold ${diasCTI !== null && diasCTI > 7 ? "text-destructive" : "text-foreground"}`}>
                {diasCTI !== null ? `${diasCTI}d` : "—"}
              </span>
            </div>
          </div>
          {/* Tab Navigation */}
          <div className="mt-3 sm:ml-10">
            <div className="flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
              {STEPS.map((step, i) => {
                const Icon = step.icon;
                const isActive = i === currentStep;
                return (
                  <button
                    key={step.key}
                    onClick={() => setCurrentStep(i)}
                    className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-md text-xs font-medium whitespace-nowrap transition-colors shrink-0
                      ${isActive ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"}
                    `}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden md:inline">{step.label}</span>
                    <span className="md:hidden">{isActive ? step.label : i + 1}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {tempAlta && (
          <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium text-destructive">⚠ Febre detectada: {sinaisVitais.temperatura}°C — Investigar foco infeccioso</span>
          </div>
        )}

        {/* ─── STEP CONTENT ─────────────────────────────────── */}
        <div className="mt-4 space-y-4">
          {/* 1) Identificação */}
          {currentStep === 0 && (
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Identificação do Paciente</CardTitle>
                <Button variant="outline" size="sm" onClick={() => openEditId(selected.id)} className="gap-1.5">
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
                {(selected.unidade === "UTI Neonatal" || selected.unidade === "Alojamento Conjunto") && (
                  <>
                    <Separator className="my-5" />
                    <h4 className="text-sm font-semibold text-foreground mb-3">Dados Neonatais</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                      <div className="space-y-2">
                        <Label className="font-medium">Peso do RN ao Nascer (g)</Label>
                        {readOnly ? <p className="text-sm text-foreground">{neonatalDetail.pesoRN || "—"}</p> : <Input type="number" value={neonatalDetail.pesoRN} onChange={e => setNeonatalDetail(p => ({ ...p, pesoRN: e.target.value }))} placeholder="Ex: 3200" />}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium">Diagnóstico</Label>
                        {readOnly ? <p className="text-sm text-foreground">{neonatalDetail.diagnosticoRN || "—"}</p> : <Input value={neonatalDetail.diagnosticoRN} onChange={e => setNeonatalDetail(p => ({ ...p, diagnosticoRN: e.target.value }))} />}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium">Parto</Label>
                        {readOnly ? <p className="text-sm text-foreground">{neonatalDetail.tipoParto || "—"}</p> : (
                          <Select value={neonatalDetail.tipoParto} onValueChange={v => setNeonatalDetail(p => ({ ...p, tipoParto: v }))}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Cesárea">Cesárea</SelectItem>
                              <SelectItem value="Normal">Normal</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium">Bolsa Rota</Label>
                        {readOnly ? <p className="text-sm text-foreground">{neonatalDetail.bolsaRotaH ? `${neonatalDetail.bolsaRotaH}h ${neonatalDetail.bolsaRotaDias}dias` : "—"}</p> : (
                          <div className="flex items-center gap-2">
                            <Input type="number" value={neonatalDetail.bolsaRotaH} onChange={e => setNeonatalDetail(p => ({ ...p, bolsaRotaH: e.target.value }))} placeholder="h" className="w-20" />
                            <span className="text-sm text-muted-foreground">h</span>
                            <Input type="number" value={neonatalDetail.bolsaRotaDias} onChange={e => setNeonatalDetail(p => ({ ...p, bolsaRotaDias: e.target.value }))} placeholder="dias" className="w-20" />
                            <span className="text-sm text-muted-foreground">dias</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium">Apgar</Label>
                        {readOnly ? <p className="text-sm text-foreground">{neonatalDetail.apgar || "—"}</p> : <Input value={neonatalDetail.apgar} onChange={e => setNeonatalDetail(p => ({ ...p, apgar: e.target.value }))} placeholder="Ex: 8/9" />}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium">Idade Gestacional</Label>
                        {readOnly ? <p className="text-sm text-foreground">{neonatalDetail.idadeGestacional || "—"}</p> : <Input value={neonatalDetail.idadeGestacional} onChange={e => setNeonatalDetail(p => ({ ...p, idadeGestacional: e.target.value }))} placeholder="Ex: 38 semanas" />}
                      </div>
                      <div className="space-y-2">
                        <Label className="font-medium">Data da Internação</Label>
                        {readOnly ? <p className="text-sm text-foreground">{neonatalDetail.dataInternacaoRN || "—"}</p> : <Input type="date" value={neonatalDetail.dataInternacaoRN} onChange={e => setNeonatalDetail(p => ({ ...p, dataInternacaoRN: e.target.value }))} />}
                      </div>
                    </div>
                    <Separator className="my-5" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-4">
                      <div className="space-y-2">
                        <Label className="font-medium">Infecção Materna</Label>
                        {readOnly ? (
                          <p className="text-sm text-foreground">{infeccaoMaternaDetail || "—"}</p>
                        ) : (
                          <Select value={infeccaoMaternaDetail} onValueChange={v => { setInfeccaoMaternaDetail(v); if (v === "Não") setIrasTransplacentariaDetail(""); }}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Sim">Sim</SelectItem>
                              <SelectItem value="Não">Não</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                      {infeccaoMaternaDetail === "Sim" && (
                        <div className="space-y-2">
                          <Label className="font-medium">IRAS Transplacentária</Label>
                          {readOnly ? (
                            <p className="text-sm text-foreground">{irasTransplacentariaDetail || "—"}</p>
                          ) : (
                            <Select value={irasTransplacentariaDetail} onValueChange={v => setIrasTransplacentariaDetail(v)}>
                              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                              <SelectContent>
                                {["Herpes simples", "Toxoplasmose", "Rubéola", "Citomegalovírus", "Sífilis", "Hepatite B", "Vírus HIV"].map(item => (
                                  <SelectItem key={item} value={item}>{item}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div className="mt-5 flex flex-wrap gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 w-fit">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tempo de Internação Hospitalar</p>
                      <p className={`text-xl font-bold ${diasInternacao > 14 ? "text-destructive" : "text-foreground"}`}>{diasInternacao} dias</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20 w-fit">
                    <Clock className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">Tempo de Internação no CTI</p>
                      <p className={`text-xl font-bold ${diasCTI !== null && diasCTI > 7 ? "text-destructive" : "text-foreground"}`}>
                        {diasCTI !== null ? `${diasCTI} dias` : "—"}
                      </p>
                    </div>
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
                  ["swabRetal", "Swab retal", "swabRetalObs"],
                  ["swabNasal", "Swab nasal", "swabNasalObs"],
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

                <Separator />
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Syringe className="h-4 w-4 text-primary" />Painel Laboratorial
                    </h4>
                    <Button variant="outline" size="sm" onClick={() => { setEditingLabIndex(null); setNewLab({ exame: "", data: new Date().toISOString().slice(0, 10).split("-").reverse().join("/"), microrganismo: "", sensibilidade: "", mdr: false }); setNewLabOpen(true); }} className="gap-1.5">
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
                          <th className="p-3"></th>
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
                            <td className="p-3">
                              {!readOnly && (
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                                    onClick={() => { setEditingLabIndex(i); setNewLab({ ...lab }); setNewLabOpen(true); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                    onClick={() => { setLabPanel(prev => prev.filter((_, idx) => idx !== i)); toast.success("Exame removido do painel"); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {irasTransplacentariaDetail === "Sífilis" && (
                  <>
                    <Separator />
                    <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                      <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Syringe className="h-4 w-4 text-amber-600" />VDRL — Sífilis
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="font-medium">VDRL da Mãe</Label>
                          {readOnly ? (
                            <p className="text-sm text-foreground">{vdrl.vdrlMae || "—"}</p>
                          ) : (
                            <Input value={vdrl.vdrlMae} onChange={e => setVdrl(p => ({ ...p, vdrlMae: e.target.value }))} placeholder="Ex: Reagente 1:8" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="font-medium">VDRL do RN</Label>
                          {readOnly ? (
                            <p className="text-sm text-foreground">{vdrl.vdrlRN || "—"}</p>
                          ) : (
                            <Input value={vdrl.vdrlRN} onChange={e => setVdrl(p => ({ ...p, vdrlRN: e.target.value }))} placeholder="Ex: Reagente 1:4" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="font-medium">VDRL no Líquor</Label>
                          {readOnly ? (
                            <p className="text-sm text-foreground">{vdrl.vdrlLiquor || "—"}</p>
                          ) : (
                            <Input value={vdrl.vdrlLiquor} onChange={e => setVdrl(p => ({ ...p, vdrlLiquor: e.target.value }))} placeholder="Ex: Não reagente" />
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
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
                  <DeviceSelect label="Cateter Venoso Periférico" disabled={readOnly} value={dispositivos.cvp} onChange={v => setDispositivos(p => ({ ...p, cvp: v }))} options={["Sim", "Não"]} />
                  <DeviceSelect label="Cateter Arterial Periférico" disabled={readOnly} value={dispositivos.cateterArterial} onChange={v => setDispositivos(p => ({ ...p, cateterArterial: v }))} options={["Sim", "Não"]} />
                  <DeviceSelect label="Cateter de Hemodiálise" disabled={readOnly} value={dispositivos.cateterHemodialise} onChange={v => setDispositivos(p => ({ ...p, cateterHemodialise: v }))} options={["Jugular", "Subclávia", "Femoral"]} />
                  <DeviceSelect label="Ventilação Mecânica" disabled={readOnly} value={dispositivos.ventilacao} onChange={v => setDispositivos(p => ({ ...p, ventilacao: v }))} options={["Sim", "Não"]} />
                  <DeviceSelect label="Cateter Vesical de Demora" disabled={readOnly} value={dispositivos.cateterVesical} onChange={v => setDispositivos(p => ({ ...p, cateterVesical: v }))} options={["Sim", "Não"]} />
                  <DeviceSelect label="Sonda Nasogástrica/Nasoenteral" disabled={readOnly} value={dispositivos.sonda} onChange={v => setDispositivos(p => ({ ...p, sonda: v }))} options={["Sim", "Não"]} />
                  <DeviceSelect label="Drenos" disabled={readOnly} value={dispositivos.drenos} onChange={v => setDispositivos(p => ({ ...p, drenos: v }))} options={["Sim", "Não"]} />
                  <DeviceSelect label="Ferida Operatória" disabled={readOnly} value={dispositivos.feridaOp} onChange={v => setDispositivos(p => ({ ...p, feridaOp: v }))} options={["Sim", "Não"]} />
                  <DeviceSelect label="TQT (Traqueostomia)" disabled={readOnly} value={dispositivos.tqt} onChange={v => setDispositivos(p => ({ ...p, tqt: v }))} options={["Sim", "Não"]} />
                  <DeviceSelect label="VNI (Ventilação Não Invasiva)" disabled={readOnly} value={dispositivos.vni} onChange={v => setDispositivos(p => ({ ...p, vni: v }))} options={["Sim", "Não"]} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Dispositivos Invasivos — Permanência</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {([
                      ["CVC", "cvc", dispInvasivos.cvcInsercao, dispInvasivos.cvcRetirada, dispInvasivos.cvcTrocas, cvcDays],
                      ["CVP (Cateter Venoso Periférico)", "cvp", dispInvasivos.cvpInsercao, dispInvasivos.cvpRetirada, dispInvasivos.cvpTrocas, cvpDays],
                      ["SVD", "svu", dispInvasivos.svuInsercao, dispInvasivos.svuRetirada, dispInvasivos.svuTrocas, svuDays],
                      ["VM", "vm", dispInvasivos.vmInsercao, dispInvasivos.vmRetirada, dispInvasivos.vmTrocas, vmDays],
                      ["TQT", "tqt", dispInvasivos.tqtInsercao, dispInvasivos.tqtRetirada, dispInvasivos.tqtTrocas, tqtDays],
                      ["Cateter de Hemodiálise", "hemo", dispInvasivos.hemoInsercao, dispInvasivos.hemoRetirada, dispInvasivos.hemoTrocas, hemoDays],
                    ] as const).map(([label, prefix, insVal, retVal, trocas, days]) => {
                      const insKey = `${prefix}Insercao`;
                      const retKey = `${prefix}Retirada`;
                      const trocasKey = `${prefix}Trocas`;
                      const trocasArr = (trocas || []) as Array<{ insercao: string; retirada: string }>;
                      const updateTroca = (idx: number, field: "insercao" | "retirada", value: string) => {
                        setDispInvasivos((p: any) => {
                          const next = [...(p[trocasKey] || [])];
                          next[idx] = { ...next[idx], [field]: value };
                          return { ...p, [trocasKey]: next };
                        });
                      };
                      const removeTroca = (idx: number) => {
                        setDispInvasivos((p: any) => ({ ...p, [trocasKey]: (p[trocasKey] || []).filter((_: any, i: number) => i !== idx) }));
                      };
                      const addTroca = () => {
                        setDispInvasivos((p: any) => ({ ...p, [trocasKey]: [...(p[trocasKey] || []), { insercao: "", retirada: "" }] }));
                      };
                      return (
                        <div key={label} className="space-y-3 p-3 rounded-lg border bg-muted/30">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
                            <div className="space-y-2"><Label className="font-medium">{label} — Inserção</Label><Input disabled={readOnly} type="date" value={insVal} onChange={e => setDispInvasivos((p: any) => ({ ...p, [insKey]: e.target.value }))} /></div>
                            <div className="space-y-2"><Label>{label} — Retirada</Label><Input disabled={readOnly} type="date" value={retVal} onChange={e => setDispInvasivos((p: any) => ({ ...p, [retKey]: e.target.value }))} /></div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">Permanência total: <strong className="text-foreground">{days != null ? `${days} dias` : "—"}</strong></span>
                            </div>
                          </div>

                          {trocasArr.map((t, idx) => (
                            <div key={idx} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-4 pt-2 border-t items-end">
                              <div className="space-y-2"><Label>Nova Inserção #{idx + 1}</Label><Input disabled={readOnly} type="date" value={t.insercao} onChange={e => updateTroca(idx, "insercao", e.target.value)} /></div>
                              <div className="space-y-2"><Label>Nova Retirada #{idx + 1}</Label><Input disabled={readOnly} type="date" value={t.retirada} onChange={e => updateTroca(idx, "retirada", e.target.value)} /></div>
                              {!readOnly && (
                                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive" onClick={() => removeTroca(idx)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          ))}

                          <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
                            <Label className="text-sm font-medium">Realizado troca de dispositivo?</Label>
                            <RadioGroup
                              disabled={readOnly}
                              value={trocasArr.length > 0 ? "Sim" : "Não"}
                              onValueChange={v => {
                                if (v === "Sim" && trocasArr.length === 0) addTroca();
                                if (v === "Não") setDispInvasivos((p: any) => ({ ...p, [trocasKey]: [] }));
                              }}
                              className="flex gap-4"
                            >
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="Sim" id={`${prefix}-troca-sim`} />
                                <Label htmlFor={`${prefix}-troca-sim`} className="cursor-pointer">Sim</Label>
                              </div>
                              <div className="flex items-center gap-2">
                                <RadioGroupItem value="Não" id={`${prefix}-troca-nao`} />
                                <Label htmlFor={`${prefix}-troca-nao`} className="cursor-pointer">Não</Label>
                              </div>
                            </RadioGroup>
                            {trocasArr.length > 0 && !readOnly && (
                              <Button variant="outline" size="sm" onClick={addTroca} className="gap-1.5 ml-auto">
                                <Plus className="h-4 w-4" />Adicionar nova troca
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Fatores de Risco</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {fatoresRiscoOptions.map(f => (
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

          {/* 5) Monitoramento Diário */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2"><Thermometer className="h-4 w-4 text-primary" />Sinais Vitais — Preenchimento Diário</CardTitle>
                    <div className="flex gap-2">
                      {sinaisVitaisHistorico.length > 0 && (
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowHistorico(!showHistorico)}>
                          <Clock className="h-3.5 w-3.5" /> Histórico ({sinaisVitaisHistorico.length})
                        </Button>
                      )}
                      {!readOnly && (
                        <Button size="sm" variant="default" className="gap-1.5" onClick={() => {
                          if (!sinaisVitais.temperatura && !sinaisVitais.leucocitos && !sinaisVitais.pressaoArterial && !sinaisVitais.spo2) {
                            toast.error("Preencha pelo menos um campo antes de salvar");
                            return;
                          }
                          const now = new Date();
                          setSinaisVitaisHistorico(prev => [{
                            ...sinaisVitais,
                            data: now.toLocaleDateString("pt-BR"),
                            hora: now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                          }, ...prev]);
                          setSinaisVitais({ temperatura: "", leucocitos: "", pressaoArterial: "", fio2Peep: "", hematuria: "", spo2: "" });
                          toast.success("Sinais vitais salvos no histórico");
                        }}>
                          <Save className="h-3.5 w-3.5" /> Salvar registro
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
                    <div className="space-y-2"><Label className="font-medium">SPO2 (%)</Label><Input disabled={readOnly} type="number" value={sinaisVitais.spo2} onChange={e => setSinaisVitais(p => ({ ...p, spo2: e.target.value }))} placeholder="ex: 98" /></div>
                    <div className="space-y-2"><Label className="font-medium">FIO2 / PEEP</Label><Input disabled={readOnly} value={sinaisVitais.fio2Peep} onChange={e => setSinaisVitais(p => ({ ...p, fio2Peep: e.target.value }))} placeholder="ex: 40% / 8" /></div>
                    <div className="space-y-2"><Label className="font-medium">Hematúria</Label><Input disabled={readOnly} value={sinaisVitais.hematuria} onChange={e => setSinaisVitais(p => ({ ...p, hematuria: e.target.value }))} placeholder="Sim / Não / Observação" /></div>
                  </div>

                  {/* Histórico de sinais vitais */}
                  {showHistorico && sinaisVitaisHistorico.length > 0 && (
                    <div className="pt-2">
                      <Separator className="mb-4" />
                      <h4 className="text-sm font-semibold mb-3 flex items-center gap-2"><Clock className="h-4 w-4 text-muted-foreground" />Histórico de Registros</h4>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Data</TableHead>
                              <TableHead>Hora</TableHead>
                              <TableHead>Temp (°C)</TableHead>
                              <TableHead>SPO2 (%)</TableHead>
                              <TableHead>Leucócitos</TableHead>
                              <TableHead>PA</TableHead>
                              <TableHead>FIO2/PEEP</TableHead>
                              <TableHead>Hematúria</TableHead>
                              {!readOnly && <TableHead className="w-10" />}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {sinaisVitaisHistorico.map((entry, idx) => {
                              const t = parseFloat(entry.temperatura);
                              const febre = !isNaN(t) && t > 38;
                              return (
                                <TableRow key={idx} className={febre ? "bg-destructive/5" : ""}>
                                  <TableCell className="font-medium">{entry.data}</TableCell>
                                  <TableCell>{entry.hora}</TableCell>
                                  <TableCell className={febre ? "text-destructive font-bold" : ""}>{entry.temperatura || "—"}</TableCell>
                                  <TableCell>{entry.spo2 || "—"}</TableCell>
                                  <TableCell>{entry.leucocitos || "—"}</TableCell>
                                  <TableCell>{entry.pressaoArterial || "—"}</TableCell>
                                  <TableCell>{entry.fio2Peep || "—"}</TableCell>
                                  <TableCell>{entry.hematuria || "—"}</TableCell>
                                  {!readOnly && (
                                    <TableCell>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setSinaisVitaisHistorico(prev => prev.filter((_, i) => i !== idx))}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Dados da Ocorrência</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <div className="space-y-2"><Label className="font-medium">Unidade/Setor</Label><Input disabled={readOnly} value={ocorrencia.unidadeSetor} onChange={e => setOcorrencia(p => ({ ...p, unidadeSetor: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className="font-medium">Leito</Label><Input disabled={readOnly} value={ocorrencia.leito} onChange={e => setOcorrencia(p => ({ ...p, leito: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className="font-medium">Data Início Sintomas</Label><Input disabled={readOnly} type="date" value={ocorrencia.dataSintomas} onChange={e => setOcorrencia(p => ({ ...p, dataSintomas: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className="font-medium">Data Suspeita</Label><Input disabled={readOnly} type="date" value={ocorrencia.dataSuspeita} onChange={e => setOcorrencia(p => ({ ...p, dataSuspeita: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className="font-medium">Data Notificação</Label><Input disabled={readOnly} type="date" value={ocorrencia.dataNotificacao} onChange={e => setOcorrencia(p => ({ ...p, dataNotificacao: e.target.value }))} /></div>
                  <div className="space-y-2"><Label className="font-medium">Origem da Notificação</Label><Input disabled={readOnly} value={ocorrencia.origemNotificacao} onChange={e => setOcorrencia(p => ({ ...p, origemNotificacao: e.target.value }))} /></div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Responsável pela Investigação</CardTitle></CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label className="font-medium">Profissional Responsável</Label>
                    <Input disabled={readOnly} value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome do responsável" />
                  </div>
                </CardContent>
              </Card>

              {/* Antibióticos em uso */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Syringe className="h-4 w-4 text-primary" />Antibióticos em Uso</CardTitle>
                    {!readOnly && (
                      <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setNewAtbOpen(true)}>
                        <Plus className="h-3.5 w-3.5" /> Adicionar
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {antibioticos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhum antibiótico cadastrado.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Antibiótico</TableHead>
                            <TableHead>Início</TableHead>
                            <TableHead>Fim</TableHead>
                            <TableHead className="text-center">Dias de Uso</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            {!readOnly && <TableHead className="w-10" />}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {antibioticos.map(atb => {
                            const dias = calcDiasUso(atb.dataInicio, atb.dataFim);
                            const emUso = !atb.dataFim;
                            return (
                              <TableRow key={atb.id}>
                                <TableCell className="font-medium">{atb.nome}</TableCell>
                                <TableCell>{atb.dataInicio ? new Date(atb.dataInicio + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                                <TableCell>{atb.dataFim ? new Date(atb.dataFim + "T12:00:00").toLocaleDateString("pt-BR") : "—"}</TableCell>
                                <TableCell className="text-center font-semibold">{dias} {dias === 1 ? "dia" : "dias"}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={emUso ? "default" : "secondary"} className={emUso ? "bg-emerald-100 text-emerald-800 border-emerald-200" : ""}>
                                    {emUso ? "Em uso" : "Finalizado"}
                                  </Badge>
                                </TableCell>
                                {!readOnly && (
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary" onClick={() => handleEditAtb(atb)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleRemoveAtb(atb.id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                )}
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dialog para adicionar antibiótico */}
              <Dialog open={newAtbOpen} onOpenChange={v => { setNewAtbOpen(v); if (!v) { setEditingAtbId(null); setNewAtb({ nome: "", nomeOutros: "", dataInicio: "", dataFim: "" }); } }}>
                <DialogContent className="max-w-md">
                  <DialogHeader><DialogTitle>{editingAtbId ? "Editar Antibiótico" : "Adicionar Antibiótico"}</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="font-medium">Nome do Antibiótico *</Label>
                      <ComboboxSearch
                        options={[
                          ...[
                            "Penicilina G","Penicilina benzatina","Oxacilina","Nafcilina","Ampicilina","Amoxicilina",
                            "Piperacilina","Piperacilina/tazobactam","Cefazolina","Cefuroxima","Ceftriaxona","Cefotaxima",
                            "Ceftazidima","Cefepime","Ceftarolina","Ceftolozano/tazobactam","Ceftazidima/avibactam",
                            "Cefiderocol","Imipenem/cilastatina","Meropenem","Ertapenem","Doripenem","Aztreonam",
                            "Sulbactam","Tazobactam","Clavulanato","Avibactam","Vaborbactam","Relebactam",
                            "Vancomicina","Teicoplanina","Dalbavancina","Oritavancina","Linezolida","Tedizolida",
                            "Daptomicina","Azitromicina","Claritromicina","Eritromicina","Clindamicina",
                            "Gentamicina","Amicacina","Tobramicina","Estreptomicina","Neomicina",
                            "Ciprofloxacino","Levofloxacino","Moxifloxacino","Ofloxacino","Norfloxacino",
                            "Doxiciclina","Minociclina","Tigeciclina","Eravaciclina",
                            "Sulfametoxazol-trimetoprim","Sulfadiazina","Metronidazol","Tinidazol",
                            "Cloranfenicol","Fosfomicina","Nitrofurantoína","Rifampicina","Rifabutina",
                            "Mupirocina","Polimixina B","Colistina","Fidaxomicina","Bacitracina","Fluconazol"
                          ].sort((a, b) => a.localeCompare(b, "pt-BR")),
                          "Outros"
                        ]}
                        value={newAtb.nome}
                        onValueChange={v => setNewAtb(p => ({ ...p, nome: v }))}
                        placeholder="Selecione o antibiótico..."
                      />
                    </div>
                    {newAtb.nome === "Outros" && (
                      <div className="space-y-2">
                        <Label className="font-medium">Descreva o antibiótico *</Label>
                        <Input
                          placeholder="Digite o nome do antibiótico"
                          value={newAtb.nomeOutros || ""}
                          onChange={e => setNewAtb(p => ({ ...p, nomeOutros: e.target.value }))}
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="font-medium">Data de Início *</Label>
                      <Input type="date" value={newAtb.dataInicio} onChange={e => setNewAtb(p => ({ ...p, dataInicio: e.target.value }))} />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-medium">Data de Fim <span className="text-muted-foreground text-xs">(deixe vazio se ainda em uso)</span></Label>
                      <Input type="date" value={newAtb.dataFim} onChange={e => setNewAtb(p => ({ ...p, dataFim: e.target.value }))} />
                    </div>
                    {newAtb.dataInicio && (
                      <div className="p-3 rounded-lg bg-muted/50 border">
                        <p className="text-sm font-medium">Tempo de uso: <span className="text-primary">{calcDiasUso(newAtb.dataInicio, newAtb.dataFim)} dias</span></p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => { setNewAtbOpen(false); setEditingAtbId(null); setNewAtb({ nome: "", nomeOutros: "", dataInicio: "", dataFim: "" }); }}>Cancelar</Button>
                    <Button onClick={editingAtbId ? handleSaveEditAtb : handleAddAtb}>{editingAtbId ? "Salvar" : "Adicionar"}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
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

          {/* 7) Conclusão */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Conclusão</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label className="font-medium">Classificação final</Label>
                    <Input disabled={readOnly} value={conclusao.classificacao} onChange={e => setConclusao(p => ({ ...p, classificacao: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">Conclusão epidemiológica</Label>
                    <Input disabled={readOnly} value={conclusao.conclusaoEpidemiologica} onChange={e => setConclusao(p => ({ ...p, conclusaoEpidemiologica: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">Condutas</Label>
                    <Textarea disabled={readOnly} value={conclusao.condutas} onChange={e => setConclusao(p => ({ ...p, condutas: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">Desfecho</Label>
                    <Input disabled={readOnly} value={conclusao.desfecho} onChange={e => setConclusao(p => ({ ...p, desfecho: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-medium">Vínculo com surto</Label>
                    <Input disabled={readOnly} value={conclusao.vinculoSurto} onChange={e => setConclusao(p => ({ ...p, vinculoSurto: e.target.value }))} />
                  </div>
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
                    <Label className="font-medium">Justificativa clínica</Label>
                    <Textarea
                      disabled={readOnly} value={justificativa} onChange={e => setJustificativa(e.target.value)}
                      rows={4} placeholder="Descreva a justificativa clínica..."
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
            <p className="hidden sm:block text-xs text-muted-foreground">
              {STEPS[currentStep].label}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => toast.success("Rascunho salvo!")} className="gap-1.5">
                <Save className="h-4 w-4" />Rascunho
              </Button>
              <Button size="sm" onClick={handleSave} className="gap-1.5">
                <Save className="h-4 w-4" />Salvar
              </Button>
              {selected.status === "active" && (
                <Button variant="destructive" size="sm" onClick={() => openDischargeConfirm(selected.id)} className="gap-1.5">
                  <LogOut className="h-4 w-4" />Alta
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                onClick={() => {
                  const investigationData = {
                    paciente: selected.nome, prontuario: selected.prontuario,
                    setor: selected.unidade, leito: selected.leito, sexo: selected.sexo,
                    dataNascimento: selected.dataNascimento,
                    dataInternacao: selected.dataInternacaoHospitalar,
                    diagnostico: selected.diagnostico, doencasBase: selected.doencasBase,
                    motivoInternacao: selected.motivoInternacao, especialidade: selected.especialidade,
                    dispositivos, dispInvasivos, labPanel, evolucao, sinaisVitais, iras, criteriosSelecionados,
                  };
                  navigate("/cases/investigation", { state: { fromMonitoring: true, data: investigationData } });
                  toast.success("Dados do paciente transferidos para investigação CCIH");
                }}
              >
                <ShieldAlert className="h-4 w-4" />Iniciar Investigação CCIH
              </Button>
            </div>
          </div>
        </div>

        {/* ─── DISCHARGE CONFIRM DIALOG ─────────────────── */}
        <Dialog open={dischargeConfirmOpen} onOpenChange={setDischargeConfirmOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Confirmar Alta</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja dar alta ao paciente <strong className="text-foreground">{patients.find(p => p.id === dischargePatientId)?.nome}</strong>?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDischargeConfirmOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={() => { setDischargeConfirmOpen(false); setDischargeOpen(true); }}>Sim, continuar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── DISCHARGE TYPE MODAL ─────────────────────────── */}
        <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Tipo de Alta</DialogTitle></DialogHeader>
            <Select value={dischargeType} onValueChange={setDischargeType}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{tiposAlta.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDischargeOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleDischarge}>Confirmar Alta</Button>
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
            <DialogHeader><DialogTitle>{editingLabIndex !== null ? "Editar" : "Cadastrar"} Exame Laboratorial</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-medium">Tipo de Exame *</Label>
                <Select value={newLab.exame} onValueChange={v => setNewLab(p => ({ ...p, exame: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o exame" /></SelectTrigger>
                  <SelectContent>{exameOptions.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label className="font-medium">Data</Label><Input value={newLab.data} onChange={e => setNewLab(p => ({ ...p, data: e.target.value }))} placeholder="dd/mm/aaaa" /></div>
              <div className="space-y-2">
                <Label className="font-medium">Microrganismo</Label>
                <ComboboxSearch
                  options={MICROORGANISMS}
                  value={MICROORGANISMS.includes(newLab.microrganismo) ? newLab.microrganismo : (newLab.microrganismo ? "Outros" : "")}
                  onValueChange={v => setNewLab(p => ({ ...p, microrganismo: v === "Outros" ? "" : v, _outros: v === "Outros" } as any))}
                  placeholder="Selecione o microrganismo"
                  emptyText="Nenhum microrganismo encontrado"
                />
                {((newLab as any)._outros || (newLab.microrganismo && !MICROORGANISMS.includes(newLab.microrganismo))) && (
                  <Input
                    value={newLab.microrganismo}
                    onChange={e => setNewLab(p => ({ ...p, microrganismo: e.target.value } as any))}
                    placeholder="Descreva o microrganismo"
                    autoFocus
                  />
                )}
              </div>
              <div className="space-y-2"><Label className="font-medium">Perfil de Sensibilidade</Label><Input value={newLab.sensibilidade} onChange={e => setNewLab(p => ({ ...p, sensibilidade: e.target.value }))} placeholder="Ex: MRSA, ESBL, Sensível..." /></div>
              <div className="flex items-center gap-2">
                <Checkbox checked={newLab.mdr} onCheckedChange={checked => setNewLab(p => ({ ...p, mdr: !!checked }))} id="mdr-check" />
                <Label htmlFor="mdr-check" className="font-medium cursor-pointer">Multirresistente (MDR)</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setNewLabOpen(false); setEditingLabIndex(null); }}>Cancelar</Button>
              <Button onClick={() => {
                if (!newLab.exame) { toast.error("Selecione o tipo de exame"); return; }
                if (!newLab.microrganismo.trim()) { toast.error("Informe o microrganismo"); return; }
                if (editingLabIndex !== null) {
                  setLabPanel(prev => prev.map((l, idx) => idx === editingLabIndex ? { ...newLab } : l));
                  toast.success("Exame atualizado!");
                } else {
                  setLabPanel(prev => [...prev, { ...newLab }]);
                  toast.success("Exame cadastrado no painel laboratorial!");
                }
                setNewLabOpen(false);
                setEditingLabIndex(null);
              }}>{editingLabIndex !== null ? "Salvar" : "Cadastrar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ─── PATIENT LIST VIEW (main page) ─────────────────────────
  if (patientsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando pacientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* ─── Page Header ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Stethoscope className="h-7 w-7 text-primary shrink-0" />
          <div className="min-w-0">
            <h1 className="text-lg md:text-2xl font-bold text-foreground truncate">Monitoramento de Pacientes</h1>
            <p className="text-xs md:text-sm text-muted-foreground">Investigação de infecções — Controle diário</p>
          </div>
        </div>
        <Button size="sm" onClick={() => setNewPatientOpen(true)} className="self-start sm:self-auto"><Plus className="h-4 w-4 mr-1" />Novo Paciente</Button>
      </div>

      {/* ─── KPIs ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        <Card><CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 shrink-0"><Users className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">Ativos</p><p className="text-lg sm:text-2xl font-bold">{activeCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-destructive/10 shrink-0"><AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">Total</p><p className="text-lg sm:text-2xl font-bold">{totalCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-accent shrink-0"><Skull className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">Óbitos</p><p className="text-lg sm:text-2xl font-bold text-destructive">{deceasedCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-accent shrink-0"><Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">Transferidos</p><p className="text-lg sm:text-2xl font-bold">{transferredCount}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-lg bg-accent shrink-0"><Activity className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /></div>
          <div className="min-w-0"><p className="text-[10px] sm:text-xs text-muted-foreground">Altas</p><p className="text-lg sm:text-2xl font-bold">{dischargedCount}</p></div>
        </CardContent></Card>
      </div>

      {/* ─── Search ───────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar paciente ou prontuário..." className="pl-9 h-9" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* ─── Filters ──────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-3 sm:gap-4">
        <DashboardFilters
          mes={filterMes}
          setMes={setFilterMes}
          ano={filterAno}
          setAno={setFilterAno}
          setor={filterSetor}
          setSetor={setFilterSetor}
          sectors={allSectors.length > 0 ? allSectors : undefined}
        />
        <div className="space-y-1.5 w-full sm:w-auto">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={filterStatus.length === 1 ? filterStatus[0] : "all"} onValueChange={v => setFilterStatus(v === "all" ? [] : [v])}>
            <SelectTrigger className="h-9 w-full sm:w-[150px] text-sm">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {statusOptions.map(s => (
                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {patients.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 space-y-4">
            <div className="p-4 rounded-full bg-primary/10">
              <Stethoscope className="h-10 w-10 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-foreground">Nenhum paciente cadastrado</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                Cadastre o primeiro paciente para iniciar o monitoramento de infecções e controle diário.
              </p>
            </div>
            <Button onClick={() => setNewPatientOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />Cadastrar Primeiro Paciente
            </Button>
          </CardContent>
        </Card>
      ) : (
      <>
      {/* ─── Patient Table ────────────────────────────────── */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-2">
          <CardTitle className="text-sm md:text-lg">Pacientes ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Prontuário</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Leito</TableHead>
                  <TableHead>Dias Int.</TableHead>
                  <TableHead>Dias CTI</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum paciente encontrado.</TableCell></TableRow>
                )}
                {filtered.map(p => {
                  const dias = daysFromDate(p.dataInternacaoHospitalar);
                  const diasCti = p.dataInternacaoCTI ? daysFromDate(p.dataInternacaoCTI) : null;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.nome}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{p.prontuario}</TableCell>
                      <TableCell>{p.unidade}</TableCell>
                      <TableCell>{p.leito}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${dias > 14 ? "text-destructive" : ""}`}>{dias}d</span>
                      </TableCell>
                      <TableCell>
                        <span className={`font-semibold ${diasCti !== null && diasCti > 7 ? "text-destructive" : ""}`}>
                          {diasCti !== null ? `${diasCti}d` : "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "default" : "secondary"}>
                          {p.status === "active" ? "Internado" : p.status === "discharged" ? "Alta" : p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditId(p.id)} title="Editar cadastro">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openViewPatient(p.id)} title="Visualizar tudo">
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => enterPatient(p.id)} title="Entrar no paciente">
                            <LogIn className="h-3.5 w-3.5 text-primary" />
                          </Button>
                          {p.status === "active" && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => openDischargeConfirm(p.id)} title="Dar alta">
                              <LogOut className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {isAdmin && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setStatusChangeId(p.id); setNewStatus(p.status); }} title="Alterar status (admin)">
                                <RefreshCw className="h-3.5 w-3.5 text-warning" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteConfirmId(p.id)} title="Excluir paciente (admin)">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2 p-3">
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhum paciente.</p>}
            {filtered.map(p => {
              const dias = daysFromDate(p.dataInternacaoHospitalar);
              const diasCti = p.dataInternacaoCTI ? daysFromDate(p.dataInternacaoCTI) : null;
              return (
                <div key={p.id} className="border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{p.nome}</p>
                      <p className="text-[10px] text-muted-foreground">{p.prontuario}</p>
                    </div>
                    <Badge variant={p.status === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {p.status === "active" ? "Internado" : "Alta"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>{p.unidade}</span>
                    <span>Leito {p.leito}</span>
                    <span>Int.: <strong className={`${dias > 14 ? "text-destructive" : "text-foreground"}`}>{dias}d</strong></span>
                    <span>CTI: <strong className={`${diasCti !== null && diasCti > 7 ? "text-destructive" : "text-foreground"}`}>{diasCti !== null ? `${diasCti}d` : "—"}</strong></span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => openEditId(p.id)}>
                      <Pencil className="h-3 w-3" /> Editar
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => openViewPatient(p.id)}>
                      <Eye className="h-3 w-3" /> Ver
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => enterPatient(p.id)}>
                      <LogIn className="h-3 w-3" /> Entrar
                    </Button>
                    {p.status === "active" && (
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => openDischargeConfirm(p.id)}>
                        <LogOut className="h-3 w-3" /> Alta
                      </Button>
                    )}
                    {isAdmin && (
                      <>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => { setStatusChangeId(p.id); setNewStatus(p.status); }}>
                          <RefreshCw className="h-3 w-3" /> Status
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setDeleteConfirmId(p.id)}>
                          <Trash2 className="h-3 w-3" /> Excluir
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      </>
      )}

      {/* ─── DELETE CONFIRMATION (admin) ─────────────────── */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e removerá todos os dados de {patients.find(p => p.id === deleteConfirmId)?.nome || "este paciente"}.
              Não é possível desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteConfirmId) {
                  const ok = await deletePatient(deleteConfirmId);
                  if (ok) setDeleteConfirmId(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── CHANGE STATUS (admin) ───────────────────────── */}
      <AlertDialog open={!!statusChangeId} onOpenChange={(o) => !o && setStatusChangeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar status do paciente</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione o novo status para {patients.find(p => p.id === statusChangeId)?.nome || "o paciente"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label className="text-xs">Novo status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as PatientRecord["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Internado</SelectItem>
                <SelectItem value="discharged">Alta</SelectItem>
                <SelectItem value="transferred">Transferido</SelectItem>
                <SelectItem value="deceased">Óbito</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (statusChangeId) {
                  const dischargeMap: Record<string, string> = { discharged: "Alta", transferred: "Transferência", deceased: "Óbito" };
                  const ok = await changePatientStatus(statusChangeId, newStatus, dischargeMap[newStatus]);
                  if (ok) setStatusChangeId(null);
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── NEW PATIENT MODAL ────────────────────────────── */}
      <Dialog open={newPatientOpen} onOpenChange={setNewPatientOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={newForm.unidade} onValueChange={v => setNewForm(p => ({ ...p, unidade: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                  <SelectContent>
                    {["UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica", "Contêiner", "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto"].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>Leito</Label><Input value={newForm.leito} onChange={e => setNewForm(p => ({ ...p, leito: e.target.value }))} /></div>
            </div>
            <div className="space-y-2"><Label>Data Nascimento</Label><Input type="date" value={newForm.dataNascimento} onChange={e => setNewForm(p => ({ ...p, dataNascimento: e.target.value }))} /></div>
            {(newForm.unidade === "UTI Neonatal" || newForm.unidade === "Alojamento Conjunto") && (
              <>
                <Separator />
                <p className="text-sm font-semibold text-foreground">Dados Neonatais</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Peso do RN ao Nascer (g)</Label><Input type="number" value={newForm.pesoRN} onChange={e => setNewForm(p => ({ ...p, pesoRN: e.target.value }))} placeholder="Ex: 3200" /></div>
                  <div className="space-y-2"><Label>Diagnóstico</Label><Input value={newForm.diagnosticoRN} onChange={e => setNewForm(p => ({ ...p, diagnosticoRN: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Parto</Label>
                    <Select value={newForm.tipoParto} onValueChange={v => setNewForm(p => ({ ...p, tipoParto: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cesárea">Cesárea</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bolsa Rota</Label>
                    <div className="flex items-center gap-2">
                      <Input type="number" value={newForm.bolsaRotaH} onChange={e => setNewForm(p => ({ ...p, bolsaRotaH: e.target.value }))} placeholder="h" className="w-20" />
                      <span className="text-sm text-muted-foreground">h</span>
                      <Input type="number" value={newForm.bolsaRotaDias} onChange={e => setNewForm(p => ({ ...p, bolsaRotaDias: e.target.value }))} placeholder="dias" className="w-20" />
                      <span className="text-sm text-muted-foreground">dias</span>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Apgar</Label><Input value={newForm.apgar} onChange={e => setNewForm(p => ({ ...p, apgar: e.target.value }))} placeholder="Ex: 8/9" /></div>
                  <div className="space-y-2"><Label>Idade Gestacional</Label><Input value={newForm.idadeGestacional} onChange={e => setNewForm(p => ({ ...p, idadeGestacional: e.target.value }))} placeholder="Ex: 38 semanas" /></div>
                </div>
                <div className="space-y-2"><Label>Data da Internação</Label><Input type="date" value={newForm.dataInternacaoRN} onChange={e => setNewForm(p => ({ ...p, dataInternacaoRN: e.target.value }))} /></div>
                <Separator />
                <div className="space-y-2">
                  <Label className="font-medium">Infecção Materna</Label>
                  <Select value={newForm.infeccaoMaterna} onValueChange={v => setNewForm(p => ({ ...p, infeccaoMaterna: v, irasTransplacentaria: v === "Não" ? "" : p.irasTransplacentaria }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {newForm.infeccaoMaterna === "Sim" && (
                  <div className="space-y-2">
                    <Label className="font-medium">IRAS Transplacentária</Label>
                    <Select value={newForm.irasTransplacentaria} onValueChange={v => setNewForm(p => ({ ...p, irasTransplacentaria: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {["Herpes simples", "Toxoplasmose", "Rubéola", "Citomegalovírus", "Sífilis", "Hepatite B", "Vírus HIV"].map(item => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
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
            <div className="space-y-2">
              <Label>Unidade</Label>
              <Select value={editIdForm.unidade} onValueChange={v => setEditIdForm(p => ({ ...p, unidade: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                <SelectContent>
                  {["UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica", "Contêiner", "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto"].map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            {(editIdForm.unidade === "UTI Neonatal" || editIdForm.unidade === "Alojamento Conjunto") && (
              <>
                <div className="sm:col-span-2"><Separator className="my-2" /></div>
                <p className="sm:col-span-2 text-sm font-semibold text-foreground">Dados Neonatais</p>
                <div className="space-y-2"><Label>Peso do RN ao Nascer (g)</Label><Input type="number" value={neonatalDetail.pesoRN} onChange={e => setNeonatalDetail(p => ({ ...p, pesoRN: e.target.value }))} placeholder="Ex: 3200" /></div>
                <div className="space-y-2"><Label>Diagnóstico RN</Label><Input value={neonatalDetail.diagnosticoRN} onChange={e => setNeonatalDetail(p => ({ ...p, diagnosticoRN: e.target.value }))} /></div>
                <div className="space-y-2">
                  <Label>Parto</Label>
                  <Select value={neonatalDetail.tipoParto} onValueChange={v => setNeonatalDetail(p => ({ ...p, tipoParto: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cesárea">Cesárea</SelectItem>
                      <SelectItem value="Normal">Normal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bolsa Rota</Label>
                  <div className="flex items-center gap-2">
                    <Input type="number" value={neonatalDetail.bolsaRotaH} onChange={e => setNeonatalDetail(p => ({ ...p, bolsaRotaH: e.target.value }))} placeholder="h" className="w-20" />
                    <span className="text-sm text-muted-foreground">h</span>
                    <Input type="number" value={neonatalDetail.bolsaRotaDias} onChange={e => setNeonatalDetail(p => ({ ...p, bolsaRotaDias: e.target.value }))} placeholder="dias" className="w-20" />
                    <span className="text-sm text-muted-foreground">dias</span>
                  </div>
                </div>
                <div className="space-y-2"><Label>Apgar</Label><Input value={neonatalDetail.apgar} onChange={e => setNeonatalDetail(p => ({ ...p, apgar: e.target.value }))} placeholder="Ex: 8/9" /></div>
                <div className="space-y-2"><Label>Idade Gestacional</Label><Input value={neonatalDetail.idadeGestacional} onChange={e => setNeonatalDetail(p => ({ ...p, idadeGestacional: e.target.value }))} placeholder="Ex: 38 semanas" /></div>
                <div className="space-y-2"><Label>Data da Internação</Label><Input type="date" value={neonatalDetail.dataInternacaoRN} onChange={e => setNeonatalDetail(p => ({ ...p, dataInternacaoRN: e.target.value }))} /></div>
                <div className="sm:col-span-2"><Separator className="my-2" /></div>
                <div className="space-y-2">
                  <Label className="font-medium">Infecção Materna</Label>
                  <Select value={infeccaoMaternaDetail} onValueChange={v => { setInfeccaoMaternaDetail(v); if (v === "Não") setIrasTransplacentariaDetail(""); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Sim">Sim</SelectItem>
                      <SelectItem value="Não">Não</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {infeccaoMaternaDetail === "Sim" && (
                  <div className="space-y-2">
                    <Label className="font-medium">IRAS Transplacentária</Label>
                    <Select value={irasTransplacentariaDetail} onValueChange={v => setIrasTransplacentariaDetail(v)}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {["Herpes simples", "Toxoplasmose", "Rubéola", "Citomegalovírus", "Sífilis", "Hepatite B", "Vírus HIV"].map(item => (
                          <SelectItem key={item} value={item}>{item}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditIdOpen(false)}>Cancelar</Button>
            <Button onClick={saveEditId}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── VIEW PATIENT MODAL ───────────────────────────── */}
      <Dialog open={viewPatientOpen} onOpenChange={v => { if (!v) { setViewPatientOpen(false); setViewPatientId(null); } }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {viewPatient && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-primary" />
                  {viewPatient.nome}
                  <Badge variant={viewPatient.status === "active" ? "default" : "secondary"}>
                    {viewPatient.status === "active" ? "Internado" : "Alta"}
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Identificação</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <Field label="Prontuário" value={viewPatient.prontuario} />
                    <Field label="Sexo" value={viewPatient.sexo === "M" ? "Masculino" : viewPatient.sexo === "F" ? "Feminino" : "—"} />
                    <Field label="Nascimento" value={`${viewPatient.dataNascimento} (${calcAge(viewPatient.dataNascimento)})`} />
                    <Field label="Unidade" value={viewPatient.unidade} />
                    <Field label="Leito" value={viewPatient.leito} />
                    <Field label="Origem" value={viewPatient.origem} />
                    <Field label="Admissão" value={viewPatient.dataAdmissao} />
                    <Field label="Int. Hospitalar" value={viewPatient.dataInternacaoHospitalar} />
                    <Field label="Dias Internação" value={`${daysFromDate(viewPatient.dataInternacaoHospitalar)} dias`} />
                    <Field label="Int. CTI" value={viewPatient.dataInternacaoCTI || "—"} />
                    <Field label="Dias CTI" value={viewPatient.dataInternacaoCTI ? `${daysFromDate(viewPatient.dataInternacaoCTI)} dias` : "—"} />
                    <Field label="Especialidade" value={viewPatient.especialidade} />
                    <Field label="Diagnóstico" value={viewPatient.diagnostico} className="sm:col-span-2" />
                    <Field label="Doenças de base" value={viewPatient.doencasBase} className="sm:col-span-2" />
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Syringe className="h-4 w-4 text-primary" />Exames ({labPanel.length})</h4>
                  {labPanel.length > 0 ? (
                    <div className="overflow-x-auto rounded border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50"><tr>
                          <th className="text-left p-2">Exame</th><th className="text-left p-2">Data</th>
                          <th className="text-left p-2">Microrganismo</th><th className="text-left p-2">Sensibilidade</th>
                          <th className="text-left p-2">MDR</th>
                        </tr></thead>
                        <tbody>
                          {labPanel.map((l, i) => (
                            <tr key={i} className={`border-t ${l.mdr ? "bg-destructive/5" : ""}`}>
                              <td className="p-2">{l.exame}</td><td className="p-2">{l.data}</td>
                              <td className="p-2 font-medium">{l.microrganismo}</td><td className="p-2">{l.sensibilidade}</td>
                              <td className="p-2">{l.mdr ? <Badge variant="destructive" className="text-[10px]">MDR</Badge> : <Badge variant="outline" className="text-[10px]">Sensível</Badge>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-xs text-muted-foreground">Nenhum exame registrado.</p>}
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" />Dispositivos</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {Object.entries(dispositivos).filter(([, v]) => v && v !== "Não").map(([k, v]) => (
                      <div key={k} className="p-2 rounded bg-muted/50 border">
                        <span className="text-muted-foreground">{k}:</span> <span className="font-medium">{v}</span>
                      </div>
                    ))}
                    {Object.entries(dispositivos).filter(([, v]) => v && v !== "Não").length === 0 && (
                      <p className="text-muted-foreground col-span-3">Nenhum dispositivo registrado.</p>
                    )}
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" />IRAS</h4>
                  <p className="text-sm">{iras.temIras ? `IRAS: ${iras.temIras}` : "Não preenchido"}</p>
                  {iras.temIras === "Sim" && <p className="text-xs text-muted-foreground mt-1">Qtd: {iras.numeroIras || "—"} | {iras.quaisIras || "—"}</p>}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── DISCHARGE CONFIRM DIALOG (list view) ──────────── */}
      <Dialog open={dischargeConfirmOpen} onOpenChange={setDischargeConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Confirmar Alta</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja dar alta ao paciente <strong className="text-foreground">{patients.find(p => p.id === dischargePatientId)?.nome}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDischargeConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => { setDischargeConfirmOpen(false); setDischargeOpen(true); }}>Sim, continuar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dischargeOpen} onOpenChange={setDischargeOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tipo de Alta</DialogTitle></DialogHeader>
          <Select value={dischargeType} onValueChange={setDischargeType}>
            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
            <SelectContent>{tiposAlta.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDischargeOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDischarge}>Confirmar Alta</Button>
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
