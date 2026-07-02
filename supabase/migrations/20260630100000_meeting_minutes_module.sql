-- =========================================================
-- IRAS CONTROL - MÓDULO REUNIÕES E ATAS INTELIGENTES
-- =========================================================

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null,
  sector_id uuid,
  title text not null,
  meeting_type text not null default 'ordinary',
  committee text,
  department text,
  theme text,
  location text,
  online_link text,
  scheduled_date date,
  start_time text,
  end_time text,
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  agenda text,
  previous_pending_items text,
  raw_text_input text,
  transcript_text text,
  ai_summary text,
  generated_minutes_md text,
  status text not null default 'draft' check (status in (
    'draft','scheduled','in_progress','completed',
    'minutes_generated','under_review','approved','cancelled'
  )),
  meeting_character text default 'ordinary' check (meeting_character in ('ordinary','extraordinary')),
  reporter_name text,
  president_name text,
  next_meeting_date date,
  next_meeting_time text,
  next_meeting_location text,
  next_meeting_agenda text,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meeting_participants (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  name text not null,
  role text,
  institution text,
  email text,
  phone text,
  expected boolean not null default true,
  present boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists meeting_action_items (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  hospital_id uuid not null,
  title text not null,
  description text,
  why text,
  responsible_name text not null,
  department text,
  due_date date,
  evidence_required text,
  evidence_url text,
  priority text not null default 'medium' check (priority in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','in_progress','done','cancelled','overdue')),
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists meeting_decisions (
  id uuid primary key default gen_random_uuid(),
  meeting_id uuid not null references meetings(id) on delete cascade,
  decision text not null,
  responsible_name text,
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists idx_meetings_hospital_date on meetings(hospital_id, scheduled_date);
create index if not exists idx_meetings_status on meetings(status);
create index if not exists idx_meeting_action_items_meeting on meeting_action_items(meeting_id);
create index if not exists idx_meeting_action_items_hospital on meeting_action_items(hospital_id);
create index if not exists idx_meeting_participants_meeting on meeting_participants(meeting_id);

-- RLS
alter table meetings enable row level security;
alter table meeting_participants enable row level security;
alter table meeting_action_items enable row level security;
alter table meeting_decisions enable row level security;

create policy "meetings_hospital_access" on meetings
  using (hospital_id in (
    select hospital_id from hospital_users where user_id = auth.uid()
  ));

create policy "meetings_hospital_insert" on meetings for insert
  with check (hospital_id in (
    select hospital_id from hospital_users where user_id = auth.uid()
  ));

create policy "meetings_hospital_update" on meetings for update
  using (hospital_id in (
    select hospital_id from hospital_users where user_id = auth.uid()
  ));

create policy "meetings_hospital_delete" on meetings for delete
  using (hospital_id in (
    select hospital_id from hospital_users where user_id = auth.uid()
  ));

create policy "meeting_participants_access" on meeting_participants
  using (meeting_id in (
    select id from meetings where hospital_id in (
      select hospital_id from hospital_users where user_id = auth.uid()
    )
  ));

create policy "meeting_participants_insert" on meeting_participants for insert
  with check (meeting_id in (
    select id from meetings where hospital_id in (
      select hospital_id from hospital_users where user_id = auth.uid()
    )
  ));

create policy "meeting_participants_update" on meeting_participants for update
  using (meeting_id in (
    select id from meetings where hospital_id in (
      select hospital_id from hospital_users where user_id = auth.uid()
    )
  ));

create policy "meeting_participants_delete" on meeting_participants for delete
  using (meeting_id in (
    select id from meetings where hospital_id in (
      select hospital_id from hospital_users where user_id = auth.uid()
    )
  ));

create policy "meeting_action_items_access" on meeting_action_items
  using (hospital_id in (
    select hospital_id from hospital_users where user_id = auth.uid()
  ));

create policy "meeting_action_items_insert" on meeting_action_items for insert
  with check (hospital_id in (
    select hospital_id from hospital_users where user_id = auth.uid()
  ));

create policy "meeting_action_items_update" on meeting_action_items for update
  using (hospital_id in (
    select hospital_id from hospital_users where user_id = auth.uid()
  ));

create policy "meeting_action_items_delete" on meeting_action_items for delete
  using (hospital_id in (
    select hospital_id from hospital_users where user_id = auth.uid()
  ));

create policy "meeting_decisions_access" on meeting_decisions
  using (meeting_id in (
    select id from meetings where hospital_id in (
      select hospital_id from hospital_users where user_id = auth.uid()
    )
  ));

create policy "meeting_decisions_insert" on meeting_decisions for insert
  with check (meeting_id in (
    select id from meetings where hospital_id in (
      select hospital_id from hospital_users where user_id = auth.uid()
    )
  ));

-- Marketplace entry
insert into marketplace_tools (
  id, name, description, category, icon_name, route, version, author,
  price, is_free, features, downloads, rating
) values (
  'meeting-minutes-ai',
  'Reuniões e Atas Inteligentes',
  'Módulo para gestão completa de reuniões hospitalares, com agendamento, pauta, registro de participantes, transcrição por IA, geração automática de ata institucional, controle de pendências e plano de ação.',
  'Gestão Hospitalar',
  'ClipboardList',
  '/reunioes-atas',
  '1.0.0',
  'IRASControl',
  'Grátis',
  true,
  '["Agendamento de reuniões","Cadastro de participantes","Controle de presença","Transcrição por IA","Geração automática de ata","Modelo institucional de ata","Pendências anteriores","Plano de ação integrado","Exportação PDF"]',
  0,
  5.0
) on conflict (id) do nothing;
