-- =====================================================================
-- Kanban SCIH — plantões da Camila (HGNI), aprovado pela coordenação em 27/10/2026.
-- Escala 12x60 (7h–19h), inclusive fins de semana: um plantão a cada 3 dias,
-- a partir de 27/10/2026 (1º plantão), até 31/12/2027.
-- Estado anterior em public.correcoes_qualidade_dado, lote 'kanban_plantoes_camila_2026-10-27'.
-- =====================================================================

WITH camila AS (
  SELECT e.id, e.plantoes
  FROM public.kanban_ccih_escala e
  JOIN public.hospitals h ON h.id = e.hospital_id AND h.name = 'Hospital Geral de Nova Iguaçu'
  JOIN public.profiles p ON p.user_id = e.user_id AND p.full_name ILIKE 'Camila%'
),
ciclo AS (
  SELECT array_agg(d::date ORDER BY d) AS datas
  FROM generate_series(DATE '2026-10-27', DATE '2027-12-31', INTERVAL '3 days') AS d
),
registro AS (
  INSERT INTO public.correcoes_qualidade_dado (lote, tabela, registro_id, acao, motivo, estado_anterior, estado_novo, executado_por)
  SELECT 'kanban_plantoes_camila_2026-10-27', 'public.kanban_ccih_escala', c.id, 'atualizado',
         'Plantões 12x60 da Camila a partir de 27/10/2026 (inclui fins de semana)',
         jsonb_build_object('plantoes', c.plantoes),
         jsonb_build_object('regime', 'plantao', 'plantoes_de', '2026-10-27', 'plantoes_ate', '2027-12-31', 'intervalo_dias', 3),
         'claude_code (aprovado pelo usuário)'
  FROM camila c
  RETURNING 1
)
UPDATE public.kanban_ccih_escala e
SET regime = 'plantao',
    plantoes = (SELECT datas FROM ciclo),
    updated_at = now()
FROM camila c
WHERE e.id = c.id AND (SELECT count(*) FROM registro) >= 0;
