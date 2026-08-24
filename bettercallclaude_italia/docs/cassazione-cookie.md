# Come accedere al server della Cassazione

Istruzioni per l'utente del plugin BetterCallClaude — Come usare il server Cassazione

---

## Cosa devi fare, in 3 passi (una volta sola)

### Passo 1: Ottenere il cookie di sessione ItalGiure

1. Apri il tuo browser (Chrome, Firefox, Safari, Edge).
2. Vai sull'area riservata ItalGiure: [https://www.italgiure.giustizia.it/new/archives](https://www.italgiure.giustizia.it/new/archives)

   > Nota: la pagina di ricerca libera (`/sncass/`, "Sentenze Cassazione") **non** richiede login — non è lì che si ottiene il cookie. Il cookie di sessione viene rilasciato dall'area riservata dopo l'autenticazione, e vale per tutto il dominio `www.italgiure.giustizia.it`.
3. Fai login con SPID o con le tue credenziali professionali (es. Avvocatura).
4. Quando sei sulla pagina principale (motore di ricerca sentenze), apri gli Strumenti per sviluppatori:
   - **Windows/Linux**: F12 o Ctrl+Shift+I
   - **macOS**: Cmd+Option+I
5. Vai sulla scheda **"Console"**.
6. Digita `document.cookie` e premi Invio.
7. Copia il testo che appare (una stringa lunga tipo `ASPSESSIONIDXXXX=ABCDEF...`).

**Conserva questa stringa**: è il tuo "biglietto d'ingresso" per il server Cassazione.

### Passo 2: Salvare il cookie nelle impostazioni del plugin

Inserisci il cookie nelle **impostazioni del plugin**, alla voce **"Cookie sessione ItalGiure"** (`userConfig.italgiure_cookie`). Il valore è marcato come sensibile e resta sulla tua macchina.

Da questo momento il plugin passa automaticamente il cookie a ogni chiamata Cassazione, in tutte le conversazioni: **non devi più incollarlo a ogni richiesta**.

> Se preferisci non salvarlo, puoi ancora fornirlo manualmente quando l'agente lo richiede: varrà solo per quella conversazione.

### Passo 3: Gestire il cookie quando scade

Il cookie dura fino a 30 giorni. Quando scade, il server risponde con `cookieValido: false` e l'agente ti avvisa. Per rinnovarlo:

1. Torna su ItalGiure (la sessione browser deve essere ancora attiva).
2. Ripeti il Passo 1 (estrai un nuovo cookie con `document.cookie`).
3. Aggiorna il valore nelle impostazioni del plugin.

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
| **Ottenere il cookie** | Browser su ItalGiure | Login → DevTools → Console → `document.cookie` |
| **Salvare il cookie** | Impostazioni del plugin | Voce "Cookie sessione ItalGiure" — una volta sola |
| **Rinnovare il cookie** | Browser + impostazioni | Quando scade (~30 giorni), ripeti e aggiorna il valore |
