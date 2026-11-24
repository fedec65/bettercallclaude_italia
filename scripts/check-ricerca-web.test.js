#!/usr/bin/env node
/**
 * Test del validatore della ricerca web su portali protetti
 * (scripts/check-ricerca-web.js).
 *
 * Girano con `node scripts/check-ricerca-web.test.js` -- nessun framework.
 * Il validatore accetta un argomento posizionale facoltativo: la directory
 * del plugin da validare. I test ci passano directory temporanee con fixture.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const CHECKER = path.join(ROOT, 'scripts', 'check-ricerca-web.js');

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

const tempDirs = [];

function cleanupTempDirs() {
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
      // Pulizia best-effort.
    }
  }
}

function fixture(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bcc-ricercaweb-'));
  tempDirs.push(dir);
  for (const rel of Object.keys(files)) {
    const p = path.join(dir, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, files[rel], 'utf8');
  }
  return dir;
}

function run(dir) {
  try {
    const out = execFileSync('node', [CHECKER, dir], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    return { code: 0, output: out };
  } catch (e) {
    const output = String(e.stdout || '') + String(e.stderr || '');
    return { code: e.status === undefined ? 1 : e.status, output };
  }
}

function skill(extra = '') {
  return [
    '---',
    'name: legal-web-research',
    'description: "Ricerca in sola lettura su portali protetti con login umano."',
    'tools:',
    '  - Read',
    '  - Grep',
    '  - Glob',
    '  - Bash',
    '---',
    '',
    '# Ricerca web su portali protetti',
    '',
    '## Gate privacy',
    '',
    'Risolvi la modalita con `CLAUDE_PLUGIN_OPTION_PRIVACY_MODE`, `privacy_mode`',
    'e il file `.privacy-mode` (puo solo alzare la severita). Le modalita sono',
    '`strict`, `balanced` e `cloud`.',
    '',
    '## Playbook allow-list',
    '',
    'Leggi la sezione `## Siti consentiti per la ricerca web` dal playbook',
    '`bettercallclaude-italia.local.md`.',
    '',
    '## Login e condotta',
    '',
    'Non leggere i campi password, non digitare credenziali o codici 2FA, non',
    'bypassare CAPTCHA, anti-bot o paywall. Per l\'area riservata ItalGiure usa',
    'la skill `italgiure-browser`.',
    '',
    '## Consegna',
    '',
    'Scrivi `bcc-output/YYYY-MM-DD-<slug>/02-ricerca-web.md` e',
    '`bcc-output/YYYY-MM-DD-<slug>/fonti-web.md`.',
    '',
    extra,
    '',
  ].join('\n');
}

function agent(extra = '') {
  return [
    '---',
    'name: web-research-specialist',
    'description: "Sintetizza il materiale raccolto nella sessione principale."',
    'model: inherit',
    'tools:',
    '  - Read',
    '  - Grep',
    '  - Glob',
    '  - Bash',
    '---',
    '',
    '# Web Research Specialist',
    '',
    'Navigazione, login e raccolta avvengono nella sessione principale.',
    'Ricevo `sito`, `domanda` e `materiale` con provenienza. Senza materiale non',
    'navigo e chiedo che la raccolta venga fatta in sessione. Scrivo',
    '`02-ricerca-web.md` e `fonti-web.md` notando che raccolta e login sono',
    'avvenuti in sessione principale.',
    '',
    extra,
    '',
  ].join('\n');
}

function command(extra = '') {
  return [
    '---',
    'description: "Ricerca su portali protetti."',
    'tools:',
    '  - Read',
    '  - Grep',
    '  - Glob',
    '  - Bash',
    '  - Task',
    '---',
    '',
    '# /bettercallclaude-italia:ricerca-web',
    '',
    'Invocazione: `/bettercallclaude-italia:ricerca-web <sito> <domanda>`.',
    'Navigazione e login restano nella sessione principale. Output:',
    '`02-ricerca-web.md` e `fonti-web.md`.',
    '',
    extra,
    '',
  ].join('\n');
}

function fullFixture(opts = {}) {
  return {
    'skills/legal-web-research/SKILL.md': opts.skill || skill(),
    'agents/web-research-specialist.md': opts.agent || agent(),
    'commands/ricerca-web.md': opts.command || command(),
  };
}

console.log('check-ricerca-web: argomenti');

t('rifiuta una directory inesistente', () => {
  const r = run(path.join(os.tmpdir(), 'bcc-ricercaweb-does-not-exist-' + Date.now()));
  assert.strictEqual(r.code, 1, 'il validatore deve uscire con codice 1');
  assert.ok(
    r.output.includes('non esiste'),
    'l\'output deve dire che la directory non esiste, got:\n' + r.output
  );
});

console.log('check-ricerca-web: artefatti mancanti');

t('fallisce se manca la skill', () => {
  const dir = fixture({
    'agents/web-research-specialist.md': agent(),
    'commands/ricerca-web.md': command(),
  });
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'deve uscire con codice 1');
  assert.ok(
    r.output.includes('ERRORE RICERCA WEB:'),
    'deve usare il contratto di errore, got:\n' + r.output
  );
  assert.ok(
    r.output.includes('skills/legal-web-research/SKILL.md'),
    'deve nominare la skill mancante, got:\n' + r.output
  );
});

t('fallisce se manca l\'agent', () => {
  const dir = fixture({
    'skills/legal-web-research/SKILL.md': skill(),
    'commands/ricerca-web.md': command(),
  });
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('agents/web-research-specialist.md'), 'got:\n' + r.output);
});

t('fallisce se manca il comando', () => {
  const dir = fixture({
    'skills/legal-web-research/SKILL.md': skill(),
    'agents/web-research-specialist.md': agent(),
  });
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('commands/ricerca-web.md'), 'got:\n' + r.output);
});

console.log('check-ricerca-web: frontmatter');

t('rifiuta la skill senza nome nel frontmatter', () => {
  const bad = skill().replace(/^name:.*$/m, 'name:');
  const dir = fixture(fullFixture({ skill: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('ERRORE RICERCA WEB:'), 'got:\n' + r.output);
});

t('rifiuta l\'agent senza descrizione', () => {
  const bad = agent().replace(/^description:.*$/m, '');
  const dir = fixture(fullFixture({ agent: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('ERRORE RICERCA WEB:'), 'got:\n' + r.output);
});

t('rifiuta il comando senza tools', () => {
  const bad = command().replace(/\ntools:[\s\S]*?---/, '\n---');
  const dir = fixture(fullFixture({ command: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('ERRORE RICERCA WEB:'), 'got:\n' + r.output);
});

console.log('check-ricerca-web: privacy gate');

t('rifiuta la skill che non nomina le tre modalita', () => {
  const bad = skill().replace(/`strict`, `balanced` e `cloud`/g, '`strict` e `balanced`');
  const dir = fixture(fullFixture({ skill: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('cloud'), 'got:\n' + r.output);
});

t('rifiuta la skill che non cita il resolver della privacy', () => {
  const bad = skill().replace(/`CLAUDE_PLUGIN_OPTION_PRIVACY_MODE`/g, '`PRIVACY_MODE`');
  const dir = fixture(fullFixture({ skill: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('CLAUDE_PLUGIN_OPTION_PRIVACY_MODE'), 'got:\n' + r.output);
});

console.log('check-ricerca-web: allow-list');

t('rifiuta la skill senza sezione allow-list', () => {
  const bad = skill().replace(/`## Siti consentiti per la ricerca web`/g, '`## Siti autorizzati`');
  const dir = fixture(fullFixture({ skill: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('Siti consentiti per la ricerca web'), 'got:\n' + r.output);
});

t('rifiuta la skill senza path del playbook', () => {
  const bad = skill().replace(/bettercallclaude-italia\.local\.md/g, 'playbook.md');
  const dir = fixture(fullFixture({ skill: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('bettercallclaude-italia.local.md'), 'got:\n' + r.output);
});

console.log('check-ricerca-web: credenziali e blocchi');

t('rifiuta la skill che non vieta credenziali e blocchi', () => {
  const bad = skill().replace(/Non leggere i campi password, non digitare credenziali o codici 2FA, non\n/g, '')
                     .replace(/bypassare CAPTCHA, anti-bot o paywall/g, '');
  const dir = fixture(fullFixture({ skill: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('credenziali') || r.output.includes('CAPTCHA'), 'got:\n' + r.output);
});

console.log('check-ricerca-web: italgiure-browser');

t('rifiuta la skill che non rimanda a italgiure-browser', () => {
  const bad = skill().replace(/`italgiure-browser`/g, '`italgiure`');
  const dir = fixture(fullFixture({ skill: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('italgiure-browser'), 'got:\n' + r.output);
});

console.log('check-ricerca-web: nomi output');

t('rifiuta la skill con nomi output sbagliati', () => {
  const bad = skill().replace(/02-ricerca-web\.md/g, '02-research-memo.md');
  const dir = fixture(fullFixture({ skill: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('02-ricerca-web.md'), 'got:\n' + r.output);
});

t('rifiuta il comando con nomi output sbagliati', () => {
  const bad = command().replace(/fonti-web\.md/g, 'sources.md');
  const dir = fixture(fullFixture({ command: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('fonti-web.md'), 'got:\n' + r.output);
});

console.log('check-ricerca-web: contratto argomenti');

t('rifiuta il comando senza <sito>', () => {
  const bad = command().replace(/<sito>/g, '<target>');
  const dir = fixture(fullFixture({ command: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('<sito>'), 'got:\n' + r.output);
});

t('rifiuta il comando senza <domanda>', () => {
  const bad = command().replace(/<domanda>/g, '<query>');
  const dir = fixture(fullFixture({ command: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('<domanda>'), 'got:\n' + r.output);
});

console.log('check-ricerca-web: agent');

t('rifiuta l\'agent con tool browser hardcoded', () => {
  const bad = agent().replace('tools:', 'tools:\n  - mcp__chrome-devtools__navigate_page');
  const dir = fixture(fullFixture({ agent: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('mcp__chrome-devtools__navigate_page'), 'got:\n' + r.output);
});

t('rifiuta l\'agent che non dichiara la raccolta in sessione principale', () => {
  const bad = agent().replace(/sessione principale/g, 'sottosessione');
  const dir = fixture(fullFixture({ agent: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1);
  assert.ok(r.output.includes('sessione principale'), 'got:\n' + r.output);
});

console.log('check-ricerca-web: tool esatti');

t('rifiuta WebSearch nella skill (out of scope per il canale browser)', () => {
  const bad = skill().replace('  - Bash\n---', '  - Bash\n  - WebSearch\n---');
  const dir = fixture(fullFixture({ skill: bad }));
  const r = run(dir);
  assert.strictEqual(r.code, 1, 'il validatore deve uscire con codice 1');
  assert.ok(r.output.includes('WebSearch'), 'got:\n' + r.output);
});

console.log('check-ricerca-web: fixture valida');

t('accetta una fixture completa e corretta', () => {
  const dir = fixture(fullFixture());
  const r = run(dir);
  assert.strictEqual(r.code, 0, 'output:\n' + r.output);
});

console.log('check-ricerca-web: corpus reale');

t('il corpus reale del plugin passa il validatore', () => {
  const r = run(path.join(ROOT, 'bettercallclaude_italia'));
  assert.strictEqual(r.code, 0, 'output:\n' + r.output);
});

cleanupTempDirs();

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
