const { chromium } = require('playwright');
const OUT = process.argv[2];
const TABS = [
  ['tracks', 'Dark tracks · multi-pass', 'Run SCENARIO passes', null, null, -420], // fixed scenario box W of Iberia: zoom into its centre, off the coast
  ['impact', 'Impact rings · splash clock', 'Run SCENARIO scene', null, null, [240, -480]], // fixed open-ocean scene with no imagery at this zoom: zoom so the scene fills the map
  ['sofar', 'Ocean-basin acoustics · SOFAR', 'Run SCENARIO event', null, '46.5, -13'],
  ['magnetic', 'Magnetic dipoles', 'Run SCENARIO survey', null, '50.07, -5.50'],
  ['debris', 'Debris back-track', 'Run SCENARIO drift', null, '46.5, -13'],
  ['seabed', 'Seabed · multibeam & side-scan', null, 'Try the Andrea Doria (sank 1956, 73 m)'],
];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'dark' });
  page.on('pageerror', e => console.log('PAGEERROR', e.message));
  await page.goto(`${process.env.ABYSSAL_URL || 'http://127.0.0.1:8501'}/`);
  await page.waitForTimeout(2500);
  await page.getByText('See the Evidence Map: one witness, five echoes').click();
  await page.waitForTimeout(6000);
  await require('./prep.cjs')(page);
  // Centre the map over open water (Bay of Biscay) so scenario scenes sit on the sea, not on land.
  const share = Buffer.from(JSON.stringify({ v: 1, cam: { center: [-9.5, 47.2], zoom: 7, bearing: 0, pitch: 0 }, live: [] })).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  await page.evaluate((h) => { window.location.hash = h; }, `#ops=${share}`);
  const ops = page.locator('button.rail-btn', { hasText: 'Ops console' });
  if (await ops.count()) await ops.first().click();
  await page.waitForTimeout(3000);
  await page.mouse.click(573, 204);
  await page.mouse.click(247, 122);
  await page.locator('button.rail-btn', { hasText: 'Signal Lab' }).first().click();
  await page.waitForTimeout(1000);
  const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
  for (const [id, tab, btn, link, place, zoomWheel, basemap] of TABS) {
    if (ONLY.length && !ONLY.includes(id)) continue;
    try {
      if (place) { // scenarios are generated at the map centre: put each over open water with imagery
        const box = page.getByPlaceholder(/Go to place/).first();
        await box.fill(place); await box.press('Enter'); await page.waitForTimeout(4500);
      }
      await page.getByText(tab, { exact: true }).click();
      await page.waitForTimeout(500);
      if (btn) await page.getByRole('button', { name: btn }).click();
      if (link) await page.getByRole('button', { name: link }).click();
      await page.waitForFunction(() => !document.body.innerText.includes('Running…') && !document.body.innerText.includes('Fetching'), null, { timeout: 120000 });
      await page.waitForTimeout(3500);
      if (basemap) { await page.locator('select[aria-label="Basemap"]').first().selectOption(basemap); await page.waitForTimeout(3500); }
      if (zoomWheel) { const [ax, dz] = Array.isArray(zoomWheel) ? zoomWheel : [640, zoomWheel]; await page.mouse.move(ax, 560); await page.mouse.wheel(0, dz); await page.waitForTimeout(3500); }
      await page.screenshot({ path: `${OUT}/g-${id}.png` });
      console.log('ok', id, await page.locator('.sl-error').allTextContents());
    } catch (e) { console.log('fail', id, e.message.split('\n')[0]); }
  }
  await browser.close();
})();
