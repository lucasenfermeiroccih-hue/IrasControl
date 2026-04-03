// Mock data: Antimicrobianos com DDD padrão OMS 2020
export interface AntimicrobianoRow {
  id: number;
  nome: string;
  apresentacao: string;
  dddPadrao: number; // em gramas
}

export const antimicrobianosBase: AntimicrobianoRow[] = [
  { id: 1, nome: "Amicacina", apresentacao: "FR AMP 100 mg", dddPadrao: 1 },
  { id: 2, nome: "Amicacina", apresentacao: "FR AMP 250 mg", dddPadrao: 1 },
  { id: 3, nome: "Amicacina", apresentacao: "FR AMP 500 mg", dddPadrao: 1 },
  { id: 4, nome: "Amicacina", apresentacao: "FR AMP 1 g", dddPadrao: 1 },
  { id: 5, nome: "Amoxacilina+clavulanato", apresentacao: "FR AMP 1G", dddPadrao: 1.5 },
  { id: 6, nome: "Ampicilina-sulbactam (base sulbactam)", apresentacao: "FR AMP 1,5G", dddPadrao: 6 },
  { id: 7, nome: "Ampicilina-sulbactam (base sulbactam)", apresentacao: "FR AMP 3G", dddPadrao: 6 },
  { id: 8, nome: "Cefepima", apresentacao: "FR AMP 1G", dddPadrao: 4 },
  { id: 9, nome: "Cefepima", apresentacao: "FR AMP 2G", dddPadrao: 4 },
  { id: 10, nome: "Cefotaxima", apresentacao: "FR AMP 1G", dddPadrao: 4 },
  { id: 11, nome: "Ceftazidima", apresentacao: "FR AMP 1G", dddPadrao: 4 },
  { id: 12, nome: "Ceftazidima-avibactam (base ceftazidima)", apresentacao: "FR AMP 2,5G", dddPadrao: 4 },
  { id: 13, nome: "Ceftolozana-tazobactam (base ceftolozana)", apresentacao: "FR AMP 1,5G", dddPadrao: 2 },
  { id: 14, nome: "Ceftriaxone", apresentacao: "FR AMP 1G", dddPadrao: 2 },
  { id: 15, nome: "Ciprofloxacina", apresentacao: "CP 250 MG", dddPadrao: 0.8 },
  { id: 16, nome: "Ciprofloxacina", apresentacao: "CP 500 MG", dddPadrao: 0.8 },
  { id: 17, nome: "Ciprofloxacina", apresentacao: "FR AMP 200 MG", dddPadrao: 0.8 },
  { id: 18, nome: "Ciprofloxacina", apresentacao: "FR AMP 400 MG", dddPadrao: 0.8 },
  { id: 19, nome: "Ertapenem", apresentacao: "FR AMP 1G", dddPadrao: 1 },
  { id: 20, nome: "Imipenem", apresentacao: "FR AMP 250 MG", dddPadrao: 2 },
  { id: 21, nome: "Imipenem", apresentacao: "FR AMP 500 MG", dddPadrao: 2 },
  { id: 22, nome: "Levofloxacina", apresentacao: "FR AMP 250 MG", dddPadrao: 0.5 },
  { id: 23, nome: "Levofloxacina", apresentacao: "FR AMP 500 MG", dddPadrao: 0.5 },
  { id: 24, nome: "Levofloxacina", apresentacao: "FR AMP 750 MG", dddPadrao: 0.5 },
  { id: 25, nome: "Levofloxacina", apresentacao: "CP 250 MG", dddPadrao: 0.5 },
  { id: 26, nome: "Levofloxacina", apresentacao: "CP 500 MG", dddPadrao: 0.5 },
  { id: 27, nome: "Linezolida", apresentacao: "BOLSA 600 MG", dddPadrao: 1.2 },
  { id: 28, nome: "Linezolida", apresentacao: "CP 600 MG", dddPadrao: 1.2 },
  { id: 29, nome: "Meropenem", apresentacao: "FR AMP 500 MG", dddPadrao: 3 },
  { id: 30, nome: "Meropenem", apresentacao: "FR AMP 1G", dddPadrao: 3 },
  { id: 31, nome: "Meropenem", apresentacao: "FR AMP 2G", dddPadrao: 3 },
  { id: 32, nome: "Moxifloxacino", apresentacao: "BOLSA 400 MG", dddPadrao: 0.4 },
  { id: 33, nome: "Moxifloxacino", apresentacao: "CP 400 MG", dddPadrao: 0.4 },
  { id: 34, nome: "Piperacilina-tazobactam (base piperacilina)", apresentacao: "FR AMP 4,5G", dddPadrao: 14 },
  { id: 35, nome: "Piperacilina-tazobactam (base piperacilina)", apresentacao: "FR AMP 2,25G", dddPadrao: 14 },
  { id: 36, nome: "Sulfato de Polimixina B", apresentacao: "FR AMP 500.000 UI (50 MG)", dddPadrao: 1.5 },
  { id: 37, nome: "Sulfato de Polimixina E", apresentacao: "FR AMP 1.000.000 UI (33 MG)", dddPadrao: 3 },
  { id: 38, nome: "Sulfato de Polimixina E", apresentacao: "FR AMP 4.500.000 UI (150 MG)", dddPadrao: 3 },
  { id: 39, nome: "Teicoplanina", apresentacao: "FR AMP 200 MG", dddPadrao: 0.4 },
  { id: 40, nome: "Teicoplanina", apresentacao: "FR AMP 400 MG", dddPadrao: 0.4 },
  { id: 41, nome: "Vancomicina", apresentacao: "FR AMP 500 MG", dddPadrao: 2 },
  { id: 42, nome: "Vancomicina", apresentacao: "FR AMP 1G", dddPadrao: 2 },
  { id: 43, nome: "Daptomicina", apresentacao: "FR AMP 500 MG", dddPadrao: 0.28 },
  { id: 44, nome: "Tigeciclina", apresentacao: "FR AMP 50 MG", dddPadrao: 0.1 },
  { id: 45, nome: "Anfotericina B", apresentacao: "FR AMP 50MG", dddPadrao: 0.035 },
  { id: 46, nome: "Anfotericina B Lipossomal", apresentacao: "FR AMP 50MG", dddPadrao: 0.035 },
  { id: 47, nome: "Anfotericina B Lipossomal", apresentacao: "FR AMP 100MG", dddPadrao: 0.035 },
  { id: 48, nome: "Anidulafungina", apresentacao: "FR AMP 100MG", dddPadrao: 0.1 },
  { id: 49, nome: "Caspofungina", apresentacao: "FR AMP 50MG", dddPadrao: 0.05 },
  { id: 50, nome: "Fluconazol", apresentacao: "FR 200MG", dddPadrao: 0.2 },
  { id: 51, nome: "Micafungina", apresentacao: "FR AMP 100MG", dddPadrao: 0.1 },
  { id: 52, nome: "Voriconazol", apresentacao: "FR AMP 200MG", dddPadrao: 0.4 },
];

