---
description: "Visualizza versione plugin, componenti installati e stato del sistema."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
---

# Versione BetterCallClaude Italia

Sei invocato tramite `/bettercallclaude-italia:versione`. Visualizza la versione corrente e lo stato del sistema.

## Output

```
BetterCallClaude Italia vX.Y.Z
```

(dove `vX.Y.Z` e la versione corrente: LEGGILA SEMPRE da `"${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json"`, campo `version` — non inventarla e non usare numeri di esempio; il percorso e assoluto rispetto alla directory del plugin, non alla working directory della sessione)

```
Componenti:
- Agenti: 22
- Comandi: 31
- Skill: 17 (+1 risorsa condivisa)
- Server MCP: 10 (9 remoti + wrapper ollama locale opzionale)

Funzionalita principali:
- Ricerca legale su Cassazione e normativa italiana
- Ricerca web su portali protetti da login (browser dell'utente, login manuale)
- Strategia processuale e analisi avversariale
- Redazione documenti legali e verifica citazioni
- Mappe decisionali per pratiche grandi e workflow personalizzati
- Assistenza al rilevamento del segreto professionale (Art. 622 CP)
```

$ARGUMENTS
