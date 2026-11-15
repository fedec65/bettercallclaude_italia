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
 * restituisce risultati", "il canale server non è raggiungibile") è falsa: un
 * modello che la legge conclude che la ricerca non abbia prodotto nulla e lo
 * riferisce all'avvocato, invece di passare al canale client
 * (`italgiure-search` / `italgiure-browser`).
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
// Regola 1 — la formula obsoleta non può tornare sul canale Cassazione.
//
// La formula è bandita solo dove descrive il canale SERVER che interroga
// ItalGiure:
//
//   1. la frase deve nominare il canale server o la connessione verso
//      ItalGiure (marker `server`, `connessione`, i due tool del server);
//   2. la frase, o la sezione in cui si trova, deve nominare la FONTE
//      (Cassazione, ItalGiure, massime, sentenze, datacenter, …).
//
// Le due condizioni insieme tengono fuori i falsi positivi: la prosa
// generica su un altro server MCP ("se il server MCP non funziona…") parla
// di canale server ma non della fonte Cassazione, e il canale client continua
// a poter dire "zero risultati" e "totale: 0" — lì una ricerca che non trova
// nulla è un risultato, non un errore.
//
// La verifica guarda la FRASE, non la riga: il markdown avvolge le frasi su
// più righe, e "non restituisce risultati" spezzato dopo "non restituisce"
// sfuggirebbe al controllo. Per lo stesso motivo i marker sono scelti senza
// spazi fissi: "canale⏎ server" deve contare come "canale server".
// ---------------------------------------------------------------------------

