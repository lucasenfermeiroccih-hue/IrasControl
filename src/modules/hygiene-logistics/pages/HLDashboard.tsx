import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Bell, ClipboardList, Droplets, PackageX, Trash2, TrendingDown,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip as RTooltip, XAxis, YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIAS, TOTAL_DISP_QUEBRADOS, TOTAL_LIXEIRAS_QUEBRADAS } from "../data/mockData";
import { useHL } from "../store";
import { buildAbcCurve, computeMetrics, brl, FORMULA_TIPS } from "../utils/logisticsFormulas";
import { DataTable, HLPageHeader, InfoTip, KpiCard, SectionCard, StatusBadge } from "../components/HLCommon";

const CAT_COLORS = ["#0ea5a4", "#6366f1", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#0284c7", "#64748b"];

export default function HLDashboard() {
  const { products, params, outputs, schedule, audits, nonconformities } = useHL();
  const [categoria, setCategoria] = useState("todas");
  const [classe, setClasse] = useState("todas");
  const [criticidade, setCriticidade] = useState("todas");
  const [setor, setSetor] = useState("todos");

  const enriched = useMemo(
    () => products.map((p) => ({ p, m: computeMetrics(p, params) })),
    [products, params],
  );

  const filtered = useMemo(
    () =>
      enriched.filter(
        ({ p }) =>
          (categoria === "todas" || p.categoria === categoria) &&
          (classe === "todas" || p.curvaABC === classe) &&
          (criticidade === "todas" || p.criticidade === criticidade),
      ),
    [enriched, categoria, classe, criticidade],
  );

  const abaixoPonto = filtered.filter(({ m }) => m.status === "PEDIR_AGORA").length;
  const risco = filtered.filter(({ m }) => m.status === "RISCO_DE_RUPTURA").length;
  const coberturaMedia = filtered.length
    ? Math.round(filtered.reduce((s, { m }) => s + m.coberturaAtual, 0) / filtered.length)
    : 0;
  const reprovadas = audits.filter((a) => a.classificacao === "Reprovado").length;
  const ncAbertas = nonconformities.filter((n) => n.status !== "Encerrada").length;

  const porCategoria = CATEGORIAS.map((c) => ({
    categoria: c,
    valor: enriched
      .filter(({ p }) => p.categoria === c)
      .reduce((s, { p }) => s + p.estoqueVigente, 0),
  })).filter((r) => r.valor > 0);

  const abc = buildAbcCurve(products, params);
  const abcDonut = (["A", "B", "C"] as const).map((c) => ({
    name: `Classe ${c}`,
    value: Math.round(abc.filter((r) => r.classe === c).reduce((s, r) => s + r.valor, 0)),
  }));

  const saidasPorSetor = useMemo(() => {
    const map = new Map<string, number>();
    outputs
      .filter((o) => setor === "todos" || o.setor === setor)
      .forEach((o) => map.set(o.setor, (map.get(o.setor) ?? 0) + o.liberada));
    return [...map.entries()].map(([s, v]) => ({ setor: s, qtd: v })).sort((a, b) => b.qtd - a.qtd);
  }, [outputs, setor]);

  const criticos = filtered
    .filter(({ m }) => m.status === "PEDIR_AGORA" || m.status === "RISCO_DE_RUPTURA")
    .sort((a, b) => a.m.coberturaAtual - b.m.coberturaAtual)
    .slice(0, 5);

  const alertas = filtered
    .filter(({ m }) => ["PEDIR_AGORA", "RISCO_DE_RUPTURA", "PEDIR_EM_X_DIAS", "VALIDAR_NECESSIDADE_PONTUAL"].includes(m.status))
    .slice(0, 8);

  const previstos = schedule.length;
  const concluidas = schedule.filter((s) => s.status === "Concluído").length;
  const atrasadas = schedule.filter((s) => s.status === "Atrasado" || s.status === "Não realizado").length;

  return (
    <div className="space-y-5 p-4 md:p-6">
      <HLPageHeader
        title="Painel Executivo CCIH — Higiene & Logística"
        description="Visão consolidada de estoque, ressuprimento técnico 20+5, limpeza e estrutura física."
      />

      <div className="flex flex-wrap gap-2">
        <Select value={categoria} onValueChange={setCategoria}>
          <SelectTrigger className="h-9 w-[170px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas categorias</SelectItem>
            {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={classe} onValueChange={setClasse}>
          <SelectTrigger className="h-9 w-[150px]"><SelectValue placeholder="Classe ABC" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas classes</SelectItem>
            <SelectItem value="A">Classe A</SelectItem>
            <SelectItem value="B">Classe B</SelectItem>
            <SelectItem value="C">Classe C</SelectItem>
          </SelectContent>
        </Select>
        <Select value={criticidade} onValueChange={setCriticidade}>
          <SelectTrigger className="h-9 w-[160px]"><SelectValue placeholder="Criticidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Toda criticidade</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
            <SelectItem value="Média">Média</SelectItem>
            <SelectItem value="Baixa">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={setor} onValueChange={setSetor}>
          <SelectTrigger className="h-9 w-[190px]"><SelectValue placeholder="Setor" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os setores</SelectItem>
            {[...new Set(outputs.map((o) => o.setor))].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Abaixo do ponto de pedido" value={abaixoPonto} tone="danger" icon={<PackageX className="h-4 w-4 text-destructive" />} hint="Cobertura ≤ ponto de pedido" />
        <KpiCard label="Risco de ruptura" value={risco} tone="warning" icon={<TrendingDown className="h-4 w-4 text-orange-600" />} hint="Classe A/crítico < lead time" />
        <KpiCard label="Cobertura média" value={`${coberturaMedia} dias`} tone="info" icon={<Droplets className="h-4 w-4 text-blue-600" />} hint="Alvo: 25 dias (20+5)" />
        <KpiCard label="Auditorias reprovadas (mês)" value={reprovadas} tone="danger" icon={<ClipboardList className="h-4 w-4 text-destructive" />} />
        <KpiCard label="Dispensers quebrados" value={TOTAL_DISP_QUEBRADOS} tone="warning" icon={<AlertTriangle className="h-4 w-4 text-orange-600" />} hint={`Lixeiras quebradas: ${TOTAL_LIXEIRAS_QUEBRADAS}`} />
        <KpiCard label="Não conformidades abertas" value={ncAbertas} tone="danger" icon={<Bell className="h-4 w-4 text-destructive" />} />
      </div>

      <SectionCard title="Alertas ativos" description="Itens que exigem decisão imediata da CCIH / Almoxarifado">
        <div className="space-y-2">
          {alertas.length === 0 && <p className="text-sm text-muted-foreground">Nenhum alerta ativo com os filtros atuais.</p>}
          {alertas.map(({ p, m }) => (
            <div key={p.codigo} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">{p.nome}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {p.codigo} · Cobertura {m.coberturaAtual} d · Ponto de pedido {m.pontoPedidoDias} d · Sugerido {m.compraTecnica} {p.unidadeEntrada}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={m.status} />
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/hygiene-logistics/sawtooth/${p.codigo}`}>Ver projeção</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Estoque por categoria" description="Quantidade vigente somada por categoria">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porCategoria}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="categoria" tick={{ fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <Bar dataKey="valor" name="Estoque" radius={[4, 4, 0, 0]}>
                {porCategoria.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <SectionCard title="Curva ABC (valor de consumo)" description="Participação financeira por classe">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={abcDonut} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                <Cell fill="#ef4444" />
                <Cell fill="#f59e0b" />
                <Cell fill="#10b981" />
              </Pie>
              <RTooltip formatter={(v: number) => brl(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </SectionCard>
      </div>

      <SectionCard title="Top 5 itens críticos em risco" description="Ordenados por menor cobertura">
        <DataTable
          searchable={false}
          rows={criticos}
          pageSize={5}
          columns={[
            { key: "produto", header: "Produto", render: ({ p }) => <span className="font-medium">{p.nome}</span> },
            { key: "cob", header: <span className="inline-flex items-center gap-1">Cobertura atual <InfoTip text={FORMULA_TIPS.cobertura} /></span>, render: ({ m }) => `${m.coberturaAtual} dias` },
            { key: "pp", header: <span className="inline-flex items-center gap-1">Ponto de pedido <InfoTip text={FORMULA_TIPS.pontoPedido} /></span>, render: ({ m }) => `${m.pontoPedidoQtd} un (${m.pontoPedidoDias} d)` },
            { key: "st", header: "Status", render: ({ m }) => <StatusBadge status={m.status} /> },
          ]}
        />
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Saídas por setor (últimos 30 dias)">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={saidasPorSetor} layout="vertical" margin={{ left: 40 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="setor" tick={{ fontSize: 10 }} width={120} />
              <RTooltip />
              <Bar dataKey="qtd" name="Itens liberados" fill="#0ea5a4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </SectionCard>

        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard label="Limpezas previstas" value={previstos} tone="info" />
            <KpiCard label="Realizadas" value={concluidas} tone="success" />
            <KpiCard label="Atrasadas / não realizadas" value={atrasadas} tone="danger" />
          </div>
          <SectionCard title="Não conformidades recentes">
            <div className="space-y-2">
              {nonconformities.slice(0, 4).map((n) => (
                <div key={n.id} className="rounded-md border p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{n.id} · {n.setor}</span>
                    <Badge variant="outline" className={
                      n.status === "Vencida" ? "border-destructive/30 bg-destructive/10 text-destructive"
                        : n.status === "Aberta" ? "border-orange-500/30 bg-orange-500/10 text-orange-600"
                        : "border-blue-500/30 bg-blue-500/10 text-blue-600"
                    }>{n.status}</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">{n.descricao}</p>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
