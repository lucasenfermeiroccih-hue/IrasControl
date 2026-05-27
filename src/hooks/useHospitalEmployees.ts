import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "@/hooks/useHospitalContext";

export function useHospitalEmployees() {
  const { hospitalId } = useHospitalContext();
  const [employees, setEmployees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: members } = await supabase
        .from("hospital_users")
        .select("user_id")
        .eq("hospital_id", hospitalId);
      const ids = (members || []).map((m: any) => m.user_id);
      if (ids.length === 0) {
        if (!cancelled) { setEmployees([]); setLoading(false); }
        return;
      }
      const { data: profiles } = await supabase
        .from("profiles")
        .select("full_name, email")
        .in("user_id", ids);
      const names = (profiles || [])
        .map((p: any) => p.full_name || p.email)
        .filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b, "pt-BR"));
      if (!cancelled) { setEmployees(names); setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [hospitalId]);

  return { employees, loading };
}
