import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Download, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

// ─── Public Types ───────────────────────────────────────────────────────────────

export interface ReportKpi {
  label: string;
  value: string;
  sub?: string;
  status?: "ok" | "warning" | "critical";
}

export interface ReportSectorRow {
  name: string;
  compliance: number;
  audits: number;
  nc: number;
}

export interface ReportMonthlyPoint {
  month: string;
  value: number;
}

export interface ReportIssue {
  item: string;
  count: number;
}

export interface ReportTable {
  title: string;
  headers: string[];
  rows: string[][];
}

export interface DashboardReportData {
  title: string;
  subtitle: string;
  hospitalName: string;
  period?: string;
  goal?: string;
  referenceNorm?: string;
  context: string;
  methodology?: string;
  kpis: ReportKpi[];
  sectorData?: ReportSectorRow[];
  monthlyTrend?: ReportMonthlyPoint[];
  topIssues?: ReportIssue[];
  discussion: string;
  recommendations: string[];
  extraTables?: ReportTable[];
  filenamePrefix?: string;
}

// ─── Internal Helpers ──────────────────────────────────────────────────────────

const statusColor = (s?: "ok" | "warning" | "critical") => {
  if (s === "ok") return "#16a34a";
  if (s === "warning") return "#d97706";
  if (s === "critical") return "#dc2626";
  return "#1e40af";
};

const compColor = (v: number) =>
  v >= 85 ? "#16a34a" : v >= 70 ? "#d97706" : "#dc2626";

const compBg = (v: number) =>
  v >= 85 ? "#dcfce7" : v >= 70 ? "#fef9c3" : "#fee2e2";

const compLabel = (v: number) =>
  v >= 85 ? "Adequado" : v >= 70 ? "Atenção" : "Crítico";

// ─── Table helpers ─────────────────────────────────────────────────────────────

const TH = ({ children }: { children: React.ReactNode }) => (
  <th style={{ padding: "7px 10px", textAlign: "left", fontSize: "10px", fontWeight: 600, color: "#1e40af", borderBottom: "2px solid #bfdbfe", backgroundColor: "#eff6ff" }}>
    {children}
  </th>
);

