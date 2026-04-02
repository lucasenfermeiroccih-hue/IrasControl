import { useMemo } from "react";

export interface IndicadorInputs {
  numSaidas: number;
  numPacienteDiaTotal: number;
  numInfeccoes: number;
  numPacientesUtiInicio: number;
  numDiasUtiInicio: number;
  numPacientesUtiSubsequente: number;
  numDiasUtiSubsequente: number;
  numAdmissoes: number;
  numAltas: number;
  numPacientesInfeccaoHospitalar: number;
  numObitosTotal: number;
  numObitosInfeccao: number;
  utilizacaoCVC: number;
  infeccaoCVC: number;
  utilizacaoVM: number;
  infeccaoVM: number;
  utilizacaoSVD: number;
  infeccaoSVD: number;
  infeccaoTratoUrinario: number;
  infeccaoSitioCirurgico: number;
  infeccaoTratoRespiratorio: number;
  infeccaoPele: number;
  infeccaoCorrenteSanguinea: number;
  outrasInfeccoes: number;
  numAntibioticosUtilizados: number;
  numInfeccoesImportadas: number;
}

export interface IndicadorCalculados {
  taxaSaidas: number | null;
  tempoPermanencia: number | null;
  taxaInfeccao: number | null;
  pacienteExposto: number | null;
  pacienteEmRisco: number | null;
  taxaInfeccaoHospitalar: number | null;
  taxaLetalidade: number | null;
  taxaUtilizacaoCVC: number | null;
  taxaInfeccaoCVC: number | null;
  taxaUtilizacaoVM: number | null;
  taxaInfeccaoVM: number | null;
  taxaUtilizacaoSVD: number | null;
  taxaInfeccaoSVD: number | null;
  taxaInfTratoUrinario: number | null;
  taxaInfSitioCirurgico: number | null;
  taxaInfTratoRespiratorio: number | null;
  taxaInfPele: number | null;
  taxaInfCorrenteSanguinea: number | null;
  taxaUsoAntibioticos: number | null;
}

function safeDiv(numerator: number, denominator: number, multiplier: number): number | null {
  if (!denominator || denominator === 0) return null;
  return Math.round((numerator / denominator) * multiplier * 100) / 100;
}

export function useIndicadorCalculos(v: IndicadorInputs): IndicadorCalculados {
  return useMemo(() => {
    const pacienteExposto = (v.numAdmissoes || 0) + (v.numPacientesUtiInicio || 0);

    const divisorPermanencia = (v.numDiasUtiInicio || 0) + (v.numAdmissoes || 0);
    const numeradorPermanencia = (v.numPacientesUtiInicio || 0) + (v.numPacienteDiaTotal || 0) + (v.numDiasUtiSubsequente || 0);

    return {
      taxaSaidas: safeDiv(v.numInfeccoes, v.numSaidas, 100),
      tempoPermanencia: safeDiv(numeradorPermanencia, divisorPermanencia, 1),
      taxaInfeccao: safeDiv(v.numInfeccoes, v.numPacienteDiaTotal, 1000),
      pacienteExposto: pacienteExposto || null,
      pacienteEmRisco: safeDiv(v.numInfeccoes, pacienteExposto, 100),
      taxaInfeccaoHospitalar: safeDiv(v.numInfeccoes, v.numPacienteDiaTotal, 1000),
      taxaLetalidade: safeDiv(v.numObitosInfeccao, v.numPacientesInfeccaoHospitalar, 100),
      taxaUtilizacaoCVC: safeDiv(v.utilizacaoCVC, v.numPacienteDiaTotal, 1000),
      taxaInfeccaoCVC: safeDiv(v.infeccaoCVC, v.utilizacaoCVC, 1000),
      taxaUtilizacaoVM: safeDiv(v.utilizacaoVM, v.numPacienteDiaTotal, 1000),
      taxaInfeccaoVM: safeDiv(v.infeccaoVM, v.utilizacaoVM, 1000),
      taxaUtilizacaoSVD: safeDiv(v.utilizacaoSVD, v.numPacienteDiaTotal, 1000),
      taxaInfeccaoSVD: safeDiv(v.infeccaoSVD, v.utilizacaoSVD, 1000),
      taxaInfTratoUrinario: safeDiv(v.infeccaoTratoUrinario, v.numPacienteDiaTotal, 1000),
      taxaInfSitioCirurgico: safeDiv(v.infeccaoSitioCirurgico, v.numPacienteDiaTotal, 1000),
      taxaInfTratoRespiratorio: safeDiv(v.infeccaoTratoRespiratorio, v.numPacienteDiaTotal, 1000),
      taxaInfPele: safeDiv(v.infeccaoPele, v.numPacienteDiaTotal, 1000),
      taxaInfCorrenteSanguinea: safeDiv(v.infeccaoCorrenteSanguinea, v.numPacienteDiaTotal, 1000),
      taxaUsoAntibioticos: safeDiv(v.numAntibioticosUtilizados, v.numPacienteDiaTotal, 100),
    };
  }, [v]);
}
