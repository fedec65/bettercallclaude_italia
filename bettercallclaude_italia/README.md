[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/fedec65/bettercallclaude_italia/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Cowork%20Desktop-orange)](https://claude.ai)

<p align="center">
  <img src="docs/images/logo.png" alt="Meglio Chiamare Claude" width="400">
</p>

<p align="center"><strong>Plugin di Intelligenza Legale Italiana per Cowork Desktop</strong></p>

BetterCallClaude Italia trasforma la ricerca legale, la strategia di causa e la redazione documentale per gli avvocati italiani. Offre integrazione profonda con banche dati giuridiche italiane, analisi bilingue (IT/EN) e protezione integrata del segreto professionale — 20 agenti, 19 comandi, 14 skill e 9 server MCP che coprono ricerca sui precedenti della Cassazione, strategia processuale, analisi avversariale, redazione legale, verifica delle citazioni, intelligenza documentale e arbitrato sportivo CAS/TAS in tutte le 20 regioni italiane.

---

## Panoramica

BetterCallClaude Italia fornisce una metodologia strutturata per gestire il lavoro legale con assistenza AI. Il framework è costituito da cinque fasi interconnesse.

---

## Installazione

1. In Cowork, clicca **Personalizza** > **Sfoglia plugin** > **Personali** > **+** > **Aggiungi marketplace da GitHub**
2. Inserisci `fedec65/bettercallclaude_italia` e clicca **Sincronizza**
3. Clicca **Installa** sulla scheda BetterCallClaude Italia

I server MCP si connettono automaticamente via HTTP. Nessun Node.js, nessuna configurazione locale, nessuna chiave API richiesta per i server HTTP. Il server Ollama locale richiede Node.js >= 18.

---

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
| `/bettercallclaude_italia:help` | Mostra il riferimento completo dei comandi |

### Esempi d'Uso

```
/bettercallclaude_italia:legal Voglio valutare la mia esposizione ai sensi dell'art. 1218 CC

/bettercallclaude_italia:refine Ho problemi con il mio locatore

/bettercallclaude_italia:research Art. 1218 CC responsabilità contrattuale

/bettercallclaude_italia:strategy Contenzioso locativo a Milano, locatore chiede EUR 200k danni

/bettercallclaude_italia:draft Contratto di lavoro per ingegnere software a Roma

/bettercallclaude_italia:adversarial La clausola di non concorrenza è valida?

/bettercallclaude_italia:workflow litigation-prep Risarcimento danni contro produttore

/bettercallclaude_italia:briefing Prepara lite completa per inadempimento art. 1218 CC, EUR 500K

/bettercallclaude_italia:regional LOM Giurisdizione Tribunale delle Imprese

/bettercallclaude_italia:doc-analyze @contratto.pdf Analizza questo contratto di locazione
```

---

## Funzionalità Chiave

- **Sessioni di briefing** — Query complesse attivano intake collaborativo con panel di specialisti.
- **Analisi avversariale** — Workflow a tre agenti: l'avvocato costruisce, l'avversario sfida, l'analista giudiziario sintetizza.
- **Workflow multi-agente** — Pipeline predefinite per due diligence, preparazione contenzioso, ciclo contrattuale, closing immobiliare.
- **Tutte le 20 regioni** — Copertura regionale completa con sistemi giudiziari, formati di citazione e ricerca MCP.
- **Bilingue** — Rilevamento automatico della lingua per IT/EN con corretta terminologia legale.

---

## Server MCP

Tutti i server si connettono automaticamente dopo l'installazione. Nessuna configurazione richiesta.

| Server | Scopo | Trasporto |
|--------|-------|-----------|
| `giurisprudenza` | Ricerca decisioni giudiziarie italiane (Cassazione + regionali) | HTTP |
| `cassazione-search` | Ricerca decisioni Cassazione | HTTP |
| `legal-citations` | Verifica e formattazione citazioni | HTTP |
| `normattiva` | Banca dati legislazione federale | HTTP |
| `commentario` | Commentari giuridici italiani | HTTP |
| `legal-persona` | Intelligenza documentale diritto italiano | HTTP |
| `tas-jurisprudence` | Decisioni arbitrato sportivo CAS/TAS | HTTP |
| `italian-caselaw` | Giurisprudenza, grafi citazioni, catene di impugnazione | SSE |
| `ollama` | Classificazione privacy locale per segreto professionale | Locale |

---

## Privacy

BetterCallClaude Italia include conformità integrata al segreto professionale (privilegio avvocato-cliente, Art. 622 CP). Un hook `PreToolUse` scansiona le chiamate tool in uscita per indicatori di privilegio in italiano (segreto professionale, confidenziale, riservato) e inglese (privileged, confidential).

| Modalità | Comportamento |
|----------|---------------|
| `strict` | Tutte le chiamate esterne richiedono conferma. Elaborazione locale preferita via Ollama. |
| `balanced` | Contenuto privilegiato attiva conferma. Contenuto non privilegiato elaborato normalmente. |
| `cloud` | Elaborazione cloud standard con hook privacy attivo solo per marcatori espliciti di privilegio. |

---

## Supporto Linguistico

| Lingua | Codice | Contesto Legale |
|--------|--------|-----------------|
| Italiano | IT | Primario: CC, CP, CPC, Cassazione. Lingua ufficiale di tutti i tribunali italiani. |
| Inglese | EN | Lingua di lavoro con mappatura terminologia giuridica italiana. |

---

## Requisiti

- Claude Cowork Desktop (ultima versione)
- Node.js >= 18 (solo per il classificatore privacy Ollama — tutti gli altri server si connettono via HTTP)

---

## Autore

Federico Cesconi — [fedec65/bettercallclaude_italia](https://github.com/fedec65/bettercallclaude_italia)

## Licenza

AGPL-3.0 — Vedi [LICENSE](LICENSE) per i termini completi.

---

## Disclaimer Professionale

BetterCallClaude Italia è uno strumento di ricerca e analisi legale. Tutti gli output prodotti da questo plugin:

- Richiedono revisione e validazione da un avvocato qualificato prima dell'uso.
- Non costituiscono parere legale.
- Possono contenere errori, omissioni o informazioni obsolete.
- Devono essere verificati rispetto a fonti ufficiali (Gazzetta Ufficiale, banche dati giudiziarie, giornali ufficiali).
- Devono essere adattati alle circostanze specifiche di ogni causa.

Gli avvocati mantengono la piena responsabilità professionale per tutti i prodotti del lavoro legale. Questo strumento assiste i professionisti legali ma non sostituisce il giudizio professionale, la verifica indipendente o il dovere di diligenza verso i clienti.
