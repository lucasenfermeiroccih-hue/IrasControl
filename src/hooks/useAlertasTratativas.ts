import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CHAVE_GAMIFICACAO } from "@/hooks/useGamificacao";
import type { AlertaClinico, OrigemAlerta, StatusTratativa, Tratativa } from "@/lib/alertasClinicos";

const CHAVE = "alertas-tratativas";
/** Janela do histórico carregado (dias). */
export const DIAS_HISTORICO = 30;

/** Tabela ainda não criada no banco (migração 20261030150000 pendente). */
const tabelaAusente = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === "42P01" || e.code === "PGRST205" || /could not find the table|does not exist/i.test(e.message || ""));

/** Vistos e resolvidos dos últimos 30 dias do hospital (mais recentes primeiro). */
export function useAlertasTratativas(hospitalId: string | null | undefined) {
  return useQuery({
    queryKey: [CHAVE, hospitalId],
    enabled: !!hospitalId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<{ tratativas: Tratativa[]; disponivel: boolean }> => {
      const desde = new Date(Date.now() - DIAS_HISTORICO * 86400000).toISOString();
      const { data, error } = await supabase.from("alertas_tratativas" as never)
        .select("*").eq("hospital_id", hospitalId!).gte("created_at", desde)
        .order("created_at", { ascending: false }).limit(2000);
      if (tabelaAusente(error)) return { tratativas: [], disponivel: false };
      if (error) throw error;
      return { tratativas: (data ?? []) as unknown as Tratativa[], disponivel: true };
    },
  });
}

export function useRegistrarTratativa(hospitalId: string | null | undefined, origem: OrigemAlerta) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ alerta, status, observacao }: { alerta: AlertaClinico; status: StatusTratativa; observacao?: string }) => {
      // user_id e user_nome são preenchidos pelo banco com o usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("alertas_tratativas" as never).insert({
        hospital_id: hospitalId, paciente_id: alerta.pacienteId || null, alerta_chave: alerta.id, origem,
        tipo: alerta.tipo, gravidade: alerta.gravidade, titulo: alerta.titulo.slice(0, 200), local: alerta.local.slice(0, 200) || null,
        status, observacao: observacao?.trim().slice(0, 1000) || null, user_id: user?.id,
      } as never);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: [CHAVE, hospitalId] });
      if (v.status === "resolvido") qc.invalidateQueries({ queryKey: CHAVE_GAMIFICACAO });
    },
  });
}

/** Desfaz um registro próprio (o banco só permite nas primeiras 24 h). */
export function useDesfazerTratativa(hospitalId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Tratativa) => {
      const { data, error } = await supabase.from("alertas_tratativas" as never).delete().eq("id", t.id).select("id");
      if (error) throw error;
      if (!(data as unknown[] | null)?.length) throw new Error("Só é possível desfazer os seus registros nas primeiras 24 horas.");
    },
    onSuccess: (_d, t) => {
      qc.invalidateQueries({ queryKey: [CHAVE, hospitalId] });
      if (t.status === "resolvido") qc.invalidateQueries({ queryKey: CHAVE_GAMIFICACAO });
    },
  });
}
