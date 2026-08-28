// Spiritual Lesson Plans — /lessons keyword search
//
// Progressive enhancement only. The search field is hidden until the inline
// `html.js` gate confirms scripting (see style.css), so a no-JS visitor
// never sees a dead input — every lesson stays reachable through the static
// "by age" / "by what's going on" panels regardless.
//
// This is a filter over data already on the page: every lesson card carries
// a `data-search` blob (lesson title + hook + topic-tag slugs and their
// human labels) baked in by scripts/update-lessons-page.pl. No fetch, no
// index — just show/hide cards whose blob contains every typed token.
//
// It composes with, rather than replaces, the other two /lessons scripts:
//   - lessons-lens.js hides the inactive panel  ([hidden] on .lens-panel)
//   - age-context.js  hides non-active band sections ([hidden] on .band-section)
// This script only ever toggles a class on individual *cards*, so the
// active-facet view is preserved and clearing the box restores it exactly.

(function () {
  "use strict";

  var DEBOUNCE_MS = 120;

  // Must stay in lockstep with search_blob() in scripts/update-lessons-page.pl.
  function normalize(s) {
    return (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^ | $/g, "");
  }
  function tokenize(q) {
    var n = normalize(q);
    return n.length ? n.split(" ") : [];
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

    var lastRaw = "";

    function activeLens() {
      if (panels.category && !panels.category.hidden && panels.age && panels.age.hidden) {
        return "category";
      }
      return "age";
    }

    // A card counts as on-screen if it isn't search-hidden and no ancestor
    // between it and its panel is [hidden] (that's age-context's band filter).
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

    function announce(tokens) {
      var q = lastRaw.trim();
      if (!tokens.length) {
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

    function apply(raw) {
      lastRaw = raw;
      var tokens = tokenize(raw);
      var active = tokens.length > 0;
      root.classList.toggle("is-active", active);
      if (clearBtn) clearBtn.hidden = !active;

      cards.forEach(function (card) {
        if (!active) {
          card.classList.remove("is-search-hidden");
          return;
        }
        var hay = card.getAttribute("data-search") || "";
        var hit = tokens.every(function (t) { return hay.indexOf(t) !== -1; });
        card.classList.toggle("is-search-hidden", !hit);
        // A filtered-in card must actually be visible even if the scroll
        // reveal never fired for its row yet.
        if (hit) card.classList.add("is-visible");
      });

      announce(tokens);
    }

    var timer = null;
    function schedule() {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(function () { apply(input.value); }, DEBOUNCE_MS);
    }

    input.addEventListener("input", schedule);
    // Native "search" event fires on the type=search clear (×) and on Enter.
    input.addEventListener("search", function () { apply(input.value); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && input.value) {
        e.preventDefault();
        input.value = "";
        apply("");
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        input.value = "";
        apply("");
        input.focus();
      });
    }

    // When the lens tab or the age band changes while a search is live, the
    // set of cards on screen shifts even though the query didn't — re-announce.
    document.addEventListener("click", function (e) {
      if (lastRaw && e.target && e.target.closest && e.target.closest("[data-lens-tab]")) {
        window.setTimeout(function () { announce(tokenize(lastRaw)); }, 0);
      }
    });
    document.addEventListener("slp:band-changed", function () {
      if (lastRaw) announce(tokenize(lastRaw));
    });

    // Restore-from-bfcache / autofill: honor a value already in the box.
    if (input.value) apply(input.value);
  });
})();
