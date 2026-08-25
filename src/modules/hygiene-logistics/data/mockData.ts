import type { ProductLike } from "../utils/logisticsFormulas";

export const HGNI = "Hospital Geral de Nova Iguaçu — HGNI";

export const SETORES = [
  "UTI Adulto", "UTI Neonatal", "Centro Cirúrgico", "CME", "Pronto-Socorro",
  "Maternidade", "Internação Clínica", "Internação Cirúrgica", "Pediatria",
  "Ambulatório", "Área ADM", "Hotelaria/Zeladoria",
];

export const CATEGORIAS = ["Papel", "Sabonete", "Álcool", "Saneante", "Saco Lixo", "EPI", "Equipamento", "Acessório"];

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

const GRADE_LIMPEZA: Array<[string, string, string]> = [
  ["22427","ÁLCOOL GEL 70% BEIRA LEITO 500ML","UNIDADE"],
  ["22428","ALCOOL ESPUMA 1500 ML","UNIDADE"],
  ["22484","ALCOOL GEL PARA HIGIENE DE MÃOS","UNIDADE"],
  ["22479","ALCOOL 70% PARA DISPENSER 800ML","UNIDADE"],
  ["22489","ALCOOL 70% SPRAY PARA DISPENSER 1500ML","UNIDADE"],
  ["22543","ALCOOL LIQUIDO 70% LIMPEZA 1000ML","UNIDADE"],
  ["22485","AVENTAL DE PROTEÇÃO IMPERMEAVEL EM PVC DUPLA FACE LIMP","UNIDADE"],
  ["22592","BALDE DE SUPERFICIE QUADRADO AZUL","UNIDADE"],
  ["22481","BALDE DE SUPERFICIE QUADRADO VERMELHO","UNIDADE"],
  ["22482","BALDE ESPREMEDOR 30 LITROS","UNIDADE"],
  ["2690","BALDE LIMPEZA 8L AZUL","UNIDADE"],
  ["2689","BALDE LIMPEZA 8L VERMELHO","UNIDADE"],
  ["7110","BOMBONA VIRGEM PARA PRODUTOS QUIMICOS 5L","UNIDADE"],
  ["1521","BORRIFADOR UNIVERSAL LEITOSO 500ML","UNIDADE"],
  ["22429","CABO DE ALUMINIO PONTA NÃO ROSQUEADA 1.40 X 22MM","UNIDADE"],
  ["22430","CABO DE ALUMINIO PONTA ROSQUEADA 1.40 X 22MM","UNIDADE"],
  ["2024209","CAIXA COLETORA PERFURO-CORTANTE 13LTS","UNIDADE"],
  ["22431","CAIXA COLETORA PERFURO-CORTANTE 13LTS - LARANJA","UNIDADE"],
  ["22432","CARRO FUNCIONAL PARA LIMPEZA","UNIDADE"],
  ["22490","CERA LIQUIDA IMPERGOLD HS GLX 5 LITROS","UNIDADE"],
  ["22491","CERA LIQUIDA IMPERGOLD UHS GLX 5 LITROS","UNIDADE"],
  ["22492","CERA LIQUIDA PARA PISO MARANSO 5 LITROS","UNIDADE"],
  ["22433","CERA INCOLOR PARA PISO 5 LITROS","UNIDADE"],
  ["22434","DESINFETANTE USO GERAL HOSPITALAR 5 LITROS","UNIDADE"],
  ["6512","DESINFETANTE - BIGUAN 5 LITROS","UNIDADE"],
  ["22493","DESINFETANTE - PRATICO 100 5 LITROS","UNIDADE"],
  ["22494","DESINFETANTE - TOP GLIX 5 LITROS","UNIDADE"],
  ["22435","DETERGENTE NEUTRO GLX 5 LITROS","UNIDADE"],
  ["22495","DETERGENTE NEUTRO TOP DET 5 LITROS","UNIDADE"],
  ["21","DISCO BRANCO 350MM","UNIDADE"],
  ["865","DISCO BRANCO 510MM","UNIDADE"],
  ["28","DISCO PRETO 350MM","UNIDADE"],
  ["866","DISCO PRETO 510MM","UNIDADE"],
  ["31","DISCO VERDE 350MM","UNIDADE"],
  ["870","DISCO VERDE 510MM","UNIDADE"],
  ["22464","ENCERADEIRA INDUSTRIAL 350MM 110V","UNIDADE"],
  ["22465","ENCERADEIRA INDUSTRIAL 350MM 220V","UNIDADE"],
  ["22466","ENCERADEIRA INDUSTRIAL 510MM 110V","UNIDADE"],
  ["22467","ENCERADEIRA INDUSTRIAL 510MM 220V","UNIDADE"],
  ["8763","ESCOVA PLÁSTICA COM SUPORTE PARA LIMPAR VASO SANITÁRIO","UNIDADE"],
  ["4178","ESPONJA DUPLA FACE","UNIDADE"],
  ["22468","ETIQUETA ADESIVA DE BOMBONA","UNIDADE"],
  ["22469","ETIQUETA ADESIVA DE DISPENSER","UNIDADE"],
  ["22470","ETIQUETA ADESIVA DE LIXO COMUM","UNIDADE"],
  ["22471","ETIQUETA ADESIVA DE LIXO INFECTANTE","UNIDADE"],
  ["22472","ETIQUETA ADESIVA DE RASTREABILIDADE","UNIDADE"],
  ["60","ESPONJA FIBRA PARA LIMPEZA LEVE - BRANCA","UNIDADE"],
  ["22541","FIBRAX - FIBRA DE LIMPEZA - PRETA","UNIDADE"],
  ["61","ESPONJA FIBRA PARA LIMPEZA PESADA - VERDE","UNIDADE"],
  ["22438","ACIONADOR PARA DISPENSER (GARRA) - 1500ML","UNIDADE"],
  ["22439","GARRA PARA MOP ÚMIDO","UNIDADE"],
  ["22440","GATILHO PARA BORRIFADOR","UNIDADE"],
  ["22441","SUPORTE DE MOP SECO 40CM","UNIDADE"],
  ["22442","APLICADOR DE CERA 45 CM","UNIDADE"],
  ["8976","HIPOCLORITO DE SÓDIO 1% 5 LITROS","UNIDADE"],
  ["63","HIPOCLORITO DE SODIO 5% CONCENTRADO 5L","UNIDADE"],
  ["1086","LIXEIRA COM PEDAL QUADRADA 30L BRANCO","PAR"],
  ["4891","LIXEIRA COM PEDAL QUADRADA 60L BRANCO","PAR"],
  ["22473","LIXEIRA COM PEDAL QUADRADA 100L BRANCO","PAR"],
  ["22443","LIXEIRA COM PEDAL QUADRADA 200L BRANCO","PAR"],
  ["22444","LUSTRA MOVEIS","PAR"],
  ["22445","APLICADOR DE CERA BRANCA 25CM","PAR"],
  ["67","LUVA DE BORRACHA AMARELA COM FORRO G","PAR"],
  ["22448","LUVA DE BORRACHA AMARELA COM FORRO GG","PAR"],
  ["72","LUVA DE BORRACHA AMARELA COM FORRO M","PAR"],
  ["75","LUVA DE BORRACHA AMARELA COM FORRO P","PAR"],
  ["1283","LUVA DE BORRACHA VERDE COM FORRO G","PAR"],
  ["22449","LUVA DE BORRACHA VERDE COM FORRO GG","PAR"],
  ["1282","LUVA DE BORRACHA VERDE COM FORRO M","PAR"],
  ["1281","LUVA DE BORRACHA VERDE COM FORRO P","PAR"],
  ["22478","REFIL MOP SECO","PAR"],
  ["22620","MOP PÓ ALGODÃO","UNIDADE"],
  ["22549","MOPITA - CABELEIRA DE MOP UMIDO","UNIDADE"],
  ["6520","PÁ COLETORA DE LIXO COM CABO E ARTICULADO","UNIDADE"],
  ["78","PANO DE CHAO","UNIDADE"],
  ["1016","PANO MULTIUSO LIMPEZA PESADA AZUL 33 X 300MT","UNIDADE"],
  ["1017","PANO MULTIUSO LIMPEZA PESADA VERDE 33 X 300MT","UNIDADE"],
  ["22643","PAPEL HIGIENICO 100% CELULOSE - PCT C/ 8 UNIDADES","PACOTE"],
  ["22676","PAPEL TOALHA 100% CELULOSE INTERFOLHADO PCT","PACOTE"],
  ["22644","PAPEL TOALHA 100% CELULOSE ROLO - PCT C/ 6 UNIDADES","PACOTE"],
  ["22450","PASTA LIMPADORA MULTIUSO 500G","UNIDADE"],
  ["6526","PLACA SINALIZAÇÃO PISO MOLHADO","UNIDADE"],
  ["22451","RASPADOR REMOVEDOR DE CERA MULTIUSO","UNIDADE"],
  ["22561","REFIL APLICADOR DE CERA","UNIDADE"],
  ["22452","CABELEIRA DE MOP SECO 40 X 12","UNIDADE"],
  ["22453","CABELEIRA DE MOP UMIDO PONTA DOBRADA","UNIDADE"],
  ["3458","CABELEIRA DE MOP UMIDO COM ROSCA PONTA CORTADA","UNIDADE"],
  ["22454","REMOVEDOR DE CERA 5 LITROS","UNIDADE"],
  ["22497","REMOVEDOR DE CERA CONCENTRATO GLX 5 LITROS","UNIDADE"],
  ["22540","RODO TIPO PROFISSIONAL 40CM","UNIDADE"],
  ["22474","RODO SEM CABO 45CM","UNIDADE"],
  ["22475","RODO SEM CABO 60CM","UNIDADE"],
  ["22455","SABONETE ESPUMA ERVA DOCE 1500ML","UNIDADE"],
  ["22498","SABONETE LIQUIDO PARA DISPENSER 1500ML","UNIDADE"],
  ["89","SABONETE LIQUIDO 800ML","UNIDADE"],
  ["22456","SACO DE RESIDUOS 100L - AZUL","PACOTE"],
  ["22645","SACO DE RESIDUOS INFECTANTE 100LT - BRANCO","PACOTE"],
  ["22457","SACO DE RESIDUOS 200L - AZUL","PACOTE"],
  ["22646","SACO DE RESIDUOS 200L - PRETO","PACOTE"],
  ["22458","SACO DE RESIDUOS 60L - AZUL","PACOTE"],
  ["22647","SACO DE RESIDUOS 60L - BRANCO","PACOTE"],
  ["22648","SACO DE RESIDUOS 60L - PRETO","PACOTE"],
  ["22649","SACO DE RESIDUOS INFECTANTE 200L - BRANCO","PACOTE"],
  ["22557","SACO DE RESIDUOS INFECTANTE 60L - VERMELHO","PACOTE"],
  ["22650","SACO DE RESIDUOS INFECTANTE 100L - VERMELHO","PACOTE"],
  ["22651","SACO DE RESIDUOS INFECTANTE 200L - VERMELHO","PACOTE"],
  ["22558","SACO DE RESIDUOS 60L - VERMELHO","PACOTE"],
  ["22559","SACO DE RESIDUOS 100L - VERMELHO","PACOTE"],
  ["22560","SACO DE RESIDUOS 200L - VERMELHO","PACOTE"],
  ["22652","SACO DE RESIDUOS 100L - PRETO","PACOTE"],
  ["22653","SACO DE RESIDUOS 100L - LARANJA","PACOTE"],
  ["22657","SACO DE RESIDUOS 60L - LARANJA","PACOTE"],
  ["22459","SACO PARA CARRINHO FUNCIONAL 50KG","UNIDADE"],
  ["22460","SUPORTE FIXADOR DE DISCO FLANGE ENCERADEIRA 350MM","UNIDADE"],
  ["22461","SUPORTE FIXADOR DE DISCO FLANGE ENCERADEIRA 510MM","UNIDADE"],
  ["4893","SUPORTE PARA FIBRA LT SEM CABO","UNIDADE"],
  ["22593","TOUCA DESCARTAVEL BRANCA LIMPEZA C/ 100","UNIDADE"],
  ["22462","VÁLVULA DOSADORA PARA DISPENSER ÁLCOOL / SABONETE","UNIDADE"],
  ["22463","VASCULHADO DE TETO","UNIDADE"],
  ["22547","VASSOURA DE CHAPA","UNIDADE"],
  ["2691","VASSOURA PIAÇAVA GARI COM CABO","UNIDADE"],
];

