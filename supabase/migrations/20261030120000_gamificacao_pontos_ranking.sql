-- =====================================================================
-- Gamificação: pontos por tarefas, auditorias e preenchimentos,
-- ranking mensal da equipe e conquistas ajustáveis — 30/10/2026.
--
-- 1) public.gamificacao_config: regras de cada hospital (pontos por ação,
--    teto diário de auditorias, conquistas, ranking ligado/desligado).
--    Membros leem; administradores do hospital editam.
-- 2) public.gamificacao_eventos(hospital, início, fim, usuário?): contagens por
--    pessoa, dia e tipo de ação (sem dados de pacientes), mais o nome de cada
--    pessoa do hospital. Os pontos são calculados no aplicativo a partir da
--    configuração, para que um ajuste valha na hora, inclusive para meses passados.
--
-- Fontes:
--   tarefa_low/normal/high   kanban_ccih_execucoes concluídas (concluido_por)
--   auditoria:<tipo>         audits (auditor_id)
--   paciente_cadastro        patient_audit_log INSERT (changed_by)
--   paciente_atualizacao     patient_audit_log UPDATE: 1 por paciente por dia
--   precaucao                precautions (created_by)
--   exame                    lab_results (created_by)
--   caso_iras                infection_cases (created_by)
--   indicador                indicadores_records, isc_records, ddd_records,
--                            hygiene_consumption_records (user_id)
-- Só cria objetos novos: nenhum dado existente é alterado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.gamificacao_config (
  hospital_id uuid PRIMARY KEY REFERENCES public.hospitals(id) ON DELETE CASCADE,
  pontos jsonb NOT NULL DEFAULT '{}'::jsonb,
  conquistas jsonb,
  ranking_ativo boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_gamificacao_config_updated_by ON public.gamificacao_config (updated_by);

ALTER TABLE public.gamificacao_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros leem a configuração da gamificação" ON public.gamificacao_config
  FOR SELECT TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
    OR hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
  );

CREATE POLICY "Administradores criam a configuração da gamificação" ON public.gamificacao_config
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
    OR public.is_hospital_admin(hospital_id)
    OR (hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
        AND (SELECT public.has_role((SELECT auth.uid()), 'hospital_admin'::public.app_role)))
  );

