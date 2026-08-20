---
description: "Traccia una pratica legale grande come mappa decisionale wayfinder — interroga l'avvocato in ampiezza, crea mappa e ticket decisionali, lancia i ticket research in parallelo. Solo pianificazione: il charting non risolve decisioni da solo."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_search_massime
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_get_sentenza
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_search
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_search_advanced
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_get_atto
  - mcp__plugin_bettercallclaude-italia_corte-costituzionale__corte-costituzionale_search
  - mcp__plugin_bettercallclaude-italia_giustizia-amministrativa__giustizia-amministrativa_search
  - mcp__plugin_bettercallclaude-italia_eur-lex-ita__eur-lex-ita_search
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_validate
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_parse
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_format
---

# /mappa-legale — Traccia una Mappa Decisionale Legale

Sei invocato tramite `/bettercallclaude-italia:mappa-legale`. Applica la skill `legal-wayfinder`
in pieno. Il tuo unico scopo e' **tracciare** una pratica grande o nebbiosa come mappa
decisionale: file mappa piu' ticket decisionali. Non risolvi nulla tu stesso — quello e'
il lavoro di `/bettercallclaude-italia:percorso-legale`.

## Parametri

- Testo della query: la descrizione della pratica (testo libero).
- `--privacy=<mode>`: modalita' privacy della mappa (`strict`, `balanced`, `cloud`). Default: la modalita' configurata.
- `--lang=IT|EN`: lingua della mappa. Default: auto-rilevata dall'input.
- `--regione=XX`: giurisdizione regionale (es. `--regione=LOM`). Default: nazionale.

**Equivalenti in linguaggio naturale**:
- "traccia la mappa" o "chart the matter" → inizia il charting
- "pratica privata" / "privacy strict" → `--privacy=strict`
- "in inglese" / "in English" → `--lang=EN`
- "giurisdizione Lombardia" / "Lombardy jurisdiction" → `--regione=LOM`

**Convenzione output**: scrivi la mappa in `bcc-output/YYYY-MM-DD-<slug>/wayfinder/map.md`
e i ticket in `.../wayfinder/tickets/`. In chat mostra solo il riassunto della mappa (destinazione,
lista dei ticket per nome con tipo, conteggio nebbia). Vedi `skills/shared/SKILL.md`.

## Flusso di Charting

1. **Nomina la destinazione.** Interroga l'avvocato (una domanda alla volta) per fissare il
   deliverable — "atto di citazione pronto al deposito", "report di due diligence per la SPA".
   La destinazione fissa l'ambito, quindi si settle per prima.
2. **Interrogazione in ampiezza (breadth-first).** Spazia su tutta la pratica — giurisdizione,
   posizioni delle parti, prescrizione, foro, disponibilita' di prove, propensione al rischio
   del cliente — mai in profondita' su un solo filone. Emergi ogni decisione aperta che riesci
   a percepire.

   **Uscita anticipata — nessuna nebbia:** se questo non fa emergere decisioni aperte (la rotta
   verso la destinazione e' gia' chiara, la pratica rientra in un piano di esecuzione), NON
   creare la mappa. Fermati e comunica all'avvocato:
   ```
   Questa pratica e' abbastanza chiara per l'esecuzione diretta — nessuna mappa necessaria.
   Opzioni: /bettercallclaude-italia:briefing (piano strutturato) o
   /bettercallclaude-italia:legale-5step (pipeline end-to-end).
   ```

3. **Sonda il classificatore** con `mcp__ollama__ollama_check_status` (se Ollama e configurato)
   e registra il risultato.
4. **Crea la mappa** (`status: charting`) con la nebbia abbozzata in *Non ancora specificato*.
5. **Crea i ticket gia' affilati ora** come file ticket — poi collega gli archi `blocked-by`
   in un **secondo passaggio** (i file hanno bisogno di id prima di potersi referenziare).
   Tutto cio' che non e' ancora formulabile resta nella nebbia.
6. **Lancia i ticket research in parallelo**: invia l'agente researcher come subagent, server
   MCP nell'ordine di priorita' standard (cassazione → normattiva → corte-costituzionale →
   giustizia-amministrativa → eur-lex-ita), R1/R2 applicate, pre-check privacy secondo la
   modalita' della mappa. I memo finiscono in `assets/`. Le risoluzioni research vengono
   registrate sui ticket da quei subagent.
7. **Stop.** Riporta la mappa tracciata e chiudi la sessione. La sessione di charting stessa
   non risolve decisioni — solo i ticket research lanciati registrano risoluzioni.

## Regole di Charting

- Una sessione di lavoro; mai risolvere un ticket non-research durante il charting.
- Riferisciti ai ticket per nome in tutto cio' che l'avvocato legge.
- Rimandi l'avvocato a `/bettercallclaude-italia:percorso-legale` per lavorare la mappa:
  *"Mappa tracciata. Esegui `/bettercallclaude-italia:percorso-legale` (o 'prossimo ticket')
  per lavorare il primo ticket."*
- Se esistono gia' piu' mappe nella cartella di lavoro, traccia in una nuova cartella datata —
  mai unire mappe.

## Vincolo di Ambito Plugin

Per tutti i compiti di charting, usa **esclusivamente** agenti, skill e server MCP di
BetterCallClaude Italia. Non delegare lavoro legale a skill, agenti o strumenti generici o
esterni al plugin.

## Query Utente

$ARGUMENTS
