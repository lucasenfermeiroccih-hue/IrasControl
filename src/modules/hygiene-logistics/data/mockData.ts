import type { ProductLike } from "../utils/logisticsFormulas";

export const HGNI = "Hospital Geral de Nova Iguaçu — HGNI";

export const SETORES = [
  "UTI Adulto", "UTI Neonatal", "Centro Cirúrgico", "CME", "Pronto-Socorro",
  "Maternidade", "Internação Clínica", "Internação Cirúrgica", "Pediatria",
  "Ambulatório", "Área ADM", "Hotelaria/Zeladoria",
];

export const CATEGORIAS = ["Papel", "Sabonete", "Álcool", "Saneante", "Saco Lixo", "EPI", "Equipamento", "Acessório"];

// Posição de Estoque — SOULMV — HGNI — 25/08/2026
// [codigo, qtd_atual, custo_medio]
const SOULMV_RAW: Array<[string, number, number]> = [
  ["1749",  24,   149.293],
  ["22479", 100,  20.0],
  ["22485", 10,   17.29],
  ["22592", 45,   36.4],
  ["22481", 45,   36.4],
  ["2690",  10,   15.34],
  ["2689",  10,   15.34],
  ["7110",  75,   11.7],
  ["1521",  76,   7.54],
  ["22453", 100,  24.67],
  ["22430", 57,   30.0],
  ["22494", 77,   60.44],
  ["19191", 80,   178.5723],
  ["6512",  79,   197.0],
  ["1029",  94,   23.7654],
  ["22435", 29,   53.9578],
  ["8763",  15,   6.29],
  ["60",    50,   3.03],
  ["22468", 940,  0.31],
  ["22469", 1000, 0.26],
  ["22470", 50,   1.17],
  ["22471", 50,   1.17],
  ["22472", 100,  0.31],
  ["63",    60,   29.77],
  ["22549", 230,  25.77],
  ["78",    120,  4.03],
  ["1016",  46,   127.4],
  ["22643", 95,   96.0],
  ["22676", 45,   16.0],
  ["6526",  25,   63.65],
  ["22451", 11,   39.94],
  ["22454", 78,   126.35],
  ["22540", 50,   6.89],
  ["89",    69,   22.0],
  ["22652", 265,  60.0],
  ["22646", 228,  79.36],
  ["22648", 213,  35.0],
  ["22645", 180,  64.9],
  ["22649", 97,   83.0],
  ["4893",  20,   27.12],
  ["22463", 20,   48.88],
  ["22547", 5,    12.27],
  ["22427", 351,  15.0],
];

// Lookup rápido: codigo → [qtd_atual, custo_medio]
const SOULMV: Record<string, [number, number]> = Object.fromEntries(
  SOULMV_RAW.map(([cod, qty, cost]) => [cod, [qty, cost]])
);

export interface HLProduct extends ProductLike {
  id: string;
  unidadeEntrada: string;
  unidadeSaida: string;
  fatorConversao: number;
  local: string;
  lote: string;
  validade: string;
  ultimaEntrada: string;
  ultimaSaida: string;
  fornecedor: string;
  controladoCCIH: boolean;
  historico: number[];
}

const h = (base: number) => [0.9, 1.05, 0.95, 1.1, 1.0, 1.0].map((f) => Math.round(base * f));

