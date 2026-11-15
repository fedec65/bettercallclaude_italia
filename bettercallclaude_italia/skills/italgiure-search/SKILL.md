---
name: italgiure-search
description: "Ricerca i precedenti della Corte di Cassazione interrogando l'indice pubblico SentenzeWeb dal PC dell'utente. La query parte dal computer dell'utente, non dal server BetterCallClaude: l'IP dei datacenter è scartato da italgiure.giustizia.it. Restituisce estremi, sezione, data e link al documento (PDF o indice testuale). Attivazione quando serve un precedente di legittimità e la ricerca con il server MCP ha risposto con autenticazione.cookieValido false (il server non ha potuto interrogare ItalGiure). NON attivare per: ricerca normativa (usa italian-legal-research), verifica di citazioni esistenti (usa citation-content-verify), area riservata e massime complete (usa italgiure-browser)."
tools:
  - Bash
  - Read
  - Grep
  - Glob
  - WebSearch
  - WebFetch
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_search_massime
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_get_sentenza
  - mcp__plugin_bettercallclaude-italia_citation-verify-ita__citation-verify-ita_check_existence
  - mcp__cassazione__cassazione_search_massime
  - mcp__cassazione__cassazione_get_sentenza
  - mcp__citation-verify-ita__citation-verify-ita_check_existence
---

# Ricerca Cassazione lato client

Interroga l'indice pubblico **SentenzeWeb** del CED Ministero della Giustizia.

## Perché questa skill esiste

Il server MCP di BetterCallClaude è deployato su un indirizzo IP di datacenter.
`www.italgiure.giustizia.it` **scarta a livello TCP** le richieste che arrivano da
quel tipo di indirizzo. Il tool `cassazione_search_massime` lato server lo
dichiara: la chiamata va a buon fine, ma `autenticazione.cookieValido` vale
`false` e `autenticazione.messaggio` spiega perché — senza cookie la richiesta
non parte nemmeno, con un cookie la connessione non raggiunge il servizio. Non è
un timeout da aspettare: in entrambi i casi la ricerca va fatta dal computer
dell'utente.

Questa skill esegue la **stessa query** dalla macchina dell'utente, dove
l'IP è ammesso. La risposta ha la stessa forma del tool server, così tutto a
valle funziona senza modifiche.

Sulla ricerca per estremi il client è **più preciso** del server: il server non
poteva osservare la semantica della propria query, perché dal datacenter la
fonte scarta la connessione. Qui la query per estremi usa le clausole fielded
`numdec` e `anno` (vedi «Ricerca per estremi»).

Vantaggio privacy: la ricerca **non transita dall'infrastruttura cloud di
BetterCallClaude**. Il termine di ricerca va diretto al Ministero della Giustizia.

## Quando usarla

- dopo un `cassazione_search_massime` lato server che ha risposto con
  `autenticazione.cookieValido: false` (il server non ha potuto interrogare la
  fonte);
- quando l'utente chiede direttamente un precedente di Cassazione e il canale
  server non può interrogare la fonte;
- per verificare l'esistenza di una sentenza conoscendo gli estremi (numero e
  anno): il tool MCP `citation-verify-ita_check_existence` (server
  `citation-verify-ita`) verifica l'esistenza delle citazioni, ma per le sentenze
  non raggiunge ItalGiure dal lato server, quindi la via client-side di questa
  skill è quella che funziona.

Per l'**area riservata** (massime complete, Rv., conformi e difformi) usa
`italgiure-browser`. Per la **legislazione** usa `italian-legal-research`.

## Procedura

### Passo 0 — Individua lo script

Lo script sta nella stessa skill, in `scripts/italgiure-query.js`. **La directory
di lavoro della shell non è la directory della skill**, quindi un percorso
relativo non risolve. Individualo con un Glob:

```
**/italgiure-search/scripts/italgiure-query.js
```

Usa il percorso assoluto trovato, indicato qui come `<SCRIPT>`.

