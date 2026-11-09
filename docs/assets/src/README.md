# Banner sources

The README banner is wtm's ([`docs/assets/src/banner.py`](https://github.com/LucasPcq/wtm/blob/main/docs/assets/src/banner.py) in wtm, same colours and layout) with this mod's wordmark and tagline. Every piece of text is outlined into SVG paths, so it renders the same where Archivo and Martian Mono are not installed (GitHub). `outline.py` is wtm's, unchanged.

It needs Python 3, `fonttools`, and the two variable fonts from Google Fonts (OFL): `Archivo[wdth,wght].ttf` saved as `Archivo.ttf`, and `MartianMono[wdth,wght].ttf` saved as `MartianMono.ttf`, in one directory.

```bash
python3 -m venv /tmp/wtm-brand && /tmp/wtm-brand/bin/pip install fonttools
fonts=/tmp/wtm-fonts && mkdir -p $fonts
curl -fsSL -o $fonts/Archivo.ttf "https://github.com/google/fonts/raw/main/ofl/archivo/Archivo%5Bwdth,wght%5D.ttf"
curl -fsSL -o $fonts/MartianMono.ttf "https://github.com/google/fonts/raw/main/ofl/martianmono/MartianMono%5Bwdth,wght%5D.ttf"

cd docs/assets/src
/tmp/wtm-brand/bin/python banner.py $fonts ..                                  # banner-dark.svg, banner-light.svg
```

When wtm's banner changes (colours, lanes), carry the change here.
