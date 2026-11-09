# The gallery card, 1280×800: preview.png at the repository root, rendered from
# preview.svg. wtm's social preview (github.com/LucasPcq/wtm,
# docs/assets/src/social.py) told for this mod: a command, and its worktrees
# landing as spaces in a sidebar. Herdr is named, never drawn: its logo is not ours.
import sys

from outline import instance, text_path

fonts_dir, out = sys.argv[1], sys.argv[2]
archivo = f"{fonts_dir}/Archivo.ttf"
mono = f"{fonts_dir}/MartianMono.ttf"

bg, panel, raised, code, line = "#14121B", "#1A1824", "#201D2C", "#0F0D16", "#2A2638"
strong, body, muted, faint, sig = "#F4F1FA", "#C4BFD4", "#9D97B2", "#6F6987", "#E8734A"
lanes = ("#E8734A", "#9B8CFF", "#5FD4C0")


def width(path, text, size, wght, wdth, tracking=0.0):
    font = instance(path, wght, wdth)
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    return sum(glyphs[cmap[ord(ch)]].width for ch in text) * size / font["head"].unitsPerEm + tracking * len(text)


wordmark = text_path(archivo, "wtm", 150, 141, 46, 850, 112, -1)
for_app = text_path(archivo, "for the Herdr app", 150 + width(archivo, "wtm", 46, 850, 112, -1) + 18, 141, 30, 400, 100)
line1 = text_path(archivo, "Every worktree,", 90, 318, 96, 300, 70, -2)
line2 = text_path(archivo, "a space.", 88, 428, 110, 850, 118, -3)
sub = text_path(archivo, "Whoever creates it: you, an agent, wtm ui.", 92, 500, 26, 400, 100)
prompt = text_path(mono, "$", 116, 628, 20, 400, 100)
command = text_path(mono, "wtm create feat/login", 144, 628, 20, 400, 100)

# The sidebar: a panel of spaces, the repository first, its worktrees under it.
px, py, pw, ph = 840, 160, 350, 440
dot_y = 450
title = text_path(mono, "Spaces", px + 28, py + 52, 15, 400, 100)
repo = text_path(archivo, "acme", px + 52, py + 118, 24, 600, 100)
repo_branch = text_path(mono, "main", px + pw - 28 - width(mono, "main", 15, 400, 100), py + 117, 15, 400, 100)
rows = [("feat/login", 360), ("feat/billing", 450), ("fix/header", 540)]
row_text = [text_path(mono, name, px + 52, y + 7, 19, 400, 100) for name, y in rows]

lane_paths = "\n".join(
    f'<path d="M708 {dot_y} C760 {dot_y} 770 {y} 820 {y} H{px + 14}" fill="none" stroke="{c}" stroke-width="8" stroke-linecap="round"/>'
    for (_, y), c in zip(rows, lanes)
)
row_cards = "\n".join(
    f'<rect x="{px + 20}" y="{y - 30}" width="{pw - 40}" height="60" rx="10" fill="{raised}"/>'
    f'<rect x="{px + 20}" y="{y - 30}" width="6" height="60" rx="3" fill="{c}"/>'
    for (_, y), c in zip(rows, lanes)
)

mark = f'''<g transform="translate(92 105) scale(1.7)"><circle cx="4" cy="12" r="3" fill="{strong}"/><path d="M6 12 C14 12 14 4 22 4 H27" fill="none" stroke="{lanes[0]}" stroke-width="3" stroke-linecap="round"/><path d="M6 12 H27" fill="none" stroke="{lanes[1]}" stroke-width="3" stroke-linecap="round"/><path d="M6 12 C14 12 14 20 22 20 H27" fill="none" stroke="{lanes[2]}" stroke-width="3" stroke-linecap="round"/></g>'''

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800" role="img" aria-label="wtm for the Herdr app — Every worktree, a space.">
<rect width="1280" height="800" fill="{bg}"/>
{mark}
<path fill="{sig}" d="{wordmark}"/>
<path fill="{muted}" d="{for_app}"/>
<path fill="{strong}" d="{line1}"/>
<path fill="{sig}" d="{line2}"/>
<path fill="{muted}" d="{sub}"/>
<rect x="92" y="588" width="{116 + width(mono, "$ wtm create feat/login", 20, 400, 100) + 4}" height="62" rx="10" fill="{code}" stroke="{line}"/>
<path fill="{faint}" d="{prompt}"/>
<path fill="{body}" d="{command}"/>
<rect x="{px}" y="{py}" width="{pw}" height="{ph}" rx="16" fill="{panel}" stroke="{line}" stroke-width="1.5"/>
<path fill="{muted}" d="{title}"/>
<rect x="{px + 20}" y="{py + 82}" width="{pw - 40}" height="56" rx="10" fill="none" stroke="{line}" stroke-width="1.5"/>
<circle cx="{px + 38}" cy="{py + 110}" r="6" fill="{strong}"/>
<path fill="{strong}" d="{repo}"/>
<path fill="{faint}" d="{repo_branch}"/>
{lane_paths}
<circle cx="700" cy="{dot_y}" r="10" fill="{strong}"/>
{row_cards}
<path fill="{body}" d="{" ".join(row_text)}"/>
</svg>
'''
with open(out, "w") as f:
    f.write(svg)
