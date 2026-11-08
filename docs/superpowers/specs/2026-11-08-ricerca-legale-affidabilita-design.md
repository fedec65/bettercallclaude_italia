# Design — Affidabilità della ricerca legale (Cassazione, Normattiva, fonti esterne)

Data: 2026-11-08
Plugin: `bettercallclaude_italia` (BetterCallClaude Italia) — v2.4.11 → v2.5.0
Server: `~/Dev/BetterCallClaudeMCP_Italy` (branch `dev`) — deploy Railway
Segnalazione: avvocato utente del plugin, settore ricerca

## Sommario

Quattro problemi distinti, verificati uno per uno nel codice:

1. **La ricerca di legittimità parte vuota** — root cause server-side: il gate sul
   cookie impedisce di usare un endpoint che è pubblico.
2. **`citation-verify-ita` risponde `SOURCE_UNAVAILABLE`** — stessa root cause, in cascata.
3. **Le skill invocano tool che non esistono** — bug plugin, 6 riferimenti.
4. **La ricerca legale è bloccata alle fonti del plugin** — la clausola «Ambito plugin»
   vieta esplicitamente le banche dati abbonate dell'utente.

A questo si aggiunge una proposta di canale alternativo per l'area riservata
ItalGiure (sessione browser già autenticata).

Il design copre **due repository**: il plugin (`bettercallclaude_italia`) e i server MCP
(`BetterCallClaudeMCP_Italy`). Il documento maestro sta nel repo plugin; i due track
hanno release separate.

---

## Contesto e problemi verificati

Tutti i riferimenti sono stati verificati nel codice.

### P1 — Il server non usa mai l'endpoint pubblico (root cause)

`mcp-servers/cassazione/src/tools/italgiure-client.ts:8`:

```ts
const ITALGIURE_BASE = 'https://www.italgiure.giustizia.it/sncass';
export const SOLR_ENDPOINT = `${ITALGIURE_BASE}/isapi/hc.dll/sn.solr/sn-collection/select?app.query`;
```

Il percorso `/sncass/` è il **SentenzeWeb pubblico**, non l'area riservata. La
richiesta non richiede autenticazione.

Tuttavia `searchItalgiure` applica un gate: senza cookie ritorna
`{ success: false, cookieValido: false, massime: [] }` **senza mai tentare la
chiamata** (`italgiure-client.ts`, blocco `if (!cookie)` poco prima di
`createItalgiureClient()`). Da qui la catena:

| Sintomo | Meccanismo |
|---|---|
| ricerca Cassazione → 0 risultati, solo link di fallback | gate sul cookie |
| `citation-verify-ita` → `SOURCE_UNAVAILABLE` | `check-existence.ts:179` lancia l'errore quando `!result.success` |
| ricerca di legittimità vuota | combinazione dei due |

`getSentenzaItalgiure` ha lo stesso gate: senza cookie non recupera nemmeno un
documento pubblico.

### P2 — Le istruzioni del server contraddicono la documentazione del plugin

Il server, nel campo `fallback.istruzioni`, dice **«Esegui document.cookie»**
(due occorrenze in `italgiure-client.ts`, ramo «cookie assente» e ramo
«errore 401/403»). La documentazione del plugin dice l'opposto:
`docs/cassazione-cookie.md:24` e `README.md:213` spiegano che i cookie sono
HttpOnly e che la Console restituisce una stringa vuota.

Il modello riceve entrambe le istruzioni nello stesso contesto: la contraddizione
è reale a runtime, non solo nella documentazione.

### P3 — La procedura del cookie descrive un'interfaccia che non esiste più

`docs/cassazione-cookie.md` (riga 5, 21, 22, 24), `agents/researcher.md:74`,
`skills/italian-legal-research/SKILL.md:71` e la descrizione `italgiure_cookie`
nel manifest dicono tutti:

- di cercare `PHPSESSID` come «il cookie che attesta il login»;
- di individuare «una chiamata dati dell'area riservata (un percorso `/new/...`)»;
- che i cookie inviati siano «`PHPSESSID=...; sessonly=1; lang=it; cookiesession1=...`».

