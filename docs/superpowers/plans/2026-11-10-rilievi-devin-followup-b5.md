# Rilievi Devin PR #23 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correggere i 4 rilievi Devin sollevati sulla PR #23 (già merged e in produzione) perché i messaggi del server cassazione dichiarino solo ciò che è stato effettivamente osservato, senza toccare il contratto pubblico.

**Architecture:** Nessuna modifica alla logica di rete. Si separano tre fatti che oggi sono confusi in un solo messaggio: (A) il ramo «cookie non configurato» — nessuna richiesta inviata, (B) il fallimento di trasporto osservato — timeout all'IP/indisponibilità, (C) il contesto di deployment su IP datacenter — già dichiarato nel banner della descrizione dei tool. Il messaggio per-risposta descrive A o B; C resta nella descrizione. La classificazione degli errori diventa una funzione pura, testabile senza rete.

**Tech Stack:** Node.js ≥ 20, TypeScript 5.5+, ES Modules (import con `.js`), vitest 4.1.6, npm workspaces, MCP Streamable HTTP, deploy Railway (project `df2d95e0-4f83-45a8-b40e-f5e6e2a52b27`).

**Spec:** `docs/superpowers/specs/2026-11-09-rilievi-devin-followup-design.md` (repo plugin, commit `31a8cd8`).

## Global Constraints

- Contratto pubblico **invariato**: envelope `{success, data|error, metadata}`, prefisso `SOURCE_UNAVAILABLE:`, nomi dei tool, schemi di input, campi di `fallback`, priorità delle fonti.
- **Zero dipendenze nuove.** Nessuna modifica a `package.json`.
- Italiano con accenti propri. Niente apostrofi ASCII al posto degli accenti.
- Nessuna modifica alla logica di rete: nessuna nuova chiamata a ItalGiure, nessun cambio di latenza (il fallback senza cookie resta istantaneo).
- Comandi: `npm run test:run` (mai `npm test`: è `vitest` in watch mode e non termina). `npm run typecheck` richiede prima `npm run build`.
- Il **codice** sta in `~/Dev/BetterCallClaudeMCP_Italy`; piano e spec stanno in `~/Dev/bettercallclaude_italia`.
- Branch di lavoro: `fix/devin-followup-b5`, creato da `origin/main` (`fa5ded8`).
- Prima di ogni merge: leggere il corpo della review Devin (il check verde significa solo «analisi completata»).

## File Structure

| File | Ruolo | Modifica |
|---|---|---|
| `mcp-servers/cassazione/src/tools/italgiure-client.ts` | client HTTP ItalGiure + messaggi di fallback | costante `ITALGIURE_MISSING_COOKIE_MESSAGE`, classificatore puro `classificaFallimentoItalgiure`, riformulazione di `ITALGIURE_BLOCKED_MESSAGE`, 4 rami di fallback riclassificati |
| `mcp-servers/cassazione/src/index.ts` | descrizioni dei tool MCP (lette dal modello a ogni invocazione) | promessa della descrizione allineata al comportamento reale |
| `mcp-servers/citation-verify-ita/src/tools/check-existence.ts` | verifica esistenza citazioni | errore `SOURCE_UNAVAILABLE` senza diagnosi duplicata; rimosso l'import della costante dal pacchetto cassazione |
| `README.md` (root) | guida di setup del connettore | procedura cookie allineata ai messaggi nuovi |
| `CHANGELOG.md` | changelog Keep a Changelog | voce `[Unreleased] → Fixed` |
| `mcp-servers/cassazione/src/__tests__/italgiure-client.test.ts` | test unitari del client | test del classificatore e dei rami senza cookie |
| `mcp-servers/cassazione/src/__tests__/tool-descriptions.test.ts` | test delle descrizioni | test sulla promessa «non è eseguibile» |
| `mcp-servers/cassazione/src/__tests__/readme-cookie.test.ts` | **nuovo** | test di non regressione sulla guida di setup |
| `mcp-servers/citation-verify-ita/src/__tests__/check-existence.test.ts` | test della verifica | errore senza duplicazione; rimosso il mock della costante |

---

### Task 1: messaggi del client ItalGiure (classificazione dei fallimenti)

**Files:**
- Modify: `mcp-servers/cassazione/src/tools/italgiure-client.ts:22-49` (costanti), `:225-241` (ramo senza cookie di `searchItalgiure`), `:286-332` (catch di `searchItalgiure`), `:365-375` (ramo senza cookie di `getSentenzaItalgiure`), `:422-443` (catch di `getSentenzaItalgiure`)
- Test: `mcp-servers/cassazione/src/__tests__/italgiure-client.test.ts`

