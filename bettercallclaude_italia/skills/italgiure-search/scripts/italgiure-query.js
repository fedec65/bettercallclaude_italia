#!/usr/bin/env node
/**
 * Costruzione della query Solr di ItalGiure e mappatura della risposta.
 *
 * Puro di proposito: questo script NON fa richieste di rete. La gamba di rete
 * e' `curl`, eseguita dalla skill, perche' l'hook privacy del plugin
 * (NETWORK_COMMANDS in scripts/privacy-check.js) intercetta curl/wget/nc ma
 * non un `node script.js` che fa HTTP da se'. Se questo script facesse rete,
 * la chiamata uscirebbe dal perimetro di controllo del segreto professionale.
 *
 * Divergenza dal server `cassazione`: qui il client è PIÙ preciso del
 * server. Il server non può osservare la semantica del proprio
 * buildSolrQuery (dall'infrastruttura di datacenter italgiure.giustizia.it la
 * fonte scarta la connessione), quindi la sua ricerca per estremi non è mai
 * stata verificabile: qui la ricerca per estremi è implementata con clausole
 * fielded `numdec`/`anno`, ed è il canale che funziona.
 *
 * Uso:
 *   node italgiure-query.js build --query "responsabilita medica" \
 *        [--materia civile|penale] [--anno 2024] [--tipo sentenza|ordinanza|decreto]
 *   node italgiure-query.js format      # legge il JSON Solr da stdin
 */

'use strict';

const ITALGIURE_BASE = 'https://www.italgiure.giustizia.it/sncass';

// Valori ammessi dai filtri: un valore fuori elenco deve fallire, non
// allargare la ricerca in silenzio.
const MATERIA_VALUES = ['civile', 'penale'];
const TIPO_VALUES = ['sentenza', 'ordinanza', 'decreto'];

