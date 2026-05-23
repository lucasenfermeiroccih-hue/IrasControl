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

// Parse AI markdown into named sections by ## headings
function parseSections(md: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = md.split(/\n(?=## )/);
  for (const part of parts) {
    const firstNewline = part.indexOf("\n");
    if (firstNewline === -1) continue;
    const heading = part.slice(0, firstNewline).replace(/^##\s*/, "").trim().toUpperCase();
    const body = part.slice(firstNewline + 1).trim();
    out[heading] = body;
  }
  return out;
}

function AiSection({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div style={{ fontSize: "11px", color: "#374151", lineHeight: "1.6" }}>
      {content.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} style={{ height: "6px" }} />;
        if (t.startsWith("### ")) return (
          <p key={i} style={{ fontWeight: 700, color: "#0f6b5c", margin: "6px 0 2px" }}>
            {t.replace(/^### /, "")}
          </p>
        );
        if (t.startsWith("- ") || t.startsWith("* ")) return (
          <p key={i} style={{ display: "flex", gap: "6px", margin: "2px 0" }}>
            <span style={{ color: "#0f6b5c", flexShrink: 0 }}>•</span>
            <span dangerouslySetInnerHTML={{ __html: t.replace(/^[-*] /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          </p>
        );
        if (/^\d+\.\s/.test(t)) return (
          <p key={i} style={{ display: "flex", gap: "6px", margin: "2px 0" }}>
            <span style={{ color: "#0f6b5c", fontWeight: 700, flexShrink: 0 }}>{t.match(/^\d+/)?.[0]}.</span>
            <span dangerouslySetInnerHTML={{ __html: t.replace(/^\d+\. /, "").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }} />
          </p>
        );
        if (/^\|.+\|$/.test(t)) return (
          <p key={i} style={{ fontFamily: "monospace", fontSize: "10px", margin: "1px 0", color: "#4b5563" }}>{t}</p>
        );
        return (
          <p key={i} style={{ margin: "3px 0" }}
            dangerouslySetInnerHTML={{ __html: t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>") }} />
        );
      })}
    </div>
  );
}

function Section({ title, accent = "#0f6b5c", children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{ border: `1px solid ${accent}30`, borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
      <div style={{ background: accent, padding: "7px 14px" }}>
        <h2 style={{ color: "white", fontSize: "12px", fontWeight: 700, margin: 0 }}>{title}</h2>
      </div>
      <div style={{ padding: "12px 14px" }}>{children}</div>
    </div>
  );
}

function DataTable({ headers, rows, colWidths }: {
  headers: string[];
  rows: string[][];
  colWidths?: string[];
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
      <thead>
        <tr style={{ background: "#0f6b5c", color: "white" }}>
          {headers.map((h, i) => (
            <th key={i} style={{ textAlign: i === 0 ? "left" : "center", padding: "6px 8px", width: colWidths?.[i], fontWeight: 600 }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, ri) => (
          <tr key={ri} style={{ background: ri % 2 === 0 ? "#f9fafb" : "white", borderBottom: "1px solid #e5e7eb" }}>
            {row.map((cell, ci) => (
              <td key={ci} style={{ padding: "5px 8px", textAlign: ci === 0 ? "left" : "center" }}>{cell}</td>
            ))}
          </tr>
        ))}
        {rows.length === 0 && (
          <tr>
            <td colSpan={headers.length} style={{ padding: "12px", textAlign: "center", color: "#9ca3af", fontStyle: "italic" }}>
              Sem dados disponíveis
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

const MicrobiologicalReport = forwardRef<HTMLDivElement, Props>(
  ({ hospitalName = "Hospital", summary, aiContent }, ref) => {
    const sections = parseSections(aiContent);
    const emissionDate = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const riskColor = summary.taxaResistencia > 40 ? "#dc2626" : summary.taxaResistencia > 25 ? "#d97706" : "#059669";

    const get = (...keys: string[]) => {
      for (const k of keys) {
        const val = sections[k.toUpperCase()];
        if (val) return val;
      }
      return "";
    };

    return (
      <div ref={ref} style={{ background: "white", color: "#111827", fontFamily: "Arial, Helvetica, sans-serif", width: "794px" }}>

        {/* ── CAPA ── */}
        <div style={{ background: "linear-gradient(135deg, #0f6b5c 0%, #1a9177 100%)", padding: "32px 40px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "6px" }}>
                Relatório Técnico CCIH · Vigilância Epidemiológica
              </p>
              <h1 style={{ color: "white", fontSize: "22px", fontWeight: 700, lineHeight: "1.3", margin: 0 }}>
                Perfil de Sensibilidade<br />Antimicrobiana Hospitalar
              </h1>
              <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "13px", marginTop: "6px" }}>{hospitalName}</p>
            </div>
            <div style={{ textAlign: "right", color: "rgba(255,255,255,0.8)", fontSize: "11px", lineHeight: "1.8" }}>
              <p style={{ fontWeight: 600 }}>{summary.periodo}</p>
              <p>{summary.periodStart} a {summary.periodEnd}</p>
              <p style={{ marginTop: "4px" }}>Emissão: {emissionDate}</p>
              <p style={{ fontSize: "10px", opacity: 0.7 }}>IRASControl · v1.0</p>
            </div>
          </div>
          {/* KPI strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px", marginTop: "20px" }}>
            {[
              { label: "Total Exames", value: String(summary.totalExames) },
              { label: "Testes SIR", value: String(summary.totalTestes) },
              { label: "Taxa Resistência", value: `${summary.taxaResistencia}%`, bg: "rgba(220,38,38,0.35)" },
              { label: "Taxa Sensibilidade", value: `${summary.taxaSensibilidade}%`, bg: "rgba(5,150,105,0.35)" },
              { label: "Fenótipos MDR", value: String(summary.examesComFenotipo), bg: "rgba(217,119,6,0.35)" },
            ].map(k => (
              <div key={k.label} style={{ background: k.bg || "rgba(255,255,255,0.15)", borderRadius: "8px", padding: "8px 10px" }}>
                <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "10px", margin: "0 0 2px" }}>{k.label}</p>
                <p style={{ color: "white", fontWeight: 700, fontSize: "17px", margin: 0 }}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: "24px 40px 32px" }}>

          {/* ── 1. SUMÁRIO EXECUTIVO ── */}
          <Section title="1. Sumário Executivo">
            {get("RESUMO EXECUTIVO", "SUMÁRIO EXECUTIVO") ? (
              <AiSection content={get("RESUMO EXECUTIVO", "SUMÁRIO EXECUTIVO")} />
            ) : (
              <p style={{ fontSize: "11px", color: "#374151", lineHeight: "1.6" }}>
                No período de <strong>{summary.periodStart}</strong> a <strong>{summary.periodEnd}</strong> ({summary.periodo}),
                foram processados <strong>{summary.totalExames} exames</strong> microbiológicos com isolado positivo,
                totalizando <strong>{summary.totalTestes} testes</strong> de sensibilidade antimicrobiana.
                A taxa global de resistência foi de{" "}
                <strong style={{ color: riskColor }}>{summary.taxaResistencia}%</strong> e a taxa de sensibilidade de{" "}
                <strong style={{ color: "#059669" }}>{summary.taxaSensibilidade}%</strong>.
                Foram detectados <strong>{summary.examesComFenotipo} exames</strong> com fenótipos de resistência crítica (MDR).
              </p>
            )}
          </Section>

          {/* ── 2. METODOLOGIA ── */}
          <Section title="2. Metodologia">
            <div style={{ fontSize: "11px", color: "#374151", lineHeight: "1.8" }}>
              <p>• <strong>Critérios de interpretação:</strong> CLSI (Clinical and Laboratory Standards Institute) / EUCAST</p>
              <p>• <strong>Identificação:</strong> MALDI-TOF, VITEK 2, Phoenix, automação laboratorial</p>
              <p>• <strong>Exclusão de duplicatas:</strong> Primeira amostra por paciente/período</p>
              <p>• <strong>Definições MDR:</strong> MDR (resistente ≥3 classes), XDR (resistente ≥5 classes), PDR (pan-resistente)</p>
              <p>• <strong>Materiais incluídos:</strong> Hemocultura, Urina, Aspirado traqueal, Swab vigilância, Líquor, Secreções</p>
            </div>
          </Section>

          {/* ── 3. INDICADORES GLOBAIS ── */}
          <Section title="3. Indicadores Globais">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "4px" }}>
              {[
                { label: "Total de Culturas Processadas", value: String(summary.totalExames), sub: "exames com isolado positivo" },
                { label: "Total de Testes SIR", value: String(summary.totalTestes), sub: "sensibilidade / resistência" },
                { label: "Taxa Global de Resistência", value: `${summary.taxaResistencia}%`, sub: "resultado R", color: riskColor },
                { label: "Taxa Global de Sensibilidade", value: `${summary.taxaSensibilidade}%`, sub: "resultado S", color: "#059669" },
                { label: "Exames com MDR", value: String(summary.examesComFenotipo), sub: `${summary.totalExames > 0 ? ((summary.examesComFenotipo / summary.totalExames) * 100).toFixed(1) : 0}% dos exames`, color: "#d97706" },
                { label: "Microrganismo Predominante", value: summary.topOrganismos[0]?.name?.split(" ").slice(0, 2).join(" ") || "—", sub: `${summary.topOrganismos[0]?.value || 0} isolados` },
              ].map(k => (
                <div key={k.label} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", padding: "10px 12px", background: "#f9fafb" }}>
                  <p style={{ fontSize: "10px", color: "#6b7280", margin: "0 0 4px" }}>{k.label}</p>
                  <p style={{ fontSize: "18px", fontWeight: 700, color: k.color || "#0f6b5c", margin: "0 0 2px" }}>{k.value}</p>
                  <p style={{ fontSize: "10px", color: "#9ca3af", margin: 0 }}>{k.sub}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* ── 4. DISTRIBUIÇÃO POR SETOR ── */}
          <Section title="4. Distribuição por Setor">
            <DataTable
              headers={["Setor", "Exames", "% Total", "Prioridade"]}
              rows={summary.setores.map((s, i) => [
                s.name,
                String(s.value),
                `${summary.totalExames > 0 ? ((s.value / summary.totalExames) * 100).toFixed(1) : 0}%`,
                i === 0 ? "🔴 Alta" : i < 3 ? "🟡 Moderada" : "🟢 Normal",
              ])}
              colWidths={["45%", "15%", "15%", "25%"]}
            />
            {get("ANÁLISE POR SETOR", "ANALISE POR SETOR") && (
              <div style={{ marginTop: "10px" }}>
                <AiSection content={get("ANÁLISE POR SETOR", "ANALISE POR SETOR")} />
              </div>
            )}
          </Section>

          {/* ── 5. PERFIL MICROBIOLÓGICO GERAL ── */}
          <Section title="5. Perfil Microbiológico Geral">
            <DataTable
              headers={["Microrganismo", "Isolados", "% Total", "Setor Principal"]}
              rows={summary.topOrganismos.map((o, i) => [
                o.name,
                String(o.value),
                `${summary.totalExames > 0 ? ((o.value / summary.totalExames) * 100).toFixed(1) : 0}%`,
                summary.setores[i % summary.setores.length]?.name || "—",
              ])}
              colWidths={["40%", "15%", "15%", "30%"]}
            />
            {get("ANÁLISE MICROBIOLÓGICA", "ANALISE MICROBIOLOGICA") && (
              <div style={{ marginTop: "10px" }}>
                <AiSection content={get("ANÁLISE MICROBIOLÓGICA", "ANALISE MICROBIOLOGICA")} />
              </div>
            )}
          </Section>

          {/* ── 6. PERFIL MDR ── */}
          <Section title="6. Perfil de Multirresistência (MDR)" accent="#b91c1c">
            {summary.fenotiposDetectados.length === 0 ? (
              <p style={{ fontSize: "11px", color: "#6b7280", fontStyle: "italic" }}>
                ✅ Nenhum fenótipo MDR detectado no período analisado.
              </p>
            ) : (
              <>
                <DataTable
                  headers={["Fenótipo MDR", "Casos", "% dos Exames", "Nível de Risco"]}
                  rows={summary.fenotiposDetectados.map(f => {
                    const pct = summary.totalExames > 0 ? (f.value / summary.totalExames) * 100 : 0;
                    return [
                      f.name,
                      String(f.value),
                      `${pct.toFixed(1)}%`,
                      pct > 10 ? "⚠️ Crítico" : pct > 5 ? "⚡ Alto" : "🟡 Moderado",
                    ];
                  })}
                  colWidths={["25%", "15%", "25%", "35%"]}
                />
                <div style={{ marginTop: "8px", padding: "8px 10px", background: "#fef2f2", borderRadius: "6px", border: "1px solid #fecaca", fontSize: "10px", color: "#991b1b" }}>
                  ⚠️ Presença de fenótipos MDR requer isolamento de contato imediato e revisão do protocolo antimicrobiano.
                </div>
              </>
            )}
          </Section>

          {/* ── 7. ANTIBIOGRAMA CONSOLIDADO ── */}
          <Section title="7. Antibiograma Consolidado — Perfil SIR por Antimicrobiano">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#0f6b5c", color: "white" }}>
                  {["Antimicrobiano", "S (n)", "I (n)", "R (n)", "% R", "Risco Clínico"].map((h, i) => (
                    <th key={i} style={{ textAlign: i === 0 ? "left" : "center", padding: "6px 8px", fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.perfilSIR.map((row, i) => {
                  const rBg = row.resistRate >= 50 ? "#fef2f2" : row.resistRate >= 30 ? "#fffbeb" : "#f0fdf4";
                  const rC = row.resistRate >= 50 ? "#dc2626" : row.resistRate >= 30 ? "#d97706" : "#059669";
                  const rL = row.resistRate >= 50 ? "⚠️ Alto" : row.resistRate >= 30 ? "⚡ Moderado" : "✅ Baixo";
                  return (
                    <tr key={row.name} style={{ background: i % 2 === 0 ? "#f9fafb" : "white", borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "5px 8px", fontWeight: 500 }}>{row.name}</td>
                      <td style={{ textAlign: "center", padding: "5px 8px", color: "#059669" }}>{row.S}</td>
                      <td style={{ textAlign: "center", padding: "5px 8px", color: "#d97706" }}>{row.I}</td>
                      <td style={{ textAlign: "center", padding: "5px 8px", color: "#dc2626", fontWeight: 600 }}>{row.R}</td>
                      <td style={{ textAlign: "center", padding: "5px 8px", fontWeight: 700, color: rC }}>{row.resistRate}%</td>
                      <td style={{ textAlign: "center", padding: "5px 8px", background: rBg, color: rC, fontSize: "10px" }}>{rL}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {get("PERFIL DE RESISTÊNCIA", "ANALISE DE RESISTENCIA") && (
              <div style={{ marginTop: "10px" }}>
                <AiSection content={get("PERFIL DE RESISTÊNCIA", "ANALISE DE RESISTENCIA")} />
              </div>
            )}
          </Section>

          {/* ── 8. TENDÊNCIAS TEMPORAIS ── */}
          <Section title="8. Tendências Temporais">
            {summary.tendenciaMensal.length === 0 ? (
              <p style={{ fontSize: "11px", color: "#6b7280", fontStyle: "italic" }}>Dados temporais insuficientes para o período.</p>
            ) : (
              <DataTable
                headers={["Mês/Ano", "Exames Realizados", "Taxa Resistência (%)", "Tendência"]}
                rows={summary.tendenciaMensal.map((t, i, arr) => {
                  const prev = i > 0 ? arr[i - 1].taxaResistencia : t.taxaResistencia;
                  const trend = t.taxaResistencia > prev ? "↑ Subindo" : t.taxaResistencia < prev ? "↓ Caindo" : "→ Estável";
                  return [t.month, String(t.exames), `${t.taxaResistencia}%`, trend];
                })}
                colWidths={["25%", "25%", "25%", "25%"]}
              />
            )}
            {get("TENDÊNCIAS TEMPORAIS", "TENDENCIAS TEMPORAIS") && (
              <div style={{ marginTop: "10px" }}>
                <AiSection content={get("TENDÊNCIAS TEMPORAIS", "TENDENCIAS TEMPORAIS")} />
              </div>
            )}
          </Section>

          {/* ── 9. ALERTAS EPIDEMIOLÓGICOS ── */}
          {get("ALERTAS EPIDEMIOLÓGICOS", "ALERTAS EPIDEMIOLOGICOS") && (
            <Section title="9. Alertas Epidemiológicos" accent="#b91c1c">
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", padding: "12px" }}>
                <AiSection content={get("ALERTAS EPIDEMIOLÓGICOS", "ALERTAS EPIDEMIOLOGICOS")} />
              </div>
            </Section>
          )}

          {/* ── 10. RECOMENDAÇÕES CLÍNICAS ── */}
          <Section title="10. Recomendações Clínicas e Stewardship Antimicrobiano">
            {get("RECOMENDAÇÕES CLÍNICAS", "RECOMENDACOES CLINICAS", "RECOMENDAÇÕES", "RECOMENDACOES") ? (
              <AiSection content={get("RECOMENDAÇÕES CLÍNICAS", "RECOMENDACOES CLINICAS", "RECOMENDAÇÕES", "RECOMENDACOES")} />
            ) : (
              <div style={{ fontSize: "11px", color: "#374151", lineHeight: "1.8" }}>
                <p>1. <strong>Stewardship antimicrobiano:</strong> revisar prescrições de carbapenêmicos e cefalosporinas de 3ª/4ª geração</p>
                <p>2. <strong>Precauções de contato:</strong> reforçar isolamento para portadores confirmados de MDR (MRSA, VRE, KPC)</p>
                <p>3. <strong>Vigilância ativa:</strong> swabs de vigilância em pacientes de alto risco (UTI, tempo ≥14 dias, uso prévio de antibióticos)</p>
                <p>4. <strong>Laboratório:</strong> ampliar painel de testes de sensibilidade para polimixina e tigeciclina</p>
                <p>5. <strong>Educação:</strong> reforçar higiene das mãos e 5 momentos da OMS em todos os setores</p>
              </div>
            )}
          </Section>

          {/* ── 11. PLANO DE AÇÃO CCIH ── */}
          <Section title="11. Plano de Ação CCIH">
            {get("PLANO DE AÇÃO CCIH", "PLANO DE ACAO CCIH", "PLANO DE AÇÃO") ? (
              <AiSection content={get("PLANO DE AÇÃO CCIH", "PLANO DE ACAO CCIH", "PLANO DE AÇÃO")} />
            ) : (
              <DataTable
                headers={["Problema Identificado", "Impacto", "Ação Proposta", "Responsável", "Prazo"]}
                rows={[
                  ["Alta resistência observada", "Alto", "Revisar protocolo ATM", "CCIH/Infectologia", "30 dias"],
                  ["Fenótipos MDR detectados", "Crítico", "Reforçar isolamento contato", "Enfermagem/CCIH", "Imediato"],
                  ["Pressão seletiva antibiótica", "Médio", "Implementar stewardship", "Farmácia Clínica", "60 dias"],
                  ["Monitoramento tendências", "Preventivo", "Relatório mensal CCIH", "CCIH", "Mensal"],
                ]}
                colWidths={["28%", "12%", "28%", "18%", "14%"]}
              />
            )}
          </Section>

          {/* ── 12. CONCLUSÃO ── */}
          {get("CONCLUSÃO", "CONCLUSAO") && (
            <Section title="12. Conclusão">
              <AiSection content={get("CONCLUSÃO", "CONCLUSAO")} />
            </Section>
          )}

          {/* Footer */}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "12px", marginTop: "8px" }}>
            <p style={{ fontSize: "9px", color: "#9ca3af", textAlign: "center", lineHeight: "1.5" }}>
              Relatório gerado automaticamente pelo Sistema <strong>IRASControl</strong> — {hospitalName} — {emissionDate}<br />
              Os dados refletem exclusivamente o período selecionado e dependem da completude dos registros microbiológicos.
              Recomenda-se validação clínica e epidemiológica antes de decisões terapêuticas. Critérios CLSI/EUCAST.
            </p>
          </div>

        </div>
      </div>
    );
  }
);

MicrobiologicalReport.displayName = "MicrobiologicalReport";
export default MicrobiologicalReport;
