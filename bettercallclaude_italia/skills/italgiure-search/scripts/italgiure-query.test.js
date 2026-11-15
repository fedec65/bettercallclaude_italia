#!/usr/bin/env node
/**
 * Test di italgiure-query.js -- costruzione query Solr e mappatura risposta.
 *   node bettercallclaude_italia/skills/italgiure-search/scripts/italgiure-query.test.js
 */

'use strict';

const assert = require('node:assert');
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { buildSolrQuery, formatResponse, parseArgs } = require('./italgiure-query.js');

const SCRIPT = path.join(__dirname, 'italgiure-query.js');

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

// La classe di escape e' /([+\-!(){}[\]^"~*?:\\/])/: 17 caratteri. ':' e '~'
// fanno pero' scattare prima il riconoscimento della sintassi Solr (la query
// grezza ha la precedenza, come sul server), quindi per loro si verifica che
// la query passi invariata invece di essere escapata.
const CARATTERI_ESCAPATI = ['+', '-', '!', '(', ')', '{', '}', '[', ']', '^', '"', '~', '*', '?', ':', '\\', '/'];
const CARATTERI_RAMO_GREZZO = [':', '~'];

t('escape di ogni carattere della classe speciale', () => {
  for (const c of CARATTERI_ESCAPATI) {
    const q = buildSolrQuery({ query: 'x' + c + 'y' });
    if (CARATTERI_RAMO_GREZZO.indexOf(c) !== -1) {
      assert.strictEqual(q, 'x' + c + 'y', 'la query con sintassi Solr deve passare invariata: ' + q);
      continue;
    }
    assert.strictEqual(q, '(x\\' + c + 'y)', 'carattere non escapato: ' + c + ' -> ' + q);
  }
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

console.log('ricerca per estremi (citazione)');

t('la citazione con numero e anno diventa una query per estremi', () => {
  assert.strictEqual(
    buildSolrQuery({ query: 'Cass. n. 577/2008' }),
    'numdec:"577" AND anno:"2008"'
  );
});

t('la citazione nella forma «n. numero del anno» diventa una query per estremi', () => {
  assert.strictEqual(
    buildSolrQuery({ query: 'n. 577 del 2008' }),
    'numdec:"577" AND anno:"2008"'
  );
});

t('la citazione nella forma «n° numero/anno» diventa una query per estremi', () => {
  assert.strictEqual(
    buildSolrQuery({ query: 'Cass. n° 577/2008' }),
    'numdec:"577" AND anno:"2008"'
  );
});

t('la citazione senza prefisso diventa una query per estremi', () => {
  assert.strictEqual(
    buildSolrQuery({ query: '577/2008' }),
    'numdec:"577" AND anno:"2008"'
  );
});

t('la forma breve con due cifre resta testo libero (è una data)', () => {
  assert.strictEqual(buildSolrQuery({ query: '10/2024' }), '(10\\/2024)');
});

t('una citazione di decreto legislativo resta testo libero', () => {
  assert.strictEqual(
    buildSolrQuery({ query: 'D.Lgs. n. 165/2001' }),
    '(D.Lgs. n. 165\\/2001)'
  );
});

t('una legge citata per numero resta testo libero', () => {
  assert.strictEqual(
    buildSolrQuery({ query: 'legge n. 241/1990' }),
    '(legge n. 241\\/1990)'
  );
});

t('un testo libero che contiene una citazione resta testo libero', () => {
  assert.strictEqual(
    buildSolrQuery({ query: 'sentenza n. 123/2020 sul danno' }),
    '(sentenza n. 123\\/2020 sul danno)'
  );
});

t('la citazione delle sezioni unite resta una query per estremi', () => {
  assert.strictEqual(
    buildSolrQuery({ query: 'Cass. SS.UU. n. 20874/2008' }),
    'numdec:"20874" AND anno:"2008"'
  );
});

t('i filtri si applicano anche alla query per estremi', () => {
  assert.strictEqual(
    buildSolrQuery({ query: 'Cass. n. 577/2008', materia: 'civile' }),
    'numdec:"577" AND anno:"2008" AND kind:"snciv"'
  );
});

t('un anno senza numero resta testo libero', () => {
  assert.strictEqual(
    buildSolrQuery({ query: 'sentenza del 2008' }),
    '(sentenza del 2008)'
  );
});

t('una query già in sintassi Solr resta invariata', () => {
  const q = 'numdec:"577" AND anno:"2008"';
  assert.strictEqual(buildSolrQuery({ query: q }), q);
});

t('una legge non viene scambiata per un numero di decisione', () => {
  assert.strictEqual(buildSolrQuery({ query: 'L. 241/1990' }), '(L. 241\\/1990)');
});

t('il filtro --anno in conflitto con la citazione fallisce', () => {
  assert.throws(
    () => buildSolrQuery({ query: 'Cass. n. 577/2008', anno: 2024 }),
    /anno/i
  );
});

t('il filtro --anno coerente con la citazione non duplica la clausola', () => {
  assert.strictEqual(
    buildSolrQuery({ query: 'Cass. n. 577/2008', anno: 2008 }),
    'numdec:"577" AND anno:"2008"'
  );
});

console.log('validazione degli enum');

t('rifiuta una materia sconosciuta', () => {
  assert.throws(() => buildSolrQuery({ query: 'danno', materia: 'civileX' }), /materia/i);
  assert.throws(() => buildSolrQuery({ query: 'danno', materia: 'commerciale' }), /civile, penale/);
});

t('rifiuta un tipo sconosciuto', () => {
  assert.throws(() => buildSolrQuery({ query: 'danno', tipo: 'sentenzaX' }), /tipo/i);
  assert.throws(() => buildSolrQuery({ query: 'danno', tipo: 'massima' }), /sentenza, ordinanza, decreto/);
});

t('i valori validi di materia e tipo funzionano', () => {
  assert.strictEqual(buildSolrQuery({ query: 'danno', materia: 'civile' }), '(danno) AND kind:"snciv"');
  assert.strictEqual(buildSolrQuery({ query: 'danno', materia: 'penale' }), '(danno) AND kind:"snpen"');
  assert.strictEqual(buildSolrQuery({ query: 'danno', tipo: 'decreto' }), '(danno) AND tipoprov:"Decreto"');
});

t('materia e tipo assenti non emettono alcuna clausola', () => {
  assert.strictEqual(buildSolrQuery({ query: 'danno' }), '(danno)');
  assert.strictEqual(buildSolrQuery({ query: 'danno', materia: '', tipo: '' }), '(danno)');
});

console.log('parseArgs');

t('estrae il valore di --query', () => {
  assert.strictEqual(parseArgs(['--query', 'danno']).query, 'danno');
});

t('estrae --anno come numero', () => {
  assert.strictEqual(parseArgs(['--anno', '2024']).anno, 2024);
});

t('estrae --materia e --tipo', () => {
  const opts = parseArgs(['--materia', 'civile', '--tipo', 'ordinanza']);
  assert.strictEqual(opts.materia, 'civile');
  assert.strictEqual(opts.tipo, 'ordinanza');
});

t('estrae tutti i flag insieme', () => {
  const opts = parseArgs(['--query', 'danno', '--materia', 'penale', '--anno', '2023', '--tipo', 'decreto']);
  assert.deepStrictEqual(opts, { query: 'danno', materia: 'penale', anno: 2023, tipo: 'decreto' });
});

t('senza flag restituisce un oggetto vuoto', () => {
  assert.deepStrictEqual(parseArgs([]), {});
});

console.log('CLI');

t('la CLI build stampa il parametro q', () => {
  const out = execFileSync(
    process.execPath,
    [SCRIPT, 'build', '--query', 'responsabilita medica', '--materia', 'civile'],
    { encoding: 'utf8' }
  );
  assert.strictEqual(out.trim(), '(responsabilita medica) AND kind:"snciv"');
});

t('la CLI format legge lo stdin e stampa la forma standard', () => {
  const payload = JSON.stringify({
    response: {
      numFound: 1,
      docs: [{ id: 'x1', szdec: 'III', tipoprov: 'Sentenza', numdec: '17006', anno: '2025', datdec: '2025-06-12' }],
    },
  });
  const out = execFileSync(process.execPath, [SCRIPT, 'format'], { encoding: 'utf8', input: payload });
  const parsed = JSON.parse(out);
  assert.strictEqual(parsed.totale, 1);
  assert.strictEqual(parsed.massime[0].estremi, 'Sez. III Sentenza n. 17006 del 2025');
});

t('la CLI build con materia non valida esce con codice 1', () => {
  assert.throws(
    () => execFileSync(
      process.execPath,
      [SCRIPT, 'build', '--query', 'danno', '--materia', 'commerciale'],
      { encoding: 'utf8', stdio: 'pipe' }
    ),
    (err) => {
      assert.strictEqual(err.status, 1);
      assert.ok(/civile, penale/.test(String(err.stderr)), 'stderr inatteso: ' + err.stderr);
      return true;
    }
  );
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

t('costruisce il link al documento (campo urlPdf)', () => {
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

console.log('formatResponse: payload non valido');

t('fallisce se il payload non è un oggetto', () => {
  assert.throws(() => formatResponse(null), /FALLITA/);
});

t('fallisce se manca l\'oggetto response', () => {
  assert.throws(() => formatResponse({}), /FALLITA/);
});

t('fallisce se response non è un oggetto', () => {
  assert.throws(() => formatResponse({ response: 'nope' }), /FALLITA/);
});

t('fallisce se response.docs non è un array', () => {
  assert.throws(() => formatResponse({ response: { numFound: 0, docs: {} } }), /FALLITA/);
});

t('fallisce se response.numFound non è un numero', () => {
  assert.throws(() => formatResponse({ response: { numFound: '0', docs: [] } }), /FALLITA/);
});

t('il messaggio dice che la ricerca è fallita e non vuota', () => {
  assert.throws(() => formatResponse({}), /non vuota/);
});

t('il messaggio include il campo error del payload', () => {
  assert.throws(
    () => formatResponse({ error: { msg: 'Errore Solr' } }),
    /Errore Solr/
  );
});

t('la CLI format esce con codice 1 su un payload non valido', () => {
  assert.throws(
    () => execFileSync(
      process.execPath,
      [SCRIPT, 'format'],
      { encoding: 'utf8', stdio: 'pipe', input: JSON.stringify({ error: { msg: 'boom' } }) }
    ),
    (err) => {
      assert.strictEqual(err.status, 1);
      assert.ok(/FALLITA/.test(String(err.stderr)), 'stderr inatteso: ' + err.stderr);
      return true;
    }
  );
});

console.log('');
console.log(passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
