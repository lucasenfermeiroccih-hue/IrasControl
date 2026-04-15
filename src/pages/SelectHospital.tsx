import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Building2, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";

interface HospitalOption {
  hospital_id: string;
  is_primary_admin: boolean;
  hospital: {
    name: string;
    city: string | null;
    state: string | null;
    type: string;
  };
}

export default function SelectHospital() {
  const navigate = useNavigate();
  const { user, isReady } = useAuthReady();
  const [hospitals, setHospitals] = useState<HospitalOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    const load = async () => {
      const { data, error } = await supabase
        .from("hospital_users")
        .select("hospital_id, is_primary_admin, hospitals(name, city, state, type)")
        .eq("user_id", user.id);

      if (error) {
        toast.error("Erro ao carregar hospitais");
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((row: any) => ({
        hospital_id: row.hospital_id,
        is_primary_admin: row.is_primary_admin,
        hospital: row.hospitals,
      }));

      if (mapped.length === 1) {
        localStorage.setItem("selected_hospital_id", mapped[0].hospital_id);
        navigate("/dashboard");
        return;
      }

      if (mapped.length === 0) {
        toast.error("Nenhum hospital vinculado à sua conta");
        navigate("/login");
        return;
      }

      setHospitals(mapped);
      setLoading(false);
    };
    load();
  }, [user, isReady, navigate]);

  const selectHospital = (hospitalId: string) => {
    localStorage.setItem("selected_hospital_id", hospitalId);
    toast.success("Hospital selecionado!");
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("selected_hospital_id");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const typeLabels: Record<string, string> = {
    geral: "Hospital Geral",
    especializado: "Especializado",
    universitario: "Universitário",
    upa: "UPA",
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-8">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold">IRAS<span className="text-primary">Control</span></span>
          </div>
          <h1 className="text-xl font-bold">Selecionar Hospital</h1>
          <p className="text-sm text-muted-foreground">
            Escolha o hospital que deseja acessar
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {hospitals.map((h) => (
            <Card
              key={h.hospital_id}
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
              onClick={() => selectHospital(h.hospital_id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{h.hospital.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {typeLabels[h.hospital.type] || h.hospital.type}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {[h.hospital.city, h.hospital.state].filter(Boolean).join(" - ") || "Local não informado"}
                  </span>
                  {h.is_primary_admin && (
                    <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center">
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-1" /> Sair
          </Button>
        </div>
      </div>
    </div>
  );
}