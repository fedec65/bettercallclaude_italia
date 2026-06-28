---
description: "Esegue un ciclo worker-valutatore contro un Goal Record fino al raggiungimento della condizione di successo o al limite di stop. Produce un trail di verdetti verificabile."
---

# Loop Legale

Sei invocato tramite `/bettercallclaude-italia:legale-loop`. Esegui un ciclo iterativo worker-valutatore contro un Goal Record definito da `/legale-obiettivo`.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin.

## Parametri

- Primo argomento: ID o path del Goal Record
- `--max-iterazioni=N`: override del limite nel Goal Record
- `--prova-secca`: una sola iterazione work+verdict, poi stop (no loop)
- `--riprendi`: riprendi un loop precedente dalla ultima iterazione
- `--verboso`: mostra dettagli completi del verdetto in chat

**Equivalenti in linguaggio naturale**: puoi anche dire:
- "prova secca" o "una sola iterazione" -> `--prova-secca`
- "riprendi il loop" -> `--riprendi`
- "mostra tutto" o "dettagli completi" -> `--verboso`

## Pre-Check (Prima del Loop)

1. **Goal Record esiste**: verifica che il file `bcc-output/goals/<id>.md` esista e sia in stato `confirmed`.
2. **Separazione worker-valutatore**: verifica che `worker_role` ≠ `evaluator_role`. Rifiuta di procedere se sono lo stesso agente.
3. **Target accessibile**: verifica che il file/contesto target sia accessibile.
4. **Privacy**: applica le regole di privacy del Goal Record.

## Ciclo di Iterazione

Per ogni iterazione:

### 1. Pre-Check Privacy
Scansiona il contenuto per pattern privilegiati PRIMA di ogni iterazione (non solo la prima). Se trovati in modalita strict, interrompi.

### 2. Step Lavoro (Worker)
Il worker produce o rivede l'artefatto secondo l'obiettivo del Goal Record.

### 3. Step Verdetto (Valutatore)
Il valutatore giudica l'artefatto usando la skill `legal-evaluator`. Produce un Verdetto strutturato (vedi skill legal-evaluator per il formato).

### 4. Decisione
- **pass = true**: loop terminato con successo. Scrivi output finale.
- **pass = false E iterazione < max**: continua al prossimo ciclo.
- **pass = false E iterazione = max**: termina con NOT MET. Elenca findings residui.
- **no-progress**: se lo score non migliora per 2 iterazioni consecutive, termina con NOT MET.
- **violazione privacy**: termina immediatamente.

## Garanzie di Sicurezza (Non Negoziabili)

1. **Max iterazioni**: finito, default 5, cap assoluto 20.
2. **Guardia no-progress**: stop dopo 2 iterazioni consecutive senza miglioramento score.
3. **Separazione obbligatoria**: worker e valutatore DEVONO essere agenti diversi. Il loop rifiuta di partire se sono lo stesso.
4. **Terminazione onesta**: se il loop termina senza successo, lo stato e NOT MET con findings residui sempre elencati.
5. **Pre-check privacy ogni iterazione**: non solo alla prima.
6. **Human-in-the-loop**: il loop non invia, firma o trasmette mai nulla autonomamente.

## Output

```
bcc-output/loops/<goal-id>/
  iteration-1.md     # artefatto + verdetto iterazione 1
  iteration-2.md     # artefatto + verdetto iterazione 2
  ...
  summary.md         # riepilogo loop: iterazioni, score progression, verdetto finale
  final/             # artefatto finale (se successo)
```

In chat mostra solo un riassunto per iterazione:

```
**Iterazione [N]**: score [X]/100 — [pass/fail]
  [1-2 righe findings principali]
```

Al termine del loop:

```
**Loop completato**: [MET / NOT MET] dopo [N] iterazioni
  Score finale: [X]/100
  Findings residui: [N]
  Output: `bcc-output/loops/<goal-id>/summary.md`
```

---

## Query dell'Utente

$ARGUMENTS
