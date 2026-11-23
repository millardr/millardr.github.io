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
import subprocess
from datetime import date
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

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


# ---------------------------------------------------------------- search and sharing
# Every page gets a canonical URL, Open Graph and Twitter tags, a share card and schema.org JSON-LD
# (WebSite + Person on the home page, ProfilePage on About, TechArticle on essays, BreadcrumbList on
# every subpage, a Dataset on the real-data page). sitemap.xml, robots.txt and feed.xml are written
# from the same records. Dates come from git: first and last commit of the page's source file.
SITE_NAME = "Rory Millard"
PERSON_ID = f"{SITE}/#person"
WEBSITE_ID = f"{SITE}/#website"
SERIES_NAME = "ABYSSAL, from every side"
PERSON = {
    "@type": "Person",
    "@id": PERSON_ID,
    "name": "Rory Millard",
    "url": f"{SITE}/about.html",
    "jobTitle": "Engineer",
    "description": "Engineer working where probability meets the physical world: Bayesian search, physics-based sensing and decisions under uncertainty.",
    "alumniOf": {"@type": "CollegeOrUniversity", "name": "University of Oxford", "sameAs": "https://www.ox.ac.uk/"},
    "knowsAbout": ["Bayesian inference", "Search theory", "Bayesian search", "Search and rescue", "Remote sensing",
                   "Synthetic aperture radar", "Ocean acoustics", "Information theory", "Optimisation",
                   "Signal processing", "Estimation and tracking", "Decision making under uncertainty"],
    "sameAs": [LINKEDIN, "https://github.com/millardr"],
}
AUTHOR = {"@type": "Person", "@id": PERSON_ID, "name": "Rory Millard", "url": f"{SITE}/about.html"}
PAPER = {
    "@type": "ScholarlyArticle",
    "name": "Efficient Hybrid Methods for Supersonic Nozzle Optimisation",
    "headline": "Efficient Hybrid Methods for Supersonic Nozzle Optimisation",
    "author": [AUTHOR, {"@type": "Person", "name": "H. Ogawa"}, {"@type": "Person", "name": "T. Povey"}],
    "datePublished": "2026-09",
    "about": ["Supersonic nozzle design", "Aerodynamic shape optimisation", "Hybrid optimisation methods"],
    "publication": {"@type": "PublicationEvent", "name": "Global Power and Propulsion Society (GPPS) conference",
                    "startDate": "2026-09-09", "endDate": "2026-09-11",
                    "location": {"@type": "Place", "name": "Montreal, Canada"}},
}
CARDS: list[dict] = []   # filled during the build; scripts/social_cards.cjs renders them
RECORDS: list[dict] = []  # one per indexable page: sitemap and feed


def canonical(out: str) -> str:
    if out == "index.html":
        return f"{SITE}/"
    if out.endswith("/index.html"):
        return f"{SITE}/{out[: -len('index.html')]}"
    return f"{SITE}/{out}"


def git_dates(path: Path) -> tuple[str, str]:
    """(first commit, last commit) dates of a source file; today for new or edited files."""
    rel = str(path.relative_to(ROOT))
    today = date.today().isoformat()
    try:
        log = subprocess.run(["git", "log", "--follow", "--format=%as", "--", rel], cwd=ROOT,
                             capture_output=True, text=True, check=True).stdout.split()
        dirty = subprocess.run(["git", "status", "--porcelain", "--", rel], cwd=ROOT,
                               capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return today, today
    first = log[-1] if log else today
    last = today if (dirty or not log) else log[0]
    return first, last


def card_slug(out: str) -> str:
    return "home" if out == "index.html" else out[:-5].replace("/", "-")


def card_image(out: str, fallback: str) -> tuple[str, str]:
    """(absolute image URL, MIME type): the rendered share card if present, else the page's screenshot."""
    slug = card_slug(out)
    if (ROOT / "assets" / "cards" / f"{slug}.jpg").exists():
        return f"{SITE}/assets/cards/{slug}.jpg", "image/jpeg"
    return f"{SITE}/assets/abyssal/{fallback}", "image/webp"


def plain(text: str) -> str:
    return html.unescape(re.sub(r"<[^>]+>", "", text or "")).strip()


def short_title(title: str) -> str:
    return re.sub(r"\s+—\s+(ABYSSAL, part \d+\s+—\s+)?Rory Millard$", "", title).strip()


def breadcrumbs(trail: list[tuple[str, str]]) -> dict:
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": name, **({"item": url} if url else {})}
        for i, (name, url) in enumerate(trail)]}