// Categorização automática por nome do produto
function catFromNome(nome: string): string {
  const n = nome.toUpperCase();
  if (/ÁLCOOL|ALCOOL/.test(n)) return "Álcool";
  if (/SABONETE/.test(n)) return "Sabonete";
  if (/PAPEL (HIGI|TOALHA)/.test(n)) return "Papel";
  if (/SACO (DE )?RESID|SACO INFECTANTE/.test(n)) return "Saco Lixo";
  if (/AVENTAL|LUVA DE BORRACHA|TOUCA DESC/.test(n)) return "EPI";
  if (/DESINFETANTE|DETERGENTE|HIPOCLORITO|CERA (LIQUIDA|INCOLOR)|REMOVEDOR|PASTA LIMPADORA|LUSTRA MOVEIS/.test(n)) return "Saneante";
  if (/BALDE|LIXEIRA|CARRO FUNCIONAL|ENCERADEIRA|CAIXA COLETORA/.test(n)) return "Equipamento";
  return "Acessório";
}
function abcFromCat(cat: string): "A" | "B" | "C" {
  if (["Álcool", "EPI", "Saco Lixo", "Papel", "Sabonete"].includes(cat)) return "A";
  if (cat === "Saneante") return "B";
  return "C";
}
function critFromCat(cat: string): "Alta" | "Média" | "Baixa" {
  if (["Álcool", "EPI", "Saco Lixo"].includes(cat)) return "Alta";
  if (["Saneante", "Papel", "Sabonete"].includes(cat)) return "Média";
  return "Baixa";
}

