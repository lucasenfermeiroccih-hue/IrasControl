-- Módulo Maternidade: registros mensais de indicadores obstétricos
create table if not exists maternidade_records (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  user_id uuid not null,
  mes text not null,
  ano text not null,
  nome_profissional text not null,
  data_registro date not null default current_date,
  total_partos integer not null default 0,
  partos_normais integer not null default 0,
  cesarianas integer not null default 0,
  infeccao_puerperal_confirmada integer not null default 0,
  infeccao_puerperal_suspeita integer not null default 0,
  isc_pos_cesariana integer not null default 0,
  busca_ativa_contatos integer not null default 0,
  busca_ativa_retornos integer not null default 0,
  investigacoes_epidemio integer not null default 0,
  leitos_obstetricos integer not null default 0,
  leitos_ocupados integer not null default 0,
  paciente_dias integer not null default 0,
  dias_permanencia_total integer not null default 0,
  educacoes_realizadas integer not null default 0,
  profissionais_capacitados integer not null default 0,
  observacoes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Planos de ação do módulo maternidade
create table if not exists maternidade_action_plans (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references hospitals(id) on delete cascade,
  user_id uuid not null,
  indicador text not null default '',
  what text not null,
  why text not null default '',
  who text not null,
  when_date date,
  how text not null default '',
  status text not null default 'planejado' check (status in ('planejado','em_andamento','concluido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- RLS
alter table maternidade_records enable row level security;
alter table maternidade_action_plans enable row level security;

create policy "hospital members can manage maternidade_records"
  on maternidade_records for all
  using (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()))
  with check (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()));

create policy "hospital members can manage maternidade_action_plans"
  on maternidade_action_plans for all
  using (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()))
  with check (hospital_id in (select hospital_id from hospital_users where user_id = auth.uid()));
