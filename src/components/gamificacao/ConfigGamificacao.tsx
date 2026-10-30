import { useEffect, useState } from "react";
import { Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGamConfig, useSalvarGamConfig } from "@/hooks/useGamificacao";
import {
  ACOES, CONFIG_PADRAO, METRICAS, type ConfigPontos, type ConquistaDef, type GamConfig, type Metrica,
} from "@/lib/gamificacao";

const GRUPOS: { grupo: (typeof ACOES)[number]["grupo"]; titulo: string }[] = [
  { grupo: "tarefas", titulo: "Tarefas do Kanban" },
  { grupo: "auditorias", titulo: "Auditorias" },
  { grupo: "preenchimentos", titulo: "Preenchimentos" },
  { grupo: "bonus", titulo: "Bônus" },
];

/** Ajustes da gamificação (somente administradores; o banco também exige). */
export function ConfigGamificacao() {
  const { data } = useGamConfig();
  const salvar = useSalvarGamConfig();
  const [cfg, setCfg] = useState<GamConfig | null>(null);
  const [sujo, setSujo] = useState(false);

  useEffect(() => { if (data && !sujo) setCfg(data); }, [data, sujo]);
  if (!cfg) return null;

  const muda = (f: (c: GamConfig) => GamConfig) => { setCfg((c) => (c ? f(c) : c)); setSujo(true); };
  const ponto = (k: keyof ConfigPontos, v: string) =>
    muda((c) => ({ ...c, pontos: { ...c.pontos, [k]: Math.max(0, Math.round(Number(v) || 0)) } }));
  const conquista = (i: number, p: Partial<ConquistaDef>) =>
    muda((c) => ({ ...c, conquistas: c.conquistas.map((x, j) => (j === i ? { ...x, ...p } : x)) }));

  const enviar = async () => {
    const invalida = cfg.conquistas.find((c) => !c.nome.trim() || c.meta < 1);
    if (invalida) { toast.error("Cada conquista precisa de nome e meta maior que zero."); return; }
    try {
      await salvar.mutateAsync(cfg);
      setSujo(false);
      toast.success("Regras da gamificação salvas. O ranking já usa os novos valores.");
    } catch (e) {
      toast.error("Não foi possível salvar", { description: (e as Error).message });
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <span className="label-mono text-muted-foreground">Regras // pontos por ação</span>
          <CardTitle className="text-lg">Quanto vale cada registro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {GRUPOS.map(({ grupo, titulo }) => (
            <div key={grupo}>
              <p className="mb-2 text-sm font-semibold">{titulo}</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {ACOES.filter((a) => a.grupo === grupo).map((a) => (
                  <label key={a.chave} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block text-sm">{a.rotulo}</span>
                      <span className="block text-xs text-muted-foreground">{a.ajuda}</span>
                    </span>
                    <Input type="number" min={0} className="h-9 w-20 text-right" value={cfg.pontos[a.chave]}
                      onChange={(e) => ponto(a.chave, e.target.value)} aria-label={`Pontos: ${a.rotulo}`} />
                  </label>
                ))}
                {grupo === "auditorias" && (
                  <label className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2">
                    <span>
                      <span className="block text-sm">Teto de auditorias por dia</span>
                      <span className="block text-xs text-muted-foreground">Acima disso não soma pontos (qualidade, não volume)</span>
                    </span>
                    <Input type="number" min={0} className="h-9 w-20 text-right" value={cfg.pontos.teto_auditorias_dia}
                      onChange={(e) => ponto("teto_auditorias_dia", e.target.value)} aria-label="Teto de auditorias por dia" />
                  </label>
                )}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/[0.05] px-3 py-3">
            <Label htmlFor="ranking-ativo" className="text-sm font-normal">
              <span className="block font-medium">Ranking visível para a equipe</span>
              <span className="text-xs text-muted-foreground">Desligado, só os administradores veem o ranking.</span>
            </Label>
            <Switch id="ranking-ativo" checked={cfg.rankingAtivo} onCheckedChange={(v) => muda((c) => ({ ...c, rankingAtivo: v }))} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <span className="label-mono text-muted-foreground">Insígnias</span>
          <CardTitle className="text-lg">Conquistas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {cfg.conquistas.map((c, i) => (
            <div key={c.id} className={`grid gap-2 rounded-xl border p-3 sm:grid-cols-[64px_1fr_1fr] lg:grid-cols-[64px_1.2fr_1.6fr_1.4fr_96px_auto] ${c.ativa ? "border-border/70" : "border-dashed opacity-60"}`}>
              <Input value={c.icone} maxLength={4} className="text-center text-xl" onChange={(e) => conquista(i, { icone: e.target.value })} aria-label="Ícone (emoji)" />
              <Input value={c.nome} placeholder="Nome" onChange={(e) => conquista(i, { nome: e.target.value })} aria-label="Nome da conquista" />
              <Input value={c.descricao} placeholder="Descrição" onChange={(e) => conquista(i, { descricao: e.target.value })} aria-label="Descrição" />
              <Select value={c.metrica} onValueChange={(v) => conquista(i, { metrica: v as Metrica })}>
                <SelectTrigger aria-label="O que conta"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {METRICAS.map((m) => <SelectItem key={m.valor} value={m.valor}>{m.rotulo}</SelectItem>)}
                </SelectContent>
              </Select>
              <Input type="number" min={1} value={c.meta} onChange={(e) => conquista(i, { meta: Math.max(1, Math.round(Number(e.target.value) || 1)) })} aria-label="Meta" />
              <div className="flex items-center justify-end gap-2">
                <Switch checked={c.ativa} onCheckedChange={(v) => conquista(i, { ativa: v })} aria-label="Conquista ativa" />
                <Button variant="ghost" size="icon" aria-label="Remover conquista"
                  onClick={() => muda((x) => ({ ...x, conquistas: x.conquistas.filter((_, j) => j !== i) }))}>
                  <Trash2 className="text-destructive" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={() => muda((x) => ({
            ...x,
            conquistas: [...x.conquistas, { id: `c-${Date.now()}`, icone: "🏆", nome: "", descricao: "", metrica: "pontos", meta: 1000, ativa: true }],
          }))}>
            <Plus /> Adicionar conquista
          </Button>
        </CardContent>
      </Card>

      <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-end gap-2 rounded-2xl border border-border/70 bg-card/90 p-3 shadow-soft backdrop-blur">
        {sujo && <span className="mr-auto text-sm text-amber-600 dark:text-amber-400">Alterações não salvas</span>}
        <Button variant="ghost" onClick={() => { setCfg(CONFIG_PADRAO); setSujo(true); }}><RotateCcw /> Restaurar padrões</Button>
        <Button variant="outline" disabled={!sujo} onClick={() => { setSujo(false); setCfg(data ?? CONFIG_PADRAO); }}>Descartar</Button>
        <Button onClick={enviar} disabled={!sujo || salvar.isPending}><Save /> {salvar.isPending ? "Salvando…" : "Salvar regras"}</Button>
      </div>
    </div>
  );
}
