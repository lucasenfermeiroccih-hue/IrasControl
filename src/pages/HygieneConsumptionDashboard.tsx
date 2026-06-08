import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HandMetal, FileText, TrendingUp, Droplets, Activity, Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, ComposedChart, Line } from "recharts";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

interface HygieneRecord {
  setor: string;
  mes: string;
  ano: string;
  total_formularios: number;
  instancias_com_higienizacao: number;
  instancias_sem_higienizacao: number;
  consumo_alcool_ml: number;
  consumo_sabonete_ml: number;
  paciente_dia: number;
}

export default function HygieneConsumptionDashboard() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [records, setRecords] = useState<HygieneRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("Todos");
  const [setor, setSetor] = useState("Todos");

  useEffect(() => {
    if (!hospitalId || ctxLoading) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("hygiene_consumption_records")
        .select("setor, mes, ano, total_formularios, instancias_com_higienizacao, instancias_sem_higienizacao, consumo_alcool_ml, consumo_sabonete_ml, paciente_dia")
        .eq("hospital_id", hospitalId)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setRecords(data.map(d => ({
          setor: d.setor,
          mes: d.mes,
          ano: d.ano,
          total_formularios: d.total_formularios,
          instancias_com_higienizacao: d.instancias_com_higienizacao,
          instancias_sem_higienizacao: d.instancias_sem_higienizacao,
          consumo_alcool_ml: Number(d.consumo_alcool_ml),
          consumo_sabonete_ml: Number(d.consumo_sabonete_ml),
          paciente_dia: d.paciente_dia,
        })));
      }
      setLoading(false);
    })();
  }, [hospitalId, ctxLoading]);

  const setores = useMemo(() => {
    const s = new Set(records.map(r => r.setor));
    return ["Todos", ...Array.from(s)];
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter(d => {
      if (setor !== "Todos" && d.setor !== setor) return false;
      if (periodo !== "Todos" && d.mes !== periodo) return false;
      return true;
    });
  }, [records, periodo, setor]);

  const totalFormularios = filtered.reduce((s, d) => s + d.total_formularios, 0);
  const totalCom = filtered.reduce((s, d) => s + d.instancias_com_higienizacao, 0);
  const totalSem = filtered.reduce((s, d) => s + d.instancias_sem_higienizacao, 0);
  const taxaGeral = totalCom + totalSem > 0 ? ((totalCom / (totalCom + totalSem)) * 100).toFixed(1) : "—";
  const totalAlcool = filtered.reduce((s, d) => s + d.consumo_alcool_ml, 0);
  const totalSabonete = filtered.reduce((s, d) => s + d.consumo_sabonete_ml, 0);
  const totalPD = filtered.reduce((s, d) => s + d.paciente_dia, 0);
  const consumoPD = totalPD > 0 ? ((totalAlcool + totalSabonete) / totalPD).toFixed(2) : "—";

  const chartData = useMemo(() => {
    const bySetor: Record<string, { setor: string; alcool: number; sabonete: number }> = {};
    filtered.forEach(d => {
      if (!bySetor[d.setor]) bySetor[d.setor] = { setor: d.setor, alcool: 0, sabonete: 0 };
      bySetor[d.setor].alcool += d.consumo_alcool_ml;
      bySetor[d.setor].sabonete += d.consumo_sabonete_ml;
    });
    return Object.values(bySetor);
  }, [filtered]);

  const tableData = useMemo(() => {
    const bySetor: Record<string, { setor: string; pd: number; alcool: number; sabonete: number; com: number; sem: number }> = {};
    filtered.forEach(d => {
      if (!bySetor[d.setor]) bySetor[d.setor] = { setor: d.setor, pd: 0, alcool: 0, sabonete: 0, com: 0, sem: 0 };
      bySetor[d.setor].pd += d.paciente_dia;
      bySetor[d.setor].alcool += d.consumo_alcool_ml;
      bySetor[d.setor].sabonete += d.consumo_sabonete_ml;
      bySetor[d.setor].com += d.instancias_com_higienizacao;
      bySetor[d.setor].sem += d.instancias_sem_higienizacao;
    });
    return Object.values(bySetor);
  }, [filtered]);

  const comparativoSetores = useMemo(() => {
    return tableData.map(r => ({
      setor: r.setor,
      adesao: r.com + r.sem > 0 ? Number(((r.com / (r.com + r.sem)) * 100).toFixed(1)) : 0,
      consumoPD: r.pd > 0 ? Number(((r.alcool + r.sabonete) / r.pd).toFixed(2)) : 0,
      alcoolPD: r.pd > 0 ? Number((r.alcool / r.pd).toFixed(2)) : 0,
      sabonetePD: r.pd > 0 ? Number((r.sabonete / r.pd).toFixed(2)) : 0,
    }));
  }, [tableData]);

  if (loading || ctxLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-primary/10">
            <HandMetal className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Dashboard — Consumo de Higiene das Mãos</h1>
            <p className="text-sm text-muted-foreground">Portaria nº 1.377 · Monitoramento de indicadores</p>
          </div>
        </div>
        <DashboardAIInsights generateInsights={() => {
          const ins: string[] = [];
          if (filtered.length === 0) {
            ins.push("📋 Nenhum registro encontrado. Cadastre dados de consumo de higiene primeiro.");
            return ins;
          }
          ins.push(`📊 ${totalFormularios} formulários avaliados com taxa de adesão de ${taxaGeral}%.`);
          ins.push(`🧴 Consumo total: ${totalAlcool.toLocaleString()}ml álcool + ${totalSabonete.toLocaleString()}ml sabonete.`);
          ins.push(`📈 Consumo por paciente-dia: ${consumoPD} ml.`);
          ins.push(`✅ ${totalCom} observações com higienização vs ${totalSem} sem higienização.`);
          if (Number(taxaGeral) >= 80) ins.push(`🎯 Adesão acima de 80% — dentro da meta recomendada!`);
          else ins.push(`⚠️ Adesão abaixo de 80% — ações de melhoria são recomendadas.`);
          return ins;
        }} />
      </div>

      <Card>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Período</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todos">Todos os meses</SelectItem>
                  {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Setor</label>
              <Select value={setor} onValueChange={setSetor}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {setores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {records.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <HandMetal className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum registro de consumo</h3>
            <p className="text-sm text-muted-foreground">Cadastre registros de consumo de higiene das mãos para visualizar os indicadores.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Formulários Analisados</p>
                    <p className="text-xl md:text-2xl font-bold">{totalFormularios}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Taxa Conformidade (Adesão)</p>
                    <p className="text-xl md:text-2xl font-bold">{taxaGeral}%</p>
                    <Badge variant={typeof taxaGeral === "string" && parseFloat(taxaGeral) >= 80 ? "default" : "destructive"} className="mt-1 text-xs">
                      {typeof taxaGeral === "string" && parseFloat(taxaGeral) >= 80 ? "Conforme" : "Atenção"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <Droplets className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Consumo Total (ML)</p>
                    <p className="text-xl md:text-2xl font-bold">{(totalAlcool + totalSabonete).toLocaleString("pt-BR")}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Álcool: {totalAlcool.toLocaleString("pt-BR")} · Sabonete: {totalSabonete.toLocaleString("pt-BR")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-5">
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Consumo / Paciente-Dia</p>
                    <p className="text-xl md:text-2xl font-bold">{consumoPD} <span className="text-sm font-normal text-muted-foreground">ML/PD</span></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Consumo por Setor (ML)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="setor" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => `${v.toLocaleString("pt-BR")} ML`} />
                      <Legend />
                      <Bar dataKey="alcool" name="Prep. Alcoólica" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="alcool" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} formatter={(v: number) => v.toLocaleString("pt-BR")} />
                      </Bar>
                      <Bar dataKey="sabonete" name="Sabonete Líquido" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="sabonete" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} formatter={(v: number) => v.toLocaleString("pt-BR")} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {comparativoSetores.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Comparativo entre Setores — Adesão (%) vs Consumo / Paciente-Dia (ML)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={comparativoSetores} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="setor" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 12 }} label={{ value: "Adesão (%)", angle: -90, position: "insideLeft", style: { fontSize: 11 } }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} label={{ value: "ML/PD", angle: 90, position: "insideRight", style: { fontSize: 11 } }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="adesao" name="Taxa de Adesão (%)" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                        <LabelList dataKey="adesao" position="top" style={{ fontSize: 10, fill: "hsl(var(--foreground))" }} formatter={(v: number) => `${v}%`} />
                      </Bar>
                      <Line yAxisId="right" type="monotone" dataKey="consumoPD" name="Consumo / PD (ML)" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 4 }} label={{ position: "top", fontSize: 10, fill: "hsl(var(--foreground))" }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Indicadores por Unidade de Terapia Intensiva</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Unidade</TableHead>
                      <TableHead className="text-right">Paciente-Dia</TableHead>
                      <TableHead className="text-right">Álcool (ML)</TableHead>
                      <TableHead className="text-right">Sabonete (ML)</TableHead>
                      <TableHead className="text-right">Consumo/PD</TableHead>
                      <TableHead className="text-right">Taxa Adesão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tableData.map(row => {
                      const cpd = row.pd > 0 ? ((row.alcool + row.sabonete) / row.pd).toFixed(2) : "—";
                      const taxa = row.com + row.sem > 0 ? ((row.com / (row.com + row.sem)) * 100).toFixed(1) : "—";
                      return (
                        <TableRow key={row.setor}>
                          <TableCell className="font-medium">{row.setor}</TableCell>
                          <TableCell className="text-right">{row.pd.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{row.alcool.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{row.sabonete.toLocaleString("pt-BR")}</TableCell>
                          <TableCell className="text-right">{cpd} ML/PD</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={typeof taxa === "string" && parseFloat(taxa) >= 80 ? "default" : "destructive"}>
                              {taxa}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {tableData.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum dado encontrado para os filtros selecionados.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
