# Customizing

Every visual choice is in [`mods/wtm/style.js`](../../mods/wtm/style.js): edit your installed copy (`~/.config/herdr-app/mods/wtm/style.js`) and save; the button redraws at once.

| Token | Default | What it sets |
| --- | --- | --- |
| `position` | `{ edge: "top", align: "end", inset: 8, margin: 190 }` | where the button opens: `edge` `top` or `bottom`, `align` `start`, `center` or `end`, `inset` px from that edge, `margin` px from the side it aligns to |
| `width`, `height` | `52`, `26` | its size; `width` is fixed so the placement is exact |
| `padX`, `gap`, `radius`, `border`, `textSize`, `dotSize` | `8`, `5`, `6`, `0`, `12`, `6` | its shape, like Herdr's Files and Changes buttons |
| `background`, `hoverBackground`, `foreground`, `hoverForeground`, `borderColor` | `chrome`, `hover`, `muted`, `foreground`, `border` | colours, by theme name, so the button follows every theme |
| `DOT` | `accent` listening, `muted` starting, `blocked` otherwise | the dot's colour per state |
| `LABELS` | `wtm` | the text per state |
| `TOOLTIPS` | what the state means, and what a click does | the tooltip per state |

The default `position` puts the button just left of `+` in Herdr's main layout on macOS. With another layout, or on Linux and Windows (window buttons in the bar), drag it once; Herdr remembers the spot. A new `position` applies the next time the button opens (`herdr-app do mod.open '{"name":"wtm"}'`).

An update replaces `style.js`: keep your copy aside.
