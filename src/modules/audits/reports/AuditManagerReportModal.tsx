import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Copy, Download, FileText, ArrowLeft, Mail, Eye, Edit2, Printer } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import irasControlLogo from "@/assets/iras-control-logo.png";

import type { AuditReportMode, AuditManagerReportMetrics, MonthlySectorCompiledAuditMetrics } from "./auditReportTypes";
import { fetchAuditsForReport, fetchHospitalLogos, generateAIReportSections } from "./auditReportService";
import { calculateAuditManagerReportMetrics, calculateMonthlySectorCompiledAuditReport } from "./auditReportMetrics";
import {
  generateAuditManagerReportMarkdown,
  generateMonthlySectorCompiledMarkdown,
  getAuditTypeName,
} from "./auditReportMarkdown";
import { AuditReportChartsRenderer, AuditReportChartsPreview, generateReportPdfWithCharts } from "./auditReportCharts";
import type { AuditRecord, AuditItemRecord } from "./auditReportTypes";

const AUDIT_TYPE_OPTIONS = [
  { value: "bundles", label: "Bundles CVC/SVD" },
  { value: "hand_hygiene", label: "Higienização das Mãos" },
  { value: "infection_control", label: "Controle de Infecção" },
  { value: "dispenser", label: "Dispensadores" },
  { value: "cti_infrastructure", label: "Infraestrutura CTI" },
  { value: "precaution", label: "Precauções e Isolamento" },
  { value: "hand_hygiene_consumption", label: "Consumo de Produtos de Higienização" },
  { value: "construction_renovation", label: "Obras e Reformas" },
  { value: "antibiogram", label: "Antibiograma" },
];

export interface AuditManagerReportModalProps {
  open: boolean;
  onClose: () => void;
  hospitalId: string;
  hospitalName: string;
  availableSectors: string[];
  defaultAuditType?: string;
  defaultMode?: AuditReportMode;
}

type Step = "form" | "preview";
type PreviewTab = "rendered" | "edit";

