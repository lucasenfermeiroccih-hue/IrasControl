import { describe, expect, it } from "vitest";
import { XP, conquistas, estatisticas, nivelDe, resumoGamificacao, sequenciaAtual, xpDoNivel, xpPorDia } from "./gamificacao";

describe("xpPorDia", () => {
  it("limita as auditorias do dia e soma tarefas por prioridade", () => {
    const aud = Array.from({ length: 50 }, () => ({ data: "2026-10-28" }));
    const dias = xpPorDia(aud, [{ data: "2026-10-28", prioridade: "high" }, { data: "2026-10-27", prioridade: "x" }]);
    expect(dias.get("2026-10-28")).toBe(XP.tetoAuditoriasDia * XP.auditoria + XP.tarefa.high + XP.diaAtivo);
    expect(dias.get("2026-10-27")).toBe(XP.tarefa.normal + XP.diaAtivo);
  });
});

describe("nivelDe", () => {
  it("segue a curva quadrática", () => {
    expect(nivelDe(0).nivel).toBe(1);
    expect(nivelDe(99).nivel).toBe(1);
    expect(nivelDe(100).nivel).toBe(2);
    expect(nivelDe(xpDoNivel(5)).titulo).toBe("Protetor");
    const n = nivelDe(250);
    expect(n.nivel).toBe(2);
    expect(n.xpParaProximo).toBe(150);
    expect(n.progresso).toBeCloseTo(150 / 300);
  });
  it("mantém o último título nos níveis altos", () => {
    expect(nivelDe(1e7).titulo).toBe("Lenda da Prevenção");
  });
});

describe("sequenciaAtual", () => {
  // 29/10/2026 é quinta-feira
  const hoje = new Date(2026, 9, 29, 10);
  it("conta dias seguidos e pula fim de semana sem registro", () => {
    const dias = new Set(["2026-10-29", "2026-10-28", "2026-10-27", "2026-10-26", "2026-10-23"]);
    expect(sequenciaAtual(dias, hoje)).toBe(5);
  });
  it("hoje sem registro não quebra a sequência de ontem", () => {
    expect(sequenciaAtual(new Set(["2026-10-28", "2026-10-27"]), hoje)).toBe(2);
  });
  it("dia útil sem registro quebra", () => {
    expect(sequenciaAtual(new Set(["2026-10-29", "2026-10-27"]), hoje)).toBe(1);
  });
});

describe("conquistas", () => {
  it("marca obtidas e limita o progresso à meta", () => {
    const aud = Array.from({ length: 120 }, (_, i) => ({ data: `2026-10-${String((i % 20) + 1).padStart(2, "0")}`, tipo: "hand_hygiene" }));
    const est = estatisticas(aud, [{ data: "2026-10-02", prioridade: "high" }], new Set(aud.map((a) => a.data)));
    const c = Object.fromEntries(conquistas(est).map((x) => [x.id, x]));
    expect(c["primeira-tarefa"].obtida).toBe(true);
    expect(c["maos-100"].obtida).toBe(true);
    expect(c["auditor-500"].obtida).toBe(false);
    expect(c["auditor-50"].atual).toBe(50);
    expect(c["mes-15"].obtida).toBe(true);
  });
});

describe("resumoGamificacao", () => {
  it("separa XP do mês e gera 84 dias de mapa", () => {
    const r = resumoGamificacao([{ data: "2026-09-30" }, { data: "2026-10-29" }], [], new Date(2026, 9, 29, 9));
    expect(r.xpTotal).toBe(2 * (XP.auditoria + XP.diaAtivo));
    expect(r.xpMes).toBe(XP.auditoria + XP.diaAtivo);
    expect(r.xpHoje).toBe(XP.auditoria + XP.diaAtivo);
    expect(r.mapaCalor).toHaveLength(84);
    expect(r.mapaCalor[83].dia).toBe("2026-10-29");
  });
});
