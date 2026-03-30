import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import { HandMetal, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const kpis = [
  { label: "Taxa de Adesão", value: "78.5%", icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  { label: "Observações Mês", value: "312", icon: HandMetal, color: "text-primary", bg: "bg-primary/10" },
  { label: "Oportunidades Perdidas", value: "67", icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  { label: "Profissionais Avaliados", value: "84", icon: Users, color: "text-info", bg: "bg-info/10" },
];

const momentsData = [
  { moment: "Antes do Paciente", conformity: 72 },
  { moment: "Antes Proc. Asséptico", conformity: 68 },
  { moment: "Após Risco Fluido", conformity: 85 },
  { moment: "Após Paciente", conformity: 82 },
  { moment: "Após Ambiente", conformity: 76 },
];

const categoryData = [
  { name: "Médicos", value: 72, color: "hsl(168, 66%, 34%)" },
  { name: "Enfermeiros", value: 85, color: "hsl(199, 89%, 48%)" },
  { name: "Técnicos", value: 78, color: "hsl(38, 92%, 50%)" },
  { name: "Fisioterapeutas", value: 81, color: "hsl(280, 65%, 60%)" },
];

const records = [
  { id: 1, professional: "Dr. Carlos Silva", date: "2026-03-25", moment: "Antes do Paciente", technique: "Álcool Gel", status: "Conforme" },
  { id: 2, professional: "Enf. Maria Santos", date: "2026-03-25", moment: "Após Paciente", technique: "Água e Sabão", status: "Conforme" },
  { id: 3, professional: "Téc. João Oliveira", date: "2026-03-24", moment: "Antes Proc. Asséptico", technique: "Não realizado", status: "Não Conforme" },
  { id: 4, professional: "Dra. Ana Costa", date: "2026-03-24", moment: "Após Risco Fluido", technique: "Álcool Gel", status: "Conforme" },
  { id: 5, professional: "Fisio. Pedro Lima", date: "2026-03-23", moment: "Após Ambiente", technique: "Não realizado", status: "Não Conforme" },
];

export default function DashboardHygiene() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard — Higienização das Mãos</h1>
        <p className="text-sm text-muted-foreground">Indicadores de adesão aos 5 momentos da OMS</p>
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
          <CardHeader><CardTitle className="text-base">Adesão por Momento OMS (%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={momentsData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="moment" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="conformity" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Adesão por Categoria Profissional</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            <ResponsiveContainer width={280} height={280}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                  {categoryData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Últimos Registros</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Momento</TableHead>
                <TableHead>Técnica</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.professional}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.moment}</TableCell>
                  <TableCell>{r.technique}</TableCell>
                  <TableCell className="text-center">
                    <Badge className={r.status === "Conforme" ? "bg-success/20 text-success border-success/30" : "bg-destructive/20 text-destructive border-destructive/30"}>
                      {r.status}
                    </Badge>
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
