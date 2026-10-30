-- =====================================================================
-- Prazos dos alertas clínicos configuráveis pelo gestor — 30/10/2026.
--
-- public.alertas_config: regras da Central de alertas de cada hospital, em
-- jsonb (prazos de dispositivos, antimicrobiano, internação, exame MDR e
-- precaução; tipos desligados; dias em que o alerta resolvido fica oculto).
-- Sem linha salva, o aplicativo usa os padrões.
-- Membros leem; administradores do hospital editam (mesmas regras de
-- public.gamificacao_config). Só cria objetos novos.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.alertas_config (
  hospital_id uuid PRIMARY KEY REFERENCES public.hospitals(id) ON DELETE CASCADE,
  regras jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_alertas_config_updated_by ON public.alertas_config (updated_by);

ALTER TABLE public.alertas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros leem as regras dos alertas" ON public.alertas_config
  FOR SELECT TO authenticated
  USING (
    (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
    OR hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
  );

CREATE POLICY "Administradores criam as regras dos alertas" ON public.alertas_config
  FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
    OR public.is_hospital_admin(hospital_id)
    OR (hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
        AND (SELECT public.has_role((SELECT auth.uid()), 'hospital_admin'::public.app_role)))
  );

CREATE POLICY "Administradores ajustam as regras dos alertas" ON public.alertas_config
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

GRANT SELECT, INSERT, UPDATE ON public.alertas_config TO authenticated;
