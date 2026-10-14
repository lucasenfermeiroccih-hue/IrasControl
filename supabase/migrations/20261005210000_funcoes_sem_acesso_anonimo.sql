-- =====================================================================
-- Segurança — funções SECURITY DEFINER que podiam ser chamadas sem login
--
-- Alertas anon_security_definer_function_executable (16) do Supabase. Destaques:
--   * match_protocol_chunks: qualquer pessoa, mesmo sem login, podia passar o
--     id de qualquer hospital e receber o texto dos protocolos dele. Só a edge
--     function ask-protocols-ai usa (com service_role). Agora só service_role.
--   * get_user_hospital_ids / has_role / is_super_admin / user_has_permission:
--     recebem o id de qualquer usuário; visitante não logado podia descobrir
--     hospitais e papéis de outras pessoas. Agora só usuários logados.
--   * funções de gatilho: não precisam ser chamáveis pela API (o gatilho
--     dispara sem depender dessa permissão).
--   * has_any_super_admin: só a edge function initial-setup (service_role).
--
-- Mantida para visitante: user_has_hospital — usada pelas políticas do bucket
-- protocol-documents em storage.objects (tabela do Supabase, não alterável
-- aqui); para visitante ela sempre responde "não".
--
-- Para tirar a permissão dos visitantes sem quebrar consultas deles (ex.:
-- avatares, marketplace), as 164 políticas de 38 tabelas que usam essas funções
-- e valiam para o papel "public" passam a valer só para "authenticated".
-- Para usuários logados nada muda; para visitante elas já não liberavam nada
-- (dependem de auth.uid()). Lista guardada em ops.rls_role_change (fase 5).
--
-- Verificado antes de aplicar (simulação desfeita no fim):
--   * ops.rls_take_snapshot: 304 medições (38 tabelas x 8 perfis), 0 diferenças
--   * gatilhos de pacientes, auditorias (cria plano de ação) e laboratório OK
--   * visitante: funções negadas; tabelas protegidas retornam vazio sem erro;
--     marketplace (7) e avatares continuam acessíveis
-- Aplicada e verificada em produção (14/10): 0 diferenças nas 304 medições;
-- alertas "anon pode executar" do Supabase: 16 -> 1 (user_has_hospital, mantida).
--
-- Para desfazer:
--   DO $$ DECLARE r record; BEGIN
--     FOR r IN SELECT * FROM ops.rls_role_change WHERE fase = 5 LOOP
--       EXECUTE format('ALTER POLICY %I ON %I.%I TO public', r.policyname, r.schemaname, r.tablename);
--     END LOOP; END $$;
--   GRANT EXECUTE ON FUNCTION <funções abaixo> TO PUBLIC;
-- =====================================================================

SET LOCAL lock_timeout = '5s';

CREATE TABLE IF NOT EXISTS ops.rls_role_change (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  fase int NOT NULL,
  schemaname text NOT NULL,
  tablename text NOT NULL,
  policyname text NOT NULL,
  old_roles text NOT NULL,
  new_roles text NOT NULL,
  UNIQUE (schemaname, tablename, policyname)
);
REVOKE ALL ON ops.rls_role_change FROM PUBLIC, anon, authenticated;

INSERT INTO ops.rls_role_change (fase, schemaname, tablename, policyname, old_roles, new_roles)
SELECT 5, schemaname, tablename, policyname, roles::text, '{authenticated}'
FROM pg_policies
WHERE schemaname IN ('public', 'ccih') AND roles = array['public']::name[]
  AND (coalesce(qual, '') || ' ' || coalesce(with_check, ''))
      ~ '(get_user_hospital_ids|has_role|is_hospital_admin|is_super_admin|user_has_hospital|get_primary_admin_hospital_ids|user_has_permission|has_any_super_admin)\('
ON CONFLICT DO NOTHING;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM ops.rls_role_change WHERE fase = 5 LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- Funções usadas pelas políticas e pelo app: só usuários logados
REVOKE EXECUTE ON FUNCTION
  public.get_user_hospital_ids(uuid),
  public.has_role(uuid, app_role),
  public.is_super_admin(uuid),
  public.is_hospital_admin(uuid),
  public.get_primary_admin_hospital_ids(),
  public.user_has_permission(uuid, uuid, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.get_user_hospital_ids(uuid),
  public.has_role(uuid, app_role),
  public.is_super_admin(uuid),
  public.is_hospital_admin(uuid),
  public.get_primary_admin_hospital_ids(),
  public.user_has_permission(uuid, uuid, text)
TO authenticated, service_role;

-- Uso interno (edge functions com service_role) e funções de gatilho
REVOKE EXECUTE ON FUNCTION
  public.match_protocol_chunks(vector, uuid, integer, double precision),
  public.has_any_super_admin(),
  public.ccih_create_plan_from_audit(),
  public.ccih_create_plan_from_infection_case(),
  public.fn_patient_audit(),
  public.handle_new_user(),
  public.prevent_last_admin_removal(),
  public.rls_auto_enable(),
  public.sync_lab_result_sector()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION
  public.match_protocol_chunks(vector, uuid, integer, double precision),
  public.has_any_super_admin()
TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin;
