---
description: "Visualizza e cambia la modalita privacy del segreto professionale. Modalita: strict, balanced, cloud."
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

| Modalita | Pattern forti | Pattern deboli+contesto | Ollama |
|----------|--------------|------------------------|--------|
| strict | BLOCCATO (deny) | BLOCCATO (deny) | Sempre permesso |
|        | Contenuto non privilegiato passa (server MCP cloud usabili) | | |
| **balanced** | Conferma richiesta (ask) | Conferma richiesta (ask) | Sempre permesso |
| cloud | Conferma richiesta (ask) | Permesso senza prompt | Sempre permesso |

Pattern forti: segreto professionale, Art. 622 CP, L. 247/2012, CDF Art. 13,
vincolo di riservatezza, attorney-client privilege, ecc.

Pattern deboli: riservato, confidenziale, confidential, privato, non divulgare,
uso interno (richiedono contesto legale: cliente, tribunale, avvocato, ecc.)

Ollama (mcp__ollama__*) e sempre escluso dal controllo perche locale.

Per cambiare: /bettercallclaude-italia:privacy strict|balanced|cloud
```

### Cambia modalita (con argomento)

Quando l'utente specifica una modalita:

1. Valida che l'argomento sia `strict`, `balanced` o `cloud` (case-insensitive).
2. Se non valido, mostra errore e le opzioni disponibili.
3. Se valido, **scrivi la modalita nel file `.privacy-mode`** nella directory del progetto corrente (`$CWD/.privacy-mode`). Il file contiene solo la parola della modalita (es. `strict`). **Nota**: il file puo solo alzare la severita rispetto al default `balanced`, mai abbassarla (un file con `cloud` viene ignorato per sicurezza).
4. Conferma il cambio all'utente:

```
Modalita privacy cambiata: **[nuova modalita]**

L'hook PreToolUse usera questa modalita per le prossime chiamate tool.
```

### Raccomandazioni per modalita

Quando l'utente chiede quale modalita usare, consiglia:

- **strict** -- Per lavoro su contenuto altamente privilegiato. Le chiamate contenenti pattern privilegiati sono bloccate. Il contenuto non privilegiato passa normalmente (i server MCP cloud restano usabili per la ricerca). Ollama sempre permesso.
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
