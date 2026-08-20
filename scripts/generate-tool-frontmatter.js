#!/usr/bin/env node
/**
 * Generate and apply `tools:` YAML frontmatter for skills and commands.
 *
 * Usage:
 *   node scripts/generate-tool-frontmatter.js          # dry-run (print only)
 *   node scripts/generate-tool-frontmatter.js --apply  # modify files in place
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const skillsDir = path.join(root, 'bettercallclaude_italia', 'skills');
const commandsDir = path.join(root, 'bettercallclaude_italia', 'commands');
const apply = process.argv.includes('--apply');

// Server → list of tools (from CONNECTORS.md — the 19 real tools on 7 servers)
const SERVER_TOOLS = {
  normattiva: ['normattiva_search', 'normattiva_search_advanced', 'normattiva_get_atto', 'normattiva_elenco_tipi'],
  'corte-costituzionale': ['corte-costituzionale_search', 'corte-costituzionale_get_sentenza', 'corte-costituzionale_norme_incostituzionali'],
  'giustizia-amministrativa': ['giustizia-amministrativa_search', 'giustizia-amministrativa_get_sentenza'],
  cassazione: ['cassazione_search_massime', 'cassazione_get_sentenza'],
  'eur-lex-ita': ['eur-lex-ita_search', 'eur-lex-ita_get_atto_celex'],
  'legal-citations-ita': ['legal-citations-ita_validate', 'legal-citations-ita_parse', 'legal-citations-ita_format'],
  'legal-persona-ita': ['legal-persona-ita_draft_document'],
};

const TOOL_TO_SERVERS = {};
for (const [server, tools] of Object.entries(SERVER_TOOLS)) {
  for (const tool of tools) {
    if (!TOOL_TO_SERVERS[tool]) TOOL_TO_SERVERS[tool] = [];
    TOOL_TO_SERVERS[tool].push(server);
  }
}

const COMMAND_SKILL_MAP = {
  'analisi-doc.md': ['italian-document-analysis'],
  'briefing.md': ['legal-intake'],
  'citazione.md': ['italian-citation-formats'],
  'contraddittorio.md': ['adversarial-analysis'],
  'flusso.md': ['italian-legal-strategy', 'italian-legal-research'],
  'legale-5step.md': ['legal-5step-framework', 'italian-legal-research', 'italian-legal-strategy', 'adversarial-analysis', 'italian-legal-drafting', 'italian-citation-formats'],
  'legale.md': ['italian-legal-research', 'legal-intake'],
  'legale-loop.md': ['legal-evaluator'],
  'mappa-legale.md': ['legal-wayfinder'],
  'percorso-legale.md': ['legal-wayfinder'],
  'nazionale.md': ['italian-legal-research'],
  'precedente.md': ['italian-legal-research'],
  'raffina.md': ['legal-intake'],
  'redazione.md': ['italian-legal-drafting'],
  'regionale.md': ['italian-legal-research'],
  'riassumi.md': ['shared'],
  'ricerca.md': ['italian-legal-research'],
  'strategia.md': ['italian-legal-strategy'],
  'traduci.md': ['italian-legal-translation'],
  'triage-nda.md': ['italian-document-analysis'],
  'verifica.md': ['italian-citation-formats'],
};

const GENERIC_TOOLS = ['Read', 'Grep', 'Glob', 'Bash', 'WebSearch', 'WebFetch'];

function readFile(p) {
  return fs.readFileSync(p, 'utf8');
}

function extractBareToolNames(text) {
  const found = new Set();
  for (const tool of Object.keys(TOOL_TO_SERVERS)) {
    const re = new RegExp(`\\b${tool}\\b`, 'g');
    if (re.test(text)) found.add(tool);
  }
  return [...found];
}

function resolveServer(tool, text) {
  const candidates = TOOL_TO_SERVERS[tool] || [];
  if (candidates.length === 1) return candidates[0];

  const serverHints = {
    normattiva: /normattiva/i,
    'corte-costituzionale': /corte-costituzionale/i,
    'giustizia-amministrativa': /giustizia-amministrativa/i,
    cassazione: /cassazione/i,
    'eur-lex-ita': /eur-lex-ita/i,
    'legal-citations-ita': /legal-citations-ita/i,
    'legal-persona-ita': /legal-persona-ita/i,
  };

  for (const server of candidates) {
    if (serverHints[server] && serverHints[server].test(text)) {
      return server;
    }
  }

  return candidates[0];
}

function fullyQualified(tool, server) {
  return `mcp__plugin_bettercallclaude-italia_${server}__${tool}`;
}

function analyzeFile(filePath) {
  const text = readFile(filePath);
  const bare = extractBareToolNames(text);
  const resolved = {};
  for (const tool of bare) {
    const server = resolveServer(tool, text);
    resolved[tool] = { server, fq: fullyQualified(tool, server) };
  }
  return { bare, resolved, text };
}

function skillTools(skillName) {
  const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return [];
  const { resolved } = analyzeFile(skillPath);
  return Object.values(resolved).map(r => r.fq);
}

function commandTools(cmdFile) {
  const text = readFile(cmdFile);
  const bare = extractBareToolNames(text);
  const tools = new Set(GENERIC_TOOLS);

  for (const tool of bare) {
    const server = resolveServer(tool, text);
    tools.add(fullyQualified(tool, server));
  }

  const base = path.basename(cmdFile);
  const skills = COMMAND_SKILL_MAP[base] || [];
  for (const skill of skills) {
    for (const fq of skillTools(skill)) tools.add(fq);
  }

  return [...tools];
}

function insertToolsIntoFrontmatter(content, tools) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return null;

  const fm = fmMatch[1];
  const rest = content.slice(fmMatch[0].length);

  const toolsYaml = 'tools:\n' + tools.map(t => `  - ${t}`).join('\n');

  // Insert after description line, or append at end of frontmatter
  const lines = fm.split('\n');
  let insertAt = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('description:')) {
      insertAt = i + 1;
      // Skip multi-line description continuation
      while (insertAt < lines.length && lines[insertAt].match(/^\s+/) && !lines[insertAt].includes(':')) {
        insertAt++;
      }
      break;
    }
  }
  if (insertAt === -1) insertAt = lines.length;

  lines.splice(insertAt, 0, toolsYaml);
  return `---\n${lines.join('\n')}\n---\n${rest}`;
}

function processFile(filePath, tools) {
  const content = readFile(filePath);
  const updated = insertToolsIntoFrontmatter(content, tools);
  if (!updated) {
    console.error(`Could not parse frontmatter: ${filePath}`);
    return false;
  }
  if (apply) {
    fs.writeFileSync(filePath, updated);
    console.log(`Updated: ${path.relative(root, filePath)}`);
  } else {
    console.log(`--- ${path.relative(root, filePath)}`);
    console.log(updated.split('\n').slice(0, 20).join('\n'));
    console.log('...');
  }
  return true;
}

console.log(`Mode: ${apply ? 'APPLY' : 'DRY RUN'}\n`);

let ok = 0;
let fail = 0;

for (const skillDir of fs.readdirSync(skillsDir)) {
  const skillPath = path.join(skillsDir, skillDir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) continue;
  const { resolved } = analyzeFile(skillPath);
  const tools = new Set(GENERIC_TOOLS);
  for (const r of Object.values(resolved)) tools.add(r.fq);
  if (processFile(skillPath, [...tools])) ok++;
  else fail++;
}

for (const cmdFile of fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'))) {
  const cmdPath = path.join(commandsDir, cmdFile);
  if (processFile(cmdPath, commandTools(cmdPath))) ok++;
  else fail++;
}

console.log(`\nDone: ${ok} ok, ${fail} failed`);
