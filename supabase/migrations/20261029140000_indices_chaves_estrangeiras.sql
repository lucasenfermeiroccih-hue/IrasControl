-- =====================================================================
-- Desempenho do banco (advisor do Supabase) — 29/10/2026.
--
-- 1) Índices para as 127 chaves estrangeiras sem índice: acelera filtros e
--    junções por hospital, usuário, produto etc. e evita varredura completa
--    da tabela filha ao apagar/alterar o registro pai.
-- 2) Remove 2 índices duplicados do Kanban (mesma coluna, mesma definição).
--
-- Só cria/remove índices: nenhum dado é alterado. Pode ser executada de novo.
-- =====================================================================

-- 2) Duplicados: ficam idx_kanban_tarefas_assigned_to e idx_kanban_tarefas_hospital_id
DROP INDEX IF EXISTS public.kanban_ccih_tarefas_assigned_idx;
DROP INDEX IF EXISTS public.kanban_ccih_tarefas_hospital_idx;

-- 1) Chaves estrangeiras
CREATE INDEX IF NOT EXISTS idx_action_tasks_plan_id ON ccih.action_tasks (plan_id);
CREATE INDEX IF NOT EXISTS idx_action_tasks_responsible_id ON ccih.action_tasks (responsible_id);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_created_by ON ccih.kanban_boards (created_by);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_hospital_id ON ccih.kanban_boards (hospital_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_comments_card_id ON ccih.kanban_card_comments (card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_comments_user_id ON ccih.kanban_card_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_history_card_id ON ccih.kanban_card_history (card_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_history_moved_by ON ccih.kanban_card_history (moved_by);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_assigned_to ON ccih.kanban_cards (assigned_to);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_board_id ON ccih.kanban_cards (board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_column_id ON ccih.kanban_cards (column_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_created_by ON ccih.kanban_cards (created_by);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_hospital_id ON ccih.kanban_cards (hospital_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_linked_plan_id ON ccih.kanban_cards (linked_plan_id);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_board_id ON ccih.kanban_columns (board_id);
CREATE INDEX IF NOT EXISTS idx_plan_comments_plan_id ON ccih.plan_comments (plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_comments_user_id ON ccih.plan_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_action_plan_tasks_responsible_id ON public.action_plan_tasks (responsible_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_5w2h_created_by ON public.action_plans_5w2h (created_by);
CREATE INDEX IF NOT EXISTS idx_action_plans_5w2h_linked_kanban_card_id ON public.action_plans_5w2h (linked_kanban_card_id);
CREATE INDEX IF NOT EXISTS idx_actions_hospital_id ON public.actions (hospital_id);
CREATE INDEX IF NOT EXISTS idx_actions_user_id ON public.actions (user_id);
CREATE INDEX IF NOT EXISTS idx_agent_chat_sessions_hospital_id ON public.agent_chat_sessions (hospital_id);
CREATE INDEX IF NOT EXISTS idx_alerts_related_case_id ON public.alerts (related_case_id);
CREATE INDEX IF NOT EXISTS idx_alerts_related_patient_id ON public.alerts (related_patient_id);
CREATE INDEX IF NOT EXISTS idx_ccih_kanban_columns_user_id ON public.ccih_kanban_columns (user_id);
CREATE INDEX IF NOT EXISTS idx_ccih_kanban_tasks_column_id ON public.ccih_kanban_tasks (column_id);
CREATE INDEX IF NOT EXISTS idx_ccih_kanban_tasks_user_id ON public.ccih_kanban_tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_crm_contacts_hospital_id ON public.crm_contacts (hospital_id);
CREATE INDEX IF NOT EXISTS idx_form_templates_hospital_id ON public.form_templates (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_logos_hospital_id ON public.hospital_logos (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hospital_tool_installations_tool_id ON public.hospital_tool_installations (tool_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_abc_classifications_hospital_id ON public.hygiene_abc_classifications (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_abc_classifications_product_id ON public.hygiene_abc_classifications (product_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_audit_event_items_event_id ON public.hygiene_audit_event_items (event_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_audit_event_items_template_item_id ON public.hygiene_audit_event_items (template_item_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_audit_events_created_by ON public.hygiene_audit_events (created_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_audit_events_hospital_id ON public.hygiene_audit_events (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_audit_events_template_id ON public.hygiene_audit_events (template_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_audit_template_items_template_id ON public.hygiene_audit_template_items (template_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_audit_templates_hospital_id ON public.hygiene_audit_templates (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_cleaning_executions_created_by ON public.hygiene_cleaning_executions (created_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_cleaning_executions_hospital_id ON public.hygiene_cleaning_executions (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_cleaning_executions_schedule_id ON public.hygiene_cleaning_executions (schedule_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_cleaning_schedules_hospital_id ON public.hygiene_cleaning_schedules (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_consumption_records_hospital_id ON public.hygiene_consumption_records (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_environmental_equipment_hospital_id ON public.hygiene_environmental_equipment (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_monthly_consumption_product_id ON public.hygiene_monthly_consumption (product_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_monthly_order_items_approver_id ON public.hygiene_monthly_order_items (approver_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_monthly_order_items_order_id ON public.hygiene_monthly_order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_monthly_order_items_product_id ON public.hygiene_monthly_order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_monthly_orders_approved_by ON public.hygiene_monthly_orders (approved_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_monthly_orders_hospital_id ON public.hygiene_monthly_orders (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_monthly_orders_submitted_by ON public.hygiene_monthly_orders (submitted_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_nonconformities_created_by ON public.hygiene_nonconformities (created_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_nonconformities_hospital_id ON public.hygiene_nonconformities (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_notifications_hospital_id ON public.hygiene_notifications (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_notifications_product_id ON public.hygiene_notifications (product_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_pdf_import_items_job_id ON public.hygiene_pdf_import_items (job_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_pdf_import_items_product_id ON public.hygiene_pdf_import_items (product_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_pdf_import_jobs_approved_by ON public.hygiene_pdf_import_jobs (approved_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_pdf_import_jobs_created_by ON public.hygiene_pdf_import_jobs (created_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_pdf_import_jobs_hospital_id ON public.hygiene_pdf_import_jobs (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_product_categories_hospital_id ON public.hygiene_product_categories (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_products_main_supplier_id ON public.hygiene_products (main_supplier_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_resupply_snapshots_hospital_id ON public.hygiene_resupply_snapshots (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_resupply_snapshots_product_id ON public.hygiene_resupply_snapshots (product_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_sector_request_items_product_id ON public.hygiene_sector_request_items (product_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_sector_request_items_request_id ON public.hygiene_sector_request_items (request_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_sector_requests_created_by ON public.hygiene_sector_requests (created_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_sector_requests_hospital_id ON public.hygiene_sector_requests (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_adjustments_hospital_id ON public.hygiene_stock_adjustments (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_adjustments_product_id ON public.hygiene_stock_adjustments (product_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_adjustments_responsible_id ON public.hygiene_stock_adjustments (responsible_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_entries_approved_by ON public.hygiene_stock_entries (approved_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_entries_created_by ON public.hygiene_stock_entries (created_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_entries_hospital_id ON public.hygiene_stock_entries (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_entries_supplier_id ON public.hygiene_stock_entries (supplier_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_entry_items_entry_id ON public.hygiene_stock_entry_items (entry_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_entry_items_location_id ON public.hygiene_stock_entry_items (location_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_entry_items_product_id ON public.hygiene_stock_entry_items (product_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_locations_hospital_id ON public.hygiene_stock_locations (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_movements_created_by ON public.hygiene_stock_movements (created_by);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_movements_hospital_id ON public.hygiene_stock_movements (hospital_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_stock_movements_product_id ON public.hygiene_stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_hygiene_suppliers_hospital_id ON public.hygiene_suppliers (hospital_id);
CREATE INDEX IF NOT EXISTS idx_kanban_boards_created_by ON public.kanban_boards (created_by);
CREATE INDEX IF NOT EXISTS idx_kanban_card_comments_user_id ON public.kanban_card_comments (user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_card_history_moved_by ON public.kanban_card_history (moved_by);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_linked_5w2h_id ON public.kanban_cards (linked_5w2h_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_created_by ON public.kanban_cards (created_by);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_hospital_id ON public.kanban_cards (hospital_id);
CREATE INDEX IF NOT EXISTS idx_kanban_ccih_tarefas_assigned_by ON public.kanban_ccih_tarefas (assigned_by);
CREATE INDEX IF NOT EXISTS idx_kanban_columns_user_id ON public.kanban_columns (user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_task_assignees_user_id ON public.kanban_task_assignees (user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_assigned_by ON public.kanban_tasks (assigned_by);
CREATE INDEX IF NOT EXISTS idx_kanban_tasks_user_id ON public.kanban_tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_maternidade_action_plans_hospital_id ON public.maternidade_action_plans (hospital_id);
CREATE INDEX IF NOT EXISTS idx_maternidade_busca_ativa_hospital_id ON public.maternidade_busca_ativa (hospital_id);
CREATE INDEX IF NOT EXISTS idx_maternidade_casos_hospital_id ON public.maternidade_casos (hospital_id);
CREATE INDEX IF NOT EXISTS idx_maternidade_educacao_hospital_id ON public.maternidade_educacao (hospital_id);
CREATE INDEX IF NOT EXISTS idx_maternidade_partos_hospital_id ON public.maternidade_partos (hospital_id);
CREATE INDEX IF NOT EXISTS idx_maternidade_records_hospital_id ON public.maternidade_records (hospital_id);
CREATE INDEX IF NOT EXISTS idx_maternity_action_plans_monthly_record_id ON public.maternity_action_plans (monthly_record_id);
CREATE INDEX IF NOT EXISTS idx_meeting_decisions_meeting_id ON public.meeting_decisions (meeting_id);
CREATE INDEX IF NOT EXISTS idx_notification_attachments_hospital_id ON public.notification_attachments (hospital_id);
CREATE INDEX IF NOT EXISTS idx_notification_attachments_uploaded_by ON public.notification_attachments (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_notification_history_changed_by ON public.notification_history (changed_by);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_protocol_ai_questions_hospital_id ON public.protocol_ai_questions (hospital_id);
CREATE INDEX IF NOT EXISTS idx_protocol_ai_questions_user_id ON public.protocol_ai_questions (user_id);
CREATE INDEX IF NOT EXISTS idx_protocol_documents_category_id ON public.protocol_documents (category_id);
CREATE INDEX IF NOT EXISTS idx_protocol_documents_uploaded_by ON public.protocol_documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_key ON public.role_permissions (permission_key);
CREATE INDEX IF NOT EXISTS idx_scih_action_plans_nc_id ON public.scih_action_plans (nc_id);
CREATE INDEX IF NOT EXISTS idx_scih_iras_indicators_hospital_id ON public.scih_iras_indicators (hospital_id);
CREATE INDEX IF NOT EXISTS idx_scih_nc_history_changed_by ON public.scih_nc_history (changed_by);
CREATE INDEX IF NOT EXISTS idx_scih_nc_history_nc_id ON public.scih_nc_history (nc_id);
CREATE INDEX IF NOT EXISTS idx_scih_ncs_audit_id ON public.scih_ncs (audit_id);
CREATE INDEX IF NOT EXISTS idx_scih_risk_items_hospital_id ON public.scih_risk_items (hospital_id);
CREATE INDEX IF NOT EXISTS idx_scih_sector_audits_auditor_id ON public.scih_sector_audits (auditor_id);
CREATE INDEX IF NOT EXISTS idx_scih_sector_responses_audit_id ON public.scih_sector_responses (audit_id);
CREATE INDEX IF NOT EXISTS idx_scih_swot_items_hospital_id ON public.scih_swot_items (hospital_id);
CREATE INDEX IF NOT EXISTS idx_user_direct_permissions_granted_by ON public.user_direct_permissions (granted_by);
CREATE INDEX IF NOT EXISTS idx_user_direct_permissions_hospital_id ON public.user_direct_permissions (hospital_id);
CREATE INDEX IF NOT EXISTS idx_user_direct_permissions_permission_key ON public.user_direct_permissions (permission_key);
CREATE INDEX IF NOT EXISTS idx_user_hospital_roles_role_id ON public.user_hospital_roles (role_id);
