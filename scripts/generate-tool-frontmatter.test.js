#!/usr/bin/env node
/**
 * Test per scripts/generate-tool-frontmatter.js.
 *
 * Verifica che le TOOL_EXCEPTIONS per la ricerca web su portali protetti
 * vengano applicate correttamente anche quando path.relative restituisce
 * separatori in stile Windows.
 */

'use strict';

const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const GENERATOR = path.join(ROOT, 'scripts', 'generate-tool-frontmatter.js');

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

function cleanup() {
  for (const dir of tempDirs) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
      // Best-effort.
    }
  }
}

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bcc-frontmatter-'));
  tempDirs.push(dir);

  const skill = [
    '---',
    'name: legal-web-research',
    'description: "Ricerca web su portali protetti."',
    '---',
    '',
    '# Ricerca web',
    '',
    'Usa solo Read, Grep, Glob, Bash.',
    '',
  ].join('\n');

  const command = [
    '---',
    'description: "Comando ricerca web."',
    '---',
    '',
    '# /ricerca-web',
    '',
    'Usa Read, Grep, Glob, Bash, Task.',
    '',
  ].join('\n');

  const otherCommand = [
    '---',
    'description: "Altro comando."',
    '---',
    '',
    '# /altro',
    '',
    'Usa normattiva_search.',
    '',
  ].join('\n');

  fs.mkdirSync(path.join(dir, 'bettercallclaude_italia', 'skills', 'legal-web-research'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'bettercallclaude_italia', 'agents'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'bettercallclaude_italia', 'commands'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'bettercallclaude_italia', 'skills', 'legal-web-research', 'SKILL.md'), skill, 'utf8');
  fs.writeFileSync(path.join(dir, 'bettercallclaude_italia', 'commands', 'ricerca-web.md'), command, 'utf8');
  fs.writeFileSync(path.join(dir, 'bettercallclaude_italia', 'commands', 'altro.md'), otherCommand, 'utf8');

  return dir;
}

function runGenerator(pluginDir, windowsPaths = false) {
  const args = [GENERATOR, '--apply'];
  if (windowsPaths) {
    args.unshift('--require', path.join(ROOT, 'scripts', 'mock-windows-path.js'));
  }
  try {
    const out = execFileSync('node', args, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: ROOT,
      env: {
        ...process.env,
        BCC_GENERATOR_PLUGIN_DIR: pluginDir,
      },
    });
    return { code: 0, output: out };
  } catch (e) {
    const output = String(e.stdout || '') + String(e.stderr || '');
    return { code: e.status === undefined ? 1 : e.status, output };
  }
}

function readTools(file) {
  const content = fs.readFileSync(file, 'utf8');
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return [];
  const tools = [];
  let inTools = false;
  for (const line of match[1].split(/\r?\n/)) {
    if (/^tools:\s*$/.test(line)) {
      inTools = true;
      continue;
    }
    if (inTools) {
      const m = line.match(/^\s+-\s+(\S+)\s*$/);
      if (m) {
        tools.push(m[1]);
        continue;
      }
      if (/^\S/.test(line)) inTools = false;
    }
  }
  return tools;
}

console.log('generate-tool-frontmatter: eccezioni ricerca web');

t('applica le eccezioni su path POSIX', () => {
  const dir = fixture();
  const r = runGenerator(dir);
  assert.strictEqual(r.code, 0, 'output:\n' + r.output);

  const skillTools = readTools(path.join(dir, 'bettercallclaude_italia', 'skills', 'legal-web-research', 'SKILL.md'));
  const commandTools = readTools(path.join(dir, 'bettercallclaude_italia', 'commands', 'ricerca-web.md'));
  const otherTools = readTools(path.join(dir, 'bettercallclaude_italia', 'commands', 'altro.md'));

  assert.deepStrictEqual(skillTools.sort(), ['Read', 'Grep', 'Glob', 'Bash'].sort(), 'skill tools: ' + JSON.stringify(skillTools));
  assert.deepStrictEqual(commandTools.sort(), ['Read', 'Grep', 'Glob', 'Bash', 'Task'].sort(), 'command tools: ' + JSON.stringify(commandTools));
  assert.ok(otherTools.includes('mcp__plugin_bettercallclaude-italia_normattiva__normattiva_search'), 'altro deve avere tool MCP: ' + JSON.stringify(otherTools));
});

t('applica le eccezioni anche con path Windows (backslash)', () => {
  const dir = fixture();
  const r = runGenerator(dir, true);
  assert.strictEqual(r.code, 0, 'output:\n' + r.output);

  const skillTools = readTools(path.join(dir, 'bettercallclaude_italia', 'skills', 'legal-web-research', 'SKILL.md'));
  const commandTools = readTools(path.join(dir, 'bettercallclaude_italia', 'commands', 'ricerca-web.md'));

  assert.deepStrictEqual(skillTools.sort(), ['Read', 'Grep', 'Glob', 'Bash'].sort(), 'skill tools (windows paths): ' + JSON.stringify(skillTools));
  assert.deepStrictEqual(commandTools.sort(), ['Read', 'Grep', 'Glob', 'Bash', 'Task'].sort(), 'command tools (windows paths): ' + JSON.stringify(commandTools));
});

cleanup();

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
