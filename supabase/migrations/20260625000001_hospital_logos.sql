-- Tabela de logos dos hospitais (logo institucional + logos da SCIH)
CREATE TABLE public.hospital_logos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE CASCADE NOT NULL,
  logo_type text NOT NULL CHECK (logo_type IN ('hospital', 'scih')),
  storage_path text NOT NULL,
  display_name text,
  display_order integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.hospital_logos ENABLE ROW LEVEL SECURITY;

-- Visualização: usuários vinculados ao hospital
CREATE POLICY "hospital_logos_select"
ON public.hospital_logos FOR SELECT TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

-- Inserção/Atualização/Exclusão: apenas admins do hospital
CREATE POLICY "hospital_logos_insert"
ON public.hospital_logos FOR INSERT TO authenticated
WITH CHECK (
  hospital_id IN (
    SELECT hu.hospital_id FROM public.hospital_users hu
    WHERE hu.user_id = auth.uid() AND hu.is_primary_admin = true
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'hospital_admin')
  )
);

CREATE POLICY "hospital_logos_update"
ON public.hospital_logos FOR UPDATE TO authenticated
USING (
  hospital_id IN (
    SELECT hu.hospital_id FROM public.hospital_users hu
    WHERE hu.user_id = auth.uid() AND hu.is_primary_admin = true
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'hospital_admin')
  )
);

CREATE POLICY "hospital_logos_delete"
ON public.hospital_logos FOR DELETE TO authenticated
USING (
  hospital_id IN (
    SELECT hu.hospital_id FROM public.hospital_users hu
    WHERE hu.user_id = auth.uid() AND hu.is_primary_admin = true
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'hospital_admin')
  )
);

-- Bucket público para logos (leitura livre, escrita restrita)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'hospital-logos',
  'hospital-logos',
  true,
  2097152, -- 2 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas do bucket
DROP POLICY IF EXISTS "hospital_logos_storage_select" ON storage.objects;
CREATE POLICY "hospital_logos_storage_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'hospital-logos');

DROP POLICY IF EXISTS "hospital_logos_storage_insert" ON storage.objects;
CREATE POLICY "hospital_logos_storage_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'hospital-logos'
  AND (
    (storage.foldername(name))[1]::uuid IN (
      SELECT hu.hospital_id FROM public.hospital_users hu
      WHERE hu.user_id = auth.uid() AND hu.is_primary_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'hospital_admin')
    )
  )
);

DROP POLICY IF EXISTS "hospital_logos_storage_delete" ON storage.objects;
CREATE POLICY "hospital_logos_storage_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'hospital-logos'
  AND (
    (storage.foldername(name))[1]::uuid IN (
      SELECT hu.hospital_id FROM public.hospital_users hu
      WHERE hu.user_id = auth.uid() AND hu.is_primary_admin = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role IN ('super_admin', 'hospital_admin')
    )
  )
);
