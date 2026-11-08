# Ricerca legale affidabile — Track A (plugin) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Far funzionare la ricerca di legittimità sul PC dell'utente, eliminare i riferimenti a tool inesistenti, e sbloccare le banche dati esterne che l'utente ha in abbonamento.

**Architecture:** La query Cassazione smette di passare dal server MCP (il cui IP è scartato da `italgiure.giustizia.it` a livello TCP) e passa a girare sulla macchina dell'utente: una nuova skill `italgiure-search` costruisce la query Solr e la esegue con `curl`, mappando la risposta nella stessa forma di `cassazione_search_massime`. Una seconda skill, `italgiure-browser`, copre l'area riservata (massime complete, Rv.) in modalità presidiata. Tutto il resto è manutenzione: nomi di tool, documentazione del cookie, instradamento Normattiva, clausola di perimetro.

**Tech Stack:** Markdown (skill, agent, comandi), Node.js ≥ 20 (script puri, nessuna dipendenza), `curl` (unica gamba di rete), test standalone in stile `node:assert`.

## Global Constraints

- Repository: `/Users/federicocesconi/Dev/bettercallclaude_italia`, branch `main`.
- Lingua di **tutto** il contenuto nuovo (skill, commenti, messaggi utente, CHANGELOG): **italiano**. I nomi di file, i flag e le chiavi JSON restano in inglese.
- Il perimetro del segreto professionale non si allarga: **la gamba di rete deve passare da `curl`**, perché `NETWORK_COMMANDS` in `bettercallclaude_italia/scripts/privacy-check.js:312` intercetta `curl`/`wget`/`nc`/`ssh` ma **non** un `node script.js` che fa HTTP da sé. Un Node script che fa rete sarebbe un buco nel perimetro.
- Gli script Node del plugin devono essere **puri/locali**: nessuna richiesta di rete, nessuna dipendenza esterna (solo `node:assert`, `node:fs`, `node:path`).
- Gli script standalone del plugin si testano con `node <script>.test.js` (nessun framework), con l'helper `t(name, fn)` e `node:assert`.
- La versione del plugin compare in **quattro** file e deve essere allineata: `package.json`, `bettercallclaude_italia/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, badge in `README.md` riga 1. `scripts/validate-plugin.js` fallisce se non coincidono.
- Il testo delle descrizioni di skill e agent è limitato a **1024 caratteri** (`scripts/validate-plugin.js`, `DESC_MAX`): `node scripts/validate-plugin.js` deve restare verde.
- Il catalogo dei tool è `SERVER_TOOLS` in `scripts/generate-tool-frontmatter.js:29-40`. È l'unica fonte: nessuna lista separata.
- Priorità di rilascio: questo piano è **Rel-1** (ripara la ricerca). Il Track B (server) è **Rel-2** e non è un prerequisito.

## Struttura dei file

| File | Ruolo |
|---|---|
| `scripts/check-tool-names.js` | validatore frontmatter + **prosa** (modificato) |
| `scripts/check-tool-names.test.js` | test del validatore, con fixture in tmp (creato) |
| `skills/italian-legal-research/SKILL.md` | workflow di ricerca: tool reali, Normattiva, fonti esterne, cookie (modificato) |
| `skills/italian-legal-strategy/SKILL.md` | `find_leading_cases` → nome reale (modificato) |
| `skills/italian-legal-search/` — **non esiste**, vedi Task 3 | — |
| `skills/italgiure-search/SKILL.md` | procedura di ricerca client-side (creato) |
| `skills/italgiure-search/scripts/italgiure-query.js` | costruzione query + mappatura risposta, puro (creato) |
| `skills/italgiure-search/scripts/italgiure-query.test.js` | test dello script (creato) |
| `skills/italgiure-browser/SKILL.md` | area riservata, modalità presidiata (creato) |
| `skills/italgiure-browser/references/discovery.md` | procedura di discovery dei campi (creato) |
| `docs/cassazione-cookie.md` | guida all'area riservata, riscritta (modificato) |
| `agents/researcher.md` | prompt di richiesta cookie, riscritto (modificato) |
| `bettercallclaude_italia/.claude-plugin/plugin.json` | `userConfig.fonti_esterne`, `italgiure_cookie` (modificato) |
| `commands/*.md` (24 file) | eccezione fonti esterne inline (modificato) |
| `CHANGELOG.md`, `README.md`, `package.json`, `marketplace.json` | rilascio 2.5.0 (modificato) |


## Corrispondenza con la spec

La spec e' `docs/superpowers/specs/2026-11-08-ricerca-legale-affidabilita-design.md`
(revisione 2).

| Sezione della spec | Task di questo piano |
|---|---|
| A1 — Tool names inesistenti: fix e prevenzione | Task 1 |
| A2 — Skill `italgiure-search` (query dal client) | Task 2 (script puro) + Task 3 (SKILL.md) |
| A3 — Skill `italgiure-browser` (area riservata, presidiata) | Task 4 |
| A4 — Documentazione del cookie riscritta | Task 5 |
| A5 — Instradamento Normattiva | Task 6 |
| A6 — Fonti esterne dell'utente | Task 7 |
| Release 2.5.0 | Task 8 |
| Non obiettivi N1-N6 | Vincoli globali e «Cosa non fa questo piano» |

---

### Task 1: Validatore della prosa + fix dei 7 riferimenti rotti

Il validatore esistente controlla solo il frontmatter `tools:`. I 7 riferimenti rotti vivono nella **prosa** delle skill, che non viene guardata: sono sfuggiti a ogni review. Questo task rende il controllo cieco-alla-prosa e pulisce il corpus, così la regola può entrare in CI senza rosso.

**Files:**
- Create: `scripts/check-tool-names.test.js`
- Modify: `scripts/check-tool-names.js`
- Modify: `bettercallclaude_italia/skills/italian-legal-research/SKILL.md` (righe 77, 81, 85, 89, 107, 108)
- Modify: `bettercallclaude_italia/skills/italian-legal-strategy/SKILL.md` (riga 38)

**Interfaces:**
- Consumes: nessuno.
- Produces: `check-tool-names.js` accetta un argomento posizionale facoltativo = directory del plugin da validare (default: `bettercallclaude_italia`). Esce con codice 1 e su stderr la riga `ERRORE PROSA: <file> — "<tool>" non esiste nel catalogo SERVER_TOOLS` per ogni tool citato in prosa e assente dal catalogo.

- [ ] **Step 1: scrivi il test che fallisce**

Crea `scripts/check-tool-names.test.js`:

```javascript
#!/usr/bin/env node
/**
 * Test del validatore dei nomi di tool (scripts/check-tool-names.js).
 * Girano con `node scripts/check-tool-names.test.js` -- nessun framework.
 *
 * Il validatore accetta un argomento posizionale facoltativo: la directory
 * del plugin da validare. I test ci passano directory temporanee con
 * fixture, cosi' possono esercitare i casi di errore senza sporcare il repo.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(ROOT, 'scripts', 'check-tool-names.js');

let passed = 0;
let failed = 0;

function t(name, fn) {
  try {
    fn();
    console.log('  ok  ' + name);
    passed++;
  } catch (e) {
    console.error('  FAIL ' + name);
    console.error('       ' + (e && e.message ? e.message : e));
    failed++;
  }
}

/** Crea una directory temporanea con i file indicati e la restituisce. */
function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bcc-toolnames-'));
  for (const rel of Object.keys(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, files[rel], 'utf8');
  }
  return dir;
}

/** Esegue il validatore su una directory e restituisce { code, output }. */
function run(dir) {
  try {
    const out = execFileSync('node', [CHECKER, dir], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, output: out };
  } catch (e) {
    const output = String(e.stdout || '') + String(e.stderr || '');
    return { code: e.status === undefined ? 1 : e.status, output: output };
  }
}

const SKILL_WITH_BROKEN_TOOL = [
  '---',
  'name: fixture-skill',
  'description: "Fixture di test per il validatore dei nomi di tool."',
  'tools:',
  '  - Read',
  '---',
  '',
  '# Fixture',
  '',
  'Usa `get_article(statute_number, article)` per recuperare il testo.',
  '',
].join('\n');

const SKILL_WITH_VALID_TOOL = [
  '---',
  'name: fixture-skill',
  'description: "Fixture di test per il validatore dei nomi di tool."',
  'tools:',
  '  - Read',
  '---',
  '',
  '# Fixture',
  '',
  'Usa `normattiva_search(query)` per cercare.',
  '',
].join('\n');

const SKILL_WITH_GENERIC_CALL = [
  '---',
  'name: fixture-skill',
  'description: "Fixture di test per il validatore dei nomi di tool."',
  'tools:',
  '  - Read',
  '---',
  '',
  '# Fixture',
  '',
  'La funzione `filter(items)` ordina i risultati.',
  '',
].join('\n');

console.log('check-tool-names: prosa');

t('rifiuta un tool inesistente citato in prosa', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_WITH_BROKEN_TOOL });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il validatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('get_article'),
    'l\'output deve nominare il tool rotto, got:\n' + r.output
  );
});

t('accetta un tool del catalogo citato in prosa', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_WITH_VALID_TOOL });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'il validatore deve accettare, output:\n' + r.output);
});

t('non segnala le chiamate a funzione generiche', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_WITH_GENERIC_CALL });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'i nomi senza underscore non sono tool, output:\n' + r.output);
});

console.log('check-tool-names: corpus reale');

t('il corpus reale del plugin non ha riferimenti rotti in prosa', () => {
  const r = run(path.join(ROOT, 'bettercallclaude_italia'));
  assert.strictEqual(r.code, 0, 'output:\n' + r.output);
});

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: esegui il test e verifica che fallisce**

Run: `node scripts/check-tool-names.test.js`

