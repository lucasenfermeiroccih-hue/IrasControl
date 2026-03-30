import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, Lock, Bell, Clock, Shield, LogOut } from "lucide-react";
import { toast } from "sonner";

export default function UserProfile() {
  const [name, setName] = useState("Dr. Carlos Mendes");
  const [email] = useState("carlos.mendes@hospital.com");
  const [phone, setPhone] = useState("(11) 99876-5432");
  const [specialty, setSpecialty] = useState("Infectologia");
  const [council, setCouncil] = useState("CRM-SP 123456");

  return (
    <div className="space-y-4 md:space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <User className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">Gerencie suas informações pessoais e preferências</p>
        </div>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6 flex flex-col md:flex-row items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary text-primary-foreground text-2xl">CM</AvatarFallback>
          </Avatar>
          <div className="text-center md:text-left flex-1">
            <h2 className="text-xl font-bold">{name}</h2>
            <p className="text-sm text-muted-foreground">{email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-2">
              <Badge className="bg-primary text-primary-foreground">Administrador</Badge>
              <Badge variant="outline">CCIH</Badge>
              <Badge variant="outline">{specialty}</Badge>
            </div>
          </div>
          <Button variant="outline" size="sm">Alterar Foto</Button>
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
                <div className="space-y-2"><Label>Nome Completo</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-2"><Label>E-mail</Label><Input value={email} disabled className="bg-muted" /></div>
                <div className="space-y-2"><Label>Telefone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
                <div className="space-y-2"><Label>Especialidade</Label><Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} /></div>
                <div className="space-y-2"><Label>Registro Conselho</Label><Input value={council} onChange={(e) => setCouncil(e.target.value)} /></div>
                <div className="space-y-2">
                  <Label>Setor Principal</Label>
                  <Select defaultValue="ccih">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ccih">CCIH</SelectItem>
                      <SelectItem value="uti">UTI Adulto</SelectItem>
                      <SelectItem value="neonatal">UTI Neonatal</SelectItem>
                      <SelectItem value="clinica">Clínica Médica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => toast.success("Dados atualizados com sucesso")}>Salvar Alterações</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Lock className="h-4 w-4" />Alterar Senha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2"><Label>Senha Atual</Label><Input type="password" placeholder="••••••••" /></div>
              <div className="space-y-2"><Label>Nova Senha</Label><Input type="password" placeholder="••••••••" /></div>
              <div className="space-y-2"><Label>Confirmar Nova Senha</Label><Input type="password" placeholder="••••••••" /></div>
              <Button onClick={() => toast.success("Senha alterada com sucesso")}>Alterar Senha</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" />Autenticação de Dois Fatores</CardTitle>
              <CardDescription>Adicione uma camada extra de segurança à sua conta</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">2FA via Aplicativo</p>
                  <p className="text-xs text-muted-foreground">Google Authenticator ou similar</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" />Sessões Ativas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Chrome — Windows 11</p>
                  <p className="text-xs text-muted-foreground">São Paulo, BR · Agora (sessão atual)</p>
                </div>
                <Badge className="bg-emerald-500 text-white">Ativa</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">Safari — iPad</p>
                  <p className="text-xs text-muted-foreground">São Paulo, BR · 28/03/2026 16:30</p>
                </div>
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => toast.success("Sessão encerrada")}>Encerrar</Button>
              </div>
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

          <Card>
            <CardHeader><CardTitle className="text-base">Preferências de Interface</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Tema</p><p className="text-xs text-muted-foreground">Aparência do sistema</p></div>
                <Select defaultValue="light"><SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="light">Claro</SelectItem><SelectItem value="dark">Escuro</SelectItem><SelectItem value="auto">Automático</SelectItem></SelectContent></Select>
              </div>
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium">Idioma</p><p className="text-xs text-muted-foreground">Idioma da interface</p></div>
                <Select defaultValue="pt-BR"><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pt-BR">Português (BR)</SelectItem><SelectItem value="en">English</SelectItem><SelectItem value="es">Español</SelectItem></SelectContent></Select>
              </div>
              <Button onClick={() => toast.success("Preferências salvas")}>Salvar Preferências</Button>
            </CardContent>
          </Card>

          <Separator />
          <Button variant="outline" className="text-destructive w-full" onClick={() => toast.info("Você seria desconectado")}><LogOut className="h-4 w-4 mr-2" />Sair da Conta</Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
