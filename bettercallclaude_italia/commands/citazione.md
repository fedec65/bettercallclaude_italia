---
description: "Verifica e formatta citazioni giuridiche italiane in IT e EN (Cassazione, tribunali regionali, statuti)."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_search
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_get_atto
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_validate
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_parse
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_format
  - mcp__normattiva__normattiva_search
  - mcp__normattiva__normattiva_get_atto
  - mcp__legal-citations-ita__legal-citations-ita_validate
  - mcp__legal-citations-ita__legal-citations-ita_parse
  - mcp__legal-citations-ita__legal-citations-ita_format
---

Sei invocato tramite `/bettercallclaude-italia:citazione`. Applica la metodologia della skill italian-citation-formats in modo completo alla richiesta dell'utente.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. **Eccezione — fonti esterne**: se `${user_config.fonti_esterne}` si risolve in un valore non vuoto (cioè il placeholder non appare letteralmente), le banche dati ivi elencate vanno interrogate **in parallelo** ai server MCP di BetterCallClaude, e ogni pronuncia va etichettata con la banca dati di provenienza; verifica che il connettore corrispondente sia effettivamente disponibile nella sessione (gli host possono nascondere i tool che non compaiono nell'allowlist): se manca, dillo e prosegui senza errori, **senza dichiarare quella fonte come consultata**. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

$ARGUMENTS
