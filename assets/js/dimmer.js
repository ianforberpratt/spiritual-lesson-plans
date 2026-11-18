/* Dimmer: a three-minute interactive experience. Engine, copy and card builder in one file.
   PRIVACY: nothing tapped or typed is saved or sent. No storage, no cookies, no network requests.
   Everything lives in the in-memory `state` object and disappears when the page closes or reloads.
   Checks: scripts/check-dimmer-privacy.sh (code search) and scripts/test-dimmer.js (real browser). */
(function () {
  'use strict';

  /* ===================== EDIT HERE: the quote and the safety line ===================== */
  // Ian: confirm the full wording against your edition. Only the fragment below is used today.
  var QUOTE_TEXT = 'Hold thought steadfastly to the enduring, the good, and the true';
  var QUOTE_TRAIL = '…'; // shown after the fragment because the sentence continues; set to '' to drop it
  var QUOTE_REF = 'Mary Baker Eddy, Science and Health, p. 261';
  var OFFRAMP = 'If this feels like more than numb, please talk to someone. In the US, you can call or text 988. Elsewhere, search for your local crisis line.';
  /* ==================================================================================== */

  /* ---------------------------- Copy ---------------------------- */
  var DIMS = [
    { id: 'busy', label: 'Busy',
      line: 'You stay in motion so nothing has to land.',
      lens: 'A dimmer isn’t an off switch. The light is still there; it’s just hard to see while you’re moving this fast.' },
    { id: 'scrolling', label: 'Scrolling',
      line: 'The feed fills the quiet so you don’t have to.',
      lens: 'A dimmer isn’t an off switch. The light is still there, turned down low enough that a screen can seem brighter than it.' },
    { id: 'fine', label: '“Fine”',
      line: 'You say it so no one asks, including you.',
      lens: 'A dimmer isn’t an off switch. The light is still there, and “fine” is a lampshade over it, not a verdict on it.' },
    { id: 'helpful', label: 'Helpful',
      line: 'You tend everyone else’s light and skip your own.',
      lens: 'A dimmer isn’t an off switch. The light is still there; it has just been pointed at everyone else’s room.' },
    { id: 'funny', label: 'Funny',
      line: 'You joke your way past it.',
      lens: 'A dimmer isn’t an off switch. The light is still there, and every real laugh you make is proof you can still make something glow.' }
  ];

  var FLICKERS = [
    { id: 'outside', label: 'Being outside',
      turnsUp: 'Being outside gets through. Open air and a wider horizon remind you the world is bigger than the dim.',
      act: 'Go outside for ten minutes without earbuds. Notice one thing you would normally walk past.',
      twist: {
        busy: 'Don’t make it exercise or an errand. Sit or stand for part of it.',
        scrolling: 'Leave your phone in your pocket, or at home.',
        fine: 'Tell one person one specific thing you noticed, not “it was nice.”',
        helpful: 'Go alone. There is no one to look after out there.',
        funny: 'Skip the commentary. Let one thing be beautiful without a punchline.' } },
    { id: 'person', label: 'A person who asks nothing of me',
      turnsUp: 'A person who asks nothing of you gets through. Being with someone and not having to perform is where your light comes up.',
      act: 'Ten minutes with one person, phones away.',
      twist: {
        busy: 'Sit down for it. No walking meeting, no folding laundry.',
        scrolling: 'Put the phones in another room, not face down on the table.',
        fine: 'When they ask how you are, give one true sentence that isn’t “fine.”',
        helpful: 'Let them do something for you. A cup of tea counts.',
        funny: 'Let there be one stretch with no jokes. Quiet is allowed.' } },
    { id: 'hands', label: 'Making or fixing something with my hands',
      turnsUp: 'Making or fixing something with your hands gets through. When your hands are on something real, the rest of you gets to catch up.',
      act: 'Pick one small thing to make or mend this week, and give it twenty unhurried minutes.',
      twist: {
        busy: 'Choose something slow with no deadline. Let it take as long as it takes.',
        scrolling: 'Look up how once, then put the screen away and let your hands lead.',
        fine: 'When it works, notice what you feel, even if the answer is “a little pleased.”',
        helpful: 'Make or fix something for yourself, not for anyone else.',
        funny: 'Let it be a little ugly. Nobody is watching, and nobody has to laugh.' } },
    { id: 'music', label: 'Music that stops me',
      turnsUp: 'Music that stops you gets through. Some sound reaches you before the dim has a chance to answer.',
      act: 'Play one song that stops you, all the way through, with nothing else happening.',
      twist: {
        busy: 'Sit down for it. No dishes, no inbox, just the song.',
        scrolling: 'No lyric video and no scrolling during the bridge. Just the sound.',
        fine: 'Let it say what you haven’t. You don’t have to explain what it did.',
        helpful: 'Choose it for you, not for a playlist you would share.',
        funny: 'Don’t riff on it afterward. Let it land and stay a moment.' } },
    { id: 'useful', label: 'Being quietly useful to someone',
      turnsUp: 'Being quietly useful to someone gets through. Care that doesn’t need to be noticed seems to be one of your ways back.',
      act: 'Do one small, unannounced kindness for someone: a note, a ride, a task done before they ask.',
      twist: {
        busy: 'Make it one thing, done slowly and well, not a flurry.',
        scrolling: 'Do it by hand or in person, not with a post or a share.',
        fine: 'Afterward, notice how it feels, even if the feeling is small.',
        helpful: 'You already do this well. This week, also accept one thank-you without deflecting it.',
        funny: 'Skip the funny. Just be plainly kind.' } }
  ];

  /* Slider level (0 to 1) when each screen is reached. Dragging by hand is never overridden downward. */
  var STEP_LEVEL = [0.12, 0.12, 0.36, 0.58, 0.78, 0.96];

  /* ---------------------------- State (memory only) ---------------------------- */
  var state = { step: 0, dim: null, flicker: null, level: STEP_LEVEL[0], own: '' };

  var root = document.getElementById('dimmer');
  if (!root) { return; }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------------------- DOM helpers ---------------------------- */
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        if (k === 'class') { el.className = attrs[k]; }
        else if (k === 'text') { el.textContent = attrs[k]; }
        else { el.setAttribute(k, attrs[k]); }
      });
    }
    (kids || []).forEach(function (c) { if (c) { el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); } });
    return el;
  }

  var STAGE_SVG =
    '<svg class="dm-svg" viewBox="0 0 320 170" aria-hidden="true" focusable="false">' +
    '<defs><radialGradient id="dmGlowGrad" cx="50%" cy="50%" r="50%">' +
    '<stop offset="0" stop-color="#FFE7AE" stop-opacity="1"/><stop offset="0.35" stop-color="#E8A94C" stop-opacity="0.7"/>' +
    '<stop offset="1" stop-color="#E8A94C" stop-opacity="0"/></radialGradient></defs>' +
    '<g class="dm-halo"><circle cx="160" cy="80" r="130" fill="url(#dmGlowGrad)"/></g>' +
    '<g class="dm-glow"><circle cx="160" cy="80" r="78" fill="url(#dmGlowGrad)"/></g>' +
    '<g class="dm-rays" stroke="#FFE7AE" stroke-width="3" stroke-linecap="round">' +
    '<line x1="160" y1="6" x2="160" y2="20"/><line x1="94" y1="26" x2="104" y2="36"/><line x1="226" y1="26" x2="216" y2="36"/>' +
    '<line x1="66" y1="80" x2="80" y2="80"/><line x1="254" y1="80" x2="240" y2="80"/></g>' +
    '<path d="M138 120 C122 104 118 90 118 78 C118 56 137 40 160 40 C183 40 202 56 202 78 C202 90 198 104 182 120 Z" fill="rgba(251,245,234,0.08)" stroke="rgba(251,245,234,0.7)" stroke-width="2.5"/>' +
    '<path class="dm-fil" d="M146 118 L150 86 L156 98 L160 80 L164 98 L170 86 L174 118" fill="none" stroke="#FFD27A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<rect x="140" y="122" width="40" height="9" rx="3" fill="rgba(251,245,234,0.7)"/><rect x="146" y="133" width="28" height="9" rx="3" fill="rgba(251,245,234,0.55)"/>' +
    '</svg>';

  /* ---------------------------- Stage (light + slider), built once ---------------------------- */
  var stage, slider, valueText, screen;

  function levelWord(v) {
    return v < 0.25 ? 'very dim' : v < 0.5 ? 'dim' : v < 0.75 ? 'warm' : 'bright';
  }
  function applyLevel(v) {
    stage.style.setProperty('--lvl', String(v));
    slider.value = String(Math.round(v * 100));
    slider.setAttribute('aria-valuetext', levelWord(v));
    valueText.textContent = levelWord(v);
  }
  var tweenId = 0;
  function setLevel(target) {
    if (target <= state.level) { return; }
    var from = state.level;
    state.level = target;
    if (reduce) { applyLevel(target); return; }
    var start = null, id = ++tweenId, dur = 900;
    function frame(ts) {
      if (id !== tweenId) { return; }
      if (start === null) { start = ts; }
      var t = Math.min(1, (ts - start) / dur);
      var eased = 1 - Math.pow(1 - t, 3);
      applyLevel(from + (target - from) * eased);
      if (t < 1) { window.requestAnimationFrame(frame); }
    }
    window.requestAnimationFrame(frame);
  }

  function buildStage() {
    slider = h('input', { type: 'range', id: 'dm-slider', min: '0', max: '100', step: '1', value: String(Math.round(state.level * 100)), 'aria-label': 'Dimmer: how bright the light is' });
    valueText = h('span', { class: 'dm-level-word', 'aria-hidden': 'true' });
    var art = h('div', { class: 'dm-art' });
    art.innerHTML = STAGE_SVG; // static markup defined above; no user input is ever inserted
    stage = h('section', { class: 'dm-stage', 'aria-label': 'The dimmer light' }, [
      h('div', { class: 'wrap dm-narrow' }, [
        art,
        h('div', { class: 'dm-slider-row' }, [
          h('label', { class: 'dm-slider-label', for: 'dm-slider', text: 'Drag to dim or brighten' }),
          slider,
          h('span', { class: 'dm-slider-hint' }, [valueText])
        ])
      ])
    ]);
    slider.addEventListener('input', function () {
      tweenId++; // a manual drag cancels any running animation
      state.level = slider.value / 100;
      applyLevel(state.level);
    });
    applyLevel(state.level);
  }

  /* ---------------------------- Screens ---------------------------- */
  function offramp() {
    return h('p', { class: 'dm-offramp', text: OFFRAMP });
  }
  function nav(withBack, next) {
    var kids = [];
    if (withBack) { kids.push(h('button', { type: 'button', class: 'dm-btn dm-btn-ghost', 'data-act': 'back', text: 'Back' })); }
    if (next) { kids.push(h('button', { type: 'button', class: 'dm-btn dm-btn-primary', 'data-act': 'next', text: next })); }
    return h('div', { class: 'dm-nav' }, kids);
  }
  function choiceList(items, key) {
    var list = h('div', { class: 'dm-choices', role: 'group' });
    items.forEach(function (it) {
      var b = h('button', { type: 'button', class: 'dm-choice', 'data-key': key, 'data-id': it.id, 'aria-pressed': state[key] === it.id ? 'true' : 'false', text: it.label });
      list.appendChild(b);
    });
    return list;
  }

  function screenOpening() {
    return h('div', { class: 'dm-screen-in' }, [
      h('p', { class: 'eyebrow', text: 'A three-minute experience' }),
      h('h1', { class: 'dm-h', tabindex: '-1', text: 'Dimmer' }),
      h('p', { class: 'dm-lede', text: 'Not anxious. Not depressed. Just… dim. Take three minutes.' }),
      h('p', { text: 'This is a spiritual reflection, open to any tradition and not tied to any one faith. One passage comes from Science and Health. It is free, nothing you type is saved or tracked, and you can stop any time.' }),
      offramp(),
      nav(false, 'Begin')
    ]);
  }
  function screenDim() {
    return h('div', { class: 'dm-screen-in' }, [
      h('p', { class: 'eyebrow', text: 'One of two taps' }),
      h('h2', { class: 'dm-h', tabindex: '-1', text: 'How do you go dim?' }),
      h('p', { class: 'dm-help', text: 'Tap the one that is most like you.' }),
      choiceList(DIMS, 'dim'),
      nav(true, null)
    ]);
  }
  function screenFlicker() {
    return h('div', { class: 'dm-screen-in' }, [
      h('p', { class: 'eyebrow', text: 'Two of two taps' }),
      h('h2', { class: 'dm-h', tabindex: '-1', text: 'What has gotten through lately?' }),
      h('p', { class: 'dm-help', text: 'A flicker. Tap one thing that got through recently.' }),
      choiceList(FLICKERS, 'flicker'),
      nav(true, null)
    ]);
  }
  function screenBelief() {
    return h('div', { class: 'dm-screen-in' }, [
      h('p', { class: 'eyebrow', text: 'The belief to question' }),
      h('h2', { class: 'dm-h dm-belief', tabindex: '-1', text: '“This is just who I am now.”' }),
      h('p', { text: 'What you feel is real. That conclusion isn’t a sentence. It’s a belief, and beliefs can be questioned.' }),
      nav(true, 'Continue')
    ]);
  }
  function screenStill() {
    return h('div', { class: 'dm-screen-in' }, [
      h('p', { class: 'eyebrow', text: 'What’s still true' }),
      h('h2', { class: 'dm-h', tabindex: '-1', text: 'Nothing is missing from you.' }),
      h('p', { text: 'A dimmer is a setting, not a subtraction.' }),
      nav(true, 'See my card')
    ]);
  }

  function cardSection(label, kids, cls) {
    return h('section', { class: 'dm-sec' + (cls ? ' ' + cls : '') }, [h('h3', { class: 'dm-sec-h', text: label })].concat(kids));
  }

  function buildCard() {
    var dim = byId(DIMS, state.dim), fl = byId(FLICKERS, state.flicker);
    var holdQuote = h('blockquote', { class: 'dm-quote', id: 'dm-hold' });
    renderHold(holdQuote);
    var own = h('div', { class: 'dm-own' }, [
      h('label', { class: 'dm-own-label', for: 'dm-own-text', text: 'Have a line from your own tradition that does this for you? Hold it here instead.' }),
      h('textarea', { id: 'dm-own-text', rows: '3', maxlength: '400', autocomplete: 'off', autocorrect: 'off', spellcheck: 'true', 'aria-describedby': 'dm-own-note' }),
      h('p', { class: 'dm-own-note', id: 'dm-own-note', text: 'This stays on this page. It is not saved or sent anywhere.' })
    ]);
    var ta = own.querySelector('textarea');
    ta.value = state.own;
    ta.addEventListener('input', function () { state.own = ta.value; renderHold(holdQuote); });

    var card = h('article', { class: 'dm-card', 'aria-labelledby': 'dm-card-title' }, [
      h('h2', { class: 'dm-h dm-card-title', id: 'dm-card-title', tabindex: '-1', text: 'Your Dimmer Settings' }),
      cardSection('How you go dim', [h('p', { text: dim.line })]),
      cardSection('One way to see it', [h('p', { text: dim.lens })]),
      cardSection('The belief to question', [h('p', { class: 'dm-belief-line', text: '“This is just who I am now.”' })]),
      cardSection('What’s still true', [h('p', { text: 'Nothing is missing from you.' })]),
      cardSection('What turns you up', [h('p', { text: fl.turnsUp })]),
      cardSection('Try this week', [h('p', { text: fl.act }), h('p', { class: 'dm-twist', text: fl.twist[dim.id] })]),
      cardSection('Hold onto this', [holdQuote]),
      h('p', { class: 'dm-card-foot', text: 'A mirror, not a diagnosis.' })
    ]);

    return h('div', { class: 'dm-screen-in dm-screen-card' }, [
      card,
      own,
      offramp(),
      h('div', { class: 'dm-nav' }, [
        h('button', { type: 'button', class: 'dm-btn dm-btn-ghost', 'data-act': 'back', text: 'Back' }),
        h('button', { type: 'button', class: 'dm-btn dm-btn-ghost', 'data-act': 'restart', text: 'Start over' })
      ])
    ]);
  }

  function renderHold(bq) {
    while (bq.firstChild) { bq.removeChild(bq.firstChild); }
    var mine = state.own.replace(/^\s+|\s+$/g, '');
    if (mine) {
      bq.appendChild(h('p', { text: mine }));
      bq.appendChild(h('cite', { text: 'Your own line' }));
    } else {
      bq.appendChild(h('p', { text: '“' + QUOTE_TEXT + QUOTE_TRAIL + '”' }));
      bq.appendChild(h('cite', { text: QUOTE_REF }));
    }
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return list[0];
  }

  /* ---------------------------- Flow ---------------------------- */
  var locked = false;

  function render(focus) {
    var views = [screenOpening, screenDim, screenFlicker, screenBelief, screenStill, buildCard];
    while (screen.firstChild) { screen.removeChild(screen.firstChild); }
    screen.appendChild(h('div', { class: 'wrap dm-narrow' }, [views[state.step]()]));
    setLevel(STEP_LEVEL[state.step]);
    if (focus) {
      var hd = screen.querySelector('.dm-h');
      if (hd) { hd.focus({ preventScroll: true }); }
      var top = stage.getBoundingClientRect().top + window.pageYOffset - 8;
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    }
    locked = false;
  }
  function go(step) { state.step = step; render(true); }

  function onClick(e) {
    var t = e.target.closest ? e.target.closest('button') : null;
    if (!t || locked) { return; }
    var act = t.getAttribute('data-act');
    if (act === 'next') { go(state.step + 1); return; }
    if (act === 'back') { go(state.step - 1); return; }
    if (act === 'restart') {
      tweenId++;
      state = { step: 0, dim: null, flicker: null, level: STEP_LEVEL[0], own: '' };
      applyLevel(state.level);
      go(0);
      return;
    }
    var key = t.getAttribute('data-key');
    if (key) {
      state[key] = t.getAttribute('data-id');
      locked = true;
      Array.prototype.forEach.call(t.parentNode.children, function (b) { b.setAttribute('aria-pressed', b === t ? 'true' : 'false'); });
      window.setTimeout(function () { go(state.step + 1); }, reduce ? 120 : 380);
    }
  }

  /* Tiny menu toggle (the site's main.js is deliberately not loaded here). */
  function wireMenu() {
    var btn = document.querySelector('.nav-toggle'), links = document.getElementById('primary-nav');
    if (!btn || !links) { return; }
    btn.addEventListener('click', function () {
      var open = links.classList.toggle('open');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------------------------- Start ---------------------------- */
  buildStage();
  screen = h('div', { class: 'dm-screen', 'aria-live': 'polite' });
  while (root.firstChild) { root.removeChild(root.firstChild); }
  root.appendChild(stage);
  root.appendChild(screen);
  root.addEventListener('click', onClick);
  wireMenu();
  render(false);
})();
