# Scheduling `monitoraggio-normativo` — Monitoraggio Regolamentare

Il profilo `monitoraggio-normativo` e' pensato per l'invocazione schedulata (automatica). Esegue un pass di lavoro + un pass di verdetto per esecuzione, controllando tutti i temi legali sorvegliati per cambiamenti.

## Come Schedularlo

### Opzione A: Claude Scheduled Tasks (Cowork Desktop)

Usa la capacita' di scheduling integrata di Claude per eseguire il loop a intervalli definiti:

```
Schedule: Every weekday at 07:00 CET
Task: Run /bettercallclaude-italia:legale-obiettivo monitoraggio-normativo --target="bcc-output/config/temi-sorvegliati.md"
      then /bettercallclaude-italia:legale-loop <goal-id-risultante>
```

### Opzione B: Cron Esterno / Task Scheduler

Per ambienti con accesso cron (es. Claude Code CLI):

```bash
# Esempio voce crontab — lunedi'-venerdi' alle 07:00 CET
0 7 * * 1-5 claude --plugin bettercallclaude-italia \
  --command "legale-obiettivo monitoraggio-normativo --target=temi-sorvegliati.md" \
  --then "legale-loop"
```

La sintassi esatta di invocazione dipende dal runtime Claude. Il principio e':
1. Definire l'obiettivo (idempotente — puo' essere ri-eseguito in sicurezza)
2. Eseguire il loop contro quell'obiettivo

### Opzione C: Sessioni Schedulate Esterne

Se usi un agente esterno per l'automazione:
1. Crea una sessione schedulata con il prompt che include la sequenza `/legale-obiettivo monitoraggio-normativo` + `/legale-loop`.
2. Puntala al workspace del plugin BetterCallClaude Italia.
3. I risultati persistono in `bcc-output/loops/` per la revisione dell'utente.

## File dei Temi Sorvegliati

Crea un file che elenca le aree legali e le disposizioni da monitorare:

```markdown
# Temi Sorvegliati — Monitoraggio Regolamentare

## Temi

1. **GDPR / Protezione dei Dati**
   - D.Lgs. 196/2003 (Codice Privacy, come modificato dal D.Lgs. 101/2018) — emendamenti o decreti attuativi
   - Provvedimenti e sanzioni del Garante Privacy
   - Linee guida EDPB recepite in Italia

2. **AML / Antiricicgio**
   - D.Lgs. 231/2007 — variazioni di soglia o ambito
   - Circolari Banca d'Italia su AML
   - Nuove raccomandazioni FATF recepite nel diritto italiano

3. **Diritto del Lavoro**
   - Modifiche agli artt. 2094-2140 CC
   - Nuove pronunce Cassazione su lavoro agile / smart working
   - Rinnovi CCNL nei settori sorvegliati

4. **Governance Societaria**
   - Seguito alla riforma del capitale (D.Lgs. 25/2023 e successive)
   - Circolari CONSOB su governance societaria
   - Requisiti di rendicontazione ESG (CSRD, recepimento italiano)
```

Posiziona questo file in `bcc-output/config/temi-sorvegliati.md` o in qualsiasi percorso specificato via `--target`.

## Comportamento per Esecuzione

Ogni esecuzione schedulata:
1. **Worker** interroga Normattiva (`normattiva_search`, `normattiva_search_advanced`) e Cassazione (`cassazione_search_massime`) per ogni tema; per fonti regionali usa i Bollettini Ufficiali via `normattiva_search` e per il diritto UE `eur-lex-ita_search`
2. **Evaluator** verifica che tutti i temi siano stati controllati e assegna rilevanza (materiale / non materiale)
3. **Output** persiste in `bcc-output/loops/<goal-id>/` con un report datato
4. Solo i **cambiamenti materiali** compaiono nel riassunto; i check non materiali vengono loggati ma non segnalati

## Revisione dei Risultati

Dopo ogni esecuzione, l'utente trova:
- `summary.md` — temi controllati, cambiamenti materiali emersi, MET/NOT MET complessivo
- `final/report-monitoraggio.md` — il report delle modifiche regolamentari (solo voci materiali)
- `iteration-1.md` — il verdetto di completezza dell'evaluator

Se NOT MET (es. una fonte dati era irraggiungibile), il summary indica chiaramente quali temi non hanno potuto essere controllati e perche'.
