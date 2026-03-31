
-- Hospital admins can update profiles of users in their hospital
CREATE POLICY "Hospital admins can update hospital user profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hospital_users hu1
    JOIN public.hospital_users hu2 ON hu1.hospital_id = hu2.hospital_id
    WHERE hu1.user_id = auth.uid()
      AND hu2.user_id = profiles.user_id
      AND public.has_role(auth.uid(), 'hospital_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.hospital_users hu1
    JOIN public.hospital_users hu2 ON hu1.hospital_id = hu2.hospital_id
    WHERE hu1.user_id = auth.uid()
      AND hu2.user_id = profiles.user_id
      AND public.has_role(auth.uid(), 'hospital_admin')
  )
);
