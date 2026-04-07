import { useState } from "react";
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
import { Pill, TrendingDown, AlertTriangle, Activity, Plus, Pencil } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import { toast } from "sonner";

const kpis = [
  { label: "DDD/1000 pac-dia", value: "842", icon: Pill, color: "text-primary", bg: "bg-primary/10" },
  { label: "Desescalonamento", value: "64%", icon: TrendingDown, color: "text-success", bg: "bg-success/10" },
  { label: "Alertas Stewardship", value: "7", icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  { label: "Culturas Coletadas", value: "89%", icon: Activity, color: "text-info", bg: "bg-info/10" },
];

const trendData = [
  { month: "Jan", ddd: 890, desesc: 58 },
  { month: "Fev", ddd: 870, desesc: 60 },
  { month: "Mar", ddd: 860, desesc: 62 },
  { month: "Abr", ddd: 855, desesc: 61 },
  { month: "Mai", ddd: 848, desesc: 63 },
  { month: "Jun", ddd: 842, desesc: 64 },
];

const sectorHeatmap = [
  { setor: "UTI Adulto", carbapenens: 85, vancomicina: 62, polimixina: 28, cefalosporinas: 120 },
  { setor: "UTI Neo", carbapenens: 42, vancomicina: 35, polimixina: 8, cefalosporinas: 68 },
  { setor: "Clínica Médica", carbapenens: 55, vancomicina: 40, polimixina: 12, cefalosporinas: 95 },
  { setor: "Emergência", carbapenens: 38, vancomicina: 25, polimixina: 5, cefalosporinas: 78 },
  { setor: "Centro Cirúrgico", carbapenens: 48, vancomicina: 30, polimixina: 10, cefalosporinas: 88 },
];

interface Prescription {
  id: number;
  patient: string;
  drug: string;
  dose: string;
  route: string;
  days: number;
  status: string;
  alert: string | null;
}

const initialPrescriptions: Prescription[] = [
  { id: 1, patient: "Pac. Leito 12A", drug: "Meropenem", dose: "1g 8/8h", route: "EV", days: 8, status: "Em uso", alert: "Solicitar reavaliação" },
  { id: 2, patient: "Pac. Leito 5B", drug: "Vancomicina", dose: "1g 12/12h", route: "EV", days: 12, status: "Em uso", alert: "Tempo > 10 dias" },
  { id: 3, patient: "Pac. Leito 3C", drug: "Polimixina B", dose: "25.000UI/kg/dia", route: "EV", days: 5, status: "Em uso", alert: "Uso restrito" },
  { id: 4, patient: "Pac. Leito 8A", drug: "Piperacilina/Tazo", dose: "4.5g 6/6h", route: "EV", days: 3, status: "Desescalonado", alert: null },
  { id: 5, patient: "Pac. Leito 1D", drug: "Cefepime", dose: "2g 8/8h", route: "EV", days: 6, status: "Em uso", alert: null },
];

const statusOptions = ["Em uso", "Desescalonado", "Suspenso", "Concluído"];
const routeOptions = ["EV", "VO", "IM", "SC"];

const emptyForm = { patient: "", drug: "", dose: "", route: "EV", days: "1", status: "Em uso", alert: "" };

function getCellColor(value: number) {
  if (value >= 80) return "bg-destructive/20 text-destructive font-bold";
  if (value >= 50) return "bg-warning/20 text-warning font-bold";
  return "";
}

function getStatusBadge(status: string) {
  const cls = status === "Desescalonado"
    ? "bg-success/20 text-success border-success/30"
    : status === "Suspenso"
      ? "bg-muted text-muted-foreground"
      : "bg-primary/20 text-primary border-primary/30";
  return <Badge className={`text-[10px] ${cls}`}>{status}</Badge>;
}

const heatmapClasses = [
  { key: "carbapenens", label: "Carbapenêmicos" },
  { key: "vancomicina", label: "Vancomicina" },
  { key: "polimixina", label: "Polimixina" },
  { key: "cefalosporinas", label: "Cefalosporinas" },
] as const;

export default function DashboardAntimicrobials() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(initialPrescriptions);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Prescription | null>(null);
  const [form, setForm] = useState(emptyForm);

  const openNew = () => { setEditingItem(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: Prescription) => {
    setEditingItem(p);
    setForm({ patient: p.patient, drug: p.drug, dose: p.dose, route: p.route, days: String(p.days), status: p.status, alert: p.alert || "" });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.patient.trim() || !form.drug.trim()) { toast.error("Paciente e antimicrobiano são obrigatórios."); return; }
    if (editingItem) {
      setPrescriptions(prev => prev.map(p => p.id === editingItem.id ? { ...p, patient: form.patient, drug: form.drug, dose: form.dose, route: form.route, days: parseInt(form.days) || 1, status: form.status, alert: form.alert || null } : p));
      toast.success("Prescrição atualizada!");
    } else {
      setPrescriptions(prev => [{ id: Date.now(), patient: form.patient, drug: form.drug, dose: form.dose, route: form.route, days: parseInt(form.days) || 1, status: form.status, alert: form.alert || null }, ...prev]);
      toast.success("Prescrição adicionada!");
    }
    setDialogOpen(false);
  };

  const setField = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard — Antimicrobianos</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Stewardship e consumo de antimicrobianos</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <DashboardAIInsights generateInsights={() => [
            "📊 DDD/1000 pac-dia em 842 — tendência de queda desde janeiro (890→842).",
            "⚠️ 7 alertas de stewardship ativos — Vancomicina leito 5B com >10 dias e Polimixina B de uso restrito.",
            "💊 UTI Adulto com maior consumo de carbapenêmicos (85 DDD) — avaliar oportunidades de descalonamento.",
            "✅ Taxa de desescalonamento em 64% — melhoria progressiva (+6pp em 6 meses).",
            "💡 Recomendação: revisão de antimicrobianos com >7 dias e coleta de culturas antes de início empírico.",
          ]} />
          <Button onClick={openNew} className="gap-2" size="sm">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Adicionar</span>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-3 p-3 md:pt-6 md:p-6">
              <div className={`flex h-9 w-9 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-lg ${k.bg}`}>
                <k.icon className={`h-4 w-4 md:h-6 md:w-6 ${k.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] md:text-xs text-muted-foreground truncate">{k.label}</p>
                <p className="text-lg md:text-2xl font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Tendência DDD/1000 pac-dia</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={35} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="ddd" stroke="hsl(168, 66%, 34%)" name="DDD/1000" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 md:p-6 pb-0"><CardTitle className="text-sm md:text-base">Taxa de Desescalonamento (%)</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-2">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={30} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="desesc" name="Desescalonamento" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Heatmap — Desktop table */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-2"><CardTitle className="text-sm md:text-base">Mapa de Calor — DDD por Setor e Classe</CardTitle></CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Setor</TableHead>
                  <TableHead className="text-center">Carbapenêm.</TableHead>
                  <TableHead className="text-center">Vanco.</TableHead>
                  <TableHead className="text-center">Polimix.</TableHead>
                  <TableHead className="text-center">Cefalos.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorHeatmap.map((r) => (
                  <TableRow key={r.setor}>
                    <TableCell className="font-medium">{r.setor}</TableCell>
                    <TableCell className={`text-center ${getCellColor(r.carbapenens)}`}>{r.carbapenens}</TableCell>
                    <TableCell className={`text-center ${getCellColor(r.vancomicina)}`}>{r.vancomicina}</TableCell>
                    <TableCell className={`text-center ${getCellColor(r.polimixina)}`}>{r.polimixina}</TableCell>
                    <TableCell className={`text-center ${getCellColor(r.cefalosporinas)}`}>{r.cefalosporinas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile */}
          <div className="md:hidden space-y-3 p-3">
            {sectorHeatmap.map((r) => (
              <div key={r.setor} className="border border-border rounded-lg p-3">
                <p className="font-semibold text-sm mb-2">{r.setor}</p>
                <div className="grid grid-cols-2 gap-2">
                  {heatmapClasses.map(({ key, label }) => (
                    <div key={key} className={`rounded-md px-2 py-1.5 text-center ${getCellColor(r[key])}`}>
                      <p className="text-[10px] text-muted-foreground">{label}</p>
                      <p className="text-sm font-mono font-bold">{r[key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Prescriptions */}
      <Card>
        <CardHeader className="p-3 md:p-6 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm md:text-base">Prescrições Ativas</CardTitle>
            <Button size="sm" variant="outline" onClick={openNew} className="gap-1 h-7 text-xs">
              <Plus className="h-3 w-3" /> Nova
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <Table className="text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Antimicrobiano</TableHead>
                  <TableHead>Dose</TableHead>
                  <TableHead className="text-center">Via</TableHead>
                  <TableHead className="text-center">Dias</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead>Alerta</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium whitespace-nowrap">{p.patient}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.drug}</TableCell>
                    <TableCell>{p.dose}</TableCell>
                    <TableCell className="text-center">{p.route}</TableCell>
                    <TableCell className="text-center">{p.days}</TableCell>
                    <TableCell className="text-center">{getStatusBadge(p.status)}</TableCell>
                    <TableCell>
                      {p.alert ? (
                        <span className="flex items-center gap-1 text-xs text-warning whitespace-nowrap">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> {p.alert}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden space-y-3 p-3">
            {prescriptions.map((p) => (
              <div key={p.id} className="border border-border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{p.patient}</p>
                    <p className="text-xs text-muted-foreground">{p.drug} — {p.dose}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => openEdit(p)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {getStatusBadge(p.status)}
                  <span className="text-xs text-muted-foreground">{p.route} · {p.days} dias</span>
                </div>
                {p.alert && (
                  <div className="flex items-center gap-1.5 text-xs text-warning bg-warning/10 rounded-md px-2 py-1.5">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {p.alert}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md mx-4">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Prescrição" : "Nova Prescrição"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Paciente *</Label>
              <Input placeholder="Ex: Pac. Leito 12A" value={form.patient} onChange={(e) => setField("patient", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Antimicrobiano *</Label>
              <Input placeholder="Ex: Meropenem" value={form.drug} onChange={(e) => setField("drug", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Dose</Label>
                <Input placeholder="Ex: 1g 8/8h" value={form.dose} onChange={(e) => setField("dose", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Via</Label>
                <Select value={form.route} onValueChange={(v) => setField("route", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{routeOptions.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Dias de Uso</Label>
                <Input type="number" min="1" value={form.days} onChange={(e) => setField("days", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statusOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alerta (opcional)</Label>
              <Input placeholder="Ex: Solicitar reavaliação" value={form.alert} onChange={(e) => setField("alert", e.target.value)} />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingItem ? "Salvar" : "Adicionar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
