# Rory Millard — Personal Research Website

A standalone, responsive research portfolio and ABYSSAL research microsite. All HTML/CSS/JS is self-contained and works on GitHub Pages with no build step.

## Deploy

1. In your existing GitHub account, create a **public** repository named `<your-github-username>.github.io`.
2. Upload **the contents** of this folder to the repository root (not the containing folder).
3. In **Settings → Pages**, select **Deploy from a branch**, `main`, `/(root)`.
4. Your site will appear at `https://<your-github-username>.github.io/` after deployment.

For a project repo (e.g. `research-site`) GitHub Pages will serve it at `https://<username>.github.io/research-site/`; this site uses relative links to support either deployment.

## Local preview

From this directory:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000/`.

## Customize before publishing

- `contact.html` and the footer use the email address from your CV. Change if you want a different public-facing address.
- The GitHub links currently go to `https://github.com` because your username is not specified. Replace those links with your profile URL.
- The About page contains a **typographic portrait placeholder**; you can optionally replace it with your photo.
- The site says 'London' as your preferred location; change if you haven't moved yet or prefer not to publish location.
- The writing page marks unfinished essays as **in preparation** rather than inventing publications.
- The Fifth Miss is a toy mathematical example. Results are computed live with direct analytic formulae in `assets/site.js`; don't describe them as empirical results.

## Content

- `index.html` — homepage, featured work, and research notes
- `writing.html` — writing index and placeholders
- `about.html` — biography and ABYSSAL background
- `contact.html` — contact and social links
- `experiments/fifth-miss.html` — working interactive probability experiment
- `assets/style.css` — all styling
- `assets/site.js` — navigation, motion, copy-to-clipboard, and probabilistic model

## Technical notes

- No framework dependencies, build system, analytics, cookies, or backend.
- Fonts are fetched from Google Fonts; fallbacks work if fonts are unavailable.
- Contact uses mailto links rather than a nonfunctional form.
- This website is independent of your large ABYSSAL application and does not require its source code to be public.
