# Profili Loop — Dettagli

## citazioni-pulite

**Obiettivo**: anti-allucinazione. Ogni citazione nell'artefatto e validata via MCP.

**Worker**: agente drafting (via `/redazione`)
**Valutatore**: specialista citazioni (agente citation)

**Criteri di successo**:
- R1: ogni citazione traccia a un risultato MCP `legal-citations-ita`
- R2: ogni quote e verbatim dalla fonte
- Nessuna citazione inventata o non verificabile
- Formato citazione conforme a `italian-citation-formats`

**Tool MCP usati**: `legal-citations-ita` → `validate_citation`

**Iterazioni default**: 3

---

## bozza-pronta

**Obiettivo**: quality gate per drafting. L'artefatto soddisfa citazioni + struttura + claims support.

**Worker**: drafter (via `/redazione`)
**Valutatore**: analista giudiziario (agente judicial)

**Criteri di successo**:
- Tutti i criteri di `citazioni-pulite` (R1, R2)
- Struttura documento coerente
- Ogni affermazione legale supportata da fonte
- Formato conforme al tipo di documento (atto, parere, contratto)

**Tool MCP usati**: `legal-citations-ita`, `normattiva`

**Iterazioni default**: 5

---

## contraddittorio-convergenza

**Obiettivo**: stress-test iterativo fino a convergenza della posizione legale o max iterazioni.

**Worker**: advocate (agente advocate)
**Valutatore**: adversary + judicial (agenti adversary e judicial)

**Criteri di successo**:
- La posizione legale resiste alle obiezioni dell'avversario
- Le vulnerabilita identificate sono state affrontate
- Il valutatore non trova nuove obiezioni sostanziali
- Convergenza: score stabile per 2 iterazioni

**Tool MCP usati**: `cassazione` (precedenti), `normattiva` (normativa)

**Iterazioni default**: 5

---

## nda-batch-pulito

**Obiettivo**: completezza del triage NDA per cartelle intere.

**Worker**: analista documenti (via `/triage-nda`)
**Valutatore**: specialista compliance (agente compliance)

**Criteri di successo**:
- Ogni NDA nella cartella ha un verdetto (GREEN/YELLOW/RED)
- Ogni clausola critica e analizzata
- Le soglie del playbook sono applicate correttamente
- Nessun NDA saltato o analizzato solo parzialmente

**Tool MCP usati**: `normattiva` (verifica riferimenti)

**Iterazioni default**: 3

---

## monitoraggio-normativo

**Obiettivo**: monitoraggio cambiamenti normativi e giurisprudenziali rilevanti.

**Worker**: researcher (agente researcher)
**Valutatore**: compliance (agente compliance)

**Criteri di successo**:
- Normattiva consultata per modifiche recenti
- Cassazione consultata per nuovi orientamenti
- Ogni modifica rilevante identificata e classificata per impatto
- Report strutturato con data, fonte, impatto

**Tool MCP usati**: `normattiva`, `cassazione`

**Iterazioni default**: 1 (one-pass-per-run, schedulabile)

**Note**: questo profilo e pensato per esecuzioni periodiche (es. settimanali). Una singola iterazione produce il report delle modifiche dall'ultimo check.
