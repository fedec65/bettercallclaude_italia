---
description: "Mostra il riferimento completo dei comandi, agenti disponibili, skill ed esempi d'uso."
---

# Aiuto BetterCallClaude Italia

Sei invocato tramite `/bettercallclaude-italia:aiuto`. Mostra il riferimento completo dei comandi.

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `/bettercallclaude-italia:legale` | Gateway intelligente — analizza intento, indirizza a specialisti |
| `/bettercallclaude-italia:legale-5step` | Pipeline completa a 5 fasi: intake → ricerca → strategia → contraddittorio → redazione |
| `/bettercallclaude-italia:raffina` | Trasforma query legali vaghe in prompt strutturati |
| `/bettercallclaude-italia:ricerca` | Cerca precedenti giuridici italiani e compila memorie di ricerca |
| `/bettercallclaude-italia:strategia` | Sviluppa strategia processuale con valutazione del rischio |
| `/bettercallclaude-italia:redazione` | Redige documenti legali italiani con corretta formattazione delle citazioni |
| `/bettercallclaude-italia:citazione` | Verifica e formatta citazioni giuridiche italiane |
| `/bettercallclaude-italia:verifica` | Valida citazioni giuridiche italiane in bulk |
| `/bettercallclaude-italia:precedente` | Cerca e analizza precedenti della Cassazione |
| `/bettercallclaude-italia:nazionale` | Analizza secondo il diritto nazionale italiano |
| `/bettercallclaude-italia:regionale` | Analizza secondo il diritto regionale per una regione specifica |
| `/bettercallclaude-italia:contraddittorio` | Esegue analisi avversariale a tre agenti |
| `/bettercallclaude-italia:briefing` | Briefing strutturato pre-esecuzione |
| `/bettercallclaude-italia:flusso` | Definisce ed esegue workflow legali multi-agente |
| `/bettercallclaude-italia:traduci` | Traduce documenti legali IT/EN |
| `/bettercallclaude-italia:analisi-doc` | Analizza documenti legali |
| `/bettercallclaude-italia:riassumi` | Consolida output delle pipeline multi-agente |
| `/bettercallclaude-italia:configurazione` | Verifica connettività server MCP |
| `/bettercallclaude-italia:privacy` | Visualizza e cambia la modalità privacy del segreto professionale |
| `/bettercallclaude-italia:versione` | Visualizza versione plugin e stato sistema |
| `/bettercallclaude-italia:aiuto` | Mostra questo aiuto |

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
| legal-5step-framework | Pipeline end-to-end a 5 fasi |

## Esempi d'Uso

```
/bettercallclaude-italia:legale Voglio valutare la mia esposizione ai sensi dell'art. 1218 CC per ritardata consegna

/bettercallclaude-italia:raffina Ho problemi con il mio locatore

/bettercallclaude-italia:ricerca Art. 1218 CC responsabilità contrattuale per ritardata consegna

/bettercallclaude-italia:strategia Contenzioso locativo a Milano, locatore chiede EUR 200k danni

/bettercallclaude-italia:redazione Contratto di lavoro per ingegnere software a Roma, bilingue IT/EN

/bettercallclaude-italia:contraddittorio La clausola di non concorrenza in questo contratto di lavoro è valida?

/bettercallclaude-italia:flusso litigation-prep Risarcimento danni contro produttore

/bettercallclaude-italia:briefing Prepara lite completa per inadempimento art. 1218 CC, EUR 500K, Milano

/bettercallclaude-italia:regionale LOM Giurisdizione del Tribunale delle Imprese per contratti oltre EUR 30k

/bettercallclaude-italia:legale-5step Analisi completa responsabilità contrattuale art. 1218 CC, EUR 300k

/bettercallclaude-italia:legale-5step --breve --regione=LOM Contenzioso locativo a Milano

/bettercallclaude-italia:analisi-doc @contratto.pdf Analizza questo contratto di locazione commerciale
```

## Supporto Linguistico

| Lingua | Codice | Contesto Legale |
|----------|------|---------------|
| Italiano | IT | Primario: CC, CP, CPC, Cassazione. Lingua ufficiale di tutti i tribunali italiani. |
| Inglese | EN | Lingua di lavoro con mappatura terminologia giuridica italiana. |

## Privacy

BetterCallClaude Italia include un hook PreToolUse di assistenza al rilevamento del segreto professionale (Art. 622 CP, L. 247/2012, CDF Art. 13). L'hook scansiona le chiamate tool in uscita (Write, Edit, MultiEdit, WebFetch, Bash e tutti i tool MCP) per indicatori di privilegio in italiano e inglese. I tool Ollama (mcp__ollama__*) sono esclusi perche locali.

| Modalità | Pattern forti | Pattern deboli+contesto | Ollama |
|------|--------------|------------------------|--------|
| `strict` | **Bloccato** (deny) | **Bloccato** (deny) | Sempre permesso |
|          | Contenuto non privilegiato passa (server MCP cloud usabili) | | |
| `balanced` | **Conferma richiesta** (ask) | **Conferma richiesta** (ask) | Sempre permesso |
| `cloud` | **Conferma richiesta** (ask) | Permesso senza prompt | Sempre permesso |

La modalità si configura con `/bettercallclaude-italia:privacy strict|balanced|cloud` (default: `balanced`). In modalità `strict`, il contenuto privilegiato è bloccato ma le chiamate senza pattern privilegiati passano normalmente (i server MCP cloud restano usabili per la ricerca). Usare Ollama per elaborare contenuto privilegiato in sicurezza.

> **Nota**: L'hook privacy è una tecnologia assistiva e non garantisce la conformità all'Art. 622 CP o alla L. 247/2012 / CDF Art. 13. Gli avvocati restano professionalmente responsabili della protezione della confidenzialità del cliente.

## Disclaimer Professionale

BetterCallClaude Italia è uno strumento di ricerca e analisi legale. Tutti gli output richiedono revisione e validazione da un avvocato qualificato prima dell'uso. Questo strumento non costituisce parere legale.

$ARGUMENTS
