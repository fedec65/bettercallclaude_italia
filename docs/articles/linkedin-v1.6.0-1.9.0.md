# BetterCallClaude Italia: quattro release in un giorno. Cosa cambia per chi lavora nel diritto.

Ho appena pubblicato le versioni dalla **1.6.0 alla 1.9.0** di BetterCallClaude Italia, il plugin open source (AGPL-3.0) che porta l'intelligenza legale italiana dentro Claude Cowork Desktop. Non sono semplici bump di versione: ogni release risponde a un problema concreto che emerge quando si usa l'AI per lavoro legale vero.

## 🔗 v1.6.0 — Gli agenti tornano a parlare con le banche dati

Un dettaglio tecnico con conseguenze enormi: il prefisso con cui Cowork Desktop espone i tool MCP era cambiato, e gli agenti non raggiungevano più le fonti italiane (Normattiva, Cassazione, Corte Costituzionale, EUR-Lex), ripiegando silenziosamente sulla ricerca web generica. Ora il plugin usa il prefisso corretto: le risposte tornano ad attingere alle banche dati ufficiali.

## ✅ v1.7.0 — La fine delle citazioni inventate (o quasi)

Il problema numero uno dell'AI in ambito legale: le citazioni allucinate. La nuova skill di verifica sostanziale controlla ogni citazione contro la fonte live su due assi — **esistenza E supporto del contenuto**. Ogni citazione riceve uno stato: `MATCH`, `PARTIAL`, `MISMATCH`, `UNVERIFIED` o `SKIPPED`. Una citazione non verificata o contraddetta **blocca la consegna automatica del documento**: va corretta, dichiarata esplicitamente, o escalata all'avvocato. Non è un warning che si può ignorare: è un gate.

## 📅 v1.8.0 — La cronologia del fascicolo, con le fonti

Il nuovo comando `/cronologia-legale` trasforma una cartella di documenti (contratti, corrispondenza, atti, perizie) in una cronologia come la costruirebbe un avvocato. Le regole sono rigide:

- ogni evento deve citare documento e posizione — **niente fonte, niente evento**;
- i fatti si distinguono in **non contestati, allegati, contestati**, con attribuzione di parte;
- i conflitti di data vengono registrati con **entrambe** le date e le rispettive fonti, mai "risolti" in silenzio;
- le lacune probatorie (30+ giorni non documentati) vengono segnalate;
- i termini processuali e la prescrizione sono sempre marcati come **indicativi** — il calcolo autorevole resta al professionista.

## 🔒 v1.9.0 — La privacy non si dà per scontata

Aggiunti test di regressione automatici che impediscono il ritorno di un bug subdolo: su percorsi con spazi (tipici su macOS), l'hook che protegge il segreto professionale (art. 622 c.p.) poteva non partire, senza alcun errore visibile. Ora **90 test automatici** garantiscono che la protezione sia davvero attiva.

## Il filo conduttore? Fiducia verificabile.

Non "l'AI dice", ma **"l'AI mostra la fonte, segnala i conflitti, si ferma quando non può verificare"**. Perché nel lavoro legale un output plausibile ma non verificato è peggio di nessun output.

Il plugin è gratuito, open source e installabile da Cowork Desktop tramite il marketplace GitHub: `fedec65/bettercallclaude_italia`

Come sempre: strumento di supporto, non sostituto del giudizio professionale. Ogni output richiede la verifica dell'avvocato.

---

#LegalTech #IntelligenzaArtificiale #Avvocati #Diritto #OpenSource #AI #Innovazione #ClaudeAI
