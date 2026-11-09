# Installation

You need the [Herdr app](https://herdr.dev) and [wtm](https://github.com/LucasPcq/wtm) 0.29 or later (`wtm version --output json` reports `"events": 1`), with `wtm init` run once in each repository.

## Install

```bash
git clone --depth 1 --branch v0.1.0 https://github.com/LucasPcq/herdr-app-wtm /tmp/herdr-app-wtm
cp -R /tmp/herdr-app-wtm/mods/wtm ~/.config/herdr-app/mods/
herdr-app do mod.open '{"name":"wtm"}'
```

The last line, once, opens the `● wtm` button in the top bar; from then on Herdr reopens it on every start. Asking your agent to add the mod from herdr.dev/mods does the same: it reads every file, then copies `mods/wtm`.

The mod runs programs (`wtm`, `hc`, `git`, `mv`, `rm`) and writes outside its folder (`~/.local/state/herdr-app-wtm/`): that is how it follows wtm's event stream.

## Update

Copy the new `mods/wtm` over the old one: the running mod reloads itself and replaces its worker when the worker's script changed.

```bash
git clone --depth 1 --branch vX.Y.Z https://github.com/LucasPcq/herdr-app-wtm /tmp/herdr-app-wtm-next
rm -rf ~/.config/herdr-app/mods/wtm && cp -R /tmp/herdr-app-wtm-next/mods/wtm ~/.config/herdr-app/mods/
```

Keep a copy of your `style.js` if you changed it ([Customizing](customizing.md)).

## Remove

```bash
herdr-app do wtm.stop
rm -rf ~/.config/herdr-app/mods/wtm ~/.local/state/herdr-app-wtm
```

`wtm.stop` stops the worker and closes the button; it stays closed after a restart.
