[![Version](https://img.shields.io/badge/version-2.6.0-blue)](https://github.com/fedec65/bettercallclaude_italia/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Cowork%20Desktop-orange)](https://claude.ai)
[![Buy Me a Coffee](https://img.shields.io/badge/support-Buy%20Me%20a%20Coffee-yellow)](https://buymeacoffee.com/federicocesconi)

<p align="center">
  <img src="docs/images/logo.png" alt="Meglio Chiamare Claude" width="400">
</p>

<p align="center"><strong>Plugin di Intelligenza Legale Italiana per Cowork Desktop</strong></p>

BetterCallClaude Italia trasforma la ricerca legale, la strategia di causa e la redazione documentale per gli avvocati italiani. Offre integrazione profonda con banche dati giuridiche italiane, analisi bilingue (IT/EN) e assistenza al rilevamento del segreto professionale — 22 agenti, 31 comandi, 19 skill e 10 server MCP che coprono ricerca sui precedenti della Cassazione, ricerca web su portali protetti da login, strategia processuale, analisi avversariale, redazione legale, calcolo dei termini processuali, verifica delle citazioni (`legal-persona-ita_compute_deadlines`, `citation-verify-ita_check_existence`), flussi di lavoro personalizzati, mappe decisionali per pratiche grandi e intelligenza documentale in tutte le 20 regioni italiane. Per chi preferisce elaborare contenuti soggetti al segreto professionale on-premise, il plugin include opzionalmente un wrapper locale Ollama (5 tool); la sua attivazione è una scelta dell’avvocato (è sufficiente installare Ollama e avviare `ollama serve`).

---

## Novità della v2.6.0

- **Ricerca web su portali protetti da login** — nuova skill `legal-web-research`, agente `web-research-specialist` e comando `/bettercallclaude-italia:ricerca-web <sito> <domanda>`. La ricerca avviene nel browser dell'utente, con login **manuale**: il plugin non legge, digita o conserva credenziali. Gate di privacy (strict/balanced/cloud) e allow-list dei siti nel playbook locale.
- **`italgiure-browser` resta il riferimento per l'area riservata ItalGiure** (limiti più stretti: 3-5 interrogazioni per sessione, risultati non salvati); la nuova skill vi rimanda e copre gli altri portali.

## Novità della v2.5.0

- **La ricerca di legittimità riparte** — il server MCP non raggiunge `italgiure.giustizia.it` dal proprio IP di datacenter (la connessione viene scartata a livello TCP, con o senza cookie): la ricerca Cassazione ora gira dal computer dell'utente, con la nuova skill **italgiure-search** che interroga l'indice pubblico SentenzeWeb con `curl` e restituisce la stessa forma di `cassazione_search_massime`. La rete passa da `curl` perché l'hook privacy intercetta `curl` ma non un `node script.js` con HTTP.
- **Nuova skill `italgiure-browser`** per l'area riservata (massime complete, Rv., conformi e difformi) dalla sessione già autenticata del browser, in modalità presidiata: 3-5 interrogazioni per sessione, nessuno scaricamento di massa, risultati non salvati. Non chiede mai credenziali.
- **`userConfig.fonti_esterne`** — l'utente può dichiarare le banche dati giuridiche in abbonamento (es. buddalaw, simpliciter): vengono interrogate in parallelo ai server MCP e ogni pronuncia viene etichettata con la provenienza; una fonte non disponibile in sessione non viene dichiarata consultata.
- **Istruzioni del cookie riscritte** — il plugin non chiede più di copiare cookie: quelli dell'area riservata sono HttpOnly e si leggono dalla scheda Network, non dalla Console. Per la ricerca non serve autenticazione.
- **Strumenti e ricerca normativa corretti** — 7 riferimenti a tool inesistenti nelle skill (`get_article`, `get_decision`, `format_citation`, `parse_citation`, `find_leading_cases`) sono stati sostituiti con i nomi reali, `normattiva_search` usa ora la ricerca avanzata per gli atti nominati, e il link morto nella tabella Reduced Mode è stato corretto.
- **Due checker in CI** — `check-tool-names.js` valida anche i nomi di tool citati nella prosa delle skill (era cieco proprio dove si erano infiltrati) e `check-cassazione-narrative.js` impedisce che la descrizione del canale Cassazione torni a promettere una ricerca che il server non fa.

## Novità della v2.4.0

- **Gate ollama locale opzionale** — il plugin ora include il wrapper locale `ollama` (wrapper MCP STDIO con 5 tool: `ollama_check_status`, `ollama_generate`, `ollama_chat`, `ollama_classify_privacy` offline, `ollama_list_models`); la presenza o assenza del daemon è una scelta dell'avvocato — se non installi Ollama, il wrapper resta esente dall'hook privacy ma i tool restituiscono errore di connessione, il plugin continua a funzionare con i 9 server remoti. Classificatore offline portato dai pattern dell'hook privacy (Art. 622 CP, L. 247/2012, CDF Art. 13 + 28, Art. 200/103 CPP). I tool `mcp__ollama__*` sono sempre esenti in tutte le modalità.
- **`/doctor` riconosce Ollama** — nuovo step opzionale (non-bloccante): prova `ollama_check_status` e riporta "online (N modelli)" oppure "non attivo — avvia `ollama serve`"; non entra nel conteggio 8/9 dei server remoti.

## Novità della v2.3.0

- **Whitelist MCP in doppia convenzione** — ogni tool di ogni server è ora whitelistato come `mcp__plugin_bettercallclaude-italia_<server>__<tool>` **e** `mcp__<server>__<tool>` (68 file rigenerati): sulle installazioni Cowork che registrano i connettori senza prefisso plugin, prima ogni agente falliva con "No such tool available" mentre sessione principale e comandi inline funzionavano.
- **Flusso briefing appiattito** — `/briefing` orchestra il panel specialisti via `Task` nella sessione top-level e conduce la Q&A (Fasi A–F); l'agente coordinatore è un planner puro: Fase A (classificazione + roster panel, JSON) e Fase D (piano di esecuzione o `foggy`). Cowork non concede `Task` ai subagenti annidati: prima il panel degradava silenziosamente in sintesi single-agente.
- **Probe route agent in `/doctor`** — il nuovo Passo 3 verifica che anche gli agenti (non solo la sessione principale) raggiungano i connettori, con diagnosi chiara e istruzioni di aggiornamento.
- **Guard CI** — `scripts/check-tool-names.js` impone la parity delle due convenzioni in CI (1036 voci MCP, tutte appaiate).
---

## User ID per i flussi personalizzati

I flussi che crei con `/crea-flusso` sono salvati sul server `workflows-ita` sotto un **User ID personale**: è quell'ID a determinare quali flussi vedi in `/flusso`. Non serve configurarlo per iniziare — ma va reso permanente per non perdere l'accesso ai flussi.

### Come funziona senza configurazione

Al primo uso di `/crea-flusso` o `/flusso`, se non trova nessun ID configurato, il plugin:

1. Genera un ID casuale della forma `bcc-<16 caratteri esadecimali>`
2. Ne verifica l'univocità sul server (`claim_user_id`)
3. Lo salva in `~/.betterask/config.yaml` e te lo comunica una sola volta

**Attenzione**: Cowork Desktop svuota la home della sandbox a ogni riavvio, quindi il file di config viene cancellato. Senza una configurazione permanente, al riavvio verrebbe generato un **nuovo** ID — e i flussi salvati sotto il vecchio ID non apparirebbero più (non sono persi: restano sul server, ma sotto l'ID precedente).

### Configurazione permanente (consigliata)

Scegli **una** di queste due opzioni:

- **Cowork Desktop** — Vai in **Impostazioni → Generali → Istruzioni per Claude** e aggiungi una riga:
  ```
  BetterCallClaude workflow user ID: bcc-il-tuo-id
  ```
  Se hai già usato i flussi, riusa l'ID generato (te lo ha comunicato il plugin alla prima creazione) per ritrovare i tuoi flussi esistenti.
- **Claude CLI** — Apri le impostazioni del plugin e valorizza **"User ID per i flussi personalizzati"** (`userConfig.user_id`) con lo stesso ID.

### Ordine di risoluzione

Quando servono i tool dei flussi, il plugin cerca l'ID in quest'ordine e usa il primo che trova:

1. Impostazione del plugin (`userConfig.user_id`)
2. Riga `BetterCallClaude workflow user ID: …` nelle istruzioni personalizzate Cowork
3. File `~/.betterask/config.yaml` (cache di comodo, cancellata al riavvio di Cowork)
4. Generazione automatica di un nuovo ID (con claim di univocità lato server)

### Stesso ID su più macchine

Per usare gli stessi flussi su due computer, configura **lo stesso ID** su entrambi. Alla prima operazione sul secondo computer potresti vedere l'avviso "Questo User ID è già registrato sul server": è normale — significa che il namespace esiste già (l'hai creato tu dall'altra macchina) e puoi ignorarlo.

### Privacy dell'ID

L'ID è self-asserted: il server non verifica l'identità, quindi **chiunque conosca il tuo ID può leggere i tuoi flussi**. Trattalo come un segreto leggero: non pubblicarlo. I flussi contengono definizioni di pipeline (agenti, passi, formato dell'output), non dati delle tue cause. Se sospetti che l'ID sia stato esposto, cambialo nelle impostazioni e ricrea i flussi sotto il nuovo ID.

---

## Panoramica

BetterCallClaude Italia fornisce una metodologia strutturata per gestire il lavoro legale con assistenza AI. Il framework è costituito da cinque fasi interconnesse.

<p align="center">
  <img src="docs/images/framework.png" alt="Framework BetterCallClaude Italia" width="600">
</p>

---

## Installazione

1. In Cowork, clicca **Personalizza** > **Sfoglia plugin** > **Personali** > **+** > **Aggiungi marketplace da GitHub**
2. Inserisci `fedec65/bettercallclaude_italia` e clicca **Sincronizza**
3. Clicca **Installa** sulla scheda BetterCallClaude Italia

I server MCP si connettono automaticamente via HTTP. Nessun Node.js, nessuna configurazione locale, nessuna chiave API richiesta.

> **[QUI L'INSTALLAZIONE PASSO PER PASSO](docs/INSTALLAZIONE.md)** -- Guida illustrata con screenshot per ogni passaggio.

---

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `/bettercallclaude-italia:legale` | Gateway intelligente — analizza intento, indirizza a specialisti |
| `/bettercallclaude-italia:legale-5step` | Pipeline completa a 5 fasi: intake → ricerca → strategia → contraddittorio → redazione |
| `/bettercallclaude-italia:legale-obiettivo` | Definisce condizione di successo legale verificabile (Goal Record) |
| `/bettercallclaude-italia:legale-loop` | Esegue ciclo worker-valutatore contro un Goal Record |
| `/bettercallclaude-italia:mappa-legale` | Traccia una pratica grande come mappa decisionale wayfinder |
| `/bettercallclaude-italia:percorso-legale` | Lavora un ticket decisionale di una mappa wayfinder |
| `/bettercallclaude-italia:raffina` | Trasforma query legali vaghe in prompt strutturati |
| `/bettercallclaude-italia:ricerca` | Cerca precedenti giuridici italiani e compila memorie di ricerca |
| `/bettercallclaude-italia:ricerca-web <sito> <domanda>` | Ricerca in sola lettura su portali legali protetti da login |
| `/bettercallclaude-italia:strategia` | Sviluppa strategia processuale con valutazione del rischio |
| `/bettercallclaude-italia:redazione` | Redige documenti legali italiani con corretta formattazione delle citazioni |
| `/bettercallclaude-italia:citazione` | Verifica e formatta citazioni giuridiche italiane |
| `/bettercallclaude-italia:verifica` | Valida citazioni giuridiche italiane in bulk |
| `/bettercallclaude-italia:precedente` | Cerca e analizza precedenti della Cassazione |
| `/bettercallclaude-italia:nazionale` | Analizza secondo il diritto nazionale italiano |
| `/bettercallclaude-italia:regionale` | Analizza secondo il diritto regionale per una regione specifica |
| `/bettercallclaude-italia:contraddittorio` | Esegue analisi avversariale a tre agenti |
| `/bettercallclaude-italia:briefing` | Briefing strutturato pre-esecuzione |
| `/bettercallclaude-italia:flusso` | Definisce ed esegue workflow legali multi-agente (inclusi i flussi salvati) |
| `/bettercallclaude-italia:crea-flusso` | Crea un flusso di lavoro personalizzato riutilizzabile combinando gli agenti del plugin |
| `/bettercallclaude-italia:traduci` | Traduce documenti legali IT/EN |
| `/bettercallclaude-italia:analisi-doc` | Analizza documenti legali |
| `/bettercallclaude-italia:triage-nda` | Triage NDA: classifica GREEN/YELLOW/RED secondo diritto italiano |
| `/bettercallclaude-italia:riassumi` | Consolida output delle pipeline multi-agente |
| `/bettercallclaude-italia:start` | Onboarding — verifica MCP, guida playbook, esempi d'uso |
| `/bettercallclaude-italia:doctor` | Diagnostica server MCP con guida contestuale |
| `/bettercallclaude-italia:configurazione` | Alias per /start (deprecato) |
| `/bettercallclaude-italia:privacy` | Visualizza e cambia la modalita privacy del segreto professionale |
| `/bettercallclaude-italia:versione` | Visualizza versione plugin e stato sistema |
| `/bettercallclaude-italia:aiuto` | Mostra il riferimento completo dei comandi |

### Esempi d'Uso

```
/bettercallclaude-italia:legale Voglio valutare la mia esposizione ai sensi dell'art. 1218 CC

/bettercallclaude-italia:raffina Ho problemi con il mio locatore

/bettercallclaude-italia:ricerca Art. 1218 CC responsabilità contrattuale

/bettercallclaude-italia:strategia Contenzioso locativo a Milano, locatore chiede EUR 200k danni

/bettercallclaude-italia:redazione Contratto di lavoro per ingegnere software a Roma

/bettercallclaude-italia:contraddittorio La clausola di non concorrenza è valida?

/bettercallclaude-italia:flusso litigation-prep Risarcimento danni contro produttore

/bettercallclaude-italia:crea-flusso Pipeline personalizzata: ricerca → strategia → redazione

/bettercallclaude-italia:briefing Prepara lite completa per inadempimento art. 1218 CC, EUR 500K

/bettercallclaude-italia:regionale LOM Giurisdizione Tribunale delle Imprese

/bettercallclaude-italia:legale-5step Analisi completa responsabilità contrattuale art. 1218 CC, EUR 300k

/bettercallclaude-italia:analisi-doc @contratto.pdf Analizza questo contratto di locazione
```

---

## Funzionalità Chiave

- **Sessioni di briefing** — Query complesse attivano intake collaborativo con panel di specialisti.
- **Mappe decisionali (wayfinder)** — Pratiche troppo grandi o troppo nebbiose per un piano statico vengono tracciate come mappa decisionale (`/mappa-legale`) e lavorate un ticket alla volta (`/percorso-legale`) fino all'handoff all'esecuzione.
- **Analisi avversariale** — Workflow a tre agenti: l'avvocato costruisce, l'avversario sfida, l'analista giudiziario sintetizza.
- **Workflow multi-agente** — Pipeline predefinite per due diligence, preparazione contenzioso, ciclo contrattuale, closing immobiliare, più flussi personalizzati creati con `/crea-flusso` ed eseguiti con `/flusso`.
- **Tutte le 20 regioni** — Copertura regionale completa con sistemi giudiziari, formati di citazione e ricerca MCP.
- **Bilingue** — Rilevamento automatico della lingua per IT/EN con corretta terminologia legale.
- **Onboarding guidato** — `/start` verifica la connettivita MCP e guida la creazione del playbook locale.
- **Triage NDA** — Classificazione automatica GREEN/YELLOW/RED secondo criteri del diritto italiano.
- **Goal-loop** — Ciclo iterativo worker-valutatore con separazione dei ruoli e quality gates MCP.
- **Output-as-file** — Risultati lunghi salvati in `bcc-output/`, in chat solo un riassunto.
- **Playbook locale** — Personalizzazione posizioni contrattuali, soglie di rischio, formato output per studio.

---

## Server MCP

Tutti i server si connettono automaticamente dopo l'installazione. Nessuna configurazione richiesta.

| Server | Scopo | Trasporto |
|--------|-------|-----------|
| `normattiva` | Legislazione italiana (1861–oggi) | HTTP |
| `corte-costituzionale` | Sentenze Corte Costituzionale | HTTP |
| `giustizia-amministrativa` | TAR e Consiglio di Stato | HTTP |
| `cassazione` | Giurisprudenza Corte di Cassazione | HTTP |
| `eur-lex-ita` | Diritto UE in lingua italiana | HTTP |
| `legal-citations-ita` | Validazione citazioni normative italiane | HTTP |
| `legal-persona-ita` | Drafting documenti + calcolo termini processuali (CPC/CPP/CPA) | HTTP |
| `citation-verify-ita` | Verifica esistenza citazioni giuridiche | HTTP |
| `workflows-ita` | Flussi di lavoro personalizzati (salvataggio ed esecuzione) | HTTP |
| `ollama` | Elaborazione locale on-premise (opzionale, offline) | STDIO locale |

### Affidabilita Server

| Server | Affidabilita | Note |
|--------|-------------|------|
| normattiva | Alta | API Open Data ufficiale |
| eur-lex-ita | Alta | SPARQL su EUR-Lex |
| legal-citations-ita | Alta | Funziona localmente |
| legal-persona-ita | Alta | Funziona localmente (calcolo termini deterministico) |
| citation-verify-ita | Media | Dipende da ItalGiure e Normattiva |
| workflows-ita | Alta | Se assente, i flussi salvati sono omessi senza errori |
| corte-costituzionale | Bassa | Protezione anti-bot (DataDome) |
| giustizia-amministrativa | Bassa | Portale instabile, timeout frequenti |
| cassazione | Molto bassa | HTTP 403 sistematico |

Quando i server scraper (corte-costituzionale, giustizia-amministrativa, cassazione) restituiscono URL fallback anziche dati strutturati, il plugin fornisce automaticamente link per consultazione diretta tramite ECLI, Google o portale istituzionale.

### Ricerca Cassazione

La ricerca dei precedenti della Cassazione **non richiede autenticazione**: la skill `italgiure-search` interroga l'indice pubblico SentenzeWeb dal computer dell'utente. Il canale server ospitato non può interrogare la fonte e lo dichiara con `autenticazione.cookieValido: false`: `www.italgiure.giustizia.it` scarta a livello di rete le richieste che arrivano da IP di datacenter, quindi il server BetterCallClaude non lo raggiunge.

Le **massime complete** (e Rv., conformi e difformi) richiedono l'area riservata, che si usa dal browser già autenticato con la skill `italgiure-browser` ([ItalGiure area riservata](https://www.italgiure.giustizia.it/new/archives), login con SPID o credenziali). La modalità è presidiata: poche interrogazioni per sessione, nessun download in blocco. **Non serve copiare alcun cookie**: i cookie di sessione sono HttpOnly e la richiesta dati dell'area riservata porta anche un header di autorizzazione Basic, che il plugin non riproduce.

La voce **"Cookie sessione ItalGiure"** nelle impostazioni è riservata alle installazioni che interrogano l'area riservata via server; non è il canale consigliato.

Per istruzioni dettagliate: [docs/cassazione-cookie.md](docs/cassazione-cookie.md)

---

## Siti approvati per la ricerca web

Il comando `/bettercallclaude-italia:ricerca-web` può aprire nel browser dell'utente solo i siti elencati nel playbook locale (`bettercallclaude-italia.local.md`), sezione `## Siti consentiti per la ricerca web`:

- `www.italgiure.giustizia.it` è pre-compilata nel template del playbook come consentita per navigazione generica; per l'area riservata ItalGiure vale la skill `italgiure-browser`.
- I domini dei servizi a pagamento dello studio vanno aggiunti esplicitamente all'elenco.
- I domini non in elenco richiedono conferma prima di ogni apertura.

**Il login è sempre manuale**. Il plugin non legge, digita o conserva credenziali, cookie di sessione, PIN o codici 2FA. L'utente effettua l'accesso nella propria finestra del browser e comunica al plugin quando ha finito.

**Connettore browser**: la ricerca web richiede un connettore browser fornito dall'host (Claude Code, Cowork Desktop o altro). I tool del connettore sono strumenti di host e possono risultare non visibili nelle sessioni in cui l'host filtra per l'allow-list del plugin. Se il browser non è disponibile, il comando proporrà di incollare il testo rilevante o caricare un documento, oppure di abilitare il connettore per la sessione e riprovare.

Per aggiungere un dominio: chiedi a `/bettercallclaude-italia:ricerca-web` di cercare sul sito desiderato; dopo la conferma esplicita, il plugin propone di aggiornare la sezione allow-list del playbook.

---

## Privacy

BetterCallClaude Italia include un hook `PreToolUse` di assistenza al rilevamento del segreto professionale (Art. 622 CP, L. 247/2012, CDF Art. 13). L'hook scansiona le chiamate tool in uscita (Write, Edit, MultiEdit, WebFetch, Bash e tutti i tool MCP) per indicatori di privilegio in italiano e inglese. I tool locali `mcp__ollama__*` (wrapper spedito con il plugin) sono esclusi dal controllo: non trasmettono dati all'esterno e sono sempre esenti, anche in modalità strict.

| Modalità | Pattern forti | Pattern deboli+contesto | Tool locali |
|----------|--------------|------------------------|--------|
| `strict` | **Bloccato** (deny) | **Bloccato** (deny) | Sempre permesso |
|          | Contenuto non privilegiato passa (server MCP cloud usabili) | | |
| `balanced` | **Conferma richiesta** (ask) | **Conferma richiesta** (ask) | Sempre permesso |
| `cloud` | **Conferma richiesta** (ask) | Permesso senza prompt | Sempre permesso |

La modalità si configura con `/bettercallclaude-italia:privacy strict|balanced|cloud` (default: `balanced`). In modalità `strict`, il contenuto privilegiato è bloccato ma le chiamate senza pattern privilegiati passano normalmente (i server MCP cloud restano usabili per la ricerca). Il plugin include già il wrapper locale `mcp__ollama__*` (5 tool, nessuna configurazione richiesta oltre ad avere Ollama installato): per elaborare contenuto privilegiato on-premise in strict mode avvia `ollama serve`. Senza daemon i tool sono comunque esenti ma restituiscono un errore di connessione — il plugin continua a funzionare sui 9 server remoti.

> **Nota**: L'hook privacy è una tecnologia assistiva e non garantisce la conformità all'Art. 622 CP o alla L. 247/2012 / CDF Art. 13. Gli avvocati restano professionalmente responsabili della protezione della confidenzialità del cliente. Il rilevamento è basato su pattern e può essere eluso da formulazioni non standard.

---

## Supporto Linguistico

| Lingua | Codice | Contesto Legale |
|--------|--------|-----------------|
| Italiano | IT | Primario: CC, CP, CPC, Cassazione. Lingua ufficiale di tutti i tribunali italiani. |
| Inglese | EN | Lingua di lavoro con mappatura terminologia giuridica italiana. |

---

## Requisiti

- Claude Cowork Desktop (ultima versione)

---

## Autore

Federico Cesconi — [fedec65/bettercallclaude_italia](https://github.com/fedec65/bettercallclaude_italia)

## Licenza

AGPL-3.0 — Vedi [LICENSE](LICENSE) per i termini completi.

[Supporta il progetto](https://buymeacoffee.com/federicocesconi)

---

## Disclaimer Professionale

BetterCallClaude Italia è uno strumento di ricerca e analisi legale. Tutti gli output prodotti da questo plugin:

- Richiedono revisione e validazione da un avvocato qualificato prima dell'uso.
- Non costituiscono parere legale.
- Possono contenere errori, omissioni o informazioni obsolete.
- Devono essere verificati rispetto a fonti ufficiali (Gazzetta Ufficiale, banche dati giudiziarie, giornali ufficiali).
- Devono essere adattati alle circostanze specifiche di ogni causa.

Gli avvocati mantengono la piena responsabilità professionale per tutti i prodotti del lavoro legale. Questo strumento assiste i professionisti legali ma non sostituisce il giudizio professionale, la verifica indipendente o il dovere di diligenza verso i clienti.
