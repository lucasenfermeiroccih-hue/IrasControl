-- =====================================================================
-- Consolidação das políticas de acesso (RLS) — 29/10/2026.
--
-- 63 tabelas tinham várias políticas PERMISSIVE para a mesma ação e papel
-- (advisor "multiple_permissive_policies", 245 avisos): o Postgres avalia
-- cada uma por linha. Aqui cada tabela passa a ter UMA política por ação
-- (ler, inserir, atualizar, excluir) com a combinação "OU" das anteriores,
-- logicamente equivalente:
--  - USING = OU dos USING que valiam para a ação (políticas FOR ALL incluídas);
--  - WITH CHECK = OU de (WITH CHECK, ou USING quando não havia WITH CHECK);
--  - política que valia só para um papel (ex.: authenticated) entra com a
--    trava pg_has_role(CURRENT_USER, papel, 'USAGE'), a mesma regra que o
--    Postgres usa para decidir se uma política se aplica ao usuário.
-- Gerado a partir de pg_policy com search_path vazio (nomes qualificados).
-- Verificado: as linhas visíveis por usuários de cada perfil e por anon são
-- idênticas antes e depois.
-- =====================================================================

-- agent_chat_messages
DROP POLICY IF EXISTS "Super admins full access on agent_chat_messages" ON public.agent_chat_messages;
DROP POLICY IF EXISTS "Users can delete own chat messages" ON public.agent_chat_messages;
DROP POLICY IF EXISTS "Users can insert own chat messages" ON public.agent_chat_messages;
DROP POLICY IF EXISTS "Users can view own chat messages" ON public.agent_chat_messages;
CREATE POLICY "ler (consolidada)" ON public.agent_chat_messages AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((session_id IN ( SELECT agent_chat_sessions.id
   FROM public.agent_chat_sessions
  WHERE (agent_chat_sessions.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "inserir (consolidada)" ON public.agent_chat_messages AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((session_id IN ( SELECT agent_chat_sessions.id
   FROM public.agent_chat_sessions
  WHERE (agent_chat_sessions.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "atualizar (consolidada)" ON public.agent_chat_messages AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "excluir (consolidada)" ON public.agent_chat_messages AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((session_id IN ( SELECT agent_chat_sessions.id
   FROM public.agent_chat_sessions
  WHERE (agent_chat_sessions.user_id = ( SELECT auth.uid() AS uid))))));

-- agent_chat_sessions
DROP POLICY IF EXISTS "Super admins full access on agent_chat_sessions" ON public.agent_chat_sessions;
DROP POLICY IF EXISTS "Users can delete own chat sessions" ON public.agent_chat_sessions;
DROP POLICY IF EXISTS "Users can insert own chat sessions" ON public.agent_chat_sessions;
DROP POLICY IF EXISTS "Users can update own chat sessions" ON public.agent_chat_sessions;
DROP POLICY IF EXISTS "Users can view own chat sessions" ON public.agent_chat_sessions;
CREATE POLICY "ler (consolidada)" ON public.agent_chat_sessions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "inserir (consolidada)" ON public.agent_chat_sessions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "atualizar (consolidada)" ON public.agent_chat_sessions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))));
CREATE POLICY "excluir (consolidada)" ON public.agent_chat_sessions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))));

-- alerts
DROP POLICY IF EXISTS "Hospital members can insert alerts" ON public.alerts;
DROP POLICY IF EXISTS "Hospital members can update alerts" ON public.alerts;
DROP POLICY IF EXISTS "Hospital members can view alerts" ON public.alerts;
DROP POLICY IF EXISTS "Super admins full access on alerts" ON public.alerts;
CREATE POLICY "ler (consolidada)" ON public.alerts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.alerts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.alerts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "excluir (consolidada)" ON public.alerts AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));