Se il Glob non trova nulla, non insistere: applica direttamente le regole del
Passo 1 e leggi la risposta JSON applicando la tabella dei campi del Passo 3. La
skill deve funzionare anche senza lo script.

### Passo 1 — Costruisci la query

```bash
node <SCRIPT> build --query "TERMINE DI RICERCA" --materia civile --anno 2024
```

Flag opzionali: `--materia civile|penale`, `--anno YYYY`, `--tipo sentenza|ordinanza|decreto`.
Il termine di ricerca **non** deve contenere il testo della bozza o dati del
fascicolo: solo i termini giuridici da cercare.

I valori ammessi sono rigidi: `--materia` accetta solo `civile` o `penale`,
`--tipo` accetta solo `sentenza`, `ordinanza` o `decreto`. Un valore diverso da
questi fa fallire lo script: usa solo i valori elencati.

Anche `--anno` deve essere un anno di quattro cifre, ma lo script non lo
valida: un valore non numerico o non positivo viene **ignorato in silenzio**
(nessun filtro `anno` applicato, quindi la ricerca copre tutti gli anni), mentre
un anno abbreviato come `24` produce il filtro `anno:"24"`, che non
corrisponde ad alcun anno reale.

Se lo script non è disponibile, costruisci la query con queste regole:

- testo libero: racchiudilo in parentesi e escapa i caratteri speciali Solr
  (`+ - ! ( ) { } [ ] ^ " ~ * ? : \ /`);
- materia civile aggiunge ` AND kind:"snciv"`, penale aggiunge ` AND kind:"snpen"`;
- anno aggiunge ` AND anno:"YYYY"`;
- tipo aggiunge ` AND tipoprov:"Sentenza"` (o "Ordinanza", "Decreto", con l'iniziale
  maiuscola);
- le clausole si uniscono con ` AND `;
- se il testo contiene già sintassi Solr (parentesi iniziali, `:`, `~`, AND, OR)
  usalo così com'è.

**Attenzione al rilevamento della sintassi raw.** Il riconoscimento è per
sottostringa: se il testo libero contiene un `AND` o un `OR` maiuscolo viene
trattato come sintassi Solr e passato **non escapato e non racchiuso**. Perciò,
se i termini di ricerca contengono `AND` o `OR` maiuscoli, scrivili in minuscolo
oppure formula la query in sintassi Solr esplicita: altrimenti la ricerca si
comporta in modo inatteso.

### Passo 1b — Ricerca per estremi (numero e anno)

Quando l'utente chiede una decisione **per estremi** (`Cass. n. 577/2008`,
`n. 577 del 2008`), non cercare per parole: passa la citazione al
costruttore della query, che la riconosce e produce i campi `numdec` e `anno`.

Solo citazioni di **decisioni** entrano nella ricerca per estremi: una
citazione legislativa (legge, decreto, articolo) non si cerca con questa skill,
per la normativa usa `italian-legal-research`. Il numero e l'anno di un atto
normativo non sono gli estremi di una sentenza: cercarli per estremi restituirebbe
una decisione con lo stesso numero e l'anno giusto, cioè un falso positivo.

```bash
node <SCRIPT> build --query "Cass. n. 577/2008"
# numdec:"577" AND anno:"2008"
```

Verifica che la query costruita contenga `numdec:` e `anno:`: se è testo
libero, la citazione non è stata riconosciuta (riformattala — per esempio
`Cass. civ., sez. III, n. 12345/2019` — o usa la ricerca per parole).

Un anno senza numero resta testo libero, e una query già in sintassi Solr
passa invariata: in entrambi i casi niente da fare.

Una forma senza marcatore (`577/2008`) è una citazione solo se il numero ha
almeno tre cifre: con una o due cifre (`10/2024`) è una data, non un numero
di decisione. Viceversa, una frase che contiene per caso un «n. 123/2020»
resta testo libero: la ricerca per estremi vale per la citazione, non per la
sottostringa.

