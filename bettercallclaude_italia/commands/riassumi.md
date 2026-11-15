---
description: "Consolida l'output delle pipeline multi-agente — deduplica disclaimer, terminologia e citazioni con controllo della lunghezza (--breve/--medio/--lungo)."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
---

# Sintesi Output

Sei invocato tramite `/bettercallclaude-italia:riassumi`. Prendi gli output combinati di piu agenti e produci un deliverable consolidato, deduplicato e calibrato per lunghezza.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. **Eccezione — fonti esterne**: se `${user_config.fonti_esterne}` si risolve in un valore non vuoto (cioè il placeholder non appare letteralmente), le banche dati ivi elencate vanno interrogate **in parallelo** ai server MCP di BetterCallClaude, e ogni pronuncia va etichettata con la banca dati di provenienza; verifica che il connettore corrispondente sia effettivamente disponibile nella sessione (gli host possono nascondere i tool che non compaiono nell'allowlist): se manca, dillo e prosegui senza errori, **senza dichiarare quella fonte come consultata**. Generazione file (.docx, .pdf) e operazioni di sistema sono esenti.

**Equivalenti in linguaggio naturale**: puoi anche dire:
- "riassunto breve" -> `--breve`
- "riassunto dettagliato" -> `--lungo`
- "in inglese" -> `--lang=EN`
- "in italiano" -> `--lang=IT`

## Workflow

### Passo 1: INVENTARIO
Analizza l'output combinato, identifica il contributo di ogni agente, inventaria le sezioni duplicate.

### Passo 2: CONSOLIDA
- Disclaimer: uniscili in uno solo.
- Terminologia: unione e deduplicazione.
- Citazioni: raccogli, deduplica, raggruppa per tipo.
- YAML: converti in tabelle salvo `--lungo`.

### Passo 3: CALIBRA LUNGHEZZA

**--breve**: 1-2 pagine. Disclaimer max 3 frasi. Top 5 termini. Solo citazioni inline. Solo conclusioni.

**--medio** (DEFAULT): 3-5 pagine. Disclaimer completo. Terminologia completa. Sezione citazioni completa. Ragionamento condensato.

**--lungo**: Conservazione completa. Tutto il ragionamento, YAML, struttura.

**Regola critica**: Punteggi di probabilita, conclusioni legali e citazioni verificate NON vengono mai omessi.

### Passo 4: VALIDA
- Ogni citazione unica e preservata.
- Ogni punteggio di probabilita e preservato.
- Ogni conclusione legale e presente.
- Nessun risultato fondamentale e eliminato.

### Passo 5: CONSEGNA

## Pie di Pagina Consolidazione

```
---
Sintesi: [--breve / --medio / --lungo]
Agenti consolidati: [N] ([nomi])
Disclaimer uniti: [N] -> 1
Citazioni uniche preservate: [N]
Voci terminologia: [N] (deduplicate da [M])
```

## Standard di Qualita

- Zero perdita di citazioni.
- Tutte le percentuali e i punteggi preservati verbatim.
- Nessuna conclusione legale alterata o omessa.
- Unisci solo contenuto veramente identico.
- Mantieni la lingua originale.

$ARGUMENTS
