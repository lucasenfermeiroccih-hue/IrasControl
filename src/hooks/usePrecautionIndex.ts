import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { chaveNome, chaveProntuario, type PrecaucaoAtiva } from "@/lib/precautionStatus";

export interface PrecautionIndex {
  /** Precauções ativas por paciente (qualquer origem) */
  porPaciente: Map<string, PrecaucaoAtiva[]>;
  /** Precauções ativas de pacientes internados do Mapeamento, por prontuário */
  mapaPorProntuario: Map<string, PrecaucaoAtiva[]>;
  /** Idem, por nome (quando o prontuário não bate ou está vazio) */
  mapaPorNome: Map<string, PrecaucaoAtiva[]>;
}

const VAZIO: PrecautionIndex = { porPaciente: new Map(), mapaPorProntuario: new Map(), mapaPorNome: new Map() };

type Row = PrecaucaoAtiva & {
  patients: { id: string; medical_record: string | null; full_name: string | null; source: string | null; status: string | null } | null;
};

const push = (m: Map<string, PrecaucaoAtiva[]>, k: string, v: PrecaucaoAtiva) => {
  if (!k) return;
  if (!m.has(k)) m.set(k, []);
  m.get(k)!.push(v);
};

/** Precauções ativas do hospital, para mostrar a situação de isolamento de cada paciente. */
export function usePrecautionIndex(hospitalId: string | null | undefined) {
  const [index, setIndex] = useState<PrecautionIndex>(VAZIO);

  const reload = useCallback(async () => {
    if (!hospitalId) return;
    const { data, error } = await supabase
      .from("precautions")
      .select("patient_id, precaution_type, reason, start_date, patients!inner(id, medical_record, full_name, source, status, hospital_id)")
      .eq("is_active", true)
      .eq("patients.hospital_id", hospitalId);
    if (error) { console.error("Erro ao carregar precauções:", error); return; }
    const next: PrecautionIndex = { porPaciente: new Map(), mapaPorProntuario: new Map(), mapaPorNome: new Map() };
    ((data ?? []) as unknown as Row[]).forEach((r) => {
      const prec: PrecaucaoAtiva = { patient_id: r.patient_id, precaution_type: r.precaution_type, reason: r.reason, start_date: r.start_date };
      push(next.porPaciente, r.patient_id, prec);
      if (r.patients?.source === "precaution_map" && r.patients.status === "active") {
        push(next.mapaPorProntuario, chaveProntuario(r.patients.medical_record), prec);
        push(next.mapaPorNome, chaveNome(r.patients.full_name), prec);
      }
    });
    setIndex(next);
  }, [hospitalId]);

  useEffect(() => { reload(); }, [reload]);

  return { index, reload };
}

/** Precauções do Mapeamento para o paciente (pelo prontuário; se não achar, pelo nome completo). */
export function precaucoesDoMapa(index: PrecautionIndex, prontuario?: string | null, nome?: string | null): PrecaucaoAtiva[] {
  const k = chaveProntuario(prontuario);
  if (k && index.mapaPorProntuario.has(k)) return index.mapaPorProntuario.get(k)!;
  return index.mapaPorNome.get(chaveNome(nome)) ?? [];
}
