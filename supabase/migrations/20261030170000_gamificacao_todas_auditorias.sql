-- =====================================================================
-- Gamificação: todas as auditorias contam pontos — 30/10/2026.
--
-- public.gamificacao_eventos passa a contar também:
--   auditoria:setor_scih    public.scih_sector_audits (auditor_id, audit_date)
--   auditoria:modulo_scih   Módulo SCIH (public.scih_module_data, data->'historico'):
--                           auditorias finalizadas a partir de agora guardam
--                           auditorId e dataISO; as antigas só têm o nome do
--                           auditor e não entram. Conta só membros do hospital.
-- Valem os mesmos pontos e o mesmo teto diário das demais auditorias.
-- Só recria a função (mesma assinatura e permissões): nenhum dado é alterado.
-- =====================================================================

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
    -- Auditorias por setor (SCIH)
    SELECT sa.auditor_id, sa.audit_date, 'auditoria:setor_scih', count(*)
    FROM public.scih_sector_audits sa
    WHERE sa.hospital_id = p_hospital AND sa.auditor_id IS NOT NULL
      AND sa.audit_date >= p_inicio AND sa.audit_date <= p_fim
    GROUP BY 1, 2, 3
    UNION ALL
    -- Módulo SCIH (checklist por setor): auditorias finalizadas com o usuário registrado
    SELECT x.u, x.d, 'auditoria:modulo_scih', count(DISTINCT x.id)
    FROM (
      -- CASE garante que só converte valores válidos (o histórico é jsonb livre)
      SELECT CASE WHEN r->>'auditorId' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
                  THEN (r->>'auditorId')::uuid END AS u,
             CASE WHEN r->>'dataISO' ~ '^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$'
                  THEN (make_date(substr(r->>'dataISO', 1, 4)::int, 1, 1)
                        + (substr(r->>'dataISO', 6, 2)::int - 1) * interval '1 month'
                        + (substr(r->>'dataISO', 9, 2)::int - 1) * interval '1 day')::date END AS d,
             COALESCE(r->>'id', r::text) AS id
      FROM public.scih_module_data md
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(md.data->'historico') = 'array' THEN md.data->'historico' ELSE '[]'::jsonb END) r
      WHERE md.hospital_id = p_hospital
    ) x
    WHERE x.u IS NOT NULL AND x.d IS NOT NULL AND x.d >= p_inicio AND x.d <= p_fim
      -- só quem é da equipe do hospital (o histórico é editável pela tela)
      AND EXISTS (SELECT 1 FROM public.hospital_users hu WHERE hu.hospital_id = p_hospital AND hu.user_id = x.u)
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
    UNION ALL
    -- Alertas clínicos resolvidos, pela gravidade (1 por alerta por dia)
    SELECT at.user_id, (at.created_at AT TIME ZONE 'America/Sao_Paulo')::date, 'alerta_' || at.gravidade, count(DISTINCT at.alerta_chave)
    FROM public.alertas_tratativas at
    WHERE at.hospital_id = p_hospital AND at.user_id IS NOT NULL AND at.status = 'resolvido'
      AND at.created_at >= v_ini AND at.created_at < v_fim
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
