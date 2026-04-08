import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { ArrowLeft, Save, Activity, BarChart3, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useAuditSave } from "@/hooks/useAuditSave";

const sectors = ["UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica Contêiner", "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto"];
const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function AdherenceBadge({ rate }: { rate: number }) {
  const color = rate >= 80 ? "bg-success text-success-foreground" : rate >= 50 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground";
  return <Badge className={`${color} text-lg px-4 py-1`}>{rate.toFixed(1)}%</Badge>;
}

export default function AuditBundlesNew() {
  const navigate = useNavigate();
  const { saveAudit } = useAuditSave();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeName: "", auditDate: "", surveillanceMonth: "", sector: "",
    cvcPatients: "", cvcBundlesOpen: "", cvcIncompleteBundles: "", cvcCompleteBundles: "",
    svdPatients: "", svdBundlesOpen: "", svdCompleteBundles: "", svdIncompleteBundles: "",
    observations: "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));
  const setSelect = (field: string) => (v: string) =>
    setForm(p => ({ ...p, [field]: v }));

  const cvcRate = useMemo(() => {
    const open = Number(form.cvcBundlesOpen);
    const complete = Number(form.cvcCompleteBundles);
    return !open ? 0 : (complete / open) * 100;
  }, [form.cvcBundlesOpen, form.cvcCompleteBundles]);

  const svdRate = useMemo(() => {
    const open = Number(form.svdBundlesOpen);
    const complete = Number(form.svdCompleteBundles);
    return !open ? 0 : (complete / open) * 100;
  }, [form.svdBundlesOpen, form.svdCompleteBundles]);

  const handleSave = async () => {
    if (!form.employeeName || !form.auditDate || !form.sector) {
      toast.error("Preencha nome, data e setor.");
      return;
    }
    setSaving(true);
    const items = [
      { question: `CVC: ${form.cvcPatients} pacientes, ${form.cvcBundlesOpen} bundles abertos`, status: Number(form.cvcCompleteBundles) >= Number(form.cvcBundlesOpen) ? "compliant" as const : "non_compliant" as const, category: "CVC", item_order: 1 },
      { question: `CVC Conformes: ${form.cvcCompleteBundles}`, status: "compliant" as const, category: "CVC", item_order: 2 },
      { question: `CVC Inconformes: ${form.cvcIncompleteBundles}`, status: Number(form.cvcIncompleteBundles) > 0 ? "non_compliant" as const : "compliant" as const, category: "CVC", item_order: 3 },
      { question: `SVD: ${form.svdPatients} pacientes, ${form.svdBundlesOpen} bundles abertos`, status: Number(form.svdCompleteBundles) >= Number(form.svdBundlesOpen) ? "compliant" as const : "non_compliant" as const, category: "SVD", item_order: 4 },
      { question: `SVD Conformes: ${form.svdCompleteBundles}`, status: "compliant" as const, category: "SVD", item_order: 5 },
      { question: `SVD Inconformes: ${form.svdIncompleteBundles}`, status: Number(form.svdIncompleteBundles) > 0 ? "non_compliant" as const : "compliant" as const, category: "SVD", item_order: 6 },
    ];
    const ok = await saveAudit({
      auditType: "bundles",
      auditDate: form.auditDate,
      sector: form.sector,
      observations: `${form.employeeName} | Mês: ${form.surveillanceMonth}\n${form.observations}`,
      items,
    });
    setSaving(false);
    if (ok) {
      setForm({ employeeName: "", auditDate: "", surveillanceMonth: "", sector: "", cvcPatients: "", cvcBundlesOpen: "", cvcIncompleteBundles: "", cvcCompleteBundles: "", svdPatients: "", svdBundlesOpen: "", svdCompleteBundles: "", svdIncompleteBundles: "", observations: "" });
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Auditoria de Bundles CVC/SVD</h1>
            <p className="text-muted-foreground text-sm">Registro de conformidade de protocolos de cateter</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => navigate("/dashboard/bundles-compliance")}>
          <BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Ver Dashboard</span>
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Nome do Funcionário *</Label><Input placeholder="Nome completo" value={form.employeeName} onChange={set("employeeName")} /></div>
          <div className="space-y-2"><Label>Data da Auditoria *</Label><Input type="date" value={form.auditDate} onChange={set("auditDate")} /></div>
          <div className="space-y-2">
            <Label>Mês de Vigilância</Label>
            <Select value={form.surveillanceMonth} onValueChange={setSelect("surveillanceMonth")}>
              <SelectTrigger><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
              <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Setor *</Label>
            <Select value={form.sector} onValueChange={setSelect("sector")}>
              <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
              <SelectContent>{sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="text-lg">Cateter Venoso Central (CVC)</CardTitle><CardDescription>Dados de conformidade do protocolo CVC</CardDescription></div>
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Taxa:</span><AdherenceBadge rate={cvcRate} /></div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Nº pacientes com CVC</Label><Input type="number" min="0" value={form.cvcPatients} onChange={set("cvcPatients")} /></div>
          <div className="space-y-2"><Label>Bundles abertos</Label><Input type="number" min="0" value={form.cvcBundlesOpen} onChange={set("cvcBundlesOpen")} /></div>
          <div className="space-y-2"><Label>Bundles com inconformidades</Label><Input type="number" min="0" value={form.cvcIncompleteBundles} onChange={set("cvcIncompleteBundles")} /></div>
          <div className="space-y-2"><Label>Bundles conformes</Label><Input type="number" min="0" value={form.cvcCompleteBundles} onChange={set("cvcCompleteBundles")} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="text-lg">Sonda Vesical de Demora (SVD)</CardTitle><CardDescription>Dados de conformidade do protocolo SVD</CardDescription></div>
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Taxa:</span><AdherenceBadge rate={svdRate} /></div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Nº pacientes com SVD</Label><Input type="number" min="0" value={form.svdPatients} onChange={set("svdPatients")} /></div>
          <div className="space-y-2"><Label>Bundles abertos</Label><Input type="number" min="0" value={form.svdBundlesOpen} onChange={set("svdBundlesOpen")} /></div>
          <div className="space-y-2"><Label>Bundles conformes</Label><Input type="number" min="0" value={form.svdCompleteBundles} onChange={set("svdCompleteBundles")} /></div>
          <div className="space-y-2"><Label>Bundles com inconformidade</Label><Input type="number" min="0" value={form.svdIncompleteBundles} onChange={set("svdIncompleteBundles")} /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Observações</CardTitle></CardHeader>
        <CardContent><Textarea placeholder="Observações sobre não conformidades..." className="min-h-[100px]" value={form.observations} onChange={set("observations")} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Resumo da Auditoria</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg border"><p className="text-xs text-muted-foreground">Adesão CVC</p><p className="text-2xl font-bold" style={{ color: cvcRate >= 80 ? "hsl(var(--success))" : cvcRate >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>{cvcRate.toFixed(1)}%</p></div>
          <div className="text-center p-3 rounded-lg border"><p className="text-xs text-muted-foreground">Adesão SVD</p><p className="text-2xl font-bold" style={{ color: svdRate >= 80 ? "hsl(var(--success))" : svdRate >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))" }}>{svdRate.toFixed(1)}%</p></div>
          <div className="text-center p-3 rounded-lg border"><div className="flex items-center justify-center gap-1 mb-1"><CheckCircle className="h-4 w-4 text-success" /><p className="text-xs text-muted-foreground">Conformes</p></div><p className="text-2xl font-bold text-success">{Number(form.cvcCompleteBundles || 0) + Number(form.svdCompleteBundles || 0)}</p></div>
          <div className="text-center p-3 rounded-lg border"><div className="flex items-center justify-center gap-1 mb-1"><XCircle className="h-4 w-4 text-destructive" /><p className="text-xs text-muted-foreground">Inconformes</p></div><p className="text-2xl font-bold text-destructive">{Number(form.cvcIncompleteBundles || 0) + Number(form.svdIncompleteBundles || 0)}</p></div>
        </CardContent>
      </Card>

      <Separator />
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Auditoria
        </Button>
      </div>
    </div>
  );
}
