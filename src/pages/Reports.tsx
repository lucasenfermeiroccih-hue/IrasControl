import { useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  FileText, Plus, Download, Sparkles, TrendingUp, Filter,
  CalendarIcon, Loader2, AlertTriangle, Bug, X, ChevronDown, Check
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
} from "recharts";

// ── Types ───────────────────────────────────────────────────────────────
interface MicroRecord {
  id: string;
  dataExame: string;
  prontuario: string;
  setor: string;
  tipoExame: string;
  microorganismo: string;
  dataRegistro: string;
}

// ── Constants ───────────────────────────────────────────────────────────
const TIPOS_EXAME = [
  "Hemocultura", "Urinocultura", "Swab", "Secreção Traqueal",
  "Secreção", "Fragmento Ósseo", "Liquor", "Aspirado Traqueal",
  "Líquidos", "Outros",
];

const MICROORGANISMOS = [
  "Acinetobacter baumannii", "ESBL (Beta-lactamase)", "ERC (Enterobactéria Resistente)",
  "KPC (Klebsiella)", "MRSA", "VRE/ERV", "Candida spp.", "Providencia stuartii",
  "Pseudomonas aeruginosa", "Staphylococcus aureus", "Enterococcus faecalis",
  "Escherichia coli", "Serratia marcescens", "Proteus mirabilis",
];

const SETORES = [
  "UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica",
  "UPO", "Trauma Clínico", "Clínica Médica", "Clínica Cirúrgica", "Contêiner",
  "Pediatria", "Pediatria (Enfermaria)", "Alojamento Conjunto",
];

// ── Mock data ───────────────────────────────────────────────────────────
const generateMockRecords = (): MicroRecord[] => {
  const records: MicroRecord[] = [];
  const now = new Date();
  for (let i = 0; i < 35; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - Math.floor(Math.random() * 180));
    records.push({
      id: crypto.randomUUID(),
      dataExame: format(d, "yyyy-MM-dd"),
      prontuario: String(100000 + Math.floor(Math.random() * 900000)),
      setor: SETORES[Math.floor(Math.random() * SETORES.length)],
      tipoExame: TIPOS_EXAME[Math.floor(Math.random() * TIPOS_EXAME.length)],
      microorganismo: MICROORGANISMOS[Math.floor(Math.random() * MICROORGANISMOS.length)],
      dataRegistro: format(d, "yyyy-MM-dd"),
    });
  }
  return records.sort((a, b) => b.dataExame.localeCompare(a.dataExame));
};

const MOCK_TREND = [
  { mes: "Out", KPC: 4, MRSA: 3, ESBL: 5, Acinetobacter: 2, VRE: 1 },
  { mes: "Nov", KPC: 6, MRSA: 2, ESBL: 4, Acinetobacter: 3, VRE: 2 },
  { mes: "Dez", KPC: 5, MRSA: 4, ESBL: 6, Acinetobacter: 2, VRE: 1 },
  { mes: "Jan", KPC: 7, MRSA: 3, ESBL: 5, Acinetobacter: 4, VRE: 3 },
  { mes: "Fev", KPC: 8, MRSA: 5, ESBL: 7, Acinetobacter: 3, VRE: 2 },
  { mes: "Mar", KPC: 6, MRSA: 4, ESBL: 8, Acinetobacter: 5, VRE: 4 },
];

const MOCK_AI_INSIGHTS = [
  { tipo: "alerta", texto: "Aumento de 33% em isolados de KPC na UTI Adulto nos últimos 60 dias. Recomenda-se revisão dos protocolos de precaução de contato." },
  { tipo: "tendencia", texto: "ESBL apresenta tendência ascendente em urinoculturas da Clínica Médica. Considerar ajuste empírico de antibioticoterapia." },
  { tipo: "sugestao", texto: "Taxa de Acinetobacter baumannii MDR estável. Manter vigilância ativa e descontaminação ambiental programada." },
  { tipo: "alerta", texto: "Primeiro isolado de VRE no Centro Cirúrgico detectado. Iniciar rastreamento de contactantes imediatamente." },
  { tipo: "sugestao", texto: "Redução de 15% em hemoculturas positivas para MRSA após implementação de banho de clorexidina — manter protocolo." },
];

