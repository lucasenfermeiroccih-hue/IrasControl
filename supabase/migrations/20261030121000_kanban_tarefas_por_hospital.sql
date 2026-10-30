-- =====================================================================
-- Kanban CCIH: tarefas restritas ao próprio hospital — 30/10/2026.
--
-- Antes, uma regra antiga deixava QUALQUER usuário com papel hospital_admin
-- (de qualquer hospital) ver, criar, editar e excluir as tarefas de TODOS os
-- hospitais. Agora vale o mesmo para todos: só membros do hospital da tarefa
-- (hospital_users) acessam; o super_admin do sistema continua com acesso geral.
-- Escala (kanban_ccih_escala) e execuções (kanban_ccih_execucoes) já eram
-- restritas ao hospital.
-- =====================================================================

DROP POLICY IF EXISTS "ler (consolidada)" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "ler (consolidada) - authenticated" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "inserir (consolidada)" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "inserir (consolidada) - authenticated" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "atualizar (consolidada)" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "atualizar (consolidada) - authenticated" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "excluir (consolidada)" ON public.kanban_ccih_tarefas;
DROP POLICY IF EXISTS "excluir (consolidada) - authenticated" ON public.kanban_ccih_tarefas;

CREATE POLICY "Membros do hospital leem as tarefas" ON public.kanban_ccih_tarefas
  FOR SELECT TO authenticated
  USING (
    hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
    OR (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
  );

CREATE POLICY "Membros do hospital criam tarefas" ON public.kanban_ccih_tarefas
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
    OR (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
  );

CREATE POLICY "Membros do hospital editam as tarefas" ON public.kanban_ccih_tarefas
  FOR UPDATE TO authenticated
  USING (
    hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
    OR (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
  )
  WITH CHECK (
    hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
    OR (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
  );

CREATE POLICY "Membros do hospital excluem tarefas" ON public.kanban_ccih_tarefas
  FOR DELETE TO authenticated
  USING (
    hospital_id IN (SELECT public.get_user_hospital_ids((SELECT auth.uid())))
    OR (SELECT public.has_role((SELECT auth.uid()), 'super_admin'::public.app_role))
  );
