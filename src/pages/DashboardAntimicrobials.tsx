import { useState, useEffect, useMemo } from "react";
import DashboardFilters from "@/components/DashboardFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Pill, TrendingDown, AlertTriangle, Activity, Plus, Pencil, Loader2, Download, CalendarIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";

const SETORES = [
  "UTI 1", "UTI 2", "UTI 3", "UPO", "UTI Neonatal", "UTI Pediátrica",
  "Isolamento", "Nova Emergência", "Emergência", "Trauma Clínico",
  "Trauma Cirúrgico", "Sala Verde", "Enfermarias Cirúrgicas",
  "Enfermaria Clínica", "Pediatria Emergência", "Enfermaria Pediátrica",
  "Alojamento Conjunto",
];

const statusOptions = ["Em uso", "Desescalonado", "Suspenso", "Concluído"];
const routeOptions = ["EV", "VO", "IM", "SC"];

const emptyForm = {
  patient: "", drug: "", dose: "", route: "EV", status: "Em uso",
  indication: "", setor: "", leito: "",
  startDate: undefined as Date | undefined,
  endDate: undefined as Date | undefined,
};

function getStatusBadge(status: string) {
  const cls = status === "Desescalonado" ? "bg-success/20 text-success border-success/30"
    : status === "Suspenso" ? "bg-muted text-muted-foreground"
    : "bg-primary/20 text-primary border-primary/30";
  return <Badge className={`text-[10px] ${cls}`}>{status}</Badge>;
}

function daysBetween(start?: string | null, end?: string | null): number | null {
  if (!start) return null;
  const s = parseISO(start);
  const e = end ? parseISO(end) : new Date();
  return differenceInDays(e, s) + 1;
}

