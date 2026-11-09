# Writing the changelog

`CHANGELOG.md` is written in **English**, in the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) shape, and follows [semver](https://semver.org). Each release section is published verbatim as the GitHub release notes (`make release-notes`, run by the release workflow): write it for someone deciding whether to update the mod, not for the reviewer of the PR.

## Template

Copy this under `## [Unreleased]` and keep only the sections that have entries, in this order.

```markdown
## [0.2.0] - 2026-12-01

One sentence on what this release is about.

### Highlights

- **A worktree menu** under the `wtm` button: create, open, clean. → [How it works](docs/guide/how-it-works.md)

### Breaking

- **wtm 0.31 or later** is required: run `wtm upgrade`.

### Added

- **A notification** when a new worktree's `on_create` hooks fail.

### Changed

- **The button** opens left of `+` on Linux too.

### Fixed

- **Removing a worktree** closes its space even when its folder is reached through a symlink.

### Removed

- **The `wtm · stopped` label**: the dot's colour says it.
```

## Rules

- **Curate, don't inventory.** List what a user would notice: a new behaviour, a setting, a behaviour that changed under them, a bug they may have hit. A release with more than ~10 bullets is an inventory: cut.
- **Short.** About 20 words a bullet; the guide link carries the rest.
- **One bullet, one line, one change.** Bold the action, setting or behaviour, then say what the user gets, in the present tense. No "now", no "we", no internal names (modules, tickets, PR numbers).
- **Effect, not mechanism.** "A space closes when its worktree is removed", not how the event file is claimed.
- **Breaking is its own section**, and every entry says what to do instead.
- **Highlights** is optional: one to three bullets. A bullet there is not repeated under Added.
- **Internal-only changes are left out** (refactors, tests) unless a user can see them.
- **Section titles are fixed**: `Highlights`, `Breaking`, `Added`, `Changed`, `Fixed`, `Removed`. The heading is `## [x.y.z] - YYYY-MM-DD`; the summary sentence carries the theme.
- Links into the docs are relative (`docs/guide/…`): `make release-notes` pins them to the release tag.
- Add a link reference per release at the bottom of the file (`[0.1.0]: https://github.com/LucasPcq/herdr-app-wtm/releases/tag/v0.1.0`).
