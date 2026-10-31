# Come accedere al server della Cassazione

Istruzioni per l'utente del plugin BetterCallClaude — Come usare il server Cassazione

> **Aggiornato ottobre 2026** — rifatto sulle prove della nuova area riservata ItalGiure (app Angular, percorsi `/new/...`). Le vecchie istruzioni basate su `document.cookie` e sul cookie `ASPSESSIONID...` **non funzionano più** e sono state sostituite.

---

## Cosa devi fare, in 3 passi (una volta sola)

### Passo 1: Ottenere il cookie di sessione ItalGiure

1. Apri il tuo browser (Chrome, Firefox, Safari, Edge).
2. Vai sull'area riservata ItalGiure: [https://www.italgiure.giustizia.it/new/archives](https://www.italgiure.giustizia.it/new/archives)
3. Fai login con **SPID** oppure con **nome utente e password** (per esempio le credenziali della convenzione Cassa Forense).
4. **Prima di fare qualsiasi ricerca**, apri gli Strumenti per sviluppatori:
   - **Windows/Linux**: F12 o Ctrl+Shift+I
   - **macOS**: Cmd+Option+I
5. Vai sulla scheda **"Network"** (Rete) — deve essere aperta *prima* della ricerca, altrimenti le richieste non vengono registrate.
6. Ora **fai una ricerca qualsiasi** nell'area riservata (il motore di ricerca sentenze). Se la pagina era già aperta prima di attivare Network, ricaricala (F5/Cmd+R).
7. Nell'elenco delle richieste registrate, individua una chiamata dati dell'**area riservata** (un percorso `/new/...`): aprila e nella sezione **Request Headers → Cookie** trovi la stringa completa dei cookie inviati (tipo `PHPSESSID=...; sessonly=1; lang=it; cookiesession1=...`).
8. Verifica che nella stringa compaia **`PHPSESSID`**: è il cookie che attesta il login. Se lo vedi, seleziona e copia **tutto** il valore del campo `Cookie`.

**Perché non più `document.cookie`?** I cookie di sessione della nuova area riservata sono marcati **HttpOnly**: JavaScript non può leggerli, quindi la Console restituisce una stringa vuota. L'unico punto da cui si vedono è la scheda Network. Inoltre il vecchio cookie `ASPSESSIONID...` **non esiste più**: oggi i cookie sono `PHPSESSID`, `sessonly`, `lang`, più quelli del firewall FortiWeb (`cookiesession1`) e di Akamai Bot Manager (`_abck`, `bm_sz`, `ak_bmsc`, `bm_sv`).

**Conserva questa stringa**: è il tuo "biglietto d'ingresso" per il server Cassazione.

### Passo 2: Salvare il cookie nelle impostazioni del plugin

Inserisci il cookie nelle **impostazioni del plugin**, alla voce **"Cookie sessione ItalGiure"** (`userConfig.italgiure_cookie`). Il valore è marcato come sensibile e resta sulla tua macchina.

Da questo momento il plugin passa automaticamente il cookie a ogni chiamata Cassazione, in tutte le conversazioni: **non devi più incollarlo a ogni richiesta**.

> Se preferisci non salvarlo, puoi ancora fornirlo manualmente quando l'agente lo richiede: varrà solo per quella conversazione.

### Passo 3: Gestire il cookie quando scade

Non esiste una durata garantita: secondo l'informativa privacy di ItalGiure i cookie di sessione svaniscono **alla chiusura del browser** e comunque scadono per inattività (tempo variabile). Quando il server risponde con `cookieValido: false`:

1. Torna su ItalGiure e rifai il login (se la sessione è scaduta).
2. Ripeti il Passo 1 (copia un nuovo cookie dalla scheda Network).
3. Aggiorna il valore nelle impostazioni del plugin.

In pratica: aspettati di rinnovarlo **ogni volta che smette di funzionare**, non su un calendario fisso.

---

## Attenzione: timeout e protezione anti-bot

Le richieste del connettore partono da un server in data center, senza il JavaScript di verifica usato dal browser. Il firewall **FortiWeb** (e la protezione **Akamai Bot Manager**) possono quindi bloccare o rallentare queste richieste: in tal caso la chiamata va in **timeout** anche con un cookie perfettamente valido, mentre la stessa ricerca dal browser funziona. Questo è un limite noto, lato infrastruttura ItalGiure, non un errore del tuo cookie.

