
-- Hospital admins can view profiles of users in their hospital
CREATE POLICY "Hospital admins can view hospital user profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hospital_users hu1
    JOIN public.hospital_users hu2 ON hu1.hospital_id = hu2.hospital_id
    WHERE hu1.user_id = auth.uid()
      AND hu2.user_id = profiles.user_id
      AND public.has_role(auth.uid(), 'hospital_admin')
  )
);

-- Hospital admins can view roles of users in their hospital
CREATE POLICY "Hospital admins can view hospital user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hospital_users hu1
    JOIN public.hospital_users hu2 ON hu1.hospital_id = hu2.hospital_id
    WHERE hu1.user_id = auth.uid()
      AND hu2.user_id = user_roles.user_id
      AND public.has_role(auth.uid(), 'hospital_admin')
  )
);

-- Hospital admins can view all users in their hospital
CREATE POLICY "Hospital admins can view hospital members"
ON public.hospital_users
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.hospital_users my_hu
    WHERE my_hu.user_id = auth.uid()
      AND my_hu.hospital_id = hospital_users.hospital_id
      AND public.has_role(auth.uid(), 'hospital_admin')
  )
);
