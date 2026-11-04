/* glue between the three kits (kit-web.js = KIT registry + sheet transitions, kit-bd.js = BDKit lazy/zoom, kit-type.js = defs/boil)
   + the site's own pieces: theme switch per section, pencil cursor trail, back-to-top, subtle boil on drawings in view. */
(() => {
  'use strict';
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.documentElement;

  /* ---- subtle boil filters for the drawings (scale 2 instead of the kit's 5-7) ---- */
  function injectBoil() {
    if (document.getElementById('ep-boil-0')) return;
    const f = [0, 1, 2].map(i => `<filter id="ep-boil-${i}" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="turbulence" baseFrequency=".012" numOctaves="2" seed="${i * 7 + 1}" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="${i === 1 ? 2.6 : 2}"/></filter>`).join('');
    document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" aria-hidden="true" style="position:absolute;width:0;height:0"><defs>${f}</defs></svg>`);
  }
  const viewIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('in-view', e.isIntersecting)), { rootMargin: '-5% 0px -5% 0px' });

  /* ---- theme: body background + nav colour follow the section in view ---- */
  /* the section crossing the viewport's centre line sets the theme (works for sections taller than the viewport) */
  const themeIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target;
    document.body.style.setProperty('--bg', el.dataset.plate);
    root.classList.toggle('is-dark', el.dataset.dark === '1');
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', el.dataset.plate);
  }), { rootMargin: '-50% 0px -50% 0px', threshold: 0 });
  KIT.register('theme', el => { themeIO.observe(el); return { destroy: () => themeIO.unobserve(el) }; });

  /* ---- vertical strip reader: lazy tiles + progress + j/k (bd_comics kit, scroll mode only) ---- */
  KIT.register('reader', el => {
    BDKit.lazy(el, '1200px 0px');
    el.querySelectorAll('.bd-planche').forEach(p => viewIO.observe(p));
    heads(el);
    const bar = el.querySelector('.strip__progress > i');
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight - r.top) / (r.height + innerHeight)));
      if (bar) bar.style.width = (p * 100).toFixed(1) + '%';
    };
    const onKey = e => {
      if (e.target.matches('input,textarea')) return;
      if (e.key === 'j' || e.key === 'ArrowDown') { e.preventDefault(); KIT.scrollTo(scrollY + innerHeight * .8); }
      if (e.key === 'k' || e.key === 'ArrowUp') { e.preventDefault(); KIT.scrollTo(scrollY - innerHeight * .8); }
    };
    addEventListener('scroll', onScroll, { passive: true }); addEventListener('keydown', onKey); onScroll();
    return { destroy: () => { removeEventListener('scroll', onScroll); removeEventListener('keydown', onKey); } };
  });

  /* ---- drawings grid: cascade reveal + zoom lightbox ---- */
  KIT.register('cascade', el => {
    const items = [...el.children];
    items.forEach((c, i) => c.style.setProperty('--d', `${(i % 12) * 70}ms`));
    const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -10% 0px' });
    items.forEach(c => io.observe(c));
    const click = e => {
      const card = e.target.closest('.card'); if (!card || card.classList.contains('card--serie')) return;
      e.preventDefault(); e.stopPropagation();
      const zoomable = items.filter(c => !c.classList.contains('card--serie'));
      BDKit.zoom().open(zoomable.map(c => c.dataset.full || c.querySelector('img').src), zoomable.indexOf(card));
    };
    el.addEventListener('click', click);
    return { destroy: () => { io.disconnect(); el.removeEventListener('click', click); } };
  });

  /* ---- heads: boxes from assets/heads.json copied over the tile, only they boil.
     Marking mode: open a strip with ?marquer, drag a box on each head, JSON appears bottom-left (paste into assets/heads.json). ---- */
  async function heads(el) {
    const id = el.dataset.strip; const planches = [...el.querySelectorAll('.bd-planche')];
    let data = {}; try { data = await (await fetch('../assets/heads.json', { cache: 'no-store' })).json(); } catch (_) {}
    const boxes = (data[id] || []);
    const place = () => boxes.forEach(b => {
      const p = planches[b.tile]; if (!p || p.querySelector(`[data-k="${b.tile}-${b.x}-${b.y}"]`)) return;
      const img = p.querySelector('img'); const src = img.dataset.src || img.src;
      const h = document.createElement('span'); h.className = 'boil-head'; h.dataset.k = `${b.tile}-${b.x}-${b.y}`;
      Object.assign(h.style, { left: b.x * 100 + '%', top: b.y * 100 + '%', width: b.w * 100 + '%', height: b.h * 100 + '%',
        backgroundImage: `url("${src}")`, backgroundSize: `${100 / b.w}% ${100 / b.h}%`, backgroundPosition: `${b.x / (1 - b.w) * 100}% ${b.y / (1 - b.h) * 100}%` });
      p.appendChild(h);
    });
    place();
    if (!location.search.includes('marquer')) return;
    el.classList.add('marking');
    const out = document.createElement('textarea'); out.className = 'mark-out'; out.readOnly = true; document.body.appendChild(out);
    const show = () => { out.value = JSON.stringify(boxes); navigator.clipboard?.writeText(out.value).catch(() => {}); };
    show();
    let start = null, rect = null;
    el.addEventListener('pointerdown', e => {
      const p = e.target.closest('.bd-planche'); if (!p) return; e.preventDefault();
      const r = p.getBoundingClientRect(); start = { p, r, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height };
      rect = document.createElement('span'); rect.className = 'mark'; p.appendChild(rect);
    });
    el.addEventListener('pointermove', e => {
      if (!start) return; const { r } = start; const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      Object.assign(rect.style, { left: Math.min(x, start.x) * 100 + '%', top: Math.min(y, start.y) * 100 + '%', width: Math.abs(x - start.x) * 100 + '%', height: Math.abs(y - start.y) * 100 + '%' });
    });
    addEventListener('pointerup', e => {
      if (!start) return; const { p, r } = start; const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      const b = { tile: planches.indexOf(p), x: +Math.min(x, start.x).toFixed(4), y: +Math.min(y, start.y).toFixed(4), w: +Math.abs(x - start.x).toFixed(4), h: +Math.abs(y - start.y).toFixed(4) };
      if (b.w > .01 && b.h > .01) boxes.push(b); rect.remove(); start = null; place(); show();
    });
    addEventListener('keydown', e => { if (e.key === 'Backspace' && boxes.length) { boxes.pop(); el.querySelectorAll('.boil-head').forEach(h => h.remove()); place(); show(); } });
  }

  /* ---- hero: the covers take turns (crossfade), click opens that bande ---- */
  KIT.register('covers', el => {
    const items = [...el.querySelectorAll('.cover')]; if (items.length < 2) return;
    let i = 0; items[0].classList.add('is-on');
    const t = setInterval(() => { if (document.hidden) return; items[i].classList.remove('is-on'); i = (i + 1) % items.length; items[i].classList.add('is-on'); }, 5000);
    return { destroy: () => clearInterval(t) };
  });

  /* ---- about deck: her 4 real sheets; the top one flies off, then slips back under the pile. Never an empty pile. ---- */
  KIT.register('deck', el => {
    const imgs = [...el.children]; if (imgs.length < 2) return;
    let pile = [...imgs];
    const order = () => pile.forEach((im, i) => im.style.setProperty('--i', i));
    order();
    const t = setInterval(() => {
      if (document.hidden) return;
      const top = pile.shift(); top.classList.add('is-leaving'); order();
      setTimeout(() => { top.classList.add('is-back'); top.classList.remove('is-leaving'); pile.push(top); order(); requestAnimationFrame(() => requestAnimationFrame(() => top.classList.remove('is-back'))); }, 750);
    }, 2800);
    return { destroy: () => clearInterval(t) };
  });

  /* ---- back to top: appears after one screen ---- */
  KIT.register('totop', btn => {
    const on = () => btn.classList.toggle('is-on', scrollY > innerHeight * .9);
    addEventListener('scroll', on, { passive: true }); on();
    btn.addEventListener('click', () => KIT.scrollTo(0));
  });

  /* ---- pencil trail: coloured-pencil stroke under the cursor, erased fast and smooth ---- */
  function pencil() {
    const c = document.querySelector('.pencil'); if (!c || !fine || reduced) return;
    const ctx = c.getContext('2d'); let last = null, idle = 0;
    const size = () => { c.width = innerWidth * devicePixelRatio; c.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); };
    size(); addEventListener('resize', size);
    const colour = () => root.classList.contains('is-dark') ? '#f3efe6' : (Math.random() < .5 ? '#ff48b0' : '#0078bf');
    addEventListener('mousemove', e => {
      const p = { x: e.clientX, y: e.clientY };
      if (last) {
        if (Math.hypot(p.x - last.x, p.y - last.y) < 2) return;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = colour(); ctx.lineCap = 'round';
        for (let i = 0; i < 3; i++) {                     // three thin jittered lines = pencil grain
          ctx.globalAlpha = .18 + Math.random() * .22; ctx.lineWidth = 1 + Math.random() * 1.6;
          ctx.beginPath(); ctx.moveTo(last.x + (Math.random() - .5) * 2.5, last.y + (Math.random() - .5) * 2.5);
          ctx.lineTo(p.x + (Math.random() - .5) * 2.5, p.y + (Math.random() - .5) * 2.5); ctx.stroke();
        }
        idle = 0;
      }
      last = p;
    }, { passive: true });
    let running = false;
    function fade() {                                      // erase ~12 % per frame -> gone in ~0.4 s; loop stops when the sheet is clean
      ctx.globalCompositeOperation = 'destination-out'; ctx.globalAlpha = .12; ctx.fillRect(0, 0, innerWidth, innerHeight);
      if (++idle > 40) last = null;                        // lift the pencil after a pause: no long jump lines
      if (idle > 90) { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); return; }
      requestAnimationFrame(fade);
    }
    addEventListener('mousemove', () => { if (!running) { running = true; idle = 0; requestAnimationFrame(fade); } }, { passive: true });
  }

  /* ---- typography kit + boil defs after each page swap ---- */
  const origMount = KIT.mount.bind(KIT);
  KIT.mount = r => { injectBoil(); origMount(r); if (window.kit) kit.init(r === document ? document : r); };
  const menu = document.querySelector('.menu');
  if (menu) new MutationObserver(() => root.classList.toggle('menu-open', menu.classList.contains('is-open'))).observe(menu, { attributes: true, attributeFilter: ['class'] });
  addEventListener('DOMContentLoaded', pencil);

  /* ---- ?reglages : live knobs for spacing and title sizes; values land in the clipboard, Raouf pastes them back ---- */
  if (location.search.includes('reglages')) {
    const KNOBS = [
      ['--fs-title', 'Titre des bandes (px)', 24, 110, 'px'], ['--fs-hero', 'Nom en haut (px)', 28, 140, 'px'], ['--fs-section', 'Titres Dessins / Bandes (px)', 20, 100, 'px'],
      ['--fs-about', 'Pas encore une artiste (px)', 16, 80, 'px'], ['--sp-eyebrow', 'Espace étiquette → titre', 0, 80, 'px'], ['--sp-button', 'Espace titre → bouton', 0, 120, 'px'], ['--sp-sub', 'Espace titre → sous-ligne', 0, 60, 'px']];
    const saved = JSON.parse(localStorage.getItem('reglages') || '{}');
    const panel = document.createElement('div'); panel.className = 'reglages';
    panel.innerHTML = '<b>Réglages</b><small>Bouge, regarde, puis colle-moi les valeurs (copiées).</small>' + KNOBS.map(([v, l, a, b, u]) => {
      const cur = saved[v] ? parseFloat(saved[v]) : Math.round(parseFloat(getComputedStyle(document.querySelector('.block__title, h1, h2') || document.body).fontSize) || (a + b) / 2);
      return `<label>${l}<output>${saved[v] || 'auto'}</output><input type="range" min="${a}" max="${b}" value="${cur}" data-var="${v}" data-unit="${u}"></label>`; }).join('') + '<button type="button" data-reset>Remettre</button>';
    document.body.appendChild(panel);
    const apply = () => { Object.entries(saved).forEach(([k, v]) => root.style.setProperty(k, v)); };
    apply();
    panel.addEventListener('input', e => {
      const i = e.target; if (!i.dataset.var) return;
      saved[i.dataset.var] = i.value + i.dataset.unit; i.previousElementSibling.textContent = saved[i.dataset.var];
      localStorage.setItem('reglages', JSON.stringify(saved)); apply();
      navigator.clipboard?.writeText(Object.entries(saved).map(([k, v]) => `${k}: ${v};`).join('\n')).catch(() => {});
    });
    panel.querySelector('[data-reset]').addEventListener('click', () => { localStorage.removeItem('reglages'); location.reload(); });
  }
  // header / menu / footer stay in place across page swaps: freeze their links to absolute URLs so '../index.html' keeps meaning the home
  document.querySelectorAll('.nav a[href], .menu a[href], .foot a[href]').forEach(a => a.setAttribute('href', a.href));
})();

