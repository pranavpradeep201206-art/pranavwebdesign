/* PranavWebDesign */
(function () {
  "use strict";

  // Mobile menu
  var menuBtn = document.querySelector(".menu-btn");
  var mobileMenu = document.getElementById("mobile-menu");
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener("click", function () {
      var open = mobileMenu.classList.toggle("open");
      menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
      menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    mobileMenu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        mobileMenu.classList.remove("open");
        menuBtn.setAttribute("aria-expanded", "false");
      });
    });
  }

  // Reveal on scroll
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // Local time (America/Toronto)
  var timeEl = document.getElementById("local-time");
  if (timeEl) {
    var fmt = new Intl.DateTimeFormat("en-CA", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Toronto"
    });
    var update = function () {
      timeEl.textContent = "Local time " + fmt.format(new Date()) + " ET";
    };
    update();
    setInterval(update, 30000);
  }

  // Footer year
  var yearEl = document.getElementById("year");
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  // Infinite auto-scroll carousels (mobile only)
  // Each .services-grid / .steps becomes a seamless drifting loop:
  // cards are cloned once, the track scrolls forward, and scrollLeft
  // wraps by exactly one card-set width so the loop has no visible seam.
  (function () {
    var mq = window.matchMedia("(max-width: 760px)");
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    var SPEED = 0.4; // px per frame, forward drift
    var RESUME_MS = 3000;

    var tracks = []; // { el, clones, wrap, raf, paused, resumeTimer }

    function build(el) {
      var originals = Array.prototype.slice.call(el.children);
      // the row is on screen by now; make sure cards are visible so
      // clones never copy an unrevealed (opacity 0) state
      originals.forEach(function (card) { card.classList.add("in"); });
      var clones = originals.map(function (card) {
        var clone = card.cloneNode(true);
        clone.classList.add("in");
        clone.setAttribute("aria-hidden", "true");
        el.appendChild(clone);
        return clone;
      });
      el.classList.add("is-carousel");
      el.setAttribute("data-carousel", "drift");
      var t = {
        el: el,
        clones: clones,
        wrap: 0,
        raf: 0,
        paused: false,
        resumeTimer: null,
        onResize: null,
        onTouchStart: null,
        onTouchEnd: null,
        onEnter: null,
        onLeave: null
      };
      measure(t);

      // scrollLeft jump target: offset of first clone minus offset of
      // first original = exact visual period of the track.
      function measure(track) {
        var first = track.el.children[0];
        var firstClone = track.clones[0];
        if (first && firstClone) {
          track.wrap = firstClone.offsetLeft - first.offsetLeft;
        }
      }
      t.onResize = function () { measure(t); };
      window.addEventListener("resize", t.onResize);

      t.onTouchStart = function () {
        t.paused = true;
        if (t.resumeTimer) { clearTimeout(t.resumeTimer); t.resumeTimer = null; }
      };
      t.onTouchEnd = function () {
        if (t.resumeTimer) { clearTimeout(t.resumeTimer); }
        t.resumeTimer = setTimeout(function () { t.paused = false; }, RESUME_MS);
      };
      t.onEnter = function () { t.paused = true; };
      t.onLeave = function () { t.paused = false; };

      el.addEventListener("touchstart", t.onTouchStart, { passive: true });
      el.addEventListener("touchend", t.onTouchEnd, { passive: true });
      el.addEventListener("mouseenter", t.onEnter);
      el.addEventListener("mouseleave", t.onLeave);

      function loop() {
        if (!t.paused && t.wrap > 0) {
          // scrollLeft is rounded to integers by browsers, so += tiny
          // deltas would never move. accumulate in a float instead.
          t.pos = (t.pos || 0) + SPEED;
          if (t.pos >= t.wrap) { t.pos -= t.wrap; }
          el.scrollLeft = t.pos;
        } else if (t.paused) {
          t.pos = el.scrollLeft; // stay synced with manual swipes
        }
        t.raf = requestAnimationFrame(loop);
      }
      t.raf = requestAnimationFrame(loop);
      tracks.push(t);
    }

    function teardown() {
      tracks.forEach(function (t) {
        cancelAnimationFrame(t.raf);
        window.removeEventListener("resize", t.onResize);
        t.el.removeEventListener("touchstart", t.onTouchStart);
        t.el.removeEventListener("touchend", t.onTouchEnd);
        t.el.removeEventListener("mouseenter", t.onEnter);
        t.el.removeEventListener("mouseleave", t.onLeave);
        if (t.resumeTimer) { clearTimeout(t.resumeTimer); }
        t.clones.forEach(function (clone) { clone.remove(); });
        t.el.classList.remove("is-carousel");
        t.el.removeAttribute("data-carousel");
        t.el.scrollLeft = 0;
      });
      tracks = [];
    }

    function evaluate() {
      var wantMobile = mq.matches && !reduced.matches;
      if (wantMobile && tracks.length === 0) {
        document.querySelectorAll(".services-grid, .steps").forEach(build);
      } else if (!wantMobile && tracks.length > 0) {
        teardown();
      }
    }

    if ("IntersectionObserver" in window) {
      // build lazily: only carouselize rows once they near the viewport
      var lazy = new IntersectionObserver(function (entries, obs) {
        if (mq.matches && !reduced.matches) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              build(entry.target);
              obs.unobserve(entry.target);
            }
          });
        }
      }, { rootMargin: "0px 0px -10% 0px" });

      evaluate = function () {
        var rows = document.querySelectorAll(".services-grid, .steps");
        var wantMobile = mq.matches && !reduced.matches;
        if (wantMobile) {
          rows.forEach(function (row) {
            if (!row.classList.contains("is-carousel")) { lazy.observe(row); }
          });
        } else {
          teardown();
        }
      };
    }

    evaluate();
    if (mq.addEventListener) {
      mq.addEventListener("change", evaluate);
      reduced.addEventListener("change", evaluate);
    } else {
      mq.addListener(evaluate);
      reduced.addListener(evaluate);
    }
  })();
})();
