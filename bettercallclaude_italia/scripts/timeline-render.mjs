#!/usr/bin/env node
/**
 * timeline-render.mjs — validatore + renderer deterministico per gli eventi di legal-chronology.
 *
 * Uso:
 *   node timeline-render.mjs validate <events.json>
 *   node timeline-render.mjs render <events.json> [--outdir <dir>] [--formats all|table|visual|docx]
 *   node timeline-render.mjs selfcheck
 *
 * Zero dipendenze (Node >= 18). Fa rispettare l'unica regola non negoziabile della
 * skill legal-chronology: NESSUN EVENTO SENZA FONTE.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const GAP_DAYS = 30;
const STATUSES = new Set(["undisputed", "alleged", "contested"]);
const PRECISIONS = new Set(["day", "month", "year", "unknown"]);
const STATUS_LABEL = { undisputed: "non contestato", alleged: "allegato", contested: "contestato" };

// ---------------------------------------------------------------- helpers
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const escXml = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escHtml = escXml;
const srcLabel = (src) => (src || []).map((s) => `${s.doc}${s.locus ? ", " + s.locus : ""}`).join("; ");
const statusLabel = (s) => `${s} (${STATUS_LABEL[s] || s})`;

function loadEvents(path) {
  const raw = JSON.parse(readFileSync(path, "utf8"));
  return Array.isArray(raw) ? { case: {}, events: raw } : raw;
}

// ---------------------------------------------------------------- validate
function validate(data) {
  const problems = [];
  const events = data.events || [];
  events.forEach((e, i) => {
    const id = e.id || `#${i}`;
    if (!Array.isArray(e.source) || e.source.length === 0)
      problems.push(`${id}: FONTE MANCANTE — evento rifiutato ("${(e.event || "").slice(0, 60)}")`);
    else
      e.source.forEach((s, j) => {
        if (!s.doc) problems.push(`${id}: source[${j}] manca doc`);
        if (!s.locus) problems.push(`${id}: source[${j}] manca locus`);
      });
    if (e.date && !ISO_RE.test(e.date)) problems.push(`${id}: data non ISO ("${e.date}")`);
    if (!e.date && e.precision !== "unknown") problems.push(`${id}: nessuna data ma precision != unknown`);
    if (!PRECISIONS.has(e.precision)) problems.push(`${id}: precision non valida ("${e.precision}")`);
    if (!STATUSES.has(e.status)) problems.push(`${id}: status non valido ("${e.status}")`);
    if ((e.status === "alleged" || e.status === "contested") && !e.attribution)
      problems.push(`${id}: status "${e.status}" richiede attribution`);
    if (!e.event || !String(e.event).trim()) problems.push(`${id}: testo evento vuoto`);
  });
  return problems;
}

// ---------------------------------------------------------------- analysis
function sortEvents(events) {
  return [...events].sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999")));
}

function findGaps(events) {
  const dated = sortEvents(events.filter((e) => e.date && e.precision === "day"));
  const gaps = [];
  for (let i = 1; i < dated.length; i++) {
    const d = daysBetween(dated[i - 1].date, dated[i].date);
    if (d >= GAP_DAYS)
      gaps.push({ from: dated[i - 1].date, to: dated[i].date, days: d });
  }
  return gaps;
}

function collectDeadlines(events) {
  const out = [];
  for (const e of events)
    for (const m of e.deadline_markers || [])
      out.push({ ...m, anchor: e.id, anchor_event: e.event });
  return out.sort((a, b) => String(a.due).localeCompare(String(b.due)));
}

function fmtDate(e) {
  if (!e.date) return "(senza data)";
  if (e.precision === "month") return e.date.slice(0, 7);
  if (e.precision === "year") return e.date.slice(0, 4);
  return e.date;
}

// ---------------------------------------------------------------- markdown
function renderMd(data) {
  const events = sortEvents((data.events || []).filter((e) => e.precision !== "unknown"));
  const undated = (data.events || []).filter((e) => e.precision === "unknown");
  const gaps = findGaps(data.events || []);
  const deadlines = collectDeadlines(data.events || []);
  const title = data.case?.title || "Cronologia Legale";
  const L = [];
  L.push(`# ${title} — Cronologia`, "");
  L.push(`Eventi: ${events.length} | Conflitti: ${events.filter((e) => (e.conflicts || []).length > 0).length} | Contestati: ${events.filter((e) => e.status === "contested").length} | Lacune: ${gaps.length} | Marcatori di termine: ${deadlines.length}`, "");
  L.push("| Data | Evento | Fonte | Stato | Parti |", "|---|---|---|---|---|");
  const gapBefore = new Map(gaps.map((g) => [g.to, g]));
  for (const e of events) {
    const g = gapBefore.get(e.date);
    if (g) L.push(`| **LACUNA** | ⚠ Lacuna probatoria: nessun evento documentato ${g.from} → ${g.to} (${g.days} giorni) | — | — | — |`);
    const conflict = (e.conflicts || []).length ? ` ⚠ **conflitto di date**: ${e.conflicts.map((c) => `${c.date} (${c.source.doc})`).join(" vs ")}` : "";
    const attr = e.attribution ? ` — *${e.attribution}*` : "";
    L.push(`| ${fmtDate(e)} | ${e.event}${conflict}${attr} | ${srcLabel(e.source)} | ${statusLabel(e.status)} | ${(e.parties || []).join(", ")} |`);
  }
  if (undated.length) {
    L.push("", "## Fatti documentati senza data", "");
    for (const e of undated) L.push(`- ${e.event} (${srcLabel(e.source)}) — ${statusLabel(e.status)}`);
  }
  const conflicted = events.filter((e) => (e.conflicts || []).length);
  if (conflicted.length) {
    L.push("", "## Conflitti di date", "");
    for (const e of conflicted)
      L.push(`- **${e.event}**: ` + e.conflicts.map((c) => `${c.date} per ${c.source.doc}${c.source.locus ? ", " + c.source.locus : ""}`).join(" — CONFLITTO — "));
  }
  if (gaps.length) {
    L.push("", "## Lacune probatorie", "");
    for (const g of gaps) L.push(`- ${g.from} → ${g.to}: ${g.days} giorni senza eventi documentati`);
  }
  if (deadlines.length) {
    L.push("", "## Marcatori di termine (indicativi)", "");
    for (const m of deadlines) L.push(`- **${m.due}** — ${m.label} (${m.kind}, base: ${m.basis}), ancorato a ${m.anchor}: ${m.anchor_event}`);
  }
  L.push("", "---", "_Solo strumento di lavoro — verificare date, stati e termini sul fascicolo. I marcatori di termine sono indicativi e non costituiscono consulenza legale; verificare presso la cancelleria competente._", "");
  return L.join("\n");
}

// ---------------------------------------------------------------- html
function renderHtml(data) {
  const events = sortEvents((data.events || []).filter((e) => e.precision !== "unknown"));
  const gaps = findGaps(data.events || []);
  const deadlines = collectDeadlines(data.events || []);
  const title = data.case?.title || "Cronologia Legale";
  const gapBefore = new Map(gaps.map((g) => [g.to, g]));
  const sources = [];
  const srcId = (s) => {
    const label = srcLabel([s]);
    let i = sources.indexOf(label);
    if (i === -1) { sources.push(label); i = sources.length - 1; }
    return i + 1;
  };
  const rows = [];
  for (const e of events) {
    const g = gapBefore.get(e.date);
    if (g) rows.push(`<tr class="gap"><td colspan="5">⚠ LACUNA PROBATORIA — nessun evento documentato ${g.from} → ${g.to} (${g.days} giorni)</td></tr>`);
    const refs = (e.source || []).map((s) => `<a href="#src-${srcId(s)}">[${srcId(s)}]</a>`).join(" ");
    const conflict = (e.conflicts || []).length
      ? `<div class="conflict">⚠ conflitto di date: ${e.conflicts.map((c) => `${c.date} <i>(${escHtml(c.source.doc)})</i>`).join(" vs ")}</div>` : "";
    const attr = e.attribution ? `<div class="attr">${escHtml(e.attribution)}</div>` : "";
    rows.push(`<tr class="${e.status}" data-status="${e.status}"><td class="date">${fmtDate(e)}</td><td>${escHtml(e.event)}${conflict}${attr}</td><td>${refs}</td><td><span class="badge ${e.status}">${escHtml(statusLabel(e.status))}</span></td><td>${escHtml((e.parties || []).join(", "))}</td></tr>`);
  }
  const dl = deadlines.length
    ? `<h2>Marcatori di termine (indicativi)</h2><ul>${deadlines.map((m) => `<li class="deadline"><b>${m.due}</b> — ${escHtml(m.label)} <i>(${m.kind}; base: ${escHtml(m.basis)})</i> — ancorato a ${escHtml(m.anchor)}: ${escHtml(m.anchor_event)}</li>`).join("")}</ul>` : "";
  return `<!DOCTYPE html>
<html lang="it"><head><meta charset="utf-8"><title>${escHtml(title)} — Cronologia</title>
<style>
body{font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:2rem;color:#1a1a1a}
table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccc;padding:.45rem .6rem;vertical-align:top;text-align:left}
th{background:#f4f4f4;position:sticky;top:0}
tr.undisputed td:first-child{border-left:5px solid #2e7d32}
tr.alleged td:first-child{border-left:5px solid #f9a825}
tr.contested td:first-child{border-left:5px solid #c62828}
tr.gap td{background:#eceff1;color:#546e7a;font-weight:600}
.badge{border-radius:3px;padding:.1rem .4rem;font-size:.85em;color:#fff}
.badge.undisputed{background:#2e7d32}.badge.alleged{background:#f9a825;color:#222}.badge.contested{background:#c62828}
.conflict{color:#c62828;font-weight:600;margin-top:.3rem}
.attr{color:#555;font-style:italic;margin-top:.2rem}
.date{white-space:nowrap}
.filters{margin:1rem 0}.filters button{margin-right:.5rem;padding:.3rem .8rem;cursor:pointer}
.deadline{color:#1565c0}
.srcs{margin-top:2rem;font-size:.9em;color:#444}
</style></head><body>
<h1>${escHtml(title)} — Cronologia</h1>
<p>Eventi: ${events.length} | Contestati: ${events.filter((e) => e.status === "contested").length} | Lacune: ${gaps.length} | Marcatori di termine: ${deadlines.length}</p>
<div class="filters">Filtro:
<button onclick="f('all')">tutti</button><button onclick="f('undisputed')">non contestati</button><button onclick="f('alleged')">allegati</button><button onclick="f('contested')">contestati</button>
</div>
<table><thead><tr><th>Data</th><th>Evento</th><th>Fonte</th><th>Stato</th><th>Parti</th></tr></thead>
<tbody>${rows.join("\n")}</tbody></table>
${dl}
<div class="srcs"><h2>Fonti</h2><ol>${sources.map((s, i) => `<li id="src-${i + 1}">${escHtml(s)}</li>`).join("")}</ol></div>
<p><small>Solo strumento di lavoro — verificare date, stati e termini sul fascicolo. I marcatori di termine sono indicativi e non costituiscono consulenza legale; verificare presso la cancelleria competente.</small></p>
<script>function f(s){document.querySelectorAll('tbody tr[data-status]').forEach(r=>{r.style.display=(s==='all'||r.dataset.status===s)?'':'none'})}</script>
</body></html>`;
}

// ---------------------------------------------------------------- docx (OOXML minimale, puro JS)
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

function zipStore(files) {
  const chunks = [], central = [];
  let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name, "utf8"), data = f.data, crc = crc32(data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt16LE(0, 8); lh.writeUInt16LE(0, 10); lh.writeUInt16LE(0, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22);
    lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
    chunks.push(lh, name, data);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt16LE(0, 10); cd.writeUInt16LE(0, 12); cd.writeUInt16LE(0, 14);
    cd.writeUInt32LE(crc, 16); cd.writeUInt32LE(data.length, 20); cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(name.length, 28); cd.writeUInt16LE(0, 30); cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34); cd.writeUInt16LE(0, 36); cd.writeUInt32LE(0, 38); cd.writeUInt32LE(offset, 42);
    central.push(cd, name);
    offset += 30 + name.length + data.length;
  }
  const cdBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6);
  end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cdBuf.length, 12); end.writeUInt32LE(offset, 16); end.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, cdBuf, end]);
}

function docxCell(text, bold = false) {
  return `<w:tc><w:tcPr><w:tcW w:w="2400" w:type="dxa"/></w:tcPr><w:p><w:r>${bold ? "<w:rPr><w:b/></w:rPr>" : ""}<w:t xml:space="preserve">${escXml(text)}</w:t></w:r></w:p></w:tc>`;
}

function renderDocx(data) {
  const events = sortEvents((data.events || []).filter((e) => e.precision !== "unknown"));
  const gaps = findGaps(data.events || []);
  const deadlines = collectDeadlines(data.events || []);
  const title = data.case?.title || "Cronologia Legale";
  const gapBefore = new Map(gaps.map((g) => [g.to, g]));
  const rows = [];
  rows.push(["Data", "Evento", "Fonte", "Stato", "Parti"].map((h) => docxCell(h, true)).join(""));
  for (const e of events) {
    const g = gapBefore.get(e.date);
    if (g) rows.push(`<w:tr>${docxCell("LACUNA")}${docxCell(`Lacuna probatoria: nessun evento documentato ${g.from} -> ${g.to} (${g.days} giorni)`, true)}${docxCell("")}${docxCell("")}${docxCell("")}</w:tr>`);
    const conflict = (e.conflicts || []).length ? ` [CONFLITTO DI DATE: ${e.conflicts.map((c) => `${c.date} (${c.source.doc})`).join(" vs ")}]` : "";
    const attr = e.attribution ? ` (${e.attribution})` : "";
    rows.push(`<w:tr>${docxCell(fmtDate(e))}${docxCell(e.event + conflict + attr)}${docxCell(srcLabel(e.source))}${docxCell(statusLabel(e.status))}${docxCell((e.parties || []).join(", "))}</w:tr>`);
  }
  const summary =
    `<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Conflitti: ${events.filter((e) => (e.conflicts || []).length).length} | Lacune: ${gaps.length} | Marcatori di termine: ${deadlines.length}</w:t></w:r></w:p>` +
    deadlines.map((m) => `<w:p><w:r><w:t>- ${m.due}: ${escXml(m.label)} (${m.kind}; base: ${escXml(m.basis)}), ancorato a ${escXml(m.anchor)}</w:t></w:r></w:p>`).join("");
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>${escXml(title)} — Cronologia</w:t></w:r></w:p>
<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4"/><w:left w:val="single" w:sz="4"/><w:bottom w:val="single" w:sz="4"/><w:right w:val="single" w:sz="4"/><w:insideH w:val="single" w:sz="4"/><w:insideV w:val="single" w:sz="4"/></w:tblBorders></w:tblPr>${rows.join("\n")}</w:tbl>
<w:p/>${summary}
<w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Solo strumento di lavoro — verificare date, stati e termini sul fascicolo. I marcatori di termine sono indicativi e non costituiscono consulenza legale; verificare presso la cancelleria competente.</w:t></w:r></w:p>
</w:body></w:document>`;
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
  return zipStore([
    { name: "[Content_Types].xml", data: Buffer.from(contentTypes, "utf8") },
    { name: "_rels/.rels", data: Buffer.from(rels, "utf8") },
    { name: "word/document.xml", data: Buffer.from(documentXml, "utf8") },
  ]);
}

// ---------------------------------------------------------------- commands
function cmdValidate(path) {
  const problems = validate(loadEvents(path));
  if (problems.length) {
    console.error(`VALIDAZIONE FALLITA — ${problems.length} problema/i:`);
    problems.forEach((p) => console.error("  - " + p));
    process.exitCode = 1;
  } else console.log("VALIDAZIONE OK — ogni evento ha una fonte.");
}

function cmdRender(path, args) {
  const outdir = args.outdir || "bcc-output/cronologia";
  const formats = (args.formats || "all").split(",");
  const all = formats.includes("all");
  const data = loadEvents(path);
  const problems = validate(data);
  if (problems.length) {
    console.error(`Rendering rifiutato: ${problems.length} problema/i di validazione. Correggi o elimina prima gli eventi incriminati.`);
    problems.forEach((p) => console.error("  - " + p));
    process.exitCode = 1;
    return;
  }
  mkdirSync(outdir, { recursive: true });
  const written = [];
  if (all || formats.includes("table")) { writeFileSync(join(outdir, "cronologia.md"), renderMd(data)); written.push("cronologia.md"); }
  if (all || formats.includes("visual")) { writeFileSync(join(outdir, "cronologia.html"), renderHtml(data)); written.push("cronologia.html"); }
  if (all || formats.includes("docx")) { writeFileSync(join(outdir, "cronologia.docx"), renderDocx(data)); written.push("cronologia.docx"); }
  console.log(`Renderizzato in ${outdir}: ${written.join(", ")}`);
}

// ---------------------------------------------------------------- selfcheck
function selfcheck() {
  const fixture = {
    case: { title: "Fixture Selfcheck" },
    events: [
      { id: "evt-1", date: "2024-01-15", precision: "day", event: "Stipula del contratto.", source: [{ doc: "01-contratto", locus: "p. 1" }], status: "undisputed", parties: ["A", "B"] },
      { id: "evt-2", date: "2024-03-03", precision: "day", event: "Consegna del macchinario.", source: [{ doc: "01-contratto", locus: "art. 4.1" }, { doc: "02-lettera", locus: "p. 1" }], status: "contested", attribution: "A allega la consegna del 3.3.; B contesta.", parties: ["A", "B"], conflicts: [{ date: "2024-03-03", source: { doc: "01-contratto", locus: "art. 4.1" } }, { date: "2024-03-10", source: { doc: "02-lettera", locus: "p. 1" } }] },
      { id: "evt-3", date: "2024-04-15", precision: "day", event: "Notifica della sentenza.", source: [{ doc: "04-notifica", locus: "ricevuta" }], status: "undisputed", parties: ["A", "B"], deadline_markers: [{ kind: "procedurale", label: "Appello (art. 325 CPC: 30 giorni)", due: "2024-05-15", basis: "tabella-mapping (indicativo)", anchored_to: "evt-3" }] },
      { id: "evt-bad", date: "2024-05-01", precision: "day", event: "Fatto senza fonte.", source: [], status: "alleged", attribution: "A allega.", parties: ["A"] },
    ],
  };
  const checks = [];
  const ok = (name, cond) => { checks.push([name, !!cond]); };
  // 1. evento senza fonte rifiutato
  const problems = validate(fixture);
  ok("evento senza fonte rifiutato", problems.some((p) => p.includes("evt-bad")));
  // 2-6. render con l'evento errato rimosso
  const clean = { ...fixture, events: fixture.events.filter((e) => e.id !== "evt-bad") };
  ok("fixture pulita valida", validate(clean).length === 0);
  const md = renderMd(clean);
  ok("conflitto mostra ENTRAMBE le date", md.includes("2024-03-03") && md.includes("2024-03-10"));
  ok("stato contestato + attribuzione", md.includes("contested (contestato)") && md.includes("A allega la consegna del 3.3.; B contesta."));
  ok("evento fuso ha due fonti", md.includes("01-contratto, art. 4.1; 02-lettera, p. 1"));
  ok("lacuna >= 30 giorni segnalata (15.01 -> 03.03)", md.includes("Lacuna probatoria") && md.includes("48 giorni"));
  ok("marcatore di termine renderizzato", md.includes("Appello (art. 325 CPC: 30 giorni)") && md.includes("tabella-mapping (indicativo)"));
  const html = renderHtml(clean);
  ok("html autonomo (nessun CDN)", !/src="http|href="http/.test(html));
  ok("html ha classi di stato", html.includes('class="contested"') || html.includes("badge contested"));
  const docx = renderDocx(clean);
  ok("docx è uno zip (PK)", docx[0] === 0x50 && docx[1] === 0x4b);
  ok("docx contiene la voce document.xml", docx.includes(Buffer.from("word/document.xml")));
  // scrivi gli output in temp per ispezione
  const outdir = join(tmpdir(), "cronologia-selfcheck");
  mkdirSync(outdir, { recursive: true });
  writeFileSync(join(outdir, "cronologia.md"), md);
  writeFileSync(join(outdir, "cronologia.html"), html);
  writeFileSync(join(outdir, "cronologia.docx"), docx);
  let failed = 0;
  for (const [name, passed] of checks) {
    console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
    if (!passed) failed++;
  }
  console.log(failed ? `SELFCHECK FALLITO (${failed})` : `SELFCHECK OK (${checks.length} controlli) — output di esempio in ${outdir}`);
  process.exitCode = failed ? 1 : 0;
}

// ---------------------------------------------------------------- main
const [cmd, target, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i += 2) args[rest[i].replace(/^--/, "")] = rest[i + 1];
if (cmd === "validate" && target) cmdValidate(target);
else if (cmd === "render" && target) cmdRender(target, args);
else if (cmd === "selfcheck") selfcheck();
else {
  console.log("Uso: timeline-render.mjs validate <events.json> | render <events.json> [--outdir dir] [--formats all|table|visual|docx] | selfcheck");
  process.exitCode = 2;
}
