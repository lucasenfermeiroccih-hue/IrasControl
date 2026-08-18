import { useMemo, useState } from "react";
import { Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CATEGORIAS, type HLProduct } from "../data/mockData";
import { setHLState, useHL } from "../store";
import { brl, calcCMM, computeMetrics, FORMULA_TIPS } from "../utils/logisticsFormulas";
import { DataTable, HLPageHeader, InfoTip, SectionCard, StatusBadge } from "../components/HLCommon";

const emptyProduct: HLProduct = {
  id: "", codigo: "", nome: "", categoria: "Papel", unidadeEntrada: "Unidade", unidadeSaida: "Unidade",
  fatorConversao: 1, estoqueVigente: 0, cmm: 0, custoUnitario: 0, curvaABC: "C", criticidade: "Média",
  controladoCCIH: true, leadTime: 7, diasSeguranca: 5, estoqueAlvoDias: 25, status: "Ativo",
  local: "", lote: "", validade: "", ultimaEntrada: "", ultimaSaida: "", fornecedor: "", historico: [],
};

export default function HLProducts() {
  const { products, params, suppliers } = useHL();
  const [selected, setSelected] = useState<HLProduct | null>(null);
  const [categoria, setCategoria] = useState("todas");

  const rows = useMemo(
    () => products
      .filter((p) => categoria === "todas" || p.categoria === categoria)
      .map((p) => ({ p, m: computeMetrics(p, params) })),
    [products, params, categoria],
  );

  const metrics = selected ? computeMetrics(selected, params) : null;

  const save = () => {
    if (!selected) return;
    if (!selected.codigo || !selected.nome) {
      toast.error("Código e nome padronizado são obrigatórios.");
      return;
    }
    setHLState((s) => {
      const exists = s.products.some((p) => p.codigo === selected.codigo);
      return {
        products: exists
          ? s.products.map((p) => (p.codigo === selected.codigo ? { ...selected, id: selected.codigo } : p))
          : [...s.products, { ...selected, id: selected.codigo }],
      };
    });
    toast.success("Produto salvo na grade oficial.");
    setSelected(null);
  };

  const field = (k: keyof HLProduct, label: string, type: "text" | "number" = "text") => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        className="h-8"
        type={type}
        value={String(selected?.[k] ?? "")}
        onChange={(e) =>
          setSelected((s) => s && ({ ...s, [k]: type === "number" ? Number(e.target.value) : e.target.value }))
        }
      />
    </div>
  );

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Grade Oficial de Materiais"
        description="Cadastro padronizado dos materiais controlados pela CCIH, com indicadores calculados."
        actions={<Button size="sm" onClick={() => setSelected({ ...emptyProduct })}><Plus className="mr-2 h-4 w-4" />Novo produto</Button>}
      />

      <div className={selected ? "grid gap-4 xl:grid-cols-[1fr_400px]" : ""}>
        <div className="space-y-4">
          <Select value={categoria} onValueChange={setCategoria}>
            <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas categorias</SelectItem>
              {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>

          <SectionCard title="Materiais cadastrados" description={`${rows.length} itens na grade`}>
            <DataTable
              rows={rows}
              searchKeys={({ p }) => `${p.codigo} ${p.nome} ${p.categoria} ${p.fornecedor}`}
              columns={[
                { key: "cod", header: "Código", sortValue: ({ p }) => p.codigo, render: ({ p }) => p.codigo },
                { key: "nome", header: "Produto", sortValue: ({ p }) => p.nome, render: ({ p }) => <span className="font-medium">{p.nome}</span> },
                { key: "cat", header: "Categoria", render: ({ p }) => p.categoria },
                { key: "ue", header: "Un. Entrada", render: ({ p }) => p.unidadeEntrada },
                { key: "us", header: "Un. Saída", render: ({ p }) => p.unidadeSaida },
                { key: "fc", header: "Fator", render: ({ p }) => p.fatorConversao },
                { key: "est", header: "Estoque", sortValue: ({ p }) => p.estoqueVigente, render: ({ p }) => p.estoqueVigente },
                { key: "cmm", header: "CMM", render: ({ m }) => m.cmm },
                { key: "cmd", header: "CMD", render: ({ m }) => m.cmd },
                { key: "custo", header: "Custo un.", render: ({ p }) => brl(p.custoUnitario) },
                { key: "abc", header: "ABC", render: ({ p }) => <Badge variant="outline">{p.curvaABC}</Badge> },
                { key: "crit", header: "Criticidade", render: ({ p }) => p.criticidade },
                { key: "st", header: "Status", render: ({ m }) => <StatusBadge status={m.status} /> },
                { key: "ac", header: "", render: ({ p }) => <Button size="sm" variant="ghost" onClick={() => setSelected(p)}>Editar</Button> },
              ]}
            />
          </SectionCard>
        </div>

        {selected && metrics && (
          <div className="space-y-4">
            <SectionCard
              title={selected.codigo ? `Editar ${selected.codigo}` : "Novo produto"}
              actions={<Button size="icon" variant="ghost" onClick={() => setSelected(null)}><X className="h-4 w-4" /></Button>}
            >
              <div className="grid grid-cols-2 gap-2">
                {field("codigo", "Código")}
                {field("nome", "Nome padronizado")}
                <div>
                  <Label className="text-xs">Categoria</Label>
                  <Select value={selected.categoria} onValueChange={(v) => setSelected({ ...selected, categoria: v })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {field("unidadeEntrada", "Unidade de entrada")}
                {field("unidadeSaida", "Unidade de saída")}
                {field("fatorConversao", "Fator de conversão", "number")}
                {field("estoqueVigente", "Estoque vigente", "number")}
                {field("cmm", "CMM", "number")}
                {field("custoUnitario", "Custo unitário", "number")}
                <div>
                  <Label className="text-xs">Curva ABC</Label>
                  <Select value={selected.curvaABC} onValueChange={(v) => setSelected({ ...selected, curvaABC: v as "A" | "B" | "C" })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="C">C</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Criticidade assistencial</Label>
                  <Select value={selected.criticidade} onValueChange={(v) => setSelected({ ...selected, criticidade: v as "Alta" | "Média" | "Baixa" })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Alta">Alta</SelectItem><SelectItem value="Média">Média</SelectItem><SelectItem value="Baixa">Baixa</SelectItem></SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Controlado pela CCIH</Label>
                  <Select value={selected.controladoCCIH ? "Sim" : "Não"} onValueChange={(v) => setSelected({ ...selected, controladoCCIH: v === "Sim" })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent>
                  </Select>
                </div>
                {field("leadTime", "Lead time (dias)", "number")}
                {field("diasSeguranca", "Dias de segurança", "number")}
                {field("estoqueAlvoDias", "Estoque alvo (dias)", "number")}
                <div>
                  <Label className="text-xs">Fornecedor principal</Label>
                  <Select value={selected.fornecedor} onValueChange={(v) => setSelected({ ...selected, fornecedor: v })}>
                    <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>{suppliers.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Status</Label>
                  <Select value={selected.status} onValueChange={(v) => setSelected({ ...selected, status: v as HLProduct["status"] })}>
                    <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem><SelectItem value="Inativo">Inativo</SelectItem>
                      <SelectItem value="Bloqueado">Bloqueado</SelectItem><SelectItem value="Fora da grade">Fora da grade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button className="mt-3 w-full" onClick={save}><Save className="mr-2 h-4 w-4" />Salvar produto</Button>
            </SectionCard>

            <SectionCard title="Indicadores calculados em tempo real">
              <div className="space-y-2 text-sm">
                {[
                  ["CMM", `${metrics.cmm}`, FORMULA_TIPS.cmm],
                  ["CMD", `${metrics.cmd}`, FORMULA_TIPS.cmd],
                  ["Cobertura atual", `${metrics.coberturaAtual} dias`, FORMULA_TIPS.cobertura],
                  ["Estoque 20 dias", `${metrics.estoque20}`, "Estoque 20 dias = CMD × 20."],
                  ["Estoque segurança 5 dias", `${metrics.estoqueSeguranca5}`, "Estoque de segurança = CMD × 5."],
                  ["Estoque alvo 25 dias", `${metrics.estoqueAlvo25}`, FORMULA_TIPS.estoqueAlvo],
                  ["Ponto de pedido (qtd)", `${metrics.pontoPedidoQtd}`, FORMULA_TIPS.pontoPedido],
                  ["Ponto de pedido (dias)", `${metrics.pontoPedidoDias}`, FORMULA_TIPS.pontoPedidoDias],
                  ["Dias até pedir", `${metrics.diasAtePedir}`, FORMULA_TIPS.diasAtePedir],
                  ["Compra técnica sugerida", `${metrics.compraTecnica}`, FORMULA_TIPS.compraTecnica],
                  ["Valor consumo mensal", brl(metrics.valorConsumoMensal), FORMULA_TIPS.valorConsumo],
                  ["Valor compra sugerida", brl(metrics.valorCompraSugerida), "Valor compra = compra técnica × custo unitário."],
                ].map(([label, value, tip]) => (
                  <div key={label} className="flex items-center justify-between gap-2 border-b pb-1 last:border-0">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">{label} <InfoTip text={tip} /></span>
                    <span className="font-semibold">{value}</span>
                  </div>
                ))}
                <div className="pt-2"><StatusBadge status={metrics.status} /></div>
                {selected.historico.length > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Histórico 6 meses: {selected.historico.join(" · ")} → CMM calculado {calcCMM(selected.historico)}
                  </p>
                )}
              </div>
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
