#!/usr/bin/env node
/**
 * Verifica la narrativa del canale Cassazione nei file del plugin.
 *
 * Il server dichiara il proprio fallimento: la chiamata va a buon fine
 * (`success: true`) ma `data.autenticazione.cookieValido` vale `false` e
 * `data.autenticazione.messaggio` spiega il motivo — in hosting l'IP di
 * datacenter viene scartato, quindi il server non ha potuto interrogare la
 * fonte. Non è un timeout e non è una ricerca senza risultati.
 *
 * La formula obsoleta ("va in timeout o restituisce zero risultati", "non
 * restituisce risultati") è falsa: un modello che la legge conclude che la
 * ricerca non abbia prodotto nulla e lo riferisce all'avvocato, invece di
 * passare al canale client (`italgiure-search` / `italgiure-browser`).
 *
 * Usage:
 *   node scripts/check-cassazione-narrative.js [plugin-dir]  # check (exit 1 on violation)
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
// La directory del plugin da verificare può essere indicata come argomento
// posizionale (usata dai test con fixture temporanee).
const pluginDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'bettercallclaude_italia');

if (!fs.existsSync(pluginDir)) {
  console.error(`ERRORE: la directory del plugin "${pluginDir}" non esiste.`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Regola 1 — la formula obsoleta non può tornare.
//
// È bandita la formula che descrive il *canale server*. Il canale client
// conserva invece "totale: 0" e "nessun risultato": lì una ricerca che non
// trova nulla è un risultato, non un errore, e la distinzione va conservata.
// ---------------------------------------------------------------------------

const OBSOLETE_FORMULAS = [
  { re: /restituisce\s+zero\s+risultati/i, label: 'restituisce zero risultati' },
  { re: /restituito\s+zero\s+risultati/i, label: 'restituito zero risultati' },
  { re: /restituirebbe\s+zero\s+risultati/i, label: 'restituirebbe zero risultati' },
  { re: /non\s+restituisce\s+risultati/i, label: 'non restituisce risultati' },
  { re: /non\s+restituiscono\s+risultati/i, label: 'non restituiscono risultati' },
  { re: /la\s+connessione\s+va\s+in\s+timeout/i, label: 'la connessione va in timeout' },
  { re: /lato\s+server\s+va\s+in\s+timeout/i, label: 'lato server va in timeout' },
];

// ---------------------------------------------------------------------------
// Regola 2 — chi descrive il fallback del server deve dire come il tool lo
// dichiara.
//
// L'elenco è esplicito: sono i file in cui il plugin racconta all'utente (o al
// modello) che il canale server non interroga la fonte. Un file che descrive
// quel fallback senza citare `cookieValido` tornerebbe al "non funziona" di
// prima, e il modello non avrebbe modo di distinguere un errore da una ricerca
// senza risultati.
// ---------------------------------------------------------------------------

const SERVER_CHANNEL_FILES = [
  'CONNECTORS.md',
  'README.md',
  'agents/researcher.md',
  'docs/cassazione-cookie.md',
  'skills/italgiure-browser/SKILL.md',
  'skills/italgiure-search/SKILL.md',
  'skills/italian-legal-research/SKILL.md',
  'skills/italian-legal-strategy/SKILL.md',
];

const COOKIE_VALIDO = 'cookieValido';

const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

/** Tutti i file markdown del plugin. */
function collectFiles(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      collectFiles(p, out);
    } else if (entry.name.endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Corpo del file: tutto ciò che segue il frontmatter. La descrizione della
 * skill ne governa l'attivazione, ma è il corpo a guidare il modello durante
 * l'esecuzione: è lì che il fallback va dichiarato.
 */
function body(content) {
  const fm = content.match(/^---\n([\s\S]*?)\n---\n/);
  return fm ? content.slice(fm[0].length) : content;
}

/** Path leggibile nei messaggi: relativo alla directory del plugin. */
function displayPath(file) {
  const rel = path.relative(pluginDir, file);
  return rel.startsWith('..') ? file : rel;
}

const files = collectFiles(pluginDir);

const formulaViolations = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  content.split('\n').forEach((line, i) => {
    for (const { re, label } of OBSOLETE_FORMULAS) {
      if (re.test(line)) {
        formulaViolations.push({
          file: displayPath(file),
          line: i + 1,
          label,
          text: line.trim(),
        });
      }
    }
  });
}

const cookieViolations = [];
let channelChecked = 0;
for (const rel of SERVER_CHANNEL_FILES) {
  const file = path.join(pluginDir, rel);
  if (!fs.existsSync(file)) continue;
  channelChecked++;
  const content = fs.readFileSync(file, 'utf8');
  if (!body(content).includes(COOKIE_VALIDO)) {
    cookieViolations.push({ file: rel });
  }
}

let failed = false;

if (formulaViolations.length) {
  failed = true;
  console.error(`FAIL: ${formulaViolations.length} occorrenze della formula obsoleta sul canale Cassazione:\n`);
  for (const v of formulaViolations) {
    console.error(`ERRORE NARRATIVA: ${v.file}:${v.line} — «${v.label}»`);
    console.error(`  ${v.text}`);
  }
  console.error('\nIl server non va in timeout e non restituisce zero risultati: dichiara il fallimento');
  console.error('con `autenticazione.cookieValido: false` e spiega il motivo in `autenticazione.messaggio`.');
  console.error('Fix: riscrivi il testo con la narrativa del tool e passa al canale client `italgiure-search`.');
}

if (cookieViolations.length) {
  failed = true;
  console.error(`\nFAIL: ${cookieViolations.length} file descrivono il fallback del server senza dichiararlo:\n`);
  for (const v of cookieViolations) {
    console.error(`ERRORE NARRATIVA: ${v.file} — manca \`${COOKIE_VALIDO}\``);
    console.error('  il file descrive il fallback del server ma non dice come il tool lo dichiara');
  }
  console.error(`\nOgni file che descrive il fallback del server deve citare \`${COOKIE_VALIDO}\`.`);
  console.error('Fix: aggiungi la dichiarazione del tool (valore `false` + messaggio).');
}

if (failed) process.exit(1);

console.log(`OK: ${files.length} file verificati, nessuna formula obsoleta sul canale Cassazione.`);
console.log(`OK: i ${channelChecked} file che descrivono il fallback del server dichiarano \`${COOKIE_VALIDO}\`.`);
