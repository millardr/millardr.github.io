# Rory Millard — personal website

Writing and research portfolio, including the nine-part ABYSSAL series. Static HTML, CSS and JavaScript, served by GitHub Pages with no build step at deploy time.

## Structure

- `index.html`, `writing.html`, `projects.html`, `projects/abyssal.html`, `about.html`, `contact.html`: site pages (generated).
- `abyssal/`: the ABYSSAL series hub and its nine parts (generated).
- `notes/the-fifth-miss.html`: working note with an interactive model (generated). The other files in `notes/` are redirects to the parts of the series that replaced them, so old links keep working.
- `_series/`: sources for the series. Each part is an HTML fragment that starts with a `<!--meta {...} -->` JSON header.
- `_pages/`: sources for the other pages, in the same format.
- `assets/series.css`: the shared design system, and the ABYSSAL showcase's identity (graphite and Ember, dark by default).
- `assets/site.css`: the main site's identity, Oxford ink (paper, ink and Oxford blue; light and dark), loaded on every page outside `/abyssal/`. Pages get `html.site` or `html.abyssal`, and each section remembers its own theme choice.
- `assets/series.js`: page chrome (theme, progress bar, table of contents, lightbox, reveal) and the interactive labs. Each lab is a `<div class="lab" data-lab="...">` block in a fragment; the script finds it by name.
- `assets/abyssal/`: screenshots of the running ABYSSAL application, as WebP.
- `scripts/build_site.py`: renders every fragment into its page. No dependencies.
- `scripts/arch_svg.py`: draws the ABYSSAL architecture chart in two layouts, `_svg/abyssal-architecture.svg` (landscape) and `_svg/abyssal-architecture-mobile.svg` (portrait, shown below 760 px); pages inline them with `{{INCLUDE:...}}`. Re-run it after editing the chart, then rebuild.
- `scripts/capture/`: Playwright scripts that recapture the ABYSSAL screenshots from a running workbench over real basemaps, and `SHOTLIST.md` for the images still to redo.

Underscore-prefixed source folders are not published by GitHub Pages' default Jekyll step, which is intended.

## Editing

1. Edit a fragment in `_series/` or `_pages/`.
2. Run `python3 scripts/build_site.py` from the repository root.
3. Commit the fragment and the regenerated HTML together.

Maths is written as `\( ... \)` (inline) and `\[ ... \]` (display) and rendered in the browser by KaTeX from jsDelivr. Fonts come from Google Fonts. The site has no analytics.

## Running locally

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/>.
