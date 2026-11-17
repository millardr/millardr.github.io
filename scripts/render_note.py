"""Regenerate the HTML version of The Fifth Miss from its Markdown source.
Requires: pip install mistune>=3
Run from repository root: python scripts/render_note.py
"""
from pathlib import Path
import mistune
root=Path(__file__).resolve().parent.parent
source=(root/'_content'/'the-fifth-miss.md').read_text()
rendered=mistune.create_markdown(escape=False)(source)
path=root/'notes'/'the-fifth-miss.html'
html=path.read_text()
a=html.index('<div class="prose">')+len('<div class="prose">')
b=html.index('</div></article><script',a)
path.write_text(html[:a]+rendered+html[b:])
print('Regenerated:',path)
