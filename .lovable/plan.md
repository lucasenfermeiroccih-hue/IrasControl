

# Plan: Connect AI Agents to Real n8n Webhooks

## Overview
Replace mock responses in `sendToAgent` with real HTTP calls to n8n webhook endpoints, authenticated with the logged-in user's Supabase access token.

## Security Note
The n8n webhook URLs are public endpoints that validate the user's JWT server-side. The Supabase access token is obtained from the client session — no secrets are exposed.

## Changes (single file: `src/lib/agent-service.ts`)

### 1. Add webhook URL mapping
Map each agent ID to its n8n webhook slug:

| Agent ID | Webhook slug |
|---|---|
| trend-analyst | analista_de_tendências |
| risk-detector | detector_de_fatores_de_risco |
| report-generator | gerador_de_relatórios_automatizados |
| outbreak-alert | alerta_de_surtos |
| intervention-suggester | sugestor_de_intervenções |
| dashboard-interpreter | interpretador_de_dashboards |
| form-validator | validador_de_formulários |
| anvisa-report | agente_de_relatorios_tecnicos_anvisa_e_vigilância_de_isc |
| micro-report | agente_de_relatórios_microbiológicos_integrados |
| quick-decision | agente_de_tomada_de_decisao_rapida |

Base URL: `https://irascontrol.app.n8n.cloud/webhook/`

### 2. Rewrite `sendToAgent` function
- Import `supabase` client to get the current session's access token via `supabase.auth.getSession()`
- Make a `fetch POST` to the corresponding webhook URL with:
  - Header: `Authorization: bearer <access_token>`
  - Header: `Content-Type: application/json`
  - Body: `{ "input": "<user input>" }`
- Parse the response and return the output text
- If user is not authenticated, throw an error
- Keep mock responses as fallback if the API call fails (graceful degradation)

### 3. No other files change
- `AgentChat.tsx` already calls `sendToAgent` and displays the result
- No UI changes needed

