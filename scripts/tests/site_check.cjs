// Site checks: layout, errors, links, the maths in the labs, and keyboard / touch behaviour.
//
//   node scripts/tests/site_check.cjs            (needs Playwright's Chromium; serves the repo itself)
//
// Exits non-zero on any failure. Numerical checks compare the labs against independent reference
// calculations written here, not against their own output.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..', '..');
const PORT = 8790 + Math.floor(Math.random() * 100);
const BASE = `http://127.0.0.1:${PORT}`;
let failures = 0;
const ok = (cond, msg) => { if (cond) console.log('  ok  ', msg); else { failures++; console.log('  FAIL', msg); } };

const pages = () => {
  const out = [];
  for (const f of ['index.html', 'about.html', 'projects.html', 'writing.html', 'contact.html']) out.push(f);
  for (const f of fs.readdirSync(path.join(ROOT, 'abyssal'))) if (f.endsWith('.html')) out.push('abyssal/' + f);
  for (const f of fs.readdirSync(path.join(ROOT, 'notes'))) if (f.endsWith('.html') && !fs.readFileSync(path.join(ROOT, 'notes', f), 'utf8').includes('http-equiv="refresh"')) out.push('notes/' + f);
  return out;
};

async function layout(browser) {
  console.log('Layout, errors, images and local links');
  const seen = new Set();
  for (const [w, scheme] of [[320, 'light'], [390, 'dark'], [768, 'light'], [1366, 'dark']]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
    const p = await ctx.newPage();
    for (const pg of pages()) {
      const errs = [];
      p.removeAllListeners('pageerror'); p.removeAllListeners('console');
      p.on('pageerror', (e) => errs.push(e.message));
      p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      await p.goto(`${BASE}/${pg}`, { waitUntil: 'load' });
      await p.waitForTimeout(150);
      const r = await p.evaluate(() => ({
        over: document.documentElement.scrollWidth - window.innerWidth,
        broken: [...document.images].filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0).map((i) => i.src),
        links: [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => h && !/^(https?:|mailto:|#)/.test(h)),
        ids: (() => { const c = {}; document.querySelectorAll('[id]').forEach((e) => { c[e.id] = (c[e.id] || 0) + 1; }); return Object.keys(c).filter((k) => c[k] > 1); })(),
        nan: /\bNaN\b|\bInfinity\b|undefined/.test([...document.querySelectorAll('[data-read], output')].map((e) => e.textContent).join(' ')),
      }));
      const bad = [];
      if (r.over > 1) bad.push(`overflow ${r.over}px`);
      if (r.broken.length) bad.push('broken images ' + r.broken.join(', '));
      if (r.ids.length) bad.push('duplicate ids ' + r.ids.join(', '));
      if (r.nan) bad.push('NaN/Infinity in a readout');
      if (errs.length) bad.push('errors ' + errs.join(' | '));
      if (w === 1366) for (const href of r.links) {
        const url = new URL(href, `${BASE}/${pg}`).toString().split('#')[0];
        if (seen.has(url)) continue; seen.add(url);
        const res = await p.request.get(url);
        if (res.status() >= 400) bad.push(`link ${href} -> ${res.status()}`);
      }
      ok(!bad.length, `${w}px ${scheme} ${pg}${bad.length ? ': ' + bad.join('; ') : ''}`);
    }
    await ctx.close();
  }
}

async function regionMaths(browser) {
  console.log('Region lab: minimum-KL statement, every limiting case');
  const p = await browser.newPage();
  await p.goto(`${BASE}/abyssal/03-the-arithmetic-of-not-finding.html`);
  const res = await p.evaluate(() => {
    const L = window.AbyssalLabs;
    const n = 100;
    const prior = Array.from({ length: n }, (_, i) => 0.02 + Math.exp(-0.5 * (((i % 10) - 3) ** 2 / 4 + (Math.floor(i / 10) - 3) ** 2 / 3.24)));
    const s = prior.reduce((a, b) => a + b, 0);
    const P = prior.map((v) => v / s);
    // independent reference: rescale inside to q and outside to 1-q, KL computed cell by cell
    const ref = (mask, q) => {
      let pin = 0, pout = 0; for (let i = 0; i < n; i++) { if (mask[i]) pin += P[i]; else pout += P[i]; }
      const post = P.map((v, i) => (mask[i] ? (v * q) / pin : (v * (1 - q)) / pout));
      let D = 0; for (let i = 0; i < n; i++) if (post[i] > 0) D += post[i] * Math.log2(post[i] / P[i]);
      return { post, D };
    };
    const masks = {
      empty: Array(n).fill(false),
      one: Array.from({ length: n }, (_, i) => i === 33),
      blob: Array.from({ length: n }, (_, i) => [22, 23, 24, 32, 33, 34, 42, 43, 44].includes(i)),
      allButOne: Array.from({ length: n }, (_, i) => i !== 99),
      full: Array(n).fill(true),
    };
    const out = [];
    for (const [name, mask] of Object.entries(masks)) for (const q of [0.01, 0.05, 0.5, 0.95]) {
      const R = L.regionStatement(P, mask, q);
      const sum = R.post.reduce((a, b) => a + b, 0);
      const finite = R.post.every((v) => Number.isFinite(v) && v >= 0);
      const support = R.post.every((v, i) => (P[i] > 0) === (v > 0));
      let row = { name, q, valid: R.valid, reason: R.reason, sumErr: Math.abs(sum - 1), finite, support };
      if (R.valid) {
        const r = ref(mask, q);
        let inMass = 0; for (let i = 0; i < n; i++) if (mask[i]) inMass += R.post[i];
        row = { ...row, inErr: Math.abs(inMass - q), dErr: Math.abs(R.D - r.D), postErr: Math.max(...R.post.map((v, i) => Math.abs(v - r.post[i]) / r.post[i])), mult: R.mIn > 0 && R.mOut > 0 && Number.isFinite(R.mIn) && Number.isFinite(R.mOut) };
      } else {
        row = { ...row, unchanged: Math.max(...R.post.map((v, i) => Math.abs(v - P[i]))) < 1e-15, nullOut: R.D === null && R.mIn === null && R.mOut === null };
      }
      out.push(row);
    }
    return out;
  });
  for (const r of res) {
    const base = r.sumErr < 1e-12 && r.finite && r.support;
    if (r.name === 'empty' || r.name === 'full') ok(base && !r.valid && r.unchanged && r.nullOut && r.reason === r.name, `${r.name} region, q=${r.q}: refused (${r.reason}), map unchanged, no multipliers`);
    else ok(base && r.valid && r.inErr < 1e-12 && r.dErr < 1e-12 && r.postErr < 1e-12 && r.mult, `${r.name} region, q=${r.q}: sums to 1, region holds q, KL matches reference (${r.dErr.toExponential(1)})`);
  }
  // the page itself: select every cell, then clear
  await p.click('[data-lab="region"] [data-act="all"]');
  let ui = await p.evaluate(() => { const r = document.querySelector('[data-lab="region"]'); return { t: r.textContent, dis: r.querySelector('[name=q]').disabled, status: r.querySelector('[data-read=status]').textContent }; });
  ok(/whole map/.test(ui.status) && ui.dis && !/NaN|Infinity|-\d/.test(ui.t.replace(/×|–|—/g, '')), 'page, every cell selected: explains why, disables q, no invalid numbers');
  await p.click('[data-lab="region"] [data-act="clear"]');
  ui = await p.evaluate(() => document.querySelector('[data-lab="region"] [data-read=status]').textContent);
  ok(/empty region/.test(ui), 'page, no cells selected: explains why');
  // keyboard: focus, move, toggle
  await p.focus('[data-lab="region"] canvas');
  await p.keyboard.press('ArrowLeft'); await p.keyboard.press('Enter');
  ui = await p.evaluate(() => document.querySelector('[data-lab="region"] [data-read=status]').textContent);
  ok(/^1 of 100 cells/.test(ui), 'keyboard: Enter adds the cell under the cursor');
  await p.close();
}

async function gridMaths(browser) {
  console.log('Grid lab: the 90 / 80 / 70 example against its closed form, keyboard, cancelled gestures');
  const p = await browser.newPage();
  await p.goto(`${BASE}/abyssal/03-the-arithmetic-of-not-finding.html`);
  await p.click('[data-lab="grid"] [data-act="fallacy"]');
  const read = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-lab="grid"] [data-read]')].map((e) => [e.dataset.read, e.textContent])));
  let r = await read();
  // P(found) = a * f * d = 0.9 * 0.8 * 0.7; outside share = (1 - a) / (1 - P(found))
  ok(r.found === '50.4%', `would have found: ${r.found} (closed form 50.4%)`);
  ok(r.outside === (100 * 0.1 / 0.496).toFixed(1) + '%', `outside share: ${r.outside} (closed form 20.2%)`);
  const sum = ['unsearched', 'missed', 'outside'].reduce((a, k) => a + parseFloat(r[k]), 0);
  ok(Math.abs(sum - 100) < 0.15, `ledger sums to 100% (${sum.toFixed(1)}%)`);
  ok(/bits$/.test(r.Hfull) && parseFloat(r.Hfull) > 0, `entropy with outside reported separately: ${r.H} given inside, ${r.Hfull} with outside`);
  await p.click('[data-lab="grid"] [data-act="reset"]');
  await p.focus('[data-lab="grid"] canvas');
  for (let k = 0; k < 8; k++) await p.keyboard.press('ArrowRight');
  for (let k = 0; k < 6; k++) await p.keyboard.press('ArrowDown');
  await p.keyboard.press('Enter'); // cell (8, 6), the peak of the larger blob
  r = await read();
  ok(parseFloat(r.last) > 0 && r.missed !== '0.0%', `keyboard search moved the map by ${r.last}`);
  // a cancelled gesture must stop painting
  const before = (await read()).missed;
  await p.evaluate(() => {
    const c = document.querySelector('[data-lab="grid"] canvas'), b = c.getBoundingClientRect();
    const ev = (t, x) => c.dispatchEvent(new PointerEvent(t, { pointerId: 7, bubbles: true, clientX: b.left + x, clientY: b.top + b.height / 2 }));
    ev('pointerdown', b.width * 0.9); ev('pointercancel', b.width * 0.9);
    for (let x = 0.1; x < 0.8; x += 0.05) ev('pointermove', b.width * x);
  });
  const after = (await read()).missed;
  const delta = parseFloat(after) - parseFloat(before);
  ok(delta < 1.5, `after pointercancel, moving the pointer searches nothing more (missed ${before} -> ${after})`);
  await p.close();
}

