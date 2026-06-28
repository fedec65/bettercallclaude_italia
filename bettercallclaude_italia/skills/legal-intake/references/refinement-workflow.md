# Mapping Query Affinata → Workflow

Dopo l'affinamento della query, raccomanda il workflow ottimale in base al tipo di questione:

| Tipo Questione | Comando Raccomandato | Quando |
|---------------|---------------------|--------|
| Ricerca legislativa / precedenti | `/ricerca` | Domanda su cosa dice la legge |
| Strategia processuale | `/strategia` | Valutazione rischio, probabilita |
| Redazione documento | `/redazione` | Contratto, atto, parere |
| Analisi documento esistente | `/analisi-doc` | Review contratto, verifica atto |
| Triage NDA | `/triage-nda` | NDA da classificare |
| Questione complessa end-to-end | `/legale-5step` | Pipeline completa necessaria |
| Multi-dominio con piano | `/briefing` | ≥ 3 domini, piano esecuzione |
| Traduzione giuridica | `/traduci` | IT ↔ EN con precisione terminologica |
| Analisi avversariale | `/contraddittorio` | Stress test argomentazione |
| Catena precedenti | `/precedente` | Evoluzione giurisprudenziale |

## Segnali per Pipeline Completa (legale-5step)

Raccomanda `/legale-5step` quando:
- La questione richiede sia ricerca che strategia che redazione
- L'utente chiede un "parere completo" o "analisi da zero a documento"
- Sono necessari quality gates tra le fasi
- L'utente vuole tracciabilita completa delle fonti