// Mock data para dashboard (múltiplos meses)
export interface DDDRegistroMensal {
  mes: string;
  ano: number;
  mesNumero: number;
  unidade: string;
  pacienteDia: number;
  antimicrobiano: string;
  quantidadeUnidades: number;
  totalMg: number;
  totalG: number;
  dddPadrao: number;
  valorAB: number;
  indicadorConsumo: number;
}

const unidades = ["UTI 1 Adulto", "UTI 2 Adulto", "UTI 3 Adulto", "UTI Neonatal", "UTI Pediátrica", "UPO", "Trauma Clínico"];
const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const topAntimicrobianos = ["Meropenem", "Vancomicina", "Piperacilina-tazobactam (base piperacilina)", "Cefepima", "Ceftriaxone", "Ciprofloxacina", "Linezolida", "Amicacina"];

function randomRange(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 100) / 100;
}

export function generateMockDDDData(): DDDRegistroMensal[] {
  const data: DDDRegistroMensal[] = [];
  for (let ano = 2024; ano <= 2025; ano++) {
    const maxMes = ano === 2025 ? 6 : 12;
    for (let m = 0; m < maxMes; m++) {
      for (const unidade of unidades) {
        const pacienteDia = Math.round(randomRange(200, 600));
        for (const atm of topAntimicrobianos) {
          const base = antimicrobianosBase.find(a => a.nome === atm);
          const qty = Math.round(randomRange(10, 200));
          const mgPerUnit = parseFloat(base?.apresentacao?.match(/(\d+)/)?.[1] || "500");
          const totalMg = qty * mgPerUnit;
          const totalG = totalMg / 1000;
          const dddPadrao = base?.dddPadrao || 1;
          const valorAB = totalG / dddPadrao;
          const indicadorConsumo = pacienteDia > 0 ? (valorAB / pacienteDia) * 1000 : 0;

          data.push({
            mes: meses[m],
            ano,
            mesNumero: m + 1,
            unidade,
            pacienteDia,
            antimicrobiano: atm,
            quantidadeUnidades: qty,
            totalMg,
            totalG,
            dddPadrao,
            valorAB: Math.round(valorAB * 100) / 100,
            indicadorConsumo: Math.round(indicadorConsumo * 100) / 100,
          });
        }
      }
    }
  }
  return data;
}
