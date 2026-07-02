import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  ShieldCheck, Loader2, Users, RefreshCw, Settings2,
  UserCog, ChevronDown, ChevronRight, Lock, Unlock, Minus,
  Plus, Save, AlertTriangle,
} from "lucide-react";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { SYSTEM_PERMISSIONS } from "@/types/permissions";
import type { ManagedUser, UserRole, PermissionCatalogItem } from "@/types/permissions";
import {
  getUsersWithPermissions, getPermissionCatalog, getHospitalRoles,
  createHospitalRole, getRolePermissions, setRolePermissions,
  setUserAdminStatus, setUserRole, grantUserPermission,
  revokeUserPermission, clearUserPermissionOverride,
} from "@/services/permissionsService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type DirectState = "granted" | "denied" | "inherited";

function directState(user: ManagedUser, key: string): DirectState {
  const it = user.direct_permissions?.find((p) => p.permission_key === key);
  if (!it) return "inherited";
  return it.granted ? "granted" : "denied";
}

function groupPermissions(catalog: PermissionCatalogItem[]) {
  const groups = new Map<string, PermissionCatalogItem[]>();
  catalog.forEach((p) => {
    const arr = groups.get(p.permission_group) || [];
    arr.push(p);
    groups.set(p.permission_group, arr);
  });
  return groups;
}

// ─── StateIcon ────────────────────────────────────────────────────────────────