const MOCK_PRODUCTS: HLProduct[] = [
  ["HIG-001","Papel Toalha Folha Dupla","Papel","Fardo (8 pcts)","Pacote",8,45,38,18.5,"A","Alta"],
  ["HIG-002","Papel Higiênico 300m","Papel","Caixa (8 rolos)","Rolo",8,22,30,42,"A","Alta"],
  ["HIG-003","Sabonete Líquido Neutro 5L","Sabonete","Galão","Galão",1,18,25,28,"A","Alta"],
  ["HIG-004","Álcool Gel 70% 5L","Álcool","Galão","Galão",1,8,22,45,"A","Alta"],
  ["HIG-005","Álcool Etílico 70% 1L","Álcool","Caixa (12 un)","Frasco",12,5,18,96,"A","Alta"],
  ["HIG-006","Hipoclorito Sódio 1% 5L","Saneante","Galão","Galão",1,30,20,12,"C","Média"],
  ["HIG-007","Desinfetante Quaternário 5L","Saneante","Galão","Galão",1,12,15,35,"B","Alta"],
  ["HIG-008","Detergente Enzimático 5L","Saneante","Galão","Galão",1,6,10,85,"B","Alta"],
  ["HIG-009","Saco Lixo Infectante 100L","Saco Lixo","Fardo (100 un)","Unidade",100,8,12,120,"A","Alta"],
  ["HIG-010","Saco Lixo Comum 100L","Saco Lixo","Fardo (100 un)","Unidade",100,15,18,65,"A","Média"],
  ["HIG-011","Saco Lixo Comum 30L","Saco Lixo","Fardo (100 un)","Unidade",100,20,22,38,"B","Média"],
  ["HIG-012","Luva Procedimento M","EPI","Caixa (100 un)","Par",50,40,35,32,"A","Alta"],
  ["HIG-013","Avental Descartável","EPI","Pacote (50 un)","Unidade",50,25,30,55,"A","Alta"],
  ["HIG-014","Mop Molhado Refil","Equipamento","Unidade","Unidade",1,15,8,22,"C","Baixa"],
  ["HIG-015","Cabo Mop Universal","Equipamento","Unidade","Unidade",1,20,3,45,"C","Baixa"],
  ["HIG-016","Balde 10L","Equipamento","Unidade","Unidade",1,18,2,18,"C","Baixa"],
  ["HIG-017","Borrifador 500ml","Acessório","Unidade","Unidade",1,30,5,8.5,"C","Baixa"],
  ["HIG-018","Clorexidina Degermante 1L","Saneante","Frasco","Frasco",1,10,12,42,"B","Alta"],
  ["HIG-019","Toalha de Papel Multifolha","Papel","Fardo (6 pcts)","Pacote",6,12,20,32,"B","Média"],
  ["HIG-020","Dispenser Álcool Gel (reparo)","Acessório","Unidade","Unidade",1,5,2,85,"C","Média"],
].map((r, i) => {
  const [codigo, nome, categoria, unidadeEntrada, unidadeSaida, fatorConversao, estoqueVigente, cmm, custoUnitario, curvaABC, criticidade] = r as [
    string, string, string, string, string, number, number, number, number, "A" | "B" | "C", "Alta" | "Média" | "Baixa"
  ];
  return {
    id: codigo,
    codigo, nome, categoria, unidadeEntrada, unidadeSaida, fatorConversao,
    estoqueVigente, cmm, custoUnitario, curvaABC, criticidade,
    leadTime: 7,
    diasSeguranca: 5,
    estoqueAlvoDias: 25,
    status: "Ativo" as const,
    controladoCCIH: ["Papel", "Sabonete", "Álcool", "Saneante", "EPI"].includes(categoria),
    local: `Almox. CCIH — Prateleira ${String.fromCharCode(65 + (i % 6))}${(i % 4) + 1}`,
    lote: `L${2026}${String(100 + i)}`,
    validade: `2027-${String((i % 12) + 1).padStart(2, "0")}-28`,
    ultimaEntrada: `2026-08-${String(((i * 3) % 15) + 1).padStart(2, "0")}`,
    ultimaSaida: `2026-08-${String(((i * 2) % 10) + 6).padStart(2, "0")}`,
    fornecedor: ["Higicorp Distribuidora", "Nova Clean LTDA", "MedSupply RJ", "Baixada Suprimentos"][i % 4],
    pedidoMes: Math.round(cmm * [0.6, 1, 1.4, 1.1, 0][i % 5]),
    historico: h(cmm),
  };
});

