-- Adiciona o tipo de auditoria "Verificação de Obras/Reformas" ao enum audit_type.
-- Usado pela página /audits/construction/new e pelo dashboard /dashboard/construction.
ALTER TYPE public.audit_type ADD VALUE IF NOT EXISTS 'construction_renovation';
