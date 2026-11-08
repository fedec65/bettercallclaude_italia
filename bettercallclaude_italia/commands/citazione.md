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

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. **Eccezione — fonti esterne**: se `userConfig.fonti_esterne` è valorizzato, le banche dati ivi elencate vanno interrogate **in parallelo** ai server MCP di BetterCallClaude, e ogni pronuncia va etichettata con la banca dati di provenienza; se il connettore corrispondente non è presente in sessione, si prosegue senza errori e **senza dichiarare quella fonte come consultata**. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

$ARGUMENTS