export const PRODUCTS: HLProduct[] = [
  ...MOCK_PRODUCTS,
  ...GRADE_LIMPEZA.map(([codigo, nome, apresentacao], i) => {
    const categoria = catFromNome(nome);
    const curvaABC = abcFromCat(categoria);
    const criticidade = critFromCat(categoria);
    return {
      id: codigo,
      codigo,
      nome,
      categoria,
      unidadeEntrada: apresentacao,
      unidadeSaida: apresentacao,
      fatorConversao: 1,
      estoqueVigente: 0,
      cmm: 0,
      custoUnitario: 0,
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
      ultimaEntrada: "",
      ultimaSaida: "",
      fornecedor: "",
      pedidoMes: 0,
      historico: [],
    } as HLProduct;
  }),
];

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

const EQUIP_BASE: [string, number, number, number][] = [
  ["UTI Adulto", 8, 12, 6],
  ["UTI Neonatal", 4, 8, 4],
  ["Centro Cirúrgico", 6, 10, 5],
  ["CME", 2, 4, 2],
  ["Pronto-Socorro", 15, 18, 12],
  ["Maternidade", 12, 14, 8],
  ["Internação Clínica", 18, 16, 10],
  ["Internação Cirúrgica", 16, 14, 8],
  ["Pediatria", 10, 10, 6],
  ["Ambulatório", 8, 6, 4],
  ["Área ADM", 14, 12, 8],
  ["Hotelaria/Zeladoria", 17, 12, 5],
];