-- antibiogram_reports
DROP POLICY IF EXISTS "Hospital members can delete antibiogram reports" ON public.antibiogram_reports;
DROP POLICY IF EXISTS "Hospital members can insert antibiogram reports" ON public.antibiogram_reports;
DROP POLICY IF EXISTS "Hospital members can view antibiogram reports" ON public.antibiogram_reports;
DROP POLICY IF EXISTS "Super admins full access on antibiogram_reports" ON public.antibiogram_reports;
CREATE POLICY "ler (consolidada)" ON public.antibiogram_reports AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.antibiogram_reports AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.antibiogram_reports AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "excluir (consolidada)" ON public.antibiogram_reports AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- antibiogram_results
DROP POLICY IF EXISTS "Hospital members can insert antibiogram results" ON public.antibiogram_results;
DROP POLICY IF EXISTS "Hospital members can view antibiogram results" ON public.antibiogram_results;
DROP POLICY IF EXISTS "Super admins full access on antibiogram_results" ON public.antibiogram_results;
CREATE POLICY "ler (consolidada)" ON public.antibiogram_results AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((lab_result_id IN ( SELECT lab_results.id
   FROM public.lab_results
  WHERE (lab_results.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "inserir (consolidada)" ON public.antibiogram_results AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((lab_result_id IN ( SELECT lab_results.id
   FROM public.lab_results
  WHERE (lab_results.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "atualizar (consolidada)" ON public.antibiogram_results AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "excluir (consolidada)" ON public.antibiogram_results AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));

-- antimicrobial_prescriptions
DROP POLICY IF EXISTS "Hospital members can delete antimicrobial prescriptions" ON public.antimicrobial_prescriptions;
DROP POLICY IF EXISTS "Hospital members can insert prescriptions" ON public.antimicrobial_prescriptions;
DROP POLICY IF EXISTS "Hospital members can update prescriptions" ON public.antimicrobial_prescriptions;
DROP POLICY IF EXISTS "Hospital members can view prescriptions" ON public.antimicrobial_prescriptions;
DROP POLICY IF EXISTS "Super admins full access on antimicrobial_prescriptions" ON public.antimicrobial_prescriptions;
CREATE POLICY "ler (consolidada)" ON public.antimicrobial_prescriptions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.antimicrobial_prescriptions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.antimicrobial_prescriptions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "excluir (consolidada)" ON public.antimicrobial_prescriptions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- audit_items
DROP POLICY IF EXISTS "Hospital members can delete audit items" ON public.audit_items;
DROP POLICY IF EXISTS "Hospital members can insert audit items" ON public.audit_items;
DROP POLICY IF EXISTS "Hospital members can update audit items" ON public.audit_items;
DROP POLICY IF EXISTS "Hospital members can view audit items" ON public.audit_items;
DROP POLICY IF EXISTS "Super admins full access on audit_items" ON public.audit_items;
CREATE POLICY "ler (consolidada)" ON public.audit_items AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((audit_id IN ( SELECT audits.id
   FROM public.audits
  WHERE (audits.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "inserir (consolidada)" ON public.audit_items AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((audit_id IN ( SELECT audits.id
   FROM public.audits
  WHERE (audits.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "atualizar (consolidada)" ON public.audit_items AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((audit_id IN ( SELECT audits.id
   FROM public.audits
  WHERE (audits.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((audit_id IN ( SELECT audits.id
   FROM public.audits
  WHERE (audits.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "excluir (consolidada)" ON public.audit_items AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((audit_id IN ( SELECT audits.id
   FROM public.audits
  WHERE (audits.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));

-- audits
DROP POLICY IF EXISTS "Hospital members can delete audits" ON public.audits;
DROP POLICY IF EXISTS "Hospital members can insert audits" ON public.audits;
DROP POLICY IF EXISTS "Hospital members can update audits" ON public.audits;
DROP POLICY IF EXISTS "Hospital members can view audits" ON public.audits;
DROP POLICY IF EXISTS "Super admins full access on audits" ON public.audits;
CREATE POLICY "ler (consolidada)" ON public.audits AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.audits AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.audits AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "excluir (consolidada)" ON public.audits AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- case_notes
DROP POLICY IF EXISTS "Hospital members can delete case notes" ON public.case_notes;
DROP POLICY IF EXISTS "Hospital members can insert case notes" ON public.case_notes;
DROP POLICY IF EXISTS "Hospital members can view case notes" ON public.case_notes;
DROP POLICY IF EXISTS "Super admins full access on case_notes" ON public.case_notes;
CREATE POLICY "ler (consolidada)" ON public.case_notes AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((case_id IN ( SELECT infection_cases.id
   FROM public.infection_cases
  WHERE (infection_cases.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "inserir (consolidada)" ON public.case_notes AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((case_id IN ( SELECT infection_cases.id
   FROM public.infection_cases
  WHERE (infection_cases.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "atualizar (consolidada)" ON public.case_notes AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "excluir (consolidada)" ON public.case_notes AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((case_id IN ( SELECT infection_cases.id
   FROM public.infection_cases
  WHERE (infection_cases.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));

-- crm_contacts
DROP POLICY IF EXISTS "Hospital members can delete crm contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Hospital members can insert crm contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Hospital members can update crm contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Hospital members can view crm contacts" ON public.crm_contacts;
DROP POLICY IF EXISTS "Super admins full access on crm_contacts" ON public.crm_contacts;
CREATE POLICY "ler (consolidada)" ON public.crm_contacts AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.crm_contacts AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.crm_contacts AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "excluir (consolidada)" ON public.crm_contacts AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- ddd_record_lines
DROP POLICY IF EXISTS "Super admins full access on ddd_record_lines" ON public.ddd_record_lines;
DROP POLICY IF EXISTS "Users can delete ddd_record_lines" ON public.ddd_record_lines;
DROP POLICY IF EXISTS "Users can insert ddd_record_lines" ON public.ddd_record_lines;
DROP POLICY IF EXISTS "Users can view ddd_record_lines via record" ON public.ddd_record_lines;
CREATE POLICY "ler (consolidada)" ON public.ddd_record_lines AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((ddd_record_id IN ( SELECT ddd_records.id
   FROM public.ddd_records
  WHERE (ddd_records.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "inserir (consolidada)" ON public.ddd_record_lines AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((ddd_record_id IN ( SELECT ddd_records.id
   FROM public.ddd_records
  WHERE (ddd_records.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "atualizar (consolidada)" ON public.ddd_record_lines AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "excluir (consolidada)" ON public.ddd_record_lines AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((ddd_record_id IN ( SELECT ddd_records.id
   FROM public.ddd_records
  WHERE (ddd_records.user_id = ( SELECT auth.uid() AS uid))))));

-- ddd_records
DROP POLICY IF EXISTS "Super admins full access on ddd_records" ON public.ddd_records;
DROP POLICY IF EXISTS "Users can delete own ddd_records" ON public.ddd_records;
DROP POLICY IF EXISTS "Users can insert ddd_records" ON public.ddd_records;
DROP POLICY IF EXISTS "Users can update own ddd_records" ON public.ddd_records;
DROP POLICY IF EXISTS "Users can view own hospital ddd_records" ON public.ddd_records;
CREATE POLICY "ler (consolidada)" ON public.ddd_records AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.ddd_records AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.ddd_records AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((user_id = ( SELECT auth.uid() AS uid)) AND (hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))));
CREATE POLICY "excluir (consolidada)" ON public.ddd_records AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))));

-- form_templates
DROP POLICY IF EXISTS "Hospital members can delete form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Hospital members can insert form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Hospital members can update form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Hospital members can view form templates" ON public.form_templates;
DROP POLICY IF EXISTS "Super admins full access on form_templates" ON public.form_templates;
CREATE POLICY "ler (consolidada)" ON public.form_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.form_templates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.form_templates AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "excluir (consolidada)" ON public.form_templates AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hospital_users
DROP POLICY IF EXISTS "Hospital admins can view hospital members" ON public.hospital_users;
DROP POLICY IF EXISTS "Members can view own hospital membership" ON public.hospital_users;
DROP POLICY IF EXISTS "Primary admins view hospital members" ON public.hospital_users;
DROP POLICY IF EXISTS "Super admins manage hospital_users" ON public.hospital_users;
CREATE POLICY "ler (consolidada)" ON public.hospital_users AS PERMISSIVE FOR SELECT TO public
  USING (((( SELECT auth.uid() AS uid) = user_id)) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND (( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role))) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND (((( SELECT auth.uid() AS uid) = user_id) OR (hospital_id IN ( SELECT public.get_primary_admin_hospital_ids() AS get_primary_admin_hospital_ids))))) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND ( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role)))));
CREATE POLICY "inserir (consolidada)" ON public.hospital_users AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "atualizar (consolidada)" ON public.hospital_users AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "excluir (consolidada)" ON public.hospital_users AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));

-- hospitals
DROP POLICY IF EXISTS "Hospital admins can insert hospitals" ON public.hospitals;
DROP POLICY IF EXISTS "Hospital members can view own hospital basic info" ON public.hospitals;
DROP POLICY IF EXISTS "Primary admins can view full hospital info" ON public.hospitals;
DROP POLICY IF EXISTS "Super admins can do everything on hospitals" ON public.hospitals;
CREATE POLICY "ler (consolidada)" ON public.hospitals AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((EXISTS ( SELECT 1
   FROM public.hospital_users hu
  WHERE ((hu.hospital_id = hospitals.id) AND (hu.user_id = ( SELECT auth.uid() AS uid)) AND (hu.is_primary_admin = true)))) OR (( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) AND (id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))) OR ((id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hospitals AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role)) OR (( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "atualizar (consolidada)" ON public.hospitals AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "excluir (consolidada)" ON public.hospitals AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));

-- hygiene_audit_event_items
DROP POLICY IF EXISTS haei_ins ON public.hygiene_audit_event_items;
DROP POLICY IF EXISTS haei_sel ON public.hygiene_audit_event_items;
DROP POLICY IF EXISTS haei_upd ON public.hygiene_audit_event_items;
DROP POLICY IF EXISTS hyg_aei_ins ON public.hygiene_audit_event_items;
DROP POLICY IF EXISTS hyg_aei_sel ON public.hygiene_audit_event_items;
CREATE POLICY "ler (consolidada)" ON public.hygiene_audit_event_items AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hygiene_audit_events e
  WHERE ((e.id = hygiene_audit_event_items.event_id) AND (e.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_audit_event_items AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hygiene_audit_events e
  WHERE ((e.id = hygiene_audit_event_items.event_id) AND (e.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_audit_event_items AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hygiene_audit_events e
  WHERE ((e.id = hygiene_audit_event_items.event_id) AND (e.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hygiene_audit_events e
  WHERE ((e.id = hygiene_audit_event_items.event_id) AND (e.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));

-- hygiene_audit_events
DROP POLICY IF EXISTS hae_ins ON public.hygiene_audit_events;
DROP POLICY IF EXISTS hae_sel ON public.hygiene_audit_events;
DROP POLICY IF EXISTS hae_upd ON public.hygiene_audit_events;
DROP POLICY IF EXISTS hyg_ae_ins ON public.hygiene_audit_events;
DROP POLICY IF EXISTS hyg_ae_sel ON public.hygiene_audit_events;
DROP POLICY IF EXISTS hyg_ae_upd ON public.hygiene_audit_events;
CREATE POLICY "ler (consolidada)" ON public.hygiene_audit_events AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_audit_events AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_audit_events AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_audit_template_items
DROP POLICY IF EXISTS hati_ins ON public.hygiene_audit_template_items;
DROP POLICY IF EXISTS hati_sel ON public.hygiene_audit_template_items;
DROP POLICY IF EXISTS hati_upd ON public.hygiene_audit_template_items;
DROP POLICY IF EXISTS hyg_ati_ins ON public.hygiene_audit_template_items;
DROP POLICY IF EXISTS hyg_ati_sel ON public.hygiene_audit_template_items;
CREATE POLICY "ler (consolidada)" ON public.hygiene_audit_template_items AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hygiene_audit_templates t
  WHERE ((t.id = hygiene_audit_template_items.template_id) AND (t.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_audit_template_items AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hygiene_audit_templates t
  WHERE ((t.id = hygiene_audit_template_items.template_id) AND (t.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_audit_template_items AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hygiene_audit_templates t
  WHERE ((t.id = hygiene_audit_template_items.template_id) AND (t.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hygiene_audit_templates t
  WHERE ((t.id = hygiene_audit_template_items.template_id) AND (t.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));

-- hygiene_audit_templates
DROP POLICY IF EXISTS hat_ins ON public.hygiene_audit_templates;
DROP POLICY IF EXISTS hat_sel ON public.hygiene_audit_templates;
DROP POLICY IF EXISTS hat_upd ON public.hygiene_audit_templates;
DROP POLICY IF EXISTS hyg_at_ins ON public.hygiene_audit_templates;
DROP POLICY IF EXISTS hyg_at_sel ON public.hygiene_audit_templates;
DROP POLICY IF EXISTS hyg_at_upd ON public.hygiene_audit_templates;
CREATE POLICY "ler (consolidada)" ON public.hygiene_audit_templates AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_audit_templates AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_audit_templates AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_cleaning_executions
DROP POLICY IF EXISTS hce_ins ON public.hygiene_cleaning_executions;
DROP POLICY IF EXISTS hce_sel ON public.hygiene_cleaning_executions;
DROP POLICY IF EXISTS hce_upd ON public.hygiene_cleaning_executions;
DROP POLICY IF EXISTS hyg_ce_ins ON public.hygiene_cleaning_executions;
DROP POLICY IF EXISTS hyg_ce_sel ON public.hygiene_cleaning_executions;
DROP POLICY IF EXISTS hyg_ce_upd ON public.hygiene_cleaning_executions;
CREATE POLICY "ler (consolidada)" ON public.hygiene_cleaning_executions AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_cleaning_executions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_cleaning_executions AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_cleaning_schedules
DROP POLICY IF EXISTS hcs_ins ON public.hygiene_cleaning_schedules;
DROP POLICY IF EXISTS hcs_sel ON public.hygiene_cleaning_schedules;
DROP POLICY IF EXISTS hcs_upd ON public.hygiene_cleaning_schedules;
DROP POLICY IF EXISTS hyg_cs_ins ON public.hygiene_cleaning_schedules;
DROP POLICY IF EXISTS hyg_cs_sel ON public.hygiene_cleaning_schedules;
DROP POLICY IF EXISTS hyg_cs_upd ON public.hygiene_cleaning_schedules;
CREATE POLICY "ler (consolidada)" ON public.hygiene_cleaning_schedules AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_cleaning_schedules AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_cleaning_schedules AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_consumption_records
DROP POLICY IF EXISTS "Hospital members can insert hygiene consumption" ON public.hygiene_consumption_records;
DROP POLICY IF EXISTS "Hospital members can view hygiene consumption" ON public.hygiene_consumption_records;
DROP POLICY IF EXISTS "Super admins full access on hygiene_consumption_records" ON public.hygiene_consumption_records;
DROP POLICY IF EXISTS "Users can delete own hygiene consumption" ON public.hygiene_consumption_records;
DROP POLICY IF EXISTS "Users can update own hygiene consumption" ON public.hygiene_consumption_records;
CREATE POLICY "ler (consolidada)" ON public.hygiene_consumption_records AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_consumption_records AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_consumption_records AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((user_id = ( SELECT auth.uid() AS uid)) AND (hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))));
CREATE POLICY "excluir (consolidada)" ON public.hygiene_consumption_records AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))));

-- hygiene_environmental_equipment
DROP POLICY IF EXISTS hee_ins ON public.hygiene_environmental_equipment;
DROP POLICY IF EXISTS hee_sel ON public.hygiene_environmental_equipment;
DROP POLICY IF EXISTS hee_upd ON public.hygiene_environmental_equipment;
DROP POLICY IF EXISTS hyg_ee_ins ON public.hygiene_environmental_equipment;
DROP POLICY IF EXISTS hyg_ee_sel ON public.hygiene_environmental_equipment;
DROP POLICY IF EXISTS hyg_ee_upd ON public.hygiene_environmental_equipment;
CREATE POLICY "ler (consolidada)" ON public.hygiene_environmental_equipment AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_environmental_equipment AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_environmental_equipment AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_logistic_params
DROP POLICY IF EXISTS hlp_ins ON public.hygiene_logistic_params;
DROP POLICY IF EXISTS hlp_sel ON public.hygiene_logistic_params;
DROP POLICY IF EXISTS hlp_upd ON public.hygiene_logistic_params;
DROP POLICY IF EXISTS hyg_lp_ins ON public.hygiene_logistic_params;
DROP POLICY IF EXISTS hyg_lp_sel ON public.hygiene_logistic_params;
DROP POLICY IF EXISTS hyg_lp_upd ON public.hygiene_logistic_params;
CREATE POLICY "ler (consolidada)" ON public.hygiene_logistic_params AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_logistic_params AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_logistic_params AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_monthly_consumption
DROP POLICY IF EXISTS hmc_ins ON public.hygiene_monthly_consumption;
DROP POLICY IF EXISTS hmc_sel ON public.hygiene_monthly_consumption;
DROP POLICY IF EXISTS hmc_upd ON public.hygiene_monthly_consumption;
DROP POLICY IF EXISTS hyg_mc_ins ON public.hygiene_monthly_consumption;
DROP POLICY IF EXISTS hyg_mc_sel ON public.hygiene_monthly_consumption;
DROP POLICY IF EXISTS hyg_mc_upd ON public.hygiene_monthly_consumption;
CREATE POLICY "ler (consolidada)" ON public.hygiene_monthly_consumption AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_monthly_consumption AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_monthly_consumption AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_monthly_order_items
DROP POLICY IF EXISTS hmoi_ins ON public.hygiene_monthly_order_items;
DROP POLICY IF EXISTS hmoi_sel ON public.hygiene_monthly_order_items;
DROP POLICY IF EXISTS hmoi_upd ON public.hygiene_monthly_order_items;
DROP POLICY IF EXISTS hyg_moi_ins ON public.hygiene_monthly_order_items;
DROP POLICY IF EXISTS hyg_moi_sel ON public.hygiene_monthly_order_items;
DROP POLICY IF EXISTS hyg_moi_upd ON public.hygiene_monthly_order_items;
CREATE POLICY "ler (consolidada)" ON public.hygiene_monthly_order_items AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hygiene_monthly_orders o
  WHERE ((o.id = hygiene_monthly_order_items.order_id) AND (o.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_monthly_order_items AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hygiene_monthly_orders o
  WHERE ((o.id = hygiene_monthly_order_items.order_id) AND (o.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_monthly_order_items AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hygiene_monthly_orders o
  WHERE ((o.id = hygiene_monthly_order_items.order_id) AND (o.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hygiene_monthly_orders o
  WHERE ((o.id = hygiene_monthly_order_items.order_id) AND (o.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));

-- hygiene_monthly_orders
DROP POLICY IF EXISTS hmo_ins ON public.hygiene_monthly_orders;
DROP POLICY IF EXISTS hmo_sel ON public.hygiene_monthly_orders;
DROP POLICY IF EXISTS hmo_upd ON public.hygiene_monthly_orders;
DROP POLICY IF EXISTS hyg_mo_ins ON public.hygiene_monthly_orders;
DROP POLICY IF EXISTS hyg_mo_sel ON public.hygiene_monthly_orders;
DROP POLICY IF EXISTS hyg_mo_upd ON public.hygiene_monthly_orders;
CREATE POLICY "ler (consolidada)" ON public.hygiene_monthly_orders AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_monthly_orders AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_monthly_orders AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_nonconformities
DROP POLICY IF EXISTS hnc_ins ON public.hygiene_nonconformities;
DROP POLICY IF EXISTS hnc_sel ON public.hygiene_nonconformities;
DROP POLICY IF EXISTS hnc_upd ON public.hygiene_nonconformities;
DROP POLICY IF EXISTS hyg_nc_ins ON public.hygiene_nonconformities;
DROP POLICY IF EXISTS hyg_nc_sel ON public.hygiene_nonconformities;
DROP POLICY IF EXISTS hyg_nc_upd ON public.hygiene_nonconformities;
CREATE POLICY "ler (consolidada)" ON public.hygiene_nonconformities AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_nonconformities AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_nonconformities AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_notifications
DROP POLICY IF EXISTS hn_ins ON public.hygiene_notifications;
DROP POLICY IF EXISTS hn_sel ON public.hygiene_notifications;
DROP POLICY IF EXISTS hn_upd ON public.hygiene_notifications;
DROP POLICY IF EXISTS hyg_not_ins ON public.hygiene_notifications;
DROP POLICY IF EXISTS hyg_not_sel ON public.hygiene_notifications;
DROP POLICY IF EXISTS hyg_not_upd ON public.hygiene_notifications;
CREATE POLICY "ler (consolidada)" ON public.hygiene_notifications AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_notifications AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_notifications AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_products
DROP POLICY IF EXISTS hp_ins ON public.hygiene_products;
DROP POLICY IF EXISTS hp_sel ON public.hygiene_products;
DROP POLICY IF EXISTS hp_upd ON public.hygiene_products;
DROP POLICY IF EXISTS hyg_prd_ins ON public.hygiene_products;
DROP POLICY IF EXISTS hyg_prd_sel ON public.hygiene_products;
DROP POLICY IF EXISTS hyg_prd_upd ON public.hygiene_products;
CREATE POLICY "ler (consolidada)" ON public.hygiene_products AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_products AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_products AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_sector_request_items
DROP POLICY IF EXISTS hsri_ins ON public.hygiene_sector_request_items;
DROP POLICY IF EXISTS hsri_sel ON public.hygiene_sector_request_items;
DROP POLICY IF EXISTS hsri_upd ON public.hygiene_sector_request_items;
DROP POLICY IF EXISTS hyg_sri_ins ON public.hygiene_sector_request_items;
DROP POLICY IF EXISTS hyg_sri_sel ON public.hygiene_sector_request_items;
CREATE POLICY "ler (consolidada)" ON public.hygiene_sector_request_items AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hygiene_sector_requests r
  WHERE ((r.id = hygiene_sector_request_items.request_id) AND (r.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_sector_request_items AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hygiene_sector_requests r
  WHERE ((r.id = hygiene_sector_request_items.request_id) AND (r.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_sector_request_items AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hygiene_sector_requests r
  WHERE ((r.id = hygiene_sector_request_items.request_id) AND (r.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hygiene_sector_requests r
  WHERE ((r.id = hygiene_sector_request_items.request_id) AND (r.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));

-- hygiene_sector_requests
DROP POLICY IF EXISTS hsr_ins ON public.hygiene_sector_requests;
DROP POLICY IF EXISTS hsr_sel ON public.hygiene_sector_requests;
DROP POLICY IF EXISTS hsr_upd ON public.hygiene_sector_requests;
DROP POLICY IF EXISTS hyg_sr_ins ON public.hygiene_sector_requests;
DROP POLICY IF EXISTS hyg_sr_sel ON public.hygiene_sector_requests;
DROP POLICY IF EXISTS hyg_sr_upd ON public.hygiene_sector_requests;
CREATE POLICY "ler (consolidada)" ON public.hygiene_sector_requests AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_sector_requests AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_sector_requests AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_stock_adjustments
DROP POLICY IF EXISTS hsa_ins ON public.hygiene_stock_adjustments;
DROP POLICY IF EXISTS hsa_sel ON public.hygiene_stock_adjustments;
DROP POLICY IF EXISTS hsa_upd ON public.hygiene_stock_adjustments;
DROP POLICY IF EXISTS hyg_sa_ins ON public.hygiene_stock_adjustments;
DROP POLICY IF EXISTS hyg_sa_sel ON public.hygiene_stock_adjustments;
CREATE POLICY "ler (consolidada)" ON public.hygiene_stock_adjustments AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_stock_adjustments AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_stock_adjustments AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_stock_entries
DROP POLICY IF EXISTS hse_ins ON public.hygiene_stock_entries;
DROP POLICY IF EXISTS hse_sel ON public.hygiene_stock_entries;
DROP POLICY IF EXISTS hse_upd ON public.hygiene_stock_entries;
DROP POLICY IF EXISTS hyg_se_ins ON public.hygiene_stock_entries;
DROP POLICY IF EXISTS hyg_se_sel ON public.hygiene_stock_entries;
DROP POLICY IF EXISTS hyg_se_upd ON public.hygiene_stock_entries;
CREATE POLICY "ler (consolidada)" ON public.hygiene_stock_entries AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_stock_entries AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_stock_entries AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_stock_entry_items
DROP POLICY IF EXISTS hsei_ins ON public.hygiene_stock_entry_items;
DROP POLICY IF EXISTS hsei_sel ON public.hygiene_stock_entry_items;
DROP POLICY IF EXISTS hsei_upd ON public.hygiene_stock_entry_items;
DROP POLICY IF EXISTS hyg_sei_ins ON public.hygiene_stock_entry_items;
DROP POLICY IF EXISTS hyg_sei_sel ON public.hygiene_stock_entry_items;
CREATE POLICY "ler (consolidada)" ON public.hygiene_stock_entry_items AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hygiene_stock_entries e
  WHERE ((e.id = hygiene_stock_entry_items.entry_id) AND (e.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_stock_entry_items AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hygiene_stock_entries e
  WHERE ((e.id = hygiene_stock_entry_items.entry_id) AND (e.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_stock_entry_items AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hygiene_stock_entries e
  WHERE ((e.id = hygiene_stock_entry_items.entry_id) AND (e.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hygiene_stock_entries e
  WHERE ((e.id = hygiene_stock_entry_items.entry_id) AND (e.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));

-- hygiene_stock_locations
DROP POLICY IF EXISTS hsl_ins ON public.hygiene_stock_locations;
DROP POLICY IF EXISTS hsl_sel ON public.hygiene_stock_locations;
DROP POLICY IF EXISTS hsl_upd ON public.hygiene_stock_locations;
DROP POLICY IF EXISTS hyg_sl_ins ON public.hygiene_stock_locations;
DROP POLICY IF EXISTS hyg_sl_sel ON public.hygiene_stock_locations;
DROP POLICY IF EXISTS hyg_sl_upd ON public.hygiene_stock_locations;
CREATE POLICY "ler (consolidada)" ON public.hygiene_stock_locations AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_stock_locations AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_stock_locations AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_stock_movements
DROP POLICY IF EXISTS hsm_ins ON public.hygiene_stock_movements;
DROP POLICY IF EXISTS hsm_sel ON public.hygiene_stock_movements;
DROP POLICY IF EXISTS hsm_upd ON public.hygiene_stock_movements;
DROP POLICY IF EXISTS hyg_sm_ins ON public.hygiene_stock_movements;
DROP POLICY IF EXISTS hyg_sm_sel ON public.hygiene_stock_movements;
CREATE POLICY "ler (consolidada)" ON public.hygiene_stock_movements AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_stock_movements AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_stock_movements AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- hygiene_suppliers
DROP POLICY IF EXISTS hsu_ins ON public.hygiene_suppliers;
DROP POLICY IF EXISTS hsu_sel ON public.hygiene_suppliers;
DROP POLICY IF EXISTS hsu_upd ON public.hygiene_suppliers;
DROP POLICY IF EXISTS hyg_sup_ins ON public.hygiene_suppliers;
DROP POLICY IF EXISTS hyg_sup_sel ON public.hygiene_suppliers;
DROP POLICY IF EXISTS hyg_sup_upd ON public.hygiene_suppliers;
CREATE POLICY "ler (consolidada)" ON public.hygiene_suppliers AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.hygiene_suppliers AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.hygiene_suppliers AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- indicadores_records
DROP POLICY IF EXISTS "Hospital members can insert indicadores" ON public.indicadores_records;
DROP POLICY IF EXISTS "Hospital members can view indicadores" ON public.indicadores_records;
DROP POLICY IF EXISTS "Super admins full access on indicadores_records" ON public.indicadores_records;
DROP POLICY IF EXISTS "Users can delete own indicadores" ON public.indicadores_records;
DROP POLICY IF EXISTS "Users can update own indicadores" ON public.indicadores_records;
CREATE POLICY "ler (consolidada)" ON public.indicadores_records AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.indicadores_records AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((user_id = ( SELECT auth.uid() AS uid)) AND (hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))));
CREATE POLICY "atualizar (consolidada)" ON public.indicadores_records AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((user_id = ( SELECT auth.uid() AS uid)) AND (hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))));
CREATE POLICY "excluir (consolidada)" ON public.indicadores_records AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))));

-- infection_cases
DROP POLICY IF EXISTS "Hospital members can delete infection cases" ON public.infection_cases;
DROP POLICY IF EXISTS "Hospital members can insert infection cases" ON public.infection_cases;
DROP POLICY IF EXISTS "Hospital members can update infection cases" ON public.infection_cases;
DROP POLICY IF EXISTS "Hospital members can view infection cases" ON public.infection_cases;
DROP POLICY IF EXISTS "Super admins full access on infection_cases" ON public.infection_cases;
CREATE POLICY "ler (consolidada)" ON public.infection_cases AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.infection_cases AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.infection_cases AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "excluir (consolidada)" ON public.infection_cases AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- isc_record_indicators
DROP POLICY IF EXISTS "Super admins full access on isc_record_indicators" ON public.isc_record_indicators;
DROP POLICY IF EXISTS "Users can delete isc_record_indicators" ON public.isc_record_indicators;
DROP POLICY IF EXISTS "Users can insert isc_record_indicators" ON public.isc_record_indicators;
DROP POLICY IF EXISTS "Users can view isc_record_indicators via record" ON public.isc_record_indicators;
CREATE POLICY "ler (consolidada)" ON public.isc_record_indicators AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((isc_record_id IN ( SELECT isc_records.id
   FROM public.isc_records
  WHERE (isc_records.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "inserir (consolidada)" ON public.isc_record_indicators AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((isc_record_id IN ( SELECT isc_records.id
   FROM public.isc_records
  WHERE (isc_records.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "atualizar (consolidada)" ON public.isc_record_indicators AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "excluir (consolidada)" ON public.isc_record_indicators AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((isc_record_id IN ( SELECT isc_records.id
   FROM public.isc_records
  WHERE (isc_records.user_id = ( SELECT auth.uid() AS uid))))));

-- isc_records
DROP POLICY IF EXISTS "Super admins full access on isc_records" ON public.isc_records;
DROP POLICY IF EXISTS "Users can delete own isc_records" ON public.isc_records;
DROP POLICY IF EXISTS "Users can insert isc_records" ON public.isc_records;
DROP POLICY IF EXISTS "Users can update own isc_records" ON public.isc_records;
DROP POLICY IF EXISTS "Users can view own hospital isc_records" ON public.isc_records;
CREATE POLICY "ler (consolidada)" ON public.isc_records AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.isc_records AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.isc_records AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((user_id = ( SELECT auth.uid() AS uid)) AND (hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))));
CREATE POLICY "excluir (consolidada)" ON public.isc_records AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((user_id = ( SELECT auth.uid() AS uid))));

-- kanban_ccih_escala
DROP POLICY IF EXISTS "Admins gerenciam a escala do hospital" ON public.kanban_ccih_escala;
DROP POLICY IF EXISTS "Membros veem a escala do hospital" ON public.kanban_ccih_escala;
CREATE POLICY "ler (consolidada)" ON public.kanban_ccih_escala AS PERMISSIVE FOR SELECT TO authenticated
  USING (((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND (( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) OR (hospital_id IN ( SELECT public.get_primary_admin_hospital_ids() AS get_primary_admin_hospital_ids)))))) OR (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) OR ( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role))));
CREATE POLICY "inserir (consolidada)" ON public.kanban_ccih_escala AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND (( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) OR (hospital_id IN ( SELECT public.get_primary_admin_hospital_ids() AS get_primary_admin_hospital_ids)))))));
CREATE POLICY "atualizar (consolidada)" ON public.kanban_ccih_escala AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND (( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) OR (hospital_id IN ( SELECT public.get_primary_admin_hospital_ids() AS get_primary_admin_hospital_ids)))))))
  WITH CHECK (((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND (( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) OR (hospital_id IN ( SELECT public.get_primary_admin_hospital_ids() AS get_primary_admin_hospital_ids)))))));
CREATE POLICY "excluir (consolidada)" ON public.kanban_ccih_escala AS PERMISSIVE FOR DELETE TO authenticated
  USING (((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND (( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) OR (hospital_id IN ( SELECT public.get_primary_admin_hospital_ids() AS get_primary_admin_hospital_ids)))))));

-- kanban_ccih_tarefas
DROP POLICY IF EXISTS "hospital members can delete tasks" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "hospital members can insert tasks" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "hospital members can update tasks" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "hospital members can view tasks" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "hospital members delete ccih tarefas" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "hospital members insert ccih tarefas" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "hospital members update ccih tarefas" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "hospital members view ccih tarefas" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS admins_gerenciam_tarefas ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS admins_veem_tarefas_hospital ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS usuarios_atualizam_status ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS usuarios_veem_suas_tarefas ON public.kanban_ccih_tarefas;
CREATE POLICY "ler (consolidada)" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid)))))) OR ((assigned_to = ( SELECT auth.uid() AS uid))) OR ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "inserir (consolidada)" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid)))))) OR ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "atualizar (consolidada)" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR UPDATE TO public
  USING (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid)))))) OR ((assigned_to = ( SELECT auth.uid() AS uid))) OR ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid)))))) OR ((assigned_to = ( SELECT auth.uid() AS uid))) OR ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "excluir (consolidada)" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR DELETE TO public
  USING (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid)))))) OR ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));

-- lab_results
DROP POLICY IF EXISTS "Hospital members can delete lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Hospital members can insert lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Hospital members can update lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Hospital members can view lab results" ON public.lab_results;
DROP POLICY IF EXISTS "Super admins full access on lab_results" ON public.lab_results;
CREATE POLICY "ler (consolidada)" ON public.lab_results AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.lab_results AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.lab_results AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "excluir (consolidada)" ON public.lab_results AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- meeting_action_items
DROP POLICY IF EXISTS meeting_action_items_access ON public.meeting_action_items;
DROP POLICY IF EXISTS meeting_action_items_delete ON public.meeting_action_items;
DROP POLICY IF EXISTS meeting_action_items_insert ON public.meeting_action_items;
DROP POLICY IF EXISTS meeting_action_items_update ON public.meeting_action_items;
CREATE POLICY "ler (consolidada)" ON public.meeting_action_items AS PERMISSIVE FOR SELECT TO public
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "inserir (consolidada)" ON public.meeting_action_items AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "atualizar (consolidada)" ON public.meeting_action_items AS PERMISSIVE FOR UPDATE TO public
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "excluir (consolidada)" ON public.meeting_action_items AS PERMISSIVE FOR DELETE TO public
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));

-- meeting_decisions
DROP POLICY IF EXISTS meeting_decisions_access ON public.meeting_decisions;
DROP POLICY IF EXISTS meeting_decisions_insert ON public.meeting_decisions;
CREATE POLICY "ler (consolidada)" ON public.meeting_decisions AS PERMISSIVE FOR SELECT TO public
  USING (((meeting_id IN ( SELECT meetings.id
   FROM public.meetings
  WHERE (meetings.hospital_id IN ( SELECT hospital_users.hospital_id
           FROM public.hospital_users
          WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "inserir (consolidada)" ON public.meeting_decisions AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((meeting_id IN ( SELECT meetings.id
   FROM public.meetings
  WHERE (meetings.hospital_id IN ( SELECT hospital_users.hospital_id
           FROM public.hospital_users
          WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "atualizar (consolidada)" ON public.meeting_decisions AS PERMISSIVE FOR UPDATE TO public
  USING (((meeting_id IN ( SELECT meetings.id
   FROM public.meetings
  WHERE (meetings.hospital_id IN ( SELECT hospital_users.hospital_id
           FROM public.hospital_users
          WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))))
  WITH CHECK (((meeting_id IN ( SELECT meetings.id
   FROM public.meetings
  WHERE (meetings.hospital_id IN ( SELECT hospital_users.hospital_id
           FROM public.hospital_users
          WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "excluir (consolidada)" ON public.meeting_decisions AS PERMISSIVE FOR DELETE TO public
  USING (((meeting_id IN ( SELECT meetings.id
   FROM public.meetings
  WHERE (meetings.hospital_id IN ( SELECT hospital_users.hospital_id
           FROM public.hospital_users
          WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))));

-- meeting_participants
DROP POLICY IF EXISTS meeting_participants_access ON public.meeting_participants;
DROP POLICY IF EXISTS meeting_participants_delete ON public.meeting_participants;
DROP POLICY IF EXISTS meeting_participants_insert ON public.meeting_participants;
DROP POLICY IF EXISTS meeting_participants_update ON public.meeting_participants;
CREATE POLICY "ler (consolidada)" ON public.meeting_participants AS PERMISSIVE FOR SELECT TO public
  USING (((meeting_id IN ( SELECT meetings.id
   FROM public.meetings
  WHERE (meetings.hospital_id IN ( SELECT hospital_users.hospital_id
           FROM public.hospital_users
          WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "inserir (consolidada)" ON public.meeting_participants AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((meeting_id IN ( SELECT meetings.id
   FROM public.meetings
  WHERE (meetings.hospital_id IN ( SELECT hospital_users.hospital_id
           FROM public.hospital_users
          WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "atualizar (consolidada)" ON public.meeting_participants AS PERMISSIVE FOR UPDATE TO public
  USING (((meeting_id IN ( SELECT meetings.id
   FROM public.meetings
  WHERE (meetings.hospital_id IN ( SELECT hospital_users.hospital_id
           FROM public.hospital_users
          WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))))
  WITH CHECK (((meeting_id IN ( SELECT meetings.id
   FROM public.meetings
  WHERE (meetings.hospital_id IN ( SELECT hospital_users.hospital_id
           FROM public.hospital_users
          WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))));
CREATE POLICY "excluir (consolidada)" ON public.meeting_participants AS PERMISSIVE FOR DELETE TO public
  USING (((meeting_id IN ( SELECT meetings.id
   FROM public.meetings
  WHERE (meetings.hospital_id IN ( SELECT hospital_users.hospital_id
           FROM public.hospital_users
          WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))));

-- meetings
DROP POLICY IF EXISTS meetings_hospital_access ON public.meetings;
DROP POLICY IF EXISTS meetings_hospital_delete ON public.meetings;
DROP POLICY IF EXISTS meetings_hospital_insert ON public.meetings;
DROP POLICY IF EXISTS meetings_hospital_update ON public.meetings;
CREATE POLICY "ler (consolidada)" ON public.meetings AS PERMISSIVE FOR SELECT TO public
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "inserir (consolidada)" ON public.meetings AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "atualizar (consolidada)" ON public.meetings AS PERMISSIVE FOR UPDATE TO public
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "excluir (consolidada)" ON public.meetings AS PERMISSIVE FOR DELETE TO public
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));

-- microorganisms
DROP POLICY IF EXISTS "Authenticated users can view microorganisms" ON public.microorganisms;
DROP POLICY IF EXISTS "Super admins can manage microorganisms" ON public.microorganisms;
CREATE POLICY "ler (consolidada)" ON public.microorganisms AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (true));
CREATE POLICY "inserir (consolidada)" ON public.microorganisms AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "atualizar (consolidada)" ON public.microorganisms AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "excluir (consolidada)" ON public.microorganisms AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));

-- notification_types
DROP POLICY IF EXISTS notif_types_all_admin ON public.notification_types;
DROP POLICY IF EXISTS notif_types_select ON public.notification_types;
CREATE POLICY "ler (consolidada)" ON public.notification_types AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((hospital_id IS NULL) OR (hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))));
CREATE POLICY "inserir (consolidada)" ON public.notification_types AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "atualizar (consolidada)" ON public.notification_types AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "excluir (consolidada)" ON public.notification_types AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));

-- notifications
DROP POLICY IF EXISTS notifications_delete ON public.notifications;
DROP POLICY IF EXISTS notifications_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_select ON public.notifications;
DROP POLICY IF EXISTS notifications_superadmin ON public.notifications;
DROP POLICY IF EXISTS notifications_update ON public.notifications;
CREATE POLICY "ler (consolidada)" ON public.notifications AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.notifications AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.notifications AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "excluir (consolidada)" ON public.notifications AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((user_id = ( SELECT auth.uid() AS uid)) AND (status = 'rascunho'::text))));

-- patient_audit_log
DROP POLICY IF EXISTS "Membros do hospital visualizam auditoria" ON public.patient_audit_log;
DROP POLICY IF EXISTS "Super admins acesso total auditoria" ON public.patient_audit_log;
CREATE POLICY "ler (consolidada)" ON public.patient_audit_log AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.patient_audit_log AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "atualizar (consolidada)" ON public.patient_audit_log AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "excluir (consolidada)" ON public.patient_audit_log AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));

-- patient_devices
DROP POLICY IF EXISTS "Hospital members can insert patient devices" ON public.patient_devices;
DROP POLICY IF EXISTS "Hospital members can update patient devices" ON public.patient_devices;
DROP POLICY IF EXISTS "Hospital members can view patient devices" ON public.patient_devices;
DROP POLICY IF EXISTS "Super admins full access on patient_devices" ON public.patient_devices;
CREATE POLICY "ler (consolidada)" ON public.patient_devices AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "inserir (consolidada)" ON public.patient_devices AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "atualizar (consolidada)" ON public.patient_devices AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "excluir (consolidada)" ON public.patient_devices AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));

-- patients
DROP POLICY IF EXISTS "Hospital members can delete patients" ON public.patients;
DROP POLICY IF EXISTS "Hospital members can insert patients" ON public.patients;
DROP POLICY IF EXISTS "Hospital members can update patients" ON public.patients;
DROP POLICY IF EXISTS "Hospital members can view patients" ON public.patients;
DROP POLICY IF EXISTS "Super admins full access on patients" ON public.patients;
CREATE POLICY "ler (consolidada)" ON public.patients AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "inserir (consolidada)" ON public.patients AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "atualizar (consolidada)" ON public.patients AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
CREATE POLICY "excluir (consolidada)" ON public.patients AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));

-- precautions
DROP POLICY IF EXISTS "Hospital members can delete precautions" ON public.precautions;
DROP POLICY IF EXISTS "Hospital members can insert precautions" ON public.precautions;
DROP POLICY IF EXISTS "Hospital members can update precautions" ON public.precautions;
DROP POLICY IF EXISTS "Hospital members can view precautions" ON public.precautions;
DROP POLICY IF EXISTS "Super admins full access on precautions" ON public.precautions;
CREATE POLICY "ler (consolidada)" ON public.precautions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "inserir (consolidada)" ON public.precautions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "atualizar (consolidada)" ON public.precautions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));
CREATE POLICY "excluir (consolidada)" ON public.precautions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((patient_id IN ( SELECT patients.id
   FROM public.patients
  WHERE (patients.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))));

-- profiles
DROP POLICY IF EXISTS "Hospital admins can update hospital user profiles" ON public.profiles;
DROP POLICY IF EXISTS "Hospital admins can view hospital user profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "ler (consolidada)" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING (((( SELECT auth.uid() AS uid) = user_id)) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND (( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role))) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) AND (user_id IN ( SELECT hu.user_id
   FROM public.hospital_users hu
  WHERE (hu.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))))));
CREATE POLICY "inserir (consolidada)" ON public.profiles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)));
CREATE POLICY "atualizar (consolidada)" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING (((( SELECT auth.uid() AS uid) = user_id)) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) AND (user_id IN ( SELECT hu.user_id
   FROM public.hospital_users hu
  WHERE (hu.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))))))
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id)) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) AND (user_id IN ( SELECT hu.user_id
   FROM public.hospital_users hu
  WHERE (hu.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))))))));

-- role_permissions
DROP POLICY IF EXISTS role_perms_manage ON public.role_permissions;
DROP POLICY IF EXISTS role_perms_select ON public.role_permissions;
CREATE POLICY "ler (consolidada)" ON public.role_permissions AS PERMISSIVE FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM (public.hospital_roles hr
     JOIN public.user_hospital_roles uhr ON ((uhr.hospital_id = hr.hospital_id)))
  WHERE ((hr.id = role_permissions.role_id) AND (uhr.user_id = ( SELECT auth.uid() AS uid)) AND (uhr.is_active = true))))) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND ((EXISTS ( SELECT 1
   FROM public.hospital_roles hr
  WHERE ((hr.id = role_permissions.role_id) AND public.is_hospital_admin(hr.hospital_id)))))));
