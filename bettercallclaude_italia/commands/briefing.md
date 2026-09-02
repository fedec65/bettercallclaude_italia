---
description: "Briefing strutturato pre-esecuzione — assembla un panel di specialisti, raccoglie il contesto della causa e costruisce un piano di esecuzione prima che gli agenti inizino a lavorare."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
  - Task
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_draft_document
  - mcp__legal-persona-ita__legal-persona-ita_draft_document
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_compute_deadlines
  - mcp__legal-persona-ita__legal-persona-ita_compute_deadlines
---

Sei invocato tramite `/bettercallclaude-italia:briefing`. Orchestri il flusso completo nella sessione top-level, dove il dispatch Task funziona effettivamente su ogni host (Cowork Desktop, Claude Code CLI). L'agente coordinatore (`italian-legal-briefing-coordinator`) è un planner puro — classifica, seleziona il panel e costruisce il piano; tu gestisci tutto il lavoro che richiede Task o interazione con l'utente.

> **Due contratti formali tra te e l'agente coordinatore**:
> 1. **Marcatore Mode** — la prima riga di ogni invocazione del coordinatore è `Mode: A` o `Mode: D`. L'agente abbina esattamente; qualsiasi altro input è un errore e lo segnali all'utente. Non scrivere `Mode A` (senza due punti), `in Mode A`, o affidarti a formulazioni in linguaggio naturale.
> 2. **Roster JSON** — il coordinatore restituisce solo JSON. Tu fai il rendering in linguaggio naturale, il dedup e la presentazione Q&A.

## Parametri

- `--chart` (o "traccia la mappa"): Bypassa il flusso briefing e indirizza direttamente a `/bettercallclaude-italia:mappa-legale`. Il coordinatore briefing **non** viene invocato. Usato per pratiche troppo grandi o troppo nebbiose per un piano di esecuzione statico.
- `--resume [id]`: Riprende una sessione briefing salvata.
- `--depth quick`: salta il panel (Fase B e C) e costruisce un piano minimo dalla sola classificazione in Fase D.
- `--agents lista` (CSV): sovrascrive il roster panel dopo la classificazione, es. `--agents researcher,strategist`.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

**Convenzione output**: scrivi il piano in `bcc-output/YYYY-MM-DD-<slug>/piano-briefing.md`. In chat mostra solo un riassunto di 3-5 righe. Vedi `skills/shared/SKILL.md`.

### Nuovo Briefing

1. **Fog check preliminare** (se applicabile — vedi sotto). Se la pratica è troppo nebbiosa per un piano statico, fermati qui e instrada a `/bettercallclaude-italia:mappa-legale`.
2. **Fase A — Pianifica il panel.** Invoca `italian-legal-briefing-coordinator` con prompt che inizia con `Mode: A` seguito dalla query dell'utente, dai flag parsati e dalla conferma che questa è una nuova sessione briefing. L'agente restituisce un oggetto JSON con la classificazione (dominio, giurisdizione, lingua, complessità 1–10, output desiderato, urgenza) e il roster panel (2–5 membri con una descrizione `role-in-this-briefing` per membro). Se l'utente ha passato `--agents …`, sovrascrivi il roster dopo.
3. **Fase B — Consulta il panel.** **Se è stato passato `--depth quick`: salta sia la Fase B che la Fase C e vai direttamente alla Fase D** con storico Q&A vuoto (il coordinatore costruirà un piano minimo dalla sola classificazione). Altrimenti:
   - **Pre-flight check**: conferma che il dispatch Task sia disponibile prima di lanciare i panelisti. Su Cowork Desktop e Claude Code CLI questo è sempre vero al top-level; se un futuro host lo nega, interrompi la Fase B, emetti il flag visibile *"Esecuzione in modalità single-agente — dispatch Task non disponibile nella sessione top-level; consultazione panel saltata, domande sintetizzate dalla classificazione del coordinatore"* e ripiega sul comportamento `--depth quick` (salta Fase C, vai a Fase D con storico vuoto). Non bloccare su una chiamata Task che non ritorna.
   - Altrimenti, dispatcha ogni membro del panel come subagente Task nella sessione top-level, in parallelo. Usa la descrizione `role` del coordinatore verbatim nel template di prompt. Il template è:

     ```
     Sei lo specialista [nome_agente] in un panel di briefing. L'utente ha presentato:

     "[query_utente]"

     Classificazione: [dominio/i], [giurisdizione], complessità [N]/10, output desiderato: [tipo_output].
     Il tuo ruolo specifico in questo briefing: [role-in-this-briefing dal roster].

     Restituisci 2–4 domande specifiche di cui necessiti risposta prima di poter svolgere il tuo lavoro.
     Focus su lacune informative che causerebbero errori o errato indirizzo — non su ciò che già conosci.
     NON svolgere ancora l'analisi.

     Formato:
     1. [Domanda] — [Perché importa per il tuo lavoro]
     2. [Domanda] — [Perché importa]
     ```

     Raccogli le domande di ogni membro. Se un membro non restituisce domande o il suo dispatch fallisce, annota la lacuna nel flag Q&A — mai sostituire silenziosamente una domanda sintetizzata dal coordinatore al suo posto.
