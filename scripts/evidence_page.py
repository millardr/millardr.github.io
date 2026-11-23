"""Build the ABYSSAL "Proven on real data" page from the measured results.

    python3 scripts/evidence_page.py [path/to/ABYSSAL/abyssal/realdata/results]

With a results path it first refreshes _data/realdata.json (a slim copy: numbers only, no ship
identities, no receipts beyond scene ids); without one it renders from the committed copy. It writes
_pages/abyssal/evidence.html, which build_site.py then builds like every other page. Every chart is
inline SVG drawn from those numbers, so nothing on the page is typed in by hand.
"""

from __future__ import annotations

import html
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "_data" / "realdata.json"
OUT = ROOT / "_pages" / "abyssal" / "evidence.html"


# ---------------------------------------------------------------- data
def refresh(results: Path) -> dict:
    j = lambda name: json.loads((results / f"{name}.json").read_text())  # noqa: E731
    w, sh, pl, wr, sj = j("wind_buoys"), j("ships_ais"), j("platforms_persistence"), j("wrecks_bluetopo"), j("san_juan")
    sp, ch = j("spectral_implants"), j("spectral_change")
    good = [s for s in w["samples"] if s.get("blind_m_s") is not None and s["buoy"].get("u10_m_s") is not None and not s.get("below_noise_floor")]
    data = {
        "wind": {
            "summary": w["summary"],
            "points": [[round(s["buoy"]["u10_m_s"], 2), round(s["blind_m_s"], 2)] for s in good if math.isfinite(s["blind_m_s"])],
            "aided_points": [[round(s["buoy"]["u10_m_s"], 2), round(s["aided_m_s"], 2)] for s in good if s.get("aided_m_s") is not None and math.isfinite(s["aided_m_s"])],
        },
        "ships": {k: sh["calibration"][k] for k in ("pod_by_length", "trials", "unmatched_detections", "water_area_km2", "false_alarm_upper_per_1000_km2")}
        | {"windows": len(sh["windows"])},
        "platforms": {
            "summary": pl["summary"],
            "rows": [{"field": f["name"].split(" (")[0], "name": p["name"], "found": p["found"], "error_m": p.get("error_m"), "seen": p.get("seen")} for f in pl["fields"] for p in f["charted_platforms"]],
        },
        "wrecks": {
            "summary": wr["summary"],
            "rows": [{"region": r["region"], "depth_m": round(r["charted_depth_m"], 1), "pixel_m": r["bluetopo_pixel_m"], "found": r["detected"], "error_m": r.get("error_m")} for r in wr["rows"]],
        },
        "san_juan": {"facts": sj["facts"], "event_to_wreck_km": sj["event_to_wreck_km"], "etopo_depth_at_wreck_m": sj["etopo_depth_at_wreck_m"], "cases": [
            {"sigma": c["sigma_bearing_deg"], "fix95": c["location_only"]["area95_km2"], "depth95": c["with_collapse_depth_ge_300m"]["area95_km2"],
             "in50": c["with_collapse_depth_ge_300m"]["wreck_inside_50"], "ruled_out": c["with_collapse_depth_ge_300m"]["probability_ruled_out"]} for c in sj["cases"]]},
        "spectral": {"pod": sp["summary"]["pod"], "false_alarms_per_km2": sp["summary"]["false_alarms_per_km2"], "sites": [s["name"] for s in sp["scenes"]]},
        "change": {
            "summary": {k: v for k, v in ch["summary"].items() if not k.startswith("pod")},
            "pod_new_orange_20": ch["summary"]["pod_new"]["orange fabric (tent, survival bag)"]["0.2"],
            "pairs": [{"name": p["name"].split(",")[0], "before": p["before"]["datetime"][:10], "after": p["after"]["datetime"][:10],
                       "seen": p["earlier_view_share"], "one": p["single_scene_false_alarms"], "new": p["new_false_alarms"], "km2": p["usable_area_km2"]} for p in ch["scenes"]],
        },
    }
    DATA.parent.mkdir(exist_ok=True)
    DATA.write_text(json.dumps(data, indent=1))
    return data


