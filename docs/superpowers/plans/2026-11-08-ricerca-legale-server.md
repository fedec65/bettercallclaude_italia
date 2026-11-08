# Ricerca legale affidabile — Track B (server MCP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far smettere il server MCP di raccontare una diagnosi falsa: oggi dice all'utente «manca il cookie» quando il problema è che il suo IP di datacenter viene scartato da ItalGiure a livello TCP.

**Architecture:** Il server non può cercare in Cassazione e non cambierà. Cambia invece **cosa dice**. Ogni messaggio di fallback che oggi suggerisce «esegui document.cookie» o «prova SentenzeWeb, è gratuito» viene sostituito dalla diagnosi vera — blocco per IP — e dal rimando al canale client-side. `citation-verify-ita` smette di restituire un `SOURCE_UNAVAILABLE` anonimo per le sentenze e nomina la causa.

**Tech Stack:** TypeScript 5.5+, ES Modules (import con estensione `.js`), vitest, MCP SDK. Nessuna dipendenza nuova.

## Global Constraints

- Repository: `/Users/federicocesconi/Dev/BetterCallClaudeMCP_Italy`, branch `dev`.
- Lingua di **tutti** i messaggi user-facing (descrizioni dei tool, `istruzioni`, messaggi di errore) e dei commenti: **italiano**, secondo `AGENTS.md` punto 5.
- Import con estensione `.js` (`import ... from './x.js'`).
- Risposte MCP: envelope `{ success, data, metadata }` o `{ success, error, metadata }`.
- HTTP client: sempre `createHttpClient` + `fetchWithRetry` da `@bettercallclaude-italia/shared`.
- Test: vitest. I test **non devono fare rete**: si mocka `@bettercallclaude-italia/cassazione/italgiure-client` e `@bettercallclaude-italia/normattiva/search-advanced`, come già fatto in `citation-verify-ita/src/__tests__/check-existence.test.ts`.
- Comandi: `npm run test:run` (vitest run — `npm test` e' in watch mode e non termina), `npm run build` (tsc), `npm run typecheck` (tsc --noEmit).
- **Non** modificare il plugin in questo piano. Il Track A è un piano separato (`2026-11-08-ricerca-legale-plugin.md`) ed è già committato: questo piano non deve richiedere nulla dal plugin.
- **Non** implementare l'inversione del gate del cookie né i campi `fonte` / `massimeComplete`: la richiesta pubblica va in timeout esattamente come quella con cookie. Vedi `docs/superpowers/specs/2026-11-08-ricerca-legale-affidabilita-design.md`, sezione «B4 — Cosa non si fa sul server».
- Il prefisso `SOURCE_UNAVAILABLE:` nei messaggi di errore va **mantenuto**: i client che lo riconoscono continuano a funzionare. Si cambia il testo, non il contratto.

## Contesto misurato (non da riscoprire)

`www.italgiure.giustizia.it` scarta a livello TCP le connessioni dal datacenter che ospita i server, **con o senza cookie**. Misurato dal container di produzione:

```
railway ssh --project df2d95e0-4f83-45a8-b40e-f5e6e2a52b27 \
  --environment production --service BetterCallCLaudeMCP-Italia '<comando>'
```

Dal container: `italgiure.giustizia.it` → timeout 30s; `api.normattiva.it` → 409 in 0,23s;
`dati.cortecostituzionale.it` → 200; `openga.giustizia-amministrativa.it` → 200;
`cortedicassazione.it` homepage → 200 ma pagine di ricerca → 403. Il blocco è
specifico di italgiure e non riguarda gli altri canali.


## Corrispondenza con la spec

La spec e' `docs/superpowers/specs/2026-11-08-ricerca-legale-affidabilita-design.md`
(revisione 2).

| Sezione della spec | Task di questo piano |
|---|---|
| B1 — Messaggi di fallback onesti | Task 1 |
| B2 — Descrizioni dei tool | Task 2 |
| B3 — `citation-verify-ita`: degradazione esplicita | Task 3 |
| Release | Task 4 |
| B4 — Cosa non si fa sul server | Vincoli globali e «Cosa NON fa questo piano» |

---

### Task 1: Messaggi di fallback onesti nel client ItalGiure

Oggi il server, quando la ricerca fallisce, suggerisce all'utente due cose false: «esegui document.cookie» (su cookie HttpOnly) e «prova SentenzeWeb, è gratuito e senza login» (per il server non lo è: è lo stesso endpoint bloccato).

**Files:**
- Modify: `mcp-servers/cassazione/src/tools/italgiure-client.ts`

**Interfaces:**
- Consumes: nessuno.
- Produces: due costanti esportate dal modulo, usate da Task 2 e Task 3:
  - `ITALGIURE_BLOCKED_MESSAGE` (`string`) — spiega il blocco per IP e rimanda al canale client-side.
  - `ITALGIURE_COOKIE_PROCEDURE` (`string`) — la procedura corretta per ottenere il cookie (scheda Network, non `document.cookie`).

- [ ] **Step 1: scrivi il test che fallisce**

Aggiungi in `mcp-servers/cassazione/src/__tests__/italgiure-client.test.ts`, in coda al file:

```typescript
describe('messaggi di fallback', () => {
  it('non suggerisce document.cookie', () => {
    expect(ITALGIURE_COOKIE_PROCEDURE).not.toContain('document.cookie');
  });

  it('spiega che il cookie si prende dalla scheda Network', () => {
    expect(ITALGIURE_COOKIE_PROCEDURE).toContain('Network');
  });

  it('nomina il blocco per IP del datacenter', () => {
    expect(ITALGIURE_BLOCKED_MESSAGE).toContain('datacenter');
  });

  it('non promette SentenzeWeb come alternativa per il server', () => {
    expect(ITALGIURE_BLOCKED_MESSAGE).not.toContain('Alternativa gratuita');
  });

  it('rimanda al canale client-side', () => {
    expect(ITALGIURE_BLOCKED_MESSAGE).toContain('italgiure-search');
  });
});
```

e aggiungi le due costanti all'import in testa al file:

```typescript
import {
  buildSolrQuery,
  calculateStart,
  buildPdfUrl,
  getItalgiureCookie,
  ITALGIURE_BLOCKED_MESSAGE,
  ITALGIURE_COOKIE_PROCEDURE,
} from '../tools/italgiure-client.js';
```

- [ ] **Step 2: esegui il test e verifica che fallisce**

Run: `cd mcp-servers/cassazione && npx vitest run src/__tests__/italgiure-client.test.ts`

Expected: FAIL — `ITALGIURE_BLOCKED_MESSAGE` e `ITALGIURE_COOKIE_PROCEDURE` non sono esportati.

- [ ] **Step 3: definisci le costanti e sostituisci i messaggi**

In `mcp-servers/cassazione/src/tools/italgiure-client.ts`, aggiungi subito dopo la dichiarazione di `SOLR_ENDPOINT`:

```typescript
/**
 * Diagnosi del blocco per IP.
 *
 * Misurato dal container di produzione: www.italgiure.giustizia.it scarta a
 * livello TCP le connessioni provenienti dall'IP del datacenter che ospita
 * questo server, con o senza cookie di sessione. Non e' un problema di cookie
 * mancante ne' di cookie scaduto: e' il punto di partenza della connessione.
 *
 * Il canale supportato per la ricerca Cassazione e' lato client (skill
 * italgiure-search del plugin BetterCallClaude), che interroga lo stesso
 * indice dall'IP dell'utente.
 */
export const ITALGIURE_BLOCKED_MESSAGE =
  'Il server non riesce a raggiungere ItalGiure: le richieste provenienti dal ' +
  'datacenter che ospita questo servizio vengono scartate a livello di rete ' +
  '(timeout di connessione), indipendentemente dalla presenza di un cookie. ' +
  'Non e\' un problema di cookie mancante o scaduto. ' +
  'Usa la ricerca lato client (skill italgiure-search del plugin ' +
  'BetterCallClaude Italia), che interroga lo stesso indice pubblico ' +
  'SentenzeWeb dall\'IP del computer dell\'utente.';

/**
 * Procedura corretta per ottenere il cookie di sessione.
 *
 * I cookie di sessione dell\'area riservata sono HttpOnly: la Console del
 * browser restituisce una stringa vuota e `document.cookie` non e\' il modo per
 * ottenerli. L\'unica fonte e\' l\'intestazione Cookie di una richiesta dati
 * dell\'area riservata, vista nella scheda Network degli strumenti per
 * sviluppatori.
 */
export const ITALGIURE_COOKIE_PROCEDURE =
  'Per ottenere il cookie di sessione: accedi all\'area riservata ' +
  'https://www.italgiure.giustizia.it/new/archives con SPID o credenziali ' +
  'professionali, apri gli strumenti per sviluppatori (F12 / Cmd+Option+I), ' +
  'vai nella scheda Network PRIMA di fare la ricerca, individua la richiesta ' +
  'dati dell\'area riservata e copia il valore completo dell\'intestazione ' +
  'Cookie in Request Headers. I cookie sono HttpOnly: la Console restituisce ' +
  'una stringa vuota e document.cookie non li restituisce.';
```

Poi, **sostituisci i cinque messaggi**. In `searchItalgiure` ci sono tre rami, in `getSentenzaItalgiure` due.

Ramo «cookie assente» di `searchItalgiure` — sostituisci

```typescript
        istruzioni: 'Cookie di sessione ItalGiure non configurato. Alternativa gratuita senza login: SentenzeWeb (https://www.italgiure.giustizia.it/sncass/, sentenze dal 2012). Per la ricerca avanzata (massime complete): 1) Accedi a ItalGiure con SPID/credenziali, 2) Esegui document.cookie, 3) Imposta ITALGIURE_COOKIE o passa il cookie come parametro MCP.',
```

con

```typescript
        istruzioni: ITALGIURE_COOKIE_PROCEDURE + ' ' + ITALGIURE_BLOCKED_MESSAGE,
```

Ramo «errore 401/403» di `searchItalgiure` — sostituisci

```typescript
          istruzioni: `Sessione ItalGiure scaduta (${parsed.message}). Alternativa gratuita senza login: SentenzeWeb. Per la ricerca avanzata: aggiorna il cookie via document.cookie e ITALGIURE_COOKIE, o passa il cookie come parametro MCP.`,
```

con

```typescript
          istruzioni:
            `Sessione ItalGiure scaduta (${parsed.message}). ` +
            ITALGIURE_COOKIE_PROCEDURE +
            ' La ricerca su questo server resta comunque non raggiungibile per il blocco per IP. ' +
            ITALGIURE_BLOCKED_MESSAGE,
```

Ramo «errore generico» di `searchItalgiure` — sostituisci

```typescript
        istruzioni: `Errore ItalGiure: ${parsed.message}. Prova SentenzeWeb (gratuito, senza login) o i link di fallback.`,
```

con

```typescript
        istruzioni:
          `Errore ItalGiure: ${parsed.message}. ` +
          ITALGIURE_COOKIE_PROCEDURE +
          ' ' +
          ITALGIURE_BLOCKED_MESSAGE,
```

Ramo «cookie assente» di `getSentenzaItalgiure` — sostituisci

```typescript
        istruzioni: 'Cookie ItalGiure non configurato. Alternativa gratuita senza login: SentenzeWeb (sentenze dal 2012). Per massime complete: accedi a ItalGiure con SPID/credenziali e configura ITALGIURE_COOKIE o passa il cookie come parametro MCP.',
```

con

```typescript
        istruzioni: ITALGIURE_COOKIE_PROCEDURE + ' ' + ITALGIURE_BLOCKED_MESSAGE,
```

Ramo «catch» di `getSentenzaItalgiure` — sostituisci

```typescript
        istruzioni: isAuthError
          ? `Sessione ItalGiure scaduta (${parsed.message}). Prova SentenzeWeb (gratuito) o aggiorna il cookie.`
          : `Errore nel recupero sentenza: ${parsed.message}. Prova SentenzeWeb (gratuito).`,
```

con

```typescript
        istruzioni: isAuthError
          ? `Sessione ItalGiure scaduta (${parsed.message}). ` +
            ITALGIURE_COOKIE_PROCEDURE +
            ' ' +
            ITALGIURE_BLOCKED_MESSAGE
          : `Errore nel recupero sentenza: ${parsed.message}. ` +
            ITALGIURE_COOKIE_PROCEDURE +
            ' ' +
            ITALGIURE_BLOCKED_MESSAGE,
```

- [ ] **Step 4: esegui il test e verifica che passa**

Run: `cd mcp-servers/cassazione && npx vitest run src/__tests__/italgiure-client.test.ts`

Expected: tutti verdi, exit 0.

- [ ] **Step 5: verifica che non resti alcun riferimento obsoleto**

Run:
```bash
cd /Users/federicocesconi/Dev/BetterCallClaudeMCP_Italy
grep -rn "document.cookie\|Alternativa gratuita" mcp-servers/cassazione/src/
```

Expected: nessun risultato.

- [ ] **Step 6: committa**

```bash
cd /Users/federicocesconi/Dev/BetterCallClaudeMCP_Italy
git add mcp-servers/cassazione/src/tools/italgiure-client.ts \
  mcp-servers/cassazione/src/__tests__/italgiure-client.test.ts
git commit -m "fix(cassazione): messaggi di fallback onesti sul blocco per IP

I messaggi suggerivano 'esegui document.cookie' su cookie HttpOnly e presentavano
SentenzeWeb come alternativa gratuita, mentre per il server e' lo stesso endpoint
scartato a livello TCP. Ora dicono cosa succede davvero e rimandano al canale
client-side.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 2: Descrizioni dei tool

La descrizione di `cassazione_search_massime` **in produzione** dice «🔐 AUTENTICAZIONE: richiede un cookie di sessione ItalGiure attivo … poi esegui document.cookie nel browser». Un utente che la legge conclude che il problema sia il cookie, e lo prova a rinnovare per settimane.

**Files:**
- Modify: `mcp-servers/cassazione/src/index.ts`
- Modify: `mcp-servers/citation-verify-ita/src/index.ts`

**Interfaces:**
- Consumes: `ITALGIURE_BLOCKED_MESSAGE` e `ITALGIURE_COOKIE_PROCEDURE` da Task 1 (import da `@bettercallclaude-italia/cassazione/italgiure-client`).
- Produces: descrizioni dei tool aggiornate. Non cambia lo schema degli input.

- [ ] **Step 1: scrivi il test che fallisce**

Crea `mcp-servers/cassazione/src/__tests__/tool-descriptions.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Le descrizioni dei tool sono lette dal modello a ogni invocazione: se
 * dichiarano un requisito falso (un cookie che non serve) il modello chiede
 * all'utente un cookie che non risolve niente. Qui si verifica che le
 * descrizioni non contraddicano la diagnostica misurata.
 */
const indexSrc = readFileSync(resolve(__dirname, '..', 'index.ts'), 'utf8');

describe('descrizioni dei tool cassazione', () => {
  it('non dicono piu\' "esegui document.cookie"', () => {
    expect(indexSrc).not.toContain('esegui document.cookie');
  });

  it('non dicono piu\' che il tool richiede un cookie attivo', () => {
    expect(indexSrc).not.toContain('richiede un cookie di sessione ItalGiure attivo');
  });

  it('nomina il blocco per IP', () => {
    expect(indexSrc).toContain('datacenter');
  });

  it('rimanda al canale client-side', () => {
    expect(indexSrc).toContain('italgiure-search');
  });
});
```

- [ ] **Step 2: esegui il test e verifica che fallisce**

Run: `cd mcp-servers/cassazione && npx vitest run src/__tests__/tool-descriptions.test.ts`

Expected: FAIL su «non dicono piu' "esegui document.cookie"» e su «richiede un cookie di sessione ItalGiure attivo».

- [ ] **Step 3: riscrivi la descrizione di `cassazione_search_massime`**

In `mcp-servers/cassazione/src/index.ts`, sostituisci l'intera descrizione del tool `cassazione_search_massime`:

```typescript
    description: `Ricerca sentenze e massime della Corte di Cassazione tramite API Solr di ItalGiure (CED Ministero della Giustizia).

⚠️ LIMITE DI RAGGIUNGIBILITÀ: questo server gira su un indirizzo IP di datacenter e
www.italgiure.giustizia.it scarta a livello di rete (timeout di connessione) le
richieste che arrivano da quel tipo di indirizzo, con o senza cookie. Di conseguenza
questa ricerca dal server tende a restituire zero risultati. Il canale supportato per
la ricerca Cassazione è lato CLIENT: la skill italgiure-search del plugin
BetterCallClaude Italia interroga lo stesso indice pubblico SentenzeWeb direttamente
dal computer dell'utente, dove l'IP è ammesso, e restituisce la stessa forma di
questo tool.

Parametri:
- query (obbligatorio): parole chiave o sintassi Solr (es. "responsabilita medica")
- materia (opzionale): "civile" o "penale"
- anno (opzionale): anno della sentenza (es. 2024)
- tipo (opzionale): "sentenza", "ordinanza" o "decreto"
- page (opzionale): numero pagina (default 1)
- pageSize (opzionale): risultati per pagina, max 50 (default 20)
- cookie (opzionale): cookie di sessione ItalGiure
- session_key (opzionale): chiave di una sessione registrata via cassazione_session_set — il cookie viene letto dal vault lato server, senza passarlo a ogni chiamata

Se la ricerca non restituisce risultati, il campo autenticazione.messaggio spiega il
motivo e indica il percorso alternativo.`,
```

- [ ] **Step 4: riscrivi la descrizione di `cassazione_get_sentenza`**

Nello stesso file, sostituisci l'intera descrizione del tool `cassazione_get_sentenza`:

```typescript
    description: `Recupera i metadati di una singola sentenza della Corte di Cassazione tramite ItalGiure.

⚠️ LIMITE DI RAGGIUNGIBILITÀ: come per cassazione_search_massime, questo server non
raggiunge www.italgiure.giustizia.it dal proprio IP di datacenter (timeout di
connessione, con o senza cookie). Per il recupero di una sentenza usa il canale
lato client (skill italgiure-search del plugin BetterCallClaude Italia).

Parametri:
- id (obbligatorio): identificativo sentenza (es. snciv2024332127S)
- cookie (opzionale): cookie di sessione ItalGiure
- session_key (opzionale): chiave di una sessione registrata via cassazione_session_set

Restituisce estremi, sezione, tipo, date e URL al PDF quando disponibili.`,
```

- [ ] **Step 5: correggi la descrizione di `citation-verify-ita`**

In `mcp-servers/citation-verify-ita/src/index.ts`, sostituisci il testo:

```
- Sentenze Cassazione (es. "Cass. n. 12345/2024", "Cassazione civile Sez. 3, n. 32127 del 2024") → verifica su ItalGiure (CED Ministero della Giustizia)
```

con

```
- Sentenze Cassazione (es. "Cass. n. 12345/2024", "Cassazione civile Sez. 3, n. 32127 del 2024") → verifica su ItalGiure (CED Ministero della Giustizia). Questo server non raggiunge ItalGiure dal proprio IP di datacenter: per le sentenze la verifica va fatta dal canale lato client (skill italgiure-search del plugin BetterCallClaude Italia)
```

e sostituisci

```
- italgiure_cookie (opzionale): cookie di sessione ItalGiure, necessario per le citazioni di giurisprudenza. Se omesso, il server usa ITALGIURE_COOKIE env var o italgiure_cookie.txt.
```

con

```
- italgiure_cookie (opzionale): cookie di sessione ItalGiure. Se omesso, il server usa ITALGIURE_COOKIE env var o italgiure_cookie.txt. Attenzione: per le citazioni di giurisprudenza la fonte non e' raggiungibile da questo server (blocco per IP del datacenter): il cookie, di per se', non sblocca la verifica.
```

- [ ] **Step 6: esegui i test e verifica che passano**

Run: `cd mcp-servers/cassazione && npx vitest run`

Expected: tutti verdi.

- [ ] **Step 7: verifica la compilazione**

Run: `cd /Users/federicocesconi/Dev/BetterCallClaudeMCP_Italy && npm run typecheck`

Expected: nessun errore di tipo.

- [ ] **Step 8: committa**

```bash
cd /Users/federicocesconi/Dev/BetterCallClaudeMCP_Italy
git add mcp-servers/cassazione/src/index.ts \
  mcp-servers/cassazione/src/__tests__/tool-descriptions.test.ts \
  mcp-servers/citation-verify-ita/src/index.ts
git commit -m "fix(cassazione): le descrizioni dei tool dichiarano il blocco per IP

La descrizione in produzione diceva 'esegui document.cookie nel browser' e
presentava il cookie come requisito: l'utente provava a rinnovarlo per settimane
mentre il problema era il punto di partenza della connessione.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 3: `citation-verify-ita` degrada in modo esplicito per le sentenze

Per una citazione di sentenza, il tool chiama `searchItalgiure`, che va in timeout e oggi produce un `SOURCE_UNAVAILABLE` che non dice perché. Un errore senza causa è indistinguibile da un difetto del prodotto: l'utente non sa se la sentenza esista, se la fonte sia giù, o se il servizio sia rotto.

**Files:**
- Modify: `mcp-servers/citation-verify-ita/src/tools/check-existence.ts`
- Modify: `mcp-servers/citation-verify-ita/src/__tests__/check-existence.test.ts`

**Interfaces:**
- Consumes: `ITALGIURE_BLOCKED_MESSAGE` da `@bettercallclaude-italia/cassazione/italgiure-client`.
- Produces: per una citazione di sentenza con fonte irraggiungibile, un errore con prefisso `SOURCE_UNAVAILABLE:` il cui testo nomina il blocco per IP e rimanda alla verifica client-side. Il ramo normativo resta invariato.

- [ ] **Step 1: scrivi il test che fallisce**

In `mcp-servers/citation-verify-ita/src/__tests__/check-existence.test.ts`, dentro il `describe('checkExistence', ...)`, aggiungi:

```typescript
  it('per una sentenza con fonte irraggiungibile spiega il blocco per IP', async () => {
    mockedSearchItalgiure.mockResolvedValue({
      success: false,
      cookieValido: false,
      totale: 0,
      massime: [],
      fallback: {
        urlRicerca: 'https://example.invalid',
        urlItalgiure: 'https://example.invalid',
        urlSentenzeWeb: 'https://example.invalid',
        urlGoogle: 'https://example.invalid',
        urlDuckDuckGo: 'https://example.invalid',
        istruzioni: 'Errore ItalGiure: timeout.',
      },
    });

    await expect(checkExistence({ citazione: 'Cass. n. 12345/2024' })).rejects.toThrow(
      /SOURCE_UNAVAILABLE/
    );
    await expect(checkExistence({ citazione: 'Cass. n. 12345/2024' })).rejects.toThrow(
      /datacenter/
    );
    await expect(checkExistence({ citazione: 'Cass. n. 12345/2024' })).rejects.toThrow(
      /italgiure-search/
    );
  });

  it('per una sentenza con fonte irraggiungibile non promette SentenzeWeb come alternativa', async () => {
    mockedSearchItalgiure.mockResolvedValue({
      success: false,
      cookieValido: false,
      totale: 0,
      massime: [],
      fallback: {
        urlRicerca: 'https://example.invalid',
        urlItalgiure: 'https://example.invalid',
        urlSentenzeWeb: 'https://example.invalid',
        urlGoogle: 'https://example.invalid',
        urlDuckDuckGo: 'https://example.invalid',
        istruzioni: 'Errore ItalGiure: timeout.',
      },
    });

    await expect(checkExistence({ citazione: 'Cass. n. 12345/2024' })).rejects.not.toThrow(
      /Alternativa gratuita/
    );
  });
```

- [ ] **Step 2: esegui il test e verifica che fallisce**

Run: `cd mcp-servers/citation-verify-ita && npx vitest run src/__tests__/check-existence.test.ts`

Expected: FAIL — il messaggio attuale è «SOURCE_UNAVAILABLE: ItalGiure non raggiungibile (Errore ItalGiure: timeout.)» e non contiene né `datacenter` né `italgiure-search`.

- [ ] **Step 3: implementa il messaggio esplicito**

In `mcp-servers/citation-verify-ita/src/tools/check-existence.ts`, sostituisci l'import in testa al file:

```typescript
import { searchItalgiure } from '@bettercallclaude-italia/cassazione/italgiure-client';
```

con

```typescript
import {
  searchItalgiure,
  ITALGIURE_BLOCKED_MESSAGE,
} from '@bettercallclaude-italia/cassazione/italgiure-client';
```

e sostituisci il blocco di errore in `checkSentenzaCassazione`:

```typescript
  if (!result.success) {
    // Cookie assente/scaduto o errore di rete: la fonte non è raggiungibile
    throw new Error(
      `SOURCE_UNAVAILABLE: ItalGiure non raggiungibile (${result.fallback.istruzioni})`
    );
  }
```

con

```typescript
  if (!result.success) {
    // La fonte non e' raggiungibile. Il messaggio deve dire PERCHE', altrimenti
    // e' indistinguibile da un difetto del servizio: l'utente non sa se la
    // sentenza esiste, se la fonte e' giu' o se il canale e' rotto.
    throw new Error(
      'SOURCE_UNAVAILABLE: verifica della sentenza non eseguibile da questo server. ' +
      ITALGIURE_BLOCKED_MESSAGE +
      ' Dettaglio: ' + result.fallback.istruzioni
    );
  }
```

- [ ] **Step 4: esegui i test e verifica che passano**

Run: `cd mcp-servers/citation-verify-ita && npx vitest run`

Expected: tutti verdi, exit 0. Il ramo normativo deve restare invariato: i test
esistenti su `D.Lgs. 231/2001` e `art. 1456 c.c.` continuano a passare.

- [ ] **Step 5: verifica la compilazione**

Run: `cd /Users/federicocesconi/Dev/BetterCallClaudeMCP_Italy && npm run typecheck`

Expected: nessun errore. (Se l'import di `ITALGIURE_BLOCKED_MESSAGE` non è
esportato dal pacchetto `@bettercallclaude-italia/cassazione`, il workspace
locale non lo vede: in quel caso importa la costante dal percorso relativo
`@bettercallclaude-italia/cassazione/italgiure-client` gia' usato, verificando
prima che `mcp-servers/cassazione/package.json` esporti il sottopercorso.)

- [ ] **Step 6: committa**

```bash
cd /Users/federicocesconi/Dev/BetterCallClaudeMCP_Italy
git add mcp-servers/citation-verify-ita/src/tools/check-existence.ts \
  mcp-servers/citation-verify-ita/src/__tests__/check-existence.test.ts
git commit -m "fix(citation-verify-ita): la sentenza non verificabile spiega perche'

Un SOURCE_UNAVAILABLE anonico non permette di distinguere fra sentenza
inesistente, fonte giu' e canale rotto. Il messaggio nomina il blocco per IP e
rimanda alla verifica lato client. Il ramo normativo e' invariato.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 4: Costruzione e rilascio

**Files:**
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: i tre task precedenti.
- Produces: server deployato con i messaggi corretti.

Il versioning del server e' indipendente da quello del plugin (il repo e' a
`1.2.0`): questo piano **non** cambia la versione del server. La release del
plugin (`2.5.0`) e' nel piano Track A.

- [ ] **Step 1: scrivi la voce di CHANGELOG**

In `CHANGELOG.md`, in cima, sotto l'intestazione:

```markdown
## [Unreleased]

### Fixed
- **Messaggi del server cassazione onesti sul blocco per IP**: `www.italgiure.giustizia.it` scarta a livello TCP le connessioni dal datacenter che ospita i server MCP, con o senza cookie di sessione. I messaggi di fallback dicevano «esegui document.cookie» (su cookie HttpOnly) e presentavano SentenzeWeb come alternativa gratuita, ma per il server è lo stesso endpoint scartato. Ora indicano la causa reale e rimandano al canale lato client (skill `italgiure-search`).
- **Descrizioni dei tool aggiornate**: `cassazione_search_massime` e `cassazione_get_sentenza` non si presentano più come tool che «richiedono un cookie attivo»; dichiarano il limite di raggiungibilità. `citation-verify-ita_check_existence` dice che per le sentenze la verifica va fatta lato client.
- **`citation-verify-ita` distingue i casi**: per una sentenza non verificabile da questo server l'errore `SOURCE_UNAVAILABLE` nomina il blocco per IP e il percorso alternativo, invece di lasciare il cliente senza sapere se la sentenza esista, se la fonte sia giù o se il canale sia rotto. Il ramo normativo è invariato.
```

- [ ] **Step 2: verifica l'intera suite**

Run:
```bash
cd /Users/federicocesconi/Dev/BetterCallClaudeMCP_Italy
npm run typecheck
npm run test:run
```

Expected: entrambi verdi, exit 0.

Attenzione: `npm test` nel repo del server e' `vitest` in **watch mode** e non
termina: usa `npm run test:run` (che e' `vitest run`).

- [ ] **Step 3: verifica il comportamento in produzione**

Il rilascio è un deploy su Railway: i messaggi non sono visibili finche il
container non viene riavviato con il codice nuovo.

Dopo il deploy, dal container:

```bash
cd /Users/federicocesconi/Dev/BetterCallClaudeMCP_Italy
railway ssh --project df2d95e0-4f83-45a8-b40e-f5e6e2a52b27 \
  --environment production --service BetterCallCLaudeMCP-Italia \
  'curl -sS -m 30 -X POST "https://mcp-italia.bettercallclaude.ch/cassazione/mcp" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{}}" | head -c 1200'
```

Expected: la descrizione del tool **non** contiene più «esegui document.cookie» e
contiene «datacenter».

Run (verifica del messaggio di fallback, senza cookie):

```bash
railway ssh --project df2d95e0-4f83-45a8-b40e-f5e6e2a52b27 \
  --environment production --service BetterCallCLaudeMCP-Italia \
  'curl -sS -m 60 -X POST "https://mcp-italia.bettercallclaude.ch/cassazione/mcp" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"cassazione_search_massime\",\"arguments\":{\"query\":\"responsabilita medica\",\"pageSize\":3}}}" | head -c 2000'
```

Expected: `autenticazione.messaggio` contiene «datacenter» e non contiene
«document.cookie» né «Alternativa gratuita».

- [ ] **Step 4: committa**

```bash
cd /Users/federicocesconi/Dev/BetterCallClaudeMCP_Italy
git add CHANGELOG.md
git commit -m "chore: changelog del server cassazione — messaggi onesti sul blocco per IP

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

## Cosa NON fa questo piano

- **Non** inverte il gate del cookie in `italgiure-client.ts`: la richiesta pubblica
  va in timeout esattamente come quella con cookie. Invertere il gate produrrebbe
  lo stesso timeout, cioè stessi zero risultati con un messaggio diverso.
- **Non** aggiunge i campi `fonte` / `massimeComplete`: non ci sono risultati da
  etichettare, perche' la fonte non e' raggiungibile.
- **Non** tocca `normattiva`, `corte-costituzionale`, `giustizia-amministrativa`,
  `eur-lex-ita` o `legal-citations-ita`: dal container rispondono tutti, e il
  funzionamento e' gia' corretto.
- **Non** indicizza i dati aperti della Cassazione: e' un progetto di ingestione
  separato, fuori perimetro.
- **Non** modifica il plugin: il Track A e' un piano separato e non e' un
  prerequisito di questo.

## Rollout

| Release | Contenuto | Effetto |
|---|---|---|
| **Rel-1** (Track A) | plugin: skill `italgiure-search`, `italgiure-browser`, tool names, doc, fonti esterne | **ripara** la ricerca: l'utente trova i precedenti |
| **Rel-2** (questo piano) | server: messaggi onesti, descrizioni, degradazione di `citation-verify-ita` | **rende onesto** il server: l'utente capisce perché il canale server non risponde e usa quello giusto |

Rel-2 non blocca Rel-1. Se Rel-2 slittasse, la ricerca funzionerebbe comunque
tramite il canale client.
