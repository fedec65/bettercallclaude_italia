# Schema Evento — legal-chronology

Schema JSON canonico per gli eventi della cronologia. Il renderer (`scripts/timeline-render.mjs validate`) fa rispettare le parti obbligatorie.

## Schema

```json
{
  "id": "evt-0001",
  "date": "2024-03-03",
  "precision": "day | month | year | unknown",
  "event": "Descrizione fattuale neutra in una frase.",
  "source": [
    {"doc": "01-contratto", "locus": "p. 2, art. 4.1"}
  ],
  "status": "undisputed | alleged | contested",
  "attribution": "La parte A allega X; la parte B contesta / tace. (obbligatoria se non undisputed)",
  "parties": ["Esempio S.r.l.", "Bianchi"],
  "conflicts": [
    {"date": "2024-03-03", "source": {"doc": "01-contratto", "locus": "art. 4.1"}},
    {"date": "2024-03-10", "source": {"doc": "02-lettera", "locus": "p. 1, par. 2"}, "note": "consegna datata diversamente"}
  ],
  "deadline_markers": [
    {"kind": "procedurale | prescrizione", "label": "Appello (art. 325 CPC: 30 giorni)", "due": "2024-05-15", "basis": "tabella-mapping (indicativo)", "anchored_to": "evt-0007"}
  ],
  "tags": ["contratto", "consegna", "notifica"]
}
```

## Regole dei Campi

- `id`: stabile `evt-NNNN`, assegnato al momento della fusione; mai riusato dopo un'eliminazione.
- `date`: ISO `YYYY-MM-DD`. Per `precision: month` usa il primo del mese in `date` e mantieni `precision: month` (la visualizzazione rende "marzo 2024"). Per `precision: year`, analogamente con il 1° gennaio. `precision: unknown` è ammessa SOLO per i candidati — il renderer esclude gli eventi senza data dal corpo della cronologia e li elenca sotto "Fatti documentati senza data".
- `event`: una frase, neutra. Niente argomentazioni, niente qualificazioni giuridiche ("presumibilmente" va in `attribution`, non in `event`).
- `source`: **obbligatoria, non vuota**. Ogni voce: `doc` (id documento dall'inventario) + `locus` (pagina/paragrafo/sezione, il più preciso possibile). Più voci per attestazioni multilingua/multi-documento dello stesso evento.
- `status` (valori enum in inglese, etichette italiane in visualizzazione):
  - `undisputed` — **non contestato**: tutte le fonti concordano; nessuna negazione registrata.
  - `alleged` — **allegato**: una parte afferma; l'altra tace. `attribution` obbligatoria.
  - `contested` — **contestato**: affermato e negato. `attribution` obbligatoria ("A allega …; B contesta …").
- `conflicts`: presente quando le fonti datano diversamente lo stesso evento. Contiene OGNI variante datata con la sua fonte. Il campo `date` contiene la variante più antica per l'ordinamento; il flag di conflitto governa il rendering di tutte le varianti.
- `deadline_markers.kind`: `procedurale` o `prescrizione` — in entrambi i casi sempre da tabella di mapping, sempre `basis: "tabella-mapping (indicativo)"`. Non esiste una base di calcolo automatico nell'ordinamento italiano.
- `tags`: libere, usate per il filtraggio HTML.

## Esempio Valido

```json
{
  "id": "evt-0003",
  "date": "2024-03-03",
  "precision": "day",
  "event": "Consegna del macchinario presso lo stabilimento dell'acquirente.",
  "source": [
    {"doc": "01-contratto", "locus": "art. 4.1"},
    {"doc": "02-lettera", "locus": "p. 1, par. 2"}
  ],
  "status": "contested",
  "attribution": "Esempio S.r.l. allega la consegna del 3.3.2024; Bianchi contesta la corretta consegna.",
  "parties": ["Esempio S.r.l.", "Bianchi"],
  "conflicts": [
    {"date": "2024-03-03", "source": {"doc": "01-contratto", "locus": "art. 4.1"}},
    {"date": "2024-03-10", "source": {"doc": "02-lettera", "locus": "p. 1, par. 2"}}
  ],
  "tags": ["consegna"]
}
```

## Esempio Non Valido (rifiutato da validate)

```json
{
  "id": "evt-0009",
  "date": "2024-05-01",
  "precision": "day",
  "event": "Il difetto è stato segnalato telefonicamente.",
  "source": [],
  "status": "alleged",
  "parties": ["Bianchi"]
}
```

Rifiutato: `source` vuota. Nessun evento senza provenienza — mai. Se un fatto non può essere legato a un locus documentale, non entra nella cronologia.
