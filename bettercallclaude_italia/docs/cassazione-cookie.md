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

### Passo 2: Inserire il cookie nelle impostazioni del plugin

1. Apri **Cowork Desktop**.
2. Vai su **Personalizza** → **Sfoglia plugin** → **BetterCallClaude Italia**.
3. Clicca **Impostazioni** (ingranaggio).
4. Trova il campo **"Cookie sessione ItalGiure"**.
5. Incolla la stringa che hai copiato nel Passo 1.
6. Salva le impostazioni.

**Non devi fare altro**: il plugin passerà automaticamente il cookie al server Cassazione ogni volta che usi i comandi di ricerca.

### Passo 3: Gestire il cookie quando scade

Il cookie dura fino a 30 giorni. Quando scade:

1. Torna su ItalGiure (la sessione browser deve essere ancora attiva).
2. Ripeti il Passo 1 (estrai un nuovo cookie con `document.cookie`).
3. Aggiorna il campo **"Cookie sessione ItalGiure"** nelle impostazioni del plugin.

---

## Domande frequenti

**"Perché devo inserire il cookie nelle impostazioni?"**
Perché il server Cassazione è remoto (hosted su `mcp-italia.bettercallclaude.ch`). Il cookie viene passato come parametro MCP a ogni chiamata, mantenendo la tua sessione ItalGiure attiva senza condividere il cookie con altri utenti.

**"Posso non inserire il cookie?"**
Sì. Senza cookie, i tool restituiranno solo link di fallback (Google, DuckDuckGo, ECLI) e istruzioni su come configurare il cookie. Non vedrai i risultati reali di ItalGiure.

**"Il cookie è sicuro da inserire nelle impostazioni?"**
Sì, è un cookie di sessione standard. Non contiene la tua password, solo un identificativo temporaneo di sessione. Non condividerlo pubblicamente.

**"Cosa succede se sbaglio cookie?"**
Il server risponde con `cookieValido: false` e un messaggio che ti guida all'aggiornamento.

---

## Esempio pratico (cosa succede)

**Scenario A — Cookie corretto:**
Chiedi al plugin: "Cerca massime sulla responsabilità medica"
→ Il plugin chiama `cassazione_search_massime` con il tuo cookie (passato come parametro MCP)
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
| **Inserire il cookie** | Cowork Desktop | Impostazioni plugin → "Cookie sessione ItalGiure" |
| **Aggiornare il cookie** | Browser (quando scade) | Ripeti il primo passo e aggiorna le impostazioni |
