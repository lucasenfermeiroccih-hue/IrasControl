import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Shield, Loader2, Building2, UserPlus, ArrowLeft, ArrowRight,
  CheckCircle, Eye, EyeOff, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const brazilianStates = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO",
];

type Step = "checking" | "blocked" | "hospital" | "admin" | "success";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("checking");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Hospital form
  const [hospitalForm, setHospitalForm] = useState({
    name: "", cnes: "", type: "geral", bed_count: "",
    city: "", state: "", contact_email: "", contact_phone: "",
  });

  // Admin form
  const [adminForm, setAdminForm] = useState({
    full_name: "", email: "", password: "", confirmPassword: "",
  });

  useEffect(() => {
    const checkSetup = async () => {
      const { data, error } = await supabase.rpc("has_any_super_admin");
      if (error) {
        toast.error("Erro ao verificar status do sistema");
        setStep("blocked");
        return;
      }
      setStep(data ? "blocked" : "hospital");
    };
    checkSetup();
  }, []);

  const handleNextToAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hospitalForm.name) {
      toast.error("Nome do hospital é obrigatório");
      return;
    }
    setStep("admin");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminForm.full_name || !adminForm.email || !adminForm.password) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (adminForm.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (adminForm.password !== adminForm.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke("initial-setup", {
      body: {
        hospital_name: hospitalForm.name,
        hospital_cnes: hospitalForm.cnes,
        hospital_type: hospitalForm.type,
        hospital_bed_count: hospitalForm.bed_count,
        hospital_city: hospitalForm.city,
        hospital_state: hospitalForm.state,
        hospital_contact_email: hospitalForm.contact_email,
        hospital_contact_phone: hospitalForm.contact_phone,
        admin_full_name: adminForm.full_name,
        admin_email: adminForm.email,
        admin_password: adminForm.password,
      },
    });

    setLoading(false);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Erro ao realizar setup");
      return;
    }

    toast.success("Setup inicial concluído!");
    setStep("success");
  };

  // --- Loading state ---
  if (step === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // --- Blocked: setup already done ---
  if (step === "blocked") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <div className="mx-auto mb-2">
              <AlertTriangle className="h-12 w-12 text-destructive" />
            </div>
            <CardTitle>Setup já realizado</CardTitle>
            <CardDescription>
              O sistema já possui um Super Administrador configurado.
              Novos hospitais e usuários devem ser cadastrados pelo administrador.
            </CardDescription>
          </CardHeader>
          <CardFooter className="justify-center">
            <Button onClick={() => navigate("/login")}>
              Ir para o Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto mb-4 flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">IRAS<span className="text-primary">Control</span></span>
          </Link>
          <CardTitle className="text-lg">Configuração Inicial</CardTitle>
          <CardDescription className="text-xs">
            Cadastre o primeiro hospital e o administrador do sistema
          </CardDescription>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mt-3">
            <StepIndicator
              number={1}
              label="Hospital"
              active={step === "hospital"}
              completed={step === "admin" || step === "success"}
            />
            <div className="w-8 h-px bg-border" />
            <StepIndicator
              number={2}
              label="Super Admin"
              active={step === "admin"}
              completed={step === "success"}
            />
          </div>
        </CardHeader>

        {/* Step 1: Hospital */}
        {step === "hospital" && (
          <form onSubmit={handleNextToAdmin}>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">Dados do Hospital</p>
                  <p className="text-xs text-muted-foreground">Informações do primeiro hospital</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome do Hospital *</Label>
                <Input
                  value={hospitalForm.name}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, name: e.target.value })}
                  placeholder="Hospital São Lucas"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>CNES</Label>
                  <Input
                    value={hospitalForm.cnes}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, cnes: e.target.value })}
                    placeholder="1234567"
                    maxLength={7}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={hospitalForm.type} onValueChange={(v) => setHospitalForm({ ...hospitalForm, type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="geral">Hospital Geral</SelectItem>
                      <SelectItem value="especializado">Especializado</SelectItem>
                      <SelectItem value="universitario">Universitário</SelectItem>
                      <SelectItem value="upa">UPA</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    value={hospitalForm.city}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, city: e.target.value })}
                    placeholder="São Paulo"
                  />
                </div>
                <div className="space-y-2">
                  <Label>UF</Label>
                  <Select value={hospitalForm.state} onValueChange={(v) => setHospitalForm({ ...hospitalForm, state: v })}>
                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                    <SelectContent>
                      {brazilianStates.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Número de Leitos</Label>
                <Input
                  type="number"
                  value={hospitalForm.bed_count}
                  onChange={(e) => setHospitalForm({ ...hospitalForm, bed_count: e.target.value })}
                  placeholder="200"
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>E-mail de Contato</Label>
                  <Input
                    type="email"
                    value={hospitalForm.contact_email}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, contact_email: e.target.value })}
                    placeholder="ccih@hospital.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={hospitalForm.contact_phone}
                    onChange={(e) => setHospitalForm({ ...hospitalForm, contact_phone: e.target.value })}
                    placeholder="(11) 99999-0000"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => navigate("/login")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button type="submit">
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </form>
        )}

        {/* Step 2: Super Admin */}
        {step === "admin" && (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-semibold text-sm">Conta do Super Administrador</p>
                  <p className="text-xs text-muted-foreground">
                    Este será o administrador principal do sistema
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={adminForm.full_name}
                  onChange={(e) => setAdminForm({ ...adminForm, full_name: e.target.value })}
                  placeholder="Dr. Carlos Mendes"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>E-mail *</Label>
                <Input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  placeholder="admin@hospital.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Senha *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    placeholder="Mínimo 6 caracteres"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-10 w-10"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Confirmar Senha *</Label>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={adminForm.confirmPassword}
                  onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                  placeholder="Repita a senha"
                  required
                  minLength={6}
                />
              </div>

              <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2.5">
                O Super Admin poderá cadastrar novos hospitais e criar contas de usuários para cada hospital após o login.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep("hospital")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Criar Conta
              </Button>
            </CardFooter>
          </form>
        )}

        {/* Success */}
        {step === "success" && (
          <>
            <CardContent className="text-center space-y-4 py-8">
              <CheckCircle className="h-16 w-16 text-primary mx-auto" />
              <div>
                <h2 className="text-xl font-bold">Setup Concluído!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  O hospital <span className="font-medium text-foreground">{hospitalForm.name}</span> e
                  a conta de Super Admin foram criados com sucesso.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Faça login para começar a configurar o sistema, cadastrar outros hospitais e criar contas de usuários.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Ir para o Login
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}

function StepIndicator({ number, label, active, completed }: {
  number: number;
  label: string;
  active: boolean;
  completed: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 text-xs font-medium ${active ? "text-primary" : completed ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
        active ? "bg-primary text-primary-foreground" :
        completed ? "bg-primary/20 text-primary" :
        "bg-muted text-muted-foreground"
      }`}>
        {completed ? <CheckCircle className="h-3.5 w-3.5" /> : number}
      </div>
      {label}
    </div>
  );
}
