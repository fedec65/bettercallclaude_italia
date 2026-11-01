#!/usr/bin/env node
/**
 * BetterCallClaude Italia Privacy Check Hook
 *
 * PreToolUse hook that detects potential attorney-client privileged content
 * (segreto professionale / Art. 622 CP, L. 247/2012, CDF Art. 13) across IT/EN
 * before it leaves the machine.
 *
 * Scan perimeter (v2.4.6): by default only network egress is scanned —
 * WebFetch, non-local MCP tools, and Bash commands with network commands
 * (curl, wget, nc, ssh, scp, rsync, git push, ...). Write/Edit/MultiEdit on
 * local files are NOT scanned because writing a local file never transmits
 * data; userConfig scan_local_writes=true restores full scanning. The NEW-2
 * privileged-path analysis stays active for every Bash command.
 * User-configured exempt folders (userConfig privacy_exempt_paths) skip the
 * check entirely.
 *
 * Modes (configurable via userConfig privacy_mode, received as the
 * CLAUDE_PLUGIN_OPTION_PRIVACY_MODE env var per the plugin spec):
 *   - strict:   Strong/weak patterns trigger DENY (blocked).
 *               Non-privileged content passes through (cloud MCP servers usable).
 *               mcp__ollama__* (and scoped mcp__plugin_*_ollama__*) is always allowed (local).
 *   - balanced: Strong patterns trigger ASK (user confirms).
 *               Weak/reference patterns with discriminator trigger ASK.
 *               No-match content passes through.
 *   - cloud:    Only strong patterns trigger ASK.
 *               Weak/reference patterns are ignored.
 *
 * The .privacy-mode file in the project directory can only RAISE severity
 * above the resolved base mode (NEW-1, generalized v2.4.6).
 *
 * Ollama exclusion: mcp__ollama__* tools (and the marketplace-scoped
 * mcp__plugin_<name>_ollama__* variants) are always allowed in all modes
 * because Ollama runs locally (localhost:11434) and never transmits data
 * externally. Remote hosts require OLLAMA_ALLOW_REMOTE=1 (see
 * mcp-servers/ollama/src/client.ts).
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

    const mode = resolveMode(data);
    const scanLocal = resolveScanLocalWrites(data);
    const exemptPaths = resolveExemptPaths(data);

    // v2.4.6: user-configured exempt folders skip the check for tool calls
    // TARGETING those folders. The session cwd deliberately does NOT exempt
    // everything: privileged content from elsewhere must still be decided on
    // (Devin PR #61). Relative targets resolve against the session cwd
    // (Devin PR #62). Target-path exemption applies to LOCAL WRITE tools
    // only: for network tools (WebFetch, mcp__*) a `path` argument names an
    // OUTPUT destination, not the source of the data being sent, so it must
    // never silence the outbound check (Devin PR #61, second review).
    const earlyPath = extractPathHint(toolInput);
    if (isLocalWriteTool(toolName) && exemptsToolPath(earlyPath, data.cwd || '', exemptPaths)) {
      process.exit(0);
    }

    // v2.4.6: default perimeter is network egress only (see shouldScanTool).
    if (!shouldScanTool(toolName, toolInput, scanLocal)) { process.exit(0); }

    const content = extractTextFromInput(toolName, toolInput);
    const pathHint = extractPathHint(toolInput);

    // NEW-2: extract file paths referenced in Bash commands and check
    // them against discriminators (curl @file, cat file | nc, etc.).
    // Relative sources resolve against the session cwd so exemption and
    // privileged-path checks see real locations (Devin PR #61 second review).
    const path = require('path');
    const cwdBase = data.cwd || process.cwd();
    const bashSources = (toolName === 'Bash' || toolName === 'bash')
      ? extractBashSourceRefs(typeof toolInput.command === 'string' ? toolInput.command : '')
        .map((r) => ({
          raw: r.raw,
          resolved: path.isAbsolute(r.raw) ? r.raw : path.join(cwdBase, r.raw),
          index: r.index,
        }))
      : [];
    const bashPaths = bashSources.map((s) => s.resolved);

    // v2.4.6: Bash uploads whose every source file lives in an exempt folder
    // (Devin PR #62, rounds 3-4): the final decision runs on the stripped
    // content without the exempt paths — inline privileged data is still
    // caught and exempt filenames do not distort the decision.
    const effective = effectiveBashInput(content, bashSources, exemptPaths);

    if (!effective.content.trim() && !effective.bashPaths.length && mode !== 'strict') { process.exit(0); }

    const result = decide(effective.content, pathHint, mode, effective.bashPaths, { toolName });
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
const MODE_SEVERITY = { cloud: 0, balanced: 1, strict: 2 };
const DEFAULT_MODE = 'balanced';

function resolveMode(data) {
  const cfg = data.userConfig || data.user_config || {};
  let base = DEFAULT_MODE;

  // v2.4.6: plugin userConfig reaches hooks as CLAUDE_PLUGIN_OPTION_<KEY>
  // env vars (per the official plugin spec); stdin userConfig is kept as a
  // fallback for hosts that pass it. Priority: env > stdin > default.
  const fromEnv = (envOption('PRIVACY_MODE') || '').toLowerCase().trim();
  const fromConfig = (typeof cfg.privacy_mode === 'string' ? cfg.privacy_mode : '').toLowerCase().trim();
  for (const candidate of [fromEnv, fromConfig]) {
    if (VALID_MODES.includes(candidate)) { base = candidate; break; }
  }

  // NEW-1 generalized: the .privacy-mode file can only RAISE severity above
  // the resolved base mode. A deposited file can never lower protection.
  try {
    const fs = require('fs');
    const path = require('path');
    const filePath = path.join(data.cwd || process.cwd(), '.privacy-mode');
    const fromFile = fs.readFileSync(filePath, 'utf8').trim().toLowerCase();
    if (VALID_MODES.includes(fromFile) && MODE_SEVERITY[fromFile] > MODE_SEVERITY[base]) {
      return fromFile;
    }
  } catch (_) { /* file not found or unreadable — use base */ }

  return base;
}

