// Workspace and case screenshots for the ABYSSAL showcase, over real basemaps.
// Usage: node recap_ws.cjs OUT_DIR [BASE_URL] [only,comma,separated]
const { chromium } = require('playwright');
const prep = require('./prep.cjs');
const OUT = process.argv[2];
const BASE = process.argv[3] || 'http://127.0.0.1:8501';
const ONLY = (process.argv[4] || '').split(',').filter(Boolean);
const DEMO = 'See the Evidence Map: one witness, five echoes';

async function rail(page, name) { await page.locator('button.rail-btn', { hasText: name }).first().click(); await page.waitForTimeout(1800); }
async function top(page, name) { await page.getByRole('button', { name, exact: true }).first().click(); await page.waitForTimeout(1800); }
async function collapse(page) { const b = page.getByRole('button', { name: 'Collapse Sources' }); if (await b.count()) { await b.first().click(); await page.waitForTimeout(800); } }
async function scrollPanelTo(page, re) { const t = page.getByText(re).first(); if (await t.count()) { await t.scrollIntoViewIfNeeded(); await page.waitForTimeout(600); } }
async function openCaseCard(page, title) {
  // Example cards on the landing page, in order: AF447, MH370, Merchant Royal. Each has one "Open ..." button.
  const order = ['AF447', 'MH370', 'Merchant Royal'];
  const buttons = page.locator('a, button').filter({ hasText: /^Open (example workspace|reference case)$/ });
  await buttons.nth(order.indexOf(title)).click();
}

const DEMO_SHOTS = [
  ['demo-workspace', async (p) => {}],
  ['demo-live', async (p) => { await collapse(p); }],
  ['evidence-map-live', async (p) => { await collapse(p); await rail(p, 'Evidence Map'); }],
  ['evidence-map', async (p) => { await rail(p, 'Evidence Map'); }],
  ['search-information', async (p) => { await collapse(p); await rail(p, 'Search Information'); }],
  ['evidence-geometry', async (p) => { await collapse(p); await rail(p, 'Evidence geometry'); }],
  ['provenance-live', async (p) => { await collapse(p); await rail(p, 'Fusion graph'); }],
  ['provenance-graph', async (p) => { await rail(p, 'Fusion graph'); }],
  ['replay', async (p) => { await collapse(p); await rail(p, 'Retrospective replay'); }],
  ['where-next', async (p) => { await top(p, 'Where next?'); }],
  ['live-search-loop', async (p) => { await top(p, 'Where next?'); await scrollPanelTo(p, /Mark swept|searched/i); }],
  ['plan-studio', async (p) => { await top(p, 'Plan Studio'); }],
  ['plan-studio-ev', async (p) => { await top(p, 'Plan Studio'); await scrollPanelTo(p, /Expected value/i); }],
  ['movement', async (p) => { await top(p, 'Movement & time'); }],
  ['layers', async (p) => { await top(p, 'Layers'); }],
  ['search-health', async (p) => { await collapse(p); await p.locator('button.search-health-chip').first().click(); await p.waitForTimeout(1500); }],
];
const CASES = [
  ['land-search', 'landing:Try the fictional land search', 'satellite', async (p) => {}],
  ['af447-live', 'card:AF447', 'satellite', async (p) => {}],
  ['mh370-live', 'card:MH370', 'satellite', async (p) => {}],
  ['merchant-royal-live', 'card:Merchant Royal', 'satellite', async (p) => {}],
  ['sketch-live', 'card:Merchant Royal', 'satellite', async (p) => { await top(p, 'Sketch evidence'); }],
  ['watchlist-live', 'landing:Track many at once: twelve vessels gone dark', 'ocean', async (p) => {}],
];
const want = (n) => !ONLY.length || ONLY.includes(n);

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.25, colorScheme: 'dark' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  for (const [name, act] of DEMO_SHOTS) {
    if (!want(name)) continue;
    try {
      await page.goto(BASE + '/'); await page.waitForTimeout(2000);
      await page.getByText(DEMO).click(); await page.waitForTimeout(6000);
      await prep(page, 'satellite');
      await act(page);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT}/${name}.png` });
      console.log('ok', name);
    } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); }
  }
  for (const [name, how, bm, act] of CASES) {
    if (!want(name)) continue;
    try {
      await page.goto(BASE + '/'); await page.waitForTimeout(2000);
      const [kind, title] = how.split(/:(.*)/s);
      if (kind === 'landing') await page.getByText(title).first().click(); else await openCaseCard(page, title);
      await page.waitForTimeout(7000);
      await prep(page, bm).catch((e) => console.log('  (no basemap control)', e.message.split('\n')[0]));
      await act(page);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${OUT}/${name}.png` });
      console.log('ok', name);
    } catch (e) { console.log('FAIL', name, e.message.split('\n')[0]); }
  }
  await browser.close();
})();
