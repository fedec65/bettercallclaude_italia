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
- Agenti: 21
- Comandi: 30
- Skill: 16 (+1 risorsa condivisa)
- Server MCP: 10 (9 remoti + wrapper ollama locale opzionale)

Intelligenza Legale Italiana per il mercato italiano.
```

$ARGUMENTS
