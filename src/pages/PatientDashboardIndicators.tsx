import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Users, BedDouble, Skull, HeartPulse, Syringe,
  Activity, ArrowUpFromLine, Stethoscope, Wind, Cable, Droplets
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

const SPECIALTIES = [
  "Clínica médica",
  "Cirurgia Geral",
  "Cirurgia Cardíaca",
  "Cirurgia Oftalmológica",
  "Neurocirurgia",
  "Cirurgia Vascular",
  "Cirurgia Ortopédica",
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

const PATIENTS_STORAGE_KEY = "irascontrol_patients";
const PATIENTS_EXTRA_KEY = "irascontrol_patients_extra";

interface StoredPatient {
  id: string;
  nome: string;
  unidade: string;
  especialidade: string;
  dataInternacaoHospitalar: string;
  dataAdmissao: string;
  dataAlta: string;
  status: string;
  tipoAlta?: string;
  [key: string]: any;
}

interface PatientExtraData {
  dispInvasivos?: { cvcInsercao: string; cvcRetirada: string; svuInsercao: string; svuRetirada: string; vmInsercao: string; vmRetirada: string };
  antibioticos?: { id: string; nome: string; dataInicio: string; dataFim: string }[];
}

function loadAllPatients(): StoredPatient[] {
  try {
    const stored = localStorage.getItem(PATIENTS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function loadAllExtras(): Record<string, PatientExtraData> {
  try {
    return JSON.parse(localStorage.getItem(PATIENTS_EXTRA_KEY) || "{}");
  } catch {}
  return {};
}

const PatientDashboardIndicators = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [year, setYear] = useState(String(currentYear));
  const [month, setMonth] = useState(String(currentMonth));

  const patients = useMemo(() => loadAllPatients(), []);
  const extras = useMemo(() => loadAllExtras(), []);

  const indicators = useMemo(() => {
    const selectedMonth = Number(month);
    const selectedYear = Number(year);

    // Patients admitted in selected month
    const admittedInMonth = patients.filter(p => {
      const dateStr = p.dataAdmissao || p.dataInternacaoHospitalar;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });

    // By specialty
    const bySpecialty: Record<string, number> = {};
    SPECIALTIES.forEach(s => { bySpecialty[s] = 0; });
    admittedInMonth.forEach(p => {
      const spec = p.especialidade || "Outros";
      if (bySpecialty[spec] !== undefined) bySpecialty[spec]++;
    });

    const specialtyData = SPECIALTIES.map(s => ({
      name: s.length > 15 ? s.replace("Cirurgia ", "C. ") : s,
      fullName: s,
      internacoes: bySpecialty[s] || 0,
    }));

    // Deaths (status=deceased or tipoAlta=Óbito, in selected month)
    const deaths = patients.filter(p => {
      if (p.status !== "deceased" && p.tipoAlta !== "Óbito") return false;
      const d = p.dataAlta ? new Date(p.dataAlta) : null;
      return d && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }).length;

    // Discharges (status=discharged or tipoAlta=Alta)
    const discharges = patients.filter(p => {
      if (p.tipoAlta === "Óbito" || p.status === "deceased") return false;
      if (p.status !== "discharged" && p.tipoAlta !== "Alta") return false;
      const d = p.dataAlta ? new Date(p.dataAlta) : null;
      return d && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    }).length;

    // Patient-days
    const startOfMonth = new Date(Date.UTC(selectedYear, selectedMonth, 1));
    const endOfMonth = new Date(Date.UTC(selectedYear, selectedMonth + 1, 0));

    let totalPatientDays = 0;
    patients.forEach(p => {
      const admStr = p.dataAdmissao || p.dataInternacaoHospitalar;
      if (!admStr) return;
      const admDate = new Date(admStr);
      const disDate = p.dataAlta ? new Date(p.dataAlta) : new Date();
      const from = admDate > startOfMonth ? admDate : startOfMonth;
      const to = disDate < endOfMonth ? disDate : endOfMonth;
      const days = Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
      if (from <= to) totalPatientDays += days;
    });

    // Device-days from extras
    const calcDeviceDays = (type: "cvc" | "svu" | "vm") => {
      let total = 0;
      Object.values(extras).forEach(extra => {
        if (!extra.dispInvasivos) return;
        const insKey = type === "cvc" ? "cvcInsercao" : type === "svu" ? "svuInsercao" : "vmInsercao";
        const retKey = type === "cvc" ? "cvcRetirada" : type === "svu" ? "svuRetirada" : "vmRetirada";
        const insStr = extra.dispInvasivos[insKey];
        if (!insStr) return;
        const ins = new Date(insStr);
        const rem = extra.dispInvasivos[retKey] ? new Date(extra.dispInvasivos[retKey]) : new Date();
        const from = ins > startOfMonth ? ins : startOfMonth;
        const to = rem < endOfMonth ? rem : endOfMonth;
        if (from <= to) total += Math.max(0, Math.ceil((to.getTime() - from.getTime()) / 86400000) + 1);
      });
      return total;
    };

    const cvcDays = calcDeviceDays("cvc");
    const svuDays = calcDeviceDays("svu");
    const vmDays = calcDeviceDays("vm");

    // Antibiotics count
    let abCount = 0;
    Object.values(extras).forEach(extra => {
      (extra.antibioticos || []).forEach(ab => {
        if (!ab.dataInicio) return;
        const d = new Date(ab.dataInicio);
        if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) abCount++;
      });
    });

    // Extubation (VM removed in month)
    let extubations = 0;
    Object.values(extras).forEach(extra => {
      if (!extra.dispInvasivos?.vmRetirada) return;
      const d = new Date(extra.dispInvasivos.vmRetirada);
      if (d.getMonth() === selectedMonth && d.getFullYear() === selectedYear) extubations++;
    });

    const outcomeData = [
      { name: "Altas", value: discharges, color: "hsl(168, 66%, 34%)" },
      { name: "Óbitos", value: deaths, color: "hsl(0, 70%, 50%)" },
      { name: "Internados", value: patients.filter(p => p.status === "active").length, color: "hsl(210, 60%, 50%)" },
    ].filter(d => d.value > 0);

    return {
      specialtyData,
      deaths,
      discharges,
      totalPatientDays,
      cvcDays,
      svuDays,
      vmDays,
      abCount,
      extubations,
      totalAdmitted: admittedInMonth.length,
      outcomeData,
    };
  }, [patients, extras, month, year]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Indicadores Operacionais</h1>
          <p className="text-muted-foreground">Dados do Monitoramento de Pacientes — internações, desfechos, dispositivos e antimicrobianos</p>
        </div>
        <div className="flex gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => (
                <SelectItem key={i} value={String(i)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[currentYear - 2, currentYear - 1, currentYear, currentYear + 1].map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
          {/* KPI Cards */}
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

          {/* Extubation badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1 text-sm px-3 py-1.5">
              <ArrowUpFromLine className="h-4 w-4 text-green-600" />
              Alta / Extubação: <span className="font-bold">{indicators.extubations}</span>
            </Badge>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Bar Chart - Admissions by Specialty */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Stethoscope className="h-4 w-4 text-primary" />
                  Internações por Especialidade — {MONTHS[Number(month)]} {year}
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

            {/* Pie Chart - Outcomes */}
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
                      <Pie
                        data={indicators.outcomeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={4}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
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

          {/* Device density cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DensityCard title="Densidade CVC" deviceDays={indicators.cvcDays} patientDays={indicators.totalPatientDays} icon={Cable} color="text-amber-600" />
            <DensityCard title="Densidade SVD" deviceDays={indicators.svuDays} patientDays={indicators.totalPatientDays} icon={Droplets} color="text-purple-600" />
            <DensityCard title="Densidade VM" deviceDays={indicators.vmDays} patientDays={indicators.totalPatientDays} icon={Wind} color="text-blue-600" />
          </div>

          {/* Specialty detail table */}
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
        <p className="text-3xl font-bold">{density}</p>
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
