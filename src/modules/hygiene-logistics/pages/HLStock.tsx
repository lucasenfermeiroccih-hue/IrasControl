import { useMemo, useState } from "react";
import { Download, FileText, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CATEGORIAS } from "../data/mockData";
import { setHLState, useHL } from "../store";
import { computeMetrics, FORMULA_TIPS, STATUS_META } from "../utils/logisticsFormulas";
import { DataTable, exportCsv, HLPageHeader, InfoTip, SectionCard, StatusBadge } from "../components/HLCommon";

const MOTIVOS = [
  "Contagem física", "Perda", "Vencimento", "Transferência",
  "Erro de lançamento", "Entrada não registrada", "Saída não registrada",
];

export default function HLStock() {
  const { products, params } = useHL();
  const [categoria, setCategoria] = useState("todas");
  const [classe, setClasse] = useState("todas");
  const [criticidade, setCriticidade] = useState("todas");
  const [status, setStatus] = useState("todos");
  const [open, setOpen] = useState(false);
  const [adj, setAdj] = useState({ produto: "", quantidade: "", motivo: "", responsavel: "", observacao: "" });

  const rows = useMemo(
    () =>
      products
        .map((p) => ({ p, m: computeMetrics(p, params) }))
        .filter(({ p, m }) =>
          (categoria === "todas" || p.categoria === categoria) &&
          (classe === "todas" || p.curvaABC === classe) &&
          (criticidade === "todas" || p.criticidade === criticidade) &&
          (status === "todos" || m.status === status)),
    [products, params, categoria, classe, criticidade, status],
  );

  const salvarAjuste = () => {
    if (!adj.produto || !adj.quantidade || !adj.motivo || !adj.responsavel) {
      toast.error("Produto, quantidade, motivo e responsável são obrigatórios.");
      return;
    }
    setHLState((s) => ({
      products: s.products.map((p) =>
        p.codigo === adj.produto ? { ...p, estoqueVigente: Number(adj.quantidade) } : p),
      paramLogs: [
        {
          id: `LOG-${Date.now()}`,
          data: new Date().toISOString().slice(0, 10),
          parametro: `Ajuste de inventário — ${adj.produto}`,
          anterior: String(s.products.find((p) => p.codigo === adj.produto)?.estoqueVigente ?? ""),
          novo: `${adj.quantidade} (${adj.motivo})`,
          usuario: adj.responsavel,
        },
        ...s.paramLogs,
      ],
    }));
    toast.success("Ajuste de inventário registrado com log imutável.");
    setOpen(false);
    setAdj({ produto: "", quantidade: "", motivo: "", responsavel: "", observacao: "" });
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Estoque do Almoxarifado"
        description="Posição vigente, cobertura e status logístico de cada material de higiene."
        actions={
          <>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Settings2 className="mr-2 h-4 w-4" />Ajuste de Inventário</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Ajuste de Inventário</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>Produto *</Label>
                    <Select value={adj.produto} onValueChange={(v) => setAdj({ ...adj, produto: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {products.map((p) => <SelectItem key={p.codigo} value={p.codigo}>{p.codigo} — {p.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>Quantidade nova *</Label>
                    <Input type="number" value={adj.quantidade} onChange={(e) => setAdj({ ...adj, quantidade: e.target.value })} />
                  </div>
                  <div>
                    <Label>Motivo *</Label>
                    <Select value={adj.motivo} onValueChange={(v) => setAdj({ ...adj, motivo: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
                      <SelectContent>{MOTIVOS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div><Label>Responsável *</Label>
                    <Input value={adj.responsavel} onChange={(e) => setAdj({ ...adj, responsavel: e.target.value })} />
                  </div>
                  <div><Label>Observação</Label>
                    <Textarea value={adj.observacao} onChange={(e) => setAdj({ ...adj, observacao: e.target.value })} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={salvarAjuste}>Registrar ajuste</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="outline" onClick={() =>
              exportCsv("estoque-ccih",
                ["Produto", "Código", "Unidade", "Qtd", "Local", "Lote", "Validade", "CMM", "CMD", "Cobertura", "Status"],
                rows.map(({ p, m }) => [p.nome, p.codigo, p.unidadeEntrada, p.estoqueVigente, p.local, p.lote, p.validade, m.cmm, m.cmd, m.coberturaAtual, STATUS_META[m.status].label]))
            }><Download className="mr-2 h-4 w-4" />CSV</Button>
            <Button size="sm" variant="outline" onClick={() => window.print()}>
              <FileText className="mr-2 h-4 w-4" />PDF
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-2">
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={classe} onValueChange={setClasse}>
          <SelectTrigger className="h-9 w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Classe ABC</SelectItem>
            <SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="C">C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={criticidade} onValueChange={setCriticidade}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Criticidade</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem><SelectItem value="Média">Média</SelectItem><SelectItem value="Baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Status logístico</SelectItem>
            {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.dot} {v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <SectionCard title="Posição de estoque" description={`${rows.length} itens · parâmetros 20+5 dias`}>
        <DataTable
          rows={rows}
          searchKeys={({ p }) => `${p.nome} ${p.codigo} ${p.categoria}`}
          columns={[
            { key: "nome", header: "Produto", sortValue: ({ p }) => p.nome, render: ({ p }) => <span className="font-medium">{p.nome}</span> },
            { key: "cod", header: "Código", sortValue: ({ p }) => p.codigo, render: ({ p }) => p.codigo },
            { key: "un", header: "Unidade", render: ({ p }) => p.unidadeEntrada },
            { key: "qtd", header: "Qtd Atual", sortValue: ({ p }) => p.estoqueVigente, render: ({ p }) => p.estoqueVigente },
            { key: "local", header: "Local", render: ({ p }) => p.local },
            { key: "lote", header: "Lote", render: ({ p }) => p.lote },
            { key: "val", header: "Validade", render: ({ p }) => p.validade },
            { key: "ent", header: "Últ. Entrada", render: ({ p }) => p.ultimaEntrada },
            { key: "sai", header: "Últ. Saída", render: ({ p }) => p.ultimaSaida },
            { key: "cmm", header: <span className="inline-flex items-center gap-1">CMM <InfoTip text={FORMULA_TIPS.cmm} /></span>, sortValue: ({ m }) => m.cmm, render: ({ m }) => m.cmm },
            { key: "cmd", header: <span className="inline-flex items-center gap-1">CMD <InfoTip text={FORMULA_TIPS.cmd} /></span>, render: ({ m }) => m.cmd },
            { key: "cob", header: <span className="inline-flex items-center gap-1">Cobertura <InfoTip text={FORMULA_TIPS.cobertura} /></span>, sortValue: ({ m }) => m.coberturaAtual, render: ({ m }) => `${m.coberturaAtual} d` },
            { key: "st", header: "Status", render: ({ m }) => <StatusBadge status={m.status} /> },
          ]}
        />
      </SectionCard>
    </div>
  );
}
