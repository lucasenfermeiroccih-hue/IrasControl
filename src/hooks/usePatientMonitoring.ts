import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "./useHospitalContext";
import { toast } from "sonner";

export interface PatientRecord {
  id: string;
  nome: string;
  unidade: string;
  leito: string;
  prontuario: string;
  dataInternacaoHospitalar: string;
  origem: string;
  dataInternacaoCTI: string;
  dataAlta: string;
  doencasBase: string;
  motivoInternacao: string;
  dataNascimento: string;
  sexo: string;
  dataAdmissao: string;
  especialidade: string;
  diagnostico: string;
  status: "active" | "discharged" | "transferred" | "deceased";
  tipoAlta?: string;
  infeccaoMaterna?: string;
  irasTransplacentaria?: string;
  pesoRN?: string;
  diagnosticoRN?: string;
  tipoParto?: string;
  bolsaRotaH?: string;
  bolsaRotaDias?: string;
  apgar?: string;
  idadeGestacional?: string;
  dataInternacaoRN?: string;
}

// Map DB row to UI model
function dbToPatient(row: any): PatientRecord & { _clinicalData?: any } {
  const cd = row.clinical_data || {};
  return {
    id: row.id,
    nome: row.full_name || "",
    unidade: row.sector || "",
    leito: row.bed || "",
    prontuario: row.medical_record || "",
    dataInternacaoHospitalar: row.admission_date || "",
    origem: row.origin || "",
    dataInternacaoCTI: row.icu_admission_date || "",
    dataAlta: row.discharge_date || "",
    doencasBase: row.base_diseases || "",
    motivoInternacao: row.admission_reason || "",
    dataNascimento: row.birth_date || "",
    sexo: row.gender || "",
    dataAdmissao: row.admission_date || "",
    especialidade: row.specialty || "",
    diagnostico: row.diagnosis || "",
    status: row.status || "active",
    tipoAlta: row.discharge_type || "",
    infeccaoMaterna: cd.infeccaoMaterna || "",
    irasTransplacentaria: cd.irasTransplacentaria || "",
    pesoRN: cd.pesoRN || "",
    diagnosticoRN: cd.diagnosticoRN || "",
    tipoParto: cd.tipoParto || "",
    bolsaRotaH: cd.bolsaRotaH || "",
    bolsaRotaDias: cd.bolsaRotaDias || "",
    apgar: cd.apgar || "",
    idadeGestacional: cd.idadeGestacional || "",
    dataInternacaoRN: cd.dataInternacaoRN || "",
    _clinicalData: cd,
  };
}

// Map UI model to DB insert/update
function patientToDb(p: Partial<PatientRecord>, hospitalId: string) {
  return {
    full_name: p.nome,
    sector: p.unidade,
    bed: p.leito,
    medical_record: p.prontuario,
    admission_date: p.dataAdmissao || p.dataInternacaoHospitalar || new Date().toISOString().slice(0, 10),
    birth_date: p.dataNascimento || null,
    gender: p.sexo || null,
    discharge_date: p.dataAlta || null,
    status: p.status || "active",
    origin: p.origem || null,
    icu_admission_date: p.dataInternacaoCTI || null,
    base_diseases: p.doencasBase || null,
    admission_reason: p.motivoInternacao || null,
    specialty: p.especialidade || null,
    diagnosis: p.diagnostico || null,
    discharge_type: p.tipoAlta || null,
    hospital_id: hospitalId,
    clinical_data: {
      infeccaoMaterna: p.infeccaoMaterna || "",
      irasTransplacentaria: p.irasTransplacentaria || "",
      pesoRN: p.pesoRN || "",
      diagnosticoRN: p.diagnosticoRN || "",
      tipoParto: p.tipoParto || "",
      bolsaRotaH: p.bolsaRotaH || "",
      bolsaRotaDias: p.bolsaRotaDias || "",
      apgar: p.apgar || "",
      idadeGestacional: p.idadeGestacional || "",
      dataInternacaoRN: p.dataInternacaoRN || "",
    },
  };
}

