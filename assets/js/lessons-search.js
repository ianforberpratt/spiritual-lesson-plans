// Spiritual Lesson Plans — /lessons keyword search
//
// Progressive enhancement only. The search field is hidden until the inline
// `html.js` gate confirms scripting (see style.css), so a no-JS visitor
// never sees a dead input — every lesson stays reachable through the static
// "by age" / "by what's going on" panels regardless.
//
// A filter over data already on the page. Every lesson card carries a
// `data-search` blob baked in by scripts/update-lessons-page.pl — title +
// hook + topic-tag slugs/labels + any author `search_terms:` + a per-lesson
// synonym expansion. This file adds the query-side half: filler words are
// dropped, and feeling/situation words are widened to their everyday
// equivalents (ALIASES below) so "my kid is scared to speak up" reaches the
// lessons about fear even if none of them use the word "scared". Matching is
// AND across the distinct concepts typed, OR within each concept's aliases;
// results are ranked by how many alias hits each card racks up.
//
// It composes with, not replaces, the other two /lessons scripts:
//   - lessons-lens.js hides the inactive panel   ([hidden] on .lens-panel)
//   - age-context.js  hides non-active band sections ([hidden] on .band-section)
// This script only toggles a class on individual cards and reorders them
// within their own grid, so the active-facet view is preserved and clearing
// the box restores the original order exactly.

