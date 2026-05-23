-- Add source column to patients to distinguish patients registered only
-- through the precaution map from system patients.
-- 'system' = registered via normal patient flow (visible everywhere)
-- 'precaution_map' = registered only via precaution map (isolated to that page)

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'system';
