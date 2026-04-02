export interface IndicadorField {
  id: string;
  label: string;
  section: string;
  type: "number" | "text" | "date" | "select" | "calculated";
  options?: string[];
  formula?: string; // human-readable description
}

export const sections = [
  "Informações Gerais",
  "Indicadores Base",
  "Dispositivos e Infecções",
  "Tipos de Infecção",
  "Antibióticos",
  "Campos Calculados",
] as const;

export type SectionName = (typeof sections)[number];

export const mesesOptions = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export const setorOptions = [
  "UTI Adulto", "UTI Pediátrica", "UTI Neonatal", "Centro Cirúrgico",
  "Enfermaria", "Emergência", "Sala Vermelha", "Trauma",
  "Enfermaria Pediátrica", "Emergência Pediátrica", "Clínica Médica",
  "Clínica Cirúrgica", "Maternidade", "Hemodiálise",
];

export const inputFields: IndicadorField[] = [
  // Informações Gerais
  { id: "nome", label: "Nome", section: "Informações Gerais", type: "text" },
  { id: "dataVigilancia", label: "Data da Vigilância", section: "Informações Gerais", type: "date" },
  { id: "mesVigilancia", label: "Mês da Vigilância", section: "Informações Gerais", type: "select", options: mesesOptions },
  { id: "anoVigilancia", label: "Ano da Vigilância", section: "Informações Gerais", type: "number" },
  { id: "setor", label: "Setor", section: "Informações Gerais", type: "select", options: setorOptions },

  // Indicadores Base
  { id: "numSaidas", label: "Número de Saídas", section: "Indicadores Base", type: "number" },
  { id: "numPacienteDiaTotal", label: "Número de paciente dia total", section: "Indicadores Base", type: "number" },
  { id: "numInfeccoes", label: "Número de Infecções", section: "Indicadores Base", type: "number" },
  { id: "numPacientesUtiInicio", label: "Nº Pacientes UTI (1º dia mês vigente)", section: "Indicadores Base", type: "number" },
  { id: "numDiasUtiInicio", label: "Nº dias pacientes UTI (1º dia mês vigente)", section: "Indicadores Base", type: "number" },
  { id: "numPacientesUtiSubsequente", label: "Nº Pacientes UTI (1º dia mês subsequente)", section: "Indicadores Base", type: "number" },
  { id: "numDiasUtiSubsequente", label: "Nº dias pacientes UTI (1º dia mês subsequente)", section: "Indicadores Base", type: "number" },
  { id: "numAdmissoes", label: "Número de novas admissões", section: "Indicadores Base", type: "number" },
  { id: "numAltas", label: "Número de Altas", section: "Indicadores Base", type: "number" },
  { id: "numPacientesInfeccaoHospitalar", label: "Nº pacientes com infecção hospitalar", section: "Indicadores Base", type: "number" },
  { id: "numObitosTotal", label: "Número total de óbitos", section: "Indicadores Base", type: "number" },
  { id: "numObitosInfeccao", label: "Nº de óbitos com infecção hospitalar", section: "Indicadores Base", type: "number" },

  // Dispositivos e Infecções
  { id: "utilizacaoCVC", label: "Utilização de CVC", section: "Dispositivos e Infecções", type: "number" },
  { id: "infeccaoCVC", label: "Infecção de CVC", section: "Dispositivos e Infecções", type: "number" },
  { id: "utilizacaoVM", label: "Utilização de VM", section: "Dispositivos e Infecções", type: "number" },
  { id: "infeccaoVM", label: "Infecção de VM", section: "Dispositivos e Infecções", type: "number" },
  { id: "utilizacaoSVD", label: "Utilização de SVD", section: "Dispositivos e Infecções", type: "number" },
  { id: "infeccaoSVD", label: "Infecção de SVD", section: "Dispositivos e Infecções", type: "number" },

  // Tipos de Infecção
  { id: "infeccaoTratoUrinario", label: "Infecção trato urinário", section: "Tipos de Infecção", type: "number" },
  { id: "infeccaoSitioCirurgico", label: "Infecção sítio cirúrgico", section: "Tipos de Infecção", type: "number" },
  { id: "infeccaoTratoRespiratorio", label: "Infecção trato respiratório", section: "Tipos de Infecção", type: "number" },
  { id: "infeccaoPele", label: "Infecção de pele", section: "Tipos de Infecção", type: "number" },
  { id: "infeccaoCorrenteSanguinea", label: "Infecção corrente sanguínea", section: "Tipos de Infecção", type: "number" },
  { id: "outrasInfeccoes", label: "Outras infecções", section: "Tipos de Infecção", type: "number" },

  // Antibióticos
  { id: "numAntibioticosUtilizados", label: "Nº de antibióticos utilizados", section: "Antibióticos", type: "number" },
  { id: "numInfeccoesImportadas", label: "Nº de infecções importadas", section: "Antibióticos", type: "number" },
];

