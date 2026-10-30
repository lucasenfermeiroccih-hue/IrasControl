import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import {
  diaLocal, gamificacaoAtiva, normalizaConfig, painelEquipe, ranking, resumoGamificacao,
  type Evento, type GamConfig,
} from "@/lib/gamificacao";

export const CHAVE_GAMIFICACAO = ["gamificacao"] as const;

/**
 * Mensagem para o usuário a partir do erro da função gamificacao_eventos.
 * PGRST202 = a função não existe para a API (migração não aplicada ou cache do
 * Supabase desatualizado); os demais erros mostram o motivo real.
 */
export function erroGamificacao(e: unknown): { titulo: string; detalhe: string } {
  const err = (e || {}) as { message?: string; code?: string; details?: string; hint?: string };
  const detalhe = [err.code, err.message, err.details, err.hint].filter(Boolean).join(" · ");
  if (err.code === "PGRST202" || /could not find the function|schema cache/i.test(err.message || "")) {
    return {
      titulo: "A função da gamificação não foi encontrada no banco. Rode no SQL Editor do Supabase a migração 20261030120000 e depois: NOTIFY pgrst, 'reload schema';",
      detalhe,
    };
  }
  if (err.code === "42501") return { titulo: "Sem acesso aos dados de gamificação deste hospital.", detalhe };
  return { titulo: "Não foi possível carregar a gamificação.", detalhe: detalhe || String(e) };
}

/** Regras do hospital (pontos por ação, conquistas, ranking). Sem linha salva: padrões. */
export function useGamConfig() {
  const { hospitalId } = useHospitalContext();
  return useQuery({
    queryKey: [...CHAVE_GAMIFICACAO, "config", hospitalId],
    enabled: !!hospitalId,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<GamConfig> => {
      const { data, error } = await supabase.from("gamificacao_config")
        .select("pontos, conquistas, ranking_ativo").eq("hospital_id", hospitalId!).maybeSingle();
      // Tabela ainda não criada: segue com os padrões
      if (error) return normalizaConfig(null);
      return normalizaConfig(data);
    },
  });
}

export function useSalvarGamConfig() {
  const { hospitalId } = useHospitalContext();
  const { user } = useAuthReady();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (cfg: GamConfig) => {
      const { error } = await supabase.from("gamificacao_config").upsert({
        hospital_id: hospitalId!,
        pontos: cfg.pontos as unknown as Json,
        conquistas: cfg.conquistas as unknown as Json,
        ranking_ativo: cfg.rankingAtivo,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      }, { onConflict: "hospital_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_GAMIFICACAO }),
  });
}

async function buscarEventos(hospitalId: string, inicio: string, fim: string, usuario?: string) {
  const { data, error } = await supabase.rpc("gamificacao_eventos", {
    p_hospital: hospitalId, p_inicio: inicio, p_fim: fim, ...(usuario ? { p_usuario: usuario } : {}),
  });
  if (error) throw error;
  const r = (data || {}) as { eventos?: Evento[]; pessoas?: { id: string; nome: string }[] };
  return { eventos: r.eventos ?? [], pessoas: r.pessoas ?? [] };
}

/**
 * Progresso pessoal (últimos 12 meses) com as regras do hospital.
 * `adiarMs`: espera a tela atual carregar antes de buscar (selo do cabeçalho),
 * para não disputar a rede com os dados da página.
 */
export function useGamificacao(opcoes?: { adiarMs?: number }) {
  const { user } = useAuthReady();
  const { hospitalId } = useHospitalContext();
  const { data: cfg } = useGamConfig();
  const userId = user?.id;
  const [liberado, setLiberado] = useState(!opcoes?.adiarMs);
  useEffect(() => {
    if (liberado || !opcoes?.adiarMs) return;
    const t = setTimeout(() => setLiberado(true), opcoes.adiarMs);
    return () => clearTimeout(t);
  }, [liberado, opcoes?.adiarMs]);
  return useQuery({
    queryKey: [...CHAVE_GAMIFICACAO, "pessoal", hospitalId, userId, cfg],
    enabled: liberado && !!userId && !!hospitalId && !!cfg,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const hoje = new Date();
      const inicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate() + 1);
      const { eventos } = await buscarEventos(hospitalId!, diaLocal(inicio), diaLocal(hoje), userId);
      return resumoGamificacao(eventos, cfg!);
    },
  });
}

