import { useMemo } from "react";
import { FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CATEGORIAS } from "../data/mockData";
import { useHL } from "../store";
import { brl, computeMetrics, FORMULA_TIPS } from "../utils/logisticsFormulas";
import { DataTable, HLPageHeader, InfoTip, KpiCard, SectionCard, StatusBadge } from "../components/HLCommon";

export default function HLResupplyMatrix() {
  const { products, params } = useHL();
  const rows = useMemo(() => products.map((p) => ({ p, m: computeMetrics(p, params) })), [products, params]);

  const totalGeral = rows.reduce((s, r) => s + r.m.valorCompraSugerida, 0);
  const porCategoria = CATEGORIAS.map((c) => ({
    categoria: c,
    total: rows.filter((r) => r.p.categoria === c).reduce((s, r) => s + r.m.valorCompraSugerida, 0),
  })).filter((r) => r.total > 0);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Matriz de Ressuprimento 20+5"
        description="Cobertura operacional de 20 dias somada a 5 dias de estoque de segurança (alvo 25 dias)."
        actions={<Button size="sm" onClick={() => window.print()}><FileDown className="mr-2 h-4 w-4" />Gerar PDF da Matriz</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Cobertura operacional" value={`${params.coberturaOperacional} dias`} tone="info" />
        <KpiCard label="Estoque de segurança" value={`${params.diasSeguranca} dias`} tone="info" />
        <KpiCard label="Estoque alvo" value={`${params.estoqueAlvoDias} dias`} tone="success" />
        <KpiCard label="Valor total sugerido" value={brl(totalGeral)} tone="warning" />
      </div>

      <SectionCard title="Matriz técnica de ressuprimento">
        <DataTable
          rows={rows}
          pageSize={20}
          searchKeys={({ p }) => `${p.nome} ${p.codigo}`}
          columns={[
            { key: "nome", header: "Produto", sortValue: ({ p }) => p.nome, render: ({ p }) => <span className="font-medium">{p.nome}</span> },
            { key: "cod", header: "Cód.", render: ({ p }) => p.codigo },
            { key: "cmm", header: <span className="inline-flex items-center gap-1">CMM <InfoTip text={FORMULA_TIPS.cmm} /></span>, render: ({ m }) => m.cmm },
            { key: "cmd", header: <span className="inline-flex items-center gap-1">CMD <InfoTip text={FORMULA_TIPS.cmd} /></span>, render: ({ m }) => m.cmd },
            { key: "est", header: "Estoque Vigente", sortValue: ({ p }) => p.estoqueVigente, render: ({ p }) => p.estoqueVigente },
            { key: "cob", header: <span className="inline-flex items-center gap-1">Cobertura <InfoTip text={FORMULA_TIPS.cobertura} /></span>, sortValue: ({ m }) => m.coberturaAtual, render: ({ m }) => `${m.coberturaAtual} d` },
            { key: "e20", header: "Estoque 20d", render: ({ m }) => m.estoque20 },
            { key: "e5", header: "Seg. 5d", render: ({ m }) => m.estoqueSeguranca5 },
            { key: "e25", header: <span className="inline-flex items-center gap-1">Alvo 25d <InfoTip text={FORMULA_TIPS.estoqueAlvo} /></span>, render: ({ m }) => m.estoqueAlvo25 },
            { key: "ppq", header: <span className="inline-flex items-center gap-1">PP (qtd) <InfoTip text={FORMULA_TIPS.pontoPedido} /></span>, render: ({ m }) => m.pontoPedidoQtd },
            { key: "ppd", header: <span className="inline-flex items-center gap-1">PP (dias) <InfoTip text={FORMULA_TIPS.pontoPedidoDias} /></span>, render: ({ m }) => m.pontoPedidoDias },
            { key: "dias", header: <span className="inline-flex items-center gap-1">Dias até pedir <InfoTip text={FORMULA_TIPS.diasAtePedir} /></span>, sortValue: ({ m }) => m.diasAtePedir, render: ({ m }) => <span className={m.diasAtePedir <= 0 ? "font-semibold text-destructive" : ""}>{m.diasAtePedir}</span> },
            { key: "ct", header: <span className="inline-flex items-center gap-1">Compra Técnica <InfoTip text={FORMULA_TIPS.compraTecnica} /></span>, sortValue: ({ m }) => m.compraTecnica, render: ({ m }) => m.compraTecnica },
            { key: "vl", header: "Valor Sugerido", sortValue: ({ m }) => m.valorCompraSugerida, render: ({ m }) => brl(m.valorCompraSugerida) },
            { key: "st", header: "Status", render: ({ m }) => <StatusBadge status={m.status} /> },
          ]}
        />
      </SectionCard>

      <SectionCard title="Totais de compra sugerida por categoria">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {porCategoria.map((c) => (
            <div key={c.categoria} className="rounded-md border p-3">
              <p className="text-xs text-muted-foreground">{c.categoria}</p>
              <p className="text-lg font-bold">{brl(c.total)}</p>
            </div>
          ))}
          <div className="rounded-md border border-primary/40 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Total geral</p>
            <p className="text-lg font-bold text-primary">{brl(totalGeral)}</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
