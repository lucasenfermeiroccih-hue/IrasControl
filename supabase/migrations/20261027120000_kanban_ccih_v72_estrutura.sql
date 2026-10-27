-- =====================================================================
-- Kanban SCIH — estrutura da reorganização V7.2 (HGNI, 27/10/2026)
--
-- 1) Tarefas: setores, tipo, dias de execução, plantão, horário de
--    referência, tempo-alvo, validador, backup, alteração e versão.
--    "ativo = false" arquiva a tarefa (some do quadro, fica no histórico).
-- 2) Escala: função de cada pessoa e regime de trabalho
--    ('fixo' = dias da semana; 'plantao' = datas dos plantões).
-- 3) Execuções: status de cada ocorrência da tarefa
--    (todo = a fazer, doing = em andamento, done = concluída).
--    periodo = dia (diária), segunda-feira da semana (semanal),
--    1º dia do mês (mensal) ou 2000-01-01 (única vez).
--    Sem linha para a ocorrência = "a fazer".
-- =====================================================================

-- ── 1) Tarefas ─────────────────────────────────────────────────────────
ALTER TABLE public.kanban_ccih_tarefas
  ADD COLUMN IF NOT EXISTS setores text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tipo text,
  ADD COLUMN IF NOT EXISTS dias_semana smallint[],
  ADD COLUMN IF NOT EXISTS dias_mes smallint[],
  ADD COLUMN IF NOT EXISTS no_plantao boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS quando text,
  ADD COLUMN IF NOT EXISTS horario text,
  ADD COLUMN IF NOT EXISTS tempo_alvo text,
  ADD COLUMN IF NOT EXISTS validador text,
  ADD COLUMN IF NOT EXISTS backup text,
  ADD COLUMN IF NOT EXISTS alteracao text,
  ADD COLUMN IF NOT EXISTS versao text,
  ADD COLUMN IF NOT EXISTS ordem integer,
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true;

ALTER TABLE public.kanban_ccih_tarefas DROP CONSTRAINT IF EXISTS kanban_ccih_tarefas_dias_semana_check;
ALTER TABLE public.kanban_ccih_tarefas ADD CONSTRAINT kanban_ccih_tarefas_dias_semana_check
  CHECK (dias_semana IS NULL OR dias_semana <@ ARRAY[0,1,2,3,4,5,6]::smallint[]);
ALTER TABLE public.kanban_ccih_tarefas DROP CONSTRAINT IF EXISTS kanban_ccih_tarefas_dias_mes_check;
ALTER TABLE public.kanban_ccih_tarefas ADD CONSTRAINT kanban_ccih_tarefas_dias_mes_check
  CHECK (dias_mes IS NULL OR dias_mes <@ ARRAY[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31]::smallint[]);

CREATE INDEX IF NOT EXISTS idx_kanban_ccih_tarefas_hospital_ativo
  ON public.kanban_ccih_tarefas (hospital_id, ativo);

COMMENT ON COLUMN public.kanban_ccih_tarefas.setores IS 'Setores da tarefa (filtro do quadro). Vazio = gestão/geral do SCIH';
COMMENT ON COLUMN public.kanban_ccih_tarefas.dias_semana IS 'Dias de execução (0 = domingo … 6 = sábado). Nulo = todos os dias de trabalho do responsável';
COMMENT ON COLUMN public.kanban_ccih_tarefas.dias_mes IS 'Dias do mês (ex.: 10 e 25). Diária: só nesses dias (fim de semana passa para a segunda). Mensal: janela do mês';
COMMENT ON COLUMN public.kanban_ccih_tarefas.no_plantao IS 'A tarefa acontece nos plantões do responsável (datas da escala)';
COMMENT ON COLUMN public.kanban_ccih_tarefas.ativo IS 'false = arquivada (versão anterior); não aparece no quadro';

-- ── 2) Escala: função e regime ─────────────────────────────────────────
ALTER TABLE public.kanban_ccih_escala
  ADD COLUMN IF NOT EXISTS funcao text,
  ADD COLUMN IF NOT EXISTS atribuicoes text,
  ADD COLUMN IF NOT EXISTS regime text NOT NULL DEFAULT 'fixo',
  ADD COLUMN IF NOT EXISTS plantoes date[] NOT NULL DEFAULT '{}';

ALTER TABLE public.kanban_ccih_escala DROP CONSTRAINT IF EXISTS kanban_ccih_escala_regime_check;
ALTER TABLE public.kanban_ccih_escala ADD CONSTRAINT kanban_ccih_escala_regime_check
  CHECK (regime IN ('fixo', 'plantao'));

COMMENT ON COLUMN public.kanban_ccih_escala.regime IS 'fixo = trabalha nos dias_semana; plantao = trabalha nas datas de plantoes';

-- ── 3) Execuções (status por ocorrência) ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.kanban_ccih_execucoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  tarefa_id uuid NOT NULL REFERENCES public.kanban_ccih_tarefas(id) ON DELETE CASCADE,
  periodo date NOT NULL,
  status text NOT NULL DEFAULT 'todo',
  observacao text,
  iniciado_em timestamptz,
  concluido_em timestamptz,
  concluido_por uuid,
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tarefa_id, periodo),
  CONSTRAINT kanban_ccih_execucoes_status_check CHECK (status IN ('todo', 'doing', 'done'))
);

CREATE INDEX IF NOT EXISTS idx_kanban_ccih_execucoes_hospital_periodo
  ON public.kanban_ccih_execucoes (hospital_id, periodo);

ALTER TABLE public.kanban_ccih_execucoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem as execucoes do hospital" ON public.kanban_ccih_execucoes
  FOR SELECT TO authenticated
  USING (
    hospital_id IN (SELECT get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)
    OR ( SELECT has_role(( SELECT auth.uid() AS uid), 'super_admin'::app_role) AS has_role)
  );

CREATE POLICY "Membros registram execucoes do hospital" ON public.kanban_ccih_execucoes
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id IN (SELECT get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)
    AND tarefa_id IN (SELECT t.id FROM public.kanban_ccih_tarefas t WHERE t.hospital_id = kanban_ccih_execucoes.hospital_id)
  );

CREATE POLICY "Membros atualizam execucoes do hospital" ON public.kanban_ccih_execucoes
  FOR UPDATE TO authenticated
  USING (hospital_id IN (SELECT get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))
  WITH CHECK (hospital_id IN (SELECT get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids));

CREATE POLICY "Admins removem execucoes do hospital" ON public.kanban_ccih_execucoes
  FOR DELETE TO authenticated
  USING (
    ( SELECT has_role(( SELECT auth.uid() AS uid), 'super_admin'::app_role) AS has_role)
    OR (
      hospital_id IN (SELECT get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)
      AND (
        ( SELECT has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::app_role) AS has_role)
        OR hospital_id IN (SELECT get_primary_admin_hospital_ids() AS get_primary_admin_hospital_ids)
      )
    )
  );

REVOKE ALL ON public.kanban_ccih_execucoes FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_ccih_execucoes TO authenticated;
