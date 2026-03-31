
-- Create a security definer function to get hospital_ids for a user (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_user_hospital_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT hospital_id FROM public.hospital_users WHERE user_id = _user_id
$$;

-- Drop the recursive policy on hospital_users
DROP POLICY IF EXISTS "Hospital admins can view hospital members" ON public.hospital_users;

-- Create a non-recursive replacement: hospital admins can view members of their hospitals
CREATE POLICY "Hospital admins can view hospital members"
ON public.hospital_users
FOR SELECT
TO authenticated
USING (
  hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
  AND public.has_role(auth.uid(), 'hospital_admin'::app_role)
);

-- Fix profiles policies that join hospital_users (causes recursion)
DROP POLICY IF EXISTS "Hospital admins can view hospital user profiles" ON public.profiles;
CREATE POLICY "Hospital admins can view hospital user profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'hospital_admin'::app_role)
  AND user_id IN (
    SELECT hu.user_id FROM public.hospital_users hu
    WHERE hu.hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
  )
);

DROP POLICY IF EXISTS "Hospital admins can update hospital user profiles" ON public.profiles;
CREATE POLICY "Hospital admins can update hospital user profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'hospital_admin'::app_role)
  AND user_id IN (
    SELECT hu.user_id FROM public.hospital_users hu
    WHERE hu.hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'hospital_admin'::app_role)
  AND user_id IN (
    SELECT hu.user_id FROM public.hospital_users hu
    WHERE hu.hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
  )
);

-- Fix user_roles policy that joins hospital_users
DROP POLICY IF EXISTS "Hospital admins can view hospital user roles" ON public.user_roles;
CREATE POLICY "Hospital admins can view hospital user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'hospital_admin'::app_role)
  AND user_id IN (
    SELECT hu.user_id FROM public.hospital_users hu
    WHERE hu.hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))
  )
);

-- Fix hospitals policy that references hospital_users
DROP POLICY IF EXISTS "Hospital admins can view own hospital" ON public.hospitals;
CREATE POLICY "Hospital admins can view own hospital"
ON public.hospitals
FOR SELECT
TO authenticated
USING (
  id IN (SELECT public.get_user_hospital_ids(auth.uid()))
);