async function slidersAndExtremes(browser) {
  console.log('Every lab slider at its minimum and maximum');
  const p = await browser.newPage({ viewport: { width: 390, height: 800 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  for (const pg of pages().filter((x) => x.startsWith('abyssal/') || x.startsWith('notes/'))) {
    await p.goto(`${BASE}/${pg}`);
    const bad = await p.evaluate(async () => {
      const problems = [];
      for (const lab of document.querySelectorAll('[data-lab]')) {
        for (const inp of lab.querySelectorAll('input[type=range]')) {
          for (const v of [inp.min, inp.max, inp.min]) {
            inp.value = v; inp.dispatchEvent(new Event('input', { bubbles: true }));
            await new Promise((r) => requestAnimationFrame(() => r()));
            const txt = [...lab.querySelectorAll('[data-read], output')].map((e) => e.textContent).join(' ');
            if (/\bNaN\b|\bInfinity\b|undefined/.test(txt)) problems.push(`${lab.dataset.lab} ${inp.name}=${v}: ${txt.slice(0, 120)}`);
          }
        }
      }
      return problems;
    });
    ok(!bad.length, `${pg}${bad.length ? ': ' + bad.join(' | ') : ''}`);
  }
  ok(!errs.length, 'no script errors while sweeping sliders' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await p.close();
}

async function touchAndChrome(browser) {
  console.log('Touch scrolling over charts, mobile menu, lightbox');
  const ctx = await browser.newContext({ viewport: { width: 390, height: 760 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  for (const [pg, lab] of [['abyssal/03-the-arithmetic-of-not-finding.html', 'grid'], ['abyssal/03-the-arithmetic-of-not-finding.html', 'region'], ['abyssal/06-signals-from-the-deep.html', 'tdoa'], ['abyssal/05-where-next-and-when-to-stop.html', 'waterfill']]) {
    await p.goto(`${BASE}/${pg}`);
    await p.evaluate((l) => document.querySelector(`[data-lab="${l}"] canvas`).scrollIntoView({ block: 'center', behavior: 'instant' }), lab);
    await p.waitForTimeout(250);
    const box = await p.evaluate((l) => { const b = document.querySelector(`[data-lab="${l}"] canvas`).getBoundingClientRect(); return { x: b.left + b.width / 2, y: Math.min(b.top + b.height / 2, window.innerHeight - 40), sy: window.scrollY }; }, lab);
    // a finger lands on the chart and swipes up 300 px
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x, y: box.y }] });
    for (let k = 1; k <= 10; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: box.x, y: box.y - 30 * k }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(300);
    const sy = await p.evaluate(() => window.scrollY);
    ok(sy - box.sy > 100, `${lab}: a vertical swipe starting on the chart scrolls the page (${Math.round(sy - box.sy)} px)`);
  }
  await p.goto(`${BASE}/abyssal/engines.html`);
  await p.click('.menu-btn');
  ok(await p.evaluate(() => document.getElementById('site-nav').classList.contains('open')), 'menu opens');
  await p.keyboard.press('Escape');
  ok(await p.evaluate(() => !document.getElementById('site-nav').classList.contains('open') && document.activeElement.classList.contains('menu-btn') && document.querySelector('.menu-btn').getAttribute('aria-label') === 'Open menu'), 'Escape closes it, resets its label and returns focus');
  await p.click('.menu-btn'); await p.touchscreen.tap(200, 700);
  ok(await p.evaluate(() => !document.getElementById('site-nav').classList.contains('open')), 'a tap outside closes it');
  await ctx.close();

  const d = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await d.goto(`${BASE}/abyssal/engines.html`);
  const zoom = d.locator('button.zoom').first();
  await zoom.focus(); await d.keyboard.press('Enter'); await d.waitForTimeout(100);
  ok(await d.evaluate(() => { const lb = document.querySelector('.lightbox'); return !lb.hidden && document.activeElement.classList.contains('lb-close') && document.querySelector('main, .page, header').inert; }), 'lightbox opens from the keyboard, focuses Close, page behind is inert');
  await d.keyboard.press('Tab');
  ok(await d.evaluate(() => document.activeElement.classList.contains('lb-close')), 'Tab stays inside the dialog');
  await d.keyboard.press('Escape');
  ok(await d.evaluate(() => document.querySelector('.lightbox').hidden && document.activeElement.classList.contains('zoom')), 'Escape closes it and focus returns to the image button');
  await d.close();
}


async function storyMaths(browser) {
  console.log('Evidence-to-decision lab: Bayes step invariants and the provenance rule');
  const p = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto(`${BASE}/abyssal/index.html#story`);
  const r = await p.evaluate(() => {
    const { bayesStep } = window.AbyssalLabs;
    const m = Float64Array.from([0.3, 0.2, 0.2, 0.2]), out = 0.1;
    // hand-worked: search cells 0 and 1 with POD 0.7 -> L = [0.3, 0.3, 1, 1], Lout = 1
    const A = bayesStep(m, out, Float64Array.from([0.3, 0.3, 1, 1]), 1);
    const Z = 0.3 * 0.3 + 0.2 * 0.3 + 0.2 + 0.2 + 0.1; // 0.65
    const ref = [0.09 / Z, 0.06 / Z, 0.2 / Z, 0.2 / Z];
    const err = Math.max(...ref.map((v, i) => Math.abs(v - A.m[i])), Math.abs(0.1 / Z - A.out), Math.abs(A.Z - Z));
    const sum = A.m.reduce((a, b) => a + b, 0) + A.out;
    const flat = bayesStep(m, out, Float64Array.from([1, 1, 1, 1]), 1); // a pooled retelling
    let thrown = false; try { bayesStep(m, out, new Float64Array(4), 0); } catch (e) { thrown = true; }
    return { err, sum, kl: A.kl, flatKl: flat.kl, flatSame: Math.max(...flat.m.map((v, i) => Math.abs(v - m[i]))), thrown };
  });
  ok(r.err < 1e-15 && Math.abs(r.sum - 1) < 1e-15, `no-find step matches the hand calculation (Z = 0.65; max error ${r.err.toExponential(1)})`);
  ok(r.kl > 0 && r.flatKl === 0 && r.flatSame < 1e-16, `a pooled retelling moves the map 0 bits (the search moved ${r.kl.toFixed(3)})`);
  ok(r.thrown, 'evidence that rules out everywhere is refused, never silently renormalised');
  const read = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll('#story [data-read]')].map((e) => [e.dataset.read, e.textContent])));
  for (const ev of ['sighting', 'nofind', 'retell']) { await p.click(`#story [data-ev=${ev}]`); await p.waitForTimeout(750); }
  let u = await read();
  const total = ['un', 'miss', 'out'].reduce((a, k) => a + parseFloat(u[k]), 0);
  ok(Math.abs(total - 100) < 0.15 && u.bits === '0.00 bits', `after sighting, no-find, retelling: ledger ${total.toFixed(1)}%, retelling moved ${u.bits}`);
  await p.check('#story [name=double]');
  await p.click('#story [data-ev=retell]'); await p.waitForTimeout(750);
  u = await read();
  ok(parseFloat(u.bits) > 0.3 && /counted twice/.test(await p.textContent('#story .story-steps')), `counted twice by mistake, the same retelling moves ${u.bits} and is flagged`);
  ok(!(await p.textContent('#story [data-read=story]')).match(/(The map moved[^.]*\.).*\1/), 'status sentence is not repeated');
  ok(!errs.length, 'no script errors' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await p.close();
}


async function seo(browser) {
  console.log('Search: canonical URLs, share cards, structured data, sitemap, robots, feed');
  const SITEURL = 'https://millardr.github.io';
  const local = (u) => path.join(ROOT, u.replace(SITEURL + '/', '').replace(/\/$/, '/index.html') || 'index.html');
  const p = await browser.newPage();
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  for (const pg of pages()) {
    const htmlText = fs.readFileSync(path.join(ROOT, pg), 'utf8');
    const bad = [];
    const canon = [...htmlText.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => m[1]);
    if (canon.length !== 1 || !canon[0].startsWith(SITEURL + '/')) bad.push('canonical ' + JSON.stringify(canon));
    const og = (htmlText.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
    if (!og || !fs.existsSync(local(og))) bad.push('og:image missing ' + og);
    for (const k of ['og:url', 'og:title', 'og:description', 'og:site_name', 'twitter:card'])
      if (!htmlText.includes(`"${k}"`)) bad.push('no ' + k);
    const blocks = [...htmlText.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    let graph = [];
    try { graph = blocks.flatMap((b) => JSON.parse(b)['@graph']); } catch (e) { bad.push('JSON-LD does not parse: ' + e.message); }
    const of = (t) => graph.filter((n) => n['@type'] === t);
    const art = of('TechArticle')[0];
    if (art) {
      if (!art.headline || art.headline.length > 110) bad.push('headline');
      if (!iso.test(art.datePublished) || !iso.test(art.dateModified) || art.dateModified < art.datePublished) bad.push('dates');
      if (!art.author || !art.author[0].name || !art.author[0].url) bad.push('author');
      if (!art.image || !fs.existsSync(local(art.image[0]))) bad.push('article image');
    }
    const bc = of('BreadcrumbList')[0];
    if (pg !== 'index.html') {
      if (!bc) bad.push('no BreadcrumbList');
      else bc.itemListElement.forEach((it, i) => {
        if (it.position !== i + 1 || !it.name) bad.push('breadcrumb ' + i);
        if (i < bc.itemListElement.length - 1 && !it.item) bad.push('breadcrumb item url ' + i);
      });
    }
    if (pg === 'index.html') {
      const ws = of('WebSite')[0], person = of('Person')[0];
      if (!ws || ws.name !== 'Rory Millard' || ws.url !== SITEURL + '/') bad.push('WebSite');
      if (!person || person.name !== 'Rory Millard' || !person.sameAs) bad.push('Person');
      if (!htmlText.includes('google-site-verification')) bad.push('verification tag');
    }
    if (pg === 'about.html') {
      const pp = of('ProfilePage')[0];
      if (!pp || pp.mainEntity.name !== 'Rory Millard' || !of('ScholarlyArticle')[0]) bad.push('ProfilePage / paper');
    }
    if (pg === 'abyssal/evidence.html') {
      const ds = of('Dataset')[0];
      if (!ds || ds.description.length < 50 || !fs.existsSync(local(ds.distribution[0].contentUrl))) bad.push('Dataset');
    }
    ok(!bad.length, `${pg}${bad.length ? ': ' + bad.join('; ') : ' (' + graph.map((n) => n['@type']).join(', ') + ')'}`);
  }
  await p.goto(`${BASE}/sitemap.xml`);
  const sm = await p.evaluate(() => [...new DOMParser().parseFromString(document.documentElement.outerHTML.includes('urlset') ? new XMLSerializer().serializeToString(document) : '', 'application/xml').querySelectorAll('loc')].map((l) => l.textContent));
  const smText = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const locs = [...smText.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const missing = pages().filter((pg) => !locs.includes(pg === 'index.html' ? SITEURL + '/' : pg.endsWith('/index.html') ? `${SITEURL}/${pg.replace('index.html', '')}` : `${SITEURL}/${pg}`));
  const dead = locs.filter((u) => !fs.existsSync(local(u)) || fs.readFileSync(local(u), 'utf8').includes('http-equiv="refresh"'));
  ok(locs.length && !missing.length && !dead.length && sm !== null, `sitemap: ${locs.length} URLs, every page listed, no redirects or dead URLs${missing.length ? ' missing ' + missing : ''}${dead.length ? ' dead ' + dead : ''}`);
  ok(/Sitemap: https:\/\/millardr\.github\.io\/sitemap\.xml/.test(fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8')), 'robots.txt points to the sitemap');
  const feed = fs.readFileSync(path.join(ROOT, 'feed.xml'), 'utf8');
  const feedOk = await p.evaluate((x) => { const d = new DOMParser().parseFromString(x, 'application/xml'); return !d.querySelector('parsererror') && d.querySelectorAll('item').length; }, feed);
  const feedLinks = [...feed.matchAll(/<link>([^<]+)<\/link>/g)].map((m) => m[1]).slice(1);
  ok(feedOk >= 10 && feedLinks.every((u) => fs.existsSync(local(u))), `feed.xml parses, ${feedOk} items, every link exists`);
  ok(/noindex/.test(fs.readFileSync(path.join(ROOT, '404.html'), 'utf8')), '404 page exists and is noindex');
  await p.close();
}

(async () => {
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch();
  try {
    await seo(browser);
    await regionMaths(browser);
    await storyMaths(browser);
    await gridMaths(browser);
    await touchAndChrome(browser);
    await slidersAndExtremes(browser);
    await layout(browser);
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
  process.exit(failures ? 1 : 0);
})();
