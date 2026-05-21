#!/usr/bin/env node
/**
 * Standalone tests for privacy-check.js. Runs with plain `node` — no test
 * framework dependency.
 *
 *   node bettercallclaude_italia/scripts/privacy-check.test.js
 */

'use strict';

const assert = require('node:assert');
const {
  classify,
  extractTextFromInput,
  extractPathHint,
  hasDiscriminator,
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
// classify — strong patterns
// ---------------------------------------------------------------------------

console.log('privacy-check: strong patterns');

t('detects Italian segreto professionale', () => {
  assert.strictEqual(classify('Questo documento contiene segreto professionale', ''), 'segreto-professionale');
});

t('detects Italian segreto commerciale', () => {
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

// ---------------------------------------------------------------------------
// classify — weak patterns
// ---------------------------------------------------------------------------

console.log('privacy-check: weak patterns (no discriminator)');

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

// ---------------------------------------------------------------------------
// extractTextFromInput
// ---------------------------------------------------------------------------

console.log('privacy-check: extractTextFromInput');

t('extracts content field', () => {
  assert.strictEqual(extractTextFromInput('Write', { content: 'hello' }), 'hello');
});

t('extracts new_string and old_string', () => {
  assert.strictEqual(extractTextFromInput('Edit', { new_string: 'a', old_string: 'b' }), 'a\nb');
});

t('extracts query field', () => {
  assert.strictEqual(extractTextFromInput('WebSearch', { query: 'search term' }), 'search term');
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

console.log('privacy-check: extractPathHint');

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

console.log('privacy-check: hasDiscriminator');

t('legal path triggers discriminator', () => {
  assert.strictEqual(hasDiscriminator('', '/client/documents/contract.pdf'), true);
});

t('legal content triggers discriminator', () => {
  assert.strictEqual(hasDiscriminator('numero di pratica 12345', ''), true);
});

t('two weak patterns trigger discriminator', () => {
  assert.strictEqual(hasDiscriminator('confidential and riservato', ''), true);
});

t('no discriminator', () => {
  assert.strictEqual(hasDiscriminator('general text', '/tmp/test.txt'), false);
});

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
