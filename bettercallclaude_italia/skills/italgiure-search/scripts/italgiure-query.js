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
 * Uso:
 *   node italgiure-query.js build --query "responsabilita medica" \
 *        [--materia civile|penale] [--anno 2024] [--tipo sentenza|ordinanza|decreto]
 *   node italgiure-query.js format      # legge il JSON Solr da stdin
 */

'use strict';

const ITALGIURE_BASE = 'https://www.italgiure.giustizia.it/sncass';

/**
 * Costruisce il parametro `q` della query Solr.
 *
 * La semantica e' identica a buildSolrQuery() del server cassazione
 * (mcp-servers/cassazione/src/tools/italgiure-client.ts): se la query
 * contiene gia' sintassi Solr viene usata cosi', altrimenti e' trattata come
 * testo libero con prossimita' implicita.
 */
function buildSolrQuery(opts) {
  const input = opts || {};
  const raw = typeof input.query === 'string' ? input.query.trim() : '';
  if (!raw) {
    throw new Error('buildSolrQuery: la query non puo\' essere vuota');
  }

  const clauses = [];

  if (raw.startsWith('(') || raw.includes(':') || raw.includes('~') ||
      raw.includes('AND') || raw.includes('OR')) {
    clauses.push(raw);
  } else {
    const escaped = raw.replace(/([+\-!(){}[\]^"~*?:\\/])/g, '\\$1');
    clauses.push('(' + escaped + ')');
  }

  if (input.materia === 'civile') {
    clauses.push('kind:"snciv"');
  } else if (input.materia === 'penale') {
    clauses.push('kind:"snpen"');
  }

  if (input.anno && input.anno > 0) {
    clauses.push('anno:"' + input.anno + '"');
  }

  if (input.tipo) {
    const tipo = input.tipo.charAt(0).toUpperCase() + input.tipo.slice(1).toLowerCase();
    clauses.push('tipoprov:"' + tipo + '"');
  }

  return clauses.join(' AND ');
}

/**
 * Mappa la risposta Solr nella forma standard del plugin, identica a quella
 * di cassazione_search_massime.
 */
function formatResponse(payload) {
  const response = (payload && payload.response) || {};
  const docs = Array.isArray(response.docs) ? response.docs : [];
  const totale = typeof response.numFound === 'number' ? response.numFound : docs.length;

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
      throw new Error('format: lo stdin non contiene JSON valido: ' + e.message);
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
