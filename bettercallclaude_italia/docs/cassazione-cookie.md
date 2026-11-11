# Come accedere ai contenuti della Cassazione

Istruzioni per l'utente del plugin BetterCallClaude — accesso alla
giurisprudenza della Corte di Cassazione.

> **Aggiornato novembre 2026** — rifatto sul canale realmente funzionante.
> Le vecchie istruzioni basate su `document.cookie`, sul cookie `PHPSESSID` e sui
> percorsi `/new/...` descrivevano un'interfaccia che non esiste più e sono state
> sostituite.

---

## Il quadro in breve

| Cosa vuoi | Serve | Autenticazione |
|---|---|---|
| Precedenti per parole chiave, estremi, sezione, data | skill **italgiure-search** | **nessuna** |
| Massime complete, Rv., conformi e difformi | skill **italgiure-browser** | login già attivo nel tuo browser |
| Il server BetterCallClaude interroga la fonte | — | in hosting non può e lo dichiara con `autenticazione.cookieValido: false`: vedi «Perché il server non può interrogare la fonte» |

La ricerca **non richiede autenticazione**. Non c'è alcun cookie da copiare per
fare una ricerca.

---

## 1. La ricerca per parole (quello che serve di solito)

Nessuna preparazione: chiedi al plugin «cerca i precedenti su [argomento]» e la
skill italgiure-search interroga l'indice pubblico SentenzeWeb **dal tuo
computer**. L'area riservata è necessaria solo per i contenuti che l'indice
pubblico non espone.

L'indice pubblico contiene il testo delle decisioni e i dati essenziali
(sezione, numero, data, tipo di provvedimento, link al PDF). **Non** contiene
le massime complete.

## 2. L'area riservata (massime complete, Rv., conformi e difformi)

L'area riservata si usa **dal browser che hai già aperto e autenticato**, con la
skill italgiure-browser. Non devi copiare cookie: le credenziali restano nel
browser, non escono dal tuo computer.

La modalità è **presidiata**: l'utente deve essere presente, le interrogazioni
sono poche (3-5 per sessione) e non si scarica nulla in blocco. È un limite
voluto: l'area riservata è un servizio a pagamento con condizioni d'uso e
protezione anti-bot, e un uso automatizzato indiscriminato non è accettabile.

### Come si fa il login

1. Apri il browser e vai su
   [https://www.italgiure.giustizia.it/new/archives](https://www.italgiure.giustizia.it/new/archives)
2. Autenticati con **SPID** oppure con **nome utente e password** (per esempio la
   convenzione Cassa Forense).
3. Verifica che la pagina del massimario civile sia raggiungibile: quello è il
   segnale che la sessione è attiva.

### Perché non automatizziamo il login

Lo SPID richiede la presenza dell'utente e quasi sempre un secondo fattore
(OTP o app), e le regole AGID vietano la delega automatizzata delle
credenziali. Il plugin non chiede e non riceve mai la tua password.

## 3. Perché il server BetterCallClaude non può interrogare la fonte

I server MCP di BetterCallClaude sono ospitati su un indirizzo IP di datacenter.
`www.italgiure.giustizia.it` **scarta a livello di rete** le richieste che
arrivano da quel tipo di indirizzo.

Il tool lo dichiara: la chiamata va a buon fine (`success: true`), ma
`data.autenticazione.cookieValido` vale `false` e
`data.autenticazione.messaggio` spiega il motivo. Non è un errore e non c'è un
timeout da aspettare.

Il messaggio distingue le cause: senza cookie la richiesta non parte nemmeno;
con un cookie la connessione non raggiunge il servizio, perché l'IP di datacenter
è scartato. In entrambi i casi il rimedio è lo stesso: la ricerca Cassazione
parte dal computer dell'utente, dove l'IP è ammesso.

Coprire anche gli utenti fuori dall'Italia richiederebbe al server un'uscita in
Italia: non è una funzionalità del plugin.

## 4. Il cookie: a cosa serve, in sintesi

Il cookie di sessione serve **solo** all'area riservata, e si usa **dal browser**:

- i cookie di sessione dell'area riservata sono marcati **HttpOnly**: non si
  leggono dalla Console, `document.cookie` restituisce una stringa vuota;
- l'unico punto in cui si vedono è la scheda **Network** degli strumenti per
  sviluppatori, su una richiesta dati dell'area riservata;
- l'area riservata invia anche un header di autorizzazione di tipo **Basic**: è il
  meccanismo di autenticazione dell'area riservata, e il plugin non lo riproduce
  né deve riceverlo.

Il plugin **non** ti chiede di incollare cookie, e non li trasmette a server di
terzi.

---

## Domande frequenti

**«Devo configurare un cookie nelle impostazioni del plugin?»**
No, per la ricerca. La voce «Cookie sessione ItalGiure» nelle impostazioni è
riservata alle installazioni che interrogano l'area riservata via server, e non
è il canale consigliato: il canale server ospitato non può interrogare la
fonte e lo dichiara con `autenticazione.cookieValido: false`. La ricerca
normale non usa cookie.

**«Il cookie è sicuro da salvare?»**
Un cookie di sessione non contiene la password, solo un identificativo
temporaneo. Resta comunque sulla tua macchina. Non condividerlo pubblicamente.

**«Posso non fornire il cookie?»**
Sì. La ricerca per parole funziona senza autenticazione.

**«Perché su alcuni host funziona e su altri no?»**
Gli host italiani del settore giustizia usano whitelist di indirizzi e
protezione anti-bot. Un IP di datacenter è tipicamente escluso; un IP residenziale
italiano no. Per questo la ricerca gira dal computer dell'utente.

## Riepilogo rapido

| Cosa | Come |
|---|---|
| Precedenti per parole | chiedi al plugin: usa la skill italgiure-search. Nessuna preparazione |
| Massime complete, Rv. | skill italgiure-browser, con login già fatto nel browser |
| Il server ospitato non interroga la fonte | lo dichiara con `autenticazione.cookieValido: false`: usa il canale dal computer, non il server |
