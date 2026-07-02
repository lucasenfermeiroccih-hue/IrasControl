import { supabase } from '@/integrations/supabase/client';
import type { PermissionCatalogItem, UserRole, ManagedUser } from '@/types/permissions';

export async function getPermissionCatalog() {
  const { data, error } = await supabase
    .from('permission_catalog')
    .select('*')
    .eq('is_active', true)
    .order('permission_group')
    .order('label');
  if (error) throw error;
  return data as PermissionCatalogItem[];
}

export async function getHospitalRoles(hospitalId: string) {
  const { data, error } = await (supabase as any)
    .from('hospital_roles')
    .select('*')
    .eq('hospital_id', hospitalId)
    .order('name');
  if (error) throw error;
  return data as UserRole[];
}

// Negação direta tem precedência sobre o role (mesma lógica do user_has_permission)
export async function getMyPermissions(hospitalId: string) {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return [];

  const { data: roleData } = await (supabase as any)
    .from('user_hospital_roles')
    .select('is_admin, role_id, is_active')
    .eq('user_id', userId)
    .eq('hospital_id', hospitalId)
    .eq('is_active', true)
    .maybeSingle();

  if (roleData?.is_admin) {
    return (await getPermissionCatalog()).map((p) => p.key);
  }

  const roleId = roleData?.role_id;
  const [rolePerms, directPerms] = await Promise.all([
    roleId
      ? (supabase as any).from('role_permissions').select('permission_key').eq('role_id', roleId)
      : Promise.resolve({ data: [], error: null }),
    (supabase as any)
      .from('user_direct_permissions')
      .select('permission_key, granted')
      .eq('user_id', userId)
      .eq('hospital_id', hospitalId),
  ]);
  if (rolePerms.error) throw rolePerms.error;
  if (directPerms.error) throw directPerms.error;

  const granted = new Set<string>();
  const denied = new Set<string>();
  (directPerms.data || []).forEach((p: any) =>
    (p.granted ? granted : denied).add(p.permission_key),
  );

  const result = new Set<string>();
  (rolePerms.data || []).forEach((p: any) => result.add(p.permission_key));
  granted.forEach((k) => result.add(k));
  denied.forEach((k) => result.delete(k));

  return Array.from(result);
}

export async function userHasPermission(hospitalId: string, permissionKey: string) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.id) return false;
  const { data, error } = await (supabase as any).rpc('user_has_permission', {
    target_user_id: userData.user.id,
    target_hospital_id: hospitalId,
    target_permission: permissionKey,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function setUserAdminStatus(p: {
  userId: string;
  hospitalId: string;
  isAdmin: boolean;
}) {
  const { data: existing } = await (supabase as any)
    .from('user_hospital_roles')
    .select('id, role_id')
    .eq('user_id', p.userId)
    .eq('hospital_id', p.hospitalId)
    .maybeSingle();

  const { error } = await (supabase as any).from('user_hospital_roles').upsert(
    {
      id: existing?.id,
      user_id: p.userId,
      hospital_id: p.hospitalId,
      role_id: existing?.role_id ?? null,
      is_admin: p.isAdmin,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,hospital_id' },
  );
  if (error) throw error;
}

export async function setUserRole(p: {
  userId: string;
  hospitalId: string;
  roleId: string | null;
}) {
  const { data: existing } = await (supabase as any)
    .from('user_hospital_roles')
    .select('id, is_admin')
    .eq('user_id', p.userId)
    .eq('hospital_id', p.hospitalId)
    .maybeSingle();

  const { error } = await (supabase as any).from('user_hospital_roles').upsert(
    {
      id: existing?.id,
      user_id: p.userId,
      hospital_id: p.hospitalId,
      role_id: p.roleId,
      is_admin: existing?.is_admin ?? false,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,hospital_id' },
  );
  if (error) throw error;
}

export async function grantUserPermission(p: {
  userId: string;
  hospitalId: string;
  permissionKey: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await (supabase as any).from('user_direct_permissions').upsert(
    {
      user_id: p.userId,
      hospital_id: p.hospitalId,
      permission_key: p.permissionKey,
      granted: true,
      granted_by: u.user?.id || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,hospital_id,permission_key' },
  );
  if (error) throw error;
}

export async function revokeUserPermission(p: {
  userId: string;
  hospitalId: string;
  permissionKey: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await (supabase as any).from('user_direct_permissions').upsert(
    {
      user_id: p.userId,
      hospital_id: p.hospitalId,
      permission_key: p.permissionKey,
      granted: false,
      granted_by: u.user?.id || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,hospital_id,permission_key' },
  );
  if (error) throw error;
}

export async function clearUserPermissionOverride(p: {
  userId: string;
  hospitalId: string;
  permissionKey: string;
}) {
  const { error } = await (supabase as any)
    .from('user_direct_permissions')
    .delete()
    .eq('user_id', p.userId)
    .eq('hospital_id', p.hospitalId)
    .eq('permission_key', p.permissionKey);
  if (error) throw error;
}

export async function getUsersWithPermissions(hospitalId: string): Promise<ManagedUser[]> {
  const { data: users, error } = await (supabase as any)
    .from('managed_users_view')
    .select('*')
    .eq('hospital_id', hospitalId);
  if (error) throw error;

  const { data: overrides, error: ovErr } = await (supabase as any)
    .from('user_direct_permissions')
    .select('user_id, permission_key, granted')
    .eq('hospital_id', hospitalId);
  if (ovErr) throw ovErr;

  const byUser = new Map<string, Array<{ permission_key: string; granted: boolean }>>();
  (overrides || []).forEach((o: any) => {
    const arr = byUser.get(o.user_id) || [];
    arr.push({ permission_key: o.permission_key, granted: o.granted });
    byUser.set(o.user_id, arr);
  });

  return (users || []).map((u: any) => ({
    ...u,
    direct_permissions: byUser.get(u.user_id) || [],
  }));
}

export async function createHospitalRole(p: {
  hospitalId: string;
  name: string;
  slug: string;
  description?: string;
}) {
  const { data, error } = await (supabase as any)
    .from('hospital_roles')
    .insert({
      hospital_id: p.hospitalId,
      name: p.name,
      slug: p.slug,
      description: p.description || null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as UserRole;
}

export async function setRolePermissions(roleId: string, permissionKeys: string[]) {
  await (supabase as any).from('role_permissions').delete().eq('role_id', roleId);
  if (!permissionKeys.length) return;
  const { error } = await (supabase as any)
    .from('role_permissions')
    .insert(permissionKeys.map((key) => ({ role_id: roleId, permission_key: key })));
  if (error) throw error;
}

export async function getRolePermissions(roleId: string): Promise<string[]> {
  const { data, error } = await (supabase as any)
    .from('role_permissions')
    .select('permission_key')
    .eq('role_id', roleId);
  if (error) throw error;
  return (data || []).map((r: any) => r.permission_key);
}