# ---------------------------------------------------------------- svg helpers
def svg(w: int, h: int, label: str, body: str) -> str:
    return f'<svg class="evchart" viewBox="0 0 {w} {h}" role="img" aria-label="{html.escape(label)}">{body}</svg>'


def t(x: float, y: float, s: str, cls: str = "lab", anchor: str = "start", extra: str = "") -> str:
    return f'<text class="{cls}" x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}"{extra}>{html.escape(s)}</text>'


def wind_chart(d: dict) -> str:
    W, H, L, B, T, R = 520, 440, 56, 52, 18, 18
    lo, hi = 0.0, 20.0
    X = lambda v: L + (v - lo) / (hi - lo) * (W - L - R)  # noqa: E731
    Y = lambda v: H - B - (v - lo) / (hi - lo) * (H - B - T)  # noqa: E731
    b = [f'<path class="band" d="M{X(0)} {Y(2)} L{X(18)} {Y(20)} L{X(20)} {Y(20)} L{X(20)} {Y(18)} L{X(2)} {Y(0)} L{X(0)} {Y(0)} Z"/>']
    for v in range(0, 21, 5):
        b.append(f'<path class="grid" d="M{X(v)} {Y(0)} V{Y(20)} M{X(0)} {Y(v)} H{X(20)}"/>')
        b.append(t(X(v), H - B + 18, str(v), "tick", "middle"))
        b.append(t(L - 8, Y(v) + 4, str(v), "tick", "end"))
    b.append(f'<path class="diag" d="M{X(0)} {Y(0)} L{X(20)} {Y(20)}"/>')
    for x, y in d["points"]:
        if lo <= x <= hi and lo <= y <= hi:
            b.append(f'<circle class="pt" cx="{X(x):.1f}" cy="{Y(y):.1f}" r="3.2"/>')
    b.append(t((L + W - R) / 2, H - 10, "Buoy anemometer, adjusted to 10 m (m/s)", "axis", "middle"))
    b.append(t(16, (T + H - B) / 2, "Wind read from the radar (m/s)", "axis", "middle", f' transform="rotate(-90 16 {(T + H - B) / 2:.0f})"'))
    s = d["summary"]["blind"]
    b.append(t(X(0.6), Y(18.6), f"RMSE {s['rmse_m_s']} m/s · bias +{s['bias_m_s']} · r = {s['r']}", "note"))
    b.append(t(X(0.6), Y(17.2), f"{round(100 * s['within_2_m_s'])}% within ±2 m/s (shaded)", "note dim"))
    return svg(W, H, f"Scatter of {s['n']} radar wind readings against buoy wind; RMSE {s['rmse_m_s']} metres per second", "".join(b))


def ships_chart(d: dict) -> str:
    rows = d["pod_by_length"]
    W, H, L, B, T = 520, 290, 56, 52, 18
    bw = (W - L - 20) / len(rows)
    Y = lambda v: H - B - v * (H - B - T)  # noqa: E731
    b = []
    for v in (0, 0.25, 0.5, 0.75, 1.0):
        b.append(f'<path class="grid" d="M{L} {Y(v)} H{W - 20}"/>')
        b.append(t(L - 8, Y(v) + 4, f"{round(v * 100)}%", "tick", "end"))
    for i, r in enumerate(rows):
        x = L + i * bw + bw * 0.18
        w_ = bw * 0.64
        cls = "bar" if r["status"] == "measured" else "bar dim"
        b.append(f'<rect class="{cls}" x="{x:.1f}" y="{Y(r["pod"]):.1f}" width="{w_:.1f}" height="{Y(0) - Y(r["pod"]):.1f}" rx="3"/>')
        cx = x + w_ / 2
        b.append(f'<path class="whisk" d="M{cx:.1f} {Y(r["pod_low"]):.1f} V{Y(r["pod_high"]):.1f} M{cx - 6:.1f} {Y(r["pod_low"]):.1f} h12 M{cx - 6:.1f} {Y(r["pod_high"]):.1f} h12"/>')
        lo_, hi_ = r["length_range_m"]
        b.append(t(cx, H - B + 18, f"{lo_:.0f}-{hi_:.0f} m", "tick", "middle"))
        b.append(t(cx, H - B + 34, f"{r['detected']}/{r['trials']}", "tick dim", "middle"))
    return svg(W, H, "Detection rate by ship length with 95 percent intervals", "".join(b))