Segnalazione dell'utente sulla nuova area riservata: **`PHPSESSID` non c'è più**,
resta solo `cookiesession1`, e l'autenticazione passa per un header
`Authorization: Basic` (username e password in base64) presente a ogni chiamata.
Le richieste dati sono su `/api`, non su `/new/...`.

Conseguenza operativa: l'utente che segue la procedura cerca un cookie che non
esiste, conclude che la propria configurazione è sbagliata e non ha una strada per
capire che il problema è a monte.

### P4 — Tool inesistenti citati nelle skill (bug plugin)

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

**Perché non è già stato visto**: `scripts/check-tool-names.js` valida il
frontmatter `tools:` di agenti, comandi e skill — controlla la parità fra le due
convenzioni di naming e l'esistenza nel catalogo `SERVER_TOOLS`. È **cieco alla
prosa** delle skill, che è dove vivono tutti e sette i riferimenti qui sopra.

### P5 — `normattiva_search` con parole chiave restituisce atti estranei

`mcp-servers/normattiva/src/tools/search.ts` chiama
`/bff-opendata/v1/api/v1/ricerca/semplice` con `orderType` di default `recente`.
Su «codice della crisi d'impresa» l'API restituisce gli ultimi due decreti in
Gazzetta invece del codice. La ricerca avanzata per estremi funziona.

`normattiva_search_advanced` **già supporta** `titoloRicerca`, `denominazioneAtto` e
`vigenza` (`search-advanced.ts:20-30`) — la skill semplicemente non li usa mai.

Nota aggiuntiva: `normattiva_get_atto` **non restituisce il testo degli articoli**.
Reimplementa una ricerca avanzata non filtrata e ne estrae i metadati
(`get-atto.ts:12-45`). La promessa «recupera testo articolo» non è mai stata
soddisfatta da quel tool.

### P6 — Le fonti esterne sono vietate dalla clausola «Ambito plugin»

**24** file in `commands/` contengono la clausola di perimetro. La forma canonica è:

> «**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia
> per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin.»

Elenco completo (24): `analisi-doc.md`, `briefing.md`, `citazione.md`,
`contraddittorio.md`, `cronologia-legale.md`, `flusso.md`, `legale-5step.md`,
`legale-loop.md`, `legale-obiettivo.md`, `legale.md`, `mappa-legale.md`, `nazionale.md`,
`percorso-legale.md`, `precedente.md`, `raffina.md`, `redazione.md`, `regionale.md`,
`riassumi.md`, `ricerca.md`, `start.md`, `strategia.md`, `traduci.md`, `triage-nda.md`,
`verifica.md`.

Ne esistono tre varianti di formulazione, da aggiornare tutte:

| Variante | File | Nota |
|---|---|---|
| «**Ambito plugin**: usa esclusivamente … Non delegare a skill o agenti esterni al plugin.» | 20 file | forma canonica, con suffisso variabile sulle esenzioni (generazione file, lettura file) |
| «Per tutte le attività di … usa **esclusivamente** agenti, skill e server MCP … Non delegare lavoro legale a skill, agenti o strumenti generici o esterni al plugin.» | `legale.md`, `legale-5step.md`, `start.md` | la clausola è in coda al file, non in testa |
| «Per tutto il lavoro sui ticket, usa **esclusivamente** agenti, skill e server MCP di …» | `percorso-legale.md`, `mappa-legale.md` | markup `**esclusivamente**` spezzato su più righe |

L'avvocato ha verificato che in `/legale-5step` funziona se chiede esplicitamente
«usa anche BuddaLaw e Simpliciter» — ma la richiesta va ripetuta a ogni comando, e se
una volta non la ripete la ricerca si dimezza senza che se ne accorga.

La clausola è nei **comandi**, non nelle skill né negli agenti (verificato: nessun
`agents/*.md` contiene «esclusivamente»).

---

## Obiettivi

- **O1** — La ricerca di legittimità restituisce risultati anche senza cookie
  ItalGiure, tramite il canale pubblico.
- **O2** — `citation-verify-ita` verifica l'esistenza di sentenze senza cookie.
- **O3** — Nessuna skill invoca un tool inesistente; la regressione non può
  ripetersi.
