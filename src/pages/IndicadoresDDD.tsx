import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Save, Calculator } from "lucide-react";
import { antimicrobianosBase } from "@/data/antimicrobianos-ddd";

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
    toast.success("Dados salvos com sucesso! (mock)");
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Indicadores DDD</h1>
          <p className="text-sm text-muted-foreground">Cálculo de consumo de antimicrobianos — DDD (OMS 2020)</p>
        </div>
        <Button onClick={handleSave} className="gap-2">
          <Save className="h-4 w-4" /> Salvar
        </Button>
      </div>

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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Antimicrobiano</TableHead>
                <TableHead className="min-w-[160px]">Apresentação</TableHead>
                <TableHead className="min-w-[90px] text-center">mg/unid</TableHead>
                <TableHead className="min-w-[100px] text-center">Qtd Unidades</TableHead>
                <TableHead className="text-right">Total (mg)</TableHead>
                <TableHead className="text-right">Total (g)</TableHead>
                <TableHead className="text-right">DDD Padrão (g)</TableHead>
                <TableHead className="text-right font-semibold text-primary">A/B</TableHead>
                <TableHead className="text-right font-semibold text-primary">Indicador</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.nome}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{row.apresentacao}</TableCell>
                  <TableCell className="text-center font-mono text-sm">{row.mgPorUnidade}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-20 text-center"
                      value={row.qty || ""}
                      onChange={e => handleQtyChange(row.id, e.target.value)}
                    />
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{row.qty > 0 ? row.totalMg : DASH}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{row.qty > 0 ? row.totalG.toFixed(2) : DASH}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{row.dddPadrao}</TableCell>
                  <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                    {row.valorAB !== null ? row.valorAB.toFixed(2) : DASH}
                  </TableCell>
                  <TableCell className={`text-right font-mono text-sm font-bold ${
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
    </div>
  );
}
