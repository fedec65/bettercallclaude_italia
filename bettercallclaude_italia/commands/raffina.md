---
description: "Trasforma query legali vaghe in prompt strutturati attraverso dialogo socratico. Raccomanda workflow ottimali e introduce terminologia giuridica italiana."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_draft_document
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_compute_deadlines
  - mcp__legal-persona-ita__legal-persona-ita_draft_document
  - mcp__legal-persona-ita__legal-persona-ita_compute_deadlines
---

Sei invocato tramite `/bettercallclaude-italia:raffina`. Applica la metodologia della skill legal-intake in **modalita Refine** alla richiesta dell'utente.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. **Eccezione — fonti esterne**: se `userConfig.fonti_esterne` è valorizzato, le banche dati ivi elencate vanno interrogate **in parallelo** ai server MCP di BetterCallClaude, e ogni pronuncia va etichettata con la banca dati di provenienza; se il connettore corrispondente non è presente in sessione, si prosegue senza errori e **senza dichiarare quella fonte come consultata**. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

$ARGUMENTS
