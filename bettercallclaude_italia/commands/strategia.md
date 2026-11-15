---
description: "Sviluppa strategia processuale con valutazione del rischio, analisi costi-benefici e valutazione del percorso procedurale."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_search
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_search_advanced
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_get_atto
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_search_massime
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_get_sentenza
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_draft_document
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_compute_deadlines
  - mcp__normattiva__normattiva_search
  - mcp__normattiva__normattiva_search_advanced
  - mcp__normattiva__normattiva_get_atto
  - mcp__cassazione__cassazione_search_massime
  - mcp__cassazione__cassazione_get_sentenza
  - mcp__legal-persona-ita__legal-persona-ita_draft_document
  - mcp__legal-persona-ita__legal-persona-ita_compute_deadlines
---

Sei invocato tramite `/bettercallclaude-italia:strategia`. Applica la metodologia della skill italian-legal-strategy in modo completo alla richiesta dell'utente.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. **Eccezione — fonti esterne**: se `${user_config.fonti_esterne}` si risolve in un valore non vuoto (cioè il placeholder non appare letteralmente), le banche dati ivi elencate vanno interrogate **in parallelo** ai server MCP di BetterCallClaude, e ogni pronuncia va etichettata con la banca dati di provenienza; verifica che il connettore corrispondente sia effettivamente disponibile nella sessione (gli host possono nascondere i tool che non compaiono nell'allowlist): se manca, dillo e prosegui senza errori, **senza dichiarare quella fonte come consultata**. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

**Convenzione output**: scrivi il risultato in `bcc-output/YYYY-MM-DD-<slug>/03-strategia.md`. In chat mostra solo un riassunto di 3-5 righe. Vedi `skills/shared/SKILL.md`.

$ARGUMENTS
