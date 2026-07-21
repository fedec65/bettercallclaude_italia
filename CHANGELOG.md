# Changelog

All notable changes to BetterCallClaude Italia will be documented in this file.

---

## [1.2.5] - 2026-07-21

### Fixed
- **Marketplace sync bloccato** — Risolto il problema che impediva al marketplace di completare la sincronizzazione in Cowork Desktop. La descrizione della skill `legal-5step-framework` (1378 caratteri) superava il limite di 1024 caratteri imposto da Claude per il campo `description` delle skill, causando il fallimento del caricamento del plugin e il blocco della sincronizzazione. Descrizione ridotta a 902 caratteri mantenendo i criteri di attivazione/non-attivazione.
- **Versioni allineate** — Badge README (plugin e marketplace), `commands/versione.md` e `bettercallclaude_italia/package.json` aggiornati a 1.2.5 (erano rimasti indietro a 1.1.0 / 1.0.4).

## [1.2.4] - 2026-07-21

### Fixed
- **Nomi tool MCP Cassazione corretti** — Risolto bug critico: agenti e comandi usavano nomi tool MCP sbagliati (`search_cassazione`, `get_cassazione_decision`) invece di quelli reali del server MCP (`cassazione_search_massime`, `cassazione_get_sentenza`). Questo causava la ricerca sul web invece di usare il server MCP Cassazione.
- **Agente `researcher`** — Corretto per usare `cassazione_search_massime` e `cassazione_get_sentenza`, con istruzioni per chiedere il cookie ItalGiure.
- **Agente `prompt-engineer`** — Corretto per usare `cassazione_search_massime` e `cassazione_get_sentenza`.
- **Comando `doctor`** — Corretto per testare `cassazione_search_massime` invece di `search_cassazione`.
- **Comando `legale`** — Corretto per usare `cassazione_get_sentenza` invece di `get_cassazione_decision`.
- **Skill `italian-legal-strategy`** — Corretto per usare `cassazione_search_massime` e `cassazione_get_sentenza`.

---

## [1.2.3] - 2026-07-21

### Added
- **Sezione "Cookie Cassazione" nel README** — Documentazione chiara su come funziona il cookie ItalGiure: ottenere il cookie, fornirlo quando richiesto dall'agente, e gestione scadenza. Include link alla guida dettagliata `docs/cassazione-cookie.md`.

---

## [1.2.2] - 2026-07-21

### Changed
- **Approccio cookie ItalGiure** — Cowork Desktop non mostra i campi `userConfig` nelle impostazioni del plugin. Cambiato approccio: l'agente ora **chiede esplicitamente il cookie all'utente** quando usa i tool Cassazione, invece di leggerlo da userConfig. Il cookie viene passato come parametro MCP e mantenuto per la durata della conversazione.
- **Skill `italian-legal-research`** — Aggiornato per chiedere il cookie ItalGiure all'utente quando necessario, con istruzioni su come ottenerlo.
- **Documentazione `docs/cassazione-cookie.md`** — Aggiornata per spiegare il nuovo approccio: l'utente fornisce il cookie quando richiesto dall'agente, non tramite impostazioni plugin.

---

## [1.2.1] - 2026-07-21

### Fixed
- **Campo `italgiure_cookie` visibile** — Rimosso `sensitive: true` dal campo `italgiure_cookie` in `plugin.json`. Cowork Desktop nascondeva i campi sensibili nelle impostazioni, impedendo agli utenti di configurare il cookie ItalGiure. Ora il campo è visibile e modificabile.

---

## [1.2.0] - 2026-07-21

### Added
- **Cookie ItalGiure via userConfig** — Gli utenti possono ora inserire il cookie di sessione ItalGiure nelle impostazioni del plugin (campo `italgiure_cookie`). Il plugin passa automaticamente il cookie al server MCP remoto come parametro, senza richiedere configurazione manuale.
- **Parametro `cookie` nei tool Cassazione** — I tool `cassazione_search_massime` e `cassazione_get_sentenza` accettano ora il parametro opzionale `cookie`, con fallback a `ITALGIURE_COOKIE` env var o file locale per self-hosted.

### Changed
- **Skill `italian-legal-research`** — Aggiornato per passare il cookie ItalGiure come parametro `cookie` quando configurato.
- **Documentazione `docs/cassazione-cookie.md`** — Aggiornata per spiegare la nuova UX: cookie via impostazioni plugin invece di passaggio manuale.

### Fixed
- **Server Cassazione remoto** — Risolto problema che impediva agli utenti di passare il cookie personale al server hosted. Il cookie ora viene passato come parametro MCP, mantenendo la sessione ItalGiure attiva senza condivisione con altri utenti.

---

## [1.1.0] - 2026-06-21

