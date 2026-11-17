# Rory Millard — personal website

Personal writing and research portfolio. Static HTML, CSS and JavaScript; deployable on GitHub Pages without a runtime or hosting service.

## Structure

- `index.html` — homepage
- `writing.html` — writing index
- `projects.html` — projects index
- `about.html` and `contact.html` — background and contact
- `notes/` — published HTML versions of notes
- `_content/` — editable Markdown source for notes
- `assets/` — stylesheet and interactive experiment script

## Running locally

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000/>.

## Publishing

Upload these files to a GitHub Pages repository with `index.html` at its root. In repository Settings → Pages, use Deploy from branch → main → /(root). The `.nojekyll` file keeps underscore-prefixed source folders available.

## Editing notes

Edit Markdown in `_content/`. The corresponding HTML file in `notes/` is the published page and needs regenerating when Markdown changes. This repository doesn't require a build at deploy time. Interactive exhibits can use small, standalone JavaScript modules in `assets/`.

No analytics or server-side services are included. Contact links use `mailto:`.
