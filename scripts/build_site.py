"""Build the site from fragments. No dependencies; run from the repository root:

    python3 scripts/build_site.py

Inputs
  _series/NN-slug.html   ABYSSAL series parts. Each starts with <!--meta {json} -->.
  _series/index.html     The series hub. Placeholders: {{PARTS}} {{TOTAL_WORDS}} {{LABS}}.
  _pages/**/*.html       Other pages. Meta keys: out, title, desc, active, layout (home|page|note),
                         image, kicker, h1, dek. Placeholders: {{PARTS}} {{TOTAL_WORDS}} {{PARTS_COMPACT}},
                         {{INCLUDE:path}} (inline a file, e.g. _svg/abyssal-architecture.svg made by
                         scripts/arch_svg.py).

Outputs are committed (GitHub Pages serves them as static files), so publishing needs no build.
Maths is written as \\( \\) and \\[ \\] and rendered in the browser by KaTeX.
"""

from __future__ import annotations

import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SERIES = ROOT / "_series"
PAGES = ROOT / "_pages"
SITE = "https://millardr.github.io"
EMAIL = "j7yma3egrrm9nxaa.16ls4@aleeas.com"
LINKEDIN = "https://www.linkedin.com/in/rorymillard1/"

# Old URLs that now live in the series. Each becomes a tiny redirect page so shared links keep working.
REDIRECTS = {
    "notes/abyssal.html": "abyssal/index.html",
    "notes/abyssal-map-first.html": "abyssal/02-a-map-that-refuses-to-lie.html",
    "notes/abyssal-five-echoes.html": "abyssal/04-five-echoes-one-witness.html",
    "notes/abyssal-negative-evidence.html": "abyssal/03-the-arithmetic-of-not-finding.html",
    "notes/abyssal-when-to-stop.html": "abyssal/05-where-next-and-when-to-stop.html",
    "notes/abyssal-ops-console.html": "abyssal/07-the-operating-picture.html",
    "notes/abyssal-epistemic-humility.html": "abyssal/08-three-cases-two-refusals.html",
    "experiments/fifth-miss.html": "notes/the-fifth-miss.html",
    "projects/abyssal.html": "abyssal/index.html",
}

def fonts(theme: str) -> str:
    """The main site adds Inter Tight for display type; ABYSSAL keeps its own set."""
    extra = "&family=Inter+Tight:wght@500;600;700" if theme == "site" else ""
    return (
        '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
        '  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700'
        "&family=JetBrains+Mono:wght@400;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;"
        f'1,6..72,400{extra}&display=swap">'
    )
KATEX = (
    '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">\n'
    '  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js" crossorigin="anonymous"></script>\n'
    '  <script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>'
)
# Two identities. The main site ("site") is deep Oxford-blue bands with a live probability field behind
# them and electric-blue accents, following the reader's system theme. The ABYSSAL showcase ("abyssal") is graphite and ember like the instrument itself, and
# opens dark. Each remembers its own choice, so toggling one never changes the other.
THEME_KEY = {"site": "theme-main", "abyssal": "theme-abyssal"}
THEME_DEFAULT = {"site": "", "abyssal": "dark"}


def theme_boot(theme: str) -> str:
    d = THEME_DEFAULT[theme]
    fallback = f"||'{d}'" if d else ""
    return (f"<script>try{{var t=localStorage.getItem('{THEME_KEY[theme]}'){fallback};"
            "if(t)document.documentElement.dataset.theme=t;}catch(e){"
            + (f"document.documentElement.dataset.theme='{d}';" if d else "") + "}</script>")


def theme_of(out: str) -> str:
    return "abyssal" if out.startswith("abyssal/") else "site"


# ---------------------------------------------------------------- helpers

def read_fragment(path: Path) -> tuple[dict, str]:
    raw = path.read_text(encoding="utf-8")
    m = re.match(r"\s*<!--meta\s*(\{.*?\})\s*-->\s*", raw, flags=re.S)
    if not m:
        raise SystemExit(f"{path}: missing <!--meta {{...}} --> header")
    return json.loads(m.group(1)), raw[m.end():]


def count_words(text: str) -> int:
    text = re.sub(r"<(script|style)\b.*?</\1>", " ", text, flags=re.S)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\\\(.*?\\\)|\\\[.*?\\\]", " x ", text, flags=re.S)
    return len(re.findall(r"[A-Za-z0-9’'-]+", text))


