// Spiritual Lesson Plans — /lessons "by age" / "by what's going on" lens switcher
//
// Progressive enhancement only. Without this script, both panels are
// statically visible and stacked (see the html.js gate in style.css) — every
// lesson is reachable both ways regardless of scripting. This just adds the
// tabbed, one-panel-at-a-time experience once JS is confirmed running.

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var tabs = document.querySelectorAll("[data-lens-tab]");
    if (!tabs.length) return;

    var panels = {
      age: document.getElementById("lens-panel-age"),
      category: document.getElementById("lens-panel-category")
    };
    if (!panels.age || !panels.category) return;

    function revealNow(panel) {
      var reveals = panel.querySelectorAll(".reveal:not(.is-visible)");
      Array.prototype.forEach.call(reveals, function (el) { el.classList.add("is-visible"); });
    }

    function activate(lens) {
      Array.prototype.forEach.call(tabs, function (tab) {
        var isActive = tab.getAttribute("data-lens-tab") === lens;
        tab.setAttribute("aria-selected", isActive ? "true" : "false");
        tab.tabIndex = isActive ? 0 : -1;
      });
      Object.keys(panels).forEach(function (key) {
        panels[key].hidden = key !== lens;
      });
      revealNow(panels[lens]);
    }

    Array.prototype.forEach.call(tabs, function (tab) {
      tab.addEventListener("click", function () {
        activate(tab.getAttribute("data-lens-tab"));
      });
      tab.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
        e.preventDefault();
        var list = Array.prototype.slice.call(tabs);
        var i = list.indexOf(tab);
        var next = e.key === "ArrowRight" ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
        list[next].focus();
        activate(list[next].getAttribute("data-lens-tab"));
      });
    });

    // Default to "by age" once JS is confirmed running — matches the
    // existing age-chooser experience with nothing new to learn.
    activate("age");
  });
})();
