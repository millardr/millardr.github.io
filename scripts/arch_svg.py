"""Generate the ABYSSAL architecture chart as two inline SVGs, themed by the site's CSS variables.

    python3 scripts/arch_svg.py   ->   _svg/abyssal-architecture.svg         (desktop, landscape)
                                     _svg/abyssal-architecture-mobile.svg  (phones, portrait)

Read it bottom to top. Inputs get a receipt and an origin tag (REAL or SCENARIO). Measurements
rise through the signal engines on the left, which share one contract (physics, inference,
calibration, contact); claims rise into the evidence-to-belief engine on the right. The only bridge
between the two is the admission gate. The posterior feeds the decisions and explanations at the
top, and each of those produces one output. Every node carries a title and a description for the
page's inspector.

Layout rules, so the chart stays legible: every edge is orthogonal and runs in a lane of its own;
no edge crosses a box or a label; every arrow ends on the edge of the box it means.
"""

from __future__ import annotations

import html
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT_DESK = ROOT / "_svg" / "abyssal-architecture.svg"
OUT_MOB = ROOT / "_svg" / "abyssal-architecture-mobile.svg"


def esc(s: str) -> str:
    return html.escape(s, quote=True)


# ---------------------------------------------------------------- content (shared by both layouts)
OUTS = {
    "o-plan": ("Next search", "where, with what, and what it is worth",
               "Which area to search next, with which asset, what it is worth and the point at which searching stops paying."),
    "o-map": ("Belief map", "posterior with 50% and 90% regions",
              "The probability map of where the object is, with credible regions. Only admitted observations ever change it."),
    "o-evmap": ("Evidence Map", "what moved the belief, and how far",
                "How far each item and each whole source moved the map, in bits, with exact undo."),
    "o-dossier": ("Dossier", "an audit pack anyone can re-run",
                  "An exportable record of the case: every source with its receipt, every computation with its model version, code commit and input hashes."),
}
DECIDE = {
    "d-next": ("Plan Studio", "where next · allocation · value · when to stop",
               "Ranks candidate searches by expected information gain, splits effort across assets (water-filling under exponential detection), prices it, and draws the search-to-exhaustion curve with its stopping point."),
    "d-ledger": ("Search Ledger", "unsearched · searched and missed · outside",
                 "Where the probability has gone: still unsearched, searched and missed, or outside the drawn area; plus Search Health checks for seven named traps."),
    "d-infl": ("Influence, in bits", "KL divergence per item and per source",
               "The Kullback–Leibler divergence between the map with and without each item, and each whole source, so you can see what is carrying the answer."),
    "d-audit": ("Audit trail", "model version · commit · inputs · who admitted",
                "Every result records the model version, code commit and input hashes, and every admission records who made it and when."),
}
PAIRS = [("d-next", "o-plan"), ("d-ledger", "o-map"), ("d-infl", "o-evmap"), ("d-audit", "o-dossier")]
GATE = ("Admission gate", "calibrated? then a person admits",
        "The only way into the belief map. A detector's output is a contact; only a calibrated detector (measured detection and false-alarm rates) can propose an observation, and a person must admit it. Agents propose, code acquires, humans admit. Automatic fusion of engine output into belief is deliberately parked.")
