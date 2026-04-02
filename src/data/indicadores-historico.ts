import type { IndicadorInputs } from "@/hooks/useIndicadorCalculos";

export interface IndicadorRegistro {
  id: string;
  nome: string;
  mes: string;
  ano: number;
  setor: string;
  inputs: IndicadorInputs;
}

function r(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildInputs(): IndicadorInputs {
  const numPacienteDiaTotal = r(200, 600);
  const numSaidas = r(30, 80);
  const numInfeccoes = r(2, 20);
  const numAdmissoes = r(20, 60);
  const numPacientesUtiInicio = r(5, 25);
  const utilizacaoCVC = r(50, 250);
  const utilizacaoVM = r(30, 200);
  const utilizacaoSVD = r(40, 220);
  return {
    numSaidas,
    numPacienteDiaTotal,
    numInfeccoes,
    numPacientesUtiInicio,
    numDiasUtiInicio: r(100, 400),
    numPacientesUtiSubsequente: r(5, 25),
    numDiasUtiSubsequente: r(100, 400),
    numAdmissoes,
    numAltas: r(20, 60),
    numPacientesInfeccaoHospitalar: r(1, numInfeccoes),
    numObitosTotal: r(0, 8),
    numObitosInfeccao: r(0, 3),
    utilizacaoCVC,
    infeccaoCVC: r(0, 5),
    utilizacaoVM,
    infeccaoVM: r(0, 4),
    utilizacaoSVD,
    infeccaoSVD: r(0, 4),
    infeccaoTratoUrinario: r(0, 5),
    infeccaoSitioCirurgico: r(0, 3),
    infeccaoTratoRespiratorio: r(0, 4),
    infeccaoPele: r(0, 2),
    infeccaoCorrenteSanguinea: r(0, 4),
    outrasInfeccoes: r(0, 2),
    numAntibioticosUtilizados: r(10, 60),
    numInfeccoesImportadas: r(0, 3),
  };
}

const meses = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const setores = ["UTI Adulto", "UTI Neonatal", "Enfermaria", "Centro Cirúrgico"];

// Seed deterministic data
const seed: IndicadorRegistro[] = [];
let idCounter = 0;
for (const ano of [2025, 2026]) {
  const maxMes = ano === 2026 ? 3 : 12;
  for (let m = 0; m < maxMes; m++) {
    for (const setor of setores) {
      idCounter++;
      seed.push({
        id: `ind-${idCounter}`,
        nome: `Registro ${meses[m]} ${ano} - ${setor}`,
        mes: meses[m],
        ano,
        setor,
        inputs: buildInputs(),
      });
    }
  }
}

export const mockIndicadores: IndicadorRegistro[] = seed;
