import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";
import { Building2, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const kpis = [
  { label: "Conformidade Geral", value: "79.8%", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  { label: "Auditorias CTI", value: "24", icon: Building2, color: "text-primary", bg: "bg-primary/10" },
  { label: "Itens Críticos", value: "14", icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  { label: "Melhoria Mensal", value: "+2.5%", icon: TrendingUp, color: "text-success", bg: "bg-success/10" },
];

const categoryData = [
  { category: "Medicações", conformity: 82 },
  { category: "Limpeza", conformity: 78 },
  { category: "Equipamentos", conformity: 85 },
  { category: "Resíduos", conformity: 74 },
];

const radarData = [
  { subject: "Medicações", A: 82 },
  { subject: "Limpeza", A: 78 },
  { subject: "Equipamentos", A: 85 },
  { subject: "Resíduos", A: 74 },
  { subject: "Sinalização", A: 80 },
  { subject: "Acesso", A: 88 },
];

const sectorTable = [
  { setor: "CTI 1", medicacoes: 85, limpeza: 80, equipamentos: 88, residuos: 76, status: "Adequado" },
  { setor: "CTI 2", medicacoes: 78, limpeza: 72, equipamentos: 82, residuos: 68, status: "Atenção" },
  { setor: "CTI 3", medicacoes: 82, limpeza: 82, equipamentos: 86, residuos: 80, status: "Adequado" },
  { setor: "CTI Pediátrico", medicacoes: 90, limpeza: 85, equipamentos: 88, residuos: 82, status: "Adequado" },
  { setor: "CTI Neonatal", medicacoes: 72, limpeza: 68, equipamentos: 75, residuos: 65, status: "Crítico" },
];

function getStatusBadge(status: string) {
  if (status === "Crítico") return <Badge variant="destructive">{status}</Badge>;
  if (status === "Atenção") return <Badge className="bg-warning/20 text-warning border-warning/30">{status}</Badge>;
  return <Badge className="bg-success/20 text-success border-success/30">{status}</Badge>;
}

export default function DashboardStructure() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard — Vigilância de Estrutura (CTI)</h1>
        <p className="text-sm text-muted-foreground">Conformidade de infraestrutura e recursos dos CTIs</p>
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
          <CardHeader><CardTitle className="text-base">Conformidade por Categoria</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="category" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="conformity" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Radar de Infraestrutura</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid className="stroke-border" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar dataKey="A" stroke="hsl(168, 66%, 34%)" fill="hsl(168, 66%, 34%)" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Detalhamento por CTI</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Setor</TableHead>
                <TableHead className="text-center">Medicações</TableHead>
                <TableHead className="text-center">Limpeza</TableHead>
                <TableHead className="text-center">Equipamentos</TableHead>
                <TableHead className="text-center">Resíduos</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sectorTable.map((r) => (
                <TableRow key={r.setor}>
                  <TableCell className="font-medium">{r.setor}</TableCell>
                  <TableCell className="text-center">{r.medicacoes}%</TableCell>
                  <TableCell className="text-center">{r.limpeza}%</TableCell>
                  <TableCell className="text-center">{r.equipamentos}%</TableCell>
                  <TableCell className="text-center">{r.residuos}%</TableCell>
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
