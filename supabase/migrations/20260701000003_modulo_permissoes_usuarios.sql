-- ============================================================
-- Módulo: Permissões de Usuários
-- ============================================================

-- ------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------
create table if not exists public.permission_catalog (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  description text,
  permission_group text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid references public.hospitals(id) on delete cascade,
  name text not null,
  slug text not null,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(hospital_id, slug)
);

create table if not exists public.role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references public.user_roles(id) on delete cascade,
  permission_key text not null references public.permission_catalog(key) on delete cascade,
  created_at timestamptz not null default now(),
  unique(role_id, permission_key)
);

create table if not exists public.user_hospital_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  role_id uuid references public.user_roles(id) on delete set null,
  is_admin boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, hospital_id)
);

create table if not exists public.user_direct_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  permission_key text not null references public.permission_catalog(key) on delete cascade,
  granted boolean not null default true,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, hospital_id, permission_key)
);

create index if not exists idx_uhr_user      on public.user_hospital_roles(user_id);
create index if not exists idx_uhr_hospital  on public.user_hospital_roles(hospital_id);
create index if not exists idx_rp_role       on public.role_permissions(role_id);
create index if not exists idx_udp_user_hosp on public.user_direct_permissions(user_id, hospital_id);

-- ------------------------------------------------------------
-- Helper: é admin do hospital?
-- ------------------------------------------------------------
create or replace function public.is_hospital_admin(p_hospital_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_hospital_roles uhr
    where uhr.user_id = auth.uid()
      and uhr.hospital_id = p_hospital_id
      and uhr.is_admin = true
      and uhr.is_active = true
  );
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.permission_catalog      enable row level security;
alter table public.user_roles              enable row level security;
alter table public.role_permissions        enable row level security;
alter table public.user_hospital_roles     enable row level security;
alter table public.user_direct_permissions enable row level security;

-- catálogo: leitura para qualquer autenticado
create policy "catalog_select" on public.permission_catalog
  for select using (auth.uid() is not null);

-- roles: leitura por membro do hospital; escrita só admin
create policy "roles_select" on public.user_roles
  for select using (
    hospital_id is null
    or exists (select 1 from public.user_hospital_roles uhr
               where uhr.user_id = auth.uid() and uhr.hospital_id = user_roles.hospital_id
                 and uhr.is_active = true)
  );
create policy "roles_admin_all" on public.user_roles
  for all using (public.is_hospital_admin(hospital_id))
          with check (public.is_hospital_admin(hospital_id));

-- role_permissions: leitura por membro; escrita só admin
create policy "rp_select" on public.role_permissions
  for select using (
    exists (select 1 from public.user_roles r
            join public.user_hospital_roles uhr on uhr.hospital_id = r.hospital_id
            where r.id = role_permissions.role_id
              and uhr.user_id = auth.uid() and uhr.is_active = true)
  );
create policy "rp_admin_all" on public.role_permissions
  for all using (
    exists (select 1 from public.user_roles r
            where r.id = role_permissions.role_id and public.is_hospital_admin(r.hospital_id))
  )
  with check (
    exists (select 1 from public.user_roles r
            where r.id = role_permissions.role_id and public.is_hospital_admin(r.hospital_id))
  );

-- user_hospital_roles: usuário vê o próprio; admin vê/gerencia todos
create policy "uhr_select_self_or_admin" on public.user_hospital_roles
  for select using (
    user_id = auth.uid() or public.is_hospital_admin(hospital_id)
  );
create policy "uhr_admin_all" on public.user_hospital_roles
  for all using (public.is_hospital_admin(hospital_id))
          with check (public.is_hospital_admin(hospital_id));

-- user_direct_permissions: usuário vê as próprias; admin gerencia todas
create policy "udp_select_self_or_admin" on public.user_direct_permissions
  for select using (
    user_id = auth.uid() or public.is_hospital_admin(hospital_id)
  );
create policy "udp_admin_all" on public.user_direct_permissions
  for all using (public.is_hospital_admin(hospital_id))
          with check (public.is_hospital_admin(hospital_id));

