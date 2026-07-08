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
        const pacienteDiaPorUnidade = (rec.paciente_dia as Record<string, number>) || {};
        const unidadesAtivas = Object.entries(pacienteDiaPorUnidade).filter(([, v]) => (v || 0) > 0);

        for (const linha of recLines) {
          if ((linha.quantidade || 0) <= 0) continue;
          const valorAB = Number(linha.valor_ab) || 0;

          if (unidadesAtivas.length > 0) {
            const totalPD = unidadesAtivas.reduce((s, [, v]) => s + v, 0);
            for (const [unidade, pd] of unidadesAtivas) {
              const ratio = totalPD > 0 ? pd / totalPD : 1 / unidadesAtivas.length;
              const valorABUnit = valorAB * ratio;
              resultado.push({
                mes: rec.mes_vigilancia,
                ano: rec.ano_vigilancia,
                mesNumero: mesesMap[rec.mes_vigilancia] || 1,
                unidade,
                pacienteDia: pd,
                antimicrobiano: linha.nome,
                quantidadeUnidades: Math.round(linha.quantidade * ratio),
                totalMg: Number(linha.total_mg) * ratio,
                totalG: Math.round(Number(linha.total_g) * ratio * 100) / 100,
                dddPadrao: Number(linha.ddd_padrao),
                valorAB: Math.round(valorABUnit * 100) / 100,
                indicadorConsumo: pd > 0 ? Math.round((valorABUnit / pd) * 1000 * 100) / 100 : 0,
              });
            }
          } else {
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
              valorAB,
              indicadorConsumo: Number(linha.indicador) || 0,
            });
          }
        }
      }
      setData(resultado);
      setLoading(false);
    };
    fetch();
  }, [hospitalId]);

  return { data, loading: loading || ctxLoading, hospitalId };
}