Sono riconosciuti i qualificativi di materia (`civ.`, `pen.`, `civile`,
`penale`), la sezione (`sez. III`, `SS.UU.`) e il tipo di provvedimento
(`sentenza`, `ordinanza`, `decisione`), in qualsiasi ordine e separati da
virgole, e la punteggiatura finale non impedisce il riconoscimento.

Non aggiungere `--anno` con un anno diverso da quello della citazione: i due
filtri si contraddirebbero e lo script fallisce. `--anno` con lo stesso anno
della citazione non duplica la clausola.

**Verifica prima di dichiarare che la decisione esiste**: confronta l'`estremi`
di ogni risultato con il numero e l'anno richiesti (per esempio
`Sez. III Sentenza n. 577 del 2008`). Solo se il numero e l'anno corrispondono
a quelli chiesti puoi affermare che la decisione esiste; se gli estremi
differiscono, la decisione richiesta non è stata trovata e non puoi
presentare un'altra decisione al suo posto.

### Passo 2 — Interroga l'indice

```bash
Q=$(node <SCRIPT> build --query "TERMINE DI RICERCA" --materia civile)

CODICE=0
BODY=$(curl -sS -k --fail-with-body -m 30 -X POST \
  "https://www.italgiure.giustizia.it/sncass/isapi/hc.dll/sn.solr/sn-collection/select?app.query" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "q=$Q" \
  --data "rows=20&start=0&wt=json&fl=id,filename,szdec,tipoprov,datdec,numdec,anno,kind,datdep&sort=pd desc,datdec desc") || CODICE=$?

printf '%s' "$BODY" | node <SCRIPT> format
```

Note sulla invocazione:

- `--fail-with-body`: su un errore HTTP (4xx/5xx) la `curl` esce con codice 22
  **e** lascia il corpo della risposta nello stdout: il corpo dell'errore
  arriva al formatter, che lo dichiara come ricerca fallita invece di
  trasformarlo in un risultato vuoto. Senza questo flag la `curl` uscirebbe
  con 0 anche su un errore HTTP.
- `CODICE=0` e `|| CODICE=$?`: è il codice di uscita della `curl`, catturato
  **senza far abortire la shell**. **Controllalo prima di interpretare
  l'output**: se non è 0, la ricerca è fallita (vedi «Se la ricerca fallisce»)
  e non va riportata come `totale: 0`. Non eseguire il blocco con `set -e`: la
  shell si interromperebbe prima che tu legga il codice e il corpo della
  risposta.
- `-k`: l'host presenta una catena di certificazione non standard e la CA non è
  ottenibile, quindi il flag resta: toglierlo romperebbe l'unico canale
  funzionante. Il server MCP fa lo stesso (`rejectUnauthorized: false`).
  **Limite di fiducia**: la connessione non è autenticata crittograficamente,
  i termini di ricerca viaggiano in chiaro verso l'host e la risposta non è
  verificata. Per ricerche che decidono una controversia usa la modalità
  browser (`italgiure-browser`), che usa la catena TLS del browser.
- `-m 30`: timeout esplicito. Se la `curl` esce con codice 28, l'IP corrente
  non è ammesso: vedi «Se la ricerca fallisce».
- `curl` e non `node script.js`: l'hook privacy del plugin intercetta `curl` e i
  comandi di rete, e lascia passare i file locali. Usando `curl` la ricerca resta
  dentro il perimetro di controllo del segreto professionale.
- `q=$Q`: la query passa **sempre** tramite la variabile di shell, mai incollata
  come testo dentro le virgolette. Incollata letteralmente, la shell elimina le
  virgolette interne (`kind:"snciv"` diventerebbe `kind:snciv`) e gli escape
  `\"` perdono la barra rovesciata.

Assegna l'output del Passo 1 alla variabile `Q`, e sostituisci `rows`/`start` con
la paginazione richiesta (20 risultati per pagina, `start = (pagina - 1) * 20`).

Se lo script non è disponibile, ometti la pipe finale e mappa tu `$BODY` con la
tabella sotto: prima controlla `$CODICE` e verifica che `$BODY` sia un JSON Solr
valido (`response.docs` array, `response.numFound` numero). Se il codice non è 0
o il corpo non è un JSON Solr valido, la ricerca è **fallita**, non vuota.