def head(title: str, desc: str, image: str, depth: str, maths: bool = True, theme: str = "abyssal") -> str:
    color = ('<meta name="theme-color" content="#0d0d0d">' if theme == "abyssal" else
             '<meta name="theme-color" content="#f7f5f0" media="(prefers-color-scheme: light)">\n'
             '  <meta name="theme-color" content="#0b1120" media="(prefers-color-scheme: dark)">')
    icon = "favicon.svg" if theme == "abyssal" else "rm.svg"
    css = f'<link rel="stylesheet" href="{depth}assets/series.css">'
    if theme == "site":
        css += f'\n  <link rel="stylesheet" href="{depth}assets/site.css">'
    return f"""<!doctype html>
<html lang="en" class="{theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(desc)}">
  <meta property="og:title" content="{html.escape(title)}">
  <meta property="og:description" content="{html.escape(desc)}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="{SITE}/assets/abyssal/{image}">
  <meta name="twitter:card" content="summary_large_image">
  {color}
  <link rel="icon" href="{depth}assets/{icon}" type="image/svg+xml">
  {theme_boot(theme)}
  {fonts(theme)}
  {KATEX if maths else ''}
  {css}
  <script defer src="{depth}assets/series.js"></script>
</head>"""


NAV = {
    "site": [("work", "projects.html", "Work"), ("writing", "writing.html", "Writing"),
             ("about", "about.html", "About"), ("contact", "contact.html", "Contact")],
    "abyssal": [("overview", "abyssal/index.html", "Overview"), ("machine", "abyssal/engines.html", "The machine"),
                ("evidence", "abyssal/evidence.html", "Real data"), ("series", "abyssal/01-a-tour.html", "Series"),
                ("labs", "abyssal/index.html#labs", "Labs")],
}


def topbar(depth: str, crumb: str, active: str, theme: str = "abyssal") -> str:
    links = "".join(
        f'<a href="{depth}{href}"{" aria-current=\"page\"" if key == active else ""}>{label}</a>'
        for key, href, label in NAV[theme]
    )
    controls = """<button class="theme-btn" type="button" aria-label="Toggle theme"></button>
      <button class="menu-btn" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="site-nav"><span></span><span></span></button>"""
    if theme == "abyssal":
        # Two tiers: the person's site above, the product (ABYSSAL) and its own sections below.
        site_links = "".join(f'<a href="{depth}{href}">{label}</a>' for _, href, label in NAV["site"])
        return f"""
<body>
  <a class="skip" href="#main">Skip to content</a>
  <div class="progress" aria-hidden="true"><span></span></div>
  <div class="sitebar">
    <div class="in">
      <a class="home" href="{depth}index.html"><span aria-hidden="true">&larr;</span> Rory Millard</a>
      <nav aria-label="Rory Millard's site">{site_links}</nav>
    </div>
  </div>
  <header class="topbar productbar">
    <div class="in">
      <a class="product" href="{depth}abyssal/index.html" aria-label="ABYSSAL, overview"><span class="pmark" aria-hidden="true"></span>ABYSSAL</a>
      <span class="crumb">{crumb}</span>
      <nav aria-label="ABYSSAL sections" id="site-nav"><span class="nav-k" aria-hidden="true">ABYSSAL</span>{links}<span class="nav-k site" aria-hidden="true">Rory Millard</span><span class="nav-site">{site_links}</span></nav>
      {controls}
    </div>
  </header>"""
    brand = f'<a class="brand" href="{depth}index.html">Rory Millard</a>'
    return f"""
<body>
  <a class="skip" href="#main">Skip to content</a>
  <div class="progress" aria-hidden="true"><span></span></div>
  <header class="topbar">
    <div class="in">
      {brand}
      <span class="crumb">{crumb}</span>
      <nav aria-label="Main navigation" id="site-nav">{links}</nav>
      {controls}
    </div>
  </header>"""