export function usePatientMonitoring() {
  const { hospitalId, userId, loading: ctxLoading } = useHospitalContext();
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    if (!hospitalId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .eq("hospital_id", hospitalId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar pacientes:", error);
      toast.error("Erro ao carregar pacientes");
    } else {
      setPatients((data || []).map(dbToPatient));
    }
    setLoading(false);
  }, [hospitalId]);

  useEffect(() => {
    if (!ctxLoading && hospitalId) fetchPatients();
    if (!ctxLoading && !hospitalId) setLoading(false);
  }, [ctxLoading, hospitalId, fetchPatients]);

  const createPatient = async (p: Partial<PatientRecord>) => {
    if (!hospitalId) { toast.error("Hospital não selecionado"); return null; }
    const dbData = patientToDb(p, hospitalId);
    const { data, error } = await supabase
      .from("patients")
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error("Erro ao criar paciente:", error);
      toast.error("Erro ao cadastrar paciente: " + error.message);
      return null;
    }
    const newPatient = dbToPatient(data);
    setPatients(prev => [newPatient, ...prev]);
    toast.success("Paciente cadastrado com sucesso!");
    return newPatient;
  };

  const updatePatient = async (id: string, updates: Partial<PatientRecord> & { _tabData?: any }) => {
    if (!hospitalId) return false;
    const current = patients.find(p => p.id === id);
    if (!current) return false;

    const { _tabData, ...patientUpdates } = updates;
    const merged = { ...current, ...patientUpdates };
    const dbData = patientToDb(merged, hospitalId);
    delete (dbData as any).hospital_id;

    // Merge tab data into clinical_data if provided
    if (_tabData) {
      dbData.clinical_data = {
        ...(dbData.clinical_data as any || {}),
        ..._tabData,
      };
    }
    
    const { error } = await supabase
      .from("patients")
      .update(dbData)
      .eq("id", id);

    if (error) {
      console.error("Erro ao atualizar paciente:", error);
      toast.error("Erro ao atualizar: " + error.message);
      return false;
    }
    // Update local state with merged clinical data
    const updatedClinicalData = _tabData ? { _clinicalData: { ...((current as any)._clinicalData || {}), ..._tabData } } : {};
    setPatients(prev => prev.map(p => p.id === id ? { ...p, ...patientUpdates, ...updatedClinicalData } : p));
    return true;
  };

  const dischargePatient = async (id: string, dischargeType: string) => {
    const statusMap: Record<string, string> = {
      "Óbito": "deceased",
      "Alta": "discharged",
      "Transferência": "transferred",
    };
    const newStatus = statusMap[dischargeType] || "discharged";
    const today = new Date().toISOString().slice(0, 10);

    const { error } = await supabase
      .from("patients")
      .update({
        status: newStatus as any,
        discharge_date: today,
        discharge_type: dischargeType,
      })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao dar alta: " + error.message);
      return false;
    }
    setPatients(prev =>
      prev.map(p => p.id === id ? { ...p, status: newStatus as any, dataAlta: today, tipoAlta: dischargeType } : p)
    );
    return true;
  };

  const deletePatient = async (id: string) => {
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir paciente: " + error.message);
      return false;
    }
    setPatients(prev => prev.filter(p => p.id !== id));
    toast.success("Paciente excluído com sucesso!");
    return true;
  };

  const changePatientStatus = async (id: string, newStatus: PatientRecord["status"], dischargeType?: string) => {
    const updates: any = { status: newStatus };
    if (newStatus !== "active") {
      updates.discharge_date = new Date().toISOString().slice(0, 10);
      if (dischargeType) updates.discharge_type = dischargeType;
    } else {
      updates.discharge_date = null;
      updates.discharge_type = null;
    }
    const { error } = await supabase.from("patients").update(updates).eq("id", id);
    if (error) {
      toast.error("Erro ao alterar status: " + error.message);
      return false;
    }
    setPatients(prev => prev.map(p => p.id === id
      ? { ...p, status: newStatus, dataAlta: updates.discharge_date || "", tipoAlta: updates.discharge_type || "" }
      : p));
    toast.success("Status atualizado!");
    return true;
  };

  return {
    patients,
    loading: loading || ctxLoading,
    hospitalId,
    userId,
    createPatient,
    updatePatient,
    dischargePatient,
    deletePatient,
    changePatientStatus,
    refetch: fetchPatients,
  };
}