export const EQUIPMENT: EquipmentSectorRow[] = EQUIP_BASE.map(([setor, banheiros, dispQuebrados, lixeirasQuebradas], i) => ({
  setor,
  banheiros,
  dispSabonete: banheiros + 2,
  dispAlcool: banheiros + 4,
  dispPapel: banheiros + 1,
  lixeirasComuns: banheiros + 3,
  lixeirasInfectantes: Math.round(banheiros * 0.8) + 2,
  dispQuebrados,
  lixeirasQuebradas,
  ausentes: (i % 4) + 1,
  ultimaVistoria: `2026-08-${String(((i * 2) % 16) + 1).padStart(2, "0")}`,
}));

export const TOTAL_BANHEIROS = 130;
export const TOTAL_DISP_QUEBRADOS = 116;
export const TOTAL_LIXEIRAS_QUEBRADAS = 68;

export interface EquipmentItem {
  id: string; setor: string; tipo: string; local: string;
  status: "Funcionando" | "Quebrado" | "Ausente" | "Inadequado";
  responsavel: string; prazo: string; planoStatus: string;
}

export const EQUIPMENT_ITEMS: EquipmentItem[] = SETORES.flatMap((setor, si) =>
  Array.from({ length: 6 }).map((_, i) => {
    const tipos = ["Dispenser Sabonete", "Dispenser Álcool Gel", "Dispenser Papel Toalha", "Lixeira Comum", "Lixeira Infectante", "Dispenser Papel Higiênico"];
    const statuses: EquipmentItem["status"][] = ["Funcionando", "Quebrado", "Funcionando", "Ausente", "Quebrado", "Inadequado"];
    return {
      id: `EQ-${String(si + 1).padStart(2, "0")}-${i + 1}`,
      setor,
      tipo: tipos[i],
      local: i < 3 ? `Banheiro ${i + 1}` : i === 3 ? "Corredor principal" : "Posto de enfermagem",
      status: statuses[(si + i) % statuses.length],
      responsavel: ["Manutenção Predial", "Hotelaria", "CCIH", "Engenharia Clínica"][(si + i) % 4],
      prazo: `2026-09-${String(((si + i) % 27) + 1).padStart(2, "0")}`,
      planoStatus: ["Aberto", "Em andamento", "Concluído"][(si + i) % 3],
    };
  }),
);

