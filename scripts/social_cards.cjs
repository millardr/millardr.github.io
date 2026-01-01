// Render a 1200 x 630 share card per page from _data/cards.json (written by build_site.py).
//
//   node scripts/social_cards.cjs && python3 scripts/build_site.py
//
// Cards use the site's own fonts and two identities: the main site (navy and electric blue) and
// ABYSSAL (graphite and ember). Output: assets/cards/<slug>.jpg, referenced by og:image and JSON-LD.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const cards = JSON.parse(fs.readFileSync(path.join(ROOT, '_data', 'cards.json'), 'utf8'));
const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clip = (s, n) => (s.length > n ? s.slice(0, n - 1).replace(/[\s,;:.]+\S*$/, '') + '…' : s);

function page(c) {
  const ab = c.theme === 'abyssal';
  const bg = ab ? '#0e0d0c' : '#061533';
  const glow = ab
    ? 'radial-gradient(ellipse 48% 62% at 80% 58%, rgba(252,210,92,.55), rgba(240,112,46,.38) 30%, rgba(179,54,122,.22) 55%, rgba(59,15,112,.10) 75%, transparent 85%)'
    : 'radial-gradient(ellipse 50% 62% at 82% 56%, rgba(95,212,255,.42), rgba(34,87,230,.30) 38%, rgba(34,87,230,.08) 70%, transparent 85%)';
  const accent = ab ? '#f0a04b' : '#5fd4ff';
  const titleFont = ab ? "'Newsreader', Georgia, serif" : "'Inter Tight', 'Inter', sans-serif";
  const titleWeight = ab ? 500 : 700;
  const rings = [0.95, 0.75, 0.55, 0.36, 0.18].map((k, i) =>
    `<ellipse cx="960" cy="360" rx="${300 * k}" ry="${210 * k}" fill="none" stroke="${ab ? '#ffd9a8' : '#bfe9ff'}" stroke-opacity="${0.10 + i * 0.07}" stroke-width="1.6"/>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Inter+Tight:wght@600;700&family=JetBrains+Mono:wght@500;600&family=Newsreader:opsz,wght@6..72,500&display=block" rel="stylesheet">
<style>
  html,body{margin:0;width:1200px;height:630px;overflow:hidden;background:${bg};}
  .c{position:relative;width:1200px;height:630px;box-sizing:border-box;padding:64px 72px;color:#f4f1ea;font-family:Inter,sans-serif;}
  .glow{position:absolute;inset:0;background:${glow};}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:40px 40px;}
  svg{position:absolute;inset:0}
  .k{position:relative;font-family:'JetBrains Mono',monospace;font-size:22px;letter-spacing:.2em;text-transform:uppercase;color:${accent};display:flex;align-items:center;gap:14px}
  .k i{width:14px;height:14px;border-radius:50%;background:${accent};box-shadow:0 0 18px ${accent}}
  h1{position:relative;margin:34px 0 0;max-width:820px;font-family:${titleFont};font-weight:${titleWeight};line-height:1.06;letter-spacing:-.02em;font-size:72px}
  p{position:relative;margin:24px 0 0;max-width:760px;font-size:27px;line-height:1.4;color:rgba(244,241,234,.78)}
  .f{position:absolute;left:72px;right:72px;bottom:52px;display:flex;justify-content:space-between;align-items:center;font-size:24px}
  .f b{font-weight:600}
  .f span{font-family:'JetBrains Mono',monospace;font-size:20px;color:rgba(244,241,234,.66)}
</style></head><body><div class="c">
  <div class="glow"></div><div class="grid"></div>
  <svg width="1200" height="630">${rings}</svg>
  <div class="k"><i></i>${esc(c.kicker || (ab ? 'ABYSSAL' : 'Rory Millard'))}</div>
  <h1 id="t">${esc(c.title)}</h1>
  <p id="d">${esc(clip(c.desc, 170))}</p>
  <div class="f"><b>Rory Millard</b><span>millardr.github.io</span></div>
</div></body></html>`;
}

(async () => {
  const outDir = path.join(ROOT, 'assets', 'cards');
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const p = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  for (const c of cards) {
    if (c.slug === '404') continue;
    await p.setContent(page(c), { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    // fit the title to three lines and keep the description clear of the footer
    await p.evaluate(() => {
      const t = document.getElementById('t'), d = document.getElementById('d');
      let fs = 72;
      while (fs > 44 && t.getBoundingClientRect().height > fs * 1.06 * 3 + 2) { fs -= 2; t.style.fontSize = fs + 'px'; }
      if (d.getBoundingClientRect().bottom > 540) d.style.webkitLineClamp = '2', d.style.display = '-webkit-box', d.style.webkitBoxOrient = 'vertical', d.style.overflow = 'hidden';
      if (d.getBoundingClientRect().bottom > 540) d.style.display = 'none';
    });
    await p.screenshot({ path: path.join(outDir, `${c.slug}.jpg`), type: 'jpeg', quality: 86 });
    console.log('card', c.slug);
  }
  await browser.close();
})();
