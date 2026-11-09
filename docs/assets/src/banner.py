# The README banner, dark and light: docs/assets/banner-{dark,light}.svg.
# wtm's banner (github.com/LucasPcq/wtm, docs/assets/src/banner.py) with this
# mod's wordmark and tagline; the lanes end on worktrees, each a space.
import sys

from outline import text_path

fonts_dir, out_dir = sys.argv[1], sys.argv[2]
archivo = f"{fonts_dir}/Archivo.ttf"
mono = f"{fonts_dir}/MartianMono.ttf"

themes = {
    "dark": dict(bg="#14121B", sig="#E8734A", strong="#F4F1FA", muted="#9D97B2", lanes=("#E8734A", "#9B8CFF", "#5FD4C0")),
    "light": dict(bg="#F5F3FA", sig="#A6391A", strong="#17142A", muted="#635D7A", lanes=("#D0582F", "#5B4BE0", "#159C88")),
}

wordmark = text_path(archivo, "herdr-app-wtm", 64, 108, 50, 850, 118, -1.5)
tagline = text_path(archivo, "Every worktree, a space.", 66, 152, 28, 300, 75)
spaces = [text_path(mono, s, 714, y, 13, 400, 100) for s, y in (("feat/login", 61), ("feat/billing", 115), ("fix/header", 169))]

for name, t in themes.items():
    a, b, c = t["lanes"]
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="856" height="220" viewBox="0 0 856 220" role="img" aria-label="herdr-app-wtm — Every worktree, a space.">
<rect width="856" height="220" rx="12" fill="{t["bg"]}"/>
<path fill="{t["sig"]}" d="{wordmark}"/>
<path fill="{t["strong"]}" d="{tagline}"/>
<circle cx="540" cy="110" r="8" fill="{t["strong"]}"/>
<path d="M546 110 C590 110 600 56 640 56 H700" fill="none" stroke="{a}" stroke-width="7" stroke-linecap="round"/>
<path d="M546 110 H700" fill="none" stroke="{b}" stroke-width="7" stroke-linecap="round"/>
<path d="M546 110 C590 110 600 164 640 164 H700" fill="none" stroke="{c}" stroke-width="7" stroke-linecap="round"/>
<path fill="{t["muted"]}" d="{" ".join(spaces)}"/>
</svg>
'''
    with open(f"{out_dir}/banner-{name}.svg", "w") as f:
        f.write(svg)
