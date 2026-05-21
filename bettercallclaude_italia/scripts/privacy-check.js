#!/usr/bin/env node
/**
 * BetterCallClaude Italia Privacy Check Hook
 *
 * PreToolUse hook that detects potential attorney-client privileged content
 * (segreto professionale / Art. 622 CP, Art. 9 D.Lgs. 96/2001) across IT/EN
 * before it leaves the machine via Write, Edit, MultiEdit, WebFetch, or any MCP tool.
 *
 * Strategy:
 *   - Strong patterns (attorney-specific terms, legal article references)
 *     always trigger a permission prompt.
 *   - Weak patterns (bare "confidential", "riservato", "confidenziale")
 *     require a discriminator — a legal-context file path or
 *     another privilege marker in the content.
 *
 * Per Anthropic hooks spec, stdin is:
 *   {
 *     session_id, cwd, hook_event_name: "PreToolUse",
 *     tool_name: "Write" | "Edit" | "MultiEdit" | "WebFetch" | "mcp__<server>__<tool>" | ...,
 *     tool_input: { ... }
 *   }
 *
 * A legacy flat shape (tool input fields at the top level) is also accepted
 * as a safety net.
 *
 * Output:
 *   - stdout JSON {hookSpecificOutput:{permissionDecision:"ask", ...}}
 *     written only when privileged content is detected.
 *   - Exit code 0 in all non-error paths.
 */

'use strict';

// ---------------------------------------------------------------------------
// Entry point — reads stdin, classifies content, writes hookSpecificOutput.
// ---------------------------------------------------------------------------

function main() {
  process.stdin.setEncoding('utf8');
  let input = '';
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    let data;
    try { data = JSON.parse(input); } catch { process.exit(0); }

    const toolName = typeof data.tool_name === 'string' ? data.tool_name : '';
    const toolInput = (data.tool_input && typeof data.tool_input === 'object')
      ? data.tool_input
      : data;

    const content = extractTextFromInput(toolName, toolInput);
    const pathHint = extractPathHint(toolInput);

    if (!content.trim()) { process.exit(0); }

    const category = classify(content, pathHint);
    if (!category) { process.exit(0); }

    const reason =
      `Rilevato possibile contenuto soggetto a segreto professionale (categoria: ${category}). ` +
      'Diritto italiano: Art. 622 CP / Art. 9 D.Lgs. 96/2001. ' +
      'Confermare che questo contenuto può lasciare la macchina.';

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: reason,
      },
    }));
    process.exit(0);
  });
}

// ---------------------------------------------------------------------------
// Content extraction
// ---------------------------------------------------------------------------

function extractTextFromInput(toolName, input) {
  const parts = [];

  const scalarFields = [
    'content',
    'new_string',
    'old_string',
    'prompt',
    'query',
    'url',
    'command',
  ];
  for (const k of scalarFields) {
    if (typeof input[k] === 'string') parts.push(input[k]);
  }

  if (Array.isArray(input.edits)) {
    for (const e of input.edits) {
      if (e && typeof e === 'object') {
        if (typeof e.new_string === 'string') parts.push(e.new_string);
        if (typeof e.old_string === 'string') parts.push(e.old_string);
      }
    }
  }

  if (toolName.startsWith('mcp__')) {
    walkStrings(input, (s) => parts.push(s));
  }

  return parts.join('\n');
}

function extractPathHint(input) {
  const candidates = ['file_path', 'path', 'target_file', 'target', 'notebook_path'];
  for (const k of candidates) {
    if (typeof input[k] === 'string') return input[k];
  }
  return '';
}

function walkStrings(node, emit, depth) {
  if (depth === undefined) depth = 0;
  if (depth > 6) return;
  if (typeof node === 'string') { emit(node); return; }
  if (Array.isArray(node)) {
    for (const n of node) walkStrings(n, emit, depth + 1);
    return;
  }
  if (node && typeof node === 'object') {
    for (const v of Object.values(node)) walkStrings(v, emit, depth + 1);
  }
}

// ---------------------------------------------------------------------------
// Pattern classification
// ---------------------------------------------------------------------------

const STRONG_PATTERNS = [
  // Italian — attorney-specific
  { rx: /\bsegreto\s+professionale\b/i,                  cat: 'segreto-professionale' },
  { rx: /\bsegreto\s+commerciale\b/i,                    cat: 'segreto-commerciale' },
  { rx: /\bsegreto\s+del\s+mandato\b/i,                  cat: 'segreto-del-mandato' },
  { rx: /\bstrettamente\s+riservato\b/i,                 cat: 'strettamente-riservato' },
  { rx: /\briserbatissimo\b/i,                           cat: 'riserbatissimo' },
  { rx: /\bsegreto\s+d[' ]ufficio\b/i,                   cat: 'segreto-d-ufficio' },

  // English
  { rx: /\battorney[-\s]?client\s+privilege\b/i,        cat: 'attorney-client-privilege' },
  { rx: /\blegal\s+privilege\b/i,                        cat: 'legal-privilege' },
  { rx: /\bwork\s+product\b/i,                           cat: 'work-product' },
  { rx: /\bstrictly\s+confidential\b/i,                  cat: 'strictly-confidential' },

  // Legal article references — Italian
  { rx: /\bArt\.?\s*622\s*CP\b/i,                       cat: 'art-622-cp' },
  { rx: /\bArt\.?\s*9\s*D\.?Lgs\.?\s*96[/]2001\b/i,     cat: 'art-9-dlgs-96-2001' },
  { rx: /\bArt\.?\s*663\s*CP\b/i,                       cat: 'art-663-cp' },
];

const WEAK_PATTERNS = [
  { rx: /\briservato\b/i,          cat: 'riservato-bare' },
  { rx: /\bconfidenziale\b/i,      cat: 'confidenziale-bare' },
  { rx: /\bconfidential\b/i,       cat: 'confidential-bare' },
  { rx: /\bprivato\b/i,            cat: 'privato-bare' },
];

const DISCRIMINATOR_PATH = new RegExp(
  '(^|[\\\\/])' +
  '(cliente|clienti|client|clients|case|cases|dossier|pratica|pratiche' +
  '|causa|cause|atto|atti|privileged|matter|matters|case[-_]files)' +
  '([\\\\/.]|$)',
  'i'
);

const DISCRIMINATOR_CONTENT = new RegExp(
  '\\b(' +
  'cliente|clienti|client|mandante|mandanti' +
  '|dossier|numero\\s+di\\s+pratica|riferimento\\s+atto' +
  '|procedimento|processo|giudizio|ricorso|opposizione' +
  '|avvocato|avvocati|avvocatessa|studio\\s+legale' +
  ')\\b',
  'i'
);

function classify(content, pathHint) {
  for (const p of STRONG_PATTERNS) {
    if (p.rx.test(content)) return p.cat;
  }
  for (const p of WEAK_PATTERNS) {
    if (p.rx.test(content) && hasDiscriminator(content, pathHint)) {
      return p.cat + '+context';
    }
  }
  return null;
}

function hasDiscriminator(content, pathHint) {
  if (pathHint && DISCRIMINATOR_PATH.test(pathHint)) return true;
  if (DISCRIMINATOR_CONTENT.test(content)) return true;
  let weakHits = 0;
  for (const p of WEAK_PATTERNS) if (p.rx.test(content)) weakHits++;
  return weakHits >= 2;
}

module.exports = {
  classify,
  extractTextFromInput,
  extractPathHint,
  hasDiscriminator,
  STRONG_PATTERNS,
  WEAK_PATTERNS,
};

if (require.main === module) {
  main();
}
