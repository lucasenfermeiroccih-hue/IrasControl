-- =====================================================================
-- patient_audit_log: registra toda inserção, atualização e exclusão
-- na tabela patients, com diff de campos alterados.
-- =====================================================================

CREATE TABLE public.patient_audit_log (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    uuid        NOT NULL,
  hospital_id   uuid        NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  changed_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at    timestamptz NOT NULL DEFAULT now(),
  action        text        NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data      jsonb,
  new_data      jsonb,
  diff_fields   text[]
);

CREATE INDEX idx_patient_audit_log_patient    ON public.patient_audit_log(patient_id);
CREATE INDEX idx_patient_audit_log_hospital   ON public.patient_audit_log(hospital_id);
CREATE INDEX idx_patient_audit_log_changed_at ON public.patient_audit_log(hospital_id, changed_at DESC);

ALTER TABLE public.patient_audit_log ENABLE ROW LEVEL SECURITY;

-- Super admins: acesso total
CREATE POLICY "Super admins full access on patient_audit_log"
  ON public.patient_audit_log FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Membros do hospital: somente leitura dos logs do seu hospital
CREATE POLICY "Hospital members can view patient audit log"
  ON public.patient_audit_log FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

-- =====================================================================
-- Trigger function: loga INSERT / UPDATE / DELETE na tabela patients
-- =====================================================================

CREATE OR REPLACE FUNCTION public.log_patient_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_diff_fields text[];
  v_old_json    jsonb;
  v_new_json    jsonb;
  v_key         text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.patient_audit_log (
      patient_id, hospital_id, changed_by, action, old_data, new_data, diff_fields
    ) VALUES (
      NEW.id, NEW.hospital_id, auth.uid(), 'INSERT', NULL, to_jsonb(NEW), NULL
    );
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_old_json    := to_jsonb(OLD);
    v_new_json    := to_jsonb(NEW);
    v_diff_fields := ARRAY[]::text[];

    FOR v_key IN SELECT jsonb_object_keys(v_new_json) LOOP
      IF v_old_json->v_key IS DISTINCT FROM v_new_json->v_key THEN
        v_diff_fields := array_append(v_diff_fields, v_key);
      END IF;
    END LOOP;

    -- Só registra se algo além do updated_at mudou
    IF array_length(array_remove(v_diff_fields, 'updated_at'), 1) > 0 THEN
      INSERT INTO public.patient_audit_log (
        patient_id, hospital_id, changed_by, action, old_data, new_data, diff_fields
      ) VALUES (
        NEW.id, NEW.hospital_id, auth.uid(), 'UPDATE', v_old_json, v_new_json, v_diff_fields
      );
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.patient_audit_log (
      patient_id, hospital_id, changed_by, action, old_data, new_data, diff_fields
    ) VALUES (
      OLD.id, OLD.hospital_id, auth.uid(), 'DELETE', to_jsonb(OLD), NULL, NULL
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER patients_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.patients
  FOR EACH ROW EXECUTE FUNCTION public.log_patient_changes();
