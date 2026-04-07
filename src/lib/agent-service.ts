import { supabase } from "@/integrations/supabase/client";

// === Types ===

export type AgentPlan = "free" | "pro" | "enterprise";

export interface Agent {
  id: string;
  name: string;
  description: string;
  icon: string; // emoji
  category: "analysis" | "reports" | "alerts" | "decision";
  requiredPlan: AgentPlan;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  agentId: string;
  messages: ChatMessage[];
  createdAt: string;
}

// === Agent catalog ===

export const AI_AGENTS: Agent[] = [
  {
    id: "trend-analyst",
    name: "Analista de Tendências",
    description: "Identifica padrões temporais em dados de IRAS, revelando sazonalidades e tendências de infecção.",
    icon: "📈",
    category: "analysis",
    requiredPlan: "free",
  },
  {
    id: "risk-detector",
    name: "Detector de Fatores de Risco",
    description: "Calcula scores de risco por paciente e unidade, priorizando intervenções preventivas.",
    icon: "🎯",
    category: "analysis",
    requiredPlan: "free",
  },
  {
    id: "report-generator",
    name: "Gerador de Relatórios Automatizados",
    description: "Gera KPIs diários, semanais e mensais em formato PDF/Excel automaticamente.",
    icon: "📊",
    category: "reports",
    requiredPlan: "pro",
  },
  {
    id: "outbreak-alert",
    name: "Alerta de Surtos",
    description: "Detecta anomalias estatísticas via Z-score para alertar possíveis surtos em tempo real.",
    icon: "🚨",
    category: "alerts",
    requiredPlan: "pro",
  },
  {
    id: "intervention-suggester",
    name: "Sugestor de Intervenções",
    description: "Recomenda ações baseadas em guidelines da ANVISA e CDC para controle de infecções.",
    icon: "💡",
    category: "decision",
    requiredPlan: "free",
  },
  {
    id: "dashboard-interpreter",
    name: "Interpretador de Dashboards",
    description: "Transforma gráficos e dados em explicações claras em linguagem natural.",
    icon: "🧠",
    category: "analysis",
    requiredPlan: "pro",
  },
  {
    id: "form-validator",
    name: "Validador de Formulários",
    description: "Verifica consistência dos formulários e sugere auto-preenchimento inteligente.",
    icon: "✅",
    category: "decision",
    requiredPlan: "free",
  },
  {
    id: "anvisa-report",
    name: "Relatórios Técnicos ANVISA e Vigilância de ISC",
    description: "Gera relatórios técnicos formatados conforme padrões ANVISA para vigilância de ISC.",
    icon: "📋",
    category: "reports",
    requiredPlan: "enterprise",
  },
  {
    id: "micro-report",
    name: "Relatórios Microbiológicos Integrados",
    description: "Consolida dados microbiológicos de múltiplas fontes em relatórios integrados.",
    icon: "🔬",
    category: "reports",
    requiredPlan: "enterprise",
  },
  {
    id: "quick-decision",
    name: "Tomada de Decisão Rápida",
    description: "Fornece suporte para decisões clínicas urgentes com base em dados e protocolos atualizados.",
    icon: "⚡",
    category: "decision",
    requiredPlan: "pro",
  },
];

// === Mock user plan (simulated) ===

const PLAN_KEY = "user_plan";

export function getUserPlan(): AgentPlan {
  return (localStorage.getItem(PLAN_KEY) as AgentPlan) || "free";
}

export function setUserPlan(plan: AgentPlan) {
  localStorage.setItem(PLAN_KEY, plan);
}

export function canAccessAgent(agent: Agent): boolean {
  const plan = getUserPlan();
  const hierarchy: Record<AgentPlan, number> = { free: 0, pro: 1, enterprise: 2 };
  return hierarchy[plan] >= hierarchy[agent.requiredPlan];
}

// === Chat sessions (localStorage) ===

const SESSIONS_KEY = "ai_chat_sessions";

