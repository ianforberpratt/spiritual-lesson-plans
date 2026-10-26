#!/usr/bin/env node
// Browser test for /couples-worksheet (the quick check-in): ticks every row for both partners, types
// unique canary strings into the name boxes, then fails if anything leaves the page (POST, beacon,
// storage write, cookie, websocket, or a canary in any request). Also checks that the chart draws,
// the email text and the shareable picture carry the answers, and that the feedback box is separate.
//
//   perl scripts/serve.pl . 8099 &            # local preview server (mirrors Vercel cleanUrls)
//   NODE_PATH=$(npm root -g) node scripts/test-couples-checkin-privacy.js [base-url]
//
// Needs Playwright with Chromium. Default base URL: http://127.0.0.1:8099
// Third-party hosts (Google Fonts) are blocked so the test is offline-safe.

const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:8099';
const OUT = process.env.OUT_DIR || '/tmp';
const NAME_A = 'CanaryAnna7c41';
const NAME_B = 'CanaryBen9d2e';
const failures = [];
const fail = m => { failures.push(m); console.log('FAIL: ' + m); };
const ok = m => console.log('ok:   ' + m);

const ROWS = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9'];
// Partner A says: "I carry most of Doing and Thinking." Partner B says: "It's fairly even."
const A_TICKS = { r1: -2, r2: -2, r3: -1, r4: -2, r5: -1, r6: -2, r7: 1, r8: 0, r9: 1, f1: -1, f2: 2, f3: -1 };
const B_TICKS = { r1: -1, r2: 0, r3: 0, r4: 0, r5: 0, r6: -1, r7: -2, r8: -1, r9: -1, f1: 0, f2: 1, f3: 1 };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 400, height: 900 }, reducedMotion: 'reduce', acceptDownloads: true });
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

  await page.goto(BASE + '/couples-worksheet');
  await page.waitForSelector('#sheet');
  const loadRequests = requests.length;

  const rowCount = await page.$$eval('#sheet .row', rs => rs.length);
  rowCount === 12 ? ok('12 tick rows (9 who-carries-it + 3 how-it-feels)') : fail('expected 12 rows, saw ' + rowCount);
  const taCount = await page.$$eval('#sheet textarea', t => t.length);
  taCount === 0 ? ok('no free-text boxes in the main check-in') : fail('main check-in has ' + taCount + ' text boxes');

  // names flow through
  await page.fill('#nameA', NAME_A);
  await page.fill('#nameB', NAME_B);
  const respA = await page.textContent('[data-lbl="a"] >> nth=0');
  respA === NAME_A ? ok('partner name replaces "Partner 1"') : fail('name did not update: ' + respA);
  const scaleLbl = await page.textContent('[data-name=r1] .scale label:nth-child(5) span');
  scaleLbl === NAME_B ? ok('scale end label shows the other partner by name') : fail('scale label was: ' + scaleLbl);

  // tick as A
  async function tick(ticks) {
    for (const [k, v] of Object.entries(ticks)) await page.check(`input[name=${k}][value="${v}"]`);
  }
  await tick(A_TICKS);
  await page.click('#showBtn');
  await page.waitForSelector('#chart svg');
  ok('picture appears after ticking as partner 1');
  let svg = await page.innerHTML('#chart');
  (svg.includes('<circle') && !svg.includes('<polygon')) ? ok('one view: circle markers only') : fail('single view should show only partner 1 markers');
  const startTxt1 = await page.innerText('#startHere');
  /Biggest lean/.test(startTxt1) ? ok('"Biggest lean" shown: ' + startTxt1.replace(/\n+/g, ' ').slice(0, 90)) : fail('no biggest-lean line: ' + startTxt1);

  // switch to partner 2 and tick their view
  await page.click('#otherBtn');
  const hidden = await page.$eval('#results', r => r.hidden);
  hidden ? ok('picture is hidden while the other partner answers') : fail('picture stayed visible during partner 2 turn');
  const stillTicked = await page.$$eval('#sheet input[type=radio]:checked', xs => xs.length);
  stillTicked === 0 ? ok('partner 2 starts with blank ticks') : fail(stillTicked + ' ticks carried over to partner 2');
  await tick(B_TICKS);
  await page.click('#showBtn');
  await page.waitForSelector('#chart polygon');
  svg = await page.innerHTML('#chart');
  (svg.includes('<circle') && svg.includes('<polygon')) ? ok('two views: circle and diamond markers') : fail('expected both marker shapes');
  const chartText = await page.innerText('#chart');
  /You see this differently/.test(chartText) ? ok('gap between the two views is called out') : fail('no "see this differently" callout. Chart: ' + chartText.replace(/\n+/g, ' | '));
  /carries (a bit|much) more/.test(chartText) ? ok('lean caption uses names') : fail('no lean caption');
  chartText.includes(NAME_A.slice(0, 11)) ? ok('names are on the chart') : fail('names missing from chart');

  // switching back restores partner 1's ticks
  await page.click('#otherBtn');
  const restored = await page.$$eval('#sheet input[type=radio]:checked', xs => xs.length);
  restored === 12 ? ok('partner 1 ticks restored when switching back') : fail('partner 1 had ' + restored + ' ticks restored');
  await page.click('#showBtn');

  // the answers are 12 per partner, and keyboard/aria
  const aria = await page.getAttribute('input[name=r1][value="-2"]', 'aria-label');
  /Money, bills/.test(aria || '') ? ok('radios have descriptive aria-labels') : fail('aria-label was: ' + aria);

  // experiment pick
  await page.check('input[name=exp] >> nth=2');

  // email: text carries answers and the picture summary
  await page.click('[data-act=email]');
  await page.waitForTimeout(400);
  const status = await page.innerText('#status');
  const clip = await page.evaluate(() => navigator.clipboard.readText().catch(() => ''));
  if (/copied|Opening your email/.test(status)) ok('email button responded: ' + status);
  else fail('email button gave no expected status: ' + status);
  if (clip) {
    (clip.includes(NAME_A) && clip.includes('Money, bills') && clip.includes('== The picture ==') && clip.includes('30-day experiment'))
      ? ok('email text carries names, answers, picture summary and experiment (' + clip.length + ' chars)')
      : fail('email text missing pieces');
  } else ok('short email path used mailto directly');

  // print / PDF: controls hidden, chart visible
  await page.emulateMedia({ media: 'print' });
  const printState = await page.evaluate(() => ({
    bar: getComputedStyle(document.querySelector('.top')).display,
    privacy: getComputedStyle(document.querySelector('.privacy')).display,
    resp: getComputedStyle(document.querySelector('.resp')).display,
    chart: getComputedStyle(document.querySelector('#chart')).display,
    fbk: getComputedStyle(document.querySelector('.fbk')).display,
  }));
  (printState.bar === 'none' && printState.privacy === 'none' && printState.resp === 'none' && printState.fbk === 'none' && printState.chart !== 'none')
    ? ok('print hides controls and feedback, keeps the chart') : fail('print state wrong: ' + JSON.stringify(printState));
  const pdf = await page.pdf({ format: 'Letter', printBackground: false });
  pdf.length > 5000 ? ok('print produces a PDF (' + pdf.length + ' bytes)') : fail('PDF too small');
  fs.writeFileSync(OUT + '/checkin-print.pdf', pdf);
  await page.emulateMedia({ media: 'screen' });

  // share picture (with an optional note typed into the picture)
  await page.fill('#noteIn', 'CanaryNote our real answers, taken separately');
  await page.click('[data-act=share]');
  await page.waitForSelector('#shareBox:not([hidden])', { timeout: 5000 }).catch(() => { });
  const shareVisible = await page.$eval('#shareBox', b => !b.hidden);
  shareVisible ? ok('shareable picture is created') : fail('share picture did not appear');
  const imgInfo = await page.$eval('#shareImg', i => ({ src: i.src.slice(0, 5), w: i.naturalWidth, h: i.naturalHeight }));
  (imgInfo.src === 'blob:' && imgInfo.w === 1080 && imgInfo.h > 600) ? ok(`picture is a local PNG ${imgInfo.w}x${imgInfo.h}`) : fail('bad share image: ' + JSON.stringify(imgInfo));

  // --- privacy verdicts (before anything is fetched from the page)
  const hits = await page.evaluate(() => window.__hits);
  hits.length ? fail('privacy-sensitive calls: ' + hits.join(', ')) : ok('no storage, cookie, beacon, XHR, fetch or IndexedDB calls');
  const cookies = await ctx.cookies();
  cookies.length ? fail('cookies set: ' + JSON.stringify(cookies.map(c => c.name))) : ok('no cookies');
  const ls = await page.evaluate(() => localStorage.length + sessionStorage.length);
  ls ? fail('web storage has ' + ls + ' entries') : ok('web storage empty');
  const posts = requests.filter(r => r.method !== 'GET' && r.method !== 'HEAD');
  posts.length ? fail('non-GET requests: ' + posts.map(p => p.method + ' ' + p.url).join(', ')) : ok('no POST or other non-GET requests');
  const leaked = requests.filter(r => !r.url.startsWith('mailto:') && (r.url.includes('Canary') || r.body.includes('Canary')));
  leaked.length ? fail('a name appeared in a request: ' + leaked.map(r => r.url).join(', ')) : ok('names never appear in any request');
  const afterLoad = requests.slice(loadRequests).filter(r => !/^(mailto|data|blob):/.test(r.url));
  afterLoad.length ? fail('requests after load: ' + afterLoad.map(r => r.url).join(', ')) : ok('zero network requests after the page loads');

  // screenshots + the PNG itself (read AFTER the privacy verdicts, since fetch is instrumented)
  await page.evaluate(() => { document.querySelector('#nameA').value = 'Sam'; document.querySelector('#nameB').value = 'Alex'; document.querySelector('#nameA').dispatchEvent(new Event('input', { bubbles: true })); });
  await page.screenshot({ path: OUT + '/checkin-mobile-top.png', fullPage: false });
  await page.click('#showBtn');
  await page.locator('#results').screenshot({ path: OUT + '/checkin-results.png' });
  await page.click('[data-act=share]');
  await page.waitForFunction(() => { const i = document.getElementById('shareImg'); return i && i.complete && i.naturalWidth > 0; });
  const b64 = await page.evaluate(async () => {
    const blob = await (await fetch(document.getElementById('shareImg').src)).blob();
    return await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.readAsDataURL(blob); });
  });
  fs.writeFileSync(OUT + '/checkin-share.png', Buffer.from(b64, 'base64'));
  ok('saved screenshots and share picture to ' + OUT);

  // Start over clears everything
  await page.click('#clearBtn');
  await page.waitForTimeout(150);
  const left = await page.$$eval('#sheet input[type=radio]:checked', xs => xs.length);
  const nm = await page.$eval('#nameA', i => i.value) + await page.$eval('#noteIn', i => i.value);
  const resHidden = await page.$eval('#results', r => r.hidden);
  (left === 0 && nm === '' && resHidden) ? ok('Start over clears ticks, names and picture') : fail(`Start over left ${left} ticks, name "${nm}", results hidden=${resHidden}`);
  await page.click('#showBtn');
  (await page.innerText('#status')).includes('Tick a few rows') ? ok('empty page asks for ticks') : fail('empty page did not prompt');

  // --- feedback box: a separate, user-initiated send of ONLY what is typed into it
  const FB = 'FEEDBACK-CANARY-3d9e1f';
  let fbCount = 0, fbBody = '', fbMethod = '';
  await page.route('**/api/feedback', async r => { fbCount++; fbMethod = r.request().method(); fbBody = r.request().postData() || ''; await r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); });
  await page.fill('#nameA', NAME_A);
  await page.check('input[name=r1][value="-2"]');
  const beforeFb = requests.length;
  await page.check('input[name=fbrate] >> nth=0');
  await page.fill('#fbWorked', FB + ' worked');
  await page.fill('#fbHelp', FB + ' help');
  await page.waitForTimeout(200);
  requests.length === beforeFb ? ok('typing in the feedback box makes no request') : fail('requests fired while typing feedback');
  await page.click('#fbSend');
  await page.waitForTimeout(500);
  fbCount === 1 && fbMethod === 'POST' ? ok('Send makes exactly one POST to /api/feedback') : fail('expected one POST, saw ' + fbCount + ' ' + fbMethod);
  fbBody.includes(FB) ? ok('feedback text is in the message') : fail('feedback text missing');
  (!fbBody.includes('Canary') && !fbBody.includes('Money')) ? ok('names and ticks are NOT in the feedback message') : fail('check-in data leaked into feedback message');
  (await page.innerText('#fbStatus')).includes('Thank you') ? ok('thank-you shown') : fail('no thank-you shown');
  await page.click('#fbSend'); await page.waitForTimeout(200);
  fbCount === 1 ? ok('empty feedback is not sent') : fail('empty feedback was sent');

  // the deeper worksheet is still reachable and linked
  const deeperLink = await page.$('a[href="/couples-worksheet-deeper"]');
  deeperLink ? ok('link to the deeper worksheet is present') : fail('missing link to deeper worksheet');
  const res = await page.request.get(BASE + '/couples-worksheet-deeper');
  res.ok() ? ok('/couples-worksheet-deeper loads') : fail('deeper page status ' + res.status());

  await browser.close();
  console.log(failures.length ? `\n${failures.length} FAILURE(S)` : '\nALL CHECKS PASSED');
  process.exit(failures.length ? 1 : 0);
})();
