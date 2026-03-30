import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { CheckCircle, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const kpis = [
  { label: "Taxa Adesão CVC", value: "87.3%", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  { label: "Taxa Adesão SVD", value: "91.5%", icon: TrendingUp, color: "text-primary", bg: "bg-primary/10" },
  { label: "Auditorias Realizadas", value: "142", icon: Activity, color: "text-info", bg: "bg-info/10" },
  { label: "Não Conformidades", value: "18", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
];

const cvcDonut = [
  { name: "Conforme", value: 87, color: "hsl(var(--success))" },
  { name: "Não Conforme", value: 13, color: "hsl(var(--destructive))" },
];

const svdDonut = [
  { name: "Conforme", value: 92, color: "hsl(var(--success))" },
  { name: "Não Conforme", value: 8, color: "hsl(var(--destructive))" },
];

const monthlyData = [
  { month: "Jan", cvc: 82, svd: 88 },
  { month: "Fev", cvc: 85, svd: 89 },
  { month: "Mar", cvc: 84, svd: 91 },
  { month: "Abr", cvc: 88, svd: 90 },
  { month: "Mai", cvc: 87, svd: 93 },
  { month: "Jun", cvc: 89, svd: 92 },
];

const detailTable = [
  { setor: "UTI Adulto", cvcRate: 92, svdRate: 95, audits: 28, status: "Adequado" },
  { setor: "UTI Neonatal", cvcRate: 88, svdRate: 91, audits: 22, status: "Adequado" },
  { setor: "Clínica Médica", cvcRate: 78, svdRate: 85, audits: 35, status: "Atenção" },
  { setor: "Centro Cirúrgico", cvcRate: 85, svdRate: 89, audits: 30, status: "Adequado" },
  { setor: "Emergência", cvcRate: 72, svdRate: 80, audits: 27, status: "Crítico" },
];

function getStatusBadge(status: string) {
  if (status === "Crítico") return <Badge variant="destructive">{status}</Badge>;
  if (status === "Atenção") return <Badge className="bg-warning/20 text-warning border-warning/30">{status}</Badge>;
  return <Badge className="bg-success/20 text-success border-success/30">{status}</Badge>;
}

export default function DashboardBundles() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard — Bundles CVC/SVD</h1>
        <p className="text-sm text-muted-foreground">Indicadores de conformidade de dispositivos invasivos</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${k.bg}`}>
                <k.icon className={`h-6 w-6 ${k.color}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{k.label}</p>
                <p className="text-2xl font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Adesão CVC</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={cvcDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                  {cvcDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Adesão SVD</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={svdDonut} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}%`} labelLine={false}>
                  {svdDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Evolução Mensal de Adesão (%)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis domain={[60, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="cvc" name="CVC" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="svd" name="SVD" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhamento por Setor</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setor</TableHead>
                <TableHead className="text-center">CVC (%)</TableHead>
                <TableHead className="text-center">SVD (%)</TableHead>
                <TableHead className="text-center">Auditorias</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailTable.map((r) => (
                <TableRow key={r.setor}>
                  <TableCell className="font-medium">{r.setor}</TableCell>
                  <TableCell className="text-center">{r.cvcRate}%</TableCell>
                  <TableCell className="text-center">{r.svdRate}%</TableCell>
                  <TableCell className="text-center">{r.audits}</TableCell>
                  <TableCell className="text-center">{getStatusBadge(r.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
