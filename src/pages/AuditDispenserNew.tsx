import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, FileText, Activity, History } from "lucide-react";

const sectors = ["UTI Adulto", "UTI Neonatal", "UTI Pediátrica", "Clínica Médica", "Clínica Cirúrgica", "Pronto Socorro", "Centro Cirúrgico", "Internação"];
const preparationTypes = ["Álcool gel 70%", "Sabonete líquido", "Clorexidina degermante 2%", "Clorexidina alcoólica 0,5%", "Outro"];

type ItemStatus = "conforme" | "nao_conforme" | "na" | "nao_avaliado" | "";

interface CheckItem {
  id: string;
  label: string;
}

const checklistItems: CheckItem[] = [
  { id: "identification", label: "Dispenser identificado corretamente (nome do produto, validade)" },
  { id: "physical_state", label: "Estado físico do dispenser íntegro (sem rachaduras, vazamentos)" },
  { id: "supply_level", label: "Nível de insumo adequado (acima de 20%)" },
  { id: "product_aspect", label: "Aspecto do produto dentro dos padrões (cor, odor, viscosidade)" },
  { id: "disinfection_record", label: "Registro de desinfecção atualizado e dentro da validade" },
  { id: "accessibility", label: "Dispenser acessível e em local visível" },
  { id: "signage", label: "Sinalização de uso correto presente e legível" },
];

const statusLabels: Record<string, string> = {
  conforme: "Conforme",
  nao_conforme: "Não Conforme",
  na: "N/A",
  nao_avaliado: "Não Avaliado",
};

const statusColors: Record<string, string> = {
  conforme: "bg-success text-success-foreground",
  nao_conforme: "bg-destructive text-destructive-foreground",
  na: "bg-muted text-muted-foreground",
  nao_avaliado: "bg-secondary text-secondary-foreground",
};

export default function AuditDispenserNew() {
  const navigate = useNavigate();
  const [auditorName, setAuditorName] = useState("");
  const [sector, setSector] = useState("");
  const [dispenserId, setDispenserId] = useState("");
  const [preparationType, setPreparationType] = useState("");
  const [responses, setResponses] = useState<Record<string, ItemStatus>>({});
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [generalObservations, setGeneralObservations] = useState("");

  const setResponse = (id: string, value: ItemStatus) =>
    setResponses((p) => ({ ...p, [id]: value }));

  const setJustification = (id: string, value: string) =>
    setJustifications((p) => ({ ...p, [id]: value }));

  const stats = useMemo(() => {
    const answered = checklistItems.filter((i) => responses[i.id] && responses[i.id] !== "");
    const applicable = answered.filter((i) => responses[i.id] !== "na" && responses[i.id] !== "nao_avaliado");
    const conformes = applicable.filter((i) => responses[i.id] === "conforme");
    const naoConformes = applicable.filter((i) => responses[i.id] === "nao_conforme");
    const rate = applicable.length > 0 ? (conformes.length / applicable.length) * 100 : 0;
    return { answered: answered.length, conformes: conformes.length, naoConformes: naoConformes.length, rate };
  }, [responses]);

  const progressPercent = (stats.answered / checklistItems.length) * 100;

  const handleSaveDraft = () => {
    toast({ title: "Rascunho salvo", description: "A auditoria foi salva como rascunho." });
  };

  const handleFinish = () => {
    if (!auditorName || !sector || !dispenserId) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome do funcionário, setor e ID do dispenser.", variant: "destructive" });
      return;
    }
    if (stats.answered < checklistItems.length) {
      toast({ title: "Auditoria incompleta", description: `Faltam ${checklistItems.length - stats.answered} itens a avaliar.`, variant: "destructive" });
      return;
    }
    toast({ title: "Auditoria concluída!", description: `Taxa de conformidade: ${stats.rate.toFixed(1)}%` });
    navigate("/dashboard");
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Vigilância de Dispenser</h1>
            <p className="text-muted-foreground text-sm">Auditoria de conformidade de dispensers</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => toast({ title: "Em breve", description: "Tela de histórico em desenvolvimento." })}>
          <History className="h-4 w-4" />
          Ver Histórico
        </Button>
      </div>

      {/* Identification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Funcionário *</Label>
            <Input placeholder="Nome do auditor" value={auditorName} onChange={(e) => setAuditorName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Setor *</Label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
              <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nº do Dispenser (ID/Patrimônio) *</Label>
            <Input placeholder="Ex: DISP-042" value={dispenserId} onChange={(e) => setDispenserId(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Tipo de Preparação</Label>
            <Select value={preparationType} onValueChange={setPreparationType}>
              <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
              <SelectContent>{preparationTypes.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Summary Panel */}
      <Card className="border-primary/30">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 text-primary" />
              <span className="font-semibold">Resumo Automático</span>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className={stats.rate >= 80 ? "bg-success text-success-foreground" : stats.rate >= 50 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"}>
                {stats.rate.toFixed(1)}%
              </Badge>
              <span className="text-sm text-muted-foreground">
                {stats.conformes} conformes · {stats.naoConformes} não conformes · {stats.answered}/{checklistItems.length} avaliados
              </span>
            </div>
          </div>
          <Progress value={progressPercent} className="mt-3 h-2" />
        </CardContent>
      </Card>

      {/* Checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Questionário de Conformidade</CardTitle>
          <CardDescription>Avalie cada item e justifique as não conformidades</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checklistItems.map((item) => (
            <div key={item.id} className="rounded-lg border p-4 space-y-3">
              <p className="font-medium text-sm">{item.label}</p>
              <div className="flex flex-wrap gap-2">
                {(["conforme", "nao_conforme", "na", "nao_avaliado"] as ItemStatus[]).map((status) => (
                  <Button
                    key={status}
                    size="sm"
                    variant={responses[item.id] === status ? "default" : "outline"}
                    className={responses[item.id] === status ? statusColors[status] : ""}
                    onClick={() => setResponse(item.id, status)}
                  >
                    {statusLabels[status]}
                  </Button>
                ))}
              </div>
              {responses[item.id] === "nao_conforme" && (
                <Textarea
                  placeholder="Justificativa obrigatória para não conformidade..."
                  className="mt-2"
                  value={justifications[item.id] || ""}
                  onChange={(e) => setJustification(item.id, e.target.value)}
                />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* General Observations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Anotações adicionais sobre a visita ao setor..."
            className="min-h-[100px]"
            value={generalObservations}
            onChange={(e) => setGeneralObservations(e.target.value)}
          />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button variant="secondary" onClick={handleSaveDraft} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar Rascunho
        </Button>
        <Button onClick={handleFinish} className="gap-2">
          <FileText className="h-4 w-4" />
          Concluir Auditoria
        </Button>
      </div>
    </div>
  );
}
