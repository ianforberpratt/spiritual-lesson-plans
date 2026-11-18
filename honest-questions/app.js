/* Honest Questions CS — renders the installments from series.json and posts/N.html.
 *
 * A post is live when BOTH are true:
 *   1. its publishAt time has passed, and
 *   2. posts/<id>.html exists (that file is the post body).
 * So "flipping" a post is: write posts/N.html, set its title in series.json. It appears
 * at its scheduled time with no rebuild. Until then it shows as Coming soon.
 *
 * Testing helpers (query string):
 *   ?asof=2026-11-25T19:00:00-06:00   pretend it is that moment
 *   ?asof=all                         pretend every scheduled time has passed
 */
(function () {
  "use strict";

  var params = new URLSearchParams(location.search);
  var asof = params.get("asof");
  var now = new Date();
  if (asof === "all") now = new Date("2100-01-01T00:00:00Z");
  else if (asof && !isNaN(new Date(asof))) now = new Date(asof);

  var TZ = "America/Chicago";
  var BASE = window.HQ_BASE || "";

  function fmtDate(d) {
    return new Intl.DateTimeFormat("en-US", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" }).format(d);
  }
  function fmtTime(d) {
    var t = new Intl.DateTimeFormat("en-US", { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d);
    return t.replace(":00", "").replace(/\s/g, " ") + " Central";
  }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var cfg = null;
  var mount = document.getElementById("installments");

  fetch(BASE + "series.json", { cache: "no-cache" })
    .then(function (r) { if (!r.ok) throw new Error("series.json " + r.status); return r.json(); })
    .then(function (c) { cfg = c; return build(c); })
    .then(function () { setupFeedback(); setupAnalytics(); })
    .catch(function (e) { console.error("Honest Questions:", e); });

  function build(c) {
    var items = c.installments.filter(function (i) { return !i.inline; });
    return Promise.all(items.map(function (item) { return loadBody(item); })).then(function (bodies) {
      var liveCount = 1; // the preview is inline and always shown
      items.forEach(function (item, idx) {
        var when = new Date(item.publishAt);
        var body = bodies[idx];
        var isLive = now >= when && body != null;
        if (isLive) liveCount++;
        if (isLive) {
          var slot = document.getElementById("post-" + item.id);
          var post = livePost(item, when, body);
          if (slot) slot.replaceWith(post); else mount.appendChild(post);
        }
      });
      markProgress(c, liveCount, items, bodies);
    });
  }

  function loadBody(item) {
    return fetch(BASE + "posts/" + item.id + ".html", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) return null;
        var type = r.headers.get("content-type") || "";
        // Some hosts answer a missing file with the home page; ignore that.
        if (type.indexOf("html") === -1) return null;
        return r.text();
      })
      .then(function (t) {
        if (t == null || /<title>Honest Questions CS<\/title>/.test(t) || !t.trim()) return null;
        return t;
      })
      .catch(function () { return null; });
  }

  function livePost(item, when, html) {
    var a = el("article", "post");
    a.id = "post-" + item.id;
    a.setAttribute("data-post", item.id);
    a.appendChild(el("p", "post-kicker", item.label + " · " + fmtDate(when) + " · " + fmtTime(when)));
    a.appendChild(el("h2", "post-title", item.title || item.label));
    var b = el("div", "post-body");
    b.innerHTML = html; // our own file, same origin
    a.appendChild(b);
    return a;
  }

  function markProgress(c, liveCount, items, bodies) {
    document.getElementById("live-count").textContent = liveCount;
    var segs = document.querySelectorAll("#progress-bar .seg");
    items.forEach(function (item, idx) {
      var live = now >= new Date(item.publishAt) && bodies[idx] != null;
      if (live && segs[idx + 1]) segs[idx + 1].classList.add("is-live");
    });
  }

  function setupFeedback() {
    var box = document.getElementById("respond-actions");
    if (!cfg || !cfg.feedbackEmail || !box) return;
    var subject = encodeURIComponent("Honest Questions CS: my thoughts");
    var a = el("a", "btn", "Write to me");
    a.href = "mailto:" + cfg.feedbackEmail + "?subject=" + subject;
    a.addEventListener("click", function () { track("feedback-click"); });
    box.textContent = "";
    box.appendChild(a);
  }

  /* Optional, privacy-friendly view counts (GoatCounter: no cookies, no personal data).
   * Set analytics.goatcounter in series.json to your site code. Empty = no tracking at all.
   * Counts the page, plus a per-post "read" when about 60% of a post has been on screen. */
  function track(name) {
    try {
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: "honest-questions/" + name, title: name, event: true });
      }
    } catch (e) {}
  }
  function setupAnalytics() {
    var code = cfg && cfg.analytics && cfg.analytics.goatcounter;
    if (!code || params.get("asof")) return; // never count test views
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://gc.zgo.at/count.js";
    s.setAttribute("data-goatcounter", "https://" + code + ".goatcounter.com/count");
    document.head.appendChild(s);
    if (!("IntersectionObserver" in window)) return;
    var seen = {};
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var id = en.target.getAttribute("data-post");
        if (en.isIntersecting && !seen[id]) { seen[id] = 1; track("read-" + id); }
      });
    }, { threshold: 0.6 });
    document.querySelectorAll("[data-post]").forEach(function (n) {
      if (n.classList.contains("post")) io.observe(n);
    });
  }
})();