// Grade oficial de compras — [codigo, nome, apresentacao, preco_dbs | null]
// Fonte: GRADE - MATERIAL LIMPEZA × Proposta DBS Cotação nº 090/2025 (23/12/2025)
// Fornecedor: DBS PRODUTOS HOSPITALARES
// null = item não localizado na proposta DBS
const GRADE_LIMPEZA: Array<[string, string, string, number | null]> = [
  // Itens do estoque SOULMV ausentes na proposta DBS — preço pelo custo médio SOULMV
  ["1749",    "ACIDO PERACETICO 0,2% 5L",                                    "GALÃO",   null],
  ["19191",   "DESINFETANTE HOSPITALAR (PERÓXIDO) 5L",                       "GALÃO",   null],
  ["1029",    "DETERGENTE DESINCRUSTANTE ENZIMATICO 1000ML",                 "FRASCO",  null],
  // Proposta DBS — 121 itens
  ["22427",   "ÁLCOOL GEL 70% BEIRA LEITO 500ML",                            "UNIDADE", 15.0],
  ["22428",   "ALCOOL ESPUMA 1500 ML",                                        "UNIDADE", 41.47],
  ["22484",   "ALCOOL GEL PARA HIGIENE DE MÃOS",                             "UNIDADE", 11.09],
  ["22479",   "ALCOOL 70% PARA DISPENSER 800ML",                             "UNIDADE", 20.0],
  ["22489",   "ALCOOL 70% SPRAY PARA DISPENSER 1500ML",                      "UNIDADE", 54.08],
  ["22543",   "ALCOOL LIQUIDO 70% LIMPEZA 1000ML",                           "UNIDADE", 20.48],
  ["22485",   "AVENTAL DE PROTEÇÃO IMPERMEAVEL EM PVC DUPLA FACE LIMP",      "UNIDADE", 17.29],
  ["22592",   "BALDE DE SUPERFICIE QUADRADO AZUL",                           "UNIDADE", 36.4],
  ["22481",   "BALDE DE SUPERFICIE QUADRADO VERMELHO",                       "UNIDADE", 36.4],
  ["22482",   "BALDE ESPREMEDOR 30 LITROS",                                  "UNIDADE", 699.37],
  ["2690",    "BALDE LIMPEZA 8L AZUL",                                       "UNIDADE", 15.34],
  ["2689",    "BALDE LIMPEZA 8L VERMELHO",                                   "UNIDADE", 15.34],
  ["7110",    "BOMBONA VIRGEM PARA PRODUTOS QUIMICOS 5L",                    "UNIDADE", 11.7],
  ["1521",    "BORRIFADOR UNIVERSAL LEITOSO 500ML",                          "UNIDADE", 7.54],
  ["22429",   "CABO DE ALUMINIO PONTA NÃO ROSQUEADA 1.40 X 22MM",           "UNIDADE", 37.73],
  ["22430",   "CABO DE ALUMINIO PONTA ROSQUEADA 1.40 X 22MM",               "UNIDADE", 30.0],
  ["2024209", "CAIXA COLETORA PERFURO-CORTANTE 13LTS",                       "UNIDADE", 14.61],
  ["22431",   "CAIXA COLETORA PERFURO-CORTANTE 13LTS - LARANJA",             "UNIDADE", 15.74],
  ["22432",   "CARRO FUNCIONAL PARA LIMPEZA",                                "UNIDADE", 1142.44],
  ["22490",   "CERA LIQUIDA IMPERGOLD HS GLX 5 LITROS",                      "UNIDADE", 206.7],
  ["22491",   "CERA LIQUIDA IMPERGOLD UHS GLX 5 LITROS",                     "UNIDADE", 230.69],
  ["22492",   "CERA LIQUIDA PARA PISO MARANSO 5 LITROS",                     "UNIDADE", 60.0],
  ["22433",   "CERA INCOLOR PARA PISO 5 LITROS",                             "UNIDADE", null],
  ["22434",   "DESINFETANTE USO GERAL HOSPITALAR 5 LITROS",                  "UNIDADE", 32.0],
  ["6512",    "DESINFETANTE - BIGUAN 5 LITROS",                              "UNIDADE", 197.0],
  ["22493",   "DESINFETANTE - PRATICO 100 5 LITROS",                         "UNIDADE", 690.66],
  ["22494",   "DESINFETANTE - TOP GLIX 5 LITROS",                            "UNIDADE", 60.44],
  ["22435",   "DETERGENTE NEUTRO GLX 5 LITROS",                              "UNIDADE", 66.48],
  ["22495",   "DETERGENTE NEUTRO TOP DET 5 LITROS",                          "UNIDADE", null],
  ["21",      "DISCO BRANCO 350MM",                                           "UNIDADE", 38.97],
  ["865",     "DISCO BRANCO 510MM",                                           "UNIDADE", 66.35],
  ["28",      "DISCO PRETO 350MM",                                            "UNIDADE", 42.56],
  ["866",     "DISCO PRETO 510MM",                                            "UNIDADE", 66.35],
  ["31",      "DISCO VERDE 350MM",                                            "UNIDADE", 42.56],
  ["870",     "DISCO VERDE 510MM",                                            "UNIDADE", 66.35],
  ["22464",   "ENCERADEIRA INDUSTRIAL 350MM 110V",                            "UNIDADE", 3444.2],
  ["22465",   "ENCERADEIRA INDUSTRIAL 350MM 220V",                            "UNIDADE", 3444.2],
  ["22466",   "ENCERADEIRA INDUSTRIAL 510MM 110V",                            "UNIDADE", 4855.2],
  ["22467",   "ENCERADEIRA INDUSTRIAL 510MM 220V",                            "UNIDADE", 4855.2],
  ["8763",    "ESCOVA PLÁSTICA COM SUPORTE PARA LIMPAR VASO SANITÁRIO",      "UNIDADE", 6.29],
  ["4178",    "ESPONJA DUPLA FACE",                                           "UNIDADE", 1.92],
  ["22468",   "ETIQUETA ADESIVA DE BOMBONA",                                  "UNIDADE", 0.31],
  ["22469",   "ETIQUETA ADESIVA DE DISPENSER",                                "UNIDADE", 0.26],
  ["22470",   "ETIQUETA ADESIVA DE LIXO COMUM",                              "UNIDADE", 1.17],
  ["22471",   "ETIQUETA ADESIVA DE LIXO INFECTANTE",                         "UNIDADE", 1.17],
  ["22472",   "ETIQUETA ADESIVA DE RASTREABILIDADE",                          "UNIDADE", 0.31],
  ["60",      "ESPONJA FIBRA PARA LIMPEZA LEVE - BRANCA",                    "UNIDADE", 3.03],
  ["22541",   "FIBRAX - FIBRA DE LIMPEZA - PRETA",                           "UNIDADE", 24.44],
  ["61",      "ESPONJA FIBRA PARA LIMPEZA PESADA - VERDE",                   "UNIDADE", 24.44],
  ["22438",   "ACIONADOR PARA DISPENSER (GARRA) - 1500ML",                   "UNIDADE", 9.8],
  ["22439",   "GARRA PARA MOP ÚMIDO",                                         "UNIDADE", 27.65],
  ["22440",   "GATILHO PARA BORRIFADOR",                                      "UNIDADE", 5.8],
  ["22441",   "SUPORTE DE MOP SECO 40CM",                                     "UNIDADE", null],
  ["22442",   "APLICADOR DE CERA 45 CM",                                      "UNIDADE", 54.55],
  ["8976",    "HIPOCLORITO DE SÓDIO 1% 5 LITROS",                            "UNIDADE", 18.04],
  ["63",      "HIPOCLORITO DE SODIO 5% CONCENTRADO 5L",                      "UNIDADE", 29.77],
  ["1086",    "LIXEIRA COM PEDAL QUADRADA 30L BRANCO",                       "PAR",     259.74],
  ["4891",    "LIXEIRA COM PEDAL QUADRADA 60L BRANCO",                       "PAR",     280.0],
  ["22473",   "LIXEIRA COM PEDAL QUADRADA 100L BRANCO",                      "PAR",     519.74],
  ["22443",   "LIXEIRA COM PEDAL QUADRADA 200L BRANCO",                      "PAR",     935.74],
  ["22444",   "LUSTRA MOVEIS",                                                "PAR",     6.28],
  ["22445",   "APLICADOR DE CERA BRANCA 25CM",                               "PAR",     125.4],
  ["67",      "LUVA DE BORRACHA AMARELA COM FORRO G",                        "PAR",     7.77],
  ["22448",   "LUVA DE BORRACHA AMARELA COM FORRO GG",                       "PAR",     7.77],
  ["72",      "LUVA DE BORRACHA AMARELA COM FORRO M",                        "PAR",     7.77],
  ["75",      "LUVA DE BORRACHA AMARELA COM FORRO P",                        "PAR",     7.77],
  ["1283",    "LUVA DE BORRACHA VERDE COM FORRO G",                          "PAR",     7.77],
  ["22449",   "LUVA DE BORRACHA VERDE COM FORRO GG",                         "PAR",     7.77],
  ["1282",    "LUVA DE BORRACHA VERDE COM FORRO M",                          "PAR",     7.77],
  ["1281",    "LUVA DE BORRACHA VERDE COM FORRO P",                          "PAR",     7.77],
  ["22478",   "REFIL MOP SECO",                                               "PAR",     43.94],
  ["22620",   "MOP PÓ ALGODÃO",                                               "UNIDADE", null],
  ["22549",   "MOPITA - CABELEIRA DE MOP UMIDO",                             "UNIDADE", 25.77],
  ["6520",    "PÁ COLETORA DE LIXO COM CABO E ARTICULADO",                   "UNIDADE", 85.31],
  ["78",      "PANO DE CHAO",                                                 "UNIDADE", 4.03],
  ["1016",    "PANO MULTIUSO LIMPEZA PESADA AZUL 33 X 300MT",                "UNIDADE", 127.4],
  ["1017",    "PANO MULTIUSO LIMPEZA PESADA VERDE 33 X 300MT",               "UNIDADE", 127.4],
  ["22643",   "PAPEL HIGIENICO 100% CELULOSE - PCT C/ 8 UNIDADES",           "PACOTE",  96.0],
  ["22676",   "PAPEL TOALHA 100% CELULOSE INTERFOLHADO PCT",                 "PACOTE",  16.0],
  ["22644",   "PAPEL TOALHA 100% CELULOSE ROLO - PCT C/ 6 UNIDADES",         "PACOTE",  105.3],
  ["22450",   "PASTA LIMPADORA MULTIUSO 500G",                               "UNIDADE", 11.62],
  ["6526",    "PLACA SINALIZAÇÃO PISO MOLHADO",                              "UNIDADE", 63.65],
  ["22451",   "RASPADOR REMOVEDOR DE CERA MULTIUSO",                         "UNIDADE", 39.94],
  ["22561",   "REFIL APLICADOR DE CERA",                                      "UNIDADE", 10.48],
  ["22452",   "CABELEIRA DE MOP SECO 40 X 12",                               "UNIDADE", 58.16],
  ["22453",   "CABELEIRA DE MOP UMIDO PONTA DOBRADA",                        "UNIDADE", 24.67],
  ["3458",    "CABELEIRA DE MOP UMIDO COM ROSCA PONTA CORTADA",              "UNIDADE", null],
  ["22454",   "REMOVEDOR DE CERA 5 LITROS",                                   "UNIDADE", 126.35],
  ["22497",   "REMOVEDOR DE CERA CONCENTRADO GLX 5 LITROS",                  "UNIDADE", 100.1],
  ["22540",   "RODO TIPO PROFISSIONAL 40CM",                                  "UNIDADE", 6.89],
  ["22474",   "RODO SEM CABO 45CM",                                           "UNIDADE", null],
  ["22475",   "RODO SEM CABO 60CM",                                           "UNIDADE", 19.89],
  ["22455",   "SABONETE ESPUMA ERVA DOCE 1500ML",                            "UNIDADE", 34.56],
  ["22498",   "SABONETE LIQUIDO PARA DISPENSER 1500ML",                      "UNIDADE", 32.0],
  ["89",      "SABONETE LIQUIDO 800ML",                                       "UNIDADE", 22.0],
  ["22456",   "SACO DE RESIDUOS 100L - AZUL",                                "PACOTE",  65.0],
  ["22645",   "SACO DE RESIDUOS INFECTANTE 100L - BRANCO",                   "PACOTE",  64.9],
  ["22457",   "SACO DE RESIDUOS 200L - AZUL",                                "PACOTE",  74.1],
  ["22646",   "SACO DE RESIDUOS 200L - PRETO",                               "PACOTE",  79.36],
  ["22458",   "SACO DE RESIDUOS 60L - AZUL",                                 "PACOTE",  26.0],
  ["22647",   "SACO DE RESIDUOS 60L - BRANCO",                               "PACOTE",  40.0],
  ["22648",   "SACO DE RESIDUOS 60L - PRETO",                                "PACOTE",  35.0],
  ["22649",   "SACO DE RESIDUOS INFECTANTE 200L - BRANCO",                   "PACOTE",  83.0],
  ["22557",   "SACO DE RESIDUOS INFECTANTE 60L - VERMELHO",                  "PACOTE",  43.2],
  ["22650",   "SACO DE RESIDUOS INFECTANTE 100L - VERMELHO",                 "PACOTE",  54.6],
  ["22651",   "SACO DE RESIDUOS INFECTANTE 200L - VERMELHO",                 "PACOTE",  65.8],
  ["22558",   "SACO DE RESIDUOS 60L - VERMELHO",                             "PACOTE",  18.2],
  ["22559",   "SACO DE RESIDUOS 100L - VERMELHO",                            "PACOTE",  39.2],
  ["22560",   "SACO DE RESIDUOS 200L - VERMELHO",                            "PACOTE",  54.6],
  ["22652",   "SACO DE RESIDUOS 100L - PRETO",                               "PACOTE",  60.0],
  ["22653",   "SACO DE RESIDUOS 100L - LARANJA",                             "PACOTE",  93.6],
  ["22657",   "SACO DE RESIDUOS 60L - LARANJA",                              "PACOTE",  88.41],
  ["22459",   "SACO PARA CARRINHO FUNCIONAL 50KG",                           "UNIDADE", 288.51],
  ["22460",   "SUPORTE FIXADOR DE DISCO FLANGE ENCERADEIRA 350MM",           "UNIDADE", 179.4],
  ["22461",   "SUPORTE FIXADOR DE DISCO FLANGE ENCERADEIRA 510MM",           "UNIDADE", 200.0],
  ["4893",    "SUPORTE PARA FIBRA LT SEM CABO",                              "UNIDADE", 27.12],
  ["22593",   "TOUCA DESCARTAVEL BRANCA LIMPEZA C/ 100",                     "UNIDADE", 18.67],
  ["22462",   "VÁLVULA DOSADORA PARA DISPENSER ÁLCOOL / SABONETE",           "UNIDADE", 12.66],
  ["22463",   "VASCULHADO DE TETO",                                           "UNIDADE", 48.88],
  ["22547",   "VASSOURA DE CHAPA",                                            "UNIDADE", 12.27],
  ["2691",    "VASSOURA PIAÇAVA GARI COM CABO",                              "UNIDADE", 50.93],
];

