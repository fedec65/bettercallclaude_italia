---
description: "Definisce ed esegue workflow legali multi-agente (due diligence, preparazione contenzioso, ciclo contrattuale, closing immobiliare)."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_search
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_search_advanced
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_get_atto
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_elenco_tipi
  - mcp__plugin_bettercallclaude-italia_corte-costituzionale__corte-costituzionale_search
  - mcp__plugin_bettercallclaude-italia_corte-costituzionale__corte-costituzionale_get_sentenza
  - mcp__plugin_bettercallclaude-italia_corte-costituzionale__corte-costituzionale_norme_incostituzionali
  - mcp__plugin_bettercallclaude-italia_giustizia-amministrativa__giustizia-amministrativa_search
  - mcp__plugin_bettercallclaude-italia_giustizia-amministrativa__giustizia-amministrativa_get_sentenza
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_search_massime
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_get_sentenza
  - mcp__plugin_bettercallclaude-italia_eur-lex-ita__eur-lex-ita_search
  - mcp__plugin_bettercallclaude-italia_eur-lex-ita__eur-lex-ita_get_atto_celex
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_validate
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_parse
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_format
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_draft_document
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_compute_deadlines
  - mcp__plugin_bettercallclaude-italia_workflows-ita__claim_user_id
  - mcp__plugin_bettercallclaude-italia_workflows-ita__list_workflows
  - mcp__plugin_bettercallclaude-italia_workflows-ita__get_workflow
---

Sei invocato tramite `/bettercallclaude-italia:flusso`. Applica le metodologie delle skill italian-legal-strategy e italian-legal-research per definire ed eseguire il workflow richiesto.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

**Convenzione output**: scrivi tutti i file pipeline in `bcc-output/YYYY-MM-DD-<slug>/`. In chat mostra solo un riassunto di 3-5 righe. Vedi `skills/shared/SKILL.md`.

## I tuoi flussi salvati

Oltre ai workflow predefiniti delle skill, l'utente può avere flussi personalizzati salvati sul server `workflows-ita` (creati con `/bettercallclaude-italia:crea-flusso`).

Prima risolvi lo `user_id`, in questo ordine:

1. **Impostazione del plugin**: se `${user_config.user_id}` si risolve in un valore non vuoto (cioè il placeholder non appare letteralmente), usalo.
2. **Istruzioni personalizzate** (Cowork Desktop): se le istruzioni personalizzate della sessione contengono una riga della forma `BetterCallClaude workflow user ID: <id>`, usa quell'ID — è la fonte durevole su Cowork (sopravvive ai riavvii, a differenza del filesystem della sandbox).
3. **Config locale**: leggi `~/.betterask/config.yaml` se esiste; se contiene una riga `user_id:`, usa quel valore. (Solo cache di comodo — Cowork svuota la home della sandbox al riavvio.)
4. **Genera una volta, fai il claim, poi persisti**: genera 8 byte casuali in esadecimale (es. `openssl rand -hex 8`), costruisci il candidato `bcc-<hex>` e fai il claim lato server con `claim_user_id` — su `claimed: false` (collisione) genera un nuovo candidato e riprova, fino a 3 tentativi. Se tutti e 3 collidono, chiedi all'utente di scegliere un ID da solo e di fornirlo tramite la riga nelle istruzioni personalizzate (Cowork) o l'impostazione del plugin (CLI), e salta questa sottosezione. Poi **aggiungi in coda** `user_id: bcc-<hex>` (l'ID rivendicato) a `~/.betterask/config.yaml` (`mkdir -p ~/.betterask` prima; solo append — il file può contenere la modalità privacy e la `italgiure_session_key` dell'utente). Menziona l'ID generato all'utente una sola volta, in breve, includendo il suggerimento di aggiungere `BetterCallClaude workflow user ID: <id>` in Impostazioni → Generali → Istruzioni per Claude, così l'ID sopravvive ai riavvii di Cowork.
5. Se il file non è scrivibile, salta interamente questa sottosezione — **mai** usare un ID condiviso `default`.

Per un ID proveniente dall'impostazione del plugin (passo 1), dalle istruzioni personalizzate (passo 2) o dal file di config (passo 3), chiama `claim_user_id` una sola volta prima di elencare; su `claimed: false`, mostra una nota una tantum che l'ID è già registrato sul server (va bene se è l'ID dell'utente proveniente da un'altra macchina) e prosegui.

Poi chiama `list_workflows` con quello `user_id` e `include_public: true`.

Presenta i flussi restituiti nello stesso formato numerato dei template fissi (slug, nome, descrizione), numerandoli in continuazione dopo quelli fissi. Se la chiamata restituisce una lista vuota o fallisce (es. server non raggiungibile), ometti interamente questa sottosezione senza commentarla.

Quando l'utente seleziona un flusso salvato, chiama `get_workflow` con lo stesso `user_id` e lo `slug` scelto, poi esegui la `pipeline` restituita con la logica di esecuzione delle skill — identica a un template fisso. Ogni passo della pipeline: `agent_id` nomina un agente del plugin, `purpose` descrive il suo compito, e `checkpoint: true` significa pausa per conferma dell'utente dopo quello stadio.

$ARGUMENTS
