import { useMemo, useState } from "react";
import { AlertTriangle, Plus, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { setHLState, useHL } from "../store";
import { brl, computeMetrics, FORMULA_TIPS } from "../utils/logisticsFormulas";
import { DataTable, HLPageHeader, InfoTip, KpiCard, SectionCard } from "../components/HLCommon";

type OrderStatus = "Adequado" | "Abaixo do necessário" | "Acima do necessário" | "Validar sem consumo" | "Pedir agora" | "Segurar compra";

const ORDER_TONE: Record<OrderStatus, string> = {
  "Adequado": "border-emerald-500/40 bg-emerald-500/10 text-emerald-600",
  "Abaixo do necessário": "border-destructive/40 bg-destructive/10 text-destructive",
  "Acima do necessário": "border-orange-500/40 bg-orange-500/10 text-orange-600",
  "Validar sem consumo": "border-border bg-muted text-muted-foreground",
  "Pedir agora": "border-destructive/40 bg-destructive/10 text-destructive",
  "Segurar compra": "border-blue-500/40 bg-blue-500/10 text-blue-600",
};

export default function HLMonthlyOrder() {
  const { products, params } = useHL();
  const [aprovadores, setAprovadores] = useState<Record<string, string>>({});
  const [justificativas, setJustificativas] = useState<Record<string, string>>({});

  const rows = useMemo(() =>
    products.map((p) => {
      const m = computeMetrics(p, params);
      const pedido = p.pedidoMes ?? 0;
      let status: OrderStatus;
      let justificativaAuto: string;
      if (p.status === "Fora da grade" || p.status === "Bloqueado") {
        status = "Segurar compra";
        justificativaAuto = "Item fora da grade oficial — compra bloqueada até aprovação da CCIH.";
      } else if (m.cmd === 0 && pedido > 0) {
        status = "Validar sem consumo";
        justificativaAuto = "Item pedido sem consumo histórico registrado nos últimos 6 meses.";
      } else if (m.status === "PEDIR_AGORA" || m.status === "RISCO_DE_RUPTURA") {
        status = "Pedir agora";
        justificativaAuto = `Cobertura de ${m.coberturaAtual} dias abaixo do ponto de pedido (${m.pontoPedidoDias} dias).`;
      } else if (pedido > m.compraTecnica * 1.1) {
        status = "Acima do necessário";
        justificativaAuto = `Pedido ${m.diferencaPedidoTecnico} acima da compra técnica de ${m.compraTecnica}.`;
      } else if (pedido < m.compraTecnica * 0.9) {
        status = "Abaixo do necessário";
        justificativaAuto = `Pedido ${Math.abs(m.diferencaPedidoTecnico)} abaixo da compra técnica de ${m.compraTecnica}.`;
      } else {
        status = "Adequado";
        justificativaAuto = "Pedido alinhado ao estoque alvo de 25 dias.";
      }
      return { p, m, pedido, status, justificativaAuto };
    }), [products, params]);

  const setPedido = (codigo: string, valor: number) =>
    setHLState((s) => ({ products: s.products.map((p) => (p.codigo === codigo ? { ...p, pedidoMes: valor } : p)) }));

  const totalPedido = rows.reduce((s, r) => s + r.pedido * r.p.custoUnitario, 0);
  const totalTecnico = rows.reduce((s, r) => s + r.m.valorCompraSugerida, 0);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Pedido do Mês"
        description="Comparativo entre o pedido solicitado e a compra tecnicamente sugerida pelo modelo 20+5."
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => toast.info("Importação de planilha: use o modelo CSV com Código;Qtd Pedida.")}>
              <Upload className="mr-2 h-4 w-4" />Importar Planilha
            </Button>
            <Button size="sm" onClick={() => toast.info("Cadastre o item na Grade Oficial e informe a quantidade pedida.")}>
              <Plus className="mr-2 h-4 w-4" />Adicionar Item
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Valor do pedido solicitado" value={brl(totalPedido)} tone="info" />
        <KpiCard label="Valor tecnicamente sugerido" value={brl(totalTecnico)} tone="success" />
        <KpiCard label="Itens acima do necessário" value={rows.filter((r) => r.status === "Acima do necessário").length} tone="warning" />
        <KpiCard label="Itens abaixo do necessário" value={rows.filter((r) => r.status === "Abaixo do necessário").length} tone="danger" />
      </div>

      <SectionCard title="Análise do pedido">
        <DataTable
          rows={rows}
          pageSize={20}
          searchKeys={(r) => `${r.p.nome} ${r.p.codigo}`}
          rowClassName={(r) => {
            if (r.p.estoqueVigente === 0) return "bg-destructive/10";
            if (r.p.criticidade === "Alta" && r.m.coberturaAtual < (r.p.leadTime ?? params.leadTimePadrao)) return "bg-destructive/20";
            if (r.status === "Acima do necessário") return "bg-yellow-500/10";
            if (r.status === "Abaixo do necessário") return "bg-orange-500/10";
            return "";
          }}
          columns={[
            { key: "cod", header: "Código", render: (r) => r.p.codigo },
            { key: "nome", header: "Produto", render: (r) => (
              <span className="inline-flex items-center gap-1 font-medium">
                {r.p.nome}
                {r.m.cmd === 0 && r.pedido > 0 && <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />}
                {(r.p.status === "Fora da grade" || r.p.status === "Bloqueado") && <Badge variant="outline" className="bg-muted text-muted-foreground">Fora da Grade</Badge>}
              </span>
            ) },
            { key: "un", header: "Unidade", render: (r) => r.p.unidadeEntrada },
            { key: "ped", header: "Qtd Pedida", render: (r) => (
              <Input className="h-7 w-20" type="number" value={r.pedido}
                onChange={(e) => setPedido(r.p.codigo, Number(e.target.value))} />
            ) },
            { key: "est", header: "Estoque", sortValue: (r) => r.p.estoqueVigente, render: (r) => r.p.estoqueVigente },
            { key: "cmm", header: <span className="inline-flex items-center gap-1">CMM <InfoTip text={FORMULA_TIPS.cmm} /></span>, render: (r) => r.m.cmm },
            { key: "cmd", header: "CMD", render: (r) => r.m.cmd },
            { key: "alvo", header: <span className="inline-flex items-center gap-1">Alvo 25d <InfoTip text={FORMULA_TIPS.estoqueAlvo} /></span>, render: (r) => r.m.estoqueAlvo25 },
            { key: "ct", header: <span className="inline-flex items-center gap-1">Compra Técnica <InfoTip text={FORMULA_TIPS.compraTecnica} /></span>, render: (r) => r.m.compraTecnica },
            { key: "dif", header: "Diferença", sortValue: (r) => r.m.diferencaPedidoTecnico, render: (r) => (
              <span className={r.m.diferencaPedidoTecnico > 0 ? "text-orange-600" : r.m.diferencaPedidoTecnico < 0 ? "text-destructive" : ""}>
                {r.m.diferencaPedidoTecnico}
              </span>
            ) },
            { key: "st", header: "Status", render: (r) => <Badge variant="outline" className={ORDER_TONE[r.status]}>{r.status}</Badge> },
            { key: "ja", header: "Justificativa Automática", className: "max-w-[240px] whitespace-normal", render: (r) => <span className="text-[11px] text-muted-foreground">{r.justificativaAuto}</span> },
            { key: "jm", header: "Justificativa Manual", render: (r) => (
              <Input className="h-7 w-40" value={justificativas[r.p.codigo] ?? ""}
                onChange={(e) => setJustificativas((s) => ({ ...s, [r.p.codigo]: e.target.value }))} />
            ) },
            { key: "apr", header: "Aprovador", render: (r) => (
              <Input className="h-7 w-32" value={aprovadores[r.p.codigo] ?? ""}
                onChange={(e) => setAprovadores((s) => ({ ...s, [r.p.codigo]: e.target.value }))} />
            ) },
            { key: "sc", header: "Status Compra", render: (r) => (aprovadores[r.p.codigo] ? "Aprovado" : "Pendente") },
          ]}
        />
      </SectionCard>
    </div>
  );
}
