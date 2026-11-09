# CLAUDE.md — herdr-app-wtm

herdr-app-wtm is a [Herdr app](https://herdr.dev) mod for [wtm](https://github.com/LucasPcq/wtm): spaces follow wtm's worktrees. wtm is the product; this mod is one of its consumers and reads only wtm's generic integration contract (`wtm events --output json`, `wtm version --output json`, exit codes). A need wtm cannot meet goes to wtm as a generic feature; a need the Herdr app cannot meet goes to Herdr the same way. Its sibling for the herdr TUI is [herdr-wtm](https://github.com/LucasPcq/herdr-wtm).

The Herdr app's mod API is documented in `~/.config/herdr-app/AGENTS.md` and its types in `~/.config/herdr-app/herdr.d.ts` and `gpui-kit.d.ts` (rewritten by the app on every start; Herdr also copies them into `mods/wtm/`, gitignored).

## Layout

```
mods/wtm/
  constants.js   every name, path, code, timing and message — no magic strings elsewhere
  paths.js       pure: normalize, inside, placeOf
  sync.js        pure: decide(event, world) → actions
  inbox.js       claim/read/remove event files; pure helpers + I/O injected
  worker.js      the hc worker: its sh script, start/reuse/stop; hc injected
  world.js       host: what decide() needs about the window, for one event
  anchor.js      pure: where the pill opens, from the window's size and style.js
  style.js       the pill's whole look and position, by theme colour names
  main.js        host: launcher vs service copy, startup, drain loop, the pill
test/            node --test, no dependencies, no Herdr
```

## Rules

- `paths.js`, `anchor.js` and `sync.js` import only `./constants.js` and each other; `inbox.js` and `worker.js` take their I/O as arguments. None of them imports `herdr` or `gpui-kit`, so they run under Node.
- Only `main.js` and `world.js` call the Herdr host (`exec`, `hc`, `run`, `spaces`, `panes`, `focused`, `watchFolder`, `notify`, `openOverlay`).
- `sync.js` decides, never acts; `main.js` runs the actions.
- Every visual choice lives in `style.js`; `main.js` reads only its tokens.
- Changing `SCRIPT` in `worker.js` means bumping `SCRIPT_VERSION` in `constants.js`, so running workers get replaced.
- Comments only for a why. Early returns. Markdown prose is never hard-wrapped.
- Commits in English, prefixed `feat:`, `fix:`, `refactor:`, `test:`, `docs:`, `ci:`, `chore:`.

## Validate

```
npm test                                   # node --test
herdr-app check mods/wtm                   # after any mod change: loads and renders it once
```

Trying it: `rm -rf ~/.config/herdr-app/mods/wtm && cp -R mods/wtm ~/.config/herdr-app/mods/` (saving reloads the running copy), then `herdr-app do mod.open '{"name":"wtm"}'` the first time. `herdr-app do wtm.stop` stops the worker and closes the pill.

## Docs

- `README.md` is the product page; `RECIPE.md` + `preview.png` are Herdr's gallery format (what you see, how it behaves, built from, watch out, done when).
- `CHANGELOG.md` in English, Keep a Changelog. Releases are tags `vX.Y.Z`; the README's install command names the latest tag.
- `docs/superpowers/` is local and gitignored: design notes, never shipped.