export interface CalculatedField {
  id: string;
  label: string;
  formula: string;
}

export const calculatedFields: CalculatedField[] = [
  { id: "taxaSaidas", label: "Taxa de Saídas (%)", formula: "(infecções / saídas) × 100" },
  { id: "tempoPermanencia", label: "Tempo de Permanência (dias)", formula: "(pac UTI início + pac dia total + dias UTI sub) / (dias UTI início + admissões)" },
  { id: "taxaInfeccao", label: "Taxa de Infecção (‰)", formula: "(infecções / paciente dia total) × 1000" },
  { id: "pacienteExposto", label: "Paciente Exposto", formula: "admissões + pacientes UTI início" },
  { id: "pacienteEmRisco", label: "Paciente em Risco (%)", formula: "(infecções / paciente exposto) × 100" },
  { id: "taxaInfeccaoHospitalar", label: "Taxa de Infecção Hospitalar (‰)", formula: "(infecções / paciente dia total) × 1000" },
  { id: "taxaLetalidade", label: "Taxa de Letalidade (%)", formula: "(óbitos c/ infecção / pac c/ infecção) × 100" },
  { id: "taxaUtilizacaoCVC", label: "Taxa Utilização CVC (‰)", formula: "(utilização CVC / paciente dia total) × 1000" },
  { id: "taxaInfeccaoCVC", label: "Taxa Infecção CVC (‰)", formula: "(infecção CVC / utilização CVC) × 1000" },
  { id: "taxaUtilizacaoVM", label: "Taxa Utilização VM (‰)", formula: "(utilização VM / paciente dia total) × 1000" },
  { id: "taxaInfeccaoVM", label: "Taxa Infecção VM / PAV (‰)", formula: "(infecção VM / utilização VM) × 1000" },
  { id: "taxaUtilizacaoSVD", label: "Taxa Utilização SVD (‰)", formula: "(utilização SVD / paciente dia total) × 1000" },
  { id: "taxaInfeccaoSVD", label: "Taxa Infecção SVD (‰)", formula: "(infecção SVD / utilização SVD) × 1000" },
  { id: "taxaInfTratoUrinario", label: "Taxa Infecção Trato Urinário (‰)", formula: "(ITU / paciente dia total) × 1000" },
  { id: "taxaInfSitioCirurgico", label: "Taxa Infecção Sítio Cirúrgico (‰)", formula: "(ISC / paciente dia total) × 1000" },
  { id: "taxaInfTratoRespiratorio", label: "Taxa Infecção Trato Respiratório (‰)", formula: "(ITR / paciente dia total) × 1000" },
  { id: "taxaInfPele", label: "Taxa Infecção de Pele (‰)", formula: "(pele / paciente dia total) × 1000" },
  { id: "taxaInfCorrenteSanguinea", label: "Taxa Infecção Corrente Sanguínea (‰)", formula: "(ICS / paciente dia total) × 1000" },
  { id: "taxaUsoAntibioticos", label: "Taxa Uso Antibióticos (%)", formula: "(antibióticos / paciente dia total) × 100" },
];
