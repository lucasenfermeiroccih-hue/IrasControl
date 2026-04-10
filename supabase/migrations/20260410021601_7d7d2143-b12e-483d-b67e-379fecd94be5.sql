CREATE POLICY "Hospital admins can insert hospitals"
ON public.hospitals
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'hospital_admin'::app_role));