**Interfaces:**
- Consumes: `parseApiError(error)` da `@bettercallclaude-italia/shared` (restituisce `{code, message, retryable}`; i codici usati qui sono `API_TIMEOUT`, `API_UNAVAILABLE`, `API_ERROR`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_ERROR`).
- Produces:
  - `export const ITALGIURE_MISSING_COOKIE_MESSAGE: string`
  - `export const ITALGIURE_BLOCKED_MESSAGE: string` (testo riformulato, stessa chiave di export)
  - `export type TipoFallimentoItalgiure = 'trasporto' | 'cookie' | 'errore'`
  - `export interface FallimentoItalgiure { tipo: TipoFallimentoItalgiure; messaggio: string }`
  - `export function classificaFallimentoItalgiure(code: string, message: string): FallimentoItalgiure`

- [ ] **Step 1: scrivi i test che falliscono**

In `mcp-servers/cassazione/src/__tests__/italgiure-client.test.ts`, sostituisci l'import iniziale:

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync } from 'fs';
import { resolve } from 'path';
import {
  buildSolrQuery,
  calculateStart,
  buildPdfUrl,
  getItalgiureCookie,
  searchItalgiure,
  getSentenzaItalgiure,
  classificaFallimentoItalgiure,
  ITALGIURE_BLOCKED_MESSAGE,
  ITALGIURE_COOKIE_PROCEDURE,
  ITALGIURE_MISSING_COOKIE_MESSAGE,
} from '../tools/italgiure-client.js';
import type { SearchMassimeInput } from '../types.js';
```

Poi aggiungi in fondo al file:

```typescript
describe('messaggi del ramo senza cookie', () => {
  it('dichiara che nessuna richiesta è stata inviata', () => {
    expect(ITALGIURE_MISSING_COOKIE_MESSAGE).toContain('nessuna richiesta');
  });

  it('non dichiara il blocco per IP: in questo ramo non è stata osservata alcuna connessione', () => {
    expect(ITALGIURE_MISSING_COOKIE_MESSAGE).not.toContain('datacenter');
  });

  it('rimanda al canale client', () => {
    expect(ITALGIURE_MISSING_COOKIE_MESSAGE).toContain('italgiure-search');
  });
});

describe('classificaFallimentoItalgiure', () => {
  it('classifica il timeout come fallimento di trasporto', () => {
    const r = classificaFallimentoItalgiure('API_TIMEOUT', 'Timeout nella richiesta all\'API.');
    expect(r.tipo).toBe('trasporto');
    expect(r.messaggio).toBe(ITALGIURE_BLOCKED_MESSAGE);
  });

  it('classifica l\'indisponibilità del servizio come fallimento di trasporto', () => {
    expect(classificaFallimentoItalgiure('API_UNAVAILABLE', 'Servizio non disponibile').tipo).toBe('trasporto');
  });

  it('classifica 401 e 403 come problema di cookie', () => {
    expect(classificaFallimentoItalgiure('API_ERROR', 'Request failed with status code 401').tipo).toBe('cookie');
    expect(classificaFallimentoItalgiure('API_ERROR', 'Request failed with status code 403').tipo).toBe('cookie');
  });

  it('non dichiara il blocco per IP su un errore HTTP non di trasporto', () => {
    const r = classificaFallimentoItalgiure('API_ERROR', 'Request failed with status code 500');
    expect(r.tipo).toBe('errore');
    expect(r.messaggio).not.toContain('datacenter');
  });

  it('non dichiara il blocco per IP su un rate limit', () => {
    const r = classificaFallimentoItalgiure('RATE_LIMIT_EXCEEDED', 'Limite di richieste superato.');
    expect(r.tipo).toBe('errore');
    expect(r.messaggio).not.toContain('datacenter');
  });
});

describe('rami senza cookie (nessuna richiesta inviata)', () => {
  const originalEnv = process.env;
  const cookieFile = resolve(process.cwd(), 'italgiure_cookie.txt');

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.ITALGIURE_COOKIE;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it.skipIf(existsSync(cookieFile))('searchItalgiure senza cookie non dichiara il blocco per IP', async () => {
    const r = await searchItalgiure({ query: 'responsabilita medica' });
    expect(r.success).toBe(false);
    if (r.success) throw new Error('atteso fallimento');
    expect(r.fallback.istruzioni).not.toContain('datacenter');
    expect(r.fallback.istruzioni).toContain('Network');
  });

  it.skipIf(existsSync(cookieFile))('getSentenzaItalgiure senza cookie non dichiara il blocco per IP', async () => {
    const r = await getSentenzaItalgiure('snciv2024332127S');
    expect(r.success).toBe(false);
    if (r.success || r.cookieValido) throw new Error('atteso il fallback senza cookie');
    expect(r.fallback.istruzioni).not.toContain('datacenter');
    expect(r.fallback.istruzioni).toContain('Network');
  });
});
```

- [ ] **Step 2: esegui i test e verifica che falliscano**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
npx vitest run mcp-servers/cassazione/src/__tests__/italgiure-client.test.ts
```

Expected: FAIL. Motivi: `classificaFallimentoItalgiure` e `ITALGIURE_MISSING_COOKIE_MESSAGE` non esportati (errore di import); i rami senza cookie contengono ancora «datacenter».

- [ ] **Step 3: riformula `ITALGIURE_BLOCKED_MESSAGE`**

In `mcp-servers/cassazione/src/tools/italgiure-client.ts`, sostituisci il blocco della costante (righe 10-29) con:

```typescript
/**
 * Diagnosi del fallimento di trasporto.
 *
 * Misurato dal container di produzione: www.italgiure.giustizia.it scarta a
 * livello TCP le connessioni provenienti dall'IP del datacenter che ospita
 * questo server, con o senza cookie di sessione. Il messaggio è però limitato
 * a ciò che è stato osservato: la connessione non ha raggiunto il servizio.
 * Il blocco per IP è il caso noto e misurato del deployment su datacenter, non
 * una diagnosi valida per qualsiasi host (su una postazione locale il fallimento
 * può essere anche un servizio momentaneamente indisponibile).
 *
 * Il canale supportato per la ricerca Cassazione è lato client (skill
 * italgiure-search del plugin BetterCallClaude), che interroga lo stesso
 * indice dall'IP dell'utente.
 */
export const ITALGIURE_BLOCKED_MESSAGE =
  'La connessione a ItalGiure non ha raggiunto il servizio (timeout a livello di rete, ' +
  'osservato ora). Le cause possibili sono il blocco per IP (il caso noto e misurato del ' +
  'deployment su IP datacenter, dove lo scarto avviene prima che la richiesta raggiunga il ' +
  'servizio e il cookie non cambia l\'esito) oppure l\'indisponibilita\' del servizio. ' +
  'Il canale supportato per la ricerca Cassazione e\' lato client (skill italgiure-search ' +
  'del plugin BetterCallClaude Italia), che interroga lo stesso indice pubblico ' +
  'SentenzeWeb dall\'IP del computer dell\'utente.';
```

- [ ] **Step 4: aggiungi `ITALGIURE_MISSING_COOKIE_MESSAGE` e il classificatore**

Subito dopo la fine di `ITALGIURE_COOKIE_PROCEDURE` (subito dopo la riga che chiude la costante con `;`), inserisci:

```typescript

/**
 * Messaggio del ramo "nessun cookie configurato".
 *
 * In questo ramo non viene inviata alcuna richiesta: qui non si può dire che
 * c'è stato un timeout o un blocco per IP, solo che la ricerca non è eseguibile
 * e come rimediare.
 */
export const ITALGIURE_MISSING_COOKIE_MESSAGE =
  'Senza un cookie di sessione ItalGiure la ricerca non e\' eseguibile: nessuna richiesta ' +
  'e\' stata inviata al servizio. Se il cookie e\' valido e la ricerca continua a restituire ' +
  'zero risultati, il canale supportato per la Cassazione e\' lato client (skill ' +
  'italgiure-search del plugin BetterCallClaude Italia), che interroga lo stesso indice ' +
  'pubblico SentenzeWeb dall\'IP del computer dell\'utente.';

/**
 * Classificazione di un fallimento del client ItalGiure.
 *
 * - 'trasporto': la connessione non ha raggiunto il servizio (timeout o
 *   indisponibilita'). Nel deployment su IP datacenter è il blocco noto; da un
 *   IP ammesso può essere anche un servizio momentaneamente giù.
 * - 'cookie': il servizio ha risposto 401/403, cioè la sessione manca o è scaduta.
 * - 'errore': qualsiasi altro errore (HTTP 5xx, rate limit, errore interno): qui
 *   non si sa nulla sullo stato della rete, quindi il messaggio non deve
 *   dichiarare un blocco per IP.
 */
export type TipoFallimentoItalgiure = 'trasporto' | 'cookie' | 'errore';

export interface FallimentoItalgiure {
  tipo: TipoFallimentoItalgiure;
  messaggio: string;
}

/**
 * Classifica un errore del client ItalGiure in base al codice restituito da
 * parseApiError e al messaggio originale.
 */
export function classificaFallimentoItalgiure(code: string, message: string): FallimentoItalgiure {
  if (code === 'API_ERROR' && (message.includes('401') || message.includes('403'))) {
    return {
      tipo: 'cookie',
      messaggio: `Sessione ItalGiure scaduta o non valida (${message}).`,
    };
  }

  if (code === 'API_TIMEOUT' || code === 'API_UNAVAILABLE') {
    return { tipo: 'trasporto', messaggio: ITALGIURE_BLOCKED_MESSAGE };
  }

  return { tipo: 'errore', messaggio: `Errore ItalGiure: ${message}.` };
}
```

- [ ] **Step 5: riclassifica i rami di fallback di `searchItalgiure`**

Sostituisci il ramo «cookie assente» (righe 225-241) con:

```typescript
  if (!cookie) {
    return {
      success: false,
      cookieValido: false,
      totale: 0,
      massime: [],
      fallback: {
        urlRicerca,
        urlItalgiure,
        urlSentenzeWeb,
        urlEcli,
        urlGoogle: google,
        urlDuckDuckGo: duckduckgo,
        istruzioni: ITALGIURE_MISSING_COOKIE_MESSAGE + ' ' + ITALGIURE_COOKIE_PROCEDURE,
      },
    };
  }
```

Sostituisci l'intero blocco `catch` (righe 286-332) con:

```typescript
  } catch (error) {
    const parsed = parseApiError(error);
    const fallimento = classificaFallimentoItalgiure(parsed.code, parsed.message);

    const istruzioni =
      fallimento.tipo === 'cookie'
        ? fallimento.messaggio + ' ' + ITALGIURE_COOKIE_PROCEDURE
        : fallimento.messaggio;

    return {
      success: false,
      cookieValido: false,
      totale: 0,
      massime: [],
      fallback: {
        urlRicerca,
        urlItalgiure,
        urlSentenzeWeb,
        urlEcli,
        urlGoogle: google,
        urlDuckDuckGo: duckduckgo,
        istruzioni,
      },
    };
  }
