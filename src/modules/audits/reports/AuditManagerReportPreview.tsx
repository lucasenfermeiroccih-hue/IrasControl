import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, FileText, Mail } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { AuditReportMetrics, MonthlySectorCompiledAuditMetrics, AuditReportMode } from "./auditReportTypes";

interface AuditManagerReportPreviewProps {
  markdown: string;
  metrics: AuditReportMetrics | MonthlySectorCompiledAuditMetrics;
  mode: AuditReportMode;
  onClose: () => void;
}

function isSingleMetrics(m: AuditReportMetrics | MonthlySectorCompiledAuditMetrics): m is AuditReportMetrics {
  return "conformidadeGeral" in m;
}

const STATUS_COLOR: Record<string, string> = {
  verde: "bg-emerald-100 text-emerald-800 border-emerald-200",
  amarelo: "bg-amber-100 text-amber-800 border-amber-200",
  vermelho: "bg-red-100 text-red-800 border-red-200",
};

const CLASS_COLOR: Record<string, string> = {
  Excelente: "text-emerald-600",
  Bom: "text-blue-600",
  Regular: "text-amber-600",
  Crítico: "text-red-600",
};

// Load an image URL as a base64 data URL + natural dimensions
async function loadImageAsDataUrl(url: string): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

// Extract logo URLs from markdown (![...](url) pattern)
function extractLogoUrls(markdown: string): { hospitalLogoUrl: string | null; scihLogoUrls: string[] } {
  const imageRegex = /!\[Logo do Hospital\]\(([^)]+)\)/g;
  const scihRegex = /!\[Logo SCIH\]\(([^)]+)\)/g;
  const hospitalMatch = imageRegex.exec(markdown);
  const scihUrls: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = scihRegex.exec(markdown)) !== null) scihUrls.push(m[1]);
  return { hospitalLogoUrl: hospitalMatch?.[1] ?? null, scihLogoUrls: scihUrls };
}

