import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "./useAuthReady";

export function useIsAdmin() {
  const { user, isReady } = useAuthReady();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const [{ data: isSuperAdmin }, { data: isHospitalAdmin }] = await Promise.all([
        supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
        supabase.rpc("has_role", { _user_id: user.id, _role: "hospital_admin" }),
      ]);
      setIsAdmin(Boolean(isSuperAdmin) || Boolean(isHospitalAdmin));
      setLoading(false);
    };

    check();
  }, [user, isReady]);

  return { isAdmin, loading };
}
