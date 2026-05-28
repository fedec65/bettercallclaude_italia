#!/usr/bin/env node
/**
 * BetterCallClaude Italia Privacy Check Hook
 *
 * PreToolUse hook that detects potential attorney-client privileged content
 * (segreto professionale / Art. 622 CP, L. 247/2012, CDF Art. 13) across IT/EN
 * before it leaves the machine via Write, Edit, MultiEdit, WebFetch, Bash,
 * or any MCP tool.
 *
 * Modes (configurable via userConfig.privacy_mode):
 *   - strict:   All outbound tool calls are DENIED (blocked),
 *               EXCEPT mcp__ollama__* which is local and always allowed.
 *   - balanced: Strong patterns trigger ASK (user confirms).
 *               Weak patterns with discriminator trigger ASK.
 *               No-match content passes through.
 *   - cloud:    Only strong patterns trigger ASK.
 *               Weak patterns are ignored.
 *
 * Ollama exclusion: mcp__ollama__* tools are always allowed in all modes
 * because Ollama runs locally (localhost:11434) and never transmits data
 * externally.
 *
 * Per Anthropic hooks spec, stdin is:
 *   {
 *     session_id, cwd, hook_event_name: "PreToolUse",
 *     tool_name: "Write" | "Edit" | "MultiEdit" | "WebFetch" | "Bash" | "mcp__*",
 *     tool_input: { ... },
 *     userConfig: { privacy_mode: "strict" | "balanced" | "cloud" }
 *   }
 *
 * Output:
 *   - stdout JSON with permissionDecision: "deny" | "ask" | (nothing).
 *   - Exit code 0 in all non-error paths.
 */

'use strict';

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main() {
  process.stdin.setEncoding('utf8');
  let input = '';
  process.stdin.on('data', (chunk) => { input += chunk; });
  process.stdin.on('end', () => {
    let data;
    try {
      data = JSON.parse(input);
    } catch {
      process.stdout.write(JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: 'Privacy hook: input non parsabile, blocco preventivo (fail-closed).',
        },
      }));
      process.exit(0);
    }

    const toolName = typeof data.tool_name === 'string' ? data.tool_name : '';
    const toolInput = (data.tool_input && typeof data.tool_input === 'object')
      ? data.tool_input
      : data;

    if (isLocalTool(toolName)) { process.exit(0); }

    const mode = resolveMode(data);
    const content = extractTextFromInput(toolName, toolInput);
    const pathHint = extractPathHint(toolInput);

    if (!content.trim() && mode !== 'strict') { process.exit(0); }

    const result = decide(content, pathHint, mode);
    if (!result) { process.exit(0); }

    process.stdout.write(JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: result.decision,
        permissionDecisionReason: result.reason,
      },
    }));
    process.exit(0);
  });
}

// ---------------------------------------------------------------------------
// Mode resolution
// ---------------------------------------------------------------------------

const VALID_MODES = ['strict', 'balanced', 'cloud'];

function resolveMode(data) {
  const cfg = data.userConfig || data.user_config || {};
  const fromConfig = (typeof cfg.privacy_mode === 'string' ? cfg.privacy_mode : '').toLowerCase().trim();
  if (VALID_MODES.includes(fromConfig)) return fromConfig;

  // Fallback: read .privacy-mode file from CWD (written by /privacy command)
  try {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(data.cwd || process.cwd(), '.privacy-mode');
    const fromFile = fs.readFileSync(filePath, 'utf8').trim().toLowerCase();
    if (VALID_MODES.includes(fromFile)) return fromFile;
  } catch (_) { /* file not found or unreadable — use default */ }

  return 'balanced';
}

// ---------------------------------------------------------------------------
// Local tool detection
// ---------------------------------------------------------------------------

function isLocalTool(toolName) {
  return /^mcp__ollama__/i.test(toolName);
}

// ---------------------------------------------------------------------------
// Decision logic
// ---------------------------------------------------------------------------

function decide(content, pathHint, mode) {
  const category = classify(content, pathHint);

  if (mode === 'strict') {
    return {
      decision: 'deny',
      reason: category
        ? `BLOCCATO: contenuto soggetto a segreto professionale (categoria: ${category}). ` +
          'Modalita strict: tutte le chiamate esterne sono bloccate. ' +
          'Usare Ollama (locale) per elaborare contenuto privilegiato.'
        : 'BLOCCATO: modalita strict attiva. Tutte le chiamate esterne sono bloccate. ' +
          'Art. 622 CP / L. 247/2012, CDF Art. 13. ' +
          'Usare Ollama (locale) per elaborare contenuto privilegiato.',
    };
  }

  if (!category) return null;

  if (isStrongCategory(category)) {
    return {
      decision: 'ask',
      reason:
        `Rilevato contenuto soggetto a segreto professionale (categoria: ${category}). ` +
        'Diritto italiano: Art. 622 CP / L. 247/2012, CDF Art. 13. ' +
        'Confermare che questo contenuto puo lasciare la macchina.',
    };
  }

  if (mode === 'cloud') return null;

  return {
    decision: 'ask',
    reason:
      `Rilevato possibile contenuto soggetto a segreto professionale (categoria: ${category}). ` +
      'Diritto italiano: Art. 622 CP / L. 247/2012, CDF Art. 13. ' +
      'Confermare che questo contenuto puo lasciare la macchina.',
  };
}

