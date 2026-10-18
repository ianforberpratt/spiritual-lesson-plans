#!/usr/bin/env node
// Browser privacy test for /put-it-to-work: types a unique canary string into EVERY input
// the page offers, walks every screen in every mode, copies, resets, and fails if the canary
// (or any other typed text) reaches the network, storage, or cookies.
//
//   perl scripts/serve.pl . 8099 &            # local preview server (mirrors Vercel cleanUrls)
//   NODE_PATH=$(npm root -g) node scripts/test-put-it-to-work-privacy.js [base-url]
//
// Needs Playwright with Chromium. Default base URL: http://127.0.0.1:8099
// Third-party hosts (Google Fonts) are blocked so the test is offline-safe; that only removes
// requests that cannot carry typed text anyway.

const { chromium } = require('playwright');
const BASE = process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:8099';
const CANARY = 'CANARY-7f3a9c-do-not-send';
const failures = [];
const log = [];
const fail = m => { failures.push(m); console.log('FAIL: ' + m); };

(async () => {
  const browser = await chromium.launch();
  for (const mode of ['solo', 'group']) {
    for (const path of ['quick', 'full']) {
      const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
      const page = await ctx.newPage();
      const requests = [];
      let typing = false;
      page.on('request', r => requests.push({ phase: typing ? 'after-typing-began' : 'load', method: r.method(), url: r.url(), body: r.postData() || '', headers: JSON.stringify(r.headers()) }));
      page.on('websocket', ws => fail('WebSocket opened: ' + ws.url()));
      await page.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());

      // Tripwires for every API that could carry text off the page or keep it.
      await page.addInitScript(() => {
        window.__hits = [];
        const hit = n => window.__hits.push(n);
        for (const k of ['setItem']) { for (const S of [Storage.prototype]) { const o = S[k]; S[k] = function () { hit('Storage.' + k); return o.apply(this, arguments); }; } }
        const cd = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
        Object.defineProperty(document, 'cookie', { configurable: true, get() { return cd.get.call(document); }, set(v) { hit('document.cookie='); return cd.set.call(document, v); } });
        const sb = navigator.sendBeacon; navigator.sendBeacon = function () { hit('sendBeacon'); return sb.apply(this, arguments); };
        const xo = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function () { hit('XMLHttpRequest'); return xo.apply(this, arguments); };
        const io = indexedDB.open.bind(indexedDB); indexedDB.open = function () { hit('indexedDB.open'); return io.apply(null, arguments); };
        window.__clip = null;
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: t => (window.__clip = t, Promise.resolve()) } });
      });

      const tag = `[${mode}/${path}] `;
      await page.goto(BASE + '/put-it-to-work');
      await page.waitForSelector('#main');
      const loadCount = requests.length;
      typing = true;

      await page.click(`[data-action=setMode][data-value=${mode}]`);
      await page.click(`[data-action=setPath][data-value=${path}]`);
      await page.click('[data-action=begin]');
      let typed = 0;
      for (;;) {
        await page.click('#reveal-btn'); // open so the optional "own text" box exists
        for (const ta of await page.$$('textarea[data-bind]')) { await ta.fill(CANARY + ' ' + (++typed)); }
        const label = await page.$eval('[data-action=next]', e => e.textContent);
        await page.click('[data-action=next]');
        if (label === 'Finish') break;
      }
      for (const ta of await page.$$('textarea[data-bind]')) { await ta.fill(CANARY + ' ' + (++typed)); }
      await page.click('[data-action=copy]');
      await page.waitForTimeout(100);
      const clip = await page.evaluate(() => window.__clip);
      if (!clip || !clip.includes(CANARY)) fail(tag + 'Copy did not put typed text on the clipboard');
      await page.click('[data-action=back]'); await page.click('[data-action=next]');

      // The worksheet link is the only other thing on the closing screen that touches the network.
      // It is a plain <a href download> (always a GET). Chromium does not report download navigations
      // as page requests, so assert on the download's URL: same-origin static PDF, no query string.
      const link = await page.$('a[download]');
      if (!link) fail(tag + 'no worksheet download link on the closing screen');
      else {
        const [dl] = await Promise.all([page.waitForEvent('download'), link.click()]);
        const u = dl.url();
        if (!u.startsWith(BASE + '/assets/materials/put-it-to-work/') || !/\.pdf$/.test(u) || u.includes('?') || u.includes(CANARY)) {
          fail(tag + 'worksheet link is not a plain static PDF URL: ' + u);
        }
        if (!/\.pdf$/.test(dl.suggestedFilename())) fail(tag + 'worksheet link did not download a PDF');
      }

      await page.click('[data-action=reset]'); await page.click('[data-action=resetYes]');

      // 1. Network: nothing at all after typing began, and nothing anywhere containing the canary.
      const after = requests.filter(r => r.phase === 'after-typing-began');
      if (after.length) fail(tag + 'network requests after typing began: ' + after.map(r => r.method + ' ' + r.url).join(', '));
      for (const r of requests) if ((r.url + r.body + r.headers).includes(CANARY)) fail(tag + 'canary found in request ' + r.method + ' ' + r.url);
      const loadReqs = requests.slice(0, loadCount).filter(r => /^http:\/\/127\./.test(r.url));
      for (const r of loadReqs) if (r.method !== 'GET' || r.body) fail(tag + 'non-GET or body at load: ' + r.method + ' ' + r.url);

      // 2. Storage, cookies, tripwires.
      const store = await page.evaluate(async () => ({
        ls: localStorage.length, ss: sessionStorage.length, cookie: document.cookie,
        idb: indexedDB.databases ? (await indexedDB.databases()).length : 0,
        caches: 'caches' in window ? (await caches.keys()).length : 0,
        hits: window.__hits,
      }));
      if (store.ls || store.ss) fail(tag + `web storage not empty (local ${store.ls}, session ${store.ss})`);
      if (store.cookie || (await ctx.cookies()).length) fail(tag + 'cookies present');
      if (store.idb || store.caches) fail(tag + 'IndexedDB or Cache storage present');
      if (store.hits.length) fail(tag + 'tripwire fired: ' + store.hits.join(', '));

      // 3. Reload: typed text must be gone.
      await page.click('[data-action=begin]'); await page.reload(); await page.waitForSelector('#main');
      await page.click('[data-action=begin]');
      const leftover = await page.$$eval('textarea', ts => ts.map(t => t.value).join(''));
      if (leftover) fail(tag + 'text survived a reload');

      log.push(`${tag}typed ${typed} fields; load requests: ${loadReqs.map(r => r.url.replace(BASE, '')).join(' ')}; requests after typing: ${after.length}; worksheet link: static PDF download`);
      await ctx.close();
    }
  }
  await browser.close();
  log.forEach(l => console.log(l));
  if (failures.length) { console.log(`\n${failures.length} failure(s)`); process.exit(1); }
  console.log('OK: no typed text reached the network, storage, or cookies.');
})().catch(e => { console.error(e); process.exit(2); });
