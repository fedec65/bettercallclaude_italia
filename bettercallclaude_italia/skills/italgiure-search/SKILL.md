---
name: italgiure-search
description: "Ricerca i precedenti della Corte di Cassazione interrogando l'indice pubblico SentenzeWeb dal PC dell'utente. La query parte dal computer dell'utente, non dal server BetterCallClaude: l'IP dei datacenter e' scartato da italgiure.giustizia.it. Restituisce estremi, sezione, data e link al PDF. Attivazione quando serve un precedente di legittimita' e la ricerca con il server MCP ha restituito zero risultati o un timeout. NON attivare per: ricerca normativa (usa italian-legal-research), verifica di citazioni esistenti (usa citation-content-verify), area riservata e massime complete (usa italgiure-browser)."
tools:
  - Bash
  - Read
  - Grep
  - Glob
---

# Ricerca Cassazione lato client

Interroga l'indice pubblico **SentenzeWeb** del CED Ministero della Giustizia.

## Perche' questa skill esiste

Il server MCP di BetterCallClaude e' deployato su un indirizzo IP di datacenter.
`www.italgiure.giustizia.it` **scarta a livello TCP** le richieste che arrivano da
quel tipo di indirizzo: la connessione va in timeout, con o senza cookie di
sessione. Percio' il tool `cassazione_search_massime` lato server non restituisce
risultati, e non e' un problema di cookie mancante.

Questa skill esegue la **stessa identica query** dalla macchina dell'utente, dove
l'IP e' ammesso. La risposta ha la stessa forma del tool server, cosi tutto a
valle funziona senza modifiche.

Vantaggio privacy: la ricerca **non transita dall'infrastruttura cloud di
BetterCallClaude**. Il termine di ricerca va diretto al Ministero della Giustizia.

## Quando usarla

- dopo un `cassazione_search_massime` lato server che ha restituito zero risultati
  o un timeout;
- quando l'utente chiede direttamente un precedente di Cassazione e il canale
  server non risponde;
- per verificare l'esistenza di una sentenza conoscendo gli estremi (numero e
  anno), in alternativa a `citation-verify-ita` per le sentenze.

Per l'**area riservata** (massime complete, Rv., conformi e difformi) usa
`italgiure-browser`. Per la **legislazione** usa `italian-legal-research`.

## Procedura

### Passo 0 — Individua lo script

Lo script sta nella stessa skill, in `scripts/italgiure-query.js`. **La directory
di lavoro della shell non e' la directory della skill**, quindi un percorso
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

Se lo script non e' disponibile, costruisci la query con queste regole:

- testo libero: racchiudilo in parentesi e escapa i caratteri speciali Solr
  (`+ - ! ( ) { } [ ] ^ " ~ * ? : \ /`);
- materia civile aggiunge ` AND kind:"snciv"`, penale aggiunge ` AND kind:"snpen"`;
- anno aggiunge ` AND anno:"YYYY"`;
- tipo aggiunge ` AND tipoprov:"Sentenza"` (o "Ordinanza", "Decreto", con l'iniziale
  maiuscola);
- le clausole si uniscono con ` AND `;
- se il testo contiene gia' sintassi Solr (parentesi iniziali, `:`, `~`, AND, OR)
  usalo cosi' com'e'.

**Attenzione al rilevamento della sintassi raw.** Il riconoscimento e' per
sottostringa: se il testo libero contiene un `AND` o un `OR` maiuscolo viene
trattato come sintassi Solr e passato **non escapato e non racchiuso**. Percio',
se i termini di ricerca contengono `AND` o `OR` maiuscoli, scrivili in minuscolo
oppure formula la query in sintassi Solr esplicita: altrimenti la ricerca si
comporta in modo inatteso.

### Passo 2 — Interroga l'indice

```bash
curl -sS -k -m 30 -X POST \
  "https://www.italgiure.giustizia.it/sncass/isapi/hc.dll/sn.solr/sn-collection/select?app.query" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "q=QUERY" \
  --data "rows=20&start=0&wt=json&fl=id,filename,szdec,tipoprov,datdec,numdec,anno,kind,datdep&sort=pd desc,datdec desc" \
  | node <SCRIPT> format
```

Note sulla invocazione:

- `-k`: l'host presenta una catena di certificazione non standard. Il server MCP
  fa lo stesso (`rejectUnauthorized: false`).
- `-m 30`: timeout esplicito. Se la `curl` va in timeout, l'IP corrente non e'
  ammesso: vedi «Se la ricerca fallisce».
- `curl` e non `node script.js`: l'hook privacy del plugin intercetta `curl` e i
  comandi di rete, e lascia passare i file locali. Usando `curl` la ricerca resta
  dentro il perimetro di controllo del segreto professionale.

Sostituisci `QUERY` con l'output del Passo 1, e `rows`/`start` con la
paginazione richiesta (20 risultati per pagina, `start = (pagina - 1) * 20`).

Se lo script non e' disponibile, ometti la pipe finale: la `curl` restituisce il
JSON grezzo di Solr, e mappalo con la tabella sotto.

### Passo 3 — Presenta i risultati

Se hai usato lo script, la risposta e' gia' nella forma standard. Se hai letto il
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
| `filename[0]` | `urlPdf` | `https://www.italgiure.giustizia.it/sncass/{filename[0] senza il ./ iniziale}` |

La forma standard e':

```json
{
  "totale": 42,
  "massime": [
    {
      "id": "snciv2025332127S",
      "estremi": "Sez. III Sentenza n. 17006 del 2025",
      "sezione": "III",
      "tipo": "Sentenza",
      "dataDecisione": "2025-06-12",
      "dataDeposito": "2025-09-01",
      "urlPdf": "https://www.italgiure.giustizia.it/sncass/..."
    }
  ]
}
```

Per ogni precedente, indica la provenienza: `Fonte: ItalGiure (SentenzeWeb pubblico)`.
Non attribuire a questa ricerca le **massime** (il testo della massima): l'indice
pubblico non le espone. Se servono le massime o gli Rv., serve l'area riservata.

## Se la ricerca fallisce

| Sintomo | Cosa significa | Cosa fare |
|---|---|---|
| `curl` va in timeout | l'IP corrente non e' ammesso da ItalGiure | offri la modalita' browser (`italgiure-browser`) e i link di ricerca manuale; l'errore di JSON che segue e' una conseguenza del timeout, non un problema diverso |
| `curl` restituisce HTML invece di JSON | la risposta non e' del Solr (redirection o blocco) | verifica l'URL, prova `-k` senza flag di header, e offri la modalita' browser |
| `totale: 0` | la ricerca e' andata a buon fine, non ci sono risultati | nessun errore: riporta che non ci sono precedenti per quei termini, e prova con la ricerca per estremi |
| errore di JSON (la `curl` ha risposto) | risposta troncata o non-JSON | riprova con `rows` piu' piccolo |

Il messaggio all'utente deve dire chiaramente **quale** dei due casi e': canale
irraggiungibile (timeout) oppure nessun risultato (totale 0). Sono problemi
diversi e non vanno confusi.

Nota: questa modalita' copre gli utenti su IP ammesso (in Italia). Coprire anche
gli utenti fuori dall'Italia richiede che il server abbia un'uscita in Italia:
non e' una funzionalita' del plugin.
