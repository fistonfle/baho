// Writes the corrections from the translation spreadsheet back into the code.
//   node scripts/translations/apply.mjs [file.csv] [--dry-run] [--db]
// --dry-run  only lists what would change
// --db       also corrects lessons, diseases and FAQs already saved in PostgreSQL
//            (the seed data only fills an empty database)
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { encode, extract, root, sourceFiles } from './strings.mjs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const updateDb = args.includes('--db');
const csvPath = args.find((arg) => !arg.startsWith('--')) ?? join(root, 'docs', 'translations', 'baho-text.csv');

// Small CSV reader (quoted cells may contain commas, quotes and line breaks).
const parseCsv = (text) => {
  // Excel saves with ";" in some regions; the header line tells which one is used.
  const firstLine = text.slice(0, text.indexOf('\n'));
  const separator = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') { cell += '"'; i += 1; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === separator) { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += char;
  }
  if (cell || row.length) rows.push([...row, cell]);
  return rows;
};

const [header, ...body] = parseCsv(readFileSync(csvPath, 'utf8').replace(/^﻿/, ''));
const column = (name) => header.findIndex((title) => title.trim().toLowerCase() === name);
const [idCol, currentCol, correctedCol] = [column('id'), column('current text'), column('corrected text')];
if (currentCol < 0 || correctedCol < 0) throw new Error('The file needs the columns "Current text" and "Corrected text".');

const corrections = new Map();
for (const row of body) {
  const current = row[currentCol] ?? '';
  const corrected = (row[correctedCol] ?? '').trim();
  if (corrected && corrected !== current) corrections.set(current, { id: row[idCol], corrected });
}
if (!corrections.size) {
  console.log('No corrections found. Fill the "Corrected text" column first.');
  process.exit(0);
}

const problems = [];
const used = new Set();
let changed = 0;
for (const file of sourceFiles()) {
  const edits = [];
  for (const item of extract(file)) {
    const fix = corrections.get(item.text);
    if (!fix) continue;
    try {
      edits.push({ ...item, code: encode(item, fix.corrected) });
      used.add(item.text);
    } catch (error) {
      problems.push(`Row ${fix.id}: ${error.message} (${file}:${item.line})`);
    }
  }
  if (!edits.length) continue;
  let code = readFileSync(join(root, file), 'utf8');
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    code = code.slice(0, edit.start) + edit.code + code.slice(edit.end);
  }
  console.log(`${file}: ${edits.length} change(s)`);
  changed += edits.length;
  if (!dryRun) writeFileSync(join(root, file), code);
}

for (const [text, fix] of corrections) {
  if (!used.has(text)) problems.push(`Row ${fix.id}: "Current text" was not found in the code (was it edited?)`);
}

if (updateDb && !dryRun) {
  const require = createRequire(join(root, 'backend', 'package.json'));
  require('dotenv').config({ path: join(root, 'backend', '.env') });
  const pool = new (require('pg').Pool)({ connectionString: process.env.DATABASE_URL });
  const textColumns = {
    categories: ['name'],
    content: ['title', 'summary', 'body'],
    quiz_questions: ['question', 'explanation'],
    faqs: ['question', 'answer'],
    curricula: ['title', 'condition_name', 'description', 'about']
  };
  const listColumns = { quiz_questions: ['options'], curricula: ['risk_factors', 'warning_signs', 'prevention'] };
  let rows = 0;
  for (const [before, { corrected }] of corrections) {
    if (before.includes('${')) continue;
    for (const [table, columns] of Object.entries(textColumns)) {
      for (const name of columns) {
        rows += (await pool.query(`UPDATE ${table} SET ${name} = $2 WHERE ${name} = $1`, [before, corrected])).rowCount;
      }
    }
    for (const [table, columns] of Object.entries(listColumns)) {
      for (const name of columns) {
        rows += (await pool.query(
          `UPDATE ${table} SET ${name} = (SELECT jsonb_agg(CASE WHEN item = to_jsonb($1::text) THEN to_jsonb($2::text) ELSE item END) FROM jsonb_array_elements(${name}) AS item)
           WHERE ${name} @> jsonb_build_array($1::text)`,
          [before, corrected]
        )).rowCount;
      }
    }
  }
  await pool.end();
  console.log(`Database: ${rows} row(s) corrected`);
}

console.log(`${dryRun ? 'Would change' : 'Changed'} ${changed} place(s) in the code from ${corrections.size} correction(s).`);
if (problems.length) {
  console.log('\nNot applied:');
  problems.forEach((problem) => console.log(`- ${problem}`));
  process.exitCode = 1;
}
