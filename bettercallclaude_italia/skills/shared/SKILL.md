---
name: output-conventions
description: "Convenzione output-as-file condivisa per tutti i comandi BetterCallClaude Italia. Definisce la struttura cartella bcc-output, naming dei file e template riassunto chat."
---

# Convenzione Output BetterCallClaude Italia

Questo documento definisce il comportamento di output standard per tutti i comandi BetterCallClaude Italia che producono risultati piu lunghi di circa una pagina (~500 parole).

## Regola

Ogni comando che produce un output lungo (memoria, ricerca, strategia, analisi, triage, traduzione, bozza) **DEVE**:

1. Scrivere il risultato completo come file nella cartella di lavoro.
2. Mostrare in chat solo un **riassunto di 3-5 righe** piu il path al file scritto.

Output brevi (citazione, verifica, raffina, versione, aiuto, privacy, riassumi --breve) possono restare in chat.

## Struttura Cartella

```
<cartella lavoro>/bcc-output/
  YYYY-MM-DD-<slug>/
    01-intake.md
    02-ricerca.md
    03-strategia.md
    04-contraddittorio.md
    05-bozza-<documento>.md   (o .docx per redline)
    fonti.md
```

- **`bcc-output`** e il nome cartella predefinito. L'utente puo cambiarlo nel playbook locale (`bettercallclaude-italia.local.md`) sotto "Stile e formato" -> preferenza cartella output.
- La **sottocartella con data-slug** usa il formato `YYYY-MM-DD-<breve-descrizione>` (es. `2026-06-01-triage-nda-rossi`).
- La **numerazione** segue le fasi di `/legale-5step`. I comandi eseguiti singolarmente scrivono solo i file pertinenti nella stessa struttura.
- **`fonti.md`** e sempre presente quando sono stati usati server MCP: elenca ogni fonte consultata con data di verifica -- questa e la traccia documentale per la due diligence.

## Formati File

- **Default**: `.md` (Markdown).
- **Redline / documenti per controparte**: `.docx` (tracked changes dove applicabile).
- **Su richiesta esplicita**: qualsiasi formato.
- Il playbook puo impostare un formato predefinito nella sezione "Stile e formato".

## Comportamento per Ambiente

- **Cowork**: la cartella di lavoro e la cartella condivisa selezionata dall'utente. I file appaiono direttamente nel file browser dell'utente.
- **Claude Code**: la cartella di lavoro e la root del progetto. Stessa struttura, diverso path base.

## Template Riassunto Chat

Quando scrivi un file, mostra in chat:

```
**[Titolo del risultato]** scritto in `bcc-output/YYYY-MM-DD-slug/filename.md`

[Riassunto 3-5 righe dei risultati / conclusioni chiave]

Documento completo: `bcc-output/YYYY-MM-DD-slug/filename.md`
Fonti: `bcc-output/YYYY-MM-DD-slug/fonti.md`
```

## Applicabilita

Comandi che producono file output con questa convenzione:

| Comando | File Output |
|---------|------------|
| `legale` (multi-agente) | varia per workflow |
| `ricerca` | `02-ricerca.md` |
| `strategia` | `03-strategia.md` |
| `redazione` | `05-bozza-<doc>.md` o `.docx` |
| `contraddittorio` | `04-contraddittorio.md` |
| `flusso` | tutti i file pipeline |
| `traduci` | `traduzione-<doc>.md` |
| `analisi-doc` | `analisi-<doc>.md` |
| `triage-nda` | `triage-nda-<doc>.md` (batch: sommario + individuali) |
| `precedente` | `catena-precedenti-<tema>.md` |
| `legale-5step` | tutti e 5 i file + `fonti.md` |
| `briefing` | `piano-briefing.md` |
| `legale-obiettivo` | `bcc-output/goals/<id>.md` |
| `legale-loop` | `bcc-output/loops/<goal-id>/iteration-<n>.md` |

Comandi che restano in chat: `citazione`, `verifica`, `raffina`, `riassumi --breve`, `versione`, `aiuto`, `privacy`, `start`, `doctor`.