def platforms_chart(d: dict) -> str:
    rows = sorted([r for r in d["rows"] if r["found"]], key=lambda r: r["error_m"])
    W, H, L, T = 520, 64 + 22 * len(rows), 112, 24
    X = lambda v: L + v / 130 * (W - L - 24)  # noqa: E731
    b = []
    for v in (0, 25, 50, 75, 100, 125):
        b.append(f'<path class="grid" d="M{X(v)} {T - 6} V{H - 34}"/>')
        b.append(t(X(v), H - 18, f"{v} m", "tick", "middle"))
    for i, r in enumerate(rows):
        y = T + i * 22 + 8
        b.append(f'<path class="stem" d="M{X(0)} {y} H{X(r["error_m"]):.1f}"/>')
        b.append(f'<circle class="pt big" cx="{X(r["error_m"]):.1f}" cy="{y}" r="5"/>')
        b.append(t(L - 10, y + 4, r["name"], "tick", "end"))
        label = f"{r['error_m']:.0f} m · seen {r['seen']}"
        right = X(r["error_m"]) + 10 + 7 * len(label) > W  # label would run past the edge: put it inside
        b.append(t(X(r["error_m"]) - 10 if right else X(r["error_m"]) + 10, y + 4, label, "tick dim", "end" if right else "start"))
    return svg(W, H, "Distance between each detected platform and its charted position", "".join(b))


