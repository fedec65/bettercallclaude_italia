---
description: "Esegue il framework legale BetterCallClaude a 5 fasi: intake → ricerca → strategia → contraddittorio → redazione. Una pipeline completa end-to-end per qualsiasi questione di diritto italiano, dall'analisi documentale all'output legale finale."
---

# Framework Legale BetterCallClaude a 5 Fasi

Sei invocato tramite `/bettercallclaude-italia:legale-5step`. Coordini una pipeline sequenziale a cinque agenti che porta una questione legale italiana dall'intake iniziale a un documento legale verificato e redatto.

## Parametri

- `--breve`: Output sintetico per fase, 1-2 pagine totali. Solo conclusioni e probabilità.
- `--medio`: Default. 3-5 pagine. Risultati chiave per fase con citazioni complete.
- `--lungo`: Output completo di tutti gli agenti, deduplicato, tutto il ragionamento preservato.
- `--no-sintesi`: Output grezzo concatenato degli agenti senza sintesi.
- `--stop-dopo=N`: Esegui solo le prime N fasi (1-5), poi pausa per revisione dell'utente.
- `--lang=IT|EN`: Forza lingua di output. Default: rilevamento automatico dall'input.
- `--regione=XX`: Imposta giurisdizione regionale (es. `--regione=LOM`). Default: diritto nazionale.

## Panoramica Pipeline

```
INTAKE → RICERCA → STRATEGIA → CONTRADDITTORIO → REDAZIONE
  (1)       (2)        (3)           (4)              (5)
```

L'output di ogni fase alimenta direttamente la successiva come input strutturato. La pipeline è sequenziale — nessuna fase inizia prima che la precedente sia confermata completa.

## Inizializzazione

Prima di eseguire la Fase 1, conferma la pipeline con l'utente:

```
BetterCallClaude Framework a 5 Fasi
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pipeline:       INTAKE → RICERCA → STRATEGIA → CONTRADDITTORIO → REDAZIONE
Questione:      [estratta dall'input]
Giurisdizione:  [Nazionale / Regione XX]
Lingua:         [IT/EN]
Modalità:       [--breve/--medio/--lungo]

Avvio Fase 1 di 5...
```

## Esecuzione Fasi

### Fase 1: INTAKE

**Comando**: `/bettercallclaude-italia:analisi-doc`
**Input**: Documento fornito dall'utente (`@file`) o descrizione testuale del caso

Estrai i fatti, identifica le questioni giuridiche, determina giurisdizione e lingua. Segnala indicatori di segreto professionale prima di qualsiasi chiamata MCP esterna.

Report completamento:
```
✓ Fase 1/5: INTAKE — completata
  Questioni identificate: [N]
  Giurisdizione: [Nazionale / Regione XX]
  Lingua: [IT/EN]
  Fatti chiave: [sintesi in una riga]
```

---

### Fase 2: RICERCA

**Comando**: `/bettercallclaude-italia:ricerca`
**Input**: Questioni giuridiche e giurisdizione dalla Fase 1

Applica la skill `italian-legal-research` in modo completo. Usa i server MCP in ordine di priorità:

1. `cassazione` — Giurisprudenza Corte di Cassazione
2. `normattiva` — Testo normativo (legislazione italiana 1861-oggi)
3. `corte-costituzionale` — Sentenze della Corte Costituzionale
4. `giustizia-amministrativa` — TAR e Consiglio di Stato
5. `eur-lex-ita` — Diritto UE in lingua italiana

Tutte le citazioni devono essere generate tramite `legal-citations-ita`. Non costruire mai stringhe di citazione manualmente.

Report completamento:
```
✓ Fase 2/5: RICERCA — completata
  Precedenti trovati: [N]
  Norme esaminate: [elenco]
  Massima chiave: [sintesi in una riga del precedente più rilevante]
```

---

### Fase 3: STRATEGIA

**Comando**: `/bettercallclaude-italia:strategia`
**Input**: Memorandum di ricerca dalla Fase 2

Applica la skill `italian-legal-strategy` in modo completo. Usa `cassazione` per fondare la stima di probabilità sui precedenti.

**Checkpoint**: Pausa se `probabilità_successo < 30%` o se viene identificato un rischio Critico. Presenta il memorandum strategico e attendi conferma prima di procedere.

