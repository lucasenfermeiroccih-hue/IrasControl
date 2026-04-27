ALTER TABLE public.isc_record_indicators
ADD COLUMN IF NOT EXISTS retorno_ambulatorio integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS retorno_whatsapp integer NOT NULL DEFAULT 0;