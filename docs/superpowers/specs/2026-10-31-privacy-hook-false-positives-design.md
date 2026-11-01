# Design — Fix falsi positivi e attrito dell'hook privacy (v2.4.6)

Data: 2026-10-31
Plugin: `bettercallclaude-italia` ( BetterCallClaude Italia )
Segnalazione: utente su Cowork — l'hook PreToolUse `scripts/privacy-check.js` blocca/ferma
scritture locali di testi che si limitano a citare norme o usare lessico corrente di
contratti e atti (art. 622 c.p., L. 247/2012, «obbligo di riservatezza», «segreto
commerciale», «riservato», «privato»).

## Contesto e problemi confermati

Esplorazione del codice (tutti i riferimenti a `bettercallclaude_italia/`):

1. **Riferimenti normativi trattati come pattern forti** — `STRONG_PATTERNS`
   (`scripts/privacy-check.js:315-321`) include `art-622-cp`, `l-247-2012`,
   `cdf-art-13`, `cdf-art-28`, `art-663-cp`, `art-200-cpp`, `art-103-cpp`. In
   `balanced`/`cloud` producono `ask`, in `strict` `deny`. Le citazioni di norma
   compaiono di routine in atti, pareri e articoli: citare la norma sul segreto
   non è violare il segreto.
2. **Lessico contrattuale corrente come pattern forte** — `obbligo-riservatezza`,
   `vincolo-riservatezza`, `segreto-commerciale` (`privacy-check.js:292,297-298`)
   sono clausole boilerplate di NDA e contratti.
3. **Discriminator di contesto troppo ampi** — `DISCRIMINATOR_CONTENT`
   (`privacy-check.js:341-350`) include `avvocato`, `giudice`, `tribunale`,
   `ricorso`, `opposizione`, `procedimento`, `processo`, `giudizio`, `studio
   legale`: praticamente ogni testo legale attiva i pattern deboli, che di fatto
   si comportano come forti.
