---
description: "Diagnostica server MCP — testa ogni server, riporta stato e impatto in linguaggio semplice, suggerisce soluzioni per i problemi."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
  - Task
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_search
  - mcp__plugin_bettercallclaude-italia_corte-costituzionale__corte-costituzionale_search
  - mcp__plugin_bettercallclaude-italia_giustizia-amministrativa__giustizia-amministrativa_search
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_search_massime
  - mcp__plugin_bettercallclaude-italia_eur-lex-ita__eur-lex-ita_search
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_validate
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_draft_document
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_search_advanced
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_get_atto
  - mcp__plugin_bettercallclaude-italia_normattiva__normattiva_elenco_tipi
  - mcp__plugin_bettercallclaude-italia_corte-costituzionale__corte-costituzionale_get_sentenza
  - mcp__plugin_bettercallclaude-italia_corte-costituzionale__corte-costituzionale_norme_incostituzionali
  - mcp__plugin_bettercallclaude-italia_giustizia-amministrativa__giustizia-amministrativa_get_sentenza
  - mcp__plugin_bettercallclaude-italia_cassazione__cassazione_get_sentenza
  - mcp__plugin_bettercallclaude-italia_eur-lex-ita__eur-lex-ita_get_atto_celex
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_parse
  - mcp__plugin_bettercallclaude-italia_legal-citations-ita__legal-citations-ita_format
  - mcp__plugin_bettercallclaude-italia_legal-persona-ita__legal-persona-ita_compute_deadlines
  - mcp__plugin_bettercallclaude-italia_citation-verify-ita__citation-verify-ita_check_existence
  - mcp__plugin_bettercallclaude-italia_workflows-ita__list_workflows
  - mcp__normattiva__normattiva_search
  - mcp__corte-costituzionale__corte-costituzionale_search
  - mcp__giustizia-amministrativa__giustizia-amministrativa_search
  - mcp__cassazione__cassazione_search_massime
  - mcp__eur-lex-ita__eur-lex-ita_search
  - mcp__legal-citations-ita__legal-citations-ita_validate
  - mcp__legal-persona-ita__legal-persona-ita_draft_document
  - mcp__normattiva__normattiva_search_advanced
  - mcp__normattiva__normattiva_get_atto
  - mcp__normattiva__normattiva_elenco_tipi
  - mcp__corte-costituzionale__corte-costituzionale_get_sentenza
  - mcp__corte-costituzionale__corte-costituzionale_norme_incostituzionali
  - mcp__giustizia-amministrativa__giustizia-amministrativa_get_sentenza
  - mcp__cassazione__cassazione_get_sentenza
  - mcp__eur-lex-ita__eur-lex-ita_get_atto_celex
  - mcp__legal-citations-ita__legal-citations-ita_parse
  - mcp__legal-citations-ita__legal-citations-ita_format
  - mcp__legal-persona-ita__legal-persona-ita_compute_deadlines
  - mcp__citation-verify-ita__citation-verify-ita_check_existence
  - mcp__workflows-ita__list_workflows
  - mcp__plugin_bettercallclaude-italia_ollama__ollama_check_status
  - mcp__plugin_bettercallclaude-italia_ollama__ollama_generate
  - mcp__plugin_bettercallclaude-italia_ollama__ollama_chat
  - mcp__plugin_bettercallclaude-italia_ollama__ollama_classify_privacy
  - mcp__plugin_bettercallclaude-italia_ollama__ollama_list_models
  - mcp__ollama__ollama_check_status
  - mcp__ollama__ollama_generate
  - mcp__ollama__ollama_chat
  - mcp__ollama__ollama_classify_privacy
  - mcp__ollama__ollama_list_models
  - mcp__plugin_bettercallclaude-italia_workflows-ita__list_agents
  - mcp__plugin_bettercallclaude-italia_workflows-ita__validate_pipeline
  - mcp__plugin_bettercallclaude-italia_workflows-ita__save_workflow
  - mcp__plugin_bettercallclaude-italia_workflows-ita__get_workflow
  - mcp__plugin_bettercallclaude-italia_workflows-ita__delete_workflow
  - mcp__plugin_bettercallclaude-italia_workflows-ita__claim_user_id
  - mcp__plugin_bettercallclaude-italia_workflows-ita__log_run
  - mcp__workflows-ita__list_agents
  - mcp__workflows-ita__validate_pipeline
  - mcp__workflows-ita__save_workflow
  - mcp__workflows-ita__get_workflow
  - mcp__workflows-ita__delete_workflow
  - mcp__workflows-ita__claim_user_id
  - mcp__workflows-ita__log_run
