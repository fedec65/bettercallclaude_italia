---
name: italgiure-browser
description: "Interroga l'area riservata ItalGiure usando la sessione gia' autenticata del browser dell'utente, per ottenere massime complete, Rv., conformi e difformi e ricerca per estremi. Modalita' presidiata: richiede un connettore browser collegato, autorizzazione esplicita dell'utente e login verificato. Non chiede mai credenziali e non trasmette nulla fuori dal browser. Attivazione quando servono massime complete o gli estremi di una sentenza e la ricerca per parole non basta. NON attivare per: ricerca di massa (usa italgiure-search)."
tools:
  - Bash
  - Read
  - Grep
  - Glob
  - WebFetch
  - WebSearch
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_search_massime
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_get_sentenza
  - mcp__cassazione__cassazione_search_massime
  - mcp__cassazione__cassazione_get_sentenza
---

# Area riservata ItalGiure dal browser

Interroga l'area riservata ItalGiure **usando la sessione che l'utente ha gia'
aperto nel suo browser**. Le credenziali non lasciano mai il browser: e' il
browser dell'utente a fare la richiesta.

Questa modalita' serve per cio' che l'indice pubblico non dà: **massime
complete**, **Rv.**, **conformi e difformi**, e la **ricerca per estremi**.

Per la ricerca per parole sull'indice pubblico usa la skill `italgiure-search`:
e' piu' rapida, restituisce JSON e non richiede alcuna interazione. Vale la
regola in entrambe le direzioni: questa skill non sostituisce
`italgiure-search` per la ricerca di massa, e `italgiure-search` non sostituisce
questa skill per le massime complete e gli estremi.

## Tre precondizioni, tutte necessarie

1. **Un connettore browser e' disponibile in sessione.** Rilevato per
   disponibilita' degli strumenti (Chrome DevTools MCP, Claude in Chrome, o altro
   connettore compatibile). Se non c'e', questa skill non e' utilizzabile: non
   tentare di aggirare.
2. **L'utente ha autorizzato esplicitamente questa modalita'** nella conversazione
   corrente. Nessuna autorizzazione implicita, nessuna autorizzazione ereditata da
   una sessione precedente. Se l'utente non l'ha chiesta, chiedi prima.
3. **L'utente risulta autenticato.** Verificalo guardando lo stato reale della
   pagina: il form di ricerca dell'area riservata deve essere presente e
   utilizzabile. Non lo presumere.

Il connettore e' un componente **di host**, non del plugin: i suoi strumenti
non compaiono nel blocco `tools:` di questa skill, perche' quel blocco accetta
solo i server MCP del plugin e gli strumenti generici. La skill quindi
**rileva il connettore a runtime**, guardando gli strumenti effettivamente
disponibili nella sessione. Se la sessione non espone strumenti di browser —
perche' non c'e' un connettore, oppure perche' l'host limita la skill agli
strumenti elencati — dichiaralo esattamente cosi' e offri il fallback
`italgiure-search`: non dichiarare di aver cercato.

Se una precondizione manca, spiega quale e offri l'alternativa: la skill
`italgiure-search` per l'indice pubblico, o i link di ricerca manuale.

## Regole di condotta

- **Pochissime interrogazioni**: massimo 3-5 per sessione, nessun parallelismo.
  Attendi almeno qualche secondo tra una richiesta e la successiva, e fermati
  dopo la quinta qualunque cosa succeda. Lo scopo e' non urtare l'anti-bot ne'
  le condizioni d'uso del servizio.
- **Nessuno scaricamento massivo**: nessuna estrazione di interi corpus, nessun
  loop su un elenco di cause.
- **Nessuna credenziale**: non chiedere mai username o password, non leggerle, non
  trasmetterle. Non usare `document.cookie`. Non riprodurre da Bash la richiesta
  `/api` dell'area riservata: porta con se' i cookie di sessione e l'header di
  autorizzazione, e ogni richiesta deve uscire dal browser dell'utente.
- **Non salvare nulla**: i risultati stanno nella conversazione.

## Procedura

### Passo 1 — Verifica le precondizioni

1. Verifica che ci sia un connettore browser.
2. Chiedi l'autorizzazione esplicita, se non c'e'.
3. Cerca la scheda che l'utente ha gia' aperto sull'area riservata e usa quella:
   e' la sessione autenticata. Se non c'e' alcuna scheda gia' aperta, naviga a
   `https://www.italgiure.giustizia.it/new/archives` e verifica che il form di
   ricerca sia presente.