// CMM estimado por cobertura esperada de estoque por categoria.
// Atualizar com consumo real ao fim de setembro/2026.
const COBERTURA_MESES: Record<string, number> = {
  "Álcool":    1.5,  // alto giro
  "Saco Lixo": 1.5,  // alto giro
  "Papel":     1.5,  // alto giro
  "Sabonete":  1.5,  // alto giro
  "EPI":       2.0,
  "Saneante":  2.0,
  "Equipamento": 4.0,
  "Acessório": 4.0,
};

function cmmFromStock(qtd: number, categoria: string): number {
  const meses = COBERTURA_MESES[categoria] ?? 2.0;
  return Math.max(1, Math.round(qtd / meses));
}

export const PRODUCTS: HLProduct[] = GRADE_LIMPEZA.map(([codigo, nome, apresentacao, precoDbs]) => {
  const categoria = catFromNome(nome);
  const curvaABC = abcFromCat(categoria);
  const criticidade = critFromCat(categoria);
  const real = SOULMV[codigo];
  const estoqueVigente = real ? real[0] : 0;
  // Prioridade de preço: DBS → custo médio SOULMV → 0
  const custoUnitario = precoDbs ?? (real ? real[1] : 0);
  const cmm = real ? cmmFromStock(real[0], categoria) : 0;
  return {
    id: codigo,
    codigo,
    nome,
    categoria,
    unidadeEntrada: apresentacao,
    unidadeSaida: apresentacao,
    fatorConversao: 1,
    estoqueVigente,
    cmm,
    custoUnitario,
    curvaABC,
    criticidade,
    leadTime: 7,
    diasSeguranca: 5,
    estoqueAlvoDias: 25,
    status: "Ativo" as const,
    controladoCCIH: ["Álcool", "EPI", "Saneante", "Papel", "Sabonete", "Saco Lixo"].includes(categoria),
    local: "",
    lote: "",
    validade: "",
    ultimaEntrada: real ? "2026-08-25" : "",
    ultimaSaida: "",
    fornecedor: precoDbs !== null ? "DBS PRODUTOS HOSPITALARES" : "",
    pedidoMes: cmm,
    historico: real ? h(cmm) : [],
  } as HLProduct;
});

