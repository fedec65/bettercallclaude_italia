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

// File che il verificatore sorveglia: ciascuno di essi descrive il fallback
// del server e deve quindi dichiarare `cookieValido`. La fixture li contiene
// tutti, già validi: il file sotto prova ne sovrascrive uno.
const WATCHED_FILES = [
  'CONNECTORS.md',
  'README.md',
  'agents/researcher.md',
  'docs/cassazione-cookie.md',
  'skills/italgiure-browser/SKILL.md',
  'skills/italgiure-search/SKILL.md',
  'skills/italian-legal-research/SKILL.md',
  'skills/italian-legal-strategy/SKILL.md',
];

const WATCHED_CONTENT = [
  '# Fixture',
  '',
  'Il canale client dichiara il fallimento del server con `cookieValido`.',
  '',
].join('\n');

/**
 * Crea una directory temporanea con i file indicati e la restituisce.
 * I file sorvegliati sono presenti di default (validi), salvo `omit`.
 */
function fixture(files, options = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bcc-cassazione-narrative-'));
  tempDirs.push(dir);
  const content = { ...files };
  for (const rel of WATCHED_FILES) {
    if (!(rel in content)) content[rel] = WATCHED_CONTENT;
  }
  for (const rel of Object.keys(content)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content[rel], 'utf8');
  }
  for (const rel of options.omit || []) {
    fs.rmSync(path.join(dir, rel), { force: true });
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

/**
 * Riga di fixture con frontmatter e corpo libero.
 * La descrizione non nomina la fonte Cassazione: è il corpo a dire di chei
 * canale si parla, e i testi generici devono restare accettati.
 */
function skill(body) {
  return [
    '---',
    'name: fixture-skill',
    'description: "Fixture di test per il verificatore della narrativa."',
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

// Le formule obsolete, ciascuna nel contesto della ricerca Cassazione.
const SKILL_OBSOLETE_TIMEOUT = skill(
  'La ricerca Cassazione con una chiamata lato server va in timeout o restituisce zero risultati.'
);

const SKILL_OBSOLETE_RESTITUITO = skill(
  'La ricerca Cassazione con il server MCP ha restituito zero risultati o un timeout.'
);

const SKILL_OBSOLETE_RESTITUIREBBE = skill(
  'La ricerca Cassazione lato server non funziona: restituirebbe zero risultati senza motivo.'
);

const SKILL_OBSOLETE_NON_RESTITUISCE = skill(
  'Il tool `cassazione_search_massime` lato server non restituisce risultati.'
);

const SKILL_OBSOLETE_CONNESSIONE = skill(
  'La ricerca Cassazione da quel tipo di indirizzo: la connessione va in timeout, con o senza cookie.'
);

const SKILL_OBSOLETE_NON_RAGGIUNGIBILE = skill(
  'La ricerca Cassazione: il canale server non è raggiungibile, la ricerca parte dal computer dell\'utente.'
);

const SKILL_OBSOLETE_NON_NORMALMENTE_RAGGIUNGIBILE = skill(
  'La ricerca Cassazione: il canale server non è normalmente raggiungibile e il tool non restituisce nulla di utile.'
);

const SKILL_OBSOLETE_NON_FUNZIONA = skill(
  'La ricerca Cassazione: lato server non funziona perché l\'IP di datacenter è scartato da italgiure.giustizia.it.'
);

// Il marker del canale spezzato a capo: il markdown avvolge le frasi e il
// controllo deve vederlo lo stesso.
const SKILL_OBSOLETE_WRAPPED = skill(
  'La ricerca Cassazione con il canale\n  server non risponde;'
);

const SKILL_NARRATIVA_NUOVA = skill(
  'Il tool `cassazione_search_massime` lato server lo dichiara: la chiamata va a buon fine, ' +
  'ma `autenticazione.cookieValido` vale `false` e `autenticazione.messaggio` spiega perché. ' +
  'Passa allora alla skill `italgiure-search` dal computer dell\'utente.'
);

const SKILL_SEMANTICA_CLIENT = skill(
  '| `totale: 0` | la ricerca è andata a buon fine, non ci sono risultati | nessun errore: ' +
  'riporta che non ci sono precedenti per quei termini |'
);

const SKILL_CLIENT_RISULTATO_VUOTO = skill(
  'Se la ricerca lato client restituisce zero risultati, i termini sono troppo generici: ' +
  'restringi la ricerca per estremi.'
);

const SKILL_CLIENT_TIMEOUT_CURL = skill(
  'Se la `curl` va in timeout, l\'IP corrente non è ammesso da ItalGiure: offri la modalità browser.'
);

const SKILL_CLIENT_CONNESSIONE = skill(
  'Se la connessione va in timeout, prova un altro termine.'
);

// La prosa generica su un altro server MCP: non parla del canale Cassazione
// e non deve essere segnalata.
const SKILL_GENERIC_MCP = skill(
  'Se il server MCP non funziona, la skill degrada in Reduced Mode.'
);

const SKILL_GENERIC_MCP_ALTRO_SERVER = skill(
  'Se il server MCP `normattiva` non risponde, usa il fallback.'
);

const AGENT_RESEARCHER_SENZA_DICHIARAZIONE = [
  '---',
  'name: italian-legal-researcher',
  'description: "Fixture di test per il verificatore della narrativa."',
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
  'description: "Fixture di test per il verificatore della narrativa."',
  'tools:',
  '  - Read',
  '---',
  '',
  'Il canale server ospitato non può interrogare la fonte e lo dichiara con `autenticazione.cookieValido: false`.',
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

t('rifiuta la formula «il canale server non è raggiungibile»', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_OBSOLETE_NON_RAGGIUNGIBILE });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('non è raggiungibile'),
    'l\'output deve nominare la formula obsoleta, got:\n' + r.output
  );
});

