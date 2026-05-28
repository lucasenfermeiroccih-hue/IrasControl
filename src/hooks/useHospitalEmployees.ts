import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useHospitalEmployees(hospitalId: string | null) {
  const [employees, setEmployees] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    setLoading(true);

    const fetch = async () => {
      const { data } = await (supabase
        .from("hospital_users" as any)
        .select("user_id, profiles(full_name)")
        .eq("hospital_id", hospitalId) as any);

      const names: string[] = (data || [])
        .map((row: any) => row.profiles?.full_name as string | undefined)
        .filter((n): n is string => !!n)
        .sort((a: string, b: string) => a.localeCompare(b, "pt-BR"));

      setEmployees(names);
      setLoading(false);
    };

    fetch();
  }, [hospitalId]);

  return { employees, loading };
}
