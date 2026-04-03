import { DDDRegistroMensal } from "@/data/antimicrobianos-ddd";

export interface AIAnalysisInput {
  filtered: DDDRegistroMensal[];
  all: DDDRegistroMensal[];
  filtroMes: string;
  filtroAno: string;
}

function topN<T>(items: T[], key: (item: T) => number, n = 5): T[] {
  return [...items].sort((a, b) => key(b) - key(a)).slice(0, n);
}

function aggregate(data: DDDRegistroMensal[], field: "antimicrobiano" | "unidade", metric: "indicadorConsumo" | "totalG") {
  const map: Record<string, number> = {};
  data.forEach(d => { map[d[field]] = (map[d[field]] || 0) + d[metric]; });
  return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 })).sort((a, b) => b.value - a.value);
}

function trend(data: DDDRegistroMensal[]): { direction: "alta" | "queda" | "estável"; pct: number } {
  const byMonth: Record<string, number> = {};
  data.forEach(d => {
    const key = `${d.ano}-${String(d.mesNumero).padStart(2, "0")}`;
    byMonth[key] = (byMonth[key] || 0) + d.indicadorConsumo;
  });
  const keys = Object.keys(byMonth).sort();
  if (keys.length < 2) return { direction: "estável", pct: 0 };
  const first = byMonth[keys[0]];
  const last = byMonth[keys[keys.length - 1]];
  const pct = first > 0 ? Math.round(((last - first) / first) * 100) : 0;
  return { direction: pct > 5 ? "alta" : pct < -5 ? "queda" : "estável", pct: Math.abs(pct) };
}

export function generateAIReport(input: AIAnalysisInput): string {
  const { filtered, filtroMes, filtroAno } = input;
  if (filtered.length === 0) return "⚠️ Sem dados para o período selecionado.";

  const total = Math.round(filtered.reduce((s, d) => s + d.indicadorConsumo, 0) * 100) / 100;
  const avg = Math.round((total / filtered.length) * 100) / 100;
  const byAtm = aggregate(filtered, "antimicrobiano", "totalG");
  const byUnit = aggregate(filtered, "unidade", "indicadorConsumo");
  const t = trend(filtered);

  const periodo = `${filtroMes !== "all" ? filtroMes : "Todos os meses"} / ${filtroAno !== "all" ? filtroAno : "Todos os anos"}`;

  return [
    `# 📊 Relatório de Consumo DDD`,
    `**Período:** ${periodo}`,
    `**Registros analisados:** ${filtered.length}`,
    "",
    "## Resumo Geral",
    `- **Consumo total (indicador):** ${total}`,
    `- **Média por registro:** ${avg}`,
    `- **Tendência:** ${t.direction === "alta" ? "📈 Alta" : t.direction === "queda" ? "📉 Queda" : "➡️ Estável"} (${t.pct}%)`,
    "",
    "## Top 5 Antimicrobianos (por volume em g)",
    ...byAtm.slice(0, 5).map((a, i) => `${i + 1}. **${a.name}** — ${a.value}g`),
    "",
    "## Consumo por Unidade",
    ...byUnit.map(u => `- **${u.name}:** ${u.value}`),
    "",
    "## Observações",
    byAtm[0] ? `- O antimicrobiano **${byAtm[0].name}** representa a maior parcela do consumo total.` : "",
    byUnit[0] ? `- A unidade **${byUnit[0].name}** lidera em consumo — avaliar necessidade de stewardship.` : "",
    t.direction === "alta" ? `- ⚠️ Tendência de **alta de ${t.pct}%** no período — monitorar de perto.` : "",
  ].filter(Boolean).join("\n");
}