CREATE POLICY "inserir (consolidada)" ON public.role_permissions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hospital_roles hr
  WHERE ((hr.id = role_permissions.role_id) AND public.is_hospital_admin(hr.hospital_id))))));
CREATE POLICY "atualizar (consolidada)" ON public.role_permissions AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hospital_roles hr
  WHERE ((hr.id = role_permissions.role_id) AND public.is_hospital_admin(hr.hospital_id))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.hospital_roles hr
  WHERE ((hr.id = role_permissions.role_id) AND public.is_hospital_admin(hr.hospital_id))))));
CREATE POLICY "excluir (consolidada)" ON public.role_permissions AS PERMISSIVE FOR DELETE TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hospital_roles hr
  WHERE ((hr.id = role_permissions.role_id) AND public.is_hospital_admin(hr.hospital_id))))));

-- sector_types
DROP POLICY IF EXISTS sector_types_all_admin ON public.sector_types;
DROP POLICY IF EXISTS sector_types_select ON public.sector_types;
CREATE POLICY "ler (consolidada)" ON public.sector_types AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE ((hospital_users.user_id = ( SELECT auth.uid() AS uid)) AND (hospital_users.is_active = true) AND ((hospital_users.is_primary_admin = true) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))))))) OR ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE ((hospital_users.user_id = ( SELECT auth.uid() AS uid)) AND (hospital_users.is_active = true))))));
CREATE POLICY "inserir (consolidada)" ON public.sector_types AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE ((hospital_users.user_id = ( SELECT auth.uid() AS uid)) AND (hospital_users.is_active = true) AND ((hospital_users.is_primary_admin = true) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))))))));
CREATE POLICY "atualizar (consolidada)" ON public.sector_types AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE ((hospital_users.user_id = ( SELECT auth.uid() AS uid)) AND (hospital_users.is_active = true) AND ((hospital_users.is_primary_admin = true) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))))))))
  WITH CHECK (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE ((hospital_users.user_id = ( SELECT auth.uid() AS uid)) AND (hospital_users.is_active = true) AND ((hospital_users.is_primary_admin = true) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))))))));
