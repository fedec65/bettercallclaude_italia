---
description: "Triage NDA secondo il diritto italiano — classifica come GREEN (standard) / YELLOW (revisione) / RED (problemi) usando soglie del playbook e criteri legali italiani. Supporta file singolo o batch (cartella)."
---

# Triage NDA — Diritto Italiano

Sei invocato tramite `/bettercallclaude-italia:triage-nda`. Applica la skill italian-document-analysis in **modalita triage NDA** per analizzare uno o piu NDA secondo i criteri del diritto italiano e il playbook locale dell'utente.

**Convenzione output**: scrivi i report di triage in `bcc-output/YYYY-MM-DD-<slug>/triage-nda-<doc>.md`. In modalita batch, scrivi anche una tabella riepilogativa. In chat mostra solo il verdetto (GREEN/YELLOW/RED) con un riassunto di 2-3 righe per NDA. Vedi `skills/shared/SKILL.md`.

**Ambito plugin**: usa esclusivamente agenti, skill e server MCP di BetterCallClaude Italia per tutto il lavoro legale. Non delegare a skill o agenti esterni al plugin. Lettura file e operazioni di sistema sono esenti.

## Caricamento Playbook

Prima di iniziare il triage, cerca il playbook locale nell'ordine di precedenza:
1. `.claude/bettercallclaude-italia.local.md`
2. `bettercallclaude-italia.local.md` nella cartella condivisa
3. `.claude/legal.local.md` (compatibilita Anthropic)
4. Nessun file trovato -> usa i default italiani e nota: *"Nessun playbook locale trovato. Uso i default italiani. Crea un `bettercallclaude-italia.local.md` per soglie personalizzate — vedi `templates/` per esempi."*

Estrai dal playbook:
- Durata massima accettabile NDA
- Ambito della definizione di "informazioni riservate"
- Soglie clausola penale (Art. 1382 CC)
- Preferenze legge applicabile e foro
- Regole e soglie di escalation

## File Singolo vs. Modalita Batch

- **File singolo**: l'utente fornisce un NDA -> produci un report di triage completo.
- **Modalita batch**: l'utente fornisce una cartella o piu file -> produci una **tabella riepilogativa** (file | verdetto | questioni chiave) seguita da report individuali per ogni NDA.

Rileva la modalita batch quando l'input referenzia un path di cartella, piu file, o usa pattern glob.

## Classificazione Triage (Criteri Italiani)

### GREEN — Approvazione Standard
Tutti i seguenti:
- Legge applicabile: diritto italiano
- Foro competente: tribunale italiano
- Durata: entro soglia playbook (default: 5 anni se nessun playbook)
- Obblighi: reciproci (NDA bilaterale)
- Nessuna clausola penale anomala
- Perimetro riservatezza: standard
- Nessun conflitto con norme imperative

### YELLOW — Revisione Legale Raccomandata
Uno o piu dei seguenti:
- Legge applicabile: diritto straniero ma foro raggiungibile (Reg. Bruxelles I-bis, Reg. UE 1215/2012)
- Clausola penale presente ma entro soglie playbook (Art. 1382 CC)
- Durata eccede soglia playbook
- Clausole di non sollecitazione presenti
- Asimmetrie significative tra le parti
- NDA unilaterale (una sola parte vincolata)

### RED — Problemi Sostanziali
Uno o piu dei seguenti:
- Rinuncia a diritti inderogabili (norme imperative)
- Garanzie o indennizzi illimitati
- Deroga Art. 1229 CC (esonero responsabilita per dolo o colpa grave)
- Foro esotico fuori Reg. Bruxelles I-bis
- Clausole di non concorrenza problematiche (Art. 2125 CC nel contesto lavorativo)
- Violazioni evidenti del GDPR (es. trasferimento dati cross-border senza garanzie adeguate)
- Obblighi di riservatezza perpetui o irrevocabili senza eccezioni ragionevoli

## Formato Output

### Report NDA Singolo

```
## Report Triage NDA

**File**: [filename]
**Verdetto**: [GREEN / YELLOW / RED] — [motivazione 2-3 frasi]

### Analisi Clausola per Clausola
| Clausola | Valutazione | Base Giuridica | Redline Suggerita |
|----------|------------|----------------|-------------------|
| Legge applicabile | [valutazione] | [riferimento] | [se applicabile] |
| Foro competente | [valutazione] | [riferimento] | [se applicabile] |
| Durata | [valutazione] | [riferimento] | [se applicabile] |
| Ambito riservatezza | [valutazione] | [riferimento] | [se applicabile] |
| Clausola penale | [valutazione] | Art. 1382 CC | [se applicabile] |
| Non sollecitazione | [valutazione] | [riferimento] | [se applicabile] |
| Non concorrenza | [valutazione] | Art. 2125 CC | [se applicabile] |
| Responsabilita / Indennizzo | [valutazione] | Art. 1229 CC | [se applicabile] |
| Protezione dati | [valutazione] | GDPR / D.Lgs. 196/2003 | [se applicabile] |
| Risoluzione | [valutazione] | Art. 1456 CC | [se applicabile] |

### Escalation (solo YELLOW/RED)
[Elenco elementi che richiedono revisione umana per regole escalation playbook]

### Verifica Fonti
[Riferimenti verificati via normattiva: elenco. Riferimenti non verificati marcati di conseguenza.]
```

### Tabella Riepilogativa Batch

```
## Triage NDA Batch — Riepilogo

| # | File | Verdetto | Questioni Chiave |
|---|------|----------|-----------------|
| 1 | [nome] | GREEN/YELLOW/RED | [sintesi] |
| 2 | [nome] | GREEN/YELLOW/RED | [sintesi] |
| ... | ... | ... | ... |

[Report individuali seguono sotto]
```

## Verifica Fonti

Verifica i riferimenti normativi citati via MCP `normattiva` quando il server e disponibile. Se non disponibile, segna i riferimenti come *"(non verificato)"*.

## Override Diritto Imperativo

Se il playbook contiene posizioni in conflitto con norme imperative italiane, segnalale esplicitamente:
> **Attenzione**: la posizione del playbook "[posizione]" e in conflitto con [norma imperativa]. La norma imperativa prevale — questa posizione del playbook non viene applicata.

---

## Query dell'Utente

$ARGUMENTS