export function generateAIInsights(input: AIAnalysisInput): string {
  const { filtered, all } = input;
  if (filtered.length === 0) return "⚠️ Sem dados para gerar insights.";

  const byAtm = aggregate(filtered, "antimicrobiano", "indicadorConsumo");
  const byUnit = aggregate(filtered, "unidade", "indicadorConsumo");
  const avg = filtered.reduce((s, d) => s + d.indicadorConsumo, 0) / filtered.length;
  const highCount = filtered.filter(d => d.indicadorConsumo > 40).length;
  const criticalCount = filtered.filter(d => d.indicadorConsumo > 50).length;
  const t = trend(filtered);

  const allAvg = all.length > 0 ? all.reduce((s, d) => s + d.indicadorConsumo, 0) / all.length : avg;
  const vsAll = avg > allAvg * 1.2 ? "acima" : avg < allAvg * 0.8 ? "abaixo" : "dentro";

  const insights: string[] = [
    "# 🔍 Insights Gerados",
    "",
  ];

  if (byAtm[0]) {
    insights.push(`**1. Concentração de uso:** O **${byAtm[0].name}** concentra o maior consumo (${byAtm[0].value}). Avaliar se há uso empírico excessivo ou se é justificado pelo perfil de resistência local.`);
    insights.push("");
  }

  if (byUnit[0] && byUnit.length > 1) {
    const ratio = byUnit[0].value / (byUnit[1]?.value || 1);
    if (ratio > 1.5) {
      insights.push(`**2. Disparidade entre unidades:** A **${byUnit[0].name}** consome ${ratio.toFixed(1)}x mais que a segunda unidade (**${byUnit[1].name}**). Pode indicar maior gravidade dos pacientes ou oportunidade de revisão terapêutica.`);
      insights.push("");
    }
  }

  if (highCount > 0) {
    insights.push(`**3. Indicadores elevados:** ${highCount} registro(s) com indicador > 40${criticalCount > 0 ? ` (${criticalCount} acima de 50 — críticos)` : ""}. Considere auditoria direcionada.`);
    insights.push("");
  }

  insights.push(`**4. Média de consumo:** ${avg.toFixed(2)} — está **${vsAll}** da média geral histórica (${allAvg.toFixed(2)}).`);
  insights.push("");

  if (t.direction !== "estável") {
    insights.push(`**5. Tendência temporal:** Consumo em **${t.direction}** de ${t.pct}%. ${t.direction === "alta" ? "Recomenda-se investigar causas (sazonalidade, surtos, mudança de protocolo)." : "Possível resultado de ações de stewardship."}`);
    insights.push("");
  }

  insights.push("---");
  insights.push("*Recomenda-se comparar os dados atuais com benchmarks nacionais da ANVISA e do ECDC.*");

  return insights.join("\n");
}

export function generateAIAlerts(input: AIAnalysisInput): string {
  const { filtered } = input;
  if (filtered.length === 0) return "⚠️ Sem dados para verificar alertas.";

  const alerts: string[] = ["# 🚨 Alertas Automáticos", ""];
  let alertCount = 0;

  // 1. Consumo crítico (> 50)
  const critical = filtered.filter(d => d.indicadorConsumo > 50);
  if (critical.length > 0) {
    alertCount++;
    const uniques = [...new Set(critical.map(d => d.antimicrobiano))];
    alerts.push(`### ⛔ Alerta Crítico — Consumo Elevado`);
    alerts.push(`**${critical.length}** registro(s) com indicador acima de 50.`);
    alerts.push(`Antimicrobianos envolvidos: ${uniques.join(", ")}`);
    alerts.push("**Ação:** Auditoria imediata e revisão de prescrições.");
    alerts.push("");
  }

  // 2. Crescimento abrupto
  const byMonth: Record<string, number> = {};
  filtered.forEach(d => {
    const key = `${d.ano}-${String(d.mesNumero).padStart(2, "0")}`;
    byMonth[key] = (byMonth[key] || 0) + d.indicadorConsumo;
  });
  const months = Object.keys(byMonth).sort();
  for (let i = 1; i < months.length; i++) {
    const prev = byMonth[months[i - 1]];
    const curr = byMonth[months[i]];
    if (prev > 0 && curr / prev > 1.5) {
      alertCount++;
      alerts.push(`### 📈 Alerta — Crescimento Abrupto`);
      alerts.push(`Consumo em **${months[i]}** cresceu **${Math.round(((curr - prev) / prev) * 100)}%** em relação ao mês anterior.`);
      alerts.push("**Ação:** Investigar possível surto ou mudança de protocolo.");
      alerts.push("");
      break;
    }
  }

  // 3. Concentração em uma unidade
  const byUnit = aggregate(filtered, "unidade", "indicadorConsumo");
  const totalConsumo = byUnit.reduce((s, u) => s + u.value, 0);
  if (byUnit[0] && totalConsumo > 0) {
    const pct = (byUnit[0].value / totalConsumo) * 100;
    if (pct > 60) {
      alertCount++;
      alerts.push(`### 🏥 Alerta — Concentração de Consumo`);
      alerts.push(`A unidade **${byUnit[0].name}** concentra **${pct.toFixed(0)}%** do consumo total.`);
      alerts.push("**Ação:** Avaliar se é proporcional à gravidade dos pacientes ou se há oportunidade de otimização.");
      alerts.push("");
    }
  }

  if (alertCount === 0) {
    alerts.push("✅ **Nenhum alerta identificado.** Todos os indicadores estão dentro dos parâmetros esperados.");
  }

  return alerts.join("\n");
}