function isStrongCategory(category) {
  return !category.endsWith('+context');
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
  // Italian -- attorney-specific
  { rx: /\bsegreto\s+professionale\b/i,                  cat: 'segreto-professionale' },
  { rx: /\bsegreto\s+commerciale\b/i,                    cat: 'segreto-commerciale' },
  { rx: /\bsegreto\s+del\s+mandato\b/i,                  cat: 'segreto-del-mandato' },
  { rx: /\bstrettamente\s+riservato\b/i,                 cat: 'strettamente-riservato' },
  { rx: /\briserbatissimo\b/i,                           cat: 'riserbatissimo' },
  { rx: /\bsegreto\s+d[' ]ufficio\b/i,                   cat: 'segreto-d-ufficio' },
  { rx: /\bvincolo\s+(?:di\s+)?riservatezza\b/i,         cat: 'vincolo-riservatezza' },
  { rx: /\bobbligo\s+di\s+riservatezza\b/i,              cat: 'obbligo-riservatezza' },
  { rx: /\bsegreto\s+istruttorio\b/i,                    cat: 'segreto-istruttorio' },
  { rx: /\bsegreto\s+investigativo\b/i,                  cat: 'segreto-investigativo' },
  { rx: /\briservatezza\s+professionale\b/i,             cat: 'riservatezza-professionale' },
  { rx: /\btutela\s+del\s+segreto\b/i,                   cat: 'tutela-del-segreto' },
  { rx: /\bcomunicazion[ei]\s+privilegiat[aei]\b/i,        cat: 'comunicazione-privilegiata' },

  // English
  { rx: /\battorney[-\s]?client\s+privilege\b/i,        cat: 'attorney-client-privilege' },
  { rx: /\blegal\s+privilege\b/i,                        cat: 'legal-privilege' },
  { rx: /\bwork\s+product\b/i,                           cat: 'work-product' },
  { rx: /\bstrictly\s+confidential\b/i,                  cat: 'strictly-confidential' },
  { rx: /\blegal(?:ly)?\s+privileged\b/i,                cat: 'legally-privileged' },
  { rx: /\bprivileged\s+(?:and\s+)?confidential\b/i,     cat: 'privileged-confidential' },
  { rx: /\bprotected\s+by\s+(?:legal\s+)?privilege\b/i,  cat: 'protected-by-privilege' },

  // Legal article references -- Italian
  { rx: /\bArt\.?\s*622\s*C\.?\s*P\.?\b/i,                cat: 'art-622-cp' },
  { rx: /\bL\.?\s*247[/]2012\b/i,                        cat: 'l-247-2012' },
  { rx: /\bCDF\s+Art\.?\s*13\b/i,                         cat: 'cdf-art-13' },
  { rx: /\bCDF\s+Art\.?\s*28\b/i,                         cat: 'cdf-art-28' },
  { rx: /\bArt\.?\s*663\s*C\.?\s*P\.?\b/i,                cat: 'art-663-cp' },
  { rx: /\bArt\.?\s*200\s*C\.?\s*P\.?\s*P\.?\b/i,        cat: 'art-200-cpp' },
  { rx: /\bArt\.?\s*103\s*C\.?\s*P\.?\s*P\.?\b/i,        cat: 'art-103-cpp' },
];

const WEAK_PATTERNS = [
  { rx: /\briservato\b/i,          cat: 'riservato-bare' },
  { rx: /\bconfidenziale\b/i,      cat: 'confidenziale-bare' },
  { rx: /\bconfidential\b/i,       cat: 'confidential-bare' },
  { rx: /\bprivato\b/i,            cat: 'privato-bare' },
  { rx: /\bnon\s+divulgare\b/i,    cat: 'non-divulgare' },
  { rx: /\buso\s+interno\b/i,      cat: 'uso-interno' },
];

const DISCRIMINATOR_PATH = new RegExp(
  '(^|[\\\\/])' +
  '(cliente|clienti|client|clients|case|cases|dossier|pratica|pratiche' +
  '|causa|cause|atto|atti|privileged|matter|matters|case[-_]files|fascicoli|fascicolo)' +
  '([\\\\/.]|$)',
  'i'
);

const DISCRIMINATOR_CONTENT = new RegExp(
  '\\b(' +
  'cliente|clienti|client|mandante|mandanti' +
  '|dossier|numero\\s+di\\s+pratica|riferimento\\s+atto' +
  '|procedimento|processo|giudizio|ricorso|opposizione' +
  '|avvocato|avvocati|avvocatessa|studio\\s+legale' +
  '|tribunale|corte|giudice|parte\\s+avversa|controparte' +
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
  decide,
  resolveMode,
  isLocalTool,
  extractTextFromInput,
  extractPathHint,
  hasDiscriminator,
  isStrongCategory,
  STRONG_PATTERNS,
  WEAK_PATTERNS,
};

if (require.main === module) {
  main();
}
