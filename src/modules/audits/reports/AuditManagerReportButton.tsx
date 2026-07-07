import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, ClipboardList } from "lucide-react";
import AuditManagerReportModal from "./AuditManagerReportModal";
import type { AuditTypeKey, AuditReportMode } from "./auditReportTypes";

interface AuditManagerReportButtonProps {
  defaultAuditType?: AuditTypeKey;
  defaultMode?: AuditReportMode;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
}

export default function AuditManagerReportButton({
  defaultAuditType,
  defaultMode = "single_audit_type",
  variant = "outline",
  size = "sm",
  className,
  label,
}: AuditManagerReportButtonProps) {
  const [open, setOpen] = useState(false);
  const isCompiled = defaultMode === "monthly_sector_compiled";

  return (
    <>
      <Button variant={variant} size={size} className={className} onClick={() => setOpen(true)}>
        {isCompiled ? (
          <ClipboardList className="h-4 w-4 mr-1.5" />
        ) : (
          <FileText className="h-4 w-4 mr-1.5" />
        )}
        {label ?? (isCompiled ? "Relatório mensal do gestor" : "Gerar relatório desta auditoria")}
      </Button>
      <AuditManagerReportModal
        open={open}
        onOpenChange={setOpen}
        defaultAuditType={defaultAuditType}
        defaultMode={defaultMode}
      />
    </>
  );
}
