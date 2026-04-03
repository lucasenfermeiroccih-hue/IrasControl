import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, FileText, BarChart3 } from "lucide-react";

const sectors = ["UTI Adulto", "UTI Neonatal", "UTI Pediátrica", "Clínica Médica", "Clínica Cirúrgica", "Pronto Socorro"];
const shifts = ["Manhã", "Tarde", "Noite"];
const auditors = ["Dr. Carlos Mendes", "Enf. Ana Paula", "Enf. Marcos Lima", "Dr. Fernanda Souza"];

type ResponseValue = "conforme" | "nao_conforme" | "na" | "";

interface AuditItem {
  id: string;
  description: string;
}

interface CategoryDef {
  key: string;
  title: string;
  description: string;
  items: AuditItem[];
}

const categories: CategoryDef[] = [
  {
    key: "ventilacao",
    title: "Ventilação Mecânica",
    description: "Protocolo de prevenção de PAV",
    items: [
      { id: "vm1", description: "Cabeceira do leito elevada entre 30° e 45°" },
      { id: "vm2", description: "Higiene oral com clorexidina 0,12%" },
      { id: "vm3", description: "Pressão do cuff entre 20 e 30 cmH₂O" },
      { id: "vm4", description: "Aspiração subglótica realizada" },
      { id: "vm5", description: "Avaliação diária de sedação e extubação" },
    ],
  },
  {
    key: "cvd",
    title: "Cateter Vesical de Demora",
    description: "Protocolo de prevenção de ITU",
    items: [
      { id: "cvd1", description: "Indicação de permanência do cateter avaliada" },
      { id: "cvd2", description: "Sistema de drenagem fechado e íntegro" },
      { id: "cvd3", description: "Bolsa coletora abaixo do nível da bexiga" },
      { id: "cvd4", description: "Fixação adequada do cateter" },
      { id: "cvd5", description: "Higiene do meato uretral realizada" },
    ],
  },
  {
    key: "cvc",
    title: "Cateter Venoso Central",
    description: "Protocolo de prevenção de IPCS",
    items: [
      { id: "cvc1", description: "Curativo oclusivo limpo, seco e com data" },
      { id: "cvc2", description: "Necessidade de permanência avaliada diariamente" },
      { id: "cvc3", description: "Conexões desinfectadas antes do manuseio" },
      { id: "cvc4", description: "Troca de curativos conforme protocolo" },
      { id: "cvc5", description: "Registro de data de inserção no prontuário" },
    ],
  },
  {
    key: "precaucao",
    title: "Precaução e Isolamento",
    description: "Medidas de precaução padrão e por contato",
    items: [
      { id: "pc1", description: "Placa de precaução visível e atualizada" },
      { id: "pc2", description: "EPI disponível e utilizado corretamente" },
      { id: "pc3", description: "Artigos de uso exclusivo ou higienizados" },
      { id: "pc4", description: "Limpeza concorrente diária realizada" },
      { id: "pc5", description: "Visitantes orientados sobre precauções" },
    ],
  },
];

const chipStyles: Record<string, string> = {
  conforme: "bg-success text-success-foreground hover:bg-success/90",
  nao_conforme: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  na: "bg-gray-400 text-white hover:bg-gray-400/90",
};

const chipLabels: Record<string, string> = {
  conforme: "Conforme",
  nao_conforme: "Não Conforme",
  na: "N/A",
};