export interface SectorOutput {
  id: string; data: string; turno: "Manhã" | "Tarde" | "Noite"; setor: string;
  produto: string; solicitada: number; sugerida: number; liberada: number;
  respSolicitacao: string; respSeparacao: string; respRetirada: string;
  status: string; justificativa: string; observacao: string;
}

export const SECTOR_OUTPUTS: SectorOutput[] = SETORES.flatMap((setor, si) =>
  Array.from({ length: 5 }).map((_, i) => {
    const p = PRODUCTS[(si + i * 3) % PRODUCTS.length];
    const sugerida = 4 + ((si + i) % 6);
    const liberada = sugerida + [(0), (2), (-1), (0), (3)][i];
    return {
      id: `SAI-${si + 1}-${i + 1}`,
      data: `2026-08-${String(18 - i).padStart(2, "0")}`,
      turno: (["Manhã", "Tarde", "Noite"] as const)[(si + i) % 3],
      setor,
      produto: p.nome,
      solicitada: sugerida + 1,
      sugerida,
      liberada,
      respSolicitacao: ["Enf. Marina", "Enf. Carlos", "Téc. Julia"][(si + i) % 3],
      respSeparacao: ["Almox. Pedro", "Almox. Ana"][(si + i) % 2],
      respRetirada: ["Aux. Rita", "Aux. Bruno"][(si + i) % 2],
      status: liberada === sugerida ? "Liberado" : liberada > sugerida ? "Liberado acima" : "Liberado parcial",
      justificativa: liberada !== sugerida ? "Demanda extra por isolamento de contato" : "",
      observacao: "",
    };
  }),
);

