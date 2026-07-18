---
description: "Definisce una condizione di successo legale verificabile — accetta profili predefiniti o obiettivi free-text, produce un Goal Record persistito. Non avvia mai lavoro autonomamente."
---

# Obiettivo Legale

Sei invocato tramite `/bettercallclaude-italia:legale-obiettivo`. Definisci una condizione di successo legale verificabile che sara usata da `/legale-loop` per iterare fino al raggiungimento.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin.

## Parametri

- Primo argomento posizionale: nome profilo OPPURE obiettivo free-text
- `--target=<path>`: path al documento/contesto su cui lavorare
- `--max-iterazioni=N`: override del default (default: 5, cap: 20)
- `--valutatore=<agente>`: override agente valutatore
- `--privacy=<modo>`: override modalita privacy per il loop

**Equivalenti in linguaggio naturale**: puoi anche dire:
- "obiettivo: citazioni pulite" -> profilo `citazioni-pulite`
- "obiettivo: bozza pronta" -> profilo `bozza-pronta`
- "stress test convergenza" -> profilo `contraddittorio-convergenza`
- "triage NDA completo" -> profilo `nda-batch-pulito`
- "monitoraggio normativo" -> profilo `monitoraggio-normativo`
- "massimo 3 iterazioni" -> `--max-iterazioni=3`

## Profili Predefiniti

| Profilo | Descrizione | Worker | Valutatore |
|---------|-------------|--------|------------|
| `citazioni-pulite` | Anti-allucinazione: ogni citazione validata via MCP | agente drafting | specialista citazioni |
| `bozza-pronta` | Quality gate drafting (citazioni + struttura + claims support) | drafter via /redazione | analista giudiziario |
| `contraddittorio-convergenza` | Stress-test iterativo fino a convergenza o max iterazioni | advocate | adversary + judicial |
| `nda-batch-pulito` | Completezza triage NDA per cartelle | analista documenti | specialista compliance |
| `monitoraggio-normativo` | Monitoraggio cambiamenti normativi (normattiva + cassazione) | researcher | compliance |

Per dettagli sui profili, vedi `skills/legal-evaluator/references/loop-profiles.md`.

## Obiettivo Free-Text

Se l'utente non specifica un profilo predefinito, interpreta l'obiettivo come free-text:

1. Identifica la **condizione di successo** verificabile (cosa deve essere vero alla fine)
2. Identifica il **worker** appropriato (chi fa il lavoro)
3. Identifica il **valutatore** appropriato (chi giudica — DEVE essere diverso dal worker)
4. Proponi il Goal Record all'utente per conferma

## Output: Goal Record

Produci un Goal Record persistito in `bcc-output/goals/<id>.md`:

```yaml
goal_id: "goal_[timestamp]_[hash]"
profile: "[nome profilo o 'custom']"
objective: "[descrizione condizione di successo]"
target: "[path al documento/contesto]"
worker_role: "[agente worker]"
evaluator_role: "[agente valutatore]"
max_iterations: [N]
privacy_mode: "[strict/balanced/cloud]"
status: "confirmed"  # draft -> confirmed dopo approvazione utente
created: "[ISO timestamp]"

success_criteria:
  - "[criterio 1 verificabile]"
  - "[criterio 2 verificabile]"
  - "[criterio N verificabile]"

checks:
  - tool: "[nome tool MCP per verifica]"
    purpose: "[cosa verifica]"
```

## Regole

1. **Non avviare mai lavoro**: questo comando definisce solo l'obiettivo. Per eseguire, usare `/legale-loop`.
2. **Conferma obbligatoria**: il Goal Record parte in stato `draft`. Mostra all'utente e chiedi conferma esplicita prima di impostare `status: confirmed`.
3. **Separazione worker-valutatore**: worker e valutatore DEVONO essere agenti diversi. Se l'utente specifica lo stesso agente per entrambi, segnala l'errore.
4. **Cap iterazioni**: il massimo assoluto e 20. Se l'utente chiede piu di 20, segnala e imposta a 20.

---

## Query dell'Utente

$ARGUMENTS
