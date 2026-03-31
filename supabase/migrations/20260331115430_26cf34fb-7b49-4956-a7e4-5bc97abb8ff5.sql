
-- =====================================================
-- ESQUEMA COMPLETO: SaaS IRAS (Infecções Hospitalares)
-- =====================================================

-- 1. ENUM TYPES
CREATE TYPE public.patient_status AS ENUM ('active', 'discharged', 'transferred', 'deceased');
CREATE TYPE public.device_type AS ENUM ('cvc', 'svu', 'vm', 'other');
CREATE TYPE public.audit_type AS ENUM ('bundles', 'hand_hygiene', 'infection_control', 'dispenser', 'cti_infrastructure', 'antibiogram');
CREATE TYPE public.audit_item_status AS ENUM ('compliant', 'non_compliant', 'not_applicable', 'not_evaluated');
CREATE TYPE public.case_status AS ENUM ('open', 'investigating', 'confirmed', 'discarded', 'closed');
CREATE TYPE public.alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.alert_status AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');
CREATE TYPE public.lab_result_status AS ENUM ('pending', 'partial', 'completed');

-- 2. PATIENTS (Monitoramento de pacientes)
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  medical_record text, -- prontuário
  birth_date date,
  gender text,
  bed text,
  sector text,
  admission_date date NOT NULL DEFAULT CURRENT_DATE,
  discharge_date date,
  status patient_status NOT NULL DEFAULT 'active',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_hospital ON public.patients(hospital_id);
CREATE INDEX idx_patients_status ON public.patients(status);
CREATE INDEX idx_patients_sector ON public.patients(hospital_id, sector);

-- 3. PATIENT DEVICES (Dispositivos invasivos)
CREATE TABLE public.patient_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  device_type device_type NOT NULL,
  device_name text,
  insertion_date date NOT NULL DEFAULT CURRENT_DATE,
  removal_date date,
  insertion_site text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_patient_devices_patient ON public.patient_devices(patient_id);

-- 4. AUDITS (Auditorias - cabeçalho)
CREATE TABLE public.audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  audit_type audit_type NOT NULL,
  sector text,
  auditor_id uuid,
  audit_date date NOT NULL DEFAULT CURRENT_DATE,
  total_items integer NOT NULL DEFAULT 0,
  compliant_items integer NOT NULL DEFAULT 0,
  compliance_rate numeric(5,2),
  observations text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audits_hospital ON public.audits(hospital_id);
CREATE INDEX idx_audits_type ON public.audits(audit_type);
CREATE INDEX idx_audits_date ON public.audits(hospital_id, audit_date);

-- 5. AUDIT ITEMS (Itens individuais da auditoria)
CREATE TABLE public.audit_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_id uuid NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  item_order integer NOT NULL DEFAULT 0,
  question text NOT NULL,
  category text,
  status audit_item_status NOT NULL DEFAULT 'not_evaluated',
  observation text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_items_audit ON public.audit_items(audit_id);

-- 6. INFECTION CASES (Casos de investigação)
CREATE TABLE public.infection_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  case_number text,
  infection_type text,
  infection_site text,
  device_related boolean DEFAULT false,
  device_type device_type,
  detection_date date NOT NULL DEFAULT CURRENT_DATE,
  confirmation_date date,
  status case_status NOT NULL DEFAULT 'open',
  investigating_user_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_infection_cases_hospital ON public.infection_cases(hospital_id);
CREATE INDEX idx_infection_cases_patient ON public.infection_cases(patient_id);
CREATE INDEX idx_infection_cases_status ON public.infection_cases(status);

-- 7. CASE NOTES (Anotações do caso)
CREATE TABLE public.case_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES public.infection_cases(id) ON DELETE CASCADE,
  author_id uuid,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_case_notes_case ON public.case_notes(case_id);

-- 8. ALERTS (Alertas)
CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  severity alert_severity NOT NULL DEFAULT 'medium',
  status alert_status NOT NULL DEFAULT 'active',
  related_case_id uuid REFERENCES public.infection_cases(id) ON DELETE SET NULL,
  related_patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  triggered_by uuid,
  acknowledged_by uuid,
  resolved_by uuid,
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_alerts_hospital ON public.alerts(hospital_id);
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_severity ON public.alerts(hospital_id, severity);

