-- Fix: excluir paciente falhava com
--   "insert or update on table patient_audit_log violates foreign key constraint patient_audit_log_patient_id_fkey"
-- Causa: o trigger AFTER DELETE em patients inseria um registro de auditoria com
--   patient_id = OLD.id, mas o paciente já havia sido removido -> FK rejeita o insert.
--   Além disso a FK era ON DELETE CASCADE, apagando todo o histórico do paciente ao excluí-lo.
-- Correção:
--   1) patient_id passa a ser nullable;
--   2) FK vira ON DELETE SET NULL (preserva o histórico em vez de apagá-lo);
--   3) o branch DELETE da função grava patient_id = NULL (os dados ficam em old_data).

ALTER TABLE public.patient_audit_log ALTER COLUMN patient_id DROP NOT NULL;

ALTER TABLE public.patient_audit_log DROP CONSTRAINT patient_audit_log_patient_id_fkey;
ALTER TABLE public.patient_audit_log
  ADD CONSTRAINT patient_audit_log_patient_id_fkey
  FOREIGN KEY (patient_id) REFERENCES public.patients(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.fn_patient_audit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_old      jsonb;
  v_new      jsonb;
  v_diff     text[] := '{}';
  v_key      text;
  v_hospital uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old      := to_jsonb(OLD);
    v_new      := NULL;
    v_hospital := OLD.hospital_id;

    -- patient_id = NULL: o paciente já foi removido nesta transação; a identificação
    -- completa fica preservada em old_data (inclui id e full_name).
    INSERT INTO patient_audit_log(patient_id, hospital_id, changed_by, action, old_data, new_data, diff_fields)
    VALUES (NULL, v_hospital, auth.uid(), 'DELETE', v_old, v_new, ARRAY['*']);
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_old      := NULL;
    v_new      := to_jsonb(NEW);
    v_hospital := NEW.hospital_id;

    INSERT INTO patient_audit_log(patient_id, hospital_id, changed_by, action, old_data, new_data, diff_fields)
    VALUES (NEW.id, v_hospital, auth.uid(), 'INSERT', v_old, v_new, ARRAY['*']);
    RETURN NEW;
  END IF;

  -- UPDATE: calcula quais campos mudaram
  v_old      := to_jsonb(OLD);
  v_new      := to_jsonb(NEW);
  v_hospital := NEW.hospital_id;

  FOR v_key IN SELECT key FROM jsonb_each(v_new) LOOP
    IF (v_old -> v_key) IS DISTINCT FROM (v_new -> v_key) THEN
      v_diff := v_diff || v_key;
    END IF;
  END LOOP;

  -- Só registra se algo mudou de fato
  IF array_length(v_diff, 1) > 0 THEN
    INSERT INTO patient_audit_log(patient_id, hospital_id, changed_by, action, old_data, new_data, diff_fields)
    VALUES (NEW.id, v_hospital, auth.uid(), 'UPDATE', v_old, v_new, v_diff);
  END IF;

  RETURN NEW;
END;
$function$;
