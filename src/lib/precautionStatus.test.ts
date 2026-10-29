import { describe, expect, it } from "vitest";
import {
  chaveNome, chaveProntuario, codigoOrganismo, dataISO, maisRestritiva, precaucaoDoOrganismo,
  situacaoIsolamento, textoIndicaMdr, tipoPrecaucao,
} from "./precautionStatus";

describe("tipos de precaução", () => {
  it("padroniza o texto e escolhe a mais restritiva", () => {
    expect(tipoPrecaucao("contato")).toBe("Contato");
    expect(tipoPrecaucao("Goticulas")).toBe("Gotículas");
    expect(tipoPrecaucao("AEROSSÓIS")).toBe("Aerossóis");
    expect(tipoPrecaucao("padrão")).toBeNull();
    expect(maisRestritiva(["Contato", "Aerossóis", "Gotículas"])).toBe("Aerossóis");
    expect(maisRestritiva([null])).toBeNull();
  });

  it("precaução pelo microrganismo", () => {
    expect(precaucaoDoOrganismo("Mycobacterium tuberculosis")).toBe("Aerossóis");
    expect(precaucaoDoOrganismo("Influenza A")).toBe("Gotículas");
    expect(precaucaoDoOrganismo("ERC / KPC")).toBe("Contato");
  });
});

describe("MDR", () => {
  it("reconhece multirresistentes no texto", () => {
    expect(textoIndicaMdr("ERC / KPC (Enterobactéria resistente a carbapenêmicos)")).toBe(true);
    expect(textoIndicaMdr("MRSA")).toBe(true);
    expect(textoIndicaMdr("ESBL-KP")).toBe(true);
    expect(textoIndicaMdr("Influenza A / B")).toBe(false);
    expect(textoIndicaMdr("Serratia marcescens")).toBe(false);
    expect(textoIndicaMdr("Escherichia coli")).toBe(false);
  });

  it("converte para os códigos do mapa", () => {
    expect(codigoOrganismo("ERC / KPC (Enterobactéria resistente a carbapenêmicos)")).toBe("ERC");
    expect(codigoOrganismo("KPC Klebsiella pneumoniae")).toBe("KPC-KP");
    expect(codigoOrganismo("ESBL (Beta-lactamase de espectro estendido)")).toBe("ESBL");
    expect(codigoOrganismo("VRE (Enterococcus resistente à vancomicina)")).toBe("VRE");
    expect(codigoOrganismo("MRSA (Staphylococcus aureus resistente à meticilina)")).toBe("MRSA");
    expect(codigoOrganismo("Acinetobacter baumannii")).toBe("Acinetobacter baumannii");
  });
});

describe("chaves e datas", () => {
  it("compara prontuário e nome sem formatação", () => {
    expect(chaveProntuario("00123-4")).toBe("1234");
    expect(chaveProntuario(" 1234 ")).toBe("1234");
    expect(chaveNome("  José  da Silva ")).toBe("JOSE DA SILVA");
    expect(dataISO("05/10/2026")).toBe("2026-10-05");
    expect(dataISO("2026-10-05T10:00")).toBe("2026-10-05");
    expect(dataISO("")).toBe("");
  });
});

describe("situacaoIsolamento", () => {
  const lab = [{ exame: "Swab retal", data: "03/10/2026", microrganismo: "ERC / KPC", mdr: true }];

  it("internado com MDR e precaução de contato", () => {
    const s = situacaoIsolamento({
      ativo: true, labPanel: lab,
      precaucoes: [{ patient_id: "p", precaution_type: "Contato", reason: "ERC / KPC", start_date: "2026-10-04" }],
    });
    expect(s.mdr).toBe(true);
    expect(s.precaucoes).toEqual(["Contato"]);
    expect(s.organismos).toEqual(["ERC / KPC"]);
    expect(s.desde).toBe("2026-10-03");
  });

  it("MDR sem precaução registrada: contato por padrão", () => {
    expect(situacaoIsolamento({ ativo: true, labPanel: lab }).precaucoes).toEqual(["Contato"]);
  });

  it("precaução vinda do Mapeamento (mesmo prontuário)", () => {
    const s = situacaoIsolamento({
      ativo: true,
      precaucoesMapa: [{ patient_id: "m", precaution_type: "Gotículas", reason: "INFLUENZA" },
                       { patient_id: "m", precaution_type: "Contato", reason: "KPC-KP | Outros: Serratia" }],
    });
    expect(s.precaucoes).toEqual(["Gotículas", "Contato"]);
    expect(s.mdr).toBe(true);
    expect(s.noMapa).toBe(true);
    expect(s.organismos).toEqual(["INFLUENZA", "KPC-KP", "Serratia"]);
  });

  it("após a alta: mantém o selo MDR, sem precaução em vigor", () => {
    const s = situacaoIsolamento({
      ativo: false, labPanel: lab,
      precaucoes: [{ patient_id: "p", precaution_type: "Contato" }],
    });
    expect(s.mdr).toBe(true);
    expect(s.precaucoes).toEqual([]);
  });

  it("sem nada: sem isolamento", () => {
    const s = situacaoIsolamento({ ativo: true, labPanel: [{ microrganismo: "E. coli", mdr: false }] });
    expect(s).toMatchObject({ mdr: false, precaucoes: [], organismos: [] });
  });
});
