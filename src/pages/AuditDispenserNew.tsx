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
import { toast } from "sonner";
import { ArrowLeft, Save, FileText, Activity, Loader2 } from "lucide-react";
import { useAuditSave } from "@/hooks/useAuditSave";
import AuditHistory from "@/components/AuditHistory";
import { EmployeeCombobox } from "@/components/EmployeeCombobox";

const sectors = ["UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica Contêiner", "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto", "Ambulatório", "Setores administrativos"];
const preparationTypes = ["Álcool gel 70%", "Sabonete líquido", "Clorexidina degermante 2%", "Clorexidina alcoólica 0,5%", "Outro"];

type ItemStatus = "conforme" | "nao_conforme" | "na" | "nao_avaliado" | "";

interface CheckItem { id: string; label: string; }

const checklistItems: CheckItem[] = [
  { id: "identification", label: "Dispenser identificado corretamente (nome do produto, validade)" },
  { id: "physical_state", label: "Estado físico do dispenser íntegro (sem rachaduras, vazamentos)" },
  { id: "supply_level", label: "Nível de insumo adequado (acima de 20%)" },
  { id: "product_aspect", label: "Aspecto do produto dentro dos padrões (cor, odor, viscosidade)" },
  { id: "disinfection_record", label: "Registro de desinfecção atualizado e dentro da validade" },
  { id: "accessibility", label: "Dispenser acessível e em local visível" },
  { id: "signage", label: "Sinalização de uso correto presente e legível" },
];

const statusLabels: Record<string, string> = { conforme: "Conforme", nao_conforme: "Não Conforme", na: "N/A", nao_avaliado: "Não Avaliado" };
const statusColors: Record<string, string> = {
  conforme: "bg-success text-success-foreground hover:bg-success/90",
  nao_conforme: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  na: "bg-gray-400 text-white hover:bg-gray-400/90",
  nao_avaliado: "bg-muted/60 text-muted-foreground hover:bg-muted/80 border border-border",
};

const mapStatus = (v: ItemStatus) => {
  if (v === "conforme") return "compliant" as const;
  if (v === "nao_conforme") return "non_compliant" as const;
  if (v === "na") return "not_applicable" as const;
  return "not_evaluated" as const;
};

export default function AuditDispenserNew() {
  const navigate = useNavigate();
  const { saveAudit, hospitalId } = useAuditSave();
  const [saving, setSaving] = useState(false);
  const [auditorName, setAuditorName] = useState("");
  const [sector, setSector] = useState("");
  const [dispenserId, setDispenserId] = useState("");
  const [preparationType, setPreparationType] = useState("");
  const [responses, setResponses] = useState<Record<string, ItemStatus>>({});
  const [justifications, setJustifications] = useState<Record<string, string>>({});
  const [generalObservations, setGeneralObservations] = useState("");

  const stats = useMemo(() => {
    const answered = checklistItems.filter(i => responses[i.id] && responses[i.id] !== "");
    const applicable = answered.filter(i => responses[i.id] !== "na" && responses[i.id] !== "nao_avaliado");
    const conformes = applicable.filter(i => responses[i.id] === "conforme");
    const naoConformes = applicable.filter(i => responses[i.id] === "nao_conforme");
    const rate = applicable.length > 0 ? (conformes.length / applicable.length) * 100 : 0;
    return { answered: answered.length, conformes: conformes.length, naoConformes: naoConformes.length, rate };
  }, [responses]);

  const handleFinish = async () => {
    if (!auditorName || !sector || !dispenserId) {
      toast.error("Preencha funcionário, setor e ID do dispenser.");
      return;
    }
    if (stats.answered < checklistItems.length) {
      toast.error(`Faltam ${checklistItems.length - stats.answered} itens.`);
      return;
    }
    setSaving(true);
    const items = checklistItems.map((item, i) => ({
      question: item.label,
      status: mapStatus(responses[item.id] || ""),
      category: "Dispenser",
      observation: justifications[item.id] || undefined,
      item_order: i + 1,
    }));
    const ok = await saveAudit({
      auditType: "dispenser",
      auditDate: new Date().toISOString().slice(0, 10),
      sector,
      observations: `Funcionário: ${auditorName} | Dispenser: ${dispenserId} | Tipo: ${preparationType}\n${generalObservations}`,
      items,
    });
    setSaving(false);
    if (ok) {
      setAuditorName(""); setSector(""); setDispenserId(""); setPreparationType("");
      setResponses({}); setJustifications({}); setGeneralObservations("");
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-xl md:text-2xl font-bold">Vigilância de Dispenser</h1><p className="text-muted-foreground text-sm">Auditoria de conformidade de dispensers</p></div>
        </div>
        <AuditHistory auditType="dispenser" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Funcionário *</Label><EmployeeCombobox hospitalId={hospitalId} value={auditorName} onChange={setAuditorName} /></div>
          <div className="space-y-2"><Label>Setor *</Label><Select value={sector} onValueChange={setSector}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Nº do Dispenser *</Label><Input value={dispenserId} onChange={e => setDispenserId(e.target.value)} /></div>
          <div className="space-y-2"><Label>Tipo de Preparação</Label><Select value={preparationType} onValueChange={setPreparationType}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{preparationTypes.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
        </CardContent>
      </Card>

      <Card className="border-primary/30"><CardContent className="pt-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3"><Activity className="h-5 w-5 text-primary" /><span className="font-semibold">Resumo</span></div>
          <div className="flex items-center gap-3">
            <Badge className={stats.rate >= 80 ? "bg-success text-success-foreground" : stats.rate >= 50 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"}>{stats.rate.toFixed(1)}%</Badge>
            <span className="text-sm text-muted-foreground">{stats.conformes} conformes · {stats.naoConformes} não conformes · {stats.answered}/{checklistItems.length}</span>
          </div>
        </div>
        <Progress value={(stats.answered / checklistItems.length) * 100} className="mt-3 h-2" />
      </CardContent></Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Questionário</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {checklistItems.map(item => (
            <div key={item.id} className="rounded-lg border p-4 space-y-3">
              <p className="font-medium text-sm">{item.label}</p>
              <div className="flex flex-wrap gap-2">
                {(["conforme", "nao_conforme", "na", "nao_avaliado"] as ItemStatus[]).map(status => (
                  <Button key={status} size="sm" variant={responses[item.id] === status ? "default" : "outline"} className={responses[item.id] === status ? statusColors[status] : ""} onClick={() => setResponses(p => ({ ...p, [item.id]: status }))}>{statusLabels[status]}</Button>
                ))}
              </div>
              {responses[item.id] === "nao_conforme" && <Textarea placeholder="Justificativa..." value={justifications[item.id] || ""} onChange={e => setJustifications(p => ({ ...p, [item.id]: e.target.value }))} />}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card><CardHeader><CardTitle className="text-lg">Observações Gerais</CardTitle></CardHeader><CardContent><Textarea className="min-h-[100px]" value={generalObservations} onChange={e => setGeneralObservations(e.target.value)} /></CardContent></Card>

      <Separator />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleFinish} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Concluir Auditoria
        </Button>
      </div>
    </div>
  );
}
