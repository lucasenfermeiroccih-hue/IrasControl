import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Building2, Loader2, LogOut } from "lucide-react";
import { toast } from "sonner";
import { clearAllSelectedHospitalIds, setSelectedHospitalId } from "@/lib/selectedHospital";

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
        setSelectedHospitalId(user.id, mapped[0].hospital_id);
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
    setSelectedHospitalId(user?.id, hospitalId);
    toast.success("Hospital selecionado!");
    navigate("/dashboard");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearAllSelectedHospitalIds(user?.id);
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
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-3 sm:px-4 py-6 sm:py-8">
      <div className="w-full max-w-2xl space-y-4 sm:space-y-6">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-3 sm:mb-4">
            <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
            <span className="text-lg sm:text-xl md:text-2xl font-bold">IRAS<span className="text-primary">Control</span></span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold">Selecionar Hospital</h1>
          <p className="text-xs sm:text-sm text-muted-foreground px-2">
            Escolha o hospital que deseja acessar
          </p>
        </div>

        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
          {hospitals.map((h) => (
            <Card
              key={h.hospital_id}
              className="cursor-pointer transition-all hover:border-primary hover:shadow-md active:scale-[0.99]"
              onClick={() => selectHospital(h.hospital_id)}
            >
              <CardHeader className="pb-2 p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 shrink-0">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm sm:text-base truncate">{h.hospital.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {typeLabels[h.hospital.type] || h.hospital.type}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 p-3 sm:p-4 sm:pt-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground truncate">
                    {[h.hospital.city, h.hospital.state].filter(Boolean).join(" - ") || "Local não informado"}
                  </span>
                  {h.is_primary_admin && (
                    <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full shrink-0">
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