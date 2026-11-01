// Phone-size audit of the learner screens: full-page screenshots plus a list of
// tap targets smaller than 40 px and visible English words, per screen.
//   node --experimental-websocket scripts/evidence/ux-audit.mjs <app-url> <out-dir>
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { openPage, sleep } from './cdp.mjs';

const [appUrl, outDir] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const page = await openPage();
await page.send('Page.enable');
await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });

const helpers = `window.__click = (text, selector = 'button') => {
  const el = [...document.querySelectorAll(selector)].find((n) => n.textContent.trim().startsWith(text) && n.offsetParent !== null);
  if (!el) throw new Error('missing ' + text); el.click(); return true; };`;
const inspect = `(() => {
  const small = [...document.querySelectorAll('button, a, input, select, label.option, summary')]
    .filter((n) => n.offsetParent !== null)
    .map((n) => ({ text: (n.textContent || n.getAttribute('aria-label') || n.type || '').trim().slice(0, 40), h: Math.round(n.getBoundingClientRect().height), w: Math.round(n.getBoundingClientRect().width) }))
    .filter((t) => t.h < 40 && !t.text.startsWith('Jya ku'));
  const english = [...new Set((document.querySelector('main')?.innerText.match(/\\b(min|Online|Offline|PIN|AES-GCM|email|Staff[a-z ]*|Writers?|Specialists?)\\b/g)) || [])];
  return { small, english, height: document.documentElement.scrollHeight };
})()`;
const results = {};
const shot = async (name) => {
  await page.evaluate(`document.querySelector('.toast button')?.click()`).catch(() => {});
  await sleep(300);
  results[name] = await page.evaluate(inspect);
  const { cssContentSize } = await page.send('Page.getLayoutMetrics');
  const { data } = await page.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: 390, height: Math.ceil(cssContentSize.height), scale: 1 } });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
};
const step = async (code, wait = 700) => { await page.evaluate(`(async () => { ${code} })()`); await sleep(wait); };

await page.send('Page.navigate', { url: appUrl });
await sleep(1000);
await page.evaluate('localStorage.clear(); location.reload()');
await sleep(2000);
await page.evaluate(helpers);
await shot('01-landing');
await step(`__click('Tangira kwiga')`);
await shot('02-onboarding');
await step(`__click('Diyabete', 'label'); const i = document.querySelector('#learner-name'); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(i, 'Uwase'); i.dispatchEvent(new Event('input', { bubbles: true }));`);
await step(`__click('Komeza')`, 900);
await shot('03-health-profile');
await step(`__click('Diyabete', 'label'); for (const g of document.querySelectorAll('.segmented')) g.querySelector('button').click();`);
await step(`__click('Bika')`, 1500);
await shot('04-dashboard');
for (const [name, nav] of [['05-library', 'Amasomo'], ['06-ncd', 'Indwara'], ['07-exercise', 'Imyitozo'], ['08-reminders', 'Ibyo tukwibutsa'], ['09-help', 'Ubufasha']]) {
  await step(`__click(${JSON.stringify(nav)}, '.tab-bar button')`, 900);
  await shot(name);
}
await step(`__click('Indwara', '.tab-bar button')`);
await step(`__click('Tangira isuzuma')`, 900);
await shot('10-checkup');
await step(`document.querySelector('.account-link').click()`, 900);
await shot('11-profile');
await step(`__click('Fungura konti')`, 900);
await shot('12-sign-up');
writeFileSync(join(outDir, 'findings.json'), JSON.stringify(results, null, 2));
for (const [name, r] of Object.entries(results)) {
  console.log(name, 'height', r.height, '| small:', r.small.map((s) => `${s.text || '?'}(${s.h})`).join(', ') || '-', '| english:', r.english.join(', ') || '-');
}
await page.close();