const OBSOLETE_FORMULAS = [
  { re: /restituisce\s+zero\s+risultati/gi, label: 'restituisce zero risultati' },
  { re: /restituito\s+zero\s+risultati/gi, label: 'restituito zero risultati' },
  { re: /restituirebbe\s+zero\s+risultati/gi, label: 'restituirebbe zero risultati' },
  { re: /restituiscono\s+zero\s+risultati/gi, label: 'restituiscono zero risultati' },
  { re: /non\s+restituisce\s+risultati/gi, label: 'non restituisce risultati' },
  { re: /non\s+restituiscono\s+risultati/gi, label: 'non restituiscono risultati' },
  { re: /non\s+(?:è|e')\s+(?:normalmente\s+)?raggiungibile/gi, label: 'non è raggiungibile' },
  { re: /non\s+funziona/gi, label: 'non funziona' },
  { re: /non\s+risponde/gi, label: 'non risponde' },
  { re: /va\s+in\s+timeout/gi, label: 'va in timeout' },
  { re: /la\s+connessione\s+va\s+in\s+timeout/gi, label: 'la connessione va in timeout' },
];

// Il canale server (o la connessione verso ItalGiure) nominato dalla frase.
// "server" è una parola sola: resta valido anche se il markdown la separa dal
// nome che segue ("canale⏎ server", "server⏎ MCP").
const SERVER_CHANNEL_RE = /\bserver\b|\bconnessione\b|cassazione_search_massime|cassazione_get_sentenza/i;

// La fonte Cassazione: senza questo riferimento la frase parla d'altro.
const CASSAZIONE_RE = /cassazione|italgiure|massime|sentenze|datacenter|blocco\s+per\s+IP|precedent/i;

// ---------------------------------------------------------------------------
// Regola 2 — chi descrive il fallback del server deve dire come il tool lo
// dichiara.
//
// L'elenco è esplicito: sono i file in cui il plugin racconta all'utente (o al
// modello) che il canale server non interroga la fonte. Un file che descrive
// quel fallback senza citare `cookieValido` tornerebbe al "non funziona" di
// prima, e il modello non avrebbe modo di distinguere un errore da una ricerca
// senza risultati.
//
// Un file sorvegliato che sparisce è una violazione: altrimenti la regola per
// quel file si disattiverebbe in silenzio. (Un NUOVO file che descrive il
// fallback va aggiunto a questo elenco: finché non c'è, la Regola 2 non lo
// controlla.)
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

/**
 * Testo del file su un'unica riga, con la mappa degli offset sulle righe.
 * Il markdown avvolge le frasi: il controllo deve guardare il testo continuo.
 */
function flatten(content) {
  const normalized = content.replace(/\r\n/g, '\n');
  const flat = normalized.replace(/\n/g, ' ');
  const lines = normalized.split('\n');
  const lineStarts = [];
  let offset = 0;
  for (const line of lines) {
    lineStarts.push(offset);
    offset += line.length + 1;
  }
  const lineOf = (at) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    let found = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (lineStartAt(mid, lineStarts, at)) {
        found = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    return found + 1;
  };
  return { flat, lines, lineStarts, lineOf };
}

function lineStartAt(index, lineStarts, at) {
  return lineStarts[index] <= at;
}

const SENTENCE_END = /[.!?;]/;

/** La frase che contiene l'offset indicato (basta la frase: è lei che dice di chei canale si parla). */
function sentenceAt(flat, offset) {
  let start = 0;
  for (let i = offset - 1; i >= 0; i--) {
    if (SENTENCE_END.test(flat[i])) {
      start = i + 1;
      break;
    }
  }
  let end = flat.length;
  for (let i = offset; i < flat.length; i++) {
    if (SENTENCE_END.test(flat[i])) {
      end = i;
      break;
    }
  }
  return flat.slice(start, end);
}

/**
 * Sezioni del file: un titolo apre una sezione che dura fino al titolo
 * successivo (l'inizio del file è la prima sezione). La sezione è il contesto
 * in cui la frase cerca la fonte: un riepilogo la nomina nel titolo della
 * tabella, non nella riga che parla del server.
 */
function sections(lines) {
  const sectionOf = new Array(lines.length).fill(0);
  const hasCassazione = [];
  let current = 0;
  lines.forEach((line, i) => {
    if (/^\s{0,3}#{1,6}\s/.test(line)) current += 1;
    sectionOf[i] = current;
    if (hasCassazione[current] === undefined) hasCassazione[current] = false;
    if (CASSAZIONE_RE.test(line)) hasCassazione[current] = true;
  });
  return { sectionOf, hasCassazione };
}

/**
 * Registra le occorrenze di una formula obsoleta.
 * Ogni riga colpevole viene segnalata una volta sola, con tutte le formule
 * che vi compaiono.
 */
function scanPattern(pattern, flat, lineOf, file, context, violations) {
  pattern.re.lastIndex = 0;
  let match;
  while ((match = pattern.re.exec(flat)) !== null) {
    const offset = match.index;
    const sentence = sentenceAt(flat, offset);
    // La frase deve parlare del canale server...
    if (!SERVER_CHANNEL_RE.test(sentence)) continue;
    // ...e della fonte Cassazione: nella frase stessa o nella sezione.
    const line = lineOf(offset);
    const section = context.sectionOf[line - 1];
    if (!CASSAZIONE_RE.test(sentence) && !context.hasCassazione[section]) continue;
    const key = `${file}:${line}`;
    if (!violations.has(key)) {
      violations.set(key, {
        file,
        line,
        labels: new Set(),
        text: sentence.trim(),
      });
    }
    violations.get(key).labels.add(pattern.label);
  }
}

const files = collectFiles(pluginDir);

const formulaViolations = new Map();
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const { flat, lines, lineOf } = flatten(content);
  const context = sections(lines);
  for (const pattern of OBSOLETE_FORMULAS) {
    scanPattern(pattern, flat, lineOf, displayPath(file), context, formulaViolations);
  }
}

const cookieViolations = [];
let channelChecked = 0;
for (const rel of SERVER_CHANNEL_FILES) {
  const file = path.join(pluginDir, rel);
  if (!fs.existsSync(file)) {
    cookieViolations.push({ file: rel, missing: true });
    continue;
  }
  channelChecked++;
  const content = fs.readFileSync(file, 'utf8');
  if (!body(content).includes(COOKIE_VALIDO)) {
    cookieViolations.push({ file: rel, missing: false });
  }
}

let failed = false;

if (formulaViolations.size) {
  failed = true;
  console.error(`FAIL: ${formulaViolations.size} righe con la formula obsoleta sul canale Cassazione:\n`);
  for (const v of formulaViolations.values()) {
    console.error(`ERRORE NARRATIVA: ${v.file}:${v.line} — «${[...v.labels].join('» / «')}»`);
    console.error(`  ${v.text}`);
  }
  console.error('\nIl server non va in timeout e non restituisce zero risultati: dichiara il fallimento');
  console.error('con `autenticazione.cookieValido: false` e spiega il motivo in `autenticazione.messaggio`.');
  console.error('Il canale server non è "irraggiungibile": non può interrogare la fonte e lo dichiara.');
  console.error('Fix: riscrivi il testo con la narrativa del tool e passa al canale client `italgiure-search`.');
}

if (cookieViolations.length) {
  failed = true;
  console.error(`\nFAIL: ${cookieViolations.length} file descrivono il fallback del server senza dichiararlo:\n`);
  for (const v of cookieViolations) {
    if (v.missing) {
      console.error(`ERRORE NARRATIVA: ${v.file} — file sorvegliato mancante`);
      console.error('  il file che descrive il fallback del server non esiste più: la regola resterebbe senza controllo');
    } else {
      console.error(`ERRORE NARRATIVA: ${v.file} — manca \`${COOKIE_VALIDO}\``);
      console.error('  il file descrive il fallback del server ma non dice come il tool lo dichiara');
    }
  }
  console.error(`\nOgni file che descrive il fallback del server deve esistere e citare \`${COOKIE_VALIDO}\`.`);
  console.error('Fix: aggiungi la dichiarazione del tool (valore `false` + messaggio).');
}

if (failed) process.exit(1);

console.log(`OK: ${files.length} file verificati, nessuna formula obsoleta sul canale Cassazione.`);
console.log(`OK: i ${channelChecked} file che descrivono il fallback del server dichiarano \`${COOKIE_VALIDO}\`.`);
