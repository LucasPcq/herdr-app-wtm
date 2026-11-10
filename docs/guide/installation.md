# Installation

You need the [Herdr app](https://herdr.dev) and [wtm](https://github.com/LucasPcq/wtm) 0.29 or later (`wtm version --output json` reports `"events": 1`), with `wtm init` run once in each repository.

## Install

Ask your Herdr agent: *"add the mod at github.com/LucasPcq/herdr-app-wtm"* (or pick it at herdr.dev/mods). It reads [RECIPE.md](../../RECIPE.md) and every file, copies `mods/wtm/` into `~/.config/herdr-app/mods/`, checks it and opens it once.

Or by hand:

```sh
git clone https://github.com/LucasPcq/herdr-app-wtm
cp -R herdr-app-wtm/mods/wtm ~/.config/herdr-app/mods/
herdr-app check ~/.config/herdr-app/mods/wtm
herdr-app do mod.open '{"name":"wtm"}'
```

The last line, once, opens the `wtm` button in the top bar; from then on Herdr reopens it on every start. A specific version: `git clone --branch v0.2.0 …`. Copy the folder rather than linking it: Herdr loads a linked folder but does not reload it.

If you already have a mod called `wtm`, rename this one's folder and set `MOD` and `WINDOW_KEY` in its `constants.js` to the new name; `herdr-app do <name>.stop` then stops it.

The mod runs programs (`wtm`, `hc`, `git`, `mv`, `rm`, `test`) and writes outside its folder (`~/.local/state/herdr-app-wtm/`): that is how it follows wtm's event stream. It needs no key binding and no layout of its own.

## Update

Copy the new `mods/wtm` over the old one: the running mod reloads itself and replaces its worker when the worker's script changed.

```sh
git -C herdr-app-wtm pull
rm -rf ~/.config/herdr-app/mods/wtm && cp -R herdr-app-wtm/mods/wtm ~/.config/herdr-app/mods/
```

Keep a copy of your `style.js` if you changed it ([Customizing](customizing.md)).

## Remove

```bash
herdr-app do wtm.stop
rm -rf ~/.config/herdr-app/mods/wtm ~/.local/state/herdr-app-wtm
```

`wtm.stop` stops the worker and closes the button; it stays closed after a restart.
