import type {
  AuditRecord,
  AuditItemRecord,
  AuditReportMetrics,
  MonthlySectorCompiledAuditMetrics,
  AuditActionPlanRecord,
  ReportClassification,
  ReportStatusColor,
  ReportTendency,
  QualidadeRegistro,
} from "./auditReportTypes";
import { AUDIT_TYPE_LABELS, type AuditTypeKey } from "./auditReportTypes";

function classify(pct: number): ReportClassification {
  if (pct >= 95) return "Excelente";
  if (pct >= 85) return "Bom";
  if (pct >= 70) return "Regular";
  return "Crítico";
}

function statusColor(pct: number): ReportStatusColor {
  if (pct >= 85) return "verde";
  if (pct >= 70) return "amarelo";
  return "vermelho";
}

function auditTypeLabel(key: string): string {
  return AUDIT_TYPE_LABELS[key as AuditTypeKey] ?? key;
}

export function calculateAuditReportMetrics(
  audits: AuditRecord[],
  items: AuditItemRecord[],
  previousAudits?: AuditRecord[],
  previousItems?: AuditItemRecord[]
): AuditReportMetrics {
  const totalAuditorias = audits.length;
  const totalItens = items.filter((i) => i.status !== "not_applicable" && i.status !== "not_evaluated").length;
  const itensConformes = items.filter((i) => i.status === "compliant").length;
  const itensNaoConformes = items.filter((i) => i.status === "non_compliant").length;

  const conformidadeGeral =
    totalAuditorias > 0
      ? Math.round(
          (audits.reduce((s, a) => s + (a.compliance_rate ?? 0), 0) / totalAuditorias) * 10
        ) / 10
      : 0;

  const taxaNaoConformidade = totalItens > 0 ? Math.round((itensNaoConformes / totalItens) * 1000) / 10 : 0;

  const uniqueSectors = new Set(audits.map((a) => a.sector ?? "Sem setor"));
  const totalProfissionaisObservados = uniqueSectors.size;
  const totalAuditores = new Set(audits.map((a) => a.audit_date)).size;

  const byCategory: Record<string, { conf: number; total: number }> = {};
  items.forEach((i) => {
    const cat = i.category || "Geral";
    if (!byCategory[cat]) byCategory[cat] = { conf: 0, total: 0 };
    if (i.status !== "not_applicable" && i.status !== "not_evaluated") {
      byCategory[cat].total++;
      if (i.status === "compliant") byCategory[cat].conf++;
    }
  });

  const conformidadePorCategoria: Record<string, number> = {};
  const naoConformidadesPorCategoria: Record<string, number> = {};
  Object.entries(byCategory).forEach(([cat, v]) => {
    conformidadePorCategoria[cat] = v.total > 0 ? Math.round((v.conf / v.total) * 100) : 0;
    naoConformidadesPorCategoria[cat] = v.total - v.conf;
  });

  const sortedCats = Object.entries(conformidadePorCategoria).sort(([, a], [, b]) => b - a);
  const topConformidades = sortedCats.slice(0, 3).map(([cat]) => cat);

  const ncCount: Record<string, number> = {};
  items.filter((i) => i.status === "non_compliant").forEach((i) => {
    ncCount[i.question] = (ncCount[i.question] ?? 0) + 1;
  });
  const topNaoConformidades = Object.entries(ncCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([q]) => q);

  const conformidadePorProfissao: Record<string, number> = {};
  uniqueSectors.forEach((s) => {
    const sectorAudits = audits.filter((a) => (a.sector ?? "Sem setor") === s);
    if (sectorAudits.length) {
      const avg = sectorAudits.reduce((sum, a) => sum + (a.compliance_rate ?? 0), 0) / sectorAudits.length;
      conformidadePorProfissao[s] = Math.round(avg * 10) / 10;
    }
  });

  const auditoriasPorAuditor: Record<string, number> = {};
  audits.forEach((a) => {
    const key = a.audit_date;
    auditoriasPorAuditor[key] = (auditoriasPorAuditor[key] ?? 0) + 1;
  });

  let tendencia: ReportTendency = "Sem histórico";
  if (previousAudits && previousAudits.length > 0 && totalAuditorias > 0) {
    const prevAvg =
      previousAudits.reduce((s, a) => s + (a.compliance_rate ?? 0), 0) / previousAudits.length;
    const diff = conformidadeGeral - prevAvg;
    if (diff > 2) tendencia = "Melhorando";
    else if (diff < -2) tendencia = "Piorando";
    else tendencia = "Estável";
  } else if (totalAuditorias > 1) {
    const sorted = [...audits].sort((a, b) => a.audit_date.localeCompare(b.audit_date));
    const mid = Math.floor(sorted.length / 2);
    const older = sorted.slice(0, mid).reduce((s, a) => s + (a.compliance_rate ?? 0), 0) / (mid || 1);
    const newer = sorted.slice(mid).reduce((s, a) => s + (a.compliance_rate ?? 0), 0) / (sorted.length - mid || 1);
    const diff = newer - older;
    if (diff > 2) tendencia = "Melhorando";
    else if (diff < -2) tendencia = "Piorando";
    else tendencia = "Estável";
  }

  const baixaAmostragem = totalAuditorias < 3;

  const withObs = items.filter((i) => i.status === "non_compliant" && i.observation?.trim()).length;
  const withoutObs = itensNaoConformes - withObs;
  let qualidadeRegistro: QualidadeRegistro = "Boa";
  if (itensNaoConformes > 0) {
    const ratio = withoutObs / itensNaoConformes;
    if (ratio > 0.5) qualidadeRegistro = "Insuficiente";
    else if (ratio > 0.2) qualidadeRegistro = "Regular";
  }

  return {
    totalAuditorias,
    totalItens,
    itensConformes,
    itensNaoConformes,
    conformidadeGeral,
    taxaNaoConformidade,
    totalProfissionaisObservados,
    totalAuditores,
    classificacao: classify(conformidadeGeral),
    statusCor: statusColor(conformidadeGeral),
    topConformidades,
    topNaoConformidades,
    naoConformidadesPorCategoria,
    conformidadePorCategoria,
    conformidadePorProfissao,
    auditoriasPorAuditor,
    tendencia,
    baixaAmostragem,
    qualidadeRegistro,
  };
}

