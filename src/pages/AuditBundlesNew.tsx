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
import AuditHistory from "@/components/AuditHistory";

const sectors = ["UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica Contêiner", "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto"];
const months = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

function AdherenceBadge({ rate }: { rate: number }) {
  const color = rate >= 80 ? "bg-success text-success-foreground" : rate >= 50 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground";
  return <Badge className={`${color} text-lg px-4 py-1`}>{rate.toFixed(1)}%</Badge>;
}

function calcRate(open: string, complete: string) {
  const o = Number(open);
  const c = Number(complete);
  return !o ? 0 : (c / o) * 100;
}

interface BundleSectionProps {
  title: string;
  description: string;
  patientLabel: string;
  rate: number;
  patients: string;
  bundlesOpen: string;
  incompleteBundles: string;
  completeBundles: string;
  onPatients: (v: string) => void;
  onBundlesOpen: (v: string) => void;
  onIncompleteBundles: (v: string) => void;
  onCompleteBundles: (v: string) => void;
}

function BundleSection({ title, description, patientLabel, rate, patients, bundlesOpen, incompleteBundles, completeBundles, onPatients, onBundlesOpen, onIncompleteBundles, onCompleteBundles }: BundleSectionProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle className="text-lg">{title}</CardTitle><CardDescription>{description}</CardDescription></div>
        <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Taxa:</span><AdherenceBadge rate={rate} /></div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2"><Label>{patientLabel}</Label><Input type="number" min="0" value={patients} onChange={e => onPatients(e.target.value)} /></div>
        <div className="space-y-2"><Label>Bundles abertos</Label><Input type="number" min="0" value={bundlesOpen} onChange={e => onBundlesOpen(e.target.value)} /></div>
        <div className="space-y-2"><Label>Bundles com inconformidades</Label><Input type="number" min="0" value={incompleteBundles} onChange={e => onIncompleteBundles(e.target.value)} /></div>
        <div className="space-y-2"><Label>Bundles conformes</Label><Input type="number" min="0" value={completeBundles} onChange={e => onCompleteBundles(e.target.value)} /></div>
      </CardContent>
    </Card>
  );
}

const emptyForm = {
  employeeName: "", auditDate: "", surveillanceMonth: "", sector: "",
  cvcPatients: "", cvcBundlesOpen: "", cvcIncompleteBundles: "", cvcCompleteBundles: "",
  svdPatients: "", svdBundlesOpen: "", svdCompleteBundles: "", svdIncompleteBundles: "",
  piccPatients: "", piccBundlesOpen: "", piccIncompleteBundles: "", piccCompleteBundles: "",
  cvuPatients: "", cvuBundlesOpen: "", cvuIncompleteBundles: "", cvuCompleteBundles: "",
  cvaPatients: "", cvaBundlesOpen: "", cvaIncompleteBundles: "", cvaCompleteBundles: "",
  pavPacientesDia: "", pavDiasPreenchidos: "", pavNaoConforme: "",
  observations: "",
};

