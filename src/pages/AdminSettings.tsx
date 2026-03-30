import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Settings, Building2, Users, Bell, Shield, Database, Plus, Pencil, Trash2, Mail, Lock } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  sector: string;
  status: "ativo" | "inativo" | "pendente";
  lastAccess: string;
}

const mockUsers: User[] = [
  { id: "1", name: "Dr. Carlos Mendes", email: "carlos.mendes@hospital.com", role: "Administrador", sector: "CCIH", status: "ativo", lastAccess: "29/03/2026 08:15" },
  { id: "2", name: "Enf. Ana Paula", email: "ana.paula@hospital.com", role: "Enfermeiro CCIH", sector: "UTI Adulto", status: "ativo", lastAccess: "29/03/2026 07:45" },
  { id: "3", name: "Enf. Roberto Silva", email: "roberto.silva@hospital.com", role: "Enfermeiro CCIH", sector: "UTI Neonatal", status: "ativo", lastAccess: "28/03/2026 16:30" },
  { id: "4", name: "Dr. Maria Souza", email: "maria.souza@hospital.com", role: "Médico Infectologista", sector: "CCIH", status: "ativo", lastAccess: "29/03/2026 09:00" },
  { id: "5", name: "Tec. João Lima", email: "joao.lima@hospital.com", role: "Técnico Lab", sector: "Laboratório", status: "ativo", lastAccess: "28/03/2026 14:20" },
  { id: "6", name: "Enf. Patrícia Costa", email: "patricia.costa@hospital.com", role: "Enfermeiro", sector: "Clínica Médica", status: "inativo", lastAccess: "15/03/2026 10:00" },
  { id: "7", name: "Dr. Fernando Alves", email: "fernando.alves@hospital.com", role: "Médico", sector: "Cirúrgica", status: "pendente", lastAccess: "—" },
];

const statusColors: Record<string, string> = {
  ativo: "bg-emerald-100 text-emerald-800 border-emerald-200",
  inativo: "bg-gray-100 text-gray-800 border-gray-200",
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

export default function AdminSettings() {
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [notifications, setNotifications] = useState({ email: true, push: true, critical: true, daily: false, weekly: true });
  const [orgName, setOrgName] = useState("Hospital São Lucas");
  const [orgCnes, setOrgCnes] = useState("2345678");

  return (
    <div className="space-y-6">
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
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dados da Instituição</CardTitle>
              <CardDescription>Informações cadastrais do hospital</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome da Instituição</Label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>CNES</Label>
                  <Input value={orgCnes} onChange={(e) => setOrgCnes(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select defaultValue="geral">
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
                  <Input type="number" defaultValue="320" />
                </div>
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Responsável CCIH</Label>
                  <Input defaultValue="Dr. Carlos Mendes" />
                </div>
                <div className="space-y-2">
                  <Label>E-mail CCIH</Label>
                  <Input defaultValue="ccih@hospitalsaolucas.com" />
                </div>
              </div>
              <Button onClick={() => toast.success("Dados da instituição salvos")}>Salvar Alterações</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4" />Setores Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {["UTI Adulto", "UTI Neonatal", "Clínica Médica", "Cirúrgica", "Emergência", "Centro Cirúrgico", "Laboratório", "Farmácia"].map((s) => (
                  <Badge key={s} variant="outline" className="border-primary/30">{s}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">{mockUsers.length} usuários cadastrados</p>
            <Button size="sm" onClick={() => setShowUserDialog(true)}><Plus className="h-4 w-4 mr-1" />Novo Usuário</Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead className="hidden md:table-cell">Perfil</TableHead>
                    <TableHead className="hidden md:table-cell">Setor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Último Acesso</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <p className="font-medium text-sm">{u.name}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{u.role}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{u.sector}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColors[u.status]}>{u.status}</Badge></TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{u.lastAccess}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="icon" variant="ghost"><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" />Preferências de Notificação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { key: "email" as const, label: "Notificações por E-mail", desc: "Receber alertas e resumos por e-mail" },
                { key: "push" as const, label: "Notificações Push", desc: "Alertas em tempo real no navegador" },
                { key: "critical" as const, label: "Alertas Críticos", desc: "Notificação imediata para alertas de prioridade crítica" },
                { key: "daily" as const, label: "Resumo Diário", desc: "Relatório diário consolidado às 07:00" },
                { key: "weekly" as const, label: "Resumo Semanal", desc: "Relatório semanal enviado às segundas-feiras" },
              ].map((item) => (
                <div key={item.key} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <Switch checked={notifications[item.key]} onCheckedChange={(v) => setNotifications({ ...notifications, [item.key]: v })} />
                </div>
              ))}
              <Button onClick={() => toast.success("Preferências salvas")}>Salvar Preferências</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Políticas de Segurança</CardTitle>
            </CardHeader>
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
                <div><p className="text-sm font-medium">Complexidade de Senha</p><p className="text-xs text-muted-foreground">Mínimo 8 caracteres, maiúscula, número e especial</p></div>
                <Switch defaultChecked />
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

      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Cadastrar um novo usuário no sistema</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome Completo</Label><Input placeholder="Nome do profissional" /></div>
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" placeholder="email@hospital.com" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Perfil</Label>
                <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="enfccih">Enfermeiro CCIH</SelectItem><SelectItem value="medico">Médico</SelectItem><SelectItem value="teclab">Técnico Lab</SelectItem></SelectContent></Select>
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Select><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="ccih">CCIH</SelectItem><SelectItem value="uti">UTI Adulto</SelectItem><SelectItem value="neonatal">UTI Neonatal</SelectItem><SelectItem value="clinica">Clínica Médica</SelectItem></SelectContent></Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancelar</Button>
            <Button onClick={() => { setShowUserDialog(false); toast.success("Convite enviado com sucesso"); }}>Enviar Convite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
