#!/usr/bin/env node
/**
 * Generate and apply `tools:` YAML frontmatter for agents, skills, and commands.
 *
 * Every MCP tool is whitelisted under BOTH naming conventions, because hosts
 * differ (scoped names on Claude Code CLI and current Cowork builds, bare
 * server names on older Cowork builds):
 *   scoped: mcp__plugin_bettercallclaude-italia_<server>__<tool>
 *   bare:   mcp__<server>__<tool>
 *
 * Usage:
 *   node scripts/generate-tool-frontmatter.js          # dry-run (print only)
 *   node scripts/generate-tool-frontmatter.js --apply  # modify files in place
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const agentsDir = path.join(root, 'bettercallclaude_italia', 'agents');
const skillsDir = path.join(root, 'bettercallclaude_italia', 'skills');
const commandsDir = path.join(root, 'bettercallclaude_italia', 'commands');
const apply = process.argv.includes('--apply');

// Server → list of tools (from CONNECTORS.md — the 21 real tools on 8 servers)
const SERVER_TOOLS = {
  normattiva: ['normattiva_search', 'normattiva_search_advanced', 'normattiva_get_atto', 'normattiva_elenco_tipi'],
  'corte-costituzionale': ['corte-costituzionale_search', 'corte-costituzionale_get_sentenza', 'corte-costituzionale_norme_incostituzionali'],
  'giustizia-amministrativa': ['giustizia-amministrativa_search', 'giustizia-amministrativa_get_sentenza'],
  cassazione: ['cassazione_search_massime', 'cassazione_get_sentenza'],
  'eur-lex-ita': ['eur-lex-ita_search', 'eur-lex-ita_get_atto_celex'],
  'legal-citations-ita': ['legal-citations-ita_validate', 'legal-citations-ita_parse', 'legal-citations-ita_format'],
  'legal-persona-ita': ['legal-persona-ita_draft_document', 'legal-persona-ita_compute_deadlines'],
  'citation-verify-ita': ['citation-verify-ita_check_existence'],
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
  'crea-flusso.md': ['italian-legal-strategy'],
  'legale-5step.md': ['legal-5step-framework', 'italian-legal-research', 'italian-legal-strategy', 'adversarial-analysis', 'italian-legal-drafting', 'italian-citation-formats'],
  'legale.md': ['italian-legal-research', 'legal-intake'],
  'legale-loop.md': ['legal-evaluator', 'citation-content-verify'],
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
  'verifica.md': ['italian-citation-formats', 'citation-content-verify'],
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

const SCOPED_PREFIX = 'mcp__plugin_bettercallclaude-italia_';
const BARE_PREFIX = 'mcp__';

function fullyQualified(tool, server) {
  return `${SCOPED_PREFIX}${server}__${tool}`;
}

// Every MCP entry whitelisted under one naming convention must also be
// whitelisted under the other — hosts differ (scoped vs bare server names).
// Applied to the merged list so both computed and pre-existing entries get
// their twin (agents carry curated lists the text analysis cannot recompute).
function twinExpand(entries) {
  const out = new Set(entries);
  for (const e of entries) {
    if (e.startsWith(SCOPED_PREFIX)) {
      out.add(BARE_PREFIX + e.slice(SCOPED_PREFIX.length));
    } else if (e.startsWith(BARE_PREFIX)) {
      out.add(SCOPED_PREFIX + e.slice(BARE_PREFIX.length));
    }
  }
  return [...out];
}

// When a file references any tool of a server, grant the full toolset of that server
// (frontmatter convention of this repo: complete per-server sets).
function serversFromResolved(resolved) {
  const servers = new Set();
  for (const r of Object.values(resolved)) servers.add(r.server);
  return servers;
}

function fqForServers(servers) {
  const tools = new Set();
  for (const server of servers) {
    for (const tool of SERVER_TOOLS[server]) tools.add(fullyQualified(tool, server));
  }
  return tools;
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

function skillServers(skillName) {
  const skillPath = path.join(skillsDir, skillName, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return new Set();
  const { resolved } = analyzeFile(skillPath);
  return serversFromResolved(resolved);
}

function commandTools(cmdFile) {
  const text = readFile(cmdFile);
  const bare = extractBareToolNames(text);
  const servers = new Set();

  for (const tool of bare) {
    servers.add(resolveServer(tool, text));
  }

  const base = path.basename(cmdFile);
  const skills = COMMAND_SKILL_MAP[base] || [];
  for (const skill of skills) {
    for (const server of skillServers(skill)) servers.add(server);
  }

  const tools = new Set(GENERIC_TOOLS);
  for (const fq of fqForServers(servers)) tools.add(fq);

  return [...tools];
}

function insertToolsIntoFrontmatter(content, tools) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) return null;

  const rest = content.slice(fmMatch[0].length);

  // Drop the existing tools: block but keep its entries: regeneration is a
  // union (computed ∪ existing) and never removes previously granted tools.
  const oldLines = fmMatch[1].split('\n');
  const existing = [];
  const lines = [];
  let skippingTools = false;
  for (const line of oldLines) {
    if (/^tools:\s*$/.test(line)) {
      skippingTools = true;
      continue;
    }
    if (skippingTools && /^  - /.test(line)) {
      existing.push(line.replace(/^  - /, ''));
      continue;
    }
    skippingTools = false;
    lines.push(line);
  }

  const merged = twinExpand([...new Set([...existing, ...tools])]);
  const toolsYaml = 'tools:\n' + merged.map(t => `  - ${t}`).join('\n');

  // Insert after description line, or append at end of frontmatter
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

// Agents: whitelists are curated per agent — keep the existing entries and
// only add the missing naming-convention twins (no text-analysis additions).
for (const agentFile of fs.readdirSync(agentsDir).filter(f => f.endsWith('.md'))) {
  const agentPath = path.join(agentsDir, agentFile);
  if (processFile(agentPath, [])) ok++;
  else fail++;
}

for (const skillDir of fs.readdirSync(skillsDir)) {
  const skillPath = path.join(skillsDir, skillDir, 'SKILL.md');
  if (!fs.existsSync(skillPath)) continue;
  const { resolved } = analyzeFile(skillPath);
  const tools = new Set(GENERIC_TOOLS);
  for (const fq of fqForServers(serversFromResolved(resolved))) tools.add(fq);
  if (processFile(skillPath, [...tools])) ok++;
  else fail++;
}

for (const cmdFile of fs.readdirSync(commandsDir).filter(f => f.endsWith('.md'))) {
  const cmdPath = path.join(commandsDir, cmdFile);
  if (processFile(cmdPath, commandTools(cmdPath))) ok++;
  else fail++;
}

console.log(`\nDone: ${ok} ok, ${fail} failed`);
