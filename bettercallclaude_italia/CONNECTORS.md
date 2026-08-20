# Integrazione Server MCP — CONNECTORS

BetterCallClaude Italia si integra con 8 server MCP ospitati su `mcp-italia.bettercallclaude.ch`. Tutti i server usano trasporto HTTP: nessuna installazione locale, nessuna chiave API richiesta.

## Panoramica

| Server | Scopo | Trasporto | Affidabilita |
|--------|-------|-----------|--------------|
| `normattiva` | Legislazione italiana (1861–oggi) | HTTP | Alta |
| `corte-costituzionale` | Sentenze Corte Costituzionale | HTTP | Bassa (anti-bot DataDome) |
| `giustizia-amministrativa` | Sentenze TAR e Consiglio di Stato | HTTP | Bassa (timeout frequenti) |
| `cassazione` | Massime e sentenze Corte di Cassazione | HTTP | Molto bassa senza cookie ItalGiure |
| `eur-lex-ita` | Diritto UE in lingua italiana | HTTP | Alta |
| `legal-citations-ita` | Validazione/parsing citazioni normative | HTTP | Alta (logica locale) |
| `legal-persona-ita` | Drafting documenti + calcolo termini processuali | HTTP | Alta (logica locale) |
| `citation-verify-ita` | Verifica esistenza citazioni giuridiche | HTTP | Media (dipende da ItalGiure/Normattiva) |

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

(Estratto — il file completo dichiara tutti e 8 i server.)

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

Generazione di bozze di documenti giuridici da template (logica locale) e calcolo deterministico dei termini processuali.

| Tool | Descrizione |
|------|-------------|
| `legal-persona-ita_draft_document` | Redige bozze: contratto, ricorso, parere, lettera_formale, memoria_difensiva, atto_di_citazione |
| `legal-persona-ita_compute_deadlines` | Calcola scadenze processuali italiane (CPC/CPP/CPA). Deterministico, nessuna chiamata LLM lato server |

I template usano placeholder per parti, oggetto e punti chiave.

### `legal-persona-ita_compute_deadlines` — contratto

**Input**:

| Parametro | Tipo | Note |
|-----------|------|------|
| `tipo_termine` | enum (required) | `cpc_impugnazione_sentenza_30` (art. 325 c.p.c.), `cpc_impugnazione_sentenza_60` (artt. 325/327 c.p.c.), `cpc_ricorso_cassazione_60` (art. 369 c.p.c.), `cpc_revocazione_30` (art. 395 c.p.c.), `cpc_reclamo_10` (artt. 669-terdecies, 739 c.p.c. — a giorni liberi), `cpc_comparsa_risposta_70` (art. 167 c.p.c.), `cpc_deposito_183_30_60_80` (art. 183 co. 6, multi-scadenza), `cpc_memoria_183_15` (art. 183 co. 6), `cpp_appello_15_30_45` (art. 585 c.p.p., giorni liberi), `cpp_cassazione_15_30_45` (art. 585 c.p.p., giorni liberi), `cpa_ricorso_30_60` (TAR 60 gg art. 29 c.p.a. / CdS 30 gg art. 41 c.p.a.) |
| `data_inizio` | string ISO `YYYY-MM-DD` (required) | data di decorrenza (notificazione, pubblicazione, ecc.) |
| `regione` | string (optional) | riservato, oggi solo festivita nazionali |
| `lingua` | `it` \| `en` (optional, default `it`) | lingua di note e disclaimer |

**Regole implementate**: art. 155 c.p.c. (giorno iniziale escluso), proroga al primo giorno feriale se la scadenza cade di weekend/festivo, sospensione feriale 1°–31 agosto solo per termini civili (L. 742/1969), festivita nazionali + Pasqua/Pasquetta mobili, termini a giorni liberi senza proroga (reclamo, termini penali ex art. 175 c.p.p.).

**Output**: `data.data_scadenza` (ISO), `giorni_effettivi`, `sospensione_feriale_applicata`, `festivita_incontrate[]`, `aggiustamento_weekend`, `note[]`, `scadenze[]` (per i tipi multi-scadenza), `disclaimer` (sempre presente: computazione ausiliaria, non consulenza legale).

**Affidabilita**: alta (logica interna, nessuna dipendenza esterna). **Errori**: data malformata → `{ success: false, error }`.

## citation-verify-ita

Verifica di esistenza delle citazioni giuridiche italiane. NON verifica l'implicazione (se il passaggio supporta la claim) — quella resta lato LLM nella skill `citation-content-verify`.

| Tool | Descrizione |
|------|-------------|
| `citation-verify-ita_check_existence` | Verifica che una citazione giuridica esista realmente in banca dati. Zero-LLM lato server |

### `citation-verify-ita_check_existence` — contratto

**Input**:

| Parametro | Tipo | Note |
|-----------|------|------|
| `citazione` | string (required) | es. `Cass. n. 12345/2024`, `D.Lgs. 231/2001`, `art. 1456 c.c.` |
| `italgiure_cookie` | string (optional) | cookie sessione ItalGiure; il plugin lo passa da `userConfig.italgiure_cookie` se configurato |

**Copertura**: sentenze Cassazione → ItalGiure Solr (richiede cookie); atti normativi → Normattiva Open Data; codici abbreviati (c.c., c.p.c., c.p., c.p.p., Cost.) → atto istitutivo (c.c. → R.D. 262/1942, c.p.c. → R.D. 1443/1940, c.p. → R.D. 1398/1930, c.p.p. → D.P.R. 447/1988).

**Output**: `data.exists` (boolean), `data.fonte` (`cassazione` | `normattiva` | `null`), `data.riferimento_normalizzato` (tipo, numero, anno, sezione, articolo, codiceRedazionale, dataGU, url), `data.note[]`.

**Errori**: citazione non riconosciuta → `exists: false`, `fonte: null` + nota; fonte non raggiungibile (cookie ItalGiure assente/scaduto, Normattiva down) → errore `SOURCE_UNAVAILABLE` (il tool non inventa mai contenuto).

**Affidabilita**: media — eredita da ItalGiure (cookie) e Normattiva (alta).

---

## Privacy

Tutte le chiamate MCP passano dall'hook PreToolUse di rilevamento del segreto professionale (`hooks/hooks.json`). In modalita `strict` i contenuti con indicatori forti di privilegio (Art. 622 CP, segreto professionale) vengono bloccati prima di lasciare la macchina. Dettagli: comando `/bettercallclaude-italia:privacy`.