STACK = [  # top to bottom
    ("h-contact", "Contact", "estimate · uncertainty · score · provenance", "sig",
     "What every engine returns: a position (or time, depth, identity), its uncertainty, a score, and what is needed to reproduce it. A contact is never evidence by itself."),
    ("h-cal", "Calibration", "detection, false alarms, coverage vs an answer key", "sig hot",
     "Every engine is scored on SCENARIO data with a known answer: how often it finds the target, how often it raises false alarms, and whether its intervals contain the truth as often as they claim. The radar engines can also self-calibrate on REAL data from ships that broadcast AIS."),
    ("h-inf", "Inference", "matched filter · CFAR · Kalman · least squares", "sig",
     "Turns measurements into an estimate: matched filters and constant-false-alarm detectors, multi-target tracking with optimal assignment, Levenberg–Marquardt fits, stationary-phase chirps, cepstra, likelihood grids with analytic marginalisation."),
    ("h-phys", "Physics forward model", "what the data would be if the target were at x", "sig",
     "Each engine starts from the physics: Kelvin wakes and azimuth shift, dispersion of impact waves, sound in the SOFAR channel, a magnetic dipole in Earth's field, leeway drift, bubble oscillation, radar backscatter from a wind-roughened sea."),
]
BELIEF = [  # top to bottom
    ("b-norm", "Add & normalise", "log prior + Σ log L; outside-area mass kept", "bel hot",
     "The posterior is a sum in log space: the prior (terrain, drift, leeway or walking motion) plus every admitted likelihood, then normalised. Probability outside the drawn area is kept explicitly, never silently renormalised away. Six versioned models, each selectable."),
    ("b-neg", "Negative evidence", "searched and missed: log(1 − POD)", "bel",
     "A search that found nothing still moves the map: each searched cell is multiplied by the chance of missing, 1 − POD, a sum of log(1 − POD) in log space."),
    ("b-pool", "Provenance pooling", "echoes of one root count once", "bel",
     "Five reports that all trace back to one witness are one piece of evidence, not five. Items that share a provenance root are pooled before they enter the map."),
    ("b-lik", "Likelihood", "log L(x | claim, reliability, family)", "bel",
     "Each observation becomes a likelihood over the grid, weighted by its reliability and grouped by family so correlated evidence is not double counted."),
    ("b-obs", "Observations", "point · bearing · range · corridor · area · search", "bel",
     "Explicit, reviewable claims: a point with uncertainty, a bearing, a range ring, a corridor, a 'not here' area statement, a completed search with its POD."),
]
ENGINES = [
    ("sar", "SAR vessels & wakes", "Finds ships in radar images (CFAR), reads their wakes for heading and speed, and matches them to AIS; ships with no AIS are dark."),
    ("tracks", "Dark tracks", "Links dark detections across satellite passes with Kalman filters and optimal assignment; flags loitering, rendezvous and possible identities."),
    ("selfcal", "AIS self-calibration", "Every AIS ship the radar should have seen is a free labelled trial: detection rate by length and wind, on your own sensor."),
    ("wind", "Wind from radar", "Reads sea-surface wind from the radar backscatter (CMOD5.n) and wind streaks, because wind decides what a miss means."),
    ("persist", "Persistence", "Stacks many passes: what is always there (platforms, buoys), what keeps coming back (anchorages), what passes through."),
    ("identity", "Who went dark?", "Ranks vessels whose AIS went silent before a pass against each dark contact: reach, dead reckoning, length."),
    ("impact", "Impact rings", "The splash clock: an impact's ring waves disperse, so one image gives the centre and the time since impact."),
    ("rings", "Ring finder", "Matched-filter bank for debris rings, crater rims and slick rings at many radii."),
    ("tdoa", "Hydrophone TDOA", "Locates a bang from arrival-time differences at a few hydrophones, with a correlated error model and a mispick alarm."),
    ("sofar", "SOFAR basin", "Locates an event across an ocean basin from distant hydrophones; land blocks paths, and silence on open water is evidence."),
    ("bubble", "Implosion forensics", "Reads the bubble-pulse period of an implosion or explosion: size against depth, and depth when the hull volume is known."),
    ("magnetic", "Magnetic dipole", "Fits a magnetic dipole to a survey in Earth's field: position, depth and moment, induced or remanent."),
    ("seabed", "Seabed & sonar", "Finds compact relief in multibeam (including NOAA BlueTopo) and highlight–shadow pairs in side-scan."),
    ("debris", "Debris back-track", "Runs recovered debris backwards through wind and current to where it entered the water, sharing the uncertain environment."),
]
DRILL = ("Composite: lost-submarine drill",
         "Engines chain: a hydrophone fix (SOFAR), a collapse depth from the bubble pulse with the hull volume, and the seabed together rule out water too shallow for the implosion.")
