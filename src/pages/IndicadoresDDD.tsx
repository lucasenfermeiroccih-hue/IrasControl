import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Save, Calculator, Trash2, History } from "lucide-react";
import { antimicrobianosBase } from "@/data/antimicrobianos-ddd";
import { salvarRegistroDDD, listarRegistrosDDD, excluirRegistroDDD, DDDRegistroSalvo } from "@/lib/ddd-storage";

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const unidadesPacienteDia = [
  "UTI 1 Adulto",
  "UTI 2 Adulto",
  "UTI 3 Adulto",
  "UTI Neonatal",
  "UTI Pediátrica",
  "UPO",
  "Trauma Clínico",
];

const DASH = "—";

export default function IndicadoresDDD() {
  const [profissional, setProfissional] = useState("");
  const [dataVigilancia, setDataVigilancia] = useState("");
  const [mesVigilancia, setMesVigilancia] = useState("");
  const [anoVigilancia, setAnoVigilancia] = useState(new Date().getFullYear());
  const [showHistory, setShowHistory] = useState(false);
  const [registrosSalvos, setRegistrosSalvos] = useState<DDDRegistroSalvo[]>(() => listarRegistrosDDD());

  const [pacienteDia, setPacienteDia] = useState<Record<string, number>>(
    Object.fromEntries(unidadesPacienteDia.map(u => [u, 0]))
  );

  const compiladoUTIs = useMemo(() => {
    return (pacienteDia["UTI 1 Adulto"] || 0) +
      (pacienteDia["UTI 2 Adulto"] || 0) +
      (pacienteDia["UTI 3 Adulto"] || 0) +
      (pacienteDia["UTI Neonatal"] || 0) +
      (pacienteDia["UTI Pediátrica"] || 0);
  }, [pacienteDia]);

  const [quantidades, setQuantidades] = useState<Record<number, number>>(
    Object.fromEntries(antimicrobianosBase.map(a => [a.id, 0]))
  );

  const handleQtyChange = (id: number, val: string) => {
    const n = Math.max(0, parseInt(val) || 0);
    setQuantidades(prev => ({ ...prev, [id]: n }));
  };

  const handlePacienteDiaChange = (unidade: string, val: string) => {
    const n = Math.max(0, parseInt(val) || 0);
    setPacienteDia(prev => ({ ...prev, [unidade]: n }));
  };

  const tableData = useMemo(() => {
    return antimicrobianosBase.map(atm => {
      const qty = quantidades[atm.id] || 0;
      const totalMg = qty * atm.mgPorUnidade;
      const totalG = totalMg / 1000;

      const canCalcAB = qty > 0 && atm.dddPadrao > 0;
      const valorAB = canCalcAB ? totalG / atm.dddPadrao : null;

      const canCalcIndicador = valorAB !== null && valorAB > 0 && compiladoUTIs > 0;
      const indicador = canCalcIndicador ? (valorAB / compiladoUTIs) * 1000 : null;

      return {
        ...atm,
        qty,
        totalMg,
        totalG: Math.round(totalG * 100) / 100,
        valorAB: valorAB !== null ? Math.round(valorAB * 100) / 100 : null,
        indicador: indicador !== null ? Math.round(indicador * 100) / 100 : null,
      };
    });
  }, [quantidades, compiladoUTIs]);

  const handleSave = () => {
    if (!profissional || !dataVigilancia || !mesVigilancia) {
      toast.error("Preencha todos os campos obrigatórios da identificação.");
      return;
    }

    const linhas = tableData.map(row => ({
      antimicrobianoId: row.id,
      nome: row.nome,
      apresentacao: row.apresentacao,
      mgPorUnidade: row.mgPorUnidade,
      quantidade: row.qty,
      totalMg: row.totalMg,
      totalG: row.totalG,
      dddPadrao: row.dddPadrao,
      valorAB: row.valorAB,
      indicador: row.indicador,
    }));

    salvarRegistroDDD({
      profissional,
      dataVigilancia,
      mesVigilancia,
      anoVigilancia,
      pacienteDia,
      compiladoUTIs,
      linhas,
    });

    setRegistrosSalvos(listarRegistrosDDD());
    toast.success("Registro salvo com sucesso!");
  };

  const handleDelete = (id: string) => {
    excluirRegistroDDD(id);
    setRegistrosSalvos(listarRegistrosDDD());
    toast.success("Registro excluído.");
  };

  const handleLoadRecord = (reg: DDDRegistroSalvo) => {
    setProfissional(reg.profissional);
    setDataVigilancia(reg.dataVigilancia);
    setMesVigilancia(reg.mesVigilancia);
    setAnoVigilancia(reg.anoVigilancia);
    setPacienteDia(reg.pacienteDia);

    const newQtd: Record<number, number> = {};
    for (const linha of reg.linhas) {
      newQtd[linha.antimicrobianoId] = linha.quantidade;
    }
    setQuantidades(prev => ({ ...prev, ...newQtd }));
    setShowHistory(false);
    toast.info("Registro carregado no formulário.");
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Indicadores DDD</h1>
          <p className="text-sm text-muted-foreground">Cálculo de consumo de antimicrobianos — DDD (OMS 2020)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowHistory(!showHistory)} className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span> ({registrosSalvos.length})
          </Button>
        </div>
      </div>

      {/* Histórico */}
      {showHistory && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Registros Salvos</CardTitle></CardHeader>
          <CardContent>
            {registrosSalvos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum registro salvo ainda.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Mês/Ano</TableHead>
                      <TableHead>Data Vigilância</TableHead>
                      <TableHead>Compilado UTIs</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrosSalvos.map(reg => (
                      <TableRow key={reg.id}>
                        <TableCell className="font-medium">{reg.profissional}</TableCell>
                        <TableCell><Badge variant="secondary">{reg.mesVigilancia}/{reg.anoVigilancia}</Badge></TableCell>
                        <TableCell>{reg.dataVigilancia}</TableCell>
                        <TableCell className="font-mono">{reg.compiladoUTIs}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(reg.criadoEm).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => handleLoadRecord(reg)}>Carregar</Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(reg.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Identificação */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Identificação</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Nome do Profissional *</Label>
            <Input value={profissional} onChange={e => setProfissional(e.target.value)} placeholder="Nome completo" />
          </div>
          <div className="space-y-1.5">
            <Label>Data da Vigilância *</Label>
            <Input type="date" value={dataVigilancia} onChange={e => setDataVigilancia(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Mês da Vigilância *</Label>
            <Select value={mesVigilancia} onValueChange={setMesVigilancia}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {meses.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Ano da Vigilância *</Label>
            <Input type="number" min={2020} max={2030} value={anoVigilancia} onChange={e => setAnoVigilancia(parseInt(e.target.value) || 2025)} />
          </div>
        </CardContent>
      </Card>

      {/* Paciente-dia */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Paciente-dia por Unidade</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {unidadesPacienteDia.map(u => (
              <div key={u} className="space-y-1.5">
                <Label className="text-xs">{u}</Label>
                <Input type="number" min={0} value={pacienteDia[u] || ""} onChange={e => handlePacienteDiaChange(u, e.target.value)} placeholder="0" />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-primary">Compilado UTIs</Label>
              <div className="flex h-10 items-center rounded-md border bg-muted px-3 font-mono text-sm font-bold text-primary">
                <Calculator className="mr-2 h-4 w-4" />
                {compiladoUTIs}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela Antimicrobianos */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Antimicrobianos</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto -mx-2 px-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Antimicrobiano</TableHead>
                <TableHead className="min-w-[140px]">Apresentação</TableHead>
                <TableHead className="min-w-[80px] text-center">mg/unid</TableHead>
                <TableHead className="min-w-[90px] text-center">Qtd Unidades</TableHead>
                <TableHead className="text-right">Total (mg)</TableHead>
                <TableHead className="text-right">Total (g)</TableHead>
                <TableHead className="text-right">DDD (g)</TableHead>
                <TableHead className="text-right font-semibold text-primary">A/B</TableHead>
                <TableHead className="text-right font-semibold text-primary">Indicador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium text-sm">{row.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{row.apresentacao}</TableCell>
                  <TableCell className="text-center font-mono text-xs">{row.mgPorUnidade}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-20 text-center mx-auto"
                      value={row.qty || ""}
                      onChange={e => handleQtyChange(row.id, e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.qty > 0 ? row.totalMg : DASH}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.qty > 0 ? row.totalG.toFixed(2) : DASH}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{row.dddPadrao}</TableCell>
                  <TableCell className="text-right font-mono text-xs font-semibold text-primary">
                    {row.valorAB !== null ? row.valorAB.toFixed(2) : DASH}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-xs font-bold ${
                    row.indicador === null
                      ? "text-muted-foreground"
                      : row.indicador > 50
                        ? "text-destructive"
                        : row.indicador > 20
                          ? "text-yellow-600"
                          : "text-emerald-600"
                  }`}>
                    {row.indicador !== null ? row.indicador.toFixed(2) : DASH}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Botão Salvar fixo no final */}
      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button onClick={handleSave} size="lg" className="gap-2 shadow-lg">
          <Save className="h-5 w-5" /> Salvar Registro
        </Button>
      </div>
    </div>
  );
}
