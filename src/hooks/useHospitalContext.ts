import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { clearAllSelectedHospitalIds, getSelectedHospitalId, setSelectedHospitalId } from "@/lib/selectedHospital";

interface Contexto { hospitalId: string | null; hospitalName: string; hospitalType: string }

/**
 * Cache compartilhado: dezenas de componentes usam este hook ao mesmo tempo;
 * todos aproveitam a mesma consulta (por usuário + hospital escolhido) em vez de
 * cada um buscar vínculos e hospital de novo.
 */
const cache = new Map<string, Promise<Contexto>>();

async function resolver(userId: string, selectedId: string | null): Promise<Contexto> {
  const { data: memberships } = await supabase
    .from("hospital_users")
    .select("hospital_id")
    .eq("user_id", userId);

  const hospitalIds = (memberships || []).map((item: { hospital_id: string }) => item.hospital_id);
  const resolvedHospitalId = selectedId && hospitalIds.includes(selectedId)
    ? selectedId
    : hospitalIds[0] ?? null;

  if (!resolvedHospitalId) {
    clearAllSelectedHospitalIds(userId);
    return { hospitalId: null, hospitalName: "", hospitalType: "" };
  }
  if (resolvedHospitalId !== selectedId) {
    setSelectedHospitalId(userId, resolvedHospitalId);
  }

  const { data: hospital } = await supabase
    .from("hospitals")
    .select("name, type")
    .eq("id", resolvedHospitalId)
    .single();

  return { hospitalId: resolvedHospitalId, hospitalName: hospital?.name ?? "", hospitalType: hospital?.type ?? "" };
}

function contextoDe(userId: string): Promise<Contexto> {
  const selectedId = getSelectedHospitalId(userId);
  const chave = `${userId}:${selectedId ?? ""}`;
  let p = cache.get(chave);
  if (!p) {
    p = resolver(userId, selectedId);
    cache.set(chave, p);
    // Falha de rede: não guarda o erro, tenta de novo na próxima vez
    p.catch(() => cache.delete(chave));
  }
  return p;
}

export function useHospitalContext() {
  const { user, isReady } = useAuthReady();
  const [hospitalId, setHospitalId] = useState<string | null>(null);
  const [hospitalName, setHospitalName] = useState<string>("");
  const [hospitalType, setHospitalType] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let ativo = true;
    contextoDe(user.id)
      .then((c) => {
        if (!ativo) return;
        setHospitalId(c.hospitalId);
        setHospitalName(c.hospitalName);
        setHospitalType(c.hospitalType);
      })
      .catch(() => { /* sem hospital: telas tratam hospitalId nulo */ })
      .finally(() => { if (ativo) setLoading(false); });
    return () => { ativo = false; };
  }, [user, isReady]);

  return { hospitalId, hospitalName, hospitalType, userId: user?.id ?? null, loading };
}