// ---------------------------------------------------------------------------
// v2.4.6: configuration helpers (env-first, per official plugin spec)
// ---------------------------------------------------------------------------

function envOption(name) {
  const v = process.env['CLAUDE_PLUGIN_OPTION_' + name];
  return typeof v === 'string' ? v : undefined;
}

function resolveScanLocalWrites(data) {
  const cfg = data.userConfig || data.user_config || {};
  let raw = envOption('SCAN_LOCAL_WRITES');
  if (raw === undefined && cfg.scan_local_writes !== undefined && cfg.scan_local_writes !== null) {
    raw = String(cfg.scan_local_writes);
  }
  if (raw === undefined || String(raw).trim() === '') return false;
  return ['1', 'true', 'yes', 'on'].includes(String(raw).trim().toLowerCase());
}

function resolveExemptPaths(data) {
  const cfg = data.userConfig || data.user_config || {};
  let raw = envOption('PRIVACY_EXEMPT_PATHS');
  if (raw === undefined && typeof cfg.privacy_exempt_paths === 'string') {
    raw = cfg.privacy_exempt_paths;
  }
  const os = require('os');
  const home = os.homedir();
  return String(raw || '')
    .split(';')
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => (p === '~' || p.startsWith('~/') || p.startsWith('~\\') ? home + p.slice(1) : p))
    .map(normalizePathForMatch);
}

// Collapses . and .. segments and unifies separators before prefix matching,
// so /exempt/../clienti/secret.txt cannot bypass the exemption (Devin PR #61).
function normalizePathForMatch(p) {
  const path = require('path');
  return path.normalize(String(p).replace(/\\/g, '/')).replace(/[\\/]+$/, '');
}

function isExemptPath(p, exemptPaths) {
  if (!p || !exemptPaths || !exemptPaths.length) return false;
  const norm = normalizePathForMatch(p);
  return exemptPaths.some((e) => norm === e || norm.startsWith(e + '/'));
}