export function calculateMonthlySectorCompiledAuditReport(params: {
  audits: AuditRecord[];
  items: AuditItemRecord[];
}): MonthlySectorCompiledAuditMetrics {
  const { audits, items } = params;

  const totalAudits = audits.length;
  const compliantItems = items.filter((i) => i.status === "compliant").length;
  const nonCompliantItems = items.filter((i) => i.status === "non_compliant").length;
  const totalItems = items.filter((i) => i.status !== "not_applicable" && i.status !== "not_evaluated").length;

  const generalComplianceRate =
    totalAudits > 0
      ? Math.round((audits.reduce((s, a) => s + (a.compliance_rate ?? 0), 0) / totalAudits) * 10) / 10
      : 0;

  // Per audit type aggregation
  const byType: Record<string, { audits: AuditRecord[]; items: AuditItemRecord[] }> = {};
  audits.forEach((a) => {
    const label = auditTypeLabel(a.audit_type);
    if (!byType[label]) byType[label] = { audits: [], items: [] };
    byType[label].audits.push(a);
  });
  items.forEach((i) => {
    const audit = audits.find((a) => a.id === i.audit_id);
    if (audit) {
      const label = auditTypeLabel(audit.audit_type);
      if (byType[label]) byType[label].items.push(i);
    }
  });

  const auditTypesIncluded = Object.keys(byType);
  const totalAuditTypes = auditTypesIncluded.length;

  const complianceByAuditType: Record<string, number> = {};
  const totalAuditsByType: Record<string, number> = {};
  const nonCompliancesByAuditType: Record<string, number> = {};

  Object.entries(byType).forEach(([label, { audits: ta, items: ti }]) => {
    totalAuditsByType[label] = ta.length;
    complianceByAuditType[label] =
      ta.length > 0
        ? Math.round((ta.reduce((s, a) => s + (a.compliance_rate ?? 0), 0) / ta.length) * 10) / 10
        : 0;
    nonCompliancesByAuditType[label] = ti.filter((i) => i.status === "non_compliant").length;
  });

  const sorted = Object.entries(complianceByAuditType).sort(([, a], [, b]) => a - b);
  const worstAuditTypes = sorted.slice(0, 5).map(([auditType, complianceRate]) => ({
    auditType,
    complianceRate,
    nonCompliantItems: nonCompliancesByAuditType[auditType] ?? 0,
  }));
  const bestAuditTypes = [...sorted].reverse().slice(0, 5).map(([auditType, complianceRate]) => ({
    auditType,
    complianceRate,
  }));

  // Top non-compliances across all types
  const ncMap: Map<string, { auditType: string; category: string; question: string; count: number }> = new Map();
  items.filter((i) => i.status === "non_compliant").forEach((i) => {
    const audit = audits.find((a) => a.id === i.audit_id);
    const label = audit ? auditTypeLabel(audit.audit_type) : "Outros";
    const key = `${label}||${i.question}`;
    const existing = ncMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      ncMap.set(key, {
        auditType: label,
        category: i.category ?? "Geral",
        question: i.question,
        count: 1,
      });
    }
  });
  const topNonCompliances = [...ncMap.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  // Positive findings
  const positiveFindings: string[] = [];
  const best = bestAuditTypes.slice(0, 3);
  if (best.length > 0) {
    positiveFindings.push(
      `Melhores desempenhos: ${best.map((b) => `${b.auditType} (${b.complianceRate}%)`).join(", ")}.`
    );
  }
  if (generalComplianceRate >= 85) {
    positiveFindings.push(`Conformidade geral do setor atingiu ${generalComplianceRate}%, acima da meta institucional mínima (85%).`);
  }
  if (totalAudits >= 5) {
    positiveFindings.push(`Boa cobertura de auditoria: ${totalAudits} auditorias realizadas, garantindo representatividade.`);
  }
  if (positiveFindings.length === 0) {
    positiveFindings.push("Esforço da equipe em realizar múltiplos tipos de auditoria no período.");
  }

  // Negative findings
  const negativeFindings: string[] = [];
  if (worstAuditTypes.length > 0) {
    const worst = worstAuditTypes[0];
    if (worst.complianceRate < 85) {
      negativeFindings.push(
        `Pior desempenho: ${worst.auditType} com ${worst.complianceRate}% de conformidade e ${worst.nonCompliantItems} não conformidades.`
      );
    }
  }
  if (nonCompliantItems > 0) {
    negativeFindings.push(`Total de ${nonCompliantItems} itens não conformes identificados no setor no período.`);
  }
  if (generalComplianceRate < 85) {
    negativeFindings.push(`Conformidade geral de ${generalComplianceRate}% está abaixo da meta institucional mínima (85%).`);
  }

  // Improvement priorities
  const improvementPriorities: string[] = [];
  worstAuditTypes.slice(0, 3).forEach((w) => {
    if (w.complianceRate < 85) {
      improvementPriorities.push(`Priorizar intervenção em ${w.auditType} (${w.complianceRate}%): plano de ação com responsável e reauditoria.`);
    }
  });
  if (topNonCompliances.length > 0) {
    improvementPriorities.push(
      `Focar nas NCs mais frequentes: ${topNonCompliances.slice(0, 2).map((n) => n.question.slice(0, 50)).join("; ")}.`
    );
  }
  if (improvementPriorities.length === 0) {
    improvementPriorities.push("Manter monitoramento contínuo e cronograma de reauditoria periódica.");
  }

  // Suggested action plan
  const prazo30 = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  })();

  const suggestedActionPlan: AuditActionPlanRecord[] = worstAuditTypes.slice(0, 5).map((w) => ({
    action: `Implantar plano de melhoria para ${w.auditType}`,
    reason: `Conformidade de ${w.complianceRate}% com ${w.nonCompliantItems} NC registradas`,
    responsible: "Gestor do setor + SCIH/CCIH",
    deadline: prazo30,
    how: "Capacitação, ajuste de processo, feedback individual e reauditoria",
    status: "sugerido" as const,
  }));

  return {
    totalAudits,
    totalAuditTypes,
    auditTypesIncluded,
    totalItems,
    compliantItems,
    nonCompliantItems,
    generalComplianceRate,
    complianceByAuditType,
    totalAuditsByType,
    nonCompliancesByAuditType,
    worstAuditTypes,
    bestAuditTypes,
    topNonCompliances,
    positiveFindings,
    negativeFindings,
    improvementPriorities,
    suggestedActionPlan,
    classification: classify(generalComplianceRate),
    statusColor: statusColor(generalComplianceRate),
    lowSampleAlert: totalAudits < 3,
  };
}
