-- =====================================================================
-- Precauções em vigor de pacientes do Monitoramento que já saíram
-- (alta, óbito ou transferência) — HGNI, 29/10/2026.
--
-- A saída no Monitoramento não encerrava a precaução (corrigido no código:
-- a alta passa a encerrá-la). Aqui, as que ficaram abertas são encerradas na
-- data da saída do paciente. Estado anterior em public.correcoes_qualidade_dado,
-- lote 'precaucoes_saida_hgni_2026-10-29'. Pode ser executada de novo sem efeito.
-- =====================================================================

WITH alvo AS (
  SELECT pr.id, pr.is_active, pr.end_date, p.discharge_date::date AS saida
  FROM public.precautions pr
  JOIN public.patients p ON p.id = pr.patient_id
  JOIN public.hospitals h ON h.id = p.hospital_id AND h.name = 'Hospital Geral de Nova Iguaçu'
  WHERE pr.is_active
    AND p.status <> 'active'
    AND p.source IS DISTINCT FROM 'precaution_map'
    AND p.discharge_date IS NOT NULL
),
registro AS (
  INSERT INTO public.correcoes_qualidade_dado (lote, tabela, registro_id, acao, motivo, estado_anterior, estado_novo, executado_por)
  SELECT 'precaucoes_saida_hgni_2026-10-29', 'public.precautions', a.id, 'atualizado',
         'Precaução encerrada na data da saída do paciente (alta, óbito ou transferência)',
         jsonb_build_object('is_active', a.is_active, 'end_date', a.end_date),
         jsonb_build_object('is_active', false, 'end_date', GREATEST(a.saida, pr.start_date)),
         'claude_code (aprovado pelo usuário)'
  FROM alvo a JOIN public.precautions pr ON pr.id = a.id
  RETURNING 1
)
UPDATE public.precautions pr
SET is_active = false, end_date = GREATEST(a.saida, pr.start_date), updated_at = now()
FROM alvo a
WHERE pr.id = a.id AND (SELECT count(*) FROM registro) >= 0;