export default function DashboardAntimicrobials() {
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [form, setForm] = useState(emptyForm);
  const [dia, setDia] = useState<string[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [ano, setAno] = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);

  useEffect(() => {
    if (ctxLoading || !hospitalId) { setLoading(false); return; }
    const load = async () => {
      const { data } = await supabase
        .from("antimicrobial_prescriptions")
        .select("*, patients(full_name, bed, sector)")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false });
      setPrescriptions(data || []);
      setLoading(false);
    };
    load();
  }, [hospitalId, ctxLoading]);

  const activePrescriptions = prescriptions.filter(p => p.is_active);

  const monthlyData = useMemo(() => {
    const map: Record<string, number> = {};
    prescriptions.forEach(p => {
      const month = p.start_date?.substring(0, 7) || "N/A";
      map[month] = (map[month] || 0) + 1;
    });
    return Object.entries(map).sort().slice(-6).map(([month, count]) => ({ month, prescriptions: count }));
  }, [prescriptions]);

  const openNew = () => { setEditingItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: any) => {
    setEditingItem(p);
    setForm({
      patient: p.patients?.full_name || "",
      drug: p.drug_name,
      dose: p.dose || "",
      route: p.route || "EV",
      status: p.is_active ? "Em uso" : "Suspenso",
      indication: p.indication || "",
      setor: p.patients?.sector || "",
      leito: p.patients?.bed || "",
      startDate: p.start_date ? parseISO(p.start_date) : undefined,
      endDate: p.end_date ? parseISO(p.end_date) : undefined,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.drug.trim()) { toast.error("Antimicrobiano é obrigatório."); return; }
    if (!form.patient.trim()) { toast.error("Nome do paciente é obrigatório."); return; }
    if (!form.setor) { toast.error("Setor é obrigatório."); return; }
    if (!form.startDate) { toast.error("Data de início é obrigatória."); return; }

    if (editingItem) {
      await supabase.from("antimicrobial_prescriptions").update({
        drug_name: form.drug, dose: form.dose, route: form.route,
        indication: form.indication, is_active: form.status === "Em uso",
        start_date: form.startDate ? format(form.startDate, "yyyy-MM-dd") : undefined,
        end_date: form.endDate ? format(form.endDate, "yyyy-MM-dd") : null,
      }).eq("id", editingItem.id);
      toast.success("Prescrição atualizada!");
    } else {
      // Find or create a patient record for the name
      let patientId: string | null = null;
      const { data: existing } = await supabase
        .from("patients").select("id")
        .eq("hospital_id", hospitalId!)
        .eq("full_name", form.patient.trim())
        .eq("status", "active")
        .limit(1);

      if (existing && existing.length > 0) {
        patientId = existing[0].id;
        // Update sector/bed
        await supabase.from("patients").update({ sector: form.setor, bed: form.leito || null }).eq("id", patientId);
      } else {
        const { data: newP } = await supabase.from("patients").insert({
          hospital_id: hospitalId!,
          full_name: form.patient.trim(),
          sector: form.setor,
          bed: form.leito || null,
          status: "active",
          created_by: userId,
        }).select("id").single();
        patientId = newP?.id || null;
      }

      if (!patientId) { toast.error("Erro ao criar paciente."); return; }

      await supabase.from("antimicrobial_prescriptions").insert({
        hospital_id: hospitalId!, patient_id: patientId,
        drug_name: form.drug, dose: form.dose, route: form.route,
        indication: form.indication, prescriber_id: userId,
        start_date: format(form.startDate, "yyyy-MM-dd"),
        end_date: form.endDate ? format(form.endDate, "yyyy-MM-dd") : null,
      });
      toast.success("Prescrição adicionada!");
    }
    setDialogOpen(false);
    const { data } = await supabase.from("antimicrobial_prescriptions").select("*, patients(full_name, bed, sector)").eq("hospital_id", hospitalId!).order("created_at", { ascending: false });
    setPrescriptions(data || []);
  };

  const setField = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const dayCount = useMemo(() => {
    if (!form.startDate) return null;
    const end = form.endDate || new Date();
    return differenceInDays(end, form.startDate) + 1;
  }, [form.startDate, form.endDate]);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Prescrições Ativas", value: String(activePrescriptions.length), icon: Pill, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Prescrições", value: String(prescriptions.length), icon: Activity, color: "text-info", bg: "bg-info/10" },
    { label: "Alertas", value: String(prescriptions.filter(p => p.is_active && p.indication).length), icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
    { label: "Suspensos", value: String(prescriptions.filter(p => !p.is_active).length), icon: TrendingDown, color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard — Antimicrobianos</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Stewardship e consumo de antimicrobianos</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button variant="outline" size="sm" onClick={() => {
            if (!hospitalId) return;
            exportPdf({
              type: "audits", hospitalId,
              data: {
                kpis: { avgCompliance: 0, totalAudits: prescriptions.length, nonCompliant: prescriptions.filter(p => !p.is_active).length },
                audits: prescriptions.map(p => ({
                  type: p.drug_name, sector: p.patients?.full_name || "", date: p.start_date?.split("T")[0] || "",
                  compliance: p.is_active ? 100 : 0, compliant: p.is_active ? 1 : 0, total: 1,
                })),
              },
              filenamePrefix: "antimicrobianos",
            });
          }}><Download className="h-4 w-4 mr-1" />PDF</Button>
          <DashboardAIInsights generateInsights={() => [
            `📊 ${activePrescriptions.length} prescrições ativas de ${prescriptions.length} totais.`,
            `💊 ${prescriptions.filter(p => !p.is_active).length} prescrições suspensas/desescalonadas.`,
            "💡 Recomendação: revisão de antimicrobianos com >7 dias de uso.",
          ]} />
          <Button onClick={openNew} className="gap-2" size="sm"><Plus className="h-4 w-4" /><span className="hidden sm:inline">Adicionar</span></Button>
        </div>
      </div>

      <DashboardFilters dia={dia} setDia={setDia} mes={mes} setMes={setMes} ano={ano} setAno={setAno} setor={setor} setSetor={setSetor} />

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-3 p-3 md:pt-6 md:p-6">
              <div className={`flex h-9 w-9 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-lg ${k.bg}`}><k.icon className={`h-4 w-4 md:h-6 md:w-6 ${k.color}`} /></div>
              <div className="min-w-0"><p className="text-[10px] md:text-xs text-muted-foreground truncate">{k.label}</p><p className="text-lg md:text-2xl font-bold">{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      {monthlyData.length > 0 && (
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Prescrições por Mês</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="prescriptions" name="Prescrições" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="p-3 md:p-6 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm md:text-base">Prescrições</CardTitle>
            <Button size="sm" variant="outline" onClick={openNew} className="gap-1 h-7 text-xs"><Plus className="h-3 w-3" /> Nova</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Leito</TableHead>
                  <TableHead>Antimicrobiano</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead className="text-center">Via</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Término</TableHead>
                  <TableHead className="text-center">Dias</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Indicação</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.slice(0, 20).map((p) => {
                  const days = daysBetween(p.start_date, p.end_date);
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium whitespace-nowrap">{p.patients?.full_name || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.patients?.sector || "—"}</TableCell>
                      <TableCell>{p.patients?.bed || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">{p.drug_name}</TableCell>
                      <TableCell>{p.dose || "—"}</TableCell>
                      <TableCell className="text-center">{p.route || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{p.start_date ? format(parseISO(p.start_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{p.end_date ? format(parseISO(p.end_date), "dd/MM/yyyy") : "—"}</TableCell>
                      <TableCell className="text-center">
                        {days !== null ? (
                          <Badge variant="outline" className="text-[10px]">{days}d</Badge>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-center">{getStatusBadge(p.is_active ? "Em uso" : "Suspenso")}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{p.indication || "—"}</TableCell>
                      <TableCell className="text-center">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {prescriptions.length === 0 && (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><p className="text-sm">Nenhuma prescrição registrada.</p></CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingItem ? "Editar Prescrição" : "Nova Prescrição"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Setor */}
            <div className="space-y-2">
              <Label>Setor / Unidade de Internação *</Label>
              <Select value={form.setor} onValueChange={(v) => setField("setor", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                <SelectContent>
                  {SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Paciente + Leito */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nome do Paciente *</Label>
                <Input placeholder="Nome completo" value={form.patient} onChange={(e) => setField("patient", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Leito</Label>
                <Input placeholder="Ex: 12-A" value={form.leito} onChange={(e) => setField("leito", e.target.value)} />
              </div>
            </div>

            {/* Antimicrobiano */}
            <div className="space-y-2">
              <Label>Antimicrobiano *</Label>
              <Input placeholder="Ex: Meropenem" value={form.drug} onChange={(e) => setField("drug", e.target.value)} />
            </div>

            {/* Dose + Via */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Dose</Label><Input placeholder="Ex: 1g 8/8h" value={form.dose} onChange={(e) => setField("dose", e.target.value)} /></div>
              <div className="space-y-2"><Label>Via</Label>
                <Select value={form.route} onValueChange={(v) => setField("route", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{routeOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Datas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Data de Início *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.startDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.startDate ? format(form.startDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.startDate} onSelect={(d) => setField("startDate", d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Data de Término</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !form.endDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {form.endDate ? format(form.endDate, "dd/MM/yyyy") : "Selecionar"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={form.endDate} onSelect={(d) => setField("endDate", d)} initialFocus className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Contagem de dias */}
            {dayCount !== null && (
              <div className="flex items-center gap-2 p-2 rounded-md bg-muted/50">
                <Badge variant="outline" className="text-xs">⏱ {dayCount} dia{dayCount !== 1 ? "s" : ""}</Badge>
                <span className="text-xs text-muted-foreground">de uso do antimicrobiano</span>
              </div>
            )}

            {/* Indicação */}
            <div className="space-y-2"><Label>Indicação do Antibiótico</Label><Input placeholder="Ex: Sepse, Pneumonia, Profilaxia cirúrgica" value={form.indication} onChange={(e) => setField("indication", e.target.value)} /></div>

            {/* Status (apenas edição) */}
            {editingItem && (
              <div className="space-y-2"><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
