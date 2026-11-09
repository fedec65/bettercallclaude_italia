# Design — Follow-up B5: rilievi Devin su PR #23 (server)

Data: 2026-11-09
Server: `~/Dev/BetterCallClaudeMCP_Italy` — `main` `fa5ded8` (PR #23 merged 2026-11-09T15:51:13Z)
Spec gemella: `2026-11-08-ricerca-legale-affidabilita-design.md` (rev. 2) — questo documento ne corregge
la parte relativa ai messaggi del server, senza cambiarne l'architettura (la ricerca Cassazione gira
lato client, skill `italgiure-search`).

## Sommario

La review automatica Devin sulla PR #23 è stata pubblicata alle **15:50:07Z**; il merge squash è
avvenuto alle **15:51:13Z**, **66 secondi dopo**. I 4 rilievi non sono stati letti prima del merge:
il check `Devin Review` era verde, ma quel verde significa «analisi completata», non «zero rilievi».

I 4 rilievi sono stati verificati a mano sul codice: **3 sono reali**, 1 è un disaccordo di
formulazione. Nessuno rompe il funzionamento: sono accuratezza dei messaggi, documentazione e
duplicazione di una stringa.

Il follow-up B5 li corregge **senza toccare il contratto pubblico** e introduce una regola di
processo: prima di ogni merge, leggere il corpo della review Devin.

## Rilievi e verdetto

| # | Rilievo Devin | File | Verdetto |
|---|---|---|---|
| 1 | «Local searches misdiagnosed as IP blocks» — il messaggio dichiara un blocco per IP senza aver mai aperto una connessione, e nega («non è un problema di cookie mancante») la causa reale di quel ramo | `mcp-servers/cassazione/src/tools/italgiure-client.ts:225-241` e `:365-375` | **Reale** |
| 2 | «Empty searches lack promised explanation» — la descrizione promette `autenticazione.messaggio` «se la ricerca non restituisce risultati», ma il ramo success con 0 hit non lo espone | `mcp-servers/cassazione/src/index.ts:40-41`, `src/tools/search-massime.ts:39-45` | **Reale** (formulazione) |
| 3 | «Setup guide contradicts the new fallback» — la guida di setup raccomanda ancora `document.cookie`, il cookie `JSESSIONID` e «senza cookie funziona comunque» | `README.md:34-70` | **Reale** |
| 4 | «Verification errors repeat the diagnosis» — `ITALGIURE_BLOCKED_MESSAGE` compare due volte nello stesso errore | `mcp-servers/citation-verify-ita/src/tools/check-existence.ts:183-187` | **Reale** |

## Decisione di progetto — la diagnostica dichiara solo ciò che è osservato

Tre fatti distinti che oggi vengono confusi in un unico messaggio:

- **A. Condizione del ramo** — non è configurato un cookie di sessione: la richiesta **non è stata
  inviata**.
- **B. Fallimento di trasporto osservato** — la connessione è stata tentata e scartata a livello di
  rete (timeout): questo nel deployment di produzione è il blocco noto dell'IP datacenter.
- **C. Contesto di deployment** — il server gira su un IP di datacenter ammesso da ItalGiure solo
  per IP italiani: proprietà statica dell'ambiente, già dichiarata nel banner «LIMITE DI
  RAGGIUNGIBILITÀ» della descrizione dei tool.

La regola: **il messaggio per-risposta descrive A o B; il contesto C resta nella descrizione del
tool.** Oggi il ramo A riporta B, cioè dichiara un timeout che non è mai avvenuto e nega la causa
vera (cookie mancante). In esecuzione locale (stdio) con IP ammesso quel messaggio è falso e
sbaglia: fa credere che il cookie non basti.

## Fix 1 — `mcp-servers/cassazione/src/tools/italgiure-client.ts`

1. Nuova costante `ITALGIURE_MISSING_COOKIE_MESSAGE`: senza cookie la ricerca **non è eseguibile**
   perché **nessuna richiesta è stata inviata**; rimanda alla procedura cookie e al canale client.
2. Rami «senza cookie» di `searchItalgiure` (`:225-241`) e `getSentenzaItalgiure` (`:365-375`):
   `istruzioni = ITALGIURE_MISSING_COOKIE_MESSAGE + ' ' + ITALGIURE_COOKIE_PROCEDURE`.
   Via `ITALGIURE_BLOCKED_MESSAGE`: non è stata osservata alcuna connessione.
3. Il `catch` classifica il fallimento per `parseApiError(error).code` invece di trattare ogni errore
   come blocco datacenter:

   | codice | messaggio |
   |---|---|
   | `API_TIMEOUT`, `API_UNAVAILABLE` | connessione non riuscita **osservata** (timeout a livello di rete): la richiesta non ha raggiunto il servizio; cause possibili = blocco per IP (caso noto e misurato del deployment su IP datacenter) o servizio indisponibile; il cookie non cambia l'esito da un IP non ammesso; canale supportato: skill client |
   | `API_ERROR` con 401/403 | cookie mancante o scaduto — **senza** la coda «resta comunque non raggiungibile per il blocco per IP», non osservata in quel ramo |
   | `RATE_LIMIT_EXCEEDED`, altri | errore specifico + fallback, nessun claim di blocco |

