# Design — Affidabilità della ricerca legale (Cassazione, Normattiva, fonti esterne)

Data: 2026-11-08 — **revisione 2** (la revisione 1 è stata superata dal test di raggiungibilità, indicato R1 nella revisione 1 e da qui in poi chiamato **T1**)
Plugin: `bettercallclaude_italia` (BetterCallClaude Italia) — v2.4.11 → v2.5.0
Server: `~/Dev/BetterCallClaudeMCP_Italy` (branch `dev`) — deploy Railway, regione `europe-west4` (Amsterdam)

## Sommario

Quattro problemi distinti, tutti verificati nel codice e, dove possibile, in produzione:

1. **La ricerca di legittimità parte vuota** — root cause **di rete**, non di logica:
   `italgiure.giustizia.it` scarta a livello TCP le richieste provenienti dal
   datacenter che ospita i server MCP.
2. **`citation-verify-ita` risponde `SOURCE_UNAVAILABLE`** per le sentenze — stessa
   causa, in cascata.
3. **Le skill invocano tool che non esistono** — 7 riferimenti in prosa.
4. **La ricerca legale è bloccata alle fonti del plugin** — la clausola di perimetro
   vieta esplicitamente le banche dati abbonate dell'utente.

A questo si aggiunge la proposta dell'utente di un canale alternativo per l'area
riservata ItalGiure (sessione browser già autenticata).

**Il design della revisione 1 era sbagliato nella diagnosi**, pur essendo corretto
nella meccanica: ipotizzava che bastasse invertire il gate sul cookie. Il test T1 ha
dimostrato che no. La correzione cambia l'architettura: **la query Cassazione deve
girare sulla macchina dell'utente**, non sul server.

---

## Diagnosi — cosa è stato misurato

### Il test di raggiungibilità (T1)

Il test è stato eseguito dal container di produzione, non da una postazione locale:
il server MCP è deployato su Railway in `europe-west4` (Amsterdam, `152.55.185.3`,
AS400940 Railway).

Accesso al container:

```bash
railway ssh --project df2d95e0-4f83-45a8-b40e-f5e6e2a52b27 \
  --environment production --service BetterCallCLaudeMCP-Italia '<comando>'
```

Il container è minimalista: solo `sh`, niente `bash` — i comandi vanno passati su una
riga singola.

### Risultati

| Prova, dal container di produzione | Esito |
|---|---|
| `www.italgiure.giustizia.it` — GET `/sncass/`, **senza cookie** | **timeout TCP 30s** (curl exit 28) |
| `www.italgiure.giustizia.it` — POST anonimo all'endpoint Solr pubblico | **timeout TCP 30s** |
| `www.italgiure.giustizia.it` — con cookie (verifica end-to-end via MCP) | **timeout 61s** (30s × 2 tentativi) |
| `api.normattiva.it` | 409 in **0,23s** ✓ |
| `www.normattiva.it` | 200 ✓ |
| `dati.cortecostituzionale.it/opendata/distribuzione/pronunce` | 200 in **0,19s** ✓ |
| `www.cortecostituzionale.it` | 302 ✓ |
| `openga.giustizia-amministrativa.it/api/3/action/package_search` | 200 ✓ |
| `eur-lex.europa.eu` | 200 ✓ |
| `www.cortedicassazione.it` — homepage | 200 ✓ |
| `www.cortedicassazione.it` — pagine di ricerca | **403**, anche con cookie-jar + User-Agent browser + Referer |

Dalla postazione locale di sviluppo (IP svizzero, Swisscom AS3303): stesso timeout su
`italgiure.giustizia.it`, e lo stesso 403 sulle pagine di ricerca di
`cortedicassazione.it`.

### Le quattro conclusioni

**C1 — Il blocco è specifico di `italgiure.giustizia.it`.** Non è geo-blocking: dallo
stesso container tutti gli altri siti giudiziari italiani rispondono in decimi di
secondo. `italgiure` scarta in modo selettivo.

**C2 — Il blocco è a livello TCP, prima del TLS.** Il SYN non riceve risposta: non è
un problema di certificato, di header, di `User-Agent` o di cookie. Il `rejectUnauthorized:
false` che il server imposta è una conseguenza collaterale di una catena di
certificazione non standard, non
la causa.

**C3 — Il blocco colpisce gli IP di datacenter e anche quelli non italiani.** Il
portatile di sviluppo (Svizzera) è bloccato esattamente come il container (NL). Non
è quindi una questione di «datacenter vs. residenziale»: è una whitelist di IP.

**C4 — L'utente italiano non è bloccato.** L'utente ha interrogato lo stesso endpoint
dal proprio browser e ricevuto ordinanze del 2025 con sezione, presidente e
relatore. Il canale dal PC dell'utente funziona.

### La conseguenza sul design

