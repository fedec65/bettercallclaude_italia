#!/usr/bin/env node
/**
 * Standalone tests for privacy-check.js. Runs with plain `node` -- no test
 * framework dependency.
 *
 *   node bettercallclaude_italia/scripts/privacy-check.test.js
 */

'use strict';

const assert = require('node:assert');
const {
  classify,
  decide,
  resolveMode,
  isLocalTool,
  extractTextFromInput,
  extractPathHint,
  hasDiscriminator,
  isStrongCategory,
} = require('./privacy-check');

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

// ---------------------------------------------------------------------------
// classify -- strong patterns
// ---------------------------------------------------------------------------

console.log('classify: strong patterns');

t('detects segreto professionale', () => {
  assert.strictEqual(classify('Questo documento contiene segreto professionale', ''), 'segreto-professionale');
});

t('detects segreto commerciale', () => {
  assert.strictEqual(classify('Informazioni di segreto commerciale', ''), 'segreto-commerciale');
});

t('detects Art. 622 CP', () => {
  assert.strictEqual(classify('Violazione Art. 622 CP', ''), 'art-622-cp');
});

t('detects Art. 9 D.Lgs. 96/2001', () => {
  assert.strictEqual(classify('Dovere di riservatezza Art. 9 D.Lgs. 96/2001', ''), 'art-9-dlgs-96-2001');
});

t('detects attorney-client privilege', () => {
  assert.strictEqual(classify('This is attorney-client privilege material', ''), 'attorney-client-privilege');
});

t('detects work product', () => {
  assert.strictEqual(classify('Attorney work product', ''), 'work-product');
});

t('detects vincolo di riservatezza', () => {
  assert.strictEqual(classify('Soggetto a vincolo di riservatezza', ''), 'vincolo-riservatezza');
});

t('detects obbligo di riservatezza', () => {
  assert.strictEqual(classify('Informazione coperta da obbligo di riservatezza', ''), 'obbligo-riservatezza');
});

t('detects segreto istruttorio', () => {
  assert.strictEqual(classify('Protetto da segreto istruttorio', ''), 'segreto-istruttorio');
});

t('detects riservatezza professionale', () => {
  assert.strictEqual(classify('Coperto da riservatezza professionale', ''), 'riservatezza-professionale');
});

t('detects comunicazione privilegiata', () => {
  assert.strictEqual(classify('Questa e una comunicazione privilegiata', ''), 'comunicazione-privilegiata');
});

t('detects legally privileged', () => {
  assert.strictEqual(classify('This document is legally privileged', ''), 'legally-privileged');
});

t('detects privileged and confidential', () => {
  assert.strictEqual(classify('Privileged and confidential notice', ''), 'privileged-confidential');
});

t('detects Art. 200 CPP', () => {
  assert.strictEqual(classify('Art. 200 CPP tutela del testimone', ''), 'art-200-cpp');
});

t('detects Art. 103 CPP', () => {
  assert.strictEqual(classify('Art. 103 CPP garanzie del difensore', ''), 'art-103-cpp');
});

// ---------------------------------------------------------------------------
// classify -- weak patterns
// ---------------------------------------------------------------------------

console.log('classify: weak patterns');

t('weak pattern without discriminator returns null', () => {
  assert.strictEqual(classify('This is confidential', ''), null);
});

t('weak pattern with path discriminator', () => {
  assert.strictEqual(classify('This is confidential', '/client/matter-123/document.txt'), 'confidential-bare+context');
});

t('weak pattern with content discriminator', () => {
  assert.strictEqual(classify('This confidential document relates to cliente Rossi', ''), 'confidential-bare+context');
});

t('no patterns returns null', () => {
  assert.strictEqual(classify('Hello world', ''), null);
});

t('detects non divulgare with discriminator', () => {
  assert.strictEqual(classify('Documento da non divulgare relativo a cliente Rossi', ''), 'non-divulgare+context');
});

t('detects uso interno with discriminator', () => {
  assert.strictEqual(classify('Solo per uso interno dello studio legale', ''), 'uso-interno+context');
});

t('new discriminator: tribunale triggers context', () => {
  assert.strictEqual(classify('Documento riservato per il tribunale di Milano', ''), 'riservato-bare+context');
});

t('new discriminator: controparte triggers context', () => {
  assert.strictEqual(classify('Confidenziale - comunicazione con controparte', ''), 'confidenziale-bare+context');
});

