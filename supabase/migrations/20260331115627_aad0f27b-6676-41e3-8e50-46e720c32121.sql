
-- FIX: Hospital contact details (email, phone) readable by any authenticated user
-- Restrict hospital SELECT to admins only, and create a safe view for regular members

-- 1. Drop the overly permissive policy
DROP POLICY IF EXISTS "Hospital admins can view own hospital" ON public.hospitals;

-- 2. Create strict policy: only hospital_admin or super_admin can SELECT hospitals directly
CREATE POLICY "Hospital admins can view own hospital"
ON public.hospitals
FOR SELECT
TO authenticated
USING (
  id IN (SELECT public.get_user_hospital_ids(auth.uid()))
  AND public.has_role(auth.uid(), 'hospital_admin'::app_role)
);

-- 3. Create a safe view for regular hospital members (no contact fields)
CREATE OR REPLACE VIEW public.hospitals_summary
WITH (security_invoker = true)
AS
SELECT id, name, type, city, state, bed_count, status, created_at
FROM public.hospitals;

-- 4. Policy for regular members to see basic hospital info (without contact details)
CREATE POLICY "Hospital members can view basic hospital info"
ON public.hospitals
FOR SELECT
TO authenticated
USING (
  id IN (SELECT public.get_user_hospital_ids(auth.uid()))
);

-- Wait — this would still expose contact fields. The only real column-level
-- approach is via the view. Let me remove the broad policy and keep only admin access
-- on the base table. Regular members use the view.

DROP POLICY IF EXISTS "Hospital members can view basic hospital info" ON public.hospitals;

-- Grant select on the safe view to authenticated users
GRANT SELECT ON public.hospitals_summary TO authenticated;