4. Il classificatore è una **funzione pura** `classificaFallimentoItalgiure(code, message)`,
   testabile senza rete.

`ITALGIURE_BLOCKED_MESSAGE` resta il messaggio del banner e dei fallimenti di trasporto osservati.
La formulazione deve essere **compatta con l'osservazione**: «la connessione non ha raggiunto il
servizio (timeout a livello di rete, osservato ora)». Il blocco per IP è citato come **caso noto e
misurato del deployment su IP datacenter**, non come diagnosi universale (un laptop offline non è un
datacenter). Il rinvio al canale client resta in coda.

## Fix 2 — `mcp-servers/cassazione/src/index.ts:40-41`

La descrizione di `cassazione_search_massime` passa da «se la ricerca **non restituisce risultati**»
a «se la ricerca **non è eseguibile**» (suggerimento Devin): il ramo success con 0 hit è una
ricerca eseguita e corretta, e non espone alcun messaggio. Il comportamento del tool **non cambia**,
cambia la promessa.

## Fix 3 — `README.md` (root, «Cassazione — Setup cookie ItalGiure», righe 34-70)

- via `document.cookie` (i cookie dell'area riservata sono HttpOnly: la Console restituisce una
  stringa vuota) e via il nome `JSESSIONID` (non verificato e non più quello della nuova area);
- via «senza il cookie configurato il connettore funziona comunque» (non vero per il deployment di
  produzione);
- la procedura diventa: area riservata → DevTools → scheda **Network** → copia del valore completo
  dell'intestazione **Cookie** della richiesta dati; nota che il server di produzione non
  raggiunge ItalGiure dal proprio IP (misurato) e il canale supportato per la Cassazione è la skill
  lato client; la procedura cookie serve per esecuzioni locali (stdio) o ambienti con IP ammesso.

## Fix 4 — `mcp-servers/citation-verify-ita/src/tools/check-existence.ts:183-187`

L'errore `SOURCE_UNAVAILABLE` usa **solo** `result.fallback.istruzioni` (che contiene già procedura e
diagnosi appropriata al ramo) invece di concatenare `ITALGIURE_BLOCKED_MESSAGE` + `Dettaglio:` +
`istruzioni`. Il prefisso `SOURCE_UNAVAILABLE:` e la struttura dell'errore restano invariati.

## Invarianti

Envelope `{success, data|error, metadata}`, prefisso `SOURCE_UNAVAILABLE:`, nomi dei tool, schemi di
input, campi di `fallback` e priorità delle fonti: **invariati**. Zero dipendenze nuove. Italiano con
accenti propri. Nessuna modifica alla logica di rete: nessun cambio di latenza (il fallback senza
cookie resta istantaneo), nessuna nuova chiamata a ItalGiure.

## Test (TDD)

- `italgiure-client.test.ts`: il ramo «senza cookie» non contiene il messaggio di blocco e contiene
  la procedura; classificatore: timeout → blocco, 401/403 → cookie senza claim di blocco,
  429/500 → errore specifico senza claim di blocco.
- `tool-descriptions.test.ts`: la descrizione non promette un messaggio in caso di zero risultati e
  dice «non è eseguibile».
- `check-existence.test.ts`: l'errore di verifica contiene `SOURCE_UNAVAILABLE` e **una sola** volta
  il messaggio di blocco.

Comandi: `npm run test:run` (root), `npm run build` + `npm run typecheck` (il typecheck richiede
prima il build).

## Rilascio

1. Branch `fix/devin-followup-b5` da `origin/main` (`fa5ded8`).
2. Due commit: fix + test, poi voce di CHANGELOG `[Unreleased]`.
3. PR verso `main`; attendere CI (test 20.x/22.x, lint, docker) **e leggere il corpo della review
   Devin** prima di decidere.
4. Merge squash → deploy automatico Railway.
5. Verifica in produzione con le stesse due chiamate dello Step 3 del piano:
   - `tools/list`: la descrizione contiene il banner con «datacenter»;
   - `tools/call` `cassazione_search_massime` senza cookie: `autenticazione.messaggio` contiene la
     procedura (Network, HttpOnly), **non** contiene «datacenter» e **non** contiene
     `document.cookie`; risposta rapida (nessun timeout).

## Fuori scope (rinviati)

- «Prova SentenzeWeb» nel ramo «sentenza non trovata» (`italgiure-client.ts:403`): già archiviato
  come Minor della review Track B.
- Build di `dist/` cassazione in CI (drift mock↔costante), accenti nei nomi dei test, duplicazione
  descrizioni↔costanti, narrativa datata di `AGENTS.md` (tabella Fonti dati).
- Il modello di autenticazione dell'area riservata (header `Authorization: Basic` invece del cookie)
  è un problema più grande, non risolto da qui: la ricerca Cassazione resta sul canale client.

## Regola di processo

Il merge di una PR non è autorizzato dal solo check `Devin Review` verde: il verde significa
«analisi completata». Prima del merge va letto il corpo della review (e la timeline dei commenti) per
verificare che non ci siano rilievi aperti.
