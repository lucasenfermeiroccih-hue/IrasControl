-- Tabela de anexos de notificações ANVISA/PLACON
CREATE TABLE IF NOT EXISTS notification_attachments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_id uuid NOT NULL,
  hospital_id uuid NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_size bigint,
  file_type text,
  description text,
  uploaded_at timestamptz DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);

ALTER TABLE notification_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital members can manage notification attachments"
ON notification_attachments
FOR ALL
USING (
  hospital_id IN (
    SELECT hospital_id FROM hospital_users WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  hospital_id IN (
    SELECT hospital_id FROM hospital_users WHERE user_id = auth.uid()
  )
);

-- Bucket privado para arquivos enviados à ANVISA
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notification-attachments',
  'notification-attachments',
  false,
  52428800,
  ARRAY['application/pdf','image/jpeg','image/png','image/webp','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword']
)
ON CONFLICT (id) DO NOTHING;

-- RLS no storage: leitura/escrita apenas para membros do hospital
CREATE POLICY "Hospital members can upload notification attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'notification-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT hospital_id::text FROM hospital_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Hospital members can read notification attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'notification-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT hospital_id::text FROM hospital_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Hospital members can delete notification attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'notification-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT hospital_id::text FROM hospital_users WHERE user_id = auth.uid()
  )
);
