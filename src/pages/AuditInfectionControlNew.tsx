import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { ArrowLeft, Save, BarChart3, Loader2 } from "lucide-react";
import { useAuditSave } from "@/hooks/useAuditSave";
import AuditHistory from "@/components/AuditHistory";
import { EmployeeCombobox } from "@/components/EmployeeCombobox";

const sectors = ["UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica Contêiner", "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto"];
const shifts = ["Manhã", "Tarde", "Noite"];

type ResponseValue = "conforme" | "nao_conforme" | "na" | "";
interface AuditItem {
  id: string;
  description: string;
  /** When provided, item uses a single-select instead of conforme/nao_conforme chips.
   *  First option is treated as "compliant"; "Não se aplica" as N/A; rest as non-compliant. */
  customOptions?: string[];
}
interface CategoryDef { key: string; title: string; description: string; items: AuditItem[]; }

const categories: CategoryDef[] = [
  { key: "ventilacao", title: "Ventilação Mecânica", description: "Prevenção de PAV", items: [
    { id: "vm1", description: "Cabeceira elevada 30°–45°" },
    { id: "vm2", description: "Higiene oral com clorexidina 0,12%" },
    { id: "vm3", description: "Pressão do cuff 20–30 cmH₂O" },
    { id: "vm4", description: "Aspiração subglótica realizada" },
    { id: "vm5", description: "Avaliação diária de sedação e extubação" },
    { id: "vm6", description: "O paciente possui sonda nasoenteral? Está com a cabeceira elevada de 30° a 45°?" },
    { id: "vm7", description: "Presença de condensado no circuito do respirador?" },
    { id: "vm8", description: "Dispositivos ventilatórios dentro da validade?" },
    { id: "vm9", description: "Macro/micro acondicionados adequadamente?" },
    { id: "vm10", description: "Filtro bacteriológico (HME) datado conforme protocolo?" },
    { id: "vm11", description: "Higiene oral satisfatória?" },
  ]},
  { key: "cvd", title: "Cateter Vesical de Demora", description: "Prevenção de ITU", items: [
    { id: "cvd1", description: "Indicação de permanência avaliada" },
    { id: "cvd2", description: "Sistema de drenagem fechado e íntegro" },
    { id: "cvd3", description: "Bolsa coletora abaixo do nível da bexiga" },
    { id: "cvd4", description: "Fixação adequada" },
    { id: "cvd5", description: "Higiene do meato uretral realizada" },
    { id: "cvd6", description: "Necessidade de CVD está sendo avaliada diariamente?" },
    {
      id: "cvd7",
      description: "Cateter vesical de demora fixado corretamente?",
      customOptions: ["Adequado", "Inadequado", "Sem identificação", "Fixação na posição errada", "Fixação mal aderida", "Não se aplica"],
    },
    { id: "cvd8", description: "Circuito limpo, possibilitando o fluxo livre de urina?" },
    { id: "cvd9", description: "Bolsa com data de instalação visível?" },
    { id: "cvd10", description: "Bolsa abaixo do nível do paciente e sem tocar ao chão? Com volume máximo de 2/3 respeitado?" },
  ]},
  { key: "cvc", title: "Cateter Venoso Central/Periférico", description: "Prevenção de IPCS", items: [
    { id: "cvc1", description: "Curativo oclusivo limpo, seco e com data" },
    { id: "cvc2", description: "Necessidade avaliada diariamente" },
    { id: "cvc3", description: "Conexões desinfectadas antes do manuseio" },
    { id: "cvc4", description: "Troca de curativos conforme protocolo" },
    { id: "cvc5", description: "Registro de data de inserção" },
    { id: "cvc6", description: "Presença de sangue nos equipos e nas conexões?" },
    {
      id: "cvc7",
      description: "Curativo íntegro? (limpo, seco e bem aderido)",
      customOptions: ["Adequado", "Sem data", "Data vencida", "Com sujidade", "Cobertura mal aderida", "Não se aplica"],
    },
    { id: "cvc8", description: "Os equipos e extensores datados, na validade e sem resíduo?" },
    { id: "cvc9", description: "Conexões tampadas e sem resíduo de sangue?" },
  ]},
  { key: "precaucao", title: "Precaução e Isolamento", description: "Precaução padrão e por contato", items: [
    { id: "pc1", description: "Placa de precaução visível e atualizada" },
    { id: "pc2", description: "EPI disponível e utilizado corretamente" },
    { id: "pc3", description: "Artigos de uso exclusivo ou higienizados" },
    { id: "pc4", description: "Limpeza concorrente diária realizada" },
    { id: "pc5", description: "Visitantes orientados sobre precauções" },
    { id: "pc6", description: "Leito do paciente em precaução / rastreamento sinalizado?" },
    { id: "pc7", description: "Capotes pendurados e datados corretamente?" },
    { id: "pc8", description: "Funcionários utilizando EPI corretamente?" },
    { id: "pc9", description: "Almotolias fechadas, datadas e com prazo de validade?" },
    {
      id: "pc10",
      description: "Capotes datados, dentro da validade e pendurados adequadamente?",
      customOptions: ["Adequado", "Inadequado", "Sem data", "Data vencida", "Pendurado incorretamente", "Não se aplica"],
    },
    {
      id: "pc11",
      description: "Limpeza concorrente dos equipamentos? (Bombas infusoras, respirador, monitor, cabos de monitor e mesa de cabeceira)",
      customOptions: ["Adequado", "Inadequado", "Apresenta sujidade visível", "Limpeza ineficaz", "Não se aplica"],
    },
    { id: "pc12", description: "Presença de pulseira de identificação visível com nome completo e data de nascimento?" },
    { id: "pc13", description: "Presença de pulseira de queda (amarela) se o paciente possuir risco de queda?" },
    { id: "pc14", description: "Paciente possui alergia? Está com a pulseira vermelha?" },
    { id: "pc15", description: "Se o paciente possui alergia, está descrito na placa de identificação?" },
  ]},
];

