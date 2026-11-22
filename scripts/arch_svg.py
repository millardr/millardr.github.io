"""Generate the ABYSSAL architecture chart (inline SVG, themed by the site's CSS variables).

    python3 scripts/arch_svg.py   ->   _svg/abyssal-architecture.svg

Read it from the bottom up, like the Transformer figure: inputs are embedded with receipts and
tagged with their origin, raw measurements go through fourteen signal heads that share one
contract, admitted results join the evidence-to-belief engine, and decisions and outputs come out
of the top. Every node carries a title and a description for the page's inspector.
"""

from __future__ import annotations

import html
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "_svg" / "abyssal-architecture.svg"

W, H = 1200, 1700
L, R = 236, 976  # central area
parts: list[str] = []


def esc(s: str) -> str:
    return html.escape(s, quote=True)


def node(
    k: str,
    x: float,
    y: float,
    w: float,
    h: float,
    title: str,
    sub: str = "",
    cls: str = "",
    desc: str = "",
    href: str = "",
    rx: float = 9,
    tsize: float | None = None,
) -> None:
    chars = max(10, int(w / 6.3))
    lines = textwrap.wrap(sub, chars)[:3] if sub else []
    total = 17 + 14 * len(lines)
    ty = y + h / 2 - total / 2 + 13
    t = [f'<text class="t" x="{x + w / 2:.1f}" y="{ty:.1f}"{f" style=\"font-size:{tsize}px\"" if tsize else ""}>{esc(title)}</text>']
    for i, ln in enumerate(lines):
        t.append(f'<text class="s" x="{x + w / 2:.1f}" y="{ty + 17 + 14 * i:.1f}">{esc(ln)}</text>')
    inner = (
        f'<title>{esc(title)}</title><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}"/>'
        + "".join(t)
    )
    attrs = f'class="node {cls}" data-k="{k}" data-title="{esc(title)}" data-desc="{esc(desc or sub)}" tabindex="0"'
    if href:
        parts.append(f'<a href="{href}" {attrs}>{inner}</a>')
    else:
        parts.append(f"<g {attrs}>{inner}</g>")


def edge(d: str, ks: str, cls: str = "edge flow", head: bool = True) -> None:
    m = ' marker-end="url(#ah)"' if head else ""
    parts.append(f'<path class="{cls}" data-e="{ks}" d="{d}"{m}/>')


def band(text: str, x: float, y: float) -> None:
    parts.append(f'<text class="band" x="{x}" y="{y}">{esc(text)}</text>')


# ---------------------------------------------------------------- outputs
band("OUTPUTS", L, 34)
outs = [
    ("o-map", "Belief map", "posterior and credible regions on the grid",
     "The probability map of where the object is, with credible regions. Only admitted observations ever change it."),
    ("o-plan", "Next search", "the plan, its value and when to stop",
     "Which area to search next, with which asset, what it is worth and the point at which searching stops paying."),
    ("o-evmap", "Evidence Map", "influence of every item and source, in bits",
     "How far each item and each whole source moved the map (Kullback–Leibler divergence in bits), with exact undo."),
    ("o-dossier", "Dossier", "audit pack: receipts, hashes, model versions",
     "An exportable record of the case: every source with its receipt, every computation with its model version, code commit and input hashes."),
]
for i, (k, t, s, d) in enumerate(outs):
    node(k, L + i * 188, 44, 176, 68, t, s, "out", d)

# ---------------------------------------------------------------- decide
band("DECIDE", L, 150)
dec = [
    ("d-next", "Where next?", "expected information gain per search, in bits",
     "Ranks candidate searches by how much they are expected to reduce uncertainty, and names the observation that would change the map most."),
    ("d-plan", "Plan Studio", "allocation (water-filling), cost, value, stop rule",
     "Splits effort across assets and areas to maximise the chance of finding, prices it, and draws the search-to-exhaustion curve."),
    ("d-ledger", "Search Ledger & Health", "unsearched · searched and missed · outside area",
     "Where the probability has gone: still unsearched, searched and missed, or outside the drawn area; plus checks on the case's own health."),
]
for i, (k, t, s, d) in enumerate(dec):
    node(k, L + i * 251, 160, 238, 68, t, s, "plan", d)
for x in (L + 119, L + 251 + 119, L + 502 + 119):
    edge(f"M{x} 160 L{x} 116", "decide outputs", "edge")

