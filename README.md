<h1 align="center">herdr-app-wtm</h1>

<p align="center">A <a href="https://herdr.dev">Herdr app</a> mod for <a href="https://github.com/LucasPcq/wtm">wtm</a>: each worktree you create opens as a space, each one you remove closes its space, whoever ran the command.</p>

<p align="center">
  <a href="https://github.com/LucasPcq/herdr-app-wtm/releases/latest"><img alt="Release" src="https://img.shields.io/github/v/release/LucasPcq/herdr-app-wtm?sort=semver&color=E8734A"></a>
  <a href="https://github.com/LucasPcq/herdr-app-wtm/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/LucasPcq/herdr-app-wtm/actions/workflows/ci.yml/badge.svg"></a>
  <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-6E7681"></a>
</p>

<p align="center">
  <a href="docs/guide/installation.md">Install</a> · <a href="docs/guide/README.md">Guide</a> · <a href="CHANGELOG.md">Changelog</a>
</p>

<p align="center">
  <img alt="The wtm button in Herdr's top bar, left of the + button, Files and Changes" src="preview.png" width="450"><br>
  <em>One button in the top bar; the sidebar follows your worktrees.</em>
</p>

## Highlights

- **`wtm create` opens a space** on the new worktree, whether you ran it, an agent in the next pane did, or `wtm ui`.
- **Your focus stays put:** the space appears in the sidebar while you keep typing where you were.
- **`wtm clean` and `wtm prune` close the space** once the worktree's folder is gone.
- **Nothing you care about is closed:** never the main checkout's space, never a folder still on disk, never another machine.
- **Only repositories you have open** in the window.
- **One button, drawn like Files and Changes:** its dot says whether sync runs, and a notification says why when it does not.

## Install

```bash
git clone --depth 1 --branch v0.1.0 https://github.com/LucasPcq/herdr-app-wtm /tmp/herdr-app-wtm
cp -R /tmp/herdr-app-wtm/mods/wtm ~/.config/herdr-app/mods/ && herdr-app do mod.open '{"name":"wtm"}'
```

Needs the Herdr app and wtm 0.29 or later. Updating, removing, and what the mod runs: [Installation](docs/guide/installation.md). Herdr TUI user? Use [herdr-wtm](https://github.com/LucasPcq/herdr-wtm).

## Learn more

[How it works](docs/guide/how-it-works.md) · [Customizing](docs/guide/customizing.md) · [Troubleshooting](docs/guide/troubleshooting.md) · [Changelog](CHANGELOG.md) · [Contributing](CLAUDE.md)

MIT licensed.