// Resolves relative tool targets against the session cwd before exemption
// matching, so 'post.md' written while cwd is an exempt folder is exempt too
// (Devin PR #62). Bash-only check: source paths extracted from commands.
function exemptsToolPath(pathHint, cwd, exemptPaths) {
  if (!pathHint) return false;
  const path = require('path');
  const resolved = path.isAbsolute(pathHint)
    ? pathHint
    : path.join(cwd || process.cwd(), pathHint);
  return isExemptPath(resolved, exemptPaths);
}

function allPathsExempt(paths, exemptPaths) {
  return !!paths.length && paths.every((p) => isExemptPath(p, exemptPaths));
}

// Removes referenced file paths from extracted command text so exemption of
// Bash sources cannot hide privileged inline data (Devin PR #62 round 3):
// `curl --data-binary @blog/post.md -d 'segreto professionale ...'` still
// classifies on the residual content. Occurrences are replaced with a space
// (not deleted) so surrounding text is not joined into or split out of
// markers (round 5).
function stripPaths(content, paths) {
  let out = String(content || '');
  for (const p of paths) out = out.split(p).join(' ');
  return out;
}

// Removes EXACTLY the command spans the extractor attributed to exempt
// source files (by character offset), never a payload that merely repeats
// the filename — quoted or not:
//   `curl @riserbatissimo.txt -d riserbatissimo.txt` strips the file
//   reference and keeps the payload marker (Devin PR #63 rounds 2-4).
// sources: [{ raw, resolved, index }].
function stripBashSourceRefs(content, sources) {
  let out = String(content || '');
  const spans = sources
    .map((s) => ({ index: s.index, length: s.raw.length }))
    .filter((sp) => sp.index >= 0 && sp.length > 0)
    .sort((a, b) => b.index - a.index);
  for (const sp of spans) {
    out = out.slice(0, sp.index) + ' ' + out.slice(sp.index + sp.length);
  }
  return out;
}

// When every Bash source resolves into an exempt folder, the final decision
// runs on the command text with exactly the extracted file-reference spans
// removed (by offset) and without the exempt paths as discriminators: an
// exempt filename like riserbatissimo.txt must not distort the decision
// (round 4) nor erase a payload that repeats it (rounds 2 and 4).
// sources: [{ raw, resolved, index }].
function effectiveBashInput(content, sources, exemptPaths) {
  if (sources.length && sources.every((s) => isExemptPath(s.resolved, exemptPaths))) {
    return { content: stripBashSourceRefs(content, sources), bashPaths: [] };
  }
  return { content, bashPaths: sources.map((s) => s.resolved) };
}

// ---------------------------------------------------------------------------
// Local tool detection
// ---------------------------------------------------------------------------

function isLocalTool(toolName) {
  // Bare install: mcp__ollama__ollama_generate.
  // Marketplace install: mcp__plugin_bettercallclaude-italia_ollama__ollama_generate.
  return /^mcp__(?:plugin_[a-z0-9-]+_)?ollama__/i.test(toolName);
}

// ---------------------------------------------------------------------------
// v2.4.6: scan perimeter
// ---------------------------------------------------------------------------

function isLocalWriteTool(toolName) {
  return /^(Write|Edit|MultiEdit)$/.test(toolName);
}

// Bash commands able to send data off the machine (heuristic list, hardened in
// Devin PR #61/#62): direct transfer tools, git push as a subcommand in any
// form (flag/value pairs and --flag=value options, so a commit message
// containing "push" does not false-positive), GitHub CLI API calls, and
// Python -c one-liners whose QUOTED argument uses an HTTP client (quoting
// required, so "; grep requests log" after the one-liner is not flagged).
// Everything else (cat, grep, sed, redirects to local files) does not
// exfiltrate and is skipped unless scan_local_writes is on.
const NETWORK_COMMANDS =
  /\b(?:curl|wget|nc|ncat|netcat|ssh|scp|sftp|ftp|rsync|socat|telnet)\b|\bgit\b(?:\s+-[A-Za-z]+\s+[^\s|;]+|\s+--[A-Za-z-]+=[^\s|;]+)*\s+push\b|\bgh\s+api\b|\bpython[0-9.]*\b(?:\s+-[A-Za-z]+)*\s+-c\s+(?:"[^"]*\b(?:requests|httpx|urllib3?|aiohttp|http\.client)\b[^"]*"|'[^']*\b(?:requests|httpx|urllib3?|aiohttp|http\.client)\b[^']*')/i;

