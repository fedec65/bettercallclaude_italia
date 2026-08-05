---
description: "Redige documenti legali italiani inclusi contratti, atti giudiziari, pareri legali e memorie con corretta formattazione delle citazioni."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_validate
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_parse
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_format
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_draft_document
---

Sei invocato tramite `/bettercallclaude-italia:redazione`. Applica la metodologia della skill italian-legal-drafting in modo completo alla richiesta dell'utente.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

**Convenzione output**: scrivi il risultato in `bcc-output/YYYY-MM-DD-<slug>/05-bozza-<doc>.md` (o `.docx` per redline). In chat mostra solo un riassunto di 3-5 righe. Vedi `skills/shared/SKILL.md`.

$ARGUMENTS