Expected: FAIL su «rifiuta un tool inesistente citato in prosa» — perché `scripts/check-tool-names.js` non ha ancora il controllo sulla prosa e non accetta un argomento; il codice di uscita è 0 anche quando dovrebbe essere 1. Il test «il corpus reale del plugin non ha riferimenti rotti in prosa» fallisce anch'esso, perché i 5 nomi rotti sono ancora presenti.

- [ ] **Step 3: aggiungi il controllo sulla prosa al validatore**

In `scripts/check-tool-names.js`, tre modifiche.

(a) Dopo `const TARGETS = [...]`, aggiungi la regex e l'aiutante:

```javascript
// ---------------------------------------------------------------------------
// Controllo prosa: nomi di tool citati nel corpo dei file.
//
// Il controllo sul frontmatter non basta: le skill invocano tool anche nel
// corpo del testo (es. `get_article(statute_number, article)`) e quei
// riferimenti non compaiono in nessun allowlist -- il modello li chiama e
// riceve "No such tool available" a runtime.
//
// Criterio: token racchiusi tra backtick con la forma `nome(`, dove nome e' in
// minuscolo e contiene almeno un underscore. L'underscore e' il discriminante:
// tutti i nomi del catalogo SERVER_TOOLS lo contengono, mentre le chiamate a
// funzione generiche citate in prosa (filter(...), parse(...)) no.
// ---------------------------------------------------------------------------

const PROSE_TOOL_RE = /`([a-z][a-z0-9_-]*_[a-z0-9_-]*)\(/g;

function collectProseTools(content) {
  // La prosa e' tutto cio' che segue il frontmatter.
  const fm = content.match(/^---\n([\s\S]*?)\n---\n/);
  const body = fm ? content.slice(fm[0].length) : content;
  const found = new Set();
  let m;
  PROSE_TOOL_RE.lastIndex = 0;
  while ((m = PROSE_TOOL_RE.exec(body)) !== null) {
    found.add(m[1]);
  }
  return found;
}
```

(b) Subito dopo `const { registeredServers, serverTools } = loadCatalog();` aggiungi l'unione dei tool:

```javascript
// Unione dei nomi di tool di tutti i server: un token di prosa e' valido se
// esiste in QUALSIASI server, non solo in quelli citati dal file.
const ALL_TOOL_NAMES = new Set();
for (const tools of Object.values(serverTools)) {
  for (const name of tools) ALL_TOOL_NAMES.add(name);
}
```

(c) Nel ciclo principale, sostituisci il blocco

```javascript
    const tools = extractToolsList(fs.readFileSync(file, 'utf8'));
    if (!tools) continue;
    filesChecked++;
```

con

```javascript
    const content = fs.readFileSync(file, 'utf8');
    const tools = extractToolsList(content);
    const proseTools = collectProseTools(content);
    for (const name of proseTools) {
      if (!ALL_TOOL_NAMES.has(name)) {
        proseViolations.push({ file: path.relative(root, file), tool: name });
      }
    }
    if (!tools) continue;
    filesChecked++;
```

e, subito dopo la dichiarazione `const unknown = [];`, aggiungi:

```javascript
const proseViolations = [];
```

(d) Prima di `if (failed) process.exit(1);` aggiungi il blocco di reporting:

```javascript
if (proseViolations.length) {
  failed = true;
  console.error(`FAIL: ${proseViolations.length} riferimenti a tool inesistenti nella prosa:\n`);
  for (const v of proseViolations) {
    console.error(`  ${v.file}`);
    console.error(`    "${v.tool}" non esiste nel catalogo SERVER_TOOLS`);
  }
  console.error('\nOgni tool citato in prosa come `nome(...)` deve esistere in SERVER_TOOLS.');
  console.error('Fix: correggi il nome nella prosa, oppure aggiungi il tool a SERVER_TOOLS in');
  console.error('generate-tool-frontmatter.js (se esiste davvero) e rigenera.');
}
```

(e) Per accettare la directory come argomento, sostituisci

```javascript
const pluginDir = path.join(root, 'bettercallclaude_italia');
```

con

```javascript
const pluginDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'bettercallclaude_italia');
```

- [ ] **Step 4: correggi i 7 riferimenti rotti**

In `bettercallclaude_italia/skills/italian-legal-research/SKILL.md`:

riga 77, da
```
- `get_article(statute_number, article)` — recupera testo articolo
```
a
```
- `normattiva_get_atto(codiceRedazionale, dataGU)` — recupera i metadati dell'atto (non il testo degli articoli: vedi A5 della spec)
```

riga 81, da
```
- `get_decision(id)` — recupera testo sentenza
```
a
```
- `corte-costituzionale_get_sentenza(id)` — recupera testo sentenza
```

riga 85, da
```
- `get_decision(id)` — recupera testo decisione
```
a
```
- `giustizia-amministrativa_get_sentenza(id)` — recupera testo decisione
```

riga 89, da
```
- `get_article(act_number, article)` — recupera testo articolo
```
a
```
- `eur-lex-ita_get_atto_celex(celex)` — recupera l'atto UE in italiano
```

riga 107, da
```
- `format_citation(citation, target_language)` — converte IT/EN
```
a
```
- `legal-citations-ita_format(citation, target_language)` — converte IT/EN
```

riga 108, da
```
- `parse_citation(citation)` — scompone i componenti
```
a
```
- `legal-citations-ita_parse(citation)` — scompone i componenti
```

In `bettercallclaude_italia/skills/italian-legal-strategy/SKILL.md`, riga 38, da
```
- `cassazione` → `find_leading_cases(query)`
```
a
```
- `cassazione` → `cassazione_search_massime(query)`
```

- [ ] **Step 5: esegui il test e verifica che passa**

Run: `node scripts/check-tool-names.test.js`

Expected: 4 `ok`, `4 passed, 0 failed`.

Run: `node scripts/check-tool-names.js`

Expected: `OK: N files checked, ...` e `OK: all entries validated against the catalog ...`, exit code 0. Se l'ultima riga segnala ancora riferimenti rotti, ne resta qualcuno: individuali con `grep -rn 'get_article\|get_decision\|find_leading_cases\|format_citation\|parse_citation' bettercallclaude_italia/skills bettercallclaude_italia/agents bettercallclaude_italia/commands` e correggi.

- [ ] **Step 6: committa**

```bash
git add scripts/check-tool-names.js scripts/check-tool-names.test.js \
  bettercallclaude_italia/skills/italian-legal-research/SKILL.md \
  bettercallclaude_italia/skills/italian-legal-strategy/SKILL.md
git commit -m "fix(skills): corregge i 7 tool inesistenti citati in prosa e aggiunge il relativo controllo

check-tool-names.js validava solo il frontmatter tools: e lasciava passare
i riferimenti citati nel corpo delle skill, che a runtime falliscono con
'No such tool available'. Il validatore ora controlla anche la prosa e ha un
test con fixture.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 2: Script puro di costruzione query e mappatura risposta

Lo script fa le due operazioni che devono dare risultati identici a `cassazione_search_massime`: costruire il parametro `q` di Solr e mappare la risposta JSON nella forma standard. È **puro**: nessuna rete, nessuna dipendenza. La rete la fa `curl`, così l'hook privacy continua a intercettare la chiamata.

**Files:**
- Create: `bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.js`
- Create: `bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.test.js`

**Interfaces:**
- Consumes: nessuno.
- Produces:
  - `buildSolrQuery(opts)` → `string`. `opts`: `{ query: string, materia?: 'civile'|'penale', anno?: number, tipo?: 'sentenza'|'ordinanza'|'decreto' }`. Semantica identica a `buildSolrQuery` in `mcp-servers/cassazione/src/tools/italgiure-client.ts:65`.
  - `formatResponse(payload)` → `{ totale: number, massime: Array<{ id, estremi, sezione, tipo, dataDecisione, dataDeposito?, urlPdf? }> }`. `payload`: JSON già decodificato della risposta Solr.
  - CLI: `node italgiure-query.js build --query "..." [--materia civile] [--anno 2024] [--tipo ordinanza]` stampa il parametro `q` su stdout. `node italgiure-query.js format` legge il JSON Solr da stdin e stampa il JSON della forma standard su stdout.

- [ ] **Step 1: scrivi il test che fallisce**

Crea `bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.test.js`:

```javascript
#!/usr/bin/env node
/**
 * Test di italgiure-query.js -- costruzione query Solr e mappatura risposta.
 *   node bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.test.js
 */

'use strict';

const assert = require('node:assert');
const { buildSolrQuery, formatResponse } = require('./italgiure-query.js');

let passed = 0;
let failed = 0;

function t(name, fn) {
  try {
    fn();
    console.log('  ok  ' + name);
    passed++;
  } catch (e) {
    console.error('  FAIL ' + name);
    console.error('       ' + (e && e.message ? e.message : e));
    failed++;
  }
}

console.log('buildSolrQuery');

t('testo libero in parentesi', () => {
  assert.strictEqual(buildSolrQuery({ query: 'responsabilita medica' }), '(responsabilita medica)');
});

t('escape dei caratteri speciali Solr', () => {
  const q = buildSolrQuery({ query: 'test (special) [chars]' });
  assert.ok(q.includes('\\('), 'deve escapare la parentesi aperta, got: ' + q);
  assert.ok(q.includes('\\)'), 'deve escapare la parentesi chiusa, got: ' + q);
});

t('usa la query grezza quando contiene sintassi Solr', () => {
  const q = buildSolrQuery({ query: '(foo AND bar) OR baz:qux~7' });
  assert.strictEqual(q, '(foo AND bar) OR baz:qux~7');
});

t('filtro materia civile', () => {
  assert.strictEqual(buildSolrQuery({ query: 'danno', materia: 'civile' }), '(danno) AND kind:"snciv"');
});

t('filtro materia penale', () => {
  assert.strictEqual(buildSolrQuery({ query: 'omicidio', materia: 'penale' }), '(omicidio) AND kind:"snpen"');
});

t('filtro anno', () => {
  assert.strictEqual(buildSolrQuery({ query: 'furto', anno: 2023 }), '(furto) AND anno:"2023"');
});

t('filtro tipo con iniziale maiuscola', () => {
  assert.strictEqual(buildSolrQuery({ query: 'danno', tipo: 'sentenza' }), '(danno) AND tipoprov:"Sentenza"');
});

t('tutti i filtri insieme', () => {
  const q = buildSolrQuery({ query: 'danno', materia: 'civile', anno: 2024, tipo: 'ordinanza' });
  assert.strictEqual(q, '(danno) AND kind:"snciv" AND anno:"2024" AND tipoprov:"Ordinanza"');
});

t('rifiuta una query vuota', () => {
  assert.throws(() => buildSolrQuery({ query: '   ' }), /query/i);
});

console.log('formatResponse');

const SOLR_PAYLOAD = {
  response: {
    numFound: 2,
    start: 0,
    docs: [
      {
        id: 'snciv2025332127S',
        filename: ['./snciv/snciv2025332127S.txt'],
        szdec: 'III',
        tipoprov: 'Sentenza',
        datdec: '2025-06-12',
        numdec: '17006',
        anno: '2025',
        kind: 'snciv',
        datdep: ['2025-09-01'],
      },
      {
        id: 'snciv2025332128S',
        filename: [],
        szdec: 'I',
        tipoprov: 'Sentenza',
        datdec: '2025-07-01',
        numdec: '17007',
        anno: '2025',
        kind: 'snciv',
      },
    ],
  },
};

t('mappa il totale', () => {
  assert.strictEqual(formatResponse(SOLR_PAYLOAD).totale, 2);
});

t('mappa gli estremi', () => {
  const m = formatResponse(SOLR_PAYLOAD).massime[0];
  assert.strictEqual(m.estremi, 'Sez. III Sentenza n. 17006 del 2025');
  assert.strictEqual(m.sezione, 'III');
  assert.strictEqual(m.tipo, 'Sentenza');
  assert.strictEqual(m.dataDecisione, '2025-06-12');
  assert.strictEqual(m.dataDeposito, '2025-09-01');
  assert.strictEqual(m.id, 'snciv2025332127S');
});

t('costruisce il link al PDF', () => {
  const m = formatResponse(SOLR_PAYLOAD).massime[0];
  assert.strictEqual(
    m.urlPdf,
    'https://www.italgiure.giustizia.it/sncass/snciv/snciv2025332127S.txt'
  );
});

t('un documento senza filename non ha urlPdf', () => {
  const m = formatResponse(SOLR_PAYLOAD).massime[1];
  assert.strictEqual(m.urlPdf, undefined);
});

t('usa l\'id come estremi quando mancano i campi', () => {
  const out = formatResponse({
    response: { numFound: 1, start: 0, docs: [{ id: 'xyz' }] },
  });
  assert.strictEqual(out.massime[0].estremi, 'xyz');
});

t('una risposta vuota non fallisce', () => {
  const out = formatResponse({ response: { numFound: 0, start: 0, docs: [] } });
  assert.strictEqual(out.totale, 0);
  assert.deepStrictEqual(out.massime, []);
});

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
```

- [ ] **Step 2: esegui il test e verifica che fallisce**

Run: `node bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.test.js`

Expected: FAIL con `Cannot find module './italgiure-query.js'`.

- [ ] **Step 3: scrivi l'implementazione**

Crea `bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.js`:

```javascript
#!/usr/bin/env node
/**
 * Costruzione della query Solr di ItalGiure e mappatura della risposta.
 *
 * Puro di proposito: questo script NON fa richieste di rete. La gamba di rete
 * e' `curl`, eseguita dalla skill, perche' l'hook privacy del plugin
 * (NETWORK_COMMANDS in scripts/privacy-check.js) intercetta curl/wget/nc ma
 * non un `node script.js` che fa HTTP da se'. Se questo script facesse rete,
 * la chiamata uscirebbe dal perimetro di controllo del segreto professionale.
 *
 * Uso:
 *   node italgiure-query.js build --query "responsabilita medica" \
 *        [--materia civile|penale] [--anno 2024] [--tipo sentenza|ordinanza|decreto]
 *   node italgiure-query.js format      # legge il JSON Solr da stdin
 */

'use strict';

const ITALGIURE_BASE = 'https://www.italgiure.giustizia.it/sncass';

/**
 * Costruisce il parametro `q` della query Solr.
 *
 * La semantica e' identica a buildSolrQuery() del server cassazione
 * (mcp-servers/cassazione/src/tools/italgiure-client.ts): se la query
 * contiene gia' sintassi Solr viene usata cosi', altrimenti e' trattata come
 * testo libero con prossimita' implicita.
 */
function buildSolrQuery(opts) {
  const input = opts || {};
  const raw = typeof input.query === 'string' ? input.query.trim() : '';
  if (!raw) {
    throw new Error('buildSolrQuery: la query non puo\' essere vuota');
  }

  const clauses = [];

  if (raw.startsWith('(') || raw.includes(':') || raw.includes('~') ||
      raw.includes('AND') || raw.includes('OR')) {
    clauses.push(raw);
  } else {
    const escaped = raw.replace(/([+\-!(){}[\]^"~*?:\\/])/g, '\\$1');
    clauses.push('(' + escaped + ')');
  }

  if (input.materia === 'civile') {
    clauses.push('kind:"snciv"');
  } else if (input.materia === 'penale') {
    clauses.push('kind:"snpen"');
  }

  if (input.anno && input.anno > 0) {
    clauses.push('anno:"' + input.anno + '"');
  }

  if (input.tipo) {
    const tipo = input.tipo.charAt(0).toUpperCase() + input.tipo.slice(1).toLowerCase();
    clauses.push('tipoprov:"' + tipo + '"');
  }

  return clauses.join(' AND ');
}

/**
 * Mappa la risposta Solr nella forma standard del plugin, identica a quella
 * di cassazione_search_massime.
 */
function formatResponse(payload) {
  const response = (payload && payload.response) || {};
  const docs = Array.isArray(response.docs) ? response.docs : [];
  const totale = typeof response.numFound === 'number' ? response.numFound : docs.length;

  const massime = docs.map(function (doc) {
    const d = doc || {};
    const estremi =
      d.numdec && d.anno && d.szdec
        ? 'Sez. ' + d.szdec + ' ' + (d.tipoprov || 'Provvedimento') + ' n. ' + d.numdec + ' del ' + d.anno
        : String(d.id || '');

    let urlPdf;
    if (Array.isArray(d.filename) && d.filename.length && d.filename[0]) {
      const clean = String(d.filename[0]).replace(/^\.\//, '');
      urlPdf = ITALGIURE_BASE + '/' + clean;
    }

    const out = {
      id: String(d.id || ''),
      estremi: estremi,
      sezione: d.szdec || '',
      tipo: d.tipoprov || '',
      dataDecisione: d.datdec || '',
    };

    if (Array.isArray(d.datdep) && d.datdep.length) {
      out.dataDeposito = d.datdep[0];
    }
    if (urlPdf) {
      out.urlPdf = urlPdf;
    }

    return out;
  });

  return { totale: totale, massime: massime };
}

/**
 * Parsing degli argomenti della CLI.
 * build: --query (obbligatorio), --materia, --anno, --tipo
 */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--query') out.query = argv[++i];
    else if (a === '--materia') out.materia = argv[++i];
    else if (a === '--anno') out.anno = Number(argv[++i]);
    else if (a === '--tipo') out.tipo = argv[++i];
  }
  return out;
}

function readStdin() {
  return new Promise(function (resolve, reject) {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function (chunk) { data += chunk; });
    process.stdin.on('end', function () { resolve(data); });
    process.stdin.on('error', reject);
  });
}

async function main() {
  const mode = process.argv[2];

  if (mode === 'build') {
    const q = buildSolrQuery(parseArgs(process.argv.slice(3)));
    process.stdout.write(q + '\n');
    return;
  }

  if (mode === 'format') {
    const raw = await readStdin();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      throw new Error('format: lo stdin non contiene JSON valido: ' + e.message);
    }
    process.stdout.write(JSON.stringify(formatResponse(payload), null, 2) + '\n');
    return;
  }

  throw new Error('uso: italgiure-query.js build [--query Q] [--materia M] [--anno A] [--tipo T] | format');
}

if (require.main === module) {
  main().catch(function (err) {
    console.error('[' + (err && err.message ? err.message : err) + ']');
    process.exit(1);
  });
}

module.exports = {
  buildSolrQuery: buildSolrQuery,
  formatResponse: formatResponse,
  parseArgs: parseArgs,
  ITALGIURE_BASE: ITALGIURE_BASE,
};
```

- [ ] **Step 4: esegui il test e verifica che passa**

Run: `node bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.test.js`

Expected: 14 `ok`, `14 passed, 0 failed`.

- [ ] **Step 5: verifica la CLI a mano**

Run:
```bash
node bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.js build --query "responsabilita medica" --materia civile
```
Expected: `(responsabilita medica) AND kind:"snciv"`

Run:
```bash
echo '{"response":{"numFound":1,"docs":[{"id":"x1","szdec":"III","tipoprov":"Sentenza","numdec":"17006","anno":"2025","datdec":"2025-06-12"}]}}' \
  | node bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.js format
```
Expected: JSON con `"totale": 1` e `"estremi": "Sez. III Sentenza n. 17006 del 2025"`.

- [ ] **Step 6: committa**

```bash
git add bettercallclaude_italia/skills/italgiure-search/scripts/
git commit -m "feat(italgiure-search): script puro di costruzione query e mappatura risposta

Lo script non fa rete di proposito: la gamba di rete e' curl, che l'hook
privacy intercetta, mentre un node script con HTTP uscirebbe dal perimetro
di controllo del segreto professionale.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 3: Skill `italgiure-search` — la procedura di ricerca client-side

**Files:**
- Create: `bettercallclaude_italia/skills/italgiure-search/SKILL.md`

**Interfaces:**
- Consumes: `skills/italgiure-search/scripts/italgiure-query.js` (Task 2) — espone `build` e `format` via CLI.
- Produces: la skill `italgiure-search`, invocabile per nome da altre skill.

**Nota per chi implementa:** questa skill deve essere coerente con `skills/italian-legal-research/SKILL.md`, che nella Task 5 e nella Task 6 viene modificato. Non modificare quel file in questo task.

- [ ] **Step 1: scrivi la skill**

Crea `bettercallclaude_italia/skills/italgiure-search/SKILL.md`:

```markdown
---
name: italgiure-search
description: "Ricerca i precedenti della Corte di Cassazione interrogando l'indice pubblico SentenzeWeb dal PC dell'utente. La query parte dal computer dell'utente, non dal server BetterCallClaude: l'IP dei datacenter e' scartato da italgiure.giustizia.it. Restituisce estremi, sezione, data e link al PDF. Attivazione quando serve un precedente di legittimita' e la ricerca con il server MCP ha restituito zero risultati o un timeout. NON attivare per: ricerca normativa (usa italian-legal-research), verifica di citazioni esistenti (usa citation-content-verify), area riservata e massime complete (usa italgiure-browser)."
tools:
  - Bash
  - Read
  - Grep
  - Glob
---

# Ricerca Cassazione lato client

Interroga l'indice pubblico **SentenzeWeb** del CED Ministero della Giustizia.

## Perche' questa skill esiste

Il server MCP di BetterCallClaude e' deployato su un indirizzo IP di datacenter.
`www.italgiure.giustizia.it` **scarta a livello TCP** le richieste che arrivano da
quel tipo di indirizzo: la connessione va in timeout, con o senza cookie di
sessione. Percio' il tool `cassazione_search_massime` lato server non restituisce
risultati, e non e' un problema di cookie mancante.

Questa skill esegue la **stessa identica query** dalla macchina dell'utente, dove
l'IP e' ammesso. La risposta ha la stessa forma del tool server, cosi tutto a
valle funziona senza modifiche.

Vantaggio privacy: la ricerca **non transita dall'infrastruttura cloud di
BetterCallClaude**. Il termine di ricerca va diretto al Ministero della Giustizia.

## Quando usarla

- dopo un `cassazione_search_massime` lato server che ha restituito zero risultati
  o un timeout;
- quando l'utente chiede direttamente un precedente di Cassazione e il canale
  server non risponde;
- per verificare l'esistenza di una sentenza conoscendo gli estremi (numero e
  anno), in alternativa a `citation-verify-ita` per le sentenze.

