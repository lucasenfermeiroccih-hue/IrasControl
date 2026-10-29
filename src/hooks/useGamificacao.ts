import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { fetchAllRows } from "@/lib/fetchAllRows";
import { diaLocal, gamificacaoAtiva, resumoGamificacao, type EventoAuditoria, type EventoTarefa } from "@/lib/gamificacao";

export const CHAVE_GAMIFICACAO = ["gamificacao"] as const;

/** Progresso pessoal (últimos 12 meses), a partir de auditorias e tarefas concluídas. */
export function useGamificacao() {
  const { user } = useAuthReady();
  const userId = user?.id;
  return useQuery({
    queryKey: [...CHAVE_GAMIFICACAO, "pessoal", userId],
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const inicio = new Date();
      inicio.setFullYear(inicio.getFullYear() - 1);
      const desde = diaLocal(inicio);
      const [auditorias, tarefas] = await Promise.all([
        fetchAllRows<{ audit_date: string; audit_type: string | null }>(() =>
          supabase.from("audits").select("audit_date, audit_type")
            .eq("auditor_id", userId!).gte("audit_date", desde).order("id")),
        fetchAllRows<{ concluido_em: string | null; kanban_ccih_tarefas: { priority: string | null } | null }>(() =>
          supabase.from("kanban_ccih_execucoes").select("concluido_em, kanban_ccih_tarefas(priority)")
            .eq("concluido_por", userId!).eq("status", "done").gte("concluido_em", inicio.toISOString()).order("id")),
      ]);
      const evAud: EventoAuditoria[] = auditorias.map((a) => ({ data: a.audit_date, tipo: a.audit_type }));
      const evTar: EventoTarefa[] = tarefas
        .filter((t) => t.concluido_em)
        .map((t) => ({ data: t.concluido_em!, prioridade: t.kanban_ccih_tarefas?.priority }));
      return resumoGamificacao(evAud, evTar);
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
