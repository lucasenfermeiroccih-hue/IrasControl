import { describe, expect, it } from "vitest";
import { closeOpenDevices, listOpenDevices, validateRemovals } from "./deviceClosure";

const disp = {
  vmInsercao: "2026-10-01", vmRetirada: "",
  svuInsercao: "2026-10-01", svuRetirada: "2026-10-05",
  cvcInsercao: "2026-09-20", cvcRetirada: "2026-09-30",
  cvcTrocas: [{ insercao: "2026-09-30", retirada: "" }, { insercao: "2026-09-01", retirada: "2026-09-10" }],
  picc: "ignorado",
};

describe("listOpenDevices", () => {
  it("lista só os abertos, incluindo trocas, com rótulo legível", () => {
    const open = listOpenDevices(disp);
    expect(open.map(d => d.slot)).toEqual(["cvcTrocas.0", "vm"]);
    expect(open.find(d => d.slot === "cvcTrocas.0")?.label).toBe("CVC (troca 1)");
    expect(open.find(d => d.slot === "vm")?.insercao).toBe("2026-10-01");
  });

  it("sem dispInvasivos → lista vazia", () => {
    expect(listOpenDevices(undefined)).toEqual([]);
  });
});

describe("closeOpenDevices", () => {
  it("usa a data informada por dispositivo e a da saída para os demais", () => {
    const out = closeOpenDevices(disp, "2026-10-20", { vm: "2026-10-12" });
    expect(out.vmRetirada).toBe("2026-10-12");
    expect(out.cvcTrocas[0].retirada).toBe("2026-10-20");
    expect(out.cvcTrocas[1].retirada).toBe("2026-09-10"); // já fechado, intacto
    expect(out.svuRetirada).toBe("2026-10-05");
    expect(disp.vmRetirada).toBe(""); // não altera o original
  });

  it("nunca encerra antes da inserção", () => {
    const out = closeOpenDevices({ vmInsercao: "2026-10-25" }, "2026-10-20");
    expect(out.vmRetirada).toBe("2026-10-25");
  });
});

describe("validateRemovals", () => {
  const open = listOpenDevices(disp);
  it("exige data para cada dispositivo aberto", () => {
    expect(validateRemovals(open, { vm: "2026-10-10" }, "2026-10-20")).toMatch(/CVC \(troca 1\)/);
  });
  it("recusa retirada antes da inserção ou depois da saída", () => {
    expect(validateRemovals(open, { vm: "2026-09-29", "cvcTrocas.0": "2026-10-01" }, "2026-10-20")).toMatch(/antes da inserção/);
    expect(validateRemovals(open, { vm: "2026-10-21", "cvcTrocas.0": "2026-10-01" }, "2026-10-20")).toMatch(/depois da saída/);
  });
  it("aceita datas válidas", () => {
    expect(validateRemovals(open, { vm: "2026-10-20", "cvcTrocas.0": "2026-10-01" }, "2026-10-20")).toBeNull();
  });
});
