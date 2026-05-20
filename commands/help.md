---
description: "Mostra il riferimento completo dei comandi, agenti disponibili, skill ed esempi d'uso."
---

# Aiuto BetterCallClaude Italia

Sei invocato tramite `/bettercallclaude_italia:help`. Mostra il riferimento completo dei comandi.

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `/bettercallclaude_italia:legal` | Gateway intelligente — analizza intento, indirizza a specialisti |
| `/bettercallclaude_italia:refine` | Trasforma query legali vaghe in prompt strutturati |
| `/bettercallclaude_italia:research` | Cerca precedenti giuridici italiani e compila memorie di ricerca |
| `/bettercallclaude_italia:strategy` | Sviluppa strategia processuale con valutazione del rischio |
| `/bettercallclaude_italia:draft` | Redige documenti legali italiani con corretta formattazione delle citazioni |
| `/bettercallclaude_italia:cite` | Verifica e formatta citazioni giuridiche italiane |
| `/bettercallclaude_italia:validate` | Valida citazioni giuridiche italiane in bulk |
| `/bettercallclaude_italia:precedent` | Cerca e analizza precedenti della Cassazione |
| `/bettercallclaude_italia:federal` | Analizza secondo il diritto federale italiano |
| `/bettercallclaude_italia:regional` | Analizza secondo il diritto regionale per una regione specifica |
| `/bettercallclaude_italia:adversarial` | Esegue analisi avversariale a tre agenti |
| `/bettercallclaude_italia:briefing` | Briefing strutturato pre-esecuzione |
| `/bettercallclaude_italia:workflow` | Definisce ed esegue workflow legali multi-agente |
| `/bettercallclaude_italia:translate` | Traduce documenti legali IT/EN |
| `/bettercallclaude_italia:doc-analyze` | Analizza documenti legali |
| `/bettercallclaude_italia:summarize` | Consolida output delle pipeline multi-agente |
| `/bettercallclaude_italia:setup` | Verifica connettività server MCP |
| `/bettercallclaude_italia:version` | Visualizza versione plugin e stato sistema |
| `/bettercallclaude_italia:help` | Mostra questo aiuto |

## Agenti

| Agente | Ruolo |
|-------|------|
| orchestrator | Coordina workflow multi-agente |
| researcher | Ricerca Cassazione, interpretazione normativa |
| strategist | Strategia processuale, valutazione causa |
| drafter | Redazione atti legali |
| citation | Verifica e formattazione citazioni |
| compliance | CONSOB, Banca d'Italia, AGCM, IVASS |
| data-protection | GDPR, Codice Privacy, DPIA |
| risk | Quantificazione rischio, analisi settlement |
| procedure | Termini CPC/CPP, competenza giurisdizionale |
| fiscal | Diritto tributario, CDI, transfer pricing |
| corporate | S.p.A./S.r.l., M&A, governance |
| realestate | Immobili, catasto, locazioni |
| translator | Traduzione giuridica IT/EN |
| regional | Tutte le 20 regioni italiane |
| summarizer | Consolidamento output pipeline |
| prompt-engineer | Affinamento query, raccomandazione workflow |
| briefing | Coordinatore briefing pre-esecuzione |
| judicial | Sintesi neutrale in workflow avversariale |
| advocate | Costruisce caso pro-posizione |
| adversary | Sfida posizioni giuridiche |

## Skill

| Skill | Scopo |
|-------|---------|
| italian-legal-research | Ricerca precedenti Cassazione |
| italian-legal-translation | Traduzione giuridica IT/EN |
| italian-legal-drafting | Redazione documenti |
| compliance-frameworks | Valutazione conformità regolamentare |
| privacy-routing | Protezione segreto professionale |
| italian-legal-strategy | Sviluppo strategia di causa |
| legal-briefing | Briefing pre-esecuzione |
| legal-query-refinement | Trasformazione query |
| italian-citation-formats | Formattazione citazioni |
| italian-jurisdictions | Analisi diritto regionale |
| italian-document-analysis | Intelligenza documentale |
| data-protection-law | Conformità GDPR/Codice Privacy |
| output-summarization | Consolidamento output pipeline |
| adversarial-analysis | Stress-test a tre agenti |

## Esempi d'Uso

```
/bettercallclaude_italia:legal Voglio valutare la mia esposizione ai sensi dell'art. 1218 CC per ritardata consegna

/bettercallclaude_italia:refine Ho problemi con il mio locatore

/bettercallclaude_italia:research Art. 1218 CC responsabilità contrattuale per ritardata consegna

/bettercallclaude_italia:strategy Contenzioso locativo a Milano, locatore chiede EUR 200k danni

/bettercallclaude_italia:draft Contratto di lavoro per ingegnere software a Roma, bilingue IT/EN

/bettercallclaude_italia:adversarial La clausola di non concorrenza in questo contratto di lavoro è valida?

/bettercallclaude_italia:workflow litigation-prep Risarcimento danni contro produttore

/bettercallclaude_italia:briefing Prepara lite completa per inadempimento art. 1218 CC, EUR 500K, Milano

/bettercallclaude_italia:regional LOM Giurisdizione del Tribunale delle Imprese per contratti oltre EUR 30k

/bettercallclaude_italia:doc-analyze @contratto.pdf Analizza questo contratto di locazione commerciale
```

## Supporto Linguistico

| Lingua | Codice | Contesto Legale |
|----------|------|---------------|
| Italiano | IT | Primario: CC, CP, CPC, Cassazione. Lingua ufficiale di tutti i tribunali italiani. |
| Inglese | EN | Lingua di lavoro con mappatura terminologia giuridica italiana. |

## Privacy

BetterCallClaude Italia include conformità integrata al segreto professionale (tutela privilegio avvocato-cliente, Art. 622 CP). L'hook PreToolUse scansiona le chiamate tool in uscita per indicatori di privilegio in italiano (segreto professionale, confidenziale, riservato) e inglese (privileged, confidential).

| Modalità | Comportamento |
|------|----------|
| `strict` | Tutte le chiamate esterne richiedono conferma. Preferisci elaborazione locale via Ollama. |
| `balanced` | Contenuto privilegiato attiva conferma. Contenuto non privilegiato elaborato normalmente. |
| `cloud` | Elaborazione cloud standard con hook privacy attivo solo per marcatori espliciti di privilegio. |

## Disclaimer Professionale

BetterCallClaude Italia è uno strumento di ricerca e analisi legale. Tutti gli output richiedono revisione e validazione da un avvocato qualificato prima dell'uso. Questo strumento non costituisce parere legale.

$ARGUMENTS
