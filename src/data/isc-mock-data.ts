export interface ISCRecord {
  id: string;
  profissional: string;
  mes: number;
  ano: number;
  clinica: "Cirurgia Geral" | "Cirurgia Vascular" | "Neurocirurgia" | "Ortopedia";
  totalCirurgias: number;
  contatosAtendidos: number;
  reinternacoes: number;
  iscConfirmada: number;
  sitio: "ISC superficial" | "ISC profunda" | "ISC de cavidade/órgão";
}

const profissionais = ["Dra. Ana Silva", "Dr. Carlos Mendes", "Dra. Beatriz Lima"];
const clinicas: ISCRecord["clinica"][] = ["Cirurgia Geral", "Cirurgia Vascular", "Neurocirurgia", "Ortopedia"];
const sitios: ISCRecord["sitio"][] = ["ISC superficial", "ISC profunda", "ISC de cavidade/órgão"];

let id = 0;
const records: ISCRecord[] = [];

for (const ano of [2024, 2025]) {
  const maxMes = ano === 2025 ? 3 : 12;
  for (let mes = 1; mes <= maxMes; mes++) {
    for (const profissional of profissionais) {
      for (const clinica of clinicas) {
        const totalCirurgias = Math.floor(Math.random() * 40) + 10;
        const contatosAtendidos = Math.floor(Math.random() * totalCirurgias * 0.9) + 2;
        const reinternacoes = Math.floor(Math.random() * 4);
        const iscConfirmada = Math.floor(Math.random() * 3);
        const sitio = sitios[Math.floor(Math.random() * sitios.length)];
        records.push({
          id: String(++id),
          profissional,
          mes,
          ano,
          clinica,
          totalCirurgias,
          contatosAtendidos,
          reinternacoes,
          iscConfirmada,
          sitio,
        });
      }
    }
  }
}

export const iscMockData: ISCRecord[] = records;