Al primo uso la mappatura dei campi della nuova interfaccia non e' nota: esegui
la procedura di discovery descritta in `references/discovery.md` e annota il
risultato.

### Passo 2 — Ricerca

Compila i campi della maschera di ricerca e invia. La ricerca **per parole**
funziona; quella **per estremi** non e' confermata: se fallisce, non insistere e
passa al fallback della ricerca per parole, cioe' la skill `italgiure-search`.

### Passo 3 — Estrai

Per ogni risultato estrai: estremi (sezione, numero, anno), tipo di provvedimento,
data della decisione, numero della massima, Rv., e il link al testo integrale.
Il testo della massima si copia dall'area riservata: l'indice pubblico non lo
espone. Nel testo compaiono anche i rimandi alle massime conformi e difformi:
copiali insieme al testo, non aggiungerli come campi.

### Passo 4 — Presenta

Restituisci la stessa forma del tool `cassazione_search_massime`, cosi' tutto a
valle (`citation-content-verify`, `legal-evaluator`, `legal-5step-framework` e
il comando `/legale-5step`) funziona senza sapere da dove arrivano i dati.

**Non chiamare quel tool**: lato server non funziona — l'IP di datacenter e'
scartato da italgiure.giustizia.it — e restituirebbe zero risultati senza
motivo. Qui il suo nome serve solo da riferimento per la forma da produrre.

La forma standard e':

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
      "urlPdf": "<link al testo integrale>",
      "numeroMassima": "<numero della massima>",
      "rv": "<Rv.>"
    }
  ]
}
```

I valori qui sono segnaposto: nella risposta reale contengono i dati del
documento, non dei valori di esempio. `dataDeposito`, `urlPdf`, `numeroMassima` e
`rv` si omettono quando non disponibili.

Il **testo della massima** non e' un campo di questa forma: presentselo nella
conversazione **accanto al JSON**, un blocco di testo per ogni `id`
(intestato con l'`id` e gli estremi). Il JSON e i blocchi di testo sono due
cose distinte: non aggiungere il testo come campo della forma standard, che
deve restare identica a quella del tool `cassazione_search_massime`.

Mappa i dati dell'interfaccia sui campi standard con questa tabella:

| Elemento nell'area riservata | Campo standard | Regola |
|---|---|---|
| numero totale di risultati | `totale` | il numero restituito dalla ricerca |
| identificativo del documento | `id` | usa l'identificativo mostrato dall'interfaccia; se assente compongilo come `snciv<anno><numero>`, come nella skill `italgiure-search` |
| sezione, tipo, numero, anno | `estremi` | `Sez. {sezione} {tipo} n. {numero} del {anno}`; se manca un pezzo, usa `id` |
| sezione | `sezione` | |
| tipo di provvedimento | `tipo` | |
| data della decisione | `dataDecisione` | formato `YYYY-MM-DD` |
| data di deposito | `dataDeposito` | solo se presente |
| link al testo integrale | `urlPdf` | l'URL del documento, come restituito dall'interfaccia |
| numero della massima | `numeroMassima` | solo se presente: l'indice pubblico non lo fornisce |
| Rv. | `rv` | solo se presente: idem |

Indica per ogni precedente la provenienza: `Fonte: ItalGiure (area riservata)`.

## Se la ricerca fallisce

- **La maschera non risponde o la pagina non si apre**: l'utente non e'
  autenticato, oppure il connettore non funziona — o non e' nemmeno
  disponibile, perche' l'host limita la skill agli strumenti elencati e il
  connettore non e' fra questi. Riporta quale dei due casi e' e offri la skill
  `italgiure-search`.
- **Il captcha o un blocco anti-bot compare**: fermati immediatamente. Non
  ripetere le richieste e non tentare di aggirare il blocco. Riporta il fatto
  all'utente e passa all'indice pubblico.
- **La ricerca per estremi non funziona**: prova la ricerca per parole, che e'
  confermata, e riporta il limite.

## Disclaimer

> Questa modalita' opera sulla sessione del browser dell'utente. I dati
> consultati restano nella conversazione e non lasciano il computer. Le
> conclusioni legali richiedono revisione di un avvocato.