CTX = ("Context, never evidence",
       "Everything in the Ops console and most map layers is context: it helps a person see and reason, but it cannot change the belief map. To count, it must become an explicit observation and be admitted.")
ORIGIN = ("Origin tag", "REAL or SCENARIO on every item: synthetic data never enters a real case",
          "Every item carries its origin: REAL or SCENARIO. Synthetic data is tagged end to end and can never enter a real case, so simulators and answer keys live safely alongside real evidence.")
RECEIPTS = ("Receipts & provenance", "URL · retrieval time · size · SHA-256 · licence · provenance root",
            "Every acquired file and fetched window gets a receipt, and every item records the root it descends from. Results record model version, code commit and input hashes, so anything can be reproduced and defended later.")
INPUTS = [
    ("i-docs", "Documents", "Docs", "reports, testimony, logs",
     "Witness statements, logs, reports and papers. Read by a person or proposed by an agent; a person decides what each one claims."),
    ("i-tracks", "Tracks", "Tracks", "AIS · ADS-B · GPX",
     "Vessel and aircraft tracks: AIS archives (including NOAA MarineCadastre day files), ADS-B, GPS logs. Context until a fix is used as evidence."),
    ("i-sensors", "Recordings", "Sensors", "SAR · sound · magnetics · sonar",
     "Raw measurements for the signal engines: radar images, acoustic recordings, magnetometer surveys, multibeam and side-scan."),
    ("i-layers", "Public layers", "Layers", "bathymetry · imagery · fields",
     "Opt-in public datasets fetched with receipts: depth, relief, magnetics, gravity, satellite radar and imagery."),
    ("i-sketch", "Sketches", "Sketches", "points · bearings · searches",
     "What an analyst draws or types: a sighting, a bearing, a corridor, a 'not here' statement, a completed search."),
]
SRC_ROWS = [
    ("Relief & seabed", "ETOPO 2022 · GEBCO · EMODnet depth & quality · NOAA BlueTopo · Natural Earth coastline"),
    ("Fields", "NOAA EMAG2v3 & BGS magnetics · Scripps marine gravity · Open-Meteo wind & currents"),
    ("Radar & imagery", "Sentinel-1 RTC on AWS · NASA GIBS · RainViewer · OpenStreetMap & OpenSeaMap basemaps"),
    ("Traffic & events", "ADS-B (adsb.lol, OpenSky) · AIS (Digitraffic, MarineCadastre) · USGS quakes · satellite elements"),
]
SRC_DESC = ("All opt-in and fetched on request, each with a receipt. Most are context; a few feed engines directly: "
            "Sentinel-1 windows under the radar engines, BlueTopo under the seabed engine, bathymetry under the drill.")
UI = {
    "ui-task": ("Tasking export", "Plan Studio exports tasking for each asset: areas, tracks and timings, ready for a crew."),
    "ui-plan": ("Where next · Plan Studio", "Where next? ranks searches by expected information; Plan Studio allocates assets and prices the search."),
    "ui-review": ("Review · admit · undo", "Admit, reject or undo observations; every change is in the history with exact undo."),
    "ui-lab": ("Signal Lab", "Fourteen signal engines in one panel: run them on SCENARIO scenes with answer keys, or on your own data and public archives."),
    "ui-add": ("Add · Archive", "Add sources: documents, files, tracks, recordings. Originals are kept with their hashes."),
    "ui-layers": ("Layers", "Opt-in public layers: bathymetry, magnetics, gravity, imagery, fetched with receipts."),
    "ui-export": ("Export dossier", "Exports the dossier and audit pack: sources, receipts, model versions, input hashes."),
    "ui-hist": ("History · Evidence Map", "The full history of the case with exact undo, and the Evidence Map: what each item and source did to the belief, in bits."),
    "ui-move": ("Movement & time", "Drift, walking and leeway motion; particle previews; a shared clock for replay."),
    "ui-sketch": ("Sketch evidence", "Draw a point, bearing, range ring, corridor or area statement; it becomes a draft observation to review."),
    "ui-ops": ("Ops console", "Live air and sea traffic, satellites, wind, currents, radar, quakes and fires, plus field tools. Context only."),
}
LEGEND = [("sig", "signal engines"), ("bel", "evidence → belief"), ("plan", "decide"), ("out", "output"),
          ("gate", "human gate"), ("ctx", "context, never evidence"), ("ui", "interface")]


