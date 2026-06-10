import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import {
  Search, Microscope, Clock, Eye, FlaskConical, Loader2,
  Plus, Sparkles, TrendingUp, AlertTriangle, Bug, ShieldAlert, X,
  Baby, Syringe
} from "lucide-react";

type SIR = "S" | "I" | "R";

const sirColor: Record<SIR, string> = {
  S: "bg-green-100 text-green-800 border-green-300",
  I: "bg-yellow-100 text-yellow-800 border-yellow-300",
  R: "bg-red-100 text-red-800 border-red-300",
};

const UNIDADES_INTERNACAO = [
  "UTI 1", "UTI 2", "UTI 3", "UPO", "UTI Neonatal", "UTI Pediátrica",
  "Isolamento", "Nova Emergência", "Emergência", "Trauma Clínico", "Trauma Cirúrgico",
  "Sala Verde", "Enfermarias Cirúrgicas", "Enfermaria Clínica", "Pediatria Emergência",
  "Enfermaria Pediátrica", "Alojamento Conjunto"
];

const IRAS_TRANSPLACENTARIA_OPTIONS = [
  "Herpes simples", "Toxoplasmose", "Rubéola", "Citomegalovírus", "Sífilis", "Hepatite B", "Vírus HIV"
];

const SAMPLE_TYPES = [
  "Sangue (Hemocultura)", "Urina (Urocultura)", "Secreção traqueal",
  "Líquor", "Líquido pleural", "Líquido ascítico", "Líquido", "Ponta de cateter",
  "Swab retal", "Swab nasal", "Ferida operatória", "Escarro", "Fezes", "Outro"
];

const COMMON_ANTIBIOTICS = [
  "Amicacina", "Amoxicilina/Clavulanato", "Ampicilina", "Ampicilina/Sulbactam",
  "Azitromicina", "Cefazolina", "Cefepime", "Ceftazidima", "Ceftriaxona",
  "Ciprofloxacino", "Clindamicina", "Colistina", "Daptomicina",
  "Ertapenem", "Gentamicina", "Imipenem", "Levofloxacino", "Linezolida",
  "Meropenem", "Metronidazol", "Oxacilina", "Penicilina", "Piperacilina/Tazobactam",
  "Polimixina B", "Sulfametoxazol/Trimetoprima", "Teicoplanina", "Tigeciclina", "Vancomicina"
];

interface AntibiogramEntry {
  antibiotic: string;
  sensitivity: SIR;
  mic_value?: string;
}

