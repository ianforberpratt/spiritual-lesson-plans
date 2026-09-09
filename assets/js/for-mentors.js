// Spiritual Lesson Plans — "The Bridge In" (For Mentors)
//
// Progressive enhancement, matching the rest of the site: the page is fully
// readable and every plank reachable with JavaScript disabled. This file only
// adds the interactive layer — the chooser's tone-line swap, the sticky bridge
// rail, the two branching scenarios, and the finite Q&A accordion.
//
// Re-platformed from the reference prototype in
// the-bridge-in-reference-implementation.html. Behaviour and copy carry over
// faithfully; the one substantive change is that the visitor's experience
// level now persists in localStorage (key slp_mentor_level), the same way the
// site-wide age-band chooser persists slp_age_band.

(function () {
  "use strict";

  var bridge = document.querySelector(".bridge");
  if (!bridge) return;

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var STORAGE_KEY = "slp_mentor_level";
  var VALID_LEVELS = ["new", "some", "years"];

  function readLevel() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return VALID_LEVELS.indexOf(v) === -1 ? null : v;
    } catch (err) { return null; }
  }
  function writeLevel(level) {
    try { localStorage.setItem(STORAGE_KEY, level); } catch (err) { /* private mode */ }
  }

  /* ---------- tone lines (the only thing the chooser changes) ---------- */

  var tones = {
    presence: {
      "new": "You don't need a lesson plan mastered yet. You need to be a person who's actually there. Start with that.",
      some: "You've got some reps in. This is worth a re-read anyway — it's the thing that's easiest to let slip once teaching starts feeling routine.",
      years: "You know this bridge by heart. Walk it anyway — the ones we know best are the ones we stop looking down at."
    },
    facilitation: {
      "new": "First time asking a room full of kids a question and getting silence back? Keep reading — that's normal, and there's a way through it below.",
      some: "You've probably already noticed the difference between a question that lands and one that doesn't. Here's the pattern underneath it.",
      years: "This one's for the autopilot check — even good facilitators drift toward 'the answer is' without noticing."
    },
    quiet: {
      "new": "This will happen to you. Probably soon. Here's what it actually means, and what to do.",
      some: "You've sat in this silence before. Here's a slightly different way to read it.",
      years: "You've made peace with silence by now. This is just a reminder of why it was never the enemy you once thought it was."
    },
    conflict: {
      "new": "This is the one new mentors worry about most. Good news: you don't need to be a mediator. You need four moves.",
      some: "You've broken up a disagreement or two by now. Here's the difference between managing it and actually repairing it.",
      years: "You've got your own instincts here already. Compare notes with these moves anyway."
    },
    genz: {
      "new": "Whatever generation you grew up in, this one's different — in good ways. Here's what actually reaches them.",
      some: "A few reminders about what's actually landing with this group, not what you assume is landing.",
      years: "The room in front of you now isn't the room you started with years ago. Worth a re-look."
    }
  };
  var levelNames = { "new": "new to this", some: "some experience", years: "years in" };
  var acks = {
    "new": "Good. Nothing below assumes you've done this before.",
    some: "Good. We'll skip the hand-holding and get to the patterns.",
    years: "Good. Consider this a gut-check, not a lecture."
  };

  var currentLevel = readLevel() || "new";
  var toneEls = bridge.querySelectorAll(".tone-line[data-tone]");
  var ackEl = document.getElementById("ack");

  function applyTones() {
    Array.prototype.forEach.call(toneEls, function (el) {
      var key = el.getAttribute("data-tone");
      if (tones[key] && tones[key][currentLevel]) el.textContent = tones[key][currentLevel];
    });
  }

  /* ---------- chooser ---------- */

  var cards = Array.prototype.slice.call(document.querySelectorAll("#cards .card"));

  function selectCard(level, persist) {
    if (VALID_LEVELS.indexOf(level) === -1) return;
    currentLevel = level;
    cards.forEach(function (c) {
      var on = c.getAttribute("data-level") === level;
      c.classList.toggle("picked", on);
      c.setAttribute("aria-pressed", on ? "true" : "false");
    });
    applyTones();
    if (ackEl) ackEl.textContent = acks[level] + " (" + levelNames[level] + ")";
    if (persist) writeLevel(level);
  }

  cards.forEach(function (btn) {
    btn.addEventListener("click", function () {
      selectCard(btn.getAttribute("data-level"), true);
    });
  });

  // Restore a previously chosen level; otherwise leave the cards unpicked and
  // the planks on their "new" tone line (the gentlest default).
  var stored = readLevel();
  if (stored) selectCard(stored, false);
  else applyTones();

  /* ---------- bridge progress rail ---------- */

  var railButtons = Array.prototype.slice.call(document.querySelectorAll("#railLabels button"));
  var segs = Array.prototype.slice.call(bridge.querySelectorAll(".seg"));
  var traveler = document.getElementById("traveler");
  var segCenters = [8, 25.5, 42.5, 59.5, 76.5, 93]; // approx % centres of the 6 rail segments
  var activeIdx = -1;

  function setActive(idx) {
    if (idx === activeIdx) return;
    activeIdx = idx;
    railButtons.forEach(function (b, i) {
      b.setAttribute("aria-current", i === idx ? "true" : "false");
    });
    segs.forEach(function (s, i) {
      var filled = i <= idx;
      s.setAttribute("fill", filled ? "var(--gold)" : "transparent");
      s.setAttribute("opacity", filled ? ".55" : "1");
    });
    if (traveler) traveler.style.left = segCenters[Math.max(0, idx)] + "%";
  }
  setActive(0);

  railButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = document.getElementById(btn.getAttribute("data-target"));
      if (target) target.scrollIntoView({ block: "start" });
    });
  });

  var planks = Array.prototype.slice.call(bridge.querySelectorAll("[data-plank]"));
  if ("IntersectionObserver" in window && planks.length) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) setActive(parseInt(e.target.getAttribute("data-plank"), 10));
      });
    }, { rootMargin: "-40% 0px -50% 0px" });
    planks.forEach(function (p) { obs.observe(p); });
  }

  /* ---------- branching scenarios (all options stay explorable) ---------- */

  var scenarioData = {
    quiet: {
      fill: "That's the easiest habit to fall into — try to resist it. Silence almost never means the room is against you. Check the obvious things first: are they hungry, tired, too warm, sitting too long? If none of that's it, the silence is just doing its job — it's the space where a real answer gets found instead of a fast one.",
      call: "Sometimes that works. But if it becomes your only move, kids learn the game is 'wait to get picked' instead of 'think for myself.' Try shifting the mode instead — stand up, ask it a different way, hand someone a prop, or just name what you're noticing out loud: 'I'm noticing energy is low today — what's going on?' Sometimes the most honest, connecting thing you can do is drop the plan and just talk with them.",
      wait: "Good instinct — that's usually right. Great facilitation is less about having the right answer and more about asking the right question and then having the patience to let silence do its work. Just don't mistake waiting forever for waiting well — if it stretches past a comfortable pause, that's your cue to shift the mode, not repeat the question louder."
    },
    conflict: {
      explain: "Understandable — but try this first instead: the goal isn't a quick fix, it's understanding. Get low, get calm, and ask before you correct: 'What happened, from your side?' Most conflict in a classroom is really an unmet need wearing a mask — attention, fairness, feeling unseen.",
      separate: "That's a fine first move if things are getting loud or unsafe. But once it's calm, don't skip the second step — name what you notice ('It seems like you felt left out') before you name what needs to change. Repair matters more than rules; a kid who feels heard will let go of being right.",
      ask: "That's exactly it. Get low, get calm, ask what happened from each side. Most conflict in a classroom is really an unmet need wearing a mask — attention, fairness, feeling unseen. Name what you notice before you name what needs to change."
    }
  };

  Array.prototype.forEach.call(bridge.querySelectorAll("[data-scenario]"), function (group) {
    var key = group.getAttribute("data-scenario");
    var reframeEl = bridge.querySelector('[data-scenario-reframe="' + key + '"]');
    if (!reframeEl || !scenarioData[key]) return;
    group.querySelectorAll(".option").forEach(function (opt) {
      opt.setAttribute("aria-pressed", "false");
      opt.addEventListener("click", function () {
        group.querySelectorAll(".option").forEach(function (o) { o.setAttribute("aria-pressed", "false"); });
        opt.setAttribute("aria-pressed", "true");
        var k = opt.getAttribute("data-key");
        if (scenarioData[key][k]) {
          reframeEl.textContent = scenarioData[key][k];
          reframeEl.classList.add("show");
        }
      });
    });
  });

  /* ---------- expand/collapse accordion (shared by Q&A and the glossary) ---------- */

  function buildAccordion(mount, items, idPrefix) {
    if (!mount) return;
    items.forEach(function (item, i) {
      var aid = idPrefix + "-" + i;
      var wrap = document.createElement("div");
      wrap.className = "qa-item";
      wrap.innerHTML =
        '<button class="qa-q" aria-expanded="false" aria-controls="' + aid + '">' +
          "<span>" + item.q + '</span><span class="plus" aria-hidden="true">+</span>' +
        "</button>" +
        '<div class="qa-a" id="' + aid + '" role="region">' + item.a + "</div>";
      mount.appendChild(wrap);
      var btn = wrap.querySelector(".qa-q");
      var ans = wrap.querySelector(".qa-a");
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        ans.classList.toggle("show", !open);
      });
    });
  }

  /* ---------- finite Q&A (fixed set — not a chatbot) ---------- */

  var qa = [
    { q: "What if I don't know the answer to something a kid asks?", a: "Say that. “I don't know — let's wonder about it together” is a completely true, completely fine answer. Kids don't need you to have it all figured out. They need you to still be curious. That's most of what they're actually learning from you anyway." },
    { q: "What if I say the wrong thing?", a: "You probably will, at some point. So will I. Kids are far more forgiving of an honest misstep than they are of an adult performing certainty they don't feel. Repair it simply — “actually, I want to say that differently” — and keep going." },
    { q: "What if nobody talks and it's just me?", a: "See Plank 3 above — disengagement is almost never about you. Check the obvious (hungry, tired, too warm, too long), then shift the mode rather than repeating yourself louder." },
    { q: "What if two kids get into it, or one pushes back on me directly?", a: "See Plank 4 above — get low, get calm, ask what happened from each side before you correct anything. Repair matters more than rules." },
    { q: "What if a kid tells me something serious — abuse, neglect, something scary?", a: "Go straight to Plank 6 — “If It's Bigger Than You.” Short version: don't investigate, don't confront a parent, just report it promptly to the right authority, and know your organization's exact process before you're ever in the room alone." },
    { q: "How much do I need to prepare?", a: "Less than you think. Read the lesson once. Know your opening question. The rest is presence, not prep." },
    { q: "What if I'm brand new and have never taught anything?", a: "Then you're exactly who this bridge was built for. You don't need experience to cross it — you need willingness. That's already enough." },
    { q: "What if I've been doing this for years and this all feels like review?", a: "Then let it be a quick gut-check, not a lecture. Even a bridge you've crossed a hundred times is worth glancing down at the planks once in a while." }
  ];

  buildAccordion(document.getElementById("qaList"), qa, "qa-a");

  /* ---------- folded-back reference: glossary (same accordion) ---------- */

  var gloss = [
    { q: 'God <span class="term-alt">/ &ldquo;a power greater than yourself&rdquo; / &ldquo;the Mover&rdquo;</span>',
      a: "This site avoids assuming a young person already has a fixed idea of God, so lessons often use more open language. In Christian Science, God is understood as Love itself, and as Mind, Spirit, and Life &mdash; not a distant figure but something more like the truest reality underneath everything, always present." },
    { q: "The Christ",
      a: "In Christian Science, not only the historical man Jesus, but the eternal idea he demonstrated: that everyone has an unbreakable connection to God. Jesus is the man; &ldquo;the Christ&rdquo; is the truth he showed." },
    { q: "Prayer",
      a: "Not asking for something to happen, but the practice of aligning your own thinking with what's already true. Less &ldquo;please,&rdquo; more &ldquo;remembering.&rdquo;" },
    { q: "Demonstration",
      a: "Christian Science's word for proving a spiritual idea true through lived experience, not just believing it intellectually. If a lesson ever talks about &ldquo;living out&rdquo; an idea rather than just agreeing with it, that's this concept, unnamed." },
    { q: "Science and Health",
      a: "Mary Baker Eddy's 1875 book, the foundational text of Christian Science. Not required reading for anyone using this site." },
    { q: "Practitioner",
      a: "Someone within the Christian Science church trained to support others through prayer, roughly analogous to a chaplain. Not a role that exists on this site or is required to lead a lesson." }
  ];
  buildAccordion(document.getElementById("glossList"), gloss, "gloss-a");

  /* ---------- folded-back reference: private post-session check-in ---------- */

  var CHECKIN_RESPONSES = {
    "wrung-out": "That's real, and it's common after a lesson that mattered. Tell someone today — not the details, just “today was heavy.” Carrying it alone is the part that actually wears people down.",
    "heavy": "It's okay for it to still be sitting with you. If it's still there in a few days, that's worth talking through with a professional yourself — not because you did anything wrong, but because that's what the weight of real trust deserves.",
    "okay": "Good — and it's fine if that changes later today. Whatever settles you, do it on purpose anyway, not just whenever you happen to get to it.",
    "proud": "Good. Let that be true without qualifying it — you showed up for someone, and it went somewhere real.",
    "replaying": "That's normal, not a sign you handled it wrong. You don't have to have the answer by next session — just showing back up and saying “I'm still here” is enough."
  };

  var checkinRoot = bridge.querySelector("[data-checkin]");
  if (checkinRoot) {
    var checkinResponse = checkinRoot.querySelector("[data-checkin-response]");
    checkinRoot.querySelectorAll("[data-checkin-chip]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        checkinRoot.querySelectorAll(".checkin-chip").forEach(function (c) { c.classList.remove("is-picked"); });
        btn.classList.add("is-picked");
        var key = btn.getAttribute("data-checkin-chip");
        if (checkinResponse) {
          checkinResponse.textContent = CHECKIN_RESPONSES[key] || "";
          checkinResponse.hidden = false;
        }
      });
    });
  }

  /* ---------- "Walk it again" — return to the chooser ---------- */

  Array.prototype.forEach.call(bridge.querySelectorAll('[data-walk-again]'), function (link) {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      var chooser = document.getElementById("chooser");
      if (chooser) chooser.scrollIntoView({ block: "start" });
    });
  });
})();
