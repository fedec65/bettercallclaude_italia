# Playbook Locale — Guida alla Personalizzazione

Il playbook locale permette di personalizzare BetterCallClaude Italia per il proprio studio legale, reparto legale aziendale o studio professionale.

## Cos'e il Playbook

Un file Markdown (`bettercallclaude-italia.local.md`) che contiene le preferenze operative dello studio: posizioni contrattuali standard, soglie di rischio, formato citazioni, lingua di output, regole di escalation. Il plugin legge questo file e lo applica automaticamente a tutte le analisi, redazioni e valutazioni.

## Dove Posizionare il File

Il plugin cerca il playbook locale nel seguente ordine di precedenza:

| Priorita | Path | Ambiente |
|----------|------|----------|
| 1 | `.claude/bettercallclaude-italia.local.md` | Claude Code (per-progetto) |
| 2 | `bettercallclaude-italia.local.md` in cartella condivisa | Cowork Desktop |
| 3 | `.claude/legal.local.md` | Compatibilita Anthropic Legal |
| 4 | *(nessun file)* | Defaults italiani |

Se nessun file viene trovato, il plugin usa i defaults del diritto italiano e suggerisce di crearne uno tramite `/bettercallclaude-italia:start`.

## Schema del Playbook

### Profilo Studio

```markdown
## Profilo Studio

- **Nome**: Studio Legale Rossi & Associati
- **Sede**: Milano
- **Tipo**: Studio legale / In-house / Commercialista
- **Regioni principali**: Lombardia, Lazio
- **Lingue di lavoro**: IT, EN
```

### Posizioni Contrattuali Standard

```markdown
## Posizioni Contrattuali Standard

- **Legge applicabile**: Diritto italiano
- **Foro competente**: Tribunale di Milano
- **Tetto responsabilita**: Valore del contratto (max 2x per servizi professionali)
- **Clausola penale**: Art. 1382 CC — massimo 10% del valore contratto
- **Clausola risolutiva espressa**: Art. 1456 CC — sempre inclusa
- **NDA durata massima**: 5 anni
- **NDA tipo preferito**: Bilaterale, obblighi reciproci
- **CISG**: Esclusa ex Art. 6 CISG (se cross-border)
```

### Soglie di Rischio ed Escalation

```markdown
## Soglie di Rischio

- **Valore per review umano obbligatorio**: > EUR 100.000
- **Clausole che richiedono escalation**:
  - Rinuncia a diritti inderogabili
  - Garanzie illimitate o indennizzi senza cap
  - Deroga Art. 1229 CC (esonero responsabilita dolo/colpa grave)
  - Clausole di non concorrenza (Art. 2125 CC)
  - Foro non italiano
  - Arbitrato con sede all'estero
```

### Protezione Dati

```markdown
## Protezione Dati

- **Ruolo prevalente**: Titolare del trattamento
- **Normativa primaria**: GDPR (Reg. UE 2016/679) + Codice Privacy (D.Lgs. 196/2003, mod. D.Lgs. 101/2018)
- **Trasferimenti extra-UE**: Richiedono garanzie adeguate (Art. 46 GDPR)
- **DPO**: [Si/No — indicare]
- **Template DPA**: [Link o riferimento interno]
```

### Stile e Formato

```markdown
## Stile e Formato

- **Formato citazioni**: Cass. civ., sez. [X], [data], n. [numero]
- **Formato output**: Markdown (default) / .docx per documenti finali
- **Lingua citazioni**: Italiano
- **Cartella output**: bcc-output (default)
- **Lunghezza default**: medio (3-5 pagine)
```

## Regola Fondamentale

Il playbook **non puo mai** derogare al diritto imperativo (norme inderogabili). Se una posizione contrattuale nel playbook contrasta con una norma imperativa, il plugin segnala il conflitto e applica la norma di legge.

Esempi:
- Art. 1229 CC: un playbook non puo consentire l'esonero da responsabilita per dolo o colpa grave
- Art. 36 D.Lgs. 206/2005 (Codice del Consumo): un playbook non puo derogare alle clausole vessatorie nei contratti B2C
- Art. 2113 CC: un playbook non puo rinunciare a diritti del lavoratore derivanti da norme inderogabili

## Creare il Playbook

Il modo piu semplice e usare `/bettercallclaude-italia:start` che guida la creazione con domande naturali. In alternativa, copiare il template da `templates/bettercallclaude-italia.local.md.example.it` e modificarlo.

## Template Disponibili

- `templates/bettercallclaude-italia.local.md.example.it` — Template italiano completo
- `templates/bettercallclaude-italia.local.md.example.en` — Template inglese
