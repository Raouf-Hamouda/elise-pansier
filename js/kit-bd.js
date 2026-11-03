/* ============================================================
   BD / COMICS KIT — kit.js (vanilla, no build step)
   Rewritten standalone from patterns observed on:
   grandpapier.org (gp-art.js: scroll progress, nav swap, "tout" grid, jquery.appear),
   webtoons.com viewer (data-url lazy image stack, prev/next episode),
   lassociation.fr (Swiper + PhotoSwipe planche gallery, keyboard),
   misma.fr (Swiper keyboard/rewind/autoHeight), lity/fancybox lightboxes,
   lesrequinsmarteaux.com (omega-requins.behaviors.js $.fn.randomBg / randomPosition),
   turbointeractive.fr (Turbomedia: one case per click — concept only, player is a legacy iframe).
   Usage: BDKit.reader(el), BDKit.zoom(), BDKit.reveal(), BDKit.weirdos(el, urls)
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 1. lazy image loading (webtoons data-url → src, grandpapier image_responsive lazy) ---------- */
  function lazy(root, margin) {
    var imgs = root.querySelectorAll('img[data-src]');
    if (!('IntersectionObserver' in global)) { imgs.forEach(swap); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { swap(e.target); io.unobserve(e.target); } });
    }, { rootMargin: margin || '1000px 0px' });            // webtoons expandSize: 1000
    imgs.forEach(function (i) { io.observe(i); });
    function swap(img) {
      img.addEventListener('load', function () { img.classList.add('is-loaded'); img.closest('.bd-planche') && img.closest('.bd-planche').classList.add('is-loaded'); }, { once: true });
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      img.src = img.dataset.src; img.removeAttribute('data-src');
    }
  }

  /* ---------- 2. planche reader (scroll | pages | grid) ---------- */
  function reader(el, opts) {
    opts = opts || {};
    var planches = Array.prototype.slice.call(el.querySelectorAll('.bd-planche'));
    var total = planches.length, current = 0;
    var bar = el.querySelector('.bd-reader__bar');
    var count = el.querySelector('.bd-reader__count');
    var prog = el.querySelector('.bd-reader__progress > i');
    var track = el.querySelector('.bd-planches');
    var dots = el.querySelector('.bd-reader__dots');
    var key = 'bdreader:' + (el.id || location.pathname);         // resume position (webtoons remembers episode, we remember page)

    lazy(el);
    if (dots) { planches.forEach(function (_, i) { var d = document.createElement('i'); d.addEventListener('click', function () { go(i); }); dots.appendChild(d); }); }

    // nav swap after 350px like grandpapier .art-nav / .main-nav
    var swapIO = new IntersectionObserver(function (e) { el.classList.toggle('is-reading', !e[0].isIntersecting); }, { rootMargin: '-350px 0px 0px 0px' });
    var sentinel = document.createElement('div'); el.prepend(sentinel); swapIO.observe(sentinel);

    // which planche is "current" (jquery.appear port): the one crossing the middle of the viewport
    var curIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) setCurrent(planches.indexOf(e.target)); });
    }, { rootMargin: '-45% 0px -45% 0px', threshold: 0 });
    planches.forEach(function (p) { curIO.observe(p); });

    function setCurrent(i) {
      if (i < 0) return; current = i;
      if (count) count.textContent = (i + 1) + ' / ' + total;
      if (prog) prog.style.width = ((i + 1) * 100 / total) + '%';   // grandpapier fraction = 100 / total
      if (dots) Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('is-active', k === i); });
      try { sessionStorage.setItem(key, i); } catch (_) {}
    }
    function go(i) {
      i = Math.max(0, Math.min(total - 1, i));
      var mode = el.dataset.mode;
      if (mode === 'pages') track.scrollTo({ left: planches[i].offsetLeft - track.offsetLeft, behavior: 'smooth' });
      else planches[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrent(i);
    }
    function setMode(m) {
      el.dataset.mode = m;
      el.querySelectorAll('[data-mode-btn]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.modeBtn === m); });
      if (m !== 'scroll') lazy(el, '4000px 0px');            // grid / pages: load wider
      requestAnimationFrame(function () { go(current); });
    }
    var dir = el.dataset.dir === 'rtl' ? -1 : 1;             // reading direction (manga sense)
    function next() { go(current + dir * (el.dataset.spread === '2' ? 2 : 1)); }
    function prev() { go(current - dir * (el.dataset.spread === '2' ? 2 : 1)); }

    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-mode-btn]'); if (b) return setMode(b.dataset.modeBtn);
      if (e.target.closest('.bd-reader__arrow--next')) return next();
      if (e.target.closest('.bd-reader__arrow--prev')) return prev();
      var p = e.target.closest('.bd-planche');
      if (p) {
        if (el.dataset.mode === 'grid') { setMode(opts.gridClickMode || 'pages'); go(planches.indexOf(p)); }
        else if (opts.zoom !== false) global.BDKit.zoom().open(planches.map(function (x) { var im = x.querySelector('img'); return im.dataset.full || im.currentSrc || im.src; }), planches.indexOf(p));
      }
    });
    // keyboard: arrows / space / j-k (lassociation + misma swiper keyboard:true), g = grid, v = vertical, p = pages
    el.tabIndex = el.tabIndex || 0;
    document.addEventListener('keydown', function (e) {
      if (e.target.matches('input,textarea,[contenteditable]')) return;
      var r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return;
      switch (e.key) {
        case 'ArrowRight': case 'ArrowDown': case 'j': case ' ': if (el.dataset.mode !== 'scroll' || e.key !== ' ') { e.preventDefault(); next(); } break;
        case 'ArrowLeft': case 'ArrowUp': case 'k': e.preventDefault(); prev(); break;
        case 'g': setMode('grid'); break; case 'v': setMode('scroll'); break; case 'p': setMode('pages'); break;
      }
    });
    // swipe in pages mode is native (scroll-snap); keep "current" in sync with the snap
    if (track) track.addEventListener('scroll', function () {
      if (el.dataset.mode !== 'pages') return;
      var i = Math.round(track.scrollLeft / planches[0].offsetWidth); if (dir < 0) i = total - 1 - i;
      if (i !== current) setCurrent(i);
    }, { passive: true });

    setMode(el.dataset.mode || 'scroll');
    var saved = parseInt((function () { try { return sessionStorage.getItem(key); } catch (_) { return null; } })(), 10);
    if (opts.resume !== false && saved > 0) go(saved);
    return { go: go, next: next, prev: prev, setMode: setMode, get current() { return current; } };
  }

  /* ---------- 3. zoom lightbox (PhotoSwipe / lity / fancybox — minimal: wheel + pinch zoom, drag pan, arrows, Esc) ---------- */
  var zoomInst;
  function zoom() {
    if (zoomInst) return zoomInst;
    var box = document.createElement('div'); box.className = 'bd-zoom';
    box.innerHTML = '<button class="bd-zoom__nav bd-zoom__nav--prev" aria-label="précédente">&lsaquo;</button><img alt=""><button class="bd-zoom__nav bd-zoom__nav--next" aria-label="suivante">&rsaquo;</button><button class="bd-zoom__close" aria-label="fermer">&times;</button>';
    document.body.appendChild(box);
    var img = box.querySelector('img'), list = [], idx = 0, s = 1, x = 0, y = 0, drag = null, pinch = null;
    function fit() { s = Math.min((innerWidth - 40) / img.naturalWidth, (innerHeight - 40) / img.naturalHeight, 1); x = -img.naturalWidth * s / 2; y = -img.naturalHeight * s / 2; apply(); }
    function apply() { img.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')'; }
    function show(i) { idx = (i + list.length) % list.length; img.src = list[idx]; img.onload = fit; }
    function open(urls, i) { list = urls; box.classList.add('is-open'); document.body.style.overflow = 'hidden'; show(i || 0); }
    function close() { box.classList.remove('is-open'); document.body.style.overflow = ''; }
    function zoomAt(cx, cy, f) {
      var ns = Math.max(.2, Math.min(6, s * f)); var px = cx - innerWidth / 2, py = cy - innerHeight / 2;
      x = px - (px - x) * ns / s; y = py - (py - y) * ns / s; s = ns; apply();
    }
    box.addEventListener('click', function (e) {
      if (e.target.closest('.bd-zoom__close')) return close();
      if (e.target.closest('.bd-zoom__nav--next')) return show(idx + 1);
      if (e.target.closest('.bd-zoom__nav--prev')) return show(idx - 1);
      if (e.target === box) close();
    });
    img.addEventListener('dblclick', function (e) { zoomAt(e.clientX, e.clientY, s < 1.5 ? 2.5 : 1 / s); });
    box.addEventListener('wheel', function (e) { e.preventDefault(); zoomAt(e.clientX, e.clientY, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
    img.addEventListener('pointerdown', function (e) { drag = { x: e.clientX - x, y: e.clientY - y }; img.setPointerCapture(e.pointerId); });
    img.addEventListener('pointermove', function (e) { if (drag && !pinch) { x = e.clientX - drag.x; y = e.clientY - drag.y; apply(); } });
    img.addEventListener('pointerup', function () { drag = null; });
    box.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { d: dist(e), s: s }; }, { passive: true });
    box.addEventListener('touchmove', function (e) { if (pinch && e.touches.length === 2) { var c = centre(e); zoomAt(c.x, c.y, dist(e) / pinch.d * pinch.s / s); } }, { passive: true });
    box.addEventListener('touchend', function () { pinch = null; });
    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(idx + 1); else if (e.key === 'ArrowLeft') show(idx - 1);
    });
    function dist(e) { var a = e.touches[0], b = e.touches[1]; return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); }
    function centre(e) { var a = e.touches[0], b = e.touches[1]; return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 }; }
    return (zoomInst = { open: open, close: close });
  }

  /* ---------- 4. scroll reveal (jquery.appear → IntersectionObserver; CSS does the motion) ---------- */
  function reveal(sel) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll(sel || '[data-reveal]').forEach(function (n) { io.observe(n); });
  }

  /* ---------- 5. weirdos: random sprinkles (lesrequinsmarteaux $.fn.randomBg / randomPosition port) ---------- */
  // weirdos(section, ['a.gif','b.png'], {chance: 60, count: 3}) — each run differs, like the Requins site.
  function weirdos(el, urls, o) {
    o = o || {}; var chance = o.chance == null ? 60 : o.chance, count = o.count || 3;
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    for (var i = 0; i < count; i++) {
      if (Math.random() * 100 > chance) continue;                   // Requins: "retourne un chaton avec une probabilité"
      var im = new Image(); im.className = 'bd-weirdo'; im.src = urls[Math.floor(Math.random() * urls.length)]; im.alt = '';
      im.style.left = (Math.random() * 90) + '%'; im.style.top = (Math.random() * 90) + '%';
      im.style.rotate = ((Math.random() - .5) * 30) + 'deg';
      el.appendChild(im);
    }
  }

  /* ---------- 6. case-by-case reveal (Turbomedia concept: one panel per click/tap, no page scroll) ---------- */
  // <div class="bd-cases"><img ...><img hidden ...><img hidden ...></div> — click/space/→ reveals next, ← hides last.
  function cases(el) {
    var items = Array.prototype.slice.call(el.children), n = 1;
    function render() { items.forEach(function (c, i) { c.hidden = i >= n; }); el.dataset.step = n + '/' + items.length; }
    function fwd() { if (n < items.length) { n++; render(); } }
    function back() { if (n > 1) { n--; render(); } }
    el.addEventListener('click', fwd); el.tabIndex = 0;
    el.addEventListener('keydown', function (e) { if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); fwd(); } if (e.key === 'ArrowLeft') back(); });
    render(); return { next: fwd, prev: back };
  }

  global.BDKit = { reader: reader, zoom: zoom, reveal: reveal, lazy: lazy, weirdos: weirdos, cases: cases };
  // auto-init
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.bd-reader').forEach(function (el) { reader(el); });
    document.querySelectorAll('.bd-cases').forEach(cases);
    reveal();
  });
})(window);
