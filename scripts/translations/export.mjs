// Writes every piece of user-facing Kinyarwanda text to a spreadsheet (CSV).
// Fill in "Corrected text" for the lines that are wrong, then run apply.mjs.
//   node scripts/translations/export.mjs [output.csv]
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { extract, root, sectionOf, sourceFiles } from './strings.mjs';

const output = process.argv[2] ?? join(root, 'docs', 'translations', 'baho-text.csv');

// One row per distinct text, so a correction is applied everywhere it is used.
const rows = new Map();
for (const file of sourceFiles()) {
  for (const item of extract(file)) {
    const row = rows.get(item.text) ?? { section: sectionOf(file), text: item.text, places: [] };
    row.places.push(`${file.replace(/^frontend\/src\/|^backend\/src\//, '')}:${item.line}`);
    rows.set(item.text, row);
  }
}

const cell = (value) => `"${String(value).replace(/"/g, '""')}"`;
const sorted = [...rows.values()].sort((a, b) => a.section.localeCompare(b.section) || a.places[0].localeCompare(b.places[0], undefined, { numeric: true }));
const lines = [['ID', 'Section', 'Current text', 'Corrected text', 'Comment', 'Where it is used'].map(cell).join(',')];
sorted.forEach((row, index) => lines.push([index + 1, row.section, row.text, '', '', row.places.join(' ')].map(cell).join(',')));

// The byte-order mark makes Excel open the file as UTF-8 (apostrophes, accents).
writeFileSync(output, `﻿${lines.join('\r\n')}\r\n`);
console.log(`${sorted.length} texts written to ${output}`);
