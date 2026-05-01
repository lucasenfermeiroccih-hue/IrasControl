CREATE POLICY "Hospital members can delete patients"
ON public.patients
FOR DELETE
TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));