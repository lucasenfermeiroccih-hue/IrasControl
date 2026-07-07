import type {
  AuditReportMetrics,
  AuditRecord,
  AuditItemRecord,
  MonthlySectorCompiledAuditMetrics,
} from "./auditReportTypes";
import { AUDIT_TYPE_LABELS, type AuditTypeKey } from "./auditReportTypes";

// ─── Shared helpers ───────────────────────────────────────────────────────────

export function getAuditTechnicalConcept(auditType: string): string {
  const n = auditType.toLowerCase();
  if (n.includes("higien") && (n.includes("mão") || n.includes("mao") || n.includes("hand"))) {
    return `A auditoria de higiene das mãos avalia a adesão dos profissionais aos cinco momentos preconizados pela OMS (antes do contato com o paciente, antes de procedimento asséptico, após risco de exposição a fluidos, após contato com o paciente e após contato com superfícies próximas), à técnica correta e à ausência de adornos. É uma das medidas mais eficazes para prevenção de IRAS, segurança do paciente e redução da transmissão cruzada de microrganismos. A baixa conformidade da higienização das mãos representa risco transversal de infecções em todos os tipos de assistência prestada, sendo indicador prioritário de qualidade assistencial e segurança do paciente.`;
  }
  if (n.includes("adorno")) {
    return `A auditoria de adornos avalia a presença ou ausência de acessórios (anéis, pulseiras, relógios, unhas compridas ou com esmalte) durante a assistência direta. Os adornos são obstáculos à técnica de higienização das mãos e reservatórios de microrganismos. Este indicador deve ser tratado de forma isolada e não deve ser incorporado ao cálculo da técnica de higienização das mãos, pois trata-se de uma barreira independente à segurança do paciente.`;
  }
  if (n.includes("higien") && n.includes("consumo")) {
    return `A auditoria de consumo de produtos de higienização das mãos avalia a disponibilidade, reposição adequada e utilização correta do álcool gel e sabonete líquido como estratégia complementar de monitoramento da adesão à higiene de mãos. A ausência ou falta de reposição dos dispensadores indica barreira direta à adesão e deve ser tratada como não conformidade crítica de processo.`;
  }
  if (n.includes("precau")) {
    return `A auditoria de precauções avalia a adesão às medidas de barreira (padrão, contato, gotículas e aerossóis), ao uso correto de EPIs, à sinalização de isolamento, ao fluxo de cuidado e à organização assistencial para reduzir o risco de transmissão de microrganismos no ambiente hospitalar. A falha na adesão às precauções representa risco direto de transmissão cruzada, surtos de microrganismos multirresistentes e ocorrências adversas graves. Deve ser avaliada conforme diretrizes ANVISA/CDC vigentes.`;
  }
  if (n.includes("limpeza") || (n.includes("higieniz") && n.includes("ambient"))) {
    return `A auditoria de limpeza e higienização ambiental avalia a execução correta das rotinas de limpeza, desinfecção de superfícies de alto toque, identificação de áreas críticas, disponibilidade de insumos, conformidade com técnica preconizada e registro das atividades. Não conformidades em limpeza devem ser analisadas pelo impacto na segurança ambiental: risco de permanência de matéria orgânica, falha na desinfecção de superfícies de alto toque (grades de leito, mesas, equipamentos) e risco de transmissão indireta de microrganismos para pacientes e profissionais.`;
  }
  if (n.includes("infection_control") || n.includes("controle de infecção")) {
    return `A auditoria de controle de infecção avalia as práticas assistenciais e ambientais voltadas à prevenção e controle das Infecções Relacionadas à Assistência à Saúde (IRAS), incluindo adesão a protocolos institucionais, uso de EPI, limpeza e desinfecção, higiene das mãos e precauções de isolamento. É um indicador abrangente da cultura de segurança do paciente no setor.`;
  }
  if (n.includes("bundle") || n.includes("pacote")) {
    return `A auditoria de bundles avalia a adesão ao conjunto de práticas baseadas em evidências para prevenção de infecções associadas a dispositivos invasivos (CVC, SVD, VM, IOT). A conformidade do bundle de CVC deve ser interpretada junto aos eventos de IPCSL: mesmo quando a conformidade global é adequada, a presença de IPCSL exige análise qualitativa da indicação diária, curativo, manipulação, validade do dispositivo e oportunidade de retirada precoce. Para o bundle de SVD, avalia-se indicação, técnica, sistema fechado, fixação, manutenção e oportunidade de retirada precoce, visando reduzir ITU associada a cateter.`;
  }
  if (n.includes("dispensador") || n.includes("dispenser")) {
    return `A auditoria de dispensadores de álcool gel avalia a disponibilidade, funcionalidade, posicionamento estratégico e reposição dos dispensadores de produto para higiene das mãos nos pontos de cuidado. Dispensadores ausentes, vazios ou com mau funcionamento representam barreira direta à prática de higiene das mãos e devem ser corrigidos imediatamente, conforme recomendações da OMS sobre ponto de cuidado.`;
  }
  if (n.includes("cti") || n.includes("uti") || n.includes("infraestr")) {
    return `A auditoria de infraestrutura CTI/UTI avalia as condições físicas, estruturais e operacionais das unidades críticas de terapia intensiva, incluindo número e funcionalidade de pias/dispensadores de higiene das mãos por leito, circulação de ar, equipamentos, barreiras de isolamento e organização do espaço assistencial. As não conformidades de infraestrutura impactam diretamente na capacidade do profissional de cumprir os protocolos de prevenção de IRAS.`;
  }
  if (n.includes("antibiogram") || n.includes("antimicro")) {
    return `A auditoria de antibiograma avalia a conformidade do uso de antimicrobianos com os protocolos institucionais, perfil de sensibilidade local, tempo de terapia, adequação de doses e descalonamento, como parte do Programa de Gerenciamento do Uso de Antimicrobianos (PGUA). O uso inadequado de antimicrobianos é fator de pressão seletiva para microrganismos multirresistentes e deve ser monitorado continuamente.`;
  }
  if (n.includes("obra") || n.includes("reform") || n.includes("constru")) {
    return `A auditoria de obras e reformas avalia o cumprimento das medidas de controle de infecção durante obras hospitalares, incluindo barreiras físicas adequadas, controle de poeira e aerossóis, ventilação da área de obra, circulação de trabalhadores, materiais e equipamentos, além da comunicação prévia e contínua com a CCIH, conforme RDC ANVISA e manuais de controle de infecção em obras.`;
  }
  return `A auditoria de processos avalia a conformidade das práticas assistenciais e operacionais em relação aos protocolos institucionais vigentes, permitindo identificar fragilidades, riscos assistenciais e oportunidades de melhoria contínua com base em evidências. Os resultados devem subsidiar o plano de ação do setor e as decisões gerenciais do gestor responsável.`;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function classifyText(pct: number): string {
  if (pct >= 95) return "O setor apresentou **desempenho excelente** no período, devendo manter rotina de vigilância, devolutiva e auditoria periódica para sustentação do resultado.";
  if (pct >= 85) return "O setor apresentou **bom desempenho**, porém ainda existem oportunidades de melhoria pontuais que devem ser tratadas com devolutiva direcionada e reauditoria.";
  if (pct >= 70) return "O setor apresentou **desempenho regular**, indicando necessidade de plano de melhoria estruturado, acompanhamento próximo e reforço do processo junto à equipe.";
  return "O setor apresentou **desempenho crítico**, com risco assistencial relevante. Recomenda-se **intervenção imediata**, feedback à equipe, plano de ação com responsável e reauditoria em curto prazo.";
}

function riskLevel(pct: number): string {
  if (pct >= 85) return "**BAIXO** — processos bem controlados.";
  if (pct >= 70) return "**MODERADO** — fragilidades identificadas que aumentam o risco de ocorrências adversas.";
  return "**ALTO** — conformidade crítica com risco assistencial relevante para os pacientes do setor.";
}

// ─── Single-type report ───────────────────────────────────────────────────────

function buildPositivePoints(metrics: AuditReportMetrics): string {
  const lines: string[] = [];
  const { topConformidades, conformidadePorCategoria, tendencia, totalAuditorias, conformidadeGeral } = metrics;

  if (topConformidades.length > 0) {
    lines.push(`- **Maiores índices de conformidade**: ${topConformidades.join(", ")} apresentaram os melhores resultados no período.`);
  }
  const perfeitos = Object.entries(conformidadePorCategoria).filter(([, v]) => v === 100);
  if (perfeitos.length > 0) {
    lines.push(`- **Conformidade total (100%)**: ${perfeitos.map(([k]) => k).join(", ")} atingiram 100% de conformidade.`);
  }
  if (tendencia === "Melhorando") {
    lines.push("- **Tendência positiva**: houve melhora no percentual de conformidade em relação ao período anterior.");
  }
  if (totalAuditorias >= 5) {
    lines.push(`- **Boa cobertura de auditoria**: foram realizadas ${totalAuditorias} auditorias no período, garantindo representatividade dos dados.`);
  }
  if (conformidadeGeral >= 85) {
    lines.push("- **Desempenho acima da meta institucional**: o setor superou o percentual mínimo de excelência (85%).`");
  }
  if (lines.length === 0) {
    lines.push("- Não foram identificados pontos positivos expressivos no período. Recomenda-se ampliar a cobertura de auditoria e retomar as boas práticas.");
  }
  return lines.join("\n");
}

function buildNegativePoints(metrics: AuditReportMetrics): string {
  const lines: string[] = [];
  const { topNaoConformidades, naoConformidadesPorCategoria, baixaAmostragem, qualidadeRegistro, tendencia } = metrics;

  if (topNaoConformidades.length > 0) {
    lines.push(`- **Principais não conformidades**:`);
    topNaoConformidades.slice(0, 5).forEach((nc, i) => {
      lines.push(`  ${i + 1}. ${nc}`);
    });
  }
  const critCats = Object.entries(naoConformidadesPorCategoria)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  if (critCats.length > 0) {
    lines.push(`- **Categorias com maior frequência de NC**: ${critCats.map(([k, v]) => `${k} (${v} NC)`).join(", ")}.`);
  }
  if (tendencia === "Piorando") {
    lines.push("- **Tendência negativa**: houve piora na conformidade em relação ao período anterior, indicando regressão nos processos.");
  }
  if (baixaAmostragem) {
    lines.push("- **Baixa amostragem**: o número de auditorias realizadas no período é insuficiente para garantir representatividade estatística. Recomenda-se ampliar a cobertura.");
  }
  if (qualidadeRegistro !== "Boa") {
    lines.push(`- **Qualidade do registro ${qualidadeRegistro.toLowerCase()}**: parte dos itens não conformes não possui observação do auditor, comprometendo a rastreabilidade e o plano de ação.`);
  }
  if (lines.length === 0) {
    lines.push("- Nenhum ponto crítico identificado no período. Manter vigilância contínua.");
  }
  return lines.join("\n");
}

function buildImprovements(metrics: AuditReportMetrics): { alta: string; media: string; baixa: string } {
  const { naoConformidadesPorCategoria, conformidadeGeral, baixaAmostragem } = metrics;
  const highNC = Object.entries(naoConformidadesPorCategoria)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([cat]) => cat);

  const alta =
    conformidadeGeral < 70
      ? `- Intervenção imediata nas não conformidades críticas identificadas.\n- Reauditoria em até 15 dias após implementação das ações corretivas.\n- Capacitação emergencial da equipe nos itens com maior frequência de falha${highNC.length ? ` (${highNC.join(", ")})` : ""}.`
      : highNC.length
      ? `- Priorizar resolução das não conformidades nas categorias ${highNC.join(" e ")}.\n- Estabelecer plano de ação com prazo máximo de 30 dias.`
      : "- Manter monitoramento sistemático dos itens com não conformidade recorrente.";

  const media = `- Reforçar treinamento periódico da equipe nos protocolos relacionados às NCs identificadas.\n- Implementar checklist de rotina como barreira preventiva.\n- Realizar feedback individual com os profissionais envolvidos.`;

  const baixa = baixaAmostragem
    ? "- Ampliar a frequência e cobertura das auditorias para garantir representatividade.\n- Padronizar o preenchimento das observações nos registros de auditoria."
    : "- Documentar boas práticas identificadas e disseminá-las para outros setores.\n- Manter cronograma de reauditoria para monitoramento contínuo.";

  return { alta, media, baixa };
}