def foot(depth: str, theme: str = "abyssal") -> str:
    tag = ("ABYSSAL is a research prototype by Rory Millard: a Bayesian workbench for finding lost aircraft, ships and people."
           if theme == "abyssal" else "Engineer working where probability meets the physical world.")
    return f"""
  <footer class="foot">
    <div class="in">
      <div>
        <b>Rory Millard</b>
        <span>{tag}</span>
      </div>
      <nav aria-label="Footer">
        <a href="{depth}projects.html">Work</a>
        <a href="{depth}abyssal/index.html">ABYSSAL</a>
        <a href="{depth}writing.html">Writing</a>
        <a href="{depth}about.html">About</a>
        <a href="mailto:{EMAIL}">Email</a>
        <a href="{LINKEDIN}" rel="noopener noreferrer">LinkedIn</a>
      </nav>
    </div>
  </footer>
</body>
</html>
"""


def hero_block(kicker: str, h1: str, dek: str, meta: str = "", peek: str = "", cta: str = "", cls: str = "") -> str:
    return f"""
  <section class="hero{(' ' + cls) if cls else ''}">
    <canvas class="field" aria-hidden="true"></canvas>
    <div class="in">
      <div class="kicker"><span class="dot"></span>{kicker}</div>
      <h1>{h1}</h1>
      <p class="dek">{dek}</p>
      {('<div class="meta">' + meta + '</div>') if meta else ''}
      {cta}
      {peek}
    </div>
  </section>"""


def masthead(kicker: str, h1: str, dek: str, meta: str = "", cta: str = "") -> str:
    """Main-site page header: a dark band with the live probability field behind the headline."""
    return f"""
  <section class="mast band">
    <canvas class="flow" data-flow="band" aria-hidden="true"></canvas>
    <div class="in">
      <div class="label">{kicker}</div>
      <h1>{h1}</h1>
      {('<p class="dek">' + dek + '</p>') if dek else ''}
      {('<div class="meta">' + meta + '</div>') if meta else ''}
      {cta}
    </div>
  </section>"""


# ---------------------------------------------------------------- series

def load_parts() -> list[dict]:
    parts = []
    for path in sorted(SERIES.glob("[0-9][0-9]-*.html")):
        meta, body = read_fragment(path)
        meta["body"] = body
        meta.setdefault("slug", path.stem)
        meta["words"] = count_words(body)
        meta["minutes"] = max(1, round(meta["words"] / 230))
        meta["labs"] = re.findall(r'data-lab="([a-z]+)"', body)
        parts.append(meta)
    for i, p in enumerate(parts):
        p["n"] = i + 1
    return parts


def part_cards(parts: list[dict], depth: str) -> str:
    cards = []
    for p in parts:
        labs = f' · {len(p["labs"])} lab{"s" if len(p["labs"]) != 1 else ""}' if p["labs"] else ""
        cards.append(f"""<a class="part reveal" href="{depth}abyssal/{p["slug"]}.html">
          <div class="thumb"><img src="{depth}assets/abyssal/{p["hero"]}" alt="" loading="lazy"></div>
          <div class="body">
            <div class="no"><span>Part {p["n"]:02d}</span><span class="lvl">{html.escape(p["level"])}</span></div>
            <h3>{p["title"]}</h3>
            <p>{p["dek"]}</p>
            <div class="rt">{p["minutes"]} min read{labs}</div>
          </div>
        </a>""")
    return "\n        ".join(cards)


def parts_compact(parts: list[dict], depth: str) -> str:
    rows = []
    for p in parts:
        rows.append(f"""<a class="row" href="{depth}abyssal/{p["slug"]}.html"><span class="n">{p["n"]:02d}</span><span class="t">{p["title"]}</span><span class="l">{html.escape(p["level"].split(" · ")[0])}</span><span class="m">{p["minutes"]} min</span></a>""")
    return "\n          ".join(rows)


LAB_NAMES = {
    "grid": ("Search the grid", "Negative evidence, the outside share and repeat credit on a 30 × 16 map"),
    "region": ("Not here, 5%", "A minimum-KL area statement and its cost in bits"),
    "absence": ("How many clean visits?", "Absence assurance under independent visits"),
    "ramp": ("Three colour ramps", "Why a rainbow invents ridges and sinks into the sea"),
    "echoes": ("Five echoes, one witness", "Naive multiplication versus provenance pooling"),
    "waterfill": ("Water-filling", "Optimal search effort under exponential detection"),
    "exhaust": ("Search to exhaustion", "Expected value and the stopping point of a priced search"),
    "kelvin": ("Kelvin wake and SAR shift", "19.47°, wavelength-to-speed and why the radar misplaces ships"),
    "tdoa": ("Four hydrophones, one bang", "TDOA hyperbolae, correlated errors and a χ² mispick alarm"),
    "wilson": ("How many trials make a measurement?", "Wilson intervals and the calibration gate"),
    "splash": ("The dispersive clock", "Impact ring waves (Cauchy–Poisson) as detector and timer"),
    "gap": ("The reach ellipse", "Where a vessel could have gone while dark, and impossible jumps"),
    "lineage": ("Lineage collapse", "How a healthy ESS hides a particle filter that has not converged"),
    "fifthmiss": ("The fifth miss", "Independent versus shared sensor failure"),
}