class Canvas:
    def __init__(self, marker: str) -> None:
        self.parts: list[str] = []
        self.marker = marker

    def node(self, k: str, x: float, y: float, w: float, h: float, title: str, sub: str = "", cls: str = "",
             desc: str = "", href: str = "", rx: float = 9, tsize: float | None = None, ssize: float | None = None,
             wrap: float = 6.3, max_lines: int = 3) -> None:
        lines = textwrap.wrap(sub, max(10, int(w / wrap)))[:max_lines] if sub else []
        lh = 14 if not ssize else ssize + 3
        total = (tsize or 14) + 3 + lh * len(lines)
        ty = y + h / 2 - total / 2 + (tsize or 14) - 1
        ts = f' style="font-size:{tsize}px"' if tsize else ""
        ss = f' style="font-size:{ssize}px"' if ssize else ""
        t = [f'<text class="t" x="{x + w / 2:.1f}" y="{ty:.1f}"{ts}>{esc(title)}</text>']
        for i, ln in enumerate(lines):
            t.append(f'<text class="s" x="{x + w / 2:.1f}" y="{ty + (tsize or 14) + 3 + lh * i:.1f}"{ss}>{esc(ln)}</text>')
        inner = f'<title>{esc(title)}</title><rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}"/>' + "".join(t)
        attrs = f'class="node {cls}" data-k="{k}" data-title="{esc(title)}" data-desc="{esc(desc or sub)}" tabindex="0"'
        self.parts.append(f'<a href="{href}" {attrs}>{inner}</a>' if href else f"<g {attrs}>{inner}</g>")

    def edge(self, pts: list[tuple[float, float]], ks: str, cls: str = "edge", head: bool = True) -> None:
        d = "M" + " L".join(f"{x:g} {y:g}" for x, y in pts)
        m = f' marker-end="url(#{self.marker})"' if head else ""
        self.parts.append(f'<path class="{cls}" data-e="{ks}" d="{d}"{m}/>')

    def raw(self, s: str) -> None:
        self.parts.append(s)

    def text(self, cls: str, x: float, y: float, s: str, extra: str = "") -> None:
        self.parts.append(f'<text class="{cls}" x="{x:g}" y="{y:g}"{extra}>{esc(s)}</text>')

    def svg(self, w: int, h: int, cls: str, tid: str, title: str, desc: str) -> str:
        return (
            f'<svg class="arch-svg {cls}" viewBox="0 0 {w} {h}" role="img" aria-labelledby="{tid}-t {tid}-d" '
            'xmlns="http://www.w3.org/2000/svg">'
            f'<title id="{tid}-t">{esc(title)}</title><desc id="{tid}-d">{esc(desc)}</desc>'
            f'<defs><marker id="{self.marker}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
            'orient="auto-start-reverse"><path class="arrowhead" d="M0 0 L10 5 L0 10 z"/></marker></defs>'
            + "".join(self.parts) + "</svg>"
        )


DESC = ("Read from the bottom up. Inputs (documents, tracks, recordings, public layers, sketches) get receipts and an "
        "origin tag. Measurements go through fourteen signal engines that share one contract: physics forward model, "
        "inference, calibration, contact. Contacts pass an admission gate (calibrated, then admitted by a person) into "
        "the evidence-to-belief engine: observations, likelihood, provenance pooling, negative evidence, add and "
        "normalise. Claims enter that engine directly. The posterior feeds where next and Plan Studio, the Search "
        "Ledger, influence in bits and the audit trail, which produce the next search, the belief map, the Evidence Map "
        "and the dossier.")