```

- [ ] **Step 6: riclassifica i rami di fallback di `getSentenzaItalgiure`**

Sostituisci il ramo «cookie assente» (righe 365-375) con:

```typescript
  if (!cookie) {
    return {
      success: false,
      cookieValido: false,
      fallback: {
        urlItalgiure: `${ITALGIURE_BASE}/sncass.php`,
        urlSentenzeWeb: 'https://www.italgiure.giustizia.it/sncass/',
        istruzioni: ITALGIURE_MISSING_COOKIE_MESSAGE + ' ' + ITALGIURE_COOKIE_PROCEDURE,
      },
    };
  }
```

Sostituisci l'intero blocco `catch` (righe 422-443) con:

```typescript
  } catch (error) {
    const parsed = parseApiError(error);
    const fallimento = classificaFallimentoItalgiure(parsed.code, parsed.message);

    const istruzioni =
      fallimento.tipo === 'cookie'
        ? fallimento.messaggio + ' ' + ITALGIURE_COOKIE_PROCEDURE
        : fallimento.messaggio;

    return {
      success: false,
      cookieValido: false,
      fallback: {
        urlItalgiure: `${ITALGIURE_BASE}/sncass.php`,
        urlSentenzeWeb: 'https://www.italgiure.giustizia.it/sncass/',
        istruzioni,
      },
    };
  }
```

- [ ] **Step 7: esegui i test e verifica che passino**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
npx vitest run mcp-servers/cassazione/src/__tests__/italgiure-client.test.ts
```