### Passo 3 — Presenta i risultati

Se hai usato lo script, la risposta è già nella forma standard. Se hai letto il
JSON grezzo, mappalo con questa tabella:

| Campo Solr | Campo standard | Regola |
|---|---|---|
| `response.numFound` | `totale` | il numero totale dei risultati |
| `response.docs[].id` | `id` | identificativo del documento |
| `szdec`, `tipoprov`, `numdec`, `anno` | `estremi` | `Sez. {szdec} {tipoprov} n. {numdec} del {anno}`; se manca un pezzo, usa `id` |
| `szdec` | `sezione` | |
| `tipoprov` | `tipo` | |
| `datdec` | `dataDecisione` | |
| `datdep[0]` | `dataDeposito` | solo se presente |
| `filename[0]` | `urlPdf` | `https://www.italgiure.giustizia.it/sncass/{filename[0] senza il ./ iniziale}`: è il link al documento, che può essere un PDF o un indice testuale `.txt` |

La forma standard è:

```json
{
  "totale": <numero>,
  "massime": [
    {
      "id": "snciv<anno><numero>",
      "estremi": "Sez. <sezione> Sentenza n. <numero> del <anno>",
      "sezione": "<sezione>",
      "tipo": "<tipo>",
      "dataDecisione": "<YYYY-MM-DD>",
      "dataDeposito": "<YYYY-MM-DD>",
      "urlPdf": "https://www.italgiure.giustizia.it/sncass/<percorso>"
    }
  ]
}
```

I valori qui sono segnaposto: nella risposta reale contengono i dati del
documento, non dei valori di esempio.

`urlPdf` è il nome del campo (il contratto con `cassazione_search_massime`),
ma non promettere un PDF: è il link al documento, e sull'indice pubblico è
spesso un indice testuale `.txt`. Presentalo come «link al documento» e non
come «scarica il PDF».

Per ogni precedente, indica la provenienza: `Fonte: ItalGiure (SentenzeWeb pubblico)`.
Non attribuire a questa ricerca le **massime** (il testo della massima): l'indice
pubblico non le espone. Se servono le massime o gli Rv., serve l'area riservata.

## Se la ricerca fallisce

I tre casi sono distinti e non vanno confusi: un canale bloccato, una ricerca
fallita e una ricerca senza risultati sono tre fatti diversi.

| Sintomo | Cosa significa | Cosa fare |
|---|---|---|
| la `curl` esce con codice 28 (timeout) | l'IP corrente non è ammesso da ItalGiure | leggi lo stderr della `curl`: il codice `(28)` è un timeout (canale bloccato), non un problema di formato; poi offri la modalità browser (`italgiure-browser`) e i link di ricerca manuale. L'errore di JSON che segue è una conseguenza del timeout, non un problema diverso |
| la `curl` esce con un codice diverso da 0 **e diverso da 28** (22 su errore HTTP) oppure il formatter segnala un payload non valido | la ricerca è **FALLITA**: non è una ricerca vuota | leggi il corpo che la `curl` ha stampato (`--fail-with-body` lo conserva): se c'è un campo `error` riportalo; se è HTML, JSON non valido o troncato, verifica l'URL e riprova con `rows` più piccolo, poi offri la modalità browser. **Non** riportare `totale: 0`: la ricerca non è arrivata a compimento |
| `totale: 0` | la ricerca è andata a buon fine, non ci sono risultati | nessun errore: riporta che non ci sono precedenti per quei termini, e prova con la ricerca per estremi |

Il messaggio all'utente deve dire chiaramente **quale** dei tre casi è: canale
bloccato per IP (timeout), ricerca fallita (errore HTTP o JSON non valido)
oppure nessun risultato (`totale: 0`).

Nota: questa modalità copre gli utenti su IP ammesso (in Italia). Coprire anche
gli utenti fuori dall'Italia richiede che il server abbia un'uscita in Italia:
non è una funzionalità del plugin.
