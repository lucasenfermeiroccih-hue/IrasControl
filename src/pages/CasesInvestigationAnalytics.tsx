import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, Legend, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import {
  Loader2, Download, Filter, X, CalendarIcon, BarChart3, Activity,
  ShieldAlert, Pill, Users, Heart, Stethoscope, ClipboardList, Target,
  TrendingUp, AlertTriangle, CheckCircle, Clock, FileText, Bug
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";

// ─── Constants ─────────────────────────────────────────────────
const SETORES = [
  "UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica",
  "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica", "Contêiner",
  "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto",
];

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const PIE_COLORS = [
  "hsl(var(--primary))", "hsl(var(--destructive))", "#f59e0b", "#8b5cf6",
  "#06b6d4", "#ec4899", "#10b981", "#f97316", "#6366f1", "#14b8a6",
];

type CaseStatus = "open" | "investigating" | "confirmed" | "discarded" | "closed";

interface CaseRow {
  id: string;
  case_number: string | null;
  infection_type: string | null;
  infection_site: string | null;
  device_related: boolean | null;
  device_type: string | null;
  status: CaseStatus;
  detection_date: string;
  confirmation_date: string | null;
  notes: string | null;
  created_at: string;
  patient?: { full_name: string; medical_record: string | null; sector: string | null; status: string; discharge_date: string | null } | null;
}

interface PrescriptionRow {
  id: string;
  drug_name: string;
  start_date: string;
  end_date: string | null;
  patient_id: string;
}

interface DeviceRow {
  id: string;
  device_type: string;
  insertion_date: string;
  removal_date: string | null;
  patient_id: string;
}

// ─── Page Component ────────────────────────────────────────────
export default function CasesInvestigationAnalytics() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [cases, setCases] = useState<CaseRow[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [devices, setDevices] = useState<DeviceRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterSetor, setFilterSetor] = useState("all");
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [filterMes, setFilterMes] = useState("all");
  const [filterAno, setFilterAno] = useState("all");

  const currentYear = new Date().getFullYear();
  const ANOS = [String(currentYear), String(currentYear - 1), String(currentYear - 2)];

  // ─── Fetch Data ──────────────────────────────────────────────
  useEffect(() => {
    if (!hospitalId) return;
    const fetchAll = async () => {
      setLoading(true);
      const [casesRes, prescRes, devicesRes] = await Promise.all([
        supabase
          .from("infection_cases")
          .select("*, patient:patients(full_name, medical_record, sector, status, discharge_date)")
          .eq("hospital_id", hospitalId)
          .order("detection_date", { ascending: false }),
        supabase
          .from("antimicrobial_prescriptions")
          .select("id, drug_name, start_date, end_date, patient_id")
          .eq("hospital_id", hospitalId),
        supabase
          .from("patient_devices")
          .select("id, device_type, insertion_date, removal_date, patient_id"),
      ]);

      if (casesRes.data) setCases(casesRes.data.map(d => ({ ...d, patient: d.patient as any })));
      if (prescRes.data) setPrescriptions(prescRes.data);
      if (devicesRes.data) setDevices(devicesRes.data);
      setLoading(false);
    };
    fetchAll();
  }, [hospitalId]);

  const clearFilters = () => {
    setFilterSetor("all");
    setFilterDateFrom(undefined);
    setFilterDateTo(undefined);
    setFilterMes("all");
    setFilterAno("all");
  };

  const hasFilters = filterSetor !== "all" || filterDateFrom || filterDateTo || filterMes !== "all" || filterAno !== "all";

  // ─── Filtered Cases ──────────────────────────────────────────
  const filtered = useMemo(() => {
    return cases.filter(c => {
      if (filterSetor !== "all" && c.patient?.sector !== filterSetor) return false;
      if (filterDateFrom && c.detection_date < format(filterDateFrom, "yyyy-MM-dd")) return false;
      if (filterDateTo && c.detection_date > format(filterDateTo, "yyyy-MM-dd")) return false;
      if (filterMes !== "all") {
        const month = new Date(c.detection_date).getMonth();
        if (MESES[month] !== filterMes) return false;
      }
      if (filterAno !== "all") {
        if (String(new Date(c.detection_date).getFullYear()) !== filterAno) return false;
      }
      return true;
    });
  }, [cases, filterSetor, filterDateFrom, filterDateTo, filterMes, filterAno]);

  // ─── 9. Quadro de Status dos Casos ──────────────────────────
  const statusCounts = useMemo(() => {
    const counts = { open: 0, investigating: 0, confirmed: 0, discarded: 0, closed: 0 };
    filtered.forEach(c => { counts[c.status]++; });
    return counts;
  }, [filtered]);

  // ─── 3. Taxa de Infecção por Setor + Dispositivos ───────────
  const infectionBySetor = useMemo(() => {
    const map: Record<string, { total: number; device: number }> = {};
    filtered.forEach(c => {
      const s = c.patient?.sector || "Outros";
      if (!map[s]) map[s] = { total: 0, device: 0 };
      map[s].total++;
      if (c.device_related) map[s].device++;
    });
    return Object.entries(map)
      .sort((a, b) => b[1].total - a[1].total)
      .map(([name, v]) => ({ name: name.replace("UTI ", ""), total: v.total, dispositivo: v.device }));
  }, [filtered]);

  // ─── 4. Perfil Microbiológico ───────────────────────────────
  const pathogenProfile = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(c => {
      if (c.infection_type) map[c.infection_type] = (map[c.infection_type] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ─── Device usage distribution ──────────────────────────────
  const deviceDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach(c => {
      if (c.device_type) {
        const label = c.device_type === "cvc" ? "CVC" : c.device_type === "svu" ? "SVD" : c.device_type === "vm" ? "VM" : c.device_type.toUpperCase();
        map[label] = (map[label] || 0) + 1;
      }
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // ─── 5. Tempo Médio de Resposta ─────────────────────────────
  const avgResponseTime = useMemo(() => {
    const times: number[] = [];
    filtered.forEach(c => {
      if (c.detection_date && c.confirmation_date) {
        const diff = (new Date(c.confirmation_date).getTime() - new Date(c.detection_date).getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) times.push(diff);
      }
    });
    return times.length > 0 ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10 : null;
  }, [filtered]);

  // ─── 6. Consumo de Antimicrobianos ──────────────────────────
  const antimicrobialConsumption = useMemo(() => {
    const map: Record<string, number> = {};
    prescriptions.forEach(p => {
      map[p.drug_name] = (map[p.drug_name] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [prescriptions]);

  const totalPrescriptions = prescriptions.length;

  // ─── 10. Internações por Especialidade (setor como proxy) ──
  const admissionsBySpecialty = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    filtered.forEach(c => {
      const month = c.detection_date.slice(0, 7);
      const sector = c.patient?.sector || "Outros";
      if (!map[month]) map[month] = {};
      map[month][sector] = (map[month][sector] || 0) + 1;
    });
    const months = Object.keys(map).sort();
    const sectors = [...new Set(filtered.map(c => c.patient?.sector || "Outros"))];
    return { months, sectors, data: months.map(m => ({ mes: m, ...map[m] })) };
  }, [filtered]);

  // ─── 11. Indicadores Paciente-Dia ───────────────────────────
  const deviceDensity = useMemo(() => {
    const cvc = devices.filter(d => d.device_type === "cvc").length;
    const svd = devices.filter(d => d.device_type === "svu").length;
    const vm = devices.filter(d => d.device_type === "vm").length;
    return { cvc, svd, vm, total: cvc + svd + vm };
  }, [devices]);

  // ─── 12. Desfechos ──────────────────────────────────────────
  const outcomes = useMemo(() => {
    let obitos = 0;
    let altas = 0;
    filtered.forEach(c => {
      if (c.patient?.status === "deceased") obitos++;
      if (c.patient?.status === "discharged") altas++;
    });
    return { obitos, altas };
  }, [filtered]);

  // ─── Cases over time (monthly) ──────────────────────────────
  const casesOverTime = useMemo(() => {
    const map: Record<string, { open: number; investigating: number; confirmed: number; closed: number }> = {};
    filtered.forEach(c => {
      const m = c.detection_date.slice(0, 7);
      if (!map[m]) map[m] = { open: 0, investigating: 0, confirmed: 0, closed: 0 };
      if (c.status === "confirmed") map[m].confirmed++;
      else if (c.status === "closed" || c.status === "discarded") map[m].closed++;
      else if (c.status === "investigating") map[m].investigating++;
      else map[m].open++;
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]))
      .map(([mes, v]) => ({ mes, ...v }));
  }, [filtered]);

  // ─── 7. KPIs Conformidade ──────────────────────────────────
  const kpis = useMemo(() => {
    const totalCases = filtered.length;
    const confirmed = statusCounts.confirmed;
    const rateConfirmed = totalCases > 0 ? Math.round((confirmed / totalCases) * 100) : 0;
    const deviceRelated = filtered.filter(c => c.device_related).length;
    const rateDevice = totalCases > 0 ? Math.round((deviceRelated / totalCases) * 100) : 0;
    return { totalCases, confirmed, rateConfirmed, deviceRelated, rateDevice };
  }, [filtered, statusCounts]);

  // ─── Export ─────────────────────────────────────────────────
  const handleExportCSV = () => {
    const header = "Caso,Status,Tipo,Setor,Detecção,Confirmação,Dispositivo\n";
    const rows = filtered.map(c =>
      `${c.case_number || ""},${c.status},${c.infection_type || ""},${c.patient?.sector || ""},${c.detection_date},${c.confirmation_date || ""},${c.device_related ? "Sim" : "Não"}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-casos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exportado!");
  };

  const handleExportPDF = () => {
    if (!hospitalId) return;
    exportPdf({
      type: "cases-analytics",
      hospitalId,
      data: { kpis, statusCounts, total: filtered.length },
      filenamePrefix: "relatorio-casos-analytics",
    });
  };

  // ─── Loading ────────────────────────────────────────────────
  if (ctxLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Indicadores e Relatórios Gerais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão consolidada do desempenho epidemiológico — {filtered.length} caso(s)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> Excel/CSV
          </Button>
        </div>
      </div>

      {/* 2 & 14. Filtros de Período e Setor */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" /> Filtros
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
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
              <div className="flex gap-2 items-end">
                {hasFilters && (
                  <Button variant="ghost" size="sm" className="h-9 gap-1" onClick={clearFilters}>
                    <X className="h-3.5 w-3.5" /> Limpar
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 9. Quadro de Status dos Casos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {([
          { key: "open" as const, label: "Abertos", icon: AlertTriangle, color: "text-destructive" },
          { key: "investigating" as const, label: "Em Investigação", icon: Clock, color: "text-primary" },
          { key: "confirmed" as const, label: "Confirmados", icon: ShieldAlert, color: "text-warning" },
          { key: "discarded" as const, label: "Descartados", icon: X, color: "text-muted-foreground" },
          { key: "closed" as const, label: "Encerrados", icon: CheckCircle, color: "text-success" },
        ]).map(item => (
          <Card key={item.key}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <item.icon className={cn("h-4 w-4", item.color)} />
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
              <p className="text-2xl font-bold mt-1">{statusCounts[item.key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 7. KPIs de Conformidade e Gestão */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Total de Casos</p>
            </div>
            <p className="text-2xl font-bold mt-1">{kpis.totalCases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Taxa Confirmação</p>
            </div>
            <p className="text-2xl font-bold mt-1">{kpis.rateConfirmed}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Relacionados a Dispositivo</p>
            </div>
            <p className="text-2xl font-bold mt-1">{kpis.deviceRelated} ({kpis.rateDevice}%)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Tempo Médio Resposta</p>
            </div>
            <p className="text-2xl font-bold mt-1">{avgResponseTime !== null ? `${avgResponseTime} dias` : "—"}</p>
          </CardContent>
        </Card>
      </div>

      {/* 12. Desfechos + 11. Dispositivos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-destructive" />
              <p className="text-xs text-muted-foreground">Óbitos</p>
            </div>
            <p className="text-2xl font-bold mt-1">{outcomes.obitos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <p className="text-xs text-muted-foreground">Altas</p>
            </div>
            <p className="text-2xl font-bold mt-1">{outcomes.altas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Pill className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Prescrições Antimicrobianos</p>
            </div>
            <p className="text-2xl font-bold mt-1">{totalPrescriptions}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <p className="text-xs text-muted-foreground">Dispositivos (CVC/SVD/VM)</p>
            </div>
            <p className="text-2xl font-bold mt-1">{deviceDensity.cvc} / {deviceDensity.svd} / {deviceDensity.vm}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1: Cases over Time + Infection by Setor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {casesOverTime.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Evolução de Casos (Mensal)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={casesOverTime}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="open" stackId="a" fill="#ef4444" name="Aberto" />
                  <Bar dataKey="investigating" stackId="a" fill="hsl(var(--primary))" name="Investigação" />
                  <Bar dataKey="confirmed" stackId="a" fill="#f59e0b" name="Confirmado" />
                  <Bar dataKey="closed" stackId="a" fill="#10b981" name="Encerrado" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {infectionBySetor.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                Taxa de Infecção por Setor
              </CardTitle>
              <CardDescription className="text-xs">Total de casos e associados a dispositivos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={infectionBySetor}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="dispositivo" fill="hsl(var(--destructive))" name="Dispositivo" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row 2: Perfil Microbiológico + Dispositivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pathogenProfile.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Bug className="h-4 w-4 text-primary" />
                Perfil Microbiológico — Tipos de Infecção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pathogenProfile} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false} fontSize={10}>
                    {pathogenProfile.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {deviceDistribution.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-primary" />
                Uso de Dispositivos Invasivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deviceDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={60} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Casos" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Row 3: Consumo Antimicrobianos + Internações por Especialidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {antimicrobialConsumption.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Pill className="h-4 w-4 text-primary" />
                Consumo de Antimicrobianos (Top 10)
              </CardTitle>
              <CardDescription className="text-xs">Total de prescrições por antimicrobiano</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={antimicrobialConsumption} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={130} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Prescrições" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {admissionsBySpecialty.data.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                Internações por Especialidade (Mensal)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={admissionsBySpecialty.data}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {admissionsBySpecialty.sectors.slice(0, 6).map((s, i) => (
                    <Line key={s} type="monotone" dataKey={s} stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth={2} dot={{ r: 2 }} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-semibold text-foreground">Nenhum caso encontrado</p>
              <p className="text-sm text-muted-foreground">
                Registre casos na página <a href="/cases/investigation" className="text-primary underline">/cases/investigation</a> para visualizar os indicadores.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
