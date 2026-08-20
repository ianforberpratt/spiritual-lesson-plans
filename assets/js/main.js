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

  /* ---------- Hero: easter egg ---------- */

  function initHeroEasterEgg() {
    var egg = document.querySelector(".hero-easter-egg");
    if (!egg) return;
    var busy = false;

    egg.addEventListener("click", function () {
      if (busy) return;
      busy = true;
      egg.classList.add("is-active");

      var showAt = reduceMotion ? 150 : 900;
      var hideAt = reduceMotion ? 1700 : 2500;
      var resetAt = reduceMotion ? 2400 : 3300;

      window.setTimeout(function () { egg.classList.add("show-msg"); }, showAt);
      window.setTimeout(function () { egg.classList.remove("show-msg"); }, hideAt);
      window.setTimeout(function () {
        egg.classList.remove("is-active");
        busy = false;
      }, resetAt);
    });
  }

  /* ---------- Lessons: lantern field ---------- */

  function initLanternField() {
    var field = document.querySelector(".lantern-field");
    if (!field || reduceMotion) return;

    field.addEventListener("mousemove", function (e) {
      var r = field.getBoundingClientRect();
      field.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
      field.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
    });
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

    // Honeypot field: invisible to real visitors, irresistible to bots that
    // fill every field. Injected via JS rather than baked into every page's
    // markup, since this file is the one place shared across the whole site.
    var honeypot = document.createElement("input");
    honeypot.type = "text";
    honeypot.name = "hp";
    honeypot.className = "feedback-hp";
    honeypot.setAttribute("tabindex", "-1");
    honeypot.setAttribute("autocomplete", "off");
    honeypot.setAttribute("aria-hidden", "true");
    form.appendChild(honeypot);

    // Two extra feedback kinds, added here rather than to every page's
    // markup so the option list only has to be maintained in one place.
    var kindSelect = form.querySelector("[name=kind]");
    if (kindSelect) {
      var lastOption = kindSelect.querySelector('option[value="Just saying hi"]');
      [
        { value: "Citation", label: "I have a citation to share" },
        { value: "Lesson idea", label: "I have a lesson idea" }
      ].forEach(function (item) {
        var opt = document.createElement("option");
        opt.value = item.value;
        opt.textContent = item.label;
        if (lastOption) {
          kindSelect.insertBefore(opt, lastOption);
        } else {
          kindSelect.appendChild(opt);
        }
      });
    }

    var status = document.createElement("p");
    status.className = "feedback-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    var submitBtn = form.querySelector('button[type="submit"]');
    form.insertBefore(status, submitBtn);

    function setStatus(text, kind) {
      status.innerHTML = "";
      if (text) {
        status.textContent = text;
        status.className = "feedback-status show" + (kind ? " " + kind : "");
      } else {
        status.className = "feedback-status";
      }
    }

    function focusable() {
      return Array.prototype.slice.call(
        modal.querySelectorAll('a[href], button, select, textarea, input, [tabindex]:not([tabindex="-1"])')
      ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    }

    function open() {
      setStatus("");
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

    function mailtoFallback(kind, message, from) {
      var lines = [message, ""];
      if (from) lines.push("From: " + from);
      lines.push("Page: " + window.location.href);
      return "mailto:ianforberpratt@gmail.com"
        + "?subject=" + encodeURIComponent("Spiritual Lesson Plans feedback: " + kind)
        + "&body=" + encodeURIComponent(lines.join("\n"));
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var kind = form.querySelector("[name=kind]").value;
      var message = form.querySelector("[name=message]").value.trim();
      var from = form.querySelector("[name=from]").value.trim();
      if (!message) return;
      if (honeypot.value) { close(); form.reset(); return; }

      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Sending…"; }
      setStatus("Sending…");

      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: kind, message: message, from: from, hp: honeypot.value, page: window.location.href })
      })
        .then(function (res) {
          return res.json().catch(function () { return {}; }).then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (result) {
          if (result.ok) {
            setStatus("Thanks — got it.", "is-ok");
            form.reset();
            window.setTimeout(close, 1600);
            return;
          }
          if (result.status === 400 && result.data && result.data.error) {
            // A fixable input problem (e.g. malformed email) — let them correct it.
            setStatus(result.data.error, "is-error");
            return;
          }
          throw new Error("send failed");
        })
        .catch(function () {
          status.innerHTML = "";
          status.className = "feedback-status show is-error";
          status.appendChild(document.createTextNode("Couldn't send that. "));
          var link = document.createElement("a");
          link.href = mailtoFallback(kind, message, from);
          link.textContent = "Email us directly instead.";
          status.appendChild(link);
        })
        .then(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Send it"; }
        });
    });
  }

  /* ---------- Language switcher (nav) ----------
     Mirrors the age-switcher menu pattern in age-context.js: a small
     dropdown built once and toggled by any element carrying
     [data-lang-switcher] — there are two per page (the desktop pill,
     and a fallback row inside the mobile hamburger menu). Google's
     translate widget itself only loads on first open, not eagerly, to
     match the cookie notice's "nothing loads until you ask" promise. */

  function initLangSwitcher() {
    var triggers = document.querySelectorAll("[data-lang-switcher]");
    if (!triggers.length) return;

    var anchor = document.querySelector("button.lang-switcher[data-lang-switcher]") || triggers[0];
    if (anchor.parentNode) {
      anchor.parentNode.style.position = anchor.parentNode.style.position || "relative";
    }

    var menu = document.createElement("div");
    menu.className = "lang-switcher-menu";
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-label", "Choose your language");
    menu.innerHTML =
      '<p class="lang-switcher-tagline">This is a global site &mdash; pick your language and dive in. All are welcome.</p>' +
      '<div id="google_translate_element"></div>';
    anchor.insertAdjacentElement("afterend", menu);

    var mobileNavLinks = document.getElementById("primary-nav");

    var loaded = false;
    function loadWidget() {
      if (loaded) return;
      loaded = true;
      window.googleTranslateElementInit = function () {
        new google.translate.TranslateElement({ pageLanguage: "en" }, "google_translate_element");
      };
      var script = document.createElement("script");
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(script);
    }

    function openMenu() {
      menu.classList.add("open");
      Array.prototype.forEach.call(triggers, function (t) { t.setAttribute("aria-expanded", "true"); });
      loadWidget();
    }
    function closeMenu() {
      menu.classList.remove("open");
      Array.prototype.forEach.call(triggers, function (t) { t.setAttribute("aria-expanded", "false"); });
    }

    Array.prototype.forEach.call(triggers, function (trigger) {
      trigger.setAttribute("aria-haspopup", "true");
      trigger.setAttribute("aria-expanded", "false");
      trigger.addEventListener("click", function (e) {
        e.stopPropagation();
        // The mobile trigger lives inside the hamburger dropdown — close
        // that first so the language panel isn't hidden behind it.
        if (mobileNavLinks && mobileNavLinks.classList.contains("open") && trigger !== anchor) {
          mobileNavLinks.classList.remove("open");
          var toggle = document.querySelector(".nav-toggle");
          if (toggle) toggle.setAttribute("aria-expanded", "false");
        }
        if (menu.classList.contains("open")) closeMenu(); else openMenu();
      });
    });
    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target) && Array.prototype.indexOf.call(triggers, e.target) === -1 &&
          !(e.target.closest && e.target.closest("[data-lang-switcher]"))) {
        closeMenu();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) {
        closeMenu();
        anchor.focus();
      }
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
      initHeroEasterEgg,
      initLanternField,
      initReveals,
      initFeedback,
      initLangSwitcher,
      initCookieNotice
    ].forEach(function (init) {
      try { init(); } catch (err) {
        if (window.console && console.error) console.error(err);
      }
    });
  });
})();