def seo_block(seo: dict) -> str:
    """Meta, Open Graph, Twitter and JSON-LD for one page."""
    t, d, url, img, mime = (html.escape(seo["title"]), html.escape(seo["desc"]), seo["url"], seo["image"], seo["mime"])
    alt = html.escape(seo.get("image_alt", seo["title"]))
    lines = [
        *([] if seo.get("noindex") else [f'<link rel="canonical" href="{url}">']),
        '<meta name="author" content="Rory Millard">',
        ('<meta name="robots" content="noindex, follow">' if seo.get("noindex") else
         '<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">'),
        f'<meta property="og:site_name" content="{SITE_NAME}">',
        '<meta property="og:locale" content="en_GB">',
        f'<meta property="og:type" content="{seo["og_type"]}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:title" content="{t}">',
        f'<meta property="og:description" content="{d}">',
        f'<meta property="og:image" content="{img}">',
        f'<meta property="og:image:type" content="{mime}">',
    ]
    if mime == "image/jpeg":
        lines += ['<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">']
    lines += [f'<meta property="og:image:alt" content="{alt}">']
    if seo["og_type"] == "article":
        lines += [f'<meta property="article:published_time" content="{seo["published"]}">',
                  f'<meta property="article:modified_time" content="{seo["modified"]}">',
                  f'<meta property="article:author" content="{SITE}/about.html">']
        lines += [f'<meta property="article:tag" content="{html.escape(k)}">' for k in seo.get("keywords", [])[:6]]
    lines += ['<meta name="twitter:card" content="summary_large_image">',
              f'<meta name="twitter:title" content="{t}">',
              f'<meta name="twitter:description" content="{d}">',
              f'<meta name="twitter:image" content="{img}">',
              f'<meta name="twitter:image:alt" content="{alt}">',
              f'<link rel="alternate" type="application/rss+xml" title="Rory Millard — writing" href="{SITE}/feed.xml">',
              '<script type="application/ld+json">' + json.dumps({"@context": "https://schema.org", "@graph": seo["graph"]},
                                                                   ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + "</script>"]
    return "\n  ".join(lines)


def build_seo(out: str, source: Path, title: str, desc: str, fallback_image: str, kind: str,
              trail: list[tuple[str, str]], extra: dict | None = None) -> dict:
    """kind: home | profile | article | collection | page | none (no indexing records)."""
    extra = extra or {}
    url = canonical(out)
    published, modified = git_dates(source)
    img, mime = card_image(out, fallback_image)
    name = short_title(title)
    desc = plain(desc)
    page_id = url + "#webpage"
    graph: list[dict] = []
    if kind == "home":
        graph += [
            {"@type": "WebSite", "@id": WEBSITE_ID, "url": f"{SITE}/", "name": SITE_NAME,
             "alternateName": ["Rory Millard — Engineer", "millardr.github.io"], "description": desc,
             "inLanguage": "en-GB", "publisher": {"@id": PERSON_ID}, "author": {"@id": PERSON_ID}},
            PERSON,
            {"@type": "WebPage", "@id": page_id, "url": url, "name": title, "description": desc,
             "isPartOf": {"@id": WEBSITE_ID}, "about": {"@id": PERSON_ID}, "primaryImageOfPage": img,
             "datePublished": published, "dateModified": modified, "inLanguage": "en-GB"},
        ]
    elif kind == "profile":
        graph += [
            {"@type": "ProfilePage", "@id": page_id, "url": url, "name": title, "description": desc,
             "isPartOf": {"@id": WEBSITE_ID}, "dateCreated": published, "dateModified": modified,
             "mainEntity": {**PERSON, "subjectOf": PAPER}, "inLanguage": "en-GB"},
            {**PAPER, "@id": f"{SITE}/about.html#gpps-2026"},
        ]
    elif kind == "article":
        art = {"@type": "TechArticle", "@id": url + "#article", "headline": name[:110], "name": name,
               "description": desc, "url": url, "mainEntityOfPage": {"@id": page_id}, "image": [img],
               "datePublished": published, "dateModified": modified, "author": [AUTHOR],
               "publisher": {"@id": PERSON_ID}, "inLanguage": "en-GB", "isAccessibleForFree": True}
        if extra.get("words"):
            art["wordCount"] = extra["words"]
        if extra.get("keywords"):
            art["keywords"] = extra["keywords"]
        if extra.get("series"):
            art["isPartOf"] = {"@type": "CreativeWorkSeries", "@id": f"{SITE}/abyssal/#series", "name": SERIES_NAME,
                               "url": f"{SITE}/abyssal/"}
            art["position"] = extra["series"]
        if extra.get("proficiency"):
            art["proficiencyLevel"] = extra["proficiency"]
        graph += [{"@type": "WebPage", "@id": page_id, "url": url, "name": title, "isPartOf": {"@id": WEBSITE_ID},
                   "breadcrumb": {"@id": url + "#breadcrumb"}, "inLanguage": "en-GB"}, art]
        if extra.get("dataset"):
            graph.append(extra["dataset"])
    elif kind in ("collection", "page"):
        node = {"@type": "CollectionPage" if kind == "collection" else "WebPage", "@id": page_id, "url": url,
                "name": title, "description": desc, "isPartOf": {"@id": WEBSITE_ID}, "author": {"@id": PERSON_ID},
                "datePublished": published, "dateModified": modified, "primaryImageOfPage": img,
                "breadcrumb": {"@id": url + "#breadcrumb"}, "inLanguage": "en-GB"}
        if extra.get("hasPart"):
            node["hasPart"] = extra["hasPart"]
        graph.append(node)
        if extra.get("series_node"):
            graph.append(extra["series_node"])
    if trail:
        graph.append({**breadcrumbs(trail), "@id": url + "#breadcrumb"})
    og_type = {"home": "website", "profile": "profile", "article": "article"}.get(kind, "website")
    CARDS.append({"slug": card_slug(out), "title": extra.get("card_title") or name, "desc": desc, "kicker": extra.get("card_kicker", ""),
                  "theme": theme_of(out)})
    if kind != "none":
        RECORDS.append({"url": url, "title": name, "desc": desc, "modified": modified, "published": published,
                        "kind": kind, "image": img, "priority": extra.get("priority", 0.6)})
    return {"title": title, "desc": desc, "url": url, "image": img, "mime": mime, "og_type": og_type,
            "published": published, "modified": modified, "graph": graph, "keywords": extra.get("keywords", []),
            "image_alt": f"{extra.get('card_title') or name}: Rory Millard", "noindex": kind == "none"}


# Google Search Console ownership check: must stay in the home page's <head>.
GOOGLE_SITE_VERIFICATION = "7NNPhmzGLSE9p59gi33QpHl1xITFNg2mBdUlEXIG2ew"


def head(title: str, desc: str, image: str, depth: str, maths: bool = True, theme: str = "abyssal", home: bool = False,
         seo: dict | None = None) -> str:
    color = ('<meta name="theme-color" content="#0d0d0d">' if theme == "abyssal" else
             '<meta name="theme-color" content="#f7f5f0" media="(prefers-color-scheme: light)">\n'
             '  <meta name="theme-color" content="#0b1120" media="(prefers-color-scheme: dark)">')
    icon = "favicon.svg" if theme == "abyssal" else "rm.svg"
    css = f'<link rel="stylesheet" href="{depth}assets/series.css">'
    if theme == "site":
        css += f'\n  <link rel="stylesheet" href="{depth}assets/site.css">'
    verify = f'\n  <meta name="google-site-verification" content="{GOOGLE_SITE_VERIFICATION}" />' if home else ""
    return f"""<!doctype html>
<html lang="en" class="{theme}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">{verify}
  <title>{html.escape(title)}</title>
  <meta name="description" content="{html.escape(desc)}">
  {seo_block(seo) if seo else f'<meta property="og:image" content="{SITE}/assets/abyssal/{image}">'}
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
    seo = build_seo(f'abyssal/{p["slug"]}.html', SERIES / f'{p["slug"]}.html', title, p["desc"], p["hero"], "article",
                    [("Rory Millard", f"{SITE}/"), ("ABYSSAL", f"{SITE}/abyssal/"), (f'Part {p["n"]}: {p["title"]}', None)],
                    {"series": p["n"], "words": p["words"], "card_kicker": f'ABYSSAL · Part {p["n"]} of {len(parts)}',
                     "keywords": ["ABYSSAL", "Bayesian search", "search theory", "search and rescue", "probability"],
                     "priority": 0.8})
    return head(title, p["desc"], p["hero"], "../", seo=seo) + topbar("../", crumb, "series") + hero + body + foot("../")


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


TOP = {"about.html": ("About", "profile"), "projects.html": ("Work", "collection"),
       "writing.html": ("Writing", "collection"), "contact.html": ("Contact", "page")}


def page_seo(meta: dict, parts: list[dict]) -> dict:
    out, title, desc = meta["out"], meta["title"], meta["desc"]
    src = meta.get("_src", ROOT / "_pages" / out)
    home = ("Rory Millard", f"{SITE}/")
    image = meta.get("image", "demo-live.webp")
    name = short_title(title)
    if out == "index.html":
        return build_seo(out, src, title, desc, image, "home", [],
                         {"card_kicker": "Rory Millard · Engineer", "priority": 1.0,
                          "card_title": "Engineer working where probability meets the physical world."})
    if out in TOP:
        label, kind = TOP[out]
        return build_seo(out, src, title, desc, image, kind, [home, (label, None)],
                         {"card_kicker": f"Rory Millard · {label}", "priority": 0.7, "card_title": plain(meta.get("h1", ""))})
    if out == "abyssal/index.html":
        series = {"@type": "CreativeWorkSeries", "@id": f"{SITE}/abyssal/#series", "name": SERIES_NAME,
                  "url": f"{SITE}/abyssal/", "author": {"@id": PERSON_ID}, "inLanguage": "en-GB",
                  "hasPart": [{"@type": "TechArticle", "position": q["n"], "name": q["title"],
                               "url": f'{SITE}/abyssal/{q["slug"]}.html'} for q in parts]}
        return build_seo(out, src, title, desc, image, "collection", [home, ("ABYSSAL", None)],
                         {"card_kicker": "ABYSSAL", "series_node": series, "priority": 0.9,
                          "hasPart": [{"@id": f"{SITE}/abyssal/#series"}]})
    if out.startswith("abyssal/"):
        extra = {"card_kicker": "ABYSSAL", "priority": 0.8,
                 "keywords": ["ABYSSAL", "Bayesian search", "remote sensing", "signal processing", "validation"]}
        if out == "abyssal/evidence.html":
            extra["dataset"] = {
                "@type": "Dataset", "@id": f"{SITE}/abyssal/evidence.html#dataset",
                "name": "ABYSSAL real-data validation results",
                "description": ("Summary results of seven studies that run ABYSSAL's signal engines on real public data "
                                "(Sentinel-1 radar, Sentinel-2 imagery, NOAA BlueTopo and ETOPO bathymetry, NOAA buoys, "
                                "NOAA MarineCadastre AIS) and score them against independent truth: buoy wind, ship "
                                "transponders, charted platforms and wrecks, and the ARA San Juan wreck."),
                "url": f"{SITE}/abyssal/evidence.html", "creator": AUTHOR, "isAccessibleForFree": True,
                "keywords": ["search and rescue", "synthetic aperture radar", "Sentinel-1", "Sentinel-2", "AIS",
                             "bathymetry", "detection probability", "validation"],
                "variableMeasured": ["wind speed error", "probability of detection", "false alarms per square kilometre",
                                     "position error", "credible search area"],
                "temporalCoverage": "2017/2023",
                "distribution": [{"@type": "DataDownload", "encodingFormat": "application/json",
                                  "contentUrl": f"{SITE}/abyssal/data/realdata.json"}],
            }
        return build_seo(out, src, title, desc, image, "article",
                         [home, ("ABYSSAL", f"{SITE}/abyssal/"), (meta.get("crumb") or name, None)], extra)
    if out.startswith("notes/"):
        return build_seo(out, src, title, desc, image, "article",
                         [home, ("Writing", f"{SITE}/writing.html"), (name, None)],
                         {"card_kicker": "Working note", "priority": 0.7,
                          "keywords": ["Bayesian search", "probability of detection", "search theory"]})
    return build_seo(out, src, title, desc, image, "none", [], {"card_kicker": ""})


def render_page(meta: dict, body: str, parts: list[dict]) -> str:
    out = meta["out"]
    depth = "/" if meta.get("absolute") else "../" * out.count("/")
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
                 maths=meta.get("maths", layout == "note"), theme=theme, home=meta["out"] == "index.html",
                 seo=page_seo(meta, parts))
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


def write_discovery_files() -> None:
    """sitemap.xml, robots.txt, feed.xml, the share-card manifest and the public data copy."""
    recs = sorted(RECORDS, key=lambda r: (-r["priority"], r["url"]))
    urls = "".join(f"  <url><loc>{xml_escape(r['url'])}</loc><lastmod>{r['modified']}</lastmod></url>\n" for r in recs)
    (ROOT / "sitemap.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n'
                                      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                      f"{urls}</urlset>\n", encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\n\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    arts = sorted([r for r in RECORDS if r["kind"] == "article"], key=lambda r: (r["published"], r["url"]), reverse=True)

    def rfc822(d: str) -> str:
        y, m, dd = (int(v) for v in d.split("-"))
        return date(y, m, dd).strftime("%a, %d %b %Y 12:00:00 +0000")

    items = "".join(
        f"    <item><title>{xml_escape(r['title'])}</title><link>{xml_escape(r['url'])}</link>"
        f"<guid isPermaLink=\"true\">{xml_escape(r['url'])}</guid><pubDate>{rfc822(r['published'])}</pubDate>"
        f"<description>{xml_escape(r['desc'])}</description></item>\n" for r in arts)
    newest = max((r["modified"] for r in RECORDS), default=date.today().isoformat())
    (ROOT / "feed.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">\n<channel>\n'
        f"  <title>Rory Millard — writing</title>\n  <link>{SITE}/</link>\n"
        f'  <atom:link href="{SITE}/feed.xml" rel="self" type="application/rss+xml"/>\n'
        "  <description>Essays and working notes on Bayesian search, sensing and decisions under uncertainty, "
        "including the ABYSSAL series.</description>\n  <language>en-gb</language>\n"
        f"  <lastBuildDate>{rfc822(newest)}</lastBuildDate>\n{items}</channel>\n</rss>\n", encoding="utf-8")
    (ROOT / "_data").mkdir(exist_ok=True)
    (ROOT / "_data" / "cards.json").write_text(json.dumps(CARDS, indent=1, ensure_ascii=False), encoding="utf-8")
    data = ROOT / "_data" / "realdata.json"
    if data.exists():
        (ROOT / "abyssal" / "data").mkdir(parents=True, exist_ok=True)
        (ROOT / "abyssal" / "data" / "realdata.json").write_text(data.read_text(encoding="utf-8"), encoding="utf-8")


def main() -> None:
    parts = load_parts()
    (ROOT / "abyssal").mkdir(exist_ok=True)
    for p in parts:
        (ROOT / "abyssal" / f'{p["slug"]}.html').write_text(render_part(parts, p), encoding="utf-8")
        print(f'abyssal/{p["slug"]}.html  {p["words"]:>6,} words  {p["minutes"]:>3} min  labs={p["labs"]}')
    hub_meta, hub_body = read_fragment(SERIES / "index.html")
    hub_meta["_src"] = SERIES / "index.html"
    (ROOT / "abyssal" / "index.html").write_text(render_page(hub_meta, hub_body, parts), encoding="utf-8")
    print("abyssal/index.html")
    for path in sorted(PAGES.rglob("*.html")):
        meta, body = read_fragment(path)
        meta["_src"] = path
        out = ROOT / meta["out"]
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(render_page(meta, body, parts), encoding="utf-8")
        print(meta["out"])
    for src, dst in REDIRECTS.items():
        (ROOT / src).write_text(redirect_page(src, dst), encoding="utf-8")
    write_discovery_files()
    print(f"series: {len(parts)} parts, {sum(p['words'] for p in parts):,} words, "
          f"{sum(len(set(p['labs'])) for p in parts)} labs; {len(REDIRECTS)} redirects")


if __name__ == "__main__":
    main()