function buildActionPlanRows(items: AuditItemRecord[], sectorName: string): string {
  const ncItems = items.filter((i) => i.status === "non_compliant").slice(0, 8);
  if (ncItems.length === 0)
    return "| Ampliar cobertura de auditoria | Garantir representatividade dos dados | Setor | Gestor do setor + SCIH/CCIH | 30 dias | Cronograma de auditorias | Sugerido |";

  const prazo = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  })();

  return ncItems
    .map((item) => {
      const o = (item.question.length > 55 ? item.question.slice(0, 54) + "…" : item.question).replace(/\|/g, "/");
      return `| Corrigir: ${o} | Reduzir NC e risco assistencial | ${sectorName || "Setor"} | Gestor + SCIH/CCIH | ${prazo} | Treinamento, adequação de processo e reauditoria | Sugerido |`;
    })
    .join("\n");
}

function buildComparison(metrics: AuditReportMetrics, previousAudits?: AuditRecord[]): string {
  if (!previousAudits || previousAudits.length === 0) {
    return "_Sem dados de período anterior disponíveis para comparação._";
  }
  const prevAvg = previousAudits.reduce((s, a) => s + (a.compliance_rate ?? 0), 0) / previousAudits.length;
  const prevAvgRounded = Math.round(prevAvg * 10) / 10;
  const diff = Math.round((metrics.conformidadeGeral - prevAvgRounded) * 10) / 10;
  const signal = diff >= 0 ? "+" : "";
  return `| Indicador | Período atual | Período anterior | Variação |\n|---|---|---|---|\n| Conformidade geral | ${metrics.conformidadeGeral}% | ${prevAvgRounded}% | ${signal}${diff}pp |\n| Total de auditorias | ${metrics.totalAuditorias} | ${previousAudits.length} | ${metrics.totalAuditorias - previousAudits.length > 0 ? "+" : ""}${metrics.totalAuditorias - previousAudits.length} |\n| Itens não conformes | ${metrics.itensNaoConformes} | — | — |`;
}

