import { useState, useRef, useEffect } from "react";
import { Image, FileDown, Target, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface MetaField {
  key: string;
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
}

interface ChartActionsProps {
  chartRef: React.RefObject<HTMLDivElement>;
  chartTitle: string;
  metaValue?: number;
  onMetaChange?: (value: number | undefined) => void;
  metaUnit?: string;
  /** Optional: define multiple metas (e.g. one per device). When provided, overrides single metaValue/onMetaChange. */
  metaFields?: MetaField[];
}

export default function ChartActions({ chartRef, chartTitle, metaValue, onMetaChange, metaUnit = "", metaFields }: ChartActionsProps) {
  const multi = metaFields && metaFields.length > 0;
  const hasAnyMeta = multi
    ? metaFields!.some(f => f.value !== undefined)
    : metaValue !== undefined;
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaInput, setMetaInput] = useState("");
  const [multiInputs, setMultiInputs] = useState<Record<string, string>>({});

  const exportJPG = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `${chartTitle.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.jpg`;
      link.href = canvas.toDataURL("image/jpeg", 0.95);
      link.click();
    } catch (e) {
      console.error("Erro ao exportar JPG:", e);
    }
  };

  const exportPDF = async () => {
    if (!chartRef.current) return;
    try {
      const canvas = await html2canvas(chartRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: canvas.width > canvas.height ? "l" : "p", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const margin = 10;
      const usableW = pageW - margin * 2;
      const ratio = canvas.height / canvas.width;
      const imgW = usableW;
      const imgH = imgW * ratio;
      pdf.setFontSize(12);
      pdf.text(chartTitle, margin, margin + 5);
      pdf.setFontSize(8);
      pdf.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, margin, margin + 10);
      pdf.addImage(imgData, "PNG", margin, margin + 14, imgW, imgH);
      pdf.save(`${chartTitle.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (e) {
      console.error("Erro ao exportar PDF:", e);
    }
  };

  const openMeta = () => {
    if (multi) {
      const init: Record<string, string> = {};
      metaFields!.forEach(f => { init[f.key] = f.value !== undefined ? String(f.value) : ""; });
      setMultiInputs(init);
    } else {
      setMetaInput(metaValue !== undefined ? String(metaValue) : "");
    }
    setMetaOpen(true);
  };

  const saveMeta = () => {
    if (multi) {
      metaFields!.forEach(f => {
        const raw = multiInputs[f.key] ?? "";
        const val = parseFloat(raw);
        f.onChange(raw === "" || isNaN(val) ? undefined : val);
      });
    } else {
      const val = parseFloat(metaInput);
      onMetaChange?.(isNaN(val) ? undefined : val);
    }
    setMetaOpen(false);
  };

  const clearAllMetas = () => {
    if (multi) metaFields!.forEach(f => f.onChange(undefined));
    else onMetaChange?.(undefined);
    setMetaOpen(false);
  };

  // Fullscreen support: toggles native browser fullscreen on the chart container
  const [isFs, setIsFs] = useState(false);
  useEffect(() => {
    const onChange = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = async () => {
    const el = chartRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        el.classList.add("chart-fullscreen");
        await el.requestFullscreen();
      } else {
        await document.exitFullscreen();
        el.classList.remove("chart-fullscreen");
      }
    } catch (e) {
      console.error("Erro ao alternar tela cheia:", e);
    }
  };

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen}>
                <Maximize2 className={`h-3.5 w-3.5 ${isFs ? "text-primary" : "text-muted-foreground"}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p className="text-xs">{isFs ? "Sair da tela cheia" : "Ampliar (tela cheia)"}</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportJPG}>
                <Image className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p className="text-xs">Exportar JPG</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportPDF}>
                <FileDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top"><p className="text-xs">Exportar PDF</p></TooltipContent>
          </Tooltip>
          {(onMetaChange || multi) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={openMeta}>
                  <Target className={`h-3.5 w-3.5 ${hasAnyMeta ? "text-primary" : "text-muted-foreground"}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top"><p className="text-xs">Definir Meta</p></TooltipContent>
            </Tooltip>
          )}
        </div>
      </TooltipProvider>

      <Dialog open={metaOpen} onOpenChange={setMetaOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Definir Meta — {chartTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {multi ? (
              metaFields!.map(f => (
                <div key={f.key} className="space-y-1.5">
                  <Label className="text-sm">{f.label} {metaUnit ? `(${metaUnit})` : ""}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={multiInputs[f.key] ?? ""}
                    onChange={e => setMultiInputs(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder="Ex: 10"
                  />
                </div>
              ))
            ) : (
              <div className="space-y-1.5">
                <Label className="text-sm">Valor da meta {metaUnit ? `(${metaUnit})` : ""}</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={metaInput}
                  onChange={e => setMetaInput(e.target.value)}
                  placeholder="Ex: 10"
                />
              </div>
            )}
            {hasAnyMeta && (
              <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={clearAllMetas}>
                Remover {multi ? "todas as metas" : "meta"}
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMetaOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={saveMeta}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