CREATE POLICY "excluir (consolidada)" ON public.sector_types AS PERMISSIVE FOR DELETE TO authenticated
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE ((hospital_users.user_id = ( SELECT auth.uid() AS uid)) AND (hospital_users.is_active = true) AND ((hospital_users.is_primary_admin = true) OR (EXISTS ( SELECT 1
           FROM public.user_roles
          WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))))))));

-- sectors
DROP POLICY IF EXISTS "Hospital admins can manage sectors" ON public.sectors;
DROP POLICY IF EXISTS "Hospital members can view sectors" ON public.sectors;
DROP POLICY IF EXISTS "Super admins full access on sectors" ON public.sectors;
DROP POLICY IF EXISTS agents_select_sectors ON public.sectors;
CREATE POLICY "ler (consolidada)" ON public.sectors AS PERMISSIVE FOR SELECT TO public
  USING (((SELECT pg_has_role(CURRENT_USER, 'anon', 'USAGE')) AND (false)) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND (( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role))) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND ( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role)))) OR ((SELECT pg_has_role(CURRENT_USER, 'authenticated', 'USAGE')) AND ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))));
CREATE POLICY "inserir (consolidada)" ON public.sectors AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND ( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role))));
CREATE POLICY "atualizar (consolidada)" ON public.sectors AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND ( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role))))
  WITH CHECK ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND ( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role))));