function buildRecommendations(metrics: AuditReportMetrics): string {
  const { conformidadeGeral, baixaAmostragem, tendencia, qualidadeRegistro } = metrics;
  const recs: string[] = [];

  if (conformidadeGeral >= 95) {
    recs.push("1. **Manutenção**: manter as boas práticas identificadas e promover a disseminação dos resultados para outros setores.");
    recs.push("2. **Vigilância contínua**: manter cronograma de auditorias regulares para sustentação dos resultados.");
    recs.push("3. **Reconhecimento**: valorizar a equipe pelo desempenho e estimular o protagonismo na segurança do paciente.");
  } else if (conformidadeGeral >= 85) {
    recs.push("1. **Ajustes pontuais**: implementar correções específicas nos itens identificados como não conformes.");
    recs.push("2. **Feedback individual**: realizar devolutiva com os profissionais sobre os resultados da auditoria.");
    recs.push("3. **Reauditoria em 60 dias**: programar nova auditoria para verificar evolução.");
  } else if (conformidadeGeral >= 70) {
    recs.push("1. **Plano de melhoria estruturado**: elaborar plano 5W2H com metas, responsáveis e prazos definidos.");
    recs.push("2. **Capacitação**: promover treinamento em serviço focado nas categorias com maior frequência de NC.");
    recs.push("3. **Supervisão reforçada**: aumentar a frequência de auditorias e monitoramento no próximo ciclo.");
    recs.push("4. **Reauditoria em 30 dias**: verificar efetividade das ações implementadas.");
  } else {
    recs.push("1. **INTERVENÇÃO IMEDIATA**: convocar reunião de crise com gestor do setor, equipe assistencial e CCIH para plano de ação emergencial.");
    recs.push("2. **Capacitação de emergência**: realizar treinamento imediato (24–48h) nos itens de maior risco assistencial.");
    recs.push("3. **Supervisão diária**: implementar auditoria diária até atingir conformidade ≥ 70%.");
    recs.push("4. **Comunicação à direção**: reportar situação crítica à direção assistencial com registro formal.");
    recs.push("5. **Reauditoria em 15 dias**: verificar impacto das ações corretivas.");
  }

  if (baixaAmostragem)
    recs.push(`${recs.length + 1}. **Amostragem**: ampliar o número de auditorias no próximo ciclo para garantir representatividade estatística.`);
  if (tendencia === "Piorando")
    recs.push(`${recs.length + 1}. **Regressão identificada**: investigar causas da piora em relação ao período anterior e agir sobre os fatores determinantes.`);
  if (qualidadeRegistro !== "Boa")
    recs.push(`${recs.length + 1}. **Qualidade de registro**: orientar auditores sobre o preenchimento completo das observações nas não conformidades para embasar o plano de ação.`);

  return recs.join("\n");
}

function buildPendencies(metrics: AuditReportMetrics): string {
  const lines: string[] = [];
  if (metrics.itensNaoConformes > 0)
    lines.push(`- [ ] Elaborar e implantar plano de ação para as ${metrics.itensNaoConformes} não conformidades identificadas.`);
  if (metrics.baixaAmostragem)
    lines.push("- [ ] Ampliar cobertura de auditoria no próximo ciclo (mínimo 3 auditorias por período).");
  if (metrics.qualidadeRegistro !== "Boa")
    lines.push("- [ ] Orientar auditores sobre preenchimento correto das observações nas NCs.");
  lines.push("- [ ] Apresentar resultados ao gestor do setor e à equipe assistencial.");
  lines.push("- [ ] Programar reauditoria para verificação das ações implantadas.");
  lines.push("- [ ] Registrar ciência do gestor e assinar documento.");
  return lines.join("\n");
}

function buildChartDiscussion(metrics: AuditReportMetrics, auditType: string): string {
  const worstCats = Object.entries(metrics.naoConformidadesPorCategoria)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2);
  const worstCatName = worstCats[0]?.[0] ?? "categoria crítica";
  const worstCatNc = worstCats[0]?.[1] ?? 0;

  const bestCats = Object.entries(metrics.conformidadePorCategoria)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 1);
  const bestCatName = bestCats[0]?.[0] ?? "categoria com melhor desempenho";

  return `### Discussão interpretativa dos gráficos

**Conformidade por categoria:** O gráfico demonstra que as maiores fragilidades estão concentradas em **${worstCatName}** (${worstCatNc} não conformidades). Esse resultado indica falha de processo que exige intervenção direcionada, feedback à equipe e reauditoria no próximo ciclo. A categoria **${bestCatName}** apresentou o melhor desempenho, indicando que existem processos bem estabelecidos que podem servir como modelo para as demais áreas.

**Tendência temporal:** ${metrics.tendencia === "Melhorando" ? "A evolução mensal demonstra trajetória positiva de conformidade, evidenciando o impacto das ações de melhoria implantadas." : metrics.tendencia === "Piorando" ? "A curva de tendência indica piora progressiva na conformidade, exigindo análise das causas e intervenção imediata." : "A curva de tendência demonstra estabilidade no período, sem melhora ou piora significativa — o que indica necessidade de novas estratégias para avançar nos indicadores."}

**Ranking de não conformidades:** Concentrar os esforços nas primeiras não conformidades do ranking permite resolver aproximadamente 80% do problema (Princípio de Pareto). A prioridade deve ser ${metrics.topNaoConformidades[0] ? `a correção de "${metrics.topNaoConformidades[0].slice(0, 80)}"` : "identificar e corrigir as NCs recorrentes"}.`;
}

export interface GenerateReportParams {
  hospitalName: string;
  sectorName: string;
  auditType: string;
  periodStart: string;
  periodEnd: string;
  managerName?: string;
  managerEmail?: string;
  technicalResponsible?: string;
  generatedAt: string;
  metrics: AuditReportMetrics;
  audits: AuditRecord[];
  items: AuditItemRecord[];
  actionPlans?: unknown[];
  previousAudits?: AuditRecord[];
  hospitalLogoUrl?: string | null;
  scihLogoUrls?: string[];
}

