---
description: "Verifica connettivita dei server MCP e visualizza lo stato di tutti i server."
---

# Configurazione BetterCallClaude Italia

Sei invocato tramite `/bettercallclaude-italia:configurazione`. Verifica la connettivita dei server MCP e visualizza lo stato.

## Checklist

Per ogni server MCP in `.mcp.json`, verifica la connettivita:

1. **normattiva** -- Legislazione italiana (1861--oggi). Altamente affidabile.
2. **corte-costituzionale** -- Sentenze Corte Costituzionale. Lo scraping spesso fallisce per protezione anti-bot (DataDome).
3. **giustizia-amministrativa** -- TAR e Consiglio di Stato. Il portale Liferay e instabile e spesso in timeout.
4. **cassazione** -- Giurisprudenza Corte di Cassazione. Il portale blocca sistematicamente con HTTP 403.
5. **eur-lex-ita** -- Diritto UE in lingua italiana. Altamente affidabile.
6. **legal-citations-ita** -- Validazione citazioni normative italiane. Funziona localmente.
7. **legal-persona-ita** -- Drafting documenti giuridici italiani. Funziona localmente.

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

### Sintesi
- Connessi: [N]/7
- Falliti: [N]/7
- Azione raccomandata: [istruzione]
```

Se un server scraper fallisce, informare l'utente che il portale ufficiale ha restrizioni di accesso e fornire i link fallback per consultazione diretta.