export interface EquipmentSectorRow {
  setor: string;
  banheiros: number;
  dispSabonete: number;
  dispAlcool: number;
  dispPapel: number;
  lixeirasComuns: number;
  lixeirasInfectantes: number;
  dispQuebrados: number;
  lixeirasQuebradas: number;
  ausentes: number;
  ultimaVistoria: string;
}

export const EQUIPMENT: EquipmentSectorRow[] = [];

export const TOTAL_BANHEIROS = 0;
export const TOTAL_DISP_QUEBRADOS = 0;
export const TOTAL_LIXEIRAS_QUEBRADAS = 0;

export interface EquipmentItem {
  id: string; setor: string; tipo: string; local: string;
  status: "Funcionando" | "Quebrado" | "Ausente" | "Inadequado";
  responsavel: string; prazo: string; planoStatus: string;
}

export const EQUIPMENT_ITEMS: EquipmentItem[] = [];

export interface SectorOutput {
  id: string; data: string; turno: "Manhã" | "Tarde" | "Noite"; setor: string;
  produto: string; solicitada: number; sugerida: number; liberada: number;
  respSolicitacao: string; respSeparacao: string; respRetirada: string;
  status: string; justificativa: string; observacao: string;
}

export const SECTOR_OUTPUTS: SectorOutput[] = [];

