import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ChartActions from "@/components/ChartActions";
import DashboardAnalysisTabs, { AnalysisConfig } from "@/components/DashboardAnalysisTabs";
import InfectologistInsightsPanel from "@/components/InfectologistInsightsPanel";
import { ReferenceLine } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Users, BedDouble, Skull, HeartPulse, Syringe,
  Activity, ArrowUpFromLine, Stethoscope, Wind, Cable, Droplets, Loader2,
  Pill, Microscope, FileText, ArrowUp, ArrowDown, ArrowUpDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import MultiSelectFilter from "@/components/MultiSelectFilter";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { DashboardPdfReport, type DashboardReportData } from "@/components/DashboardPdfReport";
import { useHospitalContext } from "@/hooks/useHospitalContext";

const SPECIALTIES_DEFAULT = [
  "Clínica médica", "Cirurgia Geral", "Cirurgia Cardíaca",
  "Cirurgia Oftalmológica", "Neurocirurgia", "Cirurgia Vascular", "Cirurgia Ortopédica",
];

const SPECIALTIES_MATERNIDADE = [
  "Obstetrícia", "Ginecologia", "Neonatologia",
  "Centro Obstétrico", "Alojamento Conjunto", "UTI Neonatal", "UTI Materna",
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
  icu_admission_date: string | null;
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

function startOfCivilDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function endOfCivilDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}

function dayKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function collectDaysInPeriods(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  periods: Array<{ start: Date; end: Date }>,
  bucket: Set<string>,
) {
  if (!startDate || !periods || periods.length === 0) return;
  const start = parseLocalDate(startDate);
  const end = endDate ? parseLocalDate(endDate) : new Date();
  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) return;

  periods.forEach(({ start: periodStart, end: periodEnd }) => {
    const from = startOfCivilDay(start > periodStart ? start : periodStart);
    const to = endOfCivilDay(end < periodEnd ? end : periodEnd);
    if (from > to) return;

    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const lastDay = new Date(to.getFullYear(), to.getMonth(), to.getDate());

    while (cursor <= lastDay) {
      bucket.add(dayKey(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
  });
}

function countDistinctCivilDaysInPeriods(startDate?: string | null, endDate?: string | null, periods?: Array<{ start: Date; end: Date }>) {
  if (!periods) return 0;
  const occupiedDays = new Set<string>();
  collectDaysInPeriods(startDate, endDate, periods, occupiedDays);
  return occupiedDays.size;
}

function intersectDaySets(...sets: Array<Set<string> | null | undefined>) {
  const validSets = sets.filter((set): set is Set<string> => !!set);
  if (validSets.length === 0) return new Set<string>();

  const [first, ...rest] = validSets;
  const result = new Set<string>();

  first.forEach((day) => {
    if (rest.every(set => set.has(day))) result.add(day);
  });

  return result;
}


function getPatientPeriodStart(patient: PatientRow) {
  return patient.icu_admission_date || patient.admission_date;
}

const PatientDashboardIndicators = () => {
  const navigate = useNavigate();
  const { hospitalId, hospitalName, loading: ctxLoading } = useHospitalContext();
  const isMaternidade = (hospitalName || "").toLowerCase().includes("maternidade");
  const SPECIALTIES = isMaternidade ? SPECIALTIES_MATERNIDADE : SPECIALTIES_DEFAULT;
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const [year, setYear] = useState<string[]>([String(currentYear)]);
  const [month, setMonth] = useState<string[]>([String(currentMonth)]);
  const [unit, setUnit] = useState<string[]>([]);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [labResults, setLabResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  type SpecSortKey = "internacoes" | "percent";
  const [specSortKey, setSpecSortKey] = useState<SpecSortKey | null>(null);
  const [specSortDir, setSpecSortDir] = useState<"asc" | "desc">("desc");
  const toggleSpecSort = (k: SpecSortKey) => {
    if (specSortKey === k) setSpecSortDir(d => (d === "asc" ? "desc" : "asc"));
    else { setSpecSortKey(k); setSpecSortDir("desc"); }
  };

  // Refs e metas para ChartActions (export PDF/JPG, fullscreen, definir meta)
  const chartRefs = {
    specialty: useRef<HTMLDivElement>(null),
    outcomes: useRef<HTMLDivElement>(null),
    topAntibiotics: useRef<HTMLDivElement>(null),
    topOrganisms: useRef<HTMLDivElement>(null),
  };
  const [metas, setMetas] = useState<Record<string, number | undefined>>({});
  const setMeta = (key: string, val: number | undefined) =>
    setMetas(prev => ({ ...prev, [key]: val }));

  useEffect(() => {
    if (!hospitalId || ctxLoading) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const pRes = await supabase
        .from("patients")
        .select("id, full_name, sector, specialty, admission_date, icu_admission_date, discharge_date, status, discharge_type, clinical_data")
        .eq("hospital_id", hospitalId)
        .neq("source", "precaution_map");
      const pts = (pRes.data || []) as PatientRow[];
      setPatients(pts);

      // Manter compat: ainda lê devices/prescriptions das tabelas (caso existam)
      if (pts.length > 0) {
        const patIds = pts.map((p: any) => p.id);
        const [devRes, rxRes, labRes] = await Promise.all([
          supabase.from("patient_devices").select("*").in("patient_id", patIds),
          supabase.from("antimicrobial_prescriptions").select("id, start_date, patient_id, drug_name").eq("hospital_id", hospitalId),
          supabase.from("lab_results").select("id, patient_id, organism, collection_date, result_date").eq("hospital_id", hospitalId),
        ]);
        setDevices(devRes.data || []);
        setPrescriptions(rxRes.data || []);
        setLabResults(labRes.data || []);
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
    // Se nada selecionado, default = mês/ano atual (evita somar tudo indevidamente)
    const selectedMonths = month.length === 0 ? [currentMonth] : Array.from(new Set(month.map(Number))).sort((a, b) => a - b);
    const selectedYears = year.length === 0 ? [currentYear] : Array.from(new Set(year.map(Number))).sort((a, b) => a - b);
    const matchPeriod = (d: Date) =>
      selectedMonths.includes(d.getMonth()) &&
      selectedYears.includes(d.getFullYear());
    const patientIdSet = new Set(filteredPatients.map(p => p.id));
    const filteredDevices = devices.filter(d => patientIdSet.has(d.patient_id));
    const filteredPrescriptions = prescriptions.filter(rx => patientIdSet.has(rx.patient_id));

    // Períodos = exatamente os meses/anos selecionados (cada combinação vira um intervalo)
    const periods: Array<{ start: Date; end: Date }> = [];
    selectedYears.forEach(y => {
      selectedMonths.forEach(m => {
        periods.push({
          start: new Date(y, m, 1, 0, 0, 0, 0),
          end: new Date(y, m + 1, 0, 23, 59, 59, 999),
        });
      });
    });

    // Paciente conta em CADA mês em que esteve internado (intersecção de período)
    // Se internou em janeiro e teve alta em março, conta em jan, fev e mar — separados.
    const patientPresentInPeriods = (p: PatientRow) => {
      const start = parseLocalDate(getPatientPeriodStart(p));
      if (!start) return false;
      const end = parseLocalDate(p.discharge_date) || new Date();
      return periods.some(({ start: ps, end: pe }) => start <= pe && end >= ps);
    };

    const admittedInMonth = filteredPatients.filter(patientPresentInPeriods);

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

    // (periods já calculados acima)

    // Totaliza paciente-dia usando admission_date (internação hospitalar, não apenas UTI)
    const totalPatientDays = filteredPatients.reduce(
      (total, patient) => total + countDistinctCivilDaysInPeriods(patient.admission_date, patient.discharge_date, periods),
      0,
    );

    // Pré-computa todos os dias do período selecionado (evita recalcular por paciente)
    const allPeriodDays: Date[] = [];
    periods.forEach(({ start, end }) => {
      const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const last   = new Date(end.getFullYear(),   end.getMonth(),   end.getDate());
      while (cursor <= last) { allPeriodDays.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }
    });

    // Conta dispositivo-dias por paciente×dia dentro do período.
    // Usa admission_date (não icu_admission_date) para não perder dias de dispositivo
    // inseridos antes da entrada na UTI.
    // Suporta: patient_devices table, formato legado (NovaInsercao/NovaRetirada), formato atual (Trocas[]).
    const calcDeviceDays = (
      type: string,
      insKey: string, remKey: string,
      novaInsKey: string, novaRemKey: string,
    ): { total: number; perPatient: Array<{ id: string; name: string; days: number }> } => {
      const trocasKey = insKey.replace("Insercao", "Trocas");
      let total = 0;
      const perPatient: Array<{ id: string; name: string; days: number }> = [];

      filteredPatients.forEach(p => {
        const patStart = parseLocalDate(p.admission_date);
        if (!patStart) return;
        const patEnd = p.discharge_date ? parseLocalDate(p.discharge_date) : new Date();
        if (!patEnd) return;

        // Monta lista de intervalos em que o dispositivo estava ativo.
        // Datas com ano < 2000 indicam erro de digitação (ex: "0206-03-19", "1990-07-14"):
        //   - Inserção com ano inválido → usa data de admissão como início
        //   - Retirada com ano inválido ou retirada anterior à inserção → trata como ativo (sem retirada)
        const ranges: Array<{ s: Date; e: Date }> = [];
        const addRange = (ins: string | null | undefined, rem: string | null | undefined) => {
          if (!ins) return;
          const rawS = parseLocalDate(ins);
          if (!rawS) return;
          const s = rawS.getFullYear() >= 2000 ? rawS : patStart;

          let e: Date;
          if (rem && rem !== "") {
            const rawE = parseLocalDate(rem);
            if (!rawE || rawE.getFullYear() < 2000 || rawE < s) {
              e = new Date(); // data inválida ou intervalo invertido → considera ativo
            } else {
              e = rawE;
            }
          } else {
            e = new Date();
          }
          ranges.push({ s, e });
        };

        // Tabela patient_devices
        filteredDevices
          .filter(d => d.patient_id === p.id && d.device_type === type)
          .forEach(dev => addRange(dev.insertion_date, dev.removal_date));

        // clinical_data.dispInvasivos
        const di = p.clinical_data?.dispInvasivos;
        if (di) {
          addRange(di[insKey],      di[remKey]);
          addRange(di[novaInsKey],  di[novaRemKey]);
          const trocas: Array<{ insercao: string; retirada: string }> =
            Array.isArray(di[trocasKey]) ? di[trocasKey] : [];
          trocas.forEach(t => addRange(t.insercao, t.retirada));
        }

        if (ranges.length === 0) return;

        // Conta cada dia do período em que o paciente estava internado E com o dispositivo
        let pDays = 0;
        allPeriodDays.forEach(day => {
          if (day < patStart || day > patEnd) return;
          if (ranges.some(r => day >= r.s && day <= r.e)) pDays++;
        });

        if (pDays > 0) {
          total += pDays;
          perPatient.push({ id: p.id, name: p.full_name, days: pDays });
        }
      });

      return { total, perPatient };
    };

    const cvcResult = calcDeviceDays("cvc", "cvcInsercao", "cvcRetirada", "cvcNovaInsercao", "cvcNovaRetirada");
    const svuResult = calcDeviceDays("svu", "svuInsercao", "svuRetirada", "svuNovaInsercao", "svuNovaRetirada");
    const vmResult  = calcDeviceDays("vm",  "vmInsercao",  "vmRetirada",  "vmNovaInsercao",  "vmNovaRetirada");
    const cvcDays = cvcResult.total;
    const svuDays = svuResult.total;
    const vmDays  = vmResult.total;


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

    // Top 15 antibióticos mais utilizados (tabela + clinical_data)
    const abCounter: Record<string, number> = {};
    const normalize = (s: string) => s.trim().replace(/\s+/g, " ");
    filteredPrescriptions.forEach(rx => {
      const d = parseLocalDate(rx.start_date);
      if (!d || !matchPeriod(d)) return;
      const name = rx.drug_name ? normalize(String(rx.drug_name)) : null;
      if (!name) return;
      abCounter[name] = (abCounter[name] || 0) + 1;
    });
    filteredPatients.forEach(p => {
      const atbs = p.clinical_data?.antibioticos;
      if (!Array.isArray(atbs)) return;
      atbs.forEach((a: any) => {
        const d = parseLocalDate(a?.dataInicio);
        if (!d || !matchPeriod(d)) return;
        const name = a?.nome || a?.antibiotico || a?.droga;
        if (!name) return;
        const key = normalize(String(name));
        abCounter[key] = (abCounter[key] || 0) + 1;
      });
    });
    const topAntibiotics = Object.entries(abCounter)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    // Top 15 microrganismos do painel laboratorial
    // Fonte 1: tabela lab_results (caso exista)
    // Fonte 2: clinical_data.labPanel (preenchido na página /patients/monitoring)
    const filteredLabs = labResults.filter(l => patientIdSet.has(l.patient_id));
    const orgCounter: Record<string, number> = {};
    filteredLabs.forEach(l => {
      const ref = parseLocalDate(l.result_date) || parseLocalDate(l.collection_date);
      if (!ref || !matchPeriod(ref)) return;
      const org = l.organism ? normalize(String(l.organism)) : null;
      if (!org) return;
      orgCounter[org] = (orgCounter[org] || 0) + 1;
    });
    // Parse date in formats: dd/mm/yyyy, yyyy-mm-dd, ISO
    const parseFlexibleDate = (s?: string | null): Date | null => {
      if (!s) return null;
      const str = String(s).trim();
      const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(str);
      if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
      return parseLocalDate(str);
    };
    filteredPatients.forEach(p => {
      const labs = p.clinical_data?.labPanel;
      if (!Array.isArray(labs)) return;
      labs.forEach((lab: any) => {
        const ref = parseFlexibleDate(lab?.data);
        // Se não tiver data, considera o paciente: usa admissão como referência
        const refDate = ref || parseLocalDate(getPatientPeriodStart(p));
        if (!refDate || !matchPeriod(refDate)) return;
        const org = lab?.microrganismo ? normalize(String(lab.microrganismo)) : null;
        if (!org) return;
        orgCounter[org] = (orgCounter[org] || 0) + 1;
      });
    });
    const topOrganisms = Object.entries(orgCounter)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 15);

    return {
      specialtyData, deaths, discharges, totalPatientDays, cvcDays, svuDays, vmDays,
      cvcBreakdown: cvcResult.perPatient,
      svuBreakdown: svuResult.perPatient,
      vmBreakdown:  vmResult.perPatient,
      abCount, extubations, totalAdmitted: admittedInMonth.length, outcomeData, topAntibiotics, topOrganisms,
    };
  }, [filteredPatients, devices, prescriptions, labResults, month, year, currentYear]);

  if (loading || ctxLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Dashboard de Indicadores Operacionais</h1>
          <p className="text-muted-foreground">Dados do Monitoramento de Pacientes — internações, desfechos, dispositivos e antimicrobianos</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="default"
            size="sm"
            onClick={() => navigate("/quality/5w2h", { state: { prefill: {
              what: `Indicadores Operacionais: ${indicators.totalAdmitted} internações, ${indicators.deaths} óbitos, ${indicators.discharges} altas`,
              why: `Monitoramento dos indicadores assistenciais do período. ${indicators.totalPatientDays} pac-dia. Dispositivos: CVC ${indicators.cvcDays}d, VM ${indicators.vmDays}d, SVD ${indicators.svuDays}d. Antibióticos: ${indicators.abCount}.`,
              where: unit.length > 0 ? unit.join(", ") : "Todas as unidades",
              when: year.length > 0 ? year.join(", ") : "Período atual",
              who: "CCIH / Equipe Assistencial / Gestão Hospitalar",
              how: "Análise de indicadores operacionais, revisão de protocolos assistenciais, otimização do uso de dispositivos invasivos e antimicrobianos",
              howMuch: "Investimento em treinamentos, protocolos e monitoramento conforme orçamento hospitalar",
            }}})}
            className="gap-1.5"
          >
            <FileText className="h-4 w-4" /> Gerar Plano 5W2H
          </Button>
          <PdfReportButton
            indicators={indicators}
            month={month}
            year={year}
            unit={unit}
          />
          <DashboardPdfReport data={{
            title: "Dashboard de Indicadores Operacionais",
            subtitle: "Internações, desfechos, paciente-dia, dispositivos invasivos e antimicrobianos",
            hospitalName: hospitalName || "Hospital",
            referenceNorm: "ANVISA RDC 07/2010 · NHSN CDC · OPS",
            context:
              "Este relatório apresenta os indicadores operacionais assistenciais do período selecionado: admissões hospitalares por especialidade, desfechos (altas e óbitos), paciente-dia total, dias de utilização de dispositivos invasivos (CVC, SVD/SVU, Ventilação Mecânica) e uso de antimicrobianos. Estes indicadores são essenciais para o monitoramento da qualidade assistencial e cálculo das taxas de IRAS associadas a dispositivos.",
            methodology:
              "Dados coletados do sistema de monitoramento de pacientes. Cálculos de paciente-dia baseados em dias civis de internação no período selecionado. Dias de dispositivo computados a partir de inserção e retirada registrados no sistema.",
            kpis: [
              { label: "Total de Internações", value: String(indicators.totalAdmitted), sub: "no período" },
              { label: "Pacientes-Dia Total", value: String(indicators.totalPatientDays), sub: "dias acumulados" },
              { label: "Óbitos", value: String(indicators.deaths), sub: "no período", status: indicators.deaths === 0 ? "ok" : "warning" },
              { label: "Altas", value: String(indicators.discharges), sub: "altas registradas" },
              { label: "Dias de CVC", value: String(indicators.cvcDays), sub: "cateter venoso central" },
              { label: "Dias de SVD/SVU", value: String(indicators.svuDays), sub: "sonda vesical" },
              { label: "Dias de VM", value: String(indicators.vmDays), sub: "ventilação mecânica" },
              { label: "Uso de ATB", value: String(indicators.abCount), sub: "registros de antimicrobiano" },
            ],
            extraTables: [
              ...(indicators.specialtyData && indicators.specialtyData.filter((s: any) => s.internacoes > 0).length > 0 ? [{
                title: "Internações por Especialidade",
                headers: ["Especialidade", "Internações"],
                rows: indicators.specialtyData
                  .filter((s: any) => s.internacoes > 0)
                  .sort((a: any, b: any) => b.internacoes - a.internacoes)
                  .map((s: any) => [s.fullName || s.name, String(s.internacoes)]),
              }] : []),
              ...(indicators.topAntibiotics && indicators.topAntibiotics.length > 0 ? [{
                title: "Antimicrobianos Mais Utilizados",
                headers: ["Antimicrobiano", "Registros"],
                rows: indicators.topAntibiotics.slice(0, 10).map((a: any) => [a.name, String(a.value)]),
              }] : []),
              ...(indicators.topOrganisms && indicators.topOrganisms.length > 0 ? [{
                title: "Microrganismos Identificados (Top 10)",
                headers: ["Microrganismo", "Ocorrências"],
                rows: indicators.topOrganisms.slice(0, 10).map((o: any) => [o.name, String(o.value)]),
              }] : []),
            ],
            discussion: [
              `No período analisado foram registradas ${indicators.totalAdmitted} internações, gerando ${indicators.totalPatientDays} paciente(s)-dia. Os desfechos incluem ${indicators.discharges} alta(s) e ${indicators.deaths} óbito(s). ${indicators.deaths > 0 ? "A taxa de mortalidade bruta é de " + (indicators.totalAdmitted > 0 ? ((indicators.deaths / indicators.totalAdmitted) * 100).toFixed(1) : 0) + "%." : "Nenhum óbito registrado no período."}`,
              `Dias de dispositivos invasivos: CVC ${indicators.cvcDays} dias, SVD/SVU ${indicators.svuDays} dias, VM ${indicators.vmDays} dias. O índice de utilização de dispositivos invasivos é um indicador-chave para o risco de IRAS associadas (ICSC-CVC, ITU-CA, PAV). Maior utilização exige vigilância intensificada dos bundles de prevenção.`,
              indicators.abCount > 0
                ? `Foram registrados ${indicators.abCount} uso(s) de antimicrobianos. O monitoramento do perfil de uso de antibióticos é fundamental para o programa de stewardship antimicrobiano e prevenção de resistência.`
                : "Nenhum registro de antimicrobiano no período. Verificar se os dados de dispensação estão sendo registrados corretamente.",
              `Os dados deste relatório devem ser correlacionados com os indicadores epidemiológicos de IRAS (taxas de infecção, letalidade) para avaliação completa da qualidade assistencial e segurança do paciente.`,
            ].join("\n"),
            recommendations: [
              indicators.cvcDays > 0 ? "Monitorar conformidade com bundle de CVC para prevenir ICSC-CVC — avaliar necessidade diária de manutenção do cateter." : "Registrar sistematicamente os dias de utilização de CVC para cálculo de densidade de incidência de ICSC.",
              indicators.svuDays > 0 ? "Avaliar diariamente a necessidade de SVD/SVU — checagem de critérios de retirada reduz ITU-CA." : "Implementar registro sistemático de dias de SVD para vigilância de ITU-CA.",
              indicators.vmDays > 0 ? "Aplicar bundle de prevenção de PAV (cabeceira 30-45°, higiene oral, avaliação diária de extubação)." : "Garantir registro dos dias de VM para cálculo de taxa de PAV quando aplicável.",
              "Correlacionar paciente-dia e dias de dispositivo com as taxas de IRAS calculadas no Dashboard de Indicadores Epidemiológicos.",
              "Realizar análise de prontuário dos óbitos relacionados a infecção para identificar oportunidades de melhoria.",
              "Apresentar estes indicadores na reunião mensal da CCIH e ao núcleo de qualidade hospitalar.",
            ],
            filenamePrefix: "indicadores-operacionais",
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
            className="w-[200px]"
            showNav
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
            <Card ref={chartRefs.specialty} className="lg:col-span-2">
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2 min-w-0">
                  <Stethoscope className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">Internações por Especialidade — {month.length === 0 ? "Todos os meses" : month.length === 1 ? MONTHS[Number(month[0])] : `${month.length} meses`} {year.length === 0 ? "" : year.join(", ")}</span>
                </CardTitle>
                <ChartActions
                  chartRef={chartRefs.specialty}
                  chartTitle="Internações por Especialidade"
                  metaValue={metas.specialty}
                  onMetaChange={v => setMeta("specialty", v)}
                />
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
                      {metas.specialty !== undefined && (
                        <ReferenceLine y={metas.specialty} stroke="hsl(168 66% 34%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta: ${metas.specialty}`, position: "right", fontSize: 10, fill: "hsl(168 66% 34%)" }} />
                      )}
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

            <Card ref={chartRefs.outcomes}>
              <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2 min-w-0">
                  <Activity className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">Desfechos do Período</span>
                </CardTitle>
                <ChartActions chartRef={chartRefs.outcomes} chartTitle="Desfechos do Período" />
              </CardHeader>
              <CardContent>
                {indicators.outcomeData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-12">Sem dados de desfechos.</p>
                ) : (() => {
                  const total = indicators.outcomeData.reduce((s: number, d: any) => s + (d.value || 0), 0) || 1;
                  return (
                    <>
                      <ResponsiveContainer width="100%" height={220}>
                        <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                          <Pie
                            data={indicators.outcomeData}
                            cx="50%"
                            cy="50%"
                            innerRadius="45%"
                            outerRadius="80%"
                            paddingAngle={2}
                            dataKey="value"
                            labelLine={false}
                            label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, value }: any) => {
                              if (!percent || percent < 0.06) return null;
                              const RAD = Math.PI / 180;
                              const r = innerRadius + (outerRadius - innerRadius) * 0.55;
                              const x = cx + r * Math.cos(-midAngle * RAD);
                              const y = cy + r * Math.sin(-midAngle * RAD);
                              return (
                                <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
                                  {value}
                                </text>
                              );
                            }}
                          >
                            {indicators.outcomeData.map((entry: any, index: number) => (
                              <Cell key={`pie-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number, n: string) => [`${v} (${((Number(v) / total) * 100).toFixed(1)}%)`, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="grid grid-cols-1 gap-1.5 mt-2 px-1">
                        {indicators.outcomeData.map((entry: any, i: number) => {
                          const pct = ((entry.value / total) * 100).toFixed(1);
                          return (
                            <div key={i} className="flex items-center justify-between gap-2 text-xs">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="inline-block w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: entry.color }} />
                                <span className="text-foreground truncate">{entry.name}</span>
                              </div>
                              <span className="text-muted-foreground tabular-nums shrink-0">
                                {entry.value} <span className="opacity-70">({pct}%)</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <DensityCard title="Densidade CVC" deviceDays={indicators.cvcDays} patientDays={indicators.totalPatientDays} icon={Cable} color="text-amber-600" />
            <DensityCard title="Densidade SVD" deviceDays={indicators.svuDays} patientDays={indicators.totalPatientDays} icon={Droplets} color="text-purple-600" />
            <DensityCard title="Densidade VM" deviceDays={indicators.vmDays} patientDays={indicators.totalPatientDays} icon={Wind} color="text-blue-600" />
          </div>

          <DeviceBreakdownCard
            cvcBreakdown={indicators.cvcBreakdown}
            svuBreakdown={indicators.svuBreakdown}
            vmBreakdown={indicators.vmBreakdown}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TopRankCard
              chartRef={chartRefs.topAntibiotics}
              metaValue={metas.topAntibiotics}
              onMetaChange={v => setMeta("topAntibiotics", v)}
              title="Top 15 Antibióticos Mais Utilizados"
              icon={Pill}
              iconColor="text-orange-600"
              data={indicators.topAntibiotics}
              barColor="hsl(20, 70%, 50%)"
              emptyText="Nenhum antibiótico registrado no período."
              valueLabel="Prescrições"
            />
            <TopRankCard
              chartRef={chartRefs.topOrganisms}
              metaValue={metas.topOrganisms}
              onMetaChange={v => setMeta("topOrganisms", v)}
              title="Top 15 Microrganismos (Painel Laboratorial)"
              icon={Microscope}
              iconColor="text-purple-600"
              data={indicators.topOrganisms}
              barColor="hsl(270, 50%, 55%)"
              emptyText="Nenhum microrganismo isolado no período."
              valueLabel="Isolados"
            />
          </div>

          <Card className="border-primary/20">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Insights Inteligentes (IA)
              </CardTitle>
              <DashboardAIInsights
                pageTitle="Dashboard de Indicadores Operacionais"
                generateInsights={() => {
                  const ins: string[] = [];
                  ins.push(`📊 ${indicators.totalAdmitted} pacientes admitidos no período selecionado.`);
                  ins.push(`💀 ${indicators.deaths} óbitos e ${indicators.discharges} altas registradas.`);
                  ins.push(`🛏️ Total de ${indicators.totalPatientDays} paciente-dia.`);
                  if (indicators.cvcDays > 0) ins.push(`💉 CVC: ${indicators.cvcDays} dias-dispositivo.`);
                  if (indicators.svuDays > 0) ins.push(`🔧 SVD: ${indicators.svuDays} dias-dispositivo.`);
                  if (indicators.vmDays > 0) ins.push(`🌬️ VM: ${indicators.vmDays} dias-dispositivo.`);
                  if (indicators.abCount > 0) ins.push(`💊 ${indicators.abCount} antimicrobianos utilizados no período.`);
                  if (indicators.extubations > 0) ins.push(`✅ ${indicators.extubations} extubações realizadas com sucesso.`);
                  if (indicators.topAntibiotics[0]) ins.push(`🥇 Antibiótico mais usado: ${indicators.topAntibiotics[0].name} (${indicators.topAntibiotics[0].value}x).`);
                  if (indicators.topOrganisms[0]) ins.push(`🦠 Microrganismo mais isolado: ${indicators.topOrganisms[0].name} (${indicators.topOrganisms[0].value}x).`);
                  return ins;
                }}
              />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Clique em <strong>Insights IA</strong> para gerar análise inteligente do período. Use o botão <strong>Relatório PDF</strong> no topo para baixar um documento técnico completo gerado pela IA.
              </p>
            </CardContent>
          </Card>

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
                      <th className="text-center py-2 px-3 font-medium">
                        <button
                          onClick={() => toggleSpecSort("internacoes")}
                          className="inline-flex items-center gap-1 hover:text-primary mx-auto"
                        >
                          Internações
                          {specSortKey === "internacoes"
                            ? (specSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                            : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                        </button>
                      </th>
                      <th className="text-center py-2 px-3 font-medium">
                        <button
                          onClick={() => toggleSpecSort("percent")}
                          className="inline-flex items-center gap-1 hover:text-primary mx-auto"
                        >
                          % do Total
                          {specSortKey === "percent"
                            ? (specSortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
                            : <ArrowUpDown className="h-3 w-3 opacity-50" />}
                        </button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rows = indicators.specialtyData.map((s, i) => ({ ...s, _color: COLORS[i % COLORS.length] }));
                      if (specSortKey) {
                        const dir = specSortDir === "asc" ? 1 : -1;
                        rows.sort((a, b) => (a.internacoes - b.internacoes) * dir);
                      }
                      return rows.map((s) => (
                        <tr key={s.fullName} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-2 px-3 flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: s._color }} />
                            {s.fullName}
                          </td>
                          <td className="text-center py-2 px-3 font-semibold">{s.internacoes}</td>
                          <td className="text-center py-2 px-3 text-muted-foreground">
                            {indicators.totalAdmitted > 0 ? ((s.internacoes / indicators.totalAdmitted) * 100).toFixed(1) : "0.0"}%
                          </td>
                        </tr>
                      ));
                    })()}
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

      {/* Infectologist AI Insights */}
      {patients.length > 0 && (
        <InfectologistInsightsPanel
          domain="Indicadores Operacionais"
          buildContext={() => [
            `Total de internações: ${indicators.totalAdmitted}`,
            `Óbitos: ${indicators.deaths} | Altas: ${indicators.discharges}`,
            `Total paciente-dia: ${indicators.totalPatientDays}`,
            `Dispositivos invasivos — CVC: ${indicators.cvcDays} dias, VM: ${indicators.vmDays} dias, SVD: ${indicators.svuDays} dias`,
            `Antibióticos utilizados: ${indicators.abCount}`,
            `Extubações bem-sucedidas: ${indicators.extubations}`,
            indicators.topAntibiotics.length > 0
              ? `Antibióticos mais usados: ${indicators.topAntibiotics.slice(0,3).map((a: any) => `${a.name} (${a.value}x)`).join(", ")}`
              : "",
            indicators.topOrganisms.length > 0
              ? `Microrganismos isolados: ${indicators.topOrganisms.slice(0,3).map((o: any) => `${o.name} (${o.value}x)`).join(", ")}`
              : "",
            `Filtros: unidade ${unit.length > 0 ? unit.join(",") : "todas"}, mês ${month.length > 0 ? month.join(",") : "todos"}, ano ${year.length > 0 ? year.join(",") : "todos"}`,
          ].filter(Boolean).join("\n")}
          contextKey={`${indicators.totalAdmitted}|${indicators.deaths}|${unit.join(",")}|${month.join(",")}|${year.join(",")}`}
        />
      )}

      {/* Analysis Tabs */}
      {patients.length > 0 && (
        <DashboardAnalysisTabs config={{
          domain: "Indicadores Operacionais",
          effectLabel: "Piora dos Indicadores Assistenciais",
          ishikawaCategories: [
            { name: "Método", items: ["Protocolos assistenciais desatualizados", "Ausência de checklist de segurança", "Rounds multidisciplinares irregulares", "Critérios de alta não padronizados"] },
            { name: "Máquina", items: ["Dispositivos invasivos sem manutenção", "Falta de monitores multiparamétricos", "Ventiladores sem calibração periódica", "Bombas de infusão inadequadas"] },
            { name: "Material", items: ["EPIs insuficientes para isolamento", "Cateteres de baixa qualidade", "Falta de curativos especializados", "Insumos críticos em falta"] },
            { name: "Mão de Obra", items: ["Sobrecarga da equipe de enfermagem", "Alta rotatividade de médicos", "Falta de especialistas disponíveis", "Treinamento insuficiente em procedimentos"] },
            { name: "Medida", items: ["Indicadores não analisados regularmente", "Subnotificação de eventos adversos", "Metas não comunicadas à equipe", "Ausência de benchmarking"] },
            { name: "Meio Ambiente", items: ["Superlotação nas UTIs", "Infraestrutura inadequada", "Falta de isolamentos individuais", "Layout desfavorável ao fluxo de trabalho"] },
          ],
          paretoData: [
            { name: "Sobrecarga de equipe", value: 35 },
            { name: "Protocolos desatualizados", value: 28 },
            { name: "Superlotação", value: 22 },
            { name: "Subnotificação", value: 18 },
            { name: "Falta de treinamento", value: 14 },
            { name: "Insumos críticos", value: 10 },
            { name: "Outros", value: 6 },
          ],
          swotData: {
            strengths: ["Sistema de monitoramento estruturado", "Equipe assistencial comprometida", "Dados operacionais registrados sistematicamente", "Suporte multidisciplinar disponível"],
            weaknesses: ["Sobrecarga da equipe assistencial", "Alta rotatividade de profissionais", "Monitoramento de dispositivos irregular", "Protocolos de alta nem sempre seguidos"],
            opportunities: ["Melhoria contínua dos protocolos assistenciais", "Treinamentos em segurança do paciente", "Implementação de rounds multiprofissionais", "Uso de tecnologia para monitoramento remoto"],
            threats: ["Pressão por redução de leitos", "Escassez de profissionais especializados", "Aumento da complexidade dos casos", "Restrições orçamentárias crescentes"],
          },
          risks: [
            { id: "r1", description: "Aumento da mortalidade hospitalar por falhas assistenciais", probability: 3, impact: 5 },
            { id: "r2", description: "Elevação do tempo médio de permanência por complicações", probability: 4, impact: 4 },
            { id: "r3", description: "Uso excessivo de dispositivos aumentando risco de IRAS", probability: 3, impact: 4 },
            { id: "r4", description: "Subnotificação comprometendo análise de qualidade", probability: 4, impact: 3 },
            { id: "r5", description: "Acreditação hospitalar em risco por indicadores ruins", probability: 2, impact: 5 },
          ],
          pdcaData: {
            plan: ["Revisar e atualizar protocolos assistenciais", "Definir metas de indicadores por unidade", "Implementar rounds multiprofissionais diários", "Criar comissão de revisão de óbitos"],
            do: ["Treinar equipes em protocolos de segurança", "Monitorar uso de dispositivos invasivos diariamente", "Otimizar critérios e processo de alta", "Implementar sistema de notificação de eventos adversos"],
            check: ["Analisar indicadores assistenciais mensalmente", "Auditar adesão aos protocolos nas unidades", "Revisar todos os óbitos e eventos adversos", "Comparar indicadores com benchmark nacional"],
            act: ["Ajustar protocolos baseado nos dados mensais", "Ampliar treinamentos nos setores com piores índices", "Escalar intervenções em situações críticas", "Propor mudanças estruturais se necessário"],
          },
          stats: {
            value: indicators.totalAdmitted,
            label: "Internações",
            issues: indicators.deaths,
            topIssue: "Óbitos",
            sector: unit.length > 0 ? unit[0] : "—",
          },
        } as AnalysisConfig} />
      )}
    </div>
  );
};

function DeviceBreakdownCard({
  cvcBreakdown, svuBreakdown, vmBreakdown,
}: {
  cvcBreakdown: Array<{ id: string; name: string; days: number }>;
  svuBreakdown: Array<{ id: string; name: string; days: number }>;
  vmBreakdown:  Array<{ id: string; name: string; days: number }>;
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"cvc" | "svu" | "vm">("cvc");

  const data = { cvc: cvcBreakdown, svu: svuBreakdown, vm: vmBreakdown };
  const labels = { cvc: "CVC", svu: "SVD", vm: "VM" };
  const totals = { cvc: cvcBreakdown.reduce((s, r) => s + r.days, 0), svu: svuBreakdown.reduce((s, r) => s + r.days, 0), vm: vmBreakdown.reduce((s, r) => s + r.days, 0) };
  const rows = data[tab].slice().sort((a, b) => b.days - a.days);

  return (
    <Card className="border-muted">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Detalhamento por Paciente — Dias de Dispositivo
          </span>
          <Button variant="ghost" size="sm" onClick={() => setOpen(v => !v)} className="h-7 text-xs">
            {open ? "Ocultar" : "Ver detalhes"}
          </Button>
        </CardTitle>
      </CardHeader>
      {open && (
        <CardContent>
          <div className="flex gap-2 mb-3">
            {(["cvc", "svu", "vm"] as const).map(k => (
              <Button
                key={k}
                variant={tab === k ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => setTab(k)}
              >
                {labels[k]} — {totals[k]} dias
              </Button>
            ))}
          </div>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum paciente com {labels[tab]} no período.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-1.5 px-2 font-medium text-muted-foreground">Paciente</th>
                    <th className="py-1.5 px-2 font-medium text-muted-foreground text-right">Dias {labels[tab]}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                      <td className="py-1.5 px-2 truncate max-w-xs">{r.name}</td>
                      <td className="py-1.5 px-2 text-right font-semibold">{r.days}</td>
                    </tr>
                  ))}
                  <tr className="bg-muted/30 font-bold">
                    <td className="py-1.5 px-2">Total</td>
                    <td className="py-1.5 px-2 text-right">{totals[tab]}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

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

function TopRankCard({ title, icon: Icon, iconColor, data, barColor, emptyText, valueLabel, chartRef, metaValue, onMetaChange }: {
  title: string;
  icon: any;
  iconColor: string;
  data: Array<{ name: string; value: number }>;
  barColor: string;
  emptyText: string;
  valueLabel: string;
  chartRef?: React.RefObject<HTMLDivElement>;
  metaValue?: number;
  onMetaChange?: (v: number | undefined) => void;
}) {
  const chartHeight = Math.max(280, data.length * 36);
  // Quebra labels longos em até 2 linhas para não sobrepor as barras
  const renderYTick = (props: any) => {
    const { x, y, payload } = props;
    const text = String(payload.value || "");
    const max = 22;
    const lines: string[] = [];
    if (text.length <= max) lines.push(text);
    else {
      const words = text.split(" ");
      let cur = "";
      for (const w of words) {
        if ((cur + " " + w).trim().length > max && cur) {
          lines.push(cur);
          cur = w;
        } else {
          cur = (cur + " " + w).trim();
        }
        if (lines.length === 2) break;
      }
      if (cur && lines.length < 3) lines.push(cur.length > max ? cur.slice(0, max - 1) + "…" : cur);
    }
    const lineHeight = 12;
    const startY = -((lines.length - 1) * lineHeight) / 2;
    return (
      <g transform={`translate(${x},${y})`}>
        {lines.map((ln, i) => (
          <text key={i} x={-6} y={startY + i * lineHeight} dy={4} textAnchor="end" fontSize={10} fill="hsl(var(--muted-foreground))">
            {ln}
          </text>
        ))}
      </g>
    );
  };
  return (
    <Card ref={chartRef}>
      <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
        <CardTitle className="text-base flex items-center gap-2 min-w-0">
          <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
          <span className="truncate">{title}</span>
        </CardTitle>
        {chartRef && (
          <ChartActions
            chartRef={chartRef}
            chartTitle={title}
            metaValue={metaValue}
            onMetaChange={onMetaChange}
          />
        )}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">{emptyText}</p>
        ) : (
          <ResponsiveContainer width="100%" height={chartHeight}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={renderYTick} width={150} interval={0} />
              <Tooltip formatter={(v: number) => [v, valueLabel]} />
              {metaValue !== undefined && (
                <ReferenceLine x={metaValue} stroke="hsl(168 66% 34%)" strokeDasharray="6 3" strokeWidth={2} label={{ value: `Meta: ${metaValue}`, position: "top", fontSize: 10, fill: "hsl(168 66% 34%)" }} />
              )}
              <Bar dataKey="value" name={valueLabel} fill={barColor} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function PdfReportButton({ indicators, month, year, unit }: {
  indicators: any;
  month: string[];
  year: string[];
  unit: string[];
}) {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const monthsNames = month.length === 0 ? [] : month.map((m) => MONTHS[Number(m)]);
      const yearsNum = year.length === 0 ? [] : year.map((y) => Number(y));

      const payload = {
        pageTitle: "Dashboard de Indicadores Operacionais",
        filters: { months: monthsNames, years: yearsNum, units: unit },
        metrics: {
          totalAdmitted: indicators.totalAdmitted,
          totalPatientDays: indicators.totalPatientDays,
          deaths: indicators.deaths,
          discharges: indicators.discharges,
          cvcDays: indicators.cvcDays,
          svuDays: indicators.svuDays,
          vmDays: indicators.vmDays,
          abCount: indicators.abCount,
          extubations: indicators.extubations,
        },
        specialtyData: indicators.specialtyData.map((s: any) => ({
          fullName: s.fullName,
          internacoes: s.internacoes,
        })),
        topAntibiotics: indicators.topAntibiotics,
        topOrganisms: indicators.topOrganisms,
      };

      toast.info("Gerando relatório com IA...");
      const { data, error } = await supabase.functions.invoke("dashboard-pdf-report", {
        body: payload,
      });

      if (error) throw error;
      if (!data?.pdfBase64) throw new Error("Resposta inválida");

      // Decode base64 to blob and download
      const binary = atob(data.pdfBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `relatorio-indicadores-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Relatório PDF gerado!");
    } catch (err: any) {
      console.error("PDF error:", err);
      const msg = err?.context?.statusCode === 429 || err?.message?.includes("429")
        ? "Limite de requisições. Tente novamente em alguns minutos."
        : err?.context?.statusCode === 402 || err?.message?.includes("402")
        ? "Créditos de IA esgotados."
        : err?.message || "Erro ao gerar PDF";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="default" onClick={handleGenerate} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
      Relatório PDF
    </Button>
  );
}

export default PatientDashboardIndicators;