function getSessions(): ChatSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSessions(sessions: ChatSession[]) {
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export function getOrCreateSession(agentId: string): ChatSession {
  const sessions = getSessions();
  let session = sessions.find((s) => s.agentId === agentId);
  if (!session) {
    session = {
      id: crypto.randomUUID(),
      agentId,
      messages: [],
      createdAt: new Date().toISOString(),
    };
    sessions.push(session);
    saveSessions(sessions);
  }
  return session;
}

export function addMessage(sessionId: string, role: "user" | "assistant", content: string): ChatMessage {
  const sessions = getSessions();
  const session = sessions.find((s) => s.id === sessionId);
  if (!session) throw new Error("Session not found");
  const msg: ChatMessage = {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
  session.messages.push(msg);
  saveSessions(sessions);
  return msg;
}

export function getSessionMessages(sessionId: string): ChatMessage[] {
  const sessions = getSessions();
  return sessions.find((s) => s.id === sessionId)?.messages || [];
}

export function clearSession(agentId: string) {
  const sessions = getSessions().filter((s) => s.agentId !== agentId);
  saveSessions(sessions);
}

// === Mock n8n responses ===

const MOCK_RESPONSES: Record<string, (input: string) => string> = {
  "trend-analyst": (input) =>
    `## Análise de Tendências\n\nCom base na sua consulta: *"${input.slice(0, 80)}"*\n\n### Padrões Identificados\n- **Tendência ascendente** em infecções de corrente sanguínea no último trimestre (+12%)\n- **Sazonalidade** detectada: picos em meses de inverno (junho-agosto)\n- **Correlação** entre ocupação de leitos >85% e aumento de IRAS (r=0.72)\n\n### Recomendação\nReforçar protocolos de higienização das mãos durante períodos de alta ocupação.`,
  "risk-detector": (input) =>
    `## Score de Risco\n\nAnálise para: *"${input.slice(0, 80)}"*\n\n| Fator | Peso | Score |\n|---|---|---|\n| Dispositivo invasivo | Alto | 8/10 |\n| Tempo de internação >7d | Médio | 6/10 |\n| Imunossupressão | Alto | 9/10 |\n| Antibiótico prévio | Médio | 5/10 |\n\n**Score Total: 7.0/10 — Risco ALTO**\n\n⚠️ Recomenda-se vigilância ativa diária.`,
  "report-generator": (input) =>
    `## Relatório Gerado\n\nParâmetros: *"${input.slice(0, 80)}"*\n\n### KPIs do Período\n- **Taxa de IRAS:** 3.2% (meta: <5%)\n- **Densidade de IPCS:** 2.1/1000 CVC-dia\n- **Adesão Higiene Mãos:** 78%\n- **Conformidade Bundles:** 85%\n\n📄 *Em produção, o PDF/Excel será gerado automaticamente.*`,
  "outbreak-alert": (input) =>
    `## 🚨 Análise de Surtos\n\nConsulta: *"${input.slice(0, 80)}"*\n\n### Detecção por Z-Score\n- **Klebsiella pneumoniae** na UTI Adulto: Z = 2.8 → **ALERTA** (>2σ)\n- **Acinetobacter baumannii** na Clínica Médica: Z = 1.3 → Normal\n- **MRSA** na Emergência: Z = 2.1 → **ATENÇÃO** (>2σ)\n\n### Ação Imediata\nInvestigar possível surto de K. pneumoniae na UTI Adulto. Rastrear fontes comuns.`,
  "intervention-suggester": (input) =>
    `## Intervenções Sugeridas\n\nBaseado em: *"${input.slice(0, 80)}"*\n\n### Guidelines ANVISA/CDC Aplicáveis\n1. **Bundle CVC** — Revisar checklist de inserção (ANVISA 2023)\n2. **Higiene das Mãos** — Implementar os 5 momentos da OMS em todos os turnos\n3. **Descolonização MRSA** — Banho de clorexidina 2% conforme protocolo CDC\n\n📌 *Referências: ANVISA NR-36/2023, CDC HICPAC Guidelines 2024*`,
  "dashboard-interpreter": (input) =>
    `## Interpretação do Dashboard\n\nSua pergunta: *"${input.slice(0, 80)}"*\n\n### Em linguagem simples:\nO dashboard mostra que a taxa de infecções está **dentro da meta** na maioria dos setores. Porém, a **UTI Neonatal** apresentou um aumento de 15% em relação ao mês anterior, o que merece atenção.\n\nO gráfico de tendência indica que estamos no **melhor trimestre do ano** em termos de conformidade de bundles (85%), mas a higiene das mãos caiu 5 pontos percentuais.`,
  "form-validator": (input) =>
    `## Validação de Formulário\n\nAnálise: *"${input.slice(0, 80)}"*\n\n### Campos Verificados\n- ✅ Data de coleta: formato correto\n- ⚠️ Setor: campo vazio → Sugestão: "UTI Adulto"\n- ✅ Microrganismo: compatível com material\n- ❌ CID: código inválido → Correto: J15.0\n\n### Auto-preenchimento Sugerido\n- Médico solicitante: Dr. Silva (último utilizado)\n- Material: Hemocultura (mais frequente para este setor)`,
  "anvisa-report": (input) =>
    `## Relatório Técnico ANVISA\n\nSolicitação: *"${input.slice(0, 80)}"*\n\n### Vigilância de ISC — Período: Jan-Mar 2026\n\n| Procedimento | Nº Cirurgias | ISC | Taxa |\n|---|---|---|---|\n| Cesárea | 245 | 5 | 2.04% |\n| Prótese Joelho | 32 | 1 | 3.12% |\n| Colecistectomia | 89 | 2 | 2.24% |\n\n📋 *Formatado conforme modelo ANVISA para notificação.*`,
  "micro-report": (input) =>
    `## Relatório Microbiológico Integrado\n\nConsulta: *"${input.slice(0, 80)}"*\n\n### Perfil de Resistência — Março 2026\n- **E. coli ESBL+**: 28% dos isolados (↑3% vs mês anterior)\n- **K. pneumoniae KPC**: 15% dos isolados (estável)\n- **MRSA**: 22% dos S. aureus (↓5%)\n\n### Mapa de Calor por Setor\nMaior concentração de MDR na UTI Adulto (42%) e Clínica Cirúrgica (31%).`,
  "quick-decision": (input) =>
    `## Suporte à Decisão Rápida\n\nSituação: *"${input.slice(0, 80)}"*\n\n### Análise Rápida\n🔴 **Prioridade: ALTA**\n\n### Decisão Recomendada\n1. Iniciar isolamento de contato **imediatamente**\n2. Coletar culturas de vigilância nos contactantes\n3. Acionar CCIH para investigação epidemiológica\n4. Notificar ao SCIH em até 24h\n\n⏱️ *Tempo estimado de resposta ideal: <2h após identificação.*`,
};

// === n8n webhook mapping ===

const N8N_BASE_URL = "https://irascontrol.app.n8n.cloud/webhook";

const AGENT_WEBHOOK_SLUGS: Record<string, string> = {
  "trend-analyst": "analista_de_tendências",
  "risk-detector": "detector_de_fatores_de_risco",
  "report-generator": "gerador_de_relatórios_automatizados",
  "outbreak-alert": "alerta_de_surtos",
  "intervention-suggester": "sugestor_de_intervenções",
  "dashboard-interpreter": "interpretador_de_dashboards",
  "form-validator": "validador_de_formulários",
  "anvisa-report": "agente_de_relatorios_tecnicos_anvisa_e_vigilância_de_isc",
  "micro-report": "agente_de_relatórios_microbiológicos_integrados",
  "quick-decision": "agente_de_tomada_de_decisao_rapida",
};

export async function sendToAgent(agentId: string, _sessionId: string, input: string): Promise<string> {
  const slug = AGENT_WEBHOOK_SLUGS[agentId];

  // Get user session for auth token
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Usuário não autenticado. Faça login para usar os agentes de IA.");
  }

  if (!slug) {
    // No webhook mapped — use mock fallback
    const mockFn = MOCK_RESPONSES[agentId];
    if (mockFn) return mockFn(input);
    return `Agente **${agentId}** sem integração configurada.`;
  }

  try {
    const response = await fetch(`${N8N_BASE_URL}/${slug}`, {
      method: "POST",
      headers: {
        "Authorization": `bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok) {
      console.error(`n8n webhook error: ${response.status} ${response.statusText}`);
      throw new Error(`Erro do agente (${response.status})`);
    }

    const data = await response.text();

    // Try to parse as JSON first, otherwise return raw text
    try {
      const json = JSON.parse(data);
      return json.output || json.message || json.response || JSON.stringify(json, null, 2);
    } catch {
      return data;
    }
  } catch (error) {
    console.error(`Falha ao chamar agente ${agentId}:`, error);
    // Fallback to mock response
    const mockFn = MOCK_RESPONSES[agentId];
    if (mockFn) return mockFn(input) + "\n\n---\n⚠️ *Resposta simulada — falha na conexão com o servidor.*";
    throw error;
  }
}

// === Plan labels ===

export const PLAN_LABELS: Record<AgentPlan, string> = {
  free: "Gratuito",
  pro: "Profissional",
  enterprise: "Enterprise",
};

export const PLAN_COLORS: Record<AgentPlan, string> = {
  free: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  pro: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  enterprise: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
};

export const CATEGORY_LABELS: Record<string, string> = {
  analysis: "Análise",
  reports: "Relatórios",
  alerts: "Alertas",
  decision: "Tomada de Decisão",
};