Expected: PASS, tutti i test del file verdi.

- [ ] **Step 8: committa**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
git add mcp-servers/cassazione/src/tools/italgiure-client.ts mcp-servers/cassazione/src/__tests__/italgiure-client.test.ts
git commit -m "fix(cassazione): i messaggi dichiarano solo il fallimento osservato

Il ramo senza cookie non attribuisce piu' al blocco per IP un timeout mai
avvenuto, e gli errori di trasporto, di autenticazione e generici vengono
distinti. La classificazione è una funzione pura, testabile senza rete.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 2: descrizione di `cassazione_search_massime` allineata al comportamento

**Files:**
- Modify: `mcp-servers/cassazione/src/index.ts:40-41`
- Test: `mcp-servers/cassazione/src/__tests__/tool-descriptions.test.ts`

**Interfaces:**
- Consumes: nessuna (test su file sorgente).
- Produces: nessuna API; cambia solo il testo della descrizione letto dal modello.

- [ ] **Step 1: scrivi il test che fallisce**

In `mcp-servers/cassazione/src/__tests__/tool-descriptions.test.ts`, aggiungi dentro `describe('descrizioni dei tool cassazione', ...)`:

```typescript
  it('non promette un messaggio quando la ricerca non restituisce risultati', () => {
    expect(indexSrc).not.toContain('Se la ricerca non restituisce risultati');
  });

  it('promette il messaggio quando la ricerca non è eseguibile', () => {
    expect(indexSrc).toContain('non è eseguibile');
  });
```

- [ ] **Step 2: esegui il test e verifica che fallisca**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
npx vitest run mcp-servers/cassazione/src/__tests__/tool-descriptions.test.ts
```

Expected: FAIL — la descrizione contiene ancora «Se la ricerca non restituisce risultati» e non contiene «non è eseguibile».

- [ ] **Step 3: correggi la descrizione**

In `mcp-servers/cassazione/src/index.ts`, sostituisci le righe 40-41:

```typescript
Se la ricerca non restituisce risultati, il campo autenticazione.messaggio spiega il
motivo e indica il percorso alternativo.`,
```

con:

```typescript
Se la ricerca non è eseguibile (per esempio perché manca il cookie di sessione), il campo
autenticazione.messaggio spiega il motivo e indica il percorso alternativo. Una ricerca
eseguita che non trova nulla restituisce totale 0 e autenticazione.cookieValido true.`,
```

- [ ] **Step 4: esegui il test e verifica che passi**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
npx vitest run mcp-servers/cassazione/src/__tests__/tool-descriptions.test.ts
```

Expected: PASS.

- [ ] **Step 5: committa**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
git add mcp-servers/cassazione/src/index.ts mcp-servers/cassazione/src/__tests__/tool-descriptions.test.ts
git commit -m "fix(cassazione): la descrizione promette il messaggio solo se la ricerca non è eseguibile

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 3: errore di verifica senza diagnosi duplicata

**Files:**
- Modify: `mcp-servers/citation-verify-ita/src/tools/check-existence.ts:1-4` (import), `:179-188` (errore)
- Test: `mcp-servers/citation-verify-ita/src/__tests__/check-existence.test.ts:5-18` (mock), `:121-146` (test esistente)

**Interfaces:**
- Consumes: `searchItalgiure` da `@bettercallclaude-italia/cassazione/italgiure-client` (invariato) e `result.fallback.istruzioni` (stringa che contiene già procedura e diagnosi, a seconda del ramo).
- Produces: l'errore `SOURCE_UNAVAILABLE` contiene il prefisso e `fallback.istruzioni` una sola volta; il pacchetto `citation-verify-ita` **non** importa più `ITALGIURE_BLOCKED_MESSAGE`.

- [ ] **Step 1: scrivi il test che fallisce**

In `mcp-servers/citation-verify-ita/src/__tests__/check-existence.test.ts`, aggiorniamo il mock del modulo cassazione (righe 5-18) con il **testo nuovo** di `ITALGIURE_BLOCKED_MESSAGE` (quello definito in Task 1) e sostituiamo il test «per una sentenza con fonte irraggiungibile spiega il blocco per IP» (righe 121-146).

Il mock deve riportare il testo nuovo: con il vecchio testo la duplicazione non sarebbe rilevabile (la diagnosi che il test conta non apparirebbe nel messaggio di blocco).

```typescript
vi.mock('@bettercallclaude-italia/cassazione/italgiure-client', () => ({
  searchItalgiure: vi.fn(),
  // Copia fedele della costante aggiornata in Task 1: il mock sostituisce
  // l'intero modulo, quindi la costante va ridefinita qui. Serve al test di
  // duplicazione; sparirà allo Step 4, quando il sorgente smetterà di
  // importarla.
  ITALGIURE_BLOCKED_MESSAGE:
    'La connessione a ItalGiure non ha raggiunto il servizio (timeout a livello di rete, ' +
    'osservato ora). Le cause possibili sono il blocco per IP (il caso noto e misurato del ' +
    'deployment su IP datacenter, dove lo scarto avviene prima che la richiesta raggiunga il ' +
    'servizio e il cookie non cambia l\'esito) oppure l\'indisponibilità del servizio. ' +
    'Il canale supportato per la ricerca Cassazione è lato client (skill italgiure-search ' +
    'del plugin BetterCallClaude Italia), che interroga lo stesso indice pubblico ' +
    'SentenzeWeb dall\'IP del computer dell\'utente.',
}));
```

