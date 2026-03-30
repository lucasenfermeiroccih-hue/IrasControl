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
        <h1 className="text-xl md:text-2xl font-bold">Dashboard — Antimicrobianos</h1>
        <p className="text-xs md:text-sm text-muted-foreground">Stewardship e consumo de antimicrobianos</p>
      </div>

      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-3 p-3 md:pt-6 md:p-6">
              <div className={`flex h-9 w-9 md:h-12 md:w-12 shrink-0 items-center justify-center rounded-lg ${k.bg}`}>
                <k.icon className={`h-4 w-4 md:h-6 md:w-6 ${k.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{k.label}</p>
                <p className="text-lg md:text-2xl font-bold">{k.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-3 md:p-6"><CardTitle className="text-sm md:text-base">Tendência DDD/1000 pac-dia</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <ResponsiveContainer width="100%" height={220}>
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
          <CardHeader className="p-3 md:p-6"><CardTitle className="text-sm md:text-base">Taxa de Desescalonamento (%)</CardTitle></CardHeader>
          <CardContent className="p-2 md:p-6 pt-0">
            <ResponsiveContainer width="100%" height={220}>
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

      <Card>
        <CardHeader className="p-3 md:p-6"><CardTitle className="text-sm md:text-base">Mapa de Calor — DDD por Setor e Classe</CardTitle></CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="overflow-x-auto">
            <Table className="text-xs md:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Setor</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Carbapenêm.</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Vanco.</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Polimix.</TableHead>
                  <TableHead className="text-center whitespace-nowrap">Cefalos.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sectorHeatmap.map((r) => (
                  <TableRow key={r.setor}>
                    <TableCell className="font-medium whitespace-nowrap">{r.setor}</TableCell>
                    <TableCell className={`text-center ${getCellColor(r.carbapenens)}`}>{r.carbapenens}</TableCell>
                    <TableCell className={`text-center ${getCellColor(r.vancomicina)}`}>{r.vancomicina}</TableCell>
                    <TableCell className={`text-center ${getCellColor(r.polimixina)}`}>{r.polimixina}</TableCell>
                    <TableCell className={`text-center ${getCellColor(r.cefalosporinas)}`}>{r.cefalosporinas}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-3 md:p-6"><CardTitle className="text-sm md:text-base">Prescrições Ativas</CardTitle></CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <div className="overflow-x-auto">
            <Table className="text-xs md:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Paciente</TableHead>
                  <TableHead className="whitespace-nowrap">Antimicrobiano</TableHead>
                  <TableHead className="text-center">Dias</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="whitespace-nowrap">Alerta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prescriptions.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium whitespace-nowrap">{p.patient}</TableCell>
                    <TableCell className="whitespace-nowrap">{p.drug}</TableCell>
                    <TableCell className="text-center">{p.days}</TableCell>
                    <TableCell className="text-center">
                      <Badge className={`text-[10px] ${p.status === "Desescalonado" ? "bg-success/20 text-success border-success/30" : "bg-primary/20 text-primary border-primary/30"}`}>
                        {p.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.alert ? (
                        <span className="flex items-center gap-1 text-[10px] text-warning whitespace-nowrap">
                          <AlertTriangle className="h-3 w-3 shrink-0" /> {p.alert}
                        </span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
