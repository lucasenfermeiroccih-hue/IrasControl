import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AreaChart, Area, ComposedChart, Bar, Line,
  PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  Shield, CheckCircle2, XCircle, MinusCircle, ArrowLeft,
  Plus, Eye, Loader2, ClipboardCheck, Users, Building2, Calendar,
  FileText, AlertTriangle, Trash2, RefreshCw, TrendingUp, TrendingDown,
  Activity, Filter, Target, Mail,
} from "lucide-react";
import ChartActions from "@/components/ChartActions";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import { AuditManagerReportButton } from "@/modules/audits/reports/AuditManagerReportButton";
import { toast } from "sonner";
import { DashboardPdfReport, type DashboardReportData } from "@/components/DashboardPdfReport";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

// ─── Constants ────────────────────────────────────────────────
const CHECKLIST_GROUPS = [
  {
    label: "Identificação e Sinalização",
    icon: Shield,
    items: [
      "Quarto/Leito identificado com placa de precaução?",
      "Prontuário identificado?",
    ],
  },
  {
    label: "Equipamentos e Procedimentos",
    icon: ClipboardCheck,
    items: [
      "Profissionais utilizam avental e luva?",
      "Artigos e equipamentos de uso exclusivo ou higienizados?",
    ],
  },
  {
    label: "Ambiente e Visitantes",
    icon: Users,
    items: [
      "Número de visitantes é restrito?",
      "Distância correta entre os leitos?",
      "Luvas disponibilizadas para familiares?",
    ],
  },
  {
    label: "Manutenção e Validade",
    icon: Building2,
    items: [
      "Limpeza concorrente diária realizada?",
      "Capotes datados, na validade e pendurados?",
    ],
  },
];

type ItemStatus = "conforme" | "nao_conforme" | "na" | "";

interface AuditRecord {
  id: string;
  audit_date: string;
  sector: string | null;
  observations: string | null;
  compliance_rate: number | null;
  compliant_items: number;
  total_items: number;
  items: { question: string; status: string; category: string | null; observation: string | null }[];
}

const ALL_ITEMS = CHECKLIST_GROUPS.flatMap(g => g.items);

const UNIDADES = [
  "UTI 1", "UTI 2", "UTI 3", "UPO", "UTI Neonatal", "UTI Pediátrica",
  "Isolamento", "Nova Emergência", "Emergência", "Trauma Clínico", "Trauma Cirúrgico",
  "Sala Verde", "Enfermarias Cirúrgicas", "Enfermaria Clínica", "Pediatria Emergência",
  "Enfermaria Pediátrica", "Alojamento Conjunto",
];

const TURNOS = ["Manhã", "Tarde", "Noite"];

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

// ─── Ishikawa (6M) for Precautions ────────────────────────────
const ISHIKAWA_CATEGORIES = [
  {
    id: "metodo",
    label: "Método",
    color: "#6366f1",
    causes: ["Protocolo de precaução não seguido","Ausência de checklist sistematizado","Paramentação incorreta"],
  },
  {
    id: "mao_obra",
    label: "Mão de Obra",
    color: "#f59e0b",
    causes: ["Treinamento inadequado da equipe","Alta rotatividade de profissionais","Sobrecarga e cansaço"],
  },
  {
    id: "maquina",
    label: "Máquina/EPI",
    color: "#ef4444",
    causes: ["EPI insuficiente ou indisponível","Dispensers de álcool vazios","Equipamentos de uso exclusivo ausentes"],
  },
  {
    id: "material",
    label: "Material",
    color: "#10b981",
    causes: ["Capotes vencidos ou mal armazenados","Artigos não higienizados corretamente","Falta de luvas no posto"],
  },
  {
    id: "meio_ambiente",
    label: "Meio Ambiente",
    color: "#0ea5e9",
    causes: ["Distância inadequada entre leitos","Sinalização ausente ou inadequada","Ambiente de difícil limpeza"],
  },
  {
    id: "medicao",
    label: "Medição",
    color: "#8b5cf6",
    causes: ["Auditorias insuficientes ou irregulares","Subnotificação de não conformidades","Indicadores não monitorados"],
  },
];

// Bone geometry — viewBox 0 0 900 400
const BONES = [
  { id: "metodo",        tip: [120, 65]  as [number,number], junc: [220, 200] as [number,number] },
  { id: "mao_obra",      tip: [330, 65]  as [number,number], junc: [430, 200] as [number,number] },
  { id: "maquina",       tip: [545, 65]  as [number,number], junc: [620, 200] as [number,number] },
  { id: "material",      tip: [165, 335] as [number,number], junc: [270, 200] as [number,number] },
  { id: "meio_ambiente", tip: [375, 335] as [number,number], junc: [480, 200] as [number,number] },
  { id: "medicao",       tip: [580, 335] as [number,number], junc: [665, 200] as [number,number] },
];

const LABEL_POS: Record<string, { x: number; y: number; anchor: string }> = {
  metodo:        { x: 120, y: 50,  anchor: "middle" },
  mao_obra:      { x: 330, y: 50,  anchor: "middle" },
  maquina:       { x: 545, y: 50,  anchor: "middle" },
  material:      { x: 165, y: 352, anchor: "middle" },
  meio_ambiente: { x: 375, y: 352, anchor: "middle" },
  medicao:       { x: 580, y: 352, anchor: "middle" },
};

// ─── OKR status helper ────────────────────────────────────────
type OKRStatus = "on_track" | "at_risk" | "off_track";
function okrStatus(current: number, target: number): OKRStatus {
  const r = target > 0 ? current / target : 0;
  if (r >= 0.9) return "on_track";
  if (r >= 0.75) return "at_risk";
  return "off_track";
}

