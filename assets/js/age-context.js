// Spiritual Lesson Plans — site-wide age-band context
//
// Progressive enhancement only. Every page this touches already works
// without JavaScript: band sections on /lessons are all statically visible
// with real links, the nav switcher degrades to a plain link, and each
// lesson page is a normal static page regardless of what's in localStorage.
// This file just makes the experience feel alive when JS is available —
// see BUILD-BRIEF.md section 4.2.

(function () {
  "use strict";

  var STORAGE_KEY = "slp_age_band";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var BAND_LABELS = {
    "5-8": "K-2",
    "8-11": "Grade 3-5",
    "11-14": "Grade 6-8",
    "14-21": "Teen",
    "21-plus": "Age 21+"
  };
  // Kept identical to BAND_LABELS on purpose — see build-lessons.pl's
  // %BAND_SHORT comment for why there's no separate short form anymore.
  var BAND_SHORT = BAND_LABELS;
  var BAND_ORDER = ["5-8", "8-11", "11-14", "14-21", "21-plus"];

  function getStoredBand() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (err) { return null; }
  }
  function setStoredBand(band) {
    try { localStorage.setItem(STORAGE_KEY, band); } catch (err) { /* private mode */ }
  }

  /* ---------- Sync: visiting a specific lesson page sets the context ---------- */

  function initBandSync() {
    var band = document.body.getAttribute("data-age-band");
    if (band && BAND_LABELS[band]) setStoredBand(band);
  }

  /* ---------- Nav switcher ---------- */

  function initAgeSwitcher() {
    var btn = document.querySelector("[data-age-switcher]");
    if (!btn) return;

    var valueEl = btn.querySelector("[data-age-switcher-value]");
    var mobileValueEl = document.querySelector("[data-mobile-age-value]");
    var band = getStoredBand();

    function render() {
      band = getStoredBand();
      if (band && BAND_LABELS[band]) {
        btn.hidden = false;
        if (valueEl) valueEl.textContent = BAND_SHORT[band];
        btn.setAttribute("aria-label", "Currently teaching " + BAND_LABELS[band] + ". Change age group.");
        if (mobileValueEl) mobileValueEl.textContent = BAND_LABELS[band];
      } else {
        btn.hidden = false;
        if (valueEl) valueEl.textContent = "Choose age";
        btn.setAttribute("aria-label", "Choose the age group you're teaching");
        if (mobileValueEl) mobileValueEl.textContent = "Choose your age group";
      }
    }
    render();
    document.addEventListener("slp:band-changed", render);

    // Build a small menu the first time it's needed.
    var menu = document.createElement("div");
    menu.className = "age-switcher-menu";
    menu.setAttribute("role", "menu");
    BAND_ORDER.forEach(function (b) {
      var item = document.createElement("button");
      item.type = "button";
      item.setAttribute("role", "menuitem");
      item.textContent = BAND_LABELS[b];
      item.addEventListener("click", function () {
        setStoredBand(b);
        render();
        closeMenu();
        document.dispatchEvent(new CustomEvent("slp:band-changed", { detail: { band: b } }));
      });
      menu.appendChild(item);
    });
    var goToLessons = document.createElement("a");
    goToLessons.href = "/lessons";
    goToLessons.textContent = "See all lessons";
    goToLessons.style.display = "block";
    goToLessons.style.padding = "10px 12px";
    goToLessons.style.fontSize = "0.82rem";
    goToLessons.style.color = "inherit";
    goToLessons.style.borderTop = "1px solid var(--rule)";
    goToLessons.style.marginTop = "4px";
    menu.appendChild(goToLessons);

    btn.parentNode.style.position = btn.parentNode.style.position || "relative";
    btn.insertAdjacentElement("afterend", menu);

    function syncCurrent() {
      Array.prototype.forEach.call(menu.querySelectorAll("[role=menuitem]"), function (item, i) {
        var b = BAND_ORDER[i];
        if (b === band) item.setAttribute("aria-current", "true");
        else item.removeAttribute("aria-current");
      });
    }

    function openMenu() {
      syncCurrent();
      menu.classList.add("open");
      btn.setAttribute("aria-expanded", "true");
    }
    function closeMenu() {
      menu.classList.remove("open");
      btn.setAttribute("aria-expanded", "false");
    }

    btn.setAttribute("aria-haspopup", "true");
    btn.setAttribute("aria-expanded", "false");
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (menu.classList.contains("open")) closeMenu(); else openMenu();
    });
    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target) && e.target !== btn) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) { closeMenu(); btn.focus(); }
    });
  }

  /* ---------- /lessons: chooser status + band-section filtering ---------- */

  function initLessonsPage() {
    var chooser = document.querySelector("[data-age-chooser]");
    var statusBar = document.querySelector("[data-age-chooser-status]");
    var sections = document.querySelectorAll(".band-section");
    if (!chooser && !sections.length) return;

    function showBand(band, opts) {
      opts = opts || {};
      Array.prototype.forEach.call(sections, function (sec) {
        var match = sec.getAttribute("data-band") === band;
        sec.hidden = !match;
      });
      Array.prototype.forEach.call(document.querySelectorAll(".age-chooser-card"), function (card) {
        if (card.getAttribute("data-band") === band) card.setAttribute("aria-current", "true");
        else card.removeAttribute("aria-current");
      });
      if (statusBar) {
        var label = BAND_LABELS[band] || band;
        statusBar.hidden = false;
        var strongEl = statusBar.querySelector("strong");
        if (strongEl) strongEl.textContent = label;
      }
      if (chooser) chooser.hidden = !opts.keepChooserOpen && true;
      if (chooser && opts.keepChooserOpen) chooser.hidden = false;
    }

    function reset() {
      Array.prototype.forEach.call(sections, function (sec) { sec.hidden = false; });
      if (chooser) chooser.hidden = false;
      if (statusBar) statusBar.hidden = true;
    }

    if (chooser) {
      Array.prototype.forEach.call(chooser.querySelectorAll(".age-chooser-card"), function (card) {
        card.addEventListener("click", function (e) {
          var band = card.getAttribute("data-band");
          if (!band) return;
          e.preventDefault();
          setStoredBand(band);
          showBand(band);
          document.dispatchEvent(new CustomEvent("slp:band-changed", { detail: { band: band } }));
          var target = document.getElementById("band-" + band);
          if (target && !reduceMotion) {
            window.setTimeout(function () {
              target.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 50);
          }
        });
      });
    }

    if (statusBar) {
      var changeBtn = statusBar.querySelector("[data-change-band]");
      if (changeBtn) {
        changeBtn.addEventListener("click", function () { reset(); });
      }
    }

    var stored = getStoredBand();
    if (stored && BAND_LABELS[stored]) {
      showBand(stored, { keepChooserOpen: false });
      if (chooser) chooser.hidden = true;
    } else if (sections.length) {
      // First-time visitor: keep every band section visible (already the
      // no-JS state) but surface the chooser prominently.
      if (chooser) chooser.hidden = false;
    }

    document.addEventListener("slp:band-changed", function (e) {
      showBand(e.detail.band);
    });
  }

  /* ---------- Inline "give feedback on this lesson" buttons ---------- */

  function initInlineFeedback() {
    var buttons = document.querySelectorAll("[data-open-feedback]");
    if (!buttons.length) return;
    var mainBtn = document.querySelector(".feedback-btn");
    if (!mainBtn) return;
    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener("click", function () { mainBtn.click(); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    [
      initBandSync,
      initAgeSwitcher,
      initLessonsPage,
      initInlineFeedback
    ].forEach(function (init) {
      try { init(); } catch (err) {
        if (window.console && console.error) console.error(err);
      }
    });
  });
})();
