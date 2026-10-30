import { describe, expect, it } from "vitest";
import {
  CONQUISTAS_PADRAO, PONTOS_PADRAO, type Evento, conquistas, estatisticas, nivelDe, normalizaConfig,
  pontosDaTarefa, pontosPorDia, ranking, resumoGamificacao, sequenciaAtual, xpDoNivel,
} from "./gamificacao";

const P = PONTOS_PADRAO;

describe("pontosPorDia", () => {
  it("aplica o teto diário somando todos os tipos de auditoria", () => {
    const ev: Evento[] = [
      { u: "a", d: "2026-10-28", t: "auditoria:hand_hygiene", q: 20 },
      { u: "a", d: "2026-10-28", t: "auditoria:bundles", q: 25 },
      { u: "a", d: "2026-10-28", t: "tarefa_high", q: 1 },
    ];
    const d = pontosPorDia(ev, P).get("2026-10-28")!;
    expect(d.auditorias).toBe(P.teto_auditorias_dia * P.auditoria);
    expect(d.tarefas).toBe(P.tarefa_high);
    expect(d.pontos).toBe(d.auditorias + d.tarefas + P.dia_ativo);
  });
  it("conta preenchimentos com o peso de cada ação", () => {
    const ev: Evento[] = [
      { u: "a", d: "2026-10-27", t: "paciente_cadastro", q: 2 },
      { u: "a", d: "2026-10-27", t: "precaucao", q: 1 },
      { u: "a", d: "2026-10-27", t: "indicador", q: 1 },
    ];
    expect(pontosPorDia(ev, P).get("2026-10-27")!.preenchimentos).toBe(2 * P.paciente_cadastro + P.precaucao + P.indicador);
  });
  it("respeita regras ajustadas (ação com 0 ponto não dá bônus de constância)", () => {
    const cfg = normalizaConfig({ pontos: { exame: 0 } });
    const d = pontosPorDia([{ u: "a", d: "2026-10-27", t: "exame", q: 5 }], cfg.pontos).get("2026-10-27")!;
    expect(d.pontos).toBe(0);
  });
});

describe("ranking", () => {
  it("ordena por pontos, divide empates e ignora quem não pontuou", () => {
    const ev: Evento[] = [
      { u: "a", d: "2026-10-01", t: "tarefa_normal", q: 1 },
      { u: "b", d: "2026-10-01", t: "tarefa_normal", q: 1 },
      { u: "c", d: "2026-10-02", t: "tarefa_high", q: 2 },
      { u: "d", d: "2026-10-02", t: "exame", q: 0 },
    ];
    const r = ranking(ev, [{ id: "a", nome: "Ana" }, { id: "b", nome: "Bia" }, { id: "c", nome: "Caio" }], P);
    expect(r.map((l) => [l.nome, l.posicao])).toEqual([["Caio", 1], ["Ana", 2], ["Bia", 2]]);
    expect(r[0].pontos).toBe(2 * P.tarefa_high + P.dia_ativo);
  });
});

describe("normalizaConfig", () => {
  it("completa com os padrões e descarta valores inválidos", () => {
    const c = normalizaConfig({ pontos: { auditoria: 5, exame: -3, tarefa_high: "x" }, ranking_ativo: false });
    expect(c.pontos.auditoria).toBe(5);
    expect(c.pontos.exame).toBe(P.exame);
    expect(c.pontos.tarefa_high).toBe(P.tarefa_high);
    expect(c.rankingAtivo).toBe(false);
    expect(c.conquistas).toEqual(CONQUISTAS_PADRAO);
  });
  it("aceita conquistas personalizadas e ignora métricas desconhecidas", () => {
    const c = normalizaConfig({ conquistas: [
      { id: "x", nome: "Nova", metrica: "pacientes", meta: 3 },
      { id: "y", nome: "Ruim", metrica: "inexistente", meta: 3 },
    ] });
    expect(c.conquistas).toHaveLength(1);
    expect(c.conquistas[0]).toMatchObject({ id: "x", icone: "🏆", ativa: true });
  });
});

describe("nível e sequência", () => {
  it("curva quadrática de níveis", () => {
    expect(nivelDe(0).nivel).toBe(1);
    expect(nivelDe(100).nivel).toBe(2);
    expect(nivelDe(xpDoNivel(5)).titulo).toBe("Protetor");
    expect(nivelDe(1e7).titulo).toBe("Lenda da Prevenção");
  });
  it("sequência pula fim de semana sem registro", () => {
    const hoje = new Date(2026, 9, 29, 10); // quinta
    expect(sequenciaAtual(new Set(["2026-10-29", "2026-10-28", "2026-10-27", "2026-10-26", "2026-10-23"]), hoje)).toBe(5);
    expect(sequenciaAtual(new Set(["2026-10-29", "2026-10-27"]), hoje)).toBe(1);
  });
});

describe("conquistas e resumo", () => {
  it("calcula métricas e conquistas ativas", () => {
    const ev: Evento[] = [
      { u: "a", d: "2026-10-02", t: "tarefa_high", q: 1 },
      { u: "a", d: "2026-10-03", t: "auditoria:hand_hygiene", q: 120 },
      { u: "a", d: "2026-10-03", t: "paciente_cadastro", q: 3 },
    ];
    const est = estatisticas(ev, pontosPorDia(ev, P));
    expect(est.tarefas).toBe(1);
    expect(est.auditorias_higiene).toBe(120);
    expect(est.pacientes).toBe(3);
    const defs = CONQUISTAS_PADRAO.map((c) => (c.id === "maos-100" ? { ...c, ativa: false } : c));
    const cs = Object.fromEntries(conquistas(defs, est).map((c) => [c.id, c]));
    expect(cs["primeira-tarefa"].obtida).toBe(true);
    expect(cs["maos-100"]).toBeUndefined();
    expect(cs["auditor-50"].atual).toBe(50);
  });
  it("separa pontos do mês por grupo e gera 84 dias de mapa", () => {
    const r = resumoGamificacao([
      { u: "a", d: "2026-09-30", t: "auditoria:bundles", q: 1 },
      { u: "a", d: "2026-10-29", t: "tarefa_normal", q: 1 },
    ], normalizaConfig(null), new Date(2026, 9, 29, 9));
    expect(r.xpMes).toBe(P.tarefa_normal + P.dia_ativo);
    expect(r.mesPorGrupo.tarefas).toBe(P.tarefa_normal);
    expect(r.xpTotal).toBe(P.auditoria + P.tarefa_normal + 2 * P.dia_ativo);
    expect(r.mapaCalor).toHaveLength(84);
  });
  it("pontos da tarefa pela prioridade", () => {
    expect(pontosDaTarefa("high", P)).toBe(P.tarefa_high);
    expect(pontosDaTarefa(null, P)).toBe(P.tarefa_normal);
  });
});