export function generateAuditManagerReportMarkdown(params: GenerateReportParams): string {
  const {
    hospitalName, sectorName, auditType, periodStart, periodEnd,
    managerName, managerEmail, technicalResponsible, generatedAt,
    metrics, audits, items, previousAudits,
    hospitalLogoUrl, scihLogoUrls,
  } = params;

  const {
    conformidadeGeral, classificacao, totalAuditorias, itensNaoConformes,
    itensConformes, totalItens, taxaNaoConformidade, totalProfissionaisObservados,
    totalAuditores, tendencia, baixaAmostragem, qualidadeRegistro,
  } = metrics;

  const principalPositivo = metrics.topConformidades[0] ?? "conformidade geral adequada";
  const principalNegativo = metrics.topNaoConformidades[0] ?? "não foram identificadas não conformidades expressivas";

  let prioridade = "vigilância contínua e manutenção das boas práticas";
  if (conformidadeGeral < 70) prioridade = "intervenção imediata e plano de ação de emergência";
  else if (conformidadeGeral < 85) prioridade = "implantação de plano de melhoria estruturado";
  else if (conformidadeGeral < 95) prioridade = "ajustes pontuais e capacitação da equipe";

  const conceitoTecnico = getAuditTechnicalConcept(auditType);
  const pontosPositivos = buildPositivePoints(metrics);
  const pontosNegativos = buildNegativePoints(metrics);
  const melhorias = buildImprovements(metrics);
  const planRows = buildActionPlanRows(items, sectorName);
  const comparativo = buildComparison(metrics, previousAudits);
  const recomendacoes = buildRecommendations(metrics);
  const pendencias = buildPendencies(metrics);
  const chartDiscussion = buildChartDiscussion(metrics, auditType);

  const obsAuditor = audits
    .filter((a) => a.observations?.trim())
    .slice(0, 5)
    .map((a, i) => `${i + 1}. _[${fmtDate(a.audit_date)} — ${a.sector ?? "Setor"}]_ ${a.observations}`)
    .join("\n");

  const tendenciaLabel = tendencia ?? "Sem histórico";
  const alertas: string[] = [];
  if (baixaAmostragem) alertas.push("> **Alerta:** Baixa amostragem — número de auditorias insuficiente para conclusões definitivas. Ampliar cobertura no próximo ciclo.");
  if (qualidadeRegistro !== "Boa") alertas.push(`> **Alerta:** Qualidade de registro ${qualidadeRegistro.toLowerCase()} — parte das NCs não possui observação do auditor.`);

  const logoHeader = buildLogoHeader(hospitalLogoUrl, scihLogoUrls);

  const riskMatrixRows = buildRiskMatrixRows(metrics);
  const teamAgenda = buildTeamAgenda(metrics, auditType);

  return `${logoHeader}# Relatório Gerencial de Auditorias do Setor

## 1. Identificação

| Campo | Informação |
|---|---|
| Hospital/Unidade | ${hospitalName || "—"} |
| Setor avaliado | ${sectorName || "Todos os setores"} |
| Tipo de auditoria | ${auditType || "Todos os tipos"} |
| Período analisado | ${fmtDate(periodStart)} a ${fmtDate(periodEnd)} |
| Gestor destinatário | ${managerName || "—"} |
| E-mail do gestor | ${managerEmail || "—"} |
| Responsável técnico | ${technicalResponsible || "—"} |
| Data de emissão | ${generatedAt} |

${alertas.length > 0 ? "\n" + alertas.join("\n") + "\n" : ""}
## 2. Sumário executivo

No período analisado, o setor **${sectorName || "avaliado"}** apresentou **${totalAuditorias} auditoria${totalAuditorias !== 1 ? "s" : ""} de processos**, com conformidade geral de **${conformidadeGeral}%**. O desempenho foi classificado como **${classificacao}**.

O principal ponto positivo identificado foi **${principalPositivo}**. A principal fragilidade encontrada foi **${principalNegativo}**.

A prioridade de intervenção para o próximo ciclo é **${prioridade}**.

Tendência em relação ao período comparativo: **${tendenciaLabel}**.

${classifyText(conformidadeGeral)}

## 3. Conceito técnico do indicador auditado

${conceitoTecnico}

## 4. Indicadores principais

| Indicador | Resultado |
|---|---:|
| Total de auditorias realizadas | ${totalAuditorias} |
| Total de itens avaliados | ${totalItens} |
| Itens conformes | ${itensConformes} |
| Itens não conformes | ${itensNaoConformes} |
| Itens não aplicáveis | ${items.filter(i => i.status === "not_applicable").length} |
| Conformidade geral | ${conformidadeGeral}% |
| Taxa de não conformidade | ${taxaNaoConformidade}% |
| Setores/profissionais observados | ${totalProfissionaisObservados} |
| Dias com auditoria registrada | ${totalAuditores} |
| Classificação do desempenho | ${classificacao} |

## 5. Discussão dos resultados

A análise dos dados evidencia que o setor **${sectorName || "avaliado"}** apresentou **conformidade de ${conformidadeGeral}%** no indicador de **${auditType}**. ${conformidadeGeral >= 95 ? "O resultado é excelente e demonstra comprometimento da equipe com os protocolos assistenciais." : conformidadeGeral >= 85 ? "O resultado é bom, mas existem oportunidades de melhoria que devem ser trabalhadas de forma estruturada." : conformidadeGeral >= 70 ? "O resultado é regular e indica fragilidades nos processos que precisam de atenção e intervenção planejada." : "O resultado é crítico e exige intervenção imediata, com plano de ação emergencial e reauditoria em curto prazo."}

**Conformidade por categoria:**
${Object.entries(metrics.conformidadePorCategoria).length > 0
  ? Object.entries(metrics.conformidadePorCategoria).sort(([, a], [, b]) => a - b).map(([cat, pct]) => `- **${cat}**: ${pct}%`).join("\n")
  : "_Sem dados por categoria no período._"}

**Principais não conformidades identificadas:**
${metrics.topNaoConformidades.length > 0
  ? metrics.topNaoConformidades.map((nc, i) => `${i + 1}. ${nc}`).join("\n")
  : "_Nenhuma não conformidade identificada no período._"}

## 6. Gráficos do relatório

> Os gráficos interativos estão disponíveis no painel analítico do sistema IRAS Control.

### 6.1 Conformidade geral no período

> Conformidade: **${conformidadeGeral}%** — Classificação: **${classificacao}**

### 6.2 Conformidade por categoria

${Object.entries(metrics.conformidadePorCategoria).length > 0
  ? Object.entries(metrics.conformidadePorCategoria).sort(([, a], [, b]) => b - a).map(([cat, pct]) => `- **${cat}**: ${pct}%`).join("\n")
  : "_Sem dados por categoria no período._"}

### 6.3 Distribuição por setor/profissional

${Object.entries(metrics.conformidadePorProfissao).length > 0
  ? Object.entries(metrics.conformidadePorProfissao).sort(([, a], [, b]) => b - a).map(([s, pct]) => `- **${s}**: ${pct}%`).join("\n")
  : "_Sem dados por setor no período._"}

### 6.4 Ranking das principais não conformidades

${metrics.topNaoConformidades.length > 0
  ? metrics.topNaoConformidades.map((nc, i) => `${i + 1}. ${nc}`).join("\n")
  : "_Nenhuma não conformidade identificada._"}

### 6.5 Evolução mensal

> Tendência: **${tendenciaLabel}** — Visualize o gráfico de linha no painel do IRAS Control.

### 6.6 Mapa de calor setor × item auditado

> Visualize no painel analítico para identificação cruzada dos pontos críticos.

${chartDiscussion}

## Matriz de risco assistencial

| Risco | Evidência encontrada | Impacto possível | Prioridade |
|---|---|---|---|
${riskMatrixRows}

## Pauta sugerida para reunião com equipe

${teamAgenda}

## 7. Pontos positivos

${pontosPositivos}

## 8. Pontos negativos

${pontosNegativos}

## 9. Pontos de melhoria

### 9.1 Prioridade alta

${melhorias.alta}

### 9.2 Prioridade média

${melhorias.media}

### 9.3 Prioridade baixa

${melhorias.baixa}

## 10. Principais não conformidades

| Categoria | Item auditado | Nº de ocorrências | Impacto esperado |
|---|---|---:|---|
${buildTopNcTable(items)}

## 11. Análise de causa provável

As não conformidades identificadas têm como causas prováveis:

${metrics.topNaoConformidades.length > 0
  ? metrics.topNaoConformidades.slice(0, 3).map((nc) =>
      `- **${nc.length > 60 ? nc.slice(0, 59) + "…" : nc}**: possível falha de processo, lacuna de capacitação ou inadequação de infraestrutura.`
    ).join("\n")
  : "- Não foram identificadas causas prováveis no período."}

Recomenda-se utilizar o Diagrama de Ishikawa (6M) para aprofundamento da análise de causa raiz.

## 12. Risco assistencial

Nível de risco: ${riskLevel(conformidadeGeral)}

${itensNaoConformes > 0 ? `Foram identificados **${itensNaoConformes} itens não conformes** no período, que devem ser endereçados no plano de ação.` : ""}

## 13. Observações relevantes dos auditores

${obsAuditor || "_Nenhuma observação registrada pelos auditores no período._"}

## 14. Comparativo com período anterior

${comparativo}

## 15. Plano de melhoria 5W2H

| O que será feito? | Por quê? | Onde? | Quem? | Quando? | Como? | Status |
|---|---|---|---|---|---|---|
${planRows}

## 16. Recomendações ao gestor do setor

${recomendacoes}

## 17. Metas para o próximo ciclo

${buildNextCycleGoals(metrics)}

## 18. Pendências e encaminhamentos

${pendencias}

## 19. Conclusão

Conclui-se que o setor **${sectorName || "avaliado"}** apresenta desempenho **${classificacao}** no processo auditado, com conformidade geral de **${conformidadeGeral}%**.

${conformidadeGeral >= 85
  ? `Os resultados demonstram comprometimento da equipe com as boas práticas assistenciais. As ${itensNaoConformes} não conformidades identificadas devem ser corrigidas para sustentação dos resultados e alcance da excelência.`
  : `Apesar dos pontos positivos identificados, as não conformidades relacionadas a **${principalNegativo}** devem ser priorizadas pelo gestor, com implantação de plano de ação, monitoramento sistemático e reauditoria no próximo ciclo.`}

Este relatório foi emitido com base nos dados registrados no sistema IRAS Control e destina-se ao uso interno do hospital/unidade para fins de melhoria da qualidade assistencial e prevenção de IRAS.

## 20. Ciência do gestor

| Responsável | Nome | Assinatura/Data |
|---|---|---|
| Gestor do setor | ${managerName || "___________________"} |  |
| SCIH/CCIH | ${technicalResponsible || "___________________"} |  |
| Direção assistencial |  |  |

---
_Relatório gerado automaticamente pelo sistema IRAS Control em ${generatedAt}._
`;
}