---

# BetterCallClaude Italia — Diagnostica

Sei invocato tramite `/bettercallclaude-italia:doctor`. Diagnostica lo stato di tutti i server MCP di BetterCallClaude Italia e riporta i risultati in linguaggio semplice.

## Passo 1: Verifica Gateway

Verifica il gateway HTTP MCP con un check concreto e riproducibile, su DUE livelli:

1. **Radice del dominio**: WebFetch su `https://mcp-italia.bettercallclaude.ch/` — qualsiasi risposta HTTP (anche 404/405/401) conta come "dominio raggiungibile". Una risposta qui prova solo che la macchina/proxy risponde: NON prova che gli endpoint MCP funzionino.
2. **Un endpoint MCP reale**: WebFetch su `https://mcp-italia.bettercallclaude.ch/normattiva/mcp` — qualsiasi risposta HTTP (anche errore) conta come "backend MCP vivo"; un errore di rete/DNS/timeout conta come "backend MCP irraggiungibile".

- **Endpoint MCP raggiungibile** → nota "Gateway online (backend MCP raggiungibile)".
- **Radice OK ma endpoint MCP senza risposta** → nota "Dominio raggiungibile ma backend MCP non risponde: possibile interruzione dei percorsi /mcp".
- **Nessuna risposta su entrambi** (errore di rete, DNS, timeout) → nota "Gateway non raggiungibile" e l'impatto probabile.

> Questi check misurano solo la raggiungibilita' remota: NON dicono se l'ambiente corrente ha registrato i connettori del plugin. Ne terrai conto nel Passo 2.

## Passo 2: Verifica Ogni Server

Per ciascuno dei 9 server MCP, usa un **approccio a due stadi**:

**Stadio A — Disponibilita tool**: Controlla se i tool del server appaiono nella lista dei tool disponibili. Se non appaiono, segna il server come "non connesso" immediatamente.

