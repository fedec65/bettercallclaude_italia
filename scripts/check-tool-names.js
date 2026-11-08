#!/usr/bin/env node
/**
 * Check MCP tool-name parity in `tools:` frontmatter of agents, commands, and skills.
 *
 * Every MCP entry whitelisted under one naming convention must also be whitelisted
 * under the other:
 *   scoped (Claude Code CLI / current Cowork): mcp__plugin_bettercallclaude-italia_<server>__<tool>
 *   bare   (older Cowork Desktop builds):       mcp__<server>__<tool>
 *
 * A missing twin silently strips the tool from the agent's allowlist on the host that
 * uses the other convention — the "No such tool available" regression (Swiss v4.11.5).
 *
 * Entries are also validated against the catalog: the server must be registered in
 * .mcp.json and the tool must exist in that server's SERVER_TOOLS inventory (loaded
 * from generate-tool-frontmatter.js — single source of truth). Parity alone would
 * accept a typo duplicated in both conventions (review Devin, PR #47).
 *
 * Lo stesso catalogo vale per la prosa dei file scansionati (agents/, commands/,
 * skills/), e soltanto per il corpo che segue il frontmatter: un tool citato nel
 * corpo di una skill (es. `get_article(statute_number, article)`) viene invocato
 * dal modello esattamente come uno del frontmatter, quindi un nome che non esiste
 * in SERVER_TOOLS e' lo stesso fallimento a runtime, un livello piu' in basso.
 *
 * Usage:
 *   node scripts/check-tool-names.js [plugin-dir]  # check (exit 1 on violation)
 *
 * To regenerate a file's tools: block, see scripts/generate-tool-frontmatter.js.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
// La directory del plugin da validare puo' essere indicata come argomento
// posizionale (usata dai test con fixture temporanee).
const pluginDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'bettercallclaude_italia');

if (!fs.existsSync(pluginDir)) {
  console.error(`ERRORE: la directory del plugin "${pluginDir}" non esiste.`);
  process.exit(1);
}

const TARGETS = [
  path.join(pluginDir, 'agents'),
  path.join(pluginDir, 'commands'),
  path.join(pluginDir, 'skills'),
];

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
//
// Il look-ahead `(?!mcp__)` esclude i nomi gia' qualificati con il prefisso
// MCP: sono riferimenti corretti, non nomi da catalogo.
// ---------------------------------------------------------------------------

const PROSE_TOOL_RE = /`((?!mcp__)[a-z][a-z0-9_-]*_[a-z0-9_-]*)\(/g;

// Secondo controllo, piu' stretto: nomi nudi tra backtick (nessuna
// parentesi di chiamata) che sono la *coda* di un tool del catalogo, cioe' un
// nome troncato per errore (es. `compute_deadlines` invece di
// `legal-persona-ita_compute_deadlines`). Non basta pero' la sola coda: nel
// corpus i nomi nudi con underscore sono decine e quasi tutti sono chiavi di
// JSON, di configurazione o identificativi di flusso, non tool. Percio' un
// nome viene segnalato solo se:
//   1. non e' un tool del catalogo;
//   2. e' la coda di almeno un tool del catalogo;
//   3. non e' una chiave di userConfig del manifest del plugin.
// La condizione 3 evita il falso positivo su `user_id`, che e' insieme una
// chiave di userConfig e la coda del tool `claim_user_id`.
const PROSE_BARE_NAME_RE = /`((?!mcp__)[a-z][a-z0-9_-]*_[a-z0-9_-]*)`/g;

// Corpo del file: tutto cio' che segue il frontmatter.
function proseBody(content) {
  const fm = content.match(/^---\n([\s\S]*?)\n---\n/);
  return fm ? content.slice(fm[0].length) : content;
}

function collectProseTools(content) {
  const body = proseBody(content);
  const found = new Set();
  let m;
  PROSE_TOOL_RE.lastIndex = 0;
  while ((m = PROSE_TOOL_RE.exec(body)) !== null) {
    found.add(m[1]);
  }
  return found;
}

function collectProseBareNames(content) {
  const body = proseBody(content);
  const found = new Set();
  let m;
  PROSE_BARE_NAME_RE.lastIndex = 0;
  while ((m = PROSE_BARE_NAME_RE.exec(body)) !== null) {
    found.add(m[1]);
  }
  return found;
}

const SCOPED_PREFIX = 'mcp__plugin_bettercallclaude-italia_';
const BARE_PREFIX = 'mcp__';

// Catalog: servers registered in .mcp.json + per-server tool inventory from the
// generator's SERVER_TOOLS (parsed from source so there is one source of truth).
function loadCatalog() {
  // I server registrati vengono letti dal .mcp.json della directory validata;
  // se la directory non ne ha uno (fixture temporanee dei test) si ricade su
  // quello canonico del repo. L'inventario dei tool, invece, e' sempre quello
  // del repo: SERVER_TOOLS in generate-tool-frontmatter.js.
  const mcpPath = fs.existsSync(path.join(pluginDir, '.mcp.json'))
    ? path.join(pluginDir, '.mcp.json')
    : path.join(root, 'bettercallclaude_italia', '.mcp.json');
  const mcp = JSON.parse(fs.readFileSync(mcpPath, 'utf8'));
  const registeredServers = new Set(Object.keys(mcp.mcpServers || {}));
  const genSrc = fs.readFileSync(path.join(root, 'scripts', 'generate-tool-frontmatter.js'), 'utf8');
  const m = genSrc.match(/const SERVER_TOOLS = (\{[\s\S]*?\n\});/);
  if (!m) throw new Error('SERVER_TOOLS non trovato in generate-tool-frontmatter.js');
  const serverTools = eval('(' + m[1] + ')');
  return { registeredServers, serverTools };
}

// Chiavi di userConfig dichiarate dal manifest del plugin. Sono nomi che
// l'utente configura, non tool: non vanno segnalati anche quando coincidono
// con la coda di un tool del catalogo (es. `user_id`).
function loadUserConfigKeys() {
  const candidates = [
    path.join(pluginDir, '.claude-plugin', 'plugin.json'),
    path.join(root, 'bettercallclaude_italia', '.claude-plugin', 'plugin.json'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    try {
      const manifest = JSON.parse(fs.readFileSync(p, 'utf8'));
      return new Set(Object.keys(manifest.userConfig || {}));
    } catch (e) {
      // Manifest illeggibile: nessuna esclusione.
    }
  }
  return new Set();
}

const { registeredServers, serverTools } = loadCatalog();
const userConfigKeys = loadUserConfigKeys();

// Unione dei nomi di tool di tutti i server: un token di prosa e' valido se
// esiste in QUALSIASI server, non solo in quelli citati dal file.
const ALL_TOOL_NAMES = new Set();
for (const tools of Object.values(serverTools)) {
  for (const name of tools) ALL_TOOL_NAMES.add(name);
}

// Mappa coda di un tool -> nomi completi che terminano con quella coda.
// Es. "compute_deadlines" -> ["legal-persona-ita_compute_deadlines"].
const TOOL_TAILS = new Map();
for (const name of ALL_TOOL_NAMES) {
  for (let i = name.indexOf('_'); i !== -1; i = name.indexOf('_', i + 1)) {
    const tail = name.slice(i + 1);
    if (!tail) continue;
    if (!TOOL_TAILS.has(tail)) TOOL_TAILS.set(tail, []);
    TOOL_TAILS.get(tail).push(name);
  }
}

// Path leggibile nei messaggi: relativo alla directory del plugin, con
// fallback al path assoluto se il file sta fuori da quella directory.
function displayPath(file) {
  const rel = path.relative(pluginDir, file);
  return rel.startsWith('..') ? file : rel;
}

function collectFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // skills/<name>/SKILL.md
      const skill = path.join(p, 'SKILL.md');
      if (fs.existsSync(skill)) out.push(skill);
    } else if (entry.name.endsWith('.md')) {
      out.push(p);
    }
  }
  return out;
}

function extractToolsList(content) {
  const fm = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) return null;
  const lines = fm[1].split('\n');
  const tools = [];
  let inTools = false;
  for (const line of lines) {
    if (/^tools:\s*$/.test(line)) { inTools = true; continue; }
    if (inTools) {
      const m = line.match(/^\s+-\s+(\S+)\s*$/);
      if (m) { tools.push(m[1]); continue; }
      // Any other non-indented key ends the block
      if (/^\S/.test(line)) break;
    }
  }
  return tools;
}

function parseMcpEntry(entry) {
  let rest = null;
  let scoped = false;
  if (entry.startsWith(SCOPED_PREFIX)) {
    rest = entry.slice(SCOPED_PREFIX.length);
    scoped = true;
  } else if (entry.startsWith(BARE_PREFIX)) {
    rest = entry.slice(BARE_PREFIX.length);
  } else {
    return null; // generic tool (Read, Bash, Task, ...)
  }
  const i = rest.indexOf('__');
  if (i === -1) return null; // server-level pattern like mcp__<server>
  return { server: rest.slice(0, i), tool: rest.slice(i + 2), scoped };
}

function twinOf(e) {
  return e.scoped
    ? `${BARE_PREFIX}${e.server}__${e.tool}`
    : `${SCOPED_PREFIX}${e.server}__${e.tool}`;
}

let filesChecked = 0;
let mcpEntries = 0;
const violations = [];
const unknown = [];
const proseViolations = [];

for (const dir of TARGETS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of collectFiles(dir)) {
    const content = fs.readFileSync(file, 'utf8');
    const tools = extractToolsList(content);
    const proseTools = collectProseTools(content);
    for (const name of proseTools) {
      if (!ALL_TOOL_NAMES.has(name)) {
        proseViolations.push({ file: displayPath(file), tool: name });
      }
    }
    // Nomi nudi che sono la coda di un tool del catalogo: quasi sempre sono
    // chiavi di configurazione, vanno segnalati solo se non sono ne' tool ne'
    // chiavi di userConfig.
    for (const name of collectProseBareNames(content)) {
      if (ALL_TOOL_NAMES.has(name)) continue;
      if (userConfigKeys.has(name)) continue;
      const matches = TOOL_TAILS.get(name);
      if (!matches) continue;
      proseViolations.push({
        file: displayPath(file),
        tool: name,
        fullTool: matches.join(' / '),
      });
    }
    if (!tools) continue;
    filesChecked++;
    const set = new Set(tools);
    for (const entry of tools) {
      const parsed = parseMcpEntry(entry);
      if (!parsed) continue;
      mcpEntries++;
      const twin = twinOf(parsed);
      if (!set.has(twin)) {
        violations.push({ file: displayPath(file), entry, twin });
      }
      if (!registeredServers.has(parsed.server)) {
        unknown.push({ file: displayPath(file), entry, problem: `server "${parsed.server}" non registrato in .mcp.json` });
      } else if (!(serverTools[parsed.server] || []).includes(parsed.tool)) {
        unknown.push({ file: displayPath(file), entry, problem: `tool "${parsed.tool}" non nel catalogo SERVER_TOOLS del server "${parsed.server}"` });
      }
    }
  }
}

let failed = false;

if (violations.length) {
  failed = true;
  console.error(`FAIL: ${violations.length} MCP tool entr${violations.length === 1 ? 'y' : 'ies'} missing its twin naming convention:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}`);
    console.error(`    has:    ${v.entry}`);
    console.error(`    misses: ${v.twin}`);
  }
  console.error('\nBoth conventions must be whitelisted (hosts differ: scoped vs bare server names).');
  console.error('Fix: add the missing twin, or regenerate with `node scripts/generate-tool-frontmatter.js --apply`.');
}

if (unknown.length) {
  failed = true;
  console.error(`FAIL: ${unknown.length} MCP entr${unknown.length === 1 ? 'y' : 'ies'} not in the server/tool catalog:\n`);
  for (const u of unknown) {
    console.error(`  ${u.file}`);
    console.error(`    ${u.entry} — ${u.problem}`);
  }
  console.error('\nEvery entry must reference a server registered in .mcp.json and a tool in SERVER_TOOLS.');
  console.error('Fix: correct the name, or add the tool to SERVER_TOOLS in generate-tool-frontmatter.js (if real) and regenerate.');
}

if (proseViolations.length) {
  failed = true;
  console.error(`FAIL: ${proseViolations.length} riferimenti a tool inesistenti nella prosa:\n`);
  for (const v of proseViolations) {
    const suggestion = v.fullTool ? ` (nome completo: "${v.fullTool}")` : '';
    console.error(`ERRORE PROSA: ${v.file} — "${v.tool}" non esiste nel catalogo SERVER_TOOLS${suggestion}`);
  }
  console.error('\nOgni tool citato in prosa come `nome(...)` deve esistere in SERVER_TOOLS.');
  console.error('Se il nome e\' la coda di un tool del catalogo, va scritto per intero.');
  console.error('Fix: correggi il nome nella prosa, oppure aggiungi il tool a SERVER_TOOLS in');
  console.error('generate-tool-frontmatter.js (se esiste davvero) e rigenera.');
}

if (failed) process.exit(1);

console.log(`OK: ${filesChecked} files checked, ${mcpEntries} MCP entries, all paired under both naming conventions.`);
console.log(`OK: all entries validated against the catalog (${registeredServers.size} servers in .mcp.json, ${Object.keys(serverTools).length} in SERVER_TOOLS).`);
