---
name: legal-5step-framework
description: "Framework legale BetterCallClaude a 5 fasi che concatena cinque agenti: analisi-doc (intake), italian-legal-research (precedenti e norme), italian-legal-strategy (forza causa e rischio), adversarial-analysis (stress-test) e italian-legal-drafting (documento verificato). Attiva quando l'utente invoca /bettercallclaude-italia:legale-5step o chiede la pipeline completa dall'intake alla redazione. Non attivare per singole fasi, sole citazioni, domande rapide o sola traduzione."
---

# Framework Legale BetterCallClaude a 5 Fasi

Coordini la pipeline legale italiana BetterCallClaude a 5 fasi. Cinque agenti operano in sequenza, ciascuno passando output strutturato al successivo, dall'input grezzo del caso a un documento legale redatto e verificato.

## Framework

```
INTAKE → RICERCA → STRATEGIA → CONTRADDITTORIO → REDAZIONE
  (1)       (2)        (3)           (4)              (5)
```

Le cinque fasi corrispondono alle cinque mosse cognitive su qualsiasi nuova questione legale italiana:
1. Quali sono i fatti e le questioni?
2. Cosa dice la legge?
3. Cosa dovremmo fare?
4. Abbiamo ragione?
5. Come lo scriviamo?

## Definizioni Fasi

### Fase 1: INTAKE
**Agente**: analisi-doc | **Skill**: `privacy-routing` | **Ref**: `shared/references/italian-jurisdictions.md`

Estrae fatti, identifica questioni giuridiche, determina giurisdizione e lingua, segnala indicatori di segreto professionale prima di qualsiasi chiamata MCP esterna. Il flag di privilegio si propaga attraverso le Fasi 2-5.

**Output**:
- Lista fatti strutturata
- Questioni giuridiche classificate per rilevanza
- Giurisdizione: nazionale o regionale (XX)
- Lingua: IT/EN
- Flag privilegio: true/false

### Fase 2: RICERCA
**Agente**: researcher | **Skill**: `italian-legal-research`
**Server MCP**: `cassazione`, `normattiva`, `corte-costituzionale`, `giustizia-amministrativa`, `eur-lex-ita`

Recupera precedenti della Cassazione, testo normativo vigente e dottrina. Tutte le citazioni generate tramite `legal-citations-ita` — mai costruite manualmente.

**Output**:
- Memorandum di ricerca con citazioni verificate
- Testo normativo recuperato da `normattiva` o `eur-lex-ita`
- Dottrina e commento

**Regola citazioni**: Ogni riferimento alla Cassazione nelle Fasi 3-5 deve comparire in questo memorandum.

### Fase 3: STRATEGIA
**Agente**: strategist + risk | **Skill**: `italian-legal-strategy`
**Server MCP**: `cassazione` (per probabilità basate sui precedenti)

Converte il memorandum di ricerca in una raccomandazione orientata alla decisione con probabilità fondata sui precedenti.

**Output**:
- Forza della causa: Forte / Moderata / Debole
- Probabilità successo: X% (fondata sui precedenti della Cassazione)
- Percorso procedurale: rito CPC, foro competente, tempistica
- Matrice rischio: Critico / Moderato / Minore
- Range transazione e BATNA
- Raccomandazione: contenzioso / transazione / ADR

**Checkpoint**: Se `probabilità_successo < 30%` o rischio Critico — pausa, presenta memorandum, attendi conferma.

### Fase 4: CONTRADDITTORIO
**Agente**: advocate + adversary + judicial | **Skill**: `adversarial-analysis`
**Server MCP**: `cassazione`, `legal-citations-ita`

Stress-testa la strategia della Fase 3 attraverso tre agenti indipendenti prima che la redazione consolidi la posizione su carta.

**Output**:
- RapportoAvvocato: caso più forte A FAVORE, con supporto Cassazione
- RapportoAvversario: sfida sistematica con contro-precedenti
- SintesiGiudiziaria: conclusione bilanciata stile motivazione con punteggi di probabilità
- delta_strategia: variazione % rispetto alla stima della Fase 3

**Checkpoint**: Se `delta_strategia > 15%` — pausa prima della Fase 5, presenta entrambe le stime, invita alla revisione della strategia.

### Fase 5: REDAZIONE
**Agente**: drafter + citation | **Skill**: `italian-legal-drafting`, `italian-citation-formats`
**Server MCP**: `legal-citations-ita` (validazione formato), `legal-persona-ita`

Produce il documento legale dalla posizione confermata. Nessun nuovo argomento giuridico introdotto — tutto risale alla Fase 2.

**Selezione documento**:

| Tipo di Questione | Output Default |
|-------------------|----------------|
| Contenzioso — attore | Atto di citazione (CPC Art. 163) |
| Contenzioso — convenuto | Comparsa di costituzione e risposta (CPC Art. 167) |
| Disputa contrattuale | Parere legale |
| Compliance | Memorandum consultivo |
| Consulenza | Lettera al cliente o parere breve |
| Personalizzato | Come specificato |

**Formati citazione**:

| Tipo | Formato |
|------|---------|
| Cassazione civile | Cass. civ., sez. III, 15 marzo 2024, n. 12345 |
| Cassazione penale | Cass. pen., sez. VI, 10 gennaio 2024, n. 6789 |
| Codice Civile | art. 1218 c.c. |
| Codice Penale | art. 622 c.p. |
| Codice Procedura Civile | art. 163 c.p.c. |
| Costituzione | art. 97 Cost. |
| Decreto Legislativo | D.Lgs. 196/2003 |

## Flusso Dati

```
Fase 1  →  fatti, questioni, giurisdizione, lingua, flag_privilegio
Fase 2  →  memorandum ricerca, citazioni verificate, testo normativo, dottrina
Fase 3  →  memorandum strategia, probabilità_successo, matrice_rischio, raccomandazione
Fase 4  →  sintesi giudiziaria, probabilità_complessiva, delta_strategia
Fase 5  →  documento finale (tutte le citazioni dal memorandum Fase 2)
```

## Quality Gates

| Gate | Condizione | Azione |
|------|-----------|--------|
| Privilegio | `flag_privilegio: true` | Pausa prima della Fase 2, conferma chiamate MCP |
| Bassa probabilità | `probabilità_successo < 30%` | Pausa dopo la Fase 3 |
| Delta strategia | `delta_strategia > 15%` | Pausa prima della Fase 5 |
| Integrità citazioni | Citazione in Fase 5 non nel memorandum Fase 2 | Blocca e recupera tramite MCP |

## Disclaimer Professionale

Tutti gli output della pipeline richiedono revisione e validazione da un avvocato qualificato prima dell'uso. Questo framework non costituisce parere legale. Gli avvocati mantengono la piena responsabilità professionale per tutti i prodotti del lavoro legale.
