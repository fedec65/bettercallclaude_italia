# Come accedere al server della Cassazione

Istruzioni per l'utente del plugin BetterCallClaude — Come usare il server Cassazione

---

## Cosa devi fare, in 3 passi

### Passo 1: Ottenere il cookie di sessione ItalGiure

1. Apri il tuo browser (Chrome, Firefox, Safari, Edge).
2. Vai su [https://www.italgiure.giustizia.it/sncass/](https://www.italgiure.giustizia.it/sncass/)
3. Fai login con SPID o con le tue credenziali professionali (es. Avvocatura).
4. Quando sei sulla pagina principale (motore di ricerca sentenze), apri gli Strumenti per sviluppatori:
   - **Windows/Linux**: F12 o Ctrl+Shift+I
   - **macOS**: Cmd+Option+I
5. Vai sulla scheda **"Console"**.
6. Digita `document.cookie` e premi Invio.
7. Copia il testo che appare (una stringa lunga tipo `ASPSESSIONIDXXXX=ABCDEF...`).

**Conserva questa stringa**: è il tuo "biglietto d'ingresso" per il server Cassazione.

### Passo 2: Fornire il cookie quando richiesto

Quando usi un comando che accede alla Cassazione (es. `/bettercallclaude_italia:legal`, `/bettercallclaude_italia:precedente`), l'agente ti chiederà:

> *"Per accedere alle massime complete della Cassazione ho bisogno del tuo cookie di sessione ItalGiure. Per ottenerlo: accedi a https://www.italgiure.giustizia.it/sncass/ con SPID/credenziali, apri DevTools (F12/Cmd+Option+I), vai su Console, digita `document.cookie` e incolla qui il risultato. Il cookie dura 30 giorni."**

Incolla il cookie che hai copiato nel Passo 1. L'agente lo userà per tutte le chiamate Cassazione durante la conversazione.

### Passo 3: Gestire il cookie quando scade

Il cookie dura fino a 30 giorni. Quando scade:

1. Torna su ItalGiure (la sessione browser deve essere ancora attiva).
2. Ripeti il Passo 1 (estrai un nuovo cookie con `document.cookie`).
3. Fornisci il nuovo cookie all'agente quando richiesto.

---

## Domande frequenti

**"Perché devo fornire il cookie ogni volta?"**
Perché il server Cassazione è remoto (hosted su `mcp-italia.bettercallclaude.ch`). Il cookie viene passato come parametro MCP a ogni chiamata, mantenendo la tua sessione ItalGiure attiva senza condivisione con altri utenti.

**"Posso non fornire il cookie?"**
Sì. Senza cookie, i tool restituiranno solo link di fallback (Google, DuckDuckGo, ECLI) e istruzioni su come configurare il cookie. Non vedrai i risultati reali di ItalGiure.

**"Il cookie è sicuro da fornire?"**
Sì, è un cookie di sessione standard. Non contiene la tua password, solo un identificativo temporaneo di sessione. Non condividerlo pubblicamente.

**"Cosa succede se sbaglio cookie?"**
Il server risponde con `cookieValido: false` e un messaggio che ti guida all'aggiornamento.

---

## Esempio pratico (cosa succede)

**Scenario A — Cookie corretto:**
Chiedi al plugin: "Cerca massime sulla responsabilità medica"
→ L'agente ti chiede il cookie ItalGiure
→ Fornisci il cookie
→ Il plugin chiama `cassazione_search_massime` con il tuo cookie (passato come parametro MCP)
→ Ricevi i risultati strutturati da ItalGiure (estremi, sezione, data, link PDF)

**Scenario B — Cookie mancante o scaduto:**
Chiedi al plugin: "Cerca massime sulla responsabilità medica"
→ L'agente ti chiede il cookie
→ Non fornisci il cookie o è scaduto
→ Il plugin chiama `cassazione_search_massime` senza cookie valido
→ Ricevi un messaggio che spiega come ottenere il cookie e link di fallback per la ricerca manuale

---

## Riepilogo rapido

| Cosa | Dove | Come |
|------|------|------|
| **Ottenere il cookie** | Browser su ItalGiure | Login → DevTools → Console → `document.cookie` |
| **Fornire il cookie** | Conversazione con l'agente | Incolla il cookie quando richiesto |
| **Aggiornare il cookie** | Browser (quando scade) | Ripeti il primo passo e fornisci il nuovo cookie |
