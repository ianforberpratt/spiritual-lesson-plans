// Spiritual Lesson Plans — shared behavior
//
// Everything here is progressive enhancement: the site is fully readable and
// navigable with JavaScript disabled. Each feature is initialised in its own
// function so that one unsupported API can never stop the others from running.

(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Mobile navigation ---------- */

  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var links = document.querySelector(".nav-links");
    if (!toggle || !links) return;

    function close() {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }

    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    // Escape closes the panel and returns focus to the control that opened it
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && links.classList.contains("open")) {
        close();
        toggle.focus();
      }
    });

    // Following an in-page link should not leave the panel covering the target
    links.addEventListener("click", function (e) {
      if (e.target.closest("a")) close();
    });
  }

  /* ---------- Nav over the hero (home only) ---------- */

  function initNavScrollState() {
    var nav = document.querySelector(".site-nav");
    if (!nav || !document.body.classList.contains("home")) return;

    var ticking = false;
    function update() {
      nav.classList.toggle("is-scrolled", window.scrollY > 40);
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* ---------- Hero background video ---------- */

  function initHeroVideo() {
    var video = document.querySelector(".hero-media video");
    var toggle = document.querySelector(".hero-video-toggle");
    if (!video) return;

    var loaded = false;
    function load() {
      if (loaded) return;
      loaded = true;
      // Sources carry data-src so nothing downloads until the hero is in view.
      // The browser still honours each source's media/type when picking one.
      Array.prototype.forEach.call(video.querySelectorAll("source[data-src]"), function (s) {
        s.setAttribute("src", s.getAttribute("data-src"));
        s.removeAttribute("data-src");
      });
      video.load();
    }

    function setState(playing) {
      if (!toggle) return;
      toggle.setAttribute("data-state", playing ? "playing" : "paused");
      toggle.setAttribute("aria-label", playing ? "Pause background video" : "Play background video");
    }

    function play() {
      load();
      var p = video.play();
      if (p && typeof p.then === "function") {
        p.then(function () { setState(true); }).catch(function () { setState(false); });
      } else {
        setState(true);
      }
    }

    if (reduceMotion) {
      // Poster frame only. The control still works, so anyone who wants
      // the video can start it deliberately.
      video.pause();
      setState(false);
    } else if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            play();
            io.disconnect();
          }
        });
      }, { rootMargin: "200px" });
      io.observe(video);

      // Same safety net as the reveals: the hero is at the top of the page, so
      // if the observer has not fired shortly after load it is not going to.
      window.setTimeout(function () {
        if (!loaded) { io.disconnect(); play(); }
      }, 2000);
    } else {
      play();
    }

    if (toggle) {
      toggle.addEventListener("click", function () {
        if (video.paused) {
          play();
        } else {
          video.pause();
          setState(false);
        }
      });
    }
  }

  /* ---------- Scroll reveal ---------- */

  function initReveals() {
    var reveals = document.querySelectorAll(".reveal");
    if (!reveals.length) return;

    if (reduceMotion || !("IntersectionObserver" in window)) {
      Array.prototype.forEach.call(reveals, function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -50px 0px" });

    Array.prototype.forEach.call(reveals, function (el) { observer.observe(el); });

    // Safety net: if the observer never fires — an environment that does not
    // paint, an obscure browser bug — the content must still appear. Losing an
    // animation is acceptable; losing the page is not.
    window.setTimeout(function () {
      Array.prototype.forEach.call(reveals, function (el) { el.classList.add("is-visible"); });
    }, 2500);
  }

  /* ---------- Feedback widget ---------- */

  function initFeedback() {
    var btn = document.querySelector(".feedback-btn");
    var overlay = document.querySelector(".feedback-overlay");
    var closeBtn = document.querySelector(".feedback-close");
    var form = document.querySelector(".feedback-form");
    var modal = document.querySelector(".feedback-modal");
    if (!btn || !overlay || !form || !modal) return;

    function focusable() {
      return Array.prototype.slice.call(
        modal.querySelectorAll('a[href], button, select, textarea, input, [tabindex]:not([tabindex="-1"])')
      ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    }

    function open() {
      overlay.classList.add("open");
      var first = form.querySelector("select, textarea");
      if (first) first.focus();
    }
    function close() {
      if (!overlay.classList.contains("open")) return;
      overlay.classList.remove("open");
      btn.focus();
    }

    btn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", close);
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });

    document.addEventListener("keydown", function (e) {
      if (!overlay.classList.contains("open")) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab") return;

      var items = focusable();
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var kind = form.querySelector("[name=kind]").value;
      var message = form.querySelector("[name=message]").value.trim();
      var from = form.querySelector("[name=from]").value.trim();
      if (!message) return;

      var lines = [message, ""];
      if (from) lines.push("From: " + from);
      lines.push("Page: " + window.location.href);

      window.location.href = "mailto:ianforberpratt@gmail.com"
        + "?subject=" + encodeURIComponent("Spiritual Lesson Plans feedback: " + kind)
        + "&body=" + encodeURIComponent(lines.join("\n"));

      close();
      form.reset();
    });
  }

  /* ---------- Google Translate (loaded only on request) ---------- */

  function initTranslate() {
    var trigger = document.querySelector(".translate-trigger");
    var container = document.getElementById("google_translate_element");
    if (!trigger || !container) return;

    trigger.addEventListener("click", function () {
      if (window.__translateLoaded) return;
      window.__translateLoaded = true;
      trigger.style.display = "none";
      container.style.display = "inline-flex";
      window.googleTranslateElementInit = function () {
        new google.translate.TranslateElement({ pageLanguage: "en" }, "google_translate_element");
      };
      var script = document.createElement("script");
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(script);
    });
  }

  /* ---------- Cookie notice ---------- */

  function initCookieNotice() {
    var banner = document.getElementById("cookie-banner");
    var accept = document.getElementById("cookie-accept");
    if (!banner || !accept) return;

    var seen = false;
    try { seen = !!localStorage.getItem("cookieNoticeSeen"); } catch (err) { seen = false; }

    if (!seen) {
      banner.classList.add("show");
      document.body.classList.add("has-cookie-banner");
    }

    accept.addEventListener("click", function () {
      try { localStorage.setItem("cookieNoticeSeen", "1"); } catch (err) { /* private mode */ }
      banner.classList.remove("show");
      document.body.classList.remove("has-cookie-banner");
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    // Each is independent: a failure in one must not block the rest
    [
      initNav,
      initNavScrollState,
      initHeroVideo,
      initReveals,
      initFeedback,
      initTranslate,
      initCookieNotice
    ].forEach(function (init) {
      try { init(); } catch (err) {
        if (window.console && console.error) console.error(err);
      }
    });
  });
})();
