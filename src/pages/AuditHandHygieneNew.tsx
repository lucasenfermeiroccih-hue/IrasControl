import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ClipboardCheck } from "lucide-react";

const units = ["UTI Adulto", "UTI Neonatal", "UTI Pediátrica", "Clínica Médica", "Clínica Cirúrgica", "Pronto Socorro", "Centro Cirúrgico", "Internação"];
const professionals = ["Médico(a)", "Enfermeiro(a)", "Técnico(a) de Enfermagem", "Fisioterapeuta", "Farmacêutico(a)", "Nutricionista", "Outro"];
const fiveMoments = [
  "1 — Antes do contato com o paciente",
  "2 — Antes de procedimento asséptico",
  "3 — Após risco de exposição a fluidos",
  "4 — Após contato com o paciente",
  "5 — Após contato com áreas próximas ao paciente",
];
const techniques = ["Álcool em gel", "Sabonete líquido", "Água e sabão", "Antisséptico degermante", "Não higienizou"];

export default function AuditHandHygieneNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    employeeName: "",
    auditDate: "",
    unit: "",
    professionalCategory: "",
    hasAdornments: false,
    fiveMomentsSituation: "",
    performedHygiene: true,
    techniqueUsed: "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const setSelect = (field: string) => (v: string) =>
    setForm((p) => ({ ...p, [field]: v }));

  const handleSave = () => {
    if (!form.employeeName || !form.auditDate || !form.unit || !form.fiveMomentsSituation) {
      toast({ title: "Campos obrigatórios", description: "Preencha todos os campos obrigatórios.", variant: "destructive" });
      return;
    }
    toast({ title: "Auditoria registrada!", description: "Os dados de higiene das mãos foram salvos." });
    // Reset form
    setForm({
      employeeName: "",
      auditDate: "",
      unit: "",
      professionalCategory: "",
      hasAdornments: false,
      fiveMomentsSituation: "",
      performedHygiene: true,
      techniqueUsed: "",
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Auditoria de Higienização das Mãos</h1>
          <p className="text-muted-foreground text-sm">Registro de conformidade dos 5 momentos da higiene</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Dados da Observação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Funcionário *</Label>
            <Input placeholder="Nome do colaborador observado" value={form.employeeName} onChange={set("employeeName")} />
          </div>
          <div className="space-y-2">
            <Label>Data da Realização *</Label>
            <Input type="date" value={form.auditDate} onChange={set("auditDate")} />
          </div>
          <div className="space-y-2">
            <Label>Unidade *</Label>
            <Select value={form.unit} onValueChange={setSelect("unit")}>
              <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
              <SelectContent>{units.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Profissional Visualizado</Label>
            <Select value={form.professionalCategory} onValueChange={setSelect("professionalCategory")}>
              <SelectTrigger><SelectValue placeholder="Categoria profissional" /></SelectTrigger>
              <SelectContent>{professionals.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Avaliação da Higienização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">Possui adornos?</Label>
              <p className="text-sm text-muted-foreground">Anéis, pulseiras, relógios ou unhas artificiais</p>
            </div>
            <Switch checked={form.hasAdornments} onCheckedChange={(v) => setForm((p) => ({ ...p, hasAdornments: v }))} />
          </div>

          <div className="space-y-2">
            <Label>Situação — 5 Momentos *</Label>
            <Select value={form.fiveMomentsSituation} onValueChange={setSelect("fiveMomentsSituation")}>
              <SelectTrigger><SelectValue placeholder="Selecione o momento observado" /></SelectTrigger>
              <SelectContent>{fiveMoments.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div>
              <Label className="text-base">Higienizou?</Label>
              <p className="text-sm text-muted-foreground">O profissional realizou a higienização das mãos</p>
            </div>
            <Switch checked={form.performedHygiene} onCheckedChange={(v) => setForm((p) => ({ ...p, performedHygiene: v }))} />
          </div>

          <div className="space-y-2">
            <Label>Qual a Técnica?</Label>
            <Select value={form.techniqueUsed} onValueChange={setSelect("techniqueUsed")}>
              <SelectTrigger><SelectValue placeholder="Selecione a técnica utilizada" /></SelectTrigger>
              <SelectContent>{techniques.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSave} className="gap-2">
          <ClipboardCheck className="h-4 w-4" />
          Registrar Auditoria
        </Button>
      </div>
    </div>
  );
}