export default function AuditManagerReportPreview({
  markdown,
  metrics,
  mode,
  onClose,
}: AuditManagerReportPreviewProps) {
  const preRef = useRef<HTMLPreElement>(null);

  const isSingle = isSingleMetrics(metrics);
  const conformidade = isSingle ? metrics.conformidadeGeral : metrics.generalComplianceRate;
  const classificacao = isSingle ? metrics.classificacao : metrics.classification;
  const statusCor = isSingle ? metrics.statusCor : metrics.statusColor;
  const totalAuditorias = isSingle ? metrics.totalAuditorias : metrics.totalAudits;
  const ncs = isSingle ? metrics.itensNaoConformes : metrics.nonCompliantItems;
  const baixaAmostragem = isSingle ? metrics.baixaAmostragem : metrics.lowSampleAlert;
  const tendencia = isSingle ? metrics.tendencia : undefined;

  function handleCopy() {
    navigator.clipboard.writeText(markdown).then(() => {
      toast({ title: "Markdown copiado!", description: "Conteúdo copiado para a área de transferência." });
    });
  }

  function handleDownload() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const prefix = mode === "monthly_sector_compiled" ? "relatorio-compilado" : "relatorio-auditoria";
    a.download = `${prefix}-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Download iniciado", description: "Arquivo .md salvo com sucesso." });
  }

  async function handlePreparePdf() {
    toast({ title: "Preparando PDF…", description: "Carregando logos e gerando PDF, aguarde." });
    try {
      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const PW = doc.internal.pageSize.getWidth();
      const PH = doc.internal.pageSize.getHeight();
      const MG = 14;

      // Load logos from markdown
      const { hospitalLogoUrl, scihLogoUrls } = extractLogoUrls(markdown);
      const [hospitalLogo, ...scihLogos] = await Promise.all([
        hospitalLogoUrl ? loadImageAsDataUrl(hospitalLogoUrl) : Promise.resolve(null),
        ...scihLogoUrls.map(loadImageAsDataUrl),
      ]);

      // Header
      const HEADER_H = 32;
      doc.setFillColor(15, 76, 117);
      doc.rect(0, 0, PW, HEADER_H, "F");
      doc.setFillColor(13, 148, 136);
      doc.rect(0, 0, PW, 2, "F");
      doc.rect(0, HEADER_H, PW, 2, "F");

      // Logos in header
      const lh = 16;
      let logoXRight = PW - MG;

      // SCIH logos right-aligned
      const validScih = scihLogos.filter((l): l is { dataUrl: string; w: number; h: number } => l !== null);
      validScih.slice(0, 2).reverse().forEach((logo) => {
        const lw = (logo.w / logo.h) * lh;
        logoXRight -= lw + 2;
        doc.addImage(logo.dataUrl, "PNG", logoXRight, (HEADER_H - lh) / 2, lw, lh);
      });

      // Hospital logo left-aligned
      if (hospitalLogo) {
        const lw = (hospitalLogo.w / hospitalLogo.h) * lh;
        doc.addImage(hospitalLogo.dataUrl, "PNG", MG, (HEADER_H - lh) / 2, lw, lh);
      }

      // Title
      const titleX = hospitalLogo ? MG + 40 : MG;
      const titleMaxW = logoXRight - titleX - 4;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      const title = mode === "monthly_sector_compiled"
        ? "Relatório Mensal Compilado — IRAS Control"
        : "Relatório Gerencial de Auditoria — IRAS Control";
      doc.text(title, titleX + titleMaxW / 2, HEADER_H / 2 - 2, { align: "center", maxWidth: titleMaxW });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(160, 205, 235);
      doc.text(
        `Conformidade: ${conformidade}% · Classificação: ${classificacao} · Emitido em: ${new Date().toLocaleDateString("pt-BR")}`,
        titleX + titleMaxW / 2,
        HEADER_H / 2 + 5,
        { align: "center", maxWidth: titleMaxW }
      );

      // Body — strip markdown symbols for clean text
      let y = HEADER_H + 12;
      const cleanedMarkdown = markdown
        .replace(/!\[.*?\]\(.*?\)/g, "") // remove image tags (logos)
        .replace(/^#{1,6}\s+/gm, "")    // headings
        .replace(/\*\*(.+?)\*\*/g, "$1") // bold
        .replace(/\*(.+?)\*/g, "$1")     // italic
        .replace(/`(.+?)`/g, "$1")       // code
        .replace(/^[>|-]\s+/gm, "");     // blockquote / table pipes

      const lines = doc.splitTextToSize(cleanedMarkdown, PW - MG * 2);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(40, 40, 40);
      lines.forEach((line: string) => {
        if (y > PH - 12) {
          doc.addPage();
          y = 16;
        }
        doc.text(line, MG, y);
        y += 4.5;
      });

      // Footer on all pages
      const pageCount = (doc as any).internal.getNumberOfPages?.() ?? 1;
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFillColor(245, 245, 245);
        doc.rect(0, PH - 8, PW, 8, "F");
        doc.setFontSize(6.5);
        doc.setTextColor(130, 130, 130);
        const footerLabel = mode === "monthly_sector_compiled"
          ? "IRAS Control · Relatório Compilado"
          : "IRAS Control · Relatório de Auditoria";
        doc.text(`${footerLabel} · Página ${i} de ${pageCount}`, MG, PH - 2);
      }

      const prefix = mode === "monthly_sector_compiled" ? "relatorio-compilado" : "relatorio-auditoria";
      doc.save(`${prefix}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "PDF gerado!", description: "Arquivo PDF salvo com sucesso." });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro ao gerar PDF", description: "Tente copiar o Markdown e converter externamente.", variant: "destructive" });
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-lg bg-muted/50 border">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Conformidade:</span>
          <span className={`text-sm font-bold ${CLASS_COLOR[classificacao]}`}>{conformidade}%</span>
        </div>
        <Badge variant="outline" className={`text-xs border ${STATUS_COLOR[statusCor]}`}>
          {classificacao}
        </Badge>
        <div className="text-xs text-muted-foreground">
          {totalAuditorias} auditoria{totalAuditorias !== 1 ? "s" : ""} · {ncs} NC{ncs !== 1 ? "s" : ""}
        </div>
        {mode === "monthly_sector_compiled" && !isSingle && (
          <Badge variant="outline" className="text-xs border bg-blue-50 text-blue-700 border-blue-200">
            {(metrics as MonthlySectorCompiledAuditMetrics).totalAuditTypes} tipos de auditoria
          </Badge>
        )}
        {baixaAmostragem && (
          <Badge variant="outline" className="text-xs border bg-amber-50 text-amber-700 border-amber-200">
            Baixa amostragem
          </Badge>
        )}
        {tendencia && tendencia !== "Sem histórico" && (
          <Badge variant="outline" className="text-xs border">
            {tendencia}
          </Badge>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          <Copy className="h-4 w-4 mr-1.5" />
          Copiar Markdown
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-1.5" />
          Baixar .md
        </Button>
        <Button variant="outline" size="sm" onClick={handlePreparePdf}>
          <FileText className="h-4 w-4 mr-1.5" />
          Exportar PDF
        </Button>
        <Button variant="outline" size="sm" disabled title="Disponível em versão futura">
          <Mail className="h-4 w-4 mr-1.5" />
          Enviar por e-mail
        </Button>
      </div>

      {/* Markdown preview */}
      <div className="flex-1 rounded-lg border bg-background overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <span className="text-xs font-medium text-muted-foreground">Prévia do relatório</span>
          <span className="text-[10px] text-muted-foreground">{markdown.length} caracteres</span>
        </div>
        <ScrollArea className="h-[460px]">
          <pre
            ref={preRef}
            className="p-4 text-[11px] leading-relaxed font-mono whitespace-pre-wrap text-foreground"
          >
            {markdown}
          </pre>
        </ScrollArea>
      </div>

      <div className="flex justify-end mt-4">
        <Button variant="ghost" size="sm" onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}