export interface CleaningTask {
  id: string; data: string; setor: string; tipo: string; frequencia: string;
  turno: string; previsto: string; realizado: string; profissional: string;
  supervisor: string; status: "Previsto" | "Em andamento" | "Concluído" | "Atrasado" | "Não realizado" | "Reprogramado";
  motivo: string; evidencia: string; observacao: string;
}

export const CLEANING_TYPES = ["Concorrente", "Terminal", "Imediata", "Banheiro", "Leito", "Isolamento", "Área Crítica", "Posto de Enfermagem", "Programada Semanal", "Programada Mensal"];

export const CLEANING_SCHEDULE: CleaningTask[] = Array.from({ length: 42 }).map((_, i) => {
  const day = 18 - Math.floor(i / 6);
  const statuses: CleaningTask["status"][] = ["Concluído", "Concluído", "Atrasado", "Concluído", "Não realizado", "Previsto"];
  const status = statuses[i % statuses.length];
  return {
    id: `LIM-${i + 1}`,
    data: `2026-08-${String(day).padStart(2, "0")}`,
    setor: SETORES[i % SETORES.length],
    tipo: CLEANING_TYPES[i % CLEANING_TYPES.length],
    frequencia: ["Diária", "Por turno", "Semanal", "Mensal"][i % 4],
    turno: ["Manhã", "Tarde", "Noite"][i % 3],
    previsto: ["08:00", "14:00", "20:00"][i % 3],
    realizado: status === "Concluído" ? ["08:20", "14:15", "20:35"][i % 3] : "",
    profissional: ["Ana Souza", "João Lima", "Marta Reis", "Carlos Dias"][i % 4],
    supervisor: ["Sup. Fátima", "Sup. Rogério"][i % 2],
    status,
    motivo: status === "Não realizado" ? "Falta de insumo no setor" : "",
    evidencia: status === "Concluído" ? "Checklist assinado" : "",
    observacao: "",
  };
});

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

