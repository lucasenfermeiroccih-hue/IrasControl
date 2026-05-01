CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função que percorre hospitais e dispara o relatório mensal de antibiograma
CREATE OR REPLACE FUNCTION public.trigger_monthly_antibiogram_reports(_function_url text, _api_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  h RECORD;
BEGIN
  FOR h IN SELECT id FROM public.hospitals WHERE status = 'active'
  LOOP
    PERFORM net.http_post(
      url := _function_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || _api_key
      ),
      body := jsonb_build_object(
        'scheduled', true,
        'hospital_id', h.id,
        'period', 'ultimo-mes',
        'save', true
      )
    );
  END LOOP;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.trigger_monthly_antibiogram_reports(text, text) FROM PUBLIC, anon, authenticated;