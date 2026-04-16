DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars' AND auth.role() = 'anon' OR bucket_id = 'avatars' AND auth.role() = 'authenticated');