-- =====================================================================
-- Kanban CCIH — escala da equipe (dias fixos da semana)
--
-- Cada funcionário pode ter os dias da semana em que trabalha. Tarefas
-- DIÁRIAS só aparecem no quadro nos dias da escala da pessoa. Sem linha
-- aqui, a pessoa trabalha todos os dias (comportamento anterior).
--
-- dias_semana usa a numeração do JavaScript (Date.getDay()):
--   0 = domingo, 1 = segunda, ..., 6 = sábado
--
-- Leitura: membros do hospital. Escrita: administradores do hospital
-- (hospital_admin, administrador principal) e super_admin.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.kanban_ccih_escala (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  dias_semana smallint[] NOT NULL DEFAULT '{1,2,3,4,5}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  UNIQUE (hospital_id, user_id),
  CONSTRAINT dias_semana_validos CHECK (dias_semana <@ ARRAY[0,1,2,3,4,5,6]::smallint[])
);

ALTER TABLE public.kanban_ccih_escala ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros veem a escala do hospital" ON public.kanban_ccih_escala
  FOR SELECT TO authenticated
  USING (
    hospital_id IN (SELECT get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)
    OR ( SELECT has_role(( SELECT auth.uid() AS uid), 'super_admin'::app_role) AS has_role)
  );

CREATE POLICY "Admins gerenciam a escala do hospital" ON public.kanban_ccih_escala
  FOR ALL TO authenticated
  USING (
    ( SELECT has_role(( SELECT auth.uid() AS uid), 'super_admin'::app_role) AS has_role)
    OR (
      hospital_id IN (SELECT get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)
      AND (
        ( SELECT has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::app_role) AS has_role)
        OR hospital_id IN (SELECT get_primary_admin_hospital_ids() AS get_primary_admin_hospital_ids)
      )
    )
  )
  WITH CHECK (
    ( SELECT has_role(( SELECT auth.uid() AS uid), 'super_admin'::app_role) AS has_role)
    OR (
      hospital_id IN (SELECT get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)
      AND (
        ( SELECT has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::app_role) AS has_role)
        OR hospital_id IN (SELECT get_primary_admin_hospital_ids() AS get_primary_admin_hospital_ids)
      )
    )
  );

REVOKE ALL ON public.kanban_ccih_escala FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.kanban_ccih_escala TO authenticated;
