import { useMemo, useState } from "react";
import { CalendarDays, Download, Pencil, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHL } from "../store";
import { DataTable, exportCsv, HLPageHeader, KpiCard, SectionCard } from "../components/HLCommon";

type Periodicidade = "Semanal" | "Quinzenal" | "Mensal" | "Bimestral";

interface ScheduleRow {
  productCode: string;
  periodicidade: Periodicidade;
  diaPedido: string;
  qtdPadrao: number;
  ultimoPedido: string;
}

const PERIOD_DAYS: Record<Periodicidade, number> = {
  Semanal: 7, Quinzenal: 15, Mensal: 30, Bimestral: 60,
};

const DIAS_SEMANA = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"];

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round((new Date(a + "T12:00:00").getTime() - new Date(b + "T12:00:00").getTime()) / 86400000);
}

function scheduleStatus(proximoPedido: string, today: string) {
  const diff = diffDays(proximoPedido, today);
  if (diff < 0) return { label: "Vencido", cls: "border-destructive/40 bg-destructive/10 text-destructive" };
  if (diff === 0) return { label: "Vence Hoje", cls: "border-orange-500/40 bg-orange-500/10 text-orange-600" };
  if (diff <= 3) return { label: "Atenção", cls: "border-yellow-500/40 bg-yellow-500/10 text-yellow-600" };
  return { label: "No Prazo", cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600" };
}

export default function HLOrderSchedule() {
  const { products } = useHL();
  const today = new Date().toISOString().slice(0, 10);

  // Initialize schedule from product data (ultimaEntrada as proxy for last order)
  const [schedule, setSchedule] = useState<Record<string, ScheduleRow>>(() =>
    Object.fromEntries(
      products.map((p, i) => {
        const periods: Periodicidade[] = ["Mensal", "Quinzenal", "Semanal", "Bimestral", "Mensal"];
        const periodicidade = periods[i % 5];
        return [
          p.codigo,
          {
            productCode: p.codigo,
            periodicidade,
            diaPedido: periodicidade === "Semanal" || periodicidade === "Quinzenal" ? "Segunda" : "5",
            qtdPadrao: p.pedidoMes ?? 0,
            ultimoPedido: p.ultimaEntrada || today,
          },
        ];
      })
    )
  );

  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editBuf, setEditBuf] = useState<ScheduleRow | null>(null);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return products
      .filter((p) => !q || p.nome.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q) || p.fornecedor.toLowerCase().includes(q))
      .map((p) => {
        const s = schedule[p.codigo] ?? {
          productCode: p.codigo, periodicidade: "Mensal" as Periodicidade,
          diaPedido: "5", qtdPadrao: p.pedidoMes ?? 0, ultimoPedido: today,
        };
        const proximoPedido = addDays(s.ultimoPedido, PERIOD_DAYS[s.periodicidade]);
        const st = scheduleStatus(proximoPedido, today);
        return { p, s, proximoPedido, st };
      })
      .sort((a, b) => diffDays(a.proximoPedido, today) - diffDays(b.proximoPedido, today));
  }, [products, schedule, search, today]);

  const vencidos = rows.filter((r) => r.st.label === "Vencido").length;
  const venceHoje = rows.filter((r) => r.st.label === "Vence Hoje").length;
  const atencao = rows.filter((r) => r.st.label === "Atenção").length;
  const noPrazo = rows.filter((r) => r.st.label === "No Prazo").length;

  const startEdit = (code: string) => {
    setEditingCode(code);
    setEditBuf({ ...schedule[code] });
  };

  const saveEdit = () => {
    if (!editingCode || !editBuf) return;
    setSchedule((s) => ({ ...s, [editingCode]: { ...editBuf } }));
    setEditingCode(null);
    setEditBuf(null);
  };

  const cancelEdit = () => { setEditingCode(null); setEditBuf(null); };

  const handleExport = () => {
    exportCsv(
      "grade-pedidos",
      ["Código", "Produto", "Fornecedor", "Periodicidade", "Dia do Pedido", "Qtd Padrão", "Último Pedido", "Próximo Pedido", "Status"],
      rows.map((r) => [r.p.codigo, r.p.nome, r.p.fornecedor, r.s.periodicidade, r.s.diaPedido, r.s.qtdPadrao, r.s.ultimoPedido, r.proximoPedido, r.st.label])
    );
  };

  const isWeekly = (per: Periodicidade) => per === "Semanal" || per === "Quinzenal";

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Grade de Pedidos"
        description="Cronograma de compras por produto — periodicidade, dia de referência e próximas datas de pedido."
        actions={
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Exportar CSV
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pedidos vencidos" value={vencidos} tone="danger" />
        <KpiCard label="Vence hoje" value={venceHoje} tone="warning" />
        <KpiCard label="Atenção (≤3 dias)" value={atencao} tone="info" />
        <KpiCard label="No prazo" value={noPrazo} tone="success" />
      </div>

      <SectionCard title="Cronograma de compras" description={`${rows.length} produtos • ordenados por urgência`}>
        <div className="mb-3">
          <Input
            placeholder="Buscar produto, código ou fornecedor..."
            className="h-9 max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <DataTable
          rows={rows}
          pageSize={25}
          searchKeys={() => ""}
          rowClassName={(r) => {
            if (r.st.label === "Vencido") return "bg-destructive/5";
            if (r.st.label === "Vence Hoje") return "bg-orange-500/5";
            if (r.st.label === "Atenção") return "bg-yellow-500/5";
            return "";
          }}
          columns={[
            {
              key: "cod",
              header: "Código",
              render: (r) => <span className="font-mono text-xs">{r.p.codigo}</span>,
            },
            {
              key: "nome",
              header: "Produto",
              render: (r) => <span className="font-medium">{r.p.nome}</span>,
            },
            {
              key: "forn",
              header: "Fornecedor",
              render: (r) => <span className="text-xs text-muted-foreground">{r.p.fornecedor}</span>,
            },
            {
              key: "per",
              header: "Periodicidade",
              render: (r) =>
                editingCode === r.p.codigo && editBuf ? (
                  <Select
                    value={editBuf.periodicidade}
                    onValueChange={(v) => setEditBuf({ ...editBuf, periodicidade: v as Periodicidade, diaPedido: isWeekly(v as Periodicidade) ? "Segunda" : "5" })}
                  >
                    <SelectTrigger className="h-7 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["Semanal", "Quinzenal", "Mensal", "Bimestral"] as Periodicidade[]).map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="text-xs">{r.s.periodicidade}</Badge>
                ),
            },
            {
              key: "dia",
              header: "Dia do Pedido",
              render: (r) =>
                editingCode === r.p.codigo && editBuf ? (
                  isWeekly(editBuf.periodicidade) ? (
                    <Select value={editBuf.diaPedido} onValueChange={(v) => setEditBuf({ ...editBuf, diaPedido: v })}>
                      <SelectTrigger className="h-7 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {DIAS_SEMANA.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      className="h-7 w-20"
                      type="number" min={1} max={28}
                      value={editBuf.diaPedido}
                      onChange={(e) => setEditBuf({ ...editBuf, diaPedido: e.target.value })}
                      placeholder="Dia"
                    />
                  )
                ) : (
                  <span className="text-sm">
                    {isWeekly(r.s.periodicidade) ? r.s.diaPedido : `Dia ${r.s.diaPedido}`}
                  </span>
                ),
            },
            {
              key: "qtd",
              header: "Qtd Padrão",
              render: (r) =>
                editingCode === r.p.codigo && editBuf ? (
                  <Input
                    className="h-7 w-20"
                    type="number" min={0}
                    value={editBuf.qtdPadrao}
                    onChange={(e) => setEditBuf({ ...editBuf, qtdPadrao: Number(e.target.value) })}
                  />
                ) : (
                  <span className="font-semibold">{r.s.qtdPadrao}</span>
                ),
            },
            {
              key: "ult",
              header: "Último Pedido",
              render: (r) =>
                editingCode === r.p.codigo && editBuf ? (
                  <Input
                    className="h-7 w-36"
                    type="date"
                    value={editBuf.ultimoPedido}
                    onChange={(e) => setEditBuf({ ...editBuf, ultimoPedido: e.target.value })}
                  />
                ) : (
                  <span className="text-sm tabular-nums">
                    {r.s.ultimoPedido ? new Date(r.s.ultimoPedido + "T12:00:00").toLocaleDateString("pt-BR") : "—"}
                  </span>
                ),
            },
            {
              key: "prox",
              header: "Próximo Pedido",
              sortValue: (r) => r.proximoPedido,
              render: (r) => (
                <span className="flex items-center gap-1.5 text-sm tabular-nums font-medium">
                  <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                  {new Date(r.proximoPedido + "T12:00:00").toLocaleDateString("pt-BR")}
                </span>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (r) => <Badge variant="outline" className={`text-xs ${r.st.cls}`}>{r.st.label}</Badge>,
            },
            {
              key: "ac",
              header: "",
              render: (r) =>
                editingCode === r.p.codigo ? (
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600" onClick={saveEdit}><Save className="h-3.5 w-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={cancelEdit}><X className="h-3.5 w-3.5" /></Button>
                  </div>
                ) : (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(r.p.codigo)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                ),
            },
          ]}
        />
      </SectionCard>
    </div>
  );
}
