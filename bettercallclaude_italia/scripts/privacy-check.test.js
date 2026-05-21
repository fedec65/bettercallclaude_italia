const {
  classify,
  extractTextFromInput,
  extractPathHint,
  hasDiscriminator,
  STRONG_PATTERNS,
  WEAK_PATTERNS,
} = require('./privacy-check');

// ---------------------------------------------------------------------------
// classify
// ---------------------------------------------------------------------------

describe('classify', () => {
  test('detects Italian segreto professionale', () => {
    expect(classify('Questo documento contiene segreto professionale', '')).toBe('segreto-professionale');
  });

  test('detects Italian segreto commerciale', () => {
    expect(classify('Informazioni di segreto commerciale', '')).toBe('segreto-commerciale');
  });

  test('detects Art. 622 CP', () => {
    expect(classify('Violazione Art. 622 CP', '')).toBe('art-622-cp');
  });

  test('detects Art. 9 D.Lgs. 96/2001', () => {
    expect(classify('Dovere di riservatezza Art. 9 D.Lgs. 96/2001', '')).toBe('art-9-dlgs-96-2001');
  });

  test('detects attorney-client privilege', () => {
    expect(classify('This is attorney-client privileged', '')).toBe('attorney-client-privilege');
  });

  test('detects work product', () => {
    expect(classify('Attorney work product', '')).toBe('work-product');
  });

  test('weak pattern without discriminator returns null', () => {
    expect(classify('This is confidential', '')).toBeNull();
  });

  test('weak pattern with path discriminator', () => {
    expect(classify('This is confidential', '/client/matter-123/document.txt')).toBe('confidential-bare+context');
  });

  test('weak pattern with content discriminator', () => {
    expect(classify('This confidential document relates to cliente Rossi', '')).toBe('confidential-bare+context');
  });

  test('no patterns returns null', () => {
    expect(classify('Hello world', '')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractTextFromInput
// ---------------------------------------------------------------------------

describe('extractTextFromInput', () => {
  test('extracts content field', () => {
    expect(extractTextFromInput('Write', { content: 'hello' })).toBe('hello');
  });

  test('extracts new_string and old_string', () => {
    expect(extractTextFromInput('Edit', { new_string: 'a', old_string: 'b' })).toBe('a\nb');
  });

  test('extracts query field', () => {
    expect(extractTextFromInput('WebSearch', { query: 'search term' })).toBe('search term');
  });

  test('extracts MultiEdit edits', () => {
    const input = {
      edits: [
        { new_string: 'x', old_string: 'y' },
        { new_string: 'z' },
      ],
    };
    expect(extractTextFromInput('MultiEdit', input)).toBe('x\ny\nz');
  });

  test('walks MCP tool input', () => {
    expect(extractTextFromInput('mcp__server__tool', { nested: { deep: 'value' } })).toBe('value');
  });

  test('returns empty string for empty input', () => {
    expect(extractTextFromInput('Write', {})).toBe('');
  });
});

// ---------------------------------------------------------------------------
// extractPathHint
// ---------------------------------------------------------------------------

describe('extractPathHint', () => {
  test('extracts file_path', () => {
    expect(extractPathHint({ file_path: '/tmp/test.txt' })).toBe('/tmp/test.txt');
  });

  test('extracts path', () => {
    expect(extractPathHint({ path: '/docs/' })).toBe('/docs/');
  });

  test('returns empty string when no path', () => {
    expect(extractPathHint({ content: 'hello' })).toBe('');
  });
});

// ---------------------------------------------------------------------------
// hasDiscriminator
// ---------------------------------------------------------------------------

describe('hasDiscriminator', () => {
  test('legal path triggers discriminator', () => {
    expect(hasDiscriminator('', '/client/documents/contract.pdf')).toBe(true);
  });

  test('legal content triggers discriminator', () => {
    expect(hasDiscriminator('numero di pratica 12345', '')).toBe(true);
  });

  test('two weak patterns trigger discriminator', () => {
    expect(hasDiscriminator('confidential and riservato', '')).toBe(true);
  });

  test('no discriminator', () => {
    expect(hasDiscriminator('general text', '/tmp/test.txt')).toBe(false);
  });
});
