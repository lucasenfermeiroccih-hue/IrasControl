
-- Fix ddd_records UPDATE policy
DROP POLICY IF EXISTS "Users can update own ddd_records" ON public.ddd_records;
CREATE POLICY "Users can update own ddd_records"
ON public.ddd_records
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

-- Fix isc_records UPDATE policy
DROP POLICY IF EXISTS "Users can update own isc_records" ON public.isc_records;
CREATE POLICY "Users can update own isc_records"
ON public.isc_records
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

-- Fix indicadores_records UPDATE policy
DROP POLICY IF EXISTS "Users can update own indicadores" ON public.indicadores_records;
CREATE POLICY "Users can update own indicadores"
ON public.indicadores_records
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

-- Fix hygiene_consumption_records UPDATE policy
DROP POLICY IF EXISTS "Users can update own hygiene consumption" ON public.hygiene_consumption_records;
CREATE POLICY "Users can update own hygiene consumption"
ON public.hygiene_consumption_records
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid() AND hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));
