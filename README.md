<h1 align="center">herdr-app-wtm</h1>

<p align="center">
  <strong>Your wtm worktrees, as Herdr app spaces.</strong><br>
  A <a href="https://herdr.dev">Herdr app</a> mod for <a href="https://github.com/LucasPcq/wtm">wtm</a>: a worktree you create opens as a space, a worktree you clean or prune closes its space — whoever ran the command.
</p>

<p align="center">
  <a href="https://github.com/LucasPcq/herdr-app-wtm/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/LucasPcq/herdr-app-wtm/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-blue"></a>
</p>

> **Status:** 0.x — sync only. The action menu of [herdr-wtm](https://github.com/LucasPcq/herdr-wtm) (the herdr TUI plugin) is not here yet.

## What it does

- **`wtm create` opens a space** on the new worktree, within a second, whether you ran it in a shell, an agent ran it in the next pane, or you used `wtm ui`.
- **Your focus stays put.** The space appears in the sidebar; you keep typing where you were.
- **`wtm clean` and `wtm prune` close the space** of each removed worktree, once its folder is gone.
- **Nothing you care about is closed:** never the main checkout's space, never a space whose folder is still on disk, never a space on another machine.
- **Only repositories you have open.** A worktree created in a repository with no space in the window is left alone.

A small `● wtm` pill floats in the window: it tells you sync runs, and why it doesn't when it doesn't (wtm missing, too old, stream stopped). Drag it wherever you like; click it to retry after fixing the cause.

<p align="center"><img alt="The wtm pill" src="preview.png" width="150"></p>

## Install

You need the [Herdr app](https://herdr.dev) and [wtm](https://github.com/LucasPcq/wtm) 0.29 or later:

```bash
brew install LucasPcq/tap/wtm
git clone --depth 1 --branch v0.1.0 https://github.com/LucasPcq/herdr-app-wtm /tmp/herdr-app-wtm
cp -R /tmp/herdr-app-wtm/mods/wtm ~/.config/herdr-app/mods/
herdr-app do mod.open '{"name":"wtm"}'
```

The last line, once, shows the pill; from then on Herdr reopens it on every start. Or ask your agent to add the mod from `herdr.dev/mods`.

To update, copy the new `mods/wtm` over the old one: the running mod reloads itself and replaces its worker.

## How it works

The mod starts a hidden herdr-core terminal running `wtm events --output json`, wtm's live event stream. Each event lands as a file in `~/.local/state/herdr-app-wtm/inbox/`; the mod reads it, opens or closes a space, and deletes it. The worker keeps running when the window closes; events that arrive meanwhile are applied when the window comes back, each checked against what is on disk now.

## Restyling

Every visual choice — size, radius, colours (by theme name, so it follows your theme), labels — is in [`mods/wtm/style.js`](mods/wtm/style.js). Edit your copy; keep it aside when you update.

## Limits

- The pill belongs to the layout it was opened in: on another layout, sync waits until you come back (or run the `mod.open` line there too).
- Local spaces only; worktrees on other machines are not synced.
- A worktree moved with wtm, or removed while the worker was down, is not followed.
- Folders reached through a symlink (`/tmp` vs `/private/tmp`) may not match.

## Uninstall

```bash
herdr-app do wtm.stop
rm -rf ~/.config/herdr-app/mods/wtm ~/.local/state/herdr-app-wtm
```

## Contributing

```bash
npm test
herdr-app check mods/wtm
```

Conventions and layout are in [`CLAUDE.md`](CLAUDE.md).

## License

[MIT](LICENSE)