CREATE POLICY "excluir (consolidada)" ON public.sectors AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND ( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role))));

-- user_direct_permissions
DROP POLICY IF EXISTS udp_manage ON public.user_direct_permissions;
DROP POLICY IF EXISTS udp_select ON public.user_direct_permissions;
CREATE POLICY "ler (consolidada)" ON public.user_direct_permissions AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((( SELECT auth.uid() AS uid) = user_id) OR public.is_hospital_admin(hospital_id))) OR (public.is_hospital_admin(hospital_id)));
CREATE POLICY "inserir (consolidada)" ON public.user_direct_permissions AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((public.is_hospital_admin(hospital_id)));
CREATE POLICY "atualizar (consolidada)" ON public.user_direct_permissions AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((public.is_hospital_admin(hospital_id)))
  WITH CHECK ((public.is_hospital_admin(hospital_id)));
CREATE POLICY "excluir (consolidada)" ON public.user_direct_permissions AS PERMISSIVE FOR DELETE TO authenticated
  USING ((public.is_hospital_admin(hospital_id)));

-- user_hospital_roles
DROP POLICY IF EXISTS uhr_manage ON public.user_hospital_roles;
DROP POLICY IF EXISTS uhr_select ON public.user_hospital_roles;
CREATE POLICY "ler (consolidada)" ON public.user_hospital_roles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((( SELECT auth.uid() AS uid) = user_id) OR public.is_hospital_admin(hospital_id))) OR (public.is_hospital_admin(hospital_id)));
CREATE POLICY "inserir (consolidada)" ON public.user_hospital_roles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((public.is_hospital_admin(hospital_id)));
CREATE POLICY "atualizar (consolidada)" ON public.user_hospital_roles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((public.is_hospital_admin(hospital_id)))
  WITH CHECK ((public.is_hospital_admin(hospital_id)));
