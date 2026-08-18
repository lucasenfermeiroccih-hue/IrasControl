import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import {
  Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceDot, ReferenceLine,
  ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHL } from "../store";
import { buildSawtooth, FORMULA_TIPS } from "../utils/logisticsFormulas";
import { HLPageHeader, InfoTip, SectionCard } from "../components/HLCommon";

const fmt = (d: Date) => d.toLocaleDateString("pt-BR");

export default function HLSawtooth() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { products, params } = useHL();

  const product = products.find((p) => p.codigo === productId) ?? products[0];
  const data = useMemo(() => (product ? buildSawtooth(product, params) : null), [product, params]);

  if (!product || !data) return <div className="p-6">Produto não encontrado.</div>;

  const { metrics: m } = data;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Curva Dente de Serra"
        description="Projeção de saldo em 60 dias (30 passados + 30 projetados) com ponto de pedido e estoque de segurança."
        actions={
          <Select value={product.codigo} onValueChange={(v) => navigate(`/hygiene-logistics/sawtooth/${v}`)}>
            <SelectTrigger className="h-9 w-[320px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {products.map((p) => (
                <SelectItem key={p.codigo} value={p.codigo}>
                  {p.codigo} — {p.nome} ({p.categoria} · {p.curvaABC})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
        <SectionCard title={`Projeção — ${product.nome}`} description="Azul: saldo projetado · Amarelo: ponto de pedido · Vermelho: estoque de segurança">
          <ResponsiveContainer width="100%" height={400}>
            <ComposedChart data={data.pontos}>
              <defs>
                <linearGradient id="cicloAtual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="proxCiclo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={4} />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <Legend />
              <Area dataKey="ciclo" name="Ciclo atual" stroke="none" fill="url(#cicloAtual)" />
              <Area dataKey="proximoCiclo" name="Próximo ciclo" stroke="none" fill="url(#proxCiclo)" />
              <Line dataKey="saldo" name="Saldo projetado" stroke="#2563eb" strokeWidth={2} dot={false} />
              <Line dataKey="pontoPedido" name="Ponto de pedido" stroke="#eab308" strokeWidth={2} strokeDasharray="6 4" dot={false} />
              <Line dataKey="seguranca" name="Estoque de segurança" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              <ReferenceLine x={data.pontos[30]?.label} stroke="#94a3b8" label={{ value: "Hoje", fontSize: 10 }} />
              <ReferenceDot
                x={data.pontos[30 + data.diaPedido]?.label}
                y={data.pontos[30 + data.diaPedido]?.saldo ?? 0}
                r={6} fill="#8b5cf6" stroke="#fff"
                label={{ value: "Pedir", fontSize: 10, position: "top" }}
              />
              <ReferenceDot
                x={data.pontos[Math.min(60, 30 + data.diaChegada)]?.label}
                y={data.pontos[Math.min(60, 30 + data.diaChegada)]?.saldo ?? 0}
                r={6} fill="#10b981" stroke="#fff"
                label={{ value: "Chegada", fontSize: 10, position: "top" }}
              />
              {data.riscoRuptura && (
                <ReferenceDot
                  x={data.pontos[Math.min(60, 30 + data.diasAteRuptura)]?.label}
                  y={0} r={6} fill="#ef4444" stroke="#fff"
                  label={{ value: "Ruptura", fontSize: 10, position: "top" }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Resumo operacional">
          <div className="space-y-2 text-sm">
            {[
              ["Estoque atual", `${product.estoqueVigente} ${product.unidadeEntrada}`, ""],
              ["Cobertura atual", `${m.coberturaAtual} dias`, FORMULA_TIPS.cobertura],
              ["Ponto de pedido", `${m.pontoPedidoQtd} un (${m.pontoPedidoDias} dias)`, FORMULA_TIPS.pontoPedido],
              ["Data para pedir", fmt(data.dataPedido), FORMULA_TIPS.diasAtePedir],
              ["Data prevista de chegada", fmt(data.dataChegada), "Data do pedido + lead time do produto."],
              ["Estoque projetado na chegada", `${data.estoqueNaChegada} un`, "Estoque atual − (CMD × dias até a chegada)."],
              ["Compra técnica sugerida", `${m.compraTecnica} un`, FORMULA_TIPS.compraTecnica],
            ].map(([label, value, tip]) => (
              <div key={label} className="flex items-center justify-between gap-2 border-b pb-1 last:border-0">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  {label} {tip && <InfoTip text={tip} />}
                </span>
                <span className="font-semibold">{value}</span>
              </div>
            ))}
          </div>
          {data.riscoRuptura && (
            <div className="mt-3 flex gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>
                <strong>RISCO DE RUPTURA:</strong> o estoque chegará a zero em {data.diasAteRuptura} dias,
                antes da entrega prevista em {fmt(data.dataChegada)}.
              </span>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