La revisione 1 proponeva di invertire il gate sul cookie in
`italgiure-client.ts`: senza cookie si provava il Solr pubblico invece di rinunciare.
**Quella modifica sarebbe stata inutile**: la richiesta pubblica è la stessa che va in
timeout. Il server continuerebbe a restituire zero risultati, solo con un messaggio
diverso.

Il gate era il **sintomo**; l'egress è la **causa**. La correzione non è nel codice del
server, è nel *dove* viene eseguita la query.

### Raggio d'impatto

Solo il canale ItalGiure è affetto. Tutto il resto del plugin funziona dal server:

| Canale | Stato dal server | Note |
|---|---|---|
| Normattiva (normattiva_search, _advanced, _get_atto) | ✓ | `api.normattiva.it` risponde |
| Corte Costituzionale (corte-costituzionale_*) | ✓ | `dati.cortecostituzionale.it` risponde |
| Giustizia Amministrativa (giustizia-amministrativa_*) | ✓ | `openga.giustizia-amministrativa.it` risponde |
| EUR-Lex (eur-lex-ita_*) | ✓ | |
| Formattazione citazioni (legal-citations-ita_*) | ✓ | non tocca ItalGiure |
| Verifica esistenza **normativa** (citation-verify-ita) | ✓ | ramo Normattiva |
| Verifica esistenza **sentenze** (citation-verify-ita) | ✗ | ramo ItalGiure: `check-existence.ts:169` |

---

## Problemi verificati nel plugin

### P1 — La contraddizione sulle istruzioni del cookie è in produzione

La descrizione del tool `cassazione_search_massime` **in produzione** (verificata con
`tools/list` su `https://mcp-italia.bettercallclaude.ch/cassazione/mcp`) recita:

> «🔐 AUTENTICAZIONE: richiede un cookie di sessione ItalGiure attivo… Per ottenere il
> cookie: accedi a https://www.italgiure.giustizia.it/sncass/ con SPID o credenziali
> professionali, poi **esegui document.cookie nel browser**.»

La documentazione del plugin dice l'opposto: `docs/cassazione-cookie.md:24` e
`README.md:213` spiegano che i cookie sono HttpOnly e che la Console restituisce una
stringa vuota. La stessa contraddizione esiste in `italgiure-client.ts`, nei rami
«cookie assente» e «errore 401/403» del campo `fallback.istruzioni`.

Il modello riceve entrambe le istruzioni nello stesso contesto.

### P2 — La procedura del cookie descrive un'interfaccia che non esiste più

`docs/cassazione-cookie.md` (righe 5, 21, 22, 24), `agents/researcher.md:74`,
`skills/italian-legal-research/SKILL.md:71` e la descrizione `italgiure_cookie` nel
manifest dicono tutti:

- di cercare `PHPSESSID` come «il cookie che attesta il login»;
- di individuare «una chiamata dati dell'area riservata (un percorso `/new/...`)»;
- che i cookie inviati siano «`PHPSESSID=...; sessonly=1; lang=it; cookiesession1=...`».

Segnalazione dell'utente sulla nuova area riservata: **`PHPSESSID` non c'è più**,
resta solo `cookiesession1`, l'autenticazione passa per un header `Authorization: Basic`
(username e password in base64) presente a ogni chiamata, e le richieste dati sono su
`/api`.

Conseguenza operativa: chi segue la procedura cerca un cookie inesistente, conclude
che la propria configurazione sia sbagliata, e non ha modo di capire che il problema è
a monte.

### P3 — Tool inesistenti citati nelle skill

| File:line | Citato | Esiste davvero |
|---|---|---|
| `skills/italian-legal-research/SKILL.md:77` | `get_article(statute_number, article)` | `normattiva_get_atto` |
| `skills/italian-legal-research/SKILL.md:81` | `get_decision(id)` | `corte-costituzionale_get_sentenza` |
| `skills/italian-legal-research/SKILL.md:85` | `get_decision(id)` | `giustizia-amministrativa_get_sentenza` |
| `skills/italian-legal-research/SKILL.md:89` | `get_article(act_number, article)` | `eur-lex-ita_get_atto_celex` |
| `skills/italian-legal-research/SKILL.md:107` | `format_citation(citation, target_language)` | `legal-citations-ita_format` |
| `skills/italian-legal-research/SKILL.md:108` | `parse_citation(citation)` | `legal-citations-ita_parse` |
| `skills/italian-legal-strategy/SKILL.md:38` | `find_leading_cases(query)` | `cassazione_search_massime` |

Il modello che segue la skill chiama tool che non esistono e riceve «No such tool
available»: la fase di ricerca si interrompe a metà.

