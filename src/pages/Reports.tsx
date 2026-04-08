import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, Plus, Download, Sparkles, TrendingUp, Filter,
  CalendarIcon, Loader2, AlertTriangle, Bug, X, ChevronDown, Check
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
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
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

interface LabRecord {
  id: string;
  collection_date: string;
  sample_type: string | null;
  organism: string | null;
  status: string;
  result_date: string | null;
  patient?: { full_name: string; medical_record: string | null; sector: string | null } | null;
}

const Reports = () => {
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();
  const [records, setRecords] = useState<LabRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    dataExame: "", prontuario: "", setor: "", tipoExame: "", microorganismo: "",
  });

  // Filters
  const [filterMicros, setFilterMicros] = useState<string[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [filterMes, setFilterMes] = useState<string>("all");
  const [filterAno, setFilterAno] = useState<string>("all");
  const [filterSetor, setFilterSetor] = useState<string>("all");
  const [microPopoverOpen, setMicroPopoverOpen] = useState(false);

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

  const handleSaveRecord = async () => {
    const { dataExame, prontuario, setor, tipoExame, microorganismo } = formData;
    if (!dataExame || !setor || !tipoExame || !microorganismo) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    if (!hospitalId || !userId) return;
    setSaving(true);

    // Find or create patient by prontuario
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

    const { error } = await supabase.from("lab_results").insert({
      hospital_id: hospitalId,
      patient_id: patientId,
      collection_date: dataExame,
      sample_type: tipoExame,
      organism: microorganismo,
      status: "completed" as const,
      result_date: new Date().toISOString().split("T")[0],
      created_by: userId,
    });

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Registro salvo com sucesso!");
      setFormData({ dataExame: "", prontuario: "", setor: "", tipoExame: "", microorganismo: "" });
      setFormOpen(false);
      fetchRecords();
    }
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
            Relatórios e análises de resistência antimicrobiana
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo Registro</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader><DialogTitle>Novo Registro de Microorganismo</DialogTitle></DialogHeader>
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
              </div>
              <DialogFooter>
                <DialogClose asChild><Button variant="outline">Cancelar</Button></DialogClose>
                <Button onClick={handleSaveRecord} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> CSV
          </Button>
        </div>
      </div>

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
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Total Registros</p><p className="text-2xl font-bold">{filtered.length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Organismos Distintos</p><p className="text-2xl font-bold">{new Set(filtered.map(r => r.organism).filter(Boolean)).size}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Pendentes</p><p className="text-2xl font-bold text-warning">{filtered.filter(r => r.status === "pending").length}</p></CardContent></Card>
        <Card><CardContent className="pt-4"><p className="text-xs text-muted-foreground">Liberados</p><p className="text-2xl font-bold text-success">{filtered.filter(r => r.status === "completed").length}</p></CardContent></Card>
      </div>

      {/* Chart */}
      {distribution.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição por Microorganismo</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={distribution}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Registros ({filtered.length})</CardTitle></CardHeader>
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
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum registro encontrado. Clique em "Novo Registro" para começar.</TableCell></TableRow>
                )}
                {filtered.slice(0, 50).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{r.collection_date}</TableCell>
                    <TableCell className="text-xs">{r.patient?.medical_record || "—"}</TableCell>
                    <TableCell className="text-xs">{r.patient?.sector || "—"}</TableCell>
                    <TableCell className="text-xs">{r.sample_type || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{r.organism || "—"}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={r.status === "completed" ? "secondary" : "outline"} className="text-xs">
                        {r.status === "completed" ? "Liberado" : r.status === "pending" ? "Pendente" : r.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
