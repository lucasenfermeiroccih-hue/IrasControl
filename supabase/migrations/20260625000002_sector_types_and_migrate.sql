-- ─────────────────────────────────────────────────────────────────────────────
-- sector_types: tipos de setor dinâmicos por hospital
-- + migração automática dos setores já existentes nos dados históricos
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Tabela de tipos de setor por hospital
CREATE TABLE IF NOT EXISTS public.sector_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  value text NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, value)
);

ALTER TABLE public.sector_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sector_types_select"
ON public.sector_types FOR SELECT TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_users
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "sector_types_all_admin"
ON public.sector_types FOR ALL TO authenticated
USING (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_users
    WHERE user_id = auth.uid() AND is_active = true
      AND (is_primary_admin = true OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('hospital_admin', 'super_admin')
      ))
  )
)
WITH CHECK (
  hospital_id IN (
    SELECT hospital_id FROM public.hospital_users
    WHERE user_id = auth.uid() AND is_active = true
      AND (is_primary_admin = true OR EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
          AND role IN ('hospital_admin', 'super_admin')
      ))
  )
);

CREATE INDEX IF NOT EXISTS idx_sector_types_hospital ON public.sector_types(hospital_id);

-- 2. Seed dos tipos padrão para todos os hospitais existentes
INSERT INTO public.sector_types (hospital_id, value, label)
SELECT h.id, t.value, t.label
FROM public.hospitals h
CROSS JOIN (VALUES
  ('uti',           'UTI'),
  ('enfermaria',    'Enfermaria'),
  ('cc',            'Centro Cirúrgico'),
  ('pronto_socorro','Pronto Socorro'),
  ('ambulatorio',   'Ambulatório'),
  ('laboratorio',   'Laboratório'),
  ('pediatria',     'Pediatria'),
  ('neonatal',      'UTI Neonatal'),
  ('cme',           'CME'),
  ('outros',        'Outros')
) AS t(value, label)
ON CONFLICT (hospital_id, value) DO NOTHING;

-- 3. Migrar setores já usados nas auditorias para a tabela sectors
INSERT INTO public.sectors (hospital_id, name, is_active)
SELECT DISTINCT a.hospital_id, a.sector, true
FROM public.audits a
WHERE a.sector IS NOT NULL AND trim(a.sector) != ''
ON CONFLICT (hospital_id, name) DO NOTHING;

-- 4. Migrar setores já usados nos pacientes para a tabela sectors
INSERT INTO public.sectors (hospital_id, name, is_active)
SELECT DISTINCT p.hospital_id, p.sector, true
FROM public.patients p
WHERE p.sector IS NOT NULL AND trim(p.sector) != ''
ON CONFLICT (hospital_id, name) DO NOTHING;