export interface CleaningTask {
  id: string; data: string; setor: string; tipo: string; frequencia: string;
  turno: string; previsto: string; realizado: string; profissional: string;
  supervisor: string; status: "Previsto" | "Em andamento" | "Concluído" | "Atrasado" | "Não realizado" | "Reprogramado";
  motivo: string; evidencia: string; observacao: string;
}

export const CLEANING_TYPES = ["Concorrente", "Terminal", "Imediata", "Banheiro", "Leito", "Isolamento", "Área Crítica", "Posto de Enfermagem", "Programada Semanal", "Programada Mensal"];

export const CLEANING_SCHEDULE: CleaningTask[] = [];

export interface AuditRecordHL {
  id: string; data: string; setor: string; tipo: string; auditor: string;
  turno: string; score: number; classificacao: string; itensConformes: number; itensAplicaveis: number;
}

export const CLEANING_AUDIT_TYPES = ["Leito", "Terminal", "Concorrente", "Banheiro", "Isolamento", "Área Crítica", "Carrinho de Limpeza", "Preparo de Saneantes", "Uso de EPI", "Reposição de Insumos", "Dispensers e Lixeiras"];

export const CHECKLISTS: Record<string, string[]> = {
  Leito: ["Grades e cabeceira sem sujidade", "Colchão íntegro e higienizado", "Mesa de cabeceira limpa", "Suporte de soro higienizado", "Piso sob o leito limpo", "Registro de limpeza preenchido"],
  Terminal: ["Retirada de todos os resíduos", "Limpeza de teto/paredes/luminárias", "Desinfecção de superfícies de contato", "Troca de cortinas divisórias", "Higienização de mobiliário", "Tempo de contato do saneante respeitado"],
  Concorrente: ["Superfícies horizontais limpas", "Reposição de insumos", "Troca de sacos de lixo", "Piso limpo e seco", "Sinalização de piso molhado"],
  Banheiro: ["Vaso sanitário higienizado", "Pia e bancada limpas", "Espelho sem sujidade", "Dispenser de sabonete abastecido", "Dispenser de papel toalha abastecido", "Lixeira com tampa e pedal funcionando"],
  Isolamento: ["EPI disponível na antessala", "Material exclusivo do quarto", "Saneante correto para o agente", "Lixo tratado como infectante", "Sinalização de precaução visível"],
  "Área Crítica": ["Fluxo limpo/sujo respeitado", "Frequência de limpeza cumprida", "Registro em impresso próprio", "Saneante de alto nível utilizado"],
  "Carrinho de Limpeza": ["Carrinho limpo e organizado", "Panos separados por área", "Saneantes rotulados", "Baldes identificados por cor"],
  "Preparo de Saneantes": ["Diluição conforme fabricante", "Rótulo com data e responsável", "EPI usado no preparo", "Local ventilado"],
  "Uso de EPI": ["Luvas adequadas", "Avental impermeável", "Óculos/protetor facial", "Calçado fechado antiderrapante"],
  "Reposição de Insumos": ["Papel toalha disponível", "Sabonete líquido disponível", "Álcool gel disponível", "Sacos de lixo adequados"],
  "Dispensers e Lixeiras": ["Dispensers fixados corretamente", "Sem vazamento ou quebra", "Lixeiras com tampa e pedal", "Identificação de resíduo correta"],
};

export const CLEANING_AUDITS: AuditRecordHL[] = [];

export interface NonConformity {
  id: string; origem: "Auditoria" | "Manual" | "Alerta"; setor: string; data: string;
  descricao: string; classificacao: "Alta" | "Média" | "Baixa"; responsavel: string;
  prazo: string; status: "Aberta" | "Em andamento" | "Vencida" | "Encerrada";
  acao: string; encerramento: string;
}

export const NONCONFORMITIES: NonConformity[] = [];

export interface StockEntry {
  id: string; data: string; nf: string; fornecedor: string; produto: string;
  quantidade: number; valor: number; lote: string; validade: string; conferente: string;
}

export const STOCK_ENTRIES: StockEntry[] = [];

export interface ParamLog {
  id: string; data: string; parametro: string; anterior: string; novo: string; usuario: string;
}

export const PARAM_LOGS: ParamLog[] = [];

export const FORNECEDORES = ["DBS PRODUTOS HOSPITALARES"];
