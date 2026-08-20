# Mapping dei Termini — Tipi di Evento → Termini Legali

Due famiglie distinte: termini processuali (CPC/CPP/CPA) e prescrizione sostanziale (CC). Tienile separate in output e non confondere mai la distinzione.

**Regola fondamentale per l'ordinamento italiano**: i termini processuali coperti dal catalogo del tool MCP `legal-persona-ita_compute_deadlines` vanno calcolati **con il tool** (deterministico, zero-LLM: art. 155 c.p.c., proroga a festivi, sospensione feriale, festività nazionali e Pasqua/Pasquetta mobili) ed etichettati **indicativo — verificare** con `basis: compute_deadlines (tool)`. Per OGNI altro termine (tabella di mapping qui sotto, riti non coperti, prescrizione sostanziale) il marcatore deriva dalla tabella (data evento + termine legale) ed è SEMPRE etichettato **indicativo — verificare** con `basis: tabella-mapping (indicativo)`. Mai presentare un marcatore come autorevole: il tool stesso emette un disclaimer di computazione ausiliaria (non consulenza legale).

**Regole di computo** (applicate dal tool per i termini coperti; da applicare e dichiarare manualmente per gli altri): art. 155 CPC (il giorno iniziale — dies a quo — non si computa; il termine a giorni si proroga al primo giorno non festivo se scade di sabato o in giorno festivo), sospensione feriale dei termini processuali dal 1° al 31 agosto (L. 742/1969 e succ. mod., solo termini civili), termini a giorni liberi senza proroga (reclamo ex artt. 669-terdecies e 739 CPC, termini penali ex art. 175 c.p.p.). La verifica finale spetta alla cancelleria del giudice competente.

## A. Termini Processuali (CPC) → Tabella di Mapping (INDICATIVO)

| Evento scatenante (esempi) | Termine | Base | tipo_termine (tool) |
|---|---|---|---|
| Notifica della citazione (evento ancora) | Costituzione del convenuto: comparsa di risposta 70 giorni prima dell'udienza indicata (udienza fissata non oltre 120 giorni dall'atto; 150 se il convenuto risiede all'estero) | Art. 163, comma 3, n. 2, e art. 163-bis CPC | `cpc_comparsa_risposta_70` |
| Udienza di trattazione fissata | Memorie ex art. 183, comma 6: precisazione domande/prove 30 giorni prima; repliche 15 giorni prima; ulteriori prove eccezionali 10 giorni prima | Artt. 183-184 CPC | `cpc_deposito_183_30_60_80` (multi-scadenza), `cpc_memoria_183_15` |
| Notifica della sentenza di primo grado | Appello — termine breve: 30 giorni dalla notifica | Art. 325 CPC | `cpc_impugnazione_sentenza_30` |
| Notifica di sentenza (impugnazioni ex artt. 325/327) | Impugnazione: 60 giorni dalla notifica | Artt. 325/327 CPC | `cpc_impugnazione_sentenza_60` |
| Ricorso per cassazione (notifica sentenza di appello) | Ricorso per cassazione: 60 giorni dalla notifica (termine lungo: 6 mesi dal deposito, ex art. 327 CPC richiamato) | Art. 369 ss. CPC | `cpc_ricorso_cassazione_60` |
| Sentenza con errore di fatto / revocazione | Ricorso di revocazione: 30 giorni | Art. 395 CPC | `cpc_revocazione_30` |
| Provvedimenti reclamabili ex artt. 669-terdecies, 739 | Reclamo: 10 giorni (a giorni liberi) | Artt. 669-terdecies, 739 CPC | `cpc_reclamo_10` |
| Pubblicazione (deposito) della sentenza, senza notifica | Appello — termine lungo: 6 mesi dal deposito | Art. 327 CPC | — (manuale) |
| Notifica del decreto ingiuntivo | Opposizione: 40 giorni dalla notifica | Art. 641 CPC | — (manuale) |
| Notifica del precetto | Opposizione agli atti esecutivi / agli atti di precetto: termini variabili per tipo | Artt. 617-618 CPC | — (manuale) |
| Sentenza non definitiva / ordinanza reclamabile | Reclamo: 15 giorni dalla comunicazione/notifica | Artt. 702-ter ss. CPC | — (manuale) |