Report completamento:
```
✓ Fase 3/5: STRATEGIA — completata
  Forza della causa: [Forte/Moderata/Debole]
  Probabilità successo: [X%]
  Percorso raccomandato: [contenzioso/transazione/ADR]
  Rischi critici: [N]
```

---

### Fase 4: CONTRADDITTORIO

**Comando**: `/bettercallclaude-italia:contraddittorio`
**Input**: Memorandum strategico dalla Fase 3 come posizione da testare

Applica la skill `adversarial-analysis` in modo completo. Esegui Avvocato → Avversario → Analista Giudiziario in sequenza.

**Checkpoint**: Se la probabilità del contraddittorio differisce dalla Fase 3 di più di 15 punti percentuali, pausa prima della Fase 5, presenta entrambe le stime e invita alla revisione della strategia.

Report completamento:
```
✓ Fase 4/5: CONTRADDITTORIO — completata
  Punteggio avvocato: [X/10]
  Punteggio avversario: [X/10]
  Probabilità giudiziaria: [X%]
  Strategia confermata: [sì/rivista]
```

---

### Fase 5: REDAZIONE

**Comando**: `/bettercallclaude-italia:redazione`
**Input**: Memorandum ricerca (Fase 2) + strategia confermata (Fase 3) + sintesi giudiziaria (Fase 4)

Applica le skill `italian-legal-drafting` e `italian-citation-formats`. Ogni citazione nel documento finale deve risalire al memorandum di ricerca della Fase 2. Nessun nuovo argomento giuridico viene introdotto in questa fase.

Selezione documento:

| Tipo di Questione | Output Default |
|-------------------|----------------|
| Contenzioso — attore | Atto di citazione (CPC Art. 163) |
| Contenzioso — convenuto | Comparsa di costituzione e risposta (CPC Art. 167) |
| Disputa contrattuale | Parere legale |
| Compliance | Memorandum consultivo |
| Consulenza | Lettera al cliente o parere breve |
| Personalizzato | Come specificato dall'utente |

Report completamento:
```
✓ Fase 5/5: REDAZIONE — completata
  Tipo documento: [tipo]
  Citazioni verificate: [N]
  Lingua: [IT/EN]
```

---

## Formato Output

Indirizza tutti gli output delle fasi attraverso l'agente summarizer alla lunghezza richiesta (`--medio` se non specificato), salvo che `--no-sintesi` sia attivo.

```
## BetterCallClaude Framework a 5 Fasi — Report Pipeline

### Sintesi Questione
- Input: [nome documento o descrizione caso]
- Giurisdizione: [Nazionale / Regione]
- Lingua: [IT/EN]
- Fasi completate: [N/5]

### Fase 1: Intake
[Fatti chiave e questioni giuridiche estratte]

### Fase 2: Ricerca
[Precedenti e sintesi normativa]

### Fase 3: Strategia
[Linea d'azione raccomandata con probabilità]

### Fase 4: Contraddittorio
[Sintesi giudiziaria con punteggi di probabilità]

### Fase 5: Redazione
[Sintesi documento e disposizioni chiave]

### Raccomandazione Finale
[Conclusione sintetizzata attraverso tutte e cinque le fasi]

### Disclaimer Professionale
Questo output è generato da uno strumento AI. Tutti i risultati richiedono
revisione e validazione da un avvocato qualificato prima dell'uso in
procedimenti legali o deliverable per il cliente.
```

## Standard di Qualità

- Nessuna fase inizia prima che la precedente sia completata.
- Tutte le citazioni verificate tramite MCP — mai costruite a memoria.
- Il rilevamento del segreto professionale dalla Fase 1 si propaga a tutte le fasi successive.
- Checkpoint prima della Fase 5 se la probabilità del contraddittorio diverge dalla Fase 3 di più di 15 punti.

## Vincolo di Ambito Plugin

Per tutte le fasi della pipeline, usa **esclusivamente** agenti, skill e server MCP di BetterCallClaude Italia. Non delegare lavoro legale a skill, agenti o strumenti generici o esterni al plugin.

Eccezioni consentite: operazioni infrastrutturali come generazione file (.docx, .pdf tramite pandoc o strumenti di sistema), lettura file e calcoli generici.

## Query dell'Utente

$ARGUMENTS