t('rifiuta la formula «il canale server non è normalmente raggiungibile»', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_OBSOLETE_NON_NORMALMENTE_RAGGIUNGIBILE });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('non è raggiungibile'),
    'l\'output deve nominare la formula obsoleta, got:\n' + r.output
  );
});

t('rifiuta la formula «lato server non funziona»', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_OBSOLETE_NON_FUNZIONA });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('non funziona'),
    'l\'output deve nominare la formula obsoleta, got:\n' + r.output
  );
});

t('rifiuta la formula anche se il marker è spezzato a capo', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_OBSOLETE_WRAPPED });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('non risponde'),
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

t('ogni riga colpevole è segnalata una volta sola', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_OBSOLETE_TIMEOUT });
  const r = run(dir);
  const lines = r.output.split('\n').filter((l) => l.startsWith('ERRORE NARRATIVA:'));
  assert.strictEqual(lines.length, 1, 'la riga deve essere segnalata una volta sola, got:\n' + r.output);
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

t('accetta una frase sul canale client che parla di risultato vuoto', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_CLIENT_RISULTATO_VUOTO });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'il canale client può restituire zero risultati, output:\n' + r.output);
});

t('accetta il timeout della `curl` del canale client', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_CLIENT_TIMEOUT_CURL });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'il timeout della curl è la semantica del canale client, output:\n' + r.output);
});

t('accetta il timeout della connessione sul canale client', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_CLIENT_CONNESSIONE });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'il timeout della connessione è la semantica del canale client, output:\n' + r.output);
});

console.log('check-cassazione-narrative: prosa generica di altri server');

t('non segnala la prosa generica su un server MCP', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_GENERIC_MCP });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'la prosa di un altro server MCP non è la narrativa Cassazione, output:\n' + r.output);
});

t('non segnala la prosa generica che nomina un altro server', () => {
  const dir = fixture({ 'skills/fixture-skill/SKILL.md': SKILL_GENERIC_MCP_ALTRO_SERVER });
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'la prosa di un altro server MCP non è la narrativa Cassazione, output:\n' + r.output);
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

t('rifiuta un file sorvegliato che non esiste più', () => {
  const dir = fixture({}, { omit: ['agents/researcher.md'] });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il verificatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('agents/researcher.md') && r.output.includes('manca'),
    'l\'output deve dire che il file sorvegliato manca, got:\n' + r.output
  );
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
