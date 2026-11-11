#!/usr/bin/env node
/**
 * Test del verificatore della narrativa Cassazione (scripts/check-cassazione-narrative.js).
 * Girano con `node scripts/check-cassazione-narrative.test.js` -- nessun framework.
 *
 * Il verificatore accetta un argomento posizionale facoltativo: la directory
 * del plugin da verificare. I test ci passano directory temporanee con
 * fixture, così possono esercitare i casi di errore senza sporcare il repo.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(ROOT, 'scripts', 'check-cassazione-narrative.js');

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
// sessione di test, così non si accumulano in /tmp.
const tempDirs = [];

function cleanupTempDirs() {
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
      // Pulizia best-effort: la directory temporanea non è un problema del test.
    }
  }
}

/** Crea una directory temporanea con i file indicati e la restituisce. */
function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bcc-cassazione-narrative-'));
  tempDirs.push(dir);
  for (const rel of Object.keys(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, files[rel], 'utf8');
  }
  return dir;
}

/** Esegue il verificatore su una directory e restituisce { code, output }. */
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
    'description: "Fixture di test per il verificatore della narrativa Cassazione."',
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

const SKILL_OBSOLETE_TIMEOUT = skill(
  'Se una chiamata lato server va in timeout o restituisce zero risultati, non è un problema di cookie.'
);

const SKILL_OBSOLETE_RESTITUITO = skill(
  'La ricerca con il server MCP ha restituito zero risultati o un timeout.'
);

const SKILL_OBSOLETE_RESTITUIREBBE = skill(
  'Lato server non funziona: restituirebbe zero risultati senza motivo.'
);

const SKILL_OBSOLETE_NON_RESTITUISCE = skill(
  'Il tool `cassazione_search_massime` lato server non restituisce risultati.'
);

const SKILL_OBSOLETE_CONNESSIONE = skill(
  'Da quel tipo di indirizzo la connessione va in timeout, con o senza cookie di sessione.'
);

const SKILL_NARRATIVA_NUOVA = skill(
  'Il tool `cassazione_search_massime` lato server lo dichiara: la chiamata va a buon fine, ' +
  'ma `autenticazione.cookieValido` vale `false` e `autenticazione.messaggio` spiega perché. ' +
  'Passa allora alla skill `italgiure-search` dal computer dell’utente.'
);

const SKILL_SEMANTICA_CLIENT = skill(
  '| `totale: 0` | la ricerca è andata a buon fine, non ci sono risultati | nessun errore: ' +
  'riporta che non ci sono precedenti per quei termini |'
);

const AGENT_RESEARCHER_SENZA_DICHIARAZIONE = [
  '---',
  'name: italian-legal-researcher',
  'description: "Fixture di test per il verificatore della narrativa Cassazione."',
  'tools:',
  '  - Read',
  '---',
  '',
  'Il canale server non è raggiungibile: usa la skill `italgiure-search`.',
  '',
].join('\n');

const AGENT_RESEARCHER_CON_DICHIARAZIONE = [
  '---',
  'name: italian-legal-researcher',
  'description: "Fixture di test per il verificatore della narrativa Cassazione."',
  'tools:',
  '  - Read',
  '---',
  '',
  'Il canale server non può interrogare la fonte e lo dichiara con `autenticazione.cookieValido: false`.',
  '',
].join('\n');

console.log('check-cassazione-narrative: formula obsoleta');

t('rifiuta la formula «va in timeout o restituisce zero risultati»', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_OBSOLETE_TIMEOUT });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('ERRORE NARRATIVA'),
    'l\'output deve contenere il contratto di errore, got:\n' + r.output
  );
  assert.ok(
    r.output.includes('restituisce zero risultati'),
    'l\'output deve nominare la formula obsoleta, got:\n' + r.output
  );
  assert.ok(
    r.output.includes('skills/fixture-skill/SKILL.md'),
    'l\'output deve nominare il file colpevole, got:\n' + r.output
  );
});

t('rifiuta la formula «ha restituito zero risultati o un timeout»', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_OBSOLETE_RESTITUITO });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('restituito zero risultati'),
    'l\'output deve nominare la formula obsoleta, got:\n' + r.output
  );
});

t('rifiuta la formula «restituirebbe zero risultati senza motivo»', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_OBSOLETE_RESTITUIREBBE });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('restituirebbe zero risultati'),
    'l\'output deve nominare la formula obsoleta, got:\n' + r.output
  );
});

t('rifiuta la formula «non restituisce risultati»', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_OBSOLETE_NON_RESTITUISCE });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('non restituisce risultati'),
    'l\'output deve nominare la formula obsoleta, got:\n' + r.output
  );
});

t('rifiuta la formula «la connessione va in timeout»', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_OBSOLETE_CONNESSIONE });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('la connessione va in timeout'),
    'l\'output deve nominare la formula obsoleta, got:\n' + r.output
  );
});

t('l\'errore indica il file e la riga', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_OBSOLETE_NON_RESTITUISCE });
  const r = run(dir);
  const expected = 'ERRORE NARRATIVA: skills/fixture-skill/SKILL.md:';
  assert.ok(
    r.output.includes(expected),
    'l\'output deve contenere la riga di contratto:\n' + expected + '\ngot:\n' + r.output
  );
});

t('accetta la narrativa nuova', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_NARRATIVA_NUOVA });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'il verificatore deve accettare, output:\n' + r.output);
});

t('non segnala «totale: 0» né «non ci sono risultati» del canale client', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_SEMANTICA_CLIENT });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'la semantica del canale client non è la formula obsoleta, output:\n' + r.output);
});

console.log('check-cassazione-narrative: dichiarazione del fallback');

t('pretende `cookieValido` nel file che descrive il fallback del server', () => {
  const dir = fixture({ 'agents/researcher.md': AGENT_RESEARCHER_SENZA_DICHIARAZIONE });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('ERRORE NARRATIVA: agents/researcher.md'),
    'l\'output deve nominare il file senza la dichiarazione, got:\n' + r.output
  );
  assert.ok(
    r.output.includes('cookieValido'),
    'l\'output deve dire quale dichiarazione manca, got:\n' + r.output
  );
});

t('accetta il file che descrive il fallback dichiarando `cookieValido`', () => {
  const dir = fixture({ 'agents/researcher.md': AGENT_RESEARCHER_CON_DICHIARAZIONE });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'il verificatore deve accettare, output:\n' + r.output);
});

console.log('check-cassazione-narrative: argomenti');

t('rifiuta una directory inesistente', () => {
  const r = run(path.join(os.tmpdir(), 'bcc-cassazione-does-not-exist-' + Date.now()));
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('non esiste'),
    'l\'output deve dire che la directory non esiste, got:\n' + r.output
  );
});

console.log('check-cassazione-narrative: corpus reale');

t('il corpus reale del plugin passa il verificatore', () => {
  const r = run(path.join(ROOT, 'bettercallclaude_italia'));
  assert.strictEqual(r.code, 0, 'output:\n' + r.output);
  assert.ok(
    !r.output.includes('ERRORE NARRATIVA'),
    'il corpus reale non deve avere errori di narrativa, got:\n' + r.output
  );
});

cleanupTempDirs();

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
