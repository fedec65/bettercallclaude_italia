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

// Directory temporanee create dai test: vengono rimosse alla fine della
// sessione di test, cosi' non si accumulano in /tmp.
const tempDirs = [];

function cleanupTempDirs() {
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
      // Pulizia best-effort: la directory temporanea non e' un problema del test.
    }
  }
}

/** Crea una directory temporanea con i file indicati e la restituisce. */
function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bcc-toolnames-'));
  tempDirs.push(dir);
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

/** Riga di fixture con frontmatter e corpo libero. */
function skill(body) {
  return [
    '---',
    'name: fixture-skill',
    'description: "Fixture di test per il validatore dei nomi di tool."',
    'tools:',
    '  - Read',
    '---',
    '',
    '# Fixture',
    '',
    body,
    '',
  ].join('\n');
}

const SKILL_WITH_BROKEN_TOOL = skill(
  'Usa `get_article(statute_number, article)` per recuperare il testo.'
);

const SKILL_WITH_VALID_TOOL = skill(
  'Usa `normattiva_search(query)` per cercare.'
);

const SKILL_WITH_GENERIC_CALL = skill(
  'La funzione `filter(items)` ordina i risultati.'
);

const SKILL_WITH_BROKEN_BARE_NAME = skill(
  'Usa il tool `compute_deadlines` per calcolare i termini processuali.'
);

const SKILL_WITH_COMMON_WORD_ID = skill(
  'Il campo `id` identificativo del ricorso.'
);

const SKILL_WITH_COMMON_WORD_SEARCH = skill(
  'Il parametro `search` filtra i risultati.'
);

const SKILL_WITH_BARE_TOOL_NAME = skill(
  'Il tool `normattiva_search` e\' quello per la ricerca normativa.'
);

const SKILL_WITH_USER_CONFIG_KEY = skill(
  'L\'utente configura `user_id` nelle impostazioni del plugin.'
);

const SKILL_WITH_QUALIFIED_MCP_NAME = skill(
  'Il tool `mcp__ollama__ollama_check_status(` verifica lo stato del modello.'
);

// Manifest di un plugin che non dichiara userConfig: le esclusioni devono
// comunque arrivare dal manifest canonico del repo.
const MANIFEST_WITHOUT_USER_CONFIG = JSON.stringify({ name: 'fixture-plugin' });

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

t('la riga di errore della prosa rispetta il contratto', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_WITH_BROKEN_TOOL });
  const r = run(dir);
  const expected =
    'ERRORE PROSA: skills/fixture-skill/SKILL.md — "get_article" non esiste nel catalogo SERVER_TOOLS';
  assert.ok(
    r.output.includes(expected),
    'l\'output deve contenere la riga di contratto:\n' + expected + '\ngot:\n' + r.output
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

console.log('check-tool-names: prosa, nomi nudi');

t('rifiuta un nome nudo che e\' la coda di un tool del catalogo', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_WITH_BROKEN_BARE_NAME });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il validatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('compute_deadlines'),
    'l\'output deve nominare il nome rotto, got:\n' + r.output
  );
  assert.ok(
    r.output.includes('legal-persona-ita_compute_deadlines'),
    'l\'output deve suggerire il nome completo del tool, got:\n' + r.output
  );
});

t('accetta un nome nudo che e\' gia\' un tool del catalogo', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_WITH_BARE_TOOL_NAME });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'il validatore deve accettare, output:\n' + r.output);
});

t('non segnala un nome nudo di una sola parola, anche se e\' una coda di tool', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_WITH_COMMON_WORD_ID });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'una coda di una sola parola non e\' un tool troncato, output:\n' + r.output);
});

t('non segnala un nome nudo di una sola parola che e\' coda di piu\' tool', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_WITH_COMMON_WORD_SEARCH });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'una coda di una sola parola non e\' un tool troncato, output:\n' + r.output);
});

t('non segnala una chiave di userConfig che coincide con la coda di un tool', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_WITH_USER_CONFIG_KEY });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'le chiavi di userConfig non sono tool, output:\n' + r.output);
});

t('le chiavi di userConfig arrivano da tutti i manifest, non solo dal primo', () => {
  const dir = fixture({
    'skills/fixture-skill/SKILL.md': SKILL_WITH_USER_CONFIG_KEY,
    '.claude-plugin/plugin.json': MANIFEST_WITHOUT_USER_CONFIG,
  });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'le chiavi di userConfig non sono tool, output:\n' + r.output);
});

t('non segnala un nome gia\' qualificato con il prefisso MCP', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_WITH_QUALIFIED_MCP_NAME });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'i nomi mcp__ sono gia\' qualificati, output:\n' + r.output);
});

console.log('check-tool-names: argomenti');

t('rifiuta una directory inesistente', () => {
  const r = run(path.join(os.tmpdir(), 'bcc-toolnames-does-not-exist-' + Date.now()));
  assert.strictEqual(r.code, 1, 'il validatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('non esiste'),
    'l\'output deve dire che la directory non esiste, got:\n' + r.output
  );
});

console.log('check-tool-names: corpus reale');

t('il corpus reale del plugin non ha riferimenti rotti in prosa', () => {
  const r = run(path.join(ROOT, 'bettercallclaude_italia'));
  assert.strictEqual(r.code, 0, 'output:\n' + r.output);
});

cleanupTempDirs();

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
