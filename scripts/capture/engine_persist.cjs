const { chromium } = require('playwright');
const OUT = process.argv[2];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  const share = Buffer.from(JSON.stringify({ v: 1, cam: { center: [-120.17, 34.37], zoom: 11, bearing: 0, pitch: 0 }, live: [] })).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  await page.goto(`${process.env.ABYSSAL_URL || 'http://127.0.0.1:8501'}/`);
  await page.waitForTimeout(2500);
  await page.getByText('See the Evidence Map: one witness, five echoes').click();
  await page.waitForTimeout(6000);
  await require('./prep.cjs')(page);
  await page.evaluate((h) => { window.location.hash = h; }, `#ops=${share}`);
  const ops = page.locator('button.rail-btn', { hasText: 'Ops console' });
  if (await ops.count()) { const p = await ops.first().getAttribute('aria-pressed'); if (p !== 'true') await ops.first().click(); }
  await page.waitForTimeout(5000);
  await page.mouse.click(573, 204);
  await page.mouse.click(247, 122);
  await page.locator('button.rail-btn', { hasText: 'Signal Lab' }).first().click();
  await page.waitForTimeout(1000);
  await page.getByRole('tab', { name: /Persistence/ }).click().catch(async () => { await page.getByText('Persistence · many passes').click(); });
  await page.waitForTimeout(500);
  const mode = process.argv[3] || 'real';
  if (mode === 'scenario') {
    await page.getByRole('button', { name: 'Run SCENARIO' }).click();
    await page.waitForSelector('text=/Against the answer key/', { timeout: 60000 });
    await page.getByText('Show the answer key').click();
  } else {
    await page.getByText('Real radar: Sentinel-1 passes').click();
    await page.getByRole('button', { name: 'Try the Santa Barbara Channel oil platforms' }).click();
    await page.waitForSelector('text=/Fixed: same spot/', { timeout: 180000 });
  }
  await page.waitForTimeout(3000);
  await page.mouse.move(560, 560); await page.mouse.wheel(0, 520); // zoom out about one level: frame the radar window with real coastline
  await page.waitForTimeout(3500);
  await page.screenshot({ path: OUT + `/persist-${mode}.png` });
  console.log('errors', await page.locator('.sl-error').allTextContents());
  await browser.close();
})();
