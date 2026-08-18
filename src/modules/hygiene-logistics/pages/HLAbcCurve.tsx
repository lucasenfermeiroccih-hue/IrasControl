import { useMemo, useState } from "react";
import {
  Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useHL } from "../store";
import { brl, buildAbcCurve, RECOMENDACAO_ABC } from "../utils/logisticsFormulas";
import { DataTable, HLPageHeader, SectionCard } from "../components/HLCommon";

const CRITICIDADES = ["Alta", "Média", "Baixa"] as const;
const CLASSES = ["A", "B", "C"] as const;

function cellTone(classe: string, crit: string) {
  if (classe === "A" && crit === "Alta") return "bg-destructive/15 border-destructive/40";
  if ((classe === "A" && crit === "Média") || (classe === "B" && crit === "Alta")) return "bg-orange-500/15 border-orange-500/40";
  if ((classe === "B" && crit === "Média") || (classe === "C" && crit === "Alta")) return "bg-yellow-500/15 border-yellow-500/40";
  return "bg-emerald-500/10 border-emerald-500/30";
}

function cellRecomendacao(classe: string, crit: string) {
  if (classe === "A" && crit === "Alta") return "Controle diário, estoque de segurança ampliado e contrato de fornecimento garantido.";
  if (classe === "A") return "Monitoramento semanal com revisão financeira do pedido.";
  if (classe === "B" && crit === "Alta") return "Monitoramento semanal assistencial; nunca deixar abaixo do lead time.";
  if (crit === "Alta") return "Baixo valor, alto impacto: manter estoque folgado, compra em lote.";
  return "Controle simplificado, contagem mensal.";
}

export default function HLAbcCurve() {
  const { products, params } = useHL();
  const [visao, setVisao] = useState<"financeira" | "critica">("financeira");

  const abc = useMemo(() => buildAbcCurve(products, params), [products, params]);

  const chartData = abc.map((r) => ({
    nome: r.product.codigo,
    valor: r.valor,
    acumulado: r.acumulado,
  }));

  const ordered = visao === "financeira"
    ? abc
    : [...abc].sort((a, b) => {
        const w = { Alta: 0, Média: 1, Baixa: 2 } as Record<string, number>;
        return (w[a.product.criticidade ?? "Baixa"] - w[b.product.criticidade ?? "Baixa"]) || b.valor - a.valor;
      });

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Curva ABC"
        description="Classificação por valor de consumo mensal (A ≤ 80%, B ≤ 95%, C > 95%) cruzada com criticidade assistencial."
        actions={
          <div className="flex gap-1 rounded-md border p-0.5">
            <Button size="sm" variant={visao === "financeira" ? "default" : "ghost"} onClick={() => setVisao("financeira")}>Visão financeira</Button>
            <Button size="sm" variant={visao === "critica" ? "default" : "ghost"} onClick={() => setVisao("critica")}>Visão crítica</Button>
          </div>
        }
      />

      <SectionCard title="Gráfico de Pareto" description="Barras: valor de consumo mensal · Linha: % acumulado">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="nome" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={70} />
            <YAxis yAxisId="l" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="r" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
            <RTooltip formatter={(v: number, n: string) => (n === "acumulado" ? `${v}%` : brl(v))} />
            <Bar yAxisId="l" dataKey="valor" name="Valor consumo mensal" fill="#0ea5a4" radius={[4, 4, 0, 0]} />
            <Line yAxisId="r" dataKey="acumulado" name="acumulado" stroke="#ef4444" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </SectionCard>

      <SectionCard title="Classificação ABC" description="Ordenada por valor de consumo mensal decrescente">
        <DataTable
          rows={ordered}
          pageSize={20}
          searchKeys={(r) => `${r.product.nome} ${r.product.codigo} ${r.classe}`}
          rowClassName={(r) =>
            r.classe === "A" ? "bg-destructive/5"
              : r.classe === "B" ? "bg-yellow-500/5" : ""
          }
          columns={[
            { key: "rk", header: "#", render: (r) => r.ranking },
            { key: "nome", header: "Produto", render: (r) => <span className="font-medium">{r.product.nome}</span> },
            { key: "cat", header: "Categoria", render: (r) => r.product.categoria },
            { key: "cmm", header: "CMM", render: (r) => r.product.cmm },
            { key: "cu", header: "Custo Unitário", render: (r) => brl(r.product.custoUnitario) },
            { key: "vl", header: "Valor Consumo Mensal", sortValue: (r) => r.valor, render: (r) => brl(r.valor) },
            { key: "pi", header: "% Individual", render: (r) => `${r.percentual}%` },
            { key: "pa", header: "% Acumulado", render: (r) => `${r.acumulado}%` },
            { key: "cl", header: "Classe", render: (r) => (
              <Badge variant="outline" className={
                r.classe === "A" ? "border-destructive/40 bg-destructive/10 text-destructive"
                  : r.classe === "B" ? "border-yellow-500/40 bg-yellow-500/10 text-yellow-700"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
              }>{r.classe}</Badge>
            ) },
            { key: "crit", header: "Criticidade", render: (r) => r.product.criticidade },
            { key: "rec", header: "Recomendação de Controle", className: "max-w-[280px] whitespace-normal", render: (r) => <span className="text-[11px] text-muted-foreground">{RECOMENDACAO_ABC[r.classe]}</span> },
          ]}
        />
      </SectionCard>

      <SectionCard title="Matriz ABC × Criticidade" description="Cruzamento de relevância financeira com impacto assistencial">
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 text-xs">
            <thead>
              <tr>
                <th className="w-16" />
                {CRITICIDADES.map((c) => <th key={c} className="p-1 text-center font-semibold">Criticidade {c}</th>)}
              </tr>
            </thead>
            <tbody>
              {CLASSES.map((cl) => (
                <tr key={cl}>
                  <th className="p-1 text-center font-semibold">Classe {cl}</th>
                  {CRITICIDADES.map((crit) => {
                    const items = abc.filter((r) => r.classe === cl && r.product.criticidade === crit);
                    return (
                      <td key={crit} className={cn("rounded-md border p-2 align-top", cellTone(cl, crit))}>
                        <p className="mb-1 font-semibold">{cl} + {crit} ({items.length})</p>
                        <ul className="mb-1 space-y-0.5">
                          {items.slice(0, 6).map((r) => <li key={r.product.codigo}>• {r.product.nome}</li>)}
                          {items.length === 0 && <li className="text-muted-foreground">Sem itens</li>}
                        </ul>
                        <p className="text-[10px] text-muted-foreground">{cellRecomendacao(cl, crit)}</p>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
