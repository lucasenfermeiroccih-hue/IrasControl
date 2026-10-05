-- =====================================================================
-- Ajuste das regras de acesso (RLS) — FASE 3: correções de segurança
--
-- 1) correcoes_qualidade_dado: registro interno das correções de dados feitas
--    no banco (estado anterior/novo de registros de todos os hospitais). Antes
--    qualquer usuário logado, de qualquer hospital, podia ler as 370 linhas.
--    Agora só super_admin lê. O app não usa esta tabela.
--
-- 2) sectors: a política "agents_select_sectors" (papel anon, USING true)
--    deixava qualquer visitante não logado listar os setores de todos os
--    hospitais (sobra de 20260522202629, que removeu as demais agents_select_*).
--    Passa a não aceitar nenhuma linha. Usuários logados continuam vendo os
--    setores dos seus hospitais pelas políticas "Hospital members can view
--    sectors" e "Super admins full access on sectors".
--
-- Feito com ALTER POLICY (sem DROP) para ser reversível com um comando.
-- Verificado com ops.rls_take_snapshot('antes_fase3'/'depois_fase3'):
--   correcoes: membros/admin/usuário de fora 370 -> 0; super_admin continua 370
--   sectors:   visitante não logado 60 -> 0; membros de cada hospital iguais
--
-- Para desfazer (originais também em ops.rls_policy_backup):
--   ALTER POLICY "Super admins leem correcoes" ON public.correcoes_qualidade_dado USING (true);
--   ALTER POLICY "Super admins leem correcoes" ON public.correcoes_qualidade_dado
--     RENAME TO leitura_correcoes_autenticados;
--   ALTER POLICY agents_select_sectors ON public.sectors USING (true);
-- =====================================================================

SET LOCAL lock_timeout = '5s';

ALTER POLICY leitura_correcoes_autenticados ON public.correcoes_qualidade_dado
  USING (( SELECT has_role(( SELECT auth.uid() AS uid), 'super_admin'::app_role) AS has_role));
ALTER POLICY leitura_correcoes_autenticados ON public.correcoes_qualidade_dado
  RENAME TO "Super admins leem correcoes";

ALTER POLICY agents_select_sectors ON public.sectors USING (false);

-- Funções internas de teste (esquema ops, sem acesso pela API): search_path fixo
-- (alerta function_search_path_mutable).
ALTER FUNCTION ops.rls_rewrite_expr(text) SET search_path = public, pg_temp;
ALTER FUNCTION ops.rls_test_users() SET search_path = public, pg_temp;
ALTER FUNCTION ops.rls_expression_check(int, text) SET search_path = public, pg_temp;
ALTER FUNCTION ops.rls_take_snapshot(text, text[]) SET search_path = public, pg_temp;
ALTER FUNCTION ops.rls_restore(int) SET search_path = public, pg_temp;
ALTER FUNCTION ops.rls_apply(int) SET search_path = public, pg_temp;
ALTER FUNCTION ops.rls_row_key(text, text) SET search_path = public, pg_temp;
