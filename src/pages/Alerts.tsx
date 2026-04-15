import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { exportPdf } from "@/lib/pdf-export";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { Bell, AlertTriangle, ShieldAlert, CheckCircle, ArrowUpRight, Loader2, Download } from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";

const severityConfig: Record<string, { label: string; variant: "destructive" | "default" | "secondary" | "outline" }> = {
  critical: { label: "Crítico", variant: "destructive" },
  high: { label: "Alto", variant: "default" },
  medium: { label: "Médio", variant: "secondary" },
  low: { label: "Baixo", variant: "outline" },
};

const Alerts = () => {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState("todos");
  const [filterStatus, setFilterStatus] = useState("todos");
  const [detail, setDetail] = useState<any | null>(null);

  const fetchAlerts = async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data } = await supabase
      .from("alerts")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false });
    setAlerts(data || []);
    setLoading(false);
  };

  useEffect(() => { if (hospitalId) fetchAlerts(); }, [hospitalId]);

  const filtered = alerts.filter(a => {
    if (filterSeverity !== "todos" && a.severity !== filterSeverity) return false;
    if (filterStatus !== "todos" && a.status !== filterStatus) return false;
    return true;
  });

  const handleResolve = async (id: string) => {
    await supabase.from("alerts").update({ status: "resolved" as const, resolved_at: new Date().toISOString() }).eq("id", id);
    toast.success("Alerta resolvido!");
    setDetail(null);
    fetchAlerts();
  };

  const handleExportPDF = () => {
    if (!hospitalId) return;
    exportPdf({
      type: "alerts",
      hospitalId,
      data: {
        alerts: alerts.map(a => ({
          title: a.title,
          severity: a.severity,
          status: a.status,
          date: a.created_at?.split("T")[0] || "",
        })),
      },
      filenamePrefix: "alertas",
    });
  };

  if (ctxLoading || loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  const kpis = {
    total: alerts.length,
    criticos: alerts.filter(a => a.severity === "critical" && a.status === "active").length,
    resolvidos: alerts.filter(a => a.status === "resolved").length,
    pendentes: alerts.filter(a => a.status === "active").length,
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Alertas</h1><p className="text-muted-foreground">Central de alertas e notificações</p></div>
        <div className="flex gap-2">
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            ins.push(`📊 ${kpis.total} alertas registrados: ${kpis.pendentes} ativos, ${kpis.resolvidos} resolvidos.`);
            if (kpis.criticos > 0) ins.push(`🚨 ${kpis.criticos} alertas críticos requerem ação imediata!`);
            else ins.push(`✅ Nenhum alerta crítico ativo no momento.`);
            const bySev: Record<string, number> = {}; alerts.forEach(a => { bySev[a.severity] = (bySev[a.severity] || 0) + 1; });
            Object.entries(bySev).forEach(([s, c]) => ins.push(`📌 ${severityConfig[s]?.label || s}: ${c} alerta(s).`));
            if (kpis.resolvidos > 0) ins.push(`📈 Taxa de resolução: ${((kpis.resolvidos / Math.max(kpis.total, 1)) * 100).toFixed(1)}%.`);
            return ins;
          }} />
          <Button variant="outline" size="sm" onClick={handleExportPDF}><Download className="h-4 w-4 mr-1" /> PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><Bell className="mx-auto h-8 w-8 text-primary mb-2" /><p className="text-2xl font-bold">{kpis.total}</p><p className="text-sm text-muted-foreground">Total</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" /><p className="text-2xl font-bold">{kpis.criticos}</p><p className="text-sm text-muted-foreground">Críticos</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><CheckCircle className="mx-auto h-8 w-8 text-success mb-2" /><p className="text-2xl font-bold">{kpis.resolvidos}</p><p className="text-sm text-muted-foreground">Resolvidos</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><ShieldAlert className="mx-auto h-8 w-8 text-warning mb-2" /><p className="text-2xl font-bold">{kpis.pendentes}</p><p className="text-sm text-muted-foreground">Pendentes</p></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select value={filterSeverity} onValueChange={setFilterSeverity}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Severidade</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="high">Alto</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="low">Baixo</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Status</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="acknowledged">Reconhecido</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum alerta encontrado.</p>}
        {filtered.map(alert => {
          const sc = severityConfig[alert.severity] || severityConfig.medium;
          return (
            <Card key={alert.id} className={`cursor-pointer hover:bg-muted/30 ${alert.status === "resolved" ? "opacity-60" : ""}`} onClick={() => setDetail(alert)}>
              <CardContent className="flex items-start gap-4 py-4">
                <AlertTriangle className={`h-5 w-5 mt-0.5 ${alert.severity === "critical" ? "text-destructive" : "text-warning"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={sc.variant} className="text-xs">{sc.label}</Badge>
                    <Badge variant="outline" className="text-xs">{alert.status}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{alert.created_at?.split("T")[0]}</span>
                  </div>
                  <h3 className={`font-semibold text-sm ${alert.status === "resolved" ? "line-through" : ""}`}>{alert.title}</h3>
                  {alert.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{alert.description}</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={!!detail} onOpenChange={() => setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader><DialogTitle>{detail.title}</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="flex gap-2 text-xs">
                  <Badge variant={severityConfig[detail.severity]?.variant || "outline"}>{severityConfig[detail.severity]?.label || detail.severity}</Badge>
                  <Badge variant="outline">{detail.status}</Badge>
                </div>
                {detail.description && <p className="text-sm">{detail.description}</p>}
                {detail.status === "active" && (
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => handleResolve(detail.id)}><CheckCircle className="mr-1 h-4 w-4" />Resolver</Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Alerts;
