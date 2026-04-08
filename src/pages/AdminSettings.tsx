import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Settings, Building2, Users, Bell, Shield, Database, Mail, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

interface HospitalUser {
  user_id: string;
  is_primary_admin: boolean;
  profile?: { full_name: string; email: string };
  role?: string;
}

export default function AdminSettings() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [hospitalData, setHospitalData] = useState<any>(null);
  const [users, setUsers] = useState<HospitalUser[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState({ email: true, push: true, critical: true, daily: false, weekly: true });

  useEffect(() => {
    if (!hospitalId) return;
    const fetch = async () => {
      setLoading(true);
      const [{ data: hospital }, { data: sectorData }, { data: huData }] = await Promise.all([
        supabase.from("hospitals").select("*").eq("id", hospitalId).single(),
        supabase.from("sectors").select("name").eq("hospital_id", hospitalId).eq("is_active", true),
        supabase.from("hospital_users").select("user_id, is_primary_admin").eq("hospital_id", hospitalId),
      ]);

      if (hospital) setHospitalData(hospital);
      if (sectorData) setSectors(sectorData.map((s: any) => s.name));

      if (huData && huData.length > 0) {
        const userIds = huData.map((h: any) => h.user_id);
        const { data: profiles } = await supabase.from("profiles").select("user_id, full_name, email").in("user_id", userIds);
        const { data: roles } = await supabase.from("user_roles").select("user_id, role").in("user_id", userIds);

        const merged = huData.map((hu: any) => ({
          ...hu,
          profile: profiles?.find((p: any) => p.user_id === hu.user_id),
          role: roles?.find((r: any) => r.user_id === hu.user_id)?.role || "viewer",
        }));
        setUsers(merged);
      }
      setLoading(false);
    };
    fetch();
  }, [hospitalId]);

  const handleSaveHospital = async () => {
    if (!hospitalId || !hospitalData) return;
    const { error } = await supabase.from("hospitals").update({
      name: hospitalData.name,
      cnes: hospitalData.cnes,
      type: hospitalData.type,
      bed_count: hospitalData.bed_count,
      contact_email: hospitalData.contact_email,
    }).eq("id", hospitalId);
    if (error) { toast.error("Erro: " + error.message); return; }
    toast.success("Dados da instituição salvos");
  };

  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    hospital_admin: "Administrador",
    nurse_ccih: "Enfermeiro CCIH",
    doctor: "Médico",
    doctor_scih: "Médico SCIH",
    nurse_tech_scih: "Téc. Enfermagem SCIH",
    lab_tech: "Técnico Lab",
    biologist: "Biólogo",
    administrative: "Administrativo",
    viewer: "Visualizador",
  };

  if (ctxLoading || loading) {
    return <div className="flex items-center justify-center min-h-[40vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
          <p className="text-sm text-muted-foreground">Administração do sistema, usuários e preferências</p>
        </div>
      </div>

      <Tabs defaultValue="org">
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="org"><Building2 className="h-4 w-4 mr-1" />Organização</TabsTrigger>
          <TabsTrigger value="users"><Users className="h-4 w-4 mr-1" />Usuários</TabsTrigger>
          <TabsTrigger value="notifications"><Bell className="h-4 w-4 mr-1" />Notificações</TabsTrigger>
          <TabsTrigger value="security"><Shield className="h-4 w-4 mr-1" />Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="space-y-4 mt-4">
          {hospitalData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados da Instituição</CardTitle>
                <CardDescription>Informações cadastrais do hospital</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome da Instituição</Label>
                    <Input value={hospitalData.name || ""} onChange={e => setHospitalData((h: any) => ({ ...h, name: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>CNES</Label>
                    <Input value={hospitalData.cnes || ""} onChange={e => setHospitalData((h: any) => ({ ...h, cnes: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={hospitalData.type || "geral"} onValueChange={v => setHospitalData((h: any) => ({ ...h, type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="geral">Hospital Geral</SelectItem>
                        <SelectItem value="especializado">Hospital Especializado</SelectItem>
                        <SelectItem value="universitario">Hospital Universitário</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Número de Leitos</Label>
                    <Input type="number" value={hospitalData.bed_count || 0} onChange={e => setHospitalData((h: any) => ({ ...h, bed_count: Number(e.target.value) }))} />
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-mail de Contato</Label>
                    <Input value={hospitalData.contact_email || ""} onChange={e => setHospitalData((h: any) => ({ ...h, contact_email: e.target.value }))} />
                  </div>
                </div>
                <Button onClick={handleSaveHospital}>Salvar Alterações</Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" />Setores Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {sectors.length > 0
                  ? sectors.map(s => <Badge key={s} variant="outline" className="border-primary/30">{s}</Badge>)
                  : <p className="text-sm text-muted-foreground">Nenhum setor cadastrado</p>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">{users.length} usuários vinculados</p>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="hidden md:table-cell">Perfil</TableHead>
                    <TableHead>Admin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.user_id}>
                      <TableCell>
                        <p className="font-medium text-sm">{u.profile?.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{u.profile?.email || "—"}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{roleLabels[u.role || "viewer"] || u.role}</TableCell>
                      <TableCell>
                        {u.is_primary_admin && <Badge className="bg-primary text-primary-foreground">Admin</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">Nenhum usuário</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Preferências de Notificação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "email" as const, label: "Notificações por E-mail", desc: "Receber alertas e resumos por e-mail" },
                { key: "push" as const, label: "Notificações Push", desc: "Alertas em tempo real no navegador" },
                { key: "critical" as const, label: "Alertas Críticos", desc: "Notificação imediata para alertas de prioridade crítica" },
                { key: "daily" as const, label: "Resumo Diário", desc: "Relatório diário consolidado às 07:00" },
                { key: "weekly" as const, label: "Resumo Semanal", desc: "Relatório semanal enviado às segundas-feiras" },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.desc}</p></div>
                  <Switch checked={notifications[item.key]} onCheckedChange={v => setNotifications({ ...notifications, [item.key]: v })} />
                </div>
              ))}
              <Button onClick={() => toast.success("Preferências salvas")}>Salvar Preferências</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Políticas de Segurança</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div><p className="text-sm font-medium">Autenticação de Dois Fatores (2FA)</p><p className="text-xs text-muted-foreground">Exigir 2FA para todos os administradores</p></div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between py-2">
                <div><p className="text-sm font-medium">Expiração de Sessão</p><p className="text-xs text-muted-foreground">Encerrar sessão após inatividade</p></div>
                <Select defaultValue="30"><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="15">15 min</SelectItem><SelectItem value="30">30 min</SelectItem><SelectItem value="60">60 min</SelectItem></SelectContent></Select>
              </div>
              <div className="flex items-center justify-between py-2">
                <div><p className="text-sm font-medium">Log de Auditoria</p><p className="text-xs text-muted-foreground">Registrar todas as ações no sistema</p></div>
                <Switch defaultChecked />
              </div>
              <Button onClick={() => toast.success("Políticas de segurança atualizadas")}>Salvar Políticas</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
