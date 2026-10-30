-- =====================================================================
-- Histórico dos alertas clínicos com pontos na gamificação — 30/10/2026.
--
-- 1) public.alertas_tratativas: cada "visto" ou "resolvido" dado a um alerta
--    da Central de alertas (Monitoramento, Mapa de Precaução, Dashboard de
--    pacientes), com quem fez, quando e a observação. Guarda só a referência
--    do paciente (patients.id), nunca o nome.
--    - Membros do hospital leem e registram; quem registrou pode desfazer em
--      até 24 h. Não há edição.
--    - Um gatilho preenche user_id/user_nome com o usuário logado e confere
--      que o paciente é do mesmo hospital.
-- 2) public.gamificacao_eventos passa a contar os alertas resolvidos
--    ('alerta_alta', 'alerta_media', 'alerta_info'; 1 por alerta por dia).
-- Só cria objetos novos e recria a função: nenhum dado existente é alterado.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.alertas_tratativas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  paciente_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  alerta_chave text NOT NULL CHECK (char_length(alerta_chave) BETWEEN 1 AND 200),
  origem text NOT NULL CHECK (origem IN ('monitoramento', 'mapa', 'dashboard')),
  tipo text NOT NULL CHECK (char_length(tipo) BETWEEN 1 AND 40),
  gravidade text NOT NULL CHECK (gravidade IN ('alta', 'media', 'info')),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  local text CHECK (char_length(local) <= 200),
  status text NOT NULL CHECK (status IN ('visto', 'resolvido')),
  observacao text CHECK (char_length(observacao) <= 1000),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_nome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alertas_tratativas_hospital_data ON public.alertas_tratativas (hospital_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alertas_tratativas_chave ON public.alertas_tratativas (hospital_id, alerta_chave);
CREATE INDEX IF NOT EXISTS idx_alertas_tratativas_paciente ON public.alertas_tratativas (paciente_id);
CREATE INDEX IF NOT EXISTS idx_alertas_tratativas_usuario ON public.alertas_tratativas (user_id);

CREATE OR REPLACE FUNCTION public.alertas_tratativas_preencher()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.user_id := auth.uid();
  NEW.created_at := now();
  SELECT COALESCE(NULLIF(pf.full_name, ''), split_part(pf.email, '@', 1))
    INTO NEW.user_nome
    FROM public.profiles pf WHERE pf.user_id = NEW.user_id;
  IF NEW.paciente_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.patients p WHERE p.id = NEW.paciente_id AND p.hospital_id = NEW.hospital_id
  ) THEN
    RAISE EXCEPTION 'paciente não pertence a este hospital' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.alertas_tratativas_preencher() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS alertas_tratativas_preencher ON public.alertas_tratativas;
CREATE TRIGGER alertas_tratativas_preencher
  BEFORE INSERT ON public.alertas_tratativas
  FOR EACH ROW EXECUTE FUNCTION public.alertas_tratativas_preencher();

ALTER TABLE public.alertas_tratativas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros leem o histórico de alertas" ON public.alertas_tratativas
  FOR SELECT TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
    OR hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
  );

CREATE POLICY "Membros registram alertas tratados" ON public.alertas_tratativas
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
      OR hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
    )
  );

CREATE POLICY "Quem registrou desfaz em até 24 horas" ON public.alertas_tratativas
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND created_at > now() - interval '24 hours');

GRANT SELECT, INSERT, DELETE ON public.alertas_tratativas TO authenticated;

-- ---------------------------------------------------------------------
-- Gamificação: mesma função de 20261030120000, agora com os alertas resolvidos.
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