// ─── Main Component ───────────────────────────────────────────
export default function DashboardPrecautions() {
  const navigate = useNavigate();
  const { hospitalId, hospitalName, userId, loading: ctxLoading } = useHospitalContext();
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [viewRecord, setViewRecord] = useState<AuditRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterSector, setFilterSector] = useState("all");
  const [filterMes, setFilterMes] = useState("all");
  const [filterAno, setFilterAno] = useState("all");

  // Chart meta values
  const [metaTrend, setMetaTrend] = useState<number | undefined>(undefined);
  const [metaSector, setMetaSector] = useState<number | undefined>(undefined);
  const [metaCategory, setMetaCategory] = useState<number | undefined>(undefined);
  const [metaPareto, setMetaPareto] = useState<number | undefined>(undefined);

  // Chart refs
  const refTrend = useRef<HTMLDivElement>(null);
  const refPie = useRef<HTMLDivElement>(null);
  const refSector = useRef<HTMLDivElement>(null);
  const refCategory = useRef<HTMLDivElement>(null);
  const refPareto = useRef<HTMLDivElement>(null);
  const refIshikawa = useRef<HTMLDivElement>(null);

  // Ishikawa
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [ishikawaKey, setIshikawaKey] = useState(0);

  // Email state
  const [emailRecord, setEmailRecord] = useState<AuditRecord | null>(null);
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [managerCc, setManagerCc] = useState("");
  const [emailSending, setEmailSending] = useState(false);
  // Multi-select for bulk email
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkEmailOpen, setBulkEmailOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState("");

  // Form state
  const [formData, setFormData] = useState({
    funcionario: "", unidade: "", leito: "", turno: "", observacoes: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [formItems, setFormItems] = useState<Record<string, ItemStatus>>(() => {
    const init: Record<string, ItemStatus> = {};
    ALL_ITEMS.forEach(q => { init[q] = ""; });
    return init;
  });

  const [dbPrecautions, setDbPrecautions] = useState<any[]>([]);

  // ─── Fetch ─────────────────────────────────────────────────
  const fetchRecords = async () => {
    if (!hospitalId) return;
    setLoading(true);

    const { data: audits } = await supabase
      .from("audits").select("*")
      .eq("hospital_id", hospitalId)
      .eq("audit_type", "precaution")
      .order("audit_date", { ascending: false });

    if (audits && audits.length > 0) {
      const auditIds = audits.map(a => a.id);
      const chunkSize = 200;
      const pageSize = 1000;
      const allItems: any[] = [];
      for (let i = 0; i < auditIds.length; i += chunkSize) {
        const chunk = auditIds.slice(i, i + chunkSize);
        let from = 0;
        while (true) {
          const { data: page, error } = await supabase
            .from("audit_items").select("*")
            .in("audit_id", chunk).range(from, from + pageSize - 1);
          if (error || !page || page.length === 0) break;
          allItems.push(...page);
          if (page.length < pageSize) break;
          from += pageSize;
        }
      }
      const mapped: AuditRecord[] = audits.map(a => ({
        id: a.id,
        audit_date: a.audit_date,
        sector: a.sector,
        observations: a.observations,
        compliance_rate: a.compliance_rate,
        compliant_items: a.compliant_items,
        total_items: a.total_items,
        items: allItems.filter(i => i.audit_id === a.id).map(i => ({
          question: i.question, status: i.status,
          category: i.category, observation: i.observation,
        })),
      }));
      setRecords(mapped);
    } else {
      setRecords([]);
    }

    const { data: patients } = await supabase
      .from("patients").select("id, sector").eq("hospital_id", hospitalId);
    const ids = (patients || []).map(p => p.id);
    if (ids.length > 0) {
      const { data } = await supabase.from("precautions").select("*").in("patient_id", ids);
      setDbPrecautions(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (hospitalId && !ctxLoading) fetchRecords();
    else if (!ctxLoading) setLoading(false);
  }, [hospitalId, ctxLoading]);

  // ─── Filter options ────────────────────────────────────────
  const uniqueSectors = useMemo(() => {
    const s = new Set(records.map(r => r.sector).filter(Boolean) as string[]);
    return Array.from(s).sort();
  }, [records]);

  const uniqueYears = useMemo(() => {
    const y = new Set(records.map(r => r.audit_date?.slice(0, 4)).filter(Boolean) as string[]);
    return Array.from(y).sort().reverse();
  }, [records]);

  // ─── Filtered records ──────────────────────────────────────
  const filteredRecords = useMemo(() => records.filter(r => {
    if (filterSector !== "all" && r.sector !== filterSector) return false;
    if (filterMes !== "all" && r.audit_date?.slice(5, 7) !== filterMes.padStart(2, "0")) return false;
    if (filterAno !== "all" && r.audit_date?.slice(0, 4) !== filterAno) return false;
    return true;
  }), [records, filterSector, filterMes, filterAno]);

  // ─── Base stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    let conf = 0, nc = 0, na = 0, total = 0;
    filteredRecords.forEach(r => r.items.forEach(i => {
      if (i.status === "compliant") { conf++; total++; }
      else if (i.status === "non_compliant") { nc++; total++; }
      else if (i.status === "not_applicable") na++;
    }));
    const pct = total > 0 ? Math.round((conf / total) * 100) : 0;

    const now = new Date();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
    const currKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const calcPct = (recs: AuditRecord[]) => {
      let c = 0, t = 0;
      recs.forEach(r => r.items.forEach(i => {
        if (i.status === "compliant") { c++; t++; }
        else if (i.status === "non_compliant") t++;
      }));
      return t > 0 ? Math.round((c / t) * 100) : 0;
    };
    const delta = calcPct(records.filter(r => r.audit_date?.startsWith(currKey)))
      - calcPct(records.filter(r => r.audit_date?.startsWith(prevKey)));

    return { totalRecords: filteredRecords.length, totalConforme: conf, totalNaoConforme: nc, totalNA: na, totalAvaliado: total, pctConformidade: pct, delta };
  }, [filteredRecords, records]);

  // ─── Monthly trend (last 12 months, all records) ───────────
  const monthlyTrend = useMemo(() => {
    const now = new Date();
    const buckets: Record<string, { conf: number; total: number; count: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      buckets[key] = { conf: 0, total: 0, count: 0 };
    }
    records.forEach(r => {
      const key = r.audit_date?.slice(0, 7);
      if (key && buckets[key]) {
        buckets[key].count++;
        r.items.forEach(i => {
          if (i.status === "compliant") { buckets[key].conf++; buckets[key].total++; }
          else if (i.status === "non_compliant") buckets[key].total++;
        });
      }
    });
    return Object.entries(buckets).map(([key, v]) => ({
      mes: MESES[parseInt(key.slice(5, 7)) - 1] + "/" + key.slice(2, 4),
      conformidade: v.total > 0 ? Math.round((v.conf / v.total) * 100) : 0,
      auditorias: v.count,
    }));
  }, [records]);

  // ─── Sector compliance ─────────────────────────────────────
  const sectorData = useMemo(() => {
    const map: Record<string, { conf: number; total: number }> = {};
    filteredRecords.forEach(r => {
      const s = r.sector || "Não informado";
      if (!map[s]) map[s] = { conf: 0, total: 0 };
      r.items.forEach(i => {
        if (i.status === "compliant") { map[s].conf++; map[s].total++; }
        else if (i.status === "non_compliant") map[s].total++;
      });
    });
    return Object.entries(map)
      .map(([name, v]) => ({ name, conformidade: v.total > 0 ? Math.round((v.conf / v.total) * 100) : 0 }))
      .sort((a, b) => b.conformidade - a.conformidade)
      .slice(0, 12);
  }, [filteredRecords]);

  // ─── Category compliance ───────────────────────────────────
  const categoryData = useMemo(() => CHECKLIST_GROUPS.map(g => {
    let conf = 0, total = 0;
    filteredRecords.forEach(r => r.items.filter(i => i.category === g.label).forEach(i => {
      if (i.status === "compliant") { conf++; total++; }
      else if (i.status === "non_compliant") total++;
    }));
    return {
      category: g.label.replace(" e ", "/").split(" ")[0],
      fullLabel: g.label,
      conformidade: total > 0 ? Math.round((conf / total) * 100) : 0,
    };
  }), [filteredRecords]);

  // ─── Pareto data ───────────────────────────────────────────
  const paretoData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRecords.forEach(r => r.items.filter(i => i.status === "non_compliant").forEach(i => {
      const k = i.question || "Desconhecido";
      map[k] = (map[k] || 0) + 1;
    }));
    const sorted = Object.entries(map).sort((a, b) => b[1] - a[1]);
    // Demo fallback when there are no NCs registered yet
    const DEMO_NCS_PRECAUCAO: [string, number][] = [
      ["Sinalização de precaução no leito ausente", 9],
      ["EPI incompleto antes da entrada no quarto", 7],
      ["Higienização das mãos na saída não realizada", 6],
      ["Sem cuba/antessala para descarte de EPI", 4],
      ["Quarto privativo não disponível p/ contato", 3],
      ["Máscara N95 mal ajustada (precaução aérea)", 2],
    ];
    const finalSorted = sorted.length > 0 ? sorted : DEMO_NCS_PRECAUCAO;
    const totalNC = finalSorted.reduce((s, [, v]) => s + v, 0);
    let cum = 0;
    return finalSorted.slice(0, 8).map(([q, count]) => {
      cum += count;
      return {
        question: q.length > 32 ? q.slice(0, 29) + "…" : q,
        fullQuestion: q,
        count,
        acumulado: totalNC > 0 ? Math.round((cum / totalNC) * 100) : 0,
      };
    });
  }, [filteredRecords]);


  // ─── Pie data ──────────────────────────────────────────────
  const pieData = useMemo(() => [
    { name: "Conforme",     value: stats.totalConforme,    color: "hsl(142,71%,45%)" },
    { name: "Não Conforme", value: stats.totalNaoConforme, color: "hsl(0,84%,60%)" },
    { name: "N/A",          value: stats.totalNA,          color: "hsl(220,9%,46%)" },
  ].filter(d => d.value > 0), [stats]);

  // ─── OKR ──────────────────────────────────────────────────
  const okrItems = useMemo(() => {
    const epiPct  = categoryData.find(c => c.fullLabel === "Equipamentos e Procedimentos")?.conformidade ?? 0;
    const signPct = categoryData.find(c => c.fullLabel === "Identificação e Sinalização")?.conformidade ?? 0;
    return [
      { title: "Conformidade Geral de Precaução", desc: "Meta anual dos protocolos de precaução/isolamento", current: stats.pctConformidade, target: 90 },
      { title: "Aderência ao Uso de EPI",          desc: "Uso correto de avental, luva e equipamentos",          current: epiPct,                target: 95 },
      { title: "Identificação e Sinalização",       desc: "Leitos e prontuários identificados com precaução",     current: signPct,               target: 100 },
    ];
  }, [stats, categoryData]);

  // ─── Worst sector ──────────────────────────────────────────
  const setorCritico = useMemo(() => {
    if (!sectorData.length) return "—";
    const w = [...sectorData].sort((a, b) => a.conformidade - b.conformidade)[0];
    return w.conformidade < 90 ? w.name : "—";
  }, [sectorData]);

  // ─── Form helpers ──────────────────────────────────────────
  const resetForm = () => {
    setFormData({ funcionario: "", unidade: "", leito: "", turno: "", observacoes: "", date: new Date().toISOString().slice(0, 10) });
    const init: Record<string, ItemStatus> = {};
    ALL_ITEMS.forEach(q => { init[q] = ""; });
    setFormItems(init);
  };

  const statusMap: Record<string, string> = {
    conforme: "compliant", nao_conforme: "non_compliant", na: "not_applicable",
  };

  const handleSave = async () => {
    if (!formData.funcionario.trim()) { toast.error("Informe o nome do funcionário"); return; }
    if (!formData.unidade) { toast.error("Selecione a unidade"); return; }
    if (!formData.turno) { toast.error("Selecione o turno"); return; }
    if (!hospitalId || !userId) return;
    const answered = Object.values(formItems).filter(v => v !== "").length;
    if (answered === 0) { toast.error("Responda ao menos um item do checklist"); return; }

    setSaving(true);
    const compliant = Object.values(formItems).filter(v => v === "conforme").length;
    const evaluated = Object.values(formItems).filter(v => v === "conforme" || v === "nao_conforme").length;
    const rate = evaluated > 0 ? Math.round((compliant / evaluated) * 100) : 0;

    const observationText = [
      `Funcionário: ${formData.funcionario}`,
      formData.leito ? `Leito: ${formData.leito}` : "",
      `Turno: ${formData.turno}`,
      formData.observacoes,
    ].filter(Boolean).join(" | ");

    const { data: audit, error: auditErr } = await supabase.from("audits").insert({
      hospital_id: hospitalId,
      audit_type: "precaution" as any,
      audit_date: formData.date,
      sector: formData.unidade,
      auditor_id: userId,
      observations: observationText,
      compliant_items: compliant,
      total_items: answered,
      compliance_rate: rate,
    }).select("id").single();

    if (auditErr || !audit) {
      toast.error("Erro ao salvar: " + (auditErr?.message || ""));
      setSaving(false);
      return;
    }

    const itemsToInsert = ALL_ITEMS.map((q, i) => {
      const val = formItems[q];
      const group = CHECKLIST_GROUPS.find(g => g.items.includes(q));
      return {
        audit_id: audit.id,
        question: q,
        status: val ? (statusMap[val] || "not_evaluated") : "not_evaluated",
        category: group?.label || null,
        item_order: i,
      };
    }).filter(item => item.status !== "not_evaluated");

    if (itemsToInsert.length > 0) {
      await supabase.from("audit_items").insert(itemsToInsert as any);
    }

    setSaving(false);
    setShowNew(false);
    resetForm();
    toast.success("Auditoria de precaução registrada!");
    fetchRecords();
  };

  const handleDelete = async (id: string) => {
    await supabase.from("audit_items").delete().eq("audit_id", id);
    const { error } = await supabase.from("audits").delete().eq("id", id);
    if (error) toast.error("Erro ao excluir: " + error.message);
    else { toast.success("Registro removido"); fetchRecords(); }
  };

  const openEmail = (record: AuditRecord) => {
    setManagerName("");
    setManagerEmail("");
    setManagerCc("");
    setEmailRecord(record);
  };

  function toggleSelect(id: string) {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleSelectAll() {
    if (selectedIds.size === filteredRecords.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredRecords.map(r => r.id)));
  }
  async function handleBulkSendEmail() {
    const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const to = managerEmail.trim();
    if (!emailRx.test(to)) { toast.error("Informe um e-mail válido."); return; }
    const cc = managerCc.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    if (cc.some(e => !emailRx.test(e))) { toast.error("E-mail de cópia (CC) inválido."); return; }
    const selected = filteredRecords.filter(r => selectedIds.has(r.id));
    setEmailSending(true);
    let ok = 0;
    for (let i = 0; i < selected.length; i++) {
      const r = selected[i];
      setBulkProgress(`Enviando ${i + 1} de ${selected.length}…`);
      try {
        const { error } = await supabase.functions.invoke("send-audit-email", {
          body: {
            to, cc, managerName: managerName.trim(),
            audit: {
              typeLabel: "Precauções e Isolamento",
              date: r.audit_date, sector: r.sector,
              complianceRate: r.compliance_rate,
              compliantItems: r.compliant_items,
              totalItems: r.total_items,
              observations: r.observations,
              items: r.items.map(it => ({ question: it.question, status: it.status, observation: it.observation ?? null })),
            },
            photoPaths: [], photoCaptions: [],
          },
        });
        if (!error) ok++;
      } catch {}
    }
    setEmailSending(false);
    setBulkProgress("");
    setBulkEmailOpen(false);
    setSelectedIds(new Set());
    toast.success(`${ok} de ${selected.length} auditoria(s) enviada(s) com sucesso!`);
  }

  const handleSendEmail = async () => {
    if (!emailRecord) return;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const email = managerEmail.trim();
    if (!emailRegex.test(email)) {
      toast.error("Informe um e-mail válido para o gestor do setor.");
      return;
    }
    const ccEmails = managerCc.split(/[,;\s]+/).map(s => s.trim()).filter(Boolean);
    const invalidCc = ccEmails.filter(e => !emailRegex.test(e));
    if (invalidCc.length > 0) {
      toast.error("E-mail(s) de cópia inválido(s): " + invalidCc.join(", "));
      return;
    }
    setEmailSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-audit-email", {
        body: {
          to: email,
          cc: ccEmails,
          managerName: managerName.trim(),
          audit: {
            typeLabel: "Precauções e Isolamento",
            date: emailRecord.audit_date,
            sector: emailRecord.sector,
            complianceRate: emailRecord.compliance_rate,
            compliantItems: emailRecord.compliant_items,
            totalItems: emailRecord.total_items,
            observations: emailRecord.observations,
            items: emailRecord.items.map(it => ({
              question: it.question,
              status: it.status,
              observation: it.observation,
            })),
          },
          photoPaths: [],
          photoCaptions: [],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Auditoria enviada para ${email}.`);
      setEmailRecord(null);
    } catch (e: any) {
      toast.error("Não foi possível enviar o e-mail: " + (e?.message || "erro desconhecido."));
    } finally {
      setEmailSending(false);
    }
  };

  const getRecordStats = (r: AuditRecord) => {
    let c = 0, nc = 0, na = 0;
    r.items.forEach(i => {
      if (i.status === "compliant") c++;
      else if (i.status === "non_compliant") nc++;
      else if (i.status === "not_applicable") na++;
    });
    const t = c + nc;
    return { c, nc, na, pct: t > 0 ? Math.round((c / t) * 100) : 0 };
  };

  // ─── 5W2H prefill ─────────────────────────────────────────
  const handle5W2H = () => {
    const worst = paretoData[0]?.fullQuestion || "Não conformidades em precaução";
    navigate("/quality/5w2h", {
      state: {
        prefill: {
          title: "Plano de Ação — Precauções e Isolamento",
          what: `Corrigir não conformidades nos protocolos de precaução — principal: ${worst}`,
          why: `Conformidade atual de ${stats.pctConformidade}% (meta: 90%). ${stats.totalNaoConforme} itens não conformes identificados.`,
          where: filterSector !== "all" ? filterSector : (sectorData[0]?.name || "Unidades do hospital"),
          who: "Enfermeira de Controle de Infecção / CCIH",
          when: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          how: "Treinamento da equipe, checagem diária de EPIs, reforço da sinalização e auditoria semanal",
          howMuch: "A definir conforme orçamento de materiais e treinamento",
        },
      },
    });
  };

  if (loading || ctxLoading) return (
    <div className="flex items-center justify-center p-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  const sectorChartH = Math.max(200, sectorData.length * 36);

  const reportData: DashboardReportData = {
    title: "Monitoramento de Precaução e Isolamento",
    subtitle: "Checklist de conformidade — protocolos de precaução e isolamento hospitalar",
    hospitalName,
    goal: "Meta: ≥90%",
    referenceNorm: "ANVISA Nota Técnica 07/2017 · CDC Isolation Precautions",
    context:
      "Este relatório apresenta os indicadores de conformidade com os protocolos de precauções e isolamento hospitalar, incluindo precauções de contato (PC), precauções aéreas (PA), precauções por gotículas (PG) e proteção reversa (PR). A correta aplicação das precauções é fundamental para interromper a cadeia de transmissão de microrganismos, especialmente organismos multirresistentes (MRSA, VRE, Enterobactérias KPC). Meta: ≥90% de conformidade.",
    methodology:
      "Auditoria por checklist padronizado com verificação de: identificação e sinalização do quarto/leito, disponibilidade e uso de EPIs (luvas, avental, máscara), higienização das mãos na entrada/saída, procedimentos de isolamento e deisolamento, e registro em prontuário. Avaliação por setor e turno.",
    kpis: [
      { label: "Conformidade Geral", value: `${stats.pctConformidade}%`, sub: "Meta: 90%", status: stats.pctConformidade >= 90 ? "ok" : stats.pctConformidade >= 75 ? "warning" : "critical" },
      { label: "Total de Auditorias", value: String(stats.totalRecords), sub: "registros no período" },
      { label: "Itens Conformes", value: String(stats.totalConforme), sub: `de ${stats.totalAvaliado} avaliados` },
      { label: "Não Conformidades", value: String(stats.totalNaoConforme), sub: "requerem ação", status: stats.totalNaoConforme === 0 ? "ok" : "critical" },
      { label: "Itens N/A", value: String(stats.totalNA), sub: "não aplicáveis" },
      { label: "Tendência", value: `${stats.delta >= 0 ? "+" : ""}${stats.delta}%`, sub: "vs mês anterior", status: stats.delta >= 0 ? "ok" : "warning" },
    ],
    sectorData: sectorData.map(s => ({ name: s.name, compliance: s.conformidade, audits: 0, nc: 0 })),
    topIssues: paretoData.slice(0, 8).map(p => ({ item: p.fullQuestion, count: p.count })),
    discussion: [
      `A conformidade com os protocolos de precaução e isolamento no período é de ${stats.pctConformidade}%, ${stats.pctConformidade >= 90 ? "dentro da meta de 90%, demonstrando excelente adesão da equipe" : stats.pctConformidade >= 75 ? "em zona de atenção (75–89%), necessitando melhoria" : "abaixo da meta de 90%, representando risco de transmissão de microrganismos"}. Foram realizadas ${stats.totalRecords} auditoria(s) com ${stats.totalConforme} itens conformes e ${stats.totalNaoConforme} não conformidades identificadas.`,
      sectorData.length > 0
        ? `Análise por setor: o setor com menor conformidade é "${[...sectorData].sort((a, b) => a.conformidade - b.conformidade)[0]?.name}" (${[...sectorData].sort((a, b) => a.conformidade - b.conformidade)[0]?.conformidade}%), requerendo atenção imediata. O melhor desempenho é de "${sectorData[0]?.name}" (${sectorData[0]?.conformidade}%).`
        : "Sem dados suficientes para análise setorial no período.",
      paretoData[0]
        ? `Principal não conformidade: "${paretoData[0].fullQuestion}" (${paretoData[0].count} ocorrências). A não adesão a este item representa risco direto de transmissão cruzada de microrganismos, especialmente em unidades com pacientes imunocomprometidos.`
        : "Nenhuma não conformidade recorrente identificada no período avaliado.",
      `Tendência: ${stats.delta >= 0 ? "melhora de +" + stats.delta + "%" : "queda de " + Math.abs(stats.delta) + "%"} em relação ao mês anterior. ${stats.delta < 0 ? "Investigar causas: mudança de equipe, disponibilidade de EPIs, treinamento insuficiente." : "Manter as práticas de sucesso e reforçar treinamento nos setores com menor desempenho."}`,
    ].join("\n"),
    recommendations: [
      stats.pctConformidade < 90
        ? "Implementar programa de educação continuada em precauções e isolamento com foco nos itens não conformes."
        : "Manter o programa de educação continuada como ferramenta de sustentabilidade da conformidade.",
      paretoData[0]
        ? `Corrigir imediatamente a não conformidade "${paretoData[0].fullQuestion}" — item mais frequente de não adesão.`
        : "Fortalecer a cultura de precauções com cartazes e lembretes visuais nos pontos de assistência.",
      "Garantir disponibilidade permanente de EPIs (luvas, aventais, máscaras) nos carros de precaução.",
      "Implementar feedback imediato ao profissional observado com não conformidade — abordagem respeitosa e educativa.",
      "Realizar treinamento específico de precauções para novos colaboradores e equipes com maior rotatividade.",
      "Elaborar Plano de Ação 5W2H para as principais não conformidades com prazo máximo de execução de 15 dias.",
    ],
    filenamePrefix: "precaucoes-isolamento",
  };

  return (
    <div className="space-y-6">

      {/* ─── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Monitoramento de Precaução</h1>
            <p className="text-muted-foreground text-sm">Checklist de conformidade — protocolos de precaução e isolamento</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <DashboardPdfReport data={reportData} />
          <AuditManagerReportButton hospitalId={hospitalId || ""} hospitalName={hospitalName} availableSectors={uniqueSectors} defaultAuditType="precaution" />
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            ins.push(`📊 ${stats.totalRecords} auditorias com ${stats.pctConformidade}% de conformidade.`);
            ins.push(`✅ ${stats.totalConforme} conformes vs ❌ ${stats.totalNaoConforme} não conformes.`);
            if (stats.pctConformidade >= 90) ins.push("🎯 Conformidade ≥ 90% — excelente desempenho!");
            else if (stats.pctConformidade >= 75) ins.push("⚠️ Conformidade entre 75–90% — atenção necessária.");
            else ins.push("🚨 Conformidade < 75% — revisar protocolos urgentemente.");
            if (paretoData[0]) ins.push(`🔍 Principal NC: "${paretoData[0].fullQuestion}"`);
            return ins;
          }} />
          <Button size="sm" onClick={() => { resetForm(); setShowNew(true); }} className="gap-1">
            <Plus className="h-4 w-4" /> Nova Auditoria
          </Button>
        </div>
      </div>

      {/* ─── Filters ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="py-3">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <Select value={filterSector} onValueChange={setFilterSector}>
              <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Setor" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {uniqueSectors.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterMes} onValueChange={setFilterMes}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Mês" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os meses</SelectItem>
                {MESES.map((m, i) => <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterAno} onValueChange={setFilterAno}>
              <SelectTrigger className="h-8 w-28 text-xs"><SelectValue placeholder="Ano" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {uniqueYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterSector !== "all" || filterMes !== "all" || filterAno !== "all") && (
              <Button variant="ghost" size="sm" className="h-8 text-xs"
                onClick={() => { setFilterSector("all"); setFilterMes("all"); setFilterAno("all"); }}>
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── KPI Cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="col-span-2 sm:col-span-1 flex flex-col items-center justify-center p-4 text-center gap-1">
          <Shield className="h-6 w-6 text-primary" />
          <p className={`text-3xl font-bold ${stats.pctConformidade >= 90 ? "text-emerald-600" : stats.pctConformidade >= 75 ? "text-amber-600" : "text-red-600"}`}>
            {stats.pctConformidade}%
          </p>
          <p className="text-xs text-muted-foreground">Conformidade Geral</p>
          {stats.delta !== 0 && (
            <p className={`text-xs flex items-center gap-1 ${stats.delta > 0 ? "text-emerald-600" : "text-red-600"}`}>
              {stats.delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {stats.delta > 0 ? "+" : ""}{stats.delta}% vs mês ant.
            </p>
          )}
        </Card>
        <KpiCard icon={ClipboardCheck} label="Total Auditorias"    value={stats.totalRecords}     color="text-primary" />
        <KpiCard icon={CheckCircle2}  label="Itens Conformes"      value={stats.totalConforme}    color="text-emerald-600" />
        <KpiCard icon={XCircle}       label="Não Conformes"         value={stats.totalNaoConforme} color="text-destructive" />
        <KpiCard icon={MinusCircle}   label="N/A"                   value={stats.totalNA}          color="text-muted-foreground" />
        <KpiCard icon={Activity}      label="Itens Avaliados"       value={stats.totalAvaliado}    color="text-blue-600" />
        <KpiCard
          icon={Shield} label="Precauções Ativas"
          value={dbPrecautions.filter(p => p.is_active).length}
          color="text-violet-600"
          sub={`${dbPrecautions.length} total`}
        />
        <KpiCard
          icon={AlertTriangle} label="Setor Crítico"
          value={setorCritico === "—" ? "OK" : setorCritico.length > 10 ? setorCritico.slice(0, 10) + "…" : setorCritico}
          color={setorCritico === "—" ? "text-emerald-600" : "text-amber-600"}
          sub={setorCritico !== "—" ? "< 90% conformidade" : "Todos na meta"}
        />
      </div>

      {/* ─── OKR Section ─────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Target className="h-4 w-4" /> Objetivos e Resultados-Chave (OKR)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {okrItems.map(o => <OKRCard key={o.title} {...o} />)}
        </div>
      </div>

      {/* ─── Charts Row 1: Trend + Pie ────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Tendência Mensal de Conformidade</CardTitle>
            <ChartActions chartRef={refTrend} chartTitle="Tendência Mensal de Conformidade"
              metaValue={metaTrend} onMetaChange={setMetaTrend} metaUnit="%" />
          </CardHeader>
          <CardContent ref={refTrend}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={monthlyTrend} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradPrec" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(142,71%,45%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(142,71%,45%)" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <RechartsTooltip formatter={(v: any) => [`${v}%`, "Conformidade"]} contentStyle={{ fontSize: 12 }} />
                {metaTrend !== undefined && (
                  <ReferenceLine y={metaTrend} stroke="hsl(0,84%,60%)" strokeDasharray="4 4"
                    label={{ value: `Meta ${metaTrend}%`, fontSize: 10, fill: "hsl(0,84%,60%)", position: "right" }} />
                )}
                <Area type="monotone" dataKey="conformidade" stroke="hsl(142,71%,45%)" strokeWidth={2}
                  fill="url(#gradPrec)" dot={{ r: 3, fill: "hsl(142,71%,45%)" }} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Distribuição por Resultado</CardTitle>
            <ChartActions chartRef={refPie} chartTitle="Distribuição por Resultado" />
          </CardHeader>
          <CardContent ref={refPie} className="flex flex-col items-center">
            {pieData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75}
                      dataKey="value" paddingAngle={3}>
                      {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <RechartsTooltip formatter={(v: any, n: any) => [v, n]} contentStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <p className="text-2xl font-bold -mt-2">{stats.pctConformidade}%</p>
                <p className="text-xs text-muted-foreground">conformidade</p>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {pieData.map(d => (
                    <div key={d.name} className="flex items-center gap-1 text-xs">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}: {d.value}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Sector Chart ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Conformidade por Unidade / Setor</CardTitle>
          <ChartActions chartRef={refSector} chartTitle="Conformidade por Unidade"
            metaValue={metaSector} onMetaChange={setMetaSector} metaUnit="%" />
        </CardHeader>
        <CardContent ref={refSector}>
          {sectorData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
              Sem dados suficientes
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={sectorChartH}>
              <ComposedChart data={sectorData} layout="vertical" margin={{ top: 5, right: 60, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                <RechartsTooltip formatter={(v: any) => [`${v}%`, "Conformidade"]} contentStyle={{ fontSize: 12 }} />
                {metaSector !== undefined && (
                  <ReferenceLine x={metaSector} stroke="hsl(0,84%,60%)" strokeDasharray="4 4"
                    label={{ value: `Meta ${metaSector}%`, fontSize: 10, position: "top", fill: "hsl(0,84%,60%)" }} />
                )}
                <Bar dataKey="conformidade" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {sectorData.map((d, i) => (
                    <Cell key={i}
                      fill={d.conformidade >= 90 ? "hsl(142,71%,45%)" : d.conformidade >= 75 ? "hsl(38,92%,50%)" : "hsl(0,84%,60%)"}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* ─── Charts Row 3: Category Radar + Pareto ────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Conformidade por Categoria</CardTitle>
            <ChartActions chartRef={refCategory} chartTitle="Conformidade por Categoria"
              metaValue={metaCategory} onMetaChange={setMetaCategory} metaUnit="%" />
          </CardHeader>
          <CardContent ref={refCategory}>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={categoryData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="category" tick={{ fontSize: 10 }} />
                <Radar name="Conformidade" dataKey="conformidade"
                  stroke="hsl(220,83%,53%)" fill="hsl(220,83%,53%)" fillOpacity={0.3} strokeWidth={2} />
                <RechartsTooltip formatter={(v: any) => [`${v}%`, "Conformidade"]} contentStyle={{ fontSize: 12 }} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1.5">
              {categoryData.map(c => (
                <div key={c.fullLabel} className="flex items-center gap-2 text-xs">
                  <span className="w-40 shrink-0 text-muted-foreground truncate" title={c.fullLabel}>{c.fullLabel}</span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${c.conformidade}%`,
                      backgroundColor: c.conformidade >= 90 ? "hsl(142,71%,45%)" : c.conformidade >= 75 ? "hsl(38,92%,50%)" : "hsl(0,84%,60%)"
                    }} />
                  </div>
                  <span className="w-10 text-right font-semibold">{c.conformidade}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Análise de Pareto — Não Conformidades</CardTitle>
            <ChartActions chartRef={refPareto} chartTitle="Análise de Pareto — Não Conformidades"
              metaValue={metaPareto} onMetaChange={setMetaPareto} metaUnit="%" />
          </CardHeader>
          <CardContent ref={refPareto}>
            {paretoData.length === 0 ? (
              <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                <p className="text-sm">Nenhuma não conformidade registrada</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={paretoData} margin={{ top: 10, right: 40, left: -10, bottom: 55 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="question" tick={{ fontSize: 8 }} angle={-40} textAnchor="end" interval={0} height={60} />
                    <YAxis yAxisId="left" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-background border rounded-lg p-2 shadow text-xs max-w-[200px]">
                            <p className="font-medium mb-1">{d?.fullQuestion}</p>
                            <p>Ocorrências: <b>{d?.count}</b></p>
                            <p>Acumulado: <b>{d?.acumulado}%</b></p>
                          </div>
                        );
                      }}
                    />
                    {metaPareto !== undefined && (
                      <ReferenceLine yAxisId="right" y={metaPareto} stroke="hsl(38,92%,50%)" strokeDasharray="4 4" />
                    )}
                    <Bar yAxisId="left" dataKey="count" fill="hsl(220,83%,53%)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Line yAxisId="right" type="monotone" dataKey="acumulado"
                      stroke="hsl(0,84%,60%)" strokeWidth={2} dot={{ r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {paretoData.slice(0, 5).map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground w-4 shrink-0">{i + 1}.</span>
                      <span className="flex-1 truncate" title={d.fullQuestion}>{d.fullQuestion}</span>
                      <Badge variant="destructive" className="text-xs px-1.5 py-0 shrink-0">{d.count}×</Badge>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Ishikawa ─────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Análise de Causa Raiz — Diagrama de Ishikawa (6M)</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              Efeito: Não Conformidades em Protocolos de Precaução e Isolamento
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Atualizar análise"
            onClick={() => { setIshikawaKey(k => k + 1); setSelectedCategory(null); }}>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </Button>
        </CardHeader>
        <CardContent ref={refIshikawa} key={ishikawaKey}>
          <div className="overflow-x-auto">
            <svg viewBox="0 0 900 400" className="w-full min-w-[560px]" style={{ fontFamily: "inherit" }}>
              {/* Spine */}
              <line x1="60" y1="200" x2="800" y2="200" stroke="hsl(var(--foreground))" strokeWidth={2.5} />
              {/* Effect box */}
              <rect x="800" y="168" width="94" height="64" rx="6"
                fill="hsl(0,84%,60%)" fillOpacity={0.15} stroke="hsl(0,84%,60%)" strokeWidth={1.5} />
              <text x="847" y="195" textAnchor="middle" fontSize={9} fontWeight={600} fill="hsl(0,84%,60%)">Não</text>
              <text x="847" y="207" textAnchor="middle" fontSize={9} fontWeight={600} fill="hsl(0,84%,60%)">Conformidade</text>
              <text x="847" y="219" textAnchor="middle" fontSize={9} fontWeight={600} fill="hsl(0,84%,60%)">Precaução</text>

              {BONES.map(b => {
                const cat = ISHIKAWA_CATEGORIES.find(c => c.id === b.id)!;
                const isSel = selectedCategory === b.id;
                const isOther = selectedCategory !== null && !isSel;
                const lp = LABEL_POS[b.id];
                return (
                  <g key={b.id}
                    style={{ cursor: "pointer", opacity: isOther ? 0.25 : 1, transition: "opacity 0.2s" }}
                    onClick={() => setSelectedCategory(p => p === b.id ? null : b.id)}>
                    <line x1={b.tip[0]} y1={b.tip[1]} x2={b.junc[0]} y2={b.junc[1]}
                      stroke={cat.color} strokeWidth={isSel ? 2.5 : 1.8} />
                    <circle cx={b.tip[0]} cy={b.tip[1]} r={isSel ? 7 : 5} fill={cat.color} />
                    <text x={lp.x} y={lp.y} textAnchor={lp.anchor as any}
                      fontSize={11} fontWeight={isSel ? 700 : 600} fill={cat.color}>
                      {cat.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {selectedCategory && (() => {
            const cat = ISHIKAWA_CATEGORIES.find(c => c.id === selectedCategory)!;
            return (
              <div className="mt-3 p-3 rounded-lg border-l-4 bg-muted/20" style={{ borderLeftColor: cat.color }}>
                <p className="font-semibold text-sm mb-2" style={{ color: cat.color }}>
                  {cat.label} — Causas Identificadas
                </p>
                <ul className="space-y-1.5">
                  {cat.causes.map((cause, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      {cause}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })()}

          {!selectedCategory && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Clique em uma categoria para ver as causas identificadas
            </p>
          )}
        </CardContent>
      </Card>

      {/* ─── 5W2H CTA ─────────────────────────────────────────── */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">
                  Gerar plano de ação corretiva para precauções
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                  {stats.totalNaoConforme > 0
                    ? `${stats.totalNaoConforme} não conformidade(s) detectadas — registre as ações no formulário 5W2H.`
                    : "Use o formulário 5W2H para planejar melhorias preventivas nos protocolos de precaução."}
                </p>
              </div>
            </div>
            <Button onClick={handle5W2H} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white shrink-0">
              <FileText className="h-4 w-4" /> Gerar Plano 5W2H
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─── Records Table ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico de Auditorias ({filteredRecords.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p>Nenhuma auditoria registrada.</p>
              <p className="text-sm mt-1">Clique em "Nova Auditoria" para iniciar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-md bg-primary/10 border border-primary/20">
                  <span className="text-sm font-medium text-primary">{selectedIds.size} auditoria(s) selecionada(s)</span>
                  <Button size="sm" className="ml-auto gap-1.5" onClick={() => { setManagerName(""); setManagerEmail(""); setManagerCc(""); setBulkEmailOpen(true); }}>
                    <Mail className="h-3.5 w-3.5" /> Enviar selecionadas
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Limpar seleção</Button>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8">
                      <Checkbox
                        checked={filteredRecords.length > 0 && selectedIds.size === filteredRecords.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Conformidade</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map(r => {
                    const rs = getRecordStats(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Checkbox checked={selectedIds.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />
                        </TableCell>
                        <TableCell className="text-sm">{r.audit_date}</TableCell>
                        <TableCell className="text-sm">{r.sector || "—"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{
                                width: `${rs.pct}%`,
                                backgroundColor: rs.pct >= 90 ? "hsl(142,71%,45%)" : rs.pct >= 75 ? "hsl(38,92%,50%)" : "hsl(0,84%,60%)"
                              }} />
                            </div>
                            <span className="text-sm font-semibold">{rs.pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewRecord(r)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-primary" title="Enviar por e-mail" onClick={() => openEmail(r)}>
                              <Mail className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(r.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── NEW AUDIT DIALOG ────────────────────────────────── */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" /> Nova Auditoria de Precaução
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Funcionário *</Label>
              <Input placeholder="Nome completo" value={formData.funcionario}
                onChange={e => setFormData(p => ({ ...p, funcionario: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Unidade *</Label>
              <Select value={formData.unidade} onValueChange={v => setFormData(p => ({ ...p, unidade: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Leito</Label>
              <Input placeholder="Ex: 12A" value={formData.leito}
                onChange={e => setFormData(p => ({ ...p, leito: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" value={formData.date}
                onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Turno *</Label>
              <Select value={formData.turno} onValueChange={v => setFormData(p => ({ ...p, turno: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TURNOS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {CHECKLIST_GROUPS.map(group => (
            <div key={group.label} className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <group.icon className="h-4 w-4 text-primary" /> {group.label}
              </h3>
              {group.items.map(question => (
                <div key={question} className="p-3 rounded-lg border bg-muted/20">
                  <p className="text-sm mb-2">{question}</p>
                  <RadioGroup value={formItems[question]}
                    onValueChange={v => setFormItems(p => ({ ...p, [question]: v as ItemStatus }))}
                    className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="conforme" id={`${question}-c`} />
                      <Label htmlFor={`${question}-c`} className="text-xs font-normal text-green-700 cursor-pointer">Conforme</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="nao_conforme" id={`${question}-nc`} />
                      <Label htmlFor={`${question}-nc`} className="text-xs font-normal text-destructive cursor-pointer">Não Conforme</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <RadioGroupItem value="na" id={`${question}-na`} />
                      <Label htmlFor={`${question}-na`} className="text-xs font-normal text-muted-foreground cursor-pointer">N/A</Label>
                    </div>
                  </RadioGroup>
                </div>
              ))}
            </div>
          ))}

          <Separator />

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea placeholder="Registre observações relevantes..." value={formData.observacoes}
              onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))} rows={3} />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Salvar Auditoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── VIEW RECORD DIALOG ──────────────────────────────── */}
      <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewRecord && (() => {
            const rs = getRecordStats(viewRecord);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Eye className="h-5 w-5 text-primary" /> Detalhes da Auditoria
                  </DialogTitle>
                </DialogHeader>

                <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
                  <div className="text-center">
                    <p className="text-2xl md:text-3xl font-bold" style={{
                      color: rs.pct >= 90 ? "hsl(142,71%,45%)" : rs.pct >= 75 ? "hsl(38,92%,50%)" : "hsl(0,84%,60%)"
                    }}>
                      {rs.pct}%
                    </p>
                    <p className="text-xs text-muted-foreground">Conformidade</p>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div className="flex flex-wrap gap-3 text-sm">
                    <span className="text-green-700">✓ {rs.c} Conforme</span>
                    <span className="text-destructive">✗ {rs.nc} Não Conforme</span>
                    <span className="text-muted-foreground">— {rs.na} N/A</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg border bg-muted/20">
                  <div className="text-center">
                    <Building2 className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Unidade</p>
                    <p className="text-sm font-medium">{viewRecord.sector || "—"}</p>
                  </div>
                  <div className="text-center">
                    <Calendar className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p className="text-sm font-medium">{viewRecord.audit_date}</p>
                  </div>
                  <div className="text-center">
                    <FileText className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Itens</p>
                    <p className="text-sm font-medium">{viewRecord.items.length}</p>
                  </div>
                </div>

                {CHECKLIST_GROUPS.map(group => {
                  const groupItems = viewRecord.items.filter(i => i.category === group.label);
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={group.label} className="space-y-2">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <group.icon className="h-4 w-4 text-primary" /> {group.label}
                      </h3>
                      {groupItems.map(item => (
                        <div key={item.question} className="flex items-center justify-between p-2.5 rounded border bg-muted/10">
                          <span className="text-sm flex-1 mr-3">{item.question}</span>
                          {item.status === "compliant" && (
                            <Badge className="bg-green-100 text-green-800 border-green-300 gap-1 shrink-0">
                              <CheckCircle2 className="h-3 w-3" /> Conforme
                            </Badge>
                          )}
                          {item.status === "non_compliant" && (
                            <Badge variant="destructive" className="gap-1 shrink-0">
                              <XCircle className="h-3 w-3" /> Não Conforme
                            </Badge>
                          )}
                          {item.status === "not_applicable" && (
                            <Badge variant="secondary" className="gap-1 shrink-0">
                              <MinusCircle className="h-3 w-3" /> N/A
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Observações
                  </h3>
                  {viewRecord.observations ? (
                    <div className="p-3 rounded-lg border bg-muted/20 text-sm whitespace-pre-wrap">{viewRecord.observations}</div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma observação registrada.</p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── EMAIL DIALOG ────────────────────────────────────── */}
      <Dialog open={!!emailRecord} onOpenChange={o => { if (!o && !emailSending) setEmailRecord(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Enviar auditoria ao gestor do setor
            </DialogTitle>
            <DialogDescription>
              {emailRecord && (
                <>Auditoria de <strong>Precauções e Isolamento</strong>
                {emailRecord.sector ? <> — unidade <strong>{emailRecord.sector}</strong></> : null}
                {" "}({emailRecord.audit_date}).</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do gestor do setor</Label>
              <Input placeholder="Ex.: Maria Silva" value={managerName}
                onChange={e => setManagerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail do gestor *</Label>
              <Input type="email" placeholder="gestor@hospital.com.br" value={managerEmail}
                onChange={e => setManagerEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !emailSending) handleSendEmail(); }} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Com cópia (CC) — opcional</Label>
              <Input placeholder="email1@hospital.com, email2@hospital.com" value={managerCc}
                onChange={e => setManagerCc(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">Separe vários e-mails por vírgula, ponto e vírgula ou espaço.</p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              O e-mail incluirá o corpo padrão do SCIH e a auditoria completa (itens e não conformidades).
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailRecord(null)} disabled={emailSending}>Cancelar</Button>
            <Button onClick={handleSendEmail} disabled={emailSending} className="gap-2">
              {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── BULK EMAIL DIALOG ──────────────────────────────── */}
      <Dialog open={bulkEmailOpen} onOpenChange={o => { if (!o && !emailSending) setBulkEmailOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary" />
              Enviar {selectedIds.size} auditoria(s) por e-mail
            </DialogTitle>
            <DialogDescription>
              Cada auditoria selecionada será enviada individualmente para o mesmo destinatário.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do gestor do setor</Label>
              <Input placeholder="Ex.: Maria Silva" value={managerName} onChange={e => setManagerName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">E-mail do gestor *</Label>
              <Input type="email" placeholder="gestor@hospital.com.br" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Com cópia (CC) — opcional</Label>
              <Input placeholder="email1@hospital.com, email2@hospital.com" value={managerCc} onChange={e => setManagerCc(e.target.value)} />
              <p className="text-[10px] text-muted-foreground">Separe vários e-mails por vírgula, ponto e vírgula ou espaço.</p>
            </div>
            {emailSending && bulkProgress && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {bulkProgress}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEmailOpen(false)} disabled={emailSending}>Cancelar</Button>
            <Button onClick={handleBulkSendEmail} disabled={emailSending} className="gap-2">
              {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Enviar {selectedIds.size} auditoria(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <div className="text-center p-3 rounded-lg border bg-muted/20">
      <Icon className={`mx-auto h-5 w-5 mb-1 ${color}`} />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function OKRCard({ title, desc, current, target }: {
  title: string; desc: string; current: number; target: number;
}) {
  const pct = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0);
  const status = okrStatus(current, target);
  const cfg = {
    on_track:  { label: "No Prazo",      cls: "text-emerald-700 bg-emerald-50 border-emerald-200", bar: "bg-emerald-500" },
    at_risk:   { label: "Em Risco",      cls: "text-amber-700 bg-amber-50 border-amber-200",       bar: "bg-amber-500" },
    off_track: { label: "Fora da Meta",  cls: "text-red-700 bg-red-50 border-red-200",             bar: "bg-red-500" },
  }[status];
  return (
    <Card className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-sm">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        </div>
        <Badge variant="outline" className={`text-xs shrink-0 ${cfg.cls}`}>{cfg.label}</Badge>
      </div>
      <div className="flex items-end gap-2">
        <p className="text-2xl font-bold">{current}%</p>
        <p className="text-xs text-muted-foreground mb-1">/ meta: {target}%</p>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${cfg.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground text-right">{pct}% da meta atingida</p>
    </Card>
  );
}
