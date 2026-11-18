"""Regenerate the HTML body of The Fifth Miss from its Markdown source.
Requires: pip install mistune>=3
Run from rory-personal-website-v2 root: python3 scripts/render_note.py
"""
from pathlib import Path
import mistune

root = Path(__file__).resolve().parent.parent
source = (root / "_content" / "the-fifth-miss.md").read_text()
rendered = mistune.create_markdown(escape=False)(source)

path = root / "notes" / "the-fifth-miss.html"
html = path.read_text()

start_marker = '<div class="prose">'
end_marker = "\n        </div>\n      </article>"
a = html.index(start_marker) + len(start_marker)
b = html.index(end_marker, a)

path.write_text(html[:a] + "\n" + rendered.strip() + html[b:])
print("Regenerated:", path)
