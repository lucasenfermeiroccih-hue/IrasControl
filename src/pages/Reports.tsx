import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, Plus, Download, Sparkles, TrendingUp, Filter,
  CalendarIcon, Loader2, AlertTriangle, Bug, X, ChevronDown, Check,
  Brain, Lightbulb, BarChart3, TableIcon, Pencil
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

const TIPOS_EXAME = [
  "Hemocultura", "Urinocultura", "Swab", "Secreção Traqueal",
  "Secreção", "Fragmento Ósseo", "Liquor", "Aspirado Traqueal",
  "Líquidos", "Outros",
];

const MICROORGANISMOS = [
  "Acinetobacter baumannii", "ESBL (Beta-lactamase)", "ERC (Enterobactéria Resistente)",
  "KPC (Klebsiella)", "MRSA", "VRE/ERV", "Candida spp.", "Providencia stuartii",
  "Pseudomonas aeruginosa", "Staphylococcus aureus", "Enterococcus faecalis",
  "Escherichia coli", "Serratia marcescens", "Proteus mirabilis",
];

const SETORES = [
  "UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica",
  "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica", "Contêiner",
  "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto",
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const TREND_COLORS = [
  "hsl(168, 66%, 34%)", "hsl(0, 72%, 51%)", "hsl(45, 93%, 47%)",
  "hsl(210, 79%, 46%)", "hsl(280, 68%, 50%)", "hsl(30, 80%, 50%)",
];

interface LabRecord {
  id: string;
  collection_date: string;
  sample_type: string | null;
  organism: string | null;
  status: string;
  result_date: string | null;
  notes: string | null;
  patient?: { full_name: string; medical_record: string | null; sector: string | null } | null;
}

const parseNotes = (notes: string | null): { mdr: boolean; criticidade: string; statusRegistro: string } => {
  try {
    if (notes) {
      const parsed = JSON.parse(notes);
      return { mdr: !!parsed.mdr, criticidade: parsed.criticidade || "baixo", statusRegistro: parsed.statusRegistro || "pendente" };
    }
  } catch {}
  return { mdr: false, criticidade: "baixo", statusRegistro: "pendente" };
};

const Reports = () => {
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();
  const [records, setRecords] = useState<LabRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    dataExame: "", prontuario: "", setor: "", tipoExame: "", microorganismo: "",
    mdr: false, criticidade: "baixo" as string, statusRegistro: "pendente" as string,
  });

  // Filters
  const [filterMicros, setFilterMicros] = useState<string[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [filterMes, setFilterMes] = useState<string>("all");
  const [filterAno, setFilterAno] = useState<string>("all");
  const [filterSetor, setFilterSetor] = useState<string>("all");
  const [microPopoverOpen, setMicroPopoverOpen] = useState(false);

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState<string[]>([]);

  const currentYear = new Date().getFullYear();
  const ANOS = [String(currentYear), String(currentYear - 1), String(currentYear - 2)];

  const fetchRecords = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("lab_results")
      .select("*, patient:patients(full_name, medical_record, sector)")
      .eq("hospital_id", hospitalId)
      .order("collection_date", { ascending: false });

    if (!error && data) {
      setRecords(data.map(d => ({ ...d, patient: d.patient as any })));
    }
    setLoading(false);
  };

  useEffect(() => {
    if (hospitalId) fetchRecords();
  }, [hospitalId]);

  const toggleMicro = (m: string) => {
    setFilterMicros((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };
  const toggleAllMicros = () => {
    setFilterMicros((prev) => prev.length === MICROORGANISMOS.length ? [] : [...MICROORGANISMOS]);
  };

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterMicros.length > 0 && !filterMicros.includes(r.organism || "")) return false;
      if (filterDateFrom && r.collection_date < format(filterDateFrom, "yyyy-MM-dd")) return false;
      if (filterDateTo && r.collection_date > format(filterDateTo, "yyyy-MM-dd")) return false;
      if (filterSetor !== "all" && r.patient?.sector !== filterSetor) return false;
      if (filterMes !== "all") {
        const month = new Date(r.collection_date).getMonth();
        if (MESES[month] !== filterMes) return false;
      }
      if (filterAno !== "all") {
        const year = String(new Date(r.collection_date).getFullYear());
        if (year !== filterAno) return false;
      }
      return true;
    });
  }, [records, filterMicros, filterDateFrom, filterDateTo, filterSetor, filterMes, filterAno]);

  const distribution = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      if (r.organism) {
        const short = r.organism.split(" ")[0];
        map[short] = (map[short] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filtered]);

  // Monthly trend data for top organisms
  const trendData = useMemo(() => {
    const monthOrgMap: Record<string, Record<string, number>> = {};
    const orgCount: Record<string, number> = {};
    filtered.forEach((r) => {
      if (!r.organism || !r.collection_date) return;
      const m = r.collection_date.slice(0, 7);
      const org = r.organism.split(" ")[0];
      orgCount[org] = (orgCount[org] || 0) + 1;
      if (!monthOrgMap[m]) monthOrgMap[m] = {};
      monthOrgMap[m][org] = (monthOrgMap[m][org] || 0) + 1;
    });
    const topOrgs = Object.entries(orgCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([o]) => o);
    const months = Object.keys(monthOrgMap).sort();
    return { months, topOrgs, data: months.map(m => ({ mes: m, ...monthOrgMap[m] })) };
  }, [filtered]);

  const handleSaveRecord = async () => {
    const { dataExame, prontuario, setor, tipoExame, microorganismo, mdr, criticidade, statusRegistro } = formData;
    if (!dataExame || !setor || !tipoExame || !microorganismo) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!hospitalId || !userId) return;
    setSaving(true);

    const notesJson = JSON.stringify({ mdr, criticidade, statusRegistro });

    let patientId: string | null = null;
    if (prontuario) {
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("hospital_id", hospitalId)
        .eq("medical_record", prontuario)
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        const { data: newPatient } = await supabase
          .from("patients")
          .insert({
            full_name: `Paciente ${prontuario}`,
            medical_record: prontuario,
            sector: setor,
            hospital_id: hospitalId,
            created_by: userId,
          })
          .select()
          .single();
        patientId = newPatient?.id || null;
      }
    }

    const createMdrAlert = async () => {
      if (!mdr) return;
      const severityMap: Record<string, "low" | "medium" | "high" | "critical"> = {
        baixo: "low", medio: "medium", alto: "high",
      };
      await supabase.from("alerts").insert({
        hospital_id: hospitalId,
        title: `🚨 MDR Detectado: ${microorganismo}`,
        description: `Microorganismo multirresistente (MDR) identificado no setor ${setor}. Tipo de exame: ${tipoExame}. Criticidade: ${criticidade.toUpperCase()}.`,
        severity: severityMap[criticidade] || "medium",
        status: "active" as const,
        triggered_by: userId,
        related_patient_id: patientId,
      });
    };

    if (editingId) {
      const { error } = await supabase.from("lab_results").update({
        collection_date: dataExame,
        sample_type: tipoExame,
        organism: microorganismo,
        notes: notesJson,
      }).eq("id", editingId);
      if (!error) await createMdrAlert();
      setSaving(false);
      if (error) {
        toast.error("Erro ao atualizar: " + error.message);
      } else {
        toast.success("Registro atualizado!");
        resetForm();
        fetchRecords();
      }
    } else {
      const { error } = await supabase.from("lab_results").insert({
        hospital_id: hospitalId,
        patient_id: patientId,
        collection_date: dataExame,
        sample_type: tipoExame,
        organism: microorganismo,
        status: "completed" as const,
        result_date: new Date().toISOString().split("T")[0],
        created_by: userId,
        notes: notesJson,
      });
      if (!error) await createMdrAlert();
      setSaving(false);
      if (error) {
        toast.error("Erro ao salvar: " + error.message);
      } else {
        toast.success(mdr ? "Registro salvo e alerta MDR gerado!" : "Registro salvo com sucesso!");
        resetForm();
        fetchRecords();
      }
    }
  };

  const resetForm = () => {
    setFormData({ dataExame: "", prontuario: "", setor: "", tipoExame: "", microorganismo: "", mdr: false, criticidade: "baixo", statusRegistro: "pendente" });
    setEditingId(null);
    setFormOpen(false);
  };

  const handleEditRecord = (r: LabRecord) => {
    const extra = parseNotes(r.notes);
    setEditingId(r.id);
    setFormData({
      dataExame: r.collection_date,
      prontuario: r.patient?.medical_record || "",
      setor: r.patient?.sector || "",
      tipoExame: r.sample_type || "",
      microorganismo: r.organism || "",
      mdr: extra.mdr,
      criticidade: extra.criticidade,
      statusRegistro: extra.statusRegistro,
    });
    setFormOpen(true);
  };

  const handleExportCSV = () => {
    const header = "Data Coleta,Prontuário,Setor,Tipo Exame,Microorganismo,Status\n";
    const rows = filtered.map((r) =>
      `${r.collection_date},${r.patient?.medical_record || ""},${r.patient?.sector || ""},${r.sample_type || ""},${r.organism || ""},${r.status}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-microorganismos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const handleExportPDF = async () => {
    toast.info("Gerando PDF...");
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: {
          type: "microorganisms",
          hospitalId,
          data: {
            records: filtered.map(r => ({
              data: r.collection_date,
              prontuario: r.patient?.medical_record || "",
              setor: r.patient?.sector || "",
              tipo: r.sample_type || "",
              microorganismo: r.organism || "",
            })),
            distribution,
            total: filtered.length,
          },
        },
      });
      if (error) throw error;
      if (data?.pdf) {
        const byteArray = Uint8Array.from(atob(data.pdf), c => c.charCodeAt(0));
        const blob = new Blob([byteArray], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `microorganismos-${format(new Date(), "yyyy-MM-dd")}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF exportado!");
      }
    } catch {
      toast.error("Erro ao gerar PDF");
    }
  };

  const handleGenerateAI = async () => {
    if (filtered.length === 0) {
      toast.error("Sem dados para analisar. Adicione registros primeiro.");
      return;
    }
    setAiLoading(true);
    setAiInsights([]);
    try {
      const summary = {
        total: filtered.length,
        organisms: distribution.map(d => `${d.name}: ${d.total}`).join(", "),
        sectors: [...new Set(filtered.map(r => r.patient?.sector).filter(Boolean))].join(", "),
        period: `${filtered[filtered.length - 1]?.collection_date} a ${filtered[0]?.collection_date}`,
      };

      const { data, error } = await supabase.functions.invoke("generate-insights", {
        body: {
          context: "microorganism_resistance",
          summary,
        },
      });

      if (error) throw error;
      if (data?.insights && Array.isArray(data.insights)) {
        setAiInsights(data.insights);
      } else {
        // Fallback local insights
        setAiInsights(generateLocalInsights());
      }
    } catch {
      // Fallback: generate local insights
      setAiInsights(generateLocalInsights());
    }
    setAiLoading(false);
  };

  const generateLocalInsights = (): string[] => {
    const insights: string[] = [];
    if (distribution.length > 0) {
      insights.push(`O microorganismo mais prevalente é ${distribution[0].name} com ${distribution[0].total} isolados (${Math.round(distribution[0].total / filtered.length * 100)}% do total).`);
    }
    const pendingPct = filtered.length > 0 ? Math.round(filtered.filter(r => r.status === "pending").length / filtered.length * 100) : 0;
    if (pendingPct > 20) {
      insights.push(`⚠️ ${pendingPct}% dos exames ainda estão pendentes de liberação. Recomenda-se priorizar a análise para agilizar o tratamento.`);
    }
    const sectorMap: Record<string, number> = {};
    filtered.forEach(r => { if (r.patient?.sector) sectorMap[r.patient.sector] = (sectorMap[r.patient.sector] || 0) + 1; });
    const topSector = Object.entries(sectorMap).sort((a, b) => b[1] - a[1])[0];
    if (topSector) {
      insights.push(`O setor com maior concentração de isolados é "${topSector[0]}" com ${topSector[1]} registros. Avaliar medidas de prevenção focadas.`);
    }
    const mrsaCount = filtered.filter(r => r.organism === "MRSA").length;
    const kpcCount = filtered.filter(r => r.organism?.includes("KPC")).length;
    if (mrsaCount > 0 || kpcCount > 0) {
      insights.push(`Alerta: ${mrsaCount} isolados MRSA e ${kpcCount} KPC detectados. Monitorar protocolo de precauções de contato e descolonização.`);
    }
    if (distribution.length >= 3) {
      insights.push(`Tendência: ${distribution.slice(0, 3).map(d => d.name).join(", ")} representam os patógenos dominantes. Considerar revisão do perfil de antibiograma institucional.`);
    }
    if (insights.length === 0) {
      insights.push("Dados insuficientes para gerar insights preditivos. Continue registrando resultados para análises mais robustas.");
    }
    return insights;
  };

  if (ctxLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bug className="h-6 w-6 text-primary" />
            Monitoramento de Microorganismos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Relatórios, análises de resistência antimicrobiana e insights preditivos via IA
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={formOpen} onOpenChange={(open) => { if (!open) resetForm(); else setFormOpen(true); }}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo Registro</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Editar Registro" : "Novo Registro de Microorganismo"}</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data do Exame *</Label>
                    <Input type="date" value={formData.dataExame} onChange={(e) => setFormData(p => ({ ...p, dataExame: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nº Prontuário</Label>
                    <Input placeholder="Ex: 123456" value={formData.prontuario} onChange={(e) => setFormData(p => ({ ...p, prontuario: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Setor *</Label>
                  <Select value={formData.setor} onValueChange={(v) => setFormData(p => ({ ...p, setor: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Exame *</Label>
                  <Select value={formData.tipoExame} onValueChange={(v) => setFormData(p => ({ ...p, tipoExame: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{TIPOS_EXAME.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Microorganismo *</Label>
                  <Select value={formData.microorganismo} onValueChange={(v) => setFormData(p => ({ ...p, microorganismo: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{MICROORGANISMOS.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Multirresistente (MDR)?</Label>
                    <Select value={formData.mdr ? "sim" : "nao"} onValueChange={(v) => setFormData(p => ({ ...p, mdr: v === "sim" }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao">Não</SelectItem>
                        <SelectItem value="sim">Sim</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.mdr && (
                      <p className="text-xs text-destructive flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Alerta será gerado automaticamente</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Criticidade</Label>
                    <Select value={formData.criticidade} onValueChange={(v) => setFormData(p => ({ ...p, criticidade: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixo">Baixo</SelectItem>
                        <SelectItem value="medio">Médio</SelectItem>
                        <SelectItem value="alto">Alto</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.statusRegistro} onValueChange={(v) => setFormData(p => ({ ...p, statusRegistro: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pendente">Pendente</SelectItem>
                        <SelectItem value="em_analise">Em Análise</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="descartado">Descartado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleSaveRecord} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {editingId ? "Atualizar" : "Salvar"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="secondary" onClick={handleGenerateAI} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Brain className="h-4 w-4 mr-1" />}
            Gerar Insights IA
          </Button>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

      {/* AI Insights Panel */}
      {aiInsights.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                Sugestões e Insights da IA
              </CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAiInsights([])}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>Análise preditiva baseada nos {filtered.length} registros filtrados</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {aiInsights.map((insight, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                  <span>{insight}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" /> Filtros
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
              {/* Multi-select Microorganismo */}
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label className="text-xs">Microorganismo</Label>
                <Popover open={microPopoverOpen} onOpenChange={setMicroPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-left font-normal h-9 text-xs">
                      <span className="truncate">
                        {filterMicros.length === 0 ? "Todos" : filterMicros.length === MICROORGANISMOS.length ? "Todos selecionados" : `${filterMicros.length} selecionado(s)`}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <div className="max-h-[300px] overflow-auto p-2 space-y-1">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer" onClick={toggleAllMicros}>
                        <Checkbox checked={filterMicros.length === MICROORGANISMOS.length} onCheckedChange={toggleAllMicros} className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Selecionar todos</span>
                      </div>
                      <Separator className="my-1" />
                      {MICROORGANISMOS.map(m => (
                        <div key={m} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer" onClick={() => toggleMicro(m)}>
                          <Checkbox checked={filterMicros.includes(m)} onCheckedChange={() => toggleMicro(m)} className="h-3.5 w-3.5" />
                          <span className="text-xs">{m}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Mês</Label>
                <Select value={filterMes} onValueChange={setFilterMes}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <Select value={filterAno} onValueChange={setFilterAno}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ANOS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Setor</Label>
                <Select value={filterSetor} onValueChange={setFilterSetor}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {SETORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">De</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-9 text-xs justify-start", !filterDateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                      {filterDateFrom ? format(filterDateFrom, "dd/MM/yy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={filterDateFrom} onSelect={setFilterDateFrom} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Até</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full h-9 text-xs justify-start", !filterDateTo && "text-muted-foreground")}>
                      <CalendarIcon className="h-3.5 w-3.5 mr-1" />
                      {filterDateTo ? format(filterDateTo, "dd/MM/yy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={filterDateTo} onSelect={setFilterDateTo} locale={ptBR} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Total Registros</p>
            </div>
            <p className="text-2xl font-bold mt-1">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Organismos Distintos</p>
            </div>
            <p className="text-2xl font-bold mt-1">{new Set(filtered.map(r => r.organism).filter(Boolean)).size}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-warning">{filtered.filter(r => r.status === "pending").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground">Liberados</p>
            </div>
            <p className="text-2xl font-bold mt-1 text-success">{filtered.filter(r => r.status === "completed").length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribution */}
        {distribution.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Distribuição por Microorganismo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={distribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Trend Chart */}
        {trendData.data.length > 1 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Tendência de Resistência (Mensal)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={trendData.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {trendData.topOrgs.map((org, i) => (
                    <Line key={org} type="monotone" dataKey={org} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TableIcon className="h-4 w-4 text-primary" />
              Dados Consolidados ({filtered.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Data Coleta</TableHead>
                  <TableHead>Prontuário</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Tipo Exame</TableHead>
                  <TableHead>Microorganismo</TableHead>
                  <TableHead>MDR</TableHead>
                  <TableHead>Criticidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">Nenhum registro encontrado. Clique em "Novo Registro" para começar.</TableCell></TableRow>
                )}
                {filtered.slice(0, 50).map(r => {
                  const extra = parseNotes(r.notes);
                  const critColors: Record<string, string> = { alto: "destructive", medio: "outline", baixo: "secondary" };
                  const statusLabels: Record<string, string> = { pendente: "Pendente", em_analise: "Em Análise", confirmado: "Confirmado", descartado: "Descartado" };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.collection_date}</TableCell>
                      <TableCell className="text-xs">{r.patient?.medical_record || "—"}</TableCell>
                      <TableCell className="text-xs">{r.patient?.sector || "—"}</TableCell>
                      <TableCell className="text-xs">{r.sample_type || "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{r.organism || "—"}</Badge></TableCell>
                      <TableCell>
                        {extra.mdr ? (
                          <Badge variant="destructive" className="text-xs">MDR</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={critColors[extra.criticidade] as any || "secondary"} className="text-xs capitalize">
                          {extra.criticidade === "medio" ? "Médio" : extra.criticidade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {statusLabels[extra.statusRegistro] || extra.statusRegistro}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditRecord(r)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
