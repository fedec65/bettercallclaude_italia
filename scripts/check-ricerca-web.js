#!/usr/bin/env node
/**
 * Checker di non regressione per la ricerca web su portali protetti.
 *
 * Verifica che esistano skill, agente e comando e che rispettino i vincoli
 * del brief (privacy gate, allow-list, vieto credenziali, rimando a
 * italgiure-browser, nomi output, contratto argomenti, niente tool browser
 * hardcoded nell'agente).
 *
 * Usage:
 *   node scripts/check-ricerca-web.js [plugin-dir]
 */

'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pluginDir = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(root, 'bettercallclaude_italia');

if (!fs.existsSync(pluginDir)) {
  console.error(`ERRORE: la directory del plugin "${pluginDir}" non esiste.`);
  process.exit(1);
}

const artifacts = {
  skill: 'skills/legal-web-research/SKILL.md',
  agent: 'agents/web-research-specialist.md',
  command: 'commands/ricerca-web.md',
};

function displayPath(file) {
  const rel = path.relative(pluginDir, file);
  return rel.startsWith('..') ? file : rel;
}

function lineOf(content, needle) {
  const idx = content.toLowerCase().indexOf(needle.toLowerCase());
  if (idx === -1) return 0;
  return content.slice(0, idx).split('\n').length;
}

function contains(content, needle) {
  return content.toLowerCase().includes(needle.toLowerCase());
}

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return null;
  const lines = match[1].split('\n');
  const fm = { tools: [], _line: {} };
  let inTools = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^tools:\s*$/.test(line)) {
      inTools = true;
      fm._line.tools = i + 1;
      continue;
    }
    if (inTools) {
      const m = line.match(/^\s+-\s+(\S+)\s*$/);
      if (m) {
        fm.tools.push(m[1]);
        continue;
      }
      if (/^\S/.test(line)) {
        inTools = false;
      }
    }
    const m = line.match(/^(\w+):\s*(.*)$/);
    if (m) {
      fm[m[1]] = m[2].trim();
      fm._line[m[1]] = i + 1;
    }
  }
  return fm;
}

const errors = [];

function err(file, line, reason) {
  errors.push(`ERRORE RICERCA WEB: ${displayPath(file)}:${line} — ${reason}`);
}

const files = {};
const contents = {};

for (const [key, rel] of Object.entries(artifacts)) {
  const p = path.join(pluginDir, rel);
  files[key] = p;
  if (!fs.existsSync(p)) {
    err(p, 0, `file mancante: ${rel}`);
    continue;
  }
  contents[key] = fs.readFileSync(p, 'utf8');
  const fm = parseFrontmatter(contents[key]);
  if (!fm) {
    err(p, 1, 'frontmatter mancante o malformato');
    continue;
  }
  if (key !== 'command' && !fm.name) {
    err(p, fm._line.name || 1, `frontmatter senza "name" per ${key}`);
  }
  if (key === 'skill' && fm.name && fm.name !== 'legal-web-research') {
    err(p, fm._line.name, `nome skill errato: ${fm.name}`);
  }
  if (key === 'agent' && fm.name && fm.name !== 'web-research-specialist') {
    err(p, fm._line.name, `nome agent errato: ${fm.name}`);
  }
  if (!fm.description) {
    err(p, fm._line.description || 1, `frontmatter senza "description" per ${key}`);
  }
  if (!fm.tools || fm.tools.length === 0) {
    err(p, fm._line.tools || 1, `frontmatter senza "tools" per ${key}`);
  }
}

function requireIn(fileKey, needle, reason) {
  const content = contents[fileKey];
  const file = files[fileKey];
  if (!content) return;
  if (!content.includes(needle)) {
    err(file, lineOf(content, needle) || 1, reason);
  }
}

