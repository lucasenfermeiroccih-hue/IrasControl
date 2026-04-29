import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "./useHospitalContext";

export interface AntibiogramDashRecord {
  id: string;
  collectionDate: string;
  sampleId: string;
  sector: string;
  patientId: string;
  organism: string;
  site: string;
  results: { antibiotic: string; method: string; value: string; sir: "S" | "I" | "R" }[];
  detectedPhenotypes: string[];
  createdAt: string;
}

// Simple phenotype detection based on organism + resistance patterns
function detectPhenotypes(organism: string, results: AntibiogramDashRecord["results"]): string[] {
  const phenotypes: string[] = [];
  const resistantAbs = results.filter(r => r.sir === "R").map(r => r.antibiotic.toLowerCase());
  
  if (organism.toLowerCase().includes("staphylococcus") && resistantAbs.some(a => a.includes("oxacilina"))) {
    phenotypes.push("MRSA");
  }
  if (organism.toLowerCase().includes("enterococcus") && resistantAbs.some(a => a.includes("vancomicina"))) {
    phenotypes.push("VRE");
  }
  if (organism.toLowerCase().includes("klebsiella") && resistantAbs.some(a => a.includes("meropenem") || a.includes("imipenem"))) {
    phenotypes.push("KPC");
  }
  if (resistantAbs.some(a => a.includes("ceftriaxona") || a.includes("cefepima")) && 
      !resistantAbs.some(a => a.includes("meropenem"))) {
    phenotypes.push("ESBL");
  }
  return phenotypes;
}

export function useAntibiogramDashboard() {
  const { hospitalId, loading: ctxLoading } = useHospitalContext();
  const [data, setData] = useState<AntibiogramDashRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hospitalId) return;
    const fetch = async () => {
      setLoading(true);
      const { data: labResults } = await supabase
        .from("lab_results")
        .select("id, collection_date, sample_type, organism, patient_id, status, created_at, notes")
        .eq("hospital_id", hospitalId)
        .not("organism", "is", null);

      if (!labResults || labResults.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const ids = labResults.map(r => r.id);
      const { data: abResults } = await supabase
        .from("antibiogram_results")
        .select("*")
        .in("lab_result_id", ids);

      // Get patient sectors
      const patientIds = [...new Set(labResults.map(r => r.patient_id).filter(Boolean))] as string[];
      let patientMap: Record<string, { sector: string }> = {};
      if (patientIds.length > 0) {
        const { data: patients } = await supabase
          .from("patients")
          .select("id, sector")
          .in("id", patientIds);
        if (patients) {
          for (const p of patients) {
            patientMap[p.id] = { sector: p.sector || "Não informado" };
          }
        }
      }

      const records: AntibiogramDashRecord[] = labResults.map(lab => {
        const results = (abResults || [])
          .filter(r => r.lab_result_id === lab.id)
          .map(r => ({
            antibiotic: r.antibiotic,
            method: r.notes || "Disco-difusão",
            value: r.mic_value ? String(r.mic_value) : "-",
            sir: r.sensitivity as "S" | "I" | "R",
          }));

        const organism = lab.organism || "Desconhecido";
        // Sector pode estar nos notes (form de antibiograma salva "Setor: X | ...")
        const notes = lab.notes || "";
        const setorMatch = notes.match(/Setor:\s*([^|]+)/);
        const sectorFromNotes = setorMatch ? setorMatch[1].trim() : "";
        const sectorFromPatient = lab.patient_id ? (patientMap[lab.patient_id]?.sector || "") : "";
        const sector = sectorFromNotes || sectorFromPatient || "Não informado";
        return {
          id: lab.id,
          collectionDate: lab.collection_date,
          sampleId: lab.id.slice(0, 8).toUpperCase(),
          sector,
          patientId: lab.patient_id || "",
          organism,
          site: lab.sample_type || "Não informado",
          results,
          detectedPhenotypes: detectPhenotypes(organism, results),
          createdAt: lab.created_at,
        };
      });

      setData(records);
      setLoading(false);
    };
    fetch();
  }, [hospitalId]);

  return { data, loading: loading || ctxLoading, hospitalId };
}
