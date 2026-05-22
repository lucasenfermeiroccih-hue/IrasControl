
-- =====================================================================
-- Security hardening: remove broad anon/public/authenticated policies,
-- add hospital-scoped policies where coverage is missing, and pin
-- search_path on remaining mutable functions.
-- =====================================================================

-- ---------- Drop anon SELECT policies on sensitive tables ----------
DROP POLICY IF EXISTS agents_select_alerts ON public.alerts;
DROP POLICY IF EXISTS agents_select_antibiogram_results ON public.antibiogram_results;
DROP POLICY IF EXISTS agents_select_antimicrobial ON public.antimicrobial_prescriptions;
DROP POLICY IF EXISTS agents_select_audit_items ON public.audit_items;
DROP POLICY IF EXISTS agents_select_audits ON public.audits;
DROP POLICY IF EXISTS agents_select_case_notes ON public.case_notes;
DROP POLICY IF EXISTS agents_select_ddd_records ON public.ddd_records;
DROP POLICY IF EXISTS agents_select_ddd_record_lines ON public.ddd_record_lines;
DROP POLICY IF EXISTS agents_select_hospitals ON public.hospitals;
DROP POLICY IF EXISTS agents_select_indicadores ON public.indicadores_records;
DROP POLICY IF EXISTS agents_select_infection_cases ON public.infection_cases;
DROP POLICY IF EXISTS agents_select_isc_records ON public.isc_records;
DROP POLICY IF EXISTS agents_select_isc_record_indicators ON public.isc_record_indicators;
DROP POLICY IF EXISTS agents_select_lab_results ON public.lab_results;
DROP POLICY IF EXISTS agents_select_patient_devices ON public.patient_devices;
DROP POLICY IF EXISTS agents_select_patients ON public.patients;
DROP POLICY IF EXISTS agents_select_precautions ON public.precautions;

-- ---------- Drop anon chat session/message policies ----------
DROP POLICY IF EXISTS agents_insert_chat_messages ON public.agent_chat_messages;
DROP POLICY IF EXISTS agents_select_chat_messages ON public.agent_chat_messages;
DROP POLICY IF EXISTS agents_insert_chat_sessions ON public.agent_chat_sessions;
DROP POLICY IF EXISTS agents_select_chat_sessions ON public.agent_chat_sessions;

-- ---------- Drop overly permissive ALL policies ----------
DROP POLICY IF EXISTS auth_kanban_boards ON public.kanban_boards;
DROP POLICY IF EXISTS auth_kanban_cards ON public.kanban_cards;
DROP POLICY IF EXISTS scih_data_all ON public.scih_module_data;
DROP POLICY IF EXISTS installations_all ON public.hospital_tool_installations;
DROP POLICY IF EXISTS auth_5w2h_plans ON public.action_plans_5w2h;
DROP POLICY IF EXISTS auth_action_tasks ON public.action_plan_tasks;

-- ---------- Hospital-scoped policies for 5W2H action plans ----------
CREATE POLICY "5w2h_select_by_hospital"
  ON public.action_plans_5w2h FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "5w2h_insert_by_hospital"
  ON public.action_plans_5w2h FOR INSERT TO authenticated
  WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "5w2h_update_by_hospital"
  ON public.action_plans_5w2h FOR UPDATE TO authenticated
  USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())))
  WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "5w2h_delete_by_hospital"
  ON public.action_plans_5w2h FOR DELETE TO authenticated
  USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

-- ---------- Hospital-scoped policies for action_plan_tasks via plan_id ----------
CREATE POLICY "tasks_select_by_hospital"
  ON public.action_plan_tasks FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.action_plans_5w2h p
      WHERE p.id = action_plan_tasks.plan_id
        AND p.hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
    )
  );

CREATE POLICY "tasks_insert_by_hospital"
  ON public.action_plan_tasks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.action_plans_5w2h p
      WHERE p.id = action_plan_tasks.plan_id
        AND p.hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
    )
  );

CREATE POLICY "tasks_update_by_hospital"
  ON public.action_plan_tasks FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.action_plans_5w2h p
      WHERE p.id = action_plan_tasks.plan_id
        AND p.hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.action_plans_5w2h p
      WHERE p.id = action_plan_tasks.plan_id
        AND p.hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
    )
  );

CREATE POLICY "tasks_delete_by_hospital"
  ON public.action_plan_tasks FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.action_plans_5w2h p
      WHERE p.id = action_plan_tasks.plan_id
        AND p.hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
    )
  );

-- ---------- Pin search_path on remaining mutable functions ----------
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_kanban_tarefa_updated_at() SET search_path = public;
