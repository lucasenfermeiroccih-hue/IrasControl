-- =====================================================================
-- Cadastro de setores — correções óbvias aprovadas (HGNI, 26/10/2026)
--
--   "Trauma Cirurgico"  → "Trauma Cirúrgico"  (grafia, com acento)
--   "UTI 1/2/3 Adulto"  → "UTI 1/2/3"         (mesmo setor do cadastro)
--
-- 1) public.normalize_sector_name(): padroniza o nome do setor.
-- 2) Gatilho do laboratório (sync_lab_result_sector) passa a padronizar o setor
--    extraído das notas da importação ("Setor: UTI 1 Adulto"), para que novas
--    importações não tragam o nome antigo de volta.
-- 3) Registros existentes do HGNI corrigidos no cadastro de setores, auditorias,
--    planos de ação da CCIH e resultados de laboratório. Cada alteração fica em
--    public.correcoes_qualidade_dado (lote 'setores_hgni_2026-10-26') com o valor
--    anterior. Para desfazer, use estado_anterior desse lote.
--
-- Duplicidades que dependem de decisão da CCIH (Pediatria/Enfermaria
-- Pediátrica, Clínica Médica/Enfermaria Clínica etc.) NÃO são alteradas aqui.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.normalize_sector_name(p_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_name IS NULL THEN NULL
    WHEN btrim(p_name) = 'Trauma Cirurgico' THEN 'Trauma Cirúrgico'
    WHEN btrim(p_name) ~ '^UTI [0-9]+ Adulto$' THEN regexp_replace(btrim(p_name), '^(UTI [0-9]+) Adulto$', '\1')
    ELSE p_name
  END
$$;

CREATE OR REPLACE FUNCTION public.sync_lab_result_sector()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Prioridade 1: extrair das notes
  IF NEW.notes LIKE 'Setor:%' THEN
    NEW.sector := TRIM(SUBSTRING(NEW.notes FROM 'Setor:\s*([^|]+)'));
  END IF;
  -- Prioridade 2: buscar do paciente se ainda vazio
  IF (NEW.sector IS NULL OR NEW.sector = '') AND NEW.patient_id IS NOT NULL THEN
    SELECT p.sector INTO NEW.sector
    FROM patients p
    WHERE p.id = NEW.patient_id
      AND p.sector IS NOT NULL AND p.sector != '';
  END IF;
  -- Nome padronizado do setor (ex.: "UTI 1 Adulto" → "UTI 1")
  NEW.sector := normalize_sector_name(NEW.sector);
  RETURN NEW;
END;
$function$;

-- ── Registro das alterações (valor anterior) ───────────────────────────
INSERT INTO public.correcoes_qualidade_dado (lote, tabela, registro_id, acao, motivo, estado_anterior, estado_novo, executado_por)
SELECT 'setores_hgni_2026-10-26', 'public.sectors', s.id, 'atualizado', 'Padronização do nome do setor',
       jsonb_build_object('name', s.name), jsonb_build_object('name', public.normalize_sector_name(s.name)), 'claude_code (aprovado pelo usuário)'
FROM public.sectors s JOIN public.hospitals h ON h.id = s.hospital_id
WHERE h.name = 'Hospital Geral de Nova Iguaçu' AND public.normalize_sector_name(s.name) IS DISTINCT FROM s.name;

INSERT INTO public.correcoes_qualidade_dado (lote, tabela, registro_id, acao, motivo, estado_anterior, estado_novo, executado_por)
SELECT 'setores_hgni_2026-10-26', 'public.audits', a.id, 'atualizado', 'Padronização do nome do setor',
       jsonb_build_object('sector', a.sector), jsonb_build_object('sector', public.normalize_sector_name(a.sector)), 'claude_code (aprovado pelo usuário)'
FROM public.audits a JOIN public.hospitals h ON h.id = a.hospital_id
WHERE h.name = 'Hospital Geral de Nova Iguaçu' AND public.normalize_sector_name(a.sector) IS DISTINCT FROM a.sector;

INSERT INTO public.correcoes_qualidade_dado (lote, tabela, registro_id, acao, motivo, estado_anterior, estado_novo, executado_por)
SELECT 'setores_hgni_2026-10-26', 'ccih.action_plans', ap.id, 'atualizado', 'Padronização do nome do setor',
       jsonb_build_object('where_field', ap.where_field), jsonb_build_object('where_field', public.normalize_sector_name(ap.where_field)), 'claude_code (aprovado pelo usuário)'
FROM ccih.action_plans ap JOIN public.hospitals h ON h.id = ap.hospital_id
WHERE h.name = 'Hospital Geral de Nova Iguaçu' AND public.normalize_sector_name(ap.where_field) IS DISTINCT FROM ap.where_field;

INSERT INTO public.correcoes_qualidade_dado (lote, tabela, registro_id, acao, motivo, estado_anterior, estado_novo, executado_por)
SELECT 'setores_hgni_2026-10-26', 'public.lab_results', l.id, 'atualizado', 'Padronização do nome do setor',
       jsonb_build_object('sector', l.sector), jsonb_build_object('sector', public.normalize_sector_name(l.sector)), 'claude_code (aprovado pelo usuário)'
FROM public.lab_results l JOIN public.hospitals h ON h.id = l.hospital_id
WHERE h.name = 'Hospital Geral de Nova Iguaçu' AND public.normalize_sector_name(l.sector) IS DISTINCT FROM l.sector;

-- ── Correção ──────────────────────────────────────────────────────────
UPDATE public.sectors s SET name = public.normalize_sector_name(s.name)
FROM public.hospitals h
WHERE h.id = s.hospital_id AND h.name = 'Hospital Geral de Nova Iguaçu'
  AND public.normalize_sector_name(s.name) IS DISTINCT FROM s.name;

UPDATE public.audits a SET sector = public.normalize_sector_name(a.sector)
FROM public.hospitals h
WHERE h.id = a.hospital_id AND h.name = 'Hospital Geral de Nova Iguaçu'
  AND public.normalize_sector_name(a.sector) IS DISTINCT FROM a.sector;

UPDATE ccih.action_plans ap SET where_field = public.normalize_sector_name(ap.where_field)
FROM public.hospitals h
WHERE h.id = ap.hospital_id AND h.name = 'Hospital Geral de Nova Iguaçu'
  AND public.normalize_sector_name(ap.where_field) IS DISTINCT FROM ap.where_field;

-- o gatilho normaliza o setor (inclusive o extraído das notas)
UPDATE public.lab_results l SET sector = public.normalize_sector_name(l.sector)
FROM public.hospitals h
WHERE h.id = l.hospital_id AND h.name = 'Hospital Geral de Nova Iguaçu'
  AND public.normalize_sector_name(l.sector) IS DISTINCT FROM l.sector;
