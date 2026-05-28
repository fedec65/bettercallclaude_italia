[![Version](https://img.shields.io/badge/version-1.0.5-blue)](https://github.com/fedec65/bettercallclaude_italia/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Cowork%20Desktop-orange)](https://claude.ai)

<p align="center">
  <img src="docs/images/logo.png" alt="Meglio Chiamare Claude" width="400">
</p>

<p align="center"><strong>Plugin di Intelligenza Legale Italiana per Cowork Desktop</strong></p>

BetterCallClaude Italia trasforma la ricerca legale, la strategia di causa e la redazione documentale per gli avvocati italiani. Offre integrazione profonda con banche dati giuridiche italiane, analisi bilingue (IT/EN) e assistenza al rilevamento del segreto professionale — 20 agenti, 19 comandi, 14 skill e 7 server MCP che coprono ricerca sui precedenti della Cassazione, strategia processuale, analisi avversariale, redazione legale, verifica delle citazioni, intelligenza documentale e arbitrato sportivo CAS/TAS in tutte le 20 regioni italiane.

---

## Panoramica

BetterCallClaude Italia fornisce una metodologia strutturata per gestire il lavoro legale con assistenza AI. Il framework è costituito da cinque fasi interconnesse.

<p align="center">
  <img src="docs/images/framework.png" alt="Framework BetterCallClaude Italia" width="600">
</p>

---

## Installazione

1. In Cowork, clicca **Personalizza** > **Sfoglia plugin** > **Personali** > **+** > **Aggiungi marketplace da GitHub**
2. Inserisci `fedec65/bettercallclaude_italia` e clicca **Sincronizza**
3. Clicca **Installa** sulla scheda BetterCallClaude Italia

I server MCP si connettono automaticamente via HTTP. Nessun Node.js, nessuna configurazione locale, nessuna chiave API richiesta.

> **[QUI L'INSTALLAZIONE PASSO PER PASSO](docs/INSTALLAZIONE.md)** -- Guida illustrata con screenshot per ogni passaggio.

---

## Comandi

| Comando | Descrizione |
|---------|-------------|
| `/bettercallclaude-italia:legale` | Gateway intelligente — analizza intento, indirizza a specialisti |
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
| `/bettercallclaude-italia:aiuto` | Mostra il riferimento completo dei comandi |

### Esempi d'Uso

```
/bettercallclaude-italia:legale Voglio valutare la mia esposizione ai sensi dell'art. 1218 CC

/bettercallclaude-italia:raffina Ho problemi con il mio locatore

/bettercallclaude-italia:ricerca Art. 1218 CC responsabilità contrattuale

/bettercallclaude-italia:strategia Contenzioso locativo a Milano, locatore chiede EUR 200k danni

/bettercallclaude-italia:redazione Contratto di lavoro per ingegnere software a Roma

/bettercallclaude-italia:contraddittorio La clausola di non concorrenza è valida?

/bettercallclaude-italia:flusso litigation-prep Risarcimento danni contro produttore

/bettercallclaude-italia:briefing Prepara lite completa per inadempimento art. 1218 CC, EUR 500K

/bettercallclaude-italia:regionale LOM Giurisdizione Tribunale delle Imprese

/bettercallclaude-italia:analisi-doc @contratto.pdf Analizza questo contratto di locazione
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
| `normattiva` | Legislazione italiana (1861–oggi) | HTTP |
| `corte-costituzionale` | Sentenze Corte Costituzionale | HTTP |
| `giustizia-amministrativa` | TAR e Consiglio di Stato | HTTP |
| `cassazione` | Giurisprudenza Corte di Cassazione | HTTP |
| `eur-lex-ita` | Diritto UE in lingua italiana | HTTP |
| `legal-citations-ita` | Validazione citazioni normative italiane | HTTP |
| `legal-persona-ita` | Drafting documenti giuridici italiani | HTTP |

### Affidabilita Server

| Server | Affidabilita | Note |
|--------|-------------|------|
| normattiva | Alta | API Open Data ufficiale |
| eur-lex-ita | Alta | SPARQL su EUR-Lex |
| legal-citations-ita | Alta | Funziona localmente |
| legal-persona-ita | Alta | Funziona localmente |
| corte-costituzionale | Bassa | Protezione anti-bot (DataDome) |
| giustizia-amministrativa | Bassa | Portale instabile, timeout frequenti |
| cassazione | Molto bassa | HTTP 403 sistematico |

Quando i server scraper (corte-costituzionale, giustizia-amministrativa, cassazione) restituiscono URL fallback anziche dati strutturati, il plugin fornisce automaticamente link per consultazione diretta tramite ECLI, Google o portale istituzionale.

---

## Privacy

BetterCallClaude Italia include un hook `PreToolUse` di assistenza al rilevamento del segreto professionale (Art. 622 CP, L. 247/2012, CDF Art. 13). L'hook scansiona le chiamate tool in uscita (Write, Edit, MultiEdit, WebFetch, Bash e tutti i tool MCP) per indicatori di privilegio in italiano e inglese. I tool **Ollama** (`mcp__ollama__*`) sono esclusi dal controllo perche girano in locale (localhost:11434) e non trasmettono dati all'esterno.

| Modalità | Pattern forti | Pattern deboli+contesto | Ollama |
|----------|--------------|------------------------|--------|
| `strict` | **Bloccato** (deny) | **Bloccato** (deny) | Sempre permesso |
| `balanced` | **Conferma richiesta** (ask) | **Conferma richiesta** (ask) | Sempre permesso |
| `cloud` | **Conferma richiesta** (ask) | Permesso senza prompt | Sempre permesso |

La modalità si configura con `/bettercallclaude-italia:privacy strict|balanced|cloud` (default: `balanced`). In modalità `strict`, usare Ollama per elaborare contenuto privilegiato in sicurezza.

> **Nota**: L'hook privacy è una tecnologia assistiva e non garantisce la conformità all'Art. 622 CP o alla L. 247/2012 / CDF Art. 13. Gli avvocati restano professionalmente responsabili della protezione della confidenzialità del cliente. Il rilevamento è basato su pattern e può essere eluso da formulazioni non standard.

---

## Supporto Linguistico

| Lingua | Codice | Contesto Legale |
|--------|--------|-----------------|
| Italiano | IT | Primario: CC, CP, CPC, Cassazione. Lingua ufficiale di tutti i tribunali italiani. |
| Inglese | EN | Lingua di lavoro con mappatura terminologia giuridica italiana. |

---

## Requisiti

- Claude Cowork Desktop (ultima versione)

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
