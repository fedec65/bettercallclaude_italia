# Integrazione Server MCP — CONNECTORS

BetterCallClaude Italia si integra con 7 server MCP ospitati su `mcp-italia.bettercallclaude.ch`. Tutti i server usano trasporto HTTP: nessuna installazione locale, nessuna chiave API richiesta.

## Panoramica

| Server | Scopo | Trasporto | Affidabilita |
|--------|-------|-----------|--------------|
| `normattiva` | Legislazione italiana (1861–oggi) | HTTP | Alta |
| `corte-costituzionale` | Sentenze Corte Costituzionale | HTTP | Bassa (anti-bot DataDome) |
| `giustizia-amministrativa` | Sentenze TAR e Consiglio di Stato | HTTP | Bassa (timeout frequenti) |
| `cassazione` | Massime e sentenze Corte di Cassazione | HTTP | Molto bassa senza cookie ItalGiure |
| `eur-lex-ita` | Diritto UE in lingua italiana | HTTP | Alta |
| `legal-citations-ita` | Validazione/parsing citazioni normative | HTTP | Alta (logica locale) |
| `legal-persona-ita` | Drafting documenti giuridici | HTTP | Alta (logica locale) |

### Configurazione

I server si connettono automaticamente all'installazione del plugin dal marketplace. La configurazione e in `.mcp.json` alla radice del plugin:

```json
{
  "mcpServers": {
    "normattiva": { "type": "http", "url": "https://mcp-italia.bettercallclaude.ch/normattiva/mcp" },
    "cassazione": { "type": "http", "url": "https://mcp-italia.bettercallclaude.ch/cassazione/mcp" }
  }
}
```

(Estratto — il file completo dichiara tutti e 7 i server.)

### Senza server MCP

Se un server e irraggiungibile, le skill degradano in **Reduced Mode**: ogni skill MCP-dipendente dichiara cosa funziona e cosa no senza il server. I server scraper (corte-costituzionale, giustizia-amministrativa, cassazione) possono restituire URL di fallback anziche dati strutturati: in tal caso il plugin fornisce link per la consultazione diretta (ECLI, portale istituzionale, motore di ricerca).

---

## normattiva

Legislazione nazionale italiana dal 1861 ad oggi. Fonte: API Open Data ufficiale `https://api.normattiva.it`.

| Tool | Descrizione |
|------|-------------|
| `normattiva_search` | Ricerca per parole chiave nel titolo/testo degli atti. Parametri: `query`, `orderType`, `page`, `pageSize`, `annoProvvedimento`, `codiceTipoProvvedimento` |
| `normattiva_search_advanced` | Ricerca avanzata con filtri: tipo atto, date emanazione/pubblicazione, vigenza, classe provvedimento, denominazione, numero, anno |
| `normattiva_get_atto` | Metadati atto tramite `codiceRedazionale` e `dataGU`. Restituisce URL al portale Normattiva |
| `normattiva_elenco_tipi` | Elenca tipologie: `classe` (stato atto), `denominazione` (tipo atto), `estensioni` (formati esportazione) |

## corte-costituzionale

Giurisprudenza costituzionale. Fonte: portale ufficiale `https://www.cortecostituzionale.it`.

| Tool | Descrizione |
|------|-------------|
| `corte-costituzionale_search` | Ricerca sentenze per numero, anno, materia, parola chiave |
| `corte-costituzionale_get_sentenza` | Testo integrale per numero e anno |
| `corte-costituzionale_norme_incostituzionali` | Elenco norme dichiarate incostituzionali |

## giustizia-amministrativa

Giustizia amministrativa (TAR e Consiglio di Stato). Fonte: `https://www.giustizia-amministrativa.it`.

| Tool | Descrizione |
|------|-------------|
| `giustizia-amministrativa_search` | Ricerca sentenze per parola chiave, sezione, organo, date |
| `giustizia-amministrativa_get_sentenza` | Testo integrale per ID sentenza |

## cassazione

Massime e sentenze della Corte di Cassazione. Fonte pubblica: SentenzeWeb (`https://www.cortedicassazione.it`).

| Tool | Descrizione |
|------|-------------|
| `cassazione_search_massime` | Ricerca massime (porzione pubblica, ultimi 5 anni). Parametro opzionale `cookie` per accesso ItalGiure completo |
| `cassazione_get_sentenza` | Recupero sentenza per ID (porzione pubblica). Parametro opzionale `cookie` |

**Cookie ItalGiure**: l'accesso completo a massime e sentenze storiche richiede un cookie di sessione ItalGiure, da fornire all'agente quando richiesto. Guida completa: `docs/cassazione-cookie.md`.

## eur-lex-ita

Diritto dell'Unione Europea in lingua italiana. Fonte: endpoint SPARQL CELLAR pubblico di EUR-Lex.

| Tool | Descrizione |
|------|-------------|
| `eur-lex-ita_search` | Ricerca atti UE per tipo, anno, parole chiave, CELEX |
| `eur-lex-ita_get_atto_celex` | Metadati atto UE per codice CELEX |

## legal-citations-ita

Validazione e formattazione delle citazioni normative italiane (logica locale, nessuna fonte esterna).

| Tool | Descrizione |
|------|-------------|
| `legal-citations-ita_validate` | Valida il formato di una citazione normativa italiana |
| `legal-citations-ita_parse` | Estrae tipo, numero, anno, articolo, comma dalla citazione |
| `legal-citations-ita_format` | Formatta la citazione in forma breve o completa |

Pattern supportati: D.Lgs., Legge, D.L., D.P.R., Regolamento UE, articoli e commi.

## legal-persona-ita

Generazione di bozze di documenti giuridici da template (logica locale).

| Tool | Descrizione |
|------|-------------|
| `legal-persona-ita_draft_document` | Redige bozze: contratto, ricorso, parere, lettera_formale, memoria_difensiva, atto_di_citazione |

I template usano placeholder per parti, oggetto e punti chiave.

---

## Privacy

Tutte le chiamate MCP passano dall'hook PreToolUse di rilevamento del segreto professionale (`hooks/hooks.json`). In modalita `strict` i contenuti con indicatori forti di privilegio (Art. 622 CP, segreto professionale) vengono bloccati prima di lasciare la macchina. Dettagli: comando `/bettercallclaude-italia:privacy`.
