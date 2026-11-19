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

  // "Something else": put in your own flicker (all five dim types; canary on the first)
  for (let d = 0; d < 5; d++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const reqs = [];
    page.on('request', r => reqs.push({ m: r.method(), u: r.url(), b: r.postData() || '' }));
    page.on('pageerror', e => fail(`[custom ${d}] page error: ${e.message}`));
    await page.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());
    await page.addInitScript(() => { window.__hits = []; const si = Storage.prototype.setItem; Storage.prototype.setItem = function () { window.__hits.push('setItem'); return si.apply(this, arguments); }; });
    await page.goto(BASE + '/dimmer'); await page.waitForSelector('.dm-h');
    await page.click(`.dm-choice:has(.dm-choice-label:text-is("${DIMS[d]}"))`);
    await page.waitForSelector('text=What has gotten through lately?');
    if (!(await page.isDisabled('[data-act="custom-go"]', { strict: false }).catch(() => true))) fail('custom Continue should start disabled');
    await page.click('.dm-choice-other');
    if (await page.isDisabled('[data-act="custom-go"]')) { /* expected: empty */ } else fail('custom Continue enabled while empty');
    const text = d === 0 ? CANARY : 'a long shower';
    await page.fill('#dm-custom-text', text);
    await page.keyboard.press('Enter');
    await page.waitForSelector('text=This is just who I am now');
    await page.click('button:text-is("Continue")');
    await page.click('button:text-is("See my card")');
    await page.waitForSelector('.dm-card');
    const card = await page.innerText('.dm-card');
    for (const need of [text, 'WHAT TURNS YOU UP', 'RIGHT NOW, IN ONE MINUTE', 'TRY THIS WEEK', 'A mirror, not a diagnosis.', 'Science and Health, p. 261'])
      if (!card.includes(need)) fail(`[custom ${d}] card missing: ${need}`);
    if (/undefined|null|NaN|\[object/.test(card)) fail(`[custom ${d}] card has placeholder junk`);
    if (!(await page.innerText('#dimmer')).includes(OFF)) fail(`[custom ${d}] card missing 988`);
    if ((await page.evaluate(() => window.__hits)).length) fail(`[custom ${d}] storage written`);
    for (const r of reqs) { if (r.m !== 'GET') fail('custom: non-GET request'); if (r.u.includes(CANARY) || r.b.includes(CANARY)) fail('custom: canary appeared in a request'); }
    const st = await page.evaluate(() => ({ l: localStorage.length, s: sessionStorage.length, c: document.cookie }));
    if (st.l || st.s || st.c) fail('custom: storage not empty');
    if (d === 0) { await page.click('button:text-is("Start over")'); await page.waitForSelector('.dm-choice-label'); if ((await page.innerText('#dimmer')).includes(CANARY)) fail('custom canary survived Start over'); }
    await ctx.close();
  }

  // Keep it / pass it on: buttons, mailto, share links, downloads, no network
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', acceptDownloads: true });
    const page = await ctx.newPage();
    const reqs = [];
    page.on('request', r => reqs.push({ m: r.method(), u: r.url(), b: r.postData() || '' }));
    page.on('pageerror', e => fail(`[share] page error: ${e.message}`));
    await page.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());
    await page.goto(BASE + '/dimmer'); await page.waitForSelector('.dm-h');
    // the "card comes at the end" cue is on the opening and on every middle screen
    if (!(await page.innerText('#dimmer')).includes('shareable card')) fail('opening does not say the card is shareable');
    await page.click('.dm-choice:has(.dm-choice-label:text-is("Scrolling"))');
    await page.waitForSelector('.dm-ahead');
    await page.click('.dm-choice:has(.dm-choice-label:text-is("Music that stops me"))');
    for (const b of ['Continue', 'See my card']) { await page.waitForSelector('.dm-ahead', { state: 'attached' }).catch(() => {}); await page.click(`button:text-is("${b}")`); }
    await page.waitForSelector('.dm-card');
    const mailSelf = decodeURIComponent(await page.getAttribute('#dm-email-self', 'href'));
    if (!mailSelf.startsWith('mailto:?subject=My Dimmer Settings')) fail('email-to-self link is not a mailto');
    for (const need of ['YOUR DIMMER SETTINGS', 'The feed fills the quiet', 'spirituallessonplans.org/dimmer', '988', 'A mirror, not a diagnosis.']) if (!mailSelf.includes(need)) fail('email body missing: ' + need);
    await page.fill('#dm-own-text', CANARY + ' mine');
    if (!decodeURIComponent(await page.getAttribute('#dm-email-self', 'href')).includes(CANARY)) fail('email body did not pick up own line');
    // save my card as image
    const [dl1] = await Promise.all([page.waitForEvent('download'), page.click('button:text-is("Save my card as an image")')]);
    if (!/\.png$/.test(dl1.suggestedFilename())) fail('personal card download is not a png');
    // gift card
    const dims = await page.evaluate(() => { const c = document.querySelector('.dm-gift-canvas'); const d = c.getContext('2d').getImageData(540, 700, 1, 1).data; return { w: c.width, h: c.height, px: Array.from(d) }; });
    if (dims.w !== 1080 || dims.h !== 1350) fail('gift canvas wrong size');
    if (dims.px[3] === 0) fail('gift canvas is blank');
    const wa0 = decodeURIComponent(await page.getAttribute('#dm-wa', 'href'));
    if (!wa0.startsWith('https://wa.me/?text=')) fail('WhatsApp link wrong');
    if (wa0.includes('I fill the quiet with a screen')) fail('answers leaked into the gift message without opt-in');
    if (!wa0.includes('spirituallessonplans.org/dimmer')) fail('gift message missing link');
    await page.check('#dm-gift-incl');
    if (!decodeURIComponent(await page.getAttribute('#dm-wa', 'href')).includes('I fill the quiet with a screen')) fail('opt-in did not add how I go dim');
    await page.uncheck('#dm-gift-incl');
    await page.fill('#dm-gift-own', 'Worth three minutes. ' + CANARY);
    if (!decodeURIComponent(await page.getAttribute('#dm-wa', 'href')).includes('Worth three minutes')) fail('own gift line not used');
    if (!(await page.getAttribute('#dm-fb', 'href')).includes(encodeURIComponent('https://www.spirituallessonplans.org/dimmer'))) fail('Facebook link wrong');
    if (!decodeURIComponent(await page.getAttribute('#dm-email-friend', 'href')).startsWith('mailto:?subject=Thought of you')) fail('email-a-friend link wrong');
    const [dl2] = await Promise.all([page.waitForEvent('download'), page.click('button:text-is("Save image")')]);
    if (!/\.png$/.test(dl2.suggestedFilename())) fail('gift card download is not a png');
    for (const r of reqs) { if (r.m !== 'GET') fail('share: non-GET request'); if (r.u.includes(CANARY) || r.b.includes(CANARY)) fail('share: canary appeared in a request'); if (/wa\.me|facebook\.com/.test(r.u)) fail('share: page requested a share host on its own'); }
    if (SHOTS) { await page.evaluate(() => document.querySelector('.dm-share').scrollIntoView()); await page.screenshot({ path: `${SHOTS}/mobile-share.png`, fullPage: true }); }
    await ctx.close();
  }

  // REGRESSION: the dimmer must actually dim and brighten the light on EVERY screen, by keyboard and by drag.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());
    await page.goto(BASE + '/dimmer'); await page.waitForSelector('.dm-h');
    const glow = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.dm-glow')).opacity));
    const trailState = () => page.evaluate(() => [...document.querySelectorAll('.dm-trail li')].map(li => li.className.trim()));
    const checkSlider = async (label) => {
      await page.focus('#dm-slider'); await page.keyboard.press('Home'); await page.waitForTimeout(60);
      const lo = await glow();
      await page.keyboard.press('End'); await page.waitForTimeout(60);
      const hi = await glow();
      if (!(hi > lo + 0.4)) fail(`slider does not change the light on ${label} (low ${lo}, high ${hi})`);
      const word = await page.innerText('.dm-level-word'); if (word !== 'full light') fail(`slider word on ${label} was "${word}"`);
      // real pointer drag across the track
      const box = await page.locator('#dm-slider').boundingBox();
      await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2); await page.mouse.down();
      await page.mouse.move(box.x + box.width * 0.15, box.y + box.height / 2, { steps: 6 }); await page.mouse.up();
      const dragged = await glow(); if (!(dragged < hi - 0.3)) fail(`pointer drag does not dim the light on ${label}`);
    };
    await checkSlider('landing');
    let t = await trailState(); if (t[0] !== 'now') fail('trail: landing should mark step 1 as now');
    await page.click('.dm-choice:has(.dm-choice-label:text-is("Fine"))'.replace('Fine','\u201CFine\u201D'));
    await page.waitForSelector('text=What has gotten through lately?'); await checkSlider('flicker screen');
    t = await trailState(); if (!t[0].includes('done') || !t[1].includes('now')) fail('trail: after dim type, step 1 done and step 2 now');
    await page.click('.dm-choice:has(.dm-choice-label:text-is("Being outside"))');
    await page.waitForSelector('text=This is just who I am now'); await checkSlider('belief screen');
    await page.click('button:text-is("Continue")'); await page.waitForSelector('text=Nothing is missing from you.'); await checkSlider('still-true screen');
    await page.click('button:text-is("See my card")'); await page.waitForSelector('.dm-card'); await checkSlider('card screen');
    t = await trailState(); if (!t[4].includes('ready') || t.slice(0, 4).some(x => !x.includes('done'))) fail('trail: card screen should show everything done and the card ready');
    await ctx.close();
  }

  // CLARITY: a first-time visitor can tell what this is, why, what they get, and what going dim means.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());
    await page.goto(BASE + '/dimmer'); await page.waitForSelector('.dm-h');
    const t0 = await page.innerText('#dimmer');
    for (const need of ['Not anxious. Not depressed. Just\u2026 dim. Take three minutes.', 'Have you felt dull lately?', 'tool you can use right now', 'Going dim is how you turn your feelings down', 'how do you go dim?', 'shareable card', 'How you go dim', 'What turns you up', 'A tool for right now', 'One thing to try this week', 'A line to hold onto', 'Nothing you type is saved or tracked', 'Stop any time', 'not tied to any one faith', '988'])
      if (!t0.includes(need)) fail('landing clarity: missing "' + need + '"');
    if (/Dimmer does not diagnose, treat/.test(await page.content())) fail('credit paragraph should not be on the page');
    // the first tap is above the fold on a phone
    const firstChoiceTop = await page.evaluate(() => document.querySelector('.dm-choice').getBoundingClientRect().top);
    if (firstChoiceTop > 844) fail('first tap is below the fold on a 390x844 phone (top=' + Math.round(firstChoiceTop) + ')');
    await page.click('.dm-choice:has(.dm-choice-label:text-is("Busy"))'); await page.waitForSelector('text=What has gotten through lately?');
    if (!(await page.innerText('.dm-ahead')).includes('Your card comes at the end')) fail('flicker screen missing card-at-the-end cue');
    await page.click('.dm-choice:has(.dm-choice-label:text-is("Music that stops me"))'); await page.waitForSelector('text=This is just who I am now');
    if (!(await page.innerText('.dm-ahead')).includes('Your card comes at the end')) fail('belief screen missing card-at-the-end cue');
    await page.click('button:text-is("Continue")'); await page.waitForSelector('text=Nothing is missing from you.');
    if (!(await page.innerText('.dm-ahead')).includes('Your card comes at the end')) fail('still-true screen missing card-at-the-end cue');
    await ctx.close();
  }

  // "Something else" on the FIRST question (how do you go dim): custom dim x preset flicker, and custom x custom
  for (const customFlick of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const reqs = [];
    page.on('request', r => reqs.push({ m: r.method(), u: r.url(), b: r.postData() || '' }));
    page.on('pageerror', e => fail(`[custom dim] page error: ${e.message}`));
    await page.route(u => !/^127\.|^localhost$/.test(u.hostname), r => r.abort());
    await page.addInitScript(() => { window.__hits = []; const si = Storage.prototype.setItem; Storage.prototype.setItem = function () { window.__hits.push('setItem'); return si.apply(this, arguments); }; });
    await page.goto(BASE + '/dimmer'); await page.waitForSelector('.dm-choice-other');
    await page.click('.dm-choice-other');
    if (!(await page.isDisabled('#dm-dimcustom-panel [data-act="custom-go"]'))) fail('custom dim Continue enabled while empty');
    const mine = CANARY + ' I clean the whole house';
    await page.fill('#dm-dimcustom-text', mine);
    await page.keyboard.press('Enter');
    await page.waitForSelector('.dm-ahead');
    if (customFlick) { await page.click('.dm-choice-other'); await page.fill('#dm-custom-text', 'a long shower'); await page.keyboard.press('Enter'); }
    else { await page.click('.dm-choice:has(.dm-choice-label:text-is("Music that stops me"))'); }
    await page.waitForSelector('text=This is just who I am now');
    await page.click('button:text-is("Continue")'); await page.click('button:text-is("See my card")');
    await page.waitForSelector('.dm-card');
    const card = await page.innerText('.dm-card');
    for (const need of [mine, 'ONE WAY TO SEE IT', "A dimmer isn\u2019t an off switch", 'RIGHT NOW, IN ONE MINUTE', 'TRY THIS WEEK', 'Do it slowly', 'A mirror, not a diagnosis.'])
      if (!card.includes(need)) fail(`[custom dim${customFlick ? ' x custom' : ''}] card missing: ${need}`);
    if (/undefined|null|NaN|\[object/.test(card)) fail('[custom dim] card has placeholder junk');
    if (!(await page.innerText('#dimmer')).includes(OFF)) fail('[custom dim] card missing 988');
    // gift message only carries the custom words when the visitor opts in
    const wa0 = decodeURIComponent(await page.getAttribute('#dm-wa', 'href'));
    if (wa0.includes('clean the whole house')) fail('custom dim leaked into the gift message without opt-in');
    await page.check('#dm-gift-incl');
    if (!decodeURIComponent(await page.getAttribute('#dm-wa', 'href')).includes('clean the whole house')) fail('opt-in did not add the custom dim');
    if ((await page.evaluate(() => window.__hits)).length) fail('[custom dim] storage written');
    for (const r of reqs) { if (r.m !== 'GET') fail('[custom dim] non-GET request'); if (r.u.includes(CANARY) || r.b.includes(CANARY)) fail('[custom dim] canary appeared in a request'); }
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
