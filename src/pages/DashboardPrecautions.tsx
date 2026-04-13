import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PieChart, Pie, Cell, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip
} from "recharts";
import { Shield, CheckCircle, AlertTriangle, Eye, Loader2, Download } from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import DashboardFilters from "@/components/DashboardFilters";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { exportPdf } from "@/lib/pdf-export";

const TYPE_COLORS: Record<string, string> = {
  "Contato": "hsl(168, 66%, 34%)",
  "Gotículas": "hsl(199, 89%, 48%)",
  "Aerossóis": "hsl(38, 92%, 50%)",
  "Protetor": "hsl(280, 65%, 60%)",
};

export default function DashboardPrecautions() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [precautions, setPrecautions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dia, setDia] = useState<string[]>([]);
  const [mes, setMes] = useState<string[]>([]);
  const [ano, setAno] = useState<string[]>([]);
  const [setor, setSetor] = useState<string[]>([]);

  useEffect(() => {
    if (ctxLoading || !hospitalId) { setLoading(false); return; }
    const load = async () => {
      const { data: patients } = await supabase
        .from("patients")
        .select("id, sector")
        .eq("hospital_id", hospitalId);
      const patientIds = (patients || []).map(p => p.id);
      const patientMap = Object.fromEntries((patients || []).map(p => [p.id, p.sector || "Sem setor"]));

      if (patientIds.length > 0) {
        const { data } = await supabase
          .from("precautions")
          .select("*")
          .in("patient_id", patientIds);
        setPrecautions((data || []).map(p => ({ ...p, sector: patientMap[p.patient_id] || "Sem setor" })));
      }
      setLoading(false);
    };
    load();
  }, [hospitalId, ctxLoading]);

  const activePrecautions = precautions.filter(p => p.is_active);
  const totalInspections = precautions.length;

  const typeDonut = useMemo(() => {
    const map: Record<string, number> = {};
    activePrecautions.forEach(p => {
      const type = p.precaution_type || "Outro";
      map[type] = (map[type] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({
      name, value, color: TYPE_COLORS[name] || "hsl(210, 10%, 46%)",
    }));
  }, [activePrecautions]);

  const sectorData = useMemo(() => {
    const map: Record<string, number> = {};
    activePrecautions.forEach(p => {
      map[p.sector] = (map[p.sector] || 0) + 1;
    });
    return Object.entries(map).map(([setor, count]) => ({ setor, count })).sort((a, b) => b.count - a.count);
  }, [activePrecautions]);

  if (loading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const kpis = [
    { label: "Precauções Ativas", value: String(activePrecautions.length), icon: Shield, color: "text-primary", bg: "bg-primary/10" },
    { label: "Total Registros", value: String(totalInspections), icon: Eye, color: "text-info", bg: "bg-info/10" },
    { label: "Tipos Ativos", value: String(typeDonut.length), icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
    { label: "Setores com Isolamento", value: String(sectorData.length), icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10" },
  ];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard — Precaução e Isolamento</h1>
          <p className="text-sm text-muted-foreground">Monitoramento de medidas de precaução e isolamento</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => {
            if (!hospitalId) return;
            exportPdf({
              type: "patients", hospitalId,
              data: {
                total: activePrecautions.length,
                patients: activePrecautions.map(p => ({
                  name: p.patient_id, record: p.precaution_type, sector: p.sector,
                  bed: "", status: p.is_active ? "Ativo" : "Inativo", admission: p.start_date?.split("T")[0] || "",
                })),
              },
              filenamePrefix: "precaucoes",
            });
          }}><Download className="h-4 w-4 mr-1" />PDF</Button>
          <DashboardAIInsights generateInsights={() => {
          const ins: string[] = [];
          ins.push(`📊 ${activePrecautions.length} precauções ativas em ${sectorData.length} setores.`);
          if (typeDonut.length > 0) ins.push(`🔬 Tipo mais frequente: ${typeDonut[0].name} (${typeDonut[0].value} pacientes).`);
          ins.push("💡 Recomendação: revisar sinalização e checklist de transporte.");
          return ins;
        }} />
        </div>
      </div>

      <DashboardFilters dia={dia} setDia={setDia} mes={mes} setMes={setMes} ano={ano} setAno={setAno} setor={setor} setSetor={setSetor} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-4 pt-6">
              <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${k.bg}`}><k.icon className={`h-6 w-6 ${k.color}`} /></div>
              <div><p className="text-sm text-muted-foreground">{k.label}</p><p className="text-2xl font-bold">{k.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Tipos de Precaução Ativa</CardTitle></CardHeader>
          <CardContent className="flex justify-center">
            {typeDonut.length > 0 ? (
              <ResponsiveContainer width={280} height={280}>
                <PieChart>
                  <Pie data={typeDonut} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ value }) => `${value}`}>
                    {typeDonut.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground py-12">Sem dados</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Precauções por Setor</CardTitle></CardHeader>
          <CardContent>
            {sectorData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={sectorData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="setor" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Precauções" fill="hsl(168, 66%, 34%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-sm text-muted-foreground py-12 text-center">Sem dados</p>}
          </CardContent>
        </Card>
      </div>

      {precautions.length === 0 && (
        <Card className="border-dashed"><CardContent className="p-8 text-center text-muted-foreground"><p className="text-sm">Nenhuma precaução registrada.</p></CardContent></Card>
      )}
    </div>
  );
}