CREATE POLICY "excluir (consolidada)" ON public.user_hospital_roles AS PERMISSIVE FOR DELETE TO authenticated
  USING ((public.is_hospital_admin(hospital_id)));

-- user_roles
DROP POLICY IF EXISTS "Hospital admins can view hospital user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "ler (consolidada)" ON public.user_roles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.is_super_admin(( SELECT auth.uid() AS uid)) AS is_super_admin)) OR ((( SELECT auth.uid() AS uid) = user_id)) OR ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) AND (user_id IN ( SELECT hu.user_id
   FROM public.hospital_users hu
  WHERE (hu.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "inserir (consolidada)" ON public.user_roles AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((( SELECT public.is_super_admin(( SELECT auth.uid() AS uid)) AS is_super_admin)));
CREATE POLICY "atualizar (consolidada)" ON public.user_roles AS PERMISSIVE FOR UPDATE TO authenticated
  USING ((( SELECT public.is_super_admin(( SELECT auth.uid() AS uid)) AS is_super_admin)))
  WITH CHECK ((( SELECT public.is_super_admin(( SELECT auth.uid() AS uid)) AS is_super_admin)));
CREATE POLICY "excluir (consolidada)" ON public.user_roles AS PERMISSIVE FOR DELETE TO authenticated
  USING ((( SELECT public.is_super_admin(( SELECT auth.uid() AS uid)) AS is_super_admin)));
