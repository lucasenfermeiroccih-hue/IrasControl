
-- Add clinical columns to patients table
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS origin text,
  ADD COLUMN IF NOT EXISTS icu_admission_date date,
  ADD COLUMN IF NOT EXISTS base_diseases text,
  ADD COLUMN IF NOT EXISTS admission_reason text,
  ADD COLUMN IF NOT EXISTS specialty text,
  ADD COLUMN IF NOT EXISTS diagnosis text,
  ADD COLUMN IF NOT EXISTS discharge_type text,
  ADD COLUMN IF NOT EXISTS clinical_data jsonb DEFAULT '{}'::jsonb;
