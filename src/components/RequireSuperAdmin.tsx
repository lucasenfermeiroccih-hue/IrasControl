import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Outlet } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ShieldAlert } from "lucide-react";

export function RequireSuperAdmin() {
  const [status, setStatus] = useState<"loading" | "authorized" | "unauthorized" | "unauthenticated">("loading");

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus("unauthenticated");
        return;
      }

      const [{ data: isSuperAdmin }, { data: isHospitalAdmin }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: session.user.id, _role: "super_admin" }),
        supabase.rpc("has_role", { _user_id: session.user.id, _role: "hospital_admin" }),
      ]);

      setStatus(isSuperAdmin || isHospitalAdmin ? "authorized" : "unauthorized");
    };

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => subscription.unsubscribe();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === "unauthenticated") {
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
