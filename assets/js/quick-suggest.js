// Spiritual Lesson Plans — homepage "Tell us what's going on" quick-suggest
//
// Progressive enhancement: the button that opens this stays hidden in raw
// HTML and is only revealed once JS is confirmed running (see the `hidden`
// attribute in index.html) — "Browse all lessons" beside it always works
// with or without JS, so nothing is ever a dead end.

(function () {
  "use strict";

  var BAND_ORDER = ["5-8", "8-11", "11-14", "14-21", "21-plus"];
  var BAND_LABEL = { "5-8": "K-2", "8-11": "Grade 3-5", "11-14": "Grade 6-8", "14-21": "Teen", "21-plus": "Age 21+" };
  var BAND_ACCENT = { "5-8": "gold", "8-11": "sky", "11-14": "sage", "14-21": "dusk", "21-plus": "gold-deep" };
  var DEFAULT_SLUGS = ["is-god-keeping-score", "big-ego-little-ego"];
  var SENSITIVE_SLUGS = ["talking-about-pornography-use", "lgbtqia-youth-and-spiritual-learning"];
  var STORAGE_KEY = "slp_age_band";

  document.addEventListener("DOMContentLoaded", function () {
    var openBtn = document.querySelector("[data-qs-open]");
    var panel = document.querySelector("[data-qs-panel]");
    if (!openBtn || !panel) return;

    var step1 = panel.querySelector('[data-qs-step="1"]');
    var step2 = panel.querySelector('[data-qs-step="2"]');
    var resultsEl = panel.querySelector("[data-qs-results]");
    var resultsNote = panel.querySelector("[data-qs-results-note]");
    var resultsGrid = panel.querySelector("[data-qs-results-grid]");
    var sensitiveNote = panel.querySelector("[data-qs-sensitive-note]");
    var sensitiveLink = panel.querySelector("[data-qs-sensitive-link]");
    var seeAllLink = panel.querySelector("[data-qs-see-all]");
    var backBtn = panel.querySelector("[data-qs-back]");
    var startOverBtn = panel.querySelector("[data-qs-start-over]");

    var state = { age: null, topic: null };
    var lessons = null; // flat list, one entry per (lesson, band), lazy-loaded

    openBtn.hidden = false;

    function loadLessons() {
      if (lessons) return Promise.resolve(lessons);
      return fetch("/assets/data/lessons-manifest.json")
        .then(function (r) { return r.json(); })
        .then(function (data) {
          var flat = [];
          data.topics.forEach(function (t) {
            t.bands.forEach(function (b) {
              flat.push({
                slug: t.slug,
                title: t.title,
                hook: t.hook,
                landingUrl: t.landingUrl,
                band: b.band,
                bandLabel: b.label,
                url: b.url,
                titleForBand: b.title,
                hookBand: b.hook,
                timeDisplay: b.timeDisplay,
                topics: (b.topic || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean),
                sensitiveTopic: b.sensitiveTopic || "none"
              });
            });
          });
          lessons = flat;
          return flat;
        });
    }

    function showStep(step) {
      step1.hidden = step !== 1;
      step2.hidden = step !== 2;
      resultsEl.hidden = step !== "results";
    }

    function reset() {
      state = { age: null, topic: null };
      showStep(1);
      panel.hidden = true;
    }

    openBtn.addEventListener("click", function () {
      panel.hidden = false;
      showStep(1);
      window.setTimeout(function () {
        panel.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 30);
    });

    // ---------- Step 1: age ----------
    step1.querySelectorAll("[data-qs-age]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.age = btn.getAttribute("data-qs-age");
        var isOlder = state.age === "14-21" || state.age === "21-plus";
        sensitiveNote.hidden = !isOlder;
        showStep(2);
      });
    });

    // ---------- Step 2: topic ----------
    step2.querySelectorAll("[data-qs-topic]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.topic = btn.getAttribute("data-qs-topic");
        runMatch();
      });
    });

    if (sensitiveLink) {
      sensitiveLink.addEventListener("click", function (e) {
        e.preventDefault();
        showSensitiveResults();
      });
    }

    if (backBtn) {
      backBtn.addEventListener("click", function () { showStep(1); });
    }
    if (startOverBtn) {
      startOverBtn.addEventListener("click", reset);
    }

    // ---------- Matching ----------

    function bandDistance(a, b) {
      return Math.abs(BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b));
    }

    function nonGated(list) {
      return list.filter(function (l) { return l.sensitiveTopic !== "teen-adult-only"; });
    }

    function renderCards(items, container) {
      container.innerHTML = "";
      items.forEach(function (l) {
        var a = document.createElement("a");
        a.href = l.url;
        a.className = "topic-card reveal is-visible";
        a.innerHTML =
          '<span class="age-badge age-badge-' + BAND_ACCENT[l.band] + '">' + BAND_LABEL[l.band] + "</span>" +
          "<h3>" + (l.titleForBand || l.title) + "</h3>" +
          '<span class="tag">' + (l.hookBand || l.hook) + "</span>" +
          '<span class="meta">' + (l.timeDisplay || "") + "</span>";
        container.appendChild(a);
      });
    }

    function showResults(items, note) {
      resultsNote.textContent = note;
      renderCards(items, resultsGrid);
      if (state.age && state.age !== "any") {
        seeAllLink.textContent = "See all lessons for " + BAND_LABEL[state.age] + " →";
        seeAllLink.href = "/lessons";
        seeAllLink.onclick = function () {
          try { localStorage.setItem(STORAGE_KEY, state.age); } catch (err) { /* private mode */ }
        };
      } else {
        seeAllLink.textContent = "See all lessons →";
        seeAllLink.href = "/lessons";
        seeAllLink.onclick = null;
      }
      showStep("results");
      window.setTimeout(function () {
        resultsEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 30);
    }

    function pickUpTo3(items) {
      return items.slice(0, 3);
    }

    function showSensitiveResults() {
      loadLessons().then(function (all) {
        var items = all.filter(function (l) { return SENSITIVE_SLUGS.indexOf(l.slug) !== -1; });
        showResults(items, "Built for Teen & Early College and up — use your judgment about the room.");
      });
    }

    function runMatch() {
      loadLessons().then(function (all) {
        var age = state.age;
        var topic = state.topic;

        if (age === "any") {
          var anyPref = ["21-plus", "14-21", "11-14", "8-11", "5-8"];
          var candidates = nonGated(all).filter(function (l) {
            return topic ? l.topics.indexOf(topic) !== -1 : false;
          });
          if (candidates.length) {
            candidates.sort(function (a, b) { return anyPref.indexOf(a.band) - anyPref.indexOf(b.band); });
            showResults(pickUpTo3(dedupeBySlug(candidates)), "A few that fit.");
            return;
          }
          // fall through to broadly-applicable defaults, any band
          var defaults = nonGated(all).filter(function (l) { return DEFAULT_SLUGS.indexOf(l.slug) !== -1; });
          defaults.sort(function (a, b) { return anyPref.indexOf(a.band) - anyPref.indexOf(b.band); });
          showResults(pickUpTo3(dedupeBySlug(defaults)), "Here are a few that work well for almost any week.");
          return;
        }

        if (topic) {
          var exact = nonGated(all).filter(function (l) { return l.band === age && l.topics.indexOf(topic) !== -1; });
          if (exact.length) {
            showResults(pickUpTo3(exact), "A few that fit.");
            return;
          }
          var nearby = nonGated(all).filter(function (l) { return l.topics.indexOf(topic) !== -1; });
          if (nearby.length) {
            nearby.sort(function (a, b) { return bandDistance(a.band, age) - bandDistance(b.band, age); });
            var nearestBand = nearby[0].band;
            var nearestItems = nearby.filter(function (l) { return l.band === nearestBand; });
            showResults(pickUpTo3(nearestItems), "We don't have this one built yet for that exact age — here's the closest version, for " + BAND_LABEL[nearestBand] + ".");
            return;
          }
          // no lesson anywhere has this topic — fall through to defaults below
        }

        var ageDefaults = nonGated(all).filter(function (l) { return l.band === age && DEFAULT_SLUGS.indexOf(l.slug) !== -1; });
        if (ageDefaults.length) {
          showResults(pickUpTo3(ageDefaults), "Here are a few that work well for almost any week.");
          return;
        }
        // last resort: any lesson built for that exact age
        var anyForAge = nonGated(all).filter(function (l) { return l.band === age; });
        showResults(pickUpTo3(anyForAge), "Here are a few that work well for almost any week.");
      });
    }

    function dedupeBySlug(items) {
      var seen = {};
      return items.filter(function (l) {
        if (seen[l.slug]) return false;
        seen[l.slug] = true;
        return true;
      });
    }
  });
})();