def labs_index(parts: list[dict]) -> str:
    rows = []
    for p in parts:
        for lab in dict.fromkeys(p["labs"]):
            name, blurb = LAB_NAMES.get(lab, (lab, ""))
            rows.append(f'<a class="labcard reveal" href="{p["slug"]}.html#lab-{lab}"><span class="k">Part {p["n"]}</span><b>{name}</b><span>{blurb}</span></a>')
    return "\n        ".join(rows)


def series_nav(parts: list[dict], cur: dict) -> str:
    items = "".join(
        f'<li{" class=\"cur\"" if p is cur else ""}><a href="{p["slug"]}.html"><span class="n">{p["n"]:02d}</span>'
        f'<span>{html.escape(p["title"])}</span></a></li>'
        for p in parts
    )
    i = parts.index(cur)
    prev = parts[i - 1] if i > 0 else None
    nxt = parts[i + 1] if i + 1 < len(parts) else None
    pn = '<div class="prevnext">'
    if prev:
        pn += f'<a class="prev" href="{prev["slug"]}.html"><small>← Part {prev["n"]}</small><b>{html.escape(prev["title"])}</b></a>'
    if nxt:
        pn += f'<a class="next" href="{nxt["slug"]}.html"><small>Part {nxt["n"]} →</small><b>{html.escape(nxt["title"])}</b></a>'
    else:
        pn += '<a class="next" href="index.html"><small>Back to →</small><b>The series and all the labs</b></a>'
    pn += "</div>"
    return f'<nav class="series-nav" aria-label="The ABYSSAL series"><div class="label">The ABYSSAL series</div><ol>{items}</ol></nav>{pn}'


def add_lab_anchors(body: str) -> str:
    seen: set[str] = set()

    def rep(m: re.Match) -> str:
        lab = m.group(1)
        if lab in seen:
            return m.group(0)
        seen.add(lab)
        return f'{m.group(0)} id="lab-{lab}"'

    return re.sub(r'data-lab="([a-z]+)"', rep, body)


def render_part(parts: list[dict], p: dict) -> str:
    title = f'{p["title"]} — ABYSSAL, part {p["n"]} — Rory Millard'
    peek = (
        f'<figure class="figure-peek reveal"><img src="../assets/abyssal/{p["hero"]}" '
        f'alt="{html.escape(p.get("hero_alt", p["title"]))}" fetchpriority="high"></figure>'
    )
    labs = f' · <b>{len(p["labs"])}</b> interactive lab{"s" if len(p["labs"]) != 1 else ""}' if p["labs"] else ""
    hero = hero_block(
        f'<span>ABYSSAL · Part {p["n"]} of {len(parts)}</span><span class="lv">{html.escape(p["level"])}</span>',
        p["title"], p["dek"],
        meta=f'<span><b>{p["minutes"]} min</b> read · {p["words"]:,} words{labs}</span><span>Rory Millard · November 2026</span>',
        peek=peek,
    )
    body = f"""
  <main class="page" id="main">
    <div class="article-grid">
      <aside class="toc" aria-label="On this page"></aside>
      <article class="prose">
{add_lab_anchors(p["body"])}
        {series_nav(parts, p)}
      </article>
      <div></div>
    </div>
  </main>"""
    crumb = f'<a href="index.html">Series</a> / Part {p["n"]} of {len(parts)}'
    return head(title, p["desc"], p["hero"], "../") + topbar("../", crumb, "series") + hero + body + foot("../")


# ---------------------------------------------------------------- pages

def include(text: str) -> str:
    """{{INCLUDE:path}} inlines a file from the repository (e.g. a generated SVG)."""
    return re.sub(r"\{\{INCLUDE:([^}]+)\}\}", lambda m: (ROOT / m.group(1).strip()).read_text(encoding="utf-8"), text)


