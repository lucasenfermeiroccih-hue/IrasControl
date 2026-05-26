-- Adiciona políticas DELETE ausentes para membros do hospital.
-- Sem estas políticas, o Supabase retorna sucesso silencioso no cliente
-- mas não remove nenhuma linha (RLS bloqueia sem lançar erro).

CREATE POLICY "Hospital members can delete infection cases"
ON public.infection_cases
FOR DELETE
TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can delete case notes"
ON public.case_notes
FOR DELETE
TO authenticated
USING (case_id IN (
  SELECT id FROM public.infection_cases
  WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
));

CREATE POLICY "Hospital members can delete lab results"
ON public.lab_results
FOR DELETE
TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can delete precautions"
ON public.precautions
FOR DELETE
TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can delete antimicrobial prescriptions"
ON public.antimicrobial_prescriptions
FOR DELETE
TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));
