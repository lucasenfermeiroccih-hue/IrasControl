import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import {
  Users, AlertTriangle, ShieldAlert, CheckCircle, Activity,
  TrendingUp, TrendingDown, Bot, ArrowRight, Loader2, Download
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";
import { toast } from "sonner";

export default function Dashboard() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [mes, setMes] = useState<string[]>([]);
  const [ano, setAno] = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);

  // Real data states
  const [patients, setPatients] = useState<any[]>([]);
  const [cases, setCases] = useState<any[]>([]);
  const [audits, setAudits] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId) return;
    const fetchAll = async () => {
      setLoading(true);
      const [pRes, cRes, aRes, alRes, lRes] = await Promise.all([
        supabase.from("patients").select("*").eq("hospital_id", hospitalId),
        supabase.from("infection_cases").select("*").eq("hospital_id", hospitalId),
        supabase.from("audits").select("*").eq("hospital_id", hospitalId),
        supabase.from("alerts").select("*").eq("hospital_id", hospitalId).eq("status", "active"),
        supabase.from("lab_results").select("*, antibiogram_results(*)").eq("hospital_id", hospitalId),
      ]);
      setPatients(pRes.data || []);
      setCases(cRes.data || []);
      setAudits(aRes.data || []);
      setAlerts(alRes.data || []);
      setLabResults(lRes.data || []);
      setLoading(false);
    };
    fetchAll();
  }, [hospitalId]);

  // Computed KPIs
  const activePatients = patients.filter(p => p.status === "active");
  const suspectCases = cases.filter(c => ["open", "investigating"].includes(c.status));
  const confirmedCases = cases.filter(c => c.status === "confirmed");
  const complianceRate = useMemo(() => {
    if (audits.length === 0) return 0;
    const totalCompliant = audits.reduce((sum, a) => sum + (a.compliant_items || 0), 0);
    const totalItems = audits.reduce((sum, a) => sum + (a.total_items || 0), 0);
    return totalItems > 0 ? ((totalCompliant / totalItems) * 100).toFixed(1) : "0";
  }, [audits]);

  // IRAS by sector
  const irasBySector = useMemo(() => {
    const map: Record<string, { total: number; confirmed: number }> = {};
    cases.forEach(c => {
      const sector = c.infection_site || "Outros";
      if (!map[sector]) map[sector] = { total: 0, confirmed: 0 };
      map[sector].total++;
      if (c.status === "confirmed") map[sector].confirmed++;
    });
    return Object.entries(map).map(([setor, d]) => ({
      setor,
      taxa: d.total > 0 ? Number(((d.confirmed / Math.max(activePatients.length, 1)) * 100).toFixed(1)) : 0,
    })).sort((a, b) => b.taxa - a.taxa).slice(0, 6);
  }, [cases, activePatients]);

  // Top organisms from lab
  const topMicro = useMemo(() => {
    const map: Record<string, number> = {};
    labResults.forEach(r => {
      if (r.organism) {
        map[r.organism] = (map[r.organism] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [labResults]);

  const maxMicro = topMicro.length > 0 ? topMicro[0].count : 1;

  // Compliance pie
  const pieData = useMemo(() => {
    const rate = Number(complianceRate);
    return [
      { name: "Conforme", value: rate, color: "hsl(142, 71%, 35%)" },
      { name: "Não Conforme", value: 100 - rate, color: "hsl(0, 72%, 51%)" },
    ];
  }, [complianceRate]);

  const handleExportPDF = async () => {
    toast.info("Gerando PDF do dashboard...");
    try {
      const { data, error } = await supabase.functions.invoke("generate-pdf", {
        body: {
          type: "dashboard",
          hospitalId,
          data: {
            totalPatients: activePatients.length,
            suspectCases: suspectCases.length,
            confirmedCases: confirmedCases.length,
            complianceRate,
            irasBySector,
            topMicro,
            activeAlerts: alerts.length,
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
        a.download = `dashboard-${new Date().toISOString().split("T")[0]}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("PDF exportado com sucesso!");
      }
    } catch {
      toast.error("Erro ao gerar PDF. Tente novamente.");
    }
  };

  if (ctxLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const kpis = [
    { label: "Pacientes Monitorados", value: String(activePatients.length), icon: Users, trend: "", color: "text-info", bg: "bg-info/10" },
    { label: "Casos Suspeitos", value: String(suspectCases.length), icon: AlertTriangle, trend: "", color: "text-warning", bg: "bg-warning/10" },
    { label: "IRAS Confirmadas", value: String(confirmedCases.length), icon: ShieldAlert, trend: "", color: "text-destructive", bg: "bg-destructive/10" },
    { label: "Taxa de Conformidade", value: `${complianceRate}%`, icon: CheckCircle, trend: "", color: "text-success", bg: "bg-success/10" },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Principal</h1>
          <p className="text-sm text-muted-foreground">Visão consolidada da situação epidemiológica</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-1" /> PDF
          </Button>
          <DashboardAIInsights generateInsights={() => {
            const insights: string[] = [];
            insights.push(`📊 ${activePatients.length} pacientes monitorados com ${confirmedCases.length} IRAS confirmadas.`);
            if (alerts.length > 0) insights.push(`⚠️ ${alerts.length} alerta(s) ativo(s) requerem atenção.`);
            insights.push(`✅ Taxa de conformidade geral em ${complianceRate}%.`);
            if (topMicro.length > 0) insights.push(`🦠 Principal patógeno: ${topMicro[0].name} (${topMicro[0].count} isolados).`);
            return insights;
          }} />
        </div>
      </div>

      <DashboardFilters mes={mes} setMes={setMes} ano={ano} setAno={setAno} setor={setor} setSetor={setSetor} />

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${kpi.bg}`}>
                <kpi.icon className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{kpi.label}</p>
                <p className="text-2xl font-bold">{kpi.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* IRAS por Setor */}
        <Card>
          <CardHeader><CardTitle className="text-base">Taxa de IRAS por Setor (%)</CardTitle></CardHeader>
          <CardContent>
            {irasBySector.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={irasBySector}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="setor" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="taxa" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhum dado disponível. Cadastre casos para visualizar.</p>
            )}
          </CardContent>
        </Card>

        {/* Conformidade */}
        <Card>
          <CardHeader><CardTitle className="text-base">Conformidade Geral</CardTitle></CardHeader>
          <CardContent>
            {audits.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-10">Nenhuma auditoria registrada ainda.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Alertas */}
        <Card>
          <CardHeader><CardTitle className="text-base">Alertas Ativos ({alerts.length})</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {alerts.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum alerta ativo</p>}
            {alerts.slice(0, 5).map((a) => (
              <div key={a.id} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <Badge variant="destructive" className="text-xs">{a.severity}</Badge>
                </div>
                <p className="mt-1.5 text-sm">{a.title}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Microrganismos */}
        <Card>
          <CardHeader><CardTitle className="text-base">Top Microrganismos</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {topMicro.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhum resultado laboratorial</p>}
            {topMicro.map((m, i) => (
              <div key={m.name} className="flex items-center gap-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.name}</p>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${(m.count / maxMicro) * 100}%` }} />
                  </div>
                </div>
                <span className="text-sm font-bold">{m.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Resumo Auditorias */}
        <Card>
          <CardHeader><CardTitle className="text-base">Resumo de Auditorias</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {audits.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Nenhuma auditoria registrada</p>}
            {audits.slice(0, 5).map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium capitalize">{a.audit_type?.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">{a.sector || "Geral"} · {a.audit_date}</p>
                </div>
                <Badge variant={Number(a.compliance_rate) >= 80 ? "secondary" : "destructive"}>
                  {a.compliance_rate ? `${a.compliance_rate}%` : "N/A"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
