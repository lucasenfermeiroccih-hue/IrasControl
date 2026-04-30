-- Tabela para histórico de relatórios microbiológicos (PDFs e IA)
CREATE TABLE public.antibiogram_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL,
  created_by UUID,
  report_type TEXT NOT NULL CHECK (report_type IN ('ai', 'pdf_visual', 'pdf_structured', 'ai_scheduled')),
  period_label TEXT NOT NULL,
  period_start DATE,
  period_end DATE,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_content TEXT,
  total_exams INTEGER NOT NULL DEFAULT 0,
  resistance_rate NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.antibiogram_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hospital members can view antibiogram reports"
ON public.antibiogram_reports FOR SELECT TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can insert antibiogram reports"
ON public.antibiogram_reports FOR INSERT TO authenticated
WITH CHECK (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Hospital members can delete antibiogram reports"
ON public.antibiogram_reports FOR DELETE TO authenticated
USING (hospital_id IN (SELECT public.get_user_hospital_ids(auth.uid())));

CREATE POLICY "Super admins full access on antibiogram_reports"
ON public.antibiogram_reports FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_antibiogram_reports_hospital ON public.antibiogram_reports(hospital_id, created_at DESC);

CREATE TRIGGER update_antibiogram_reports_updated_at
BEFORE UPDATE ON public.antibiogram_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();