Se incontri timeout ripetuti:

- riprova dopo qualche minuto (a volte è un rallentamento temporaneo);
- verifica che la ricerca funzioni dal tuo browser: se lì funziona ma il tool va in timeout, è il blocco anti-bot del server;
- usa i link di fallback (SentenzeWeb, Google, ECLI) che il tool restituisce comunque.

> **Nota su SentenzeWeb**: la ricerca libera su `https://www.italgiure.giustizia.it/sncass/` ("Sentenze Cassazione") **non richiede login**. Nell'area riservata l'unico cookie inviato nelle richieste `sn.solr` è `cookiesession1` (FortiWeb). Per molte ricerche il cookie di login non serve affatto.

---

## Domande frequenti

**"Perché non automate il login con SPID?"**
Non è possibile né consentito: l'autenticazione SPID richiede la presenza dell'utente e quasi sempre un secondo fattore (OTP/app), e le regole AGID vietano la delega automatizzata delle credenziali. Il cookie salvato nelle impostazioni è la modalità persistente supportata.

**"Il cookie è sicuro da salvare?"**
È un cookie di sessione standard: non contiene la tua password, solo un identificativo temporaneo di sessione. Nelle impostazioni del plugin è trattato come valore sensibile e non lascia la tua macchina se non come parametro delle chiamate al server Cassazione. Non condividerlo pubblicamente.

**"Posso non fornire il cookie?"**
Sì. Senza cookie, i tool restituiranno solo link di fallback (SentenzeWeb, Google, DuckDuckGo, ECLI) e istruzioni su come configurare il cookie. Non vedrai i risultati completi di ItalGiure.

**"Cosa succede se sbaglio cookie?"**
Il server risponde con `cookieValido: false` e un messaggio che ti guida all'aggiornamento.

**"Esiste un'alternativa al salvataggio del cookie sul mio computer?"**
Sì: la **sessione registrata lato server**. Chiedi all'agente di registrare il cookie con il tool `cassazione_session_set` scegliendo una passphrase (min 8 caratteri): il cookie viene salvato cifrato sul server e mantenuto vivo da un keep-alive automatico (che ne segnala la scadenza). Salva poi la passphrase nelle impostazioni del plugin alla voce **"Chiave sessione ItalGiure"** (`userConfig.italgiure_session_key`): da quel momento le ricerche useranno la sessione registrata senza passare il cookie a ogni chiamata. Puoi verificarne lo stato con `cassazione_session_status` ed eliminarla con `cassazione_session_delete`.

---

## Esempio pratico (cosa succede)

**Scenario A — Cookie configurato nelle impostazioni:**
Chiedi al plugin: "Cerca massime sulla responsabilità medica"
→ Il plugin chiama `cassazione_search_massime` con il tuo cookie (letto dalle impostazioni, senza chiederti nulla)
→ Ricevi i risultati strutturati da ItalGiure (estremi, sezione, data, link PDF)

**Scenario B — Cookie mancante o scaduto:**
Chiedi al plugin: "Cerca massime sulla responsabilità medica"
→ Il plugin chiama `cassazione_search_massime` senza cookie valido
→ Ricevi un messaggio che spiega come ottenere il cookie e link di fallback per la ricerca manuale
→ Se salvi il cookie nelle impostazioni, alle richieste successive vale lo Scenario A

---

## Riepilogo rapido

| Cosa | Dove | Come |
|------|------|------|
| **Ottenere il cookie** | Browser su ItalGiure area riservata | Login (SPID o credenziali) → DevTools → **Network** → Request Headers → **Cookie** (NON Console/`document.cookie`: i cookie sono HttpOnly) |
| **Salvare il cookie** | Impostazioni del plugin | Voce "Cookie sessione ItalGiure" — una volta sola |
| **Rinnovare il cookie** | Browser + impostazioni | Quando il server segnala `cookieValido: false`: login fresco e nuovo cookie dalla scheda Network |
| **Timeout ripetuti** | — | Protezione anti-bot lato ItalGiure: riprova più tardi o usa i link di fallback |