// ---------------------------------------------------------------------------
// Skill checks
// ---------------------------------------------------------------------------
if (contents.skill) {
  const skill = contents.skill;
  const skillFile = files.skill;

  const privacyTerms = ['strict', 'balanced', 'cloud'];
  for (const term of privacyTerms) {
    if (!contains(skill, term)) {
      err(skillFile, 1, `gate privacy: manca la modalita "${term}"`);
    }
  }
  const privacyResolver = ['CLAUDE_PLUGIN_OPTION_PRIVACY_MODE', 'privacy_mode', '.privacy-mode'];
  for (const term of privacyResolver) {
    if (!contains(skill, term)) {
      err(skillFile, 1, `gate privacy: manca il riferimento al resolver "${term}"`);
    }
  }

  if (!contains(skill, '## Siti consentiti per la ricerca web') && !contains(skill, '## Allowed Sites for Web Research')) {
    err(skillFile, 1, 'allow-list: manca la sezione "## Siti consentiti per la ricerca web"');
  }
  if (!contains(skill, 'bettercallclaude-italia.local.md')) {
    err(skillFile, 1, 'allow-list: manca il riferimento al playbook "bettercallclaude-italia.local.md"');
  }

  const banTerms = [
    { term: 'non leggere', reason: 'deve vietare la lettura delle credenziali' },
    { term: 'non digitare', reason: 'deve vietare la digitazione delle credenziali' },
    { term: 'credenziali', reason: 'deve menzionare il divieto sulle credenziali' },
    { term: 'CAPTCHA', reason: 'deve vietare il bypass di CAPTCHA' },
    { term: 'anti-bot', reason: 'deve vietare il bypass anti-bot' },
    { term: 'paywall', reason: 'deve vietare il bypass dei paywall' },
  ];
  for (const { term, reason } of banTerms) {
    if (!contains(skill, term)) {
      err(skillFile, lineOf(skill, term) || 1, reason);
    }
  }

  if (!contains(skill, 'italgiure-browser')) {
    err(skillFile, 1, 'deve rimandare a "italgiure-browser" per l\'area riservata');
  }

  const outputTerms = ['02-ricerca-web.md', 'fonti-web.md'];
  for (const term of outputTerms) {
    if (!contains(skill, term)) {
      err(skillFile, 1, `consegna: manca il riferimento a "${term}"`);
    }
  }

  // La skill deve avere ESATTAMENTE i tool generici previsti dal brief.
  const allowedSkillTools = ['Read', 'Grep', 'Glob', 'Bash'];
  const fm = parseFrontmatter(skill);
  if (fm && fm.tools) {
    const missing = allowedSkillTools.filter((t) => !fm.tools.includes(t));
    const extra = fm.tools.filter((t) => !allowedSkillTools.includes(t));
    if (missing.length || extra.length) {
      err(
        skillFile,
        fm._line.tools || 1,
        `la skill deve avere esattamente i tool ${allowedSkillTools.join(', ')} (mancanti: ${missing.join(', ')}, extra: ${extra.join(', ')})`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Command checks
// ---------------------------------------------------------------------------
if (contents.command) {
  const command = contents.command;
  const commandFile = files.command;

  requireIn('command', '/bettercallclaude-italia:ricerca-web', 'manca l\'invocazione del comando');
  requireIn('command', '<sito>', 'manca il contratto dell\'argomento <sito>');
  requireIn('command', '<domanda>', 'manca il contratto dell\'argomento <domanda>');

  for (const term of ['02-ricerca-web.md', 'fonti-web.md']) {
    if (!contains(command, term)) {
      err(commandFile, 1, `output: manca il riferimento a "${term}"`);
    }
  }

  // Il comando deve avere ESATTAMENTE i tool previsti dal brief.
  const allowedCommandTools = ['Read', 'Grep', 'Glob', 'Bash', 'Task'];
  const fm = parseFrontmatter(command);
  if (fm && fm.tools) {
    const missing = allowedCommandTools.filter((t) => !fm.tools.includes(t));
    const extra = fm.tools.filter((t) => !allowedCommandTools.includes(t));
    if (missing.length || extra.length) {
      err(
        commandFile,
        fm._line.tools || 1,
        `il comando deve avere esattamente i tool ${allowedCommandTools.join(', ')} (mancanti: ${missing.join(', ')}, extra: ${extra.join(', ')})`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Agent checks
// ---------------------------------------------------------------------------
if (contents.agent) {
  const agent = contents.agent;
  const agentFile = files.agent;

  // L'agent deve avere ESATTAMENTE i tool generici previsti dal brief.
  const allowedAgentTools = ['Read', 'Grep', 'Glob', 'Bash'];
  const fm = parseFrontmatter(agent);
  if (fm && fm.tools) {
    const missing = allowedAgentTools.filter((t) => !fm.tools.includes(t));
    const extra = fm.tools.filter((t) => !allowedAgentTools.includes(t));
    if (missing.length || extra.length) {
      err(
        agentFile,
        fm._line.tools || 1,
        `l\'agent deve avere esattamente i tool ${allowedAgentTools.join(', ')} (mancanti: ${missing.join(', ')}, extra: ${extra.join(', ')})`
      );
    }
  }

  if (!contains(agent, 'sessione principale')) {
    err(agentFile, 1, 'l\'agent deve dichiarare che la raccolta avviene nella sessione principale');
  }
}

if (errors.length > 0) {
  for (const e of errors) {
    console.error(e);
  }
  process.exit(1);
}

console.log('OK: skill, agente e comando della ricerca web sono conformi.');