**Perché non è già stato visto**: `scripts/check-tool-names.js` valida il frontmatter
`tools:` di agenti, comandi e skill — controlla la parità fra le due convenzioni di
naming e l'esistenza nel catalogo `SERVER_TOOLS`. È **cieco alla prosa**, che è dove
vivono tutti e sette i riferimenti qui sopra.

### P4 — `normattiva_search` con parole chiave restituisce atti estranei

`mcp-servers/normattiva/src/tools/search.ts` chiama
`/bff-opendata/v1/api/v1/ricerca/semplice` con `orderType` di default `recente`. Su
«codice della crisi d'impresa» l'API restituisce gli ultimi due decreti in Gazzetta
invece del codice. La ricerca avanzata per estremi funziona.

`normattiva_search_advanced` **già supporta** `titoloRicerca`, `denominazioneAtto` e
`vigenza` (`search-advanced.ts:20-30`) — la skill semplicemente non li usa mai.

Nota aggiuntiva: `normattiva_get_atto` **non restituisce il testo degli articoli**.
Reimplementa una ricerca avanzata non filtrata e ne estrae i metadati
(`get-atto.ts:12-45`). La promessa «recupera testo articolo» non è mai stata
soddisfatta da quel tool.

### P5 — Le fonti esterne sono vietate dalla clausola di perimetro

**24** file in `commands/` contengono la clausola. La forma canonica è:

> «**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude
> Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin.»

Elenco completo (24): `analisi-doc.md`, `briefing.md`, `citazione.md`,
`contraddittorio.md`, `cronologia-legale.md`, `flusso.md`, `legale-5step.md`,
`legale-loop.md`, `legale-obiettivo.md`, `legale.md`, `mappa-legale.md`, `nazionale.md`,
`percorso-legale.md`, `precedente.md`, `raffina.md`, `redazione.md`, `regionale.md`,
`riassumi.md`, `ricerca.md`, `start.md`, `strategia.md`, `traduci.md`, `triage-nda.md`,
`verifica.md`.

Ne esistono tre varianti di formulazione, da aggiornare tutte:

| Variante | File |
|---|---|
| «**Ambito plugin**: usa esclusivamente … Non delegare a skill o agenti esterni al plugin.» | 20 file |
| «Per tutte le attività di … usa **esclusivamente** agenti, skill e server MCP … Non delegare lavoro legale a skill, agenti o strumenti generici o esterni al plugin.» | `legale.md`, `legale-5step.md`, `start.md` |
| «Per tutto il lavoro sui ticket, usa **esclusivamente** agenti, skill e server MCP di …» | `percorso-legale.md`, `mappa-legale.md` |

La clausola è nei **comandi**, non nelle skill né negli agenti (verificato: nessun
`agents/*.md` contiene «esclusivamente»).

### P6 — Un link morto nella tabella Reduced Mode

`skills/italian-legal-research/SKILL.md`, tabella «Modalità ridotta», rimanda a
`https://sentenzeweb.italgiure.giustizia.it` — **host che non risolve**. L'host valido
è `www.italgiure.giustizia.it/sncass/`. Non segnalato dall'utente.

---

## Obiettivi

- **O1** — La ricerca di legittimità restituisce risultati, su qualunque postazione
  ammessa da ItalGiure.
- **O2** — L'esistenza di una sentenza citata è verificabile.
- **O3** — Nessuna skill invoca un tool inesistente; la regressione non può ripetersi.
- **O4** — La documentazione e i messaggi del server non promettono cose false e non si
  contraddicono.
- **O5** — L'utente può dichiarare le proprie banche dati e il plugin le interroga
  senza che ciò configuri il divieto di cui a P5.
- **O6** — Esiste un canale per l'area riservata per chi non vuole o non può fornire
  credenziali: la sessione browser già autenticata, in modalità presidiata.

## Non obiettivi

- **N1** — Non si automatizza il login a ItalGiure (SPID, OTP). Vietato dalle regole
  AGID e incompatibile con il segreto professionale.
- **N2** — Non si chiedono all'utente credenziali in chiaro da salvare su server di
  terzi.
- **N3** — Non si integrano BuddaLaw, Simpliciter o altre banche dati a contratto:
  sono abbonamenti dell'utente, ciascuno con le sue credenziali. Il plugin non le
  tocca.
- **N4** — Non si implementa lo scraping massivo dell'area riservata.
- **N5** — Non si indicizzano i dati aperti della Cassazione: opzione di lungo periodo,
  fuori perimetro (si veda «Opzioni scartate»).
- **N6** — Il server MCP non viene modificato per supportare fonti esterne: la
  proposta 1 è interamente lato plugin.

---

## Design

### Track A — Plugin (`bettercallclaude_italia`)

#### A1 — Tool names inesistenti: fix e prevenzione

**Fix immediato**: correggere i 7 riferimenti della tabella in P3 con i nomi reali dal
catalogo `SERVER_TOOLS` (`scripts/generate-tool-frontmatter.js:29-40`).

