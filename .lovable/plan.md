

# Fase 5 — Investigação, Alertas e Resultados Laboratoriais

## Status atual
- Fases 1, 3, 4 e Reports: concluídas
- Faltam: Fase 2 (monitoramento pacientes), Fase 5 (investigação/alertas/lab), Fase 6 (analytics/forms), Fase 7 (admin/settings/CRM/marketplace)

A próxima fase lógica é a **Fase 5**, que inclui 3 telas novas já referenciadas na sidebar.

---

## Telas a implementar

### 1. Notificação e Investigação CCIH (`/cases/investigation`)
- Formulário/lista de casos de investigação
- KPIs: casos abertos, em investigação, concluídos, pendentes
- Tabela de casos com status visual (badges coloridos)
- Dialog para novo caso com: paciente, setor, evento, classificação, dispositivos, critérios diagnósticos
- Checklist de investigação e conclusão/encerramento
- Dados mock (~10 casos)

### 2. Alertas Críticos (`/alerts`)
- Filtros: prioridade (crítico/alto/médio/baixo), tipo, setor
- KPIs: total alertas, críticos ativos, resolvidos hoje
- Lista de alertas com badge de prioridade, ícone por tipo, ações sugeridas
- Detalhes em accordion ou dialog
- Botão "Resolver" / "Escalar"
- Dados mock (~15 alertas)

### 3. Resultados Laboratoriais (`/laboratory-results`)
- Filtros: busca por prontuário, microorganismo, período
- KPIs: total exames, pendentes, com resistência crítica
- Tabela de resultados com perfil de resistência (badges SIR)
- Dialog de detalhes com antibiograma
- Botão importar dados (mock)
- Dados mock (~20 resultados)

---

## Arquivos a criar/editar

| Ação | Arquivo |
|------|---------|
| Criar | `src/pages/CasesInvestigation.tsx` |
| Criar | `src/pages/Alerts.tsx` |
| Criar | `src/pages/LaboratoryResults.tsx` |
| Editar | `src/App.tsx` — adicionar 3 rotas |

A sidebar já tem os links corretos para `/cases/investigation`, `/alerts` e `/laboratory-results`.

## Componentes utilizados
- Shadcn: Card, Badge, Table, Dialog, Select, Calendar/Popover, Accordion, Progress, Tabs
- Recharts para gráficos onde aplicável
- Dados 100% mock, sem backend

