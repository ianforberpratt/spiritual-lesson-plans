// Spiritual Lesson Plans — shared behavior

document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var heroVideo = document.querySelector(".hero-media video");
  var videoToggle = document.querySelector(".hero-video-toggle");
  if (heroVideo) {
    if (reduceMotion) {
      heroVideo.removeAttribute("autoplay");
      heroVideo.pause();
      if (videoToggle) {
        videoToggle.setAttribute("data-state", "paused");
        videoToggle.setAttribute("aria-label", "Play background video");
      }
    } else {
      var loadHeroVideo = function () {
        heroVideo.querySelectorAll("source[data-src]").forEach(function (s) {
          s.src = s.getAttribute("data-src");
        });
        heroVideo.load();
        heroVideo.play().catch(function () {
          if (videoToggle) {
            videoToggle.setAttribute("data-state", "paused");
            videoToggle.setAttribute("aria-label", "Play background video");
          }
        });
      };
      if ("IntersectionObserver" in window) {
        var heroIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) { loadHeroVideo(); heroIO.disconnect(); }
          });
        }, { rootMargin: "200px" });
        heroIO.observe(heroVideo);
      } else {
        loadHeroVideo();
      }
    }
    if (videoToggle) {
      videoToggle.addEventListener("click", function () {
        if (heroVideo.paused) {
          heroVideo.play();
          videoToggle.setAttribute("data-state", "playing");
          videoToggle.setAttribute("aria-label", "Pause background video");
        } else {
          heroVideo.pause();
          videoToggle.setAttribute("data-state", "paused");
          videoToggle.setAttribute("aria-label", "Play background video");
        }
      });
    }
  }

  var reveals = document.querySelectorAll(".reveal");

  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  reveals.forEach(function (el) { observer.observe(el); });

  var fbBtn = document.querySelector(".feedback-btn");
  var fbOverlay = document.querySelector(".feedback-overlay");
  var fbClose = document.querySelector(".feedback-close");
  var fbForm = document.querySelector(".feedback-form");
  var fbModal = document.querySelector(".feedback-modal");

  if (fbBtn && fbOverlay && fbForm && fbModal) {
    var getFocusable = function () {
      return Array.prototype.slice.call(
        fbModal.querySelectorAll('a[href], button, select, textarea, input, [tabindex]:not([tabindex="-1"])')
      ).filter(function (el) { return !el.disabled && el.offsetParent !== null; });
    };

    var openFeedback = function () {
      fbOverlay.classList.add("open");
      var firstField = fbForm.querySelector("select, textarea");
      if (firstField) firstField.focus();
    };
    var closeFeedback = function () {
      if (!fbOverlay.classList.contains("open")) return;
      fbOverlay.classList.remove("open");
      fbBtn.focus();
    };

    fbBtn.addEventListener("click", openFeedback);
    if (fbClose) fbClose.addEventListener("click", closeFeedback);
    fbOverlay.addEventListener("click", function (e) {
      if (e.target === fbOverlay) closeFeedback();
    });
    document.addEventListener("keydown", function (e) {
      if (!fbOverlay.classList.contains("open")) return;
      if (e.key === "Escape") {
        closeFeedback();
        return;
      }
      if (e.key === "Tab") {
        var focusable = getFocusable();
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });

    fbForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var kind = fbForm.querySelector("[name=kind]").value;
      var message = fbForm.querySelector("[name=message]").value.trim();
      var from = fbForm.querySelector("[name=from]").value.trim();
      if (!message) return;

      var subject = "Spiritual Lesson Plans feedback: " + kind;
      var bodyLines = [message, ""];
      if (from) bodyLines.push("From: " + from);
      bodyLines.push("Page: " + window.location.href);
      var body = bodyLines.join("\n");

      var mailto = "mailto:ianforberpratt@gmail.com"
        + "?subject=" + encodeURIComponent(subject)
        + "&body=" + encodeURIComponent(body);
      window.location.href = mailto;
      closeFeedback();
      fbForm.reset();
    });
  }
});
