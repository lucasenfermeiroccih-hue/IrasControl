import { forwardRef, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import type { AuditRecord, AuditItemRecord, AuditManagerReportMetrics, MonthlySectorCompiledAuditMetrics, AuditReportMode } from "./auditReportTypes";

const COLORS = {
  compliant: "#22c55e",
  nonCompliant: "#ef4444",
  primary: "#3b82f6",
  warning: "#f59e0b",
  purple: "#8b5cf6",
};

const CHART_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#10b981", "#f97316", "#6366f1",
];

interface ChartsRendererProps {
  audits: AuditRecord[];
  items: AuditItemRecord[];
  metrics: AuditManagerReportMetrics | MonthlySectorCompiledAuditMetrics;
  mode: AuditReportMode;
}

export const AuditReportChartsRenderer = forwardRef<HTMLDivElement, ChartsRendererProps>(
  ({ audits, items, metrics, mode }, ref) => {
    const monthlyTrend = useMemo(() => {
      const byMonth: Record<string, { sum: number; count: number }> = {};
      audits.forEach(a => {
        const month = a.audit_date.slice(0, 7);
        if (!byMonth[month]) byMonth[month] = { sum: 0, count: 0 };
        byMonth[month].sum += a.compliance_rate ?? 0;
        byMonth[month].count++;
      });
      return Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, v]) => ({
          month: month.slice(0, 7),
          compliance: Math.round((v.sum / v.count) * 10) / 10,
        }));
    }, [audits]);

    const categoryData = useMemo(() => {
      const cat = ("complianceByCategory" in metrics ? metrics.complianceByCategory : {}) as Record<string, number>;
      return Object.entries(cat)
        .sort((a, b) => a[1] - b[1])
        .map(([name, value]) => ({ name: name.length > 20 ? name.slice(0, 18) + "…" : name, value }));
    }, [metrics]);

    const sectorData = useMemo(() => {
      const sec = ("complianceBySector" in metrics ? metrics.complianceBySector : {}) as Record<string, number>;
      return Object.entries(sec)
        .sort((a, b) => a[1] - b[1])
        .map(([name, value]) => ({ name: name.length > 18 ? name.slice(0, 16) + "…" : name, value }));
    }, [metrics]);

    const topNC = useMemo(() => {
      const ncs = (metrics.topNonCompliances ?? []) as Array<{ question: string; count: number; category?: string }>;
      return ncs.slice(0, 8).map(n => ({
        name: n.question.length > 30 ? n.question.slice(0, 28) + "…" : n.question,
        count: n.count,
      }));
    }, [metrics]);

    const notApplicable = "notApplicableItems" in metrics ? (metrics.notApplicableItems ?? 0) : 0;
    const donutData = useMemo(() => [
      { name: "Conforme", value: metrics.compliantItems, color: COLORS.compliant },
      { name: "Não Conforme", value: metrics.nonCompliantItems, color: COLORS.nonCompliant },
      { name: "N/A", value: notApplicable, color: "#94a3b8" },
    ].filter(d => d.value > 0), [metrics, notApplicable]);

    const compiledTypeData = useMemo(() => {
      if (mode !== "monthly_sector_compiled") return [];
      const byType = (metrics as MonthlySectorCompiledAuditMetrics).complianceByAuditType ?? {};
      return Object.entries(byType)
        .sort((a, b) => a[1] - b[1])
        .map(([type, value], i) => ({
          name: type.replace(/_/g, " ").slice(0, 18),
          value,
          fill: CHART_COLORS[i % CHART_COLORS.length],
        }));
    }, [metrics, mode]);

    const chartStyle = { background: "#fff", padding: "8px" };

    return (
      <div
        ref={ref}
        style={{
          position: "absolute",
          left: "-9999px",
          top: 0,
          width: "720px",
          background: "#ffffff",
          fontFamily: "Arial, sans-serif",
        }}
      >
        {/* Chart 1: Donut — Conformidade Geral */}
        <div id="chart-overall" style={{ ...chartStyle, width: 420, height: 320, margin: "0 auto" }}>
          <div style={{ textAlign: "center", fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
            Conformidade Geral
          </div>
          <PieChart width={400} height={280}>
            <Pie
              data={donutData}
              cx={200}
              cy={130}
              innerRadius={70}
              outerRadius={110}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
              labelLine
            >
              {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </div>

        {/* Chart 2: Bar — Conformidade por Categoria */}
        <div id="chart-category" style={{ ...chartStyle, width: 700, height: 360, marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
            Conformidade por Categoria (%)
          </div>
          <BarChart width={680} height={320} data={categoryData} layout="vertical" margin={{ left: 120, right: 30, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
            <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 11 }} />
            <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
            <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]}>
              {categoryData.map((d, i) => (
                <Cell key={i} fill={d.value >= 85 ? COLORS.compliant : d.value >= 70 ? COLORS.warning : COLORS.nonCompliant} />
              ))}
            </Bar>
          </BarChart>
        </div>

        {/* Chart 3: Bar — Conformidade por Setor */}
        {sectorData.length > 0 && (
          <div id="chart-sector" style={{ ...chartStyle, width: 700, height: 320, marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
              Conformidade por Setor (%)
            </div>
            <BarChart width={680} height={280} data={sectorData} margin={{ left: 20, right: 30, top: 5, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
              <Bar dataKey="value" fill={COLORS.primary} radius={[4, 4, 0, 0]}>
                {sectorData.map((d, i) => (
                  <Cell key={i} fill={d.value >= 85 ? COLORS.compliant : d.value >= 70 ? COLORS.warning : COLORS.nonCompliant} />
                ))}
              </Bar>
            </BarChart>
          </div>
        )}

        {/* Chart 4: Bar — Top Não Conformidades */}
        {topNC.length > 0 && (
          <div id="chart-noncompliance" style={{ ...chartStyle, width: 700, height: 360, marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
              Principais Não Conformidades (ocorrências)
            </div>
            <BarChart width={680} height={320} data={topNC} layout="vertical" margin={{ left: 180, right: 30, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={175} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS.nonCompliant} radius={[0, 4, 4, 0]} />
            </BarChart>
          </div>
        )}

        {/* Chart 5: Area — Evolução Mensal */}
        {monthlyTrend.length > 1 && (
          <div id="chart-trend" style={{ ...chartStyle, width: 700, height: 280, marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
              Evolução Mensal da Conformidade (%)
            </div>
            <AreaChart width={680} height={240} data={monthlyTrend} margin={{ left: 20, right: 30, top: 5, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
              <Area type="monotone" dataKey="compliance" stroke={COLORS.primary} fill={`${COLORS.primary}33`} strokeWidth={2} dot />
            </AreaChart>
          </div>
        )}

        {/* Chart 6: Por tipo de auditoria (compilado) */}
        {mode === "monthly_sector_compiled" && compiledTypeData.length > 0 && (
          <div id="chart-by-type" style={{ ...chartStyle, width: 700, height: 360, marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", marginBottom: 8, color: "#1e293b" }}>
              Conformidade por Tipo de Auditoria (%)
            </div>
            <BarChart width={680} height={320} data={compiledTypeData} margin={{ left: 20, right: 30, top: 5, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-20} textAnchor="end" />
              <YAxis domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {compiledTypeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </div>
        )}
      </div>
    );
  }
);

AuditReportChartsRenderer.displayName = "AuditReportChartsRenderer";

// ─── Visible chart preview for modal ──────────────────────────────────────────

export function AuditReportChartsPreview({ audits, items, metrics, mode }: ChartsRendererProps) {
  const monthlyTrend = useMemo(() => {
    const byMonth: Record<string, { sum: number; count: number }> = {};
    audits.forEach(a => {
      const month = a.audit_date.slice(0, 7);
      if (!byMonth[month]) byMonth[month] = { sum: 0, count: 0 };
      byMonth[month].sum += a.compliance_rate ?? 0;
      byMonth[month].count++;
    });
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, v]) => ({ month, compliance: Math.round((v.sum / v.count) * 10) / 10 }));
  }, [audits]);

  const categoryData = useMemo(() => {
    const cat = ("complianceByCategory" in metrics ? metrics.complianceByCategory : {}) as Record<string, number>;
    return Object.entries(cat).sort((a, b) => a[1] - b[1]).map(([name, value]) => ({ name, value }));
  }, [metrics]);

  const topNC = useMemo(() => {
    const ncs = (metrics.topNonCompliances ?? []) as Array<{ question: string; count: number }>;
    return ncs.slice(0, 6).map(n => ({
      name: n.question.length > 35 ? n.question.slice(0, 33) + "…" : n.question,
      count: n.count,
    }));
  }, [metrics]);

  const donutData = [
    { name: "Conforme", value: metrics.compliantItems ?? 0, color: COLORS.compliant },
    { name: "Não Conforme", value: metrics.nonCompliantItems ?? 0, color: COLORS.nonCompliant },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6 p-2">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Donut */}
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs font-semibold mb-2 text-slate-700">Conformidade Geral</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={donutData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Trend */}
        {monthlyTrend.length > 1 && (
          <div className="bg-white rounded-lg border p-3">
            <p className="text-xs font-semibold mb-2 text-slate-700">Evolução Mensal (%)</p>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyTrend} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 9 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
                <Area type="monotone" dataKey="compliance" stroke={COLORS.primary} fill={`${COLORS.primary}33`} strokeWidth={2} dot />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Category */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs font-semibold mb-2 text-slate-700">Conformidade por Categoria (%)</p>
          <ResponsiveContainer width="100%" height={Math.max(180, categoryData.length * 32)}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
              <YAxis type="category" dataKey="name" width={115} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: number) => [`${v}%`, "Conformidade"]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {categoryData.map((d, i) => (
                  <Cell key={i} fill={d.value >= 85 ? COLORS.compliant : d.value >= 70 ? COLORS.warning : COLORS.nonCompliant} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top NC */}
      {topNC.length > 0 && (
        <div className="bg-white rounded-lg border p-3">
          <p className="text-xs font-semibold mb-2 text-slate-700">Principais Não Conformidades</p>
          <ResponsiveContainer width="100%" height={Math.max(180, topNC.length * 36)}>
            <BarChart data={topNC} layout="vertical" margin={{ left: 180, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 9 }} />
              <YAxis type="category" dataKey="name" width={175} tick={{ fontSize: 9 }} />
              <Tooltip />
              <Bar dataKey="count" fill={COLORS.nonCompliant} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// ─── PDF generation with charts ───────────────────────────────────────────────

export async function generateReportPdfWithCharts(params: {
  chartsContainerRef: React.RefObject<HTMLDivElement>;
  markdownContent: string;
  hospitalName: string;
  sectorName: string;
  auditTypeName: string;
  period: string;
  hospitalLogoUrl?: string;
  scihLogoUrl?: string;
  irasLogoUrl?: string;
  metrics: AuditManagerReportMetrics | MonthlySectorCompiledAuditMetrics;
  mode: AuditReportMode;
}): Promise<void> {
  const { chartsContainerRef, markdownContent, hospitalName, sectorName, auditTypeName, period, hospitalLogoUrl, scihLogoUrl, irasLogoUrl, metrics, mode } = params;

  // Dynamic import to avoid SSR issues
  const jsPDFModule = await import("jspdf");
  const jsPDF = jsPDFModule.default;
  const html2canvas = (await import("html2canvas")).default;

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = 210;
  const pageH = 297;
  const marginL = 20;
  const marginR = 20;
  const marginT = 30;
  const marginB = 20;
  const contentW = pageW - marginL - marginR;
  let y = marginT;
  let pageNum = 1;

  const addPageNumber = () => {
    const cur = doc.getNumberOfPages();
    doc.setPage(cur);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`${cur}`, pageW - marginR, pageH - 8, { align: "right" });
    doc.setTextColor(0, 0, 0);
  };

  const checkBreak = (needed: number) => {
    if (y + needed > pageH - marginB) {
      addPageNumber();
      doc.addPage();
      pageNum++;
      y = marginT;
    }
  };

  const addText = (text: string, fontSize: number, bold = false, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(text, contentW);
    const lineH = fontSize * 0.5;
    checkBreak(lines.length * lineH + 4);
    doc.text(lines, marginL, y);
    y += lines.length * lineH + 3;
  };

  const addDivider = () => {
    checkBreak(6);
    doc.setDrawColor(200, 200, 200);
    doc.line(marginL, y, pageW - marginR, y);
    y += 5;
  };

  // Helper: fetch remote URL / imported asset URL as base64 with natural dims
  const loadImage = async (url: string): Promise<{ data: string; ext: "PNG" | "JPEG"; w: number; h: number } | null> => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const data: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
      const dims = await new Promise<{ w: number; h: number }>((res, rej) => {
        const img = new Image();
        img.onload = () => res({ w: img.naturalWidth || 200, h: img.naturalHeight || 80 });
        img.onerror = rej;
        img.src = data;
      });
      const ext: "PNG" | "JPEG" = blob.type.includes("png") ? "PNG" : "JPEG";
      return { data, ext, w: dims.w, h: dims.h };
    } catch {
      return null;
    }
  };

  const [hospLogo, scihLogo, irasLogo] = await Promise.all([
    hospitalLogoUrl ? loadImage(hospitalLogoUrl) : Promise.resolve(null),
    scihLogoUrl ? loadImage(scihLogoUrl) : Promise.resolve(null),
    irasLogoUrl ? loadImage(irasLogoUrl) : Promise.resolve(null),
  ]);

  // ── Cover header with logos (hospital left · title center · SCIH+IRAS right) ─
  const LOGO_H = 16;
  const topY = 12;

  if (hospLogo) {
    const lw = Math.min(45, (hospLogo.w / hospLogo.h) * LOGO_H);
    doc.addImage(hospLogo.data, hospLogo.ext, marginL, topY, lw, LOGO_H);
  }

  // Right-aligned stack: IRAS + optional SCIH
  let rightX = pageW - marginR;
  if (irasLogo) {
    const lw = Math.min(38, (irasLogo.w / irasLogo.h) * LOGO_H);
    rightX -= lw;
    doc.addImage(irasLogo.data, irasLogo.ext, rightX, topY, lw, LOGO_H);
    rightX -= 3;
  }
  if (scihLogo) {
    const lw = Math.min(30, (scihLogo.w / scihLogo.h) * LOGO_H);
    rightX -= lw;
    doc.addImage(scihLogo.data, scihLogo.ext, rightX, topY, lw, LOGO_H);
  }

  // Blue title bar below logos
  doc.setFillColor(37, 99, 235);
  doc.rect(0, 45, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("RELATÓRIO GERENCIAL DE AUDITORIAS DO SETOR", pageW / 2, 56, { align: "center" });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${auditTypeName} — ${sectorName}`, pageW / 2, 64, { align: "center" });
  doc.text(`${hospitalName} — Período: ${period}`, pageW / 2, 70, { align: "center" });
  doc.setTextColor(0, 0, 0);

  y = 85;
  addText("ABNT NBR 14724:2011 — Classificação: Interno", 8, false, [100, 100, 100]);
  y += 4;
  addDivider();

  // ── Key metrics ─────────────────────────────────────────────────────────────
  addText("INDICADORES PRINCIPAIS", 12, true, [37, 99, 235]);
  y += 2;
  const r = metrics.generalComplianceRate;
  const kpis = [
    [`Conformidade Geral`, `${r}%`],
    [`Total de Auditorias`, `${metrics.totalAudits}`],
    [`Itens Conformes`, `${metrics.compliantItems}`],
    [`Itens Não Conformes`, `${metrics.nonCompliantItems}`],
    ["Classificação", r >= 95 ? "Excelente" : r >= 85 ? "Bom" : r >= 70 ? "Regular" : "Crítico"],
  ];
  kpis.forEach(([label, value]) => {
    checkBreak(8);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(label + ":", marginL, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, marginL + 70, y);
    y += 7;
  });
  y += 4;
  addDivider();

  // ── Markdown text (sections) ─────────────────────────────────────────────────
  const lines = markdownContent.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === "---") { y += 2; continue; }
    if (trimmed.startsWith("[LOGO") || trimmed.startsWith("___")) continue;
    if (trimmed.startsWith("# ")) {
      addText(trimmed.slice(2), 14, true, [37, 99, 235]);
    } else if (trimmed.startsWith("## ")) {
      y += 2;
      addText(trimmed.slice(3), 12, true, [30, 64, 175]);
    } else if (trimmed.startsWith("### ")) {
      addText(trimmed.slice(4), 11, true, [55, 65, 81]);
    } else if (trimmed.startsWith("|")) {
      // Table row
      const cells = trimmed.split("|").filter(c => c.trim()).map(c => c.trim());
      if (cells.every(c => /^[-:]+$/.test(c))) continue;
      const cellW = contentW / Math.max(cells.length, 1);
      checkBreak(7);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      cells.forEach((cell, ci) => {
        const cx = marginL + ci * cellW;
        const textLines = doc.splitTextToSize(cell, cellW - 2);
        doc.text(textLines, cx + 1, y);
      });
      y += 6;
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      addText("• " + trimmed.slice(2), 10);
    } else if (/^\d+\. /.test(trimmed)) {
      addText(trimmed, 10);
    } else if (trimmed.startsWith(">")) {
      doc.setFillColor(239, 246, 255);
      checkBreak(9);
      doc.rect(marginL, y - 5, contentW, 9, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      const t = trimmed.slice(1).replace(/^\s*\*?\*?/, "").replace(/\*?\*?\s*$/, "");
      doc.text(doc.splitTextToSize(t, contentW - 4), marginL + 2, y);
      doc.setFont("helvetica", "normal");
      y += 9;
    } else {
      // Regular paragraph — strip markdown bold/italic markers for plain text
      const plain = trimmed.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\*([^*]+)\*/g, "$1");
      addText(plain, 10);
    }
  }

  // ── Charts ───────────────────────────────────────────────────────────────────
  if (chartsContainerRef.current) {
    const chartIds = mode === "monthly_sector_compiled"
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

    addPageNumber();
    doc.addPage();
    y = marginT;

    doc.setFillColor(37, 99, 235);
    doc.rect(0, y - 5, pageW, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("GRÁFICOS DO RELATÓRIO", pageW / 2, y + 3, { align: "center" });
    doc.setTextColor(0, 0, 0);
    y += 16;

    for (const chartId of chartIds) {
      const el = chartsContainerRef.current.querySelector(`#${chartId}`) as HTMLElement | null;
      if (!el) continue;
      try {
        const canvas = await html2canvas(el, { scale: 2, backgroundColor: "#ffffff", logging: false, useCORS: true });
        const imgData = canvas.toDataURL("image/png");
        const imgH = (canvas.height / canvas.width) * contentW;
        checkBreak(imgH + 20);
        // Title
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 64, 175);
        doc.text(chartTitles[chartId] || chartId, marginL, y);
        doc.setTextColor(0, 0, 0);
        y += 5;
        doc.addImage(imgData, "PNG", marginL, y, contentW, imgH);
        y += imgH + 12;
      } catch (e) {
        console.warn("Chart capture failed:", chartId, e);
      }
    }
  }

  // ── Finalize page numbers ────────────────────────────────────────────────────
  addPageNumber();
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text(`Página ${i} de ${total}`, pageW - marginR, pageH - 8, { align: "right" });
    doc.text(`IRAS Control — ${hospitalName}`, marginL, pageH - 8);
  }

  doc.save(`relatorio-auditoria-${Date.now()}.pdf`);
}
