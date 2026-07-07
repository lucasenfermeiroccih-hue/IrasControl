export type AuditTypeKey =
  | "bundles"
  | "hand_hygiene"
  | "infection_control"
  | "dispenser"
  | "cti_infrastructure"
  | "antibiogram"
  | "precaution"
  | "hand_hygiene_consumption"
  | "construction_renovation";

export const AUDIT_TYPE_LABELS: Record<AuditTypeKey, string> = {
  bundles: "Bundles de Prevenção",
  hand_hygiene: "Higienização das Mãos",
  infection_control: "Controle de Infecção / Limpeza",
  dispenser: "Dispensadores de Álcool Gel",
  cti_infrastructure: "Infraestrutura CTI/UTI",
  antibiogram: "Antibiograma / Antimicrobianos",
  precaution: "Precauções de Isolamento",
  hand_hygiene_consumption: "Consumo de Produtos de HM",
  construction_renovation: "Obras e Reformas",
};

export type AuditReportMode = "single_audit_type" | "monthly_sector_compiled";

export interface AuditReportFilters {
  mode: AuditReportMode;
  hospitalId: string;
  hospitalName: string;
  sectorName: string;
  periodStart: string;
  periodEnd: string;
  auditType: AuditTypeKey | "";
  managerName: string;
  managerEmail: string;
  technicalResponsible: string;
  includePreviousPeriod: boolean;
  includeActionPlan: boolean;
}

export interface AuditRecord {
  id: string;
  hospital_id: string;
  sector: string | null;
  audit_type: string;
  audit_date: string;
  compliance_rate: number | null;
  compliant_items: number;
  total_items: number;
  observations: string | null;
}

export interface AuditItemRecord {
  id: string;
  audit_id: string;
  question: string;
  category: string | null;
  status: string;
  observation: string | null;
}

export interface AuditActionPlanRecord {
  id?: string;
  audit_id?: string;
  item_id?: string;
  action: string;
  reason: string;
  responsible: string;
  deadline: string;
  how: string;
  status: "sugerido" | "pendente" | "em_andamento" | "concluido" | "atrasado";
  evidence?: string;
}

export type ReportClassification = "Excelente" | "Bom" | "Regular" | "Crítico";
export type ReportStatusColor = "verde" | "amarelo" | "vermelho";
export type ReportTendency = "Melhorando" | "Estável" | "Piorando" | "Sem histórico";
export type QualidadeRegistro = "Boa" | "Regular" | "Insuficiente";

export interface AuditReportMetrics {
  totalAuditorias: number;
  totalItens: number;
  itensConformes: number;
  itensNaoConformes: number;
  conformidadeGeral: number;
  taxaNaoConformidade: number;
  totalProfissionaisObservados: number;
  totalAuditores: number;
  classificacao: ReportClassification;
  statusCor: ReportStatusColor;
  topConformidades: string[];
  topNaoConformidades: string[];
  naoConformidadesPorCategoria: Record<string, number>;
  conformidadePorCategoria: Record<string, number>;
  conformidadePorProfissao: Record<string, number>;
  auditoriasPorAuditor: Record<string, number>;
  riscoPredominante?: string;
  causaProvavelPredominante?: string;
  tendencia?: ReportTendency;
  baixaAmostragem: boolean;
  qualidadeRegistro: QualidadeRegistro;
}

export interface MonthlySectorCompiledAuditMetrics {
  totalAudits: number;
  totalAuditTypes: number;
  auditTypesIncluded: string[];
  totalItems: number;
  compliantItems: number;
  nonCompliantItems: number;
  generalComplianceRate: number;
  complianceByAuditType: Record<string, number>;
  totalAuditsByType: Record<string, number>;
  nonCompliancesByAuditType: Record<string, number>;
  worstAuditTypes: Array<{ auditType: string; complianceRate: number; nonCompliantItems: number }>;
  bestAuditTypes: Array<{ auditType: string; complianceRate: number }>;
  topNonCompliances: Array<{ auditType: string; category: string; question: string; count: number }>;
  positiveFindings: string[];
  negativeFindings: string[];
  improvementPriorities: string[];
  suggestedActionPlan: AuditActionPlanRecord[];
  classification: ReportClassification;
  statusColor: ReportStatusColor;
  lowSampleAlert: boolean;
}

export interface HospitalLogos {
  hospitalLogoUrl: string | null;
  scihLogoUrls: string[];
}
