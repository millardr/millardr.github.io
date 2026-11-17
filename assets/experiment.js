(function () {
  const el = (id) => document.getElementById(id);
  if (!el('misses')) return;

  const controls = ['misses', 'failure', 'detection'];

  function pct(x) {
    return (100 * x).toFixed(x < 0.01 ? 2 : 1) + '%';
  }

  function update() {
    const n = +el('misses').value;
    const f = +el('failure').value / 100;
    const d = +el('detection').value / 100;

    const p = (1 - f) * d;
    const a = (1 - p) ** n;
    const b = f + (1 - f) * (1 - d) ** n;
    const postA = a / (1 + a);
    const postB = b / (1 + b);

    el('misses-value').textContent = n;
    el('failure-value').textContent = Math.round(100 * f) + '%';
    el('detection-value').textContent = Math.round(100 * d) + '%';

    el('independent').textContent = pct(postA);
    el('persistent').textContent = pct(postB);

    const remaining = b > 0 ? ((1 - f) * (1 - d) ** n) / b : 0;
    el('retry').textContent = pct(postB * remaining * d);
    el('switch').textContent = pct(postB * p);
  }

  controls.forEach((k) => el(k).addEventListener('input', update));
  update();
})();
