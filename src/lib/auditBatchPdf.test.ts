import { describe, expect, it } from "vitest";
import jsPDF from "jspdf";
import { buildAuditsBatchPdf, formatDateBR, sortAuditsForReport, type BatchAudit } from "./auditBatchPdf";

function audit(o: Partial<BatchAudit>): BatchAudit {
  return {
    audit_date: "2026-09-10",
    sector: "UTI 1",
    compliance_rate: 80,
    compliant_items: 4,
    total_items: 5,
    observations: null,
    items: [
      { question: "Higiene das maos antes do procedimento", status: "compliant", category: "Higiene", observation: null, item_order: 1 },
      { question: "Uso de EPI adequado", status: "non_compliant", category: "Higiene", observation: "Sem avental", item_order: 2 },
      { question: "Lixeira com tampa e pedal", status: "not_applicable", category: "Ambiente", observation: null, item_order: 3 },
    ],
    photos: [],
    ...o,
  };
}

const newDoc = () => new jsPDF({ orientation: "p", unit: "mm", format: "a4", compress: false });

describe("buildAuditsBatchPdf", () => {
  it("gera página de resumo + uma seção por auditoria, com paginação", () => {
    const doc = buildAuditsBatchPdf(newDoc(), [
      audit({ sector: "UTI 1", audit_date: "2026-09-02" }),
      audit({ sector: "UPO", audit_date: "2026-09-15", observations: "Reforcar treinamento da equipe" }),
    ], { typeLabel: "Controle de Infeccao", hospitalName: "Hospital Teste", generatedAt: new Date(2026, 9, 5, 10, 0) });

    expect(doc.getNumberOfPages()).toBe(3); // resumo + 2 auditorias
    const out = doc.output();
    expect(out).toContain("Auditoria 1 de 2");
    expect(out).toContain("Auditoria 2 de 2");
    expect(out).toContain("02/09/2026 a 15/09/2026");
    expect(out).toContain("Uso de EPI adequado");
    expect(out).toContain("Obs.: Sem avental");
    expect(out).toContain("Reforcar treinamento da equipe");
    expect(out).toContain("Hospital Teste");
    expect(out).toContain("gina 3 de 3"); // rodapé "Página 3 de 3" (o "á" é codificado à parte)
  });

  it("quebra a página quando a auditoria tem muitos itens", () => {
    const items = Array.from({ length: 120 }, (_, i) => ({
      question: `Item de verificacao numero ${i + 1} com texto suficientemente longo para ocupar uma linha inteira do documento`,
      status: i % 7 === 0 ? "non_compliant" : "compliant",
      category: i < 60 ? "Bloco A" : "Bloco B",
      observation: null,
      item_order: i + 1,
    }));
    const doc = buildAuditsBatchPdf(newDoc(), [audit({ items })], { typeLabel: "Teste" });
    expect(doc.getNumberOfPages()).toBeGreaterThan(2);
    const out = doc.output();
    expect(out).toContain("numero 120");
  });
});

describe("helpers", () => {
  it("ordena cronologicamente e por setor", () => {
    const sorted = sortAuditsForReport([
      { audit_date: "2026-09-10", sector: "UTI 2" },
      { audit_date: "2026-09-01", sector: "UPO" },
      { audit_date: "2026-09-10", sector: "UTI 1" },
    ]);
    expect(sorted.map(s => `${s.audit_date} ${s.sector}`)).toEqual([
      "2026-09-01 UPO", "2026-09-10 UTI 1", "2026-09-10 UTI 2",
    ]);
  });

  it("formata data ISO em DD/MM/AAAA", () => {
    expect(formatDateBR("2026-09-05")).toBe("05/09/2026");
  });
});