const LaboratoryResults = () => {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [results, setResults] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [detail, setDetail] = useState<any | null>(null);

  // New Lab Result form
  const [showNewForm, setShowNewForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    patient_name: "",
    patient_id: "",
    sample_type: "",
    collection_date: new Date().toISOString().slice(0, 10),
    result_date: "",
    organism: "",
    notes: "",
    status: "pending" as "pending" | "completed",
    unidade_internacao: "",
  });
  const [antibiogramEntries, setAntibiogramEntries] = useState<AntibiogramEntry[]>([]);
  const [irasTransplacentaria, setIrasTransplacentaria] = useState("");
  const [vdrlMae, setVdrlMae] = useState("");
  const [vdrlRN, setVdrlRN] = useState("");
  const [vdrlReagente, setVdrlReagente] = useState("");
  const [cmvReagente, setCmvReagente] = useState("");

  // AI Insights
  const [showInsights, setShowInsights] = useState(false);

  const fetchResults = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data } = await supabase
      .from("lab_results")
      .select("*, patient:patients(full_name, medical_record, sector), antibiogram_results(*)")
      .eq("hospital_id", hospitalId)
      .order("collection_date", { ascending: false });
    // Mostrar apenas resultados cadastrados em /audits/antimicrobial-sensitivity/new
    // (possuem antibiograma associado ou foram criados pelo formulário de auditoria)
    const filtered = (data || []).filter((r: any) =>
      (Array.isArray(r.antibiogram_results) && r.antibiogram_results.length > 0) ||
      (typeof r.notes === "string" && r.notes.startsWith("Setor:"))
    );
    setResults(filtered);
    setLoading(false);
  };

  useEffect(() => {
    if (!hospitalId) return;
    fetchResults();
    supabase
      .from("patients")
      .select("id, full_name, medical_record, sector")
      .eq("hospital_id", hospitalId)
      .eq("status", "active")
      .neq("source", "precaution_map")
      .order("full_name")
      .then(({ data }) => setPatients(data || []));
  }, [hospitalId]);

  const filtered = results.filter(r => {
    const name = (r.patient as any)?.full_name || "";
    const record = (r.patient as any)?.medical_record || "";
    if (search && !name.toLowerCase().includes(search.toLowerCase()) && !record.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus !== "todos" && r.status !== filterStatus) return false;
    return true;
  });

  const kpis = {
    total: results.length,
    pendentes: results.filter(r => r.status === "pending").length,
    completos: results.filter(r => r.status === "completed").length,
  };

  // AI Insights calculations
  const insights = useMemo(() => {
    if (results.length === 0) return null;

    const completedWithOrganism = results.filter(r => r.status === "completed" && r.organism);
    const allAntibiograms = results.flatMap(r => r.antibiogram_results || []);

    // Top organisms
    const orgCount: Record<string, number> = {};
    completedWithOrganism.forEach(r => {
      orgCount[r.organism] = (orgCount[r.organism] || 0) + 1;
    });
    const topOrganisms = Object.entries(orgCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Resistance rates per antibiotic
    const abStats: Record<string, { total: number; R: number }> = {};
    allAntibiograms.forEach((ab: any) => {
      if (!abStats[ab.antibiotic]) abStats[ab.antibiotic] = { total: 0, R: 0 };
      abStats[ab.antibiotic].total++;
      if (ab.sensitivity === "R") abStats[ab.antibiotic].R++;
    });
    const resistanceRates = Object.entries(abStats)
      .map(([name, s]) => ({ name, rate: Math.round((s.R / s.total) * 100), total: s.total }))
      .filter(r => r.total >= 2)
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 8);

    // MDR organisms (resistant to >= 3 classes)
    const mdrOrganisms: string[] = [];
    const orgResults: Record<string, Set<string>> = {};
    results.forEach(r => {
      if (!r.organism) return;
      (r.antibiogram_results || []).forEach((ab: any) => {
        if (ab.sensitivity === "R") {
          if (!orgResults[r.organism]) orgResults[r.organism] = new Set();
          orgResults[r.organism].add(ab.antibiotic);
        }
      });
    });
    Object.entries(orgResults).forEach(([org, abs]) => {
      if (abs.size >= 3 && !mdrOrganisms.includes(org)) mdrOrganisms.push(org);
    });

    // Sample type distribution
    const sampleCount: Record<string, number> = {};
    results.forEach(r => {
      const st = r.sample_type || "Não informado";
      sampleCount[st] = (sampleCount[st] || 0) + 1;
    });
    const topSamples = Object.entries(sampleCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return { topOrganisms, resistanceRates, mdrOrganisms, topSamples, completedCount: completedWithOrganism.length, totalAntibiograms: allAntibiograms.length };
  }, [results]);

  const resetForm = () => {
    setFormData({
      patient_name: "", patient_id: "", sample_type: "", collection_date: new Date().toISOString().slice(0, 10),
      result_date: "", organism: "", notes: "", status: "pending", unidade_internacao: "",
    });
    setAntibiogramEntries([]);
    setIrasTransplacentaria("");
    setVdrlMae(""); setVdrlRN(""); setVdrlReagente("");
    setCmvReagente("");
  };

  const addAntibiogramEntry = () => {
    setAntibiogramEntries(prev => [...prev, { antibiotic: "", sensitivity: "S" }]);
  };

  const removeAntibiogramEntry = (idx: number) => {
    setAntibiogramEntries(prev => prev.filter((_, i) => i !== idx));
  };

  const updateAntibiogramEntry = (idx: number, field: keyof AntibiogramEntry, value: string) => {
    setAntibiogramEntries(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  };

  const handleSave = async () => {
    if (!hospitalId) return;
    if (!formData.patient_name.trim()) { toast.error("Informe o nome do paciente"); return; }
    if (!formData.sample_type) { toast.error("Selecione o tipo de material"); return; }
    if (!formData.collection_date) { toast.error("Informe a data de coleta"); return; }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Usuário não autenticado"); setSaving(false); return; }

      const { data: labResult, error: labError } = await supabase
        .from("lab_results")
        .insert({
          hospital_id: hospitalId,
          patient_id: formData.patient_id || null,
          sample_type: formData.sample_type,
          collection_date: formData.collection_date,
          result_date: formData.result_date || null,
          organism: formData.organism || null,
          notes: [
            formData.notes,
            formData.unidade_internacao ? `Unidade: ${formData.unidade_internacao}` : "",
            formData.patient_name ? `Paciente: ${formData.patient_name}` : "",
            irasTransplacentaria ? `IRAS Transplacentária: ${irasTransplacentaria}` : "",
            irasTransplacentaria === "Sífilis" ? `VDRL Mãe: ${vdrlMae || "—"}, VDRL RN: ${vdrlRN || "—"}, Resultado: ${vdrlReagente || "—"}` : "",
            irasTransplacentaria === "Citomegalovírus" ? `CMV Resultado: ${cmvReagente || "—"}` : "",
          ].filter(Boolean).join(" | ") || null,
          status: formData.status,
          created_by: user.id,
        })
        .select("id")
        .single();

      if (labError) throw labError;

      // Insert antibiogram entries if any
      const validEntries = antibiogramEntries.filter(e => e.antibiotic);
      if (validEntries.length > 0 && labResult) {
        const { error: abError } = await supabase
          .from("antibiogram_results")
          .insert(validEntries.map(e => ({
            lab_result_id: labResult.id,
            antibiotic: e.antibiotic,
            sensitivity: e.sensitivity,
            mic_value: e.mic_value ? parseFloat(e.mic_value) : null,
          })));
        if (abError) throw abError;
      }

      toast.success("Exame laboratorial cadastrado com sucesso!");
      setShowNewForm(false);
      resetForm();
      fetchResults();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  if (ctxLoading || loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Resultados Laboratoriais</h1>
          <p className="text-muted-foreground">Culturas, exames e perfil de resistência</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowInsights(true)} variant="outline" className="gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Insights IA
          </Button>
          <Button onClick={() => { resetForm(); setShowNewForm(true); }} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Exame
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center"><FlaskConical className="mx-auto h-8 w-8 text-primary mb-2" /><p className="text-xl md:text-2xl font-bold">{kpis.total}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Clock className="mx-auto h-8 w-8 text-warning mb-2" /><p className="text-xl md:text-2xl font-bold">{kpis.pendentes}</p><p className="text-sm text-muted-foreground">Pendentes</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><Microscope className="mx-auto h-8 w-8 text-success mb-2" /><p className="text-xl md:text-2xl font-bold">{kpis.completos}</p><p className="text-sm text-muted-foreground">Completos</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente ou prontuário..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Status</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="completed">Completo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Resultados ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Microorganismo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Coleta</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhum resultado laboratorial.</TableCell></TableRow>}
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell><div className="font-medium">{(r.patient as any)?.full_name || "—"}</div><div className="text-xs text-muted-foreground">{(r.patient as any)?.medical_record || ""}</div></TableCell>
                    <TableCell>{(r.patient as any)?.sector || "—"}</TableCell>
                    <TableCell className="text-sm">{r.sample_type || "—"}</TableCell>
                    <TableCell><span className="text-sm">{r.organism || "—"}</span></TableCell>
                    <TableCell><Badge variant={r.status === "pending" ? "outline" : "secondary"}>{r.status === "pending" ? "Pendente" : "Completo"}</Badge></TableCell>
                    <TableCell className="text-sm">{r.collection_date}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => setDetail(r)}><Eye className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader><DialogTitle>{detail.organism || "Resultado Laboratorial"}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Paciente:</span> {(detail.patient as any)?.full_name || "—"}</div>
                  <div><span className="text-muted-foreground">Prontuário:</span> {(detail.patient as any)?.medical_record || "—"}</div>
                  <div><span className="text-muted-foreground">Material:</span> {detail.sample_type || "—"}</div>
                  <div><span className="text-muted-foreground">Coleta:</span> {detail.collection_date}</div>
                </div>
                {detail.antibiogram_results?.length > 0 ? (
                  <div>
                    <h4 className="font-semibold mb-2">Exames/Culturas</h4>
                    <div className="grid grid-cols-2 gap-1.5">
                      {detail.antibiogram_results.map((ab: any) => (
                        <div key={ab.id} className="flex items-center justify-between text-sm border rounded px-2 py-1">
                          <span className="truncate">{ab.antibiotic}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs font-bold border ${sirColor[ab.sensitivity as SIR] || ""}`}>{ab.sensitivity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Exame/Cultura não disponível.</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Lab Result Dialog */}
      <Dialog open={showNewForm} onOpenChange={setShowNewForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FlaskConical className="h-5 w-5 text-primary" /> Cadastrar Exame Laboratorial</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Paciente *</Label>
                <Input placeholder="Nome do paciente" value={formData.patient_name} onChange={e => setFormData(p => ({ ...p, patient_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Unidade de Internação</Label>
                <Select value={formData.unidade_internacao} onValueChange={v => { setFormData(p => ({ ...p, unidade_internacao: v })); if (v !== "UTI Neonatal" && v !== "Alojamento Conjunto") { setIrasTransplacentaria(""); setVdrlMae(""); setVdrlRN(""); setVdrlReagente(""); setCmvReagente(""); } }}>
                  <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                  <SelectContent>
                    {UNIDADES_INTERNACAO.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Material *</Label>
                <Select value={formData.sample_type} onValueChange={v => setFormData(p => ({ ...p, sample_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {SAMPLE_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Coleta *</Label>
                <Input type="date" value={formData.collection_date} onChange={e => setFormData(p => ({ ...p, collection_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Data do Resultado</Label>
                <Input type="date" value={formData.result_date} onChange={e => setFormData(p => ({ ...p, result_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Microorganismo Isolado</Label>
                <Input placeholder="Ex: Staphylococcus aureus" value={formData.organism} onChange={e => setFormData(p => ({ ...p, organism: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={v => setFormData(p => ({ ...p, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="partial">Parcial</SelectItem>
                    <SelectItem value="completed">Completo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* IRAS Transplacentária — only for UTI Neonatal / Alojamento Conjunto */}
            {(formData.unidade_internacao === "UTI Neonatal" || formData.unidade_internacao === "Alojamento Conjunto") && (
              <div className="p-4 rounded-lg border border-primary/30 bg-primary/5 space-y-4">
                <h4 className="font-semibold flex items-center gap-2 text-sm"><Baby className="h-4 w-4 text-primary" /> IRAS Transplacentária</h4>
                <Select value={irasTransplacentaria} onValueChange={v => { setIrasTransplacentaria(v); if (v !== "Sífilis") { setVdrlMae(""); setVdrlRN(""); setVdrlReagente(""); } if (v !== "Citomegalovírus") { setCmvReagente(""); } }}>
                  <SelectTrigger><SelectValue placeholder="Selecione a IRAS Transplacentária" /></SelectTrigger>
                  <SelectContent>
                    {IRAS_TRANSPLACENTARIA_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>

                {/* Sífilis — VDRL fields */}
                {irasTransplacentaria === "Sífilis" && (
                  <div className="p-3 rounded-lg border bg-amber-50 border-amber-200 space-y-3">
                    <h5 className="font-medium flex items-center gap-2 text-sm"><Syringe className="h-4 w-4 text-amber-600" /> VDRL — Sífilis</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">VDRL Quantitativo da Mãe</Label>
                        <Input placeholder="Ex: 1:8" value={vdrlMae} onChange={e => setVdrlMae(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">VDRL Quantitativo do RN</Label>
                        <Input placeholder="Ex: 1:4" value={vdrlRN} onChange={e => setVdrlRN(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Resultado</Label>
                        <Select value={vdrlReagente} onValueChange={setVdrlReagente}>
                          <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Reagente">Reagente</SelectItem>
                            <SelectItem value="Não Reagente">Não Reagente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Citomegalovírus — Reagente/Não Reagente */}
                {irasTransplacentaria === "Citomegalovírus" && (
                  <div className="p-3 rounded-lg border bg-blue-50 border-blue-200 space-y-3">
                    <h5 className="font-medium text-sm">Citomegalovírus — Resultado</h5>
                    <div className="w-full max-w-xs space-y-1">
                      <Label className="text-xs">Resultado do Exame</Label>
                      <Select value={cmvReagente} onValueChange={setCmvReagente}>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Reagente">Reagente</SelectItem>
                          <SelectItem value="Não Reagente">Não Reagente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea placeholder="Notas adicionais..." value={formData.notes} onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </div>

            {/* Antibiogram Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Exames/Culturas</Label>
                <Button type="button" variant="outline" size="sm" onClick={addAntibiogramEntry} className="gap-1">
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>
              {antibiogramEntries.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum antibiótico adicionado. Clique em "Adicionar" para incluir resultados do exame/cultura.</p>
              )}
              {antibiogramEntries.map((entry, idx) => (
                <div key={idx} className="flex items-end gap-2 p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Antibiótico</Label>
                    <Select value={entry.antibiotic} onValueChange={v => updateAntibiogramEntry(idx, "antibiotic", v)}>
                      <SelectTrigger className="h-9"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {COMMON_ANTIBIOTICS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-24 space-y-1">
                    <Label className="text-xs">Resultado</Label>
                    <Select value={entry.sensitivity} onValueChange={v => updateAntibiogramEntry(idx, "sensitivity", v)}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="S">S - Sensível</SelectItem>
                        <SelectItem value="I">I - Intermediário</SelectItem>
                        <SelectItem value="R">R - Resistente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20 space-y-1">
                    <Label className="text-xs">MIC</Label>
                    <Input className="h-9" placeholder="µg/mL" value={entry.mic_value || ""} onChange={e => updateAntibiogramEntry(idx, "mic_value", e.target.value)} />
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => removeAntibiogramEntry(idx)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowNewForm(false)}>Cancelar</Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar Exame
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Insights Dialog */}
      <Dialog open={showInsights} onOpenChange={setShowInsights}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" /> Insights de IA — Laboratório
            </DialogTitle>
          </DialogHeader>
          {!insights || results.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Cadastre exames laboratoriais para gerar insights.</p>
          ) : (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Card><CardContent className="pt-4 text-center"><p className="text-xl font-bold">{results.length}</p><p className="text-xs text-muted-foreground">Exames</p></CardContent></Card>
                <Card><CardContent className="pt-4 text-center"><p className="text-xl font-bold">{insights.completedCount}</p><p className="text-xs text-muted-foreground">Com Isolamento</p></CardContent></Card>
                <Card><CardContent className="pt-4 text-center"><p className="text-xl font-bold">{insights.totalAntibiograms}</p><p className="text-xs text-muted-foreground">Testes ABG</p></CardContent></Card>
                <Card><CardContent className="pt-4 text-center"><p className="text-xl font-bold text-destructive">{insights.mdrOrganisms.length}</p><p className="text-xs text-muted-foreground">MDR Detectados</p></CardContent></Card>
              </div>

              {/* MDR Alert */}
              {insights.mdrOrganisms.length > 0 && (
                <Card className="border-destructive/50 bg-destructive/5">
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-destructive" /> Alerta: Organismos Multirresistentes</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {insights.mdrOrganisms.map(org => (
                        <Badge key={org} variant="destructive" className="gap-1"><Bug className="h-3 w-3" />{org}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Organismos com resistência a ≥ 3 antibióticos testados.</p>
                  </CardContent>
                </Card>
              )}

              {/* Top Organisms */}
              {insights.topOrganisms.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bug className="h-4 w-4 text-primary" /> Microorganismos Mais Frequentes</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {insights.topOrganisms.map(([org, count]) => (
                        <div key={org} className="flex items-center justify-between">
                          <span className="text-sm font-medium">{org}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${(count / insights.topOrganisms[0][1]) * 100}%` }} />
                            </div>
                            <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Resistance Rates */}
              {insights.resistanceRates.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="h-4 w-4 text-amber-500" /> Taxas de Resistência por Antibiótico</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {insights.resistanceRates.map(r => (
                        <div key={r.name} className="flex items-center justify-between">
                          <span className="text-sm">{r.name}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${r.rate > 50 ? "bg-destructive" : r.rate > 30 ? "bg-amber-500" : "bg-green-500"}`} style={{ width: `${r.rate}%` }} />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">{r.rate}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-3">Baseado em antibióticos com ≥ 2 testes realizados.</p>
                  </CardContent>
                </Card>
              )}

              {/* Sample Distribution */}
              {insights.topSamples.length > 0 && (
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FlaskConical className="h-4 w-4 text-primary" /> Distribuição por Tipo de Material</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {insights.topSamples.map(([sample, count]) => (
                        <div key={sample} className="flex items-center justify-between text-sm">
                          <span>{sample}</span>
                          <Badge variant="outline">{count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LaboratoryResults;