Per l'**area riservata** (massime complete, Rv., conformi e difformi) usa
`italgiure-browser`. Per la **legislazione** usa `italian-legal-research`.

## Procedura

### Passo 1 — Costruisci la query

```bash
node scripts/italgiure-query.js build --query "TERMINE DI RICERCA" --materia civile --anno 2024
```

Flag opzionali: `--materia civile|penale`, `--anno YYYY`, `--tipo sentenza|ordinanza|decreto`.
Il termine di ricerca **non** deve contenere il testo della bozza o dati del
fascicolo: solo i termini giuridici da cercare.

### Passo 2 — Interroga l'indice

```bash
curl -sS -k -m 30 -X POST \
  "https://www.italgiure.giustizia.it/sncass/isapi/hc.dll/sn.solr/sn-collection/select?app.query" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "q=QUERY" \
  --data "rows=20&start=0&wt=json&fl=id,filename,szdec,tipoprov,datdec,numdec,anno,kind,datdep&sort=pd desc,datdec desc" \
  | node scripts/italgiure-query.js format
```

Note sulla invocazione:

- `-k`: l'host presenta una catena di certificazione non standard. Il server MCP
  fa lo stesso (`rejectUnauthorized: false`).
- `-m 30`: timeout esplicito. Se la `curl` va in timeout, l'IP corrente non e'
  ammesso: vedi «Se la ricerca fallisce».
