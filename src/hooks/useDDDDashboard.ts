import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "./useHospitalContext";
import type { DDDRegistroMensal } from "@/data/antimicrobianos-ddd";

const mesesMap: Record<string, number> = {
  Janeiro: 1, Fevereiro: 2, Março: 3, Abril: 4, Maio: 5, Junho: 6,
  Julho: 7, Agosto: 8, Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12,
};

export function useDDDDashboard() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [data, setData] = useState<DDDRegistroMensal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: records } = await supabase
        .from("ddd_records")
        .select("id, mes_vigilancia, ano_vigilancia, compilado_utis, paciente_dia")
        .eq("hospital_id", hospitalId);

      if (!records || records.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const ids = records.map(r => r.id);
      const { data: lines } = await supabase
        .from("ddd_record_lines")
        .select("*")
        .in("ddd_record_id", ids);

      const resultado: DDDRegistroMensal[] = [];
      for (const rec of records) {
        const recLines = (lines || []).filter(l => l.ddd_record_id === rec.id);
        for (const linha of recLines) {
          if (linha.quantidade <= 0) continue;
          resultado.push({
            mes: rec.mes_vigilancia,
            ano: rec.ano_vigilancia,
            mesNumero: mesesMap[rec.mes_vigilancia] || 1,
            unidade: "Compilado UTIs",
            pacienteDia: rec.compilado_utis,
            antimicrobiano: linha.nome,
            quantidadeUnidades: linha.quantidade,
            totalMg: Number(linha.total_mg),
            totalG: Number(linha.total_g),
            dddPadrao: Number(linha.ddd_padrao),
            valorAB: Number(linha.valor_ab) || 0,
            indicadorConsumo: Number(linha.indicador) || 0,
          });
        }
      }
      setData(resultado);
      setLoading(false);
    };
    fetch();
  }, [hospitalId]);

  return { data, loading: loading || ctxLoading, hospitalId };
}
