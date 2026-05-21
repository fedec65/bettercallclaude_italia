# Riferimento Comandi BetterCallClaude Italia

## Sintassi dei Comandi

Tutti i comandi seguono il pattern:
```
/bettercallclaude_italia:<comando> [argomenti] [--flag]
```

## Flag Globali

Questi flag possono essere aggiunti alla maggior parte dei comandi:

| Flag | Effetto |
|------|---------|
| `--short` | Il summarizer produce output di 1-2 pagine |
| `--medium` | Il summarizer produce output di 3-5 pagine (default) |
| `--long` | Il summarizer produce output completo |
| `--no-summary` | Salta la sintesi, consegna output grezzo concatenato |
| `--no-framework` | Salta il menu del framework post-esecuzione |
| `--lang it` | Forza output in italiano |
| `--lang en` | Forza output in inglese |

## Dettagli Comandi

### `/bettercallclaude_italia:legal`
**Scopo**: Gateway primario. Classifica intento, risolve giurisdizione, indirizza a specialisti.
**Argomenti**: Query legale in linguaggio naturale.
**Flag**: `--refine`, `--briefing`, `--skip-briefing`, `--direct`, `--no-framework`
**Esempi**:
```
/bettercallclaude_italia:legal Valutazione responsabilità art. 1218 CC per ritardata consegna
/bettercallclaude_italia:legal --refine Ho problemi con il mio locatore
```

### `/bettercallclaude_italia:research`
**Scopo**: Ricerca legale su Cassazione e normativa.
**Argomenti**: Questione giuridica o riferimento normativo.
**Esempi**:
```
/bettercallclaude_italia:research Art. 1218 CC responsabilità contrattuale
/bettercallclaude_italia:research Cassazione su mora del conduttore locazione
```

### `/bettercallclaude_italia:strategy`
**Scopo**: Strategia di causa con valutazione del rischio e analisi costi-benefici.
**Argomenti**: Descrizione della causa.
**Esempi**:
```
/bettercallclaude_italia:strategy Contenzioso locativo Milano, locatore chiede EUR 200k
```

### `/bettercallclaude_italia:draft`
**Scopo**: Redazione documenti legali.
**Argomenti**: Tipo di documento e requisiti.
**Esempi**:
```
/bettercallclaude_italia:draft Contratto di lavoro ingegnere software Roma
/bettercallclaude_italia:draft Atto di citazione inadempimento contrattuale
```

### `/bettercallclaude_italia:adversarial`
**Scopo**: Stress-test a tre agenti.
**Argomenti**: Posizione giuridica da analizzare.
**Esempi**:
```
/bettercallclaude_italia:adversarial La clausola di non concorrenza è valida?
```

### `/bettercallclaude_italia:workflow`
**Scopo**: Esegue pipeline multi-agente predefinite.
**Argomenti**: Nome workflow + descrizione della causa.
**Workflow**: `due-diligence`, `litigation-prep`, `contract-lifecycle`, `real-estate-closing`, `compliance-check`, `cross-border-ma`, `adversarial-review`
**Esempi**:
```
/bettercallclaude_italia:workflow litigation-prep Risarcimento danni produttore
```

### `/bettercallclaude_italia:briefing`
**Scopo**: Intake strutturato prima dell'esecuzione.
**Argomenti**: Descrizione della causa.
**Flag**: `--resume [id]`
**Esempi**:
```
/bettercallclaude_italia:briefing Prepara lite completa art. 1218 CC, EUR 500K
```

### `/bettercallclaude_italia:regional`
**Scopo**: Analisi del diritto regionale.
**Argomenti**: Codice regione + questione giuridica.
**Esempi**:
```
/bettercallclaude_italia:regional LOM Giurisdizione Tribunale delle Imprese
```

### `/bettercallclaude_italia:doc-analyze`
**Scopo**: Intelligenza documentale.
**Argomenti**: Riferimento `@file` + istruzioni.
**Esempi**:
```
/bettercallclaude_italia:doc-analyze @contratto.pdf Analizza clausole rischiose
```

### `/bettercallclaude_italia:setup`
**Scopo**: Verifica connettività MCP.
**Argomenti**: Nessuno.

### `/bettercallclaude_italia:version`
**Scopo**: Visualizza versione e stato.
**Argomenti**: Nessuno.

### `/bettercallclaude_italia:help`
**Scopo**: Riferimento completo.
**Argomenti**: Argomento opzionale.
