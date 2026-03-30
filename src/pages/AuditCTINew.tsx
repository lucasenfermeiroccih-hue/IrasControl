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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, FileText, CheckCircle, XCircle, MinusCircle } from "lucide-react";

const sectors = ["UTI Adulto", "UTI Neonatal", "UTI Pediátrica", "Centro Cirúrgico"];
const shifts = ["Manhã", "Tarde", "Noite"];
const responsibles = ["Enf. Ana Paula", "Enf. Marcos Lima", "Dr. Carlos Mendes", "Dr. Fernanda Souza"];

type ResponseValue = "conforme" | "nao_conforme" | "na" | "nao_avaliado" | "";

interface CheckItem { id: string; description: string; }
interface CategoryDef { key: string; title: string; description: string; items: CheckItem[]; }

const categories: CategoryDef[] = [
  {
    key: "medications",
    title: "Medicações e Armazenamento",
    description: "Limpeza, validade e temperatura",
    items: [
      { id: "med1", description: "Geladeira de medicações limpa e organizada" },
      { id: "med2", description: "Medicações dentro da validade" },
      { id: "med3", description: "Mapa de temperatura da geladeira preenchido" },
      { id: "med4", description: "Almotolias identificadas e dentro da validade" },
      { id: "med5", description: "Medicamentos de alta vigilância sinalizados" },
    ],
  },
  {
    key: "cleaning",
    title: "Limpeza e Organização",
    description: "Áreas de preparo e higienização",
    items: [
      { id: "lim1", description: "Local de preparo de medicação limpo e organizado" },
      { id: "lim2", description: "Macerador de medicamentos limpo após uso" },
      { id: "lim3", description: "Expurgo limpo e organizado" },
      { id: "lim4", description: "Carrinho de limpeza completo e organizado" },
      { id: "lim5", description: "Posto de enfermagem limpo e sem acúmulo de materiais" },
    ],
  },
  {
    key: "equipment",
    title: "Equipamentos e Manutenção",
    description: "Ar condicionado, manutenção e dispensers",
    items: [
      { id: "eq1", description: "Filtros de ar condicionado limpos e com data de troca" },
      { id: "eq2", description: "Equipamentos com manutenção preventiva em dia" },
      { id: "eq3", description: "Dispensers de álcool gel funcionando e abastecidos" },
      { id: "eq4", description: "Dispensers de sabonete líquido funcionando e abastecidos" },
      { id: "eq5", description: "Bombas de infusão calibradas e com etiqueta" },
    ],
  },
  {
    key: "waste",
    title: "Controle de Resíduos",
    description: "Descarte e segregação",
    items: [
      { id: "res1", description: "Descarte de diurese em local apropriado" },
      { id: "res2", description: "Lixeiras com pedal e identificadas por tipo de resíduo" },
      { id: "res3", description: "Caixa de perfurocortante dentro do limite (⅔)" },
      { id: "res4", description: "Resíduos segregados corretamente" },
    ],
  },
];

const allItems = categories.flatMap((c) => c.items);

const statusOptions: { value: ResponseValue; label: string; icon: typeof CheckCircle }[] = [
  { value: "conforme", label: "Conforme", icon: CheckCircle },
  { value: "nao_conforme", label: "Não Conforme", icon: XCircle },
  { value: "na", label: "N/A", icon: MinusCircle },
  { value: "nao_avaliado", label: "Não Avaliado", icon: MinusCircle },
];

const statusBtnClass: Record<string, string> = {
  conforme: "bg-success text-success-foreground hover:bg-success/90",
  nao_conforme: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  na: "bg-muted text-muted-foreground",
  nao_avaliado: "bg-secondary text-secondary-foreground",
};

