-- =====================================================================
-- Ajuste das regras de acesso (RLS) — FASE 2 (preparação)
--
-- * ops.rls_rewrite_expr v2: além de super_admin, envolve has_role(...) de
--   qualquer papel e is_super_admin(auth.uid()) em subselect (avaliados uma vez
--   por consulta). Demais auth.uid() continuam sendo envolvidos como na fase 1.
-- * Testes funcionam também em tabelas sem coluna "id" (usam o texto da linha).
-- * Plano da fase 2: todas as políticas restantes com auth.uid() não envolvido.
-- Nenhuma política é alterada aqui.
-- =====================================================================

CREATE OR REPLACE FUNCTION ops.rls_rewrite_expr(expr text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN expr IS NULL THEN NULL ELSE
    regexp_replace(
      regexp_replace(
        regexp_replace(expr,
          'has_role\(auth\.uid\(\), (''[a-z_]+''::app_role)\)',
          '( SELECT has_role(( SELECT auth.uid() AS uid), \1) AS has_role)', 'g'),
        'is_super_admin\(auth\.uid\(\)\)',
        '( SELECT is_super_admin(( SELECT auth.uid() AS uid)) AS is_super_admin)', 'g'),
      '(?<!SELECT )auth\.uid\(\)', '( SELECT auth.uid() AS uid)', 'g')
  END
$$;

-- Chave usada nos testes: id quando existe; senão, o texto da linha inteira
-- (referenciada pelo nome da tabela, sem alias, pois algumas políticas citam a
-- própria tabela pelo nome, ex.: role_permissions.role_id)
CREATE OR REPLACE FUNCTION ops.rls_row_key(p_schema text, p_table text)
RETURNS text LANGUAGE sql STABLE AS $$
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = p_schema AND table_name = p_table AND column_name = 'id')
  THEN 'id::text' ELSE format('%I::text', p_table) END
$$;

CREATE OR REPLACE FUNCTION ops.rls_expression_check(p_fase int, p_tabela text DEFAULT NULL)
RETURNS TABLE (tabela text, policyname text, parte text, user_label text,
               linhas_antes bigint, linhas_depois bigint, iguais boolean)
LANGUAGE plpgsql AS $$
DECLARE
  pl record; u record; c1 bigint; c2 bigint; h1 bigint; h2 bigint;
  parte_nome text; e_old text; e_new text; k text;
BEGIN
  FOR pl IN SELECT * FROM ops.rls_rewrite_plan
            WHERE fase = p_fase AND (p_tabela IS NULL OR schemaname || '.' || tablename = p_tabela)
            ORDER BY 2, 3, 4 LOOP
    k := ops.rls_row_key(pl.schemaname, pl.tablename);
    FOR u IN SELECT * FROM ops.rls_test_users() LOOP
      PERFORM set_config('request.jwt.claims',
        CASE WHEN u.user_id IS NULL THEN '{}' ELSE json_build_object('sub', u.user_id, 'role', u.db_role)::text END, true);
      FOREACH parte_nome IN ARRAY ARRAY['USING', 'WITH CHECK'] LOOP
        e_old := CASE parte_nome WHEN 'USING' THEN pl.old_qual ELSE pl.old_check END;
        e_new := CASE parte_nome WHEN 'USING' THEN pl.new_qual ELSE pl.new_check END;
        CONTINUE WHEN e_old IS NULL AND e_new IS NULL;
        EXECUTE format('SELECT count(*), coalesce(sum(hashtext(%s)),0) FROM %I.%I WHERE (%s)',
                       k, pl.schemaname, pl.tablename, e_old) INTO c1, h1;
        EXECUTE format('SELECT count(*), coalesce(sum(hashtext(%s)),0) FROM %I.%I WHERE (%s)',
                       k, pl.schemaname, pl.tablename, e_new) INTO c2, h2;
        tabela := pl.schemaname || '.' || pl.tablename; policyname := pl.policyname; parte := parte_nome;
        user_label := u.user_label; linhas_antes := c1; linhas_depois := c2; iguais := (c1 = c2 AND h1 = h2);
        RETURN NEXT;
      END LOOP;
    END LOOP;
  END LOOP;
END
$$;

CREATE OR REPLACE FUNCTION ops.rls_take_snapshot(p_label text, p_tables text[])
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  u record; t text; c bigint; h bigint; t0 timestamptz; ms numeric; k text;
BEGIN
  FOR u IN SELECT * FROM ops.rls_test_users() LOOP
    FOREACH t IN ARRAY p_tables LOOP
      k := ops.rls_row_key(split_part(t, '.', 1), split_part(t, '.', 2));
      PERFORM set_config('request.jwt.claims',
        CASE WHEN u.user_id IS NULL THEN '{}' ELSE json_build_object('sub', u.user_id, 'role', u.db_role)::text END, true);
      BEGIN
        EXECUTE format('SET LOCAL ROLE %I', u.db_role);
        t0 := clock_timestamp();
        EXECUTE format('SELECT count(*), coalesce(sum(hashtext(%s)),0) FROM %s', k, t) INTO c, h;
        ms := round(extract(epoch FROM clock_timestamp() - t0) * 1000, 1);
        RESET ROLE;
      EXCEPTION WHEN insufficient_privilege THEN
        c := -1; h := 0; ms := 0;
      END;
      INSERT INTO ops.rls_visibility_snapshot (label, user_label, tabela, linhas, checksum, ms)
      VALUES (p_label, u.user_label, t, c, h, ms);
    END LOOP;
  END LOOP;
END
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ops FROM PUBLIC, anon, authenticated;

-- Plano da FASE 2: políticas restantes com auth.uid() avaliado por linha
INSERT INTO ops.rls_rewrite_plan (fase, schemaname, tablename, policyname, cmd, old_qual, old_check, new_qual, new_check)
SELECT 2, p.schemaname, p.tablename, p.policyname, p.cmd, p.qual, p.with_check,
       ops.rls_rewrite_expr(p.qual), ops.rls_rewrite_expr(p.with_check)
FROM pg_policies p
WHERE p.schemaname IN ('public', 'ccih')
  AND (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~ '(?<!SELECT )auth\.uid\(\)'
ON CONFLICT DO NOTHING;
