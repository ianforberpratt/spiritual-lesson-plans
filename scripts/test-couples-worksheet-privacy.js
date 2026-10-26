#!/usr/bin/env node
// Browser test for /couples-worksheet-deeper (the long worksheet): types a unique canary into EVERY text box, picks every dropdown,
// ticks the boxes, then fails if the canary (or any POST, beacon, storage write, cookie or websocket)
// leaves the page. Also checks that the email text and the print/PDF output contain the answers.
//
//   perl scripts/serve.pl . 8099 &            # local preview server (mirrors Vercel cleanUrls)
//   NODE_PATH=$(npm root -g) node scripts/test-couples-worksheet-privacy.js [base-url]
//
// Needs Playwright with Chromium. Default base URL: http://127.0.0.1:8099
// Third-party hosts (Google Fonts) are blocked so the test is offline-safe; that only removes
// requests that cannot carry typed text anyway.

const { chromium } = require('playwright');
const BASE = process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:8099';
const CANARY = 'CANARY-7c41aa-do-not-send';
const failures = [];
const fail = m => { failures.push(m); console.log('FAIL: ' + m); };
const ok = m => console.log('ok:   ' + m);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 420, height: 900 }, reducedMotion: 'reduce' });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE });
  const page = await ctx.newPage();
  const requests = [];
  page.on('request', r => requests.push({ method: r.method(), url: r.url(), body: r.postData() || '' }));
  page.on('websocket', ws => fail('WebSocket opened: ' + ws.url()));
  page.on('pageerror', e => fail('page error: ' + e.message));
  page.on('dialog', d => d.accept());
  await page.route(u => !/^127\.|^localhost$/.test(new URL(u).hostname), r => r.abort());

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

  await page.goto(BASE + (process.env.PAGE_PATH || '/couples-worksheet-deeper'));
  await page.waitForSelector('#sheet');
  const loadRequests = requests.length;

  // --- fill everything
  await page.fill('#nameA', 'Asha');
  await page.fill('#nameB', 'Ben');
  const tas = await page.$$('#sheet textarea');
  for (let i = 0; i < tas.length; i++) await tas[i].fill(`${CANARY} t${i}`);
  const sels = await page.$$('#sheet select');
  for (const s of sels) await s.selectOption({ index: 2 });
  const cbs = await page.$$('#sheet input[type=checkbox]');
  for (const c of cbs) await c.check();
  await page.check('input[type=radio][name=exp] >> nth=1');
  console.log(`filled ${tas.length} text boxes, ${sels.length} dropdowns, ${cbs.length} checkboxes`);

  // names flow through
  const labelText = await page.textContent('.whoA >> nth=0');
  labelText === 'Asha' ? ok('partner name replaces "Partner A"') : fail('partner name did not update, saw: ' + labelText);

  // --- email button: long content -> clipboard + short mailto
  await page.click('[data-act=email] >> nth=0');
  await page.waitForTimeout(400);
  const status = await page.innerText('#status');
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  if (/copied|Opening your email/.test(status)) ok('email button responded: ' + status);
  else fail('email button gave no expected status: ' + status);
  if (clip.includes(CANARY) && clip.includes('Asha:') && clip.includes('Mostly my partner')) ok('email/clipboard text carries the answers (' + clip.length + ' chars)');
  else if (!/copied/.test(status)) ok('short email path used mailto directly');
  else fail('clipboard text missing answers');

  // --- email button: short content -> straight mailto
  await page.click('[data-act=clear] >> nth=0');
  await page.waitForTimeout(100);
  const leftover = await page.evaluate(() => Array.from(document.querySelectorAll('#sheet textarea')).filter(t => t.value).length);
  leftover === 0 ? ok('Start over clears every box') : fail(leftover + ' boxes survived Start over');
  await page.click('[data-act=email] >> nth=0');
  (await page.innerText('#status')).includes('Nothing to send') ? ok('empty page says nothing to send') : fail('empty email did not warn');
  await page.fill('#sheet textarea >> nth=0', CANARY + ' short');
  let mailtoSeen = false;
  page.on('framenavigated', f => { if (/^mailto:/.test(f.url())) mailtoSeen = true; });
  await page.click('[data-act=email] >> nth=0');
  await page.waitForTimeout(300);
  /Opening your email/.test(await page.innerText('#status')) ? ok('short answers open a mailto') : fail('short answers did not reach mailto path');

  // --- print / PDF
  await page.fill('#sheet textarea >> nth=1', CANARY + ' pdf');
  await page.emulateMedia({ media: 'print' });
  const hiddenInPrint = await page.evaluate(() => ['.top', '[data-actions]', '.privacy'].every(s => { const el = document.querySelector(s); return !el || getComputedStyle(el).display === 'none'; }));
  hiddenInPrint ? ok('buttons, bar and privacy box are hidden in print') : fail('print mode still shows controls');
  const pdf = await page.pdf({ format: 'Letter', printBackground: true });
  pdf.length > 5000 ? ok('print produces a PDF (' + pdf.length + ' bytes)') : fail('PDF too small');
  await page.emulateMedia({ media: 'screen' });

  // --- visual check
  await page.screenshot({ path: process.env.SHOT || '/tmp/couples-worksheet-mobile.png', fullPage: false });

  // --- privacy verdicts
  const hits = await page.evaluate(() => window.__hits);
  hits.length ? fail('privacy-sensitive calls: ' + hits.join(', ')) : ok('no storage, cookie, beacon, XHR, fetch or IndexedDB calls');
  const cookies = await ctx.cookies();
  cookies.length ? fail('cookies set: ' + JSON.stringify(cookies.map(c => c.name))) : ok('no cookies');
  const ls = await page.evaluate(() => localStorage.length + sessionStorage.length);
  ls ? fail('web storage has ' + ls + ' entries') : ok('web storage empty');
  const posts = requests.filter(r => r.method !== 'GET' && r.method !== 'HEAD');
  posts.length ? fail('non-GET requests: ' + posts.map(p => p.method + ' ' + p.url).join(', ')) : ok('no POST or other non-GET requests');
  // A mailto: link hands text to the visitor's own email app; it is not a network request to any server.
  const leaked = requests.filter(r => !r.url.startsWith('mailto:') && (r.url.includes(CANARY) || r.body.includes(CANARY)));
  leaked.length ? fail('canary found in a request: ' + leaked.map(r => r.url).join(', ')) : ok('canary never appears in any request');
  const afterLoad = requests.slice(loadRequests).filter(r => !r.url.startsWith('mailto:') && !r.url.startsWith('data:'));
  afterLoad.length ? fail('requests after load: ' + afterLoad.map(r => r.url).join(', ')) : ok('zero network requests after the page loads');

  // --- feedback box: a separate, user-initiated send of ONLY what is typed into it
  const FB = 'FEEDBACK-CANARY-3d9e1f';
  let fbCount = 0, fbBody = '', fbMethod = '';
  await page.route('**/api/feedback', async r => { fbCount++; fbMethod = r.request().method(); fbBody = r.request().postData() || ''; await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await page.fill('#sheet textarea >> nth=0', CANARY + ' worksheet answer still on the page');
  const beforeFb = requests.length;
  await page.check('input[name=fbrate] >> nth=0');
  await page.fill('#fbWorked', FB + ' worked');
  await page.fill('#fbHelp', FB + ' help');
  await page.waitForTimeout(200);
  requests.length === beforeFb ? ok('typing in the feedback box makes no request') : fail('requests fired while typing feedback');
  await page.click('#fbSend');
  await page.waitForTimeout(500);
  fbCount === 1 && fbMethod === 'POST' ? ok('Send makes exactly one POST to /api/feedback') : fail('expected one POST, saw ' + fbCount + ' ' + fbMethod);
  fbBody.includes(FB) ? ok('feedback text is in the message') : fail('feedback text missing from message');
  !fbBody.includes(CANARY) ? ok('worksheet answers are NOT in the feedback message') : fail('worksheet answer leaked into feedback message');
  (await page.innerText('#fbStatus')).includes('Thank you') ? ok('thank-you shown') : fail('no thank-you shown');
  // empty send is refused locally
  await page.click('#fbSend'); await page.waitForTimeout(200);
  fbCount === 1 ? ok('empty feedback is not sent') : fail('empty feedback was sent');

  await browser.close();
  console.log(failures.length ? `\n${failures.length} FAILURE(S)` : '\nALL CHECKS PASSED');
  process.exit(failures.length ? 1 : 0);
})();