# ---------------------------------------------------------------- gate
node("gate", 496, 258, 240, 58, "Admission gate", "calibrated? then a person admits",
     "gate",
     "The only way into the belief map. A detector's output is a contact; only a calibrated detector (measured detection and false-alarm rates) can propose an observation, and a person must admit it. Agents propose, code acquires, humans admit. Automatic fusion of engine output is parked for now.")

# ---------------------------------------------------------------- engine II tower (left)
parts.append(f'<rect class="tower sigt" x="{L}" y="350" width="360" height="800" rx="16"/>')
parts.append(f'<text class="tower-t" x="{L + 180}" y="378">ENGINE II · HIDDEN SIGNALS</text>')
# stacked sheets: many heads, one contract
for off in (20, 10):
    parts.append(f'<rect class="sheet back" x="{266 + off}" y="{412 - off}" width="270" height="350" rx="12"/>')
parts.append('<rect class="sheet" x="266" y="412" width="270" height="350" rx="12"/>')
parts.append('<text class="nx" x="252" y="590" transform="rotate(-90 252 590)">14 heads ×</text>')
hx, hw = 284, 234
node("h-contact", hx, 430, hw, 58, "Contact", "estimate, uncertainty, score · model version · input hashes", "sig",
     "What every head returns: a position (or time, depth, identity), its uncertainty, a score, and the provenance needed to reproduce it. A contact is never evidence by itself.")
node("h-cal", hx, 508, hw, 62, "Calibration", "detection and false-alarm rates, interval coverage vs an answer key", "sig hot",
     "Every head is scored on SCENARIO data with a known answer: how often it finds the target, how often it raises false alarms, and whether its uncertainty intervals contain the truth as often as they claim. SAR heads can also self-calibrate on REAL data from ships that broadcast AIS.")
node("h-inf", hx, 590, hw, 62, "Inference", "matched filter · CFAR · Kalman + Hungarian · least squares · cepstrum", "sig",
     "Turns measurements into an estimate: matched filters and constant-false-alarm detectors, multi-target tracking with optimal assignment, Levenberg–Marquardt fits, stationary-phase chirps, cepstra, likelihood grids with analytic marginalisation.")
node("h-phys", hx, 672, hw, 62, "Physics forward model", "what the data would look like if the target were at x", "sig",
     "Each head starts from the physics: Kelvin wakes and azimuth shift, dispersion of impact waves, sound in the SOFAR channel, a magnetic dipole in Earth's field, leeway drift, bubble oscillation, radar backscatter of the wind-roughened sea.")
