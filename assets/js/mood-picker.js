// Spiritual Lesson Plans — homepage mood picker ("How's your group doing today?")
//
// One tap, not a form: pick a feeling, get a lesson. Progressive enhancement —
// the whole section stays hidden in raw HTML and is only revealed once JS is
// confirmed running (the homepage's hero CTA already covers browsing without
// JS, so this is purely a bonus interaction, never the only way in).

(function () {
  "use strict";

  var BAND_ORDER = ["5-8", "8-11", "11-14", "14-21", "21-plus"];
  var BAND_LABEL = { "5-8": "K-2", "8-11": "Grade 3-5", "11-14": "Grade 6-8", "14-21": "Teen", "21-plus": "Age 21+" };
  var BAND_ACCENT = { "5-8": "gold", "8-11": "sky", "11-14": "sage", "14-21": "dusk", "21-plus": "gold-deep" };
  var DEFAULT_SLUGS = ["is-god-keeping-score", "big-ego-little-ego"];
  var STORAGE_KEY = "slp_age_band";

  document.addEventListener("DOMContentLoaded", function () {
    var section = document.querySelector("[data-mood-section]");
    var cloud = document.querySelector("[data-mood-cloud]");
    var results = document.querySelector("[data-mood-results]");
    var pickedNote = document.querySelector("[data-mood-picked]");
    var resultsGrid = document.querySelector("[data-mood-results-grid]");
    var againBtn = document.querySelector("[data-mood-again]");
    if (!section || !cloud || !results) return;

    section.hidden = false;

    var lessons = null;
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

    function getStoredAge() {
      try { return localStorage.getItem(STORAGE_KEY); } catch (err) { return null; }
    }
    function nonGated(list) {
      return list.filter(function (l) { return l.sensitiveTopic !== "teen-adult-only"; });
    }
    function dedupeGroupBySlug(items) {
      var order = [], bySlug = {};
      items.forEach(function (l) {
        if (!bySlug[l.slug]) { bySlug[l.slug] = { lesson: l, bands: [] }; order.push(l.slug); }
        bySlug[l.slug].bands.push(l);
      });
      return order.map(function (slug) { return bySlug[slug]; });
    }
    function bandDistance(a, b) {
      return Math.abs(BAND_ORDER.indexOf(a) - BAND_ORDER.indexOf(b));
    }

    function cardHTML(opts) {
      // opts: { url, band, title, hook, timeDisplay, badges: [band,...] }
      var badges = (opts.badges || [opts.band]).map(function (b) {
        return '<span class="age-badge age-badge-' + BAND_ACCENT[b] + '">' + BAND_LABEL[b] + "</span>";
      }).join("");
      return (
        '<a href="' + opts.url + '" class="topic-card reveal is-visible">' +
        '<span class="category-lesson-badges" style="margin-bottom:2px;">' + badges + "</span>" +
        "<h3>" + opts.title + "</h3>" +
        '<span class="tag">' + opts.hook + "</span>" +
        (opts.timeDisplay ? '<span class="meta">' + opts.timeDisplay + "</span>" : "") +
        "</a>"
      );
    }

    function render(items) {
      resultsGrid.innerHTML = items.join("");
    }

    var pickedLabelHTML = "";
    function showResults(html, note) {
      pickedNote.innerHTML = (pickedLabelHTML ? pickedLabelHTML + " " : "") + note;
      render(html);
      results.hidden = false;
      cloud.classList.add("is-settled");
      window.setTimeout(function () {
        results.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 250);
    }

    function matchAgeKnown(age, topic) {
      loadLessons().then(function (all) {
        var pool = nonGated(all);
        if (topic) {
          var exact = pool.filter(function (l) { return l.band === age && l.topics.indexOf(topic) !== -1; });
          if (exact.length) {
            var html = exact.slice(0, 3).map(function (l) {
              return cardHTML({ url: l.url, band: l.band, title: l.titleForBand || l.title, hook: l.hookBand || l.hook, timeDisplay: l.timeDisplay });
            });
            showResults(html, "A lesson for " + BAND_LABEL[age] + ", right now.");
            return;
          }
          var nearby = pool.filter(function (l) { return l.topics.indexOf(topic) !== -1; });
          if (nearby.length) {
            nearby.sort(function (a, b) { return bandDistance(a.band, age) - bandDistance(b.band, age); });
            var nearestBand = nearby[0].band;
            var nearItems = nearby.filter(function (l) { return l.band === nearestBand; }).slice(0, 3);
            var html2 = nearItems.map(function (l) {
              return cardHTML({ url: l.url, band: l.band, title: l.titleForBand || l.title, hook: l.hookBand || l.hook, timeDisplay: l.timeDisplay });
            });
            showResults(html2, "We don't have this one built yet for " + BAND_LABEL[age] + " &mdash; here's the closest, for " + BAND_LABEL[nearestBand] + ".");
            return;
          }
        }
        var defaults = pool.filter(function (l) { return l.band === age && DEFAULT_SLUGS.indexOf(l.slug) !== -1; });
        if (!defaults.length) defaults = pool.filter(function (l) { return l.band === age; });
        var html3 = defaults.slice(0, 3).map(function (l) {
          return cardHTML({ url: l.url, band: l.band, title: l.titleForBand || l.title, hook: l.hookBand || l.hook, timeDisplay: l.timeDisplay });
        });
        showResults(html3, "A few that work well for almost any week.");
      });
    }

    function matchAgeUnknown(topic) {
      loadLessons().then(function (all) {
        var pool = nonGated(all);
        var matched = topic ? pool.filter(function (l) { return l.topics.indexOf(topic) !== -1; }) : pool.filter(function (l) { return DEFAULT_SLUGS.indexOf(l.slug) !== -1; });
        var groups = dedupeGroupBySlug(matched).slice(0, 3);
        var html = groups.map(function (g) {
          var badges = g.bands.map(function (b) { return b.band; });
          return cardHTML({ url: g.lesson.landingUrl, title: g.lesson.title, hook: g.lesson.hook, badges: badges });
        });
        var note = topic
          ? "A few that fit &mdash; pick whichever age is yours."
          : "A few that work well for almost any week &mdash; pick whichever age is yours.";
        showResults(html, note);
      });
    }

    cloud.querySelectorAll("[data-mood-topic]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var topic = btn.getAttribute("data-mood-topic");
        var label = btn.textContent;
        cloud.querySelectorAll(".mood-chip").forEach(function (c) { c.classList.remove("is-picked"); });
        btn.classList.add("is-picked");
        pickedLabelHTML = topic ? "You said: <strong>" + label + "</strong> &mdash;" : "";
        pickedNote.innerHTML = label;

        var age = getStoredAge();
        if (age && BAND_LABEL[age]) {
          matchAgeKnown(age, topic);
        } else {
          matchAgeUnknown(topic);
        }
      });
    });

    if (againBtn) {
      againBtn.addEventListener("click", function () {
        results.hidden = true;
        cloud.classList.remove("is-settled");
        cloud.querySelectorAll(".mood-chip").forEach(function (c) { c.classList.remove("is-picked"); });
        cloud.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  });
})();
