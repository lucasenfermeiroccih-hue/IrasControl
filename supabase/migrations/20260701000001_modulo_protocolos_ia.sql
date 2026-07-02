-- ============================================================
-- Módulo: Biblioteca de Protocolos com IA
-- ============================================================

create extension if not exists vector;

-- ------------------------------------------------------------
-- Função auxiliar: usuário logado pertence a este hospital?
-- Usa a tabela hospital_users deste projeto.
-- ------------------------------------------------------------
create or replace function public.user_has_hospital(p_hospital_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.hospital_users hu
    where hu.hospital_id = p_hospital_id
      and hu.user_id = auth.uid()
      and hu.is_active = true
  );
$$;

-- ------------------------------------------------------------
-- Tabelas
-- ------------------------------------------------------------
create table if not exists public.protocol_categories (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  name text not null,
  description text,
  color text default '#2563eb',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(hospital_id, name)
);

create table if not exists public.protocol_documents (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  category_id uuid references public.protocol_categories(id) on delete set null,
  title text not null,
  description text,
  sector text,
  protocol_type text,
  document_code text,
  version text default '1.0',
  status text not null default 'active' check (status in ('draft','active','archived','expired')),
  responsible_name text,
  responsible_role text,
  issue_date date,
  review_date date,
  expiration_date date,
  tags text[] default '{}',
  file_name text not null,
  file_path text not null,
  file_mime_type text,
  file_size bigint,
  extracted_text text,
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending','processing','completed','failed')),
  extraction_error text,
  page_count int,
  ai_enabled boolean not null default true,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.protocol_document_chunks (
  id uuid primary key default gen_random_uuid(),
  protocol_id uuid not null references public.protocol_documents(id) on delete cascade,
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  chunk_index int not null,
  page_number int,
  content text not null,
  token_count int,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique(protocol_id, chunk_index)
);

create table if not exists public.protocol_ai_questions (
  id uuid primary key default gen_random_uuid(),
  hospital_id uuid not null references public.hospitals(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  question text not null,
  answer text,
  source_protocol_ids uuid[] default '{}',
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- Índices
-- ------------------------------------------------------------
create index if not exists idx_protocol_documents_hospital   on public.protocol_documents(hospital_id);
create index if not exists idx_protocol_documents_sector     on public.protocol_documents(hospital_id, sector);
create index if not exists idx_protocol_documents_status     on public.protocol_documents(hospital_id, status);
create index if not exists idx_protocol_documents_expiration on public.protocol_documents(hospital_id, expiration_date);
create index if not exists idx_protocol_chunks_hospital      on public.protocol_document_chunks(hospital_id);
create index if not exists idx_protocol_chunks_protocol      on public.protocol_document_chunks(protocol_id);

-- hnsw: melhor que ivfflat para volumes pequenos/médios e não degrada em tabela vazia
create index if not exists idx_protocol_chunks_embedding
  on public.protocol_document_chunks
  using hnsw (embedding vector_cosine_ops);

-- ------------------------------------------------------------
-- RLS — isolamento por hospital
-- ------------------------------------------------------------
alter table public.protocol_categories       enable row level security;
alter table public.protocol_documents        enable row level security;
alter table public.protocol_document_chunks  enable row level security;
alter table public.protocol_ai_questions     enable row level security;

-- categorias
create policy "cat_select" on public.protocol_categories
  for select using (public.user_has_hospital(hospital_id));
create policy "cat_insert" on public.protocol_categories
  for insert with check (public.user_has_hospital(hospital_id));
create policy "cat_update" on public.protocol_categories
  for update using (public.user_has_hospital(hospital_id))
             with check (public.user_has_hospital(hospital_id));
create policy "cat_delete" on public.protocol_categories
  for delete using (public.user_has_hospital(hospital_id));

-- documentos
create policy "doc_select" on public.protocol_documents
  for select using (public.user_has_hospital(hospital_id));
create policy "doc_insert" on public.protocol_documents
  for insert with check (public.user_has_hospital(hospital_id));
create policy "doc_update" on public.protocol_documents
  for update using (public.user_has_hospital(hospital_id))
             with check (public.user_has_hospital(hospital_id));
create policy "doc_delete" on public.protocol_documents
  for delete using (public.user_has_hospital(hospital_id));

-- chunks (somente leitura para o cliente; escrita via service role na Edge Function)
create policy "chunk_select" on public.protocol_document_chunks
  for select using (public.user_has_hospital(hospital_id));

-- perguntas de IA
create policy "q_select" on public.protocol_ai_questions
  for select using (public.user_has_hospital(hospital_id));
create policy "q_insert" on public.protocol_ai_questions
  for insert with check (public.user_has_hospital(hospital_id));

-- ------------------------------------------------------------
-- Função de busca vetorial
-- ------------------------------------------------------------
create or replace function public.match_protocol_chunks(
  query_embedding vector(1536),
  match_hospital_id uuid,
  match_count int default 8,
  match_threshold float default 0.15
)
returns table (
  id uuid,
  protocol_id uuid,
  title text,
  page_number int,
  content text,
  similarity float
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.protocol_id,
    d.title,
    c.page_number,
    c.content,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.protocol_document_chunks c
  join public.protocol_documents d on d.id = c.protocol_id
  where c.hospital_id = match_hospital_id
    and d.ai_enabled = true
    and d.status = 'active'
    and c.embedding is not null
    and (1 - (c.embedding <=> query_embedding)) >= match_threshold
  order by c.embedding <=> query_embedding
  limit match_count;
$$;

-- ------------------------------------------------------------
-- Storage bucket
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('protocol-documents', 'protocol-documents', false)
on conflict (id) do nothing;

create policy "protocol_storage_select" on storage.objects
  for select using (
    bucket_id = 'protocol-documents'
    and public.user_has_hospital( (storage.foldername(name))[1]::uuid )
  );

create policy "protocol_storage_insert" on storage.objects
  for insert with check (
    bucket_id = 'protocol-documents'
    and public.user_has_hospital( (storage.foldername(name))[1]::uuid )
  );

create policy "protocol_storage_update" on storage.objects
  for update using (
    bucket_id = 'protocol-documents'
    and public.user_has_hospital( (storage.foldername(name))[1]::uuid )
  );

create policy "protocol_storage_delete" on storage.objects
  for delete using (
    bucket_id = 'protocol-documents'
    and public.user_has_hospital( (storage.foldername(name))[1]::uuid )
  );
