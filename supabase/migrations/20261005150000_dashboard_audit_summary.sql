-- Resumo de auditorias para o Dashboard, agregado no banco.
--
-- Antes o Dashboard baixava todas as auditorias e todos os itens de auditoria
-- (mais de 150 mil linhas em um hospital) para somar no navegador, o que deixava
-- a página carregando por muito tempo (e cortava em 1.000 linhas por consulta).
-- Esta função devolve as somas já agrupadas por tipo de auditoria, setor e mês,
-- que é tudo o que os indicadores e gráficos do Dashboard usam.
--
-- SECURITY DEFINER para não reavaliar as políticas de RLS linha a linha; o acesso
-- é verificado explicitamente: o usuário precisa ser membro do hospital ou
-- super_admin (mesma regra das políticas de SELECT de audits/audit_items).

CREATE OR REPLACE FUNCTION public.dashboard_audit_summary(p_hospital_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
BEGIN
  IF NOT (
    p_hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado ao hospital %', p_hospital_id USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    -- Uma linha por (tipo, setor, mês): nº de auditorias e soma dos itens
    'audits', COALESCE((
      SELECT jsonb_agg(row_to_json(a))
      FROM (
        SELECT au.audit_type::text AS audit_type,
               au.sector,
               to_char(au.audit_date, 'YYYY-MM') AS ym,
               count(*)::int AS audits,
               COALESCE(sum(au.compliant_items), 0)::int AS compliant_items,
               COALESCE(sum(au.total_items), 0)::int AS total_items
        FROM public.audits au
        WHERE au.hospital_id = p_hospital_id
        GROUP BY 1, 2, 3
      ) a
    ), '[]'::jsonb),
    -- Uma linha por (tipo, setor, mês, categoria do item): não conformes e aplicáveis
    'items', COALESCE((
      SELECT jsonb_agg(row_to_json(i))
      FROM (
        SELECT au.audit_type::text AS audit_type,
               au.sector,
               to_char(au.audit_date, 'YYYY-MM') AS ym,
               COALESCE(NULLIF(it.category, ''), 'Geral') AS category,
               count(*) FILTER (WHERE it.status = 'non_compliant')::int AS nc,
               count(*) FILTER (WHERE it.status NOT IN ('not_applicable', 'not_evaluated'))::int AS applicable
        FROM public.audits au
        JOIN public.audit_items it ON it.audit_id = au.id
        WHERE au.hospital_id = p_hospital_id
        GROUP BY 1, 2, 3, 4
      ) i
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.dashboard_audit_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dashboard_audit_summary(uuid) TO authenticated;
