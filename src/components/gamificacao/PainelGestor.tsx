import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, ArrowDown, ArrowUp, Download, Flame, Lock, Search, Trophy, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { usePainelEquipe } from "@/hooks/useGamificacao";
import { AvisoErroGamificacao } from "@/components/gamificacao/AvisoErroGamificacao";
import { MapaCalor } from "@/components/gamificacao/MapaCalor";
import type { LinhaEquipe } from "@/lib/gamificacao";

const fmt = (n: number) => n.toLocaleString("pt-BR");
const dataBR = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const rotuloMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(2, 4)}`;
const CORES = { tarefas: "#10b981", auditorias: "#0ea5e9", preenchimentos: "#8b5cf6", alertas: "#f43f5e" };

type Ordem = "pontos" | "nome" | "nivel" | "inativo";

function Variacao({ atual, anterior }: { atual: number; anterior: number }) {
  if (!anterior && !atual) return <span className="text-muted-foreground">—</span>;
  if (!anterior) return <span className="text-xs font-medium text-emerald-600">novo</span>;
  const pct = Math.round(((atual - anterior) / anterior) * 100);
  const sobe = pct >= 0;
  return (
    <span title="Comparado ao mês anterior inteiro" className={`inline-flex items-center gap-0.5 text-xs font-medium ${sobe ? "text-emerald-600" : "text-red-600"}`}>
      {sobe ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}{Math.abs(pct)}%
    </span>
  );
}

function Composicao({ l }: { l: LinhaEquipe }) {
  const g = l.resumo.mesPorGrupo;
  const total = g.tarefas + g.auditorias + g.preenchimentos + g.alertas;
  if (!total) return <span className="text-xs text-muted-foreground">sem pontos</span>;
  return (
    <div className="flex h-2 w-28 overflow-hidden rounded-full bg-muted"
      title={`Tarefas ${fmt(g.tarefas)} · Auditorias ${fmt(g.auditorias)} · Preenchimentos ${fmt(g.preenchimentos)} · Alertas ${fmt(g.alertas)}`}>
      <span style={{ width: `${(g.tarefas / total) * 100}%`, background: CORES.tarefas }} />
      <span style={{ width: `${(g.auditorias / total) * 100}%`, background: CORES.auditorias }} />
      <span style={{ width: `${(g.preenchimentos / total) * 100}%`, background: CORES.preenchimentos }} />
      <span style={{ width: `${(g.alertas / total) * 100}%`, background: CORES.alertas }} />
    </div>
  );
}

function FichaFuncionario({ l, onClose }: { l: LinhaEquipe | null; onClose: () => void }) {
  return (
    <Sheet open={!!l} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {l && (
          <>
            <SheetHeader>
              <SheetTitle className="font-display text-xl">{l.nome}</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Nível {l.resumo.nivel.nivel} · {l.resumo.nivel.titulo} · {fmt(l.resumo.xpTotal)} pontos em 12 meses
              </p>
            </SheetHeader>
            <div className="mt-5 space-y-5">
              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  ["Pontos no mês", fmt(l.resumo.xpMes)],
                  ["Mês anterior", fmt(l.mesAnterior)],
                  ["Dias seguidos", `${l.resumo.sequencia}`],
                ].map(([r, v]) => (
                  <div key={r} className="rounded-xl border border-border/60 bg-background/60 p-3">
                    <p className="num-display text-2xl">{v}</p>
                    <p className="label-mono mt-1 text-[9px] text-muted-foreground">{r}</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="label-mono mb-2 text-muted-foreground">Constância // 12 semanas</p>
                <MapaCalor dias={l.resumo.mapaCalor} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ["Tarefas do Kanban", l.resumo.estatisticas.tarefas],
                  ["Auditorias", l.resumo.estatisticas.auditorias],
                  ["Preenchimentos", l.resumo.estatisticas.preenchimentos],
                  ["Pacientes cadastrados", l.resumo.estatisticas.pacientes],
                  ["Alertas resolvidos", l.resumo.estatisticas.alertas],
                  ["Alertas críticos resolvidos", l.resumo.estatisticas.alertas_criticos],
                ].map(([r, v]) => (
                  <div key={r as string} className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
                    <span className="text-muted-foreground">{r} (12m)</span><strong>{fmt(v as number)}</strong>
                  </div>
                ))}
              </div>
              <div>
                <p className="label-mono mb-2 text-muted-foreground">
                  Conquistas · {l.resumo.conquistas.filter((c) => c.obtida).length}/{l.resumo.conquistas.length}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {l.resumo.conquistas.map((c) => (
                    <div key={c.id} className={`flex items-center gap-3 rounded-xl border p-2.5 ${c.obtida ? "border-primary/30 bg-primary/[0.06]" : "border-border/60 opacity-70"}`}>
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-muted text-xl">
                        {c.obtida ? c.icone : <Lock className="h-4 w-4 text-muted-foreground" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.nome}</p>
                        {!c.obtida && (
                          <div className="xp-bar mt-1 h-1.5"><span style={{ width: `${(c.atual / c.meta) * 100}%` }} /></div>
                        )}
                        <p className="font-mono text-[10px] text-muted-foreground">{fmt(c.atual)}/{fmt(c.meta)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Último registro: {dataBR(l.ultimaAtividade)}</p>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function exportarCsv(linhas: LinhaEquipe[]) {
  const cab = ["Funcionário", "Nível", "Título", "Pontos no mês", "Mês anterior", "Tarefas (pts)", "Auditorias (pts)", "Preenchimentos (pts)", "Alertas (pts)",
    "Dias ativos no mês", "Sequência", "Conquistas", "Pontos 12 meses", "Último registro"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const corpo = linhas.map((l) => [
    l.nome, l.resumo.nivel.nivel, l.resumo.nivel.titulo, l.resumo.xpMes, l.mesAnterior,
    l.resumo.mesPorGrupo.tarefas, l.resumo.mesPorGrupo.auditorias, l.resumo.mesPorGrupo.preenchimentos, l.resumo.mesPorGrupo.alertas,
    l.diasAtivosMes, l.resumo.sequencia, `${l.resumo.conquistas.filter((c) => c.obtida).length}/${l.resumo.conquistas.length}`,
    l.resumo.xpTotal, dataBR(l.ultimaAtividade),
  ].map(esc).join(";"));
  const blob = new Blob(["﻿" + [cab.map(esc).join(";"), ...corpo].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `gamificacao-equipe-${new Date().toISOString().slice(0, 7)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Painel do gestor: acompanhamento da equipe (pontos, níveis, conquistas, constância). */
export function PainelGestor() {
  const { data, isLoading, error } = usePainelEquipe();
  const [busca, setBusca] = useState("");
  const [ordem, setOrdem] = useState<Ordem>("pontos");
  const [aberto, setAberto] = useState<LinhaEquipe | null>(null);

  const linhas = useMemo(() => {
    if (!data) return [];
    const q = busca.trim().toLowerCase();
    const l = data.pessoas.filter((p) => !q || p.nome.toLowerCase().includes(q));
    const porOrdem: Record<Ordem, (a: LinhaEquipe, b: LinhaEquipe) => number> = {
      pontos: (a, b) => b.resumo.xpMes - a.resumo.xpMes,
      nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
      nivel: (a, b) => b.resumo.xpTotal - a.resumo.xpTotal,
      inativo: (a, b) => (b.diasSemRegistro ?? 9999) - (a.diasSemRegistro ?? 9999),
    };
    return [...l].sort(porOrdem[ordem]);
  }, [data, busca, ordem]);

  if (error) return <AvisoErroGamificacao erro={error} />;
  if (isLoading || !data) {
    return <div className="space-y-4"><Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-72 rounded-2xl" /><Skeleton className="h-96 rounded-2xl" /></div>;
  }

  const atencao = data.pessoas.filter((p) => p.diasSemRegistro === null || p.diasSemRegistro >= 7);
  const media = data.ativosMes ? Math.round(data.totalMes / data.ativosMes) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icone: Trophy, rotulo: "Pontos da equipe no mês", valor: fmt(data.totalMes), extra: <Variacao atual={data.totalMes} anterior={data.totalMesAnterior} /> },
          { icone: Users, rotulo: "Participantes no mês", valor: `${data.ativosMes}/${data.pessoas.length}`, extra: <span className="text-xs text-muted-foreground">com algum registro</span> },
          { icone: Flame, rotulo: "Média por participante", valor: fmt(media), extra: <span className="text-xs text-muted-foreground">pontos no mês</span> },
          { icone: Trophy, rotulo: "Conquistas obtidas", valor: fmt(data.conquistasObtidas), extra: <span className="text-xs text-muted-foreground">somando a equipe</span> },
        ].map(({ icone: Icone, rotulo, valor, extra }) => (
          <Card key={rotulo} className="card-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between"><span className="label-mono text-muted-foreground">{rotulo}</span><Icone className="h-4 w-4 text-primary" /></div>
              <p className="num-display mt-2 text-3xl">{valor}</p>
              <div className="mt-1">{extra}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <span className="label-mono text-muted-foreground">Evolução // 12 meses</span>
            <CardTitle className="text-lg">Pontos da equipe por mês</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.meses.map((m) => ({ ...m, rotulo: rotuloMes(m.mes) }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="rotulo" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} width={48} />
                <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ borderRadius: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="tarefas" name="Tarefas" stackId="p" fill={CORES.tarefas} />
                <Bar dataKey="auditorias" name="Auditorias" stackId="p" fill={CORES.auditorias} />
                <Bar dataKey="preenchimentos" name="Preenchimentos" stackId="p" fill={CORES.preenchimentos} />
                <Bar dataKey="alertas" name="Alertas resolvidos" stackId="p" fill={CORES.alertas} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <span className="label-mono text-muted-foreground">Acompanhar</span>
            <CardTitle className="flex items-center gap-2 text-lg"><AlertTriangle className="h-4 w-4 text-amber-500" /> Sem registro há 7+ dias</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 space-y-1.5 overflow-y-auto">
            {atencao.length === 0 ? (
              <p className="text-sm text-muted-foreground">Toda a equipe registrou algo na última semana. 👏</p>
            ) : atencao.map((p) => (
              <button key={p.id} type="button" onClick={() => setAberto(p)}
                className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted">
                <span className="truncate">{p.nome}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{p.diasSemRegistro === null ? "nunca registrou" : `${p.diasSemRegistro} dias`}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3 pb-3 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
          <div>
            <span className="label-mono text-muted-foreground">Equipe // mês atual</span>
            <CardTitle className="text-lg">Conquistas dos funcionários</CardTitle>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar funcionário" className="h-9 w-48 pl-9" />
            </div>
            <Select value={ordem} onValueChange={(v) => setOrdem(v as Ordem)}>
              <SelectTrigger className="h-9 w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pontos">Mais pontos no mês</SelectItem>
                <SelectItem value="nivel">Maior nível</SelectItem>
                <SelectItem value="inativo">Mais tempo sem registro</SelectItem>
                <SelectItem value="nome">Nome (A–Z)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => exportarCsv(linhas)}><Download /> Exportar</Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead className="text-right">Pontos no mês</TableHead>
                  <TableHead>Variação</TableHead>
                  <TableHead>Composição</TableHead>
                  <TableHead className="text-center">Dias ativos</TableHead>
                  <TableHead className="text-center">Sequência</TableHead>
                  <TableHead className="text-center">Conquistas</TableHead>
                  <TableHead>Último registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {linhas.map((l) => (
                  <TableRow key={l.id} className="cursor-pointer" onClick={() => setAberto(l)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary to-[hsl(var(--glow-2))] font-mono text-xs font-semibold text-primary-foreground">
                          {l.resumo.nivel.nivel}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{l.nome}</p>
                          <p className="text-xs text-muted-foreground">Nível {l.resumo.nivel.nivel} · {l.resumo.nivel.titulo}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="num-display text-right text-lg">{fmt(l.resumo.xpMes)}</TableCell>
                    <TableCell><Variacao atual={l.resumo.xpMes} anterior={l.mesAnterior} /></TableCell>
                    <TableCell><Composicao l={l} /></TableCell>
                    <TableCell className="text-center">{l.diasAtivosMes}</TableCell>
                    <TableCell className="text-center">{l.resumo.sequencia > 0 ? <span className="text-orange-600">🔥 {l.resumo.sequencia}</span> : "—"}</TableCell>
                    <TableCell className="text-center">
                      {l.resumo.conquistas.filter((c) => c.obtida).length}/{l.resumo.conquistas.length}
                      <span className="ml-1">{l.resumo.conquistas.filter((c) => c.obtida).slice(-3).map((c) => c.icone).join("")}</span>
                    </TableCell>
                    <TableCell className={l.diasSemRegistro === null || l.diasSemRegistro >= 7 ? "text-amber-600" : "text-muted-foreground"}>
                      {dataBR(l.ultimaAtividade)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">
        Clique em um funcionário para ver a ficha com conquistas e constância. Os pontos seguem as regras da aba Configurar.
      </p>

      <FichaFuncionario l={aberto} onClose={() => setAberto(null)} />
    </div>
  );
}