-- 9. LAB RESULTS (Resultados laboratoriais)
CREATE TABLE public.lab_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  sample_type text, -- sangue, urina, secreção, etc.
  collection_date date NOT NULL DEFAULT CURRENT_DATE,
  result_date date,
  organism text,
  status lab_result_status NOT NULL DEFAULT 'pending',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_lab_results_hospital ON public.lab_results(hospital_id);
CREATE INDEX idx_lab_results_patient ON public.lab_results(patient_id);
CREATE INDEX idx_lab_results_status ON public.lab_results(status);

-- 10. ANTIBIOGRAM (Antibiograma - sensibilidade antimicrobiana)
CREATE TABLE public.antibiogram_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_result_id uuid NOT NULL REFERENCES public.lab_results(id) ON DELETE CASCADE,
  antibiotic text NOT NULL,
  sensitivity text NOT NULL, -- S (sensível), I (intermediário), R (resistente)
  mic_value numeric,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_antibiogram_lab ON public.antibiogram_results(lab_result_id);

-- 11. SECTORS (Setores do hospital - para normalizar)
CREATE TABLE public.sectors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text, -- UTI, enfermaria, CC, etc.
  bed_count integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, name)
);

CREATE INDEX idx_sectors_hospital ON public.sectors(hospital_id);

-- 12. PRECAUTIONS (Precauções de isolamento)
CREATE TABLE public.precautions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  precaution_type text NOT NULL, -- contato, aerossóis, gotículas, padrão
  reason text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_precautions_patient ON public.precautions(patient_id);
CREATE INDEX idx_precautions_active ON public.precautions(is_active) WHERE is_active = true;

-- 13. ANTIMICROBIAL PRESCRIPTIONS (Prescrições antimicrobianas)
CREATE TABLE public.antimicrobial_prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  drug_name text NOT NULL,
  dose text,
  route text, -- IV, VO, IM
  frequency text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  indication text,
  prescriber_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prescriptions_hospital ON public.antimicrobial_prescriptions(hospital_id);
CREATE INDEX idx_prescriptions_patient ON public.antimicrobial_prescriptions(patient_id);
CREATE INDEX idx_prescriptions_active ON public.antimicrobial_prescriptions(is_active) WHERE is_active = true;

-- =====================================================
-- TRIGGERS: updated_at automático
-- =====================================================

CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_patient_devices_updated_at BEFORE UPDATE ON public.patient_devices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audits_updated_at BEFORE UPDATE ON public.audits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_infection_cases_updated_at BEFORE UPDATE ON public.infection_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_alerts_updated_at BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lab_results_updated_at BEFORE UPDATE ON public.lab_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sectors_updated_at BEFORE UPDATE ON public.sectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_precautions_updated_at BEFORE UPDATE ON public.precautions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.antimicrobial_prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Helper: all new tables get RLS enabled automatically via rls_auto_enable trigger,
-- but let's be explicit for clarity

ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.infection_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antibiogram_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.precautions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.antimicrobial_prescriptions ENABLE ROW LEVEL SECURITY;

-- === SUPER ADMIN: full access on all tables ===
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'patients', 'patient_devices', 'audits', 'audit_items',
    'infection_cases', 'case_notes', 'alerts', 'lab_results',
    'antibiogram_results', 'sectors', 'precautions', 'antimicrobial_prescriptions'
  ]) LOOP
    EXECUTE format(
      'CREATE POLICY "Super admins full access on %1$s" ON public.%1$s FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''super_admin''::app_role)) WITH CHECK (public.has_role(auth.uid(), ''super_admin''::app_role))',
      tbl
    );
  END LOOP;
END$$;

-- === HOSPITAL MEMBERS: can view/manage data from their hospital ===

-- Patients
CREATE POLICY "Hospital members can view patients"
ON public.patients FOR SELECT TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can insert patients"
ON public.patients FOR INSERT TO authenticated
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can update patients"
ON public.patients FOR UPDATE TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())))
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

