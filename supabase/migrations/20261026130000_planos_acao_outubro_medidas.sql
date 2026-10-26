-- =====================================================================
-- Planos de ação das auditorias — medidas corretivas de OUTUBRO/2026 (HGNI)
--
-- Aprovado pela CCIH em 26/10/2026. Para cada plano gerado automaticamente por
-- auditoria de outubro (status "rascunho"), grava:
--   how  ("Como")  = medidas corretivas dos itens não conformes da auditoria
--   who  ("Quem")  = CCIH
--   status         = ativo
-- Itens sem medida específica no catálogo recebem a medida geral (reorientar e
-- reauditar em até 30 dias). Prazo (when_date) mantido: 30 dias após a auditoria.
-- Estado anterior de cada plano em public.correcoes_qualidade_dado, lote
-- 'planos_outubro_hgni_2026-10-26'. Só altera planos ainda em rascunho
-- (pode ser executado de novo sem efeito).
-- =====================================================================

WITH catalogo(ordem, chave, medida) AS (VALUES
  (1,  'maos',      'Higiene das mãos: feedback imediato ao profissional auditado; reorientação in loco dos 5 momentos (OMS); conferir preparação alcoólica em cada ponto de assistência; treinamento semanal no setor.'),
  (2,  'sangue',    'Sangue em equipos/conexões: troca imediata do equipo ou conexão; flush com SF 0,9% após coleta e administração; reforço do protocolo de manutenção de cateter.'),
  (3,  'distancia', 'Distância entre leitos: readequar para no mínimo 1 m entre leitos e sinalizar no piso; comunicar a gestão do setor em caso de superlotação.'),
  (4,  'precaucao', 'Precaução: kit de precaução completo (luvas para familiares, placa no leito, prontuário identificado) na abertura da precaução; checklist diário do enfermeiro do setor.'),
  (5,  'condensado','Circuito do respirador: drenar o condensado sem abrir o circuito para o paciente; manter o circuito abaixo do nível do paciente; orientar enfermagem e fisioterapia.'),
  (6,  'curativo',  'Curativo: refazer e datar o curativo; reforçar o protocolo (gaze 48 h, filme transparente até 7 dias).'),
  (7,  'limpeza',   'Limpeza concorrente: acionar a higienização; checklist de limpeza concorrente do leito e equipamentos por turno, com álcool 70%.'),
  (8,  'oral',      'Higiene oral: prescrever e checar clorexidina 0,12% de 12/12 h em pacientes em VM; garantir o kit no setor.'),
  (9,  'pulseira',  'Pulseiras: colocar pulseira de identificação e de risco de queda na admissão; conferir na passagem de plantão.'),
  (10, 'conexoes',  'Conexões e equipos: desinfetar o hub com álcool 70% por 5 a 15 s antes do manuseio; manter conexões tampadas; datar e trocar equipos e dispositivos ventilatórios conforme o protocolo.'),
  (11, 'bolsa',     'Bolsa coletora: manter abaixo da bexiga, sem tocar o chão; esvaziar ao atingir 2/3.'),
  (99, 'geral',     'Demais itens não conformes: reorientar a equipe do setor nos itens da auditoria e reauditar em até 30 dias.')
),
planos AS (
  SELECT ap.id AS plan_id, a.id AS audit_id, a.audit_type::text AS tipo
  FROM ccih.action_plans ap
  JOIN public.audits a ON a.id = ap.source_audit_id
  JOIN public.hospitals h ON h.id = ap.hospital_id
  WHERE h.name = 'Hospital Geral de Nova Iguaçu'
    AND a.audit_date >= DATE '2026-10-01' AND a.audit_date < DATE '2026-11-01'
    AND ap.status = 'rascunho'
),
itens AS (
  SELECT p.plan_id,
         CASE
           WHEN p.tipo = 'hand_hygiene' OR i.question ILIKE 'Momento:%' OR i.question ILIKE 'Técnica:%' THEN 'maos'
           WHEN i.question ILIKE '%sangue nos equipos%' THEN 'sangue'
           WHEN i.question ILIKE '%distância correta entre os leitos%' THEN 'distancia'
           WHEN i.question ILIKE '%luvas disponibilizadas%' OR i.question ILIKE '%placa de precaução%' OR i.question ILIKE '%prontuário identificado%' THEN 'precaucao'
           WHEN i.question ILIKE '%condensado%' THEN 'condensado'
           WHEN i.question ILIKE '%curativo%' THEN 'curativo'
           WHEN i.question ILIKE '%limpeza concorrente%' THEN 'limpeza'
           WHEN i.question ILIKE '%higiene oral%' THEN 'oral'
           WHEN i.question ILIKE '%pulseira%' THEN 'pulseira'
           WHEN i.question ILIKE '%conex%' OR i.question ILIKE '%equipos e extensores%' OR i.question ILIKE '%dispositivos ventilatórios%' THEN 'conexoes'
           WHEN i.question ILIKE '%bolsa abaixo do nível%' THEN 'bolsa'
           ELSE 'geral'
         END AS chave
  FROM planos p
  JOIN public.audit_items i ON i.audit_id = p.audit_id AND i.status = 'non_compliant'
),
medidas AS (
  SELECT p.plan_id,
         'Medidas corretivas:' || chr(10) || string_agg('• ' || c.medida, chr(10) ORDER BY c.ordem) AS how
  FROM planos p
  JOIN (SELECT DISTINCT plan_id, chave FROM itens
        UNION
        SELECT plan_id, 'geral' FROM planos WHERE plan_id NOT IN (SELECT plan_id FROM itens)) k ON k.plan_id = p.plan_id
  JOIN catalogo c ON c.chave = k.chave
  GROUP BY p.plan_id
),
registro AS (
  INSERT INTO public.correcoes_qualidade_dado (lote, tabela, registro_id, acao, motivo, estado_anterior, estado_novo, executado_por)
  SELECT 'planos_outubro_hgni_2026-10-26', 'ccih.action_plans', ap.id, 'atualizado',
         'Medidas corretivas das não conformidades de outubro (aprovadas pela CCIH)',
         jsonb_build_object('how', ap.how, 'who', ap.who, 'status', ap.status),
         jsonb_build_object('how', m.how, 'who', 'CCIH', 'status', 'ativo'),
         'claude_code (aprovado pelo usuário)'
  FROM ccih.action_plans ap JOIN medidas m ON m.plan_id = ap.id
  RETURNING 1
)
UPDATE ccih.action_plans ap
SET how = m.how, who = 'CCIH', status = 'ativo'
FROM medidas m
WHERE ap.id = m.plan_id AND (SELECT count(*) FROM registro) >= 0;
