import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, Trash2, AlertTriangle, ShieldAlert, Loader2, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import AuditHistory from "@/components/AuditHistory";
import { ComboboxSearch } from "@/components/ComboboxSearch";
import { sampleCategories, materialsByCategory, sampleLocations, carbapenemaseTypes } from "@/data/sample-categories";
import { microorganismsList } from "@/data/microorganisms";

const sectors = [
  "UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica",
  "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica Contêiner",
  "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto",
];

const commonAntibiotics = [
  "Amicacina", "Ampicilina", "Aztreonam", "Cefepima", "Ceftazidima",
  "Ceftriaxona", "Ciprofloxacino", "Clindamicina", "Colistina",
  "Daptomicina", "Ertapenem", "Gentamicina", "Imipenem",
  "Levofloxacino", "Linezolida", "Meropenem", "Oxacilina",
  "Piperacilina/Tazobactam", "Polimixina B", "Sulfametoxazol/Trimetoprima",
  "Teicoplanina", "Tigeciclina", "Vancomicina",
];

const testMethods = ["Disco-difusão (Kirby-Bauer)", "CIM (Concentração Inibitória Mínima)"];

type SIR = "S" | "I" | "R" | "NT" | "";

interface AntibioticResult {
  id: string;
  antibiotic: string;
  method: string;
  micValue: string;
  sir: SIR;
}

const criticalPhenotypes = [
  { id: "mrsa", label: "MRSA", trigger: (org: string, results: AntibioticResult[]) => org.includes("Staphylococcus aureus") && results.some(r => r.antibiotic === "Oxacilina" && r.sir === "R") },
  { id: "vre", label: "VRE", trigger: (org: string, results: AntibioticResult[]) => org.includes("Enterococcus") && results.some(r => r.antibiotic === "Vancomicina" && r.sir === "R") },
  { id: "kpc", label: "KPC", trigger: (_org: string, results: AntibioticResult[]) => results.some(r => ["Meropenem", "Imipenem", "Ertapenem"].includes(r.antibiotic) && r.sir === "R") },
  { id: "esbl", label: "ESBL", trigger: (_org: string, results: AntibioticResult[]) => results.some(r => ["Ceftazidima", "Ceftriaxona", "Cefepima"].includes(r.antibiotic) && r.sir === "R") && results.some(r => ["Meropenem", "Imipenem"].includes(r.antibiotic) && r.sir === "S") },
];

const sirColor: Record<string, string> = {
  S: "bg-success text-success-foreground",
  I: "bg-warning text-warning-foreground",
  R: "bg-destructive text-destructive-foreground",
  NT: "bg-muted text-muted-foreground",
};
const sirLabel: Record<string, string> = {
  S: "Sensível Dose Padrão",
  I: "Sensível Aumentado Exposição",
  R: "Resistente",
  NT: "Não Testado",
};

let idCounter = 0;
const newId = () => `ab_${++idCounter}`;

const SIR_HELP_TEXT = `S = Sensível Dose Padrão: um microrganismo é categorizado como "Sensível Dose Padrão" quando há alta probabilidade de sucesso terapêutico na dose padrão.

I = Sensível Aumentado Exposição: Um microrganismo é categorizado como "Sensível Aumentado Exposição" quando há alta probabilidade de sucesso terapêutico se a exposição ao agente for aumentada (ex: ajuste da posologia ou local da infecção).

R = Resistente: alta probabilidade de falha terapêutica mesmo com exposição aumentada.

NT = Não Testado.`;

