import { useState, useEffect, useMemo } from "react";
import DashboardFilters from "@/components/DashboardFilters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar
} from "recharts";
import { Pill, TrendingDown, AlertTriangle, Activity, Plus, Pencil, Loader2, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";

const statusOptions = ["Em uso", "Desescalonado", "Suspenso", "Concluído"];
const routeOptions = ["EV", "VO", "IM", "SC"];
const emptyForm = { patient: "", drug: "", dose: "", route: "EV", days: "1", status: "Em uso", indication: "" };

function getStatusBadge(status: string) {
  const cls = status === "Desescalonado" ? "bg-success/20 text-success border-success/30"
    : status === "Suspenso" ? "bg-muted text-muted-foreground"
    : "bg-primary/20 text-primary border-primary/30";
  return <Badge className={`text-[10px] ${cls}`}>{status}</Badge>;
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
        .select("*, patients(full_name, bed)")
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
    setForm({ patient: p.patients?.full_name || "", drug: p.drug_name, dose: p.dose || "", route: p.route || "EV", days: "1", status: p.is_active ? "Em uso" : "Suspenso", indication: p.indication || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.drug.trim()) { toast.error("Antimicrobiano é obrigatório."); return; }
    if (editingItem) {
      await supabase.from("antimicrobial_prescriptions").update({
        drug_name: form.drug, dose: form.dose, route: form.route,
        indication: form.indication, is_active: form.status === "Em uso",
      }).eq("id", editingItem.id);
      toast.success("Prescrição atualizada!");
    } else {
      // For new, we need a patient_id — simplified: use first active patient
      const { data: patients } = await supabase.from("patients").select("id").eq("hospital_id", hospitalId!).eq("status", "active").limit(1);
      const patientId = patients?.[0]?.id;
      if (!patientId) { toast.error("Cadastre um paciente primeiro."); return; }
      await supabase.from("antimicrobial_prescriptions").insert({
        hospital_id: hospitalId!, patient_id: patientId,
        drug_name: form.drug, dose: form.dose, route: form.route,
        indication: form.indication, prescriber_id: userId,
      });
      toast.success("Prescrição adicionada!");
    }
    setDialogOpen(false);
    // Reload
    const { data } = await supabase.from("antimicrobial_prescriptions").select("*, patients(full_name, bed)").eq("hospital_id", hospitalId!).order("created_at", { ascending: false });
    setPrescriptions(data || []);
  };

  const setField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

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
                  <TableHead>Antimicrobiano</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead className="text-center">Via</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Indicação</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.slice(0, 20).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium whitespace-nowrap">{(p as any).patients?.full_name || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.drug_name}</TableCell>
                    <TableCell>{p.dose || "—"}</TableCell>
                    <TableCell className="text-center">{p.route || "—"}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(p.is_active ? "Em uso" : "Suspenso")}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{p.indication || "—"}</TableCell>
                    <TableCell className="text-center">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}><Pencil className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {prescriptions.length === 0 && (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><p className="text-sm">Nenhuma prescrição registrada.</p></CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingItem ? "Editar Prescrição" : "Nova Prescrição"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Antimicrobiano *</Label><Input placeholder="Ex: Meropenem" value={form.drug} onChange={(e) => setField("drug", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Dose</Label><Input placeholder="Ex: 1g 8/8h" value={form.dose} onChange={(e) => setField("dose", e.target.value)} /></div>
              <div className="space-y-2"><Label>Via</Label>
                <Select value={form.route} onValueChange={(v) => setField("route", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{routeOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Indicação</Label><Input placeholder="Ex: Sepse" value={form.indication} onChange={(e) => setField("indication", e.target.value)} /></div>
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
