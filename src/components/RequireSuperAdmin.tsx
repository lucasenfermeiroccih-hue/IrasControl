import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { Loader2, ShieldAlert } from "lucide-react";

export function RequireSuperAdmin() {
  const { user, isReady } = useAuthReady();
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized">("loading");

  useEffect(() => {
    if (!isReady || !user) return;

    const check = async () => {
      const [{ data: isSuperAdmin }, { data: isHospitalAdmin }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "hospital_admin" }),
      ]);

      setStatus(isSuperAdmin || isHospitalAdmin ? "authorized" : "unauthorized");
    };

    check();
  }, [user, isReady]);

  if (!isReady || (status === "loading" && !!user)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (status === "unauthorized") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return <Outlet />;
}
