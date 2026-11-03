/* ============================================================================
   ELISE PANSIER — kit.js  (companion to kit.css, vanilla, no build)
   Does four small things, all progressive:
   1. injects the SVG filter defs (#kit-grain, #kit-ink, #kit-bleed, #kit-torn, #kit-boil-*)
   2. SVG line-draw: measures path lengths (--len) so stroke-dashoffset is exact
   3. .reveal / .draw fallback: IntersectionObserver adds .is-in where
      animation-timeline is unsupported (Safari < 26, Firefox w/o flag)
   4. optional live boil: reseeds feTurbulence by JS when you want more than
      3 frames (Camillo Visini's method); off by default, on with data-boil-live
   5. view transitions: wraps same-document swaps in document.startViewTransition
   Respects prefers-reduced-motion everywhere.

   Technique credits: Bebber (squiggly filters), Visini (seed shuffle),
   CSS-Tricks (line draw), Bramus / Chrome team (scroll timelines), MDN (VT).
   ========================================================================== */
(function () {
  "use strict";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  /* 1. defs ------------------------------------------------------------- */
  const DEFS = `
<svg class="kit-defs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute;width:0;height:0;overflow:hidden">
  <defs>
    <filter id="kit-grain" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
    </filter>
    <filter id="kit-ink" x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="4" seed="3" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="4" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="kit-bleed" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="3" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="3" result="d"/>
      <feMorphology in="d" operator="dilate" radius=".6" result="m"/>
      <feGaussianBlur in="m" stdDeviation=".35"/>
    </filter>
    <filter id="kit-torn" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency=".02 .06" numOctaves="4" seed="11" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="18" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
    <filter id="kit-boil-0"><feTurbulence type="turbulence" baseFrequency=".02" numOctaves="3" seed="0" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
    <filter id="kit-boil-1"><feTurbulence type="turbulence" baseFrequency=".02" numOctaves="3" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/></filter>
    <filter id="kit-boil-2"><feTurbulence type="turbulence" baseFrequency=".02" numOctaves="3" seed="2" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter>
  </defs>
</svg>`;
  function injectDefs() {
    if (document.querySelector(".kit-defs")) return;
    document.body.insertAdjacentHTML("afterbegin", DEFS);
  }

  /* 2. line draw: exact lengths ---------------------------------------- */
  function measurePaths(root = document) {
    root.querySelectorAll(".draw").forEach((el) => {
      const targets = el.matches("path,line,polyline,polygon,circle,ellipse,rect") ? [el] : el.querySelectorAll("path,line,polyline,polygon,circle,ellipse,rect");
      targets.forEach((p, i) => {
        if (typeof p.getTotalLength !== "function") return;
        const len = Math.ceil(p.getTotalLength());
        p.style.setProperty("--len", len);
        // stagger strokes so a drawing builds in order, like a hand would
        p.style.setProperty("--draw-delay", (i * 0.12).toFixed(2) + "s");
        p.classList.add("draw");
      });
    });
  }

  /* 3. fallback for scroll-driven reveals ------------------------------ */
  const nativeTimeline = CSS.supports("animation-timeline: view()");
  function observeReveals(root = document) {
    const els = root.querySelectorAll(".reveal, .draw, .marker--draw, [data-reveal]");
    if (!els.length) return;
    if (reduced.matches) { els.forEach((e) => e.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.15 });
    els.forEach((e) => {
      if (nativeTimeline && e.classList.contains("reveal") && !e.classList.contains("draw")) return; // CSS handles it
      io.observe(e);
    });
  }

  /* 4. live boil (opt-in) ------------------------------------------------
     <h1 class="boil" data-boil-live data-boil-fps="8">...</h1>
     Reseeds the 3 shared filters so every .boil element gets fresh frames.
     ponytail: one global ticker for all live boils; per-element seeds if ever needed */
  function liveBoil() {
    const els = document.querySelectorAll("[data-boil-live]");
    if (!els.length || reduced.matches) return;
    const fps = Number(els[0].dataset.boilFps) || 8;
    const turbs = [0, 1, 2].map((i) => document.querySelector(`#kit-boil-${i} feTurbulence`));
    let seed = 0, last = 0;
    function tick(t) {
      if (t - last > 1000 / fps) {
        last = t; seed = (seed + 1) % 1000;
        turbs.forEach((n, i) => n && n.setAttribute("seed", seed * 3 + i));
      }
      if (!document.hidden) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) requestAnimationFrame(tick); });
  }

  /* 5. view transitions helper ----------------------------------------- */
  // kit.swap(() => { ...mutate DOM... })  -> animated if supported, instant otherwise
  function swap(update) {
    if (!document.startViewTransition || reduced.matches) { update(); return Promise.resolve(); }
    return document.startViewTransition(update).finished;
  }

  /* boot ---------------------------------------------------------------- */
  function init(root) {
    injectDefs();
    measurePaths(root);
    observeReveals(root);
    liveBoil();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", () => init(document));
  else init(document);

  window.kit = { init, measurePaths, observeReveals, swap, nativeTimeline };
})();
