-- Formulário de Ata de Reuniões (modelo institucional FOR-HGNI-001):
-- campos de cabeçalho, quadro de ações em acompanhamento, relato e "Quando" em texto livre.
alter table public.meetings
  add column if not exists entry_type text,
  add column if not exists entry_other text,
  add column if not exists previous_pending_status text,
  add column if not exists followup_actions jsonb not null default '[]'::jsonb,
  add column if not exists minutes_report text,
  add column if not exists form_code text;

alter table public.meetings drop constraint if exists meetings_entry_type_check;
alter table public.meetings add constraint meetings_entry_type_check
  check (entry_type is null or entry_type in ('indicator', 'planning', 'improvement', 'other'));

alter table public.meetings drop constraint if exists meetings_previous_pending_status_check;
alter table public.meetings add constraint meetings_previous_pending_status_check
  check (previous_pending_status is null or previous_pending_status in ('previous', 'first', 'none'));

alter table public.meetings drop constraint if exists meetings_followup_actions_is_array;
alter table public.meetings add constraint meetings_followup_actions_is_array
  check (jsonb_typeof(followup_actions) = 'array');

alter table public.meeting_action_items
  add column if not exists when_text text;

comment on column public.meetings.followup_actions is 'Quadro de ações do formulário: [{what, who, when, status, evidence_location}]';
comment on column public.meetings.minutes_report is 'Relato da Reunião impresso no formulário de ata';
comment on column public.meeting_action_items.when_text is 'Campo "Quando" do formulário em texto livre';

-- Endereço da unidade (rodapé dos documentos)
alter table public.hospitals
  add column if not exists short_name text,
  add column if not exists address text,
  add column if not exists neighborhood text,
  add column if not exists zip_code text;

comment on column public.hospitals.short_name is 'Sigla da unidade, ex.: HGNI';
comment on column public.hospitals.address is 'Logradouro e número da unidade';