const TD = ({ children, center }: { children: React.ReactNode; center?: boolean }) => (
  <td style={{ padding: "6px 10px", fontSize: "11px", color: "#374151", borderBottom: "1px solid #f3f4f6", textAlign: center ? "center" : "left" }}>
    {children}
  </td>
);

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ num, title, children }: { num: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
        <div style={{
          width: "22px", height: "22px", borderRadius: "50%",
          backgroundColor: "#1e40af", color: "#fff",
          fontSize: "10px", fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          {num}
        </div>
        <h3 style={{ fontSize: "13px", fontWeight: 700, color: "#1e3a8a", margin: 0, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

// ─── Report Document ───────────────────────────────────────────────────────────

function ReportDocument({ data, docRef }: { data: DashboardReportData; docRef: React.RefObject<HTMLDivElement> }) {
  const today = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  let sectionIdx = 0;
  const nextSection = () => ++sectionIdx;

  const hasSectors = (data.sectorData?.length ?? 0) > 0;
  const hasTrend = (data.monthlyTrend?.length ?? 0) > 0;
  const hasIssues = (data.topIssues?.length ?? 0) > 0;
  const hasExtra = (data.extraTables?.length ?? 0) > 0;

  return (
    <div
      ref={docRef}
      style={{
        fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
        backgroundColor: "#ffffff",
        color: "#111827",
        width: "794px",
        padding: "44px 52px 36px",
        boxSizing: "border-box",
      }}
    >
      {/* ── CABEÇALHO ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "3px solid #1d4ed8", paddingBottom: "16px", marginBottom: "28px" }}>
        <div>
          <div style={{ fontSize: "15px", fontWeight: 800, color: "#1d4ed8", letterSpacing: "0.06em" }}>IRASCONTROL</div>
          <div style={{ fontSize: "9px", color: "#6b7280", marginTop: "3px", letterSpacing: "0.03em" }}>Sistema de Controle de Infecção Hospitalar</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#1f2937" }}>{data.hospitalName}</div>
          <div style={{ fontSize: "9px", color: "#6b7280", marginTop: "3px" }}>Gerado em {today}</div>
        </div>
      </div>

      {/* ── TÍTULO DO RELATÓRIO ── */}
      <div style={{ marginBottom: "28px", paddingBottom: "20px", borderBottom: "1px solid #e5e7eb" }}>
        <div style={{ fontSize: "9px", fontWeight: 600, color: "#6b7280", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "6px" }}>
          Relatório de Dashboard
        </div>
        <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#1e3a8a", margin: "0 0 6px 0", lineHeight: 1.2 }}>
          {data.title}
        </h1>
        <p style={{ fontSize: "12px", color: "#4b5563", margin: 0, lineHeight: 1.5 }}>{data.subtitle}</p>

        {(data.goal || data.period || data.referenceNorm) && (
          <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
            {data.period && (
              <span style={{ fontSize: "10px", backgroundColor: "#eff6ff", color: "#1d4ed8", padding: "3px 9px", borderRadius: "99px", border: "1px solid #bfdbfe", fontWeight: 500 }}>
                📅 {data.period}
              </span>
            )}
            {data.goal && (
              <span style={{ fontSize: "10px", backgroundColor: "#f0fdf4", color: "#15803d", padding: "3px 9px", borderRadius: "99px", border: "1px solid #bbf7d0", fontWeight: 500 }}>
                🎯 {data.goal}
              </span>
            )}
            {data.referenceNorm && (
              <span style={{ fontSize: "10px", backgroundColor: "#fefce8", color: "#92400e", padding: "3px 9px", borderRadius: "99px", border: "1px solid #fde68a", fontWeight: 500 }}>
                📋 {data.referenceNorm}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── 1. CONTEXTO E METODOLOGIA ── */}
      <Section num={nextSection()} title="Contexto e Metodologia">
        <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "14px 16px" }}>
          <p style={{ fontSize: "12px", lineHeight: 1.75, color: "#374151", margin: 0 }}>{data.context}</p>
          {data.methodology && (
            <p style={{ fontSize: "12px", lineHeight: 1.75, color: "#374151", margin: "10px 0 0 0" }}>
              <span style={{ fontWeight: 600 }}>Metodologia: </span>{data.methodology}
            </p>
          )}
        </div>
      </Section>

      {/* ── 2. KPIs ── */}
      <Section num={nextSection()} title="Indicadores Principais (KPIs)">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
          {data.kpis.map((k, i) => (
            <div key={i} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "12px 14px", backgroundColor: "#fafafa", borderLeft: `3px solid ${statusColor(k.status)}` }}>
              <div style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "5px", textTransform: "uppercase", letterSpacing: "0.05em" }}>{k.label}</div>
              <div style={{ fontSize: "20px", fontWeight: 800, color: statusColor(k.status), lineHeight: 1 }}>{k.value}</div>
              {k.sub && <div style={{ fontSize: "9px", color: "#9ca3af", marginTop: "4px" }}>{k.sub}</div>}
            </div>
          ))}
        </div>
      </Section>

      {/* ── 3. ANÁLISE POR SETOR ── */}
      {hasSectors && (
        <Section num={nextSection()} title="Análise por Setor">
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <TH>Setor</TH>
                <TH>Conformidade</TH>
                <TH>Auditorias</TH>
                <TH>Não Conformes</TH>
                <TH>Status</TH>
              </tr>
            </thead>
            <tbody>
              {data.sectorData!.map((s, i) => (
                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                  <TD>{s.name}</TD>
                  <TD>
                    <span style={{ fontWeight: 700, color: compColor(s.compliance) }}>{s.compliance}%</span>
                  </TD>
                  <TD center>{s.audits}</TD>
                  <TD center>
                    <span style={{ color: s.nc > 0 ? "#dc2626" : "#16a34a", fontWeight: s.nc > 0 ? 600 : 400 }}>{s.nc}</span>
                  </TD>
                  <TD>
                    <span style={{ fontSize: "9px", padding: "2px 8px", borderRadius: "99px", fontWeight: 600, backgroundColor: compBg(s.compliance), color: compColor(s.compliance) }}>
                      {compLabel(s.compliance)}
                    </span>
                  </TD>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* ── TENDÊNCIA MENSAL ── */}
      {hasTrend && (
        <Section num={nextSection()} title="Tendência Mensal">
          <div style={{ backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "14px 16px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {data.monthlyTrend!.map((m, i) => (
                <div key={i} style={{ textAlign: "center", minWidth: "52px", padding: "6px 8px", borderRadius: "6px", backgroundColor: "#ffffff", border: `1px solid ${compColor(m.value)}22` }}>
                  <div style={{ fontSize: "9px", color: "#6b7280", marginBottom: "4px" }}>{m.month}</div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: compColor(m.value) }}>{m.value}%</div>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* ── PRINCIPAIS NÃO CONFORMIDADES ── */}
      {hasIssues && (
        <Section num={nextSection()} title="Principais Não Conformidades / Falhas">
          <div style={{ backgroundColor: "#fff7f7", border: "1px solid #fecaca", borderRadius: "6px", padding: "14px 16px" }}>
            <ol style={{ margin: 0, paddingLeft: "20px" }}>
              {data.topIssues!.slice(0, 10).map((issue, i) => (
                <li key={i} style={{ fontSize: "12px", color: "#374151", marginBottom: "8px", lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 600 }}>"{issue.item}"</span>
                  <span style={{ color: "#dc2626", fontSize: "11px" }}> — {issue.count} ocorrência{issue.count !== 1 ? "s" : ""}</span>
                </li>
              ))}
            </ol>
          </div>
        </Section>
      )}

      {/* ── TABELAS EXTRAS ── */}
      {hasExtra && data.extraTables!.map((table, ti) => (
        <Section key={ti} num={nextSection()} title={table.title}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {table.headers.map((h, i) => <TH key={i}>{h}</TH>)}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, ri) => (
                <tr key={ri} style={{ backgroundColor: ri % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                  {row.map((cell, ci) => <TD key={ci}>{cell}</TD>)}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ))}

      {/* ── DISCUSSÃO E ANÁLISE CRÍTICA ── */}
      <Section num={nextSection()} title="Discussão e Análise Crítica">
        <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", padding: "14px 16px" }}>
          {data.discussion.split("\n").filter(Boolean).map((para, i) => (
            <p key={i} style={{ fontSize: "12px", lineHeight: 1.75, color: "#374151", margin: i === 0 ? 0 : "10px 0 0 0" }}>{para}</p>
          ))}
        </div>
      </Section>

      {/* ── RECOMENDAÇÕES ── */}
      <Section num={nextSection()} title="Recomendações">
        <ol style={{ margin: 0, paddingLeft: "20px" }}>
          {data.recommendations.map((rec, i) => (
            <li key={i} style={{ fontSize: "12px", color: "#374151", marginBottom: "10px", lineHeight: 1.65, paddingLeft: "4px" }}>
              {rec}
            </li>
          ))}
        </ol>
      </Section>

      {/* ── RODAPÉ ── */}
      <div style={{ borderTop: "2px solid #e5e7eb", paddingTop: "14px", marginTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: "9px", color: "#9ca3af" }}>
          Documento gerado automaticamente pelo IRASControl · {today}
        </span>
        <span style={{ fontSize: "9px", color: "#9ca3af" }}>
          CCIH — Controle de Infecção Hospitalar · Uso exclusivo interno
        </span>
      </div>
    </div>
  );
}

// ─── Main Export: DashboardPdfReport Button ────────────────────────────────────

export function DashboardPdfReport({ data }: { data: DashboardReportData }) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const docRef = useRef<HTMLDivElement>(null);

  const handleDownload = async () => {
    if (!docRef.current) return;
    setGenerating(true);
    try {
      const html2canvasLib = (await import("html2canvas")).default;
      const { default: jsPDF } = await import("jspdf");

      toast.info("Gerando relatório PDF...");

      await new Promise((r) => setTimeout(r, 150));

      const canvas = await html2canvasLib(docRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: 794,
      });

      const margin = 8;
      const pageW = 210;
      const pageH = 297;
      const usableW = pageW - margin * 2;
      const usableH = pageH - margin * 2;

      const imgW = usableW;
      const imgH = (canvas.height / canvas.width) * imgW;

      const pdf = new jsPDF({ unit: "mm", format: "a4" });

      let heightLeft = imgH;
      let srcTop = 0;
      let pageNum = 0;

      while (heightLeft > 0) {
        if (pageNum > 0) pdf.addPage();
        const sliceH = Math.min(heightLeft, usableH);
        const srcY = Math.floor((srcTop / imgH) * canvas.height);
        const srcHpx = Math.ceil((sliceH / imgH) * canvas.height);

        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = srcHpx;
        const ctx = slice.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, slice.width, slice.height);
        ctx.drawImage(canvas, 0, srcY, canvas.width, srcHpx, 0, 0, canvas.width, srcHpx);

        pdf.addImage(slice.toDataURL("image/jpeg", 0.93), "JPEG", margin, margin, imgW, sliceH);
        heightLeft -= usableH;
        srcTop += usableH;
        pageNum++;
      }

      const prefix = data.filenamePrefix || "relatorio-dashboard";
      pdf.save(`${prefix}-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success("Relatório PDF exportado com sucesso!");
    } catch (err) {
      console.error("Erro ao gerar relatório PDF:", err);
      toast.error("Erro ao gerar PDF. Tente novamente.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5">
        <FileText className="h-4 w-4" />
        Relatório PDF
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[900px] w-[96vw] h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-base">{data.title} — Relatório</DialogTitle>
              <Button onClick={handleDownload} disabled={generating} size="sm" className="gap-2 ml-4">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {generating ? "Gerando..." : "Download PDF"}
              </Button>
            </div>
          </DialogHeader>

          {/* Scrollable preview */}
          <div className="flex-1 overflow-auto bg-gray-100 p-4">
            <div className="flex justify-center">
              <div style={{ transform: "scale(0.82)", transformOrigin: "top center", width: "794px" }}>
                <ReportDocument data={data} docRef={docRef} />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
