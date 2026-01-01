"""Make smaller copies of the site's screenshots for phones and laptops.

    python3 scripts/optimise_images.py

For every image in assets/abyssal wider than a target width, writes NAME-640.webp and NAME-1280.webp
(no metadata). The build gives each <img> a srcset over those copies and the original, plus width and
height, so phones download a fraction of the bytes; the lightbox still opens the full-size original.
Share cards in assets/cards are re-saved without their colour profile.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
WIDTHS = (640, 1280)


def main() -> None:
    made = 0
    manifest: dict[str, dict] = {}
    for src in sorted((ROOT / "assets" / "abyssal").glob("*.webp")):
        if src.stem.rsplit("-", 1)[-1] in {str(w) for w in WIDTHS}:
            continue
        im = Image.open(src)
        manifest[src.stem] = {"w": im.width, "h": im.height,
                              "variants": [w for w in WIDTHS if im.width > w * 1.15]}
        for w in WIDTHS:
            out = src.with_name(f"{src.stem}-{w}.webp")
            if im.width <= w * 1.15 or (out.exists() and out.stat().st_mtime >= src.stat().st_mtime):
                continue
            h = round(im.height * w / im.width)
            im.convert("RGB").resize((w, h), Image.LANCZOS).save(out, "WEBP", quality=74, method=6)
            made += 1
    for card in sorted((ROOT / "assets" / "cards").glob("*.jpg")):
        im = Image.open(card)
        if im.info.get("icc_profile"):
            im.convert("RGB").save(card, "JPEG", quality=84, optimize=True, progressive=True)
    (ROOT / "_data").mkdir(exist_ok=True)
    (ROOT / "_data" / "images.json").write_text(json.dumps(manifest, indent=1, sort_keys=True), encoding="utf-8")
    print(f"{made} resized copies written; {len(manifest)} images in _data/images.json")


if __name__ == "__main__":
    main()