4. **`userConfig` non arriva via stdin** — confermato sulle [docs ufficiali dei
   plugin](https://code.claude.com/docs/en/plugins-reference): gli hook ricevono
   i valori `userConfig` come variabile d'ambiente `CLAUDE_PLUGIN_OPTION_<KEY>`,
   non nel JSON di stdin. `resolveMode()` (`privacy-check.js:105-125`) legge
   `data.userConfig`: la modalità scelta in `/config` **non ha effetto**; vale
   solo il default `balanced` o il file `.privacy-mode` (che può solo alzare).
5. **Scansione delle scritture locali** — matcher `Write|Edit|MultiEdit` in
   `hooks/hooks.json:6`. Write/Edit su file locali non esfiltrano nulla: il
   contenuto è già nel contesto del modello e la scrittura resta in locale. I
   vettori reali di uscita sono WebFetch, tool MCP e comandi di rete in Bash.
6. **Nessuna esenzione per cartella** — confermata. `.privacy-mode` è nel repo di
   lavoro e può solo alzare la severità (scelta di sicurezza giusta, NEW-1), ma
   per una cartella editoriale non c'è via d'uscita se non disattivare il plugin.
7. **Documentazione non allineata al codice** — `plugin.json:24` descrive
   `balanced` come «blocco indicatori forti» e `cloud` come «solo blocco
   indicatori forti»; nel codice in entrambe le modalità i forti producono `ask`.
   Anche `hooks.json:2` dice «Pattern forti: DENY».
8. **Messaggio generico in Cowork** — l'errore «is blocked in this session — it
   resolves to a protected location or a path outside the connected folder» è un
   messaggio di Cowork sulla protezione del percorso, non testo dell'hook (i
   `reason` dell'hook includono già categoria e modalità). La parte UI è fuori
   dal nostro controllo; rendiamo il `reason` il più diagnostico possibile.

## Approcci considerati

- **A — Ristoro mirato (raccomandato)**: la scansione di default copre solo le
  uscite di rete; riferimenti normativi e clausole boilerplate declassati a
  pattern deboli; discriminator ristretto ai termini identificativi di
  cliente/caso; modalità e nuove opzioni lette dalle env `CLAUDE_PLUGIN_OPTION_*`;
  esenzione per cartelle via `userConfig`; docs allineate. Risolve tutti i punti
  1-7 con modifiche contenute e testabili.
- **B — Solo riduzione dei falsi positivi**: si correggono i pattern ma si
  mantiene la scansione completa di Write/Edit e la modalità resta di fatto
  ignorata. Non risolve l'attrito principale né il punto 4.
- **C — Riscrittura del classificatore** (punteggi, allowlist per progetto,
  nuove modalità): eccessiva per il problema (YAGNI), più superficie di test.

**Scelto A.** Le proposte del segnalante (limitare la scansione predefinita alle
chiamate verso l'esterno, esenzione per cartella configurata nelle impostazioni
del plugin, declassare le citazioni normative, motivo d'errore esplicito,
allineare le descrizioni) sono tutte accolte.

## Design

### 1. Perimetro di scansione per tool (default: solo uscite di rete)

Il matcher in `hooks/hooks.json` resta invariato (`Write|Edit|MultiEdit|
WebFetch|Bash|mcp__.*`); la decisione avviene nello script, così il
comportamento è configurabile senza toccare la configurazione degli hook.

| Tool | Default (`scan_local_writes: false`) | Con `scan_local_writes: true` |
|---|---|---|
| WebFetch | scannerizzato | scannerizzato |
| `mcp__*` (non Ollama) | scannerizzato | scannerizzato |
| Bash | scannerizzato **solo se** il comando contiene un comando di rete | scannerizzato sempre |
| Write / Edit / MultiEdit | **esclusi** (exit 0) | scannerizzati |

- **Comandi di rete** (`NETWORK_COMMANDS`): `curl`, `wget`, `nc`, `ncat`,
  `netcat`, `ssh`, `scp`, `sftp`, `ftp`, `rsync`, `git push`. Espressi come
  regex su word boundary; `git push` come forma composta. Se il comando Bash
  non contiene alcun comando di rete e non referenzia path privilegiati
  (controllo NEW-2 esistente, invariato), la chiamata passa.
- Il controllo sui path referenziati nei comandi Bash (NEW-2,
  `extractBashFilePaths` + `DISCRIMINATOR_PATH`) resta attivo per **tutti** i
  comandi Bash: leggere un fascicolo e metterlo in pipe verso un socket è un
  rischio anche senza `curl` esplicito.

### 2. Classificazione dei pattern

- **Nuovo gruppo REFERENCE_PATTERNS** (deboli): `art-622-cp`, `l-247-2012`,
  `cdf-art-13`, `cdf-art-28`, `art-663-cp`, `art-200-cpp`, `art-103-cpp`.
  Contano solo con discriminator: producono categorie `…+context` (deboli),
  quindi in `cloud` non generano alcun prompt.
- **Declassati da forti a deboli**: `obbligo-riservatezza`, `vincolo-
  riservatezza`, `segreto-commerciale`. Il testo di un NDA reale («obbligo di
  riservatezza verso il cliente Rossi») continua a essere colto dal
  discriminator; la clausola boilerplate («obbligo di riservatezza del
  fornitore») passa.
- **Restano forti** i termini specifici del segreto professionale: `segreto
  professionale`, `segreto del mandato`, `segreto istruttorio`, `segreto
  investigativo`, `segreto d'ufficio`, `riserbatissimo`, `strettamente
  riservato`, `riservatezza professionale`, `tutela del segreto`,
  `comunicazione privilegiata` e i corrispondenti inglesi (`attorney-client
  privilege`, `work product`, ecc.).
- **`DISCRIMINATOR_CONTENT` ristretto** ai termini identificativi di cliente o
  causa: `cliente|clienti|client|mandante|mandanti|dossier|numero di
  pratica|riferimento atto|parte avversa|controparte`. Rimossi i termini di
  lessico giuridico generico (`avvocato*`, `studio legale`, `tribunale`,
  `corte`, `giudice`, `procedimento`, `processo`, `giudizio`, `ricorso`,
  `opposizione`).
- **`DISCRIMINATOR_PATH` invariato** (i nomi di directory restano un segnale
  forte: `clienti`, `fascicoli`, `pratiche`, …).
- Regola dei due pattern deboli invariata.

Verifica sulle riproduzioni del segnalante (con contesto legale generico, nessun
discriminator ristretto): le sei stringhe riportate classificano tutte `null`.

### 3. Configurazione

**Risoluzione della modalità** — nuova priorità in `resolveMode()`:

1. env `CLAUDE_PLUGIN_OPTION_PRIVACY_MODE` (normalizzata lower/trim);
2. `data.userConfig.privacy_mode` / `data.user_config.privacy_mode` da stdin
   (compatibilità Cowork/forward);
3. default `balanced`.

Poi la regola NEW-1 generalizzata: il file `.privacy-mode` può solo **alzare**
la severità rispetto alla modalità base risolta (`MODE_SEVERITY[file] >
MODE_SEVERITY[base]` → file; altrimenti base).

**Nuove chiavi `userConfig` in `plugin.json`**:

- `scan_local_writes` (boolean, default `false`): riattiva la scansione di
  Write/Edit/MultiEdit e di tutti i comandi Bash.
- `privacy_exempt_paths` (stringa, default `""`): elenco di cartelle escluse
  dal controllo, separate da `;`. Scelta della stringa separata invece di
  `multiple: true` perché le liste multiple non compaiono nel pannello `/config`.
  Espansione di `~` via `os.homedir()`; confronto come prefisso con boundary di
  separatore di directory sul path del tool e su `cwd`.

Le env corrispondenti (`CLAUDE_PLUGIN_OPTION_SCAN_LOCAL_WRITES`,
`CLAUDE_PLUGIN_OPTION_PRIVACY_EXEMPT_PATHS`) sono lette dallo script con
fallback al default. Se il path del tool o la `cwd` rientrano in un percorso
esente, l'hook esce subito con 0.

`privacy_mode` in `plugin.json` ottiene anche `options:
["strict","balanced","cloud"]` (picker in `/config`; richiede Claude Code ≥
2.1.271, in linea con le versioni già richieste dal plugin).

### 4. Messaggi di decisione

Ogni `permissionDecisionReason` inizia con un prefisso diagnostico:
`[privacy-check] tool=<tool> mode=<modalita> categoria=<categoria> match="<testo
rilevato>" —` seguito dalla spiegazione in italiano esistente (base giuridica,
azione richiesta). Il `match` è il testo effettivamente catturato dal pattern.
Così, qualunque sia la superficie (Claude Code, Cowork), il motivo è leggibile
nel reason dell'hook. Il messaggio opaco di Cowork resta fuori dal nostro
controllo: documentato nelle note di rilascio.

### 5. Documentazione allineata

- `plugin.json`: descrizione di `privacy_mode` corretta (strict = deny su forti
  e deboli+contesto; balanced = ask su forti e deboli+contesto; cloud = ask solo
  su forti) più le due nuove chiavi.
- `hooks/hooks.json`: descrizione aggiornata (default solo uscite di rete).
- `commands/privacy.md`: tabella modalità corretta, documentazione delle nuove
  opzioni e delle esenzioni, nota su come la modalità viene risolta.
- `skills/privacy-routing/SKILL.md`: tabella pattern aggiornata (riferimenti
  normativi e `segreto commerciale` come CONFIDENZIALE con contesto).
- `CHANGELOG.md`: voce 2.4.6; bump di versione in `plugin.json`.

### 6. Parità con il server Ollama locale

`mcp-servers/ollama/src/privacy.ts` duplica i pattern per il routing locale/cloud
(`classifyPrivacy`). Applicata la stessa riclassificazione (riferimenti
normativi e clausole boilerplate → CONFIDENTIAL con discriminator; discriminator
ristretto) e ricompilato `dist/` con il build esistente. Il server locale non
blocca nulla: la riclassificazione evita solo che articoli che citano norme
vengano instradati a Ollama senza necessità.

## Testing

Estensione di `scripts/privacy-check.test.js` (runner `node` già esistente):

- le 6 stringhe di riproduzione del segnalante classificano `null`;
- i riferimenti normativi classificano `…+context` solo con discriminator e
  `null` senza;
- `obbligo di riservatezza` / `segreto commerciale` senza discriminator →
  `null`, con `cliente` → `+context`;
- `resolveMode` con env `CLAUDE_PLUGIN_OPTION_PRIVACY_MODE` (priorità su file e
  stdin), con `.privacy-mode` che alza ma non abbassa la base esplicita;
- gating per tool: Write/Edit esclusi con default, inclusi con
  `scan_local_writes`; Bash senza comando di rete escluso, con `curl` incluso;
  controllo NEW-2 su path privilegiati attivo anche senza comando di rete;
- esenzione per percorso: path sotto `privacy_exempt_paths` → nessuna decisione;
- reason include prefisso diagnostico con tool/mode/categoria.

I test esistenti che contraddicono il nuovo comportamento vengono aggiornati
(pattern forti che diventano deboli).

## Compatibilità e assunzioni

- **Retrocompatibilità**: chi non tocca la configurazione ottiene meno prompt
  (scritture locali non scannerizzate) e meno falsi positivi. Chi voleva la
  scansione completa la riottene con `scan_local_writes: true`.
- **Sicurezza**: nessun percorso nuovo che abbassa la protezione dal contenuto
  dei file di progetto: le esenzioni vivono solo nelle impostazioni utente del
  plugin (`settings.json`), mai in file della cartella di lavoro. La regola
  NEW-1 è preservata e generalizzata.
- **Cowork**: non verificabile da qui; la risoluzione via env segue la spec
  ufficiale di Claude Code ed è la stessa meccanica usata da altri plugin. Il
  fallback stdin resta per le implementazioni che lo passano.
- **Fuori scope**: nessuna nuova modalità «senza conferme» per i task
  programmati di Cowork; con il nuovo default le conferme residue sono rare e
  circoscritte alle uscite di rete. La UI di Cowork non è modificabile dal
  plugin.
- L'errore «resolves to a protected location…» è di Cowork, non dell'hook:
  documentato nelle note per chiarezza del segnalante.
