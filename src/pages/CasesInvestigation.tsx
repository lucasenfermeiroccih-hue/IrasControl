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
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Plus, Search, AlertTriangle, CheckCircle, Clock, Eye, Pencil, Loader2, Download, Info,
  FileText, Syringe, ShieldAlert, ClipboardList, User, Save, CheckCircle2, XCircle, Trash2,
  ChevronLeft, ChevronRight, Stethoscope, Activity
} from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

// ─── Types & Config ────────────────────────────────────────────
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
  patient_id?: string | null;
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

const topografias: Record<string, string[]> = {
  "IPCS-CVC": ["Bacteremia primária confirmada laboratorialmente", "Bacteremia clínica (IPCS-CL)", "Infecção de corrente sanguínea associada a CVC"],
  "ITU-SVD": ["ITU sintomática associada a SVD", "Bacteriúria assintomática (não notificável)", "ITU recorrente associada a cateter"],
  "PAV": ["Pneumonia associada a ventilação mecânica (PAVMI)", "Traqueobronquite associada a VM"],
  "ISC": ["ISC superficial", "ISC profunda", "ISC de órgão/espaço"],
  "Surto": ["Surto confirmado", "Surto suspeito / em investigação"],
  "Óbito relacionado a IRAS": ["Óbito direto", "Óbito contribuinte"],
  "Colonização MR": ["Colonização por MRSA", "Colonização por KPC", "Colonização por VRE", "Colonização por outro MR"],
};

const categorias = ["Infecção hospitalar", "Infecção comunitária", "Infecção associada a dispositivo", "Colonização", "Contaminação"];
const criteriosIniciais = ["Clínico", "Laboratorial", "Clínico + Laboratorial", "Imagem", "Outro"];

const criteriosDiagPorTipo: Record<string, string[]> = {
  "IPCS-CVC": ["Hemocultura positiva (patógeno reconhecido)", "≥2 hemoculturas positivas (contaminante comum)", "Febre >38°C ou calafrios", "Sinais flogísticos no sítio do cateter", "Sem outro foco infeccioso identificado"],
  "ITU-SVD": ["Urocultura ≥100.000 UFC/mL", "Febre >38°C", "Disúria / urgência (se sem SVD)", "Dor suprapúbica", "Piúria (>10 leucócitos/campo)"],
  "PAV": ["Infiltrado pulmonar novo/progressivo", "Febre >38°C", "Secreção traqueal purulenta", "Leucocitose ou leucopenia", "Piora da relação PaO2/FiO2", "Cultura quantitativa de secreção traqueal positiva"],
  "ISC": ["Drenagem purulenta da incisão", "Cultura positiva do sítio cirúrgico", "Dor ou sensibilidade local", "Hiperemia ou calor local", "Deiscência espontânea", "Abscesso identificado em reoperação ou exame de imagem"],
  default: ["Febre > 38°C por mais de 24h", "Leucocitose > 12.000/mm³", "Hemocultura positiva", "PCR ou Procalcitonina elevada", "Instabilidade hemodinâmica sem outra causa"],
};

const fatoresRisco = [
  "Idade > 65 anos", "Diabetes mellitus", "Imunossupressão", "Neoplasia", "Cirrose hepática",
  "Insuficiência renal crônica", "Tempo de internação > 7 dias", "Uso prévio de antibióticos",
  "Ventilação mecânica prolongada", "Cateter venoso central > 5 dias", "Sonda vesical > 5 dias",
  "Nutrição parenteral", "Cirurgia recente", "Múltiplas comorbidades",
];

const checklistItems = [
  "Dados de identificação verificados",
  "Cronologia de sintomas registrada",
  "Culturas coletadas e resultados revisados",
  "Dispositivos invasivos verificados e documentados",
  "Fatores de risco listados",
  "Critérios diagnósticos aplicados",
  "Classificação definida (IRAS vs Colonização vs Contaminação)",
  "Medidas de controle iniciadas",
  "Comunicação à equipe assistencial realizada",
  "Conclusão epidemiológica registrada",
];

const contaminacaoPotenciais = ["Limpa", "Potencialmente contaminada", "Contaminada", "Infectada"];

const DETAIL_STEPS = [
  { key: "identificacao", label: "Identificação", icon: FileText },
  { key: "classificacao", label: "Classificação", icon: ClipboardList },
  { key: "ocorrencia", label: "Ocorrência", icon: Activity },
  { key: "criterios", label: "Critérios Diag.", icon: Stethoscope },
  { key: "laboratorio", label: "Laboratório", icon: Syringe },
  { key: "dispositivos", label: "Dispositivos", icon: ShieldAlert },
  { key: "cirurgia", label: "Cirurgias", icon: Activity },
  { key: "checklist", label: "Checklist", icon: CheckCircle2 },
  { key: "conclusao", label: "Conclusão", icon: CheckCircle },
];

// ─── Helper ───────────────────────────────────────────────────
function daysFromDate(d: string) {
  if (!d) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));
}
function calcAge(birth: string) {
  if (!birth) return "—";
  return Math.floor((Date.now() - new Date(birth).getTime()) / (365.25 * 86400000)) + " anos";
}