- `curl` e non `node script.js`: l'hook privacy del plugin intercetta `curl` e i
  comandi di rete, e lascia passare i file locali. Usando `curl` la ricerca resta
  dentro il perimetro di controllo del segreto professionale.

Sostituisci `QUERY` con l'output del Passo 1, e `rows`/`start` con la
paginazione richiesta (20 risultati per pagina, `start = (pagina - 1) * 20`).

### Passo 3 — Presenta i risultati

La risposta e' gia' nella forma standard:

```json
{
  "totale": 42,
  "massime": [
    {
      "id": "snciv2025332127S",
      "estremi": "Sez. III Sentenza n. 17006 del 2025",
      "sezione": "III",
      "tipo": "Sentenza",
      "dataDecisione": "2025-06-12",
      "dataDeposito": "2025-09-01",
      "urlPdf": "https://www.italgiure.giustizia.it/sncass/..."
    }
  ]
}
```

Per ogni precedente, indica la provenienza: `Fonte: ItalGiure (SentenzeWeb pubblico)`.
Non attribuire a questa ricerca le **massime** (il testo della massima): l'indice
pubblico non le espone. Se servono le massime o gli Rv., serve l'area riservata.

## Se la ricerca fallisce

| Sintomo | Cosa significa | Cosa fare |
|---|---|---|
| `curl` va in timeout | l'IP corrente non e' ammesso da ItalGiure | offri la modalita' browser (`italgiure-browser`) e i link di ricerca manuale |
| `curl` restituisce HTML invece di JSON | la risposta non e' del Solr (redirection o blocco) | verifica l'URL, prova `-k` senza flag di header, e offri la modalita' browser |
| `totale: 0` | la ricerca e' andata a buon fine, non ci sono risultati | nessun errore: riporta che non ci sono precedenti per quei termini, e prova con la ricerca per estremi |
| errore di JSON | risposta troncata o non-JSON | riprova con `rows` piu' piccolo |

Il messaggio all'utente deve dire chiaramente **quale** dei due casi e': canale
irraggiungibile (timeout) oppure nessun risultato (totale 0). Sono problemi
diversi e non vanno confusi.