```typescript
  it('per una sentenza con fonte irraggiungibile riporta le istruzioni senza duplicare la diagnosi', async () => {
    const diagnosi =
      'La connessione a ItalGiure non ha raggiunto il servizio (timeout a livello di rete, osservato ora).';
    const istruzioni = `${diagnosi} Per ottenere il cookie di sessione: area riservata, scheda Network.`;
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
        istruzioni,
      },
    });

    const err = await checkExistence({ citazione: 'Cass. n. 12345/2024' }).catch((e) => e as Error);
    expect(err.message.startsWith('SOURCE_UNAVAILABLE:')).toBe(true);
    expect(err.message.endsWith(istruzioni)).toBe(true);
    expect(err.message).not.toContain('Dettaglio:');
    // La diagnosi compare una sola volta: il messaggio non la ripete.
    expect(err.message.split(diagnosi).length - 1).toBe(1);
  });
```

- [ ] **Step 2: esegui il test e verifica che fallisca**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
npx vitest run mcp-servers/citation-verify-ita/src/__tests__/check-existence.test.ts
```

Expected: FAIL. Con il sorgente attuale l'errore è «SOURCE_UNAVAILABLE: … » + `ITALGIURE_BLOCKED_MESSAGE` + « Dettaglio: » + `istruzioni`: la diagnosi compare **due** volte (conteggio atteso 1) e il messaggio contiene «Dettaglio:».

- [ ] **Step 3: correggi l'errore e l'import**

In `mcp-servers/citation-verify-ita/src/tools/check-existence.ts`, sostituisci l'import (righe 1-4):

```typescript
import {
  searchItalgiure,
} from '@bettercallclaude-italia/cassazione/italgiure-client';
```

con:

```typescript
import { searchItalgiure } from '@bettercallclaude-italia/cassazione/italgiure-client';
```

e sostituisci il blocco di errore (righe 179-188):

```typescript
  if (!result.success) {
    // La fonte non è raggiungibile. Il messaggio deve dire PERCHÉ, altrimenti
    // è indistinguibile da un difetto del servizio: l'utente non sa se la
    // sentenza esiste, se la fonte è giù o se il canale è rotto.
    throw new Error(
      'SOURCE_UNAVAILABLE: verifica della sentenza non eseguibile da questo server. ' +
      ITALGIURE_BLOCKED_MESSAGE +
      ' Dettaglio: ' + result.fallback.istruzioni
    );
  }
```

con:

```typescript
  if (!result.success) {
    // La fonte non è raggiungibile. Il messaggio deve dire PERCHÉ, altrimenti
    // è indistinguibile da un difetto del servizio: l'utente non sa se la
    // sentenza esiste, se la fonte è giù o se il canale è rotto.
    // `fallback.istruzioni` contiene già procedura e diagnosi, coerenti con il
    // ramo in cui è fallito: non va anteposto nessun altro messaggio, o la
    // diagnosi viene ripetuta due volte nello stesso errore.
    throw new Error(
      'SOURCE_UNAVAILABLE: verifica della sentenza non eseguibile da questo server. ' +
      result.fallback.istruzioni
    );
  }
```

- [ ] **Step 4: rimuovi la costante dal mock (il sorgente non la importa più)**

In `mcp-servers/citation-verify-ita/src/__tests__/check-existence.test.ts`, riporta il mock del modulo cassazione alla forma minimale:

```typescript
vi.mock('@bettercallclaude-italia/cassazione/italgiure-client', () => ({
  searchItalgiure: vi.fn(),
}));
```

Questo chiude anche il Minor archiviato del drift mock↔costante: la copia letterale della costante non esiste più.

- [ ] **Step 5: esegui i test e verifica che passino**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
npx vitest run mcp-servers/citation-verify-ita/src/__tests__/check-existence.test.ts
```

Expected: PASS (tutti i test del file).

- [ ] **Step 6: committa**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
git add mcp-servers/citation-verify-ita/src/tools/check-existence.ts mcp-servers/citation-verify-ita/src/__tests__/check-existence.test.ts
git commit -m "fix(citation-verify-ita): l'errore SOURCE_UNAVAILABLE non ripete la diagnosi

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 4: guida di setup del cookie nel README

**Files:**
- Modify: `README.md:34-69`
- Create: `mcp-servers/cassazione/src/__tests__/readme-cookie.test.ts`

**Interfaces:**
- Consumes: nessuna.
- Produces: nessuna API; un test di non regressione sulla documentazione.

- [ ] **Step 1: scrivi il test che fallisce**

Crea `mcp-servers/cassazione/src/__tests__/readme-cookie.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * La guida di setup è il primo documento che legge chi installa il server:
 * se contraddice i messaggi dei tool, l'utente cerca un cookie che non
 * esiste o pensa che il connettore funzioni senza.
 */
const readme = readFileSync(resolve(__dirname, '..', '..', '..', '..', 'README.md'), 'utf8');

describe('README — setup cookie ItalGiure', () => {
  it('non suggerisce document.cookie (i cookie sono HttpOnly)', () => {
    expect(readme).not.toContain('document.cookie');
  });

  it('non nomina un cookie non verificato', () => {
    expect(readme).not.toContain('JSESSIONID');
  });

  it('non promette che il connettore funzioni senza cookie', () => {
    expect(readme).not.toContain('funziona comunque');
  });

  it('dice come estrarre il cookie (scheda Network)', () => {
    expect(readme).toContain('Network');
  });

  it('dichiara il blocco per IP del deployment', () => {
    expect(readme).toContain('datacenter');
  });
});
```

- [ ] **Step 2: esegui il test e verifica che fallisca**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
npx vitest run mcp-servers/cassazione/src/__tests__/readme-cookie.test.ts
```

Expected: FAIL — il README contiene `document.cookie`, `JSESSIONID` e «funziona comunque».

- [ ] **Step 3: riscrivi la sezione del README**

In `README.md`, sostituisci le righe da «### Cassazione — Setup cookie ItalGiure» (riga 34) fino alla fine di «#### Durata e rinnovo» (riga 69) con:

```markdown
### Cassazione — Setup cookie ItalGiure