export default function AuditInfectionControlNew() {
  const navigate = useNavigate();
  const [auditDate, setAuditDate] = useState("");
  const [sector, setSector] = useState("");
  const [shift, setShift] = useState("");
  const [bed, setBed] = useState("");
  const [auditor, setAuditor] = useState("");
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});

  const setResponse = (itemId: string, value: ResponseValue) =>
    setResponses((p) => ({ ...p, [itemId]: value }));

  const setObs = (catKey: string, value: string) =>
    setObservations((p) => ({ ...p, [catKey]: value }));

  const allItems = categories.flatMap((c) => c.items);
  const totalItems = allItems.length;
  const answeredItems = allItems.filter((i) => responses[i.id] && responses[i.id] !== "").length;
  const progressPercent = totalItems > 0 ? (answeredItems / totalItems) * 100 : 0;

  const stats = useMemo(() => {
    const answered = allItems.filter((i) => responses[i.id] && responses[i.id] !== "");
    const applicable = answered.filter((i) => responses[i.id] !== "na");
    const conformes = answered.filter((i) => responses[i.id] === "conforme");
    const rate = applicable.length > 0 ? (conformes.length / applicable.length) * 100 : 0;
    return { conformes: conformes.length, naoConformes: applicable.length - conformes.length, na: answered.length - applicable.length, rate };
  }, [responses]);

  const categoryStats = (cat: CategoryDef) => {
    const answered = cat.items.filter((i) => responses[i.id] && responses[i.id] !== "");
    const applicable = answered.filter((i) => responses[i.id] !== "na");
    const conformes = answered.filter((i) => responses[i.id] === "conforme");
    const rate = applicable.length > 0 ? (conformes.length / applicable.length) * 100 : 0;
    return { answered: answered.length, total: cat.items.length, rate };
  };

  const handleSaveDraft = () => {
    toast({ title: "Rascunho salvo", description: "A auditoria foi salva como rascunho." });
  };

  const handleFinish = () => {
    if (!auditDate || !sector || !shift || !auditor) {
      toast({ title: "Campos obrigatórios", description: "Preencha data, setor, turno e auditor.", variant: "destructive" });
      return;
    }
    if (answeredItems < totalItems) {
      toast({ title: "Auditoria incompleta", description: `Faltam ${totalItems - answeredItems} itens a responder.`, variant: "destructive" });
      return;
    }
    toast({ title: "Auditoria concluída!", description: `Taxa de conformidade: ${stats.rate.toFixed(1)}%` });
    navigate("/dashboard/infection-control");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Vigilância de Processos</h1>
            <p className="text-muted-foreground text-sm">Auditoria assistencial estruturada</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/dashboard/infection-control")}>
          <BarChart3 className="h-4 w-4" />
          Dashboard
        </Button>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso da auditoria</span>
            <span className="text-sm text-muted-foreground">{answeredItems}/{totalItems} itens</span>
          </div>
          <Progress value={progressPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Context */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contexto da Auditoria</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Data *</Label>
            <Input type="date" value={auditDate} onChange={(e) => setAuditDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Setor *</Label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Turno *</Label>
            <Select value={shift} onValueChange={setShift}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{shifts.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Leito</Label>
            <Input placeholder="Ex: 12A" value={bed} onChange={(e) => setBed(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Auditor *</Label>
            <Select value={auditor} onValueChange={setAuditor}>
              <SelectTrigger><SelectValue placeholder="Selecione o auditor" /></SelectTrigger>
              <SelectContent>{auditors.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Categories */}
      <Accordion type="multiple" defaultValue={categories.map((c) => c.key)} className="space-y-3">
        {categories.map((cat) => {
          const cs = categoryStats(cat);
          return (
            <AccordionItem key={cat.key} value={cat.key} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-left">
                    <p className="font-semibold">{cat.title}</p>
                    <p className="text-sm text-muted-foreground">{cat.description}</p>
                  </div>
                  <div className="ml-auto flex items-center gap-2 mr-2">
                    <Badge variant="outline" className="text-xs">{cs.answered}/{cs.total}</Badge>
                    {cs.answered > 0 && (
                      <Badge className={cs.rate >= 80 ? "bg-success text-success-foreground" : cs.rate >= 50 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"}>
                        {cs.rate.toFixed(0)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-3">
                  {cat.items.map((item) => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3">
                      <p className="text-sm flex-1">{item.description}</p>
                      <div className="flex gap-1.5 shrink-0">
                        {(["conforme", "nao_conforme", "na"] as ResponseValue[]).map((val) => (
                          <button
                            key={val}
                            onClick={() => setResponse(item.id, responses[item.id] === val ? "" : val)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                              responses[item.id] === val
                                ? chipStyles[val]
                                : "bg-secondary text-secondary-foreground hover:bg-accent"
                            }`}
                          >
                            {chipLabels[val]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Observações — {cat.title}</Label>
                    <Textarea
                      placeholder="Observações complementares..."
                      className="mt-1 min-h-[60px]"
                      value={observations[cat.key] || ""}
                      onChange={(e) => setObs(cat.key, e.target.value)}
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Summary Panel */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Resumo de Indicadores
          </CardTitle>
          <CardDescription>Prévia dos indicadores antes do fechamento</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="rounded-lg border bg-card p-3">
              <p className="text-2xl font-bold text-primary">{stats.rate.toFixed(1)}%</p>
              <p className="text-xs text-muted-foreground">Conformidade</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-2xl font-bold text-success">{stats.conformes}</p>
              <p className="text-xs text-muted-foreground">Conformes</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-2xl font-bold text-destructive">{stats.naoConformes}</p>
              <p className="text-xs text-muted-foreground">Não Conformes</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-2xl font-bold text-muted-foreground">{stats.na}</p>
              <p className="text-xs text-muted-foreground">N/A</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={handleSaveDraft} className="gap-2">
          <FileText className="h-4 w-4" />
          Salvar Rascunho
        </Button>
        <Button onClick={handleFinish} className="gap-2">
          <Save className="h-4 w-4" />
          Concluir e Gerar Indicadores
        </Button>
      </div>
    </div>
  );
}
