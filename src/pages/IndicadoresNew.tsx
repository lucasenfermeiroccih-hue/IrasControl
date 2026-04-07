import { useState, useCallback } from "react";
import { format } from "date-fns";
import { CalendarIcon, Save, RotateCcw, Activity } from "lucide-react";
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

const defaultInputs: Record<string, number> = {};
inputFields
  .filter((f) => f.type === "number")
  .forEach((f) => { defaultInputs[f.id] = 0; });

export default function IndicadoresNew() {
  const [nome, setNome] = useState("");
  const [dataVigilancia, setDataVigilancia] = useState<Date>();
  const [mesVigilancia, setMesVigilancia] = useState("");
  const [anoVigilancia, setAnoVigilancia] = useState<number>(new Date().getFullYear());
  const [setor, setSetor] = useState("");
  const [numericValues, setNumericValues] = useState<Record<string, number>>({ ...defaultInputs });

  const handleNumericChange = useCallback((id: string, raw: string) => {
    const val = raw === "" ? 0 : Number(raw);
    if (isNaN(val)) return;
    setNumericValues((prev) => ({ ...prev, [id]: val }));
  }, []);

  const calculados = useIndicadorCalculos(numericValues as unknown as IndicadorInputs);

  const handleClear = () => {
    setNome("");
    setDataVigilancia(undefined);
    setMesVigilancia("");
    setAnoVigilancia(new Date().getFullYear());
    setSetor("");
    setNumericValues({ ...defaultInputs });
    toast.info("Formulário limpo");
  };

  const handleSave = () => {
    toast.success("Indicadores salvos com sucesso (mock)");
    window.scrollTo(0, 0);
  };

  const formatValue = (v: number | null) => (v === null ? "—" : v.toFixed(2));

  // Group input fields by section (excluding Informações Gerais)
  const sectionGroups: Record<string, typeof inputFields> = {};
  inputFields.forEach((f) => {
    if (f.section === "Informações Gerais") return;
    if (!sectionGroups[f.section]) sectionGroups[f.section] = [];
    sectionGroups[f.section].push(f);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <Button variant="outline" onClick={handleClear}>
            <RotateCcw className="h-4 w-4 mr-2" /> Limpar
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" /> Salvar
          </Button>
        </div>
      </div>

      {/* Informações Gerais */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do registro" />
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
                <SelectContent>
                  {mesesOptions.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
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
                <SelectContent>
                  {setorOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dynamic numeric sections */}
      {Object.entries(sectionGroups).map(([section, fields]) => (
        <Card key={section}>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">{section}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fields.map((f) => (
                <div key={f.id} className="space-y-2">
                  <Label htmlFor={f.id}>{f.label}</Label>
                  <Input
                    id={f.id}
                    type="number"
                    min={0}
                    step={1}
                    value={numericValues[f.id] || 0}
                    onChange={(e) => handleNumericChange(f.id, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Calculated fields */}
      <Card className="border-primary/20">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Campos Calculados
          </CardTitle>
          <p className="text-sm text-muted-foreground">Valores atualizados automaticamente com base nos dados informados</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {calculatedFields.map((cf) => (
              <div key={cf.id} className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">{cf.label}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={formatValue((calculados as unknown as Record<string, number | null>)[cf.id])}
                    className="bg-muted font-semibold text-foreground"
                    tabIndex={-1}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground/70">{cf.formula}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Bottom actions */}
      <div className="flex justify-end gap-2 pb-8">
        <Button variant="outline" onClick={handleClear}>
          <RotateCcw className="h-4 w-4 mr-2" /> Limpar Formulário
        </Button>
        <Button onClick={handleSave}>
          <Save className="h-4 w-4 mr-2" /> Salvar Indicadores
        </Button>
      </div>
    </div>
  );
}