- **O4** — La documentazione del cookie descrive l'interfaccia realmente esistente e
  non si contraddice con le istruzioni del server.
- **O5** — L'utente può dichiarare le proprie banche dati e il plugin le interroga
  senza che ciò configuri il divieto di cui al punto P6.
- **O6** — Esiste un canale alternativo all'area riservata per chi non vuole o non
  può fornire credenziali: la sessione browser già autenticata, in modalità
  presidiata.

## Non obiettivi

- **N1** — Non si automatizza il login a ItalGiure (SPID, OTP). Vietato dalle regole
  AGID e incompatibile con il segreto professionale.
- **N2** — Non si chiedono all'utente credenziali in chiaro da salvare su server di
  terzi.
- **N3** — Non si integrano BuddaLaw, Simpliciter o altre banche dati a contratto:
  sono abbonamenti dell'utente, ciascuno con le sue credenziali. Il plugin non le
  tocca.
- **N4** — Non si implementa lo scraping massivo dell'area riservata.
- **N5** — Il server MCP non viene modificato per supportare fonti esterne: la
  proposta 1 è interamente lato plugin.

---

## Design

### Track B — Server MCP (`BetterCallClaudeMCP_Italy`)

> Il Track B è presentato per primo perché è la root cause: senza, O1 e O2 non sono
> raggiungibili.

#### B1 — Strategia di accesso a ItalGiure

`italgiure-client.ts` viene riscritto attorno a una funzione di basso livello
`querySolr(input, { cookie? })` che esegue il POST e restituisce la `SolrResponse`,
e una strategia di decisione sopra.

```
cookie assente            →  Solr pubblico, SENZA header Cookie
                             risultato: fonte = sentenzeweb,  massimeComplete = false

cookie presente e valido  →  Solr CON cookie
                             risultato: fonte = area_riservata, massimeComplete = true

cookie presente, fallisce →  Solr con cookie → su timeout/403/error → retry Solr pubblico
                             risultato: fonte = sentenzeweb, massimeComplete = false

entrambi i percorsi falliscono
                          →  forma di fallback attuale (link + istruzioni)
```

**TTL di fallimento del cookie**: in-process, 5 minuti. Se il tentativo con cookie
fallisce, i tentativi successivi per la stessa durata saltano direttamente al
percorso pubblico. Motivo: con un cookie scaduto, ogni query pagherebbe il timeout
di 30 secondi prima di arrivare al pubblico. Dopo 5 minuti il cookie viene
ritentato, così un cookie rinnovato dall'utente viene picked up senza riavvio.

**Perché non invertire l'ordine con il cookie presente**: l'area riservata espone
massime complete, Rv. e conformi/difformi. Con un cookie valido non ha senso
sacrificare quei dati.

#### B2 — Campi di provenienza nella risposta

`searchMassime` (`tools/search-massime.ts`) aggiunge:

```ts
fonte: 'sentenzeweb' | 'area_riservata';   // da dove arriva la pronuncia
massimeComplete: boolean;                    // true solo se area riservata
```

`autenticazione.cookieValido` **mantiene il significato attuale**: indica se il cookie
è stato accettato. Non cambia semantica retrocompatibile: chi lo leggeva per capire
«la ricerca ha funzionato» continua a poterlo fare, e il plugin impara a usare
`totale > 0` e `fonte` come criterio di successo.

Il criterio di successo diventa quindi:

| `totale > 0` | `fonte` | Lettura |
|---|---|---|
| sì | `area_riservata` | pronuncia con massime complete |
| sì | `sentenzeweb` | pronuncia verificata sull'indice pubblico, massime non disponibili |
| no | — | ricerca fallita: fallback + istruzioni |

`getSentenzaItalgiure` riceve lo stesso trattamento: senza cookie recupera
l'estremi dal documento pubblico, che è già identificabile dall'`id`
(formato `snciv2024332127S`).

#### B3 — Istruzioni e descrizioni dei tool

- `fallback.istruzioni`, ramo «cookie assente»: via «Esegui document.cookie» →
  «copia il campo `Cookie` dalla scheda Network della richiesta dati dell'area
  riservata (i cookie sono HttpOnly: la Console restituisce una stringa vuota)».