// ── Component ───────────────────────────────────────────────────────────
const Reports = () => {
  const [records, setRecords] = useState<MicroRecord[]>(generateMockRecords);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    dataExame: "", prontuario: "", setor: "", tipoExame: "", microorganismo: "",
  });

  // Filters
  const [filterMicros, setFilterMicros] = useState<string[]>([]);
  const [filterDateFrom, setFilterDateFrom] = useState<Date | undefined>();
  const [filterDateTo, setFilterDateTo] = useState<Date | undefined>();
  const [filterMes, setFilterMes] = useState<string>("all");
  const [filterAno, setFilterAno] = useState<string>("all");
  const [filterSetor, setFilterSetor] = useState<string>("all");
  const [microPopoverOpen, setMicroPopoverOpen] = useState(false);

  const MESES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  const currentYear = new Date().getFullYear();
  const ANOS = [String(currentYear), String(currentYear - 1), String(currentYear - 2)];

  const toggleMicro = (m: string) => {
    setFilterMicros((prev) => prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]);
  };
  const toggleAllMicros = () => {
    setFilterMicros((prev) => prev.length === MICROORGANISMOS.length ? [] : [...MICROORGANISMOS]);
  };

  // AI
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsights, setAiInsights] = useState(MOCK_AI_INSIGHTS);
  const [showAi, setShowAi] = useState(true);

  // ── Filtered records ──
  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterMicros.length > 0 && !filterMicros.includes(r.microorganismo)) return false;
      if (filterDateFrom && r.dataExame < format(filterDateFrom, "yyyy-MM-dd")) return false;
      if (filterDateTo && r.dataExame > format(filterDateTo, "yyyy-MM-dd")) return false;
      if (filterSetor !== "all" && r.setor !== filterSetor) return false;
      if (filterMes !== "all") {
        const month = new Date(r.dataExame).getMonth();
        if (MESES[month] !== filterMes) return false;
      }
      if (filterAno !== "all") {
        const year = String(new Date(r.dataExame).getFullYear());
        if (year !== filterAno) return false;
      }
      return true;
    });
  }, [records, filterMicros, filterDateFrom, filterDateTo, filterSetor, filterMes, filterAno]);

  // ── Distribution for bar chart ──
  const distribution = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((r) => {
      const short = r.microorganismo.split(" ")[0];
      map[short] = (map[short] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [filtered]);

  // ── Handlers ──
  const handleSaveRecord = () => {
    const { dataExame, prontuario, setor, tipoExame, microorganismo } = formData;
    if (!dataExame || !prontuario || !setor || !tipoExame || !microorganismo) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    const novo: MicroRecord = {
      id: crypto.randomUUID(),
      ...formData,
      dataRegistro: format(new Date(), "yyyy-MM-dd"),
    };
    setRecords((prev) => [novo, ...prev]);
    setFormData({ dataExame: "", prontuario: "", setor: "", tipoExame: "", microorganismo: "" });
    setFormOpen(false);
    toast.success("Registro salvo com sucesso!");
  };

  const handleGenerateAi = () => {
    setAiLoading(true);
    setShowAi(true);
    setTimeout(() => {
      setAiInsights([...MOCK_AI_INSIGHTS]);
      setAiLoading(false);
      toast.success("Insights de IA gerados com sucesso!");
    }, 2000);
  };

  const handleExportCSV = () => {
    const header = "Data Exame,Prontuário,Setor,Tipo Exame,Microorganismo,Data Registro\n";
    const rows = filtered.map((r) =>
      `${r.dataExame},${r.prontuario},${r.setor},${r.tipoExame},${r.microorganismo},${r.dataRegistro}`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-microorganismos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório CSV exportado!");
  };

  const insightIcon = (tipo: string) => {
    if (tipo === "alerta") return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (tipo === "tendencia") return <TrendingUp className="h-4 w-4 text-warning" />;
    return <Sparkles className="h-4 w-4 text-primary" />;
  };

  const insightBadge = (tipo: string) => {
    if (tipo === "alerta") return <Badge variant="destructive">Alerta</Badge>;
    if (tipo === "tendencia") return <Badge className="bg-warning/20 text-warning border-warning/30">Tendência</Badge>;
    return <Badge variant="secondary">Sugestão</Badge>;
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bug className="h-6 w-6 text-primary" />
            Monitoramento de Microorganismos
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Relatórios, análises e insights preditivos de resistência antimicrobiana
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* New record dialog */}
          <Dialog open={formOpen} onOpenChange={setFormOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> Novo Registro</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Novo Registro de Microorganismo</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data do Exame *</Label>
                    <Input type="date" value={formData.dataExame}
                      onChange={(e) => setFormData((p) => ({ ...p, dataExame: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Nº Prontuário *</Label>
                    <Input placeholder="Ex: 123456" value={formData.prontuario}
                      onChange={(e) => setFormData((p) => ({ ...p, prontuario: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Setor *</Label>
                  <Select value={formData.setor} onValueChange={(v) => setFormData((p) => ({ ...p, setor: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione o setor" /></SelectTrigger>
                    <SelectContent>
                      {SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Exame *</Label>
                  <Select value={formData.tipoExame} onValueChange={(v) => setFormData((p) => ({ ...p, tipoExame: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {TIPOS_EXAME.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Microorganismo *</Label>
                  <Select value={formData.microorganismo} onValueChange={(v) => setFormData((p) => ({ ...p, microorganismo: v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione o patógeno" /></SelectTrigger>
                    <SelectContent>
                      {MICROORGANISMOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSaveRecord}>Salvar Registro</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={handleGenerateAi} disabled={aiLoading}>
            {aiLoading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Sparkles className="h-4 w-4 mr-1" />}
            Gerar Insights IA
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-1" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="h-4 w-4" /> Filtros
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
              {/* Multi-select Microorganismo */}
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label className="text-xs">Microorganismo</Label>
                <Popover open={microPopoverOpen} onOpenChange={setMicroPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-between text-left font-normal h-9 text-xs">
                      <span className="truncate">
                        {filterMicros.length === 0 ? "Todos" : filterMicros.length === MICROORGANISMOS.length ? "Todos selecionados" : `${filterMicros.length} selecionado(s)`}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[260px] p-0" align="start">
                    <div className="max-h-[300px] overflow-auto p-2 space-y-1">
                      <div
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer"
                        onClick={toggleAllMicros}
                      >
                        <Checkbox
                          checked={filterMicros.length === MICROORGANISMOS.length}
                          onCheckedChange={toggleAllMicros}
                          className="h-3.5 w-3.5"
                        />
                        <span className="text-xs font-medium">Selecionar todos</span>
                      </div>
                      <Separator className="my-1" />
                      {MICROORGANISMOS.map((m) => (
                        <div
                          key={m}
                          className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer"
                          onClick={() => toggleMicro(m)}
                        >
                          <Checkbox
                            checked={filterMicros.includes(m)}
                            onCheckedChange={() => toggleMicro(m)}
                            className="h-3.5 w-3.5"
                          />
                          <span className="text-xs">{m}</span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Mês */}
              <div className="space-y-1">
                <Label className="text-xs">Mês</Label>
                <Select value={filterMes} onValueChange={setFilterMes}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {MESES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Ano */}
              <div className="space-y-1">
                <Label className="text-xs">Ano</Label>
                <Select value={filterAno} onValueChange={setFilterAno}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {ANOS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Setor */}
              <div className="space-y-1">
                <Label className="text-xs">Setor</Label>
                <Select value={filterSetor} onValueChange={setFilterSetor}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {SETORES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Data Início */}
              <div className="space-y-1">
                <Label className="text-xs">Data Início</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-xs", !filterDateFrom && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {filterDateFrom ? format(filterDateFrom, "dd/MM/yy") : "Início"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={filterDateFrom} onSelect={setFilterDateFrom} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Data Fim */}
              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal h-9 text-xs", !filterDateTo && "text-muted-foreground")}>
                      <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                      {filterDateTo ? format(filterDateTo, "dd/MM/yy") : "Fim"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={filterDateTo} onSelect={setFilterDateTo} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Clear filters */}
            {(filterMicros.length > 0 || filterDateFrom || filterDateTo || filterMes !== "all" || filterAno !== "all" || filterSetor !== "all") && (
              <Button variant="ghost" size="sm" className="self-start" onClick={() => {
                setFilterMicros([]);
                setFilterDateFrom(undefined);
                setFilterDateTo(undefined);
                setFilterMes("all");
                setFilterAno("all");
                setFilterSetor("all");
              }}>
                <X className="h-4 w-4 mr-1" /> Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* KPI row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Total Registros</p>
            <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Microorganismos Distintos</p>
            <p className="text-2xl font-bold text-foreground">
              {new Set(filtered.map((r) => r.microorganismo)).size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Setores Afetados</p>
            <p className="text-2xl font-bold text-foreground">
              {new Set(filtered.map((r) => r.setor)).size}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground">Último Registro</p>
            <p className="text-2xl font-bold text-foreground">
              {filtered[0] ? format(new Date(filtered[0].dataExame), "dd/MM", { locale: ptBR }) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" /> Tendências de Resistência (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={MOCK_TREND}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="mes" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="KPC" stroke="hsl(var(--destructive))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="MRSA" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="ESBL" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="Acinetobacter" stroke="hsl(var(--accent-foreground))" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="VRE" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Distribuição por Microorganismo</CardTitle>
            <CardDescription>Top 8 — dados filtrados</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={distribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" width={110} className="text-xs" />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      {showAi && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Painel de Sugestões da IA
            </CardTitle>
            <CardDescription>Recomendações geradas com base nos dados de vigilância</CardDescription>
          </CardHeader>
          <CardContent>
            {aiLoading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" /> Analisando padrões de resistência…
              </div>
            ) : (
              <div className="space-y-3">
                {aiInsights.map((ins, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-lg border p-3 bg-muted/30">
                    {insightIcon(ins.tipo)}
                    <div className="flex-1 space-y-1">
                      <div>{insightBadge(ins.tipo)}</div>
                      <p className="text-sm text-foreground">{ins.texto}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Dados Consolidados
          </CardTitle>
          <CardDescription>{filtered.length} registros encontrados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto max-h-[420px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data Exame</TableHead>
                  <TableHead>Prontuário</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Tipo Exame</TableHead>
                  <TableHead>Microorganismo</TableHead>
                  <TableHead>Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 50).map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{format(new Date(r.dataExame), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="font-mono">{r.prontuario}</TableCell>
                    <TableCell>{r.setor}</TableCell>
                    <TableCell><Badge variant="outline">{r.tipoExame}</Badge></TableCell>
                    <TableCell className="font-medium">{r.microorganismo}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{format(new Date(r.dataRegistro), "dd/MM/yyyy")}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
