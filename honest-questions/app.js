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
    .then(function () { setupFeedback(); setupInvite(); enhancePosts(); setupReveal(); setupProgressBar(); })
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
      setupCountdown(items, bodies);
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
    var a = el("article", "post reveal");
    a.id = "post-" + item.id;
    a.setAttribute("data-post", item.id);
    a.appendChild(el("p", "post-kicker", item.label + " · " + fmtDate(when) + " · " + fmtTime(when)));
    a.appendChild(el("h2", "post-title", item.title || item.label));
    var b = el("div", "post-body");
    b.innerHTML = html; // our own file, same origin
    b.querySelectorAll("a[data-hq]").forEach(function (l) { l.href = BASE + l.getAttribute("data-hq"); });
    a.appendChild(b);
    return a;
  }

  function markProgress(c, liveCount, items, bodies) {
    document.getElementById("live-count").textContent = liveCount;
    var segs = document.querySelectorAll("#progress-bar .seg");
    items.forEach(function (item, idx) {
      var live = now >= new Date(item.publishAt) && bodies[idx] != null;
      if (live && segs[idx + 1]) segs[idx + 1].classList.add("is-live");
      var arc = document.querySelector(".arc-" + item.id);
      if (live && arc) arc.classList.add("on");
    });
  }

  /* "Next post in 1 day, 20 hours": ticks once a minute. Honors ?asof for testing. */
  function setupCountdown(items, bodies) {
    var out = document.getElementById("next-post");
    if (!out) return;
    var start = Date.now(), base = now.getTime();
    var next = null;
    items.forEach(function (item, i) {
      var live = now >= new Date(item.publishAt) && bodies[i] != null;
      if (!live && !next) next = item;
    });
    if (!next) { out.textContent = "All four posts are live. Thank you for reading."; return; }
    var when = new Date(next.publishAt);
    var name = next.title || next.label;
    function plural(n, w) { return n + " " + w + (n === 1 ? "" : "s"); }
    function tick() {
      var ms = when.getTime() - (base + Date.now() - start);
      var txt;
      if (ms <= 0) txt = "The next post is coming shortly: " + name;
      else {
        var m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
        var left = d >= 1 ? plural(d, "day") + (h ? ", " + plural(h, "hour") : "") : h >= 1 ? plural(h, "hour") + (m % 60 ? ", " + plural(m % 60, "minute") : "") : plural(Math.max(m, 1), "minute");
        txt = "Next post in " + left + ": " + name + " (" + fmtDate(when) + ", " + fmtTime(when) + ")";
      }
      out.textContent = txt;
    }
    tick();
    setInterval(tick, 60000);
  }


  /* ---------- Per-post tools: calendar, share, listen, read time, jump links ---------- */
  function postUrl(id) { return location.origin + BASE + "p/" + id; }
  function toast(box, msg) {
    var s = box.querySelector(".tool-status");
    if (s) { s.textContent = msg; clearTimeout(s._t); s._t = setTimeout(function () { s.textContent = ""; }, 3500); }
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function icsDate(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate()) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + "00Z";
  }
  function downloadIcs(item, when) {
    var end = new Date(when.getTime() + 30 * 60000);
    var title = "Honest Questions CS: " + (item.title || item.label);
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Honest Questions CS//EN", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      "UID:hqcs-" + item.id + "@honestquestionscs", "DTSTAMP:" + icsDate(new Date()), "DTSTART:" + icsDate(when), "DTEND:" + icsDate(end),
      "SUMMARY:" + title.replace(/[,;]/g, " "), "DESCRIPTION:A new post is live at 6 PM Central. Read it here: " + postUrl(item.id),
      "URL:" + postUrl(item.id), "BEGIN:VALARM", "TRIGGER:-PT10M", "ACTION:DISPLAY", "DESCRIPTION:New post in 10 minutes", "END:VALARM", "END:VEVENT", "END:VCALENDAR"];
    var blob = new Blob([lines.join("\r\n")], { type: "text/calendar" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "honest-questions-" + item.id + ".ics";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function toolButton(label, onClick, cls) {
    var b = el("button", "tool" + (cls ? " " + cls : ""), label);
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }
  function sharePost(id, title, box) {
    var url = postUrl(id);
    if (navigator.share) {
      navigator.share({ title: title, url: url }).catch(function () {});
      return;
    }
    var done = function () { toast(box, "Link copied."); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { toast(box, url); });
    else toast(box, url);
  }
  function attachAudio(node, id, tools, listenBtn) {
    fetch(BASE + "posts/" + id + ".mp3", { method: "HEAD", cache: "no-cache" }).then(function (r) {
      var type = r.headers.get("content-type") || "";
      if (!r.ok || type.indexOf("audio") === -1) return;
      var wrap = el("div", "audio-player");
      wrap.appendChild(el("p", "audio-label", "Listen to this post, read aloud"));
      var a = document.createElement("audio");
      a.controls = true; a.preload = "none"; a.src = BASE + "posts/" + id + ".mp3";
      a.setAttribute("aria-label", "Audio reading of this post");
      wrap.appendChild(a);
      wrap.appendChild(el("p", "audio-note", node.querySelector(".stand") ? "The full text, including \u201cWhere I stand,\u201d is below." : "The full text is below."));
      tools.parentNode.insertBefore(wrap, tools.nextSibling);
      if (listenBtn && listenBtn.parentNode) {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        listenBtn.parentNode.removeChild(listenBtn);
      }
    }).catch(function () {});
  }

  function enhancePosts() {
    var items = {};
    ((cfg && cfg.installments) || []).forEach(function (i) { items[i.id] = i; });
    document.querySelectorAll(".post, .slot").forEach(function (node) {
      var id = node.getAttribute("data-post"), item = items[id];
      if (!id || !item) return;
      var isPost = node.classList.contains("post");
      var tools = el("div", "post-tools");
      var status = el("span", "tool-status"); status.setAttribute("role", "status");
      var title = item.title || item.label;
      if (isPost) {
        var lb = null; // browser read-aloud removed; a recorded reading (posts/<id>.mp3) shows its own player
        // read time + jump links
        var words = (node.querySelector(".post-body") || { textContent: "" }).textContent.trim().split(/\s+/).length;
        var kicker = node.querySelector(".post-kicker");
        if (kicker && words > 50) kicker.textContent += " · " + Math.max(1, Math.round(words / 200)) + " min read";
        var claims = node.querySelector(".test-this");
        if (claims) { claims.id = "claims-" + id; var j = el("a", "tool tool-link", "Jump to the claims ↓"); j.href = "#claims-" + id; tools.appendChild(j); }
        tools.appendChild(toolButton("Share", function () { sharePost(id, title, tools); }));
        tools.appendChild(status);
        var h2 = node.querySelector(".post-title");
        if (h2 && h2.nextSibling) h2.parentNode.insertBefore(tools, h2.nextSibling);
        attachAudio(node, id, tools, lb);
      } else {
        var when = new Date(item.publishAt);
        tools.appendChild(toolButton("Add to my calendar", function () { downloadIcs(item, when); toast(tools, "Calendar file downloaded."); }));
        tools.appendChild(toolButton("Share", function () { sharePost(id, title, tools); }));
        tools.appendChild(status);
        node.appendChild(tools);
      }
    });
  }

  function setupProgressBar() {
    var bar = document.getElementById("read-progress");
    if (!bar) return;
    var ticking = false;
    function update() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ")";
      ticking = false;
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

  /* Fade sections in as they scroll into view. Content is fully visible without JS. */
  function setupReveal() {
    var nodes = document.querySelectorAll(".reveal, .door-para");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach(function (n) { n.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: "0px 0px -4% 0px" });
    nodes.forEach(function (n) { io.observe(n); });
    // Safety net: never leave anything hidden.
    setTimeout(function () { nodes.forEach(function (n) { n.classList.add("in"); }); }, 4000);
  }

  /* Optional invite to the wider site. Set siteInvite in series.json; remove it to hide. */
  function setupInvite() {
    var box = document.getElementById("invite"), c = cfg && cfg.siteInvite;
    if (!box || !c || !c.url) return;
    box.appendChild(el("h2", null, c.heading || "Curious about the rest?"));
    if (c.text) box.appendChild(el("p", null, c.text));
    var a = el("a", "btn");
    a.href = c.url; a.target = "_blank"; a.rel = "noopener";
    a.appendChild(document.createTextNode((c.label || "Explore") + " "));
    a.appendChild(el("span", "arrow", "\u2192"));
    box.appendChild(a);
    box.hidden = false;
  }

  /* Anonymous feedback box. Posts JSON to cfg.feedbackEndpoint; the destination address lives on the
   * server, never on this page. Email from the reader is optional. Nothing is stored here. */
  function setupFeedback() {
    var box = document.getElementById("respond-actions");
    if (!cfg || !cfg.feedbackEndpoint || !box) return;
    var form = el("form", "fb");
    form.setAttribute("novalidate", "");
    var l1 = el("label", null, "Your thoughts");
    l1.setAttribute("for", "fb-message");
    var ta = el("textarea"); ta.id = "fb-message"; ta.name = "message"; ta.rows = 6; ta.maxLength = 5000; ta.required = true;
    var l2 = el("label", null, "Your email (optional, only if you\u2019d like a reply)");
    l2.setAttribute("for", "fb-from");
    var em = el("input"); em.id = "fb-from"; em.name = "from"; em.type = "email"; em.autocomplete = "email";
    var hp = el("input", "fb-hp"); hp.name = "hp"; hp.tabIndex = -1; hp.autocomplete = "off"; hp.setAttribute("aria-hidden", "true");
    var btn = el("button", "btn", "Send"); btn.type = "submit";
    var status = el("p", "fb-status"); status.setAttribute("role", "status");
    form.appendChild(l1); form.appendChild(ta); form.appendChild(l2); form.appendChild(em);
    form.appendChild(hp); form.appendChild(btn); form.appendChild(status);
    form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      status.textContent = "";
      if (!ta.value.trim()) { status.textContent = "Please write something first."; ta.focus(); return; }
      btn.disabled = true; btn.textContent = "Sending\u2026";
      fetch(cfg.feedbackEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: ta.value, from: em.value, hp: hp.value, kind: "Idea", page: "Honest Questions CS (series page)" })
      }).then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d.error || "failed"); });
      }).then(function () {
        form.innerHTML = "";
        var ok = el("p", "fb-thanks", "Thank you. Every message is read.");
        ok.setAttribute("role", "status");
        form.appendChild(ok);
      }).catch(function (e) {
        btn.disabled = false; btn.textContent = "Send";
        status.textContent = /email address/.test(e.message) ? "That email address doesn\u2019t look right." : "That didn\u2019t go through. Please try again in a moment.";
      });
    });
    box.textContent = "";
    box.appendChild(form);
  }
})();
