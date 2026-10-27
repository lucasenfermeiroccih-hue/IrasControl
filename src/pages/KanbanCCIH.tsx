import { useCallback, useEffect, useMemo, useState } from "react";
import { LIST_PAGE_SIZE } from "@/lib/pagination";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  AlertTriangle, CalendarDays, CalendarRange, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Circle, Clock,
  KanbanSquare, ListChecks, Loader2, Plus, Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  addDays, addMonths, civil, daysOfMonth, describeAgenda, nomeMes, ocorrenciasNoMes, parseCivil, periodoDe, PERIODO_UNICO,
  STATUS_LABELS, tarefaNoDia, weekOf, WEEKDAYS, type EscalaMap, type StatusExecucao,
} from "@/lib/kanbanAgenda";
import { KanbanFiltros } from "@/components/kanban-ccih/KanbanFiltros";
import { OcorrenciaCard } from "@/components/kanban-ccih/OcorrenciaCard";
import { EquipeEscala, type EscalaPatch } from "@/components/kanban-ccih/EquipeEscala";
import { TarefaDialog, type TarefaForm } from "@/components/kanban-ccih/TarefaDialog";
import {
  FILTROS_INICIAIS, filtraTarefa, PRIORITY_LABELS, type EscalaRegistro, type Execucao, type Filtros,
  type ItemQuadro, type Pessoa, type Tarefa,
} from "@/components/kanban-ccih/types";

type Aba = "dia" | "mes" | "equipe" | "gerenciar";

const COLUNAS: { status: StatusExecucao; icon: React.ReactNode; cor: string; titulo: string; vazio: string }[] = [
  { status: "todo", icon: <Circle className="h-4 w-4 text-slate-500" />, cor: "border-slate-200 bg-slate-50/60 text-slate-700", titulo: "A fazer", vazio: "Nada a fazer." },
  { status: "doing", icon: <Clock className="h-4 w-4 text-blue-600" />, cor: "border-blue-200 bg-blue-50/50 text-blue-700", titulo: "Em andamento", vazio: "Nenhuma tarefa sendo executada." },
  { status: "done", icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />, cor: "border-emerald-200 bg-emerald-50/50 text-emerald-700", titulo: "Concluídas", vazio: "Nenhuma tarefa concluída." },
];

const PRIORIDADE_ORDEM = { high: 0, normal: 1, low: 2 };
const chave = (tarefaId: string, periodo: string) => `${tarefaId}|${periodo}`;
const diaLabel = (data: string) => WEEKDAYS.find((w) => w.value === parseCivil(data).getDay())!.label;

function ordenar(a: Tarefa, b: Tarefa) {
  return PRIORIDADE_ORDEM[a.priority] - PRIORIDADE_ORDEM[b.priority]
    || (a.ordem ?? 9999) - (b.ordem ?? 9999)
    || a.title.localeCompare(b.title);
}

