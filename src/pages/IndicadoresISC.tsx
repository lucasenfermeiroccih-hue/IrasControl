import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Save, RotateCcw } from "lucide-react";
import {
  getLastISCRegistro,
  saveISCRegistro,
  generateISCId,
  type ISCRegistro,
} from "@/lib/isc-storage";
import ISCHistory from "@/components/ISCHistory";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const clinicas = ["Cirurgia Geral", "Cirurgia Vascular", "Neurocirurgia", "Ortopedia", "Ginecologia", "Cesariana"] as const;
type Clinica = typeof clinicas[number];

const sitioOptions = ["ISC superficial", "ISC profunda", "ISC de cavidade/órgão"];

interface ClinicaData {
  totalCirurgias: number;
  contatosAtendidos: number;
  reinternacoes: number;
  iscConfirmada: number;
  sitio: string;
}

interface PartoCirurgicoData {
  numISCCesariana: number;
  numTotalCesarianas: number;
}

interface ProcedimentoExtra {
  numerador: number;
  denominador: number;
}

type ProcedimentosExtras = Record<string, ProcedimentoExtra>;

const procedimentosExtrasConfig = [
  {
    key: "implanteMamario",
    titulo: "Implante Mamário",
    labelNum: "Nº de ISC de implante mamário no período (Numerador)",
    descNum: "Informar o número de infecções de sítio cirúrgico de implante mamário no período.",
    labelDen: "Nº total de cirurgias com implante mamário (Denominador)",
    descDen: "Informar o número total de cirurgias com implante mamário realizadas no serviço de saúde, no mês de vigilância.",
  },
  {
    key: "artroplastiaJoelho",
    titulo: "Artroplastia de Joelho Primária",
    labelNum: "Nº de ISC - artroplastia de joelho primária no período (Numerador)",
    descNum: "Informar o número de infecções de sítio cirúrgico associado a artroplastia de joelho primária que ocorreram no mês de vigilância.",
    labelDen: "Nº total de artroplastias de joelho primárias (Denominador)",
    descDen: "Informar o número total de cirurgias de artroplastia de joelho primária realizadas no serviço de saúde, no mês de vigilância.",
  },
  {
    key: "artroplastiaQuadril",
    titulo: "Artroplastia Total de Quadril Primária",
    labelNum: "Nº de ISC - artroplastia total de quadril primária no período (Numerador)",
    descNum: "Informar o número de infecções de sítio cirúrgico associado a artroplastia total de quadril primária que ocorreram no mês de vigilância.",
    labelDen: "Nº total de artroplastias totais de quadril primárias (Denominador)",
    descDen: "Informar o número total de cirurgias de artroplastia total de quadril primária realizadas no serviço de saúde, no mês de vigilância.",
  },
  {
    key: "cirurgiaCardiaca",
    titulo: "Cirurgia Cardíaca",
    labelNum: "Nº de infecções de órgão/cavidade pós revascularização do miocárdio (Numerador)",
    descNum: "Informar o número de infecções de órgão/cavidade pós revascularização do miocárdio que ocorreram no mês de vigilância.",
    labelDen: "Nº total de revascularizações do miocárdio (Denominador)",
    descDen: "Informar o número total de revascularizações do miocárdio realizadas no serviço de saúde, no mês de vigilância.",
  },
  {
    key: "cirurgiaNeurologica",
    titulo: "Cirurgia Neurológica",
    labelNum: "Nº de infecções de órgão/cavidade pós derivações internas neurológicas (exceto DVE/DLE) (Numerador)",
    descNum: "Informar o número de infecções de órgão/cavidade pós cirurgia de derivações internas neurológicas (exceto DVE/DLE) que ocorreram no mês de vigilância.",
    labelDen: "Nº total de cirurgias derivações internas neurológicas (exceto DVE/DLE) (Denominador)",
    descDen: "Informar o número total de cirurgias derivações internas neurológicas (exceto DVE/DLE) realizadas no serviço de saúde, no mês de vigilância.",
  },
] as const;

const emptyProcedimentoExtra = (): ProcedimentoExtra => ({ numerador: 0, denominador: 0 });

const createInitialExtras = (): ProcedimentosExtras =>
  Object.fromEntries(procedimentosExtrasConfig.map((p) => [p.key, emptyProcedimentoExtra()]));

