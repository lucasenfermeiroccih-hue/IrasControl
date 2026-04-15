import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Bell, Shield, LogOut, Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  hospital_admin: "Administrador",
  nurse_ccih: "Enfermeiro(a) CCIH",
  doctor: "Médico(a)",
  doctor_scih: "Médico(a) SCIH",
  nurse_tech_scih: "Téc. Enfermagem SCIH",
  lab_tech: "Técnico Lab.",
  biologist: "Biólogo(a)",
  administrative: "Administrativo",
  viewer: "Visualizador",
};

export default function UserProfile() {
  const navigate = useNavigate();
  const { user: authUser, isReady } = useAuthReady();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [hospitalName, setHospitalName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!isReady) return;
    if (!authUser) { navigate("/login"); return; }
    loadProfile(authUser.id, authUser.email || "");
  }, [isReady, authUser]);

  const loadProfile = async (userId: string, userEmail: string) => {
    setLoading(true);

    // Parallel: profile, roles, hospital membership
    const [{ data: profile }, { data: userRoles }, { data: membership }] = await Promise.all([
      supabase.from("profiles").select("full_name, email, phone").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("hospital_users").select("hospital_id, hospitals(name)").eq("user_id", userId).limit(1).maybeSingle(),
    ]);

    if (profile) {
      setName(profile.full_name || "");
      setEmail(profile.email || userEmail);
      setPhone(profile.phone || "");
    } else {
      setEmail(userEmail);
    }

    setRoles((userRoles || []).map((r: any) => r.role));

    if (membership) {
      const hosp = (membership as any).hospitals;
      if (hosp) setHospitalName(hosp.name);
    }

    // Avatar
    const { data: files } = await supabase.storage
      .from("avatars")
      .list(userId, { limit: 1, sortBy: { column: "created_at", order: "desc" } });

    if (files && files.length > 0) {
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(`${userId}/${files[0].name}`);
      setAvatarUrl(urlData.publicUrl);
    }

    setLoading(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: name, phone: phone || null })
      .eq("user_id", user.id);

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
    } else {
      toast.success("Dados atualizados com sucesso!");
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!validTypes.includes(file.type)) { toast.error("Formato inválido. Use JPG, PNG ou WebP."); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("A imagem deve ter no máximo 2MB."); return; }

    setUploadingAvatar(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Usuário não autenticado"); setUploadingAvatar(false); return; }

    const ext = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage.from("avatars").upload(filePath, file, { upsert: true });
    setUploadingAvatar(false);

    if (error) { toast.error("Erro ao enviar foto: " + error.message); return; }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    setAvatarUrl(`${urlData.publicUrl}?t=${Date.now()}`);
    toast.success("Foto atualizada com sucesso!");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("selected_hospital_id");
    navigate("/login");
  };

  const initials = name
    ? name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <User className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais e preferências</p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleAvatarChange}
      />

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4">
          <div className="relative group">
            <Avatar className="h-20 w-20">
              <AvatarImage src={avatarUrl || undefined} alt={name} />
              <AvatarFallback className="bg-primary text-primary-foreground text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute inset-0 rounded-full bg-foreground/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer disabled:cursor-wait"
            >
              {uploadingAvatar ? (
                <Loader2 className="h-5 w-5 text-background animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-background" />
              )}
            </button>
          </div>
          <div className="text-center md:text-left flex-1">
            <h2 className="text-xl font-bold">{name || "Usuário"}</h2>
            <p className="text-sm text-muted-foreground">{email}</p>
            {hospitalName && (
              <p className="text-xs text-muted-foreground mt-0.5">{hospitalName}</p>
            )}
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
              {roles.map((r) => (
                <Badge key={r} className="bg-primary/10 text-primary border-primary/30" variant="outline">
                  {ROLE_LABELS[r] || r}
                </Badge>
              ))}
              {roles.length === 0 && (
                <Badge variant="outline">Sem perfil atribuído</Badge>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Camera className="h-4 w-4 mr-1" />}
            Alterar Foto
          </Button>
        </CardContent>
      </Card>

      <Tabs defaultValue="personal">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Informações Profissionais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input value={email} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(11) 99999-0000" />
                </div>
              </div>
              <Button onClick={handleSaveProfile} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Alterar Senha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nova Senha</Label>
                <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Nova Senha</Label>
                <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword}>
                {changingPassword && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Alterar Senha
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Informações da Conta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Perfis de Acesso</p>
                  <p className="text-xs text-muted-foreground">
                    {roles.map(r => ROLE_LABELS[r] || r).join(", ") || "Nenhum"}
                  </p>
                </div>
              </div>
              {hospitalName && (
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <p className="text-sm font-medium">Hospital Vinculado</p>
                    <p className="text-xs text-muted-foreground">{hospitalName}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Notificações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "Alertas críticos por e-mail", desc: "Receber notificação imediata de alertas críticos" },
                { label: "Resumo diário", desc: "Relatório consolidado diário às 07:00" },
                { label: "Novos resultados laboratoriais", desc: "Notificar quando houver resultados de cultura" },
                { label: "Casos de investigação", desc: "Atualizações de casos atribuídos a mim" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-1">
                  <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                  <Switch defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>

          <Separator />
          <Button variant="outline" className="text-destructive w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />Sair da Conta
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
