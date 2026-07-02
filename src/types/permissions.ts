export const SYSTEM_PERMISSIONS = [
  { key: 'admin.view', label: 'Acessar área administrativa', group: 'Administração' },
  { key: 'admin.permissions.manage', label: 'Gerenciar permissões de usuários', group: 'Administração' },
  { key: 'users.view', label: 'Visualizar usuários', group: 'Usuários' },
  { key: 'users.create', label: 'Criar usuários', group: 'Usuários' },
  { key: 'users.update', label: 'Editar usuários', group: 'Usuários' },
  { key: 'users.delete', label: 'Excluir usuários', group: 'Usuários' },
  { key: 'dashboard.view', label: 'Acessar dashboard', group: 'Dashboard' },
  { key: 'iras.view', label: 'Visualizar indicadores IRAS', group: 'IRAS' },
  { key: 'iras.create', label: 'Cadastrar indicadores IRAS', group: 'IRAS' },
  { key: 'iras.update', label: 'Editar indicadores IRAS', group: 'IRAS' },
  { key: 'iras.delete', label: 'Excluir indicadores IRAS', group: 'IRAS' },
  { key: 'iras.export', label: 'Exportar relatórios IRAS', group: 'IRAS' },
  { key: 'hand_hygiene.view', label: 'Visualizar higiene das mãos', group: 'Higienização das mãos' },
  { key: 'hand_hygiene.create', label: 'Cadastrar auditoria de higiene das mãos', group: 'Higienização das mãos' },
  { key: 'hand_hygiene.update', label: 'Editar auditoria de higiene das mãos', group: 'Higienização das mãos' },
  { key: 'hand_hygiene.delete', label: 'Excluir auditoria de higiene das mãos', group: 'Higienização das mãos' },
  { key: 'microbiology.view', label: 'Visualizar microbiologia', group: 'Microbiologia' },
  { key: 'microbiology.create', label: 'Cadastrar microorganismos', group: 'Microbiologia' },
  { key: 'microbiology.update', label: 'Editar microorganismos', group: 'Microbiologia' },
  { key: 'microbiology.delete', label: 'Excluir microorganismos', group: 'Microbiologia' },
  { key: 'ddd.view', label: 'Visualizar DDD/antimicrobianos', group: 'DDD' },
  { key: 'ddd.create', label: 'Cadastrar consumo de antimicrobianos', group: 'DDD' },
  { key: 'ddd.update', label: 'Editar consumo de antimicrobianos', group: 'DDD' },
  { key: 'ddd.delete', label: 'Excluir consumo de antimicrobianos', group: 'DDD' },
  { key: 'protocols.view', label: 'Visualizar protocolos', group: 'Protocolos' },
  { key: 'protocols.create', label: 'Anexar protocolos', group: 'Protocolos' },
  { key: 'protocols.update', label: 'Editar protocolos', group: 'Protocolos' },
  { key: 'protocols.delete', label: 'Excluir protocolos', group: 'Protocolos' },
  { key: 'protocols.download', label: 'Baixar protocolos', group: 'Protocolos' },
  { key: 'protocols.ask_ai', label: 'Perguntar à IA dos protocolos', group: 'Protocolos' },
  { key: 'reports.view', label: 'Visualizar relatórios', group: 'Relatórios' },
  { key: 'reports.create', label: 'Gerar relatórios', group: 'Relatórios' },
  { key: 'reports.export_pdf', label: 'Exportar PDF', group: 'Relatórios' },
  { key: 'reports.export_excel', label: 'Exportar Excel', group: 'Relatórios' },
  { key: 'settings.view', label: 'Visualizar configurações', group: 'Configurações' },
  { key: 'settings.update', label: 'Alterar configurações', group: 'Configurações' },
] as const;

export type PermissionKey = typeof SYSTEM_PERMISSIONS[number]['key'];

export interface PermissionCatalogItem {
  id: string;
  key: string;
  label: string;
  description?: string | null;
  permission_group: string;
  is_active: boolean;
  created_at: string;
}

export interface UserRole {
  id: string;
  hospital_id: string;
  name: string;
  slug: string;
  description?: string | null;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManagedUser {
  user_id: string;
  hospital_id: string;
  role_id?: string | null;
  role_name?: string | null;
  is_admin: boolean;
  is_active: boolean;
  full_name?: string | null;
  email?: string | null;
  direct_permissions?: Array<{ permission_key: string; granted: boolean }>;
}
