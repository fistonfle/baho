// Takes the README / report screenshots by driving the real app in headless Chrome.
//   node --experimental-websocket scripts/evidence/screenshots.mjs <app-url> <out-dir> <sessions.json>
// sessions.json holds sign-in tokens for { admin, specialist, learner } (see staging.mjs).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { openPage, sleep } from './cdp.mjs';

const [appUrl, outDir, sessionsFile] = process.argv.slice(2);
const sessions = JSON.parse(readFileSync(sessionsFile, 'utf8'));
mkdirSync(outDir, { recursive: true });

const desktop = { width: 1280, height: 800, mobile: false };
const phone = { width: 390, height: 844, mobile: true };

// Helpers added to the page: click by visible text, and fill React inputs.
const helpers = `
  window.__click = (text, selector = 'button, a, [role=tab], label') => {
    const element = [...document.querySelectorAll(selector)].find((node) => node.textContent.trim().startsWith(text) && node.offsetParent !== null);
    if (!element) throw new Error('No element with text: ' + text);
    element.scrollIntoView({ block: 'center' });
    element.click();
    return true;
  };
  window.__fill = (selector, value) => {
    const input = document.querySelector(selector);
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value').set;
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  };`;

const page = await openPage();
await page.send('Page.enable');

const setViewport = (view) => page.send('Emulation.setDeviceMetricsOverride', { width: view.width, height: view.height, deviceScaleFactor: 2, mobile: view.mobile });
const load = async (storage = {}) => {
  await page.send('Page.navigate', { url: appUrl });
  await sleep(800);
  await page.evaluate(`localStorage.clear(); ${Object.entries(storage).map(([key, value]) => `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)});`).join('')} location.reload();`);
  await sleep(1800);
  await page.evaluate(helpers);
};
const step = async (code, wait = 500) => {
  await page.evaluate(`(async () => { ${code} })()`);
  await sleep(wait);
};
const hideToast = () => page.evaluate(`document.querySelector('.toast button')?.click()`);
const shot = async (name) => {
  await hideToast();
  await page.evaluate('window.scrollTo(0, 0)');
  await sleep(200);
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  console.log('saved', name);
};
const shotAt = async (name, selector) => {
  await hideToast();
  await page.evaluate(`document.querySelector(${JSON.stringify(selector)}).scrollIntoView({ block: 'start' }); window.scrollBy(0, -12);`);
  await sleep(300);
  const { data } = await page.send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(outDir, `${name}.png`), Buffer.from(data, 'base64'));
  console.log('saved', name);
};
const session = (key) => ({ 'baho-token': sessions[key].token, 'baho-user': JSON.stringify(sessions[key].user) });

// Learner, as a guest: landing → onboarding → health profile → dashboard → lesson.
await setViewport(desktop);
await load();
await shot('01-landing');
await step(`__click('Tangira kwiga')`);
await step(`__click('Diyabete', 'label'); __click('Umuvuduko w', 'label'); __fill('#learner-name', 'Uwase')`);
await shot('02-onboarding-topics');
await step(`__click('Komeza')`, 800);
await step(`
  __click('Diyabete', 'label');
  for (const group of document.querySelectorAll('.segmented')) group.querySelector('button').click();
`);
await shot('03-health-profile');
await step(`__click('Bika')`, 1500);
await shot('04-dashboard-learning-path');
await step(`document.querySelector('main .list-button.current, main .list-button').click()`, 1200);
await shotAt('05-lesson-image-audio', '.audio-panel');
await step(`for (const question of document.querySelectorAll('.audio-panel ~ * .quiz-question, .quiz-question')) question.querySelector('.quiz-option')?.click();`, 400);
await step(`__click('Ohereza ibisubizo')`, 1500);
await shotAt('06-lesson-quiz-feedback', '.quiz-question');
await step(`__click('Ahabanza', 'nav button'); `, 600);
await step(`__click('Hindura gahunda')`, 800);
await shot('07-learning-programmes');
await step(`__click('Indwara', 'nav button')`, 800);
await shot('08-ncd-module');
await step(`__click('Tangira isuzuma')`, 800);
await step(`document.querySelector('.quiz-option')?.click()`);
await shot('09-knowledge-check');
await step(`__click('Imyitozo', 'nav button')`, 800);
await shot('10-exercise');
await step(`__click('Ibyo tukwibutsa', 'nav button')`, 800);
await shot('11-reminders');
await step(`__click('Ubufasha', 'nav button')`, 800);
await shot('12-help-faq');

// Phone-sized views.
await setViewport(phone);
await load();
await step(`__click('Fungura konti ukoresheje telefoni')`, 800);
await step(`__fill('#auth-name', 'Uwase'); __fill('#auth-phone', '078 123 4567')`);
await shot('13-phone-sign-up');
await load(session('learner'));
await shot('14-phone-dashboard');
await step(`__click('Indwara', '.tab-bar button')`, 800);
await shot('15-phone-diseases');

// Staff portal (English).
await setViewport(desktop);
await load(session('admin'));
await shot('16-admin-review-and-publish');
await step(`__click('Lessons', '[role=tab]')`, 800);
await shot('17-lesson-editor');
await step(`__click('Staff', '[role=tab]')`, 800);
await shot('18-admin-staff-specialists');
await step(`__click('Diseases', '[role=tab]')`, 800);
await shot('19-admin-diseases');
await load(session('specialist'));
await step(`__click('Review', 'td button')`, 800);
await shot('20-specialist-review');
await load(session('learner'));
await step(`document.querySelector('.account-link').click()`, 800);
await shot('21-profile-phone-account');

await page.close();
