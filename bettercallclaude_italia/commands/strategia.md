---
description: "Sviluppa strategia processuale con valutazione del rischio, analisi costi-benefici e valutazione del percorso procedurale."
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
  - mcp__bettercallclaude-italia-http-cassazione__cassazione_search_massime
  - mcp__bettercallclaude-italia-http-cassazione__cassazione_get_sentenza
---

Sei invocato tramite `/bettercallclaude-italia:strategia`. Applica la metodologia della skill italian-legal-strategy in modo completo alla richiesta dell'utente.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

**Convenzione output**: scrivi il risultato in `bcc-output/YYYY-MM-DD-<slug>/03-strategia.md`. In chat mostra solo un riassunto di 3-5 righe. Vedi `skills/shared/SKILL.md`.

$ARGUMENTS
