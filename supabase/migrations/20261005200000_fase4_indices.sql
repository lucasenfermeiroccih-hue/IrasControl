-- =====================================================================
-- Ajuste do banco — FASE 4: índices
--
-- ccih.action_plans (~5 mil linhas) tinha 5 chaves estrangeiras sem índice e
-- era lida sempre por varredura completa (4.635 varreduras, 12,9 milhões de
-- linhas lidas, nenhuma leitura por índice). Principais causas:
--   * gatilhos ccih_create_plan_from_audit / ccih_create_plan_from_infection_case:
--     a cada auditoria com conformidade < 85% (ou caso confirmado) verificam
--     "já existe plano para esta auditoria/caso?" varrendo a tabela inteira;
--   * ao excluir auditoria/caso (ON DELETE SET NULL) e hospital (CASCADE);
--   * regras de acesso por hospital_id e created_by.
-- Com os índices, a verificação do gatilho lê 2 páginas em vez de ~200.
--
-- As demais chaves estrangeiras sem índice apontadas pelo Supabase ficam como
-- estão: todas em tabelas de 16–80 kB, onde a varredura completa já é
-- instantânea e um índice só acrescentaria custo de escrita.
--
-- PENDENTE (não aplicado — o comando DROP exige confirmação manual):
-- índices duplicados em kanban_ccih_tarefas; remover as cópias nunca usadas
-- (0 leituras), mantendo kanban_ccih_tarefas_assigned_idx / _hospital_idx:
--   DROP INDEX IF EXISTS public.idx_kanban_tarefas_assigned_to;
--   DROP INDEX IF EXISTS public.idx_kanban_tarefas_hospital_id;
-- =====================================================================

SET LOCAL lock_timeout = '5s';

CREATE INDEX IF NOT EXISTS action_plans_hospital_id_idx
  ON ccih.action_plans (hospital_id);
CREATE INDEX IF NOT EXISTS action_plans_source_audit_id_idx
  ON ccih.action_plans (source_audit_id) WHERE source_audit_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS action_plans_source_infection_case_id_idx
  ON ccih.action_plans (source_infection_case_id) WHERE source_infection_case_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS action_plans_responsible_id_idx
  ON ccih.action_plans (responsible_id) WHERE responsible_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS action_plans_created_by_idx
  ON ccih.action_plans (created_by) WHERE created_by IS NOT NULL;

ANALYZE ccih.action_plans;