// ── Lightweight markdown → HTML converter ─────────────────────────────────────
function markdownToHtml(md: string): string {
  // Strip YAML front matter and convert to a styled header card
  let body = md;
  const fmMatch = md.match(/^---\n([\s\S]*?)\n---\n/);
  let frontMatterHtml = "";
  if (fmMatch) {
    body = md.slice(fmMatch[0].length);
    const rows = fmMatch[1].split("\n").filter(Boolean).map(l => {
      const idx = l.indexOf(":");
      if (idx < 0) return "";
      const key = l.slice(0, idx).trim();
      const val = l.slice(idx + 1).trim();
      return `<div style="display:flex;gap:8px;font-size:0.75em;"><span style="color:#94a3b8;min-width:100px;">${key}</span><span style="color:#334155;font-weight:500;">${val}</span></div>`;
    }).filter(Boolean).join("");
    frontMatterHtml = `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:10px 14px;margin-bottom:16px;">${rows}</div>`;
  }

  const lines = body.split("\n");
  const output: string[] = [frontMatterHtml];
  let inTable = false;
  let tableHeaderDone = false;
  let inList = false;
  let inOrderedList = false;

  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const inline = (s: string): string =>
    s
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2" style="max-height:60px;max-width:120px;object-fit:contain;display:inline-block;vertical-align:middle;margin:2px 4px;" onerror="this.style.display=\'none\'" />')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#2563eb;text-decoration:underline;">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\*([^*]+)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, '<code style="background:#f1f5f9;padding:1px 4px;border-radius:3px;font-size:0.9em;">$1</code>');

  const flushList = () => {
    if (inList) { output.push("</ul>"); inList = false; }
    if (inOrderedList) { output.push("</ol>"); inOrderedList = false; }
  };
  const flushTable = () => {
    if (inTable) { output.push("</tbody></table>"); inTable = false; tableHeaderDone = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Blank line
    if (!line.trim()) {
      flushList();
      flushTable();
      output.push('<div style="height:6px;"></div>');
      continue;
    }

    // Long underscore/dash line → section divider
    if (/^[_\-]{20,}$/.test(line.trim())) {
      flushList(); flushTable();
      output.push('<hr style="border:none;border-top:2px solid #e2e8f0;margin:16px 0;"/>');
      continue;
    }

    // Short horizontal rule (--- or ***)
    if (/^(---|\*\*\*)$/.test(line.trim())) {
      flushList(); flushTable();
      output.push('<hr style="border:none;border-top:1px solid #e2e8f0;margin:10px 0;"/>');
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      flushList(); flushTable();
      const level = headingMatch[1].length;
      const text = inline(escape(headingMatch[2].trim()));
      const sizes = ["2em","1.5em","1.17em","1em","0.9em","0.8em"];
      const weights = ["800","700","600","600","600","600"];
      const margins = ["20px 0 10px","16px 0 8px","14px 0 6px","12px 0 4px","10px 0 4px","8px 0 4px"];
      const colors = ["#1e3a5f","#1e3a5f","#2563eb","#374151","#374151","#374151"];
      const border = level === 1 ? "border-bottom:2px solid #2563eb;padding-bottom:6px;" : level === 2 ? "border-bottom:1px solid #e2e8f0;padding-bottom:4px;" : "";
      output.push(`<h${level} style="font-size:${sizes[level-1]};font-weight:${weights[level-1]};color:${colors[level-1]};margin:${margins[level-1]};${border}">${text}</h${level}>`);
      continue;
    }

    // Table row
    if (line.trim().startsWith("|")) {
      const cells = line.trim().split("|").slice(1, -1).map(c => c.trim());
      // Separator row
      if (cells.every(c => /^[-:]+$/.test(c))) {
        if (!tableHeaderDone && inTable) {
          output.push("</thead><tbody>");
          tableHeaderDone = true;
        }
        continue;
      }
      if (!inTable) {
        flushList();
        output.push('<table style="width:100%;border-collapse:collapse;font-size:0.85em;margin:12px 0;"><thead>');
        inTable = true;
        tableHeaderDone = false;
      }
      const tag = !tableHeaderDone ? "th" : "td";
      const style = !tableHeaderDone
        ? 'style="background:#1e3a5f;color:#fff;padding:7px 10px;text-align:left;font-weight:600;border:1px solid #1e3a5f;"'
        : 'style="padding:6px 10px;border:1px solid #d1d5db;vertical-align:top;"';
      output.push(`<tr>${cells.map(c => `<${tag} ${style}>${inline(escape(c))}</${tag}>`).join("")}</tr>`);
      continue;
    }

    // List item
    if (/^[-*+]\s+/.test(line)) {
      flushTable();
      if (inOrderedList) { output.push("</ol>"); inOrderedList = false; }
      if (!inList) { output.push('<ul style="margin:8px 0 8px 20px;padding:0;list-style:disc;">'); inList = true; }
      output.push(`<li style="margin:3px 0;line-height:1.6;">${inline(escape(line.replace(/^[-*+]\s+/, "")))}</li>`);
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(line)) {
      flushTable();
      if (inList) { output.push("</ul>"); inList = false; }
      if (!inOrderedList) { output.push('<ol style="margin:8px 0 8px 20px;padding:0;">'); inOrderedList = true; }
      output.push(`<li style="margin:3px 0;line-height:1.6;">${inline(escape(line.replace(/^\d+\.\s+/, "")))}</li>`);
      continue;
    }

    // Blockquote
    if (line.startsWith(">")) {
      flushList(); flushTable();
      output.push(`<blockquote style="border-left:4px solid #2563eb;margin:8px 0;padding:6px 12px;background:#eff6ff;color:#1e40af;border-radius:0 4px 4px 0;">${inline(escape(line.slice(1).trim()))}</blockquote>`);
      continue;
    }

    // Paragraph
    flushList(); flushTable();
    output.push(`<p style="margin:6px 0;line-height:1.7;">${inline(escape(line))}</p>`);
  }

  flushList();
  flushTable();
  return output.join("\n");
}



