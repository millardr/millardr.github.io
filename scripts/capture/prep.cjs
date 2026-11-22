// Real basemap for showcase captures: Esri World Imagery (or another basemap), and the context
// elevation raster hidden so the imagery shows. Display only: nothing in the model changes.
module.exports = async function prep(page, basemap = process.env.BASEMAP || 'satellite') {
  const sel = page.locator('select[aria-label="Basemap"]').first();
  await sel.waitFor({ timeout: 20000 });
  await sel.selectOption(basemap);
  const btn = page.locator('button.rail-btn', { hasText: 'Map layers' }).first();
  if (await btn.count()) {
    await btn.click();
    await page.waitForTimeout(600);
    const boxes = page.locator('label:has-text("elevation") input[type=checkbox], label:has-text("Elevation") input[type=checkbox]');
    for (let i = 0; i < await boxes.count(); i++) { if (await boxes.nth(i).isChecked()) await boxes.nth(i).uncheck(); }
    const close = page.getByRole('button', { name: /^Close/ }).first();
    if (await close.count()) await close.click().catch(() => {});
    else await btn.click();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(3500);
};
