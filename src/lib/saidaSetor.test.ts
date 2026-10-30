import { describe, expect, it } from "vitest";
import { ALTA_OUTRO_SETOR, ehAltaOutroSetor, precaucoesParaMapa } from "./saidaSetor";

describe("ehAltaOutroSetor", () => {
  it("reconhece a alta para outro setor e não a alta hospitalar", () => {
    expect(ehAltaOutroSetor(ALTA_OUTRO_SETOR)).toBe(true);
    expect(ehAltaOutroSetor("transferência interna")).toBe(true);
    expect(ehAltaOutroSetor("Alta")).toBe(false);
    expect(ehAltaOutroSetor("Transferência")).toBe(false);
    expect(ehAltaOutroSetor(null)).toBe(false);
  });
});

describe("precaucoesParaMapa", () => {
  it("leva as precauções em vigor", () => {
    const r = precaucoesParaMapa([
      { precaution_type: "Contato", reason: "KPC", start_date: "2026-10-20T00:00:00", is_active: true },
      { precaution_type: "Gotículas", reason: "Influenza", start_date: "2026-09-01", is_active: false },
    ], [], "2026-10-30");
    expect(r).toEqual([{ precaution_type: "Contato", reason: "KPC", start_date: "2026-10-20" }]);
  });

  it("sem precaução avaliada, exame MDR vira precaução de contato", () => {
    const r = precaucoesParaMapa([], [
      { exame: "Hemocultura", data: "25/10/2026", microrganismo: "Klebsiella pneumoniae KPC", mdr: true },
      { exame: "Urina", data: "22/10/2026", microrganismo: "E. coli", mdr: false },
    ], "2026-10-30");
    expect(r).toHaveLength(1);
    expect(r[0].precaution_type).toBe("Contato");
    expect(r[0].start_date).toBe("2026-10-25");
    expect(r[0].reason).toBeTruthy();
  });

  it("precaução já encerrada pela CCIH não volta", () => {
    expect(precaucoesParaMapa([{ precaution_type: "Contato", reason: "KPC", start_date: "2026-10-01", is_active: false }],
      [{ exame: "Hemocultura", data: "25/10/2026", microrganismo: "KPC", mdr: true }], "2026-10-30")).toEqual([]);
    expect(precaucoesParaMapa([], [], "2026-10-30")).toEqual([]);
  });
});
