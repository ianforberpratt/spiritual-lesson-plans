#!/usr/bin/env node
// Browser test for /dimmer: privacy (storage, cookies, network), all 25 dim x flicker cards,
// 988 off-ramp on opening and card, reduced motion, no-JS fallback, mobile + desktop screenshots.
//   perl scripts/serve.pl . 8099 &
//   NODE_PATH=$(npm root -g) node scripts/test-dimmer.js [base-url] [screenshot-dir]
const { chromium } = require('playwright');
const BASE = process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:8099';
const SHOTS = process.argv[3] || '';
const CANARY = 'CANARY-dimmer-91c3-do-not-send';
const DIMS = ['Busy', 'Scrolling', '“Fine”', 'Helpful', 'Funny'];
const FLICKERS = ['Being outside', 'A person who asks nothing of me', 'Making or fixing something with my hands', 'Music that stops me', 'Being quietly useful to someone'];
const failures = [];
const fail = m => { failures.push(m); console.log('FAIL: ' + m); };
const OFF = 'If this feels like more than numb, please talk to someone. In the US, you can call or text 988. Elsewhere, search for your local crisis line.';

(async () => {
  const browser = await chromium.launch();
  const cards = new Set();
  for (let d = 0; d < 5; d++) for (let f = 0; f < 5; f++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const reqs = [];
    page.on('request', r => reqs.push({ m: r.method(), u: r.url(), b: r.postData() || '' }));
    page.on('pageerror', e => fail(`[${d},${f}] page error: ${e.message}`));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|ERR_BLOCKED/.test(m.text())) fail(`[${d},${f}] console error: ${m.text()}`); });
    await page.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());
    await page.addInitScript(() => {
      window.__hits = []; const hit = n => window.__hits.push(n);
      const si = Storage.prototype.setItem; Storage.prototype.setItem = function () { hit('Storage.setItem'); return si.apply(this, arguments); };
      const cd = Object.getOwnPropertyDescriptor(Document.prototype, 'cookie');
      Object.defineProperty(document, 'cookie', { configurable: true, get() { return cd.get.call(document); }, set(v) { hit('cookie='); return cd.set.call(document, v); } });
      const sb = navigator.sendBeacon; navigator.sendBeacon = function () { hit('sendBeacon'); return sb ? sb.apply(this, arguments) : false; };
      const xo = XMLHttpRequest.prototype.open; XMLHttpRequest.prototype.open = function () { hit('XHR'); return xo.apply(this, arguments); };
      const io = indexedDB.open.bind(indexedDB); indexedDB.open = function () { hit('indexedDB'); return io.apply(null, arguments); };
      const fe = window.fetch; window.fetch = function () { hit('fetch'); return fe.apply(this, arguments); };
    });
    await page.goto(BASE + '/dimmer');
    await page.waitForSelector('.dm-h');
    const opening = await page.innerText('#dimmer');
    if (!opening.includes(OFF)) fail('opening missing 988 off-ramp');
    if (!opening.includes('Not anxious. Not depressed. Just… dim. Take three minutes.')) fail('opening hook missing');
    if (d === 0 && f === 0 && SHOTS) await page.screenshot({ path: `${SHOTS}/mobile-1-opening.png` });
    await page.click(`.dm-choice:has(.dm-choice-label:text-is("${DIMS[d]}"))`);
    await page.waitForSelector(`.dm-choice:has(.dm-choice-label:text-is("${FLICKERS[f]}"))`);
    if (d === 0 && f === 0 && SHOTS) await page.screenshot({ path: `${SHOTS}/mobile-2-flicker.png` });
    await page.click(`.dm-choice:has(.dm-choice-label:text-is("${FLICKERS[f]}"))`);
    await page.waitForSelector('text=This is just who I am now');
    await page.click('button:text-is("Continue")');
    await page.waitForSelector('text=Nothing is missing from you.');
    await page.click('button:text-is("See my card")');
    await page.waitForSelector('.dm-card');
    const card = await page.innerText('.dm-card');
    const all = await page.innerText('#dimmer');
    for (const need of ['Your Dimmer Settings', 'HOW YOU GO DIM', 'ONE WAY TO SEE IT', 'THE BELIEF TO QUESTION', 'This is just who I am now.', 'NOTHING IS MISSING'.slice(0, 0), 'Nothing is missing from you.', 'WHAT TURNS YOU UP', 'RIGHT NOW, IN ONE MINUTE', 'TRY THIS WEEK', 'HOLD ONTO THIS', 'Hold thought steadfastly to the enduring, the good, and the true', 'Mary Baker Eddy, Science and Health, p. 261', 'A mirror, not a diagnosis.'])
      if (need && !card.includes(need)) fail(`[${d},${f}] card missing: ${need}`);
    if (/undefined|null|NaN|\[object/.test(card)) fail(`[${d},${f}] card has placeholder junk`);
    if (/depress|dissociat|anxiety|disorder|diagnos(?!is\.)/i.test(card.replace('A mirror, not a diagnosis.', ''))) fail(`[${d},${f}] clinical term on card`);
    if (!all.includes(OFF)) fail(`[${d},${f}] card screen missing 988 off-ramp`);
    cards.add(card);
    if (d === 0 && f === 3 && SHOTS) await page.screenshot({ path: `${SHOTS}/mobile-3-card.png`, fullPage: true });
    if (d === 3 && f === 1) {
      // typed text: own line replaces the quote; canary must go nowhere
      await page.fill('#dm-own-text', CANARY);
      const hold = await page.innerText('#dm-hold');
      if (!hold.includes(CANARY)) fail('own line did not show in Hold onto this');
      await page.fill('#dm-own-text', '');
      if (!(await page.innerText('#dm-hold')).includes('Science and Health, p. 261')) fail('quote did not return after clearing own line');
      await page.fill('#dm-own-text', CANARY);
      // slider: keyboard-operable and labelled
      await page.focus('#dm-slider'); await page.keyboard.press('ArrowLeft');
      const lab = await page.getAttribute('#dm-slider', 'aria-label');
      if (!lab) fail('slider has no accessible name');
      if (!(await page.getAttribute('#dm-slider', 'aria-valuetext'))) fail('slider has no aria-valuetext');
      await page.click('button:text-is("Start over")');
      await page.waitForSelector('.dm-choice:has(.dm-choice-label:text-is("Busy"))');
      if ((await page.innerText('#dimmer')).includes(CANARY)) fail('canary survived Start over');
    }
    await page.waitForTimeout(150);
    const hits = await page.evaluate(() => window.__hits);
    if (hits.length) fail(`[${d},${f}] persistence/network API called: ${hits.join(', ')}`);
    const local = reqs.filter(r => /^http:\/\/127\./.test(r.u));
    for (const r of reqs) {
      if (r.m !== 'GET') fail(`non-GET request: ${r.m} ${r.u}`);
      if (r.u.includes(CANARY) || r.b.includes(CANARY)) fail('canary appeared in a request');
    }
    const unexpected = local.filter(r => !/\/dimmer$|\/assets\/(css|js)\/(style|dimmer)\.(css|js)$/.test(r.u) && !/favicon/.test(r.u));
    if (unexpected.length) fail(`unexpected local requests: ${unexpected.map(r => r.u).join(' ')}`);
    const store = await page.evaluate(() => ({ l: localStorage.length, s: sessionStorage.length, c: document.cookie }));
    if (store.l || store.s || store.c) fail(`storage not empty: ${JSON.stringify(store)}`);
    await ctx.close();
  }
  console.log(`distinct cards: ${cards.size} / 25`);
  if (cards.size !== 25) fail('expected 25 distinct cards');

  // Desktop view + no-JS fallback
  const dctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const dp = await dctx.newPage(); await dp.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());
  await dp.goto(BASE + '/dimmer'); await dp.waitForSelector('.dm-h');
  if (SHOTS) await dp.screenshot({ path: `${SHOTS}/desktop-opening.png` });
  const hs = await dp.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (hs) fail('desktop horizontal scroll');
  const navTxt = await dp.innerText('.site-nav'); if (/dimmer/i.test(navTxt)) fail('Dimmer appears in top nav');
  await dctx.close();

  const nctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const np = await nctx.newPage(); await np.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());
  await np.goto(BASE + '/dimmer');
  const nt = await np.innerText('#dimmer');
  if (!nt.includes(OFF)) fail('no-JS fallback missing off-ramp');
  if (!/needs JavaScript/.test(nt) || !/Dimmer/.test(nt)) fail('no-JS fallback missing explanation');
  if (SHOTS) await np.screenshot({ path: `${SHOTS}/mobile-nojs.png`, fullPage: true });
  if (await np.evaluate(() => document.documentElement.scrollWidth > innerWidth)) fail('no-JS horizontal scroll at mobile width');
  await nctx.close();

  // Reduced motion: no running animations on the light or screens
  const rctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const rp = await rctx.newPage(); await rp.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());
  await rp.goto(BASE + '/dimmer'); await rp.waitForSelector('.dm-h');
  const anim = await rp.evaluate(() => [...document.querySelectorAll('.dm-glow,.dm-screen-in,.dm-mote')].map(e => getComputedStyle(e).animationName));
  if (anim.some(a => a !== 'none')) fail('animations still running under reduced motion: ' + anim.join(','));
  await rctx.close();
  // And motion allowed: the glow does breathe
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mp = await mctx.newPage(); await mp.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());
  await mp.goto(BASE + '/dimmer'); await mp.waitForSelector('.dm-h');
  if ((await mp.evaluate(() => getComputedStyle(document.querySelector('.dm-glow')).animationName)) === 'none') fail('glow does not animate when motion is allowed');
  if ((await mp.evaluate(() => getComputedStyle(document.querySelector('.dm-mote')).animationName)) === 'none') fail('motes do not animate when motion is allowed');
  await mctx.close();

  await browser.close();
  console.log(failures.length ? `\n${failures.length} FAILURE(S)` : '\nALL CHECKS PASSED');
  process.exit(failures.length ? 1 : 0);
})();
