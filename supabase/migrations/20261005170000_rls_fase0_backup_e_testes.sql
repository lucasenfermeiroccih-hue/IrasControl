-- =====================================================================
-- Ajuste das regras de acesso (RLS) — FASE 0: cópia de segurança e testes
--
-- Cria o esquema interno "ops" (não exposto à API) com:
--   * ops.rls_policy_backup ........ cópia de TODAS as políticas atuais
--   * ops.rls_rewrite_plan ......... plano de reescrita (expressão antiga/nova)
--   * ops.rls_visibility_snapshot .. linhas visíveis por perfil, antes/depois
--   * ops.rls_test_users() ......... perfis de teste (membro de cada hospital,
--                                    admin do hospital, super_admin, usuário de
--                                    fora e visitante não logado)
--   * ops.rls_expression_check() ... compara, por política e perfil, as linhas
--                                    aceitas pela expressão antiga e pela nova
--   * ops.rls_take_snapshot() ...... conta linhas visíveis por perfil usando o
--                                    papel real (authenticated/anon) e a RLS
--   * ops.rls_restore() ............ desfaz uma fase (volta as expressões antigas)
--
-- A reescrita não muda a lógica: auth.uid() e has_role(...) passam a ser
-- avaliados uma vez por consulta (subselect/initplan) em vez de uma vez por
-- linha — recomendação do Supabase (lint auth_rls_initplan).
-- =====================================================================

CREATE SCHEMA IF NOT EXISTS ops;
REVOKE ALL ON SCHEMA ops FROM PUBLIC, anon, authenticated;

-- Cópia de segurança de todas as políticas (public e ccih)
CREATE TABLE IF NOT EXISTS ops.rls_policy_backup AS
SELECT now() AS backed_up_at, schemaname::text, tablename::text, policyname::text,
       permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname IN ('public', 'ccih');

CREATE TABLE IF NOT EXISTS ops.rls_rewrite_plan (
  fase        int  NOT NULL,
  schemaname  text NOT NULL,
  tablename   text NOT NULL,
  policyname  text NOT NULL,
  cmd         text NOT NULL,
  old_qual    text,
  old_check   text,
  new_qual    text,
  new_check   text,
  PRIMARY KEY (schemaname, tablename, policyname)
);

CREATE TABLE IF NOT EXISTS ops.rls_visibility_snapshot (
  label      text NOT NULL,
  user_label text NOT NULL,
  tabela     text NOT NULL,
  linhas     bigint NOT NULL,
  checksum   bigint NOT NULL,
  ms         numeric NOT NULL,
  taken_at   timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON ALL TABLES IN SCHEMA ops FROM PUBLIC, anon, authenticated;

-- Reescrita mecânica de uma expressão de política
CREATE OR REPLACE FUNCTION ops.rls_rewrite_expr(expr text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN expr IS NULL THEN NULL ELSE
    regexp_replace(
      regexp_replace(expr,
        'has_role\(auth\.uid\(\), ''super_admin''::app_role\)',
        '( SELECT has_role(( SELECT auth.uid() AS uid), ''super_admin''::app_role) AS has_role)', 'g'),
      '(?<!SELECT )auth\.uid\(\)', '( SELECT auth.uid() AS uid)', 'g')
  END
$$;

-- Perfis de teste
CREATE OR REPLACE FUNCTION ops.rls_test_users()
RETURNS TABLE (user_label text, user_id uuid, db_role text)
LANGUAGE sql STABLE AS $$
  -- um membro (não super_admin) de cada hospital
  SELECT DISTINCT ON (h.id) 'membro: ' || h.name, hu.user_id, 'authenticated'
  FROM public.hospitals h
  JOIN public.hospital_users hu ON hu.hospital_id = h.id
  WHERE NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = hu.user_id AND r.role = 'super_admin')
  UNION ALL
  -- administrador principal de algum hospital
  (SELECT 'admin do hospital', hu.user_id, 'authenticated'
   FROM public.hospital_users hu
   WHERE hu.is_primary_admin = true
     AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = hu.user_id AND r.role = 'super_admin')
   LIMIT 1)
  UNION ALL
  (SELECT 'super_admin', r.user_id, 'authenticated' FROM public.user_roles r WHERE r.role = 'super_admin' LIMIT 1)
  UNION ALL
  SELECT 'usuario de fora', '00000000-0000-0000-0000-0000000000aa'::uuid, 'authenticated'
  UNION ALL
  SELECT 'visitante (anon)', NULL::uuid, 'anon'
$$;

-- Equivalência das expressões: para cada política do plano e cada perfil,
-- conta (e soma um hash dos ids) das linhas aceitas pela expressão antiga e pela
-- nova. Roda como dono das tabelas, então as subconsultas não sofrem RLS.
CREATE OR REPLACE FUNCTION ops.rls_expression_check(p_fase int, p_tabela text DEFAULT NULL)
RETURNS TABLE (tabela text, policyname text, parte text, user_label text,
               linhas_antes bigint, linhas_depois bigint, iguais boolean)
