import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar
} from "recharts";
import { Pill, TrendingDown, AlertTriangle, Activity } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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

const prescriptions = [
  { id: 1, patient: "Pac. Leito 12A", drug: "Meropenem", days: 8, status: "Em uso", alert: "Solicitar reavaliação" },
  { id: 2, patient: "Pac. Leito 5B", drug: "Vancomicina", days: 12, status: "Em uso", alert: "Tempo > 10 dias" },
  { id: 3, patient: "Pac. Leito 3C", drug: "Polimixina B", days: 5, status: "Em uso", alert: "Uso restrito" },
  { id: 4, patient: "Pac. Leito 8A", drug: "Piperacilina/Tazo", days: 3, status: "Desescalonado", alert: null },
  { id: 5, patient: "Pac. Leito 1D", drug: "Cefepime", days: 6, status: "Em uso", alert: null },
];

function getCellColor(value: number) {
  if (value >= 80) return "bg-destructive/20 text-destructive font-bold";
  if (value >= 50) return "bg-warning/20 text-warning font-bold";
  return "";
}

export default function DashboardAntimicrobials() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard — Antimicrobianos</h1>
        <p className="text-sm text-muted-foreground">Stewardship e consumo de antimicrobianos</p>
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
          <CardHeader><CardTitle className="text-base">Tendência DDD/1000 pac-dia</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="ddd" stroke="hsl(168, 66%, 34%)" name="DDD/1000" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Taxa de Desescalonamento (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="desesc" name="Desescalonamento" fill="hsl(199, 89%, 48%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Mapa de Calor — DDD por Setor e Classe</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setor</TableHead>
                <TableHead className="text-center">Carbapenêmicos</TableHead>
                <TableHead className="text-center">Vancomicina</TableHead>
                <TableHead className="text-center">Polimixina</TableHead>
                <TableHead className="text-center">Cefalosporinas</TableHead>
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Prescrições Ativas</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paciente</TableHead>
                <TableHead>Antimicrobiano</TableHead>
                <TableHead className="text-center">Dias</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Alerta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prescriptions.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.patient}</TableCell>
                  <TableCell>{p.drug}</TableCell>
                  <TableCell className="text-center">{p.days}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={p.status === "Desescalonado" ? "bg-success/20 text-success border-success/30" : "bg-primary/20 text-primary border-primary/30"}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.alert ? (
                      <span className="flex items-center gap-1 text-xs text-warning">
                        <AlertTriangle className="h-3 w-3" /> {p.alert}
                      </span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
