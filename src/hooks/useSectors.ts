import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "./useHospitalContext";
import { normalizeSector } from "@/lib/sectorUtils";

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
        // Normalize and deduplicate so "UTI 1" and "UTI 1 Adulto" appear as one entry
        const normalized = Array.from(
          new Set((data ?? []).map((s: { name: string }) => normalizeSector(s.name)))
        ).sort();
        setSectors(normalized);
        setLoading(false);
      });
  }, [hospitalId]);

  return { sectors, loading };
}
