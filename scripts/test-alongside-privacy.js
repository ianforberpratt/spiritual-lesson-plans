#!/usr/bin/env node
// Browser privacy test for /put-it-to-work/alongside: types a unique canary string into EVERY
// text box the practice offers, walks the solo path and the group path,
// and fails if the canary (or any POST, beacon, storage write or cookie) shows up anywhere.
//
//   perl scripts/serve.pl . 8099 &            # local preview server (mirrors Vercel cleanUrls)
//   NODE_PATH=$(npm root -g) node scripts/test-alongside-privacy.js [base-url]
//
// Needs Playwright with Chromium. Default base URL: http://127.0.0.1:8099
// Third-party hosts (Google Fonts) are blocked so the test is offline-safe; that only removes
// requests that cannot carry typed text anyway.

const { chromium } = require('playwright');
const BASE = process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:8099';
const CANARY = 'CANARY-5b2e81-do-not-send';
const failures = [];
const fail = m => { failures.push(m); console.log('FAIL: ' + m); };

(async () => {
  const browser = await chromium.launch();
  for (const mode of ['solo', 'group']) {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const requests = [];
    page.on('request', r => requests.push({ method: r.method(), url: r.url(), body: r.postData() || '' }));
    page.on('websocket', ws => fail('WebSocket opened: ' + ws.url()));
    page.on('pageerror', e => fail('page error: ' + e.message));
    await page.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());

    await page.addInitScript(() => {
      window.__hits = [];
      const hit = n => window.__hits.push(n);
      const si = Storage.prototype.setItem;
      Storage.prototype.setItem = function () { hit('Storage.setItem'); return si.apply(this, arguments); };
      const cd = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      Object.defineProperty(document, 'cookie', { configurable: true, get() { return cd.get.call(document); }, set(v) { hit('document.cookie='); return cd.set.call(document, v); } });
      const sb = navigator.sendBeacon; navigator.sendBeacon = function () { hit('sendBeacon'); return sb ? sb.apply(this, arguments) : false; };
      const xo = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function () { hit('XMLHttpRequest'); return xo.apply(this, arguments); };
      const io = indexedDB.open.bind(indexedDB); indexedDB.open = function () { hit('indexedDB.open'); return io.apply(null, arguments); };
      const f = window.fetch; window.fetch = function () { hit('fetch'); return f.apply(this, arguments); };
    });

    const tag = `[${mode}] `;
    await page.goto(BASE + '/put-it-to-work/alongside');
    await page.waitForSelector('#alongside-host');
    await page.waitForSelector('#app');
    const B = t => page.click(`button:text-is("${t}")`);
    const fill = async (sel, v) => { const el = await page.$(sel); if (el) await el.fill(v); };

    if (mode === 'quick') {
      await B('Try it for 5 minutes'); await B('Next');
      await page.click('.chip >> nth=1'); await B('Next');
      await B('Skip');
      await page.click('.chip >> nth=0'); await B('Next');
      await fill('#who', CANARY + ' who'); await B('Next');
      await page.click('.chip >> nth=2'); await B('Make my card');
    } else {
      await B(mode === 'group' ? 'With a group' : 'Start on your own');
      if (mode === 'group') { await fill('#crewown', CANARY + ' crew'); await B('Next'); }
      await B('Next');
      await B('Keep reading'); await B('Keep reading');
      await page.click('button.opt >> nth=1'); await B('Next');
      await page.click('button.opt >> nth=1'); await B('Next');
      if (mode === 'group') { await fill('#word', CANARY + ' word'); await B('Unlock the next part'); await fill('#word', 'banana'); await B('Unlock the next part'); }
      await page.click('button.scen >> nth=7');
      const gateWords = ['pickle', 'llama', 'waffle', 'hiccup'];
      for (let st = 0; st < 4; st++) {
        await B("I've thought about it"); await page.click('button.opt >> nth=1'); await B('Next');
        if (st === 0) { await page.click('.chip >> nth=1'); await B('Next'); }
        else if (st === 1) { await B('Skip'); }
        else if (st === 2) { await page.click('.chip >> nth=0'); await B('Next'); }
        else { await fill('#who', CANARY + ' who'); await B('Next'); await page.click('button.opt >> nth=1'); await B('Next'); }
        if (mode === 'group') { await fill('#word', gateWords[st]); await B('Unlock the next part'); }
      }
      await fill('#kind', CANARY + ' kind'); await fill('#pledge', CANARY + ' pledge');
      await B('Next'); await page.click('.chip >> nth=2'); await B('Make my card');
    }
    await page.waitForTimeout(300);

    const cardText = await page.innerText('#app');
    if (!/ALONGSIDE CARD/i.test(cardText)) fail(tag + 'did not reach the card');

    // 1. Nothing typed may leave the page.
    for (const r of requests) {
      if (r.method !== 'GET') fail(tag + `non-GET request: ${r.method} ${r.url}`);
      if (r.url.includes('CANARY') || r.body.includes('CANARY')) fail(tag + 'canary found in a request: ' + r.url);
    }
    // 2. Nothing may be stored.
    const hits = await page.evaluate(() => window.__hits);
    if (hits.length) fail(tag + 'forbidden API used: ' + hits.join(', '));
    const store = await page.evaluate(() => JSON.stringify([localStorage, sessionStorage, document.cookie]));
    if (store.includes('CANARY')) fail(tag + 'canary found in storage or cookies');
    const cookies = await ctx.cookies();
    if (cookies.length) fail(tag + 'cookies set: ' + cookies.map(c => c.name).join(', '));
    console.log(tag + 'requests: ' + requests.length + ', all GET to this site');
    await ctx.close();
  }
  await browser.close();
  if (failures.length) { console.log('\n' + failures.length + ' failure(s).'); process.exit(1); }
  console.log('OK: Alongside privacy test passed (typed text never left the page or was stored).');
})();