CREATE POLICY "Administradores ajustam a configuração da gamificação" ON public.gamificacao_config
  FOR UPDATE TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
    OR public.is_hospital_admin(hospital_id)
    OR (hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
        AND (SELECT public.has_role((SELECT auth.uid()), 'hospital_admin'::public.app_role)))
  )
  WITH CHECK (
    (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
    OR public.is_hospital_admin(hospital_id)
    OR (hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
        AND (SELECT public.has_role((SELECT auth.uid()), 'hospital_admin'::public.app_role)))
  );

GRANT SELECT, INSERT, UPDATE ON public.gamificacao_config TO authenticated;

-- ---------------------------------------------------------------------
-- Contagens por pessoa/dia/tipo. SECURITY DEFINER para somar ações de toda
-- a equipe (o ranking), mas só para quem é membro do hospital; devolve
-- apenas números e nomes, nunca dados de pacientes.
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.gamificacao_eventos(
  p_hospital uuid,
  p_inicio date,
  p_fim date,
  p_usuario uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  -- Limites do período à meia-noite de Brasília (mesmo fuso usado para os dias)
  v_ini timestamptz := p_inicio::timestamp AT TIME ZONE 'America/Sao_Paulo';
  v_fim timestamptz := (p_fim + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo';
  v_eventos jsonb;
  v_pessoas jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'não autenticado' USING ERRCODE = '42501';
  END IF;
  IF NOT (
    public.has_role(v_uid, 'super_admin'::public.app_role)
    OR EXISTS (SELECT 1 FROM public.hospital_users hu WHERE hu.user_id = v_uid AND hu.hospital_id = p_hospital)
  ) THEN
    RAISE EXCEPTION 'sem acesso a este hospital' USING ERRCODE = '42501';
  END IF;
  IF p_fim < p_inicio OR p_fim - p_inicio > 400 THEN
    RAISE EXCEPTION 'período inválido (máximo de 400 dias)';
  END IF;

  WITH ev AS (
    -- Tarefas do Kanban concluídas, por prioridade
    SELECT e.concluido_por AS u, (e.concluido_em AT TIME ZONE 'America/Sao_Paulo')::date AS d,
           'tarefa_' || COALESCE(NULLIF(t.priority, ''), 'normal') AS t, count(*) AS q
    FROM public.kanban_ccih_execucoes e
    JOIN public.kanban_ccih_tarefas t ON t.id = e.tarefa_id
    WHERE e.hospital_id = p_hospital AND e.status = 'done' AND e.concluido_por IS NOT NULL
      AND e.concluido_em >= v_ini AND e.concluido_em < v_fim
    GROUP BY 1, 2, 3
    UNION ALL
    -- Auditorias, por tipo
    SELECT a.auditor_id, a.audit_date::date, 'auditoria:' || a.audit_type::text, count(*)
    FROM public.audits a
    WHERE a.hospital_id = p_hospital AND a.auditor_id IS NOT NULL
      AND a.audit_date >= p_inicio AND a.audit_date <= p_fim
    GROUP BY 1, 2, 3
    UNION ALL
    -- Monitoramento de pacientes: cadastro
    SELECT l.changed_by, (l.changed_at AT TIME ZONE 'America/Sao_Paulo')::date, 'paciente_cadastro', count(*)
    FROM public.patient_audit_log l
    WHERE l.hospital_id = p_hospital AND l.changed_by IS NOT NULL AND l.action = 'INSERT'
      AND l.changed_at >= v_ini AND l.changed_at < v_fim
    GROUP BY 1, 2, 3
    UNION ALL
    -- Monitoramento de pacientes: atualização (1 por paciente por dia)
    SELECT l.changed_by, (l.changed_at AT TIME ZONE 'America/Sao_Paulo')::date, 'paciente_atualizacao', count(DISTINCT l.patient_id)
    FROM public.patient_audit_log l
    WHERE l.hospital_id = p_hospital AND l.changed_by IS NOT NULL AND l.action = 'UPDATE'
      AND l.changed_at >= v_ini AND l.changed_at < v_fim
    GROUP BY 1, 2, 3
    UNION ALL
    -- Precauções registradas
    SELECT pr.created_by, (pr.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'precaucao', count(*)
    FROM public.precautions pr
    JOIN public.patients p ON p.id = pr.patient_id
    WHERE p.hospital_id = p_hospital AND pr.created_by IS NOT NULL
      AND pr.created_at >= v_ini AND pr.created_at < v_fim
    GROUP BY 1, 2, 3
    UNION ALL
    -- Exames / culturas
    SELECT lr.created_by, (lr.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'exame', count(*)
    FROM public.lab_results lr
    WHERE lr.hospital_id = p_hospital AND lr.created_by IS NOT NULL
      AND lr.created_at >= v_ini AND lr.created_at < v_fim
    GROUP BY 1, 2, 3
    UNION ALL
    -- Casos de IRAS
    SELECT ic.created_by, (ic.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'caso_iras', count(*)
    FROM public.infection_cases ic
    WHERE ic.hospital_id = p_hospital AND ic.created_by IS NOT NULL
      AND ic.created_at >= v_ini AND ic.created_at < v_fim
    GROUP BY 1, 2, 3
    UNION ALL
    -- Indicadores (gerais, ISC, DDD, consumo de higiene)
    SELECT x.user_id, (x.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'indicador', count(*)
    FROM (
      SELECT user_id, created_at, hospital_id FROM public.indicadores_records
      UNION ALL SELECT user_id, created_at, hospital_id FROM public.isc_records
      UNION ALL SELECT user_id, created_at, hospital_id FROM public.ddd_records
      UNION ALL SELECT user_id, created_at, hospital_id FROM public.hygiene_consumption_records
    ) x
    WHERE x.hospital_id = p_hospital AND x.user_id IS NOT NULL
      AND x.created_at >= v_ini AND x.created_at < v_fim
    GROUP BY 1, 2, 3
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object('u', ev.u, 'd', ev.d, 't', ev.t, 'q', ev.q) ORDER BY ev.d), '[]'::jsonb)
  INTO v_eventos
  FROM ev
  WHERE p_usuario IS NULL OR ev.u = p_usuario;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', hu.user_id,
           'nome', COALESCE(NULLIF(pf.full_name, ''), split_part(pf.email, '@', 1), 'Sem nome'))), '[]'::jsonb)
  INTO v_pessoas
  FROM public.hospital_users hu
  LEFT JOIN public.profiles pf ON pf.user_id = hu.user_id
  WHERE hu.hospital_id = p_hospital
    AND (p_usuario IS NULL OR hu.user_id = p_usuario);

  RETURN jsonb_build_object('eventos', v_eventos, 'pessoas', v_pessoas);
END;
$$;

REVOKE ALL ON FUNCTION public.gamificacao_eventos(uuid, date, date, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gamificacao_eventos(uuid, date, date, uuid) TO authenticated;
