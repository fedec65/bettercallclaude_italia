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
