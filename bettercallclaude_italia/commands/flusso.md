---
description: "Definisce ed esegue workflow legali multi-agente (due diligence, preparazione contenzioso, ciclo contrattuale, closing immobiliare)."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
  - mcp__bettercallclaude-italia-http-normattiva__normattiva_search
  - mcp__bettercallclaude-italia-http-normattiva__normattiva_search_advanced
  - mcp__bettercallclaude-italia-http-normattiva__normattiva_get_atto
  - mcp__bettercallclaude-italia-http-normattiva__normattiva_elenco_tipi
  - mcp__bettercallclaude-italia-http-corte-costituzionale__corte-costituzionale_search
  - mcp__bettercallclaude-italia-http-corte-costituzionale__corte-costituzionale_get_sentenza
  - mcp__bettercallclaude-italia-http-corte-costituzionale__corte-costituzionale_norme_incostituzionali
  - mcp__bettercallclaude-italia-http-giustizia-amministrativa__giustizia-amministrativa_search
  - mcp__bettercallclaude-italia-http-giustizia-amministrativa__giustizia-amministrativa_get_sentenza
  - mcp__bettercallclaude-italia-http-cassazione__cassazione_search_massime
  - mcp__bettercallclaude-italia-http-cassazione__cassazione_get_sentenza
  - mcp__bettercallclaude-italia-http-eur-lex-ita__eur-lex-ita_search
  - mcp__bettercallclaude-italia-http-eur-lex-ita__eur-lex-ita_get_atto_celex
  - mcp__bettercallclaude-italia-http-legal-citations-ita__legal-citations-ita_validate
  - mcp__bettercallclaude-italia-http-legal-citations-ita__legal-citations-ita_parse
  - mcp__bettercallclaude-italia-http-legal-citations-ita__legal-citations-ita_format
---

Sei invocato tramite `/bettercallclaude-italia:flusso`. Applica le metodologie delle skill italian-legal-strategy e italian-legal-research per definire ed eseguire il workflow richiesto.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

**Convenzione output**: scrivi tutti i file pipeline in `bcc-output/YYYY-MM-DD-<slug>/`. In chat mostra solo un riassunto di 3-5 righe. Vedi `skills/shared/SKILL.md`.

$ARGUMENTS