> **Caso speciale — 0/9 server con tool assenti**: se NESSUNO dei 9 server ha tool visibili, prima di tutto **incrocia con l'esito del Passo 1 (gateway)**:
>
> - **Endpoint MCP senza risposta** → interruzione reale del backend (connessione/firewall/gateway down): prosegui con la diagnosi d'interruzione (Passo 5 "Gateway non raggiungibile"), NON attribuirlo all'ambiente.
> - **Radice OK ma endpoint MCP senza risposta** → possibile interruzione dei soli percorsi `/mcp` (proxy che risponde sulla radice ma non inoltra ai backend): trattala come interruzione reale, segnalala e invita a riprovare piu' tardi.
> - **Backend MCP raggiungibile (o check non eseguibile) + tool assenti su tutti e 9** → non e quasi mai un guasto di tutti i server simultaneo: il problema e che **questa sessione non ha registrato i connettori del plugin**. Non puoi stabilire con certezza quale delle due cause sia: presenta ENTRAMBE le ipotesi con i rispettivi controlli, senza escluderne una:
>
>   **Ipotesi A — ambiente senza supporto connettori**: i 9 server MCP remoti (HTTP su `mcp-italia.bettercallclaude.ch`) vengono registrati solo negli ambienti che supportano i MCP server dei plugin: **Claude Cowork Desktop** e **Claude Code**. Nella chat web/mobile di claude.ai i connettori del plugin **non compaiono affatto** e `/doctor` segna sempre 0/9.
>   → *Verifica*: sei su Cowork Desktop / Claude Code? Se no, questa e la causa: i server funzionano, l'ambiente non li carica. Rilancia `/doctor` da Cowork Desktop o Claude Code.
>
>   **Ipotesi B — connettori non attivati nell'ambiente desktop**: sei gia' su Cowork Desktop / Claude Code ma il plugin non ha registrato i suoi connettori (connettori disattivati nella pagina del plugin, permessi mancanti, sessione avviata prima dell'installazione).
>   → *Verifica*: pagina del plugin → sezione Connectors: i 9 server compaiono e sono abilitati? Permessi su "Always allow" (Passo 7 di INSTALLAZIONE.md)? Se mancano: riavvia l'app e rilancia `/doctor`; se persistono, segnala su GitHub con questo output.
>
> Non proseguire con lo Stadio B finche' una delle ipotesi non e risolta.

**Stadio B — Chiamata leggera** (solo se lo Stadio A ha avuto successo): Fai una chiamata minima per confermare la reattivita.

| Server | Cosa fornisce | Chiamata di test |
|--------|--------------|-----------------|
| normattiva | Legislazione italiana (1861-oggi) | `normattiva_search` (minima) |
| corte-costituzionale | Sentenze Corte Costituzionale | `corte-costituzionale_search` (minima) |
| giustizia-amministrativa | Sentenze TAR e Consiglio di Stato | `giustizia-amministrativa_search` (minima) |
| cassazione | Giurisprudenza Cassazione (ItalGiure) | `cassazione_search_massime` (minima) |
| eur-lex-ita | Diritto UE in italiano | `eur-lex-ita_search` (minima) |
| legal-citations-ita | Validazione e formattazione citazioni | `legal-citations-ita_validate` (minima) |
| legal-persona-ita | Generazione documenti + calcolo termini | `legal-persona-ita_draft_document` (minima) |
| citation-verify-ita | Verifica esistenza citazioni | `citation-verify-ita_check_existence` (minima) |
| workflows-ita | Flussi di lavoro personalizzati | `list_workflows` (minima) |

**Server locale opzionale (ollama)** — non rientra nel conteggio dei 9 server remoti e il suo esito non e mai un fallimento. Se i tool `ollama_*` appaiono nella lista dei tool disponibili, chiama `ollama_check_status` (chiamata leggera):

- `online: true` → annota "Ollama locale (opzionale): online (N modelli, versione X)".
- `online: false` → annota "Ollama locale (opzionale): non attivo — per elaborare contenuto privilegiato in strict mode, avvia `ollama serve`".
- Tool `ollama_*` assenti dalla lista → annota "Ollama locale (opzionale): wrapper non caricato".

## Passo 3: Probe Route Agent

I Passi 1–2 verificano i connettori dalla **sessione principale**. Questo passo verifica la **route agent** — il percorso che si è rotto nella release svizzera v4.11.5, quando gli agenti del plugin non vedevano alcun tool MCP ("No such tool available: mcp__normattiva__…") mentre la sessione principale funzionava regolarmente.

Dispatcha l'agente specialista citazioni del plugin via Task (usa il nome scoped, es. `bettercallclaude-italia:italian-citation-specialist`) con esattamente questo prompt:

> Chiama il tool MCP del server legal-citations-ita il cui nome termina con `validate` con la citazione "Cass. Sez. III, n. 12345/2020". Non usare nessun altro tool. Riporta SOLO: (1) il nome esatto del tool chiamato, (2) "OK" più la citazione restituita, oppure il messaggio di errore verbatim.

Interpreta il risultato:

- L'agente riporta un nome tool + "OK" → route agent sana; annota "Route agent: OK".
- L'agente riporta "No such tool available" (o non trova alcun tool MCP del server legal-citations-ita) → **route agent rotta**: gli agenti del plugin non raggiungono i connettori anche se la sessione principale può. Dì all'utente di aggiornare BetterCallClaude Italia all'ultima versione e rieseguire `/bettercallclaude-italia:doctor`; se il problema persiste, segnalarlo su https://github.com/fedec65/bettercallclaude_italia/issues includendo questo output.
- Il tool Task non è disponibile nel contesto corrente (es. dentro una sessione annidata) → segna la route come "non verificabile" e suggerisci di rieseguire `/bettercallclaude-italia:doctor` in una sessione top-level pulita.

## Passo 4: Mostra Risultati

Presenta i risultati nella lingua dell'utente, senza gergo tecnico. Esempio:

```
╔══════════════════════════════════════════════════════════╗
  BetterCallClaude Italia — Diagnostica Servizi
╠══════════════════════════════════════════════════════════╣

  Servizio                       Stato           Impatto se assente
  ────────                       ─────           ──────────────────
  Normattiva (legislazione)      ✓ attivo        —
  Corte Costituzionale           ✓ attivo        —
  Giustizia Amministrativa       ✓ attivo        —
  Cassazione (ItalGiure)         ⚠ degradato     Ricerca precedenti solo manuale
  EUR-Lex Italia                 ✓ attivo        —
  Validazione citazioni          ✓ attivo        —
  Legal Persona (documenti)      ✓ attivo        —
  Verifica citazioni             ✓ attivo        —
  Flussi personalizzati          ✓ attivo        —

  Servizi attivi: 8/9
  Ollama locale (opzionale):     ✓ online (22 modelli)
  Route agent (MCP via subagent): ✓ operativa

╚══════════════════════════════════════════════════════════╝
```

Usa simboli chiari: ✓ attivo, ⚠ degradato, ✗ non connesso.

## Passo 5: Guida

### Tutti i server attivi:
> Tutti i servizi sono operativi. BetterCallClaude Italia funziona a piena capacita.

### Alcuni server non disponibili:
Per ogni server non disponibile, spiega in linguaggio semplice:

| Server | Impatto se non disponibile |
|--------|---------------------------|
| normattiva | I testi di legge non vengono recuperati in tempo reale. Le citazioni di articoli si basano sulle conoscenze del modello. |
| corte-costituzionale | La ricerca di sentenze della Corte Costituzionale non e disponibile. Consultare: cortecostituzionale.it/actionPronuncia.do |
| giustizia-amministrativa | La ricerca sentenze TAR e Consiglio di Stato non e disponibile. Consultare: giustizia-amministrativa.it |
| cassazione | La ricerca strutturata di giurisprudenza della Cassazione non e disponibile. Consultare: ItalGiure SentenzeWeb (sentenze dal 2012) o Google site:cortedicassazione.it |
| eur-lex-ita | Il diritto UE in italiano non e accessibile automaticamente. Consultare: eur-lex.europa.eu |
| legal-citations-ita | Le citazioni non vengono verificate automaticamente — controllare manualmente. |
| legal-persona-ita | La generazione automatica di documenti legali non e disponibile via MCP. |
| citation-verify-ita | L'esistenza delle citazioni non viene verificata lato server — le citazioni sono solo formattate, non validate. |
| workflows-ita | I flussi personalizzati non sono accessibili: `/crea-flusso` non puo salvare e `/flusso` mostra solo i template predefiniti. Il resto del plugin funziona normalmente. |

### Fix suggeriti:
> Se un servizio risulta non disponibile:
> 1. Se TUTTI i 9 risultano assenti (0/9): segui le due ipotesi del Passo 2 (ambiente senza supporto connettori vs connettori non attivati in Cowork Desktop/Claude Code) — non dare per scontata la prima
> 2. Riavviare Cowork Desktop (o Claude Code)
> 3. Verificare la connessione internet
> 4. Eseguire di nuovo `/bettercallclaude-italia:doctor` dopo qualche minuto
> 5. Se il problema persiste, il servizio potrebbe essere temporaneamente offline — per i portali con protezione anti-bot (Cassazione, Corte Costituzionale), e un comportamento atteso

### Gateway non raggiungibile:
> Il gateway MCP non e raggiungibile.
> Possibili cause: assenza di connessione internet, blocco firewall, servizio temporaneamente non disponibile.
> BetterCallClaude Italia funziona in modalita ridotta: le analisi si basano sulle conoscenze del modello senza accesso alle banche dati.

## Riferimento Errori Backend

| Errore | Causa probabile | Soluzione |
|--------|----------------|-----------|
| HTTP 429 | Troppe richieste | Attendere un momento e riprovare |
| Timeout / HTTP 5xx | Servizio temporaneamente non disponibile | Riprovare piu tardi |
| ECONNREFUSED | Il server non raggiunge l'API esterna | Verificare la connessione internet |
| 0 risultati | Query senza corrispondenze o anti-bot attivo | Provare termini di ricerca piu ampi o consultare direttamente il portale |

---

## Query dell'Utente

$ARGUMENTS