4. **Fase C — Compila e chiedi.** Solo se la Fase B è stata eseguita e ha prodotto domande. Deduplica e prioritarizza le domande del panel, attribuendo ciascuna agli agenti che la richiedono. Limiti per complessità:
   - 4–6: 2–4 domande (1 round)
   - 7–8: 4–7 domande (1–2 round)
   - 9–10: 7–10 domande (2–3 round)

   Presentale in round adattivi:

   ```
   ## Domande di Briefing (Round 1 di [N])

   Il panel di specialisti necessita delle seguenti informazioni:

   1. **[Domanda]** ⏱️📊
      _Necessaria a: Procedure (calcolo termine), Risk (stima esposizione)_

   2. **[Domanda]** 🔍⚖️
      _Necessaria a: Researcher (ambito ricerca precedenti), Strategist (valutazione causa)_

   Risponda a ciò che può — risposte parziali vanno bene. Scriva "skip" per le domande a cui non può ancora rispondere.
   ```

   Smetti di chiedere quando le soglie critiche sono coperte, quando l'utente dice "procedi" / "è tutto ciò che ho", o quando hai raggiunto i round massimi. Segnala le lacune residue nel piano, non cercare di risolverle silenziosamente.
5. **Fase D — Costruisci il piano.** Re-invoca `italian-legal-briefing-coordinator` con prompt che inizia con `Mode: D` seguito dalla query originale, dalla classificazione, dal roster panel e dallo storico Q&A completo (per ogni round: le domande poste, le risposte ricevute; oppure "nessuno storico Q&A" se le Fasi B e C sono state saltate). L'agente restituisce il piano di esecuzione strutturato, oppure `{ foggy: true }` se la pratica è troppo complessa per un piano statico.
   - Se foggy: presenta *"Questa pratica è troppo nebbiosa per un piano statico — tracciamo invece la mappa decisionale?"* → `/bettercallclaude-italia:mappa-legale` e fermati.
6. **Fase E — Presenta e affina.** Mostra la tabella del piano (con flusso dati, punti decisione, segnalazioni) più il menu di approvazione standard:

   ```
   ### Cosa desidera fare?
   1. **Approva ed esegui** — Avvia immediatamente (mi fermerò ai checkpoint per la sua revisione)
   2. **Modifica** — Aggiusta agenti, ordine o compiti
   3. **Salva per dopo** — Persisti questo piano e tornaci quando vuole (`--resume [id]`)
   4. **Esporta** — Output del piano YAML
   5. **Cambia lunghezza output** — `--short`, `--medium` (default), o `--long`
   ```

   Gestisci "Perché è incluso [agente]?" richiamando il roster Mode A. Gestisci "Aggiungi / rimuovi [agente]" o "Cambia ordine" re-invocando Mode D con la richiesta di modifica.
7. **Fase F — Persisti e affida.** Su approvazione:
   - Aggiorna lo stato del piano a `"approved"`.
   - Persisti lo stato sotto chiave `briefing_[id]` (schema sotto); aggiorna `briefing_latest` e `briefing_index`.
   - Affida il piano YAML a `italian-legal-workflow-orchestrator` con istruzioni di eseguire con checkpoint a ogni fase dove `checkpoint: true`.

   Su "salva per dopo": aggiorna stato a `"saved"`, restituisci il briefing ID, indica `/bettercallclaude-italia:briefing --resume [id]` per riprenderlo.

   Se la persistenza memoria non è disponibile: avvisa l'utente (*"La persistenza cross-sessione non è disponibile. Questo piano andrà perso se la conversazione termina."*) e affida lo stesso nella sessione corrente.

**Schema memoria** (usato in Fase F e in Resume/List):

| Chiave | Scopo | Contenuto |
|-----|---------|---------|
| `briefing_[id]` | Stato briefing completo | Classificazione, panel, round Q&A, piano YAML, stato |
| `briefing_latest` | Briefing attivo più recente | Stringa briefing ID |
| `briefing_index` | Registro di tutti i briefing | Array di `{id, created, topic, status}` |

Trigger di persistenza: dopo la Fase A, dopo ogni round Q&A nella Fase C, dopo la Fase D, dopo l'approvazione in Fase E, a ogni checkpoint di esecuzione, al completamento.

### Ripresa (--resume [id])

Carica `briefing_index` → visualizza briefing salvati. Utente seleziona briefing → carica `briefing_[id]`. Verifica stato:
- `draft` → riprendi a Fase D (costruzione piano).
- `approved` → offri di avviare esecuzione.
- `executing` → identifica fase corrente, riprendi dalla prossima fase pendente.
- `saved` o `paused` → riprendi dal checkpoint di pausa.
- `completed` → visualizza sintesi, offri riesecuzione.

$ARGUMENTS
