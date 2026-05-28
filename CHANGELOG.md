# Changelog

All notable changes to BetterCallClaude Italia will be documented in this file.

---

## [1.0.5] - 2026-05-28

### Security
- **C1: SSRF prevention** — `OLLAMA_HOST` validated at startup; only `localhost`, `127.0.0.1`, `::1` accepted. Prevents redirecting local inference to remote hosts.
- **C2/H2: Prompt injection hardening** — Ollama classifier now uses separate `system`/`prompt` parameters with `<document>` delimiters. Fail-closed: unrecognized model output defaults to `PRIVILEGED`.
- **C3: Fail-closed on malformed input** — Privacy hook now denies tool calls when stdin JSON is unparseable (was silent pass-through).
- **H7: Supply chain** — GitHub Actions pinned to commit SHAs instead of mutable tags.
- **H11: Document analysis injection protection** — `analisi-doc` command and skill now explicitly instruct to treat document content as data, not instructions.
- **H12: Citation verification** — Removed auto-declared `verified: true` from advocate agent; citations now marked `needs_verification: true` with instruction to verify via MCP.

### Fixed
- **C6: CPC citation** — Corrected `D.Lgs. 1/2018` (Codice del Terzo Settore) → `R.D. 1443/1940, mod. D.Lgs. 149/2022` (actual CPC) in procedure agent.
- **C7: Professional secrecy citation** — Corrected `Art. 9 D.Lgs. 96/2001` (EU lawyer recognition) → `L. 247/2012, CDF Art. 13` (actual professional secrecy foundation) across ~20 files. Added CDF Art. 28 (riserbo) pattern.
- **B1/B13: Regex for Italian dotted form** — `art. 622 c.p.` now correctly detected (was only matching `Art. 622 CP`).
- **B12: Path discriminator** — Added `fascicoli`/`fascicolo` to path discriminators (canonical directory in Italian law firms).
- **H9: Abolished tax reference** — Removed TASI (abolished by L. 160/2019, absorbed into IMU) from fiscal agent.
- **M11: Doctrinal sources** — Added `Rivista di Diritto Processuale` to advocate/adversary agents; `Rivista Penale` now correctly scoped to criminal matters only.

---

## [1.0.4] - 2026-05-21

### Security
- **Privacy hook: mode-aware decision logic** — `strict` denies all external calls (use Ollama for privileged content), `balanced` asks user confirmation for strong and weak+context patterns, `cloud` asks only for strong patterns.
- **Ollama exclusion** — `mcp__ollama__*` tools always pass through privacy checks in all modes (local server, no data exfiltration).
- **Added Bash to hook matcher** — shell commands (`curl`, `cat | nc`, etc.) are now intercepted by the privacy hook, preventing data exfiltration via Bash tool.
- **Added privacy_mode userConfig** — three modes: `strict` (deny all external), `balanced` (ask for privileged content), `cloud` (ask for strong patterns only). Default: `balanced`.

### Added
- **`/privacy` command** — visualizza e cambia la modalità privacy direttamente dalla chat (`/bettercallclaude-italia:privacy strict|balanced|cloud`). Scrive la modalità in `.privacy-mode` come fallback quando `userConfig` non è disponibile.
- **`.privacy-mode` file fallback** — `resolveMode()` ora legge anche il file `.privacy-mode` nella directory di lavoro se `userConfig.privacy_mode` non è impostato.
- **7 new strong patterns**: vincolo di riservatezza, obbligo di riservatezza, segreto istruttorio, segreto investigativo, riservatezza professionale, tutela del segreto, comunicazione privilegiata.
- **3 new English strong patterns**: legally privileged, privileged and confidential, protected by privilege.
- **2 new article references**: Art. 200 CPP (segreto professionale testimonianza), Art. 103 CPP (garanzie del difensore).
- **2 new weak patterns**: non divulgare, uso interno.
- **New discriminators**: tribunale, corte, giudice, parte avversa, controparte.

### Changed
- **Documentation toned down**: "conformità integrata al segreto professionale" replaced with "assistenza al rilevamento del segreto professionale" in README, aiuto.md, plugin.json, and marketplace.json.
- Added privacy disclaimer to README and aiuto.md: "L'hook privacy è una tecnologia assistiva e non garantisce la conformità."
- Test suite expanded from 22 to 65 tests covering all three modes, Ollama exclusion, `.privacy-mode` file fallback, new patterns, and decision logic.

---

## [1.0.3] - 2026-05-23

### Changed
- **Command renamed**: `/federale` → `/nazionale` — Italy uses national/regional law distinction, not federal/cantonal like Switzerland.
- All references to "federale" replaced with "nazionale" across commands, agents, skills, README, and plugin.json (23 files).