# ================================================================ desktop: 1200 × 1690
def desktop() -> str:
    c = Canvas("ah")
    L, R = 236, 976
    cols = [L + i * 188 for i in range(4)]          # 236, 424, 612, 800; width 176
    cx = [x + 88 for x in cols]                       # 324, 512, 700, 888

    # outputs and decisions, aligned in columns so every arrow is vertical
    c.text("band", L, 34, "OUTPUTS")
    c.text("band", L, 146, "DECIDE")
    for i, (dk, ok) in enumerate(PAIRS):
        t, s, d = OUTS[ok]
        c.node(ok, cols[i], 44, 176, 68, t, s, "out", d)
        t, s, d = DECIDE[dk]
        c.node(dk, cols[i], 156, 176, 68, t, s, "plan", d)
        c.edge([(cx[i], 156), (cx[i], 114)], f"{dk} {ok}")
    # the posterior bus: Engine I rises in its own lane and feeds every decision box
    BUS = 246
    c.edge([(920, 398), (920, BUS), (cx[0], BUS)], "b-norm " + " ".join(k for k, _ in PAIRS), "edge flow", head=False)
    for i, (dk, _) in enumerate(PAIRS):
        c.edge([(cx[i], BUS), (cx[i], 226)], f"b-norm {dk}", "edge flow")
    c.raw(f'<circle class="bus-dot" cx="{cx[0]}" cy="{BUS}" r="3.5"/>')
    c.text("tiny", 934, 300, "posterior", ' transform="rotate(-90 934 300)"')

    # the gate, centred between the engines
    t, s, d = GATE
    c.node("gate", 486, 268, 240, 54, t, s, "gate", d)

    # ---------------- Engine II (left tower)
    c.raw(f'<rect class="tower sigt" x="{L}" y="350" width="360" height="806" rx="16"/>')
    c.text("tower-t left", 256, 378, "ENGINE II · HIDDEN SIGNALS")
    for off in (20, 10):
        c.raw(f'<rect class="sheet back" x="{276 + off}" y="{412 - off}" width="262" height="350" rx="12"/>')
    c.raw('<rect class="sheet" x="276" y="412" width="262" height="350" rx="12"/>')
    hx, hw = 294, 226
    ys = [430, 508, 590, 672]
    hs = [58, 62, 62, 62]
    for (k, t, s, cls, d), y, h in zip(STACK, ys, hs):
        c.node(k, hx, y, hw, h, t, s, cls, d, ssize=11, wrap=6.0)
    mid = hx + hw / 2
    c.edge([(mid, 672), (mid, 654)], "h-phys h-inf")
    c.edge([(mid, 590), (mid, 572)], "h-inf h-cal")
    c.edge([(mid, 508), (mid, 490)], "h-cal h-contact")
    # self-calibration: contacts matched to AIS become calibration trials
    c.raw('<path class="edge loop" data-e="h-contact h-cal" d="M294 470 C250 476 250 526 290 532" marker-end="url(#ah)"/>')
    c.text("tiny", 250, 501, "self-cal", ' transform="rotate(-90 250 501)"')
    # contact -> gate, in the lane between the sheets and the tower wall
    c.edge([(520, 459), (576, 459), (576, 324)], "h-contact gate", "edge flow")
    # fourteen engines share the contract
    c.text("band", 256, 806, "FOURTEEN ENGINES · ONE CONTRACT")
    for i, (k, t, d) in enumerate(ENGINES):
        x = 256 + (i % 2) * 166
        y = 820 + (i // 2) * 42
        c.node(f"head-{k}", x, y, 154, 32, t, "", "chip", d, href=f"#eng-{k}", rx=16, tsize=12.5)
    c.node("drill", 256, 1114, 320, 32, DRILL[0], "", "chip", DRILL[1], href="#eng-drill", rx=16, tsize=12.5)

    # ---------------- Engine I (right tower)
    c.raw('<rect class="tower belt" x="636" y="350" width="340" height="470" rx="16"/>')
    c.text("tower-t left", 656, 378, "ENGINE I · EVIDENCE → BELIEF")
    bx, bw = 656, 280
    bys = [398, 480, 556, 632, 708]
    bhs = [62, 56, 56, 56, 82]
    for (k, t, s, cls, d), y, h in zip(BELIEF, bys, bhs):
        c.node(k, bx, y, bw, h, t, s, cls, d)
    for (k1, *_), (k2, *_), y1, y2 in zip(BELIEF[1:], BELIEF[:-1], bys[1:], [y + h for y, h in zip(bys, bhs)]):
        c.edge([(796, y1), (796, y2 + 2)], f"{k1} {k2}")
    # gate -> observations, down the lane between the towers
    c.edge([(616, 322), (616, 749), (654, 749)], "gate b-obs", "edge flow")

    # context, below Engine I, clear of the claims lane
    c.node("ctx", 716, 852, 260, 132, CTX[0],
           "basemaps · imagery · live traffic · weather · field tools: for orientation, never multiplied into belief",
           "ctx", CTX[1])

    # ---------------- origin tag and receipts
    c.raw(f'<g class="node enc" data-k="origin" data-title="{esc(ORIGIN[0])}" data-desc="{esc(ORIGIN[2])}" tabindex="0">'
          f'<title>{esc(ORIGIN[0])}</title><rect x="{L}" y="1180" width="740" height="46" rx="9"/>'
          '<circle class="oplus" cx="282" cy="1203" r="13"/><path class="oplusx" d="M273 1203 L291 1203 M282 1194 L282 1212"/>'
          f'<text class="t left" x="310" y="1199">{esc(ORIGIN[0])}</text>'
          f'<text class="s left" x="310" y="1215">{esc(ORIGIN[1])}</text></g>')
    t, s, d = RECEIPTS
    c.node("receipts", L, 1246, 740, 54, t, s, "in", d)
    c.edge([(606, 1246), (606, 1228)], "receipts origin")
    # measurements rise on the left wall of Engine II; claims rise in the lane left of the context box
    c.edge([(246, 1180), (246, 778), (330, 778), (330, 736)], "origin h-phys", "edge flow")
    c.edge([(690, 1180), (690, 792)], "origin b-obs", "edge flow")
    c.text("tiny left", 254, 1172, "measurements")
    c.text("tiny left", 698, 1172, "claims")

    # ---------------- inputs and sources
    c.text("band", L, 1338, "INPUTS")
    for i, (k, t, _short, s, d) in enumerate(INPUTS):
        x = L + i * 150
        c.node(k, x, 1346, 140, 70, t, s, "in", d)
        c.edge([(x + 70, 1346), (x + 70, 1302)], f"{k} receipts")
    rows = "".join(
        f'<text class="s left srck" x="{L + 22}" y="{1500 + 24 * i}">{esc(a)}</text>'
        f'<text class="s left" x="{L + 150}" y="{1500 + 24 * i}">{esc(b)}</text>'
        for i, (a, b) in enumerate(SRC_ROWS)
    )
    c.raw(f'<g class="node ctx" data-k="sources" data-title="Where the maps and data come from" data-desc="{esc(SRC_DESC)}" tabindex="0">'
          f'<title>Where the maps and data come from</title><rect x="{L}" y="1452" width="740" height="150" rx="9"/>'
          f'<text class="t left" x="{L + 22}" y="1478">Where the maps and data come from</text>{rows}</g>')
    for k in ("i-tracks", "i-sensors", "i-layers"):
        i = [x[0] for x in INPUTS].index(k)
        x = L + i * 150 + 70
        c.edge([(x, 1452), (x, 1418)], f"sources {k}", "edge dash")

    # ---------------- interfaces: each rail item meets the outermost box of its row
    c.text("rail-t", 110, 34, "INTERFACE")
    c.text("rail-t", 1098, 34, "INTERFACE")
    left = [("ui-task", 78, cols[0]), ("ui-plan", 190, cols[0]), ("ui-review", 295, 486), ("ui-lab", 582, L),
            ("ui-add", 1381, L), ("ui-layers", 1527, L)]
    right = [("ui-export", 78, R), ("ui-hist", 190, R), ("ui-move", 429, 936), ("ui-sketch", 749, 936), ("ui-ops", 918, R)]
    for k, y, tx in left:
        t, d = UI[k]
        c.node(k, 24, y - 22, 172, 44, t, "", "ui", d, rx=22, tsize=12)
        c.edge([(196, y), (tx, y)], k, "edge dot", head=False)
    for k, y, tx in right:
        t, d = UI[k]
        c.node(k, 1004, y - 22, 172, 44, t, "", "ui", d, rx=22, tsize=12)
        c.edge([(1004, y), (tx, y)], k, "edge dot", head=False)

    # ---------------- legend
    x = 40
    for cls, t in LEGEND:
        c.raw(f'<g class="node {cls} key"><rect x="{x}" y="1640" width="18" height="14" rx="3"/></g>')
        c.text("s left", x + 24, 1651, t)
        x += 24 + len(t) * 6.6 + 26
    return c.svg(1200, 1680, "desk", "archd", "ABYSSAL architecture", DESC)


# ================================================================ mobile: 400 × 1400, portrait
def mobile() -> str:
    c = Canvas("ahm")
    # decide (left) and outputs (right), paired across so each arrow is short and horizontal
    c.text("band", 24, 30, "DECIDE")
    c.text("band", 224, 30, "OUTPUTS")
    BUSX = 12
    row_y = [40, 104, 168, 232]
    for (dk, ok), y in zip(PAIRS, row_y):
        t, s, d = DECIDE[dk]
        c.node(dk, 24, y, 174, 54, t, s, "plan", d, tsize=12, ssize=10, wrap=5.4, max_lines=2)
        t, s, d = OUTS[ok]
        c.node(ok, 222, y, 168, 54, t, s, "out", d, tsize=12, ssize=10, wrap=5.4, max_lines=2)
        c.edge([(198, y + 27), (220, y + 27)], f"{dk} {ok}")
        c.edge([(BUSX, y + 27), (22, y + 27)], f"b-norm {dk}", "edge flow")
    BUSY = 300
    c.edge([(362, 404), (362, BUSY), (BUSX, BUSY), (BUSX, row_y[0] + 27)], "b-norm " + " ".join(k for k, _ in PAIRS),
           "edge flow", head=False)
    c.text("tiny", 374, 338, "posterior", ' transform="rotate(-90 374 338)"')

    # gate on the left, so its exit runs down the lane between the engines
    t, s, d = GATE
    c.node("gate", 24, 312, 172, 46, t, "calibrated, then admitted", "gate", d, tsize=12.5, ssize=10, wrap=5.4, max_lines=1)

    # Engine II, left column, with its fourteen engines
    c.raw('<rect class="tower sigt" x="10" y="372" width="184" height="760" rx="12"/>')
    c.text("tower-t left", 20, 392, "ENGINE II · SIGNALS", ' style="font-size:10px"')
    ys = [404, 462, 520, 578]
    for (k, t, s, cls, d), y in zip(STACK, ys):
        c.node(k, 22, y, 162, 44, t, s, cls, d, tsize=12, ssize=9.5, wrap=5.2, max_lines=2)
    for (lo, *_), (up, *_), y in zip(STACK[1:], STACK[:-1], ys[1:]):
        c.edge([(103, y), (103, y - 12)], f"{lo} {up}")
    c.edge([(176, 404), (176, 360)], "h-contact gate", "edge flow")
    c.text("band", 22, 652, "14 ENGINES · ONE CONTRACT", ' style="font-size:9px"')
    for i, (k, t, d) in enumerate(ENGINES):
        c.node(f"head-{k}", 22, 660 + i * 31, 162, 26, t, "", "chip", d, href=f"#eng-{k}", rx=13, tsize=11.5)
    c.node("drill", 22, 1096, 162, 26, "Lost-submarine drill", "", "chip", DRILL[1], href="#eng-drill", rx=13, tsize=11.5)

    # Engine I, right column
    c.raw('<rect class="tower belt" x="206" y="372" width="178" height="330" rx="12"/>')
    c.text("tower-t left", 216, 392, "ENGINE I · BELIEF", ' style="font-size:10px"')
    bys = [404, 462, 520, 578, 636]
    for (k, t, s, cls, d), y in zip(BELIEF, bys):
        c.node(k, 216, y, 158, 44 if k != "b-obs" else 50, t, s, cls, d, tsize=12, ssize=9.5, wrap=5.2, max_lines=2)
    for (lo, *_), (up, *_), y in zip(BELIEF[1:], BELIEF[:-1], bys[1:]):
        c.edge([(295, y), (295, y - 12)], f"{lo} {up}")
    c.edge([(196, 335), (200, 335), (200, 661), (214, 661)], "gate b-obs", "edge flow")

    # context and legend fill the right column under Engine I
    c.node("ctx", 206, 722, 172, 104, CTX[0], "maps · imagery · live traffic · weather: never multiplied into belief",
           "ctx", CTX[1], tsize=12, ssize=9.5, wrap=5.2, max_lines=3)
    for i, (cls, t) in enumerate(LEGEND):
        y = 852 + i * 24
        c.raw(f'<g class="node {cls} key"><rect x="210" y="{y}" width="16" height="12" rx="3"/></g>')
        c.text("s left", 234, y + 10, t, ' style="font-size:10.5px"')

    # origin, receipts, inputs
    c.raw(f'<g class="node enc" data-k="origin" data-title="{esc(ORIGIN[0])}" data-desc="{esc(ORIGIN[2])}" tabindex="0">'
          f'<title>{esc(ORIGIN[0])}</title><rect x="10" y="1150" width="380" height="42" rx="9"/>'
          '<circle class="oplus" cx="34" cy="1171" r="11"/><path class="oplusx" d="M26 1171 L42 1171 M34 1163 L34 1179"/>'
          f'<text class="t left" x="54" y="1167" style="font-size:12.5px">{esc(ORIGIN[0])}</text>'
          '<text class="s left" x="54" y="1182" style="font-size:10px">REAL or SCENARIO on every item</text></g>')
    t, s, d = RECEIPTS
    c.node("receipts", 10, 1206, 380, 46, t, "URL · time · SHA-256 · licence · provenance root", "in", d,
           tsize=12.5, ssize=10, wrap=5.4, max_lines=1)
    c.edge([(200, 1206), (200, 1194)], "receipts origin")
    c.edge([(16, 1150), (16, 638), (60, 638), (60, 624)], "origin h-phys", "edge flow")
    c.edge([(393, 1150), (393, 661), (376, 661)], "origin b-obs", "edge flow")
    c.text("tiny left", 22, 1142, "measurements")
    c.text("tiny", 360, 1142, "claims")
    for i, (k, _t, short, _s, d) in enumerate(INPUTS):
        x = 10 + i * 77
        c.node(k, x, 1272, 72, 40, short, "", "in", d, tsize=11.5)
        c.edge([(x + 36, 1272), (x + 36, 1254)], f"{k} receipts")
    c.text("band", 10, 1330, "INPUTS")
    return c.svg(400, 1340, "mob", "archm", "ABYSSAL architecture (portrait)", DESC)


def main() -> None:
    OUT_DESK.parent.mkdir(exist_ok=True)
    for path, svg in ((OUT_DESK, desktop()), (OUT_MOB, mobile())):
        path.write_text(svg + "\n", encoding="utf-8")
        print(f"wrote {path.relative_to(ROOT)} ({len(svg):,} bytes, {svg.count('data-k=')} nodes)")


if __name__ == "__main__":
    main()
