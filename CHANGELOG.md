# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- **Sync what is already there**: double-click the button (or run `herdr-app do wtm.sync`) to open a space for every worktree that has none and close the spaces whose folder is gone. → [How it works](docs/guide/how-it-works.md#syncing-what-is-already-there)

## [0.1.0] - 2026-11-09

The first release: Herdr app spaces follow wtm's worktrees.

### Highlights

- **A space opens for every worktree `wtm create` makes**, whoever ran it, without moving your focus. → [How it works](docs/guide/how-it-works.md)
- **`wtm clean` and `wtm prune` close the worktree's space** once its folder is gone; the main checkout's space never closes.

### Added

- **A `wtm` button in the top bar**, drawn like Files and Changes: its dot says whether sync runs. → [How it works](docs/guide/how-it-works.md#the-button)
- **A notification** when sync stops, naming the cause and the fix; clicking the button retries. → [Troubleshooting](docs/guide/troubleshooting.md)
- **`style.js`** sets the button's look and where it opens. → [Customizing](docs/guide/customizing.md)
- **`herdr-app do wtm.stop`** stops the sync and removes the button. → [Installation](docs/guide/installation.md#remove)

[Unreleased]: https://github.com/LucasPcq/herdr-app-wtm/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/LucasPcq/herdr-app-wtm/releases/tag/v0.1.0
