---
description: "Ricerca in sola lettura su portali legali protetti da login tramite il browser della sessione principale, con gate privacy, allow-list e login manuale."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Task
---

# /bettercallclaude-italia:ricerca-web

Sei invocato tramite `/bettercallclaude-italia:ricerca-web <sito> <domanda>`. Navigazione, riconsegna manuale del login e raccolta in sola lettura avvengono sempre in questa sessione principale. Applica la metodologia della skill `legal-web-research` alla richiesta dell'utente.

## Modi di esecuzione

- **Consegna diretta (default)**: applica la skill per intero, inclusa la consegna finale da questa sessione principale. Non delegare la stessa ricerca per sintesi successivamente.
- **Raccolta per sintesi delegata**: usa questa modalità solo se il chiamante richiede esplicitamente la sintesi da `web-research-specialist` e il materiale NON proviene dall'area riservata ItalGiure. Applica la skill fino alla raccolta delle fonti, saltandone la sezione Consegna. Da questa sessione principale, avvia `bettercallclaude-italia:web-research-specialist` tramite `Task`, passando il sito originale, la domanda di ricerca e il materiale raccolto con la sua provenienza. Lo specialista scrive i file finali; restituisci entrambi i path che ti fornisce.

**Nota sul connettore browser**: il connettore è fornito dall'host e può risultare non visibile in questa sessione se l'host filtra per l'allow-list del plugin. Se non vedi tool di browser, fermati e spiega che il connettore non è presente o non è visibile in questa sessione; suggerisci all'avvocato: «incolla il testo rilevante o carica un documento», oppure abilita il connettore browser per la sessione e riprova (vedi `commands/start.md`).

**Redirect**: dopo ogni navigazione o redirect, se si atterra su un dominio non approvato, non leggere e non usare il contenuto di quella pagina, non riportarla come fonte, dì quale dominio è stato raggiunto e chiedi consenso esplicito prima di procedere.

## Argomenti

- `<sito>`: sito web o dominio di destinazione (es. `legalis.ch`, `italgiure.it`).
- `<domanda>`: cosa cercare o leggere sul sito.

## Area riservata ItalGiure

Per le massime complete, i Rv., i conformi/difformi e la ricerca per estremi, **delega alla skill `italgiure-browser`**. L'handoff è terminale: non scrivere `02-ricerca-web.md` o `fonti-web.md` e non delegare la sintesi a `web-research-specialist`; i risultati restano nella conversazione, come impone `italgiure-browser`.

## Convenzione output

In consegna diretta, scrivi la memoria completa in `bcc-output/YYYY-MM-DD-<slug>/02-ricerca-web.md` e l'elenco delle fonti in `bcc-output/YYYY-MM-DD-<slug>/fonti-web.md`. In chat fornisci solo un riassunto di 3-5 righe con i path. In sintesi delegata, lo specialista scrive questi file una sola volta; la sessione principale non li riscrive. Vedi `skills/shared/SKILL.md`.

## Ambito plugin

Usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. Generazione file e operazioni di sistema sono esenti.

$ARGUMENTS
