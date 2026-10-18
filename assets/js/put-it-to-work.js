/* Put It to Work: interactive case-consult exercise (/put-it-to-work).
 *
 * PRIVACY (hard requirement): nothing the visitor types is saved or sent.
 * - Typed text lives only in the in-memory `state` object below. It is gone on close or reload.
 * - No persistence of any kind, no posting of data, and no tracking scripts on this page.
 * - The only network call is the one plain GET for the static case file at load. No body.
 * - The only way text leaves the page is the visitor pressing "Copy my thoughts" (clipboard).
 * scripts/check-put-it-to-work-privacy.sh enforces this; keep it passing.
 */
(function(){
  // The story lives in /content/put-it-to-work/<case-id>.json. STEPS and GROUP_CLOSING
  // are filled from it by startCase(); nothing about the story is hard-coded here.
  var CASE = null;
  var STEPS = [];
  var GROUP_CLOSING = [];

  var state = {
    screen:'intro', idx:0, mode:'solo', path:'full',
    data:{}, end:{love:'', sentence:''},
    confirmReset:false, copyMsg:'', showFallback:false
  };
  function blankData(){
    var d = {};
    STEPS.forEach(function(s){ d[s.id] = {foot:'', lens:'', own:'', revealed:false}; });
    return d;
  }
  state.data = blankData();

  var app = document.getElementById('app');

  function esc(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function list(){
    return state.path === 'quick' ? STEPS.filter(function(s){ return s.quick; }) : STEPS;
  }
  function isGroup(){ return state.mode === 'group'; }
  function li(arr){ return arr.map(function(t){ return '<li>'+esc(t)+'</li>'; }).join(''); }

  function trailHTML(steps, idx){
    return '<ol class="piw-trail" aria-label="Progress">' + steps.map(function(s,i){
      var cls = (i < idx ? 'piw-done ' : '') + (i === idx ? 'piw-current' : '');
      return '<li class="'+cls+'"'+(i===idx?' aria-current="step"':'')+'><span class="piw-dot"></span>'+esc(s.short)+'</li>';
    }).join('') + '</ol>';
  }

  // Each screen is a colored header band (hero) over a framed body, like the other pages on the site.
  function backLink(){
    return '<a class="piw-back" href="/for-you">&larr; Back to <strong>For You</strong></a>';
  }
  function band(inner){
    return '<header class="piw-hero"><div class="wrap piw-hero-in">'+backLink()+inner+'</div></header>';
  }
  function body(inner){
    return '<div class="piw-body"><div class="wrap piw-narrow"><div class="piw-stack">'+inner+'</div></div></div>';
  }

  // Opening screen: why the exercise exists and what it is for. Optional; a case without "why" starts at the intro.
  function whyHTML(){
    var w = CASE.why;
    var h = band('<p class="piw-eyebrow">'+esc(w.eyebrow)+'</p><h2 id="main" tabindex="-1">'+esc(w.title)+'</h2><p class="piw-lede">'+esc(w.lede)+'</p>');
    var b = w.sections.map(function(sec){
      var inner = '<h3>'+esc(sec.title)+'</h3>';
      if(sec.paragraphs){ inner += sec.paragraphs.map(function(p){ return '<p>'+esc(p)+'</p>'; }).join(''); }
      if(sec.items){ inner += '<ol>'+li(sec.items)+'</ol>'; }
      var kind = /^[a-z]+$/.test(sec.kind || '') ? sec.kind : 'story';
      return '<div class="piw-card piw-why-'+kind+'">'+inner+'</div>';
    }).join('');
    b += '<div><button type="button" class="btn btn-gold" data-action="whyNext">'+esc(w.continueLabel)+'</button></div>';
    return h + body(b);
  }

  function introHTML(){
    var group = isGroup();
    var full = state.path === 'full';
    var h = '';
    h += band('<p class="piw-eyebrow">Case consult exercise · about '+(full?'20':'10')+' minutes</p>'
      + '<h1 id="main" tabindex="-1">Put It to Work</h1>'
      + '<p class="piw-lede">Follow one family’s story a step at a time. At each step, write what people could actually do, and what is true of the person beyond the situation.</p>');
    var b = '';
    b += '<div class="piw-card piw-private"><p><strong>Private by design.</strong> What you type stays on this page. Nothing is saved or sent anywhere, and it disappears when you close the page. If you want to keep your thoughts, use Copy at the end.</p></div>';
    b += '<div class="piw-card piw-story"><h3>The story</h3>'+CASE.intro.story.map(function(p){ return '<p>'+esc(p)+'</p>'; }).join('')+'</div>';
    b += '<div class="piw-card"><h3>How it works</h3><ol>';
    b += '<li>Read one step of the story.</li>';
    b += '<li>Write two things. <strong>Human footsteps</strong> are the practical steps people could take. A <strong>spiritual lens</strong> is what is true of the person, and the idea that helps you hold it.</li>';
    b += '<li>Open one way to see it. It includes passages from the Bible and from Science and Health, and a space to add a text from your own tradition.</li>';
    b += '</ol></div>';
    b += '<div class="piw-card"><h3>Ground rules</h3><ul>';
    b += li(CASE.groundRules);
    b += '</ul></div>';
    b += '<div class="piw-stack-sm"><h3>How are you using this?</h3><div class="piw-choices" role="group" aria-label="How you are using this">';
    b += choice('setMode','solo','Just me','Work through it on your own.', state.mode==='solo');
    b += choice('setMode','group','I’m leading a group','Adds leader notes and discussion questions.', state.mode==='group');
    b += '</div></div>';
    b += '<div class="piw-stack-sm"><h3>How much time do you have?</h3><div class="piw-choices" role="group" aria-label="How much time you have">';
    b += choice('setPath','quick','About 10 minutes','Three steps: the care team, the clinic, the road ahead.', state.path==='quick');
    b += choice('setPath','full','About 20 minutes','All six steps of the story.', state.path==='full');
    b += '</div></div>';
    if(group){
      b += '<div class="piw-leader"><span class="piw-label">For the leader</span>';
      b += '<p>Pairs or small groups work well. One person reads the step aloud, everyone writes, and then each pair shares one footstep and one lens. Each step takes about three minutes.</p>';
      b += '<p>The passages here are one set of choices from the Bible and from Science and Health. Match your own texts to these thoughts: use passages from your own tradition or from your class’s study, and ask students to bring one of their own to each step.</p>';
      b += '<p>Open the “one way to see it” panel after the group has shared, not before.</p></div>';
    }
    b += '<div class="piw-row"><button class="btn btn-gold" data-action="begin">Begin</button>'+(CASE.why ? '<button type="button" class="btn btn-outline-dark" data-action="whyBack">Back</button>' : '')+'</div>';
    return h + body(b);
  }

  function choice(action, value, title, sub, pressed){
    return '<button type="button" class="piw-choice" data-action="'+action+'" data-value="'+value+'" aria-pressed="'+(pressed?'true':'false')+'"><strong>'+esc(title)+'</strong><span>'+esc(sub)+'</span></button>';
  }

  function stepHTML(){
    var steps = list();
    var s = steps[state.idx];
    var d = state.data[s.id];
    var group = isGroup();
    var h = band('<p class="piw-eyebrow">Step '+(state.idx+1)+' of '+steps.length+'</p>'+trailHTML(steps, state.idx)
      + '<h2 id="main" tabindex="-1">'+esc(s.title)+'</h2><p class="piw-practice">'+esc(s.practice)+'</p>');
    var b = '<div class="piw-card piw-story"><span class="piw-label">The situation</span>';
    if(state.path === 'quick' && s.quickLead){ b += '<p class="piw-earlier">'+esc(s.quickLead)+'</p>'; }
    b += s.story.map(function(p){ return '<p>'+esc(p)+'</p>'; }).join('');
    b += '</div>';
    b += '<div class="piw-cols">';
    b += '<div class="piw-col piw-col-foot"><label for="foot-'+s.id+'"><span class="piw-tag piw-tag-foot">Human footsteps</span></label><p class="piw-help">What practical steps could people take? Think calls, forms, questions, notes, rides, translation, and listening.</p><textarea id="foot-'+s.id+'" data-bind="step:'+s.id+':foot" autocomplete="off"></textarea></div>';
    b += '<div class="piw-col piw-col-lens"><label for="lens-'+s.id+'"><span class="piw-tag piw-tag-lens">Spiritual lens</span></label><p class="piw-help">What is true of this person beyond the situation, and what idea helps you hold it?</p><textarea id="lens-'+s.id+'" data-bind="step:'+s.id+':lens" autocomplete="off"></textarea></div>';
    b += '</div>';
    b += '<div class="piw-row"><button type="button" id="reveal-btn" class="btn btn-outline-dark" data-action="reveal" aria-expanded="'+(d.revealed?'true':'false')+'">'+(d.revealed?'Hide one way to see it':'Show one way to see it')+'</button><span class="piw-note">Write yours first, then open this. It works better that way.</span></div>';
    if(d.revealed){
      b += '<div class="piw-card piw-reveal piw-stack" role="region" aria-label="One way to see it">';
      b += '<h3>One way to see it</h3>';
      b += '<div class="piw-cols piw-models"><div class="piw-col piw-col-foot"><span class="piw-tag piw-tag-foot">Human footsteps</span><ul>'+li(s.foot)+'</ul></div><div class="piw-col piw-col-lens"><span class="piw-tag piw-tag-lens">Spiritual lens</span><ul>'+li(s.lens)+'</ul></div></div>';
      b += '<div class="piw-stack-sm"><h3>Passages one teacher might choose</h3>';
      b += s.passages.map(function(p){ return '<blockquote class="piw-passage"><p>'+esc(p.text)+'</p><cite>'+esc(p.ref)+'</cite></blockquote>'; }).join('');
      b += '</div>';
      b += '<div class="piw-stack-sm"><label for="own-'+s.id+'"><h3>'+(group?'A text you or a student would bring to this step':'Add a text of your own')+'</h3></label><p class="piw-note">Optional. A passage, poem, or teaching from your own tradition that speaks to this step.</p><textarea id="own-'+s.id+'" class="piw-short" data-bind="step:'+s.id+':own" autocomplete="off"></textarea></div>';
      b += '<div class="piw-stack-sm"><h3>Talk it over</h3><p>'+esc(s.talk)+'</p></div>';
      if(group){ b += '<div class="piw-leader"><span class="piw-label">For the leader</span><p>'+esc(s.leader)+'</p></div>'; }
      b += '</div>';
    }
    var last = state.idx === steps.length - 1;
    b += '<div class="piw-row piw-between"><button type="button" class="btn btn-outline-dark" data-action="back">'+(state.idx===0?'Back to start':'Previous step')+'</button><button type="button" class="btn btn-gold" data-action="next">'+(last?'Finish':'Next step')+'</button></div>';
    return h + body(b);
  }

  function summaryHTML(){
    return list().map(function(s){
      var d = state.data[s.id];
      function line(tagCls, tagTxt, val){
        return '<div class="piw-line"><span class="piw-tag piw-tag-'+tagCls+'">'+tagTxt+'</span><p>'+(val.trim() ? esc(val) : '<span class="piw-blank">Left blank</span>')+'</p></div>';
      }
      var out = '<div class="piw-sum"><h4>'+esc(s.title)+'</h4>';
      out += line('foot','Human footsteps', d.foot);
      out += line('lens','Spiritual lens', d.lens);
      if(d.own.trim()){ out += line('lens','My own text', d.own); }
      return out + '</div>';
    }).join('');
  }

  function endHTML(){
    var group = isGroup();
    var h = band('<p class="piw-eyebrow">Last step</p><h2 id="main" tabindex="-1">Put it together</h2>');
    var b = '<div class="piw-card piw-stack"><div class="piw-stack-sm"><label for="love"><h3>Where did love show up as action in this story?</h3></label><textarea id="love" class="piw-short" data-bind="end:love" autocomplete="off"></textarea></div>';
    b += '<div class="piw-stack-sm"><label for="sentence"><h3>Write one sentence you could carry into any hospital, classroom, or hard conversation.</h3></label><textarea id="sentence" class="piw-short" data-bind="end:sentence" autocomplete="off"></textarea></div></div>';
    if(group){
      b += '<div class="piw-leader"><span class="piw-label">For the leader</span><p>Talk it over as a group:</p><ol>'+li(GROUP_CLOSING)+'</ol><p>Close by asking each student to read their sentence aloud, or to keep it private if they prefer.</p></div>';
    }
    b += '<div class="piw-card"><h3>Your thoughts</h3>'+summaryHTML()+'</div>';
    b += '<div class="piw-card piw-private piw-stack-sm"><p><strong>Nothing was saved.</strong> If you want these words later, copy them now.</p>';
    b += '<div class="piw-row"><button type="button" id="copy-btn" class="btn btn-gold" data-action="copy">Copy my thoughts</button></div>';
    b += '<p class="piw-note" role="status" aria-live="polite">'+esc(state.copyMsg)+'</p>';
    if(state.showFallback){ b += '<textarea id="fallback" class="piw-short" readonly aria-label="Your thoughts, ready to copy"></textarea>'; }
    b += '</div>';
    b += '<div class="piw-row piw-between"><button type="button" class="btn btn-outline-dark" data-action="back">Previous step</button>';
    if(state.confirmReset){
      b += '<span class="piw-row"><span class="piw-note">This clears everything you typed.</span><button type="button" class="btn btn-gold piw-small" data-action="resetYes">Yes, clear it</button><button type="button" class="btn btn-outline-dark piw-small" data-action="resetNo">Keep it</button></span>';
    } else {
      b += '<button type="button" class="btn btn-outline-dark" data-action="reset">Start over</button>';
    }
    b += '</div>';
    return h + body(b);
  }

  function getBound(t){
    var p = t.getAttribute('data-bind').split(':');
    if(p[0] === 'step'){ return state.data[p[1]][p[2]]; }
    return state.end[p[1]];
  }
  function setBound(t){
    var p = t.getAttribute('data-bind').split(':');
    if(p[0] === 'step'){ state.data[p[1]][p[2]] = t.value; }
    else { state.end[p[1]] = t.value; }
  }

  function buildText(){
    var out = ['PUT IT TO WORK', 'Case: '+CASE.caseLabel, ''];
    list().forEach(function(s, i){
      var d = state.data[s.id];
      out.push('Step '+(i+1)+': '+s.title);
      out.push('Human footsteps: '+(d.foot.trim() || '(left blank)'));
      out.push('Spiritual lens: '+(d.lens.trim() || '(left blank)'));
      if(d.own.trim()){ out.push('My own text: '+d.own.trim()); }
      out.push('');
    });
    out.push('Where love showed up as action: '+(state.end.love.trim() || '(left blank)'));
    out.push('My sentence to carry: '+(state.end.sentence.trim() || '(left blank)'));
    return out.join('\n');
  }

  function render(focusId, keepScroll){
    app.innerHTML = state.screen === 'why' ? whyHTML() : (state.screen === 'intro' ? introHTML() : (state.screen === 'step' ? stepHTML() : endHTML()));
    var tas = app.querySelectorAll('textarea[data-bind]');
    for(var i = 0; i < tas.length; i++){ tas[i].value = getBound(tas[i]); }
    var fb = document.getElementById('fallback');
    if(fb){ fb.value = buildText(); fb.focus(); fb.select(); }
    if(!keepScroll){ window.scrollTo(0, 0); }
    var target = focusId ? document.getElementById(focusId) : document.getElementById('main');
    if(target && !fb){ try{ target.focus({preventScroll:true}); }catch(e){} }
  }

  function go(screen, idx){
    state.screen = screen;
    if(typeof idx === 'number'){ state.idx = idx; }
    state.confirmReset = false;
    state.copyMsg = '';
    state.showFallback = false;
    render();
  }

  function copyThoughts(){
    var text = buildText();
    var done = function(ok){
      state.copyMsg = ok ? 'Copied. Paste it somewhere you keep.' : 'Your browser blocked copying. Select the text below and copy it.';
      state.showFallback = !ok;
      render(ok ? 'copy-btn' : null, true);
    };
    try{
      navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); });
    }catch(e){ done(false); }
  }

  // The site's main.js is deliberately not loaded here, so the page carries its own tiny menu toggle.
  var navBtn = document.querySelector('.nav-toggle');
  var navList = document.getElementById('primary-nav');
  if(navBtn && navList){
    navBtn.addEventListener('click', function(){
      var open = navList.classList.toggle('open');
      navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  app.addEventListener('click', function(e){
    var b = e.target.closest('[data-action]');
    if(!b){ return; }
    var a = b.getAttribute('data-action');
    var v = b.getAttribute('data-value');
    if(a === 'setMode'){ state.mode = v; render(null, true); }
    else if(a === 'setPath'){ state.path = v; render(null, true); }
    else if(a === 'whyNext'){ go('intro'); }
    else if(a === 'whyBack'){ go('why'); }
    else if(a === 'begin'){ go('step', 0); }
    else if(a === 'next'){
      if(state.idx < list().length - 1){ go('step', state.idx + 1); } else { go('end'); }
    }
    else if(a === 'back'){
      if(state.screen === 'end'){ go('step', list().length - 1); }
      else if(state.idx === 0){ go('intro'); }
      else { go('step', state.idx - 1); }
    }
    else if(a === 'reveal'){
      var d = state.data[list()[state.idx].id];
      d.revealed = !d.revealed;
      render('reveal-btn', true);
    }
    else if(a === 'copy'){ copyThoughts(); }
    else if(a === 'reset'){ state.confirmReset = true; render(null, true); }
    else if(a === 'resetNo'){ state.confirmReset = false; render(null, true); }
    else if(a === 'resetYes'){
      state.data = blankData();
      state.end = {love:'', sentence:''};
      state.mode = 'solo'; state.path = 'full';
      go('intro');
    }
  });

  app.addEventListener('input', function(e){
    var t = e.target;
    if(t && t.getAttribute && t.getAttribute('data-bind')){ setBound(t); }
  });

  function startCase(c){
    CASE = c;
    STEPS = c.steps;
    GROUP_CLOSING = c.closingQuestions;
    state.data = blankData();
    state.screen = c.why ? 'why' : 'intro';
    render();
  }

  function showLoadError(){
    app.innerHTML = '<div class="card"><p>This exercise could not be loaded. Please reload the page.</p></div>';
  }

  // The one network request on this page: a plain GET for the static case file, made once
  // at load, before anything can be typed. It carries no body and no visitor input.
  var wanted = (new URLSearchParams(window.location.search)).get('case');
  var caseId = /^[a-z0-9-]{1,60}$/.test(wanted || '') ? wanted : 'leo-and-mia';
  fetch('/content/put-it-to-work/' + caseId + '.json').then(function(r){
    if(!r.ok){ throw new Error('case ' + r.status); }
    return r.json();
  }).then(startCase).catch(function(){
    if(caseId !== 'leo-and-mia'){
      return fetch('/content/put-it-to-work/leo-and-mia.json').then(function(r){ return r.json(); }).then(startCase);
    }
    throw new Error('no case');
  }).catch(showLoadError);
})();
