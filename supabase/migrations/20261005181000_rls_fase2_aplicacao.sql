-- =====================================================================
-- Ajuste das regras de acesso (RLS) — FASE 2 (aplicação)
--
-- Aplica as expressões reescritas de ops.rls_rewrite_plan (fase 2): 390
-- políticas em 106 tabelas (public e ccih). Mesma lógica de acesso; auth.uid(),
-- has_role(...) e is_super_admin(...) passam a ser avaliados uma vez por
-- consulta.
-- Equivalência verificada antes da aplicação com ops.rls_expression_check(2):
-- 3.996 comparações em 9 perfis (incluindo super_admin), nenhuma diferença.
--
-- lock_timeout: se alguma tabela estiver ocupada, a migração falha sem esperar
-- em fila (nada é alterado) em vez de travar o sistema.
-- Para desfazer: SELECT ops.rls_restore(2);
-- =====================================================================

SET LOCAL lock_timeout = '5s';
SELECT ops.rls_apply(2);

-- Chave primária nas tabelas internas de cópia/teste (alerta no_primary_key)
ALTER TABLE ops.rls_policy_backup ADD COLUMN IF NOT EXISTS id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY;
ALTER TABLE ops.rls_visibility_snapshot ADD COLUMN IF NOT EXISTS id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY;