**Prevenzione**: estendere `scripts/check-tool-names.js` con un controllo sulla
**prosa** di agenti, comandi e skill. Il controllo cerca i nomi di tool invocati come
funzioni e li verifica contro `SERVER_TOOLS`.

Il controllo è definito come segue, in modo da non generare falsi positivi:

1. si cercano in tutto il corpo (fuori dal frontmatter) i token del tipo
   backtick + identificatore in minuscolo (con `_` o `-`) + parentesi tonda aperta,
   chiuso da backtick — cioè un nome di tool invocato come una funzione;
2. ogni token va verificato contro l'unione dei nomi presenti in `SERVER_TOOLS`
   (tutti i server, non solo quelli del file in esame);
3. un token assente dal catalogo è un errore.

Verifica di fattibilità eseguita sullo stato attuale del plugin: i token di questo
tipo presenti in `skills/`, `agents/` e `commands/` sono 13, di cui 5 non esistono —
`find_leading_cases`, `format_citation`, `parse_citation`, `get_article`,
`get_decision` — e gli altri 8 sono tutti validi. La regola produce quindi **zero
falsi positivi** sul corpus corrente e intercetta esattamente i riferimenti rotti
riportati in P3.

Nota: i riferimenti validi citati in prosa usano il nome **bare** del tool (es.
`normattiva_search`), non il nome qualificato. Il controllo confronta contro il nome
bare, che è quello che il modello deve invocare.

#### A2 — Nuova skill `italgiure-search`: la query Cassazione dal client

È il nucleo del redesign. La skill esegue la query Solr pubblica **dalla macchina
dell'utente**, dove l'IP è ammesso, e restituisce la stessa forma di
`cassazione_search_massime`, così ogni skill a valle (`citation-content-verify`,
`legal-evaluator`, pipeline 5step) funziona senza modifiche.

Flusso:

1. **Costruzione della query Solr** — stessa semantica di
   `buildSolrQuery` nel server (`italgiure-client.ts:65-96`): il testo libero viene
   racchiuso in parentesi ed escaped; `materia` diventa `kind:"snciv"` o
   `kind:"snpen"`; `anno` diventa `anno:"YYYY"`; `tipo` diventa
   `tipoprov:"Sentenza"|"Ordinanza"|"Decreto"`; le clausole sono unite con `AND`.
   Il testo che contiene già sintassi Solr viene usato così com'è.
2. **Chiamata** — `POST` all'endpoint
   `https://www.italgiure.giustizia.it/sncass/isapi/hc.dll/sn.solr/sn-collection/select?app.query`
   con `q`, `rows`, `start`, `wt=json`, `fl` e `sort=pd desc,datdec desc`, via `Bash`
   e `curl`.
3. **Parsing** — la risposta JSON (`response.numFound`, `response.docs[]`) viene
   trasformata nella forma standard: `estremi`, `sezione`, `tipo`, `dataDecisione`,
   `dataDeposito`, `urlPdf`, `id`.
4. **Provenienza** — ogni risultato porta con sé la provenienza
   (`Fonte: ItalGiure (SentenzeWeb pubblico), interrogato dal PC dell'utente`).

**Campi richiesti (`fl`)**: il server ne richiede nove
(`id,filename,szdec,tipoprov,datdec,numdec,anno,kind,datdep`). L'utente ha osservato
che la risposta porta anche **sezione, presidente e relatore**: la skill deve chiedere
un insieme di campi più ampio. I nomi esatti dei campi Solr vanno confermati alla
prima esecuzione su IP ammesso — è un open item, non un assunzione (vedi «Assunzioni»).

**Privacy.** La chiamata client-side è **più protettiva** di quella via server MCP: la
query non transita mai per l'infrastruttura cloud di BetterCallClaude, ma va
direttamente al Ministero della Giustizia. L'hook privacy
(`scan_local_writes` / controllo delle chiamate in uscita) scansiona già i comandi
`Bash` di rete, quindi la protezione del segreto professionale resta attiva e il
termine di ricerca non viaggia verso terzi. La skill deve istruire a non includere mai
il testo della bozza nella query — solo i termini di ricerca.

**Degradazione.** Se la `curl` va in timeout, la skill dice esplicitamente che
l'IP corrente non è ammesso da ItalGiure e offre: il canale browser (A3), i link di
fallback, e — se l'utente è in un Paese ammesso — di riprovare.

**Nessuna gestione del cookie.** La skill interroga l'indice pubblico e non gestisce
l'area riservata. Il cookie è materia di A3 e della documentazione (A4).

#### A3 — Nuova skill `italgiure-browser`: l'area riservata, in modalità presidiata

Serve per ciò che il canale pubblico non dà: **massime complete, Rv., conformi e
difformi**, e la ricerca per estremi.