// ---------------------------------------------------------------------------
// isStrongCategory
// ---------------------------------------------------------------------------

console.log('isStrongCategory');

t('strong category without +context is strong', () => {
  assert.strictEqual(isStrongCategory('segreto-professionale'), true);
});

t('weak category with +context is not strong', () => {
  assert.strictEqual(isStrongCategory('confidential-bare+context'), false);
});

// ---------------------------------------------------------------------------
// resolveMode
// ---------------------------------------------------------------------------

console.log('resolveMode');

t('defaults to balanced when no config', () => {
  assert.strictEqual(resolveMode({}), 'balanced');
});

t('reads userConfig.privacy_mode', () => {
  assert.strictEqual(resolveMode({ userConfig: { privacy_mode: 'strict' } }), 'strict');
});

t('reads user_config.privacy_mode', () => {
  assert.strictEqual(resolveMode({ user_config: { privacy_mode: 'cloud' } }), 'cloud');
});

t('case insensitive mode', () => {
  assert.strictEqual(resolveMode({ userConfig: { privacy_mode: 'STRICT' } }), 'strict');
});

t('invalid mode defaults to balanced', () => {
  assert.strictEqual(resolveMode({ userConfig: { privacy_mode: 'invalid' } }), 'balanced');
});

t('reads .privacy-mode file as fallback', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(process.cwd(), '.privacy-mode');
  try {
    fs.writeFileSync(filePath, 'strict');
    assert.strictEqual(resolveMode({}), 'strict');
  } finally {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
});

t('userConfig takes priority over .privacy-mode file', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(process.cwd(), '.privacy-mode');
  try {
    fs.writeFileSync(filePath, 'strict');
    assert.strictEqual(resolveMode({ userConfig: { privacy_mode: 'cloud' } }), 'cloud');
  } finally {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
});

t('ignores invalid .privacy-mode file content', () => {
  const fs = require('fs');
  const path = require('path');
  const filePath = path.join(process.cwd(), '.privacy-mode');
  try {
    fs.writeFileSync(filePath, 'invalid-mode');
    assert.strictEqual(resolveMode({}), 'balanced');
  } finally {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
});

t('reads .privacy-mode from data.cwd instead of process.cwd()', () => {
  const fs = require('fs');
  const path = require('path');
  const os = require('os');
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'privacy-test-'));
  const filePath = path.join(tmpDir, '.privacy-mode');
  try {
    fs.writeFileSync(filePath, 'cloud');
    assert.strictEqual(resolveMode({ cwd: tmpDir }), 'cloud');
  } finally {
    try { fs.unlinkSync(filePath); } catch (_) {}
    try { fs.rmdirSync(tmpDir); } catch (_) {}
  }
});

// ---------------------------------------------------------------------------
// decide -- balanced mode (default)
// ---------------------------------------------------------------------------

console.log('decide: balanced mode');

t('strong pattern -> ask in balanced', () => {
  const r = decide('Questo e segreto professionale', '', 'balanced');
  assert.strictEqual(r.decision, 'ask');
  assert.ok(r.reason.includes('Confermare'));
});

t('weak+context -> ask in balanced', () => {
  const r = decide('Documento confidenziale per il cliente Rossi', '', 'balanced');
  assert.strictEqual(r.decision, 'ask');
  assert.ok(r.reason.includes('Confermare'));
});

t('no match -> null in balanced', () => {
  assert.strictEqual(decide('Hello world', '', 'balanced'), null);
});

t('weak without context -> null in balanced', () => {
  assert.strictEqual(decide('This is confidential', '', 'balanced'), null);
});

// ---------------------------------------------------------------------------
// decide -- strict mode
// ---------------------------------------------------------------------------

console.log('decide: strict mode');

t('strong pattern -> deny in strict', () => {
  const r = decide('Segreto professionale qui', '', 'strict');
  assert.strictEqual(r.decision, 'deny');
  assert.ok(r.reason.includes('BLOCCATO'));
});

t('weak+context -> deny in strict (all external blocked)', () => {
  const r = decide('Documento riservato per il cliente', '', 'strict');
  assert.strictEqual(r.decision, 'deny');
  assert.ok(r.reason.includes('BLOCCATO'));
});

t('no match -> deny in strict (all external blocked)', () => {
  const r = decide('Hello world', '', 'strict');
  assert.strictEqual(r.decision, 'deny');
  assert.ok(r.reason.includes('BLOCCATO'));
});

