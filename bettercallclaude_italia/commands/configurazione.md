---
description: "Alias per /start — verifica connettivita MCP, onboarding, playbook locale. Deprecato: usa /start."
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
  - mcp__plugin_bettercallclaude-italia_workflows-ita__list_workflows
---

# Configurazione BetterCallClaude Italia

> **Deprecato**: questo comando e un alias per `/bettercallclaude-italia:start`. Usa `/bettercallclaude-italia:start` per l'esperienza completa di onboarding.

Sei invocato tramite `/bettercallclaude-italia:configurazione`. Esegui la stessa logica di `/bettercallclaude-italia:start` (vedi start.md).

## Checklist

Per ogni server MCP in `.mcp.json`, verifica la connettivita:

1. **normattiva** -- Legislazione italiana (1861--oggi). Altamente affidabile.
2. **corte-costituzionale** -- Sentenze Corte Costituzionale. Lo scraping spesso fallisce per protezione anti-bot (DataDome).
3. **giustizia-amministrativa** -- TAR e Consiglio di Stato. Il portale Liferay e instabile e spesso in timeout.
4. **cassazione** -- Giurisprudenza Corte di Cassazione. Il portale blocca sistematicamente con HTTP 403.
5. **eur-lex-ita** -- Diritto UE in lingua italiana. Altamente affidabile.
6. **legal-citations-ita** -- Validazione citazioni normative italiane. Funziona localmente.
7. **legal-persona-ita** -- Drafting documenti giuridici italiani. Funziona localmente.
8. **citation-verify-ita** -- Verifica esistenza citazioni giuridiche. Dipende da ItalGiure e Normattiva.
9. **workflows-ita** -- Flussi di lavoro personalizzati (salvataggio ed esecuzione). Se non raggiungibile, il plugin funziona normalmente senza i flussi salvati.

## Impostazione User ID (flussi personalizzati)

L'impostazione **User ID per i flussi personalizzati** (`userConfig.user_id`) identifica il proprietario dei flussi salvati su `workflows-ita`. Se vuota, il plugin genera un ID personale (`bcc-…`) al primo uso di `/crea-flusso` o `/flusso` e lo salva in `~/.betterask/config.yaml`. Chi conosce l'ID puo leggere i flussi: va tenuto privato. Su Cowork, per renderlo durevole, aggiungere la riga `BetterCallClaude workflow user ID: <id>` in Impostazioni → Generali → Istruzioni per Claude.

## Strategia Fallback per Server Scraper

I server corte-costituzionale, giustizia-amministrativa e cassazione possono restituire un array vuoto con URL di fallback anziche dati strutturati. Questo e il comportamento previsto quando lo scraping fallisce.

Campi fallback:
- `urlRicerca` -- URL del portale ufficiale
- `urlGoogle` -- Ricerca Google con `site:dominio.it`
- `urlDuckDuckGo` -- Ricerca DuckDuckGo con `site:dominio.it`
- `urlEcli` -- URL ECLI diretto (solo corte-costituzionale e cassazione)
- `urlItalgiure` -- Banca dati istituzionale (solo cassazione)

Ordine di priorita:
1. urlEcli (se disponibile)
2. urlGoogle
3. urlDuckDuckGo
4. urlRicerca
5. urlItalgiure (solo per operatori del diritto)

## Formato Output

```
## Configurazione BetterCallClaude Italia

### Stato Server MCP
| Server | Stato | Trasporto | Affidabilita | Risposta |
|--------|--------|-----------|-------------|----------|
| normattiva | [OK/FAIL] | HTTP | Alta | [ms] |
| corte-costituzionale | [OK/FAIL] | HTTP | Bassa | [ms] |
| giustizia-amministrativa | [OK/FAIL] | HTTP | Bassa | [ms] |
| cassazione | [OK/FAIL] | HTTP | Molto bassa | [ms] |
| eur-lex-ita | [OK/FAIL] | HTTP | Alta | [ms] |
| legal-citations-ita | [OK/FAIL] | HTTP | Alta | [ms] |
| legal-persona-ita | [OK/FAIL] | HTTP | Alta | [ms] |
| citation-verify-ita | [OK/FAIL] | HTTP | Media | [ms] |
| workflows-ita | [OK/FAIL] | HTTP | Alta | [ms] |

### Sintesi
- Connessi: [N]/9
- Falliti: [N]/9
- Azione raccomandata: [istruzione]
```

Se un server scraper fallisce, informare l'utente che il portale ufficiale ha restrizioni di accesso e fornire i link fallback per consultazione diretta.
