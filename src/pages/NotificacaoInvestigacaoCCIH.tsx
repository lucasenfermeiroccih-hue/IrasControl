import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { ShieldAlert, Save, FileText, Syringe, ClipboardList, AlertTriangle, CheckCircle2, Info } from "lucide-react";

const setores = [
  "UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica",
  "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica", "Contêiner",
  "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto",
];

const eventos = ["IPCS-CVC", "ITU-SVD", "PAV", "ISC", "Surto", "Óbito relacionado a IRAS", "Colonização MR"];
const classificacoes = ["IRAS confirmada", "IRAS provável", "Colonização", "Contaminação", "Em investigação"];

interface InvestigationData {
  paciente: string;
  prontuario: string;
  setor: string;
  leito: string;
  sexo: string;
  dataNascimento: string;
  dataInternacao: string;
  diagnostico: string;
  doencasBase: string;
  motivoInternacao: string;
  especialidade: string;
  dispositivos: Record<string, string>;
  dispInvasivos: Record<string, string>;
  labPanel: { exame: string; data: string; microrganismo: string; sensibilidade: string; mdr: boolean }[];
  evolucao: Record<string, string>;
  sinaisVitais: Record<string, string>;
  iras: Record<string, string>;
  criteriosSelecionados: string[];
}