edge("M401 672 L401 656", "h-phys h-inf", "edge")
edge("M401 590 L401 574", "h-inf h-cal", "edge")
edge("M401 508 L401 492", "h-cal h-contact", "edge")
# self-calibration loop
parts.append('<path class="edge loop" data-e="h-contact h-cal" d="M518 470 C560 476 560 532 522 538" marker-end="url(#ah)"/>')
parts.append('<text class="tiny" x="548" y="508" transform="rotate(-90 548 508)">self-cal</text>')
# heads (chips)
heads = [
    ("sar", "SAR vessels & wakes"), ("tracks", "Dark tracks"),
    ("selfcal", "Self-calibration (AIS)"), ("wind", "Wind from radar"),
    ("persist", "Persistence"), ("identity", "Who went dark?"),
    ("impact", "Impact rings"), ("rings", "Ring finder"),
    ("tdoa", "Hydrophone TDOA"), ("sofar", "SOFAR basin"),
    ("bubble", "Implosion forensics"), ("magnetic", "Magnetic dipole"),
    ("seabed", "Seabed & sonar"), ("debris", "Debris back-track"),
]
HEAD_DESC = {
    "sar": "Finds ships in radar images (CFAR), reads their wakes for heading and speed, and matches them to AIS; ships with no AIS are dark.",
    "tracks": "Links dark detections across satellite passes with Kalman filters and optimal assignment; flags loitering, rendezvous and possible identities.",
    "selfcal": "Every AIS ship the radar should have seen is a free labelled trial: detection rate by length and wind, on your own sensor.",
    "wind": "Reads sea-surface wind from the radar backscatter (CMOD5.n) and wind streaks, because wind decides what a miss means.",
    "persist": "Stacks many passes: what is always there (platforms, buoys), what keeps coming back (anchorages), what passes through.",
    "identity": "Ranks vessels whose AIS went silent before a pass against each dark contact: reach, dead reckoning, length.",
    "impact": "The splash clock: an impact's ring waves disperse, so one image gives the centre and the time since impact.",
    "rings": "Matched-filter bank for debris rings, crater rims and slick rings at many radii.",
    "tdoa": "Locates a bang from arrival-time differences at a few hydrophones, with a correlated error model and a mispick alarm.",
    "sofar": "Locates an event across an ocean basin from distant hydrophones; land blocks paths, and silence on open water is evidence.",
    "bubble": "Reads the bubble-pulse period of an implosion or explosion: size against depth, and depth when the hull volume is known.",
    "magnetic": "Fits a magnetic dipole to a survey in Earth's field: position, depth and moment, induced or remanent.",
    "seabed": "Finds compact relief in multibeam (including NOAA BlueTopo) and highlight–shadow pairs in side-scan.",
    "debris": "Runs recovered debris backwards through wind and current to where it entered the water, sharing the uncertain environment.",
}
for i, (k, t) in enumerate(heads):
    cx = 266 + (i % 2) * 175
    cy = 828 + (i // 2) * 44
    node(f"head-{k}", cx, cy, 164, 34, t, "", "chip", HEAD_DESC[k], href=f"#eng-{k}", rx=17, tsize=12.5)

# ---------------------------------------------------------------- engine I tower (right)
parts.append(f'<rect class="tower belt" x="636" y="350" width="340" height="470" rx="16"/>')
parts.append('<text class="tower-t" x="806" y="378">ENGINE I · EVIDENCE → BELIEF</text>')
bx, bw = 656, 300
node("b-norm", bx, 398, bw, 62, "Add & normalise", "log prior (terrain, drift, leeway) + Σ log L; outside-area mass kept", "bel hot",
     "The posterior is a sum in log space: the prior (terrain, drift, leeway or walking motion) plus every admitted likelihood, then normalised. Probability outside the drawn area is kept explicitly, never silently renormalised away. Six model versions (v1–v6), each selectable.")
node("b-neg", bx, 480, bw, 56, "Negative evidence", "searched and missed: log(1 − POD)", "bel",
     "A search that found nothing still moves the map: each searched cell is multiplied by the chance of missing, 1 − POD, which is a sum of log(1 − POD) in log space.")
node("b-pool", bx, 556, bw, 56, "Provenance pooling", "echoes of one root count once", "bel",
     "Five reports that all trace back to one witness are one piece of evidence, not five. Items that share a provenance root are pooled before they enter the map.")
node("b-lik", bx, 632, bw, 56, "Likelihood, in log space", "log L(x | claim, reliability, family)", "bel",
     "Each observation becomes a likelihood over the grid, weighted by its reliability and grouped by family so correlated evidence is not double counted.")
node("b-obs", bx, 708, bw, 82, "Observations", "point · bearing · range · corridor · area statement · completed search", "bel",
     "Explicit, reviewable claims: a point with uncertainty, a bearing, a range ring, a corridor, a 'not here' area statement, a completed search with its POD.")
edge("M806 708 L806 692", "b-obs b-lik", "edge")
edge("M806 632 L806 616", "b-lik b-pool", "edge")
edge("M806 556 L806 540", "b-pool b-neg", "edge")
edge("M806 480 L806 464", "b-neg b-norm", "edge")
# Engine I -> decide
edge("M806 398 L806 232", "b-norm d-next d-plan d-ledger", "edge flow")
# Engine II -> gate -> Engine I
edge("M401 430 L401 287 L492 287", "h-contact gate")
edge("M616 316 L616 742 L652 742", "gate b-obs")

# context box (right column, below the tower)
node("ctx", 636, 852, 340, 150, "Context, never evidence",
     "basemaps · relief and imagery · live air and sea traffic · weather · day and night · field tools: drawn for orientation, never multiplied into belief",
     "ctx",
     "Everything in the Ops console and most map layers is context: it helps a person see and reason, but it cannot change the belief map. To count, it must become an explicit observation and be admitted.")
node("ctx2", 636, 1022, 340, 120, "Composites", "the lost-submarine drill: where (SOFAR) + how deep (bubble pulse) + where that is possible (bathymetry)", "sig",
     "Engines chain: a hydrophone fix, a collapse depth from the bubble pulse with the hull volume, and the seabed together rule out water too shallow for the implosion.", href="#eng-drill")

# ---------------------------------------------------------------- encode
parts.append('<g class="node enc" data-k="origin" data-title="Origin encoding" data-desc="Every item carries its origin: REAL or SCENARIO. Synthetic data is tagged end to end and can never enter a real case, so simulators and answer keys can live alongside real evidence safely." tabindex="0"><title>Origin encoding</title>'
             f'<rect x="{L}" y="1180" width="740" height="46" rx="9"/>'
             '<circle class="oplus" cx="282" cy="1203" r="13"/><path class="oplusx" d="M273 1203 L291 1203 M282 1194 L282 1212"/>'
             '<text class="t left" x="310" y="1199">Origin encoding</text>'
             '<text class="s left" x="310" y="1215">REAL or SCENARIO on every item: synthetic never enters a real case</text></g>')
node("receipts", L, 1246, 740, 54, "Receipt embedding",
     "URL · retrieval time · size · SHA-256 · licence · provenance root (which items share a source)", "in",
     "Every acquired file and every fetched window gets a receipt, and every item records the root it descends from. Results record model version, code commit and input hashes, so anything can be reproduced and defended later.")
edge("M606 1246 L606 1230", "receipts origin", "edge")
# origin -> engines
edge("M251 1180 L251 790 L401 790 L401 738", "origin h-phys", "edge flow")
edge("M626 1180 L626 772 L652 772", "origin b-obs", "edge flow")
parts.append('<text class="tiny left" x="258" y="1170">measurements</text>')
parts.append('<text class="tiny left" x="632" y="1170">claims</text>')

# ---------------------------------------------------------------- inputs
band("INPUTS", L, 1336)
ins = [
    ("i-docs", "Documents", "reports, testimony, logs",
     "Witness statements, logs, reports and papers. Read by a person or proposed by an agent; a person decides what each one claims."),
    ("i-tracks", "Tracks", "AIS · ADS-B · GPX · IGC",
     "Vessel and aircraft tracks: AIS archives (including NOAA MarineCadastre day files), ADS-B, GPS logs. Context until a fix is used as evidence."),
    ("i-sensors", "Recordings", "SAR · hydrophone · magnetometer · sonar",
     "Raw measurements for the signal heads: radar images, acoustic recordings, magnetometer surveys, multibeam and side-scan."),
    ("i-layers", "Public layers", "bathymetry · imagery · fields",
     "Opt-in public datasets fetched with receipts: depth, relief, magnetics, gravity, satellite radar and imagery."),
    ("i-sketch", "Sketches", "points · bearings · areas · searches",
     "What an analyst draws or types: a sighting, a bearing, a corridor, a 'not here' statement, a completed search."),
]
for i, (k, t, s, d) in enumerate(ins):
    x = L + i * 150
    node(k, x, 1346, 140, 70, t, s, "in", d)
    edge(f"M{x + 70} 1346 L{x + 70} 1304", f"{k} receipts", "edge")

# ---------------------------------------------------------------- sources
SRC_ROWS = [
    ("Relief & seabed", "ETOPO 2022 · GEBCO · EMODnet depth & quality · NOAA BlueTopo · Natural Earth coastline"),
    ("Fields", "NOAA EMAG2v3 & BGS magnetics · Scripps marine gravity · Open-Meteo wind & currents"),
    ("Radar & imagery", "Sentinel-1 RTC on AWS · NASA GIBS · RainViewer · OpenStreetMap & OpenSeaMap basemaps"),
    ("Traffic & events", "ADS-B (adsb.lol, OpenSky) · AIS (Digitraffic, MarineCadastre) · USGS quakes · satellite elements"),
]
src_desc = ("All opt-in and fetched on request, each with a receipt. Most are context; a few feed engines directly: "
            "Sentinel-1 windows under the SAR heads, BlueTopo under the seabed head, bathymetry under the drill.")
rows_svg = "".join(
    f'<text class="s left srck" x="{L + 22}" y="{1500 + 24 * i}">{esc(a)}</text>'
    f'<text class="s left" x="{L + 150}" y="{1500 + 24 * i}">{esc(b)}</text>'
    for i, (a, b) in enumerate(SRC_ROWS)
)
parts.append(
    f'<g class="node ctx" data-k="sources" data-title="Where the maps and data come from" data-desc="{esc(src_desc)}" tabindex="0">'
    f'<title>Where the maps and data come from</title><rect x="{L}" y="1452" width="740" height="150" rx="9"/>'
    f'<text class="t left" x="{L + 22}" y="1478">Where the maps and data come from</text>{rows_svg}</g>'
)
edge("M636 1452 L636 1420", "sources i-layers", "edge dash")
edge("M386 1452 L386 1420", "sources i-tracks", "edge dash")

# ---------------------------------------------------------------- UI rails
parts.append('<text class="rail-t" x="110" y="34">WHERE PEOPLE</text>')
parts.append('<text class="rail-t" x="110" y="48">LAY DATA ON</text>')
parts.append('<text class="rail-t" x="1098" y="34">INSPECT AND</text>')
parts.append('<text class="rail-t" x="1098" y="48">STEER</text>')
uis_left = [
    ("ui-export", "Export dossier", 60, 78, L),
    ("ui-plan", "Where next · Plan Studio", 176, 194, L),
    ("ui-review", "Review & history", 278, 300, 496),
    ("ui-lab", "Signal Lab", 580, 604, L),
    ("ui-add", "Add · Archive", 1358, 1381, L),
    ("ui-layers", "Layers", 1506, 1528, L),
]
UI_DESC = {
    "ui-export": "Exports the dossier and audit pack: sources, receipts, model versions, input hashes.",
    "ui-plan": "Where next? ranks searches by expected information; Plan Studio allocates assets and prices the search.",
    "ui-review": "Admit, reject or undo observations; every change is in the history with exact undo.",
    "ui-lab": "Fourteen signal heads in one panel: run them on SCENARIO scenes with answer keys, or on your own data and public archives.",
    "ui-add": "Add sources: documents, files, tracks, recordings. Originals are kept with their hashes.",
    "ui-layers": "Opt-in public layers: bathymetry, magnetics, gravity, imagery, fetched with receipts.",
    "ui-evmap": "See how much each item and each source moved the map, in bits, and the provenance graph.",
    "ui-ledger": "The Search Ledger bar and Search Health checks: where the probability has gone.",
    "ui-move": "Drift, walking and leeway motion; particle previews; a shared clock for replay.",
    "ui-sketch": "Draw a point, bearing, range ring, corridor or area statement; it becomes a draft observation to review.",
    "ui-ops": "Live air and sea traffic, satellites, wind, currents, radar, quakes and fires, plus field tools. Context only.",
}
for k, t, y, cy, tx in uis_left:
    node(k, 24, y, 172, 44 if k != "ui-plan" else 48, t, "", "ui", UI_DESC[k], rx=22, tsize=12.5)
    edge(f"M196 {cy} L{tx - 4} {cy}", f"{k}", "edge dot", head=False)
uis_right = [
    ("ui-evmap", "Evidence Map", 60, 78, R),
    ("ui-ledger", "Ledger · Search Health", 176, 194, R),
    ("ui-move", "Movement & time", 406, 429, R),
    ("ui-sketch", "Sketch evidence", 726, 749, R),
    ("ui-ops", "Ops console", 904, 927, R),
]
for k, t, y, cy, tx in uis_right:
    node(k, 1012, y, 172, 44, t, "", "ui", UI_DESC[k], rx=22, tsize=12.5)
    edge(f"M1012 {cy} L{tx + 4} {cy}", f"{k}", "edge dot", head=False)

# ---------------------------------------------------------------- legend
lg = [("sig", "Engine II · hidden signals"), ("bel", "Engine I · evidence → belief"), ("plan", "decision"),
      ("out", "output"), ("gate", "human gate"), ("ctx", "context, never evidence"), ("ui", "interface")]
x = 40
for cls, t in lg:
    parts.append(f'<g class="node {cls} key"><rect x="{x}" y="1636" width="18" height="14" rx="3"/></g>'
                 f'<text class="s left" x="{x + 24}" y="1647">{esc(t)}</text>')
    x += 26 + len(t) * 6.6 + 18

svg = (
    f'<svg class="arch-svg" viewBox="0 0 {W} {H}" role="img" aria-labelledby="arch-title arch-desc" xmlns="http://www.w3.org/2000/svg">'
    '<title id="arch-title">ABYSSAL architecture</title>'
    '<desc id="arch-desc">Read from the bottom up. Inputs (documents, tracks, recordings, public layers, sketches) get receipts and an origin tag. '
    'Raw measurements go through fourteen signal heads that share one contract: physics forward model, inference, calibration, contact. '
    'Contacts pass an admission gate (calibrated, then admitted by a person) into the evidence-to-belief engine: observations, log likelihood, provenance pooling, '
    'negative evidence, add and normalise. Decisions (where next, plan, ledger) and outputs (belief map, next search, evidence map, dossier) come out of the top. '
    'Interfaces on both sides show where people lay data on and steer; the band at the bottom lists where maps and data come from.</desc>'
    '<defs><marker id="ah" viewBox="0 0 10 10" refX="8.5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">'
    '<path class="arrowhead" d="M0 0 L10 5 L0 10 z"/></marker></defs>'
    + "".join(parts)
    + "</svg>"
)
OUT.parent.mkdir(exist_ok=True)
OUT.write_text(svg + "\n", encoding="utf-8")
print(f"wrote {OUT} ({len(svg):,} bytes, {svg.count('data-k=')} nodes)")
