# Changelog

All notable changes to this project are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

Your worktrees, their stacks and their jobs, one click away.

### Highlights

- **A click on the `wtm` button opens the worktrees pane** beside your terminals: the current worktree, its jobs and problems, your stacks, what runs elsewhere. → [The pane](docs/guide/how-it-works.md#the-pane)
- **Start and stop a worktree's stack** with Up and Down, on the profile you pick.

### Added

- **Prune, New, Exec, Env, Clean and Reparent** open the matching wtm command in a tab; Prune shows how many worktrees are finished.
- **Each problem `wtm status` finds**, with a Fix button that runs its fix.
- **Needs sync** on a worktree whose parent moved, with a Sync button.
- **The address of every app a profile runs**, a click away in the browser.
- **A notification when Up, Down or Sync starts and when it ends**, with wtm's error when it fails.

### Changed

- **The button** shows a branch icon like Files and Changes, and is highlighted while the pane is open.
- **Resync spaces and Retry** are in the pane.

### Removed

- **The double-click on the button**: use Resync spaces in the pane, or `herdr-app do wtm.sync`.

## [0.2.0] - 2026-11-09

Catch up with worktrees made or removed while the sync was not running.

### Highlights

- **Double-click the button to sync what is already there**: a space opens for every worktree that has none, and the spaces whose folder is gone close. `herdr-app do wtm.sync` does the same. → [How it works](docs/guide/how-it-works.md#syncing-what-is-already-there)

### Added

- **A tooltip on the button** says what its dot means and what a click or a double-click does.

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

[Unreleased]: https://github.com/LucasPcq/herdr-app-wtm/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/LucasPcq/herdr-app-wtm/releases/tag/v0.2.0
[0.1.0]: https://github.com/LucasPcq/herdr-app-wtm/releases/tag/v0.1.0