export default function AuditCTINew() {
  const navigate = useNavigate();
  const [auditDate, setAuditDate] = useState("");
  const [shift, setShift] = useState("");
  const [sector, setSector] = useState("");
  const [responsible, setResponsible] = useState("");
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});

  const setResponse = (id: string, v: ResponseValue) => setResponses((p) => ({ ...p, [id]: v }));
  const setObs = (catKey: string, v: string) => setObservations((p) => ({ ...p, [catKey]: v }));

  const stats = useMemo(() => {
    const answered = allItems.filter((i) => responses[i.id] && responses[i.id] !== "");
    const applicable = answered.filter((i) => responses[i.id] !== "na" && responses[i.id] !== "nao_avaliado");
    const conformes = applicable.filter((i) => responses[i.id] === "conforme");
    const naoConformes = applicable.filter((i) => responses[i.id] === "nao_conforme");
    const rate = applicable.length > 0 ? (conformes.length / applicable.length) * 100 : 0;
    return { answered: answered.length, conformes: conformes.length, naoConformes: naoConformes.length, rate };
  }, [responses]);

  const progressPercent = allItems.length > 0 ? (stats.answered / allItems.length) * 100 : 0;

  const catStats = (cat: CategoryDef) => {
    const answered = cat.items.filter((i) => responses[i.id] && responses[i.id] !== "");
    const applicable = answered.filter((i) => responses[i.id] !== "na" && responses[i.id] !== "nao_avaliado");
    const conformes = applicable.filter((i) => responses[i.id] === "conforme");
    const rate = applicable.length > 0 ? (conformes.length / applicable.length) * 100 : 0;
    return { answered: answered.length, total: cat.items.length, rate };
  };

  const handleSaveDraft = () => {
    toast({ title: "Rascunho salvo", description: "A auditoria foi salva como rascunho." });
  };

  const handleFinish = () => {
    if (!auditDate || !shift || !sector || !responsible) {
      toast({ title: "Campos obrigatórios", description: "Preencha data, turno, setor e responsável.", variant: "destructive" });
      return;
    }
    if (stats.answered < allItems.length) {
      toast({ title: "Auditoria incompleta", description: `Faltam ${allItems.length - stats.answered} itens a avaliar.`, variant: "destructive" });
      return;
    }
    toast({ title: "Auditoria finalizada!", description: `Taxa de conformidade: ${stats.rate.toFixed(1)}%` });
    navigate("/dashboard");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Auditoria de Infraestrutura — CTI</h1>
          <p className="text-muted-foreground text-sm">Registro de conformidade de setores críticos</p>
        </div>
      </div>

      {/* Identification */}

      {/* Identification */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Data da Auditoria *</Label>
            <Input type="date" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Turno *</Label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{shifts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Setor *</Label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Responsável *</Label>
            <Select value={responsible} onValueChange={setResponsible}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{responsibles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso da auditoria</span>
          <span className="font-medium">{stats.answered}/{allItems.length} itens</span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>

      {/* Checklists */}
      <Accordion type="multiple" defaultValue={categories.map((c) => c.key)} className="space-y-3">
        {categories.map((cat) => {
          const cs = catStats(cat);
          return (
            <AccordionItem key={cat.key} value={cat.key} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div>
                    <p className="font-semibold">{cat.title}</p>
                    <p className="text-xs text-muted-foreground">{cat.description} — {cs.answered}/{cs.total}</p>
                  </div>
                  {cs.answered > 0 && (
                    <Badge className={cs.rate >= 80 ? "bg-success text-success-foreground" : cs.rate >= 50 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"}>
                      {cs.rate.toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                {cat.items.map((item) => (
                  <div key={item.id} className="rounded-lg border p-3 space-y-2">
                    <p className="text-sm font-medium">{item.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map((opt) => (
                        <Button
                          key={opt.value}
                          size="sm"
                          variant={responses[item.id] === opt.value ? "default" : "outline"}
                          className={responses[item.id] === opt.value ? statusBtnClass[opt.value] : ""}
                          onClick={() => setResponse(item.id, opt.value)}
                        >
                          {opt.label}
                        </Button>
                      ))}
                    </div>
                    {responses[item.id] === "nao_conforme" && (
                      <Input
                        placeholder="Observação para não conformidade..."
                        className="mt-1"
                        value={observations[item.id] || ""}
                        onChange={(e) => setObs(item.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Resumo dos Indicadores */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Resumo da Auditoria</CardTitle><CardDescription>Prévia dos indicadores antes do fechamento</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Conformidade</p>
            <p className="text-2xl font-bold" style={{ color: stats.rate >= 80 ? "hsl(var(--success))" : stats.rate >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>
              {stats.rate.toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Conformes</p>
            <p className="text-2xl font-bold text-success">{stats.conformes}</p>
          </div>
          <div className="text-center p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Não Conformes</p>
            <p className="text-2xl font-bold text-destructive">{stats.naoConformes}</p>
          </div>
          <div className="text-center p-3 rounded-lg border">
            <p className="text-xs text-muted-foreground">Progresso</p>
            <p className="text-2xl font-bold">{stats.answered}/{allItems.length}</p>
          </div>
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
          Finalizar Auditoria
        </Button>
      </div>
    </div>
  );
}