// Forma di citazione: numero della decisione e anno.
//   "Cass. n. 577/2008", "n. 577 del 2008"
// Il marcatore "n." è obbligatorio in questa forma: senza, "L. 241/1990"
// (una legge) verrebbe letta come numero di decisione.
const CITATION_RE = /\bn(?:\.|°)?\s*(\d{1,6})\s*(?:\/|del|dell['’])\s*(\d{4})\b/i;
// Forma abbreviata: il solo numero e l'anno, senza altro testo.
const BARE_CITATION_RE = /^\s*(\d{1,6})\s*\/\s*(\d{4})\s*$/;

/** Un oggetto JSON (non un array, non null). */
function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Riconosce un input in forma di citazione (numero e anno).
 * Restituisce null se l'input non è una citazione: in quel caso resta testo
 * libero.
 */
function parseCitation(raw) {
  const m = CITATION_RE.exec(raw) || BARE_CITATION_RE.exec(raw);
  if (!m) return null;
  return { numero: m[1], anno: m[2] };
}

/**
 * Costruisce il parametro `q` della query Solr.
 *
 * Se la query contiene già sintassi Solr viene usata così. Altrimenti:
 * un input in forma di citazione ("Cass. n. 577/2008") diventa una ricerca
 * per estremi con clausole fielded `numdec`/`anno`; tutto il resto è testo
 * libero con prossimita' implicita.
 *
 * `materia` e `tipo` sono validati contro i rispettivi elenchi: un valore
 * sconosciuto fa fallire la costruzione invece di produrre una ricerca
 * piu' larga del richiesto. Se il filtro e' assente non viene emessa alcuna
 * clausola.
 */
function buildSolrQuery(opts) {
  const input = opts || {};
  const raw = typeof input.query === 'string' ? input.query.trim() : '';
  if (!raw) {
    throw new Error('buildSolrQuery: la query non puo\' essere vuota');
  }

  const clauses = [];

  const sintassiSolr =
    raw.startsWith('(') || raw.includes(':') || raw.includes('~') ||
    raw.includes('AND') || raw.includes('OR');
  // La sintassi Solr ha la precedenza: se il testo è già una query, la
  // riconoscimento della citazione non deve toccarla.
  const citazione = sintassiSolr ? null : parseCitation(raw);

  if (sintassiSolr) {
    clauses.push(raw);
  } else if (citazione) {
    clauses.push('numdec:"' + citazione.numero + '"');
    clauses.push('anno:"' + citazione.anno + '"');
  } else {
    const escaped = raw.replace(/([+\-!(){}[\]^"~*?:\\/])/g, '\\$1');
    clauses.push('(' + escaped + ')');
  }

  if (input.materia) {
    if (MATERIA_VALUES.indexOf(input.materia) === -1) {
      throw new Error(
        'buildSolrQuery: materia non valida "' + input.materia +
        '" (valori ammessi: ' + MATERIA_VALUES.join(', ') + ')'
      );
    }
    clauses.push('kind:"' + (input.materia === 'civile' ? 'snciv' : 'snpen') + '"');
  }

  if (input.anno && input.anno > 0) {
    if (citazione) {
      if (String(input.anno) !== citazione.anno) {
        throw new Error(
          'buildSolrQuery: il filtro --anno ' + input.anno +
          ' e\' in conflitto con l\'anno ' + citazione.anno + ' della citazione'
        );
      }
      // L\'anno è già nella clausola della citazione: non duplicarlo.
    } else {
      clauses.push('anno:"' + input.anno + '"');
    }
  }

  if (input.tipo) {
    const tipoMin = String(input.tipo).toLowerCase();
    if (TIPO_VALUES.indexOf(tipoMin) === -1) {
      throw new Error(
        'buildSolrQuery: tipo non valido "' + input.tipo +
        '" (valori ammessi: ' + TIPO_VALUES.join(', ') + ')'
      );
    }
    const tipo = tipoMin.charAt(0).toUpperCase() + tipoMin.slice(1);
    clauses.push('tipoprov:"' + tipo + '"');
  }

  return clauses.join(' AND ');
}

/**
 * Mappa la risposta Solr nella forma standard del plugin, identica a quella
 * di cassazione_search_massime.
 *
 * Fallisce esplicitamente quando il payload non e' una risposta Solr valida:
 * `response` deve essere un oggetto, `response.docs` un array e
 * `response.numFound` un numero. Un errore di trasporto o un corpo non JSON
 * non è una ricerca senza risultati: restituire `totale: 0` farebbe credere
 * all'avvocato che quei precedenti non esistano.
 */
function formatResponse(payload) {
  if (!isPlainObject(payload)) {
    throw new Error(invalidPayloadMessage(payload, 'il payload non è un oggetto JSON'));
  }

  const response = payload.response;
  if (!isPlainObject(response)) {
    throw new Error(invalidPayloadMessage(payload, 'manca l\'oggetto "response"'));
  }
  if (!Array.isArray(response.docs)) {
    throw new Error(invalidPayloadMessage(payload, '"response.docs" non è un array'));
  }
  if (typeof response.numFound !== 'number' || !Number.isFinite(response.numFound)) {
    throw new Error(invalidPayloadMessage(payload, '"response.numFound" non è un numero'));
  }

  const docs = response.docs;
  const totale = response.numFound;

  const massime = docs.map(function (doc) {
    const d = doc || {};
    const estremi =
      d.numdec && d.anno && d.szdec
        ? 'Sez. ' + d.szdec + ' ' + (d.tipoprov || 'Provvedimento') + ' n. ' + d.numdec + ' del ' + d.anno
        : String(d.id || '');

    let urlPdf;
    if (Array.isArray(d.filename) && d.filename.length && d.filename[0]) {
      const clean = String(d.filename[0]).replace(/^\.\//, '');
      urlPdf = ITALGIURE_BASE + '/' + clean;
    }

    const out = {
      id: String(d.id || ''),
      estremi: estremi,
      sezione: d.szdec || '',
      tipo: d.tipoprov || '',
      dataDecisione: d.datdec || '',
    };

    if (Array.isArray(d.datdep) && d.datdep.length) {
      out.dataDeposito = d.datdep[0];
    }
    if (urlPdf) {
      out.urlPdf = urlPdf;
    }

    return out;
  });

  return { totale: totale, massime: massime };
}

/**
 * Messaggio di errore per un payload che non e' una risposta Solr valida.
 * Include il campo `error` del payload, quando c'è: è l'unica indicazione
 * utile su cosa abbia risposto il server.
 */
function invalidPayloadMessage(payload, dettaglio) {
  let errore;
  if (isPlainObject(payload)) {
    if (payload.error !== undefined) {
      errore = payload.error;
    } else if (isPlainObject(payload.response) && payload.response.error !== undefined) {
      errore = payload.response.error;
    }
  }
  const dettaglioErrore = errore === undefined
    ? ''
    : ' (campo "error" del payload: ' + JSON.stringify(errore) + ')';
  return 'formatResponse: risposta Solr non valida — la ricerca è FALLITA, non vuota (' +
    dettaglio + ')' + dettaglioErrore;
}

/**
 * Parsing degli argomenti della CLI.
 * build: --query (obbligatorio), --materia, --anno, --tipo
 */
function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--query') out.query = argv[++i];
    else if (a === '--materia') out.materia = argv[++i];
    else if (a === '--anno') out.anno = Number(argv[++i]);
    else if (a === '--tipo') out.tipo = argv[++i];
  }
  return out;
}

function readStdin() {
  return new Promise(function (resolve, reject) {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', function (chunk) { data += chunk; });
    process.stdin.on('end', function () { resolve(data); });
    process.stdin.on('error', reject);
  });
}

async function main() {
  const mode = process.argv[2];

  if (mode === 'build') {
    const q = buildSolrQuery(parseArgs(process.argv.slice(3)));
    process.stdout.write(q + '\n');
    return;
  }

  if (mode === 'format') {
    const raw = await readStdin();
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (e) {
      throw new Error('format: lo stdin non contiene JSON valido — la ricerca è FALLITA, non vuota: ' + e.message);
    }
    process.stdout.write(JSON.stringify(formatResponse(payload), null, 2) + '\n');
    return;
  }

  throw new Error('uso: italgiure-query.js build [--query Q] [--materia M] [--anno A] [--tipo T] | format');
}

if (require.main === module) {
  main().catch(function (err) {
    console.error('[' + (err && err.message ? err.message : err) + ']');
    process.exit(1);
  });
}

module.exports = {
  buildSolrQuery: buildSolrQuery,
  formatResponse: formatResponse,
  parseArgs: parseArgs,
  ITALGIURE_BASE: ITALGIURE_BASE,
};
