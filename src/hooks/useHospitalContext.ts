import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";

export function useHospitalContext() {
  const { user, isReady } = useAuthReady();
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [hospitalName, setHospitalName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      const selectedId = localStorage.getItem("selected_hospital_id");

      const { data: memberships } = await supabase
        .from("hospital_users")
        .select("hospital_id")
        .eq("user_id", user.id);

      const hospitalIds = (memberships || []).map((item: any) => item.hospital_id);
      const resolvedHospitalId = selectedId && hospitalIds.includes(selectedId)
        ? selectedId
        : hospitalIds[0] ?? null;

      if (!resolvedHospitalId) {
        localStorage.removeItem("selected_hospital_id");
        setHospitalId(null);
        setHospitalName("");
        setLoading(false);
        return;
      }

      if (resolvedHospitalId !== selectedId) {
        localStorage.setItem("selected_hospital_id", resolvedHospitalId);
      }

      setHospitalId(resolvedHospitalId);

      const { data: hospital } = await supabase
        .from("hospitals")
        .select("name")
        .eq("id", resolvedHospitalId)
        .single();

      if (hospital) {
        setHospitalName(hospital.name);
      }

      setLoading(false);
    };
    fetch();
  }, [user, isReady]);

  return { hospitalId, hospitalName, userId: user?.id ?? null, loading };
}