function StateIcon({ state }: { state: DirectState }) {
  if (state === "granted") return <Unlock className="h-4 w-4 text-emerald-600" />;
  if (state === "denied") return <Lock className="h-4 w-4 text-red-600" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

// ─── UserPermissionRow ────────────────────────────────────────────────────────

interface UserRowProps {
  user: ManagedUser;
  catalog: PermissionCatalogItem[];
  roles: UserRole[];
  hospitalId: string;
  onRefresh: () => void;
}

function UserPermissionRow({ user, catalog, roles, hospitalId, onRefresh }: UserRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const groups = groupPermissions(catalog);

  const displayName = user.full_name || user.email || user.user_id.slice(0, 8);

  async function toggleAdmin() {
    setSaving("admin");
    try {
      await setUserAdminStatus({ userId: user.user_id, hospitalId, isAdmin: !user.is_admin });
      toast.success(user.is_admin ? "Admin removido." : "Admin concedido.");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Erro ao alterar admin.");
    } finally {
      setSaving(null);
    }
  }

  async function handleRoleChange(roleId: string) {
    setSaving("role");
    try {
      await setUserRole({ userId: user.user_id, hospitalId, roleId: roleId || null });
      toast.success("Perfil atualizado.");
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Erro ao alterar perfil.");
    } finally {
      setSaving(null);
    }
  }

  async function cyclePermission(key: string) {
    const current = directState(user, key);
    setSaving(key);
    try {
      if (current === "inherited") {
        await grantUserPermission({ userId: user.user_id, hospitalId, permissionKey: key });
      } else if (current === "granted") {
        await revokeUserPermission({ userId: user.user_id, hospitalId, permissionKey: key });
      } else {
        await clearUserPermissionOverride({ userId: user.user_id, hospitalId, permissionKey: key });
      }
      onRefresh();
    } catch (e: any) {
      toast.error(e.message || "Erro ao alterar permissão.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <div
        className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        {expanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{displayName}</p>
          {user.email && user.full_name && (
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {user.is_admin && <Badge className="bg-primary/10 text-primary text-xs">Admin</Badge>}
          {user.role_name && <Badge variant="secondary" className="text-xs">{user.role_name}</Badge>}
          {!user.is_active && <Badge variant="destructive" className="text-xs">Inativo</Badge>}
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4 border-t">
          {/* Admin + Role */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <Label className="text-xs mb-1 block">Status Admin</Label>
              <Button
                size="sm"
                variant={user.is_admin ? "destructive" : "outline"}
                onClick={toggleAdmin}
                disabled={saving === "admin"}
              >
                {saving === "admin" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                {user.is_admin ? "Remover Admin" : "Tornar Admin"}
              </Button>
            </div>
            {roles.length > 0 && (
              <div>
                <Label className="text-xs mb-1 block">Perfil</Label>
                <Select
                  value={user.role_id || ""}
                  onValueChange={handleRoleChange}
                  disabled={saving === "role"}
                >
                  <SelectTrigger className="w-44 h-8 text-xs">
                    <SelectValue placeholder="Sem perfil" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Sem perfil</SelectItem>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Legenda */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Minus className="h-3 w-3" />Herdado do perfil</span>
            <span className="flex items-center gap-1"><Unlock className="h-3 w-3 text-emerald-600" />Permitido diretamente</span>
            <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-red-600" />Bloqueado diretamente</span>
          </div>

          {/* Permissões por grupo */}
          {user.is_admin ? (
            <p className="text-sm text-emerald-700 bg-emerald-50 rounded p-2">
              Administrador possui todas as permissões automaticamente.
            </p>
          ) : (
            <div className="space-y-3">
              {Array.from(groups.entries()).map(([group, perms]) => (
                <div key={group}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {perms.map((perm) => {
                      const state = directState(user, perm.key);
                      return (
                        <button
                          key={perm.key}
                          onClick={() => cyclePermission(perm.key)}
                          disabled={saving === perm.key}
                          className={`flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded border transition-colors ${
                            state === "granted"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : state === "denied"
                              ? "bg-red-50 border-red-200 text-red-800"
                              : "bg-background border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {saving === perm.key ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <StateIcon state={state} />
                          )}
                          <span className="truncate">{perm.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── RolesTab ─────────────────────────────────────────────────────────────────

function RolesTab({ hospitalId, catalog }: { hospitalId: string; catalog: PermissionCatalogItem[] }) {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [rolePerms, setRolePerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const groups = groupPermissions(catalog);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getHospitalRoles(hospitalId);
      setRoles(data);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { fetchRoles(); }, [fetchRoles]);

  async function selectRole(role: UserRole) {
    setSelected(role);
    const perms = await getRolePermissions(role.id);
    setRolePerms(perms);
  }

  async function saveRolePerms() {
    if (!selected) return;
    setSaving(true);
    try {
      await setRolePermissions(selected.id, rolePerms);
      toast.success("Permissões do perfil salvas.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function createRole() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const slug = newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_");
      await createHospitalRole({ hospitalId, name: newName.trim(), slug });
      toast.success("Perfil criado.");
      setNewName("");
      setShowNew(false);
      fetchRoles();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  }

  function togglePerm(key: string) {
    setRolePerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Lista de perfis */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Perfis</p>
          <Button size="sm" variant="outline" onClick={() => setShowNew(true)}>
            <Plus className="h-3 w-3 mr-1" />Novo
          </Button>
        </div>
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : roles.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Nenhum perfil criado.</p>
        ) : (
          roles.map((r) => (
            <button
              key={r.id}
              onClick={() => selectRole(r)}
              className={`w-full text-left text-sm px-3 py-2 rounded border transition-colors ${
                selected?.id === r.id ? "bg-primary/10 border-primary/30 text-primary" : "hover:bg-muted border-border"
              }`}
            >
              {r.name}
            </button>
          ))
        )}

        <Dialog open={showNew} onOpenChange={setShowNew}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Perfil</DialogTitle></DialogHeader>
            <div>
              <Label>Nome do perfil</Label>
              <Input className="mt-1" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Ex: Enfermeiro CCIH" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancelar</Button>
              <Button onClick={createRole} disabled={creating || !newName.trim()}>
                {creating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Permissões do perfil */}
      <div className="md:col-span-2">
        {!selected ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-2">
            <Settings2 className="h-8 w-8" />
            <p className="text-sm">Selecione um perfil para editar suas permissões.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-medium">{selected.name}</p>
              <Button size="sm" onClick={saveRolePerms} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>
            <ScrollArea className="h-[50vh] pr-2">
              <div className="space-y-3">
                {Array.from(groups.entries()).map(([group, perms]) => (
                  <div key={group}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{group}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {perms.map((perm) => {
                        const active = rolePerms.includes(perm.key);
                        return (
                          <button
                            key={perm.key}
                            onClick={() => togglePerm(perm.key)}
                            className={`flex items-center gap-2 text-left text-xs px-2 py-1.5 rounded border transition-colors ${
                              active
                                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                                : "bg-background border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {active ? <Unlock className="h-3 w-3 text-emerald-600" /> : <Minus className="h-3 w-3" />}
                            <span className="truncate">{perm.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function PermissoesUsuarios() {
  const { hospitalId, loading: hospitalLoading } = useHospitalContext();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalogItem[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    try {
      const [u, c, r] = await Promise.all([
        getUsersWithPermissions(hospitalId),
        getPermissionCatalog(),
        getHospitalRoles(hospitalId),
      ]);
      setUsers(u);
      setCatalog(c);
      setRoles(r);
    } catch (e: any) {
      toast.error("Erro ao carregar dados: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [hospitalId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q)
    );
  });

  if (hospitalLoading) {
    return <div className="flex justify-center p-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }
  if (!hospitalId) {
    return <div className="flex justify-center p-16 text-muted-foreground">Nenhum hospital selecionado.</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Permissões de Usuários</h1>
            <p className="text-sm text-muted-foreground">Gerencie perfis e permissões por usuário</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />Atualizar
        </Button>
      </div>

      {/* Aviso de segurança */}
      <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p>As permissões aqui configuram o acesso dentro do sistema. A proteção definitiva é aplicada no banco de dados via RLS.</p>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios"><Users className="h-4 w-4 mr-1.5" />Usuários</TabsTrigger>
          <TabsTrigger value="perfis"><UserCog className="h-4 w-4 mr-1.5" />Perfis</TabsTrigger>
        </TabsList>

        {/* ── USUÁRIOS ── */}
        <TabsContent value="usuarios" className="space-y-3 mt-4">
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-sm"
          />
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-2">
              <Users className="h-10 w-10" />
              <p className="text-sm">Nenhum usuário encontrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((u) => (
                <UserPermissionRow
                  key={u.user_id}
                  user={u}
                  catalog={catalog}
                  roles={roles}
                  hospitalId={hospitalId}
                  onRefresh={fetchAll}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── PERFIS ── */}
        <TabsContent value="perfis" className="mt-4">
          <RolesTab hospitalId={hospitalId} catalog={catalog} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
