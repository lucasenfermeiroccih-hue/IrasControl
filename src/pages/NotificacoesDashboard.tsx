import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import {
  BarChart3, ArrowLeft, Loader2, Bell, TrendingUp, AlertTriangle,
  Activity, Droplets, Microscope,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

const MES_LABELS = [
  "Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez",
];

const MES_OPTIONS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

const COLORS = ["#6366f1","#10b981","#f59e0b","#ef4444","#8b5cf6","#14b8a6"];

interface Notification {
  id: string;
  type_id: string;
  mes_vigilancia: string | null;
  ano_vigilancia: number;
  status: string;
  calculated: Record<string, any>;
  inputs: Record<string, any>;
  notification_types: { nome: string; paradigma: string } | null;
}

export default function NotificacoesDashboard() {
  const navigate = useNavigate();
  const { hospitalId } = useHospitalContext();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAno, setFilterAno] = useState(String(new Date().getFullYear()));
  const [filterType, setFilterType] = useState("all");
  const [types, setTypes] = useState<Array<{ id: string; nome: string }>>([]);

  useEffect(() => {
    if (!hospitalId) return;
    loadData();
  }, [hospitalId]);

  async function loadData() {
    setLoading(true);
    try {
      const [{ data: nots }, { data: typesData }] = await Promise.all([
        (supabase.from("notifications" as any)
          .select("id, type_id, mes_vigilancia, ano_vigilancia, status, calculated, inputs, notification_types(nome, paradigma)")
          .eq("hospital_id", hospitalId)
          .eq("status", "finalizada")
          .order("ano_vigilancia, mes_vigilancia") as any),
        (supabase.from("notification_types" as any)
          .select("id, nome")
          .eq("ativo", true) as any),
      ]);
      if (nots) setNotifications(nots as Notification[]);
      if (typesData) setTypes(typesData as Array<{ id: string; nome: string }>);
    } catch (e: any) {
      toast.error("Erro ao carregar dashboard: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const anoOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - 2 + i));

  const filtered = notifications.filter(n => {
    if (n.ano_vigilancia !== Number(filterAno)) return false;
    if (filterType !== "all" && n.type_id !== filterType) return false;
    return true;
  });

  // Build monthly time series
  const timeSeries = useMemo(() => {
    const byMes: Record<string, {
      mes: string; mesLabel: string;
      di_ipcsl: number | null; di_itu: number | null; di_pav: number | null;
      tx_uso_cvc: number | null; tx_uso_cvd: number | null; tx_uso_vm: number | null;
      consumo_alcool: number | null;
      count: number;
    }> = {};

    for (const mes of MES_OPTIONS) {
      const idx = MES_OPTIONS.indexOf(mes);
      byMes[mes] = {
        mes,
        mesLabel: MES_LABELS[idx] || mes.slice(0, 3),
        di_ipcsl: null, di_itu: null, di_pav: null,
        tx_uso_cvc: null, tx_uso_cvd: null, tx_uso_vm: null,
        consumo_alcool: null, count: 0,
      };
    }

    for (const n of filtered) {
      const m = n.mes_vigilancia;
      if (!m || !byMes[m]) continue;
      const c = n.calculated || {};
      const slot = byMes[m];
      slot.count++;
      if (c.di_ipcsl != null) slot.di_ipcsl = (slot.di_ipcsl || 0) + c.di_ipcsl;
      if (c.di_itu != null) slot.di_itu = (slot.di_itu || 0) + c.di_itu;
      if (c.di_pav != null) slot.di_pav = (slot.di_pav || 0) + c.di_pav;
      if (c.tx_uso_cvc != null) slot.tx_uso_cvc = (slot.tx_uso_cvc || 0) + c.tx_uso_cvc;
      if (c.tx_uso_cvd != null) slot.tx_uso_cvd = (slot.tx_uso_cvd || 0) + c.tx_uso_cvd;
      if (c.tx_uso_vm != null) slot.tx_uso_vm = (slot.tx_uso_vm || 0) + c.tx_uso_vm;
      if (c.consumo_alcool_pac_dia != null) slot.consumo_alcool = (slot.consumo_alcool || 0) + c.consumo_alcool_pac_dia;
    }

    // Average multi-count months
    return Object.values(byMes).map(s => ({
      ...s,
      di_ipcsl: s.count > 0 && s.di_ipcsl != null ? s.di_ipcsl / s.count : null,
      di_itu: s.count > 0 && s.di_itu != null ? s.di_itu / s.count : null,
      di_pav: s.count > 0 && s.di_pav != null ? s.di_pav / s.count : null,
      tx_uso_cvc: s.count > 0 && s.tx_uso_cvc != null ? s.tx_uso_cvc / s.count : null,
      consumo_alcool: s.count > 0 && s.consumo_alcool != null ? s.consumo_alcool / s.count : null,
    }));
  }, [filtered]);

  const activeSeries = timeSeries.filter(s => s.count > 0);

  // Microorganism ranking from RAM data
  const microRanking = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of filtered) {
      const top = n.inputs?._top || n.inputs || {};
      for (const key of ["micro_ipcsl", "micro_itu"]) {
        const mat = top[key] || {};
        for (const [org, entry] of Object.entries(mat)) {
          if (typeof entry === "object" && entry !== null && (entry as any).isolados > 0) {
            counts[org] = (counts[org] || 0) + ((entry as any).isolados || 0);
          }
        }
      }
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, value]) => ({ name, value }));
  }, [filtered]);

  // Surtos ativos
  const surtos = useMemo(() =>
    filtered.filter(n => n.type_id === "anvisa_surtos"),
    [filtered]
  );

  // Alcohol alert count (consumo < 20 mL/pac-dia)
  const lowAlcohol = useMemo(() =>
    filtered.filter(n => {
      const v = n.calculated?.consumo_alcool_pac_dia;
      return v !== null && v !== undefined && v < 20;
    }).length,
    [filtered]
  );

  const avgDiIpcsl = activeSeries.reduce((s, m) => s + (m.di_ipcsl || 0), 0) / (activeSeries.filter(m => m.di_ipcsl != null).length || 1);
  const avgDiItu = activeSeries.reduce((s, m) => s + (m.di_itu || 0), 0) / (activeSeries.filter(m => m.di_itu != null).length || 1);
  const avgDiPav = activeSeries.reduce((s, m) => s + (m.di_pav || 0), 0) / (activeSeries.filter(m => m.di_pav != null).length || 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/notificacoes")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Dashboard ANVISA/PLACON</h1>
          <p className="text-sm text-muted-foreground">Análise de notificações finalizadas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <Select value={filterAno} onValueChange={setFilterAno}>
          <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {anoOptions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-56"><SelectValue placeholder="Todos os modelos" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os modelos</SelectItem>
            {types.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />Carregando dashboard…
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">DI IPCSL-CC</span>
                </div>
                <p className="text-2xl font-bold">{avgDiIpcsl.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">por 1.000 CVC-dia</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">DI ITU-AC</span>
                </div>
                <p className="text-2xl font-bold">{avgDiItu.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">por 1.000 CVD-dia</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">DI PAV</span>
                </div>
                <p className="text-2xl font-bold">{avgDiPav.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">por 1.000 VM-dia</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`h-4 w-4 ${lowAlcohol > 0 ? "text-destructive" : "text-green-500"}`} />
                  <span className="text-xs text-muted-foreground">Álcool &lt; 20 mL</span>
                </div>
                <p className={`text-2xl font-bold ${lowAlcohol > 0 ? "text-destructive" : ""}`}>{lowAlcohol}</p>
                <p className="text-xs text-muted-foreground">meses abaixo do mínimo</p>
              </CardContent>
            </Card>
          </div>

          {/* Time series — IRAS density */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Densidades de incidência por mês ({filterAno})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeSeries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Sem dados finalizados para o período.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={timeSeries} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any, name: string) => [
                        val != null ? Number(val).toFixed(2) : "—",
                        name,
                      ]}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="di_ipcsl" name="DI IPCSL-CC" stroke={COLORS[0]} dot connectNulls strokeWidth={2} />
                    <Line type="monotone" dataKey="di_itu" name="DI ITU-AC" stroke={COLORS[1]} dot connectNulls strokeWidth={2} />
                    <Line type="monotone" dataKey="di_pav" name="DI PAV" stroke={COLORS[2]} dot connectNulls strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Device utilization + Alcohol */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Taxa de Utilização de Dispositivos</CardTitle>
              </CardHeader>
              <CardContent>
                {activeSeries.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mesLabel" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} domain={[0, 1]} />
                      <Tooltip formatter={(v: any) => v != null ? Number(v).toFixed(3) : "—"} />
                      <Legend />
                      <Line type="monotone" dataKey="tx_uso_cvc" name="Tx CVC" stroke={COLORS[0]} strokeWidth={2} connectNulls dot />
                      <Line type="monotone" dataKey="tx_uso_cvd" name="Tx CVD" stroke={COLORS[1]} strokeWidth={2} connectNulls dot />
                      <Line type="monotone" dataKey="tx_uso_vm" name="Tx VM" stroke={COLORS[2]} strokeWidth={2} connectNulls dot />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  Consumo de Álcool Gel (mL/pac-dia)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeSeries.filter(s => s.consumo_alcool != null).length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">Sem dados de higiene das mãos</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="mesLabel" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v: any) => v != null ? `${Number(v).toFixed(1)} mL` : "—"} />
                      <Bar dataKey="consumo_alcool" name="Consumo mL/pac-dia" fill={COLORS[0]}>
                        {timeSeries.map((entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={entry.consumo_alcool != null && entry.consumo_alcool < 20 ? "#ef4444" : COLORS[0]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {lowAlcohol > 0 && (
                  <div className="mt-2 text-xs text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Barras vermelhas = abaixo do mínimo OMS (20 mL/pac-dia)
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Microorganism ranking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {microRanking.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Microscope className="h-4 w-4 text-primary" />
                    Ranking de Microrganismos (por isolados)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={microRanking} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={160} />
                      <Tooltip />
                      <Bar dataKey="value" name="Isolados" fill={COLORS[4]} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Surtos ativos */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Surtos Notificados
                  {surtos.length > 0 && (
                    <Badge variant="destructive" className="text-xs">{surtos.length}</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {surtos.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">
                    Nenhum surto notificado no período.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {surtos.map(s => {
                      const top = s.inputs?._top || s.inputs || {};
                      return (
                        <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-destructive/20 bg-destructive/5">
                          <div>
                            <p className="text-sm font-medium">{top.microrganismo || "Sem microrganismo"}</p>
                            <p className="text-xs text-muted-foreground">{s.mes_vigilancia} {s.ano_vigilancia}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => navigate(`/notificacoes/${s.id}/editar`)}>
                            <Bell className="h-3 w-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