// ─── Monthly compiled report ──────────────────────────────────────────────────

export interface GenerateCompiledReportParams {
  hospitalName: string;
  sectorName: string;
  periodStart: string;
  periodEnd: string;
  managerName?: string;
  managerEmail?: string;
  technicalResponsible?: string;
  generatedAt: string;
  metrics: MonthlySectorCompiledAuditMetrics;
  audits: AuditRecord[];
  items: AuditItemRecord[];
  hospitalLogoUrl?: string | null;
  scihLogoUrls?: string[];
}

export function generateMonthlyCompiledReportMarkdown(params: GenerateCompiledReportParams): string {
  const {
    hospitalName, sectorName, periodStart, periodEnd,
    managerName, managerEmail, technicalResponsible, generatedAt,
    metrics, audits, items,
    hospitalLogoUrl, scihLogoUrls,
  } = params;

  const {
    totalAudits, totalAuditTypes, auditTypesIncluded,
    totalItems, compliantItems, nonCompliantItems, generalComplianceRate,
    complianceByAuditType, totalAuditsByType,
    worstAuditTypes, bestAuditTypes, topNonCompliances,
    positiveFindings, negativeFindings, improvementPriorities,
    suggestedActionPlan, classification, lowSampleAlert,
  } = metrics;

  const logoHeader = buildLogoHeader(hospitalLogoUrl, scihLogoUrls);

  const alertas: string[] = [];
  if (lowSampleAlert) alertas.push("> **Alerta:** Baixa amostragem — número de auditorias insuficiente para conclusões definitivas. Ampliar cobertura no próximo ciclo.");

  // Compliance table per audit type
  const tableComplianceByAuditType = [
    "| Tipo de auditoria | Auditorias realizadas | Conformidade | Classificação |",
    "|---|---:|---:|---|",
    ...Object.entries(complianceByAuditType)
      .sort(([, a], [, b]) => a - b)
      .map(([type, rate]) => {
        const count = totalAuditsByType[type] ?? 0;
        const cls = rate >= 95 ? "Excelente" : rate >= 85 ? "Bom" : rate >= 70 ? "Regular" : "Crítico";
        return `| ${type} | ${count} | ${rate}% | ${cls} |`;
      }),
  ].join("\n");

  // Top NC table
  const topNcRows = topNonCompliances.slice(0, 10).map((nc) =>
    `| ${nc.auditType} | ${nc.category} | ${nc.question.slice(0, 60)}${nc.question.length > 60 ? "…" : ""} | ${nc.count} |`
  ).join("\n");

  // Action plan rows
  const prazo30 = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  })();

  const actionPlanRows = suggestedActionPlan.map((ap) =>
    `| ${ap.action} | ${ap.reason} | ${sectorName || "Setor"} | ${ap.responsible} | ${ap.deadline || prazo30} | ${ap.how} | ${ap.status} |`
  ).join("\n");

  // Per-audit-type discussion
  const auditTypeDiscussions = buildAuditTypeDiscussions(audits, items, complianceByAuditType, totalAuditsByType);

  // Risk matrix
  const riskMatrix = buildCompiledRiskMatrix(metrics);

  return `${logoHeader}# Relatório Mensal Compilado de Auditorias do Gestor

## 1. Identificação

| Campo | Informação |
|---|---|
| Hospital/Unidade | ${hospitalName || "—"} |
| Setor avaliado | ${sectorName || "Todos os setores"} |
| Período analisado | ${fmtDate(periodStart)} a ${fmtDate(periodEnd)} |
| Gestor destinatário | ${managerName || "—"} |
| E-mail do gestor | ${managerEmail || "—"} |
| Responsável técnico | ${technicalResponsible || "—"} |
| Data de emissão | ${generatedAt} |

${alertas.length > 0 ? "\n" + alertas.join("\n") + "\n" : ""}
## 2. Sumário executivo

No período analisado, o setor **${sectorName || "avaliado"}** realizou **${totalAudits} auditoria${totalAudits !== 1 ? "s" : ""}**, distribuídas em **${totalAuditTypes} tipo${totalAuditTypes !== 1 ? "s" : ""} de auditoria**.

Foram avaliados **${totalItems} itens**, com **${compliantItems} conformes** e **${nonCompliantItems} não conformes**, resultando em conformidade geral de **${generalComplianceRate}%**.

O desempenho geral do setor no período foi classificado como **${classification}**.

${classifyText(generalComplianceRate)}

**Auditorias incluídas:**
${auditTypesIncluded.map((t) => `- ${t} (${totalAuditsByType[t] ?? 0} auditoria${(totalAuditsByType[t] ?? 0) !== 1 ? "s" : ""})`).join("\n")}

## 3. Painel consolidado do setor

| Indicador | Resultado |
|---|---:|
| Total de auditorias realizadas | ${totalAudits} |
| Tipos de auditoria realizados | ${totalAuditTypes} |
| Total de itens avaliados | ${totalItems} |
| Itens conformes | ${compliantItems} |
| Itens não conformes | ${nonCompliantItems} |
| Conformidade geral do setor | ${generalComplianceRate}% |
| Classificação | ${classification} |

## 4. Conformidade por tipo de auditoria

${tableComplianceByAuditType}

## 5. Contexto geral do setor

No período de **${fmtDate(periodStart)} a ${fmtDate(periodEnd)}**, o setor **${sectorName || "avaliado"}** demonstrou ampla cobertura de auditoria com ${totalAuditTypes} tipos de indicadores monitorados. ${generalComplianceRate >= 85 ? `A conformidade geral de ${generalComplianceRate}% indica que o setor mantém boas práticas assistenciais, com oportunidades de melhoria concentradas em tipos de auditoria específicos.` : `A conformidade geral de ${generalComplianceRate}% indica que o setor necessita de intervenção estruturada, com prioridade para os tipos de auditoria com pior desempenho.`}

${worstAuditTypes.length > 0 && worstAuditTypes[0].complianceRate < 85 ? `A auditoria com pior desempenho foi **${worstAuditTypes[0].auditType}** (${worstAuditTypes[0].complianceRate}%), que representa a principal oportunidade de melhoria do setor neste período.` : ""}

${bestAuditTypes.length > 0 ? `A auditoria com melhor desempenho foi **${bestAuditTypes[0].auditType}** (${bestAuditTypes[0].complianceRate}%), indicando processo bem controlado que pode servir como referência.` : ""}

## 6. Discussão por tipo de auditoria

${auditTypeDiscussions}

## 7. Discussão integrada do setor

${buildIntegratedDiscussion(metrics, sectorName)}

## 8. Gráficos consolidados

> Os gráficos interativos estão disponíveis no painel analítico do sistema IRAS Control.

### 8.1 Conformidade por tipo de auditoria

${Object.entries(complianceByAuditType).sort(([, a], [, b]) => a - b).map(([t, r]) => `- **${t}**: ${r}%`).join("\n")}

### 8.2 Ranking das auditorias com pior desempenho

${worstAuditTypes.length > 0 ? worstAuditTypes.map((w, i) => `${i + 1}. **${w.auditType}**: ${w.complianceRate}% (${w.nonCompliantItems} NCs)`).join("\n") : "_Sem auditorias críticas no período._"}

### 8.3 Principais não conformidades do setor

${topNonCompliances.slice(0, 5).map((nc, i) => `${i + 1}. [${nc.auditType}] ${nc.question.slice(0, 70)} — ${nc.count} ocorrência${nc.count !== 1 ? "s" : ""}`).join("\n")}

### 8.4 Evolução mensal do setor

> Visualize o gráfico de tendência no painel do IRAS Control.

## 9. Pontos positivos do setor

${positiveFindings.map((f) => `- ${f}`).join("\n")}

## 10. Pontos negativos do setor

${negativeFindings.map((f) => `- ${f}`).join("\n")}

## 11. Pontos de melhoria prioritários

${improvementPriorities.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## 12. Principais não conformidades consolidadas

| Auditoria | Categoria | Item | Ocorrências |
|---|---|---|---:|
${topNcRows || "| — | — | Nenhuma NC identificada | — |"}

## 13. Matriz de risco assistencial do setor

| Risco | Evidência encontrada | Impacto possível | Prioridade |
|---|---|---|---|
${riskMatrix}

## 14. Plano de ação consolidado 5W2H

| O quê | Por quê | Onde | Quem | Quando | Como | Status |
|---|---|---|---|---|---|---|
${actionPlanRows || `| Ampliar cobertura de auditoria | Garantir representatividade | ${sectorName || "Setor"} | Gestor + SCIH/CCIH | ${prazo30} | Cronograma de auditorias | Sugerido |`}

## 15. Pauta sugerida para reunião com equipe

1. Apresentar resultado geral do mês — conformidade de **${generalComplianceRate}%** (${classification}).
2. Discutir auditorias com pior desempenho: ${worstAuditTypes.slice(0, 3).map((w) => `${w.auditType} (${w.complianceRate}%)`).join(", ") || "—"}.
3. Discutir as **${nonCompliantItems} não conformidades** identificadas no setor.
4. Definir responsáveis pelo plano de ação consolidado.
5. Definir prazo de reauditoria: recomenda-se em **30 dias** para tipos críticos.
6. Registrar ciência da equipe e do gestor.

## 16. Recomendações ao gestor

${buildCompiledRecommendations(metrics)}

## 17. Metas para o próximo mês

${buildCompiledNextMonthGoals(metrics)}

## 18. Conclusão

Conclui-se que o setor **${sectorName || "avaliado"}** apresentou no período um resultado **${classification}** (${generalComplianceRate}% de conformidade geral), com ${totalAuditTypes} tipos de auditoria realizados.

${generalComplianceRate >= 85 ? "O setor demonstra comprometimento com a segurança do paciente e as boas práticas assistenciais." : "São necessárias ações estruturadas de melhoria, com foco nos tipos de auditoria com pior desempenho e nas não conformidades mais frequentes."}

**Mensagem ao gestor:** Os dados deste relatório devem ser utilizados como ferramenta de gestão do setor. Os pontos críticos precisam ser transformados em ação prática, com responsável, prazo e reauditoria. O objetivo não é apenas registrar não conformidades, mas reduzir risco assistencial e melhorar a segurança do paciente.

## 19. Ciência do gestor

| Responsável | Nome | Assinatura/Data |
|---|---|---|
| Gestor do setor | ${managerName || "___________________"} |  |
| Responsável técnico | ${technicalResponsible || "___________________"} |  |
| Direção/Coordenação |  |  |

---
_Relatório compilado gerado automaticamente pelo sistema IRAS Control em ${generatedAt}._
`;
}

