---
description: "Traduce documenti legali italiani tra IT e EN preservando la precisione terminologica giuridica."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
---

Sei invocato tramite `/bettercallclaude-italia:traduci`. Applica la metodologia della skill italian-legal-translation in modo completo alla richiesta dell'utente.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. **Eccezione — fonti esterne**: se `userConfig.fonti_esterne` è valorizzato, le banche dati ivi elencate vanno interrogate **in parallelo** ai server MCP di BetterCallClaude, e ogni pronuncia va etichettata con la banca dati di provenienza; se il connettore corrispondente non è presente in sessione, si prosegue senza errori e **senza dichiarare quella fonte come consultata**. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

**Convenzione output**: scrivi il risultato in `bcc-output/YYYY-MM-DD-<slug>/traduzione-<doc>.md`. In chat mostra solo un riassunto di 3-5 righe. Vedi `skills/shared/SKILL.md`.

$ARGUMENTS