- `fallback.istruzioni`, ramo «errore 401/403»: stessa correzione.
- `fallback.istruzioni`: rimuovere «Alternativa gratuita senza login: SentenzeWeb»,
  perché SentenzeWeb **è** il canale primario, non il ripiego. La formulazione
  diventa: fonti utilizzabili per la verifica manuale.
- Descrizione del tool `cassazione_search_massime`: da «Requires an active ItalGiure
  session cookie… When the cookie is missing or expired, the tool returns structured
  fallback URLs» → «Interroga l'indice pubblico SentenzeWeb e funziona senza
  autenticazione; il cookie di sessione è opzionale e sblocca le massime complete
  dell'area riservata».
- Stessa correzione per `cassazione_get_sentenza`.

#### B4 — `citation-verify-ita`

Con B1, `searchItalgiure` restituisce `success: true` e il ramo che lancia
`SOURCE_UNAVAILABLE` (`check-existence.ts:176-181`) non viene raggiunto per le
sentenze. Nessuna modifica strutturale necessaria.

Aggiunta: il campo `note` del risultato segnala quando la verifica è avvenuta
sull'indice pubblico (`massimeComplete: false`), così l'utente sa che la sentenza
esiste ma che le massime non sono state consultate.

### Track A — Plugin (`bettercallclaude_italia`)

#### A1 — Tool names inesistenti: fix e prevenzione

**Fix immediato**: correggere i 7 riferimenti della tabella in P4 con i nomi reali
dal catalogo `SERVER_TOOLS` (`scripts/generate-tool-frontmatter.js:29-40`).

**Prevenzione**: estendere `scripts/check-tool-names.js` con un secondo controllo
sulla **prosa** di agenti, comandi e skill. Il controllo cerca i nomi di tool
MCP citati nel corpo del file e li verifica contro `SERVER_TOOLS`. Un nome che
esiste nella prosa ma non nel catalogo è un errore.

Il controllo deve essere basato sul catalogo esistente, non su una lista separata:
`SERVER_TOOLS` in `scripts/generate-tool-frontmatter.js` è già la fonte unica
usata dallo script e resta tale.

Il controllo in prosa è definito come segue, in modo da non generare falsi positivi:

1. si cercano in tutto il corpo (fuori dal frontmatter) i token del tipo
   backtick + identificatore in minuscolo (con _ o -) + parentesi tonda aperta,
   chiuso da backtick — cioè un nome di tool invocato come una funzione;
2. ogni token va verificato contro l'unione dei nomi presenti in SERVER_TOOLS
   (tutti i server, non solo quelli del file in esame);
3. un token assente dal catalogo è un errore.

Verifica di fattibilità eseguita sullo stato attuale del plugin: i token di
questo tipo presenti in skills/, agents/ e commands/ sono 13, di cui 5 non
esistono — find_leading_cases, format_citation, parse_citation, get_article,
get_decision — e gli altri 8 sono tutti validi. La regola produce quindi zero
falsi positivi sul corpus corrente, e intercetta esattamente i riferimenti rotti
riportati in P4.

Nota: i riferimenti validi citati in prosa usano il nome bare del tool (es.
normattiva_search), non il nome qualificato. Il controllo deve quindi confrontare
contro il nome bare, che è quello che il modello deve invocare.

#### A2 — Documentazione del cookie riscritta

`docs/cassazione-cookie.md`, `agents/researcher.md:74`,
`skills/italian-legal-research/SKILL.md:71` e la descrizione `italgiure_cookie` nel
manifest vengono riscritti con la seguente impostazione:

1. **Il canale pubblico non richiede nulla.** La prima cosa che la guida dice è che
   la ricerca su SentenzeWeb funziona senza autenticazione e che il cookie è un
   acceleratore opzionale per massime complete, Rv. e conformi/difformi.
2. **La procedura non dipende dal nome del cookie.** Si cerca l'intestazione
   `Cookie` **completa** di una richiesta dati dell'area riservata, qualunque ne sia
   il nome (`PHPSESSID`, `sessonly`, `cookiesession1`, altri). Non si pretende più
   che un nome specifico sia presente.
