// Compatibility, offline and resource checks against a running Baho site.
//   node --experimental-websocket scripts/evidence/compatibility.mjs <app-url> <out.json>
import { writeFileSync } from 'node:fs';

import { openPage, sleep } from './cdp.mjs';

const [appUrl, out] = process.argv.slice(2);
const results = { url: appUrl, date: new Date().toISOString(), viewports: [], offline: {}, resources: {}, slowNetwork: {} };
const page = await openPage();
await page.send('Page.enable');
await page.send('Network.enable');
await page.send('Performance.enable');

// 1. Resources of a first visit on a phone-sized screen (clean storage, no service worker yet).
await page.send('Emulation.setDeviceMetricsOverride', { width: 393, height: 852, deviceScaleFactor: 1, mobile: true });
let transferred = 0;
let requests = 0;
page.on('Network.loadingFinished', (event) => { transferred += event.encodedDataLength; requests += 1; });
await page.send('Storage.clearDataForOrigin', { origin: new URL(appUrl).origin, storageTypes: 'all' });
await page.send('Network.clearBrowserCache');
await page.send('Page.navigate', { url: appUrl });
for (let waited = 0; waited < 20000; waited += 250) {
  if (await page.evaluate(`document.readyState === 'complete' && Boolean(document.querySelector('.lesson-teaser'))`).catch(() => false)) break;
  await sleep(250);
}
await sleep(1000);
const metrics = Object.fromEntries((await page.send('Performance.getMetrics')).metrics.map((metric) => [metric.name, metric.value]));
const timing = await page.evaluate(`(() => { const n = performance.getEntriesByType('navigation')[0]; return { domContentLoaded: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; })()`);
results.resources = {
  requests,
  transferredKB: Math.round(transferred / 1024),
  jsHeapUsedMB: +(metrics.JSHeapUsedSize / 1048576).toFixed(1),
  domNodes: metrics.Nodes,
  ...timing
};

// 2. Offline: right after the first visit, the service worker must serve the app with no network.
// The browser's HTTP cache is cleared first, so only the service worker can serve the app.
const swReady = await page.evaluate(`navigator.serviceWorker.ready.then(() => true)`);
await sleep(1500);
await page.send('Network.clearBrowserCache');
await page.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
await page.send('Page.reload');
await sleep(3000);
results.offline = {
  serviceWorker: swReady,
  ...(await page.evaluate(`({
    pageLoaded: Boolean(document.querySelector('.masthead')),
    offlineNotice: Boolean(document.querySelector('.offline-notice')),
    diseasesShown: document.querySelectorAll('.disease-link').length,
    lessonsShown: document.querySelectorAll('.lesson-teaser').length
  })`))
};

await page.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

// 3. Layout at common screen widths: nothing may overflow sideways.
const viewports = [
  { name: 'Small phone (iPhone SE)', width: 320, height: 568, mobile: true },
  { name: 'Phone (Android, 360 px)', width: 360, height: 780, mobile: true },
  { name: 'Phone (iPhone 15)', width: 393, height: 852, mobile: true },
  { name: 'Tablet (iPad)', width: 768, height: 1024, mobile: true },
  { name: 'Laptop', width: 1366, height: 768, mobile: false },
  { name: 'Desktop monitor', width: 1920, height: 1080, mobile: false }
];
for (const view of viewports) {
  await page.send('Emulation.setDeviceMetricsOverride', { width: view.width, height: view.height, deviceScaleFactor: 1, mobile: view.mobile });
  await page.send('Page.navigate', { url: appUrl });
  await sleep(2500);
  const layout = await page.evaluate(`({
    overflow: document.documentElement.scrollWidth > window.innerWidth,
    smallestButtonPx: Math.round(Math.min(...[...document.querySelectorAll('main .btn')].filter((b) => b.offsetParent && b.offsetWidth).map((b) => b.getBoundingClientRect().height)))
  })`);
  results.viewports.push({ ...view, ...layout, pass: !layout.overflow });
}

// 4. Slow network (about 400 kbit/s, 400 ms latency, a weak 3G signal), first visit.
await page.send('Network.emulateNetworkConditions', { offline: false, latency: 400, downloadThroughput: 50 * 1024, uploadThroughput: 25 * 1024 });
await page.send('Network.clearBrowserCache');
await page.evaluate(`navigator.serviceWorker.getRegistrations().then((list) => Promise.all(list.map((r) => r.unregister())))`);
const started = Date.now();
await page.send('Page.navigate', { url: appUrl });
let firstText = null;
while (Date.now() - started < 30000) {
  if (await page.evaluate(`Boolean(document.querySelector('.landing-banner h1'))`)) { firstText = Date.now() - started; break; }
  await sleep(100);
}
results.slowNetwork = { profile: '400 kbit/s, 400 ms latency', firstContentMs: firstText };

await page.close();
writeFileSync(out, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
