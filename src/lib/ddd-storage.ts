import { DDDRegistroMensal } from "@/data/antimicrobianos-ddd";

const STORAGE_KEY = "ddd-registros";

export interface DDDRegistroSalvo {
  id: string;
  criadoEm: string;
  profissional: string;
  dataVigilancia: string;
  mesVigilancia: string;
  anoVigilancia: number;
  pacienteDia: Record<string, number>;
  compiladoUTIs: number;
  linhas: DDDLinhaSalva[];
}

export interface DDDLinhaSalva {
  antimicrobianoId: number;
  nome: string;
  apresentacao: string;
  mgPorUnidade: number;
  quantidade: number;
  totalMg: number;
  totalG: number;
  dddPadrao: number;
  valorAB: number | null;
  indicador: number | null;
}

function generateId(): string {
  return `ddd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function salvarRegistroDDD(registro: Omit<DDDRegistroSalvo, "id" | "criadoEm">): DDDRegistroSalvo {
  const registros = listarRegistrosDDD();
  const novo: DDDRegistroSalvo = {
    ...registro,
    id: generateId(),
    criadoEm: new Date().toISOString(),
  };
  registros.push(novo);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
  return novo;
}

export function listarRegistrosDDD(): DDDRegistroSalvo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function excluirRegistroDDD(id: string): void {
  const registros = listarRegistrosDDD().filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(registros));
}

export function limparRegistrosDDD(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** Converte registros salvos para o formato DDDRegistroMensal consumido pelo dashboard */
export function registrosSalvosParaDashboard(registros: DDDRegistroSalvo[]): DDDRegistroMensal[] {
  const resultado: DDDRegistroMensal[] = [];

  for (const reg of registros) {
    for (const linha of reg.linhas) {
      if (linha.quantidade <= 0) continue;

      resultado.push({
        mes: reg.mesVigilancia,
        ano: reg.anoVigilancia,
        mesNumero: mesParaNumero(reg.mesVigilancia),
        unidade: "Compilado UTIs",
        pacienteDia: reg.compiladoUTIs,
        antimicrobiano: linha.nome,
        quantidadeUnidades: linha.quantidade,
        totalMg: linha.totalMg,
        totalG: linha.totalG,
        dddPadrao: linha.dddPadrao,
        valorAB: linha.valorAB ?? 0,
        indicadorConsumo: linha.indicador ?? 0,
      });
    }
  }

  return resultado;
}

const mesesMap: Record<string, number> = {
  Janeiro: 1, Fevereiro: 2, Março: 3, Abril: 4, Maio: 5, Junho: 6,
  Julho: 7, Agosto: 8, Setembro: 9, Outubro: 10, Novembro: 11, Dezembro: 12,
};

function mesParaNumero(mes: string): number {
  return mesesMap[mes] || 1;
}
