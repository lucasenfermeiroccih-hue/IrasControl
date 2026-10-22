-- Reuniões e Atas: link da gravação da reunião (Google Drive).
-- O link da sala online (Google Meet) já usa a coluna existente online_link.
ALTER TABLE public.meetings ADD COLUMN IF NOT EXISTS recording_url text;
