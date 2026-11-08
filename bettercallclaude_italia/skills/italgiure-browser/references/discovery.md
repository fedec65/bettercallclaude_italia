# Discovery dei campi dell'area riservata

La nuova interfaccia ItalGiure non e' stata documentata: non sappiamo come si
chiamano i campi della maschera di ricerca ne' come sono organizzati i
risultati. Questa procedura serve a stabilirlo **una volta**, con l'utente
presente, e a fissare il risultato in questo file.

## Quando eseguila

Al **primo uso** della skill, o quando la ricerca per estremi fallisce e il
mapping sembra cambiato.

## Procedura

1. Apri l'area riservata e arriva alla pagina del massimario civile.
2. Fai uno snapshot della pagina (`take_snapshot` del connettore browser, o
   equivalente).
3. Identifica e annota:
   - il campo di ricerca per parole (input di testo) e il suo nome;
   - il campo per la sezione, se presente;
   - il campo per il numero e per l'anno, se presenti;
   - il pulsante di invio;
   - la struttura di una riga di risultato: dove compaiono estremi, data,
     tipo di provvedimento, eventuale numero di massima.
4. **Conferma con l'utente**: mostragli la mappatura e chiedi se i campi
   identificati sono quelli giusti. Non proseguire con una mappatura indovinata.
5. Aggiorna la tabella qui sotto e committa.

## Mappatura corrente

Da compilare alla prima esecuzione.

| Elemento | Selettore / nome osservato | Note |
|---|---|---|
| Campo parole | _da compilare_ | |
| Campo sezione | _da compilare_ | |
| Campo numero | _da compilare_ | |
| Campo anno | _da compilare_ | |
| Pulsante invio | _da compilare_ | |
| Riga risultato | _da compilare_ | |

## Cosa e' gia' noto

- La ricerca **per parole** funziona.
- La ricerca **per estremi** non e' confermata: e' il motivo per cui esiste
  questa procedura.
- Le richieste dati dell'area riservata stanno su percorsi `/api`; i cookie di
  sessione sono HttpOnly e non si leggono dalla Console. La richiesta porta
  anche un header di autorizzazione di tipo Basic, che **non** va mai riprodotto
  dal plugin.
