#!/usr/bin/env node
/**
 * Plugin validator for BetterCallClaude Italia
 * Checks marketplace.json, plugin.json, and .mcp.json schemas
 */

const fs = require('fs');
const path = require('path');

const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function readJSON(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    errors.push(`Cannot read/parse ${filePath}: ${err.message}`);
    return null;
  }
}

console.log('🔍 Validating BetterCallClaude Italia plugin...\n');

// 1. Validate marketplace.json
const marketplace = readJSON('.claude-plugin/marketplace.json');
if (marketplace) {
  assert(marketplace.name, 'marketplace.json: missing "name"');
  assert(marketplace.plugins && Array.isArray(marketplace.plugins), 'marketplace.json: missing "plugins" array');
  assert(marketplace.plugins.length > 0, 'marketplace.json: plugins array is empty');

  const plugin = marketplace.plugins[0];
  assert(plugin.name, 'marketplace.json plugin: missing "name"');
  assert(plugin.version, 'marketplace.json plugin: missing "version"');
  assert(plugin.source, 'marketplace.json plugin: missing "source"');
  assert(plugin.source.startsWith('./'), 'marketplace.json plugin: "source" must start with "./"');
  assert(plugin.repository, 'marketplace.json plugin: missing "repository"');
  assert(plugin.license, 'marketplace.json plugin: missing "license"');

  console.log(`  ✅ marketplace.json — ${plugin.name} v${plugin.version}`);
}

// 2. Validate plugin.json
const pluginJson = readJSON('bettercallclaude_italia/.claude-plugin/plugin.json');
if (pluginJson) {
  assert(pluginJson.name, 'plugin.json: missing "name"');
  assert(pluginJson.version, 'plugin.json: missing "version"');
  assert(pluginJson.description, 'plugin.json: missing "description"');

  console.log(`  ✅ plugin.json — ${pluginJson.name} v${pluginJson.version}`);
}

// 3. Validate .mcp.json
const mcpJson = readJSON('bettercallclaude_italia/.mcp.json');
if (mcpJson) {
  assert(mcpJson.mcpServers, '.mcp.json: missing "mcpServers"');
  const servers = Object.keys(mcpJson.mcpServers);
  assert(servers.length > 0, '.mcp.json: no MCP servers defined');

  for (const [name, config] of Object.entries(mcpJson.mcpServers)) {
    if (config.url) {
      assert(!config.url.includes('${user_config.'), `.mcp.json server "${name}": "url" must not contain \${user_config.*} (Cowork validation will fail)`);
    }
  }

  console.log(`  ✅ .mcp.json — ${servers.length} MCP server(s)`);
}

// 4. Validate package.json root
const packageJson = readJSON('package.json');
if (packageJson) {
  assert(packageJson.version, 'package.json: missing "version"');
  console.log(`  ✅ package.json — v${packageJson.version}`);
}

// 5. Version alignment
if (marketplace && pluginJson && packageJson) {
  const mv = marketplace.plugins[0].version;
  const pv = pluginJson.version;
  const pkgv = packageJson.version;

  if (mv === pv && pv === pkgv) {
    console.log(`  ✅ Version alignment — ${pkgv}`);
  } else {
    errors.push(`Version mismatch: marketplace=${mv}, plugin=${pv}, package=${pkgv}`);
  }
}

// 6. Check source directory exists
if (marketplace && marketplace.plugins[0].source) {
  const srcDir = marketplace.plugins[0].source.replace(/^\.\//, '');
  assert(fs.existsSync(srcDir), `Source directory "${srcDir}" does not exist`);
  console.log(`  ✅ Source directory — ${srcDir}`);
}

// 7. Check critical files exist in plugin directory
const criticalFiles = [
  'bettercallclaude_italia/.claude-plugin/plugin.json',
  'bettercallclaude_italia/.mcp.json',
  'bettercallclaude_italia/agents',
  'bettercallclaude_italia/commands',
  'bettercallclaude_italia/skills',
];

for (const file of criticalFiles) {
  assert(fs.existsSync(file), `Critical file missing: ${file}`);
}
console.log(`  ✅ Critical plugin files present`);

// 8. Skill frontmatter limits (Claude rejects skills whose description > 1024 chars,
//    which silently breaks marketplace sync in Cowork Desktop)
const SKILL_DESC_MAX = 1024;
const skillsDir = 'bettercallclaude_italia/skills';
if (fs.existsSync(skillsDir)) {
  let skillCount = 0;
  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;
    skillCount++;
    const content = fs.readFileSync(skillFile, 'utf-8');
    const fmEnd = content.indexOf('---', 3);
    const fm = fmEnd > 0 ? content.slice(3, fmEnd) : '';
    const descMatch = fm.match(/^description:\s*"?([\s\S]*?)"?\s*$/m);
    const desc = descMatch ? descMatch[1] : '';
    assert(desc.length > 0, `skill "${entry.name}": missing "description" in SKILL.md frontmatter`);
    assert(
      desc.length <= SKILL_DESC_MAX,
      `skill "${entry.name}": description is ${desc.length} chars (max ${SKILL_DESC_MAX}) — over-long descriptions break marketplace sync`
    );
  }
  console.log(`  ✅ Skill descriptions within ${SKILL_DESC_MAX}-char limit (${skillCount} skills)`);
}

console.log('');

if (errors.length > 0) {
  console.error(`❌ Validation failed with ${errors.length} error(s):\n`);
  errors.forEach(e => console.error(`  • ${e}`));
  process.exit(1);
} else {
  console.log('🎉 All validations passed! Plugin is ready for release.\n');
  process.exit(0);
}
