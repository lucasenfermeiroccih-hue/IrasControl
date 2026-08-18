import { useState } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { setHLState, useHL } from "../store";
import { DataTable, HLPageHeader, KpiCard, SectionCard } from "../components/HLCommon";

export default function HLSettings() {
  const { params, paramLogs, sectors, suppliers } = useHL();
  const [draft, setDraft] = useState(params);
  const [novoSetor, setNovoSetor] = useState("");
  const [novoFornecedor, setNovoFornecedor] = useState("");

  const alvo = draft.coberturaOperacional + draft.diasSeguranca;

  const salvar = () => {
    const changes = (Object.keys(draft) as (keyof typeof draft)[])
      .filter((k) => draft[k] !== params[k])
      .map((k) => ({
        id: `LOG-${Date.now()}-${k}`,
        data: new Date().toISOString().slice(0, 10),
        parametro: String(k),
        anterior: String(params[k]),
        novo: String(draft[k]),
        usuario: "Coord. CCIH",
      }));
    if (!changes.length) { toast.info("Nenhuma alteração a registrar."); return; }
    setHLState((s) => ({
      params: { ...draft, estoqueAlvoDias: alvo },
      paramLogs: [...changes, ...s.paramLogs],
    }));
    toast.success("Parâmetros atualizados — log imutável registrado.");
  };

  const num = (k: keyof typeof draft, label: string) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input className="h-8" type="number" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: Number(e.target.value) })} />
    </div>
  );

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader title="Configurações Logísticas" description="Parâmetros globais do modelo 20+5, setores, fornecedores e log imutável de alterações." />

      <div className="grid gap-3 sm:grid-cols-3">
        <KpiCard label="Cobertura operacional" value={`${params.coberturaOperacional} dias`} tone="info" />
        <KpiCard label="Estoque de segurança" value={`${params.diasSeguranca} dias`} tone="warning" />
        <KpiCard label="Estoque alvo" value={`${params.coberturaOperacional + params.diasSeguranca} dias`} tone="success" />
      </div>

      <SectionCard title="Parâmetros globais">
        <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-4">
          {num("coberturaOperacional", "Cobertura operacional (dias)")}
          {num("diasSeguranca", "Dias de segurança")}
          <div>
            <Label className="text-xs">Estoque alvo (dias) — calculado</Label>
            <Input className="h-8 bg-muted" readOnly value={alvo} />
          </div>
          {num("leadTimePadrao", "Lead time padrão (dias)")}
          {num("janelaAlertaDias", "Janela de alerta (dias)")}
          {num("abcLimiteA", "% limite curva A")}
          {num("abcLimiteB", "% limite curva B")}
        </div>
        <Button className="mt-3" onClick={salvar}><Save className="mr-2 h-4 w-4" />Salvar parâmetros</Button>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Setores ativos">
          <div className="mb-3 flex gap-2">
            <Input className="h-8" placeholder="Novo setor" value={novoSetor} onChange={(e) => setNovoSetor(e.target.value)} />
            <Button size="sm" onClick={() => {
              if (!novoSetor.trim()) return;
              setHLState((s) => ({ sectors: [...s.sectors, novoSetor.trim()] }));
              setNovoSetor("");
              toast.success("Setor adicionado.");
            }}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1">
            {sectors.map((s) => (
              <div key={s} className="flex items-center justify-between rounded-md border px-2 py-1 text-sm">
                {s}
                <Button size="icon" variant="ghost" className="h-6 w-6"
                  onClick={() => setHLState((st) => ({ sectors: st.sectors.filter((x) => x !== s) }))}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Fornecedores cadastrados">
          <div className="mb-3 flex gap-2">
            <Input className="h-8" placeholder="Novo fornecedor" value={novoFornecedor} onChange={(e) => setNovoFornecedor(e.target.value)} />
            <Button size="sm" onClick={() => {
              if (!novoFornecedor.trim()) return;
              setHLState((s) => ({ suppliers: [...s.suppliers, novoFornecedor.trim()] }));
              setNovoFornecedor("");
              toast.success("Fornecedor adicionado.");
            }}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-1">
            {suppliers.map((f) => (
              <div key={f} className="flex items-center justify-between rounded-md border px-2 py-1 text-sm">
                {f}
                <Button size="icon" variant="ghost" className="h-6 w-6"
                  onClick={() => setHLState((st) => ({ suppliers: st.suppliers.filter((x) => x !== f) }))}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Log de alterações de parâmetros" description="Registro imutável — somente leitura">
        <DataTable
          searchable={false}
          rows={paramLogs}
          pageSize={10}
          columns={[
            { key: "data", header: "Data", render: (l) => l.data },
            { key: "par", header: "Parâmetro", render: (l) => l.parametro },
            { key: "ant", header: "Valor anterior", render: (l) => l.anterior },
            { key: "novo", header: "Novo valor", render: (l) => l.novo },
            { key: "user", header: "Usuário", render: (l) => l.usuario },
          ]}
        />
      </SectionCard>
    </div>
  );
}