export default function KanbanCCIH() {
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();
  const { isAdmin: isAdminHook, loading: adminLoading } = useIsAdmin();
  const [isPrimaryAdmin, setIsPrimaryAdmin] = useState(false);
  const isAdmin = isAdminHook || isPrimaryAdmin;

  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [escala, setEscala] = useState<Record<string, EscalaRegistro>>({});
  const [execucoes, setExecucoes] = useState<Map<string, Execucao>>(new Map());
  const [loading, setLoading] = useState(true);

  const hoje = civil(new Date());
  const [aba, setAba] = useState<Aba>("dia");
  const [data, setData] = useState(hoje);
  const mes = data.slice(0, 7);
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [mostrarArquivadas, setMostrarArquivadas] = useState(false);
  // Visão da equipe no quadro do dia: agrupada por funcionário
  const [agrupar, setAgrupar] = useState(true);
  const [abertos, setAbertos] = useState<Set<string>>(new Set());

  const [dialogTarefa, setDialogTarefa] = useState<{ open: boolean; tarefa: Tarefa | null }>({ open: false, tarefa: null });
  const [excluir, setExcluir] = useState<Tarefa | null>(null);
  const [pagina, setPagina] = useState(1);

  // ── Carregamento ─────────────────────────────────────────────────────────

  const carregarPessoas = useCallback(async () => {
    if (!hospitalId) return;
    const { data: rows } = await supabase
      .from("hospital_users")
      .select("user_id, profiles(full_name, email)")
      .eq("hospital_id", hospitalId);
    type Row = { user_id: string | null; profiles: { full_name: string | null; email: string | null } | null };
    setPessoas(((rows ?? []) as unknown as Row[])
      .filter((u): u is Row & { user_id: string } => !!u.user_id)
      .map((u) => ({ user_id: u.user_id, full_name: (u.profiles?.full_name || "Sem nome").trim(), email: u.profiles?.email || "" }))
      .sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }, [hospitalId]);

  const carregarEscala = useCallback(async () => {
    if (!hospitalId) return;
    const { data: rows } = await supabase
      .from("kanban_ccih_escala")
      .select("user_id, dias_semana, regime, plantoes, funcao, atribuicoes")
      .eq("hospital_id", hospitalId);
    const map: Record<string, EscalaRegistro> = {};
    (rows ?? []).forEach((r) => {
      map[r.user_id] = {
        user_id: r.user_id,
        dias: r.dias_semana ?? null,
        regime: r.regime === "plantao" ? "plantao" : "fixo",
        plantoes: r.plantoes ?? [],
        funcao: r.funcao,
        atribuicoes: r.atribuicoes,
        cadastrada: true,
      };
    });
    setEscala(map);
  }, [hospitalId]);

  const carregarTarefas = useCallback(async () => {
    if (!hospitalId || !userId) return;
    const [{ data: isSuper }, { data: isHospAdmin }, { data: primary }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "hospital_admin" }),
      supabase.from("hospital_users").select("is_primary_admin").eq("user_id", userId).eq("hospital_id", hospitalId).maybeSingle(),
    ]);
    const adminNow = Boolean(isSuper) || Boolean(isHospAdmin) || Boolean(primary?.is_primary_admin);
    setIsPrimaryAdmin(adminNow);

    let query = supabase.from("kanban_ccih_tarefas").select("*").eq("hospital_id", hospitalId);
    if (!adminNow) query = query.contains("assigned_to_ids", [userId]).eq("ativo", true);
    const { data: rows, error } = await query.order("ordem", { ascending: true, nullsFirst: false });
    if (error) { toast.error("Erro ao carregar as tarefas."); return; }
    setTarefas((rows ?? []).map((t) => ({
      ...t,
      assigned_to_ids: t.assigned_to_ids?.length ? t.assigned_to_ids : t.assigned_to ? [t.assigned_to] : [],
      recurrence: t.recurrence as Tarefa["recurrence"],
      priority: (["low", "normal", "high"].includes(t.priority) ? t.priority : "normal") as Tarefa["priority"],
      source: (t.source ?? "ccih") as Tarefa["source"],
      setores: t.setores ?? [],
    })));
  }, [hospitalId, userId]);

  /** Execuções do mês da data (com a semana anterior, para tarefas semanais) e as de tarefas únicas. */
  const carregarExecucoes = useCallback(async () => {
    if (!hospitalId) return;
    const de = addDays(`${mes}-01`, -7);
    const ate = daysOfMonth(mes).at(-1)!;
    const campos = "id, tarefa_id, periodo, status, observacao, iniciado_em, concluido_em, concluido_por, updated_at";
    const rows: Execucao[] = [];
    for (let from = 0; ; from += 1000) {
      const { data: page, error } = await supabase.from("kanban_ccih_execucoes").select(campos)
        .eq("hospital_id", hospitalId)
        .or(`and(periodo.gte.${de},periodo.lte.${ate}),periodo.eq.${PERIODO_UNICO}`)
        .order("periodo")
        .range(from, from + 999);
      if (error) { toast.error("Erro ao carregar a situação das tarefas."); return; }
      rows.push(...((page ?? []) as Execucao[]));
      if (!page || page.length < 1000) break;
    }
    setExecucoes(new Map(rows.map((r) => [chave(r.tarefa_id, r.periodo), r])));
  }, [hospitalId, mes]);

  useEffect(() => {
    if (ctxLoading || adminLoading || !hospitalId || !userId) return;
    (async () => {
      setLoading(true);
      await Promise.all([carregarPessoas(), carregarEscala(), carregarTarefas()]);
      setLoading(false);
    })();
  }, [ctxLoading, adminLoading, hospitalId, userId, carregarPessoas, carregarEscala, carregarTarefas]);

  useEffect(() => { carregarExecucoes(); }, [carregarExecucoes]);

  // Atualiza ao voltar para a aba e a cada 5 minutos (a equipe marca tarefas ao mesmo tempo)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === "visible") carregarExecucoes(); };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(carregarExecucoes, 5 * 60 * 1000);
    return () => { document.removeEventListener("visibilitychange", onVisible); clearInterval(interval); };
  }, [carregarExecucoes]);

  useEffect(() => { setPagina(1); }, [filtros, mostrarArquivadas]);

  // ── Derivados ────────────────────────────────────────────────────────────

  const nomes = useMemo(() => Object.fromEntries(pessoas.map((p) => [p.user_id, p.full_name])), [pessoas]);
  const tarefasNomeadas = useMemo(() => tarefas.map((t) => ({
    ...t, assigned_to_names: t.assigned_to_ids.map((id) => nomes[id]).filter(Boolean),
  })), [tarefas, nomes]);

  const escalaAgenda: EscalaMap = useMemo(() => Object.fromEntries(
    Object.values(escala).map((e) => [e.user_id, { dias: e.dias, regime: e.regime, plantoes: e.plantoes }]),
  ), [escala]);

  // Quem não é administrador vê o próprio quadro
  const filtrosEfetivos: Filtros = isAdmin ? filtros : { ...filtros, pessoa: userId ?? "all" };
  const viewer = filtrosEfetivos.pessoa !== "all" ? filtrosEfetivos.pessoa : null;
  const ativas = tarefasNomeadas.filter((t) => t.ativo && filtraTarefa(t, filtrosEfetivos));

  const itensDoDia = useCallback((dia: string): ItemQuadro[] => ativas
    .filter((t) => tarefaNoDia(t, dia, escalaAgenda, viewer))
    .sort(ordenar)
    .map((t) => {
      const periodo = periodoDe(t, dia);
      const execucao = execucoes.get(chave(t.id, periodo));
      return { tarefa: t, periodo, status: execucao?.status ?? "todo", execucao };
    }), [ativas, escalaAgenda, viewer, execucoes]);

  const itens = itensDoDia(data);
  const itensFiltrados = filtrosEfetivos.status === "all" ? itens : itens.filter((i) => i.status === filtrosEfetivos.status);
  const contagem = (lista: ItemQuadro[]) => ({
    total: lista.length,
    todo: lista.filter((i) => i.status === "todo").length,
    doing: lista.filter((i) => i.status === "doing").length,
    done: lista.filter((i) => i.status === "done").length,
  });
  const resumoDia = contagem(itens);
  const porPessoaDia = (() => {
    const map = new Map<string, ItemQuadro[]>();
    itens.forEach((i) => i.tarefa.assigned_to_ids.forEach((id) => {
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push(i);
    }));
    return [...map.entries()]
      .map(([id, lista]) => ({ id, itens: lista }))
      .sort((a, b) => (nomes[a.id] ?? "").localeCompare(nomes[b.id] ?? ""));
  })();

  // Plantonistas sem plantão cadastrado no mês (as tarefas de plantão não aparecem)
  const semPlantao = Object.values(escala).filter((e) => e.regime === "plantao"
    && !e.plantoes.some((p) => p.startsWith(mes))
    && ativas.some((t) => t.no_plantao && t.assigned_to_ids.includes(e.user_id)));

  const tarefasPorPessoa = useMemo(() => {
    const c: Record<string, number> = {};
    tarefas.filter((t) => t.ativo).forEach((t) => t.assigned_to_ids.forEach((id) => { c[id] = (c[id] ?? 0) + 1; }));
    return c;
  }, [tarefas]);

  const pessoasComTarefa = pessoas.filter((p) => tarefasPorPessoa[p.user_id]);
  const setoresExtras = [...new Set(tarefas.flatMap((t) => t.setores))];

  // ── Ações ────────────────────────────────────────────────────────────────

  const mudarStatus = async (item: ItemQuadro, status: StatusExecucao) => {
    if (!hospitalId || !userId) return;
    const agora = new Date().toISOString();
    const k = chave(item.tarefa.id, item.periodo);
    const anterior = execucoes.get(k);
    const row = {
      hospital_id: hospitalId,
      tarefa_id: item.tarefa.id,
      periodo: item.periodo,
      status,
      updated_by: userId,
      updated_at: agora,
      iniciado_em: status === "todo" ? null : anterior?.iniciado_em ?? agora,
      concluido_em: status === "done" ? agora : null,
      concluido_por: status === "done" ? userId : null,
    };
    setExecucoes((m) => new Map(m).set(k, { ...anterior, ...row }));
    const { error } = await supabase.from("kanban_ccih_execucoes").upsert(row, { onConflict: "tarefa_id,periodo" });
    if (error) {
      toast.error("Não foi possível salvar a situação da tarefa.");
      setExecucoes((m) => { const n = new Map(m); if (anterior) n.set(k, anterior); else n.delete(k); return n; });
      return;
    }
    if (status === "done") toast.success("Tarefa concluída!");
  };

  const salvarTarefa = async (form: TarefaForm): Promise<boolean> => {
    if (!form.title.trim()) { toast.error("Informe o título da tarefa."); return false; }
    if (form.assigned_to_ids.length === 0) { toast.error("Selecione ao menos um responsável."); return false; }
    if (!hospitalId) return false;
    const campos = {
      title: form.title.trim(),
      description: form.description?.trim() || null,
      assigned_to: form.assigned_to_ids[0],
      assigned_to_ids: form.assigned_to_ids,
      recurrence: form.recurrence,
      priority: form.priority,
      tipo: form.tipo,
      setores: form.setores,
      dias_semana: form.dias_semana,
      dias_mes: form.dias_mes,
      no_plantao: form.no_plantao,
      quando: form.quando?.trim() || null,
      horario: form.horario?.trim() || null,
      tempo_alvo: form.tempo_alvo?.trim() || null,
      validador: form.validador?.trim() || null,
      backup: form.backup?.trim() || null,
      ativo: form.ativo,
    };
    const editando = dialogTarefa.tarefa;
    const { error } = editando
      ? await supabase.from("kanban_ccih_tarefas").update(campos).eq("id", editando.id)
      : await supabase.from("kanban_ccih_tarefas").insert({ ...campos, hospital_id: hospitalId, assigned_by: userId, status: "in_progress" });
    if (error) { toast.error("Erro ao salvar a tarefa."); return false; }
    toast.success(editando ? "Tarefa atualizada!" : "Tarefa criada!");
    await carregarTarefas();
    return true;
  };

  const excluirTarefa = async () => {
    if (!excluir) return;
    const { error } = await supabase.from("kanban_ccih_tarefas").delete().eq("id", excluir.id);
    if (error) { toast.error("Erro ao excluir a tarefa."); return; }
    setTarefas((prev) => prev.filter((t) => t.id !== excluir.id));
    setExcluir(null);
    setDialogTarefa({ open: false, tarefa: null });
    toast.success("Tarefa excluída.");
  };

  const salvarEscala = async (uid: string, patch: EscalaPatch): Promise<boolean> => {
    if (!hospitalId) return false;
    const atual = escala[uid];
    const { error } = await supabase.from("kanban_ccih_escala").upsert({
      hospital_id: hospitalId,
      user_id: uid,
      dias_semana: patch.dias ?? atual?.dias ?? [1, 2, 3, 4, 5],
      regime: patch.regime ?? atual?.regime ?? "fixo",
      plantoes: patch.plantoes ?? atual?.plantoes ?? [],
      funcao: patch.funcao !== undefined ? patch.funcao : atual?.funcao ?? null,
      atribuicoes: patch.atribuicoes !== undefined ? patch.atribuicoes : atual?.atribuicoes ?? null,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    }, { onConflict: "hospital_id,user_id" });
    if (error) { toast.error("Erro ao salvar a escala."); return false; }
    toast.success("Escala atualizada.");
    await carregarEscala();
    return true;
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading || ctxLoading || adminLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const semana = weekOf(data);
  const dataLonga = (() => {
    const txt = parseCivil(data).toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    return txt.charAt(0).toUpperCase() + txt.slice(1);
  })();

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <KanbanSquare className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Kanban SCIH</h1>
            <p className="text-sm text-muted-foreground">Tarefas da equipe por dia, mês, funcionário e setor</p>
          </div>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-1.5" onClick={() => setDialogTarefa({ open: true, tarefa: null })}>
            <Plus className="h-4 w-4" /> Nova tarefa
          </Button>
        )}
      </div>

      <Tabs value={aba} onValueChange={(v) => setAba(v as Aba)}>
        <TabsList className="h-9 flex-wrap">
          <TabsTrigger value="dia" className="text-xs gap-1"><CalendarDays className="h-3.5 w-3.5" /> Quadro do dia</TabsTrigger>
          <TabsTrigger value="mes" className="text-xs gap-1"><CalendarRange className="h-3.5 w-3.5" /> Resumo do mês</TabsTrigger>
          <TabsTrigger value="equipe" className="text-xs gap-1"><Users className="h-3.5 w-3.5" /> Equipe e funções</TabsTrigger>
          {isAdmin && <TabsTrigger value="gerenciar" className="text-xs gap-1"><ListChecks className="h-3.5 w-3.5" /> Gerenciar tarefas</TabsTrigger>}
        </TabsList>
      </Tabs>

      {aba !== "equipe" && (
        <KanbanFiltros
          filtros={filtrosEfetivos}
          onChange={setFiltros}
          pessoas={pessoasComTarefa.length ? pessoasComTarefa : pessoas}
          mostrarPessoa={isAdmin}
          setoresExtras={setoresExtras}
        />
      )}

      {semPlantao.length > 0 && (aba === "dia" || aba === "mes") && (
        <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {semPlantao.map((e) => nomes[e.user_id] ?? "—").join(" e ")} sem plantões cadastrados em {nomeMes(mes)}: as tarefas de plantão
            não aparecem no quadro. {isAdmin ? "Cadastre em Equipe e funções." : "Peça à coordenação para cadastrar."}
          </span>
        </div>
      )}

      {/* ── Quadro do dia ── */}
      {aba === "dia" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setData(addDays(data, -7))} title="Semana anterior">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Input type="date" className="h-8 w-40" value={data} onChange={(e) => e.target.value && setData(e.target.value)} />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setData(addDays(data, 7))} title="Próxima semana">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                {data !== hoje && <Button variant="ghost" size="sm" className="h-8" onClick={() => setData(hoje)}>Hoje</Button>}
                <span className="text-sm font-medium ml-1">{dataLonga}</span>
              </div>
              <div className="grid grid-cols-7 gap-1">
                {semana.map((d) => {
                  const c = contagem(itensDoDia(d));
                  const sel = d === data;
                  return (
                    <button
                      key={d}
                      onClick={() => setData(d)}
                      className={`rounded-md border px-1 py-1.5 text-center transition-colors ${
                        sel ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted"
                      } ${d === hoje && !sel ? "border-primary" : ""}`}
                    >
                      <p className="text-[11px] font-medium">{diaLabel(d)} {parseCivil(d).getDate()}</p>
                      <p className={`text-[10px] ${sel ? "opacity-90" : "text-muted-foreground"}`}>
                        {c.total ? `${c.done}/${c.total}` : "—"}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Resumo label="Tarefas do dia" valor={resumoDia.total} cor="text-foreground" />
            <Resumo label="A fazer" valor={resumoDia.todo} cor="text-slate-600" />
            <Resumo label="Em andamento" valor={resumoDia.doing} cor="text-blue-600" />
            <Resumo
              label="Concluídas"
              valor={`${resumoDia.done}${resumoDia.total ? ` (${Math.round((resumoDia.done / resumoDia.total) * 100)}%)` : ""}`}
              cor="text-emerald-600"
            />
          </div>

          {viewer || !agrupar ? (
            <Quadro
              itens={itensFiltrados}
              status={filtrosEfetivos.status}
              diaSemana={diaLabel(data)}
              mostrarResponsavel={isAdmin && !viewer}
              podeEditar={isAdmin}
              onStatus={mudarStatus}
              onEdit={(i) => setDialogTarefa({ open: true, tarefa: i.tarefa })}
            />
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="text-xs text-muted-foreground">Por funcionário — clique no nome para abrir o quadro da pessoa.</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAbertos(new Set(porPessoaDia.map((g) => g.id)))}>Abrir todos</Button>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setAbertos(new Set())}>Fechar todos</Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAgrupar(false)}>Ver tudo junto</Button>
                </div>
              </div>
              {porPessoaDia.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8 border rounded-lg">Nenhuma tarefa neste dia com os filtros aplicados.</p>
              )}
              {porPessoaDia.map((g) => {
                const c = contagem(g.itens);
                const aberto = abertos.has(g.id);
                return (
                  <div key={g.id} className="rounded-lg border bg-card">
                    <button
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
                      onClick={() => setAbertos((prev) => { const n = new Set(prev); if (n.has(g.id)) n.delete(g.id); else n.add(g.id); return n; })}
                    >
                      {aberto ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{nomes[g.id] ?? "—"}</p>
                        {escala[g.id]?.funcao && <p className="text-[11px] text-muted-foreground truncate">{escala[g.id]?.funcao}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] shrink-0">
                        <Badge variant="outline" className="font-normal">{c.todo} a fazer</Badge>
                        {c.doing > 0 && <Badge variant="outline" className="font-normal text-blue-700 border-blue-200">{c.doing} em andamento</Badge>}
                        <Badge variant="outline" className="font-normal text-emerald-700 border-emerald-200">{c.done}/{c.total} concluídas</Badge>
                      </div>
                    </button>
                    {aberto && (
                      <div className="border-t p-3">
                        <Quadro
                          itens={filtrosEfetivos.status === "all" ? g.itens : g.itens.filter((i) => i.status === filtrosEfetivos.status)}
                          status={filtrosEfetivos.status}
                          diaSemana={diaLabel(data)}
                          mostrarResponsavel={false}
                          podeEditar={isAdmin}
                          onStatus={mudarStatus}
                          onEdit={(i) => setDialogTarefa({ open: true, tarefa: i.tarefa })}
                          compacto
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {!viewer && !agrupar && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setAgrupar(true)}>Agrupar por funcionário</Button>
            </div>
          )}
        </div>
      )}

      {/* ── Resumo do mês ── */}
      {aba === "mes" && (
        <ResumoMes
          mes={mes}
          hoje={hoje}
          onMes={(m) => setData(m === hoje.slice(0, 7) ? hoje : `${m}-01`)}
          tarefas={ativas}
          escala={escalaAgenda}
          viewer={viewer}
          execucoes={execucoes}
          status={filtrosEfetivos.status}
          mostrarResponsavel={isAdmin && !viewer}
          onPessoa={isAdmin ? (id) => setFiltros((f) => ({ ...f, pessoa: id })) : undefined}
          nomes={nomes}
        />
      )}

      {/* ── Equipe e funções ── */}
      {aba === "equipe" && (
        <EquipeEscala
          pessoas={pessoas}
          escala={escala}
          tarefasPorPessoa={tarefasPorPessoa}
          mes={mes}
          podeEditar={isAdmin}
          onSave={salvarEscala}
        />
      )}

      {/* ── Gerenciar tarefas ── */}
      {aba === "gerenciar" && isAdmin && (
        <GerenciarTarefas
          tarefas={tarefasNomeadas.filter((t) => (mostrarArquivadas || t.ativo) && filtraTarefa(t, filtrosEfetivos))}
          totalArquivadas={tarefas.filter((t) => !t.ativo).length}
          mostrarArquivadas={mostrarArquivadas}
          onMostrarArquivadas={setMostrarArquivadas}
          pagina={pagina}
          onPagina={setPagina}
          onEdit={(t) => setDialogTarefa({ open: true, tarefa: t })}
        />
      )}

      <TarefaDialog
        open={dialogTarefa.open}
        tarefa={dialogTarefa.tarefa}
        pessoas={pessoas}
        onClose={() => setDialogTarefa({ open: false, tarefa: null })}
        onSave={salvarTarefa}
        onDelete={(t) => setExcluir(t)}
      />

      <AlertDialog open={!!excluir} onOpenChange={(o) => !o && setExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir a tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              A tarefa e todo o histórico de execução dela serão apagados. Para tirar do quadro e manter o histórico,
              desmarque "Tarefa ativa" (arquivar).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirTarefa} className="bg-destructive hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Colunas A fazer / Em andamento / Concluídas. */
function Quadro({
  itens, status, diaSemana, mostrarResponsavel, podeEditar, onStatus, onEdit, compacto = false,
}: {
  itens: ItemQuadro[];
  status: Filtros["status"];
  diaSemana: string;
  mostrarResponsavel: boolean;
  podeEditar: boolean;
  onStatus: (item: ItemQuadro, status: StatusExecucao) => void;
  onEdit: (item: ItemQuadro) => void;
  compacto?: boolean;
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${status === "all" ? "lg:grid-cols-3" : ""}`}>
      {COLUNAS.filter((c) => status === "all" || c.status === status).map((col) => {
        const lista = itens.filter((i) => i.status === col.status);
        return (
          <div key={col.status} className={`rounded-xl border-2 p-3 space-y-3 ${compacto ? "" : "min-h-[240px]"} ${col.cor}`}>
            <div className="flex items-center gap-2">
              {col.icon}
              <h3 className="font-semibold text-sm">{col.titulo}</h3>
              <span className="ml-auto text-xs font-medium bg-background border rounded-full px-2 py-0.5 text-foreground">{lista.length}</span>
            </div>
            <div className="space-y-2">
              {lista.length === 0
                ? <p className={`text-xs text-muted-foreground text-center ${compacto ? "py-3" : "py-8"}`}>{col.vazio}</p>
                : lista.map((item) => (
                  <OcorrenciaCard
                    key={chave(item.tarefa.id, item.periodo)}
                    item={item}
                    diaSemana={diaSemana}
                    mostrarResponsavel={mostrarResponsavel}
                    podeEditar={podeEditar}
                    onStatus={onStatus}
                    onEdit={onEdit}
                  />
                ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Resumo({ label, valor, cor }: { label: string; valor: string | number; cor: string }) {
  return (
    <Card className="p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold leading-tight ${cor}`}>{valor}</p>
    </Card>
  );
}

interface LinhaMes {
  tarefa: Tarefa;
  previstas: number;
  done: number;
  doing: number;
  /** A fazer até hoje (atrasadas ou do dia) */
  pendentes: number;
  /** Ainda por vir no mês */
  futuras: number;
}

function ResumoMes({
  mes, hoje, onMes, tarefas, escala, viewer, execucoes, status, mostrarResponsavel, onPessoa, nomes,
}: {
  mes: string;
  hoje: string;
  onMes: (mes: string) => void;
  tarefas: Tarefa[];
  escala: EscalaMap;
  viewer: string | null;
  execucoes: Map<string, Execucao>;
  status: Filtros["status"];
  mostrarResponsavel: boolean;
  onPessoa?: (userId: string) => void;
  nomes: Record<string, string>;
}) {
  const linhas: LinhaMes[] = tarefas.map((t) => {
    const occ = ocorrenciasNoMes(t, mes, escala, viewer);
    const l: LinhaMes = { tarefa: t, previstas: occ.length, done: 0, doing: 0, pendentes: 0, futuras: 0 };
    occ.forEach((o) => {
      const s = execucoes.get(`${t.id}|${o.periodo}`)?.status ?? "todo";
      if (s === "done") l.done++;
      else if (s === "doing") l.doing++;
      else if (o.datas[0] <= hoje) l.pendentes++;
      else l.futuras++;
    });
    return l;
  }).filter((l) => l.previstas > 0)
    .filter((l) => status === "all" || (status === "done" ? l.done : status === "doing" ? l.doing : l.pendentes + l.futuras) > 0)
    .sort((a, b) => (nomes[a.tarefa.assigned_to_ids[0]] ?? "").localeCompare(nomes[b.tarefa.assigned_to_ids[0]] ?? "") || ordenar(a.tarefa, b.tarefa));

  const total = linhas.reduce((acc, l) => ({
    previstas: acc.previstas + l.previstas, done: acc.done + l.done, doing: acc.doing + l.doing,
    pendentes: acc.pendentes + l.pendentes, futuras: acc.futuras + l.futuras,
  }), { previstas: 0, done: 0, doing: 0, pendentes: 0, futuras: 0 });

  // Por funcionário
  const porPessoa = new Map<string, { previstas: number; done: number; pendentes: number }>();
  linhas.forEach((l) => l.tarefa.assigned_to_ids.forEach((id) => {
    const p = porPessoa.get(id) ?? { previstas: 0, done: 0, pendentes: 0 };
    p.previstas += l.previstas; p.done += l.done; p.pendentes += l.pendentes;
    porPessoa.set(id, p);
  }));
  const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMes(addMonths(mes, -1))}><ChevronLeft className="h-4 w-4" /></Button>
          <Input type="month" className="h-8 w-40" value={mes} onChange={(e) => e.target.value && onMes(e.target.value)} />
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onMes(addMonths(mes, 1))}><ChevronRight className="h-4 w-4" /></Button>
          <span className="text-sm font-medium ml-1">{nomeMes(mes).charAt(0).toUpperCase() + nomeMes(mes).slice(1)}</span>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Resumo label="Previstas no mês" valor={total.previstas} cor="text-foreground" />
        <Resumo label="Concluídas" valor={`${total.done} (${pct(total.done, total.previstas)}%)`} cor="text-emerald-600" />
        <Resumo label="Em andamento" valor={total.doing} cor="text-blue-600" />
        <Resumo label="A fazer até hoje" valor={total.pendentes} cor={total.pendentes ? "text-red-600" : "text-slate-600"} />
        <Resumo label="Programadas (por vir)" valor={total.futuras} cor="text-slate-600" />
      </div>

      {mostrarResponsavel && porPessoa.size > 1 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
          {[...porPessoa.entries()].sort((a, b) => (nomes[a[0]] ?? "").localeCompare(nomes[b[0]] ?? "")).map(([id, p]) => (
            <button
              key={id}
              onClick={() => onPessoa?.(id)}
              className="text-left rounded-lg border bg-card p-2.5 hover:border-primary transition-colors"
              title="Filtrar por este funcionário"
            >
              <p className="text-xs font-medium truncate">{nomes[id] ?? "—"}</p>
              <div className="w-full bg-muted rounded-full h-1.5 my-1.5">
                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct(p.done, p.previstas)}%` }} />
              </div>
              <p className="text-[11px] text-muted-foreground">
                {p.done}/{p.previstas} concluídas{p.pendentes ? <span className="text-red-600"> · {p.pendentes} pendente(s)</span> : null}
              </p>
            </button>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                {mostrarResponsavel && <TableHead>Responsável</TableHead>}
                <TableHead className="text-center">Previstas</TableHead>
                <TableHead className="text-center">Concluídas</TableHead>
                <TableHead className="text-center">Em andamento</TableHead>
                <TableHead className="text-center">A fazer até hoje</TableHead>
                <TableHead className="text-center">Por vir</TableHead>
                <TableHead className="w-32">Execução</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-10">Nenhuma tarefa no mês com os filtros aplicados.</TableCell></TableRow>
              )}
              {linhas.map((l) => (
                <TableRow key={l.tarefa.id}>
                  <TableCell>
                    <p className="text-sm font-medium leading-snug">{l.tarefa.title}</p>
                    <p className="text-[11px] text-muted-foreground">{describeAgenda(l.tarefa)}{l.tarefa.setores.length ? ` · ${l.tarefa.setores.join(", ")}` : ""}</p>
                  </TableCell>
                  {mostrarResponsavel && <TableCell className="text-sm">{l.tarefa.assigned_to_names?.join(", ") || "—"}</TableCell>}
                  <TableCell className="text-center">{l.previstas}</TableCell>
                  <TableCell className="text-center text-emerald-700">{l.done}</TableCell>
                  <TableCell className="text-center text-blue-700">{l.doing || ""}</TableCell>
                  <TableCell className={`text-center ${l.pendentes ? "text-red-600 font-medium" : ""}`}>{l.pendentes || ""}</TableCell>
                  <TableCell className="text-center text-muted-foreground">{l.futuras || ""}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className="w-full bg-muted rounded-full h-1.5">
                        <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${pct(l.done, l.previstas)}%` }} />
                      </div>
                      <span className="text-[11px] text-muted-foreground w-8 text-right">{pct(l.done, l.previstas)}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function GerenciarTarefas({
  tarefas, totalArquivadas, mostrarArquivadas, onMostrarArquivadas, pagina, onPagina, onEdit,
}: {
  tarefas: Tarefa[];
  totalArquivadas: number;
  mostrarArquivadas: boolean;
  onMostrarArquivadas: (v: boolean) => void;
  pagina: number;
  onPagina: (p: number) => void;
  onEdit: (t: Tarefa) => void;
}) {
  const lista = [...tarefas].sort((a, b) => Number(b.ativo) - Number(a.ativo)
    || (a.assigned_to_names?.[0] ?? "").localeCompare(b.assigned_to_names?.[0] ?? "") || ordenar(a, b));
  const totalPaginas = Math.max(1, Math.ceil(lista.length / LIST_PAGE_SIZE));
  const pag = Math.min(pagina, totalPaginas);
  const visiveis = lista.slice((pag - 1) * LIST_PAGE_SIZE, pag * LIST_PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">{lista.length} tarefa(s)</p>
        {totalArquivadas > 0 && (
          <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
            <Checkbox checked={mostrarArquivadas} onCheckedChange={(v) => onMostrarArquivadas(v === true)} />
            <Label className="cursor-pointer">Mostrar arquivadas ({totalArquivadas})</Label>
          </label>
        )}
      </div>
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tarefa</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Setores</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Prioridade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-10">Nenhuma tarefa encontrada com os filtros aplicados.</TableCell></TableRow>
              )}
              {visiveis.map((t) => (
                <TableRow key={t.id} className={`cursor-pointer ${t.ativo ? "" : "opacity-60"}`} onClick={() => onEdit(t)}>
                  <TableCell>
                    <p className="text-sm font-medium leading-snug">{t.title}</p>
                    <div className="flex gap-1 mt-0.5">
                      {!t.ativo && <Badge variant="outline" className="text-[10px]">Arquivada{t.versao ? ` · ${t.versao}` : ""}</Badge>}
                      {t.source === "guardiao" && <Badge className="text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-200">Guardião</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{t.assigned_to_names?.join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px]">{t.setores.join(", ") || "—"}</TableCell>
                  <TableCell className="text-xs">{describeAgenda(t)}</TableCell>
                  <TableCell className="text-xs">{t.tipo ?? "—"}</TableCell>
                  <TableCell className="text-xs">{PRIORITY_LABELS[t.priority]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {lista.length > LIST_PAGE_SIZE && (
            <div className="flex items-center justify-between gap-3 py-3 border-t px-4">
              <p className="text-xs text-muted-foreground">Página {pag} de {totalPaginas}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-8" disabled={pag <= 1} onClick={() => onPagina(pag - 1)}><ChevronLeft className="h-4 w-4" /> Anterior</Button>
                <Button variant="outline" size="sm" className="h-8" disabled={pag >= totalPaginas} onClick={() => onPagina(pag + 1)}>Próxima <ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">Clique na tarefa para editar, arquivar ou excluir.</p>
    </div>
  );
}
