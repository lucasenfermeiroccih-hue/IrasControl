import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "./useHospitalContext";

interface FlatRecord {
  profissional: string;
  mes: number;
  ano: number;
  clinica: string;
  totalCirurgias: number;
  contatosAtendidos: number;
  reinternacoes: number;
  iscConfirmada: number;
  sitio: string;
}

export function useISCDashboard() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [records, setRecords] = useState<FlatRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: iscRecords } = await supabase
        .from("isc_records")
        .select("id, nome_profissional, mes, ano")
        .eq("hospital_id", hospitalId);

      if (!iscRecords || iscRecords.length === 0) {
        setRecords([]);
        setLoading(false);
        return;
      }

      const ids = iscRecords.map(r => r.id);
      const { data: indicators } = await supabase
        .from("isc_record_indicators")
        .select("*")
        .in("isc_record_id", ids);

      const flat: FlatRecord[] = [];
      for (const rec of iscRecords) {
        const recIndicators = (indicators || []).filter(i => i.isc_record_id === rec.id);
        for (const ind of recIndicators) {
          flat.push({
            profissional: rec.nome_profissional,
            mes: Number(rec.mes) || 0,
            ano: Number(rec.ano) || 0,
            clinica: ind.procedimento,
            totalCirurgias: ind.total_cirurgias,
            contatosAtendidos: ind.contatos_atendidos,
            reinternacoes: ind.reinternacoes,
            iscConfirmada: ind.isc_confirmada,
            sitio: ind.sitio || "",
          });
        }
      }
      setRecords(flat);
      setLoading(false);
    };
    fetch();
  }, [hospitalId]);

  return { records, loading: loading || ctxLoading, hospitalId };
}