-- ------------------------------------------------------------
-- Função de permissão efetiva (negação direta tem precedência)
-- ------------------------------------------------------------
create or replace function public.user_has_permission(
  target_user_id uuid,
  target_hospital_id uuid,
  target_permission text
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_is_admin boolean;
  v_direct   boolean;
  v_role     boolean;
begin
  select true into v_is_admin
  from public.user_hospital_roles uhr
  where uhr.user_id = target_user_id
    and uhr.hospital_id = target_hospital_id
    and uhr.is_admin = true and uhr.is_active = true
  limit 1;
  if v_is_admin then return true; end if;

  select udp.granted into v_direct
  from public.user_direct_permissions udp
  where udp.user_id = target_user_id
    and udp.hospital_id = target_hospital_id
    and udp.permission_key = target_permission
  limit 1;
  if v_direct is not null then return v_direct; end if;

  select true into v_role
  from public.user_hospital_roles uhr
  join public.role_permissions rp on rp.role_id = uhr.role_id
  where uhr.user_id = target_user_id
    and uhr.hospital_id = target_hospital_id
    and uhr.is_active = true
    and rp.permission_key = target_permission
  limit 1;

  return coalesce(v_role, false);
end;
$$;

-- ------------------------------------------------------------
-- Salvaguarda: impede remover o último admin ativo
-- ------------------------------------------------------------
create or replace function public.prevent_last_admin_removal()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining int;
begin
  if (tg_op = 'DELETE' and old.is_admin and old.is_active)
     or (tg_op = 'UPDATE' and old.is_admin and old.is_active
         and (new.is_admin = false or new.is_active = false)) then

    select count(*) into remaining
    from public.user_hospital_roles
    where hospital_id = old.hospital_id
      and is_admin = true and is_active = true
      and id <> old.id;

    if remaining = 0 then
      raise exception 'Não é possível remover o último administrador ativo do hospital.';
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_prevent_last_admin on public.user_hospital_roles;
create trigger trg_prevent_last_admin
  before update or delete on public.user_hospital_roles
  for each row execute function public.prevent_last_admin_removal();

-- ------------------------------------------------------------
-- View de usuários gerenciados (join com profiles — user_id como chave)
-- ------------------------------------------------------------
create or replace view public.managed_users_view
with (security_invoker = true) as
select
  uhr.user_id,
  uhr.hospital_id,
  uhr.role_id,
  r.name  as role_name,
  uhr.is_admin,
  uhr.is_active,
  p.full_name,
  p.email
from public.user_hospital_roles uhr
left join public.user_roles r on r.id = uhr.role_id
left join public.profiles   p on p.user_id = uhr.user_id;

-- ------------------------------------------------------------
-- Seed do catálogo de permissões
-- ------------------------------------------------------------
insert into public.permission_catalog (key, label, permission_group) values
  ('admin.view',                    'Acessar área administrativa',              'Administração'),
  ('admin.permissions.manage',      'Gerenciar permissões de usuários',         'Administração'),
  ('users.view',                    'Visualizar usuários',                      'Usuários'),
  ('users.create',                  'Criar usuários',                           'Usuários'),
  ('users.update',                  'Editar usuários',                          'Usuários'),
  ('users.delete',                  'Excluir usuários',                         'Usuários'),
  ('dashboard.view',                'Acessar dashboard',                        'Dashboard'),
  ('iras.view',                     'Visualizar indicadores IRAS',              'IRAS'),
  ('iras.create',                   'Cadastrar indicadores IRAS',               'IRAS'),
  ('iras.update',                   'Editar indicadores IRAS',                  'IRAS'),
  ('iras.delete',                   'Excluir indicadores IRAS',                 'IRAS'),
  ('iras.export',                   'Exportar relatórios IRAS',                 'IRAS'),
  ('hand_hygiene.view',             'Visualizar higiene das mãos',              'Higienização das mãos'),
  ('hand_hygiene.create',           'Cadastrar auditoria de higiene das mãos',  'Higienização das mãos'),
  ('hand_hygiene.update',           'Editar auditoria de higiene das mãos',     'Higienização das mãos'),
  ('hand_hygiene.delete',           'Excluir auditoria de higiene das mãos',    'Higienização das mãos'),
  ('microbiology.view',             'Visualizar microbiologia',                 'Microbiologia'),
  ('microbiology.create',           'Cadastrar microorganismos',                'Microbiologia'),
  ('microbiology.update',           'Editar microorganismos',                   'Microbiologia'),
  ('microbiology.delete',           'Excluir microorganismos',                  'Microbiologia'),
  ('ddd.view',                      'Visualizar DDD/antimicrobianos',           'DDD'),
  ('ddd.create',                    'Cadastrar consumo de antimicrobianos',     'DDD'),
  ('ddd.update',                    'Editar consumo de antimicrobianos',        'DDD'),
  ('ddd.delete',                    'Excluir consumo de antimicrobianos',       'DDD'),
  ('protocols.view',                'Visualizar protocolos',                    'Protocolos'),
  ('protocols.create',              'Anexar protocolos',                        'Protocolos'),
  ('protocols.update',              'Editar protocolos',                        'Protocolos'),
  ('protocols.delete',              'Excluir protocolos',                       'Protocolos'),
  ('protocols.download',            'Baixar protocolos',                        'Protocolos'),
  ('protocols.ask_ai',              'Perguntar à IA dos protocolos',            'Protocolos'),
  ('reports.view',                  'Visualizar relatórios',                    'Relatórios'),
  ('reports.create',                'Gerar relatórios',                         'Relatórios'),
  ('reports.export_pdf',            'Exportar PDF',                             'Relatórios'),
  ('reports.export_excel',          'Exportar Excel',                           'Relatórios'),
  ('settings.view',                 'Visualizar configurações',                 'Configurações'),
  ('settings.update',               'Alterar configurações',                    'Configurações')
on conflict (key) do update set
  label            = excluded.label,
  permission_group = excluded.permission_group;