const emptyClinicaData = (): ClinicaData => ({
  totalCirurgias: 0,
  contatosAtendidos: 0,
  reinternacoes: 0,
  iscConfirmada: 0,
  sitio: "",
});

const emptyPartoCirurgico = (): PartoCirurgicoData => ({
  numISCCesariana: 0,
  numTotalCesarianas: 0,
});

type FormData = Record<Clinica, ClinicaData>;

const createInitialData = (): FormData => ({
  "Cirurgia Geral": emptyClinicaData(),
  "Cirurgia Vascular": emptyClinicaData(),
  "Neurocirurgia": emptyClinicaData(),
  "Ortopedia": emptyClinicaData(),
  "Ginecologia": emptyClinicaData(),
  "Cesariana": emptyClinicaData(),
});

const calcTaxa = (num: number, den: number) =>
  den > 0 ? ((num / den) * 100).toFixed(1) : "0.0";

const indicadorRows = [
  { key: "totalCirurgias", label: "Total de Cirurgias", type: "number" },
  { key: "contatosAtendidos", label: "Contatos Telefônicos Atendidos", type: "number" },
  { key: "taxaResposta", label: "Taxa de Resposta (%)", type: "calculated" },
  { key: "reinternacoes", label: "Reinternações", type: "number" },
  { key: "iscConfirmada", label: "ISC Confirmada", type: "number" },
  { key: "sitio", label: "Sítio", type: "select" },
  { key: "taxaISC", label: "Taxa de ISC (%)", type: "calculated" },
] as const;

function registroToForm(reg: ISCRegistro): { nome: string; dataVigilancia: string; mes: string; ano: string; data: FormData } {
  const data = createInitialData();
  for (const c of clinicas) {
    if (reg.indicadores[c]) {
      data[c] = { ...emptyClinicaData(), ...reg.indicadores[c] };
    }
  }
  return {
    nome: reg.nomeProfissional,
    dataVigilancia: reg.dataVigilancia,
    mes: reg.mes,
    ano: reg.ano,
    data,
  };
}

