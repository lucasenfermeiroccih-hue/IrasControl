import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HandMetal, FileText, TrendingUp, Droplets, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import DashboardAIInsights from "@/components/DashboardAIInsights";

// ─── Mock Data ────────────────────────────────────────────────
const mockData = [
  { setor: "UTI Adulto", mes: "Janeiro", ano: "2026", formularios: 120, comHigienizacao: 98, semHigienizacao: 22, consumoAlcool: 14500, consumoSabonete: 8200, pacienteDia: 310 },
  { setor: "UTI Adulto", mes: "Fevereiro", ano: "2026", formularios: 115, comHigienizacao: 100, semHigienizacao: 15, consumoAlcool: 15200, consumoSabonete: 8800, pacienteDia: 290 },
  { setor: "UTI Adulto", mes: "Março", ano: "2026", formularios: 130, comHigienizacao: 112, semHigienizacao: 18, consumoAlcool: 16000, consumoSabonete: 9100, pacienteDia: 320 },
  { setor: "UTI Pediátrica", mes: "Janeiro", ano: "2026", formularios: 80, comHigienizacao: 72, semHigienizacao: 8, consumoAlcool: 6500, consumoSabonete: 4200, pacienteDia: 180 },
  { setor: "UTI Pediátrica", mes: "Fevereiro", ano: "2026", formularios: 75, comHigienizacao: 68, semHigienizacao: 7, consumoAlcool: 6200, consumoSabonete: 4000, pacienteDia: 170 },
  { setor: "UTI Pediátrica", mes: "Março", ano: "2026", formularios: 85, comHigienizacao: 78, semHigienizacao: 7, consumoAlcool: 7000, consumoSabonete: 4500, pacienteDia: 190 },
  { setor: "UTI Neonatal", mes: "Janeiro", ano: "2026", formularios: 60, comHigienizacao: 55, semHigienizacao: 5, consumoAlcool: 3800, consumoSabonete: 2500, pacienteDia: 150 },
  { setor: "UTI Neonatal", mes: "Fevereiro", ano: "2026", formularios: 58, comHigienizacao: 54, semHigienizacao: 4, consumoAlcool: 3600, consumoSabonete: 2400, pacienteDia: 145 },
  { setor: "UTI Neonatal", mes: "Março", ano: "2026", formularios: 65, comHigienizacao: 60, semHigienizacao: 5, consumoAlcool: 4100, consumoSabonete: 2700, pacienteDia: 160 },
];

const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const setores = ["Todos", "UTI Adulto", "UTI Pediátrica", "UTI Neonatal"];

export default function HygieneConsumptionDashboard() {
  const [periodo, setPeriodo] = useState("Todos");
  const [setor, setSetor] = useState("Todos");

  const filtered = useMemo(() => {
    return mockData.filter(d => {
      if (setor !== "Todos" && d.setor !== setor) return false;
      if (periodo !== "Todos" && d.mes !== periodo) return false;
      return true;
    });
  }, [periodo, setor]);

  // KPIs
  const totalFormularios = filtered.reduce((s, d) => s + d.formularios, 0);
  const totalCom = filtered.reduce((s, d) => s + d.comHigienizacao, 0);
  const totalSem = filtered.reduce((s, d) => s + d.semHigienizacao, 0);
  const taxaGeral = totalCom + totalSem > 0 ? ((totalCom / (totalCom + totalSem)) * 100).toFixed(1) : "—";
  const totalAlcool = filtered.reduce((s, d) => s + d.consumoAlcool, 0);
  const totalSabonete = filtered.reduce((s, d) => s + d.consumoSabonete, 0);
  const totalPD = filtered.reduce((s, d) => s + d.pacienteDia, 0);
  const consumoPD = totalPD > 0 ? ((totalAlcool + totalSabonete) / totalPD).toFixed(2) : "—";

  // Chart data: consumo por setor
  const chartData = useMemo(() => {
    const bySetor: Record<string, { setor: string; alcool: number; sabonete: number }> = {};
    filtered.forEach(d => {
      if (!bySetor[d.setor]) bySetor[d.setor] = { setor: d.setor, alcool: 0, sabonete: 0 };
      bySetor[d.setor].alcool += d.consumoAlcool;
      bySetor[d.setor].sabonete += d.consumoSabonete;
    });
    return Object.values(bySetor);
  }, [filtered]);

  // Table data: indicadores por UTI
  const tableData = useMemo(() => {
    const bySetor: Record<string, { setor: string; pd: number; alcool: number; sabonete: number; com: number; sem: number }> = {};
    filtered.forEach(d => {
      if (!bySetor[d.setor]) bySetor[d.setor] = { setor: d.setor, pd: 0, alcool: 0, sabonete: 0, com: 0, sem: 0 };
      bySetor[d.setor].pd += d.pacienteDia;
      bySetor[d.setor].alcool += d.consumoAlcool;
      bySetor[d.setor].sabonete += d.consumoSabonete;
      bySetor[d.setor].com += d.comHigienizacao;
      bySetor[d.setor].sem += d.semHigienizacao;
    });
    return Object.values(bySetor);
  }, [filtered]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
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
          ins.push(`📊 ${totalFormularios} formulários avaliados com taxa de adesão de ${taxaGeral}%.`);
          ins.push(`🧴 Consumo total: ${totalAlcool.toLocaleString()}ml álcool + ${totalSabonete.toLocaleString()}ml sabonete.`);
          ins.push(`📈 Consumo por paciente-dia: ${consumoPD} ml.`);
          ins.push(`✅ ${totalCom} observações com higienização vs ${totalSem} sem higienização.`);
          if (Number(taxaGeral) >= 80) ins.push(`🎯 Adesão acima de 80% — dentro da meta recomendada!`);
          else ins.push(`⚠️ Adesão abaixo de 80% — ações de melhoria são recomendadas.`);
          return ins;
        }} />
      </div>

      {/* Filtros */}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Formulários Analisados</p>
                <p className="text-2xl font-bold">{totalFormularios}</p>
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
                <p className="text-2xl font-bold">{taxaGeral}%</p>
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
                <p className="text-2xl font-bold">{(totalAlcool + totalSabonete).toLocaleString("pt-BR")}</p>
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
                <p className="text-2xl font-bold">{consumoPD} <span className="text-sm font-normal text-muted-foreground">ML/PD</span></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Consumo por Setor */}
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
                <Bar dataKey="alcool" name="Prep. Alcoólica" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sabonete" name="Sabonete Líquido" fill="hsl(var(--primary) / 0.5)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Indicadores por UTI */}
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
    </div>
  );
}
