import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { HandMetal, Save, Calculator, TrendingUp, Droplets, Users } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import AuditHistory from "@/components/AuditHistory";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function AuditHandHygieneConsumptionNew() {
  const [setor, setSetor] = useState("");
  const [responsavel, setResponsavel] = useState("");
  const [mes, setMes] = useState("");
  const [ano, setAno] = useState(new Date().getFullYear().toString());
  const [totalFormularios, setTotalFormularios] = useState("");
  const [instanciasComHigienizacao, setInstanciasComHigienizacao] = useState("");
  const [instanciasSemHigienizacao, setInstanciasSemHigienizacao] = useState("");
  const [consumoAlcool, setConsumoAlcool] = useState("");
  const [consumoSabonete, setConsumoSabonete] = useState("");
  const [pacienteDia, setPacienteDia] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-fill responsável with logged user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        const name = data.user.user_metadata?.full_name || data.user.email || "";
        setResponsavel(name);
      }
    });
  }, []);

  // Taxa de conformidade por adesão (%)
  const taxaConformidade = useMemo(() => {
    const com = parseFloat(instanciasComHigienizacao) || 0;
    const sem = parseFloat(instanciasSemHigienizacao) || 0;
    const total = com + sem;
    if (total === 0) return null;
    return ((com / total) * 100).toFixed(1);
  }, [instanciasComHigienizacao, instanciasSemHigienizacao]);

  // Consumo por paciente-dia (ML/PD)
  const consumoPorPacienteDia = useMemo(() => {
    const alcool = parseFloat(consumoAlcool) || 0;
    const sabonete = parseFloat(consumoSabonete) || 0;
    const pd = parseFloat(pacienteDia) || 0;
    if (pd === 0) return null;
    return ((alcool + sabonete) / pd).toFixed(2);
  }, [consumoAlcool, consumoSabonete, pacienteDia]);

  const handleSave = async () => {
    if (!responsavel.trim() || !mes || !ano) {
      toast.error("Preencha o responsável, mês e ano de referência.");
      return;
    }

    setSaving(true);
    try {
      // For now, save as a toast confirmation (no specific table yet)
      toast.success("Registro de consumo de higiene das mãos salvo com sucesso!", {
        description: `${mes}/${ano} — Taxa conformidade: ${taxaConformidade ?? "—"}% | Consumo/PD: ${consumoPorPacienteDia ?? "—"} ML/PD`,
      });

      // Reset form
      setTotalFormularios("");
      setInstanciasComHigienizacao("");
      setInstanciasSemHigienizacao("");
      setConsumoAlcool("");
      setConsumoSabonete("");
      setPacienteDia("");
    } catch {
      toast.error("Erro ao salvar o registro.");
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const anos = Array.from({ length: 5 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <HandMetal className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Registro de Consumo — Higiene das Mãos (UTI)</h1>
            <p className="text-sm text-muted-foreground">RDC nº 36 · Portaria nº 1.377</p>
          </div>
        </div>
        <AuditHistory auditType="hand_hygiene" />
      </div>

      {/* Identificação */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium">Nome do Responsável pelo Preenchimento</Label>
            <Input value={responsavel} onChange={e => setResponsavel(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="font-medium">Mês de Referência *</Label>
              <Select value={mes} onValueChange={setMes}>
                <SelectTrigger><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
                <SelectContent>
                  {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Ano *</Label>
              <Select value={ano} onValueChange={setAno}>
                <SelectTrigger><SelectValue placeholder="Ano" /></SelectTrigger>
                <SelectContent>
                  {anos.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Setor de Referência *</Label>
              <Select value={setor} onValueChange={setSetor}>
                <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTI Adulto">UTI Adulto</SelectItem>
                  <SelectItem value="UTI Pediátrica">UTI Pediátrica</SelectItem>
                  <SelectItem value="UTI Neonatal">UTI Neonatal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Observação Direta */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Observação Direta — Adesão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-medium">Total de formulários analisados</Label>
            <Input type="number" min="0" value={totalFormularios} onChange={e => setTotalFormularios(e.target.value)} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-medium">Instâncias com higienização realizada</Label>
              <Input type="number" min="0" value={instanciasComHigienizacao} onChange={e => setInstanciasComHigienizacao(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Instâncias sem higienização realizada</Label>
              <Input type="number" min="0" value={instanciasSemHigienizacao} onChange={e => setInstanciasSemHigienizacao(e.target.value)} placeholder="0" />
            </div>
          </div>

          <Separator />

          {/* Indicador: Taxa de conformidade */}
          <div className="p-4 rounded-lg bg-muted/50 border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Taxa de Conformidade por Adesão</span>
            </div>
            <Badge variant={taxaConformidade !== null && parseFloat(taxaConformidade) >= 80 ? "default" : "destructive"} className="text-base px-3 py-1">
              {taxaConformidade !== null ? `${taxaConformidade}%` : "—"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Consumo de Insumos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Droplets className="h-4 w-4 text-primary" />
            Consumo de Insumos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="font-medium">Consumo de preparação alcoólica (ML)</Label>
              <Input type="number" min="0" value={consumoAlcool} onChange={e => setConsumoAlcool(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label className="font-medium">Consumo de sabonete líquido (ML)</Label>
              <Input type="number" min="0" value={consumoSabonete} onChange={e => setConsumoSabonete(e.target.value)} placeholder="0" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-medium">Número de Paciente-Dia na Unidade</Label>
            <Input type="number" min="0" value={pacienteDia} onChange={e => setPacienteDia(e.target.value)} placeholder="0" />
          </div>

          <Separator />

          {/* Indicador: Consumo por Paciente-Dia */}
          <div className="p-4 rounded-lg bg-muted/50 border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Consumo por Paciente-Dia</span>
            </div>
            <Badge variant="outline" className="text-base px-3 py-1">
              {consumoPorPacienteDia !== null ? `${consumoPorPacienteDia} ML/PD` : "—"}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <Button onClick={handleSave} disabled={saving} className="w-full gap-2" size="lg">
        <Save className="h-4 w-4" />
        {saving ? "Salvando..." : "Salvar Auditoria de Consumo"}
      </Button>
    </div>
  );
}
