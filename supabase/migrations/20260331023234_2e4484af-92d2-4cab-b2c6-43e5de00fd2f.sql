
-- Public function to check if initial setup has been done (any super_admin exists)
CREATE OR REPLACE FUNCTION public.has_any_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE role = 'super_admin'
  )
$$;
