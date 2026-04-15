
-- Create form_templates table
CREATE TABLE public.form_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT '',
  campos INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  obrigatorio BOOLEAN NOT NULL DEFAULT false,
  descricao TEXT DEFAULT '',
  preenchimentos INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital members can view form templates"
ON public.form_templates FOR SELECT TO authenticated
USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can insert form templates"
ON public.form_templates FOR INSERT TO authenticated
WITH CHECK (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can update form templates"
ON public.form_templates FOR UPDATE TO authenticated
USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())))
WITH CHECK (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can delete form templates"
ON public.form_templates FOR DELETE TO authenticated
USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Super admins full access on form_templates"
ON public.form_templates FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER update_form_templates_updated_at
BEFORE UPDATE ON public.form_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add DELETE policies for audits and audit_items
CREATE POLICY "Hospital members can delete audits"
ON public.audits FOR DELETE TO authenticated
USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can delete audit items"
ON public.audit_items FOR DELETE TO authenticated
USING (audit_id IN (SELECT id FROM audits WHERE hospital_id IN (SELECT get_user_hospital_ids(auth.uid()))));