(function () {
  "use strict";

  var DEBOUNCE_MS = 120;

  // Filler words dropped from a typed query so natural phrasing still matches
  // — "a mistake I regret" -> [mistake, regret]. Tuned to how mentors actually
  // type here: grammar words, plus corpus-wide words ("god", "love") that
  // carry no signal on a site that is entirely about them, plus vague framing
  // nouns ("kid", "friend", "group", "parent") that would otherwise act as a
  // required filter and sink an otherwise-good query.
  var STOPWORDS = {};
  ("a an and the i im me my mine we us our you your he she they them his her their " +
   "is am are was were be been being do does did done get got gets getting go goes " +
   "to of in on at it its that this these those there here with for from by as about " +
   "or but if so than then when while into onto over under out up down back " +
   "not no nor cant wont dont didnt isnt arent " +
   "keep keeps kept keeping always never sometimes still just really very kinda sorta " +
   "some any all more most much many one ones another other others every each " +
   "who whom whose what which why how where whenever whatever " +
   "feeling feel feels felt feelings " +
   "someone somebody something anyone anybody people person " +
   "kid kids child children student students teen teens youth " +
   "friend friends group class classroom lesson lessons " +
   "parent parents mom dad mother father family grandparent grandma grandpa " +
   "god jesus christ love loves loving " +
   "teach teaching mentor mentoring help need want thing things way ways stuff " +
   "home church week today "
  ).split(" ").forEach(function (w) { if (w) STOPWORDS[w] = 1; });

  // Feeling / situation words -> everyday equivalents. A hand list: a missing
  // entry only means a missed match, never an error. Widen freely.
  var ALIASES = {
    sad: ["sad","sadness","unhappy","tearful","crying","grieving"],
    unhappy: ["unhappy","sad","miserable"],
    scared: ["scared","afraid","fear","fearful","anxious","nervous","worried","anxiety","terrified"],
    afraid: ["afraid","scared","fear","anxious","nervous"],
    anxious: ["anxious","anxiety","worried","worry","nervous","scared","stressed","overwhelmed"],
    anxiety: ["anxiety","anxious","worried","nervous","scared","stressed"],
    worried: ["worried","worry","anxious","nervous","scared","afraid"],
    nervous: ["nervous","anxious","scared","worried"],
    stressed: ["stressed","stress","overwhelmed","anxious","pressure","burnout","burned"],
    overwhelmed: ["overwhelmed","stressed","anxious","too much"],
    angry: ["angry","anger","mad","furious","rage","frustrated","resentment"],
    mad: ["mad","angry","anger","furious","upset"],
    frustrated: ["frustrated","frustration","annoyed","irritated","fed up"],
    lonely: ["lonely","loneliness","alone","isolated","left out","excluded","friendless","unseen"],
    alone: ["alone","lonely","isolated","loneliness"],
    grief: ["grief","grieving","loss","mourning","died","death","bereavement","gone"],
    grieving: ["grieving","grief","mourning","loss"],
    died: ["died","death","dead","passed away","passed","gone","loss","grief"],
    death: ["death","died","dead","dying","loss","grief"],
    dying: ["dying","death","died","terminal"],
    loss: ["loss","lost","grief","died","death","mourning"],
    mourning: ["mourning","grief","grieving","loss"],
    passed: ["passed away","passed on","died","death","loss","grief"],
    leaving: ["leaving","left out","excluded","abandoned","lonely"],
    left: ["left out","excluded","leaving","lonely","friendless"],
    jealous: ["jealous","jealousy","envy","envious","comparison","comparing","insecure"],
    jealousy: ["jealousy","jealous","envy","comparison"],
    envy: ["envy","jealous","jealousy","envious"],
    insecure: ["insecure","insecurity","not enough","worthless","self doubt","confidence"],
    worthless: ["worthless","not enough","insecure","failure","useless"],
    confidence: ["confidence","insecure","self esteem","not enough"],
    comparison: ["comparison","comparing","compare","jealous","envy","measuring up"],
    bullied: ["bullied","bully","bullying","picked on","teased","made fun","mean"],
    bully: ["bully","bullying","bullied","mean","cruel"],
    mean: ["mean","cruel","unkind","bully","bullying"],
    guilt: ["guilt","guilty","shame","ashamed","regret"],
    guilty: ["guilty","guilt","shame","ashamed","regret"],
    shame: ["shame","ashamed","guilt","guilty","embarrassed"],
    regret: ["regret","regrets","regretting","mistake","guilt"],
    mistake: ["mistake","mistakes","messed up","screwed up","did wrong","regret"],
    failure: ["failure","failed","failing","not enough","mistake"],
    doubt: ["doubt","doubting","dont believe","crisis of faith","is god real"],
    doubting: ["doubting","doubt","dont believe","crisis of faith"],
    faith: ["faith","doubt","belief","crisis of faith"],
    prayer: ["prayer","pray","praying"],
    temptation: ["temptation","tempted","craving","urge","impulse"],
    tempted: ["tempted","temptation","urge","craving"],
    addiction: ["addiction","addicted","habit","cant stop","hooked","compulsion"],
    burnout: ["burnout","burned out","exhausted","drained","unmotivated","checked out","no energy","going through the motions"],
    tired: ["tired","exhausted","drained","burnout","worn out"],
    betrayed: ["betrayed","betrayal","backstabbed","lied to","went behind"],
    betrayal: ["betrayal","betrayed","backstabbed"],
    fight: ["fight","fighting","conflict","argument","falling out","feud"],
    fighting: ["fighting","fight","conflict","argument","feud"],
    conflict: ["conflict","fight","fighting","argument","tension","falling out","feud"],
    drama: ["drama","conflict","fighting","falling out","tension"],
    forgive: ["forgive","forgiveness","forgiving","let go","move past"],
    forgiveness: ["forgiveness","forgive","forgiving","reconcile"],
    enemy: ["enemy","enemies","conflict","someone i cant stand","cant stand"],
    decision: ["decision","decisions","decide","deciding","choice","choose","choosing","crossroads"],
    decisions: ["decisions","decision","decide","choice","choosing"],
    decide: ["decide","decision","choosing","choice"],
    choice: ["choice","choices","decision","decide","choosing"],
    stuck: ["stuck","stuck","not sure what to do","cant decide","crossroads"],
    lost: ["lost","stuck","direction","which way","adrift"],
    gay: ["gay","lgbtq","lgbtqia","queer","lesbian","bisexual","orientation"],
    lgbtq: ["lgbtq","lgbtqia","gay","queer","lesbian","bisexual","transgender","orientation"],
    queer: ["queer","lgbtq","lgbtqia","gay"],
    porn: ["porn","pornography","nudes","explicit"],
    pornography: ["pornography","porn","nudes"],
    lust: ["lust","desire","temptation","attraction"],
    crush: ["crush","attraction","feelings for","liking someone"],
    attraction: ["attraction","crush","desire","drawn to"],
    lonely: ["lonely","loneliness","alone","isolated","left out","excluded","friendless"],
    belonging: ["belonging","belong","fit in","left out","outsider","dont fit"],
    identity: ["identity","who am i","who i am","self","real me"]
  };

  function normalize(s) {
    return (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^ | $/g, "");
  }

  // A typed query -> a list of "concepts". Each concept is an array of
  // acceptable strings (the word plus its aliases). A card matches a concept
  // if any one of them appears in its blob.
  function toConcepts(q) {
    var n = normalize(q);
    if (!n.length) return [];
    var words = n.split(" ").filter(function (t) { return !STOPWORDS[t]; });
    if (!words.length) words = n.split(" "); // query was all stopwords
    var seen = {};
    var concepts = [];
    words.forEach(function (w) {
      if (seen[w]) return;
      seen[w] = 1;
      concepts.push(ALIASES[w] ? ALIASES[w] : [w]);
    });
    return concepts;
  }

  document.addEventListener("DOMContentLoaded", function () {
    var root = document.querySelector("[data-lessons-search]");
    if (!root) return;

    var input = root.querySelector("[data-lessons-search-input]");
    var clearBtn = root.querySelector("[data-lessons-search-clear]");
    var statusEl = root.querySelector("[data-lessons-search-status]");
    var emptyEl = root.querySelector("[data-lessons-search-empty]");
    var termEl = emptyEl && emptyEl.querySelector("[data-lessons-search-term]");
    if (!input) return;

    var panels = {
      age: document.getElementById("lens-panel-age"),
      category: document.getElementById("lens-panel-category")
    };
    var cards = Array.prototype.slice.call(document.querySelectorAll(".lens-panel [data-search]"));
    if (!cards.length) return;

    // Snapshot each grid's original child order, to restore on clear and to
    // break ranking ties by it.
    var containers = [];
    cards.forEach(function (card) {
      var p = card.parentNode, found = null, i;
      for (i = 0; i < containers.length; i++) { if (containers[i].el === p) { found = containers[i]; break; } }
      if (!found) { found = { el: p, order: [] }; containers.push(found); }
      found.order.push(card);
    });

    var lastRaw = "";

    function activeLens() {
      if (panels.category && !panels.category.hidden && panels.age && panels.age.hidden) return "category";
      return "age";
    }

    function isShown(card, panel) {
      if (card.classList.contains("is-search-hidden")) return false;
      var el = card.parentNode;
      while (el && el !== panel) {
        if (el.nodeType === 1 && el.hasAttribute("hidden")) return false;
        el = el.parentNode;
      }
      return true;
    }

    function countShown(lens) {
      var panel = panels[lens];
      if (!panel) return 0;
      var n = 0;
      Array.prototype.forEach.call(panel.querySelectorAll("[data-search]"), function (card) {
        if (isShown(card, panel)) n++;
      });
      return n;
    }

    function announce(active) {
      var q = lastRaw.trim();
      if (!active) {
        if (statusEl) statusEl.textContent = "";
        if (emptyEl) emptyEl.hidden = true;
        return;
      }
      var count = countShown(activeLens());
      if (statusEl) {
        statusEl.textContent = count === 1
          ? "1 lesson matches “" + q + "”."
          : count + " lessons match “" + q + "”.";
      }
      if (emptyEl) {
        emptyEl.hidden = count !== 0;
        if (termEl) termEl.textContent = "“" + q + "”";
      }
    }

    function restoreOrder() {
      containers.forEach(function (ct) {
        ct.order.forEach(function (c) { ct.el.appendChild(c); });
      });
    }

    // Alias hits for one concept in a blob.
    function conceptHits(blob, aliases) {
      var n = 0;
      for (var j = 0; j < aliases.length; j++) if (blob.indexOf(aliases[j]) !== -1) n++;
      return n;
    }
    // strict: every concept must appear (returns total hits, or -1). loose:
    // any concept is enough (returns total hits, 0 = nothing).
    function scoreCard(blob, concepts, strict) {
      var total = 0, matched = 0;
      for (var i = 0; i < concepts.length; i++) {
        var h = conceptHits(blob, concepts[i]);
        if (h) { matched++; total += h; }
        else if (strict) return -1;
      }
      return strict ? total : (matched ? total : 0);
    }

    function apply(raw) {
      lastRaw = raw;
      var concepts = toConcepts(raw);
      var active = concepts.length > 0;
      root.classList.toggle("is-active", active);
      if (clearBtn) clearBtn.hidden = !active;

      if (!active) {
        cards.forEach(function (card) { card.classList.remove("is-search-hidden"); });
        restoreOrder();
        announce(false);
        return;
      }

      // Pass 1: strict (every concept present). Pass 2 (only if pass 1 found
      // nothing): loose (any concept) — so a query never dead-ends just
      // because one real word in it isn't anywhere in the catalogue.
      function run(strict) {
        var any = false;
        cards.forEach(function (card) {
          var score = scoreCard(card.getAttribute("data-search") || "", concepts, strict);
          card._score = score;
          card._hit = strict ? score >= 0 : score > 0;
          if (card._hit) any = true;
        });
        return any;
      }
      if (!run(true) && concepts.length > 1) run(false);

      // Per grid: rank hits best-first, and when a broad one-word query lights
      // up most of the catalogue, keep only the top few so the list stays
      // scannable. Non-hits go back in their original order, hidden.
      var MAX_PER_GRID = 8;
      containers.forEach(function (ct) {
        var hits = ct.order.filter(function (c) { return c._hit; })
                           .sort(function (a, b) { return b._score - a._score; });
        var rest = ct.order.filter(function (c) { return !c._hit; });
        hits.forEach(function (c, i) {
          var show = i < MAX_PER_GRID;
          c.classList.toggle("is-search-hidden", !show);
          if (show) c.classList.add("is-visible");
        });
        rest.forEach(function (c) { c.classList.add("is-search-hidden"); });
        hits.concat(rest).forEach(function (c) { ct.el.appendChild(c); });
      });

      announce(true);
    }

    var timer = null;
    function schedule() {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(function () { apply(input.value); }, DEBOUNCE_MS);
    }

    input.addEventListener("input", schedule);
    input.addEventListener("search", function () { apply(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && input.value) { e.preventDefault(); input.value = ""; apply(""); }
    });
    if (clearBtn) {
      clearBtn.addEventListener("click", function () { input.value = ""; apply(""); input.focus(); });
    }

    // The on-screen set shifts when the lens tab or age band changes even
    // though the query didn't — re-announce the count.
    document.addEventListener("click", function (e) {
      if (lastRaw && e.target && e.target.closest && e.target.closest("[data-lens-tab]")) {
        window.setTimeout(function () { announce(true); }, 0);
      }
    });
    document.addEventListener("slp:band-changed", function () {
      if (lastRaw) announce(true);
    });

    if (input.value) apply(input.value);
  });
})();
