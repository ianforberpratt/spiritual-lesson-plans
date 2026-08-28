// Spiritual Lesson Plans — /for-mentors interactive pieces
//
// Five small, independent features: a checklist, a tap-to-open glossary, a
// worked-example toggle, an escalation-ladder accordion, and a private
// mentor check-in. Progressive enhancement throughout — every underlying
// list is real, readable content without JS; this only adds the
// interaction on top. Nothing here is sent anywhere; the checklist state
// is the only thing persisted, and only in the visitor's own browser.

(function () {
  "use strict";

  var CHECKLIST_KEY = "slp_mentor_checklist";

  document.addEventListener("DOMContentLoaded", function () {
    initChecklist();
    initGlossary();
    initWorkedExample();
    initEscalationLadder();
    initMentorCheckin();
  });

  /* ---------- 1. "Before you start" checklist ---------- */

  function initChecklist() {
    var root = document.querySelector("[data-checklist]");
    if (!root) return;
    var boxes = root.querySelectorAll("[data-checklist-box]");
    var fill = root.querySelector("[data-checklist-fill]");
    var countText = root.querySelector("[data-checklist-count]");
    var done = root.querySelector("[data-checklist-done]");
    if (!boxes.length) return;

    function getChecked() {
      try {
        return JSON.parse(localStorage.getItem(CHECKLIST_KEY) || "[]");
      } catch (err) { return []; }
    }
    function setChecked(arr) {
      try { localStorage.setItem(CHECKLIST_KEY, JSON.stringify(arr)); } catch (err) { /* private mode */ }
    }

    function render() {
      var checked = getChecked();
      var total = boxes.length;
      var count = 0;
      boxes.forEach(function (box) {
        var isOn = checked.indexOf(box.value) !== -1;
        box.checked = isOn;
        if (isOn) count++;
      });
      if (fill) fill.style.width = Math.round((count / total) * 100) + "%";
      if (countText) countText.textContent = count + " of " + total;
      if (done) {
        var wasHidden = done.hidden;
        done.hidden = count < total;
        if (!done.hidden && wasHidden) {
          done.classList.remove("checklist-done-pop");
          void done.offsetWidth; // restart the animation on repeat completions
          done.classList.add("checklist-done-pop");
        }
      }
    }

    boxes.forEach(function (box) {
      box.addEventListener("change", function () {
        var checked = getChecked();
        var i = checked.indexOf(box.value);
        if (box.checked && i === -1) checked.push(box.value);
        if (!box.checked && i !== -1) checked.splice(i, 1);
        setChecked(checked);
        render();
      });
    });

    render();
  }

  /* ---------- 2. Tappable glossary ---------- */

  function initGlossary() {
    var root = document.querySelector("[data-glossary]");
    if (!root) return;
    root.querySelectorAll("[data-glossary-toggle]").forEach(function (btn) {
      var def = btn.nextElementSibling;
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", open ? "false" : "true");
        def.hidden = open;
      });
    });
  }

  /* ---------- 3. Worked-example toggle ---------- */

  function initWorkedExample() {
    var btn = document.querySelector("[data-example-toggle]");
    var panel = document.querySelector("[data-example]");
    if (!btn || !panel) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      btn.setAttribute("aria-expanded", open ? "false" : "true");
      panel.hidden = open;
      btn.textContent = open ? "See it in a real lesson ↓" : "Hide the example ↑";
      if (!open) panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }

  /* ---------- 4. Escalation ladder (single-open accordion) ---------- */

  function initEscalationLadder() {
    var root = document.querySelector("[data-escalation]");
    if (!root) return;
    var steps = root.querySelectorAll("[data-escalation-toggle]");
    steps.forEach(function (btn) {
      var body = btn.nextElementSibling;
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") === "true";
        steps.forEach(function (other) {
          other.setAttribute("aria-expanded", "false");
          other.nextElementSibling.hidden = true;
          other.parentElement.classList.remove("is-open");
        });
        if (!open) {
          btn.setAttribute("aria-expanded", "true");
          body.hidden = false;
          btn.parentElement.classList.add("is-open");
        }
      });
    });
  }

  /* ---------- 5. Mentor check-in ---------- */

  var CHECKIN_RESPONSES = {
    "wrung-out": "That's real, and it's common after a lesson that mattered. Tell someone today — not the details, just “today was heavy.” Carrying it alone is the part that actually wears people down.",
    "heavy": "It's okay for it to still be sitting with you. If it's still there in a few days, that's worth talking through with a professional yourself — not because you did anything wrong, but because that's what the weight of real trust deserves.",
    "okay": "Good — and it's fine if that changes later today. Whatever settles you, do it on purpose anyway, not just whenever you happen to get to it.",
    "proud": "Good. Let that be true without qualifying it — you showed up for someone, and it went somewhere real.",
    "replaying": "That's normal, not a sign you handled it wrong. You don't have to have the answer by next session — just showing back up and saying “I'm still here” is enough."
  };

  function initMentorCheckin() {
    var root = document.querySelector("[data-checkin]");
    if (!root) return;
    var response = root.querySelector("[data-checkin-response]");
    root.querySelectorAll("[data-checkin-chip]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        root.querySelectorAll(".mood-chip").forEach(function (c) { c.classList.remove("is-picked"); });
        btn.classList.add("is-picked");
        var key = btn.getAttribute("data-checkin-chip");
        response.textContent = CHECKIN_RESPONSES[key] || "";
        response.hidden = false;
      });
    });
  }
})();