// ─── Shared builders ──────────────────────────────────────────────────────────

function buildLogoHeader(hospitalLogoUrl?: string | null, scihLogoUrls?: string[]): string {
  if (!hospitalLogoUrl && (!scihLogoUrls || scihLogoUrls.length === 0)) return "";
  const lines: string[] = [];
  if (hospitalLogoUrl) lines.push(`![Logo do Hospital](${hospitalLogoUrl})`);
  if (scihLogoUrls?.length) scihLogoUrls.forEach((url) => lines.push(`![Logo SCIH](${url})`));
  return lines.join("   ") + "\n\n";
}

function buildTopNcTable(items: AuditItemRecord[]): string {
  const ncCount: Record<string, { count: number; category: string }> = {};
  items.filter((i) => i.status === "non_compliant").forEach((i) => {
    const key = i.question;
    if (!ncCount[key]) ncCount[key] = { count: 0, category: i.category ?? "Geral" };
    ncCount[key].count++;
  });
  const sorted = Object.entries(ncCount).sort(([, a], [, b]) => b.count - a.count).slice(0, 8);
  if (sorted.length === 0) return "| — | — | 0 | — |";
  return sorted
    .map(([q, v]) => {
      const truncQ = q.length > 55 ? q.slice(0, 54) + "…" : q;
      const impact = v.count >= 5 ? "Alto" : v.count >= 3 ? "Moderado" : "Baixo";
      return `| ${v.category} | ${truncQ} | ${v.count} | ${impact} |`;
    })
    .join("\n");
}

