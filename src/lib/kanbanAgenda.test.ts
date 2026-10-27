import { describe, expect, it } from "vitest";
import {
  addMonths, cicloPlantao, describeAgenda, describeDays, mondayOf, ocorrenciasNoMes, periodoDe, PERIODO_UNICO,
  nomeMes, parseDiasMes, pessoaTrabalha, tarefaNoDia, weekOf, type EscalaMap, type TarefaAgenda,
} from "./kanbanAgenda";

// Outubro/2026: dia 1 é quinta; 26 é segunda.
const SEG = "2026-10-26", TER = "2026-10-27", QUA = "2026-10-28", QUI = "2026-10-29", SAB = "2026-10-31";

const escala: EscalaMap = {
  danubia: { regime: "fixo", dias: [1, 4, 5], plantoes: [] },
  mara: { regime: "fixo", dias: [1, 2, 3, 4, 5], plantoes: [] },
  camila: { regime: "plantao", dias: null, plantoes: ["2026-10-27", "2026-10-30", "2026-11-02"] },
};

const t = (p: Partial<TarefaAgenda>): TarefaAgenda => ({ recurrence: "daily", assigned_to_ids: ["danubia"], ...p });

describe("datas", () => {
  it("segunda-feira e semana", () => {
    expect(mondayOf(QUA)).toBe(SEG);
    expect(mondayOf("2026-11-01")).toBe(SEG); // domingo
    expect(weekOf(QUI)).toHaveLength(7);
    expect(weekOf(QUI)[0]).toBe(SEG);
  });
});

describe("escala", () => {
  it("dias fixos, plantão e sem escala", () => {
    expect(pessoaTrabalha(escala.danubia, SEG)).toBe(true);
    expect(pessoaTrabalha(escala.danubia, TER)).toBe(false);
    expect(pessoaTrabalha(escala.camila, TER)).toBe(true);
    expect(pessoaTrabalha(escala.camila, QUA)).toBe(false);
    expect(pessoaTrabalha(undefined, SAB)).toBe(true);
  });
});

describe("tarefaNoDia", () => {
  it("diária com dias da semana", () => {
    const fichas = t({ dias_semana: [1, 4, 5] });
    expect(tarefaNoDia(fichas, SEG, escala)).toBe(true);
    expect(tarefaNoDia(fichas, TER, escala)).toBe(false);
    expect(tarefaNoDia(t({ dias_semana: [4] }), SEG, escala)).toBe(false);
  });

  it("tarefa de plantão só nas datas do plantão", () => {
    const apoio = t({ assigned_to_ids: ["camila"], no_plantao: true });
    expect(tarefaNoDia(apoio, TER, escala)).toBe(true);
    expect(tarefaNoDia(apoio, QUA, escala)).toBe(false);
  });

  it("dias 10 e 25: no fim de semana passa para a segunda", () => {
    const prev = t({ assigned_to_ids: ["mara"], dias_mes: [10, 25] });
    expect(tarefaNoDia(prev, "2026-10-25", escala)).toBe(false); // domingo
    expect(tarefaNoDia(prev, SEG, escala)).toBe(true);          // segunda 26
    expect(tarefaNoDia(prev, "2026-10-12", escala)).toBe(true); // 10 foi sábado
    expect(tarefaNoDia(prev, "2026-11-10", escala)).toBe(true);
    expect(tarefaNoDia(prev, "2026-11-11", escala)).toBe(false);
  });

  it("plantão no dia 10 ou 25 (sem passar para a segunda)", () => {
    const apoio = t({ assigned_to_ids: ["camila"], no_plantao: true, dias_mes: [10, 25] });
    const esc = { ...escala, camila: { ...escala.camila, plantoes: ["2026-11-10", "2026-11-13"] } };
    expect(tarefaNoDia(apoio, "2026-11-10", esc)).toBe(true);
    expect(tarefaNoDia(apoio, "2026-11-13", esc)).toBe(false);
  });

  it("mensal com janela da 1ª semana", () => {
    const agua = t({ assigned_to_ids: ["mara"], recurrence: "monthly", dias_mes: [1, 2, 3, 4, 5, 6, 7] });
    expect(tarefaNoDia(agua, "2026-11-03", escala)).toBe(true);
    expect(tarefaNoDia(agua, "2026-11-09", escala)).toBe(false);
  });

  it("arquivada não aparece; quadro pessoal só mostra as da pessoa", () => {
    expect(tarefaNoDia(t({ ativo: false }), SEG, escala)).toBe(false);
    expect(tarefaNoDia(t({}), SEG, escala, "mara")).toBe(false);
    expect(tarefaNoDia(t({}), SEG, escala, "danubia")).toBe(true);
  });
});

describe("ocorrências", () => {
  it("período por recorrência", () => {
    expect(periodoDe({ recurrence: "daily" }, QUA)).toBe(QUA);
    expect(periodoDe({ recurrence: "weekly" }, QUA)).toBe(SEG);
    expect(periodoDe({ recurrence: "monthly" }, QUA)).toBe("2026-10-01");
    expect(periodoDe({ recurrence: "once" }, QUA)).toBe(PERIODO_UNICO);
  });

  it("conta as ocorrências do mês", () => {
    // Danúbia (seg, qui, sex) em novembro/2026: 5 seg + 4 qui + 4 sex = 13
    expect(ocorrenciasNoMes(t({ dias_semana: [1, 4, 5] }), "2026-11", escala)).toHaveLength(13);
    // semanal: uma por semana com dia de trabalho no mês
    const semanal = ocorrenciasNoMes(t({ recurrence: "weekly" }), "2026-11", escala);
    expect(semanal.map((o) => o.periodo)).toEqual(["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"]);
    expect(ocorrenciasNoMes(t({ recurrence: "monthly" }), "2026-11", escala)).toHaveLength(1);
  });
});

describe("plantões 12x60", () => {
  it("um plantão a cada 3 dias", () => {
    expect(cicloPlantao("2026-11-02", "2026-11-14")).toEqual(["2026-11-02", "2026-11-05", "2026-11-08", "2026-11-11", "2026-11-14"]);
  });
});

describe("textos", () => {
  it("dias e agenda", () => {
    expect(describeDays([5, 1, 3])).toBe("Seg, Qua, Sex");
    expect(describeDays([1, 2, 3, 4, 5])).toBe("Seg a Sex");
    expect(describeDays(null)).toBe("Todos os dias");
    expect(describeAgenda(t({ dias_semana: [1, 4, 5] }))).toBe("Diária · Seg, Qui, Sex");
    expect(describeAgenda(t({ recurrence: "monthly", dias_mes: [1, 2, 3, 4, 5, 6, 7] }))).toBe("Mensal · dias 1 a 7");
    expect(describeAgenda(t({ no_plantao: true, dias_mes: [10, 25] }))).toBe("Diária · nos plantões · dias 10 e 25");
  });
});

describe("meses e dias do mês", () => {
  it("troca de mês, nome e dias digitados", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(nomeMes("2026-11")).toBe("novembro de 2026");
    expect(parseDiasMes("25, 10 e 10")).toEqual([10, 25]);
    expect(parseDiasMes("")).toBeNull();
  });
});