Il server `cassazione` interroga l'API Solr di [ItalGiure](https://www.italgiure.giustizia.it/sncass/) (CED della Corte di Cassazione), che richiede autenticazione tramite cookie di sessione.

> **Nota sul deployment di produzione.** Misurato dal container: `www.italgiure.giustizia.it` scarta a livello TCP le connessioni provenienti dall'IP di datacenter che ospita i server MCP, con o senza cookie. Da qui la ricerca Cassazione **non è raggiungibile**: il canale supportato è lato client (skill `italgiure-search` del plugin BetterCallClaude Italia), che interroga lo stesso indice pubblico SentenzeWeb dall'IP del computer dell'utente. La procedura cookie qui sotto serve per esecuzioni locali (stdio) o per ambienti con IP ammesso.

#### Cosa succede senza cookie

Senza cookie configurato la ricerca **non viene eseguita**: il tool risponde subito con `success: false`, `cookieValido: false`, `totale: 0` e i link di fallback per la consultazione manuale (SentenzeWeb, ECLI, Google, DuckDuckGo). Nessuna richiesta viene inviata a ItalGiure, quindi il messaggio non attribuisce la mancata risposta a un blocco per IP.

#### Come ottenere e configurare il cookie

1. **Accedi a ItalGiure** con SPID o credenziali professionali:
   - Vai sull'**area riservata**: https://www.italgiure.giustizia.it/new/archives
   - Esegui il login (SPID, CNS, o credenziali ministeriali/professionali)

2. **Estrai il cookie di sessione** dal browser:
   - Apri DevTools (F12 / Cmd+Option+I) → scheda **Network**
   - Fai una ricerca nell'area riservata e individua la richiesta dati
   - Apri la richiesta → **Request Headers** → copia il valore completo dell'intestazione **Cookie**
   - I cookie dell'area riservata sono **HttpOnly**: la scheda Application/Storage può mostrarne il nome, ma dalla Console il valore non è leggibile e il nome del cookie può cambiare fra un rilascio e l'altro: copia l'intera intestazione, non un singolo valore

3. **Configura la variabile d'ambiente**:
   ```bash
   # Nel file .env del server (o variabile d'ambiente Railway)
   ITALGIURE_COOKIE="nome=valore; altro=valore"
   ```
   Oppure salva il cookie in un file `italgiure_cookie.txt` nella working directory del server.

#### Durata e rinnovo

- Il cookie di sessione ItalGiure ha durata limitata (tipicamente alcune ore)
- Quando scade, il connettore rileva l'invalidità (401/403) e restituisce i fallback con la procedura di rinnovo
- Per un uso continuativo, il cookie deve essere rinnovato periodicamente
```

- [ ] **Step 4: esegui il test e verifica che passi**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
npx vitest run mcp-servers/cassazione/src/__tests__/readme-cookie.test.ts
```

Expected: PASS.

- [ ] **Step 5: committa**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
git add README.md mcp-servers/cassazione/src/__tests__/readme-cookie.test.ts
git commit -m "docs(cassazione): la guida del cookie allineata ai messaggi dei tool

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 5: changelog e suite completa

**Files:**
- Modify: `CHANGELOG.md` (sezione `## [Unreleased]` → `### Fixed`)

**Interfaces:**
- Consumes: nessuna.
- Produces: nessuna API.

- [ ] **Step 1: aggiungi la voce di changelog**

In `CHANGELOG.md`, nella sezione `## [Unreleased]`, aggiungi in cima a `### Fixed`:

```markdown
- **I messaggi del server cassazione dichiarano solo ciò che è stato osservato**: il ramo «senza cookie» non attribuisce più al blocco per IP un timeout che non è mai avvenuto (nessuna richiesta viene inviata), gli errori di trasporto sono distinti dagli errori di autenticazione e da quelli generici, `citation-verify-ita` non ripete la diagnosi due volte nello stesso errore `SOURCE_UNAVAILABLE` e la guida di setup nel README non suggerisce più `document.cookie` (cookie HttpOnly) né un nome di cookie non verificato.
```

Poi **correggi la voce esistente** nella stessa sezione `### Fixed` (riga 13 del file): dice che l'errore `SOURCE_UNAVAILABLE` «nomina il blocco per IP e il percorso alternativo», ma dopo i task 1-3 quello è vero solo nel ramo di fallimento di trasporto — nel ramo «senza cookie» l'errore riporta «nessuna richiesta è stata inviata al servizio» e non nomina il blocco per IP. Riformulala: il messaggio riporta la diagnosi del ramo effettivamente verificato.

- [ ] **Step 2: esegui la suite completa**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
npm run test:run
```

Expected: tutti i file di test verdi (nessun test rosso). Se un test preesistente fallisce per un motivo non legato a questo piano, fermarsi e segnalarlo: non si correggono bug non correlati.

- [ ] **Step 3: build e typecheck**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
npm run build
npm run typecheck
```

Expected: entrambi verdi, exit 0. Il typecheck richiede il build precedente: `dist/` è gitignored e sul disco può essere stantio.

