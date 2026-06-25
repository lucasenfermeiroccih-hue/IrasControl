import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "./useHospitalContext";

export function useSectors() {
  const { hospitalId } = useHospitalContext();
  const [sectors, setSectors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    setLoading(true);
    supabase
      .from("sectors")
      .select("name")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true)
      .order("name")
      .then(({ data }) => {
        setSectors(data?.map((s: { name: string }) => s.name) ?? []);
        setLoading(false);
      });
  }, [hospitalId]);

  return { sectors, loading };
}
