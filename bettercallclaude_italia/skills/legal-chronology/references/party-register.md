# Registro delle Parti — Regole di Normalizzazione

Il registro delle parti mappa ogni variante di nome trovata nei documenti a un'unica parte normalizzata. Tutti gli eventi fanno riferimento solo a nomi normalizzati.

## Forma del Registro

```json
{
  "parties": [
    {
      "name": "Esempio S.r.l.",
      "aliases": ["Esempio S.r.l., Milano", "la Esempio", "la convenuta", "Esempio srl", "la società venditrice"],
      "role": "convenuta / venditrice",
      "kind": "persona-giuridica"
    },
    {
      "name": "Bianchi",
      "aliases": ["sig. Luca Bianchi", "dott. Bianchi", "l'attore", "l'acquirente"],
      "role": "attore / acquirente",
      "kind": "persona-fisica"
    }
  ]
}
```

## Regole di Normalizzazione

1. **Seed prima**: `--parties=A,B,...` inizializza il registro prima dell'estrazione; gli alias si accumulano man mano che i documenti vengono letti.
2. **Persone giuridiche**: mantieni la forma giuridica e scegli UNA forma canonica — `Esempio S.r.l.` / `Esempio S.p.A.` / `Esempio s.r.l.` si normalizzano alla forma risultante dalla visura camerale se nota. Annota la forma scelta; non mescolare le forme negli eventi.
3. **Persone fisiche**: solo `Cognome` nella forma normalizzata ("Bianchi"); i nomi completi ("Luca Bianchi") restano alias. Se due persone condividono il cognome, normalizza a "Bianchi L." / "Bianchi M." e segnala la collisione nel report.
4. **Etichette processuali**: "attore/convenuto", "ricorrente/resistente", "appellante/appellato", "opposto/opponente" sono alias della parte che designano in quell'atto — risolvili al nome normalizzato e mantieni l'etichetta come alias.
5. **Ruoli processuali italiani tipici**: attore, convenuto, terzo chiamato in causa, terzo interveniente, testimone, CTU (consulente tecnico d'ufficio), consulente di parte (CTP), curatore, ausiliario del giudice.
6. **Terzi**: giudici/tribunali, CTU, testimoni, pubbliche amministrazioni, notai NON sono parti — registrali in una lista separata `third_parties`; possono apparire nel testo dell'evento ma non in `parties`.
7. **Parte sconosciuta**: se un documento introduce un nome che non corrisponde a nulla, aggiungi una voce provvisoria con flag `provisional: true` e segnalala per conferma utente.
8. **Varianti di lingua**: normalizza attraverso le lingue ("la Esempio S.r.l.", "die Esempio GmbH", "Esempio Ltd") all'unico nome canonico — mantenendo la forma giuridica italiana se l'ente è italiano.

## Uso negli Eventi

- Campo `parties`: nomi normalizzati coinvolti nell'evento.
- Stringhe `attribution`: nomi normalizzati ("Esempio S.r.l. allega …; Bianchi contesta …").
- Testo dell'evento: nomi normalizzati; la formulazione originale resta nel documento fonte, non nell'evento.
