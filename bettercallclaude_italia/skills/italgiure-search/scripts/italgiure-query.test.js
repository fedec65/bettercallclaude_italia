#!/usr/bin/env node
/**
 * Test di italgiure-query.js -- costruzione query Solr e mappatura risposta.
 *   node bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.test.js
 */

'use strict';

const assert = require('node:assert');
const { buildSolrQuery, formatResponse } = require('./italgiure-query.js');

let passed = 0;
let failed = 0;

function t(name, fn) {
  try {
    fn();
    console.log('  ok  ' + name);
    passed++;
  } catch (e) {
    console.error('  FAIL ' + name);
    console.error('       ' + (e && e.message ? e.message : e));
    failed++;
  }
}

console.log('buildSolrQuery');

t('testo libero in parentesi', () => {
  assert.strictEqual(buildSolrQuery({ query: 'responsabilita medica' }), '(responsabilita medica)');
});

t('escape dei caratteri speciali Solr', () => {
  const q = buildSolrQuery({ query: 'test (special) [chars]' });
  assert.ok(q.includes('\\('), 'deve escapare la parentesi aperta, got: ' + q);
  assert.ok(q.includes('\\)'), 'deve escapare la parentesi chiusa, got: ' + q);
});

t('usa la query grezza quando contiene sintassi Solr', () => {
  const q = buildSolrQuery({ query: '(foo AND bar) OR baz:qux~7' });
  assert.strictEqual(q, '(foo AND bar) OR baz:qux~7');
});

t('filtro materia civile', () => {
  assert.strictEqual(buildSolrQuery({ query: 'danno', materia: 'civile' }), '(danno) AND kind:"snciv"');
});

t('filtro materia penale', () => {
  assert.strictEqual(buildSolrQuery({ query: 'omicidio', materia: 'penale' }), '(omicidio) AND kind:"snpen"');
});

t('filtro anno', () => {
  assert.strictEqual(buildSolrQuery({ query: 'furto', anno: 2023 }), '(furto) AND anno:"2023"');
});

t('filtro tipo con iniziale maiuscola', () => {
  assert.strictEqual(buildSolrQuery({ query: 'danno', tipo: 'sentenza' }), '(danno) AND tipoprov:"Sentenza"');
});

t('tutti i filtri insieme', () => {
  const q = buildSolrQuery({ query: 'danno', materia: 'civile', anno: 2024, tipo: 'ordinanza' });
  assert.strictEqual(q, '(danno) AND kind:"snciv" AND anno:"2024" AND tipoprov:"Ordinanza"');
});

t('rifiuta una query vuota', () => {
  assert.throws(() => buildSolrQuery({ query: '   ' }), /query/i);
});

console.log('formatResponse');

const SOLR_PAYLOAD = {
  response: {
    numFound: 2,
    start: 0,
    docs: [
      {
        id: 'snciv2025332127S',
        filename: ['./snciv/snciv2025332127S.txt'],
        szdec: 'III',
        tipoprov: 'Sentenza',
        datdec: '2025-06-12',
        numdec: '17006',
        anno: '2025',
        kind: 'snciv',
        datdep: ['2025-09-01'],
      },
      {
        id: 'snciv2025332128S',
        filename: [],
        szdec: 'I',
        tipoprov: 'Sentenza',
        datdec: '2025-07-01',
        numdec: '17007',
        anno: '2025',
        kind: 'snciv',
      },
    ],
  },
};

t('mappa il totale', () => {
  assert.strictEqual(formatResponse(SOLR_PAYLOAD).totale, 2);
});

t('mappa gli estremi', () => {
  const m = formatResponse(SOLR_PAYLOAD).massime[0];
  assert.strictEqual(m.estremi, 'Sez. III Sentenza n. 17006 del 2025');
  assert.strictEqual(m.sezione, 'III');
  assert.strictEqual(m.tipo, 'Sentenza');
  assert.strictEqual(m.dataDecisione, '2025-06-12');
  assert.strictEqual(m.dataDeposito, '2025-09-01');
  assert.strictEqual(m.id, 'snciv2025332127S');
});

t('costruisce il link al PDF', () => {
  const m = formatResponse(SOLR_PAYLOAD).massime[0];
  assert.strictEqual(
    m.urlPdf,
    'https://www.italgiure.giustizia.it/sncass/snciv/snciv2025332127S.txt'
  );
});

t('un documento senza filename non ha urlPdf', () => {
  const m = formatResponse(SOLR_PAYLOAD).massime[1];
  assert.strictEqual(m.urlPdf, undefined);
});

t('usa l\'id come estremi quando mancano i campi', () => {
  const out = formatResponse({
    response: { numFound: 1, start: 0, docs: [{ id: 'xyz' }] },
  });
  assert.strictEqual(out.massime[0].estremi, 'xyz');
});

t('una risposta vuota non fallisce', () => {
  const out = formatResponse({ response: { numFound: 0, start: 0, docs: [] } });
  assert.strictEqual(out.totale, 0);
  assert.deepStrictEqual(out.massime, []);
});

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
