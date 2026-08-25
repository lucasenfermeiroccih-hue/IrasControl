-- Registra o módulo "Higiene e Logística" no Marketplace do IRASControl
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
  'higiene-logistica',
  'Higiene e Logística',
  'Gestão completa de materiais de limpeza e logística hospitalar. Controle estoque, pedidos mensais, curva ABC, ponto de pedido (dente-de-serra), auditoria de limpeza e não conformidades — tudo integrado por hospital.',
  'Operacional',
  'Truck',
  '/hygiene-logistics/dashboard',
  '1.0.0',
  'IRASControl',
  'Gratuito',
  true,
  '["Controle de estoque de materiais de limpeza","Pedido mensal automatizado com base no CMM","Matriz de ressuprimento por setor","Curva ABC de produtos","Gráfico dente-de-serra com ponto de pedido","Entrada e saída de estoque por setor","Inventário de equipamentos de limpeza","Agenda de limpeza por setor","Auditoria de limpeza com checklist","Registro e acompanhamento de não conformidades","Relatórios e exportações em Excel","Grade de valores (cotação DBS)"]'::jsonb,
  0,
  5.0
)
on conflict (id) do update set
  name        = excluded.name,
  description = excluded.description,
  category    = excluded.category,
  icon_name   = excluded.icon_name,
  route       = excluded.route,
  version     = excluded.version,
  features    = excluded.features;