export default function AuditAntibiogramNew() {
  const navigate = useNavigate();
  const { hospitalId, userId } = useHospitalContext();
  const [saving, setSaving] = useState(false);

  // Identificação
  const [collectionDate, setCollectionDate] = useState("");
  const [sampleId, setSampleId] = useState("");
  const [sector, setSector] = useState("");
  const [patientId, setPatientId] = useState("");

  // Categoria / material / local
  const [sampleCategory, setSampleCategory] = useState("");
  const [sampleMaterial, setSampleMaterial] = useState("");
  const [locationEnabled, setLocationEnabled] = useState<"sim" | "nao" | "na">("na");
  const [locationDetail, setLocationDetail] = useState("");

  // Microrganismo
  const [organism, setOrganism] = useState("");

  // Fenótipos
  const [esbl, setEsbl] = useState<"sim" | "nao" | "ignorado">("ignorado");
  const [carbapenemase, setCarbapenemase] = useState<"sim" | "nao" | "ignorado">("ignorado");
  const [carbapenemaseType, setCarbapenemaseType] = useState("");

  // Resultados
  const [results, setResults] = useState<AntibioticResult[]>([]);

  const materialOptions = useMemo(
    () => (sampleCategory ? materialsByCategory[sampleCategory] ?? [] : []),
    [sampleCategory]
  );

  const handleCategoryChange = (v: string) => {
    setSampleCategory(v);
    setSampleMaterial("");
  };

  const addRow = useCallback(() => {
    setResults(p => [...p, { id: newId(), antibiotic: "", method: "", micValue: "", sir: "" }]);
  }, []);
  const removeRow = (id: string) => setResults(p => p.filter(r => r.id !== id));
  const updateRow = (id: string, field: keyof AntibioticResult, value: string) =>
    setResults(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const autoSIR = (row: AntibioticResult): SIR => {
    if (!row.micValue || !row.method) return row.sir;
    const val = Number(row.micValue);
    if (isNaN(val)) return row.sir;
    if (row.method.startsWith("Disco")) return val >= 21 ? "S" : val >= 16 ? "I" : "R";
    return val <= 2 ? "S" : val <= 8 ? "I" : "R";
  };

  const handleMicChange = (id: string, micValue: string) => {
    setResults(p => p.map(r => {
      if (r.id !== id) return r;
      const u = { ...r, micValue };
      // Auto-fill SIR only if user hasn't manually set one
      if (!r.sir || r.sir === "NT") u.sir = autoSIR(u);
      return u;
    }));
  };

  const handleMethodChange = (id: string, method: string) => {
    setResults(p => p.map(r => {
      if (r.id !== id) return r;
      const u = { ...r, method };
      if (u.micValue && (!r.sir || r.sir === "NT")) u.sir = autoSIR(u);
      return u;
    }));
  };

  const detectedPhenotypes = criticalPhenotypes.filter(p => p.trigger(organism, results));

  const handleSave = async () => {
    if (!collectionDate || !organism || !sampleCategory || !sampleMaterial || !hospitalId) {
      toast.error("Preencha data, categoria, material e microrganismo.");
      return;
    }
    if (results.length === 0) {
      toast.error("Adicione pelo menos um antimicrobiano.");
      return;
    }
    setSaving(true);

    const { data: labResult, error: labError } = await supabase
      .from("lab_results")
      .insert({
        hospital_id: hospitalId,
        collection_date: collectionDate,
        organism,
        sample_type: sampleMaterial,
        sample_category: sampleCategory,
        sample_material: sampleMaterial,
        sample_location_enabled: locationEnabled,
        sample_location_detail: locationEnabled === "sim" ? locationDetail : null,
        esbl,
        carbapenemase,
        carbapenemase_type: carbapenemase === "sim" ? carbapenemaseType : null,
        status: "completed" as any,
        notes: `Setor: ${sector} | Amostra: ${sampleId} | Paciente: ${patientId}`,
        created_by: userId,
      } as any)
      .select("id")
      .single();

    if (labError || !labResult) {
      toast.error("Erro ao salvar: " + (labError?.message || ""));
      setSaving(false);
      return;
    }

    const abResults = results.filter(r => r.antibiotic).map(r => ({
      lab_result_id: labResult.id,
      antibiotic: r.antibiotic,
      sensitivity: r.sir === "NT" || !r.sir ? "NT" : r.sir,
      sir_category: r.sir || "NT",
      mic_value: r.micValue ? Number(r.micValue) : null,
      notes: r.method || null,
    }));

    if (abResults.length > 0) {
      const { error: abError } = await supabase.from("antibiogram_results").insert(abResults as any);
      if (abError) {
        toast.error("Erro nos resultados: " + abError.message);
        setSaving(false);
        return;
      }
    }

    toast.success(`Antibiograma registrado! ${detectedPhenotypes.length > 0 ? "⚠️ Fenótipos críticos detectados!" : ""}`);
    setSaving(false);
    setCollectionDate(""); setSampleId(""); setSector(""); setPatientId("");
    setSampleCategory(""); setSampleMaterial(""); setLocationEnabled("na"); setLocationDetail("");
    setOrganism(""); setEsbl("ignorado"); setCarbapenemase("ignorado"); setCarbapenemaseType("");
    setResults([]);
    window.scrollTo(0, 0);
  };

  return (
    <TooltipProvider>
      <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-2xl font-bold">Registro de Antibiograma</h1>
              <p className="text-muted-foreground text-sm">Perfil de sensibilidade — BrCAST/EUCAST</p>
            </div>
          </div>
          <AuditHistory auditType="antibiogram" />
        </div>

        <Card>
          <CardHeader><CardTitle className="text-lg">Identificação da Coleta</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Data da Coleta *</Label><Input type="date" value={collectionDate} onChange={e => setCollectionDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>ID da Amostra</Label><Input placeholder="LAB-2026-0042" value={sampleId} onChange={e => setSampleId(e.target.value)} /></div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Amostra / Material</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria amostra / material *</Label>
                <Select value={sampleCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger><SelectValue placeholder="Selecione categoria" /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {sampleCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amostra / material *</Label>
                <Select value={sampleMaterial} onValueChange={setSampleMaterial} disabled={!sampleCategory}>
                  <SelectTrigger><SelectValue placeholder={sampleCategory ? "Selecione material" : "Selecione categoria primeiro"} /></SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {materialOptions.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Local da amostra</Label>
              <ToggleGroup type="single" value={locationEnabled} onValueChange={(v) => v && setLocationEnabled(v as any)} className="justify-start">
                <ToggleGroupItem value="sim">Sim</ToggleGroupItem>
                <ToggleGroupItem value="nao">Não</ToggleGroupItem>
                <ToggleGroupItem value="na">NA/CI</ToggleGroupItem>
              </ToggleGroup>
              {locationEnabled === "sim" && (
                <div className="pt-2">
                  <ComboboxSearch
                    options={sampleLocations}
                    value={locationDetail}
                    onValueChange={setLocationDetail}
                    placeholder="Selecione local anatômico"
                  />
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Identificação Paciente</Label>
              <Input placeholder="Código ou iniciais" value={patientId} onChange={e => setPatientId(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-lg">Microrganismo / Patógeno</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Microrganismo *</Label>
              <ComboboxSearch
                options={microorganismsList}
                value={organism}
                onValueChange={setOrganism}
                placeholder="Digite para buscar microrganismo"
              />
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Produtor de ESBL?</Label>
                <ToggleGroup type="single" value={esbl} onValueChange={(v) => v && setEsbl(v as any)} className="justify-start">
                  <ToggleGroupItem value="sim">Sim</ToggleGroupItem>
                  <ToggleGroupItem value="nao">Não</ToggleGroupItem>
                  <ToggleGroupItem value="ignorado">Ignorado</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-2">
                <Label>Produtor de carbapenemase?</Label>
                <ToggleGroup type="single" value={carbapenemase} onValueChange={(v) => v && setCarbapenemase(v as any)} className="justify-start">
                  <ToggleGroupItem value="sim">Sim</ToggleGroupItem>
                  <ToggleGroupItem value="nao">Não</ToggleGroupItem>
                  <ToggleGroupItem value="ignorado">Ignorado</ToggleGroupItem>
                </ToggleGroup>
                {carbapenemase === "sim" && (
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground">Tipo de carbapenemase</Label>
                    <Select value={carbapenemaseType} onValueChange={setCarbapenemaseType}>
                      <SelectTrigger><SelectValue placeholder="Selecione tipo" /></SelectTrigger>
                      <SelectContent>
                        {carbapenemaseTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {detectedPhenotypes.length > 0 && (
          <Card className="border-destructive bg-destructive/5">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <ShieldAlert className="h-6 w-6 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">⚠️ Fenótipos Críticos Detectados</p>
                  <ul className="mt-2 space-y-1">
                    {detectedPhenotypes.map(p => (
                      <li key={p.id} className="text-sm flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-destructive" />{p.label}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg">Resultados</CardTitle>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm whitespace-pre-line">
                    {SIR_HELP_TEXT}
                  </TooltipContent>
                </Tooltip>
              </div>
              <CardDescription>Antimicrobianos testados — MIC e categoria S/I/R/NT</CardDescription>
            </div>
            <Button size="sm" onClick={addRow} className="gap-1"><Plus className="h-4 w-4" />Adicionar</Button>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>Nenhum antimicrobiano.</p>
                <Button variant="outline" size="sm" onClick={addRow} className="mt-3 gap-1">
                  <Plus className="h-4 w-4" />Adicionar
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Antimicrobiano</TableHead>
                      <TableHead className="min-w-[180px]">Método</TableHead>
                      <TableHead className="min-w-[100px]">MIC</TableHead>
                      <TableHead className="min-w-[280px]">
                        <div className="flex items-center gap-1">
                          Categoria
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button type="button" className="text-muted-foreground hover:text-foreground">
                                <HelpCircle className="h-3.5 w-3.5" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm whitespace-pre-line">
                              {SIR_HELP_TEXT}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map(row => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <Select value={row.antibiotic} onValueChange={v => updateRow(row.id, "antibiotic", v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>{commonAntibiotics.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={row.method} onValueChange={v => handleMethodChange(row.id, v)}>
                            <SelectTrigger className="h-9"><SelectValue placeholder="Método" /></SelectTrigger>
                            <SelectContent>{testMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number" min="0" step="0.1"
                            placeholder={row.method.startsWith("Disco") ? "mm" : "µg/mL"}
                            className="h-9" value={row.micValue}
                            onChange={e => handleMicChange(row.id, e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <ToggleGroup
                            type="single"
                            value={row.sir}
                            onValueChange={v => v && updateRow(row.id, "sir", v)}
                            className="justify-start flex-wrap gap-1"
                          >
                            <ToggleGroupItem value="S" className="h-8 px-2 text-xs data-[state=on]:bg-success data-[state=on]:text-success-foreground" title="Sensível Dose Padrão">S</ToggleGroupItem>
                            <ToggleGroupItem value="I" className="h-8 px-2 text-xs data-[state=on]:bg-warning data-[state=on]:text-warning-foreground" title="Sensível Aumentado Exposição">I</ToggleGroupItem>
                            <ToggleGroupItem value="R" className="h-8 px-2 text-xs data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground" title="Resistente">R</ToggleGroupItem>
                            <ToggleGroupItem value="NT" className="h-8 px-2 text-xs" title="Não testado">NT</ToggleGroupItem>
                          </ToggleGroup>
                          {row.sir && (
                            <span className="text-[10px] text-muted-foreground mt-1 block">{sirLabel[row.sir]}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(row.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Separator />
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar e Atualizar
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}