3. **Il path non è hardcoded.** Si indica di individuare «la richiesta che restituisce
   i dati della ricerca» e di copiarne l'intestazione `Cookie`, senza più il riferimento
   a `/new/...`.
4. **`Authorization: Basic`** viene spiegato per quello che è: il meccanismo di
   autenticazione dell'area riservata, che il plugin non replica e non deve ricevere.
   Se la richiesta lo porta, il cookie da copiare resta quello dell'intestazione
   `Cookie`; se l'area riservata non è più raggiungibile con il solo cookie, la guida
   dice di passare alla modalità browser presidiata (`italgiure-browser`).
5. **Il fallback è esplicito**: cosa fare quando il cookie non è sufficiente
   (SentenzeWeb, modalità browser).

#### A3 — Instradamento Normattiva nella skill

`skills/italian-legal-research/SKILL.md` impara a distinguere il tipo di ricerca:

| Intento | Tool | Parametri |
|---|---|---|
| atto nominato («codice della crisi d'impresa», «legge 219/2017») | `normattiva_search_advanced` | `denominazioneAtto` / `titoloRicerca`, `vigenza` |
| parole chiave generiche | `normattiva_search` | `query` |
| testo di un articolo | — | **non disponibile**: `normattiva_get_atto` restituisce metadati dell'atto, non gli articoli |

La skill smette di promettere «recupera testo articolo» e dichiara il limite: il
plugin ottiene metadati e link ELI dell'atto; il testo dell'articolo si legge sul
link o tramite `WebFetch` della pagina ELI, se l'utente lo desidera.

#### A4 — Proposta 1: fonti esterne dell'utente

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

**Modifica ai 24 comandi.** L'eccezione va **inline** nella stessa riga che contiene
il divieto, perché è lì che il modello la legge:

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
   in sessione; se sì, interrogare in parallelo ai server MCP; se no, proseguire
   senza segnalarlo come consultato;
3. etichettare la provenienza di ogni pronuncia;
4. segnalare che le query inviate a fonti esterne **escono dalla macchina** e
   passano dal controllo privacy come qualunque altra chiamata in rete.

**Formato della provenienza**: accanto a ciascun precedente, un marcatore di provenienza
— `Fonte: BuddaLaw`, `Fonte: SentenzeWeb (server BCC)`, `Fonte: ItalGiure (area
riservata)`. Nel corpo del documento, in un elenco delle fonti consultate per la
ricerca, con la distinzione fra «consultata» e «non disponibile in sessione».

#### A5 — Proposta 3: skill `italgiure-browser` (modalità presidiata)

Nuova skill `skills/italgiure-browser/`. Tre precondizioni, **tutte** necessarie:

1. **Un connettore browser è disponibile in sessione.** Rilevato per disponibilità
   degli strumenti, non hardcoded a un vendor: deve funzionare con Chrome DevTools
   MCP, con Claude in Chrome, o con altro connettore compatibile.
2. **L'utente ha autorizzato esplicitamente la modalità** nella conversazione
   corrente. Nessuna autorizzazione implicita, nessuna autorizzazione ereditata da
   sessioni precedenti.
3. **L'utente risulta autenticato.** La skill lo **verifica** guardando lo stato reale
   della pagina (che il form di ricerca dell'area riservata sia presente e utilizzabile),
   non lo presume.

Comportamento:

- naviga all'area riservata;
- esegue **poche** interrogazioni (tetto ~3-5 per sessione, ritmo umano, nessun
  parallelismo): lo scopo è evitare di urtare l'anti-bot e le condizioni d'uso;
- nessuno scaricamento massivo, nessuna estrazione di interi corpus;
- estrae estremi, sezione, numero, data, numero di massima, Rv.;
- **restituisce la stessa forma di `cassazione_search_massime`**, così a valle
  (`citation-content-verify`, `legal-evaluator`, pipeline 5step) nessuno deve
  distinguere la provenienza.

Privacy:

- la skill **non chiede mai** username o password e non le trasmette;
- le credenziali non lasciano mai il browser: è il browser dell'utente a fare la
  richiesta, con la sua sessione;
- la modalità è compatibile con `privacy_mode: strict`, perché il testo della bozza
  non esce dalla macchina dell'utente (a differenza di una chiamata a un server remoto).

Fallback: se il browser non è disponibile, non è autorizzato o l'utente non è
autenticato → si torna al canale SentenzeWeb, che dopo il Track B funziona lato
server senza alcuna interazione.

**Open item**: il mapping dei campi della nuova interfaccia non è noto. La ricerca
**per parole** è confermata funzionante; quella **per estremi** non lo è. La skill
quindi parte con una fase di *discovery* — al primo uso cattura uno snapshot della
pagina, identifica i campi e memorizza il mapping in `references/` — e il mapping
viene consolidato dopo la prima sessione reale. La skill non viene scritta come se
il mapping fosse noto.

---

## Flusso dati — ricerca di legittimità senza cookie

```
utente: "cerca precedenti su responsabilità medica"
  │
  ├─ skill italian-legal-research
  │    ├─ normattiva_search_advanced(titoloRicerca="codice della crisi d'impresa", vigenza=...)
  │    │    → atto + codiceRedazionale + dataGU + urlNormattiva
  │    ├─ cassazione_search_massime(query, materia="civile")
  │    │    → [Track B] gate assente → Solr pubblico senza Cookie
  │    │    → { massime: [...], totale: 42, fonte: "sentenzeweb", massimeComplete: false }
  │    └─ fonti_esterne? → connettore buddalaw presente? → query in parallelo
  │         → risultati etichettati Fonte: BuddaLaw
  │
  ├─ citation-content-verify
  │    └─ citation-verify-ita_check_existence("Cass. civ. sez. III ord. 17006/2025")
  │         → [Track B] stessa catena, niente SOURCE_UNAVAILABLE
  │         → { exists: true, fonte: "sentenzeweb", note: "massime complete non disponibili" }
  │
  └─ output: sintesi + precedenti con provenienza + quadro normativo + disclaimer
```

## Gestione degli errori

| Situazione | Comportamento |
|---|---|
| nessun cookie, Solr pubblico raggiungibile | successo, `fonte: sentenzeweb` |
| nessun cookie, Solr pubblico irraggiungibile | fallback attuale (link + istruzioni corrette) |
| cookie scaduto | retry sul pubblico, `fonte: sentenzeweb` |
| cookie scaduto e pubblico irraggiungibile | fallback + istruzioni |
| timeout solo sul percorso con cookie | TTL 5 minuti: query successive vanno dirette al pubblico |
| connettore fonti esterne assente | si prosegue, la fonte è dichiarata «non disponibile in sessione», non «consultata» |
| browser non autorizzato / non autenticato | fallback al canale SentenzeWeb |
| tool inesistente citato in prosa | intercettato dal checker, fallisce la CI |

## Piano di verifica

### Server (`BetterCallClaudeMCP_Italy`)

Test in `mcp-servers/cassazione/src/__tests__/italgiure-client.test.ts` e
`src/__tests__/tools.test.ts`:

- senza cookie → la richiesta al Solr pubblico avviene e non viene inviato alcun
  header `Cookie`; il risultato ha `fonte: 'sentenzeweb'`;
- cookie non valido (errore 401/403) → fallback automatico al pubblico,
  `fonte: 'sentenzeweb'`, `massimeComplete: false`;
- cookie valido → `fonte: 'area_riservata'`, `massimeComplete: true`;
- entrambi i percorsi falliscono → forma di fallback attuale; `istruzioni` non
  contiene più `document.cookie`;
- TTL: dopo un fallimento da cookie, la chiamata successiva non riprova col cookie
  entro la finestra temporale;
- `citation-verify-ita`: citazione di sentenza senza cookie → `exists: true`, mai
  `SOURCE_UNAVAILABLE`.

### Plugin (`bettercallclaude_italia`)

- `node scripts/check-tool-names.js` — deve passare, e deve **fallire** su un
  file di fixture che cita in prosa un tool inesistente (test di regressione);
- `node scripts/validate-plugin.js` — verde;
- `npm test` (privacy-check) — verde;
- controllo grep: zero occorrenze di `get_article`, `get_decision`,
  `find_leading_cases` nelle skill e negli agenti; zero occorrenze di
  `document.cookie` come **istruzione** (i riferimenti spiegativi restano leciti e
  devono essere verificati a mano);
- i 24 comandi contengono tutti l'eccezione fonti esterne nella stessa clausola di
  perimetro che contiene il divieto;

### Verifica end-to-end

Su una macchina con il plugin aggiornato e il server deployato: una ricerca di
legittimità senza cookie configurato deve restituire risultati e la provenienza
`SentenzeWeb`; una verifica di citazione di sentenza deve restituire `exists: true`.

---

## Rollout

Due release separate. Il plugin usa i campi `fonte` e `massimeComplete` in modo
**opzionale**: se il server non è ancora deployato, la skill funziona comunque
basandosi su `totale > 0` e sul fallback. Nessun accoppiamento rigido tra le due.

| # | Contenuto | Repository | Esito |
|---|---|---|---|
| **R1** | B1-B4: gate inversion, provenienza, istruzioni, descrizioni, test | `BetterCallClaudeMCP_Italy` (branch `dev`) → deploy Railway | `cassazione_search_massime` restituisce risultati senza cookie |
| **R2** | A1-A5: tool names + checker, doc cookie, normattiva, fonti esterne, skill browser → v2.5.0 + CHANGELOG | `bettercallclaude_italia` (branch `main`) | ricerca funzionante e verificabile end-to-end |

La release R2 va rilasciata dopo R1 solo per poter **verificare** il percorso
completo; non per dipendenza tecnica.

---

## Rischi

**R1 — L'IP del datacenter è bloccato anche sul canale pubblico.** L'utente ha
osservato timeout con `cookiesession1`; la spiegazione più semplice è il firewall
FortiWeb / Akamai Bot Manager, che blocca le richieste provenienti da IP di data
center indipendentemente dalla presenza del cookie. Se lo stesso blocco colpisce
le richieste anonime, **il Track B non risolve il problema** e la modalità browser
(A5) diventa il canale primario invece che il ripiego.

> **Prima azione, prima di scrivere codice**: una richiesta al Solr pubblico
> **dall'ambiente deployato** (non dal portatile di sviluppo, che ha un IP
> diverso). Se fallisce, il design di A5 cambia da «ripiego» a «canale primario» e
> la specifica va rivista.

**R2 — Mapping dei campi della nuova interfaccia sconosciuto.** Gestito dalla fase di
discovery in A5; la ricerca per estremi resta non supportata fino a mappatura
completa.

**R3 — L'indice pubblico è più povero dell'area riservata.** Le massime complete, i
Rv. e i conformi/difformi restano legati al cookie. Dichiarato nel campo
`massimeComplete` e nei messaggi all'utente.

**R4 — La clausola «Ambito plugin» ha 24 occorrenze in 24 file.** Modificarle in modo
coerente richiede che tutte vengano aggiornate: una dimenticata lascia un comando
che vieta ancora le fonti esterne. Il controllo di verifica ne elenca la copertura,
e le tre varianti di formulazione (vedi P6) vanno trattate come tre casi distinti.

**R5 — Il catalogo `SERVER_TOOLS` del plugin è una copia manuale** di quello del
server (`scripts/generate-tool-frontmatter.js:29-40` contro il sorgente del server).
Un tool nuovo sul server che non viene aggiunto al catalogo fa fallire il
checker. Va tenuto presente come fonte di manutenzione, non risolto in questo intervento.

---

## Assunzioni

- **AS1** — L'endpoint `/sncass/isapi/hc.dll/sn.solr/...` accetta richieste
  anonime. Da verificare con R1.
- **AS2** — La nuova area riservata espone la ricerca per parole attraverso un form
  web utilizzabile da un connettore browser. Confermato dall'utente per la ricerca
  per parole; non confermato per quella per estremi.
- **AS3** — Il plugin può leggere `userConfig` al momento dell'esecuzione della
  skill. Le skill vedono le impostazioni del plugin come contesto; va verificato in
  fase di implementazione che il valore sia effettivamente disponibile al modello
  senza un tool dedicato.
- **AS4** — I connettori delle banche dati esterne (BuddaLaw, Simpliciter) sono
  disponibili in sessione come strumenti MCP con nomi prevedibili. Il meccanismo di
  rilevamento è definito in fase di implementazione.
