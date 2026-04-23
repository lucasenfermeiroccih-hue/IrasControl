import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Loader2, UserPlus, Users, RefreshCw, MoreHorizontal,
  Pencil, UserX, UserCheck, ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
const ROLE_LABELS: Record<string, string> = {
  hospital_admin: "Administrador",
  nurse_ccih: "Enfermeiro(a) CCIH",
  doctor: "Médico(a)",
  doctor_scih: "Médico(a) SCIH",
  nurse_tech_scih: "Téc. Enf. SCIH",
  lab_tech: "Técnico Lab.",
  biologist: "Biólogo(a)",
  administrative: "Administrativo",
  viewer: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  hospital_admin: "bg-primary/10 text-primary border-primary/30",
  nurse_ccih: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  doctor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  doctor_scih: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  nurse_tech_scih: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  lab_tech: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  biologist: "bg-purple-500/10 text-purple-600 border-purple-500/30",
  administrative: "bg-slate-500/10 text-slate-600 border-slate-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

const ASSIGNABLE_ROLES = [
  { value: "hospital_admin", label: "Administrador" },
  { value: "nurse_ccih", label: "Enfermeiro(a) CCIH" },
  { value: "doctor", label: "Médico(a)" },
  { value: "doctor_scih", label: "Médico(a) SCIH" },
  { value: "nurse_tech_scih", label: "Téc. de Enfermagem SCIH" },
  { value: "lab_tech", label: "Técnico de Laboratório" },
  { value: "biologist", label: "Bióloga(o)" },
  { value: "administrative", label: "Administrativo" },
  { value: "viewer", label: "Visualizador" },
];

interface HospitalUser {
  user_id: string;
  is_primary_admin: boolean;
  profiles: { full_name: string; email: string; phone: string | null } | null;
  user_roles: { role: string }[] | null;
}

export default function HospitalUsers() {
  const { user: authUser, isReady } = useAuthReady();
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [hospitalName, setHospitalName] = useState("");
  const [users, setUsers] = useState<HospitalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: "", email: "", phone: "", role: "", password: "", confirm_password: "" });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<HospitalUser | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "", role: "", password: "" });

  // Deactivate/activate confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "activate">("deactivate");
  const [confirmTarget, setConfirmTarget] = useState<HospitalUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!isReady || !authUser) return;
    loadHospitalAndUsers();
  }, [isReady, authUser]);

  const loadHospitalAndUsers = async () => {
    if (!authUser) return;
    setLoading(true);
    try {
      setCurrentUserId(authUser.id);

      const { data: membership } = await supabase
        .from("hospital_users")
        .select("hospital_id")
        .eq("user_id", authUser.id)
        .limit(1)
        .maybeSingle();

      if (!membership) {
        toast.error("Você não está vinculado a nenhum hospital");
        setLoading(false);
        return;
      }

      setHospitalId(membership.hospital_id);

      const { data: hospital } = await supabase
        .from("hospitals")
        .select("name")
        .eq("id", membership.hospital_id)
        .single();

      if (hospital) setHospitalName(hospital.name);
      await fetchUsers(membership.hospital_id);
    } catch {
      toast.error("Erro ao carregar dados");
    }
    setLoading(false);
  };

  const fetchUsers = async (hId: string) => {
    // Get hospital members
    const { data: members, error: membersError } = await supabase
      .from("hospital_users")
      .select("user_id, is_primary_admin")
      .eq("hospital_id", hId);

    if (membersError || !members || members.length === 0) {
      if (membersError) console.error("Error fetching members:", membersError);
      setUsers([]);
      return;
    }

    const userIds = members.map((m) => m.user_id);

    // Fetch profiles and roles for these users in parallel
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("user_id, full_name, email, phone").in("user_id", userIds),
      supabase.from("user_roles").select("user_id, role").in("user_id", userIds),
    ]);

    const profileMap = new Map((profiles || []).map((p) => [p.user_id, p]));
    const rolesMap = new Map<string, { role: string }[]>();
    (roles || []).forEach((r) => {
      if (!rolesMap.has(r.user_id)) rolesMap.set(r.user_id, []);
      rolesMap.get(r.user_id)!.push({ role: r.role });
    });

    const combined: HospitalUser[] = members.map((m) => ({
      user_id: m.user_id,
      is_primary_admin: m.is_primary_admin,
      profiles: profileMap.get(m.user_id) || null,
      user_roles: rolesMap.get(m.user_id) || null,
    }));

    setUsers(combined);
  };

  // --- Create ---
  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.full_name || !createForm.role || !hospitalId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (!createForm.password || createForm.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (createForm.password !== createForm.confirm_password) {
      toast.error("As senhas não coincidem");
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("create-hospital-user", {
      body: {
        email: createForm.email,
        full_name: createForm.full_name,
        phone: createForm.phone || null,
        hospital_id: hospitalId,
        role: createForm.role,
        password: createForm.password,
      },
    });
    setCreating(false);
    if (error) {
      toast.error("Erro ao criar usuário: " + error.message);
      return;
    }
    if (data && !data.success) {
      toast.error(data.error || "Erro desconhecido ao criar usuário");
      return;
    }
    toast.success("Usuário criado com sucesso!");
    setCreateForm({ full_name: "", email: "", phone: "", role: "", password: "", confirm_password: "" });
    setCreateOpen(false);
    await fetchUsers(hospitalId);
  };

  // --- Edit ---
  const openEditDialog = (user: HospitalUser) => {
    const mainRole = (user.user_roles || []).find(
      (r) => r.role !== "super_admin" && r.role !== "hospital_admin"
    );
    setEditTarget(user);
    setEditForm({
      full_name: user.profiles?.full_name || "",
      email: user.profiles?.email || "",
      phone: user.profiles?.phone || "",
      role: mainRole?.role || "",
      password: "",
    });
    setEditOpen(true);
  };

  const handleEditUser = async () => {
    if (!editTarget || !hospitalId) return;
    if (!editForm.full_name) {
      toast.error("Nome é obrigatório");
      return;
    }
    setEditing(true);
    const { data, error } = await supabase.functions.invoke("manage-hospital-user", {
      body: {
        action: "update",
        user_id: editTarget.user_id,
        hospital_id: hospitalId,
        full_name: editForm.full_name,
        phone: editForm.phone || null,
        email: editForm.email || undefined,
        password: editForm.password || undefined,
        role: editForm.role || undefined,
      },
    });
    setEditing(false);
    if (error || data?.error) {
      toast.error("Erro ao atualizar: " + (data?.error || error?.message));
      return;
    }
    toast.success("Usuário atualizado!");
    setEditOpen(false);
    setEditTarget(null);
    await fetchUsers(hospitalId);
  };

  // --- Deactivate / Activate ---
  const openConfirmDialog = (user: HospitalUser, action: "deactivate" | "activate") => {
    setConfirmTarget(user);
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleConfirmAction = async () => {
    if (!confirmTarget || !hospitalId) return;
    setActionLoading(true);
    const { data, error } = await supabase.functions.invoke("manage-hospital-user", {
      body: {
        action: confirmAction,
        user_id: confirmTarget.user_id,
        hospital_id: hospitalId,
      },
    });
    setActionLoading(false);
    if (error || data?.error) {
      toast.error("Erro: " + (data?.error || error?.message));
      return;
    }
    toast.success(
      confirmAction === "deactivate"
        ? "Usuário desativado com sucesso"
        : "Usuário reativado com sucesso"
    );
    setConfirmOpen(false);
    setConfirmTarget(null);
    await fetchUsers(hospitalId);
  };

  const getAssignableRole = (user: HospitalUser) => {
    return (user.user_roles || []).find(
      (r) => r.role !== "super_admin" && r.role !== "hospital_admin"
    );
  };

  const isAdminRole = (user: HospitalUser) => {
    return (user.user_roles || []).some(
      (r) => r.role === "hospital_admin" || r.role === "super_admin"
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Gerenciar Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {hospitalName && (
              <>Hospital: <span className="font-medium text-foreground">{hospitalName}</span></>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={loadHospitalAndUsers} className="flex-1 sm:flex-initial">
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>

          {/* Create Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex-1 sm:flex-initial">
                <UserPlus className="h-4 w-4 mr-1" /> Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
                <DialogDescription>
                  Defina nome, e-mail, perfil e a senha de acesso do novo usuário.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nome Completo *</Label>
                  <Input
                    value={createForm.full_name}
                    onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                    placeholder="Dr. Maria Silva"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-mail *</Label>
                    <Input
                      type="email"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                      placeholder="maria@hospital.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input
                      value={createForm.phone}
                      onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                      placeholder="(11) 99999-0000"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Perfil de Acesso *</Label>
                  <Select value={createForm.role} onValueChange={(v) => setCreateForm({ ...createForm, role: v })}>
                    <SelectTrigger><SelectValue placeholder="Selecione o perfil" /></SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Senha *</Label>
                    <Input
                      type="password"
                      value={createForm.password}
                      onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirmar Senha *</Label>
                    <Input
                      type="password"
                      value={createForm.confirm_password}
                      onChange={(e) => setCreateForm({ ...createForm, confirm_password: e.target.value })}
                      placeholder="Repita a senha"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
                <Button onClick={handleCreateUser} disabled={creating} className="w-full sm:w-auto">
                  {creating && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  Criar Usuário
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Separator />

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Usuários do Hospital</CardTitle>
              <CardDescription>{users.length} usuário(s) cadastrado(s)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {users.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum usuário cadastrado ainda.</p>
              <p className="text-xs mt-1">Clique em "Novo Usuário" para começar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="hidden md:table-cell">E-mail</TableHead>
                    <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                    <TableHead className="hidden sm:table-cell">Perfil</TableHead>
                    <TableHead className="hidden lg:table-cell">Tipo</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => {
                    const profile = u.profiles;
                    const roles = u.user_roles || [];
                    const isSelf = u.user_id === currentUserId;
                    const isAdmin = isAdminRole(u);

                    return (
                      <TableRow key={u.user_id}>
                        <TableCell className="font-medium align-top">
                          <div className="flex flex-wrap items-center gap-1">
                            <span className="break-all">{profile?.full_name || "—"}</span>
                            {isSelf && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Você
                              </Badge>
                            )}
                            {u.is_primary_admin && (
                              <Badge variant="outline" className="lg:hidden text-[10px] px-1.5 py-0 bg-primary/10 text-primary border-primary/30">
                                Admin
                              </Badge>
                            )}
                          </div>
                          {/* Mobile-only: e-mail, telefone e perfil empilhados */}
                          <div className="md:hidden mt-1 space-y-1">
                            <p className="text-xs text-muted-foreground break-all">{profile?.email || "—"}</p>
                            {profile?.phone && (
                              <p className="text-xs text-muted-foreground">{profile.phone}</p>
                            )}
                            <div className="flex flex-wrap gap-1 sm:hidden">
                              {roles.map((r, i) => (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className={`text-[10px] ${ROLE_COLORS[r.role] || ""}`}
                                >
                                  {ROLE_LABELS[r.role] || r.role}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground break-all">
                          {profile?.email || "—"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {profile?.phone || "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex flex-wrap gap-1">
                            {roles.map((r, i) => (
                              <Badge
                                key={i}
                                variant="outline"
                                className={`text-xs ${ROLE_COLORS[r.role] || ""}`}
                              >
                                {ROLE_LABELS[r.role] || r.role}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {u.is_primary_admin && (
                            <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                              Admin Principal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="align-top">
                          {!u.is_primary_admin && !isSelf && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {!isAdmin && (
                                  <DropdownMenuItem onClick={() => openEditDialog(u)}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => openConfirmDialog(u, "deactivate")}
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Desativar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => openConfirmDialog(u, "activate")}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Reativar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere as informações de{" "}
              <span className="font-medium text-foreground">
                {editTarget?.profiles?.full_name}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={editForm.full_name}
                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="usuario@hospital.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="(11) 99999-0000"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Nova Senha</Label>
              <Input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                placeholder="Deixe vazio para manter a senha atual"
                autoComplete="new-password"
              />
              <p className="text-xs text-muted-foreground">Mínimo 6 caracteres. Deixe vazio para não alterar.</p>
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select value={editForm.role} onValueChange={(v) => setEditForm({ ...editForm, role: v })}>
                <SelectTrigger><SelectValue placeholder="Manter atual" /></SelectTrigger>
                <SelectContent>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} className="w-full sm:w-auto">Cancelar</Button>
            <Button onClick={handleEditUser} disabled={editing} className="w-full sm:w-auto">
              {editing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate / Activate Confirmation */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmAction === "deactivate" ? (
                <><ShieldAlert className="h-5 w-5 text-destructive" /> Desativar Usuário</>
              ) : (
                <><UserCheck className="h-5 w-5 text-primary" /> Reativar Usuário</>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction === "deactivate" ? (
                <>
                  Tem certeza que deseja desativar{" "}
                  <span className="font-medium text-foreground">
                    {confirmTarget?.profiles?.full_name}
                  </span>
                  ? O usuário não poderá mais acessar o sistema.
                </>
              ) : (
                <>
                  Deseja reativar o acesso de{" "}
                  <span className="font-medium text-foreground">
                    {confirmTarget?.profiles?.full_name}
                  </span>
                  ? O usuário poderá voltar a acessar o sistema.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              disabled={actionLoading}
              className={confirmAction === "deactivate" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
            >
              {actionLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {confirmAction === "deactivate" ? "Desativar" : "Reativar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