def fill(text: str, parts: list[dict], depth: str) -> str:
    text = include(text)
    total = sum(p["words"] for p in parts)
    nlabs = sum(len(set(p["labs"])) for p in parts)
    return (text.replace("{{PARTS}}", part_cards(parts, depth))
                .replace("{{PARTS_COMPACT}}", parts_compact(parts, depth))
                .replace("{{TOTAL_WORDS_N}}", str(total))
                .replace("{{TOTAL_WORDS}}", f"{total:,}")
                .replace("{{NPARTS}}", str(len(parts)))
                .replace("{{NLABS}}", str(nlabs))
                .replace("{{LABS}}", labs_index(parts)))


def render_page(meta: dict, body: str, parts: list[dict]) -> str:
    out = meta["out"]
    depth = "../" * out.count("/")
    layout = meta.get("layout", "page")
    crumb = meta.get("crumb", "")
    theme = theme_of(out)
    if layout == "home":
        main = f'\n  <main id="main">{fill(body, parts, depth)}\n  </main>'
        hero = ""
    else:
        peek = ""
        if meta.get("peek"):
            peek = (f'<figure class="figure-peek reveal"><img src="{depth}assets/abyssal/{meta["peek"]}" '
                    f'alt="{html.escape(meta.get("peek_alt", ""))}" fetchpriority="high"></figure>')
        cta = meta.get("cta", "").replace("{{DEPTH}}", depth)
        if theme == "site":
            hero = masthead(fill(meta.get("kicker", ""), parts, depth), meta.get("h1", meta["title"]),
                            fill(meta.get("dek", ""), parts, depth), meta=fill(meta.get("meta", ""), parts, depth),
                            cta=f'<div class="cta">{cta}</div>' if cta else "")
        else:
            hero = hero_block(fill(meta.get("kicker", ""), parts, depth), meta.get("h1", meta["title"]),
                              fill(meta.get("dek", ""), parts, depth), meta=fill(meta.get("meta", ""), parts, depth),
                              peek=peek, cta=f'<div class="cta">{cta}</div>' if cta else "",
                              cls=meta.get("hero_cls", "short"))
        if layout == "note":
            main = f"""
  <main class="page" id="main">
    <div class="article-grid">
      <aside class="toc" aria-label="On this page"></aside>
      <article class="prose">
{fill(body, parts, depth)}
      </article>
      <div></div>
    </div>
  </main>"""
        else:
            main = f'\n  <main class="page" id="main">\n{fill(body, parts, depth)}\n  </main>'
    return (head(meta["title"], meta["desc"], meta.get("image", "demo-live.webp"), depth,
                 maths=meta.get("maths", layout == "note"), theme=theme)
            + topbar(depth, crumb, meta.get("active", ""), theme) + hero + main + foot(depth, theme))


def redirect_page(src: str, dst: str) -> str:
    depth = "../" * src.count("/")
    target = depth + dst
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Moved — Rory Millard</title>
<meta http-equiv="refresh" content="0; url={target}"><link rel="canonical" href="{SITE}/{dst}">
<meta name="robots" content="noindex"></head>
<body><p>This page has moved: <a href="{target}">continue reading</a>.</p></body></html>
"""


def main() -> None:
    parts = load_parts()
    (ROOT / "abyssal").mkdir(exist_ok=True)
    for p in parts:
        (ROOT / "abyssal" / f'{p["slug"]}.html').write_text(render_part(parts, p), encoding="utf-8")
        print(f'abyssal/{p["slug"]}.html  {p["words"]:>6,} words  {p["minutes"]:>3} min  labs={p["labs"]}')
    hub_meta, hub_body = read_fragment(SERIES / "index.html")
    (ROOT / "abyssal" / "index.html").write_text(render_page(hub_meta, hub_body, parts), encoding="utf-8")
    print("abyssal/index.html")
    for path in sorted(PAGES.rglob("*.html")):
        meta, body = read_fragment(path)
        out = ROOT / meta["out"]
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render_page(meta, body, parts), encoding="utf-8")
        print(meta["out"])
    for src, dst in REDIRECTS.items():
        (ROOT / src).write_text(redirect_page(src, dst), encoding="utf-8")
    print(f"series: {len(parts)} parts, {sum(p['words'] for p in parts):,} words, "
          f"{sum(len(set(p['labs'])) for p in parts)} labs; {len(REDIRECTS)} redirects")


if __name__ == "__main__":
    main()
