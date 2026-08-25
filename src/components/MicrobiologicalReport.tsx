import React, { forwardRef } from "react";

export interface BacteriaSensitivity {
  bacteria: string;
  short: string;
  isolados: number;
  perfil: { antibiotic: string; S: number; I: number; R: number; total: number; resistRate: number }[];
}

export interface SectorProfile {
  setor: string;
  totalCulturas: number;
  culturasPorMaterial: { name: string; value: number }[];
  prevalenciaOrganismos: { name: string; value: number }[];
  prevalenciaPorMaterial: { material: string; organismo: string; count: number }[];
  sensibilidadePorBacteria: BacteriaSensitivity[];
  mrsa: number;
  vre: number;
  kpc: number;
  esbl: number;
}

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
  culturasPorMaterial?: { name: string; value: number }[];
  bacteriasAlvo?: {
    label: string;
    short: string;
    isolados: number;
    setores: { setor: string; count: number }[];
    perfil: { antibiotic: string; S: number; I: number; R: number; total: number; resistRate: number }[];
  }[];
  setoresPerfil?: SectorProfile[];
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

function SIRStackedChart({ data, width = 680, barH = 18, labelW = 210 }: {
  data: { name: string; S: number; I: number; R: number; resistRate: number }[];
  width?: number; barH?: number; labelW?: number;
}) {
  const gap = 8;
  const valW = 52;
  const chartW = width - labelW - valW;
  const legendH = 24;
  const h = legendH + data.length * (barH + gap) + gap + 6;
  const truncate = (s: string, max: number) => s.length > max ? s.slice(0, max - 1) + "…" : s;

  return (
    <svg width={width} height={h} style={{ display: "block", fontFamily: FONT, overflow: "visible" }}>
      {/* Legend */}
      {[["S – Sensível", GREEN], ["I – Intermediário", ORANGE], ["R – Resistente", RED]].map(([label, color], li) => (
        <g key={li} transform={`translate(${labelW + li * 148}, 2)`}>
          <rect width={12} height={12} fill={color as string} rx="2" y="3" />
          <text x={17} y={13} fontSize="9.5" fill="#374151">{label as string}</text>
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
            <rect x={labelW} y={y} width={chartW} height={barH} fill="#f3f4f6" rx="2" />
            {sW > 0 && <rect x={labelW} y={y} width={sW} height={barH} fill={GREEN} rx="2" />}
            {iW > 0 && <rect x={labelW + sW} y={y} width={iW} height={barH} fill={ORANGE} />}
            {rW > 0 && <rect x={labelW + sW + iW} y={y} width={rW} height={barH} fill={RED} />}
            {/* S label */}
            {sW > 22 && (
              <text x={labelW + sW / 2} y={y + barH * 0.72} textAnchor="middle" fontSize="8.5" fill="white" fontWeight="700">{d.S}</text>
            )}
            {/* R label */}
            {rW > 22 && (
              <text x={labelW + sW + iW + rW / 2} y={y + barH * 0.72} textAnchor="middle" fontSize="8.5" fill="white" fontWeight="700">{d.R}</text>
            )}
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

function BacteriaAntibiogramChart({ data, width = 680, barH = 16, labelW = 160 }: {
  data: { antibiotic: string; S: number; I: number; R: number; total: number; resistRate: number }[];
  width?: number; barH?: number; labelW?: number;
}) {
  return (
    <SIRStackedChart
      data={data.map(d => ({ name: d.antibiotic, S: d.S, I: d.I, R: d.R, resistRate: d.resistRate }))}
      width={width}
      barH={barH}
      labelW={labelW}
    />
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
// Pie Chart (SVG inline — html2canvas-safe)
// ──────────────────────────────────────────────────────────────────────────
const PIE_COLORS_DEFAULT = [
  "#0f6b5c","#1a9177","#2ab599","#0891b2","#0369a1",
  "#4f46e5","#7c3aed","#db2777","#ea580c","#65a30d","#d97706","#9ca3af",
];

function PieChartSVG({ data, colors = PIE_COLORS_DEFAULT, width = 340, size = 160 }: {
  data: { name: string; value: number }[];
  colors?: string[];
  width?: number;
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0 || data.length === 0) {
    return <p style={{ fontSize: "10px", color: GRAY, fontStyle: "italic", fontFamily: FONT, margin: 0 }}>Sem dados disponíveis</p>;
  }
  const cx = size / 2, cy = size / 2, r = size / 2 - 6;
  let currentAngle = -Math.PI / 2;
  const slices = data.map((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = startAngle + sliceAngle;
    const midAngle = startAngle + sliceAngle / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const path = `M ${cx.toFixed(1)} ${cy.toFixed(1)} L ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${largeArc} 1 ${x2.toFixed(1)} ${y2.toFixed(1)} Z`;
    const pct = Math.round((d.value / total) * 100);
    const lx = cx + r * 0.6 * Math.cos(midAngle);
    const ly = cy + r * 0.6 * Math.sin(midAngle);
    currentAngle = endAngle;
    return { path, color: colors[i % colors.length], pct, lx, ly, name: d.name, value: d.value };
  });
  const cols = 2;
  const itemH = 15;
  const rows = Math.ceil(data.length / cols);
  const legendH = rows * itemH + 10;
  const colW = width / cols;
  return (
    <svg width={width} height={size + legendH} style={{ display: "block", fontFamily: FONT, overflow: "visible" }}>
      <g transform={`translate(${((width - size) / 2).toFixed(1)}, 0)`}>
        {slices.map((s, i) => (
          <g key={i}>
            <path d={s.path} fill={s.color} stroke="white" strokeWidth="1.5" />
            {s.pct >= 6 && (
              <text x={s.lx.toFixed(1)} y={(s.ly + 3.5).toFixed(1)} textAnchor="middle" fontSize="9" fill="white" fontWeight="700">{s.pct}%</text>
            )}
          </g>
        ))}
      </g>
      {data.map((d, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const label = d.name.length > 22 ? d.name.slice(0, 21) + "…" : d.name;
        return (
          <g key={i} transform={`translate(${col * colW + 4}, ${size + 8 + row * itemH})`}>
            <rect width={9} height={9} fill={colors[i % colors.length]} rx="2" y="2" />
            <text x={13} y={11} fontSize="9" fill="#374151">{label} ({d.value})</text>
          </g>
        );
      })}
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Per-sector section helpers
// ──────────────────────────────────────────────────────────────────────────
const ROMAN_NUMERALS = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV"];

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "14px", border: "1px solid #e2e8f0", borderRadius: "6px", overflow: "hidden" }}>
      <div style={{ background: "#f1f5f9", padding: "5px 12px", borderBottom: "1px solid #e2e8f0" }}>
        <p style={{ margin: 0, fontSize: "10px", fontWeight: 700, color: "#475569", fontFamily: FONT }}>{title}</p>
      </div>
      <div style={{ padding: "10px 12px" }}>{children}</div>
    </div>
  );
}

function DiscussionBlock({ content }: { content?: string }) {
  if (!content) return null;
  return (
    <div style={{ marginTop: "8px", padding: "8px 12px", background: TEAL_LIGHT, borderRadius: "5px", borderLeft: `3px solid ${TEAL}` }}>
      <p style={{ fontWeight: 700, fontSize: "10px", color: TEAL, margin: "0 0 3px", fontFamily: FONT }}>Discussão:</p>
      <AiSection content={content} />
    </div>
  );
}

function SectorSection({ sp, idx, discussions, chartColors }: {
  sp: SectorProfile;
  idx: number;
  discussions?: { culturas?: string; organismos?: string; material?: string; sensibilidade?: string; geral?: string };
  chartColors: string[];
}) {
  const roman = ROMAN_NUMERALS[idx] || String(idx + 1);
  const materialGroups: Record<string, { organismo: string; count: number }[]> = {};
  for (const item of sp.prevalenciaPorMaterial) {
    if (!materialGroups[item.material]) materialGroups[item.material] = [];
    materialGroups[item.material].push({ organismo: item.organismo, count: item.count });
  }
  const bacteriasComDados = sp.sensibilidadePorBacteria.filter(b => b.isolados > 0);

  return (
    <div style={{ marginBottom: "20px" }}>
      {/* Sector header */}
      <div style={{ background: TEAL, color: "white", padding: "9px 18px", borderRadius: "7px", marginBottom: "12px" }}>
        <h2 style={{ margin: 0, fontSize: "12px", fontWeight: 700, fontFamily: FONT, textTransform: "uppercase", letterSpacing: "0.01em" }}>
          {roman}. Perfil Microbiológico e de Sensibilidade Antimicrobiana: {sp.setor}
        </h2>
        <p style={{ margin: "2px 0 0", fontSize: "9.5px", opacity: 0.85, fontFamily: FONT }}>
          N = {sp.totalCulturas} culturas positivas
          {" · "}MRSA: {sp.mrsa > 0 ? `${sp.mrsa} caso${sp.mrsa > 1 ? "s" : ""}` : "Ausente"}
          {" · "}VRE: {sp.vre > 0 ? `${sp.vre} caso${sp.vre > 1 ? "s" : ""}` : "Ausente"}
          {" · "}KPC: {sp.kpc > 0 ? `${sp.kpc} caso${sp.kpc > 1 ? "s" : ""}` : "Ausente"}
          {" · "}ESBL: {sp.esbl > 0 ? `${sp.esbl} caso${sp.esbl > 1 ? "s" : ""}` : "Ausente"}
        </p>
      </div>

      {discussions?.geral && (
        <div style={{ marginBottom: "10px", padding: "8px 12px", background: "#f8fafc", borderRadius: "5px", border: "1px solid #e2e8f0" }}>
          <AiSection content={discussions.geral} />
        </div>
      )}

      {/* Block 1 – Culturas por material (pizza) */}
      <SubSection title={`Gráfico ${roman}.1 – Distribuição de Culturas Positivas por Tipo de Material`}>
        {sp.culturasPorMaterial.length === 0 ? (
          <p style={{ fontSize: "10px", color: GRAY, fontStyle: "italic", fontFamily: FONT, margin: 0 }}>Sem dados de material para este setor.</p>
        ) : (
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start" }}>
            <PieChartSVG data={sp.culturasPorMaterial} colors={PIE_COLORS_DEFAULT} width={310} size={150} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <DataTable
                headers={["Material Biológico", "N", "% Setor"]}
                rows={sp.culturasPorMaterial.map(m => [
                  m.name, String(m.value),
                  sp.totalCulturas > 0 ? `${((m.value / sp.totalCulturas) * 100).toFixed(1)}%` : "—",
                ])}
                colWidths={["55%", "20%", "25%"]}
              />
            </div>
          </div>
        )}
        <DiscussionBlock content={discussions?.culturas} />
      </SubSection>

      {/* Block 2 – Prevalência de microrganismos (barras horizontais) */}
      <SubSection title={`Gráfico ${roman}.2 – Prevalência de Microrganismos Identificados`}>
        {sp.prevalenciaOrganismos.length === 0 ? (
          <p style={{ fontSize: "10px", color: GRAY, fontStyle: "italic", fontFamily: FONT, margin: 0 }}>Sem dados de organismos para este setor.</p>
        ) : (
          <>
            <HBarChart data={sp.prevalenciaOrganismos} colors={chartColors} width={680} labelW={210} barH={17} />
            <div style={{ marginTop: "8px" }}>
              <DataTable
                headers={["Microrganismo", "Isolados", "% Setor"]}
                rows={sp.prevalenciaOrganismos.map(o => [
                  o.name, String(o.value),
                  sp.totalCulturas > 0 ? `${((o.value / sp.totalCulturas) * 100).toFixed(1)}%` : "—",
                ])}
                colWidths={["55%", "20%", "25%"]}
              />
            </div>
          </>
        )}
        <DiscussionBlock content={discussions?.organismos} />
      </SubSection>

      {/* Block 3 – Prevalência por material/espécime (grid de cards) */}
      <SubSection title={`Gráfico ${roman}.3 – Prevalência de Microrganismos por Espécime`}>
        {Object.keys(materialGroups).length === 0 ? (
          <p style={{ fontSize: "10px", color: GRAY, fontStyle: "italic", fontFamily: FONT, margin: 0 }}>Sem dados de espécime para este setor.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: "8px" }}>
            {Object.entries(materialGroups).sort((a, b) =>
              b[1].reduce((s, x) => s + x.count, 0) - a[1].reduce((s, x) => s + x.count, 0)
            ).map(([material, orgs]) => {
              const subtotal = orgs.reduce((s, x) => s + x.count, 0);
              return (
                <div key={material} style={{ border: "1px solid #e2e8f0", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{ background: "#f8fafc", padding: "4px 8px", borderBottom: "1px solid #e2e8f0" }}>
                    <p style={{ margin: 0, fontSize: "9px", fontWeight: 700, color: "#475569", fontFamily: FONT }}>
                      {material} <span style={{ fontWeight: 400, color: GRAY }}>(n={subtotal})</span>
                    </p>
                  </div>
                  <div style={{ padding: "5px 8px" }}>
                    {orgs.sort((a, b) => b.count - a.count).map((o, oi) => {
                      const barW = Math.round((o.count / subtotal) * 100);
                      return (
                        <div key={oi} style={{ marginBottom: "3px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "8.5px", color: "#374151", fontFamily: FONT, marginBottom: "1px" }}>
                            <span style={{ fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "78%" }}>{o.organismo}</span>
                            <span style={{ fontWeight: 700 }}>{o.count}</span>
                          </div>
                          <div style={{ height: "4px", background: "#e5e7eb", borderRadius: "2px" }}>
                            <div style={{ height: "4px", width: `${barW}%`, background: TEAL, borderRadius: "2px" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <DiscussionBlock content={discussions?.material} />
      </SubSection>

      {/* Block 4 – Sensibilidade antimicrobiana (SIR empilhado por bactéria) */}
      <SubSection title={`Gráfico ${roman}.4 – Perfil de Sensibilidade Antimicrobiana dos Principais Agentes`}>
        {bacteriasComDados.length === 0 ? (
          <p style={{ fontSize: "10px", color: GRAY, fontStyle: "italic", fontFamily: FONT, margin: 0 }}>Sem dados de antibiograma para este setor.</p>
        ) : (
          <>
            {/* MDR phenotype strip */}
            <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
              {[
                { label: "MRSA", val: sp.mrsa },
                { label: "VRE", val: sp.vre },
                { label: "KPC", val: sp.kpc },
                { label: "ESBL", val: sp.esbl },
              ].map(({ label, val }) => (
                <span key={label} style={{
                  background: val > 0 ? "#fef2f2" : "#f0fdf4",
                  color: val > 0 ? RED : GREEN,
                  border: `1px solid ${val > 0 ? "#fecaca" : "#bbf7d0"}`,
                  borderRadius: "20px", padding: "2px 9px", fontSize: "9px", fontWeight: 700, fontFamily: FONT,
                }}>
                  {label}: {val > 0 ? `${val} caso${val > 1 ? "s" : ""}` : "Ausente"}
                </span>
              ))}
            </div>
            {bacteriasComDados.map((bact, bi) => (
              <div key={bi} style={{ marginBottom: "12px" }}>
                <p style={{ fontWeight: 700, fontSize: "10px", color: "#374151", margin: "0 0 4px", fontFamily: FONT }}>
                  <em>{bact.bacteria}</em> — n={bact.isolados}
                </p>
                {bact.perfil.length === 0 ? (
                  <p style={{ fontSize: "9.5px", color: GRAY, fontStyle: "italic", fontFamily: FONT, margin: 0 }}>Sem testes de sensibilidade registrados.</p>
                ) : (
                  <SIRStackedChart
                    data={bact.perfil.map(p => ({ name: p.antibiotic, S: p.S, I: p.I, R: p.R, resistRate: p.resistRate }))}
                    width={680} barH={15} labelW={175}
                  />
                )}
              </div>
            ))}
          </>
        )}
        <DiscussionBlock content={discussions?.sensibilidade} />
      </SubSection>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Parse per-sector AI discussions from markdown
// ──────────────────────────────────────────────────────────────────────────
function parseSectorDiscussions(md: string): Record<string, { culturas?: string; organismos?: string; material?: string; sensibilidade?: string; geral?: string }> {
  const out: Record<string, { culturas?: string; organismos?: string; material?: string; sensibilidade?: string; geral?: string }> = {};
  const sectorParts = md.split(/\n(?=## SETOR:\s)/i);
  for (const part of sectorParts) {
    const headerMatch = part.match(/^## SETOR:\s*(.+)/i);
    if (!headerMatch) continue;
    const key = headerMatch[1].trim().toUpperCase();
    out[key] = {};
    const subParts = part.split(/\n(?=### )/);
    for (const sub of subParts) {
      const subMatch = sub.match(/^### (.+)/);
      if (!subMatch) {
        const geral = sub.replace(/^## SETOR:\s*.+\n/i, "").trim();
        if (geral) out[key].geral = geral;
        continue;
      }
      const subKey = subMatch[1].trim().toUpperCase();
      const content = sub.replace(/^### .+\n/, "").trim();
      if (subKey.includes("CULTUR")) out[key].culturas = content;
      else if (subKey.includes("ORGANIS") || subKey.includes("MICROB")) out[key].organismos = content;
      else if (subKey.includes("MATER") || subKey.includes("ESPEC")) out[key].material = content;
      else if (subKey.includes("SENSIB") || subKey.includes("ANTIMICR")) out[key].sensibilidade = content;
    }
  }
  return out;
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

    const sectorDiscussions = parseSectorDiscussions(aiContent);

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
        <div data-pdf-page style={{
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

        {/* ── PAGE 2: Sumário + Indicadores + Setores ─────────────── */}
        <div data-pdf-page style={{ padding: "26px 44px 8px", background: "white" }}>

          {/* ── SUMÁRIO / TOC ── */}
          {summary.setoresPerfil && summary.setoresPerfil.length > 0 && (
            <Section title="Sumário" icon="📑">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 24px" }}>
                {[
                  { num: "1", title: "Sumário Executivo" },
                  { num: "2", title: "Metodologia e Critérios" },
                  { num: "3", title: "Indicadores Globais" },
                  { num: "4", title: "Distribuição por Setor" },
                  { num: "5", title: "Perfil Microbiológico Global" },
                  { num: "5b", title: "Culturas por Material Biológico" },
                  { num: "5c", title: "Bactérias Prioritárias de Vigilância" },
                  ...summary.setoresPerfil.map((sp, i) => ({
                    num: `${ROMAN_NUMERALS[i] || i + 1}`,
                    title: `Perfil Setor: ${sp.setor}`,
                  })),
                  { num: "6", title: "Fenótipos MDR" },
                  { num: "7", title: "Antibiograma Consolidado" },
                  { num: "8", title: "Tendências Temporais" },
                  { num: "9", title: "Alertas Epidemiológicos" },
                  { num: "10", title: "Recomendações Clínicas" },
                  { num: "11", title: "Plano de Ação CCIH" },
                  { num: "12", title: "Conclusão" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "6px", padding: "3px 0", borderBottom: "1px dotted #e5e7eb", fontSize: "10.5px", fontFamily: FONT }}>
                    <span style={{ color: TEAL, fontWeight: 700, minWidth: "28px" }}>{item.num}.</span>
                    <span style={{ color: "#374151" }}>{item.title}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

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
        </div>

        {/* ── PAGE 3: Perfil Microbiológico ─────────────────────────── */}
        <div data-pdf-page style={{ padding: "8px 44px 8px", background: "white" }}>

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

          {/* ── 5b. CULTURAS POR MATERIAL BIOLÓGICO ── */}
          {summary.culturasPorMaterial && summary.culturasPorMaterial.length > 0 && (
            <Section title="5b. Culturas por Material Biológico" icon="🧪">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", alignItems: "start" }}>
                <div>
                  <DataTable
                    headers={["Material Biológico", "N", "% Total"]}
                    rows={summary.culturasPorMaterial.map(m => [
                      m.name,
                      String(m.value),
                      `${summary.totalExames > 0 ? ((m.value / summary.totalExames) * 100).toFixed(1) : 0}%`,
                    ])}
                    colWidths={["55%", "20%", "25%"]}
                  />
                </div>
                <div>
                  <p style={{ fontSize: "10px", color: GRAY, marginBottom: "6px", fontWeight: 600, fontFamily: FONT }}>Distribuição por Material</p>
                  <PieChartSVG
                    data={summary.culturasPorMaterial.slice(0, 12)}
                    colors={PIE_COLORS_DEFAULT}
                    width={310} size={140}
                  />
                </div>
              </div>
            </Section>
          )}

        </div>

        {/* ── PAGE 4: Bactérias Prioritárias de Vigilância ─────────── */}
        {summary.bacteriasAlvo && summary.bacteriasAlvo.length > 0 && (
          <div data-pdf-page style={{ padding: "8px 44px 8px", background: "white" }}>
          {/* ── 5c. BACTÉRIAS PRIORITÁRIAS DE VIGILÂNCIA ── */}
            <Section title="5c. Perfil das Bactérias Prioritárias de Vigilância" icon="🦠">
              <p style={{ fontSize: "10.5px", color: GRAY, marginBottom: "10px", fontFamily: FONT }}>
                Staphylococcus aureus · Klebsiella pneumoniae · Proteus sp. · Acinetobacter sp. · Pseudomonas sp. · Escherichia coli
              </p>
              {/* Tabela resumo das bactérias */}
              <div style={{ marginBottom: "14px" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", fontFamily: FONT }}>
                  <thead>
                    <tr style={{ background: TEAL, color: "white" }}>
                      {["Bactéria", "Isolados", "Principais Setores", "% Resistência Geral"].map((h, i) => (
                        <th key={i} style={{ textAlign: i === 0 ? "left" : "center", padding: "7px 10px", fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.bacteriasAlvo.map((b, i) => {
                      const allR = b.perfil.reduce((s, r) => s + r.R, 0);
                      const allT = b.perfil.reduce((s, r) => s + r.total, 0);
                      const gRRate = allT > 0 ? Math.round((allR / allT) * 100) : 0;
                      const rC = gRRate >= 50 ? RED : gRRate >= 30 ? ORANGE : GREEN;
                      return (
                        <tr key={b.label} style={{ background: i % 2 === 0 ? "#f9fafb" : "white", borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "6px 10px", fontWeight: 600, fontStyle: "italic" }}>{b.label}</td>
                          <td style={{ textAlign: "center", padding: "6px 10px", fontWeight: 700 }}>{b.isolados}</td>
                          <td style={{ padding: "6px 10px", fontSize: "10px", color: GRAY }}>
                            {b.setores.slice(0, 3).map(s => `${s.setor} (${s.count})`).join(" · ")}
                          </td>
                          <td style={{ textAlign: "center", padding: "6px 10px", fontWeight: 700, color: rC }}>{gRRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Antibiograma detalhado por bactéria */}
              {summary.bacteriasAlvo.filter(b => b.perfil.length > 0).map((b, bi) => (
                <div key={b.label} style={{ marginBottom: "18px", border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden" }}>
                  <div style={{ background: "#f3f4f6", padding: "8px 14px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 700, fontSize: "11px", fontStyle: "italic", fontFamily: FONT }}>{b.label}</span>
                    <span style={{ fontSize: "10px", color: GRAY, fontFamily: FONT }}>{b.isolados} isolado{b.isolados !== 1 ? "s" : ""}</span>
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    {/* Setores */}
                    {b.setores.length > 0 && (
                      <p style={{ fontSize: "9.5px", color: GRAY, marginBottom: "8px", fontFamily: FONT }}>
                        <strong>Setores:</strong>{" "}
                        {b.setores.map(s => `${s.setor} (n=${s.count})`).join(" · ")}
                      </p>
                    )}
                    {/* Tabela SIR */}
                    <p style={{ fontSize: "10px", color: GRAY, marginBottom: "6px", fontWeight: 600, fontFamily: FONT }}>Antibiograma — Perfil S/I/R</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", alignItems: "start" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px", fontFamily: FONT }}>
                        <thead>
                          <tr style={{ background: TEAL, color: "white" }}>
                            {["Antimicrobiano", "S", "I", "R", "Total", "%R"].map((h, hi) => (
                              <th key={hi} style={{ textAlign: hi === 0 ? "left" : "center", padding: "5px 8px", fontWeight: 600 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {b.perfil.slice(0, 15).map((r, ri) => {
                            const rC = r.resistRate >= 50 ? RED : r.resistRate >= 30 ? ORANGE : GREEN;
                            return (
                              <tr key={r.antibiotic} style={{ background: ri % 2 === 0 ? "#f9fafb" : "white", borderBottom: "1px solid #e5e7eb" }}>
                                <td style={{ padding: "4px 8px", fontWeight: 500 }}>{r.antibiotic}</td>
                                <td style={{ textAlign: "center", padding: "4px 8px", color: GREEN, fontWeight: 600 }}>{r.S}</td>
                                <td style={{ textAlign: "center", padding: "4px 8px", color: ORANGE, fontWeight: 600 }}>{r.I}</td>
                                <td style={{ textAlign: "center", padding: "4px 8px", color: RED, fontWeight: 700 }}>{r.R}</td>
                                <td style={{ textAlign: "center", padding: "4px 8px", fontWeight: 700 }}>{r.total}</td>
                                <td style={{ textAlign: "center", padding: "4px 8px", fontWeight: 700, color: rC }}>{r.resistRate}%</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      <div>
                        <BacteriaAntibiogramChart data={b.perfil.slice(0, 12)} width={310} barH={14} labelW={130} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </Section>
          </div>
        )}

        {/* ── PÁGINAS POR SETOR (uma página A4 por setor) ─────────── */}
        {summary.setoresPerfil && summary.setoresPerfil.length > 0 && summary.setoresPerfil.map((sp, idx) => {
          const key = sp.setor.toUpperCase();
          const discussions = sectorDiscussions[key] || {};
          return (
            <div key={sp.setor} data-pdf-page style={{ padding: "8px 44px 8px", background: "white" }}>
              {idx === 0 && (
                <div style={{ marginBottom: "14px", borderTop: `3px solid ${TEAL}`, paddingTop: "14px" }}>
                  <h2 style={{ fontSize: "13px", fontWeight: 700, color: TEAL, margin: "0 0 4px", fontFamily: FONT, textTransform: "uppercase" }}>
                    Análise por Setor Hospitalar
                  </h2>
                  <p style={{ fontSize: "10.5px", color: GRAY, margin: 0, fontFamily: FONT }}>
                    Perfil microbiológico e de sensibilidade antimicrobiana detalhado por unidade de internação
                  </p>
                </div>
              )}
              <SectorSection sp={sp} idx={idx} discussions={discussions} chartColors={CHART_COLORS} />
            </div>
          );
        })}

        {/* ── PAGE N: Fenótipos + Antibiograma + Análise Setorial ──── */}
        <div data-pdf-page style={{ padding: "8px 44px 8px", background: "white" }}>

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
        </div>

        {/* ── PAGE FINAL: Tendências + Alertas + Recomendações ─────── */}
        <div data-pdf-page style={{ padding: "8px 44px 36px", background: "white" }}>

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