function buildNextCycleGoals(metrics: AuditReportMetrics): string {
  const { conformidadeGeral, totalAuditorias, itensNaoConformes } = metrics;
  const targetRate = Math.min(100, Math.ceil(conformidadeGeral / 5) * 5 + (conformidadeGeral < 95 ? 5 : 0));
  const lines: string[] = [
    `1. **Meta de conformidade**: atingir **${targetRate}%** de conformidade na próxima auditoria${conformidadeGeral < 85 ? " como passo intermediário" : ""}.`,
    `2. **Frequência de auditoria**: realizar no mínimo **${Math.max(3, totalAuditorias)}** auditorias no próximo ciclo.`,
  ];
  if (itensNaoConformes > 0) lines.push(`3. **Redução de NCs**: reduzir as não conformidades em pelo menos **50%** (de ${itensNaoConformes} para ${Math.ceil(itensNaoConformes / 2)}).`);
  lines.push("4. **Plano de ação**: implantar e monitorar as ações do plano 5W2H definido.");
  lines.push("5. **Feedback à equipe**: realizar devolutiva dos resultados à equipe assistencial no próximo ciclo.");
  return lines.join("\n");
}

function buildRiskMatrixRows(metrics: AuditReportMetrics): string {
  const rows: string[] = [];
  const { conformidadeGeral, topNaoConformidades, naoConformidadesPorCategoria } = metrics;

  if (conformidadeGeral < 70) rows.push("| Conformidade crítica | Conformidade abaixo de 70% | Risco aumentado de IRAS e eventos adversos | ALTA |");
  if (topNaoConformidades[0]) rows.push(`| NC recorrente | "${topNaoConformidades[0].slice(0, 50)}..." | Falha continuada de processo | ALTA |`);
  const worstCat = Object.entries(naoConformidadesPorCategoria).sort(([, a], [, b]) => b - a)[0];
  if (worstCat) rows.push(`| Categoria crítica | ${worstCat[0]} com ${worstCat[1]} NCs | Vulnerabilidade de processo específico | MODERADA |`);
  if (rows.length === 0) rows.push("| Risco geral | Conformidade adequada | Baixo risco assistencial identificado | BAIXA |");
  return rows.join("\n");
}

function buildTeamAgenda(metrics: AuditReportMetrics, auditType: string): string {
  return `1. Apresentar resultado da auditoria de ${auditType}: **${metrics.conformidadeGeral}%** de conformidade (${metrics.classificacao}).
2. Discutir as **${metrics.itensNaoConformes} não conformidades** identificadas no período.
3. Apresentar e validar o plano de ação 5W2H com a equipe.
4. Definir responsáveis por cada ação corretiva.
5. Definir data de reauditoria${metrics.conformidadeGeral < 70 ? " (urgente — máximo 15 dias)" : metrics.conformidadeGeral < 85 ? " (em até 30 dias)" : " (em até 60 dias)"}.
6. Registrar ciência e assinatura da equipe.`;
}

function buildAuditTypeDiscussions(
  audits: AuditRecord[],
  items: AuditItemRecord[],
  complianceByAuditType: Record<string, number>,
  totalAuditsByType: Record<string, number>
): string {
  const sections: string[] = [];

  Object.entries(complianceByAuditType).forEach(([label, rate]) => {
    const typeAudits = audits.filter((a) => {
      const al = AUDIT_TYPE_LABELS[a.audit_type as AuditTypeKey] ?? a.audit_type;
      return al === label;
    });
    const typeItems = items.filter((i) => typeAudits.some((a) => a.id === i.audit_id));
    const ncItems = typeItems.filter((i) => i.status === "non_compliant");
    const confItems = typeItems.filter((i) => i.status === "compliant");
    const count = totalAuditsByType[label] ?? 0;

    const mainNc = ncItems.reduce((acc: Record<string, number>, i) => {
      acc[i.question] = (acc[i.question] ?? 0) + 1;
      return acc;
    }, {});
    const topNc = Object.entries(mainNc).sort(([, a], [, b]) => b - a)[0];

    const mainConf = confItems.reduce((acc: Record<string, number>, i) => {
      acc[i.question] = (acc[i.question] ?? 0) + 1;
      return acc;
    }, {});
    const topConf = Object.entries(mainConf).sort(([, a], [, b]) => b - a)[0];

    const cls = rate >= 95 ? "Excelente" : rate >= 85 ? "Bom" : rate >= 70 ? "Regular" : "Crítico";
    const action = rate >= 95 ? "Manter vigilância e cronograma de reauditoria."
      : rate >= 85 ? "Tratar pontualmente as NCs identificadas com feedback individual e reauditoria em 60 dias."
      : rate >= 70 ? "Elaborar plano de ação estruturado e reauditar em 30 dias."
      : "INTERVENÇÃO IMEDIATA: capacitação emergencial, supervisão intensificada e reauditoria em 15 dias.";

    sections.push(`### ${label}

Foram realizadas **${count} auditoria${count !== 1 ? "s" : ""}** de **${label}**, com conformidade de **${rate}%** (${cls}).

${topConf ? `A principal conformidade observada foi: _"${topConf[0].slice(0, 80)}"_.` : ""}
${topNc ? `A principal não conformidade observada foi: _"${topNc[0].slice(0, 80)}"_ (${topNc[1]} ocorrência${topNc[1] !== 1 ? "s" : ""}).` : "Nenhuma não conformidade registrada neste tipo."}

${getAuditTechnicalConcept(label).split(".").slice(0, 2).join(".") + "."}

**Ação recomendada:** ${action}`);
  });

  return sections.join("\n\n");
}

