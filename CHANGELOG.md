# Changelog

All notable changes to BetterCallClaude Italia will be documented in this file.

---

## [1.10.0] - 2026-08-20

Porting della release svizzera **v4.10.1** (legal-wayfinder + scheduling monitoraggio-normativo).

### Added
- **Legal wayfinder — mappe decisionali** — Pratiche troppo grandi o troppo nebbiose per un piano di esecuzione statico vengono tracciate come mappa decisionale (destinazione, decisioni, nebbia, fuori ambito) con ticket decisionali (`research` / `grilling` / `prototype` / `task`) in `bcc-output/YYYY-MM-DD-<slug>/wayfinder/`:
  - Nuova skill `legal-wayfinder` (metodologia completa: frontiera e claiming, fog of war, casi limite, handoff pack verso `/legale-5step` o orchestratore, opzione `--gate` verso `/legale-obiettivo`).
  - Nuovo comando `/mappa-legale` (charting: interrogazione breadth-first dell'avvocato, uscita anticipata senza nebbia, lancio dei ticket research in parallelo; flag `--privacy`, `--lang`, `--regione`).
  - Nuovo comando `/percorso-legale` (lavora un ticket per invocazione per tipo, mantiene la mappa, promuove la nebbia, emette l'handoff pack; flag `--map`, `--gate`, `--list`).
  - **Fog check** nel briefing: complessità 8+ o decisioni aperte interdipendenti → il coordinatore si ferma e offre la mappa (`/briefing --chart`, `/legale`, agente `briefing`).
- **Scheduling `monitoraggio-normativo`** — Nuovo reference `legal-evaluator/references/scheduling-monitoraggio-normativo.md`: schedulazione del profilo reg-watch (Cowork Scheduled Tasks, cron esterno, sessioni schedulate), formato del file dei temi sorvegliati (fonti italiane: Normattiva, Gazzetta Ufficiale, Bollettini Regionali, Cassazione, CONSOB/Banca d'Italia/Garante) e comportamento per esecuzione.

### Fixed
- **Conteggi in `/aiuto`** — Aggiunti ai riferimenti i comandi/agenti/skill mancanti (`/cronologia-legale`, agente `chronology-builder`, skill `citation-content-verify` e `legal-chronology`); conteggi allineati alla realta' (21 agenti, 29 comandi, 16 skill attivabili + shared).
- Conteggi e tabella comandi aggiornati nel README del plugin e in `docs/command-reference.md` (nuove voci `/mappa-legale`, `/percorso-legale`; flag `--chart` in `/briefing`).

---

## [1.9.4] - 2026-08-15

### Security
- **CVE-2026-54290 (hono)** — Forzate via npm `overrides` le versioni patched delle dipendenze transitive del server MCP Ollama (`mcp-servers/ollama/package.json`): `hono` ^4.12.25 (il middleware CORS rifletteva qualsiasi Origin con credenziali) e `@hono/node-server` ^1.19.15 (advisory HIGH proprie). Applicati anche i fix non-breaking di `npm audit` (body-parser, fast-uri). Resta 1 vulnerabilità moderata su `esbuild` (dev-server, usato solo in fase di build). Sostituisce la PR esterna #31, chiusa perché basata su un branch stale (dev@1.2.4) che avrebbe revertito lo stato del repository.

---

## [1.9.3] - 2026-08-15

### Added
- **Badge "Buy Me a Coffee"** nei README del marketplace e del plugin, con link "Supporta il progetto" nel footer — allineato al repository svizzero.

---

## [1.9.2] - 2026-08-05

### Fixed
- **URL errato nelle istruzioni per il cookie ItalGiure** — Le istruzioni indicavano `https://www.italgiure.giustizia.it/sncass/` (pagina "Sentenze Cassazione", accesso libero, nessun login) come punto dove ottenere il cookie di sessione. Corretto in tutti i punti (`plugin.json`, README plugin, `agents/researcher.md`, `skills/italian-legal-research`, `docs/cassazione-cookie.md`) verso l'area riservata `https://www.italgiure.giustizia.it/new/archives`, con nota esplicita che la pagina `/sncass/` non richiede login. Segnalazione di un utente.

---

## [1.9.1] - 2026-08-05

### Fixed
- Aggiunto file `LICENSE` mancante (testo integrale GNU AGPL-3.0, copyright Federico Cesconi) — il README e il `package.json` lo linkavano ma non esisteva.
- Corretto flag `sensitive` su `italgiure_cookie` in `plugin.json` (`false` → `true`): il cookie di sessione ItalGiure e una credenziale (login SPID), come `api_token`.

---

## [1.9.0] - 2026-08-05

Porting della release svizzera **v4.9.6** (privacy hook quoting + regression guards).

### Added
- **Regression guards anti-quoting** — Nuovi test in `scripts/privacy-check.test.js` (NEW-4): verificano che ogni comando hook in `hooks.json` racchiuda `"${CLAUDE_PLUGIN_ROOT}/..."` tra virgolette e che nessuno snippet shell distribuito (comandi, skill, agenti) contenga occorrenze non quotate di `${CLAUDE_PLUGIN_ROOT}`. Il bug (percorsi del plugin con spazi, es. `Library/Application Support/...`) era gia stato corretto nella v1.2.6 italiana e segnalato allo svizzero; questi test impediscono la regressione.

### Note per i manutentori
- `hooks/hooks.json` italiano era gia quotato (fix v1.2.6); le invocazioni di `timeline-render.mjs` portate nella v1.8.0 sono nate gia quotate — verificato dai nuovi test (90/90).

---

## [1.8.0] - 2026-08-05

Porting della release svizzera **v4.9.5** (sourced legal chronology).

### Added
- **`/cronologia-legale` — cronologia legale documentata dai documenti del fascicolo.** Trasforma una cartella di documenti (contratti, corrispondenza, atti giudiziari, perizie) in una cronologia legale come la leggerebbe un avvocato. Nuovo comando `commands/cronologia-legale.md`, skill `legal-chronology` (+ 4 reference: event schema, normalizzazione date DE/FR/IT/EN, mapping termini, registro parti) e agente `chronology-builder.md` (worker di estrazione isolato).
- **Provenienza obbligatoria (R1/R2 applicata ai fatti)** — ogni evento porta documento + locus; un evento senza fonte non appare mai in alcun output. Il renderer deterministico `scripts/timeline-render.mjs` (Node, zero dipendenze) valida lo schema e rifiuta di renderizzare eventi senza fonte.
- **Modello del fatto contestato** — stato per evento `undisputed` / `alleged` / `contested` (non contestato / allegato / contestato) con attribuzione di parte; conflitti di data registrati con ENTRAMBE le date e le rispettive fonti, mai risolti silenziosamente; lacune probatorie (>= 30 giorni non documentati) segnalate.
- **Marcatori di termine** — nessun calcolo automatico server-side in Italia: i termini processuali (CPC: comparsa di risposta artt. 163/163-bis, memorie artt. 183-184, appello artt. 325/327, ricorso cassazione art. 369 ss., opposizione a decreto ingiuntivo art. 641) e la prescrizione (artt. 2934-2969 CC) derivano dalla tabella di mapping della skill, sempre etichettati "indicativo — verificare". Ogni marcatore ancora a un evento con fonte.
- **Tre formati di output** in `bcc-output/cronologia/`: `cronologia.md` (tabella), `cronologia.html` (vista interattiva self-contained, colorata per stato, bande di lacuna, marcatori di termine, click-through alle fonti), `cronologia.docx` (export per fascicolo, writer OOXML minimale in JS puro).
- **Profilo goal-loop `timeline-sourced`** — worker `chronology-builder`, valutatore agente `citation`: il loop si chiude solo quando ogni evento ha fonte tracciabile, tutti i conflitti sono segnalati e tutti i termini sono ancorati. Aggiunto a `/legale-obiettivo`, `legal-evaluator` e `references/loop-profiles.md`.
- **Set di accettazione** — `bettercallclaude_italia/testdocs/cronologia/` (caso civile fittizio con un conflitto di data pianificato, un evento contestato, una lacuna di 48 giorni, un evento di notifica) + `evals/legal-timeline-evals.json` (8 casi mappati sui criteri di accettazione).

### Note per i manutentori
- La posizione di output segue la specifica (`bcc-output/cronologia/`) come eccezione documentata alla convenzione delle cartelle datate: la cronologia e un artefatto vivo del fascicolo, aggiornabile via `--merge`.
- I termini non sono mai calcolati in modo autorevole (nessun tool `compute_deadlines` nel catalogo MCP italiano): derivano dalla tabella di mapping e sono marcati indicativi in ogni output.
- Il writer docx e intenzionalmente minimale (tabella + riepilogo); md/html restano gli output autorevoli.

---

## [1.7.0] - 2026-08-05

Porting della release svizzera **v4.9.4** (substantive citation verification).

### Added
- **Skill `citation-content-verify`** — Nuova skill che verifica ogni citazione di una bozza contro la fonte live su due assi: esistenza E supporto del contenuto. Stato per citazione: `MATCH` / `PARTIAL` / `MISMATCH` / `UNVERIFIED` / `SKIPPED`. Qualsiasi citazione `UNVERIFIED` o `MISMATCH` blocca la consegna automatica — la bozza va corretta, esplicitamente disclaimed o escalata. Output strutturato per citazione (`citation_id`, `source_mcp`, `query_used`, `status`, `matched_snippet`, `confidence_score`) registrato in `bcc-output/<data-slug>/citation-verify.json`.
- **Eval set di accettazione** — `bettercallclaude_italia/evals/citation-verify-evals.json` con 39 casi: 12 citazioni inventate (devono essere 100% `UNVERIFIED`), 20 citazioni genuine (tasso di falsi positivi `MISMATCH` < 5%), 4 mismatch di contenuto, 2 match parziali, 1 caso di dottrina informale (`SKIPPED`).

### Changed
- **Skill `legal-evaluator`** — Nuovo gate pre-score (Passo 3): esegue `citation-content-verify` prima di calcolare il verdetto. Citazioni `UNVERIFIED`/`MISMATCH` producono finding FAIL indipendentemente dal profilo; `PARTIAL` produce WARN; una consegna bloccata impedisce al verdetto di passare.
- **`/legale-loop`** — Lo step del verdetto ora include il gate sostanziale delle citazioni.
- **Agente orchestrator** — `citation-content-verify` e gate di qualita obbligatorio prima di DELIVER per qualsiasi deliverable contenente citazioni; la pipeline contenziosa lo attraversa esplicitamente.
- **Agente citation** — Nuovo passo 2.5 VERIFICA-CONTENUTO tra VALIDAZIONE e RIFERIMENTO INCROCIATO.
- **`/verifica`** — Rimanda a `citation-content-verify` per la verifica sostanziale (esistenza + contenuto) delle bozze.

### Note per i manutentori
- **Nessun LLM judge server-side**: `check_claim_support` non esiste nel catalogo MCP italiano — tutte le verifiche di supporto del contenuto sono giudizio dell'agente verificatore sul testo recuperato, con confidence ridotta documentata (testo integrale ≤ 0.8, solo massima/metadati ≤ 0.6, web non strutturato ≤ 0.4).
- Riusa solo l'infrastruttura MCP esistente: `legal-citations-ita` (parse/validate/format), `normattiva`, `cassazione` (con cookie ItalGiure; solo link di fallback → `UNVERIFIED`), `eur-lex-ita`.
- Decisioni di merito (Corte d'Appello/Tribunale) e dottrina non hanno fonte MCP strutturata: best-effort via web search a bassa confidence, dottrina informale `SKIPPED`.
- Privacy: in modalita `strict` le frasi claim non vengono mai inviate a content-check cloud — solo verifica di esistenza con nota `(privacy-gated)`.

---

## [1.6.0] - 2026-08-04

Porting della release svizzera **v4.9.3** (Cowork MCP tool naming).

### Changed
- **Prefisso tool Cowork** — Tutti i riferimenti MCP in agenti, skill e comandi (49 file) migrati dal prefisso intermedio `mcp__bettercallclaude-italia-http-<server>__<tool>` al prefisso plugin-scoped richiesto da Claude Cowork Desktop: `mcp__plugin_bettercallclaude-italia_<server>__<tool>`. Il prefisso precedente veniva rifiutato da Cowork, lasciando gli agenti senza accesso alle banche dati legali italiane e forzando il fallback su ricerca web.
- **`scripts/generate-tool-frontmatter.js`** — Aggiornato per emettere il prefisso Cowork corretto.
- **Riferimenti Ollama aggiornati** — Ollama non e piu bundled nel plugin (rimosso da `.mcp.json`): documentazione (`privacy-routing`, `/privacy`, `/aiuto`, README) aggiornata per descrivere l'esenzione dei tool locali come opzione "se configurata", non come funzionalita inclusa. La logica di esenzione in `privacy-check.js` resta attiva come difesa per chi configura un server MCP locale proprio.

### Note per i manutentori
- Da verificare in Cowork Desktop dopo il sync del marketplace: un agente deve poter invocare `mcp__plugin_bettercallclaude-italia_cassazione__cassazione_search_massime` senza fallback su web search.
- Riferimenti residui senza equivalente italiano (`find_leading_cases`, `get_article`, `get_decision`, `format_citation`, `parse_citation`) restano in roadmap MCP.

---

## [1.5.0] - 2026-08-04

Porting della release svizzera **v4.9.2** (MCP tool integration in skills and commands).

### Added
- **Frontmatter MCP nelle 14 skill e nei 26 comandi** — Ogni skill e comando ora dichiara nel frontmatter YAML i tool MCP che usa (prefisso intermedio `mcp__bettercallclaude-italia-http-<server>__<tool>`, migrazione al prefisso Cowork nella v1.6.0). Regola di delega: i comandi che orchestrano skill ereditano il set completo dei tool MCP delle skill invocate (es. `/ricerca` dichiara tutti i 16 tool di `italian-legal-research`; `/legale` e `/legale-5step` tutti i 19 tool).
- **`scripts/generate-tool-frontmatter.js`** — Script di analisi statica portato dallo svizzero e adattato all'infrastruttura italiana: mappatura dei 19 tool reali sui 7 server, prefisso italiano, path del plugin. Dry-run di default, `--apply` per scrivere.

### Fixed
- **Correzioni nel corpo di `italian-legal-research`** — `search_legislation` → `normattiva_search`/`eur-lex-ita_search` (per sezione), `search_decisions` → `corte-costituzionale_search`/`giustizia-amministrativa_search`, `validate_citation` → `legal-citations-ita_validate`.

### Note per i manutentori
- Riferimenti senza equivalente italiano segnalati per roadmap MCP: `present_adversarial_analysis`, `present_intake_form`, `compute_deadlines` (hanno gia fallback funzionanti), `find_leading_cases`, `get_article`, `get_decision`, `format_citation`, `parse_citation` (hanno candidati naturali, valutare nelle prossime release).
- Riferimenti concettuali a Ollama in `privacy-routing`, `/privacy`, `/aiuto` — pulizia prevista in v1.6.0.

---

## [1.4.0] - 2026-08-04

Porting della release svizzera **v4.9.1** (MCP tool integration in agents).

### Added
- **Frontmatter MCP nei 20 agenti** — Ogni agente ora dichiara nel frontmatter YAML i tool MCP che usa (prefisso intermedio `mcp__bettercallclaude-italia-http-<server>__<tool>`, sarà migrato al prefisso Cowork definitivo nella v1.6.0). Prima solo `prompt-engineer` dichiarava tool MCP; gli altri agenti avevano solo tool generici e non potevano invocare le banche dati legali. Tool selezionati dal catalogo reale (`CONNECTORS.md`): 19 tool su 7 server. Agenti di ricerca (researcher, judicial, advocate, adversary, regional, orchestrator): set completo; agenti specialistici: subset per ruolo (es. drafter → legal-persona-ita + legal-citations-ita; procedure → normattiva + giustizia-amministrativa + cassazione).

### Fixed
- **Riferimenti a tool inesistenti corretti** — `verify_citation` → `legal-citations-ita_validate` (researcher, drafter); `search_legislation` → `normattiva_search`, `search_decisions` → `corte-costituzionale_search`, `validate_citation` → `legal-citations-ita_validate` (prompt-engineer); prefisso obsoleto `mcp__bettercallclaude-http-` uniformato.

### Note per i manutentori
- Tool svizzeri senza equivalente italiano (`check_claim_support`, `compute_deadlines`, `onlinekommentar`, `standardize_document_citations`, tool swiss-caselaw/entscheidsuche/fedlex) segnalati ma non portati: non esistono sull'infrastruttura MCP italiana.
- `briefing.md` è l'unico agente senza entry MCP: il suo omologo svizzero usava solo `present_intake_form`, non disponibile in Italia.

---

## [1.3.0] - 2026-08-04

Porting della release svizzera **v4.8.3** (CONNECTORS documentation + widget integration hooks).

### Added
- **`CONNECTORS.md`** — Documentazione completa dei 7 server MCP italiani (panoramica, configurazione, tabella tool per server, fonti dati, affidabilita, sezione privacy). Portata dalla struttura svizzera, contenuti allineati alle specifiche reali di `BetterCallClaudeMCP_Italy`.
- **Integrazione Widget — Dashboard Contraddittorio** (`adversarial-analysis`) — Dopo la sintesi giudiziale, la skill verifica la disponibilita del tool `present_adversarial_analysis`: se presente renderizza una dashboard interattiva, altrimenti produce l'output testuale completo (comportamento predefinito, pienamente funzionante).
- **Integrazione Widget — Form di Intake** (`legal-intake`) — In modalita Briefing, verifica la disponibilita del tool `present_intake_form`: se presente renderizza le domande socratiche come form (max 1 follow-up), altrimenti dialogo in chat (predefinito).
- **Calcolo termini processuali** (`italian-legal-strategy`) — Nuovo paragrafo sul calcolo dei termini: usa `compute_deadlines` se disponibile, altrimenti calcolo manuale con regole CPC (art. 155, sospensione feriale L. 742/1969, art. 163-bis, termini impugnazioni) e contrassegno *(calcolato manualmente — verificare presso la cancelleria competente)*.

### Fixed
- **`doctor.md`** — Corrette le chiamate di test: erano nomi tool svizzeri/inesistenti (`search_legislation`, `search_decisions`, `validate_citation`, `legal_analyze`), ora quelli reali italiani (`normattiva_search`, `corte-costituzionale_search`, `giustizia-amministrativa_search`, `eur-lex-ita_search`, `legal-citations-ita_validate`, `legal-persona-ita_draft_document`).
- **README** — Conteggio skill corretto (13 → 14); rimosso riferimento ad arbitrato CAS/TAS (server non presente nell'infrastruttura italiana).

### Note per i manutentori
- I tool widget (`present_adversarial_analysis`, `present_intake_form`) e `compute_deadlines` **non esistono** ancora sul server `legal-persona-ita` (che espone solo `legal-persona-ita_draft_document`): le skill usano il pattern "verifica disponibilita → fallback" dello svizzero, quindi funzionano oggi e si attiveranno automaticamente se il server aggiungera i tool.

---

## [1.2.6] - 2026-08-04

### Fixed
- **Hook privacy-check rotto su macOS** — Risolto bug critico segnalato da un utente: il comando dell'hook PreToolUse (`node ${CLAUDE_PLUGIN_ROOT}/scripts/privacy-check.js`) non racchiudeva il path tra virgolette. Su macOS il plugin root sta sotto `~/Library/Application Support/...` e lo spazio in "Application Support" spezzava il comando: Node cercava `/Users/<utente>/Library/Application` e falliva a ogni tool call. Conseguenza: il controllo sul segreto professionale era **silenziosamente inattivo** (hook non-blocking) per tutti gli utenti con spazi nel path. Comando corretto in `node "${CLAUDE_PLUGIN_ROOT}/scripts/privacy-check.js"`.

---

## [1.2.5] - 2026-07-21

### Fixed
- **Marketplace sync bloccato in Cowork Desktop** — Risolto il blocco che impediva al marketplace di completare la sincronizzazione. La descrizione della skill `legal-5step-framework` era di **1378 caratteri**, oltre il limite di **1024** che Claude impone al campo `description` delle skill: una singola descrizione troppo lunga fa fallire il caricamento del plugin, lasciando il marketplace in stato "syncing" indefinito. Descrizione ridotta a ~490 caratteri mantenendo i criteri di attivazione/non-attivazione (in linea con le descrizioni skill del plugin svizzero, tutte < 600 caratteri).
- **Guard di validazione** — Aggiunto a `scripts/validate-plugin.js` un controllo che fallisce se una descrizione di skill o agente supera 1024 caratteri, così il problema non può ripresentarsi silenziosamente.
- **Versioni allineate** — Badge versione (`README.md` marketplace e plugin) portati a 1.2.5, `commands/versione.md` da v1.1.0 a v1.2.5, `bettercallclaude_italia/package.json` da 1.0.4 a 1.2.5.

---

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
