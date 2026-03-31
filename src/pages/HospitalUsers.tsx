import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, UserPlus, Users, RefreshCw } from "lucide-react";
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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    role: "",
  });

  useEffect(() => {
    loadHospitalAndUsers();
  }, []);

  const loadHospitalAndUsers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the hospital this user belongs to
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

      // Get hospital name
      const { data: hospital } = await supabase
        .from("hospitals")
        .select("name")
        .eq("id", membership.hospital_id)
        .single();

      if (hospital) setHospitalName(hospital.name);

      await fetchUsers(membership.hospital_id);
    } catch (err) {
      toast.error("Erro ao carregar dados");
    }
    setLoading(false);
  };

  const fetchUsers = async (hId: string) => {
    // Get all users linked to this hospital with profiles and roles
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

  const handleCreateUser = async () => {
    if (!form.email || !form.full_name || !form.role || !hospitalId) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setCreating(true);

    const { data, error } = await supabase.functions.invoke("create-hospital-user", {
      body: {
        email: form.email,
        full_name: form.full_name,
        phone: form.phone || null,
        hospital_id: hospitalId,
        role: form.role,
      },
    });

    setCreating(false);

    if (error || data?.error) {
      toast.error("Erro ao criar usuário: " + (data?.error || error?.message));
      return;
    }

    toast.success("Usuário criado com sucesso! Um link de acesso foi enviado por e-mail.");
    setForm({ full_name: "", email: "", phone: "", role: "" });
    setDialogOpen(false);
    await fetchUsers(hospitalId);
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
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
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    placeholder="Dr. Maria Silva"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail *</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="maria@hospital.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="(11) 99999-0000"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Perfil de Acesso *</Label>
                  <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSIGNABLE_ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const profile = u.profiles;
                  const roles = u.user_roles || [];
                  return (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">
                        {profile?.full_name || "—"}
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
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