export const CLEANING_AUDITS: AuditRecordHL[] = [
  { id: "AUD-001", data: "2026-08-14", setor: "UTI Adulto", tipo: "Terminal", auditor: "Enf. CCIH Renata", turno: "Manhã", score: 94, classificacao: "Aprovado", itensConformes: 17, itensAplicaveis: 18 },
  { id: "AUD-002", data: "2026-08-15", setor: "Pronto-Socorro", tipo: "Banheiro", auditor: "Enf. CCIH Renata", turno: "Tarde", score: 84, classificacao: "Aprovado com Ressalva", itensConformes: 16, itensAplicaveis: 19 },
  { id: "AUD-003", data: "2026-08-17", setor: "Internação Clínica", tipo: "Concorrente", auditor: "Téc. CCIH Paulo", turno: "Noite", score: 62, classificacao: "Reprovado", itensConformes: 10, itensAplicaveis: 16 },
];

export interface NonConformity {
  id: string; origem: "Auditoria" | "Manual" | "Alerta"; setor: string; data: string;
  descricao: string; classificacao: "Alta" | "Média" | "Baixa"; responsavel: string;
  prazo: string; status: "Aberta" | "Em andamento" | "Vencida" | "Encerrada";
  acao: string; encerramento: string;
}

export const NONCONFORMITIES: NonConformity[] = [
  { id: "NC-001", origem: "Auditoria", setor: "Internação Clínica", data: "2026-08-17", descricao: "Score de limpeza concorrente abaixo de 70% (62%)", classificacao: "Alta", responsavel: "Sup. Hotelaria", prazo: "2026-08-27", status: "Aberta", acao: "Retreinamento da equipe e reauditoria em 10 dias", encerramento: "" },
  { id: "NC-002", origem: "Alerta", setor: "Pronto-Socorro", data: "2026-08-16", descricao: "18 dispensers quebrados sem reparo há mais de 30 dias", classificacao: "Alta", responsavel: "Manutenção Predial", prazo: "2026-09-05", status: "Em andamento", acao: "Ordem de serviço aberta para substituição em lote", encerramento: "" },
  { id: "NC-003", origem: "Manual", setor: "CME", data: "2026-07-30", descricao: "Detergente enzimático com cobertura inferior ao lead time", classificacao: "Média", responsavel: "Almoxarifado", prazo: "2026-08-10", status: "Vencida", acao: "Compra emergencial solicitada", encerramento: "" },
];

export interface StockEntry {
  id: string; data: string; nf: string; fornecedor: string; produto: string;
  quantidade: number; valor: number; lote: string; validade: string; conferente: string;
}

export const STOCK_ENTRIES: StockEntry[] = PRODUCTS.slice(0, 10).map((p, i) => ({
  id: `ENT-${i + 1}`,
  data: `2026-08-${String(i + 2).padStart(2, "0")}`,
  nf: `NF-${45000 + i}`,
  fornecedor: p.fornecedor,
  produto: p.nome,
  quantidade: Math.round(p.cmm * 0.8),
  valor: Math.round(p.cmm * 0.8 * p.custoUnitario * 100) / 100,
  lote: p.lote,
  validade: p.validade,
  conferente: ["Almox. Pedro", "Almox. Ana"][i % 2],
}));

export interface ParamLog {
  id: string; data: string; parametro: string; anterior: string; novo: string; usuario: string;
}

export const PARAM_LOGS: ParamLog[] = [
  { id: "LOG-1", data: "2026-07-02", parametro: "Lead time padrão", anterior: "10", novo: "7", usuario: "Coord. CCIH" },
  { id: "LOG-2", data: "2026-07-20", parametro: "Dias de segurança", anterior: "3", novo: "5", usuario: "Coord. CCIH" },
  { id: "LOG-3", data: "2026-08-05", parametro: "Cobertura operacional", anterior: "15", novo: "20", usuario: "Diretoria Assistencial" },
];

export const FORNECEDORES = ["Higicorp Distribuidora", "Nova Clean LTDA", "MedSupply RJ", "Baixada Suprimentos"];
