(function () {
  const $ = (id) => document.getElementById(id);

  /* =========================================================
     0. Reading Progress Bar & Screenshot Lightbox
     ========================================================= */
  function initReadingProgress() {
    const bar = document.querySelector('.reading-progress');
    if (!bar) return;
    function onScroll() {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      const pct = max > 0 ? Math.min(100, Math.max(0, (h.scrollTop / max) * 100)) : 0;
      bar.style.width = pct.toFixed(2) + '%';
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  function initLightbox() {
    const imgs = document.querySelectorAll('figure.shot img');
    if (!imgs.length) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'lightbox-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-label', 'Enlarged screenshot');
    backdrop.innerHTML = `
      <button type="button" class="lightbox-close" aria-label="Close image">Close · Esc</button>
      <img alt="">
      <div class="lightbox-caption"></div>
    `;
    document.body.appendChild(backdrop);

    const lbImg = backdrop.querySelector('img');
    const lbCap = backdrop.querySelector('.lightbox-caption');
    const lbClose = backdrop.querySelector('.lightbox-close');

    function close() {
      backdrop.classList.remove('open');
      document.body.style.overflow = '';
    }

    imgs.forEach((img) => {
      img.addEventListener('click', () => {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        const fig = img.closest('figure');
        const cap = fig ? fig.querySelector('figcaption') : null;
        lbCap.innerHTML = cap ? cap.innerHTML : img.alt;
        backdrop.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    lbClose.addEventListener('click', close);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop.classList.contains('open')) close();
    });
  }

  /* =========================================================
     1. Coverage Fallacy & Honest Progress Bar (Part I)
     ========================================================= */
  function initCoverageWidget() {
    if (!$('cov-inside')) return;
    const ids = ['cov-inside', 'cov-coverage', 'cov-pod'];

    function update() {
      const a = +$('cov-inside').value / 100;
      const c = +$('cov-coverage').value / 100;
      const d = +$('cov-pod').value / 100;

      $('cov-inside-val').textContent = Math.round(a * 100) + '%';
      $('cov-coverage-val').textContent = Math.round(c * 100) + '%';
      $('cov-pod-val').textContent = Math.round(d * 100) + '%';

      const found = a * c * d;
      const rem = 1 - found;

      const missed = rem > 1e-9 ? (a * c * (1 - d)) / rem : 0;
      const unsearched = rem > 1e-9 ? (a * (1 - c)) / rem : 0;
      const outside = rem > 1e-9 ? (1 - a) / rem : 0;

      $('cov-found-val').textContent = (found * 100).toFixed(1) + '%';
      $('cov-missed-val').textContent = (missed * 100).toFixed(2) + '%';
      $('cov-unsearched-val').textContent = (unsearched * 100).toFixed(2) + '%';
      $('cov-outside-val').textContent = (outside * 100).toFixed(2) + '%';

      $('seg-missed').style.width = (missed * 100).toFixed(2) + '%';
      $('seg-unsearched').style.width = (unsearched * 100).toFixed(2) + '%';
      $('seg-outside').style.width = (outside * 100).toFixed(2) + '%';
    }

    ids.forEach((id) => $(id).addEventListener('input', update));
    update();
  }

  /* =========================================================
     2. Echo-Chamber vs Provenance-Pooling Simulator (Part II)
     ========================================================= */
  function initEchoWidget() {
    if (!$('echo-count')) return;
    const ids = ['echo-count', 'echo-rel'];

    const M = 100; // 100 discrete 1D cells from -50 to +50 km
    const prior = Array.from({ length: M }, () => 1 / M);
    // Gaussian witness kernel centred at x = 0, sigma = 12 km
    const kernel = Array.from({ length: M }, (_, i) => {
      const x = -50 + (i / (M - 1)) * 100;
      return Math.exp(-0.5 * (x / 12) * (x / 12));
    });
    const kBar = prior.reduce((acc, p, i) => acc + p * kernel[i], 0);

    function klBits(p, q) {
      let s = 0;
      for (let i = 0; i < p.length; i++) {
        if (p[i] > 1e-12 && q[i] > 1e-12) {
          s += p[i] * Math.log2(p[i] / q[i]);
        }
      }
      return s;
    }

    function update() {
      const n = +$('echo-count').value;
      const r = +$('echo-rel').value / 100;

      $('echo-count-val').textContent = n + (n === 1 ? ' report' : ' echoes');
      $('echo-rel-val').textContent = r.toFixed(2);

      // Single-source v2 likelihood: (1 - r) + r * (K_i / K_bar)
      const L = kernel.map((k) => (1 - r) + r * (k / kBar));

      // Pooled posterior: exponent 1/n per echo => product is L^(n/n) = L
      let sumPool = 0;
      const postPool = prior.map((p, i) => {
        const v = p * L[i];
        sumPool += v;
        return v;
      }).map((v) => v / sumPool);

      // Naive independent posterior: L^n
      let sumNaive = 0;
      const postNaive = prior.map((p, i) => {
        const v = p * Math.pow(L[i], n);
        sumNaive += v;
        return v;
      }).map((v) => v / sumNaive);

      // Mass within +/- 10 km (indices 40..60)
      let massPool = 0, massNaive = 0;
      for (let i = 40; i <= 60; i++) {
        massPool += postPool[i];
        massNaive += postNaive[i];
      }

      const klPool = klBits(postPool, prior);
      const klNaive = klBits(postNaive, prior);

      $('echo-pool-mass').textContent = (massPool * 100).toFixed(1) + '%';
      $('echo-naive-mass').textContent = (massNaive * 100).toFixed(1) + '%';
      $('echo-pool-kl').textContent = klPool.toFixed(2) + ' bits';
      $('echo-naive-kl').textContent = klNaive.toFixed(2) + ' bits';

      const svg = $('echo-svg');
      if (!svg) return;
      const W = 640, H = 220, padL = 44, padR = 20, padT = 18, padB = 32;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const maxY = Math.max(0.06, ...postNaive, ...postPool) * 1.12;

      const xPos = (i) => padL + (i / (M - 1)) * plotW;
      const yPos = (v) => padT + (1 - v / maxY) * plotH;

      const ptsPrior = prior.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');
      const ptsPool = postPool.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');
      const ptsNaive = postNaive.map((v, i) => `${xPos(i).toFixed(1)},${yPos(v).toFixed(1)}`).join(' ');

      const areaNaive = `${xPos(0).toFixed(1)},${H - padB} ${ptsNaive} ${xPos(M - 1).toFixed(1)},${H - padB}`;
      const areaPool = `${xPos(0).toFixed(1)},${H - padB} ${ptsPool} ${xPos(M - 1).toFixed(1)},${H - padB}`;

      svg.innerHTML = `
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#d6d0c4" stroke-width="1"/>
        <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#d6d0c4" stroke-width="1"/>
        <polygon points="${areaNaive}" fill="#c75d2c" fill-opacity="0.11"/>
        <polygon points="${areaPool}" fill="#425f6a" fill-opacity="0.14"/>
        <polyline fill="none" stroke="#a7a095" stroke-width="1.5" stroke-dasharray="4 4" points="${ptsPrior}"/>
        <polyline fill="none" stroke="#c75d2c" stroke-width="2.2" points="${ptsNaive}"/>
        <polyline fill="none" stroke="#425f6a" stroke-width="2.6" points="${ptsPool}"/>
        <text x="${padL - 8}" y="${padT + 4}" text-anchor="end" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">${(maxY * 100).toFixed(0)}%</text>
        <text x="${padL - 8}" y="${H - padB + 4}" text-anchor="end" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">0%</text>
        <text x="${xPos(0)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">−50 km</text>
        <text x="${xPos(49.5)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">Reported location (0)</text>
        <text x="${xPos(M - 1)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">+50 km</text>
      `;
    }

    ids.forEach((id) => $(id).addEventListener('input', update));
    update();
  }

  /* =========================================================
     3. Repeat Credit, 10x10 Min-KL Grid & Absence (Part III)
     ========================================================= */
  function initRepeatWidget() {
    if (!$('rep-passes')) return;
    const ids = ['rep-passes', 'rep-rho', 'rep-eff'];

    function update() {
      const k = +$('rep-passes').value;
      const rho = +$('rep-rho').value / 100;
      const e = +$('rep-eff').value / 100;

      $('rep-passes-val').textContent = k;
      $('rep-rho-val').textContent = rho.toFixed(2);
      $('rep-eff-val').textContent = Math.round(e * 100) + '%';

      const nEff = 1 + rho * (k - 1);
      const survRepeat = Math.pow(1 - e, nEff);
      const survIndep = Math.pow(1 - e, k);
      const survMax = 1 - e;

      $('rep-neff-val').textContent = nEff.toFixed(2);
      $('rep-surv-val').textContent = (survRepeat * 100).toFixed(1) + '%';
      $('rep-indep-val').textContent = (survIndep * 100).toFixed(1) + '%';
      $('rep-max-val').textContent = (survMax * 100).toFixed(1) + '%';

      const svg = $('rep-svg');
      if (!svg) return;
      const W = 640, H = 210, padL = 44, padR = 20, padT = 18, padB = 30;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const maxK = 10;

      const xPos = (n) => padL + ((n - 1) / (maxK - 1)) * plotW;
      const yPos = (val) => padT + (1 - val) * plotH;

      let ptsRepeat = [], ptsIndep = [], ptsBeta = [];
      for (let n = 1; n <= maxK; n++) {
        ptsRepeat.push(`${xPos(n).toFixed(1)},${yPos(Math.pow(1 - e, 1 + rho * (n - 1))).toFixed(1)}`);
        ptsIndep.push(`${xPos(n).toFixed(1)},${yPos(Math.pow(1 - e, n)).toFixed(1)}`);
        ptsBeta.push(`${xPos(n).toFixed(1)},${yPos(1 / (n + 1)).toFixed(1)}`);
      }

      const curX = xPos(k).toFixed(1);
      const curY = yPos(survRepeat).toFixed(1);

      svg.innerHTML = `
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="#d6d0c4" stroke-width="1"/>
        <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="#d6d0c4" stroke-width="1"/>
        <line x1="${padL}" y1="${yPos(0.5)}" x2="${W - padR}" y2="${yPos(0.5)}" stroke="#ebe6dc" stroke-dasharray="3 3"/>
        <text x="${padL - 8}" y="${padT + 4}" text-anchor="end" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">100%</text>
        <text x="${padL - 8}" y="${yPos(0.5) + 4}" text-anchor="end" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">50%</text>
        <text x="${padL - 8}" y="${H - padB + 4}" text-anchor="end" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">0%</text>
        ${[1, 2, 4, 6, 8, 10].map((n) => `<text x="${xPos(n)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">${n}</text>`).join('')}
        <text x="${W / 2}" y="${H}" text-anchor="middle" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">Passes (k)</text>
        <polyline fill="none" stroke="#c78d4e" stroke-width="2" stroke-dasharray="5 4" points="${ptsBeta.join(' ')}"/>
        <polyline fill="none" stroke="#9aa8ad" stroke-width="2" points="${ptsIndep.join(' ')}"/>
        <polyline fill="none" stroke="#425f6a" stroke-width="2.5" points="${ptsRepeat.join(' ')}"/>
        <line x1="${curX}" y1="${padT}" x2="${curX}" y2="${H - padB}" stroke="#425f6a" stroke-opacity="0.3" stroke-width="1"/>
        <circle cx="${curX}" cy="${curY}" r="5" fill="#425f6a" stroke="#fffefa" stroke-width="2"/>
      `;
    }

    ids.forEach((id) => $(id).addEventListener('input', update));
    update();
  }

  function initGridWidget() {
    const gridEl = $('belief-grid');
    if (!gridEl) return;

    const N = 10;
    const basePrior = [];
    let sum = 0;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const dx = c - 4.2, dy = r - 4.5;
        const w = Math.exp(-(dx * dx + dy * dy) / 14) + 0.08;
        basePrior.push(w);
        sum += w;
      }
    }
    for (let i = 0; i < basePrior.length; i++) basePrior[i] /= sum;

    let selected = new Set([22, 23, 24, 32, 33, 34, 42, 43, 44]);
    const cells = [];
    for (let i = 0; i < N * N; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'belief-cell';
      cell.setAttribute('aria-label', `Grid cell ${i + 1}`);
      cell.addEventListener('click', () => {
        if (selected.has(i)) {
          if (selected.size > 1) selected.delete(i);
        } else if (selected.size < N * N - 1) {
          selected.add(i);
        }
        update();
      });
      gridEl.appendChild(cell);
      cells.push(cell);
    }

    function update() {
      const q = +$('assert-q').value / 100;
      $('assert-q-val').textContent = Math.round(q * 100) + '%';

      let p = 0;
      for (let i = 0; i < N * N; i++) if (selected.has(i)) p += basePrior[i];

      const scaleIn = q / p;
      const scaleOut = (1 - q) / (1 - p);

      let maxPost = 0;
      const post = basePrior.map((val, i) => {
        const v = selected.has(i) ? val * scaleIn : val * scaleOut;
        if (v > maxPost) maxPost = v;
        return v;
      });

      const kl = q * Math.log2(q / p) + (1 - q) * Math.log2((1 - q) / (1 - p));
      $('assert-p-val').textContent = (p * 100).toFixed(1) + '%';
      $('assert-bits-val').textContent = kl.toFixed(4) + ' bits';
      $('assert-count-val').textContent = selected.size + ' / 100 cells';

      for (let i = 0; i < N * N; i++) {
        const intensity = Math.min(1, post[i] / (maxPost || 1));
        const alpha = 0.08 + intensity * 0.85;
        cells[i].style.backgroundColor = `rgba(66, 95, 106, ${alpha.toFixed(3)})`;
        cells[i].classList.toggle('in-region', selected.has(i));
      }
    }

    $('assert-q').addEventListener('input', update);
    if ($('assert-reset')) {
      $('assert-reset').addEventListener('click', () => {
        selected = new Set([22, 23, 24, 32, 33, 34, 42, 43, 44]);
        $('assert-q').value = 5;
        update();
      });
    }
    update();
  }

  function initAbsenceWidget() {
    if (!$('abs-psi')) return;
    const ids = ['abs-psi', 'abs-pod', 'abs-conf'];

    function update() {
      const psi = +$('abs-psi').value / 100;
      const p = +$('abs-pod').value / 100;
      const conf = +$('abs-conf').value / 100;
      const eps = 1 - conf;

      $('abs-psi-val').textContent = Math.round(psi * 100) + '%';
      $('abs-pod-val').textContent = Math.round(p * 100) + '%';
      $('abs-conf-val').textContent = Math.round(conf * 100) + '%';

      const kExact = Math.log((psi * (1 - eps)) / ((1 - psi) * eps)) / -Math.log(1 - p);
      const kNeeded = Math.max(0, Math.ceil(kExact));
      const after5 = (psi * Math.pow(1 - p, 5)) / (1 - psi + psi * Math.pow(1 - p, 5));

      $('abs-k-val').textContent = kNeeded + (kNeeded === 1 ? ' visit' : ' visits');
      $('abs-5-val').textContent = (after5 * 100).toFixed(1) + '%';

      const barsEl = $('abs-bars');
      if (!barsEl) return;
      const maxBars = Math.min(15, Math.max(10, kNeeded + 2));
      barsEl.innerHTML = '';

      for (let k = 0; k <= maxBars; k++) {
        const pk = (psi * Math.pow(1 - p, k)) / (1 - psi + psi * Math.pow(1 - p, k));
        const col = document.createElement('div');
        col.className = 'absence-bar-col';

        const fill = document.createElement('div');
        fill.className = 'absence-bar-fill' + (k === kNeeded ? ' is-target' : '');
        fill.style.height = Math.max(3, Math.round(pk * 100)) + '%';
        fill.title = `After ${k} clean visits: ${(pk * 100).toFixed(1)}% present`;

        const lbl = document.createElement('span');
        lbl.className = 'absence-bar-label';
        lbl.textContent = k;

        col.appendChild(fill);
        col.appendChild(lbl);
        barsEl.appendChild(col);
      }
    }

    ids.forEach((id) => $(id).addEventListener('input', update));
    update();
  }

  /* =========================================================
     4. Search-to-Exhaustion & Optimal Stopping Simulator (Part IV)
     ========================================================= */
  function initStoppingWidget() {
    if (!$('stop-val')) return;
    const ids = ['stop-val', 'stop-cost', 'stop-pod'];

    // 25-cell prior with realistic power-law concentration (sum = 0.90 inside domain, 0.10 outside)
    const raw = Array.from({ length: 25 }, (_, i) => Math.exp(-i * 0.22));
    const rawSum = raw.reduce((a, b) => a + b, 0);
    const baseMass = raw.map((v) => (v / rawSum) * 0.90);

    function update() {
      const V = +$('stop-val').value * 1e6; // $M -> $
      const cHr = +$('stop-cost').value * 1e3; // $k/hr -> $/hr
      const pod = +$('stop-pod').value / 100;
      const mob = 60000; // $60k fixed mobilisation

      $('stop-val-lbl').textContent = '$' + (+$('stop-val').value).toFixed(1) + 'M';
      $('stop-cost-lbl').textContent = '$' + (+$('stop-cost').value).toFixed(0) + 'k / hr';
      $('stop-pod-lbl').textContent = Math.round(pod * 100) + '%';

      // Greedy cell-pass allocation for H = 40 hours (1 hour = 1 cell pass)
      const H = 40;
      const masses = baseMass.slice();
      let cumP = 0;
      const curve = [{ h: 0, p: 0, cost: mob, ev: -mob }];

      for (let h = 1; h <= H; h++) {
        // Pick cell with highest remaining mass * pod
        let bestIdx = 0;
        for (let i = 1; i < masses.length; i++) {
          if (masses[i] > masses[bestIdx]) bestIdx = i;
        }
        const gain = masses[bestIdx] * pod;
        masses[bestIdx] *= (1 - pod);
        cumP += gain;
        const cost = mob + h * cHr;
        const ev = V * cumP - cost;
        curve.push({ h, p: cumP, cost, ev });
      }

      let best = curve[0];
      for (const pt of curve) if (pt.ev > best.ev) best = pt;

      const marginalFirst = (curve[1].p - curve[0].p) * V - cHr;

      $('stop-best-hr').textContent = best.h === 0 ? 'Do not launch' : `Hour ${best.h}`;
      $('stop-peak-ev').textContent = (best.ev >= 0 ? '+$' : '-$') + (Math.abs(best.ev) / 1e6).toFixed(2) + 'M';
      $('stop-pfind').textContent = (best.p * 100).toFixed(1) + '%';
      $('stop-marginal').textContent = (marginalFirst >= 0 ? '+$' : '-$') + (Math.abs(marginalFirst) / 1e3).toFixed(0) + 'k/hr';

      const svg = $('stop-svg');
      if (!svg) return;
      const W = 640, HH = 230, padL = 56, padR = 46, padT = 20, padB = 34;
      const plotW = W - padL - padR;
      const plotH = HH - padT - padB;

      const minEV = Math.min(-mob * 2, ...curve.map((d) => d.ev));
      const maxEV = Math.max(mob * 2, ...curve.map((d) => d.ev));

      const xPos = (h) => padL + (h / H) * plotW;
      const yEV = (ev) => padT + (1 - (ev - minEV) / (maxEV - minEV || 1)) * plotH;
      const yP = (p) => padT + (1 - p) * plotH;

      const ptsEV = curve.map((d) => `${xPos(d.h).toFixed(1)},${yEV(d.ev).toFixed(1)}`).join(' ');
      const ptsP = curve.map((d) => `${xPos(d.h).toFixed(1)},${yP(d.p).toFixed(1)}`).join(' ');
      const zeroY = yEV(0);

      svg.innerHTML = `
        <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${HH - padB}" stroke="#d6d0c4" stroke-width="1"/>
        <line x1="${padL}" y1="${HH - padB}" x2="${W - padR}" y2="${HH - padB}" stroke="#d6d0c4" stroke-width="1"/>
        <line x1="${padL}" y1="${zeroY.toFixed(1)}" x2="${W - padR}" y2="${zeroY.toFixed(1)}" stroke="#c75d2c" stroke-opacity="0.4" stroke-dasharray="4 3"/>
        <text x="${padL - 8}" y="${padT + 4}" text-anchor="end" font-size="11" fill="#425f6a" font-family="system-ui,sans-serif">+$${(maxEV / 1e6).toFixed(1)}M</text>
        <text x="${padL - 8}" y="${zeroY + 4}" text-anchor="end" font-size="11" fill="#c75d2c" font-family="system-ui,sans-serif">$0</text>
        <text x="${W - padR + 8}" y="${padT + 4}" text-anchor="start" font-size="11" fill="#c78d4e" font-family="system-ui,sans-serif">100%</text>
        <text x="${W - padR + 8}" y="${HH - padB + 4}" text-anchor="start" font-size="11" fill="#c78d4e" font-family="system-ui,sans-serif">0%</text>
        ${[0, 10, 20, 30, 40].map((h) => `<text x="${xPos(h)}" y="${HH - 12}" text-anchor="middle" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">${h}h</text>`).join('')}
        <polyline fill="none" stroke="#c78d4e" stroke-width="2" stroke-dasharray="5 3" points="${ptsP}"/>
        <polyline fill="none" stroke="#425f6a" stroke-width="2.6" points="${ptsEV}"/>
        <line x1="${xPos(best.h).toFixed(1)}" y1="${padT}" x2="${xPos(best.h).toFixed(1)}" y2="${HH - padB}" stroke="#425f6a" stroke-opacity="0.35" stroke-width="1.2"/>
        <circle cx="${xPos(best.h).toFixed(1)}" cy="${yEV(best.ev).toFixed(1)}" r="5.5" fill="#425f6a" stroke="#fffefa" stroke-width="2"/>
      `;
    }

    ids.forEach((id) => $(id).addEventListener('input', update));
    update();
  }

  /* =========================================================
     5. Dark-Vessel Track-Gap Reachability Ellipse (Part V)
     ========================================================= */
  function initGapWidget() {
    if (!$('gap-hours')) return;
    const ids = ['gap-hours', 'gap-speed', 'gap-dist'];

    function update() {
      const dt = +$('gap-hours').value; // hours
      const vmax = +$('gap-speed').value; // knots
      const dist = +$('gap-dist').value; // nautical miles between fix A and fix B

      $('gap-hours-val').textContent = dt + ' h';
      $('gap-speed-val').textContent = vmax + ' kn';
      $('gap-dist-val').textContent = dist + ' nm';

      const budget = vmax * dt; // 2a
      const impossible = dist > budget;
      const a = budget / 2;
      const c = dist / 2;
      const b = impossible ? 0 : Math.sqrt(Math.max(0, a * a - c * c));
      const areaKm2 = impossible ? 0 : Math.PI * a * b * 1.852 * 1.852;
      const ecc = impossible ? null : (a > 0 ? c / a : 0);

      $('gap-budget-val').textContent = budget.toFixed(0) + ' nm';
      $('gap-area-val').textContent = impossible ? 'Impossible jump' : Math.round(areaKm2).toLocaleString() + ' km²';
      $('gap-status-val').textContent = impossible
        ? 'SPOOFING / SPEED FLAG'
        : ecc > 0.85
          ? 'Tight corridor'
          : 'Wide dark reach';
      $('gap-status-val').style.color = impossible ? '#c75d2c' : '#25231f';

      const svg = $('gap-svg');
      if (!svg) return;
      const W = 640, H = 220;
      const cx = W / 2, cy = H / 2;
      const scale = 1.65; // px per nm
      const rx = Math.min(280, a * scale);
      const ry = Math.min(92, b * scale);
      const fc = Math.min(260, c * scale);

      svg.innerHTML = `
        <rect x="0" y="0" width="${W}" height="${H}" fill="#1b1c1f" rx="4"/>
        <line x1="20" y1="${cy}" x2="${W - 20}" y2="${cy}" stroke="#2f3238" stroke-dasharray="3 4"/>
        <line x1="${cx}" y1="16" x2="${cx}" y2="${H - 16}" stroke="#2f3238" stroke-dasharray="3 4"/>
        ${impossible
          ? `<line x1="${cx - fc}" y1="${cy}" x2="${cx + fc}" y2="${cy}" stroke="#e06c43" stroke-width="2.5" stroke-dasharray="6 4"/>
             <text x="${cx}" y="${cy - 18}" text-anchor="middle" fill="#e06c43" font-family="system-ui,sans-serif" font-size="12" font-weight="600">FLAG: Separation (${dist} nm) exceeds max reach (${budget} nm)</text>`
          : `<ellipse cx="${cx}" cy="${cy}" rx="${rx.toFixed(1)}" ry="${ry.toFixed(1)}" fill="#c78d4e" fill-opacity="0.18" stroke="#e3a857" stroke-width="2"/>
             <line x1="${cx - fc}" y1="${cy}" x2="${cx + fc}" y2="${cy}" stroke="#7aa2b2" stroke-width="1.5" stroke-dasharray="4 3"/>`
        }
        <circle cx="${cx - fc}" cy="${cy}" r="5.5" fill="#7aa2b2" stroke="#fffefa" stroke-width="1.5"/>
        <circle cx="${cx + fc}" cy="${cy}" r="5.5" fill="#e3a857" stroke="#fffefa" stroke-width="1.5"/>
        <text x="${cx - fc}" y="${cy + 20}" text-anchor="middle" fill="#b7c0c8" font-family="system-ui,sans-serif" font-size="11">Last AIS fix</text>
        <text x="${cx + fc}" y="${cy + 20}" text-anchor="middle" fill="#e3a857" font-family="system-ui,sans-serif" font-size="11">Reappearance</text>
      `;
    }

    ids.forEach((id) => $(id).addEventListener('input', update));
    update();
  }

  /* =========================================================
     6. SMC Lineage Collapse Visualizer (Part VI)
     ========================================================= */
  function initLineageWidget() {
    if (!$('smc-steps')) return;
    const ids = ['smc-steps', 'smc-seed'];

    // Deterministic PRNG (mulberry32) so every seed is reproducible
    function rng(seed) {
      let a = seed >>> 0;
      return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }

    function update() {
      const steps = +$('smc-steps').value;
      const seed = +$('smc-seed').value;
      $('smc-steps-val').textContent = steps + ' BTO pings';
      $('smc-seed-val').textContent = 'Seed #' + seed;

      const P = 24; // 24 visible particles (top half = North, bottom half = South)
      const rand = rng(seed * 1337 + 42);
      const layers = [Array.from({ length: P }, (_, i) => ({ idx: i, root: i, parent: i }))];

      for (let t = 1; t <= steps; t++) {
        const prev = layers[t - 1];
        // Random unequal weights that trigger resampling
        const w = prev.map(() => Math.pow(rand(), 2.2) + 0.03);
        const wSum = w.reduce((a, b) => a + b, 0);
        const cdf = [];
        let acc = 0;
        for (let i = 0; i < P; i++) {
          acc += w[i] / wSum;
          cdf.push(acc);
        }
        const next = [];
        for (let i = 0; i < P; i++) {
          const u = (i + rand()) / P;
          let pick = 0;
          while (pick < P - 1 && cdf[pick] < u) pick++;
          next.push({ idx: i, root: prev[pick].root, parent: pick });
        }
        layers.push(next);
      }

      const finalLayer = layers[steps];
      const uniqueRoots = new Set(finalLayer.map((p) => p.root));
      const southCount = finalLayer.filter((p) => p.root >= P / 2).length;
      const southShare = southCount / P;

      $('smc-roots-val').textContent = `${uniqueRoots.size} / ${P}`;
      $('smc-south-val').textContent = (southShare * 100).toFixed(0) + '%';
      $('smc-ess-val').textContent = '100% (reset after resample)';

      const svg = $('smc-svg');
      if (!svg) return;
      const W = 640, H = 220, padL = 36, padR = 36, padT = 18, padB = 26;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;

      const xPos = (t) => padL + (steps === 0 ? 0 : (t / Math.max(1, steps)) * plotW);
      const yPos = (i) => padT + (i / (P - 1)) * plotH;

      let lines = '';
      for (let t = 1; t <= steps; t++) {
        for (let i = 0; i < P; i++) {
          const node = layers[t][i];
          const alive = uniqueRoots.has(node.root);
          const col = node.root >= P / 2 ? '#c78d4e' : '#425f6a';
          lines += `<line x1="${xPos(t - 1).toFixed(1)}" y1="${yPos(node.parent).toFixed(1)}" x2="${xPos(t).toFixed(1)}" y2="${yPos(i).toFixed(1)}" stroke="${col}" stroke-opacity="${alive ? '0.78' : '0.14'}" stroke-width="${alive ? '1.8' : '1'}"/>`;
        }
      }

      let dots = '';
      for (let t = 0; t <= steps; t++) {
        for (let i = 0; i < P; i++) {
          const node = layers[t][i];
          const col = node.root >= P / 2 ? '#c78d4e' : '#425f6a';
          dots += `<circle cx="${xPos(t).toFixed(1)}" cy="${yPos(i).toFixed(1)}" r="${t === steps ? 3.2 : 2.1}" fill="${col}"/>`;
        }
      }

      svg.innerHTML = `
        <line x1="${padL}" y1="${H / 2}" x2="${W - padR}" y2="${H / 2}" stroke="#e4e0d8" stroke-dasharray="3 3"/>
        <text x="10" y="${padT + 14}" font-size="10.5" fill="#425f6a" font-family="system-ui,sans-serif">N</text>
        <text x="10" y="${H - padB - 6}" font-size="10.5" fill="#c78d4e" font-family="system-ui,sans-serif">S</text>
        ${lines}
        ${dots}
        <text x="${W / 2}" y="${H - 6}" text-anchor="middle" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">Resampling steps (t = 0 → ${steps})</text>
      `;
    }

    ids.forEach((id) => $(id).addEventListener('input', update));
    update();
  }

  initReadingProgress();
  initLightbox();
  initCoverageWidget();
  initEchoWidget();
  initRepeatWidget();
  initGridWidget();
  initAbsenceWidget();
  initStoppingWidget();
  initGapWidget();
  initLineageWidget();
})();
