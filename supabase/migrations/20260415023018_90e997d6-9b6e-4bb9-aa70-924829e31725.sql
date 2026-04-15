
-- Add 'precaution' to audit_type enum
ALTER TYPE public.audit_type ADD VALUE IF NOT EXISTS 'precaution';

-- Add 'hand_hygiene_consumption' to audit_type enum
ALTER TYPE public.audit_type ADD VALUE IF NOT EXISTS 'hand_hygiene_consumption';

-- Create hygiene consumption records table
CREATE TABLE public.hygiene_consumption_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  setor TEXT NOT NULL,
  mes TEXT NOT NULL,
  ano TEXT NOT NULL,
  responsavel TEXT NOT NULL DEFAULT '',
  total_formularios INTEGER NOT NULL DEFAULT 0,
  instancias_com_higienizacao INTEGER NOT NULL DEFAULT 0,
  instancias_sem_higienizacao INTEGER NOT NULL DEFAULT 0,
  consumo_alcool_ml NUMERIC NOT NULL DEFAULT 0,
  consumo_sabonete_ml NUMERIC NOT NULL DEFAULT 0,
  paciente_dia INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hygiene_consumption_records ENABLE ROW LEVEL SECURITY;

-- RLS policies for hygiene_consumption_records
CREATE POLICY "Hospital members can view hygiene consumption"
ON public.hygiene_consumption_records FOR SELECT
TO authenticated
USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can insert hygiene consumption"
ON public.hygiene_consumption_records FOR INSERT
TO authenticated
WITH CHECK (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Users can update own hygiene consumption"
ON public.hygiene_consumption_records FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own hygiene consumption"
ON public.hygiene_consumption_records FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Super admins full access on hygiene_consumption_records"
ON public.hygiene_consumption_records FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_hygiene_consumption_updated_at
BEFORE UPDATE ON public.hygiene_consumption_records
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add DELETE policy for lab_results (needed for the delete feature on /reports)
CREATE POLICY "Hospital members can delete lab results"
ON public.lab_results FOR DELETE
TO authenticated
USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));
