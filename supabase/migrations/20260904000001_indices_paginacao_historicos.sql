-- Índices para a paginação server-side dos históricos (filtro por hospital + ordenação por created_at desc).
-- indicadores_records só tinha PK em id (seq scan + sort a cada consulta); isc_records tinha índice só de hospital_id.
-- O índice composto cobre o padrão "WHERE hospital_id = ? ORDER BY created_at DESC" usado no .range().

create index if not exists idx_indicadores_records_hospital_created
  on public.indicadores_records (hospital_id, created_at desc);

create index if not exists idx_isc_records_hospital_created
  on public.isc_records (hospital_id, created_at desc);
