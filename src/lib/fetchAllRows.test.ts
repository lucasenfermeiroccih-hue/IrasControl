import { describe, expect, it } from "vitest";
import { emParalelo, fetchAllRows } from "./fetchAllRows";

/** Consulta falsa: devolve as linhas do intervalo pedido, como o PostgREST. */
function consulta(total: number, log: number[] = [], erroEm?: number) {
  const linhas = Array.from({ length: total }, (_, i) => i);
  return () => ({
    range: async (a: number, b: number) => {
      log.push(a);
      if (erroEm !== undefined && a === erroEm) return { data: null, error: new Error("falhou") };
      return { data: linhas.slice(a, b + 1), error: null };
    },
  });
}

describe("fetchAllRows", () => {
  it("traz tudo, em ordem, com páginas em lotes paralelos", async () => {
    const log: number[] = [];
    const r = await fetchAllRows<number>(consulta(8500, log), 1000, 4);
    expect(r).toHaveLength(8500);
    expect(r[0]).toBe(0);
    expect(r[8499]).toBe(8499);
    expect(r.every((v, i) => v === i)).toBe(true);
    // 2 lotes de 4 páginas e mais 1 lote até achar a página incompleta
    expect(log).toEqual([0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000]);
  });
  it("total múltiplo do tamanho da página termina na página vazia", async () => {
    expect(await fetchAllRows<number>(consulta(2000), 1000, 4)).toHaveLength(2000);
  });
  it("sem linhas devolve vazio", async () => {
    expect(await fetchAllRows<number>(consulta(0), 1000, 4)).toEqual([]);
  });
  it("propaga erro de qualquer página", async () => {
    await expect(fetchAllRows<number>(consulta(5000, [], 2000), 1000, 4)).rejects.toThrow("falhou");
  });
});

describe("emParalelo", () => {
  it("mantém a ordem e respeita o limite", async () => {
    let ativos = 0;
    let pico = 0;
    const r = await emParalelo([5, 1, 4, 2, 3], 2, async (n) => {
      ativos++; pico = Math.max(pico, ativos);
      await new Promise((res) => setTimeout(res, n));
      ativos--;
      return n * 10;
    });
    expect(r).toEqual([50, 10, 40, 20, 30]);
    expect(pico).toBe(2);
  });
});