Nota: questa modalita' copre gli utenti su IP ammesso (in Italia). Coprire anche
gli utenti fuori dall'Italia richiede che il server abbia un'uscita in Italia:
non e' una funzionalita' del plugin.
```

- [ ] **Step 2: verifica che la skill sia valida**

Run: `node scripts/validate-plugin.js`

Expected: verde, e la riga `✅ Skill descriptions within 1024-char limit (N checked)` con N aumentato di 1.

Run: `node scripts/check-tool-names.js`

Expected: exit 0.

La regex del controllo richiede che il nome sia **seguito da una parentesi tonda**
(`nome(`), non basta che sia racchiuso tra backtick: percio' i nomi di skill citati
come `italgiure-search` e `italgiure-browser` **non** vengono segnalati e non
devono toccare i backtick. `cassazione_search_massime` esiste nel catalogo e va
bene cosi'.

Se il validatore segnala un token, quel nome e' invocato come funzione: correggi il
riferimento (vedi Task 1, Step 4) invece di togliere i backtick.

- [ ] **Step 3: verifica la procedura a mano (richiede IP ammesso)**

Su una macchina con IP ammesso (IP dell'utente, in Italia):

```bash
cd bettercallclaude_italia/skills/italgiure-search
Q=$(node scripts/italgiure-query.js build --query "responsabilita medica" --materia civile)
curl -sS -k -m 30 -X POST \
  "https://www.italgiure.giustizia.it/sncass/isapi/hc.dll/sn.solr/sn-collection/select?app.query" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "q=$Q" \
  --data "rows=3&start=0&wt=json&fl=id,filename,szdec,tipoprov,datdec,numdec,anno,kind,datdep&sort=pd desc,datdec desc" \
  | node scripts/italgiure-query.js format
```

Expected: JSON con `totale` > 0 e `massime` non vuota.

Se il comando va in timeout: l'IP non e' ammesso. Non e' un difetto della skill:
ferma li', annota il risultato nel piano di verifica della spec e vai avanti con
le task che non dipendono dalla rete. Il test end-to-end resta da fare sulla
macchina dell'utente.

- [ ] **Step 4: committa**

```bash
git add bettercallclaude_italia/skills/italgiure-search/SKILL.md
git commit -m "feat(italgiure-search): skill di ricerca Cassazione dal PC dell'utente

Il server MCP non puo' raggiungere italgiure.giustizia.it dal proprio IP di
datacenter. La skill esegue la stessa query dal computer dell'utente e restituisce
la stessa forma di cassazione_search_massime. La rete passa da curl, cosi' il
perimetro dell'hook privacy non si allarga.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 4: Skill `italgiure-browser` — area riservata in modalità presidiata

**Files:**
- Create: `bettercallclaude_italia/skills/italgiure-browser/SKILL.md`
- Create: `bettercallclaude_italia/skills/italgiure-browser/references/discovery.md`

**Interfaces:**
- Consumes: nessuno.
- Produces: la skill `italgiure-browser`, invocabile per nome. Restituisce la stessa forma di `cassazione_search_massime`.

- [ ] **Step 1: scrivi la skill**

Crea `bettercallclaude_italia/skills/italgiure-browser/SKILL.md`:

```markdown
---
name: italgiure-browser
description: "Interroga l'area riservata ItalGiure usando la sessione gia' autenticata del browser dell'utente, per ottenere massime complete, Rv., conformi e difformi e ricerca per estremi. Modalita' presidiata: richiede un connettore browser collegato, autorizzazione esplicita dell'utente e login verificato. Non chiede mai credenziali e non trasmette nulla fuori dal browser. Attivazione quando servono massime complete o gli estremi di una sentenza e la ricerca per parole non basta. NON attivare per: ricerca di massa (usa italgiure-search)."
tools:
  - Bash
  - Read
  - Grep
  - Glob
  - WebFetch
---

# Area riservata ItalGiure dal browser

Interroga l'area riservata ItalGiure **usando la sessione che l'utente ha gia'
aperto nel suo browser**. Le credenziali non lasciano mai il browser: e' il
browser dell'utente a fare la richiesta.

Questa modalita' serve per cio' che l'indice pubblico non dà: **massime
complete**, **Rv.**, **conformi e difformi**, e la **ricerca per estremi**.

Per la ricerca per parole sull'indice pubblico usa la skill italgiure-search:
e' piu' rapida, restituisce JSON e non richiede alcuna interazione.

## Tre precondizioni, tutte necessarie

1. **Un connettore browser e' disponibile in sessione.** Rilevato per
   disponibilita' degli strumenti (Chrome DevTools MCP, Claude in Chrome, o altro
   connettore compatibile). Se non c'e', questa skill non e' utilizzabile: non
   tentare di aggirare.
2. **L'utente ha autorizzato esplicitamente questa modalita'** nella conversazione
   corrente. Nessuna autorizzazione implicita, nessuna autorizzazione ereditata da
   una sessione precedente. Se l'utente non l'ha chiesta, chiedi prima.
3. **L'utente risulta autenticato.** Verificalo guardando lo stato reale della
   pagina: il form di ricerca dell'area riservata deve essere presente e
   utilizzabile. Non lo presumere.

Se una precondizione manca, spiega quale e offri l'alternativa: la skill
italgiure-search per l'indice pubblico, o i link di ricerca manuale.

## Regole di condotta

- **Pochissime interrogazioni**: massimo 3-5 per sessione, ritmo umano, nessun
  parallelismo. Lo scopo e' non urtare l'anti-bot ne' le condizioni d'uso del
  servizio.
- **Nessuno scaricamento massivo**: nessuna estrazione di interi corpus, nessun
  loop su un elenco di cause.
- **Nessuna credenziale**: non chiedere mai username o password, non leggerle, non
  trasmetterle. Non usare `document.cookie`.
- **Non salvare nulla**: i risultati stanno nella conversazione.

## Procedura

### Passo 1 — Verifica le precondizioni

1. Verifica che ci sia un connettore browser.
2. Chiedi l'autorizzazione esplicita, se non c'e'.
3. Apri l'area riservata e verifica che il form di ricerca sia presente.

Al primo uso la mappatura dei campi della nuova interfaccia non e' nota: esegui
la procedura di discovery descritta in `references/discovery.md` e annota il
risultato.

### Passo 2 — Ricerca

Compila i campi della maschera di ricerca e invia. La ricerca **per parole**
funziona; quella **per estremi** non e' confermata: se fallisce, non insistere e
passa al fallback.

### Passo 3 — Estrai

Per ogni risultato estrai: estremi (sezione, numero, anno), tipo di provvedimento,
data della decisione, numero della massima, Rv., e il link al testo integrale.

### Passo 4 — Presenta

Restituisci la stessa forma di `cassazione_search_massime`, con la provenienza
`Fonte: ItalGiure (area riservata)`. Aggiungi, quando disponibili, il numero della
massima e gli Rv., che l'indice pubblico non fornisce.

## Se la ricerca fallisce

- **La maschera non risponde o la pagina non si apre**: l'utente non e'
  autenticato, oppure il connettore non funziona. Riportalo e offri la skill
  italgiure-search.
- **Il captcha o un blocco anti-bot compare**: fermati immediatamente. Non
  ripetere le richieste e non tentare di aggirare il blocco. Riporta il fatto
  all'utente e passa all'indice pubblico.
- **La ricerca per estremi non funziona**: prova la ricerca per parole, che e'
  confermata, e riporta il limite.

## Disclaimer

> Questa modalita' opera sulla sessione del browser dell'utente. I dati
> consultati restano nella conversazione e non lasciano il computer. Le
> conclusioni legali richiedono revisione di un avvocato.
```

- [ ] **Step 2: scrivi la procedura di discovery**

Crea `bettercallclaude_italia/skills/italgiure-browser/references/discovery.md`:

```markdown
# Discovery dei campi dell'area riservata

La nuova interfaccia ItalGiure non e' stata documentata: non sappiamo come si
chiamano i campi della maschera di ricerca ne' come sono organizzati i
risultati. Questa procedura serve a stabilirlo **una volta**, con l'utente
presente, e a fissare il risultato in questo file.

## Quando eseguila

Al **primo uso** della skill, o quando la ricerca per estremi fallisce e il
mapping sembra cambiato.

## Procedura

1. Apri l'area riservata e arriva alla pagina del massimario civile.
2. Fai uno snapshot della pagina (`take_snapshot` del connettore browser, o
   equivalente).
3. Identifica e annota:
   - il campo di ricerca per parole (input di testo) e il suo nome;
   - il campo per la sezione, se presente;
   - il campo per il numero e per l'anno, se presenti;
   - il pulsante di invio;
   - la struttura di una riga di risultato: dove compaiono estremi, data,
     tipo di provvedimento, eventuale numero di massima.
4. **Conferma con l'utente**: mostragli la mappatura e chiedi se i campi
   identificati sono quelli giusti. Non proseguire con una mappatura indovinata.
5. Aggiorna la tabella qui sotto e committa.

## Mappatura corrente

Da compilare alla prima esecuzione.

| Elemento | Selettore / nome osservato | Note |
|---|---|---|
| Campo parole | _da compilare_ | |
| Campo sezione | _da compilare_ | |
| Campo numero | _da compilare_ | |
| Campo anno | _da compilare_ | |
| Pulsante invio | _da compilare_ | |
| Riga risultato | _da compilare_ | |

## Cosa e' gia' noto

- La ricerca **per parole** funziona.
- La ricerca **per estremi** non e' confermata: e' il motivo per cui esiste
  questa procedura.
- Le richieste dati dell'area riservata stanno su percorsi `/api`; i cookie di
  sessione sono HttpOnly e non si leggono dalla Console. La richiesta porta
  anche un header di autorizzazione di tipo Basic, che **non** va mai riprodotto
  dal plugin.
```

- [ ] **Step 3: verifica che le skill siano valide**

Run: `node scripts/validate-plugin.js`

Expected: verde.

Run: `node scripts/check-tool-names.js`

Expected: exit 0. I nomi di skill `italgiure-browser` e `italgiure-search` sono citati
fra backtick ma **non** sono seguiti da una parentesi tonda: la regex richiede
`nome(`, quindi non vengono segnalati. Non toccare i backtick. Se il validatore
segnala qualcosa, quel nome e' invocato come funzione e va corretto.

- [ ] **Step 4: committa**

```bash
git add bettercallclaude_italia/skills/italgiure-browser/
git commit -m "feat(italgiure-browser): area riservata ItalGiure in modalita' presidiata

Tre precondizioni esplicite: connettore browser presente, autorizzazione
esplicita dell'utente, login verificato sullo stato reale della pagina. Non
chiede credenziali e non le trasmette. La mappatura dei campi della nuova
interfaccia si stabilisce con una discovery assistita alla prima esecuzione.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 5: Riscrivi la documentazione del cookie

Oggi la guida descrive un'interfaccia che non esiste più (cerca `PHPSESSID` e i percorsi `/new/...`), e il server dice «esegui document.cookie» mentre la guida dice il contrario. La riscrittura allinea tutto sul canale reale: l'indice pubblico non chiede nulla, il cookie serve solo per l'area riservata e si usa dal browser.

**Files:**
- Modify: `bettercallclaude_italia/docs/cassazione-cookie.md` (intero)
- Modify: `bettercallclaude_italia/agents/researcher.md` (riga 74)
- Modify: `bettercallclaude_italia/skills/italian-legal-research/SKILL.md` (riga 71)
- Modify: `bettercallclaude_italia/.claude-plugin/plugin.json` (`userConfig.italgiure_cookie`)

**Interfaces:**
- Consumes: le skill `italgiure-search` e `italgiure-browser` (Task 3, Task 4).
- Produces: nessuna interfaccia di codice; solo testo.

- [ ] **Step 1: riscrivi `bettercallclaude_italia/docs/cassazione-cookie.md`**

Sostituisci l'intero file con:

```markdown
# Come accedere ai contenuti della Cassazione

Istruzioni per l'utente del plugin BetterCallClaude — accesso alla
giurisprudenza della Corte di Cassazione.

> **Aggiornato novembre 2026** — rifatto sul canale realmente funzionante.
> Le vecchie istruzioni basate su `document.cookie`, sul cookie `PHPSESSID` e sui
> percorsi `/new/...` descrivevano un'interfaccia che non esiste più e sono state
> sostituite.

---

## Il quadro in breve

| Cosa vuoi | Serve | Autenticazione |
|---|---|---|
| Precedenti per parole chiave, estremi, sezione, data | skill **italgiure-search** | **nessuna** |
| Massime complete, Rv., conformi e difformi | skill **italgiure-browser** | login gia' attivo nel tuo browser |
| Il server BetterCallClaude risponde | — | non risponde: vedi «Perché il server non funziona» |

La ricerca **non richiede autenticazione**. Non c'è alcun cookie da copiare per
fare una ricerca.

---

## 1. La ricerca per parole (quello che serve di solito)

Nessuna preparazione: chiedi al plugin «cerca i precedenti su [argomento]» e la
skill italgiure-search interroga l'indice pubblico SentenzeWeb **dal tuo
computer**, passando per l'area riservata è necessario solo per i contenuti che
l'indice pubblico non espone.

L'indice pubblico contiene il testo delle decisioni e i dati essenziali
(sezione, numero, data, tipo di provvedimento, link al PDF). **Non** contiene
le massime complete.

## 2. L'area riservata (massime complete, Rv., conformi e difformi)

L'area riservata si usa **dal browser che hai già aperto e autenticato**, con la
skill italgiure-browser. Non devi copiare cookie: le credenziali restano nel
browser, non escono dal tuo computer.

La modalità è **presidiata**: l'utente deve essere presente, le interrogazioni
sono poche (3-5 per sessione) e non si scarica nulla in blocco. È un limite
voluto: l'area riservata è un servizio a pagamento con condizioni d'uso e
protezione anti-bot, e un uso automatizzato indiscriminato non è accettabile.

### Come si fa il login

1. Apri il browser e vai su
   [https://www.italgiure.giustizia.it/new/archives](https://www.italgiure.giustizia.it/new/archives)
2. Autenticati con **SPID** oppure con **nome utente e password** (per esempio la
   convenzione Cassa Forense).
3. Verifica che la pagina del massimario civile sia raggiungibile: quello è il
   segnale che la sessione è attiva.

### Perché non automatizziamo il login

Lo SPID richiede la presenza dell'utente e quasi sempre un secondo fattore
(OTP o app), e le regole AGID vietano la delega automatizzata delle
credenziali. Il plugin non chiede e non riceve mai la tua password.

## 3. Perché il server BetterCallClaude non funziona

I server MCP di BetterCallClaude sono ospitati su un indirizzo IP di datacenter.
`www.italgiure.giustizia.it` **scarta a livello di rete** le richieste che
arrivano da quel tipo di indirizzo: la connessione va in timeout, con o senza
cookie.

Non è quindi un problema di cookie mancante, né di cookie scaduto, né di
autenticazione: è il punto di partenza della connessione. Per questo la ricerca
Cassazione è stata spostata sul computer dell'utente, dove l'IP è ammesso.

Coprire anche gli utenti fuori dall'Italia richiederebbe al server un'uscita in
Italia: non è una funzionalità del plugin.

## 4. Il cookie: a cosa serve, in sintesi

Il cookie di sessione serve **solo** all'area riservata, e si usa **dal browser**:

- i cookie di sessione dell'area riservata sono marcati **HttpOnly**: non si
  leggono dalla Console, `document.cookie` restituisce una stringa vuota;
- l'unico punto in cui si vedono è la scheda **Network** degli strumenti per
  sviluppatori, su una richiesta dati dell'area riservata;
- l'area riservata invia anche un header di autorizzazione di tipo **Basic**: è il
  meccanismo di autenticazione dell'area riservata, e il plugin non lo riproduce
  né deve riceverlo.

Il plugin **non** ti chiede di incollare cookie, e non li trasmette a server di
terzi.

---

## Domande frequenti

**«Devo configurare un cookie nelle impostazioni del plugin?»**
No, per la ricerca. La voce «Cookie sessione ItalGiure» nelle impostazioni è
riservata alle installazioni che interrogano l'area riservata via server, e non
è il canale consigliato: il server non è raggiungibile. La ricerca normale non
usa cookie.

**«Il cookie è sicuro da salvare?»**
Un cookie di sessione non contiene la password, solo un identificativo
temporaneo. Resta comunque sulla tua macchina. Non condividerlo pubblicamente.

**«Posso non fornire il cookie?»**
Sì. La ricerca per parole funziona senza autenticazione.

**«Perché su some host funziona e su altri no?»**
Gli host italiani del settore giustizia usano whitelist di indirizzi e
protezione anti-bot. Un IP di datacenter è tipicamente escluso; un IP residenziale
italiano no. Per questo la ricerca gira dal computer dell'utente.

## Riepilogo rapido

| Cosa | Come |
|---|---|
| Precedenti per parole | chiedi al plugin: usa la skill italgiure-search. Nessuna preparazione |
| Massime complete, Rv. | skill italgiure-browser, con login gia' fatto nel browser |
| Il server non risponde | e' il blocco per IP: usa il canale dal computer, non il server |
```

- [ ] **Step 2: correggi il prompt di `agents/researcher.md`**

In `bettercallclaude_italia/agents/researcher.md`, sostituisci la riga 74 (il blocco che inizia con `> "Per accedere alle massime complete della Cassazione...`) con:

```markdown
> "Per le massime complete della Cassazione serve l'area riservata ItalGiure, e si usa dal browser che l'utente ha gia' aperto e autenticato (skill italgiure-browser): accedi a https://www.italgiure.giustizia.it/new/archives con SPID o credenziali (es. convenzione Cassa Forense) e verifica che il massimario civile sia raggiungibile. Non serve copiare alcun cookie: i cookie di sessione sono HttpOnly e la richiesta dati porta anche un header di autorizzazione Basic, che il plugin non riproduce. Per la ricerca dei precedenti per parole non serve autenticazione: usa la skill italgiure-search, che interroga l'indice pubblico direttamente dal computer dell'utente (il server non puo' raggiungere italgiure.giustizia.it dal proprio IP di datacenter)."
```

- [ ] **Step 3: correggi il prompt di `skills/italian-legal-research/SKILL.md`**

In `bettercallclaude_italia/skills/italian-legal-research/SKILL.md`, sostituisci la riga 71 con lo stesso testo del Passo 2.

- [ ] **Step 4: correggi la descrizione `italgiure_cookie` nel manifest**

In `bettercallclaude_italia/.claude-plugin/plugin.json`, sostituisci la descrizione della voce `italgiure_cookie` con:

```json
"description": "Non necessario per la ricerca: l'indice pubblico SentenzeWeb si interroga dal computer dell'utente senza autenticazione (skill italgiure-search). Voce riservata alle installazioni che interrogano l'area riservata via server; il server non e' normalmente raggiungibile perche' italgiure.giustizia.it scarta a livello di rete le richieste dagli IP di datacenter. Se la usi: prendi l'intestazione Cookie completa da una richiesta dati dell'area riservata (DevTools, scheda Network) -- i cookie sono HttpOnly, la Console restituisce una stringa vuota."
```

- [ ] **Step 5: verifica che non restino riferimenti obsoleti**

Run:
```bash
grep -rn "PHPSESSID\|/new/\|sentenzeweb.italgiure" bettercallclaude_italia/ README.md
```

Expected: nessun risultato **tranne** gli URL di navigazione legittimi
`https://www.italgiure.giustizia.it/new/archives` (l'indirizzo della pagina di
login dell'area riservata, che esiste ancora). Se compare `sentenzeweb.italgiure`
(il link morto nella tabella Reduced Mode di `skills/italian-legal-research/SKILL.md`),
sostituiscilo con `https://www.italgiure.giustizia.it/sncass/`.

- [ ] **Step 6: verifica la validita' del plugin**

Run: `node scripts/validate-plugin.js` e `node scripts/check-tool-names.js`

Expected: entrambi verdi, exit 0.

- [ ] **Step 7: committa**

```bash
git add bettercallclaude_italia/docs/cassazione-cookie.md \
  bettercallclaude_italia/agents/researcher.md \
  bettercallclaude_italia/skills/italian-legal-research/SKILL.md \
  bettercallclaude_italia/.claude-plugin/plugin.json
git commit -m "docs(cassazione): riscrive la guida sul canale realmente funzionante

La guida chiedeva PHPSESSID e i percorsi /new/..., che non esistono piu', e il
server suggeriva di eseguire document.cookie su cookie HttpOnly. La ricerca non
richiede autenticazione e gira dal computer dell'utente; il cookie serve solo
all'area riservata, via browser.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 6: Instradamento Normattiva nella skill di ricerca

La ricerca semplice ordina per recenza e restituisce atti estranei. La ricerca avanzata ha gia' i filtri giusti: la skill deve usarli, e deve smettere di promettere il testo degli articoli che nessun tool restituisce.

**Files:**
- Modify: `bettercallclaude_italia/skills/italian-legal-research/SKILL.md` (sezione «MCP `normattiva`», righe ~76-78)

**Interfaces:**
- Consumes: nessuno.
- Produces: nessuna interfaccia di codice.

- [ ] **Step 1: riscrivi la sezione Normattiva**

In `bettercallclaude_italia/skills/italian-legal-research/SKILL.md`, sostituisci il blocco

```
**MCP `normattiva`** (legislazione nazionale aggiornata):
- `normattiva_search(query)` — ricerca leggi nazionali
- `normattiva_get_atto(codiceRedazionale, dataGU)` — recupera i metadati dell'atto (non il testo degli articoli: vedi A5 della spec)
```

con

```
**MCP `normattiva`** (legislazione nazionale aggiornata):

Scegli lo strumento in base a cosa sta cercando l'utente:

- **atto nominato** («codice della crisi d'impresa», «legge 219/2017», «decreto
  legislativo 208/2012»): usa `normattiva_search_advanced` con `denominazioneAtto`
  oppure `titoloRicerca`, e `vigenza` per la versione in vigore. La ricerca
  semplice ordina per recenza e su un nome di codice restituisce atti estranei:
  per questo gli atti si cercano con i filtri, non con le parole chiave.
- **parole chiave generiche** («norme sulla responsabilita' medica»): usa
  `normattiva_search` con `query`.
- **dettaglio di un atto** (gia' identificato da una ricerca): usa
  `normattiva_get_atto(codiceRedazionale, dataGU)`, dove `codiceRedazionale` e
  `dataGU` arrivano dal risultato della ricerca.

Attenzione: `normattiva_get_atto` restituisce i **metadati** dell'atto e il link
ELI, **non il testo degli articoli**. Per il testo di un articolo usa il link ELI
(`urlNormattiva`) o WebFetch sulla pagina, se l'utente lo desidera. Non promettere
il testo dell'articolo se non lo hai letto.
```

- [ ] **Step 2: aggiungi alla checklist di qualita'**

Nella sezione «Checklist di Qualità» della stessa skill, sostituisci la riga

```
- [ ] Statuti applicabili citati con corretti riferimenti agli articoli
```

con

```
- [ ] Statuti applicabili citati con corretti riferimenti agli articoli, e il testo dell'articolo letuto (link ELI) quando e' stato affermato
```

- [ ] **Step 3: verifica**

Run: `node scripts/check-tool-names.js` e `node scripts/validate-plugin.js`

Expected: entrambi verdi. La skill ora cita `normattiva_search_advanced`, `normattiva_search` e `normattiva_get_atto`: tutti e tre esistono nel catalogo.

- [ ] **Step 4: committa**

```bash
git add bettercallclaude_italia/skills/italian-legal-research/SKILL.md
git commit -m "fix(skills): instrada la ricerca normativa sui filtri giusti

La ricerca semplice ordina per recenza e su un nome di codice restituisce
atti estranei. La skill ora usa normattiva_search_advanced con
denominazioneAtto/titoloRicerca e vigenza per gli atti nominati, e smette di
promettere il testo degli articoli: normattiva_get_atto restituisce solo
metadati e link ELI.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 7: Fonti esterne dell'utente

Oggi 24 comandi vietano esplicitamente le banche dati in abbonamento dell'utente. La correzione e' una voce di configurazione piu' un'eccezione **nella stessa clausola** che contiene il divieto: se l'eccezione vivesse altrove, il modello potrebbe non leggerla, ed e' esattamente il problema segnalato.

**Files:**
- Modify: `bettercallclaude_italia/.claude-plugin/plugin.json` (nuova voce `userConfig.fonti_esterne`)
- Modify: 24 file in `bettercallclaude_italia/commands/`
- Modify: `bettercallclaude_italia/skills/italian-legal-research/SKILL.md`
- Modify: `bettercallclaude_italia/skills/italian-legal-strategy/SKILL.md`
- Modify: `bettercallclaude_italia/skills/citation-content-verify/SKILL.md`

**Interfaces:**
- Consumes: nessuno.
- Produces: `userConfig.fonti_esterne` — stringa con nomi di banche dati separati da virgola (es. `buddalaw, simpliciter`). Stringa vuota = disattivata.

- [ ] **Step 1: aggiungi la voce di configurazione**

In `bettercallclaude_italia/.claude-plugin/plugin.json`, aggiungi nella sezione `userConfig`, dopo la voce `italgiure_session_key`:

```json
    "fonti_esterne": {
      "type": "string",
      "title": "Fonti esterne (opzionale)",
      "description": "Banche dati giuridiche abbonate da interrogare in parallelo ai server MCP di BetterCallClaude, separate da virgola (es. buddalaw, simpliciter). Se il connettore corrispondente e' presente in sessione viene interrogato e ogni pronuncia viene etichettata con la banca dati di provenienza. Se il connettore manca la ricerca prosegue senza errori e la fonte non viene dichiarata come consultata.",
      "default": "",
      "sensitive": false
    }
```

- [ ] **Step 2: scrivi lo script di applicazione dell'eccezione**

L'eccezione va aggiunta a **24** file con **tre varianti** di formulazione. fallo con uno script, non a mano: 24 sostituzioni manuali sono 24 occasioni di dimenticarne una.

Crea `/tmp/apply-fonti-esterne.js` (fuori dal repo: e' uno strumento di questa task, non un artefatto del plugin) con questo contenuto:

```javascript
'use strict';
const fs = require('fs');
const path = require('path');

const COMMANDS = '/Users/federicocesconi/Dev/bettercallclaude_italia/bettercallclaude_italia/commands';

const EXCEPTION =
  " **Eccezione — fonti esterne**: se `userConfig.fonti_esterne` e' valorizzato, " +
  "le banche dati ivi elencate vanno interrogate **in parallelo** ai server MCP di " +
  "BetterCallClaude, e ogni pronuncia va etichettata con la banca dati di provenienza; " +
  "se il connettore corrispondente non e' presente in sessione, si prosegue senza errori " +
  "e **senza dichiarare quella fonte come consultata**.";

// I pattern usano \s+ fra le parole: le clausole sono spezzate su piu' righe
// diverse nei vari file, e uno spazio letterale non abbinerebbe.
const PATTERNS = [
  // Variante 1: clausola «Ambito plugin» (18 file)
  /Non\s+delegare\s+a\s+skill\s+o\s+agenti\s+esterni\s+al\s+plugin\./g,
  // Variante 2: clausola in coda al file (5 file)
  /Non\s+delegare\s+lavoro\s+legale\s+a\s+skill,\s+agenti\s+o\s+strumenti\s+generici\s+o\s+esterni\s+al\s+plugin\./g,
  // Variante 3: cronologia-legale (1 file) — la frase e' diversa e ha un punto
  // dopo «Italia», cosa che la distingue dalle altre due varianti.
  /Usa\s+esclusivamente\s+agenti,\s+skill\s+e\s+server\s+MCP\s+di\s+BetterCallClaude\s+Italia\./g,
];

let changed = 0;
let skipped = [];

for (const file of fs.readdirSync(COMMANDS)) {
  if (!file.endsWith('.md')) continue;
  const p = path.join(COMMANDS, file);
  let content = fs.readFileSync(p, 'utf8');
  if (content.includes('Eccezione — fonti esterne')) {
    skipped.push(file + ' (gia\' presente)');
    continue;
  }
  const before = content;
  for (const re of PATTERNS) {
    content = content.replace(re, (m) => m + EXCEPTION);
  }
  if (content !== before) {
    fs.writeFileSync(p, content, 'utf8');
    changed++;
  } else {
    skipped.push(file + ' (nessun pattern abbinato)');
  }
}

console.log('file modificati: ' + changed);
if (skipped.length) {
  console.log('non modificati:');
  for (const s of skipped) console.log('  ' + s);
}
```

- [ ] **Step 3: verifica i pattern prima di applicare**

Run: `node /tmp/apply-fonti-esterne.js`

Expected: `file modificati: 24`, e nella lista dei non modificati i 6 file che non
contengono alcuna clausola di perimetro (`aiuto.md`, `configurazione.md`,
`crea-flusso.md`, `doctor.md`, `privacy.md`, `versione.md`): non vanno toccati.

La distribuzione reale delle varianti (verificata sul corpus) e': 18 file con
«Non delegare a skill o agenti esterni al plugin.», 5 con «Non delegare lavoro
legale a skill, agenti o strumenti generici o esterni al plugin.» (`legale.md`,
`legale-5step.md`, `start.md`, `percorso-legale.md`, `mappa-legale.md`) e 1 con
la variante di `cronologia-legale.md`. Le tre varianti sono spezzate su righe
diverse: per questo i pattern usano `\s+` al posto degli spazi.

Se un file non viene modificato, la lista dei non modificati dice il perche':
aggiungi il pattern mancante allo script e riesegui. Lo script e' idempotente,
salta i file gia' modificati.

- [ ] **Step 4: verifica la clausola risultante in un file per variante**

Run:
```bash
cd /Users/federicocesconi/Dev/bettercallclaude_italia
grep -n "Eccezione" -B2 bettercallclaude_italia/commands/cronologia-legale.md bettercallclaude_italia/commands/legale.md bettercallclaude_italia/commands/ricerca.md
```

Expected: in ciascuno dei tre file, la riga dell'eccezione segue **immediatamente**
la frase della clausola che contiene il divieto, nella stessa frase. Se
l'eccezione e' finita in un punto scollegato dal divieto, il modello potrebbe
non collegarle: in quel caso correggi a mano spostandola.

- [ ] **Step 5: verifica la copertura**

Run:
```bash
cd /Users/federicocesconi/Dev/bettercallclaude_italia
echo "file con clausola di perimetro: $(grep -rl 'esclusivamente' bettercallclaude_italia/commands/ | wc -l)"
echo "file con eccezione fonti esterne: $(grep -rl 'Eccezione . fonti esterne' bettercallclaude_italia/commands/ | wc -l)"
```

Expected: entrambi `24`.

Il conteggio della prima riga include `cronologia-legale.md` che contiene due
occorrenze di «esclusivamente» (una nella clausola, una nella nota sui termini
dell'ordinamento): conta i **file**, non le occorrenze.

- [ ] **Step 6: istruisci le skill a usare le fonti esterne**

In `bettercallclaude_italia/skills/italian-legal-research/SKILL.md`, aggiungi
subito dopo la sezione «### Passo 2: Esecuzione Ricerca» questa sottosezione:

```markdown
**Fonti esterne dell'utente (opzionali)**

Se `userConfig.fonti_esterne` e' valorizzato, contiene i nomi delle banche dati
giuridiche in abbonamento dell'utente (es. `buddalaw, simpliciter`). Per ogni
nome:

1. verifica se il connettore corrispondente e' presente in sessione;
2. se e' presente, interrogalo **in parallelo** ai server MCP, con gli stessi
   termini di ricerca;
3. se non e' presente, proseguire senza errori e **senza dichiarare quella fonte
   come consultata**: una fonte assente non e' una fonte consultata.

Ogni pronuncia va etichettata con la banca dati di provenienza
(`Fonte: BuddaLaw`, `Fonte: ItalGiure (SentenzeWeb pubblico)`, …), e in coda al
documento va elencato l'elenco delle fonti effettivamente consultate, distinguerendo
quelle disponibili da quelle non disponibili in sessione.

Attenzione: le query inviate a fonti esterne **escono dal computer dell'utente** e
passano dal controllo privacy come qualunque altra chiamata di rete. Non
includere mai nel testo della query il contenuto della bozza o dati del
fascicolo: solo i termini di ricerca.
```

Ripeti la stessa sottosezione, con lo stesso testo, in
`bettercallclaude_italia/skills/italian-legal-strategy/SKILL.md` e in
`bettercallclaude_italia/skills/citation-content-verify/SKILL.md`, ciascuno nella
posizione in cui descrive l'esecuzione della ricerca.

- [ ] **Step 7: verifica**

Run: `node scripts/validate-plugin.js` e `node scripts/check-tool-names.js`

Expected: entrambi verdi.

Run:
```bash
grep -rn 'fonti_esterne' bettercallclaude_italia/ | wc -l
```

Expected: almeno 27 (1 manifest + 24 comandi + 3 skill, ma i 3 comandi con
formulazione diversa possono dare un conteggio leggermente diverso: il requisito
e' che i 24 comandi e le 3 skill siano coperti, non il totale).

- [ ] **Step 8: committa**

```bash
rm -f /tmp/apply-fonti-esterne.js
git add bettercallclaude_italia/.claude-plugin/plugin.json bettercallclaude_italia/commands/ \
  bettercallclaude_italia/skills/italian-legal-research/SKILL.md \
  bettercallclaude_italia/skills/italian-legal-strategy/SKILL.md \
  bettercallclaude_italia/skills/citation-content-verify/SKILL.md
git commit -m "feat(fonti): consente le banche dati esterne dichiarate dall'utente

24 comandi vietavano esplicitamente le fonti abbonate. Ora l'utente le
dichiara in userConfig.fonti_esterne e l'eccezione sta nella stessa clausola
che contiene il divieto, cosi' il modello la legge dove legge il divieto.
Le skill interrogano i connettori presenti in parallelo ai server MCP e
etichettano la provenienza; una fonte assente non viene dichiarata consultata.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

---

### Task 8: Rilascio 2.5.0

**Files:**
- Modify: `bettercallclaude_italia/.claude-plugin/plugin.json`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `package.json`
- Modify: `README.md` (riga 1)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: tutto il Track A.
- Produces: pacchetto `dist/bettercallclaude_italia-v2.5.0.zip`.

- [ ] **Step 1: scrivi la voce di CHANGELOG**

In `CHANGELOG.md`, inserisci subito dopo la riga `---` che segue l'intestazione:

```markdown
## [2.5.0] - 2026-11-08

### Fixed
- **La ricerca di legittimità riparte**: il server MCP non raggiunge `italgiure.giustizia.it` dal proprio IP di datacenter (la connessione viene scartata a livello TCP, con o senza cookie). La ricerca Cassazione ora gira dal computer dell'utente, con la nuova skill **italgiure-search**, che interroga l'indice pubblico SentenzeWeb con `curl` e restituisce la stessa forma di `cassazione_search_massime`. La rete passa da `curl` perche' l'hook privacy intercetta `curl` ma non un `node script.js` con HTTP: il perimetro di controllo del segreto professionale non si allarga.
- **Tool inesistenti citati nelle skill**: 7 riferimenti (`get_article`, `get_decision`, `format_citation`, `parse_citation`, `find_leading_cases`) sono stati corretti con i nomi reali. `scripts/check-tool-names.js` ora valida anche i nomi di tool citati **nella prosa** delle skill, non solo nel frontmatter `tools:`: era cieco proprio dove si erano infiltrati.
- **Istruzioni del cookie contraddittorie**: il server suggeriva di eseguire `document.cookie` su cookie HttpOnly, mentre la documentazione diceva il contrario. La guida e' stata riscritta sul canale reale: la ricerca non richiede autenticazione, il cookie serve solo all'area riservata e si usa dal browser.
- **`normattiva_search` impreciso**: su un nome di codice restituiva gli ultimi decreti in Gazzetta. La skill ora usa `normattiva_search_advanced` con `denominazioneAtto`/`titoloRicerca` e `vigenza` per gli atti nominati, e dichiara che `normattiva_get_atto` restituisce metadati e link ELI, non il testo degli articoli.
- **Link morto nella tabella Reduced Mode**: `sentenzeweb.italgiure.giustizia.it` non risolve; l'host valido e' `www.italgiure.giustizia.it/sncass/`.

### Added
- **Skill `italgiure-search`**: ricerca dei precedenti della Cassazione dall'indice pubblico SentenzeWeb, eseguita dal computer dell'utente. Include `scripts/italgiure-query.js`, puro e testato, che costruisce la query Solr e mappa la risposta nella forma standard del plugin.
- **Skill `italgiure-browser`**: accesso all'area riservata ItalGiure dalla sessione gia' autenticata del browser, in modalita' presidiata (connettore presente, autorizzazione esplicita, login verificato; massimo 3-5 interrogazioni per sessione). Non chiede credenziali e non le trasmette.
- **`userConfig.fonti_esterne`**: l'utente puo' dichiarare le banche dati giuridiche in abbonamento (es. `buddalaw, simpliciter`). Le skill le interrogano in parallelo ai server MCP e etichettano la provenienza di ogni pronuncia; una fonte non disponibile in sessione non viene dichiarata consultata. L'eccezione e' stata aggiunta inline alla clausola di perimetro dei 24 comandi che la contengono.

```

- [ ] **Step 2: allinea la versione nei quattro file**

Esegui, dalla root del repository:

```bash
cd /Users/federicocesconi/Dev/bettercallclaude_italia
sed -i '' 's/"version": "2\.4\.11"/"version": "2.5.0"/' bettercallclaude_italia/.claude-plugin/plugin.json
sed -i '' 's/"version": "2\.4\.11"/"version": "2.5.0"/' .claude-plugin/marketplace.json
sed -i '' 's/"version": "2\.4\.11"/"version": "2.5.0"/' package.json
sed -i '' 's/version-2\.4\.11-blue/version-2.5.0-blue/' README.md
```

- [ ] **Step 3: verifica la coerenza della versione**

Run: `node scripts/validate-plugin.js`

Expected: verde, e la riga che confronta le versioni deve riportare tutte e tre uguali a `2.5.0`.

Run:
```bash
grep -rn "2\.4\.11" package.json bettercallclaude_italia/.claude-plugin/plugin.json .claude-plugin/marketplace.json README.md
```

Expected: nessun risultato.

Nota: esiste anche `bettercallclaude_italia/package.json`, che riporta una versione
propria e non viene controllato da `scripts/validate-plugin.js` (che confronta il
`package.json` della root, il manifest del plugin e quello del marketplace).
**Non toccarlo**: non e' parte della release e cambiarlo aggiungerebbe rumore al
diff.

- [ ] **Step 4: esegui tutta la verifica**

```bash
cd /Users/federicocesconi/Dev/bettercallclaude_italia
node scripts/check-tool-names.js
node scripts/validate-plugin.js
npm test
node bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.test.js
node scripts/check-tool-names.test.js
```

Expected: tutti verdi, exit 0.

- [ ] **Step 5: pacchetta**

Run: `npm run package`

Expected: `✅ Package created: .../dist/bettercallclaude_italia-v2.5.0.zip` e `Ready for Cowork Desktop marketplace upload.`

Verifica che lo zip contenga le nuove skill:

```bash
unzip -l dist/bettercallclaude_italia-v2.5.0.zip | grep -E "italgiure-(search|browser)"
```

Expected: le voci `skills/italgiure-search/SKILL.md`, `skills/italgiure-search/scripts/italgiure-query.js` e `skills/italgiure-browser/SKILL.md`.

- [ ] **Step 6: committa**

```bash
git add bettercallclaude_italia/.claude-plugin/plugin.json .claude-plugin/marketplace.json \
  package.json README.md CHANGELOG.md
git commit -m "release: v2.5.0 -- ricerca di legittimita' sul canale client

La ricerca Cassazione passa dal computer dell'utente (il server non e'
raggiungibile dal proprio IP di datacenter). Aggiunte le skill italgiure-search
e italgiure-browser, la configurazione fonti_esterne, e la validazione dei
nomi di tool citati in prosa.

Co-authored-by: Kimi Code <noreply@kimi-code.dev>"
```

Il file `dist/bettercallclaude_italia-v2.5.0.zip` non va committato: controlla
`.gitignore`.

---

## Verifica end-to-end (Richiede IP ammesso)

Da eseguire sulla macchina dell'utente, in Italia. Non è automatizzabile da un
ambiente di sviluppo fuori dall'Italia: l'host scarta le connessioni.

1. **Ricerca per parole**: chiedi al plugin «cerca i precedenti sulla
   responsabilita' medica in diritto civile». Atteso: risultati con estremi,
   sezione, data e link al PDF, con provenienza `Fonte: ItalGiure (SentenzeWeb
   pubblico)`.
2. **Verifica di una sentenza**: chiedi di verificare «Cass. civ. sez. III ord.
   17006/2025». Atteso: esistenza confermata per gli estremi, con provenienza.
3. **Verifica di una norma**: chiedi di verificare «art. 1218 c.c.». Atteso:
   verificata dal server (`citation-verify-ita`), senza errori.
4. **Fonti esterne**: con `fonti_esterne` valorizzato e un connettore presente in
   sessione, atteso: risultati anche da quella fonte, etichettati, e la fonte
   assente dichiarata «non disponibile in sessione».
5. **Area riservata**: con il browser autenticato, atteso: massima e Rv. presenti
   nella provenienza «area riservata».

## Note per l'implementatore

- Il percorso del file script e' relativo alla root del plugin. Nella skill, il
  comando `node scripts/italgiure-query.js` va eseguito **dentro** la directory
  della skill, o con il percorso completo. Verifica quale forma funziona nel
  tuo ambiente e usa quella.
- Se il modello non riesce a eseguire `curl` (permessi, sandbox), la skill
  deve dirlo esplicitamente e non fingere di aver cercato: un risultato
  inventato e' peggio di un errore dichiarato.
- Non modificare il server in questa piano. Il Track B e' un piano separato
  (`2026-11-08-ricerca-legale-server.md`).
