
-- =============================================
-- 1. FIX: user_roles privilege escalation
--    Replace self-referential policies with SECURITY DEFINER function
-- =============================================

-- Create a SECURITY DEFINER function that safely checks super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Drop the self-referential policies
DROP POLICY IF EXISTS "Super admins can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Super admins can delete roles" ON public.user_roles;

-- Recreate using SECURITY DEFINER function (no self-reference)
CREATE POLICY "Super admins can insert roles" ON public.user_roles
FOR INSERT TO authenticated
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can update roles" ON public.user_roles
FOR UPDATE TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can delete roles" ON public.user_roles
FOR DELETE TO authenticated
USING (public.is_super_admin(auth.uid()));

-- =============================================
-- 2. FIX: indicadores_records INSERT user_id enforcement
-- =============================================

DROP POLICY IF EXISTS "Hospital members can insert indicadores" ON public.indicadores_records;

CREATE POLICY "Hospital members can insert indicadores" ON public.indicadores_records
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND hospital_id IN (SELECT get_user_hospital_ids(auth.uid()))
);

-- =============================================
-- 3. FIX: Make avatars bucket private
-- =============================================

UPDATE storage.buckets SET public = false WHERE id = 'avatars';

-- Drop any existing public/conflicting policies
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;

-- Authenticated users can view all avatars
CREATE POLICY "Authenticated users can view avatars" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'avatars');

-- Users can only manage files in their own UID folder
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