LANGUAGE plpgsql AS $$
DECLARE
  pl record; u record; c1 bigint; c2 bigint; h1 bigint; h2 bigint;
  parte_nome text; e_old text; e_new text;
BEGIN
  FOR pl IN SELECT * FROM ops.rls_rewrite_plan
            WHERE fase = p_fase AND (p_tabela IS NULL OR schemaname || '.' || tablename = p_tabela)
            ORDER BY 2, 3, 4 LOOP
    FOR u IN SELECT * FROM ops.rls_test_users() LOOP
      PERFORM set_config('request.jwt.claims',
        CASE WHEN u.user_id IS NULL THEN '{}' ELSE json_build_object('sub', u.user_id, 'role', u.db_role)::text END, true);
      FOREACH parte_nome IN ARRAY ARRAY['USING', 'WITH CHECK'] LOOP
        e_old := CASE parte_nome WHEN 'USING' THEN pl.old_qual ELSE pl.old_check END;
        e_new := CASE parte_nome WHEN 'USING' THEN pl.new_qual ELSE pl.new_check END;
        CONTINUE WHEN e_old IS NULL AND e_new IS NULL;
        EXECUTE format('SELECT count(*), coalesce(sum(hashtext(id::text)),0) FROM %I.%I WHERE (%s)',
                       pl.schemaname, pl.tablename, e_old) INTO c1, h1;
        EXECUTE format('SELECT count(*), coalesce(sum(hashtext(id::text)),0) FROM %I.%I WHERE (%s)',
                       pl.schemaname, pl.tablename, e_new) INTO c2, h2;
        tabela := pl.schemaname || '.' || pl.tablename; policyname := pl.policyname; parte := parte_nome;
        user_label := u.user_label; linhas_antes := c1; linhas_depois := c2; iguais := (c1 = c2 AND h1 = h2);
        RETURN NEXT;
      END LOOP;
    END LOOP;
  END LOOP;
END
$$;

-- Linhas visíveis por perfil usando o papel real e a RLS em vigor
CREATE OR REPLACE FUNCTION ops.rls_take_snapshot(p_label text, p_tables text[])
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  u record; t text; c bigint; h bigint; t0 timestamptz; ms numeric;
BEGIN
  FOR u IN SELECT * FROM ops.rls_test_users() LOOP
    FOREACH t IN ARRAY p_tables LOOP
      PERFORM set_config('request.jwt.claims',
        CASE WHEN u.user_id IS NULL THEN '{}' ELSE json_build_object('sub', u.user_id, 'role', u.db_role)::text END, true);
      BEGIN
        EXECUTE format('SET LOCAL ROLE %I', u.db_role);
        t0 := clock_timestamp();
        EXECUTE format('SELECT count(*), coalesce(sum(hashtext(id::text)),0) FROM %s', t) INTO c, h;
        ms := round(extract(epoch FROM clock_timestamp() - t0) * 1000, 1);
        RESET ROLE;
      EXCEPTION WHEN insufficient_privilege THEN
        -- perfil sem permissão de acesso à tabela/esquema: registra -1
        c := -1; h := 0; ms := 0;
      END;
      INSERT INTO ops.rls_visibility_snapshot (label, user_label, tabela, linhas, checksum, ms)
      VALUES (p_label, u.user_label, t, c, h, ms);
    END LOOP;
  END LOOP;
END
$$;

-- Desfaz uma fase: volta as expressões antigas
CREATE OR REPLACE FUNCTION ops.rls_restore(p_fase int)
RETURNS int LANGUAGE plpgsql AS $$
DECLARE pl record; n int := 0;
BEGIN
  FOR pl IN SELECT * FROM ops.rls_rewrite_plan WHERE fase = p_fase LOOP
    IF pl.old_qual IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I USING (%s)', pl.policyname, pl.schemaname, pl.tablename, pl.old_qual);
    END IF;
    IF pl.old_check IS NOT NULL THEN
      EXECUTE format('ALTER POLICY %I ON %I.%I WITH CHECK (%s)', pl.policyname, pl.schemaname, pl.tablename, pl.old_check);
    END IF;
    n := n + 1;
  END LOOP;
  RETURN n;
END
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ops FROM PUBLIC, anon, authenticated;

-- Plano da FASE 1: tabelas pesadas
INSERT INTO ops.rls_rewrite_plan (fase, schemaname, tablename, policyname, cmd, old_qual, old_check, new_qual, new_check)
SELECT 1, schemaname, tablename, policyname, cmd, qual, with_check,
       ops.rls_rewrite_expr(qual), ops.rls_rewrite_expr(with_check)
FROM pg_policies
WHERE ((schemaname = 'public' AND tablename IN
         ('audit_items', 'audits', 'antibiogram_results', 'lab_results', 'patients', 'precautions', 'patient_audit_log'))
    OR (schemaname = 'ccih' AND tablename = 'action_plans'))
  AND (coalesce(qual, '') || coalesce(with_check, '')) ~ 'auth\.uid\(\)'
ON CONFLICT DO NOTHING;
