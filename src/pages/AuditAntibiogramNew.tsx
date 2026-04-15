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
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, Trash2, AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";
import { pathogenCategories, pathogensByCategory, getAllPathogens, type PathogenCategory } from "@/data/pathogens";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import AuditHistory from "@/components/AuditHistory";

const biologicalSites = [
  "Sangue (Hemocultura)", "Urina (Urocultura)", "Secreção traqueal",
  "Líquor", "Ferida operatória", "Ponta de cateter", "Swab retal",
  "Swab nasal", "Líquido peritoneal", "Secreções", "Fragmento ósseo", "Abscesso", "Outro",
];

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

type SIR = "S" | "I" | "R" | "";

interface AntibioticResult {
  id: string; antibiotic: string; method: string; value: string; sir: SIR;
}

const criticalPhenotypes = [
  { id: "mrsa", label: "MRSA", trigger: (org: string, results: AntibioticResult[]) => org.includes("Staphylococcus aureus") && results.some(r => r.antibiotic === "Oxacilina" && r.sir === "R") },
  { id: "vre", label: "VRE", trigger: (org: string, results: AntibioticResult[]) => org.includes("Enterococcus") && results.some(r => r.antibiotic === "Vancomicina" && r.sir === "R") },
  { id: "kpc", label: "KPC", trigger: (_org: string, results: AntibioticResult[]) => results.some(r => ["Meropenem", "Imipenem", "Ertapenem"].includes(r.antibiotic) && r.sir === "R") },
  { id: "esbl", label: "ESBL", trigger: (_org: string, results: AntibioticResult[]) => results.some(r => ["Ceftazidima", "Ceftriaxona", "Cefepima"].includes(r.antibiotic) && r.sir === "R") && results.some(r => ["Meropenem", "Imipenem"].includes(r.antibiotic) && r.sir === "S") },
];

const sirColor: Record<string, string> = { S: "bg-success text-success-foreground", I: "bg-warning text-warning-foreground", R: "bg-destructive text-destructive-foreground" };
const sirLabel: Record<string, string> = { S: "Sensível", I: "Intermediário", R: "Resistente" };

let idCounter = 0;
const newId = () => `ab_${++idCounter}`;

