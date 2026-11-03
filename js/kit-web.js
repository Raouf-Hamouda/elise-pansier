/* kit.js — Elise Pansier site, web-design lane. 3 Nov 2026. Vanilla, no build step.
   Patterns rewritten standalone from: dennissnellenberg.com (preloader words, curved sheet, barba flow, magnetic),
   jesperlandberg.com + nicolasloureiro.com (fixed stage virtual scroll), louisansa.com (sheet transition),
   locomotive.ca (data-module registry, Lenis), unseen.co + immersive-g.com (data-cursor states, two-layer cursor).
   Optional CDNs (load before this file, both are checked at runtime):
     <script src="https://unpkg.com/lenis@1.3.4/dist/lenis.min.js"></script>
     <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>
     <script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js"></script>
   Markup contract: see demo.html. */
(() => {
  'use strict';
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const lerp = (a, b, t) => a + (b - a) * t;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wait = ms => new Promise(r => setTimeout(r, ms));

  /* ---------- module registry (locomotive data-module-*) : everything re-inits after a page swap ---------- */
  const modules = {};
  const live = [];
  const K = {
    register(name, fn) { modules[name] = fn; },
    mount(root = document) {
      [...(root.matches?.('[data-module]') ? [root] : []), ...$$('[data-module]', root)].forEach(el => {
        if (el.__k) return;
        const fn = modules[el.dataset.module];
        if (fn) { el.__k = fn(el) || {}; live.push(el); }
      });
    },
    unmount(root) {
      for (let i = live.length - 1; i >= 0; i--) {
        if (root.contains(live[i])) { live[i].__k.destroy?.(); delete live[i].__k; live.splice(i, 1); }
      }
    }
  };
  window.KIT = K;

  /* ---------- smooth scroll (Lenis if present, native otherwise) ---------- */
  let lenis = null;
  function initScroll() {
    if (lenis || reduced || !window.Lenis) return;
    lenis = new Lenis({ lerp: 0.1, wheelMultiplier: 1 });         // lerp .1 ≈ locomotive/immersive feel
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
    if (window.ScrollTrigger) { lenis.on('scroll', ScrollTrigger.update); }
  }
  K.scrollTo = (y, o) => lenis ? lenis.scrollTo(y, o) : window.scrollTo({ top: y, behavior: 'smooth' });

  /* ---------- reveal on scroll + parallax (dennis once-in / data-scroll-speed) ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }), { rootMargin: '0px 0px -12% 0px' });
  K.register('reveal', el => {
    $$('.stagger > *', el).forEach((c, i) => c.style.setProperty('--i', i));
    if (el.dataset.reveal === 'lines') splitLines(el);
    io.observe(el);
    return { destroy: () => io.unobserve(el) };
  });
  function splitLines(el) {                     // cheap SplitText: one span per line break the author wrote
    if (el.dataset.split) return;
    el.dataset.split = '1';
    el.innerHTML = el.innerHTML.split(/<br\s*\/?>/i).map(l => `<span class="k-line"><span>${l.trim()}</span></span>`).join('');
  }
  const parallax = [];
  K.register('parallax', el => {
    const item = { el, speed: parseFloat(el.dataset.speed || .2) };
    parallax.push(item);
    return { destroy: () => parallax.splice(parallax.indexOf(item), 1) };
  });
  function tickParallax() {
    if (reduced) return;
    const vh = innerHeight;
    for (const { el, speed } of parallax) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) continue;
      el.style.transform = `translate3d(0,${((r.top + r.height / 2) - vh / 2) * -speed}px,0)`;
    }
    requestAnimationFrame(tickParallax);
  }

  /* ---------- preloader: cycling words then curved sheet peels up (dennis) ---------- */
  async function preload() {
    const sheet = $('.sheet'); if (!sheet) return;
    const words = sheet.dataset.words ? sheet.dataset.words.split('|') : [];
    const box = $('.sheet__words', sheet);
    if (box && words.length && !reduced) {
      box.classList.add('is-on');
      for (const w of words) { box.textContent = w; await wait(words.length > 4 ? 180 : 320); }
      box.classList.remove('is-on');
      await wait(200);
    }
    sheet.classList.add('is-up');
    document.documentElement.classList.add('is-loaded');
  }

  /* ---------- page transitions: fetch + sheet + history (barba flow without barba) ---------- */
  const container = () => $('[data-page]');
  async function go(url, push = true) {
    const sheet = $('.sheet'), cur = container();
    if (!sheet || !cur) { location.href = url; return; }
    $('.menu')?.classList.remove('is-open'); $('.menu-btn')?.setAttribute('aria-expanded', 'false');
    sheet.classList.remove('is-up'); sheet.classList.add('is-down');          // park below, no anim
    sheet.classList.add('no-anim'); void sheet.offsetWidth; sheet.classList.remove('no-anim');
    sheet.classList.remove('is-down');                                        // slide up to cover (dennis 495 ms)
    const [html] = await Promise.all([fetch(url).then(r => r.text()), wait(reduced ? 0 : 420)]);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const next = $('[data-page]', doc);
    if (!next) { location.href = url; return; }
    for (const a of ['src', 'data-src', 'href', 'data-full']) $$(`[${a}]`, next).forEach(el => { const v = el.getAttribute(a); if (v && !/^(https?:|mailto:|#|data:)/.test(v)) el.setAttribute(a, new URL(v, url).pathname); });
    $$('[srcset]', next).forEach(el => el.setAttribute('srcset', el.getAttribute('srcset').split(',').map(p => { const [u, d] = p.trim().split(/\s+/); return new URL(u, url).pathname + (d ? ' ' + d : ''); }).join(', ')));
    K.unmount(cur);
    document.title = doc.title;
    cur.replaceWith(next);
    document.body.className = doc.body.className;
    if (push) history.pushState({ url }, '', url);
    (lenis ? lenis.scrollTo(0, { immediate: true }) : window.scrollTo(0, 0));
    K.mount(next);
    const h = new URL(url, location.href).hash; if (h) { const t = $(h); if (t) setTimeout(() => t.scrollIntoView(), 60); }
    window.ScrollTrigger?.refresh();
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));   // let the new page paint under the sheet before it lifts
    sheet.classList.add('is-up');                                             // uncover: next hero already laid out (louisansa)
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target || a.hasAttribute('download') || a.origin !== location.origin) return;
    if (a.hash && a.pathname === location.pathname) { const m = $('.menu'); if (m?.classList.contains('is-open')) { m.classList.remove('is-open'); $('.menu-btn')?.setAttribute('aria-expanded', 'false'); lenis?.start(); } return; }
    if (a.dataset.noTransition !== undefined) return;
    e.preventDefault();
    if (a.pathname === location.pathname && !a.hash) {   // same page: close the menu, go up
      const m = $('.menu'); if (m?.classList.contains('is-open')) { m.classList.remove('is-open'); $('.menu-btn')?.setAttribute('aria-expanded', 'false'); lenis?.start(); }
      K.scrollTo(0); return;
    }
    go(a.href);
  });
  addEventListener('popstate', () => go(location.href, false));

  /* ---------- overlay menu ---------- */
  K.register('menu-btn', btn => {
    const menu = $('.menu');
    const toggle = () => { const open = menu.classList.toggle('is-open'); btn.setAttribute('aria-expanded', open); lenis ? (open ? lenis.stop() : lenis.start()) : null; };
    btn.addEventListener('click', toggle);
    addEventListener('keydown', e => e.key === 'Escape' && menu.classList.contains('is-open') && toggle());
    $$('a[data-color]', menu).forEach(a => {                                  // miranda: links recolour the page
      a.addEventListener('mouseenter', () => menu.style.background = a.dataset.color);
      a.addEventListener('mouseleave', () => menu.style.background = '');
    });
  });

  /* ---------- cursor: dot follows, ring lerps; states from data-cursor (unseen / immersive) ---------- */
  function initCursor() {
    const c = $('.cursor'); if (!c || !fine || reduced) return;
    const dot = $('.cursor__dot', c), ring = $('.cursor__ring', c), txt = $('.cursor__text', c);
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
    (function loop() {
      rx = lerp(rx, mx, .18); ry = lerp(ry, my, .18);                        // immersive cursor__ease
      dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', e => {
      const t = e.target.closest('[data-cursor], a, button');
      if (!t) { c.dataset.state = ''; return; }
      const v = t.dataset.cursor ?? 'link';
      if (v === 'hide' || v === 'drag' || v === 'link') { c.dataset.state = v; }
      else { c.dataset.state = 'text'; txt.textContent = v; }               // data-cursor="voir"
    });
  }

  /* ---------- magnetic buttons (dennis: strength 100, elastic return) ---------- */
  K.register('magnetic', el => {
    if (!fine || reduced) return;
    const strength = parseFloat(el.dataset.strength || 40);
    const inner = el.firstElementChild;
    const move = e => {
      const r = el.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width - .5) * strength, y = ((e.clientY - r.top) / r.height - .5) * strength;
      el.style.transition = 'transform .2s var(--ease-out-quint)';
      el.style.transform = `translate(${x}px,${y}px)`;
      if (inner) inner.style.transform = `translate(${x * .4}px,${y * .4}px)`;
    };
    const leave = () => { el.style.transition = 'transform 1s var(--ease-back)'; el.style.transform = ''; if (inner) inner.style.transform = ''; };
    el.addEventListener('mousemove', move); el.addEventListener('mouseleave', leave);
    return { destroy: () => { el.removeEventListener('mousemove', move); el.removeEventListener('mouseleave', leave); } };
  });

  /* ---------- fixed stage: wheel/touch/keys step through slides (loureiro Observer, jesper wall) ---------- */
  K.register('stage', el => {
    const slides = $$('.k-slide', el); let i = 0, busy = false, ty = 0;
    const show = n => {
      n = Math.max(0, Math.min(slides.length - 1, n)); if (n === i && slides[i].classList.contains('is-active')) return;
      busy = true;
      slides.forEach((s, k) => { s.classList.toggle('is-active', k === n); s.classList.toggle('is-prev', k < n); });
      i = n; el.dispatchEvent(new CustomEvent('stage:change', { detail: i })); setTimeout(() => busy = false, reduced ? 0 : 1000);
    };
    const wheel = e => { if (busy || Math.abs(e.deltaY) < 20) return; show(i + Math.sign(e.deltaY)); };
    const ts = e => ty = e.touches[0].clientY;
    const te = e => { const d = ty - e.changedTouches[0].clientY; if (Math.abs(d) > 40) show(i + Math.sign(d)); };
    const key = e => { if (e.key === 'ArrowDown' || e.key === 'PageDown') show(i + 1); if (e.key === 'ArrowUp' || e.key === 'PageUp') show(i - 1); };
    el.addEventListener('wheel', wheel, { passive: true }); el.addEventListener('touchstart', ts, { passive: true });
    el.addEventListener('touchend', te); addEventListener('keydown', key);
    lenis?.stop(); show(0);
    return { destroy: () => { lenis?.start(); removeEventListener('keydown', key); } };
  });

  /* ---------- boot ---------- */
  addEventListener('DOMContentLoaded', () => {
    initScroll(); initCursor(); K.mount(document); tickParallax(); preload();
  });
})();
