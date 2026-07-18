# Riferimento Comandi BetterCallClaude Italia

## Sintassi dei Comandi

Tutti i comandi seguono il pattern:
```
/bettercallclaude-italia:<comando> [argomenti] [--flag]
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

### `/bettercallclaude-italia:legale`
**Scopo**: Gateway primario. Classifica intento, risolve giurisdizione, indirizza a specialisti.
**Argomenti**: Query legale in linguaggio naturale.
**Flag**: `--refine`, `--briefing`, `--skip-briefing`, `--direct`, `--no-framework`
**Esempi**:
```
/bettercallclaude-italia:legale Valutazione responsabilità art. 1218 CC per ritardata consegna
/bettercallclaude-italia:legale --refine Ho problemi con il mio locatore
```

### `/bettercallclaude-italia:ricerca`
**Scopo**: Ricerca legale su Cassazione e normativa.
**Argomenti**: Questione giuridica o riferimento normativo.
**Esempi**:
```
/bettercallclaude-italia:ricerca Art. 1218 CC responsabilità contrattuale
/bettercallclaude-italia:ricerca Cassazione su mora del conduttore locazione
```

### `/bettercallclaude-italia:strategia`
**Scopo**: Strategia di causa con valutazione del rischio e analisi costi-benefici.
**Argomenti**: Descrizione della causa.
**Esempi**:
```
/bettercallclaude-italia:strategia Contenzioso locativo Milano, locatore chiede EUR 200k
```

### `/bettercallclaude-italia:redazione`
**Scopo**: Redazione documenti legali.
**Argomenti**: Tipo di documento e requisiti.
**Esempi**:
```
/bettercallclaude-italia:redazione Contratto di lavoro ingegnere software Roma
/bettercallclaude-italia:redazione Atto di citazione inadempimento contrattuale
```

### `/bettercallclaude-italia:contraddittorio`
**Scopo**: Stress-test a tre agenti.
**Argomenti**: Posizione giuridica da analizzare.
**Esempi**:
```
/bettercallclaude-italia:contraddittorio La clausola di non concorrenza è valida?
```

### `/bettercallclaude-italia:flusso`
**Scopo**: Esegue pipeline multi-agente predefinite.
**Argomenti**: Nome workflow + descrizione della causa.
**Workflow**: `due-diligence`, `litigation-prep`, `contract-lifecycle`, `real-estate-closing`, `compliance-check`, `cross-border-ma`, `adversarial-review`
**Esempi**:
```
/bettercallclaude-italia:flusso litigation-prep Risarcimento danni produttore
```

### `/bettercallclaude-italia:briefing`
**Scopo**: Intake strutturato prima dell'esecuzione.
**Argomenti**: Descrizione della causa.
**Flag**: `--resume [id]`
**Esempi**:
```
/bettercallclaude-italia:briefing Prepara lite completa art. 1218 CC, EUR 500K
```

### `/bettercallclaude-italia:regionale`
**Scopo**: Analisi del diritto regionale.
**Argomenti**: Codice regione + questione giuridica.
**Esempi**:
```
/bettercallclaude-italia:regionale LOM Giurisdizione Tribunale delle Imprese
```

### `/bettercallclaude-italia:analisi-doc`
**Scopo**: Intelligenza documentale.
**Argomenti**: Riferimento `@file` + istruzioni.
**Esempi**:
```
/bettercallclaude-italia:analisi-doc @contratto.pdf Analizza clausole rischiose
```

### `/bettercallclaude-italia:configurazione`
**Scopo**: Verifica connettività MCP.
**Argomenti**: Nessuno.

### `/bettercallclaude-italia:versione`
**Scopo**: Visualizza versione e stato.
**Argomenti**: Nessuno.

### `/bettercallclaude-italia:aiuto`
**Scopo**: Riferimento completo.
**Argomenti**: Argomento opzionale.
