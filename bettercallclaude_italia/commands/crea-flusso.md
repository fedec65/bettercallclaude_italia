---
description: "Crea un flusso di lavoro personalizzato riutilizzabile combinando gli agenti BetterCallClaude Italia. Basato su intervista: scegli agenti, ordine e output. Salvato per l'uso con /bettercallclaude-italia:flusso."
tools:
  - Read
  - Bash
  - mcp__plugin_bettercallclaude-italia_workflows-ita__claim_user_id
  - mcp__plugin_bettercallclaude-italia_workflows-ita__list_agents
  - mcp__plugin_bettercallclaude-italia_workflows-ita__validate_pipeline
  - mcp__plugin_bettercallclaude-italia_workflows-ita__save_workflow
  - Grep
  - Glob
  - WebSearch
  - WebFetch
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_search_massime
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_get_sentenza
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_draft_document
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_compute_deadlines
  - mcp__workflows-ita__claim_user_id
  - mcp__workflows-ita__list_agents
  - mcp__workflows-ita__validate_pipeline
  - mcp__workflows-ita__save_workflow
  - mcp__cassazione__cassazione_search_massime
  - mcp__cassazione__cassazione_get_sentenza
  - mcp__legal-persona-ita__legal-persona-ita_draft_document
  - mcp__legal-persona-ita__legal-persona-ita_compute_deadlines
---

# Crea Flusso Personalizzato

Sei invocato tramite `/bettercallclaude-italia:crea-flusso`. Guidi l'utente nella progettazione di un flusso multi-agente riutilizzabile, lo validi contro il manifest degli agenti del plugin italiano e lo salvi per l'esecuzione successiva con `/bettercallclaude-italia:flusso <slug>`.

## Risolvi lo user ID

Ogni chiamata ai tool workflows-ita richiede uno `user_id`. Risolvilo in questo ordine:

1. **Impostazione del plugin**: se `${user_config.user_id}` si risolve in un valore non vuoto (cioè il placeholder non appare letteralmente), usalo.
2. **Istruzioni personalizzate** (Cowork Desktop): se le istruzioni personalizzate della sessione contengono una riga della forma `BetterCallClaude workflow user ID: <id>`, usa quell'ID. È la fonte durevole su Cowork — le istruzioni sono conservate dall'app e sopravvivono ai riavvii, a differenza del filesystem della sandbox.
3. **Config locale**: leggi `~/.betterask/config.yaml` se esiste. Se contiene una riga `user_id:`, usa quel valore. (Solo cache di comodo — Cowork svuota la home della sandbox al riavvio.)
4. **Genera una volta, fai il claim, poi persisti**: genera 8 byte casuali in esadecimale (es. `openssl rand -hex 8`) e costruisci l'ID candidato `bcc-<hex>`. Fai il claim lato server chiamando `claim_user_id`; se restituisce `claimed: false` (collisione), genera un nuovo candidato e riprova, fino a 3 tentativi. Se tutti e 3 i tentativi collidono (praticamente impossibile con ID casuali a 64 bit), chiedi all'utente di scegliere un ID da solo e di fornirlo tramite la riga nelle istruzioni personalizzate (Cowork) o l'impostazione del plugin (CLI), e fermati. Persisti l'ID rivendicato **aggiungendo in coda** la riga `user_id: bcc-<hex>` a `~/.betterask/config.yaml` (esegui prima `mkdir -p ~/.betterask`; solo append — il file può già contenere la modalità privacy e la `italgiure_session_key` dell'utente). Poi comunica all'utente una sola volta, in breve: "Non era impostato nessun User ID, quindi ne ho generato uno personale (`bcc-…`) e l'ho salvato in `~/.betterask/config.yaml`. I tuoi flussi sono memorizzati sotto questo ID — tienilo privato: chiunque lo conosca può leggere i tuoi flussi. Cowork cancella questo file al riavvio, quindi per conservare l'ID in modo permanente aggiungi questa riga in Impostazioni → Generali → Istruzioni per Claude: `BetterCallClaude workflow user ID: bcc-…`."
5. Se il file non è scrivibile, comunica all'utente l'ID generato e chiedigli di aggiungere la riga `BetterCallClaude workflow user ID: <id>` in Impostazioni → Generali → Istruzioni per Claude (Cowork) oppure di impostare l'impostazione del plugin **User ID per i flussi personalizzati** (CLI), poi fermati. **Mai** ricadere su un ID condiviso `default`.

**Claim degli ID preesistenti**: per un ID proveniente dall'impostazione del plugin (passo 1), dalle istruzioni personalizzate (passo 2) o dal file di config (passo 3), chiama `claim_user_id` una sola volta prima della prima operazione sui flussi. Su `claimed: false` l'ID è già registrato sul server — mostra una nota una tantum: "Questo User ID è già registrato sul server. Se è il tuo, proveniente da un'altra macchina, ignora questo avviso; altrimenti imposta un User ID diverso." Poi prosegui normalmente (la proprietà non è verificabile lato server; chiunque possieda l'ID può accedere ai suoi flussi).

## Procedura

1. **Elenca gli agenti disponibili.** Chiama `list_agents()` e presenta il risultato come tabella compatta: `agent_id`, nome visualizzato, cosa accetta (`input_types`), cosa produce (`output_types`). Sono già limitati al plugin italiano — nessun altro agente è utilizzabile.

2. **Intervista l'utente.** Chiedi, una domanda alla volta:
   - A cosa serve il flusso? (scopo, input tipico)
   - Quali agenti devono girare, in quale ordine? Suggerisci una sequenza basata sulla compatibilità dei tipi mostrata al passo 1.
   - Dopo quali passi l'esecuzione deve fermarsi per conferma? (`checkpoint: true`)
   - Come deve essere l'output finale? (diventa `output_spec`)
   - Uno `slug` breve in kebab-case (proponine uno dallo scopo) e un `name` leggibile + una `description` di una riga.

3. **Valida.** Chiama `validate_pipeline` con la pipeline assemblata. In caso di errori, spiegali in linguaggio naturale e proponi una correzione concreta:
   - `unknown_agent` → l'agente non fa parte di questo plugin; mostra le alternative valide.
   - `incompatible_chaining` → spiega quali tipi di dato produce il passo precedente rispetto a cosa accetta il successivo, e suggerisci un agente intermedio o un riordino.
   - `non_sequential_steps` → rinumerare.
   Non mostrare mai all'utente errori JSON grezzi. Rivalida dopo ogni correzione finché `valid: true`.

4. **Conferma.** Mostra la pipeline finale come lista numerata (agente — scopo — checkpoint sì/no), l'output spec e lo slug. Chiedi conferma esplicita prima di salvare.

5. **Salva.** Chiama `save_workflow` con `user_id`, `slug`, `name`, `description`, `pipeline`, `output_spec`. Non impostare `visibility` a meno che l'utente non chieda esplicitamente di condividere il flusso (`team` / `public`).

6. **Conferma il successo.** Comunica all'utente: "Salvato. Eseguilo con `/bettercallclaude-italia:flusso <slug>`." Se il server ha riportato errori di validazione al salvataggio (rivalida), torna al passo 3 con quegli errori.

## Regole

- L'ambito del plugin è imposto dal manifest lato server — non aggiungere filtri tuoi sugli agenti.
- Non inventare mai agent_id; usa solo i valori restituiti da `list_agents()` in questa sessione.
- Mantieni l'intervista breve: al massimo le domande elencate sopra.

## Query Utente

$ARGUMENTS
