import { describe, expect, it } from "vitest";
import { alertasDoMapa, alertasDoPaciente, contarPorGravidade, diasDesde, ordenarAlertas, normalizaRegras, situacaoDosAlertas, REGRAS_PADRAO, type PacienteMonitorado } from "./alertasClinicos";
import { SEM_ISOLAMENTO } from "./precautionStatus";

const hoje = new Date(2026, 9, 30, 10);

const paciente = (extra: Partial<PacienteMonitorado> = {}): PacienteMonitorado => ({
  id: "p1", nome: "Paciente Teste", setor: "UTI", leito: "3", internado: true,
  dataInternacao: "2026-10-25", clinical: {}, isolamento: SEM_ISOLAMENTO, precaucoesRegistradas: 0, ...extra,
});

describe("diasDesde", () => {
  it("aceita aaaa-mm-dd e dd/mm/aaaa", () => {
    expect(diasDesde("2026-10-23", hoje)).toBe(7);
    expect(diasDesde("23/10/2026", hoje)).toBe(7);
    expect(diasDesde("", hoje)).toBeNull();
  });
});

describe("alertasDoPaciente", () => {
  it("não alerta paciente que já saiu", () => {
    expect(alertasDoPaciente(paciente({ internado: false, dataInternacao: "2026-01-01" }), hoje)).toEqual([]);
  });

  it("MDR sem precaução registrada e exame MDR recente", () => {
    const a = alertasDoPaciente(paciente({
      clinical: { labPanel: [{ exame: "Hemocultura", data: "29/10/2026", microrganismo: "KPC", mdr: true }] },
      isolamento: { ...SEM_ISOLAMENTO, mdr: true, precaucoes: ["Contato"], organismos: ["KPC"] },
      precaucoesRegistradas: 0,
    }), hoje);
    const tipos = a.map((x) => x.tipo);
    expect(tipos).toContain("mdr_sem_precaucao");
    expect(tipos).toContain("mdr_recente");
    expect(a.find((x) => x.tipo === "mdr_recente")!.detalhe).toContain("há 1 dia");
  });

  it("MDR com precaução registrada não gera o alerta de falta de precaução", () => {
    const a = alertasDoPaciente(paciente({ isolamento: { ...SEM_ISOLAMENTO, mdr: true, precaucoes: ["Contato"] }, precaucoesRegistradas: 1 }), hoje);
    expect(a.map((x) => x.tipo)).not.toContain("mdr_sem_precaucao");
  });

  it("aerossóis tem prioridade sobre gotículas", () => {
    const a = alertasDoPaciente(paciente({ isolamento: { ...SEM_ISOLAMENTO, precaucoes: ["Aerossóis", "Gotículas"] }, precaucoesRegistradas: 1 }), hoje);
    expect(a.map((x) => x.tipo)).toEqual(["aerossois"]);
  });

  it("dispositivo e antimicrobiano prolongados, com gravidade pelo dobro do prazo", () => {
    const a = alertasDoPaciente(paciente({
      clinical: {
        dispInvasivos: { cvcInsercao: "2026-10-20", svuInsercao: "2026-10-28", vmInsercao: "2026-10-18", vmRetirada: "2026-10-22" },
        antibioticos: [{ nome: "Meropenem", dataInicio: "2026-10-14" }, { nome: "Vancomicina", dataInicio: "2026-10-01", dataFim: "2026-10-10" }],
      },
    }), hoje);
    const cvc = a.find((x) => x.titulo.startsWith("CVC"))!;
    expect(cvc.titulo).toBe("CVC há 10 dias");
    expect(cvc.gravidade).toBe("media");
    expect(a.find((x) => x.titulo.startsWith("SVD"))).toBeUndefined();
    expect(a.find((x) => x.titulo.startsWith("VM"))).toBeUndefined();
    const atb = a.find((x) => x.tipo === "antimicrobiano")!;
    expect(atb.titulo).toBe("Meropenem há 16 dias");
    expect(atb.gravidade).toBe("alta");
    expect(a.filter((x) => x.tipo === "antimicrobiano")).toHaveLength(1);
  });

  it("internação prolongada é informativa", () => {
    const a = alertasDoPaciente(paciente({ dataInternacao: "2026-09-01" }), hoje);
    expect(a).toEqual([expect.objectContaining({ tipo: "internacao", gravidade: "info", titulo: "Internado há 59 dias" })]);
  });
});

describe("alertasDoMapa", () => {
  it("saída pendente, aerossóis, leito vazio e precaução longa", () => {
    const a = alertasDoMapa({
      id: "m1", nome: "Mapa Teste", setor: "Clínica", leito: "", internado: true, precaucao: "Aerossóis",
      organismo: "Tuberculose", dataColeta: "2026-09-15", saidaMonitoramento: { status: "Alta", data: "2026-10-29" },
    }, hoje);
    expect(a.map((x) => x.tipo)).toEqual(["saida_pendente", "aerossois", "sem_leito", "precaucao_longa"]);
    expect(a[0].detalhe).toContain("29/10/2026");
  });
});

