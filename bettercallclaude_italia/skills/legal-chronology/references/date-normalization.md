# Normalizzazione Date — IT / DE / FR / EN → ISO

Regole per normalizzare le date trovate nei documenti della causa in ISO `YYYY-MM-DD` con un livello di precisione. La normalizzazione è deterministica: mai indovinare componenti mancanti. I formati italiani sono il caso principale; gli altri servono per documenti stranieri nel fascicolo.

## Livelli di Precisione

| Esempio di input | `date` | `precision` | Visualizzazione (IT) |
|---|---|---|---|
| "3 marzo 2024" | `2024-03-03` | `day` | 3.3.2024 |
| "marzo 2024" | `2024-03-01` | `month` | marzo 2024 |
| "nell'anno 2024" | `2024-01-01` | `year` | 2024 |
| fatto senza data | — | `unknown` | senza data |

La data al primo del periodo esiste solo per l'ordinamento; il rendering DEVE rispettare `precision` e non mostrare mai un giorno finto ("1.3.2024" per una fonte che dice solo "marzo").

## Nomi dei Mesi

| # | IT | DE | FR | EN |
|---|---|---|---|---|
| 01 | gennaio | Januar, Jan. | janvier | January |
| 02 | febbraio | Februar, Feb. | février | February |
| 03 | marzo | März | mars | March |
| 04 | aprile | April | avril | April |
| 05 | maggio | Mai | mai | May |
| 06 | giugno | Juni | juin | June |
| 07 | luglio | Juli | juillet | July |
| 08 | agosto | August | août | August |
| 09 | settembre | September | septembre | September |
| 10 | ottobre | Oktober | octobre | October |
| 11 | novembre | November | novembre | November |
| 12 | dicembre | Dezember | décembre | December |

## Pattern

- **IT** (caso principale): `3 marzo 2024`, `il 3 marzo 2024`, `li 3.3.2024` (atti notarili), `3.3.2024`, `03/03/2024` → precisione giorno. Il formato numerico italiano è SEMPRE `giorno/mese/anno` — `3/4/2024` è il 3 aprile, mai il 4 marzo.
- **DE**: `3. März 2024`, `3.3.2024`, `03.03.24` → precisione giorno (sempre `giorno.mese.anno`).
- **FR**: `le 3 mars 2024`, `3 mars 2024`, `03.03.2024`, `3/3/2024` → precisione giorno (ignora gli articoli "le/du").
- **EN**: `3 March 2024`, `March 3, 2024` → precisione giorno. Il numerico inglese `03/04/2024` è ambiguo: default alla convenzione giorno-prima e annota l'ambiguità nel `note` dell'evento.
- **Anni a due cifre**: `24` → 2024 quando il contesto del documento è post-2000; se la causa attraversa 1900/2000, risolvi dal contesto e segnala bassa confidenza.
- **Date relative** ("entro 10 giorni dalla consegna", "decorsi 30 giorni dalla notifica"): NON calcolare silenziosamente. Registra l'id dell'evento ancora in `note`; calcola solo se la data ancora è nota, e marca la `precision` dell'ancora.
- **Data del documento vs data del fatto**: una lettera del 5.4.2024 che descrive una consegna del 3.3.2024 produce DUE eventi (consegna 3.3; lettera 5.4), ciascuno con la propria fonte.
- **Intervalli** ("tra marzo e aprile 2024"): registra la più antica come `date` con `precision: month` e annota l'intervallo in `note`.

## Formati di Visualizzazione (livello render)

| Lingua | Formato |
|---|---|
| IT | `3.3.2024` |
| DE | `3.3.2024` |
| FR | `3.3.2024` (o `3 mars 2024` nei titoli in prosa) |
| EN | `2024-03-03` |

Il livello dati è sempre ISO; la conversione di visualizzazione avviene solo al render.
