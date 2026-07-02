-- Registra o módulo "Protocolos com IA" no Marketplace do IRASControl
insert into public.marketplace_tools (
  id,
  name,
  description,
  category,
  icon_name,
  route,
  version,
  author,
  price,
  is_free,
  features,
  downloads,
  rating
) values (
  'protocolos-ia',
  'Protocolos da Unidade com IA',
  'Biblioteca centralizada de protocolos hospitalares com busca inteligente por IA. Faça upload de PDFs e DOCXs, organize por setor/categoria e consulte via linguagem natural. A IA responde com base exclusivamente nos documentos da sua instituição.',
  'IA',
  'BookOpen',
  '/protocolos-ia',
  '1.0.0',
  'IRASControl',
  'Gratuito',
  true,
  '["Upload de PDF e DOCX com extração automática de texto","Busca por linguagem natural via IA (RAG)","Organização por setor e categoria","Dashboard de vencimentos e status de IA","Badge de status de extração por documento","Reprocessamento manual em caso de falha","Visualizador integrado de PDF","Isolamento de dados por hospital (RLS)"]'::jsonb,
  0,
  5.0
)
on conflict (id) do update set
  name        = excluded.name,
  description = excluded.description,
  category    = excluded.category,
  version     = excluded.version,
  features    = excluded.features;
