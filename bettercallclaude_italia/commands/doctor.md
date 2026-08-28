---
description: "Diagnostica server MCP — testa ogni server, riporta stato e impatto in linguaggio semplice, suggerisce soluzioni per i problemi."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
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
---

# BetterCallClaude Italia — Diagnostica

Sei invocato tramite `/bettercallclaude-italia:doctor`. Diagnostica lo stato di tutti i server MCP di BetterCallClaude Italia e riporta i risultati in linguaggio semplice.

## Passo 1: Verifica Gateway

Verifica il gateway HTTP MCP:

- Tenta di raggiungere l'endpoint health del gateway MCP.
- Se il check ha successo, nota "Gateway online".
- Se fallisce, nota "Gateway non raggiungibile" e l'impatto probabile.

## Passo 2: Verifica Ogni Server

Per ciascuno dei 9 server MCP, usa un **approccio a due stadi**:

**Stadio A — Disponibilita tool**: Controlla se i tool del server appaiono nella lista dei tool disponibili. Se non appaiono, segna il server come "non connesso" immediatamente.

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

## Passo 3: Mostra Risultati

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

╚══════════════════════════════════════════════════════════╝
```

Usa simboli chiari: ✓ attivo, ⚠ degradato, ✗ non connesso.

## Passo 4: Guida

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
> 1. Riavviare Cowork Desktop (o Claude Code)
> 2. Verificare la connessione internet
> 3. Eseguire di nuovo `/bettercallclaude-italia:doctor` dopo qualche minuto
> 4. Se il problema persiste, il servizio potrebbe essere temporaneamente offline — per i portali con protezione anti-bot (Cassazione, Corte Costituzionale), e un comportamento atteso

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