### Added — Swiss Feature Port (v4.8.0–v4.9.0)
- **Spec E — Output-as-file convention**: Results >500 words saved to `bcc-output/YYYY-MM-DD-<slug>/` folder. Chat shows only 3-5 line summary. New `skills/shared/SKILL.md` defines the convention. Applied to 11 commands.
- **Spec I — Natural Language Flags**: Users can say "output breve", "analisi completa", "per la Lombardia" etc. instead of flags. Applied to legale, legale-5step, riassumi.
- **Spec H — Privacy Fallback**: Skill-level privacy defense when PreToolUse hook is absent. Pattern-matching fallback in `privacy-routing/SKILL.md`.
- **Spec C — `/start` command**: 5-step onboarding: language detect → greet → MCP check → playbook search → examples. Replaces `/configurazione` (now alias).
- **Spec D — `/doctor` command**: Two-stage MCP diagnostics (tool availability + lightweight call) for 7 Italian servers with plain-language impact explanations.
- **Spec G — Reduced Mode**: Degradation tables added to 7 MCP-dependent skills showing functionality with/without servers and manual fallback links.
- **Spec A — Playbook locale**: `docs/PLAYBOOK.md` guide, IT/EN templates in `templates/`, playbook awareness in `italian-document-analysis` and `italian-legal-drafting` skills. Mandatory law override rule.
- **Spec B — `/triage-nda` command**: GREEN/YELLOW/RED NDA classification per Italian law (Art. 1382 CC, Art. 1229 CC, Art. 2125 CC, Reg. Bruxelles I-bis). Single file and batch mode.
- **Spec J — `/legale-obiettivo` command**: Defines verifiable legal success conditions as Goal Records. Supports predefined profiles (citazioni-pulite, bozza-pronta, contraddittorio-convergenza, nda-batch-pulito, monitoraggio-normativo) and free-text objectives.
- **Spec K — `/legale-loop` command**: Worker-evaluator loop against Goal Records. Safety guards: max iterations (cap 20), no-progress detection, mandatory worker-evaluator separation, per-iteration privacy checks, no autonomous transmission.
- **Spec L — `legal-evaluator` skill**: Verdict engine for goal-loop system. Structured verdicts with score (0-100), PASS/FAIL/WARN findings, anti-hallucination rules (R1/R2), MCP-based verification.

### Changed — Architecture (Spec F — Skill Consolidation 15→13)
- **Merged** `legal-query-refinement` + `legal-briefing` → `legal-intake` (unified intake with Refine + Briefing modes)
- **Removed** `output-summarization` — embedded directly into `/riassumi` command
- **Removed** `italian-jurisdictions` — moved to `shared/references/italian-jurisdictions.md`
- **Updated** all agent skill references to reflect consolidation

### Stats
- Commands: 21 → 26 (+5 new: start, doctor, triage-nda, legale-obiettivo, legale-loop)
- Skills: 15 → 13 (consolidated 4 → 2, added 2 new: legal-intake, legal-evaluator)
- Agents: 20 (unchanged)

## [1.0.8] - 2026-06-01

### Added
- **`/bettercallclaude-italia:legale-5step`** — Full 5-phase legal pipeline command: INTAKE → RICERCA → STRATEGIA → CONTRADDITTORIO → REDAZIONE. Sequential execution with quality gates, privilege propagation, and citation integrity checks.
- **`legal-5step-framework` skill** — Methodology definition with step agents, data flow diagram, quality gates, and Italian citation format table.
- Parameters: `--breve`, `--medio`, `--lungo`, `--no-sintesi`, `--stop-dopo=N`, `--lang=IT|EN`, `--regione=XX`.
- MCP server priority chain: cassazione → normattiva → corte-costituzionale → giustizia-amministrativa → eur-lex-ita.
- Italian document types: Atto di citazione (CPC Art. 163), Comparsa di costituzione (CPC Art. 167), Parere legale, Memoria ex Art. 183 CPC, Ricorso per Cassazione.

---

## [1.0.7] - 2026-05-31

### Added
- **Plugin scope enforcement** — All 16 legal commands now include an explicit "Ambito plugin" constraint requiring exclusive use of BetterCallClaude Italia agents, skills, and MCP servers for legal work. External delegation is blocked; infrastructure operations (file generation, file reading, computation) remain exempt.
- Commands with short format enforcement (15): ricerca, strategia, redazione, traduci, contraddittorio, citazione, precedente, verifica, riassumi, raffina, analisi-doc, flusso, briefing, nazionale, regionale.
- Command with dedicated section enforcement (1): legale (gateway command, "Vincolo di Ambito Plugin" section).
- Utility commands excluded (4): aiuto, versione, configurazione, privacy.

---

## [1.0.6] - 2026-05-29

### Security
- **NEW-1: Mode downgrade prevention** — `.privacy-mode` file can only raise severity above the default (`balanced`). A file containing `cloud` is now ignored, preventing silent downgrade by attacker-deposited files (cloned repos, shared directories).
- **NEW-2: Bash file path analysis** — Privacy hook now extracts file paths referenced in Bash commands (`curl @file`, `cat file | nc`, `< file` redirects) and checks them against path discriminators. Commands referencing files in privileged directories (e.g. `/fascicoli/`, `/clienti/`) trigger `ask` in balanced mode and `deny` in strict mode.
- **NEW-3: Strict mode no longer disables the product** — `strict` now uses pattern-based deny instead of blanket deny. Non-privileged content passes through, keeping the 7 cloud MCP servers (Cassazione, Normattiva, etc.) usable for research. Privileged content is still blocked.
- **NEW-6: CI workflow pinned to SHA** — `ci.yml` now uses commit SHA-pinned actions (was only `release.yml`).

### Fixed
- **NEW-4: IPv6 localhost** — `OLLAMA_HOST` validation now correctly accepts `http://[::1]:11434` (URL parser returns hostname with brackets; allowlist check now strips them).
- **v1.0.5 CHANGELOG correction** — Bash coverage claim revised: the hook inspects command strings and referenced file paths, but does not read file contents. Full exfiltration prevention requires `strict` mode.

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
