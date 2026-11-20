// HTML to PDF with headless Chrome.
// Usage: node --experimental-websocket scripts/evidence/pdf.mjs <in.html> <out.pdf>
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { openPage, sleep } from './cdp.mjs';

const [input, output] = process.argv.slice(2);
const page = await openPage();
await page.send('Page.enable');
await page.send('Page.navigate', { url: `file://${resolve(input)}` });
await sleep(1500);
const { data } = await page.send('Page.printToPDF', { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: true, headerTemplate: '<span></span>', footerTemplate: '<div style="width:100%;font-size:8px;color:#888;text-align:center">Baho: Technical Report · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>' });
writeFileSync(output, Buffer.from(data, 'base64'));
await page.close();
