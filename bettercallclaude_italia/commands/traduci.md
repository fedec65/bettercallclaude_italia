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

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. **Eccezione — fonti esterne**: se `${user_config.fonti_esterne}` si risolve in un valore non vuoto (cioè il placeholder non appare letteralmente), le banche dati ivi elencate vanno interrogate **in parallelo** ai server MCP di BetterCallClaude, e ogni pronuncia va etichettata con la banca dati di provenienza; verifica che il connettore corrispondente sia effettivamente disponibile nella sessione (gli host possono nascondere i tool che non compaiono nell'allowlist): se manca, dillo e prosegui senza errori, **senza dichiarare quella fonte come consultata**. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

**Convenzione output**: scrivi il risultato in `bcc-output/YYYY-MM-DD-<slug>/traduzione-<doc>.md`. In chat mostra solo un riassunto di 3-5 righe. Vedi `skills/shared/SKILL.md`.

$ARGUMENTS
