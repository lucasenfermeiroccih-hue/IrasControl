import { useState, useCallback, useMemo } from "react";
import { format } from "date-fns";
import { CalendarIcon, Save, RotateCcw, Activity, Baby } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { inputFields, calculatedFields, mesesOptions, setorOptions } from "@/data/indicadores-config";
import { useIndicadorCalculos, type IndicadorInputs } from "@/hooks/useIndicadorCalculos";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

const defaultInputs: Record<string, number> = {};
inputFields
  .filter((f) => f.type === "number")
  .forEach((f) => { defaultInputs[f.id] = 0; });

const neonatalWeightCategories = [
  { id: "pesoMenor750", label: "Menor que 750g" },
  { id: "peso750a999", label: "750g a 999g" },
  { id: "peso1000a1499", label: "1.000g a 1.499g" },
  { id: "peso1500a2499", label: "1.500g a 2.499g" },
  { id: "pesoMaiorIgual2500", label: "≥ 2.500g" },
];

const defaultNeonatalWeights: Record<string, number> = {};
neonatalWeightCategories.forEach((c) => { defaultNeonatalWeights[c.id] = 0; });

export default function IndicadoresNew() {
  const { hospitalId, userId } = useHospitalContext();
  const [nome, setNome] = useState("");
  const [dataVigilancia, setDataVigilancia] = useState<Date>();
  const [mesVigilancia, setMesVigilancia] = useState("");
  const [anoVigilancia, setAnoVigilancia] = useState<number>(new Date().getFullYear());
  const [setor, setSetor] = useState("");
  const [numericValues, setNumericValues] = useState<Record<string, number>>({ ...defaultInputs });
  const [neonatalWeights, setNeonatalWeights] = useState<Record<string, number>>({ ...defaultNeonatalWeights });
  const [saving, setSaving] = useState(false);

  const isNeonatal = setor === "UTI Neonatal";

  const handleNumericChange = useCallback((id: string, raw: string) => {
    const val = raw === "" ? 0 : Number(raw);
    if (isNaN(val)) return;
    setNumericValues((prev) => ({ ...prev, [id]: val }));
  }, []);

  const handleWeightChange = useCallback((id: string, raw: string) => {
    const val = raw === "" ? 0 : Number(raw);
    if (isNaN(val)) return;
    setNeonatalWeights((prev) => ({ ...prev, [id]: val }));
  }, []);

  const totalPacienteDiaPorPeso = useMemo(
    () => Object.values(neonatalWeights).reduce((s, v) => s + v, 0),
    [neonatalWeights]
  );

  const calculados = useIndicadorCalculos(numericValues as unknown as IndicadorInputs);

  const handleClear = () => {
    setNome(""); setDataVigilancia(undefined); setMesVigilancia("");
    setAnoVigilancia(new Date().getFullYear()); setSetor("");
    setNumericValues({ ...defaultInputs });
    setNeonatalWeights({ ...defaultNeonatalWeights });
    toast.info("Formulário limpo");
  };

  const handleSave = async () => {
    if (!hospitalId || !userId) { toast.error("Faça login primeiro"); return; }
    if (!mesVigilancia || !setor) { toast.error("Selecione mês e setor"); return; }
    
    setSaving(true);
    const inputsToSave = isNeonatal
      ? { ...numericValues, neonatalPacienteDiaPorPeso: neonatalWeights }
      : numericValues;

    const { error } = await (supabase.from("indicadores_records" as any).insert as any)({
      hospital_id: hospitalId,
      user_id: userId,
      profissional: nome,
      data_vigilancia: dataVigilancia ? format(dataVigilancia, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
      mes_vigilancia: mesVigilancia,
      ano_vigilancia: anoVigilancia,
      setor,
      inputs: inputsToSave,
      calculated: calculados,
    });
    setSaving(false);

    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Indicadores salvos com sucesso!");
    handleClear();
    window.scrollTo(0, 0);
  };

  const formatValue = (v: number | null) => (v === null ? "—" : v.toFixed(2));

  const sectionGroups: Record<string, typeof inputFields> = {};
  inputFields.forEach((f) => {
    if (f.section === "Informações Gerais") return;
    if (!sectionGroups[f.section]) sectionGroups[f.section] = [];
    sectionGroups[f.section].push(f);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Novo Registro de Indicadores</h1>
            <p className="text-sm text-muted-foreground">Preencha os dados e os cálculos serão atualizados automaticamente</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleClear}><RotateCcw className="h-4 w-4 mr-2" /> Limpar</Button>
          <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4"><CardTitle className="text-lg">Informações Gerais</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do profissional" />
            </div>
            <div className="space-y-2">
              <Label>Data da Vigilância</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !dataVigilancia && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataVigilancia ? format(dataVigilancia, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dataVigilancia} onSelect={setDataVigilancia} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Mês da Vigilância</Label>
              <Select value={mesVigilancia} onValueChange={setMesVigilancia}>
                <SelectTrigger><SelectValue placeholder="Selecionar mês" /></SelectTrigger>
                <SelectContent>{mesesOptions.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="anoVigilancia">Ano da Vigilância</Label>
              <Input id="anoVigilancia" type="number" value={anoVigilancia} onChange={(e) => setAnoVigilancia(Number(e.target.value))} />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={setor} onValueChange={setSetor}>
                <SelectTrigger><SelectValue placeholder="Selecionar setor" /></SelectTrigger>
                <SelectContent>{setorOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isNeonatal && (
        <Card className="border-accent/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Baby className="h-5 w-5 text-primary" />
              Paciente-Dia por Peso (UTI Neonatal)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Informe a quantidade de paciente-dia por faixa de peso
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {neonatalWeightCategories.map((cat) => (
                <div key={cat.id} className="space-y-2">
                  <Label htmlFor={cat.id}>{cat.label}</Label>
                  <Input
                    id={cat.id}
                    type="number"
                    min={0}
                    step={1}
                    value={neonatalWeights[cat.id] || 0}
                    onChange={(e) => handleWeightChange(cat.id, e.target.value)}
                  />
                </div>
              ))}
              <div className="space-y-2">
                <Label className="font-semibold">Total Paciente-Dia por Peso</Label>
                <Input
                  readOnly
                  value={totalPacienteDiaPorPeso}
                  className="bg-muted font-semibold text-foreground"
                  tabIndex={-1}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {Object.entries(sectionGroups).map(([section, fields]) => (
        <Card key={section}>
          <CardHeader className="pb-4"><CardTitle className="text-lg">{section}</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fields.map((f) => {
                const neonatalLabelMap: Record<string, string> = {
                  utilizacaoCVC: "Utilização de CVC (PICC, CVU e CVA)",
                  infeccaoCVC: "Infecção de CVC (PICC, CVU e CVA)",
                };
                const label = isNeonatal && neonatalLabelMap[f.id] ? neonatalLabelMap[f.id] : f.label;
                return (
                  <div key={f.id} className="space-y-2">
                    <Label htmlFor={f.id}>{label}</Label>
                    <Input id={f.id} type="number" min={0} step={1} value={numericValues[f.id] || 0} onChange={(e) => handleNumericChange(f.id, e.target.value)} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Campos Calculados</CardTitle>
          <p className="text-sm text-muted-foreground">Valores atualizados automaticamente</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calculatedFields.map((cf) => (
              <div key={cf.id} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{cf.label}</Label>
                <Input readOnly value={formatValue((calculados as unknown as Record<string, number | null>)[cf.id])} className="bg-muted font-semibold text-foreground" tabIndex={-1} />
                <p className="text-[10px] text-muted-foreground/70">{cf.formula}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={handleClear}><RotateCcw className="h-4 w-4 mr-2" /> Limpar</Button>
        <Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-2" /> {saving ? "Salvando..." : "Salvar"}</Button>
      </div>
    </div>
  );
}