Tre precondizioni, **tutte** necessarie:

1. **Un connettore browser è disponibile in sessione.** Rilevato per disponibilità
   degli strumenti, non hardcoded a un vendor: deve funzionare con Chrome DevTools
   MCP, con Claude in Chrome, o con altro connettore compatibile.
2. **L'utente ha autorizzato esplicitamente la modalità** nella conversazione
   corrente. Nessuna autorizzazione implicita, nessuna autorizzazione ereditata.
3. **L'utente risulta autenticato.** La skill lo **verifica** guardando lo stato reale
   della pagina (che il form di ricerca dell'area riservata sia presente e
   utilizzabile), non lo presume.

Comportamento:

- naviga all'area riservata;
- esegue **poche** interrogazioni (tetto ~3-5 per sessione, ritmo umano, nessun
  parallelismo): lo scopo è evitare di urtare l'anti-bot e le condizioni d'uso;
- nessuno scaricamento massivo, nessuna estrazione di interi corpus;
- estrae estremi, sezione, numero, data, numero di massima, Rv.;
- **restituisce la stessa forma di `cassazione_search_massime`**.

Privacy: la skill **non chiede mai** username o password e non le trasmette; le
credenziali non lasciano mai il browser; la modalità è compatibile con
`privacy_mode: strict`, perché il testo non esce dalla macchina dell'utente.

**Open item**: il mapping dei campi della nuova interfaccia non è noto. La ricerca
**per parole** è confermata funzionante; quella **per estremi** non lo è. La skill
parte con una fase di *discovery* — al primo uso cattura uno snapshot della pagina,
identifica i campi e memorizza il mapping in `references/` — e il mapping viene
consolidato dopo la prima sessione reale.

#### A4 — Documentazione del cookie riscritta

`docs/cassazione-cookie.md`, `agents/researcher.md:74`,
`skills/italian-legal-research/SKILL.md:71`, la descrizione `italgiure_cookie` nel
manifest e il link morto in tabella Reduced Mode (P6) vengono riscritti con questa
impostazione:

1. **Il canale pubblico non richiede autenticazione e non passa dal server.** La
   skill `italgiure-search` interroga l'indice pubblico direttamente dal PC
   dell'utente. Il cookie non c'entra. È la prima cosa che la guida dice.
2. **Il cookie serve solo per l'area riservata** — massime complete, Rv., conformi e
   difformi — e serve **al browser**, non al plugin. La modalità per ottenerlo è
   quella di A3.
3. **La procedura non dipende dal nome del cookie.** Si cerca l'intestazione
   `Cookie` **completa** di una richiesta dati dell'area riservata, qualunque ne sia
   il nome. Non si pretende più che `PHPSESSID` sia presente.
4. **Il path non è hardcoded.** Si indica di individuare «la richiesta che restituisce
   i dati della ricerca», non più `/new/...`.
5. **`Authorization: Basic`** viene spiegato per quello che è: il meccanismo di
   autenticazione dell'area riservata, che il plugin non replica e non deve ricevere.
6. **Il link corretto** è `https://www.italgiure.giustizia.it/sncass/`; quello con
   l'host `sentenzeweb.` viene rimosso.

#### A5 — Instradamento Normattiva nella skill

`skills/italian-legal-research/SKILL.md` impara a distinguere il tipo di ricerca:

