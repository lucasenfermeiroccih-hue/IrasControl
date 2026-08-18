import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { setHLState, useHL } from "../store";
import { computeMetrics } from "../utils/logisticsFormulas";
import { DataTable, HLPageHeader, KpiCard, SectionCard } from "../components/HLCommon";

const TURNOS = ["Manhã", "Tarde", "Noite"] as const;

export default function HLSectorOutput() {
  const { outputs, products, sectors, params } = useHL();
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    turno: "Manhã" as (typeof TURNOS)[number],
    setor: "",
    produto: "",
    solicitada: "",
    liberada: "",
    respSolicitacao: "",
    respSeparacao: "",
    respRetirada: "",
    justificativa: "",
    observacao: "",
  });
  const [fSetor, setFSetor] = useState("todos");
  const [fTurno, setFTurno] = useState("todos");
  const [fData, setFData] = useState("");

  const produtoSel = products.find((p) => p.nome === form.produto);
  const sugerida = produtoSel ? Math.max(1, Math.round(computeMetrics(produtoSel, params).cmd * 3)) : 0;

  const mediaPorSetor = useMemo(() => {
    const map = new Map<string, number[]>();
    outputs.forEach((o) => map.set(o.setor, [...(map.get(o.setor) ?? []), o.liberada]));
    const geral = outputs.reduce((s, o) => s + o.liberada, 0) / Math.max(1, outputs.length);
    const out = new Map<string, { media: number; geral: number }>();
    map.forEach((v, k) => out.set(k, { media: v.reduce((a, b) => a + b, 0) / v.length, geral }));
    return out;
  }, [outputs]);

  const filtered = outputs.filter((o) =>
    (fSetor === "todos" || o.setor === fSetor) &&
    (fTurno === "todos" || o.turno === fTurno) &&
    (!fData || o.data === fData));

  const salvar = () => {
    if (!form.setor) { toast.error("Setor é obrigatório — não é possível registrar a saída sem setor definido."); return; }
    if (!form.produto) { toast.error("Selecione o produto."); return; }
    if (!form.liberada) { toast.error("Informe a quantidade liberada."); return; }
    if (Number(form.liberada) !== sugerida && !form.justificativa.trim()) {
      toast.error("Justificativa obrigatória quando a quantidade liberada difere da sugerida.");
      return;
    }
    if (produtoSel?.status === "Fora da grade") {
      toast.error("Item fora da grade: saída bloqueada, exige aprovação da CCIH.");
      return;
    }
    setHLState((s) => ({
      outputs: [{
        id: `SAI-${Date.now()}`,
        data: form.data,
        turno: form.turno,
        setor: form.setor,
        produto: form.produto,
        solicitada: Number(form.solicitada || form.liberada),
        sugerida,
        liberada: Number(form.liberada),
        respSolicitacao: form.respSolicitacao,
        respSeparacao: form.respSeparacao,
        respRetirada: form.respRetirada,
        status: Number(form.liberada) === sugerida ? "Liberado" : Number(form.liberada) > sugerida ? "Liberado acima" : "Liberado parcial",
        justificativa: form.justificativa,
        observacao: form.observacao,
      }, ...s.outputs],
      products: s.products.map((p) => p.nome === form.produto
        ? { ...p, estoqueVigente: Math.max(0, p.estoqueVigente - Number(form.liberada)), ultimaSaida: form.data }
        : p),
    }));
    toast.success("Saída registrada e estoque atualizado.");
    setForm({ ...form, produto: "", solicitada: "", liberada: "", justificativa: "", observacao: "" });
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader title="Saída Diária por Setor" description="Lançamento controlado de insumos por setor, turno e responsável." />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Saídas registradas" value={outputs.length} tone="info" />
        <KpiCard label="Setores atendidos" value={new Set(outputs.map((o) => o.setor)).size} />
        <KpiCard label="Liberações acima da sugestão" value={outputs.filter((o) => o.liberada > o.sugerida).length} tone="warning" />
        <KpiCard label="Sem justificativa" value={outputs.filter((o) => o.liberada !== o.sugerida && !o.justificativa).length} tone="danger" />
      </div>

      <SectionCard title="Novo lançamento" description="Campos com * são obrigatórios">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          <div><Label className="text-xs">Data *</Label>
            <Input className="h-8" type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} /></div>
          <div><Label className="text-xs">Turno *</Label>
            <Select value={form.turno} onValueChange={(v) => setForm({ ...form, turno: v as (typeof TURNOS)[number] })}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>{TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Setor *</Label>
            <Select value={form.setor} onValueChange={(v) => setForm({ ...form, setor: v })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Obrigatório" /></SelectTrigger>
              <SelectContent>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Produto *</Label>
            <Select value={form.produto} onValueChange={(v) => setForm({ ...form, produto: v })}>
              <SelectTrigger className="h-8"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>{products.map((p) => <SelectItem key={p.codigo} value={p.nome}>{p.nome}</SelectItem>)}</SelectContent>
            </Select></div>
          <div><Label className="text-xs">Qtd Solicitada</Label>
            <Input className="h-8" type="number" value={form.solicitada} onChange={(e) => setForm({ ...form, solicitada: e.target.value })} /></div>
          <div><Label className="text-xs">Qtd Sugerida (automática)</Label>
            <Input className="h-8 bg-muted" readOnly value={sugerida} /></div>
          <div><Label className="text-xs">Qtd Liberada *</Label>
            <Input className="h-8" type="number" value={form.liberada} onChange={(e) => setForm({ ...form, liberada: e.target.value })} /></div>
          <div><Label className="text-xs">Resp. Solicitação</Label>
            <Input className="h-8" value={form.respSolicitacao} onChange={(e) => setForm({ ...form, respSolicitacao: e.target.value })} /></div>
          <div><Label className="text-xs">Resp. Separação</Label>
            <Input className="h-8" value={form.respSeparacao} onChange={(e) => setForm({ ...form, respSeparacao: e.target.value })} /></div>
          <div><Label className="text-xs">Resp. Retirada</Label>
            <Input className="h-8" value={form.respRetirada} onChange={(e) => setForm({ ...form, respRetirada: e.target.value })} /></div>
          <div className="md:col-span-2"><Label className="text-xs">Justificativa (obrigatória se liberado ≠ sugerido)</Label>
            <Input className="h-8" value={form.justificativa} onChange={(e) => setForm({ ...form, justificativa: e.target.value })} /></div>
          <div className="md:col-span-3"><Label className="text-xs">Observação</Label>
            <Textarea rows={2} value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></div>
        </div>
        <Button className="mt-3" onClick={salvar}><Save className="mr-2 h-4 w-4" />Registrar saída</Button>
      </SectionCard>

      <SectionCard
        title="Histórico de saídas"
        actions={
          <div className="flex flex-wrap gap-2">
            <Input className="h-8 w-36" type="date" value={fData} onChange={(e) => setFData(e.target.value)} />
            <Select value={fSetor} onValueChange={setFSetor}>
              <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos os setores</SelectItem>{sectors.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={fTurno} onValueChange={setFTurno}>
              <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos turnos</SelectItem>{TURNOS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        }
      >
        <DataTable
          rows={filtered}
          pageSize={15}
          searchKeys={(o) => `${o.setor} ${o.produto} ${o.respSolicitacao}`}
          columns={[
            { key: "data", header: "Data", sortValue: (o) => o.data, render: (o) => o.data },
            { key: "turno", header: "Turno", render: (o) => o.turno },
            { key: "setor", header: "Setor", render: (o) => o.setor },
            { key: "prod", header: "Produto", render: (o) => o.produto },
            { key: "sol", header: "Solicitada", render: (o) => o.solicitada },
            { key: "sug", header: "Sugerida", render: (o) => o.sugerida },
            { key: "lib", header: "Liberada", render: (o) => o.liberada },
            { key: "resp", header: "Responsáveis", render: (o) => <span className="text-[11px]">{[o.respSolicitacao, o.respSeparacao, o.respRetirada].filter(Boolean).join(" / ")}</span> },
            { key: "alerta", header: "Alertas", render: (o) => {
              const stats = mediaPorSetor.get(o.setor);
              const chips: JSX.Element[] = [];
              if (stats && o.liberada > stats.media * 1.4)
                chips.push(<Badge key="a" variant="outline" className="border-orange-500/40 bg-orange-500/10 text-orange-600">+40% acima da média</Badge>);
              if (stats && o.liberada < stats.media * 0.5)
                chips.push(<Badge key="b" variant="outline" className="bg-muted text-muted-foreground">Possível sub-registro</Badge>);
              if (o.liberada > o.sugerida && !o.justificativa)
                chips.push(<Badge key="c" variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive">Sem justificativa</Badge>);
              return <div className="flex flex-wrap gap-1">{chips}</div>;
            } },
            { key: "just", header: "Justificativa", className: "max-w-[200px] whitespace-normal", render: (o) => <span className="text-[11px] text-muted-foreground">{o.justificativa}</span> },
          ]}
        />
      </SectionCard>
    </div>
  );
}
