# Showcase capture scripts

Playwright scripts that drive a running ABYSSAL workbench and save the screenshots used on the site.
They need Chromium and Playwright, the workbench at `http://127.0.0.1:8501` (or `ABYSSAL_URL`), and network
access to the basemap tile hosts listed in `SHOTLIST.md`.

- `prep.cjs`: switches the basemap (Surface imagery by default) and hides the context elevation raster so the
  basemap shows. Display only.
- `workspace.cjs OUT_DIR [BASE_URL] [names]`: the workspace, panel and case images.
- `engine_*.cjs OUT_DIR`: the Signal Lab engine images (`eng-*.webp`), cropped to 1640 × 945 afterwards.
- `SHOTLIST.md`: what each remaining image must show, for the Ops console and Signal Lab sets.
