import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Shield, Loader2, Building2, UserPlus, ArrowLeft, ArrowRight, CheckCircle, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const brazilianStates = [
  "AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA",
  "PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"
];

type Step = "auth-check" | "hospital" | "admin" | "success";

export default function Register() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("auth-check");
  const [loading, setLoading] = useState(false);

  // Hospital form
  const [hospitalForm, setHospitalForm] = useState({
    name: "", cnes: "", type: "geral", bed_count: "",
    city: "", state: "", contact_email: "", contact_phone: "",
  });

  // Admin form
  const [adminForm, setAdminForm] = useState({ full_name: "", email: "" });

  // Created hospital ID
  const [createdHospitalId, setCreatedHospitalId] = useState<string | null>(null);
  const [createdHospitalName, setCreatedHospitalName] = useState("");

  // Auth check — only super_admin can access
  useEffect(() => {
    let isActive = true;

    const checkAccess = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (!isActive) return;

      if (authError || !user) {
        await supabase.auth.signOut();
        toast.error("Você precisa estar autenticado como Super Admin");
        navigate("/login", { replace: true });
        return;
      }

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "super_admin",
      });

      if (!isActive) return;

      if (error || !data) {
        toast.error("Acesso restrito a Super Administradores");
        navigate("/dashboard", { replace: true });
        return;
      }

      setStep("hospital");
    };

    void checkAccess();

    return () => {
      isActive = false;
    };
  }, [navigate]);

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hospitalForm.name) {
      toast.error("Nome do hospital é obrigatório");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.from("hospitals").insert({
      name: hospitalForm.name,
      cnes: hospitalForm.cnes || null,
      type: hospitalForm.type,
      bed_count: hospitalForm.bed_count ? parseInt(hospitalForm.bed_count) : null,
      city: hospitalForm.city || null,
      state: hospitalForm.state || null,
      contact_email: hospitalForm.contact_email || null,
      contact_phone: hospitalForm.contact_phone || null,
      status: "pending" as const,
    }).select().single();

    setLoading(false);

    if (error) {
      toast.error("Erro ao cadastrar hospital: " + error.message);
      return;
    }

    setCreatedHospitalId(data.id);
    setCreatedHospitalName(data.name);
    toast.success("Hospital cadastrado!");
    setStep("admin");
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminForm.email || !adminForm.full_name || !createdHospitalId) {
      toast.error("Preencha todos os campos");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke("create-hospital-admin", {
      body: {
        email: adminForm.email,
        full_name: adminForm.full_name,
        hospital_id: createdHospitalId,
      },
    });

    setLoading(false);

    if (error || data?.error) {
      toast.error("Erro ao criar administrador: " + (data?.error || error?.message));
      return;
    }

    // Activate hospital
    await supabase
      .from("hospitals")
      .update({ status: "active" as const })
      .eq("id", createdHospitalId);

    toast.success("Administrador criado com sucesso!");
    setStep("success");
  };

  if (step === "auth-check") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <Link to="/super-admin" className="mx-auto mb-4 flex items-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">IRAS<span className="text-primary">Control</span></span>
          </Link>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className={`flex items-center gap-1.5 text-xs font-medium ${step === "hospital" ? "text-primary" : "text-muted-foreground"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === "hospital" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>
                {step === "hospital" ? "1" : <CheckCircle className="h-3.5 w-3.5" />}
              </div>
              Hospital
            </div>
            <div className="w-8 h-px bg-border" />
            <div className={`flex items-center gap-1.5 text-xs font-medium ${step === "admin" ? "text-primary" : step === "success" ? "text-muted-foreground" : "text-muted-foreground/50"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === "admin" ? "bg-primary text-primary-foreground" : step === "success" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
                {step === "success" ? <CheckCircle className="h-3.5 w-3.5" /> : "2"}
              </div>
              Administrador
            </div>
          </div>
        </CardHeader>

        {/* Step 1: Hospital */}
        {step === "hospital" && (
          <form onSubmit={handleCreateHospital}>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Dados do Hospital</CardTitle>
                  <CardDescription className="text-xs">Cadastre o hospital no sistema</CardDescription>
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
                      {brazilianStates.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
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
              <Button type="button" variant="outline" onClick={() => navigate("/super-admin")}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Próximo <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardFooter>
          </form>
        )}

        {/* Step 2: Admin */}
        {step === "admin" && (
          <form onSubmit={handleCreateAdmin}>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <UserPlus className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle className="text-lg">Primeiro Administrador</CardTitle>
                  <CardDescription className="text-xs">
                    Criar admin para <span className="font-medium text-foreground">{createdHospitalName}</span>
                  </CardDescription>
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

              <p className="text-xs text-muted-foreground">
                Um link de acesso será enviado para o e-mail informado. O administrador receberá o perfil{" "}
                <Badge variant="outline" className="text-xs">hospital_admin</Badge>
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={() => setStep("hospital")} disabled>
                <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Criar Administrador
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
                <h2 className="text-xl font-bold">Hospital Cadastrado!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">{createdHospitalName}</span> foi cadastrado
                  e o primeiro administrador foi criado com sucesso.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                O administrador receberá um e-mail com o link de acesso para configurar sua senha.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
              <Button className="w-full" onClick={() => navigate("/super-admin")}>
                Voltar ao Painel
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setStep("hospital");
                  setHospitalForm({ name: "", cnes: "", type: "geral", bed_count: "", city: "", state: "", contact_email: "", contact_phone: "" });
                  setAdminForm({ full_name: "", email: "" });
                  setCreatedHospitalId(null);
                  setCreatedHospitalName("");
                }}
              >
                <Plus className="h-4 w-4 mr-1" /> Cadastrar Outro Hospital
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
