---
name: legal-wayfinder
description: "Scomposizione a mappa decisionale per pratiche legali troppo grandi o troppo nebbiose per una singola sessione. Traccia una mappa (destinazione, decisioni prese, nebbia, fuori ambito) piu ticket decisionali in bcc-output/YYYY-MM-DD-<slug>/wayfinder/, poi lavora i ticket uno alla volta finche la rotta verso il deliverable e chiara, poi passa il testimone all'esecuzione. Attiva quando: si traccia la mappa di una pratica grande (/mappa-legale), si lavora il prossimo ticket decisionale (/percorso-legale), o un briefing e troppo nebbioso per un piano di esecuzione statico. NON attiva per: pratiche normali che rientrano in /briefing o /legale-5step, loop di qualita (legale-obiettivo / legale-loop), o ricerca a domanda singola."
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
  - mcp__cassazione__cassazione_search_massime
  - mcp__cassazione__cassazione_get_sentenza
  - mcp__normattiva__normattiva_search
  - mcp__normattiva__normattiva_search_advanced
  - mcp__normattiva__normattiva_get_atto
  - mcp__corte-costituzionale__corte-costituzionale_search
  - mcp__giustizia-amministrativa__giustizia-amministrativa_search
  - mcp__eur-lex-ita__eur-lex-ita_search
  - mcp__legal-citations-ita__legal-citations-ita_validate
  - mcp__legal-citations-ita__legal-citations-ita_parse
  - mcp__legal-citations-ita__legal-citations-ita_format
---

# Legal Wayfinder — Mappe Decisionali per Pratiche Legali Grandi

Una pratica legale grande arriva avvolta nella nebbia: la rotta dall'intake al deliverable
non e ancora visibile. Il wayfinding trova quella rotta risolvendo **decisioni** — non
eseguendo fette di lavoro. La mappa e il piano; l'esecuzione avviene solo dopo l'handoff.

**Pianifica, non fare.** Ogni ticket risolve una decisione. Memo di supporto e prototipi
vengono linkati come asset, ma nessun deliverable per il cliente viene redatto dentro la
mappa. Una pratica puo derogare nelle **Note** della mappa (portando esecuzione dentro la
mappa); in assenza di deroga, produrre decisioni, non deliverable.

**Riferisci per nome.** In tutto cio che l'avvocato legge, riferisciti a un ticket con il
suo titolo, mai con un id nudo. Gli id viaggiano dentro il nome linkato: `[Prescrizione ancora aperta?](tickets/t01-prescrizione-ancora-aperta.md)`.

## Archiviazione

Tutto vive dentro la cartella della pratica — mai in memory key, mai sincronizzato altrove:

```
bcc-output/YYYY-MM-DD-<slug>/wayfinder/
  map.md
  tickets/
    t01-prescrizione-ancora-aperta.md
    t02-foro-milano-o-tribunale-delle-imprese.md
  assets/          ← memo di ricerca, scalette di prototipo linkati dai ticket
```

## La Mappa (`map.md`)

```markdown
---
matter: <slug>
status: charting | working | ready-for-handoff | handed-off
privacy-mode: strict | balanced | cloud
classifier: ollama | none
jurisdiction: nazionale | <regione>
language: IT | EN
---

## Destinazione
<1–2 righe: il deliverable verso cui questa pratica sta trovando la rotta. Fissa l'ambito;
ogni sessione si orienta qui prima di scegliere un ticket.>

## Note
<skill da consultare (italian-legal-research, privacy-routing, italian-citation-formats),
preferenze permanenti. La deroga di esecuzione per-pratica si esprime qui se serve.>

## Decisioni fin qui
<!-- indice, una riga per ticket risolto: gist + link; mai ripetere il dettaglio -->

## Non ancora specificato
<!-- nebbia: domande in ambito che si percepiscono ma non si sanno ancora formulare con precisione -->

## Fuori ambito
<!-- lavoro consapevolmente escluso oltre la destinazione + perche; non promuove mai -->
```

La mappa e un **indice, non un archivio**: una decisione vive in un unico posto — il suo
ticket. La mappa riassume il gist e linka.

## I Ticket (`tickets/tXX-<slug>.md`)

```markdown
---
id: t01
title: Prescrizione ancora aperta?
type: research
status: open
blocked-by: []
claimed-in: ""
---

## Domanda
<la decisione che questo ticket risolve, dimensionata a una sessione di un agente>

## Risoluzione
<compilata alla chiusura: la decisione + evidenza; asset linkati, mai incollati>
```

### Tipi di ticket

| Tipo | Modo | Risolve | Regole |
|------|------|---------|--------|
| `research` | AFK | Un fatto da cui una decisione dipende (precedente, norma, termine) | Agente researcher + server MCP; memo in `assets/`; R1 (citazioni solo tracciate a ricerca MCP verificata via `legal-citations-ita_validate`) e R2 (quote verbatim) applicate |
| `grilling` | HITL | Fatti del cliente, priorita, propensione al rischio | Conversazione con l'avvocato, una domanda alla volta. **Non rispondere mai al posto dell'umano** — un agente che risponde alle proprie domande di grilling ha violato il ticket |
| `prototype` | HITL | "Come dovrebbero essere/comportarsi le cose" | Artefatto concreto ed economico a cui reagire — scaletta dell'atto di citazione, struttura grezza di una clausola — linkato da `assets/` |
| `task` | HITL o AFK | Lavoro che sblocca una decisione (recuperare il contratto, ottenere atti di causa) | Checklist precisa per avvocato/cliente, o eseguita in autonomia dove possibile; la risoluzione registra cosa e stato fatto e i fatti risultanti da cui ticket successivi dipendono |

