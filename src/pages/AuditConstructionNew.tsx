import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { ArrowLeft, FileText, Loader2, HardHat, Download } from "lucide-react";
import { useAuditSave } from "@/hooks/useAuditSave";
import { AuditPhotoUpload, type PhotoItem } from "@/components/AuditPhotoUpload";
import AuditHistory from "@/components/AuditHistory";
import { EmployeeCombobox } from "@/components/EmployeeCombobox";
import { buildConstructionAuthorizationPdf } from "@/lib/constructionAuthorizationPdf";
import { useSectors } from "@/hooks/useSectors";

type ResponseValue = "conforme" | "nao_conforme" | "na" | "";
interface CheckItem { id: string; description: string; }
interface CategoryDef { key: string; title: string; description: string; items: CheckItem[]; }

const categories: CategoryDef[] = [
  { key: "barreiras", title: "Barreiras e Vedação", description: "Contenção física da área de obra", items: [
    { id: "barr1", description: "As barreiras implementadas protegem contra poeira?" },
    { id: "barr2", description: "As aberturas temporárias para acesso em paredes e tetos estão cobertas?" },
    { id: "barr3", description: "As telhas removidas para facilitar o acesso foram recolocadas no lugar no fim do turno?" },
    { id: "barr4", description: "As portas permanecem fechadas e devidamente vedadas?" },
    { id: "barr5", description: "Os dutos existentes estão cobertos ou vedados?" },
  ]},
  { key: "poeira_ar", title: "Controle de Poeira e Ar", description: "Mitigação da dispersão de partículas", items: [
    { id: "ar1", description: "A área externa da construção foi umedecida para minimizar o efeito do pó?" },
    { id: "ar2", description: "Foi aplicado exaustor de ar? Está funcional?" },
    { id: "ar3", description: "Há dispositivos ou filtros para evitar o acúmulo de pó?" },
    { id: "ar4", description: "O pó que ultrapassa as barreiras de construção é removido imediatamente?" },
  ]},
  { key: "residuos_trafego", title: "Resíduos e Tráfego", description: "Remoção de entulho e sinalização", items: [
    { id: "res1", description: "Os contêineres para remoção de entulho foram cobertos antes de saírem da área da construção?" },
    { id: "res2", description: "A sinalização para limitar e orientar o tráfego na área é adequada?" },
  ]},
  { key: "limpeza", title: "Limpeza", description: "Higienização da área e arredores", items: [
    { id: "lim1", description: "A área da construção é mantida sempre limpa?" },
    { id: "lim2", description: "A limpeza das áreas externas das barreiras da construção é feita com método aprovado pelo Controle de Infecção?" },
  ]},
];

const allItems = categories.flatMap(c => c.items);

const statusBtnClass: Record<string, string> = {
  conforme: "bg-success text-success-foreground hover:bg-success/90",
  nao_conforme: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  na: "bg-gray-400 text-white hover:bg-gray-400/90",
};
const statusLabels: Record<string, string> = { conforme: "Sim", nao_conforme: "Não", na: "N/A" };

const mapStatus = (v: ResponseValue) => {
  if (v === "conforme") return "compliant" as const;
  if (v === "nao_conforme") return "non_compliant" as const;
  if (v === "na") return "not_applicable" as const;
  return "not_evaluated" as const;
};