function buildIntegratedDiscussion(metrics: MonthlySectorCompiledAuditMetrics, sectorName: string): string {
  const mainRiskArea = metrics.worstAuditTypes[0]?.auditType ?? "auditoria crítica";
  const positiveArea = metrics.bestAuditTypes[0]?.auditType ?? "auditoria com melhor resultado";
  const criticalArea = metrics.worstAuditTypes[0]?.auditType ?? "área de maior risco";

  return `Quando analisadas em conjunto, as auditorias do setor **${sectorName || "avaliado"}** demonstram que a fragilidade predominante está em **${mainRiskArea}**, que apresentou a menor conformidade no período e o maior número de não conformidades.

Embora existam bons resultados em **${positiveArea}**, as não conformidades em **${criticalArea}** exigem atuação prioritária do gestor e da equipe assistencial. A análise integrada indica que ${metrics.generalComplianceRate >= 85 ? "o setor tem capacidade de manutenção de boas práticas, mas precisa direcionar esforços específicos para os indicadores mais frágeis" : "existe uma oportunidade de melhoria sistêmica que requer plano de ação abrangente, com envolvimento de todos os profissionais do setor"}.

O cruzamento entre os tipos de auditoria permite identificar se as não conformidades são **isoladas** (problema específico de um indicador) ou **sistêmicas** (indicam falha de processo transversal, como capacitação insuficiente, infraestrutura inadequada ou cultura organizacional). ${metrics.nonCompliantItems > 10 ? "O volume de não conformidades sugere que existem fatores sistêmicos a serem endereçados." : "O volume de não conformidades indica problemas pontuais e tratáveis com intervenção direcionada."}`;
}

function buildCompiledRiskMatrix(metrics: MonthlySectorCompiledAuditMetrics): string {
  const rows: string[] = [];
  metrics.worstAuditTypes.slice(0, 3).forEach((w) => {
    if (w.complianceRate < 85) {
      const priority = w.complianceRate < 70 ? "ALTA" : "MODERADA";
      rows.push(`| Baixa conformidade em ${w.auditType} | ${w.complianceRate}% de conformidade, ${w.nonCompliantItems} NCs | Risco assistencial aumentado | ${priority} |`);
    }
  });
  if (metrics.nonCompliantItems > 10) rows.push(`| Alto volume de NCs | ${metrics.nonCompliantItems} itens não conformes no setor | Risco sistêmico de qualidade assistencial | ALTA |`);
  if (metrics.lowSampleAlert) rows.push("| Baixa amostragem | Número insuficiente de auditorias | Resultados sem representatividade estatística | MODERADA |");
  if (rows.length === 0) rows.push("| Risco geral | Conformidade adequada em todos os tipos | Baixo risco assistencial identificado | BAIXA |");
  return rows.join("\n");
}

function buildCompiledRecommendations(metrics: MonthlySectorCompiledAuditMetrics): string {
  const recs: string[] = [];
  const { generalComplianceRate, worstAuditTypes, lowSampleAlert } = metrics;

  if (generalComplianceRate >= 95) {
    recs.push("1. **Manutenção da excelência**: valorizar a equipe e manter cronograma de auditorias regulares.");
    recs.push("2. **Disseminação de boas práticas**: compartilhar os resultados positivos com outros setores.");
    recs.push("3. **Vigilância contínua**: manter cobertura de todos os tipos de auditoria mensalmente.");
  } else if (generalComplianceRate >= 85) {
    recs.push("1. **Ajustes pontuais**: focar nos tipos de auditoria com conformidade abaixo de 90%.");
    recs.push("2. **Feedback dirigido**: realizar devolutiva individualizada para as equipes com mais NCs.");
    recs.push("3. **Reauditoria em 60 dias**: verificar evolução dos indicadores mais frágeis.");
  } else if (generalComplianceRate >= 70) {
    recs.push("1. **Plano de ação estruturado**: elaborar 5W2H para cada tipo de auditoria abaixo de 85%.");
    recs.push("2. **Capacitação direcionada**: treinar a equipe nas áreas com mais NCs identificadas.");
    recs.push("3. **Supervisão reforçada**: aumentar frequência de monitoramento nos próximos 30 dias.");
    recs.push("4. **Reauditoria em 30 dias**: verificar efetividade das ações implantadas.");
  } else {
    recs.push("1. **INTERVENÇÃO IMEDIATA**: convocar reunião de crise com gestor, equipe e CCIH.");
    recs.push("2. **Plano de ação emergencial**: elaborar 5W2H para os tipos críticos com prazo de 15 dias.");
    recs.push("3. **Supervisão diária**: monitoramento intensivo até atingir conformidade ≥ 70%.");
    recs.push("4. **Comunicação à direção**: reportar situação crítica com registro formal.");
    recs.push("5. **Reauditoria em 15 dias**: verificar impacto das ações corretivas.");
  }

  if (worstAuditTypes.length > 0 && worstAuditTypes[0].complianceRate < 70) {
    recs.push(`${recs.length + 1}. **Prioridade crítica**: ${worstAuditTypes[0].auditType} com ${worstAuditTypes[0].complianceRate}% — requer atenção imediata e reauditoria em curto prazo.`);
  }
  if (lowSampleAlert) recs.push(`${recs.length + 1}. **Amostragem**: ampliar o número de auditorias no próximo ciclo para garantir representatividade.`);

  return recs.join("\n");
}

function buildCompiledNextMonthGoals(metrics: MonthlySectorCompiledAuditMetrics): string {
  const target = Math.min(100, Math.ceil(metrics.generalComplianceRate / 5) * 5 + 5);
  return `1. **Meta de conformidade geral**: atingir **${target}%** de conformidade no setor.
2. **Manter cobertura**: realizar auditorias de todos os **${metrics.totalAuditTypes} tipos** monitorados este mês.
3. **Redução de NCs**: reduzir não conformidades em pelo menos **50%** nos tipos críticos.
4. **Implantar plano de ação**: executar todas as ações 5W2H definidas neste relatório.
5. **Devolutiva à equipe**: apresentar os resultados deste relatório à equipe assistencial na próxima reunião.
6. **Reauditoria**: programar reauditoria prioritária para ${metrics.worstAuditTypes[0]?.auditType ?? "os tipos críticos"}.`;
}
