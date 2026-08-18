import { useState } from "react";
import { FileUp, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { setHLState, useHL } from "../store";
import { brl } from "../utils/logisticsFormulas";
import { DataTable, HLPageHeader, KpiCard, SectionCard } from "../components/HLCommon";

export default function HLStockEntry() {
  const { entries, products, suppliers } = useHL();
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    nf: "", fornecedor: "", produto: "", quantidade: "", valor: "", lote: "", validade: "", conferente: "",
  });

  const salvar = () => {
    if (!form.nf || !form.produto || !form.quantidade || !form.conferente) {
      toast.error("NF, produto, quantidade e conferente são obrigatórios.");
      return;
    }
    setHLState((s) => ({
      entries: [{
        id: `ENT-${Date.now()}`,
        data: form.data, nf: form.nf, fornecedor: form.fornecedor, produto: form.produto,
        quantidade: Number(form.quantidade), valor: Number(form.valor || 0),
        lote: form.lote, validade: form.validade, conferente: form.conferente,
      }, ...s.entries],
      products: s.products.map((p) => p.nome === form.produto
        ? { ...p, estoqueVigente: p.estoqueVigente + Number(form.quantidade), ultimaEntrada: form.data, lote: form.lote || p.lote, validade: form.validade || p.validade }
        : p),
    }));
    toast.success("Entrada registrada — estoque atualizado.");
    setForm({ ...form, nf: "", produto: "", quantidade: "", valor: "", lote: "", validade: "" });
  };

  const total = entries.reduce((s, e) => s + e.valor, 0);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Entrada de Produtos (PDF/NF)"
        description="Registro de recebimento com nota fiscal, lote e validade. Movimentações não podem ser excluídas — apenas estornadas."
        actions={<Button size="sm" variant="outline" onClick={() => toast.info("Anexe o PDF da NF ao registro após salvar a entrada.")}>
          <FileUp className="mr-2 h-4 w-4" />Anexar PDF da NF
        </Button>}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Entradas registradas" value={entries.length} tone="info" />
        <KpiCard label="Valor total recebido" value={brl(total)} tone="success" />
        <KpiCard label="Fornecedores ativos" value={new Set(entries.map((e) => e.fornecedor)).size} />
      </div>

      <SectionCard title="Nova entrada">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div><Label className="text-xs">Data *</Label><Input className="h-8" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
          <div><Label className="text-xs">Nota Fiscal *</Label><Input className="h-8" value={form.nf} onChange={(e) => setForm({ ...form, nf: e.target.value })} /></div>
          <div><Label className="text-xs">Fornecedor</Label>
            <Select value={form.fornecedor} onValueChange={(v) => setForm({ ...form, fornecedor: v })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{suppliers.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Produto *</Label>
            <Select value={form.produto} onValueChange={(v) => setForm({ ...form, produto: v })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.codigo} value={p.nome}>{p.nome}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Quantidade *</Label><Input className="h-8" type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} /></div>
          <div><Label className="text-xs">Valor total</Label><Input className="h-8" type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
          <div><Label className="text-xs">Lote</Label><Input className="h-8" value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} /></div>
          <div><Label className="text-xs">Validade</Label><Input className="h-8" type="date" value={form.validade} onChange={(e) => setForm({ ...form, validade: e.target.value })} /></div>
          <div><Label className="text-xs">Conferente *</Label><Input className="h-8" value={form.conferente} onChange={(e) => setForm({ ...form, conferente: e.target.value })} /></div>
        </div>
        <Button className="mt-3" onClick={salvar}><Save className="mr-2 h-4 w-4" />Registrar entrada</Button>
      </SectionCard>

      <SectionCard title="Histórico de entradas">
        <DataTable
          rows={entries}
          searchKeys={(e) => `${e.nf} ${e.produto} ${e.fornecedor}`}
          columns={[
            { key: "data", header: "Data", sortValue: (e) => e.data, render: (e) => e.data },
            { key: "nf", header: "NF", render: (e) => e.nf },
            { key: "forn", header: "Fornecedor", render: (e) => e.fornecedor },
            { key: "prod", header: "Produto", render: (e) => e.produto },
            { key: "qtd", header: "Quantidade", sortValue: (e) => e.quantidade, render: (e) => e.quantidade },
            { key: "val", header: "Valor", sortValue: (e) => e.valor, render: (e) => brl(e.valor) },
            { key: "lote", header: "Lote", render: (e) => e.lote },
            { key: "vld", header: "Validade", render: (e) => e.validade },
            { key: "conf", header: "Conferente", render: (e) => e.conferente },
            { key: "ac", header: "", render: () => <Button size="sm" variant="ghost" onClick={() => toast.info("Estorno exige justificativa — exclusão não permitida.")}>Estornar</Button> },
          ]}
        />
      </SectionCard>
    </div>
  );
}
