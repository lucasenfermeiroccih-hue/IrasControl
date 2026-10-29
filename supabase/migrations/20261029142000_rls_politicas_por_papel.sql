-- =====================================================================
-- Ajuste da consolidação de políticas (20261029141000) — 29/10/2026.
--
-- 9 políticas juntavam regras de papéis diferentes (public + authenticated)
-- numa só política TO public, com a trava pg_has_role(). O resultado lógico é
-- o mesmo, mas o Postgres exige permissão de EXECUTE nas funções citadas
-- mesmo quando a trava impede a execução: o papel anon passou a receber
-- "permission denied for function has_role" em vez de zero linhas.
-- Aqui essas 9 viram uma política por papel, como era antes da consolidação
-- (hospital_users, kanban_ccih_tarefas, profiles, role_permissions, sectors).
-- =====================================================================

DROP POLICY IF EXISTS "ler (consolidada)" ON public.hospital_users;
CREATE POLICY "ler (consolidada) - authenticated" ON public.hospital_users AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((( SELECT auth.uid() AS uid) = user_id) OR (hospital_id IN ( SELECT public.get_primary_admin_hospital_ids() AS get_primary_admin_hospital_ids)))) OR (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND ( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role))));
CREATE POLICY "ler (consolidada)" ON public.hospital_users AS PERMISSIVE FOR SELECT TO public
  USING (((( SELECT auth.uid() AS uid) = user_id)));
DROP POLICY IF EXISTS "ler (consolidada)" ON public.kanban_ccih_tarefas;
CREATE POLICY "ler (consolidada) - authenticated" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR SELECT TO authenticated
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "ler (consolidada)" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))) OR ((assigned_to = ( SELECT auth.uid() AS uid))) OR ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY IF EXISTS "inserir (consolidada)" ON public.kanban_ccih_tarefas;
CREATE POLICY "inserir (consolidada) - authenticated" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "inserir (consolidada)" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))) OR ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY IF EXISTS "atualizar (consolidada)" ON public.kanban_ccih_tarefas;
CREATE POLICY "atualizar (consolidada) - authenticated" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "atualizar (consolidada)" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR UPDATE TO public
  USING (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))) OR ((assigned_to = ( SELECT auth.uid() AS uid))) OR ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))))
  WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))) OR ((assigned_to = ( SELECT auth.uid() AS uid))) OR ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY IF EXISTS "excluir (consolidada)" ON public.kanban_ccih_tarefas;
CREATE POLICY "excluir (consolidada) - authenticated" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR DELETE TO authenticated
  USING (((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY "excluir (consolidada)" ON public.kanban_ccih_tarefas AS PERMISSIVE FOR DELETE TO public
  USING (((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = ( SELECT auth.uid() AS uid)) AND (user_roles.role = ANY (ARRAY['hospital_admin'::public.app_role, 'super_admin'::public.app_role])))))) OR ((hospital_id IN ( SELECT hospital_users.hospital_id
   FROM public.hospital_users
  WHERE (hospital_users.user_id = ( SELECT auth.uid() AS uid))))));
DROP POLICY IF EXISTS "ler (consolidada)" ON public.profiles;
CREATE POLICY "ler (consolidada) - authenticated" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) AND (user_id IN ( SELECT hu.user_id
   FROM public.hospital_users hu
  WHERE (hu.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "ler (consolidada)" ON public.profiles AS PERMISSIVE FOR SELECT TO public
  USING (((( SELECT auth.uid() AS uid) = user_id)));
DROP POLICY IF EXISTS "atualizar (consolidada)" ON public.profiles;
CREATE POLICY "atualizar (consolidada) - authenticated" ON public.profiles AS PERMISSIVE FOR UPDATE TO authenticated
  USING (((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) AND (user_id IN ( SELECT hu.user_id
   FROM public.hospital_users hu
  WHERE (hu.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))))
  WITH CHECK (((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role) AND (user_id IN ( SELECT hu.user_id
   FROM public.hospital_users hu
  WHERE (hu.hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)))))));
CREATE POLICY "atualizar (consolidada)" ON public.profiles AS PERMISSIVE FOR UPDATE TO public
  USING (((( SELECT auth.uid() AS uid) = user_id)))
  WITH CHECK (((( SELECT auth.uid() AS uid) = user_id)));
DROP POLICY IF EXISTS "ler (consolidada)" ON public.role_permissions;
CREATE POLICY "ler (consolidada) - authenticated" ON public.role_permissions AS PERMISSIVE FOR SELECT TO authenticated
  USING (((EXISTS ( SELECT 1
   FROM public.hospital_roles hr
  WHERE ((hr.id = role_permissions.role_id) AND public.is_hospital_admin(hr.hospital_id))))));
CREATE POLICY "ler (consolidada)" ON public.role_permissions AS PERMISSIVE FOR SELECT TO public
  USING (((EXISTS ( SELECT 1
   FROM (public.hospital_roles hr
     JOIN public.user_hospital_roles uhr ON ((uhr.hospital_id = hr.hospital_id)))
  WHERE ((hr.id = role_permissions.role_id) AND (uhr.user_id = ( SELECT auth.uid() AS uid)) AND (uhr.is_active = true))))));
DROP POLICY IF EXISTS "ler (consolidada)" ON public.sectors;
CREATE POLICY "ler (consolidada) - anon" ON public.sectors AS PERMISSIVE FOR SELECT TO anon
  USING ((false));
CREATE POLICY "ler (consolidada) - authenticated" ON public.sectors AS PERMISSIVE FOR SELECT TO authenticated
  USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'super_admin'::public.app_role) AS has_role)) OR (((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids)) AND ( SELECT public.has_role(( SELECT auth.uid() AS uid), 'hospital_admin'::public.app_role) AS has_role))) OR ((hospital_id IN ( SELECT public.get_user_hospital_ids(( SELECT auth.uid() AS uid)) AS get_user_hospital_ids))));