// ── Email via mailto ───────────────────────────────────────────────────────────
function buildMailtoLink(params: {
  to: string;
  managerName: string;
  sectorName: string;
  period: string;
  hospitalName: string;
  markdownSummary: string;
}): string {
  const subject = encodeURIComponent(
    `Relatório de Auditoria – ${params.sectorName} – ${params.period}`
  );
  const body = encodeURIComponent(
    `Prezado(a) ${params.managerName || "Gestor(a)"},\n\n` +
    `Segue relatório gerencial de auditorias do setor ${params.sectorName} – ${params.hospitalName}, referente ao período de ${params.period}.\n\n` +
    `O documento contém indicadores, conformidades, não conformidades, pontos de melhoria e plano de ação sugerido.\n\n` +
    `Solicitamos ciência e acompanhamento das ações propostas.\n\n` +
    `Atenciosamente,\nEquipe IRAS Control / CCIH\n\n` +
    `---\nResumo dos indicadores:\n${params.markdownSummary}`
  );
  return `mailto:${params.to}?subject=${subject}&body=${body}`;
}

// ── Component ──────────────────────────────────────────────────────────────────
export function AuditManagerReportModal({
  open, onClose, hospitalId, hospitalName, availableSectors, defaultAuditType, defaultMode,
}: AuditManagerReportModalProps) {
  // Form state
  const [mode, setMode] = useState<AuditReportMode>(defaultMode ?? "single_audit_type");
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [sectorSearch, setSectorSearch] = useState("");
  const [auditType, setAuditType] = useState(defaultAuditType ?? "bundles");
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().slice(0, 7);
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().slice(0, 7));
  const [managerName, setManagerName] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [technicalResponsible, setTechnicalResponsible] = useState("");
  const [includeActionPlan, setIncludeActionPlan] = useState(true);

  // Generation state
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [markdownContent, setMarkdownContent] = useState("");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("rendered");
  const [generatedAudits, setGeneratedAudits] = useState<AuditRecord[]>([]);
  const [generatedItems, setGeneratedItems] = useState<AuditItemRecord[]>([]);
  const [generatedMetrics, setGeneratedMetrics] = useState<AuditManagerReportMetrics | MonthlySectorCompiledAuditMetrics | null>(null);
  const [generatedMode, setGeneratedMode] = useState<AuditReportMode>("single_audit_type");
  const [generatedHospitalLogoUrl, setGeneratedHospitalLogoUrl] = useState<string | undefined>();
  const [generatedScihLogoUrl, setGeneratedScihLogoUrl] = useState<string | undefined>();
  const [pdfLoading, setPdfLoading] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState("");

  const chartsRef = useRef<HTMLDivElement>(null);

  // Rebuild HTML whenever markdown changes
  useEffect(() => {
    if (!markdownContent) { setRenderedHtml(""); return; }
    const html = markdownToHtml(markdownContent);
    setRenderedHtml(DOMPurify.sanitize(html, { ADD_ATTR: ["style"], FORCE_BODY: true }));
  }, [markdownContent]);

  // Sector helpers
  const filteredSectors = useMemo(
    () => availableSectors.filter(s => s.toLowerCase().includes(sectorSearch.toLowerCase())),
    [availableSectors, sectorSearch]
  );
  const toggleSector = (s: string) =>
    setSelectedSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  const selectAll = () => setSelectedSectors([...availableSectors]);
  const clearAll = () => setSelectedSectors([]);

  // Period dates
  const periodStartDate = `${periodStart}-01`;
  const periodEndDate = (() => {
    const [y, m] = periodEnd.split("-").map(Number);
    return `${periodEnd}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  })();

  // ── Generate report ──────────────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (selectedSectors.length === 0) { toast.error("Selecione pelo menos um setor."); return; }
    if (mode === "single_audit_type" && !auditType) { toast.error("Selecione o tipo de auditoria."); return; }

    setLoading(true);
    try {
      setLoadingMsg("Buscando auditorias...");
      const { audits, items } = await fetchAuditsForReport({
        hospitalId, sectors: selectedSectors,
        periodStart: periodStartDate, periodEnd: periodEndDate,
        auditType: mode === "single_audit_type" ? auditType : undefined,
      });

      if (audits.length === 0) {
        toast.warning("Nenhuma auditoria encontrada no período e setores selecionados.");
        setLoading(false);
        return;
      }

      setLoadingMsg("Calculando métricas...");
      const metrics = mode === "single_audit_type"
        ? calculateAuditManagerReportMetrics({ audits, items })
        : calculateMonthlySectorCompiledAuditReport({ audits, items });

      setLoadingMsg("Gerando análise inteligente...");
      const auditTypeName = mode === "single_audit_type" ? getAuditTypeName(auditType) : "Compilado Mensal";
      const period = `${periodStart} a ${periodEnd}`;
      const aiSections = await generateAIReportSections({
        metrics: metrics as any, auditTypeName,
        sectorName: selectedSectors.join(", "), period, mode,
      });

      setLoadingMsg("Montando relatório...");
      const generatedAt = new Date().toLocaleString("pt-BR");

      let md = mode === "single_audit_type"
        ? generateAuditManagerReportMarkdown({
            hospitalName, sectorName: selectedSectors.join(", "), auditType,
            periodStart: periodStartDate, periodEnd: periodEndDate,
            managerName: managerName || undefined, managerEmail: managerEmail || undefined,
            technicalResponsible: technicalResponsible || undefined,
            generatedAt, metrics: metrics as AuditManagerReportMetrics,
          })
        : generateMonthlySectorCompiledMarkdown({
            hospitalName, sectorNames: selectedSectors,
            periodStart: periodStartDate, periodEnd: periodEndDate,
            managerName: managerName || undefined, managerEmail: managerEmail || undefined,
            technicalResponsible: technicalResponsible || undefined,
            generatedAt, metrics: metrics as MonthlySectorCompiledAuditMetrics,
          });

      // Inject AI sections
      md = md
        .replace("{{resultsDiscussion}}", aiSections.resultsDiscussion || "")
        .replace("{{chartDiscussions}}", aiSections.chartDiscussions || "")
        .replace("{{probableCauseAnalysis}}", aiSections.probableCauseAnalysis || "")
        .replace("{{riskAnalysis}}", aiSections.riskAnalysis || "")
        .replace("{{managerRecommendations}}", aiSections.managerRecommendations || "")
        .replace("{{nextCycleGoals}}", aiSections.nextCycleGoals || "")
        .replace("{{conclusion}}", aiSections.conclusion || "")
        .replace("{{integratedSectorDiscussion}}", aiSections.integratedSectorDiscussion || "")
        .replace("{{teamMeetingAgenda}}", aiSections.teamMeetingAgenda || "");

      // Replace any remaining unfilled placeholders
      md = md.replace(/\{\{[^}]+\}\}/g, "—");

      setLoadingMsg("Carregando logos...");
      const logos = await fetchHospitalLogos(hospitalId);
      const hospLogo = logos.find(l => l.logo_type === "hospital" || l.logo_type === "main");
      const scihLogo = logos.find(l => l.logo_type === "scih" || l.logo_type === "ccih");
      if (hospLogo) md = md.replace("[LOGO DO HOSPITAL]", `![Logo do Hospital](${hospLogo.url})`);
      if (scihLogo) md = md.replace("[LOGO DA SCIH/CCIH]", `![Logo da SCIH](${scihLogo.url})`);
      // Clean up any remaining logo placeholders
      md = md.replace("[LOGO DO HOSPITAL]", "").replace("[LOGO DA SCIH/CCIH]", "");

      setMarkdownContent(md);
      setGeneratedAudits(audits);
      setGeneratedItems(items);
      setGeneratedMetrics(metrics as any);
      setGeneratedMode(mode);
      setGeneratedHospitalLogoUrl(hospLogo?.url);
      setGeneratedScihLogoUrl(scihLogo?.url);
      setPreviewTab("rendered");
      setStep("preview");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao gerar relatório: " + (err?.message || "Tente novamente."));
    } finally {
      setLoading(false);
      setLoadingMsg("");
    }
  }, [hospitalId, hospitalName, selectedSectors, mode, auditType, periodStart, periodEnd, periodStartDate, periodEndDate, managerName, managerEmail, technicalResponsible]);

  // ── Actions ──────────────────────────────────────────────────────────────────
  const handleCopy = () => {
    navigator.clipboard.writeText(markdownContent).then(() => toast.success("Markdown copiado!"));
  };

  const handleDownloadMd = () => {
    const blob = new Blob([markdownContent], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-auditoria-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo .md baixado!");
  };

  const handleSendEmail = () => {
    if (!managerEmail) {
      toast.error("Preencha o e-mail do gestor no formulário antes de gerar o relatório.");
      return;
    }
    const period = `${periodStart} a ${periodEnd}`;
    // Build short summary from metrics
    const met = generatedMetrics as AuditManagerReportMetrics | null;
    const summary = met
      ? `Conformidade geral: ${met.generalComplianceRate ?? "—"}%\nItens avaliados: ${met.totalItems ?? "—"}\nConformes: ${met.compliantItems ?? "—"}\nNão conformes: ${met.nonCompliantItems ?? "—"}\nClassificação: ${met.performanceClassification ?? "—"}`
      : "";
    const link = buildMailtoLink({
      to: managerEmail,
      managerName,
      sectorName: selectedSectors.join(", "),
      period,
      hospitalName,
      markdownSummary: summary,
    });
    window.open(link, "_blank");
    toast.success("Abrindo cliente de e-mail...");
  };

  const handlePrint = async () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) { toast.error("Permitir pop-ups para imprimir."); return; }

    // Capture charts as images so they show up on the printed page
    let chartsHtml = "";
    try {
      if (chartsRef.current) {
        const html2canvas = (await import("html2canvas")).default;
        const chartIds = generatedMode === "monthly_sector_compiled"
          ? ["chart-overall", "chart-category", "chart-noncompliance", "chart-trend", "chart-by-type"]
          : ["chart-overall", "chart-category", "chart-sector", "chart-noncompliance", "chart-trend"];
        const chartTitles: Record<string, string> = {
          "chart-overall": "Conformidade Geral",
          "chart-category": "Conformidade por Categoria",
          "chart-sector": "Conformidade por Setor",
          "chart-noncompliance": "Principais Não Conformidades",
          "chart-trend": "Evolução Mensal da Conformidade",
          "chart-by-type": "Conformidade por Tipo de Auditoria",
        };
        const imgs: string[] = [];
        for (const id of chartIds) {
          const el = chartsRef.current.querySelector(`#${id}`) as HTMLElement | null;
          if (!el) continue;
          try {
            const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: true });
            imgs.push(`<div style="page-break-inside:avoid;margin:14px 0;"><h3 style="font-size:12pt;color:#1e3a5f;margin:8px 0 6px;">${chartTitles[id] || id}</h3><img src="${canvas.toDataURL("image/png")}" style="max-width:100%;height:auto;border:1px solid #e2e8f0;border-radius:4px;" /></div>`);
          } catch {/* ignore */}
        }
        if (imgs.length > 0) {
          chartsHtml = `<h2 style="page-break-before:always;font-size:14pt;color:#1e3a5f;border-bottom:2px solid #2563eb;padding-bottom:4px;margin-top:20px;">Gráficos do Relatório</h2>${imgs.join("")}`;
        }
      }
    } catch (e) {
      console.warn("Falha ao capturar gráficos para impressão:", e);
    }

    // Header with both logos (hospital left + IRAS right)
    const headerLogos = `
      <div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:10px;margin-bottom:14px;border-bottom:2px solid #2563eb;">
        <div style="flex:0 0 auto;min-height:50px;display:flex;align-items:center;">
          ${generatedHospitalLogoUrl ? `<img src="${generatedHospitalLogoUrl}" style="max-height:56px;max-width:180px;object-fit:contain;" crossorigin="anonymous" />` : `<div style="font-weight:700;color:#1e3a5f;font-size:12pt;">${hospitalName}</div>`}
        </div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:13pt;font-weight:700;color:#1e3a5f;">Relatório Gerencial de Auditoria</div>
          <div style="font-size:9pt;color:#64748b;margin-top:2px;">${hospitalName}${selectedSectors.length ? ' · ' + selectedSectors.join(', ') : ''}</div>
        </div>
        <div style="flex:0 0 auto;min-height:50px;display:flex;align-items:center;">
          ${generatedScihLogoUrl ? `<img src="${generatedScihLogoUrl}" style="max-height:56px;max-width:120px;object-fit:contain;margin-right:8px;" crossorigin="anonymous" />` : ''}
          <img src="${irasControlLogo}" style="max-height:56px;max-width:140px;object-fit:contain;" />
        </div>
      </div>`;

    printWindow.document.write(`
      <!DOCTYPE html><html lang="pt-BR">
      <head><meta charset="UTF-8"><title>Relatório IRAS Control</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.6; margin: 1.5cm; color: #222; }
        h1 { font-size: 16pt; color: #1e3a5f; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
        h2 { font-size: 13pt; color: #1e3a5f; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; margin-top: 18px; }
        h3 { font-size: 11pt; color: #2563eb; margin-top: 14px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10pt; }
        th { background: #1e3a5f; color: #fff; padding: 6px 8px; text-align: left; border: 1px solid #1e3a5f; }
        td { padding: 5px 8px; border: 1px solid #d1d5db; vertical-align: top; }
        tr:nth-child(even) td { background: #f8fafc; }
        img { max-height: 60px; object-fit: contain; }
        @media print { body { margin: 1.5cm; } .no-print { display: none; } }
      </style>
      </head><body>${headerLogos}${renderedHtml}${chartsHtml}</body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    // Give images (charts + logos) time to load before triggering print
    setTimeout(() => { printWindow.print(); }, 1200);
  };

  const handleDownloadPdfWithCharts = async () => {
    if (!generatedMetrics) return;
    setPdfLoading(true);
    try {
      await generateReportPdfWithCharts({
        chartsContainerRef: chartsRef,
        markdownContent,
        hospitalName,
        sectorName: selectedSectors.join(", "),
        auditTypeName: mode === "single_audit_type" ? getAuditTypeName(auditType) : "Compilado Mensal",
        period: `${periodStart} a ${periodEnd}`,
        hospitalLogoUrl: generatedHospitalLogoUrl,
        scihLogoUrl: generatedScihLogoUrl,
        irasLogoUrl: irasControlLogo,
        metrics: generatedMetrics,
        mode: generatedMode,
      });
      toast.success("PDF com gráficos exportado!");
    } catch (e: any) {
      toast.error("Erro ao exportar PDF: " + (e?.message || "Tente novamente."));
    } finally {
      setPdfLoading(false);
    }
  };

  const handleClose = () => { if (!loading) { setStep("form"); setMarkdownContent(""); onClose(); } };
  const handleBack = () => { setStep("form"); setMarkdownContent(""); };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-[96vw] max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            {step === "form" ? "Gerar Relatório Gerencial de Auditoria" : "Relatório Gerado"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {step === "form"
              ? "Preencha todos os campos e clique em Gerar Relatório"
              : "Visualize, edite, copie, baixe ou envie por e-mail"}
          </DialogDescription>
        </DialogHeader>

        {/* ── FORM ── */}
        {step === "form" && (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

            {/* Tipo de relatório */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Tipo de relatório</Label>
              <RadioGroup value={mode} onValueChange={(v) => setMode(v as AuditReportMode)} className="flex gap-6 flex-wrap">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="single_audit_type" id="mode-single" />
                  <Label htmlFor="mode-single" className="cursor-pointer text-sm">Por tipo de auditoria</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="monthly_sector_compiled" id="mode-compiled" />
                  <Label htmlFor="mode-compiled" className="cursor-pointer text-sm">Relatório mensal compilado do gestor</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Período */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Período inicial</Label>
                <Input type="month" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-sm font-medium">Período final</Label>
                <Input type="month" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="h-9 text-sm" />
              </div>
            </div>

            {/* Tipo de auditoria */}
            {mode === "single_audit_type" && (
              <div className="space-y-1">
                <Label className="text-sm font-medium">Tipo de auditoria</Label>
                <Select value={auditType} onValueChange={setAuditType}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIT_TYPE_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Setores */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Setores{" "}
                  <span className="text-muted-foreground font-normal text-xs">(selecione um ou mais)</span>
                </Label>
                <div className="flex gap-3 text-xs">
                  <span className="text-muted-foreground">{selectedSectors.length} selecionado(s)</span>
                  <button className="text-primary hover:underline font-medium" onClick={selectAll} type="button">Todos</button>
                  <button className="text-muted-foreground hover:underline" onClick={clearAll} type="button">Limpar</button>
                </div>
              </div>
              <Input
                placeholder="Buscar setor..."
                value={sectorSearch}
                onChange={e => setSectorSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="border rounded-md p-2 max-h-44 overflow-y-auto space-y-1 bg-muted/30">
                {filteredSectors.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2 text-center">Nenhum setor encontrado.</p>
                ) : filteredSectors.map(s => (
                  <div key={s} className="flex items-center gap-2 py-1 px-1 hover:bg-background rounded cursor-pointer" onClick={() => toggleSector(s)}>
                    <Checkbox
                      id={`sector-${s}`}
                      checked={selectedSectors.includes(s)}
                      onCheckedChange={() => toggleSector(s)}
                    />
                    <Label htmlFor={`sector-${s}`} className="cursor-pointer text-sm font-normal select-none">{s}</Label>
                  </div>
                ))}
              </div>
              {selectedSectors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedSectors.map(s => (
                    <Badge key={s} variant="secondary" className="text-xs cursor-pointer gap-1" onClick={() => toggleSector(s)}>
                      {s} <span className="opacity-60">×</span>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Identificação do relatório */}
            <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Identificação do documento
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="mgr-name" className="text-sm font-medium">Nome do gestor destinatário</Label>
                  <Input
                    id="mgr-name"
                    value={managerName}
                    onChange={e => setManagerName(e.target.value)}
                    placeholder="Ex.: Dra. Maria Silva"
                    className="h-9 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="mgr-email" className="text-sm font-medium">E-mail do gestor</Label>
                  <Input
                    id="mgr-email"
                    type="email"
                    value={managerEmail}
                    onChange={e => setManagerEmail(e.target.value)}
                    placeholder="gestor@hospital.com.br"
                    className="h-9 text-sm"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="tech" className="text-sm font-medium">Responsável técnico (CCIH/SCIH)</Label>
                <Input
                  id="tech"
                  value={technicalResponsible}
                  onChange={e => setTechnicalResponsible(e.target.value)}
                  placeholder="Ex.: Enf.ª CCIH – CRENFx"
                  className="h-9 text-sm"
                />
              </div>
            </div>

            {/* Opções */}
            <div className="flex items-center gap-2">
              <Checkbox id="action-plan" checked={includeActionPlan} onCheckedChange={v => setIncludeActionPlan(Boolean(v))} />
              <Label htmlFor="action-plan" className="text-sm cursor-pointer">Incluir plano de ação 5W2H sugerido</Label>
            </div>
          </div>
        )}

        {/* ── PREVIEW ── */}
        {step === "preview" && generatedMetrics && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Hidden chart renderer for PDF */}
            <AuditReportChartsRenderer
              ref={chartsRef}
              audits={generatedAudits}
              items={generatedItems}
              metrics={generatedMetrics}
              mode={generatedMode}
            />

            {/* Tab bar */}
            <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b bg-background shrink-0">
              <button
                onClick={() => setPreviewTab("rendered")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  previewTab === "rendered"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-3 w-3" />
                Visualizar
              </button>
              <button
                onClick={() => setPreviewTab("edit")}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
                  previewTab === "edit"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Edit2 className="h-3 w-3" />
                Editar Markdown
              </button>
              <button
                onClick={() => setPreviewTab("rendered")}
                style={{ marginLeft: "auto" }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 border-transparent text-muted-foreground hover:text-foreground transition-colors"
                title="Visualizar gráficos"
              >
              </button>
            </div>

            {/* Rendered view */}
            {previewTab === "rendered" && (
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div
                  className="prose prose-sm max-w-none"
                  style={{ fontFamily: "Arial, sans-serif", fontSize: "11pt", color: "#222", lineHeight: "1.7" }}
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
                {/* Charts section */}
                {generatedMetrics && (
                  <div className="mt-8 pt-6 border-t">
                    <h2 style={{ fontSize: "13pt", color: "#1e3a5f", fontWeight: "700", marginBottom: "16px" }}>
                      Gráficos do Relatório
                    </h2>
                    <AuditReportChartsPreview
                      audits={generatedAudits}
                      items={generatedItems}
                      metrics={generatedMetrics}
                      mode={generatedMode}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Edit view */}
            {previewTab === "edit" && (
              <div className="flex-1 overflow-hidden px-6 py-4 flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Edite o Markdown abaixo. As alterações serão refletidas na visualização ao voltar para a aba "Visualizar".
                </p>
                <Textarea
                  value={markdownContent}
                  onChange={e => setMarkdownContent(e.target.value)}
                  className="flex-1 font-mono text-xs resize-none min-h-0"
                  style={{ minHeight: "400px" }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── FOOTER ── */}
        <DialogFooter className="px-6 py-3 border-t gap-2 flex-wrap shrink-0 bg-background">
          {step === "form" ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={loading}>
                Cancelar
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={loading || selectedSectors.length === 0}
                className="gap-1.5"
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{loadingMsg || "Gerando..."}</>
                ) : (
                  <><FileText className="h-4 w-4" />Gerar Relatório</>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1.5">
                <ArrowLeft className="h-4 w-4" />Voltar
              </Button>
              <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                <Copy className="h-4 w-4" />Copiar Markdown
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadMd} className="gap-1.5">
                <Download className="h-4 w-4" />.md
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint} className="gap-1.5">
                <Printer className="h-4 w-4" />Imprimir / PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSendEmail}
                disabled={!managerEmail}
                title={!managerEmail ? "Preencha o e-mail do gestor no formulário" : `Enviar para ${managerEmail}`}
                className="gap-1.5"
              >
                <Mail className="h-4 w-4" />Enviar por E-mail
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPdfWithCharts}
                disabled={pdfLoading}
                className="gap-1.5"
              >
                {pdfLoading
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Gerando PDF...</>
                  : <><FileText className="h-4 w-4" />PDF com Gráficos</>
                }
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
