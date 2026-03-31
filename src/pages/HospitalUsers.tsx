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

const ROLE_LABELS: Record<string, string> = {
  hospital_admin: "Administrador",
  nurse_ccih: "Enfermeiro(a) CCIH",
  doctor: "Médico(a)",
  lab_tech: "Técnico Lab.",
  viewer: "Visualizador",
};

const ROLE_COLORS: Record<string, string> = {
  hospital_admin: "bg-primary/10 text-primary border-primary/30",
  nurse_ccih: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  doctor: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  lab_tech: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  viewer: "bg-muted text-muted-foreground border-border",
};

const ASSIGNABLE_ROLES = [
  { value: "nurse_ccih", label: "Enfermeiro(a) CCIH" },
  { value: "doctor", label: "Médico(a)" },
  { value: "lab_tech", label: "Técnico de Laboratório" },
  { value: "viewer", label: "Visualizador" },
];

interface HospitalUser {
  user_id: string;
  is_primary_admin: boolean;
  profiles: { full_name: string; email: string; phone: string | null } | null;
  user_roles: { role: string }[] | null;
}

export default function HospitalUsers() {
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [hospitalName, setHospitalName] = useState("");
  const [users, setUsers] = useState<HospitalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ full_name: "", email: "", phone: "", role: "" });

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTarget, setEditTarget] = useState<HospitalUser | null>(null);
  const [editForm, setEditForm] = useState({ full_name: "", phone: "", role: "" });

  // Deactivate/activate confirmation
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"deactivate" | "activate">("deactivate");
  const [confirmTarget, setConfirmTarget] = useState<HospitalUser | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadHospitalAndUsers();
  }, []);

  const loadHospitalAndUsers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUserId(user.id);

      const { data: membership } = await supabase
        .from("hospital_users")
        .select("hospital_id")
        .eq("user_id", user.id)
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
    const { data, error } = await supabase
      .from("hospital_users")
      .select(`
        user_id,
        is_primary_admin,
        profiles!inner(full_name, email, phone),
        user_roles(role)
      `)
      .eq("hospital_id", hId);

    if (error) {
      console.error("Error fetching users:", error);
      return;
    }
    setUsers((data as unknown as HospitalUser[]) || []);
  };

  // --- Create ---
  const handleCreateUser = async () => {
    if (!createForm.email || !createForm.full_name || !createForm.role || !hospitalId) {
      toast.error("Preencha todos os campos obrigatórios");
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
      },
    });
    setCreating(false);
    if (error || data?.error) {
      toast.error("Erro ao criar usuário: " + (data?.error || error?.message));
      return;
    }
    toast.success("Usuário criado com sucesso!");
    setCreateForm({ full_name: "", email: "", phone: "", role: "" });
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
      phone: user.profiles?.phone || "",
      role: mainRole?.role || "",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gerenciar Usuários</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hospitalName && (
              <>Hospital: <span className="font-medium text-foreground">{hospitalName}</span></>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadHospitalAndUsers}>
            <RefreshCw className="h-4 w-4 mr-1" /> Atualizar
          </Button>

          {/* Create Dialog */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="h-4 w-4 mr-1" /> Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
                <DialogDescription>
                  O usuário receberá um e-mail com link de acesso para definir sua senha.
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreateUser} disabled={creating}>
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
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum usuário cadastrado ainda.</p>
              <p className="text-xs mt-1">Clique em "Novo Usuário" para começar.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Perfil</TableHead>
                  <TableHead>Tipo</TableHead>
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
                      <TableCell className="font-medium">
                        {profile?.full_name || "—"}
                        {isSelf && (
                          <Badge variant="secondary" className="ml-2 text-[10px] px-1.5 py-0">
                            Você
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {profile?.email || "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {profile?.phone || "—"}
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        {u.is_primary_admin && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            Admin Principal
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
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
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
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
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="(11) 99999-0000"
              />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEditUser} disabled={editing}>
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