-- Patient Devices (via patient's hospital)
CREATE POLICY "Hospital members can view patient devices"
ON public.patient_devices FOR SELECT TO authenticated
USING (patient_id IN (SELECT id FROM public.patients WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

CREATE POLICY "Hospital members can insert patient devices"
ON public.patient_devices FOR INSERT TO authenticated
WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

CREATE POLICY "Hospital members can update patient devices"
ON public.patient_devices FOR UPDATE TO authenticated
USING (patient_id IN (SELECT id FROM public.patients WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))))
WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

-- Audits
CREATE POLICY "Hospital members can view audits"
ON public.audits FOR SELECT TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can insert audits"
ON public.audits FOR INSERT TO authenticated
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can update audits"
ON public.audits FOR UPDATE TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())))
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

-- Audit Items (via audit's hospital)
CREATE POLICY "Hospital members can view audit items"
ON public.audit_items FOR SELECT TO authenticated
USING (audit_id IN (SELECT id FROM public.audits WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

CREATE POLICY "Hospital members can insert audit items"
ON public.audit_items FOR INSERT TO authenticated
WITH CHECK (audit_id IN (SELECT id FROM public.audits WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

CREATE POLICY "Hospital members can update audit items"
ON public.audit_items FOR UPDATE TO authenticated
USING (audit_id IN (SELECT id FROM public.audits WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))))
WITH CHECK (audit_id IN (SELECT id FROM public.audits WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

-- Infection Cases
CREATE POLICY "Hospital members can view infection cases"
ON public.infection_cases FOR SELECT TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can insert infection cases"
ON public.infection_cases FOR INSERT TO authenticated
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can update infection cases"
ON public.infection_cases FOR UPDATE TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())))
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

-- Case Notes (via case's hospital)
CREATE POLICY "Hospital members can view case notes"
ON public.case_notes FOR SELECT TO authenticated
USING (case_id IN (SELECT id FROM public.infection_cases WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

CREATE POLICY "Hospital members can insert case notes"
ON public.case_notes FOR INSERT TO authenticated
WITH CHECK (case_id IN (SELECT id FROM public.infection_cases WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

-- Alerts
CREATE POLICY "Hospital members can view alerts"
ON public.alerts FOR SELECT TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can insert alerts"
ON public.alerts FOR INSERT TO authenticated
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can update alerts"
ON public.alerts FOR UPDATE TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())))
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

-- Lab Results
CREATE POLICY "Hospital members can view lab results"
ON public.lab_results FOR SELECT TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can insert lab results"
ON public.lab_results FOR INSERT TO authenticated
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can update lab results"
ON public.lab_results FOR UPDATE TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())))
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

-- Antibiogram Results (via lab result's hospital)
CREATE POLICY "Hospital members can view antibiogram results"
ON public.antibiogram_results FOR SELECT TO authenticated
USING (lab_result_id IN (SELECT id FROM public.lab_results WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

CREATE POLICY "Hospital members can insert antibiogram results"
ON public.antibiogram_results FOR INSERT TO authenticated
WITH CHECK (lab_result_id IN (SELECT id FROM public.lab_results WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

-- Sectors
CREATE POLICY "Hospital members can view sectors"
ON public.sectors FOR SELECT TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital admins can manage sectors"
ON public.sectors FOR ALL TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())) AND public.has_role(auth.uid(), 'hospital_admin'::app_role))
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())) AND public.has_role(auth.uid(), 'hospital_admin'::app_role));

-- Precautions (via patient's hospital)
CREATE POLICY "Hospital members can view precautions"
ON public.precautions FOR SELECT TO authenticated
USING (patient_id IN (SELECT id FROM public.patients WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

CREATE POLICY "Hospital members can insert precautions"
ON public.precautions FOR INSERT TO authenticated
WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

CREATE POLICY "Hospital members can update precautions"
ON public.precautions FOR UPDATE TO authenticated
USING (patient_id IN (SELECT id FROM public.patients WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))))
WITH CHECK (patient_id IN (SELECT id FROM public.patients WHERE hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid()))));

-- Antimicrobial Prescriptions
CREATE POLICY "Hospital members can view prescriptions"
ON public.antimicrobial_prescriptions FOR SELECT TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can insert prescriptions"
ON public.antimicrobial_prescriptions FOR INSERT TO authenticated
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can update prescriptions"
ON public.antimicrobial_prescriptions FOR UPDATE TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())))
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));
