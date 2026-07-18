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

### Passo 2: Usare il cookie nel plugin BetterCallClaude

Quando chiami il tool `cassazione_search_massime` o `cassazione_get_sentenza` dal plugin, includi il cookie come parametro della chiamata.

Il plugin BetterCallClaude accetta il parametro opzionale `cookie` in entrambi i tool. Basta aggiungerlo alla richiesta.

**Non devi configurare nulla sul server**: il cookie passa direttamente dalla tua chiamata al tool.

### Passo 3: Gestire il cookie quando scade

Il cookie dura fino a 30 giorni. Quando scade:

1. Torna su ItalGiure (la sessione browser deve essere ancora attiva).
2. Ripeti il Passo 1 (estrai un nuovo cookie con `document.cookie`).
3. Usa il nuovo cookie nelle tue chiamate successive.

---

## Domande frequenti

**"Perché devo passare il cookie ogni volta?"**
Perché il server Cassazione non salva il tuo cookie per privacy e sicurezza. Ogni chiamata è indipendente.

**"Posso non passare il cookie?"**
Sì, ma allora il tool restituirà solo link di fallback (Google, DuckDuckGo, ECLI) e istruzioni su come configurare il cookie. Non vedrai i risultati reali di ItalGiure.

**"Il cookie è sicuro da passare?"**
Sì, è un cookie di sessione standard. Non contiene la tua password, solo un identificativo temporaneo di sessione. Non condividerlo pubblicamente.

**"Cosa succede se sbaglio cookie?"**
Il server risponde con `cookieValido: false` e un messaggio che ti guida all'aggiornamento.

---

## Esempio pratico (cosa succede)

**Scenario A — Cookie corretto:**
Chiedi al plugin: "Cerca massime sulla responsabilità medica"
→ Il plugin chiama `cassazione_search_massime` con il tuo cookie
→ Ricevi i risultati strutturati da ItalGiure (estremi, sezione, data, link PDF)

**Scenario B — Cookie mancante o scaduto:**
Chiedi al plugin: "Cerca massime sulla responsabilità medica"
→ Il plugin chiama `cassazione_search_massime` senza cookie valido
→ Ricevi un messaggio che spiega come ottenere il cookie e link di fallback per la ricerca manuale

---

## Riepilogo rapido

| Cosa | Dove | Come |
|------|------|------|
| **Ottenere il cookie** | Browser su ItalGiure | Login → DevTools → Console → `document.cookie` |
| **Passare il cookie** | Plugin BetterCallClaude | Aggiungilo come parametro `cookie` nella chiamata MCP |
| **Aggiornare il cookie** | Browser (quando scade) | Ripeti il primo passo |
