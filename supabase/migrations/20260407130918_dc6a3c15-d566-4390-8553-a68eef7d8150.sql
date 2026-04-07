
-- =====================================================
-- 1. DDD Records (Indicadores DDD)
-- =====================================================
CREATE TABLE public.ddd_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profissional TEXT NOT NULL,
  data_vigilancia DATE NOT NULL,
  mes_vigilancia TEXT NOT NULL,
  ano_vigilancia INTEGER NOT NULL,
  paciente_dia JSONB NOT NULL DEFAULT '{}'::jsonb,
  compilado_utis INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.ddd_record_lines (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ddd_record_id UUID NOT NULL REFERENCES public.ddd_records(id) ON DELETE CASCADE,
  antimicrobiano_id INTEGER NOT NULL,
  nome TEXT NOT NULL,
  apresentacao TEXT NOT NULL,
  mg_por_unidade NUMERIC NOT NULL DEFAULT 0,
  quantidade INTEGER NOT NULL DEFAULT 0,
  total_mg NUMERIC NOT NULL DEFAULT 0,
  total_g NUMERIC NOT NULL DEFAULT 0,
  ddd_padrao NUMERIC NOT NULL DEFAULT 0,
  valor_ab NUMERIC,
  indicador NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 2. ISC Records (Indicadores ISC)
-- =====================================================
CREATE TABLE public.isc_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_profissional TEXT NOT NULL,
  data_vigilancia DATE NOT NULL,
  mes TEXT NOT NULL,
  ano TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.isc_record_indicators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  isc_record_id UUID NOT NULL REFERENCES public.isc_records(id) ON DELETE CASCADE,
  procedimento TEXT NOT NULL,
  total_cirurgias INTEGER NOT NULL DEFAULT 0,
  contatos_atendidos INTEGER NOT NULL DEFAULT 0,
  reinternacoes INTEGER NOT NULL DEFAULT 0,
  isc_confirmada INTEGER NOT NULL DEFAULT 0,
  sitio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- 3. Agent Chat History
-- =====================================================
CREATE TABLE public.agent_chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id UUID REFERENCES public.hospitals(id) ON DELETE SET NULL,
  agent_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.agent_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.agent_chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- RLS Policies
-- =====================================================

-- DDD Records
ALTER TABLE public.ddd_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ddd_record_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hospital ddd_records"
  ON public.ddd_records FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Users can insert ddd_records"
  ON public.ddd_records FOR INSERT TO authenticated
  WITH CHECK (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Users can update own ddd_records"
  ON public.ddd_records FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own ddd_records"
  ON public.ddd_records FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins full access on ddd_records"
  ON public.ddd_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view ddd_record_lines via record"
  ON public.ddd_record_lines FOR SELECT TO authenticated
  USING (ddd_record_id IN (
    SELECT id FROM public.ddd_records WHERE hospital_id IN (SELECT get_user_hospital_ids(auth.uid()))
  ));

CREATE POLICY "Users can insert ddd_record_lines"
  ON public.ddd_record_lines FOR INSERT TO authenticated
  WITH CHECK (ddd_record_id IN (
    SELECT id FROM public.ddd_records WHERE hospital_id IN (SELECT get_user_hospital_ids(auth.uid()))
  ));

CREATE POLICY "Users can delete ddd_record_lines"
  ON public.ddd_record_lines FOR DELETE TO authenticated
  USING (ddd_record_id IN (
    SELECT id FROM public.ddd_records WHERE user_id = auth.uid()
  ));

CREATE POLICY "Super admins full access on ddd_record_lines"
  ON public.ddd_record_lines FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- ISC Records
ALTER TABLE public.isc_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.isc_record_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own hospital isc_records"
  ON public.isc_records FOR SELECT TO authenticated
  USING (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Users can insert isc_records"
  ON public.isc_records FOR INSERT TO authenticated
  WITH CHECK (hospital_id IN (SELECT get_user_hospital_ids(auth.uid())));

CREATE POLICY "Users can update own isc_records"
  ON public.isc_records FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own isc_records"
  ON public.isc_records FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins full access on isc_records"
  ON public.isc_records FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view isc_record_indicators via record"
  ON public.isc_record_indicators FOR SELECT TO authenticated
  USING (isc_record_id IN (
    SELECT id FROM public.isc_records WHERE hospital_id IN (SELECT get_user_hospital_ids(auth.uid()))
  ));

CREATE POLICY "Users can insert isc_record_indicators"
  ON public.isc_record_indicators FOR INSERT TO authenticated
  WITH CHECK (isc_record_id IN (
    SELECT id FROM public.isc_records WHERE hospital_id IN (SELECT get_user_hospital_ids(auth.uid()))
  ));

CREATE POLICY "Users can delete isc_record_indicators"
  ON public.isc_record_indicators FOR DELETE TO authenticated
  USING (isc_record_id IN (
    SELECT id FROM public.isc_records WHERE user_id = auth.uid()
  ));

CREATE POLICY "Super admins full access on isc_record_indicators"
  ON public.isc_record_indicators FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Agent Chat Sessions
ALTER TABLE public.agent_chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat sessions"
  ON public.agent_chat_sessions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat sessions"
  ON public.agent_chat_sessions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chat sessions"
  ON public.agent_chat_sessions FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chat sessions"
  ON public.agent_chat_sessions FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Super admins full access on agent_chat_sessions"
  ON public.agent_chat_sessions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own chat messages"
  ON public.agent_chat_messages FOR SELECT TO authenticated
  USING (session_id IN (
    SELECT id FROM public.agent_chat_sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own chat messages"
  ON public.agent_chat_messages FOR INSERT TO authenticated
  WITH CHECK (session_id IN (
    SELECT id FROM public.agent_chat_sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own chat messages"
  ON public.agent_chat_messages FOR DELETE TO authenticated
  USING (session_id IN (
    SELECT id FROM public.agent_chat_sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Super admins full access on agent_chat_messages"
  ON public.agent_chat_messages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'super_admin'))
  WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Indexes for performance
CREATE INDEX idx_ddd_records_hospital ON public.ddd_records(hospital_id);
CREATE INDEX idx_ddd_records_user ON public.ddd_records(user_id);
CREATE INDEX idx_ddd_record_lines_record ON public.ddd_record_lines(ddd_record_id);
CREATE INDEX idx_isc_records_hospital ON public.isc_records(hospital_id);
CREATE INDEX idx_isc_records_user ON public.isc_records(user_id);
CREATE INDEX idx_isc_record_indicators_record ON public.isc_record_indicators(isc_record_id);
CREATE INDEX idx_agent_chat_sessions_user ON public.agent_chat_sessions(user_id);
CREATE INDEX idx_agent_chat_sessions_agent ON public.agent_chat_sessions(agent_id);
CREATE INDEX idx_agent_chat_messages_session ON public.agent_chat_messages(session_id);
