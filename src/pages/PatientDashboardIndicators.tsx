import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, BedDouble, Skull, HeartPulse, Syringe,
  Activity, ArrowUpFromLine, Stethoscope, Wind, Cable, Droplets, Loader2
} from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

const SPECIALTIES = [
  "Clínica médica", "Cirurgia Geral", "Cirurgia Cardíaca",
  "Cirurgia Oftalmológica", "Neurocirurgia", "Cirurgia Vascular", "Cirurgia Ortopédica",
];

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const COLORS = [
  "hsl(168, 66%, 34%)", "hsl(210, 60%, 50%)", "hsl(340, 60%, 50%)",
  "hsl(45, 80%, 50%)", "hsl(270, 50%, 55%)", "hsl(120, 40%, 45%)",
  "hsl(20, 70%, 50%)",
];

interface PatientRow {
  id: string;
  full_name: string;
  sector: string | null;
  specialty: string | null;
  admission_date: string;
  discharge_date: string | null;
  status: string;
  discharge_type: string | null;
  clinical_data: any;
}

// Parse "YYYY-MM-DD" (ou ISO) como data LOCAL, evitando deslocamento de fuso (UTC)
function parseLocalDate(s?: string | null): Date | null {
  if (!s) return null;
  const datePart = String(s).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(datePart);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Calcula dias de sobreposição entre [insertion, removal] e [start, end] (mês selecionado)
function overlapDays(insertion?: string, removal?: string, start?: Date, end?: Date) {
  if (!insertion || !start || !end) return 0;
  const ins = parseLocalDate(insertion);
  const rem = removal ? parseLocalDate(removal) : new Date();
  if (!ins || !rem || isNaN(ins.getTime()) || isNaN(rem.getTime())) return 0;
  const from = ins > start ? ins : start;
  const to = rem < end ? rem : end;
  if (from > to) return 0;
  return Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
}

const PatientDashboardIndicators = () => {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [year, setYear] = useState<string[]>([String(currentYear)]);
  const [month, setMonth] = useState<string[]>([String(currentMonth)]);
  const [unit, setUnit] = useState<string[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId || ctxLoading) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const pRes = await supabase
        .from("patients")
        .select("id, full_name, sector, specialty, admission_date, discharge_date, status, discharge_type, clinical_data")
        .eq("hospital_id", hospitalId);
      const pts = (pRes.data || []) as PatientRow[];
      setPatients(pts);

      // Manter compat: ainda lê devices/prescriptions das tabelas (caso existam)
      if (pts.length > 0) {
        const patIds = pts.map((p: any) => p.id);
        const [devRes, rxRes] = await Promise.all([
          supabase.from("patient_devices").select("*").in("patient_id", patIds),
          supabase.from("antimicrobial_prescriptions").select("id, start_date, patient_id").eq("hospital_id", hospitalId),
        ]);
        setDevices(devRes.data || []);
        setPrescriptions(rxRes.data || []);
      }

      setLoading(false);
    })();
  }, [hospitalId, ctxLoading]);

  const units = useMemo(() => {
    const set = new Set<string>();
    patients.forEach(p => { if (p.sector) set.add(p.sector); });
    return Array.from(set).sort();
  }, [patients]);

  const filteredPatients = useMemo(
    () => unit.length === 0 ? patients : patients.filter(p => p.sector && unit.includes(p.sector)),
    [patients, unit]
  );

  const indicators = useMemo(() => {
    const selectedMonths = month.length === 0 ? null : month.map(Number);
    const selectedYears = year.length === 0 ? null : year.map(Number);
    const matchPeriod = (d: Date) =>
      (!selectedMonths || selectedMonths.includes(d.getMonth())) &&
      (!selectedYears || selectedYears.includes(d.getFullYear()));
    const patientIdSet = new Set(filteredPatients.map(p => p.id));
    const filteredDevices = devices.filter(d => patientIdSet.has(d.patient_id));
    const filteredPrescriptions = prescriptions.filter(rx => patientIdSet.has(rx.patient_id));

    const admittedInMonth = filteredPatients.filter(p => {
      const d = parseLocalDate(p.admission_date);
      return !!d && matchPeriod(d);
    });

    const bySpecialty: Record<string, number> = {};
    SPECIALTIES.forEach(s => { bySpecialty[s] = 0; });
    admittedInMonth.forEach(p => {
      const spec = p.specialty || "Outros";
      if (bySpecialty[spec] !== undefined) bySpecialty[spec]++;
    });

    const specialtyData = SPECIALTIES.map(s => ({
      name: s.length > 15 ? s.replace("Cirurgia ", "C. ") : s,
      fullName: s,
      internacoes: bySpecialty[s] || 0,
    }));

    const deaths = filteredPatients.filter(p => {
      if (p.status !== "deceased" && p.discharge_type !== "Óbito") return false;
      const d = parseLocalDate(p.discharge_date);
      return !!d && matchPeriod(d);
    }).length;

    const discharges = filteredPatients.filter(p => {
      if (p.discharge_type === "Óbito" || p.status === "deceased") return false;
      if (p.status !== "discharged" && p.discharge_type !== "Alta") return false;
      const d = parseLocalDate(p.discharge_date);
      return !!d && matchPeriod(d);
    }).length;

    // Construir lista de períodos (mês/ano) a iterar. Se vazio, usar o ano/mês atual.
    const yearsToUse = selectedYears && selectedYears.length > 0 ? selectedYears : [currentYear];
    const monthsToUse = selectedMonths && selectedMonths.length > 0 ? selectedMonths : [...Array(12).keys()];
    const periods: Array<{ start: Date; end: Date }> = [];
    yearsToUse.forEach(y => {
      monthsToUse.forEach(m => {
        periods.push({ start: new Date(y, m, 1), end: new Date(y, m + 1, 0) });
      });
    });

    let totalPatientDays = 0;
    filteredPatients.forEach(p => {
      const admDate = parseLocalDate(p.admission_date);
      if (!admDate) return;
      const disDate = parseLocalDate(p.discharge_date) || new Date();
      periods.forEach(({ start, end }) => {
        const from = admDate > start ? admDate : start;
        const to = disDate < end ? disDate : end;
        if (from > to) return;
        totalPatientDays += Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
      });
    });

    // Dispositivos: tenta primeiro tabela patient_devices; se vazio, soma de clinical_data.dispInvasivos
    const calcDeviceDaysFromTable = (type: string) => {
      let total = 0;
      filteredDevices.filter(d => d.device_type === type).forEach(dev => {
        periods.forEach(({ start, end }) => {
          total += overlapDays(dev.insertion_date, dev.removal_date, start, end);
        });
      });
      return total;
    };

    const calcDeviceDaysFromClinical = (insKey: string, remKey: string, novaInsKey: string, novaRemKey: string) => {
      let total = 0;
      filteredPatients.forEach(p => {
        const di = p.clinical_data?.dispInvasivos;
        if (!di) return;
        periods.forEach(({ start, end }) => {
          total += overlapDays(di[insKey], di[remKey], start, end);
          total += overlapDays(di[novaInsKey], di[novaRemKey], start, end);
        });
      });
      return total;
    };

    const cvcDays = calcDeviceDaysFromTable("cvc") +
      calcDeviceDaysFromClinical("cvcInsercao", "cvcRetirada", "cvcNovaInsercao", "cvcNovaRetirada");
    const svuDays = calcDeviceDaysFromTable("svu") +
      calcDeviceDaysFromClinical("svuInsercao", "svuRetirada", "svuNovaInsercao", "svuNovaRetirada");
    const vmDays = calcDeviceDaysFromTable("vm") +
      calcDeviceDaysFromClinical("vmInsercao", "vmRetirada", "vmNovaInsercao", "vmNovaRetirada");

    // Antibióticos: tabela antimicrobial_prescriptions + clinical_data.antibioticos[]
    const abFromTable = filteredPrescriptions.filter(rx => {
      const d = parseLocalDate(rx.start_date);
      return !!d && matchPeriod(d);
    }).length;

    let abFromClinical = 0;
    filteredPatients.forEach(p => {
      const atbs = p.clinical_data?.antibioticos;
      if (!Array.isArray(atbs)) return;
      atbs.forEach((a: any) => {
        const d = parseLocalDate(a?.dataInicio);
        if (d && matchPeriod(d)) abFromClinical++;
      });
    });
    const abCount = abFromTable + abFromClinical;

    const extubationsTable = filteredDevices.filter(d => {
      if (d.device_type !== "vm") return false;
      const rd = parseLocalDate(d.removal_date);
      return !!rd && matchPeriod(rd);
    }).length;

    let extubationsClinical = 0;
    filteredPatients.forEach(p => {
      const di = p.clinical_data?.dispInvasivos;
      if (!di) return;
      [di.vmRetirada, di.vmNovaRetirada].forEach((dt: string) => {
        const rd = parseLocalDate(dt);
        if (rd && matchPeriod(rd)) extubationsClinical++;
      });
    });
    const extubations = extubationsTable + extubationsClinical;

    const outcomeData = [
      { name: "Altas", value: discharges, color: "hsl(168, 66%, 34%)" },
      { name: "Óbitos", value: deaths, color: "hsl(0, 70%, 50%)" },
      { name: "Internados", value: filteredPatients.filter(p => p.status === "active").length, color: "hsl(210, 60%, 50%)" },
    ].filter(d => d.value > 0);

    return { specialtyData, deaths, discharges, totalPatientDays, cvcDays, svuDays, vmDays, abCount, extubations, totalAdmitted: admittedInMonth.length, outcomeData };
  }, [filteredPatients, devices, prescriptions, month, year, currentYear]);

  if (loading || ctxLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard de Indicadores Operacionais</h1>
          <p className="text-muted-foreground">Dados do Monitoramento de Pacientes — internações, desfechos, dispositivos e antimicrobianos</p>
        </div>
        <div className="flex gap-2">
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            ins.push(`📊 ${indicators.totalAdmitted} pacientes admitidos no período selecionado.`);
            ins.push(`💀 ${indicators.deaths} óbitos e ${indicators.discharges} altas registradas.`);
            ins.push(`🛏️ Total de ${indicators.totalPatientDays} paciente-dia.`);
            if (indicators.cvcDays > 0) ins.push(`💉 CVC: ${indicators.cvcDays} dias-dispositivo.`);
            if (indicators.svuDays > 0) ins.push(`🔧 SVD: ${indicators.svuDays} dias-dispositivo.`);
            if (indicators.vmDays > 0) ins.push(`🌬️ VM: ${indicators.vmDays} dias-dispositivo.`);
            if (indicators.abCount > 0) ins.push(`💊 ${indicators.abCount} antimicrobianos utilizados no período.`);
            if (indicators.extubations > 0) ins.push(`✅ ${indicators.extubations} extubações realizadas com sucesso.`);
            return ins;
          }} />
          <MultiSelectFilter
            label="Unidade"
            placeholder="Todas as unidades"
            selected={unit}
            onChange={setUnit}
            options={units.map(u => ({ value: u, label: u }))}
            className="w-[180px]"
          />
          <MultiSelectFilter
            label="Mês"
            placeholder="Todos os meses"
            selected={month}
            onChange={setMonth}
            options={MONTHS.map((m, i) => ({ value: String(i), label: m }))}
            className="w-[160px]"
          />
          <MultiSelectFilter
            label="Ano"
            placeholder="Todos os anos"
            selected={year}
            onChange={setYear}
            options={[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => ({ value: String(y), label: String(y) }))}
            className="w-[120px]"
          />
        </div>
      </div>

      {patients.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Users className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p className="font-medium">Nenhum paciente cadastrado</p>
            <p className="text-sm mt-1">Cadastre pacientes em <strong>Monitoramento de Pacientes</strong> para visualizar os indicadores.</p>
          </CardContent>
        </Card>
      )}

      {patients.length > 0 && (
        <>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="py-4 px-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-primary/15 flex items-center justify-center">
                  <ArrowUpFromLine className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Número de Novas Admissões</p>
                  <p className="text-xs text-muted-foreground/80">
                    {month.length === 0 ? "Todos os meses" : month.length === 1 ? MONTHS[Number(month[0])] : `${month.length} meses`}
                    {" · "}
                    {year.length === 0 ? "Todos os anos" : year.join(", ")}
                    {unit.length > 0 ? ` · ${unit.length === 1 ? unit[0] : `${unit.length} unidades`}` : ""}
                  </p>
                </div>
              </div>
              <p className="text-3xl font-bold text-primary font-heading">{indicators.totalAdmitted}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <KpiCard icon={Users} label="Internações" value={indicators.totalAdmitted} color="text-primary" />
            <KpiCard icon={BedDouble} label="Paciente-Dia" value={indicators.totalPatientDays} color="text-primary" />
            <KpiCard icon={Skull} label="Óbitos" value={indicators.deaths} color="text-destructive" />
            <KpiCard icon={HeartPulse} label="Altas" value={indicators.discharges} color="text-green-600" />
            <KpiCard icon={Wind} label="VM Pac-Dia" value={indicators.vmDays} color="text-blue-600" />
            <KpiCard icon={Cable} label="CVC Pac-Dia" value={indicators.cvcDays} color="text-amber-600" />
            <KpiCard icon={Droplets} label="SVD Pac-Dia" value={indicators.svuDays} color="text-purple-600" />
            <KpiCard icon={Syringe} label="Antibióticos" value={indicators.abCount} color="text-orange-600" />
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-sm px-3 py-1.5">
              <ArrowUpFromLine className="h-4 w-4 text-green-600" />
              Alta / Extubação: <span className="font-bold">{indicators.extubations}</span>
            </Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Internações por Especialidade — {month.length === 0 ? "Todos os meses" : month.length === 1 ? MONTHS[Number(month[0])] : `${month.length} meses`} {year.length === 0 ? "" : year.join(", ")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {indicators.specialtyData.every(s => s.internacoes === 0) ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Nenhuma internação registrada no período.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={indicators.specialtyData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                      <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 11 }} interval={0} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value: number) => [value, "Internações"]}
                        labelFormatter={(label: string) => {
                          const item = indicators.specialtyData.find(s => s.name === label);
                          return item?.fullName || label;
                        }}
                      />
                      <Bar dataKey="internacoes" name="Internações" radius={[4, 4, 0, 0]}>
                        {indicators.specialtyData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Desfechos do Período
                </CardTitle>
              </CardHeader>
              <CardContent>
                {indicators.outcomeData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Sem dados de desfechos.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={indicators.outcomeData} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                        {indicators.outcomeData.map((entry, index) => (
                          <Cell key={`pie-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DensityCard title="Densidade CVC" deviceDays={indicators.cvcDays} patientDays={indicators.totalPatientDays} icon={Cable} color="text-amber-600" />
            <DensityCard title="Densidade SVD" deviceDays={indicators.svuDays} patientDays={indicators.totalPatientDays} icon={Droplets} color="text-purple-600" />
            <DensityCard title="Densidade VM" deviceDays={indicators.vmDays} patientDays={indicators.totalPatientDays} icon={Wind} color="text-blue-600" />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Detalhamento por Especialidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 font-medium">Especialidade</th>
                      <th className="text-center py-2 px-3 font-medium">Internações</th>
                      <th className="text-center py-2 px-3 font-medium">% do Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {indicators.specialtyData.map((s, i) => (
                      <tr key={s.fullName} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-2 px-3 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: COLORS[i] }} />
                          {s.fullName}
                        </td>
                        <td className="text-center py-2 px-3 font-semibold">{s.internacoes}</td>
                        <td className="text-center py-2 px-3 text-muted-foreground">
                          {indicators.totalAdmitted > 0 ? ((s.internacoes / indicators.totalAdmitted) * 100).toFixed(1) : "0.0"}%
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-muted/30 font-semibold">
                      <td className="py-2 px-3">Total</td>
                      <td className="text-center py-2 px-3">{indicators.totalAdmitted}</td>
                      <td className="text-center py-2 px-3">100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

function KpiCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3 px-3 text-center">
        <Icon className={`mx-auto h-6 w-6 mb-1 ${color}`} />
        <p className="text-xl font-bold">{value}</p>
        <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      </CardContent>
    </Card>
  );
}

function DensityCard({ title, deviceDays, patientDays, icon: Icon, color }: {
  title: string; deviceDays: number; patientDays: number; icon: any; color: string;
}) {
  const density = patientDays > 0 ? ((deviceDays / patientDays) * 1000).toFixed(1) : "0.0";
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl md:text-3xl font-bold">{density}</p>
        <p className="text-xs text-muted-foreground">por 1.000 paciente-dia</p>
        <div className="flex justify-between text-xs text-muted-foreground mt-2 pt-2 border-t">
          <span>Dispositivo-dia: {deviceDays}</span>
          <span>Paciente-dia: {patientDays}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default PatientDashboardIndicators;