- [ ] **Step 4: lint (stato del repo, non bloccante)**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
npm run lint
```

Expected: il comando **fallisce** per una condizione preesistente del repo: ESLint 9
senza `eslint.config.js` (non esiste alcun file di configurazione). Non è un difetto
di questa PR: il job `lint` della CI in realtà esegue `npm run typecheck --workspaces`
dopo il build, ed è quello il gate che conta. Verifica che il fallimento sia
esattamente quello (config mancante) e non altro, e riportalo nel report.

- [ ] **Step 5: committa**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
git add CHANGELOG.md
git commit -m "chore: changelog del server cassazione — messaggi coerenti con il fallimento osservato

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 6: pull request, review Devin, merge, deploy e verifica in produzione

**Files:** nessuna modifica di codice; solo operazioni git/GitHub/Railway.

**Interfaces:**
- Consumes: i 5 commit delle Task 1-5 sul branch `fix/devin-followup-b5`.
- Produces: commit `fa5ded8`-successivo su `main` e deploy Railway verificato.

- [ ] **Step 1: push del branch e apertura della PR**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
git fetch origin
git status -sb
git push -u origin fix/devin-followup-b5
gh pr create --base main --head fix/devin-followup-b5 \
  --title "fix(server): i messaggi dichiarano solo il fallimento osservato (rilievi Devin #23)" \
  --body "Correggi i 4 rilievi Devin sollevati sulla PR #23, che erano stati pubblicati 66 secondi prima del merge e quindi non letti.

1. Il ramo «senza cookie» dichiara che nessuna richiesta è stata inviata, invece di attribuire al blocco per IP un timeout mai avvenuto. Il blocco per IP resta dichiarato dove è stato osservato (fallimento di trasporto) e nel banner della descrizione dei tool.
2. Gli errori sono classificati: trasporto, autenticazione (401/403), generico. Solo il fallimento di trasporto produce il messaggio di blocco.
3. La descrizione di \`cassazione_search_massime\` promette \`autenticazione.messaggio\` quando la ricerca non è eseguibile, non quando non restituisce risultati.
4. \`citation-verify-ita\` non ripete la diagnosi due volte nello stesso errore \`SOURCE_UNAVAILABLE\`, e la guida di setup nel README non suggerisce più \`document.cookie\` né un nome di cookie non verificato.

Contratto pubblico invariato (envelope, prefisso SOURCE_UNAVAILABLE, nomi dei tool, schemi input), zero dipendenze nuove, nessun cambio di latenza."
```

Expected: PR creata, numero riportato dal comando. Nei passi seguenti `<NUMERO_PR>` va sostituito con quel numero.

- [ ] **Step 2: attendi la CI**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
gh pr checks <NUMERO_PR> --watch
```

Expected: `test (20.x)`, `test (22.x)`, `lint`, `docker` tutti `pass`. Il check `Devin Review` passa quando l'analisi **termina**, non quando è priva di rilievi.

- [ ] **Step 3: LEGGI la review Devin (obbligatorio)**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
gh pr view <NUMERO_PR> --json reviews,comments
gh api repos/fedec65/BetterCallClaudeMCP_Italy/pulls/<NUMERO_PR>/comments --jq '.[] | "=== \(.user.login) | \(.path):\(.line) ===\n\(.body)\n"'
```

Expected: nessun rilievo aperto. Se Devin segnala problemi, vanno corretti **prima** del merge (nuovo commit + push, poi si rilegge la review). Non si mergia con rilievi aperti: è esattamente il motivo per cui la PR #23 è passata con 4 rilievi non letti.

- [ ] **Step 4: merge squash e deploy**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
gh pr merge <NUMERO_PR> --squash --delete-branch
git fetch origin
git log origin/main --oneline -1
```

Expected: merge commit su `main`; il merge attiva l'auto-deploy Railway.

- [ ] **Step 5: verifica in produzione (dal container, non dal laptop)**

Dal laptop la connessione a ItalGiure fallirebbe per l'IP svizzero: la verifica va fatta dal container di produzione.

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
railway ssh --project df2d95e0-4f83-45a8-b40e-f5e6e2a52b27 \
  --environment production --service BetterCallCLaudeMCP-Italia \
  'curl -sS -m 30 -X POST "https://mcp-italia.bettercallclaude.ch/cassazione/mcp" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/list\",\"params\":{}}" | head -c 2500'
```

Expected: la descrizione di `cassazione_search_massime` contiene il banner con «datacenter», contiene «non è eseguibile», e **non** contiene «Se la ricerca non restituisce risultati» né `document.cookie`.

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
railway ssh --project df2d95e0-4f83-45a8-b40e-f5e6e2a52b27 \
  --environment production --service BetterCallCLaudeMCP-Italia \
  'curl -sS -m 60 -X POST "https://mcp-italia.bettercallclaude.ch/cassazione/mcp" -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"cassazione_search_massime\",\"arguments\":{\"query\":\"responsabilita medica\",\"pageSize\":3}}}" | head -c 2500'