### Fixed
- `agents/prompt-engineer.md`: Stale `/refine` reference → `/raffina`.
- `commands/aiuto.md`: Removed "via Ollama" from strict privacy mode description.
- `skills/privacy-routing/SKILL.md`: Removed "(Ollama o equivalente)" from PRIVILEGIATO level.

---

## [1.0.2] - 2026-05-22

### Changed
- **All 19 commands renamed to Italian** to avoid collision with Swiss plugin:
  `legal` → `legale`, `research` → `ricerca`, `strategy` → `strategia`,
  `draft` → `redazione`, `translate` → `traduci`, `validate` → `verifica`,
  `cite` → `citazione`, `precedent` → `precedente`, `federal` → `federale`,
  `regional` → `regionale`, `adversarial` → `contraddittorio`, `workflow` → `flusso`,
  `doc-analyze` → `analisi-doc`, `refine` → `raffina`, `summarize` → `riassumi`,
  `version` → `versione`, `setup` → `configurazione`, `help` → `aiuto`.
  `briefing` unchanged (already natural in Italian).
- **MCP configuration**: Removed local Ollama STDIO server; now 7 HTTP servers on
  `mcp-italia.bettercallclaude.ch` aggregator. Added server reliability documentation
  and fallback URL strategy for scraper servers.
- Updated all cross-references in agents, skills, hooks, and docs to use new Italian command names.

### Removed
- `ollama` local MCP server and related `ollama_host` user config.

---

## [1.0.1] - 2026-05-21

### Fixed
- Removed non-ASCII em-dash (U+2014) from `plugin.json` that broke marketplace sync.
- Fixed `privacy-check.js` regex: `\s` in string literals → `\\s` for proper whitespace matching.
- Rewrote `privacy-check.test.js` to standalone `node:assert` harness (was using unavailable Jest APIs).
- Included `mcp-servers/ollama/dist/index.js` bundle in repo (was gitignored).
- Changed plugin name to kebab-case: `bettercallclaude_italia` → `bettercallclaude-italia` (required by Cowork validation).

---

## [1.0.0] - 2026-05-21

### Added
- **Initial release** — Complete Italian legal intelligence plugin for Cowork Desktop.
- **20 agents** covering all major areas of Italian legal practice:
  - Research (ricerca giuridica), Strategy (strategia processuale), Drafting (redazione legale)
  - Citation (citazioni giuridiche), Briefing (briefing strutturato), Adversarial (analisi avversaria)
  - Jurisdictional coverage for all 20 Italian regions (LOM, LAZ, CAM, VEN, etc.)
- **19 commands** with Italian-language slash-command interface:
  - `/bettercallclaude_italia:legal`, `/bettercallclaude_italia:research`, `/bettercallclaude_italia:strategy`
  - `/bettercallclaude_italia:draft`, `/bettercallclaude_italia:cite`, `/bettercallclaude_italia:precedent`
  - `/bettercallclaude_italia:regional`, `/bettercallclaude_italia:adversarial`, `/bettercallclaude_italia:workflow`
- **14 skills** with auto-activation for Cowork's skill router:
  - `italian-legal-research`, `italian-legal-strategy`, `italian-legal-drafting`
  - `italian-citation-formats`, `italian-document-analysis`, `italian-legal-translation`
  - `compliance-frameworks`, `data-protection-law`, `privacy-routing`
- **9 MCP servers** in `.mcp.json`:
  - 7 remote HTTP servers on `mcp-italia.bettercallclaude.ch`:
    `normattiva`, `corte-costituzionale`, `giustizia-amministrativa`, `cassazione`,
    `eur-lex-ita`, `legal-citations-ita`, `legal-persona-ita`
  - 1 local STDIO `ollama` server for on-premise privacy classification
- **Privacy hook** — `PreToolUse` hook (`scripts/privacy-check.js`) detects
  Italian attorney-client privilege markers (`segreto professionale`, `Art. 622 CP`,
  `L. 247/2012`, `CDF Art. 13`) before data leaves the machine.
- **Marketplace structure** — Repo is a Cowork Desktop marketplace with
  `.claude-plugin/marketplace.json` at root and plugin source in
  `bettercallclaude_italia/` subdirectory.

### Architecture
- Swiss→Italian legal mapping: ZGB/OR → Codice Civile (CC); StGB → Codice Penale (CP);
  ZPO → Codice di Procedura Civile (CPC); BV → Costituzione (Cost.); BGE → Cassazione;
  26 Cantons → 20 Italian regions; CHF → EUR.
- AGPL-3.0 licensed.

---

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
