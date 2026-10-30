import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { normalizaRegras, REGRAS_PADRAO, type RegrasAlertas } from "@/lib/alertasClinicos";

const CHAVE = "alertas-regras";

/** Regras da Central de alertas do hospital. Sem linha salva (ou sem a tabela): padrões. */
export function useRegrasAlertas(hospitalId: string | null | undefined) {
  const q = useQuery({
    queryKey: [CHAVE, hospitalId],
    enabled: !!hospitalId,
    staleTime: 10 * 60 * 1000,
    queryFn: async (): Promise<{ regras: RegrasAlertas; disponivel: boolean }> => {
      const { data, error } = await supabase.from("alertas_config" as never)
        .select("regras").eq("hospital_id", hospitalId!).maybeSingle();
      if (error) return { regras: REGRAS_PADRAO, disponivel: false };
      return { regras: normalizaRegras((data as { regras?: unknown } | null)?.regras), disponivel: true };
    },
  });
  return { regras: q.data?.regras ?? REGRAS_PADRAO, disponivel: q.data?.disponivel ?? false, carregando: q.isLoading };
}

export function useSalvarRegrasAlertas(hospitalId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (regras: RegrasAlertas) => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("alertas_config" as never).upsert({
        hospital_id: hospitalId,
        regras: regras as unknown as Json,
        updated_at: new Date().toISOString(),
        updated_by: user?.id ?? null,
      } as never, { onConflict: "hospital_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CHAVE, hospitalId] }),
  });
}
