[![Version](https://img.shields.io/badge/version-2.2.0-blue)](https://github.com/fedec65/bettercallclaude_italia/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-green)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Cowork%20Desktop-orange)](https://claude.ai)
[![Buy Me a Coffee](https://img.shields.io/badge/support-Buy%20Me%20a%20Coffee-yellow)](https://buymeacoffee.com/federicocesconi)

<p align="center">
  <img src="bettercallclaude_italia/docs/images/logo.png" alt="Meglio Chiamare Claude" width="400">
</p>

<p align="center"><strong>Marketplace — BetterCallClaude Italia</strong></p>

Marketplace per l'installazione del plugin **BetterCallClaude Italia** su Cowork Desktop.

Il plugin offre intelligenza legale italiana — ricerca sui precedenti della Cassazione, strategia di causa, redazione legale, verifica delle citazioni e flussi di lavoro personalizzati in tutte le 20 regioni italiane, con protezione integrata del segreto professionale (Art. 622 CP + L. 247/2012).

**21 agenti · 30 comandi · 17 skill · 9 server MCP**

---

## Novità della v2.2.0

- **Flussi di lavoro personalizzati** — `/crea-flusso` progetta via intervista una pipeline riutilizzabile combinando gli agenti del plugin; `/flusso` elenca ed esegue anche i tuoi flussi salvati accanto ai template predefiniti.
- **Nuovo server MCP `workflows-ita`** (9° server) — salvataggio ed esecuzione dei flussi personalizzati; se non raggiungibile, il plugin degrada con grazia omettendo i flussi salvati.
- **User ID personale** — ogni utente ha un namespace univoco per i propri flussi (`userConfig.user_id`), senza fallback condivisi.

---

## Installazione

1. In Cowork, clicca **Personalizza** > **Sfoglia plugin** > **Personali** > **+** > **Aggiungi marketplace da GitHub**
2. Inserisci `fedec65/bettercallclaude_italia` e clicca **Sincronizza**
3. Clicca **Installa** sulla scheda BetterCallClaude Italia

I server MCP si connettono automaticamente via HTTP. Nessuna configurazione manuale richiesta per i server remoti.

> **[QUI L'INSTALLAZIONE PASSO PER PASSO](bettercallclaude_italia/docs/INSTALLAZIONE.md)** -- Guida illustrata con screenshot per ogni passaggio.

---

## Documentazione

📖 [README completo del plugin](bettercallclaude_italia/README.md)

🔐 [Come accedere al server della Cassazione?](bettercallclaude_italia/docs/cassazione-cookie.md)

---

## Licenza

[AGPL-3.0](LICENSE)

[Supporta il progetto](https://buymeacoffee.com/federicocesconi)
