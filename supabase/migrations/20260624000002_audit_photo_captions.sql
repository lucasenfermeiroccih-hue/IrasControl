-- Legendas das fotos de auditoria (alinhadas por índice com photo_urls).
-- A ordem das fotos é a ordem dos arrays photo_urls/photo_captions.
ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS photo_captions text[] NOT NULL DEFAULT '{}';