describe("ordenar e contar", () => {
  it("alta antes de média antes de informativo", () => {
    const base = { pacienteId: "x", local: "", detalhe: "", titulo: "" };
    const lista = ordenarAlertas([
      { ...base, id: "1", tipo: "internacao", gravidade: "info", paciente: "B" },
      { ...base, id: "2", tipo: "dispositivo", gravidade: "media", paciente: "A" },
      { ...base, id: "3", tipo: "aerossois", gravidade: "alta", paciente: "C" },
    ]);
    expect(lista.map((x) => x.id)).toEqual(["3", "2", "1"]);
    expect(contarPorGravidade(lista)).toEqual({ alta: 1, media: 1, info: 1 });
  });
});

describe("situacaoDosAlertas", () => {
  const base = { pacienteId: "p", paciente: "P", local: "", detalhe: "", titulo: "" };
  const alertas = [
    { ...base, id: "p:dispositivo:cvc", tipo: "dispositivo" as const, gravidade: "media" as const },
    { ...base, id: "p:aerossois", tipo: "aerossois" as const, gravidade: "alta" as const },
    { ...base, id: "p:internacao", tipo: "internacao" as const, gravidade: "info" as const },
  ];
  const trat = (chave: string, status: "visto" | "resolvido", quando: Date) => ({
    id: `${chave}${status}${quando.getTime()}`, hospital_id: "h", paciente_id: "p", alerta_chave: chave, origem: "monitoramento" as const,
    tipo: "dispositivo" as const, gravidade: "media" as const, titulo: "", local: null, status, observacao: null,
    user_id: "u", user_nome: "Ana", created_at: quando.toISOString(),
  });

  it("dispositivo resolvido some só no mesmo dia; aerossóis por 7 dias", () => {
    const ontem = new Date(2026, 9, 29, 15);
    const r = situacaoDosAlertas(alertas, [trat("p:dispositivo:cvc", "resolvido", ontem), trat("p:aerossois", "resolvido", ontem)], hoje);
    expect(r.pendentes.map((a) => a.id)).toEqual(["p:dispositivo:cvc", "p:internacao"]);
    expect(r.resolvidos.map((a) => a.id)).toEqual(["p:aerossois"]);
  });

  it("visto vale para hoje e não depois de uma resolução mais nova", () => {
    const r = situacaoDosAlertas(alertas, [
      trat("p:internacao", "visto", new Date(2026, 9, 30, 8)),
      trat("p:dispositivo:cvc", "visto", new Date(2026, 9, 29, 8)),
    ], hoje);
    expect([...r.vistos.keys()]).toEqual(["p:internacao"]);
    expect(r.vistos.get("p:internacao")!.user_nome).toBe("Ana");
  });
});

describe("regras configuráveis", () => {
  it("normaliza jsonb parcial e ignora valores inválidos", () => {
    const r = normalizaRegras({ dispositivo: { cvc: 10, svu: -2 }, antimicrobiano: "14", internacao: 9999, desativados: ["internacao", "xyz"], ocultar: { dispositivo: 2 } });
    expect(r.dispositivo.cvc).toBe(10);
    expect(r.dispositivo.svu).toBe(REGRAS_PADRAO.dispositivo.svu);
    expect(r.antimicrobiano).toBe(14);
    expect(r.internacao).toBe(REGRAS_PADRAO.internacao);
    expect(r.desativados).toEqual(["internacao"]);
    expect(r.ocultar.dispositivo).toBe(2);
    expect(normalizaRegras(null)).toEqual(REGRAS_PADRAO);
  });

  it("usa os prazos do hospital e desliga tipos", () => {
    const p = paciente({
      dataInternacao: "2026-09-01",
      clinical: { dispInvasivos: { cvcInsercao: "2026-10-20" }, antibioticos: [{ nome: "Cefepime", dataInicio: "2026-10-25" }] },
    });
    const regras = normalizaRegras({ dispositivo: { cvc: 12 }, antimicrobiano: 5, desativados: ["internacao"] });
    const a = alertasDoPaciente(p, hoje, regras);
    expect(a.find((x) => x.tipo === "dispositivo")).toBeUndefined();
    expect(a.find((x) => x.tipo === "antimicrobiano")!.titulo).toBe("Cefepime há 5 dias");
    expect(a.find((x) => x.tipo === "internacao")).toBeUndefined();
  });

  it("dias de ocultação do hospital valem para resolvidos", () => {
    const al = [{ pacienteId: "p", paciente: "P", local: "", detalhe: "", titulo: "", id: "p:dispositivo:cvc", tipo: "dispositivo" as const, gravidade: "media" as const }];
    const t = [{ id: "1", hospital_id: "h", paciente_id: "p", alerta_chave: "p:dispositivo:cvc", origem: "monitoramento" as const, tipo: "dispositivo" as const,
      gravidade: "media" as const, titulo: "", local: null, status: "resolvido" as const, observacao: null, user_id: "u", user_nome: "A", created_at: new Date(2026, 9, 29, 9).toISOString() }];
    expect(situacaoDosAlertas(al, t, hoje).pendentes).toHaveLength(1);
    expect(situacaoDosAlertas(al, t, hoje, normalizaRegras({ ocultar: { dispositivo: 2 } }).ocultar).pendentes).toHaveLength(0);
  });
});
