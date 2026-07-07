import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FileText, ClipboardList } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useHospitalContext } from "@/hooks/useHospitalContext";
import { fetchAuditReportData, fetchHospitalLogos } from "./auditReportService";
import { calculateAuditReportMetrics, calculateMonthlySectorCompiledAuditReport } from "./auditReportMetrics";
import { generateAuditManagerReportMarkdown, generateMonthlyCompiledReportMarkdown } from "./auditReportMarkdown";
import AuditManagerReportPreview from "./AuditManagerReportPreview";
import type {
  AuditReportFilters,
  AuditTypeKey,
  AuditReportMetrics,
  MonthlySectorCompiledAuditMetrics,
  AuditReportMode,
} from "./auditReportTypes";
import { AUDIT_TYPE_LABELS } from "./auditReportTypes";

interface AuditManagerReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultAuditType?: AuditTypeKey;
  defaultMode?: AuditReportMode;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function firstDayOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
function nowLabel() {
  return new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AuditManagerReportModal({
  open,
  onOpenChange,
  defaultAuditType,
  defaultMode = "single_audit_type",
}: AuditManagerReportModalProps) {
  const { hospitalId, hospitalName } = useHospitalContext();

  const [filters, setFilters] = useState<AuditReportFilters>({
    mode: defaultMode,
    hospitalId: hospitalId ?? "",
    hospitalName: hospitalName ?? "",
    sectorName: "",
    periodStart: firstDayOfMonthISO(),
    periodEnd: todayISO(),
    auditType: defaultAuditType ?? "",
    managerName: "",
    managerEmail: "",
    technicalResponsible: "",
    includePreviousPeriod: false,
    includeActionPlan: true,
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "preview">("form");
  const [markdown, setMarkdown] = useState("");
  const [metrics, setMetrics] = useState<AuditReportMetrics | MonthlySectorCompiledAuditMetrics | null>(null);

  function setField<K extends keyof AuditReportFilters>(key: K, value: AuditReportFilters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function setMode(mode: AuditReportMode) {
    setFilters((prev) => ({ ...prev, mode }));
  }

  async function handleGenerate() {
    if (!hospitalId) {
      toast({ title: "Hospital não selecionado", variant: "destructive" });
      return;
    }
    if (!filters.periodStart || !filters.periodEnd) {
      toast({ title: "Informe o período", description: "Preencha as datas de início e fim.", variant: "destructive" });
      return;
    }
    if (filters.periodStart > filters.periodEnd) {
      toast({ title: "Período inválido", description: "A data inicial deve ser anterior à data final.", variant: "destructive" });
      return;
    }
    if (filters.mode === "single_audit_type" && !filters.auditType) {
      toast({ title: "Tipo de auditoria obrigatório", description: "Selecione o tipo de auditoria para este modo.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const resolvedFilters: AuditReportFilters = {
        ...filters,
        hospitalId: hospitalId,
        hospitalName: hospitalName || filters.hospitalName,
      };

      const [{ audits, items, previousAudits }, logos] = await Promise.all([
        fetchAuditReportData(resolvedFilters),
        fetchHospitalLogos(hospitalId),
      ]);

      if (audits.length === 0) {
        toast({
          title: "Nenhuma auditoria encontrada",
          description: "Ajuste os filtros de período, setor ou tipo de auditoria.",
          variant: "destructive",
        });
        return;
      }

      const generatedAt = nowLabel();

      if (resolvedFilters.mode === "monthly_sector_compiled") {
        const compiledMetrics = calculateMonthlySectorCompiledAuditReport({ audits, items });
        setMetrics(compiledMetrics);

        const md = generateMonthlyCompiledReportMarkdown({
          hospitalName: resolvedFilters.hospitalName,
          sectorName: resolvedFilters.sectorName,
          periodStart: resolvedFilters.periodStart,
          periodEnd: resolvedFilters.periodEnd,
          managerName: resolvedFilters.managerName,
          managerEmail: resolvedFilters.managerEmail,
          technicalResponsible: resolvedFilters.technicalResponsible,
          generatedAt,
          metrics: compiledMetrics,
          audits,
          items,
          hospitalLogoUrl: logos.hospitalLogoUrl,
          scihLogoUrls: logos.scihLogoUrls,
        });
        setMarkdown(md);
      } else {
        const m = calculateAuditReportMetrics(audits, items, previousAudits);
        setMetrics(m);
        const auditTypeLabel = filters.auditType
          ? AUDIT_TYPE_LABELS[filters.auditType as AuditTypeKey]
          : "Todos os tipos";

        const md = generateAuditManagerReportMarkdown({
          hospitalName: resolvedFilters.hospitalName,
          sectorName: resolvedFilters.sectorName,
          auditType: auditTypeLabel,
          periodStart: resolvedFilters.periodStart,
          periodEnd: resolvedFilters.periodEnd,
          managerName: resolvedFilters.managerName,
          managerEmail: resolvedFilters.managerEmail,
          technicalResponsible: resolvedFilters.technicalResponsible,
          generatedAt,
          metrics: m,
          audits,
          items,
          previousAudits,
          hospitalLogoUrl: logos.hospitalLogoUrl,
          scihLogoUrls: logos.scihLogoUrls,
        });
        setMarkdown(md);
      }

      setStep("preview");
    } catch (err: any) {
      toast({
        title: "Erro ao gerar relatório",
        description: err?.message ?? "Verifique sua conexão e tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep("form");
    setMarkdown("");
    setMetrics(null);
    onOpenChange(false);
  }

  const isCompiled = filters.mode === "monthly_sector_compiled";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isCompiled ? (
              <ClipboardList className="h-5 w-5 text-primary" />
            ) : (
              <FileText className="h-5 w-5 text-primary" />
            )}
            {step === "form"
              ? isCompiled
                ? "Relatório mensal compilado do gestor"
                : "Gerar relatório de auditoria"
              : "Prévia do relatório"}
          </DialogTitle>
          <DialogDescription>
            {step === "form"
              ? "Preencha os filtros e clique em Gerar para criar o relatório completo em Markdown."
              : "Revise o relatório e use os botões para copiar, baixar ou exportar para PDF."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-1">
          {step === "form" ? (
            <div className="space-y-5 py-2">
              {/* Mode selector */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Tipo de relatório</p>
                <Tabs value={filters.mode} onValueChange={(v) => setMode(v as AuditReportMode)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="single_audit_type" className="flex-1 gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Por tipo de auditoria
                    </TabsTrigger>
                    <TabsTrigger value="monthly_sector_compiled" className="flex-1 gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Mensal compilado do gestor
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-xs text-muted-foreground mt-2">
                  {isCompiled
                    ? "Gera um relatório compilado de todas as auditorias do setor no período selecionado."
                    : "Gera relatório filtrado por um tipo específico de auditoria."}
                </p>
              </div>

              {/* Identification */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Identificação</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Hospital/Unidade</Label>
                    <Input
                      value={hospitalName || filters.hospitalName}
                      readOnly
                      className="bg-muted text-muted-foreground text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      Setor <span className="text-muted-foreground">(deixe em branco para todos)</span>
                    </Label>
                    <Input
                      placeholder="Ex: UTI Adulto, Emergência..."
                      value={filters.sectorName}
                      onChange={(e) => setField("sectorName", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Period */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Período</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data inicial</Label>
                    <Input
                      type="date"
                      value={filters.periodStart}
                      onChange={(e) => setField("periodStart", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Data final</Label>
                    <Input
                      type="date"
                      value={filters.periodEnd}
                      onChange={(e) => setField("periodEnd", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Audit type — only for single mode */}
              {!isCompiled && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Tipo de auditoria <span className="text-red-500">*</span>
                  </p>
                  <Select
                    value={filters.auditType || ""}
                    onValueChange={(v) => setField("auditType", v as AuditTypeKey)}
                  >
                    <SelectTrigger className="text-sm">
                      <SelectValue placeholder="Selecione o tipo de auditoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AUDIT_TYPE_LABELS).map(([k, label]) => (
                        <SelectItem key={k} value={k}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Manager info */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Destinatário e responsável</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nome do gestor</Label>
                    <Input
                      placeholder="Ex: Enfermeira Ana Paula"
                      value={filters.managerName}
                      onChange={(e) => setField("managerName", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">E-mail do gestor</Label>
                    <Input
                      type="email"
                      placeholder="gestor@hospital.com"
                      value={filters.managerEmail}
                      onChange={(e) => setField("managerEmail", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs">Responsável técnico (SCIH/CCIH)</Label>
                    <Input
                      placeholder="Ex: Dr. Carlos — Médico Infectologista"
                      value={filters.technicalResponsible}
                      onChange={(e) => setField("technicalResponsible", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Options */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Opções do relatório</p>
                <div className="space-y-3">
                  {!isCompiled && (
                    <div className="flex items-center justify-between py-2 px-3 rounded-lg border bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">Incluir comparativo com período anterior</p>
                        <p className="text-xs text-muted-foreground">Busca dados de um período igual anterior e compara os indicadores.</p>
                      </div>
                      <Switch
                        checked={filters.includePreviousPeriod}
                        onCheckedChange={(v) => setField("includePreviousPeriod", v)}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between py-2 px-3 rounded-lg border bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">Incluir plano de ação sugerido</p>
                      <p className="text-xs text-muted-foreground">Gera automaticamente um plano 5W2H com base nas não conformidades encontradas.</p>
                    </div>
                    <Switch
                      checked={filters.includeActionPlan}
                      onCheckedChange={(v) => setField("includeActionPlan", v)}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            metrics && (
              <AuditManagerReportPreview
                markdown={markdown}
                metrics={metrics}
                mode={filters.mode}
                onClose={() => setStep("form")}
              />
            )
          )}
        </div>

        {step === "form" && (
          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleGenerate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando…
                </>
              ) : isCompiled ? (
                <>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Gerar relatório compilado
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Gerar relatório
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