/**
 * Decide whether a tool call enters content scanning at all.
 * Default perimeter is network egress only: WebFetch, non-local MCP tools and
 * network-capable Bash commands are scanned; local writes are not, because
 * writing a local file never transmits data (the model already holds the
 * content). NEW-2 path analysis stays active for every Bash command.
 * Returns false also for local MCP tools (Ollama) in every configuration.
 */
function shouldScanTool(toolName, toolInput, scanLocalWrites) {
  if (isLocalTool(toolName)) return false;
  if (isLocalWriteTool(toolName)) return !!scanLocalWrites;
  if (toolName === 'Bash' || toolName === 'bash') {
    const cmd = (toolInput && typeof toolInput.command === 'string') ? toolInput.command : '';
    if (scanLocalWrites) return true;
    if (NETWORK_COMMANDS.test(cmd)) return true;
    return extractBashFilePaths(cmd).length > 0;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Decision logic
// ---------------------------------------------------------------------------

function diagnosticPrefix(toolName, mode, category, content) {
  let match = '';
  const all = STRONG_PATTERNS.concat(REFERENCE_PATTERNS, WEAK_PATTERNS);
  for (const p of all) {
    const m = p.rx.exec(content || '');
    if (m) { match = m[0]; break; }
  }
  return '[privacy-check] tool=' + (toolName || '?') +
    ' mode=' + mode +
    ' categoria=' + category +
    (match ? ' match="' + match + '"' : '') + ' — ';
}

function decide(content, pathHint, mode, bashPaths, opts) {
  const toolName = (opts && opts.toolName) || '';
  const category = classify(content, pathHint);

  // NEW-2: check if any Bash file path hits a discriminator
  const bashPathHit = (bashPaths || []).some((p) => DISCRIMINATOR_PATH.test(p));

  if (mode === 'strict') {
    // NEW-3: strict now uses pattern-based deny instead of blanket deny.
    // Content without privileged markers passes through, so the 7 cloud
    // MCP servers remain usable for non-privileged research.
    if (!category && !bashPathHit) return null;
    const prefix = diagnosticPrefix(toolName, mode, category || 'bash-privileged-path', content);
    return {
      decision: 'deny',
      reason: prefix + (bashPathHit && !category
        ? 'BLOCCATO: comando shell referenzia file in directory privilegiata. ' +
          'Modalita strict: esfiltrazione di contenuto privilegiato bloccata. ' +
          'Art. 622 CP / L. 247/2012, CDF Art. 13.'
        : `BLOCCATO: contenuto soggetto a segreto professionale (categoria: ${category}). ` +
          'Modalita strict: contenuto privilegiato non puo lasciare la macchina. ' +
          'Art. 622 CP / L. 247/2012, CDF Art. 13. ' +
          'Usare Ollama (locale) per elaborare contenuto privilegiato.'),
    };
  }

  // NEW-2: in balanced, Bash commands referencing privileged paths trigger ask
  if (bashPathHit && !category) {
    if (mode === 'cloud') return null;
    return {
      decision: 'ask',
      reason: diagnosticPrefix(toolName, mode, 'bash-privileged-path', content) +
        'Comando shell referenzia file in directory privilegiata. ' +
        'Diritto italiano: Art. 622 CP / L. 247/2012, CDF Art. 13. ' +
        'Confermare che il contenuto del file puo lasciare la macchina.',
    };
  }

  if (!category) return null;

  const prefix = diagnosticPrefix(toolName, mode, category, content);

  if (isStrongCategory(category)) {
    return {
      decision: 'ask',
      reason: prefix +
        `Rilevato contenuto soggetto a segreto professionale (categoria: ${category}). ` +
        'Diritto italiano: Art. 622 CP / L. 247/2012, CDF Art. 13. ' +
        'Confermare che questo contenuto puo lasciare la macchina.',
    };
  }

  if (mode === 'cloud') return null;

  return {
    decision: 'ask',
    reason: prefix +
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

function extractBashFilePaths(cmd) {
  return extractBashSourceRefs(cmd).map((r) => r.raw);
}

/**
 * NEW-2: extract file path references in a Bash command string, WITH their
 * character offsets. Catches: curl @file, curl --data-binary @file,
 * cat/head/tail/... arguments (one or more), input redirect < file.
 * v2.4.8 (Devin PR #61 second review): also captures RELATIVE sources
 * (./file, ../file, path/like/file, file.ext). Relative paths are resolved
 * against the session cwd by the caller. The offsets let the exemption strip
 * exactly the extracted occurrences — never a payload that merely repeats
 * the filename (quoted or not).
 */
// Replaces the CONTENT of quoted spans with spaces (keeping the quote
// characters and the total length), so regex extraction never matches inside
// quoted payloads: `curl -d "cat /tmp/blog/riserbatissimo.txt"` must not
// treat the payload text as a file reference (Devin PR #63 round 5).
// Escaped characters are handled (\" inside a quoted span does not close
// it), otherwise a later unquoted upload would be hidden (round 6).
// Offsets are preserved 1:1 with the original string.
function maskQuotedSpans(cmd) {
  const s = String(cmd || '');
  let out = '';
  let quote = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (quote) {
      // Backslash escapes apply ONLY inside double quotes; in single quotes
      // it is literal content, so a trailing \' closes the quote normally
      // and a later upload must not be masked (Devin PR #63 round 7).
      if (quote === '"' && ch === '\\' && i + 1 < s.length) {
        out += '  ';
        i++;
      } else if (ch === quote) {
        quote = null;
        out += ch;
      } else {
        out += ' ';
      }
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
    } else if (ch === '\\' && i + 1 < s.length) {
      out += ch + s[i + 1];
      i++;
    } else {
      out += ch;
    }
  }
  return out;
}

function extractBashSourceRefs(cmd) {
  const refs = [];
  const REL = '(?:(?:\\/|\\.\\.?\\/)[^\\s;|&"\']+|(?!https?:\\/\\/|w{3}\\.)[^\\s;|&"\'/-]*(?:\\.|\\/)[^\\s;|&"\']+)';
  const relTest = new RegExp('^(?:' + REL + ')$');
  const patterns = [
    // curl @file or curl --data-binary @file (absolute, ./relative, file.ext)
    { rx: new RegExp('@(' + REL + ')', 'g'), many: false },
    // input redirect: < /path/to/file (or relative)
    { rx: new RegExp('<\\s*(' + REL + ')', 'g'), many: false },
    // cat, head, tail, ... followed by one or more paths (absolute or relative)
    { rx: new RegExp('\\b(?:cat|head|tail|less|base64|xxd|strings|file|wc)((?:\\s+(?:' + REL + '))+)', 'g'), many: true },
  ];
  const masked = maskQuotedSpans(cmd)
    // curl --data-raw sends the @ argument LITERALLY (@ has no special
    // meaning there), so it must not be extracted as a file source — the
    // literal text is outbound data and its markers must classify (Devin
    // PR #61 third review). The mask stops at command separators (;|&) so
    // a following `cat /privileged/...` is still extracted, tolerates
    // multiple spaces/tabs and =, and never eats a longer flag name.
    .replace(/(?<![A-Za-z0-9_./-])--data-raw(?:[ \t=]+[^\s;|&]*)?(?![A-Za-z-])/g, (m) => ' '.repeat(m.length));
  for (const { rx, many } of patterns) {
    let m;
    while ((m = rx.exec(masked)) !== null) {
      if (many) {
        const run = m[1];
        const runStart = m.index + m[0].indexOf(run);
        let from = 0;
        for (const tok of run.trim().split(/\s+/)) {
          const i = run.indexOf(tok, from);
          if (i === -1) break;
          from = i + tok.length;
          if (relTest.test(tok)) refs.push({ raw: tok, index: runStart + i });
        }
      } else {
        const raw = m[1];
        refs.push({ raw, index: m.index + m[0].indexOf(raw) });
      }
    }
  }
  return refs;
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
  { rx: /\bsegreto\s+del\s+mandato\b/i,                  cat: 'segreto-del-mandato' },
  { rx: /\bstrettamente\s+riservato\b/i,                 cat: 'strettamente-riservato' },
  { rx: /\briserbatissimo\b/i,                           cat: 'riserbatissimo' },
  { rx: /\bsegreto\s+d[' ]ufficio\b/i,                   cat: 'segreto-d-ufficio' },
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
];

// ---------------------------------------------------------------------------
// Reference patterns (weak) -- v2.4.6
// Norm citations and contract boilerplate appear routinely in acts, opinions
// and articles: citing the secrecy norm is not breaching secrecy. They only
// count together with a client/case discriminator, same weight as WEAK.
// ---------------------------------------------------------------------------

const REFERENCE_PATTERNS = [
  { rx: /\bsegreto\s+commerciale\b/i,                    cat: 'segreto-commerciale' },
  { rx: /\bvincolo\s+(?:di\s+)?riservatezza\b/i,         cat: 'vincolo-riservatezza' },
  { rx: /\bobbligo\s+di\s+riservatezza\b/i,              cat: 'obbligo-riservatezza' },
  { rx: /\bArt\.?\s*622\s*C\.?\s*P\.?\b/i,               cat: 'art-622-cp' },
  { rx: /\bL\.?\s*247[/]2012\b/i,                        cat: 'l-247-2012' },
  { rx: /\bCDF\s+Art\.?\s*13\b/i,                        cat: 'cdf-art-13' },
  { rx: /\bCDF\s+Art\.?\s*28\b/i,                        cat: 'cdf-art-28' },
  { rx: /\bArt\.?\s*663\s*C\.?\s*P\.?\b/i,               cat: 'art-663-cp' },
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

// v2.4.6: narrowed to client/case-identifying terms. Generic legal vocabulary
// (avvocato, giudice, tribunale, ricorso, ...) is present in virtually every
// legal text, so weak patterns fired everywhere.
const DISCRIMINATOR_CONTENT = new RegExp(
  '\\b(' +
  'cliente|clienti|client|mandante|mandanti' +
  '|dossier|numero\\s+di\\s+pratica|riferimento\\s+atto' +
  '|parte\\s+avversa|controparte' +
  ')\\b',
  'i'
);

function classify(content, pathHint) {
  for (const p of STRONG_PATTERNS) {
    if (p.rx.test(content)) return p.cat;
  }
  for (const p of REFERENCE_PATTERNS) {
    if (p.rx.test(content) && hasDiscriminator(content, pathHint)) {
      return p.cat + '+context';
    }
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
  for (const p of REFERENCE_PATTERNS) if (p.rx.test(content)) weakHits++;
  return weakHits >= 2;
}

module.exports = {
  classify,
  decide,
  resolveMode,
  resolveScanLocalWrites,
  resolveExemptPaths,
  isExemptPath,
  exemptsToolPath,
  allPathsExempt,
  stripPaths,
  stripBashSourceRefs,
  effectiveBashInput,
  envOption,
  isLocalTool,
  isLocalWriteTool,
  shouldScanTool,
  NETWORK_COMMANDS,
  extractTextFromInput,
  extractPathHint,
  extractBashFilePaths,
  extractBashSourceRefs,
  hasDiscriminator,
  isStrongCategory,
  STRONG_PATTERNS,
  REFERENCE_PATTERNS,
  WEAK_PATTERNS,
  MODE_SEVERITY,
};

if (require.main === module) {
  main();
}
