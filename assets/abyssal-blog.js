(function () {
  const $ = (id) => document.getElementById(id);

  /* =========================================================
     1. Coverage Fallacy & Honest Progress Bar (Appendix A1/A2)
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
     2. Repeat Credit & Correlated Misses SVG Chart (Appendix A9/A10)
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

      // Render SVG curve for k = 1..10
      const svg = $('rep-svg');
      if (!svg) return;
      const W = 640, H = 210, padL = 44, padR = 20, padT = 18, padB = 30;
      const plotW = W - padL - padR;
      const plotH = H - padT - padB;
      const maxK = 10;

      const xPos = (n) => padL + ((n - 1) / (maxK - 1)) * plotW;
      const yPos = (val) => padT + (1 - val) * plotH;

      let ptsRepeat = [];
      let ptsIndep = [];
      let ptsBeta = [];

      for (let n = 1; n <= maxK; n++) {
        const sr = Math.pow(1 - e, 1 + rho * (n - 1));
        const si = Math.pow(1 - e, n);
        const sb = 1 / (n + 1); // Uniform shared-detectability family (A10)
        ptsRepeat.push(`${xPos(n).toFixed(1)},${yPos(sr).toFixed(1)}`);
        ptsIndep.push(`${xPos(n).toFixed(1)},${yPos(si).toFixed(1)}`);
        ptsBeta.push(`${xPos(n).toFixed(1)},${yPos(sb).toFixed(1)}`);
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
        ${[1, 2, 4, 6, 8, 10].map(n => `<text x="${xPos(n)}" y="${H - 10}" text-anchor="middle" font-size="11" fill="#6e6961" font-family="system-ui,sans-serif">${n}</text>`).join('')}
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

  /* =========================================================
     3. Interactive 10x10 Belief Grid (Region Assertion A11)
     ========================================================= */
  function initGridWidget() {
    const gridEl = $('belief-grid');
    if (!gridEl) return;

    const N = 10;
    const basePrior = [];
    let sum = 0;
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        const dx = c - 4.2;
        const dy = r - 4.5;
        const w = Math.exp(-(dx * dx + dy * dy) / 14) + 0.08;
        basePrior.push(w);
        sum += w;
      }
    }
    for (let i = 0; i < basePrior.length; i++) basePrior[i] /= sum;

    // Default selected region: 3x3 block near center-left
    let selected = new Set();
    function setDefaultRegion() {
      selected = new Set([22, 23, 24, 32, 33, 34, 42, 43, 44]);
    }
    setDefaultRegion();

    const cells = [];
    for (let i = 0; i < N * N; i++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'belief-cell';
      cell.setAttribute('aria-label', `Grid cell ${i + 1}`);
      cell.addEventListener('click', () => {
        if (selected.has(i)) {
          if (selected.size > 1) selected.delete(i);
        } else {
          if (selected.size < N * N - 1) selected.add(i);
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
      for (let i = 0; i < N * N; i++) {
        if (selected.has(i)) p += basePrior[i];
      }

      const scaleIn = q / p;
      const scaleOut = (1 - q) / (1 - p);

      let maxPost = 0;
      const post = basePrior.map((val, i) => {
        const v = selected.has(i) ? val * scaleIn : val * scaleOut;
        if (v > maxPost) maxPost = v;
        return v;
      });

      const kl =
        q * Math.log2(q / p) +
        (1 - q) * Math.log2((1 - q) / (1 - p));

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
        setDefaultRegion();
        $('assert-q').value = 5;
        update();
      });
    }
    update();
  }

  /* =========================================================
     4. Absence Assurance Calculator (Appendix A13)
     ========================================================= */
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

      const kExact =
        Math.log((psi * (1 - eps)) / ((1 - psi) * eps)) / -Math.log(1 - p);
      const kNeeded = Math.max(0, Math.ceil(kExact));

      const after5 =
        (psi * Math.pow(1 - p, 5)) /
        (1 - psi + psi * Math.pow(1 - p, 5));

      $('abs-k-val').textContent = kNeeded + (kNeeded === 1 ? ' visit' : ' visits');
      $('abs-5-val').textContent = (after5 * 100).toFixed(1) + '%';

      const barsEl = $('abs-bars');
      if (!barsEl) return;
      const maxBars = Math.min(15, Math.max(10, kNeeded + 2));
      barsEl.innerHTML = '';

      for (let k = 0; k <= maxBars; k++) {
        const pk =
          (psi * Math.pow(1 - p, k)) /
          (1 - psi + psi * Math.pow(1 - p, k));
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

  initCoverageWidget();
  initRepeatWidget();
  initGridWidget();
  initAbsenceWidget();
})();
