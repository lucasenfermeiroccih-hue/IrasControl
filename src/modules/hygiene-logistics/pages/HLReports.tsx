import { useMemo } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHL } from "../store";
import { brl, buildAbcCurve, computeMetrics, STATUS_META } from "../utils/logisticsFormulas";
import { DataTable, exportCsv, HLPageHeader, KpiCard, SectionCard } from "../components/HLCommon";

export default function HLReports() {
  const { products, params, outputs, audits, nonconformities, schedule, entries } = useHL();

  const rows = useMemo(() => products.map((p) => ({ p, m: computeMetrics(p, params) })), [products, params]);
  const abc = useMemo(() => buildAbcCurve(products, params), [products, params]);

  const valorEstoque = rows.reduce((s, r) => s + r.p.estoqueVigente * r.p.custoUnitario, 0);
  const valorSugerido = rows.reduce((s, r) => s + r.m.valorCompraSugerida, 0);
  const consumoMensal = rows.reduce((s, r) => s + r.m.valorConsumoMensal, 0);
  const scoreMedio = audits.length ? Math.round(audits.reduce((s, a) => s + a.score, 0) / audits.length) : 0;

  const relatorios = [
    { nome: "Posição de estoque e status logístico", registros: rows.length, export: () =>
      exportCsv("relatorio-estoque", ["Produto", "Código", "Estoque", "CMM", "CMD", "Cobertura", "Status"],
        rows.map(({ p, m }) => [p.nome, p.codigo, p.estoqueVigente, m.cmm, m.cmd, m.coberturaAtual, STATUS_META[m.status].label])) },
    { nome: "Matriz de ressuprimento 20+5", registros: rows.length, export: () =>
      exportCsv("relatorio-ressuprimento", ["Produto", "Alvo 25d", "Ponto Pedido", "Compra Técnica", "Valor Sugerido"],
        rows.map(({ p, m }) => [p.nome, m.estoqueAlvo25, m.pontoPedidoQtd, m.compraTecnica, m.valorCompraSugerida])) },
    { nome: "Curva ABC de consumo", registros: abc.length, export: () =>
      exportCsv("relatorio-abc", ["Ranking", "Produto", "Valor", "% Individual", "% Acumulado", "Classe"],
        abc.map((r) => [r.ranking, r.product.nome, r.valor, r.percentual, r.acumulado, r.classe])) },
    { nome: "Saídas por setor", registros: outputs.length, export: () =>
      exportCsv("relatorio-saidas", ["Data", "Setor", "Turno", "Produto", "Sugerida", "Liberada", "Justificativa"],
        outputs.map((o) => [o.data, o.setor, o.turno, o.produto, o.sugerida, o.liberada, o.justificativa])) },
    { nome: "Entradas e notas fiscais", registros: entries.length, export: () =>
      exportCsv("relatorio-entradas", ["Data", "NF", "Fornecedor", "Produto", "Quantidade", "Valor"],
        entries.map((e) => [e.data, e.nf, e.fornecedor, e.produto, e.quantidade, e.valor])) },
    { nome: "Auditorias de limpeza", registros: audits.length, export: () =>
      exportCsv("relatorio-auditorias", ["ID", "Data", "Setor", "Tipo", "Score", "Classificação"],
        audits.map((a) => [a.id, a.data, a.setor, a.tipo, a.score, a.classificacao])) },
    { nome: "Cronograma de limpeza", registros: schedule.length, export: () =>
      exportCsv("relatorio-cronograma", ["Data", "Setor", "Tipo", "Turno", "Status"],
        schedule.map((t) => [t.data, t.setor, t.tipo, t.turno, t.status])) },
    { nome: "Não conformidades e planos de ação", registros: nonconformities.length, export: () =>
      exportCsv("relatorio-nc", ["ID", "Setor", "Descrição", "Classificação", "Status", "Prazo"],
        nonconformities.map((n) => [n.id, n.setor, n.descricao, n.classificacao, n.status, n.prazo])) },
  ];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Relatórios"
        description="Exportações consolidadas do módulo de higiene, limpeza, estoque e logística."
        actions={<Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="mr-2 h-4 w-4" />Imprimir página</Button>}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Valor imobilizado em estoque" value={brl(valorEstoque)} tone="info" />
        <KpiCard label="Consumo mensal estimado" value={brl(consumoMensal)} />
        <KpiCard label="Compra técnica sugerida" value={brl(valorSugerido)} tone="warning" />
        <KpiCard label="Score médio de limpeza" value={`${scoreMedio}%`} tone={scoreMedio >= 90 ? "success" : scoreMedio >= 70 ? "warning" : "danger"} />
      </div>

      <SectionCard title="Relatórios disponíveis">
        <DataTable
          searchable={false}
          rows={relatorios}
          pageSize={10}
          columns={[
            { key: "nome", header: "Relatório", render: (r) => <span className="font-medium">{r.nome}</span> },
            { key: "reg", header: "Registros", render: (r) => r.registros },
            { key: "ac", header: "", render: (r) => (
              <Button size="sm" variant="outline" onClick={r.export}><Download className="mr-2 h-3.5 w-3.5" />Exportar CSV</Button>
            ) },
          ]}
        />
      </SectionCard>
    </div>
  );
}
