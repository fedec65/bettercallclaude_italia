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
 * Usage:
 *   node scripts/check-tool-names.js            # check (exit 1 on violation)
 *
 * To regenerate a file's tools: block, see scripts/generate-tool-frontmatter.js.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pluginDir = path.join(root, 'bettercallclaude_italia');

const TARGETS = [
  path.join(pluginDir, 'agents'),
  path.join(pluginDir, 'commands'),
  path.join(pluginDir, 'skills'),
];

const SCOPED_PREFIX = 'mcp__plugin_bettercallclaude-italia_';
const BARE_PREFIX = 'mcp__';

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

for (const dir of TARGETS) {
  if (!fs.existsSync(dir)) continue;
  for (const file of collectFiles(dir)) {
    const tools = extractToolsList(fs.readFileSync(file, 'utf8'));
    if (!tools) continue;
    filesChecked++;
    const set = new Set(tools);
    for (const entry of tools) {
      const parsed = parseMcpEntry(entry);
      if (!parsed) continue;
      mcpEntries++;
      const twin = twinOf(parsed);
      if (!set.has(twin)) {
        violations.push({ file: path.relative(root, file), entry, twin });
      }
    }
  }
}

if (violations.length) {
  console.error(`FAIL: ${violations.length} MCP tool entr${violations.length === 1 ? 'y' : 'ies'} missing its twin naming convention:\n`);
  for (const v of violations) {
    console.error(`  ${v.file}`);
    console.error(`    has:    ${v.entry}`);
    console.error(`    misses: ${v.twin}`);
  }
  console.error('\nBoth conventions must be whitelisted (hosts differ: scoped vs bare server names).');
  console.error('Fix: add the missing twin, or regenerate with `node scripts/generate-tool-frontmatter.js --apply`.');
  process.exit(1);
}

console.log(`OK: ${filesChecked} files checked, ${mcpEntries} MCP entries, all paired under both naming conventions.`);
