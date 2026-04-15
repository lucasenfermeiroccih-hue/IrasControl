-- Fix avatars storage: restrict SELECT to own files only
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;

-- Only allow users to view their own avatar folder
CREATE POLICY "Users can view own avatars"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users within the same hospital to view each other's avatars
CREATE POLICY "Hospital members can view avatars"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] IN (
    SELECT hu2.user_id::text
    FROM hospital_users hu1
    JOIN hospital_users hu2 ON hu1.hospital_id = hu2.hospital_id
    WHERE hu1.user_id = auth.uid()
  )
);