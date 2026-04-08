-- Table for epidemiological indicators (IndicadoresNew / IndicadoresDashboard)
CREATE TABLE public.indicadores_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  profissional text NOT NULL DEFAULT '',
  data_vigilancia date NOT NULL DEFAULT CURRENT_DATE,
  mes_vigilancia text NOT NULL DEFAULT '',
  ano_vigilancia integer NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
  setor text NOT NULL DEFAULT '',
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.indicadores_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital members can view indicadores"
  ON public.indicadores_records FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can insert indicadores"
  ON public.indicadores_records FOR INSERT TO authenticated
  WITH CHECK (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Users can update own indicadores"
  ON public.indicadores_records FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own indicadores"
  ON public.indicadores_records FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins full access on indicadores_records"
  ON public.indicadores_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- CRM contacts table
CREATE TABLE public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  name text NOT NULL,
  company text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'lead',
  value text NOT NULL DEFAULT '',
  score integer NOT NULL DEFAULT 0,
  notes text,
  last_contact_at timestamptz DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital members can view crm contacts"
  ON public.crm_contacts FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can insert crm contacts"
  ON public.crm_contacts FOR INSERT TO authenticated
  WITH CHECK (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can update crm contacts"
  ON public.crm_contacts FOR UPDATE TO authenticated
  USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())))
  WITH CHECK (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can delete crm contacts"
  ON public.crm_contacts FOR DELETE TO authenticated
  USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Super admins full access on crm_contacts"
  ON public.crm_contacts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_indicadores_records_updated_at
  BEFORE UPDATE ON public.indicadores_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_crm_contacts_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();