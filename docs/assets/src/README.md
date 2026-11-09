# Brand image sources

The README banner is wtm's ([`docs/assets/src/banner.py`](https://github.com/LucasPcq/wtm/blob/main/docs/assets/src/banner.py) in wtm, same colours and layout) with this mod's wordmark and tagline. The gallery card (`preview.png`, 1280×800 at 2×) follows wtm's social preview (`social.py`): a command, and its worktrees landing as spaces in a sidebar. Herdr is named, never drawn: its logo is not ours. Every piece of text is outlined into SVG paths, so it renders the same where Archivo and Martian Mono are not installed (GitHub). `outline.py` is wtm's, unchanged.

It needs Python 3, `fonttools`, and the two variable fonts from Google Fonts (OFL): `Archivo[wdth,wght].ttf` saved as `Archivo.ttf`, and `MartianMono[wdth,wght].ttf` saved as `MartianMono.ttf`, in one directory.

```bash
python3 -m venv /tmp/wtm-brand && /tmp/wtm-brand/bin/pip install fonttools
fonts=/tmp/wtm-fonts && mkdir -p $fonts
curl -fsSL -o $fonts/Archivo.ttf "https://github.com/google/fonts/raw/main/ofl/archivo/Archivo%5Bwdth,wght%5D.ttf"
curl -fsSL -o $fonts/MartianMono.ttf "https://github.com/google/fonts/raw/main/ofl/martianmono/MartianMono%5Bwdth,wght%5D.ttf"

cd docs/assets/src
/tmp/wtm-brand/bin/python banner.py $fonts ..                                  # banner-dark.svg, banner-light.svg
/tmp/wtm-brand/bin/python preview.py $fonts /tmp/preview.svg
rsvg-convert -w 2560 -h 1600 /tmp/preview.svg -o ../../../preview.png      # the gallery card
```

When wtm's banner or social preview changes (colours, lanes), carry the change here.
