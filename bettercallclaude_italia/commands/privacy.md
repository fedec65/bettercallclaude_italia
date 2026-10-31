---
description: "Visualizza e cambia la modalita privacy del segreto professionale. Modalita: strict, balanced, cloud."
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - WebSearch
  - WebFetch
  - mcp__plugin_bettercallclaude-italia_ollama__ollama_check_status
  - mcp__ollama__ollama_check_status
---

# Privacy BetterCallClaude Italia

Sei invocato tramite `/bettercallclaude-italia:privacy`. Gestisci la modalita privacy per la protezione del segreto professionale.

## Argomenti

- Senza argomenti: visualizza la modalita corrente e la tabella delle modalita.
- Con argomento (`strict`, `balanced`, `cloud`): cambia la modalita.

## Comportamento

### Visualizza modalita corrente (nessun argomento)

Mostra all'utente:

```
## Modalita Privacy BetterCallClaude Italia

Modalita corrente: **[balanced]**

| Modalita | Pattern forti | Pattern deboli/riferimenti con contesto | Tool locali |
|----------|--------------|------------------------------------------|-------------|
| strict | BLOCCATO (deny) | BLOCCATO (deny) | Sempre permesso |
|        | Contenuto non privilegiato passa (server MCP cloud usabili) | | |
| **balanced** | Conferma richiesta (ask) | Conferma richiesta (ask) | Sempre permesso |
| cloud | Conferma richiesta (ask) | Permesso senza prompt | Sempre permesso |

Pattern forti: segreto professionale, segreto del mandato, segreto istruttorio,
riserbatissimo, strettamente riservato, riservatezza professionale,
attorney-client privilege, work product, strictly confidential, ecc.

Pattern deboli e riferimenti normativi: riservato, confidenziale, privato,
non divulgare, uso interno, Art. 622 CP, L. 247/2012, CDF Art. 13/28,
Art. 200/103/663 CPP, obbligo/vincolo di riservatezza, segreto commerciale —
contano solo insieme a un contesto cliente/causa (cliente, mandante, dossier,
controparte, oppure 2+ segnali deboli): citare la norma sul segreto non
equivale a violarlo.

I tool locali (es. `mcp__ollama__*`, se Ollama e configurato) sono sempre esclusi dal controllo perche non trasmettono dati all'esterno.

## Perimetro di scansione

Di default l'hook controlla solo le chiamate in uscita di rete: WebFetch,
tool MCP non locali e comandi Bash capaci di inviare dati (curl, wget, nc,
ssh, scp, rsync, git push, ...). Write/Edit/MultiEdit su file locali non
sono scannerizzati: scrivere un file locale non trasmette dati.

Configurazione (pannello /config del plugin):
- privacy_mode: strict | balanced | cloud
- scan_local_writes: true ripristina la scansione completa di tutti i tool
- privacy_exempt_paths: cartelle escluse dal controllo, separate da ";"
  (es. ~/Documenti/blog;~/progetti/linkedin), espansione di ~ supportata

Nota: la modalita base si configura nel pannello /config (userConfig
privacy_mode, ricevuta dall'hook come variabile d'ambiente). Il file
.privacy-mode nel progetto puo solo alzare la severita rispetto alla
modalita base, mai abbassarla.

Per cambiare: /bettercallclaude-italia:privacy strict|balanced|cloud
```

### Cambia modalita (con argomento)

Quando l'utente specifica una modalita:

1. Valida che l'argomento sia `strict`, `balanced` o `cloud` (case-insensitive).
2. Se non valido, mostra errore e le opzioni disponibili.
3. Se valido, **scrivi la modalita nel file `.privacy-mode`** nella directory del progetto corrente (`$CWD/.privacy-mode`). Il file contiene solo la parola della modalita (es. `strict`). **Nota**: il file puo solo alzare la severita rispetto alla modalita base risolta (userConfig `privacy_mode` nel pannello /config, default `balanced`), mai abbassarla: un file con `cloud` viene ignorato quando la base e' `balanced` o `strict` (sicurezza NEW-1, generalizzata in v2.4.6).
4. Conferma il cambio all'utente:

```
Modalita privacy cambiata: **[nuova modalita]**

L'hook PreToolUse usera questa modalita per le prossime chiamate tool.
```

### Raccomandazioni per modalita

Quando l'utente chiede quale modalita usare, consiglia:

- **strict** -- Per lavoro su contenuto altamente privilegiato. Le chiamate contenenti pattern privilegiati sono bloccate. Il contenuto non privilegiato passa normalmente (i server MCP cloud restano usabili per la ricerca). I tool locali sono sempre permessi.
- **balanced** (default) -- Per uso quotidiano. L'hook chiede conferma quando rileva contenuto potenzialmente privilegiato. L'utente mantiene il controllo.
- **cloud** -- Per lavoro su contenuto non sensibile. Solo i pattern forti generano un avviso.

## Base Giuridica

- Art. 622 CP -- Violazione del segreto professionale (sanzione penale)
- L. 247/2012 -- Nuova disciplina dell'ordinamento della professione forense
- CDF Art. 13 -- Dovere di segretezza
- CDF Art. 28 -- Dovere di riserbo
- Art. 200 CPP -- Segreto professionale nella testimonianza
- Art. 103 CPP -- Garanzie di liberta del difensore

> **Nota**: L'hook privacy e una tecnologia assistiva e non garantisce la conformita. Gli avvocati restano professionalmente responsabili della protezione della confidenzialita del cliente.

$ARGUMENTS