export default function AuditConstructionNew() {
  const navigate = useNavigate();
  const { saveAudit, hospitalId } = useAuditSave();
  const { sectors } = useSectors();
  const [saving, setSaving] = useState(false);
  const [project, setProject] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [auditDate, setAuditDate] = useState("");
  const [auditTime, setAuditTime] = useState("");
  const [sector, setSector] = useState("");
  const [responses, setResponses] = useState<Record<string, ResponseValue>>({});
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [downloadingAuth, setDownloadingAuth] = useState(false);

  const handleDownloadAuthorization = async () => {
    setDownloadingAuth(true);
    try {
      const pdf = await buildConstructionAuthorizationPdf({
        localizacao: sector || project || "",
        coordenador: reviewer || "",
        hospitalId: hospitalId || undefined,
      });
      pdf.save("autorizacao-obras-reformas-hgni.pdf");
      toast.success("Autorização de obras baixada!");
    } catch {
      toast.error("Erro ao gerar a autorização em PDF.");
    } finally {
      setDownloadingAuth(false);
    }
  };

  const stats = useMemo(() => {
    const answered = allItems.filter(i => responses[i.id] && responses[i.id] !== "");
    const applicable = answered.filter(i => responses[i.id] !== "na");
    const conformes = applicable.filter(i => responses[i.id] === "conforme");
    const naoConformes = applicable.filter(i => responses[i.id] === "nao_conforme");
    const rate = applicable.length > 0 ? (conformes.length / applicable.length) * 100 : 0;
    return { answered: answered.length, conformes: conformes.length, naoConformes: naoConformes.length, rate };
  }, [responses]);

  const catStats = (cat: CategoryDef) => {
    const answered = cat.items.filter(i => responses[i.id] && responses[i.id] !== "");
    const applicable = answered.filter(i => responses[i.id] !== "na");
    const conformes = applicable.filter(i => responses[i.id] === "conforme");
    return { answered: answered.length, total: cat.items.length, rate: applicable.length > 0 ? (conformes.length / applicable.length) * 100 : 0 };
  };

  const handleFinish = async () => {
    if (!project || !reviewer || !auditDate || !sector) {
      toast.error("Preencha projeto, revisor, data e local/setor.");
      return;
    }
    if (stats.answered < allItems.length) {
      toast.error(`Faltam ${allItems.length - stats.answered} itens.`);
      return;
    }
    setSaving(true);
    const items = allItems.map((item, i) => ({
      question: item.description,
      status: mapStatus(responses[item.id] || ""),
      category: categories.find(c => c.items.some(ci => ci.id === item.id))?.title || "",
      observation: observations[item.id] || undefined,
      item_order: i + 1,
    }));
    const ok = await saveAudit({
      auditType: "construction_renovation",
      auditDate,
      sector,
      observations: `Projeto: ${project} | Revisto por: ${reviewer}${auditTime ? ` | Hora: ${auditTime}` : ""}`,
      items,
      photos,
    });
    setSaving(false);
    if (ok) {
      setProject(""); setReviewer(""); setAuditDate(""); setAuditTime(""); setSector("");
      setResponses({}); setObservations({}); setPhotos([]);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div className="flex items-center gap-2">
            <HardHat className="h-6 w-6 text-primary shrink-0" />
            <div><h1 className="text-xl md:text-2xl font-bold">Verificação de Obras/Reformas</h1><p className="text-muted-foreground text-sm">Controle de infecção em obras e reformas hospitalares</p></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleDownloadAuthorization}
            disabled={downloadingAuth}
            title="Baixar Autorização do Controle de Infecções para Obras/Reformas (PDF)"
          >
            {downloadingAuth ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline">Autorização (PDF)</span>
          </Button>
          <AuditHistory auditType="construction_renovation" />
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Projeto *</Label><Input value={project} onChange={e => setProject(e.target.value)} placeholder="Identificação da obra/reforma" /></div>
          <div className="space-y-2"><Label>Revisto por *</Label><EmployeeCombobox hospitalId={hospitalId} value={reviewer} onChange={setReviewer} /></div>
          <div className="space-y-2"><Label>Data *</Label><Input type="date" value={auditDate} onChange={e => setAuditDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>Hora</Label><Input type="time" value={auditTime} onChange={e => setAuditTime(e.target.value)} /></div>
          <div className="space-y-2 md:col-span-2"><Label>Local / Setor *</Label><Select value={sector} onValueChange={setSector}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Progresso</span><span className="font-medium">{stats.answered}/{allItems.length}</span></div>
        <Progress value={allItems.length > 0 ? (stats.answered / allItems.length) * 100 : 0} className="h-2" />
      </div>

      <Accordion type="multiple" defaultValue={categories.map(c => c.key)} className="space-y-3">
        {categories.map(cat => {
          const cs = catStats(cat);
          return (
            <AccordionItem key={cat.key} value={cat.key} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 text-left">
                  <div><p className="font-semibold">{cat.title}</p><p className="text-xs text-muted-foreground">{cat.description} — {cs.answered}/{cs.total}</p></div>
                  {cs.answered > 0 && <Badge className={cs.rate >= 80 ? "bg-success text-success-foreground" : cs.rate >= 50 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground"}>{cs.rate.toFixed(0)}%</Badge>}
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-3 pb-4">
                {cat.items.map(item => (
                  <div key={item.id} className="rounded-lg border p-3 space-y-2">
                    <p className="text-sm font-medium">{item.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {(["conforme", "nao_conforme", "na"] as ResponseValue[]).map(opt => (
                        <Button key={opt} size="sm" variant={responses[item.id] === opt ? "default" : "outline"} className={responses[item.id] === opt ? statusBtnClass[opt] : ""} onClick={() => setResponses(p => ({ ...p, [item.id]: opt }))}>{statusLabels[opt]}</Button>
                      ))}
                    </div>
                    <Input placeholder="Comentários (opcional)" value={observations[item.id] || ""} onChange={e => setObservations(p => ({ ...p, [item.id]: e.target.value }))} />
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      <Card>
        <CardHeader><CardTitle className="text-lg">Resumo</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg border"><p className="text-xs text-muted-foreground">Conformidade</p><p className="text-xl md:text-2xl font-bold" style={{ color: stats.rate >= 80 ? "hsl(var(--success))" : stats.rate >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>{stats.rate.toFixed(1)}%</p></div>
          <div className="text-center p-3 rounded-lg border"><p className="text-xs text-muted-foreground">Sim</p><p className="text-2xl font-bold text-success">{stats.conformes}</p></div>
          <div className="text-center p-3 rounded-lg border"><p className="text-xs text-muted-foreground">Não</p><p className="text-2xl font-bold text-destructive">{stats.naoConformes}</p></div>
          <div className="text-center p-3 rounded-lg border"><p className="text-xs text-muted-foreground">Progresso</p><p className="text-xl md:text-2xl font-bold">{stats.answered}/{allItems.length}</p></div>
        </CardContent>
      </Card>

      <AuditPhotoUpload photos={photos} onChange={setPhotos} disabled={saving} />

      <Separator />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleFinish} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Finalizar Auditoria
        </Button>
      </div>
    </div>
  );
}
