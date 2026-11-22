# ABYSSAL showcase: screenshots to recapture

The site's ABYSSAL screenshots live in `assets/abyssal/*.webp`. Most were first taken in a sandbox that could
not reach any basemap tile server, so the map behind the probability layer was blank or a grey hillshade.
This list covers the images that still need recapturing over a real basemap, and how to do it.

**Already recaptured over real imagery** (see `workspace.cjs` and the `engine_*.cjs` scripts):
the demo workspace and its panels, the AF447, MH370 and *Merchant Royal* cases, the land search, the
watchlist, and the thirteen engine images (`eng-*.webp`).

**Still to do: the Ops console set (13) and the Signal Lab set (4).** These need live public feeds as well as
tiles, so they need an environment with open network access (or at least the hosts listed below).

## Setup

1. Check out `millardr/ABYSSAL` (main) and start the workbench:
   ```bash
   uv run python scripts/start_workbench.py        # serves http://127.0.0.1:8501
   ```
2. The network must reach:
   - **Tiles:** `tile.openstreetmap.org`, `services.arcgisonline.com`, `gibs.earthdata.nasa.gov`, `tiles.openseamap.org`.
   - **Live feeds (Ops console):** `api.adsb.lol`, `opensky-network.org`, `meri.digitraffic.fi`, `celestrak.org`,
     `earthquake.usgs.gov`, `api.rainviewer.com` (and its tile cache), `api.open-meteo.com`,
     `marine-api.open-meteo.com`.
3. Browser: Chromium, **viewport 1440 × 860, device scale factor 2, colour scheme dark**. The showcase is dark
   graphite with ember accents, so every capture uses the app's dark theme.
4. Save as PNG, then convert to WebP at the **same pixel size as the file it replaces** (quality 82):
   ```bash
   python3 -c "from PIL import Image; im=Image.open('in.png').convert('RGB'); im.resize((1440,860), Image.LANCZOS).save('out.webp', quality=82, method=6)"
   ```
5. Before each shot: open the case, choose **Basemap → Ocean relief** (sea) or **Surface imagery** (land), and open
   **Map layers** and untick any context elevation raster so the basemap shows. These are display-only switches:
   they do not change the belief map.

Compare each new image with the current one (the bundle has every current image under `current/`) and match
its framing: same case, same panel open, same tool active, same rough map extent.

## Ops console set: 1440 × 860, Part 7 "The operating picture"

All on the **Merchant Royal** case (landing page → Examples → Merchant Royal) unless noted. Open **Ops console**
from the right rail.

| File | Case | Basemap | What must be on screen |
|---|---|---|---|
| `ops-live-air-sea-orbit.webp` | Merchant Royal | Ocean relief | Live picture with Aircraft, Ships and Satellites on: real ADS-B aircraft and AIS ships around the Western Approaches and Channel, one aircraft selected with its card, an orbit-detection warning if one is flagged. |
| `ops-detect-roster.webp` | Merchant Royal | Ocean relief | Contacts roster panel listing nearby aircraft, ships and satellites, with detection brackets on the map. |
| `ops-globe-satellites.webp` | Merchant Royal | Surface imagery | Globe projection, satellites on: SGP4 orbits, a sensor swath and the next-pass list. |
| `ops-global-context-quakes.webp` | Merchant Royal | Surface imagery | Globe view with USGS earthquakes of the past day as context. |
| `ops-rain-radar.webp` | Merchant Royal | Ocean relief | Rain radar replay (RainViewer) over the UK with the time slider visible. |
| `ops-wind-currents.webp` | Merchant Royal | Ocean relief | Wind (and current) particles from Open-Meteo over the search area. |
| `ops-leeway-drift.webp` | Merchant Royal | Ocean relief | Leeway drift tool: Monte Carlo particle cloud for an object in the water, with its spread. |
| `ops-iamsar-pattern.webp` | Merchant Royal | Ocean relief | Search pattern tool: an IAMSAR parallel-track (or expanding-square) pattern drawn over the probability. |
| `ops-bearings-fix.webp` | Merchant Royal | Ocean relief | Bearings tool: two or three bearings crossing in a fix with its error wedge. |
| `ops-sea-survival.webp` | Merchant Royal | Ocean relief | Sea survival panel: water temperature and survival-time curves. |
| `ops-light-moon.webp` | Merchant Royal | Ocean relief | Light panel: sunrise, sunset, twilight and the moon, with the day/night terminator on the map. |
| `ops-shadow-chronolocation.webp` | Merchant Royal | Surface imagery | Shadow clock: the locus of places a photo with a given shadow could have been taken. |
| `ops-cockpit.webp` | Merchant Royal | Surface imagery | Cockpit view (tilted camera, horizon) over the search area. |
| `ops-3d-terrain.webp` | Fictional land search ("Try the fictional land search") | Surface imagery | 3D terrain on, map tilted, with the belief layer draped over the relief. |
| `ops-satellite-view.webp` | Fictional land search | Surface imagery | Satellite view panel open with the strip of dated imagery tiles along the bottom. |

## Signal Lab set: 1440 × 880, Part 6 "Signals from the deep" (optional)

The radar or acoustic scene covers most of the map, so the basemap matters only at the edges. On the
**Merchant Royal** case, open **Signal Lab** from the right rail and run each tab's SCENARIO.

| File | Tab | What must be on screen |
|---|---|---|
| `signal-dark-vessels.webp` | Dark vessels · SAR + AIS | SCENARIO run: radar window with detections, AIS matches and DARK contacts. |
| `signal-dark-vessel-wake.webp` | Dark vessels · SAR + AIS | Zoomed on one ship beside its Kelvin wake, with the shift arrow. |
| `signal-acoustic.webp` | Acoustic localiser | SCENARIO run: four hydrophones, hyperbolae and the fix. |
| `signal-rings.webp` | Ring finder | SCENARIO run with the answer key shown and the calibration bars. |

## What not to change

- Keep every SCENARIO label visible: fictional data must look fictional.
- Do not edit `docs/showcase/*.png` in the ABYSSAL repository; those belong to its browser tests.
- Do not commit anything from `.abyssal/` (local case data).