```

Expected: `success: true` con `massime: []`, `totale: 0`; `autenticazione.messaggio` contiene la procedura (Network, HttpOnly) e **non** contiene «datacenter»; `fallback.istruzioni` idem; la risposta è **rapida** (nessun timeout: il ramo senza cookie non esce dalla rete).

> Nota: `datacenter` deve comparire **solo** nella descrizione del tool (banner di deployment), non nel messaggio di fallback della chiamata senza cookie. È l'inverso di prima del fix, ed è il comportamento atteso.

- [ ] **Step 6: aggiorna il ledger e la session-state**

```bash
cd ~/Dev/BetterCallClaudeMCP_Italy
```

Appenda in `.superpowers/sdd/progress.md` una sezione «Track B5 — rilievi Devin PR #23: DEPLOY COMPLETATO» con: PR, merge commit, deploy Railway, esito della verifica e la regola di processo (leggere il corpo della review Devin prima di mergiare).

Nel repo plugin, aggiorna `.claude/session-state.md` (sezione «Prossimi passi»): B5 chiuso, restano il caricamento dello zip v2.5.0 sul marketplace e la verifica end-to-end di Track A sulla macchina dell'utente.

---

## Cosa NON fa questo piano

- **Non** cambia la logica di rete: nessuna richiesta a ItalGiure senza cookie, nessun timeout in più, nessuna nuova dipendenza.
- **Non** cambia il contratto pubblico: envelope, prefisso `SOURCE_UNAVAILABLE:`, nomi dei tool e schemi di input restano come sono.
- **Non** risolve il modello di autenticazione dell'area riservata (header `Authorization: Basic` invece del cookie): la ricerca Cassazione resta sul canale client.
- **Non** affronta i Minor già archiviati (build di `dist/` in CI, «Prova SentenzeWeb» a `italgiure-client.ts:403`, accenti nei nomi dei test, duplicazione descrizioni↔costanti, narrativa di `AGENTS.md`): restano in lista.
- **Non** modifica le descrizioni degli altri tool oltre a quella rettificata in Task 2.
- **Non** ripara lo script `npm run lint` del repo (ESLint 9 senza `eslint.config.js`): il job `lint` della CI in realtà esegue il typecheck.

---

### Task 7: B6 — riconciliazione lato plugin (spec B6, 2026-11-11)

**Files:**
- Modify: `bettercallclaude_italia/skills/italgiure-search/SKILL.md`, `skills/italian-legal-research/SKILL.md`,
  `skills/italian-legal-strategy/SKILL.md`, `agents/researcher.md`, `skills/italgiure-browser/SKILL.md`,
  `CONNECTORS.md`, `docs/cassazione-cookie.md`, `README.md`
- Create: `scripts/check-cassazione-narrative.js`, `scripts/check-cassazione-narrative.test.js`
- Modify: `package.json` (script `test`)

**Regola** (unica, da ripetere ovunque): il server ospitato non può interrogare ItalGiure
perché l'IP datacenter è scartato; il tool lo dichiara: la chiamata va a buon fine
(`success: true`) ma `data.autenticazione.cookieValido` è `false` e
`data.autenticazione.messaggio` spiega il motivo. In quel caso → canale client.

**Sostituzioni esatte**:

1. `skills/italgiure-search/SKILL.md` frontmatter: `la ricerca con il server MCP ha restituito
   zero risultati o un timeout` → `la ricerca con il server MCP ha risposto con
   autenticazione.cookieValido false (il server non ha potuto interrogare ItalGiure)`.
2. `skills/italgiure-search/SKILL.md` corpo: `la connessione va in timeout, con o senza cookie di
   sessione. Percio' il tool \`cassazione_search_massime\` lato server non restituisce risultati, e
   non e' un problema di cookie mancante.` → `la connessione non raggiunge il servizio, con o senza
   cookie di sessione. Il tool \`cassazione_search_massime\` lato server lo dichiara: la chiamata va
   a buon fine, ma \`autenticazione.cookieValido\` vale \`false\` e \`autenticazione.messaggio\` spiega
   perche'. Non e' un problema di cookie mancante, e non e' un timeout da aspettare: e' il blocco per
   IP del datacenter.`
3. `skills/italgiure-search/SKILL.md` «Quando usarla»: `dopo un \`cassazione_search_massime\` lato
   server che ha restituito zero risultati o un timeout` → `dopo un \`cassazione_search_massime\` lato
   server che ha risposto con \`autenticazione.cookieValido: false\` (il server non ha potuto
   interrogare la fonte)`.
4. `skills/italian-legal-research/SKILL.md`, `skills/italian-legal-strategy/SKILL.md`,
   `agents/researcher.md` (frase identica): `Se una chiamata lato server va in timeout o restituisce
   zero risultati, non è un problema di cookie: è il blocco per IP di datacenter.` → `Se una
   chiamata lato server risponde con \`autenticazione.cookieValido: false\`, il server non ha potuto
   interrogare la fonte (in hosting è il blocco per IP del datacenter): non è un problema di cookie.`
5. `agents/researcher.md` (riga del canale): `quindi il canale server non è raggiungibile` →
   `quindi il canale server non può interrogare la fonte e lo dichiara con
   \`autenticazione.cookieValido: false\``.
6. `skills/italgiure-browser/SKILL.md`: `e restituirebbe zero risultati senza motivo` → `e
   risponderebbe con \`autenticazione.cookieValido: false\` e il messaggio che lo dichiara`.
7. `CONNECTORS.md` (tabella cassazione): le due righe dei tool non descrivono più un tool
   funzionante «porzione pubblica» → il tool dichiara che in hosting non raggiunge la fonte e il
   canale supportato è la skill `italgiure-search` dal computer dell'utente; il parametro `cookie`
   resta indicato per i server locali con IP ammesso.
8. `docs/cassazione-cookie.md`: §3, FAQ «Il server non risponde» e riepilogo → il server non ha potuto
   interrogare la fonte e lo dichiara (`autenticazione.cookieValido: false` + messaggio), non è un
   errore e non va aspettato un timeout.
9. `README.md` del plugin (sezione «Ricerca Cassazione»): «Il canale server non è disponibile» →
   il canale server ospitato non può interrogare la fonte e lo dichiara con
   `autenticazione.cookieValido: false`.
10. Nuovo `scripts/check-cassazione-narrative.js` (pattern di `scripts/check-tool-names.js`: node
    puro, exit 1 sulla violazione, directory del plugin come argomento facoltativo) che vieta nei
    file del plugin la formula obsoleta e pretende la menzione di `cookieValido` dove si descrive il
    fallback del server; `scripts/check-cassazione-narrative.test.js` con fixture temporanee (pattern
    di `scripts/check-tool-names.test.js`); wiring in `package.json` → `test`.

**Verifica**: `node scripts/generate-tool-frontmatter.js --apply` (cambia la description della skill),
`node scripts/validate-plugin.js`, `node scripts/check-tool-names.js`, `npm test` (4 suite),
`npm run package` per rigenerare `dist/bettercallclaude_italia-v2.5.0.zip` (gitignored).
