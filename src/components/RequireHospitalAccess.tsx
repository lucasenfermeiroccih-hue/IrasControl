import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";

type AccessState = "loading" | "authorized" | "select_hospital" | "unauthenticated";

export function RequireHospitalAccess() {
  const { user, isReady } = useAuthReady();
  const [status, setStatus] = useState<AccessState>("loading");

  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      setStatus("unauthenticated");
      return;
    }

    const validateAccess = async () => {
      const selectedHospitalId = localStorage.getItem("selected_hospital_id");

      const { data: memberships } = await supabase
        .from("hospital_users")
        .select("hospital_id")
        .eq("user_id", user.id);

      const hospitalIds = (memberships || []).map((membership) => membership.hospital_id);

      if (hospitalIds.length === 0) {
        localStorage.removeItem("selected_hospital_id");
        setStatus("unauthenticated");
        return;
      }

      if (selectedHospitalId && hospitalIds.includes(selectedHospitalId)) {
        setStatus("authorized");
        return;
      }

      if (hospitalIds.length === 1) {
        localStorage.setItem("selected_hospital_id", hospitalIds[0]);
        setStatus("authorized");
        return;
      }

      localStorage.removeItem("selected_hospital_id");
      setStatus("select_hospital");
    };

    validateAccess();
  }, [isReady, user]);

  if (!isReady || status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace />;
  }

  if (status === "select_hospital") {
    return <Navigate to="/select-hospital" replace />;
  }

  return <Outlet />;
}