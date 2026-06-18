import { useState, useEffect, useCallback } from "react";
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
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey(k => k + 1), []);

  useEffect(() => {
    if (!hospitalId) return;
    const fetchAll = async () => {
      setLoading(true);

      // 1. Paginate lab_results to bypass 1000-row default
      const PAGE = 1000;
      let labResults: any[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data: page, error } = await supabase
          .from("lab_results")
          .select("id, collection_date, sample_type, organism, patient_id, status, created_at, notes")
          .eq("hospital_id", hospitalId)
          .not("organism", "is", null)
          .order("collection_date", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error || !page || page.length === 0) break;
        labResults.push(...page);
        if (page.length < PAGE) break;
      }

      if (labResults.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      // 2. Paginate antibiogram_results in id-chunks (avoid URL length and 1000 row cap)
      const ids = labResults.map(r => r.id);
      const CHUNK = 200;
      const abResults: any[] = [];
      for (let i = 0; i < ids.length; i += CHUNK) {
        const chunk = ids.slice(i, i + CHUNK);
        let from = 0;
        while (true) {
          const { data: page, error } = await supabase
            .from("antibiogram_results")
            .select("*")
            .in("lab_result_id", chunk)
            .range(from, from + PAGE - 1);
          if (error || !page || page.length === 0) break;
          abResults.push(...page);
          if (page.length < PAGE) break;
          from += PAGE;
        }
      }

      // 3. Patient sectors in chunks
      const patientIds = [...new Set(labResults.map(r => r.patient_id).filter(Boolean))] as string[];
      const patientMap: Record<string, { sector: string }> = {};
      for (let i = 0; i < patientIds.length; i += CHUNK) {
        const chunk = patientIds.slice(i, i + CHUNK);
        const { data: patients } = await supabase
          .from("patients")
          .select("id, sector")
          .in("id", chunk);
        for (const p of patients || []) {
          patientMap[p.id] = { sector: p.sector || "Não informado" };
        }
      }

      // Index antibiogram results by lab id for O(1) lookup
      const abByLab: Record<string, any[]> = {};
      for (const r of abResults) {
        (abByLab[r.lab_result_id] ||= []).push(r);
      }

      const records: AntibiogramDashRecord[] = labResults.map(lab => {
        const results = (abByLab[lab.id] || []).map(r => ({
          antibiotic: r.antibiotic,
          method: r.notes || "Disco-difusão",
          value: r.mic_value ? String(r.mic_value) : "-",
          sir: r.sensitivity as "S" | "I" | "R",
        }));

        const organism = lab.organism || "Desconhecido";
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
    fetchAll();
  }, [hospitalId, refreshKey]);

  return { data, loading: loading || ctxLoading, hospitalId, refresh };
}