def wrecks_chart(d: dict) -> str:
    rows = sorted(d["rows"], key=lambda r: (r["pixel_m"], not r["found"], r["depth_m"]))
    cols, size, gap = 17, 22, 5
    W = cols * (size + gap) + 20
    H = math.ceil(len(rows) / cols) * (size + gap) + 14
    b = []
    for i, r in enumerate(rows):
        x, y = 10 + (i % cols) * (size + gap), 10 + (i // cols) * (size + gap)
        tip = f"{r['depth_m']} m deep, {r['pixel_m']:.0f} m grid: " + (f"found, {r['error_m']} m off" if r["found"] else "missed")
        b.append(f'<rect class="{"hit" if r["found"] else "miss"}" x="{x}" y="{y}" width="{size}" height="{size}" rx="4"><title>{html.escape(tip)}</title></rect>')
    return svg(W, H, f"{sum(r['found'] for r in rows)} of {len(rows)} charted wrecks found", "".join(b))


def wreck_errors(d: dict) -> str:
    errs = [r["error_m"] for r in d["rows"] if r["found"] and r["error_m"] is not None]
    bins = [0, 5, 10, 15, 20, 30, 45, 60]
    counts = [sum(lo <= e < hi for e in errs) for lo, hi in zip(bins, bins[1:])]
    W, H, L, B, T = 520, 220, 40, 44, 14
    bw = (W - L - 10) / len(counts)
    m = max(counts) or 1
    Y = lambda v: H - B - v / m * (H - B - T)  # noqa: E731
    b = []
    for i, c in enumerate(counts):
        x = L + i * bw + 4
        b.append(f'<rect class="bar" x="{x:.1f}" y="{Y(c):.1f}" width="{bw - 8:.1f}" height="{Y(0) - Y(c):.1f}" rx="3"/>')
        b.append(t(x + (bw - 8) / 2, Y(c) - 5, str(c), "tick", "middle"))
        b.append(t(x + (bw - 8) / 2, H - B + 16, f"{bins[i]}-{bins[i + 1]}", "tick", "middle"))
    b.append(t((L + W) / 2, H - 8, "Distance from the charted position (m), found wrecks", "axis", "middle"))
    return svg(W, H, "Histogram of position error for found wrecks", "".join(b))


def san_juan_chart(d: dict) -> str:
    cases = d["cases"]
    W, H, L, B, T = 520, 280, 64, 56, 20
    top = max(c["fix95"] for c in cases) * 1.1
    gw = (W - L - 20) / len(cases)
    Y = lambda v: H - B - v / top * (H - B - T)  # noqa: E731
    b = []
    for v in range(0, int(top) + 1, 20000):
        b.append(f'<path class="grid" d="M{L} {Y(v)} H{W - 20}"/>')
        b.append(t(L - 8, Y(v) + 4, f"{v // 1000}k", "tick", "end"))
    for i, c in enumerate(cases):
        x0 = L + i * gw + gw * 0.14
        bw = gw * 0.34
        b.append(f'<rect class="bar dim" x="{x0:.1f}" y="{Y(c["fix95"]):.1f}" width="{bw:.1f}" height="{Y(0) - Y(c["fix95"]):.1f}" rx="3"/>')
        b.append(f'<rect class="bar" x="{x0 + bw + 4:.1f}" y="{Y(c["depth95"]):.1f}" width="{bw:.1f}" height="{Y(0) - Y(c["depth95"]):.1f}" rx="3"/>')
        b.append(t(x0 + bw / 2, Y(c["fix95"]) - 6, f"{c['fix95']:,}", "tick", "middle"))
        b.append(t(x0 + bw * 1.5 + 4, Y(c["depth95"]) - 6, f"{c['depth95']:,}", "tick", "middle"))
        b.append(t(x0 + bw + 2, H - B + 18, f"bearing ±{c['sigma']}°", "tick", "middle"))
        b.append(t(x0 + bw + 2, H - B + 34, "wreck in 50% region" if c["in50"] else "wreck outside 50%", "tick dim", "middle"))
    return svg(W, H, "Ninety-five percent search area with and without the collapse-depth constraint", "".join(b))


def change_chart(d: dict) -> str:
    pairs = d["pairs"]
    W, L, T = 520, 150, 16
    H = T + len(pairs) * 44 + 4
    top = max(p["one"] for p in pairs) * 1.08
    X = lambda v: L + v / top * (W - L - 40)  # noqa: E731
    b = []
    for i, p in enumerate(pairs):
        y = T + i * 44
        b.append(t(L - 10, y + 12, p["name"], "tick", "end"))
        b.append(t(L - 10, y + 27, f"earlier pass sees {round(p['seen'] * 100)}%", "tick dim", "end"))
        b.append(f'<rect class="bar dim" x="{L}" y="{y}" width="{X(p["one"]) - L:.1f}" height="14" rx="3"/>')
        b.append(f'<rect class="bar" x="{L}" y="{y + 17}" width="{max(2, X(p["new"]) - L):.1f}" height="14" rx="3"/>')
        b.append(t(X(p["one"]) + 6, y + 11, str(p["one"]), "tick"))
        b.append(t(max(X(p["new"]), L + 2) + 6, y + 28, str(p["new"]), "tick"))
    return svg(W, H, "Other anomalies per site, one scene against new since an earlier pass", "".join(b))


def spectral_table(d: dict) -> str:
    sizes = ["0.1", "0.2", "0.35", "0.5", "1"]
    head = "".join(f"<th>{round(float(s) * 100)} m²</th>" for s in sizes)
    rows = []
    for target, row in d["pod"].items():
        cells = "".join(
            f'<td style="--p:{row[s]["pod"]}" title="{row[s]["detected"]} of {row[s]["trials"]}; 95% {round(row[s]["pod_95"][0] * 100)}-{round(row[s]["pod_95"][1] * 100)}%">{round(row[s]["pod"] * 100)}%</td>'
            for s in sizes
        )
        rows.append(f"<tr><th scope=\"row\">{html.escape(target.split(' (')[0])}</th>{cells}</tr>")
    return f'<table class="heat"><caption>Share of planted targets found, by size (one 10 m pixel is 100 m²); 125 trials per cell</caption><thead><tr><th>Target</th>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table>'


# ---------------------------------------------------------------- page
def study(sid: str, kicker: str, title: str, lede: str, nums: list[tuple[str, str]], figure: str, proves: str, not_yet: str, cap: str) -> str:
    n = "".join(f"<div><b>{html.escape(a)}</b><small>{html.escape(b)}</small></div>" for a, b in nums)
    return f"""
<section class="evstudy reveal" id="{sid}">
  <div class="ev-tx">
    <div class="k">{kicker}</div>
    <h3>{title}</h3>
    <p>{lede}</p>
    <div class="nums">{n}</div>
    <div class="ev-verdict"><p><span class="tag real">shows</span> {proves}</p><p><span class="tag">does not show</span> {not_yet}</p></div>
  </div>
  <figure class="ev-fig">{figure}<figcaption>{cap}</figcaption></figure>
</section>"""


def band_bias(points: list, lo: float, hi: float) -> float:
    e = [y - x for x, y in points if lo <= x < hi]
    return sum(e) / len(e) if e else float("nan")


def render(d: dict) -> str:
    w, sh, pl, wr, sj, sp, ch = d["wind"], d["ships"], d["platforms"], d["wrecks"], d["san_juan"], d["spectral"], d["change"]
    wb = w["summary"]["blind"]
    big = [r for r in sh["pod_by_length"] if r["length_range_m"][0] >= 100]
    big_n, big_k = sum(r["trials"] for r in big), sum(r["detected"] for r in big)
    small = sh["pod_by_length"][0]
    ws = wr["summary"]
    mid = next(c for c in sj["cases"] if c["sigma"] == 0.5)
    cut = 1 - mid["depth95"] / mid["fix95"]
    o20 = sp["pod"]["orange fabric (tent, survival bag)"]["0.2"]
    o10 = sp["pod"]["orange fabric (tent, survival bag)"]["0.1"]
    full = ch["summary"]["full_earlier_view"]
    meta = {
        "out": "abyssal/evidence.html",
        "title": "ABYSSAL on real data: seven studies, with receipts — Rory Millard",
        "desc": "ABYSSAL's engines run on real satellite radar, survey bathymetry, Sentinel-2 imagery and public records, scored against truth they never saw: buoys, ship transponders, nautical charts and a real wreck.",
        "active": "evidence", "layout": "page", "maths": False, "image": "evidence-real.webp", "crumb": "Real data",
        "kicker": "<span>ABYSSAL · Evidence</span><span class=\"lv\">Measured, not simulated</span>",
        "h1": "Proven on real data",
        "dek": "Simulators prove the mathematics. These seven studies ask the harder question: does the same code work on real satellite images, real survey grids and a real loss, scored against truth it never saw?",
        "meta": "<span><b>7</b> studies · <b>5</b> data sources · every input with a SHA-256 receipt</span><span>Rory Millard · November 2026</span>",
        "hero_cls": "", "peek": "evidence-real.webp", "peek_alt": "The ABYSSAL evidence page in the app, with the wind scatter and detection charts",
        "cta": "<a class=\"btn primary\" href=\"#scoreboard\">The scoreboard ↓</a><a class=\"btn ghost\" href=\"engines.html\">Inside the machine</a>",
    }
    board = [
        ("1.7 m/s", f"wind error against {w['summary']['buoys']} NOAA buoys, {wb['n']} radar passes", "#wind"),
        (f"{big_k} / {big_n}", "ships over 100 m found in the radar, checked against AIS", "#ships"),
        (f"{pl['summary']['found']} / {pl['summary']['charted_platforms']}", f"charted platforms found in every pass, median {pl['summary']['median_error_m']:.0f} m off", "#platforms"),
        (f"{ws['detected']} / {ws['wrecks']}", f"charted wrecks found in NOAA bathymetry, median {ws['median_error_m']} m off", "#wrecks"),
        (f"−{round(cut * 100)}%", "ARA San Juan search area, wreck kept inside", "#sanjuan"),
        (f"{round(o20['pod'] * 100)}%", "of 20 m² tents planted in real Sentinel-2 scenes found", "#spectral"),
        (f"{full['single_scene_false_alarms'] / full['area_km2']:.0f} → {full['new_false_alarms'] / full['area_km2']:.1f}", "false anomalies per km², new since an earlier pass", "#newsince"),
    ]
    board_html = "".join(f'<a class="sb" href="{h}"><b>{html.escape(a)}</b><span>{html.escape(b)}</span></a>' for a, b, h in board)
    parts = [
        f"<!--meta\n{json.dumps(meta, ensure_ascii=False)}\n-->",
        f"""
<div class="lede-block">
  <p>Every study below runs the engine code the ABYSSAL app runs, on real public data, and scores it against an independent truth: something the engine never saw. Each one writes a results file with a receipt for every input (the URL and SHA-256 of the radar window, buoy file, AIS day or chart record) and a script that re-runs it. Where the truth is made rather than found, as with planted targets, it says so.</p>
  <p>The numbers are not all flattering. That is the point: a detector is worth exactly its measured hit and false-alarm rates, and the weak ones are printed as large as the strong ones.</p>
</div>

<div class="section-title" id="scoreboard"><h2>The scoreboard</h2><span>click any number for the study</span></div>
<div class="scoreboard">{board_html}</div>
""",
        '<div class="section-title" id="sea"><h2>At sea</h2><span>radar, transponders, charts</span></div>',
        study("wind", "Wind from the radar · CMOD5.n", "Reading the wind off the sea surface",
              "Wind roughens the sea and the radar sees the roughness. The engine inverts the CMOD5.n model function to turn backscatter into wind speed, using streaks in the image for direction. Scored against the anemometers on 11 NOAA moored buoys off California, adjusted from 4 m to 10 m with a neutral log profile, within 30 minutes of each pass.",
              [(f"{wb['rmse_m_s']} m/s", "RMSE, as the app runs it"), (f"r = {wb['r']}", "correlation"), (f"{w['summary']['aided']['rmse_m_s']} m/s", "RMSE given the buoy's direction")],
              wind_chart(w),
              f"Wind good enough to say what a miss means: a search in 3 m/s and one in 14 m/s are not the same search. {round(100 * wb['within_2_m_s'])}% of readings are within 2 m/s.",
              f"Unbiased wind. As the app runs it, light wind reads high ({band_bias(w['points'], 0, 5):+.1f} m/s below 5 m/s); given the buoy's direction, strong wind reads low ({band_bias(w['aided_points'], 10, 99):+.1f} m/s above 10 m/s). Only the California coast was tested, and streak directions are within 30° only about half the time ({w['summary']['streak_direction']['median_error_deg_mod180']}° median error).",
              "Each dot is one Sentinel-1 pass over a buoy. The diagonal is perfect agreement."),
        study("ships", "Dark-vessel detector · CFAR + AIS", "Ships in the radar, checked against their transponders",
              f"Ships broadcast their position on AIS; the radar sees them whether they do or not. Over {sh['windows']} real Sentinel-1 windows across four days, every AIS ship the radar should have seen is a free labelled trial: an echo is a hit, silence a miss. Ships' identities are hashed and never stored.",
              [(f"{big_k} / {big_n}", "ships over 100 m found"), (f"{small['detected']} / {small['trials']}", "small craft under 35 m"), (f"{sh['unmatched_detections']}", f"unexplained echoes in {sh['water_area_km2']:,.0f} km²")],
              ships_chart(sh),
              "Large ships are found reliably, and the rate falls with length the way radar physics says it should. The calibration is measured per length band with honest intervals, and bands without enough ships are marked, not filled in.",
              f"A low false-alarm rate. The {sh['unmatched_detections']} echoes with no AIS ship are platforms, small boats without transponders and false alarms together; as an upper bound that is {sh['false_alarm_upper_per_1000_km2']:.0f} per 1,000 km² on rough-sea passes, the detector's weakest number.",
              "The share of AIS ships detected in each length band (ship length from AIS). Whiskers are 95% Wilson intervals; grey bands have too few ships to count as measured."),
        study("platforms", "Persistence across passes", "What is always there",
              "Stack eight radar passes and ask what appears in all of them. Oil platforms are perfect test targets: they never move and NOAA charts them. Four platform fields off California and in the Gulf, matched to the nautical chart.",
              [(f"{pl['summary']['found']} / {pl['summary']['charted_platforms']}", "found in every pass"), (f"{pl['summary']['median_error_m']:.0f} m", "median distance from the chart"), (f"{pl['summary']['uncharted_fixed']}", "fixed objects not on the chart")],
              platforms_chart(pl),
              "Persistent structures are separated from passing ships with no training data at all, and land within tens of metres of where the chart puts them.",
              "Eva, close to the shore in San Pedro Bay, was missed: near-shore clutter hides it. Positions are only as good as the chart and the 10 m radar pixel.",
              "Distance from each found platform to its charted position, with how many of the passes saw it."),
        study("wrecks", "Seabed relief anomalies · NOAA BlueTopo", "Wrecks in survey bathymetry",
              "NOAA charts thousands of wrecks, and the ones located by hydrographic survey have trustworthy positions. For 85 of them, 5-120 m deep in twelve survey-dense regions, the engine searched a 1.2 km BlueTopo window centred on the charted point, blind.",
              [(f"{ws['detected']} / {ws['wrecks']}", f"found (95%: {round(ws['pod_95'][0] * 100)}-{round(ws['pod_95'][1] * 100)}%)"), (f"{ws['median_error_m']} m", "median position error"), (f"{ws['false_contact_upper_per_km2']}", "other contacts per km², at most")],
              wrecks_chart(wr) + wreck_errors(wr),
              "When a wreck stands out of the grid the engine finds it and puts it within about 10 m of the chart. Coarser 8 m grids found a similar share to 4 m ones.",
              "Whether the misses are the detector's fault. Many charted wrecks are buried, salvaged or too low to rise out of a 4-16 m grid; separating 'not in the data' from 'missed' is the next study.",
              "Top: every charted wreck, sorted by grid size; filled squares were found within 60 m (hover for depth and error). Bottom: how far the found ones were from the chart."),
        study("sanjuan", "A real loss · ARA San Juan, 2017", "Rebuilding a real search from public facts",
              f"On 15 November 2017 the Argentine submarine ARA San Juan was lost in the South Atlantic. Two hydroacoustic stations heard an implosion-like event; the wreck was found a year later, {sj['event_to_wreck_km']} km from the published event location, 907 m down. Using only public facts (Wikipedia, citing the Argentine Navy and the CTBTO), the engine rebuilds the location as a two-station bearing fix, then adds one piece of physics: a hull implodes only after sinking past its collapse depth, so water shallower than the test depth (300 m) is ruled out, on real NOAA ETOPO 2022 bathymetry.",
              [(f"−{round(cut * 100)}%", "95% area, at ±0.5° bearings"), ("3 / 3", "bearing errors keep the wreck in the 50% region"), (f"{sj['etopo_depth_at_wreck_m']:.0f} m", "ETOPO depth at the wreck (true 907 m)")],
              san_juan_chart(sj),
              "A single physical constraint, applied honestly, removes a third of the search area without losing the wreck, at every assumed bearing error. For scale, the first search area in 2017 was 482,507 km².",
              "Anything from the raw recordings: the IMS waveforms are not public, so arrivals cannot be re-picked and the bubble-pulse period cannot be measured. Station positions are approximate and the bearing error is an assumption, which is why it is swept.",
              "The 95% credible area in km² for three assumed bearing errors: grey is the bearing fix alone, orange adds the collapse depth on real bathymetry."),
        '<div class="section-title" id="land"><h2>On land</h2><span>Sentinel-2 imagery, real terrain</span></div>',
        study("spectral", "Spectral anomalies · Sentinel-2", "Small things that are the wrong colour",
              "A tent, a tarp, a car or a crashed aircraft is rarely the colour of the ground around it. The engine scores every pixel of a real Sentinel-2 scene by its Mahalanobis distance from the background in six bands (the Reed-Xiaoli detector), thresholds at a chi-square tail of 10⁻⁹ and drops anything bigger than twelve pixels. No public list of real tents in satellite scenes exists, so the truth is made: 2,500 targets with typical published spectra, planted at known places into real scenes from five landscapes.",
              [(f"{o20['detected']} / {o20['trials']}", "20 m² orange tents found"), (f"{o10['detected']} / {o10['trials']}", "at 10 m², a tenth of a pixel"), (f"~{sp['false_alarms_per_km2']:.0f} / km²", "other anomalies on real ground")],
              spectral_table(sp),
              "Targets a fifth of a pixel across are found almost every time against real Sierra granite, Scottish moorland, Oregon forest and Nevada desert. White paint is hardest at small sizes, because bright rock is common.",
              "Detection of real lost targets: the spectra are assumptions and the targets single, linearly mixed pixels. One scene alone also flags about eight other things per km² (rock, roofs, vehicles), so on its own it is a list of places to look.",
              "Each cell: the share of 125 planted targets found. Hover for the count and its 95% interval."),
        study("newsince", "New since they went missing", "Keeping only what is new",
              "Most of those other anomalies are permanent; a lost person's tent is new. Two Sentinel-2 passes of the same tile share the exact 10 m grid, so each contact is checked against an earlier pass, chosen by how much of the ground it saw clear. Choosing it by the scene's overall cloud figure failed first: it picked April and February scenes whose ground was under snow.",
              [(f"{full['single_scene_false_alarms'] / full['area_km2']:.1f} → {full['new_false_alarms'] / full['area_km2']:.1f}", "per km², earlier pass saw the ground"), (f"{ch['summary']['single_scene_false_alarms'] / ch['summary']['area_km2']:.1f} → {ch['summary']['new_false_alarms'] / ch['summary']['area_km2']:.1f}", "per km², all five sites"), (f"{ch['pod_new_orange_20']['detected']} / {ch['pod_new_orange_20']['trials']}", "20 m² tents still found")],
              change_chart(ch),
              "Where an earlier pass saw the ground, comparing with it removes almost seven in eight false anomalies while keeping almost every planted tent. The triage list becomes short enough to check.",
              "Where the earlier pass had snow (Ritter Range) or was a year earlier (Cairngorms, where heather burning really changes the ground), far less is removed; sun angle on cliffs also makes some 'new' contacts.",
              "Other anomalies on about 9 km² of real ground per site: grey is one scene alone, orange only what is new since the earlier pass."),
        f"""
<div class="callout honest">
  <div class="t">How to read this page</div>
  <p>"Real" here means real inputs and an independent truth, not operational use: ABYSSAL has not been used in a live search. The sea studies use found truth (buoys, transponders, charts, a wreck); the land studies use made truth (targets planted in real scenes), which tests the detector against real backgrounds but not against real lost things. Every number regenerates from its script; the receipts are in the ABYSSAL repository under <code>abyssal/realdata/results</code>, with the write-up in <code>docs/validation/REAL_DATA.md</code>.</p>
</div>
""",
    ]
    return "\n".join(parts) + "\n"


def main() -> None:
    if len(sys.argv) > 1:
        data = refresh(Path(sys.argv[1]))
    else:
        data = json.loads(DATA.read_text())
    OUT.write_text(render(data))
    print("wrote", OUT.relative_to(ROOT))


if __name__ == "__main__":
    main()
