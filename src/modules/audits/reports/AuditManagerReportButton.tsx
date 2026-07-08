import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, ClipboardList } from "lucide-react";
import { AuditManagerReportModal } from "./AuditManagerReportModal";
import type { AuditReportMode } from "./auditReportTypes";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { fetchAvailableSectors } from "./auditReportService";

export interface AuditManagerReportButtonProps {
  hospitalId?: string;
  hospitalName?: string;
  availableSectors?: string[];
  defaultAuditType?: string;
  defaultMode?: AuditReportMode;
}

export function AuditManagerReportButton({
  hospitalId: hospitalIdProp,
  hospitalName: hospitalNameProp,
  availableSectors: availableSectorsProp,
  defaultAuditType,
  defaultMode,
}: AuditManagerReportButtonProps) {
  const ctx = useHospitalContext();
  const hospitalId = hospitalIdProp ?? ctx.hospitalId ?? "";
  const hospitalName = hospitalNameProp ?? ctx.hospitalName ?? "";
  const [sectors, setSectors] = useState<string[]>(availableSectorsProp ?? []);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuditReportMode>(defaultMode ?? "single_audit_type");

  useEffect(() => {
    if (availableSectorsProp && availableSectorsProp.length > 0) {
      setSectors(availableSectorsProp);
      return;
    }
    if (!hospitalId) return;
    fetchAvailableSectors(hospitalId).then(setSectors).catch(() => {});
  }, [hospitalId, availableSectorsProp]);

  // If a defaultMode is supplied, only render the corresponding single button
  const showSingle = !defaultMode || defaultMode === "single_audit_type";
  const showCompiled = !defaultMode || defaultMode === "monthly_sector_compiled";

  const openSingle = () => { setMode("single_audit_type"); setOpen(true); };
  const openCompiled = () => { setMode("monthly_sector_compiled"); setOpen(true); };

  return (
    <>
      {showSingle && (
        <Button variant="outline" size="sm" onClick={openSingle} title="Gerar relatório desta auditoria">
          <FileText className="h-4 w-4 mr-1" />
          Gerar Relatório
        </Button>
      )}
      {showCompiled && (
        <Button variant="outline" size="sm" onClick={openCompiled} title="Gerar relatório mensal compilado do gestor">
          <ClipboardList className="h-4 w-4 mr-1" />
          Relatório do Gestor
        </Button>
      )}
      <AuditManagerReportModal
        open={open}
        onClose={() => setOpen(false)}
        hospitalId={hospitalId}
        hospitalName={hospitalName}
        availableSectors={sectors}
        defaultAuditType={defaultAuditType}
        defaultMode={mode}
      />
    </>
  );
}