const chipStyles: Record<string, string> = {
  conforme: "bg-success text-success-foreground hover:bg-success/90",
  nao_conforme: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  na: "bg-gray-400 text-white hover:bg-gray-400/90",
};
const chipLabels: Record<string, string> = { conforme: "Conforme", nao_conforme: "Não Conforme", na: "N/A" };

const mapStatus = (v: ResponseValue) => v === "conforme" ? "compliant" as const : v === "nao_conforme" ? "non_compliant" as const : "not_applicable" as const;

/** For items with customOptions, derive ResponseValue from the chosen label. */
const customToResponse = (label: string): ResponseValue => {
  if (!label) return "";
  const l = label.toLowerCase();
  if (l === "adequado" || l === "conforme") return "conforme";
  if (l.includes("não se aplica") || l === "n/a" || l === "na") return "na";
  return "nao_conforme";
};

export default function AuditInfectionControlNew() {
  const navigate = useNavigate();
  const { saveAudit, hospitalId } = useAuditSave();
  const [saving, setSaving] = useState(false);
  const [auditDate, setAuditDate] = useState("");
  const [sector, setSector] = useState("");
  const [shift, setShift] = useState("");
  const [bed, setBed] = useState("");
  const [auditor, setAuditor] = useState("");
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});

  const setResponse = (id: string, value: ResponseValue) => setResponses(p => ({ ...p, [id]: value }));
  const setCustomAnswer = (id: string, label: string) => {
    setCustomAnswers(p => ({ ...p, [id]: label }));
    setResponses(p => ({ ...p, [id]: customToResponse(label) }));
  };
  const setObs = (k: string, v: string) => setObservations(p => ({ ...p, [k]: v }));

  const allItems = categories.flatMap(c => c.items);
  const answeredItems = allItems.filter(i => responses[i.id] && responses[i.id] !== "").length;
  const progressPercent = allItems.length > 0 ? (answeredItems / allItems.length) * 100 : 0;

  const stats = useMemo(() => {
    const answered = allItems.filter(i => responses[i.id] && responses[i.id] !== "");
    const applicable = answered.filter(i => responses[i.id] !== "na");
    const conformes = answered.filter(i => responses[i.id] === "conforme");
    const rate = applicable.length > 0 ? (conformes.length / applicable.length) * 100 : 0;
    return { conformes: conformes.length, naoConformes: applicable.length - conformes.length, na: answered.length - applicable.length, rate };
  }, [responses]);

  const categoryStats = (cat: CategoryDef) => {
    const answered = cat.items.filter(i => responses[i.id] && responses[i.id] !== "");
    const applicable = answered.filter(i => responses[i.id] !== "na");
    const conformes = answered.filter(i => responses[i.id] === "conforme");
    return { answered: answered.length, total: cat.items.length, rate: applicable.length > 0 ? (conformes.length / applicable.length) * 100 : 0 };
  };

  const handleFinish = async () => {
    if (!auditDate || !sector || !shift || !auditor) {
      toast.error("Preencha data, setor, turno e auditor.");
      return;
    }
    if (answeredItems < allItems.length) {
      toast.error(`Faltam ${allItems.length - answeredItems} itens.`);
      return;
    }
    setSaving(true);
    const items = allItems.map((item, i) => {
      const detailLabel = item.customOptions ? customAnswers[item.id] : undefined;
      return {
        question: item.description,
        status: mapStatus(responses[item.id] || ""),
        category: categories.find(c => c.items.some(ci => ci.id === item.id))?.title || "",
        observation: detailLabel ? `Resposta: ${detailLabel}` : undefined,
        item_order: i + 1,
      };
    });
    const obsText = Object.entries(observations).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("\n");
    const ok = await saveAudit({
      auditType: "infection_control",
      auditDate,
      sector,
      observations: `Auditor: ${auditor} | Turno: ${shift} | Leito: ${bed}\n${obsText}`,
      items,
    });
    setSaving(false);
    if (ok) {
      setAuditDate(""); setSector(""); setShift(""); setBed(""); setAuditor("");
      setResponses({}); setCustomAnswers({}); setObservations({});
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-xl md:text-2xl font-bold">Vigilância de Processos</h1><p className="text-muted-foreground text-sm">Auditoria assistencial estruturada</p></div>
        </div>
        <div className="flex items-center gap-2">
          <AuditHistory auditType="infection_control" />
          <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate("/dashboard/infection-control")}>
            <BarChart3 className="h-4 w-4" />Dashboard
          </Button>
        </div>
      </div>

      <Card><CardContent className="pt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Progresso</span>
          <span className="text-sm text-muted-foreground">{answeredItems}/{allItems.length}</span>
        </div>
        <Progress value={progressPercent} className="h-3" />
      </CardContent></Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Contexto</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2"><Label>Data *</Label><Input type="date" value={auditDate} onChange={e => setAuditDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Setor *</Label><Select value={sector} onValueChange={setSector}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Turno *</Label><Select value={shift} onValueChange={setShift}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{shifts.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Leito</Label><Input placeholder="Ex: 12A" value={bed} onChange={e => setBed(e.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Auditor *</Label><EmployeeCombobox hospitalId={hospitalId} value={auditor} onChange={setAuditor} placeholder="Selecione o auditor" /></div>
        </CardContent>
      </Card>

      <Accordion type="multiple" defaultValue={categories.map(c => c.key)} className="space-y-3">
        {categories.map(cat => {
          const cs = categoryStats(cat);
          return (
            <AccordionItem key={cat.key} value={cat.key} className="border rounded-lg overflow-hidden">
              <AccordionTrigger className="px-6 hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <div className="text-left"><p className="font-semibold">{cat.title}</p><p className="text-sm text-muted-foreground">{cat.description}</p></div>
                  <div className="ml-auto flex items-center gap-2 mr-2">
                    <Badge variant="outline" className="text-xs">{cs.answered}/{cs.total}</Badge>
                    {cs.answered > 0 && <Badge className={cs.rate >= 80 ? "bg-success text-success-foreground" : cs.rate >= 50 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"}>{cs.rate.toFixed(0)}%</Badge>}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-4">
                <div className="space-y-3">
                  {cat.items.map(item => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border p-3">
                      <p className="text-sm flex-1">{item.description}</p>
                      {item.customOptions ? (
                        <div className="shrink-0 w-full sm:w-72">
                          <Select value={customAnswers[item.id] || ""} onValueChange={(v) => setCustomAnswer(item.id, v)}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              {item.customOptions.map(opt => (
                                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="flex gap-1.5 shrink-0">
                          {(["conforme", "nao_conforme", "na"] as ResponseValue[]).map(val => (
                            <button key={val} onClick={() => setResponse(item.id, responses[item.id] === val ? "" : val)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${responses[item.id] === val ? chipStyles[val] : "bg-secondary text-secondary-foreground hover:bg-accent"}`}>
                              {chipLabels[val]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Observações — {cat.title}</Label>
                    <Textarea placeholder="Observações..." className="mt-1 min-h-[60px]" value={observations[cat.key] || ""} onChange={e => setObs(cat.key, e.target.value)} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Resumo</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="rounded-lg border bg-card p-3"><p className="text-2xl font-bold text-primary">{stats.rate.toFixed(1)}%</p><p className="text-xs text-muted-foreground">Conformidade</p></div>
            <div className="rounded-lg border bg-card p-3"><p className="text-2xl font-bold text-success">{stats.conformes}</p><p className="text-xs text-muted-foreground">Conformes</p></div>
            <div className="rounded-lg border bg-card p-3"><p className="text-2xl font-bold text-destructive">{stats.naoConformes}</p><p className="text-xs text-muted-foreground">Não Conformes</p></div>
            <div className="rounded-lg border bg-card p-3"><p className="text-2xl font-bold text-muted-foreground">{stats.na}</p><p className="text-xs text-muted-foreground">N/A</p></div>
          </div>
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleFinish} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Concluir e Gerar Indicadores
        </Button>
      </div>
    </div>
  );
}
