/**
 * Italian Legal Privacy Classifier
 *
 * Implements the same privacy detection patterns as the BetterCallClaude
 * Italia privacy hook (scripts/privacy-check.js) for Art. 622 CP /
 * L. 247/2012 (segreto professionale) compliance.
 *
 * Works entirely offline — no Ollama or network required.
 * PRIVILEGED patterns are checked before CONFIDENTIAL so that
 * "strettamente riservato" is not downgraded by a bare "riservato",
 * and weak patterns only count when a legal-context discriminator
 * is present (same semantics as the hook's classify()).
 */

import type { PrivacyLevel, PatternMatch, ClassificationResult } from './types.js';

interface PatternDef {
  regex: RegExp;
  meaning: string;
  language: 'it' | 'en' | 'legal';
  level: PrivacyLevel;
}

// ---------------------------------------------------------------------------
// PRIVILEGED patterns (strong, checked first) — mirrors hook STRONG_PATTERNS
// ---------------------------------------------------------------------------

const PRIVILEGED_PATTERNS: PatternDef[] = [
  // Italian -- attorney-specific
  { regex: /\bsegreto\s+professionale\b/i, meaning: 'Segreto professionale', language: 'it', level: 'PRIVILEGED' },
  { regex: /\bsegreto\s+commerciale\b/i, meaning: 'Segreto commerciale', language: 'it', level: 'PRIVILEGED' },
  { regex: /\bsegreto\s+del\s+mandato\b/i, meaning: 'Segreto del mandato', language: 'it', level: 'PRIVILEGED' },
  { regex: /\bstrettamente\s+riservato\b/i, meaning: 'Strettamente riservato', language: 'it', level: 'PRIVILEGED' },
  { regex: /\briserbatissimo\b/i, meaning: 'Riserbatissimo', language: 'it', level: 'PRIVILEGED' },
  { regex: /\bsegreto\s+d[' ]ufficio\b/i, meaning: "Segreto d'ufficio", language: 'it', level: 'PRIVILEGED' },
  { regex: /\bvincolo\s+(?:di\s+)?riservatezza\b/i, meaning: 'Vincolo di riservatezza', language: 'it', level: 'PRIVILEGED' },
  { regex: /\bobbligo\s+di\s+riservatezza\b/i, meaning: 'Obbligo di riservatezza', language: 'it', level: 'PRIVILEGED' },
  { regex: /\bsegreto\s+istruttorio\b/i, meaning: 'Segreto istruttorio', language: 'it', level: 'PRIVILEGED' },
  { regex: /\bsegreto\s+investigativo\b/i, meaning: 'Segreto investigativo', language: 'it', level: 'PRIVILEGED' },
  { regex: /\briservatezza\s+professionale\b/i, meaning: 'Riservatezza professionale', language: 'it', level: 'PRIVILEGED' },
  { regex: /\btutela\s+del\s+segreto\b/i, meaning: 'Tutela del segreto', language: 'it', level: 'PRIVILEGED' },
  { regex: /\bcomunicazion[ei]\s+privilegiat[aei]\b/i, meaning: 'Comunicazione privilegiata', language: 'it', level: 'PRIVILEGED' },

  // English
  { regex: /\battorney[-\s]?client\s+privilege\b/i, meaning: 'Attorney-client privilege', language: 'en', level: 'PRIVILEGED' },
  { regex: /\blegal\s+privilege\b/i, meaning: 'Legal privilege', language: 'en', level: 'PRIVILEGED' },
  { regex: /\bwork\s+product\b/i, meaning: 'Work product', language: 'en', level: 'PRIVILEGED' },
  { regex: /\bstrictly\s+confidential\b/i, meaning: 'Strictly confidential', language: 'en', level: 'PRIVILEGED' },
  { regex: /\blegal(?:ly)?\s+privileged\b/i, meaning: 'Legally privileged', language: 'en', level: 'PRIVILEGED' },
  { regex: /\bprivileged\s+(?:and\s+)?confidential\b/i, meaning: 'Privileged and confidential', language: 'en', level: 'PRIVILEGED' },
  { regex: /\bprotected\s+by\s+(?:legal\s+)?privilege\b/i, meaning: 'Protected by privilege', language: 'en', level: 'PRIVILEGED' },

  // Legal article references -- Italian
  { regex: /\bArt\.?\s*622\s*C\.?\s*P\.?\b/i, meaning: 'Art. 622 CP (segreto professionale)', language: 'legal', level: 'PRIVILEGED' },
  { regex: /\bL\.?\s*247[/]2012\b/i, meaning: 'L. 247/2012 (forensi)', language: 'legal', level: 'PRIVILEGED' },
  { regex: /\bCDF\s+Art\.?\s*13\b/i, meaning: 'CDF Art. 13', language: 'legal', level: 'PRIVILEGED' },
  { regex: /\bCDF\s+Art\.?\s*28\b/i, meaning: 'CDF Art. 28', language: 'legal', level: 'PRIVILEGED' },
  { regex: /\bArt\.?\s*663\s*C\.?\s*P\.?\b/i, meaning: 'Art. 663 CP', language: 'legal', level: 'PRIVILEGED' },
  { regex: /\bArt\.?\s*200\s*C\.?\s*P\.?\s*P\.?\b/i, meaning: 'Art. 200 CPP (segreto testimonianza)', language: 'legal', level: 'PRIVILEGED' },
  { regex: /\bArt\.?\s*103\s*C\.?\s*P\.?\s*P\.?\b/i, meaning: 'Art. 103 CPP (garanzie difensore)', language: 'legal', level: 'PRIVILEGED' },
];

// ---------------------------------------------------------------------------
// CONFIDENTIAL patterns (weak — only with a legal-context discriminator)
// ---------------------------------------------------------------------------

const CONFIDENTIAL_PATTERNS: PatternDef[] = [
  { regex: /\briservato\b/i, meaning: 'Riservato (con contesto legale)', language: 'it', level: 'CONFIDENTIAL' },
  { regex: /\bconfidenziale\b/i, meaning: 'Confidenziale (con contesto legale)', language: 'it', level: 'CONFIDENTIAL' },
  { regex: /\bconfidential\b/i, meaning: 'Confidential (con contesto legale)', language: 'en', level: 'CONFIDENTIAL' },
  { regex: /\bprivato\b/i, meaning: 'Privato (con contesto legale)', language: 'it', level: 'CONFIDENTIAL' },
  { regex: /\bnon\s+divulgare\b/i, meaning: 'Non divulgare (con contesto legale)', language: 'it', level: 'CONFIDENTIAL' },
  { regex: /\buso\s+interno\b/i, meaning: 'Uso interno (con contesto legale)', language: 'it', level: 'CONFIDENTIAL' },
];

// Mirrors the hook's DISCRIMINATOR_CONTENT (no path hint available here)
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

function hasDiscriminator(text: string): boolean {
  if (DISCRIMINATOR_CONTENT.test(text)) return true;
  let weakHits = 0;
  for (const p of CONFIDENTIAL_PATTERNS) if (p.regex.test(text)) weakHits++;
  return weakHits >= 2;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Classify text by Italian legal privacy level.
 *
 * PRIVILEGED patterns first (so "strettamente riservato" is not downgraded
 * by a bare "riservato" match); weak CONFIDENTIAL patterns only count when
 * a legal-context discriminator is present — same semantics as the
 * privacy-check.js hook.
 */
export function classifyPrivacy(text: string): ClassificationResult {
  const matches: PatternMatch[] = [];

  for (const def of PRIVILEGED_PATTERNS) {
    const m = def.regex.exec(text);
    if (m) {
      matches.push({
        pattern: def.regex.source,
        meaning: def.meaning,
        language: def.language,
        level: def.level,
        matchedText: m[0],
      });
    }
  }

  const discriminated = hasDiscriminator(text);
  for (const def of CONFIDENTIAL_PATTERNS) {
    const m = def.regex.exec(text);
    if (m && discriminated) {
      // Skip if the matched text is already covered by a PRIVILEGED match
      // e.g. "riservato" inside "strettamente riservato"
      const alreadyCovered = matches.some(
        (pm) =>
          pm.level === 'PRIVILEGED' &&
          pm.matchedText.toLowerCase().includes(m[0].toLowerCase()),
      );
      if (!alreadyCovered) {
        matches.push({
          pattern: def.regex.source,
          meaning: def.meaning,
          language: def.language,
          level: def.level,
          matchedText: m[0],
        });
      }
    }
  }

  let level: PrivacyLevel = 'PUBLIC';
  if (matches.some((m) => m.level === 'PRIVILEGED')) {
    level = 'PRIVILEGED';
  } else if (matches.some((m) => m.level === 'CONFIDENTIAL')) {
    level = 'CONFIDENTIAL';
  }

  const summary = buildSummary(level, matches);

  return { level, matches, summary };
}

function buildSummary(level: PrivacyLevel, matches: PatternMatch[]): string {
  if (level === 'PUBLIC') {
    return 'No privacy-sensitive patterns detected. Content may be processed via cloud API.';
  }

  const langs = [...new Set(matches.map((m) => m.language))].join(', ');
  const patterns = matches.map((m) => m.meaning).join('; ');

  if (level === 'PRIVILEGED') {
    return (
      `PRIVILEGED content detected (${langs}): ${patterns}. ` +
      'This content is protected by the segreto professionale (Art. 622 CP, L. 247/2012). ' +
      'Local processing ONLY — do not send to cloud APIs.'
    );
  }

  return (
    `CONFIDENTIAL content detected (${langs}): ${patterns}. ` +
    'Anonymize client-identifying information before any external processing. ' +
    'Prefer local processing when available.'
  );
}
