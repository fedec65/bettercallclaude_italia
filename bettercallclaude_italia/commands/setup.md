---
description: "Verifica connettività dei server MCP e visualizza lo stato di tutti i server."
---

# Setup BetterCallClaude Italia

Sei invocato tramite `/bettercallclaude_italia:setup`. Verifica la connettività dei server MCP e visualizza lo stato.

## Checklist

Per ogni server MCP in `.mcp.json`, verifica la connettività:

1. **normattiva** — Legislazione italiana (1861–oggi)
2. **corte-costituzionale** — Sentenze Corte Costituzionale
3. **giustizia-amministrativa** — TAR e Consiglio di Stato
4. **cassazione** — Giurisprudenza Corte di Cassazione
5. **eur-lex-ita** — Diritto UE in lingua italiana
6. **legal-citations-ita** — Validazione citazioni normative italiane
7. **legal-persona-ita** — Drafting documenti giuridici italiani
8. **ollama** — Classificazione privacy locale per segreto professionale

## Formato Output

```
## Setup BetterCallClaude Italia

### Stato Server MCP
| Server | Stato | Trasporto | Risposta |
|--------|--------|-----------|----------|
| normattiva | [OK/FAIL] | HTTP | [ms] |
| corte-costituzionale | [OK/FAIL] | HTTP | [ms] |
| giustizia-amministrativa | [OK/FAIL] | HTTP | [ms] |
| cassazione | [OK/FAIL] | HTTP | [ms] |
| eur-lex-ita | [OK/FAIL] | HTTP | [ms] |
| legal-citations-ita | [OK/FAIL] | HTTP | [ms] |
| legal-persona-ita | [OK/FAIL] | HTTP | [ms] |
| ollama | [OK/FAIL] | STDIO | [modello] |

### Sintesi
- Connessi: [N]/8
- Falliti: [N]/8
- Azione raccomandata: [istruzione]
```

Se un server fallisce, suggerisci di rieseguire il setup o verificare la configurazione di rete. Per ollama, verifica che Ollama sia in esecuzione localmente a `${user_config.ollama_host}`.
