# Customizing

Every visual choice is in [`mods/wtm/style.js`](../../mods/wtm/style.js): edit your installed copy (`~/.config/herdr-app/mods/wtm/style.js`) and save; the button and the pane redraw at once.

## The button: `button(theme)`

| Token | Default | What it sets |
| --- | --- | --- |
| `position` | `{ edge: "top", align: "end", inset: 8, margin: 190 }` | where the button opens: `edge` `top` or `bottom`, `align` `start`, `center` or `end`, `inset` px from that edge, `margin` px from the side it aligns to |
| `width`, `height` | `60`, `26` | its size; `width` is fixed so the placement is exact |
| `padX`, `gap`, `radius`, `textSize`, `iconSize` | `8`, `5`, `6`, `12`, `14` | its shape, like Herdr's Files and Changes buttons |
| `icon`, `label` | `icons/git-branch.svg`, `wtm` | what it shows |
| `background`, `hoverBackground`, `foreground`, `hoverForeground` | `chrome`, `hover`, `muted`, `foreground` | colours, by theme name, so the button follows every theme |
| `onBackground`, `onForeground` | `selected`, `foreground` | while the pane is open in the active tab |
| `blockedIcon` | `blocked` | the icon's colour when sync is down |
| `TOOLTIPS` | what the state means, and what a click does | the tooltip per state |

The default `position` puts the button just left of `+` in Herdr's main layout on macOS. With another layout, or on Linux and Windows (window buttons in the bar), drag it once; Herdr remembers the spot. A new `position` applies the next time the button opens (`herdr-app do mod.open '{"name":"wtm"}'`).

## The pane: `pane(theme)`

shadcn's rules on a 4 px grid: `padding` 16, `sectionGap` 24, `groupGap` 8, `rowHeight` 32; `textSize` 14 and `smallTextSize` 12; radii `rowRadius` 6, `buttonRadius` 8, `cardRadius` 12. Colours are theme names: `background`, `card` (`surface`), `border`, `input`, `hover`, `selected`, `foreground`, `muted`, `dim`, `primary` (`solid`); job and stack states `running` (`ansi2`), `starting` and `needsSync` (`ansi3`), `crashed` and `problem` (`blocked`), `stopped` (`dim`). Every text the pane shows is in `labels`, and every icon path in `ICON` (`mods/wtm/icons/`, Lucide).

An update replaces `style.js`: keep your copy aside.