export default function IndicadoresISC() {
  const { hospitalId, userId } = useHospitalContext();
  const [registroId, setRegistroId] = useState<string>(() => generateISCId());
  const [hospitalTipo, setHospitalTipo] = useState("");
  const [nome, setNome] = useState("");
  const [dataVigilancia, setDataVigilancia] = useState("");
  const [mesVigilancia, setMesVigilancia] = useState("");
  const [anoVigilancia, setAnoVigilancia] = useState(new Date().getFullYear().toString());
  const [data, setData] = useState<FormData>(createInitialData);
  const [partoCirurgico, setPartoCirurgico] = useState<PartoCirurgicoData>(emptyPartoCirurgico);
  const [procedimentosExtras, setProcedimentosExtras] = useState<ProcedimentosExtras>(createInitialExtras);

  const isMaternidade = hospitalTipo === "Maternidade";
  const isHospitalOlhos = hospitalTipo === "Hospital dos olhos";
  const showExtras = !isMaternidade && !isHospitalOlhos && hospitalTipo !== "";
  const clinicasVisiveis = isMaternidade
    ? (["Cesariana"] as Clinica[])
    : (clinicas.filter((c) => c !== "Cesariana") as Clinica[]);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [pendingRegistro, setPendingRegistro] = useState<ISCRegistro | null>(null);

  useEffect(() => {
    const dismissed = sessionStorage.getItem("isc_resume_dismissed");
    if (dismissed) return;
    const last = getLastISCRegistro();
    if (last) {
      setPendingRegistro(last);
      setShowResumeDialog(true);
    }
  }, []);

  const loadRegistro = (reg: ISCRegistro) => {
    const restored = registroToForm(reg);
    setRegistroId(reg.id);
    setNome(restored.nome);
    setDataVigilancia(restored.dataVigilancia);
    setMesVigilancia(restored.mes);
    setAnoVigilancia(restored.ano);
    setData(restored.data);
  };

  const handleResumeEdit = () => {
    if (pendingRegistro) {
      loadRegistro(pendingRegistro);
      toast.info("Registro anterior carregado para edição.");
    }
    sessionStorage.setItem("isc_resume_dismissed", "1");
    setShowResumeDialog(false);
    setPendingRegistro(null);
  };

  const handleNewRecord = () => {
    setRegistroId(generateISCId());
    sessionStorage.setItem("isc_resume_dismissed", "1");
    setShowResumeDialog(false);
    setPendingRegistro(null);
  };

  const updateField = (clinica: Clinica, field: keyof ClinicaData, value: number | string) => {
    setData((prev) => ({
      ...prev,
      [clinica]: { ...prev[clinica], [field]: value },
    }));
  };

  const totals = useMemo(() => {
    const t: ClinicaData = emptyClinicaData();
    for (const c of clinicasVisiveis) {
      const d = data[c] || emptyClinicaData();
      t.totalCirurgias += d.totalCirurgias;
      t.contatosAtendidos += d.contatosAtendidos;
      t.reinternacoes += d.reinternacoes;
      t.iscConfirmada += d.iscConfirmada;
    }
    return t;
  }, [data, clinicasVisiveis]);

  const taxaISCCesariana = partoCirurgico.numTotalCesarianas > 0
    ? ((partoCirurgico.numISCCesariana / partoCirurgico.numTotalCesarianas) * 100).toFixed(1)
    : "0.0";

  const handleSalvar = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do profissional.");
      return;
    }
    if (!hospitalId || !userId) {
      toast.error("Hospital ou usuário não identificado.");
      return;
    }

    // Save to localStorage (legacy)
    const registro: ISCRegistro = {
      id: registroId,
      nomeProfissional: nome.trim(),
      dataVigilancia,
      mes: mesVigilancia,
      ano: anoVigilancia,
      indicadores: { ...data },
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
    saveISCRegistro(registro);

    // Save to Supabase
    try {
      const { data: iscRecord, error: recError } = await supabase
        .from("isc_records")
        .insert({
          hospital_id: hospitalId,
          user_id: userId,
          nome_profissional: nome.trim(),
          data_vigilancia: dataVigilancia || new Date().toISOString().split("T")[0],
          mes: mesVigilancia,
          ano: anoVigilancia,
        })
        .select("id")
        .single();

      if (recError) throw recError;

      // Insert indicators for each clinica with data
      const indicators = clinicasVisiveis
        .filter((c) => {
          const d = data[c];
          return d && (d.totalCirurgias > 0 || d.iscConfirmada > 0 || d.contatosAtendidos > 0 || d.reinternacoes > 0);
        })
        .map((c) => ({
          isc_record_id: iscRecord.id,
          procedimento: c,
          total_cirurgias: data[c].totalCirurgias,
          contatos_atendidos: data[c].contatosAtendidos,
          reinternacoes: data[c].reinternacoes,
          isc_confirmada: data[c].iscConfirmada,
          sitio: data[c].sitio || null,
        }));

      if (indicators.length > 0) {
        const { error: indError } = await supabase
          .from("isc_record_indicators")
          .insert(indicators);
        if (indError) throw indError;
      }

      toast.success("Dados salvos com sucesso!");

      // Reset form for new entry
      setRegistroId(generateISCId());
      setHospitalTipo("");
      setNome("");
      setDataVigilancia("");
      setMesVigilancia("");
      setAnoVigilancia(new Date().getFullYear().toString());
      setData(createInitialData());
      setPartoCirurgico(emptyPartoCirurgico());
      setProcedimentosExtras(createInitialExtras());
    } catch (err: any) {
      console.error("Erro ao salvar no Supabase:", err);
      toast.error("Erro ao salvar: " + (err.message || "Tente novamente."));
    }
  };

  const handleLimpar = () => {
    setRegistroId(generateISCId());
    setHospitalTipo("");
    setNome("");
    setDataVigilancia("");
    setMesVigilancia("");
    setAnoVigilancia(new Date().getFullYear().toString());
    setData(createInitialData());
    setPartoCirurgico(emptyPartoCirurgico());
    setProcedimentosExtras(createInitialExtras());
    toast.info("Formulário limpo.");
  };

  const renderValue = (
    row: typeof indicadorRows[number],
    clinica: Clinica | null,
    d: ClinicaData,
    isTotal: boolean
  ) => {
    if (row.type === "calculated") {
      const val =
        row.key === "taxaResposta"
          ? calcTaxa(d.contatosAtendidos, d.totalCirurgias)
          : calcTaxa(d.iscConfirmada, d.totalCirurgias);
      return <span className="font-semibold text-primary">{val}%</span>;
    }
    if (row.type === "select") {
      if (isTotal) return <span className="text-muted-foreground">—</span>;
      return (
        <Select value={d.sitio} onValueChange={(v) => updateField(clinica!, "sitio", v)}>
          <SelectTrigger className="h-9 w-full text-xs">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {sitioOptions.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    if (isTotal) {
      return <span className="font-semibold">{d[row.key as keyof ClinicaData]}</span>;
    }
    return (
      <Input
        type="number"
        min={0}
        className="h-9 w-full text-center"
        value={d[row.key as keyof ClinicaData] || ""}
        onChange={(e) =>
          updateField(clinica!, row.key as keyof ClinicaData, Number(e.target.value) || 0)
        }
      />
    );
  };

  /* ---- Mobile card for each clínica ---- */
  const renderMobileCard = (clinica: Clinica) => (
    <Card key={clinica}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">{clinica}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {indicadorRows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3">
            <Label className="text-xs text-muted-foreground shrink-0 w-[45%]">{row.label}</Label>
            <div className="w-[55%]">{renderValue(row, clinica, data[clinica] || emptyClinicaData(), false)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  /* ---- Mobile totals card ---- */
  const renderMobileTotals = () => (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-primary">Total Geral</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {indicadorRows.map((row) => (
          <div key={row.key} className="flex items-center justify-between gap-3">
            <Label className="text-xs text-muted-foreground shrink-0 w-[45%]">{row.label}</Label>
            <div className="w-[55%] text-right">{renderValue(row, null, totals, true)}</div>
          </div>
        ))}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Resume dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registro anterior encontrado</DialogTitle>
            <DialogDescription>
              Existe um registro salvo por <strong>{pendingRegistro?.nomeProfissional}</strong>
              {pendingRegistro?.mes && ` (${meses[Number(pendingRegistro.mes) - 1] || ""}/{pendingRegistro.ano})`}.
              Deseja continuar editando ou criar um novo?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleNewRecord}>Novo Registro</Button>
            <Button onClick={handleResumeEdit}>Continuar Edição</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Indicadores ISC</h1>
          <p className="text-sm text-muted-foreground">Infecção de Sítio Cirúrgico — Entrada de dados</p>
        </div>
        <ISCHistory onEdit={loadRegistro} />
      </div>

      {/* General info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base md:text-lg">Informações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-primary" />
                Hospital
              </Label>
              <Select value={hospitalTipo} onValueChange={setHospitalTipo}>
                <SelectTrigger><SelectValue placeholder="Selecione o hospital" /></SelectTrigger>
                <SelectContent>
                  {["Hospital Geral", "Maternidade", "Hospital Pediátrico", "Hospital de médio porte", "Hospital dos olhos"].map((h) => (
                    <SelectItem key={h} value={h}>{h}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome do Profissional *</Label>
              <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dataVig">Data da Vigilância</Label>
              <Input id="dataVig" type="date" value={dataVigilancia} onChange={(e) => setDataVigilancia(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mês da Vigilância</Label>
              <Select value={mesVigilancia} onValueChange={setMesVigilancia}>
                <SelectTrigger><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
                <SelectContent>
                  {meses.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ano">Ano da Vigilância</Label>
              <Input id="ano" type="number" value={anoVigilancia} onChange={(e) => setAnoVigilancia(e.target.value)} min={2020} max={2030} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Desktop: Table view */}
      <div className="hidden lg:block">
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base md:text-lg">Dados por Sítio Cirúrgico</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] bg-muted/50 font-semibold">Indicador</TableHead>
                  {clinicasVisiveis.map((c) => (
                    <TableHead key={c} className="min-w-[140px] text-center bg-muted/50 font-semibold text-xs">{c}</TableHead>
                  ))}
                  {!isMaternidade && (
                    <TableHead className="min-w-[120px] text-center bg-primary/10 font-semibold text-primary text-xs">Total Geral</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {indicadorRows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium text-sm bg-muted/20">{row.label}</TableCell>
                    {clinicasVisiveis.map((c) => (
                      <TableCell key={c} className="text-center">
                        {renderValue(row, c, data[c] || emptyClinicaData(), false)}
                      </TableCell>
                    ))}
                    {!isMaternidade && (
                      <TableCell className="text-center bg-primary/5">
                        {renderValue(row, null, totals, true)}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Mobile/Tablet: Card view */}
      <div className="lg:hidden space-y-4">
        <h2 className="text-base font-semibold text-foreground">Dados por Sítio Cirúrgico</h2>
        {clinicasVisiveis.map(renderMobileCard)}
        {!isMaternidade && renderMobileTotals()}
      </div>

      {/* Parto Cirúrgico - Cesariana (only for Maternidade) */}
      {isMaternidade && (
        <Card className="border-primary/30">
          <CardHeader className="pb-4">
            <CardTitle className="text-base md:text-lg text-primary">Parto Cirúrgico — Cesariana</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="numISC" className="text-sm">
                  Nº de ISC parto cirúrgico - cesariana (Numerador)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Número de infecções de sítio cirúrgico associado ao parto cirúrgico - cesarianas no mês de vigilância.
                </p>
                <Input
                  id="numISC"
                  type="number"
                  min={0}
                  className="h-9"
                  value={partoCirurgico.numISCCesariana || ""}
                  onChange={(e) => setPartoCirurgico(prev => ({ ...prev, numISCCesariana: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="numTotal" className="text-sm">
                  Nº total de partos cirúrgicos - cesarianas (Denominador)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Número total de cirurgias cesarianas realizadas no serviço de saúde, no mês de vigilância.
                </p>
                <Input
                  id="numTotal"
                  type="number"
                  min={0}
                  className="h-9"
                  value={partoCirurgico.numTotalCesarianas || ""}
                  onChange={(e) => setPartoCirurgico(prev => ({ ...prev, numTotalCesarianas: Number(e.target.value) || 0 }))}
                />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <Label className="text-sm">Taxa de ISC Cesariana (%)</Label>
                <div className="h-9 flex items-center justify-center rounded-md border bg-primary/5 font-semibold text-primary text-lg">
                  {taxaISCCesariana}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Procedimentos extras (Hospital Geral, Pediátrico, Médio porte) */}
      {showExtras && procedimentosExtrasConfig.map((proc) => {
        const val = procedimentosExtras[proc.key] || emptyProcedimentoExtra();
        const taxa = val.denominador > 0 ? ((val.numerador / val.denominador) * 100).toFixed(1) : "0.0";
        return (
          <Card key={proc.key} className="border-muted">
            <CardHeader className="pb-4">
              <CardTitle className="text-base md:text-lg">{proc.titulo}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm">{proc.labelNum}</Label>
                  <p className="text-xs text-muted-foreground">{proc.descNum}</p>
                  <Input
                    type="number"
                    min={0}
                    className="h-9"
                    value={val.numerador || ""}
                    onChange={(e) => setProcedimentosExtras(prev => ({
                      ...prev,
                      [proc.key]: { ...prev[proc.key], numerador: Number(e.target.value) || 0 },
                    }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm">{proc.labelDen}</Label>
                  <p className="text-xs text-muted-foreground">{proc.descDen}</p>
                  <Input
                    type="number"
                    min={0}
                    className="h-9"
                    value={val.denominador || ""}
                    onChange={(e) => setProcedimentosExtras(prev => ({
                      ...prev,
                      [proc.key]: { ...prev[proc.key], denominador: Number(e.target.value) || 0 },
                    }))}
                  />
                </div>
                <div className="space-y-1.5 flex flex-col justify-end">
                  <Label className="text-sm">Taxa de ISC (%)</Label>
                  <div className="h-9 flex items-center justify-center rounded-md border bg-primary/5 font-semibold text-primary text-lg">
                    {taxa}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Actions - sticky on mobile */}
      <div className="sticky bottom-0 z-10 flex gap-3 justify-end bg-background/95 backdrop-blur-sm py-3 border-t border-border -mx-4 px-4 md:-mx-6 md:px-6 lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none lg:py-0 lg:mx-0 lg:px-0">
        <Button variant="outline" onClick={handleLimpar} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          <span className="hidden sm:inline">Limpar</span>
        </Button>
        <Button onClick={handleSalvar} className="gap-2">
          <Save className="h-4 w-4" />
          Salvar
        </Button>
      </div>
    </div>
  );
}
