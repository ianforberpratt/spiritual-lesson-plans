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
      hint: 'I keep moving so I don\u2019t have to feel it.',
      line: 'You stay in motion so nothing has to land.',
      lens: 'A dimmer isn’t an off switch. The light is still there; it’s just hard to see while you’re moving this fast.' },
    { id: 'scrolling', label: 'Scrolling',
      hint: 'I fill the quiet with a screen.',
      line: 'The feed fills the quiet so you don’t have to.',
      lens: 'A dimmer isn’t an off switch. The light is still there, turned down low enough that a screen can seem brighter than it.' },
    { id: 'fine', label: '“Fine”',
      hint: 'I say it so nobody asks.',
      line: 'You say it so no one asks, including you.',
      lens: 'A dimmer isn’t an off switch. The light is still there, and “fine” is a lampshade over it, not a verdict on it.' },
    { id: 'helpful', label: 'Helpful',
      hint: 'I look after everyone else first.',
      line: 'You tend everyone else’s light and skip your own.',
      lens: 'A dimmer isn’t an off switch. The light is still there; it has just been pointed at everyone else’s room.' },
    { id: 'funny', label: 'Funny',
      hint: 'I make a joke and move on.',
      line: 'You joke your way past it.',
      lens: 'A dimmer isn’t an off switch. The light is still there, and every real laugh you make is proof you can still make something glow.' }
  ];

  var FLICKERS = [
    { id: 'outside', label: 'Being outside',
      now: 'Step to a window or a doorway. Look at the farthest thing you can see for one full minute.',
      turnsUp: 'Being outside gets through. Open air and a wider horizon remind you the world is bigger than the dim.',
      act: 'Go outside for ten minutes without earbuds. Notice one thing you would normally walk past.',
      twist: {
        busy: 'Don’t make it exercise or an errand. Sit or stand for part of it.',
        scrolling: 'Leave your phone in your pocket, or at home.',
        fine: 'Tell one person one specific thing you noticed, not “it was nice.”',
        helpful: 'Go alone. There is no one to look after out there.',
        funny: 'Skip the commentary. Let one thing be beautiful without a punchline.' } },
    { id: 'person', label: 'A person who asks nothing of me',
      now: 'Send one person: \u201CThinking of you, no need to reply.\u201D Then put the phone down.',
      turnsUp: 'A person who asks nothing of you gets through. Being with someone and not having to perform is where your light comes up.',
      act: 'Ten minutes with one person, phones away.',
      twist: {
        busy: 'Sit down for it. No walking meeting, no folding laundry.',
        scrolling: 'Put the phones in another room, not face down on the table.',
        fine: 'When they ask how you are, give one true sentence that isn’t “fine.”',
        helpful: 'Let them do something for you. A cup of tea counts.',
        funny: 'Let there be one stretch with no jokes. Quiet is allowed.' } },
    { id: 'hands', label: 'Making or fixing something with my hands',
      now: 'Pick up something small within reach and use your hands on it for one minute: straighten it, wipe it, fold it.',
      turnsUp: 'Making or fixing something with your hands gets through. When your hands are on something real, the rest of you gets to catch up.',
      act: 'Pick one small thing to make or mend this week, and give it twenty unhurried minutes.',
      twist: {
        busy: 'Choose something slow with no deadline. Let it take as long as it takes.',
        scrolling: 'Look up how once, then put the screen away and let your hands lead.',
        fine: 'When it works, notice what you feel, even if the answer is “a little pleased.”',
        helpful: 'Make or fix something for yourself, not for anyone else.',
        funny: 'Let it be a little ugly. Nobody is watching, and nobody has to laugh.' } },
    { id: 'music', label: 'Music that stops me',
      now: 'Play one song that stops you and listen to the first minute, with nothing else going on.',
      turnsUp: 'Music that stops you gets through. Some sound reaches you before the dim has a chance to answer.',
      act: 'Play one song that stops you, all the way through, with nothing else happening.',
      twist: {
        busy: 'Sit down for it. No dishes, no inbox, just the song.',
        scrolling: 'No lyric video and no scrolling during the bridge. Just the sound.',
        fine: 'Let it say what you haven’t. You don’t have to explain what it did.',
        helpful: 'Choose it for you, not for a playlist you would share.',
        funny: 'Don’t riff on it afterward. Let it land and stay a moment.' } },
    { id: 'useful', label: 'Being quietly useful to someone',
      now: 'Do one tiny helpful thing within reach: wipe a counter, fill someone\u2019s water, send a thank-you.',
      turnsUp: 'Being quietly useful to someone gets through. Care that doesn’t need to be noticed seems to be one of your ways back.',
      act: 'Do one small, unannounced kindness for someone: a note, a ride, a task done before they ask.',
      twist: {
        busy: 'Make it one thing, done slowly and well, not a flurry.',
        scrolling: 'Do it by hand or in person, not with a post or a share.',
        fine: 'Afterward, notice how it feels, even if the feeling is small.',
        helpful: 'You already do this well. This week, also accept one thank-you without deflecting it.',
        funny: 'Skip the funny. Just be plainly kind.' } }
  ];

  /* Used when the visitor puts in their own flicker. Their words are shown with textContent only. */
  var CUSTOM_TWIST = {
    busy: 'Put it in the calendar like it matters. It does.',
    scrolling: 'Phone in another room while you do it.',
    fine: 'Afterward, tell one person what it was, in one true sentence.',
    helpful: 'This one is for you. Don\u2019t turn it into a favor for anyone else.',
    funny: 'Keep it plain. No bit, no caption.' };
  function customFlicker(text, dimId) {
    return {
      turnsUp: '\u201C' + text + '\u201D gets through. That is worth noticing. It is yours, and it is one of your ways back.',
      now: 'Take one minute with it, or a small piece of it, right now.',
      act: 'Make room for it this week: give it ten unhurried minutes, on purpose, before the week gets away from you.',
      twist: (function () { var t = {}; t[dimId] = CUSTOM_TWIST[dimId] || CUSTOM_TWIST.busy; return t; })() };
  }

  /* Slider level (0 to 1) when each screen is reached. Dragging by hand is never overridden downward. */
  var STEP_LEVEL = [0.12, 0.36, 0.58, 0.78, 0.96];

  /* ---------------------------- State (memory only) ---------------------------- */
  var state = { step: 0, dim: null, flicker: null, custom: '', level: STEP_LEVEL[0], own: '' };

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
    '<g class="dm-motes">' +
    '<circle class="dm-mote" cx="139" cy="105" r="3" style="--d:5s;--dl:-1s;--dx:18px"/>' +
    '<circle class="dm-mote" cx="110" cy="119" r="1.6" style="--d:6s;--dl:0s;--dx:-14px"/>' +
    '<circle class="dm-mote" cx="153" cy="122" r="1.6" style="--d:6s;--dl:-1s;--dx:18px"/>' +
    '<circle class="dm-mote" cx="152" cy="99" r="1.6" style="--d:6s;--dl:0s;--dx:18px"/>' +
    '<circle class="dm-mote" cx="172" cy="121" r="1.6" style="--d:6s;--dl:0s;--dx:18px"/>' +
    '<circle class="dm-mote" cx="207" cy="104" r="2.4" style="--d:8s;--dl:-2s;--dx:18px"/>' +
    '<circle class="dm-mote" cx="113" cy="132" r="2.4" style="--d:6s;--dl:-1s;--dx:18px"/>' +
    '<circle class="dm-mote" cx="171" cy="136" r="2" style="--d:7s;--dl:-1s;--dx:18px"/>' +
    '<circle class="dm-mote" cx="189" cy="100" r="1.6" style="--d:6s;--dl:-7s;--dx:-20px"/>' +
    '<circle class="dm-mote" cx="166" cy="123" r="2.4" style="--d:8s;--dl:-7s;--dx:6px"/>' +
    '</g>' +
    '<circle class="dm-ring" cx="160" cy="80" r="40" fill="none" stroke="#FFE7AE" stroke-width="3"/>' +
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
    root.style.setProperty('--lvl', String(v));
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

  function pulse() {
    if (reduce || !stage) { return; }
    var ring = stage.querySelector('.dm-ring');
    if (!ring) { return; }
    ring.classList.remove('go');
    void ring.getBoundingClientRect(); // restart the animation
    ring.classList.add('go');
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
  function ahead() {
    return h('p', { class: 'dm-ahead' }, [
      h('span', { class: 'dm-ahead-ico', 'aria-hidden': 'true' }),
      h('span', { text: 'Your card comes at the end. You can save it, email it to yourself, or share it.' })
    ]);
  }
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
      var kids = [h('span', { class: 'dm-choice-label', text: it.label })];
      if (it.hint) { kids.push(h('span', { class: 'dm-choice-hint', text: it.hint })); }
      var b = h('button', { type: 'button', class: 'dm-choice', 'data-key': key, 'data-id': it.id, 'aria-pressed': state[key] === it.id ? 'true' : 'false' }, kids);
      list.appendChild(b);
    });
    return list;
  }

  function screenOpening() {
    function li(strong, rest) { return h('li', null, [h('strong', { text: strong }), ' ' + rest]); }
    return h('div', { class: 'dm-screen-in' }, [
      h('p', { class: 'eyebrow', text: 'A three-minute experience' }),
      h('h1', { class: 'dm-h', tabindex: '-1', text: 'Dimmer' }),
      h('p', { class: 'dm-lede', text: 'Not anxious. Not depressed. Just\u2026 dim. Take three minutes.' }),
      h('p', { class: 'dm-recognize', text: 'Have you felt dull lately? Just not yourself? It isn\u2019t one of the feelings people talk about. Dimmer helps you think it through, and gives you a tool you can use right now.' }),
      h('h2', { class: 'dm-start', text: 'Start here: how do you go dim?' }),
      h('p', { class: 'dm-define', text: 'Going dim is how you turn your feelings down so you can keep going. It isn\u2019t a flaw, just a way of getting through, and most of us have a favorite.' }),
      h('p', { class: 'dm-help', text: 'Tap the one that is most like you.' }),
      choiceList(DIMS, 'dim'),
      h('div', { class: 'dm-get' }, [
        h('h2', { class: 'dm-get-h', text: 'In three minutes, you get a shareable card: Your Dimmer Settings' }),
        h('ul', { class: 'dm-get-list' }, [
          li('How you go dim.', 'One honest line, in your own pattern.'),
          li('What turns you up.', 'The thing that is already getting through.'),
          li('A tool for right now.', 'One minute, matched to you.'),
          li('One small thing to try this week.', 'Outward, and small.'),
          li('A line to hold onto.', 'Or bring your own.')
        ]),
        h('p', { class: 'dm-get-note', text: 'Save it as an image, email it to yourself, or pass it on to someone you love. A mirror, not a test. Five taps, and no typing needed.' })
      ]),
      h('p', { class: 'dm-fine', text: 'This is a spiritual reflection, open to any tradition and not tied to any one faith. It is free, nothing you type is saved or tracked, and you can stop any time.' }),
      offramp()
    ]);
  }
  function screenFlicker() {
    return h('div', { class: 'dm-screen-in' }, [
      h('p', { class: 'eyebrow', text: 'One more tap' }),
      h('h2', { class: 'dm-h', tabindex: '-1', text: 'What has gotten through lately?' }),
      h('p', { class: 'dm-help', text: 'A flicker. Tap one thing that got through recently.' }),
      choiceList(FLICKERS, 'flicker'),
      h('button', { type: 'button', class: 'dm-choice dm-choice-other', 'data-act': 'other', 'aria-expanded': state.flicker === 'custom' ? 'true' : 'false' }, [
        h('span', { class: 'dm-choice-label', text: 'Something else' }),
        h('span', { class: 'dm-choice-hint', text: 'Put in your own.' })
      ]),
      h('div', { class: 'dm-custom', id: 'dm-custom-panel', hidden: 'hidden' }, [
        h('label', { class: 'dm-own-label', for: 'dm-custom-text', text: 'What got through?' }),
        h('input', { type: 'text', id: 'dm-custom-text', maxlength: '80', autocomplete: 'off', autocorrect: 'off', spellcheck: 'true', 'aria-describedby': 'dm-custom-note', placeholder: 'For example: a long shower, my dog, a phone call' }),
        h('p', { class: 'dm-own-note', id: 'dm-custom-note', text: 'This stays on this page. It is not saved or sent anywhere.' }),
        h('button', { type: 'button', class: 'dm-btn dm-btn-primary', 'data-act': 'custom-go', disabled: 'disabled', text: 'Continue' })
      ]),
      ahead(),
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
      ahead(),
      nav(true, 'See my card')
    ]);
  }

  var secCount = 0;
  function cardSection(label, kids, cls) {
    return h('section', { class: 'dm-sec' + (cls ? ' ' + cls : ''), style: '--i:' + (secCount++) }, [h('h3', { class: 'dm-sec-h', text: label })].concat(kids));
  }


  /* ---------------------------- Keep it / pass it on ---------------------------- */
  // Everything below is made on this device. Images are drawn on a canvas and never uploaded. Email and
  // sharing only open the visitor's own apps (mailto:, the phone's share sheet, or a plain outbound link).
  var SITE_URL = 'https://www.spirituallessonplans.org/dimmer';
  var SERIF = '"Fraunces", Georgia, serif';
  var SANS = '"Inter", Arial, sans-serif';
  var GIFT_LINES = [
    'This helped me put words to something I couldn’t name.',
    'Three minutes. I’m glad I took them.',
    'Thought of you. Take three minutes.'
  ];
  var personalMail = null;

  function current() {
    var dim = byId(DIMS, state.dim);
    var fl = state.flicker === 'custom' ? customFlicker(state.custom, dim.id) : byId(FLICKERS, state.flicker);
    return { dim: dim, fl: fl };
  }
  function holdParts() {
    var mine = state.own.replace(/^\s+|\s+$/g, '');
    return mine ? { text: mine, ref: 'Your own line' } : { text: '“' + QUOTE_TEXT + QUOTE_TRAIL + '”', ref: QUOTE_REF };
  }
  function cardParts() {
    var c = current(), hd = holdParts();
    return [
      { label: 'How you go dim', lines: [c.dim.line] },
      { label: 'One way to see it', lines: [c.dim.lens] },
      { label: 'The belief to question', lines: ['“This is just who I am now.”'] },
      { label: 'What’s still true', lines: ['Nothing is missing from you.'] },
      { label: 'What turns you up', lines: [c.fl.turnsUp] },
      { label: 'Right now, in one minute', lines: [c.fl.now] },
      { label: 'Try this week', lines: [c.fl.act, c.fl.twist[c.dim.id]] },
      { label: 'Hold onto this', lines: [hd.text, '— ' + hd.ref] }
    ];
  }
  function plainText() {
    var out = ['YOUR DIMMER SETTINGS', ''];
    cardParts().forEach(function (p) { out.push(p.label.toUpperCase()); p.lines.forEach(function (l) { out.push(l); }); out.push(''); });
    out.push('A mirror, not a diagnosis.', '', 'Make your own (three minutes, free, nothing saved): ' + SITE_URL, '', OFFRAMP);
    return out.join('\n');
  }
  function mailto(subject, body) {
    return 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  }
  function refreshPersonalLinks() {
    if (personalMail) { personalMail.setAttribute('href', mailto('My Dimmer Settings', plainText())); }
  }

  function wrapLines(ctx, text, maxW) {
    var words = String(text).split(/\s+/), lines = [], cur = '';
    words.forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (cur && ctx.measureText(t).width > maxW) { lines.push(cur); cur = w; } else { cur = t; }
    });
    if (cur) { lines.push(cur); }
    return lines;
  }

  function personalCanvas() {
    var W = 1080, PAD = 80, MAXW = W - PAD * 2, parts = cardParts();
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = 5000;
    function layout(ctx, dry) {
      var y = 0;
      if (!dry) { ctx.fillStyle = '#FBF5EA'; ctx.fillRect(0, 0, W, ctx.canvas.height); ctx.fillStyle = '#E8A94C'; ctx.fillRect(0, 0, W, 18); }
      y = 150;
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      ctx.font = '500 78px ' + SERIF;
      if (!dry) { ctx.fillStyle = '#362F4B'; ctx.fillText('Your Dimmer Settings', PAD, y); }
      y += 30;
      parts.forEach(function (p) {
        if (!dry) { ctx.strokeStyle = 'rgba(54,47,75,0.15)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(PAD, y + 22); ctx.lineTo(W - PAD, y + 22); ctx.stroke(); }
        y += 74;
        ctx.font = '700 24px ' + SANS;
        if (!dry) { ctx.fillStyle = '#935F1A'; ctx.fillText(p.label.toUpperCase(), PAD, y); }
        p.lines.forEach(function (line, i) {
          var small = p.label === 'Hold onto this' && i === 1;
          ctx.font = small ? '400 28px ' + SANS : (p.label === 'The belief to question' ? 'italic 500 40px ' + SERIF : '400 35px ' + SANS);
          wrapLines(ctx, line, MAXW).forEach(function (l) {
            y += small ? 42 : 52;
            if (!dry) { ctx.fillStyle = small ? '#6B6579' : '#362F4B'; ctx.fillText(l, PAD, y); }
          });
          y += 6;
        });
      });
      y += 70;
      ctx.font = 'italic 400 30px ' + SANS;
      if (!dry) { ctx.fillStyle = '#6B6579'; ctx.textAlign = 'center'; ctx.fillText('A mirror, not a diagnosis.', W / 2, y); ctx.textAlign = 'left'; }
      y += 60;
      ctx.font = '600 28px ' + SANS;
      if (!dry) { ctx.fillStyle = '#935F1A'; ctx.textAlign = 'center'; ctx.fillText('Make your own: spirituallessonplans.org/dimmer', W / 2, y); ctx.textAlign = 'left'; }
      y += 50;
      ctx.font = '400 22px ' + SANS;
      wrapLines(ctx, OFFRAMP, MAXW).forEach(function (l) {
        y += 32;
        if (!dry) { ctx.fillStyle = '#6B6579'; ctx.textAlign = 'center'; ctx.fillText(l, W / 2, y); ctx.textAlign = 'left'; }
      });
      return y + 70;
    }
    var endY = layout(cv.getContext('2d'), true);
    cv.height = endY;
    layout(cv.getContext('2d'), false);
    return cv;
  }

  function drawGift(cv, line, includeDim) {
    var W = 1080, H = 1350, ctx = cv.getContext('2d');
    cv.width = W; cv.height = H;
    ctx.fillStyle = '#362F4B'; ctx.fillRect(0, 0, W, H);
    var g = ctx.createRadialGradient(540, 330, 10, 540, 330, 560);
    g.addColorStop(0, 'rgba(255,231,174,0.95)'); g.addColorStop(0.25, 'rgba(232,169,76,0.55)'); g.addColorStop(1, 'rgba(232,169,76,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 900);
    // bulb
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(251,245,234,0.85)'; ctx.fillStyle = 'rgba(251,245,234,0.12)';
    ctx.beginPath(); ctx.moveTo(480, 450); ctx.bezierCurveTo(440, 400, 430, 360, 430, 320); ctx.bezierCurveTo(430, 250, 480, 205, 540, 205);
    ctx.bezierCurveTo(600, 205, 650, 250, 650, 320); ctx.bezierCurveTo(650, 360, 640, 400, 600, 450); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#FFE7AE'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(505, 440); ctx.lineTo(515, 350); ctx.lineTo(530, 385); ctx.lineTo(540, 325); ctx.lineTo(550, 385); ctx.lineTo(565, 350); ctx.lineTo(575, 440); ctx.stroke();
    ctx.fillStyle = 'rgba(251,245,234,0.8)'; ctx.fillRect(498, 456, 84, 20); ctx.fillRect(512, 482, 56, 20);
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    var y = 640;
    ctx.font = '700 26px ' + SANS; ctx.fillStyle = '#E8A94C'; ctx.fillText('DIMMER  ·  A THREE-MINUTE EXPERIENCE', W / 2, y); y += 40;
    ctx.font = '500 64px ' + SERIF; ctx.fillStyle = '#FBF5EA';
    wrapLines(ctx, 'Not anxious. Not depressed. Just… dim.', 880).forEach(function (l) { y += 76; ctx.fillText(l, W / 2, y); });
    y += 50;
    ctx.font = 'italic 500 44px ' + SERIF; ctx.fillStyle = '#FFE7AE';
    wrapLines(ctx, '“' + line + '”', 840).forEach(function (l) { y += 58; ctx.fillText(l, W / 2, y); });
    if (includeDim) {
      y += 60;
      ctx.font = '700 22px ' + SANS; ctx.fillStyle = '#E8A94C'; ctx.fillText('HOW I GO DIM', W / 2, y);
      ctx.font = '400 34px ' + SANS; ctx.fillStyle = '#FBF5EA';
      wrapLines(ctx, current().dim.hint, 840).forEach(function (l) { y += 46; ctx.fillText(l, W / 2, y); });
    }
    ctx.font = '400 30px ' + SANS; ctx.fillStyle = 'rgba(251,245,234,0.85)';
    ctx.fillText('Free. Nothing you type is saved.', W / 2, 1180);
    ctx.font = '700 40px ' + SANS; ctx.fillStyle = '#E8A94C';
    ctx.fillText('spirituallessonplans.org/dimmer', W / 2, 1240);
    ctx.font = '400 22px ' + SANS; ctx.fillStyle = 'rgba(251,245,234,0.62)';
    ctx.fillText('If this feels like more than numb, call or text 988 (US).', W / 2, 1296);
  }

  function saveCanvas(cv, name) {
    cv.toBlob(function (blob) {
      if (!blob) { return; }
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      window.setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
    }, 'image/png');
  }

  function buildShare() {
    // ---- Keep your card ----
    personalMail = h('a', { class: 'dm-btn dm-btn-ghost dm-linkbtn', id: 'dm-email-self', href: '#', text: 'Email my card to myself' });
    refreshPersonalLinks();
    var keep = h('section', { class: 'dm-share', 'aria-labelledby': 'dm-keep-h' }, [
      h('h3', { class: 'dm-share-h', id: 'dm-keep-h', text: 'Keep your card' }),
      h('p', { text: 'Save it so you can come back to it. Your card is made on this device. Nothing is uploaded.' }),
      h('div', { class: 'dm-nav dm-nav-tight' }, [
        h('button', { type: 'button', class: 'dm-btn dm-btn-primary', 'data-act': 'save-card', text: 'Save my card as an image' }),
        personalMail
      ]),
      h('p', { class: 'dm-own-note', text: 'Email opens your own email app with your card filled in. Nothing goes through this site.' })
    ]);

    // ---- Pass it on ----
    var giftCanvasEl = h('canvas', { class: 'dm-gift-canvas', width: '1080', height: '1350', role: 'img', 'aria-label': 'Preview of the card you can share' });
    var radios = [];
    var fieldset = h('fieldset', { class: 'dm-fieldset' }, [h('legend', { class: 'dm-own-label', text: 'Pick a line for your card' })]);
    GIFT_LINES.concat(['']).forEach(function (txt, i) {
      var id = 'dm-gl' + i;
      var r = h('input', { type: 'radio', name: 'dm-gift-line', id: id, value: String(i) });
      if (i === 0) { r.checked = true; }
      radios.push(r);
      fieldset.appendChild(h('div', { class: 'dm-radio' }, [r, h('label', { for: id, text: i < GIFT_LINES.length ? txt : 'Write my own' })]));
    });
    var ownLine = h('input', { type: 'text', id: 'dm-gift-own', maxlength: '110', autocomplete: 'off', 'aria-label': 'Your own line for the card', placeholder: 'In your own words', class: 'dm-gift-own' });
    fieldset.appendChild(ownLine);
    var incl = h('input', { type: 'checkbox', id: 'dm-gift-incl' });
    var inclRow = h('div', { class: 'dm-radio' }, [incl, h('label', { for: 'dm-gift-incl', text: 'Include how I go dim on the card' })]);

    var wa = h('a', { class: 'dm-btn dm-btn-ghost dm-linkbtn', id: 'dm-wa', target: '_blank', rel: 'noopener noreferrer', href: '#', text: 'WhatsApp' });
    var fb = h('a', { class: 'dm-btn dm-btn-ghost dm-linkbtn', id: 'dm-fb', target: '_blank', rel: 'noopener noreferrer', href: '#', text: 'Facebook' });
    var mailFriend = h('a', { class: 'dm-btn dm-btn-ghost dm-linkbtn', id: 'dm-email-friend', href: '#', text: 'Email a friend' });
    var shareBtn = h('button', { type: 'button', class: 'dm-btn dm-btn-primary', 'data-act': 'share-gift', text: 'Share…' });
    if (!navigator.share) { shareBtn.hidden = true; }
    var saveBtn = h('button', { type: 'button', class: 'dm-btn dm-btn-ghost', 'data-act': 'save-gift', text: 'Save image' });

    function giftLine() {
      var idx = 0;
      radios.forEach(function (r, i) { if (r.checked) { idx = i; } });
      if (idx < GIFT_LINES.length) { return GIFT_LINES[idx]; }
      var mine = ownLine.value.replace(/^\s+|\s+$/g, '');
      return mine || GIFT_LINES[0];
    }
    function giftMessage() {
      return 'I just tried Dimmer, a three-minute reflection for the numb middle. ' + giftLine() +
        (incl.checked ? ' How I go dim: ' + current().dim.hint : '') +
        ' It’s free, and nothing you type is saved: ' + SITE_URL;
    }
    function redraw() {
      drawGift(giftCanvasEl, giftLine(), incl.checked);
      wa.setAttribute('href', 'https://wa.me/?text=' + encodeURIComponent(giftMessage()));
      fb.setAttribute('href', 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(SITE_URL));
      mailFriend.setAttribute('href', mailto('Thought of you: Dimmer', giftMessage() + '\n\n' + OFFRAMP));
    }
    fieldset.addEventListener('change', redraw);
    incl.addEventListener('change', redraw);
    ownLine.addEventListener('input', function () { radios[GIFT_LINES.length].checked = true; redraw(); });
    redraw();
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(redraw); }

    shareBtn.addEventListener('click', function () {
      giftCanvasEl.toBlob(function (blob) {
        if (!blob) { return; }
        var file = new File([blob], 'dimmer.png', { type: 'image/png' });
        var data = { files: [file], text: giftMessage() };
        if (navigator.canShare && navigator.canShare(data)) { navigator.share(data).catch(function () {}); }
        else { navigator.share({ text: giftMessage() }).catch(function () {}); }
      }, 'image/png');
    });
    saveBtn.addEventListener('click', function () { saveCanvas(giftCanvasEl, 'dimmer-share-card.png'); });

    var pass = h('section', { class: 'dm-share', 'aria-labelledby': 'dm-pass-h' }, [
      h('h3', { class: 'dm-share-h', id: 'dm-pass-h', text: 'Pass it on' }),
      h('p', { text: 'Did this help? Make a card to gift someone you think of. It works for WhatsApp, Facebook, Instagram, or a text.' }),
      fieldset, inclRow,
      h('div', { class: 'dm-gift-preview' }, [giftCanvasEl]),
      h('div', { class: 'dm-nav dm-nav-tight' }, [shareBtn, saveBtn, wa, fb, mailFriend]),
      h('p', { class: 'dm-own-note', text: 'The card is made on this device. Sharing opens your own apps. Nothing goes through this site, and your answers are only on the card if you tick the box.' })
    ]);
    return [keep, pass];
  }

  function buildCard() {
    secCount = 0;
    var dim = byId(DIMS, state.dim);
    var fl = state.flicker === 'custom' ? customFlicker(state.custom, dim.id) : byId(FLICKERS, state.flicker);
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
      cardSection('Right now, in one minute', [h('p', { text: fl.now })]),
      cardSection('Try this week', [h('p', { text: fl.act }), h('p', { class: 'dm-twist', text: fl.twist[dim.id] })]),
      cardSection('Hold onto this', [holdQuote]),
      h('p', { class: 'dm-card-foot', text: 'A mirror, not a diagnosis.' })
    ]);

    return h('div', { class: 'dm-screen-in dm-screen-card' }, [
      card,
      own
    ].concat(buildShare(), [
      offramp(),
      h('div', { class: 'dm-nav' }, [
        h('button', { type: 'button', class: 'dm-btn dm-btn-ghost', 'data-act': 'back', text: 'Back' }),
        h('button', { type: 'button', class: 'dm-btn dm-btn-ghost', 'data-act': 'restart', text: 'Start over' })
      ])
    ]));
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
    refreshPersonalLinks();
  }

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return list[0];
  }

  /* ---------------------------- Flow ---------------------------- */
  var locked = false;

  function render(focus) {
    var views = [screenOpening, screenFlicker, screenBelief, screenStill, buildCard];
    while (screen.firstChild) { screen.removeChild(screen.firstChild); }
    screen.appendChild(h('div', { class: 'wrap dm-narrow' }, [views[state.step]()]));
    setLevel(STEP_LEVEL[state.step]);
    // The light takes on your dim type's character until the belief is questioned, then warms for the rest.
    if (state.dim && state.step >= 1 && state.step <= 2) { stage.setAttribute('data-dim', state.dim); }
    else { stage.removeAttribute('data-dim'); }
    stage.classList.toggle('dm-lit', state.step === 4);
    if (focus) { pulse(); }
    if (focus) {
      var hd = screen.querySelector('.dm-h');
      if (hd) { hd.focus({ preventScroll: true }); }
      var siteNav = document.querySelector('.site-nav');
      var top = stage.getBoundingClientRect().top + window.pageYOffset - (siteNav ? siteNav.offsetHeight : 0);
      window.scrollTo({ top: Math.max(0, top), behavior: reduce ? 'auto' : 'smooth' });
    }
    locked = false;
  }
  function go(step) { state.step = step; render(true); }

  function commitCustom() {
    var v = document.getElementById('dm-custom-text').value.replace(/^\s+|\s+$/g, '');
    if (!v) { return; }
    state.flicker = 'custom';
    state.custom = v;
    go(state.step + 1);
  }
  function onInput(e) {
    if (e.target && e.target.id === 'dm-custom-text') {
      var go_ = screen.querySelector('[data-act="custom-go"]');
      if (go_) { go_.disabled = !e.target.value.replace(/^\s+|\s+$/g, ''); }
    }
  }
  function onKey(e) {
    if (e.key === 'Enter' && e.target && e.target.id === 'dm-custom-text') { e.preventDefault(); commitCustom(); }
  }

  function onClick(e) {
    var t = e.target.closest ? e.target.closest('button') : null;
    if (!t || locked) { return; }
    var act = t.getAttribute('data-act');
    if (act === 'other') {
      var panel = document.getElementById('dm-custom-panel');
      panel.hidden = false;
      t.setAttribute('aria-expanded', 'true');
      document.getElementById('dm-custom-text').focus();
      return;
    }
    if (act === 'custom-go') { commitCustom(); return; }
    if (act === 'save-card') { saveCanvas(personalCanvas(), 'my-dimmer-settings.png'); return; }
    if (act === 'next') { go(state.step + 1); return; }
    if (act === 'back') { go(state.step - 1); return; }
    if (act === 'restart') {
      personalMail = null;
      tweenId++;
      state = { step: 0, dim: null, flicker: null, custom: '', level: STEP_LEVEL[0], own: '' };
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
  root.addEventListener('input', onInput);
  root.addEventListener('keydown', onKey);
  wireMenu();
  render(false);
})();