/** Ranking da equipe no mês (mes = qualquer data dentro do mês). */
export function useRanking(mes: Date, ativo = true) {
  const { hospitalId } = useHospitalContext();
  const { data: cfg } = useGamConfig();
  const ini = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const fim = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  return useQuery({
    queryKey: [...CHAVE_GAMIFICACAO, "ranking", hospitalId, diaLocal(ini), cfg],
    enabled: ativo && !!hospitalId && !!cfg,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const { eventos, pessoas } = await buscarEventos(hospitalId!, diaLocal(ini), diaLocal(fim));
      return ranking(eventos, pessoas, cfg!.pontos);
    },
  });
}

/** Painel do gestor: toda a equipe nos últimos 12 meses (carregado só nessa aba). */
export function usePainelEquipe(ativo = true) {
  const { hospitalId } = useHospitalContext();
  const { data: cfg } = useGamConfig();
  return useQuery({
    queryKey: [...CHAVE_GAMIFICACAO, "equipe-12m", hospitalId, cfg],
    enabled: ativo && !!hospitalId && !!cfg,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const hoje = new Date();
      const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 11, 1);
      const { eventos, pessoas } = await buscarEventos(hospitalId!, diaLocal(inicio), diaLocal(hoje));
      return painelEquipe(eventos, pessoas, cfg!, hoje);
    },
  });
}

export interface MetaEquipe {
  auditoriasMes: number;
  auditoriasMesAnterior: number;
  tarefasMes: number;
  /** Fração do mês já decorrida (ritmo esperado) */
  ritmo: number;
}

/** Meta coletiva do hospital: superar as auditorias do mês anterior. */
export function useMetaEquipe() {
  const { hospitalId } = useHospitalContext();
  return useQuery({
    queryKey: [...CHAVE_GAMIFICACAO, "equipe", hospitalId],
    enabled: !!hospitalId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<MetaEquipe> => {
      const hoje = new Date();
      const iniMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const iniAnt = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const diasMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
      const conta = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
        const { count, error } = await q;
        if (error) throw error;
        return count ?? 0;
      };
      const [auditoriasMes, auditoriasMesAnterior, tarefasMes] = await Promise.all([
        conta(supabase.from("audits").select("id", { count: "exact", head: true })
          .eq("hospital_id", hospitalId!).gte("audit_date", diaLocal(iniMes))),
        conta(supabase.from("audits").select("id", { count: "exact", head: true })
          .eq("hospital_id", hospitalId!).gte("audit_date", diaLocal(iniAnt)).lt("audit_date", diaLocal(iniMes))),
        conta(supabase.from("kanban_ccih_execucoes").select("id", { count: "exact", head: true })
          .eq("hospital_id", hospitalId!).eq("status", "done").gte("concluido_em", iniMes.toISOString())),
      ]);
      return { auditoriasMes, auditoriasMesAnterior, tarefasMes, ritmo: hoje.getDate() / diasMes };
    },
  });
}

/** Preferência local de exibir a gamificação (atualiza entre componentes). */
export function useGamificacaoAtiva() {
  const [ativa, setAtiva] = useState(gamificacaoAtiva);
  useEffect(() => {
    const atualiza = () => setAtiva(gamificacaoAtiva());
    window.addEventListener("irascontrol-gamificacao", atualiza);
    window.addEventListener("storage", atualiza);
    return () => {
      window.removeEventListener("irascontrol-gamificacao", atualiza);
      window.removeEventListener("storage", atualiza);
    };
  }, []);
  return ativa;
}
