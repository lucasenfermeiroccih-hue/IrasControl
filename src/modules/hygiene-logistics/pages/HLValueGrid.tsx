import { useMemo, useState } from "react";
import { Download, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useHL } from "../store";
import { brl, computeMetrics } from "../utils/logisticsFormulas";
import { exportCsv, HLPageHeader, KpiCard, SectionCard } from "../components/HLCommon";
import { CATEGORIAS } from "../data/mockData";

const ABC_COLORS: Record<string, string> = {
  A: "border-destructive/40 bg-destructive/10 text-destructive",
  B: "border-yellow-500/40 bg-yellow-500/10 text-yellow-600",
  C: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
};

export default function HLValueGrid() {
  const { products, params } = useHL();
  const [filtroCategoria, setFiltroCategoria] = useState("todas");
  const [filtroFornecedor, setFiltroFornecedor] = useState("todos");
  const [filtroABC, setFiltroABC] = useState("todas");

  const fornecedores = useMemo(
    () => [...new Set(products.map((p) => p.fornecedor).filter(Boolean))].sort(),
    [products]
  );

  const rows = useMemo(() => {
    return products
      .filter((p) => {
        if (filtroCategoria !== "todas" && p.categoria !== filtroCategoria) return false;
        if (filtroFornecedor !== "todos" && p.fornecedor !== filtroFornecedor) return false;
        if (filtroABC !== "todas" && p.curvaABC !== filtroABC) return false;
        return true;
      })
      .map((p) => {
        const m = computeMetrics(p, params);
        const qtdPedida = p.pedidoMes ?? 0;
        const valorTotal = qtdPedida * p.custoUnitario;
        const valorTecnico = m.compraTecnica * p.custoUnitario;
        return { p, m, qtdPedida, valorTotal, valorTecnico };
      })
      .sort((a, b) => b.valorTotal - a.valorTotal);
  }, [products, params, filtroCategoria, filtroFornecedor, filtroABC]);

  // Group by category for subtotals
  const byCategory = useMemo(() => {
    const map: Record<string, typeof rows> = {};
    rows.forEach((r) => {
      (map[r.p.categoria] ||= []).push(r);
    });
    return Object.entries(map).sort(([, a], [, b]) => {
      const sumA = a.reduce((s, r) => s + r.valorTotal, 0);
      const sumB = b.reduce((s, r) => s + r.valorTotal, 0);
      return sumB - sumA;
    });
  }, [rows]);

  const totalGeral = rows.reduce((s, r) => s + r.valorTotal, 0);
  const totalTecnico = rows.reduce((s, r) => s + r.valorTecnico, 0);
  const difGeral = totalGeral - totalTecnico;
  const itensSemPedido = rows.filter((r) => r.qtdPedida === 0).length;

  const categoriaTop = byCategory[0];
  const totalTop = categoriaTop ? categoriaTop[1].reduce((s, r) => s + r.valorTotal, 0) : 0;

  const handleExport = () => {
    const headers = ["Código", "Produto", "Categoria", "Fornecedor", "ABC", "Un. Entrada", "Qtd Pedida", "Custo Un. (R$)", "Valor Total (R$)", "Valor Técnico (R$)", "Diferença (R$)"];
    const data = rows.map((r) => [
      r.p.codigo, r.p.nome, r.p.categoria, r.p.fornecedor, r.p.curvaABC,
      r.p.unidadeEntrada, r.qtdPedida,
      r.p.custoUnitario.toFixed(2),
      r.valorTotal.toFixed(2),
      r.valorTecnico.toFixed(2),
      (r.valorTotal - r.valorTecnico).toFixed(2),
    ]);
    exportCsv("grade-de-valor", headers, data);
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Grade de Valor"
        description="Valor financeiro do pedido mensal — custo unitário × quantidade pedida, com subtotais por categoria."
        actions={
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Valor total do pedido" value={brl(totalGeral)} tone="info" />
        <KpiCard label="Valor técnico sugerido" value={brl(totalTecnico)} tone="success" />
        <KpiCard
          label={difGeral > 0 ? "Excedente vs. técnico" : "Economia vs. técnico"}
          value={brl(Math.abs(difGeral))}
          tone={difGeral > 0 ? "warning" : "success"}
        />
        <KpiCard label={`Maior categoria (${categoriaTop?.[0] ?? "—"})`} value={brl(totalTop)} tone="danger" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
          <SelectTrigger className="h-8 w-44 text-xs"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
          <SelectTrigger className="h-8 w-52 text-xs"><SelectValue placeholder="Fornecedor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos fornecedores</SelectItem>
            {fornecedores.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
          </SelectContent>
        </Select>

        <Select value={filtroABC} onValueChange={setFiltroABC}>
          <SelectTrigger className="h-8 w-32 text-xs"><SelectValue placeholder="Curva ABC" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas curvas</SelectItem>
            <SelectItem value="A">Curva A</SelectItem>
            <SelectItem value="B">Curva B</SelectItem>
            <SelectItem value="C">Curva C</SelectItem>
          </SelectContent>
        </Select>

        {itensSemPedido > 0 && (
          <Badge variant="outline" className="border-muted bg-muted/50 text-muted-foreground text-xs self-center">
            {itensSemPedido} item(ns) sem qtd pedida
          </Badge>
        )}
      </div>

      {/* Table grouped by category */}
      <SectionCard
        title="Composição do pedido por categoria"
        description={`${rows.length} itens · Total: ${brl(totalGeral)}`}
      >
        <div className="overflow-x-auto rounded-md border">
          <Table className="text-xs min-w-[900px]">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-[90px]">Código</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead className="w-[110px]">Fornecedor</TableHead>
                <TableHead className="w-[60px] text-center">ABC</TableHead>
                <TableHead className="w-[110px]">Un. Entrada</TableHead>
                <TableHead className="w-[80px] text-right">Qtd Pedida</TableHead>
                <TableHead className="w-[100px] text-right">Custo Un.</TableHead>
                <TableHead className="w-[110px] text-right font-semibold">Valor Total</TableHead>
                <TableHead className="w-[110px] text-right">Valor Técnico</TableHead>
                <TableHead className="w-[90px] text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byCategory.map(([categoria, catRows]) => {
                const subtotal = catRows.reduce((s, r) => s + r.valorTotal, 0);
                const subtotalTec = catRows.reduce((s, r) => s + r.valorTecnico, 0);
                const subtotalDif = subtotal - subtotalTec;
                const pct = totalGeral > 0 ? ((subtotal / totalGeral) * 100).toFixed(1) : "0.0";

                return (
                  <>
                    {/* Category header row */}
                    <TableRow key={`cat-${categoria}`} className="bg-primary/5 hover:bg-primary/5">
                      <TableCell colSpan={7} className="font-semibold text-primary py-2">
                        <span className="flex items-center gap-2">
                          <DollarSign className="h-3.5 w-3.5" />
                          {categoria}
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary/80">{pct}%</Badge>
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary py-2">{brl(subtotal)}</TableCell>
                      <TableCell className="text-right text-muted-foreground py-2">{brl(subtotalTec)}</TableCell>
                      <TableCell className={`text-right py-2 font-medium ${subtotalDif > 0 ? "text-orange-600" : subtotalDif < 0 ? "text-emerald-600" : ""}`}>
                        {subtotalDif > 0 ? "+" : ""}{brl(subtotalDif)}
                      </TableCell>
                    </TableRow>

                    {/* Product rows */}
                    {catRows.map((r) => {
                      const dif = r.valorTotal - r.valorTecnico;
                      return (
                        <TableRow
                          key={r.p.codigo}
                          className={r.qtdPedida === 0 ? "opacity-50" : ""}
                        >
                          <TableCell className="font-mono text-[11px] text-muted-foreground">{r.p.codigo}</TableCell>
                          <TableCell className="font-medium">{r.p.nome}</TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-[110px]" title={r.p.fornecedor}>
                            {r.p.fornecedor}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`text-[10px] ${ABC_COLORS[r.p.curvaABC]}`}>{r.p.curvaABC}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{r.p.unidadeEntrada}</TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">
                            {r.qtdPedida === 0 ? <span className="text-muted-foreground">—</span> : r.qtdPedida}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {brl(r.p.custoUnitario)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-bold">
                            {r.qtdPedida === 0 ? <span className="text-muted-foreground">—</span> : brl(r.valorTotal)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-muted-foreground">
                            {brl(r.valorTecnico)}
                          </TableCell>
                          <TableCell className={`text-right tabular-nums text-[11px] font-medium ${dif > 0 ? "text-orange-600" : dif < 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                            {dif === 0 ? "—" : `${dif > 0 ? "+" : ""}${brl(dif)}`}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                );
              })}

              {/* Grand total */}
              <TableRow className="bg-muted/60 border-t-2 font-bold">
                <TableCell colSpan={7} className="py-3 text-sm">
                  TOTAL GERAL — {rows.length} itens
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums py-3">{brl(totalGeral)}</TableCell>
                <TableCell className="text-right text-sm tabular-nums py-3 text-muted-foreground">{brl(totalTecnico)}</TableCell>
                <TableCell className={`text-right text-sm tabular-nums py-3 ${difGeral > 0 ? "text-orange-600" : difGeral < 0 ? "text-emerald-600" : ""}`}>
                  {difGeral > 0 ? "+" : ""}{brl(difGeral)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </SectionCard>

      {/* Per-category summary cards */}
      <SectionCard title="Resumo por categoria">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {byCategory.map(([cat, catRows]) => {
            const total = catRows.reduce((s, r) => s + r.valorTotal, 0);
            const pct = totalGeral > 0 ? ((total / totalGeral) * 100).toFixed(1) : "0.0";
            return (
              <div key={cat} className="rounded-lg border p-3 space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{cat}</p>
                <p className="text-base font-bold tabular-nums">{brl(total)}</p>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{pct}% do total · {catRows.length} itens</p>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
