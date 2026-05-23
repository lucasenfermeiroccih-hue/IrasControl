import React, { forwardRef } from "react";

export interface ReportSummary {
  periodo: string;
  periodStart: string;
  periodEnd: string;
  totalExames: number;
  totalTestes: number;
  taxaResistencia: number;
  taxaSensibilidade: number;
  examesComFenotipo: number;
  topOrganismos: { name: string; value: number }[];
  setores: { name: string; value: number }[];
  perfilSIR: { name: string; S: number; I: number; R: number; resistRate: number }[];
  tendenciaMensal: { month: string; exames: number; taxaResistencia: number }[];
  fenotiposDetectados: { name: string; value: number }[];
}

interface Props {
  hospitalName?: string;
  summary: ReportSummary;
  aiContent: string;
}

const TEAL = "#0f6b5c";
const TEAL_LIGHT = "#e6f4f1";
const RED = "#dc2626";
const ORANGE = "#d97706";
const GREEN = "#059669";
const GRAY = "#6b7280";
const FONT = "Arial, Helvetica, sans-serif";

// ──────────────────────────────────────────────────────────────────────────
// Parse AI markdown into named sections
// ──────────────────────────────────────────────────────────────────────────
function parseSections(md: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = md.split(/\n(?=## )/);
  for (const part of parts) {
    const idx = part.indexOf("\n");
    if (idx === -1) continue;
    const heading = part.slice(0, idx).replace(/^##\s*/, "").trim().toUpperCase();
    out[heading] = part.slice(idx + 1).trim();
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────
// Markdown table parser → HTML table rows
// ──────────────────────────────────────────────────────────────────────────
function parseMarkdownTable(block: string[]): { headers: string[]; rows: string[][] } | null {
  if (block.length < 3) return null;
  const isTableLine = (l: string) => l.trim().startsWith("|");
  const isSeparator = (l: string) => /^\|[\s|:-]+\|$/.test(l.trim());
  if (!isTableLine(block[0]) || !isSeparator(block[1])) return null;
  const split = (l: string) =>
    l.trim().replace(/^\||\|$/g, "").split("|").map(c => c.trim());
  return {
    headers: split(block[0]),
    rows: block.slice(2).filter(isTableLine).map(split),
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Render AI markdown section with proper formatting
// ──────────────────────────────────────────────────────────────────────────
function AiSection({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();

    // Empty line
    if (!t) { elements.push(<div key={i} style={{ height: "5px" }} />); i++; continue; }

    // H3 subheading
    if (t.startsWith("### ")) {
      elements.push(
        <p key={i} style={{ fontWeight: 700, color: TEAL, fontSize: "11px", margin: "8px 0 3px", fontFamily: FONT }}>
          {t.replace(/^### /, "")}
        </p>
      );
      i++; continue;
    }

    // Markdown table: collect consecutive table lines
    if (t.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const parsed = parseMarkdownTable(tableLines);
      if (parsed) {
        elements.push(
          <MdTable key={`tbl-${i}`} headers={parsed.headers} rows={parsed.rows} />
        );
      }
      continue;
    }

    // Bullet / dash list item
    if (t.startsWith("- ") || t.startsWith("* ") || t.startsWith("• ")) {
      elements.push(
        <p key={i} style={{ display: "flex", gap: "6px", margin: "2px 0", fontSize: "11px", lineHeight: "1.55", fontFamily: FONT }}>
          <span style={{ color: TEAL, fontWeight: 700, flexShrink: 0, marginTop: "1px" }}>•</span>
          <span dangerouslySetInnerHTML={{ __html: renderInline(t.replace(/^[-*•] /, "")) }} />
        </p>
      );
      i++; continue;
    }

    // Numbered list
    if (/^\d+[\.\)]\s/.test(t)) {
      const num = t.match(/^(\d+)/)?.[1];
      elements.push(
        <p key={i} style={{ display: "flex", gap: "6px", margin: "2px 0", fontSize: "11px", lineHeight: "1.55", fontFamily: FONT }}>
          <span style={{ color: TEAL, fontWeight: 700, flexShrink: 0, minWidth: "16px" }}>{num}.</span>
          <span dangerouslySetInnerHTML={{ __html: renderInline(t.replace(/^\d+[\.\)]\s/, "")) }} />
        </p>
      );
      i++; continue;
    }

    // Normal paragraph
    elements.push(
      <p key={i} style={{ margin: "3px 0", fontSize: "11px", lineHeight: "1.6", fontFamily: FONT }}
        dangerouslySetInnerHTML={{ __html: renderInline(t) }} />
    );
    i++;
  }

  return <div style={{ color: "#374151" }}>{elements}</div>;
}

function renderInline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/__(.+?)__/g, "<strong>$1</strong>")
    .replace(/_(.+?)_/g, "<em>$1</em>");
}

function MdTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const impactCol = headers.findIndex(h => /impacto/i.test(h));
  const impactColor = (v: string) => {
    if (/alto|crítico/i.test(v)) return { color: RED, fontWeight: 700 };
    if (/médio/i.test(v)) return { color: ORANGE, fontWeight: 600 };
    return { color: GREEN };
  };
  return (
    <div style={{ overflowX: "auto", margin: "8px 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px", fontFamily: FONT }}>
        <thead>
          <tr style={{ background: TEAL, color: "white" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "7px 10px", textAlign: "left", fontWeight: 600, whiteSpace: "nowrap" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 0 ? "#f9fafb" : "white", borderBottom: "1px solid #e5e7eb" }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{
                  padding: "6px 10px", verticalAlign: "top",
                  ...(ci === impactCol ? impactColor(cell) : {}),
                }}>
                  <span dangerouslySetInnerHTML={{ __html: renderInline(cell) }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Section wrapper
// ──────────────────────────────────────────────────────────────────────────
function Section({ title, accent = TEAL, children, icon }: {
  title: string; accent?: string; children: React.ReactNode; icon?: string;
}) {
  return (
    <div style={{ border: `1px solid ${accent}28`, borderRadius: "8px", overflow: "hidden", marginBottom: "18px" }}>
      <div style={{ background: accent, padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px" }}>
        {icon && <span style={{ fontSize: "13px" }}>{icon}</span>}
        <h2 style={{ color: "white", fontSize: "12px", fontWeight: 700, margin: 0, fontFamily: FONT, letterSpacing: "0.01em" }}>
          {title}
        </h2>
      </div>
      <div style={{ padding: "14px 16px" }}>{children}</div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// DataTable (structured data)
// ──────────────────────────────────────────────────────────────────────────
function DataTable({ headers, rows, colWidths }: {
  headers: string[]; rows: (string | React.ReactNode)[][]; colWidths?: string[];
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: FONT }}>
      <thead>
        <tr style={{ background: TEAL, color: "white" }}>
          {headers.map((h, i) => (
            <th key={i} style={{ textAlign: i === 0 ? "left" : "center", padding: "7px 10px", width: colWidths?.[i], fontWeight: 600 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 === 0 ? "#f9fafb" : "white", borderBottom: "1px solid #e5e7eb" }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: "6px 10px", textAlign: ci === 0 ? "left" : "center", verticalAlign: "middle" }}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={headers.length} style={{ padding: "14px", textAlign: "center", color: GRAY, fontStyle: "italic" }}>
              Sem dados disponíveis
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SVG Charts (inline, html2canvas-safe)
// ──────────────────────────────────────────────────────────────────────────

function HBarChart({ data, colors, width = 680, barH = 18, labelW = 220 }: {
  data: { name: string; value: number }[];
  colors: string[];
  width?: number;
  barH?: number;
  labelW?: number;
}) {
  const gap = 6;
  const valW = 36;
  const chartW = width - labelW - valW;
  const max = Math.max(...data.map(d => d.value), 1);
  const h = data.length * (barH + gap) + gap + 2;
  const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max - 1) + "…" : s;

  return (
    <svg width={width} height={h} style={{ display: "block", fontFamily: FONT, overflow: "visible" }}>
      {data.map((d, i) => {
        const bw = Math.max((d.value / max) * chartW, 2);
        const y = i * (barH + gap) + gap;
        return (
          <g key={i}>
            <text x={labelW - 6} y={y + barH * 0.72} textAnchor="end" fontSize="10" fill="#374151">
              {truncate(d.name, 30)}
            </text>
            <rect x={labelW} y={y} width={bw} height={barH} fill={colors[i % colors.length]} rx="3" />
            <text x={labelW + bw + 4} y={y + barH * 0.72} fontSize="10" fill="#374151" fontWeight="600">
              {d.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function SIRStackedChart({ data, width = 680, barH = 16, labelW = 210 }: {
  data: { name: string; S: number; I: number; R: number; resistRate: number }[];
  width?: number; barH?: number; labelW?: number;
}) {
  const gap = 7;
  const valW = 45;
  const chartW = width - labelW - valW;
  const legendH = 22;
  const h = legendH + data.length * (barH + gap) + gap + 4;
  const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max - 1) + "…" : s;

  return (
    <svg width={width} height={h} style={{ display: "block", fontFamily: FONT, overflow: "visible" }}>
      {/* Legend */}
      {[["S – Sensível", GREEN], ["I – Intermediário", ORANGE], ["R – Resistente", RED]].map(([label, color], li) => (
        <g key={li} transform={`translate(${labelW + li * 140}, 2)`}>
          <rect width={12} height={12} fill={color as string} rx="2" y="2" />
          <text x={16} y={12} fontSize="9" fill="#374151">{label as string}</text>
        </g>
      ))}
      {data.map((d, i) => {
        const total = d.S + d.I + d.R || 1;
        const sW = (d.S / total) * chartW;
        const iW = (d.I / total) * chartW;
        const rW = (d.R / total) * chartW;
        const y = legendH + i * (barH + gap) + gap;
        const rBg = d.resistRate >= 50 ? "#fef2f2" : d.resistRate >= 30 ? "#fffbeb" : "#f0fdf4";
        const rC = d.resistRate >= 50 ? RED : d.resistRate >= 30 ? ORANGE : GREEN;
        return (
          <g key={i}>
            <text x={labelW - 5} y={y + barH * 0.72} textAnchor="end" fontSize="10" fill="#374151">
              {truncate(d.name, 28)}
            </text>
            {sW > 0 && <rect x={labelW} y={y} width={sW} height={barH} fill={GREEN} />}
            {iW > 0 && <rect x={labelW + sW} y={y} width={iW} height={barH} fill={ORANGE} />}
            {rW > 0 && <rect x={labelW + sW + iW} y={y} width={rW} height={barH} fill={RED} />}
            <rect x={labelW + chartW + 4} y={y} width={valW - 4} height={barH} fill={rBg} rx="3" />
            <text x={labelW + chartW + valW / 2 + 2} y={y + barH * 0.72} textAnchor="middle" fontSize="10" fill={rC} fontWeight="700">
              {d.resistRate}%R
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TrendLineChart({ data, width = 680, height = 130 }: {
  data: { month: string; exames: number; taxaResistencia: number }[];
  width?: number; height?: number;
}) {
  if (data.length < 2) return null;
  const padX = 45, padTop = 16, padBottom = 28;
  const chartW = width - padX - 16;
  const chartH = height - padTop - padBottom;
  const maxR = Math.max(...data.map(d => d.taxaResistencia), 20);
  const gridVals = [0, 25, 50, 75, 100].filter(v => v <= maxR + 10);

  const pts = data.map((d, i) => ({
    x: padX + (i / (data.length - 1)) * chartW,
    y: padTop + chartH - (d.taxaResistencia / maxR) * chartH,
    r: d.taxaResistencia,
    label: d.month.slice(5),
  }));
  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const fillPath = `${pathD} L${pts[pts.length - 1].x.toFixed(1)},${(padTop + chartH).toFixed(1)} L${padX.toFixed(1)},${(padTop + chartH).toFixed(1)} Z`;

  return (
    <svg width={width} height={height} style={{ display: "block", fontFamily: FONT, overflow: "visible" }}>
      {/* Grid */}
      {gridVals.map(v => {
        const y = padTop + chartH - (v / maxR) * chartH;
        return (
          <g key={v}>
            <line x1={padX} y1={y} x2={padX + chartW} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={padX - 4} y={y + 3.5} textAnchor="end" fontSize="9" fill={GRAY}>{v}%</text>
          </g>
        );
      })}
      {/* Area fill */}
      <path d={fillPath} fill={`${RED}18`} />
      {/* Line */}
      <path d={pathD} fill="none" stroke={RED} strokeWidth="2.5" strokeLinejoin="round" />
      {/* Points + labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="4.5" fill="white" stroke={RED} strokeWidth="2" />
          <text x={p.x} y={height - padBottom + 13} textAnchor="middle" fontSize="9.5" fill={GRAY}>{p.label}</text>
          {i === 0 || i === pts.length - 1 || p.r === Math.max(...data.map(d => d.taxaResistencia)) ? (
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="9.5" fill={RED} fontWeight="700">{p.r}%</text>
          ) : null}
        </g>
      ))}
    </svg>
  );
}

function FenotipoChart({ data, width = 680, barH = 22, labelW = 80 }: {
  data: { name: string; value: number }[];
  width?: number; barH?: number; labelW?: number;
}) {
  const PHENO_COLORS: Record<string, string> = {
    MRSA: "#b91c1c", VRE: "#7c3aed", KPC: "#1d4ed8", ESBL: "#d97706", MBL: "#6b7280",
  };
  return (
    <HBarChart
      data={data}
      colors={data.map(d => PHENO_COLORS[d.name] || RED)}
      width={width}
      barH={barH}
      labelW={labelW}
    />
  );
}

// ──────────────────────────────────────────────────────────────────────────
// KPI Card
// ──────────────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ border: `1px solid #e5e7eb`, borderRadius: "8px", padding: "11px 14px", background: "#f9fafb", height: "100%" }}>
      <p style={{ fontSize: "10px", color: GRAY, margin: "0 0 4px", fontFamily: FONT }}>{label}</p>
      <p style={{ fontSize: "19px", fontWeight: 700, color: color || TEAL, margin: "0 0 2px", fontFamily: FONT }}>{value}</p>
      {sub && <p style={{ fontSize: "9.5px", color: "#9ca3af", margin: 0, fontFamily: FONT }}>{sub}</p>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Alert box
// ──────────────────────────────────────────────────────────────────────────
function AlertBox({ children, level = "warn" }: { children: React.ReactNode; level?: "warn" | "info" | "danger" }) {
  const cfg = {
    warn: { bg: "#fffbeb", border: "#fde68a", icon: "⚠️" },
    info: { bg: "#eff6ff", border: "#bfdbfe", icon: "ℹ️" },
    danger: { bg: "#fef2f2", border: "#fecaca", icon: "🚨" },
  }[level];
  return (
    <div style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: "7px", padding: "10px 14px", marginBottom: "8px" }}>
      {children}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Main Component
// ──────────────────────────────────────────────────────────────────────────
const MicrobiologicalReport = forwardRef<HTMLDivElement, Props>(
  ({ hospitalName = "Hospital", summary, aiContent }, ref) => {
    const sections = parseSections(aiContent);
    const emissionDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const riskColor = summary.taxaResistencia > 40 ? RED : summary.taxaResistencia > 25 ? ORANGE : GREEN;
    const riskLabel = summary.taxaResistencia > 40 ? "ALTO" : summary.taxaResistencia > 25 ? "MODERADO" : "BAIXO";

    const get = (...keys: string[]) => {
      for (const k of keys) {
        const val = sections[k.toUpperCase()];
        if (val) return val;
      }
      return "";
    };

    const CHART_COLORS = [
      TEAL, "#1a9177", "#2ab599", "#0891b2", "#0369a1",
      "#4f46e5", "#7c3aed", "#db2777", "#ea580c", "#65a30d",
    ];

    return (
      <div ref={ref} style={{
        background: "white", color: "#111827", fontFamily: FONT,
        width: "794px", boxSizing: "border-box",
      }}>

        {/* ── CAPA ─────────────────────────────────────────────────── */}
        <div style={{
          background: `linear-gradient(135deg, ${TEAL} 0%, #1a9177 60%, #2ab599 100%)`,
          padding: "36px 44px 28px",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "9.5px", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: "8px", fontFamily: FONT }}>
                Relatório Técnico CCIH · Vigilância Epidemiológica de IRAS
              </p>
              <h1 style={{ color: "white", fontSize: "24px", fontWeight: 700, lineHeight: "1.25", margin: "0 0 6px", fontFamily: FONT }}>
                Perfil de Sensibilidade<br />Antimicrobiana Hospitalar
              </h1>
              <p style={{ color: "rgba(255,255,255,0.88)", fontSize: "14px", margin: 0, fontFamily: FONT }}>
                {hospitalName}
              </p>
            </div>
            <div style={{ textAlign: "right", color: "rgba(255,255,255,0.82)", fontSize: "11px", lineHeight: "2", fontFamily: FONT }}>
              <p style={{ fontWeight: 700, fontSize: "13px", margin: 0 }}>{summary.periodo}</p>
              <p style={{ margin: 0 }}>{summary.periodStart} a {summary.periodEnd}</p>
              <p style={{ margin: "4px 0 0", fontSize: "10px", opacity: 0.7 }}>Emissão: {emissionDate}</p>
              <p style={{ margin: 0, fontSize: "10px", opacity: 0.6 }}>IRASControl · Gerado por IA</p>
            </div>
          </div>

          {/* Risk badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(255,255,255,0.18)", borderRadius: "20px", padding: "4px 12px", marginBottom: "18px" }}>
            <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: riskColor, display: "inline-block" }} />
            <span style={{ color: "white", fontSize: "11px", fontWeight: 700, fontFamily: FONT }}>
              Nível de Risco: {riskLabel}
            </span>
          </div>

          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
            {[
              { label: "Total Exames", value: String(summary.totalExames), icon: "🔬" },
              { label: "Testes SIR", value: String(summary.totalTestes), icon: "📊" },
              { label: "Taxa Resistência", value: `${summary.taxaResistencia}%`, bg: "rgba(220,38,38,0.3)", icon: "⚠️" },
              { label: "Taxa Sensibilidade", value: `${summary.taxaSensibilidade}%`, bg: "rgba(5,150,105,0.3)", icon: "✅" },
              { label: "Fenótipos MDR", value: String(summary.examesComFenotipo), bg: "rgba(217,119,6,0.3)", icon: "🧬" },
            ].map(k => (
              <div key={k.label} style={{ background: k.bg || "rgba(255,255,255,0.15)", borderRadius: "8px", padding: "10px 12px" }}>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "9.5px", margin: "0 0 3px", fontFamily: FONT }}>{k.icon} {k.label}</p>
                <p style={{ color: "white", fontWeight: 700, fontSize: "18px", margin: 0, fontFamily: FONT, lineHeight: 1 }}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── BODY ─────────────────────────────────────────────────── */}
        <div style={{ padding: "26px 44px 36px" }}>

          {/* ── 1. SUMÁRIO EXECUTIVO ── */}
          <Section title="1. Sumário Executivo" icon="📋">
            {get("RESUMO EXECUTIVO", "SUMÁRIO EXECUTIVO") ? (
              <AiSection content={get("RESUMO EXECUTIVO", "SUMÁRIO EXECUTIVO")} />
            ) : (
              <p style={{ fontSize: "11px", color: "#374151", lineHeight: "1.65", fontFamily: FONT }}>
                No período de <strong>{summary.periodStart}</strong> a <strong>{summary.periodEnd}</strong> ({summary.periodo}),
                foram processados <strong>{summary.totalExames} exames</strong> com isolado positivo,
                gerando <strong>{summary.totalTestes} testes</strong> de sensibilidade antimicrobiana.
                Taxa global de resistência: <strong style={{ color: riskColor }}>{summary.taxaResistencia}%</strong>.
                Fenótipos MDR detectados em <strong>{summary.examesComFenotipo}</strong> exames.
              </p>
            )}
          </Section>

          {/* ── 2. METODOLOGIA ── */}
          <Section title="2. Metodologia e Critérios de Interpretação" icon="🔬">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", fontSize: "11px", color: "#374151", fontFamily: FONT }}>
              {[
                ["Critérios", "CLSI / EUCAST"],
                ["Identificação", "MALDI-TOF, VITEK 2, Phoenix"],
                ["Duplicatas", "1ª amostra por paciente/período"],
                ["MDR", "Resistência em ≥ 3 classes de antibióticos"],
                ["Materiais", "Hemocultura, Urina, Aspirado traqueal, Swab"],
                ["Fenótipos", "MRSA, VRE, KPC, ESBL (critérios padronizados)"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", gap: "8px" }}>
                  <span style={{ fontWeight: 700, color: TEAL, whiteSpace: "nowrap" }}>• {k}:</span>
                  <span>{v}</span>
                </div>
              ))}
            </div>
          </Section>

          {/* ── 3. INDICADORES GLOBAIS ── */}
          <Section title="3. Indicadores Globais do Período" icon="📊">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "2px" }}>
              <KpiCard label="Total de Culturas Processadas" value={String(summary.totalExames)} sub="exames com isolado positivo" />
              <KpiCard label="Total de Testes SIR" value={String(summary.totalTestes)} sub="sensibilidade / resistência" />
              <KpiCard label="Taxa Global de Resistência" value={`${summary.taxaResistencia}%`} sub="resultado R" color={riskColor} />
              <KpiCard label="Taxa Global de Sensibilidade" value={`${summary.taxaSensibilidade}%`} sub="resultado S" color={GREEN} />
              <KpiCard
                label="Exames com Fenótipo MDR"
                value={String(summary.examesComFenotipo)}
                sub={`${summary.totalExames > 0 ? ((summary.examesComFenotipo / summary.totalExames) * 100).toFixed(1) : 0}% dos exames`}
                color={ORANGE}
              />
              <KpiCard
                label="Microrganismo Predominante"
                value={summary.topOrganismos[0]?.name?.split(" ").slice(0, 2).join(" ") || "—"}
                sub={`${summary.topOrganismos[0]?.value || 0} isolados`}
              />
            </div>
          </Section>

          {/* ── 4. DISTRIBUIÇÃO POR SETOR ── */}
          <Section title="4. Distribuição por Setor" icon="🏥">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
              <div>
                <DataTable
                  headers={["Setor", "Exames", "% Total", "Prioridade"]}
                  rows={summary.setores.map((s, i) => [
                    s.name,
                    String(s.value),
                    `${summary.totalExames > 0 ? ((s.value / summary.totalExames) * 100).toFixed(1) : 0}%`,
                    <span key={i} style={{ color: i === 0 ? RED : i < 3 ? ORANGE : GREEN, fontWeight: 600 }}>
                      {i === 0 ? "🔴 Alta" : i < 3 ? "🟡 Moderada" : "🟢 Normal"}
                    </span>,
                  ])}
                  colWidths={["42%", "14%", "14%", "30%"]}
                />
              </div>
              <div>
                <p style={{ fontSize: "10px", color: GRAY, marginBottom: "6px", fontWeight: 600, fontFamily: FONT }}>Volume por Setor</p>
                <HBarChart data={summary.setores.slice(0, 8)} colors={CHART_COLORS} width={310} labelW={130} barH={16} />
              </div>
            </div>
            {get("ANÁLISE POR SETOR", "ANALISE POR SETOR") && (
              <div style={{ marginTop: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "10px" }}>
                <AiSection content={get("ANÁLISE POR SETOR", "ANALISE POR SETOR")} />
              </div>
            )}
          </Section>

          {/* ── 5. PERFIL MICROBIOLÓGICO ── */}
          <Section title="5. Perfil Microbiológico — Microrganismos Predominantes" icon="🧫">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
              <div>
                <DataTable
                  headers={["Microrganismo", "Isolados", "% Total"]}
                  rows={summary.topOrganismos.map(o => [
                    o.name,
                    String(o.value),
                    `${summary.totalExames > 0 ? ((o.value / summary.totalExames) * 100).toFixed(1) : 0}%`,
                  ])}
                  colWidths={["55%", "20%", "25%"]}
                />
              </div>
              <div>
                <p style={{ fontSize: "10px", color: GRAY, marginBottom: "6px", fontWeight: 600, fontFamily: FONT }}>Frequência de Isolamento</p>
                <HBarChart data={summary.topOrganismos} colors={CHART_COLORS} width={310} labelW={120} barH={16} />
              </div>
            </div>
            {get("ANÁLISE MICROBIOLÓGICA", "ANALISE MICROBIOLOGICA") && (
              <div style={{ marginTop: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "10px" }}>
                <AiSection content={get("ANÁLISE MICROBIOLÓGICA", "ANALISE MICROBIOLOGICA")} />
              </div>
            )}
          </Section>

          {/* ── 6. FENÓTIPOS MDR ── */}
          <Section title="6. Fenótipos de Multirresistência (MDR)" accent="#b91c1c" icon="⚠️">
            {summary.fenotiposDetectados.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0" }}>
                <span style={{ fontSize: "18px" }}>✅</span>
                <p style={{ fontSize: "11px", color: GRAY, fontStyle: "italic", margin: 0, fontFamily: FONT }}>
                  Nenhum fenótipo MDR detectado no período analisado.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
                  <div>
                    <DataTable
                      headers={["Fenótipo", "Casos", "% Exames", "Risco"]}
                      rows={summary.fenotiposDetectados.map(f => {
                        const pct = summary.totalExames > 0 ? (f.value / summary.totalExames) * 100 : 0;
                        return [
                          <strong key={f.name}>{f.name}</strong>,
                          String(f.value),
                          `${pct.toFixed(1)}%`,
                          <span key="r" style={{ color: pct > 10 ? RED : pct > 5 ? ORANGE : GRAY, fontWeight: 600 }}>
                            {pct > 10 ? "⚠️ Crítico" : pct > 5 ? "⚡ Alto" : "🟡 Moderado"}
                          </span>,
                        ];
                      })}
                      colWidths={["28%", "15%", "22%", "35%"]}
                    />
                  </div>
                  <div>
                    <p style={{ fontSize: "10px", color: GRAY, marginBottom: "6px", fontWeight: 600, fontFamily: FONT }}>Distribuição MDR</p>
                    <FenotipoChart data={summary.fenotiposDetectados} width={300} barH={22} labelW={70} />
                  </div>
                </div>
                <AlertBox level="danger">
                  <p style={{ fontSize: "11px", color: "#991b1b", margin: 0, fontFamily: FONT }}>
                    <strong>⚠️ Ação Imediata:</strong> Presença de fenótipos MDR requer isolamento de contato e revisão do protocolo antimicrobiano.
                  </p>
                </AlertBox>
              </>
            )}
          </Section>

          {/* ── 7. ANTIBIOGRAMA CONSOLIDADO ── */}
          <Section title="7. Antibiograma Consolidado — Perfil SIR por Antimicrobiano" icon="💊">
            <p style={{ fontSize: "10px", color: GRAY, marginBottom: "8px", fontFamily: FONT }}>
              Barras: <span style={{ color: GREEN, fontWeight: 700 }}>■ S</span>{" "}
              <span style={{ color: ORANGE, fontWeight: 700 }}>■ I</span>{" "}
              <span style={{ color: RED, fontWeight: 700 }}>■ R</span>
              {" "}— Proporção em relação ao total testado
            </p>
            <SIRStackedChart data={summary.perfilSIR} width={706} />
            <div style={{ marginTop: "12px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px", fontFamily: FONT }}>
                <thead>
                  <tr style={{ background: TEAL, color: "white" }}>
                    {["Antimicrobiano", "S (n)", "I (n)", "R (n)", "% R", "Risco Clínico"].map((h, i) => (
                      <th key={i} style={{ textAlign: i === 0 ? "left" : "center", padding: "6px 10px", fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {summary.perfilSIR.map((row, i) => {
                    const rC = row.resistRate >= 50 ? RED : row.resistRate >= 30 ? ORANGE : GREEN;
                    const rBg = row.resistRate >= 50 ? "#fef2f2" : row.resistRate >= 30 ? "#fffbeb" : "#f0fdf4";
                    return (
                      <tr key={row.name} style={{ background: i % 2 === 0 ? "#f9fafb" : "white", borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "5px 10px", fontWeight: 600 }}>{row.name}</td>
                        <td style={{ textAlign: "center", padding: "5px 10px", color: GREEN, fontWeight: 600 }}>{row.S}</td>
                        <td style={{ textAlign: "center", padding: "5px 10px", color: ORANGE, fontWeight: 600 }}>{row.I}</td>
                        <td style={{ textAlign: "center", padding: "5px 10px", color: RED, fontWeight: 700 }}>{row.R}</td>
                        <td style={{ textAlign: "center", padding: "5px 10px", fontWeight: 700, color: rC, fontSize: "12px" }}>{row.resistRate}%</td>
                        <td style={{ textAlign: "center", padding: "5px 10px", background: rBg, color: rC, fontWeight: 600 }}>
                          {row.resistRate >= 50 ? "⚠️ Alto" : row.resistRate >= 30 ? "⚡ Moderado" : "✅ Baixo"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {get("PERFIL DE RESISTÊNCIA", "ANALISE DE RESISTENCIA") && (
              <div style={{ marginTop: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "10px" }}>
                <AiSection content={get("PERFIL DE RESISTÊNCIA", "ANALISE DE RESISTENCIA")} />
              </div>
            )}
          </Section>

          {/* ── 4b. ANÁLISE SETORIAL DETALHADA (IA) ── */}
          {get("ANÁLISE SETORIAL DETALHADA", "ANALISE SETORIAL DETALHADA", "ANÁLISE POR SETOR DETALHADA") && (
            <Section title="4b. Análise Setorial Detalhada" icon="🏢">
              <AiSection content={get("ANÁLISE SETORIAL DETALHADA", "ANALISE SETORIAL DETALHADA", "ANÁLISE POR SETOR DETALHADA")} />
            </Section>
          )}

          {/* ── 8. TENDÊNCIAS TEMPORAIS ── */}
          <Section title="8. Tendências Temporais de Resistência" icon="📈">
            {summary.tendenciaMensal.length < 2 ? (
              <p style={{ fontSize: "11px", color: GRAY, fontStyle: "italic", fontFamily: FONT }}>
                Dados temporais insuficientes para o período (mínimo 2 meses).
              </p>
            ) : (
              <>
                <div style={{ marginBottom: "12px" }}>
                  <p style={{ fontSize: "10px", color: GRAY, marginBottom: "6px", fontWeight: 600, fontFamily: FONT }}>Taxa de Resistência Mensal (%)</p>
                  <TrendLineChart data={summary.tendenciaMensal} width={706} height={140} />
                </div>
                <DataTable
                  headers={["Mês/Ano", "Exames Realizados", "Taxa de Resistência", "Tendência"]}
                  rows={summary.tendenciaMensal.map((t, i, arr) => {
                    const prev = i > 0 ? arr[i - 1].taxaResistencia : t.taxaResistencia;
                    const delta = t.taxaResistencia - prev;
                    const trend = delta > 0 ? (
                      <span key="t" style={{ color: RED, fontWeight: 600 }}>↑ +{delta.toFixed(0)}% Subindo</span>
                    ) : delta < 0 ? (
                      <span key="t" style={{ color: GREEN, fontWeight: 600 }}>↓ {delta.toFixed(0)}% Caindo</span>
                    ) : (
                      <span key="t" style={{ color: GRAY }}>→ Estável</span>
                    );
                    return [t.month, String(t.exames), `${t.taxaResistencia}%`, trend];
                  })}
                  colWidths={["22%", "24%", "24%", "30%"]}
                />
              </>
            )}
            {get("TENDÊNCIAS TEMPORAIS", "TENDENCIAS TEMPORAIS") && (
              <div style={{ marginTop: "12px", borderTop: "1px solid #e5e7eb", paddingTop: "10px" }}>
                <AiSection content={get("TENDÊNCIAS TEMPORAIS", "TENDENCIAS TEMPORAIS")} />
              </div>
            )}
          </Section>

          {/* ── 9. ALERTAS EPIDEMIOLÓGICOS ── */}
          {get("ALERTAS EPIDEMIOLÓGICOS", "ALERTAS EPIDEMIOLOGICOS") && (
            <Section title="9. Alertas Epidemiológicos" accent="#991b1b" icon="🚨">
              <AlertBox level="danger">
                <AiSection content={get("ALERTAS EPIDEMIOLÓGICOS", "ALERTAS EPIDEMIOLOGICOS")} />
              </AlertBox>
            </Section>
          )}

          {/* ── 10. RECOMENDAÇÕES CLÍNICAS ── */}
          <Section title="10. Recomendações Clínicas e Stewardship Antimicrobiano" icon="💡">
            {get("RECOMENDAÇÕES CLÍNICAS", "RECOMENDACOES CLINICAS", "RECOMENDAÇÕES", "RECOMENDACOES") ? (
              <AiSection content={get("RECOMENDAÇÕES CLÍNICAS", "RECOMENDACOES CLINICAS", "RECOMENDAÇÕES", "RECOMENDACOES")} />
            ) : (
              <div style={{ fontSize: "11px", color: "#374151", lineHeight: "1.75", fontFamily: FONT }}>
                {[
                  ["Stewardship", "Revisar prescrições de carbapenêmicos e cefalosporinas de 3ª/4ª geração."],
                  ["Isolamento", "Reforçar precauções de contato para portadores MDR (MRSA, VRE, KPC)."],
                  ["Vigilância Ativa", "Swabs de vigilância em pacientes de alto risco (UTI, tempo ≥14 dias)."],
                  ["Laboratório", "Ampliar painel para polimixina e tigeciclina."],
                  ["Educação", "Reforçar higiene das mãos e os 5 momentos da OMS em todos os setores."],
                ].map(([k, v], i) => (
                  <p key={i} style={{ display: "flex", gap: "6px", margin: "3px 0" }}>
                    <span style={{ color: TEAL, fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
                    <span><strong>{k}:</strong> {v}</span>
                  </p>
                ))}
              </div>
            )}
          </Section>

          {/* ── 11. PLANO DE AÇÃO CCIH ── */}
          <Section title="11. Plano de Ação CCIH" icon="📅">
            {get("PLANO DE AÇÃO CCIH", "PLANO DE ACAO CCIH", "PLANO DE AÇÃO") ? (
              <AiSection content={get("PLANO DE AÇÃO CCIH", "PLANO DE ACAO CCIH", "PLANO DE AÇÃO")} />
            ) : (
              <DataTable
                headers={["Problema Identificado", "Impacto", "Ação Proposta", "Responsável", "Prazo"]}
                rows={[
                  ["Alta resistência antimicrobiana", <span key="a" style={{ color: RED, fontWeight: 700 }}>Alto</span>, "Revisar protocolo ATM", "CCIH/Infectologia", "30 dias"],
                  ["Fenótipos MDR detectados", <span key="b" style={{ color: RED, fontWeight: 700 }}>Crítico</span>, "Reforçar isolamento contato", "Enfermagem/CCIH", "Imediato"],
                  ["Pressão seletiva antibiótica", <span key="c" style={{ color: ORANGE, fontWeight: 600 }}>Médio</span>, "Implementar stewardship", "Farmácia Clínica", "60 dias"],
                  ["Monitoramento tendências", <span key="d" style={{ color: GREEN }}>Preventivo</span>, "Relatório mensal CCIH", "CCIH", "Mensal"],
                ]}
                colWidths={["28%", "12%", "28%", "18%", "14%"]}
              />
            )}
          </Section>

          {/* ── 12. CONCLUSÃO ── */}
          {get("CONCLUSÃO", "CONCLUSAO") && (
            <Section title="12. Conclusão" icon="📌">
              <AiSection content={get("CONCLUSÃO", "CONCLUSAO")} />
            </Section>
          )}

          {/* ── 13. REFERÊNCIAS TÉCNICAS ── */}
          {get("REFERÊNCIAS TÉCNICAS", "REFERENCIAS TECNICAS", "REFERÊNCIAS") && (
            <Section title="13. Referências Técnicas e Normativas" accent="#4b5563" icon="📚">
              <AiSection content={get("REFERÊNCIAS TÉCNICAS", "REFERENCIAS TECNICAS", "REFERÊNCIAS")} />
            </Section>
          )}

          {/* Footer */}
          <div style={{ borderTop: `2px solid ${TEAL_LIGHT}`, paddingTop: "14px", marginTop: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: "9.5px", color: GRAY, margin: 0, fontFamily: FONT, fontWeight: 700 }}>
                  IRASControl — Vigilância Epidemiológica de IRAS
                </p>
                <p style={{ fontSize: "9px", color: "#9ca3af", margin: "2px 0 0", fontFamily: FONT }}>
                  {hospitalName} · {emissionDate} · Critérios CLSI/EUCAST
                </p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "9px", color: "#9ca3af", margin: 0, fontFamily: FONT }}>
                  Recomenda-se validação clínica antes de decisões terapêuticas.
                </p>
                <p style={{ fontSize: "9px", color: "#9ca3af", margin: "2px 0 0", fontFamily: FONT }}>
                  Relatório gerado automaticamente com suporte de IA.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    );
  }
);

MicrobiologicalReport.displayName = "MicrobiologicalReport";
export default MicrobiologicalReport;