## Frontiera e claiming

La **frontiera** e ogni ticket con `status: open`, `claimed-in` vuoto e tutti i ticket in
`blocked-by` con `status: resolved` o `ruled-out`. `/percorso-legale` sceglie il ticket
frontiera col numero piu basso a meno che l'avvocato ne nomini uno. Claim impostando
`claimed-in` a un timestamp di sessione (data + ora ISO) **prima di qualsiasi lavoro**;
rifiutare un ticket gia' claimato. Un ticket per invocazione di `/percorso-legale` — i
ticket research sono l'unica eccezione (possono essere batchati o lanciati in parallelo da
`/mappa-legale`).

## Nebbia (fog of war)

La mappa e deliberatamente incompleta. Oltre i ticket vivi c'e' nebbia — domande che si
percepiscono ma non si sanno ancora formulare con precisione perche' dipendono da decisioni
aperte. Il test:

- **Ticket** quando la domanda e gia' affilata — anche se bloccata.
- **Non ancora specificato** quando non e' ancora formulabile con quella precisione. Non
  pre-affettare la nebbia in pezzi delle dimensioni di un ticket; un blocco puo' promuovere
  piu' ticket, o nessuno.

Risolvere un ticket promuove cio' che ha reso affilato: creare i nuovi ticket
(create-then-wire: collegare gli archi di blocco in un secondo passaggio), e ripulire ogni
blocco promosso da **Non ancora specificato** cosi' che viva solo come suo ticket.

## Fuori ambito

La nebbia si raccoglie solo verso la destinazione; il lavoro oltre e' fuori ambito e non
promuove mai. Quando un ticket vivo si rivela oltre la destinazione, impostalo
`status: ruled-out` (non resolved) e aggiungi una riga in **Fuori ambito**: gist + perche +
link. Resta fuori da **Decisioni fin qui** — un confine di ambito non e un passo della rotta.

## Casi limite

- **Ticket outgrown**: se risolvere un ticket dilaga oltre una sessione di lavoro, dividilo —
  crea i ticket successori piu' eventuale nebbia fresca, e chiudi l'originale `resolved` con
  un puntatore ai figli nella Risoluzione.
- **Ricerca datata**: una risoluzione research in diritto in rapida evoluzione puo' notare
  `revalidate: true`. Riaprirla solo creando un ticket nuovo che referenzia il vecchio — mai
  modificando una risoluzione registrata.

## Privacy (segreto professionale)

La `privacy-mode` della mappa governa ogni ticket; l'hook PreToolUse continua a vigilare
sulle scritture a prescindere. Il `classifier` viene sondato una sola volta al charting
(`mcp__ollama__ollama_check_status`, se Ollama e configurato) — mai ri-sondato per ticket.
Il degrado segue la matrice decisionale di `privacy-routing`:

| Contenuto | classifier: ollama | classifier: none |
|-----------|--------------------|------------------|
| PUBLIC | cloud preferito | cloud OK |
| CONFIDENTIAL | locale preferito | anonimizza → cloud + avviso |
| PRIVILEGED / indeterminabile (strict) | locale richiesto | nessun clear automatico: resta solo locale, o chiedi direttamente all'avvocato prima di qualsiasi chiamata cloud |

Un ticket research che tocca fatti privilegiati senza classifier non fa fallire la mappa:
convertilo in conversazione — chiedi all'avvocato di riformulare la domanda in termini
anonimi, poi procedi come CONFIDENTIAL. Fail closed; mai "inviiamolo e basta".

## Handoff

Passa il testimone solo quando ogni ticket e' `resolved` o `ruled-out` e la nebbia e vuota.
Un ticket claimato conta comunque come aperto — lavoro in volo in un'altra sessione blocca
l'handoff. Quando `/percorso-legale` raggiunge quello stato, imposta
`status: ready-for-handoff` e — invece di fermarti — emetti un **handoff pack**:
destinazione + Decisioni fin qui + asset linkati, sagomato per alimentare il protocollo
Briefing-Sourced Execution dell'orchestratore. Rotta verso `/legale-5step` o l'orchestratore.
Con `--gate`, pre-costruisci un Goal Record `/legale-obiettivo` cosi' l'esecuzione corre sotto
il loop worker-valutatore dal primo giorno. Imposta `status: handed-off` una volta consegnato
il pack.

## Terminazione onesta

Non presentare mai una mappa irrisolta come chiara. Se la mappa e' morta — nebbia non vuota,
niente di promuovibile, nessun ticket aperto — portalo all'avvocato: la destinazione va
ridisegnata o manca input esterno (che e' esso stesso un ticket `task`).

## Vincolo di Ambito Plugin

Per tutti i compiti di wayfinding, usa **esclusivamente** agenti, skill e server MCP di
BetterCallClaude Italia. Non delegare lavoro legale a skill, agenti o strumenti generici o
esterni al plugin.