/* ---- lightbox (replaces BDKit.zoom): trackpad scroll + drag = pan, pinch / ctrl+wheel / buttons / double-click = zoom, edges clamped, smoothed ---- */
(() => {
  let inst = null;
  BDKit.zoom = () => {
    if (inst) return inst;
    const box = document.createElement('div'); box.className = 'bd-zoom';
    box.innerHTML = '<button class="bd-zoom__nav bd-zoom__nav--prev" aria-label="Précédente">‹</button><img alt="" draggable="false"><button class="bd-zoom__nav bd-zoom__nav--next" aria-label="Suivante">›</button><button class="bd-zoom__close" aria-label="Fermer">×</button><div class="bd-zoom__tools"><button type="button" data-z="in" aria-label="Zoom avant">+</button><button type="button" data-z="out" aria-label="Zoom arrière">−</button></div>';
    document.body.appendChild(box);
    const img = box.querySelector('img');
    let list = [], idx = 0, fitS = 1, s = 1, x = 0, y = 0, tx = 0, ty = 0, ts = 1, raf = null, drag = null, pinch = null;
    const W = () => innerWidth, H = () => innerHeight;
    function clamp() {                                   // keep the picture on screen: never pan past its edges (centre it when smaller than the viewport)
      const w = img.naturalWidth * ts, h = img.naturalHeight * ts;
      tx = w <= W() ? (W() - w) / 2 : Math.min(0, Math.max(W() - w, tx));
      ty = h <= H() ? (H() - h) / 2 : Math.min(0, Math.max(H() - h, ty));
    }
    function apply() { img.style.transform = `translate3d(${x}px,${y}px,0) scale(${s})`; }
    function tick() {                                    // lerp towards the target: fluid pan/zoom
      x += (tx - x) * .28; y += (ty - y) * .28; s += (ts - s) * .28;
      apply();
      if (Math.abs(tx - x) + Math.abs(ty - y) + Math.abs(ts - s) * 100 > .05) raf = requestAnimationFrame(tick); else { x = tx; y = ty; s = ts; apply(); raf = null; }
    }
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    function fit(instant) {
      fitS = Math.min((W() - 32) / img.naturalWidth, (H() - 32) / img.naturalHeight, 1);
      ts = fitS; tx = (W() - img.naturalWidth * ts) / 2; ty = (H() - img.naturalHeight * ts) / 2;
      if (instant) { x = tx; y = ty; s = ts; apply(); } else kick();
    }
    function zoomAt(cx, cy, f) {
      const ns = Math.max(fitS, Math.min(fitS * 8, ts * f));
      tx = cx - (cx - tx) * ns / ts; ty = cy - (cy - ty) * ns / ts; ts = ns; clamp(); kick();
    }
    function show(i) { idx = (i + list.length) % list.length; img.style.opacity = 0; img.src = list[idx]; img.onload = () => { fit(true); img.style.opacity = 1; }; }
    function open(urls, i) { list = urls; box.classList.add('is-open'); document.body.style.overflow = 'hidden'; show(i || 0); }
    function close() { box.classList.remove('is-open'); document.body.style.overflow = ''; }
    box.addEventListener('click', e => {
      if (e.target.closest('.bd-zoom__close')) return close();
      if (e.target.closest('.bd-zoom__nav--next')) return show(idx + 1);
      if (e.target.closest('.bd-zoom__nav--prev')) return show(idx - 1);
      const b = e.target.closest('[data-z]'); if (b) return zoomAt(W() / 2, H() / 2, b.dataset.z === 'in' ? 1.6 : 1 / 1.6);
      if (e.target === box) close();
    });
    img.addEventListener('dblclick', e => zoomAt(e.clientX, e.clientY, ts < fitS * 1.5 ? 2.5 : fitS / ts));
    box.addEventListener('wheel', e => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * .01));   // pinch on a trackpad arrives as ctrl+wheel
      else { tx -= e.deltaX; ty -= e.deltaY; clamp(); kick(); }                             // two-finger scroll pans
    }, { passive: false });
    img.addEventListener('pointerdown', e => { if (e.pointerType === 'touch') return; drag = { x: e.clientX - tx, y: e.clientY - ty }; img.setPointerCapture(e.pointerId); img.style.cursor = 'grabbing'; });
    img.addEventListener('pointermove', e => { if (!drag) return; tx = e.clientX - drag.x; ty = e.clientY - drag.y; clamp(); x = tx; y = ty; apply(); });
    const up = () => { drag = null; img.style.cursor = ''; }; img.addEventListener('pointerup', up); img.addEventListener('pointercancel', up);
    const dist = e => Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    const mid = e => ({ x: (e.touches[0].clientX + e.touches[1].clientX) / 2, y: (e.touches[0].clientY + e.touches[1].clientY) / 2 });
    let t1 = null;
    box.addEventListener('touchstart', e => { if (e.touches.length === 2) pinch = { d: dist(e), s: ts }; else if (e.touches.length === 1) t1 = { x: e.touches[0].clientX - tx, y: e.touches[0].clientY - ty }; }, { passive: true });
    box.addEventListener('touchmove', e => {
      if (pinch && e.touches.length === 2) { const m = mid(e); zoomAt(m.x, m.y, dist(e) / pinch.d * pinch.s / ts); }
      else if (t1 && e.touches.length === 1) { tx = e.touches[0].clientX - t1.x; ty = e.touches[0].clientY - t1.y; clamp(); kick(); }
    }, { passive: true });
    box.addEventListener('touchend', () => { pinch = null; t1 = null; });
    addEventListener('resize', () => box.classList.contains('is-open') && fit(true));
    document.addEventListener('keydown', e => {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close(); else if (e.key === 'ArrowRight') show(idx + 1); else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === '+' || e.key === '=') zoomAt(W() / 2, H() / 2, 1.4); else if (e.key === '-') zoomAt(W() / 2, H() / 2, 1 / 1.4);
    });
    return (inst = { open, close });
  };
})();
