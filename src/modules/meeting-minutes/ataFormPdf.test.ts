import { describe, it, expect } from 'vitest';
import { buildAtaPdf, followupRows, markdownToPlain, pdfSafe, unitFooterLines } from './ataFormPdf';
import type { Meeting } from './types';

const base: Meeting = {
  hospital_id: 'h', title: 'Reunião', meeting_type: 'ordinary', meeting_character: 'ordinary', status: 'draft',
};

describe('ataFormPdf', () => {
  it('usa o quadro de ações registrado e ignora linhas vazias', () => {
    const rows = followupRows({ ...base, followup_actions: [
      { what: 'Auditorias', who: 'Enfermeiros SCIH', when: 'Jul. a out.', status: 'Em andamento', evidence_location: 'Indicadores' },
      { what: '', who: '', when: '', status: '', evidence_location: '' },
    ] });
    expect(rows).toHaveLength(1);
    expect(rows[0].who).toBe('Enfermeiros SCIH');
  });

  it('cai para as pendências em texto quando o quadro está vazio', () => {
    const rows = followupRows({ ...base, previous_pending_items: '- Item A\n\n- Item B' });
    expect(rows.map(r => r.what)).toEqual(['Item A', 'Item B']);
  });

  it('remove a marcação Markdown do relato gerado pela IA', () => {
    expect(markdownToPlain('## Título\n\n**Negrito** e `código`\n| a | b |\n| --- | --- |')).toBe('Título\n\nNegrito e código\na — b');
  });

  it('troca caracteres que as fontes-padrão do PDF não exibem', () => {
    expect(pdfSafe('≥ 80% → meta ✓')).toBe('>= 80% -> meta x');
    expect(pdfSafe('Caráter – “ordinária”')).toBe('Caráter – “ordinária”');
  });

  it('gera o PDF com relato longo em várias páginas', () => {
    const doc = buildAtaPdf({
      meeting: { ...base, minutes_report: Array(40).fill('Parágrafo do relato com texto suficiente para quebrar em várias linhas no quadro.').join('\n\n'),
        entry_type: 'other', entry_other: 'Reunião mensal', previous_pending_status: 'previous' },
      participants: [{ name: 'Fulano', expected: true, present: true }],
      actionItems: [{ hospital_id: 'h', title: 'Ação', responsible_name: 'SCIH', priority: 'medium', status: 'open', when_text: 'Mês novembro' }],
      hospitalName: 'Hospital Teste',
    });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
  });
});

describe('rodapé da unidade', () => {
  it('monta as linhas no padrão do formulário', () => {
    const { unitLine, unitDetail } = unitFooterLines({
      name: 'Hospital Geral de Nova Iguaçu', short_name: 'HGNI', city: 'Nova Iguaçu', state: 'RJ',
      address: 'Av. Henrique Duque Estrada Meyer', neighborhood: 'Posse', zip_code: '26030-380',
    });
    expect(unitLine).toBe('Unidade de Nova Iguaçu – RJ | HGNI');
    expect(unitDetail).toBe('Av. Henrique Duque Estrada Meyer, Posse, Nova Iguaçu, RJ. CEP 26030-380');
  });
});
