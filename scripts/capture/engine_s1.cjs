const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  const share = Buffer.from(JSON.stringify({ v: 1, cam: { center: [-122.85, 37.72], zoom: 11, bearing: 0, pitch: 0 }, live: [] })).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  await page.goto(`${process.env.ABYSSAL_URL || 'http://127.0.0.1:8501'}/`);
  await page.waitForTimeout(2500);
  await page.getByText('See the Evidence Map: one witness, five echoes').click();
  await page.waitForTimeout(6000);
  await require('./prep.cjs')(page);
  await page.evaluate((h) => { window.location.hash = h; }, `#ops=${share}`);
  const ops = page.locator('button.rail-btn', { hasText: 'Ops console' });
  console.log('ops buttons', await ops.count());
  if (await ops.count()) { const p = await ops.first().getAttribute('aria-pressed'); if (p !== 'true') await ops.first().click(); }
  await page.waitForTimeout(5000);
  const closeOps = page.locator('.ops-console button[aria-label*="Close"], .ops-panel button[aria-label*="Close"]');
  console.log('close ops', await closeOps.count());
  await page.mouse.click(573, 204); // minimise the ops panel
  await page.mouse.click(247, 122); // collapse the archive
  await page.waitForTimeout(800);
  await page.screenshot({ path: OUT + '/s1-0.png' });
  const btn = page.locator('button.rail-btn', { hasText: 'Signal Lab' });
  console.log('signal lab buttons', await btn.count(), await btn.first().isDisabled());
  await btn.first().click();
  await page.waitForTimeout(1000);
  await page.getByText('Real radar: Sentinel-1').click();
  await page.getByRole('button', { name: 'List scenes here' }).click();
  await page.waitForSelector('text=/in tile/', { timeout: 60000 });
  const sel = page.locator('select').filter({ has: page.locator('option', { hasText: 'S1A' }) }).first();
  const opts = await sel.locator('option').allTextContents();
  console.log('scenes', opts.length, opts.slice(0, 5));
  const target = opts.find(o => o.startsWith('2023-')) ;
  await page.screenshot({ path: OUT + '/s1-1.png' });
  await page.getByRole('button', { name: 'Fetch window and run' }).click();
  await page.waitForSelector('text=/Receipt/', { timeout: 120000 });
  await page.waitForTimeout(3000);
  await page.mouse.move(560, 560); await page.mouse.wheel(0, 520); // zoom out about one level: frame the radar window with real coastline
  await page.waitForTimeout(3500);
  await page.screenshot({ path: OUT + '/s1-2.png' });
  await page.getByText('Receipt').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: OUT + '/s1-3.png' });
  const wide = await page.evaluate(() => {
    const panel = document.querySelector('.sl-panel');
    const pr = panel.getBoundingClientRect();
    const out = [];
    let a = panel;
    while (a && a !== document.body) { const r = a.getBoundingClientRect(); out.push(`UP ${a.tagName}.${a.className} w=${Math.round(r.width)} sw=${a.scrollWidth} cw=${a.clientWidth} left=${Math.round(r.left)}`); a = a.parentElement; if (out.length > 5) break; }
    for (const el of panel.children) { const r = el.getBoundingClientRect(); out.push(`CHILD ${el.tagName}.${el.className} w=${Math.round(r.width)} sw=${el.scrollWidth}`); }
    for (const el of panel.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0) out.push(`SW ${el.tagName}.${el.className} sw=${el.scrollWidth} cw=${el.clientWidth} ${el.textContent.slice(0,40)}`);
      if (r.right > pr.right + 1 && r.width > 0) out.push(`${el.tagName}.${el.className} w=${Math.round(r.width)} right=${Math.round(r.right)} panelRight=${Math.round(pr.right)} pw=${Math.round(pr.width)}`);
    }
    return out.slice(0, 40);
  });
  console.log(wide.join('\n'));
  const err = await page.locator('.sl-error').allTextContents();
  console.log('errors', err);
  await browser.close();
})();
