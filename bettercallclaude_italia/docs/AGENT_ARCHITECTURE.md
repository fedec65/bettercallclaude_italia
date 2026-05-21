# Architettura Agenti BetterCallClaude Italia

## Panoramica

BetterCallClaude Italia comprende 20 agenti specializzati organizzati in gruppi funzionali.

## Gruppi di Agenti

### Workflow Core
| Agente | Ruolo | Modello |
|--------|-------|---------|
| orchestrator | Coordinamento workflow multi-agente | opus |
| briefing | Intake pre-esecuzione e pianificazione | sonnet |
| summarizer | Consolidamento output e deduplicazione | haiku |

### Ricerca e Analisi
| Agente | Ruolo | Modello |
|--------|-------|---------|
| researcher | Ricerca Cassazione e normativa | sonnet |
| strategist | Strategia processuale e valutazione causa | sonnet |
| citation | Verifica e formattazione citazioni | haiku |

### Domini Specialistici
| Agente | Ruolo | Modello |
|--------|-------|---------|
| compliance | CONSOB, Banca d'Italia, AGCM, IVASS | sonnet |
| data-protection | GDPR, Codice Privacy, DPIA | sonnet |
| risk | Probabilità ed esposizione finanziaria | sonnet |
| procedure | Termini CPC/CPP e competenza giudiziaria | sonnet |
| fiscal | Analisi fiscale e strutturazione CDI | sonnet |
| corporate | S.p.A./S.r.l., M&A, governance | sonnet |
| realestate | Immobili, catasto, locazioni | sonnet |
| regional | Tutte le 20 regioni italiane | sonnet |

### Supporto
| Agente | Ruolo | Modello |
|--------|-------|---------|
| translator | Traduzione giuridica IT/EN | sonnet |
| prompt-engineer | Affinamento query e guida workflow | sonnet |

### Workflow Avversariale
| Agente | Ruolo | Modello |
|--------|-------|---------|
| advocate | Costruttore argomenti pro-posizione | sonnet |
| adversary | Costruttore sfide anti-posizione | sonnet |
| judicial | Sintesi neutrale e probabilità | opus |

## Pattern di Interazione degli Agenti

### Indirizzo Singolo Agente
```
utente -> comando legal -> agente -> output
```

### Pipeline Sequenziale
```
utente -> comando workflow -> agente1 -> agente2 -> agente3 -> summarizer -> output
```

### Pipeline Parallela
```
utente -> comando workflow -> parallelo[agenteA, agenteB, agenteC] -> risk -> drafter -> summarizer -> output
```

### Pipeline Avversariale
```
utente -> comando adversarial -> advocate + adversary (parallelo) -> judicial -> output
```

### Esecuzione da Briefing
```
utente -> comando briefing -> coordinatore briefing -> domande panel -> piano di esecuzione -> orchestrator -> pipeline -> output
```

## Flusso Dati

Gli agenti comunicano attraverso output strutturato che gli agenti successivi elaborano:
- **Researcher**: liste di precedenti, analisi normativa, tabelle terminologiche
- **Strategist**: valutazione causa, matrici di probabilità, matrici di raccomandazione
- **Drafter**: documenti formattati con citazioni
- **Risk**: modelli finanziari, analisi di transazione
- **Compliance**: matrici gap, roadmap di rimedio

L'orchestrator gestisce il passaggio dei dati tra gli agenti, e il summarizer consolida l'output finale.
