---
description: "Briefing strutturato pre-esecuzione — assembla un panel di specialisti, raccoglie il contesto della causa e costruisce un piano di esecuzione prima che gli agenti inizino a lavorare."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
---

Sei invocato tramite `/bettercallclaude-italia:briefing`. Applica la metodologia della skill legal-intake in **modalita Briefing** alla richiesta dell'utente.

## Parametri

- `--chart` (o "traccia la mappa"): Bypassa il flusso briefing e indirizza direttamente a `/bettercallclaude-italia:mappa-legale`. Il coordinatore briefing **non** viene invocato. Usato per pratiche troppo grandi o troppo nebbiose per un piano di esecuzione statico.
- `--resume [id]`: Riprende una sessione briefing salvata.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

**Convenzione output**: scrivi il piano in `bcc-output/YYYY-MM-DD-<slug>/piano-briefing.md`. In chat mostra solo un riassunto di 3-5 righe. Vedi `skills/shared/SKILL.md`.

**Fog check**: se la pratica e' troppo nebbiosa per un piano statico (complessita' 8+, o decisioni aperte che dipendono da altre decisioni aperte), fermati prima di costruire il piano e offri: *"Questa pratica e' troppo nebbiosa per un piano statico — tracciamo invece la mappa decisionale?"* → `/bettercallclaude-italia:mappa-legale`

**Convenzione output**: scrivi il piano in `bcc-output/YYYY-MM-DD-<slug>/piano-briefing.md`. In chat mostra solo un riassunto di 3-5 righe. Vedi `skills/shared/SKILL.md`.

$ARGUMENTS