export default function AuditBundlesNew() {
  const navigate = useNavigate();
  const { saveAudit } = useAuditSave();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));
  const setSelect = (field: string) => (v: string) =>
    setForm(p => ({ ...p, [field]: v }));
  const setField = (field: string) => (v: string) =>
    setForm(p => ({ ...p, [field]: v }));

  const isNeonatal = form.sector === "UTI Neonatal";

  const cvcRate = useMemo(() => calcRate(form.cvcBundlesOpen, form.cvcCompleteBundles), [form.cvcBundlesOpen, form.cvcCompleteBundles]);
  const svdRate = useMemo(() => calcRate(form.svdBundlesOpen, form.svdCompleteBundles), [form.svdBundlesOpen, form.svdCompleteBundles]);
  const piccRate = useMemo(() => calcRate(form.piccBundlesOpen, form.piccCompleteBundles), [form.piccBundlesOpen, form.piccCompleteBundles]);
  const cvuRate = useMemo(() => calcRate(form.cvuBundlesOpen, form.cvuCompleteBundles), [form.cvuBundlesOpen, form.cvuCompleteBundles]);
  const cvaRate = useMemo(() => calcRate(form.cvaBundlesOpen, form.cvaCompleteBundles), [form.cvaBundlesOpen, form.cvaCompleteBundles]);

  const pavConformes = Math.max(0, Number(form.pavDiasPreenchidos || 0) - Number(form.pavNaoConforme || 0));
  const pavRate = useMemo(() => {
    const dias = Number(form.pavDiasPreenchidos);
    return !dias ? 0 : (pavConformes / dias) * 100;
  }, [form.pavDiasPreenchidos, pavConformes]);

  const totalConformes = Number(form.cvcCompleteBundles || 0) + Number(form.svdCompleteBundles || 0) + pavConformes
    + (isNeonatal ? Number(form.piccCompleteBundles || 0) + Number(form.cvuCompleteBundles || 0) + Number(form.cvaCompleteBundles || 0) : 0);
  const totalInconformes = Number(form.cvcIncompleteBundles || 0) + Number(form.svdIncompleteBundles || 0) + Number(form.pavNaoConforme || 0)
    + (isNeonatal ? Number(form.piccIncompleteBundles || 0) + Number(form.cvuIncompleteBundles || 0) + Number(form.cvaIncompleteBundles || 0) : 0);

  const handleSave = async () => {
    if (!form.employeeName || !form.auditDate || !form.sector) {
      toast.error("Preencha nome, data e setor.");
      return;
    }
    setSaving(true);

    const items: { question: string; status: "compliant" | "non_compliant"; category: string; item_order: number }[] = [
      { question: `CVC: ${form.cvcPatients} pacientes, ${form.cvcBundlesOpen} bundles abertos`, status: Number(form.cvcCompleteBundles) >= Number(form.cvcBundlesOpen) ? "compliant" : "non_compliant", category: "CVC", item_order: 1 },
      { question: `CVC Conformes: ${form.cvcCompleteBundles}`, status: "compliant", category: "CVC", item_order: 2 },
      { question: `CVC Inconformes: ${form.cvcIncompleteBundles}`, status: Number(form.cvcIncompleteBundles) > 0 ? "non_compliant" : "compliant", category: "CVC", item_order: 3 },
      { question: `SVD: ${form.svdPatients} pacientes, ${form.svdBundlesOpen} bundles abertos`, status: Number(form.svdCompleteBundles) >= Number(form.svdBundlesOpen) ? "compliant" : "non_compliant", category: "SVD", item_order: 4 },
      { question: `SVD Conformes: ${form.svdCompleteBundles}`, status: "compliant", category: "SVD", item_order: 5 },
      { question: `SVD Inconformes: ${form.svdIncompleteBundles}`, status: Number(form.svdIncompleteBundles) > 0 ? "non_compliant" : "compliant", category: "SVD", item_order: 6 },
    ];

    // PAV items
    const pavOrder = 7;
    items.push(
      { question: `PAV: ${form.pavPacientesDia} pacientes-dia em VM, ${form.pavDiasPreenchidos} dias preenchidos`, status: Number(form.pavNaoConforme) > 0 ? "non_compliant" : "compliant", category: "PAV", item_order: pavOrder },
      { question: `PAV Conformes: ${pavConformes}`, status: "compliant", category: "PAV", item_order: pavOrder + 1 },
      { question: `PAV Não Conforme: ${form.pavNaoConforme}`, status: Number(form.pavNaoConforme) > 0 ? "non_compliant" : "compliant", category: "PAV", item_order: pavOrder + 2 },
    );

    if (isNeonatal) {
      let order = 10;
      for (const [prefix, label] of [["picc", "PICC"], ["cvu", "CVU"], ["cva", "CVA"]] as const) {
        const p = form[`${prefix}Patients` as keyof typeof form];
        const o = form[`${prefix}BundlesOpen` as keyof typeof form];
        const c = form[`${prefix}CompleteBundles` as keyof typeof form];
        const i = form[`${prefix}IncompleteBundles` as keyof typeof form];
        items.push(
          { question: `${label}: ${p} pacientes, ${o} bundles abertos`, status: Number(c) >= Number(o) ? "compliant" : "non_compliant", category: label, item_order: order++ },
          { question: `${label} Conformes: ${c}`, status: "compliant", category: label, item_order: order++ },
          { question: `${label} Inconformes: ${i}`, status: Number(i) > 0 ? "non_compliant" : "compliant", category: label, item_order: order++ },
        );
      }
    }

    const ok = await saveAudit({
      auditType: "bundles",
      auditDate: form.auditDate,
      sector: form.sector,
      observations: `${form.employeeName} | Mês: ${form.surveillanceMonth}\n${form.observations}`,
      items,
    });
    setSaving(false);
    if (ok) {
      setForm({ ...emptyForm });
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-2xl font-bold">Auditoria de Bundles</h1>
            <p className="text-muted-foreground text-sm">Registro de conformidade de protocolos de cateter</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <AuditHistory auditType="bundles" onEdit={(record) => {
            toast.info("Carregando dados para edição...");
            // Parse observations to extract form data
            const obs = record.observations || "";
            const parts = obs.split("\n");
            const header = parts[0] || "";
            const nameMatch = header.split("|")[0]?.trim();
            const monthMatch = header.match(/Mês:\s*(\w+)/)?.[1] || "";
            setForm(prev => ({
              ...prev,
              employeeName: nameMatch || "",
              auditDate: record.audit_date || "",
              surveillanceMonth: monthMatch,
              sector: record.sector || "",
              observations: parts.slice(1).join("\n").trim(),
            }));
            window.scrollTo(0, 0);
          }} />
          <Button variant="outline" className="gap-2" onClick={() => navigate("/dashboard/bundles-compliance")}>
            <BarChart3 className="h-4 w-4" /><span className="hidden sm:inline">Ver Dashboard</span>
          </Button>
        </div>
      </div>

      {/* Identificação */}
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

      {/* CVC */}
      <BundleSection
        title="Cateter Venoso Central (CVC)"
        description="Dados de conformidade do protocolo CVC"
        patientLabel="Nº pacientes com CVC"
        rate={cvcRate}
        patients={form.cvcPatients} bundlesOpen={form.cvcBundlesOpen}
        incompleteBundles={form.cvcIncompleteBundles} completeBundles={form.cvcCompleteBundles}
        onPatients={setField("cvcPatients")} onBundlesOpen={setField("cvcBundlesOpen")}
        onIncompleteBundles={setField("cvcIncompleteBundles")} onCompleteBundles={setField("cvcCompleteBundles")}
      />

      {/* SVD */}
      <BundleSection
        title="Sonda Vesical de Demora (SVD)"
        description="Dados de conformidade do protocolo SVD"
        patientLabel="Nº pacientes com SVD"
        rate={svdRate}
        patients={form.svdPatients} bundlesOpen={form.svdBundlesOpen}
        incompleteBundles={form.svdIncompleteBundles} completeBundles={form.svdCompleteBundles}
        onPatients={setField("svdPatients")} onBundlesOpen={setField("svdBundlesOpen")}
        onIncompleteBundles={setField("svdIncompleteBundles")} onCompleteBundles={setField("svdCompleteBundles")}
      />

      {/* Seções exclusivas UTI Neonatal */}
      {isNeonatal && (
        <>
          <BundleSection
            title="Inserção de Cateter PICC"
            description="Dados de conformidade do protocolo PICC"
            patientLabel="Nº pacientes com PICC"
            rate={piccRate}
            patients={form.piccPatients} bundlesOpen={form.piccBundlesOpen}
            incompleteBundles={form.piccIncompleteBundles} completeBundles={form.piccCompleteBundles}
            onPatients={setField("piccPatients")} onBundlesOpen={setField("piccBundlesOpen")}
            onIncompleteBundles={setField("piccIncompleteBundles")} onCompleteBundles={setField("piccCompleteBundles")}
          />

          <BundleSection
            title="Inserção de Cateter Venoso Umbilical (CVU)"
            description="Dados de conformidade do protocolo CVU"
            patientLabel="Nº pacientes com CVU"
            rate={cvuRate}
            patients={form.cvuPatients} bundlesOpen={form.cvuBundlesOpen}
            incompleteBundles={form.cvuIncompleteBundles} completeBundles={form.cvuCompleteBundles}
            onPatients={setField("cvuPatients")} onBundlesOpen={setField("cvuBundlesOpen")}
            onIncompleteBundles={setField("cvuIncompleteBundles")} onCompleteBundles={setField("cvuCompleteBundles")}
          />

          <BundleSection
            title="Inserção de Cateter Venoso Arterial (CVA)"
            description="Dados de conformidade do protocolo CVA"
            patientLabel="Nº pacientes com CVA"
            rate={cvaRate}
            patients={form.cvaPatients} bundlesOpen={form.cvaBundlesOpen}
            incompleteBundles={form.cvaIncompleteBundles} completeBundles={form.cvaCompleteBundles}
            onPatients={setField("cvaPatients")} onBundlesOpen={setField("cvaBundlesOpen")}
            onIncompleteBundles={setField("cvaIncompleteBundles")} onCompleteBundles={setField("cvaCompleteBundles")}
          />
        </>
      )}

      {/* PAV */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="text-lg">Prevenção de PAV</CardTitle><CardDescription>Pneumonia Associada à Ventilação Mecânica</CardDescription></div>
          <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /><span className="text-sm text-muted-foreground">Taxa:</span><AdherenceBadge rate={pavRate} /></div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Nº pacientes-dia em V.M</Label><Input type="number" min="0" value={form.pavPacientesDia} onChange={set("pavPacientesDia")} /></div>
          <div className="space-y-2"><Label>Nº de dias preenchidos</Label><Input type="number" min="0" value={form.pavDiasPreenchidos} onChange={set("pavDiasPreenchidos")} /></div>
          <div className="space-y-2"><Label>Não Conforme</Label><Input type="number" min="0" value={form.pavNaoConforme} onChange={set("pavNaoConforme")} /></div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Observações</CardTitle></CardHeader>
        <CardContent><Textarea placeholder="Observações sobre não conformidades..." className="min-h-[100px]" value={form.observations} onChange={set("observations")} /></CardContent>
      </Card>

      {/* Resumo */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Resumo da Auditoria</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryItem label="Adesão CVC" value={cvcRate} />
            <SummaryItem label="Adesão SVD" value={svdRate} />
            <SummaryItem label="Adesão PAV" value={pavRate} />
            {isNeonatal && <SummaryItem label="Adesão PICC" value={piccRate} />}
            {isNeonatal && <SummaryItem label="Adesão CVU" value={cvuRate} />}
            {isNeonatal && <SummaryItem label="Adesão CVA" value={cvaRate} />}
            <div className="text-center p-3 rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1"><CheckCircle className="h-4 w-4 text-success" /><p className="text-xs text-muted-foreground">Conformes</p></div>
              <p className="text-2xl font-bold text-success">{totalConformes}</p>
            </div>
            <div className="text-center p-3 rounded-lg border">
              <div className="flex items-center justify-center gap-1 mb-1"><XCircle className="h-4 w-4 text-destructive" /><p className="text-xs text-muted-foreground">Inconformes</p></div>
              <p className="text-2xl font-bold text-destructive">{totalInconformes}</p>
            </div>
          </div>
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

function SummaryItem({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "hsl(var(--success))" : value >= 50 ? "hsl(var(--warning))" : "hsl(var(--destructive))";
  return (
    <div className="text-center p-3 rounded-lg border">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value.toFixed(1)}%</p>
    </div>
  );
}