// ─── Component ────────────────────────────────────────────────
const CasesInvestigation = () => {
  const location = useLocation();
  const navState = location.state as { fromMonitoring?: boolean; data?: any } | null;
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();

  // ── Existing list state ──
  const [cases, setCases] = useState<InfectionCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailCase, setDetailCase] = useState<InfectionCase | null>(null);
  const [filterStatus, setFilterStatus] = useState("todos");
  const [search, setSearch] = useState("");
  const [filterMes, setFilterMes] = useState("Todos");
  const [filterAno, setFilterAno] = useState(String(new Date().getFullYear()));
  const [filterSetor, setFilterSetor] = useState("Todos");
  const [filterEvento, setFilterEvento] = useState("Todos");
  const [editingCase, setEditingCase] = useState<InfectionCase | null>(null);
  const [saving, setSaving] = useState(false);
  const [prefilledBanner, setPrefilledBanner] = useState(false);

  // ── Quick create form (existing dialog) ──
  const [form, setForm] = useState({
    paciente: "", prontuario: "", setor: "", evento: "", classificacao: "",
    dispositivos: [] as string[], observacoes: "",
  });

  // ── Full investigation detail view ──
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailStep, setDetailStep] = useState(0);

  // 1. Identificação
  const [ident, setIdent] = useState({
    nome: "", prontuario: "", nascimento: "", sexo: "", admissao: "",
    unidade: "", leito: "", especialidade: "", diagnostico: "", origem: "",
  });

  // 3. Classificação
  const [classif, setClassif] = useState({
    tipoEvento: "", topografia: "", categoria: "", criterioInicial: "",
  });

  // 4. Status/Fase
  const [investigationStatus, setInvestigationStatus] = useState("investigating");
  const [statusHistory, setStatusHistory] = useState<{ status: string; user: string; date: string; justificativa: string }[]>([]);
  const [statusJustificativa, setStatusJustificativa] = useState("");

  // 5. Ocorrência
  const [ocorrencia, setOcorrencia] = useState({
    unidadeSetor: "", leito: "", dataSintomas: "", dataSuspeita: "",
    dataNotificacao: "", origemNotificacao: "",
  });

  // 6. Critérios Diagnósticos
  const [criteriosSelecionados, setCriteriosSelecionados] = useState<string[]>([]);
  const [justificativaClinica, setJustificativaClinica] = useState("");

  // 7. Lab
  const [labResults, setLabResults] = useState<{ exame: string; data: string; microrganismo: string; sensibilidade: string; mdr: boolean }[]>([]);
  const [newLab, setNewLab] = useState({ exame: "", data: "", microrganismo: "", sensibilidade: "", mdr: false });

  // 8. Dispositivos
  const [dispInvasivos, setDispInvasivos] = useState({
    cvcInsercao: "", cvcRetirada: "", svuInsercao: "", svuRetirada: "", vmInsercao: "", vmRetirada: "",
  });
  const [fatoresRiscoSel, setFatoresRiscoSel] = useState<string[]>([]);

  // 9. Cirurgias
  const [cirurgia, setCirurgia] = useState({
    procedimento: "", dataCirurgia: "", contaminacao: "", implante: "Não", profilaxia: "", observacoes: "",
  });

  // 10. Responsável
  const [responsavel, setResponsavel] = useState("");

  // 11. Checklist
  const [checklistDone, setChecklistDone] = useState<string[]>([]);

  // 12. Conclusão
  const [conclusao, setConclusao] = useState({
    classificacaoFinal: "", conclusaoEpidemiologica: "", condutas: "", desfecho: "", vinculoSurto: "",
  });

  // Protocol
  const [protocolo, setProtocolo] = useState("");

  // ── Prefill from monitoring ──
  useEffect(() => {
    if (navState?.fromMonitoring && navState.data) {
      const d = navState.data;
      const obsLines: string[] = [];
      if (d.diagnostico) obsLines.push(`Diagnóstico: ${d.diagnostico}`);
      if (d.doencasBase) obsLines.push(`Doenças de base: ${d.doencasBase}`);
      if (d.motivoInternacao) obsLines.push(`Motivo internação: ${d.motivoInternacao}`);
      if (d.especialidade) obsLines.push(`Especialidade: ${d.especialidade}`);

      if (d.dispositivos) {
        const dispParts = Object.entries(d.dispositivos as Record<string, string>)
          .filter(([, v]) => v && v !== "Não").map(([k, v]) => `${k}: ${v}`);
        if (dispParts.length) obsLines.push(`\nDispositivos: ${dispParts.join(", ")}`);
      }
      if (d.dispInvasivos) {
        const invParts = Object.entries(d.dispInvasivos as Record<string, string>)
          .filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
        if (invParts.length) obsLines.push(`Dispositivos invasivos: ${invParts.join(", ")}`);
      }
      if (d.labPanel && d.labPanel.length > 0) {
        const labLines = d.labPanel.map((e: any) =>
          `${e.exame} (${e.data}) — ${e.microrganismo} | ${e.sensibilidade}${e.mdr ? " [MDR]" : ""}`
        );
        obsLines.push(`\nExames:\n${labLines.join("\n")}`);
      }
      if (d.evolucao) {
        const evParts = Object.entries(d.evolucao as Record<string, string>).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
        if (evParts.length) obsLines.push(`\nEvolução:\n${evParts.join("\n")}`);
      }
      if (d.sinaisVitais) {
        const svParts = Object.entries(d.sinaisVitais as Record<string, string>).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`);
        if (svParts.length) obsLines.push(`Sinais vitais: ${svParts.join(", ")}`);
      }

      const deviceTypes: string[] = [];
      if (d.dispositivos?.cvc && d.dispositivos.cvc !== "Não") deviceTypes.push("cvc");
      if (d.dispositivos?.cateterVesical === "Sim") deviceTypes.push("svu");
      if (d.dispositivos?.ventilacao === "Sim") deviceTypes.push("vm");

      setForm({
        paciente: d.paciente || "", prontuario: d.prontuario || "", setor: d.setor || "",
        evento: "", classificacao: "Em investigação", dispositivos: deviceTypes,
        observacoes: obsLines.join("\n"),
      });

      // Also prefill the detail investigation form
      setIdent({
        nome: d.paciente || "", prontuario: d.prontuario || "", nascimento: d.dataNascimento || "",
        sexo: d.sexo || "", admissao: d.dataInternacao || "", unidade: d.setor || "",
        leito: d.leito || "", especialidade: d.especialidade || "", diagnostico: d.diagnostico || "",
        origem: "",
      });
      setOcorrencia(prev => ({ ...prev, unidadeSetor: d.setor || "", leito: d.leito || "" }));
      if (d.labPanel) setLabResults(d.labPanel);
      if (d.dispInvasivos) {
        setDispInvasivos({
          cvcInsercao: d.dispInvasivos.cvcInsercao || "", cvcRetirada: d.dispInvasivos.cvcRetirada || "",
          svuInsercao: d.dispInvasivos.svuInsercao || "", svuRetirada: d.dispInvasivos.svuRetirada || "",
          vmInsercao: d.dispInvasivos.vmInsercao || "", vmRetirada: d.dispInvasivos.vmRetirada || "",
        });
      }
      if (d.criteriosSelecionados) setCriteriosSelecionados(d.criteriosSelecionados);

      setEditingCase(null);
      setDialogOpen(true);
      setPrefilledBanner(true);
      window.history.replaceState({}, document.title);
    }
  }, [navState]);

  // ── Supabase fetch ──
  const fetchCases = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("infection_cases")
      .select("*, patient:patients(full_name, medical_record, sector)")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false });
    if (!error && data) setCases(data.map(d => ({ ...d, patient: d.patient as any })));
    setLoading(false);
  };

  useEffect(() => { if (hospitalId) fetchCases(); }, [hospitalId]);

  const handleDeletePatient = async (c: InfectionCase) => {
    const nome = c.patient?.full_name || "este paciente";
    if (!confirm(`Excluir ${nome} e todos os casos/dados relacionados? Esta ação não pode ser desfeita.`)) return;
    try {
      // Remove case dependencies and the case itself
      await supabase.from("case_notes").delete().eq("case_id", c.id);
      await supabase.from("infection_cases").delete().eq("id", c.id);
      // If linked to a patient, cascade-delete patient-related data and the patient
      if (c.patient_id) {
        await supabase.from("precautions").delete().eq("patient_id", c.patient_id);
        await supabase.from("lab_results").delete().eq("patient_id", c.patient_id);
        await supabase.from("antimicrobial_prescriptions").delete().eq("patient_id", c.patient_id);
        await supabase.from("infection_cases").delete().eq("patient_id", c.patient_id);
        const { error: pErr } = await supabase.from("patients").delete().eq("id", c.patient_id);
        if (pErr) throw pErr;
      }
      toast.success("Paciente excluído");
      fetchCases();
    } catch (err: any) {
      toast.error("Erro ao excluir: " + (err?.message || ""));
    }
  };


  const mesesNomes = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const anosDisponiveis = Array.from(new Set(cases.map(c => c.detection_date ? new Date(c.detection_date).getFullYear() : null).filter(Boolean) as number[]))
    .sort((a, b) => b - a)
    .map(String);
  if (!anosDisponiveis.includes(String(new Date().getFullYear()))) anosDisponiveis.unshift(String(new Date().getFullYear()));

  const filtered = cases.filter((c) => {
    if (filterStatus !== "todos" && c.status !== filterStatus) return false;
    if (filterEvento !== "Todos" && c.infection_type !== filterEvento) return false;
    if (filterSetor !== "Todos" && c.patient?.sector !== filterSetor) return false;
    if (c.detection_date) {
      const d = new Date(c.detection_date);
      if (filterAno !== "Todos" && String(d.getFullYear()) !== filterAno) return false;
      if (filterMes !== "Todos" && mesesNomes[d.getMonth()] !== filterMes) return false;
    }
    const name = c.patient?.full_name || "";
    const record = c.patient?.medical_record || "";
    return !search || name.toLowerCase().includes(search.toLowerCase()) || record.toLowerCase().includes(search.toLowerCase());
  });

  const clearFilters = () => {
    setFilterMes("Todos"); setFilterAno(String(new Date().getFullYear()));
    setFilterSetor("Todos"); setFilterEvento("Todos");
  };

  const kpis = {
    abertos: cases.filter(c => c.status === "open").length,
    emInvestigacao: cases.filter(c => c.status === "investigating").length,
    confirmados: cases.filter(c => c.status === "confirmed").length,
    encerrados: cases.filter(c => c.status === "closed" || c.status === "discarded").length,
  };

  const openNew = () => {
    setEditingCase(null);
    setPrefilledBanner(false);
    setForm({ paciente: "", prontuario: "", setor: "", evento: "", classificacao: "", dispositivos: [], observacoes: "" });
    setDialogOpen(true);
  };

  const openEdit = (c: InfectionCase) => {
    setEditingCase(c);
    setForm({
      paciente: c.patient?.full_name || "", prontuario: c.patient?.medical_record || "",
      setor: c.patient?.sector || "", evento: c.infection_type || "",
      classificacao: c.infection_site || "", dispositivos: c.device_type ? [c.device_type] : [],
      observacoes: c.notes || "",
    });
    setDetailCase(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.paciente || !form.setor || !form.evento) { toast.error("Preencha paciente, setor e evento."); return; }
    if (!hospitalId || !userId) return;
    setSaving(true);
    if (editingCase) {
      const { error } = await supabase.from("infection_cases").update({
        infection_type: form.evento, infection_site: form.classificacao,
        device_related: form.dispositivos.length > 0, device_type: form.dispositivos[0] as any || null,
        notes: form.observacoes,
      }).eq("id", editingCase.id);
      if (error) toast.error("Erro ao atualizar caso"); else { toast.success("Caso atualizado!"); fetchCases(); }
    } else {
      const { data: patient, error: patientError } = await supabase.from("patients").insert({
        full_name: form.paciente, medical_record: form.prontuario || null, sector: form.setor,
        hospital_id: hospitalId, created_by: userId,
      }).select().single();
      if (patientError) { toast.error("Erro ao criar paciente: " + patientError.message); setSaving(false); return; }
      const { error } = await supabase.from("infection_cases").insert({
        hospital_id: hospitalId, patient_id: patient.id, infection_type: form.evento,
        infection_site: form.classificacao, device_related: form.dispositivos.length > 0,
        device_type: form.dispositivos[0] as any || null, notes: form.observacoes,
        created_by: userId, status: "open" as const,
      });
      if (error) toast.error("Erro ao criar caso: " + error.message); else { toast.success("Caso registrado!"); fetchCases(); }
    }
    setSaving(false);
    setDialogOpen(false);
  };

  const handleStatusChange = async (caseId: string, newStatus: CaseStatus) => {
    const updates: any = { status: newStatus };
    if (newStatus === "confirmed") updates.confirmation_date = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("infection_cases").update(updates).eq("id", caseId);
    if (error) { toast.error("Erro ao atualizar status"); } else {
      toast.success(`Status: ${statusConfig[newStatus].label}`);
      fetchCases();
      if (detailCase?.id === caseId) setDetailCase(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleExportPDF = async () => {
    toast.info("Gerando PDF...");
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: { type: "cases", hospitalId, data: {
          cases: cases.map(c => ({ id: c.case_number || c.id.slice(0, 8), paciente: c.patient?.full_name || "—", setor: c.patient?.sector || "—", evento: c.infection_type || "—", status: statusConfig[c.status]?.label || c.status, data: c.detection_date })), kpis,
        }},
      });
      if (error) throw error;
      if (data?.pdf) {
        const byteArray = Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0));
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `casos-investigacao-${new Date().toISOString().split("T")[0]}.pdf`; a.click(); URL.revokeObjectURL(url);
        toast.success("PDF exportado!");
      }
    } catch { toast.error("Erro ao gerar PDF"); }
  };

  // ── Open full investigation for a case ──
  const openFullInvestigation = (c: InfectionCase) => {
    setProtocolo(c.case_number || "INV-" + c.id.slice(0, 8));
    setIdent({
      nome: c.patient?.full_name || "", prontuario: c.patient?.medical_record || "",
      nascimento: "", sexo: "", admissao: c.detection_date, unidade: c.patient?.sector || "",
      leito: "", especialidade: "", diagnostico: c.infection_type || "", origem: "",
    });
    setClassif({ tipoEvento: c.infection_type || "", topografia: "", categoria: "", criterioInicial: "" });
    setInvestigationStatus(c.status);
    setOcorrencia(prev => ({ ...prev, unidadeSetor: c.patient?.sector || "" }));
    setDetailStep(0);
    setDetailOpen(true);
    setDetailCase(null);
  };

  // ── New notification (quick) ──
  const handleNewNotification = () => {
    const proto = "NOT-" + Date.now().toString().slice(-8);
    setProtocolo(proto);
    setIdent({ nome: "", prontuario: "", nascimento: "", sexo: "", admissao: "", unidade: "", leito: "", especialidade: "", diagnostico: "", origem: "" });
    setClassif({ tipoEvento: "", topografia: "", categoria: "", criterioInicial: "" });
    setInvestigationStatus("open");
    setStatusHistory([]);
    setOcorrencia({ unidadeSetor: "", leito: "", dataSintomas: "", dataSuspeita: "", dataNotificacao: new Date().toISOString().slice(0, 10), origemNotificacao: "" });
    setCriteriosSelecionados([]);
    setJustificativaClinica("");
    setLabResults([]);
    setDispInvasivos({ cvcInsercao: "", cvcRetirada: "", svuInsercao: "", svuRetirada: "", vmInsercao: "", vmRetirada: "" });
    setFatoresRiscoSel([]);
    setCirurgia({ procedimento: "", dataCirurgia: "", contaminacao: "", implante: "Não", profilaxia: "", observacoes: "" });
    setResponsavel("");
    setChecklistDone([]);
    setConclusao({ classificacaoFinal: "", conclusaoEpidemiologica: "", condutas: "", desfecho: "", vinculoSurto: "" });
    setDetailStep(0);
    setDetailOpen(true);
  };

  // Status change with history
  const changeInvestigationStatus = (newStatus: string) => {
    if (!statusJustificativa.trim() && newStatus !== investigationStatus) {
      toast.error("Informe a justificativa da alteração de status");
      return;
    }
    setStatusHistory(prev => [...prev, {
      status: newStatus, user: "Usuário atual", date: new Date().toLocaleString("pt-BR"), justificativa: statusJustificativa,
    }]);
    setInvestigationStatus(newStatus);
    setStatusJustificativa("");
    toast.success(`Status alterado para: ${newStatus}`);
  };

  // Save investigation draft
  const handleSaveDraft = () => {
    toast.success(`Rascunho da investigação ${protocolo} salvo!`);
  };

  // Finalize investigation
  const handleFinalize = () => {
    if (!conclusao.classificacaoFinal) { toast.error("Classificação final é obrigatória"); setDetailStep(8); return; }
    if (!conclusao.conclusaoEpidemiologica) { toast.error("Conclusão epidemiológica é obrigatória"); setDetailStep(8); return; }
    if (!conclusao.condutas) { toast.error("Condutas são obrigatórias"); setDetailStep(8); return; }
    if (!conclusao.desfecho) { toast.error("Desfecho é obrigatório"); setDetailStep(8); return; }
    if (!justificativaClinica.trim()) { toast.error("Justificativa clínica é obrigatória"); setDetailStep(3); return; }
    if (!responsavel.trim()) { toast.error("Defina o responsável pela investigação"); return; }

    const incompleteChecklist = checklistItems.filter(item => !checklistDone.includes(item));
    if (incompleteChecklist.length > 0) {
      toast.error(`Complete o checklist (${incompleteChecklist.length} itapens pendentes)`);
      setDetailStep(7);
      return;
    }

    setInvestigationStatus("closed");
    setStatusHistory(prev => [...prev, {
      status: "closed", user: responsavel || "Usuário atual",
      date: new Date().toLocaleString("pt-BR"), justificativa: "Investigação finalizada e encerrada",
    }]);
    toast.success(`Investigação ${protocolo} finalizada e encerrada!`);
    setDetailOpen(false);
  };

  const cvcDays = dispInvasivos.cvcInsercao ? daysFromDate(dispInvasivos.cvcInsercao) : null;
  const svuDays = dispInvasivos.svuInsercao ? daysFromDate(dispInvasivos.svuInsercao) : null;
  const vmDays = dispInvasivos.vmInsercao ? daysFromDate(dispInvasivos.vmInsercao) : null;

  const currentCriterios = criteriosDiagPorTipo[classif.tipoEvento] || criteriosDiagPorTipo.default;
  const currentTopografias = topografias[classif.tipoEvento] || [];
  const detailProgress = ((detailStep + 1) / DETAIL_STEPS.length) * 100;

  if (ctxLoading || loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  // If investigation panel is open, show it full-page instead of the list
  if (detailOpen) {
    return (
      <div className="pb-24">
        {/* ── Sticky Patient Header ── */}
        <div className="sticky top-0 z-10 bg-background border-b p-4 -mx-4 md:-mx-6 -mt-4 md:-mt-6 px-4 md:px-6">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDetailOpen(false)}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <User className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-foreground text-lg">{ident.nome || "Novo Paciente"}</h2>
              <Badge variant="outline" className="font-mono text-xs">{protocolo}</Badge>
              <Badge className={investigationStatus === "closed" ? "bg-muted text-muted-foreground" : investigationStatus === "investigating" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"}>
                {investigationStatus === "open" ? "Notificado" : investigationStatus === "investigating" ? "Em Investigação" : investigationStatus === "confirmed" ? "Confirmado" : investigationStatus === "closed" ? "Encerrado" : investigationStatus}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-1 text-xs ml-10">
            <div><span className="text-muted-foreground">Prontuário:</span> <span className="font-medium">{ident.prontuario || "—"}</span></div>
            <div><span className="text-muted-foreground">Nasc.:</span> <span className="font-medium">{ident.nascimento ? `${ident.nascimento} (${calcAge(ident.nascimento)})` : "—"}</span></div>
            <div><span className="text-muted-foreground">Sexo:</span> <span className="font-medium">{ident.sexo || "—"}</span></div>
            <div><span className="text-muted-foreground">Admissão:</span> <span className="font-medium">{ident.admissao || "—"}</span></div>
            <div><span className="text-muted-foreground">Unidade:</span> <span className="font-medium">{ident.unidade || "—"}</span></div>
            <div><span className="text-muted-foreground">Leito:</span> <span className="font-medium">{ident.leito || "—"}</span></div>
            <div><span className="text-muted-foreground">Espec.:</span> <span className="font-medium">{ident.especialidade || "—"}</span></div>
            <div><span className="text-muted-foreground">Origem:</span> <span className="font-medium">{ident.origem || "—"}</span></div>
          </div>
          {/* Step nav */}
          <div className="mt-3 ml-10">
            <Progress value={detailProgress} className="h-1.5 mb-2" />
            <div className="flex gap-1 overflow-x-auto pb-1">
              {DETAIL_STEPS.map((s, i) => (
                <Button key={s.key} variant={i === detailStep ? "default" : "ghost"} size="sm"
                  className={`text-xs shrink-0 gap-1.5 h-8 ${i === detailStep ? "" : "text-muted-foreground"}`}
                  onClick={() => setDetailStep(i)}>
                  <s.icon className="h-3.5 w-3.5" />{s.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4 max-w-5xl">
            {detailStep === 0 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" />Identificação do Paciente</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    { label: "Nome *", key: "nome" }, { label: "Prontuário", key: "prontuario" },
                    { label: "Data Nascimento", key: "nascimento", type: "date" }, { label: "Sexo", key: "sexo", select: ["M", "F"] },
                    { label: "Data Admissão", key: "admissao", type: "date" }, { label: "Unidade / Setor", key: "unidade", select: setores },
                    { label: "Leito", key: "leito" }, { label: "Especialidade", key: "especialidade" },
                    { label: "Diagnóstico", key: "diagnostico" }, { label: "Origem", key: "origem" },
                  ].map(f => (
                    <div key={f.key} className="space-y-1">
                      <Label className="text-xs">{f.label}</Label>
                      {f.select ? (
                        <Select value={(ident as any)[f.key]} onValueChange={v => setIdent(p => ({ ...p, [f.key]: v }))}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>{f.select.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Input type={f.type || "text"} value={(ident as any)[f.key]} onChange={e => setIdent(p => ({ ...p, [f.key]: e.target.value }))} />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ── Step 1: Classificação do Evento ── */}
            {detailStep === 1 && (
              <>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" />Classificação do Evento</CardTitle></CardHeader>
                  <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Tipo de Evento *</Label>
                      <Select value={classif.tipoEvento} onValueChange={v => setClassif(p => ({ ...p, tipoEvento: v, topografia: "" }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{eventos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Topografia / Síndrome</Label>
                      <Select value={classif.topografia} onValueChange={v => setClassif(p => ({ ...p, topografia: v }))} disabled={!classif.tipoEvento}>
                        <SelectTrigger><SelectValue placeholder={currentTopografias.length ? "Selecione" : "Selecione o tipo primeiro"} /></SelectTrigger>
                        <SelectContent>{currentTopografias.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Categoria</Label>
                      <Select value={classif.categoria} onValueChange={v => setClassif(p => ({ ...p, categoria: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Critério Inicial</Label>
                      <Select value={classif.criterioInicial} onValueChange={v => setClassif(p => ({ ...p, criterioInicial: v }))}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{criteriosIniciais.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Status e Fase da Investigação</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Novo Status</Label>
                        <Select value={investigationStatus} onValueChange={v => changeInvestigationStatus(v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Notificado / Em Triagem</SelectItem>
                            <SelectItem value="investigating">Em Investigação</SelectItem>
                            <SelectItem value="confirmed">Confirmado</SelectItem>
                            <SelectItem value="discarded">Descartado</SelectItem>
                            <SelectItem value="closed">Encerrado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Justificativa da Alteração</Label>
                        <Input value={statusJustificativa} onChange={e => setStatusJustificativa(e.target.value)} placeholder="Motivo da mudança de status" />
                      </div>
                    </div>
                    {statusHistory.length > 0 && (
                      <div className="space-y-1.5 mt-2">
                        <Label className="text-xs text-muted-foreground">Histórico de Alterações</Label>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {statusHistory.map((h, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs p-2 rounded bg-muted/50">
                              <Badge variant="outline" className="text-[10px] shrink-0">{h.status}</Badge>
                              <span className="text-muted-foreground">{h.date}</span>
                              <span className="font-medium">{h.user}</span>
                              {h.justificativa && <span className="text-muted-foreground">— {h.justificativa}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── Step 2: Dados da Ocorrência ── */}
            {detailStep === 2 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Dados da Ocorrência</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Unidade / Setor</Label>
                    <Select value={ocorrencia.unidadeSetor} onValueChange={v => setOcorrencia(p => ({ ...p, unidadeSetor: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Leito</Label><Input value={ocorrencia.leito} onChange={e => setOcorrencia(p => ({ ...p, leito: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Data Início Sintomas</Label><Input type="date" value={ocorrencia.dataSintomas} onChange={e => setOcorrencia(p => ({ ...p, dataSintomas: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Data Suspeita</Label><Input type="date" value={ocorrencia.dataSuspeita} onChange={e => setOcorrencia(p => ({ ...p, dataSuspeita: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Data Notificação</Label><Input type="date" value={ocorrencia.dataNotificacao} onChange={e => setOcorrencia(p => ({ ...p, dataNotificacao: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Origem da Notificação</Label><Input value={ocorrencia.origemNotificacao} onChange={e => setOcorrencia(p => ({ ...p, origemNotificacao: e.target.value }))} placeholder="Ex: CCIH, equipe assistencial" /></div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 3: Critérios Diagnósticos ── */}
            {detailStep === 3 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Stethoscope className="h-4 w-4 text-primary" />Critérios Diagnósticos Padronizados</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {classif.tipoEvento && <Badge variant="secondary" className="text-xs mb-2">Critérios para: {classif.tipoEvento}</Badge>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentCriterios.map(c => (
                      <div key={c} className="flex items-start gap-2 p-2 rounded border border-border hover:bg-muted/30">
                        <Checkbox checked={criteriosSelecionados.includes(c)}
                          onCheckedChange={checked => setCriteriosSelecionados(prev => checked ? [...prev, c] : prev.filter(x => x !== c))} />
                        <span className="text-sm">{c}</span>
                      </div>
                    ))}
                  </div>
                  <Separator />
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Justificativa Clínica <span className="text-destructive">*</span></Label>
                    <Textarea value={justificativaClinica} onChange={e => setJustificativaClinica(e.target.value)}
                      placeholder="Descreva a justificativa clínica para a classificação..." rows={4}
                      className={!justificativaClinica ? "border-destructive/40" : ""} />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 4: Lab ── */}
            {detailStep === 4 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><Syringe className="h-4 w-4 text-primary" />Resultados Laboratoriais e Microbiológicos</CardTitle>
                    <Button size="sm" variant="outline" className="gap-1 h-7" onClick={() => {
                      if (!newLab.exame || !newLab.microrganismo.trim()) { toast.error("Informe exame e microrganismo"); return; }
                      setLabResults(prev => [...prev, { ...newLab }]);
                      setNewLab({ exame: "", data: "", microrganismo: "", sensibilidade: "", mdr: false });
                      toast.success("Exame adicionado");
                    }}><Plus className="h-3 w-3" />Adicionar</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    <Select value={newLab.exame} onValueChange={v => setNewLab(p => ({ ...p, exame: v }))}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Exame" /></SelectTrigger>
                      <SelectContent>{["Hemocultura", "Urocultura", "Cultura sec. traqueal", "Cultura ferida op.", "Cultura ponta cateter", "Líquor", "Outro"].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                    </Select>
                    <Input className="h-8 text-xs" type="date" value={newLab.data} onChange={e => setNewLab(p => ({ ...p, data: e.target.value }))} />
                    <Input className="h-8 text-xs" placeholder="Microrganismo" value={newLab.microrganismo} onChange={e => setNewLab(p => ({ ...p, microrganismo: e.target.value }))} />
                    <Input className="h-8 text-xs" placeholder="Sensibilidade" value={newLab.sensibilidade} onChange={e => setNewLab(p => ({ ...p, sensibilidade: e.target.value }))} />
                    <div className="flex items-center gap-1.5">
                      <Checkbox checked={newLab.mdr} onCheckedChange={c => setNewLab(p => ({ ...p, mdr: !!c }))} />
                      <Label className="text-xs">MDR</Label>
                    </div>
                  </div>
                  {labResults.length > 0 && (
                    <div className="overflow-x-auto rounded border">
                      <table className="w-full text-xs">
                        <thead className="bg-muted/50"><tr>
                          <th className="text-left p-2">Exame</th><th className="text-left p-2">Data</th>
                          <th className="text-left p-2">Microrganismo</th><th className="text-left p-2">Sensibilidade</th>
                          <th className="text-left p-2">MDR</th><th className="p-2"></th>
                        </tr></thead>
                        <tbody>
                          {labResults.map((l, i) => (
                            <tr key={i} className={`border-t ${l.mdr ? "bg-destructive/5" : ""}`}>
                              <td className="p-2">{l.exame}</td><td className="p-2">{l.data}</td>
                              <td className="p-2 font-medium">{l.microrganismo}</td><td className="p-2">{l.sensibilidade}</td>
                              <td className="p-2">{l.mdr ? <Badge variant="destructive" className="text-[10px]">MDR</Badge> : <Badge variant="outline" className="text-[10px]">Sensível</Badge>}</td>
                              <td className="p-2"><Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setLabResults(prev => prev.filter((_, idx) => idx !== i))}><Trash2 className="h-3 w-3" /></Button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {labResults.some(l => l.mdr) && (
                    <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 border border-destructive/20">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                      <p className="text-xs text-destructive font-medium">Atenção: Microrganismo(s) multirresistente(s) detectado(s)!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Step 5: Dispositivos & Fatores de Risco ── */}
            {detailStep === 5 && (
              <>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" />Dispositivos Invasivos</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { label: "CVC", ins: "cvcInsercao", ret: "cvcRetirada", days: cvcDays },
                        { label: "SVD", ins: "svuInsercao", ret: "svuRetirada", days: svuDays },
                        { label: "VM", ins: "vmInsercao", ret: "vmRetirada", days: vmDays },
                      ].map(dev => (
                        <div key={dev.label} className="space-y-2 p-3 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <Label className="font-medium text-sm">{dev.label}</Label>
                            {dev.days !== null && <Badge variant={dev.days > 5 ? "destructive" : "outline"} className="text-[10px]">{dev.days}d</Badge>}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Inserção</Label>
                            <Input type="date" className="h-8 text-xs" value={(dispInvasivos as any)[dev.ins]}
                              onChange={e => setDispInvasivos(p => ({ ...p, [dev.ins]: e.target.value }))} />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-[10px] text-muted-foreground">Retirada</Label>
                            <Input type="date" className="h-8 text-xs" value={(dispInvasivos as any)[dev.ret]}
                              onChange={e => setDispInvasivos(p => ({ ...p, [dev.ret]: e.target.value }))} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3"><CardTitle className="text-base">Fatores de Risco</CardTitle></CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {fatoresRisco.map(f => (
                        <div key={f} className="flex items-center gap-2 p-2 rounded border border-border">
                          <Checkbox checked={fatoresRiscoSel.includes(f)}
                            onCheckedChange={checked => setFatoresRiscoSel(prev => checked ? [...prev, f] : prev.filter(x => x !== f))} />
                          <span className="text-sm">{f}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ── Step 6: Cirurgias ── */}
            {detailStep === 6 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4 text-primary" />Procedimentos Cirúrgicos e Exposições</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label className="text-xs">Procedimento</Label><Input value={cirurgia.procedimento} onChange={e => setCirurgia(p => ({ ...p, procedimento: e.target.value }))} /></div>
                  <div className="space-y-1"><Label className="text-xs">Data da Cirurgia</Label><Input type="date" value={cirurgia.dataCirurgia} onChange={e => setCirurgia(p => ({ ...p, dataCirurgia: e.target.value }))} /></div>
                  <div className="space-y-1">
                    <Label className="text-xs">Potencial de Contaminação</Label>
                    <Select value={cirurgia.contaminacao} onValueChange={v => setCirurgia(p => ({ ...p, contaminacao: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{contaminacaoPotenciais.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Uso de Implante</Label>
                    <Select value={cirurgia.implante} onValueChange={v => setCirurgia(p => ({ ...p, implante: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1"><Label className="text-xs">Profilaxia Antimicrobiana</Label><Input value={cirurgia.profilaxia} onChange={e => setCirurgia(p => ({ ...p, profilaxia: e.target.value }))} placeholder="Antibiótico, dose, momento" /></div>
                  <div className="sm:col-span-2 space-y-1"><Label className="text-xs">Observações</Label><Textarea value={cirurgia.observacoes} onChange={e => setCirurgia(p => ({ ...p, observacoes: e.target.value }))} rows={2} /></div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 7: Checklist ── */}
            {detailStep === 7 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" />Checklist de Investigação</CardTitle>
                    <Badge variant={checklistDone.length === checklistItems.length ? "default" : "outline"} className="text-xs">
                      {checklistDone.length}/{checklistItems.length}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Responsável pela Investigação <span className="text-destructive">*</span></Label>
                    <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome do profissional responsável"
                      className={!responsavel ? "border-destructive/40" : ""} />
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    {checklistItems.map(item => (
                      <div key={item} className="flex items-start gap-2 p-2 rounded border border-border hover:bg-muted/30">
                        <Checkbox checked={checklistDone.includes(item)}
                          onCheckedChange={checked => setChecklistDone(prev => checked ? [...prev, item] : prev.filter(x => x !== item))} />
                        <span className={`text-sm ${checklistDone.includes(item) ? "line-through text-muted-foreground" : ""}`}>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Step 8: Conclusão ── */}
            {detailStep === 8 && (
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Conclusão e Encerramento</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Classificação Final <span className="text-destructive">*</span></Label>
                      <Select value={conclusao.classificacaoFinal} onValueChange={v => setConclusao(p => ({ ...p, classificacaoFinal: v }))}>
                        <SelectTrigger className={!conclusao.classificacaoFinal ? "border-destructive/40" : ""}><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{classificacoes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Desfecho <span className="text-destructive">*</span></Label>
                      <Select value={conclusao.desfecho} onValueChange={v => setConclusao(p => ({ ...p, desfecho: v }))}>
                        <SelectTrigger className={!conclusao.desfecho ? "border-destructive/40" : ""}><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>{["Alta curado", "Alta melhorado", "Óbito", "Transferência", "Em tratamento"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Conclusão Epidemiológica <span className="text-destructive">*</span></Label>
                    <Textarea value={conclusao.conclusaoEpidemiologica} onChange={e => setConclusao(p => ({ ...p, conclusaoEpidemiologica: e.target.value }))}
                      rows={3} placeholder="Descreva a conclusão epidemiológica..."
                      className={!conclusao.conclusaoEpidemiologica ? "border-destructive/40" : ""} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Condutas Adotadas <span className="text-destructive">*</span></Label>
                    <Textarea value={conclusao.condutas} onChange={e => setConclusao(p => ({ ...p, condutas: e.target.value }))}
                      rows={3} placeholder="Medidas de controle e prevenção adotadas..."
                      className={!conclusao.condutas ? "border-destructive/40" : ""} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Vínculo com Surto</Label>
                    <Select value={conclusao.vinculoSurto} onValueChange={v => setConclusao(p => ({ ...p, vinculoSurto: v }))}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Não">Não</SelectItem><SelectItem value="Sim - surto ativo">Sim - surto ativo</SelectItem>
                        <SelectItem value="Sim - surto encerrado">Sim - surto encerrado</SelectItem><SelectItem value="Em avaliação">Em avaliação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-20 bg-background border-t p-3">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={detailStep === 0} onClick={() => setDetailStep(s => s - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" />Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={detailStep === DETAIL_STEPS.length - 1} onClick={() => setDetailStep(s => s + 1)}>
                Próxima<ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            <p className="hidden sm:block text-xs text-muted-foreground">
              Etapa {detailStep + 1}/{DETAIL_STEPS.length} — {DETAIL_STEPS[detailStep].label}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSaveDraft} className="gap-1"><Save className="h-4 w-4" />Rascunho</Button>
              <Button variant="outline" size="sm" onClick={() => { handleSaveDraft(); setDetailStep(s => Math.min(DETAIL_STEPS.length - 1, s + 1)); }} className="gap-1">
                <Save className="h-4 w-4" />Salvar e Continuar
              </Button>
              {detailStep === DETAIL_STEPS.length - 1 && (
                <Button size="sm" onClick={handleFinalize} className="gap-1 bg-primary hover:bg-primary/90">
                  <CheckCircle2 className="h-4 w-4" />Finalizar Investigação
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-2xl font-bold text-foreground">Notificação e Investigação CCIH</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Gerenciamento de casos de infecção hospitalar</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            ins.push(`📊 ${cases.length} casos registrados: ${kpis.abertos} abertos, ${kpis.emInvestigacao} em investigação, ${kpis.confirmados} confirmados.`);
            if (kpis.confirmados > 0) ins.push(`🦠 Taxa de confirmação: ${((kpis.confirmados / Math.max(cases.length, 1)) * 100).toFixed(1)}%.`);
            const byType: Record<string, number> = {}; cases.forEach(c => { const t = c.infection_type || "Outros"; byType[t] = (byType[t] || 0) + 1; });
            const topType = Object.entries(byType).sort((a, b) => b[1] - a[1])[0];
            if (topType) ins.push(`🔬 Tipo de infecção mais frequente: ${topType[0]} (${topType[1]} casos).`);
            const bySector: Record<string, number> = {}; cases.forEach(c => { const s = c.patient?.sector || "Outros"; bySector[s] = (bySector[s] || 0) + 1; });
            const topSector = Object.entries(bySector).sort((a, b) => b[1] - a[1])[0];
            if (topSector) ins.push(`🏥 Setor com mais notificações: ${topSector[0]} (${topSector[1]} casos).`);
            if (kpis.encerrados > 0) ins.push(`✅ ${kpis.encerrados} casos já foram encerrados/descartados.`);
            return ins;
          }} />
          <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="h-4 w-4 mr-1" /> PDF</Button>
          <Button variant="outline" size="sm" onClick={handleNewNotification} className="gap-1.5 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
            <ShieldAlert className="h-4 w-4" /> Nova Notificação
          </Button>
          <Button onClick={openNew} size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Novo Caso</span><span className="sm:hidden">Novo</span>
          </Button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: AlertTriangle, color: "text-destructive", value: kpis.abertos, label: "Abertos" },
          { icon: Search, color: "text-primary", value: kpis.emInvestigacao, label: "Em Investigação" },
          { icon: CheckCircle, color: "text-green-600", value: kpis.confirmados, label: "Confirmados" },
          { icon: Clock, color: "text-amber-600", value: kpis.encerrados, label: "Encerrados" },
        ].map((k) => (
          <Card key={k.label}><CardContent className="flex items-center gap-3 p-3 md:pt-5 md:p-5">
            <k.icon className={`h-6 w-6 md:h-8 md:w-8 ${k.color} shrink-0`} />
            <div><p className="text-lg md:text-2xl font-bold">{k.value}</p><p className="text-[10px] md:text-sm text-muted-foreground">{k.label}</p></div>
          </CardContent></Card>
        ))}
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Mês</label>
              <Select value={filterMes} onValueChange={setFilterMes}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {mesesNomes.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Ano</label>
              <Select value={filterAno} onValueChange={setFilterAno}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {anosDisponiveis.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Setor</label>
              <Select value={filterSetor} onValueChange={setFilterSetor}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Evento</label>
              <Select value={filterEvento} onValueChange={setFilterEvento}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos</SelectItem>
                  {eventos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
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
            <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
              <XCircle className="h-3.5 w-3.5" />Limpar
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar paciente ou prontuário..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>


      {/* ── Table ── */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-2"><CardTitle className="text-sm md:text-lg">Casos de Investigação ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="hidden md:block overflow-x-auto">
            <Table className="text-sm">
              <TableHeader><TableRow>
                <TableHead>ID</TableHead><TableHead>Paciente</TableHead><TableHead>Setor</TableHead>
                <TableHead>Evento</TableHead><TableHead>Status</TableHead><TableHead>Data</TableHead><TableHead>Ações</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum caso encontrado.</TableCell></TableRow>}
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
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)} title="Editar"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailCase(c)} title="Detalhes"><Eye className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openFullInvestigation(c)} title="Investigar"><ClipboardList className="h-3.5 w-3.5 text-primary" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDeletePatient(c)} title="Excluir paciente"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="md:hidden space-y-2 p-3">
            {filtered.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhum caso.</p>}
            {filtered.map((c) => (
              <div key={c.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{c.patient?.full_name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">{c.case_number || c.id.slice(0, 8)}</p>
                  </div>
                  <Badge variant={statusConfig[c.status]?.variant || "outline"} className="text-[10px] shrink-0">{statusConfig[c.status]?.label || c.status}</Badge>
                </div>
                <div className="flex gap-2 pt-1 border-t border-border">
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => openEdit(c)}><Pencil className="h-3 w-3" /> Editar</Button>
                  <Button variant="outline" size="sm" className="flex-1 h-7 text-xs gap-1" onClick={() => openFullInvestigation(c)}><ClipboardList className="h-3 w-3" /> Investigar</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Create/Edit Dialog ── */}
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
              <Select value={form.setor} onValueChange={(v) => setForm({ ...form, setor: v })}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{setores.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Evento *</Label>
              <Select value={form.evento} onValueChange={(v) => setForm({ ...form, evento: v })}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{eventos.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Classificação</Label>
              <Select value={form.classificacao} onValueChange={(v) => setForm({ ...form, classificacao: v })}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>{classificacoes.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Observações</Label>
              <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={prefilledBanner ? 8 : 3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}{editingCase ? "Salvar" : "Registrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Quick View Dialog ── */}
      <Dialog open={!!detailCase} onOpenChange={(open) => !open && setDetailCase(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto mx-4">
          {detailCase && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base flex items-center gap-2">
                  {detailCase.case_number || detailCase.id.slice(0, 8)}
                  <Badge variant={statusConfig[detailCase.status]?.variant || "outline"}>{statusConfig[detailCase.status]?.label || detailCase.status}</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Paciente:</span><p className="font-medium">{detailCase.patient?.full_name || "—"}</p></div>
                  <div><span className="text-muted-foreground">Prontuário:</span><p className="font-medium">{detailCase.patient?.medical_record || "—"}</p></div>
                  <div><span className="text-muted-foreground">Setor:</span><p className="font-medium">{detailCase.patient?.sector || "—"}</p></div>
                  <div><span className="text-muted-foreground">Evento:</span><p className="font-medium">{detailCase.infection_type || "—"}</p></div>
                </div>
                {detailCase.notes && <div><span className="text-muted-foreground">Observações:</span><p className="mt-1 bg-muted/50 rounded p-2 text-xs">{detailCase.notes}</p></div>}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Alterar Status</Label>
                  <Select value={detailCase.status} onValueChange={(v) => handleStatusChange(detailCase.id, v as CaseStatus)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem><SelectItem value="investigating">Em Investigação</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem><SelectItem value="discarded">Descartado</SelectItem><SelectItem value="closed">Encerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" className="w-full gap-1.5" onClick={() => openFullInvestigation(detailCase)}>
                  <ClipboardList className="h-4 w-4" /> Abrir Investigação Completa
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CasesInvestigation;