export default function AuditAntibiogramNew() {
  const navigate = useNavigate();
  const { hospitalId, userId } = useHospitalContext();
  const [saving, setSaving] = useState(false);
  const [collectionDate, setCollectionDate] = useState("");
  const [sampleId, setSampleId] = useState("");
  const [sector, setSector] = useState("");
  const [patientId, setPatientId] = useState("");
  const [organism, setOrganism] = useState("");
  const [site, setSite] = useState("");
  const [results, setResults] = useState<AntibioticResult[]>([]);
  const [pathogenCategory, setPathogenCategory] = useState<PathogenCategory | "">("");
  const [selectedPathogen, setSelectedPathogen] = useState("");

  const pathogenOptions = useMemo(() => {
    if (!pathogenCategory || pathogenCategory === "Todos") return getAllPathogens();
    return pathogensByCategory[pathogenCategory] ?? [];
  }, [pathogenCategory]);

  const handleCategoryChange = (v: string) => { setPathogenCategory(v as PathogenCategory); setSelectedPathogen(""); setOrganism(""); };
  const handlePathogenChange = (v: string) => { setSelectedPathogen(v); setOrganism(v); };

  const addRow = useCallback(() => { setResults(p => [...p, { id: newId(), antibiotic: "", method: "", value: "", sir: "" }]); }, []);
  const removeRow = (id: string) => setResults(p => p.filter(r => r.id !== id));
  const updateRow = (id: string, field: keyof AntibioticResult, value: string) => setResults(p => p.map(r => r.id === id ? { ...r, [field]: value } : r));

  const autoSIR = (row: AntibioticResult): SIR => {
    if (!row.value || !row.method) return "";
    const val = Number(row.value);
    if (isNaN(val)) return "";
    if (row.method.startsWith("Disco")) return val >= 21 ? "S" : val >= 16 ? "I" : "R";
    return val <= 2 ? "S" : val <= 8 ? "I" : "R";
  };

  const handleValueChange = (id: string, value: string) => {
    setResults(p => p.map(r => { if (r.id !== id) return r; const u = { ...r, value }; u.sir = autoSIR(u); return u; }));
  };
  const handleMethodChange = (id: string, method: string) => {
    setResults(p => p.map(r => { if (r.id !== id) return r; const u = { ...r, method }; if (u.value) u.sir = autoSIR(u); return u; }));
  };

  const detectedPhenotypes = criticalPhenotypes.filter(p => p.trigger(organism, results));

  const handleSave = async () => {
    if (!collectionDate || !organism || !site || !hospitalId) {
      toast.error("Preencha data, microrganismo e sítio biológico.");
      return;
    }
    if (results.length === 0) {
      toast.error("Adicione pelo menos um antimicrobiano.");
      return;
    }
    setSaving(true);

    // Save as lab_result + antibiogram_results
    const { data: labResult, error: labError } = await supabase
      .from("lab_results")
      .insert({
        hospital_id: hospitalId,
        collection_date: collectionDate,
        organism,
        sample_type: site,
        status: "completed" as any,
        notes: `Setor: ${sector} | Amostra: ${sampleId} | Paciente: ${patientId}`,
        created_by: userId,
      })
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
      sensitivity: r.sir || "S",
      mic_value: r.value ? Number(r.value) : null,
      notes: r.method || null,
    }));

    if (abResults.length > 0) {
      const { error: abError } = await supabase.from("antibiogram_results").insert(abResults);
      if (abError) { toast.error("Erro nos resultados: " + abError.message); setSaving(false); return; }
    }

    toast.success(`Antibiograma registrado! ${detectedPhenotypes.length > 0 ? "⚠️ Fenótipos críticos detectados!" : ""}`);
    setSaving(false);
    setCollectionDate(""); setSampleId(""); setSector(""); setPatientId("");
    setOrganism(""); setSite(""); setResults([]); setPathogenCategory(""); setSelectedPathogen("");
    window.scrollTo(0, 0);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
          <div><h1 className="text-2xl font-bold">Registro de Antibiograma</h1><p className="text-muted-foreground text-sm">Perfil de sensibilidade — BrCAST/EUCAST</p></div>
        </div>
        <AuditHistory auditType="antibiogram" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Identificação da Coleta</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2"><Label>Data da Coleta *</Label><Input type="date" value={collectionDate} onChange={e => setCollectionDate(e.target.value)} /></div>
          <div className="space-y-2"><Label>ID da Amostra</Label><Input placeholder="LAB-2026-0042" value={sampleId} onChange={e => setSampleId(e.target.value)} /></div>
          <div className="space-y-2"><Label>Setor</Label><Select value={sector} onValueChange={setSector}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{sectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Dados Microbiológicos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Paciente</Label><Input placeholder="Código ou iniciais" value={patientId} onChange={e => setPatientId(e.target.value)} /></div>
          <div className="space-y-2"><Label>Sítio Biológico *</Label><Select value={site} onValueChange={setSite}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{biologicalSites.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></div>
        </CardContent>
        <Separator className="mx-6" />
        <CardContent className="pt-4 space-y-4">
          <p className="text-sm font-medium text-muted-foreground">Seleção do Patógeno</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Categoria</Label><Select value={pathogenCategory} onValueChange={handleCategoryChange}><SelectTrigger><SelectValue placeholder="Selecionar" /></SelectTrigger><SelectContent>{pathogenCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Microrganismo *</Label><Select value={selectedPathogen} onValueChange={handlePathogenChange} disabled={!pathogenCategory}><SelectTrigger><SelectValue placeholder={pathogenCategory ? "Selecione" : "Selecione categoria"} /></SelectTrigger><SelectContent>{pathogenOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </CardContent>
      </Card>

      {detectedPhenotypes.length > 0 && (
        <Card className="border-destructive bg-destructive/5"><CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3"><ShieldAlert className="h-6 w-6 text-destructive mt-0.5" /><div>
            <p className="font-semibold text-destructive">⚠️ Fenótipos Críticos Detectados</p>
            <ul className="mt-2 space-y-1">{detectedPhenotypes.map(p => <li key={p.id} className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />{p.label}</li>)}</ul>
          </div></div>
        </CardContent></Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div><CardTitle className="text-lg">Resultados</CardTitle><CardDescription>Antimicrobianos testados</CardDescription></div>
          <Button size="sm" onClick={addRow} className="gap-1"><Plus className="h-4 w-4" />Adicionar</Button>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><p>Nenhum antimicrobiano.</p><Button variant="outline" size="sm" onClick={addRow} className="mt-3 gap-1"><Plus className="h-4 w-4" />Adicionar</Button></div>
          ) : (
            <div className="overflow-x-auto"><Table>
              <TableHeader><TableRow>
                <TableHead className="min-w-[180px]">Antimicrobiano</TableHead>
                <TableHead className="min-w-[180px]">Método</TableHead>
                <TableHead className="min-w-[100px]">Valor</TableHead>
                <TableHead className="min-w-[120px]">SIR</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow></TableHeader>
              <TableBody>{results.map(row => (
                <TableRow key={row.id}>
                  <TableCell><Select value={row.antibiotic} onValueChange={v => updateRow(row.id, "antibiotic", v)}><SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{commonAntibiotics.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent></Select></TableCell>
                  <TableCell><Select value={row.method} onValueChange={v => handleMethodChange(row.id, v)}><SelectTrigger className="h-9"><SelectValue placeholder="Método" /></SelectTrigger><SelectContent>{testMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent></Select></TableCell>
                  <TableCell><Input type="number" min="0" step="0.1" placeholder={row.method.startsWith("Disco") ? "mm" : "µg/mL"} className="h-9" value={row.value} onChange={e => handleValueChange(row.id, e.target.value)} /></TableCell>
                  <TableCell>{row.sir ? <div className="flex items-center gap-2"><Badge className={sirColor[row.sir]}>{row.sir}</Badge><span className="text-xs text-muted-foreground">{sirLabel[row.sir]}</span></div> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(row.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                </TableRow>
              ))}</TableBody>
            </Table></div>
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
  );
}