Regole:
- L'evento di ancoraggio DEVE essere un evento di tipo notifica/deposito con fonte ("notifica della sentenza del …", "deposito dell'ordinanza del …").
- Con `tipo_termine` coperto: chiama `legal-persona-ita_compute_deadlines` con `tipo_termine` + `data_inizio` (la data dell'evento ancora); usa `data.data_scadenza` (o `scadenze[]` per i tipi multi-scadenza) e riporta `basis: compute_deadlines (tool)` + il disclaimer del tool.
- Senza `tipo_termine` coperto: l'etichetta del marcatore include la base: `Appello (art. 325 CPC: 30 giorni) — tabella-mapping (indicativo)`.
- Se l'ancora è una data di pubblicazione/deposito senza notifica, usa il termine lungo e annota che la notifica potrebbe far decorrere il termine breve.
- Termini CPP coperti dal tool: appello e cassazione penali ex art. 585 c.p.p. (`cpp_appello_15_30_45`, `cpp_cassazione_15_30_45`, a giorni liberi). Termini CPA coperti: ricorso TAR 60 gg art. 29 c.p.a. / CdS 30 gg art. 41 c.p.a. (`cpa_ricorso_30_60`). Tutti gli altri riti speciali: marca `procedurale (fuori tabella — calcolo manuale necessario)`; non fabbricare un calcolo.

## B. Prescrizione Sostanziale (artt. 2934-2969 CC) → Tabella di Mapping (INDICATIVO)

| Tipo di diritto / evento | Periodo | Base |
|---|---|---|
| Diritto ordinario (regola generale) | 10 anni | Art. 2946 CC |
| Rendite perpetue/vitalizie, interessi, canoni di locazione, rate annuali | 5 anni | Art. 2948 CC |
| Responsabilità extracontrattuale (fatto illecito) | 5 anni; 2 anni se da circolazione di veicoli | Art. 2947, commi 1-2 CC |
| Diritti da contratto di assicurazione e riassicurazione | 2 anni | Art. 2947, n. 2 CC |
| Diritto degli insegnanti per retribuzione di lezioni a ore/giorni/mesi | 2 anni | Art. 2947, n. 3 CC |
| Ratei di premi di assicurazione | 1 anno | Art. 2947, n. 1 CC |
| Azione per vizi della cosa venduta | 1 anno dalla consegna (con denuncia dei vizi entro 8 giorni dalla scoperta, salvo diversa convenzione/uso) | Artt. 1495, 1490 CC |
| Azioni per difetti di opere edili (garanzia decennale) | 10 anni dal compimento (denuncia entro 1 anno dalla scoperta per i difetti gravi, 60 giorni per gli altri) | Art. 1669 CC |
| Servitù coattive, accettazione eredità con beneficio e altri casi tassativi | 20 anni | Artt. 2946, ult. comma, 1073 CC |

Regole:
- Mostra sempre: evento ancora, articolo di base, data calcolata, flag **indicativo**.
- Il dies a quo può dipendere dalla conoscibilità del danno o dall'esigibilità del diritto (art. 2935 CC) — registra cosa rappresenta l'ancora ("dalla consegna", "dalla scoperta del vizio").
- Se il fascicolo suggerisce un'interruzione (riconoscimento del debito, art. 2945 CC; domanda giudiziale, art. 2943 CC; diffida, art. 2943, ult. comma, CC) o una sospensione (art. 2941-2942 CC), annotala — NON ricalcolare silenziosamente.
- Distingui prescrizione (art. 2934 ss. CC) da decadenza (art. 2964 ss. CC): i termini di decadenza non si interrompono; annota quale delle due figure si applica.

## Forma del Marcatore in Output

```json
{
  "kind": "procedurale | prescrizione",
  "label": "Appello (art. 325 CPC: 30 giorni)",
  "due": "2024-05-15",
  "basis": "compute_deadlines (tool) | tabella-mapping (indicativo)",
  "anchored_to": "evt-0007"
}
```

Nessun marcatore fluttuante: ogni termine ancora a un id evento con fonte.
