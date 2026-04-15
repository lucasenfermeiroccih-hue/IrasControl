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
      // Use selected hospital from localStorage, or fall back to first
      const selectedId = localStorage.getItem("selected_hospital_id");

      if (selectedId) {
        setHospitalId(selectedId);
        const { data: hospital } = await supabase
          .from("hospitals")
          .select("name")
          .eq("id", selectedId)
          .single();
        if (hospital) setHospitalName(hospital.name);
      } else {
        const { data: membership } = await supabase
          .from("hospital_users")
          .select("hospital_id")
          .eq("user_id", user.id)
          .limit(1)
          .maybeSingle();

        if (membership) {
          setHospitalId(membership.hospital_id);
          localStorage.setItem("selected_hospital_id", membership.hospital_id);
          const { data: hospital } = await supabase
            .from("hospitals")
            .select("name")
            .eq("id", membership.hospital_id)
            .single();
          if (hospital) setHospitalName(hospital.name);
        }
      }
      setLoading(false);
    };
    fetch();
  }, [user, isReady]);

  return { hospitalId, hospitalName, userId: user?.id ?? null, loading };
}
