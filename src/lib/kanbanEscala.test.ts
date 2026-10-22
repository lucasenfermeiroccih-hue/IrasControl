import { describe, expect, it } from "vitest";
import { describeDays, isOffDay, worksOn, type Escala } from "./kanbanEscala";

const escala: Escala = { camila: [1, 3, 5], danubia: [2, 4] };
const SEG = 1, TER = 2;

describe("worksOn", () => {
  it("segue a escala e, sem escala, vale todos os dias", () => {
    expect(worksOn(escala, "camila", SEG)).toBe(true);
    expect(worksOn(escala, "camila", TER)).toBe(false);
    expect(worksOn(escala, "lucas", 0)).toBe(true);
  });
});

describe("isOffDay", () => {
  const diaria = { recurrence: "daily", assigned_to_ids: ["camila"] };
  const compartilhada = { recurrence: "daily", assigned_to_ids: ["camila", "danubia"] };

  it("tarefa diária some no dia de folga de quem executa", () => {
    expect(isOffDay(diaria, escala, TER, "camila")).toBe(true);
    expect(isOffDay(diaria, escala, SEG, "camila")).toBe(false);
  });

  it("visão do admin: só some quando nenhum responsável trabalha no dia", () => {
    expect(isOffDay(compartilhada, escala, TER)).toBe(false); // Danubia trabalha terça
    expect(isOffDay(compartilhada, escala, 6)).toBe(true);    // sábado: ninguém
  });

  it("semanal, mensal e única não dependem da escala", () => {
    expect(isOffDay({ ...diaria, recurrence: "weekly" }, escala, TER, "camila")).toBe(false);
    expect(isOffDay({ ...diaria, recurrence: "monthly" }, escala, TER)).toBe(false);
  });
});

describe("describeDays", () => {
  it("resume os dias na ordem segunda→domingo", () => {
    expect(describeDays([5, 1, 3])).toBe("Seg, Qua, Sex");
    expect(describeDays(undefined)).toBe("Todos os dias");
    expect(describeDays([0, 1, 2, 3, 4, 5, 6])).toBe("Todos os dias");
  });
});
