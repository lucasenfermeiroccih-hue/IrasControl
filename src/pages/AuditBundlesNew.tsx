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
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Activity } from "lucide-react";

const sectors = ["UTI Adulto", "UTI Neonatal", "UTI Pediátrica", "Clínica Médica", "Clínica Cirúrgica", "Pronto Socorro"];
const months = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function AdherenceBadge({ rate }: { rate: number }) {
  const color = rate >= 80 ? "bg-success text-success-foreground" : rate >= 50 ? "bg-warning text-warning-foreground" : "bg-destructive text-destructive-foreground";
  return <Badge className={`${color} text-lg px-4 py-1`}>{rate.toFixed(1)}%</Badge>;
}

export default function AuditBundlesNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    employeeName: "",
    auditDate: "",
    surveillanceMonth: "",
    sector: "",
    cvcPatients: "",
    cvcBundlesOpen: "",
    cvcIncompleteBundles: "",
    cvcCompleteBundles: "",
    svdPatients: "",
    svdBundlesOpen: "",
    svdCompleteBundles: "",
    svdIncompleteBundles: "",
    observations: "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const setSelect = (field: string) => (v: string) =>
    setForm((p) => ({ ...p, [field]: v }));

  const cvcRate = useMemo(() => {
    const open = Number(form.cvcBundlesOpen);
    const complete = Number(form.cvcCompleteBundles);
    if (!open || open === 0) return 0;
    return (complete / open) * 100;
  }, [form.cvcBundlesOpen, form.cvcCompleteBundles]);

  const svdRate = useMemo(() => {
    const open = Number(form.svdBundlesOpen);
    const complete = Number(form.svdCompleteBundles);
    if (!open || open === 0) return 0;
    return (complete / open) * 100;
  }, [form.svdBundlesOpen, form.svdCompleteBundles]);

  const handleSave = () => {
    if (!form.employeeName || !form.auditDate || !form.sector) {
      toast({ title: "Campos obrigatórios", description: "Preencha nome, data e setor.", variant: "destructive" });
      return;
    }
    toast({ title: "Auditoria salva!", description: "Os dados foram registrados com sucesso." });
    navigate("/dashboard");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Auditoria de Bundles CVC/SVD</h1>
          <p className="text-muted-foreground text-sm">Registro de conformidade de protocolos de cateter</p>
        </div>
      </div>

      {/* Identificação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Funcionário *</Label>
            <Input placeholder="Nome completo" value={form.employeeName} onChange={set("employeeName")} />
          </div>
          <div className="space-y-2">
            <Label>Data da Auditoria *</Label>
            <Input type="date" value={form.auditDate} onChange={set("auditDate")} />
          </div>
          <div className="space-y-2">
            <Label>Mês de Vigilância</Label>
            <Select value={form.surveillanceMonth} onValueChange={setSelect("surveillanceMonth")}>
              <SelectTrigger><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
              <SelectContent>{months.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Setor *</Label>
            <Select value={form.sector} onValueChange={setSelect("sector")}>
              <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
              <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* CVC */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Cateter Venoso Central (CVC)</CardTitle>
            <CardDescription>Dados de conformidade do protocolo CVC</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Taxa de Adesão:</span>
            <AdherenceBadge rate={cvcRate} />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nº de pacientes com CVC</Label>
            <Input type="number" min="0" placeholder="0" value={form.cvcPatients} onChange={set("cvcPatients")} />
          </div>
          <div className="space-y-2">
            <Label>Nº de bundles abertos</Label>
            <Input type="number" min="0" placeholder="0" value={form.cvcBundlesOpen} onChange={set("cvcBundlesOpen")} />
          </div>
          <div className="space-y-2">
            <Label>Bundles com inconformidades</Label>
            <Input type="number" min="0" placeholder="0" value={form.cvcIncompleteBundles} onChange={set("cvcIncompleteBundles")} />
          </div>
          <div className="space-y-2">
            <Label>Bundles confirmados (conformes)</Label>
            <Input type="number" min="0" placeholder="0" value={form.cvcCompleteBundles} onChange={set("cvcCompleteBundles")} />
          </div>
        </CardContent>
      </Card>

      {/* SVD */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Sonda Vesical de Demora (SVD)</CardTitle>
            <CardDescription>Dados de conformidade do protocolo SVD</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Taxa de Adesão:</span>
            <AdherenceBadge rate={svdRate} />
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nº de pacientes com SVD</Label>
            <Input type="number" min="0" placeholder="0" value={form.svdPatients} onChange={set("svdPatients")} />
          </div>
          <div className="space-y-2">
            <Label>Nº de bundles abertos</Label>
            <Input type="number" min="0" placeholder="0" value={form.svdBundlesOpen} onChange={set("svdBundlesOpen")} />
          </div>
          <div className="space-y-2">
            <Label>Bundles conformes</Label>
            <Input type="number" min="0" placeholder="0" value={form.svdCompleteBundles} onChange={set("svdCompleteBundles")} />
          </div>
          <div className="space-y-2">
            <Label>Bundles com inconformidade</Label>
            <Input type="number" min="0" placeholder="0" value={form.svdIncompleteBundles} onChange={set("svdIncompleteBundles")} />
          </div>
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Registre aqui observações sobre não conformidades encontradas..."
            className="min-h-[100px]"
            value={form.observations}
            onChange={set("observations")}
          />
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar Auditoria
        </Button>
      </div>
    </div>
  );
}
