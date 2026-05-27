import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { useAuditSave } from "@/hooks/useAuditSave";
import { useHospitalEmployees } from "@/hooks/useHospitalEmployees";
import AuditHistory from "@/components/AuditHistory";

const units = ["UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica Contêiner", "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto"];
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
  const { saveAudit } = useAuditSave();
  const { employees } = useHospitalEmployees();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    employeeName: "", auditDate: "", unit: "", professionalCategory: "",
    hasAdornments: false, fiveMomentsSituation: "", performedHygiene: true, techniqueUsed: "",
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [field]: e.target.value }));
  const setSelect = (field: string) => (v: string) =>
    setForm(p => ({ ...p, [field]: v }));

  const handleSave = async () => {
    if (!form.employeeName || !form.auditDate || !form.unit || !form.fiveMomentsSituation) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    setSaving(true);
    const items = [
      { question: `Momento: ${form.fiveMomentsSituation}`, status: form.performedHygiene ? "compliant" as const : "non_compliant" as const, category: "Higiene", item_order: 1 },
      { question: `Adornos: ${form.hasAdornments ? "Sim" : "Não"}`, status: form.hasAdornments ? "non_compliant" as const : "compliant" as const, category: "Adornos", item_order: 2 },
      { question: `Técnica: ${form.techniqueUsed || "Não informada"}`, status: form.techniqueUsed && form.techniqueUsed !== "Não higienizou" ? "compliant" as const : "non_compliant" as const, category: "Técnica", item_order: 3 },
    ];
    const ok = await saveAudit({
      auditType: "hand_hygiene",
      auditDate: form.auditDate,
      sector: form.unit,
      observations: `Funcionário: ${form.employeeName} | Profissional: ${form.professionalCategory}`,
      items,
    });
    setSaving(false);
    if (ok) {
      setForm({ employeeName: "", auditDate: "", unit: "", professionalCategory: "", hasAdornments: false, fiveMomentsSituation: "", performedHygiene: true, techniqueUsed: "" });
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Auditoria de Higienização das Mãos</h1>
            <p className="text-muted-foreground text-sm">Registro de conformidade dos 5 momentos da higiene</p>
          </div>
        </div>
        <AuditHistory auditType="hand_hygiene" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Dados da Observação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Funcionário *</Label>
            <Select value={form.employeeName} onValueChange={setSelect("employeeName")}>
              <SelectTrigger><SelectValue placeholder={employees.length ? "Selecione o funcionário" : "Nenhum funcionário cadastrado"} /></SelectTrigger>
              <SelectContent>{employees.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Data *</Label><Input type="date" value={form.auditDate} onChange={set("auditDate")} /></div>
          <div className="space-y-2">
            <Label>Unidade *</Label>
            <Select value={form.unit} onValueChange={setSelect("unit")}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{units.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select value={form.professionalCategory} onValueChange={setSelect("professionalCategory")}>
              <SelectTrigger><SelectValue placeholder="Categoria" /></SelectTrigger>
              <SelectContent>{professionals.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Avaliação</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div><Label className="text-base">Possui adornos?</Label><p className="text-sm text-muted-foreground">Anéis, pulseiras, relógios ou unhas artificiais</p></div>
            <Switch checked={form.hasAdornments} onCheckedChange={v => setForm(p => ({ ...p, hasAdornments: v }))} />
          </div>
          <div className="space-y-2">
            <Label>Situação — 5 Momentos *</Label>
            <Select value={form.fiveMomentsSituation} onValueChange={setSelect("fiveMomentsSituation")}>
              <SelectTrigger><SelectValue placeholder="Selecione o momento" /></SelectTrigger>
              <SelectContent>{fiveMoments.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Higienizou? *</Label>
            <Select value={form.performedHygiene ? "sim" : "nao"} onValueChange={v => setForm(p => ({ ...p, performedHygiene: v === "sim" }))}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Técnica?</Label>
            <Select value={form.techniqueUsed} onValueChange={setSelect("techniqueUsed")}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{techniques.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardCheck className="h-4 w-4" />}
          Registrar Auditoria
        </Button>
      </div>
    </div>
  );
}
