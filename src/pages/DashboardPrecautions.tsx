import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  PieChart, Pie, Cell, ResponsiveContainer
} from "recharts";
import {
  Shield, CheckCircle2, XCircle, MinusCircle, ArrowLeft, Download,
  Plus, Eye, Loader2, ClipboardCheck, Users, Building2, Calendar,
  Clock, FileText, AlertTriangle, Trash2
} from "lucide-react";
import DashboardAIInsights from "@/components/DashboardAIInsights";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

// ─── Checklist Items ─────────────────────────────────────────
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

interface ChecklistRecord {
  id: string;
  date: string;
  funcionario: string;
  unidade: string;
  turno: string;
  observacoes: string;
  items: Record<string, ItemStatus>;
  createdAt: string;
}

const STORAGE_KEY = "irascontrol_precaucoes_audits";

function loadRecords(): ChecklistRecord[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch { return []; }
}

function saveRecords(records: ChecklistRecord[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

const ALL_ITEMS = CHECKLIST_GROUPS.flatMap(g => g.items);

const UNIDADES = [
  "UTI 1", "UTI 2", "UTI 3", "UPO", "UTI Neonatal", "UTI Pediátrica",
  "Isolamento", "Nova Emergência", "Emergência", "Trauma Clínico", "Trauma Cirúrgico",
  "Sala Verde", "Enfermarias Cirúrgicas", "Enfermaria Clínica", "Pediatria Emergência",
  "Enfermaria Pediátrica", "Alojamento Conjunto",
];

const TURNOS = ["Manhã", "Tarde", "Noite"];

// ─── Component ───────────────────────────────────────────────
export default function DashboardPrecautions() {
  const navigate = useNavigate();
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [records, setRecords] = useState<ChecklistRecord[]>(() => loadRecords());
  const [showNew, setShowNew] = useState(false);
  const [viewRecord, setViewRecord] = useState<ChecklistRecord | null>(null);

  // New form state
  const [formData, setFormData] = useState({
    funcionario: "",
    unidade: "",
    turno: "",
    observacoes: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [formItems, setFormItems] = useState<Record<string, ItemStatus>>(() => {
    const init: Record<string, ItemStatus> = {};
    ALL_ITEMS.forEach(q => { init[q] = ""; });
    return init;
  });

  // Also load Supabase precaution data for summary
  const [dbPrecautions, setDbPrecautions] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState(true);

  useEffect(() => {
    if (ctxLoading || !hospitalId) { setDbLoading(false); return; }
    (async () => {
      const { data: patients } = await supabase
        .from("patients").select("id, sector").eq("hospital_id", hospitalId);
      const ids = (patients || []).map(p => p.id);
      if (ids.length > 0) {
        const { data } = await supabase.from("precautions").select("*").in("patient_id", ids);
        setDbPrecautions(data || []);
      }
      setDbLoading(false);
    })();
  }, [hospitalId, ctxLoading]);

  // Computed
  const stats = useMemo(() => {
    const totalRecords = records.length;
    let totalConforme = 0, totalNaoConforme = 0, totalNA = 0, totalAvaliado = 0;
    records.forEach(r => {
      Object.values(r.items).forEach(v => {
        if (v === "conforme") { totalConforme++; totalAvaliado++; }
        else if (v === "nao_conforme") { totalNaoConforme++; totalAvaliado++; }
        else if (v === "na") totalNA++;
      });
    });
    const pctConformidade = totalAvaliado > 0 ? Math.round((totalConforme / totalAvaliado) * 100) : 0;
    return { totalRecords, totalConforme, totalNaoConforme, totalNA, totalAvaliado, pctConformidade };
  }, [records]);

  const pieData = useMemo(() => [
    { name: "Conforme", value: stats.totalConforme, color: "hsl(142, 71%, 45%)" },
    { name: "Não Conforme", value: stats.totalNaoConforme, color: "hsl(0, 84%, 60%)" },
    { name: "N/A", value: stats.totalNA, color: "hsl(220, 9%, 46%)" },
  ].filter(d => d.value > 0), [stats]);

  const resetForm = () => {
    setFormData({ funcionario: "", unidade: "", turno: "", observacoes: "", date: new Date().toISOString().slice(0, 10) });
    const init: Record<string, ItemStatus> = {};
    ALL_ITEMS.forEach(q => { init[q] = ""; });
    setFormItems(init);
  };

  const handleSave = () => {
    if (!formData.funcionario.trim()) { toast.error("Informe o nome do funcionário"); return; }
    if (!formData.unidade) { toast.error("Selecione a unidade"); return; }
    if (!formData.turno) { toast.error("Selecione o turno"); return; }
    // Check at least 1 item answered
    const answered = Object.values(formItems).filter(v => v !== "").length;
    if (answered === 0) { toast.error("Responda ao menos um item do checklist"); return; }

    const newRecord: ChecklistRecord = {
      id: crypto.randomUUID(),
      date: formData.date,
      funcionario: formData.funcionario,
      unidade: formData.unidade,
      turno: formData.turno,
      observacoes: formData.observacoes,
      items: { ...formItems },
      createdAt: new Date().toISOString(),
    };
    const updated = [newRecord, ...records];
    setRecords(updated);
    saveRecords(updated);
    setShowNew(false);
    resetForm();
    toast.success("Auditoria de precaução registrada!");
  };

  const handleDelete = (id: string) => {
    const updated = records.filter(r => r.id !== id);
    setRecords(updated);
    saveRecords(updated);
    toast.success("Registro removido");
  };

  const getRecordStats = (record: ChecklistRecord) => {
    let c = 0, nc = 0, na = 0;
    Object.values(record.items).forEach(v => {
      if (v === "conforme") c++;
      else if (v === "nao_conforme") nc++;
      else if (v === "na") na++;
    });
    const total = c + nc;
    return { c, nc, na, pct: total > 0 ? Math.round((c / total) * 100) : 0 };
  };

  const exportPDF = () => {
    toast.info("Exportação PDF em desenvolvimento");
  };

  if (dbLoading) return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Monitoramento de Precaução</h1>
            <p className="text-muted-foreground text-sm">Checklist de conformidade — protocolos de precaução e isolamento</p>
          </div>
        </div>
        <div className="flex gap-2">
          <DashboardAIInsights generateInsights={() => {
            const ins: string[] = [];
            ins.push(`📊 ${stats.totalRecords} auditorias com ${stats.pctConformidade}% de conformidade geral.`);
            ins.push(`✅ ${stats.totalConforme} itens conformes vs ❌ ${stats.totalNaoConforme} não conformes.`);
            if (stats.pctConformidade >= 80) ins.push(`🎯 Conformidade acima de 80% — bom desempenho!`);
            else ins.push(`⚠️ Conformidade abaixo de 80% — revisar protocolos de precaução.`);
            ins.push(`📋 ${stats.totalAvaliado} itens avaliados, ${stats.totalNA} não aplicáveis.`);
            return ins;
          }} />
          <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1">
            <Download className="h-4 w-4" /> Exportar PDF
          </Button>
          <Button size="sm" onClick={() => { resetForm(); setShowNew(true); }} className="gap-1">
            <Plus className="h-4 w-4" /> Nova Auditoria
          </Button>
        </div>
      </div>

      {/* KPI + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance donut */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Conformidade Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                    {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">Sem dados</div>
            )}
            <p className="text-3xl font-bold mt-2">{stats.pctConformidade}%</p>
            <p className="text-xs text-muted-foreground">de conformidade</p>
          </CardContent>
        </Card>

        {/* Volume cards */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumo de Avaliações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={ClipboardCheck} label="Auditorias" value={stats.totalRecords} color="text-primary" />
              <StatCard icon={CheckCircle2} label="Conforme" value={stats.totalConforme} color="text-green-600" />
              <StatCard icon={XCircle} label="Não Conforme" value={stats.totalNaoConforme} color="text-destructive" />
              <StatCard icon={MinusCircle} label="N/A" value={stats.totalNA} color="text-muted-foreground" />
            </div>

            {/* Active DB precautions summary */}
            {dbPrecautions.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Precauções ativas no sistema (banco de dados)</p>
                <div className="flex gap-3">
                  <Badge variant="outline" className="gap-1"><Shield className="h-3 w-3" /> {dbPrecautions.filter(p => p.is_active).length} ativas</Badge>
                  <Badge variant="secondary">{dbPrecautions.length} total registros</Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Records list */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Histórico de Auditorias ({records.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardCheck className="mx-auto h-10 w-10 mb-3 opacity-50" />
              <p>Nenhuma auditoria registrada.</p>
              <p className="text-sm mt-1">Clique em "Nova Auditoria" para iniciar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Conformidade</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map(r => {
                    const rs = getRecordStats(r);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm">{r.date}</TableCell>
                        <TableCell className="font-medium text-sm">{r.funcionario}</TableCell>
                        <TableCell className="text-sm">{r.unidade}</TableCell>
                        <TableCell><Badge variant="outline">{r.turno}</Badge></TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${rs.pct}%`,
                                  backgroundColor: rs.pct >= 80 ? "hsl(142, 71%, 45%)" : rs.pct >= 50 ? "hsl(38, 92%, 50%)" : "hsl(0, 84%, 60%)"
                                }}
                              />
                            </div>
                            <span className="text-sm font-semibold">{rs.pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewRecord(r)}>
                              <Eye className="h-4 w-4" />
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

      {/* ─── NEW AUDIT DIALOG ─────────────────────────────── */}
      <Dialog open={showNew} onOpenChange={setShowNew}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-primary" /> Nova Auditoria de Precaução
            </DialogTitle>
          </DialogHeader>

          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Funcionário *</Label>
              <Input placeholder="Nome completo" value={formData.funcionario} onChange={e => setFormData(p => ({ ...p, funcionario: e.target.value }))} />
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
              <Label>Data</Label>
              <Input type="date" value={formData.date} onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
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

          {/* Checklist groups */}
          {CHECKLIST_GROUPS.map(group => (
            <div key={group.label} className="space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <group.icon className="h-4 w-4 text-primary" /> {group.label}
              </h3>
              {group.items.map(question => (
                <div key={question} className="p-3 rounded-lg border bg-muted/20">
                  <p className="text-sm mb-2">{question}</p>
                  <RadioGroup
                    value={formItems[question]}
                    onValueChange={v => setFormItems(p => ({ ...p, [question]: v as ItemStatus }))}
                    className="flex gap-4"
                  >
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

          {/* Observations */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Registre observações relevantes..."
              value={formData.observacoes}
              onChange={e => setFormData(p => ({ ...p, observacoes: e.target.value }))}
              rows={3}
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="gap-1">
              <CheckCircle2 className="h-4 w-4" /> Salvar Auditoria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── VIEW RECORD DIALOG ───────────────────────────── */}
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

                {/* Compliance summary */}
                <div className="flex items-center gap-4 p-4 rounded-lg border bg-muted/30">
                  <div className="text-center">
                    <p className="text-3xl font-bold" style={{ color: rs.pct >= 80 ? "hsl(142,71%,45%)" : rs.pct >= 50 ? "hsl(38,92%,50%)" : "hsl(0,84%,60%)" }}>
                      {rs.pct}%
                    </p>
                    <p className="text-xs text-muted-foreground">Conformidade</p>
                  </div>
                  <Separator orientation="vertical" className="h-12" />
                  <div className="flex gap-4 text-sm">
                    <span className="text-green-700">✓ {rs.c} Conforme</span>
                    <span className="text-destructive">✗ {rs.nc} Não Conforme</span>
                    <span className="text-muted-foreground">— {rs.na} N/A</span>
                  </div>
                </div>

                {/* Metadata panel */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-lg border bg-muted/20">
                  <div className="text-center">
                    <Users className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Funcionário</p>
                    <p className="text-sm font-medium">{viewRecord.funcionario}</p>
                  </div>
                  <div className="text-center">
                    <Building2 className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Unidade</p>
                    <p className="text-sm font-medium">{viewRecord.unidade}</p>
                  </div>
                  <div className="text-center">
                    <Calendar className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Data</p>
                    <p className="text-sm font-medium">{viewRecord.date}</p>
                  </div>
                  <div className="text-center">
                    <Clock className="mx-auto h-4 w-4 text-muted-foreground mb-1" />
                    <p className="text-xs text-muted-foreground">Turno</p>
                    <p className="text-sm font-medium">{viewRecord.turno}</p>
                  </div>
                </div>

                {/* Checklist results */}
                {CHECKLIST_GROUPS.map(group => (
                  <div key={group.label} className="space-y-2">
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      <group.icon className="h-4 w-4 text-primary" /> {group.label}
                    </h3>
                    {group.items.map(q => {
                      const val = viewRecord.items[q];
                      return (
                        <div key={q} className="flex items-center justify-between p-2.5 rounded border bg-muted/10">
                          <span className="text-sm flex-1">{q}</span>
                          {val === "conforme" && <Badge className="bg-green-100 text-green-800 border-green-300 gap-1"><CheckCircle2 className="h-3 w-3" /> Conforme</Badge>}
                          {val === "nao_conforme" && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Não Conforme</Badge>}
                          {val === "na" && <Badge variant="secondary" className="gap-1"><MinusCircle className="h-3 w-3" /> N/A</Badge>}
                          {!val && <Badge variant="outline" className="text-muted-foreground">Não avaliado</Badge>}
                        </div>
                      );
                    })}
                  </div>
                ))}

                {/* Observations */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Observações
                  </h3>
                  {viewRecord.observacoes ? (
                    <div className="p-3 rounded-lg border bg-muted/20 text-sm whitespace-pre-wrap">{viewRecord.observacoes}</div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Nenhuma observação registrada.</p>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="text-center p-3 rounded-lg border bg-muted/20">
      <Icon className={`mx-auto h-5 w-5 mb-1 ${color}`} />
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
