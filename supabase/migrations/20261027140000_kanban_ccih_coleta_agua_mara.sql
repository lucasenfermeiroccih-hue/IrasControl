-- =====================================================================
-- Kanban SCIH — nova tarefa da Mara Rubia (HGNI), pedida pela coordenação em 27/10/2026:
-- coleta mensal da água para análise, 1 vez ao mês. Complementa o
-- "Programa de coleta e controle da água" (plano, resultado e providências).
-- Pode ser executada de novo sem duplicar.
-- =====================================================================

WITH u AS (
  SELECT pe.chave, hu.hospital_id, hu.user_id
  FROM (VALUES ('mara', 'Mara Rubia%'), ('lucas', 'Lucas da Silva Lemos%')) AS pe(chave, padrao)
  JOIN public.hospitals h ON h.name = 'Hospital Geral de Nova Iguaçu'
  JOIN public.hospital_users hu ON hu.hospital_id = h.id
  JOIN public.profiles p ON p.user_id = hu.user_id AND p.full_name ILIKE pe.padrao
)
INSERT INTO public.kanban_ccih_tarefas (
  hospital_id, title, description, assigned_to, assigned_to_ids, assigned_by, recurrence, status, priority,
  quando, validador, backup, tipo, alteracao, horario, tempo_alvo, dias_semana, dias_mes, no_plantao,
  setores, versao, ordem, ativo, source)
SELECT m.hospital_id,
       'Coleta mensal da água para análise',
       'Realizar a coleta mensal das amostras de água nos pontos do plano amostral, com o laboratório/empresa responsável; registrar data, pontos coletados e responsável pela coleta, conferir a cadeia de envio e anexar a evidência. Oseas apoia o acesso aos pontos e o contato com a manutenção.',
       m.user_id, ARRAY[m.user_id], l.user_id, 'monthly', 'in_progress', 'high',
       'Mensal (1 vez ao mês)', 'Lucas Lemos', 'Oseas Macedo', 'Ambiental',
       'NOVO (27/10/2026): coleta mensal da água como tarefa própria da Mara Rubia.',
       'Sem bloco fixo', 'Mensal: 1 coleta', NULL, NULL, false,
       '{}'::text[], 'V7.2', 82, true, 'ccih'
FROM u m JOIN u l ON l.chave = 'lucas'
WHERE m.chave = 'mara'
  AND NOT EXISTS (
    SELECT 1 FROM public.kanban_ccih_tarefas t
    WHERE t.hospital_id = m.hospital_id AND t.versao = 'V7.2' AND t.ordem = 82
  );
