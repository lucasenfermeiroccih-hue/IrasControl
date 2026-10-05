-- =====================================================================
-- Ajuste das regras de acesso (RLS) — FASE 1: tabelas pesadas
--
-- Aplica as expressões reescritas de ops.rls_rewrite_plan (fase 1) às 34
-- políticas de audit_items, audits, antibiogram_results, lab_results, patients,
-- precautions, patient_audit_log e ccih.action_plans.
--
-- Mesma lógica de acesso: só muda a forma — auth.uid() e has_role(...) passam a
-- ser avaliados uma vez por consulta, e não uma vez por linha.
-- Equivalência verificada antes da aplicação com ops.rls_expression_check(1):
-- 368 comparações (8 perfis, incluindo super_admin), nenhuma diferença.
--
-- Para desfazer: SELECT ops.rls_restore(1);
-- =====================================================================

CREATE OR REPLACE FUNCTION ops.rls_apply(p_fase int)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE pl record; n int := 0;
BEGIN
  FOR pl IN SELECT * FROM ops.rls_rewrite_plan WHERE fase = p_fase LOOP
    IF pl.new_qual IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', pl.policyname, pl.schemaname, pl.tablename, pl.new_qual);
    END IF;
    IF pl.new_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)', pl.policyname, pl.schemaname, pl.tablename, pl.new_check);
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END
$$;

REVOKE ALL ON FUNCTION ops.rls_apply(int) FROM PUBLIC, anon, authenticated;

SELECT ops.rls_apply(1);