export default function NotificacaoInvestigacaoCCIH() {
  const location = useLocation();
  const navState = location.state as { fromMonitoring?: boolean; data?: InvestigationData } | null;
  const prefilled = navState?.fromMonitoring && navState?.data;

  const [caseId] = useState(() => "INV-" + Date.now().toString().slice(-8));

  const [form, setForm] = useState({
    paciente: "",
    prontuario: "",
    setor: "",
    leito: "",
    sexo: "",
    dataNascimento: "",
    dataInternacao: "",
    diagnostico: "",
    doencasBase: "",
    motivoInternacao: "",
    especialidade: "",
    evento: "",
    classificacao: "",
    dataDeteccao: new Date().toISOString().slice(0, 10),
    observacoes: "",
    status: "Em investigação" as string,
  });

  const [dispositivosTexto, setDispositivosTexto] = useState("");
  const [examesTexto, setExamesTexto] = useState("");
  const [evolucaoTexto, setEvolucaoTexto] = useState("");
  const [criterios, setCriterios] = useState<string[]>([]);
  const [isPrefilled, setIsPrefilled] = useState(false);

  useEffect(() => {
    if (prefilled && navState.data) {
      const d = navState.data;
      setForm(prev => ({
        ...prev,
        paciente: d.paciente || "",
        prontuario: d.prontuario || "",
        setor: d.setor || "",
        leito: d.leito || "",
        sexo: d.sexo || "",
        dataNascimento: d.dataNascimento || "",
        dataInternacao: d.dataInternacao || "",
        diagnostico: d.diagnostico || "",
        doencasBase: d.doencasBase || "",
        motivoInternacao: d.motivoInternacao || "",
        especialidade: d.especialidade || "",
        status: "Em investigação",
      }));

      // Build dispositivos text
      const dispParts: string[] = [];
      if (d.dispositivos) {
        Object.entries(d.dispositivos).forEach(([k, v]) => {
          if (v && v !== "Não") dispParts.push(`${k}: ${v}`);
        });
      }
      if (d.dispInvasivos) {
        Object.entries(d.dispInvasivos).forEach(([k, v]) => {
          if (v) dispParts.push(`${k}: ${v}`);
        });
      }
      setDispositivosTexto(dispParts.join("\n"));

      // Build exames text
      if (d.labPanel && d.labPanel.length > 0) {
        setExamesTexto(d.labPanel.map(e => `${e.exame} (${e.data}) — ${e.microrganismo} | ${e.sensibilidade}${e.mdr ? " [MDR]" : ""}`).join("\n"));
      }

      // Build evolução text
      if (d.evolucao) {
        const evParts = Object.entries(d.evolucao)
          .filter(([, v]) => v)
          .map(([k, v]) => `${k}: ${v}`);
        if (d.sinaisVitais) {
          Object.entries(d.sinaisVitais)
            .filter(([, v]) => v)
            .forEach(([k, v]) => evParts.push(`${k}: ${v}`));
        }
        setEvolucaoTexto(evParts.join("\n"));
      }

      if (d.criteriosSelecionados) setCriterios(d.criteriosSelecionados);

      setIsPrefilled(true);
    }
  }, []);

  const updateForm = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSave = () => {
    if (!form.paciente.trim()) { toast.error("Nome do paciente é obrigatório"); return; }
    if (!form.setor) { toast.error("Setor é obrigatório"); return; }
    toast.success(`Investigação ${caseId} salva com sucesso!`);
  };

  return (
    <div className="pb-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notificação e Investigação CCIH</h1>
            <p className="text-sm text-muted-foreground">Registro e acompanhamento de casos de infecção</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm font-mono">{caseId}</Badge>
          <Badge className="bg-amber-500/20 text-amber-700 border-amber-300">{form.status}</Badge>
        </div>
      </div>

      {isPrefilled && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <Info className="h-5 w-5 text-primary shrink-0" />
          <p className="text-sm text-primary font-medium">
            Dados pré-preenchidos a partir do Monitoramento de Pacientes. Revise e complemente as informações.
          </p>
        </div>
      )}

      {/* Identificação do Paciente */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />Identificação do Paciente
            {isPrefilled && <Badge variant="secondary" className="text-xs">Pré-preenchido</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Nome do Paciente <span className="text-destructive">*</span></Label>
            <Input value={form.paciente} onChange={e => updateForm("paciente", e.target.value)} className={isPrefilled ? "border-primary/40 bg-primary/5" : ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Prontuário</Label>
            <Input value={form.prontuario} onChange={e => updateForm("prontuario", e.target.value)} className={isPrefilled && form.prontuario ? "border-primary/40 bg-primary/5" : ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Setor <span className="text-destructive">*</span></Label>
            <Select value={form.setor} onValueChange={v => updateForm("setor", v)}>
              <SelectTrigger className={isPrefilled && form.setor ? "border-primary/40 bg-primary/5" : ""}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Leito</Label>
            <Input value={form.leito} onChange={e => updateForm("leito", e.target.value)} className={isPrefilled && form.leito ? "border-primary/40 bg-primary/5" : ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Data de Internação</Label>
            <Input type="date" value={form.dataInternacao} onChange={e => updateForm("dataInternacao", e.target.value)} className={isPrefilled && form.dataInternacao ? "border-primary/40 bg-primary/5" : ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Sexo</Label>
            <Select value={form.sexo} onValueChange={v => updateForm("sexo", v)}>
              <SelectTrigger className={isPrefilled && form.sexo ? "border-primary/40 bg-primary/5" : ""}><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M">Masculino</SelectItem>
                <SelectItem value="F">Feminino</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data de Nascimento</Label>
            <Input type="date" value={form.dataNascimento} onChange={e => updateForm("dataNascimento", e.target.value)} className={isPrefilled && form.dataNascimento ? "border-primary/40 bg-primary/5" : ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Especialidade</Label>
            <Input value={form.especialidade} onChange={e => updateForm("especialidade", e.target.value)} className={isPrefilled && form.especialidade ? "border-primary/40 bg-primary/5" : ""} />
          </div>
          <div className="space-y-1.5">
            <Label>Diagnóstico</Label>
            <Input value={form.diagnostico} onChange={e => updateForm("diagnostico", e.target.value)} className={isPrefilled && form.diagnostico ? "border-primary/40 bg-primary/5" : ""} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
            <Label>Doenças de Base</Label>
            <Input value={form.doencasBase} onChange={e => updateForm("doencasBase", e.target.value)} className={isPrefilled && form.doencasBase ? "border-primary/40 bg-primary/5" : ""} />
          </div>
          <div className="sm:col-span-2 lg:col-span-3 space-y-1.5">
            <Label>Motivo da Internação</Label>
            <Input value={form.motivoInternacao} onChange={e => updateForm("motivoInternacao", e.target.value)} className={isPrefilled && form.motivoInternacao ? "border-primary/40 bg-primary/5" : ""} />
          </div>
        </CardContent>
      </Card>

      {/* Dados da Investigação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />Dados da Investigação
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Evento / Tipo de Infecção</Label>
            <Select value={form.evento} onValueChange={v => updateForm("evento", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione o evento" /></SelectTrigger>
              <SelectContent>{eventos.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Classificação</Label>
            <Select value={form.classificacao} onValueChange={v => updateForm("classificacao", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{classificacoes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Data de Detecção</Label>
            <Input type="date" value={form.dataDeteccao} onChange={e => updateForm("dataDeteccao", e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Dispositivos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />Dispositivos Invasivos
            {isPrefilled && dispositivosTexto && <Badge variant="secondary" className="text-xs">Pré-preenchido</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Descreva os dispositivos invasivos do paciente..."
            value={dispositivosTexto}
            onChange={e => setDispositivosTexto(e.target.value)}
            className={isPrefilled && dispositivosTexto ? "border-primary/40 bg-primary/5" : ""}
          />
        </CardContent>
      </Card>

      {/* Exames */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Syringe className="h-4 w-4 text-primary" />Resultados Laboratoriais
            {isPrefilled && examesTexto && <Badge variant="secondary" className="text-xs">Pré-preenchido</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={5}
            placeholder="Resultados de culturas e exames laboratoriais..."
            value={examesTexto}
            onChange={e => setExamesTexto(e.target.value)}
            className={isPrefilled && examesTexto ? "border-primary/40 bg-primary/5" : ""}
          />
        </CardContent>
      </Card>

      {/* Evolução */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />Resumo da Evolução Clínica
            {isPrefilled && evolucaoTexto && <Badge variant="secondary" className="text-xs">Pré-preenchido</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={6}
            placeholder="Resumo da evolução clínica, sinais vitais, condutas..."
            value={evolucaoTexto}
            onChange={e => setEvolucaoTexto(e.target.value)}
            className={isPrefilled && evolucaoTexto ? "border-primary/40 bg-primary/5" : ""}
          />
        </CardContent>
      </Card>

      {/* Critérios Diagnósticos */}
      {criterios.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />Critérios Diagnósticos Selecionados
              <Badge variant="secondary" className="text-xs">Pré-preenchido</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {criterios.map(c => (
                <Badge key={c} variant="outline" className="text-xs">{c}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Observações */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Observações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            rows={4}
            placeholder="Observações adicionais sobre o caso..."
            value={form.observacoes}
            onChange={e => updateForm("observacoes", e.target.value)}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => toast.success("Rascunho salvo!")} className="gap-1.5">
          <Save className="h-4 w-4" />Salvar Rascunho
        </Button>
        <Button onClick={handleSave} className="gap-1.5">
          <Save className="h-4 w-4" />Salvar Investigação
        </Button>
      </div>
    </div>
  );
}