// ---------------------------------------------------------------------------
// decide -- cloud mode
// ---------------------------------------------------------------------------

console.log('decide: cloud mode');

t('strong pattern -> ask in cloud', () => {
  const r = decide('Attorney-client privilege', '', 'cloud');
  assert.strictEqual(r.decision, 'ask');
  assert.ok(r.reason.includes('Confermare'));
});

t('weak+context -> null in cloud (ignored)', () => {
  assert.strictEqual(decide('Documento confidenziale per il cliente', '', 'cloud'), null);
});

t('no match -> null in cloud', () => {
  assert.strictEqual(decide('Hello world', '', 'cloud'), null);
});

// ---------------------------------------------------------------------------
// isLocalTool
// ---------------------------------------------------------------------------

console.log('isLocalTool');

t('mcp__ollama__classify is local', () => {
  assert.strictEqual(isLocalTool('mcp__ollama__classify'), true);
});

t('mcp__ollama__generate is local', () => {
  assert.strictEqual(isLocalTool('mcp__ollama__generate'), true);
});

t('mcp__cassazione__search is NOT local', () => {
  assert.strictEqual(isLocalTool('mcp__cassazione__search'), false);
});

t('Write is NOT local', () => {
  assert.strictEqual(isLocalTool('Write'), false);
});

t('Bash is NOT local', () => {
  assert.strictEqual(isLocalTool('Bash'), false);
});

t('empty string is NOT local', () => {
  assert.strictEqual(isLocalTool(''), false);
});

// ---------------------------------------------------------------------------
// extractTextFromInput
// ---------------------------------------------------------------------------

console.log('extractTextFromInput');

t('extracts content field', () => {
  assert.strictEqual(extractTextFromInput('Write', { content: 'hello' }), 'hello');
});

t('extracts new_string and old_string', () => {
  assert.strictEqual(extractTextFromInput('Edit', { new_string: 'a', old_string: 'b' }), 'a\nb');
});

t('extracts query field', () => {
  assert.strictEqual(extractTextFromInput('WebSearch', { query: 'search term' }), 'search term');
});

t('extracts command field (Bash)', () => {
  assert.strictEqual(extractTextFromInput('Bash', { command: 'curl http://example.com' }), 'curl http://example.com');
});

t('extracts MultiEdit edits', () => {
  const input = {
    edits: [
      { new_string: 'x', old_string: 'y' },
      { new_string: 'z' },
    ],
  };
  assert.strictEqual(extractTextFromInput('MultiEdit', input), 'x\ny\nz');
});

t('walks MCP tool input', () => {
  const text = extractTextFromInput('mcp__server__tool', { nested: { deep: 'value' } });
  assert.ok(text.includes('value'));
});

t('returns empty string for empty input', () => {
  assert.strictEqual(extractTextFromInput('Write', {}), '');
});

// ---------------------------------------------------------------------------
// extractPathHint
// ---------------------------------------------------------------------------

console.log('extractPathHint');

t('extracts file_path', () => {
  assert.strictEqual(extractPathHint({ file_path: '/tmp/test.txt' }), '/tmp/test.txt');
});

t('extracts path', () => {
  assert.strictEqual(extractPathHint({ path: '/docs/' }), '/docs/');
});

t('returns empty string when no path', () => {
  assert.strictEqual(extractPathHint({ content: 'hello' }), '');
});

// ---------------------------------------------------------------------------
// hasDiscriminator
// ---------------------------------------------------------------------------

console.log('hasDiscriminator');

t('legal path triggers discriminator', () => {
  assert.strictEqual(hasDiscriminator('', '/client/documents/contract.pdf'), true);
});

t('legal content triggers discriminator', () => {
  assert.strictEqual(hasDiscriminator('numero di pratica 12345', ''), true);
});

t('two weak patterns trigger discriminator', () => {
  assert.strictEqual(hasDiscriminator('confidential and riservato', ''), true);
});

t('tribunale triggers discriminator', () => {
  assert.strictEqual(hasDiscriminator('causa pendente presso il tribunale', ''), true);
});

t('controparte triggers discriminator', () => {
  assert.strictEqual(hasDiscriminator('comunicazione con la controparte', ''), true);
});

t('no discriminator', () => {
  assert.strictEqual(hasDiscriminator('general text', '/tmp/test.txt'), false);
});

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
