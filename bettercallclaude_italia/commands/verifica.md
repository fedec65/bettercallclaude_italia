---
description: "Valida citazioni giuridiche italiane in bulk — verifica formato, esistenza e coerenza cross-lingua."
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
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_search_advanced
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_elenco_tipi
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_search_massime
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_get_sentenza
  - mcp__plugin_bettercallclaude-italia_eur-lex-ita__eur-lex-ita_search
  - mcp__plugin_bettercallclaude-italia_eur-lex-ita__eur-lex-ita_get_atto_celex
  - mcp__plugin_bettercallclaude-italia_citation-verify-ita__citation-verify-ita_check_existence
---

Sei invocato tramite `/bettercallclaude-italia:verifica`. Applica la metodologia della skill italian-citation-formats con validazione bulk alla richiesta dell'utente.

Per la verifica sostanziale — se ogni citazione *supporta l'affermazione a cui e collegata* — applica la skill `citation-content-verify` (esistenza + implicazione del contenuto per citazione, con gate di consegna per UNVERIFIED/MISMATCH). Usala quando l'input e una bozza con affermazioni giuridiche anziche una semplice lista di citazioni.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

$ARGUMENTS
