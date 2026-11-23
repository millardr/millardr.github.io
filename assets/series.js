/* ABYSSAL series — page chrome and interactive labs.
   No dependencies. Every lab is a small, self-contained model of the maths in the
   surrounding text; none of them talks to a server. */
(() => {
  'use strict';

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = 9.81;

  /* ---------------- theme ---------------- */
  const root = document.documentElement;
  // The ABYSSAL showcase and the main site keep separate choices; ABYSSAL opens dark.
  const themeKey = root.classList.contains('abyssal') ? 'theme-abyssal' : 'theme-main';
  try { const t = localStorage.getItem(themeKey) || (themeKey === 'theme-abyssal' ? 'dark' : ''); if (t) root.dataset.theme = t; } catch (e) { if (themeKey === 'theme-abyssal') root.dataset.theme = 'dark'; }
  const isDark = () => root.dataset.theme ? root.dataset.theme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/></svg>';
  const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>';
  $$('.theme-btn').forEach((b) => {
    const paint = () => { b.innerHTML = isDark() ? sun : moon; b.setAttribute('aria-label', isDark() ? 'Switch to light theme' : 'Switch to dark theme'); };
    paint();
    b.addEventListener('click', () => {
      const next = isDark() ? 'light' : 'dark';
      root.dataset.theme = next;
      try { localStorage.setItem(themeKey, next); } catch (e) { /* ignore */ }
      paint();
      window.dispatchEvent(new Event('themechange'));
    });
  });

  /* ---------------- mobile menu ---------------- */
  $$('.menu-btn').forEach((b) => {
    const nav = document.getElementById(b.getAttribute('aria-controls'));
    if (!nav) return;
    b.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      b.setAttribute('aria-expanded', String(open));
      b.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('open'); b.setAttribute('aria-expanded', 'false'); }));
  });

  /* ---------------- reading progress ---------------- */
  const bar = $('.progress span');
  if (bar) {
    const upd = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (100 * window.scrollY) / h : 0) + '%';
    };
    window.addEventListener('scroll', upd, { passive: true });
    upd();
  }

  /* ---------------- table of contents + scrollspy ---------------- */
  const toc = $('.toc');
  const prose = $('.prose');
  if (toc && prose) {
    const heads = $$('h2, h3', prose).filter((h) => !h.closest('.lab') && !h.closest('.callout'));
    const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = 'On this page';
    toc.appendChild(label);
    const links = heads.map((h) => {
      if (!h.id) h.id = slug(h.textContent.replace(/^\d+\s*/, ''));
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.dataset.toc || h.textContent.replace(/^[0-9.]+\s*/, '');
      a.className = h.tagName.toLowerCase();
      toc.appendChild(a);
      return a;
    });
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            links.forEach((l) => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id));
          }
        });
      }, { rootMargin: '-15% 0px -75% 0px' });
      heads.forEach((h) => io.observe(h));
    }
  }

  /* ---------------- lightbox ---------------- */
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.innerHTML = '<div><img alt=""><p></p></div>';
  document.body.appendChild(lb);
  const closeLb = () => lb.classList.remove('open');
  lb.addEventListener('click', closeLb);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeLb(); });
  $$('figure.shot img, .feature figure img').forEach((img) => {
    img.addEventListener('click', () => {
      $('img', lb).src = img.currentSrc || img.src;
      $('img', lb).alt = img.alt;
      const cap = img.closest('figure').querySelector('figcaption');
      $('p', lb).innerHTML = cap ? cap.innerHTML : '';
      lb.classList.add('open');
    });
  });
  $$('a[data-lightbox]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const img = $('img', a);
      $('img', lb).src = a.getAttribute('href');
      $('img', lb).alt = img ? img.alt : '';
      const cap = $('span', a);
      $('p', lb).innerHTML = cap ? cap.innerHTML : '';
      lb.classList.add('open');
    });
  });

  /* ---------------- reveal on scroll ---------------- */
  if ('IntersectionObserver' in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target); } });
    }, { threshold: 0.08 });
    $$('.reveal').forEach((el) => io.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('shown'));
  }

  /* ---------------- maths ---------------- */
  const renderMath = () => {
    if (window.renderMathInElement) {
      window.renderMathInElement(document.body, {
        delimiters: [
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    }
  };
  if (window.renderMathInElement) renderMath();
  else window.addEventListener('load', renderMath);

  /* ================================================================
     Shared drawing helpers
     ================================================================ */

  // Ember / inferno-like ramp: luminance rises monotonically, no blue or green.
  const STOPS = [
    [0.0, [0, 0, 4]], [0.13, [27, 12, 65]], [0.25, [74, 12, 107]], [0.38, [120, 28, 109]],
    [0.5, [165, 44, 96]], [0.63, [207, 68, 70]], [0.75, [237, 105, 37]], [0.88, [251, 155, 6]], [1.0, [252, 255, 164]],
  ];
  const LUT = (() => {
    const lut = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let k = 0;
      while (k < STOPS.length - 2 && STOPS[k + 1][0] < t) k++;
      const [t0, c0] = STOPS[k];
      const [t1, c1] = STOPS[k + 1];
      const u = (t - t0) / (t1 - t0);
      for (let j = 0; j < 3; j++) lut[i * 3 + j] = c0[j] + (c1[j] - c0[j]) * u;
    }
    return lut;
  })();
  const ember = (t) => {
    const i = clamp(Math.round(t * 255), 0, 255) * 3;
    return [LUT[i], LUT[i + 1], LUT[i + 2]];
  };

  function fitCanvas(c, aspect) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth || c.parentElement.clientWidth;
    const h = aspect ? Math.round(w / aspect) : c.clientHeight;
    if (aspect) c.style.height = h + 'px';
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w, h, dpr };
  }

  // Paint a scalar field (values already in [0,1]) into a w x h image, then scale smoothly.
  function heat(ctx, field, nx, ny, x, y, w, h, alphaFn) {
    const off = document.createElement('canvas');
    off.width = nx;
    off.height = ny;
    const o = off.getContext('2d');
    const img = o.createImageData(nx, ny);
    for (let i = 0; i < nx * ny; i++) {
      const [r, g, b] = ember(field[i]);
      img.data[i * 4] = r;
      img.data[i * 4 + 1] = g;
      img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = alphaFn ? alphaFn(field[i]) : 255;
    }
    o.putImageData(img, 0, 0);
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, x, y, w, h);
    ctx.restore();
  }

  const fmtPct = (x, d = 1) => (100 * x).toFixed(d) + '%';
  const entropyBits = (p) => { let h = 0; for (const v of p) if (v > 0) h -= v * Math.log2(v); return h; };
  const klBits = (p, q) => { let s = 0; for (let i = 0; i < p.length; i++) if (p[i] > 0) s += p[i] * Math.log2(p[i] / q[i]); return s; };
  const gauss2 = (x, y, cx, cy, sx, sy) => Math.exp(-0.5 * (((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2));
  function mulberry(seed) {
    let a = seed >>> 0;
    return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function randn(rng) { let u = 0; while (u === 0) u = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng()); }
  const bind = (root, sel, fn) => { const el = $(sel, root); if (el) el.addEventListener('input', fn); return el; };
  const setOut = (root, name, v) => { const o = $(`output[data-for="${name}"]`, root); if (o) o.textContent = v; };
  const setRead = (root, name, v) => { const o = $(`[data-read="${name}"]`, root); if (o) o.textContent = v; };
  const onVisible = (el, start, stop) => {
    if (!('IntersectionObserver' in window)) { start(); return; }
    new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? start() : stop()))).observe(el);
  };

  /* ================================================================
     Hero: a live Bayesian search running behind the title
     ================================================================ */
  $$('canvas.field').forEach((c) => {
    let nx = 120, ny = 64;
    let p, searched, target, rng, path, pathI, ctx, w, h, found = 0, sweeps = 0, flash = 0;
    const POD = 0.55;
    function reset(seed) {
      rng = mulberry(seed);
      p = new Float64Array(nx * ny);
      const blobs = [];
      const k = 3 + Math.floor(rng() * 2);
      for (let b = 0; b < k; b++) blobs.push([nx * (0.45 + 0.5 * rng()), ny * (0.15 + 0.7 * rng()), 4 + rng() * 10, 3 + rng() * 8, 0.4 + rng()]);
      let s = 0;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        let v = 0.002;
        for (const [cx, cy, sx, sy, wt] of blobs) v += wt * gauss2(i, j, cx, cy, sx, sy);
        p[j * nx + i] = v; s += v;
      }
      for (let i = 0; i < p.length; i++) p[i] /= s;
      // sample the hidden target from the prior: the map is honest about it
      let u = rng(), acc = 0;
      target = p.length - 1;
      for (let i = 0; i < p.length; i++) { acc += p[i]; if (acc >= u) { target = i; break; } }
      searched = new Float32Array(nx * ny);
      path = []; pathI = 0; sweeps = 0;
    }
    function plan() {
      // lawnmower box around the current most probable cell
      let best = 0;
      for (let i = 1; i < p.length; i++) if (p[i] > p[best]) best = i;
      const bx = best % nx, by = Math.floor(best / nx);
      const W = 9, H = 7;
      path = [];
      for (let r = 0; r < H; r++) {
        const y = clamp(by - Math.floor(H / 2) + r, 0, ny - 1);
        for (let q = 0; q < W; q++) {
          const x = clamp(bx - Math.floor(W / 2) + (r % 2 ? W - 1 - q : q), 0, nx - 1);
          path.push(y * nx + x);
        }
      }
      pathI = 0; sweeps++;
    }
    function step() {
      if (pathI >= path.length) plan();
      const cell = path[pathI++];
      // a miss multiplies the cell by (1 - POD); renormalise in one pass
      if (cell === target && rng() < POD) { found++; flash = 50; reset(Math.floor(rng() * 1e9)); return; }
      p[cell] *= 1 - POD;
      searched[cell] = 1;
      let s = 0; for (let i = 0; i < p.length; i++) s += p[i];
      for (let i = 0; i < p.length; i++) p[i] /= s;
    }
    function draw() {
      let mx = 0; for (let i = 0; i < p.length; i++) if (p[i] > mx) mx = p[i];
      const f = new Float32Array(p.length);
      for (let i = 0; i < p.length; i++) f[i] = Math.pow(p[i] / mx, 0.55);
      ctx.fillStyle = '#0d0d0d'; ctx.fillRect(0, 0, w, h);
      heat(ctx, f, nx, ny, 0, 0, w, h);
      // searched cells: a faint hatch, like the app
      const cw = w / nx, ch = h / ny;
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      for (let i = 0; i < searched.length; i++) if (searched[i]) ctx.fillRect((i % nx) * cw, Math.floor(i / nx) * ch, cw, ch);
      // grid
      ctx.strokeStyle = 'rgba(255,255,255,0.035)'; ctx.lineWidth = 1;
      for (let x = 0; x <= nx; x += 6) { ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, h); ctx.stroke(); }
      for (let y = 0; y <= ny; y += 6) { ctx.beginPath(); ctx.moveTo(0, y * ch); ctx.lineTo(w, y * ch); ctx.stroke(); }
      // track
      if (path.length) {
        ctx.strokeStyle = 'rgba(160, 230, 255, 0.85)'; ctx.lineWidth = 1.6; ctx.beginPath();
        for (let k = 0; k < pathI; k++) { const c2 = path[k]; const X = ((c2 % nx) + 0.5) * cw, Y = (Math.floor(c2 / nx) + 0.5) * ch; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }
        ctx.stroke();
        const cur = path[Math.max(0, pathI - 1)];
        const X = ((cur % nx) + 0.5) * cw, Y = (Math.floor(cur / nx) + 0.5) * ch;
        ctx.fillStyle = '#bfefff'; ctx.beginPath(); ctx.arc(X, Y, 3.2, 0, 7); ctx.fill();
        ctx.strokeStyle = 'rgba(191,239,255,0.35)'; ctx.beginPath(); ctx.arc(X, Y, 9, 0, 7); ctx.stroke();
      }
      if (flash > 0) { ctx.fillStyle = `rgba(252, 210, 92, ${flash / 220})`; ctx.fillRect(0, 0, w, h); flash--; }
      // readout
      const H = entropyBits(p);
      const lab = c.dataset.readout !== 'off';
      if (lab) {
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(241,237,230,0.75)';
        const t = `H = ${H.toFixed(2)} bits   effective cells = ${Math.round(2 ** H)}   sweeps = ${sweeps}   found = ${found}`;
        ctx.textAlign = 'right';
        ctx.fillText(t, w - 18, h - 16);
        ctx.textAlign = 'left';
      }
    }
    let running = false, raf = 0, last = 0;
    function loop(ts) {
      if (!running) return;
      if (ts - last > 45) { step(); step(); draw(); last = ts; }
      raf = requestAnimationFrame(loop);
    }
    function size() { ({ ctx, w, h } = fitCanvas(c)); nx = w < 700 ? 70 : 120; ny = Math.round(nx * h / w); reset(7 + found); draw(); }
    size();
    window.addEventListener('resize', () => { size(); });
    if (reduced) { for (let i = 0; i < 160; i++) step(); draw(); return; }
    onVisible(c, () => { if (!running) { running = true; raf = requestAnimationFrame(loop); } }, () => { running = false; cancelAnimationFrame(raf); });
  });

  /* ================================================================
     Lab: the grid playground (negative evidence, outside share, repeat credit)
     ================================================================ */
  $$('[data-lab="grid"]').forEach((root) => {
    const c = $('canvas', root);
    const nx = 30, ny = 16;
    let prior, passes, ctx, w, h, painting = false, lastBits = 0;
    const st = () => ({ a: +$('[name=a]', root).value / 100, d: +$('[name=d]', root).value / 100, rho: +$('[name=rho]', root).value / 100 });
    function reset() {
      prior = new Float64Array(nx * ny);
      let s = 0;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const v = 0.01 + gauss2(i, j, 8, 6, 4, 3) + 0.7 * gauss2(i, j, 21, 10, 3.5, 3);
        prior[j * nx + i] = v; s += v;
      }
      for (let i = 0; i < prior.length; i++) prior[i] /= s;
      passes = new Uint16Array(nx * ny);
      lastBits = 0;
      draw();
    }
    // survival of a cell after k identical passes with repeat credit rho: (1-d)^(1 + rho (k-1))
    const surv = (k, d, rho) => (k === 0 ? 1 : Math.pow(1 - d, 1 + rho * (k - 1)));
    function posterior() {
      const { a, d, rho } = st();
      const q = new Float64Array(prior.length);
      let inside = 0, missed = 0, unsearched = 0;
      for (let i = 0; i < prior.length; i++) {
        const s = surv(passes[i], d, rho);
        q[i] = prior[i] * s;
        inside += q[i];
        if (passes[i]) missed += q[i]; else unsearched += q[i];
      }
      const Z = a * inside + (1 - a);
      const cond = q.map((v) => v / inside);
      return { cond, Z, shares: { unsearched: (a * unsearched) / Z, missed: (a * missed) / Z, outside: (1 - a) / Z }, found: 1 - Z };
    }
    function draw() {
      ({ ctx, w, h } = fitCanvas(c, nx / ny));
      const P = posterior();
      let mx = 0; for (const v of P.cond) mx = Math.max(mx, v);
      heat(ctx, P.cond.map((v) => Math.pow(v / mx, 0.6)), nx, ny, 0, 0, w, h);
      const cw = w / nx, ch = h / ny;
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      for (let i = 0; i <= nx; i++) { ctx.beginPath(); ctx.moveTo(i * cw, 0); ctx.lineTo(i * cw, h); ctx.stroke(); }
      for (let j = 0; j <= ny; j++) { ctx.beginPath(); ctx.moveTo(0, j * ch); ctx.lineTo(w, j * ch); ctx.stroke(); }
      ctx.font = `600 ${Math.max(9, cw * 0.38)}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 0; i < passes.length; i++) if (passes[i]) {
        const x = (i % nx) * cw, y = Math.floor(i / nx) * ch;
        ctx.strokeStyle = 'rgba(160,230,255,0.7)'; ctx.strokeRect(x + 1.5, y + 1.5, cw - 3, ch - 3);
        if (passes[i] > 1) { ctx.fillStyle = 'rgba(200,240,255,0.95)'; ctx.fillText(passes[i], x + cw / 2, y + ch / 2); }
      }
      const H = entropyBits(P.cond);
      setRead(root, 'unsearched', fmtPct(P.shares.unsearched));
      setRead(root, 'missed', fmtPct(P.shares.missed));
      setRead(root, 'outside', fmtPct(P.shares.outside));
      setRead(root, 'found', fmtPct(Math.max(0, P.found)));
      setRead(root, 'H', H.toFixed(2) + ' bits');
      setRead(root, 'last', lastBits.toFixed(3) + ' bits');
      const barEl = $('.ledger', root);
      if (barEl) barEl.innerHTML = `<span style="width:${100 * P.shares.unsearched}%;background:#3fae84"></span><span style="width:${100 * P.shares.missed}%;background:#e8962e"></span><span style="width:${100 * P.shares.outside}%;background:#a678d8"></span>`;
    }
    function cellAt(e) {
      const r = c.getBoundingClientRect();
      const i = Math.floor(((e.clientX - r.left) / r.width) * nx), j = Math.floor(((e.clientY - r.top) / r.height) * ny);
      return i >= 0 && j >= 0 && i < nx && j < ny ? j * nx + i : -1;
    }
    let touched = new Set();
    function search(i) {
      if (i < 0 || touched.has(i)) return;
      touched.add(i);
      const before = posterior().cond;
      passes[i]++;
      lastBits = klBits(posterior().cond, before);
      draw();
    }
    c.addEventListener('pointerdown', (e) => { painting = true; touched = new Set(); c.setPointerCapture(e.pointerId); search(cellAt(e)); });
    c.addEventListener('pointermove', (e) => { if (painting) search(cellAt(e)); });
    c.addEventListener('pointerup', () => { painting = false; });
    $$('input', root).forEach((inp) => inp.addEventListener('input', () => {
      const { a, d, rho } = st();
      setOut(root, 'a', fmtPct(a, 0)); setOut(root, 'd', fmtPct(d, 0)); setOut(root, 'rho', rho.toFixed(2));
      draw();
    }));
    $('[data-act=reset]', root).addEventListener('click', reset);
    $('[data-act=best]', root).addEventListener('click', () => { touched = new Set(); const q = posterior().cond; let b = 0; for (let i = 1; i < q.length; i++) if (q[i] > q[b]) b = i; search(b); });
    $('[data-act=fallacy]', root).addEventListener('click', () => {
      // the coverage-fallacy setting: 90% inside, 80% of the ground once at 70% POD
      $('[name=a]', root).value = 90; $('[name=d]', root).value = 70; $('[name=rho]', root).value = 0;
      passes = new Uint16Array(nx * ny);
      for (let i = 0; i < Math.round(0.8 * nx); i++) for (let j = 0; j < ny; j++) passes[j * nx + i] = 1;
      // a uniform prior makes "80% of the area" mean 80% of the mass, as in the textbook example
      prior = new Float64Array(nx * ny).fill(1 / (nx * ny));
      setOut(root, 'a', '90%'); setOut(root, 'd', '70%'); setOut(root, 'rho', '0.00');
      lastBits = 0; draw();
    });
    window.addEventListener('resize', draw);
    reset();
  });

  /* ================================================================
     Lab: five echoes, one witness (provenance pooling)
     ================================================================ */
  $$('[data-lab="echoes"]').forEach((root) => {
    const c = $('canvas', root);
    const N = 400, X0 = 62, SIG = 6;
    const xs = Array.from({ length: N }, (_, i) => (i + 0.5) * (100 / N));
    const prior = (() => { const p = xs.map((x) => 0.6 + 0.4 * Math.exp(-0.5 * ((x - 35) / 18) ** 2)); const s = p.reduce((a, b) => a + b); return p.map((v) => v / s); })();
    const rng = mulberry(11);
    const jitter = Array.from({ length: 12 }, () => randn(rng));
    function layer(centre, r) {
      const K = xs.map((x) => Math.exp(-0.5 * ((x - centre) / SIG) ** 2));
      const Kbar = K.reduce((s, k, i) => s + k * prior[i], 0);
      return K.map((k) => (1 - r) + (r * k) / Kbar); // v2: contamination normalised against the prior
    }
    function draw() {
      const n = +$('[name=n]', root).value, r = +$('[name=r]', root).value / 100, s = +$('[name=s]', root).value;
      setOut(root, 'n', n); setOut(root, 'r', r.toFixed(2)); setOut(root, 's', s.toFixed(1));
      const layers = Array.from({ length: n }, (_, k) => layer(X0 + (k ? s * jitter[k] : 0), r));
      const naive = prior.map((p, i) => p * layers.reduce((a, L) => a * L[i], 1));
      const pooled = prior.map((p, i) => p * Math.exp(layers.reduce((a, L) => a + Math.log(L[i]), 0) / n));
      const norm = (v) => { const S = v.reduce((a, b) => a + b); return v.map((x) => x / S); };
      const nv = norm(naive), pv = norm(pooled);
      const { ctx, w, h } = fitCanvas(c, 2.4);
      const dark = isDark();
      ctx.fillStyle = dark ? '#151514' : '#fbfaf7'; ctx.fillRect(0, 0, w, h);
      const mx = Math.max(...nv, ...pv) * 1.08;
      const X = (i) => 24 + (i / (N - 1)) * (w - 48), Y = (v) => h - 30 - (v / mx) * (h - 50);
      ctx.strokeStyle = dark ? '#2c2a27' : '#e4dfd5'; ctx.beginPath(); ctx.moveTo(24, h - 30); ctx.lineTo(w - 24, h - 30); ctx.stroke();
      const curve = (v, col, fill) => {
        ctx.beginPath(); v.forEach((y, i) => (i ? ctx.lineTo(X(i), Y(y)) : ctx.moveTo(X(i), Y(y))));
        if (fill) { ctx.lineTo(X(N - 1), h - 30); ctx.lineTo(X(0), h - 30); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
        else { ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.stroke(); }
      };
      curve(prior, null, dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)');
      curve(nv, '#c0397a');
      curve(pv, '#e8962e');
      // report markers
      ctx.fillStyle = dark ? '#ece8e1' : '#1c1b19'; ctx.font = '600 11px Inter, sans-serif'; ctx.textAlign = 'center';
      for (let k = 0; k < n; k++) { const x = X0 + (k ? s * jitter[k] : 0); const px = 24 + (x / 100) * (w - 48); ctx.fillRect(px - 1, h - 30, 2, 8); }
      ctx.fillText(n > 1 ? `the witness + ${n - 1} echo${n > 2 ? 'es' : ''}` : 'the witness', 24 + (X0 / 100) * (w - 48), h - 8);
      const win = (v) => v.reduce((a, p, i) => a + (Math.abs(xs[i] - X0) <= 10 ? p : 0), 0);
      setRead(root, 'naiveW', fmtPct(win(nv)));
      setRead(root, 'pooledW', fmtPct(win(pv)));
      setRead(root, 'naiveB', klBits(nv, prior).toFixed(2) + ' bits');
      setRead(root, 'pooledB', klBits(pv, prior).toFixed(2) + ' bits');
    }
    $$('input', root).forEach((i) => i.addEventListener('input', draw));
    window.addEventListener('resize', draw);
    window.addEventListener('themechange', draw);
    draw();
  });

  /* ================================================================
     Lab: water-filling (optimal effort under exponential detection)
     ================================================================ */
  $$('[data-lab="waterfill"]').forEach((root) => {
    const c = $('canvas', root);
    const p = [0.22, 0.17, 0.13, 0.11, 0.09, 0.075, 0.06, 0.05, 0.04, 0.025, 0.02, 0.01];
    function solve(B, a) {
      // e_i = max(0, (ln p_i + ln a - ln mu)/a); find ln mu by bisection so that sum e_i = B
      let lo = Math.log(1e-12), hi = Math.log(Math.max(...p) * a);
      const tot = (lm) => p.reduce((s, pi) => s + Math.max(0, (Math.log(pi) + Math.log(a) - lm) / a), 0);
      for (let it = 0; it < 80; it++) { const mid = (lo + hi) / 2; if (tot(mid) > B) lo = mid; else hi = mid; }
      const lm = (lo + hi) / 2;
      const e = p.map((pi) => Math.max(0, (Math.log(pi) + Math.log(a) - lm) / a));
      return { e, mu: Math.exp(lm) };
    }
    function draw() {
      const B = +$('[name=B]', root).value, a = +$('[name=a]', root).value / 10;
      setOut(root, 'B', B + ' h'); setOut(root, 'a', a.toFixed(1) + ' /h');
      const { e, mu } = solve(B, a);
      const left = p.map((pi, i) => pi * Math.exp(-a * e[i]));
      const pf = 1 - left.reduce((s, v) => s + v, 0);
      const uni = p.reduce((s, pi) => s + pi * (1 - Math.exp(-a * (B / p.length))), 0);
      const greedy = p[0] * (1 - Math.exp(-a * B));
      const { ctx, w, h } = fitCanvas(c, 2.1);
      const dark = isDark();
      ctx.fillStyle = dark ? '#151514' : '#fbfaf7'; ctx.fillRect(0, 0, w, h);
      const n = p.length, gw = (w - 40) / n, top = 20, base = h - 70;
      const Y = (v) => base - (v / 0.24) * (base - top);
      for (let i = 0; i < n; i++) {
        const x = 20 + i * gw + gw * 0.15, bw = gw * 0.7;
        ctx.fillStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
        ctx.fillRect(x, Y(p[i]), bw, base - Y(p[i]));
        const [r, g, b] = ember(0.35 + 0.6 * (left[i] / 0.24) ** 0.6);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, Y(left[i]), bw, base - Y(left[i]));
        // effort bar below the axis
        ctx.fillStyle = 'rgba(120, 200, 255, 0.85)';
        const eh = Math.min(48, (e[i] / Math.max(1, B)) * 160);
        ctx.fillRect(x, base + 8, bw, eh);
      }
      // water level: remaining mass equalises at mu / a in every searched cell
      const lvl = mu / a;
      if (lvl < 0.24) {
        ctx.strokeStyle = '#7fd3ff'; ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(16, Y(lvl)); ctx.lineTo(w - 16, Y(lvl)); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = '#7fd3ff'; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
        ctx.fillText('water level μ/a', w - 18, Y(lvl) - 6);
      }
      ctx.strokeStyle = dark ? '#3b3834' : '#cfc8bb'; ctx.beginPath(); ctx.moveTo(16, base); ctx.lineTo(w - 16, base); ctx.stroke();
      ctx.fillStyle = dark ? '#a29b90' : '#6b665e'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('effort per cell (hours)', 20, h - 6);
      setRead(root, 'pf', fmtPct(pf));
      setRead(root, 'uni', fmtPct(uni));
      setRead(root, 'greedy', fmtPct(greedy));
      setRead(root, 'active', e.filter((v) => v > 1e-9).length + ' of ' + n);
    }
    $$('input', root).forEach((i) => i.addEventListener('input', draw));
    window.addEventListener('resize', draw);
    window.addEventListener('themechange', draw);
    draw();
  });

  /* ================================================================
     Lab: search to exhaustion (EV and the stopping point)
     ================================================================ */
  $$('[data-lab="exhaust"]').forEach((root) => {
    const c = $('canvas', root);
    const rng = mulberry(5);
    const cells = Array.from({ length: 40 }, (_, i) => Math.exp(-i / 9) * (0.7 + 0.6 * rng()));
    function draw() {
      const V = +$('[name=V]', root).value, cost = +$('[name=c]', root).value, d = +$('[name=d]', root).value / 100, a = +$('[name=a]', root).value / 100;
      setOut(root, 'V', '£' + V + 'm'); setOut(root, 'c', '£' + cost + 'k'); setOut(root, 'd', fmtPct(d, 0)); setOut(root, 'a', fmtPct(a, 0));
      const S = cells.reduce((s, v) => s + v, 0);
      const m = cells.map((v) => (a * v) / S); // unconditional mass in each cell; 1-a is outside the map
      const pts = [[0, 0, 0]];
      let pf = 0, spent = 0, stop = null;
      for (let k = 1; k <= 400; k++) {
        let b = 0; for (let i = 1; i < m.length; i++) if (m[i] > m[b]) b = i;
        const gain = m[b] * d;
        if (stop === null && gain * V * 1e6 < cost * 1e3) stop = k - 1;
        pf += gain; m[b] *= 1 - d; spent += cost / 1000;
        pts.push([spent, pf, V * pf - spent]);
      }
      if (stop === null) stop = 400;
      const { ctx, w, h } = fitCanvas(c, 2.1);
      const dark = isDark();
      ctx.fillStyle = dark ? '#151514' : '#fbfaf7'; ctx.fillRect(0, 0, w, h);
      const L = 48, R = w - 48, T = 18, Bm = h - 34;
      const maxX = pts[pts.length - 1][0];
      const evs = pts.map((q) => q[2]);
      const evMin = Math.min(0, ...evs), evMax = Math.max(...evs, 1e-6);
      const X = (x) => L + (x / maxX) * (R - L);
      const Yp = (y) => Bm - y * (Bm - T);
      const Ye = (y) => Bm - ((y - evMin) / (evMax - evMin)) * (Bm - T);
      ctx.strokeStyle = dark ? '#2c2a27' : '#e4dfd5'; ctx.lineWidth = 1;
      for (let g = 0; g <= 4; g++) { const yy = T + (g / 4) * (Bm - T); ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(R, yy); ctx.stroke(); }
      // asymptote a
      ctx.setLineDash([3, 4]); ctx.strokeStyle = '#a678d8'; ctx.beginPath(); ctx.moveTo(L, Yp(a)); ctx.lineTo(R, Yp(a)); ctx.stroke(); ctx.setLineDash([]);
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#e8962e'; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Yp(q[1])) : ctx.moveTo(X(q[0]), Yp(q[1])))); ctx.stroke();
      ctx.strokeStyle = '#3fae84'; ctx.beginPath(); pts.forEach((q, i) => (i ? ctx.lineTo(X(q[0]), Ye(q[2])) : ctx.moveTo(X(q[0]), Ye(q[2])))); ctx.stroke();
      const sp = pts[stop];
      ctx.strokeStyle = dark ? '#ece8e1' : '#1c1b19'; ctx.lineWidth = 1; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(X(sp[0]), T); ctx.lineTo(X(sp[0]), Bm); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#3fae84'; ctx.beginPath(); ctx.arc(X(sp[0]), Ye(sp[2]), 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = dark ? '#a29b90' : '#6b665e'; ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left'; ctx.fillText('P(find) — left axis', L, 12);
      ctx.textAlign = 'right'; ctx.fillText('net EV — right axis', R, 12);
      ctx.textAlign = 'center'; ctx.fillText('cumulative spend (£m)', (L + R) / 2, h - 8);
      ctx.textAlign = 'right'; ctx.fillText('0%', L - 6, Bm + 4); ctx.fillText('100%', L - 6, T + 4);
      ctx.textAlign = 'left'; ctx.fillText('£' + evMax.toFixed(1) + 'm', R + 6, T + 4); ctx.fillText('£' + evMin.toFixed(1) + 'm', R + 6, Bm + 4);
      ctx.textAlign = 'left'; ctx.fillText(maxX.toFixed(1), R - 20, Bm + 16);
      setRead(root, 'stop', stop + ' passes');
      setRead(root, 'pf', fmtPct(sp[1]));
      setRead(root, 'ev', '£' + sp[2].toFixed(2) + 'm');
      setRead(root, 'spent', '£' + sp[0].toFixed(2) + 'm');
    }
    $$('input', root).forEach((i) => i.addEventListener('input', draw));
    window.addEventListener('resize', draw);
    window.addEventListener('themechange', draw);
    draw();
  });

  /* ================================================================
     Lab: Kelvin wake + the SAR azimuth shift
     ================================================================ */
  $$('[data-lab="kelvin"]').forEach((root) => {
    const c = $('canvas', root);
    let t0 = performance.now(), running = false, raf = 0;
    function frame(now) {
      const kn = +$('[name=u]', root).value, hd = +$('[name=hd]', root).value;
      const U = kn * 0.5144;
      const lam = (2 * Math.PI * U * U) / G;
      setOut(root, 'u', kn + ' kn'); setOut(root, 'hd', hd + '°');
      const { ctx, w, h } = fitCanvas(c, 1.9);
      ctx.fillStyle = '#0f1112'; ctx.fillRect(0, 0, w, h);
      // speckle-like sea
      const rng = mulberry(3);
      for (let k = 0; k < 900; k++) { ctx.fillStyle = `rgba(255,255,255,${0.02 + 0.05 * rng()})`; ctx.fillRect(rng() * w, rng() * h, 1.5, 1.5); }
      // geometry: metres to pixels so the scene spans ~ 1.4 km
      const span = 3000, px = w / span;
      const shipX = w * 0.84, shipY = h * 0.8;
      // wake crest lines (stationary phase): x = -C cos t (1 + sin^2 t), y = C cos^2 t sin t, C = n * lambda
      ctx.save(); ctx.translate(shipX, shipY);
      const phase = ((now - t0) / 1000) * (U / lam); // crests move with the ship; we slide them for life
      for (let n = 1; n < 80; n++) {
        const C = (n - (phase % 1)) * lam * px;
        if (C <= 0 || C > w * 1.2) continue;
        ctx.beginPath();
        for (let s = -1; s <= 1.0001; s += 0.01) {
          const t = s * (Math.PI / 2);
          const x = -C * Math.cos(t) * (1 + Math.sin(t) ** 2), y = C * Math.cos(t) ** 2 * Math.sin(t);
          s === -1 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(230, 240, 245, ${0.65 * Math.exp(-(C / (w * 0.55)))})`; ctx.lineWidth = 1.2; ctx.stroke();
      }
      // Kelvin arms at 19.47 degrees
      const arm = (19.47 * Math.PI) / 180, Lr = w;
      ctx.strokeStyle = 'rgba(232,150,46,0.9)'; ctx.setLineDash([5, 5]); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-Lr * Math.cos(arm), Lr * Math.sin(arm)); ctx.moveTo(0, 0); ctx.lineTo(-Lr * Math.cos(arm), -Lr * Math.sin(arm)); ctx.stroke(); ctx.setLineDash([]);
      // turbulent wake: dark trailing band
      const grd = ctx.createLinearGradient(0, 0, -w, 0);
      grd.addColorStop(0, 'rgba(0,0,0,0.75)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd; ctx.fillRect(-w, -6, w, 12);
      // the ship as the wake sees it
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(0, 0, 60 * px + 6, 9 * px + 3, 0, 0, 7); ctx.fill();
      ctx.restore();
      // the SAR echo: displaced along azimuth (vertical here) by (R/V) * U_r
      const RV = 115; // slant range / platform speed, seconds (Sentinel-1 IW, roughly)
      const ur = U * Math.cos((hd * Math.PI) / 180); // velocity component along the range direction
      const shift = RV * ur * Math.sin((37 * Math.PI) / 180); // metres; line-of-sight share at ~37° incidence
      const ey = shipY - shift * px;
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(shipX, shipY); ctx.lineTo(shipX, ey); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.ellipse(shipX, clamp(ey, 6, h - 6), 60 * px + 5, 9 * px + 3, 0, 0, 7); ctx.fill(); ctx.shadowBlur = 0;
      ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.fillStyle = '#fcd25c'; ctx.textAlign = 'right';
      ctx.fillText('SAR echo', shipX - 12, clamp(ey, 14, h - 10) - 8);
      ctx.fillStyle = 'rgba(241,237,230,0.7)'; ctx.fillText('true position (wake apex)', shipX - 12, shipY + 22);
      ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(241,237,230,0.55)'; ctx.fillText('azimuth ↑   range →   500 m', 12, 20);
      ctx.fillStyle = 'rgba(241,237,230,0.85)'; ctx.fillRect(12 + 128, 16, 500 * px, 2);
      setRead(root, 'lam', lam.toFixed(1) + ' m');
      setRead(root, 'ms', U.toFixed(2) + ' m/s');
      setRead(root, 'shift', Math.abs(shift).toFixed(0) + ' m');
      setRead(root, 'angle', '19.47°');
      if (running) raf = requestAnimationFrame(frame);
    }
    $$('input', root).forEach((i) => i.addEventListener('input', () => { if (!running) frame(performance.now()); }));
    window.addEventListener('resize', () => frame(performance.now()));
    frame(performance.now());
    if (!reduced) onVisible(c, () => { if (!running) { running = true; raf = requestAnimationFrame(frame); } }, () => { running = false; cancelAnimationFrame(raf); });
  });

  /* ================================================================
     Lab: impact ring waves (Cauchy–Poisson), the dispersive clock
     ================================================================ */
  $$('[data-lab="splash"]').forEach((root) => {
    const c = $('canvas', root), prof = $('canvas.profile', root);
    let running = false, raf = 0, t = 20, lastTs = 0;
    const play = $('[data-act=play]', root);
    function eta(r, tt, Ls) {
      // stationary-phase Cauchy–Poisson: phase g t^2 / 4r, local wavenumber k = g t^2 / 4r^2,
      // a finite source of size L suppresses k L >> 1 (shortest waves near the centre)
      const k = (G * tt * tt) / (4 * r * r);
      const env = (tt * tt) / Math.pow(r + 25, 3) * Math.exp(-0.5 * (k * Ls) ** 2);
      return env * Math.cos((G * tt * tt) / (4 * r));
    }
    function draw() {
      const Ls = +$('[name=L]', root).value, sea = +$('[name=sea]', root).value / 100;
      t = +$('[name=t]', root).value;
      setOut(root, 't', t.toFixed(0) + ' s'); setOut(root, 'L', Ls + ' m'); setOut(root, 'sea', fmtPct(sea, 0));
      const span = 2 * Math.max(600, 1.2 * 0.5 * Math.sqrt(G * Ls) * t * 1.6); // metres across
      const { ctx, w, h } = fitCanvas(c, 1.6);
      const nx = Math.round(w / 2.2), ny = Math.round(h / 2.2);
      const img = ctx.createImageData(nx, ny);
      const rng = mulberry(9);
      // ambient sea: a few random long-crested wave trains
      const waves = Array.from({ length: 7 }, () => ({ k: (2 * Math.PI) / (30 + 70 * rng()), a: rng() * Math.PI * 2, ph: rng() * 7 }));
      let mx = 0;
      const field = new Float32Array(nx * ny);
      const rPeak = 0.5 * Math.sqrt(G * Ls) * t;
      const norm = Math.abs(eta(Math.max(rPeak, 20), t, Ls)) || 1;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = (i / nx - 0.5) * span, y = (j / ny - 0.5) * span * (ny / nx);
        const r = Math.hypot(x, y) + 1e-6;
        let v = eta(r, t, Ls) / norm;
        let amb = 0;
        for (const wv of waves) amb += Math.cos(wv.k * (x * Math.cos(wv.a) + y * Math.sin(wv.a)) + wv.ph);
        v += sea * 0.45 * amb;
        field[j * nx + i] = v; mx = Math.max(mx, Math.abs(v));
      }
      for (let q = 0; q < nx * ny; q++) {
        const v = 0.5 + 0.5 * field[q] / mx;
        const g = Math.round(20 + 200 * v);
        img.data[q * 4] = g * 0.92; img.data[q * 4 + 1] = g * 0.95; img.data[q * 4 + 2] = g; img.data[q * 4 + 3] = 255;
      }
      const off = document.createElement('canvas'); off.width = nx; off.height = ny; off.getContext('2d').putImageData(img, 0, 0);
      ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, w, h);
      // ring at the group-speed radius of the dominant waves (k ~ 1/L)
      const rp = (rPeak / span) * w;
      ctx.strokeStyle = 'rgba(232,150,46,0.9)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(w / 2, h / 2, rp, 0, 7); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.fillStyle = '#fcd25c'; ctx.textAlign = 'left';
      ctx.fillText(`ring ≈ ${rPeak.toFixed(0)} m`, w / 2 + rp * 0.72 + 6, h / 2 - rp * 0.72);
      ctx.fillStyle = 'rgba(241,237,230,0.6)'; ctx.fillText(`${Math.round(span)} m across`, 12, h - 12);
      // radial profile with the local wavelength
      if (prof) {
        const P = fitCanvas(prof, 4.2);
        const pc = P.ctx;
        pc.fillStyle = '#121211'; pc.fillRect(0, 0, P.w, P.h);
        const rMax = span / 2;
        pc.strokeStyle = '#e8962e'; pc.lineWidth = 1.6; pc.beginPath();
        for (let q = 0; q <= 600; q++) {
          const r = 5 + (q / 600) * rMax;
          const v = eta(r, t, Ls) / norm;
          const X = (q / 600) * P.w, Y = P.h / 2 - clamp(v, -1.4, 1.4) * (P.h * 0.32);
          q ? pc.lineTo(X, Y) : pc.moveTo(X, Y);
        }
        pc.stroke();
        pc.fillStyle = 'rgba(241,237,230,0.6)'; pc.font = '11px "JetBrains Mono", monospace';
        pc.fillText('surface height along a radius → (long waves lead, short waves trail)', 10, 14);
      }
      const lamAt = (r) => (8 * Math.PI * r * r) / (G * t * t);
      setRead(root, 'r', rPeak.toFixed(0) + ' m');
      setRead(root, 'lam', lamAt(rPeak).toFixed(0) + ' m');
      setRead(root, 'lam2', lamAt(rPeak * 1.5).toFixed(0) + ' m');
      setRead(root, 'cg', (0.5 * Math.sqrt(G * Ls)).toFixed(1) + ' m/s');
    }
    function loop(ts) {
      if (!running) return;
      if (ts - lastTs > 60) {
        const el = $('[name=t]', root); let v = +el.value + 2; if (v > +el.max) v = +el.min; el.value = v; draw(); lastTs = ts;
      }
      raf = requestAnimationFrame(loop);
    }
    play.addEventListener('click', () => { running = !running; play.classList.toggle('on', running); play.textContent = running ? 'Pause' : 'Play time'; if (running) raf = requestAnimationFrame(loop); });
    $$('input', root).forEach((i) => i.addEventListener('input', draw));
    window.addEventListener('resize', draw);
    draw();
  });

  /* ================================================================
     Lab: hydrophone TDOA localisation with the correlated-reference covariance
     ================================================================ */
  $$('[data-lab="tdoa"]').forEach((root) => {
    const c = $('canvas', root);
    const KM = 400; // scene width in km
    const C = 1.485; // km/s
    const st = [[60, 70], [330, 50], [360, 210], [80, 220]];
    let src = [210, 140], noise, rng = mulberry(12), drag = false;
    const reroll = () => { noise = st.map(() => randn(rng)); };
    reroll();
    function measured(sig, bad) {
      const t = st.map((s, k) => Math.hypot(src[0] - s[0], src[1] - s[1]) / C + sig * noise[k] + (bad && k === 2 ? 1.5 : 0));
      return t.slice(1).map((v) => v - t[0]);
    }
    function draw() {
      const sig = +$('[name=sig]', root).value / 100, bad = $('[name=bad]', root).checked;
      setOut(root, 'sig', sig.toFixed(2) + ' s');
      const { ctx, w, h } = fitCanvas(c, 1.6);
      const H = (KM * h) / w;
      const nx = 160, ny = Math.round((nx * h) / w);
      const m = st.length - 1;
      const dt = measured(sig, bad);
      // Sigma = s^2 (I + J): each difference shares the reference station's error. Inverse by Sherman–Morrison.
      const s2 = sig * sig + 1e-6;
      const ll = new Float64Array(nx * ny);
      let best = -Infinity, bi = 0;
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = ((i + 0.5) / nx) * KM, y = ((j + 0.5) / ny) * H;
        const t0 = Math.hypot(x - st[0][0], y - st[0][1]) / C;
        let sum = 0, sq = 0;
        for (let k = 1; k <= m; k++) { const rk = dt[k - 1] - (Math.hypot(x - st[k][0], y - st[k][1]) / C - t0); sum += rk; sq += rk * rk; }
        const q = (sq - (sum * sum) / (1 + m)) / s2;
        ll[j * nx + i] = -0.5 * q;
        if (ll[j * nx + i] > best) { best = ll[j * nx + i]; bi = j * nx + i; }
      }
      // display only: each pair's hyperbola as a glowing band (residual within a few seconds), brightest where all agree
      const f = new Float32Array(nx * ny);
      const tau = Math.max(1.5, 3 * sig);
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        const x = ((i + 0.5) / nx) * KM, y = ((j + 0.5) / ny) * H;
        const t0 = Math.hypot(x - st[0][0], y - st[0][1]) / C;
        let acc = 0;
        for (let k = 1; k <= m; k++) { const rk = dt[k - 1] - (Math.hypot(x - st[k][0], y - st[k][1]) / C - t0); acc += Math.exp(-0.5 * (rk / tau) ** 2); }
        f[j * nx + i] = Math.pow(acc / m, 1.6);
      }
      ctx.fillStyle = '#0f0f0f'; ctx.fillRect(0, 0, w, h);
      heat(ctx, f, nx, ny, 0, 0, w, h);
      const sx = w / KM;
      // hyperbolae: where the model difference equals the measured one
      for (let k = 1; k <= m; k++) {
        ctx.fillStyle = ['rgba(127,211,255,0.9)', 'rgba(166,120,216,0.95)', 'rgba(63,174,132,0.95)'][k - 1];
        for (let j = 0; j < ny * 2; j++) for (let i = 0; i < nx * 2; i++) {
          const x = ((i + 0.5) / (nx * 2)) * KM, y = ((j + 0.5) / (ny * 2)) * H;
          const d = Math.hypot(x - st[k][0], y - st[k][1]) / C - Math.hypot(x - st[0][0], y - st[0][1]) / C - dt[k - 1];
          if (Math.abs(d) < 0.18) ctx.fillRect(x * sx - 0.8, y * sx - 0.8, 1.6, 1.6);
        }
      }
      // stations
      st.forEach((s, k) => {
        ctx.fillStyle = k === 0 ? '#fcd25c' : '#ece8e1';
        ctx.beginPath(); ctx.moveTo(s[0] * sx, s[1] * sx - 7); ctx.lineTo(s[0] * sx + 6, s[1] * sx + 5); ctx.lineTo(s[0] * sx - 6, s[1] * sx + 5); ctx.closePath(); ctx.fill();
        ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.fillText(k === 0 ? 'H1 (ref)' : 'H' + (k + 1), s[0] * sx + 8, s[1] * sx - 6);
      });
      // refine the grid optimum with a shrinking pattern search on the exact quadratic form
      const qf = (x, y) => {
        const t0 = Math.hypot(x - st[0][0], y - st[0][1]) / C;
        let sum = 0, sq = 0;
        for (let k = 1; k <= m; k++) { const rk = dt[k - 1] - (Math.hypot(x - st[k][0], y - st[k][1]) / C - t0); sum += rk; sq += rk * rk; }
        return (sq - (sum * sum) / (1 + m)) / s2;
      };
      let fx = ((bi % nx) + 0.5) / nx * KM, fy = (Math.floor(bi / nx) + 0.5) / ny * H, fq = qf(fx, fy);
      for (let step = KM / nx; step > 0.002; step *= 0.5) {
        let moved = true;
        while (moved) {
          moved = false;
          for (const [ddx, ddy] of [[step, 0], [-step, 0], [0, step], [0, -step], [step, step], [-step, -step], [step, -step], [-step, step]]) {
            const v = qf(fx + ddx, fy + ddy);
            if (v < fq) { fq = v; fx += ddx; fy += ddy; moved = true; }
          }
        }
      }
      best = -0.5 * fq;
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(fx * sx, fy * sx, 7, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(fx * sx - 11, fy * sx); ctx.lineTo(fx * sx + 11, fy * sx); ctx.moveTo(fx * sx, fy * sx - 11); ctx.lineTo(fx * sx, fy * sx + 11); ctx.stroke();
      ctx.fillStyle = '#3fae84'; ctx.beginPath(); ctx.arc(src[0] * sx, src[1] * sx, 4, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(241,237,230,0.6)'; ctx.font = '11px "JetBrains Mono", monospace'; ctx.fillText('drag the green source · 100 km', 10, h - 10);
      ctx.fillRect(250, h - 14, 100 * sx, 2);
      // chi-square consistency: m differences, 2 unknowns -> m - 2 degrees of freedom
      const chi = -2 * best;
      const dof = m - 2;
      const pval = dof === 1 ? erfc(Math.sqrt(chi / 2)) : Math.exp(-chi / 2);
      setRead(root, 'err', Math.hypot(fx - src[0], fy - src[1]).toFixed(1) + ' km');
      setRead(root, 'chi', chi.toFixed(2));
      setRead(root, 'p', pval < 0.001 ? '< 0.001 ⚠' : pval.toFixed(3));
    }
    function erfc(x) { const z = Math.abs(x), t = 1 / (1 + 0.5 * z); const r = t * Math.exp(-z * z - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418 + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))))); return x >= 0 ? r : 2 - r; }
    const pos = (e) => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * KM, ((e.clientY - r.top) / r.width) * KM]; };
    c.addEventListener('pointerdown', (e) => { drag = true; c.setPointerCapture(e.pointerId); src = pos(e); draw(); });
    c.addEventListener('pointermove', (e) => { if (drag) { src = pos(e); draw(); } });
    c.addEventListener('pointerup', () => { drag = false; });
    $$('input', root).forEach((i) => i.addEventListener('input', draw));
    $('[data-act=roll]', root).addEventListener('click', () => { reroll(); draw(); });
    window.addEventListener('resize', draw);
    draw();
  });

  /* ================================================================
     Lab: track gap → reachable ellipse
     ================================================================ */
  $$('[data-lab="gap"]').forEach((root) => {
    const c = $('canvas', root);
    const KM = 300;
    let A = [90, 120], B = [190, 95], drag = null;
    function draw() {
      const gap = +$('[name=gap]', root).value, v = +$('[name=v]', root).value;
      setOut(root, 'gap', gap + ' h'); setOut(root, 'v', v + ' kn');
      const { ctx, w, h } = fitCanvas(c, 1.9);
      const sx = w / KM;
      const dark = isDark();
      ctx.fillStyle = '#121413'; ctx.fillRect(0, 0, w, h);
      // faint graticule
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      for (let x = 0; x < KM; x += 25) { ctx.beginPath(); ctx.moveTo(x * sx, 0); ctx.lineTo(x * sx, h); ctx.stroke(); }
      for (let y = 0; y < KM; y += 25) { ctx.beginPath(); ctx.moveTo(0, y * sx); ctx.lineTo(w, y * sx); ctx.stroke(); }
      const budget = v * 1.852 * gap; // km
      const dAB = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const ok = budget >= dAB;
      if (ok) {
        const a = budget / 2, cfo = dAB / 2, b = Math.sqrt(Math.max(0, a * a - cfo * cfo));
        const cx = (A[0] + B[0]) / 2, cy = (A[1] + B[1]) / 2, ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
        const g = ctx.createRadialGradient(cx * sx, cy * sx, 0, cx * sx, cy * sx, a * sx);
        g.addColorStop(0, 'rgba(232,150,46,0.32)'); g.addColorStop(1, 'rgba(179,54,122,0.12)');
        ctx.fillStyle = g; ctx.strokeStyle = '#e8962e'; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.ellipse(cx * sx, cy * sx, a * sx, Math.max(0.5, b * sx), ang, 0, 7); ctx.fill(); ctx.stroke();
        setRead(root, 'area', (Math.PI * a * b).toFixed(0) + ' km²');
        setRead(root, 'axes', (2 * a).toFixed(0) + ' × ' + (2 * b).toFixed(0) + ' km');
      } else {
        setRead(root, 'area', '—'); setRead(root, 'axes', '—');
      }
      ctx.strokeStyle = ok ? 'rgba(255,255,255,0.5)' : '#ff5a5a'; ctx.setLineDash([4, 4]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(A[0] * sx, A[1] * sx); ctx.lineTo(B[0] * sx, B[1] * sx); ctx.stroke(); ctx.setLineDash([]);
      [[A, 'last fix before silence'], [B, 'first fix after']].forEach(([P, t]) => {
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(P[0] * sx, P[1] * sx, 6, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(241,237,230,0.8)'; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.fillText(t, P[0] * sx + 10, P[1] * sx - 8);
      });
      if (!ok) { ctx.fillStyle = '#ff7a7a'; ctx.font = '700 13px Inter, sans-serif'; ctx.fillText('IMPOSSIBLE JUMP at this speed: spoofing, or a wrong speed cap', 14, 22); }
      ctx.fillStyle = 'rgba(241,237,230,0.55)'; ctx.font = '11px "JetBrains Mono", monospace'; ctx.fillText('drag either fix · 50 km', 12, h - 10);
      ctx.fillRect(180, h - 14, 50 * sx, 2);
      setRead(root, 'need', (dAB / 1.852 / gap).toFixed(1) + ' kn');
      setRead(root, 'verdict', ok ? 'possible' : 'impossible');
      void dark;
    }
    const pos = (e) => { const r = c.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * KM, ((e.clientY - r.top) / r.width) * KM]; };
    c.addEventListener('pointerdown', (e) => { const q = pos(e); drag = Math.hypot(q[0] - A[0], q[1] - A[1]) < Math.hypot(q[0] - B[0], q[1] - B[1]) ? 'A' : 'B'; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => { if (!drag) return; const q = pos(e); if (drag === 'A') A = q; else B = q; draw(); });
    c.addEventListener('pointerup', () => { drag = null; });
    $$('input', root).forEach((i) => i.addEventListener('input', draw));
    window.addEventListener('resize', draw);
    draw();
  });

  /* ================================================================
     Lab: Wilson interval — what "calibrated" buys you
     ================================================================ */
  $$('[data-lab="wilson"]').forEach((root) => {
    const c = $('canvas', root);
    function wilson(k, n, z) {
      if (n === 0) return [0, 1];
      const ph = k / n, z2 = z * z, den = 1 + z2 / n;
      const ctr = (ph + z2 / (2 * n)) / den, half = (z * Math.sqrt((ph * (1 - ph)) / n + z2 / (4 * n * n))) / den;
      return [Math.max(0, ctr - half), Math.min(1, ctr + half)];
    }
    function draw() {
      const n = +$('[name=n]', root).value;
      const kEl = $('[name=k]', root);
      kEl.max = n; if (+kEl.value > n) kEl.value = n;
      const k = +kEl.value, thr = +$('[name=thr]', root).value / 100;
      setOut(root, 'n', n); setOut(root, 'k', k); setOut(root, 'thr', fmtPct(thr, 0));
      const [lo, hi] = wilson(k, n, 1.959964);
      const { ctx, w, h } = fitCanvas(c, 5);
      const dark = isDark();
      ctx.fillStyle = dark ? '#151514' : '#fbfaf7'; ctx.fillRect(0, 0, w, h);
      const X = (v) => 16 + v * (w - 32), y = h / 2;
      ctx.strokeStyle = dark ? '#3b3834' : '#cfc8bb'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(X(0), y); ctx.lineTo(X(1), y); ctx.stroke();
      ctx.fillStyle = dark ? '#a29b90' : '#6b665e'; ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      for (let g = 0; g <= 10; g += 2) { ctx.fillText(g * 10 + '%', X(g / 10), y + 26); ctx.fillRect(X(g / 10) - 0.5, y - 4, 1, 8); }
      ctx.strokeStyle = '#e8962e'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X(lo), y); ctx.lineTo(X(hi), y); ctx.stroke(); ctx.lineCap = 'butt';
      ctx.fillStyle = dark ? '#ece8e1' : '#1c1b19'; ctx.beginPath(); ctx.arc(X(n ? k / n : 0.5), y, 5, 0, 7); ctx.fill();
      ctx.strokeStyle = '#b3367a'; ctx.lineWidth = 2; ctx.setLineDash([4, 3]); ctx.beginPath(); ctx.moveTo(X(thr), y - 22); ctx.lineTo(X(thr), y + 12); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#b3367a'; ctx.fillText('gate', X(thr), y - 26);
      setRead(root, 'phat', n ? fmtPct(k / n) : '—');
      setRead(root, 'ci', fmtPct(lo) + ' – ' + fmtPct(hi));
      setRead(root, 'gate', lo >= thr ? 'passes: may flag' : 'fails: context only');
    }
    $$('input', root).forEach((i) => i.addEventListener('input', draw));
    window.addEventListener('resize', draw);
    window.addEventListener('themechange', draw);
    draw();
  });
  /* ================================================================
     Lab: "not here, 5%" — minimum-KL area statement on a 10 x 10 grid
     ================================================================ */
  $$('[data-lab="region"]').forEach((root) => {
    const c = $('canvas', root);
    const n = 10;
    const prior = (() => { const p = []; let s = 0; for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const v = 0.02 + gauss2(i, j, 3, 3, 2, 1.8) + 0.8 * gauss2(i, j, 7, 6.5, 1.6, 2.2); p.push(v); s += v; } return p.map((v) => v / s); })();
    let region = new Set([33, 34, 43, 44, 23, 24, 32, 42, 22]);
    function draw() {
      const q = +$('[name=q]', root).value / 100;
      setOut(root, 'q', fmtPct(q, 0));
      const p = [...region].reduce((a, i) => a + prior[i], 0);
      const post = prior.map((v, i) => (region.size === 0 || region.size === n * n ? v : region.has(i) ? (v * q) / p : (v * (1 - q)) / (1 - p)));
      const D = region.size && region.size < n * n ? q * Math.log2(q / p) + (1 - q) * Math.log2((1 - q) / (1 - p)) : 0;
      const { ctx, w, h } = fitCanvas(c, 1);
      const mx = Math.max(...prior, ...post);
      const cw = w / n;
      for (let i = 0; i < n * n; i++) {
        const [r, g, b] = ember(Math.pow(post[i] / mx, 0.6));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect((i % n) * cw, Math.floor(i / n) * cw, cw - 1, cw - 1);
      }
      ctx.strokeStyle = '#fcd25c'; ctx.lineWidth = 2;
      region.forEach((i) => ctx.strokeRect((i % n) * cw + 1.5, Math.floor(i / n) * cw + 1.5, cw - 4, cw - 4));
      setRead(root, 'p', fmtPct(p));
      setRead(root, 'D', D.toFixed(3) + ' bits');
      setRead(root, 'k', region.size + ' / ' + n * n);
      setRead(root, 'in', region.size ? 'cells ×' + (q / p).toFixed(2) : '—');
      setRead(root, 'out', region.size ? 'cells ×' + ((1 - q) / (1 - p)).toFixed(2) : '—');
    }
    c.addEventListener('click', (e) => {
      const r = c.getBoundingClientRect();
      const i = Math.floor(((e.clientX - r.left) / r.width) * n), j = Math.floor(((e.clientY - r.top) / r.height) * n);
      const k = j * n + i;
      if (region.has(k)) region.delete(k); else region.add(k);
      draw();
    });
    $$('input', root).forEach((i) => i.addEventListener('input', draw));
    $('[data-act=clear]', root).addEventListener('click', () => { region = new Set(); draw(); });
    window.addEventListener('resize', draw);
    draw();
  });

  /* ================================================================
     Lab: absence assurance — how many clean visits?
     ================================================================ */
  $$('[data-lab="absence"]').forEach((root) => {
    const c = $('canvas', root);
    function draw() {
      const psi = +$('[name=psi]', root).value / 100, d = +$('[name=d]', root).value / 100, conf = +$('[name=conf]', root).value / 100;
      setOut(root, 'psi', fmtPct(psi, 0)); setOut(root, 'd', fmtPct(d, 0)); setOut(root, 'conf', fmtPct(conf, 0));
      const K = 20;
      const post = Array.from({ length: K + 1 }, (_, k) => (psi * (1 - d) ** k) / (1 - psi + psi * (1 - d) ** k));
      const need = post.findIndex((v) => v <= 1 - conf);
      const { ctx, w, h } = fitCanvas(c, 2.6);
      const dark = isDark();
      ctx.fillStyle = dark ? '#151514' : '#fbfaf7'; ctx.fillRect(0, 0, w, h);
      const bw = (w - 30) / (K + 1), base = h - 22;
      ctx.strokeStyle = '#b3367a'; ctx.setLineDash([4, 3]);
      const ty = base - (1 - conf) * (base - 10);
      ctx.beginPath(); ctx.moveTo(10, ty); ctx.lineTo(w - 10, ty); ctx.stroke(); ctx.setLineDash([]);
      post.forEach((v, k) => {
        const x = 15 + k * bw, bh = v * (base - 10);
        ctx.fillStyle = k === need ? '#e8962e' : (dark ? 'rgba(236,232,225,0.28)' : 'rgba(28,27,25,0.22)');
        ctx.fillRect(x + 2, base - bh, bw - 4, bh);
        if (k % 2 === 0) { ctx.fillStyle = dark ? '#a29b90' : '#6b665e'; ctx.font = '10px "JetBrains Mono", monospace'; ctx.textAlign = 'center'; ctx.fillText(k, x + bw / 2, h - 6); }
      });
      setRead(root, 'need', need >= 0 ? need + ' visits' : '> ' + K);
      setRead(root, 'five', fmtPct(post[5]));
      setRead(root, 'lr', 'each miss ×' + (1 - d).toFixed(2));
    }
    $$('input', root).forEach((i) => i.addEventListener('input', draw));
    window.addEventListener('resize', draw);
    window.addEventListener('themechange', draw);
    draw();
  });

  /* ================================================================
     Lab: lineage collapse — a healthy ESS hiding a dead particle filter
     ================================================================ */
  $$('[data-lab="lineage"]').forEach((root) => {
    const c = $('canvas', root);
    function run(T, seed, N) {
      const rng = mulberry(seed * 7919 + 13);
      // a deliberately ambiguous problem: the observations are consistent with two routes
      // (theta near 0.2 = "north", near 0.8 = "south"), as range rings are with a mirrored path
      let th = Array.from({ length: N }, () => rng());
      let root0 = th.map((_, i) => i);
      const hist = [root0.slice()];
      const parents = [];
      let essPre = N;
      for (let t = 0; t < T; t++) {
        th = th.map((v) => clamp(v + 0.006 * randn(rng), 0, 1));
        const y = 0.3;
        const lw = th.map((v) => -0.5 * ((Math.abs(v - 0.5) - y) / 0.02) ** 2);
        const m = Math.max(...lw);
        const wts = lw.map((v) => Math.exp(v - m));
        const S = wts.reduce((a, b) => a + b, 0);
        const wn = wts.map((v) => v / S);
        essPre = 1 / wn.reduce((a, b) => a + b * b, 0);
        const cdf = []; let acc = 0; for (const v of wn) { acc += v; cdf.push(acc); }
        const par = []; const nt = [], nr = [];
        for (let i = 0; i < N; i++) { const u = rng(); let k = 0; while (k < N - 1 && cdf[k] < u) k++; par.push(k); nt.push(th[k]); nr.push(root0[k]); }
        th = nt; root0 = nr; parents.push(par); hist.push(root0.slice());
      }
      const roots = new Set(root0).size;
      const south = th.filter((v) => v > 0.5).length / N;
      return { hist, parents, roots, south, essPre, init: hist[0].map((_, i) => i) };
    }
    function draw() {
      const T = +$('[name=T]', root).value, seed = +$('[name=seed]', root).value, N = +$('[name=N]', root).value;
      setOut(root, 'T', T + ' pings'); setOut(root, 'seed', '#' + seed); setOut(root, 'N', N);
      const r = run(T, seed, N);
      const { ctx, w, h } = fitCanvas(c, 2.2);
      ctx.fillStyle = '#111110'; ctx.fillRect(0, 0, w, h);
      const X = (t) => 30 + (t / Math.max(1, T)) * (w - 60), Y = (i) => 14 + (i / (N - 1)) * (h - 40);
      const finalRoots = new Set(r.hist[T]);
      const rngInit = mulberry(seed * 7919 + 13);
      const theta0 = Array.from({ length: N }, () => rngInit());
      // order ancestors by starting route so southern lineages stack on top
      const order = Array.from({ length: N }, (_, i) => i).sort((u, v) => theta0[v] - theta0[u]);
      const counts = r.hist.map((row) => { const c = new Float64Array(N); row.forEach((rt) => c[rt]++); return c; });
      const top = 14, bot = h - 28, span = bot - top;
      const edges = counts.map((c) => { const e = new Float64Array(N + 1); let acc = 0; order.forEach((rt, k) => { e[k] = acc; acc += c[rt] / N; }); e[N] = acc; return e; });
      order.forEach((rt, k) => {
        const alive = finalRoots.has(rt);
        ctx.fillStyle = alive ? (theta0[rt] > 0.5 ? 'rgba(240,150,46,0.88)' : 'rgba(166,120,216,0.9)') : 'rgba(255,255,255,0.10)';
        ctx.beginPath();
        for (let t = 0; t <= T; t++) ctx.lineTo(X(t), top + edges[t][k] * span);
        for (let t = T; t >= 0; t--) ctx.lineTo(X(t), top + edges[t][k + 1] * span);
        ctx.closePath(); ctx.fill();
        if (alive) { ctx.strokeStyle = 'rgba(17,17,16,0.9)'; ctx.lineWidth = 0.8; ctx.stroke(); }
      });
      for (let t = 0; t <= T; t++) { ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.beginPath(); ctx.moveTo(X(t), top); ctx.lineTo(X(t), bot); ctx.stroke(); }
      ctx.fillStyle = 'rgba(241,237,230,0.75)'; ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
      ctx.fillText('south lineages', w - 34, top + 14); ctx.fillText('north lineages', w - 34, bot - 6);
      ctx.fillStyle = 'rgba(241,237,230,0.6)'; ctx.font = '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'left'; ctx.fillText('start', 22, h - 8); ctx.textAlign = 'right'; ctx.fillText('after ping ' + T, w - 22, h - 8);
      setRead(root, 'roots', r.roots + ' of ' + N);
      setRead(root, 'south', fmtPct(r.south, 0));
      setRead(root, 'ess', '100% (by construction)');
      setRead(root, 'pre', fmtPct(r.essPre / N, 0));
    }
    $$('input', root).forEach((i) => i.addEventListener('input', draw));
    window.addEventListener('resize', draw);
    draw();
  });

  /* ================================================================
     Lab: colour ramps over the sea
     ================================================================ */
  $$('[data-lab="ramp"]').forEach((root) => {
    const c = $('canvas', root), lc = $('canvas.lum', root);
    const jet = (t) => [clamp(1.5 - Math.abs(4 * t - 3), 0, 1) * 255, clamp(1.5 - Math.abs(4 * t - 2), 0, 1) * 255, clamp(1.5 - Math.abs(4 * t - 1), 0, 1) * 255];
    const VIR = [[68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142], [31, 158, 137], [53, 183, 121], [110, 206, 88], [181, 222, 43], [253, 231, 37]];
    const viridis = (t) => { const x = clamp(t, 0, 1) * (VIR.length - 1); const k = Math.min(VIR.length - 2, Math.floor(x)); const u = x - k; return VIR[k].map((v, j) => v + (VIR[k + 1][j] - v) * u); };
    const ramps = { ember, jet, viridis };
    let which = 'jet', bg = 'navy';
    const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    const Lstar = ([r, g, b]) => { const Y = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); return Y > 0.008856 ? 116 * Math.cbrt(Y) - 16 : 903.3 * Y; };
    const nx = 120, ny = 70;
    const field = (() => { const f = new Float32Array(nx * ny); const rng = mulberry(21); const bumps = Array.from({ length: 9 }, () => [rng() * nx, rng() * ny, 3 + rng() * 6]); let mx = 0; for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) { let v = 1.0 * gauss2(i, j, 40, 32, 13, 10) + 0.55 * gauss2(i, j, 88, 40, 9, 12); for (const [x, y, s] of bumps) v += 0.06 * gauss2(i, j, x, y, s, s); f[j * nx + i] = v; mx = Math.max(mx, v); } return f.map((v) => v / mx); })();
    function draw() {
      $$('[data-ramp]', root).forEach((b) => b.classList.toggle('on', b.dataset.ramp === which));
      $$('[data-bg]', root).forEach((b) => b.classList.toggle('on', b.dataset.bg === bg));
      const fn = ramps[which];
      const { ctx, w, h } = fitCanvas(c, 1.75);
      ctx.fillStyle = bg === 'navy' ? '#0f2236' : '#151514'; ctx.fillRect(0, 0, w, h);
      // land on the right third, like a coast
      ctx.fillStyle = bg === 'navy' ? '#20302a' : '#2a2724';
      ctx.beginPath(); ctx.moveTo(w * 0.78, 0); ctx.bezierCurveTo(w * 0.7, h * 0.3, w * 0.86, h * 0.55, w * 0.76, h); ctx.lineTo(w, h); ctx.lineTo(w, 0); ctx.closePath(); ctx.fill();
      const off = document.createElement('canvas'); off.width = nx; off.height = ny;
      const o = off.getContext('2d'); const img = o.createImageData(nx, ny);
      for (let q = 0; q < nx * ny; q++) { const t = field[q]; const [r, g, b] = fn(t); img.data[q * 4] = r; img.data[q * 4 + 1] = g; img.data[q * 4 + 2] = b; img.data[q * 4 + 3] = 255 * clamp(0.25 + 0.9 * t, 0, 0.85); }
      o.putImageData(img, 0, 0); ctx.imageSmoothingEnabled = true; ctx.drawImage(off, 0, 0, w, h);
      // luminance profile
      const L = fitCanvas(lc, 7);
      const dark = isDark();
      L.ctx.fillStyle = dark ? '#151514' : '#fbfaf7'; L.ctx.fillRect(0, 0, L.w, L.h);
      const grd = L.ctx.createLinearGradient(10, 0, L.w - 10, 0);
      for (let k = 0; k <= 20; k++) { const [r, g, b] = fn(k / 20); grd.addColorStop(k / 20, `rgb(${r | 0},${g | 0},${b | 0})`); }
      L.ctx.fillStyle = grd; L.ctx.fillRect(10, L.h - 14, L.w - 20, 8);
      L.ctx.strokeStyle = dark ? '#ece8e1' : '#1c1b19'; L.ctx.lineWidth = 1.8; L.ctx.beginPath();
      let mono = true, prev = -1, blueGreen = false;
      for (let k = 0; k <= 100; k++) {
        const col = fn(k / 100); const l = Lstar(col);
        if (prev >= 0 && l < prev - 0.5) mono = false; prev = l;
        if ((col[2] > col[0] + 20 && col[2] > 90) || (col[1] > col[0] + 25 && col[1] > col[2])) blueGreen = true;
        const x = 10 + (k / 100) * (L.w - 20), y = L.h - 20 - (l / 100) * (L.h - 26);
        k ? L.ctx.lineTo(x, y) : L.ctx.moveTo(x, y);
      }
      L.ctx.stroke();
      L.ctx.fillStyle = dark ? '#a29b90' : '#6b665e'; L.ctx.font = '10.5px "JetBrains Mono", monospace'; L.ctx.fillText('perceived lightness L* along the ramp', 14, 12);
      setRead(root, 'mono', mono ? 'yes' : 'no: false ridges');
      setRead(root, 'bg', blueGreen ? 'yes: collides with sea / land' : 'none');
      setRead(root, 'low', bg === 'navy' && which === 'jet' ? 'vanishes into the sea' : 'distinct from the background');
    }
    $$('[data-ramp]', root).forEach((b) => b.addEventListener('click', () => { which = b.dataset.ramp; draw(); }));
    $$('[data-bg]', root).forEach((b) => b.addEventListener('click', () => { bg = b.dataset.bg; draw(); }));
    window.addEventListener('resize', draw);
    window.addEventListener('themechange', draw);
    draw();
  });

  /* ================================================================
     Lab: the fifth miss — independent versus shared failure
     ================================================================ */
  $$('[data-lab="fifthmiss"]').forEach((root) => {
    const c = $('canvas', root);
    function draw() {
      const n = +$('[name=n]', root).value, f = +$('[name=f]', root).value / 100, d = +$('[name=d]', root).value / 100;
      setOut(root, 'n', n); setOut(root, 'f', fmtPct(f, 0)); setOut(root, 'd', fmtPct(d, 0));
      const p = (1 - f) * d;
      const post = (L) => L / (1 + L);
      const series = Array.from({ length: 13 }, (_, k) => [post((1 - p) ** k), post(f + (1 - f) * (1 - d) ** k)]);
      const { ctx, w, h } = fitCanvas(c, 2.4);
      const dark = isDark();
      ctx.fillStyle = dark ? '#151514' : '#fbfaf7'; ctx.fillRect(0, 0, w, h);
      const X = (k) => 36 + (k / 12) * (w - 56), Y = (v) => h - 24 - (v / 0.5) * (h - 40);
      ctx.strokeStyle = dark ? '#2c2a27' : '#e4dfd5';
      for (let g = 0; g <= 5; g++) { const y = Y(g / 10); ctx.beginPath(); ctx.moveTo(36, y); ctx.lineTo(w - 20, y); ctx.stroke(); }
      ctx.fillStyle = dark ? '#a29b90' : '#6b665e'; ctx.font = '10.5px "JetBrains Mono", monospace'; ctx.textAlign = 'right';
      for (let g = 0; g <= 5; g++) ctx.fillText(g * 10 + '%', 30, Y(g / 10) + 4);
      ctx.textAlign = 'center'; for (let k = 0; k <= 12; k += 2) ctx.fillText(k, X(k), h - 8);
      const line = (idx, col) => { ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); series.forEach((v, k) => (k ? ctx.lineTo(X(k), Y(v[idx])) : ctx.moveTo(X(k), Y(v[idx])))); ctx.stroke(); };
      line(0, '#c0397a'); line(1, '#e8962e');
      ctx.fillStyle = dark ? '#ece8e1' : '#1c1b19'; ctx.beginPath(); ctx.arc(X(n), Y(series[n][0]), 4, 0, 7); ctx.arc(X(n), Y(series[n][1]), 4, 0, 7); ctx.fill();
      const pI = series[n][0], pS = series[n][1];
      const b = f + (1 - f) * (1 - d) ** n;
      const remaining = b > 0 ? ((1 - f) * (1 - d) ** n) / b : 0;
      setRead(root, 'ind', fmtPct(pI, 2));
      setRead(root, 'sh', fmtPct(pS, 2));
      setRead(root, 'retry', fmtPct(pS * remaining * d, 2));
      setRead(root, 'switch', fmtPct(pS * p, 2));
    }
    $$('input', root).forEach((i) => i.addEventListener('input', draw));
    window.addEventListener('resize', draw);
    window.addEventListener('themechange', draw);
    draw();
  });
  /* ================================================================
     Architecture chart: hover, focus or tap a node to inspect it and light its connections
     ================================================================ */
  $$('.arch').forEach((root) => {
    // The chart ships in two layouts (landscape and portrait); each node lights edges in its own drawing.
    const box = $('.arch-inspect', root);
    const svgs = $$('svg', root);
    if (!svgs.length || !box) return;
    const nodes = $$('[data-k]', root), edges = $$('[data-e]', root);
    const idle = box.innerHTML;
    let pinned = null;
    function show(n) {
      const k = n.dataset.k, sv = n.closest('svg');
      root.classList.add('focus');
      nodes.forEach((m) => m.classList.toggle('lit', m === n));
      edges.forEach((e) => {
        const ks = e.dataset.e.split(' ');
        const on = e.closest('svg') === sv && ks.includes(k);
        e.classList.toggle('lit', on);
        if (on) ks.forEach((kk) => { const m = sv.querySelector(`[data-k="${kk}"]`); if (m) m.classList.add('lit'); });
      });
      const kind = n.classList.contains('ui') ? 'Interface' : n.classList.contains('chip') ? 'Signal engine' : 'Component';
      box.innerHTML = `<span class="k">${kind}</span><b>${n.dataset.title}</b><p>${n.dataset.desc}</p>`;
    }
    function clear() {
      if (pinned) return show(pinned);
      root.classList.remove('focus');
      nodes.forEach((m) => m.classList.remove('lit'));
      edges.forEach((e) => e.classList.remove('lit'));
      box.innerHTML = idle;
    }
    nodes.forEach((n) => {
      n.addEventListener('mouseenter', () => show(n));
      n.addEventListener('mouseleave', clear);
      n.addEventListener('focus', () => show(n));
      n.addEventListener('blur', clear);
      if (n.tagName.toLowerCase() !== 'a') n.addEventListener('click', (ev) => { ev.stopPropagation(); pinned = pinned === n ? null : n; pinned ? show(n) : clear(); });
    });
    svgs.forEach((sv) => sv.addEventListener('click', () => { pinned = null; clear(); }));
  });

  /* ================================================================
     Lab: the bubble clock (Rayleigh–Willis period, size against depth)
     ================================================================ */
  $$('[data-lab="bubble"]').forEach((root) => {
    const c = $('canvas', root), cv = $('canvas.curve', root);
    const RHO = 1025, PA = 101325, K = 1.135;
    const P = (z) => PA + RHO * G * z;
    const period = (v0, z, eta) => (K * Math.sqrt(RHO) * Math.cbrt(eta * v0)) / Math.sqrt(P(z));
    const depthFrom = (T, v0, eta) => (RHO * (K * Math.cbrt(eta * v0) / T) ** 2 - PA) / (RHO * G);
    let t0 = 0, running = false, raf = 0;
    function vals() {
      const v0 = Math.round(10 ** +$('[name=v]', root).value);
      const z = +$('[name=z]', root).value, eta = +$('[name=eta]', root).value / 100;
      return { v0, z, eta, T: period(v0, z, eta) };
    }
    function trace(anim) {
      const { T } = vals();
      const { ctx, w, h } = fitCanvas(c, 3.2);
      ctx.fillStyle = '#101010'; ctx.fillRect(0, 0, w, h);
      const span = Math.max(0.25, 4.4 * T);
      const pulses = [[0, 1, 1]];
      let t = 0, per = T, a = 0.55, wid = 1;
      for (let k = 0; k < 4; k++) { t += per; pulses.push([t, a, wid * 1.45]); per *= 0.85; a *= 0.45; wid *= 1.45; }
      const base = Math.max(0.002, 0.035 * T);
      const reveal = anim ? Math.min(1, ((performance.now() - t0) / 1600)) : 1;
      ctx.strokeStyle = '#e8962e'; ctx.lineWidth = 1.5; ctx.beginPath();
      const N = 900;
      for (let i = 0; i <= N * reveal; i++) {
        const tt = -0.08 * span + (i / N) * span;
        let v = 0;
        for (const [tp, amp, wd] of pulses) {
          const s = base * wd, u = (tt - tp) / s;
          v += amp * (1 - 2 * u * u) * Math.exp(-u * u);
        }
        const X = (i / N) * w, Y = h * 0.55 - v * h * 0.38;
        i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y);
      }
      ctx.stroke();
      ctx.font = '600 11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
      pulses.slice(0, 4).forEach(([tp], k) => {
        const X = ((tp + 0.08 * span) / span) * w;
        ctx.strokeStyle = k ? 'rgba(232,150,46,0.45)' : 'rgba(255,90,90,0.7)'; ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(X, 14); ctx.lineTo(X, h - 18); ctx.stroke(); ctx.setLineDash([]);
        ctx.fillStyle = k ? '#fcd25c' : '#ff8a8a';
        ctx.fillText(k ? (k === 1 ? 'T' : `+${k}`) : 'collapse', X, 12);
      });
      ctx.fillStyle = 'rgba(241,237,230,0.6)'; ctx.textAlign = 'left';
      ctx.fillText(`${(span * 1000).toFixed(0)} ms shown · pressure at a hydrophone`, 10, h - 6);
    }
    function curve() {
      const { v0, z, eta, T } = vals();
      const { ctx, w, h } = fitCanvas(cv, 2.3);
      ctx.fillStyle = '#101010'; ctx.fillRect(0, 0, w, h);
      const zMax = 1600, lv0 = 0, lv1 = 4.3;
      const X = (v) => 46 + ((Math.log10(v) - lv0) / (lv1 - lv0)) * (w - 60);
      const Y = (d) => 16 + (d / zMax) * (h - 40);
      // band over the unknown rebound fraction, for this period
      ctx.fillStyle = 'rgba(232,150,46,0.18)'; ctx.beginPath();
      const vol = (d, e) => ((T * Math.sqrt(P(d) / RHO)) / K) ** 3 / e;
      for (let d = 0; d <= zMax; d += 20) { const x = X(vol(d, 0.8)); d ? ctx.lineTo(x, Y(d)) : ctx.moveTo(x, Y(d)); }
      for (let d = zMax; d >= 0; d -= 20) ctx.lineTo(X(vol(d, 0.3)), Y(d));
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#e8962e'; ctx.lineWidth = 1.6; ctx.beginPath();
      for (let d = 0; d <= zMax; d += 10) { const x = X(vol(d, eta)); d ? ctx.lineTo(x, Y(d)) : ctx.moveTo(x, Y(d)); }
      ctx.stroke();
      // the known hull volume and the depths it allows
      const zl = depthFrom(T, v0, 0.3), zh = depthFrom(T, v0, 0.8);
      ctx.strokeStyle = 'rgba(120,200,255,0.8)'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(X(v0), 10); ctx.lineTo(X(v0), h - 22); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(120,200,255,0.25)';
      ctx.fillRect(X(v0) - 5, Y(Math.max(0, zl)), 10, Y(Math.min(zMax, zh)) - Y(Math.max(0, zl)));
      ctx.fillStyle = '#46e08a'; ctx.beginPath(); ctx.arc(X(v0), Y(z), 4.5, 0, 7); ctx.fill();
      ctx.fillStyle = 'rgba(241,237,230,0.65)'; ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign = 'left';
      ctx.fillText('depth ↓', 4, 14);
      ctx.fillText('0 m', 4, Y(0) + 4); ctx.fillText(`${zMax} m`, 4, Y(zMax));
      [10, 100, 1000, 10000].forEach((v) => { if (Math.log10(v) <= lv1) ctx.fillText(v >= 1000 ? `${v / 1000}k m³` : `${v} m³`, X(v) - 14, h - 6); });
      ctx.textAlign = 'right'; ctx.fillStyle = '#fcd25c';
      ctx.fillText('hulls that ring at this period', w - 8, 14);
      setRead(root, 'T', (T * 1000).toFixed(1) + ' ms');
      setRead(root, 'p', (P(z) / 1e5).toFixed(1) + ' bar');
      setRead(root, 'r', Math.cbrt((3 * eta * v0) / (4 * Math.PI)).toFixed(1) + ' m');
      setRead(root, 'zz', `${Math.max(0, zl).toFixed(0)}–${zh.toFixed(0)} m`);
    }
    function draw(anim) {
      const { v0, z, eta } = vals();
      setOut(root, 'v', v0.toLocaleString() + ' m³'); setOut(root, 'z', z + ' m'); setOut(root, 'eta', eta.toFixed(2));
      trace(anim); curve();
    }
    function loop() { trace(true); if (performance.now() - t0 < 1700) raf = requestAnimationFrame(loop); else running = false; }
    function play() { t0 = performance.now(); if (!running && !reduced) { running = true; raf = requestAnimationFrame(loop); } }
    $$('input', root).forEach((i) => i.addEventListener('input', () => draw(false)));
    const btn = $('[data-act=play]', root);
    if (btn) btn.addEventListener('click', play);
    window.addEventListener('resize', () => draw(false));
    draw(false);
    onVisible(c, play, () => {});
  });

  /* ================================================================
     Main site: a live Bayesian search behind the dark bands.
     Probability is a few drifting blobs (the target can move); a searcher
     sweeps the likeliest ground, and every pass with no detection multiplies
     the belief under it by the chance of having missed. Belief seeps back as
     the target could have drifted in. Contours, the 50% credible region and
     the search trail are drawn over the field. One hidden target is sampled
     from the prior; when the searcher finds it, the search restarts.
     ================================================================ */
  $$('canvas.flow').forEach((c) => {
    const host = c.parentElement;
    const quiet = c.dataset.flow === 'band';
    const hud = host.querySelector('.hud');
    const CELL = quiet ? 13 : 9;
    let ctx, w, h, nx, ny, cw, ch, off, octx, img, prior, miss, post, blobs, rng, target;
    let sx, sy, way = [], trail = [], frame = 0, hpd = 0, found = -1, mass = 1, seed = 7;
    const STOPS = [[0, 18, 52, 140, 0], [0.18, 24, 78, 200, 0.28], [0.42, 50, 130, 255, 0.5], [0.7, 95, 212, 255, 0.72], [1, 236, 250, 255, 0.92]];
    function colour(v) {
      let k = 1;
      while (k < STOPS.length - 1 && v > STOPS[k][0]) k++;
      const a = STOPS[k - 1], b = STOPS[k], u = clamp((v - a[0]) / (b[0] - a[0]), 0, 1);
      return [a[1] + u * (b[1] - a[1]), a[2] + u * (b[2] - a[2]), a[3] + u * (b[3] - a[3]), a[4] + u * (b[4] - a[4])];
    }
    function reset() {
      rng = mulberry(seed++ * 7919 + 13);
      const wide = w > 900;
      blobs = [];
      const k = 3 + Math.floor(rng() * 2);
      for (let i = 0; i < k; i++) {
        blobs.push({
          x: nx * (wide ? (quiet ? 0.64 + 0.3 * rng() : 0.56 + 0.38 * rng()) : 0.12 + 0.76 * rng()),
          y: ny * (wide ? 0.18 + 0.66 * rng() : 0.5 + 0.42 * rng()),
          sx: nx * (0.05 + 0.06 * rng()), sy: ny * (0.07 + 0.1 * rng()), wt: 0.5 + rng(),
          ph: rng() * 6.28, ax: 0.6 + rng(), ay: 0.4 + rng(),
        });
      }
      miss = new Float32Array(nx * ny).fill(1);
      prior = new Float32Array(nx * ny);
      post = new Float32Array(nx * ny);
      computePrior();
      // the hidden target: sampled from the prior, riding with its blob
      let u = rng(), acc = 0, tot = 0, pick = 0;
      for (let i = 0; i < prior.length; i++) tot += prior[i];
      for (let i = 0; i < prior.length; i++) { acc += prior[i] / tot; if (acc >= u) { pick = i; break; } }
      const tx = pick % nx, ty = Math.floor(pick / nx);
      let best = 0, bd = 1e9;
      blobs.forEach((bl, j) => { const d = (bl.x - tx) ** 2 + (bl.y - ty) ** 2; if (d < bd) { bd = d; best = j; } });
      target = { b: best, dx: tx - blobs[best].x, dy: ty - blobs[best].y };
      for (let i = 0; i < post.length; i++) post[i] = prior[i];
      way = []; trail = []; found = -1; mass = 1;
      plan(); [sx, sy] = way[0];
    }
    function computePrior() {
      const t = frame * 0.004;
      for (const bl of blobs) { bl.cx = bl.x + Math.sin(t * bl.ax + bl.ph) * nx * 0.025; bl.cy = bl.y + Math.cos(t * bl.ay + bl.ph) * ny * 0.03; }
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
        let v = 0.0006;
        for (const bl of blobs) v += bl.wt * Math.exp(-0.5 * (((i - bl.cx) / bl.sx) ** 2 + ((j - bl.cy) / bl.sy) ** 2));
        prior[j * nx + i] = v;
      }
    }
    function plan() {
      let best = 0;
      for (let i = 1; i < post.length; i++) if (post[i] > post[best]) best = i;
      const bx = best % nx, by = Math.floor(best / nx), W = Math.max(8, Math.round(nx * 0.1)), H = Math.max(5, Math.round(ny * 0.12));
      way = [];
      for (let r = 0; r <= H; r += 2) {
        const y = clamp(by - H / 2 + r, 1, ny - 2);
        const a = clamp(bx - W / 2, 1, nx - 2), b = clamp(bx + W / 2, 1, nx - 2);
        way.push((r / 2) % 2 ? [b, y] : [a, y], (r / 2) % 2 ? [a, y] : [b, y]);
      }
    }
    function step() {
      frame++;
      computePrior();
      if (found >= 0) { if (frame - found > 150) reset(); return; }
      if (!way.length) plan();
      const [gx, gy] = way[0], dx = gx - sx, dy = gy - sy, d = Math.hypot(dx, dy), v = quiet ? 0.22 : 0.34;
      if (d < v) { sx = gx; sy = gy; way.shift(); } else { sx += (dx / d) * v; sy += (dy / d) * v; }
      trail.push([sx, sy]); if (trail.length > 260) trail.shift();
      // detection hazard under the sensor: a miss multiplies belief there by exp(-hazard)
      const R = 2.2, i0 = Math.max(0, Math.floor(sx - R)), i1 = Math.min(nx - 1, Math.ceil(sx + R));
      const j0 = Math.max(0, Math.floor(sy - R)), j1 = Math.min(ny - 1, Math.ceil(sy + R));
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
        const q = ((i - sx) ** 2 + (j - sy) ** 2) / (R * R * 0.45);
        if (q < 4) miss[j * nx + i] *= Math.exp(-0.16 * Math.exp(-q));
      }
      // belief seeps back: the target may have drifted into searched ground
      for (let i = 0; i < miss.length; i++) miss[i] += (1 - miss[i]) * 0.0016;
      const bt = blobs[target.b], tx = bt.cx + target.dx, ty = bt.cy + target.dy;
      if ((tx - sx) ** 2 + (ty - sy) ** 2 < 2.2 && rng() < 0.1) found = frame;
    }
    function contour(f, lev) {
      const X = (i) => (i + 0.5) * cw, Y = (j) => (j + 0.5) * ch;
      ctx.beginPath();
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
        const a = f[j * nx + i], b = f[j * nx + i + 1], cc = f[(j + 1) * nx + i + 1], d = f[(j + 1) * nx + i];
        const idx = (a > lev ? 8 : 0) | (b > lev ? 4 : 0) | (cc > lev ? 2 : 0) | (d > lev ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const L = (p0, p1, v0, v1) => p0 + (p1 - p0) * ((lev - v0) / (v1 - v0));
        const T = [L(X(i), X(i + 1), a, b), Y(j)], Rr = [X(i + 1), L(Y(j), Y(j + 1), b, cc)];
        const B = [L(X(i), X(i + 1), d, cc), Y(j + 1)], Lf = [X(i), L(Y(j), Y(j + 1), a, d)];
        const seg = (p, q) => { ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); };
        if (idx === 1 || idx === 14) seg(Lf, B); else if (idx === 2 || idx === 13) seg(B, Rr);
        else if (idx === 3 || idx === 12) seg(Lf, Rr); else if (idx === 4 || idx === 11) seg(T, Rr);
        else if (idx === 6 || idx === 9) seg(T, B); else if (idx === 7 || idx === 8) seg(Lf, T);
        else if (idx === 5) { seg(Lf, T); seg(B, Rr); } else if (idx === 10) { seg(Lf, B); seg(T, Rr); }
      }
      ctx.stroke();
    }
    function draw() {
      let mx = 0, sp = 0, sq = 0;
      for (let i = 0; i < post.length; i++) { const v = prior[i] * miss[i]; post[i] = v; sp += prior[i]; sq += v; if (v > mx) mx = v; }
      mass = sq / sp;
      const f = new Float32Array(post.length);
      for (let i = 0; i < post.length; i++) f[i] = Math.pow(post[i] / mx, 0.62);
      const dat = img.data, dim = quiet ? 0.72 : 1;
      for (let i = 0; i < f.length; i++) {
        const [r, g, b, a] = colour(f[i]);
        dat[i * 4] = r; dat[i * 4 + 1] = g; dat[i * 4 + 2] = b; dat[i * 4 + 3] = 255 * a * dim;
      }
      octx.putImageData(img, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(off, 0, 0, w, h);
      // graticule
      ctx.strokeStyle = 'rgba(150,190,255,0.06)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x < w; x += 80) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, h); }
      for (let y = 0; y < h; y += 80) { ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(w, Math.round(y) + 0.5); }
      ctx.stroke();
      // density contours
      ctx.lineWidth = quiet ? 0.8 : 1;
      for (const lev of [0.25, 0.45, 0.65, 0.85]) { ctx.strokeStyle = `rgba(150,215,255,${(quiet ? 0.1 : 0.14) + 0.22 * lev})`; contour(f, lev); }
      // the 50% credible region, recomputed every few frames
      if (frame % 6 === 0 || !hpd) {
        const s = Float32Array.from(post).sort();
        let acc = 0; hpd = 0;
        for (let k = s.length - 1; k >= 0; k--) { acc += s[k]; if (acc >= 0.5 * sq) { hpd = Math.pow(s[k] / mx, 0.62); break; } }
      }
      ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = quiet ? 1.2 : 1.6; ctx.strokeStyle = 'rgba(255,255,255,0.55)'; contour(f, hpd); ctx.restore();
      // the swath and the trail
      if (trail.length > 1) {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(95,212,255,0.07)'; ctx.lineWidth = 4.4 * cw; ctx.beginPath();
        trail.forEach(([x, y], k) => (k ? ctx.lineTo((x + 0.5) * cw, (y + 0.5) * ch) : ctx.moveTo((x + 0.5) * cw, (y + 0.5) * ch)));
        ctx.stroke();
        ctx.lineWidth = 1.5;
        for (let k = 1; k < trail.length; k++) {
          ctx.strokeStyle = `rgba(255,255,255,${(0.75 * k) / trail.length})`;
          ctx.beginPath(); ctx.moveTo((trail[k - 1][0] + 0.5) * cw, (trail[k - 1][1] + 0.5) * ch); ctx.lineTo((trail[k][0] + 0.5) * cw, (trail[k][1] + 0.5) * ch); ctx.stroke();
        }
      }
      const px = (sx + 0.5) * cw, py = (sy + 0.5) * ch;
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(px, py, 2.2 * cw, 0, 7); ctx.stroke();
      ctx.save(); ctx.shadowColor = '#5fd4ff'; ctx.shadowBlur = 16; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(px, py, 3.4, 0, 7); ctx.fill(); ctx.restore();
      if (found >= 0) {
        const bt = blobs[target.b], tx = (bt.cx + target.dx + 0.5) * cw, ty = (bt.cy + target.dy + 0.5) * ch, age = frame - found;
        for (let r = 0; r < 3; r++) {
          const rr = 6 + ((age * 1.4 + r * 22) % 66);
          ctx.strokeStyle = `rgba(255,184,107,${Math.max(0, 1 - rr / 72)})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tx, ty, rr, 0, 7); ctx.stroke();
        }
        ctx.fillStyle = '#ffb86b'; ctx.beginPath(); ctx.arc(tx, ty, 4.5, 0, 7); ctx.fill();
        ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace'; ctx.textBaseline = 'middle'; ctx.textAlign = tx > w - 120 ? 'right' : 'left';
        ctx.fillText('FOUND', tx + (tx > w - 120 ? -14 : 14), ty);
      }
      if (hud && frame % 8 === 0) {
        let H = 0; for (let i = 0; i < post.length; i++) { const q = post[i] / sq; if (q > 0) H -= q * Math.log2(q); }
        let searched = 0; for (let i = 0; i < miss.length; i++) if (miss[i] < 0.8) searched++;
        const set = (k, v) => { const o = hud.querySelector(`[data-r="${k}"]`); if (o) o.textContent = v; };
        set('n', searched.toLocaleString()); set('pf', found >= 0 ? 'found' : fmtPct(1 - mass, 1)); set('h', H.toFixed(2));
      }
    }
    function size() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = host.clientWidth; h = host.clientHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nx = clamp(Math.round(w / CELL), 40, 210); ny = clamp(Math.round(h / CELL), 26, 120);
      cw = w / nx; ch = h / ny;
      off = document.createElement('canvas'); off.width = nx; off.height = ny; octx = off.getContext('2d'); img = octx.createImageData(nx, ny);
      reset();
      if (reduced) for (let k = 0; k < 520; k++) step();
      draw();
    }
    let raf = 0, last = 0, running = false;
    const loop = (ts) => { if (!running) return; if (ts - last > 33) { last = ts; step(); draw(); } raf = requestAnimationFrame(loop); };
    const play = () => { if (reduced || running) return; running = true; raf = requestAnimationFrame(loop); };
    const stop = () => { running = false; cancelAnimationFrame(raf); };
    let rt = 0;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(size, 150); });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : null));
    size();
    if (!('IntersectionObserver' in window)) play();
    else new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting && !document.hidden ? play() : stop()))).observe(c);
  });

  /* Count-up numbers on the main site */
  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count), suffix = el.dataset.suffix || '';
    const fmt = (v) => Math.round(v).toLocaleString() + suffix;
    if (reduced || !('IntersectionObserver' in window)) { el.textContent = fmt(to); return; }
    el.textContent = fmt(0);
    const io = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now(), D = 1300;
      const tick = (now) => { const u = Math.min(1, (now - t0) / D); el.textContent = fmt(to * (1 - Math.pow(1 - u, 3))); if (u < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }));
    io.observe(el);
  });


})();