| Intento | Tool | Parametri |
|---|---|---|
| atto nominato («codice della crisi d'impresa», «legge 219/2017») | `normattiva_search_advanced` | `denominazioneAtto` / `titoloRicerca`, `vigenza` |
| parole chiave generiche | `normattiva_search` | `query` |
| testo di un articolo | — | **non disponibile**: `normattiva_get_atto` restituisce metadati dell'atto, non gli articoli |

La skill smette di promettere «recupera testo articolo» e dichiara il limite: il
plugin ottiene metadati e link ELI dell'atto; il testo dell'articolo si legge sul link
o tramite `WebFetch` della pagina ELI, se l'utente lo desidera.

#### A6 — Proposta 1: fonti esterne dell'utente

**Voce di manifest** (in `.claude-plugin/plugin.json`, `userConfig`):

```json
"fonti_esterne": {
  "type": "string",
  "title": "Fonti esterne (opzionale)",
  "description": "Banche dati giuridiche abbonate da interrogare in parallelo ai server MCP di BetterCallClaude, separate da virgola (es. buddalaw, simpliciter). Se il connettore corrispondente è presente in sessione viene interrogato e ogni pronuncia viene etichettata con la banca dati di provenienza. Se il connettore manca la ricerca prosegue senza errori.",
  "default": "",
  "sensitive": false
}
```

Non `sensitive`: sono nomi di fonti, non credenziali. Le credenziali restano nei
connettori dell'utente e il plugin non le tocca.

**Modifica ai 24 comandi.** L'eccezione va **inline** nella stessa clausola che
contiene il divieto, perché è lì che il modello la legge:

> **Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude
> Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin.
> **Eccezione — fonti esterne**: se `userConfig.fonti_esterne` è valorizzato, le banche
> dati ivi elencate vanno interrogate **in parallelo** ai server MCP di BetterCallClaude,
> e ogni pronuncia va etichettata con la banca dati di provenienza; se il connettore
> corrispondente non è presente in sessione, si prosegue senza errori e **senza
> dichiarare quella fonte come consultata**.

La ripetizione è voluta: la robustezza dipende dalla vicinanza tra divieto ed
eccezione, non da una regola centralizzata che il modello potrebbe non caricare.

**Modifica alle skill** `italian-legal-research`, `italian-legal-strategy`,
`citation-content-verify`:

1. leggere `userConfig.fonti_esterne`;
2. per ogni fonte elencata, verificare se il connettore corrispondente è disponibile
   in sessione; se sì, interrogare in parallelo; se no, proseguire senza segnalarlo
   come consultato;
3. etichettare la provenienza di ogni pronuncia;
4. segnalare che le query inviate a fonti esterne **escono dalla macchina** e passano
   dal controllo privacy come qualunque altra chiamata in rete.

**Formato della provenienza**: accanto a ciascun precedente, un marcatore —
`Fonte: BuddaLaw`, `Fonte: ItalGiure (SentenzeWeb pubblico)`, `Fonte: ItalGiure
(area riservata)`. In coda al documento, l'elenco delle fonti consultate, con la
distinzione fra «consultata» e «non disponibile in sessione».

### Track B — Server MCP (`BetterCallClaudeMCP_Italy`)

Il server **non** diventa il canale di ricerca Cassazione. Il suo ruolo cambia: da
«fonte dei dati» a «fonte dei dati per tutti i canali che funzionano, e segnalatore
onesto per quello che non funziona».

#### B1 — Messaggi di fallback onesti

In `italgiure-client.ts`, i rami di fallimento smettono di raccontare una diagnosi
sbagliata:

- via **«Esegui document.cookie»** → la procedura corretta è copiare l'intestazione
  `Cookie` dalla scheda Network (i cookie sono HttpOnly, la Console restituisce una
  stringa vuota);
- via **«Alternativa gratuita senza login: SentenzeWeb (…sentenze dal 2012)»** → per il
  server non è un'alternativa: l'endpoint è lo stesso e va in timeout. Al suo posto,
  l'indicazione che il canale client-side esiste;
- aggiunta della diagnosi vera: **l'IP del datacenter è scartato da ItalGiure a
  livello TCP**, indipendentemente dal cookie.

La formulazione di riferimento:

> «Il server non riesce a raggiungere ItalGiure: le richieste dal datacenter vengono
> scartate a livello di rete (timeout), con o senza cookie. Usare la ricerca lato
> client (skill italgiure-search) oppure la modalità browser (skill
> italgiure-browser).»

#### B2 — Descrizioni dei tool

`cassazione_search_massime` e `cassazione_get_sentenza` non devono più presentarsi come
«Requires an active ItalGiure session cookie». La descrizione va riscritta indicando
che l'accesso è soggetto al blocco per-IP e che il percorso supportato è lato client.

#### B3 — `citation-verify-ita`: degradazione esplicita per le sentenze

`check-existence.ts:169` chiama `searchItalgiure`, che va in timeout: le sentenze
oggi finiscono in `SOURCE_UNAVAILABLE` senza spiegare perché. La modifica:

- per una citazione **normativa** il comportamento resta identico (il ramo Normattiva
  funziona);
- per una citazione **di sentenza**, quando la fonte non è raggiungibile, l'errore
  passa da un generico `SOURCE_UNAVAILABLE` a un messaggio che dice cosa è successo
  e cosa fare: verificare l'esistenza con la skill client-side `italgiure-search`
  usando gli estremi (numero, anno, sezione).

Il tool server non viene sostituito, ma smette di mentire: un errore che non spiega la
causa è indistinguibile da un difetto del prodotto.

#### B4 — Cosa non si fa sul server

Il server **non** riceve il gate inversion della revisione 1: la richiesta pubblica
andrebbe in timeout esattamente come quella con cookie. Non si aggiungono i campi
`fonte` / `massimeComplete`: non ci sono risultati da etichettare. Non si implementa
l'indicizzazione dei dati aperti (N5).

---

## Flusso dati — ricerca di legittimità

```
utente: "cerca precedenti su responsabilità medica"
  │
  ├─ skill italian-legal-research
  │    ├─ normattiva_search_advanced(titoloRicerca="codice della crisi d'impresa", vigenza=…)
  │    │    → atto + codiceRedazionale + dataGU + urlNormattiva     [server, ✓ funziona]
  │    ├─ skill italgiure-search                                     [CLIENT, dal PC dell'utente]
  │    │    ├─ costruisce la query Solr (stessa semantica del server)
  │    │    ├─ curl POST → italgiure.it/sncass/…/sn.solr  → timeout?  no: JSON
  │    │    └─ { massime: [...], totale: 42, fonte: "SentenzeWeb pubblico (client)" }
  │    ├─ fonti_esterne? → connettore buddalaw presente? → query in parallelo
  │    │    → risultati etichettati Fonte: BuddaLaw
  │    └─ fonte: ItalGiure (area riservata)? → serve la modalità browser (A3)
  │
  ├─ citation-content-verify
  │    ├─ citazione normativa → citation-verify-ita_check_existence  [server, ✓ funziona]
  │    └─ citazione di sentenza → skill italgiure-search per estremi  [client]
  │         → esiste / non esiste, con la provenienza
  │
  └─ output: sintesi + precedenti con provenienza + quadro normativo + disclaimer
```

## Gestione degli errori

| Situazione | Comportamento |
|---|---|
| `curl` client-side va in timeout | la skill dice che l'IP corrente non è ammesso; offre browser mode, link di fallback, e di riprovare |
| `curl` client-side risponde con `numFound: 0` | risultato vuoto onesto, con la query usata, per distinguere «nessun risultato» da «canale irraggiungibile» |
| connessione del server a ItalGiure | messaggio B1: blocco per-IP, non mancanza di cookie |
| verifica di una sentenza dal server | `citation-verify-ita` dice perché è irraggiungibile e rimanda alla verifica client-side |
| connettore fonti esterne assente | si prosegue; la fonte è «non disponibile in sessione», non «consultata» |
| browser non autorizzato / non autenticato | fallback al canale pubblico client-side |
| tool inesistente citato in prosa | intercettato dal checker, fallisce la CI |

## Piano di verifica

### Plugin (`bettercallclaude_italia`)

- `node scripts/check-tool-names.js` — deve passare, e deve **fallire** su un file di
  fixture che cita in prosa un tool inesistente (test di regressione);
- `node scripts/validate-plugin.js` — verde;
- `npm test` (privacy-check) — verde;
- controllo grep: zero occorrenze di `get_article`, `get_decision`, `find_leading_cases`
  nelle skill e negli agenti; zero occorrenze di `document.cookie` come **istruzione**
  (i riferimenti spiegativi restano leciti e vanno verificati a mano);
- i 24 comandi contengono tutti l'eccezione fonti esterne nella stessa clausola di
  perimetro che contiene il divieto;
- nessun link a `sentenzeweb.italgiure.giustizia.it`.

### Server (`BetterCallClaudeMCP_Italy`)

- `mcp-servers/cassazione/src/__tests__/italgiure-client.test.ts`:
  - il messaggio di fallback **non** contiene più `document.cookie`;
  - il messaggio di fallback **non** promette più SentenzeWeb come alternativa per il
    server, e nomina il blocco per-IP;
  - `istruzioni` nella descrizione del tool non contiene più «Requires an active
    ItalGiure session cookie».
- `mcp-servers/citation-verify-ita/src/__tests__/`:
  - citazione **normativa** → comportamento invariato, `exists` determinato;
  - citazione **di sentenza** con fonte irraggiungibile → errore che nomina la causa
    (blocco per-IP) e rimanda alla verifica client-side, non un `SOURCE_UNAVAILABLE`
    anonimo.

### Verifica end-to-end

Su una macchina con IP ammesso (l'utente, in Italia) e il plugin aggiornato:

1. una ricerca di legittimità senza cookie restituisce risultati con provenienza
   `SentenzeWeb pubblico (client)`;
2. la verifica di una sentenza citata per estremi restituisce esistenza e provenienza;
3. la verifica di una citazione normativa continua a passare dal server.

---

## Rollout

Due release separate. Il plugin non dipende da nulla di nuovo lato server: i campi
`fonte` / `massimeComplete` della revisione 1 sono stati abbandonati, quindi il
plugin è pubblicabile **prima** dello sblocco del server.

| # | Contenuto | Repository | Esito |
|---|---|---|---|
| **Rel-1** | A1, A2, A3, A4, A5, A6 → v2.5.0 + CHANGELOG | `bettercallclaude_italia` (branch `main`) | ricerca di legittimità funzionante dal PC dell'utente |
| **Rel-2** | B1, B2, B3 + test | `BetterCallClaudeMCP_Italy` (branch `dev`) → deploy Railway | i messaggi smettono di mentire |

Rel-2 non blocca Rel-1: Rel-1 è ciò che **ripara** la ricerca, Rel-2 è ciò che **rende
onesto** il server. Se Rel-2 slittasse, la ricerca funzionerebbe comunque.

---

## Opzioni scartate

**Egress italiano per il server** (VPS in Italia, proxy, IP dedicato). Unica soluzione
che risolve il problema anche per gli utenti non italiani e per gli agenti automatici.
Scartata perché introduce un componente infrastrutturale con costi e gestione, e
perché non è risolvibile dall'interno del plugin. Resta aperta per il futuro.

**Indicizzazione dei dati aperti della Cassazione** (`dati.gov.it`, raggiungibile dal
server — 302). Il servizio ha già un volume da 50 GB e un Postgres. Darebbe un canale
server-side stabile e massime complete. Scartata perché è un progetto di ingestione
non banale (scaricare, normalizzare, indicizzare, mantenere aggiornato) e quindi
fuori dal perimetro di questo intervento. È la strada giusta se il vincolo «la query
deve girare dal client» diventa un problema.

**MCP server locale nel plugin** (come `mcp-servers/ollama`). Interessante: darebbe
un'API pulita e JSON strutturato anziché una `curl` guidata dal modello. Scartato
perché richiede che l'utente abbia node e faccia la build (`npm run build:ollama`),
mentre la soluzione scelta funziona senza installazione.

---

## Rischi

**R1 — La query client-side non funziona per utenti fuori dall'Italia.** Il blocco di
ItalGiure colpisce anche gli IP svizzeri (verificato). La skill degrada in modo
chiaro, ma per un utente non italiano la ricerca Cassazione resta indisponibile.
Mitigazione possibile: il canale browser, che dipende dal percorso di rete dell'utente
e dal proxy aziendale.

**R2 — I campi Solr dell'area pubblica non sono stati verificati.** La skill chiede
`presidente` e `relatore` sulla base dell'osservazione dell'utente; i nomi esatti dei
campi vanno confermati alla prima esecuzione su IP ammesso. Fallo: la skill restituisce
i campi base (estremi, sezione, data, PDF) e omette quelli non confermati.

**R3 — Il mapping dei campi della nuova UI non è noto** (A3). Gestito dalla fase di
discovery; la ricerca per estremi resta non supportata fino a mappatura completa.

**R4 — Il conteggio dei 24 comandi con clausola di perimetro** va mantenuto: una
dimenticata lascia un comando che vieta ancora le fonti esterne. Le tre varianti di
formulazione vanno trattate come tre casi distinti.

**R5 — Il catalogo `SERVER_TOOLS` del plugin è una copia manuale** di quello del server
(`scripts/generate-tool-frontmatter.js:29-40`). Un tool nuovo sul server che non
viene aggiunto al catalogo fa fallire il checker. Fonte di manutenzione nota, non
risolta in questo intervento.

**R6 — Il blocco di ItalGiure può cambiare.** Se in futuro lo sblocco cambia, il
percorso client-side resta valido e non va rimosso; il server torna semplicemente a
funzionare. Il design è robusto a questo.

---

## Assunzioni

- **AS1** — La skill `italgiure-search` viene eseguita sulla macchina dell'utente, e
  l'IP di quell'utente è ammesso da ItalGiure. Confermato per l'utente che ha
  segnalato il problema; non garantito in generale (vedi R1).

  **Decisione dell'utente (2026-11-08): l'assunzione viene mantenuta.** Il canale
  client-side copre gli utenti su IP ammesso — oggi, gli utenti in Italia. Coprire
  anche gli utenti fuori dall'Italia richiede l'egress italiano del server, che resta
  un'opzione futura documentata, fuori dal perimetro di questo intervento. La
  skill deve degradare in modo esplicito quando l'IP corrente non è ammesso, e il
  messaggio deve nominare l'opzione futura.
- **AS2** — L'endpoint Solr pubblico accetta richieste anonime senza `Cookie`.
  Fondamentale perché A2 non gestisce il cookie; l'evidenza indiretta è che lo stesso
  endpoint è quello che l'utente ha interrogato con successo dal proprio browser.
  Da confermare alla prima esecuzione.
- **AS3** — Il plugin può leggere `userConfig` al momento dell'esecuzione della skill.
  Da verificare in fase di implementazione che il valore sia effettivamente disponibile
  al modello senza un tool dedicato.
- **AS4** — I connettori delle banche dati esterne (BuddaLaw, Simpliciter) sono
  disponibili in sessione come strumenti MCP con nomi prevedibili.
- **AS5** — Il `curl` della skill client-side raggiunge l'host: la catena di
  certificazione di `italgiure.giustizia.it` non standard (da cui il
  `rejectUnauthorized: false` del server) potrebbe richiedere `-k`. Da verificare
  su IP ammesso; se necessario, la skill usa `-k` con l'eccezione documentata.
