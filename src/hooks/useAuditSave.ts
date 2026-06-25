import { supabase } from "@/integrations/supabase/client";
import { useHospitalContext } from "./useHospitalContext";
import { toast } from "sonner";

type AuditType = "bundles" | "hand_hygiene" | "infection_control" | "dispenser" | "cti_infrastructure" | "antibiogram" | "construction_renovation";

interface AuditItem {
  question: string;
  status: "compliant" | "non_compliant" | "not_applicable" | "not_evaluated";
  category?: string;
  observation?: string;
  item_order: number;
}

export function useAuditSave() {
  const { hospitalId, userId } = useHospitalContext();

  const saveAudit = async (opts: {
    auditType: AuditType;
    auditDate: string;
    sector: string;
    observations?: string;
    items: AuditItem[];
    photos?: { file: File; caption: string }[];
  }) => {
    if (!hospitalId || !userId) {
      toast.error("Contexto de hospital não encontrado. Faça login novamente.");
      return false;
    }

    const compliantItems = opts.items.filter(i => i.status === "compliant").length;
    const applicableItems = opts.items.filter(i => i.status !== "not_applicable" && i.status !== "not_evaluated").length;
    const complianceRate = applicableItems > 0 ? (compliantItems / applicableItems) * 100 : 0;

    const { data: audit, error: auditError } = await supabase
      .from("audits")
      .insert({
        hospital_id: hospitalId,
        audit_type: opts.auditType,
        audit_date: opts.auditDate,
        sector: opts.sector,
        auditor_id: userId,
        observations: opts.observations || null,
        compliant_items: compliantItems,
        total_items: opts.items.length,
        compliance_rate: Math.round(complianceRate * 10) / 10,
      })
      .select("id")
      .single();

    if (auditError || !audit) {
      toast.error("Erro ao salvar auditoria: " + (auditError?.message || ""));
      return false;
    }

    if (opts.items.length > 0) {
      const { error: itemsError } = await supabase
        .from("audit_items")
        .insert(
          opts.items.map(item => ({
            audit_id: audit.id,
            question: item.question,
            status: item.status,
            category: item.category || null,
            observation: item.observation || null,
            item_order: item.item_order,
          }))
        );

      if (itemsError) {
        toast.error("Erro ao salvar itens: " + itemsError.message);
        return false;
      }
    }

    if (opts.photos && opts.photos.length > 0) {
      const paths: string[] = [];
      const captions: string[] = [];
      for (let i = 0; i < opts.photos.length; i++) {
        const { file, caption } = opts.photos[i];
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const path = `${hospitalId}/${audit.id}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("audit-photos")
          .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
        if (!upErr) {
          paths.push(path);
          captions.push(caption || "");
        }
      }
      if (paths.length > 0) {
        await supabase.from("audits").update({ photo_urls: paths, photo_captions: captions }).eq("id", audit.id);
      }
      if (paths.length < opts.photos.length) {
        toast.warning(`Auditoria salva, mas ${opts.photos.length - paths.length} foto(s) não foram enviadas.`);
      }
    }

    toast.success(`Auditoria salva! Conformidade: ${complianceRate.toFixed(1)}%`);
    return true;
  };

  return { saveAudit, hospitalId, userId };
}
