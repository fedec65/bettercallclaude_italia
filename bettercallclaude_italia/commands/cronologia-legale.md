---
description: "Costruisce una cronologia legale documentata dai documenti della causa — ogni evento con provenienza obbligatoria, stato non contestato/allegato/contestato, conflitti di date espliciti, lacune probatorie e marcatori di termini facoltativi (sempre indicativi). Output: tabella, HTML interattivo e docx in bcc-output/cronologia/."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_draft_document
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_compute_deadlines
---

# /cronologia-legale — Cronologia Legale Documentata

Sei invocato tramite `/bettercallclaude-italia:cronologia-legale`. Applica la skill `legal-chronology` in modo completo: costruisci una cronologia legale dai documenti della causa dove **nessun evento esiste senza una fonte**.

**Convenzione output**: gli output vanno in `bcc-output/cronologia/` (eccezione deliberata alla regola della cartella datata: la cronologia è un artefatto vivo della causa, aggiornato via `--merge`). In chat mostra solo un riassunto di 3-5 righe con i path. Vedi `skills/shared/SKILL.md`.

## Parametri

- Primo argomento posizionale: path della cartella o lista di path di documenti.
- `--lang=<it|en|de|fr>` — lingua di output (date normalizzate a un unico formato di visualizzazione).
- `--from=<data>` / `--to=<data>` — restringi la finestra temporale (date ISO).
- `--parties=<A,B,...>` — inizializza il registro delle parti.
- `--deadlines` — genera marcatori di termine dagli eventi, esclusivamente dalla tabella di mapping della skill; **ogni marcatore è etichettato indicativo** (non esiste un tool di calcolo automatico dei termini per l'ordinamento italiano).
- `--format=<table|visual|docx|all>` — selezione output, default `all`.
- `--merge` — aggiorna un `bcc-output/cronologia/events.json` esistente invece di ricostruire da zero.

**Equivalenti in linguaggio naturale**:
- "cronologia della causa" o "case timeline" → esegui sulla cartella della causa
- "fatti contestati" o "contested facts" → report focalizzato sugli eventi contestati/allegati
- "confronta le date" o "date conflicts" → report focalizzato sulle righe di conflitto

## Comportamento

### Passo 1: INVENTARIO
Elenca i documenti nei path indicati. Assegna a ciascuno un id inventario (`01-<slug>`, `02-<slug>`, ...). Registra tipo, lingua, leggibilità. I documenti illeggibili vengono segnalati, mai compensati con eventi inventati.

### Passo 2: ESTRAZIONE (delegata)
Per ogni documento, delega all'agente `chronology-builder` con: l'id inventario, il registro delle parti, lo schema evento e i riferimenti di normalizzazione date, e l'`events.json` esistente quando `--merge` è attivo. Raccogli tutti i candidati.

### Passo 3: RICONCILIAZIONE
Per la skill `legal-chronology`: fondi i candidati dello stesso evento tra documenti in un unico evento con più fonti; registra i conflitti di date con ENTRAMBE le date e le fonti; assegna `undisputed`/`alleged`/`contested` con attribuzione; applica la finestra `--from/--to` dopo la fusione (mai prima — i conflitti possono ancorare fuori dalla finestra).

### Passo 4: TERMINI (solo con `--deadlines`)
Mappa gli eventi per `references/deadline-mapping.md`:
- Eventi di notifica/deposito → se il termine ha un `tipo_termine` coperto dal catalogo, calcolalo con `legal-persona-ita_compute_deadlines` (deterministico: art. 155 CPC, proroga a festivi, sospensione feriale) con `basis: compute_deadlines (tool)`; altrimenti tabella dei termini processuali CPC (es. appello 30 giorni dalla notifica, art. 325 CPC) con `basis: tabella-mapping (indicativo)`. Marcatore etichettato con la base normativa.
- Prescrizione sostanziale → tabella di mapping (artt. 2934-2969 CC); nessun tool la copre.
- **Tutti i marcatori sono etichettati indicativo — verificare**: anche il tool emette un disclaimer di computazione ausiliaria; non presentare mai un marcatore come calcolato autorevolmente.

### Passo 5: RENDER
Scrivi `bcc-output/cronologia/events.json`, poi:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/timeline-render.mjs" validate bcc-output/cronologia/events.json
node "${CLAUDE_PLUGIN_ROOT}/scripts/timeline-render.mjs" render bcc-output/cronologia/events.json --outdir bcc-output/cronologia --formats <table|visual|docx|all>
```

Se `validate` rifiuta eventi (fonte mancante), correggili o eliminali prima del rendering — mai aggirare il controllo.

### Passo 6: RIASSUNTO
In chat, 3-5 righe: numero eventi, numero contestati/conflitti, lacune trovate, marcatori di termine (se presenti), path degli output.

## Ambito Plugin

Usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia. Lettura file, lo script di render e le operazioni di sistema sono esenti.

## Query dell'Utente

$ARGUMENTS
